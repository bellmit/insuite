/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, jQuery */
YUI.add( 'KoField', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoField
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
     * __An implementation managing form fields.__
     * @class KoField
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoField() {
        KoField.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoField,
        extends: KoComponent,
        static: {
            /**
             * Constants for KoField.
             * @property CONST
             * @static
             * @final
             * @type {object}
             * @for KoField
             */
            CONST: {
                SIZE: {
                    DEFAULT: '',
                    SMALL: 'input-sm',
                    LARGE: 'input-lg'
                }
            }
        },
        descriptors: {
            componentType: 'KoField',
            icon: '',
            /**
             * If specified, a writable computed is created as value and will ensure value is of these available types:
             * - boolean
             * - integer
             * - float
             * - number
             * - string
             * - array
             * - object
             * - date
             * @type {String}
             * @default null
             */
            valueType: null,
            /**
             * @property valueUpdate
             * @type {String}
             * @default ''
             */
            valueUpdate: '',
            init: function() {
                var
                    self = this;

                KoField.superclass.init.apply( self, arguments );

                if( null !== ko.utils.peekObservable( self.valueType ) ) {
                    self.initValueWrite();
                }

                self.addDisposable( ko.computed( function() {
                    var
                        SIZE = KoField.CONST.SIZE,
                        css = peek( self.css ),
                        size = unwrap( self.size );

                    Y.each( SIZE, function( value, key ) {
                        css[SIZE[key]] = (size === key);
                    } );
                    self.css.valueHasMutated();
                }, self ) );

                self.initReset();
                self.initFilterOptions() ;
            },
            /**
             * @protected
             */
            // TODO: improve computed usage
            initValueWrite: function() {
                var
                    self = this,
                    _value = self.value;

                self.value = ko.computed( {
                    read: _value,
                    write: function( value ) {
                        self._valueWrite( _value, value );
                    }
                }, self );
            },
            _valueWrite: function( observable, value ) {
                var self = this;
                switch( self.valueType ) {
                    case 'boolean':
                        self.renderer(observable, Boolean( value ) );
                        break;
                    case 'integer':
                        self.renderer(observable, parseInt( value, 10 ) );
                        break;
                    case 'float':
                        self.renderer(observable, parseFloat( value ) );
                        break;
                    case 'number':
                        self.renderer(observable, Number( value ) );
                        break;
                    case 'string':
                        self.renderer(observable, String( value ) );
                        break;
                    case 'array':
                        self.renderer(observable, new Array( value ) );
                        break;
                    case 'object':
                        self.renderer(observable,  Object( value ) );
                        break;
                    case 'date':
                        self.renderer(observable,  Date( value ) );
                        break;
                    default:
                        self.renderer(observable, value );
                        break;
                }
            },
            /**
             * @property _resetValue
             * @private
             */
            /** @protected */
            initReset: function() {
                var
                    self = this,
                    initialConfig = self.initialConfig;

                if( 'value' in initialConfig ) {

                    self._resetValue = ko.utils.peekObservable( initialConfig.value );

                }

            },

            /**
             *  Observables for filter options, set icons / style when filter behavior is changed for this field
             */

            initFilterOptions: function() {
                var self = this;

                self.textSearchType = ko.observable( 'all' );
                self.isFilterInverted = ko.observable( false );

                self.subScribeInvertStyle = self.isFilterInverted.subscribe( function() {
                    var cssObj = self.css();
                    cssObj.KoFieldInvert = self.isFilterInverted();
                    self.css( cssObj );
                } );

                self.iconPlaceholder = ko.computed( function() {
                    var icon = '';
                    switch( self.textSearchType() ) {
                        case 'ends':    icon = '❰ ';      break;
                        case 'begins':  icon = '❱ ';      break;
                    }
                    return icon + self.placeholder();
                } );
            },

            /**
             * @method reset
             */
            reset: function() {
                var
                    self = this;

                if( '_resetValue' in self ) {

                    self.value( self._resetValue );

                }
                else {

                    self.value( '' );

                }

            },
            /**
             * @method renderer
             */
            renderer: function( observable, value ) {
                return observable(value);
            }
        },
        lazy: {
            /**
             * The inputs type attribute
             * @attribute type
             * @type {String}
             * @default 'text'
             */
            type: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'text' ) );
            },
            /**
             * @attribute label
             * @type {String}
             * @default ''
             */
            label: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * @attribute placeholder
             * @type {String}
             * @default ''
             */
            placeholder: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * @attribute value
             * @type {ko.observable(String)}
             * @default ''
             */
            value: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * @attribute size
             * @type {String}
             * @default 'DEFAULT'
             * @see KoField.CONST.SIZE
             */
            size: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'DEFAULT' ) );
            },
            icon: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( {iconName: self.initialConfig.icon}, 'KoIcon' );
            },
            styleField: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( {} ) );
            },
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoField' ) );
            },
            /**
             * In general used to focus the components top most input element.
             * - [knockout "hasFocus" binding](http://knockoutjs.com/documentation/hasfocus-binding.html)
             * @attribute hasFocus
             * @type {ko.observable(Boolean)}
             * @default false
             */
            hasFocus: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            }
        }
    } );
    /**
     * @property KoField
     * @type {KoField}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoField );

    /**
     * __An implementation managing select fields.__
     * @class KoFieldSelect
     * @constructor
     * @extends KoField
     * @param {Object} config a configuration object
     */
    function KoFieldSelect() {
        KoFieldSelect.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoFieldSelect,
        extends: KoField,
        descriptors: {
            componentType: 'KoFieldSelect',
            init: function() {
                var self = this;
                KoFieldSelect.superclass.init.apply( self, arguments );
            },
            /**
             * @method reset
             * @for KoFieldSelect
             */
            reset: function() {
                var
                    self = this;

                if( '_resetValue' in self ) {

                    self.value( self._resetValue );

                }
                else {

                    self.value( undefined );

                }

            },
            /**
             * Get the display value for that entry
             * - [knockout "options" binding](http://knockoutjs.com/documentation/options-binding.html)
             * @property optionsText
             * @type {null|String|Function}
             * @default null
             */
            optionsText: null,
            /**
             * Get the value for that entry
             * - [knockout "options" binding](http://knockoutjs.com/documentation/options-binding.html)
             * @property optionsValue
             * @type {null|String|Function}
             * @default null
             */
            optionsValue: null,
            /**
             * Set a caption
             * - [knockout "options" binding](http://knockoutjs.com/documentation/options-binding.html)
             * @property optionsCaption
             * @type {null|String}
             * @default null
             */
            optionsCaption: null
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoFieldSelect' ) );
            },
            /**
             * @attribute value
             * @for KoFieldSelect
             * @type {ko.observable(undefined|String)}
             */
            value: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            },
            /**
             * The array items to make the list up
             * - [knockout "options" binding](http://knockoutjs.com/documentation/options-binding.html)
             * @attribute options
             * @type {Array}
             */
            options: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observableArray() );
            }
        }
    } );
    /**
     * @property KoFieldSelect
     * @type {KoFieldSelect}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoFieldSelect );

    /**
     * __An implementation managing select2 fields.__
     * @class KoFieldSelect2
     * @constructor
     * @extends KoFieldSelect
     * @param {Object} config a configuration object
     */
    function KoFieldSelect2() {
        KoFieldSelect2.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoFieldSelect2,
        extends: KoFieldSelect,
        descriptors: {
            componentType: 'KoFieldSelect2',
            init: function() {
                var
                    self = this,
                    select2ConfigDefaults,
                    placeholder,
                    optionsCaption;

                KoFieldSelect2.superclass.init.apply( self, arguments );

                // build select2 configuration

                // TODO: placeholder / optionsCaption …
                placeholder = peek( self.placeholder );
                optionsCaption = peek( self.optionsCaption );

                select2ConfigDefaults = {
                    multiple: true,
                    allowClear: true,
                    dropdownAutoWidth: true,
                    query: function( options ) {
                        var
                            term = options.term,
                            callback = options.callback,
                            filtered = [],
                            data = peek( self.options ).map( self.select2Mapper, self ),
                            text = [];

                        if( Y.Lang.isFunction( self.provideOwnQueryResults ) ) {
                            data.unshift.apply( data, self.provideOwnQueryResults( options, data ).map( self.select2Mapper, self ) );
                        }

                        // filter the data for matches
                        data.forEach( function( item ) {
                            if( term === "" || options.matcher( term, item.text ) ) {
                                filtered.push( item );
                                text.push( item.text.toLowerCase() );
                            }
                        } );

                        // allow custom values
                        if( peek( self.allowValuesNotInOptions ) ) {
                            if( '' !== term && (!filtered.length || -1 === text.indexOf( term.toLowerCase() )) ) {
                                filtered.unshift( self.select2Mapper( term ) );
                            }
                        }

                        callback( {
                            results: filtered
                        } );
                    },
                    initSelection: function( element, callback ) {
                        var
                            value = peek( self.value ),
                            options = peek( self.options ),
                            optionsMap = {},
                            results;

                        options.forEach( function( option ) {
                            var
                                mapped = self.select2Mapper( option );

                            optionsMap[mapped.id] = mapped;
                        } );

                        // no options no results, expecting to use 'updateOnOptionsChanged'
                        if( !options.length ) {
                            callback( [] );
                            return;
                        }

                        // multiple
                        if( self.select2Config.multiple ) {

                            if ( !value || !value.map ) {
                                console.warn( 'Invalod value passed to select2, stack trace follows: ', new Error().stack );    //  eslint-disable-line no-console
                            }

                            results = value.map( function( item ) {
                                if( item in optionsMap ) {
                                    return optionsMap[item];
                                }
                                else {
                                    return self.select2Mapper( item );
                                }
                            } );
                        }
                        // not multiple
                        else {
                            if( value in optionsMap ) {
                                results = optionsMap[value];
                            }
                        }

                        callback( results );
                    }
                };

                // care about non observable placeholder @see ko.bindingHandlers.select2
                // prioritize optionsCaption as placeholder before optionsCaption
                if( optionsCaption ) {
                    select2ConfigDefaults.placeholder = optionsCaption;
                } else if( placeholder ) {
                    select2ConfigDefaults.placeholder = placeholder;
                }

                // overwrite defaults
                self.select2Config = Y.aggregate( select2ConfigDefaults, self.select2Config, true );

            },

            /**
             * @method reset
             * @for KoFieldSelect2
             */
            reset: function() {
                var
                    self = this,
                    initialConfig = self.initialConfig;

                if( '_resetValue' in self ) {

                    self.value( self._resetValue );

                }
                else {

                    if( initialConfig.select2Config && false === initialConfig.select2Config.multiple ) {

                        self.value( '' );
                    }
                    else {

                        self.value( [] );
                    }

                }

            },
            /**
             * The select2 binder config property
             * @property select2Config
             * @type {Object}
             * @protected
             */
            select2Config: null,
            /**
             * The Mapper to make up the select2 items
             * - [select2 documentation] (http://select2.github.io/select2/)
             * @param data
             * @return Object
             */
            select2Mapper: function select2Mapper( data ) {
                var
                    self = this,
                    id = data,
                    text = data;

                if( Y.Lang.isObject( data ) ) {

                    switch( Y.Lang.type( self.optionsText ) ) {
                        case 'string':
                            text = data[self.optionsText];
                            break;
                        case 'function':
                            text = self.optionsText( data );
                            break;
                    }

                    switch( Y.Lang.type( self.optionsValue ) ) {
                        case 'string':
                            id = data[self.optionsValue];
                            break;
                        case 'function':
                            id = self.optionsValue( data );
                            break;
                    }

                }

                return {
                    id: id,
                    text: text,
                    _data: data
                };
            },
            /**
             * Ability to provide dynamically own query results
             * @method provideOwnQueryResults
             * @param {Object} options option argument as provided from select2 "query" function
             * @param {Array} data the available data to query as taken from transformed "{{#crossLink "KoFieldSelect2/options:attribute"}}{{/crossLink}}"
             * @returns {Array}
             * @for KoFieldSelect2
             */
            provideOwnQueryResults: null,
            /**
             * if set to true, select2 will use data: {}, if
             * @property useSelect2Data
             * @type {Boolean}
             */
            useSelect2Data: null,
            /**
             * Used as mapper write.
             * is called with { $event:(Object), value: (observable)  }
             * @property select2Write
             * @type {Function}
             */
            select2Write: null,
            /**
             * Used as mapper read.
             * is called with { value:(*)  }
             * @property select2Read
             * @type {Function}
             */
            select2Read: null
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoFieldSelect2' ) );
            },
            /**
             * @attribute value
             * @for KoFieldSelect2
             * @type {ko.observableArray(String|Array)}
             */
            value: function( key ) {
                var
                    self = this,
                    initialConfig = self.initialConfig,
                    observable;

                if( initialConfig.select2Config && false === initialConfig.select2Config.multiple ) {

                    observable = ko.observable( '' );
                }
                else {

                    observable = ko.observableArray();
                }

                return self._handleLazyConfig( key, observable );
            },
            /**
             * When set it is possible to set values that are not part of {{#crossLink "KoFieldSelect/options:attribute"}}{{/crossLink}}
             * @attribute allowValuesNotInOptions
             * @type {ko.observable|boolean}
             * @default false
             */
            allowValuesNotInOptions: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * The select2 binder config which will be applied in template
             * @property select2Config
             * @type {Object}
             * @protected
             */
            select2ConfigBind: function() {
                var
                    self = this,
                    defaults = self.select2Config,
                    select2Binding = {

                        select2: defaults,
                        init: function( element ) {

                            // updateOnOptionsChanged handling
                            self.addDisposable( ko.computed( function() {

                                if( unwrap( self.updateOnOptionsChanged ) ) {
                                    unwrap( self.options );

                                    if( ko.computedContext.isInitial() ) {
                                        return;
                                    }

                                    jQuery( element ).select2( 'val', peek( self.value ) );
                                }

                            } ) );

                        }
                    };

                if( self.useSelect2Data ) {
                    select2Binding.data = self.addDisposable( ko.computed( {
                        read: function() {
                            var value = ko.unwrap( self.value );
                            if( self.select2Read ) {
                                value = self.select2Read( value );
                            }
                            return value;
                        },
                        write: function( $event ) {
                            if( self.select2Write ) {
                                self.select2Write( $event, self.value );
                            } else {
                                self.value( $event.val );
                            }

                        }
                    } ) );
                } else {
                    select2Binding.val = self.addDisposable( ko.computed( {
                        read: function() {
                            var value = ko.unwrap( self.value );
                            return value;
                        },
                        write: function( $event ) {
                            // transfer select2 data status
                            self.value( $event.val );
                        }
                    } ) );
                }

                // care about observable placeholder @see ko.bindingHandlers.select2
                // prioritize optionsCaption as placeholder before optionsCaption
                if( ko.isObservable( self.optionsCaption ) ) {
                    select2Binding.placeholder = self.optionsCaption;
                } else if( ko.isObservable( self.placeholder ) ) {
                    select2Binding.placeholder = self.placeholder;
                }

                return select2Binding;
            },
            /**
             * Force to update select2 when the options change after initialisation
             * @attribute updateOnOptionsChanged
             * @for KoFieldSelect2
             * @type {ko.observable(Boolean)}
             * @default false
             */
            updateOnOptionsChanged: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            }
        }
    } );
    /**
     * @property KoFieldSelect2
     * @type {KoFieldSelect2}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoFieldSelect2 );

}, '3.16.0', {
    requires: [
        'oop',
        'KoUI',
        'KoComponentManager',
        'KoComponent',
        'dcquery'
    ]
} );
