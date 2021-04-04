/*global YUI, YUI_config, ko, $, moment */

YUI.add( 'NavBarHeader', function( Y, NAME ) {
    'use strict';

    if( !window.ko ) {
        Y.log( 'yui: NOT loaded: ko', 'warn', NAME );
        return;
    }

    /**
     * @module NavBarHeader
     */

    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        // ignoreDependencies = ko.ignoreDependencies,

        i18n = Y.doccirrus.i18n,
        getUrl = Y.doccirrus.utils.getUrl,
        NS = Y.namespace( 'doccirrus' ),
        NavBarHeaderContainer = document.getElementById( 'NavBarHeader-container' ),

        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    if( !NavBarHeaderContainer ) {
        return;
    }

    /**
     * Get localStorage data associated with this module
     * @param {String} propertyName property name
     * @return {undefined|*}
     */
    function getLocalStorageValueOfModule( propertyName ) {
        var
            localValue = Y.doccirrus.utils.localValueGet( NAME );

        if( '' === localValue ) { // localValue seems to be unset
            return undefined;
        } else {
            localValue = JSON.parse( localValue );
        }
        return Y.doccirrus.commonutils.getObject( propertyName, localValue );
    }

    /**
     * Set localStorage data associated with this module
     * @param {String} propertyName property name
     * @param {*} value any value to set
     */
    function setLocalStorageValueOfModule( propertyName, value ) {
        var
            localValue = Y.doccirrus.utils.localValueGet( NAME );

        if( '' === localValue ) { // localValue seems to be unset
            localValue = {};
        } else {
            localValue = JSON.parse( localValue );
        }
        Y.doccirrus.commonutils.setObject( propertyName, value, localValue );
        Y.doccirrus.utils.localValueSet( NAME, localValue );
    }

    /**
     * @class NavBarHeader
     * @param {Object} config object
     * @constructor
     */
    function NavBarHeader( config ) {
        config = config || {};
        var
            self = this;

        self._init( config );
    }

    NavBarHeader.prototype = {
        constructor: NavBarHeader,

        destructor: function() {
            var
                self = this;
            if( self.handleCLIErrorEvent ) {
                self.handleCLIErrorEvent.removeEventListener();
                self.handleCLIErrorEvent = null;
            }
        },

        /**
         *  @protected
         *  @param {Object} config object
         **/
        _init: function( config ) {
            var
                self = this,
                userName = Y.doccirrus.auth.getUserId();

            //LAM-1967: PLEASE DO NOT RE-USE!
            Y.doccirrus.jsonrpc.api.settings.read()
                .then( function( response ) {
                    self.settings = (response && response.data && response.data[0]) || {};
                } )
                .fail( function( err ) {
                    Y.log( 'NavBarHeader: Could not get settings: ' + ((err && err.stack) || err), 'error', NAME );
                } );

            self.user = Y.doccirrus.auth.getUser();
            self.loggedInUser = userName.length > 10 ? userName.substr( 0, 10 ) + '.' : userName;

            self.lblMenuCalendarI18n = i18n( 'top_menu.LBL_MENU_CALENDAR' );
            self.lblMenuPatientsI18n = i18n( 'top_menu.LBL_MENU_PATIENTS' );
            self.lblMenuTasksI18n = i18n( 'top_menu.LBL_MENU_TASKS' );
            self.lblMenuInvoiceI18n = i18n( 'top_menu.LBL_MENU_INVOICE' );
            self.lblMenuManagementI18n = i18n( 'top_menu.LBL_MENU_MANAGEMENT' );
            self.lblMenuInsuiteI18n = i18n( 'top_menu.LBL_MENU_INSUITE' );
            self.lblMenuIntimeI18n = i18n( 'top_menu.LBL_MENU_INTIME' );
            self.lblMenuInformI18n = i18n( 'top_menu.LBL_MENU_INFORM' );
            self.lblMenuIncaseI18n = i18n( 'top_menu.LBL_MENU_INCASE' );
            self.lblMenuIntouchAdminI18n = i18n( 'top_menu.LBL_MENU_INTOUCH_ADMIN' );
            self.lblMenuInvoiceAdminI18n = i18n( 'top_menu.LBL_MENU_INVOICE_ADMIN' );
            self.lblMenuInportI18n = i18n( 'top_menu.LBL_MENU_INPORT' );
            self.lblMenuInsightI18n = i18n( 'top_menu.LBL_MENU_INSIGHT' );
            self.lblMenuInbackupI18n = i18n( 'top_menu.LBL_MENU_INBACKUP' );
            self.lblMenuServicesI18n = i18n( 'top_menu.LBL_MENU_SERVICES' );
            self.menuItemContactsI18n = i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.CONTACTS' );
            self.lblMenuWaitingRoomI18n = i18n( 'top_menu.LBL_MENU_WAITINGROOM' );
            self.lblMenuPatientPortalI18n = i18n( 'top_menu.LBL_MENU_PATIENT_PORTAL' );
            self.topMenuPrinterI18n = i18n( 'top_menu.PRINTER' );
            self.topMenuLabLogI18n = i18n( 'top_menu.LABLOG' );
            self.topMenuDeviceLogI18n = i18n( 'top_menu.DEVICE_LOG' );
            self.topMenuInPacsLogI18n = i18n( 'top_menu.INPACSLOG' );
            self.topMenuInPacsI18n = i18n( 'top_menu.INPACS' );
            self.topMenuTransferI18n = i18n( 'top_menu.TRANSFER' );
            self.lblMenuDCCRMI18n = i18n( 'top_menu.LBL_MENU_DC_CRM' );
            self.lblMenuIntouchI18n = i18n( 'top_menu.INTOUCH' );
            self.lblMenuKVConnectI18n = i18n( 'top_menu.LBL_MENU_KVCONNECT' );
            self.lblMenuCatalogViewerI18n = i18n( 'top_menu.LBL_MENU_CATALOG_VIEWER' );
            self.lblMenuHelpI18n = i18n( 'top_menu.LBL_MENU_HELP' );
            self.lblMenuVersionI18n = i18n( 'top_menu.LBL_MENU_VERSION' );
            self.lblMenuHandbuchI18n = i18n( 'top_menu.LBL_MENU_HANDBUCH' );
            self.lblMenuShopI18n = i18n( 'top_menu.LBL_MENU_SHOP' );
            self.lblMenuVideoTutorialsI18n = i18n( 'top_menu.LBL_MENU_VIDEO_TUTORIALS' );
            self.lblMenuFAQI18n = i18n( 'top_menu.LBL_MENU_FAQ' );
            self.lblMenuSupportToolsI18n = i18n( 'top_menu.LBL_MENU_SUPPORT_TOOLS' );
            self.lblMenuTermsI18n = i18n( 'top_menu.LBL_MENU_TERMS' );
            self.lblMenuFormHelpI18n = i18n( 'top_menu.LBL_MENU_FORM_HELP' );
            self.lblMenuLanrBsnrHelpI18n = i18n( 'top_menu.LBL_MENU_LANR_BSNR_HELP' );
            self.lblMenuMedDirectivesI18n = i18n( 'top_menu.LBL_MENU_MED_DIRECTIVES' );
            self.lblMenuPatientDeclarationsI18n = i18n( 'top_menu.LBL_MENU_PATIENT_DECLARATIONS' );
            self.lblMenuAddressesI18n = i18n( 'top_menu.LBL_MENU_ADDRESSES' );
            self.lblMenuSupportI18n = i18n( 'top_menu.LBL_MENU_SUPPORT' );
            self.lblMenuAvailableForI18n = i18n( 'logoutform.placeholder.AVAILABLE_FOR' );
            self.topMenuPrinterI18n = i18n( 'top_menu.PRINTER' );
            self.lblMenuHelpApiI18n = i18n( 'top_menu.LBL_MENU_HELP_API' );
            self.lblMenuHelpApi2I18n = i18n( 'top_menu.LBL_MENU_HELP_API2' );
            self.lblMenuHelpSchema2I18n = i18n( 'top_menu.LBL_MENU_HELP_SCHEMA2' );

            self.i18nURLmain = getUrl( 'main' );
            self.i18nURLcalendar = getUrl( 'calendar' );
            self.i18nURLinCaseMojit = getUrl( 'inCaseMojit' );
            self.i18nURLtasks = getUrl( 'tasks' );
            self.i18nURLinvoice = getUrl( 'invoice' );
            self.i18nURLInSuiteAdmin = getUrl( 'InSuiteAdmin' );
            self.i18nURLInTimeAdmin = getUrl( 'InTimeAdmin' );
            self.i18nURLforms = getUrl( 'forms' );
            self.i18nURLincase = getUrl( 'incase' );
            self.i18nURLintouchAdmin = getUrl( 'intouchAdmin' );
            self.i18nURLinvoiceadmin = getUrl( 'invoiceadmin' );
            self.i18nURLinport = getUrl( 'inport' );
            self.i18nURLinsight = getUrl( 'insight' );
            self.i18nURLinbackup = getUrl( 'inbackup' );
            self.i18nURLcontacts = getUrl( 'contacts' );
            self.i18nURLwaitingroom = getUrl( 'waitingroom' );
            self.i18nURLpatportaladmin = getUrl( 'patportaladmin' );
            self.i18nURLprinter = getUrl( 'printer' );
            self.i18nURLlabLog = getUrl( 'labLog' );
            self.i18nURLdeviceLog = getUrl( 'deviceLog' );
            self.i18nURLinPacsLog = getUrl( 'inPacsLog' );
            self.i18nURLgdtLog = getUrl( 'gdtLog' );
            self.i18nURLinPacs = getUrl( 'inPacs' );
            self.i18nURLtransferLog = getUrl( 'transferLog' );
            self.i18nURLcrm = getUrl( 'crm' );
            self.i18nURLintouch = getUrl( 'intouch' );
            self.i18nURLkvconnect = getUrl( 'kvconnect' );
            self.i18nURLcatalogs = getUrl( 'catalogs' );
            self.i18nURLversion = getUrl( 'version' );
            self.i18nURLtutorial = getUrl( 'tutorial' );
            self.i18nURLfaq = getUrl( 'faq' );
            self.i18nURLterms = getUrl( 'terms' );
            self.i18nURLdirectives = getUrl( 'directives' );
            self.i18nURLpatient_declarations = getUrl( 'patient_declarations' );
            self.i18nURLaddresses = getUrl( 'addresses' );
            self.i18nURLprofile = getUrl( 'profile' );

            var messageId = 'navBarHeade_cli_error',
                content = '';
            self.handleCLIErrorEvent = Y.doccirrus.communication.on( {
                event: 'cliError',
                handlerId: messageId,
                done: function( message ) {
                    if( !(message.data && message.data[0]) ){
                        return;
                    }
                    content = message.data[0].data || (message.data[0].output && message.data[0].output.errorMessage);
                    Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: messageId,
                        content: content,
                        level: 'ERROR'
                    } );
                }
            } );

            self._initObservables( config );
            self._initComputed();
            self._bindHandlers();
            self._initOnlineStatus();
            //only for Support user
            if( self.user && self.user.validTo ) {
                self._initSupportTimer();
            }
        },
        /**
         * @property container
         * @type {null|ko.observable}
         * @default ko.observable
         */
        container: null,
        /**
         * @property staticHrefs
         * @type {null|Array}
         * @default Array
         */
        staticHrefs: null,

        /**
         * @property isFrameView
         * @type {boolean|ko.observable}
         * @default false
         */
        isFrameView: false,
        /**
         * @property fixed
         * @type {boolean|ko.observable}
         * @default true
         */
        fixed: (function() {
            var
                fixed = getLocalStorageValueOfModule( 'fixed' );

            if( Y.Lang.isUndefined( fixed ) ) {
                return true;
            }
            else {
                return fixed;
            }

        })(),

        /**
         * @protected
         * @param {Object} config object
         * */
        _initObservables: function( config ) {
            var
                self = this,
                dcEnv = YUI_config.doccirrus.Env;

            self.staticHrefs = Y.Array( config.container.querySelectorAll( '[href]:not([target=_blank])' ) ).map( function( node ) {
                return node.getAttribute( 'href' );
            } ).filter( function( href ) {
                if( !href ) {
                    return false;
                }
                if( href.indexOf( 'javascript:' ) === 0 ) { //jshint ignore:line
                    return false;
                }
                if( href === '#' ) {
                    return false;
                }
                return true;
            } );

            self.container = ko.observable( config.container );
            self.fixed = ko.observable( peek( 'fixed' in config ? config.fixed : self.fixed ) );
            self.isInCareDispatcher = Y.doccirrus.auth.isINCARE();
            self.isDoquvideDispatcher = Y.doccirrus.auth.isDOQUVIDE();
            self.isVPRCAdmin = Y.doccirrus.auth.isVPRCAdmin();
            if( Y.doccirrus.auth.isISD() ) {
                self.dispatcherTitle = self.isDoquvideDispatcher ? i18n( 'top_menu.TITLE_DISPATCHER_DOQUVIDE' ) : i18n( 'top_menu.TITLE_DISPATCHER_INCARE' );
                self.dispatcherTabTitle = self.isDoquvideDispatcher ? i18n( 'top_menu.LBL_MENU_DISPATCHER_DOQUVIDE' ) : i18n( 'top_menu.LBL_MENU_DISPATCHER_INCARE' );
            }

            self.isFrameView = ko.observable( Y.doccirrus.commonutils.isFrameView() );
            if ( !Y.doccirrus.auth.isDCPRC() || !self.isVPRCAdmin ) {
                self.isInSpectorApoEnabled = ko.observable(
                    (
                        Y.doccirrus.auth.hasAdditionalService( Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORAPO ) ||
                        Y.doccirrus.auth.hasAdditionalService( Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOCSOLUI )
                    ) &&
                    !Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.ADMIN ) &&
                    (
                        Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.PHARMACIST ) ||
                        Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF )
                    )
                );
            } else {
                self.isInSpectorApoEnabled = ko.observable( false );
            }

            //  cups.json no longer used for this, MOJ-11271
            self.cupsEnabled = ko.observable( dcEnv.dccliCupsStatus && dcEnv.dccliCupsStatus.enabled );

            self._initMainMenuNavigation();
            self.getIntimeConfig()
                .then( function( res ) {
                    var
                        activateOverview = res && res.activateOverview || false;
                    self._initMainMenu( activateOverview );
                });
        },
        getIntimeConfig: function() {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.practice
                .getIntimeConfig()
                .then( function( response ) {
                    return response && response.data || null;
                } ) );
        },
        /**
         * The main menu of this menu bar
         * @property mainMenu
         * @type {null|KoNav}
         * @default KoNav
         */
        mainMenu: null,
        getDCPRCMenuItems: function() {
            var
                self = this,
                menuAdmin,
                menuServices,
                menuHelp;
            menuAdmin = [
                {
                    text: i18n( 'top_menu.LBL_MENU_INSUITE' ),
                    name: 'InSuiteAdmin',
                    href: getUrl( 'InSuiteAdmin' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInsuiteAdminNavItems( {
                            rootPath: getUrl( 'InSuiteAdmin' ),
                            showCliRebootDialog: Y.doccirrus.modals.cliDialogs.showCliRebootDialog.bind( self ),
                            showCliUpdateDialog: Y.doccirrus.modals.cliDialogs.showCliUpdateDialog.bind( self ),
                            showChangeLanguageDialog: Y.doccirrus.modals.languageChange.show.bind( self )
                        } )
                    }
                }
            ];

            menuServices = [
                {
                    text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.CONTACTS' ),
                    href: getUrl( 'contacts' ),
                    name: 'contacts'
                },
                {
                    text: i18n( 'top_menu.TOKEN_MANAGEMENT' ),
                    name: 'tokenManagement',
                    href: getUrl( 'appTokens' )
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_DC_CRM' ),
                    name: 'crm',
                    href: getUrl( 'crm' )
                }
                ];

            menuHelp = [
                {
                    text: i18n( 'top_menu.LBL_MENU_VERSION' ),
                    name: 'version',
                    href: getUrl( 'version' )
                },
                {
                    text: i18n( 'top_menu.SPEED_TEST' ),
                    name: 'speedTestMenu',
                    click: function() {
                        Y.doccirrus.modals.speedTestModal.showDialog();
                    }
                }
            ];

            if( Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.PARTNER ) ) {
                return [];
            }

            return [
                {
                    text: i18n( 'top_menu.LBL_MENU_MANAGEMENT' ),
                    name: 'drop-admin',
                    menu: {
                        items: menuAdmin
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_SERVICES' ),
                    name: 'drop-services',
                    menu: {
                        items: menuServices
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_HELP' ),
                    name: 'drop-help',
                    menu: {
                        items: menuHelp
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_SUPPORT_REQUEST' ),
                    name: 'drop-support',
                    href: getUrl( 'support_nav' )
                }
            ];

        },
        _initMainMenuNavigation: function() {
            var
                self = this;
            self.mainMenu = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    tabs: false,
                    css: {
                        'navbar-nav': true,
                        'navbar-left': true
                    },
                    items: []
                }
            } );
        },
        _initMainMenu: function( activateOverview ) {
            var
                self = this,
                menuAdmin = [],
                menuServices = [],
                menuHelp = [],
                cupsEnabled = peek( self.cupsEnabled ),
                testLicence = Y.doccirrus.auth.hasSupportLevel( Y.doccirrus.schemas.settings.supportLevels.TEST ),
                adminSolsArr,
                menuSolsArr,
                isGermany = Y.doccirrus.commonutils.doesCountryModeIncludeGermany();

            menuAdmin.push(
                {
                    text: i18n( 'top_menu.LBL_MENU_INSUITE' ),
                    name: 'InSuiteAdmin',
                    href: getUrl( 'InSuiteAdmin' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInsuiteAdminNavItems( {
                            rootPath: getUrl( 'InSuiteAdmin' ),
                            showCliRebootDialog: Y.doccirrus.modals.cliDialogs.showCliRebootDialog.bind( self ),
                            showCliUpdateDialog: Y.doccirrus.modals.cliDialogs.showCliUpdateDialog.bind( self ),
                            showChangeLanguageDialog: Y.doccirrus.modals.languageChange.show.bind( self )
                        } )
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_INTIME' ),
                    name: 'InTimeAdmin',
                    href: getUrl( 'InTimeAdmin' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInTimeAdminNavItems( { rootPath: getUrl( 'InTimeAdmin' ) } )
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_INFORM' ),
                    name: 'forms',
                    href: getUrl( 'forms' )
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_INCASE' ),
                    name: 'incase',
                    href: getUrl( 'incase' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInCaseAdminNavItems( { rootPath: getUrl( 'incase' ) } )
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_INTOUCH_ADMIN' ),
                    name: 'intouchAdmin',
                    href: getUrl( 'intouchAdmin' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInTouchAdminNavItems( { rootPath: getUrl( 'intouchAdmin' ) } )
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_INVOICE_ADMIN' ),
                    name: 'invoiceadmin',
                    href: getUrl( 'invoiceadmin' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInVoiceAdminNavItems( { rootPath: getUrl( 'invoiceadmin' ) } )
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_INPORT' ),
                    name: 'inport',
                    href: getUrl( 'inport' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInPortAdminNavItems( { rootPath: getUrl( 'inport' ), cupsEnabled: cupsEnabled  } )
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_INSIGHT' ),
                    name: 'insight',
                    href: getUrl( 'insight' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInSight2AdminNavItems()
                    }
                }
            );
            if( Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.employee.userGroups.SUPPORT ) ){
                menuAdmin.push( {
                    text: i18n( 'top_menu.LBL_MENU_INSETUP' ),
                        name: 'insetup',
                    href: getUrl( 'insetup' ),
                    menu: {
                    items: Y.doccirrus.ItemsTabFactory.createInSetupNavItems()
                } } );
            }

            if( testLicence || (Y.doccirrus.auth.getAppRegs() && Y.doccirrus.auth.getAppRegs().length )) {
                if( Y.doccirrus.auth.isSolsSupported() ) {
                    adminSolsArr = Y.doccirrus.ItemsTabFactory.createAdminSolsItems( Y.doccirrus.auth.getAppRegs(), getUrl( 'appAccessManager' ) );
                } else {
                    adminSolsArr = [];
                }

                if( adminSolsArr ) {
                    menuAdmin.push( {
                        text: i18n( 'top_menu.LBL_MENU_APP_SETTINGS' ),
                        name: 'appAccessManager',
                        href: getUrl( 'appAccessManager' ),
                        menu: {
                            items: adminSolsArr
                        }
                    } );
                }
            }

            // if( Y.doccirrus.auth.isPRC() && Y.doccirrus.auth.hasAdditionalService( 'inPortPlus' ) ) {
            //     menuAdmin.push( {
            //         text: i18n( 'top_menu.LBL_MENU_INPORTPLUS' ),
            //         name: 'inportplus',
            //         href: getUrl( 'appAccessManager' )
            //     } );
            // }

            if( Y.doccirrus.auth.hasAdditionalService( 'inPacs' ) ) {
                menuAdmin.push( {
                    text: i18n( 'top_menu.LBL_MENU_INPACS' ),
                    name: 'inpacsAdmin',
                    href: getUrl( 'inpacsAdmin' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInPacsAdminNavItems( { rootPath: getUrl( 'inpacsAdmin' ) } )
                    }
                } );
            }

            if( Y.doccirrus.auth.hasAdditionalService( 'inStock' ) ) {
                menuAdmin.push(
                    {
                        text: i18n( 'top_menu.LBL_MENU_INSTOCK' ),
                        name: 'instock',
                        href: getUrl( 'inStockMojit' ),
                        menu: {
                            items: Y.doccirrus.ItemsTabFactory.createInStockNavItems({rootPath: Y.doccirrus.utils.getUrl( 'inStockMojit' )}, ['orders', 'delivery', 'inventory', 'settings'])
                        }
                    } );
            }

            //MOJ-7477 - inBackup is now default service. inBackup now refers to inBackup cloud
            if( Y.doccirrus.auth.isAdminTenant() && Y.doccirrus.auth.isAdmin() && Y.doccirrus.auth.getDccliSupportedFeatures().backup /*&& Y.doccirrus.auth.hasAdditionalService( 'inBackup' )*/ ) {
                menuAdmin.push( {
                    text: i18n( 'top_menu.LBL_MENU_INBACKUP' ),
                    name: 'inbackup',
                    href: getUrl( 'inbackup' )
                } );
            }

            if( Y.doccirrus.auth.hasSpecialModule( 'cardio' ) ) {
                menuAdmin.push( {
                    text: i18n( 'top_menu.CARDIOCONFIG' ),
                    name: 'cardioConfig',
                    href: getUrl( 'cardioConfig' ) + '#/cardio'
                } );
            }

            if( Y.doccirrus.auth.hasSpecialModule( 'doquvide' ) ) {
                menuAdmin.push( {
                    text: i18n( 'top_menu.DOQUVIDECONFIG' ),
                    name: 'cardioConfig',
                    href: getUrl( 'cardioConfig' ) + '#/doquvide'
                } );
            }

            if( Y.doccirrus.auth.hasSpecialModule( 'dqs' ) ) {
                menuAdmin.push( {
                    text: i18n( 'top_menu.DQSCONFIG' ),
                    name: 'cardioConfig',
                    href: getUrl( 'cardioConfig' ) + '#/dqs'
                } );
            }

            if( Y.doccirrus.auth.hasSpecialModule( 'care' ) ) {
                menuAdmin.push(
                    {
                        text: i18n( 'top_menu.LBL_MENU_INCARE' ),
                        name: 'incare',
                        href: getUrl( 'incare' )
                    } );
            }

            menuServices.push( {
                text: i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.CONTACTS' ),
                href: getUrl( 'contacts' ),
                name: 'contacts'
            } );

            menuServices.push(
                {
                    text: i18n( 'top_menu.LBL_MENU_WAITINGROOM' ),
                    name: 'waitingroom',
                    href: getUrl( 'waitingroom' )
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_PATIENT_PORTAL' ),
                    name: 'patportaladmin',
                    href: getUrl( 'patportaladmin' )
                },
                {
                    text: i18n( 'top_menu.PRINTER' ),
                    name: 'printer',
                    href: getUrl( 'printer' )
                }
            );

            //LAM-1967: PLEASE DO NOT RE-USE!
            var
                booksAccessOnlyForAdmins = self.settings && self.settings.noCrossLocationAccess && self.settings.booksAccessOnlyForAdmins,
                hasAccessToBooks = booksAccessOnlyForAdmins ? Y.doccirrus.authpub.hasEnoughGroupRights( self.user.groups, Y.doccirrus.schemas.identity.userGroups.ADMIN ) : true;

            if( hasAccessToBooks ) {
                menuServices.push( {
                    text: i18n( 'top_menu.LOGS' ),
                    name: 'logs',
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createLogsNavItems()
                    }
                } );
            }

            if( Y.doccirrus.auth.hasAdditionalService( 'inPacs' ) ) {
                menuServices.push( {
                    text: i18n( 'top_menu.INPACS' ),
                    name: 'inPacs',
                    href: getUrl( 'inPacs' )+"#find-patients",
                    target: "_blank"
                } );
            }



            if( !Y.doccirrus.auth.isDCPRC() ) {
                menuServices.push(
                    {
                        text: i18n( 'top_menu.FORM_PORTAL' ),
                        name: 'formPortal',
                        click: function() {
                            Y.doccirrus.modals.formPortalModal.show();
                        }
                    }
                );
            }
            if( Y.doccirrus.auth.isDCPRC() || Y.doccirrus.auth.isVPRCAdmin() ) {
                menuServices.push(
                    {
                        text: i18n( 'top_menu.LBL_MENU_DC_CRM' ),
                        name: 'crm',
                        href: getUrl( 'crm' )
                    }
                );
            }
            if( !Y.doccirrus.auth.isDCPRC() ) {
                menuServices.push(
                    {
                        text: i18n( 'top_menu.INTOUCH' ),
                        name: 'intouch',
                        href: getUrl( 'intouch' )
                    }
                );
            }

            // TODOOO kvc check init of this stuff, possible that kvconnect config is not initialized by kvconnect-manager yet
            if( ( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isAppDeliveredFromPUC() ) && isGermany ) {
                menuServices.push(
                    {
                        text: i18n( 'top_menu.LBL_MENU_KVCONNECT' ),
                        name: 'kvconnect',
                        href: getUrl( 'kvconnect' )
                    }
                );

            }

            menuServices.push(
                {
                    text: i18n( 'top_menu.LBL_MENU_CATALOG_VIEWER' ),
                    name: 'catalogs',
                    href: getUrl( 'catalogs' )
                } );

            if( Y.doccirrus.auth.getAppRegs() && Y.doccirrus.auth.getAppRegs().length ) {
                menuSolsArr = Y.doccirrus.ItemsTabFactory.createServiceSolsItems( Y.doccirrus.auth.getAppRegs(), getUrl( 'appNav' ) );

                if( menuSolsArr && menuSolsArr.length ) {
                    menuServices.push( {
                            text: i18n( 'top_menu.LBL_MENU_APP' ),
                            name: 'appMenu',
                            href: getUrl( 'appNav' ),
                            menu: {
                                items: menuSolsArr
                            }
                        }
                    );
                }
            }

            if( Y.doccirrus.auth.hasAdditionalService( 'inStock' ) ) {
                menuServices.push(
                    {
                        text: i18n( 'top_menu.LBL_MENU_INSTOCK' ),
                        name: 'instock',
                        href: getUrl( 'inStockMojit' ),
                        menu: {
                            items: Y.doccirrus.ItemsTabFactory.createInStockNavItems({rootPath: Y.doccirrus.utils.getUrl( 'inStockMojit' )}, ['orders', 'delivery', 'inventory', 'settings'])
                        }
                    } );
            }

            menuHelp.push(
                {
                    text: i18n( 'top_menu.LBL_MENU_VERSION' ),
                    name: 'version',
                    href: getUrl( 'version' )
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_HANDBUCH' ),
                    name: 'handbuch',
                    href: getUrl( 'handbuch' )
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_DOCUMENTS' ),
                    name: 'documents',
                    href: getUrl( 'documents' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createDocumentsNavItems()
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_SHOP' ),
                    name: 'shop',
                    href: getUrl( 'shop' )
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_SUPPORT_TOOLS' ),
                    name: 'tools',
                    href: getUrl( 'tools' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createSupportToolsItems( { rootPath: getUrl( 'tools' ) } )
                    }
                }
            );
            if( Y.doccirrus.auth.isPRC() ) {
                menuHelp.push(
                    {
                        text: i18n( 'top_menu.LBL_MENU_ADDRESSES' ),
                        name: 'addresses',
                        href: getUrl( 'addresses' )
                    },
                    {
                        text: i18n( 'top_menu.LBL_MENU_SUPPORT' ),
                        name: 'support-dialog-menu-cta',
                        click: function() {
                            Y.doccirrus.utils.showSupportDialog();
                        }
                    }
                );
            }

            var mainMenuItems = [
                {
                    text: i18n( 'top_menu.LBL_MENU_CALENDAR' ),
                    name: 'calendar',
                    href: getUrl( 'calendar' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createCalendarNavItems( { rootPath: getUrl( 'calendar' ) } )
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_PATIENTS' ),
                    name: 'patients',
                    href: getUrl( 'inCaseMojit' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInCaseNavItems( {
                            rootPath: getUrl( 'inCaseMojit' )
                        } )
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_TASKS' ),
                    name: 'tasks',
                    href: getUrl( 'tasks' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createTaskNavItems( { rootPath: getUrl( 'tasks' ), activateOverview: activateOverview } )
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_INVOICE' ),
                    name: 'invoiceTopLevelMenuButton',
                    href: getUrl( 'invoice' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInvoiceNavItems( {
                            rootPath: getUrl( 'invoice' ),
                            hasInVoice: Y.doccirrus.auth.hasBaseServices( Y.doccirrus.schemas.settings.baseServices.INVOICE ),
                            hasASV: Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.ASV ),
                            hasEDocs: Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.EDMP ) ||
                                      Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.EHKS )
                        } )
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_MANAGEMENT' ),
                    name: 'drop-admin',
                    menu: {
                        items: menuAdmin
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_SERVICES' ),
                    name: 'drop-services',
                    menu: {
                        items: menuServices
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_HELP' ),
                    name: 'drop-help',
                    menu: {
                        items: menuHelp
                    }
                }
            ];

            var iscdAdminItems = [
                {
                    text: self.dispatcherTabTitle,
                    name: 'dispatcher',
                    href: getUrl( 'dispatcher' )
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_TASKS' ),
                    name: 'tasks',
                    href: getUrl( 'tasks' )
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_PATIENTS' ),
                    name: 'mirror_patients',
                    href: getUrl( 'mirror_patients' )
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_MANAGE' ),
                    name: 'manage',
                    href: getUrl( 'manage' ),
                    menu: {
                        items: [
                            (function() {
                                var items = [
                                    {
                                        text: i18n( 'top_menu.LBL_MENU_INSUITE' ),
                                        name: 'InSuiteAdmin',
                                        href: getUrl( 'InSuiteAdmin' ),
                                        menu: {
                                            items: Y.doccirrus.ItemsTabFactory.createInsuiteAdminNavItems( {
                                                rootPath: getUrl( 'manage' ),
                                                showChangeLanguageDialog: Y.doccirrus.modals.languageChange.show.bind( self )
                                            } )
                                        }
                                    }
                                ];
                                if( Y.doccirrus.auth.hasAdditionalService( 'inSight' ) ) {
                                    items.push( {
                                        text: i18n( 'top_menu.LBL_MENU_INSIGHT' ),
                                        name: 'insight',
                                        href: getUrl( 'insight' ),
                                        menu: {
                                            items: Y.doccirrus.ItemsTabFactory.createInSight2AdminNavItems()
                                        }
                                    } );
                                }
                                if( Y.doccirrus.auth.isDOQUVIDE() ) {
                                    items.push( {
                                        text: i18n( 'top_menu.LBL_MENU_INTOUCH_ADMIN' ),
                                        name: 'intouchAdmin',
                                        href: getUrl( 'intouchAdmin' ),
                                        menu: {
                                            items: Y.doccirrus.ItemsTabFactory.createInTouchAdminNavItems( { rootPath: getUrl( 'intouchAdmin' ) } )
                                        }
                                    } );
                                }
                                if( Y.doccirrus.auth.isDOQUVIDE() ) {
                                    items.push( {
                                        text: i18n( 'top_menu.LBL_MENU_INFORM' ),
                                        name: 'forms',
                                        href: getUrl( 'forms' )
                                    } );
                                }
                                if( Y.doccirrus.auth.isDOQUVIDE() ) {
                                    items.push(
                                        {
                                            text: i18n( 'top_menu.LBL_MENU_INCASE' ),
                                            name: 'incase',
                                            href: getUrl( 'incase' ),
                                            menu: {
                                                items: Y.doccirrus.ItemsTabFactory.createInCaseAdminNavItems( { rootPath: getUrl( 'incase' ) } )
                                            }
                                        } );
                                }
                                if( Y.doccirrus.auth.isAdminTenant() && Y.doccirrus.auth.isAdmin() && Y.doccirrus.auth.getDccliSupportedFeatures().backup ) {
                                    items.push( {
                                        text: i18n( 'top_menu.LBL_MENU_INBACKUP' ),
                                        name: 'inbackup',
                                        href: getUrl( 'inbackup' )
                                    } );
                                }

                                return items;
                            })()
                        ]
                    }
                }
            ];
            if( self.isDoquvideDispatcher ) {
                iscdAdminItems.push( {
                    text: i18n( 'top_menu.LBL_MENU_SERVICES' ),
                    name: 'drop-services',
                    menu: {
                        items: [
                            {
                                text: i18n( 'top_menu.TRANSFER' ),
                                name: 'transferLog',
                                href: getUrl( 'transferLog' )
                            }
                        ]
                    }
                } );
            }

            var vprcAdminAdminMenu = [
                {
                    text: i18n( 'top_menu.LBL_MENU_INSUITE' ),
                    name: 'InSuiteAdmin',
                    href: getUrl( 'InSuiteAdmin' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInsuiteAdminNavItems( {
                            rootPath: getUrl( 'InSuiteAdmin' ),
                            showCliRebootDialog: Y.doccirrus.modals.cliDialogs.showCliRebootDialog.bind( self ),
                            showCliUpdateDialog: Y.doccirrus.modals.cliDialogs.showCliUpdateDialog.bind( self ),
                            showChangeLanguageDialog: Y.doccirrus.modals.languageChange.show.bind( self )
                        } )
                    }
                }
            ];

            if( Y.doccirrus.auth.isAdminTenant() && Y.doccirrus.auth.isAdmin() && Y.doccirrus.auth.getDccliSupportedFeatures().backup ) {
                vprcAdminAdminMenu.push({
                    text: i18n( 'top_menu.LBL_MENU_INBACKUP' ),
                    name: 'inbackup',
                    href: getUrl( 'inbackup' )
                });
            }

            //  TODO: cupsEnabled tied to dccliCupsStatus


            vprcAdminAdminMenu.push(
                {
                    text: i18n( 'top_menu.LBL_MENU_INPORT' ),
                    name: 'inport',
                    menu: {
                        items: [
                            {
                                name: 'tab_printer',
                                href: cupsEnabled ? getUrl( 'inport' ) + '#/printer' : null,
                                text: i18n( 'DeviceMojit.device_nav.subNavigation.tab_printer.title' ),
                                disabled: !cupsEnabled
                            }
                        ]
                    }
                }
            );

            // if( Y.doccirrus.auth.hasAdditionalService( 'inPortPlus' ) ) {
            //     vprcAdminAdminMenu.push( {
            //             text: i18n( 'top_menu.LBL_MENU_INPORTPLUS' ),
            //             name: 'inportplus',
            //             href: getUrl( 'appAccessManager' )
            //         }
            //     );
            // }


            var vprcAdminItems = [
                {
                    text: i18n( 'top_menu.LBL_MENU_SERVICES' ),
                    name: 'drop-services',
                    menu: {
                        items: [
                            {
                                text: i18n( 'top_menu.LBL_MENU_DC_CRM' ),
                                name: 'crm',
                                href: getUrl( 'crm' )
                            }
                        ]
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_MANAGEMENT' ),
                    name: 'drop-admin',
                    menu: {
                        items: vprcAdminAdminMenu
                    }
                },
                {
                    text: i18n( 'top_menu.LBL_MENU_INVOICE' ),
                    name: 'invoice',
                    href: getUrl( 'invoice' ),
                    menu: {
                        items: Y.doccirrus.ItemsTabFactory.createInvoiceNavItems( {
                            rootPath: getUrl( 'invoice' ),
                            isVPRCAdmin: self.isVPRCAdmin
                        } )
                    }
                }
            ];

            if( Y.doccirrus.auth.isMTSAndMasterUser() ) {
                vprcAdminItems.push({
                    text: i18n( 'top_menu.LBL_MENU_HELP' ),
                    name: 'drop-help',
                    menu: {
                        items: [
                            {
                                text: i18n( 'top_menu.LBL_MENU_SUPPORT_TOOLS' ),
                                name: 'tools',
                                href: getUrl( 'tools' ),
                                menu: {
                                    items: Y.doccirrus.ItemsTabFactory.createSupportToolsItems( { rootPath: getUrl( 'tools' ) } )
                                }
                            }
                        ]
                    }
                });
            }

            if( Y.doccirrus.auth.isDCPRC() ) {
                mainMenuItems = this.getDCPRCMenuItems();
            }

            self.mainMenu.addItems( self.isInCareDispatcher || self.isDoquvideDispatcher ? iscdAdminItems : self.isVPRCAdmin ? vprcAdminItems : mainMenuItems );

            //  needs a a small delay for KO to add the dom elements before we can access them with jQuery
            setTimeout( function() { self._makeClicableForDesktop(); }, 50 );
        },

        _makeClicableForDesktop: function(){
            // EXTMOJ-536 - parent top menu should be clickable in desktop mode
            $( '#bs3TopMenu .navbar-nav > .dropdown' ).off( 'click' ).on( 'click', function( event ) {

                var target = $( event.target );
                // Do not spread on the child submenu
                if( target.hasClass( 'KoMenuItem-link' ) || target.hasClass( 'KoMenuItem-text' ) ) {
                    return;
                }

                var $el = $( this ),
                    $a = $el.children( 'a.dropdown-toggle' ),
                    $ul = $el.children( 'ul.dropdown-menu' );
                if( $( window ).width() > 1200 ) {
                    if( $a.length && $a.attr( 'href' ) ) {
                        $ul.hide();
                        location.href = $a.attr( 'href' );
                    }
                }
            } );
        },

        /**
         * All hrefs exposed by this menu bar
         * @property hrefs
         * @type {null|ko.computed}
         * @default []
         */
        hrefs: null,
        /** @protected */
        _initComputed: function() {
            var
                self = this;

            ko.computed( function() {
                var
                    fixed = self.fixed(),
                    isFrameView = self.isFrameView();

                if( fixed && !isFrameView ) {
                    document.body.classList.add( 'body-NavBarHeader-fixed' );
                }
                else {
                    document.body.classList.remove( 'body-NavBarHeader-fixed' );
                }

                setLocalStorageValueOfModule( 'fixed', fixed );

            } );

            self.hrefs = ko.computed( function() {
                var
                    hrefs = [].concat( self.staticHrefs ),
                    items = unwrap( self.mainMenu.items );

                items.forEach( function( item ) {
                    var href = unwrap( item.href ),
                        itemsMenu,
                        itemHref;

                    if( href ) {
                        if( '_blank' !== unwrap( item.target ) ) {
                            hrefs.push( href );
                        }
                    }
                    if( item.menu ) {
                        itemsMenu = unwrap( item.menu.items );
                        itemsMenu.forEach( function( itemMenu ) {
                            itemHref = unwrap( itemMenu.href );
                            if( itemHref ) {
                                if( '_blank' !== unwrap( itemMenu.target ) ) {
                                    hrefs.push( itemHref );
                                }
                            }
                        } );
                    }
                } );

                return Y.Array.dedupe( hrefs );
            } );

            self.presettings = new Y.doccirrus.ProfileManagementViewModel.create({ fromProfile: true }); //eslint-disable-line new-cap

        },
        /** @protected */
        _bindHandlers: function() {
            var
                self = this;

            self.togglePinnedCTA = Y.bind( self.togglePinnedCTA, self );
        },
        /**
         * Apply knockout bindings to container
         * @method applyBindings
         */
        applyBindings: function() {
            var
                self = this;

            ko.applyBindings( self, peek( self.container ) );
        },
        /**
         * Clean container from knockout bindings
         * @method cleanNode
         */
        cleanNode: function() {
            var
                self = this;

            ko.cleanNode( peek( self.container ) );
        },
        /**
         * Pin the navigation (set the navigation fixed)
         * @method pin
         */
        pin: function() {
            var
                self = this;

            self.fixed( true );
        },
        /**
         * Unpin the navigation (unset the navigation fixed)
         * @method unpin
         */
        unpin: function() {
            var
                self = this;

            self.fixed( false );
        },
        /**
         * Call to action handler for toggling pinned
         * @method togglePinnedCTA
         */
        togglePinnedCTA: function() {
            var
                self = this;

            self.fixed( !self.fixed() );
        },
        logOutButtonHandler: function() {
            const possiblePathes = ['/cups/classes', '/cups/help', '/cups/jobs', '/cups/printers', '/cups'];

            if (document.getElementById("cups_iframe")) {
                possiblePathes.map(function(path) {
                    document.getElementById("cups_iframe").contentDocument.cookie = 'prc.connect.sid' +'=; Path='+ path + '; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                });
            }

            Y.doccirrus.utils.doLogout();
        },
        setActiveEntry: function( name ) {
            var
                self = this,
                mainMenu = self.mainMenu,
                mainMenuItems = peek( mainMenu.items );

            mainMenuItems.forEach( function( mainMenuItem ) {
                var
                    subMenu = peek( mainMenuItem.menu );

                mainMenuItem.active( false );
                if( subMenu ) {
                    peek( subMenu.items ).forEach( function( subMenuItem ) {
                        subMenuItem.active( false );
                    } );
                }
            } );

            mainMenuItems.some( function( mainMenuItem ) {
                var
                    subMenu = peek( mainMenuItem.menu );

                if( name === peek( mainMenuItem.name ) ) {
                    mainMenuItem.active( true );
                    return true;
                }
                if( subMenu ) {
                    return peek( subMenu.items ).some( function( subMenuItem ) {
                        if( name === peek( subMenuItem.name ) ) {
                            subMenuItem.active( true );
                            mainMenuItem.active( true );
                            return true;
                        }
                        return false;
                    } );
                }
                return false;
            } );

        },
        /**
         * Some markup for online status
         * @property onlineStatus
         * @type {null|ko.observable}
         * @default undefined
         */
        onlineStatus: null,
        _initOnlineStatus: function() {
            var
                self = this;

            self.onlineStatus = ko.observable();
        },
        /**
         * Display time of support account existence
         * @property supportTimer
         * @type {null|ko.observable}
         * @default undefined
         */
        supportTimer: null,
        _initSupportTimer: function() {
            var
                self = this,
                userValidTo = moment( self.user.validTo ).toISOString(),
                diffInHour = moment( userValidTo ).toNow( true );

            self.supportTimer = ko.observable( diffInHour );

            //refresh value every minute
            setInterval( function() {
                self.supportTimer( moment( userValidTo ).toNow( true ) );
             }, 60000 );
        }
    };

    /**
     * namespace of {{#crossLinkModule "NavBarHeader"}}{{/crossLinkModule}} Module in {{#crossLink "doccirrus"}}{{/crossLink}}
     * @property NavBarHeader
     * @for doccirrus
     * @type {NavBarHeader}
     * @static
     */
    NS.NavBarHeader = new NavBarHeader( {
        container: NavBarHeaderContainer
    } );

    NS.NavBarHeader.applyBindings();

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'dccommonutils',
        'dcauth',
        'dcutils',
        'dchotkeyshandler',
        'KoNav',
        'DCFormPortalModal',
        'ItemsTabFactory',
        'DCcliDialogs',
        'dclanguagechangemodal',
        'supportrequest-schema',
        'ProfileMojitProfileManager'
    ]
} );
