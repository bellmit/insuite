/*jslint anon:true, sloppy:true, nomen:true*/

/* global YUI, ko */
YUI.add( 'IsDispatcherMojitBinder', function( Y, NAME ) {
    "use strict";
    /**
     * The IsDispatcherMojitBinder module.
     *
     * @module IsDispatcherMojitBinder
     */

    var i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    /**
     * Constructor for the IsDispatcherMojitBinderIndex class.
     *
     * @class IsDispatcherMojitBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'IsDispatcherMojit',

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;

            this.mojitProxy.pageData.set( 'navigation', {
                navigation: null
            } );
        },

        /**
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function( node ) {
            var
                binder = this,
                rootPath = Y.doccirrus.utils.getUrl( 'dispatcher' ),
                router,
                navigation = KoComponentManager.createComponent( {
                    componentType: 'KoNav',
                    componentConfig: {
                        items: [
                            {
                                name: 'tab_prcs',
                                href: rootPath + '#/prcs',
                                text: i18n( 'IsDispatcherMojit.tab_prc.title' )
                            },
                            {
                                name: 'tab_requests_failed',
                                href: rootPath + '#/requests/failed',
                                text: i18n( 'IsDispatcherMojit.tab_requests.tab_failed_title' ),
                                visible: Y.doccirrus.auth.isINCARE()
                            },
                            {
                                name: 'tab_requests_completed',
                                href: rootPath + '#/requests/completed',
                                text: i18n( 'IsDispatcherMojit.tab_requests.tab_completed_title' ),
                                visible: Y.doccirrus.auth.isINCARE()
                            }
                        ]
                    }
                } ),
                fullScreenModel = {
                    /**
                     * Handler of the toggle full-screen action
                     */
                    toggleFullScreenHandler() {
                        Y.doccirrus.DCBinder.toggleFullScreen();
                    },
                    viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
                };
            
            Y.doccirrus.DCBinder.initToggleFullScreen();

            Y.doccirrus.NavBarHeader.setActiveEntry( 'dispatcher' );

            this.node = node;
            function handleTab( tabName, callback, data ) {
                var node = document.querySelector( "#upperDiv" );
                if( node ) {
                    ko.cleanNode( node );
                }
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    binder.jaderef,
                    data || {},
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

            this.mojitProxy.pageData.get( 'navigation' ).navigation = navigation;

            ko.applyBindings( navigation, document.querySelector( '#mainDispatcherNavigation' ) );
            ko.applyBindings( fullScreenModel, document.querySelector( '#toggleFullScreenDiv' ) );

            function publishState( id, eventToFire ) {
                var
                    view = 'overview',
                    params = {};

                if( id ) {
                    view = 'detail';
                    if( 'new' !== id ) {
                        params.id = id;
                    }
                }

                Y.fire( eventToFire, {}, {
                    view: view,
                    params: params
                } );
            }

            router = new Y.doccirrus.DCRouter( {
                root: rootPath,

                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            var id = req.params[1] || null;
                            handleTab( 'tab_prcs', publishState.bind( this, id, 'tab_prcs-state' ) );
                        }
                    },
                    {
                        path: /^\/prcs\/*([^\/]*)*\/*([^\/]*)*$/,
                        callbacks: function( req ) {
                            var id = req.params[1] || null;
                            handleTab( 'tab_prcs', publishState.bind( this, id, 'tab_prcs-state' ) );
                        }
                    },
                    {
                        path: /^\/requests\/failed\/*([^\/]*)*\/*([^\/]*)*$/,
                        callbacks: function( req ) {
                            var id = req.params[1] || null;
                            handleTab( 'tab_requests_failed', publishState.bind( this, id, 'tab_requests-state' ), {status: {'$eq': 0}} );
                        }
                    },
                    {
                        path: '/requests/completed',
                        callbacks: function( req ) {
                            var id = req.params[1] || null;
                            handleTab( 'tab_requests_completed', publishState.bind( this, id, 'tab_requests-state' ), {status: {'$in': [1, 2, 3]}} );
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
        'router',
        'mojito-client',
        'dcerrortable',
        'JsonRpcReflection-doccirrus',
        'KoUI-all',
        'DCRouter',
        'KoViewModel',
        'dcrequestmodel',
        'dispatchrequest-schema',
        'dcactivitysettingsmodel',
        'activity-api',
        'activitysettings-schema',
        'dcauth',
        'activity-schema',
        'identity-schema',
        'dcactivitysettingsmodel',
        'activitysettings-api',
        'dccatalogmap',
        'dcpatientmodel',
        'KoBaseContact',
        'prcdispatch-schema',
        'intl',
        'mojito-intl-addon',
        'patient-schema',
        'template',
        'RequestViewModel',
        'dcauth'
    ]
} );
