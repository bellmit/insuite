/*jslint anon:true, sloppy:true, nomen:true, -W030*/
/* global YUI, ko */

'use strict';

YUI.add( 'KoSchemaValue', function( Y/*, NAME*/ ) {

    Y.namespace( 'doccirrus.KoUI' );

    var
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoField = KoComponentManager.registeredComponent( 'KoField' ),
        i18n = Y.doccirrus.i18n;

    function KoSchemaValue() {
        KoSchemaValue.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoSchemaValue,
        extends: KoField,
        descriptors: {

            fieldType: '',
            widgetValueSubscription: null,
            valueSubscription: null,
            componentType: 'KoSchemaValue',

            setWidgetValueValid: function() {
                var gtRequired, ltRequired, gtValid, ltValid;

                if( this.valueWidget().widget ) {
                    this.isValid( !this.valueWidget().widget._value.hasError() );
                } else if( this.valueWidget().regexWidget ) {
                    this.isValid( !this.valueWidget().regexWidget._value.hasError() );
                    if( this.isValid() ) {
                        this.isValid( !this.valueWidget().optionsWidget._value.hasError() );
                    }
                } else if( this.valueWidget().greaterThanValueWidget && this.valueWidget().lessThanValueWidget ) {
                    gtRequired = this.valueWidget().greaterThanValueWidget.required && this.valueWidget().greaterThanValueWidget.required();
                    ltRequired = this.valueWidget().lessThanValueWidget.required && this.valueWidget().lessThanValueWidget.required();

                    gtValid = 'function' === typeof ( gtRequired ) && gtRequired();
                    ltValid = 'function' === typeof ( ltRequired ) && ltRequired();

                    this.isValid( !( gtValid || ltValid ) );

                }
            },

            init: function() {

                var
                    self = this;

                self.regexpInfoI18n = i18n( "KoSchema.widget.regexp.info" );
                self.regexpOptionsI18n = i18n( "KoSchema.widget.regexp.options" );
                self.tableValueTextI18n = i18n( "InSight2Mojit.table.VALUE" );
                self.tableOptionsTextI18n = i18n( "InSight2Mojit.table.OPTIONS" );
                self.tableValuesTextI18n = i18n( "InSight2Mojit.table.VALUES" );


                KoSchemaValue.superclass.init.apply( self, arguments );

                self.valueWidget = ko.observable( null );

                if( self.initialConfig.fieldType ) {
                    self.setValueWidget( Y.doccirrus.KoSchemaValueWidget.getByOperator( {
                        operator: self.currentOperator || '$eq',
                        path: self.currentField || '',
                        schemaEntry: {
                            list: self.initialConfig.list,
                            type: self.initialConfig.fieldType
                        },
                        type: ko.observable( self.initialConfig.fieldType ),
                        value: ko.observable( '' ),
                        required: self.required,
                        isOnForm: self.isOnForm,
                        useIsoDate: self.useIsoDate,
                        preventUtcOffsetAdjust: self.preventUtcOffsetAdjust,
                        placeholder: self.placeholder,
                        isSelectMultiple: self.isSelectMultiple,
                        autoCompleteDateRange: self.autoCompleteDateRange,
                        minDate: self.minDate,
                        maxDate: self.maxDate,
                        buttons: self.buttons
                    } ) );
                }

                self.textSearchType = ko.observable( 'all' );
                self.isFilterInverted = ko.observable( false );

            },

            setValueWidget: function( valueWidget ) {
                var
                    self = this,
                    vw;

                if( !valueWidget ) {
                    Y.log( 'could not find valueWidget', 'warn' );
                } else {

                    vw = self.valueWidget();

                    if( self.widgetValueSubscription ) {
                        self.widgetValueSubscription.dispose();
                    }

                    if( self.valueSubscription ) {
                        self.valueSubscription.dispose();
                    }

                    if( vw && 'function' === typeof vw.dispose ) {
                        vw.dispose();
                    }

                    self.valueWidget( valueWidget );
                    self.setWidgetValueValid();

                    self.widgetValueSubscription = self.valueWidget().value.subscribe( function( val ) {
                        self.value( val );
                        self.setWidgetValueValid();
                    } );

                    self.valueSubscription = self.value.subscribe( function( val ) {
                        var gtRequired, ltRequired, gtValid, ltValid;

                        if( self.valueWidget() && val !== self.valueWidget().value() && self.valueWidget() !== self.valueWidget().widget ) {
                            if( self.valueWidget().widget && self.valueWidget().widget._value && val !== self.valueWidget().widget._value()) {
                                self.valueWidget().widget._value( val );
                                self.isValid( !self.valueWidget().widget._value.hasError() );
                            }
                        }

                        if( self.valueWidget() && val === self.valueWidget().value() ) {
                            if( self.valueWidget().greaterThanValueWidget && self.valueWidget().lessThanValueWidget ) {
                                //check compare widget
                                gtRequired = self.valueWidget().greaterThanValueWidget.required && self.valueWidget().greaterThanValueWidget.required();
                                ltRequired = self.valueWidget().lessThanValueWidget.required && self.valueWidget().lessThanValueWidget.required();

                                gtValid = 'function' === typeof ( gtRequired ) && gtRequired();
                                ltValid = 'function' === typeof ( ltRequired ) && ltRequired();

                                self.isValid( !( gtValid || ltValid ) );
                            }
                        }

                    } );
                }
            },

            setValueWidgetByCriterion: function( actType, criterion ) {
                this.setValueWidget( Y.doccirrus.KoSchemaValueWidget.getByCriterion( actType, criterion ) );
            },

            setValueWidgetByCriterionOnly: function( criterion ) {

                var
                    self = this;

                self.setValueWidget( Y.doccirrus.KoSchemaValueWidget.getByOperator( Y.mix( criterion, {
                    value: self.value,
                    required: self.required,
                    isOnForm: self.isOnForm,
                    useIsoDate: self.useIsoDate,
                    isSelectMultiple: self.isSelectMultiple,
                    autoCompleteDateRange: self.autoCompleteDateRange,
                    maxDate: self.maxDate,
                    buttons: self.buttons
                } ) ) );
            },

            dispose: function() {
                var
                    self = this,
                    valueWidget = ko.unwrap( self.valueWidget );

                if( valueWidget ) {
                    valueWidget.dispose();
                }

                if( self.widgetValueSubscription ) {
                    self.widgetValueSubscription.dispose();
                }

                KoSchemaValue.superclass.dispose.apply( self, arguments );
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoSchemaValue' ) );
            },

            showLabel: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },

            isOnForm: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },

            required: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },

            useIsoDate: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },

            placeholder: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },

            isValid: function( key ) {
                return this._handleLazyConfig( key, ko.observable( true ) );
            },

            isSelectMultiple: function( key ) {
                return this._handleLazyConfig( key, ko.observable( false ) );
            },

            autoCompleteDateRange: function( key ) {
                return this._handleLazyConfig( key, ko.observable( false ) );
            },
            maxDate: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            },
            buttons: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observableArray( [] ) );
            }

        }
    } );

    KoComponentManager.registerComponent( KoSchemaValue );

}, '3.16.0', {
    requires: [
        'oop',
        'KoUI',
        'KoUI-utils-Function',
        'KoComponentManager',
        'KoComponent',
        'KoSchemaValueWidget',
        'KoField'
    ]
} );