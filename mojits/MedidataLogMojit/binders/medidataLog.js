/*jslint anon:true, sloppy:true, nomen:true*/

/* global YUI, ko, setViewportWide */
YUI.add( 'MedidataLogMojitBinder', function( Y, NAME ) {

    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel;

    function BinderViewModel( config ) {
        BinderViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( BinderViewModel, KoViewModel.getDisposable(), {
        overviewTable: null,

        initializer: function BinderViewModel_initializer() {
            var self = this;

            self.viewPortBtnI18n = i18n( 'CalendarMojit.calendar.title_attribute.VIEWPORTBTN' );
            self._initSubNavigation();
        },
        subNavigation: null,
        router: null,
        /**
         * initialize main sub navigation
         * @private
         */
        _initSubNavigation: function BinderViewModel__initSubNavigation() {
            const
                self = this,
                rootPath = Y.doccirrus.utils.getUrl( 'medidataLog' );
            var
                router;

            function handleTab(tabName, callback, data) {
                const node = document.querySelector( "#upperDiv" );
                if( node ) {
                    ko.cleanNode( node );
                }
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    'MedidataLogMojit',
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

            self.subNavigation = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: [
                        {
                            name: 'tab_received',
                            href: rootPath+'#/received',
                            text: i18n( 'MedidataLogMojit.tab_received.title' )
                        },
                        {
                            name: 'tab_sent',
                            href: rootPath+'#/sent',
                            text: i18n( 'MedidataLogMojit.tab_sent.title' )
                        },
                        {
                            name: 'tab_notifications',
                            href: rootPath+'#/notifications',
                            text: i18n( 'MedidataLogMojit.tab_notifications.title' )
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
                                Y.log( 'Follow received route / '+JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_received' );
                        }
                    },
                    {
                        path: '/received',
                        callbacks: function BinderViewModel_route_overview( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow received route / '+JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_received' );
                        }
                    },
                    {
                        path: '/sent',
                        callbacks: function BinderViewModel_route_import( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow sent route / '+JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_sent' );
                        }
                    },
                    {
                        path: '/notifications',
                        callbacks: function BinderViewModel_route_import( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow notifications route / '+JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_notifications' );
                        }
                    }
                ]
            } );

            //  Set the default hash fragment, or action the route if one is given

            var routeTo = location.href.split( ''+rootPath.replace( /^\//, '' )+'#' );
            routeTo = ( routeTo.length < 2) ? '/' : routeTo[1];

            Y.log( 'Initial YUI router path: '+routeTo, 'debug', NAME );
            router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = router.getPath();
            Y.log( 'Parsed router path: '+routeTo, 'debug', NAME );

        },
        toggleFullScreenHandler: function() {
            var
                viewportIsWide = Y.doccirrus.utils.localValueGet( 'cal_viewportIsWide' ) === 'false';

            setViewportWide( viewportIsWide );
            Y.doccirrus.utils.localValueSet( 'cal_viewportIsWide', viewportIsWide );
        }
    } );

    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'medidataLog',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        bind: function( node ) {
            var
                self = this;
            Y.doccirrus.NavBarHeader.setActiveEntry( 'medidataLog' );
            self.binderViewModel = new BinderViewModel();
            ko.applyBindings( self.binderViewModel, node.getDOMNode() );
        }
    };

}, '0.0.1', {
    requires: [
        'oop',
        'router',
        'mojito-client',
        'DCRouter',
        'doccirrus',
        'KoViewModel',
        'KoSchemaValue',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoUI-all',
        'dcquery',
        'doccirrus',
        'dcutils',
        'dc-comctl',
        'dcpatientandreceiptselect',
        'medidatalog-utils',
        'medidatalog-schema'
    ]
} );
