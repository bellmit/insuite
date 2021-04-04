/*jslint anon:true, sloppy:true, nomen:true*/
/*jshint esnext:true */
/*global YUI, ko, jQuery, _ */
'use strict';
YUI.add( 'KoViewModel', function( Y, NAME ) {
    /**
     * - TODO: support own namespace for boilerplate, means no observables on root level
     * - TODO: support multiple schema
     * - TODO: independent _runBoilerplate
     *
     * @example
     * **Simple applying to DOM**
     * @example
     *     // view model creation
     *     aKoViewModel = KoViewModel.createViewModel( { schemaName: 'example', config { data: { foo: 'bar' } } } );
     *     // view model applying to DOM
     *     ko.applyBindings( { example: aKoViewModel }, node.getDOMNode() );
     * **Getting data**
     * @example
     *     // view model creation
     *     aKoViewModel = KoViewModel.createViewModel( { schemaName: 'example' } );
     *     // setting data to view model
     *     aKoViewModel.set('data', { foo: 'bar', baz: [ 1 ] } );
     *     // view model applying to DOM
     *     ko.applyBindings( { example: aKoViewModel }, node.getDOMNode() );
     *     // … user modified the view model
     *     //console.log(aKoViewModel.get('data.baz.0'));         //  eslint-disable-line jshint-ignore-line
     *
     * ##### More Examples
     * -   {{#crossLink "doccirrus.KoViewModel"}}Creating sub-classes{{/crossLink}}
     * -   {{#crossLink "doccirrus.KoViewModel.utils/createAsync:method"}}Getting asynchronous data{{/crossLink}}
     *
     * @module KoViewModel
     * @since 3.16.0
     */

    /**
     * The namespace `doccirrus.KoViewModel` provides methods for dealing with {{#crossLink "KoViewModel"}}{{/crossLink}}s
     *
     * #### Example:
     * **Creating sub-classes**
     *
     *     // constructor creation
     *     function ExampleModel( config ) {
     *         ExampleModel.superclass.constructor.call( this, config );
     *     }
     *     // extending the base class
     *     Y.extend( ExampleModel, Y.doccirrus.KoViewModel.getBase(), {
     *         initializer: function() {
     *         },
     *         destructor: function() {
     *         },
     *         // hooking a parent method
     *         appendParent: function() {
     *             var result = ExampleModel.superclass.appendParent.apply( this, arguments );
     *             // … do stuff
     *             return result;
     *         }
     *     }, {
     *         // defining static properties
     *         schemaName: 'patient', // required, but could be overwritten or provided at instantiation level
     *         NAME: 'ExampleModel' // required, this is the name we are registering for
     *     } );
     *     // registering the NAME for a constructor
     *     Y.doccirrus.KoViewModel.registerConstructor( ExampleModel );
     *     // …
     *     // view model creation
     *     aKoViewModel = Y.doccirrus.KoViewModel.createViewModel( { NAME: 'ExampleModel', config { data: { foo: 'bar' } } } );
     *     // view model applying to DOM
     *     ko.applyBindings( { example: aKoViewModel }, node.getDOMNode() );
     *
     * @class doccirrus.KoViewModel
     */
    /**
     * @property KoViewModel
     * @for doccirrus
     * @type {doccirrus.KoViewModel}
     */
    Y.namespace( 'doccirrus.KoViewModel' );
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        MNS = Y.doccirrus.KoViewModel,
        lodash = _,
        i18n = Y.doccirrus.i18n;

    // TODO: again … cloned ;)
    MNS.fastHash = function fastHash( txt ) {
        var
            hash = 0,       //% 32 bit integer [int]
            i;              //% char pos [int]

        if( 'object' === typeof txt ) {
            txt = JSON.stringify( txt );
        }

        if( 0 === txt.length ) {
            return hash;
        }

        for( i = 0; i < txt.length; i++ ) {
            hash = (((hash << 5) - hash) + txt.charCodeAt( i ));// jshint ignore:line
            hash = hash & hash;// jshint ignore:line
        }

        return hash;
    };

    function getObject( string, context ) {
        return Y.Object.getValue( context, string.split( '.' ) );
    }

    /**
     * wrap observableArray for creating and destroying viewModels
     * @param {Object} parameters
     * @param {String} parameters.NAME
     * @param {String} parameters.schemaName
     * @param {Object} parameters.parent the parent model the array acts in
     * @returns {ko.computed} a ko.computed which mostly acts like ko.observableArray
     * @private
     */
    function buildObservableArray( parameters ) {
        var
            _NAME = parameters.NAME,
            propertyName = parameters.propertyName,
            schemaName = parameters.schemaName,
            parent = parameters.parent,
            target = ko.observableArray(),
            result = ko.computed( {
                read: function() { //always return the original observables value
                    return target();
                },
                write: function( newValue ) {
                    if( Y.Lang.isArray( newValue ) ) {
                        target( newValue.map( function( instCfg ) {
                            var
                                typeName = _NAME,
                                _schemaName = schemaName;
                            if( instCfg && instCfg.__polytype ) {
                                typeName = parent.getPolyTypeName( typeName, instCfg.__polytype, propertyName, schemaName );
                                _schemaName = instCfg.__polytype;
                            }

                            return instCfg instanceof KoViewModel ? instCfg : MNS.createViewModel( {
                                NAME: typeName,
                                schemaName: _schemaName,
                                config: {data: instCfg, parent: parent}
                            } );
                        } ) );
                    } else {
                        target.removeAll();
                    }
                }
            } );

        Y.each( [ // observableArray functions
            'remove', 'removeAll', 'destroy', 'destroyAll', 'indexOf', 'replace',
            "pop", "push", "reverse", "shift", "sort", "splice", "unshift",
            'slice'
        ], function( methodName ) {
            result[methodName] = function() {
                var isEventContext = (arguments[0] === this), // means functionality is directly bound to an event
                    args = arguments,
                    slices;
                // TODO: may have to be improved
                switch( methodName ) {
                    case 'splice':
                        if( !isEventContext ) {
                            slices = Array.prototype.slice.call( args, 2 );
                            if( slices.length ) {
                                args = Array.prototype.slice.call( args, 0, 2 ).concat( Array.prototype.slice.call( args, 2 ).map( function( arg ) {
                                    var
                                        typeName = _NAME,
                                        _schemaName = schemaName;
                                    if( arg && arg.__polytype ) {
                                        typeName = parent.getPolyTypeName( typeName, arg.__polytype, propertyName, schemaName );
                                        _schemaName = arg.__polytype;
                                    }
                                    return arg instanceof KoViewModel ? arg : MNS.createViewModel( {
                                        NAME: typeName,
                                        schemaName: _schemaName,
                                        config: {data: arg, parent: parent}
                                    } );
                                } ) );
                            }
                        }
                        break;
                    case 'remove':
                        if( isEventContext ) {
                            args = [args[0]];
                        }
                        break;
                    case 'removeAll':
                    case 'reverse':
                    case 'shift':
                    case 'pop':
                        if( isEventContext ) {
                            args = [];
                        }
                        break;
                    case 'unshift':
                    case 'push':
                        if( isEventContext ) {
                            args = [
                                MNS.createViewModel( {
                                    schemaName: schemaName,
                                    NAME: _NAME,
                                    config: {data: {}, parent: parent}
                                } )
                            ];
                        } else {
                            args = Y.Array( args ).map( function( arg ) {
                                var
                                    typeName = _NAME,
                                    _schemaName = schemaName;
                                if( arg && arg.__polytype ) {
                                    typeName = parent.getPolyTypeName( typeName, arg.__polytype, propertyName, schemaName );
                                    _schemaName = arg.__polytype;
                                }
                                return arg instanceof KoViewModel ? arg : MNS.createViewModel( {
                                    NAME: typeName,
                                    schemaName: _schemaName,
                                    config: {data: arg, parent: parent}
                                } );
                            } );
                        }
                        break;
                }
                target[methodName].apply( target, args );
            };
        } );
        result._arrayOf = _NAME;
        result._inAttribute = propertyName;
        target.subscribe( function( actions ) {
            Y.each( actions, function( action ) { // {satus[added,deleted],value,index}
                if( 'deleted' === action.status ) {
                    if( action.value && action.value.destroy ) {
                        if( true === action.value.get( 'destroyOnArrayRemoval' ) ) {
                            action.value.destroy();
                        }
                    } else {
                        Y.log( 'Removing none model', 'warn', NAME );
                    }
                }
            } );
        }, null, "arrayChange" );
        return result;
    }

    function KoDisposable( config ) {
        KoDisposable.superclass.constructor.call( this, config );
    }

    Y.extend( KoDisposable, Y.Base, {
        initializer: function() {

            MNS.instances.add( this );
        },
        destructor: function() {
            var
                self = this;

            MNS.instances.remove( this );

            self.dispose();
        },
        /**
         * disposes a subscription
         * @method disposeSubscription
         * @param {ko.computed|ko.observable.subscribe} subscription
         * @param {String} [key]
         */
        disposeSubscription: function KoViewModel_disposeSubscription( subscription, key ) {
            var self = this,
                whiteList = self.get( 'whiteList' ),
                // do not dispose subscriptions mixed from model into editor model
                excludeKey = (Array.isArray( whiteList ) ? whiteList : []).some( function( path ) {
                    return path === key;
                } );

            if( !excludeKey && subscription && 'function' === typeof subscription.dispose ) {
                subscription.dispose();
            }

        },
        /**
         * disposes any internal subscriptions
         * @method dispose
         */
        dispose: function KoViewModel_dispose() {
            var
                self = this,
                disposables = self.get( 'disposables' );

            if ( self.disposed ) { return; }

            Y.each( disposables, self.disposeSubscription.bind( self ) );
            Y.each( self, self.disposeSubscription.bind( self ) );

            self.set( 'disposables', [] );
            self.disposed = true;
        },
        /**
         * add a subscription to disposables and returns it
         * @param subscription
         * @return {*}
         */
        addDisposable: function KoViewModel_addDisposable( subscription ) {
            var
                self = this;

            self.get( 'disposables' ).push( subscription );
            return subscription;
        }
    }, {
        ATTRS: {
            /**
             * disposables collection
             * @attribute disposables
             * @type {Array}
             * @protected
             */
            disposables: {
                value: [],
                cloneDefaultValue: true,
                lazyAdd: false
            }
        }
    } );

    /**
     * You shouldn't need to instantiate those,
     * use the {{#crossLink "doccirrus.KoViewModel/createViewModel:method"}}createViewModel{{/crossLink}}-method.
     * @beta
     * @class KoViewModel
     * @constructor
     * @extends Base
     * @param {Object} [config=Object] a configuration object
     * @param {String} [config.schemaName=constructor.schemaName] a schema name
     * @param {Object} [config.data=null] initial data
     * @param {Object} [config.idProperty=_id] property to use as an id
     * @param {Object} [config.parent=KoViewModel] parent KoViewModel of this KoViewModel, if …
     * @main
     * @since 3.16.0
     */
    function KoViewModel( config ) {
        KoViewModel.superclass.constructor.call( this, config );
    }

    Y.mix( KoViewModel, {
        NAME: 'KoViewModel',
        ATTRS: {
            /**
             * schema name
             * @deprecated
             * @attribute schemaName
             * @type {String}
             * @default {null}
             */
            schemaName: {
                // TODO: refactor > schema, if passed string mixSchema
                setter: function( data ) {
                    return data;
                },
                validate: Y.Lang.isString,
                valueFn: function() {
                    var
                        self = this;

                    return (self.schemaName || self.constructor.schemaName);
                },
                lazyAdd: false
            },
            destroyOnArrayRemoval: {
                /**
                 * Allow models in observableArrays to be auto destroyed on removal
                 * @attribute destroyOnArrayRemoval
                 * @type {Boolean}
                 * @protected
                 */
                value: true,
                lazyAdd: false
            },
            /**
             * read/write data from KoViewModel
             * @example
             *     model.set('data', { foo: 'bar' } );
             * @attribute data
             * @type {Object|null}
             */
            data: {
                value: {},
                cloneDefaultValue: true,
                validate: Y.Lang.isObject,
                setter: function KoViewModel_ATTRS_data_setter( data, dotPath/*, options*/ ) {
                    // data will hold the complete updated object, although if a path is provided
                    var
                        self = this,
                        path = dotPath.split( '.' ).slice( 1 ),
                        boilerplate = self._boilerplate,
                        observable,
                        value;

                    if( boilerplate ) {
                        if( path.length ) { // when a path is provided only set the appropriate observable
                            observable = MNS.getValueObservable( boilerplate, path );
                            if( ko.isObservable( observable ) ) {
                                value = Y.Object.getValue( data, path );
                                if( 'object' === typeof value && !Array.isArray( value ) ) {
                                    value = lodash.cloneDeep( value );
                                }
                                observable( value );
                            }
                        } else { // when a path is not provided update everything
                            Y.each( boilerplate, function KoViewModel_ATTRS_data_setter__boilerplate_each( observable, key ) {
                                if( Y.Object.owns( data, key ) ) {
                                    value = data[ key ];
                                    if( 'object' === typeof value && !Array.isArray( value ) ) {
                                        value = lodash.cloneDeep( value );
                                    }
                                    observable( value );
                                }
                            } );
                        }
                    }

                    return data;
                },
                lazyAdd: false
            },
            /**
             * default values from schema
             * @attribute defaults
             * @type {Object}
             */
            defaults: {
                value: {},
                cloneDefaultValue: true,
                validate: Y.Lang.isObject,
                lazyAdd: false
            },
            /**
             * parent KoViewModel of this KoViewModel
             * @example
             *     model.get('parent');
             * @attribute parent
             * @type {KoViewModel|null}
             */
            parent: {
                value: null,
                lazyAdd: false
            },
            /**
             * Initial config property to make this Model and all it's child models validating
             * @attribute validatable
             * @type {Boolean}
             * @default false
             */
            validatable: {
                value: false,
                lazyAdd: false
            },
            /**
             * get/set unmodified data from KoViewModel
             * @example
             *     model.set('data', { foo: 'bar' } );
             * @attribute data
             * @type {Object|null}
             */
            dataUnModified: {
                value: {},
                cloneDefaultValue: true,
                validate: Y.Lang.isObject,
                setter: function( data ) {
                    var
                        self = this,
                        allowed = {},
                        ignoreModificationsOn = self.get( 'ignoreModificationsOn' );

                    Y.each( self._boilerplate, function( observable, key ) {
                        if( -1 === ignoreModificationsOn.indexOf( key ) && Y.Object.owns( data, key ) ) {
                            allowed[key] = data[key];
                        }
                    } );

                    if( !self.dataUnModifiedHash ) {
                        self.dataUnModifiedHash = ko.observable();
                    }
                    self.dataUnModifiedHash( MNS.fastHash( allowed ) );
                    return allowed;
                },
                lazyAdd: false
            },
            /**
             * An Object of definition additions to use for boilerplating a schema
             * @attribute validatable
             * @type {Object}
             * @default {}
             */
            additionalSchemaDefinitions: {
                value: {},
                cloneDefaultValue: true,
                validate: Y.Lang.isObject,
                lazyAdd: false
            },
            /**
             * computed which compares current data against unmodified data
             * @method isModified
             * @return {boolean}
             */
            isModified: {
                valueFn: function() {
                    var
                        self = this,
                        ignoreModificationsOn = self.get( 'ignoreModificationsOn' );

                    return self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                observables = self.readBoilerplate( true );

                            ignoreModificationsOn.forEach( function( key ) {
                                delete observables[key];
                            } );

                            return (self.dataUnModifiedHash() !== MNS.fastHash( observables ));
                        },
                        deferEvaluation: true,
                        owner: self
                    } ).extend( {
                        rateLimit: {timeout: 0, method: "notifyWhenChangesStop"}
                    } ) );
                },
                lazyAdd: false
            },
            /**
             * Set field names that will be ignored on modification detection
             * @attribute ignoreModificationsOn
             * @type {Array}
             * @default []
             */
            ignoreModificationsOn: {
                value: [],
                cloneDefaultValue: true,
                lazyAdd: false
            },
            /**
             * a function to define, which is called cascading for Sub-Models to return an appropriate Model NAME
             * - method should return a String for an appropriate Model NAME or false to use default behaviour
             * - see {{#crossLink "KoViewModel/getTypeName:method"}}{{/crossLink}} for arguments
             * @attribute getTypeName
             * @type {Function}
             * @default {null}
             */
            getTypeName: {
                value: null,
                lazyAdd: false
            },
            /**
             * a function to define, which is called cascading for polymorphic Sub-Models to return an appropriate Model NAME
             * - method should return a String for an appropriate Model NAME or false to use default behaviour
             * - see {{#crossLink "KoViewModel/getPolyTypeName:method"}}{{/crossLink}} for arguments
             * @attribute getPolyTypeName
             * @type {Function}
             * @default {null}
             */
            getPolyTypeName: {
                value: null,
                lazyAdd: false
            }
        },
        /**
         * @property schemaName
         * @type {String}
         * @default null
         * @static
         */
        schemaName: null,
        /**
         * @property overrideSchemaName
         * @type {Boolean}
         * @default false
         * @static
         */
        overrideSchemaName: false
    } );

    Y.extend( KoViewModel, KoDisposable, {
        /**
         * @deprecated
         * @property schemaName
         * @type {String}
         * @default null
         */
        schemaName: null,
        /**
         * @property initialConfig
         * @type {Object}
         * @default null
         * @protected
         */
        initialConfig: null,
        /**
         * @property idProperty
         * @type {String}
         * @default '_id'
         * @protected
         */
        idProperty: '_id',
        /**
         * Indicates if subscriptions were disposed
         * @property disposed
         * @type {Boolean}
         */
        disposed: false,
        /**
         * Re-validate all observables, which have the validate extender attached.
         * @method revalidate
         */
        revalidate: function KoViewModel_revalidate() {
            var self = this;
            clearTimeout( self._revalidateTimeoutInstance );
            self._revalidateTimeoutInstance = setTimeout( function() {
                var
                    key,
                    property;

                if( self._boilerplate ) {
                    for( key in self._boilerplate ) {
                        if( self._boilerplate.hasOwnProperty( key ) ) {
                            property = self._boilerplate[key];
                            if( ko.isObservable( property ) && property.validate ) {
                                property.validate( property.peek() );
                            }
                        }
                    }
                }
            }, ko.extenders.validate.REVALIDATE_TIMEOUT );
        },
        /**
         * @method errorExists
         * @param {String} id
         * @returns {boolean}
         */
        errorExists: function KoViewModel_errorExists( id ) {
            var
                self = this;
            return (-1 !== self._validStateMap.indexOf( id ));
        },
        /**
         * Adds error identifier to track changed observables.
         * @method addError
         * @param {String} id*
         */
        addError: function KoViewModel_addError() {
            var
                self = this,
                id = Array.prototype.slice.call( arguments ).join( '.' ),
                parent;

            if( self.errorExists( id ) ) {
                return;
            }
            parent = self.get( 'parent' );

            self._validStateMap.push( id );
            if( parent ) {
                parent.addError( parent.clientId, id );
            }
        },
        /**
         * Removes error identifier.
         * @method removeError
         * @param {String} id*
         */
        removeError: function KoViewModel_removeError() {
            var
                self = this,
                id = Array.prototype.slice.call( arguments ).join( '.' ),
                parent = self.get( 'parent' );

            self._validStateMap.remove( id );
            if( parent ) {
                parent.removeError( parent.clientId, id );
            }
        },
        /**
         * returns the ViewModelReadOnly instance
         * @method getModuleViewModelReadOnly
         * @return {ViewModelReadOnly}
         */
        getModuleViewModelReadOnly: function KoViewModel_getModuleViewModelReadOnly() {
            var
                self = this,
                constructor = Y.doccirrus.uam.ViewModelReadOnly,
                _moduleViewModelReadOnly = self[constructor.namespace];
            if( !_moduleViewModelReadOnly ) {
                // TODO: maybe should only receive the observables
                _moduleViewModelReadOnly = self[constructor.namespace] = constructor.createInstance( {viewModel: self} );
            }
            return _moduleViewModelReadOnly;
        },
        /**
         * timeoutInstance for revalidate throttling
         * @property _revalidateTimeoutInstance
         * @type {KoViewModel|null}
         * @default null
         * @protected
         */
        _revalidateTimeoutInstance: null,
        /** @private */
        initializer: function KoViewModel_initializer( config ) {

            config = config || {};
            var
                self = this,
                initialConfig = config,
                parent = self.get( 'parent' );

            self.initialConfig = initialConfig;
            if( config.idProperty ) {
                self.idProperty = config.idProperty;
            }
            if( !self.get( 'getTypeName' ) && parent && parent.get( 'getTypeName' ) ) {
                self.set( 'getTypeName', parent.get( 'getTypeName' ) );
            }
            if( !self.get( 'getPolyTypeName' ) && parent && parent.get( 'getPolyTypeName' ) ) {
                self.set( 'getPolyTypeName', parent.get( 'getPolyTypeName' ) );
            }

            self.onceAfter( 'initializedChange', self.afterInit, self );

            self._initEvents();
            self._initBoilerplate();
            if( self.get( 'supportCountryExtensions' ) ) {
                self.supportCountryExtensions();
            }
        },
        /** @private */
        destructor: function KoViewModel_destructor() {
            var
                self = this;

            self._destroyEvents();
            self.dispose();
            self._destroyBoilerplate();

            self.initialConfig = null;
            delete self.initialConfig;
        },
        /**
         * Called after any initializer's have been executed
         * @method afterInit
         */
        afterInit: function KoViewModel_afterInit() {
        },
        /**
         * @method _initEvents
         * @protected
         */
        _initEvents: function KoViewModel__initEvents() {
            var
                self = this;

            if( !self._events ) {
                self._events = {};
            }
        },
        /**
         * @method _destroyEvents
         * @protected
         */
        _destroyEvents: function KoViewModel__destroyEvents() {
            var
                self = this;

            if( self._events ) {
                Y.each( self._events, function( event, name ) {
                    event.detachAll();
                    self._events[name] = null;
                } );
                delete self._events;
            }
        },
        /**
         * Async observable computing if this model and all it's child models are valid
         * @method _isValid
         * @type {ko.computed(Boolean)}
         */
        _isValid: null,
        /**
         * Make this Model and all it's child models validating
         * - see {{#crossLink "KoViewModel/validatable:attribute"}}{{/crossLink}} for initial config
         * @method _validatable
         * @type {ko.observable(Boolean)}
         */
        _validatable: null,
        /**
         * @method _initValidState
         * @protected
         */
        _initValidState: function KoViewModel__initValidState() {
            var
                self = this;

            self._validatable = ko.observable( self.get( 'validatable' ) );
            self._validStateMap = ko.observableArray();
            self._isValid = ko.computed( function() {
                return 0 === self._validStateMap().length;
            } );
        },
        /**
         * @method _destroyValidState
         * @protected
         */
        _destroyValidState: function KoViewModel__destroyValidState() {
            var
                self = this,
                _validStateMap = [].concat( self._validStateMap.peek() );

            Y.each( _validStateMap, function( id ) {
                self.removeError( id );
            } );
            self._validStateMap.removeAll();
            self._isValid.dispose();
        },
        /**
         * @method _initBoilerplate
         * @protected
         */
        _initBoilerplate: function KoViewModel__initBoilerplate() {
            var
                self = this,
                schemaName = self.get( 'schemaName' ),
                parent = self.get( 'parent' );

            self._boilerplate = self._boilerplate || {};

            self._initValidState();

            if( schemaName ) {
                self._runBoilerplate();

                Y.each( self._boilerplate, function( observable, propertyName ) {

                    if( propertyName in self ) {
                        Y.log( Y.Lang.sub( 'Existing property "{propertyName}" overwritten by "{schemaName}"', {
                            propertyName: propertyName,
                            schemaName: schemaName
                        } ), 'warn', NAME );
                    }
                    self[propertyName] = observable;

                    // trigger generation for readOnly model and fields
                    self.getModuleViewModelReadOnly().buildReadOnlyForBoilerplate( self, propertyName );

                    if( ko.isWriteableObservable( observable._validatable ) ) {
                        self.addDisposable( ko.computed( function() {
                            // subscribe to hasError observable and add or remove error identifier
                            var
                                hasError = observable.hasError(),
                                isInitial = ko.computedContext.isInitial();

                            if( !isInitial ) {
                                if( hasError ) {
                                    self.addError( self.clientId, propertyName );
                                } else {
                                    self.removeError( self.clientId, propertyName );
                                }
                                // force complex validations to react on dependent property changes
                                self.revalidate();
                            }

                        } ) );
                    }

                } );

                self.addDisposable( ko.computed( function() {
                    var
                        key,
                        _validatable = self._validatable();

                    for( key in self._boilerplate ) {
                        if( self._boilerplate.hasOwnProperty( key ) && ko.isWriteableObservable( self._boilerplate[key]._validatable ) ) {
                            self._boilerplate[key]._validatable( _validatable );
                        }
                    }

                } ) );

                if( parent && parent._validatable ) {
                    self.addDisposable( ko.computed( function() {
                        var valid = parent._validatable();
                        self._validatable( valid );
                    } ) );
                }

                self._initSubscriptions();

                // TODO: loop through createAsync
                self.setNotModified();

            }
        },
        /**
         * @method _destroyBoilerplate
         * @protected
         */
        _destroyBoilerplate: function KoViewModel__destroyBoilerplate() {
            var
                self = this;

            self._validatable( false );
            // TODO: check destroying of hasError, _validatable, removeError again

            self.get( 'isModified' ).dispose();

            self.set( 'destroyOnArrayRemoval', true );

            Y.each( self._boilerplate, function( observable, key ) {
                // MOJ-10478: since hasError gets overridden to concat client-side only error observables we need to check if observable is writable
                if( Y.Object.owns( observable, 'hasError' ) && ko.isWriteableObservable( observable.hasError ) ) {
                    observable.hasError( false );
                }
                if( Y.Object.owns( observable, '_validatable' ) ) {
                    observable._validatable( false );
                }
                if( Y.Object.owns( observable, 'removeAll' ) ) {
                    observable.removeAll();
                }
                if( Y.Object.owns( observable, 'dispose' ) ) {
                    if( observable.dispose && "function" === observable.dispose ) {
                        observable.dispose();
                    }
                }
                self._boilerplate[key] = null;
            } );
            self._boilerplate = null;
            delete self._boilerplate;

            self._destroyValidState();
        },
        /**
         * Get Definitions from the schema to use
         * @method _getBoilerplateDefinition
         * @param {String} schemaFullPath
         * @return {*}
         * @protected
         */
        _getBoilerplateDefinition: function KoViewModel__getBoilerplateDefinition( schemaFullPath ) {
            var
                self = this,
                schema,
                schemaName,
                schemaArr,
                schemaSubPath,
                mixedSchema;

            schemaArr = schemaFullPath.split( '.' );
            schemaName = schemaArr[0];
            schemaSubPath = schemaArr.slice( 1 ).join( '.' );
            schema = Y.doccirrus.schemas[schemaName];

            if( schemaArr[1] ) {
                mixedSchema = Y.doccirrus.schemaloader.getTypeForSchemaPath( schema, schemaSubPath );
                if( mixedSchema ) {
                    mixedSchema = mixedSchema[0];
                }
                else {
                    Y.log( Y.Lang.sub( 'Could not get mixed schema for "{schemaFullPath}"', {
                        schemaFullPath: schemaFullPath
                    } ), 'warn', NAME );
                }
            } else {
                mixedSchema = schema.schema;
            }

            mixedSchema = Y.merge( self.get( 'additionalSchemaDefinitions' ), mixedSchema );

            return mixedSchema;
        },
        /**
         * generates ko.observable for each in given schemaName
         * @method _runBoilerplate
         * @returns {Object|Null}
         * @protected
         */
        _runBoilerplate: function KoViewModel__runBoilerplate() {
            var
                self = this,
                data = self.get( 'data' ),
                id = ( Y.Object.owns( data, self.idProperty ) ? data[self.idProperty] : undefined ),
                mixedSchema;

            if( !self.get( 'schemaName' ) ) {
                Y.log( 'Can not run boilerplate code: No schemaName defined!' );
                return;
            }

            mixedSchema = self._getBoilerplateDefinition( self.get( 'schemaName' ) );

            self._boilerplate[self.idProperty] = ko.observable( id );

            Y.each( mixedSchema, self._runBoilerplateEach, self );

        },
        /**
         * generates a single ko.observable
         * @param {Object|Array} property
         * @param {String} propertyName
         * @private
         */
        _runBoilerplateEach: function KoViewModel__runBoilerplateEach( property, propertyName ) {
            var
                self = this,
                schemaName = self.get( 'schemaName' ),
                data = self.get( 'data' ),
                observable,
                initialValue,
                typeName,
                validators;

            if( typeof property.default === 'function' ) {
                property.default = property.default();
            }

            if( 'default' in property ) {
                self.set( 'defaults.' + propertyName, property.default );

                if( ('object' === typeof data) && !(propertyName in data) ) {
                    self.set( 'data.' + propertyName, property.default );
                }
            }

            initialValue = Y.Lang.isUndefined( data[propertyName] ) ? property.default : data[propertyName];

            if( Y.Lang.isArray( property ) ||
                (Y.Lang.isObject( property ) && Y.Lang.isArray( property.type ) ) ) {

                typeName = Y.Lang.isString( property.dctype ) ? property.dctype : undefined; // undefined because of e.g.: [String]

                if( typeName ) {
                    typeName = self.getTypeName( typeName, propertyName, schemaName );
                    observable = buildObservableArray( {
                        NAME: typeName,
                        propertyName: propertyName,
                        schemaName: [schemaName, propertyName].join( '.' ),
                        parent: self
                    } );
                    observable( initialValue );
                } else {
                    observable = ko.observableArray( (initialValue && !Array.isArray( initialValue )) ? [initialValue] : initialValue );
                }

            } else if( Y.Lang.isObject( property ) ) {
                if( 'object' === typeof initialValue ) {
                    initialValue = lodash.cloneDeep( initialValue );
                }

                observable = ko.observable( initialValue );
            }

            if( observable ) {

                observable.i18n = property.i18n;

                if( property.list ) {
                    observable.list = ko.observableArray( property.list );
                }

                validators = [];

                if( property.required ) {
                    validators.push( Y.doccirrus.validations.common.mongooseMandatory[0] );
                }

                // read all validators defined in validate
                if( Y.Lang.isArray( property.validate ) ) {
                    validators.push.apply( validators, property.validate );

                    if( property.validate.__isCountrySpecific ) { // 'countrySpecificFields' is used to set up subscriptions for models including country specific fields
                        self.set( 'countrySpecificFields', (self.get( 'countrySpecificFields' ) || []).concat( [propertyName] ) );
                    }
                }

                // collect all validate objects and extend after boilerplate generation
                if( 0 < validators.length ) {

                    // add validation extender
                    observable.extend( {
                        validate: {
                            validators: validators,
                            context: self,
                            propertyName: propertyName
                        }
                    } );

                }

                self._boilerplate[propertyName] = observable;

            }
        },
        /**
         * Builds types for sub models to use by creating observables from schema
         * @method getTypeName
         * @param {String} typeName the current type defined in schema
         * @param {String} propertyName the property name associated with
         * @param {String} schemaFullPath the full path to that schema definition where propertyName is defined
         * @constructor
         */
        getTypeName: function KoViewModel_getTypeName( typeName/*, propertyName, schemaFullPath*/ ) {
            var
                self = this,
                getTypeName = false;
            if( self.get( 'getTypeName' ) ) {
                getTypeName = self.get( 'getTypeName' ).apply( self, arguments );
            }

            if( getTypeName ) {
                return getTypeName;
            }
            else {
                return typeName.substring( 0, typeName.lastIndexOf( '_' ) ) + 'Model';
            }
        },
        /**
         * Builds types for polymorphic sub models to use by creating observables from schema
         * @method getPolyTypeName
         * @param {String} typeName the current type defined in schema
         * @param {String} polyType the current polymorphic type defined in schema
         * @param {String} propertyName the property name associated with
         * @param {String} schemaFullPath the full path to that schema definition where propertyName is defined
         * @constructor
         */
        getPolyTypeName: function KoViewModel_getPolyTypeName(  typeName, polyType /*, propertyName, schemaFullPath*/  ){
            var
                self = this,
                getPolyTypeName = false;

            if( self.get( 'getPolyTypeName' ) ) {
                getPolyTypeName = self.get( 'getPolyTypeName' ).apply( self, arguments );
            }

            if( getPolyTypeName ) {
                return getPolyTypeName;
            }
            else {
                return typeName.substring( 0, typeName.lastIndexOf( 'Model' ) ) + (polyType.charAt( 0 ).toUpperCase() + polyType.slice( 1 )) + 'Model';
            }
        },
        /**
         * serializes this Model to a javascript object
         * @method toJSON
         * @returns {Object}
         * @protected
         */
        toJSON: function KoViewModel_toJSON( ) {
            var
                self = this,
                result = self.readBoilerplate();

            return result;
        },
        /**
         * serializes this Model boilerplate to a javascript object
         * @method readBoilerplate
         * @param {boolean} [subscribable=false]
         * @returns {Object}
         * @protected
         */
        readBoilerplate: function KoViewModel_readBoilerplate( subscribable ) {
            var
                self = this,
                lookup = self._boilerplate,
                read = subscribable ? unwrap : peek,
                result = {};

            Y.each( lookup, function( observable, key ) {
                var value = read( observable );
                if( Y.Object.owns( observable, '_arrayOf' ) ) {
                    result[key] = [];
                    Y.each( value, function( model/*, index*/ ) {
                        result[key].push( model.readBoilerplate( subscribable ) );
                    } );
                } else {
                    if( 'object' === typeof value ){
                        if( value instanceof KoViewModel ) {
                            result[ key ] = value.readBoilerplate( subscribable );
                        } else {
                            result[ key ] = lodash.cloneDeep( value );
                        }

                    } else {
                        result[key] = value;
                    }

                }
            } );
            return result;
        },
        /**
         * update this Model boilerplate with provided data
         * @method readBoilerplate
         * @param {Object} data
         * @param {Array} [fields] optional array of field names to update, default are all boilerplate field names
         * @returns {Object}
         * @protected
         */
        updateBoilerplate: function KoViewModel_updateBoilerplate( data, fields ) {
            var
                self = this,
                lookup = fields || Object.keys( self._boilerplate ),
                result = {};

            if( Y.Lang.isObject( data ) && Array.isArray( lookup ) ) {
                Y.each( lookup, function( key ) {
                    var
                        observable = self._boilerplate[key];
                    if( observable && ko.isWriteableObservable( observable ) ) {
                        self._boilerplate[key]( result[key] = data[key] );
                        if( Y.Object.owns( observable, '_arrayOf' ) && !data[key] ) {
                            result[key] = [];
                        }
                    }
                } );
            }
            return result;
        },
        /**
         * @method _initSubscriptions
         * @protected
         */
        _initSubscriptions: function KoViewModel__initSubscriptions() {
        },
        /**
         * @method _destroySubscriptions
         * @protected
         */
        _destroySubscriptions: function KoViewModel__destroySubscriptions() {
        },
        /**
         * determines if this model is considered modified
         * if you want other data to be compared against than the initial, use set 'dataUnModified' to appropriate
         * @param {Array|String} [propertyNames] returns modified for specified properties. attention: only shallow equality is tested
         * @return {boolean}
         */
        isModified: function KoViewModel_isModified( propertyNames ) {
            var
                self = this,
                originalData,
                propertyNameArr = propertyNames && (Array.isArray( propertyNames ) ? propertyNames : [propertyNames]);

            if( propertyNameArr && propertyNameArr.length ) {
                originalData = self.get( 'data' );
                return propertyNameArr.some( function( propertyName ) {
                    var propertyValue = peek( self[propertyName] ),
                        originalDataValue = originalData[propertyName];
                    return propertyValue !== originalDataValue;
                } );
            }
            return unwrap( self.get( 'isModified' ) );
        },
        isValid: function KoViewModel_isValid() {
            var
                self = this;

            return unwrap( self._isValid );
        },
        /**
         * Sets provided data or the current state of this model as not modified
         * @param {Object} [data]
         * @method setNonModified
         */
        setNotModified: function( data ) {
            var
                self = this;

            self.set( 'dataUnModified', data || self.readBoilerplate() );
        },
        /**
         * determines if this model is considered a new model - not has an id (uses set idProperty)
         * @return {boolean}
         */
        isNew: function KoViewModel_isNew() {
            var id = this[this.idProperty];
            return !Boolean( ko.unwrap( id ) );
        },

        /**
         * This method is called on initialisation for models having the supportCountryExtensions attribute set to true.
         * It does the following set up:
         *  - country extensions will be loaded dynamically as needed for the data
         *  - properties are set on the model to include the countryMode.pug as well as useful ko computed values
         *  - subscriptions are created for country specific fields to update their validation on changes to the country mode
         *
         * @method supportCountryExtensions
         */
        supportCountryExtensions: function KoViewModel_supportCountryExtensions() {
            var self = this;
            var practiceCountryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs();
            var loadedCountryExtenstions = []; // Tracks all loaded country extensions
            var constructorNamesChain = getConstructorChainOf( self );

            setCountryModeIfPracticeCountryModeUnique();
            updateCountryValidationsOnCountryModeChange();
            manageCountryExtensions();
            setCountryModeProperties();

            function getConstructorChainOf( instance ) {    // This is getting all the constructors in the instances constructor chain up to KoViewModel (excluded)
                var currentConstructor = instance.constructor;
                var constructorChain = [];

                while( Object.getPrototypeOf( currentConstructor.prototype ) !== KoViewModel.prototype ) {
                    constructorChain.push( currentConstructor.name );
                    currentConstructor = Object.getPrototypeOf( currentConstructor.prototype ).constructor;
                }
                return constructorChain;
            }

            function setCountryModeIfPracticeCountryModeUnique() {  // This sets the countryMode of the instance if it has no value yet and the practiceCountryMode is unique
                if( typeof self.countryMode === 'function' ) {
                    if( practiceCountryMode.length === 1 && self.countryMode().length === 0 ) {
                        self.countryMode( practiceCountryMode );
                    }
                }
            }

            function setCountryModeProperties() {
                self.countryModeI18n = i18n( 'international.countryMode' );

                var filteredCountryModeList = self.countryMode.list().filter( function( country ) {
                    return practiceCountryMode.indexOf( country.val ) > -1;
                } );

                self.countryMode.filteredList = ko.observable( filteredCountryModeList );

                self.countryMode.invalidCountryModeForPractice = ko.computed( function() {
                    var validationMessages = ko.unwrap( self.countryMode.validationMessages );
                    return validationMessages.includes( 'Die ausgewählte Länder sind nicht für diese Praxis zugelassen.' );
                } );
            }

            function updateCountryValidationsOnCountryModeChange() {
                if( typeof self.countryMode === 'function' ) {
                    self.countryMode.subscribe( function() {
                        var countrySpecificFields = self.get( 'countrySpecificFields' );
                        (countrySpecificFields || []).forEach( function( countrySpecificField ) {
                            if( self[countrySpecificField] && typeof self[countrySpecificField].validate === 'function' ) {
                                self[countrySpecificField].validate();
                            }
                        } );
                    } );
                }
            }

            function manageCountryExtensions() {
                // Load extensions needed initially
                self.countryMode().forEach( function( countryCode ) {
                    if( practiceCountryMode.indexOf( countryCode ) > -1 ) { // Should always be the case. A PRC should not be handling data it is not licensed for
                        initCountryExtensions( countryCode );
                    }
                } );

                // Loading new extensions on countryMode changes
                self.countryMode.subscribe( function( changes ) {
                    changes.forEach( function( change ) {
                        if( change.status === 'added' ) {
                            if( practiceCountryMode.indexOf( change.value ) > -1 ) { // Should always be the case. A PRC should not be handling data it is not licensed for
                                initCountryExtensions( change.value );
                            }
                        }

                    } );
                }, null, "arrayChange" );

                // NB: Those computed are used in the .pug files. It is important they come after the subscription above,
                // so that the country extensions are initialized before the DOM updates.
                self.countryModeIncludesGermany = ko.computed( function() {
                    return Array.isArray( self.countryMode() ) && self.countryMode().indexOf( 'D' ) > -1;
                } );
                self.countryModeIncludesSwitzerland = ko.computed( function() {
                    return Array.isArray( self.countryMode() ) && self.countryMode().indexOf( 'CH' ) > -1;
                } );

                function initCountryExtensions( countryCode ) {
                    var countryExtensionNames;

                    if( loadedCountryExtenstions.indexOf( countryCode ) === -1 ) { // Dont' reload extensions that have already been loaded
                        countryExtensionNames = constructorNamesChain.map( function( name ) {
                            return name + "_" + countryCode;
                        } );

                        countryExtensionNames
                            .reverse()
                            .map( function( name ) {
                                return Y.doccirrus.KoViewModel.getConstructor( name ); //TODO MOJ-11081: implement own method here for list based country extensions
                            } )
                            .filter( function( CountryExtensionModel ) {
                                return CountryExtensionModel;
                            } )
                            .forEach( function( CountryExtensionModel ) {
                                var baseModelDestructor = Object.getPrototypeOf( self ).destructor;

                                // We don't want to override the 'constructor', 'initializer' and 'destructor' properties of our
                                // Model's prototype object.
                                // - The extension constructor and initializer are being called below.
                                // - The extension's destructor will get added to the base model's destructor.
                                Object.assign( Object.getPrototypeOf( self ), _.omit( CountryExtensionModel.prototype, ['constructor', 'initializer', 'destructor'] ) );

                                // Given that we already have our instance, we need to manually add possible ATTRS
                                // properties:
                                self.addAttrs( _.cloneDeep( CountryExtensionModel.ATTRS ) );

                                // TODO MOJ-11082: Slight problem here in that the first time round the initializer/constructor gets called before the model's initializer. Might lead to unexpected behavior.
                                // Tricky to fix, might need to think about wrapping the base model instead of giving it
                                // a supportCountryExtension attribute. Or listen to 'init event.'
                                CountryExtensionModel.call( self );
                                CountryExtensionModel.prototype.initializer.call( self );

                                Object.getPrototypeOf( self ).destructor = function() {
                                    baseModelDestructor.apply( this, arguments );
                                    CountryExtensionModel.prototype.destructor.apply( this, arguments );
                                };
                            } );

                        loadedCountryExtenstions.push( countryCode );
                    }
                }
            }
        }
    } );

    /**
     * utils of KoViewModel
     * @class doccirrus.KoViewModel.utils
     */
    /**
     * @property utils
     * @for doccirrus.KoViewModel
     * @type {doccirrus.KoViewModel.utils}
     */
    MNS.utils = {
        /**
         * create an async ko.computed, while inProgress use config.value.
         * @uses ko.extenders.makeAsync
         * @method createAsync
         * @for doccirrus.KoViewModel.utils
         * @param {Object} config the configuration
         * @param {Object} config.jsonrpc Object with property "fn" (rpc function reference) and optional "params" (Object or ko.observable).
         *                                      In case "params" evaluates to a false value and isn't 'undefined', the rpc won't be called
         *                                      In case "params" change, the rpc will be called again.
         * @param {Object} config.ajax Object with properties of jQuery.ajax which may overwrite the defaults, "url" can be a function or "url" and "data" can be ko.observable.
         *                                      In case "url" evaluates to a false value, the ajax won't be called
         *                                      In case "url" or "data" change, the ajax will be called again.
         * @param {*} [config.initialValue] value to use while in progress
         * @param {*} [config.cache=ViewModel] namespace to use for caching
         * @param {*} [config.cacheTimeout] timeout to use for clearing cached results
         * @param {ko.computed} [config.computed] arguments you would pass to a computed the return should be a jQuery.Deferred
         * @param {*} [config.computedContext] context to use for computed
         * @returns {ko.observable} the extended observable, additional properties are:
         *                                      "inProgress" - for checking if deferred is resolved
         *                                      "createAsync" - an Object with "config" (the passed config), "deferred" (current jQuery.Deferred), "computed" (not extended observable)
         * @static
         * @see ko.extenders.makeAsync
         * @example _via jsonrpc:_
         * @example
         self._exampleAsync = Y.doccirrus.KoViewModel.utils.createAsync( {
             cache: MyModel,
             initialValue: [],
             jsonrpc: {
                 fn: Y.doccirrus.jsonrpc.api.schema.read,
                 params: { foo: 'bar' } // optional, for observable params: ko.observable({ foo: 'bar' })
             },
             converter: function( data ) {
                 return Y.Object.owns( data, 'data' ) ? data.data : [];
             }
         } );
         * @example _via ajax:_
         * @example
         self._exampleAsync = Y.doccirrus.KoViewModel.utils.createAsync( {
             cache: MyModel,
             initialValue: [],
             ajax: {
                 url: 'http://some.url/read',
                 // as a function: function(){ return 'http://some.url/read'; }
                 // as an observable: ko.computed(function(){ return 'http://some.url/read'; })
                 data: {} // optional, can also be ko.observable({})
             },
             converter: function( data ) {
                 return data ? data : [];
             }
         } );
         * @example _via only deferred:_
         * @example
         self._exampleAsync = Y.doccirrus.KoViewModel.utils.createAsync( {
             initialValue: 'foo',
             converter: function( data ) {
                 return data + ' (converted)';
             }
         } );
         // emulate async:
         setTimeout(function(){
             self._exampleAsync.createAsync.deferred.resolve('bar');
         }, 2000);
         // print to console:
         ko.computed(function(){
             //console.log('value of "_exampleAsync":', self._exampleAsync());
             // logs: value of "_exampleAsync": 'foo'
             // +2000ms logs: value of "_exampleAsync": 'bar (converted)'
         });
         */
        createAsync: function KoViewModel_createAsync( config ) {
            // FYI: initialValue && converter are handled by the extender
            config = config || {};

            var
                computedContext = config.computedContext,
                cacheNamespace = config.cache || KoViewModel,
                cache = cacheNamespace.async = cacheNamespace.async || {},
                cacheTimeout = config.cacheTimeout,
                jsonRpc = config.jsonrpc,
                ajax = config.ajax,
                computedCfg = config.computed,
                computed, extended, currentDeferred;

            if( !computedCfg ) {
                if( jsonRpc ) {
                    computedCfg = function computedJsonRpcHandler() {
                        var
                            params = ko.unwrap( (Y.Lang.isUndefined( jsonRpc.params ) ? {} : jsonRpc.params) ), // params to pass and listen to change
                            fn = ( Y.Lang.isUndefined( jsonRpc.fn ) ? jsonRpc : jsonRpc.fn ), // rpc to use
                            identifier = {d: fn.description, p: params}, // unique identifier for caching
                            hash = JSON.stringify( identifier ), // hash to use in cache
                            deferred; // the returned deferred of rpc

                        if( params ) { // do call for supplied params
                            if( hash in cache ) { // if available use cached deferred
                                deferred = cache[hash];
                            } else { // else cache the deferred
                                deferred = fn( params );
                                cache[hash] = deferred;
                                if( cacheTimeout ) {
                                    setTimeout( function() {
                                        cache[hash] = null;
                                        delete cache[hash];
                                    }, cacheTimeout );
                                }
                            }
                        } else { // don't call just make deferred
                            deferred = jQuery.Deferred();
                        }

                        currentDeferred = deferred;

                        return deferred; // return deferred to extender
                    };
                } else if( ajax ) {
                    computedCfg = function computedAjaxHandler() {
                        var
                            ajaxCfg = Y.aggregate( { // ajax defaults
                                type: 'GET', dataType: 'json',
                                xhrFields: {withCredentials: true}
                            }, ajax, true ),
                            hash, deferred;

                        if( !ko.isObservable( ajaxCfg.url ) && 'function' === typeof ajaxCfg.url ) {
                            ajaxCfg.url = ajaxCfg.url(); // handle url if is a plain function
                        } else {
                            ajaxCfg.url = ko.unwrap( ajaxCfg.url ); // listen to change
                        }
                        ajaxCfg.data = ko.unwrap( ajaxCfg.data ); // listen to change

                        if( ajaxCfg.url ) { // do call for valid url
                            hash = JSON.stringify( {u: ajaxCfg.url, d: ajaxCfg.data} ); // unique identifier for caching
                            if( hash in cache ) { // if available use cached deferred
                                deferred = cache[hash];
                            } else { // else cache the deferred
                                deferred = jQuery.ajax( ajaxCfg );
                                cache[hash] = deferred;
                                if( cacheTimeout ) {
                                    setTimeout( function() {
                                        cache[hash] = null;
                                        delete cache[hash];
                                    }, cacheTimeout );
                                }
                            }
                        } else { // don't call just just make deferred
                            deferred = jQuery.Deferred();
                        }

                        currentDeferred = deferred;

                        return deferred; // return deferred to extender
                    };
                } else {
                    // just a dummy for other deferred stuff
                    computedCfg = function computedDeferredHandler() {
                        var
                            deferred = jQuery.Deferred();

                        currentDeferred = deferred;

                        return deferred; // return deferred to extender
                    };
                }
            }

            computed = ko.pureComputed( computedCfg, computedContext );
            extended = computed.extend( {makeAsync: config} );

            extended.createAsync = {
                config: config,
                computed: computed,
                deferred: currentDeferred
            };

            return extended;
        },
        /**
         * @method buildObservableArray
         * @for doccirrus.KoViewModel.utils
         * @type {buildObservableArray}
         */
        buildObservableArray: buildObservableArray
    };

    /**
     * a LazyModelList of KoViewModel instances
     * @class doccirrus.KoViewModel.instances
     */
    /**
     * @property instances
     * @for doccirrus.KoViewModel
     * @type {doccirrus.KoViewModel.instances|LazyModelList}
     */
    MNS.instances = new Y.LazyModelList();

    /**
     * the map of registered KoViewModel constructors
     * @class doccirrus.KoViewModel.constructors
     */
    /**
     * @property constructors
     * @for doccirrus.KoViewModel
     * @type {doccirrus.KoViewModel.constructors}
     */
    MNS.constructors = {
        /**
         * the base class
         * @property KoViewModel
         * @for doccirrus.KoViewModel.constructors
         * @type {KoViewModel}
         */
        KoViewModel: KoViewModel
    };

    /**
     * returns base KoDisposable constructor for extending
     * @method getDisposable
     * @for doccirrus.KoViewModel
     * @returns {KoDisposable}
     */
    MNS.getDisposable = function KoViewModel_getDisposable() {
        return KoDisposable;
    };

    /**
     * returns base KoViewModel constructor for extending
     * @method getBase
     * @for doccirrus.KoViewModel
     * @returns {KoViewModel}
     */
    MNS.getBase = function KoViewModel_getBase() {
        return KoViewModel;
    };

    /**
     * Retrieves the sub value at the provided path, from the value object provided.
     * Peeking observables when walking the path, won't peek the target
     * @method getValueObservable
     * @for doccirrus.KoViewModel
     * @param {Object} o
     * @param {String|Array} path
     * @param {Boolean} [unwrap=false] unwrap instead of peek
     * @return {*|undefined}
     */
    MNS.getValueObservable = function KoViewModel_getValueObservable( o, path, unwrap ) {

        if( !Y.Lang.isObject( o ) ) {
            return undefined;
        }

        if( Y.Lang.isString( path ) ) {
            path = path.split( '.' );
        }

        var i,
            p = Y.Array( path ),
            l = p.length;

        for( i = 0; o !== undefined && i < l; i++ ) {
            if( i < l - 1 ) {
                o = unwrap ? ko.unwrap( o[p[i]] ) : peek( o[p[i]] );
            }
            else {
                o = o[p[i]];
            }
        }

        return o;
    };

    /**
     * get a registered KoViewModel extended constructor
     * @method getConstructor
     * @for doccirrus.KoViewModel
     * @param {String} NAME
     * @return {undefined|KoViewModel}
     */
    MNS.getConstructor = function KoViewModel_getConstructor( NAME ) {
        if (!MNS.constructors[NAME]) {
            Y.log('A constructor has not been registered for: ' + NAME, 'warn', 'KOViewModel');
        }
        return MNS.constructors[NAME];
    };

    /**
     * registers a KoViewModel extended constructor to use with 'createViewModel'
     * @method registerConstructor
     * @param {Function} constructor
     * @param {String} constructor.NAME
     * @param {String} constructor.schemaName
     * @for doccirrus.KoViewModel
     */
    MNS.registerConstructor = function KoViewModel_registerConstructor( constructor ) {
        if( !(Y.Object.owns( constructor, 'NAME' ) && constructor.NAME) ) {
            Y.log( 'KoViewModel.registerConstructor: missing "NAME"', 'warn', NAME );
        }
        if( !(Y.Object.owns( constructor, 'schemaName' ) && constructor.schemaName) ) {
            Y.log( 'KoViewModel.registerConstructor: missing "schemaName"', 'warn', NAME );
        }
        MNS.constructors[constructor.NAME] = constructor;
    };

    /**
     * creates an instance from schemaName or registered constructors NAME
     * @method createViewModel
     * @param {Object} parameters
     * @param {String} [parameters.schemaName]
     * @param {String} [parameters.NAME] a registered constructors NAME
     * @param {Object} [parameters.config] passed constructor config
     * @returns {KoViewModel|constructor}
     * @for doccirrus.KoViewModel
     */
    MNS.createViewModel = function KoViewModel_create( parameters ) {
        parameters = parameters || {};
        var
            config = parameters.config || {},
            _NAME = parameters.NAME || '',
            schemaName = parameters.schemaName,
            ModelConstructor = null;

        if( schemaName ) {
            config.schemaName = schemaName;

        }

        ModelConstructor = getObject( _NAME, MNS.constructors );

        if( ModelConstructor ) {
            if( ModelConstructor.overrideSchemaName && ModelConstructor.schemaName ) {
                config.schemaName = ModelConstructor.schemaName;
            }
            return new ModelConstructor( config );
        }
        else {
            return new KoViewModel( config );
        }
    };

    /**
     * Returns a model by a specified find function, or null if not found.
     * @param {Function} fn
     * @returns {null|KoDisposable}
     */
    MNS.getViewModelBy = function KoViewModel_getViewModelBy( fn ) {
        return Y.Array.find( MNS.instances._items, fn );
    };

    /**
     * Returns a model with the specified constructor NAME, or null if not found.
     * @param {string} name
     * @returns {null|KoDisposable}
     */
    MNS.getViewModel = function KoViewModel_getViewModel( name ) {
        return MNS.getViewModelBy( function( model ) {
            return name === model.constructor.NAME;
        } );
    };

}, '3.16.0', {
    requires: [
        'oop',
        'ko-bindingHandlers',
        'ko-extenders',

        'lazy-model-list',
        'dcschemaloader',
        'dcvalidations',
        'ViewModelReadOnly',
        'dccommonutils'
    ]
} );
