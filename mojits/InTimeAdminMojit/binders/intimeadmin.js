/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'InTimeAdminMojitBinderIndex', function( Y, NAME ) {
    'use strict';


    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    /**
     * The InTimeAdminMojitBinderIndex module.
     *
     * @module InTimeAdminMojitBinderIndex
     */

    /**
     * Constructor for the InTimeAdminMojitBinderIndex class.
     *
     * @class InTimeAdminMojitBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'InTimeAdminMojit',

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
            Y.doccirrus.DCBinder.initToggleFullScreen();

            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'InTimeAdmin' );

            this.node = node;
            this._initSubNavigation();

        },
        router: null,
        /**
         * initialize main sub navigation
         * @private
         */
        _initSubNavigation: function() {
            var
                self = this,
                rootPath = Y.doccirrus.utils.getUrl( 'InTimeAdmin' ),
                router,
                intimeadminNav, fullScreenToggleInTimeAdmin;

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
                        var tab = intimeadminNav.getItemByName( tabName );
                        if( tab ) {
                            tab.active( true );
                        }
                        if( callback ) {
                            callback.apply( undefined, arguments );
                        }
                    }
                );
            }

            intimeadminNav = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: Y.doccirrus.ItemsTabFactory.createInTimeAdminNavItems( {
                        rootPath: rootPath
                    } )
                }
            } );

            fullScreenToggleInTimeAdmin = {
                toggleFullScreenHandler() {
                    Y.doccirrus.DCBinder.toggleFullScreen();
                },
                viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
            };

            ko.applyBindings( intimeadminNav, document.querySelector( '#intimeadminNav' ) );
            ko.applyBindings( fullScreenToggleInTimeAdmin, document.querySelector( '#fullScreenToggleInTimeAdmin' ) );

            router = self.router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow tab_calendars route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_calendars' );
                        }
                    },
                    {
                        path: '/calendars',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow tab_calendars route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_calendars' );
                        }
                    },
                    {
                        path: '/appointment-types',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow tab_appointment route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_appointment-types' );
                        }
                    },
                    {
                        path: '/close-days',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow tab_close-days route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_close-days' );
                        }
                    },
                    {
                        path: '/task-types',
                        callbacks: function() {
                            handleTab( 'tab_task_types' );
                        }
                    },
                    {
                        path: '/waiting-room',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow tab_waiting-room route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_waiting-room' );
                        }
                    },
                    {
                        path: '/notifications',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow tab_notifications route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_notifications' );
                        }
                    },
                    {
                        path: '/resources',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow tab_resources route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_resources' );
                        }
                    },
                    {
                        path: '/settings',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow tab_settings route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_settings' );
                        }
                    },
                    {
                        path: '/partner-calendar',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow tab_partner-calendar route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'tab_partner-calendar' );
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
        'NavBarHeader',
        'color',
        'arraysort',
        'ItemsTabFactory',
        'mojito-client',
        'doccirrus',
        'JsonRpcReflection-doccirrus',
        'dcerrortable',
        'dcutils',
        'dcauth',
        'DCRouter',
        'DCWindow',
        'DCSystemMessages',
        'KoUI-all',
        'KoViewModel',
        'KoComponentManager',
        'KoEditableTable',
        'ScheduletypeModel',
        'resource-schema',
        'PracticeModel',
        'calendar-schema',
        'v_closeday-schema',
        'schedule-schema',
        'DCTaskModal',
        'CalendarModel',
        'person-schema',
        'DcImportCloseTimeModal',
        'DcRepetitionsConfigModal',
        'tasktype-schema',
        'MirrorCalendarModel'
    ]
} );
