/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'KoNav', function( Y, NAME ) {
    'use strict';
    /**
     * @module KoNav
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
    //ignoreDependencies = ko.ignoreDependencies,
        KoUI = Y.doccirrus.KoUI,
        utilsObject = KoUI.utils.Object,
        makeClass = utilsObject.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoMenu = KoComponentManager.registeredComponent( 'KoMenu' ),
        KoMenuItem = KoComponentManager.registeredComponent( 'KoMenuItem' );

    /**
     * Test if a tab can be activated (Checks visibility, disabled and such …).
     * @method canTabBeActivated
     * @param {KoNavItem} tab
     * @returns {boolean}
     * @for KoNav
     * @static
     */
    function canTabBeActivated( tab ) {
        return Boolean( tab && peek( tab.visible ) && !peek( tab.disabled ) );
    }

    /**
     * __A navigation visualization implementation.__
     *
     * Purpose is to wrap the [bootstrap Navs](http://getbootstrap.com/components/#nav) into a reusable component interface.
     *
     * @class KoNav
     * @constructor
     * @extends KoMenu
     * @param {Object} config a configuration object
     * @example
     // markup: <div data-bind="template: aKoNav.template"></div>
     ko.applyBindings( {
         aKoNav: KoComponentManager.createComponent( {
            componentType: 'KoNav',
            componentConfig: {
                items: [
                    {
                        active: true,
                        text: 'active',
                        name: 'active',
                        click: function( me ) {
                            me.active( true );
                            console.warn( 'active', arguments );
                        }
                    },
                    {
                        text: 'default',
                        name: 'default'
                    },
                    {
                        text: 'click',
                        name: 'click',
                        click: function( item ) {
                            item.active( true );
                            console.warn( 'click', arguments );
                        }
                    },
                    {
                        text: 'href',
                        name: 'href',
                        href: '#/href'
                    },
                    {
                        text: 'both',
                        name: 'both',
                        click: function( item, $event ) {
                            item.owner.activateTab( item );

                            console.warn( 'both', arguments );
                            // $event.preventDefault(); // prevents default (won't execute href)
                            // $event.stopImmediatePropagation(); // stops propagation immediately
                            // return false; // won't execute href
                            // return true; // equals return ; // will execute href
                        },
                        href: '#/both'
                    },
                    {
                        disabled: true,
                        text: 'disabled',
                        name: 'disabled',
                        click: function( me ) {
                            me.active( true );
                            console.warn( 'disabled', arguments );
                        }
                    },
                    {
                        text: 'href disabled',
                        name: 'href-disabled',
                        disabled: true,
                        href: '#/href-disabled'
                    },
                    {
                        text: 'both disabled',
                        name: 'both-disabled',
                        disabled: true, // won't execute click or href
                        click: function( me ) {
                            me.active( true );
                            console.warn( 'both disabled', arguments );
                        },
                        href: '#/both-disabled'
                    },
                    {
                        text: 'menu',
                        name: 'menu',
                        title: 'this tab has a title attribute',
                        badge: '0',
                        //disabled: true,
                        menu: {
                            items: [
                                {
                                    text: 'menu item 1',
                                    name: 'menu-item-1',
                                    //disabled: true,
                                    click: function( item, $event ) {
                                        aKoNav.activateTab( 'menu' );
                                        console.warn( 'menu-item-1', arguments );
                                        // $event.preventDefault(); // prevents default (won't execute href)
                                        // $event.stopImmediatePropagation(); // stops propagation immediately
                                        // return false; // won't execute href
                                        // return true; // equals return ; // will execute href
                                    },
                                    href: '#/menu-item-1'
                                },
                                {
                                    text: 'menu item 2',
                                    name: 'menu-item-2',
                                    disabled: true,
                                    //click: function( item, $event ) {
                                    //
                                    //    console.warn( 'menu-item-2', arguments );
                                    //    // $event.preventDefault(); // prevents default (won't execute href)
                                    //    // $event.stopImmediatePropagation(); // stops propagation immediately
                                    //    // return false; // won't execute href
                                    //    // return true; // equals return ; // will execute href
                                    //},
                                    href: '#/menu-item-2'
                                },
                                {
                                    text: 'menu item 3',
                                    name: 'menu-item-3',
                                    menu: {
                                        items: [
                                            {
                                                name: 'menu-item-3-sub-1',
                                                text: 'menu item 3 sub 1',
                                                title: 'menu item 3 sub 1',
                                                icon: 'PLUS',
                                                disabled: true,
                                                click: function() {
                                                    console.warn( 'clicked menu-item-3-sub-1', arguments, this );
                                                }
                                            },
                                            {
                                                name: 'menu-item-3-sub-2',
                                                text: 'menu item 3 sub 2',
                                                title: 'menu item 3 sub 2',
                                                icon: 'CHEVRON_RIGHT',
                                                click: function() {
                                                    console.warn( 'clicked menu-item-3-sub-2', arguments, this );
                                                }
                                            },
                                            {
                                                name: 'menu-item-3-sub-3',
                                                text: 'menu item 3 sub 3',
                                                title: 'menu item 3 sub 3',
                                                menu: {
                                                    items: [
                                                        {
                                                            name: 'menu-item-3-sub-3-sub-1',
                                                            text: 'menu item 3 sub 3 sub 1',
                                                            title: 'menu item 3 sub 3 sub 1',
                                                            icon: 'PLUS',
                                                            disabled: true,
                                                            click: function() {
                                                                console.warn( 'clicked menu-item-3-sub-3-sub-1', arguments, this );
                                                            }
                                                        },
                                                        {
                                                            name: 'menu-item-3-sub-3-sub-2',
                                                            text: 'menu item 3 sub 3 sub 2',
                                                            title: 'menu item 3 sub 3 sub 2',
                                                            icon: 'CHEVRON_RIGHT',
                                                            click: function() {
                                                                console.warn( 'clicked menu-item-3-sub-3-sub-2', arguments, this );
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
                    },
                    {
                        text: 'icon',
                        title: 'icon',
                        name: 'icon',
                        icon: 'PLUS',
                        click: function( me ) {
                            me.active( true );
                            console.warn( 'icon', arguments );
                        },
                        badge: 'badge',
                        badgeTitle: 'this badge is clickable',
                        onBadgeClick: function( me, event ) {
                            console.warn( 'badge', arguments );
                            event.stopPropagation();
                        }
                    }
                ]
            }
        } )
     }, node.getDOMNode() );
     */
    function KoNav() {
        KoNav.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoNav,
        extends: KoMenu,
        descriptors: {
            componentType: 'KoNav',
            itemsComponentType: 'KoNavItem',
            init: function() {
                var
                    self = this;

                KoNav.superclass.init.apply( self, arguments );

                self.activeTab(); // explicitly initialize computed

            },
            /**
             * Activate a tab by name, item index or instance
             * - protects activation if invisible or disabled
             * @method activateTab
             * @param {String|Number|KoNavItem} tab
             * @returns {boolean} indicates activation successful
             */
            activateTab: function( tab ) {
                var
                    self = this,
                    items = peek( self.items );

                if( Y.Lang.isNumber( tab ) ) {
                    tab = items[tab];
                }
                else if( Y.Lang.isString( tab ) ) {
                    tab = self.getItemByName( tab );
                }

                if( !canTabBeActivated( tab ) ) {
                    return false;
                }

                tab.active( true );

                return true;
            }
        },
        lazy: {
            /**
             * Observable array of {{#crossLink "KoNavItem"}}{{/crossLink}}
             * @attribute items
             * @type {ko.observableArray}
             */
            /**
             * In general used for the components top most element class names.
             * - [knockout "css" binding](http://knockoutjs.com/documentation/css-binding.html)
             * @attribute css
             * @type {Object}
             * @default {}
             * @for KoNav
             */
            css: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( {} ) ),
                    defaults = {};

                defaults['nav-pills'] = self.pills;
                defaults['nav-tabs'] = self.tabs;
                defaults['nav-justified'] = self.justified;
                defaults['nav-stacked'] = self.stacked;

                Y.mix( peek( observable ), defaults );

                return observable;
            },
            /**
             * [Tabs](http://getbootstrap.com/components/#nav-pills)
             * @attribute tabs
             * @type {boolean}
             * @default true
             */
            tabs: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * [Pills](http://getbootstrap.com/components/#nav-pills)
             * @attribute pills
             * @type {boolean}
             * @default false
             */
            pills: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * [Justified](http://getbootstrap.com/components/#nav-justified)
             * @attribute justified
             * @type {boolean}
             * @default false
             */
            justified: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * [Vertical variation](http://getbootstrap.com/components/#nav-pills)
             * @attribute stacked
             * @type {boolean}
             * @default false
             */
            stacked: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * @property activeTab
             * @type {null|KoNavItem}
             */
            activeTab: function( /*key*/ ) {
                var
                    self = this,
                    lastActiveItem = null;

                return ko.computed( function() {
                    var
                        items = unwrap( self.items ),
                        activeItem = null,
                        activeItems = Y.Array.filter( items, function( item ) {
                            return peek( item.active );
                        } );

                    items.forEach( function( item ) {
                        unwrap( item.active ); // subscribe
                    } );

                    if( activeItems.length > 1 ) {
                        activeItems.forEach( function( item ) {
                            if( lastActiveItem !== item ) {
                                activeItem = item;
                            }
                            if( activeItem !== item ) {
                                item.active( false );
                            }
                        } );
                    }
                    else if( activeItems.length === 1 ) {
                        activeItem = activeItems[0];
                    }

                    lastActiveItem = activeItem;

                    return activeItem;
                }, self );
            }
        },
        static: {
            canTabBeActivated: canTabBeActivated
        }
    } );
    /**
     * @property KoNav
     * @type {KoNav}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoNav );

    /**
     * __A navigation item visualization implementation.__
     * @class KoNavItem
     * @constructor
     * @extends KoMenuItem
     * @param {Object} config a configuration object
     */
    function KoNavItem() {
        KoNavItem.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoNavItem,
        extends: KoMenuItem,
        descriptors: {
            componentType: 'KoNavItem',
            /** @protected */
            clickIsSuppressed: function( /*me*/ ) {
                var
                    self = this,
                    parentResult = KoNavItem.superclass.clickIsSuppressed.apply( self, arguments ),
                    active = unwrap( self.active ),
                    menu = unwrap( self.menu ),
                    suppressClickWhenActive = unwrap( self.suppressClickWhenActive );

                if( parentResult ) {
                    return parentResult;
                }

                if( !menu && active && suppressClickWhenActive ) {
                    return true;
                }

                return false;
            },
            /** @protected */
            hrefIsSuppressed: function( /*me, $event, $context*/ ) {
                var
                    self = this,
                    parentResult = KoNavItem.superclass.hrefIsSuppressed.apply( self, arguments ),
                    active = unwrap( self.active ),
                    menu = unwrap( self.menu ),
                    suppressHrefWhenActive = unwrap( self.suppressHrefWhenActive );

                if( parentResult ) {
                    return parentResult;
                }

                if( !menu && active && suppressHrefWhenActive ) {
                    return true;
                }

                return false;
            },
            /**
             * Meant to overwrite - provide a click handler for a badge click.
             *
             * function receives data and should return boolean
             * @property onBadgeClick
             * @for KoNavItem
             * @type {null|Function}
             */
            onBadgeClick: null,
            _onBadgeClick: function( /*item, event*/ ) {
                var
                    self = this;

                if( self.onBadgeClick ) {
                    self.onBadgeClick.apply( self, arguments );
                    return false;
                }
                return true;
            },
            _onBadgeMouseDown: function() {
                // prevents focus outline
                var
                    self = this;

                return !self.onBadgeClick;
            }
        },
        lazy: {
            /**
             * In general used for the components top most element class names.
             * - [knockout "css" binding](http://knockoutjs.com/documentation/css-binding.html)
             * @attribute css
             * @type {Object}
             * @default {}
             * @for KoNavItem
             */
            css: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( {} ) ),
                    defaults = {};

                defaults.active = self.active;
                defaults.disabled = self.disabled;

                // "dropup" class name has to be applied on container (KoNavItem)
                if( self.menu && peek( self.menu.dropup ) ) {
                    defaults.dropup = self.menu.dropup;
                }

                Y.mix( peek( observable ), defaults );

                return observable;
            },
            /**
             * Activate this instance
             * - protects activation if invisible or disabled
             * @attribute active
             * @type {ko.computed|Boolean}
             * @for KoNavItem
             */
            active: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( false ) ),
                    computed;

                computed = ko.computed( {
                    read: observable,
                    write: function( value ) {
                        if( value && !canTabBeActivated( self ) ) {
                            Y.log( 'prevented invisible or disabled tab activation', 'warn', NAME );
                            return;
                        }
                        observable( value );
                    }
                } );

                return computed;
            },
            /**
             * Suppress Click when active
             * @attribute suppressClickWhenActive
             * @type {Boolean}
             * @default true
             */
            suppressClickWhenActive: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * Error highlighting of navigation items.
             * @attribute hasDanger
             * @type {Boolean}
             * @default true
             */
            hasDanger: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * Suppress Href when active
             * @attribute suppressHrefWhenActive
             * @type {Boolean}
             * @default false
             */
            suppressHrefWhenActive: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * [Badges](http://getbootstrap.com/components/#badges): Easily highlight new or unread items by adding a badge to links, Bootstrap navs, and more.
             * @attribute badge
             * @type {String}
             * @default ''
             */
            badge: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * Additional class names for the badge element.
             * - [knockout "css" binding](http://knockoutjs.com/documentation/css-binding.html)
             * @attribute badgeCss
             * @type {Object}
             * @default {}
             */
            badgeCss: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( {} ) ),
                    defaults = {};

                defaults['KoNavItem-badge-clickAble'] = Boolean( self.initialConfig.onBadgeClick );

                Y.mix( peek( observable ), defaults );

                return observable;
            },
            /**
             * Additional title attribute for the badge element
             * @attribute badgeTitle
             * @type {String|undefined}
             * @default undefined
             */
            badgeTitle: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            }
        }
    } );
    /**
     * @property KoNavItem
     * @type {KoNavItem}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoNavItem );

}, '3.16.0', {
    requires: [
        'KoUI',
        'KoComponentManager',
        'KoMenu'
    ]
} );
