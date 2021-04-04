/**
 * User: abhijit.baldawa
 * Date: 14.06.18  17:04
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI, ko */
YUI.add( 'GdtLogMojitBinder', function( Y, NAME ) {
    'use strict';
    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    function BinderViewModel( config ) {
        BinderViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( BinderViewModel, KoViewModel.getDisposable(), {
        subNavigation: null,
        router: null,
        initializer: function BinderViewModel_initializer() {
            var
                self = this;

            self._initSubNavigation();
        },
        /**
         * initialize main sub navigation
         * @private
         */
        _initSubNavigation: function BinderViewModel__initSubNavigation() {
            var
                self = this,
                rootPath = Y.doccirrus.utils.getUrl( 'gdtLog' ),
                router;

            function handleTab(tabName, callback, data) {
                var node = document.querySelector( "#upperDiv" );
                if( node ) {
                    ko.cleanNode( node );
                }
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    'GdtLogMojit',
                    data || {},
                    Y.one( node ),
                    function(){
                        var tab = self.subNavigation.getItemByName(tabName);
                        if (tab) {
                            tab.active(true);
                        }
                        if (callback) {
                            callback.apply(undefined, arguments);
                        }
                    }
                );
            }

            self.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;

            self.subNavigation = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: [
                        {
                            name: 'tab_gdtlog_overview',
                            href: rootPath + '#/received',
                            text: i18n( 'GdtLogMojit.tabGdtOverview.tabTitle' )
                        },
                        {
                            name: 'tab_gdt_export_log',
                            href: rootPath + '#/sent',
                            text: i18n( 'GdtLogMojit.tabGdtExportOverview.tabTitle' )
                        }
                    ]
                }
            } );

            router = self.router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: [
                    {
                        path: '/',
                        callbacks: function BinderViewModel_route_root( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow overview route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_gdtlog_overview' );
                        }
                    },
                    {
                        path: '/received',
                        callbacks: function BinderViewModel_route_overview( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow overview route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_gdtlog_overview' );
                        }
                    },
                    {
                        path: '/sent',
                        callbacks: function BinderViewModel_route_overview( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow overview route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_gdt_export_log' );
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

        },
        toggleFullScreenHandler() {
            Y.doccirrus.DCBinder.toggleFullScreen();
        }
    } );

    Y.namespace( 'mojito.binders' )[NAME] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function GdtLogMojitBinder_init( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },
        
        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function ( node ) {
            var
            self = this;
            Y.doccirrus.DCBinder.initToggleFullScreen();
            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'gdtLog' );

            self.binderViewModel = new BinderViewModel();

            ko.applyBindings( self.binderViewModel, node.getDOMNode() );

        }

    };

}, '0.0.1', {
    requires: [
        'oop',
        'NavBarHeader',
        'router',
        'mojito-intl-addon',
        'mojito-client',
        'doccirrus',
        'dccommonutils',
        'dcutils',
        'dcutils-uam',
        'dcauth',
        'dcerrortable',
        "DCBinder",
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'DCRouter',
        'DCWindow',
        'intl',
        'DCSystemMessages',
        'KoViewModel',
        'KoUI-all',
        'dcschemaloader',
        'inpacslog-schema',
        'gdtlog-schema',
        'gdtexportlog-schema',
        'flow-schema'
    ]
} );
