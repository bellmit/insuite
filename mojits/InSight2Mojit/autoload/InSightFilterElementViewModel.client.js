/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, jQuery */

'use strict';

YUI.add( 'InSightFilterElementViewModel', function( Y, NAME ) {

    var KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        inCaseSchemaFull = Y.dcforms.reducedschema.loadSync( 'InCase_T' ),
        inCaseSchema = prepareInCaseSchema( inCaseSchemaFull ),
        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager;

    /**
     * @constructor
     * @class InSightFilterElementViewModel
     * @extends KoViewModel.getDisposable
     */
    function InSightFilterElementViewModel() {
        InSightFilterElementViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSightFilterElementViewModel, KoViewModel.getDisposable(), {
        templateName: 'InSightFilterElementViewModel',

        /**
         *
         * @param {Object} data configuration object
         * @protected
         *
         * */
        initializer: function( data ) {
            var self = this;

            self.initTemplate();
            self.initInSightFilterElementViewModel( data );
            self.tableFieldTextI18n = i18n( 'InSight2Mojit.table.FIELD' );
            self.tableOperatorTextI18n = i18n( 'InSight2Mojit.table.OPERATOR' );
        },

        /** @protected */
        destructor: function() {
        },

        initInSightFilterElementViewModel: function( data ) {
            var self = this;

            self.cols = data.cols;
            self.currentField = ko.observable( data.field );
            self.defaultOperator = data.operator;

            self.type = self.addDisposable( ko.computed( function() {
                var currentField = self.currentField(),
                    fieldSchema = inCaseSchema[currentField];

                if (self.availableOperators && currentField) {
                    self.currentOperator( self.defaultOperator || ko.unwrap(self.availableOperators)[0].val);
                    self.koSchemaValue.value('');
                }

                if( currentField && fieldSchema && fieldSchema.type ) {

                    return fieldSchema.type;
                } else {
                    return null;
                }
            } ) );

            self.addDisposable( self.type.subscribe( function() {

                var fieldSchema = ko.unwrap( self.currentField ),
                    list = ( fieldSchema && inCaseSchema[fieldSchema] ) ? inCaseSchema[fieldSchema].list : null;

                self.koSchemaValue.setValueWidgetByCriterionOnly( {
                    operator: self.currentOperator,
                    path: self.currentField,
                    type: self.type,
                    schemaEntry: {
                        list: list,
                        type: ko.unwrap( self.type )
                    }
                } );
            } ) );

            self.currentOperator = ko.observable( data.operator );

            self.between = ko.observable( data.between );
            self.select2Config = new ColSelectorModel( this.cols, self.currentField );

            self.allOperators = self.availableOperators = Y.doccirrus.KoSchemaOperatorWidget.getVisibleOperatorList();

            self.availableBetween = [
                { label: 'and', value: "$and" },
                { label: 'or', value: "$or" }
            ];

            self.koSchemaValue = KoComponentManager.createComponent( {
                componentType: 'KoSchemaValue',
                componentConfig: {
                    value: ko.observable( data.value )
                }
            } );

            var
                fieldSchema,
                list;

            if( ko.unwrap( self.currentOperator ) ) {

                fieldSchema = ko.unwrap( self.currentField );
                list = ( fieldSchema && inCaseSchema[fieldSchema] ) ? inCaseSchema[fieldSchema].list : null;

                self.koSchemaValue.setValueWidgetByCriterionOnly( {
                    operator: self.currentOperator,
                    path: self.currentField,
                    type: self.type,
                    schemaEntry: {
                        list: list,
                        type: ko.unwrap( self.type )
                    }
                } );
            }

            self.addDisposable( self.currentOperator.subscribe( function() {
                    var fieldSchema = ko.unwrap( self.currentField ),
                        list = ( fieldSchema && inCaseSchema[fieldSchema] ) ? inCaseSchema[fieldSchema].list : null;

                    self.koSchemaValue.setValueWidgetByCriterionOnly( {
                        operator: self.currentOperator,
                        path: self.currentField,
                        type: self.type,
                        schemaEntry: {
                            list: list,
                            type: ko.unwrap( self.type )
                        }
                    } );
                } )
            );

            self.availableOperators = ko.computed( function() {

                var currentField = self.currentField(),
                    fieldSchema = inCaseSchema[currentField],
                    res = self.allOperators,
                    type,
                    operatorsForType;

                if( currentField && fieldSchema ) {

                    if ( fieldSchema.type && 'string' === typeof fieldSchema.type ) {
                        type = fieldSchema.type.toLowerCase();
                    } else {
                        Y.log( 'Cannot get available operators for: ' + JSON.stringify( fieldSchema.type ), 'warn', NAME );
                        type = 'string';
                    }

                    operatorsForType = Y.doccirrus.KoSchemaOperatorWidget.getOperatorForType( type );

                    res = operatorsForType || res;
                }

                return res;
            } );

            validate( this, {
                _currentValue: function( val ) {
                    var res = '',
                        type = self.type();

                    if( type ) {
                        switch( type ) {
                            case 'String':
                                res = val && 'string' === typeof val ? true : 'Bitte geben Sie hier nur Text ein!';
                                break;
                            case 'Number':
                                res = Y.doccirrus.validations.common._validNumber( val ) ? true : 'Bitte geben Sie hier nur Zahlen ein!';
                                break;
                            case 'Integer':
                                res = Y.doccirrus.validations.common._num( val ) ? true : 'Bitte geben Sie hier nur Ganzzahlen ein!';
                                break;
                            case 'RegExOptions':
                                res = validateRegexOptions( val ) ? true : 'Bitte geben Sie hier nur Optionen für Reguläre Ausdrücke ein (i)!';
                                break;
                        }
                    } else {
                        res = true;
                    }

                    return res;
                }
            } );

        },

        /**
         * Defines template object
         * @property template
         * @type {Object}
         */
        template: null,
        /** @protected */
        initTemplate: function() {
            var
                self = this;

            self.template = {
                name: self.get( 'templateName' ),
                data: self
            };
        }

    }, {
        NAME: 'InSightFilterElementViewModel',
        ATTRS: {
            /**
             * Defines template name to look up
             * @attribute templateName
             * @type {String}
             * @default prototype.templateName
             */
            templateName: {
                valueFn: function() {
                    return this.templateName;
                }
            },
            /**
             * DCBinder
             * @attribute binder
             * @type {doccirrus.DCBinder}
             * @default InCaseMojitBinder
             */
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InSight2Mojit' );
                }
            }
        }
    } );

    function ColSelectorModel( data, val ) {
        var
            self = this,
            previousVal;

        self.select2SearchConfig = {
            select2: {
                width: '100%',
                placeholder: i18n( 'CalendarMojit.calendar.placeholder.SEARCH' ),
                minimumInputLength: 0,
                data: data
            },
            init: function ColSelectorModel_select2SearchConfig_init( element ) {
                jQuery( element ).on( 'select2-selected', function ColSelectorModel_select2SearchConfig_init_selected( $event ) {
                    self.onSelected( $event.val );
                } );
                if( val ) {
                    previousVal = val();
                    if( previousVal ) {
                        jQuery( element ).data( 'select2' ).val( previousVal );
                    }
                }
            }
        };

        self.onSelected = function( choice ) {
            val( choice );
        };
    }

    function validate( context, config ) {

        var refKeys = [],
            validationsKeys = [],
            allKeys;

        Object.keys( config ).forEach( function( key ) {
            var val = config[key];

            if( ko.isObservable( context[key] ) ) {

                if( 'function' === typeof val ) {
                    validationsKeys.push( key );
                    context[key].validate = val;
                    context[key].hasError = ko.observable( false );
                    context[key].validationMessages = ko.observableArray();
                } else {
                    refKeys.push( key );
                }
            }

        } );

        allKeys = refKeys.concat( validationsKeys );

        context.isValid = ko.computed( function() {
            var result, currentVal, isValid = true;
            allKeys.forEach( function( key ) {
                var invalid = false;
                if( ko.isObservable( context[key] ) ) {
                    currentVal = context[key]();
                    if( 'function' === typeof context[key].validate ) {
                        result = context[key].validate.call( context, currentVal );
                        invalid = 'string' === typeof result || false === result;
                        if( isValid && invalid ) {
                            isValid = false;
                        }
                        context[key].hasError( invalid );
                        context[key].validationMessages( 'string' === typeof result ? [result] : [] );
                    }
                }
            } );
            return isValid;
        } );
    }

    function validateRegexOptions( val ) {
        var validOptions = ['i'],
            found = [];
        if( 'string' === typeof val && val.length ) {
            return val.split( '' ).every( function( letter ) {
                if( -1 !== validOptions.indexOf( letter ) && -1 === found.indexOf( letter ) ) {
                    found.push( letter );
                    return true;
                }
            } );
        }
        return false;
    }

    function prepareInCaseSchema( schema ) {
        var
            res = {},
            key,
            currentField;

        for( key in schema ) {
            if( schema.hasOwnProperty( key ) ) {
                currentField = schema[key];
                if( currentField.insight2 ) {
                    res[key] = currentField;
                }
            }
        }

        return res;
    }

    KoViewModel.registerConstructor( InSightFilterElementViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'dcforms-schema-InCase-T',
        'dcforms-schema-InSuite-T',
        'KoSchemaValue',
        'KoSchemaOperatorWidget'
    ]
} );
