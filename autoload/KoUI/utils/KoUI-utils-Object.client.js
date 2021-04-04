/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'KoUI-utils-Object', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * KoUI utility namespace that covers Object.
     * @module KoUI-utils-Object
     */
    /**
     * KoUI utility namespace that covers Object.
     * @class doccirrus.KoUI.utils.Object
     */
    Y.namespace( 'doccirrus.KoUI.utils.Object' );
    var
        peek = ko.utils.peekObservable,

        KoUI = Y.doccirrus.KoUI,
        NS = KoUI.utils.Object;

    /**
     *  Make a simple hash of string to prevent double-saving (unnecessary PUTs in response to events like mouse clicks)
     *
     *  credit: http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
     *  credit: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
     *
     *  @param txt  {String}    Some string to hash
     * @method fastHash
     * @for doccirrus.KoUI.utils.Object
     */
        // TODO: duplication
    NS.fastHash = function fastHash( txt ) {
        var
            hash = 0,       //% 32 bit integer [int]
            i;              //% char pos [int]

        if( 'object' === typeof txt ) {
            txt = JSON.stringify( txt );
        }

        if( 0 === txt.length ) {
            return hash;
        }

        /*jshint bitwise:false*/
        for( i = 0; i < txt.length; i++ ) {
            hash = (((hash << 5) - hash) + txt.charCodeAt( i ));
            hash = hash & hash;
        }

        return hash;
    };

    /**
     * Utility to set up the prototype, constructor and superclass properties to support an inheritance strategy that can chain constructors and methods. Static members will not be inherited.
     * Additionally it handles ES3 & ES5 prototype definitions and lazy getter initialisation for those defined as.
     * @method makeClass
     * @for doccirrus.KoUI.utils.Object
     * @param {Object} parameters
     * @param {Function} parameters.constructor Constructor of the class to create.
     * @param {Object} parameters.descriptors Either [ES3 prototype config](http://yuilibrary.com/yui/docs/api/classes/YUI.html#method_extend) or [ES5 descriptors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties).
     * @param {Function} [parameters.extends] Constructor to inherit from.
     * @param {Object} [parameters.static] Constructor static properties.
     * @param {Object} [parameters.lazy] property names with functions which will be executed to retrieve value, when accessed (getter)
     *                                  (callbacks will receive property name and superclass)
     * @return {Class}
     */
    NS.makeClass = function( parameters ) {
        var
            _constructor = parameters.constructor,
            _static = parameters.static,
            _extends = parameters.extends,
            _descriptors = parameters.descriptors,
            _es3 = {},
            _es5 = {},
            _lazy = parameters.lazy,
            _result;

        Y.each( _descriptors, function( descriptor, name ) {
            if( 'object' === typeof descriptor && descriptor instanceof Object ) {
                _es5[name] = descriptor;
            } else {
                _es3[name] = descriptor;
            }
        } );

        if( _extends ) {
            _result = Y.extend( _constructor, _extends, _es3, _static );
        } else {
            _result = Y.extend( _constructor, Object, _es3, _static );
        }

        Object.defineProperties( _result.prototype, _es5 );

        if( _lazy ) {
            _result.lazy = Y.merge( {}, _result.superclass.constructor.lazy );
            Y.each( _lazy, function( callback, propertyName ) {
                _result.lazy[propertyName] = true;
                Object.defineProperty( _result.prototype, propertyName, {
                    enumerable: true,
                    configurable: true,
                    get: function() {
                        var
                            self = this,
                            value;

                        if( self.lazy[propertyName] === KoConfigurable.CONST.lazy.disposed ) {
                            value = null;
                        }
                        else {
                            // property in instance isn't anymore considered lazy
                            self.lazy[propertyName] = KoConfigurable.CONST.lazy.allocated;

                            value = callback.call( self, propertyName );
                        }

                        Object.defineProperty( self, propertyName, {
                            enumerable: true,
                            configurable: true,
                            writable: true,
                            value: value
                        } );

                        return value;
                    }
                } );
            } );
        }

        return _result;
    };

    /**
     * A configurable base class
     * @class KoConfigurable
     * @constructor
     * @protected
     */
    function KoConfigurable( config ) {
        var
            self = this;

        self.initLazyLookup();
        self.initialConfig = Y.merge( {}, config );
        self.disposables = [];
        self.init();
    }

    NS.makeClass( {
        constructor: KoConfigurable,
        static: {
            /**
             * Constants for KoConfigurable.
             * @property CONST
             * @static
             * @final
             * @type {object}
             * @for KoConfigurable
             */
            CONST: {
                lazy: {
                    disposed: -1,
                    unset: 0,
                    allocated: 1
                }
            }
        },
        descriptors: {
            /**
             * list of lazy properties, true is still lazy, false was allocated
             * @property lazy
             * @type {Object}
             * @protected
             */
            lazy: null,
            initLazyLookup: function() {
                var
                    self = this,
                    lazy = self.lazy = {};

                Object.keys( self.constructor.lazy ).forEach( function( key ) {
                    lazy[key] = KoConfigurable.CONST.lazy.unset;
                } );

            },
            /**
             * Component initializer.
             * @method init
             * @protected
             */
            init: function() {
                var
                    self = this;

                Y.each( self.initialConfig, self._applyConfigProperty, self );
            },
            /**
             * Indicates if subscriptions were disposed
             * @property disposedSubscriptions
             * @type {Boolean}
             */
            disposedSubscriptions: false,
            /**
             * Takes care of configuration from constructor to apply properties to the instance.
             * @method _applyConfigProperty
             * @protected
             */
            _applyConfigProperty: function( value, name ) {
                var
                    self = this;

                // lazy properties handle values by themselves
                if( !self.constructor.lazy[name] ) {
                    if( ko.isWritableObservable( self[name] ) && !ko.isObservable( value ) ) { // TODO: legacy compatibility to non lazy yet
                        self[name]( value );
                    } else {
                        self[name] = value;
                    }
                }

            },
            /**
             * The {{#crossLink "KoConfigurable/stateId:property"}}{{/crossLink}} should be a unique identifier,
             * which is used when this instance is stateful - meaning properties can be persisted by this identifier.
             * Each prototype has a list of stateful property implementations ({{#crossLink "KoConfigurable/statesAvailable:property"}}{{/crossLink}}).
             * Which can be enabled by configuring a {{#crossLink "KoConfigurable/stateId:property"}}{{/crossLink}} and {{#crossLink "KoConfigurable/states:attribute"}}{{/crossLink}}.
             * @property stateId
             * @type {String}
             * @default null
             * @example
             KoComponentManager.createComponent( {
                 componentType: 'KoTable',
                 componentConfig: {
                     stateId: 'an-unique-id-describing-my-usage', // necessary to persist 'limit'
                     states: [ 'limit' ] // limit will be persisted, because it is implemented ({{#crossLink "KoTable/statesAvailable:property"}}{{/crossLink}})
                 }, …
             })
             */
            stateId: null,
            /**
             * Generates a instance specific {{#crossLink "KoConfigurable/stateId:property"}}{{/crossLink}}.
             * @method generateStateId
             * @protected
             */
            generateStateId: function() {
                var
                    self = this,
                    stateId = peek( self.stateId );

                if( stateId ) {
                    return stateId;
                }
                return null;
            },
            /**
             * Get the persisted state for a property name.
             *
             * See {{#crossLink "KoConfigurable/statesAvailable:property"}}{{/crossLink}} for a list of prototype specific stateful property implementations.
             * @method getState
             * @param propertyName
             * @return {undefined|*}
             */
            getState: function( propertyName ) {
                var
                    self = this,
                    stateId = peek( self.stateId ),
                    state;

                if( stateId ) {
                    state = Y.doccirrus.utils.localValueGet( self.generateStateId() );
                    if( '' === state ) { // state seems to be unset
                        return undefined;
                    } else {
                        state = JSON.parse( state );
                    }
                    return Y.doccirrus.commonutils.getObject( propertyName, state );
                }
            },
            /**
             * Set the state to be persisted for a property name.
             *
             * See {{#crossLink "KoConfigurable/statesAvailable:property"}}{{/crossLink}} for a list of prototype specific stateful property implementations.
             * @method setState
             * @param {String} propertyName
             * @param {*} value
             */
            setState: function( propertyName, value ) {
                var
                    self = this,
                    stateId = peek( self.stateId ),
                    state;

                if( stateId ) {
                    state = Y.doccirrus.utils.localValueGet( self.generateStateId() );
                    if( '' === state ) { // state seems to be unset
                        state = {};
                    } else {
                        state = JSON.parse( state );
                    }
                    Y.doccirrus.commonutils.setObject( propertyName, value, state );
                    Y.doccirrus.utils.localValueSet( self.generateStateId(), state );
                }
            },
            /**
             * Handles getting the initial value for a lazy property or if an observable was configured for the instance, it returns that instead of the the given lazy.
             * It applies or uses the default value for not replaced observables, after that the configured and if configured stateful, handles the state value for that property also.
             * @method _handleLazyConfig
             * @param {String} key
             * @param {*} lazy
             * @param {Object} [parameters]
             * @param {*} [parameters.value]
             * @param {Boolean} [parameters.stateful]
             * @return {*}
             * @protected
             */
            _handleLazyConfig: function( key, lazy, parameters ) {

                parameters = parameters || {};

                var
                    self = this,
                    stateful = parameters.stateful,
                    defaultValue = parameters.value,
                    configValue,
                    stateValue;

                // apply an explicit default value
                if( 'value' in parameters ) {

                    if( ko.isWriteableObservable( lazy ) ) {
                        lazy( defaultValue );
                    }
                    else if( lazy !== defaultValue ) {
                        lazy = defaultValue;
                    }

                }

                // retrieve config value and apply value appropriate
                if( self.initialConfig && key in self.initialConfig ) {

                    configValue = self.initialConfig[key];

                    if( ko.isObservable( configValue ) ) {
                        lazy = configValue;
                    }
                    else {
                        if( ko.isWriteableObservable( lazy ) ) {
                            lazy( configValue );
                        }
                        else {
                            lazy = configValue;
                        }
                    }
                }

                // handle stateful value
                if( stateful ) {

                    stateValue = self.getState( key );

                    if( ko.isWriteableObservable( lazy ) ) {

                        if( !Y.Lang.isUndefined( stateValue ) ) {
                            lazy( stateValue );
                        }

                        if( self.states.indexOf( key ) > -1 ) {
                            self.addDisposable( lazy.subscribe( function( value ) {
                                self.setState( key, value );
                            } ) );
                        }
                    }
                    else {
                        lazy = stateValue;
                    }

                }

                return lazy;

            },
            /**
             * @property disposables
             * @type {Array}
             * @protected
             */
            disposables: null,
            /**
             * add a subscription to disposables and returns it
             * @param {*} subscription
             * @return {*}
             */
            addDisposable: function addDisposable( subscription ) {
                var
                    self = this;

                self.disposables.push( subscription );

                return subscription;
            },
            /**
             * removes a subscription from disposables and returns success of
             * @param {*} subscription
             * @param {boolean} [dispose=true]
             * @return {boolean}
             */
            removeDisposable: function removeDisposable( subscription, dispose ) {
                var
                    self = this,
                    subscriptionIndex = self.disposables.indexOf( subscription ),
                    success = false;

                if( subscription && subscriptionIndex > -1 ) {
                    if( dispose !== false ) {
                        self.disposeSubscription( subscription );
                    }
                    self.disposables.splice( subscriptionIndex, 1 );
                    success = true;
                }

                return success;
            },
            /**
             * disposes a subscription
             * @method disposeSubscription
             * @param {ko.computed|ko.observable.subscribe} subscription
             * @param {String} [key]
             */
            disposeSubscription: function disposeSubscription( subscription, key ) {
                var
                    self = this;

                if( 'owner' === key ) {
                    return;
                }

                if( key && self.lazy[key] === KoConfigurable.CONST.lazy.unset ) {
                    return;
                }

                if( subscription && 'function' === typeof subscription.dispose ) {
                    subscription.dispose();
                    subscription.dispose = null;
                }

            },
            /**
             * disposes any internal subscriptions
             * @method disposeSubscriptions
             */
            disposeSubscriptions: function disposeSubscriptions() {
                var
                    self = this,
                    copyDisposables = self.disposables;

                // prevent infinite loop on circular subscription, can happen in KoTree
                if ( self.disposedSubscriptions ) { return; }
                self.disposables = [];

                Y.each( copyDisposables, self.disposeSubscription, self );
                Y.each( self, self.disposeSubscription, self );

                self.disposedSubscriptions = true;

            },
            disposed: false,
            /**
             * destructor
             * @method dispose
             */
            dispose: function() {
                var
                    self = this;

                //  prevent infinte loop on circular subscriptions
                if ( self.disposed ) { return; }
                self.disposed = true;

                if( !self.disposedSubscriptions ) {
                    self.disposeSubscriptions();
                }

                Y.each( self.constructor.lazy, self.destroyProperty, self );
                Y.each( self, self.destroyProperty, self );

            },
            /**
             * @method destroyProperty
             * @param {*} value
             * @param {String} key
             * @protected
             */
            destroyProperty: function( value, key ) {
                var
                    self = this;

                if( !key || 'lazy' === key || 'componentId' === key || 'componentType' === key || 'disposedSubscriptions' === key || 'disposed' === key ) {
                    return;
                }

                // handle lazy that weren't allocated
                if( self.lazy[key] === KoConfigurable.CONST.lazy.unset ) {
                    self.lazy[key] = KoConfigurable.CONST.lazy.disposed;
                    delete self[key];
                }
                else if( self.lazy[key] === KoConfigurable.CONST.lazy.allocated ) {
                    if( self[key] instanceof KoConfigurable && 'function' === typeof self[key].dispose ) {
                        self[key].dispose();
                        self[key].dispose = null;
                    }
                    self.lazy[key] = KoConfigurable.CONST.lazy.disposed;
                }

                if( self[key] instanceof KoConfigurable && 'owner' !== key && 'function' === typeof self[key].dispose ) {
                    self[key].dispose();
                    self[key].dispose = null;
                }

                delete self[key];

            }
        },
        lazy: {
            /**
             * Persist these instance properties, when a {{#crossLink "KoConfigurable/stateId:property"}}{{/crossLink}} is given.
             * This is a configuration property.
             *
             * See {{#crossLink "KoConfigurable/statesAvailable:property"}}{{/crossLink}} for a list of prototype specific stateful property implementations.
             * @attribute states
             * @type {Array}
             * @default []
             */
            states: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, [] );
            },
            /**
             * Array of properties which are considered stateful. This property will hold a list of prototype specific stateful property implementations.
             * @property statesAvailable
             * @type {Array}
             * @default []
             * @protected
             */
            statesAvailable: function() {
                return [];
            }
        }
    } );

    /**
     * @property KoConfigurable
     * @type {KoConfigurable}
     * @for doccirrus.KoUI.utils.Object
     * @protected
     */
    NS.KoConfigurable = KoConfigurable;

}, '3.16.0', {
    requires: [
        'oop',
        'dccommonutils',
        'dcutils',

        'KoUI',
        'KoUI-utils-Polyfill'
    ]
} );
