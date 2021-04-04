/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'MISMojitBinderTools', function( Y, NAME ) {
    'use strict';

    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    /**
     * The MISMojitBinderTools module.
     *
     * @module MISMojitBinderTools
     */

    /**
     * Constructor for the MISMojitBinderTools class.
     *
     * @class MISMojitBinderTools
     * @constructor
     */
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
        bind: function( node ) {

            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'tools' );

            this.node = node;
            this._initSubNavigation();
            Y.doccirrus.DCBinder.initToggleFullScreen();

        },
        router: null,
        /**
         * initialize main sub navigation
         * @private
         */
        _initSubNavigation: function() {
            var
                self = this,
                rootPath = Y.doccirrus.utils.getUrl( 'tools' ),
                router,
                toolsNav, fullScreenToggleTools;

            function handleTab( tabName, callback ) {
                var node = document.querySelector( "#upperDiv" );
                if( node ) {
                    ko.cleanNode( node );
                }
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    "MISMojit",
                    {},
                    Y.one( node ),
                    function() {
                        var tab = toolsNav.getItemByName( tabName );
                        if( tab ) {
                            tab.active( true );
                        }
                        if( callback ) {
                            callback.apply( undefined, arguments );
                        }
                    }
                );
            }

            toolsNav = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: Y.doccirrus.ItemsTabFactory.createSupportToolsItems( {
                        rootPath: rootPath
                    } )
                }
            } );

            fullScreenToggleTools = {
                toggleFullScreenHandler: function() {
                    Y.doccirrus.DCBinder.toggleFullScreen();
                },
                viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
            };

            ko.applyBindings( toolsNav, document.querySelector( '#toolsNav' ) );
            ko.applyBindings( fullScreenToggleTools, document.querySelector( '#fullScreenToggleTools' ) );

            router = self.router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow tab_connectivity route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_connectivity' );
                        }
                    },
                    {
                        path: '/connectivity',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow tab_connectivity route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_connectivity' );
                        }
                    },
                    {
                        path: '/logs',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow tab_logs route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_logs' );
                        }
                    },
                    {
                        path: '/terminal',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'MISMojit.terminal' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow tab_terminal route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'tab_terminal' );
                            }
                        }
                    },
                    {
                        path: '/console',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'MISMojit.console' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow tab_terminal route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'tab_console' );
                            }
                        }
                    }
                ]
            } );

            //  Set the default hash fragment, or action the route if one is given

            var routeTo = location.href.split( rootPath.replace( /^\//, '' ) + '#' );
            routeTo = ( routeTo.length < 2) ? '/' : routeTo[1];

            Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
            router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = router.getPath();
            Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );
        }

    };

}, '0.0.1', {
    requires: [
        "DCBinder",
        'NavBarHeader',
        'DCRouter',
        'audit-schema',
        'mojito-client'
    ]
} );
