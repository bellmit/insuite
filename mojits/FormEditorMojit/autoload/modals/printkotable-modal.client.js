/*global YUI, ko, Promise, moment */
/*eslint prefer-template:0, strict:0 */
'use strict';

YUI.add( 'printkotable-modal', function( Y, NAME ) {
    var
        i18n = Y.doccirrus.i18n,
        WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_LARGE,

        ROW_LIMIT = 5000,

        REMOTE_PARAM = {
            QUERY: 'query',
            SORT: 'sort',
            PAGE: 'page',
            LIMIT: 'itemsPerPage'
        },

        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable(),
        KoUI = Y.doccirrus.KoUI,
        utilsArray = KoUI.utils.Array,

        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable;

    function PrintKoTableModel( config ) {
        PrintKoTableModel.superclass.constructor.call( this, config );
    }

    Y.extend( PrintKoTableModel, Disposable, {

        caption: null,
        kotable: null,
        data: null,             //  plain, large
        pdfData: null,          //  rendered, smaller
        pdfProgress: null,      //  progress bar
        savePDFtoCaseFile: false,
        options: null,

        isComplete: false,

        pollFileName: '',
        pollAfter: -1,

        POLL_INCREMENT: 3000,   //  check server after 5 seconds of WS inactivity

        initializer: function( options ) {
            var self = this;
            self.kotable = options.kotable;
            self.data = options.kotable.data();
            self.pdfData = [];
            self.pdfProgress = ko.observable( 0 );
            self.savePDFtoCaseFile = options.savePDFtoCaseFile;
            self.options = options;

            self._initData();
            self._listenForPdf();
        },

        destructor: function() {
            var self = this;
            self.caption.destroy();
            self.caption = null;

            self.pdfProgress.destroy();
            self.pdfprogress = null;

            self.kotable = null;        //  unlink, don't destroy
            self.data = null;
            self.pdfData = null;
        },

        /**
         *  Request full dataset from server is not available
         */

        _initData: function( ) {
            var self = this;

            self.caption = ko.observable ('Tabelle laden...' );       //TODO: translateme

            var
                autoLoad = unwrap( self.kotable.autoLoad ),
                limit = unwrap( ROW_LIMIT ),
                filterParams = unwrap( self.kotable.filterParams ),
                filters = peek( self.kotable.filters ),
                sorters = unwrap( self.kotable.sorters ),
                params = ko.toJS( self.kotable.baseParams ) || {},
                query = params[REMOTE_PARAM.QUERY] || {},
                sort = unwrap( params[REMOTE_PARAM.SORT] ) || {};

            //  static / manually added data
            if ( !autoLoad ) { return; }

            // make up sorting:
            // clean the property names from sort, because no own property for sorters
            sorters.forEach( function( column ) {
                delete sort[column.forPropertyName];
            } );

            params[REMOTE_PARAM.SORT] = sort;

            sorters.forEach( function( column ) {
                params[REMOTE_PARAM.SORT][column.forPropertyName] = utilsArray.getDirection( unwrap( column.direction ) );
            } );

            // make up filtering:
            // clean the property names from query, because no own property for filters
            filters.forEach( function( column ) {
                delete query[column.filterPropertyName];
            } );
            // merge with query
            query = Y.merge( query, filterParams );

            // attach default params:

            params[REMOTE_PARAM.QUERY] = query;
            params[REMOTE_PARAM.LIMIT] = limit;
            params[REMOTE_PARAM.PAGE] = 1;          //  we only want the first page

            params.asPromise = true;

            // make options
            //options = { params: params };

            if ( !self.kotable.proxy ) {
                self._renderData();
                self._requestPdf();
                return;
            }

            self.kotable.proxy( params )
                .done( function __dataLoadSuccess( response ) {

                    if ( !response || !response.data ) {
                        //  Edge case: should not usually happen because PDF menu entry is be greyed out when no data
                        Y.log( 'No data returned from server - table will be empty.', 'warn', NAME );
                        return;
                    }

                    self.data = response.data;

                    self._renderData();
                    self._requestPdf();

                } );
                /*
                .fail( function __dataLoadFail( err ) {
                    Y.log( 'Could not get table data: ' + JSON.stringify( err ), 'warn', NAME );
                    self.caption( JSON.stringify( err ));
                } );
                */

        },

        /**
         *  Show PDF render progress
         *  @private
         */

        _listenForPdf: function() {
            var self = this;

            //  Updates on progress during report generation
            Y.log( 'Subscribing to PDF generation events', 'debug', NAME );

            Y.doccirrus.communication.on( {
                socket: Y.doccirrus.communication.getSocket( '/' ),
                event: 'pdfRenderProgress',
                done: onPdfRenderProgress,
                handlerId: 'printkotable_modal'
            } );

            function onPdfRenderProgress( message ) {
                var
                    evt = message.data && message.data[0],
                    dateNow = new Date(),
                    timeNow = dateNow.getTime();

                //  ws event received, delay any upcoming poll by AJAX
                self.pollAfter = timeNow + self.POLL_INCREMENT;

                Y.log( 'PDF render progress caught: ' + JSON.stringify( evt ), 'debug', NAME );

                if ( evt.error ) {
                    Y.doccirrus.DCWindow.notice( {
                        'title': 'Fehler',
                        'message': i18n( 'KoUI.KoTable.noForm' )
                    } );
                    self.onComplete( evt );
                    return;
                }

                self.pdfProgress( evt.percent + '%' );
                self.caption( 'Erzeugung pdf... ' + self.pdfProgress() );

                if ( evt.label && 'complete' === evt.label ) {
                    self.onPdfComplete( evt );
                }

            }

        },

        /**
         *  Apply column renderers to data rows
         */

        _renderData: function() {
            var
                self = this,
                cols = self.kotable.columns(),
                hasRenderer,
                renderFn,
                row,
                pdfRow,
                forProp,
                colDefaultVal,
                i, j;

            if( !!self.options.printOnlySelectedActivities ) {
                self.data = self.kotable.getComponentColumnCheckbox().checked();
            }

            for ( j = 0; j < self.data.length; j++ ) {

                row = self.data[j];
                pdfRow = {};

                for ( i = 0; i < cols.length; i++ ) {
                    hasRenderer = false;
                    renderFn = null;
                    forProp = cols[i].forPropertyName;

                    if ( cols[i].initialConfig.renderer ) {
                        renderFn = cols[i].initialConfig.renderer;
                        hasRenderer = true;
                    }

                    //  pdfRenderer function has precedence if it exists
                    if ( cols[i].initialConfig.pdfRenderer ) {
                        renderFn = cols[i].initialConfig.pdfRenderer;
                        hasRenderer = true;
                    }

                    //  resolve dotted keys like 'data.patient.firstname' MOJ-9228
                    if ( -1 === forProp.indexOf( '.' ) ) {
                        colDefaultVal = row[ forProp ];
                    } else {
                        colDefaultVal = Y.doccirrus.commonutils.getObject( forProp, false, row );
                    }

                    if ( hasRenderer ) {
                        //  pass raw data through column renderer
                        pdfRow[ forProp ] = renderFn( {
                            'row': row,
                            'value': colDefaultVal || '',
                            'col': cols[i]
                        } ) + '';

                    } else {
                        //  pass plain value
                        pdfRow[ forProp ] = colDefaultVal;
                    }

                    //  MOJ-7023
                    if ( 'undefined' === typeof pdfRow[ forProp ] || null === pdfRow[ forProp ] ) {
                        pdfRow[ forProp ] = '';
                    } else {
                        pdfRow[ forProp ] = pdfRow[ forProp ] + '';
                    }

                    //  strip HTML
                    pdfRow[ forProp ] = Y.doccirrus.utils.stripHTML.regExp( pdfRow[ forProp ] );
                    pdfRow[ forProp ] = pdfRow[ forProp ].replace( new RegExp( '&nbsp;', 'g' ), ' ' );

                    //  if we need to change column name to match reduced schema
                    if ( cols[i].initialConfig.pdfColumnName ) {
                        pdfRow[ cols[i].initialConfig.pdfColumnName ] = pdfRow[ forProp ];
                    }
                }

                self.pdfData.push( pdfRow );
            }
        },

        /**
         *  Convert KoTable column set to inForm table definition
         *  @return {string}
         */

        _getPdfTableDefinition: function() {
            var
                self = this,
                cols = self.kotable.columns(),
                txt = '**Activity_T\n',
                totalPercent = 0,
                colScale,
                showCol,
                isVisible = [],
                widths = [],
                width,
                title,
                i;

            //  adjust total computed column widths to 100%
            for (i = 0; i < cols.length; i++) {

                //  only consider column width if column is visible
                showCol = cols[i].visible();
                if ( 'KoTableColumnLinked' === cols[i].componentType ) { showCol = false; }
                if ( 'KoTableColumnCheckbox' === cols[i].componentType ) { showCol = false; }
                if ( 'KoTableColumnDrag' === cols[i].componentType ) { showCol = false; }
                isVisible[i] = showCol;

                if (showCol ) {
                    width = cols[i].widthComputed();
                    width = ( 'auto' === width ? '10%' : width );

                    if ( -1 !== width.indexOf( 'px' ) ) {
                        width = width.replace( 'px', '' );
                        width = ( parseFloat( width ) / 10 ) + '';
                    }

                    widths[i] = parseFloat( width.replace( '%', '' ) );
                    totalPercent = totalPercent + widths[i];
                }

            }

            if ( 0 === totalPercent ) { totalPercent = 100; }

            colScale = ( 100 / totalPercent );

            for (i = 0; i < cols.length; i++) {
                widths[i] = ( widths[i] * colScale ) + '%';

                //  let dynamic columns find their own width in PDF
                if ( -1 !== cols[i].forPropertyName.indexOf( '_dynamic_' ) ) {
                    widths[i] = '-1';
                }
            }

            //  convert to inForm table format
            for (i = 0; i < cols.length; i++) {
                if ( isVisible[i] ) {

                    title = self.kotable.i18n( cols[i].label() || '[x]' );
                    if ( cols[i].initialConfig.pdfTitle ) {
                        title = cols[i].initialConfig.pdfTitle;
                    }

                    cols[i].pdfColumnName = cols[i].pdfColumnName || cols[i].forPropertyName;

                    txt = txt + '*|' +
                        cols[i].pdfColumnName + '|' +
                        'String|' +
                        title + '|' +
                        'left|' +
                        widths[i] + '\n';
                }
            }

            return txt;
        },

        _requestPdf: function() {
            var
                self = this,
                initialConfig = self.kotable.initialConfig,
                postUrl = '/1/formtemplate/:makekotablepdf',
                pdfTitle = '',
                formRole = 'casefile-ko-generic-table',
                filePrefix = 'Tabelle',
                postData,
                k;

            if ( initialConfig.pdfTitle ) {
                pdfTitle = initialConfig.pdfTitle;
                filePrefix = pdfTitle;
            }

            if ( initialConfig.pdfFile ) {
                filePrefix = initialConfig.pdfFile;
            }

            if ( initialConfig.formRole ) {
                formRole = initialConfig.formRole;
            }

            //  form role may have been overridden since initial config
            if ( self.kotable.formRole ) {
                formRole = self.kotable.formRole;
            }

            postData = {
                'noWait': true,
                'tableDataSource': 'client',
                'role': formRole,
                'preferName': filePrefix + '_' + moment().format( 'YYYY.MM.DD HH.mm.ss' ) + '.pdf',
                'listenId': 'generic-table',
                'formData': {
                    'pdfTitle': pdfTitle,
                    'dataTable': self.pdfData,
                    'dataTableCols': self._getPdfTableDefinition()
                }
            };

            //  option to use report columns from the form, not replace them with columsn from the KO table
            if ( initialConfig.keepReportColumns ) {
                delete postData.formData.dataTableCols;
            }

            //  add optional fields specified by table definition
            if ( initialConfig.pdfFields ) {
                for ( k in initialConfig.pdfFields ) {
                    if ( initialConfig.pdfFields.hasOwnProperty( k ) ) {
                        postData.formData[k] = initialConfig.pdfFields[k];
                    }
                }
            }

            self.caption( 'Erzeugung pdf... '  );       //TODO: translateme

            self.requestParams = postData;

            Y.doccirrus.comctl.privatePost( postUrl, postData, onPdfRequested );

            function onPdfRequested( err, result ) {

                if ( err ) {

                    if ( !err.statusText ) {
                        err.statusText = i18n( 'KoUI.KoTable.noForm' );
                        err.reponseText = '';
                    }

                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        //TODO: translateme
                        message: 'PDF konnte nicht erstellt werden: ' + err.statusText + ' ' + err.responseText
                    } );
                }

                var data = result.data || {};

                Y.log( 'Requested PDF: ' + JSON.stringify( data ), 'debug', NAME );

                self.pollFileName = data.fileName;
                self._doBackupPoll();
            }
        },

        _doBackupPoll: function() {
            var
                self = this,
                dateNow = new Date(),
                timeNow = dateNow.getTime(),
                postArgs = { 'cacheFileName': self.pollFileName };

            //  PDF completion was reported by websocket, we can stop checking
            if ( self.isComplete ) {
                return;
            }

            //  if backup poll is not initialized, set it going
            if ( -1 === self.pollAfter ) {
                self.pollAfter = timeNow + self.POLL_INCREMENT;
                window.setTimeout( function() { self._doBackupPoll(); }, self.POLL_INCREMENT );
                return;
            }

            //  if websocket events have been received then keep waiting for another cycle
            if ( timeNow <= self.pollAfter ) {
                window.setTimeout( function() { self._doBackupPoll(); }, self.POLL_INCREMENT );
                return;
            }

            //  No websocket events have been received in awhile, websocket may have stalled, poll the server about
            //  whether our PDF os ready yet.  Use AJAX instead of RPC

            Y.doccirrus.comctl.privatePost( '/1/media/:checkCache', postArgs, onCacheCheck );

            function onCacheCheck( err, result ) {
                var
                    data = ( result && result.data ) ? result.data : {};

                //  not found, wait another increment and try again
                if ( err || !data.found ) {
                    self.pollAfter = timeNow + self.POLL_INCREMENT;
                    window.setTimeout( function() { self._doBackupPoll(); }, self.POLL_INCREMENT );
                    return;
                }

                //  PDF generation complete
                //  raise this as though it were a websocket event
                self._passPollAsEvent( data );

            }

        },

        //  If websocket has stalled and PDF discovered by backup poll, look up canonical _id for printing and raise
        //  event as if it came from websocket.  This assumes we have a form role to look up.

        _passPollAsEvent: function( data ) {
            var
                self = this,
                asEvt = {
                    label: 'complete',
                    progress: 100,
                    mapId: 'generic-table',
                    url: data.url,
                    fileName: data.fileName,
                    percent: 100,
                    targetId: '587c93c71fb71ccf2dda8a00'
                };

            self.pdfProgress( '100%' );
            self.caption( 'Erzeugung pdf... ' + self.pdfProgress() );

            Y.dcforms.getConfigVar( '', self.requestParams.role, false, onFormLookup );

            function onFormLookup( err, canonicalId ) {
                if ( err ) {
                    Y.log( 'Could not look up form role: ' + self.requestParams.role, 'warn', NAME );
                    return;
                }
                asEvt.canonicalId = canonicalId;
                self.onPdfComplete( asEvt );
                self.isComplete = true;
            }
        },

        onPdfComplete: function( evt ) {
            var
                self = this,
                pdfUrl = evt.url;

            //  ignore any duplicate events
            if ( self.isComplete ) { return; }

            self.isComplete = true;

            Y.doccirrus.modals.printPdfModal.show( {
                documentUrl: pdfUrl,
                documentFileName: pdfUrl.replace( '/pdf/', '' ),
                cacheFile: pdfUrl,
                canonicalId: evt.canonicalId,
                canSavePdf: ( ( 'function' === typeof self.kotable.pdfSaveHook ) ? true : false ),
                onRequestSavePdf: self.kotable.pdfSaveHook,
                savePDFtoCaseFile: self.savePDFtoCaseFile,
                options: self.options
            } );

            //  Turn of updates on progress during pdf render
            Y.log( 'Unsubscribing from PDF generation events', 'debug', NAME );
            Y.doccirrus.communication.off( 'pdfRenderProgress', 'printkotable_modal' );

            //  close the parent modal
            if ( self.onComplete ) { self.onComplete(); }
        }

    } );

    /**
     *  Dialog to show progress of loading and printing a KOTable to PDF
     *
     *
     *  @method show
     *  @param  options             {Object}
     *  @param  options.kotable     {Object}    KOTable object
     *
     *  @for doccirrus.modals.filterInvoiceItems
     */

    function showPrintKoTableModal( options ) {

        if ( !options || !options.kotable ) {
            Y.log( 'Cannot create modal, kotable.', 'warn', NAME );
            return;
        }

        Promise
            .props( {
                modules: Y.doccirrus.utils.requireYuiModule( [
                    'node',
                    'JsonRpcReflection-doccirrus',
                    'JsonRpc',
                    'DCWindow'
                ] ),
                template: Y.doccirrus.jsonrpc.api.jade
                    .renderFile( { path: 'FormEditorMojit/views/printkotable_modal' } )
                    .then( function( response ) {
                        return response.data;
                    } )
            } )
            .then( function( props ) {
                var
                    template = props.template,
                    bindings = new PrintKoTableModel( options ),
                    bodyContent = Y.Node.create( template ),
                    dialog = new Y.doccirrus.DCWindow( {
                        id: 'DCWindow-PrintKOTableDialog',
                        className: 'DCWindow-PrintKOTableDialog',
                        bodyContent: bodyContent,
                        title: 'PDF erstellen',                   //  TRANSLATEME
                        icon: Y.doccirrus.DCWindow.ICON_INFO,

                        width: WINDOW_SIZE,
                        //minHeight: WINDOW_HEIGHT,
                        //minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,

                        maximizable: false,
                        centered: true,
                        modal: true,

                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: []
                        }
                    } );

                bindings.onComplete = function() {
                    dialog.close();
                };

                //  necessary to re-center after table node is added (similar to processNextTick)
                window.setTimeout( function() { dialog.centered(); }, 1 );

                ko.applyBindings( bindings, bodyContent.getDOMNode() );

            } );
    }

    Y.namespace( 'doccirrus.modals' ).printKoTable = {
        show: showPrintKoTableModal
    };

}, '0.0.1', {
    requires: [
        'oop',
        'event-custom',
        'doccirrus',
        'dcutils',
        'KoViewModel',
        'dccommunication-client',
        'reportpdf-modal'
    ]
} );