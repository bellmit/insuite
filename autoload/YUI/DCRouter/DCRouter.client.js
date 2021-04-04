/*jslint anon:true, nomen:true*/
/*global YUI, jQuery*/
YUI.add( 'DCRouter', function( Y, NAME ) {
    'use strict';

    /**
     * @module DCRouter
     */

    var
        i18n = Y.doccirrus.i18n,

        BEFOREUNLOAD_MESSAGE = i18n( 'dcnavigation.beforeUnloadView.beforeunload.message' );

    /**
     * @example
     var
     rootPath = Y.doccirrus.utils.getUrl( 'myRouteSpecName' ),
     router = new Y.doccirrus.DCRouter( {
         root: rootPath,
         routes: [
             {
                 path: '/',
                 callbacks: function() {
                     console.warn( '/' );
                 }
             },
             {
                 path: '/something',
                 callbacks: function() {
                     console.warn( '/something' );
                 }
             },
             {
                 path: '/somewhat',
                 callbacks: function() {
                     console.warn( '/somewhat' );
                 }
             },
             {
                 path: '*',
                 callbacks: function() {
                     console.warn( 'catch other' );
                 }
             }
         ]
     } );

     if( router.match( router.getPath() ).length ) {
         router.dispatch();
     }
     else {
         router.replace( '/' );
     }

     router.on( 'beforeUnloadView', function( yEvent, event ) {
         if( true ) {
             yEvent.halt( true );
         }
     } );

     * @class DCRouter
     * @extends Y.Router
     * @constructor
     * @beta
     */
    function DCRouter() {
        DCRouter.superclass.constructor.apply( this, arguments );
    }

    Y.extend( DCRouter, Y.Router, {
        /** @private */
        initializer: function DCRouter_initializer() {
            var
                self = this,
                appRegs;

            /**
             * array for route overrides
             * @type {Y.doccirrus.DCRouteOverrideCollection}
             * @private
             */
            self._routeOverrides = new Y.doccirrus.DCRouteOverrideCollection();

            // add route overrides for each appReg which has some registered
            if( Y.doccirrus.auth ) {
                if( !Y.doccirrus.auth.isPatientPortal() ) {
                    appRegs = Y.doccirrus.auth.getAppRegs();
                    if( Array.isArray( appRegs ) ) {
                        appRegs.forEach( function( appReg ) {
                            if( appReg && appReg.routeOverrideConfiguration && Array.isArray( appReg.routeOverrideConfiguration ) ) {
                                appReg.routeOverrideConfiguration.forEach( function( overrideConfig ) {
                                    self._routeOverrides.push( new Y.doccirrus.DCRouteOverride( overrideConfig ) );
                                } );
                            }
                        } );
                    }
                }
            }

            self._initBeforeUnloadView();
        },
        /** @private */
        destructor: function DCRouter_destructor() {
            var
                self = this;

            if( self._onLoadHandle ) {
                self._onLoadHandle.detach();
                self._onLoadHandle = null;
            }

            if( self._routeOverrides ) {
                self._routeOverrides = null;
            }

            if( self._beforeUnloadViewHandle ) {
                self._beforeUnloadViewHandle.detachAll();
                self._beforeUnloadViewHandle = null;
            }

            if( self._beforeunloadHandle ) {
                self._beforeunloadHandle.detach();
                self._beforeunloadHandle = null;
            }

            if( self._popstateHandle ) {
                self._popstateHandle.detach();
                self._popstateHandle = null;
            }
        },
        /** @private */
        _queue: function DCRouter__queue() {
            var
                args = arguments,
                self = this,
                route = args[0],
                beforeUnloadView = {
                    type: DCRouter.beforeUnloadView.type.router,
                    router: {
                        href: null,
                        route: route,
                        instance: self,
                        getPath: self.getPath(),
                        goRoute: function goRoute() {
                            self._queue.apply( self, args );
                        }
                    }
                };

            if( self.fire( 'beforeUnloadView', {}, beforeUnloadView ) ) {
                return DCRouter.superclass._queue.apply( self, arguments );
            }

            return self;
        },
        /**
         * @type {null|Y.CustomEvent}
         * @private
         */
        _beforeUnloadViewHandle: null,
        /**
         * @type {null|Y.EventHandle}
         * @private
         */
        _beforeunloadHandle: null,

        /**
         Handles `history:change` and `hashchange` events.

         @method _afterHistoryChange
         @param {EventFacade} e
         @protected
         **/
        _afterHistoryChange: function( /*e*/ ) {
            var
                self = this;

            if( self.preventDispatching ) {
                return;
            }

            DCRouter.superclass._afterHistoryChange.apply( this, arguments );

        },
        /**
         * @type {null|Y.EventHandle}
         * @private
         */
        _popstateHandle: null,
        /** @private */
        _initBeforeUnloadView: function DCRouter__initBeforeUnloadView() {
            var
                self = this,
                type = DCRouter.beforeUnloadView.type;

            /**
             * The event is fired, when registered and a view may unload.
             * The view may unload by using a router and external actions (such as visiting another page, reloading/leaving a page).
             *
             * There are constants to check the type against (in {{#crossLink "DCRouter/beforeUnloadView:property"}}"DCRouter.beforeUnloadView.type"{{/crossLink}})
             * - in case an external action is triggered, it will provide an beforeunload event type and the event data for it
             * - in case it was configured using a router, it will provide a router event type and the event data for it
             *
             * @event beforeUnloadView
             * @type Event.Custom
             * @for DCRouter
             * @param {EventFacade} eventFacade The EventFacade
             * @param {Object} event The event object
             * @param {DCRouter.beforeUnloadView.type} event.type The event type object
             * @param {Object} event.router The 'router' event object
             * @param {String} event.router.route The route the router should process
             * @param {String} event.router.href The link href if available
             * @param {DCRouter} event.router.instance The router instance
             * @param {String} event.router.getPath router instance result for getPath
             * @param {Function} event.router.goRoute processes the route with the router
             */
            self._beforeUnloadViewHandle = self.publish( 'beforeUnloadView', {
                emitFacade: true,
                preventable: true,
                defaultFn: function beforeUnloadView_defaultFn() {
                    Y.log( 'Event beforeUnloadView propagated', 'debug', NAME );
                },
                preventedFn: function beforeUnloadView_preventedFn() {
                    Y.log( 'Event beforeUnloadView was prevented', 'warn', NAME );
                },
                stoppedFn: function beforeUnloadView_stoppedFn() {
                    Y.log( 'Event beforeUnloadView was stopped', 'warn', NAME );
                }
            } );

            // make static links to Y.Router routes preventable
            jQuery( document.body ).on( "click", "a[href]:not([target=_blank])", function beforeUnloadView_click_href( $event ) {
                var
                    $link = jQuery( this ),
                    href = $link.attr( 'href' ),
                    goRoute = href.replace( '#', '' ), // workaround for the hash indicator stuff
                    hasRoute = self.hasRoute( href ),
                    beforeUnloadView = null,
                    appHrefs = Y.doccirrus.NavBarHeader && Y.doccirrus.NavBarHeader.hrefs && Y.doccirrus.NavBarHeader.hrefs.peek();

                /**
                 * router knows the route, and can handle it
                 */
                if( hasRoute ) {

                    // build event data
                    beforeUnloadView = {
                        type: type.router,
                        router: {
                            href: href,
                            route: goRoute,
                            instance: self,
                            getPath: self.getPath(),
                            goRoute: function beforeUnloadView_goRoute() {
                                self.save( goRoute );
                            }
                        }
                    };

                    // Ensure that we stay in the frameViewMode by adding the query parameter, if required.
                    if( self.ensureFrameViewModePersists( href ) ) {
                        // user action was halted
                        $event.preventDefault();
                        $event.stopImmediatePropagation();
                    }

                    // check for route overrides
                    self._routeOverrides.process( location.href );

                    // notify about the user action
                    if( !self.fire( 'beforeUnloadView', {}, beforeUnloadView ) ) {
                        // user action was halted
                        $event.preventDefault();
                        $event.stopImmediatePropagation();
                    }

                } else if( Array.isArray( appHrefs ) && -1 !== appHrefs.indexOf( href ) ) {

                    // build event data
                    beforeUnloadView = {
                        type: type.appHref,
                        appHref: {
                            href: href,
                            instance: self,
                            goHref: function beforeUnloadView_goHref() {
                                window.location.href = href;
                            }
                        }
                    };

                    // notify about the user action
                    if( !self.fire( 'beforeUnloadView', {}, beforeUnloadView ) ) {
                        // user action was halted
                        $event.preventDefault();
                        $event.stopImmediatePropagation();
                    }

                }

            } );

            // handle page unload
            self._beforeunloadHandle = Y.on( 'beforeunload', function( yEvent ) {
                var
                    event = yEvent._event,
                    beforeUnloadView = {
                        type: type.beforeunload,
                        beforeunload: {
                            event: event
                        }
                    };

                if( !self.fire( 'beforeUnloadView', {}, beforeUnloadView ) ) {
                    // user action was halted

                    (event || window.event).returnValue = BEFOREUNLOAD_MESSAGE; // Gecko and Trident
                    return BEFOREUNLOAD_MESSAGE; // Gecko and WebKit
                }
            } );

            // handle "popstate"
            var
                lastHash = location.hash;

            self.setTitle( location );

            self._popstateHandle = Y.on( 'popstate', function( /*yEvent*/ ) {
                var
                    newUrl = location.hash,
                    oldUrl = lastHash,
                    href = newUrl,
                    goRoute = href.replace( '#', '' ), // workaround for the hash indicator stuff
                    hasRoute = self.hasRoute( href ),
                    appHrefs = Y.doccirrus.NavBarHeader && Y.doccirrus.NavBarHeader.hrefs && Y.doccirrus.NavBarHeader.hrefs.peek(),
                    beforeUnloadView = null;

                self.setTitle( location );

                // @see: Y.Router._afterHistoryChange
                // prevent older Chrome fires `popstate` on page load.
                if( (!self._ready || self._url.replace( /#.*$/, '' ) === self._getURL().replace( /#.*$/, '' )) ) {
                    return;
                }

                if( hasRoute ) {// router does know how to handle href

                    // build event data
                    beforeUnloadView = {
                        type: type.router,
                        router: {
                            href: href,
                            route: goRoute,
                            instance: self,
                            getPath: self.getPath(),
                            goRoute: function beforeUnloadView_goRoute() {
                                self.save( goRoute );
                            }
                        }
                    };

                    // check for route overrides
                    self._routeOverrides.process( location.href );

                    if( !self.fire( 'beforeUnloadView', {}, beforeUnloadView ) ) {
                        // user action was halted
                        self.preventDispatching = true;
                        window.history.pushState( null, null, oldUrl );
                    } else {
                        self.preventDispatching = false;
                        lastHash = newUrl;
                    }

                } else if( Array.isArray( appHrefs ) && -1 !== appHrefs.indexOf( href ) ) {

                    // build event data
                    beforeUnloadView = {
                        type: type.appHref,
                        appHref: {
                            href: href,
                            instance: self,
                            goHref: function beforeUnloadView_goHref() {
                                window.location.href = href;
                            }
                        }
                    };

                    if( !self.fire( 'beforeUnloadView', {}, beforeUnloadView ) ) {
                        // user action was halted
                        self.preventDispatching = true;
                        window.history.pushState( null, null, oldUrl );
                    } else {
                        self.preventDispatching = false;
                        lastHash = newUrl;
                    }

                }

            } );

            // handle on load
            self._onLoadHandle = Y.on( 'load', function _onLoadHandle() {
                self._routeOverrides.process( location.href );
            } );

        },
        /**
         * Helper for building route params.
         * Will treat path segments as key/value units and set those to the request params.
         * Intended use is as a route callback, will proceed next with the newly applied request.params object
         * @param {Object} request
         * @param {Object} response
         * @param {Function} next
         */
        resolvePathAsKeyValue: function( request, response, next ) {
            var
                self = this,
                path = self.removeRoot( request.path ),
                segments = path.replace( /^\/+|\/+$/g, '' ).split( '/' ),
                partition = Y.Array.partition( segments, function( item, i ) {
                    return !Boolean( i % 2 );
                } ),
                params = Y.Array.hash( partition.matches, partition.rejects );

            request.params = params;

            next();
        },

        /**
         *
         * Set location title according to the current page {EXTMOJ-763}
         * @param {window.location} location Location object
         */
        setTitle( location ) {
            var mainMenuMatchedItem =
                Y.doccirrus.NavBarHeader && Y.doccirrus.NavBarHeader.mainMenu && Y.doccirrus.NavBarHeader.mainMenu.items().find( function( mainMenuItem ) {
                                             return mainMenuItem.href() === location.pathname;
                                         } ),
                foundSubMenuItem,
                clear = document.title.indexOf( '-' );

            // Remove previously appended
            if( -1 !== clear ) {
                document.title = document.title.substr( 0, clear );
            }

            if( mainMenuMatchedItem && mainMenuMatchedItem.menu ) {
                foundSubMenuItem = mainMenuMatchedItem.menu.items().find( function( secondLevelMainMenuItem ) {
                    return secondLevelMainMenuItem.href() && -1 !== secondLevelMainMenuItem.href().indexOf( location.hash );
                } );

                if( foundSubMenuItem && mainMenuMatchedItem.text() !== foundSubMenuItem.text() ) {
                    document.title += '-' + foundSubMenuItem.text();
                }
            } else if( Y.doccirrus.NavBarHeader && Y.doccirrus.NavBarHeader.mainMenu ) {
                // In case when menu is have more than one level of nesting
                Y.doccirrus.NavBarHeader.mainMenu.items().forEach( function( mainMenuItem ) {
                    if( !mainMenuItem.href() && !foundSubMenuItem ) {
                        foundSubMenuItem = mainMenuItem.menu.items().find( function( subMenuItems ) {
                            return subMenuItems.href() && -1 !== subMenuItems.href().indexOf( location.pathname );

                        } );
                    }
                } );
                if( foundSubMenuItem ) {
                    document.title += '-' + foundSubMenuItem.text();
                }
            }
        },

        /**
         * ensures that a once set frameViewMode (?frameView=true) persists when clicked on an href
         * @param {string} href
         * @return {boolean} true if ensured that frameView mode persists
         */
        ensureFrameViewModePersists( href ) {
            if( typeof href === "string" ) {
                /**
                 * Ensure that we stay in the frameViewMode by adding the query parameter, if required.
                 */
                if(
                    Y.doccirrus.commonutils.isFrameView() && // if in frameViewMode
                    href.indexOf( "#" ) !== 0 && // is not only a route change without reload (just changing the hash)
                    href.indexOf( 'frameView=true' ) === -1 // has no frameView-tag
                ) {
                    // inject the frameView=true into the link
                    href = [
                        href.slice( 0, href.indexOf( "#" ) ), // add the part in front of the hash
                        (href.indexOf( "?" ) !== -1) ? '&' : '?',
                        'frameView=true',
                        href.slice( href.indexOf( "#" ) ) // add the part after the hash (including)
                    ].join( '' );
                    window.location.href = window.location.origin + href;
                    return true;
                }
            }
            return false;
        }

    }, {
        NAME: 'DCRouter',
        ATTRS: {
            /**
             * @attribute html5
             * @type Boolean
             * @default false
             * @initOnly
             */
            html5: {
                value: false
            }
        },

        /**
         * Holds beforeUnloadView types. Currently consists of the constants for:
         * - __beforeunload__ (type means triggered by window beforeunload)
         * - __router__ (type means event is related to router usage)
         * @property beforeUnloadView
         * @for DCRouter
         * @type {Object}
         * @static
         */
        beforeUnloadView: {
            type: {
                beforeunload: {},
                router: {},
                appHref: {}
            }
        }
    } );

    /**
     * @property DCRouter
     * @for doccirrus
     * @type {DCRouter}
     */
    Y.doccirrus.DCRouter = DCRouter;

}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus',
        'router',
        'dcauth',
        'DCRouteOverride',
        'DCRouteOverrideCollection'
    ]
} );
