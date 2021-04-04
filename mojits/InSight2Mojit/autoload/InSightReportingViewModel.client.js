/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'InSightReportingViewModel', function( Y, NAME ) {

    var
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,

        InSight2MojitViewModel = KoViewModel.getConstructor( 'InSight2MojitViewModel' ),
        InSightTableViewModel = KoViewModel.getConstructor( 'InSightTableViewModel' ),
        InSightTimelineViewModel = KoViewModel.getConstructor( 'InSightTimelineViewModel' ),
        PredefinedReportsListViewModel = KoViewModel.getConstructor( 'PredefinedReportsListViewModel' ),

        SHOW_LEFT_SIDE_PANEL = i18n( 'InCaseMojit.casefile_browserJS.hotkey.SHOW_LEFT_SIDE_PANEL' ),
        PRINT_REPORT_SHORTCUT = i18n( 'InCaseMojit.casefile_browserJS.hotkey.PRINT' );

    /**
     * @constructor
     * @class InSightReportingViewModel
     * @extends InSight2MojitViewModel
     */
    function InSightReportingViewModel() {
        InSightReportingViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSightReportingViewModel, InSight2MojitViewModel, {
        templateName: 'InSightReportingViewModel',
        initializer: function( options ) {
            var
                self = this;

            this.table = ko.observable( false );
            this.containerConfig = {};
            this.configLoaded = ko.observable( false );
            this.currentPreset = ko.observable();
            this.presetList = ko.observableArray();

            self.buttonAddNewI18n = i18n( 'InSight2Mojit.table.ADD_NEW' );

            this.fetchContainerConfig( options.containerName ).then( function( res ) {
                self.containerConfig = res.data;
                self.initInSightReportingViewModel( options );
            }, function( err ) {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
            } );
        },

        /** @protected */
        destructor: function() {
            this.destroyHotKeyGroup();
            this.destroyPredefinedReportsListViewModel();
        },

        initInSightReportingViewModel: function( options ) {
            var self = this;

            this.fetchPresets().then( function( res ) {
                self.sortPresets( res.data );

                self.presetList( res.data );

                var restoredPresetId = self.containerConfig.selectedPresetId;

                if( restoredPresetId ) {
                    self.currentPreset( restoredPresetId );
                } else if( res.data.length ) {
                    self.currentPreset( res.data[0]._id );
                }

                self.initPredefinedReportsListViewModel();

                self.changePreset();
                self.configLoaded( true );
            }, function( err ) {
                Y.log( 'Predefined reports - error during presets fetch. ' + JSON.stringify( err ), 'error', NAME );
            } );

            self.viewModelOptions = options;
            self.dateSelectorData = self.initDateSelectorData();
            self.dateSelectorData.actualData = true;
            self.timeline = new InSightTimelineViewModel( self.dateSelectorData );
        },
        initDateSelectorData: function() {
            var self = this,
                dateRange = this.containerConfig.dateRange,
                res = {},
                now;

            if( dateRange && dateRange.startDate && dateRange.endDate && dateRange.switchMode ) {
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
                self.updateContainerConfig( {
                    dateRange: data
                } );
            };

            return res;
        },

        sortPresets: function( presets ) {
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
                listViewModel = new PredefinedReportsListViewModel( {
                    presetList: self.presetList,
                    currentPreset: self.currentPreset,
                    pr: self
                } );
                self.predefinedReportsListViewModel = ko.observable( listViewModel );

                self.predefinedReportsListViewModel().isPinned.subscribe( function( v ) {
                    var isLeftPinned = v,
                        className = isLeftPinned && 'col-md-10 with-sidebarMenu' || '';

                    self.columnClassName( className );

                    self.timeline.chartResize();
                } );

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

        fetchPresets: function() {
            var query = {
                query: {
                    predefined: false
                },
                sort: {
                    csvFilename: 1
                }
            };

            if( this.config && this.config.containerName ) {
                query.query.container = {
                    $in: [this.config.containerName]
                };
            }

            return Y.doccirrus.jsonrpc.api.insight2.read( query );
        },

        changePreset: function() {
            var presetId = this.currentPreset();

            if( presetId ) {
                this.initTable( presetId );
                if( this.containerConfig.selectedPresetId !== presetId ) {
                    this.containerConfig.selectedPresetId = presetId;

                    this.updateContainerConfig( {
                        selectedPresetId: presetId
                    } );
                }
            }
        },

        initTable: function( presetId ) {
            var self = this;

            this.getTablesAPI( {
                _id: presetId
            } ).then( function( response ) {
                self.addTable( response.data[0] );
            } ).fail( function( err ) {
                Y.log( 'ERR get tables' + err, 'error', NAME );
            } );
        },

        initHotKeyGroup: function() {
            var self = this;

            self.hotKeysGroup = Y.doccirrus.HotKeysHandler.addGroup( 'PredefinedReportsViewModel' );
            self.hotKeysGroup
                .on( 'ctrl+shift+arrowLeft', SHOW_LEFT_SIDE_PANEL, onShowLeftSidePanel )
                .on( 'alt+p', PRINT_REPORT_SHORTCUT, onPrintShortcut );

            function onShowLeftSidePanel() {
                var
                    listViewModel = peek( self.predefinedReportsListViewModel ),
                    leftSidePanel = listViewModel && listViewModel.leftSidePanel;
                if( leftSidePanel ) {
                    leftSidePanel.toggleSideBar();
                }
            }

            function onPrintShortcut() {
                //  if no table, or no data, then skip print
                if ( !self.table() || !self.table().kotable || 0 === self.table().kotable.data().length ) {
                    return;
                }

                self.table().kotable.showExportPdfDataStart();
            }
        },
        destroyHotKeyGroup: function() {
            var self = this;
            if( self.hotKeysGroup ) {
                self.hotKeysGroup.un( 'shift+ctrl+arrowLeft' );
                self.hotKeysGroup.un( 'alt+p' );
                self.hotKeysGroup = null;
            }
        },

        columnClassName: ko.observable( '' ),

        addTable: function( tableConfig ) {

            if( !tableConfig ) {
                return;
            }

            var self = this;
            tableConfig.rt = function( a ) {
                self.removeTable( a );
            };
            if( !tableConfig.filterNotElements ) {
                tableConfig.filterNotElements = [];
            }
            tableConfig.refresh = function( restoredPresetId ) {
                self.currentPreset( restoredPresetId );
                self.updateContainerConfig( {
                    selectedPresetId: peek( self.currentPreset )
                } );

                self.fetchPresets().then( function( res ) {
                    self.sortPresets( res.data );
                    self.presetList( res.data );
                    self.changePreset();
                }, function( err ) {
                    Y.log( 'Predefined reports - error during presets fetch. ' + JSON.stringify( err ), 'error', NAME );
                } );
            };
            tableConfig.dateSelectorData = self.dateSelectorData;
            tableConfig.timeline = self.timeline;
            self.table( new InSightTableViewModel( tableConfig ) );
        },

        addTableClick: function() {
            var
                self = this,
                //  Add a default filter to limit to activity reportings, MOJ-11480
                defaultFilter = [
                    /* disable default filter while UI concept is worked out
                    {
                        value: "ACTIVITY",
                        operator: "$eq",
                        field: "entityName",
                        between: "$and"
                    }
                    */
                ];

            Y.doccirrus.jsonrpc.api.insight2.create( {
                data: {
                    container: [self.viewModelOptions.containerName],
                    filterElements: defaultFilter
                }
            } ).then( function( response ) {
                self.addTable( {
                    _id: response.data[0],
                    filterElements: defaultFilter
                } );
                self.table().backToConfig();
            }, function( err ) {
                Y.log( 'Reporting tables - error during table create. ' + JSON.stringify( err ), 'error', NAME );
            } );
        },

        removeTable: function( id ) {
            var self = this;
            Y.doccirrus.jsonrpc.api.insight2.delete( {
                query: {
                    _id: id
                }
            } ).then( function() {
                self.table( null );
                self.containerConfig.selectedPresetId = null;
            }, function( err ) {
                Y.log( 'Reporting tables - error during table remove. ' + JSON.stringify( err ), 'error', NAME );
            } );
        },

        getTablesAPI: function( params ) {
            return Y.doccirrus.jsonrpc.api.insight2.read( {
                query: params
            } );
        },

        fetchContainerConfig: function( containerName ) {
            var query = {
                query: {
                    containerName: containerName
                }
            };
            return Y.doccirrus.jsonrpc.api.insight2containers.getByName( query );
        },

        updateContainerConfig: function( config ) {
            var containerName = this.viewModelOptions.containerName,
                containerId = this.containerConfig._id,
                fields = Object.keys( config ),
                req = {
                    query: {
                        name: containerName,
                        _id: containerId
                    },
                    data: config,
                    fields: fields
                };
            return Y.doccirrus.jsonrpc.api.insight2containers.updateConfig( req );
        }

    }, {
        NAME: 'InSightReportingViewModel',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( InSightReportingViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'InSight2MojitViewModel',
        'InSightTableViewModel',
        'InSightTimelineViewModel',
        'PredefinedReportsListViewModel'
    ]
} );
