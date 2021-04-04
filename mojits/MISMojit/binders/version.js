/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, jQuery, ko */
YUI.add(
    'MISMojitBinderVersion',
    function( Y, NAME ) {
        'use strict';

        var
            i18n = Y.doccirrus.i18n,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            ChangeLogModel = Y.doccirrus.KoViewModel.getConstructor( 'ChangeLogModel' );

        /**
         * Constructor for the MISMojitBinderVersion class.
         *
         * @class MISMojitBinderVersion
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

            jaderef: 'MISMojit',

            /**
             * The binder method, invoked to allow the mojit to attach DOM event
             * handlers.
             *
             * @param node {Node} The DOM node to which this mojit is attached.
             */
            bind: function( node ) {
                Y.doccirrus.NavBarHeader.setActiveEntry( 'version' );
                this.version = this.mojitProxy.pageData.get( 'version' );
                this.initFullScreenToggle();
                this.initNavigation();
                var
                    $node = jQuery( node.getDOMNode() ),
                    streamerURL = this.mojitProxy.pageData.get( 'streamerURL' );

                if( streamerURL ) {
                    $node.find( '.vbtn' ).attr( 'disabled', null );
                    $node.on( 'click', '.vbtn', function() {
                        var
                            $vbtn = jQuery( this ),
                            src1 = streamerURL + '?video=' + $vbtn.attr( 'name' ) + '&format=mp4',
                            src2 = streamerURL + '?video=' + $vbtn.attr( 'name' ) + '&format=webm';
                        jQuery( '#mp4' ).attr( {src: src1, type: 'video/mp4'} );
                        jQuery( '#webm' ).attr( {src: src2, type: 'video/webm'} );
                        jQuery( '#myModalLabel' ).text( $vbtn.attr( 'title' ) );
                        jQuery( '#video' ).load();
                        jQuery( '#videoModal' ).modal( 'show' );
                    } );
                }

                $node.on( 'click', '.prevVersion-slideToggle', function() {
                    var
                        prevVersion = jQuery( this ).parents( '.row' ),
                        prevVersionContent = prevVersion.find( '.prevVersion-content' );

                    prevVersionContent.slideToggle();
                } );
            },

            initNavigation: function() {
                var
                    self = this,
                    router,
                    rootPath = Y.doccirrus.utils.getUrl( 'version' ),
                    navigation = KoComponentManager.createComponent( {
                        componentType: 'KoNav',
                        componentConfig: {
                            items: [
                                {
                                    name: 'insuite',
                                    href: rootPath + '#/insuite',
                                    text: i18n( 'MISMojit.versionJS.menu.INSUITE' )
                                },
                                {
                                    name: 'mmi',
                                    href: rootPath + '#/mmi',
                                    text: i18n( 'MISMojit.versionJS.menu.MMI' )
                                }
                            ]
                        }
                    } );

                function handleTab( tabName ) {
                    var node = document.querySelector( "#upperDiv" ),
                        templateName = tabName;

                    if( node ) {
                        ko.cleanNode( node );
                    }

                    return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                        .renderFile( {path: self.jaderef + '/views/' + templateName} )
                    ).then( function( response ) {
                        return response && response.data;
                    } ).then( function( template ) {
                        node.innerHTML = template;
                        var tab = navigation.getItemByName( tabName );
                        if( tab ) {
                            tab.active( true );
                        }
                        ko.applyBindings( tabName === 'insuite' ? self.version : new ChangeLogModel(), node );
                    } ).catch( function( err ) {
                        Y.log( 'could not load tab template ' + templateName + ': ' + err, 'warn', NAME );
                    } );

                }

                ko.applyBindings( navigation, document.querySelector( '#mainVersionNavigation' ) );

                router = new Y.doccirrus.DCRouter( {
                    root: rootPath,

                    routes: [
                        {
                            path: '/',
                            callbacks: handleTab.bind( self, 'insuite' )
                        },
                        {
                            path: '/insuite',
                            callbacks: handleTab.bind( self, 'insuite' )
                        },
                        {
                            path: '/mmi',
                            callbacks: handleTab.bind( self, 'mmi' )
                        }
                    ]
                } );

                //  Set the default hash fragment, or action the route if one is given

                var routeTo = location.href.split( 'version#' );
                routeTo = (routeTo.length < 2) ? '/' : routeTo[1];

                Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
                router.save( routeTo );

                //  update - YUI router may have refused the route which was set
                routeTo = router.getPath();
                Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );
            },

            initFullScreenToggle() {
                Y.doccirrus.DCBinder.initToggleFullScreen();

                const fullScreenToggle = {
                    toggleFullScreenHandler: function() {
                        Y.doccirrus.DCBinder.toggleFullScreen();
                    },
                    viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
                };
                ko.applyBindings( fullScreenToggle, document.querySelector( '#fullScreenToggle' ) );
            }
        };

    },
    '0.0.1',
    {
        requires: [
            "DCBinder",
            'NavBarHeader',
            'mojito-client',
            'dcutils',
            'DCRouter',
            'ChangeLogModel'
        ]
    }
);
