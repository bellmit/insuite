/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
'use strict';

YUI.add( 'KoMenu', function( Y, NAME ) {
    /**
     * @module KoMenu
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        //ignoreDependencies = ko.ignoreDependencies,
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        NOOP = KoUI.utils.Function.NOOP,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' );

    /**
     * __A menu visualization implementation.__
     *
     * Purpose is to wrap the [bootstrap Dropdowns](http://getbootstrap.com/components/#dropdowns) into a reusable component interface.
     *
     * _Be aware of that it only provides the list and handling of entries, it is not responsible to put it into a floating layer._
     *
     * @class KoMenu
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     * @example
     // markup: <!-- ko template: aKoMenu.template --><!-- /ko -->
     ko.applyBindings( {
         aKoMenu: KoComponentManager.createComponent( {
            componentType: 'KoMenu',
            componentConfig: {
                dropup: true, // will have an effect in the correct context e.g. KoButtonDropDown
                items: [
                    {
                        name: 'menu-foo',
                        text: 'foo',
                        title: 'foo',
                        icon: 'PLUS',
                        disabled: true,
                        click: function() {
                            console.warn( 'clicked foo', arguments, this );
                        }
                    },
                    {
                        name: 'menu-bar',
                        text: 'bar',
                        title: 'bar',
                        icon: 'CHEVRON_RIGHT',
                        click: function() {
                            console.warn( 'clicked bar', arguments, this );
                        }
                    },
                    {
                        separator: true
                    },
                    {
                        name: 'menu-baz',
                        text: 'baz',
                        title: 'baz',
                        click: function() {
                            console.warn( 'clicked baz', arguments, this );
                        },
                        menu: {
                            items: [
                                {
                                    name: 'menu-baz-foo',
                                    text: 'baz menu foo',
                                    title: 'baz menu foo',
                                    icon: 'LIST_ALT',
                                    disabled: true,
                                    click: function() {
                                        console.warn( 'clicked baz menu foo', arguments, this );
                                    },
                                    menu: {
                                        items: [
                                            {
                                                name: 'menu-baz-foo-foo',
                                                text: 'baz menu foo menu foo',
                                                disabled: true,
                                                click: function() {
                                                    console.warn( 'clicked baz menu foo menu foo', arguments, this );
                                                }
                                            },
                                            {
                                                name: 'menu-baz-foo-bar',
                                                text: 'baz menu foo menu bar',
                                                click: function() {
                                                    console.warn( 'clicked baz menu foo menu bar', arguments, this );
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    name: 'menu-baz-bar',
                                    text: 'baz menu bar',
                                    title: 'baz menu bar',
                                    icon: 'LIST_ALT',
                                    click: function() {
                                        console.warn( 'clicked baz menu bar', arguments, this );
                                    },
                                    menu: {
                                        items: [
                                            {
                                                name: 'menu-baz-bar-foo',
                                                text: 'baz menu bar menu foo',
                                                disabled: true,
                                                click: function() {
                                                    console.warn( 'clicked baz menu bar menu foo', arguments, this );
                                                }
                                            },
                                            {
                                                name: 'menu-baz-bar-bar',
                                                text: 'baz menu bar menu bar',
                                                click: function() {
                                                    console.warn( 'clicked baz menu bar menu bar', arguments, this );
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    name: 'menu-baz-baz',
                                    text: 'baz menu baz',
                                    title: 'baz menu baz',
                                    icon: 'LIST_ALT',
                                    click: function() {
                                        console.warn( 'clicked baz menu baz', arguments, this );
                                    },
                                    menu: {
                                        items: [
                                            {
                                                name: 'menu-baz-baz-foo',
                                                text: 'baz menu baz menu foo',
                                                disabled: true,
                                                click: function() {
                                                    console.warn( 'clicked baz menu baz menu foo', arguments, this );
                                                }
                                            },
                                            {
                                                name: 'menu-baz-baz-bar',
                                                text: 'baz menu baz menu bar',
                                                click: function() {
                                                    console.warn( 'clicked baz menu baz menu bar', arguments, this );
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        } )
     }, node.getDOMNode() );
     */
    function KoMenu() {
        KoMenu.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoMenu,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoMenu',
            init: function() {
                var
                    self = this;

                KoMenu.superclass.init.apply( self, arguments );
            },
            /**
             * Component destructor.
             * @method dispose
             * @for KoMenu
             */
            dispose: function() {
                var
                    self = this;

                Y.Array.invoke( peek( self.items ), 'dispose' );
                if( self.menuAlign ) {
                    self.menuAlign.dispose();
                }
                KoMenu.superclass.dispose.apply( self, arguments );
            },
            /**
             * The default component type for items to use when creating from plain config
             * @property itemsComponentType
             * @type String
             */
            itemsComponentType: 'KoMenuItem',
            /**
             * The component type for menu dividers
             * @property separatorComponentType
             * @type String
             */
            separatorComponentType: 'KoMenuSeparator',
            /**
             * Add an item or an array of items, of either plain config or instances
             * @method addItems
             * @param {Array|Object} items
             */
            addItems: function( items ) {
                var
                    self = this,
                    config,
                    itemConstructor;

                if( Array.isArray( items ) ) {
                    items.forEach( self.addItems, self );
                    return;
                }

                config = items;
                itemConstructor = KoComponentManager.registeredComponent( self.itemsComponentType );

                if( !itemConstructor ) {
                    Y.log( '"itemsComponentType" unknown constructor', 'error', NAME );
                    return;
                }

                if( !(config instanceof itemConstructor) ) {
                    config = KoComponentManager.createComponent( {
                        componentType: ( config.separator ? self.separatorComponentType : self.itemsComponentType ),
                        componentConfig: config
                    } );
                }

                config.owner = self;

                self.items.push( config );
            },

            /**
             * Removes all items with the given name
             * @method removeItemsByName
             * @param {String} name
             */
            removeItemsByName: function( name ) {
                var
                    self = this;

                self.items.remove( function( item ) {
                    return item.name() === name;
                } );
            },

            clearItems: function() {
                var
                    self = this,
                    items = self.items(),
                    i;

                for( i = 0; i < items.length; i++ ) {
                    items[i].dispose();
                }

                self.items( [] );
            },

            /**
             * Get an item by function returning true for that item
             * @method getItemBy
             * @param {Function} fn
             * @param {context} [scope]
             * @returns {null|KoMenuItem}
             */
            getItemBy: function( fn, scope ) {
                var
                    self = this;

                scope = scope || self;

                return Y.Array.find( peek( self.items ), fn, scope );
            },
            /**
             * Get an item by function returning true for that item, deep version walks through any sub menu instances.
             * @method getItemDeepBy
             * @param {Function} fn
             * @param {context} [scope]
             * @returns {null|KoMenuItem}
             */
            getItemDeepBy: function( fn, scope ) {
                var
                    self = this,
                    items = peek( self.items ),
                    found;

                scope = scope || self;

                found = Y.Array.find( items, fn, scope );

                if( !found ) {
                    Y.Array.some( items, function( item ) {
                        if( !item.menu ) {
                            return false;
                        }
                        found = item.menu.getItemDeepBy( fn, scope );
                        return Boolean( found );
                    } );
                    found = found || null;
                }

                return found;
            },
            /**
             * Get items by function returning true for those items
             * @method getItemsBy
             * @param {Function} fn
             * @param {context} [scope]
             * @returns {Array}
             */
            getItemsBy: function( fn, scope ) {
                var
                    self = this;

                scope = scope || self;

                return Y.Array.filter( peek( self.items ), fn, scope );
            },
            /**
             * Get an item by name
             * @method getItemByName
             * @param {String} name
             * @returns {null|KoMenuItem}
             */
            getItemByName: function( name ) {
                var
                    self = this;

                return self.getItemBy( function( item ) {
                    return peek( item.name ) === name;
                } );
            },
            /**
             * Get an item by name, deep version walks through any sub menu instances.
             * @method getItemDeepByName
             * @param {String} name
             * @returns {null|KoMenuItem}
             */
            getItemDeepByName: function( name ) {
                var
                    self = this;

                return self.getItemDeepBy( function( item ) {
                    return peek( item.name ) === name;
                } );
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( self.componentType ) );
            },
            /**
             * Observable array of {{#crossLink "KoMenuItem"}}{{/crossLink}}
             * @attribute items
             * @type {ko.observableArray}
             */
            items: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observableArray() );

                self.addItems( observable.removeAll() );

                return observable;
            },
            /**
             * In general used for the components top most element class names.
             * - [knockout "css" binding](http://knockoutjs.com/documentation/css-binding.html)
             * @attribute css
             * @type {Object}
             * @default {}
             * @for KoMenu
             */
            css: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( {} ) ),
                    defaults = {};

                //  makes submenu open to the left
                if( self.initialConfig.pullLeft ) {
                    defaults['pull-left'] = true;
                    defaults['pull-right'] = false;
                }

                if( self.initialConfig.pullRight ) {
                    defaults['pull-left'] = false;
                    defaults['pull-right'] = true;
                }

                Y.mix( peek( observable ), defaults );
                return observable;
            },
            /**
             * See [dropup](http://getbootstrap.com/components/#dropdowns-example).
             * @attribute dropup
             * @type {boolean}
             * @default false
             */
            dropup: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            }
        }
    } );
    /**
     * @property KoMenu
     * @type {KoMenu}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoMenu );

    /**
     * __A menu item visualization implementation.__
     * @class KoMenuItem
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoMenuItem() {
        KoMenuItem.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoMenuItem,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoMenuItem',
            init: function() {
                var self = this;
                KoMenuItem.superclass.init.apply( self, arguments );
            },
            /**
             * Component destructor.
             * @method dispose
             * @for KoMenuItem
             */
            dispose: function() {
                var
                    self = this;

                if( self.menu ) {
                    self.menu.dispose();
                }

                KoMenuItem.superclass.dispose.apply( self, arguments );

            },
            /**
             * Enhances the click binder with more parameters
             * @method bindClick
             * @param {Object} $context
             * @return {Function}
             * @protected
             */
            bindClick: function( $context ) {
                var
                    self = this;

                return Y.rbind( self.handleClick, self, $context );
            },
            /** @protected */
            clickIsSuppressed: function( /*me*/ ) {
                var
                    self = this;

                return unwrap( self.disabled );
            },
            /** @protected */
            hrefIsSuppressed: function( /*me, $event, $context*/ ) {
                var
                    self = this;

                return unwrap( self.disabled );
            },
            /** @protected */
            handleClick: function( me, $event/*, $context*/ ) {
                var
                    self = this,
                    clickReturn = true;

                if( self.click !== NOOP ) {

                    if( self.clickIsSuppressed.call( self, me ) ) {
                        $event.preventDefault();
                        $event.stopImmediatePropagation();
                        return false;
                    }

                    clickReturn = self.click.apply( self, arguments );
                    if( Y.Lang.isUndefined( clickReturn ) ) {
                        clickReturn = true;
                    }
                }

                return clickReturn;
            },
            /**
             * Provide your own click handling by overwriting this method.
             * @method click
             * @param {KoMenuItem} menuItem The KoMenuItem instance
             * @param {Event} event The click Event
             * @param {Object} $context The ko context the menuItem template acts in
             */
            click: NOOP
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( self.componentType ) );
            },
            /**
             * In general used for the components top most element class names.
             * - [knockout "css" binding](http://knockoutjs.com/documentation/css-binding.html)
             * @attribute css
             * @type {Object}
             * @default {}
             * @for KoMenuItem
             */
            css: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( {} ) ),
                    defaults = {};

                defaults.disabled = self.disabled;
                defaults.active = self.active;

                // "dropdown-submenu" class name has to be applied on container (KoMenuItem)
                if( self.menu ) {
                    defaults['dropdown-submenu'] = true;
                }

                //  makes submenu open to the left
                if( self.initialConfig.pullLeft ) {
                    defaults['pull-left'] = true;
                    defaults['pull-right'] = false;
                }

                if( self.initialConfig.pullRight ) {
                    defaults['pull-left'] = false;
                    defaults['pull-right'] = true;
                }

                Y.mix( peek( observable ), defaults );
                return observable;
            },
            /**
             * The text in the item
             * @attribute text
             * @type {String}
             * @default ''
             */
            text: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * The html in the item
             * @attribute html
             * @type {String}
             * @default ''
             */
            html: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * The href of the item
             * @attribute href
             * @type {undefined|String}
             * @default undefined
             */
            href: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            },
            /**
             * The target of the item
             * @attribute target
             * @type {undefined|String}
             * @default undefined
             */
            target: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            },
            /**
             * Computes href appliance for template
             * @returns {ko.computed|null|String}
             * @protected
             */
            _attrHref: function( /*key*/ ) {
                var
                    self = this,
                    computed = ko.computed( function() {
                        var
                            href = unwrap( self.href );

                        if( self.hrefIsSuppressed() ) {
                            return null;
                        }
                        return href;
                    } );

                return computed;
            },
            icon: function() {
                var
                    self = this;

                if( !self.initialConfig.icon ) {
                    return null;
                }

                return KoComponentManager.createComponent( { iconName: self.initialConfig.icon }, 'KoIcon' );
            },
            /**
             * Activate this instance
             * @attribute active
             * @type {Boolean}
             * @default false
             */
            active: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * Let the item have a menu
             * @attribute menu
             * @type {null|KoMenu}
             * @example
             // … ,
             menu: {
                items: [
                    {
                        name: 'menu-baz-foo',
                        text: 'baz menu foo',
                        title: 'baz menu foo',
                        icon: 'LIST_ALT',
                        disabled: true,
                        click: function() {
                            console.warn( 'clicked baz menu foo', arguments, this );
                        },
                        menu: {
                            items: [
                                {
                                    name: 'menu-baz-foo-foo',
                                    text: 'baz menu foo menu foo',
                                    disabled: true,
                                    click: function() {
                                        console.warn( 'clicked baz menu foo menu foo', arguments, this );
                                    }
                                },
                                {
                                    name: 'menu-baz-foo-bar',
                                    text: 'baz menu foo menu bar',
                                    click: function() {
                                        console.warn( 'clicked baz menu foo menu bar', arguments, this );
                                    }
                                }
                            ]
                        }
                    },
                    {
                        name: 'menu-baz-bar',
                        text: 'baz menu bar',
                        title: 'baz menu bar',
                        icon: 'LIST_ALT',
                        click: function() {
                            console.warn( 'clicked baz menu bar', arguments, this );
                        },
                        menu: {
                            items: [
                                {
                                    name: 'menu-baz-bar-foo',
                                    text: 'baz menu bar menu foo',
                                    disabled: true,
                                    click: function() {
                                        console.warn( 'clicked baz menu bar menu foo', arguments, this );
                                    }
                                },
                                {
                                    name: 'menu-baz-bar-bar',
                                    text: 'baz menu bar menu bar',
                                    click: function() {
                                        console.warn( 'clicked baz menu bar menu bar', arguments, this );
                                    }
                                }
                            ]
                        }
                    },
                    {
                        name: 'menu-baz-baz',
                        text: 'baz menu baz',
                        title: 'baz menu baz',
                        icon: 'LIST_ALT',
                        click: function() {
                            console.warn( 'clicked baz menu baz', arguments, this );
                        },
                        menu: {
                            items: [
                                {
                                    name: 'menu-baz-baz-foo',
                                    text: 'baz menu baz menu foo',
                                    disabled: true,
                                    click: function() {
                                        console.warn( 'clicked baz menu baz menu foo', arguments, this );
                                    }
                                },
                                {
                                    name: 'menu-baz-baz-bar',
                                    text: 'baz menu baz menu bar',
                                    click: function() {
                                        console.warn( 'clicked baz menu baz menu bar', arguments, this );
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
             */
            menu: function() {
                var
                    self = this,
                    config = self.initialConfig.menu;

                if( config ) {

                    if( !(config instanceof KoMenu) ) {
                        config = KoComponentManager.createComponent( {
                            componentType: 'KoMenu',
                            componentConfig: config
                        } );
                    }

                    config.owner = self;

                    return config;
                }
                else {

                    return null;
                }

            }
        }
    } );
    /**
     * @property KoMenuItem
     * @type {KoMenuItem}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoMenuItem );

    /**
     * __A menu separator visualization implementation.__
     * @class KoMenuSeparator
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoMenuSeparator() {
        KoMenuSeparator.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoMenuSeparator,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoMenuSeparator',
            init: function() {
                var self = this;
                KoMenuSeparator.superclass.init.apply( self, arguments );
            },
            /**
             * Component destructor.
             * @method dispose
             * @for KoMenuSeparator
             */
            dispose: function() {
                var self = this;
                KoMenuSeparator.superclass.dispose.apply( self, arguments );
            },
            /**
             * Provide your own click handling by overwriting this method.
             * @method click
             * @param {KoMenuSeparator} menuItem The KoMenuSeparator instance
             * @param {Event} event The click Event
             * @param {Object} $context The ko context the menuItem template acts in
             */
            click: NOOP
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( self.componentType ) );
            },
            /**
             * In general used for the components top most element class names.
             * - [knockout "css" binding](http://knockoutjs.com/documentation/css-binding.html)
             * @attribute css
             * @type {Object}
             * @default {}
             * @for KoMenuSeparator
             */
            css: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( {} ) ),
                    defaults = {};

                defaults.disabled = self.disabled;
                defaults.active = self.active;

                Y.mix( peek( observable ), defaults );

                return observable;
            },
            /**
             * Activate this instance
             * @attribute active
             * @type {Boolean}
             * @default false
             */
            active: function( key ) {
                var self = this;
                return self._handleLazyConfig( key, ko.observable( false ) );
            }
        }
    } );
    /**
     * @property KoMenuSeparator
     * @type {KoMenuSeparator}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoMenuSeparator );

}, '3.16.0', {
    requires: [
        'oop',
        'KoUI',
        'KoUI-utils-Function',
        'KoComponentManager',
        'KoComponent'
    ]
} );
