/*global YUI, ko */
YUI.add(
    'HandbuchNavigationBinderIndex',
    function( Y, NAME ) {
        'use strict';

        var
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager;

        /**
         * Constructor for the MISMojitBinderFaq class.
         *
         * @class MISMojitBinderFaq
         * @constructor
         */
        Y.namespace( 'mojito.binders' )[NAME] = {
            jaderef: 'MISMojit',
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
            bind: function( /*node*/ ) {
                var pathname = this.mojitProxy.pageData.get( 'pathname' );
                Y.doccirrus.NavBarHeader.setActiveEntry( 'handbuch' );
                
                this._initSubNavigation( {
                    pathname: pathname
                } );
                Y.doccirrus.DCBinder.initToggleFullScreen();
            },

            _initSubNavigation: function( params ) {
                var
                    self = this,
                    pathname = params.pathname,
                    rootPath = Y.doccirrus.utils.getUrl( 'handbuch' ),
                    settingsInSuiteNav, fullScreenToggleInSuiteAdmin;

                // function handleSubmenu( submenu ) {
                //     Y.Array.invoke( settingsInSuiteNav.getItemByName( "menu-system" ).menu.items.peek(), "active", false );
                //     if( submenu ) {
                //         settingsInSuiteNav.getItemByName( "menu-system" ).menu.getItemByName( submenu ).active( true );
                //         settingsInSuiteNav.getItemByName( "menu-system" ).active( true );
                //     }
                // }

                function handleTab( tabName ) {
                    var node = document.querySelector( "#upperDiv" );
                    if( node ) {
                        ko.cleanNode( node );
                    }
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        tabName,
                        self.jaderef,
                        {
                            pathname: pathname
                        },
                        Y.one( node ),
                        function() {
                            var tab = settingsInSuiteNav.getItemByName( tabName );
                            if( tab ) {
                                tab.active( true );
                            }
                        }
                    );
                }

                settingsInSuiteNav = KoComponentManager.createComponent( {
                    componentType: 'KoNav',
                    componentConfig: {
                        items: [
                            {
                                name: 'tab_handbuch',
                                text: 'Handbuch',
                                href: rootPath + '#/tab_handbuch'
                            }
                        ]
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
                            callbacks: function(  ) {
                                //handleSubmenu();
                                handleTab( "tab_handbuch" );
                            }
                        },
                        {
                            path: '/tab_handbuch',
                            callbacks: function(  ) {
                                //handleSubmenu();
                                handleTab( "tab_handbuch" );
                            }
                        }
                        // {
                        //     path: '/company',
                        //     callbacks: function( req ) {
                        //         if( Y.config.debug ) {
                        //             Y.log( 'Follow company route / ' + JSON.stringify( req.params ), 'debug', NAME );
                        //         }
                        //         handleSubmenu();
                        //         handleTab( "tab_company" );
                        //     }
                        // }
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

    },
    '0.0.1',
    {
        requires: [
            "DCBinder",
            'NavBarHeader',
            'mojito-client',
            'DCRouter'
        ]
    }
);
