/*global YUI, ko */
YUI.add(
    'ShopNavigationBinderIndex',
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
                Y.doccirrus.NavBarHeader.setActiveEntry( 'shop' );
                this._initSubNavigation();
                Y.doccirrus.DCBinder.initToggleFullScreen();
            },

            _initSubNavigation: function() {
                var
                    self = this,
                    rootPath = Y.doccirrus.utils.getUrl( 'shop' ),
                    settingsInSuiteNav, fullScreenToggleInSuiteAdmin;

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
                        items: [
                            {
                                name: 'tab_shop',
                                text: 'Shop',
                                href: rootPath + '#/tab_shop'
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
                                handleTab( "tab_shop" );
                            }
                        },
                        {
                            path: '/tab_shop',
                            callbacks: function(  ) {
                                //handleSubmenu();
                                handleTab( "tab_shop" );
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
