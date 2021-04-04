/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'InSuiteAdminMojitBinderIndex', function( Y, NAME ) {
    'use strict';

    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    /**
     * The InSuiteAdminMojitBinderIndex module.
     *
     * @module InSuiteAdminMojitBinderIndex
     */

    /**
     * Constructor for the InSuiteAdminMojitBinderIndex class.
     *
     * @class InSuiteAdminMojitBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'InSuiteAdminMojit',

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function( node ) {
            var
            self = this;

            Y.doccirrus.DCBinder.initToggleFullScreen();

            //change active tab in toplevel menu
            if( Y.doccirrus.auth.isISD() ) {
                Y.doccirrus.NavBarHeader.setActiveEntry( 'manage' );
            } else {
                Y.doccirrus.NavBarHeader.setActiveEntry( 'InSuiteAdmin' );
            }

            self.node = node;

            Y.doccirrus.catalogmap.init( self.mojitProxy.pageData.get( 'catalog-descriptors' ) );

            self._initEvents();
            self._initSubNavigation();

        },

        /**
         * Publishes events this binder exposes
         */
        _initEvents: function() {

            /**
             * @for InSuiteAdminMojitBinderIndex
             * @event tab_employees-state
             * @description Fires when "tab_employees" state changes from outside
             * @param {Event} event The Event
             * @param {Object} state state information
             * @param {String} state.view the view to display
             * @param {Object} state.params parameters associated with the view
             * @type Event.Custom
             */
            Y.publish( 'tab_employees-state', {
                preventable: false
            } );

            /**
             * @for InSuiteAdminMojitBinderIndex
             * @event tab_locations-state
             * @description Fires when "tab_locations" state changes from outside
             * @param {Event} event The Event
             * @param {Object} state state information
             * @param {Object} state.params parameters
             * @type Event.Custom
             */
            Y.publish( 'tab_locations-state', {
                preventable: false
            } );
        },

        /**
         * initialize main sub navigation
         * @private
         */
        _initSubNavigation: function() {
            var
                self = this,
                rootPath = Y.doccirrus.utils.getUrl( Y.doccirrus.auth.isISD() ? 'manage' : 'InSuiteAdmin' ),
                isVPRCNotAdmin = Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isVPRCAdmin(),
                settingsInSuiteNav, fullScreenToggleInSuiteAdmin;

            function handleSubmenu( submenu ) {
                if( !isVPRCNotAdmin ) {
                    Y.Array.invoke( settingsInSuiteNav.getItemByName( "menu-system" ).menu.items.peek(), "active", false );
                    if( submenu ) {
                        settingsInSuiteNav.getItemByName( "menu-system" ).menu.getItemByName( submenu ).active( true );
                        settingsInSuiteNav.getItemByName( "menu-system" ).active( true );
                    }
                }
            }

            function handleTab( tabName, data, callback ) {
                var node = document.querySelector( "#upperDiv" );
                if( node ) {
                    ko.cleanNode( node );
                }

                if( 'function' === typeof data ) {
                    callback = data;
                    data = null;
                }

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    self.jaderef,
                    data || {},
                    Y.one( node ),
                    function() {
                        var tab = settingsInSuiteNav.getItemByName( tabName );
                        if( tab ) {
                            tab.active( true );
                        }
                        if( callback ) {
                            callback.apply( undefined, arguments );
                        }
                    }
                );
            }

            settingsInSuiteNav = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: Y.doccirrus.ItemsTabFactory.createInsuiteAdminNavItems( {
                        rootPath: rootPath,
                        showCliRebootDialog: Y.doccirrus.modals.cliDialogs.showCliRebootDialog.bind( self ),
                        showCliUpdateDialog: Y.doccirrus.modals.cliDialogs.showCliUpdateDialog.bind( self ),
                        showChangeLanguageDialog: Y.doccirrus.modals.languageChange.show.bind( self )
                    } )
                }
            } );

            fullScreenToggleInSuiteAdmin = {
                toggleFullScreenHandler() {
                    Y.doccirrus.DCBinder.toggleFullScreen();
                },
                viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
            };

            ko.applyBindings( settingsInSuiteNav, document.querySelector( '#settingsInSuiteNav' ) );
            ko.applyBindings( fullScreenToggleInSuiteAdmin, document.querySelector( '#fullScreenToggleInSuiteAdmin' ) );

            self.router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {

                            function publishState() {
                                var
                                    view = 'overview',
                                    params = {};

                                Y.fire( 'tab_employees-state', {}, {
                                    view: view,
                                    params: params
                                } );
                            }

                            if( Y.config.debug ) {
                                Y.log( 'Follow company route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }

                            handleSubmenu();
                            if( Y.doccirrus.auth.isISD() ) {

                                handleTab( "tab_employees", publishState );
                            } else {
                                handleTab( "tab_company" );
                            }
                        }
                    },
                    {
                        path: '/company',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow company route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleSubmenu();
                            handleTab( "tab_company" );
                        }
                    },
                    {
                        path: /^\/location\/*([^\/]*)$/,
                        callbacks: function( req ) {
                            var
                                id = req.params[1] || null;

                            function publishState() {
                                if( id ) {
                                    Y.fire( 'tab_locations-state', {}, {
                                        params: { id: id }
                                    } );
                                }
                            }

                            if( Y.config.debug ) {
                                Y.log( 'Follow locations route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }

                            handleSubmenu();
                            handleTab( "tab_locations", publishState );
                        }
                    },
                    {
                        path: /^\/employee\/*([^\/]*)$/,
                        callbacks: function( req ) {
                            var
                                id = req.params[1] || null,
                                activeTab = settingsInSuiteNav.activeTab(),
                                activeTabName = activeTab && activeTab.name();

                            function publishState() {
                                var
                                    view = 'overview',
                                    params = {};

                                if( id ) {
                                    view = 'detail';
                                    if( 'new' !== id ) {
                                        params.id = id;
                                    }
                                }

                                Y.fire( 'tab_employees-state', {}, {
                                    view: view,
                                    params: params
                                } );
                            }

                            handleSubmenu();

                            if( 'tab_employees' !== activeTabName ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow employee route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( "tab_employees", publishState );
                            }
                            else {
                                publishState();
                            }

                        }
                    },
                    /*{
                        path: /^\/contacts\/!*([^\/]*)*\/!*([^\/]*)*$/,
                        callbacks: function( req ) {
                            var
                                id = req.params[1] || null,
                                type = req.params[2] || null,
                                activeTab = settingsInSuiteNav.activeTab(),
                                activeTabName = activeTab && activeTab.name();

                            function publishState() {
                                var
                                    view = 'overview',
                                    params = { type: type };

                                if( id ) {
                                    view = 'detail';
                                    if( 'new' !== id ) {
                                        params.id = id;
                                    }
                                }

                                Y.fire( 'tab_contacts-state', {}, {
                                    view: view,
                                    params: params
                                } );
                            }

                            handleSubmenu();

                            if( 'tab_contacts' !== activeTabName ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow employee route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                getSpecialities().then( function( list ) {
                                    handleTab( "tab_contacts", {specialitiesList: list}, publishState );
                                } );
                            }
                            else {
                                publishState();
                            }

                        }
                    },*/
                    {
                        path: '/organisational-units',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow settings route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleSubmenu();
                            handleTab( "tab_organisational-units" );
                        }
                    },
                    {
                        path: '/tismcb',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow settings route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleSubmenu();
                            handleTab( 'tab_tismcb' );
                        }
                    },
                    {
                        path: '/ti-card-readers',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow settings route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleSubmenu();
                            handleTab( "tab_ti-card-readers" );
                        }
                    },
                    {
                        path: '/work-stations',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow settings route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleSubmenu();
                            handleTab( "tab_work-stations" );
                        }
                    },
                    {
                        path: '/ti',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow settings route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleSubmenu();
                            handleTab( "tab_ti" );
                        }
                    },
                    {
                        path: '/settings',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow settings route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            var pucUrl = self.mojitProxy.pageData.get( 'pucUrl' );
                            handleSubmenu();
                            handleTab( "tab_settings", {pucUrl: pucUrl} );
                        }
                    },
                    {
                        path: '/services',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow settings route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleSubmenu();
                            handleTab( 'tab_services' );
                        }
                    },
                    {
                        path: '/auditlog_browser',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow auditlog_browser route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleSubmenu( "tab_auditlog" );
                            handleTab( "tab_auditlog" );
                        }
                    },
                    {
                        path: '/malware_browser',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow auditlog_browser route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleSubmenu( "tab_malware" );
                            handleTab( "tab_malware" );
                        }
                    },
                    {
                        path: '/license_scope',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow license_scope route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleSubmenu( "tab_license" );
                            handleTab( "tab_license" );
                        }
                    },
                    {
                        path: '/system_messages',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow system_messages route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleSubmenu( "tab_system_messages" );
                            handleTab( "tab_system_messages" );
                        }
                    },
                    {
                        path: '/database',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow database route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleSubmenu( "tab_database" );
                            handleTab( "tab_database" );
                        }
                    },
                    {
                        path: '/system_terminal',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'MISMojit.terminal' ) ){
                                if( Y.config.debug ) {
                                    Y.log( 'Follow database route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( "tab_system_terminal", {systemLogging: Y.doccirrus.logging} );
                            }

                        }
                    }
                ]
            } );

            //  Set the default hash fragment, or action the route if one is given

            var routeTo = location.href.split( rootPath.replace( /^\//, '' ) + '#' );
            routeTo = ( routeTo.length < 2) ? '/' : routeTo[1];

            Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
            self.router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = self.router.getPath();
            Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );
        }
    };

}, '0.0.1', {
    requires: [
        'mojito-client',
        'logging-common',
        "DCBinder",
        'NavBarHeader',
        'doccirrus',
        'JsonRpcReflection-doccirrus',
        'dcerrortable',
        'dc-comctl',
        'dcutils',
        'dcauth',
        'dcauthpub',
        'DCRouter',
        'DCWindow',
        'DCSystemMessages',
        'KoUI-all',
        'KoViewModel',
        'dccatalogmap',
        'PracticeModel',
        'audit-schema',
        'dccommunication-client',
        'dcinfrastructs',
        'dcsettingsmodel',
        'dcschemaloader',
        'person-schema',
        'identity-schema',
        'employee-schema',
        'IdentityModel',
        'EmployeeModel',
        'simpleperson-schema',
        'LocationModel',
        'WeeklyTimeModel',
        'basecontact-schema',
        'BaseContactModel',
        'dcforms-utils',
        'RoleModel',
        'SettingsModel',
        'auditDiffDialog',
        'SupportBaseContactModel',
        'ContactModel',
        'PhysicianBaseContactModel',
        'InstitutionBaseContactModel',
        'AddContactModal',
        'v_therapistcontact-schema',
        'v_physician-schema',
        'ItemsTabFactory',
        'DCcliDialogs',
        'dcmedia',
        'ProfileMojitProfileManager',
        'dclanguagechangemodal',
        'OrganisationalUnitModel',
        'TiSMCBModel',
        'TiCardReaderModel',
        'WorkStationModel',
        'PinOperationModal',
        'WorkStationDeletionPreventedModal',
        'KoEditableTable',
        'KvcAccountsViewModel',
        'KimAccountsViewModel',
        'stocklocation-schema'
    ]
} );
