/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'NavBarFooter', function( Y, NAME ) {
    'use strict';

    if( !window.ko ) {
        Y.log( 'yui: NOT loaded: ko', 'warn', NAME );
        return;
    }

    /**
     * @module NavBarFooter
     * @example
     var someButton = NavBarFooter.{{#crossLink "NavBarBtnGroup"}}btnGroup{{/crossLink}}.{{#crossLink "NavBarBtnGroup/addButton:method"}}{{/crossLink}}( {
                {{#crossLink "NavBarButton/id:property"}}{{/crossLink}}: 'someUniqueId', // mandatory
                {{#crossLink "NavBarButton/name:property"}}{{/crossLink}}: 'someName', // mandatory
                {{#crossLink "NavBarButton/text:property"}}{{/crossLink}}: 'some text or markup', // mandatory
                {{#crossLink "NavBarButton/title:property"}}{{/crossLink}}: 'some title', // nice if
                {{#crossLink "NavBarButton/css:property"}}{{/crossLink}}: {'btn-default': true}, // mandatory
                {{#crossLink "NavBarButton/disabled:property"}}{{/crossLink}}: false, // use default
                {{#crossLink "NavBarButton/visible:property"}}{{/crossLink}}: true, // use default
                click: function() { // mandatory
                    console.warn( 'click :', {
                        "arguments": arguments,
                        'this': this
                    } );
                }
            } );

     NavBarFooter.{{#crossLink "NavBarBtnGroup"}}btnGroup{{/crossLink}}.{{#crossLink "NavBarBtnGroup/addButton:method"}}{{/crossLink}}( {
            {{#crossLink "NavBarButton/id:property"}}{{/crossLink}}: 'uniqueId',
            {{#crossLink "NavBarButton/name:property"}}{{/crossLink}}: 'name',
            {{#crossLink "NavBarButton/text:property"}}{{/crossLink}}: 'some text',
            {{#crossLink "NavBarButton/css:property"}}{{/crossLink}}: {'btn-default': true},
            {{#crossLink "NavBarButton/disabled:property"}}{{/crossLink}}: ko.computed( function() {
                return false;
            } ),
            click: function() {
                // …
            }
        } );

     setTimeout( function() {
            NavBarFooter.{{#crossLink "NavBarBtnGroup"}}btnGroup{{/crossLink}}.{{#crossLink "NavBarBtnGroup/removeButton:method"}}{{/crossLink}}( someButton );
            NavBarFooter.{{#crossLink "NavBarBtnGroup"}}btnGroup{{/crossLink}}.{{#crossLink "NavBarBtnGroup/removeButton:method"}}{{/crossLink}}( 'uniqueId' );
        }, 3000 );
     */

    var
        peek = ko.utils.peekObservable,
        KoViewModel = Y.doccirrus.KoViewModel,
        SystemMessagesCounter = KoViewModel.getConstructor( 'SystemMessagesCounter' ),
    // unwrap = ko.unwrap,
    // ignoreDependencies = ko.ignoreDependencies,

        NS = Y.namespace( 'doccirrus' ),
        NavBarFooterContainer = document.getElementById( 'NavBarFooter-container' ),
        i18n = Y.doccirrus.i18n;

    if( !NavBarFooterContainer ) {
        return;
    }

    /**
     * Get localStorage data associated with this module
     * @param {String} propertyName
     * @return {undefined|*}
     */
    function getLocalStorageValueOfModule( propertyName ) {
        var
            localValue = Y.doccirrus.utils.localValueGet( NAME );

        if( '' === localValue ) { // localValue seems to be unset
            return undefined;
        } else {
            localValue = JSON.parse( localValue );
        }
        return Y.doccirrus.commonutils.getObject( propertyName, localValue );
    }

    /**
     * Set localStorage data associated with this module
     * @param {String} propertyName
     * @param {*} value
     */
    function setLocalStorageValueOfModule( propertyName, value ) {
        var
            localValue = Y.doccirrus.utils.localValueGet( NAME );

        if( '' === localValue ) { // localValue seems to be unset
            localValue = {};
        } else {
            localValue = JSON.parse( localValue );
        }
        Y.doccirrus.commonutils.setObject( propertyName, value, localValue );
        Y.doccirrus.utils.localValueSet( NAME, localValue );
    }

    /**
     * @class NavBarButton
     * @param {Object} config
     * @param {String|ko.observable|ko.computed} config.id
     * @param {String|ko.observable|ko.computed} config.name
     * @param {String|ko.observable|ko.computed} config.text
     * @param {String|ko.observable|ko.computed} config.title
     * @param {Boolean|ko.observable|ko.computed} config.disabled
     * @param {Boolean|ko.observable|ko.computed} config.visible
     * @param {Object|ko.observable|ko.computed} config.css
     * @param {Function} config.click
     * @constructor
     */
    function NavBarButton( config ) {
        config = config || {};
        var
            self = this;

        self._init( config );
    }

    NavBarButton.prototype = {
        constructor: NavBarButton,
        /** @protected */
        _init: function( config ) {
            var
                self = this;

            self._initObservables( config );
            self._initComputed( config );
            self.click = config.click;
        },
        /**
         * @property id
         * @type {null|ko.observable|ko.computed}
         * @default ko.observable
         */
        id: null,
        /**
         * @property name
         * @type {null|ko.observable|ko.computed}
         * @default ko.observable
         */
        name: null,
        /**
         * @property text
         * @type {String|ko.observable|ko.computed}
         * @default ''
         */
        text: '',
        /**
         * @property title
         * @type {null|ko.observable|ko.computed}
         * @default ko.observable
         */
        title: null,
        /**
         * @property disabled
         * @type {Boolean|ko.observable|ko.computed}
         * @default false
         */
        disabled: false,
        /**
         * @property visible
         * @type {Boolean|ko.observable|ko.computed}
         * @default true
         */
        visible: true,
        /**
         * @property css
         * @type {null|ko.observable|ko.computed}
         * @default ko.observable
         */
        css: null,
        /**
         * @protected
         * @property _attr
         * @type {null|Object}
         * @default {id: (null|ko.observable|ko.computed), name: (null|ko.observable|ko.computed), title: (null|ko.observable|ko.computed)}
         */
        _attr: null,
        /**
         * @method click
         */
        click: function() {
        },
        /** @protected */
        _initObservables: function( config ) {
            var
                self = this;

            self.id = ko.isSubscribable( config.id ) ? config.id : ko.observable( peek( 'id' in config ? config.id : self.id ) );
            self.name = ko.isSubscribable( config.name ) ? config.name : ko.observable( peek( 'name' in config ? config.name : self.name ) );
            self.text = ko.isSubscribable( config.text ) ? config.text : ko.observable( peek( 'text' in config ? config.text : self.text ) );
            self.title = ko.isSubscribable( config.title ) ? config.title : ko.observable( peek( 'title' in config ? config.title : self.title ) );
            self.css = ko.isSubscribable( config.css ) ? config.css : ko.observable( peek( 'css' in config ? config.css : {} ) );
            self.disabled = ko.isSubscribable( config.disabled ) ? config.disabled : ko.observable( peek( 'disabled' in config ? config.disabled : self.disabled ) );
            self.visible = ko.isSubscribable( config.visible ) ? config.visible : ko.observable( peek( 'visible' in config ? config.visible : self.visible ) );
        },
        /** @protected */
        _initComputed: function() {
            var
                self = this;

            self._attr = {
                id: self.id,
                name: self.name,
                title: self.title
            };

        }
    };
    /**
     * @class NavBarBtnGroup
     * @param {Object} config
     * @constructor
     */
    function NavBarBtnGroup( config ) {
        config = config || {};
        var
            self = this;

        self._init( config );
    }

    NavBarBtnGroup.prototype = {
        constructor: NavBarBtnGroup,
        /** @protected */
        _init: function( config ) {
            var
                self = this;

            self._initObservables( config );
            self._initComputed();
        },
        /**
         * @protected
         * @property _buttons
         * @type {null|ko.observableArray}
         * @default ko.observableArray
         */
        _buttons: null,
        /** @protected */
        _initObservables: function( /*config*/ ) {
            var
                self = this;

            self._buttons = ko.observableArray();
        },
        /**
         * Computes displayed buttons
         * @type {null|ko.computed}
         * @method buttons
         * @return {Array}
         */
        buttons: null,
        /**
         * Computes if buttons are displayed
         * @type {null|ko.computed}
         * @method hasButtons
         * @return {Boolean}
         */
        hasButtons: null,
        /** @protected */
        _initComputed: function() {
            var
                self = this;

            self.buttons = ko.computed( function() {
                var
                    buttons = self._buttons();

                return Y.Array.filter( buttons, function( button ) {
                    return button.visible();
                } );
            } );

            self.hasButtons = ko.computed( function() {
                return Boolean( self.buttons().length );
            } );
        },
        /**
         * Creates a button by config
         * @param {Object} config
         * @method createButton
         * @return {NavBarButton}
         */
        createButton: function( config ) {

            return new NavBarButton( config );
        },
        /**
         * Adds a button by config or instance, if config is used {{#crossLink "NavBarBtnGroup/createButton:method"}}{{/crossLink}} is used with config.
         * Returns the instance.
         * @param {Object|NavBarButton} buttonOrConfig
         * @method addButton
         * @return {NavBarButton}
         */
        addButton: function( buttonOrConfig ) {
            var
                self = this,
                button = buttonOrConfig;

            if( !(buttonOrConfig instanceof NavBarButton) ) {
                button = self.createButton( buttonOrConfig );
            }

            self._buttons.push( button );

            return button;
        },
        /**
         * Get a button by different type
         * - string: assumed to be id, look up via id
         * - function: look up via that function, button is supplied, boolean return assumed
         * - object: every property should match, first match is returned, if object is instance of NavBarButton it tries to find that
         * @param {string|function|object|NavBarButton} kind
         * @method getButton
         * @return {null|NavBarButton}
         */
        getButton: function( kind ) {
            var
                self = this,
                buttons = peek( self._buttons ),
                kindType = Y.Lang.type( kind );

            return Y.Array.find( buttons, function( button ) {

                switch( kindType ) {
                    case 'string':
                        return kind === peek( button.id );
                    case 'function':
                        return Boolean( kind( button ) );
                    case 'object':
                        if( kind instanceof NavBarButton ) {
                            return kind === button;
                        }
                        else {
                            return Y.Array.every( Y.Object.keys( kind ), function( key ) {
                                return peek( kind[key] ) === peek( self[key] );
                            } );
                        }
                }
                return false;
            } );

        },
        /**
         * Removes a button, {{#crossLink "NavBarBtnGroup/getButton:method"}}{{/crossLink}} is used with kind parameter
         * @param {string|function|object|NavBarButton} kind
         * @method removeButton
         */
        removeButton: function( kind ) {
            var
                self = this,
                button = self.getButton( kind );

            if( button ) {
                self._buttons.remove( button );
            }

        },
        /**
         * Removes all buttons
         * @method removeAll
         */
        removeAll: function() {
            var
                self = this;

            self._buttons.removeAll();
        }
    };

    /**
     * @class NavBarFooter
     * @param {Object} config
     * @constructor
     */
    function NavBarFooter( config ) {
        config = config || {};
        var
            self = this;

        self._init( config );
    }

    NavBarFooter.prototype = {
        constructor: NavBarFooter,
        /** @protected */
        _init: function( config ) {
            var
                self = this;

            self._initObservables( config );
            self._initComputed();
            self._bindHandlers();
        },
        /**
         * @property container
         * @type {null|ko.observable}
         * @default ko.observable
         */
        container: null,
        /**
         * @property fixed
         * @type {boolean|ko.observable}
         * @default true
         */
        fixed: (function() {
            var
                fixed = getLocalStorageValueOfModule( 'fixed' );

            if( Y.Lang.isUndefined( fixed ) ) {
                return true;
            }
            else {
                return fixed;
            }

        })(),

        /**
         * @property isFrameView
         * @type {boolean|ko.observable}
         * @default false
         */
        isFrameView: false,

        /**
         * @property btnGroup
         * @type {null|NavBarBtnGroup}
         * @default NavBarBtnGroup
         */
        btnGroup: null,
        /** @protected */
        _initObservables: function( config ) {
            var
                self = this;

            self.container = ko.observable( config.container );
            self.fixed = ko.observable( peek( 'fixed' in config ? config.fixed : self.fixed ) );

            self.isFrameView = ko.observable( Y.doccirrus.commonutils.isFrameView() );

            self.btnGroup = new NavBarBtnGroup();

            self.systemMessagesCounterModel = new SystemMessagesCounter();
        },
        /** @protected */
        _initComputed: function() {
            var
                self = this;

            ko.computed( function() {
                var
                    fixed = self.fixed(),
                    isFrameView = self.isFrameView();

                if( fixed && !isFrameView ) {
                    document.body.classList.add( 'body-NavBarFooter-fixed' );
                }
                else {
                    document.body.classList.remove( 'body-NavBarFooter-fixed' );
                }

                setLocalStorageValueOfModule( 'fixed', fixed );

            } );
        },
        /** @protected */
        _bindHandlers: function() {
            var
                self = this;

            self.togglePinnedCTA = Y.bind( self.togglePinnedCTA, self );
        },
        /**
         * Apply knockout bindings to container
         * @method applyBindings
         */
        applyBindings: function() {
            var
                self = this;

            self.footerLabelI18n = i18n( 'DocCirrus.NavbarFooter.label' );

            ko.applyBindings( self, peek( self.container ) );
        },
        /**
         * Clean container from knockout bindings
         * @method cleanNode
         */
        cleanNode: function() {
            var
                self = this;

            ko.cleanNode( peek( self.container ) );
        },
        /**
         * Pin the navigation (set the navigation fixed)
         * @method pin
         */
        pin: function() {
            var
                self = this;

            self.fixed( true );
        },
        /**
         * Unpin the navigation (unset the navigation fixed)
         * @method unpin
         */
        unpin: function() {
            var
                self = this;

            self.fixed( false );
        },
        /**
         * Call to action handler for toggling pinned
         * @method togglePinnedCTA
         */
        togglePinnedCTA: function() {
            var
                self = this;

            self.fixed( !self.fixed() );
        },
        openSupportModal: function() {
            Y.doccirrus.modals.supportFormModal.show();
        }
    };

    /**
     * namespace of {{#crossLinkModule "NavBarFooter"}}{{/crossLinkModule}} Module in {{#crossLink "doccirrus"}}{{/crossLink}}
     * @property NavBarFooter
     * @for doccirrus
     * @type {NavBarFooter}
     * @static
     */
    NS.NavBarFooter = new NavBarFooter( {
        container: NavBarFooterContainer
    } );

    NS.NavBarFooter.applyBindings();

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'dccommonutils',
        'DCSupportFormModal',
        'dcutils',
        'KoViewModel',
        'SystemMessagesCounter'
    ]
} );
