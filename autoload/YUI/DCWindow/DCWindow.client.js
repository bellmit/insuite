/*jslint anon:true, nomen:true*/
/*global YUI*/

'use strict';

YUI.add( 'DCWindow', function( Y/*, NAME*/ ) {
    /**
     * The DCWindow module provides overlay capabilities and mostly just extends
     * [Y.Panel](http://yuilibrary.com/yui/docs/api/classes/Panel.html "Y.Panel")
     *
     *
     *
     * @example
     // default type info
     Y.doccirrus.DCWindow.notice( { message: 'Hello World!'} );

     // type error
     Y.doccirrus.DCWindow.notice( {
         type: 'error', // success, warn
         message: 'Hello World!'
     } );
     * **Full featured:**
     * @example
     Y.doccirrus.DCWindow.notice( {
         icon: Y.doccirrus.DCWindow.ICON_SEARCH,
         title: 'Search',
         message: 'Not Found!',
         forceDefaultAction: true,
         window: {
             width: 'medium',
             //width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
             modal: false,
             dragable: true,
             resizeable: true,
             buttons: {
                 footer: [
                     Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                     Y.doccirrus.DCWindow.getButton( 'OK', { isDefault: true } )
                 ]
             }
         }
     } );
     * @module DCWindow
     * @requires classnamemanager, panel, lazy-model-list, transition, widget-anim, dd-plugin, dd-constrain, resize-plugin, resize-constrain
     */
    var
        STDMOD_CLASS_NAME = 'modal-content',
        SECTION_CLASS_NAMES = {
            header: 'modal-header',
            body: 'modal-body',
            footer: 'modal-footer'
        },
        MASK_CLASS_NAME = 'modal-backdrop';

    /**
     * overwrite for YUI#3.16.0 bug "Check whether the mousedown event belonged to a valid drop target before preventing default #1778"
     * fixes inputs & textareas not clickable in dragable nodes
     * will be resolved with YUI#3.17.0
     * @since 3.16.0
     * @see https://github.com/yui/yui3/pull/1778
     * @see https://doccirrus.atlassian.net/browse/MOJ-2016
     * @see https://confluence.dc/display/SD/Dependency+Versions+and+Issues
     */
    Y.mix( Y.Plugin.Drag, {
        _handleMouseDownEvent: function( ev ) {
            //ev.preventDefault();
            if( this.validClick( ev ) ) {
                ev.preventDefault();
            }
            this.fire( 'drag:mouseDown', { ev: ev } );
        }
    }, true, ['_handleMouseDownEvent'], 4 );

    Y.namespace( 'Plugin', 'doccirrus' );
    var
        i18n = Y.doccirrus.i18n,
        /**
         * shorthand function for creating plug parameters
         * @param {constructor} fn namespace for class
         * @param {Object} cfg config object for class
         * @returns {Object}
         */
        plug = function( fn, cfg ) {
            return {
                fn: fn,
                cfg: cfg
            };
        },
        /**
         * destroy or detach, nullify and delete the key from object
         * @param {Object} object
         * @param {String} key
         * @param [{Boolean}] onlyDelete
         * @returns {Object}
         */
        removeKeyFrom = function( key, object, onlyDelete ) {
            if( !onlyDelete ) {
                if( object[key].destroy ) {
                    object[key].destroy();
                } else if( object[key].detach ) {
                    object[key].detach();
                }
            }
            object[key] = null;
            delete object[key];
            return object;
        },
        /**
         * a throttle wrapper ensuring last execution
         * @param {Function} fn
         * @param {Number} ms
         * @returns {Function}
         */
        throttle = function( fn, ms ) {
            var last = Y.Lang.now(), msTimeout = 1 + ms, lastly;

            return function() {
                var now = Y.Lang.now(),
                    self = this, args = arguments;
                if( now - last > ms ) {
                    last = now;
                    fn.apply( self, args );
                    clearTimeout( lastly );
                    lastly = setTimeout( function() {
                        fn.apply( self, args );
                    }, msTimeout );
                }
            };
        },
        /**
         * @singleton
         */
        resizeObserver = (function createResizeObserver( from ) {
            var node = Y.one( from ),
                observer = new (Y.Base.create( 'DCWindowManagerResizeObserver', Y.Base, [], {
                    initializer: function() {
                        this.publish( 'resize' );
                        this.resize = node.on( 'resize', this._onResize, this );
                        this.region = node.get( 'viewportRegion' );
                    },
                    destructor: function() {
                        removeKeyFrom( 'resize', this );
                    },
                    _onResize: throttle( function( /*event*/ ) {
                        observer.region = node.get( 'viewportRegion' );
                        var resizeEvent = { region: observer.region };
                        observer.fire( 'resize', resizeEvent );
                    }, 150 )
                    /**
                     * Notification event, if the window got resized
                     * @event resize
                     * @preventable false
                     * @param {EventFacade} e The Event Facade
                     */
                } ))();
            return observer;
        })( window ),
        /**
         * @singleton
         */
        scrollObserver = (function createScrollObserver( from ) {
            var node = Y.one( from ),
                observer = new (Y.Base.create( 'DCWindowManagerScrollObserver', Y.Base, [], {
                    initializer: function() {
                        this.publish( 'scroll' );
                        this.scroll = node.on( 'scroll', this._onScroll, this );
                        this.region = node.get( 'viewportRegion' );
                        this.regionLast = this.region;
                    },
                    destructor: function() {
                        removeKeyFrom( 'scroll', this );
                    },
                    _onScroll: function( /*event*/ ) {
                        var rL = observer.regionLast = observer.region,
                            r = observer.region = node.get( 'viewportRegion' ),
                            scrollEvent = {
                                region: r,
                                regionLast: rL,
                                regionDelta: {
                                    0: r.left - rL.left,
                                    1: r.top - rL.top,
                                    bottom: r.bottom - rL.bottom,
                                    height: r.height - rL.height,
                                    left: r.left - rL.left,
                                    right: r.right - rL.right,
                                    top: r.top - rL.top,
                                    width: r.width - rL.width
                                }
                            };
                        observer.fire( 'scroll', scrollEvent );
                    }
                    /**
                     * Notification event, if the window got scrolled
                     * @event scroll
                     * @preventable false
                     * @param {EventFacade} e The Event Facade
                     */
                } ))();
            return observer;
        })( window );
    /*
     // custom clickoutside events
     Y.each([
     {name: 'clickoutsidewindow', event: 'click'},
     {name: 'focusoutsidewindow', event: 'focus'}
     ], function (o) {
     var name = o.name,
     event = o.event,
     config = {
     on: function (node, sub, notifier) {
     sub.handle = Y.one('doc').on(event, function (e) {
     if (this.isOutsideWindow(node, e.target)) {
     e.currentTarget = node;
     notifier.fire(e);
     }
     }, this);
     },
     detach: function (node, sub, notifier) {
     sub.handle.detach();
     },
     delegate: function (node, sub, notifier, filter) {
     sub.handle = Y.one('doc').delegate(event, function (e) {
     if (this.isOutsideWindow(node, e.target)) {
     notifier.fire(e);
     }
     }, filter, this);
     },
     isOutsideWindow: function (node, target) {
     return target !== node && !target.ancestor(function (p) {
     return p.hasClass('DCWindow') || p === node;
     });
     }
     };
     config.detachDelegate = config.detach;
     Y.Event.define(name, config);
     });*/

    /**
     * @class ResizeMaximized
     * @extends Y.Plugin.Base
     * @constructor
     * @namespace Y.Plugin
     */
    function ResizeMaximized() {
        ResizeMaximized.superclass.constructor.apply( this, arguments );
    }

    Y.mix( ResizeMaximized, {
        NAME: 'ResizeMaximized',
        NS: 'resizeMaximized',
        ATTRS: {
            /**
             * Default maximized state
             *
             * @attribute maximized
             * @type Boolean
             * @default false
             */
            maximized: {
                value: false,
                lazyAdd: false
            }
        }
    } );
    Y.extend( ResizeMaximized, Y.Plugin.Base, {
        initializer: function() {
            var
                self = this,
                host = self.get( 'host' );

            if( !host.get( 'initialized' ) ) {
                host.onceAfter( 'initializedChange', function() {
                    self._initMaximized();
                } );
            }
            else {
                self._initMaximized();
            }

        },
        destructor: function() {

        },
        _initMaximized: function() {
            var
                self = this,
                maximized = self.get( 'maximized' );

            self.after( 'maximizedChange', function( yEvent ) {
                var
                    value = yEvent.newVal;

                if( value ) {
                    self._handleResizeMaximizeEvent();
                }
                else {
                    self._handleResizeRestoreEvent();
                }

            } );

            if( maximized ) {
                self._handleResizeMaximizeEvent();
            }
            else {
                self._handleResizeRestoreEvent();
            }

        },
        _resizeObserverHandler: function() {
            var self = this,
                yWindow = Y.one( window ),
                viewportRegion = yWindow.get( 'viewportRegion' );
            self._hostSetRegion( viewportRegion );
        },
        _hostSetRegion: function( region/*, options*/ ) {
            var self = this,
                host = self.get( 'host' ),
                minHeight = host.get( 'minHeight' ),
                minWidth = host.get( 'minWidth' );
            host.set( 'width', minWidth > region.width ? minWidth : region.width );
            host.set( 'height', minHeight > region.height ? minHeight : region.height );
            host.set( 'xy', [region.left, region.top] );
            return host;
        },
        _handleResizeMaximizeEvent: function() {
            var self = this,
                host = self.get( 'host' ),
                boundingBox = host.get( 'boundingBox' ),
                maximizeButton = host.getButton( 'maximize' );
            // set last region
            self._lastRegion = boundingBox.get( 'region' );
            // Resize Plugin related
            if( host.resize ) {
                host.resize.eachHandle( function( handle/*, handleName, index*/ ) {
                    handle.hide();
                } );
            }
            // ResizeMaximize Plugin related
            boundingBox.addClass( 'DCWindow-maximized' );
            if( maximizeButton ) {
                maximizeButton.removeClass( 'glyphicon-chevron-up' ).addClass( 'glyphicon-chevron-down' );
            }
            // Drag Plugin related
            if( host.dd ) {
                host.dd.set( 'lock', true );
            }
            // refresh
            this._resizeObserverHandler();
        },
        _handleResizeRestoreEvent: function() {
            var self = this,
                host = self.get( 'host' ),
                boundingBox = host.get( 'boundingBox' ),
                lastRegion = self._lastRegion,
                currRegion = boundingBox.get( 'region' ),
                maximizeButton = host.getButton( 'maximize' );

            // Resize Plugin related
            if( host.resize ) {
                host.resize.eachHandle(
                    function( handle/*, handleName, index*/ ) {
                        handle.show();
                    }
                );
            }
            // ResizeMaximize Plugin related
            boundingBox.removeClass( 'DCWindow-maximized' );
            if( maximizeButton ) {
                maximizeButton.removeClass( 'glyphicon-chevron-down' ).addClass( 'glyphicon-chevron-up' );
            }
            if( lastRegion ) {
                // restore from lastRegion
                self._hostSetRegion( lastRegion );
                // Constrain related
                host.constrain( [lastRegion.left, lastRegion.top], true );
            } else {
                host.constrain( [currRegion.left, currRegion.top], true );
            }
            // Drag Plugin related
            if( host.dd ) {
                host.dd.set( 'lock', false );
            }
            // while maximized the view size may have changed
            if( host.get( 'fitOnViewPortResize' ) ) {
                host._triggerFitOnViewPortResize();
            }
        }
    } );
    Y.Plugin.ResizeMaximized = ResizeMaximized;

    /**
     * @class PositionFixed
     * @extends Y.Plugin.Base
     * @constructor
     * @namespace Y.Plugin
     */
    function PositionFixed() {
        PositionFixed.superclass.constructor.apply( this, arguments );
    }

    Y.mix( PositionFixed, {
        NAME: 'PositionFixed',
        NS: 'positionFixed'
    } );
    Y.extend( PositionFixed, Y.Plugin.Base, {
        initializer: function() {
            var self = this;
            self._scrollObserverHandle = DCWindowManager.scrollObserver.on( 'scroll', self._scrollObserverHandler, self );
        },
        destructor: function() {
            removeKeyFrom( '_scrollObserverHandle', this );
        },
        _scrollObserverHandler: function( event ) {
            var self = this,
                regionDelta = event.regionDelta,
                host = self.get( 'host' ),
                rM = host.resizeMaximized;
            host.move( host.get( 'x' ) + regionDelta.left, host.get( 'y' ) + regionDelta.top );
            if( rM && rM._lastRegion ) {
                rM._lastRegion[0] = rM._lastRegion[0] + regionDelta[0];
                rM._lastRegion[1] = rM._lastRegion[1] + regionDelta[1];
                rM._lastRegion.bottom = rM._lastRegion.bottom + regionDelta.bottom;
                rM._lastRegion.height = rM._lastRegion.height + regionDelta.height;
                rM._lastRegion.left = rM._lastRegion.left + regionDelta.left;
                rM._lastRegion.right = rM._lastRegion.right + regionDelta.right;
                rM._lastRegion.top = rM._lastRegion.top + regionDelta.top;
                rM._lastRegion.width = rM._lastRegion.width + regionDelta.width;
            }
        }
    } );
    Y.Plugin.PositionFixed = PositionFixed;

    /**
     * Provides a Manger for DCWindow
     * @class DCWindowManager
     * @extends LazyModelList
     * @constructor
     */
    function DCWindowManager() {
        DCWindowManager.superclass.constructor.apply( this, arguments );
    }

    Y.mix( DCWindowManager, {
        NAME: 'DCWindowManager',
        resizeObserver: resizeObserver,
        scrollObserver: scrollObserver,
        /**
         * get a window by dom id
         * @method getById
         * @param {string} id
         * @returns {DCWindow|null}
         */
        getById: function( id ) {
            return Y.Widget.getByNode( '#' + id );
        }
    } );
    Y.extend( DCWindowManager, Y.LazyModelList, {
        zIndexSeed: 2000,
        /** @private */
        initializer: function() {
            var self = this;
            self._resizeObserverHandle = DCWindowManager.resizeObserver.on( 'resize', self._onResize, self );
            self.after( 'add', self._updateZIndexes, self );
            self.after( 'remove', self._updateZIndexes, self );
        },
        /** @private */
        destructor: function() {
            removeKeyFrom( '_resizeObserverHandle', this );
        },
        /**
         * @method _updateZIndexes
         */
        _updateZIndexes: function() {
            var self = this;
            self.each( function( win, i ) {
                win.set( 'zIndex', self.zIndexSeed + i );
            } );
        },
        /**
         * @method _onResize
         * @protected
         */
        _onResize: function( /*event*/ ) {
            var self = this;
            var visibleItems = self.filter( function( win ) {
                    return win.get( 'visible' );
                } ),
                maximizedPlugins = visibleItems.filter( function( win ) {// TODO: should be plugAble
                    return win.resizeMaximized && win.resizeMaximized.get( 'maximized' );
                } ).map( function( win ) {
                    return win.resizeMaximized;
                } );
            // resize maximized
            Y.Array.invoke( maximizedPlugins, '_resizeObserverHandler' );
            // constrain visible
            visibleItems.forEach( function( i ) {
                var bbRegion = i.get( 'boundingBox' ).get( 'region' );
                i.constrain( [bbRegion.left, bbRegion.top], true );
            } );
        },
        /**
         * bring this DCWindow in front of all others in this Manager
         * @method bringToFront
         * @param {DCWindow} win
         */
        bringToFront: function( win ) {
            var items = this._items;
            items.splice( items.indexOf( win ), 1 );
            items.push( win );
            this._updateZIndexes();
        },
        /**
         * get frontmost DCWindow
         * @method getInFront
         * @returns {DCWindow|null}
         */
        getInFront: function() {
            var items = this._items;
            if( items.length ) {
                return items[items.length - 1];
            }
            return null;
        }
    } );

    /**
     * default DCWindowManager
     * @type DCWindowManager
     * @singleton
     */
    var defaultDCWindowManager = new DCWindowManager();
    var noticeDCWindowManager = new DCWindowManager();
    noticeDCWindowManager.zIndexSeed = 3000;

    // expose window manager
    DCWindowManager.defaultDCWindowManager = defaultDCWindowManager;
    DCWindowManager.noticeDCWindowManager = noticeDCWindowManager;

    /**
     * @property DCWindowManager
     * @for doccirrus
     * @type {DCWindowManager}
     */
    Y.doccirrus.DCWindowManager = DCWindowManager;

    /**
     * @example
     var aDCWindow = new Y.doccirrus.DCWindow( {
         title: 'headerContent',
         bodyContent: 'bodyContent',
         render: document.body,
         width: 250,
         visible: false,
         centered: true,
         maximizable: true,
         buttons: {
             header: ['close', 'maximize']
         }
     } );
     aDCWindow.show();
     * @class DCWindow
     * @extends Panel
     * @constructor
     */
    function DCWindow() {
        DCWindow.superclass.constructor.apply( this, arguments );
    }

    Y.mix( DCWindow, {
        NAME: 'DCWindow',
        CSS_PREFIX: Y.ClassNameManager.getClassName( 'panel' ),
        /**
         * default DCWindow Manager
         * @property manager
         * @type {DCWindowManager}
         * @static
         */
        manager: defaultDCWindowManager,
        /**
         * Create a new DCWindow
         * @param {Object} config see constructor config
         * @returns {DCWindow}
         */
        create: function( config ) {
            return new DCWindow( config );
        },
        /**
         * get default config for button
         * @method getButton
         * @param {String} key keys as in DCWindow.prototype.BUTTONS
         * @param {Object} [apply] merge this apply to the new Object
         * @returns {Object} a new Object
         * @static
         */
        getButton: function( key, apply ) {
            var newButton = Y.mix( apply || {}, DCWindow.prototype.BUTTONS[key] );
            return newButton;
        },
        ATTRS: {
            /**
             * header title
             * @attribute title
             * @type {String}
             * @default '&nbsp;'
             */
            title: {
                value: '&nbsp;',
                lazyAdd: false,
                setter: function( v ) {
                    var self = this;
                    if( !self.title ) {
                        self._createTitle();
                    }
                    self.title.set( 'text', v );
                    return v;
                }
            },
            /**
             * header icon
             * @attribute icon
             * @type {String}
             * @default ''
             */
            icon: {
                value: '',
                lazyAdd: false,
                setter: function( v ) {
                    var self = this;
                    if( !self.title ) {
                        self._createTitle();
                    }
                    self.title.set( 'icon', v );
                    return v;
                }
            },
            /**
             * @attribute hideOn
             * @type Array
             * @see WidgetAutohide.ATTRS.hideOn
             * @default esc
             */
            hideOn: {
                valueFn: function() {
                    return [
                        /*
                         { eventName: 'clickoutsidewindow' },
                         { eventName: 'focusoutsidewindow' }*/
                    ];
                },
                lazyAdd: false,
                validator: Y.Lang.isArray
            },
            /**
             * auto destroy this window on hide
             * - valid values are 'destroy', 'hide'
             * @attribute closeMode
             * @type {String}
             * @default destroy
             */
            closeMode: {
                value: 'destroy',
                lazyAdd: false
            },
            /**
             * additional space separated css class names
             * @attribute className
             * @type {String}
             * @default ''
             */
            className: {
                value: '',
                lazyAdd: false
            },
            /**
             * the manager to use for this window
             * @attribute manager
             * @type {DCWindowManager}
             * @default default manager
             */
            manager: {
                value: defaultDCWindowManager,
                lazyAdd: false
            },
            /**
             * minHeight of this window
             * @attribute minHeight
             * @type Number
             * @default 0
             */
            minHeight: {
                value: 0,
                lazyAdd: false
            },
            // TODO: maxWidth/Height
            /**
             * minWidth of this window
             * @attribute minWidth
             * @type Number
             * @default 250
             */
            minWidth: {
                value: 250,
                lazyAdd: false
            },
            /**
             * use plugin Y.Plugin.Drag & Y.Plugin.DDConstrained
             * @attribute dragable
             * @type Boolean
             * @default true
             */
            dragable: {
                value: true,
                lazyAdd: false,
                setter: function( v ) {
                    if( v ) {
                        this.plug( plug( Y.Plugin.Drag, {
                            handles: ['.modal-header'],
                            plugins: plug( Y.Plugin.DDConstrained, { constrain: 'view' } )
                        } ) );
                    } else {
                        this.unplug( Y.Plugin.Drag );
                    }
                    return v;
                }
            },
            /**
             * use plugin Y.Plugin.ResizeMaximized
             * @attribute maximizable
             * @type Boolean
             * @default true
             */
            maximizable: {
                value: true,
                lazyAdd: false,
                setter: function( v ) {
                    if( v ) {
                        this.plug( Y.Plugin.ResizeMaximized );
                    } else {
                        this.unplug( Y.Plugin.ResizeMaximized );
                    }
                    return v;
                }
            },
            /**
             * use plugin Y.Plugin.Resize && Y.Plugin.ResizeConstrained
             * @attribute resizeable
             * @type Boolean
             * @default true
             */
            resizeable: {
                value: true,
                lazyAdd: false,
                setter: function( v ) {
                    // TODO: not only boolean, but if Object use as config?
                    var self = this,
                        resizeConstrainedCfg = null;
                    if( v ) {
                        if( !self.resize ) {
                            resizeConstrainedCfg = {
                                constrain: 'view',
                                minHeight: self.get( 'minHeight' ),
                                minWidth: self.get( 'minWidth' )
                            };
                            self.plug( plug( Y.Plugin.Resize, {
                                handles: 'br, tl',
                                autoHide: true,
                                defMinHeight: self.get( 'minHeight' ),
                                defMinWidth: self.get( 'minWidth' ),
                                plugins: plug( Y.Plugin.ResizeConstrained, resizeConstrainedCfg )
                            } ) );
                            self.resize._onMinWidthChange = self.on( 'minWidthChange', function( event ) {
                                self.resize.con.set( 'minWidth', event.newVal );
                            }, self );
                            self.resize._onMinHeightChange = self.on( 'minHeightChange', function( event ) {
                                self.resize.con.set( 'minHeight', event.newVal );
                            }, self );
                            self.resize.con.on( 'destroy', function() {
                                removeKeyFrom( '_onMinHeightChange', self.resize );
                                removeKeyFrom( '_onMinWidthChange', self.resize );
                                removeKeyFrom( 'resize', self, true );
                            }, self );
                        }
                    } else {
                        self.unplug( Y.Plugin.Resize );
                    }
                    return Boolean( v );
                }
            },
            /**
             * use plugin Y.Plugin.WidgetAnim
             * @attribute anim
             * @type Boolean
             * @default true
             */
            anim: {
                value: true,
                lazyAdd: false,
                setter: function( v ) {
                    var self = this;
                    if( v ) {
                        self.plug( plug( Y.Plugin.WidgetAnim, {
                            duration: 0.3
                        } ) );
                        // delay closeMode destroy on animHide
                        self.anim.get( 'animHide' ).after( 'end', function() {
                            if( 'destroy' === self.get( 'closeMode' ) ) {
                                self.destroy();
                            }
                        }, self );
                    } else {
                        self.unplug( Y.Plugin.WidgetAnim );
                    }
                    return v;
                }
            },
            /**
             * use plugin Y.Plugin.PositionFixed
             * @attribute fixed
             * @type Boolean
             * @default true for touch is false
             */
            fixed: {
                value: !Y.UA.touchEnabled, // scroll dialog with page for touch devices else stay fixed
                lazyAdd: false,
                setter: function( v ) {
                    if( v ) {
                        this.plug( Y.Plugin.PositionFixed );
                    } else {
                        this.unplug( Y.Plugin.PositionFixed );
                    }
                    return v;
                }
            },

            /**
             * @attribute constrain
             * @type boolean | Node
             * @default true
             * @description The node to constrain the widget's bounding box to, when setting xy. Can also be
             * set to true, to constrain to the viewport.
             */
            constrain: {
                value: true,
                setter: "_setConstrain"
            },
            /**
             * Handles resizing {{#crossLink "DCWindow"}}{{/crossLink}} when {{#crossLink "DCWindow/fitOnViewPortResize:attribute"}}{{/crossLink}} set
             * @attribute fitOnViewPortResize
             * @type boolean
             * @default false
             */
            fitOnViewPortResize: {
                value: false
            }
        },
        /**
         * Utility for creating system messages.
         * These kind of windows have their own manager, which will overlay the default manager.
         * @example
         Y.doccirrus.DCWindow.notice({
             type: 'error',
             message : 'Hello World!',
             callback : function(dialog){
                 console.warn('DCWindow.callback', dialog, arguments, this);
             }
         });
         * @method notice
         * @param {Object} config
         * @param {String|HTML|Node} config.message the message to display
         * @param {String} [config.type='info'] type of message. Supported are info, success, warn, error - default is info
         * @param {Boolean} [config.forceDefaultAction=false] User isn't able to close the notice with ESC or X
         * @param {Function} [config.callback] a callback that will be called after the window gets hidden.
         *                                      Provided parameter is an object with properties success, data, event.
         *                                      Where success=true means the window got hidden by default action else by close, focusoutsidewindow, clickoutsidewindow or ESC
         * @param {String} [config.title] title of window. Can be omitted - there are defaults for the types
         * @param {String} [config.icon] class names for icon of window. Can be omitted - there are defaults for the types
         * @param {Object} [config.window] overwrites window configuration. For the property 'width' some constants can be used ('small','medium','large')
         * @returns {DCWindow}
         * @static
         */
        notice: function( config ) {
            config = config || {};
            config.callback = config.callback || function() {
                };
            config.window = config.window || {};

            var type = config.type || 'info', // info, success, warn, error
                message = config.message || '',
                icon = config.icon || '',
                title = config.title,
                forceDefaultAction = Y.Lang.isUndefined( config.forceDefaultAction ) ? false : config.forceDefaultAction,
                callback = config.callback,
                callbackArgs = {
                    success: false,
                    data: null,
                    action: null
                },
                windowConfig, aDCWindow, manager;

            if( !title ) {
                switch( type ) {
                    case 'info':
                        title = i18n( 'DCWindow.notice.title.info' );
                        break;
                    case 'success':
                        title = i18n( 'DCWindow.notice.title.success' );
                        break;
                    case 'warn':
                        title = i18n( 'DCWindow.notice.title.warn' );
                        break;
                    case 'error':
                        title = i18n( 'DCWindow.notice.title.error' );
                        break;
                }
            }

            if( !icon ) {
                switch( type ) {
                    case 'info':
                        icon = Y.doccirrus.DCWindow.ICON_INFO;
                        break;
                    case 'success':
                        icon = Y.doccirrus.DCWindow.ICON_SUCCESS;
                        break;
                    case 'warn':
                        icon = Y.doccirrus.DCWindow.ICON_WARN;
                        break;
                    case 'error':
                        icon = Y.doccirrus.DCWindow.ICON_ERROR;
                        break;
                }
            }

            if( config.window.manager ) {
                manager = config.window.manager;
                delete config.window.manager;
            }

            windowConfig = Y.aggregate( {
                className: 'DCWindow-notice',
                bodyContent: message,
                title: title,
                icon: icon,
                width: 'small',
                modal: true,
                visible: true,
                centered: true,
                alignOn: [],
                dragable: false,
                maximizable: false,
                resizeable: false,
                buttons: {
                    header: ['close'],
                    footer: [
                        DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function( e ) {
                                e.preventDefault();
                                callbackArgs.success = true;
                                callbackArgs.event = e;
                                aDCWindow.hide( e );
                            }
                        } )
                    ]
                },
                render: document.body
            }, config.window, true );

            windowConfig.manager = manager || noticeDCWindowManager;

            if( windowConfig.modal && !windowConfig.alignOn.length ) {
                windowConfig.alignOn = [
                    { node: Y.one( 'win' ), eventName: 'resize' }
                ];
                windowConfig.dragable = false;
            }

            if( typeof windowConfig.width === 'string' ) {
                switch( windowConfig.width.toLowerCase() ) {
                    case 'small' :
                        windowConfig.width = Y.doccirrus.DCWindow.SIZE_SMALL;
                        break;
                    case 'medium' :
                        windowConfig.width = Y.doccirrus.DCWindow.SIZE_MEDIUM;
                        break;
                    case 'large' :
                        windowConfig.width = Y.doccirrus.DCWindow.SIZE_LARGE;
                        break;
                    case 'xlarge' :
                        windowConfig.width = Y.doccirrus.DCWindow.SIZE_XLARGE;
                        break;
                }
            }

            aDCWindow = new DCWindow( windowConfig );

            if( forceDefaultAction ) {
                aDCWindow.removeButton( 'close' );
                aDCWindow.set( 'hideOn', [] );
            }

            aDCWindow.after( 'visibleChange', function() {
                var self = this,
                    visible = self.get( 'visible' );
                if( !visible ) {
                    callback.call( self, callbackArgs );
                }
            } );

            return aDCWindow;
        },
        /**
         * Utility for creating dialogs that are as easy to use as DCWindow.notice for system messages, but for displaying dialogs.
         * These kind of windows will use the default manager.
         * @example
         Y.doccirrus.DCWindow.dialog({
             type: 'error',
             message : 'Hello World!',
             callback : function(dialog){
                 console.warn('DCWindow.callback', dialog, arguments, this);
             }
         });
         * @method modal
         * @param {Object} config
         * @param {String|HTML|Node} config.message the message to display
         * @param {String} [config.type='info'] type of message. Supported are info, success, warn, error - default is info
         * @param {Boolean} [config.forceDefaultAction=false] User isn't able to close the notice with ESC or X
         * @param {Function} [config.callback] a callback that will be called after the window gets hidden.
         *                                      Provided parameter is an object with properties success, data, event.
         *                                      Where success=true means the window got hidden by default action else by close, focusoutsidewindow, clickoutsidewindow or ESC
         * @param {String} [config.title] title of window. Can be omitted - there are defaults for the types
         * @param {String} [config.icon] class names for icon of window. Can be omitted - there are defaults for the types
         * @param {Object} [config.window] overwrites window configuration. For the property 'width' some constants can be used ('small','medium','large')
         * @returns {DCWindow}
         * @static
         */
        dialog: function( config ) {
            config = config || {};
            config.window = config.window || {};

            config.window.className = config.window.className || 'DCWindow-dialog';
            config.window.manager = defaultDCWindowManager;

            return DCWindow.notice( config );
        },
        /**
         * @beta
         * @method alert
         * @protected
         * @static
         */
        alert: function() {
            // TODO: use notice type info
        },
        /**
         * Utility to create a message pompt, added for EXTMOJ-861 to prompt for a reason to cancel activities
         *
         * @beta
         * @method prompt
         * @protected
         * @static
         */
        prompt: function( config ) {
            config = config || {};
            config.callback = config.callback || function() {
                };
            config.window = config.window || {};

            var type = config.type || 'info', // info, success, warn, error
                message = config.message || '',
                icon = config.icon || '',
                title = config.title,
                bodyNode = Y.Node.create( message + '<br/><input type="text" class="form-control" id="txtConfirmValue"/>' ),
                forceDefaultAction = Y.Lang.isUndefined( config.forceDefaultAction ) ? false : config.forceDefaultAction,
                callback = config.callback,
                callbackArgs = {
                    success: false,
                    data: null,
                    action: null
                },
                windowConfig, aDCWindow, manager;

            if( !title ) {
                switch( type ) {
                    case 'info':
                        title = i18n( 'DCWindow.notice.title.info' );
                        break;
                    case 'success':
                        title = i18n( 'DCWindow.notice.title.success' );
                        break;
                    case 'warn':
                        title = i18n( 'DCWindow.notice.title.warn' );
                        break;
                    case 'error':
                        title = i18n( 'DCWindow.notice.title.error' );
                        break;
                }
            }

            if( !icon ) {
                switch( type ) {
                    case 'info':
                        icon = Y.doccirrus.DCWindow.ICON_INFO;
                        break;
                    case 'success':
                        icon = Y.doccirrus.DCWindow.ICON_SUCCESS;
                        break;
                    case 'warn':
                        icon = Y.doccirrus.DCWindow.ICON_WARN;
                        break;
                    case 'error':
                        icon = Y.doccirrus.DCWindow.ICON_ERROR;
                        break;
                }
            }

            if( config.window.manager ) {
                manager = config.window.manager;
                delete config.window.manager;
            }

            windowConfig = Y.aggregate( {
                className: 'DCWindow-prompt',
                bodyContent: bodyNode,
                title: title,
                icon: icon,
                width: 'small',
                modal: true,
                visible: true,
                centered: true,
                alignOn: [],
                dragable: false,
                maximizable: false,
                resizeable: false,
                buttons: {
                    header: ['close'],
                    footer: [
                        DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: onOKButtonClicked
                        } )
                    ]
                },
                render: document.body
            }, config.window, true );

            windowConfig.manager = manager || noticeDCWindowManager;

            if( windowConfig.modal && !windowConfig.alignOn.length ) {
                windowConfig.alignOn = [
                    { node: Y.one( 'win' ), eventName: 'resize' }
                ];
                windowConfig.dragable = false;
            }

            if( typeof windowConfig.width === 'string' ) {
                switch( windowConfig.width.toLowerCase() ) {
                    case 'small' :
                        windowConfig.width = Y.doccirrus.DCWindow.SIZE_SMALL;
                        break;
                    case 'medium' :
                        windowConfig.width = Y.doccirrus.DCWindow.SIZE_MEDIUM;
                        break;
                    case 'large' :
                        windowConfig.width = Y.doccirrus.DCWindow.SIZE_LARGE;
                        break;
                    case 'xlarge' :
                        windowConfig.width = Y.doccirrus.DCWindow.SIZE_XLARGE;
                        break;
                }
            }

            aDCWindow = new DCWindow( windowConfig );

            if( forceDefaultAction ) {
                aDCWindow.removeButton( 'close' );
                aDCWindow.set( 'hideOn', [] );
            }

            if ( config.defaultValue ) {
                Y.one( '#txtConfirmValue' ).set( 'value', config.defaultValue );
            }

            Y.one( '#txtConfirmValue' )
                .focus()
                .on( 'keydown', onTxtKeydown );

            aDCWindow.after( 'visibleChange', onModalVisibilityChange );

            //  EVENT HANDLERS

            function onTxtKeydown( evt ) {
                if( 10 === evt.keyCode || 13 === evt.keyCode ) {
                    onOKButtonClicked( evt );
                }
            }

            function onOKButtonClicked( e ) {
                e.preventDefault();

                callbackArgs.success = true;
                callbackArgs.event = e;

                callbackArgs.data = Y.one( '#txtConfirmValue' ).get( 'value' );
                aDCWindow.hide( e );
            }

            function onModalVisibilityChange() {
                var //self = this,
                    visible = aDCWindow.get( 'visible' );
                if( !visible ) {
                    callback.call( aDCWindow, callbackArgs );
                }
            }

            return aDCWindow;
        },
        /**
         * Utility for creating a confirm message.
         * These kind of windows have their own manager, which will overlay the default manager.
         * @example
         Y.doccirrus.DCWindow.confirm({
             message : 'Hello World?',
             callback : function(dialog){
                 console.warn('DCWindow.callback', dialog, arguments, this);
             }
         });
         * @method notice
         * @param {Object} config
         * @param {String|HTML|Node} config.message the message to display
         * @param {Boolean} [config.forceDefaultAction=false] User isn't able to close the notice with ESC or X
         * @param {Function} [config.callback] a callback that will be called after the window gets hidden.
         *                                      Provided parameter is an object with properties success, data, event.
         *                                      Where success=true means the window got hidden by default action else by close, focusoutsidewindow, clickoutsidewindow or ESC
         * @param {String} [config.title] title of window. Can be omitted - there are defaults for the types
         * @param {String} [config.icon] class names for icon of window. Can be omitted - there are defaults for the types
         * @param {Object} [config.buttonOkConfig] a config object which overwrites defaults for the 'OK'-Button
         * @param {Object} [config.buttonCancelConfig] a config object which overwrites defaults for the 'CANCEL'-Button
         * @param {Object} [config.window] overwrites window configuration. For the property 'width' some constants can be used ('small','medium','large')
         * @returns {DCWindow}
         * @static
         */
        confirm: function( config ) {
            config = config || {};
            config.callback = config.callback || function() {
                };
            config.window = config.window || {};

            var
                message = config.message || i18n( 'general.message.ARE_YOU_SURE' ),
                icon = config.icon || '',
                title = config.title,
                forceDefaultAction = Y.Lang.isUndefined( config.forceDefaultAction ) ? false : config.forceDefaultAction,
                callback = config.callback,
                callbackArgs = {
                    success: false,
                    data: null,
                    action: null
                },
                windowConfig, aDCWindow;

            if( !title ) {
                title = i18n( 'DCWindow.confirm.title' );
            }

            if( !icon ) {
                icon = Y.doccirrus.DCWindow.ICON_QUESTION;
            }

            windowConfig = Y.aggregate( {
                className: 'DCWindow-notice',
                manager: noticeDCWindowManager,
                bodyContent: message,
                title: title,
                icon: icon,
                width: 'small',
                modal: true,
                visible: true,
                centered: true,
                alignOn: [],
                dragable: false,
                maximizable: false,
                resizeable: false,
                buttons: {
                    header: ['close'],
                    footer: [
                        Y.merge( DCWindow.getButton( 'CANCEL', {
                            isDefault: false,
                            action: function( e ) {
                                e.target.button.disable();
                                callbackArgs.success = false;
                                callbackArgs.event = e;
                                this.hide( e );
                            }
                        } ), config.buttonCancelConfig ),
                        Y.merge( DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function( e ) {
                                e.target.button.disable();
                                callbackArgs.success = true;
                                callbackArgs.event = e;
                                this.hide( e );
                            }
                        } ), config.buttonOkConfig )
                    ]
                },
                render: document.body
            }, config.window, true );

            if( windowConfig.modal && !windowConfig.alignOn.length ) {
                windowConfig.alignOn = [
                    { node: Y.one( 'win' ), eventName: 'resize' }
                ];
                windowConfig.dragable = false;
            }

            if( typeof windowConfig.width === 'string' ) {
                switch( windowConfig.width.toLowerCase() ) {
                    case 'small' :
                        windowConfig.width = Y.doccirrus.DCWindow.SIZE_SMALL;
                        break;
                    case 'medium' :
                        windowConfig.width = Y.doccirrus.DCWindow.SIZE_MEDIUM;
                        break;
                    case 'large' :
                        windowConfig.width = Y.doccirrus.DCWindow.SIZE_LARGE;
                        break;
                    case 'xlarge' :
                        windowConfig.width = Y.doccirrus.DCWindow.SIZE_XLARGE;
                        break;
                }
            }

            aDCWindow = new DCWindow( windowConfig );

            if( forceDefaultAction ) {
                aDCWindow.removeButton( 'close' );
                aDCWindow.set( 'hideOn', [] );
            }

            aDCWindow.after( 'visibleChange', function() {
                var self = this,
                    visible = self.get( 'visible' );
                if( !visible ) {
                    callback.call( self, callbackArgs );
                }
            } );

            return aDCWindow;
        },

        /**
         * small width constant
         * @property SIZE_SMALL
         * @type {String}
         * @static
         */
        SIZE_SMALL: 320,
        /**
         * medium width constant
         * @property SIZE_MEDIUM
         * @type {String}
         * @static
         */
        SIZE_MEDIUM: 460,
        /**
         * large width constant
         * @property SIZE_LARGE
         * @type {String}
         * @static
         */
        SIZE_LARGE: 600,
        /**
         * extra large width constant
         * @property SIZE_XLARGE
         * @type {String}
         * @static
         */
        SIZE_XLARGE: 900,
        /**
         * @property ICON_SEARCH
         * @type {String}
         * @static
         */
        ICON_SEARCH: 'fa fa-search',
        /**
         * @property ICON_LIST
         * @type {String}
         * @static
         */
        ICON_LIST: 'fa fa-list',
        /**
         * @property ICON_EDIT
         * @type {String}
         * @static
         */
        ICON_EDIT: 'fa fa-pencil',
        /**
         * @property ICON_INFO
         * @type {String}
         * @static
         */
        ICON_INFO: 'fa fa-hand-o-right',
        /**
         * @property ICON_SUCCESS
         * @type {String}
         * @static
         */
        ICON_SUCCESS: 'fa fa-check',
        /**
         * @property ICON_WARN
         * @type {String}
         * @static
         */
        ICON_WARN: 'fa fa-bullhorn',
        /**
         * @property ICON_ERROR
         * @type {String}
         * @static
         */
        ICON_ERROR: 'fa fa-ban',
        /**
         * @property ICON_QUESTION
         * @type {String}
         * @static
         */
        ICON_QUESTION: 'fa fa-question-circle',
        /**
         * @property ICON_MICROPHONE
         * @type {String}
         * @static
         */
        ICON_MICROPHONE: 'fa fa-microphone',
        /**
         * @property ICON_PLAY
         * @type {String}
         * @static
         */
        ICON_PLAY: 'fa fa-play',
        /**
         * @property ICON_CERTIFICATE
         * @type {String}
         * @static
         */
        ICON_CERTIFICATE: 'fa fa-certificate',
        /**
         * @property ICON_ENVELOPE
         * @type {String}
         * @static
         */
        ICON_ENVELOPE: 'fa fa-envelope'
    } );

    Y.extend( DCWindow, Y.Panel, {
        //BUTTONS_TEMPLATE : '<div class="btn-group pull-right"></div>',
        /** @private */
        initializer: function( /*config*/ ) {
            //config = config || {};
            var
                self = this;

            self.get( 'manager' ).add( self );

            self._initFitOnViewPortResize();

        },
        /** @private */
        destructor: function() {
            var self = this,
                manager = self.get( 'manager' );

            manager.remove( self );

            if( self.bBoxMousedown ) {
                removeKeyFrom( 'bBoxMousedown', self );
            }

            self._destroyTitle();
            self._destroyFitOnViewPortResize();
            self._removeEventListeners();

        },
        /**
         * overwritten to support individual section class names
         * @method _getStdModTemplate
         * @protected
         */
        _getStdModTemplate: function( section ) {
            var
                _getStdModTemplate = DCWindow.superclass._getStdModTemplate.apply( this, arguments );

            _getStdModTemplate.addClass( SECTION_CLASS_NAMES[section] );

            return _getStdModTemplate;
        },
        /**
         * overwritten to add a individual class name to stdmod
         * @method _renderUIStdMod
         * @protected
         */
        _renderUIStdMod: function() {
            var
                _renderUIStdMod = DCWindow.superclass._renderUIStdMod.apply( this, arguments );

            this._stdModNode.addClass( STDMOD_CLASS_NAME );

            return _renderUIStdMod;
        },
        /**
         * overwritten to add a individual class name to modal mask
         * @method _getMaskNode
         * @protected
         */
        _getMaskNode: function() {
            var
                _getMaskNode = DCWindow.superclass._getMaskNode.apply( this, arguments );

            if( !_getMaskNode.hasClass( MASK_CLASS_NAME ) ) {
                _getMaskNode.addClass( MASK_CLASS_NAME );
            }

            return _getMaskNode;
        },
        /**
         * hide method from header close button
         * @method close
         * @returns {DCWindow}
         */
        close: function() {
            return this.hide.apply( this, arguments );
        },
        /**
         * bring this DCWindow in front of all others in this Manager
         * @method bringToFront
         */
        bringToFront: function() {
            var self = this,
                manager = self.get( 'manager' );
            manager.bringToFront( self );
        },
        /**
         * adds className DCWindow-modal to backdrop
         * @method _setupModal
         * @protected
         */
        _setupModal: function() {
            var self = this;
            if( self.get( 'modal' ) && self.get( 'visible' ) ) {
                self.get( 'maskNode' ).addClass( 'DCWindow-modal' );
            }
        },
        /**
         * components visible change handling
         * @method _afterVisibleChange
         * @param {Y.EventFacade} event
         * @protected
         */
        _afterVisibleChange: function( event ) {
            var self = this;
            self._setupModal();
            if( event.newVal ) {
                if( !self.anim ) {
                    // TODO: handle at anim ATTRS false?
                    if( 'destroy' === self.get( 'closeMode' ) ) {
                        self.destroy();
                    }
                }
            }
        },
        /**
         * initial check for minHeight from calculated height
         * @method _initMinDimensions
         * @protected
         */
        _initMinDimensions: function() {
            // TODO: there should be an attr autodetect instead
            var self = this,
                bBox = self.get( 'boundingBox' ),
                bBoxPxHeight = bBox.getComputedStyle( 'height' ),
                bBoxHeight = parseInt( bBoxPxHeight, 10 ),
                viewport = Y.one( window ).get( 'viewportRegion' ),
                setMinHeight = bBoxHeight;
            if( bBoxHeight > viewport.height ) {// TODO: this is more a workaround for overlapping window by auto-height on maximized
                setMinHeight = viewport.height;
            }
            if( !self.get( 'minHeight' ) ) {
                self.set( 'minHeight', setMinHeight );
            }
            if( !self.get( 'minWidth' ) && self.get( 'width' ) ) {
                self.set( 'minWidth', self.get( 'width' ) );
            }
        },
        /**
         * @method _defRenderFn
         * @see Widget._defRenderFn
         * @protected
         */
        _defRenderFn: function() {
            var self = this,
                className = self.get( 'className' ),
                bBox = self.get( 'boundingBox' ),
                visible;
            bBox.addClass( 'DCWindow' );
            if( className ) {
                bBox.addClass( className );
            }

            DCWindow.superclass._defRenderFn.apply( self, arguments );
            self._setupModal();
            visible = self.get( 'visible' );
            // make this window focusable
            self._uiSetTabIndex( 0 );

            self.headerNode.appendChild( self.title.titleNode );

            self.bBoxMousedown = bBox.on( 'mousedown', self.bringToFront, self );

            // only hide this window on esc
            self.get( 'hideOn' ).push( {
                node: bBox,
                eventName: 'key',
                keyCode: 'esc'
            } );

            self.after( 'visibleChange', self._afterVisibleChange, self );
            // set initial minWidth/Height
            if( visible ) {
                self._initMinDimensions();
            } else {
                self.onceAfter( 'visibleChange', self._initMinDimensions, self );
            }
            // re-fillHeight to reflect changes
            if( self.get( 'height' ) ) {
                self.fillHeight( self.bodyNode );
            }
            // re-center to reflect changes
            if( self.get( 'centered' ) ) {
                self.centered();
            }
            if( !self.get( 'alignOn' ).length ) {
                self.set( 'align', null );
            }

            var
                i,
                len,
                dlgBodySections = document.getElementsByClassName( SECTION_CLASS_NAMES.body );

            for( i = 0, len = dlgBodySections.length; i < len; i++ ) {
                // So content is dynamically loaded so we need to check the dialog size each time when content is changed
                dlgBodySections[i].addEventListener( 'DOMNodeInserted', self.fitIntoBrowserWindowEventListener.bind( this ), false );
            }
        },

        /**
         *  Check for correct DCWindow size and if smaller then browser window do resize
         */
        fitIntoBrowserWindowEventListener: function() {
            var
                self = this,
                bBox = self.get( 'boundingBox' );

            //  attempting to resize before node is available, nothing to do
            if ( !bBox._node ) { return; }

            if( bBox && Y.one( window ).get( 'viewportRegion' ).height < bBox.get( 'clientHeight' ) ) {
                self.set( 'height', Y.one( window ).get( 'viewportRegion' ).height );
                self.centered();
            }
        },
        /**
         * @property title
         * @type {null|Model}
         */
        title: null,
        /**
         * get/creates title Object
         * @method _createTitle
         * @protected
         */
        _createTitle: function() {
            var self = this,
                titleNode = Y.Node.create( '<div class="modal-title"><span class="modal-title-icon"></span>&nbsp;<span class="modal-title-text"></span></div>' ),
                titleSetText = function( text ) {
                    titleNode.one( '.modal-title-text' ).setHTML( text );
                },
                titleSetIcon = function( icon ) {
                    var node = titleNode.one( '.modal-title-icon' );
                    if( icon ) {
                        node.setAttribute( 'class', 'modal-title-icon ' + icon );
                    } else {
                        node.setAttribute( 'class', 'modal-title-icon' );
                    }
                };

            self.title = new Y.Model();
            self.title.titleNode = titleNode;

            self.title.on( 'change', function( event ) {
                var text = event.changed.text,
                    icon = event.changed.icon;
                if( text ) {
                    titleSetText( text.newVal || '&nbsp;' );
                }
                if( icon ) {
                    titleSetIcon( icon.newVal );
                }
            } );
            // buttonsChange messes up header - handle that
            self.after( 'buttonsChange', function() {
                var headerNode = self.headerNode,
                    children = headerNode.get( 'children' );
                if( children.length - 1 !== children.indexOf( titleNode ) ) {
                    headerNode.appendChild( titleNode );
                }
            }, self );
        },
        /**
         * destroys title Object
         * @method _destroyTitle
         * @protected
         */
        _destroyTitle: function() {
            var self = this;
            if( self.title ) {
                self.title.destroy();
                self.title = null;
                delete self.title;
            }
        },

        _removeEventListeners: function() {
            var
                self = this,
                i,
                len,
                dlgBodySections = document.getElementsByClassName( SECTION_CLASS_NAMES.body );

            for( i = 0, len = dlgBodySections.length; i < len; i++ ) {
                dlgBodySections[i].removeEventListener( 'DOMNodeInserted', self.fitIntoBrowserWindowEventListener, false );
            }
        },

        /**
         * Initializes handling for {{#crossLink "DCWindow/fitOnViewPortResize:attribute"}}{{/crossLink}}
         * @method _initFitOnViewPortResize
         * @protected
         */
        _initFitOnViewPortResize: function() {
            var
                self = this,
                fitOnViewPortResize = self.get( 'fitOnViewPortResize' );

            self.after( 'fitOnViewPortResizeChange', function( yEvent ) {
                var
                    value = yEvent.newVal;

                if( value ) {
                    self._attachFitOnViewPortResize();
                }
                else {
                    self._detachFitOnViewPortResize();
                }

            } );

            if( fitOnViewPortResize ) {
                self._attachFitOnViewPortResize();
            }

        },
        /**
         * EventHandle for {{#crossLink "DCWindow/fitOnViewPortResize:attribute"}}{{/crossLink}} when listening to view resize
         * @property _eventFitOnViewPortResize
         * @type {null|Y.EventHandle}
         * @default null
         * @protected
         */
        _eventFitOnViewPortResize: null,
        /**
         * Handles resizing {{#crossLink "DCWindow"}}{{/crossLink}} when {{#crossLink "DCWindow/fitOnViewPortResize:attribute"}}{{/crossLink}} set
         * @method _handlerFitOnViewPortResize
         * @protected
         */
        _handlerFitOnViewPortResize: function( yEvent ) {
            var
                self = this,
                winHeight = yEvent.region.height,
                maximizable = self.get( 'maximizable' ),
                resizeable = self.get( 'resizeable' ),
                minHeight = self.get( 'minHeight' ),
                setHeight = self.get( 'height' );

            // maximized handles own fit
            if( maximizable && self.resizeMaximized.get( 'maximized' ) ) {
                return;
            }

            // if not resizeable fit to initial values
            if( !resizeable ) {
                minHeight = self._state.get( 'minHeight', 'initValue' );
                setHeight = self._state.get( 'height', 'initValue' );
            }

            if( winHeight > minHeight ) {
                // adjust the height
                if( winHeight < setHeight ) {
                    self.set( 'height', winHeight );
                } else {
                    self.set( 'height', setHeight );
                }
            }

        },
        /**
         * Attaches {{#crossLink "DCWindow/_eventFitOnViewPortResize:property"}}{{/crossLink}} when {{#crossLink "DCWindow/fitOnViewPortResize:attribute"}}{{/crossLink}} set
         * @method _attachFitOnViewPortResize
         * @protected
         */
        _attachFitOnViewPortResize: function() {
            var
                self = this;

            if( null === self._eventFitOnViewPortResize ) {
                self._eventFitOnViewPortResize = resizeObserver.on( 'resize', self._handlerFitOnViewPortResize, self );
                self._triggerFitOnViewPortResize();
            }
        },
        /**
         * Triggers a manual recomputing
         * @method _triggerFitOnViewPortResize
         * @protected
         */
        _triggerFitOnViewPortResize: function() {
            var
                self = this;

            // fake event object
            self._handlerFitOnViewPortResize( {
                region: Y.one( window ).get( 'viewportRegion' )
            } );

        },
        /**
         * Detaches {{#crossLink "DCWindow/_eventFitOnViewPortResize:property"}}{{/crossLink}} when {{#crossLink "DCWindow/fitOnViewPortResize:attribute"}}{{/crossLink}} set
         * @method _detachFitOnViewPortResize
         * @protected
         */
        _detachFitOnViewPortResize: function() {
            var
                self = this;

            if( null !== self._eventFitOnViewPortResize ) {
                self._eventFitOnViewPortResize.detach();
                self._eventFitOnViewPortResize = null;
            }

        },
        /**
         * Destroy handling for {{#crossLink "DCWindow/fitOnViewPortResize:attribute"}}{{/crossLink}}
         * @method _destroyFitOnViewPortResize
         * @protected
         */
        _destroyFitOnViewPortResize: function() {
            var
                self = this;

            self._detachFitOnViewPortResize();

        },

        /**
         * Overwritten:
         Returns a button node based on the specified `button` node or configuration.

         The button node will either be created via `Y.Plugin.Button.createNode()`,
         or when `button` is specified as a node already, it will by `plug()`ed with
         `Y.Plugin.Button`.

         @method _createButton
         @param {Node|Object} button Button node or configuration object.
         @return {Node} The button node.
         @protected
         @since 3.5.0
         **/
        _createButton: function( config ) {
            /*
             // maybe use that …
             if (!(config instanceof Y.Node) && Y.Lang.isObject(config)) {
             if (!Y.Object.owns(config, 'template')) {
             if ('header' === config.section) {
             config.template = '<button type="button" />';
             } else {
             config.template = 'something else';
             }
             }
             }*/
            var
                _createButton = DCWindow.superclass._createButton.apply( this, arguments );

            if( config.name ) {
                _createButton.setAttribute( 'name', config.name );
            }
            if( config.title ) {
                _createButton.setAttribute( 'title', config.title );
            }
            //  by default only the rightmost button in the footer is blue
            if ( config.isPrimary ) {
                _createButton.addClass( 'btn-primary' );
            }
            return _createButton;
        },
        /**
         * @property BUTTONS
         * @static
         */
        BUTTONS: {
            close: {
                label: '',
                name: 'close',
                value: 'close',
                action: 'close',
                section: 'header',
                template: '<button type="button" />',
                classNames: 'glyphicon glyphicon-remove close'
            },
            maximize: {
                label: '',
                name: 'maximize',
                value: 'maximize',
                action: function() {
                    var rM = this.resizeMaximized;
                    if( rM ) {
                        rM.set( 'maximized', !rM.get( 'maximized' ) );
                    }
                },
                section: 'header',
                template: '<button type="button" />',
                classNames: 'glyphicon glyphicon-chevron-up close'
            },

            OK: {
                label: i18n( 'DCWindow.BUTTONS.OK' ),
                name: 'OK',
                value: 'OK',
                action: 'close'
            },
            CANCEL: {
                label: i18n( 'DCWindow.BUTTONS.CANCEL' ),
                name: 'CANCEL',
                value: 'CANCEL',
                action: 'close'
            },
            SELECT_COPY: {
                label: i18n( 'DCWindow.BUTTONS.SELECT_COPY' ),
                name: 'SELECT_COPY',
                value: 'SELECT_COPY',
                action: 'close'
            },
            CLOSE: {
                label: i18n( 'DCWindow.BUTTONS.CLOSE' ),
                name: 'CLOSE',
                value: 'CLOSE',
                action: 'close'
            },
            YES: {
                label: i18n( 'DCWindow.BUTTONS.YES' ),
                name: 'Yes',
                value: 'Yes',
                action: 'close'
            },
            NO: {
                label: i18n( 'DCWindow.BUTTONS.NO' ),
                name: 'No',
                value: 'No',
                action: 'close'
            },
            SELECT: {
                label: i18n( 'DCWindow.BUTTONS.SELECT' ),
                name: 'SELECT',
                value: 'SELECT',
                action: 'close'
            },
            EDIT: {
                label: i18n( 'DCWindow.BUTTONS.EDIT' ),
                name: 'EDIT',
                value: 'EDIT',
                action: 'close'
            },
            SAVE: {
                label: i18n( 'DCWindow.BUTTONS.SAVE' ),
                name: 'SAVE',
                value: 'SAVE',
                action: 'close'
            },
            DISCARD: {
                label: i18n( 'DCWindow.BUTTONS.DISCARD' ),
                name: 'DISCARD',
                value: 'DISCARD',
                action: 'close'
            },
            BACK: {
                label: i18n( 'DCWindow.BUTTONS.BACK' ),
                name: 'BACK',
                value: 'BACK',
                action: 'close'
            },
            DELETE: {
                label: i18n( 'DCWindow.BUTTONS.DELETE' ),
                name: 'DELETE',
                value: 'DELETE',
                action: 'close'
            },
            GENERATE: {
                label: i18n( 'DCWindow.BUTTONS.GENERATE' ),
                name: 'GENERATE',
                value: 'GENERATE',
                action: 'close'
            }
        }
    } );

    /**
     * @property DCWindow
     * @for doccirrus
     * @type {DCWindow}
     */
    Y.doccirrus.DCWindow = DCWindow;
}, '0.0.1', {
    lang: ['en', 'de', 'de-ch'],
    requires: [
        'oop',
        'doccirrus',
        'classnamemanager',
        'panel', 'lazy-model-list', 'transition', 'widget-anim',
        'dd-plugin', 'dd-constrain',
        'resize-plugin', 'resize-constrain'
    ]/*,
     TODO: check https://yuilibrary.com/yui/docs/api/classes/Loader.html#property_skin
     "skinnable": true*/
} );
