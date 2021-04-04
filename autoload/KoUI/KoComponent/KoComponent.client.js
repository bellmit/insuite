/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, jQuery */
YUI.add( 'KoComponent', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoComponent
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,

        KoUI = Y.doccirrus.KoUI,
        utilsObject = KoUI.utils.Object,
        makeClass = utilsObject.makeClass,
        KoComponentManager = KoUI.KoComponentManager;

    // TODO: destroying
    // TODO: owner for makeKoComponent created items
    // TODO: css/style handling (for css have an empty object and an array which will receive all used iconNames, build object from array)
    // TODO: defineProperty observable in computed wrappping
    // TODO: make lazy getters for observableArray and KoComponent instances
    // TODO: take care for protected methods by underscoring
    // TODO: recheck: for columns and … placeholder is placeholder, label is label !!
    // TODO: CONST objects as { name: '…', value: * } ?
    // TODO: label for fields

    /**
     * The base class for all derived components
     * @class KoComponent
     * @constructor
     * @extends KoConfigurable
     * @param {Object} config a configuration object
     * @protected
     */
    function KoComponent() {
        var
            self = this;
        Object.defineProperty( self, 'componentId', {
            enumerable: true,
            value: ++KoComponentManager.created
        } );
        KoComponentManager.addComponent( self );
        KoComponent.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoComponent,
        extends: utilsObject.KoConfigurable,
        descriptors: {
            /**
             * The type associated with the component.
             * @property componentType
             * @protected
             */
            componentType: 'KoComponent',
            /**
             * Build in short alias for {{#crossLink "doccirrus/i18n:method"}}{{/crossLink}}
             * @method i18n
             * @protected
             */
            i18n: KoUI.i18n, // common translator
            /**
             * Component initializer.
             * @method init
             * @protected
             */
            init: function() {
                var
                    self = this;

                self.initEvents();

                KoComponent.superclass.init.apply( self, arguments );

            },
            /**
             * Generates a component specific {{#crossLink "KoConfigurable/stateId:property"}}{{/crossLink}},
             * taking the {{#crossLink "KoComponent/componentType:property"}}{{/crossLink}} into account if available.
             * @method generateStateId
             * @for KoComponent
             * @protected
             */
            generateStateId: function() {
                var
                    self = this,
                    stateId = peek( self.stateId );

                if( stateId ) {
                    return self.componentType + '-' + stateId;
                }
                return null;
            },
            /**
             * knockout template callback functions to be invoked against the rendered DOM elements
             * - [knockout "template" binding](http://knockoutjs.com/documentation/template-binding.html)
             * @method _afterRender
             * @protected
             */
            _afterRender: function( elements/*, model*/ ) {
                var
                    self = this,
                    element;

                self.elements( elements );
                if( elements[0] ) {
                    ko.utils.domNodeDisposal.addDisposeCallback( elements[0], function() {
                        if( ko.isWriteableObservable( self.rendered ) ) {
                            self.rendered( false );
                        }
                    } );
                }
                element = jQuery( elements.filter( function( el ) {
                    return el.nodeType !== 8;
                } ) ).first().parent();
                self.element( element );

                self.rendered( true );

                // TODO: simple masked for now
                self.addDisposable( ko.computed( function() {
                    var el = self.element(),
                        masked = self.masked(),
                        maskedText = self.maskedText(),
                        maskEl;

                    if( el ) {
                        if( masked ) {
                            el.addClass( 'KoMask-visible' );
                            maskEl = el.children( '.KoMask' );
                            if( !maskEl.length ) {
                                maskEl = jQuery( '<span class="KoMask"></span>' );
                                el.append( maskEl );
                            }
                            maskEl.empty();
                            if( maskedText ) {
                                maskEl.append( '<span class="KoMask-box"><span class="KoMask-text">' + maskedText + '</span></span>' );
                            }
                        } else {
                            el.removeClass( 'KoMask-visible' );
                        }
                    }
                } ) );
            },
            /**
             * knockout template callback functions to be invoked against the rendered DOM elements
             * - [knockout "template" binding](http://knockoutjs.com/documentation/template-binding.html)
             * @method _afterRender
             * @protected
             */
            _afterAdd: function() {
                /*console.warn( '[KoComponent.client.js] ._afterAdd :', {
                 "arguments": arguments,
                 'this': this
                 } );*/
            },
            /**
             * knockout template callback functions to be invoked against the rendered DOM elements
             * - [knockout "template" binding](http://knockoutjs.com/documentation/template-binding.html)
             * @method _afterRender
             * @protected
             */
            _beforeRemove: function() {
                /*console.warn( '[KoComponent.client.js] ._beforeRemove :', {
                 "arguments": arguments,
                 'this': this
                 } );*/
            },
            /**
             * Component destructor.
             * @method dispose
             * @for KoComponent
             */
            dispose: function() {
                var
                    self = this;

                KoComponentManager.removeComponent( self );

                if( self.lazy.events === utilsObject.KoConfigurable.CONST.lazy.allocated && self.events ) {
                    self.events.detachAll();
                    self.events = null;
                }

                KoComponent.superclass.dispose.apply( self, arguments );

            },
            /**
             * Returns the name attribute to be used with knockout template binding.
             * - [knockout "template" binding](http://knockoutjs.com/documentation/template-binding.html)
             * @method getTemplateName
             * @protected
             */
            getTemplateName: function() {
                return unwrap( this.templateName );
            },
            /**
             * publishes events
             * @method initEvents
             * @protected
             */
            initEvents: function() {

            }
        },
        lazy: {
            /**
             * A template name to use with the component. Each component can have multiple templates to fit your needs.
             * These templates have to be accessible in the dom, for KoUI this is mainly done in "…/KoUI/include.jade".
             * @attribute templateName
             * @type {String}
             * @default 'KoComponent'
             * @protected
             */
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoComponent' ) );
            },
            /**
             * the bound element
             * @property element
             * @type {jQuery}
             * @protected
             */
            element: function() {
                return ko.observable( jQuery() );
            },
            /**
             * the elements inside the bound element
             * @property elements
             * @type {Array}
             * @protected
             */
            elements: function() {
                return ko.observable();
            },
            /**
             * Determine if this component is rendered.
             * (Currently knockout doesn't provide anything for being removed instead of in a foreach. [addDisposeCallback is in use])
             * @property rendered
             * @type {Boolean}
             */
            rendered: function() {
                return ko.observable( false );
            },
            /**
             * In general used for the components top most element visibility.
             * - [knockout "visible" binding](http://knockoutjs.com/documentation/visible-binding.html)
             * @attribute visible
             * @type {Boolean}
             * @default true
             */
            visible: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * In general used for the components top most element class names.
             * - [knockout "css" binding](http://knockoutjs.com/documentation/css-binding.html)
             * @attribute css
             * @type {Object}
             * @default {}
             */
            css: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( {} ) );
            },
            /**
             * In general disables the component from user interaction with it.
             * @attribute disabled
             * @type {Boolean}
             * @default false
             */
            disabled: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * In general masks the component from user interaction by an overlay.
             * @property masked
             * @type {Boolean}
             * @default false
             */
            masked: function() {
                return ko.observable( false ).extend( {
                    rateLimit: {timeout: 200, method: "notifyWhenChangesStop"}
                } );
            },
            /**
             * A string which will be shown in the mask if it is masked.
             * @attribute maskedText
             * @type {String}
             * @default ''
             */
            maskedText: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) ).extend( {
                    rateLimit: {timeout: 200, method: "notifyWhenChangesStop"}
                } );
            },
            /**
             * In general used for the components top most element to have a title attribute.
             * @attribute title
             * @type {String|undefined}
             * @default undefined
             */
            title: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            },
            /**
             * In general used for the components top most element to have a name attribute.
             * @attribute name
             * @type {String|undefined}
             * @default undefined
             */
            name: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            },
            /**
             * The template property which will be linked to a data-bind template property
             * - [knockout "template" binding](http://knockoutjs.com/documentation/template-binding.html)
             * @property template
             * @type {Object}
             * @readOnly
             * @protected
             */
            template: function() {
                var
                    self = this;

                return {
                    name: Y.bind( self.getTemplateName, self ),
                    data: self,
                    afterRender: Y.bind( self._afterRender, self ),
                    afterAdd: Y.bind( self._afterAdd, self ),
                    beforeRemove: Y.bind( self._beforeRemove, self )
                };
            },
            /**
             * Event namespace for events the component might publish.
             * @property events
             * @returns {Y.EventTarget}
             */
            events: function() {
                return new Y.EventTarget();
            }
        }
    } );

    /**
     * @property KoComponent
     * @type {KoComponent}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoComponent );

}, '3.16.0', {
    requires: [
        'oop',
        'event-custom-base',

        'KoUI',
        'KoUI-utils-Object',
        'KoComponentManager'
    ]
} );
