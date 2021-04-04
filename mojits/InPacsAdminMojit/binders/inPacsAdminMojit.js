
/* global YUI, ko */
YUI.add( 'InPacsAdminMojit', function( Y, NAME ) {
    'use strict';

    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        inPacsSchemaFull = Y.dcforms.reducedschema.loadSync( 'InPacs_T' );

    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'InPacsAdminMojit',

        isLoading: null,
        configuration: null,

        init: function( mojitProxy ) {

            this.mojitProxy = mojitProxy;

            this.mojitProxy.pageData.set( 'navigation', {
                navigation: null
            } );

            this.isLoading = ko.observable( true );
            this.configuration = ko.observable();

            this.inPacsSchema = this.prepareSchemaData( inPacsSchemaFull );
        },

        bind: function( node ) {
            this.doBind( node );
            /**
             * The current view is displayed as full screen
             * @type {null|ko.observable}
             */
            /** @protected */
            Y.doccirrus.DCBinder.initToggleFullScreen();
        },

        doBind: function( node ) {
            var
                self = this,
                rootPath = Y.doccirrus.utils.getUrl( 'inpacsAdmin' ),
                router,
                navigation = KoComponentManager.createComponent( {
                    componentType: 'KoNav',
                    componentConfig: {
                        items: Y.doccirrus.ItemsTabFactory.createInPacsAdminNavItems( { rootPath: rootPath } )
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

            Y.doccirrus.NavBarHeader.setActiveEntry( 'inpacsAdmin' );

            self.node = node;

            function handleTab( tabName, callback ) {
                var node = document.querySelector( "#upperDiv" );
                if( node ) {
                    ko.cleanNode( node );
                }
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    self.jaderef,
                    { binder: self },
                    Y.one( node ),
                    function() {
                        var tab = navigation.getItemByName( tabName );
                        if( tab ) {
                            tab.active( true );
                        }
                        if( callback ) {
                            return callback.apply( window, arguments );
                        }
                    }
                );
            }

            function handleWorkListTab( tabName, modality, callback ) {

                Y.doccirrus.jsonrpc.api.inpacsconfiguration
                    .read()
                    .done( function( response ) {
                        self.configuration( response.data[0] );
                        var node = document.querySelector( "#upperDiv" );
                        if( node ) {
                            ko.cleanNode( node );
                        }

                        YUI.dcJadeRepository.loadNodeFromTemplate(
                            'tab_inpacs_worklist',
                            self.jaderef,
                            {
                                binder: self,
                                modality: modality,
                                configuration: self.configuration(),
                                inPacsSchema: self.inPacsSchema
                            },
                            Y.one( node ),
                            function() {
                                var tab = navigation.getItemByName( tabName );
                                if( tab ) {
                                    tab.active( true );
                                }
                                if( callback ) {
                                    return callback.apply( window, arguments );
                                }
                            }
                        );
                    } );
            }

            this.mojitProxy.pageData.get( 'navigation' ).navigation = navigation;

            ko.applyBindings( navigation, document.querySelector( '#mainNavigation' ) );
            ko.applyBindings( fullScreenModel, document.querySelector( '#toggleFullScreenDiv' ) );

            var
                workListsRoutesArray = Y.doccirrus.schemas.inpacsworklist.types.WorkListType_E.list.map( function( worklist ) {
                    return {
                        path: '/' + worklist.i18n.toLowerCase(),
                        callbacks: function() {
                            handleWorkListTab( 'tab_inpacs_worklist_' + worklist.val.toLowerCase(), worklist );
                        }
                    };
                } );

            router = new Y.doccirrus.DCRouter( {
                root: rootPath,

                routes: [
                    {
                        path: '/',
                        callbacks: function( /*req*/ ) {
                            handleTab( 'tab_inpacs_settings' );
                        }
                    },
                    {
                        path: '/settings',
                        callbacks: function( /*req*/ ) {
                            handleTab( 'tab_inpacs_settings' );
                        }
                    },
                    {
                        path: '/luascripts',
                        callbacks: function( /*req*/ ) {
                            handleTab( 'tab_inpacs_luascripts' );
                        }
                    },
                    {
                        path: '/log',
                        callbacks: function() {
                            handleTab( 'tab_inpacs_log' );
                        }
                    }

                ].concat( workListsRoutesArray )
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

        prepareSchemaData: function( schema ) {
            var
                result = [],
                currentSchema = {},
                key,
                text;

            for( key in schema ) {
                if( schema.hasOwnProperty( key ) ) {
                    currentSchema = JSON.parse( JSON.stringify( schema[key] ) );

                    if( currentSchema.label ) {
                        text = currentSchema.label.de;

                        if( currentSchema.modelLabel &&
                            currentSchema.modelLabel.de &&
                            ('patient' === currentSchema.model ||
                             'location' === currentSchema.model ||
                             'employee' === currentSchema.model ||
                             'task' === currentSchema.model ||
                             'schedule' === currentSchema.model ||
                             'scheduletype' === currentSchema.model ||
                             'calendar' === currentSchema.model
                            ) ) {
                            text = currentSchema.modelLabel.de + ', ' + text;
                        }

                        result.push( {
                            text: text,
                            id: key,
                            model: currentSchema.model,
                            label: currentSchema.label,
                            type: currentSchema.type
                        } );

                    }
                }
            }
            return result;
        }
    };

}, '0.0.1', {
    requires: [
        "DCBinder",
        'oop',
        'router',
        'DCRouter',
        'mojito-client',
        'dcerrortable',
        'JsonRpcReflection-doccirrus',
        'KoUI-all',
        'intl',
        'KoUI-all',
        'mojito-intl-addon',
        'KoViewModel',
        'inpacsworklist-schema',
        'InPacsmodalityModel',
        'InPacsWorkListViewModel',
        'InPacsLuaScriptModel',
        'dcforms-reducedschema',
        'dcforms-schema-InPacs-T',
        'schemautils',
        'dc-comctl',
        'OrthancRestartDialog',
        'inpacsconfiguration-schema'
    ]
} );
