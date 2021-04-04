/*global YUI, ko, _ */
/*jshint esnext:true */
/* eslint-disable prefer-template, valid-jsdoc, prefer-rest-params */
YUI.add( 'InBackupViewModel', function( Y, NAME ) {
    'use strict';
    var
        i18n = Y.doccirrus.i18n,
        moment = Y.doccirrus.commonutils.getMoment(),
        setValidationRules = Y.doccirrus.ruleutils.validate,
        mandatory = Y.doccirrus.validations.common.smbMandatory[0].validator,
        lodash = _,
        peek = ko.utils.peekObservable,
        //unwrap = ko.unwrap,
        //ignoreDependencies = ko.ignoreDependencies,

        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        STATE_UNKNOWN = i18n( 'InBackupMojit.InBackupViewModel.text.STATE_UNKNOWN' ),
        STATE_UNUSED = i18n( 'InBackupMojit.InBackupViewModel.text.STATE_UNUSED' ),
        STATE_IDLE = i18n( 'InBackupMojit.InBackupViewModel.text.STATE_IDLE' ),
        STATE_SYNC = i18n( 'InBackupMojit.InBackupViewModel.text.STATE_SYNC' ),
        STATE_BACKUP = i18n( 'InBackupMojit.InBackupViewModel.text.STATE_BACKUP' ),
        STATE_RAW = i18n( 'InBackupMojit.InBackupViewModel.text.STATE_RAW' ),
        STATE_BLOCKED = i18n( 'InBackupMojit.InBackupViewModel.text.STATE_BLOCKED' ),
        BACKUP_STATES_TITLE = i18n( 'InBackupMojit.InBackupViewModel.text.BACKUP_STATES_TITLE' ),
        BACKUP_STATES_BODY = i18n( 'InBackupMojit.InBackupViewModel.text.BACKUP_STATES_BODY' ),
        BACKUP_POINTS_TITLE = i18n( 'InBackupMojit.InBackupViewModel.text.BACKUP_POINTS_TITLE' ),
        DEVICE_STATES_TITLE = i18n( 'InBackupMojit.InBackupViewModel.text.DEVICE_STATES_TITLE' ),
        DEVICE_STATES_BODY = i18n( 'InBackupMojit.InBackupViewModel.text.DEVICE_STATES_BODY' ),
        DEVICE_SCHEDULES_TITLE = i18n( 'InBackupMojit.InBackupViewModel.text.DEVICE_SCHEDULES_TITLE' ),
        DEVICE_SCHEDULES_BODY = i18n( 'InBackupMojit.InBackupViewModel.text.DEVICE_SCHEDULES_BODY' ),
        LABEL_SIZE = i18n( 'InBackupMojit.InBackupViewModel.label.SIZE' ),
        LABEL_TOTAL_SIZE = i18n( 'InBackupMojit.InBackupViewModel.label.TOTAL_SIZE' ),
        LABEL_SCHEDULE = i18n( 'InBackupMojit.InBackupViewModel.label.SCHEDULE' ),
        LABEL_DATE = i18n( 'InBackupMojit.InBackupViewModel.label.DATE' ),
        LABEL_STATE = i18n( 'InBackupMojit.InBackupViewModel.label.STATE' ),
        LABEL_DEVICE = i18n( 'InBackupMojit.InBackupViewModel.label.DEVICE' ),
        // LABEL_CANCEL = i18n( 'InBackupMojit.InBackupViewModel.label.CANCEL' ),
        // LABEL_OK = i18n( 'InBackupMojit.InBackupViewModel.label.OK' ),
        LABEL_ACTION = i18n( 'InBackupMojit.InBackupViewModel.label.ACTION' ),
        // TITLE_CONFIRM = i18n( 'InBackupMojit.InBackupViewModel.title.CONFIRMATION' ),
        // INIT_SUCCESS = i18n( 'InBackupMojit.InBackupViewModel.message.INIT_SUCCESS' ),
        // INIT_PROCESS = i18n( 'InBackupMojit.InBackupViewModel.message.INIT_PROCESS' ),
        // INIT_BACKUP = i18n( 'InBackupMojit.InBackupViewModel.message.INIT_BACKUP' ),
        // BACKUP_SUCCESS = i18n( 'InBackupMojit.InBackupViewModel.message.BACKUP_SUCCESS' ),
        // INIT_CONFIRM = i18n( 'InBackupMojit.InBackupViewModel.message.INIT_CONFIRM' ),
        // INIT_FAIL = i18n( 'InBackupMojit.InBackupViewModel.message.INIT_FAIL' ),
        // BACKUP_FAIL = i18n( 'InBackupMojit.InBackupViewModel.message.BACKUP_FAIL' ),
        // ERROR_MESSAGE = i18n( 'InBackupMojit.InBackupViewModel.message.ERROR_MESSAGE' ),
        // CHECK_PROCESS = i18n( 'InBackupMojit.InBackupViewModel.message.CHECK_PROCESS' ),
        // CHECK_SUCCESS = i18n( 'InBackupMojit.InBackupViewModel.message.CHECK_SUCCESS' ),
        // CHECK_FAIL = i18n( 'InBackupMojit.InBackupViewModel.message.CHECK_FAIL' ),
        BUTTON_INIT = i18n( 'InBackupMojit.InBackupViewModel.button.INITIALIZE' ),
        BUTTON_INFO = i18n( 'InBackupMojit.InBackupViewModel.button.INFO' ),
        BUTTON_EXPORT = i18n( 'InBackupMojit.InBackupViewModel.button.EXPORT' ),
        BUTTON_BACKUP = i18n( 'InBackupMojit.InBackupViewModel.button.BACKUP' ),
        BUTTON_ADDSMB = i18n( 'InBackupMojit.InBackupViewModel.button.ADDSMB' ),
        BUTTON_REINIT = i18n( 'InBackupMojit.InBackupViewModel.button.REINITIALIZE' ),
        BUTTON_CHECK = i18n( 'InBackupMojit.InBackupViewModel.button.CHECK' ),
        BUTTON_CHECK_FAST = i18n( 'InBackupMojit.InBackupViewModel.button.CHECK_FAST' ),
        BUTTON_SHOW_KEY = i18n( 'InBackupMojit.InBackupViewModel.button.SHOW_KEY' ),
        BUTTON_REFRESH = i18n( 'InBackupMojit.InBackupViewModel.button.REFRESH' ),
        BUTTON_REMOVE = i18n( 'InBackupMojit.InBackupViewModel.button.REMOVE' ),
        BUTTON_SCHEDULE_BACKUP = i18n( 'InBackupMojit.InBackupViewModel.button.SCHEDULE_BACKUP' ),
        availableBackupTimes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    function showConfirmBox( type, message, method ) {
        Y.doccirrus.DCWindow.notice( {
            type: type,
            message: message,
            window: {
                width: 'medium',
                buttons: {
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                            action: function() {
                                this.close();
                            }
                        } ),
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function() {
                                this.close();
                                method( );
                            }
                        } )
                    ]
                }
            }
        } );
    }

    function BackupTime( timeValue, timeText, selected ) {
        if( typeof selected !== "boolean" ) {
            selected = false;
        }

        this.timeValue = ko.observable(timeValue);
        this.timeText = ko.observable(timeText);
        this.selected = ko.observable(selected);
    }

    function onFail( error ) {
        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
    }

    /**
     * @constructor
     * @class InBackupViewModel
     * @extends KoDisposable
     */
    function InBackupViewModel() {
        InBackupViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InBackupViewModel, KoViewModel.getDisposable(), {
        /** @private */
        initializer: function() {
            var
                self = this;

            self._initTemplate();
            self._initObservables();
            self._initInBackupViewModel();
            Y.doccirrus.DCBinder.initToggleFullScreen();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self.stopLoadPrinterQueueInterval();
        },
        /**
         * Defines template object
         * @property template
         * @type {Object}
         */
        template: null,
        /** @private */
        _initTemplate: function() {
            var
                self = this;

            self.template = {
                name: 'InBackupViewModel',
                data: self
            };
        },
        /**
         * Observable queue of printers.
         * @property printerQueue
         * @type {ko.observableArray}
         */
        printerQueue: null,
        /**
         * Observable determination if "loadPrinterQueue" is currently pending.
         * @property loadPrinterQueuePending
         * @type {ko.observable}
         */
        loadPrinterQueuePending: null,
        /**
         * Observable determination if "clearPrinterQueue" is currently pending.
         * @property loadPrinterQueuePending
         * @type {ko.observable}
         */
        clearPrinterQueuePending: null,
        /**
         * Observable determines if inBackup Plus (cloud) licence is active or not
         * @property isBackPlusLicenseActive
         * @type {ko.observable}
         */
        isBackPlusLicenseActive: null,
        /** @private */
        _initObservables: function() {
            var
                self = this;

            self.isBackPlusLicenseActive = ko.observable( Y.doccirrus.auth.hasAdditionalService( 'inBackup' ) );
        },
        toggleFullScreenHandler() {
            Y.doccirrus.DCBinder.toggleFullScreen();
        },
        /** @private */
        _initInBackupViewModel: function() {
            var
                self = this;

            self.headersHeadlineI18n = i18n( 'InBackupMojit.InBackupViewModel.headers.headline' );
            self.headersBackupI18n = i18n( 'InBackupMojit.InBackupViewModel.headers.backup' );
            self.headersDevicesI18n = i18n( 'InBackupMojit.InBackupViewModel.headers.devices' );
            self.buttonAddSMBI18n = i18n( 'InBackupMojit.InBackupViewModel.button.ADDSMB' );
            self.inbackupPlussI18n = i18n( 'InBackupMojit.InBackupViewModel.headers.inbackupPlus' );

            self._initBackupDevicesTable();
            self._initBackupStateKoTable();

            if( self.isBackPlusLicenseActive() ) {
                self._initCloudDevicesTable();
            }

            self._initNodes();
            self._initButtons();

        },
        _initNodes: function() {
            var self = this,
                mojit = document.querySelector( '.InBackupMojit' );

            self.mojitNode = mojit;
        },
        _initButtons: function() {
            var self = this;

            self.refreshTablesButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'refreshTables',
                    text: BUTTON_REFRESH,
                    option: 'PRIMARY',
                    click: function() {
                        self.refreshTables();
                    },
                    disabled: false
                }
            } );

        },
        cloudDevicesKoTable: null,
        _initCloudDevicesTable: function(  ) {
            var
                self = this;

            self.cloudDevicesKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'UserMgmtMojit-ldapBinderIndex-cloudDevicesKoTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    limit: 5,
                    columns: [
                        {
                            forPropertyName: 'id',
                            label: LABEL_DEVICE,
                            width: '33%',
                            renderer: function( meta ) {
                                var
                                    value = meta.value.toLowerCase();

                                switch( true ) {
                                    case -1 !== value.indexOf( 's3' ):
                                        return meta.row.model;
                                }

                                return null;
                            }
                        },
                        {
                            forPropertyName: 'totalSize',
                            label: LABEL_TOTAL_SIZE,
                            width: '10%',
                            renderer: function( meta ) {
                                return Y.doccirrus.comctl.bytesToSize( meta.value );
                            }
                        },
                        {
                            forPropertyName: 'state',
                            label: LABEL_STATE,
                            width: '15%',
                            renderer: function( meta ) {
                                var status = self.getDeviceStateByValue( meta.value );
                                return '<a href="#">' + status + '</a>';
                            },
                            onCellClick: function( meta, event ) {

                                var
                                    target = event.target;

                                if( 'A' !== target.tagName ) {
                                    return true;
                                }

                                self.createDeviceStateWindow();

                                return false;

                            }
                        },
                        // {
                        //     forPropertyName: 'state',
                        //     label: LABEL_SCHEDULE,
                        //     width: '7%',
                        //     css: {'text-center': true},
                        //     renderer: function( meta ) {
                        //
                        //         if( 'raw' === meta.value ) {
                        //             return null;
                        //         }
                        //
                        //         return '<a href="#"><i class="fa fa-clock-o"></i></a>';
                        //     },
                        //     onCellClick: function( meta, event ) {
                        //
                        //         var
                        //             target = event.target;
                        //
                        //         if( !target.closest( 'a' ) ) {
                        //             return true;
                        //         }
                        //
                        //         self.createBackupSchedulesModalWindow();
                        //
                        //         return false;
                        //
                        //     }
                        // },
                        {
                            forPropertyName: 'state',
                            label: LABEL_ACTION,
                            width: '35%',
                            renderer: function( meta ) {
                                var
                                    buttons = [],
                                    backupInfo = self.backupStateKoTable.data(),
                                    backupState = backupInfo && backupInfo[0] && backupInfo[0].state || false,

                                    isSMB = ( meta.row.model && 'smb://' === meta.row.model.substr( 0, 6 ) );
                                    // reInitLabel = ( ( 'raw' === meta.value ) ? BUTTON_INIT : BUTTON_REINIT ),

                                    // reInitDisabled = (
                                    //     'sync' === backupState ||
                                    //     'backup' === backupState ||
                                    //     'sync' === meta.value ||
                                    //     'blocked' === meta.value
                                    // );

                                // if ( !isSMB ) {
                                //     //  (re)init button is no longer needed for SMB backup devices MOJ-7479
                                //     buttons.push(
                                //         self.getButton( {
                                //             cliCommand: 'initBackupDevice',
                                //             text: reInitLabel,
                                //             disable: reInitDisabled
                                //         } )
                                //     );
                                // }

                                switch( meta.value ) {
                                    case 'raw':
                                        buttons.push(
                                            self.getButton( {
                                                cliCommand: 'infoBackupDevice',
                                                text: BUTTON_INFO
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'exportBackupDevice',
                                                text: BUTTON_EXPORT,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDevice',
                                                text: BUTTON_CHECK_FAST,
                                                disabled: !isSMB
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDeviceFull',
                                                text: BUTTON_CHECK,
                                                disabled: true
                                            } )
                                        );
                                        break;
                                    case 'idle':
                                        buttons.push(
                                            self.getButton( {cliCommand: 'infoBackupDevice', text: BUTTON_INFO} ),
                                            self.getButton( {
                                                cliCommand: 'exportBackupDevice',
                                                text: BUTTON_EXPORT,
                                                disabled: ('sync' === backupState || 'backup' === backupState)
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDevice',
                                                text: BUTTON_CHECK_FAST,
                                                disabled: ('sync' === backupState || 'backup' === backupState) && !isSMB
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDeviceFull',
                                                text: BUTTON_CHECK,
                                                disabled: ('sync' === backupState || 'backup' === backupState)
                                            } )
                                        );
                                        break;
                                    case 'sync':
                                        buttons.push(
                                            self.getButton( {
                                                cliCommand: 'infoBackupDevice',
                                                text: BUTTON_INFO,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'exportBackupDevice',
                                                text: BUTTON_EXPORT,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDevice',
                                                text: BUTTON_CHECK_FAST,
                                                disabled: !isSMB
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDeviceFull',
                                                text: BUTTON_CHECK,
                                                disabled: true
                                            } )
                                        );
                                        break;
                                    case 'blocked':
                                        buttons.push(
                                            self.getButton( {
                                                cliCommand: 'infoBackupDevice',
                                                text: BUTTON_INFO,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'exportBackupDevice',
                                                text: BUTTON_EXPORT,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDevice',
                                                text: BUTTON_CHECK_FAST,
                                                disabled: !isSMB
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDeviceFull',
                                                text: BUTTON_CHECK,
                                                disabled: true
                                            } )
                                        );
                                        break;
                                }

                                return buttons.join( ' ' );

                            },
                            onCellClick: self.onCellClick.bind( self )
                        }
                    ]
                }
            } );

            setTimeout( function() {
                self.refreshCloudDevicesTable();
            }, 201 );
        },
        /**
         * Table.
         * @property backupDevicesKoTable
         * @type {KoTable}
         */
        backupDevicesKoTable: null,
        _initBackupDevicesTable: function() {
            var
                self = this;

            self.backupDevicesKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'UserMgmtMojit-ldapBinderIndex-backupDevicesKoTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    limit: 5,
                    columns: [
                        {
                            forPropertyName: 'id',
                            label: LABEL_DEVICE,
                            width: '33%',
                            renderer: function( meta ) {
                                var
                                    value = meta.value.toLowerCase();

                                switch( true ) {
                                    case -1 !== value.indexOf( 'usb' ):
                                        return meta.row.model;
                                    case -1 !== value.indexOf( 'samba' ):
                                        return 'SMB';
                                    case -1 !== value.indexOf( 'cloud' ):
                                        return 'Cloud';
                                }

                                return null;
                            }
                        },
                        {
                            forPropertyName: 'totalSize',
                            label: LABEL_TOTAL_SIZE,
                            width: '10%',
                            renderer: function( meta ) {
                                return Y.doccirrus.comctl.bytesToSize( meta.value );
                            }
                        },
                        {
                            forPropertyName: 'state',
                            label: LABEL_STATE,
                            width: '15%',
                            renderer: function( meta ) {
                                var status = self.getDeviceStateByValue( meta.value );
                                return '<a href="#">' + status + '</a>';
                            },
                            onCellClick: function( meta, event ) {

                                var
                                    target = event.target;

                                if( 'A' !== target.tagName ) {
                                    return true;
                                }

                                self.createDeviceStateWindow();

                                return false;

                            }
                        },
                        {
                            forPropertyName: 'state',
                            label: LABEL_SCHEDULE,
                            width: '7%',
                            css: {'text-center': true},
                            renderer: function( meta ) {

                                if( 'raw' === meta.value ) {
                                    return null;
                                }

                                return '<a href="#"><i class="fa fa-clock-o"></i></a>';
                            },
                            onCellClick: function( meta, event ) {

                                var
                                    target = event.target;

                                if( !target.closest( 'a' ) ) {
                                    return true;
                                }

                                self.createBackupSchedulesModalWindow();

                                return false;

                            }
                        },
                        {
                            forPropertyName: 'state',
                            label: LABEL_ACTION,
                            width: '35%',
                            renderer: function( meta ) {
                                var
                                    buttons = [],
                                    backupInfo = self.backupStateKoTable.data(),
                                    backupState = backupInfo && backupInfo[0] && backupInfo[0].state || false,

                                    isSMB = ( meta.row.model && 'smb://' === meta.row.model.substr( 0, 6 ) ),
                                    reInitLabel = ( ( 'raw' === meta.value ) ? BUTTON_INIT : BUTTON_REINIT ),

                                    reInitDisabled = (
                                        'sync' === backupState ||
                                        'backup' === backupState ||
                                        'sync' === meta.value ||
                                        'blocked' === meta.value
                                    );

                                switch( meta.value ) {
                                    case 'raw':
                                        buttons.push(
                                            self.getButton( {
                                                cliCommand: 'infoBackupDevice',
                                                text: BUTTON_INFO
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'exportBackupDevice',
                                                text: BUTTON_EXPORT,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDevice',
                                                text: BUTTON_CHECK_FAST,
                                                disabled: !isSMB
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDeviceFull',
                                                text: BUTTON_CHECK,
                                                disabled: true
                                            } )
                                        );
                                        break;
                                    case 'idle':
                                        buttons.push(
                                            self.getButton( {cliCommand: 'infoBackupDevice', text: BUTTON_INFO} ),
                                            self.getButton( {
                                                cliCommand: 'exportBackupDevice',
                                                text: BUTTON_EXPORT,
                                                disabled: ('sync' === backupState || 'backup' === backupState)
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDevice',
                                                text: BUTTON_CHECK_FAST,
                                                disabled: ('sync' === backupState || 'backup' === backupState) && !isSMB
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDeviceFull',
                                                text: BUTTON_CHECK,
                                                disabled: ('sync' === backupState || 'backup' === backupState)
                                            } )
                                        );
                                        break;
                                    case 'sync':
                                        buttons.push(
                                            self.getButton( {
                                                cliCommand: 'infoBackupDevice',
                                                text: BUTTON_INFO,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'exportBackupDevice',
                                                text: BUTTON_EXPORT,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDevice',
                                                text: BUTTON_CHECK_FAST,
                                                disabled: !isSMB
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDeviceFull',
                                                text: BUTTON_CHECK,
                                                disabled: true
                                            } )
                                        );
                                        break;
                                    case 'blocked':
                                        buttons.push(
                                            self.getButton( {
                                                cliCommand: 'infoBackupDevice',
                                                text: BUTTON_INFO,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'exportBackupDevice',
                                                text: BUTTON_EXPORT,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDevice',
                                                text: BUTTON_CHECK_FAST,
                                                disabled: !isSMB
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'checkBackupDeviceFull',
                                                text: BUTTON_CHECK,
                                                disabled: true
                                            } )
                                        );
                                        break;
                                }

                                if ( !isSMB ) {
                                    //  (re)init button is no longer needed for SMB backup devices MOJ-7479
                                    buttons.push(
                                        self.getButton( {
                                            cliCommand: 'initBackupDevice',
                                            text: reInitLabel,
                                            disable: reInitDisabled
                                        } )
                                    );
                                }

                                return buttons.join( ' ' );

                            },
                            onCellClick: self.onCellClick.bind( self )
                        }
                    ]
                }
            } );

            setTimeout( function() {
                self.refreshDevicesTable();
            }, 201 );
        },

        /**
         * Table.
         * @property backupstateKoTable
         * @type {KoTable}
         */
        backupStateKoTable: null,
        _initBackupStateKoTable: function() {
            var
                self = this;

            self.backupStateKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'UserMgmtMojit-ldapBinderIndex-backupStateKoTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    limit: 5,
                    columns: [
                        {
                            label: LABEL_SIZE,
                            forPropertyName: 'size',
                            width: '32.5%',
                            renderer: function( meta ) {
                                return Y.doccirrus.comctl.bytesToSize( meta.value );
                            }
                        }, {
                            label: LABEL_STATE,
                            forPropertyName: 'state',
                            width: '24.5%',
                            renderer: function( meta ) {
                                var status;
                                switch( meta.value ) {
                                    case 'unused':
                                        status = STATE_UNUSED;
                                        break;
                                    case 'unknown':
                                        status = STATE_UNKNOWN;
                                        break;
                                    case 'idle':
                                        status = STATE_IDLE;
                                        break;
                                    case 'sync':
                                        status = STATE_SYNC;
                                        break;
                                    case 'backup':
                                        status = STATE_BACKUP;
                                        break;
                                    default:
                                        status = '';
                                }
                                return '<a href="#">' + status + '</a>';
                            },
                            onCellClick: function( meta, event ) {

                                var
                                    target = event.target;

                                if( 'A' !== target.tagName ) {
                                    return true;
                                }

                                self.createBackupStateWindow();

                                return false;

                            }
                        }, {
                            label: LABEL_DATE,
                            forPropertyName: 'points',
                            width: '7.5%',
                            css: {'text-center': true},
                            renderer: function() {
                                return '<a href="#"><i class="fa fa-clock-o"></i></a>';
                            },
                            interceptRenderOutput: function( meta, value, isTitle ) {
                                return isTitle ? BACKUP_POINTS_TITLE : meta;
                            },
                            onCellClick: function( meta, event ) {

                                var
                                    target = event.target;

                                if( !target.closest( 'a' ) ) {
                                    return true;
                                }

                                self.createBackupPointsModalWindow();

                                return false;

                            }
                        }, {
                            label: LABEL_ACTION,
                            forPropertyName: 'state',
                            width: '35.5%',
                            renderer: function( meta ) {
                                var
                                    buttons = [];

                                switch( meta.value ) {
                                    case 'unused':
                                        buttons.push(
                                            self.getButton( {cliCommand: 'initBackup', text: BUTTON_INIT} ),
                                            self.getButton( {
                                                cliCommand: 'createBackupWait',
                                                text: BUTTON_BACKUP,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'showKey',
                                                text: BUTTON_SHOW_KEY,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'configureBackupTime',
                                                text: BUTTON_SCHEDULE_BACKUP,
                                                disabled: true
                                            } )
                                        );
                                        break;
                                    case 'unknown':
                                        buttons.push(
                                            self.getButton( {
                                                cliCommand: 'initBackup',
                                                text: BUTTON_INIT,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'createBackupWait',
                                                text: BUTTON_BACKUP,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'showKey',
                                                text: BUTTON_SHOW_KEY,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'configureBackupTime',
                                                text: BUTTON_SCHEDULE_BACKUP,
                                                disabled: true
                                            } )
                                        );
                                        break;
                                    case 'idle':
                                        buttons.push(
                                            self.getButton( {cliCommand: 'reInitBackup', text: BUTTON_REINIT} ),
                                            self.getButton( {cliCommand: 'createBackupWait', text: BUTTON_BACKUP} ),
                                            self.getButton( {cliCommand: 'showKey', text: BUTTON_SHOW_KEY} ),
                                            self.getButton( {cliCommand: 'destroyBackup', text: BUTTON_REMOVE} ),
                                            self.getButton( {cliCommand: 'configureBackupTime', text: BUTTON_SCHEDULE_BACKUP} )
                                        );
                                        break;
                                    case 'sync':
                                    case 'backup':
                                        buttons.push(
                                            self.getButton( {
                                                cliCommand: 'reInitBackup',
                                                text: BUTTON_REINIT,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'createBackupWait',
                                                text: BUTTON_BACKUP,
                                                disabled: true
                                            } ),
                                            self.getButton( {cliCommand: 'showKey', text: BUTTON_SHOW_KEY} ),
                                            self.getButton( {
                                                cliCommand: 'destroyBackup',
                                                text: BUTTON_REMOVE,
                                                disabled: true
                                            } ),
                                            self.getButton( {
                                                cliCommand: 'configureBackupTime',
                                                text: BUTTON_SCHEDULE_BACKUP,
                                                disabled: true
                                            } )
                                        );
                                        break;
                                }

                                return buttons.join( '' );
                            },
                            onCellClick: self.onCellClick.bind( self )
                        }]
                }
            } );

            setTimeout( function() {
                self.refreshBackupTable();
            }, 201 );

        },

        /**
         * Update data in all tables
         * @returns {undefined}
         */
        refreshTables: function() {
            var
                self = this;

            self.refreshBackupTable();
            self.refreshDevicesTable();
            if( self.isBackPlusLicenseActive() ) {
                self.refreshCloudDevicesTable();
            }
        },
        /**
         * Update data in BackupTable
         * @returns {undefined}
         */
        refreshBackupTable: function refreshBackupTable() {
            var
                self = this,
                command = 'getFullState';

            self.handleGetFullState( {command: command} );
        },
        /**
         * Update data in DevicesTable
         * @returns {undefined}
         */
        refreshDevicesTable: function refreshBackupTable() {
            var
                self = this,
                command = 'listBackupDevices';

            self.handleListBackupDevices( {command: command} );

        },

        refreshCloudDevicesTable: function(  ) {
            var
                self = this,
                command = 'listCloudDevices';

            self.handleListCloudDevices( {command: command} );
        },

        /**
         * Run command on server
         * @param {Object} params
         * @param {String} params.command
         * @param {String} params.deviceId
         * @param {Object} data
         * @returns {Promise}
         */
        runCommand: function( params, data ) {
            var
                self = this,
                command = params.command;
            //console.log( 'starting command', command );
            return new Promise( function( resolve, reject ) {
                Y.doccirrus.communication.request( {
                    event: 'runCliCommand',
                    message: {
                        params: params,
                        data: data
                    },
                    callback: function( err, res ) {
                        if( err ) {
                            Y.log( 'Error executing command on server: ' + JSON.stringify( err ), 'warn', NAME );   //
                            return reject( err );
                        }
                        //console.log( 'success command', command, res );
                        resolve( res );
                    }
                } );
            } )
                .catch( self.handleCommandError.bind( self, command ) );
        },

        /**
         * Common cell click handler, parse params, create config and run command
         * @param {Object} meta
         * @param {Object} event
         * @returns {undefined}
         */
        onCellClick: function( meta, event ) {
            var
                self = this,
                target = event.target,
                params,
                command;

            if( !target ) {
                return true;
            }

            command = target.dataset.clicommand;

            if( !command ) {
                return true;
            }

            if( command === "initBackupDevice" ) {
                showConfirmBox("warn", i18n( 'InBackupMojit.InBackupViewModel.message.REINIT_WARN' ), function() {
                    passToCommandHandler();
                });
            } else {
                passToCommandHandler();
            }

            function passToCommandHandler() {
                params = {command: command};

                if( meta.row.id ) {
                    params.deviceId = meta.row.id;
                }

                self.handleCommand( params );
            }

            return false;
        },

        /**
         * Common response error handler. Intersepts all errors and do some stuff as notifications. Throws error further.
         * @param {String} command
         * @param {Object} error
         * @throws {Object}
         */
        handleCommandError: function( command, error ) {

            if( 8027 === error.code ) {
                throw error;
            }

            Y.doccirrus.DCSystemMessages.removeMessage( {messageId: command + 'Error'} );
            Y.doccirrus.DCSystemMessages.addMessage( {
                messageId: command + 'Error',
                content: error.data,
                level: 'WARNING'
            } );
            throw error;
        },

        // Command reponse handlers, the same mapping as on the server.

        handleListBackupDevices: function( params ) {
            var
                self = this;

            self.runCommand( params )
                .then( function( res ) {
                    if( res ) {
                        self.backupDevicesKoTable.data( res );
                    }
                } )
                .catch( function( err ) {
                    Y.log( 'Error listing backup devices: ' + JSON.stringify( err ), 'warn', NAME );
                } )
                .then( function() {
                    self.backupDevicesKoTable.masked( false );
                    self.refreshTablesButton.disabled( false );
                } );

            self.backupDevicesKoTable.masked( true );
            self.refreshTablesButton.disabled( true );

        },
        handleListCloudDevices: function( params ) {
            var
                self = this;

            self.runCommand( params )
                .then( function( res ) {
                    if( res ) {
                        self.cloudDevicesKoTable.data( res );
                    }
                } )
                .catch( function( err ) {
                    Y.log( 'Error listing cloud devices: ' + JSON.stringify( err ), 'warn', NAME );
                } )
                .then( function() {
                    self.cloudDevicesKoTable.masked( false );
                    self.refreshTablesButton.disabled( false );
                } );

            self.cloudDevicesKoTable.masked( true );
            self.refreshTablesButton.disabled( true );
        },
        handleGetFullState: function( params ) {
            var
                self = this;

            self.runCommand( params )
                .then( function( res ) {

                    if( res && res.info && res.info.length ) {
                        res.info.forEach( function( item, idx ) {
                            item.state = res.state[idx].state;
                        } );

                        return self.backupStateKoTable.data( res.info );
                    }

                    if( res && res.state ) {
                        self.backupStateKoTable.data( res.state );
                    }

                } )
                .catch( function() {
                } )
                .then( function() {
                    self.backupStateKoTable.masked( false );
                    self.refreshTablesButton.disabled( false );
                } );

            self.backupStateKoTable.masked( true );
            self.refreshTablesButton.disabled( true );

        },
        handleInfoBackupDevice: function( params ) {
            var
                self = this,
                info;

            self.runCommand( params )
                .then( function( res ) {
                    if( !res && !res[0] ) {
                        return;
                    }

                    info = res[0];

                    if( !self.deviceModel ) {
                        self.initInfoDeviceModel();
                    }
                    self.deviceModel.setData( info );
                    self.createDeviceInfoModal( info );
                } )
                .catch( function() {
                } )
                .then( function() {
                    Y.doccirrus.utils.hideLoadingMask( self.mojitNode );
                } );

            Y.doccirrus.utils.showLoadingMask( self.mojitNode );

        },
        handleGetBackupState: function( /* params */ ) {
            //console.log( params );
        },
        handleGetBackupInfo: function( /* params */ ) {
            //console.log( params );
        },
        handleShowKey: function( params ) {
            var
                self = this,
                win = window.open( '/static/DocCirrus/assets/images/ajax-loader.gif', '_blank' );

            self.runCommand( params )
                .then( function( res ) {
                    if( !res || !res.tempUrl ) {
                        return;
                    }
                    if( win && win.location ) {
                        win.location = res.tempUrl;
                    } else {
                        window.location = res.tempUrl;
                    }
                } )
                .catch( function() {
                } )
                .then( function() {
                    Y.doccirrus.utils.hideLoadingMask( self.mojitNode );
                } );

            Y.doccirrus.utils.showLoadingMask( self.mojitNode );

        },
        handleInitBackup: function( params ) {
            var
                self = this;

            self.runCommand( params )
                .then( function() {
                    self.refreshTables();
                } )
                .catch( function() {
                } )
                .then( function() {
                    Y.doccirrus.utils.hideLoadingMask( self.mojitNode );
                } );

            Y.doccirrus.utils.showLoadingMask( self.mojitNode );

        },
        handleReInitBackup: function( params ) {
            var
                self = this;

            self.runCommand( params )
                .then( function() {
                    self.refreshTables();
                } )
                .catch( function() {
                } )
                .then( function() {
                    Y.doccirrus.utils.hideLoadingMask( self.mojitNode );
                } );

            Y.doccirrus.utils.showLoadingMask( self.mojitNode );
        },
        handleInitBackupDevice: function( params ) {
            var
                self = this;

            self.runCommand( params )
                .then( function() {
                    self.refreshTables();
                } )
                .catch( function() {
                } )
                .then( function() {
                    Y.doccirrus.utils.hideLoadingMask( self.mojitNode );
                } );

            Y.doccirrus.utils.showLoadingMask( self.mojitNode );
        },
        handleCreateBackupWait: function( params ) {
            var
                self = this;

            Y.doccirrus.utils.showLoadingMask( self.mojitNode );

            self.runCommand( params )
                .then( function() {
                    self.refreshTables();
                } )
                .catch( function() {
                } );

            self.setBackupState( 'backup' );
            Y.doccirrus.utils.hideLoadingMask( self.mojitNode );

        },
        handleDestroyBackup: function( params ) {

            var
                self = this;

            self.runCommand( params )
                .then( function() {
                    self.refreshTables();
                } )
                .catch( function() {
                } )
                .then( function() {
                    Y.doccirrus.utils.hideLoadingMask( self.mojitNode );
                } );

            Y.doccirrus.utils.showLoadingMask( self.mojitNode );

        },
        handleCheckBackupDevice: function( params ) {
            var self = this;

            self.setDeviceState( 'blocked', params.deviceId );
            self.runCommand( params )
                .catch( function() {
                } )
                .then( function() {
                    if( params.deviceId === "s3" && self.isBackPlusLicenseActive() ) {
                        self.refreshCloudDevicesTable();
                    } else {
                        self.refreshDevicesTable();
                    }
                } );

        },
        handleCheckBackupDeviceFull: function( params ) {
            var self = this;

            self.setDeviceState( 'blocked', params.deviceId );
            self.runCommand( params )
                .catch( function() {
                } )
                .then( function() {
                    if( params.deviceId === "s3" && self.isBackPlusLicenseActive() ) {
                        self.refreshCloudDevicesTable();
                    } else {
                        self.refreshDevicesTable();
                    }
                } );

        },
        handleExportBackupDevice: function( params ) {
            var self = this;

            self.setDeviceState( 'blocked', params.deviceId );
            self.runCommand( params )
                .catch( function() {
                } )
                .then( function() {
                    if( params.deviceId === "s3" && self.isBackPlusLicenseActive() ) {
                        self.refreshCloudDevicesTable();
                    } else {
                        self.refreshDevicesTable();
                    }
                } );

        },
        handleExportBackupDeviceWait: function( /* params */ ) {
            //console.log( params );
        },
        handleImportBackupDevice: function() {
        },

        handleConfigureBackupTime: function() {
            var self = this;

            Y.doccirrus.jsonrpc.api.admin.getConfiguredDatasafeBackupJob( {} )
            .then( function( result ) {
                if( result && result.data && result.data.cronTimeHoursInDay && result.data.cronTimeHoursInDay.length ) {
                    if( !self.configureBackupTimeModel ) {
                        self.initBackupTimeConfigureViewModel();
                    }

                    self.configureBackupTimeModel.setData(result.data.cronTimeHoursInDay);
                    self.createBackupTimeConfigModal();
                } else {
                    onFail({message: "INVALID_RESULT"});
                }
            } )
            .fail( function( err ) {
                if( typeof err === "string" ) {
                    if( err === "NO_RECORD_FOUND" ) {
                        err = {message: i18n( 'InBackupMojit.InBackupViewModel.message.BACKUP_CRONJOB_DETAILS_NOT_FOUND' )};
                    } else {
                        err = {message : err};
                    }
                } else {
                    err = {message: i18n('InBackupMojit.InBackupViewModel.message.BACKUP_CRONJOB_FETCH_ERROR')};
                }
                onFail(err);
            } );
        },

        createBackupTimeConfigModal: function() {
            var
                self = this,
                node = Y.Node.create( '<div></div>' ),
                modal,
                saveBtn;

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'backupConfigEditorModal',
                'InBackupMojit',
                {},
                node,
                function() {
                    modal = self.createModal( BUTTON_SCHEDULE_BACKUP, node, 'backupTimeConfigModal', [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                        Y.doccirrus.DCWindow.getButton( 'SAVE', {
                            isDefault: true,
                            action: function() {
                                var selectedHours = self.configureBackupTimeModel.getSelectedTime();

                                saveBtn.disable();

                                Y.doccirrus.communication.apiCall( {
                                    method: 'admin.setDatasafeBackupTime',
                                    data: {
                                        selectedBackupHours: selectedHours
                                    }
                                }, function( err ) {
                                    saveBtn.enable();

                                    if(err) {
                                        onFail(err);
                                    } else {
                                        modal.close();
                                    }
                                } );
                            }
                        } )
                    ], '50%' );

                    saveBtn = modal.getButton( 'SAVE' ).button;

                    ko.computed( function() {
                        if( self.configureBackupTimeModel.getSelectedTime().length ) {
                            saveBtn.enable();
                        } else {
                            saveBtn.disable();
                        }
                    } );

                    ko.applyBindings( self.configureBackupTimeModel, node.one( '#backupConfigEditorModal' ).getDOMNode() );
                }
            );
        },

        initBackupTimeConfigureViewModel: function() {
            var
                self = this;

            /*
            * configureBackupTimeModel = {
            *   data: <Object>,
            *   setData: <Function>,
            *   getSelectedTime: <Function>
            * }
            * */
            self.configureBackupTimeModel = {
                data: {
                    availableBackupTimes: ko.observableArray(),
                    selectedBackupTimes: ko.observableArray()
                },
                availableBackupTimesCss: null,
                /*
                * 1] savedTimeArr is [Number, ...] ex. savedTimeArr = [6,11,15]
                * 2] Generate backupTimeData using savedTimeArr
                * 3] Clear availableBackupTimes and selectedBackupTimes
                * 4] opulate availableBackupTimes and selectedBackupTimes again using backupTimeData
                * */
                setData: function( savedTimeArr ) {
                    /*
                    * Helper function which converts timeVal to clock text
                    *
                    * E.X:
                    * If timeVal = 9
                    * return "09:00"
                    * */
                    function getTimeText( timeVal ) {
                        if( (timeVal+"").length === 1 ) {
                            return "0"+timeVal+":00";
                        } else {
                            return timeVal+":00";
                        }
                    }

                    // ------------------ 1. Populate backupTimeData with timeObjects ------------------------
                    /*
                    * We are populating backupTimeData as below:
                    *
                    * backupTimeData = [
                    *   {timeValue: <Number ex. 6>, timetext: <String ex. '06:00'>, selected: <boolean>},
                    *   ....
                    * ]
                    * */
                    var backupTimeData = [], groupedbackupTimeArr = [];

                    availableBackupTimes.forEach( function( time ) {
                        if( savedTimeArr.indexOf(time) !== -1 ) {
                            backupTimeData.push({timeValue: time, timeText: getTimeText(time), selected: true});
                        } else {
                            backupTimeData.push({timeValue: time, timeText: getTimeText(time), selected: false});
                        }
                    } );
                    // ----------------- 1. END -------------------------------------------------------------


                    // ------------------ 2. clear what was previously there in Array -----------------------
                    self.configureBackupTimeModel.data.availableBackupTimes([]);
                    self.configureBackupTimeModel.data.selectedBackupTimes([]);
                    // ------------------ 2. END ------------------------------------------------------------


                    // ------------------ 3. Populate availableBackupTimes and selectedBackupTimes ObservableArray using backupTimeData ------
                    backupTimeData.forEach( function( timeObj, index ) {
                        groupedbackupTimeArr.push( new BackupTime(timeObj.timeValue, timeObj.timeText, timeObj.selected) );

                        if( ((index + 1) % 3) === 0 ) {
                            self.configureBackupTimeModel.data.availableBackupTimes.push(groupedbackupTimeArr);
                            groupedbackupTimeArr = [];
                        }

                        if( timeObj.selected ) {
                            self.configureBackupTimeModel.data.selectedBackupTimes.push(timeObj.timeValue);
                        }
                    } );
                    self.configureBackupTimeModel.availableBackupTimesCss = peek(self.configureBackupTimeModel.data.availableBackupTimes).map( function(){
                        return '1fr';
                    }).join(' ');
                    // ----------------- 3. END ------------------------------------------------------------------------------------------
                },
                getSelectedTime: function() {
                    return self.configureBackupTimeModel.data.selectedBackupTimes();
                },
                bacupTimeSectionI18n: i18n('InBackupMojit.InBackupViewModel.text.BACKUP_TIME_SELECTION')
            };
        },

        /**
         * Set state in backup table and rerender it.
         * Optimistic update to change state w/o response waiting and disable/enable some buttons.
         * @return {undefined}
         */
        setBackupState: function( state ) {
            var
                self = this,
                backupData,
                devicesData;

            backupData = self.backupStateKoTable.data();
            devicesData = self.backupDevicesKoTable.data();

            backupData = lodash.assign( {}, backupData[0] );
            backupData.state = state;
            self.backupStateKoTable.data( [backupData] );
            self.backupDevicesKoTable.data( devicesData );

            if( self.isBackPlusLicenseActive() ) {
                self.cloudDevicesKoTable.data( self.cloudDevicesKoTable.data() );
            }
        },

        /**
         * Set state in device table and rerender it.
         * Optimistic update to change state w/o response waiting and disable/enable some buttons.
         * @return {undefined}
         */
        setDeviceState: function( state, deviceId ) {
            var
                self = this,
                backupData,
                devicesData,
                newDevicesData,
                cloudDevicesData,
                newCloudDevicesData;

            devicesData = self.backupDevicesKoTable.data();
            backupData = self.backupStateKoTable.data();

            newDevicesData = devicesData.map( function( item ) {
                if( item.id !== deviceId ) {
                    return item;
                }

                var newItem = lodash.assign( {}, item );
                newItem.state = state;
                return newItem;
            } );

            self.backupDevicesKoTable.data( newDevicesData );

            if( self.isBackPlusLicenseActive() ) {
                cloudDevicesData = self.cloudDevicesKoTable.data();

                newCloudDevicesData = cloudDevicesData.map( function( item ) {
                    if( item.id !== deviceId ) {
                        return item;
                    }

                    var newItem = lodash.assign( {}, item );
                    newItem.state = state;
                    return newItem;
                } );

                self.cloudDevicesKoTable.data( newCloudDevicesData );
            }

            self.backupStateKoTable.data( backupData );
        },

        /**
         * Enable devices and state butons.
         * @return {undefined}
         */
        enableCliButtons: function() {
            var buttons = document.querySelectorAll( 'button[data-clicommand]' );

            buttons.forEach( function( b ) {
                b.disabled = false;
            } );

        },

        /**
         * Disable devices and state butons.
         * @return {undefined}
         */
        disableCliButtons: function() {
            var buttons = document.querySelectorAll( 'button[data-clicommand]' );

            buttons.forEach( function( b ) {
                b.disabled = true;
            } );

        },

        /**
         * Handle command from commands map
         * @param {Object} command parameters
         * @returns {undefined}
         */
        handleCommand: function( params ) {
            var
                self = this,
                handler = 'handle' + params.command[0].toUpperCase() + params.command.slice( 1 );

            if( !self[handler] ) {
                return;
            }

            self[handler]( params );
        },

        createBackupSchedulesModalWindow: function() {

            var
                self = this;

            self.createModal(
                DEVICE_SCHEDULES_TITLE,
                '<ul>' + DEVICE_SCHEDULES_BODY.split( '\n' ).map( function(s){ return '<li>' + s + '</li>';} ).join( '' ) + '</ul>'
            );

        },

        /**
         * Creates device info modal
         * @param info {Object} device info
         * @returns {undefined}
         */
        createDeviceInfoModal: function( info ) {

            var
                self = this,
                node = Y.Node.create( '<div></div>' );

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'deviceInfoModal',
                'InBackupMojit',
                {},
                node,
                function() {
                    self.createModal( BUTTON_INFO + ' ' + info.model, node );
                    ko.applyBindings( self.deviceModel, node.one( '#deviceInfoModel' ).getDOMNode() );
                }
            );

        },

        /**
         * Creates smb config modal
         * @returns {undefined}
         */
        createSmbConfigModal: function() {

            var
                self = this,
                node = Y.Node.create( '<div></div>' ),
                modal,
                saveBtn;

            self.initSmbEditor();
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'smbConfigEditorModal',
                'InBackupMojit',
                {},
                node,
                function() {

                    modal = self.createModal( BUTTON_ADDSMB, node, 'smbConfigModal', [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                        Y.doccirrus.DCWindow.getButton( 'REMOVE', {
                            label: BUTTON_REMOVE,
                            action: function() {

                                return self.runCommand( {command: 'removeSmbConfig'} )
                                    .then( function() {
                                        self.smbEditor.setData( {} );
                                        modal.close();
                                    } )
                                    .catch( function() {
                                    } )
                                    .then( function() {
                                        self.refreshTables();
                                    } );

                            }
                        } ),
                        Y.doccirrus.DCWindow.getButton( 'SAVE', {
                            isDefault: true,
                            action: function() {
                                var data = self.smbEditor.toJS();
                                saveBtn.disable();

                                return self.runCommand( {command: 'addSmbConfig'}, data )
                                    .then( function( config ) {
                                        self.smbEditor.setData( config );
                                        saveBtn.enable();
                                        modal.close();
                                    } )
                                    .catch( function() {
                                        saveBtn.enable();
                                    } )
                                    .then( function() {
                                        self.refreshTables();
                                    } );
                            }
                        } )
                    ] );

                    saveBtn = modal.getButton( 'SAVE' ).button;

                    ko.computed( function() {
                        if( self.smbEditor.data.isValid() ) {
                            saveBtn.enable();
                        } else {
                            saveBtn.disable();
                        }
                    } );

                    ko.applyBindings( self.initSmbEditor(), node.one( '#smbConfigEditorModel' ).getDOMNode() );
                }
            );

        },

        /**
         * Creates an model for device info modal
         * @returns {Object}
         */
        initInfoDeviceModel: function() {
            var
                self = this;

            self.deviceModel = {};

            self.deviceModel.data = {
                freeSize: ko.observable(),
                totalSize: ko.observable(),
                id: ko.observable(),
                model: ko.observable(),
                points: ko.observable(),
                state: ko.observable(),
                labelStateI18n: i18n( 'InBackupMojit.InBackupViewModel.label.STATE' ),
                labelDeviceI18n: i18n( 'InBackupMojit.InBackupViewModel.label.DEVICE' ),
                labelFreeSizeI18n: i18n( 'InBackupMojit.InBackupViewModel.label.FREE_SIZE' ),
                labelTotalSizeI18n: i18n( 'InBackupMojit.InBackupViewModel.label.TOTAL_SIZE' ),
                labelBacupPointsTitleI18n: i18n( 'InBackupMojit.InBackupViewModel.text.BACKUP_POINTS_TITLE' )
            };

            self.deviceModel.setData = function( data ) {
                self.deviceModel.data.freeSize( Y.doccirrus.comctl.bytesToSize( data.freeSize ) );
                self.deviceModel.data.totalSize( Y.doccirrus.comctl.bytesToSize( data.totalSize ) );
                self.deviceModel.data.id( data.id );
                self.deviceModel.data.model( data.model );
                self.deviceModel.data.points( data.points.map( function( point, index, pointsArr) {
                    return {
                        date: moment( pointsArr[pointsArr.length - index - 1].date ).format( 'DD.MM.YYYY HH:mm' )
                    };
                } ) );
                self.deviceModel.data.state( self.getDeviceStateByValue( data.state ) );
            };

            return self.deviceModel;

        },

        /**
         * Creates an editor for smb config
         * @returns {Object}
         */
        initSmbEditor: function() {
            var
                self = this;

            if( self.smbEditor ) {
                self.smbEditor.setData(self.setSmbConfiguration);
                return self.smbEditor;
            }

            self.smbEditor = Object.create( {
                toJS: function() {
                    var data = ko.toJS( self.smbEditor.data );
                    return data;
                },
                setData: function( config ) {
                    self.setSmbConfiguration = config;
                    self.smbEditor.data.backupSmbHost( config.backupSmbHost );
                    self.smbEditor.data.backupSmbPort( config.backupSmbPort || 445 );
                    self.smbEditor.data.backupSmbPath( config.backupSmbPath );
                    self.smbEditor.data.backupSmbLogin( config.backupSmbLogin );
                    self.smbEditor.data.backupSmbPassword( config.backupSmbPassword );
                    self.smbEditor.data.backupSmbDomain( config.backupSmbDomain );
                }
            } );

            self.smbEditor.data = {
                backupSmbHost: ko.observable(),
                backupSmbPort: ko.observable(),
                backupSmbPath: ko.observable(),
                backupSmbLogin: ko.observable(),
                backupSmbPassword: ko.observable(),
                backupSmbDomain: ko.observable(),
                smbHostI18n: i18n( 'InBackupMojit.InBackupViewModel.text.SMB_HOST' ),
                smbPortI18n: i18n( 'InBackupMojit.InBackupViewModel.text.SMB_PORT' ),
                smbPathI18n: i18n( 'InBackupMojit.InBackupViewModel.text.SMB_PATH' ),
                smbLoginI18n: i18n( 'InBackupMojit.InBackupViewModel.text.SMB_LOGIN' ),
                smbPasswordI18n: i18n( 'InBackupMojit.InBackupViewModel.text.SMB_PASSWORD' ),
                smbDomainI18n: i18n( 'InBackupMojit.InBackupViewModel.text.SMB_DOMAIN' )
            };

            self.runCommand( {command: 'getSmbConfig'} )
                .then( function( res ) {

                    var config = res[0];

                    self.smbEditor.setData( config );

                } )
                .catch( function( err ) {
                    Y.log('Error running command: ' + JSON.stringify( err ), 'warn', NAME );
                } );

            setValidationRules( self.smbEditor.data, {
                backupSmbHost: mandatory,
                backupSmbPort: mandatory,
                backupSmbPath: mandatory
            } );

            return self.smbEditor;
        },

        createBackupPointsModalWindow: function() {

            var
                self = this,
                backupPoints = self.backupStateKoTable.rows()[0].points || null;

            if( !backupPoints || !backupPoints.length ) {
                return null;
            }

            backupPoints = backupPoints
                .sort( function( a, b ) {
                    return new Date( b.date ) - new Date( a.date );
                } )
                .map( function( point ) {
                    return '<li>' + moment( point.date ).format( 'DD.MM.YYYY HH:mm' ) + '</li>';
                } );

            self.createModal( BACKUP_POINTS_TITLE, '<ul>' + backupPoints.join( '' ) + '</ul>' );

        },

        createBackupStateWindow: function() {
            var
                self = this;

            self.createModal( BACKUP_STATES_TITLE, BACKUP_STATES_BODY.split( '\n' ).join( '<br>' ) );

        },

        createDeviceStateWindow: function() {
            var
                self = this;

            self.createModal( DEVICE_STATES_TITLE, DEVICE_STATES_BODY.split( '\n' ).join( '<br>' ) );
        },

        /**
         * Wrapper for creating modals
         * @param title     {String}    modal window title
         * @param content   {String}    content
         * @param id        {id}        element id
         * @param footer    {Object}    modal footer buttons
         * @returns         {Object}
         */
        createModal: function( title, content, id, footer, modalHeight ) {
            return new Y.doccirrus.DCWindow( {// jshint ignore:line
                id: id,
                title: title,
                width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                bodyContent: content,
                icon: Y.doccirrus.DCWindow.ICON_INFO,
                render: document.body,
                maximizable: true,
                modal: true,
                height: modalHeight || '80%',
                visible: true,
                centered: true,
                buttons: {
                    header: ['close', 'maximize'],
                    footer: footer
                }
            } );
        },

        /**
         * Create button ready to append in table cell
         * @param {Object} button config
         * @param {String} config.cliCommand
         * @param {String} config.className
         * @param {Boolean} config.disabled
         * @param {String} config.text
         * @returns {Object}
         */
        getButton: function( config ) {
            var button = '<button data-clicommand="';

            button += config.cliCommand || '';

            button += '" style="margin-left: 5px; margin-top: 2px;" class="btn btn-xs btn-primary ';

            button += config.className || '';

            button = button.trim();

            button += config.disabled ? '" disabled>' : '">';

            button += config.text || '';

            button += '</button>';

            return button;
        },

        /**
         * Return localized value by state
         * @param   {String} value
         * @returns {String}
         */
        getDeviceStateByValue: function( value ) {
            var status;
            switch( value ) {
                case 'raw':
                    status = STATE_RAW;
                    break;
                case 'idle':
                    status = STATE_IDLE;
                    break;
                case 'sync':
                    status = STATE_SYNC;
                    break;
                case 'blocked':
                    status = STATE_BLOCKED;
                    break;
                default:
                    status = '';
            }

            return status;
        }

    }, {
        NAME: 'InBackupViewModel',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( InBackupViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'KoUI-all',
        'DCSystemMessages',
        'dccommunication-client',
        'DCWindow',
        'dc-comctl'
    ]
} );
