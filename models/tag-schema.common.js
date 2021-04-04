/**
 * User: pi
 * Date: 21/10/2016  10:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';

YUI.add( 'tag-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module socketioevent-schema
         */

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n,
            tagTypes = Object.freeze( {
                'JOBSTATUS': 'JOBSTATUS',
                'DOCUMENT': 'DOCUMENT',
                'CATALOG': 'CATALOG',
                'SUBTYPE': 'SUBTYPE',
                'MEDDATA': 'MEDDATA',
                'LABDATA': 'LABDATA',
                'INPACSNAME': 'INPACSNAME',
                'CANCELREASON': 'CANCELREASON',
                'DOSE': 'DOSE',
                'PHNOTE' : 'PHNOTE',
                'PHREASON': 'PHREASON',
                'RELATIONSHIPSTATUS': 'RELATIONSHIPSTATUS'
            } ),
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Exposing CRUD methods for tag-objects via REST/2." +
                                 "<br><br>" +
                                 "Tags of type <code>MEDDATA</code> play a crucial role for activities of <code>actType:'MEDDATA'</code>. " +
                                 "The tag of a given <code>title</code> provides a configuration object for " +
                                 "all items stored inside a <code>MEDDATA</code> activity, valid for all items whose <code>type</code> " +
                                 "match the tag's <code>title</code>. " +
                                 "The configuration is stored inside the tag within the array <code>medDataItemConfig</code>. " +
                                 "It contains a list of configurations being valid from a given point in time " +
                                 "<code>validFromIncl</code> until the chronological next entry. " +
                                 "It is highly recommended to <b>never</b> change an existing configuration, " +
                                 "but instead append new configurations with the current date to the list. " +
                                 "Any <code>MEDDATA</code> items get validated against the configuration " +
                                 "being valid at the specific point in time of the activity. " +
                                 "Hence, changing existing configurations may cause old activities to become invalid. " +
                                 "To get an overview of the available fields, see the example below. " +
                                 '<pre>' +
                                 '{\n' +
                                 '      "category":["BIOMETRICS"],\n' +
                                 '      "sampleNormalValueText":[],\n' +
                                 '      "type":"MEDDATA",\n' +
                                 '      "title":"Example Item",\n' +
                                 '      "unit":"",\n' +
                                 '      "medDataItemConfig":[\n' +
                                 '        {\n' +
                                 '          "dataType":"STRING",\n' +
                                 '          "validFromIncl":"2020-11-02T16:08:39.261Z",\n' +
                                 '          "validForUnit":null,\n' +
                                 '          "isOptional":false,\n' +
                                 '          "textValueMinLength":0,\n' +
                                 '          "textValueMaxLength":100,\n' +
                                 '          "textValueValidationRegExp":"(?:)",\n' +
                                 '          "enumValueCollection":[],\n' +
                                 '          "valueMinValue":0,\n' +
                                 '          "valueMaxValue":21,\n' +
                                 '          "valueDigits":2,\n' +
                                 '          "valueRoundingMethod":0,\n' +
                                 '          "valueLeadingZeros":0,\n' +
                                 '          "valueFormulaExpression":"(h * h)",\n' +
                                 '          "valueFormulaScope":[{\n' +
                                 '              "id":"HEIGHT",\n' +
                                 '              "testValue":"60",\n' +
                                 '              "scopeName":"h"\n' +
                                 '            }],\n' +
                                 '          "manualCalculation":true,\n' +
                                 '          "dateValueFormat":"DD.MM.YYYY",\n' +
                                 '          "dateValueMinDate":null,\n' +
                                 '          "dateValueMaxDate":null\n' +
                                 '        }\n' +
                                 '      ]\n' +
                                 '    }' +
                                 '</pre>' +
                                 "<br>" +
                                 "Additional functions exposed on this endpoint:<ul>" +
                                 "<li>" +
                                 "Provides a special method <code>:getAllAvailableLabDataTags</code> which " +
                                 "gets all the LABDATA tagged items from the DB plus all the items from " +
                                 "the labtest API." +
                                 "</li>" +
                                 "</ul>"
                }
            },

            tagErrors = {
                NO_TAGS_TO_UPDATE: "NO_TAGS_TO_UPDATE",
                INVALID_INPUT: "INVALID_INPUT",
                DEFAULT_MED_TAG: "DEFAULT_MED_TAG",
                TAG_NOT_FOUND: "TAG_NOT_FOUND",
                TAG_ALREADY_EXISTS: "TAG_ALREADY_EXISTS"
            },

            // class linkers, will become ES6 imports later on
            SchemaUtils = Y.doccirrus.schemautils,
            // eslint-disable-next-line no-unused-vars
            MedDataItemSchema = Y.doccirrus.schemas.v_meddata.MedDataItemSchema,
            MedDataItemConfigSchema = Y.doccirrus.schemas.v_meddata.MedDataItemConfigSchema,
            MedDataItemTemplateSchema = Y.doccirrus.schemas.v_meddata.MedDataItemTemplateSchema,
            MedDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes,
            GravidogrammDataTypes = Y.doccirrus.schemas.v_meddata.gravidogrammDataTypes,
            MedDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories,
            MedDataItemDataTypes = Y.doccirrus.schemas.v_meddata.medDataItemDataTypes,
            MedDataIndividualParameters = Y.doccirrus.schemas.v_meddata.medDataIndividualParameters,
            MedDataSymptoms = Y.doccirrus.schemas.v_meddata.medDataSymptoms,
            MedDataAlimentations = Y.doccirrus.schemas.v_meddata.medDataAlimentations,
            MedDataAllergies = Y.doccirrus.schemas.v_meddata.medDataAllergies,
            MedDataBiometricsSwiss = Y.doccirrus.schemas.v_meddata.medDataBiometricsSwiss,

            // load special medDataItemConfigs
            medDataItemConfigForBloodPressure = Y.doccirrus.schemas.v_meddata.medDataItemConfigForBloodPressure,
            medDataItemConfigForBloodPressureP = Y.doccirrus.schemas.v_meddata.medDataItemConfigForBloodPressureP,
            medDataItemConfigForPregnancyWeekAndDay = Y.doccirrus.schemas.v_meddata.medDataItemConfigForPregnancyWeekAndDay,
            medDataItemConfigForUterineDistance = Y.doccirrus.schemas.v_meddata.medDataItemConfigForUterineDistance,
            medDataItemConfigForFoetalPosition = Y.doccirrus.schemas.v_meddata.medDataItemConfigForFoetalPosition,
            medDataItemConfigForHeartBeat = Y.doccirrus.schemas.v_meddata.medDataItemConfigForHeartBeat,
            medDataItemConfigForMovement = Y.doccirrus.schemas.v_meddata.medDataItemConfigForMovement,
            medDataItemConfigForPresence = Y.doccirrus.schemas.v_meddata.medDataItemConfigForPresence,
            medDataItemConfigForRiskCategory = Y.doccirrus.schemas.v_meddata.medDataItemConfigForRiskCategory,
            medDataItemConfigVaccination = Y.doccirrus.schemas.v_meddata.medDataItemConfigVaccination,
            medDataItemConfigAthlete = Y.doccirrus.schemas.v_meddata.medDataItemConfigAthlete,
            medDataItemConfigDriver = Y.doccirrus.schemas.v_meddata.medDataItemConfigDriver,
            medDataItemConfigHepaticInsufficiency = Y.doccirrus.schemas.v_meddata.medDataItemConfigHepaticInsufficiency,
            medDataItemConfigRenalFailure = Y.doccirrus.schemas.v_meddata.medDataItemConfigRenalFailure;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * A MedDataItem collects parametrized data of different categories.
         * E.g. biometrics, such as body weight.
         * @param {object} props
         * @param {string} props.category
         * @param {string} props.type
         * @param {string} props.title
         * @param {string} props.catalogShort
         * @param {string} props.unit
         * @param {string} props.testLabel
         * @param {Array<string>} props.sampleNormalValueText
         * @param {Array<string>} props.mapping
         * @param {object} props.additionalData
         * @param {MedDataItemConfigSchema[]|undefined} props.medDataItemConfig
         *
         * // non schema values just for static tags
         * @param {string|undefined} props.i18n? optional translation of the tag
         * @param {boolean|undefined} props.isStatic? optional flag that this tag is static
         * @param {boolean|undefined} props.isUnitDisabled? optional flag that the unit may NOT be changed
         * @param {boolean|undefined} props.isReadOnly? optional flag that the whole entry will NOT show an input UI (used, if the whole input UI is implemented, i.e. as a modal [used in pregnancy])
         * @param {string[]|string|undefined} props.unitEnumCollection? optional flag that the unit only allows the given list of entries
         * @param {string[]|string|undefined} props.justForCaseFolderType? optional list of case folder types where the tag is valid
         * @param {string[]|string|undefined} props.justForCountryMode? optional list of country modes where the tag is valid
         * @constructor
         * @class
         */
        function TagSchema( props ) {
            this.category = props.category;
            this.type = props.type;
            this.title = props.title;
            this.catalogShort = props.catalogShort;
            this.unit = props.unit;
            this.testLabel = props.testLabel;
            this.sampleNormalValueText = props.sampleNormalValueText;
            this.mapping = props.mapping;
            this.additionalData = props.additionalData;
            this.medDataItemConfig = props.medDataItemConfig;

            // non schema values for static tags
            this.i18n = props.i18n;
            this.isStatic = props.isStatic;
            this.isUnitDisabled = props.isUnitDisabled;
            this.isReadOnly = props.isReadOnly;
            this.unitEnumCollection = props.unitEnumCollection;
            this.justForCaseFolderType = props.justForCaseFolderType;
            this.justForCountryMode = props.justForCountryMode;
        }

        TagSchema.prototype = {};

        Object.defineProperty( TagSchema.prototype, 'category', {
            /**
             * @return {string}
             */
            get: function() {
                return this._category;
            },
            /**
             * @param {string|string[]} v
             */
            set: function( v ) {
                this._category = Y.doccirrus.commonutils.getAlphaNumericStringArray( v );
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'type', {
            /**
             * @return {string}
             */
            get: function() {
                return this._type;
            },
            set: function( type ) {
                if( Object.keys( tagTypes ).indexOf( type ) === -1 ) {
                    throw new TypeError( "tagType invalid:" + type );
                }
                this._type = type;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'title', {
            /**
             * @return {string}
             */
            get: function() {
                return this._title;
            },
            set: function( title ) {
                this._title = title;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'catalogShort', {
            /**
             * @return {string}
             */
            get: function() {
                return this._title;
            },
            set: function( catalogShort ) {
                this._catalogShort = catalogShort;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'unit', {
            /**
             * @return {string}
             */
            get: function() {
                return this._unit;
            },
            set: function( unit ) {
                this._unit = unit;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'testLabel', {
            /**
             * @return {string}
             */
            get: function() {
                return this._testLabel;
            },
            set: function( v ) {
                this._testLabel = v;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'sampleNormalValueText', {
            /**
             * @return {Array<string>}
             */
            get: function() {
                return this._sampleNormalValueText;
            },
            set: function( v ) {
                this._sampleNormalValueText = Y.doccirrus.commonutils.getAlphaNumericStringArray( v );
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'mapping', {
            /**
             * @return {Array<string>}
             */
            get: function() {
                return this._mapping;
            },
            set: function( v ) {
                this._mapping = v;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'additionalData', {
            /**
             * @return {object}
             */
            get: function() {
                return this._additionalData;
            },
            set: function( v ) {
                this._additionalData = (typeof v === "object" && v !== null) ? v : {};
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'medDataItemConfig', {
            /**
             * @return {MedDataItemConfigSchema[]|undefined}
             */
            get: function() {
                return this._medDataItemConfig;
            },
            set: function( v ) {
                this._medDataItemConfig = Array.isArray( v )
                    ? v.filter( function filterMedDataItemConfigs( item ) {
                        return typeof item === "object" && item !== null;
                    } ).map( function mapMedDataItemConfigs( item ) {
                        return new MedDataItemConfigSchema( item );
                    } )
                    : undefined;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'i18n', {
            /**
             * @return {string|undefined}
             */
            get: function() {
                return this._i18n;
            },
            set: function( v ) {
                this._i18n = (typeof v === "string") ? v : undefined;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'isStatic', {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._isStatic;
            },
            set: function( v ) {
                this._isStatic = (typeof v === "boolean") ? v : false;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'isUnitDisabled', {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._hasDisabledUnit;
            },
            set: function( v ) {
                this._hasDisabledUnit = (typeof v === "boolean") ? v : false;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'isReadOnly', {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._isReadOnly;
            },
            set: function( v ) {
                this._isReadOnly = (typeof v === "boolean") ? v : false;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'unitEnumCollection', {
            /**
             * @return {string[]|undefined}
             */
            get: function() {
                return this._unitEnumCollection;
            },
            /**
             * @param {string[]|string|undefined} v
             */
            set: function( v ) {
                this._unitEnumCollection = (v) ? Y.doccirrus.commonutils.getAlphaNumericStringArray( v ) : undefined;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'justForCaseFolderType', {
            /**
             * @return {string[]|undefined}
             */
            get: function() {
                return this._justForCaseFolderType;
            },
            /**
             * @param {string[]|string|undefined} v
             */
            set: function( v ) {
                this._justForCaseFolderType = (v) ? Y.doccirrus.commonutils.getAlphaNumericStringArray( v ) : undefined;
            }
        } );

        Object.defineProperty( TagSchema.prototype, 'justForCountryMode', {
            /**
             * @return {string[]|undefined}
             */
            get: function() {
                return this._justForCountryMode;
            },
            /**
             * @param {string[]|string|undefined} v
             */
            set: function( v ) {
                this._justForCountryMode = (v) ? Y.doccirrus.commonutils.getAlphaNumericStringArray( v ) : undefined;
            }
        } );

        /**
         * adds a key value pair to the additional data object
         * @param {string} key
         * @param {mixed} value
         * @return {this}
         */
        TagSchema.prototype.setAdditionalData = function setAdditionalData( key, value ) {
            this._additionalData[key] = value;
            return this;
        };

        /**
         * returns a plain object
         * @return {{unit: string, mapping: Array<string>, testLabel: string, catalogShort: string, additionalData: {}, category: string, type: string, title: string, sampleNormalValueText: Array<string>}}
         */
        TagSchema.prototype.toObject = function toObject() {
            return {
                category: this.category,
                type: this.type,
                title: this.title,
                catalogShort: this.catalogShort,
                unit: this.unit,
                testLabel: this.testLabel,
                sampleNormalValueText: this.sampleNormalValueText,
                mapping: this.mapping,
                additionalData: this.additionalData,
                medDataItemConfig: this.medDataItemConfig
            };
        };

        TagSchema.prototype.toJSON = TagSchema.prototype.toObject;

        /**
         * Returns a plain object, resembling a medDataItemTemplate
         * @return {MedDataItemTemplateSchema}
         */
        TagSchema.prototype.toMedDataItemTemplate = function toMedDataItemTemplate() {
            return new MedDataItemTemplateSchema( {
                type: this.title,
                unit: this.unit,
                category: this.category,
                sampleNormalValueText: this.sampleNormalValueText,
                additionalData: this.additionalData,
                medDataItemConfig: this.medDataItemConfig,
                i18n: this.i18n,
                isStatic: this.isStatic,
                isUnitDisabled: this.isUnitDisabled,
                isReadOnly: this.isReadOnly,
                unitEnumCollection: this.unitEnumCollection,
                justForCaseFolderType: this.justForCaseFolderType,
                justForCountryMode: this.justForCountryMode
            } );
        };

        /**
         * returns a plain object which implements the interface for a Tag
         * @param {MedDataItemSchema} medDataItem
         * @return {TagSchema}
         */
        TagSchema.byMedDataItem = function byMedDataItem( medDataItem ) {
            return new TagSchema( {
                type: tagTypes.MEDDATA,
                title: medDataItem.type, // title in Tag === type in MedDataItem
                unit: medDataItem.unit,
                category: medDataItem.category,
                sampleNormalValueText: medDataItem.sampleNormalValueText,
                additionalData: medDataItem.additionalData
            } );
        };

        /**
         * Creates a key for additional data.
         * @param {string} prefix
         * @param {string} middle
         * @param {string} varName
         * @return {string}
         */
        TagSchema.createAdditionalDataKey = function createAdditionalDataKey( prefix, middle, varName ) {
            return [
                (typeof prefix === "string" && prefix.length > 0) ? prefix : "NONE",
                (typeof middle === "string") ? middle : "",
                (typeof varName === "string") ? varName : ""
            ].join( "_" );
        };

        /**
         * Collection object storing a collection of
         * MedDataItemTemplate objects and MedDataItem types,
         * grouped by categories.
         * @param {object|undefined} input?
         * @param {{any: MedDataItemTemplateSchema}} input.medDataItemTemplatesByCategory
         * @constructor
         */
        function MedDataItemTemplateCollection( input ) {
            var self = this;

            // set up the dictionary
            this.medDataItemTemplatesByCategory = {};

            // populate the dictionary with pre-filled arguments
            if( input && typeof input.medDataItemTemplatesByCategory === "object" && input.medDataItemTemplatesByCategory !== null ) {
                Object
                    .keys( input.medDataItemTemplatesByCategory )
                    .forEach( function forEachCategory( category ) {
                        if( typeof input.medDataItemTemplatesByCategory[category] === "object" && input.medDataItemTemplatesByCategory[category] !== null ) {
                            Object
                                .keys( input.medDataItemTemplatesByCategory[category] )
                                .forEach( function forEachType( type ) {
                                    Y.doccirrus.commonutils.addToCategoryDictionaryObject(
                                        self.medDataItemTemplatesByCategory,
                                        category,
                                        type,
                                        new MedDataItemTemplateSchema( input.medDataItemTemplatesByCategory[category][type] )
                                    );
                                } );
                        }
                    } );
            }

            // always mix in the static tags into the dictionary
            this.addTagOrTagList( staticTags );
        }

        MedDataItemTemplateCollection.prototype = {};

        /**
         * Returns an array of all MedDataTypes ordered in a dictionary object by category.
         * @return {string[]}
         */
        MedDataItemTemplateCollection.prototype.getMedDataTypeListByCategory = function getMedDataTypeListByCategory() {
            var
                self = this,
                medDataTypeListByCategory = {};

            Object
                .keys( self.medDataItemTemplatesByCategory )
                .forEach( function forEachCategory( category ) {
                    medDataTypeListByCategory[category] = Object.keys( self.medDataItemTemplatesByCategory[category] );
                } );

            return medDataTypeListByCategory;
        };

        /**
         * Returns an array of all MedDataTypes ordered in a dictionary object by category.
         * @param {object} options
         * @param {string|string[]|undefined} options.categoryOrCategories? optional filter for a specific category / categories
         * @param {string|string[]|undefined} options.justForCaseFolderType? optional filter for a specific caseFolderType
         * @param {string|string[]|undefined} options.justForCountryMode? optional filter for a specific country mode
         * @return {{any: {id: string, i18n: string, text: string}[]}}
         */
        MedDataItemTemplateCollection.prototype.getMedDataTypeListByCategoryForSelect2 = function getMedDataTypeListByCategoryForSelect2( options ) {
            var
                self = this,
                categoryOrCategories = options && options.categoryOrCategories || null,
                justForCaseFolderType = options && options.justForCaseFolderType || null,
                justForCountryMode = options && options.justForCountryMode || null,
                medDataTypeListByCategoryForSelect2 = {};

            Object
                .keys( self.medDataItemTemplatesByCategory )
                .forEach( function forEachCategory( category ) {
                    // filter categories, if requested
                    switch( true ) {
                        case typeof categoryOrCategories === "string" && categoryOrCategories !== category:
                        case Array.isArray( categoryOrCategories ) && categoryOrCategories.indexOf( category ) === -1:
                            return;
                    }

                    medDataTypeListByCategoryForSelect2[category] = Object
                        .keys( self.medDataItemTemplatesByCategory[category] )
                        .reduce( function forEachType( items, type ) {
                            /**
                             * @type {MedDataItemTemplateSchema}
                             */
                            var template = self.medDataItemTemplatesByCategory[category][type];

                            // apply template-based filters
                            switch( false ) {
                                case template.isValidForCaseFolderType( justForCaseFolderType ):
                                case template.isValidForCountryMode( justForCountryMode ):
                                    return items;
                            }

                            // push the item, if we reach up to here, as filters have not applied
                            items.push( {
                                id: template.type,
                                i18n: template.i18n || template.type,
                                text: template.i18n || template.type
                            } );

                            return items;
                        }, [] );
                } );

            return medDataTypeListByCategoryForSelect2;
        };

        /**
         * Returns a sorted array of all MedDataTypes with unique entries.
         * @return {string[]}
         */
        MedDataItemTemplateCollection.prototype.getMedDataTypeList = function getMedDataTypeList() {
            var
                self = this,

                // use an object to speed up uniqueness check, instead of an array (ES6 would use a Set here)
                medDataTypeObject = {};

            Object
                .keys( self.medDataItemTemplatesByCategory )
                .forEach( function forEachCategory( category ) {
                    Object
                        .keys( self.medDataItemTemplatesByCategory[category] )
                        .forEach( function forEachType( type ) {
                            if( !Object.prototype.hasOwnProperty.call( medDataTypeObject, type ) ) {
                                medDataTypeObject[type] = true;
                            }
                        } );
                } );

            return Object.keys( medDataTypeObject ).sort();
        };

        /**
         * Returns an array of all MedDataTypes. Sorted, and just with unique entries.
         * @param {object} options
         * @param {string|string[]|undefined} options.categoryOrCategories? optional filter for a specific category / categories
         * @param {string|string[]|undefined} options.justForCaseFolderType? optional filter for a specific caseFolderType
         * @param {string|string[]|undefined} options.justForCountryMode? optional filter for a specific country mode
         * @return {{id: string, text: string, i18n: string}[]}
         */
        MedDataItemTemplateCollection.prototype.getMedDataTypeListForSelect2 = function getMedDataTypeListForSelect2( options ) {
            var
                self = this,
                categoryOrCategories = options && options.categoryOrCategories || null,
                justForCaseFolderType = options && options.justForCaseFolderType || null,
                justForCountryMode = options && options.justForCountryMode || null,

                // storage for the final list
                items = [],
                // use an object to speed up uniqueness check, instead of an array (ES6 would use a Set here)
                medDataTypeObject = {};

            Object
                .keys( self.medDataItemTemplatesByCategory )
                .forEach( function forEachCategory( category ) {
                    // filter categories, if requested
                    switch( true ) {
                        case typeof categoryOrCategories === "string" && categoryOrCategories !== category:
                        case Array.isArray( categoryOrCategories ) && categoryOrCategories.indexOf( category ) === -1:
                            return;
                    }

                    Object
                        .keys( self.medDataItemTemplatesByCategory[category] )
                        .forEach( function forEachType( type ) {
                            var template = self.medDataItemTemplatesByCategory[category][type];

                            // apply template-based filters
                            switch( false ) {
                                case template.isValidForCaseFolderType( justForCaseFolderType ):
                                case template.isValidForCountryMode( justForCountryMode ):
                                    return;
                            }

                            if( !Object.prototype.hasOwnProperty.call( medDataTypeObject, type ) ) {
                                medDataTypeObject[type] = true;
                                items.push( {
                                    id: template.type,
                                    i18n: template.i18n || template.type,
                                    text: template.i18n || template.type
                                } );
                            }
                        } );
                } );

            // sort the items
            items.sort( function sortSelect2Items( a, b ) {
                return a.i18n < b.i18n;
            } );

            return items;
        };

        /**
         * Searches, if a MedDataType is defined in this MedDataItemTemplateCollection.
         * @param {string} type
         * @return {boolean}
         */
        MedDataItemTemplateCollection.prototype.hasMedDataType = function hasMedDataType( type ) {
            return this.getMedDataTypeList().indexOf( type ) !== -1;
        };

        /**
         * Returns a MedDataItemTemplate by the given type.
         * You may limit the search to a specific category.
         * Returns null, if not found.
         * @param {string} typeToFind
         * @param {string|undefined} categoryOrCategories? filter for specific categories
         * @return {MedDataItemTemplateSchema|null}
         */
        MedDataItemTemplateCollection.prototype.findTemplateByType = function findTemplateByType( typeToFind, categoryOrCategories ) {
            var
                self = this,
                templateFound = null;

            Object
                .keys( self.medDataItemTemplatesByCategory )
                .find( function forEachCategory( category ) {
                    // filter categories, if requested
                    if( typeof categoryOrCategories === "string" && categoryOrCategories !== category ) {
                        return false;
                    } else if( Array.isArray( categoryOrCategories ) && categoryOrCategories.indexOf( category ) === -1 ) {
                        return false;
                    }

                    return Object
                        .keys( self.medDataItemTemplatesByCategory[category] )
                        .find( function forEachType( type ) {
                            var template = self.medDataItemTemplatesByCategory[category][type];
                            if( template.type === typeToFind ) {
                                templateFound = template;
                                return true;
                            }
                            return false;
                        } );
                } );

            return templateFound;
        };

        /**
         * Returns a list of MedDataItemTemplates by the given dataType.
         * You may limit the search to a specific category.
         * Returns null, if not found.
         * @param {string|string[]} dataTypeOrTypesToFind
         * @param {string|string[]|undefined} categoryOrCategories? filter for specific categories
         * @return {MedDataItemTemplateSchema|null}
         */
        MedDataItemTemplateCollection.prototype.findTemplatesByLatestDataType = function findTemplatesByLatestDataType( dataTypeOrTypesToFind, categoryOrCategories ) {
            var
                self = this;

            return Object
                .keys( self.medDataItemTemplatesByCategory )
                .reduce( function forEachCategory( templatesFound, category ) {
                    // filter categories, if requested
                    if( typeof categoryOrCategories === "string" && categoryOrCategories !== category ) {
                        return templatesFound;
                    } else if( Array.isArray( categoryOrCategories ) && categoryOrCategories.indexOf( category ) === -1 ) {
                        return templatesFound;
                    }

                    Object
                        .keys( self.medDataItemTemplatesByCategory[category] )
                        .forEach( function forEachType( type ) {
                            var
                                template = self.medDataItemTemplatesByCategory[category][type],
                                lastConfig = Array.isArray( template.medDataItemConfig ) && template.medDataItemConfig.length > 0 ? template.medDataItemConfig[template.medDataItemConfig.length - 1] : false;


                            if ( lastConfig &&
                                (
                                    ( typeof dataTypeOrTypesToFind === "string" && lastConfig.dataType === dataTypeOrTypesToFind ) ||
                                    ( Array.isArray( dataTypeOrTypesToFind ) && dataTypeOrTypesToFind.indexOf( lastConfig.dataType ) !== -1 )
                                )
                            ) {
                                templatesFound.push( template );
                            }
                        } );

                    return templatesFound;
                }, [] );
        };

        /**
         * Takes a single or multiple new Tags, derives MedDataTemplates of these and add them to the collection.
         * @param {TagSchema|TagSchema[]} tagOrTagList
         * @returns {this}
         */
        MedDataItemTemplateCollection.prototype.addTagOrTagList = function( tagOrTagList ) {
            Y.log('Entering Y.doccirrus.schemas.tag.MedDataItemTemplateCollection.prototype.addTagOrTagList', 'info', NAME);

            const self = this;

            // ensure we have an array, if only a single values been handed over
            if( !Array.isArray( tagOrTagList ) ) {
                tagOrTagList = [tagOrTagList];
            }

            // iterate over all tags and collect their titles
            tagOrTagList.forEach( function forEachTagInTagList( tag ) {
                const
                    // create a real object
                    medDataTag = new TagSchema( tag ),

                    // create a new template object for a new MedDataItem
                    medDataItemTemplate = medDataTag.toMedDataItemTemplate();

                // push to the dictionary sorted by categories
                Y.doccirrus.commonutils.addToCategoryDictionaryObject(
                    self.medDataItemTemplatesByCategory,
                    medDataTag.category,
                    medDataItemTemplate.type,
                    medDataItemTemplate
                );
            } );

            Y.log('Exiting Y.doccirrus.schemas.tag.MedDataItemTemplateCollection.prototype.addTagOrTagList', 'info', NAME);
            return self;
        };

        /**
         * Returns the applicable MedDataItemConfigSchema for the given MedDataItem in the activity.
         * If no config is found, returns the default config of type ANY.
         * @param {object} args
         * @param {MedDataItemSchema} args.medDataItem
         * @param {string|Date} args.timestamp
         * @param {MedDataItemConfigSchema|undefined|null} [args.fallback] option config fallback (uses this.defaultConfig) by default
         * @return {MedDataItemConfigSchema|{rules: {}}|*}
         */
        MedDataItemTemplateCollection.prototype.getMedDataItemConfigSchemaForMedDataItem = function getMedDataItemConfigSchemaForMedDataItem( args ) {
            var
                medDataItem = args.medDataItem || null,
                timestamp = args.timestamp || null,
                fallback = args.fallback,
                moment = Y.doccirrus.commonutils.getMoment(),
                medDataItemTemplatesForCategory,
                itemTemplate,
                medDataItemCategory,
                medDataItemType,
                medDataItemUnit,
                selectedConfigFound,
                selectedConfigTimeDiff;

            if( timestamp && medDataItem && medDataItem.category && medDataItem.type ) {
                // for sure, we have to filter for category and type
                medDataItemCategory = medDataItem.category;
                medDataItemType = medDataItem.type;

                // optionally, we will filter for the unit
                medDataItemUnit = medDataItem.unit || null;

                // get the collection of templates for the category
                medDataItemTemplatesForCategory = this.medDataItemTemplatesByCategory[medDataItemCategory];

                // check if there is an item template for the category
                if( medDataItemTemplatesForCategory ) {

                    // find an item template valid for that
                    itemTemplate = medDataItemTemplatesForCategory[medDataItemType];

                    if( itemTemplate && itemTemplate.medDataItemConfig ) {

                        // iterate through all medDataItemConfigs and find the config being respectively valid
                        selectedConfigFound = itemTemplate.medDataItemConfig.reduce( function forEachMedDataItemConfig( selectedConfig, currentConfig ) {

                            var
                                // get the time difference between the current config and the activity date
                                currentConfigTimeDiff = moment( currentConfig.validFromIncl ).diff( timestamp ),

                                // Check if the units of the MedDataItem and the config match
                                // The config must not have any validForUnit given at all. In that case the value should be true.
                                unitsMatch = (typeof currentConfig.validForUnit === "string") ? medDataItemUnit === currentConfig.validForUnit : true;

                            if( unitsMatch ) {
                                switch( true ) {
                                    // if no config has been selected yet, add
                                    case !selectedConfig:
                                    case !selectedConfigTimeDiff:

                                    // if the config is closer in time to the activity timestamp, replace selectedConfig
                                    case currentConfigTimeDiff < 0 && selectedConfigTimeDiff < currentConfigTimeDiff && unitsMatch:
                                        selectedConfig = currentConfig;
                                        selectedConfigTimeDiff = currentConfigTimeDiff;
                                }
                            }

                            return selectedConfig;
                        }, null );

                        if( selectedConfigFound ) {
                            return new MedDataItemConfigSchema( selectedConfigFound, itemTemplate );
                        }
                    }
                }
            }

            return MedDataItemConfigSchema.getDefaultConfigBasedOnMedDataItemProperties( medDataItem, fallback );
        };

        types = Y.mix( types, {
                "root": {
                    'base': {
                        'complex': 'ext',
                        'type': 'Tag_T',
                        'lib': types
                    }
                },
                'Tag_T': {
                    'category': {
                        "apiv": { v:2, queryParam: true },
                        "type": ["String"]
                    },
                    'type': {
                        "apiv": { v:2, queryParam: true },
                        "complex": "eq",
                        "lib": types,
                        "type": "Type_E"
                    },
                    'title': {
                        "apiv": { v:2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'tag-schema.Tag_T.title.i18n' ),
                        "-en": i18n( 'tag-schema.Tag_T.title.i18n' ),
                        "-de": i18n( 'tag-schema.Tag_T.title.i18n' )
                    },
                    'catalogShort': {
                        "apiv": { v:2, queryParam: false },
                        "type": "String",
                        i18n: i18n( 'tag-schema.Tag_T.catalogShort.i18n' ),
                        "-en": i18n( 'tag-schema.Tag_T.catalogShort.i18n' ),
                        "-de": i18n( 'tag-schema.Tag_T.catalogShort.i18n' )
                    },
                    unit: {
                        "apiv": { v:2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'activity-schema.MedData_T.unit.i18n' ),
                        "-en": i18n( 'activity-schema.MedData_T.unit.i18n' ),
                        "-de": i18n( 'activity-schema.MedData_T.unit.i18n' )
                    },
                    testLabel: {
                        "apiv": { v:2, queryParam: true },
                        type: "String",
                        i18n: i18n('labtest-schema.LabTest_T.testLabel.i18n'),
                        "-en": i18n('labtest-schema.LabTest_T.testLabel.i18n'),
                        "-de": i18n('labtest-schema.LabTest_T.testLabel.i18n')
                    },
                    sampleNormalValueText: {
                        "apiv": { v:2, queryParam: false },
                        type: ["String"],
                        i18n: i18n('labtest-schema.LabTest_T.sampleNormalValueText.i18n'),
                        "-en": i18n('labtest-schema.LabTest_T.sampleNormalValueText.i18n'),
                        "-de": i18n('labtest-schema.LabTest_T.sampleNormalValueText.i18n')
                    },
                    mapping: {
                        "type": ["String"],
                        i18n: i18n( 'tag-schema.LabMap_E.i18n' ),
                        "-en": i18n( 'tag-schema.LabMap_E.i18n' ),
                        "-de": i18n( 'tag-schema.LabMap_E.i18n' )
                    },
                    additionalData: {
                        "apiv": {v: 2, queryParam: false},
                        "type": "object",
                        i18n: i18n( 'tag-schema.Tag_T.additionalData.i18n' )
                    },
                    medDataItemConfig: {
                        'required': false,
                        'complex': 'inc',
                        "apiv": { v: 2, queryParam: false },
                        'type': 'MedDataItemConfig_T',
                        'lib': types
                    }
                },
                'MedDataItemConfig_T': {
                    validFromIncl: {
                        "apiv": { v: 2, queryParam: true },
                        "type": "Date",
                        "required": true,
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.validFromIncl.i18n' )
                    },
                    validForUnit: {
                        "apiv": { v: 2, queryParam: true },
                        "type": "string",
                        "required": false,
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.validForUnit.i18n' )
                    },
                    dataType: {
                        "apiv": { v: 2, queryParam: false },
                        "complex": "eq",
                        "required": true,
                        "lib": types,
                        "type": "MedDataItemDataType_E"
                    },
                    valueRoundingMethod: {
                        "apiv": { v: 2, queryParam: false },
                        "type": "Number",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.valueRoundingMethod.i18n' )
                    },
                    valueLeadingZeros: {
                        "apiv": { v: 2, queryParam: false },
                        "type": "Number",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.valueLeadingZeros.i18n' )
                    },
                    valueDigits: {
                        "apiv": { v: 2, queryParam: false },
                        "type": "Number",
                        "default": 2,
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.valueDigits.i18n' )
                    },
                    valueMinValue: {
                        "apiv": { v: 2, queryParam: false },
                        "type": "Number",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.valueMinValue.i18n' )
                    },
                    valueMaxValue: {
                        "apiv": { v: 2, queryParam: false },
                        "type": "Number",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.valueMaxValue.i18n' )
                    },
                    textValueMinLength: {
                        "apiv": { v: 2, queryParam: false },
                        "type": "Number",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.textValueMinLength.i18n' )
                    },
                    textValueMaxLength: {
                        "apiv": { v: 2, queryParam: false },
                        "type": "Number",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.textValueMaxLength.i18n' )
                    },
                    textValueValidationRegExp: {
                        "apiv": { v: 2, queryParam: false },
                        "type": "String",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.textValueValidationRegExp.i18n' )
                    },
                    enumValueCollection: {
                        "apiv": { v: 2, queryParam: false },
                        "type": ["String"],
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.enumValueCollection.i18n' )
                    },
                    dateValueFormat: {
                        "apiv": { v: 2, queryParam: false },
                        "type": "String",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.dateValueFormat.i18n' )
                    },
                    dateValueMinDate: {
                        "apiv": { v: 2, queryParam: false },
                        "type": "Date",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.dateValueMinDate.i18n' )
                    },
                    dateValueMaxDate: {
                        "apiv": { v: 2, queryParam: false },
                        "type": "Date",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.dateValueMaxDate.i18n' )
                    },
                    valueFormulaExpression: {
                        "apiv": { v: 2, queryParam: false },
                        "type": "String",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.valueFormulaExpression.i18n' )
                    },
                    valueFormulaScope: {
                        'required': false,
                        'complex': 'inc',
                        'type': 'ValueFormulaScope_T',
                        'lib': types
                    },
                    manualCalculation: {
                        "type": "Boolean",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.manualCalculation.i18n' )
                    },
                    isOptional: {
                        "type": "Boolean",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.isOptional.i18n' )
                    }
                },
                "ValueFormulaScope_T": {
                    "id": {
                        "apiv": { v: 2, queryParam: false },
                        "type": "String",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.valueFormulaScope.id' )
                    },
                    "scopeName": {
                        "apiv": { v: 2, queryParam: false },
                        "type": "String",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.valueFormulaScope.scopeName' )
                    },
                    "testValue": {
                        "apiv": { v: 2, queryParam: false },
                        "type": "String",
                        i18n: i18n( 'tag-schema.MedDataItemConfig_T.valueFormulaScope.testValue' )
                    }
                },
                "Type_E": {
                    "type": "String",
                    "list": SchemaUtils.createSchemaTypeList( tagTypes, 'tag-schema.TagType_E.', '.i18n' ),
                    i18n: i18n( 'tag-schema.Type_E.i18n' ),
                    "-en": i18n( 'tag-schema.Type_E.i18n' ),
                    "-de": i18n( 'tag-schema.Type_E.i18n' )
                },
                "MedDataCategory_E": {
                    "type": "String",
                    "list": Y.doccirrus.schemas.v_meddata.types.medDataCategory_E.list,
                    i18n: i18n( 'activity-schema.MedData_T.category.i18n' )
                },
                "MedDataItemDataType_E": {
                    "type": "String",
                    "list": Y.doccirrus.schemas.v_meddata.types.medDataItemDataType_E.list,
                    i18n: i18n( 'activity-schema.MedData_T.medDataItemDataType.i18n' )
                },
                "LabMap_E": {
                    "type": "String",
                    "list": SchemaUtils.createSchemaTypeList( Y.doccirrus.schemas.v_labdata.labDataTypes, 'tag-schema.LabMapType_E.', '.i18n' ),
                    i18n: i18n( 'tag-schema.LabMap_E.i18n' ),
                    "-en": i18n( 'tag-schema.LabMap_E.i18n' ),
                    "-de": i18n( 'tag-schema.LabMap_E.i18n' )
                }

            }
        );

        var
            /**
             * This array of static TagSchema objects contain all system-defined Tags.
             * This includes especially MEDDATA Tags with their custom validation.
             * NOTICE: this definition MUST be done BELOW the definition of the TagSchema class (ES5, defineProperty issue)
             * @type {TagSchema[]}
             */
            staticTags = [

                // -------------- legacy inSuite NUMBER values ---------------
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.EGFR,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.EGFR ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: 'ml',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.NUMBER_INT,
                            valueMinValue: 0,
                            valueMaxValue: 200
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.HBA1C,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.HBA1C ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '%',
                    unitEnumCollection: ["%", "mmol/mol"],
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            validForUnit: "%",
                            dataType: MedDataItemDataTypes.NUMBER_FLOAT,
                            valueMinValue: 0,
                            valueMaxValue: 21,
                            valueDigits: 1
                        } ),
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            validForUnit: "mmol/mol",
                            dataType: MedDataItemDataTypes.NUMBER_INT,
                            valueMinValue: 0,
                            valueMaxValue: 210
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.LDL,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.LDL ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: 'mg/dl',
                    unitEnumCollection: ["mg/dl", "mmol/l"],
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            validForUnit: "mg/dl",
                            dataType: MedDataItemDataTypes.NUMBER_INT,
                            valueMinValue: 0,
                            valueMaxValue: 999
                        } ),
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            validForUnit: "mmol/l",
                            dataType: MedDataItemDataTypes.NUMBER_FLOAT,
                            valueMinValue: 0,
                            valueMaxValue: 25.9,
                            valueDigits: 1
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.WEIGHT,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.WEIGHT ),
                    category: [
                        MedDataCategories.BIOMETRICS,
                        MedDataCategories.PERCENTILECURVE
                    ],
                    unit: 'kg',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.NUMBER_FLOAT,
                            valueMinValue: 0,
                            valueMaxValue: 300,
                            valueDigits: 2,
                            valueRoundingMethod: 0
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.HEIGHT,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.HEIGHT ),
                    category: [
                        MedDataCategories.BIOMETRICS,
                        MedDataCategories.PERCENTILECURVE
                    ],
                    unit: 'm',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.NUMBER_FLOAT,
                            valueMinValue: 0,
                            valueMaxValue: 2.5,
                            valueLeadingZeros: 0,
                            valueDigits: 2,
                            valueRoundingMethod: 0
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.CYCLE_LENGTH,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.CYCLE_LENGTH ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: i18n( 'v_meddata-schema.unit.CYCLE_LENGTH' ),
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.NUMBER_INT,
                            valueMinValue: 21,
                            valueMaxValue: 35
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.CHECKUP_WEIGHT,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.CHECKUP_WEIGHT ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: 'kg',
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.NUMBER_FLOAT,
                            isOptional: true,
                            valueMinValue: 0,
                            valueLeadingZeros: 0,
                            valueDigits: 2,
                            valueRoundingMethod: 0
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.HAEMOGLOBIN,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.HAEMOGLOBIN ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: 'g/dL',
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.NUMBER_FLOAT,
                            isOptional: true,
                            valueMinValue: 0,
                            valueDigits: 2,
                            valueRoundingMethod: 0
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.HEAD_CIRCUMFERENCE,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.HEAD_CIRCUMFERENCE ),
                    category: [
                        MedDataCategories.BIOMETRICS,
                        MedDataCategories.PERCENTILECURVE
                    ],
                    unit: 'cm',
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.NUMBER_FLOAT,
                            valueMinValue: 0,
                            valueLeadingZeros: 0,
                            valueDigits: 2,
                            valueRoundingMethod: 0
                        } )
                    ]
                } ),

                // --------------------- legacy inSuite FORMULA values -----------------------
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.BMI,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.BMI ),
                    category: [
                        MedDataCategories.BIOMETRICS,
                        MedDataCategories.PERCENTILECURVE
                    ],
                    unit: 'kg/m2',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.NUMBER_FORMULA,
                            valueFormulaExpression: "w / (h * h)",
                            valueFormulaScope: [
                                {
                                    id: 'WEIGHT',
                                    testValue: '60',
                                    scopeName: 'w'
                                },
                                {
                                    id: 'HEIGHT',
                                    testValue: '1.65',
                                    scopeName: 'h'
                                }
                            ],
                            manualCalculation: false
                        } )
                    ]
                } ),

                // --------------------- legacy inSuite STRING values -----------------------
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.BLOODPRESSURE,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.BLOODPRESSURE ),
                    category: [
                        MedDataCategories.BIOMETRICS,
                        MedDataCategories.PERCENTILECURVE
                    ],
                    unit: 'mmHg',
                    isUnitDisabled: true,
                    medDataItemConfig: [medDataItemConfigForBloodPressure]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.BLOODPRESSUREP,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.BLOODPRESSUREP ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: 'mmHg',
                    isUnitDisabled: true,
                    medDataItemConfig: [medDataItemConfigForBloodPressureP]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.WEEK_AND_DAY_CORRECTION,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.WEEK_AND_DAY_CORRECTION ),
                    category: [
                        MedDataCategories.BIOMETRICS,
                        MedDataCategories.GRAVIDOGRAMM
                    ],
                    unit: i18n( 'v_meddata-schema.unit.WEEK_AND_DAY_CORRECTION' ),
                    medDataItemConfig: [medDataItemConfigForPregnancyWeekAndDay]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.WEEK_AND_DAY_OF_PREGNANCY,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.WEEK_AND_DAY_OF_PREGNANCY ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: i18n( 'v_meddata-schema.unit.WEEK_AND_DAY_OF_PREGNANCY' ),
                    isReadOnly: true,
                    medDataItemConfig: [medDataItemConfigForPregnancyWeekAndDay]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.END_OF_PREGNANCY,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.END_OF_PREGNANCY ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.STRING
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.THERAPY,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.THERAPY ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.STRING,
                            isOptional: true,
                            formatMedDataItemForPDFPostProcessor: function( formattedValue ) {
                                var MAX_THERAPY_LENGTH = 15;
                                if( typeof formattedValue === "string" && formattedValue.length > MAX_THERAPY_LENGTH ) {
                                    return formattedValue.substring( 0, MAX_THERAPY_LENGTH ) + '...';
                                }
                                return formattedValue;
                            }
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.CX_VAGINAL,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.CX_VAGINAL ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.STRING,
                            isOptional: true
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.PH_VAGINAL,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.PH_VAGINAL ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.STRING,
                            isOptional: true
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.VAGINAL_EXAM,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.VAGINAL_EXAM ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.STRING,
                            isOptional: true
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.PH_URINE,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.PH_URINE ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.STRING,
                            isOptional: true
                        } )
                    ]
                } ),

                // --------------------- legacy inSuite STRING_ENUM values -----------------------
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.SMOKER,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.SMOKER ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.STRING_ENUM,
                            enumValueCollection: [
                                i18n( 'InCaseMojit.MedDataEditorModel_clientJS.title.NON_SMOKER' ),
                                i18n( 'InCaseMojit.MedDataEditorModel_clientJS.title.SMOKER' ),
                                i18n( 'InCaseMojit.MedDataEditorModel_clientJS.title.HEAVY_SMOKER' )
                            ]
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.VACCINATION,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.VACCINATION ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [medDataItemConfigVaccination]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.UTERINE_DISTANCE,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.UTERINE_DISTANCE ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [medDataItemConfigForUterineDistance]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.UTERINE_DISTANCE_2,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.UTERINE_DISTANCE_2 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [medDataItemConfigForUterineDistance]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.UTERINE_DISTANCE_3,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.UTERINE_DISTANCE_3 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [medDataItemConfigForUterineDistance]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.UTERINE_DISTANCE_4,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.UTERINE_DISTANCE_4 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [medDataItemConfigForUterineDistance]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.UTERINE_DISTANCE_5,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.UTERINE_DISTANCE_5 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [medDataItemConfigForUterineDistance]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.FOETAL_POSITION,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.FOETAL_POSITION ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForFoetalPosition]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.FOETAL_POSITION_2,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.FOETAL_POSITION_2 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForFoetalPosition]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.FOETAL_POSITION_3,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.FOETAL_POSITION_3 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForFoetalPosition]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.FOETAL_POSITION_4,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.FOETAL_POSITION_4 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForFoetalPosition]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.FOETAL_POSITION_5,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.FOETAL_POSITION_5 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForFoetalPosition]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.US_PROTEIN,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.US_PROTEIN ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForPresence]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.US_SUGAR,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.US_SUGAR ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForPresence]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.US_NITRITE,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.US_NITRITE ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForPresence]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.US_BLOOD,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.US_BLOOD ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForPresence]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.EDEMA,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.EDEMA ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForMovement]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.VARICOSIS,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.VARICOSIS ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForMovement]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.MOVEMENT_PRESENT,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.MOVEMENT_PRESENT ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForMovement]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.MOVEMENT_PRESENT_2,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.MOVEMENT_PRESENT_2 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForMovement]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.MOVEMENT_PRESENT_3,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.MOVEMENT_PRESENT_3 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForMovement]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.MOVEMENT_PRESENT_4,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.MOVEMENT_PRESENT_4 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForMovement]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.MOVEMENT_PRESENT_5,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.MOVEMENT_PRESENT_5 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForMovement]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.HEARTBEAT_PRESENT,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.HEARTBEAT_PRESENT ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForHeartBeat]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.HEARTBEAT_PRESENT_2,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.HEARTBEAT_PRESENT_2 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForHeartBeat]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.HEARTBEAT_PRESENT_3,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.HEARTBEAT_PRESENT_3 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForHeartBeat]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.HEARTBEAT_PRESENT_4,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.HEARTBEAT_PRESENT_4 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForHeartBeat]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.HEARTBEAT_PRESENT_5,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.HEARTBEAT_PRESENT_5 ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForHeartBeat]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: GravidogrammDataTypes.RISK_CATEGORY,
                    i18n: i18n( 'v_meddata-schema.gravidogrammDataTypes.' + GravidogrammDataTypes.RISK_CATEGORY ),
                    category: MedDataCategories.GRAVIDOGRAMM,
                    unit: '',
                    medDataItemConfig: [medDataItemConfigForRiskCategory]
                } ),

                // ------------- legacy inSuite DATE values --------------
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.LAST_MENSTRUATION,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.LAST_MENSTRUATION ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.DATE
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.MATERNITY_LEAVE_DATE,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.MATERNITY_LEAVE_DATE ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.DATE,
                            dateValueFormat: 'dddd, D.MMMM YYYY'
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.DUE_DATE,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.DUE_DATE ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.DATE
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataTypes.LAST_MENSTRUATION_P,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataTypes.LAST_MENSTRUATION_P ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.DATE
                        } )
                    ]
                } ),

                // ---------------------- SWISS ONLY TYPES --------------------------
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataBiometricsSwiss.ATHLETE,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataBiometricsSwiss.ATHLETE ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    justForCountryMode: 'CH',
                    medDataItemConfig: [medDataItemConfigAthlete]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataBiometricsSwiss.DRIVER,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataBiometricsSwiss.DRIVER ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    justForCountryMode: 'CH',
                    medDataItemConfig: [medDataItemConfigDriver]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataBiometricsSwiss.HEPATIC_INSUFFICIENCY,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataBiometricsSwiss.HEPATIC_INSUFFICIENCY ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    justForCountryMode: 'CH',
                    medDataItemConfig: [medDataItemConfigHepaticInsufficiency]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataBiometricsSwiss.RENAL_FAILURE,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataBiometricsSwiss.RENAL_FAILURE ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    justForCountryMode: 'CH',
                    medDataItemConfig: [medDataItemConfigRenalFailure]
                } ),

                // ---------------------- INDIVIDUAL PARAMETERS --------------------------
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataIndividualParameters.BREAST_FEEDING,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataIndividualParameters.BREAST_FEEDING ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.BOOLEAN
                        } )
                    ]
                } ),
                new TagSchema( {
                    isStatic: true,
                    type: tagTypes.MEDDATA,
                    title: MedDataIndividualParameters.PREGNANT,
                    i18n: i18n( 'v_meddata-schema.medDataTypes.' + MedDataIndividualParameters.PREGNANT ),
                    category: MedDataCategories.BIOMETRICS,
                    unit: '',
                    isUnitDisabled: true,
                    medDataItemConfig: [
                        new MedDataItemConfigSchema( {
                            validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                            dataType: MedDataItemDataTypes.BOOLEAN
                        } )
                    ]
                } )
            ];

        /**
         * Fill in automatically generated static tags for allergies and symptoms and other static types.
         */
        Array.prototype.push.apply(
            staticTags,
            Object
                .keys( MedDataSymptoms )
                .map( function forEachKey( key ) {
                    var medDataType = MedDataSymptoms[key];
                    return new TagSchema({
                        isStatic: true,
                        type: tagTypes.MEDDATA,
                        title: medDataType,
                        i18n: i18n( 'v_meddata-schema.medDataTypes.' + medDataType ),
                        category: MedDataCategories.SYMPTOMS,
                        unit: '',
                        isUnitDisabled: true,
                        medDataItemConfig: [
                            new MedDataItemConfigSchema( {
                                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                                dataType: MedDataItemDataTypes.BOOLEAN
                            } )
                        ]
                    });
                } )
        );
        Array.prototype.push.apply(
            staticTags,
            Object
                .keys( MedDataAlimentations )
                .map( function forEachKey( key ) {
                    var medDataType = MedDataAlimentations[key];
                    return new TagSchema({
                        isStatic: true,
                        type: tagTypes.MEDDATA,
                        title: medDataType,
                        i18n: i18n( 'v_meddata-schema.medDataTypes.' + medDataType ),
                        category: MedDataCategories.ALIMENTATIONS,
                        unit: '',
                        isUnitDisabled: true,
                        medDataItemConfig: [
                            new MedDataItemConfigSchema( {
                                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                                dataType: MedDataItemDataTypes.BOOLEAN
                            } )
                        ]
                    });
                } )
        );
        Array.prototype.push.apply(
            staticTags,
            Object
                .keys( MedDataAllergies )
                .map( function forEachKey( key ) {
                    var medDataType = MedDataAllergies[key];
                    return new TagSchema({
                        isStatic: true,
                        type: tagTypes.MEDDATA,
                        title: medDataType,
                        i18n: i18n( 'v_meddata-schema.medDataTypes.' + medDataType ),
                        category: MedDataCategories.ALLERGIES,
                        unit: '',
                        isUnitDisabled: true,
                        medDataItemConfig: [
                            new MedDataItemConfigSchema( {
                                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                                dataType: MedDataItemDataTypes.BOOLEAN
                            } )
                        ]
                    });
                } )
        );

        /**
         * Find a static tag by optional search options.
         * @param {string} title
         * @param {object} options?
         * @param {string} options.type
         * @return {TagSchema}
         */
        function findStaticTag( title, options ) {
            var type = options && options.type || null;

            title = title.toLowerCase();

            return staticTags.find( function forEachStaticTag( tag ) {
                return (
                    (
                        tag.title.toLowerCase() === title ||
                        tag.i18n.toLowerCase() === title
                    ) &&
                    (type === null || type === tag.type)
                );
            } );
        }

        /**
         * Checks if a tag is among the static tags and may be narrowed by optional search options.
         * @param {string} title
         * @param {object} options?
         * @param {string} options.type
         * @return {TagSchema}
         */
        function isStaticTag( title, options ) {
            return !!findStaticTag( title, options );
        }

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,
            types: types,
            ramlConfig: ramlConfig,

            // enums
            tagTypes: tagTypes,
            tagErrors: tagErrors,
            staticTags: staticTags,

            // procedures
            findStaticTag: findStaticTag,
            isStaticTag: isStaticTag,

            // classes
            TagSchema: TagSchema,
            MedDataItemTemplateCollection: MedDataItemTemplateCollection

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'v_labdata-schema',
            'v_meddata-schema',
            'schemautils',
            'dccommonutils'
        ]
    }
);
