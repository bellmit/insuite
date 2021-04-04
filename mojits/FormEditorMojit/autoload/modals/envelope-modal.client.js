/*global YUI, ko, Promise, $, async */
'use strict';

YUI.add( 'envelope-modal', function( Y , NAME ) {
    var
        i18n = Y.doccirrus.i18n,
        WINDOW_SIZE = 1024, // Y.doccirrus.DCWindow.SIZE_SMALL,

        CANCEL = i18n( 'InCaseMojit.envelope_modalJS.buttons.CANCEL' ),
        PRINT = i18n( 'InCaseMojit.envelope_modalJS.buttons.PRINT' ),
        TITLE = i18n( 'InCaseMojit.envelope_modalJS.title' ),
        MISSING_FORM = i18n( 'InCaseMojit.envelope_modalJS.MISSING_FORM' ),

        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable();

    function EnvelopeModel( config ) {
        EnvelopeModel.superclass.constructor.call( this, config );
    }

    Y.extend( EnvelopeModel, Disposable, {

        jqCache: null,
        template: null,
        loaded: false,

        locationId: '',
        formRole: '',
        formId: '',

        initializer: function( options ) {
            var self = this;

            self.jqCache = {};

            self.locationId = options.locationId || '';
            self.userId = options.userId || '';
            self.formRole = options.formRole || '';
            self.formId = options.formId || '';
            self.formData = options.formData || {};
            self.options = options;

            self._initForm( options );
            self._initPrinters( options );
        },

        destructor: function() {
            var self = this;
            self.caption.destroy();
            self.caption = null;

            self.printerButtons.destroy();
            self.pritnerButtons = null;

            self.options = null;
        },

        templateReady: function() {
            var self = this;
            Y.log( 'jade template loaded and bound', 'debug', NAME );
            self.jqCache.divEnvelopeFormContainer = $('#divEnvelopeFormContainer');
            self.loadFormByRoleAndMap();
        },

        loadFormByRoleAndMap: function( callback ) {
            var
                self = this,
                FORM_DIV_ID = 'divEnvelopeFormContainer';

            callback = callback || Y.dcforms.nullCallback;

            async.series( [ lookupFormRole, createFormTemplate, mapEnvelopeFields ], onAllDone );

            function lookupFormRole( itcb ) {
                Y.dcforms.getConfigVar( '', self.formRole, false, onLookupCanonical );
                function onLookupCanonical( err, configVal ) {
                    if ( err ) { return itcb( err ); }
                    self.formId = configVal;
                    itcb( null );
                }
            }

            function createFormTemplate( itcb ) {
                //  fail if no form configured
                if ( !self.formId || '' === self.formId ) {
                    return itcb( 'No form found for this envelope size' );
                }

                self.template = Y.dcforms.createTemplate({
                    'canonicalId': self.formId,
                    'divId': FORM_DIV_ID,
                    'il8nDict': {},                                         //  legacy
                    'doRender': true,
                    'width': 1024,
                    'callback': onTemplateCreated
                });

                function onTemplateCreated( err, template ) {
                    if ( err ) { return itcb( err ); }
                    self.template = template;
                    self.template.px.width = 1024;
                    itcb( null );
                }
            }

            function mapEnvelopeFields( itcb ) {
                self.template.map( self.formData, true, itcb );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not embed form template: ' + JSON.stringify( err ), 'warn', NAME );
                    $( '#' + FORM_DIV_ID ).html( MISSING_FORM );
                    return callback( err );
                }

                self.loaded = true;
                if ( self.options.onFormLoaded ) { self.options.onFormLoaded(); }
                callback( null );
            }
        },

        print: function( callback ) {
            var
                self = this,
                formForPdf,
                pdfFile;

            async.series( [ serializeForm, makePdf, printPdf ], onAllDone );

            function serializeForm( itcb ) {
                self.template.renderPdfServer( 'temp', '', '', onSerializedForm );
                function onSerializedForm( err, serializedForm ) {
                    if ( err ) {
                        Y.log( 'Could not serialize form: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( null );
                    }

                    formForPdf = serializedForm;
                    itcb( null );
                }
            }

            function makePdf( itcb ) {
                formForPdf.save = 'cache';
                Y.doccirrus.comctl.privatePost( '1/media/:makepdf', { 'document': formForPdf, 'saveTo': 'cache' }, onPdfComplete );
                function onPdfComplete( err, data ) {
                    if ( err ) {
                        Y.log( 'Could not make PDF: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    data = data.data ? data.data : data;
                    pdfFile = data.tempId;
                    itcb( null );
                }
            }

            function printPdf( itcb ) {
                //  TODO: MOJ-6877, MOJ-6974

                /*
                var
                    printArgs = {
                        'printerName': 'PDF',
                        'tempFile': pdfFile,
                        'deleteOnPrint': false
                    };

                Y.doccirrus.comctl.privatePost('1/media/:printCache', printArgs, onPrintComplete );

                function onPrintComplete( err /--* , data *--/ ) {
                    if ( err ) { return itcb( err ); }

                    //data = data.data ? data.data : data;
                    //console.log( '(****) print operation completed, data: ', data );
                    itcb( null );
                }
                */

                Y.doccirrus.modals.printPdfModal.show( {
                    'canonicalId': self.formId,
                    'cacheFile': pdfFile,
                    'documentUrl': '/pdf/' + pdfFile
                } );

                itcb( null );

            }


            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not print envelope: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                Y.log( 'Envelope print complete.', 'debug', NAME );
                callback( null );
            }




        },

        /**
         *  Request full dataset from server is not available
         */

        _initForm: function( /* options */ ) {
            //console.log( 'init form here' );
        },

        _initPrinters: function( /* options */ ) {
            //console.log( 'init printers here' );
        }

    } );

    /**
     *  Dialog to show progress of loading and printing a KOTable to PDF
     *
     *
     *  @method show
     *  @param  options                         {Object}
     *  @param  options.formRole                {String}    used to look up correct form for this envelope size
     *  @param  options.sizeLabel               {String}    shown in modal title
     *  @param  options.formData                {Object}    mapped into form
     *  @param  options.formData.patientName    {String}    (or name o contact)
     *  @param  options.formData.patientAddress {String}    Prefer BILLING, then OFFICIAL address for patients
     */

    function showEnvelope( options ) {

        if ( !options.formRole || !options.formData ) {
            Y.log( 'Missing required option, please pass formRole and patient.', 'warn', NAME );
            return;
        }

        //  prevent the modal from being taller than the screen - a little hacky but functional (MOJ-7089)
        var useMinHeight = 500;
        if ( $( window).height() < 900 ) {
            useMinHeight = ( $( window ).height() - 50 );       //  50 for a little padding
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
                    .renderFile( { path: 'FormEditorMojit/views/envelope_modal' } )
                    .then( function( response ) {
                        return response.data;
                    } )
            } )
            .then( function( props ) {
                var
                    template = props.template,
                    bindings = new EnvelopeModel( options ),
                    bodyContent = Y.Node.create( template ),

                    btnCancel = Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                        label: CANCEL
                    } ),

                    btnPrint = Y.doccirrus.DCWindow.getButton( 'OK', {
                        isDefault: true,
                        label: PRINT,
                        action: onPrintBtnClick
                    } ),

                    dialog = new Y.doccirrus.DCWindow( {
                        id: 'DCWindow-EnvelopeDialog',
                        className: 'DCWindow-EnvelopeDialog',
                        bodyContent: bodyContent,
                        title: TITLE + ( options.sizeLabel || 'XX' ),
                        icon: Y.doccirrus.DCWindow.ICON_INFO,

                        //MinHeight: 500,
                        MinHeight: useMinHeight,
                        height: useMinHeight,

                        width: WINDOW_SIZE,
                        maximizable: false,
                        resizeable: false,
                        centered: true,
                        modal: true,

                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [ btnCancel, btnPrint ]
                        },
                        after: {
                            render: function() { onModalRendered( this); },
                            destroy: onModalDestroy
                        }
                    } );

                options.onFormLoaded = onFormLoaded;

                function onModalRendered( /* modalBody */ ) {
                    Y.log( 'Envelope modal rendered.', 'debug', NAME );
                }

                function onFormLoaded() {
                    dialog.centered();
                }

                function onModalDestroy() {
                    //if( aDCWindowResizeEvent ) {
                    //    aDCWindowResizeEvent.detach();
                    //}
                    if( bindings && bindings._dispose ) {
                        bindings._dispose();
                    }
                }

                function onPrintBtnClick() {
                    //  TODO: set printer here
                    bindings.print( onPrintComplete );
                    function onPrintComplete( err ) {
                        if ( err ) {
                            Y.log( 'Envelope printing failed: ' + JSON.stringify( err ), 'warn', NAME );
                        }
                        dialog.close();
                    }
                }

                bindings.onComplete = function( /* serverResponse */ ) {
                    //console.log( '(****) serverResponse: ', serverResponse );
                    dialog.close();
                };

                //  necessary to re-center after table node is added (similar to processNextTick)
                window.setTimeout( function() { dialog.centered(); }, 1 );

                ko.applyBindings( bindings, bodyContent.getDOMNode() );

            } );
    }

    Y.namespace( 'doccirrus.modals' ).envelope = {
        show: showEnvelope
    };

}, '0.0.1', {
    requires: [
        'oop',
        'dc-comctl',
        'event-custom',
        'doccirrus',
        'dcutils',
        'KoViewModel',
        'dccommunication-client'
    ]
} );