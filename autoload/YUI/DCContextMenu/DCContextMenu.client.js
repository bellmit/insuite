/*jslint anon:true, nomen:true*/
/*global YUI, ko*/
YUI.add( 'DCContextMenu', function( Y/*, NAME*/ ) {
    'use strict';

    /**
     * The DCContextMenu module provides menu overlay capabilities
     * @module DCContextMenu
     * @requires doccirrus, widget, widget-autohide, widget-position, widget-position-align, widget-position-constrain, widget-stack, widget-stdmod, transition, widget-anim
     */

    /**
     * Provides a Manger for DCContextMenu
     * @class DCContextMenuManager
     * @extends LazyModelList
     * @constructor
     */
    function DCContextMenuManager() {
        DCContextMenuManager.superclass.constructor.apply( this, arguments );
    }

    Y.mix( DCContextMenuManager, {
        NAME: 'DCContextMenuManager',
        /**
         * get a menu by dom id
         * @method getById
         * @param {string} id
         * @returns {DCContextMenu|null}
         */
        getById: function( id ) {
            return Y.Widget.getByNode( '#' + id );
        }
    } );
    Y.extend( DCContextMenuManager, Y.LazyModelList, {
        /** @private */
        initializer: function() {
        },
        /** @private */
        destructor: function() {
        },
        /**
         * Destroys all currently created instances
         */
        destroyInstances: function() {

            Y.Array.invoke( this._items, 'destroy' );
        }
    } );

    /**
     * @class DCContextMenuItem
     * @constructor
     * @beta
     */
    function DCContextMenuItem( config ) {
        var
            self = this;

        self.text = config.text;
        self.title = config.title;
        self.disabled = config.disabled;
        self.visible = 'undefined' === typeof config.visible ? true : config.visible;
        self.href = config.href || 'javascript:;';// jshint ignore:line
        self.target = config.target;
        self.click = config.click || function(){};
    }

    /**
     * @property DCContextMenuItem
     * @for doccirrus
     * @type {DCContextMenuItem}
     */
    Y.doccirrus.DCContextMenuItem = DCContextMenuItem;

    Y.Event.defineOutside( 'touchstart' );

    /**
     * @class DCContextMenu
     * @extends Widget
     * @constructor
     * @beta
     */
    var
        DCContextMenu = Y.Base.create( 'DCContextMenu', Y.Widget, [
            Y.WidgetPosition,
            Y.WidgetStdMod,

            Y.WidgetAutohide,
            Y.WidgetPositionAlign,
            Y.WidgetPositionConstrain,
            Y.WidgetStack
        ], {
            initializer: function() {
                var
                    self = this;

                DCContextMenu.manager.add( self );
            },
            destructor: function() {
                var
                    self = this,
                    knockout = self.get( 'knockout' );

                DCContextMenu.manager.remove( self );

                if( knockout ) {
                    self.get( 'bodyContent' ).getDOMNodes().forEach( function( node ) {
                        ko.cleanNode( node );
                    } );
                }
            },
            /**
             * @method hide
             * @description Hides the Widget by setting the "visible" attribute to "false".
             * @chainable
             */
            hide: function() {
                var
                    self = this;

                DCContextMenu.superclass.hide.apply( self, arguments );

                if( 'destroy' === self.get( 'closeMode' ) ) {
                    self.destroy();
                }

                return self;
            },
            /**
             * @method _defRenderFn
             * @see Widget._defRenderFn
             * @protected
             */
            _defRenderFn: function() {
                var
                    self = this,
                    className = self.get( 'className' ),
                    bBox = self.get( 'boundingBox' ),
                    knockout = self.get( 'knockout' );

                bBox.addClass( 'DCContextMenu' );

                if( className ) {
                    bBox.addClass( className );
                }

                DCContextMenu.superclass._defRenderFn.apply( self, arguments );

                if( knockout ) {

                    ko.applyBindings( {
                        menu: self.get( 'menu' ),
                        menuClick: function( binding, $event ) {
                            var
                                menuItem = ko.dataFor( $event.target ),
                                clickAble = false;

                            if( menuItem.click ) {
                                if( 'disabled' in menuItem ) {
                                    clickAble = !ko.utils.peekObservable( menuItem.disabled );
                                }
                                else if( 'enabled' in menuItem ) {
                                    clickAble = ko.utils.peekObservable( menuItem.enabled );
                                }
                                else {
                                    clickAble = true;
                                }
                            }

                            if( clickAble ) {
                                menuItem.click.call( menuItem, menuItem, $event );
                            }

                        }
                    }, self.get( 'bodyContent' ).getDOMNodes()[0] );
                }

            },
            /**
             * @method close
             */
            close: function() {
                var
                    self = this;

                self.hide();
            },
            /**
             * Show Menu at page coordinates
             * - either pass an array of numbers [x, y]
             * - or numbers as parameters x, y
             * @method showAt
             * @param {Array|Number} xOrArray
             * @param {Number} [y]
             */
            showAt: function( xOrArray, y ) {
                var
                    self = this;

                if( Array.isArray( xOrArray ) ) {
                    self.set( 'xy', xOrArray );
                }
                else if( Y.Lang.isNumber( xOrArray ) && Y.Lang.isNumber( y ) ) {
                    self.set( 'xy', [xOrArray, y] );
                }

                self.show();

            }
        }, {
            NAME: 'DCContextMenu',
            ATTRS: {
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
                 * Whether or not to render the widget automatically after init, and optionally, to which parent node.
                 *
                 * @attribute render
                 * @type boolean | Node
                 * @writeOnce
                 */
                render: {
                    valueFn: function() {
                        return document.body;
                    },
                    writeOnce: true
                },
                /**
                 * @attribute visible
                 * @description Boolean indicating whether or not the Widget is visible.
                 * @default false
                 * @type boolean
                 */
                visible: {
                    value: false
                },
                /**
                 * @attribute zIndex
                 * @type number
                 * @default 0
                 * @description The z-index to apply to the Widgets boundingBox. Non-numerical values for
                 * zIndex will be converted to 0
                 */
                zIndex: {
                    value: 4000,
                    setter: '_setZIndex'
                },
                /**
                 * @attribute constrain
                 * @type boolean | Node
                 * @default null
                 * @description The node to constrain the widget's bounding box to, when setting xy. Can also be
                 * set to true, to constrain to the viewport.
                 */
                constrain: {
                    value: true,
                    setter: "_setConstrain"
                },
                /**
                 * @attribute preventOverlap
                 * @type boolean
                 * @description If set to true, and WidgetPositionAlign is also added to the Widget,
                 * constrained positioning will attempt to prevent the widget's bounding box from overlapping
                 * the element to which it has been aligned, by flipping the orientation of the alignment
                 * for corner based alignments
                 */
                preventOverlap: {
                    value: true
                },
                /**
                 * @attribute hideOn
                 * @type array
                 *
                 * @description An array of objects corresponding to the nodes, events, and keycodes to hide the widget on.
                 * The implementer can supply an array of objects, with each object having the following properties:
                 * <p>eventName: (string, required): The eventName to listen to.</p>
                 * <p>node: (Y.Node, optional): The Y.Node that will fire the event (defaults to the boundingBox of the widget)</p>
                 * <p>keyCode: (string, optional): If listening for key events, specify the keyCode</p>
                 * <p>By default, this attribute consists of one object which will cause the widget to hide if the
                 * escape key is pressed.</p>
                 */
                hideOn: {
                    validator: Y.Lang.isArray,
                    valueFn: function() {
                        return [
                            {
                                node: Y.one( document ),
                                eventName: 'key',
                                keyCode: 'esc'
                            },
                            {eventName: 'mousedownoutside'},
                            {eventName: 'touchstartoutside'},
                            {eventName: 'keydownoutside'},
                            {eventName: 'focusoutside'}
                        ];
                    },
                    lazyAdd: false
                },
                /**
                 * @attribute bodyContent
                 * @type HTML
                 * @default undefined
                 * @description The content to be added to the body section. This will replace any existing content
                 * in the body. If you want to append, or insert new content, use the <a href="#method_setStdModContent">setStdModContent</a> method.
                 */
                bodyContent: {
                    valueFn: function() {
                        var
                            self = this,
                            knockout = self.get( 'knockout' );

                        if( knockout ) {
                            return [
                                '<div class="dropdown open">',
                                '<ul class="dropdown-menu" data-bind="foreach: menu, click: menuClick">',
                                '<li data-bind="css: {disabled: disabled}, visible: visible"><a data-bind="text: text, attr: { href: href, target: target, title: title }"></a></li>',
                                '</ul>',
                                '</div>'
                            ].join( '' );
                        }
                        else {
                            return '<div class="dropdown open"><ul class="dropdown-menu"><li><a href="#">jmeter</a></li><li><a href="#">EJB</a></li><li><a href="#">Jasper Report</a></li><li class="divider"></li><li><a href="#">Separated link</a></li><li class="divider"></li><li><a href="#">One more separated link</a></li></ul></div>';
                        }

                    },
                    lazyAdd: false
                },
                /**
                 * @attribute knockout
                 * @type Boolean
                 * @default true
                 */
                knockout: {
                    value: true,
                    lazyAdd: false
                },
                /**
                 * @attribute menu
                 * @type Array|ko.observableArray
                 * @default []
                 */
                menu: {
                    valueFn: function() {
                        var
                            self = this,
                            knockout = self.get( 'knockout' );

                        if( knockout ) {
                            return ko.observableArray();
                        }
                        else {
                            return [];
                        }
                    },
                    lazyAdd: false
                },
                /**
                 * auto destroy this menu on hide
                 * - valid values are 'destroy', 'hide'
                 * @attribute closeMode
                 * @type {String}
                 * @default destroy
                 */
                closeMode: {
                    value: 'destroy',
                    lazyAdd: false
                }
            },
            /**
             * @property manager
             * @for doccirrus.DCContextMenu
             * @type {DCContextMenuManager}
             */
            manager: new DCContextMenuManager()
        } );

    /**
     * @property DCContextMenu
     * @for doccirrus
     * @type {DCContextMenu}
     */
    Y.doccirrus.DCContextMenu = DCContextMenu;

}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus',

        'lazy-model-list',

        'widget',
        'widget-autohide',
        'widget-position',
        'widget-position-align',
        'widget-position-constrain',
        'widget-stack',
        'widget-stdmod',

        'transition', 'widget-anim'
    ]
} );
