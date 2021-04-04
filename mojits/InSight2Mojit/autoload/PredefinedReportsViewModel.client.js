/*eslint prefer-template:0, strict:0 */
/*global YUI, ko */

YUI.add( 'PredefinedReportsViewModel', function( Y, NAME ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        KBVUTILITY_STATISTICS_ADVICE = i18n( 'InCaseMojit.KBVUtility2EditorModelJS.STATISTICS_ADVICE' ),
        PredefinedTableViewModel = KoViewModel.getConstructor( 'PredefinedTableViewModel' ),
        InSightTimelineViewModel = KoViewModel.getConstructor( 'InSightTimelineViewModel' ),
        PredefinedReportsListViewModel = KoViewModel.getConstructor( 'PredefinedReportsListViewModel'),

        SHOW_LEFT_SIDE_PANEL = i18n( 'InCaseMojit.casefile_browserJS.hotkey.SHOW_LEFT_SIDE_PANEL' ),
        PRINT_REPORT_SHORTCUT = i18n( 'InCaseMojit.casefile_browserJS.hotkey.PRINT' ),
        isGermany = Y.doccirrus.commonutils.doesCountryModeIncludeGermany(),
        isSwitz = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

    /**
     * @constructor
     * @class PredefinedReportsViewModel
     * @extends InSight2MojitViewModel
     */
    function PredefinedReportsViewModel() {
        PredefinedReportsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PredefinedReportsViewModel, KoViewModel.getDisposable(), {
        templateName: 'PredefinedReportsViewModel',

        //  Extra reporting fields defined by user in forms
        customFieldsLoaded: false,
        customFields: [],

        predefinedReportsListViewModel: null,

        hotKeysGroup: null,

        columnClassName: ko.observable(''),

        /**
         * Defines template object
         * @property template
         * @type {Object}
         */
        template: null,

        /**
         * @param   {Object}    config
         * @param   {String}    config.containerName
         * @param   {String}    config.origin
         * @protected
         */
        initializer: function(config) {
            var self = this;

            self.config = config;
            self.containerConfig = {};
            self.currentPreset = ko.observable();
            self.presetList = ko.observableArray();
            self.table = null;
            self.tableReady = ko.observable( false );
            self.configLoaded = ko.observable( false );
            self.infoText = ko.observable();

            this.fetchContainerConfig(self.config.containerName).then( function( res ) {
                self.containerConfig = res.data;
                self.initPredefinedReportsViewModel();
            }, function( err ) {
                if (err.code === '25003') { // config not found
                    self.initPredefinedReportsViewModel();
                } else {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                }
            });

            self.initTemplate();
        },
        /** @protected */
        destructor: function() {
            this.destroyPredefinedReportsListViewModel();
            this.destroyHotKeyGroup();
        },

        initPredefinedReportsViewModel: function() {
            var self = this;

            //  load set of reports assigned/enabled in this context
            this.fetchPresets().then(function (res) {

                self.sortPresets(res.data);

                self.presetList(res.data);

                var restoredPresetId = self.containerConfig.selectedPresetId;

                if (restoredPresetId) {
                    self.currentPreset(restoredPresetId);
                } else if (res.data.length) {
                    self.currentPreset(res.data[0]._id);
                }

                self.fetchUserDefinedFields( onCustomFieldsLoaded );

            }, function (err) {
                Y.log('Predefined reports - error during presets fetch. ' + JSON.stringify( err ), 'error', NAME);
            });

            function onCustomFieldsLoaded( err ) {
                if ( err ) {
                    Y.log( 'problem loading custom report field definitions: ' + JSON.stringify( err ), 'warn', NAME );
                    //  continue anyway, best effort
                }

                self.initPredefinedReportsListViewModel();

                self.changePreset();
                self.configLoaded(true);
            }

            self.dateSelectorData = self.initDateSelectorData();
            self.dateSelectorData.actualData = true;
            self.timeline = new InSightTimelineViewModel(self.dateSelectorData);
        },

        fetchContainerConfig: function( containerName ) {
            var query = {
                query: {
                    containerName: containerName
                }
            };
            return Y.doccirrus.jsonrpc.api.insight2containers.getByName(query);
        },

        fetchPresets: function () {
            var countries = [];
            var query = {
                query: {
                    //predefined: true
                },
                sort: {
                    csvFilename: 1
                }
            };

            if (this.config && this.config.containerName) {
                query.query.container = {
                    $in: [this.config.containerName]
                };
            }

            if( isSwitz ) {
                countries.push( 'CH' );
            }

            if( isGermany ) {
                countries.push( 'D' );
            }

            if( 0 < countries.length ) {
                query.query.country = {
                    $in: countries
                };
            }

            return Y.doccirrus.jsonrpc.api.insight2.read(query);
        },

        /**
         *  Load any inSight properties defined by the user in forms
         *  (should cache result from server)
         *
         *  TODO: deduplicate with insight2.js version of this - loadUserDefinedFields
         *
         *  @param  {Function}  callback
         */

        fetchUserDefinedFields: function( callback ) {
            var self = this;

            //  skip this if already loaded
            if ( self.customFieldsLoaded ) {
                Y.log( 'Skipping duplicate load of custom reporting fields.', 'debug', NAME );
                return callback( null );
            }

            Y.doccirrus.jsonrpc.api.formtemplate
                .getUserReportingFields()
                .then( onCustomFieldsLoaded );

            function onCustomFieldsLoaded( result ) {
                var
                    customFields = result.data ? result.data : [],
                    i;

                //  add custom fields to result
                for ( i = 0; i < customFields.length; i++ ) {
                    self.customFields.push( customFields[i] );
                }

                self.customFieldsLoaded = true;
                callback( null );
            }
        },

        updateContainerConfig: function( config ) {
            var containerName = this.config.containerName,
                containerId = this.containerConfig._id,
                fields = Object.keys(config),
                req = {
                    query: {
                        name: containerName,
                        _id: containerId
                    },
                    data: config,
                    fields: fields
                };
            return Y.doccirrus.jsonrpc.api.insight2containers.updateConfig(req);
        },
        getTablesAPI: function (params) {
            return Y.doccirrus.jsonrpc.api.insight2.read({
                query: params
            });
        },
        initTable: function (presetId) {
            var self = this,
                tableConfig = {
                    _id: presetId,
                    containerName: self.config.containerName,
                    dateRange: self.dateSelectorData,
                    customFields: self.customFields,
                    origin: (self.config && self.config.origin) || ''
                };

            const currentTableData = self.presetList().filter(
                function (preset) {
                    return preset._id === presetId;
                });

            tableConfig.serialEmail = (currentTableData && currentTableData[0] && currentTableData[0].serialEmail) || false;
            tableConfig.serialLetter = (currentTableData && currentTableData[0] && currentTableData[0].serialLetter) || false;
            self.table = new PredefinedTableViewModel(tableConfig);
            self.tableReady(true);

            // Heilmittel 2 info text
            self.infoText( presetId === '5f4ddd3c744aa7885b923132' ? KBVUTILITY_STATISTICS_ADVICE : null );
        },
        changePreset: function () {
            var presetId = this.currentPreset();

            if (presetId) {
                this.tableReady(false);
                this.initTable(presetId);

                if (this.containerConfig.selectedPresetId !== presetId) {
                    this.containerConfig.selectedPresetId = presetId;

                    this.updateContainerConfig({
                        selectedPresetId: presetId
                    });
                }
            }
        },
        initDateSelectorData: function () {
            var self = this,
                dateRange = self.containerConfig.dateRange,
                res = {},
                now;

            if (dateRange && dateRange.startDate && dateRange.endDate && dateRange.switchMode) {
                res = {
                    startDate: ko.observable( dateRange.startDate ),
                    endDate: ko.observable( dateRange.endDate ),
                    switchMode: ko.observable( dateRange.switchMode ),
                    restored: true
                };
            } else {
                now = new Date();
                res = {
                    startDate: ko.observable( now.toISOString() ),
                    endDate: ko.observable( now.toISOString() ),
                    switchMode: ko.observable( 'month' )
                };
            }

            res.onDateChange = function( data ) {
                self.updateContainerConfig({
                    dateRange: data
                });
            };

            return res;
        },
        sortPresets: function(presets) {
            var orderList = this.containerConfig.presetsOrder;

            if( orderList && orderList.length ) {
                presets.sort( function( a, b ) {
                    var valueA, valueB;
                    if( a._id ) {
                        valueA = orderList.indexOf( a._id );
                    }
                    if( b._id ) {
                        valueB = orderList.indexOf( b._id );
                    }
                    if( valueA > valueB ) {
                        return 1;
                    }
                    if( valueA < valueB ) {
                        return -1;
                    }
                    return 0;
                } );
            }
        },


        initPredefinedReportsListViewModel: function() {
            var
                self = this,
                listViewModel;

            if( !self.predefinedReportsListViewModel ) {
                listViewModel = new PredefinedReportsListViewModel({
                    presetList: self.presetList,
                    currentPreset: self.currentPreset,
                    pr: self
                });
                self.predefinedReportsListViewModel = ko.observable( listViewModel );

                self.predefinedReportsListViewModel().isPinned.subscribe(function(v) {
                    var isLeftPinned = v,
                        className = isLeftPinned && 'col-md-10 with-sidebarMenu' || '';

                    self.columnClassName(className);

                    self.timeline.chartResize();
                });

                self.initHotKeyGroup();
            }
        },
        destroyPredefinedReportsListViewModel: function() {
            var
                self = this;

            if( self.predefinedReportsListViewModel ) {
                peek( self.predefinedReportsListViewModel ).destroy();
                self.predefinedReportsListViewModel = null;
            }
        },
        initHotKeyGroup: function() {
            var self = this;

            self.hotKeysGroup = Y.doccirrus.HotKeysHandler.addGroup( 'PredefinedReportsViewModel' );
            self.hotKeysGroup
                .on( 'ctrl+h', i18n( 'InCaseMojit.HotkeysModal.label' ), onShowShortcutsList )
                .on( 'ctrl+shift+arrowLeft', SHOW_LEFT_SIDE_PANEL, onSidePanelShortcut )
                .on( 'alt+p', PRINT_REPORT_SHORTCUT, onPrintShortcut );

            function onShowShortcutsList() {
                Y.doccirrus.modals.hotkeys.show( { 'hotKeysGroups': 'PredefinedReportsViewModel' } );
            }

            function onSidePanelShortcut() {
                var
                    listViewModel = peek( self.predefinedReportsListViewModel ),
                    leftSidePanel = listViewModel && listViewModel.leftSidePanel;
                if( leftSidePanel ) {
                    leftSidePanel.toggleSideBar();
                }
            }

            function onPrintShortcut() {
                self.table.pdfExportHook();
            }
        },
        destroyHotKeyGroup: function() {
            if( this.hotKeysGroup ) {
                this.hotKeysGroup.un( 'shift+ctrl+arrowLeft' );
                this.hotKeysGroup.un( 'ctrl+h' );
                this.hotKeysGroup.un( 'alt+p' );
                this.hotKeysGroup = null;
            }
        },

        /** @protected */
        initTemplate: function(){
            var
                self = this;

            self.template = {
                name: self.get( 'templateName' ),
                data: self
            };
        }

    }, {
        NAME: 'PredefinedReportsViewModel',
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
            }
        }
    } );

    KoViewModel.registerConstructor( PredefinedReportsViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'KoUI-all',
        //'InSight2MojitViewModel',
        'PredefinedTableViewModel',
        'InSightTimelineViewModel',
        'PredefinedReportsListViewModel'
    ]
} );
