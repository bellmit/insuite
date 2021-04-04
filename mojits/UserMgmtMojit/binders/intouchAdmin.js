/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'intouchAdmin', function( Y, NAME ) {
    'use strict';

    /**
     * Constructor for the intouchAdmin class.
     * @class intouchAdmin
     * @constructor
     */

    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'UserMgmtMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
            Y.doccirrus.DCBinder.initToggleFullScreen();
        },

        /**
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function( node, element ) {
            var
                self = this;

            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'intouchAdmin' );

            self.node = node;
            self.applyBindings = {};
            self.applyBindings.toggleFullScreenHandler = function() {
                Y.doccirrus.DCBinder.toggleFullScreen();
            };
            Y.doccirrus.DCBinder.initToggleFullScreen();

            self._initSubNavigation();

            self.applyBindings.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;

            ko.applyBindings( self.applyBindings, element );

        },

        /**
         * initialize main sub navigation
         * @private
         */
        _initSubNavigation: function() {
            var
                self = this,
                KoUI = Y.doccirrus.KoUI,
                KoComponentManager = KoUI.KoComponentManager,
                rootPath = Y.doccirrus.utils.getUrl( 'intouchAdmin' ),
                router;

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
                        var tab = self.applyBindings.intouchAdminNavigation.getItemByName( tabName );
                        if( tab ) {
                            tab.active( true );
                        }
                        if( callback ) {
                            callback.apply( undefined, arguments );
                        }
                    }
                );
            }

            self.applyBindings.intouchAdminNavigation = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: Y.doccirrus.ItemsTabFactory.createInTouchAdminNavItems( {
                        rootPath: rootPath
                    } )
                }
            } );

            router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow default InTouch route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'partners' );
                        }
                    },
                    {
                        path: '/partners',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow markers InTouch route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'partners' );
                        }
                    },
                    {
                        path: '/encryption',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow catalogs InTouch route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'encryption_setting' );
                        }
                    },
                    {
                        path: '/transfer_settings',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow catalogs InTouch route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'transfer_settings' );
                        }
                    },
                    {
                        path: '/transfer_conflicts',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow catalogs InTouch route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'transfer_conflicts' );
                        }
                    }
                ]
            } );

            //  Set the default hash fragment, or action the route if one is given

            var routeTo = location.href.split( 'intouch#' );
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
        // YUI
        'mojito-client',
        'router',
        // common
        'NavBarHeader',
        'doccirrus',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'DCRouter',
        'KoUI-all',
        'DCWindow',
        // required by partners
        'dcpartnertable',
        'cdpartnereditmodal',
        // required by encryption_setting
        'dcajax',
        'dcinfrastructs',
        'dcerrortable',
        'ItemsTabFactory',

        'KoViewModel',
        'KoComponentManager',
        'KoEditableTable',
        //required by transfer_settings
        'InSightTimelineViewModel',
        'dcactivitiesmodal',
        'dcanonymizemodal',
        //required by transfer_conflicts
        'dcconflictstable',
        'auditDiffDialog'
    ]
} );