/*global YUI, YUI_config, _ */

'use strict';

YUI.add( 'ItemsTabFactory', function( Y, NAME ) {

    var
        i18n = Y.doccirrus.i18n,
        practiceCountryMode = YUI_config.doccirrus.Env.countryMode;

    function ItemsTabFactory() {

    }

    ItemsTabFactory.prototype.createTransferNavItems = function( options ) {
        var
            rootPath = options.rootPath;

        return [
            {
                text: i18n( 'PatientTransferMojit.tabs.received' ),
                name: 'tab_transfers_received',
                href: rootPath + '#/received'
            },
            {
                text: i18n( 'PatientTransferMojit.tabs.sent' ),
                name: 'tab_transfers_sent',
                href: rootPath + '#/sent'
            },

            {
                text: i18n( 'PatientTransferMojit.tabs.new_message' ),
                name: 'tab_new_message',
                href: rootPath + '#/newMessage'
            }
        ];
    };

    ItemsTabFactory.prototype.createInPacsAdminNavItems = function( options ) {
        var
            rootPath = options.rootPath;

        return Y.doccirrus.schemas.inpacsworklist.types.WorkListType_E.list.map( function( modality ) {
            return {
                text: modality.i18n,
                name: 'tab_inpacs_worklist_' + modality.val.toLowerCase(),
                href: rootPath + '#/' + modality.val.toLowerCase(),
                title: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.' + modality.val + '.title' )
            };
        } ).concat( {
            text: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.SETTINGS' ),
            name: 'tab_inpacs_settings',
            href: rootPath + '#/settings'
        } ).concat( {
            text: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.LUA_SCRIPTS' ),
            name: 'tab_inpacs_luascripts',
            href: rootPath + '#/luascripts'
        } ).concat( {
            text: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.LOGFILE' ),
            name: 'tab_inpacs_log',
            href: rootPath + '#/log'
        } );
    };

    ItemsTabFactory.prototype.createInCaseNavItems = function( options ) {

        var
            rootPath = options.rootPath,
            items = [
            {
                text: i18n( 'InCaseMojit.casefile_navJS.menu.PATIENTS' ),
                name: 'tab_patientBrowser',
                href: rootPath + '#/patientbrowser'
            },
            {
                text: i18n( 'InCaseMojit.casefile_navJS.menu.REPORTS' ),
                name: 'tab_reports',
                href: rootPath + '#/reports'
            },
            {
                text: i18n( 'InCaseMojit.casefile_navJS.menu.tab_apkInProgress' ),
                name: 'tab_apkInProgress',
                href: rootPath + '#/apkinprogress'
            }
        ];
        if( Y.doccirrus.auth.hasTelematikServices('KIM') ) {
            items.push(
                {
                    text: i18n( 'InCaseMojit.casefile_navJS.menu.tab_kim' ),
                    name: 'tab_kim',
                    href: rootPath + '#/kim'
                } );
        }
        if( Y.doccirrus.auth.hasTelematikServices('VSDM') ) {
            items.splice(2,0,{
                    text: i18n( 'InCaseMojit.casefile_navJS.menu.tab_withoutCardRead' ),
                    name: 'tab_withoutCardRead',
                    href: rootPath + '#/withoutcardread',
                    countryMode: ['D']
                });
        }
        return items;
    };

    ItemsTabFactory.prototype.createInvoiceNavItems = function( options ) {
        var
            rootPath = options.rootPath,
            navItems = [],
            hasASV = options.hasASV,
            hasInVoice = options.hasInVoice,
            hasEDocs = options.hasEDocs,
            isVPRCAdmin = options.isVPRCAdmin;

        if( isVPRCAdmin ) {
            navItems.push( {
                name: 'billing',
                href: rootPath + '#/billing',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.BILLING' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.billing' ) || !Y.doccirrus.auth.isMVPRC()
            } );
            return navItems;
        }

        if( hasInVoice || hasASV ) {
            navItems.push( {
                name: 'gkv_browser',
                href: rootPath + '#/gkv',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.GKV' ) + (hasASV && !hasInVoice ? ' (ASV)' : ''),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_browser' ),
                countryMode: ['D']
            } );
        }

        if( hasASV ) {
            navItems.push( {
                name: 'asv_browser',
                href: rootPath + '#/asv',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.ASV' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.asv_browser' ),
                countryMode: ['D']
            } );
        }

        if( hasInVoice ) {
            [].push.apply( navItems, [
                {
                    name: 'kvg_browser',
                    href: rootPath + '#/tarmed',
                    text: i18n( 'InvoiceMojit.invoice_navJS.menu.KVG' ),
                    disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.kvg_browser' ),
                    countryMode: ['CH']
                },
                {
                    name: 'pvs_browser',
                    href: rootPath + '#/pvs',
                    text: i18n( 'InvoiceMojit.invoice_navJS.menu.PVS' ),
                    countryMode: ['D']
                },
                {
                    name: 'cashlog',
                    href: rootPath + '#/cashlog',
                    text: i18n( 'InvoiceMojit.invoice_navJS.menu.CASH' ),
                    disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.cashbook' ),
                    countryMode: ['D']
                },
                {
                    name: 'cashbook',
                    href: rootPath + '#/cashbook',
                    text: i18n( 'InvoiceMojit.invoice_navJS.menu.INVOICE_BOOK' ),
                    disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.cashbook' )
                }
            ] );
        }

        if( Y.doccirrus.auth.hasAdditionalService( 'inCash' ) ){
            navItems.push( {
                name: 'receiptsbook',
                href: rootPath + '#/receiptsbook',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.INCASH_BOOK' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.cashbook' ),
                countryMode: ['D', 'CH']
            } );
        }

        if( hasInVoice ) {
            [].push.apply( navItems, [
                {
                    name: 'rlv_browser',
                    href: rootPath + '#/rlv',
                    text: i18n( 'InvoiceMojit.invoice_navJS.menu.RLV' ),
                    disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.rlv' ),
                    countryMode: ['D']
                },
                {
                    name: 'med_budget',
                    href: rootPath + '#/medication-budget',
                    text: i18n( 'InvoiceMojit.invoice_navJS.menu.MED_BUDGET' ),
                    disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.med_budget' ),
                    countryMode: ['D']
                },
                {
                    name: 'ut_budget',
                    href: rootPath + '#/utility-budget',
                    text: i18n( 'InvoiceMojit.invoice_navJS.menu.UT_BUDGET' ),
                    disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.ut_budget' ),
                    countryMode: ['D']
                },
                {
                    name: 'reports',
                    href: rootPath + '#/reports',
                    text: i18n( 'InvoiceMojit.invoice_navJS.menu.REPORTS' ),
                    disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.reports' )
                },
                {
                    name: 'quarterlyReports',
                    href: rootPath + '#/quarterlyReports',
                    text: i18n( 'InvoiceMojit.invoice_navJS.menu.QUARTERLY_REPORTS' ),
                    disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.general_settings' ),
                    countryMode: ['D']
                },
                {
                    name: 'pkvQuarterlyReports',
                    href: rootPath + '#/pkvQuarterlyReports',
                    text: i18n( 'InvoiceMojit.invoice_navJS.menu.PKV_QUARTERLY_REPORTS' ),
                    disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.general_settings' ),
                    countryMode: ['D']
                }
            ] );
        }

        if( hasEDocs ) {
            navItems.push( {
                name: 'edmp_browser',
                href: rootPath + '#/eDocumentations',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.EDOCS' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.edmp_browser' ),
                countryMode: ['D']
            } );
        }
        return navItems;
    };

    ItemsTabFactory.prototype.createTaskNavItems = function( options ) {
        var
            rootPath = options.rootPath,
            activateOverview = options.activateOverview,
            routes = [];
        routes = routes.concat( [
            {
                name: 'tab_tasks_active',
                href: rootPath + '#/active',
                text: i18n( 'TaskMojit.tabs.ACTIVE_TASKS' )
            },
            {
                name: 'tab_tasks_closed',
                href: rootPath + '#/completed',
                text: i18n( 'TaskMojit.tabs.CLOSED_TASKS' )
            }
        ]);
        if( activateOverview ) {
            routes.push( {
                name: 'tab_tasks_graphic',
                href: rootPath + '#/graphic',
                text: i18n( 'TaskMojit.tabs.OVERVIEW' )
            } );
        }
        return routes;
    };

    ItemsTabFactory.prototype.createCalendarNavItems = function( options ) {
        var
            auth = Y.doccirrus.auth,
            rootPath = options.rootPath,
            items = [
                {
                    name: 'tab_calendar',
                    href: rootPath + '#/calendar',
                    text: i18n( 'CalendarMojit.calendar.menu.CALENDAR' )
                },
                {
                    name: 'tab_waiting-list',
                    href: rootPath + '#/waiting-list',
                    text: i18n( 'CalendarMojit.calendar.menu.WAITING_LIST' )
                },
                {
                    name: 'tab_called-list',
                    href: rootPath + '#/called-list',
                    text: i18n( 'CalendarMojit.calendar.menu.CALL_UP_LIST' )
                },
                {
                    name: 'tab_graphic-waiting-list',
                    href: rootPath + '#/graphic-waiting-list',
                    text: i18n( 'CalendarMojit.calendar.menu.ROOMS' )
                },
                {
                    name: 'tab_reports',
                    href: rootPath + '#/reports',
                    text: i18n( 'CalendarMojit.calendar.menu.REPORTS' )
                }
            ];

        if (auth && auth.isSolsSupported() && auth.hasLicense('solutions', 'infusion') && _.some(auth.getAppRegs(), { 'appName': 'infusion', 'hasAccess': true })) {
            items.push({
                name: 'tab_resources',
                href: rootPath + '#/resources',
                text: i18n( 'CalendarMojit.calendar.menu.RESOURCES' )
            });
        }
        return items;
    };

    ItemsTabFactory.prototype.createInSetupNavItems = function() {
        var
            rootPath = Y.doccirrus.utils.getUrl( 'insetup' ),
            items = [
                {
                    name: 'tab_calendar',
                    href: rootPath + '#/import_export_text_blocks',
                    text: i18n( 'InSetupMojit.text_blocks.i18n' )
                }
            ];
        return items;
    };

    ItemsTabFactory.prototype.createInSight2AdminNavItems = function() {
        var rootPath = Y.doccirrus.utils.getUrl( 'insight' );
        return (function() {
            var items = [];

            if( Y.doccirrus.auth.isDOQUVIDE() ) {
                items.push(
                    {
                        text: 'Eigene Reports',
                        name: 'myreports',
                        href: rootPath + '#/myreports',
                        disabled: !Y.doccirrus.auth.hasSectionAccess( 'InSight2Mojit.myreports' )
                    },
                    {
                        text: 'Liste der Attribute',
                        name: 'infotab',
                        href: rootPath + '#/infotab',
                        disabled: !Y.doccirrus.auth.hasSectionAccess( 'InSight2Mojit.infotab' )
                    },
                    {
                        text: 'Import/Export',
                        name: 'importExportTab',
                        href: rootPath + '#/import_export',
                        disabled: !Y.doccirrus.auth.hasSectionAccess( 'InSight2Mojit.import_export' )
                    },
                    {
                        text: 'Einstellungen',
                        name: 'settings',
                        href: rootPath + '#/settings',
                        disabled: !Y.doccirrus.auth.hasSectionAccess( 'InSight2Mojit.settings' )
                    }
                );
            } else {
                items.push(
                    {
                        text: i18n( 'InSight2Mojit.insuiteadmin.menuitem.STANDARTREPORTS' ),
                        name: 'standardreports',
                        href: rootPath + '#/standard-reports',
                        disabled: !Y.doccirrus.auth.hasSectionAccess( 'InSight2Mojit.standard-reports' )
                    },
                    {
                        text: i18n( 'InSight2Mojit.insuiteadmin.menuitem.ANALYSISTAB' ),
                        name: 'analysistab',
                        href: rootPath + '#/analysis',
                        disabled: !Y.doccirrus.auth.hasSectionAccess( 'InSight2Mojit.analysis' )
                    },
                    {
                        text: i18n( 'InSight2Mojit.insuiteadmin.menuitem.MYREPORTS'),
                        name: 'myreports',
                        href: rootPath + '#/myreports',
                        disabled: !Y.doccirrus.auth.hasSectionAccess( 'InSight2Mojit.myreports' )
                    },
                    {
                        text: i18n( 'InSight2Mojit.insuiteadmin.menuitem.INFOTAB'),
                        name: 'infotab',
                        href: rootPath + '#/infotab',
                        disabled: !Y.doccirrus.auth.hasSectionAccess( 'InSight2Mojit.infotab' )
                    },
                    {
                        text: i18n( 'InSight2Mojit.insuiteadmin.menuitem.IMPORTEXPORTTAB' ),
                        name: 'importExportTab',
                        href: rootPath + '#/import_export',
                        disabled: !Y.doccirrus.auth.hasSectionAccess( 'InSight2Mojit.import_export' )
                    },
                    {
                        text: i18n( 'InSight2Mojit.insuiteadmin.menuitem.SETTINGS' ),
                        name: 'settings',
                        href: rootPath + '#/settings',
                        disabled: !Y.doccirrus.auth.hasSectionAccess( 'InSight2Mojit.settings' )
                    }
                );
            }
            return items;

        })();
    };

    ItemsTabFactory.prototype.createInPortAdminNavItems = function( options ) {
        var rootPath = options.rootPath;
        return [
            {
                name: JSON.parse(localStorage.getItem('isCrManagerSwitched')) ? 'tab_cardreader' : 'tab_cardreader_old',
                href: rootPath + '#/cardreader',
                text: i18n( 'DeviceMojit.device_nav.subNavigation.tab_cardreader.title' )
            },
            {
                name: 'tab_printer',
                href: options.cupsEnabled ? rootPath + '#/printer' : null,
                text: i18n( 'DeviceMojit.device_nav.subNavigation.tab_printer.title' ),
                disabled: !(options.cupsEnabled === true)
            },
            {
                name: 'tab_scanner',
                href: rootPath + '#/scanner',
                text: i18n( 'DeviceMojit.device_nav.subNavigation.tab_scanner.title' )
            },
            {
                name: 'tab_inOut',
                href: rootPath + '#/inout',
                text: i18n( 'DeviceMojit.device_nav.subNavigation.tab_inOut.title' )
            },
            {
                name: 'tab_serial',
                href: rootPath + '#/serial',
                text: i18n( 'DeviceMojit.device_nav.subNavigation.tab_serial.title' )
            },
            {
                name: 'tab_devices',
                href: rootPath + '#/devices',
                text: i18n( 'DeviceMojit.device_nav.subNavigation.tab_devices.title' )
            },
            {
                name: 'tab_flowlog',
                href: rootPath + '#/flowlog',
                text: i18n( 'DeviceMojit.device_nav.subNavigation.tab_flowlog.title' )
            }
        ];
    };

    ItemsTabFactory.prototype.createInVoiceAdminNavItems = function( options ) {
        var rootPath = options.rootPath;

        return [
            {
                name: 'gkv_settings',
                href: rootPath + '#/gkv',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.GKV' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_settings' ),
                countryMode: ['D']
            },
            {
                name: 'gkv_delivery_settings',
                href: rootPath + '#/gkv_delivery_settings',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.GKV_DELIVERY_SETTINGS' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_settings' ),
                countryMode: ['D']
            },
            {
                name: 'kvg_settings',
                href: rootPath + '#/tarmed',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.KVG' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.kvg_settings' ),
                countryMode: [ 'CH' ]
            },
            {
                name: 'pvs_settings',
                href: rootPath + '#/pvs',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.PVS' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.pvs_settings' ),
                countryMode: ['D']
            },
            {
                name: 'pkv_settings',
                href: rootPath + '#/pkv',
                text: i18n( 'InvoiceMojit.invoiceAdmin_navJS.menu.INVOICE_BOOK' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.pkv_settings' )
            },
            /*{ name: 'bg_settings', href: rootPath + '#/bg', text: i18n( 'InvoiceMojit.invoiceAdmin_navJS.menu.BG_BOOK' ), disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.bg_settings' ) },*/
            {
                name: 'cash_settings',
                href: rootPath + '#/cash',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.CASH' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.cash_settings' ),
                countryMode: ['D']
            },
            {
                name: 'edmp_settings',
                href: rootPath + '#/eDocumentations',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.EDOCS' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.edmp_settings' ),
                countryMode: ['D']
            },
            {
                name: 'general_settings',
                href: rootPath + '#/general',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.SETTINGS' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.general_settings' ),
                countryMode: ['D']
            },
            {
                name: 'lab_devices_certificates',
                href: rootPath + '#/lab_devices_certificates',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.LABDEVICESCERTIFICATES' ),
                countryMode: ['D'],
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.lab_devices_certificates' )
            },
            {
                name: 'shift_patients',
                href: rootPath + '#/shift_patients',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.SHIFT_PATIENTS' ),
                countryMode: ['D'],
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.shift_patients' )
            }
        ];
    };

    ItemsTabFactory.prototype.createInTouchAdminNavItems = function( options ) {
        var rootPath = options.rootPath;

        return [
            {
                name: 'partners',
                href: rootPath + '#/partners',
                text: i18n( 'UserMgmtMojit.intouchAdmin.PARTNERS' )
            },
            {
                name: 'encryption_setting',
                href: rootPath + '#/encryption',
                text: i18n( 'UserMgmtMojit.intouchAdmin.ENCRYPTION' )
            },
            {
                name: 'transfer_settings',
                href: rootPath + '#/transfer_settings',
                text: i18n( 'UserMgmtMojit.intouchAdmin.TRANSFER' )
            },
            {
                name: 'transfer_conflicts',
                href: rootPath + '#/transfer_conflicts',
                text: i18n( 'UserMgmtMojit.intouchAdmin.CONFLICTS' )
            }
        ];

    };

    ItemsTabFactory.prototype.createInCaseAdminNavItems = function( options ) {

        var rootPath = options.rootPath;

        return [
            {
                name: 'incase_tab_markers',
                href: rootPath + '#/markers',
                text: i18n( 'IncaseAdminMojit.incase_navJS.menu.MARKER' )
            },
            {
                name: 'incase_tab_catalogs',
                href: rootPath + '#/catalogs',
                text: i18n( 'IncaseAdminMojit.incase_navJS.menu.CATALOGS' )
            },
            {
                name: 'incase_tab_activities',
                href: rootPath + '#/activities',
                text: i18n( 'IncaseAdminMojit.incase_navJS.menu.RECORD_ENTRIES' )
            },
            {
                name: 'incase_tab_configuration',
                href: rootPath + '#/configuration',
                text: i18n( 'IncaseAdminMojit.incase_navJS.menu.SETTINGS' )
            },
            {
                name: 'incase_tab_shortcuts',
                href: rootPath + '#/shortcuts',
                text: i18n( 'IncaseAdminMojit.incase_navJS.menu.SHORTCUTS' )
            },
            {
                name: 'incase_tab_tags',
                href: rootPath + '#/tags',
                text: i18n( 'IncaseAdminMojit.incase_navJS.menu.TAGS' )
            },
            {
                name: 'incase_tab_med_lab_tags',
                href: rootPath + '#/medLabTags',
                text: i18n( 'IncaseAdminMojit.incase_navJS.menu.MEDLABTAGS' )
            },
            {
                name: 'rule_editor',
                href: rootPath + '#/rules',
                text: i18n( 'InvoiceMojit.invoice_navJS.menu.RULES' ),
                disabled: !Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.rule_editor' )
            },
            {
                name: 'incase_tab_patients',
                href: rootPath + '#/patients',
                text: i18n( 'IncaseAdminMojit.incase_navJS.menu.PATIENTS' )
            }
        ];
    };

    ItemsTabFactory.prototype.createSupportToolsItems = function( options ) {

        var rootPath = options.rootPath;

        return (function() {
            var items = [];

            // if( Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.employee.userGroups.SUPPORT ) ) {
            //     items.push( {
            //             name: 'tab_terminal',
            //             href: rootPath + '#/terminal',
            //             text: i18n( 'MISMojit.tools_navJS.menu.TERMINAL' )
            //         },
            //         {
            //             name: 'tab_console',
            //             href: rootPath + '#/console',
            //             text: i18n( 'MISMojit.tools_navJS.menu.CONSOLE' )
            //         }
            //     );
            // }

            items.push( {
                    name: 'tab_connectivity',
                    href: rootPath + '#/connectivity',
                    text: i18n( 'MISMojit.tools_navJS.menu.CONNECTIVITY' )
                }/*,
                {
                    name: 'tab_logs',
                    href: rootPath + '#/logs',
                    text: i18n( 'MISMojit.tools_navJS.menu.LOGS' )
                }*/
            );

            return items;
        })();
    };

    ItemsTabFactory.prototype.createInTimeAdminNavItems = function( options ) {

        var rootPath = options.rootPath;

        return [
            {
                name: 'tab_calendars',
                href: rootPath + '#/calendars',
                text: i18n( 'InTimeAdminMojit.menu.tab_calendars.text' )
            },
            {
                name: 'tab_appointment-types',
                href: rootPath + '#/appointment-types',
                text: i18n( 'InTimeAdminMojit.menu.tab_appointment-types.text' )
            },
            {
                name: 'tab_close-days',
                href: rootPath + '#/close-days',
                text: i18n( 'InTimeAdminMojit.menu.tab_close-days.text' )
            },
            {
                name: 'tab_task_types',
                href: rootPath + '#/task-types',
                text: i18n( 'TaskMojit.tabs.TASK_TYPES' )
            },
            {
                name: 'tab_waiting-room',
                href: rootPath + '#/waiting-room',
                text: i18n( 'InTimeAdminMojit.menu.tab_waiting-room.text' )
            },
            {
                name: 'tab_notifications',
                href: rootPath + '#/notifications',
                text: i18n( 'InTimeAdminMojit.menu.tab_notifications.text' )
            },
            {
                name: 'tab_resources',
                href: rootPath + '#/resources',
                text: i18n( 'InTimeAdminMojit.menu.tab_resources.text' )
            },
            {
                name: 'tab_settings',
                href: rootPath + '#/settings',
                text: i18n( 'InTimeAdminMojit.menu.tab_settings.text' )
            },
            {
                name: 'tab_partner-calendar',
                href: rootPath + '#/partner-calendar',
                text: i18n( 'InTimeAdminMojit.menu.tab_partner-calendar.text' )
            }
        ];
    };

    ItemsTabFactory.prototype.createInsuiteAdminNavItems = function( options ) {
        var rootPath = options.rootPath,
            isVPRCNotAdmin = Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isVPRCAdmin();
        return (function() {
            var items = [];

            if( Y.doccirrus.auth.isISD() ) {
                items.push(
                    {
                        text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.EMPLOYEE' ),
                        href: rootPath + '#/employee',
                        name: 'tab_employees'
                    }
                );
            } else {
                items.push( {
                        text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.INSTITUTION' ),
                        href: rootPath + '#/company',
                        name: 'tab_company'
                    },
                    {
                        text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.BS' ),
                        href: rootPath + '#/location',
                        name: 'tab_locations'
                    },
                    {
                        text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.EMPLOYEE' ),
                        href: rootPath + '#/employee',
                        name: 'tab_employees'
                    } );

                if( Y.doccirrus.auth.hasAdditionalService( 'inTi' ) ) {
                    items.push(
                        {
                            text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.ORGANISATIONAL_UNITS' ),
                            href: rootPath + '#/organisational-units',
                            name: 'tab_organisational-units'
                        }
                    );
                }

                items.push( {
                    text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.WORK_STATIONS' ),
                    href: rootPath + '#/work-stations',
                    name: 'tab_work-stations'
                } );

                if( Y.doccirrus.auth.hasAdditionalService( 'inTi' ) ) {
                    items.push(
                        {
                            text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.TI_CARD_READERS' ),
                            href: rootPath + '#/ti-card-readers',
                            name: 'tab_ti-card-readers'
                        },
                        {
                            text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.TI_SMCB' ),
                            href: rootPath + '#/tismcb',
                            name: 'tab_tismcb'
                        },
                        {
                            text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.TI' ),
                            href: rootPath + '#/ti',
                            name: 'tab_ti',
                            countryMode: ['D']
                        }
                    );
                }
                    /*{
                        text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.CONTACTS' ),
                        href: rootPath + '#/contacts',
                        name: 'tab_contacts'

                    },*/
                items.push( {
                    text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.SETTINGS' ),
                    href: rootPath + '#/settings',
                    name: 'tab_settings'
                } );

                items.push( {
                    text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.SERVICES' ),
                    href: rootPath + '#/services',
                    name: 'tab_services',
                    countryMode: ['D']
                } );
            }

            if( !isVPRCNotAdmin ) {
                items.push( {
                    text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.SYSTEM' ),
                    name: 'menu-system',
                    menu: {
                        items: (function() {
                            var items = [
                                {
                                    name: 'change_language',
                                    href: 'javascript:;',// jshint ignore:line
                                    text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.menusubitem.LANGUAGE' ),
                                    click: options.showChangeLanguageDialog
                                },
                                {
                                    name: 'tab_auditlog',
                                    href: rootPath + '#/auditlog_browser',
                                    text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.menusubitem.AUDIT' )
                                }];

                            if( !Y.doccirrus.auth.isDCPRC() ) {
                                items.push( {
                                    name: 'tab_license',
                                    href: rootPath + '#/license_scope',
                                    text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.menusubitem.LICENSE_SCOPE' )
                                } );
                            }

                            if( Y.doccirrus.auth.isAdmin() ) {
                                if( Y.doccirrus.auth.isAdminTenant() && Y.doccirrus.auth.getDccliSupportedFeatures().update ) {
                                    items.unshift({
                                        name: 'update',
                                        href: 'javascript:;',// jshint ignore:line
                                        text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.menusubitem.UPDATE' ),
                                        click: options.showCliUpdateDialog
                                    });
                                }

                                if( Y.doccirrus.auth.isAdminTenant() && Y.doccirrus.auth.getDccliSupportedFeatures().reboot ) {
                                    items.unshift({
                                        name: 'reboot',
                                        href: 'javascript:;',// jshint ignore:line
                                        text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.menusubitem.REBOOT' ),
                                        click: options.showCliRebootDialog
                                    });
                                }

                                if(  Y.doccirrus.auth.isAdminTenant() && Y.doccirrus.auth.getDccliSupportedFeatures().replication ) {
                                    items.unshift.apply( items, [
                                        {
                                            name: 'tab_database',
                                            href: rootPath + '#/database',
                                            text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.menusubitem.DATABASE' )
                                        }
                                    ] );
                                }
                            }

                            if( Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.employee.userGroups.SUPPORT ) ){
                                items.unshift({
                                    name: 'tab_system_terminal',
                                    href: rootPath + '#/system_terminal',
                                    text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.menusubitem.SYSTEM_MESSAGES' )
                                });
                            }

                            return items;
                        })()
                    }
                } );
            }
            return items;

        })();
    };

    ItemsTabFactory.prototype.createAdminSolsItems = function( appRegsArr, baseUrl ) {
        var
            adminSolsArr = [];

        if( appRegsArr && Array.isArray(appRegsArr) && appRegsArr.length ) {
            appRegsArr.forEach(function( appReg ) {
                if( appReg && appReg.uiConfiguration && Array.isArray(appReg.uiConfiguration) && appReg.hasAccess ) {
                    appReg.uiConfiguration.forEach(function( uiConfig ) {
                        if( uiConfig.type === Y.doccirrus.schemas.appreg.uiConfigurationTypes.CONFIGURATION ) {
                            adminSolsArr.push({
                                name: appReg.appName,
                                href: baseUrl + "#/" + appReg.appName,
                                text: appReg.title || appReg.appName
                            });
                        }
                    });
                }
            });
        }

        return adminSolsArr;
    };

    ItemsTabFactory.prototype.createServiceSolsItems = function( appRegsArr, baseUrl ) {
        var
            menuSolsArr = [];

        if( appRegsArr && Array.isArray(appRegsArr) && appRegsArr.length ) {
            appRegsArr.forEach( function( appReg ) {
                if( appReg && appReg.uiConfiguration && Array.isArray( appReg.uiConfiguration ) && appReg.hasAccess ) {
                    appReg.uiConfiguration.forEach( function( uiConfig ) {
                        if( uiConfig.type === Y.doccirrus.schemas.appreg.uiConfigurationTypes.MAIN ) {
                            menuSolsArr.push( {
                                name: appReg.appName,
                                href: baseUrl + "#/" + appReg.appName,
                                text: appReg.title || appReg.appName
                            } );
                        }
                    } );
                }
            } );
        }

        return menuSolsArr;
    };

    ItemsTabFactory.prototype.createLogsNavItems = function() {
        return (function() {
            var items = [];
            if( Y.doccirrus.auth.hasSpecialModule( 'cardio' ) || Y.doccirrus.auth.hasSpecialModule( 'doquvide' ) ) {
                items.push(
                    {
                        text: i18n( 'top_menu.TELEKARDIO' ),
                        name: 'telecardio',
                        href: '/telecardio'
                    }
                );
            }

            items.push(
                {
                    text: i18n( 'top_menu.LABLOG' ),
                    name: 'labLog',
                    href: '/labLog'
                },
                {
                    text: i18n( 'top_menu.DEVICE_LOG' ),
                    name: 'deviceLog',
                    href:  '/deviceLog'
                },
                {
                    text: i18n( 'top_menu.TRANSFER' ),
                    name: 'transferLog',
                    href: '/transferLog'
                },
                {
                    text: i18n( 'top_menu.GDTLOG' ),
                    name: 'gdtLog',
                    href: '/gdtLog'
                }
            );

            if(Y.doccirrus.auth.hasAdditionalService( 'inPacs' )) {
                items.push( {
                    text: i18n( 'top_menu.INPACSLOG' ),
                    name: 'inPacsLog',
                    href: Y.doccirrus.utils.getUrl( 'inPacsLog' )
                } );

            }

            if(Y.doccirrus.auth.hasAdditionalService( 'inCash' ) ) {
                items.push( {
                    text: i18n( 'top_menu.LBL_MENU_BANKBOOK' ),
                    name: 'banklog',
                    href:  '/banklog',
                    countryMode: ['CH']
                } );

            }

            items.push( {
                text: i18n( 'top_menu.LBL_MENU_MEDIDATALOG' ),
                name: 'medidataLog',
                href: '/medidataLog',
                countryMode: ['CH']
            } );
            return items;
        })();
    };

    ItemsTabFactory.prototype.createDocumentsNavItems = function() {
        return (function() {
            var items = [];

            items.push(
                {
                    text: i18n( 'top_menu.LBL_MENU_TERMS' ),
                    name: 'terms',
                    href: '/terms'
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_FORM_HELP' ),
                    name: 'explanations',
                    href: '/static/DocCirrus/assets/docs/02_Erlaeuterungen.pdf',
                    target: '_blank',
                    countryMode: ['D']
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_LANR_BSNR_HELP' ),
                    name: 'leaflet-LANR-BSNR',
                    href: '/static/DocCirrus/assets/docs/KVB-Merkblatt-Verwendung-LANR-und-BSNR-121116.pdf',
                    target: '_blank',
                    countryMode: ['D']
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_MED_DIRECTIVES' ),
                    name: 'directives',
                    href: '/directives',
                    countryMode: ['D']
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_HMV_DIRECTIVES' ),
                    name: 'utility-directives',
                    href: '/static/DocCirrus/assets/docs/HeilM-RL_2020-09-17_iK-2020-10-01.pdf',
                    target: '_blank',
                    countryMode: ['D']
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_HMV_FRAMEWORK' ),
                    name: 'utility-framework',
                    href: '/static/DocCirrus/assets/docs/Rahmenvorgaben_Heilmittel.pdf',
                    target: '_blank',
                    countryMode: ['D']
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_PATIENT_DECLARATIONS' ),
                    name: 'patient_declarations',
                    href: '/patient_declarations',
                    countryMode: ['D']
                });

            return items;
        })();
    };

    ItemsTabFactory.prototype.createInStockNavItems = function (options, tabNames) {
        var rootPath = options.rootPath;
        var inStockTabs = [{
            text: i18n('InStockMojit.menuItems.CART_ORDER'),
            name: 'orders',
            href: rootPath + '#/orders'
        }, {
            text: i18n('InStockMojit.menuItems.DELIVERY'),
            name: 'delivery',
            href: rootPath + '#/delivery'
        }, {
            text: i18n('InStockMojit.menuItems.WAREHOUSE'),
            name: 'warehouse',
            href: rootPath + '#/warehouse'

        }, {
            text: i18n('InStockMojit.menuItems.INVENTORY'),
            name: 'inventory',
            href: rootPath + '#/inventory'
        }, {
            text: i18n('InStockMojit.menuItems.STOCKLIST'),
            name: 'stocklist',
            href: rootPath + '#/stocklist'
        }, {
            text: i18n('InStockMojit.menuItems.SETTINGS'),
            name: 'settings',
            href: rootPath + '#/settings'
        }];

        if (!tabNames || tabNames.length === 0) {
            return inStockTabs;
        }

        return inStockTabs.filter(function( tab ) {
            return  tabNames.indexOf(tab.name) !== -1;
        });

    };

    ItemsTabFactory.prototype = new Proxy( ItemsTabFactory.prototype, {
        get: function( target, property, receiver ) {
            if( property.match( /^create.*NavItems$/ ) ) {
                return new Proxy( target[property], {
                    apply: function() {
                        var navItems = Reflect.apply.apply( Reflect, arguments  );

                        if( !Array.isArray( navItems ) ) {
                            Y.log( property + '() is expected to return an array of nav items.', 'error', NAME );
                        }

                        return navItems.filter( function( navItem ) {
                            return !navItem.countryMode || _.intersection( navItem.countryMode, practiceCountryMode ).length;
                        } );
                    }
                } );
            } else {
                return Reflect.get( target, property, receiver );
            }

        }
    } );

    Y.namespace( 'doccirrus' ).ItemsTabFactory = new ItemsTabFactory();
}, '0.0.1', {
    requires: [
        'doccirrus',
        'inpacsworklist-schema',
        'dcauth',
        'MergeConFilesViewModel',
        'KimViewModel',
        'appreg-schema'
    ]
} );
