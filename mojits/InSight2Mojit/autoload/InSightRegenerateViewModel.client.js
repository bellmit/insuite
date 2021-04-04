'use strict';

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _ */
YUI.add( 'InSightRegenerateViewModel', function( Y , NAME ) {


    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        InSightTimelineViewModel = KoViewModel.getConstructor( 'InSightTimelineViewModel' ),

        POLL_STATS_INTERVAL = 3000;

    /**
     * @constructor
     * @class InSightRegenerateViewModel
     * @extends InSight2MojitViewModel
     */
    function InSightRegenerateViewModel() {
        InSightRegenerateViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSightRegenerateViewModel, KoViewModel.getDisposable(), {
            templateName: 'InSightRegenerateViewModel',

            template: null,
            timeline: null,
            startDate: null,
            endDate: null,
            isRegenerating: null,
            isCanceling: ko.observable( false ),
            handleRegenerateEvent: null,

            reportingCount: null,
            synreportingCount: null,

            /** @protected */
            initializer: function() {
                var
                    self = this;

                self.initSelectorData();
                self.initEventHandlers();
                self.initTemplate();
                self.initTimeLine();
                self.initReportingStats();
                self.checkAndSetRegenerationStatus();

                self.genLabdata = ko.observable( true );
                self.genTasks = ko.observable( true );
                self.genSchedules = ko.observable( true );
                self.genActivities = ko.observable( true );

                self.generalTitleI18n = i18n( 'InSight2Mojit.regenerate.title' );
                self.regenerateTitleI18n = i18n( 'InSight2Mojit.regenerate.subTitle' );
                self.selectPeriodI18n = i18n( 'InSight2Mojit.regenerate.label.SELECT_PERIOD' );
                self.selectDataTypeI18n = i18n( 'InSight2Mojit.regenerate.label.SELECT_DATATYPE' );
                self.regenerateTextWarnI18n = i18n( 'InSight2Mojit.regenerate.text.warn' );
                self.regenerateButtonCancelI18n = i18n( 'DCWindow.BUTTONS.CANCEL' );

                self.REGENERATE = i18n( 'InSight2Mojit.regenerate.buttons.REGENERATE' );
                self.CLEAR_REPORTINGS = i18n( 'InSight2Mojit.regenerate.buttons.CLEAR_REPORTINGS' );
                self.CLEAR_SYNCREPORTINGS = i18n( 'InSight2Mojit.regenerate.buttons.CLEAR_SYNCREPORTINGS' );
                self.HIGH_LOAD = i18n( 'InSight2Mojit.regenerate.text.HIGH_LOAD' );

                self.GEN_LABDATA = i18n( 'InSight2Mojit.regenerate.buttons.GEN_LABDATA' );
                self.GEN_TASKS = i18n( 'InSight2Mojit.regenerate.buttons.GEN_TASKS' );
                self.GEN_SCHEDULES = i18n( 'InSight2Mojit.regenerate.buttons.GEN_SCHEDULES' );
                self.GEN_ACTIVITIES = i18n( 'InSight2Mojit.regenerate.buttons.GEN_ACTIVITIES' );

                self.restartWorkerI18n = i18n( 'InSight2Mojit.restart.title' );
                self.restartWorkerInfo = i18n( 'InSight2Mojit.restart.info' );
            },

            destructor: function() {
                var
                    self = this;

                clearTimeout( self.pollReportingStats );

                if( self.handleRegenerateEvent ) {
                    self.handleRegenerateEvent.removeEventListener();
                    self.handleRegenerateEvent = null;
                }
            },

            initEventHandlers: function() {
                var
                    self = this;

                self.handleRegenerateEvent = Y.doccirrus.communication.on( {
                    event: 'regenerateReportDone',
                    handlerId: 'regenerateReportDone.RegenerateViewModel',
                    done: function() {
                        self.checkAndSetRegenerationStatus();
                    }
                } );
            },

            initReportingStats: function() {
                var
                    self = this;

                self.reportingCount = ko.observable( 0 );
                self.syncreportingCount = ko.observable( 0 );
                self.isLoadHigh = ko.observable( false );

                //  assume it's not safe to start a new regeneration until the server provides status
                self.isRegenerating = ko.observable( true );

                self.disableClearReportings = ko.observable( false );
                self.disableClearSyncreportings = ko.observable( false );

                self.statSummaryLine = ko.computed( function() {
                    return '' +
                        self.reportingCount() + ' ' +
                        i18n( 'InSight2Mojit.regenerate.text.REPORTING_ENTRIES' ) + ', ' +
                        self.syncreportingCount() + ' ' + i18n( 'InSight2Mojit.regenerate.text.SYNCREPORTING_ENTRIES' );
                } );

                self.pollReportingStats = setInterval( function() { self.updateReportingStats(); }, POLL_STATS_INTERVAL );
                self.updateReportingStats();
            },

            cancelRegenerate: function() {
                this.isCanceling( true );
                Y.doccirrus.jsonrpc.api.reporting.setCancelRegenerationFlag();
            },

            clearReportings: function() {
                var self = this;

                self.disableClearReportings( true );
                Y.doccirrus.jsonrpc.api.reporting.clearReportings().then( onCleared ).fail( onError );

                function onCleared( /* response */ ) {
                    Y.log( 'Cleared reportings collection.', 'info', NAME );
                    self.updateReportingStats();
                    self.disableClearReportings( false );
                }

                function onError( err ) {
                    Y.log( 'Problem clearing reporting collection: ' + JSON.stringify( err ), 'error', NAME );
                    self.disableClearReportings( false );
                }
            },

            clearSyncreportings: function() {
                var self = this;

                self.disableClearSyncreportings( true );
                Y.doccirrus.jsonrpc.api.reporting.clearSyncreportings().then( onCleared ).fail( onError );

                function onCleared( /* response */ ) {
                    Y.log( 'Cleared reportings collection.', 'info', NAME );
                    self.updateReportingStats();
                    self.disableClearSyncreportings( false );
                }

                function onError( err ) {
                    Y.log( 'Problem clearing reporting collection: ' + JSON.stringify( err ), 'error', NAME );
                    self.disableClearSyncreportings( false );
                }
            },

            checkAndSetRegenerationStatus: function() {
                var
                    self = this;
                Y.doccirrus.jsonrpc.api.reporting.getRegenerationFlagUI().then( function( regenerationStatus ) {
                    self.isRegenerating( regenerationStatus.regenerationFlag );
                }, function( err ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: err.message
                    } );
                } );
            },

            /** @protected */
            initTemplate: function() {
                var
                    self = this;

                self.template = {
                    name: self.get( 'templateName' ),
                    data: self
                };
            },

            initSelectorData: function() {
                var
                    now = new Date();

                this.startDate = ko.observable( now.toISOString() );
                this.endDate = ko.observable( now.toISOString() );
            },

            restartVisible: function() {
                return Y.doccirrus.auth.memberOf( 'SUPPORT' );
            },

            restartWorker: function() {
                Y.doccirrus.DCWindow.confirm( {
                    title: i18n( 'DCWindow.notice.title.info' ),
                    message: i18n( 'FormPortalMojit.formPortalBinder.text.SAVE_QUESTION' ),
                    callback: function ( dialog ) {
                        if( dialog.success ) {
                            Y.doccirrus.jsonrpc.api.reporting.restartReportingWorker().done( function() {
                            } ).fail( function( error ) {
                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                            } );
                        }
                    }
                } );
            },

            startRegenerate: function() {
                var self = this;
                self.isRegenerating( true );
                self.isCanceling( false );

                Y.doccirrus.jsonrpc.api.reporting.startGenerateFromUI( {
                    data: {
                        fullGeneration: true,
                        noActivities: !self.genActivities(),
                        noLabdata: !self.genLabdata(),
                        noTasks: !self.genTasks(),
                        noSchedules: !self.genSchedules(),
                        startDate: ko.unwrap( self.startDate ),
                        endDate: ko.unwrap( self.endDate )
                    },
                    query: {
                    }
                } );
            },

            updateReportingStats: function() {
                var self = this;

                Y.doccirrus.jsonrpc.api.reporting.getReportingDbStatus({noBlocking:true}).then( onGetStats ).fail( onGetStatsError );

                function onGetStats( stats ) {
                    stats = stats.data ? stats.data : stats;
                    self.reportingCount( stats.reportings || 0 );
                    self.syncreportingCount( stats.syncreportings || 0 );
                    self.isLoadHigh( stats.isLoadHigh );
                    self.isRegenerating( stats.isRegenerating );
                }

                function onGetStatsError( err ) {
                    Y.log( 'Could not get reporting stats from server: ' + JSON.stringify( err ), 'error', NAME );
                }
            },

            initTimeLine: function() {
                this.timeline = new InSightTimelineViewModel( this.getSelectorData() );
            },

            getSelectorData: function() {
                return {
                    startDate: this.startDate,
                    endDate: this.endDate,
                    switchMode: ko.observable( 'day' )
                };
            }
        },
        {
            NAME: 'InSightRegenerateViewModel',
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

                binder: {
                    valueFn: function() {
                        return Y.doccirrus.utils.getMojitBinderByType( 'InSight2Mojit' );
                    }
                }
            }
        }
    );

    KoViewModel.registerConstructor( InSightRegenerateViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'InSight2MojitViewModel',
        'InSightTimelineViewModel'
    ]
} );
