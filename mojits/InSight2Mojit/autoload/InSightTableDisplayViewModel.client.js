/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'InSightTableDisplayViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        api = Y.doccirrus.jsonrpc.api,
        // i18n = Y.doccirrus.i18n,
        // unwrap = ko.unwrap,

        inCaseSchemaFull = Y.dcforms.reducedschema.loadSync( 'InCase_T' ),
        inCaseSchema = prepareInCaseSchema( inCaseSchemaFull ),
        currentLang = Y.doccirrus.comctl.getUserLang(),

        namedRenderers = Y.doccirrus.KoUI.namedRenderers;

    // switchableModes = [
    //     'week',
    //     'month',
    //     'quarter',
    //     'year'
    // ],
    //
    // dateFormat = 'DD.MM.YYYY HH:mm';

    // hack for valid date display
    moment.relativeTimeThreshold( 'M', 9999 );

    /**
     * @constructor
     * @class InSightTableDisplayViewModel
     */
    function InSightTableDisplayViewModel() {
        InSightTableDisplayViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSightTableDisplayViewModel, KoViewModel.getDisposable(), {
        /**
         * Defines template name to look up
         * @property templateName
         * @type {String}
         */
        templateName: 'InSightTableDisplayViewModel',
        /** @protected */
        initializer: function( config ) {
            var self = this;

            self.initInSightTableDisplayViewModel( config );
            self.currentLang = currentLang;
        },
        /** @protected */
        destructor: function() {
        },
        /** @protected */
        initInSightTableDisplayViewModel: function( config ) {
            var self = this;
            self.config = config;

            self.availableCols = [];
            self.requestDates = {};
            self.displayFields = ko.observableArray( config.displayFields );
            self.filterElements = ko.observableArray();
            self.tableData = ko.observableArray();
            self.tableName = ko.observable( config.csvFilename );
            self.tableNameDisplay = ko.observable( config.csvFilename );
            self.groupBy = {
                enabled: ko.observable( !!(config.groupBy && config.groupBy.value) ),
                selector: null
            };

            //console.log(this.config);

            // date range config/settings
            // self.dateRangeConfig = self.initDateRangeConfig();
            // self.dateSettings = self.initDateSettings();
            // self.switchModeSubscribe();
            //
            // self.disableRelWithMode = ko.computed( function() {
            //     var hideTimeline = self.dateSettings.hideTimeline(),
            //         relAvailable = self.dateRangeConfig.relativeModeAvailable(),
            //         result = !hideTimeline || !relAvailable;
            //
            //     return result;
            // } );

            // widget data
            // self.subViewManager = self.initSubViewManager();

            this.getTableData();

            // observe to cols change
            this.setColsObserver();

            // init views
            // self.initConfigView();
            self.initTableView();

            self.initTemplate();
        },

        initTableView: function() {
            var self = this,
                colsForKo = self.prepareColsForKo(),
                csvExportConf = self.prepareCsvExportConf();

            self.createKoTable( {
                columns: colsForKo,
                csvExportConf: csvExportConf
            } );
        },

        createKoTable: function( config ) {
            var self = this,
                dateRange = self.prepareDateRange();

            this.kotable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insight-table',
                    pdfTitle: self.tableName(),
                    csvFilename: ko.computed( function() {
                        var tableName = self.tableName();
                        return tableName;
                    } ),
                    stateId: 'table',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    limit: 10,
                    limitList: [5, 10, 20, 50, 100],
                    remote: true,
                    proxy: api.reporting.getData,
                    columns: config.columns,
                    baseParams: {
                        noTimeout: true,
                        dates: dateRange,
                        insightConfigId: self.config._id
                    },
                    exportCsvConfiguration: {
                        columns: config.csvExportConf
                    }
                }
            } );
        },

        setColsObserver: function() {
            var self = this;
            self.currentColumns = ko.computed( self.colsObserverHandler.bind( this ) );
        },

        colsObserverHandler: function() {
            var self = this;
            var data = self.displayFields(),
                res = [],
                val,
                colDefinition,
                renderLink;

            data.forEach( function( el ) {
                val = el.value;
                renderLink = el.renderLink;
                if( val ) {
                    colDefinition = null;

                    self.availableCols.forEach( function( col ) {
                        if( col.id === val ) {
                            colDefinition = col;
                            return true;
                        }
                    } );

                    res.push( {
                        id: val,
                        renderLink: renderLink,
                        label: colDefinition ? colDefinition.label : {en: val, de: val},
                        rendererName: colDefinition ? colDefinition.rendererName : undefined,
                        model: colDefinition ? colDefinition.model : undefined,
                        type: colDefinition ? colDefinition.type : 'String'
                    } );

                }
            } );

            return res;
        },

        getTableData: function() {
            this.availableCols = prepareColsData( inCaseSchema );
        },

        getColsOptions: function() {
            var groupByObj = this.groupBy,
                selector = groupByObj.selector,
                isGroupBy = !!(groupByObj.enabled() && selector && selector.currentValue());

            return {
                isGroupBy: isGroupBy,
                groupByField: selector && selector.currentValue()
            };
        },

        prepareCsvExportConf: function() {
            var res = [],
                cols = this.currentColumns();

            cols.forEach( function( col ) {
                if( col.rendererName ) {
                    res.push( {
                        forPropertyName: col.id,
                        stripHtml: true
                    } );
                }
            } );

            return res;
        },

        prepareColsForKo: function() {
            var self = this,
                cols = this.currentColumns(),
                res = cols.map( function( col ) {
                    var newObj = {
                        forPropertyName: col.id,
                        label: col.label[currentLang],
                        isSortable: true,
                        isFilterable: true,
                        filterField: {
                            componentType: 'KoSchemaValue',
                            componentConfig: {
                                fieldType: col.type,
                                showLabel: false,
                                isOnForm: false,
                                required: false
                            }
                        }
                    };

                    if( col.type === 'Number' ) {
                        newObj.queryFilterType = 'eqNumber';
                    } else if( col.type === 'Boolean' ) {
                        newObj.queryFilterType = Y.doccirrus.DCQuery.EQ_OPERATOR;
                    } else if( col.type === 'Date' ) {
                        newObj.queryFilterType = Y.doccirrus.DCQuery.EQDATE_OPERATOR;
                    } else {
                        newObj.queryFilterType = Y.doccirrus.DCQuery.IREGEX_OPERATOR;
                    }

                    if( col.rendererName && namedRenderers[col.rendererName] ) {
                        newObj.renderer = namedRenderers[col.rendererName];
                    } else if( col.renderLink && !self.groupBy.enabled() && col.model ) {
                        // closure to pass additional parameter - col definition
                        newObj.renderer = function( meta ) {
                            return namedRenderers.detailsLinkByModel( meta, col );
                        };
                    } else {
                        // closure to pass additional parameter - col definition
                        newObj.renderer = function( meta ) {
                            return namedRenderers.basicRenderer( meta, col );
                        };
                    }

                    return newObj;
                } );

            return res;
        },

        prepareDateRange: function() {
            var res = {};

            var start = moment().startOf( 'month' ).subtract( 1, 'months' ),
                startIso = start.toISOString(),
                end = moment().startOf( 'month' ),
                endIso = end.toISOString();

            res.startDate = startIso;
            res.endDate = endIso;

            return res;
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
        NAME: 'InSightTableDisplayViewModel',
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
        var result = [],
            key,
            text,
            atLabels,
            currentSchema = {};
        for( key in schema ) {
            if( schema.hasOwnProperty( key ) ) {
                currentSchema = JSON.parse( JSON.stringify( schema[key] ) );

                if( currentSchema.label ) {
                    text = currentSchema.label[currentLang];

                    if( currentSchema.modelLabel &&
                        currentSchema.modelLabel.de &&
                        (currentSchema.model === 'patient' ||
                         currentSchema.model === 'location' ||
                         currentSchema.model === 'employee' ||
                         currentSchema.model === 'task' ||
                         currentSchema.model === 'scheduletype' ||
                         currentSchema.model === 'calendar'

                        ) ) {

                        text = currentSchema.modelLabel.de + ', ' + text;
                    }

                    if( currentSchema.model === 'activity' &&
                        currentSchema.actTypesLabel &&
                        currentSchema.actTypesLabel.de &&
                        currentSchema.actTypesLabel.de.length ) {

                        atLabels = currentSchema.actTypesLabel.de.join( ' ' );
                        text = atLabels + ', ' + text;
                    }

                    result.push( {
                        text: text,
                        id: key,
                        model: currentSchema.model,
                        linkType: currentSchema.linkType,
                        label: currentSchema.label,
                        type: currentSchema.type,
                        searchAsArrayOfValues: currentSchema.searchAsArrayOfValues
                    } );

                }
            }
        }

        return result;
    }

    function prepareInCaseSchema( schema ) {
        var res = {},
            key, currentField;

        for( key in schema ) {
            if( schema.hasOwnProperty( key ) ) {
                currentField = schema[key];

                if( currentField.insight2 ) {
                    res[key] = currentField;
                }
            }
        }

        return res;
    }

    KoViewModel.registerConstructor( InSightTableDisplayViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'dcforms-reducedschema',
        'InSightColSelectorViewModel',
        'InSightFilterElementViewModel',
        'dcforms-schema-InCase-T',
        'dcforms-schema-InSuite-T',
        'dc-comctl',
        'KoUI-all',
        'KoTableNamedRenderers'
    ]
} );
