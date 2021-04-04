/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'KoExample', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoExample
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,

        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' );

    /**
     * __An example component implementation.__
     *
     * It demonstrates
     * - usage of {{#crossLink "doccirrus.KoUI.utils.Object/makeClass:method"}}{{/crossLink}} and inheritance
     * - registering via {{#crossLink "doccirrus.KoUI.KoComponentManager/registerComponent:method"}}{{/crossLink}}
     * - initialisation and destruction via {{#crossLink "KoExample/init:method"}}{{/crossLink}}, {{#crossLink "KoExample/_initLifeTime:method"}}{{/crossLink}}, {{#crossLink "KoExample/_destroyLifeTime:method"}}{{/crossLink}}, {{#crossLink "KoExample/dispose:method"}}{{/crossLink}}
     * - stateful properties via {{#crossLink "KoExample/somethingStateful:attribute"}}{{/crossLink}},  {{#crossLink "KoExample/statesAvailable:property"}}{{/crossLink}}, {{#crossLink "KoExample/states:attribute"}}{{/crossLink}}
     * - dynamic templates via {{#crossLink "KoExample/refreshClickHandler:method"}}{{/crossLink}}
     * - usage of {{#crossLink "KoComponent/events:property"}}{{/crossLink}} (only use them if an observable property makes not much sense) via {{#crossLink "KoExample/KoExample-templateChanged:event"}}{{/crossLink}}
     *
     * and last but not least: observables that are provided by the base component, but actually not used in templates (… so be careful sometimes)
     * @class KoExample
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoExample() {
        KoExample.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoExample,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoExample',
            /**
             * Demonstrates a property defined the ES3 way.
             * @property es3ProtoProp
             * @default 'es3ProtoProp'
             */
            es3ProtoProp: 'es3ProtoProp',
            /**
             * Demonstrates a property defined the ES5 way.
             * NOTE: it is not writable.
             * @property es5ProtoProp
             * @default 'es5ProtoProp'
             */
            es5ProtoProp: {
                value: 'es5ProtoProp',
                enumerable: true
            },
            /**
             * Demonstrates initialisation inheritance.
             * @method init
             * @for KoExample
             */
            init: function() {
                var
                    self = this;

                KoExample.superclass.init.apply( self, arguments );

                self._initLifeTime();
            },
            /**
             * Demonstrates publishing events
             * @method initEvents
             * @for KoExample
             */
            initEvents: function() {
                var
                    self = this;

                KoExample.superclass.initEvents.apply( self, arguments );

                /**
                 * @event KoExample-templateChanged
                 * @type {CustomEvent}
                 * @param {EventFacade} event An Event Facade object
                 * @param {Object} data provided data
                 * @param {string} data.templateNameOld old template name
                 * @param {string} data.templateNameNew new template name
                 * @example
                 aKoExample.events.on( 'KoExample-templateChanged', function( yEvent, data ) {
                     console.warn( 'on KoExample-templateChanged', data );
                 } );
                 */
                self.events.publish( 'KoExample-templateChanged', {
                    preventable: false
                } );

            },
            /**
             * Demonstrates destruction inheritance.
             * @method dispose
             * @for KoExample
             */
            dispose: function() {
                var
                    self = this;

                self._destroyLifeTime();

                KoExample.superclass.dispose.apply( self, arguments );

            },
            _lifeTimer: null,
            /**
             * @method _initLifeTime
             * @private
             */
            _initLifeTime: function() {
                var
                    self = this;

                self._lifeTimer = window.setInterval( function() {
                    self.lifeTime( 1 + peek( self.lifeTime ) );
                }, 1000 );
            },
            /**
             * @method _destroyLifeTime
             * @private
             */
            _destroyLifeTime: function() {
                var
                    self = this;

                window.clearInterval( self._lifeTimer );
            },
            /**
             * Computes display of {{#crossLink "KoExample/lifeTime:attribute"}}{{/crossLink}}
             * @method lifeTimeDisplay
             * @returns {string}
             */
            lifeTimeDisplay: function() {
                var
                    self = this,
                    lifeTime = unwrap( self.lifeTime ),
                    dateTimeFormat = Intl && Intl.DateTimeFormat && new Intl.DateTimeFormat( 'de-DE', {
                            timeZone: 'UTC',
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        } );

                return dateTimeFormat.format( lifeTime * 1000 );
            },
            /**
             * Click handler of refresh icon. Changes the template used by component and fires {{#crossLink "KoExample/KoExample-templateChanged:event"}}{{/crossLink}}
             * @method refreshClickHandler
             */
            refreshClickHandler: function() {
                var
                    self = this,
                    templateNameOld = peek( self.templateName ),
                    templateNameNew = templateNameOld === 'KoExample' ? 'KoExample-different' : 'KoExample';

                self.templateName( templateNameNew );
                self.events.fire( 'KoExample-templateChanged', {}, {
                    templateNameOld: templateNameOld,
                    templateNameNew: templateNameNew
                } );
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoExample' ) );
            },
            /**
             * Component life time in seconds.
             * @attribute lifeTime
             * @type {number}
             * @default 0
             */
            lifeTime: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 0 ) );
            },
            /**
             * Array of properties which are considered stateful. This property will hold a list of component specific stateful property implementations.
             * @property statesAvailable
             * @for KoExample
             * @type {Array}
             * @default ['somethingStateful']
             */
            statesAvailable: function() {
                return ['somethingStateful'];
            },
            /**
             * Persist these instance properties, when a {{#crossLink "KoConfigurable/stateId:property"}}{{/crossLink}} is given.
             * This is a configuration property.
             *
             * See {{#crossLink "KoExample/statesAvailable:property"}}{{/crossLink}} for a list of prototype specific stateful property implementations.
             * @attribute states
             * @for KoExample
             * @type {Array}
             * @default ['somethingStateful']
             */
            states: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ['somethingStateful'] );
            },
            /**
             * Demonstrates a stateful property.
             * @attribute somethingStateful
             * @type {boolean}
             * @default false
             */
            somethingStateful: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ), {
                    stateful: true
                } );
            }
        }
    } );
    /**
     * @property KoExample
     * @type {KoExample}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoExample );

}, '3.16.0', {
    requires: [
        'KoUI',
        'KoComponentManager',
        'KoComponent'
    ]
} );
