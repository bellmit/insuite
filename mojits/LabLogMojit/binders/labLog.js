/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'LabLogMojitBinder', function( Y, NAME ) {
    'use strict';
    var
        i18n = Y.doccirrus.i18n,
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    function BinderViewModel( config ) {
        BinderViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( BinderViewModel, Disposable, {
        initializer: function() {
            var
                self = this;

            self._initFile();
            self._initSubNavigation();
        },
        /**
         * The file data which might be spread about the different views
         * @type {null|ko.observable}
         */
        file: null,
        _initFile: function() {
            var
                self = this;

            self.file = ko.observable( null );
        },
        subNavigation: null,
        router: null,
        /**
         * initialize main sub navigation
         * @private
         */
        _initSubNavigation: function() {
            var
                self = this,
                rootPath = Y.doccirrus.utils.getUrl( 'labLog' ),
                router;

            self.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;

            function handleTab( tabName, callback, data ) {
                var node = document.querySelector( "#upperDiv" );
                if( node ) {
                    ko.cleanNode( node );
                }
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    'LabLogMojit',
                    data || {},
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

            self.subNavigation = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: [
                        {
                            name: 'tab_labLog',
                            href: rootPath + '#/labLog',
                            text: i18n( 'LabLogMojit.labLog.subNavigation.tab_labLog.title' )
                        },
                        {
                            name: 'tab_export',
                            href: rootPath + '#/export',
                            text: i18n( 'LabLogMojit.labLog.subNavigation.tab_export.title' ),
                            visible: false
                        },
                        {
                            name: 'tab_import',
                            href: rootPath + '#/import',
                            text: i18n( 'LabLogMojit.labLog.subNavigation.tab_import.title' )
                        },
                        {
                            name: 'tab_results_overview',
                            href: rootPath + '#/results',
                            text: i18n( 'LabLogMojit.labLog.subNavigation.tab_results_overview.title' )
                        }
                    ]
                }
            } );

            router = self.router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow labLog route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_labLog' );
                        }
                    },
                    {
                        path: '/labLog',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow labLog route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_labLog' );
                        }
                    },
                    {
                        path: '/export',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow export route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_export' );
                        }
                    },
                    {
                        path: '/import',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow import route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_import' );
                        }
                    },
                    {
                        path: '/results',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow results overview route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_results_overview' );
                        }
                    }
                ]
            } );

            //  Set the default hash fragment, or action the route if one is given

            var routeTo = location.href.split( rootPath.replace( /^\//, '' ) + '#' );
            routeTo = (routeTo.length < 2) ? '/' : routeTo[1];

            Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
            router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = router.getPath();
            Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );

        },
        toggleFullScreenHandler() {
            Y.doccirrus.DCBinder.toggleFullScreen();
        },
        /**
         * Unset spread file data
         * @method unsetFile
         */
        unsetFile: function() {
            var
                self = this;

            self.file( null );
        },
        /**
         * Visit the detail view of the passed file
         * @param {Object} file
         */
        visitFile: function( file ) {
            var
                self = this;

            self.file( file );
            self.router.save( ['/file', file.status, file._id].join( '/' ) );
        },
        /**
         * Visit the labLog view
         * @method visitLabLog
         */
        visitLabLog: function() {
            var
                self = this;

            self.router.save( '/labLog' );
        }
    } );

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
            var
                self = this;
            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'labLog' );
            Y.doccirrus.DCBinder.initToggleFullScreen();

            self.binderViewModel = new BinderViewModel();

            ko.applyBindings( self.binderViewModel, node.getDOMNode() );

        }

    };

}, '0.0.1', {
    requires: [
        "DCBinder",
        'oop',
        'NavBarHeader',
        'mojito-client',
        'doccirrus',
        'dccommonutils',
        'dcutils',
        'dcutils-uam',
        'dcauth',
        'dcerrortable',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'DCRouter',
        'DCWindow',
        'DCSystemMessages',
        'KoViewModel',
        'KoSchemaValue',
        'KoUI-all',
        'dcschemaloader',
        'lablog-schema',
        'person-schema',
        'labdata-finding-utils',
        'ldt_v_20',
        'ldt_v_20_old',
        'ldt_v_30',
        'ldt_v_310',
        'ldt_v_311',
        'ldt_v_312',
        'ldt_v_313',
        'ldt_v_321',
        'ldt_v_322',
        'ldt_v_323',
        'ldt_v_324',
        'ldt_v_325',
        'ldt_v_326',
        'ldt_v_327',
        'ldt_v_328',
        'ldt_v_329',
        'dc-assignLabLogData',
        'dc-labLogFileView'
    ]
} );
