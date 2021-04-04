/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, Promise */
'use strict';

YUI.add( 'PredefinedSideTableViewModel', function( Y, NAME ) {

    var KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        api = Y.doccirrus.jsonrpc.api,
        //i18n = Y.doccirrus.i18n,

        inCaseSchema = Y.dcforms.reducedschema.loadSync( 'InCase_T' ),
        currentLang = Y.doccirrus.comctl.getUserLang(),

        namedRenderers = Y.doccirrus.KoUI.namedRenderers;

    /**
     * @constructor
     * @class PredefinedSideTableViewModel
     */
    function PredefinedSideTableViewModel() {
        PredefinedSideTableViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PredefinedSideTableViewModel, KoViewModel.getDisposable(), {
        /**
         * Defines template name to look up
         * @property templateName
         * @type {String}
         */
        templateName: 'PredefinedSideTableViewModel',
        /** @protected */
        initializer: function( config ) {
            var self = this;

            self.insightConfigId = config._id;
            self.currentLang = currentLang;

            self.initPredefinedSideTableViewModel( config );
            self.initTemplate();
        },
        /** @protected */
        destructor: function() {
        },
        /** @protected */
        initPredefinedSideTableViewModel: function( config ) {
            var self = this;

            self.config = config;

            self.loaded = ko.observable( false );

            self.availableCols = [];
            self.displayFields = ko.observableArray();
            self.tableData = ko.observableArray();
            self.tableName = ko.observable( config.csvFilename );
            self.tableNameDisplay = ko.observable( config.csvFilename );

            self.dateRange = this.prepareDateRange();

            // observe to cols change
            this.setColsObserver();

            // get table data
            self.getTableData();

            self.getTableConfigData( config._id ).then( function( result ) {
                var preTable = result.data;
                self.displayFields( preTable.displayFields );
                self.tableNameDisplay( preTable.csvFilename );

                // init views
                self.initTableView();

                self.loaded( true );
            } );
        },

        prepareDateRange: function() {
            var self = this,
                res = {};

            if( ko.unwrap( self.config.dateRange.startDate ) || ko.unwrap( self.config.dateRange.endDate ) ) {
                res = self.config.dateRange;
            } else {
                var start = moment().startOf( 'month' ).subtract( 1, 'months' ),
                    startIso = start.toISOString(),
                    end = moment().startOf( 'month' ),
                    endIso = end.toISOString();

                res.startDate = ko.observable( startIso );
                res.endDate = ko.observable( endIso );
            }

            return res;
        },

        initTableView: function() {
            var self = this,
                colsForKo = self.prepareColsForKo();

            self.createKoTable( {
                columns: colsForKo
            } );
        },

        createKoTable: function( config ) {
            var self = this;
            self.kotable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    summaryRow: true,
                    hideSummaryRow: true,
                    pdfTitle: self.tableName(),
                    useReportingAPI: true,
                    formRole: 'casefile-ko-insight-table',
                    csvFilename: ko.computed( function() {
                        var tableName = self.tableName();
                        return tableName;
                    } ),
                    stateId: 'table',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    exportPdfVisible: false,
                    limit: 10,
                    limitList: [5, 10, 20, 50, 100],
                    remote: true,
                    proxy: api.reporting.getData,
                    columns: config.columns,
                    baseParams: {
                        dates: self.dateRange,
                        insightConfigId: self.config._id
                    },
                    proxyLoadingFail: function( err ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    }
                }
            } );

            self.kotable.pdfExportHook = self.pdfExportHook;
        },

        pdfExportHook: function() {
            var
                self = this,

                params = {
                    'startDate': self.baseParams.dates.startDate(),
                    'endDate': self.baseParams.dates.endDate(),
                    'presetId': self.baseParams.insightConfigId,
                    'noWait': true
                };

            Y.log( 'Generating a PDF from this report: ' + JSON.stringify( params ), 'debug', NAME );

            Y.doccirrus.comctl.privatePost( '/1/formtemplate/:makereportpdf', params, onPdfReportRequested );

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
            var self = this;
            var data = self.displayFields(),
                res = [],
                val;

            data.forEach( function( el ) {
                val = el.value;
                if( val ) {
                    var colDefinition = {};
                    self.availableCols.forEach( function( col ) {
                        if( col.id === val ) {
                            colDefinition = col;
                            return true;
                        }
                    } );

                    res.push( {
                        id: val,
                        label: el.label || colDefinition.label,
                        rendererName: el.rendererName,
                        type: el.type
                    } );
                }
            } );

            return res;
        },

        getTableData: function() {
            this.availableCols = prepareColsData( inCaseSchema );
        },

        prepareColsForKo: function() {
            var cols = this.currentColumns(),
                res = cols.map( function( col ) {
                    var newObj = {
                        forPropertyName: col.id,
                        label: col.label ? col.label[currentLang] : col.id,
                        isSortable: col.isSortable === undefined ? false : col.isSortable,
                        isFilterable: col.isFilterable === undefined ? false : col.isFilterable
                    };

                    if( col.rendererName && namedRenderers[col.rendererName] ) {
                        newObj.renderer = namedRenderers[col.rendererName];
                    }

                    if( col.type === 'Number' ) {
                        newObj.queryFilterType = 'eqNumber';
                    } else {
                        newObj.queryFilterType = Y.doccirrus.DCQuery.IREGEX_OPERATOR;
                    }

                    return newObj;
                } );

            return res;
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
        NAME: 'PredefinedSideTableViewModel',
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
                    return Y.doccirrus.utils.getMojitBinderByType( 'InSight2Mojit' );
                }
            }
        }
    } );

    function prepareColsData( schema ) {
        var result = [];
        for( var key in schema ) {
            if( schema.hasOwnProperty( key ) ) {
                if( schema[key].label ) {
                    result.push( {
                        text: schema[key].label[currentLang],
                        id: key,
                        label: schema[key].label,
                        type: schema[key].type
                    } );
                }
            }
        }
        return result;
    }

    KoViewModel.registerConstructor( PredefinedSideTableViewModel );

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
        'reportpdf-modal'
    ]
} );
