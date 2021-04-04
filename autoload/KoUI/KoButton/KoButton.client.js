/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, $, ko */
YUI.add( 'KoButton', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoButton
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        //peek = ko.utils.peekObservable,
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        NOOP = KoUI.utils.Function.NOOP,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' ),
        KoMenu = KoComponentManager.registeredComponent( 'KoMenu' );

    /**
     * __A button implementation.__
     * @class KoButton
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     * @example
     // markup: <div data-bind="template: aKoButton.template"></div>
     ko.applyBindings( {
         aKoButton: KoComponentManager.createComponent( {
             componentType: 'KoButton',
             componentConfig: {
                 name: 'aKoButton',
                 text: 'KoButton',
                 // title: 'KoButton',
                 // disabled: true,
                 // option: 'PRIMARY',
                 // size: 'SMALL',
                 click: function() {
                     alert( 'clicked a KoButton' );
                 }
             }
         } )
     }, node.getDOMNode() );
     */
    function KoButton() {
        KoButton.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoButton,
        extends: KoComponent,
        static: {
            /**
             * Constants for KoButton.
             * @property CONST
             * @static
             * @final
             * @type {object}
             * @for KoButton
             */
            CONST: {
                OPTIONS: {
                    DEFAULT: 'btn-default',
                    PRIMARY: 'btn-primary',
                    SUCCESS: 'btn-success',
                    INFO: 'btn-info',
                    DANGER: 'btn-danger',
                    LINK: 'btn-link',
                    WARNING: 'btn-warning',
                    CLOSE: 'close glyphicon glyphicon-remove'
                },
                SIZE: {
                    DEFAULT: '',
                    XSMALL: 'btn-xs',
                    SMALL: 'btn-sm',
                    LARGE: 'btn-lg'
                }
            }
        },
        descriptors: {
            componentType: 'KoButton',
            init: function() {
                var self = this;
                KoButton.superclass.init.apply( self, arguments );

                self.addDisposable( ko.computed( function() {
                    var
                        OPTIONS = KoButton.CONST.OPTIONS,
                        option = ko.unwrap( self.option ),
                        SIZE = KoButton.CONST.SIZE,
                        size = ko.unwrap( self.size ),
                        css = self.css.peek();

                    Y.each( OPTIONS, function( value, key ) {
                        css[OPTIONS[key]] = (option === key);
                    } );
                    Y.each( SIZE, function( value, key ) {
                        css[SIZE[key]] = (size === key);
                    } );
                    self.css.valueHasMutated();
                }, self ) );
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

                return Y.rbind( self.click, self, $context );
            },
            /**
             * Enhances the disabled with context
             * @method getDisabled
             * @param {Object} $context
             * @return {Ko.Computed}
             * @protected
             */
            getDisabled: function( /*$context*/ ){
                return this.disabled;
            },
            /**
             * Provide your own click handling by overwriting this method.
             * @method click
             * @param {KoButton} button The KoButton instance
             * @param {Event} event The click Event
             * @param {Object} $context The ko context the button template acts in
             */
            click: NOOP
        },
        lazy: {
            /**
             * The text in the button
             * @attribute text
             * @type {String}
             * @default undefined
             */
            text: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            },
            /**
             * The bootstrap option of the button. Takes a string key defined at "KoButton.CONST.OPTIONS".
             * @attribute option
             * @type {String}
             * @default 'DEFAULT'
             * @see KoButton.CONST.OPTIONS
             */
            option: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'DEFAULT' ) );
            },
            /**
             * The bootstrap size of the button. Takes a string key defined at "KoButton.CONST.SIZE".
             * @attribute size
             * @type {String}
             * @default 'DEFAULT'
             * @see KoButton.CONST.SIZE
             */
            size: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'DEFAULT' ) );
            },
            /**
             * At configuration level takes a string key defined at "KoIcon.CONST.ICON" to instantiate a KoIcon with that "iconName".
             * @property icon
             * @type {string|KoIcon}
             */
            icon: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( { iconName: self.initialConfig.icon }, 'KoIcon' );
            },
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoButton' ) );
            }
        }
    } );
    /**
     * @property KoButton
     * @type {KoButton}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoButton );

    /**
     * __A button with menu implementation.__
     * @class KoButtonDropDown
     * @constructor
     * @extends KoButton
     * @param {Object} config a configuration object
     * @example
     // markup: <div data-bind="template: aKoButtonDropDown.template"></div>
     ko.applyBindings( {
         aKoButtonDropDown: KoComponentManager.createComponent( {
            componentType: 'KoButtonDropDown',
            componentConfig: {
                name: 'aKoButtonDropDown',
                text: 'Tools',
                title: 'KoButtonDropDown',
                icon: 'GEAR',
                option: 'PRIMARY',
                size: 'SMALL',
                menu: {
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
                            name: 'menu-baz',
                            text: 'baz',
                            title: 'baz',
                            click: function() {
                                console.warn( 'clicked baz', arguments, this );
                            }
                        }
                    ]
                }
            }
        } )
     }, node.getDOMNode() );
     * @beta
     */
    function KoButtonDropDown() {
        KoButtonDropDown.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoButtonDropDown,
        extends: KoButton,
        descriptors: {
            componentType: 'KoButtonDropDown',
            init: function() {
                var
                    self = this;

                KoButtonDropDown.superclass.init.apply( self, arguments );
            },

            /**
             *  Element which controls menu toggle
             *  @return {*}
             */

            getMenuElem: function() {
                var
                    self = this,
                    elems = self.elements(),
                    elem = elems && elems[0] ? elems[0] : null;

                return elem;
            },

            /**
             *  Programatically drop down the menu
             */

            openMenu: function() {
                var
                    self = this,
                    elem = self.getMenuElem();

                if ( !elem ) { return; }
                $( elem ).addClass('open');
            },

            /**
             *  Programatically close the menu if not open
             */

            closeMenu: function() {
                var
                    self = this,
                    elem = self.getMenuElem();

                if ( !elem ) { return; }
                $( elem ).removeClass('open');
            },

            /**
             *  Check if the menu is open right now
             *  @return {*|boolean|jQuery}
             */

            isMenuOpen: function() {
                var
                    self = this,
                    elem = self.getMenuElem();

                if ( !elem ) { return; }
                return $( elem ).hasClass('open');
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoButtonDropDown' ) );
            },
            /**
             * The menu for the drop down
             * @attribute menu
             * @type {KoMenu}
             */
            menu: function() {
                var
                    self = this,
                    config = self.initialConfig.menu;
                
                if( config ) {

                    //  default to float to the right
                    if ( !config.hasOwnProperty( 'pullRight' ) ) {
                        config.pullRight = true;
                    }

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
     * @property KoButtonDropDown
     * @type {KoButtonDropDown}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoButtonDropDown );


    function KoButtonSplitDropDown() {
        KoButtonSplitDropDown.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoButtonSplitDropDown,
        extends: KoButton,
        descriptors: {
            componentType: 'KoButtonSplitDropDown',
            init: function() {
                var
                    self = this;

                KoButtonSplitDropDown.superclass.init.apply( self, arguments );
            },

            /**
             *  Element which controls menu toggle
             *  @return {*}
             */

            getMenuElem: function() {
                var
                    self = this,
                    elems = self.elements(),
                    elem = elems && elems[0] ? elems[0] : null;

                return elem;
            },

            /**
             *  Programatically drop down the menu
             */

            openMenu: function() {
                var
                    self = this,
                    elem = self.getMenuElem();

                if ( !elem ) { return; }
                $( elem ).addClass('open');
            },

            /**
             *  Programatically close the menu if not open
             */

            closeMenu: function() {
                var
                    self = this,
                    elem = self.getMenuElem();

                if ( !elem ) { return; }
                $( elem ).removeClass('open');
            },

            /**
             *  Check if the menu is open right now
             *  @return {*|boolean|jQuery}
             */

            isMenuOpen: function() {
                var
                    self = this,
                    elem = self.getMenuElem();

                if ( !elem ) { return; }
                return $( elem ).hasClass('open');
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoButtonSplitDropDown' ) );
            },
            /**
             * The menu for the drop down
             * @attribute menu
             * @type {KoMenu}
             */
            menu: function() {
                var
                    self = this,
                    config = self.initialConfig.menu;

                if( config ) {

                    //  default to float to the right
                    if ( !config.hasOwnProperty( 'pullRight' ) ) {
                        config.pullRight = true;
                    }

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
     * @property KoButtonSplitDropDown
     * @type {KoButtonSplitDropDown}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoButtonSplitDropDown );


}, '3.16.0', {
    requires: [
        'oop',
        'KoUI',
        'KoUI-utils-Function',
        'KoComponentManager',
        'KoComponent',
        'KoMenu'
    ]
} );
