/**
 * User: pi
 * Date: 26/02/15  15:25
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko  */

Promise = window.bluebirdPromise; // eslint-disable-line no-native-reassign

import 'babel-polyfill';
import '../../../autoload/KoUI/KoComponentManager/KoComponentManager.client';
import '../../../autoload/YUI/DCRouter/DCRouter.client';
import '../../../autoload/KoUI/KoNav/KoNav.client';
import '../../../autoload/dcauth-obfuscated.client';
import '../../../autoload/utils/utils.client';

YUI.add( 'InTouchNavEntryPoint', function( Y, NAME ) {

    /**
     * @module IntouchNavigationBinderIndex
     */
    /**
     * @class IntouchNavigationBinderIndex
     * @constructor
     */
    Y.namespace( 'doccirrus.entryPoints' ).inTouchNavEntryPoint = {

        jaderef: 'IntouchPrivateMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        bind: function() {
            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'intouch' );
            Y.doccirrus.DCBinder.initToggleFullScreen();

            var navigation,
                fullScreenToggleInTouch,
                router,
                i18n = Y.doccirrus.i18n,
                KoUI = Y.doccirrus.KoUI,
                KoComponentManager = KoUI.KoComponentManager,
                items = [],
                rootPath = Y.doccirrus.utils.getUrl( 'intouch' ),
                PRESENCE_LIST = i18n( 'IntouchPrivateMojit.intouch_navJS.menu.PRESENCE_LIST' ),
                MISSED_CALLS = i18n( 'IntouchPrivateMojit.intouch_navJS.menu.MISSED_CALLS' ),
                CALLS = i18n( 'IntouchPrivateMojit.intouch_navJS.menu.CALLS' ),
                CALLER_LOG = i18n( 'IntouchPrivateMojit.intouch_navJS.menu.CALLER_LOG' );

            function loadHTML( params ) {
                var
                    viewName = params.viewName,
                    tabName = params.tabName || viewName,
                    binder = params.binder,
                    binderData = params.binderData,
                    node = document.querySelector( "#upperDiv" ),
                    newBinder = binder( Y );
                if( node ) {
                    ko.cleanNode( node );
                }
                /**
                 * 1. Load html
                 * 2. Activate Tab
                 * 3. Call entry method inside binder
                 */
                return YUI.dcJadeRepository.loadNodeHTML(
                    {
                        path: 'IntouchPrivateMojit/views/' + viewName,
                        node: Y.one( node ),
                        binder: newBinder,
                        binderData: binderData
                    }
                )
                    .then( function() {
                        var
                            tab = navigation.getItemByName( tabName );
                        if( tab ) {
                            tab.active( true );
                        }
                    } );
            }

            items = [
                { name: 'intouch_presence_list', href: rootPath + '#/presence', text: PRESENCE_LIST },
                { name: 'rejected_calls_list', href: rootPath + '#/calls/rejected', text: MISSED_CALLS },
                { name: 'accepted_calls_list', href: rootPath + '#/calls/accepted', text: CALLS }
            ];

            if( Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.SUPPORT ) ) {
                items.push(
                    { name: 'inphone_caller_log', href: rootPath + '#/callerLog', text: CALLER_LOG }
                );
            }

            navigation = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: items
                }
            } );

            fullScreenToggleInTouch = {
                toggleFullScreenHandler() {
                    Y.doccirrus.DCBinder.toggleFullScreen();
                },
                viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
            };

            ko.applyBindings( navigation, document.querySelector( '#mainIntouchNavigation' ) );
            ko.applyBindings( fullScreenToggleInTouch, document.querySelector( '#fullScreenToggleInTouch' ) );

            function loadPresenceListTab() {
                return import(/*webpackChunkName: "intouch_presence_list"*/ '../client/intouch_presence_list' )
                    .then( function( binder ) {
                        return loadHTML( { viewName: 'intouch_presence_list', binder: binder.default });
                    } );
            }

            function loadInPhoneCallerLogTab() {
                return import(/*webpackChunkName: "inphone_caller_log"*/ '../client/inphone_caller_log' )
                    .then( function( binder ) {
                        return loadHTML( { viewName: 'inphone_caller_log', binder: binder.default } );
                    } );
            }
            function loadCallsList(req){
                var state = req.params.state || 'rejected';
                return import(/*webpackChunkName: "intouch_calls_list"*/ '../client/intouch_calls_list' )
                    .then( function( binder ) {
                        return loadHTML( {
                            viewName: 'intouch_calls_list',
                            tabName: state + '_calls_list',
                            binder: binder.default,
                            binderData: { state: state }
                        } );
                    } );
            }
            router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow default Intouch route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            return loadPresenceListTab();
                        }
                    },
                    {
                        path: '/presence',
                        callbacks: function() {
                            return loadPresenceListTab();
                        }
                    },
                    {
                        path: '/calls/:state',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow intouch_calls_list Intouch route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            return loadCallsList( req );
                        }
                    },
                    {
                        path: '/callerLog',
                        callbacks: function() {
                            return loadInPhoneCallerLogTab();
                        }
                    }
                ]
            } );

            //  Set the default hash fragment, or action the route if one is given
            var routeTo = location.href.split( 'intouch#' );
            routeTo = (routeTo.length < 2) ? '/' : routeTo[ 1 ];

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
        'DCRouter',
        'KoComponentManager',
        'KoNav',
        'dcauth',
        'dcutils'
    ]
} );