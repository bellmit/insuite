/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'OphthalmologyEditorModel', function( Y, NAME ) {
        /**
         * @module OphthalmologyEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @abstract
         * @class OphthalmologyEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function OphthalmologyEditorModel( config ) {
            OphthalmologyEditorModel.superclass.constructor.call( this, config );
        }

        OphthalmologyEditorModel.ATTRS = {
            KeyboardEventKeyMap: {
                value: {
                    37: 'Left',
                    38: 'Up',
                    39: 'Right',
                    40: 'Down'
                },
                lazyAdd: false
            },
            OPHTHALMOLOGY: {
                value: Y.doccirrus.schemas.activity.utilsOphthalmology.getOphthalmologyConfiguration(),
                lazyAdd: false
            },
            validKeys: {
                value: ['Down', 'Up', 'Left', 'Right'],
                lazyAdd: false
            },
            invertKeys: {
                value: ['Down', 'Left'],
                lazyAdd: false
            },
            takeoverKeys: {
                value: ['Left', 'Right'],
                lazyAdd: false
            }
        };
        Y.extend( OphthalmologyEditorModel, KoViewModel.getConstructor( 'ActivityEditorModel' ), {

                initializer: function() {
                    var
                        self = this;
                    self.initOphthalmologyEditorModel();
                },
                destructor: function() {
                },
                initOphthalmologyEditorModel: function() {
                },
                defaultErrorHandler: function( errors ) {
                    Y.each( errors, function( error ) {
                        Y.log( error, 'error', NAME );
                    } );
                },
                /**
                 * helper for creating computed fields by looking up field configurations
                 * @param {Object} parameters
                 * @param {String} parameters.fieldName
                 * @return {ko.computed}
                 */
                createComputedFromFieldConfiguration: function( parameters ) {

                    var
                        self = this,
                        fieldName = parameters.fieldName,
                        fieldConfig = self.getOphthalmologyFieldConfiguration( fieldName ),
                        toFixed = fieldConfig.toFixed,
                        prefixedPositive = fieldConfig.prefixedPositive,
                        prefixedPositiveButZeroIsNegative = fieldConfig.prefixedPositiveButZeroIsNegative;

                    return self.addDisposable( ko.computed( {
                        read: function() {
                            var value = self[fieldName](),
                                parsedValue = parseFloat( value ),
                                result;
                            if( isNaN( parsedValue ) ) {
                                return value;
                            }
                            if( !toFixed ) {
                                result = String( parsedValue ).replace( '.', ',' );
                            } else {
                                result = Y.doccirrus.comctl.numberToLocalString( parsedValue, {
                                    decimals: toFixed
                                } );
                            }

                            if( prefixedPositive && parsedValue >= 0 ) {
                                result = '+' + result;
                            }

                            if( prefixedPositiveButZeroIsNegative ) {
                                if( parsedValue === 0 ) {
                                    result = '-' + result;
                                } else if( parsedValue > 0 ) {
                                    result = '+' + result;
                                }
                            }

                            return result;
                        },
                        write: function( value ) {
                            if( !toFixed ) {
                                if( Y.Lang.isString( value ) ) {
                                    value = parseFloat( value.replace( /,/g, '.' ) );
                                    if( isNaN( value ) ) {
                                        value = '';
                                    }
                                }
                                self[fieldName]( value );
                            } else {
                                self.setOphthalmologyNumberValue( {
                                    fieldName: fieldName,
                                    value: ( '' === value ? '' : Y.doccirrus.comctl.localStringToNumber( String( value ) ) )
                                } );
                            }
                        }
                    } ) );
                },

                /// old methods
                translateKeyCodeToKeyboardEventKey: function( keyCode ) {
                    var
                        self = this,
                        KeyboardEventKeyMap = self.get( 'KeyboardEventKeyMap' );
                    return KeyboardEventKeyMap[keyCode];
                },
                /**
                 * get fieldName configuration
                 * @param {String} fieldName
                 * @return {Object|undefined}
                 */
                getOphthalmologyFieldConfiguration: function( fieldName ) {
                    var
                        self = this,
                        OPHTHALMOLOGY = self.get( 'OPHTHALMOLOGY' );
                    return OPHTHALMOLOGY.FieldConfiguration[fieldName];
                },
                /**
                 * creates event handler bound to fieldName configuration
                 * @param {String} fieldName
                 * @return {Function}
                 */
                getOphthalmologyKeyBinder: function ActivityModelgetOphthalmologyKeyBinder( fieldName ) {
                    var
                        self = this,
                        configuration = self.getOphthalmologyFieldConfiguration( fieldName );

                    return Y.bind( self.handleOphthalmologyKey, self, configuration );
                },

                /**
                 * sets a value for an Ophthalmology configured fieldName
                 * - either value or modifyBy must be specified
                 * - the value is checked against min max values, if available and a notice is shown, which can be prevented
                 * - values can lie out of min max range
                 * @param {Object} parameters
                 * @param {String} parameters.fieldName
                 * @param {Number|''|null} [parameters.value]
                 * @param {Number} [parameters.modifyBy]
                 * @param {Boolean} [parameters.preventNotice=false]
                 */
                setOphthalmologyNumberValue: function( parameters ) {
                    var
                        self = this,

                        fieldName = parameters.fieldName,
                        modifyBy = parameters.modifyBy,
                        value = parameters.value,
                        preventNotice = parameters.preventNotice,

                        hasValue = Y.Object.owns( parameters, 'value' ),
                        hasModifyBy = Y.Object.owns( parameters, 'modifyBy' ),

                        observable = self[fieldName],
                        currentValue = observable.peek(),
                        fieldConfig = this.getOphthalmologyFieldConfiguration( parameters.fieldName ),
                        toFixed = fieldConfig.toFixed,
                        increment = fieldConfig.increment,
                        min = fieldConfig.min,
                        max = fieldConfig.max,
                        startAt = fieldConfig.startAt,
                        average,
                        OPHTHALMOLOGY = self.get( 'OPHTHALMOLOGY' );
                    // get some errors
                    if( !(hasValue || hasModifyBy) ) {
                        Y.log( 'setOphthalmologyNumberValue: At least "value" or "modifyBy" must be set', 'error', NAME );
                    }

                    // allow empty String and null as a value
                    if( '' === value || null === value ) {
                        observable( value );
                        return;
                    }

                    // get a value
                    if( !hasValue ) {
                        value = parseFloat( currentValue );
                    }

                    // if there's not a valid value determine start value
                    if( isNaN( value ) ) {
                        // use set by configuration
                        if( !Y.Lang.isUndefined( startAt ) ) {
                            value = startAt;
                        } else
                        // no min / max
                        if( Y.Lang.isUndefined( min ) && Y.Lang.isUndefined( max ) ) {
                            value = 0;
                        } else
                        // only max
                        if( Y.Lang.isUndefined( min ) && !Y.Lang.isUndefined( max ) ) {
                            if( Y.Lang.isUndefined( increment ) ) {
                                value = max;
                            } else {
                                value = max - increment;
                            }
                        } else
                        // only min
                        if( !Y.Lang.isUndefined( min ) && Y.Lang.isUndefined( max ) ) {
                            if( Y.Lang.isUndefined( increment ) ) {
                                value = min;
                            } else {
                                value = min + increment;
                            }
                        }
                        // min / max … use value in middle of
                        else {
                            average = max - ((max - min) / 2);
                            if( Y.Lang.isUndefined( increment ) ) {
                                value = average;
                            } else {
                                value = average - (average % increment);
                            }
                        }
                    }

                    // if there's a modifier modify the current value
                    if( hasModifyBy ) {
                        value += modifyBy;
                    }

                    // handle min / max
                    if( !preventNotice ) {
                        if( (!Y.Lang.isUndefined( min ) && value < min) || (!Y.Lang.isUndefined( max ) && value > max) ) {
                            Y.doccirrus.DCWindow.notice( {
                                message: Y.Lang.sub( OPHTHALMOLOGY.MESSAGE_OUT_OF_RANGE, {
                                    PATH: fieldName,
                                    VALUE: value.toFixed( toFixed ),
                                    min: min,
                                    max: max
                                } )
                            } );
                            // fall through invalid values are allowed
                        }
                    }

                    // set value(s)
                    observable( parseFloat( value.toFixed( toFixed ) ) );
                },
                /**
                 * sets data for an Ophthalmology activity
                 * @param {Object} data
                 */
                setOphthalmologyData: function( data ) {
                    var
                        self = this;

                    if( Y.Lang.isObject( data ) ) {
                        Y.each( data, function( value, key ) {
                            var
                                fieldConfiguration = self.getOphthalmologyFieldConfiguration( key );

                            if( Y.Lang.isObject( fieldConfiguration ) ) {
                                if( !ko.utils.peekObservable( self[key].readOnly ) ) {
                                    self.setOphthalmologyNumberValue( {
                                        fieldName: key,
                                        value: value,
                                        preventNotice: true
                                    } );
                                }
                            } else if( ko.isWriteableObservable( self[key] ) ) {
                                if( !ko.utils.peekObservable( self[key].readOnly ) ) {
                                    self[key]( value );
                                }
                            } else if( !ko.isObservable( self[key] ) ) {
                                self[key] = value;
                            }
                        }, self );
                    }

                },
                /**
                 * handles key Event for fieldName
                 * @param {Object} config bound fieldName configuration
                 * @param {String} config.fieldName
                 * @param {[]String} [config.forFieldNames]
                 * @param {Object} model current model
                 * @param {Event} $event
                 * @return {boolean}
                 */
                handleOphthalmologyKey: function( config, model, $event ) {
                    config = config || {};
                    var
                        self = this,
                        fieldName = config.fieldName,
                        forFieldNames = config.forFieldNames,
                        increment = config.increment,
                        invert = 1,
                        eventKey = self.translateKeyCodeToKeyboardEventKey( $event.which ),
                        takeover = false,
                        modifyBy,
                        validKeys = self.get( 'validKeys' ),
                        invertKeys = self.get( 'invertKeys' ),
                        takeoverKeys = self.get( 'takeoverKeys' );

                    // reject processing for not relevant keys
                    if( validKeys.indexOf( eventKey ) === -1 ) {
                        return true;
                    }

                    // increment / decrement
                    if( invertKeys.indexOf( eventKey ) > -1 ) {
                        invert = -1;
                    }

                    // takeover
                    if( takeoverKeys.indexOf( eventKey ) > -1 ) {
                        takeover = true;
                    }

                    // modifier to use
                    modifyBy = increment * invert;

                    // process
                    self.setOphthalmologyNumberValue( {
                        fieldName: fieldName,
                        modifyBy: modifyBy
                    } );
                    if( takeover && forFieldNames ) {
                        Y.each( forFieldNames, function( forFieldName ) {
                            self.setOphthalmologyNumberValue( {
                                fieldName: forFieldName,
                                modifyBy: modifyBy
                            } );
                        } );
                    }

                    return true;
                },

                /**
                 * get DeviceReader instance
                 * @return {CardReader}
                 */
                getDeviceReader: function() {
                    var
                        self = this;
                    if( self.getDeviceReader.instance ) {
                        return self.getDeviceReader.instance;
                    }
                    self.getDeviceReader.instance = Y.doccirrus.DeviceReader.createInstance();
                    return self.getDeviceReader.instance;
                },

                /**
                 * sets current date to this field, if it is empty
                 * @param {Object} model current model
                 * @param {Event} $event
                 */
                handleOphthalmologyFocusDate: function( model, event ) {
                    var
                        nameFrom = event.target.name.split( '_' )[0],
                        field = model[nameFrom];

                    if( ko.isObservable( field ) && !field.peek() ) {
                        field( moment().toISOString() );
                    }

                }
            },
            {
                NAME: 'OphthalmologyEditorModel'
            }
        );
        KoViewModel.registerConstructor( OphthalmologyEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'DeviceReader',
            'activity-schema',
            'dc-comctl'
        ]
    }
)
;
