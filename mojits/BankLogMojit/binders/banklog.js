/*jslint anon:true, sloppy:true, nomen:true*/

/* global YUI, ko */
YUI.add( 'BankLogMojitBinder', function( Y, NAME ) {
    "use strict";
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

            self.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;
            self.titleTextI18n = i18n( 'DeviceLogMojit.title.text' );
            

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
                rootPath = Y.doccirrus.utils.getUrl( 'banklog' );
            let
                router;

            function handleTab(tabName, callback, data) {
                const node = document.querySelector( "#upperDiv" );
                if( node ) {
                    ko.cleanNode( node );
                }
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    'BankLogMojit',
                    data || {},
                    Y.one( node ),
                    function(){
                        let tab = self.subNavigation.getItemByName(tabName);
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
                            name: 'tab_overview',
                            href: rootPath+'#/overview',
                            text: i18n( 'BankLogMojit.tab_overview.title' )
                        },
                        {
                            name: 'tab_import',
                            href: rootPath+'#/import',
                            text: i18n( 'LabLogMojit.labLog.subNavigation.tab_import.title' )
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
                                Y.log( 'Follow overview route / '+JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_overview' );
                        }
                    },
                    {
                        path: '/overview',
                        callbacks: function BinderViewModel_route_overview( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow overview route / '+JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_overview' );
                        }
                    },
                    {
                        path: '/import',
                        callbacks: function BinderViewModel_route_import( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow import route / '+JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_import' );
                        }
                    }
                ]
            } );

            //  Set the default hash fragment, or action the route if one is given

            let routeTo = location.href.split( ''+rootPath.replace( /^\//, '' )+'#' );
            routeTo = ( routeTo.length < 2) ? '/' : routeTo[1];

            Y.log( 'Initial YUI router path: '+routeTo, 'debug', NAME );
            router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = router.getPath();
            Y.log( 'Parsed router path: '+routeTo, 'debug', NAME );

        },
        toggleFullScreenHandler() {
            Y.doccirrus.DCBinder.toggleFullScreen();
        }
    } );

    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'banklog',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
            Y.doccirrus.DCBinder.initToggleFullScreen();
        },

        bind: function( node ) {
            var
                self = this;
            Y.doccirrus.NavBarHeader.setActiveEntry( 'banklog' );
            self.binderViewModel = new BinderViewModel();
            ko.applyBindings( self.binderViewModel, node.getDOMNode() );
        }
    };

}, '0.0.1', {
    requires: [
        'oop',
        'router',
        'mojito-client',
        "DCBinder",
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
        'inpacslog-schema',
        'dcpatientandreceiptselect',
        'dccommonutils-ch'
    ]
} );
