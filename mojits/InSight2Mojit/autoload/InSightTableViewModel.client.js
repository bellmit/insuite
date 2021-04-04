/*eslint prefer-template:0, strict:0 */
/*global YUI, ko, moment, $ */
'use strict';

YUI.add( 'InSightTableViewModel', function( Y, NAME ) {

    var KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        api = Y.doccirrus.jsonrpc.api,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap,

        InSightColSelectorViewModel = KoViewModel.getConstructor( 'InSightColSelectorViewModel' ),
        InSightFilterElementViewModel = KoViewModel.getConstructor( 'InSightFilterElementViewModel' ),
        InSightTableEditModel = KoViewModel.getConstructor( 'InSightTableEditModel' ),
        SerialLetterAndEmailButtonViewModel = KoViewModel.getConstructor( 'SerialLetterAndEmailButtonViewModel' ),

        inCaseSchemaFull = Y.dcforms.reducedschema.loadSync( 'InCase_T' ),
        inCaseSchema = Y.doccirrus.insight2.tableUtils.prepareInCaseSchema( inCaseSchemaFull ),
        currentLang = Y.doccirrus.comctl.getUserLang(),

        PDF_DATE_FORMAT = 'DD.MM.YYYY HH:mm',
        PIPELINE_IS_INVALID = i18n( 'InSight2Mojit.pipeline.ERROR' ),

        switchableModes = [
            'week',
            'month',
            'quarter',
            'year'
        ],
        tableRefreshListener,

        dateFormat = 'DD.MM.YYYY HH:mm';

    // hack for valid date display
    moment.relativeTimeThreshold( 'M', 9999 );

    /**
     * @constructor
     * @class InSightTableViewModel
     */
    function InSightTableViewModel() {
        InSightTableViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSightTableViewModel, KoViewModel.getDisposable(), {
        /**
         * Defines template name to look up
         * @property templateName
         * @type {String}
         */
        templateName: 'InSightTableViewModel',

        /**
         * @param {Object} config configuration object
         * @protected
         **/
        initializer: function( config ) {
            var self = this;
            self.initInSightTableViewModel( config );
            self.currentLang = currentLang;
            self.tableNameTextI18n = i18n( 'InSight2Mojit.table.TABLE_NAME' );
            self.tableFieldsTextI18n = i18n( 'InSight2Mojit.table.FIELDS' );
            self.tableFiltersTextI18n = i18n( 'InSight2Mojit.table.FILTERS' );
            self.tableFiltersNotTextI18n = i18n( 'InSight2Mojit.table.FILTERS_NOT' );
            self.tableGroupByI18n = i18n( 'InSight2Mojit.table.GROUP_BY' );
            self.tableShowTimelineI18n = i18n( 'InSight2Mojit.table.SHOW_TIMELINE' );
            self.tableOptAbsolute1I18n = i18n( 'InSight2Mojit.dateRangeConfig.OPT_ABSOLUTE_1' );
            self.tableOptAbsolute2I18n = i18n( 'InSight2Mojit.dateRangeConfig.OPT_ABSOLUTE_2' );
            self.tableOptAbsolute3I18n = i18n( 'InSight2Mojit.dateRangeConfig.OPT_ABSOLUTE_3' );
            self.tableOptRelative1I18n = i18n( 'InSight2Mojit.dateRangeConfig.OPT_RELATIVE_1' );
            self.tableOptRelative2I18n = i18n( 'InSight2Mojit.dateRangeConfig.OPT_RELATIVE_2' );
            self.tableOptRelative3I18n = i18n( 'InSight2Mojit.dateRangeConfig.OPT_RELATIVE_3' );
            self.forContainerI18n = i18n( 'InSight2Mojit.table.FOR_CONTAINER' );
            self.groupVisibilityI18n = i18n( 'InSight2Mojit.table.GROUP_VISIBILITY' );
            self.serialEmailI18n = i18n( 'InSight2Mojit.table.SERIAL_EMAIL' );
            self.serialLetterI18n = i18n( 'InSight2Mojit.table.SERIAL_LETTER' );
            self.expertModeI18n = i18n( 'InSight2Mojit.pipeline.TITLE' );
        },

        destructor: function() {
            if( tableRefreshListener ) {
                tableRefreshListener.removeEventListener();
                tableRefreshListener = null;
            }
        },

        /**
         * @param {Object} config configuration object
         * @protected
         **/
        initInSightTableViewModel: function( config ) {
            var self = this,
                localCountryMode = [];

            self.config = config;

            // disconnect observables from widget
            self.dateSelectorDataActual = {
                startDate: ko.observable( self.config.dateSelectorData.startDate() ),
                endDate: ko.observable( self.config.dateSelectorData.endDate() )
            };
            self.config.dateSelectorData.actualData = self.dateSelectorDataActual;

            // created viewModel for country mode, because not working with extend
            self.countryMode = new InSightTableEditModel().countryMode;
            // set actual country mode
            if( Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ){
                localCountryMode.push( 'D' );
            }
            if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ){
                localCountryMode.push( 'CH' );
            }
            self.countryMode( localCountryMode );

            self.availableCols = [];
            self.requestDates = {};
            self.expertMode = ko.observable( Y.doccirrus.auth.isAdmin() || Y.doccirrus.auth.memberOf( 'SUPPORT') );
            self.isExpertModeActive = ko.observable( config.isExpertModeActive || false );
            self.aggregatePipeline = ko.observable( config.aggregatePipeline || "" );
            self.displayFields = ko.observableArray();
            self.filterElements = ko.observableArray();
            self.filterNotElements = ko.observableArray();
            self.tableData = ko.observableArray();
            self.tableName = ko.observable( config.csvFilename || "");
            self.container = ko.observableArray( config.container );
            self.visibility = ko.observable( config.visibility );
            self.tableNameDisplay = ko.observable( config.csvFilename );
            self.groupBy = {
                enabled: ko.observable( !!(config.groupBy && config.groupBy.value) ),
                selector: null
            };
            self.forContainer = ko.observable( config.forContainer || false );
            self.groupVisibility = ko.observable( config.groupVisibility || false );
            self.serialLetter = ko.observable( config.serialLetter || false );
            self.serialEmail = ko.observable( config.serialEmail || false );

            self.visibilityTypes = Y.doccirrus.schemas.employee.types.Group_E.list.map( function( visibility ) {
                return {
                    val: visibility.val,
                    i18n: visibility.i18n
                };
            } );
            self.initSelect2Container();
            // date range config/settings
            self.dateRangeConfig = self.initDateRangeConfig();
            self.dateSettings = self.initDateSettings();
            self.switchModeSubscribe();

            self.disableRelWithMode = ko.computed( function() {
                var hideTimeline = self.dateSettings.hideTimeline(),
                    relAvailable = self.dateRangeConfig.relativeModeAvailable();
                return !hideTimeline || !relAvailable;
            } );

            // widget data
            self.subViewManager = self.initSubViewManager();

            // observe to cols change
            self.setColsObserver();

            // init views
            self.initConfigView();
            self.initTableView();

            // init serial-email button
            self.serialLetterAndEmailButtonViewModel = new SerialLetterAndEmailButtonViewModel();
            self.reportConfigSerialEmail = ko.observable(false);
            self.initSerialEmailButton = self.serialLetterAndEmailButtonViewModel.initSerialEmailButton.bind(self);
            self.initSerialEmailButton();
            self.reportConfigSerialLetter = ko.observable(false);
            self.initSerialLetterButton = self.serialLetterAndEmailButtonViewModel.initSerialLetterButton.bind(self);
            self.initSerialLetterButton();
            self.initTemplate();

            if( !tableRefreshListener ) {
                //should save listener into local variable due to the continuous table recreation
                tableRefreshListener = Y.doccirrus.communication.on( {
                    event: 'insight2.refreshTable',
                    done: function handleAction( response ) {
                        self.config.refresh( response && response.data && response.data[0] );
                    }
                } );
            }
        },

        initSelect2Container: function() {

            var self = this,
                results = Y.doccirrus.schemas.insight2.types.Container_E.list.map( function( entry ) {
                    return {
                        id: entry.val,
                        text: Y.doccirrus.schemaloader.translateEnumValue( 'i18n', entry.val,
                            Y.doccirrus.schemas.insight2.types.Container_E.list, entry.val )
                    };
                } );
            results.shift();
            self.select2Container = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return self.container() || '';
                    },
                    write: function( $event ) {
                        self.container( $event.val );
                    }
                }, self ) ),
                select2: {
                    allowClear: true,
                    multiple: true,
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    data: {
                        results: results
                    }
                }
            };
        },

        initTableView: function() {
            var
                self = this,
                colsForKo = Y.doccirrus.insight2.tableUtils.prepareColsForKo( self.currentColumns(), currentLang ),
                csvExportConf = Y.doccirrus.insight2.tableUtils.prepareCsvExportConf( self.currentColumns() ); //;

            //  check for any columns which have a summary
            self.hasSummaryRow = ko.observable( false );
            colsForKo.forEach( function( col ) {
                if ( col.isNumeric && !col.notVisibleAtSummaryRow ) {
                    self.hasSummaryRow( true );
                }
            } );

            self.createKoTable( {
                columns: colsForKo,
                csvExportConf: csvExportConf
            } );
        },

        initConfigView: function() {
            var self = this;

            // get table data
            self.getTableData();

            if( !self.config || !self.config.displayFields || !self.config.filterElements || !self.config.filterNotElements ) {

                self.addColSelector();

                //   add default filter to limit report entry types to activities by default
                if ( self.config.filterElements ) {
                    self.config.filterElements.forEach( function( filter ) {
                        self.addFilterElement( filter );
                    } );
                }

                self.addFilterElement();
                self.addFilterNotElement();
            } else {
                self.config.displayFields.forEach( function( selector ) {
                    self.addColSelector( selector );
                } );

                self.config.filterElements.forEach( function( filter ) {
                    self.addFilterElement( filter );
                } );

                self.config.filterNotElements.forEach( function( filter ) {
                    self.addFilterNotElement( filter );
                } );
            }

            self.initGroupBy();
        },

        initGroupBy: function() {
            var
                self = this,
                data = {
                    cols: self.availableCols
                };
            if( self.config.groupBy && self.config.groupBy.value ) {
                data.value = self.config.groupBy.value;
            }
            self.groupBy.selector = new InSightColSelectorViewModel( data );
        },

        initDateRangeConfig: function() {
            var self = this,
                relativeModeAvailable = self.isSwitchableMode( self.config.dateSelectorData.switchMode() );

            return {
                relativeModeAvailable: ko.observable( relativeModeAvailable ),
                selectorOpts: {
                    format: dateFormat,
                    sideBySide: true,
                    widgetPositioning: {
                        horizontal: 'left',
                        vertical: 'bottom'
                    }
                },
                absoluteParams: {
                    startDate: ko.computed( function() {
                        return moment( self.config.dateSelectorData.startDate() ).format( dateFormat );
                    } ),
                    endDate: ko.computed( function() {
                        return moment( self.config.dateSelectorData.endDate() ).format( dateFormat );
                    } )
                },
                relativeParams: {
                    offsetDisplay: ko.computed( function() {
                        var now = moment(),
                            nowStartOfDay = moment().startOf( 'day' ),
                            startDateISO = self.config.dateSelectorData.startDate(),
                            startDate = moment( startDateISO ),
                            diff = startDate.diff( now ),
                            text = '',
                            dirDisplay;

                        if( 'de' === currentLang ) {
                            text = moment( startDateISO ).from( nowStartOfDay );
                        } else {
                            if( diff >= 0 ) {
                                dirDisplay = i18n( 'InSight2Mojit.dateRangeConfig.AFTER_TODAY' );
                            } else {
                                dirDisplay = i18n( 'InSight2Mojit.dateRangeConfig.BEFORE_TODAY' );
                            }
                            text = moment( startDateISO ).fromNow( true ) + ' ' + dirDisplay;
                        }

                        return text;
                    } ),
                    durationDisplay: ko.computed( function() {
                        var startDateISO = self.config.dateSelectorData.startDate(),
                            startDate = moment( startDateISO ),
                            endDateISO = self.config.dateSelectorData.endDate(),
                            endDate = moment( endDateISO );

                        return startDate.to( endDate, true );
                    } )
                },
                relativeWMParams: {
                    text: ko.computed( function() {
                        var text = '',
                            mode = self.config.dateSelectorData.switchMode(),
                            modeUpper = mode.toUpperCase(),
                            modeTranslated = i18n( 'InSight2Mojit.timeSelector.period.' + modeUpper ),
                            now = moment().startOf( mode ),
                            startDateISO = self.config.dateSelectorData.startDate(),
                            startDate = moment( startDateISO ),
                            diff = startDate.diff( now, mode + 's' ),
                            withoutPrefix = currentLang !== 'de',
                            diffDisplay = now.from( startDate, withoutPrefix ),
                            dateDirDisplay = diff < 0 ? i18n( 'InSight2Mojit.dateRangeConfig.AGO' ) : i18n( 'InSight2Mojit.dateRangeConfig.IN_THE_FUTURE' );

                        if( 'custom' === self.config.dateSelectorData.switchMode() ) {
                            text += '(' + modeTranslated + ')';
                        } else {
                            if( 0 !== diff ) {
                                text += i18n( 'InSight2Mojit.dateRangeConfig.OPT_RELATIVE_WITH_MODE_1' );
                                text += ' ' + modeTranslated;
                                text += i18n( 'InSight2Mojit.dateRangeConfig.OPT_RELATIVE_WITH_MODE_2' );
                                text += ' ' + diffDisplay + ' ' + dateDirDisplay;
                                text += ' ' + i18n( 'InSight2Mojit.dateRangeConfig.OPT_RELATIVE_WITH_MODE_3' );
                            } else {
                                text += i18n( 'InSight2Mojit.dateRangeConfig.OPT_RELATIVE_WITH_MODE_CURRENT' );
                                text += ' ' + modeTranslated;
                            }
                        }

                        return text;
                    } )
                }
            };
        },

        initDateSettings: function() {
            var self = this,
                hideTimeline = self.config.dateSettings && self.config.dateSettings.hideTimeline,
                dateMode = (self.config.dateSettings && self.config.dateSettings.dateMode) || 'absolute';

            return {
                hideTimeline: ko.observable( hideTimeline ),
                dateMode: ko.observable( dateMode ),
                relativeOffset: ko.computed( function() {
                    var now = moment(),
                        startDateISO = self.config.dateSelectorData.startDate(),
                        startDate = moment( startDateISO );

                    return startDate.diff( now );
                } ),
                relativeDuration: ko.computed( function() {
                    var startDateISO = self.config.dateSelectorData.startDate(),
                        startDate = moment( startDateISO ),
                        endDateISO = self.config.dateSelectorData.endDate(),
                        endDate = moment( endDateISO );

                    return endDate.diff( startDate );
                } ),
                relativeModeOffset: ko.computed( function() {
                    var mode = self.config.dateSelectorData.switchMode(),
                        now = moment().startOf( mode ),
                        startDateISO = self.config.dateSelectorData.startDate(),
                        startDate = moment( startDateISO );
                    return startDate.diff( now, mode + 's' );
                } )
            };
        },

        switchModeSubscribe: function() {
            var self = this;

            self.config.dateSelectorData.switchMode.subscribe( function( newVal ) {
                var relativeModeAvailable = self.dateRangeConfig.relativeModeAvailable,
                    dateMode = self.dateSettings.dateMode;

                if( !self.isSwitchableMode( newVal ) ) {
                    if( 'relativeWithMode' === dateMode() ) {
                        dateMode( 'relative' );
                    }
                    relativeModeAvailable( false );
                } else {
                    relativeModeAvailable( true );
                }

            } );
        },

        isSwitchableMode: function( val ) {
            return switchableModes.indexOf( val ) >= 0;
        },

        createKoTable: function( config ) {
            var self = this;

            self.kotable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    pdfTitle: self.tableName(),
                    formRole: 'casefile-ko-insight-table',

                    csvFilename: ko.computed( function() {
                        var tableName = self.tableName();
                        return tableName;
                    } ),

                    pdfFields: {
                        'startDateTime': moment( self.config.dateSelectorData.startDate() ).format( PDF_DATE_FORMAT ),
                        'endDateTime': moment( self.config.dateSelectorData.endDate() ).format( PDF_DATE_FORMAT )
                    },
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
                        dates: self.dateSelectorDataActual,
                        insightConfigId: self.config._id,
                        savePipeline: config.savePipeline
                    },
                    exportCsvConfiguration: {
                        columns: config.csvExportConf
                    },
                    summaryRow: true,
                    hideSummaryRow: !self.hasSummaryRow()
                }
            } );

            self._updateStartDate = self.config.dateSelectorData.startDate.subscribe( function( newVal ) {
                self.kotable.initialConfig.pdfFields.startDateTime = moment( newVal ).format( PDF_DATE_FORMAT );
            } );

            self._updateStartDate = self.config.dateSelectorData.endDate.subscribe( function( newVal ) {
                self.kotable.initialConfig.pdfFields.endDateTime = moment( newVal ).format( PDF_DATE_FORMAT );
            } );
            self._listenSerialOptions = self.kotable.data.subscribe(function() {
                self.reportConfigSerialEmail( self.serialEmail() );
                self.reportConfigSerialLetter( self.serialLetter() );
            });
        },

        addColSelector: function( data ) {
            var self = this;
            data = data || {};
            data.cols = self.availableCols;
            data.isGroup = self.groupBy.enabled;
            data.renderLink = data.renderLink || false;
            var colSelectorInstance = new InSightColSelectorViewModel( data );
            self.displayFields.push( colSelectorInstance );
        },

        addColSelectorClick: function() {
            this.addColSelector( null );
        },

        removeColSelector: function( colToRemove ) {
            this.displayFields.remove( function( col ) {
                return col.clientId === colToRemove.clientId;
            } );
        },

        useRegexWithDollar: function( value ) {
            return {
                $regex: value.regex,
                $options: value.options
            };
        },

        addFilterElement: function( data ) {
            data = data || {};
            data.cols = this.availableCols;

            if( '$regex' === data.operator && data.value && data.value.regex ) {
                data.value = this.useRegexWithDollar( data.value );
            }

            var filterElem = new InSightFilterElementViewModel( Y.doccirrus.schemautils.recoverKey( data ) );

            this.filterElements.push( filterElem );
        },

        addFilterNotElement: function( data ) {
            data = data || {};
            data.cols = this.availableCols;

            if( '$regex' === data.operator && data.value && data.value.regex ) {
                data.value = this.useRegexWithDollar( data.value );
            }

            var filterElem = new InSightFilterElementViewModel( Y.doccirrus.schemautils.recoverKey( data ) );

            this.filterNotElements.push( filterElem );
        },

        addFilterElementClick: function() {
            this.addFilterElement( null );
        },

        addFilterNotElementClick: function() {
            this.addFilterNotElement( null );
        },

        removeFilterElement: function( elemToRemove ) {
            this.filterElements.remove( function( elem ) {
                return elem.clientId === elemToRemove.clientId;
            } );
        },

        removeFilterNotElement: function( elemToRemove ) {
            this.filterNotElements.remove( function( elem ) {
                return elem.clientId === elemToRemove.clientId;
            } );
        },

        setColsObserver: function() {
            var self = this;
            self.currentColumns = ko.computed( self.colsObserverHandler.bind( this ) );
        },

        colsObserverHandler: function() {
            var
                self = this,
                data = self.displayFields(),
                res = [],
                val,
                colName,
                renderLink,
                colDefinition,
                addedColds = {};

            data.forEach( function( el ) {
                val = el.currentValue();
                renderLink = el.renderLink();
                if( val ) {
                    colDefinition = null;

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

                    res.push( {
                        id: colName,
                        renderLink: renderLink,
                        label: colDefinition ? colDefinition.label : { en: val, de: val },
                        rendererName: colDefinition ? colDefinition.rendererName : undefined,
                        model: colDefinition ? colDefinition.model : undefined,
                        type: colDefinition ? colDefinition.type : 'String',
                        list: colDefinition ? colDefinition.list : [],
                        dateFormat: colDefinition ? colDefinition.dateFormat : dateFormat,
                        searchAsArrayOfValues: colDefinition ? colDefinition.searchAsArrayOfValues : false,
                        notVisibleAtSummaryRow: undefined === unwrap( el.visibleAtSummaryRow ) ? false : (!unwrap( el.visibleAtSummaryRow ))
                    } );

                }
            } );

            return res;
        },

        getTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' );

            self.availableCols = Y.doccirrus.insight2.tableUtils.prepareColsData( inCaseSchema, binder.customFields(), currentLang );
        },

        initSubViewManager: function() {
            return {
                state: {
                    table: ko.observable( true ),
                    config: ko.observable( false )
                },
                buttons: this.initSubViewButtons(),
                switchView: function( viewName ) {
                    var self = this,
                        newValue = false,
                        key;
                    for( key in self.state ) {
                        if( self.state.hasOwnProperty( key ) ) {
                            newValue = key === viewName;
                            self.state[key]( newValue );
                        }
                    }
                    if( 'config' === viewName ){
                        setTimeout( function() {
                            $( '[data-toggle="popover"]' ).popover();
                        }, 200 );
                    }
                }
            };
        },

        initSubViewButtons: function() {
            var
                self = this,
                saveConfigBtt = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'save-config',
                        text: i18n( 'InSight2Mojit.table.SAVE_CONFIG' ),
                        title: i18n( 'InSight2Mojit.table.SAVE_CONFIG' ),
                        icon: 'CHEVRON_RIGHT',
                        option: 'PRIMARY',
                        size: 'SMALL',
                        disabled: ko.computed( function() {
                            return !self.checkFormValidity();
                        } ),
                        visible: true,
                        click: function() {
                            self.saveConfig();
                        }
                    }
                } ),
                backToTableBtt = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'back-to-table',
                        text: i18n( 'InSight2Mojit.table.CANCEL' ),
                        title: i18n( 'InSight2Mojit.table.CANCEL' ),
                        icon: 'CHEVRON_RIGHT',
                        option: 'PRIMARY',
                        size: 'SMALL',
                        visible: true,
                        click: function() {
                            self.backToTable();
                        }
                    }
                } ),
                removeTableBtt = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'remove-table',
                        text: i18n( 'InSight2Mojit.table.REMOVE_TABLE' ),
                        title: i18n( 'InSight2Mojit.table.REMOVE_TABLE' ),
                        icon: 'CHEVRON_RIGHT',
                        option: 'PRIMARY',
                        size: 'SMALL',
                        disabled: false,
                        visible: true,
                        click: function() {
                            Y.doccirrus.DCWindow.confirm( {
                                icon: Y.doccirrus.DCWindow.ICON_INFO,
                                title: i18n( 'InSight2Mojit.table.REMOVE_TABLE_CONFIRM_TITLE' ),
                                message: i18n( 'InSight2Mojit.table.REMOVE_TABLE_CONFIRM', {
                                    data: {
                                        reportName: self.tableNameDisplay() || ''
                                    }
                                } ),
                                callback: function( result ) {
                                    if( !result.success ) {
                                        return;
                                    }

                                    self.removeTable();
                                }
                            } );
                        }
                    }
                } ),
                showConfigBtt = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'show-config',
                        text: i18n( 'InSight2Mojit.table.CONFIGURATION' ),
                        title: i18n( 'InSight2Mojit.table.CONFIGURATION' ),
                        icon: 'CHEVRON_RIGHT',
                        option: 'PRIMARY',
                        size: 'SMALL',
                        disabled: false,
                        visible: true,
                        click: function() {
                            var dateMode = (self.config.dateSettings && self.config.dateSettings.dateMode) || 'absolute';
                            self.setTimelineData( self.config.dateSettings );
                            self.dateSettings.dateMode( dateMode );
                            self.subViewManager.switchView( 'config' );
                        }
                    }
                } );

            return {
                showConfig: showConfigBtt,
                saveConfig: saveConfigBtt,
                removeTable: removeTableBtt,
                backToTable: backToTableBtt
            };
        },

        setTimelineData: function( dateSettings ) {
            var
                self = this,
                startDateISO = '',
                endDateISO = '',
                now,
                startDate,
                endDate,
                start,
                end,
                relativeMode;

            if( self.config.dateSettings && self.config.dateSettings.hideTimeline ) {

                if( 'absolute' === dateSettings.dateMode &&
                    dateSettings.absoluteStartDate &&
                    dateSettings.absoluteEndDate ) {

                    startDateISO = dateSettings.absoluteStartDate;
                    endDateISO = dateSettings.absoluteEndDate;

                    self.config.dateSelectorData.switchMode( 'custom' );

                } else if( 'relative' === dateSettings.dateMode ) {
                    now = moment();
                    startDate = now.add( dateSettings.relativeOffset, 'ms' );
                    startDateISO = startDate.toISOString();

                    endDate = startDate.add( dateSettings.relativeDuration, 'ms' );
                    endDateISO = endDate.toISOString();

                    self.config.dateSelectorData.switchMode( 'custom' );

                } else if( 'relativeWithMode' === dateSettings.dateMode ) {

                    start = moment();
                    relativeMode = dateSettings.relativeMode;

                    start.startOf( relativeMode );
                    start.add( dateSettings.relativeModeOffset, relativeMode + 's' );
                    startDateISO = start.toISOString();

                    end = start.add( 1, relativeMode + 's' ).subtract( 1, 'ms' );
                    endDateISO = end.toISOString();

                    self.config.dateSelectorData.switchMode( dateSettings.relativeMode );
                }

                self.config.timeline.setBothDates( startDateISO, endDateISO );
                self.config.timeline.externalOnDateChange();
                self.config.timeline.updateTimelineChart();
            }

        },

        checkFormValidity: function() {
            var valid = true,
                elements = this.filterElements();

            var notValidElem = elements.find( function( filterElement ) {
                return !filterElement.isValid();
            } );

            if( notValidElem ) {
                valid = false;
            }

            return valid;
        },

        saveConfig: function() {
            var
                self = this,
                aggregatePipeline = self.aggregatePipeline(),
                colsForKo = Y.doccirrus.insight2.tableUtils.prepareColsForKo( self.currentColumns(), currentLang ),
                toSave = self.prepareDataForSave(),
                csvExportConf = Y.doccirrus.insight2.tableUtils.prepareCsvExportConf( self.currentColumns() );

            if( aggregatePipeline ) {
                try{
                    JSON.parse( aggregatePipeline );
                } catch (error) {
                    return Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: PIPELINE_IS_INVALID + '<br>' + error.toString()
                    } );
                }
            }

            Y.doccirrus.jsonrpc.api.insight2.update( {
                query: {
                    _id: self.config._id
                },
                data: toSave,
                fields: Object.keys( toSave )
            } ).then( function( res ) {
                self.config.dateSettings = res.data.dateSettings;
                self.createKoTable( {
                    columns: colsForKo,
                    savePipeline: true,
                    csvExportConf: csvExportConf
                } );
                self.tableNameDisplay( self.tableName() );
                self.subViewManager.switchView( 'table' );
                self.config.refresh( self.config._id );
            }, function( err ) {
                Y.log( 'Reporting tables - error during table update. ' + JSON.stringify( err ), 'error', NAME );
            } );
        },

        backToConfig: function() {
            var self = this;
            self.subViewManager.switchView( 'config' );
        },

        backToTable: function() {
            var self = this;
            self.subViewManager.switchView( 'table' );
        },

        removeTable: function() {
            var self = this;
            self.config.rt( this.config._id );
            self.config.refresh( null );
        },

        prepareDataForSave: function() {
            var
                self = this,
                dateSettings = self.dateSettings,
                csvFilename = self.tableName(),
                displayFields = self.displayFields(),
                filterElements = self.filterElements(),
                filterNotElements = self.filterNotElements(),
                groupEnabled = self.groupBy.enabled(),
                groupVisibility = self.groupVisibility(),
                forContainer = self.forContainer(),
                aggregatePipeline = self.aggregatePipeline(),
                serialLetter = self.serialLetter(),
                serialEmail = self.serialEmail(),
                groupField,
                result = {
                    displayFields: [],
                    filterElements: [],
                    filterNotElements: [],
                    groupBy: {
                        enabled: false,
                        value: null
                    },
                    groupVisibility: groupVisibility,
                    serialLetter: serialLetter,
                    serialEmail: serialEmail,
                    forContainer: forContainer,
                    dateSettings: {
                        absoluteStartDate: self.config.dateSelectorData.startDate(),
                        absoluteEndDate: self.config.dateSelectorData.endDate(),
                        relativeOffset: dateSettings.relativeOffset(),
                        relativeDuration: dateSettings.relativeDuration(),
                        hideTimeline: dateSettings.hideTimeline(),
                        dateMode: dateSettings.dateMode(),
                        relativeMode: self.config.dateSelectorData.switchMode(),
                        relativeModeOffset: dateSettings.relativeModeOffset()
                    },
                    csvFilename: csvFilename,
                    isExpertModeActive: self.isExpertModeActive(),
                    country: self.countryMode()
                };
            if( self.isExpertModeActive() ) {
                result.aggregatePipeline = aggregatePipeline || '';
            }

            displayFields.forEach( function( dField ) {

                var type = dField.currentType(),
                    groupOptions = dField.currentGroupOptions,
                    currentGroupOption = unwrap( groupOptions[type] ),
                    truncateListLimit = groupOptions.truncateListLimit(),
                    stringDistinct = groupOptions.stringDistinct(),
                    elem = {
                        value: dField.currentValue()
                    };

                if( groupEnabled ) {
                    elem.groupOption = currentGroupOption;
                    elem.stringDistinct = stringDistinct;
                }

                elem.renderLink = dField.renderLink() || false;
                elem.notVisibleAtSummaryRow = !dField.visibleAtSummaryRow();

                if( 'stringTruncateList' === currentGroupOption && truncateListLimit ) {
                    truncateListLimit = parseInt( truncateListLimit, 10 );
                    elem.truncateListLimit = truncateListLimit;
                }

                result.displayFields.push( elem );
            } );

            filterElements.forEach( function( fElement ) {
                var fVal = fElement.koSchemaValue.value(),
                    val = Y.doccirrus.schemautils.recoverKey( fVal === undefined ? '' : fVal ),
                    elem = {
                        value: Y.doccirrus.schemautils.prepareKey( val ),
                        operator: fElement.currentOperator(),
                        field: fElement.currentField(),
                        between: fElement.between()
                    };
                result.filterElements.push( elem );
            } );

            filterNotElements.forEach( function( fElement ) {
                var fVal = fElement.koSchemaValue.value(),
                    val = Y.doccirrus.schemautils.recoverKey( fVal === undefined ? '' : fVal ),
                    elem = {
                        value: Y.doccirrus.schemautils.prepareKey( val ),
                        operator: fElement.currentOperator(),
                        field: fElement.currentField(),
                        between: fElement.between()
                    };
                result.filterNotElements.push( elem );
            } );

            if( groupVisibility ) {
                result.visibility = this.visibility();
            } else {
                result.visibility = Y.doccirrus.schemas.insight2.visibilityTypes.USER;
            }

            if( forContainer ) {
                result.container = this.container();
                if( -1 === result.container.indexOf( "inSightMyReportsTab" ) ) {
                    result.container.push( "inSightMyReportsTab" );
                }
            } else {
                result.container = [ "inSightMyReportsTab" ];
            }

            if( groupEnabled ) {
                groupField = this.groupBy.selector.currentValue();
                result.groupBy.enabled = groupEnabled;
                result.groupBy.value = groupField;
            }

            return result;
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
        NAME: 'InSightTableViewModel',
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

    KoViewModel.registerConstructor( InSightTableViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'dcforms-reducedschema',
        'dcmedia',
        'insight2-schema',
        'InSightColSelectorViewModel',
        'InSightFilterElementViewModel',
        'dcforms-schema-InCase-T',
        'dcforms-schema-InSuite-T',
        'dc-comctl',
        'KoUI-all',
        'schemautils',
        'KoTableNamedRenderers',
        'report-table-utils',
        'InSightTableModel',
        'SerialLetterAndEmailButtonViewModel'
    ]
} );
