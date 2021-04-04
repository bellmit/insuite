/**
 * User: do
 * Date: 29/01/16  13:59
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, _, $ */
'use strict';

YUI.add( 'KoSchemaValueWidget', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
            widgetManager = new WidgetManager(),
            moment = Y.doccirrus.commonutils.getMoment(),
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap;

        function filterEmptyEnums( entry ) {
            return entry.val !== null || entry.val !== undefined || entry.val !== '';
        }

        function mapEnums( entry ) {
            return { id: entry.val, text: entry.i18n };
        }

        function toNumber( val ) {
            var defaultVal = '',
                num = '' === val ? defaultVal : +val;
            return 'number' === typeof num && !isNaN( num ) ? num : defaultVal;
        }

        function findInEnumList( list, id ) {
            return list.some( function( entry ) {
                return entry.id === id;
            } );
        }

        function validateRegexOptions( val ) {
            var validOptions = ['i', 's', 'g', 'm'],
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

        function ValueWidget() {
            var self = this,
                validate = Y.doccirrus.ruleutils.validate;

            this.isSelectMultiple = ko.observable( false );
            this.placeholder = ko.observable( '' );
            this.required = ko.observable( true ); // raw value
            this.useIsoDate = ko.observable( '' );
            this.preventUtcOffsetAdjust = ko.observable( false );
            this.value = ko.observable(); // casted value
            this.__value = ko.observable(); // raw value
            this.valueUpdate = ko.observable();
            this.schemaEntry = ko.observable();
            this._value = ko.computed( {
                read: function() {
                    var
                        val = self.__value();

                    if( val instanceof Date ) {
                        return val.toISOString();
                    }

                    return val;
                },
                write: function( val ) {
                    var type = self.type(),
                        newVal = val,
                        dateMoment, offset;

                    self.__value( val );

                    if( !unwrap( self.isSelectMultiple ) ) {
                        switch( type ) {
                            case 'String':
                                newVal = 'object' === typeof val ? '' : String( val );
                                break;
                            case 'Number':
                                newVal = 'object' === typeof val ? 0 : toNumber( val );
                                break;
                            case 'Integer':
                                newVal = 'object' === typeof val ? 0 : toNumber( val );
                                newVal = newVal.floor ? newVal.floor() : newVal;
                                break;
                            case 'DateTime':
                            case 'Date':
                                if( val ) {
                                    if( unwrap( self.useIsoDate ) || '' === unwrap( self.useIsoDate ) && self.isOnForm() ) {
                                        dateMoment = moment( val );

                                        if ( !unwrap( self.preventUtcOffsetAdjust ) ) {
                                            offset = dateMoment.utcOffset();

                                            dateMoment.startOf( 'day' );
                                            dateMoment.add( offset, 'm' );
                                        }

                                        newVal = dateMoment.toISOString();
                                    }
                                    else {

                                        if ( val.length === TIMESTAMP_FORMAT.length ) {
                                            newVal = moment( val, TIMESTAMP_FORMAT );
                                        } else {
                                            newVal = moment( val );
                                        }

                                        if( !newVal.isValid() ) {
                                            newVal = moment( val, TIMESTAMP_FORMAT );
                                        }
                                        newVal = newVal.format( TIMESTAMP_FORMAT );
                                    }
                                }
                                break;
                            case 'Boolean':
                                if( val !== '' ) {
                                    newVal = 'true' === val;
                                } else {
                                    newVal = '';
                                }
                                break;
                            case 'ISODate':
                                newVal = val;
                                break;
                            case 'DateRange':
                            case 'DateRangeTime':
                                newVal = val;
                                break;
                            default:
                                newVal = val;
                        }
                    }

                    self.value( newVal );
                }
            } );
            this.template = 'ValueWidget';
            this.isEnum = ko.observable( false );
            this.isDate = ko.observable( false );
            this.isOnForm = ko.observable( true );
            this.type = ko.observable( null );
            this.specialFieldsValidators = ko.observableArray( [] );

            this.enumList = [];

            validate( this, {
                _value: function( val ) {
                    var type = self.type(),
                        required = self.required(),
                        schemaEntry = self.schemaEntry(),
                        schemaValidate,
                        strVal,
                        result;

                    if( 'function' === typeof required ) {
                        required = required();
                    }

                    if( !val && !required ) {
                        return true;
                    }

                    if( schemaEntry && schemaEntry['rule-engine'] && schemaEntry['rule-engine'].useValidator ) {
                        schemaValidate = schemaEntry && schemaEntry.validate && schemaEntry.validate[0];

                        if( 'function' === typeof schemaValidate.validator ) {
                            return schemaValidate.validator( val || '' ) ? true : schemaValidate.msg || 'ein Fehler';
                        }
                    }

                    if( self.specialFieldsValidators.indexOf( 'areTreatmentDiagnosesBillable' ) > -1 ) {
                        strVal = (val || '') + '';
                        return ( '0' === strVal || '1' === strVal ) ? true : 'Bitte geben Sie entweder 0 (nicht abrechenbar) order 1 (abrechenbar) ein!';
                    }

                    if( self.specialFieldsValidators.indexOf( 'billingFactorValue' ) > -1 ) {
                        return Y.doccirrus.validations.common._validNumber( val ) ? true : 'Bitte geben Sie hier nur Zahlen ein! z.B. 2.3';
                    }

                    if( Array.isArray( val ) ) {
                        result = true;
                        val.forEach( function( value ) {
                            result = checkValue( type, value );
                            if( !result ) {
                                return;
                            }
                        } );
                        return result;

                    } else {
                        return checkValue( type, val );
                    }

                    function checkValue( type, value ) {
                        switch( type ) {
                            case 'String':
                                return value && 'string' === typeof value ? true : i18n('general.notification.ONLY_TEXT');
                            case 'Number':
                                return Y.doccirrus.validations.common._validNumber( value ) ? true : 'Bitte geben Sie hier nur Zahlen ein!';
                            case 'Integer':
                                return Y.doccirrus.validations.common._num( value ) ? true : 'Bitte geben Sie hier nur Ganzzahlen ein!';
                            case 'RegExOptions':
                                return validateRegexOptions( value ) ? true : 'Bitte geben Sie hier nur Optionen für Reguläre Ausdrücke ein (i)!';
                        }
                        return true;
                    }
                }
            } );

        }

        ValueWidget.prototype.dispose = function() {
            this._value.dispose();
        };

        ValueWidget.prototype.init = function( config ) {
            var val = config.value,
                type = config && config.type || config.schemaEntry && config.schemaEntry.type || 'String',
                simpleType = (config && config.schemaEntry && config.schemaEntry['rule-engine'] && config.schemaEntry['rule-engine'].simpleType ) || false,
                self = this;

            if( 'Boolean' === type && !config.schemaEntry.list ) {
                config.schemaEntry.list = [
                    {
                        'val': '',
                        'i18n': ( simpleType ) ? '' : '<span>&nbsp;</span>'
                    },
                    {
                        'val': true,
                        'i18n': ( simpleType ) ? 'Ja' : '<span><i class="fa fa-check-square-o"></i></span>'
                    },
                    {
                        'val': false,
                        'i18n': ( simpleType ) ? 'Nein' : '<span><i class="fa fa-square-o"></i></span>'
                    }
                ];
            }

            var isEnum = Boolean( config && config.schemaEntry && config.schemaEntry.list ) || peek( config.isSelectMultiple ),
                isRequired = ('boolean' === typeof peek( config.required ) ||
                              'function' === typeof peek( config.required )) ? peek( config.required ) : true,
                enumList;

            if( config.attrEntry && config.attrEntry.path ) {
                this.specialFieldsValidators.push( config.attrEntry.path );
            }

            this.isSelectMultiple( peek( config.isSelectMultiple ) );

            this.required( isRequired );

            this.placeholder( peek( config.placeholder ) || i18n('general.placeholder.EXPRESSION') );

            this.isOnForm( 'undefined' === typeof peek( config.isOnForm ) ? true : peek( config.isOnForm ) );
            this.useIsoDate( peek( config.useIsoDate ) );
            this.preventUtcOffsetAdjust( config.preventUtcOffsetAdjust || false );
            this.valueUpdate( peek( this.isOnForm ) ? 'afterkeydown' : '' );
            this.schemaEntry( peek( config.schemaEntry ) );

            if( isEnum ) {

                if( !config.schemaEntry.list ) {
                    config.schemaEntry.list = [];
                }

                enumList = config.schemaEntry.list.filter( filterEmptyEnums ).map( mapEnums );

                enumList = enumList.filter( function( item ) {
                    if( '' === item.id ) {
                        self.placeholder = item.text;
                        return false;
                    }
                    return true;
                } );

                this.enumList.length = 0;
                Array.prototype.push.apply( this.enumList, enumList );
                if( this.isOnForm() && ( val === undefined || !findInEnumList( enumList, val )) ) {
                    val = this.enumList[0] && this.enumList[0].id;
                }
                if( 'Boolean' === type && 'boolean' === typeof val ) {
                    // cast Boolean to String
                    val = val !== undefined ? val.toString() : null;
                }
            }

            if( 'string' !== typeof val && 'number' !== typeof val && 'boolean' !== typeof val ) {
                val = '';
            }

            this.type( type );
            this.isEnum( isEnum );
            this._value( val );

            var
                ownType = self.type(),
                isBoolean = ( ( 'string' === typeof ownType ) && ( 'boolean' === ownType.toLowerCase() ) ),
                select2Config = {
                    placeholder: ko.unwrap( self.placeholder ) || ' ',
                    allowClear: !ko.unwrap( self.required ),
                    multiple: unwrap( self.isSelectMultiple ),
                    data: this.enumList,
                    minimumResultsForSearch: isBoolean ? -1 : 20,
                    escapeMarkup: function( m ) {
                        return m;
                    }
                };

            if( unwrap( self.isSelectMultiple ) ) {
                select2Config.createSearchChoice = function( term ) {
                    return {
                        id: term,
                        text: term
                    };
                };
                this.enumWidgetAutocomplete = {
                    data: ko.computed( {
                        read: function() {
                            if( !self._value() ) {
                                return null;
                            }
                            return self._value().map( function( item ) {
                                return { id: item, text: item };
                            } );
                        },
                        write: function( $event ) {
                            self._value( $event.val );
                        }
                    } ),
                    select2: select2Config
                };
            } else {
                this.enumWidgetAutocomplete = {
                    val: ko.computed( {
                        read: function() {
                            return self._value();
                        },
                        write: function( $event ) {
                            self._value( $event.val );
                        }
                    } ),
                    select2: select2Config
                };
            }

            this.dateSelectorOptions = {
                format: ( peek( self.type ) === 'DateRangeTime' || peek( self.type ) === 'ISODate' ||  peek( self.type ) === 'DateTime' ) ? 'DD.MM.YYYY HH:mm' : TIMESTAMP_FORMAT,
                sideBySide: true,
                widgetPositioning: {
                    horizontal: 'left',
                    vertical: 'bottom'
                },
                minDate: peek( config.minDate ),
                maxDate: peek( config.maxDate ),
                extraFormats: ['YYYY-MM-DDTHH:mm:ss.SSS[Z]']
            };
            if( peek( config.buttons ) && peek( config.buttons ).length ) {
                this.dateSelectorOptions.buttons = peek( config.buttons );
            }

            if( peek( self.type ) === 'DateRangeTime' ) {
                this.dateRangeSelectorOptions = {
                    format: TIMESTAMP_FORMAT_LONG,
                    time: {
                        enabled: true
                    }
                };
            } else {
                this.dateRangeSelectorOptions = {
                    format: TIMESTAMP_FORMAT,
                    time: {
                        enabled: false
                    },
                    autoCompleteDateRange: peek( config.autoCompleteDateRange )
                };
            }
        };

        function WidgetManager() {
            this.widgets = {};
            this.cache = {};
        }

        WidgetManager.prototype.register = function( name, valueWidget ) {
            if( this.widgets[name] ) {
                Y.log( 'value widget with the name ' + name + ' is already defined', 'warn', NAME );
            } else {
                this.widgets[name] = valueWidget;
            }
        };

        WidgetManager.prototype.get = function( name, criterion, chache ) {
            if( !this.widgets[name] ) {
                Y.log( 'could not find requested value widget with the name ' + name, 'warn', NAME );
                return;
            }

            if( !this.cache[name] || !chache ) {
                this.cache[name] = this.widgets[name]( criterion );
            }
            return this.cache[name];
        };

        widgetManager.register( 'Equation', function() {

            function EquationWidget() {
                var self = this;
                this.widget = new ValueWidget();
                this.template = ko.observable( 'EquationWidget' );
                this.currentCriterion = ko.observable();

                this.value = ko.computed( function() {
                    return ko.unwrap( self.widget.value );
                } );

                this.valueSubscription = this.widget.value.subscribe( function( val ) {
                    var currentCriterion = self.currentCriterion();
                    if( currentCriterion ) {
                        currentCriterion.value( val );
                    }
                } );
            }

            EquationWidget.prototype.dispose = function() {
                this.value.dispose();
                this.valueSubscription.dispose();
                this.widget.dispose();
            };

            EquationWidget.prototype.init = function( config ) {
                this.currentCriterion( config.criterion );
                var currentValue = config.criterion.value();
                this.widget.init( {
                    attrEntry: config.attrEntry,
                    schemaEntry: config.schemaEntry,
                    ruleEngineDefinition: config.ruleEngineDefinition,
                    value: currentValue,
                    required: config.required,
                    isOnForm: config.isOnForm,
                    useIsoDate: config.useIsoDate,
                    preventUtcOffsetAdjust: config.preventUtcOffsetAdjust,
                    placeholder: config.placeholder,
                    isSelectMultiple: config.isSelectMultiple,
                    autoCompleteDateRange: config.autoCompleteDateRange,
                    minDate: config.minDate,
                    maxDate: config.maxDate,
                    buttons: config.buttons
                } );

            };

            return new EquationWidget();
        } );

        widgetManager.register( 'EquationDateTypeWidget', function() {

            function EquationDateTypeWidget() {
                var self = this;
                this.widget = new ValueWidget();
                this.template = ko.observable( 'EquationDateTypeWidget' );
                this.currentCriterion = ko.observable();
                this.type = ko.observable();
                this.dateTypeList = [
                    { val: 'days', visible: false, i18n: 'Tag' },
                    { val: 'weeks', visible: false, i18n: 'Woche' },
                    { val: 'months', visible: false, i18n: 'Monat' },
                    { val: 'years', visible: false, i18n: 'Jahr' }
                ];

                this.value = ko.computed( function() {
                    var value = ko.unwrap( self.widget.value ),
                        type = ko.unwrap( self.type ),
                        valueUnit = getValueFromUnit( type, value ),
                        currentCriterion = peek( self.currentCriterion );

                    if( currentCriterion ) {
                        currentCriterion.value( valueUnit );
                    }

                    return valueUnit || value;
                } );

            }

            EquationDateTypeWidget.prototype.dispose = function() {
                this.value.dispose();
                this.widget.dispose();
            };

            EquationDateTypeWidget.prototype.init = function( config ) {
                this.currentCriterion( config.criterion );
                var currentValue = config.criterion.value(),
                    unitsValues = detectUnit( currentValue );

                currentValue = unitsValues && unitsValues.value || currentValue;
                this.type( unitsValues && unitsValues.unit || 'years' );

                this.widget.init( {
                    attrEntry: config.attrEntry,
                    schemaEntry: config.schemaEntry,
                    ruleEngineDefinition: config.ruleEngineDefinition,
                    value: currentValue,
                    required: config.required,
                    isOnForm: config.isOnForm,
                    useIsoDate: config.useIsoDate,
                    preventUtcOffsetAdjust: config.preventUtcOffsetAdjust,
                    placeholder: config.placeholder,
                    isSelectMultiple: config.isSelectMultiple,
                    autoCompleteDateRange: config.autoCompleteDateRange,
                    minDate: config.minDate,
                    maxDate: config.maxDate,
                    buttons: config.buttons
                } );

            };

            return new EquationDateTypeWidget();
        } );

        function getCatalogShortFilter( catalogShorts ) {
            if( !Array.isArray( catalogShorts ) ) {
                return function() {
                    return true;
                };
            }
            return function( entry ) {
                return -1 !== catalogShorts.indexOf( entry.short );
            };
        }

        function catalogCodeMapper( entry ) {
            if( entry.messages && !entry.title ) {
                entry.title = Y.doccirrus.schemas.catalog.getMessageInLanguage( entry.messages, Y.config.lang );
            }

            return { id: entry.seq, text: entry.title, _data: entry };
        }

        function escapeRegExp( str ) {
            return str.replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&" );
        }

        function catalogOPMapper( term, entry ) {
            var op_list = _.get( entry, 'u_extra.begruendungen_liste.ops_liste' ) || [],
                pattern = new RegExp( term, 'i' ),
                withCode = op_list.filter( function( obj ) {
                    return pattern.test( obj.code );
                } );

            if( entry.messages && !entry.title ) {
                entry.title = Y.doccirrus.schemas.catalog.getMessageInLanguage( entry.messages, Y.config.lang );
            }

            entry.title = ( entry.seq ? ' {' + entry.seq + '} ' : '' ) + ( entry.title || '');

            return {id: withCode && withCode[0] && withCode[0].code || '', text: entry.title, _data: entry};
        }

        function fail( response ) {
            var
                errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

            if( errors.length ) {
                Y.Array.invoke( errors, 'display' );
            }
        }

        widgetManager.register( 'Catalog', function() {

            function CatalogWidget() {
                var self = this;
                this.widget = new ValueWidget();
                this.template = ko.observable( 'CatalogWidget' );
                this.currentCriterion = ko.observable();

                this.catalogShort = new ValueWidget();
                this.codeAutocomplete = null;
                this.code = ko.observable( null );

                this.actType = ko.observable();

                this.value = ko.computed( function() {
                    var currentCriterion = self.currentCriterion(),
                        catalogShort = self.catalogShort.value(),
                        code = self.code();

                    if( currentCriterion ) {
                        currentCriterion.value( {
                            $eq: code,
                            $catalogShort: catalogShort
                        } );
                        return currentCriterion.value();
                    } else {
                        return {
                            $eq: '',
                            $catalogShort: ''
                        } ;
                    }
                } );
            }


            CatalogWidget.prototype.init = function( config ) {
                var self = this,
                    currentValue = config.criterion.value() || '',
                    criteria = {},
                    catalogShorts,
                    caseFolderType = config.caseFolderType || [],
                    allowedTreatmentCodes,
                    countries = [];

                caseFolderType.forEach( function ( type ){
                    countries.push( Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[type || 'ANY'] );
                } );
                countries = _.unique( countries );

                this.currentCriterion( config.criterion );

                this.actType( config.actType );
                if( config.actType ) {
                    criteria = { actType: config.actType };
                }

                if( 'TREATMENT' === this.actType() && caseFolderType.length && !_.includes(caseFolderType, 'CASEFOLDER') ) {
                    allowedTreatmentCodes = [];
                    caseFolderType.forEach( function ( type ){
                        countries.forEach( function( country ) {
                            allowedTreatmentCodes = allowedTreatmentCodes.concat(
                                Y.doccirrus.schemas.catalog.getShortNameByInsuranceType( country, type )
                            );
                        } );
                    } );
                    allowedTreatmentCodes = _.unique( allowedTreatmentCodes );
                }

                catalogShorts = Y.doccirrus.catalogmap.getCatalogs( criteria );

                var catalogs = catalogShorts || [];

                //MOJ-12519
                if('DIAGNOSIS' === this.actType()) {
                    catalogs = catalogs.filter(function (entry) {
                        if(!countries.length) {
                            return true;
                        }
                        return countries.includes( entry.country );
                    });
                }

                catalogs = catalogs.filter( getCatalogShortFilter( allowedTreatmentCodes ) ).map( function catalogShortMapper( entry ) {
                    return { val: entry.short, i18n: entry.short };
                } );

                this.catalogShort.init( {
                    value: currentValue && currentValue.$catalogShort || '',
                    schemaEntry: { list: catalogs },
                    type: 'String',
                    required: false
                } );

                this.code( currentValue && currentValue.$eq || currentValue || '' );

                this.codeAutocomplete = {
                    val: ko.computed( {
                        read: function() {
                            return self.code();
                        },
                        write: function( $event ) {
                            self.code( $event.val );
                        }
                    } ),
                    select2: {
                        placeholder: 'Code',
                        allowClear: true,
                        dropdownAutoWidth: true,
                        minimumInputLength: 1,
                        dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                        formatSelection: function format( result ) {
                            return self.catalogShort.value() === 'BIOTRONIK' ? result.text : result.id;
                        },
                        createSearchChoice: function( term ) {
                            return {id: term, text: term};
                        },
                        formatResult: function( result, container, query, escapeMarkup ) {
                            var
                                term = query.term,
                                code = result.id,
                                text = result.text,
                                select2formatCode = [],
                                select2formatText = [],
                                catalogShort = self.catalogShort.value();

                            window.Select2.util.markMatch( code, term, select2formatCode, escapeMarkup );
                            select2formatCode = select2formatCode.join( '' );
                            window.Select2.util.markMatch( text, term, select2formatText, escapeMarkup );
                            select2formatText = select2formatText.join( '' );

                            if('BIOTRONIK' !== catalogShort) {
                                return Y.Lang.sub( [
                                    '<div class="dc-select2-createActivityCodeAutoComplete-formatResult" title="{code}">',
                                    '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-code">{select2formatCode}</span>',
                                    '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-text">({select2formatText})</span>',
                                    '</div>'
                                ].join( '' ), {
                                    code: Y.Escape.html( code ),
                                    select2formatCode: select2formatCode,
                                    select2formatText: select2formatText
                                } );
                            } else {
                                return Y.Lang.sub( [
                                    '<div class="dc-select2-createActivityCodeAutoComplete-formatResult" title="{select2formatText}">',
                                    '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-text">{select2formatText}</span>',
                                    '</div>'
                                ].join( '' ), { select2formatText: select2formatText } );
                            }

                        },
                        formatResultCssClass: function( result ) {
                            var
                                type = 'textform-homecatalog';

                            if( result._data && !result._data.count && 0 !== result._data.count  ) { //catalogEntry
                                type = 'textform-originalcatalog';
                            }

                            return type;
                        },
                        query: function( query ) {
                            var actType = self.actType(),
                                catalogShort = self.catalogShort.value(),
                                catalogs,
                                criteria = {},
                                catalogQuery;

                            if( catalogShort ) {
                                criteria.short = catalogShort;
                            }
                            if( actType ) {
                                criteria.actType = actType;
                            }

                            catalogs = Y.doccirrus.catalogmap.getCatalogs( criteria );
                            catalogQuery = {
                                term: query.term,
                                catalogs: catalogs && catalogs.map( function( catalog ) {
                                    return {
                                        filename: catalog.filename,
                                        short: catalog.short
                                    };
                                } ),
                                locationId: { $exists: true },
                                tags: []
                            };

                            if('BIOTRONIK' === catalogShort){
                                catalogQuery.catalogDate = moment().toISOString();
                                catalogQuery.noCatalogUsage = true;
                            }

                            Y.doccirrus.jsonrpc.api.catalog.catalogCodeSearch( {
                                itemsPerPage: 10,
                                query: catalogQuery,
                                data: {
                                    _includeCatalogText: true
                                }
                            } ).done( function( response ) {
                                var resultData = _.uniq(response.data || [], 'seq');
                                query.callback( { results: resultData.map( catalogCodeMapper ) } );
                            } ).fail( fail );
                        },
                        initSelection: function( element, callback ) {
                            var code = self.code();
                            callback( {id: code, text: code} );
                        }
                    }
                };
            };

            CatalogWidget.prototype.dispose = function() {
                this.value.dispose();
                this.catalogShort.dispose();
                this.widget.dispose();
            };

            return new CatalogWidget();
        } );

        widgetManager.register( 'CatalogShort', function() {

            function CatalogShortWidget() {
                var self = this;
                this.widget = new ValueWidget();
                this.template = ko.observable( 'CatalogShortWidget' );
                this.currentCriterion = ko.observable();

                this.catalogShort = new ValueWidget();
                this.actType = ko.observable();

                this.value = ko.computed( function() {
                    var currentCriterion = self.currentCriterion(),
                        catalogShort = self.catalogShort.value() || '';

                    if( currentCriterion ) {
                        currentCriterion.value( catalogShort );
                    }
                    return catalogShort;
                } );
            }

            CatalogShortWidget.prototype.init = function initCatalogShort( config ) {
                var currentValue = config.criterion.value() || '',
                    criteria = {},
                    catalogShorts,
                    caseFolderType = config.caseFolderType || [],
                    allowedTreatmentCodes,
                    countries = [];

                caseFolderType.forEach( function ( type ){
                    countries.push( Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[type || 'ANY'] );
                } );
                countries = _.unique( countries );

                this.currentCriterion( config.criterion );

                this.actType( config.actType );
                if( config.actType ) {
                    criteria = { actType: config.actType };
                }

                if( 'TREATMENT' === this.actType() && caseFolderType.length && !_.includes(caseFolderType, 'CASEFOLDER') ) {
                    allowedTreatmentCodes = [];
                    caseFolderType.forEach( function ( type ) {
                        countries.forEach( function( country ) {
                            allowedTreatmentCodes = allowedTreatmentCodes.concat(
                                Y.doccirrus.schemas.catalog.getShortNameByInsuranceType( country, type )
                            );
                        } );
                    } );
                    allowedTreatmentCodes = _.unique( allowedTreatmentCodes );
                }

                catalogShorts = Y.doccirrus.catalogmap.getCatalogs( criteria );

                var catalogs = catalogShorts || [];

                //MOJ-12519
                if('DIAGNOSIS' === this.actType()) {
                    catalogs = catalogs.filter(function (entry) {
                        if(!countries.length) {
                            return true;
                        }
                        return countries.includes( entry.country );
                    });
                }

                catalogs = catalogs.filter( getCatalogShortFilter( allowedTreatmentCodes ) ).map( function catalogShortMapper( entry ) {
                    return { val: entry.short, i18n: entry.short };
                } );

                this.catalogShort.init( {
                    value: currentValue || '',
                    schemaEntry: { list: catalogs },
                    type: 'String',
                    required: false
                } );
            };

            CatalogShortWidget.prototype.dispose = function() {
                this.value.dispose();
                this.catalogShort.dispose();
                this.widget.dispose();
            };

            return new CatalogShortWidget();
        } );

        widgetManager.register( 'CatalogCode', function() {

            function CatalogCodeWidget() {
                var self = this;
                this.template = ko.observable( 'CatalogWidgetCode' );
                this.currentCriterion = ko.observable();

                this.codeAutocomplete = null;
                this.code = ko.observable( null );

                this.actType = ko.observable();

                this.value = ko.computed( function() {
                    var currentCriterion = self.currentCriterion(),
                        code = self.code() || '';

                    if( currentCriterion ) {
                        currentCriterion.value( code );
                    }
                    return code;
                } );
            }

            CatalogCodeWidget.prototype.init = function( config ) {
                var self = this,
                    currentValue = config.criterion.value() || '';

                this.actType( config.actType );
                this.currentCriterion( config.criterion );

                this.code( currentValue || '' );

                this.codeAutocomplete = {
                    val: ko.computed( {
                        read: function() {
                            return self.code();
                        },
                        write: function( $event ) {
                            self.code( $event.val );
                        }
                    } ),
                    select2: {
                        placeholder: 'Code',
                        allowClear: true,
                        dropdownAutoWidth: true,
                        minimumInputLength: 1,
                        dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                        createSearchChoice: function( term ) {
                            return {id: term, text: term};
                        },
                        formatResult: function( result, container, query, escapeMarkup ) {
                            var
                                term = query.term,
                                code = result.id,
                                text = result.text,
                                select2formatCode = [],
                                select2formatText = [];

                            window.Select2.util.markMatch( code, term, select2formatCode, escapeMarkup );
                            select2formatCode = select2formatCode.join( '' );
                            window.Select2.util.markMatch( text, term, select2formatText, escapeMarkup );
                            select2formatText = select2formatText.join( '' );

                            return Y.Lang.sub( [
                                '<div class="dc-select2-createActivityCodeAutoComplete-formatResult" title="{code}">',
                                '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-code">{select2formatCode}</span>',
                                '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-text">({select2formatText})</span>',
                                '</div>'
                            ].join( '' ), {
                                code: Y.Escape.html( code ),
                                select2formatCode: select2formatCode,
                                select2formatText: select2formatText
                            } );
                        },

                        formatResultCssClass: function( result ) {
                            var
                                type = 'textform-homecatalog';

                            if( result._data && !result._data.count && 0 !== result._data.count ) { //catalogEntry
                                type = 'textform-originalcatalog';
                            }

                            return type;
                        },
                        query: function( query ) {
                            var actType = self.actType(),
                                catalogs,
                                criteria = {};

                            if( actType ) {
                                criteria.actType = actType;
                            }

                            catalogs = Y.doccirrus.catalogmap.getCatalogs( criteria );

                            Y.doccirrus.jsonrpc.api.catalog.catalogCodeSearch( {
                                itemsPerPage: 10,

                                query: {
                                    catalogs: catalogs && catalogs.map( function( catalog ) {
                                        return {
                                            filename: catalog.filename,
                                            short: catalog.short
                                        };
                                    } ),
                                    term: query.term,
                                    locationId: {$exists: true},
                                    tags: []
                                },
                                data: {
                                    _includeCatalogText: true
                                }
                            } ).done( function( response ) {
                                var resultData = _.uniq( response.data || [], 'seq' );
                                query.callback( {results: resultData.map( catalogCodeMapper )} );
                            } ).fail( fail );
                        },
                        initSelection: function( element, callback ) {
                            var code = self.code();
                            callback( {id: code, text: code} );
                        }
                    }
                };
            };

            CatalogCodeWidget.prototype.dispose = function() {
                this.value.dispose();
            };

            return new CatalogCodeWidget();
        } );

        widgetManager.register( 'CatalogOP', function() {

            function CatalogOPWidget() {
                var
                    self = this,
                    validate = Y.doccirrus.ruleutils.validate,
                    schemaValidate;
                this.template = ko.observable( 'CatalogWidgetCode' );
                this.currentCriterion = ko.observable();

                this.codeAutocomplete = null;
                this.code = ko.observable( null );

                this.actType = ko.observable();
                this.schemaEntry = ko.observable();

                this.value = ko.computed( function() {
                    var currentCriterion = self.currentCriterion(),
                        code = self.code() || '';

                    if( currentCriterion ) {
                        currentCriterion.value( code );
                    }
                    return code;
                } );

                validate( this, {
                    value: function( val ) {
                        var schemaEntry = self.schemaEntry();

                        if( schemaEntry && schemaEntry['rule-engine'] && schemaEntry['rule-engine'].useValidator ) {
                            schemaValidate = schemaEntry && schemaEntry.validate && schemaEntry.validate[0];

                            if( 'function' === typeof schemaValidate.validator ) {
                                return val && schemaValidate.validator( val ) ? true : schemaValidate.msg || 'ein Fehler';
                            }
                        }
                        return true;
                    }
                } );
            }

            CatalogOPWidget.prototype.init = function( config ) {
                var self = this,
                    currentValue = config.criterion.value() || '';

                this.actType( config.actType );
                this.currentCriterion( config.criterion );
                this.schemaEntry( config.schemaEntry );

                this.code( currentValue || '' );

                this.codeAutocomplete = {
                    val: ko.computed( {
                        read: function() {
                            return self.code();
                        },
                        write: function( $event ) {
                            self.code( $event.val );
                        }
                    } ),
                    select2: {
                        placeholder: 'OP Code',
                        allowClear: false,
                        dropdownAutoWidth: true,
                        minimumInputLength: 1,
                        dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                        createSearchChoice: function( term ) {
                            return {id: term, text: term};
                        },
                        formatResult: function( result, container, query, escapeMarkup ) {
                            var
                                term = query.term,
                                code = result.id,
                                text = result.text,
                                select2formatCode = [],
                                select2formatText = [];

                            window.Select2.util.markMatch( code, term, select2formatCode, escapeMarkup );
                            select2formatCode = select2formatCode.join( '' );
                            window.Select2.util.markMatch( text, term, select2formatText, escapeMarkup );
                            select2formatText = select2formatText.join( '' );

                            return Y.Lang.sub( [
                                '<div class="dc-select2-createActivityCodeAutoComplete-formatResult" title="{code}">',
                                '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-code">{select2formatCode}</span>',
                                '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-text">({select2formatText})</span>',
                                '</div>'
                            ].join( '' ), {
                                code: Y.Escape.html( code ),
                                select2formatCode: select2formatCode,
                                select2formatText: select2formatText
                            } );
                        },

                        formatResultCssClass: function( result ) {
                            var
                                type = 'textform-homecatalog';

                            if( result._data && !result._data.count && 0 !== result._data.count ) { //catalogEntry
                                type = 'textform-originalcatalog';
                            }

                            return type;
                        },
                        query: function( query ) {
                            var actType = self.actType(),
                                catalogs,
                                criteria = {},
                                term = escapeRegExp( query.term );

                            if( actType ) {
                                criteria.actType = actType;
                            }

                            catalogs = Y.doccirrus.catalogmap.getCatalogs( criteria ).filter( function( catalog ) {
                                return catalog.short === 'EBM';
                            } );

                            Y.doccirrus.jsonrpc.api.catalog.read( {
                                query: {
                                    'catalog': catalogs[0].filename,
                                    'u_extra.begruendungen_liste.ops_liste': {'$exists': true, $not: {'$size': 0}},
                                    'u_extra.begruendungen_liste.ops_liste.code': {
                                        '$regex': term,
                                        '$options': 'i'
                                    }
                                },
                                options: {
                                    limit: 20
                                }
                            } ).done( function( response ) {
                                var resultData = _.uniq( response.data || [], 'seq' );
                                query.callback( {
                                    results: resultData.map( function( result ) {
                                        return catalogOPMapper( term, result );
                                    } )
                                } );
                            } ).fail( fail );

                        },
                        initSelection: function( element, callback ) {
                            var code = self.code();
                            callback( {id: code, text: code} );
                        }
                    }
                };
            };

            CatalogOPWidget.prototype.dispose = function() {
                this.value.dispose();
            };

            return new CatalogOPWidget();
        } );

        widgetManager.register( 'Marker', function() {

            function MarkerWidget() {
                var
                    self = this,
                    validate = Y.doccirrus.ruleutils.validate;
                this.template = ko.observable( 'MarkerWidget' );
                this.currentCriterion = ko.observable();
                this.widget = this;
                this._value = ko.observable( null );
                this._value.hasError = ko.computed(function() {
                    return !Boolean( self._value() );
                });


                this.schemaEntry = ko.observable();

                this.value = ko.pureComputed( function() {
                    var currentCriterion = self.currentCriterion(),
                        marker = self._value();

                    if( currentCriterion && marker) {
                        currentCriterion.value( marker );
                    }
                    return marker;
                } );

                validate( this, {
                    value: function( val ) {
                        return  Boolean( val );
                    }
                } );
            }

            MarkerWidget.prototype.init = function( config ) {
                var self = this,
                    currentValue = config.criterion.value(),
                    severity = {},
                    data = ko.observableArray();

                this.currentCriterion( config.criterion );
                this.schemaEntry( config.schemaEntry );
                this._value( currentValue );
                data( { results: peek( config.criterion.markers) } );

                Y.doccirrus.jsonrpc.api.severity
                    .read()
                    .then( function( response ) {
                        var
                            results = Y.Lang.isArray( response.data ) && response.data || [],
                            result = {};

                        results.forEach( function( item ) {
                            result[item.severity] = item.color;
                        } );

                        return result;
                    } )
                    .done( function( data ) {
                        severity = data;
                    } );


                function format( selected ) {
                    return '<i class="'+ selected.icon +'" aria-hidden="true" style="color: ' + (severity[selected.severity] || 'black') + '"></i>&nbsp' + selected.text;
                }


                Y.doccirrus.jsonrpc.api.marker
                    .read()
                    .done( function( response ) {
                        if( Array.isArray( response.data ) ) {
                            data( { results: response.data.map( function( marker ) {
                                return {
                                    icon: marker.icon,
                                    id: marker._id,
                                    text: marker.description,
                                    severity: marker.severity
                                };
                            } ) } );

                        }
                    } );

                self.markersAutocomplete = {
                    val: ko.computed( {
                        read: function() {
                            var
                                value = self._value() || null;
                            return value;

                        },
                        write: function( $event ) {
                            var
                                value = $event.val;

                            self._value( value );
                        }
                    } ),
                    select2: {
                        allowClear: false,
                        dropdownAutoWidth: true,
                        data: data,
                        formatResult: format,
                        formatSelection: format
                    }
                };
            };

            MarkerWidget.prototype.dispose = function() {
                this.value.dispose();
            };

            return new MarkerWidget();
        } );

        widgetManager.register( 'Dignity', function() {

            function DignityWidget() {
                var
                    self = this,
                    validate = Y.doccirrus.ruleutils.validate;
                this.template = ko.observable( 'DignityWidget' );
                this.currentCriterion = ko.observable();
                this.widget = this;
                this._value = ko.observable( null );
                this._value.hasError = ko.computed(function() {
                    return !Boolean( self._value() );
                });


                this.schemaEntry = ko.observable();

                this.value = ko.pureComputed( function() {
                    var currentCriterion = self.currentCriterion(),
                        dignity = self._value();

                    if( currentCriterion && dignity) {
                        currentCriterion.value( dignity );
                    }
                    return dignity;
                } );

                validate( this, {
                    value: function( val ) {
                        return  Boolean( val );
                    }
                } );
            }

            DignityWidget.prototype.init = function( config ) {
                var self = this,
                    currentValue = config.value || config.criterion && config.criterion.value() || '',
                    data = ko.observableArray(),
                    type = config.widgetType;

                this.currentCriterion( config.criterion );
                this.schemaEntry( config.schemaEntry );
                this._value( currentValue );


                function format( selected ) {
                    return '('+ selected.id+') '+selected.text;
                }

                Y.doccirrus.jsonrpc.api.catalog.getTarmedDignities({type: type})
                    .done( function( response ) {
                        if( Array.isArray( response.data ) ) {
                            data( { results: response.data.map( function( dignity ) {
                                    return {
                                        id: dignity.code,
                                        text: dignity.text
                                    };
                                } ) } );

                        }
                    } );

                self.DignityAutocomplete = {
                    val: ko.computed( {
                        read: function() {
                            var
                                value = self._value() || null;
                            return value;

                        },
                        write: function( $event ) {
                            var
                                value = $event.val;

                            self._value( value );
                        }
                    } ),
                    select2: {
                        allowClear: false,
                        dropdownAutoWidth: true,
                        data: data,
                        formatResult: format,
                        formatSelection: format
                    }
                };
            };

            DignityWidget.prototype.dispose = function() {
                this.value.dispose();
            };

            return new DignityWidget();
        } );

        widgetManager.register( 'TaskType', function() {

            function TaskTypeWidget() {
                var
                    self = this,
                    validate = Y.doccirrus.ruleutils.validate;
                this.template = ko.observable( 'TaskTypeWidget' );
                this.currentCriterion = ko.observable();
                this.widget = this;
                this._value = ko.observable( null );
                this._valueId = ko.observable( null );
                this._value.hasError = ko.computed(function() {
                    return !Boolean( self._value() );
                });


                this.schemaEntry = ko.observable();

                this.value = ko.pureComputed( function() {
                    var currentCriterion = self.currentCriterion(),
                        type = self._value(),
                        id = self._valueId();

                    if( currentCriterion && id ) {
                        currentCriterion.value( id );
                    }
                    return type;
                } );

                validate( this, {
                    value: function( val ) {
                        return  Boolean( val );
                    }
                } );
            }

            TaskTypeWidget.prototype.init = function( config ) {
                var self = this,
                    currentValue = config.criterion.value(),
                    taskTypes = ko.observableArray();

                this.currentCriterion( config.criterion );
                this.schemaEntry( config.schemaEntry );
                this._value( currentValue );

                self.select2TaskTypeMapper = function( tasktype ) {
                    return {
                        id: tasktype._id,
                        text: tasktype.name,
                        type: tasktype.type
                    };
                };

                Y.doccirrus.jsonrpc.api.tasktype
                    .read()
                    .done( function( response ) {
                        if( Array.isArray( response.data ) ) {
                            taskTypes( response.data.map( function( taskType ) {
                                return self.select2TaskTypeMapper( taskType );
                            } ) );

                        }
                    } );

                self.taskTypeAutocomplete = {
                    data: ko.computed( {
                        read: function() {
                            var
                                value = self._value() || null,
                                currentType =  taskTypes().find( function(taskType){ return taskType.id === value; });
                            return ( currentType && currentType.text ) || value;
                        },
                        write: function( $event ) {
                            var
                                value = $event.added && $event.added.text;
                            self._value( value );
                            self._valueId( $event.val );
                        }
                    } ),
                    select2: {
                        formatResult: function( item ) {
                            return item.text;
                        },
                        formatSelection: function( item ) {
                            return item;
                        },
                        query: function( query ) {
                            Y.doccirrus.jsonrpc.api.tasktype.read( {
                                query: {
                                    name: {
                                        $regex: query.term,
                                        $options: 'i'
                                    },
                                    _id: { $ne: "000000000000000000000001" }
                                },
                                options: {
                                    itemsPerPage: 15
                                },
                                fields: [ 'name' ]
                            } ).done( function( response ) {
                                var
                                    data = response && response.data || [];
                                query.callback( {
                                    results: data.map( function( tasktype ) {
                                        return self.select2TaskTypeMapper( tasktype );
                                    } )
                                } );
                            } );
                        }
                    }
                };
            };

            TaskTypeWidget.prototype.dispose = function() {
                this.value.dispose();
            };

            return new TaskTypeWidget();
        } );

        widgetManager.register( 'Comp', function() {
            function CompWidget() {
                var self = this,
                    compOperatorLists = Y.doccirrus.ruleutils.getComparisonLists();

                this.greaterThanOperator = ko.observable();
                this.lessThanOperator = ko.observable();

                this.greaterThanValueWidget = new ValueWidget();
                this.lessThanValueWidget = new ValueWidget();

                this.greaterThanList = compOperatorLists.greaterThanList;
                this.lessThanList = compOperatorLists.lessThanList;

                this.template = ko.observable( 'CompWidget' );
                this.currentCriterion = ko.observable();

                this.value = ko.computed( function() {
                    var result = {},
                        greaterThanOperator = self.greaterThanOperator(),
                        lessThanOperator = self.lessThanOperator(),
                        greaterThanValue = self.greaterThanValueWidget.value(),
                        lessThanValue = self.lessThanValueWidget.value();

                    if( greaterThanOperator && (0 === greaterThanValue || greaterThanValue) ) {
                        result[greaterThanOperator] = greaterThanValue;
                    }

                    if( lessThanOperator && (0 === lessThanValue || lessThanValue) ) {
                        result[lessThanOperator] = lessThanValue;
                    }

                    return result;
                } );
                this.value.subscribe( function( val ) {
                    var currentCriterion = self.currentCriterion();
                    if( currentCriterion ) {
                        currentCriterion.value( val );
                    }
                } );
            }

            CompWidget.prototype.dispose = function() {
                this.value.dispose();
                this.greaterThanValueWidget.dispose();
                this.lessThanValueWidget.dispose();
            };

            CompWidget.prototype.init = function( config ) {

                this.currentCriterion( config.criterion );
                var self = this,
                    initial$gtOperator, initial$gtValue, initial$ltOperator, initial$ltValue,
                    currentValue = config.criterion.value() || '',
                    val = 'object' === typeof currentValue ? currentValue : {};

                Object.keys( val ).forEach( function( key ) {
                    var entry = val[key];
                    if( -1 !== ['$gte', '$gt'].indexOf( key ) ) {
                        initial$gtOperator = key;
                        initial$gtValue = entry;
                    } else if( -1 !== ['$lte', '$lt'].indexOf( key ) ) {
                        initial$ltOperator = key;
                        initial$ltValue = entry;
                    }
                } );

                function validate() {
                    var gt = self.greaterThanValueWidget.value(),
                        lt = self.lessThanValueWidget.value();
                    return !((0 === gt || gt) || (0 === lt || lt));
                }

                this.greaterThanOperator( initial$gtOperator || '$gt' );
                this.greaterThanValueWidget.init( {
                    attrEntry: config.attrEntry,
                    schemaEntry: config.schemaEntry,
                    ruleEngineDefinition: config.ruleEngineDefinition,
                    value: initial$gtValue,
                    required: validate
                } );

                this.lessThanOperator( initial$ltOperator || '$lt' );
                this.lessThanValueWidget.init( {
                    attrEntry: config.attrEntry,
                    schemaEntry: config.schemaEntry,
                    ruleEngineDefinition: config.ruleEngineDefinition,
                    value: initial$ltValue,
                    required: validate
                } );
            };

            return new CompWidget();
        } );

        function detectUnit( number ){ // reveret to ruleimportuils::getAgeInYears
            if( number && 'object' !== typeof number && !Number.isInteger( number ) ){
                if( !Number.isInteger( number ) && Number.isInteger( parseFloat(( number * 12 ).toFixed(5))) ){
                    return {value: parseFloat(( number * 12 ).toFixed(5)), unit: 'months'};
                }
                if( !Number.isInteger( number ) && Number.isInteger( parseFloat(( number * 365 ).toFixed(5))) ){
                    return {value: parseFloat(( number * 365 ).toFixed(5)), unit: 'days'};
                }
                if( Number.isInteger( parseFloat(( number * 52 ).toFixed(5))) ){
                    return {value: parseFloat(( number * 52 ).toFixed(5)), unit: 'weeks'};
                }
            } else {
                return {value: 'object' !== typeof number && number || 0, unit: 'years'};
            }
        }

        function getValueFromUnit( type, value ){
            switch( type ){
                case 'days':
                    value = 1 / 365 * value;
                    break;
                case 'weeks':
                    value = 1 / 52 * value;
                    break;
                case 'months':
                    value = 1 / 12 * value;
                    break;
                case 'years':
            }
            return value;
        }

        widgetManager.register( 'CompDateType', function() {
            function CompDateTypeWidget() {
                var self = this,
                    compOperatorLists = Y.doccirrus.ruleutils.getComparisonLists();

                this.greaterThanOperator = ko.observable();
                this.lessThanOperator = ko.observable();

                this.greaterThanType = ko.observable();
                this.lessThanType = ko.observable();

                this.greaterThanValueWidget = new ValueWidget();
                this.lessThanValueWidget = new ValueWidget();

                this.greaterThanList = compOperatorLists.greaterThanList;
                this.lessThanList = compOperatorLists.lessThanList;
                this.dateTypeList = [
                    { val: 'days', visible: false, i18n: 'Tag' },
                    { val: 'weeks', visible: false, i18n: 'Woche' },
                    { val: 'months', visible: false, i18n: 'Monat' },
                    { val: 'years', visible: false, i18n: 'Jahr' }
                ];

                this.template = ko.observable( 'CompDateTypeWidget' );
                this.currentCriterion = ko.observable();

                this.value = ko.computed( function() {
                    var result = {},
                        greaterThanOperator = self.greaterThanOperator(),
                        lessThanOperator = self.lessThanOperator(),

                        greaterThanType = self.greaterThanType(),
                        lessThanType = self.lessThanType(),

                        greaterThanValue = self.greaterThanValueWidget.value(),
                        lessThanValue = self.lessThanValueWidget.value();

                    if( greaterThanOperator && (0 === greaterThanValue || greaterThanValue) ) {
                        result[greaterThanOperator] = getValueFromUnit( greaterThanType, greaterThanValue );
                    }

                    if( lessThanOperator && (0 === lessThanValue || lessThanValue) ) {
                        result[lessThanOperator] = getValueFromUnit( lessThanType, lessThanValue );
                    }

                    return result;
                } );
                this.value.subscribe( function( val ) {
                    var currentCriterion = self.currentCriterion();
                    if( currentCriterion ) {
                        currentCriterion.value( val );
                    }
                } );
            }

            CompDateTypeWidget.prototype.dispose = function() {
                this.value.dispose();
                this.greaterThanValueWidget.dispose();
                this.lessThanValueWidget.dispose();
            };

            CompDateTypeWidget.prototype.init = function( config ) {

                this.currentCriterion( config.criterion );
                var self = this,
                    initial$gtOperator, initial$gtValue, initial$ltOperator, initial$ltValue,
                    currentValue = config.criterion.value() || '',
                    val = 'object' === typeof currentValue ? currentValue : {};


                Object.keys( val ).forEach( function( key ) {
                    var entry = val[key];
                    if( -1 !== ['$gte', '$gt'].indexOf( key ) ) {
                        initial$gtOperator = key;
                        initial$gtValue = entry;
                    } else if( -1 !== ['$lte', '$lt'].indexOf( key ) ) {
                        initial$ltOperator = key;
                        initial$ltValue = entry;
                    }
                } );

                var gtUnitsValues = detectUnit( initial$gtValue ),
                    ltUnitsValues = detectUnit( initial$ltValue );
                initial$gtValue = gtUnitsValues && gtUnitsValues.value || initial$gtValue;
                initial$ltValue = ltUnitsValues && ltUnitsValues.value || initial$ltValue;

                self.greaterThanType( gtUnitsValues && gtUnitsValues.unit || 'years' );
                self.lessThanType( ltUnitsValues && ltUnitsValues.unit || 'years' );

                function validate() {
                    var gt = self.greaterThanValueWidget.value(),
                        lt = self.lessThanValueWidget.value();
                    return !((0 === gt || gt) || (0 === lt || lt));
                }

                this.greaterThanOperator( initial$gtOperator || '$gt' );
                this.greaterThanValueWidget.init( {
                    attrEntry: config.attrEntry,
                    schemaEntry: config.schemaEntry,
                    ruleEngineDefinition: config.ruleEngineDefinition,
                    value: initial$gtValue,
                    required: validate
                } );

                this.lessThanOperator( initial$ltOperator || '$lt' );
                this.lessThanValueWidget.init( {
                    attrEntry: config.attrEntry,
                    schemaEntry: config.schemaEntry,
                    ruleEngineDefinition: config.ruleEngineDefinition,
                    value: initial$ltValue,
                    required: validate
                } );
            };

            return new CompDateTypeWidget();
        } );

        widgetManager.register( 'Exists', function() {
            function ExistsWidget() {
                var self = this;

                this.template = ko.observable( 'ExistsWidget' );
                this.currentCriterion = ko.observable();
                this.widget = this;
                this.existsList = [{ val: true, i18n: 'existiert' }, { val: false, i18n: 'existiert nicht' }];
                this._value = this.value = ko.observable();
                this._value.hasError = ko.observable( false );
                this.valueSubscription = this.value.subscribe( function( val ) {
                    var currentCriterion = self.currentCriterion();
                    if( currentCriterion ) {
                        currentCriterion.value( 'boolean' === typeof val ? val : true );
                    }
                } );
            }

            ExistsWidget.prototype.init = function( config ) {
                this.currentCriterion( config.criterion );
                var currentValue = config.criterion.value();
                this.value( Boolean( currentValue ) );
            };

            ExistsWidget.prototype.dispose = function() {
                this.valueSubscription.dispose();
            };

            return new ExistsWidget();
        } );

        widgetManager.register( 'RegEx', function() {
            function RegExWidget() {
                var self = this;

                this.template = ko.observable( 'RegExWidget' );
                this.currentCriterion = ko.observable();

                this.regexWidget = new ValueWidget();
                this.optionsWidget = new ValueWidget();

                this.value = ko.computed( function() {
                    var currentCriterion = self.currentCriterion();

                    if( currentCriterion ) {
                        currentCriterion.value( {
                            $regex: self.regexWidget.value(),
                            $options: self.optionsWidget.value()
                        } );
                        return currentCriterion.value();
                    } else {
                        return {
                            $regex: '',
                            $options: ''
                        };
                    }
                } );
            }

            RegExWidget.prototype.init = function( config ) {
                var currentValue = config.criterion.value() || '';

                this.regexWidget.init( {
                    placeholder: 'Ausdruck',
                    value: currentValue && currentValue.$regex || '',
                    type: 'String'
                } );

                this.optionsWidget.init( {
                    placeholder: 'Options',
                    value: currentValue && currentValue.$options || '',
                    type: 'RegExOptions',
                    required: false
                } );

                this.currentCriterion( config.criterion );
                setTimeout( function() {
                    $( '[data-toggle="popover"]' ).popover();
                }, 200 );
            };

            RegExWidget.prototype.dispose = function() {
                this.value.dispose();
                this.regexWidget.dispose();
                this.optionsWidget.dispose();
            };

            return new RegExWidget();
        } );

        widgetManager.register( 'Includes', function() {
            function IncludesWidget() {
                var self = this;

                this.template = ko.observable( 'IncludesWidget' );
                this.currentCriterion = ko.observable();

                this.list = ko.observableArray();

                this.value = ko.computed( function() {
                    var currentCriterion = peek( self.currentCriterion ),
                        list = self.list();

                    if( currentCriterion && !self.disposing ) {
                        currentCriterion.value( list.map( function( widget ) {
                            return widget.value();
                        } ) );
                        return peek( currentCriterion.value );
                    } else {
                        return '';
                    }
                } );
            }

            IncludesWidget.prototype.init = function( config ) {
                var currentValue = config.criterion.value() || '',
                    newList;
                this.currentCriterion( config.criterion );
                this.config = config;
                this.disposing = false;

                // TODOOO destroy old value widgets

                if( Array.isArray( currentValue ) ) {
                    newList = currentValue.map( function( val ) {
                        var widget;
                        if(config.widgetName){
                            widget = widgetManager.get( config.widgetName, null, false );
                            widget.init( {
                                value: val,
                                widgetType: config.widgetType
                            } );
                        } else {
                            widget = new ValueWidget();
                            widget.init( {
                                attrEntry: config.attrEntry,
                                schemaEntry: config.schemaEntry,
                                ruleEngineDefinition: config.ruleEngineDefinition,
                                value: val
                            } );
                        }

                        return widget;
                    } );
                }
                this.list( newList || [] );
            };

            IncludesWidget.prototype.add = function() {
                var config = this.config,
                    widget;

                if(config.widgetName){
                    widget = widgetManager.get( config.widgetName, null, false );
                    widget.init( {
                        value: null,
                        widgetType: config.widgetType
                    } );
                } else {
                    widget = new ValueWidget();
                    widget.init( {
                        attrEntry: config.attrEntry,
                        schemaEntry: config.schemaEntry,
                        ruleEngineDefinition: config.ruleEngineDefinition,
                        value: null
                    } );
                }

                this.list.push( widget );
            };

            IncludesWidget.prototype.remove = function( valueWidget ) {
                this.list.remove( valueWidget );
            };

            IncludesWidget.prototype.dispose = function() {
                //prevent updating criteria on disposing
                this.disposing = true;

                (this.list() || []).forEach( function( widget ){
                    widget.dispose();
                } );
                this.list.removeAll();
                this.value.dispose();
            };

            return new IncludesWidget();
        } );

        function getWidgetName( operator ) {

            var widgetName = '';

            if( -1 !== ['$eq', '$ne', '$eqDate', '$neDate', '$gt', '$lt'].indexOf( operator ) ) {
                widgetName = 'Equation';
            } else if( -1 !== ['$in', '$nin', '$all'].indexOf( operator ) ) {
                widgetName = 'Includes';
            } else if( '$exists' === operator ) {
                widgetName = 'Exists';
            } else if( '$regex' === operator || 'iregex' === operator ) {
                widgetName = 'RegEx';
            } else if( -1 !== ['$comp', '$compDate'].indexOf( operator ) ) {
                widgetName = 'Comp';
            }

            return widgetName;
        }

        function getByOperator( criterion ) {
            var
                widgetName,
                widget,
                operator;

            if( !criterion ) {
                return null;
            }

            operator = ko.unwrap( criterion.operator );

            if( operator.val ) {
                operator = operator.val;
            }

            widgetName = getWidgetName( operator );

            if( !widgetName ) {
                throw Error( 'widget name not found ' + widgetName );
            }

            widget = widgetManager.get( widgetName, criterion, false );

            if( !widget ) {
                throw Error( 'widget ' + widgetName + ' not found' );
            }

            widget.init( {
                criterion: criterion,
                attrEntry: {},
                schemaEntry: criterion.schemaEntry,
                ruleEngineDefinition: {},
                required: criterion.required,
                isOnForm: criterion.isOnForm,
                useIsoDate: criterion.useIsoDate,
                preventUtcOffsetAdjust: criterion.preventUtcOffsetAdjust,
                placeholder: criterion.placeholder,
                isSelectMultiple: criterion.isSelectMultiple,
                autoCompleteDateRange: criterion.autoCompleteDateRange,
                minDate: criterion.minDate,
                maxDate: criterion.maxDate,
                buttons: criterion.buttons
            } );

            return widget;
        }

        function getByCriterion( actType, criterion ) {
            var
                attrEntry,
                schemaEntry,
                widgetName,
                widget,
                path,
                operator;

            if( !actType || !criterion ) {
                return null;
            }

            path = unwrap( criterion.path );
            operator = unwrap( criterion.operator );


            if( !operator ) {
                return null;
            }

            if( operator.val ) {
                operator = operator.val;
            }

            attrEntry = Y.doccirrus.ruleutils.getAttributeListItem( actType, path );
            schemaEntry = attrEntry && attrEntry.schemaEntry;

            if( ['TREATMENT'].includes( actType ) && 'fk5035Set.fk5035' === path && ['$eq'].includes( operator ) ) {
                widgetName = 'CatalogOP';
            } else if( ['TREATMENT'].includes( actType ) && 'fk5036Set.fk5036' === path && ['$eq'].includes( operator ) ) {
                widgetName = 'CatalogCode';
            } else if( ['TREATMENT', 'DIAGNOSIS', 'MEASUREMENT', 'PROCESS'].includes( actType ) && 'code' === path && ['$eq'].includes( operator ) ) {
                widgetName = 'Catalog';
            } else if( ['TREATMENT', 'DIAGNOSIS', 'MEASUREMENT', 'PROCESS'].includes( actType ) && 'catalogShort' === path && ['$eq', '$ne'].includes( operator ) ) {
                widgetName = 'CatalogShort';
            } else if( ('patientId.age' === path || 'ageOnTimestamp' === path) && ['$comp'].includes( operator ) ) {
                widgetName = 'CompDateType';
            } else if( 'patientId.age' === path && ['$eq', '$ne'].includes( operator ) ) {
                widgetName = 'EquationDateTypeWidget';
            } else if( 'patientId.markers' === path && ['$eq', '$ne'].includes( operator ) ){
                widgetName = 'Marker';
            } else if( actType === 'task' && 'taskType' === path && ['$eq', '$ne'].includes( operator ) ){
                widgetName = 'TaskType';
            } else if( ['employeeId.qualiDignities', 'employeeId.quantiDignities'].includes(path) && ['$eq', '$ne'].includes( operator ) ){
                widgetName = 'Dignity';
            } else {
                widgetName = getWidgetName( operator );
            }


            if( !widgetName ) {
                throw Error( 'widget name not found ' + widgetName );
            }

            if( ['Catalog', 'CatalogCode', 'CatalogOP', 'Marker', 'Dignity'].includes( widgetName ) ) {
                widget = widgetManager.get( widgetName, criterion, false );
            } else {
                widget = widgetManager.get( widgetName );
            }


            if( !widget ) {
                throw Error( 'widget ' + widgetName + ' not found' );
            }

            var valueWidgetName, valueWidgetType;
            if( ['employeeId.qualiDignities', 'employeeId.quantiDignities'].includes(path) ){
                if( 'Includes' === widgetName ){
                    valueWidgetName = 'Dignity';
                }
                valueWidgetType = 'employeeId.qualiDignities' === path ? 'qual' : 'quanti';
            }

            widget.init( {
                actType: actType,
                caseFolderType: criterion.casefolderType && criterion.casefolderType() || '',
                criterion: criterion,
                attrEntry: attrEntry,
                schemaEntry: schemaEntry,
                ruleEngineDefinition: {},
                widgetName: valueWidgetName,
                widgetType: valueWidgetType
            } );
            return widget;
        }

        function getByType( type ) {

            var widgetName = null;

            if( 'String' === type ) {
                widgetName = 'Equation';
            } else if( 'Boolean' === type ) {
                widgetName = 'Boolean';
            }

            var widget = widgetManager.get( widgetName );

            widget.init( {
                criterion: {
                    value: ko.observable( 0 ),
                    path: ko.observable( '' )
                },
                attrEntry: {},
                schemaEntry: {},
                ruleEngineDefinition: {}
            } );

            return widget;
        }

        Y.namespace( 'doccirrus' ).KoSchemaValueWidget = {

            name: NAME,

            getByType: getByType,
            getByCriterion: getByCriterion,
            getByOperator: getByOperator
        };
    },
    '0.0.1', { requires: ['dcruleutils', 'dcvalidations'] }
);




