/**
 * Serial-to-Ethernet Server Software Download Page
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, YUI_config, ko */

YUI.add( 'DeviceNavigationBinderIndex', function( Y, NAME ) {
    'use strict';
    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n;
        //self = this;

    Y.namespace( 'mojito.binders' )[NAME] = {

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
        bind: function bind( /*node*/ ) {
            var
            self = this;
            Y.doccirrus.DCBinder.initToggleFullScreen();
            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'inport' );

            self._initSubNavigation();
        },

        /**
         * initialize main sub navigation
         * @private
         */
        _initSubNavigation: function() {
            var
                self = this,
                cupsEnabled,
                items,
                rootPath = Y.doccirrus.utils.getUrl( 'inport' ),
                aSubNavigationModel, fullScreenToggleInPortAdmin;

            function handleTab( tabName, callback ) {
                var node = document.querySelector( "#upperDiv" );
                if( node ) {
                    ko.cleanNode( node );
                }
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    'DeviceMojit',
                    {},
                    Y.one( node ),
                    function() {
                        var tab = self.subNavigation.getItemByName( tabName );
                        if( tab ) {
                            tab.active( true );
                        }
                        if( callback ) {
                            callback.apply( undefined, arguments );
                        }
                    }
                );
            }
            
            aSubNavigationModel = self.subNavigation = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: []
                }
            } );

            cupsEnabled = YUI_config.doccirrus.Env.dccliCupsStatus && YUI_config.doccirrus.Env.dccliCupsStatus.enabled;
            items = Y.doccirrus.auth.isVPRCAdmin() ? [
                {
                    name: 'tab_printer',
                    href: cupsEnabled ? Y.doccirrus.utils.getUrl( 'inport' ) + '#/printer' : null,
                    text: i18n( 'DeviceMojit.device_nav.subNavigation.tab_printer.title' ),
                    disabled: !cupsEnabled
                }
            ] :  Y.doccirrus.ItemsTabFactory.createInPortAdminNavItems( { rootPath: rootPath, cupsEnabled: cupsEnabled } );
            self.subNavigation.addItems( items );

            fullScreenToggleInPortAdmin = {
                toggleFullScreenHandler() {
                    Y.doccirrus.DCBinder.toggleFullScreen();
                },
                viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
            };

            ko.applyBindings( aSubNavigationModel, document.querySelector( '#mainInPortNavigation' ) );
            ko.applyBindings( fullScreenToggleInPortAdmin, document.querySelector( '#fullScreenToggleInPortAdmin' ) );

            self.router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow cardreader route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_cardreader' );
                        }
                    },
                    {
                        path: '/cardreader',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow cardreader route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_cardreader' );
                        }
                    },
                    {
                        path: '/printer',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow printer route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_printer' );
                        }
                    },
                    {
                        path: '/scanner',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow scanner route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_scanner' );
                        }
                    },
                    {
                        path: '/inout',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow inout route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_inOut' );
                        }
                    },
                    {
                        path: '/serial',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow serial route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_serial' );
                        }
                    },
                    {
                        path: '/devices',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow devices route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_devices' );
                        }
                    },
                    {
                        path: '/flowlog',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow devices route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_flowlog' );
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
        "DCBinder",
        'mojito-client',
        'NavBarHeader',
        'doccirrus',
        'dcutils',
        'dcutils-uam',
        'inportmodel',
        'dcschemaloader',
        'dcvalidations',
        'dcauth',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dcinportmodal',
        'KoViewModel',
        'DCSourceConfigModal',
        'DCSinkConfigModal',
        'DCTransformerConfigModal',
        'FlowModel',
        'DCFlowModal',
        'KoUI-all',
        'DCRouter',
        'ItemsTabFactory',
        'dcRuleImportExport',
        'KoEditableTable',
        'cardreaderconfiguration-schema',
        'v_cardreaderconfiguration-schema',
        'settings-schema',
        'portscanmodal',
        'confprogrammodal',
        'deviceServerWarningModal'
    ]
} );
