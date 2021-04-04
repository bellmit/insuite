/**
 * User: michael.kleinert
 * Date: 12/31/19
 * (c) 2019, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_ingredientplan-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {},
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Create Ingredient Plan with some med data items"
                }
            },

            // class linkers, will become ES6 imports later on
            MedDataItemSchema = Y.doccirrus.schemas.v_meddata.MedDataItemSchema,
            MedDataSchema = Y.doccirrus.schemas.v_meddata.MedDataSchema,
            MedDataConfigSchema = Y.doccirrus.schemas.v_meddata.MedDataConfigSchema,
            MedDataItemConfigSchema = Y.doccirrus.schemas.v_meddata.MedDataItemConfigSchema,
            TagSchema = Y.doccirrus.schemas.tag.TagSchema,
            TagTypes = Y.doccirrus.schemas.tag.tagTypes,

            // create a static default IngredientPlan config
            medDataItemCategory = Y.doccirrus.schemas.v_meddata.medDataCategories.ACTIVEINGREDIENTS,
            defaultMedConfigSubType = "Wirkstoffplan",
            createAdditionalDataKey = MedDataItemSchema.createAdditionalDataKey,
            columnKeys = {
                planVersion: createAdditionalDataKey( "ActiveIngredient", defaultMedConfigSubType, "planVersion" ),
                initialDosis: createAdditionalDataKey( "ActiveIngredient", defaultMedConfigSubType, "initialDosis" ),
                targetDosis: createAdditionalDataKey( "ActiveIngredient", defaultMedConfigSubType, "targetDosis" ),
                group: createAdditionalDataKey( "ActiveIngredient", defaultMedConfigSubType, "group" ),
                stage: createAdditionalDataKey( "ActiveIngredient", defaultMedConfigSubType, "stage" ),
                strength: createAdditionalDataKey( "ActiveIngredient", defaultMedConfigSubType, "strength" ),
                dosis: createAdditionalDataKey( "ActiveIngredient", defaultMedConfigSubType, "dosis" ),
                comment: createAdditionalDataKey( "ActiveIngredient", defaultMedConfigSubType, "comment" ),
                noteOnAdaption: createAdditionalDataKey( "ActiveIngredient", defaultMedConfigSubType, "noteOnAdaption" )
            },
            planVersion = 5,
            defaultIngredientPlanConfig = {
                subType: defaultMedConfigSubType,
                showMinMaxColumns: true,
                isValueReadOnly: true,
                isTextValueReadOnly: true,
                defaultCategoryForNewItems: medDataItemCategory,
                defaultItemConfig: new MedDataItemConfigSchema( {
                    dataType: Y.doccirrus.schemas.v_meddata.medDataItemDataTypes.NUMBER_FLOAT,
                    validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 )
                } ),
                columnOrder: [
                    'type',
                    columnKeys.group,
                    columnKeys.stage,
                    columnKeys.initialDosis,
                    columnKeys.targetDosis,
                    'sampleNormalValueText',
                    columnKeys.dosis,
                    columnKeys.strength,
                    'unit',
                    'smartValue',
                    'miniChart',
                    columnKeys.comment,
                    columnKeys.noteOnAdaption,
                    'deleteButton'
                ],
                widthOverrides: {
                    unit: '70px',
                    value: '100px',
                    sampleNormalValueText: '100px'
                },
                titleOverrides: {
                    value: "Aktuelle"
                },
                labelOverrides: {
                    value: "Aktuelle"
                },
                version: planVersion,
                defaultValues: {
                    "Furosemid": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "Diuretika" },
                        { key: columnKeys.stage, value: "1" },
                        { key: columnKeys.initialDosis, value: "20 - 40 mg" },
                        { key: columnKeys.targetDosis, value: "240 mg" },
                        { key: "sampleNormalValueText", value: ["20-240"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Torasemid": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "Diuretika" },
                        { key: columnKeys.stage, value: "1" },
                        { key: columnKeys.initialDosis, value: "5 - 10 mg" },
                        { key: columnKeys.targetDosis, value: "20 mg" },
                        { key: "sampleNormalValueText", value: ["5-20"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Hydrochlorothiazid": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "Diuretika" },
                        { key: columnKeys.stage, value: "1" },
                        { key: columnKeys.initialDosis, value: "12,5 mg" },
                        { key: columnKeys.targetDosis, value: "100 mg" },
                        { key: "sampleNormalValueText", value: ["12.5-100"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Ramipril": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "ACE-Hemmer" },
                        { key: columnKeys.stage, value: "2" },
                        { key: columnKeys.initialDosis, value: "2,15 mg 2x tgl." },
                        { key: columnKeys.targetDosis, value: "5 mg 2x tgl." },
                        { key: "sampleNormalValueText", value: ["4.3-10"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Candesartan": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "ARBs" },
                        { key: columnKeys.stage, value: "2" },
                        { key: columnKeys.initialDosis, value: "4-8 mg 1x tgl." },
                        { key: columnKeys.targetDosis, value: "32 mg 1x tgl." },
                        { key: "sampleNormalValueText", value: ["4-32"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Valsartan": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "ARBs" },
                        { key: columnKeys.stage, value: "2" },
                        { key: columnKeys.initialDosis, value: "40 mg 2x tgl." },
                        { key: columnKeys.targetDosis, value: "160 mg 1x tgl." },
                        { key: "sampleNormalValueText", value: ["80-160"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Losartan": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "ARBs" },
                        { key: columnKeys.stage, value: "2" },
                        { key: columnKeys.initialDosis, value: "50 mg 1x tgl." },
                        { key: columnKeys.targetDosis, value: "150 mg 1x tgl." },
                        { key: "sampleNormalValueText", value: ["50-150"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Losartan kalium": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "ARBs" },
                        { key: columnKeys.stage, value: "2" },
                        { key: columnKeys.initialDosis, value: "50 mg 1x tgl." },
                        { key: columnKeys.targetDosis, value: "150 mg 1x tgl." },
                        { key: "sampleNormalValueText", value: ["50-150"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Carvidilol": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "B-Blocker" },
                        { key: columnKeys.stage, value: "2" },
                        { key: columnKeys.initialDosis, value: "6,25 mg 1x tgl." },
                        { key: columnKeys.targetDosis, value: "25 mg 2x tgl." },
                        { key: "sampleNormalValueText", value: ["6.25-50"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Nevivolol": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "B-Blocker" },
                        { key: columnKeys.stage, value: "2" },
                        { key: columnKeys.initialDosis, value: "2,5 mg 1x tgl." },
                        { key: columnKeys.targetDosis, value: "5 mg 2x tgl." },
                        { key: "sampleNormalValueText", value: ["2.5-10"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Metoprolol": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "B-Blocker" },
                        { key: columnKeys.stage, value: "2" },
                        { key: columnKeys.initialDosis, value: "47,5 mg 1x tgl." },
                        { key: columnKeys.targetDosis, value: "95 mg 2x tgl." },
                        { key: "sampleNormalValueText", value: ["47.5-190"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Metoprolol tartrat": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "B-Blocker" },
                        { key: columnKeys.stage, value: "2" },
                        { key: columnKeys.initialDosis, value: "47,5 mg 1x tgl." },
                        { key: columnKeys.targetDosis, value: "95 mg 2x tgl." },
                        { key: "sampleNormalValueText", value: ["47.5-190"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Metoprolol succinat": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "B-Blocker" },
                        { key: columnKeys.stage, value: "2" },
                        { key: columnKeys.initialDosis, value: "47,5 mg 1x tgl." },
                        { key: columnKeys.targetDosis, value: "95 mg 2x tgl." },
                        { key: "sampleNormalValueText", value: ["47.5-190"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Epelerenon": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "MRAs" },
                        { key: columnKeys.stage, value: "3" },
                        { key: columnKeys.initialDosis, value: "25 mg 1x tgl." },
                        { key: columnKeys.targetDosis, value: "50 mg 1x tgl." },
                        { key: "sampleNormalValueText", value: ["25-50"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Spironolacton": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "MRAs" },
                        { key: columnKeys.stage, value: "3" },
                        { key: columnKeys.initialDosis, value: "25 mg 1x tgl." },
                        { key: columnKeys.targetDosis, value: "50 mg 1x tgl." },
                        { key: "sampleNormalValueText", value: ["25-50"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Sacubitril Valsartan": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "ARNI" },
                        { key: columnKeys.stage, value: "4" },
                        { key: columnKeys.initialDosis, value: "49 - 51 mg 2x tgl." },
                        { key: columnKeys.targetDosis, value: "97 - 103 mg 2x tgl." },
                        { key: "sampleNormalValueText", value: ["98-206"] },
                        { key: "unit", value: "mg" }
                    ],
                    "Ivabradin": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "Ivabradin" },
                        { key: columnKeys.stage, value: "4" },
                        { key: columnKeys.initialDosis, value: "" },
                        { key: columnKeys.targetDosis, value: "" },
                        { key: "sampleNormalValueText", value: [""] },
                        { key: "unit", value: "" }
                    ],
                    "Ivabradin oxalat": [
                        { key: columnKeys.planVersion, value: planVersion },
                        { key: columnKeys.group, value: "Ivabradin" },
                        { key: columnKeys.stage, value: "4" },
                        { key: columnKeys.initialDosis, value: "" },
                        { key: columnKeys.targetDosis, value: "" },
                        { key: "sampleNormalValueText", value: [""] },
                        { key: "unit", value: "" }
                    ]
                },
                columns: {
                    planVersion: {
                        static: true, // stored in Tag_T and shown in front of dynamic columns
                        keyRoot: "additionalData",
                        key: columnKeys.planVersion,
                        label: "Wirkstoffplan Version",
                        title: "Wirkstoffplan Version",
                        type: "text",
                        visible: false,
                        excluded: true
                    },
                    initialDosis: {
                        static: true, // stored in Tag_T and shown in front of dynamic columns
                        isSortable: true,
                        isFilterable: true,
                        keyRoot: "additionalData",
                        key: columnKeys.initialDosis,
                        label: "Start-Dosis",
                        title: "Start-Dosis",
                        type: "text"
                    },
                    targetDosis: {
                        static: true, // stored in Tag_T and shown in front of dynamic columns
                        isSortable: true,
                        isFilterable: true,
                        keyRoot: "additionalData",
                        key: columnKeys.targetDosis,
                        label: "Ziel-Dosis",
                        title: "Ziel-Dosis",
                        type: "text"
                    },
                    group: {
                        static: true, // stored in Tag_T and shown in front of dynamic columns
                        isSortable: true,
                        isFilterable: true,
                        keyRoot: "additionalData",
                        key: columnKeys.group,
                        width: '100px',
                        label: "Gruppe",
                        title: "Gruppe",
                        type: ["Diuretika", "B-Blocker", "ACE-Hemmer", "ARBs", "MRAs", "ARNI", "Ivabradin"] // => will become a Select2-Box
                    },
                    stage: {
                        static: true, // stored in Tag_T and shown in front of dynamic columns
                        isSortable: true,
                        isFilterable: true,
                        keyRoot: "additionalData",
                        key: columnKeys.stage,
                        width: '70px',
                        label: "Stufe",
                        title: "Stufe",
                        type: ["1", "2", "3", "4"] // => will become a Select2-Box
                    },
                    strength: {
                        static: false, // stored in MedDataItem_T and shown after static columns
                        keyRoot: "additionalData",
                        key: columnKeys.strength,
                        label: "Wirkstärke",
                        title: "Wirkstärke",
                        type: "number",
                        required: true
                    },
                    dosis: {
                        static: false, // stored in MedDataItem_T and shown after static columns
                        keyRoot: "additionalData",
                        key: columnKeys.dosis,
                        width: '80px',
                        label: "MMAN",
                        title: "MMAN",
                        type: "string",
                        required: true
                    },
                    comment: {
                        static: false, // stored in MedDataItem_T and shown after static columns
                        keyRoot: "additionalData",
                        key: columnKeys.comment,
                        label: "Anpassung",
                        title: "Anpassung",
                        type: "text"
                    },
                    noteOnAdaption: {
                        static: false, // stored in MedDataItem_T and shown after static columns
                        keyRoot: "additionalData",
                        key: columnKeys.noteOnAdaption,
                        label: "Begründung",
                        title: "Begründung",
                        type: "text"
                    }
                }
            };

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * IngredientStrength class.
         * Parametrizes an ingredient strength. E.g. 0.12 ml
         * @param {number|string} value
         * @param {string} unit
         * @param {number} multiplier important for the conversion toString, and for calculating the total quantity.
         * @constructor
         */
        function IngredientStrengthSchema( value, unit, multiplier = 1 ) {
            this.value = value;
            this.unit = unit;
            this.multiplier = multiplier;
        }

        Object.defineProperty( IngredientStrengthSchema.prototype, 'value', {
            /**
             * @return {string}
             */
            get: function() {
                return this._value;
            },
            /**
             * @param {string|number} value
             */
            set: function( value ) {
                if( typeof value === "string" ) {
                    value = Number.parseFloat( value );
                }
                this._value = value;
            }
        } );

        Object.defineProperty( IngredientStrengthSchema.prototype, 'unit', {
            /**
             * @return {string}
             */
            get: function() {
                return this._unit;
            },
            /**
             * @param {string} unit
             */
            set: function( unit ) {
                this._unit = unit;
            }
        } );

        Object.defineProperty( IngredientStrengthSchema.prototype, 'totalValue', {
            /**
             * get the total value: multiply the value with the multiplier
             * @return {number}
             */
            get: function() {
                var multiplier = (this.multiplier === null) ? 1 : this.multiplier;
                return this.value * multiplier;
            }
        } );

        Object.defineProperty( IngredientStrengthSchema.prototype, 'multiplier', {
            /**
             * @return {number}
             */
            get: function() {
                return this._multiplier;
            },
            /**
             * Set the current ingredient strength multiplier.
             * @param {number} multiplier If a number is given, the strength will be multiplied by that number.
             */
            set: function( multiplier ) {
                this._multiplier = multiplier;
            }
        } );

        /**
         * @param {boolean|undefined} ignoreMultiplier just give the strength without the multiplier (default: false)
         * @return {string}
         */
        IngredientStrengthSchema.prototype.toString = function( ignoreMultiplier = false ) {
            if( !Number.isFinite( this.value ) ) {
                return '';
            }

            var multiplier = (ignoreMultiplier === true || this.multiplier === null) ? 1 : this.multiplier,
                str = [this.value * multiplier];

            // add the unit, if given
            if( typeof this.unit === "string" ) {
                str.push( this.unit );
            }

            // add multiplier information
            if( multiplier > 1 ) {
                str.push( " (" + [multiplier, "x", this.value, this.unit].join( " " ) + ") " );
            }
            return str.join( " " );
        };

        /**
         * @param {string} input
         * @returns {IngredientStrengthSchema}
         */
        IngredientStrengthSchema.byString = function( input ) {
            var value = 0,
                unit = "",
                splitRegex = /(\d+)[.,]?(\d*)\s?([\w\/]*)/,
                match = input.match( splitRegex );
            if( Array.isArray( match ) ) {
                value = Number.parseFloat( match[1] + "." + match[2] );
                unit = match[3];
            }
            return new IngredientStrengthSchema( value, unit );
        };

        /**
         * Class to represent a dosis.
         * @param {string} dosis
         * @param {string} type
         * @class
         * @constructor
         */
        function DosisSchema( dosis, type ) {
            this.value = dosis;
            this.type = type || "TEXT";
        }

        Object.defineProperty( DosisSchema.prototype, 'value', {
            /**
             * @return {number}
             */
            get: function() {
                return this._value;
            },
            /**
             * @param {number} value
             */
            set: function( value ) {
                this._value = value;
            }
        } );

        Object.defineProperty( DosisSchema.prototype, 'type', {
            /**
             * @return {string}
             */
            get: function() {
                return this._type;
            },
            /**
             * @param {string} type
             */
            set: function( type ) {
                this._type = type;
            }
        } );

        Object.defineProperty( DosisSchema.prototype, 'totalQuantity', {
            /**
             * takes the dosis, and calculates the quantity from it (0-1-2-3 = 6), or (2 in the morning = 2)
             * @return {number|null}
             */
            get: function() {
                var qty = null,
                    parsedValue,
                    MNENMatch;
                if( typeof this.value === "string" ) {
                    // parse dosis format "Morning-Noon-Evening-Night" pattern
                    MNENMatch = this.value.match( /(\d+\.?\d*)\s?-\s?(\d+\.?\d*)\s?-\s?(\d+\.?\d*)\s?-\s?(\d+\.?\d*)\s?/ );
                    if( Array.isArray( MNENMatch ) ) {
                        parsedValue = [
                            Number.parseFloat( MNENMatch[1] ), // morning
                            Number.parseFloat( MNENMatch[2] ), // noon
                            Number.parseFloat( MNENMatch[3] ), // evening
                            Number.parseFloat( MNENMatch[4] )  // night
                        ];

                        qty = parsedValue.reduce( function( accumulator, val ) {
                            if( isNaN( val ) ) {
                                return accumulator;
                            }
                            return accumulator + val;
                        } );
                    } else {
                        parsedValue = Number.parseFloat( this.value );
                        if( !isNaN( parsedValue ) ) {
                            qty = parsedValue;
                        }
                    }
                }
                return qty;
            }
        } );

        /**
         * ActiveIngredient class, representing an active ingredient.
         * Contains functions to convert the data in different output formats, i.e. MedDataItem.
         * @param {object} props
         * @param {string} props.name
         * @param {string|IngredientStrengthSchema} props.strength
         * @param {string} props.dosis
         * @param {string} props.phDosisType
         * @constructor
         * @class
         */
        function ActiveIngredientSchema( props ) {
            MedDataItemSchema.call( this, props );
            var { name: name, strength: strength, dosis: dosis, phDosisType: phDosisType } = props;

            // convert a string input to an ingredient strength
            strength = (strength instanceof IngredientStrengthSchema) ? strength : IngredientStrengthSchema.byString( strength );
            dosis = new DosisSchema( dosis, phDosisType );

            // call super class constructor
            MedDataItemSchema.call( this, {
                category: medDataItemCategory,
                type: name,
                value: strength.value,
                unit: strength.unit,
                textValue: ""
            } );

            this.strength = strength;
            this.dosis = dosis;
        }

        ActiveIngredientSchema.prototype = Object.create( MedDataItemSchema.prototype );
        ActiveIngredientSchema.prototype.constructor = ActiveIngredientSchema;
        ActiveIngredientSchema.prototype._super = MedDataItemSchema;

        Object.defineProperty( ActiveIngredientSchema.prototype, 'version', {
            get: function() {
                return Object.getOwnPropertyDescriptor( ActiveIngredientSchema.prototype._super.prototype, 'version' ).get.call( this );
            },
            /**
             * stores the version additionally in the additionalData.
             * @param {number} version
             */
            set: function( version ) {
                Object.getOwnPropertyDescriptor( ActiveIngredientSchema.prototype._super.prototype, 'version' ).set.call( this, version );
                this.setAdditionalData( defaultIngredientPlanConfig.columns.planVersion.key, this._version );
            }
        } );

        Object.defineProperty( ActiveIngredientSchema.prototype, 'name', {
            /**
             * Wrapper for this.type.
             * @return {string}
             */
            get: function() {
                return this._type;
            },
            /**
             * Wrapper for this.type.
             * @param {string} name
             */
            set: function( name ) {
                this._type = name;
            }
        } );

        Object.defineProperty( ActiveIngredientSchema.prototype, 'strength', {
            /**
             * @return {IngredientStrengthSchema}
             */
            get: function() {
                return this._strength;
            },
            /**
             * @param {string|IngredientStrengthSchema} strength
             */
            set: function( strength ) {
                // re-use an existing unit
                if( typeof strength === "string" || typeof strength === "number" ) {
                    strength = new IngredientStrengthSchema( strength, (this.strength instanceof IngredientStrengthSchema) ? this.strength.unit : "" );
                }

                // check the type
                if( !(strength instanceof IngredientStrengthSchema) ) {
                    throw new Error( "ActiveIngredientSchema->set strength requires a IngredientStrengthSchema as input" );
                }

                this._strength = strength;
                if( this.dosis instanceof DosisSchema ) {
                    this._strength.multiplier = this.dosis.totalQuantity;
                    this.value = this.strength.totalValue;
                }
                this.setAdditionalData( defaultIngredientPlanConfig.columns.strength.key, this._strength.value );
            }
        } );

        Object.defineProperty( ActiveIngredientSchema.prototype, 'dosis', {
            /**
             * @return {DosisSchema}
             */
            get: function() {
                return this._dosis;
            },
            /**
             * @param {DosisSchema|string} dosis
             */
            set: function( dosis ) {

                // convert a dosis given as string to a DosisSchema
                if( typeof dosis === "string" ) {
                    dosis = new DosisSchema( dosis );
                }

                // check the type
                if( !(dosis instanceof DosisSchema) ) {
                    throw new Error( "ActiveIngredientSchema->set dosis requires a DosisSchema as input" );
                }

                this._dosis = dosis;
                if( this.strength instanceof IngredientStrengthSchema ) {
                    this.strength.multiplier = this._dosis.totalQuantity;
                    this.value = this.strength.totalValue;
                }
                this.setAdditionalData( defaultIngredientPlanConfig.columns.dosis.key, this._dosis.value );
            }
        } );

        Object.defineProperty( ActiveIngredientSchema.prototype, 'textValue', {
            /**
             * override the getter, to always return the strength
             * @return {string}
             */
            get: function() {
                return this.strength.toString();
            },
            /**
             * @param {string} textValue
             */
            set: function( textValue ) {
                this._textValue = textValue;
            }
        } );

        /**
         * fills local variables from data stored as additional data
         * @param {object} additionalData
         * @return {ActiveIngredientForIngredientPlanSchema}
         */
        ActiveIngredientSchema.prototype.setFromAdditionalData = function( additionalData ) {
            var dataKey, value;

            if( typeof additionalData === "object" && additionalData !== null ) {
                for( dataKey in additionalData ) {
                    if( additionalData.hasOwnProperty( dataKey ) ) {
                        value = additionalData[dataKey];
                        switch( dataKey ) {
                            case defaultIngredientPlanConfig.columns.planVersion.key:
                                this.version = value;
                                break;
                            case defaultIngredientPlanConfig.columns.strength.key:
                                // do not overwrite an existing strength, as this is given by the medication plan
                                if( !this.strength ) {
                                    this.strength = value;
                                }
                                break;
                            case defaultIngredientPlanConfig.columns.dosis.key:
                                // do not overwrite an existing strength, as this is given by the medication plan
                                if( !this.dosis ) {
                                    this.dosis = value;
                                }
                                break;
                        }
                    }
                }
            }
            return this;
        };

        /**
         * Converts an ActiveIngredient to a Tag_T
         * @return {TagSchema}
         */
        ActiveIngredientSchema.prototype.toMedDataTag = function() {
            return new TagSchema( {
                type: TagTypes.MEDDATA,
                category: medDataItemCategory,
                title: this.name,
                unit: this.strength.unit,
                additionalData: this.additionalData
            } );
        };

        /**
         * Converts an ActiveIngredient to a Tag_T
         * @return {TagSchema}
         */
        ActiveIngredientSchema.prototype.toDosageTag = function() {
            return new TagSchema( {
                type: TagTypes.DOSE,
                category: medDataItemCategory,
                title: this.dosis.value,
                unit: this.strength.unit
            } );
        };

        /**
         * @param {object} obj
         * @return {MedDataItemSchema|null}
         */
        ActiveIngredientSchema.fromObject = function( obj ) {
            var columns = defaultIngredientPlanConfig.columns;
            return new ActiveIngredientSchema(
                {
                    name: obj.type,
                    strength: new IngredientStrengthSchema( obj.value, obj.unit ),
                    dosis: new DosisSchema( obj.additionalData[columns.dosis.key], obj.additionalData[columns.dosisType.key] )
                }
            );
        };

        /**
         * Collects from an array if medications.
         * Returns an array containing normalized ActiveIngredient objects.
         * @param {object} medicationActivityObject
         * @param {object} medicationActivityObject.phIngr
         * @param {string} medicationActivityObject.dosis
         * @param {string} medicationActivityObject.dosisType
         * @returns {Array<ActiveIngredientSchema>}
         */
        ActiveIngredientSchema.fromMedicationActivityObject = function( medicationActivityObject ) {
            return medicationActivityObject.phIngr.map( function( phIngr ) { // ingredient object obtained from MMI
                return new ActiveIngredientSchema( Object.assign( {}, phIngr, {
                    dosis: medicationActivityObject.dosis,
                    phDosisType: medicationActivityObject.phDosisType
                } ) );
            } );
        };

        /**
         * Collects from an array if medications.
         * Returns an array containing normalized ActiveIngredient objects.
         * @param {Array<object>} medicationActivityObjects
         * @returns {Array<ActiveIngredientSchema>}
         */
        ActiveIngredientSchema.fromMedicationActivityObjects = function( medicationActivityObjects ) {
            return medicationActivityObjects
                .map( function( medication ) {
                    return ActiveIngredientSchema.fromMedicationActivityObject( medication );
                } )
                // flatten the array
                .reduce( function( acc, val ) {
                    return acc.concat( val );
                }, [] );
        };

        /**
         * ActiveIngredientForIngredientPlan class.
         * This is a special version of the ActiveIngredient,
         * possessing additional properties required for an IngredientPlan.
         * @param {object} props
         * @param {string} props.name
         * @param {string|IngredientStrengthSchema} props.strength
         * @param {string} props.dosis
         * @param {string} props.phDosisType
         * @param {string} props.comment
         * @param {string} props.noteOnAdaption
         * @param {string} props.initialDosis
         * @param {string} props.targetDosis
         * @param {string} props.group
         * @param {string} props.stage
         * @param {string} props.planVersion
         * @constructor
         */
        function ActiveIngredientForIngredientPlanSchema( props ) {
            ActiveIngredientSchema.call( this, props );

            var { comment: comment = '', noteOnAdaption: noteOnAdaption = '', initialDosis: initialDosis = '', targetDosis: targetDosis = '', group: group = '', stage: stage = '', planVersion: planVersion = 0 } = props;
            this.comment = comment;
            this.noteOnAdaption = noteOnAdaption;

            /**
             * Although the data in the static columns is always stored within the Tag_T schema,
             * we still replicate the column in each MedDataItem_T.
             * Hence, we have to create a copy of the static columns in here.
             */
            this.initialDosis = initialDosis;
            this.targetDosis = targetDosis;
            this.group = group;
            this.stage = stage;
            this.planVersion = planVersion;
        }

        ActiveIngredientForIngredientPlanSchema.prototype = Object.create( ActiveIngredientSchema.prototype );
        ActiveIngredientForIngredientPlanSchema.prototype.constructor = ActiveIngredientForIngredientPlanSchema;
        ActiveIngredientForIngredientPlanSchema.prototype._super = ActiveIngredientSchema;

        Object.defineProperty( ActiveIngredientForIngredientPlanSchema.prototype, 'planVersion', {
            /**
             * Returns a version of the current set of ingredient-plan parameters
             * This is used to overwrite existing plan values, when a new version of the plan is deployed.
             * @return {number}
             */
            get: function() {
                return this._planVersion;
            },
            /**
             * @param {string} value
             */
            set: function( value ) {
                this._planVersion = value;
            }
        } );

        Object.defineProperty( ActiveIngredientForIngredientPlanSchema.prototype, 'comment', {
            /**
             * @return {string}
             */
            get: function() {
                return this._comment;
            },
            /**
             * @param {string} comment
             */
            set: function( comment ) {
                this._comment = comment;
                this.setAdditionalData( defaultIngredientPlanConfig.columns.comment.key, this._comment );
            }
        } );

        Object.defineProperty( ActiveIngredientForIngredientPlanSchema.prototype, 'noteOnAdaption', {
            /**
             * @return {string}
             */
            get: function() {
                return this._noteOnAdaption;
            },
            /**
             * @param {string} noteOnAdaption
             */
            set: function( noteOnAdaption ) {
                this._noteOnAdaption = noteOnAdaption;
                this.setAdditionalData( defaultIngredientPlanConfig.columns.noteOnAdaption.key, this._noteOnAdaption );
            }
        } );

        Object.defineProperty( ActiveIngredientForIngredientPlanSchema.prototype, 'initialDosis', {
            /**
             * @return {string}
             */
            get: function() {
                return this._initialDosis;
            },
            /**
             * @param {string} value
             */
            set: function( value ) {
                this._initialDosis = value;
                this.setAdditionalData( defaultIngredientPlanConfig.columns.initialDosis.key, this._initialDosis );
            }
        } );

        Object.defineProperty( ActiveIngredientForIngredientPlanSchema.prototype, 'targetDosis', {
            /**
             * @return {string}
             */
            get: function() {
                return this._targetDosis;
            },
            /**
             * @param {string} value
             */
            set: function( value ) {
                this._targetDosis = value;
                this.setAdditionalData( defaultIngredientPlanConfig.columns.targetDosis.key, this._targetDosis );
            }
        } );

        Object.defineProperty( ActiveIngredientForIngredientPlanSchema.prototype, 'stage', {
            /**
             * @return {string}
             */
            get: function() {
                return this._stage;
            },
            /**
             * @param {string} value
             */
            set: function( value ) {
                this._stage = value;
                this.setAdditionalData( defaultIngredientPlanConfig.columns.stage.key, this._stage );
            }
        } );

        Object.defineProperty( ActiveIngredientForIngredientPlanSchema.prototype, 'group', {
            /**
             * @return {string}
             */
            get: function() {
                return this._group;
            },
            /**
             * @param {string} value
             */
            set: function( value ) {
                this._group = value;
                this.setAdditionalData( defaultIngredientPlanConfig.columns.group.key, this._group );
            }
        } );

        /**
         * fills local variables from data stored as additional data
         * @param {object} additionalData
         * @return {ActiveIngredientForIngredientPlanSchema}
         */
        ActiveIngredientForIngredientPlanSchema.prototype.setFromAdditionalData = function( additionalData ) {
            ActiveIngredientForIngredientPlanSchema.prototype._super.prototype.setFromAdditionalData.call( this, additionalData );
            var dataKey, value;

            if( typeof additionalData === "object" && additionalData !== null ) {
                for( dataKey in additionalData ) {
                    if( additionalData.hasOwnProperty( dataKey ) ) {
                        value = additionalData[dataKey];
                        switch( dataKey ) {
                            case defaultIngredientPlanConfig.columns.noteOnAdaption.key:
                                // MOJ-12072-4 do not overwrite an existing note, as this is always given by the user
                                if( typeof this.noteOnAdaption !== "string" ) {
                                    this.noteOnAdaption = value;
                                }
                                break;
                            case defaultIngredientPlanConfig.columns.comment.key:
                                // MOJ-12072-4 do not overwrite an existing note, as this is always given by the user
                                if( typeof this.comment !== "string" ) {
                                    this.comment = value;
                                }
                                break;
                            case defaultIngredientPlanConfig.columns.initialDosis.key:
                                this.initialDosis = value;
                                break;
                            case defaultIngredientPlanConfig.columns.targetDosis.key:
                                this.targetDosis = value;
                                break;
                            case defaultIngredientPlanConfig.columns.stage.key:
                                this.stage = value;
                                break;
                            case defaultIngredientPlanConfig.columns.group.key:
                                this.group = value;
                                break;
                        }
                    }
                }
            }
            return this;
        };

        /**
         * @param {object} obj
         * @return {MedDataItemSchema|null}
         */
        ActiveIngredientForIngredientPlanSchema.fromObject = function( obj ) {
            var columns = defaultIngredientPlanConfig.columns;
            return new ActiveIngredientForIngredientPlanSchema(
                {
                    name: obj.type,
                    strength: new IngredientStrengthSchema( obj.value, obj.unit ),
                    dosis: new DosisSchema( obj.additionalData[columns.dosis.key], obj.additionalData[columns.dosisType.key] ),
                    comment: obj.additionalData[columns.comment.key],
                    noteOnAdaption: obj.additionalData[columns.noteOnAdaption.key]
                }
            );
        };

        /**
         * Collects from an array if medications.
         * Returns an array containing normalized ActiveIngredient objects.
         * @param {object} medicationActivityObject
         * @param {object} medicationActivityObject.phIngr
         * @param {string} medicationActivityObject.dosis
         * @param {string} medicationActivityObject.dosisType
         * @returns {Array<ActiveIngredientForIngredientPlanSchema>}
         */
        ActiveIngredientForIngredientPlanSchema.fromMedicationActivityObject = function( medicationActivityObject ) {
            return (medicationActivityObject.phIngr || []).map( function( phIngr ) { // ingredient object obtained from MMI
                return new ActiveIngredientForIngredientPlanSchema( Object.assign( {}, phIngr, {
                    dosis: medicationActivityObject.dosis,
                    phDosisType: medicationActivityObject.phDosisType
                } ) );
            } );
        };

        /**
         * Collects from an array if medications.
         * Returns an array containing normalized ActiveIngredient objects.
         * @param {Array<object>} medicationActivityObjects
         * @returns {Array<ActiveIngredientForIngredientPlanSchema>}
         */
        ActiveIngredientForIngredientPlanSchema.fromMedicationActivityObjects = function( medicationActivityObjects ) {
            return medicationActivityObjects
                .map( function( medication ) {
                    return ActiveIngredientForIngredientPlanSchema.fromMedicationActivityObject( medication );
                } )
                // flatten the array
                .reduce( function( acc, val ) {
                    return acc.concat( val );
                }, [] );
        };

        /**
         * IngredientPlan class.
         * @param {object} props
         * @param {Array<string>} props.medicationPlanCarrierSegments
         * @param {Array<ActiveIngredientSchema>} props.activeIngredients
         * @class
         * @constructor
         */
        function IngredientPlanSchema( props ) {
            MedDataSchema.call( this, props );

            // Create a new MedDataConfigSchema, may be shifted later on to the props-object (to become dynamic).
            // For time reasons, we just use the default plan right now.
            this._planConfig = new MedDataConfigSchema( defaultIngredientPlanConfig );

            var { medicationPlanCarrierSegments: medicationPlanCarrierSegments = [], activeIngredients: activeIngredients = [] } = props,
                self = this;

            this._medicationPlanCarrierSegments = [];
            medicationPlanCarrierSegments.forEach(
                function( carrierSegment ) {
                    self.addMedicationPlanCarrierSegments( carrierSegment );
                }
            );
            activeIngredients.forEach(
                function( medDataItem ) {
                    self.addMedDataItem( medDataItem );
                }
            );
        }

        IngredientPlanSchema.prototype = Object.create( MedDataSchema.prototype );
        IngredientPlanSchema.prototype.constructor = IngredientPlanSchema;
        IngredientPlanSchema.prototype._super = MedDataSchema;

        Object.defineProperty( IngredientPlanSchema.prototype, 'planConfig', {
            /**
             * @return {MedDataConfigSchema}
             */
            get: function() {
                return this._planConfig;

            }
        } );

        Object.defineProperty( IngredientPlanSchema.prototype, 'medicationPlanCarrierSegments', {
            /**
             * @return  {Array<string>}
             */
            get: function() {
                return this._medicationPlanCarrierSegments;

            }
        } );

        Object.defineProperty( IngredientPlanSchema.prototype, 'medData', {
            /**
             * @return  {Array<ActiveIngredientSchema>}
             */
            get: function() {
                return this._medData;

            }
        } );

        IngredientPlanSchema.prototype.addMedicationPlanCarrierSegments = function( medicationPlanCarrierSegments ) {
            this._medicationPlanCarrierSegments.push( medicationPlanCarrierSegments );
        };

        /**
         * @return {object}
         */
        IngredientPlanSchema.prototype.toObject = function() {
            return Object.assign(
                IngredientPlanSchema.prototype._super.prototype.toObject.call( this ),
                {
                    actType: IngredientPlanSchema.actType(),
                    medicationPlanCarrierSegments: this.medicationPlanCarrierSegments,
                    medData: this.medData.map( function( activeIngredient ) {
                        return activeIngredient.toObject();
                    } )
                }
            );
        };

        IngredientPlanSchema.prototype.toJSON = IngredientPlanSchema.prototype.toObject;

        /**
         * @param {object} obj
         * @return {IngredientPlanSchema|null}
         */
        IngredientPlanSchema.fromObject = function( obj ) {
            var ingredientPlanSchema = null;

            if( typeof obj === "object" && obj.actType === IngredientPlanSchema.actType() ) {
                ingredientPlanSchema = new IngredientPlanSchema();
                if( obj.hasOwnProperty( "medData" ) && Array.isArray( obj.medData ) ) {
                    obj.medData.forEach(
                        function( medDataObj ) {
                            ingredientPlanSchema.addMedDataItem( ActiveIngredientForIngredientPlanSchema.fromObject( medDataObj ) );
                        }
                    );
                }
            }

            return ingredientPlanSchema;
        };

        /**
         * returns the actType of this class.
         * @return {string}
         */
        IngredientPlanSchema.actType = function() {
            return 'INGREDIENTPLAN';
        };

        /**
         * Returns the object which may be passed into a MedDataConfigSchema or MedDataConfigClient.
         * @return {object}
         */
        IngredientPlanSchema.getMedDataConfigObject = function() {
            return defaultIngredientPlanConfig;
        };

        /**
         * MOJ-5065 this is a virtual schema and
         * does not actually have a collection related
         * to it in the DB.
         */
        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VIngredientPlan_T",
                        "lib": types
                    }
                },
                "VIngredientPlanMedDataItem_T": {
                    "category": {
                        "type": "String",
                        "default": "ACTIVEINGREDIENTS",
                        "required": true,
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'activity-schema.MedData_T.category.i18n' ),
                        "-en": i18n( 'activity-schema.MedData_T.category.i18n' ),
                        "-de": i18n( 'activity-schema.MedData_T.category.i18n' )
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "MedDataItem_T",
                        "lib": "activity"
                    }
                },
                "IngredientPlanActType_E": {
                    "type": "String",
                    "default": "INGREDIENTPLAN",
                    "apiv": { v: 2, queryParam: true },
                    "list": [
                        {
                            "val": "INGREDIENTPLAN",
                            i18n: i18n( 'activity-schema.Activity_E.INGREDIENTPLAN' )
                        }
                    ]
                },
                "VIngredientPlan_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "IngredientPlanActType_E",
                        "lib": types,
                        "apiv": { v: 2, queryParam: false },
                        "required": true
                    },
                    "medData": {
                        "complex": "inc",
                        "type": "VIngredientPlanMedDataItem_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "IngredientPlan_T",
                        "lib": "activity"
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,

            // expose classes
            DosisSchema: DosisSchema,
            IngredientPlanSchema: IngredientPlanSchema,
            IngredientStrengthSchema: IngredientStrengthSchema,
            ActiveIngredientSchema: ActiveIngredientSchema,
            ActiveIngredientForIngredientPlanSchema: ActiveIngredientForIngredientPlanSchema,
            columnKeys: columnKeys,

            // expose the default config object
            defaultIngredientPlanConfig: defaultIngredientPlanConfig,

            ramlConfig: ramlConfig
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'activity-schema',
            'tag-schema',
            'v_meddata-schema'
        ]
    }
);
