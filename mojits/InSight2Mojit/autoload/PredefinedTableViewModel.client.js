/*eslint prefer-template:0, strict: 0*/
/*global YUI, ko, moment, Promise */

'use strict';

YUI.add( 'PredefinedTableViewModel', function( Y, NAME ) {

    var KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        api = Y.doccirrus.jsonrpc.api,

        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        utilsArray = KoUI.utils.Array,

        inCaseSchema = Y.dcforms.reducedschema.loadSync( 'InCase_T' ),
        currentLang = Y.doccirrus.comctl.getUserLang(),
        serialLetterAndEmailButtonViewModel = KoViewModel.getConstructor('SerialLetterAndEmailButtonViewModel'),
        PredefinedSideTableViewModel = KoViewModel.getConstructor( 'PredefinedSideTableViewModel' ),
        PDF_DATE_FORMAT = 'DD.MM.YYYY HH:mm';

    /**
     * @constructor
     * @class PredefinedTableViewModel
     */
    function PredefinedTableViewModel() {
        PredefinedTableViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PredefinedTableViewModel, KoViewModel.getDisposable(), {
        /**
         * Defines template name to look up
         * @property templateName
         * @type {String}
         */
        templateName: 'PredefinedTableViewModel',
        /**
         * @protected
         * @param   {Object}    config
         * @param   {String}    config._id      insight2 report _id
         */
        initializer: function( config ) {
            var self = this;

            self.insightConfigId = config._id;
            self.currentLang = currentLang;

            self.initPredefinedTableViewModel( config );
            self.initTemplate();
        },
        /** @protected */
        destructor: function() {
        },
        /**
         * @param   {Object}    config
         * @protected
         */
        initPredefinedTableViewModel: function( config ) {
            var self = this;

            self.config = config;
            self.loaded = ko.observable( false );

            self.availableCols = [];
            self.requestDates = {};
            self.displayFields = ko.observableArray();
            self.filterElements = ko.observableArray();
            self.filterNotElements = ko.observableArray();
            self.sideTables = ko.observableArray();
            self.tableData = ko.observableArray();
            self.hideSummaryRow = ko.observable( false );
            self.tableName = ko.observable( config.csvFilename );
            self.tableNameDisplay = ko.observable( config.csvFilename );
            self.reportConfigSerialEmail = ko.observable( false );
            self.reportConfigSerialLetter = ko.observable( false );
            self.isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
            self.isGermany = Y.doccirrus.commonutils.doesCountryModeIncludeGermany();
            self.serialLetter = ko.observable( self.config.serialLetter || false );
            self.serialEmail = ko.observable( self.config.serialEmail || false );

            // init serial-email button
            self.serialLetterAndEmailButtonViewModel = new serialLetterAndEmailButtonViewModel();

            self.initSerialEmailButton = self.serialLetterAndEmailButtonViewModel.initSerialEmailButton.bind( self );
            self.initSerialEmailButton();

            self.initSerialLetterButton = self.serialLetterAndEmailButtonViewModel.initSerialLetterButton.bind(self);
            self.initSerialLetterButton();

            self.dateRange = this.prepareDateRange();

            // disconnect observables from widget
            self.dateSelectorDataActual = {
                startDate: ko.observable( self.dateRange.startDate() ),
                endDate: ko.observable( self.dateRange.endDate()  )
            };
            self.dateRange.actualData = self.dateSelectorDataActual;

            // observe to cols change
            this.setColsObserver();

            // get table data
            self.getTableData();

            self.getTableConfigData( config._id ).then( function( result ) {
                var preTable = result.data;
                self.displayFields( preTable.displayFields );
                self.tableNameDisplay( preTable.csvFilename );

                self.hideSummaryRow( preTable.hasOwnProperty( 'hideSummaryRow' ) ? preTable.hideSummaryRow : false );

                if( preTable.sideTables && config.displayMode !== 'readOnly' ) {
                    preTable.sideTables.forEach( function( sideTable ) {
                        var st = new PredefinedSideTableViewModel( {
                            _id: sideTable._id,
                            dateRange: self.config.dateRange
                        } );

                        self.sideTables.push( st );
                    } );
                }

                // init views
                self.initTableView( config );

                self.loaded( true );
            } );
        },

        prepareDateRange: function() {
            var self = this,
                res = {},
                start, startIso,
                end, endIso;

            if( self.config.dateRange && (ko.unwrap( self.config.dateRange.startDate ) || ko.unwrap( self.config.dateRange.endDate )) ) {
                res = self.config.dateRange;
            } else {
                start = moment().startOf( 'month' ).subtract( 1, 'months' );
                startIso = start.toISOString();
                end = moment().startOf( 'month' );
                endIso = end.toISOString();

                res.startDate = ko.observable( startIso );
                res.endDate = ko.observable( endIso );
            }

            return res;
        },

        initTableView: function( config ) {
            var
                self = this,
                colsForKo = Y.doccirrus.insight2.tableUtils.prepareColsForKo( self.currentColumns(), currentLang ),
                csvExportConf = Y.doccirrus.insight2.tableUtils.prepareCsvExportConf( self.currentColumns() );

            self.availableCols = Y.doccirrus.insight2.tableUtils.prepareColsData( inCaseSchema, config.customFields, currentLang );

            self.createKoTable( {
                columns: colsForKo,
                csvExportConf: csvExportConf,
                presetId: self.config._id,
                containerName: self.config.containerName
            } );
        },

        createKoTable: function( config ) {
            var
                self = this,
                hasNoNumericColumns = true;

            //  check for any numeric columns (make summary row possible, MOJ-10617)
            config.columns.forEach( function( item ) {
                hasNoNumericColumns = item.isNumeric ? false : hasNoNumericColumns;
            } );

            self.kotable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    useReportingAPI: true,
                    summaryRow: !ko.unwrap( self.hideSummaryRow ),
                    hideSummaryRow: hasNoNumericColumns || ko.unwrap( self.hideSummaryRow ),
                    pdfTitle: self.tableName(),
                    formRole: 'casefile-ko-insight-table',

                    pdfFields: {
                        'startDateTime': moment( this.config.dateRange.startDate() ).format( PDF_DATE_FORMAT ),
                        'endDateTime': moment( this.config.dateRange.endDate() ).format( PDF_DATE_FORMAT )
                    },

                    csvFilename: ko.computed( function() {
                        var tableName = self.tableName();
                        return tableName;
                    } ),
                    stateId: config.containerName + '-' + config.presetId,
                    states: ['limit'],
                    fillRowsToLimit: false,
                    exportPdfVisible: true,
                    limit: 10,
                    limitList: [5, 10, 20, 50, 100],
                    remote: true,
                    proxy: api.reporting.getData,
                    columns: config.columns,
                    baseParams: {
                        noTimeout: true,
                        dates: self.dateSelectorDataActual,
                        insightConfigId: self.config._id
                    },
                    exportCsvConfiguration: {
                        columns: config.csvExportConf
                    },
                    proxyLoadingFail: function( err ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    }
                }
            } );


            self._updateStartDate = self.config.dateRange.startDate.subscribe( function( newVal ) {
                self.kotable.initialConfig.pdfFields.startDateTime = moment( newVal ).format( PDF_DATE_FORMAT );
            } );

            self._updateStartDate = self.config.dateRange.endDate.subscribe( function( newVal ) {
                self.kotable.initialConfig.pdfFields.endDateTime = moment( newVal ).format( PDF_DATE_FORMAT );
            } );

            self.kotable.pdfExportHook = function() {
                self.pdfExportHook();
            };

            self.kotable.data.subscribe(function () {
                self.reportConfigSerialEmail(self.serialEmail());
                self.reportConfigSerialLetter(self.serialLetter());
            });
        },

        pdfExportHook: function() {
            var
                self = this,
                postArgs = {
                    'startDate': self.kotable.baseParams.dates.startDate(),
                    'endDate': self.kotable.baseParams.dates.endDate(),
                    'presetId': self.kotable.baseParams.insightConfigId,
                    'noWait': true
                },

                autoLoad = unwrap( self.kotable.autoLoad ),
                filterParams = unwrap( self.kotable.filterParams ),
                filters = peek( self.kotable.filters ),
                sorters = unwrap( self.kotable.sorters ),
                params = ko.toJS( self.kotable.baseParams ) || {},
                query = params.query || {},
                sort = unwrap( params.sort ) || {};

            //  static / manually added data
            if( !autoLoad ) {
                return;
            }

            // make up sorting:
            // clean the property names from sort, because no own property for sorters
            sorters.forEach( function( column ) {
                delete sort[column.forPropertyName];
            } );

            params.sort = sort;

            sorters.forEach( function( column ) {
                params.sort[column.forPropertyName] = utilsArray.getDirection( unwrap( column.direction ) );
            } );

            // make up filtering:
            // clean the property names from query, because no own property for filters
            filters.forEach( function( column ) {
                delete query[column.filterPropertyName];
            } );

            // merge with query
            query = Y.merge( query, filterParams );

            // attach default params:
            params.query = query;
            params.page = 1;          //  we only want the first page

            postArgs.tableParams = params;

            Y.log( 'Generating a PDF from this report: ' + JSON.stringify( postArgs ), 'debug', NAME );
            Y.doccirrus.comctl.privatePost( '/1/formtemplate/:makereportpdf', postArgs, onPdfReportRequested );

            function onPdfReportRequested( err, response ) {
                if( err ) {
                    Y.log( 'Could not request PDF: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                Y.log( 'Requested report PDF from server, response: ' + JSON.stringify( response ), 'debug', NAME );

                // open modal to show progress and result
                Y.doccirrus.modals.reportPdfModal.show();
            }

        },

        setColsObserver: function() {
            var self = this;
            self.currentColumns = ko.computed( self.colsObserverHandler.bind( this ) );
        },

        colsObserverHandler: function() {

            var self = this,
                data = self.displayFields(),
                res = [],
                val,
                colName,
                addedColds = {},
                colDefinition;

            data.forEach( function( el ) {
                val = el.value;
                if( !el.country || ( el.country && ( ( self.isSwiss && 'CH' === el.country ) || ( self.isGermany && 'D' === el.country ) ) ) ) {
                    colDefinition = {};
                    self.availableCols.forEach( function( col ) {
                        if( col.id === val ) {
                            colDefinition = col;
                            return true;
                        }
                    } );

                    if( !addedColds[val] ){
                        colName = val;
                        addedColds[val] = 1;
                    } else {
                        colName = ''+val+'_'+addedColds[val];
                        addedColds[val] += 1;
                    }

                    el.id = colName;
                    el.label = el.label || colDefinition.label;
                    el.list = colDefinition ? colDefinition.list : null;
                    el.type = el.type || colDefinition.type;
                    el.model = el.model || colDefinition.model;
                    el.rendererName = el.rendererName || colDefinition.rendererName;
                    el.dateFormat = colDefinition && colDefinition.dateFormat || PDF_DATE_FORMAT;
                    el.searchAsArrayOfValues = el.searchAsArrayOfValues || colDefinition.searchAsArrayOfValues;
                    res.push( el );
                }
            } );

            return res;
        },

        getTableData: function() {
            var self = this;
            self.availableCols = Y.doccirrus.insight2.tableUtils.prepareColsData(  inCaseSchema, self.config.customFields, currentLang );
        },

        getTableConfigData: function( id ) {
            return new Promise( function( resolve, reject ) {
                Y.doccirrus.jsonrpc.api.insight2.getOne( {
                    insightConfigId: id
                } ).then( function( res ) {
                    resolve( res );
                }, function( err ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    reject( err );
                } );
            } );
        },

        /**
         * Defines template object
         * @property template
         * @type {Object}
         */
        template: null,
        /** @protected */
        initTemplate: function() {
            var
                self = this;

            self.template = {
                name: self.get( 'templateName' ),
                data: self
            };
        }
    }, {
        NAME: 'PredefinedTableViewModel',
        ATTRS: {
            /**
             * Defines template name to look up
             * @attribute templateName
             * @type {String}
             * @default prototype.templateName
             */
            templateName: {
                valueFn: function() {
                    return this.templateName;
                }
            },
            /**
             * DCBinder
             * @attribute binder
             * @type {doccirrus.DCBinder}
             * @default InCaseMojitBinder
             */
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InSight2MojitBinderInsight2' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( PredefinedTableViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'dc-comctl',
        'KoUI-all',
        'dcforms-schema-InCase-T',
        'dcforms-schema-InSuite-T',
        'KoTableNamedRenderers',
        'dcforms-reducedschema',
        'PredefinedSideTableViewModel',
        'report-table-utils',
        'reportpdf-modal',
        'dccatalogmap',
        'SerialLetterAndEmailButtonViewModel',
        'SerialEMailAssistantModal',
        'SerialLetterAssistantModal'
    ]
} );
