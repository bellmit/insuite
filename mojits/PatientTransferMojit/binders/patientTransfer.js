/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */


YUI.add( 'PatientTransferMojit', function( Y, NAME ) {
    'use strict';

    var
        KoUI = Y.doccirrus.KoUI,
        i18n = Y.doccirrus.i18n,
        KoComponentManager = KoUI.KoComponentManager;

    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'PatientTransferMojit',

        init: function PatientTransferMojit_init( mojitProxy ) {
            this.mojitProxy = mojitProxy;

            this.mojitProxy.pageData.set( 'navigation', {
                navigation: null
            } );
        },

        bind: function PatientTransferMojit_bind( node ) {
            var
                self = this,
                rootPath = Y.doccirrus.utils.getUrl( 'transferLog' ),
                navigation = KoComponentManager.createComponent( {
                    componentType: 'KoNav',
                    componentConfig: {
                        items: Y.doccirrus.ItemsTabFactory.createTransferNavItems( { rootPath: rootPath } )
                    }
                } ),
                router,
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

            Y.doccirrus.NavBarHeader.setActiveEntry( 'transferLog' );

            self.node = node;

            function handleTab( tabName, config, callback ) {
                var node = document.querySelector( "#upperDiv" ),
                    pageTitle;
                switch( tabName ) {
                    case 'tab_transfers_sent':
                        pageTitle = i18n( 'PatientTransferMojit.title.PAGE_SENT' );
                        break;
                    case 'tab_new_message':
                        pageTitle = i18n( 'PatientTransferMojit.title.PAGE_NEW_MESSAGE' );
                        break;
                    case 'tab_transfers_received':
                        pageTitle = i18n( 'PatientTransferMojit.title.PAGE_RECEIVED' );
                        break;
                }
                document.title = pageTitle;
                if( node ) {
                    ko.cleanNode( node );
                }
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    self.jaderef,
                    config || {},
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

            this.mojitProxy.pageData.get( 'navigation' ).navigation = navigation;

            ko.applyBindings( navigation, document.querySelector( '#mainNavigation' ) );
            ko.applyBindings( fullScreenModel, document.querySelector( '#toggleFullScreenDiv' ) );

            router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: [
                    {
                        path: '/',
                        callbacks: function() {
                            Y.doccirrus.jsonrpc.api.incaseconfiguration
                                .readConfig()
                                .then( function( response ) {
                                    handleTab( 'tab_transfers_received', { incaseconfiguration: response.data } );
                                } );
                        }
                    },
                    {
                        path: /^\/received\/*([^\/]*)*\/*([^\/]*)*$/,
                        callbacks: function( req ) {
                            Y.doccirrus.jsonrpc.api.incaseconfiguration
                                .readConfig()
                                .then( function( response ) {
                                    handleTab( 'tab_transfers_received', { logEntryId: req.params[1] || null, incaseconfiguration: response.data });
                                } );


                        }
                    },
                    {
                        path: /^\/sent\/*([^\/]*)*\/*([^\/]*)*$/,
                        callbacks: function( req ) {
                            handleTab( 'tab_transfers_sent', { transferLogEntryId: req.params[1] || null } );
                        }
                    },
                    {
                        path: '/newMessage',
                        callbacks: function() {
                            handleTab( 'tab_new_message' );
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
        'KoUI-all',
        'dcschemaloader',
        'patienttransfer-schema',
        'crselectpatientmodal',
        'ActivityModel',
        'activitysettings-api',
        'audit-schema',
        'linkedattachedimagesmodal',
        'dcpreviewtranfermodal',
        'MessageViewModel',
        'dcpatientupdatemodal',
        'selectcasefoldermodal'
    ]
} );
