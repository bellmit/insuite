/* global YUI, ko */

import 'babel-polyfill';
import '../../../autoload/YUI/DCRouter/DCRouter.client';
import '../../../autoload/ItemsTabFactory.client';
Promise = window.bluebirdPromise; // eslint-disable-line no-native-reassign

YUI.add( 'TasksNavEntryPoint', function( Y, NAME ) {

    var KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    Y.namespace( 'doccirrus.entryPoints' ).TasksNavEntryPoint = {

        jaderef: 'TaskMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
            this.mojitProxy.pageData.set( 'navigation', {
                navigation: null
            } );
        },

        bind: function( node ) {
            var
                self = this;

            self.getIntimeConfig()
                .then( function( res ) {
                    var
                        activateOverview = res && res.activateOverview || false;

                    function publishState( id, eventToFire ) {
                        var
                            view = 'details',
                            params = {
                                id: id
                            };

                        Y.fire( eventToFire, {}, {
                            view: view,
                            params: params
                        } );
                    }

                    Y.doccirrus.NavBarHeader.setActiveEntry( 'tasks' );
                    self.node = node;

                    var
                        rootPath = Y.doccirrus.utils.getUrl( 'tasks' ),
                        router,
                        routes,
                        navigation = KoComponentManager.createComponent( {
                            componentType: 'KoNav',
                            componentConfig: {
                                items: Y.doccirrus.ItemsTabFactory.createTaskNavItems( { rootPath: rootPath,  activateOverview: activateOverview } )
                            }
                        } ),
                        fullScreenModel = {
                            viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n,
                            /**
                             * Handler of the toggle full-screen action
                             */
                            toggleFullScreenHandler () {
                                Y.doccirrus.DCBinder.toggleFullScreen();
                            }
                        };

                    function handleTab( tabName, callback ) {
                        var node = document.querySelector( "#upperDiv" );
                        if( node ) {
                            ko.cleanNode( node );
                        }
                        YUI.dcJadeRepository.loadNodeFromTemplate(
                            tabName,
                            self.jaderef,
                            {},
                            Y.one( node ),
                            function() {
                                var tab = navigation.getItemByName( tabName );
                                if( tab ) {
                                    tab.active( true );
                                }
                                if( callback ) {
                                    callback.apply( undefined, arguments );
                                }
                            }
                        );
                    }

                    Y.doccirrus.DCBinder.initToggleFullScreen();

                    self.mojitProxy.pageData.get( 'navigation' ).navigation = navigation;

                    ko.applyBindings( navigation, document.querySelector( '#mainTasksNavigation' ) );
                    ko.applyBindings( fullScreenModel, document.querySelector( '#toggleFullScreenDiv' ) );

                    //activateOverview
                    routes = [].concat([
                        {
                            path: '/',
                            callbacks: function() {
                                handleTab( 'tab_tasks_active' );
                            }
                        },
                        {
                            path: /^\/details\/*([^\/]*)*\/*([^\/]*)*$/,
                            callbacks: function( req ) {
                                var id = req.params[1] || null;
                                handleTab( 'tab_tasks_active', publishState.bind( this, id, 'tab_tasks-state' ) );
                            }
                        },
                        {
                            path: '/completed',
                            callbacks: function() {
                                handleTab( 'tab_tasks_closed' );
                            }
                        },
                        {
                            path: '/active',
                            callbacks: function() {
                                handleTab( 'tab_tasks_active' );
                            }
                        }
                    ]);

                    if( activateOverview ) {
                        routes.push( {
                            path: '/graphic',
                            callbacks: function() {
                                handleTab( 'tab_tasks_graphic' );
                            }
                        });
                    }

                    router = new Y.doccirrus.DCRouter( {
                        root: rootPath,

                        routes: routes
                    } );

                    //  Set the default hash fragment, or action the route if one is given
                    var routeTo = location.href.split( rootPath.replace( /^\//, '' ) + '#' );
                    routeTo = ( routeTo.length < 2) ? '/' : routeTo[1];

                    Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
                    router.save( routeTo );

                    //  update - YUI router may have refused the route which was set
                    routeTo = router.getPath();
                    Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );
                });
        },

        location: function() {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.location
                .read()
                .then( function( response ) {
                    return Y.Lang.isArray( response.data ) && response.data || [];
                } ) );
        },

        getIntimeConfig: function() {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.practice
                .getIntimeConfig()
                .then( function( response ) {
                    return response && response.data || null;
                } ) );
        }

    };

}, '0.0.1', {
    requires: [
        "DCBinder",
        'router',
        'mojito-client',
        'JsonRpcReflection-doccirrus',
        'KoUI-all',
        'intl',
        'DCTaskModal',
        'KoViewModel',
        'TaskViewModel',
        'DCRouter',
        'ItemsTabFactory'
    ]
} );
