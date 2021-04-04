/**
 * User: pi
 * Date: 20/12/2016  16:50
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'v_meddata-schema', function( Y, NAME ) {



        var
            // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Collection of activities of actType <code>MEDDATA</code> (or relatives of these) via REST /2." +
                                 "<br><br>" +
                                 "Each activity contains an array of items inside <code>medData</code>, " +
                                 "which may be used to store structured content under an item's <code>type</code>. " +
                                 "An item provides a separate field for each generic data type, and can store " +
                                 "a numeric value in <code>value</code>, a string value in <code>textValue</code>, " +
                                 "a boolean value in <code>boolValue</code>, and a date value in <code>dateValue</code>. " +
                                 "The content inside these properties is validated against the collection of tags " +
                                 "of type <code>MEDDATA</code> (see /2/tag for further details). " +
                                 "In case the <code>type</code> is not found among the existing tags or " +
                                 "among the list of static tags, " +
                                 "the first item of that type pushed to the interface will create a new tag. " +
                                 "If this is not wanted the <code>noTagCreation</code> flag may be set on the item " +
                                 "(i.e. if the type will likely not be re-used in the future). " +
                                 "The new tag will contain a new validation configuration fixing the structure of any item " +
                                 "of the same type being posted to the API in the future. " +
                                 "I.e. if the new item contains only a <code>textValue</code>, any item of the same type " +
                                 "which is pushed in the future needs to contain a <code>textValue</code>, or will get rejected." +
                                 "<br><br>" +
                                 "Example 1<br>No <code>MEDDATA</code> tag exists with <code>title:'EXAMPLE1'</code>. The first request made to <code>/2/meddata</code> posts " +
                                 '<pre>{actType:"MEDDATA", ..., medData:[{ type:"EXAMPLE1", textValue:"test" }]}</pre>' +
                                 "A second requests tries to post " +
                                 '<pre>{actType:"MEDDATA", ..., medData:[{ type:"EXAMPLE1", value:123456 }]}</pre>' +
                                 "The second request will get rejected as no <code>textValue</code> is set on the item. " +
                                 "A query to <code>/2/tag</code> will return a tag which prevents the second request to succeed." +
                                 '<pre>{type:"MEDDATA", title:"EXAMPLE1", ..., medDataItemConfig:[{ dataType:"STRING", validFromIncl:"DATE_OF_FIRST_REQUEST" }]}</pre>' +
                                 "<br><br>" +
                                 "Example 2<br>No <code>MEDDATA</code> tag exists with <code>title:'EXAMPLE2'</code>. The first request made to <code>/2/meddata</code> posts " +
                                 '<pre>{actType:"MEDDATA", ..., medData:[{ type:"EXAMPLE2", textValue:"test", noTagCreation:true }]}</pre>' +
                                 "A second requests tries to post " +
                                 '<pre>{actType:"MEDDATA", ..., medData:[{ type:"EXAMPLE2", value:123456, noTagCreation:true }]}</pre>' +
                                 "The second request will succeed as the flag <code>noTagCreation</code> was set on the first item. " +
                                 "Hence, a query to <code>/2/tag</code> returns <b>no</b> tag with <code>title:'EXAMPLE2'</code>, " +
                                 "and the second request is not validated against any tag." +
                                 "<br><br>" +
                                 "Additional functions exposed on this endpoint:<ul>" +
                                 "<li>" +
                                 "" +
                                 "Get all activities linked to a specific contract. " +
                                 "Required parameters are <code>patientId</code> and <code>_id</code> of the contract. " +
                                 "Other query parameters are free to choose. E.g.<br>" +
                                 "<pre>/2/meddata/:getActivitiesLinkedToContract <br>" +
                                 "POST { patientId:\"5dfd3210b832a21249999234\", _id:\"5afd4c40b83294c249999999\" }</pre>" +
                                 "</li>" +
                                 "" +
                                 "</ul>"
                }
            },
            i18n = Y.doccirrus.i18n,
            // get default formats
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
            BOOLEAN_TRUE = i18n( 'general.BOOLEAN_TRUE' ),
            BOOLEAN_FALSE = i18n( 'general.BOOLEAN_FALSE' ),
            GREATERTHAN_OR_EQUAL = i18n( 'general.GREATERTHAN_OR_EQUAL' ),
            LESSTHAN_OR_EQUAL = i18n( 'general.LESSTHAN_OR_EQUAL' ),
            RANGETO = i18n( 'general.RANGETO' ),
            ENUMOR = i18n( 'general.ENUMOR' ),
            CHARACTERS = i18n( 'validations.message.CHARACTERS' ),
            // TIME_FORMAT = i18n( 'general.TIME_FORMAT' ),

            types = {},
            /**
             * All actTypes related to MedData.
             * @type {string[]}
             */
            medDataBiometrics = Object.freeze( {
                WEIGHT: 'WEIGHT',
                HEIGHT: 'HEIGHT',
                SMOKER: 'SMOKER',
                AGE: 'AGE',
                BMI: 'BMI',
                BLOODPRESSURE: 'BLOODPRESSURE',
                LDL: 'LDL',
                HBA1C: 'HBA1C',
                EGFR: 'EGFR',
                LAST_MENSTRUATION: 'LAST_MENSTRUATION',
                LAST_MENSTRUATION_P: 'LAST_MENSTRUATION_P',
                DUE_DATE: 'DUE_DATE',
                WEEK_AND_DAY_CORRECTION: 'WEEK_AND_DAY_CORRECTION',
                MATERNITY_LEAVE_DATE: 'MATERNITY_LEAVE_DATE',
                CYCLE_LENGTH: 'CYCLE_LENGTH',
                END_OF_PREGNANCY: 'END_OF_PREGNANCY',
                HEAD_CIRCUMFERENCE: 'HEAD_CIRCUMFERENCE',
                VACCINATION: 'VACCINATION'
            } ),
            medDataBiometricsSwiss = Object.freeze({
                ATHLETE: 'ATHLETE',
                DRIVER: 'DRIVER',
                HEPATIC_INSUFFICIENCY: 'HEPATIC_INSUFFICIENCY',
                RENAL_FAILURE: 'RENAL_FAILURE'
            }),
            medDataSymptoms = Object.freeze( {
                DIZZINESS: 'DIZZINESS',
                BLURRED_VISION: 'BLURRED_VISION',
                FALL: 'FALL',
                ANOREXIA: 'ANOREXIA',
                DIARRHEA: 'DIARRHEA',
                VOMIT: 'VOMIT',
                HEADACHE: 'HEADACHE',
                STOMACH_DISCOMFORT: 'STOMACH_DISCOMFORT',
                DRY_MOUTH: 'DRY_MOUTH',
                DIFFICULTIES_SWALLOWING: 'DIFFICULTIES_SWALLOWING',
                HEARTBURN: 'HEARTBURN',
                NAUSEA: 'NAUSEA',
                CONSTIPATION: 'CONSTIPATION',
                SKIN_RASH: 'SKIN_RASH',
                ITCHING: 'ITCHING',
                SWOLLEN_LEGS: 'SWOLLEN_LEGS',
                MUSCLE_PAIN: 'MUSCLE_PAIN',
                TENDENCY_TO_BRUISES: 'TENDENCY_TO_BRUISES',
                NOSEBLEEDS: 'NOSEBLEEDS',
                BLEEDING_GUMS: 'BLEEDING_GUMS',
                ANTICHOLINERGIC_SYMPTOMS: 'ANTICHOLINERGIC_SYMPTOMS',
                BREATHING_PROBLEMS: 'BREATHING_PROBLEMS',
                HEART_AND_BLOOD_PRESSURE_PROBLEMS: 'HEART_AND_BLOOD_PRESSURE_PROBLEMS',
                INSOMNIA: 'INSOMNIA',
                SEXUAL_DYSFUNCTION: 'SEXUAL_DYSFUNCTION',
                OTHER: 'OTHER'
            } ),
            medDataAlimentations = Object.freeze( {
                MILK: 'MILK',
                WATER_WITH_HIGH_CA2_LEVEL: 'WATER_WITH_HIGH_CA2_LEVEL',
                COFFEE: 'COFFEE',
                TEE: 'TEE',
                COLA_MATE: 'COLA_MATE',
                ENERGY_DRINK: 'ENERGY_DRINK',
                BITTER_CHOCOLATE_LARGE_AMOUNT: 'BITTER_CHOCOLATE_LARGE_AMOUNT',
                GRAPEFRUIT_JUICE: 'GRAPEFRUIT_JUICE',
                GOJI_BERRY: 'GOJI_BERRY',
                LIQUORICE: 'LIQUORICE',
                GRILLED_MEAT: 'GRILLED_MEAT',
                CHEESE: 'CHEESE',
                SALAMI: 'SALAMI',
                ALCOHOL: 'ALCOHOL',
                SOY_SAUCES: 'SOY_SAUCES',
                STOCK_CUBE: 'STOCK_CUBE',
                LETTUCE: 'LETTUCE',
                SPINACH: 'SPINACH',
                BROCCOLI: 'BROCCOLI',
                CRANBERRY: 'CRANBERRY',
                CABBAGE: 'CABBAGE'
            } ),
            medDataDietarySupplement = Object.freeze( {
            } ),
            medDataIndividualParameters = Object.freeze( {
                ETHNICITY: 'ETHNICITY',
                PREGNANT: 'PREGNANT',
                BREAST_FEEDING: 'BREAST_FEEDING',
                DRUG_COMPILATION: 'DRUG_COMPILATION',
                LiverInsufficiency: 'LiverInsufficiency',
                CKDStage: 'CKDStage',
                CYP2C19: 'CYP2C19',
                CYP2D6: 'CYP2D6',
                OATP1B1: 'OATP1B1',
                CKDStage1: 'CKDStage1',
                CKDStage2: 'CKDStage2',
                CKDStage3: 'CKDStage3',
                CKDStage4: 'CKDStage4',
                CKDStage5: 'CKDStage5',
                hypernatremia: 'hypernatremia',
                hyponatremia: 'hyponatremia',
                hypokalemia: 'hypokalemia',
                hyperkalemia: 'hyperkalemia',
                hypocalcemia: 'hypocalcemia',
                hypercalcemia: 'hypercalcemia',
                hypomagnesemia: 'hypomagnesemia',
                hypermagnesemia: 'hypermagnesemia',
                Potassium: 'Potassium',
                Sodium: 'Sodium',
                Calcium: 'Calcium',
                Magnesium: 'Magnesium'
            } ),
            medDataAllergies = Object.freeze( {
                VCG263: 'VCG263',
                VCG88499: 'VCG88499',
                VCG88704: 'VCG88704',
                VCG63359: 'VCG63359',
                VCG63768: 'VCG63768',
                VCG63360: 'VCG63360',
                VCG88497: 'VCG88497',
                VCG63361: 'VCG63361',
                VCG7C001: 'VCG7C001',
                VCG88561: 'VCG88561',
                VCG63363: 'VCG63363',
                VCG88462: 'VCG88462',
                VCG63415: 'VCG63415',
                VCG058: 'VCG058',
                VCG88460: 'VCG88460',
                VCG88458: 'VCG88458',
                VCG90057: 'VCG90057',
                VCG63365: 'VCG63365',
                VCG88720: 'VCG88720',
                VCG88613: 'VCG88613',
                VCG63366: 'VCG63366',
                VCG63367: 'VCG63367',
                VCG88567: 'VCG88567',
                VCG88569: 'VCG88569',
                VCG88568: 'VCG88568',
                VCG89389: 'VCG89389',
                VCG63368: 'VCG63368',
                VCG63411: 'VCG63411',
                VCG88510: 'VCG88510',
                VCG63664: 'VCG63664',
                VCG63370: 'VCG63370',
                VCG63371: 'VCG63371',
                VCG88527: 'VCG88527',
                VCG1J400: 'VCG1J400',
                VCG88502: 'VCG88502',
                VCG88498: 'VCG88498',
                VCG69575: 'VCG69575',
                VCG69571: 'VCG69571',
                VCG69576: 'VCG69576',
                VCG69573: 'VCG69573',
                VCG69572: 'VCG69572',
                VCG69574: 'VCG69574',
                VCG69570: 'VCG69570',
                VCG63372: 'VCG63372',
                VCG88503: 'VCG88503',
                VCG88504: 'VCG88504',
                VCG88505: 'VCG88505',
                VCG8CE05: 'VCG8CE05',
                VCG63373: 'VCG63373',
                VCG091C9: 'VCG091C9',
                VCG63374: 'VCG63374',
                VCG63375: 'VCG63375',
                VCG63446: 'VCG63446',
                VCG88509: 'VCG88509',
                VCG8A391: 'VCG8A391',
                VCG89391: 'VCG89391',
                VCG89075: 'VCG89075',
                VCG89390: 'VCG89390',
                VCG52D: 'VCG52D',
                VCG88233: 'VCG88233',
                VCG88232: 'VCG88232',
                VCG88953: 'VCG88953',
                VCG88946: 'VCG88946',
                VCG082: 'VCG082',
                VCG081: 'VCG081',
                VCG089: 'VCG089',
                VCG0U91: 'VCG0U91',
                VCG63767: 'VCG63767',
                VCG6J123: 'VCG6J123',
                VCG634A7: 'VCG634A7',
                VCG63377: 'VCG63377',
                VCG88543: 'VCG88543',
                VCG192: 'VCG192',
                VCG63382: 'VCG63382',
                VCG88529: 'VCG88529',
                VCG63383: 'VCG63383',
                VCG88951: 'VCG88951',
                VCG7970A: 'VCG7970A',
                VCG6341H: 'VCG6341H',
                VCG6341T: 'VCG6341T',
                VCG88466: 'VCG88466',
                VCG63J16: 'VCG63J16',
                VCG633A8: 'VCG633A8',
                VCG63385: 'VCG63385',
                VCG63386: 'VCG63386',
                VCG884A4: 'VCG884A4',
                VCG63387: 'VCG63387',
                VCG65799: 'VCG65799',
                VCG63388: 'VCG63388',
                VCG63389: 'VCG63389',
                VCG88501: 'VCG88501',
                VCG1J398: 'VCG1J398',
                VCG8AN20: 'VCG8AN20',
                VCG63390: 'VCG63390',
                VCG63391: 'VCG63391',
                VCG88235: 'VCG88235',
                VCG88239: 'VCG88239',
                VCG63392: 'VCG63392',
                VCG88606: 'VCG88606',
                VCG63393: 'VCG63393',
                VCG051A: 'VCG051A',
                VCG92728: 'VCG92728',
                VCG63394: 'VCG63394',
                VCG63395: 'VCG63395',
                VCG63445: 'VCG63445',
                VCG63448: 'VCG63448',
                VCG63447: 'VCG63447',
                VCG88600: 'VCG88600',
                VCG88496: 'VCG88496',
                VCG88495: 'VCG88495',
                VCG051PM: 'VCG051PM',
                VCG63397: 'VCG63397',
                VCG63707: 'VCG63707',
                VCG89204: 'VCG89204',
                VCG63381: 'VCG63381',
                VCG8PI04: 'VCG8PI04',
                VCG63398: 'VCG63398',
                VCG63399: 'VCG63399',
                VCG63449: 'VCG63449',
                VCG88494: 'VCG88494',
                VCG886A3: 'VCG886A3',
                VCG44A01: 'VCG44A01',
                VCG63400: 'VCG63400',
                VCG88490: 'VCG88490',
                VCG63761: 'VCG63761',
                VCG88461: 'VCG88461',
                VCG63401: 'VCG63401',
                VCG88234: 'VCG88234',
                VCG63402: 'VCG63402',
                VCG88923: 'VCG88923',
                VCG63403: 'VCG63403',
                VCG88547: 'VCG88547',
                VCG88531: 'VCG88531',
                VCG63428: 'VCG63428',
                VCG88507: 'VCG88507',
                VCG88506: 'VCG88506',
                VCG88508: 'VCG88508',
                VCG78: 'VCG78',
                VCG63405: 'VCG63405',
                VCG6340J: 'VCG6340J',
                VCG63406: 'VCG63406',
                VCG63407: 'VCG63407',
                VCG89203: 'VCG89203',
                VCG88537: 'VCG88537',
                VCG63408: 'VCG63408',
                VCG89388: 'VCG89388',
                VCG1J388: 'VCG1J388',
                VCG1J399: 'VCG1J399',
                VCG63523: 'VCG63523',
                VCG63409: 'VCG63409',
                VCG8852T: 'VCG8852T',
                VCG63618: 'VCG63618'
            } ),
            gravidogrammDataTypes = Object.freeze( {
                WEEK_AND_DAY_OF_PREGNANCY: 'WEEK_AND_DAY_OF_PREGNANCY',
                WEEK_AND_DAY_CORRECTION: 'WEEK_AND_DAY_CORRECTION',

                UTERINE_DISTANCE: 'UTERINE_DISTANCE',
                UTERINE_DISTANCE_2: 'UTERINE_DISTANCE_2',
                UTERINE_DISTANCE_3: 'UTERINE_DISTANCE_3',
                UTERINE_DISTANCE_4: 'UTERINE_DISTANCE_4',
                UTERINE_DISTANCE_5: 'UTERINE_DISTANCE_5',

                FOETAL_POSITION: 'FOETAL_POSITION',
                FOETAL_POSITION_2: 'FOETAL_POSITION_2',
                FOETAL_POSITION_3: 'FOETAL_POSITION_3',
                FOETAL_POSITION_4: 'FOETAL_POSITION_4',
                FOETAL_POSITION_5: 'FOETAL_POSITION_5',

                HEARTBEAT_PRESENT: 'HEARTBEAT_PRESENT',
                HEARTBEAT_PRESENT_2: 'HEARTBEAT_PRESENT_2',
                HEARTBEAT_PRESENT_3: 'HEARTBEAT_PRESENT_3',
                HEARTBEAT_PRESENT_4: 'HEARTBEAT_PRESENT_4',
                HEARTBEAT_PRESENT_5: 'HEARTBEAT_PRESENT_5',

                MOVEMENT_PRESENT: 'MOVEMENT_PRESENT',
                MOVEMENT_PRESENT_2: 'MOVEMENT_PRESENT_2',
                MOVEMENT_PRESENT_3: 'MOVEMENT_PRESENT_3',
                MOVEMENT_PRESENT_4: 'MOVEMENT_PRESENT_4',
                MOVEMENT_PRESENT_5: 'MOVEMENT_PRESENT_5',

                EDEMA: 'EDEMA',
                VARICOSIS: 'VARICOSIS',
                CHECKUP_WEIGHT: 'CHECKUP_WEIGHT',
                BLOODPRESSUREP: 'BLOODPRESSUREP',
                HAEMOGLOBIN: 'HAEMOGLOBIN',
                US_PROTEIN: 'US_PROTEIN',       //  urine sediments
                US_SUGAR: 'US_SUGAR',
                US_NITRITE: 'US_NITRITE',
                US_BLOOD: 'US_BLOOD',
                PH_URINE: "PH_URINE",
                VAGINAL_EXAM: 'VAGINAL_EXAM',
                PH_VAGINAL: 'PH_VAGINAL',
                CX_VAGINAL: 'CX_VAGINAL',
                RISK_CATEGORY: 'RISK_CATEGORY',
                THERAPY: 'THERAPY'
            } ),
            percentileCurveDataTypes = Object.freeze( {
                BLOODPRESSURE: 'BLOODPRESSURE',
                WEIGHT: 'WEIGHT',
                HEIGHT: 'HEIGHT',
                HEAD_CIRCUMFERENCE: 'HEAD_CIRCUMFERENCE',
                BMI: 'BMI'
            } ),
            medDataTypes = Object.freeze(Object.assign({},
                medDataBiometrics,
                medDataSymptoms,
                medDataAlimentations,
                medDataDietarySupplement,
                medDataBiometricsSwiss,
                medDataIndividualParameters,
                medDataAllergies,
                gravidogrammDataTypes,
                percentileCurveDataTypes
            )),
            medDataCategories = Object.freeze( {
                BIOMETRICS: 'BIOMETRICS',
                ALLERGIES: 'ALLERGIES',
                SYMPTOMS: 'SYMPTOMS',
                ALIMENTATIONS: 'ALIMENTATIONS',
                ACTIVEINGREDIENTS: 'ACTIVEINGREDIENTS',
                GRAVIDOGRAMM: 'GRAVIDOGRAMM',
                PERCENTILECURVE: 'PERCENTILECURVE'
            } ),
            medDataCategoriesNonPublic = Object.freeze( {
                GRAVIDOGRAMM: 'GRAVIDOGRAMM',
                PERCENTILECURVE: 'PERCENTILECURVE'
            } ),

            /**
             * Primary type, defining the validation and storage routines for each med data item.
             * @type {Readonly<{ENUM: string, DATE: string, NUMBER: string, STRING: string, TIMEDIFF: string, INT: string, BOOLEAN: string}>}
             */
            medDataItemDataTypes = Object.freeze( {
                ANY: 'ANY', // fill out any values
                STRING_OR_NUMBER: 'STRING_OR_NUMBER', // stored in textValue or value (OLD default of inSuite)
                STRING: 'STRING', // stored in textValue
                STRING_ENUM: 'STRING_ENUM', // stored in textValue, validated by list
                NUMBER_INT: 'NUMBER_INT', // stored in value
                NUMBER_TIMEDIFF: 'NUMBER_TIMEDIFF', // stored in value`
                NUMBER_FLOAT: 'NUMBER_FLOAT', // stored in value,
                NUMBER_FORMULA: 'NUMBER_FORMULA', // stored in value
                BOOLEAN: 'BOOLEAN', // stored in boolValue
                DATE: 'DATE', // stored in dateValue,
                DATE_TIME: 'DATE_TIME' // stored in dateValue
            } ),

            // class linkers, will become ES6 imports later on
            SchemaUtils = Y.doccirrus.schemautils,
            ActivitySchema = Y.doccirrus.schemas.activity.ActivitySchema;

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * An error message interface for config schema validation errors.
         * @param {object} error
         * @param {string} error.message
         * @param {{data: {}}} error.options
         * @constructor
         */
        function MedDataItemConfigSchemaValidationError( error ) {
            this.message = error.message;
            /**
             * Format of the i18n data tag to fill out values in template strings.
             * @type {{data: {}}}
             */
            this.options = Object.assign( {
                data: {}
            }, error.options );
        }

        MedDataItemConfigSchemaValidationError.prototype = {};

        /**
         * Chart entry to be displayed in MedDataTableEditorModel.
         * @param {object} props
         * @param {boolean} [props.hasChartValue=false]
         * @param {string} props.valueKey
         * @param {string|undefined} [props.value2Key]
         * @param {number} props.value
         * @param {string|undefined} [props.value2]
         * @constructor
         */
        function MedDataItemChartValue( props ) {
            this.hasChartValue = props.hasChartValue || false;
            this.valueKey = props.valueKey;
            this.value2Key = props.value2Key;
            this.value = props.value;
            this.value2 = props.value2;
        }

        MedDataItemChartValue.prototype = {};

        /**
         * Configuration of a MedDataItem stored within a tag.
         * Each configuration has a validFrom date, which is used to validate items
         * stored with reference to these tags.
         * @param {object} props
         * @param {Date} props.validFromIncl
         * @param {string} [props.dataType]
         * @param {number} [props.valueRoundingMethod]
         * @param {number} [props.valueLeadingZeros]
         * @param {number} [props.valueDigits]
         * @param {number} [props.valueMinValue]
         * @param {number} [props.valueMaxValue]
         * @param {number} [props.textValueMinLength]
         * @param {number} [props.textValueMaxLength]
         * @param {RegExp|string} [props.textValueValidationRegExp]
         * @param {function(textValue: string): (MedDataItemConfigSchemaValidationError[])} [props.textValueValidationFunction]
         * @param {function(): string} [props.textValuePlaceholderFunction]
         * @param {function(textValue: string): string} [props.textValueFormattingFunction]
         * @param {function(medDataItem: MedDataItemSchema): (null|MedDataItemChartValue)} [props.chartValueFormattingFunction] if providing this function, the item may be rendered in a chart
         * @param {string|number|number[]|string[]|({id: string, text: string}[])|(function(): (string[]|{id: string, text: string}[]))} [props.enumValueCollection]
         * @param {string|number|number[]|string[]|({id: string, text: string}[])|(function(): (Promise<({id: string, text: string}[])>))} [props.enumValueCollectionGenerator]
         * @param {string} [props.dateValueFormat]
         * @param {Date|string} [props.dateValueMinDate]
         * @param {Date|string} [props.dateValueMaxDate]
         * @param {string} [props.valueFormulaExpression]
         * @param {Object[]} [props.valueFormulaScope]
         * @param {Object[]} [props.manualCalculation]
         * @param {boolean} [props.isOptional=false]
         * @param {function($event: object, observable: function): void} [props.onTextValueEnumSelect2Write] optional function to be called, e.g. in the select2 write method
         * @param {MedDataItemTemplateSchema} [props.template]
         * @param {MedDataItemTemplateSchema} [templateOverride]
         * @param {function(value: string): string} [props.formatMedDataItemForPDFPostProcessor] optional function to post-process function while formatting for PDF
         * @constructor
         */
        function MedDataItemConfigSchema( props, templateOverride ) {
            this.template = (templateOverride instanceof MedDataItemTemplateSchema)
                ? templateOverride
                : (props.template instanceof MedDataItemTemplateSchema)
                    ? props.template
                    : undefined;
            this.validFromIncl = props.validFromIncl;
            this.validForUnit = props.validForUnit;
            this.dataType = props.dataType;
            this.valueRoundingMethod = props.valueRoundingMethod;
            this.valueLeadingZeros = props.valueLeadingZeros;
            this.valueDigits = props.valueDigits;
            this.valueMinValue = props.valueMinValue;
            this.valueMaxValue = props.valueMaxValue;
            this.textValueMinLength = props.textValueMinLength;
            this.textValueMaxLength = props.textValueMaxLength;
            this.textValueValidationRegExp = props.textValueValidationRegExp;
            this.textValueValidationFunction = props.textValueValidationFunction;
            this.textValuePlaceholderFunction = props.textValuePlaceholderFunction;
            this.textValueFormattingFunction = props.textValueFormattingFunction;
            this.chartValueFormattingFunction = props.chartValueFormattingFunction;
            this.enumValueCollectionOptions = (props.enumValueCollectionOptions)
                // if a collection of objects already exists, use that
                // (i.e. when constructed form another config, or for static tags)
                ? props.enumValueCollectionOptions
                // when coming from the database, we have to rely on the id collection instead
                : props.enumValueCollection;
            this.enumValueCollectionGenerator = props.enumValueCollectionGenerator;
            this.dateValueFormat = props.dateValueFormat;
            this.dateValueMinDate = props.dateValueMinDate;
            this.dateValueMaxDate = props.dateValueMaxDate;
            this.valueFormulaExpression = props.valueFormulaExpression;
            this.valueFormulaScope = props.valueFormulaScope;
            this.manualCalculation = props.manualCalculation;
            this.isOptional = props.isOptional;

            // internal formatting overrides
            this.formatMedDataItemForPDFPostProcessor = props.formatMedDataItemForPDFPostProcessor;

            // event functions
            this.onTextValueEnumSelect2Write = props.onTextValueEnumSelect2Write;
        }

        MedDataItemConfigSchema.prototype = {};

        /**
         * As multiple data types may be floating point types,
         * this helper function can be used to simply test for floating point.
         * @return {boolean}
         */
        MedDataItemConfigSchema.prototype.isValueFloatingPoint = function isValueFloatingPoint() {
            switch( this.dataType ) {
                case medDataItemDataTypes.NUMBER_FLOAT:
                case medDataItemDataTypes.NUMBER_FORMULA:
                case medDataItemDataTypes.STRING_OR_NUMBER:
                    return true;
            }
            return false;
        };

        /**
         * Returns true, if the dataType of this config is numeric.
         * @return {boolean}
         */
        MedDataItemConfigSchema.prototype.isNumericDataType = function isNumericDataType() {
            switch( this.dataType ) {
                case medDataItemDataTypes.STRING_OR_NUMBER:
                case medDataItemDataTypes.NUMBER_INT:
                case medDataItemDataTypes.NUMBER_TIMEDIFF:
                case medDataItemDataTypes.NUMBER_FLOAT:
                case medDataItemDataTypes.NUMBER_FORMULA:
                    return true;
            }
            return false;
        };

        /**
         * Returns true, if the dataType of this config is numeric or if a chartValueFormattingFunction is provided.
         * @return {boolean}
         */
        MedDataItemConfigSchema.prototype.hasChartValue = function hasChartValue() {
            return this.isNumericDataType() || typeof this.chartValueFormattingFunction === "function";
        };

        /**
         * Returns the number of significant digits for that entry.
         * @param {object} [options]
         * @param {number} [options.digits=2|0] optional number of digits to override => if you set this, why are you using this function??
         * @param {boolean} [options.fullPrecision=false] fullPrecision will set the number of digits to the precision given in value
         * @param {number} [options.value] value, in case the fullPrecision-mode is enabled
         * @return {number}
         */
        MedDataItemConfigSchema.prototype.getSignificantDigits = function getSignificantDigits( options ) {
            var
                digits = options && options.digits,
                value = options && options.value,
                fullPrecision = (options && options.fullPrecision) || false,
                significantDigits;

            switch( true ) {
                // full-precision mode: return the number of digits the value provides
                case fullPrecision && typeof value === "number":
                    significantDigits = (Math.floor( value ) === value) ? 0 : value.toString().split( "." )[1].length || 0;
                    break;

                // allow overrides by the given option parameter
                case typeof digits === "number":
                    significantDigits = digits;
                    break;

                // integers have NO significant digets
                case this.dataType === medDataItemDataTypes.NUMBER_INT:
                case this.dataType === medDataItemDataTypes.NUMBER_TIMEDIFF:
                    significantDigits = 0;
                    break;

                // by default, use the one stored in the config
                case typeof this.valueDigits === "number":
                    significantDigits = this.valueDigits;
                    break;

                // as fallback use 2 or zero depending on the data type (FLOAT/INT)
                default:
                    significantDigits = (this.isValueFloatingPoint()) ? 2 : 0;
            }

            return significantDigits;
        };

        /**
         * Returns the rounding method used to this entry.
         * @return {function(value: number, digits: number): number}
         */
        MedDataItemConfigSchema.prototype.getValueRoundingMethod = function getValueRoundingMethod() {
            var
                self = this,
                /**
                 * @type {function(v: number): number}
                 */
                processingFunction;

            // determine the processing function (round, truncate, ceil, floor)
            if( self.valueRoundingMethod > 0 ) {
                processingFunction = Math.ceil;
            } else if( self.valueRoundingMethod < 0 ) {
                processingFunction = Math.floor;
            } else if( self.valueRoundingMethod === 0 ) {
                processingFunction = Math.round;
            } else {
                processingFunction = Math.trunc;
            }

            /**
             * @param {number} value
             * @param {number} [digits=0] default behavior for all Math.floor/ceil/trunc/round functions is to act on the integer
             * @returns {string}
             */
            return function( value, digits ) {
                var exponent = Math.pow( 10, typeof digits === "number" ? digits : 0 );
                return parseInt( processingFunction( value * exponent ), 10 ) / exponent;
            };
        };

        /**
         * @param {PatientModel} patientData
         * @param {MedDataItemConfigSchemaValidationError[]|undefined} errorMessages
         * @param {object} options
         * @param {MedDataItemSchema} options.extendedMedData
         * @return {number|NaN}
         */
        MedDataItemConfigSchema.prototype.getValueFormulaExpressionValue = function getValueFormulaExpressionValue( patientData, errorMessages, options ) {
            var
                mathNode,
                math = Y.doccirrus.commonutils.getMathJs(),
                scope = {};

            try {
                scope = this.getValueFormulaScope( patientData, errorMessages, options );

                mathNode = math.parse( this.valueFormulaExpression );

                return mathNode.compile().evaluate( scope );
            } catch( error ) {
                this.appendValidationErrorMessage(
                    errorMessages,
                    "FORMULA_ERROR",
                    { ERROR: error.toString() }
                );
            }

            return Number.NaN;
        };

        /**
         * Validates the hole medDataItem according to this config.
         * Use this function instead of the individual validation functions to validate the whole MedDataItem object,
         * and don't have any hassles with data type resolution.
         * @param {MedDataItemSchema} medDataItem
         * @param {{message: string, options: (object|undefined)}[]|undefined} [errorMessages]
         * @return {Promise<boolean>}
         */
        MedDataItemConfigSchema.prototype.isMedDataItemValid = function isMedDataItemValid( medDataItem, errorMessages ) {
            switch( this.dataType ) {
                // any means any... no exceptions here
                // (may be used by external dev through REST/2/ to store arbitrary values
                case medDataItemDataTypes.ANY:
                    return Promise.resolve( true );

                // legacy fallback (string or number without validation)
                case medDataItemDataTypes.STRING_OR_NUMBER:
                    return Promise
                        .all( [
                            this.isMedDataItemTextValueValid( medDataItem, errorMessages ),
                            this.isMedDataItemValueValid( medDataItem, errorMessages )
                        ] )
                        .then( function onAllValidationsDone( results ) {
                            return results.some( function forEachResult( result ) {
                                var isValid = result === true;

                                if ( isValid ) {
                                    /**
                                     * If any of the two was valid then we can AND need to
                                     * clear the errorMessages of the one that failed
                                     *
                                     * NOTE: We need to clear the original array passed by reference
                                     * so: use splice instead of resetting the reference array
                                     */
                                    errorMessages.splice(0, errorMessages.length);
                                }

                                return isValid;
                            } );
                        } );

                case medDataItemDataTypes.STRING:
                case medDataItemDataTypes.STRING_ENUM:
                    return this.isMedDataItemTextValueValid( medDataItem, errorMessages );

                // numeric data types
                case medDataItemDataTypes.NUMBER_INT:
                case medDataItemDataTypes.NUMBER_TIMEDIFF:
                case medDataItemDataTypes.NUMBER_FLOAT:
                case medDataItemDataTypes.NUMBER_FORMULA:
                    return this.isMedDataItemValueValid( medDataItem, errorMessages );

                // boolean
                case medDataItemDataTypes.BOOLEAN:
                    return this.isMedDataItemBoolValueValid( medDataItem, errorMessages );

                // date
                case medDataItemDataTypes.DATE:
                case medDataItemDataTypes.DATE_TIME:
                    return this.isMedDataItemDateValueValid( medDataItem, errorMessages );
            }

            // by default, the value is invalid
            return Promise.resolve( false );
        };

        /**
         * Validates, if the medDataItem has a valid value (number).
         * @param {MedDataItemSchema} medDataItem
         * @param {MedDataItemConfigSchemaValidationError[]} [errorMessages]
         * @return {Promise<boolean>}
         */
        MedDataItemConfigSchema.prototype.isMedDataItemValueValid = function isMedDataItemValueValid( medDataItem, errorMessages  ) {
            var parsedValue;

            // convert value into number, before doing any validation
            switch( true ) {
                case typeof medDataItem.value === "string":
                    // if the input is a string, check that the input is a pure number which an be parsed
                    if( medDataItem.value.match( Y.doccirrus.regexp.decimal ) === null ) {
                        this.appendValidationErrorMessage( errorMessages, "NUMBER_ERR" );
                        return Promise.resolve( false );
                    }
                    parsedValue = parseFloat( medDataItem.value );
                    break;
                case typeof medDataItem.value === "number":
                    parsedValue = medDataItem.value;
                    break;

                case medDataItem.value === null || medDataItem.value === undefined:
                    if( this.isOptional ) {
                        // an optional field may be "undefined" => immediately resolve
                        return Promise.resolve( true );
                    }
                // fall-through
                default:
                    this.appendValidationErrorMessage( errorMessages, "NUMBER_ERR" );
                    return Promise.resolve( false );
            }

            // if the parsed value is NaN => invalid for all cases
            if( isNaN( parsedValue ) ) {
                this.appendValidationErrorMessage( errorMessages, "DECIMALNUMBER_ERR" );
                return Promise.resolve( false );
            }

            switch( this.dataType ) {

                // 1) INTEGER types
                case medDataItemDataTypes.NUMBER_INT:
                case medDataItemDataTypes.NUMBER_TIMEDIFF:
                    // validate integer
                    switch( true ) {
                        case (parsedValue % 1 !== 0):
                            this.appendValidationErrorMessage( errorMessages, "NUMBER_NO_INT_ERR" );
                            return Promise.resolve( false );
                    }
                // NOTE: FALLTHROUGH to FLOAT TYPES for RANGE CHECKS!!!
                // 2) FLOAT types
                case medDataItemDataTypes.NUMBER_FLOAT:
                case medDataItemDataTypes.STRING_OR_NUMBER:
                    // validate the number
                    switch( true ) {
                        case (typeof this.valueMinValue === "number" && parsedValue < this.valueMinValue):
                            this.appendValidationErrorMessage(
                                errorMessages,
                                "NUMBER_BELOW_MIN_VALUE_ERR",
                                { VALUE: this.formatValue( this.valueMinValue ) }
                            );
                            return Promise.resolve( false );
                        case (typeof this.valueMaxValue === "number" && parsedValue > this.valueMaxValue):
                            this.appendValidationErrorMessage(
                                errorMessages,
                                "NUMBER_ABOVE_MAX_VALUE_ERR",
                                { VALUE: this.formatValue( this.valueMaxValue ) }
                            );
                            return Promise.resolve( false );
                        default:
                            // if we arrive here, the value is valid
                            return Promise.resolve( true );
                    }

                // 3) a formula is the exception, and has JUST the check for a numeric value
                case medDataItemDataTypes.NUMBER_FORMULA:
                    // a formula-output just needs to be a non-NaN number
                    return Promise.resolve( true );
            }

            return Promise.resolve( false );
        };

        /**
         * Validates, if the medDataItem has a valid textValue (string).
         * @param {MedDataItemSchema} medDataItem
         * @param {MedDataItemConfigSchemaValidationError[]} [errorMessages]
         * @param {boolean} [generatorFunctionExecuted=false]
         * @return {Promise<boolean>}
         */
        MedDataItemConfigSchema.prototype.isMedDataItemTextValueValid = function isMedDataItemTextValueValid( medDataItem, errorMessages , generatorFunctionExecuted) {
            var
                self = this,
                /**
                 * Storage for an optional output of custom textValue validation functions.
                 * I.e. those set up by static Tags defined in taglib-schema.common.js.
                 */
                textValueValidationFunctionResult = (typeof self.textValueValidationFunction === "function")
                    ? self.textValueValidationFunction.call( self, medDataItem.textValue )
                    : null,
                onTextValueValidationFunctionReturned = function onTextValueValidationFunctionReturned( results ) {
                    if( Array.isArray( results ) && results.length > 0 ) {
                        results.forEach( function forEachValidationFunctionError( error ) {
                            self.appendValidationErrorMessage( errorMessages, error );
                        } );
                        return Promise.resolve( false );
                    }
                    return Promise.resolve( true );
                };

            // datatype independent validations
            switch( true ) {
                /**
                 * A custom validation function overwrites any other validations.
                 * It should return an array of errors if the validation failed. Else, nothing / null, or anything else.
                 * The function may be asynchronous. In that case, the same counts for the resolved result.
                 */
                case (textValueValidationFunctionResult instanceof Promise):
                    return textValueValidationFunctionResult.then( onTextValueValidationFunctionReturned );
                case (Array.isArray( textValueValidationFunctionResult )):
                    return onTextValueValidationFunctionReturned( textValueValidationFunctionResult );

                case (this.isOptional && medDataItem.textValue === undefined):
                case (this.isOptional && medDataItem.textValue === null):
                case (this.isOptional && medDataItem.textValue === ""):
                    // an optional field may be "undefined" or empty => immediately resolve
                    return Promise.resolve( true );
                case (typeof medDataItem.textValue !== "string"):
                    self.appendValidationErrorMessage( errorMessages, "MISSING_MANDATORY_VALUE" );
                    return Promise.resolve( false );
            }

            switch( self.dataType ) {
                // validate according to the specs
                case medDataItemDataTypes.STRING:
                case medDataItemDataTypes.STRING_OR_NUMBER:
                    switch( true ) {
                        case (typeof self.textValueMinLength === "number" && medDataItem.textValue.length < self.textValueMinLength):
                            self.appendValidationErrorMessage(
                                errorMessages,
                                "TEXT_LENGTH_BELOW_MIN_VALUE_ERR",
                                { LENGTH: self.textValueMinLength.toFixed( 0 ) }
                            );
                            return Promise.resolve( false );
                        case (typeof this.textValueMaxLength === "number" && medDataItem.textValue.length > self.textValueMaxLength):
                            self.appendValidationErrorMessage(
                                errorMessages,
                                "TEXT_LENGTH_ABOVE_MAX_VALUE_ERR",
                                { LENGTH: self.textValueMaxLength.toFixed( 0 ) }
                            );
                            return Promise.resolve( false );
                        case (self.textValueValidationRegExp instanceof RegExp && medDataItem.textValue.match( self.textValueValidationRegExp ) === null):
                        case (typeof self.textValueValidationRegExp === "string" && medDataItem.textValue.match( new RegExp( self.textValueValidationRegExp, MedDataItemConfigSchema.DEFAULTREGEXPFLAGS ) ) === null):
                            self.appendValidationErrorMessage(
                                errorMessages,
                                "TEXT_NO_MATCH_WITH_REGEXP_ERR",
                                { REGEXP: self.textValueValidationRegExp.toString() }
                            );
                            return Promise.resolve( false );
                        default:
                            // if we arrive here, the value is valid
                            return Promise.resolve( true );
                    }

                // validate according to the list of pre-defined values
                case medDataItemDataTypes.STRING_ENUM:
                    switch( true ) {
                        case (typeof self.enumValueCollectionGenerator === "function" && !generatorFunctionExecuted):
                            // generator function for fetching the entries (async)
                            return self.enumValueCollectionGenerator()
                                .then( function onEnumValueCollectionItemsFetched( items ) {
                                    // store the values in the config
                                    self.enumValueCollectionOptions = items;

                                    // execute the test again
                                    return self.isMedDataItemTextValueValid( medDataItem, errorMessages, true );
                                } );
                        case (Array.isArray( self.enumValueCollection ) && self.enumValueCollection.indexOf( medDataItem.textValue ) === -1):
                            self.appendValidationErrorMessage(
                                errorMessages,
                                "TEXT_NOT_IN_ENUM_COLLECTION",
                                { VALUES: self.enumValueCollection.join( ", " ) }
                            );
                            return Promise.resolve( false );
                        default:
                            // if we arrive here, the value is valid
                            return Promise.resolve( true );
                    }
            }

            // if we arrive here, the value is valid
            return Promise.resolve( true );
        };

        /**
         * Validates, if the medDataItem has a valid dateValue (date).
         * @param {MedDataItemSchema} medDataItem
         * @param {MedDataItemConfigSchemaValidationError[]} [errorMessages]
         * @return {Promise<boolean>}
         */
        MedDataItemConfigSchema.prototype.isMedDataItemDateValueValid = function isMedDataItemDateValueValid( medDataItem , errorMessages ) {
            var
                moment = Y.doccirrus.commonutils.getMoment();

            switch( true ) {
                case (this.isOptional && medDataItem.dateValue === undefined):
                case (this.isOptional && medDataItem.dateValue === null):
                    // an optional field may be "undefined" => immediately resolve
                    return Promise.resolve( true );
                case (moment( medDataItem.dateValue ).isValid() === false):
                    this.appendValidationErrorMessage( errorMessages, "DATE_ERR" );
                    return Promise.resolve( false );
                case this.dateValueMinDate && !moment( medDataItem.dateValue ).isAfter( this.dateValueMinDate ):
                    this.appendValidationErrorMessage(
                        errorMessages,
                        "DATE_BELOW_MIN_DATE_ERR",
                        { DATE: this.formatDateValue( this.dateValueMinDate ) }
                    );
                    return Promise.resolve( false );
                case this.dateValueMaxDate && !moment( medDataItem.dateValue ).isBefore( this.dateValueMaxDate ):
                    this.appendValidationErrorMessage(
                        errorMessages,
                        "DATE_ABOVE_MAX_DATE_ERR",
                        { DATE: this.formatDateValue( this.dateValueMaxDate ) }
                    );
                    return Promise.resolve( false );
                default:
                    // if we arrive here, the value is valid
                    return Promise.resolve( true );
            }
        };

        /**
         * Validates, if the medDataItem has a valid boolValue (boolean).
         * @param {MedDataItemSchema} medDataItem
         * @param {MedDataItemConfigSchemaValidationError[]} [errorMessages]
         * @return {boolean}
         */
        MedDataItemConfigSchema.prototype.isMedDataItemBoolValueValid = function isMedDataItemBoolValueValid( medDataItem, errorMessages ) {
            if( typeof medDataItem.boolValue !== "boolean" ) {
                this.appendValidationErrorMessage( errorMessages, "BOOL_ERR" );
                return Promise.resolve( false );
            }
            return Promise.resolve( true );
        };

        /**
         * Creates the formula scope (variable definitions) from the patient's latestMedData,
         * and extends these with local overrides in option.extendedMedData
         * @param {PatientModel} patientData
         * @param {MedDataItemConfigSchemaValidationError[]|undefined} errorMessages
         * @param {object} options?
         * @param {MedDataItemSchema} options.extendedMedData?
         * @return {object}
         */
        MedDataItemConfigSchema.prototype.getValueFormulaScope = function getValueFormulaScope( patientData, errorMessages, options ) {
            var
                self = this,
                scopesNotAvailable = [],
                scope = {},

                // get the list of items
                latestMedDataItems = patientData && Array.isArray( patientData.latestMedData ) ? patientData.latestMedData : [],
                extendedMedDataItems = options && Array.isArray( options.extendedMedData ) ? options.extendedMedData : [];

            /**
             * If there are scopeItem values to take from medDataItems
             * (i.e. variables referring to medDataItems)
             * and the items are not defined it should validate as invalid.
             */
            self.valueFormulaScope.forEach( function( scopeItem ) {
                var
                    matchingLatestMedDataItem = latestMedDataItems.find( function( item ) {
                        return item.type === scopeItem.id;
                    } ),
                    matchingExtendedMedDataItem = extendedMedDataItems.find( function( item ) {
                        return item.type === scopeItem.id;
                    } ),
                    matchScope,
                    scopeValue;

                if( typeof matchingExtendedMedDataItem !== "undefined" ) {
                    // the overwriting extendedMedDataItem dominates
                    matchScope = matchingExtendedMedDataItem;
                } else if( typeof matchingLatestMedDataItem !== "undefined" ) {
                    // second comes the latestMedDataItem
                    matchScope = matchingLatestMedDataItem;
                }

                if( matchScope ) {
                    // convert date scopes to timestamps, if a dateValue is given for that entry
                    scopeValue = matchScope.dateValue ? (new Date( matchScope.dateValue ).getTime()) : matchScope.value;

                    // set the scope
                    scope[scopeItem.scopeName] = scopeValue;
                } else {
                    // nothing found => push to error
                    scopesNotAvailable.push( scopeItem.id );
                }
            } );

            /**
             * If some of the needed scopes to resolve the formula
             * were not found, it should return the proper validation message
             */
            if( scopesNotAvailable.length > 0 ) {
                self.appendValidationErrorMessage(
                    errorMessages,
                    "FORMULA_ERROR_SCOPE_NOT_FOUND",
                    { PROPERTIES: scopesNotAvailable.join( ', ' ) }
                );
            }

            return Object.assign( MedDataItemConfigSchema.getStaticScope(), scope );
        };

        MedDataItemConfigSchema.getStaticScope = function getStaticScope() {
            return {
                now: ( new Date().getTime() )
            };
        };

        /**
         * Helper function. If handing over an array and a message, the message gets appended.
         * If no array is passed, the message is ignored. In any case the input is returned.
         * @param {MedDataItemConfigSchemaValidationError[]|undefined} errorMessages
         * @param {MedDataItemConfigSchemaValidationError|string} error
         * @param {string} options
         * @return {MedDataItemConfigSchemaValidationError[]|undefined}
         */
        MedDataItemConfigSchema.prototype.appendValidationErrorMessage = function appendValidationErrorMessage( errorMessages, error, options ) {
            if( Array.isArray( errorMessages ) ) {
                // if the error is a simple string, convert that string into an error message
                if( typeof error === "string" ) {
                    error = new MedDataItemConfigSchemaValidationError( {
                        message: error,
                        options: {
                            data: options || {}
                        }
                    } );
                }

                // push the new error to the array, if an error message is given
                if( typeof error.message === "string" && error.message.length > 0 ) {
                    errorMessages.push( error );
                }
            }
            return errorMessages;
        };

        /**
         * This function is used in the UI to obtain an internally used
         * value for the smart value component.
         * @param {MedDataItemSchema} medDataItem
         * @returns {string}
         */
        MedDataItemConfigSchema.prototype.readMedDataItem = function readMedDataItem( medDataItem ) {
            var stringCollection = [];

            switch( this.dataType ) {
                case medDataItemDataTypes.ANY:
                case medDataItemDataTypes.STRING:
                case medDataItemDataTypes.STRING_ENUM:
                    return medDataItem.textValue;
                case medDataItemDataTypes.NUMBER_FLOAT:
                case medDataItemDataTypes.NUMBER_INT:
                case medDataItemDataTypes.NUMBER_TIMEDIFF:
                case medDataItemDataTypes.NUMBER_FORMULA:
                    return medDataItem.value;
                case medDataItemDataTypes.BOOLEAN:
                    return medDataItem.boolValue;
                case medDataItemDataTypes.DATE:
                case medDataItemDataTypes.DATE_TIME:
                    return medDataItem.dateValue;
                case medDataItemDataTypes.STRING_OR_NUMBER:
                    stringCollection.push( medDataItem.value );
                    stringCollection.push( medDataItem.textValue );
                    break;
            }

            // return the concatenation of non-empty values
            return stringCollection.filter( function filterEmptyValues( value ) {
                return value !== undefined && medDataItem.value !== null && String( value ).length > 0;
            } ).join( " " );
        };

        /**
         * This function is called from the UI to write back data entered through a *single*
         * input box into a medDataItem object with different data storage.
         * @param {MedDataItemSchema} medDataItem
         * @param {any} value
         */
        MedDataItemConfigSchema.prototype.writeMedDataItem = function writeMedDataItem( medDataItem, value) {
            var
                parsedValue,
                updateItemProp = function ( prop, value ) {
                    if ( typeof medDataItem[prop] === "function" ) {
                        medDataItem[prop]( value );
                    } else {
                        medDataItem[prop] = value;
                    }
                };

            switch( this.dataType ) {
                case medDataItemDataTypes.ANY:
                case medDataItemDataTypes.STRING:
                case medDataItemDataTypes.STRING_ENUM:
                    updateItemProp( 'textValue', value );
                    break;
                case medDataItemDataTypes.NUMBER_FLOAT:
                case medDataItemDataTypes.NUMBER_INT:
                case medDataItemDataTypes.NUMBER_TIMEDIFF:
                    parsedValue = parseFloat( value );
                    if( isNaN( parsedValue ) ) {
                        updateItemProp( 'value', undefined );
                    } else {
                        updateItemProp( 'value', value );
                    }
                    break;
                case medDataItemDataTypes.BOOLEAN:
                    updateItemProp( 'boolValue', value );
                    break;
                case medDataItemDataTypes.DATE:
                case medDataItemDataTypes.DATE_TIME:
                    updateItemProp( 'dateValue', value );
                    break;
                case medDataItemDataTypes.STRING_OR_NUMBER:
                    parsedValue = parseFloat( value );

                    if( isNaN( parsedValue ) ) {
                        // just update the textValue, and set the value to undefined
                        updateItemProp( 'textValue', value );
                        updateItemProp( 'value', undefined );
                    } else {
                        // update the numeric value and the textValue
                        updateItemProp( 'value', parsedValue );
                        updateItemProp( 'textValue', (typeof value === "string") ? value.substring( parsedValue.toString().length ).trim() : "" );
                    }
                    break;
            }
        };

        /**
         * Formats the values stored in a MedDataItem, depending on the given dataType in this config.
         * Use this function instead of using the type-specific formatting functions to save yourself
         * from having to do dataType checks, etc.
         * @param {MedDataItemSchema} medDataItem
         * @param {object} options
         * @param {string} [options.decimalSeparator="."]
         * @param {string} [options.thousandSeparator=","]
         * @param {boolean} [options.renderZeroEmpty=false]
         * @param {number} [options.digits=2|0] optional number of digits to override, instead of using the configured number of digits
         * @param {boolean} [options.fullPrecision=false] fullPrecision will set the number of digits to the precision given in value
         * @param {number} [options.value] numeric value, in case the fullPrecision-mode is enabled, to determine the siginificant number of digits
         * @param {string} [options.concatCharacter="\n"]
         * @return {string}
         */
        MedDataItemConfigSchema.prototype.formatMedDataItem = function formatMedDataItem( medDataItem, options ) {
            var
                concatCharacter = (options && typeof options.concatCharacter === "string") ? options.concatCharacter : "\n",
                stringCollection = [];

            switch( this.dataType ) {
                case medDataItemDataTypes.ANY:
                    stringCollection.push( this.formatBoolValue( medDataItem.boolValue ) );
                    stringCollection.push( this.formatValue( medDataItem.value, options ) );
                    stringCollection.push( this.formatTextValue( medDataItem.textValue ) );
                    stringCollection.push( this.formatDateValue( medDataItem.dateValue ) );
                    break;

                case medDataItemDataTypes.STRING_OR_NUMBER:
                    stringCollection.push( this.formatValue( medDataItem.value, options ) );
                    stringCollection.push( this.formatTextValue( medDataItem.textValue ) );
                    break;

                case medDataItemDataTypes.STRING:
                case medDataItemDataTypes.STRING_ENUM:
                    stringCollection.push( this.formatTextValue( medDataItem.textValue ) );
                    break;

                case medDataItemDataTypes.NUMBER_INT:
                case medDataItemDataTypes.NUMBER_TIMEDIFF:
                case medDataItemDataTypes.NUMBER_FLOAT:
                case medDataItemDataTypes.NUMBER_FORMULA:
                    stringCollection.push( this.formatValue( medDataItem.value, options ) );
                    break;

                case medDataItemDataTypes.BOOLEAN:
                    stringCollection.push( this.formatBoolValue( medDataItem.boolValue ) );
                    break;

                case medDataItemDataTypes.DATE:
                case medDataItemDataTypes.DATE_TIME:
                    stringCollection.push( this.formatDateValue( medDataItem.dateValue ) );
                    break;
            }

            // return the concatenation of non-empty values
            return stringCollection
                .filter( function filterEmptyValues( value ) {
                    switch( true ) {
                        case typeof value === "undefined":
                        case typeof value === "string" && value.length === 0:
                            return false;
                    }
                    return true;
                } )
                .join( concatCharacter );
        };

        /**
         * Formats the values stored in a MedDataItem, depending on the given dataType in this config.
         * Use this function instead of using the type-specific formatting functions to save yourself
         * from having to do dataType checks, etc.
         * Basically this one calls MedDataItemConfigSchema.prototype.formatMedDataItem,
         * but will execute a postProcessing-hook, if available, to replace characters, etc.
         * @param {MedDataItemSchema} medDataItem
         * @param {object} options
         * @param {string} [options.decimalSeparator="."]
         * @param {string} [options.thousandSeparator=","]
         * @param {boolean} [options.renderZeroEmpty=false]
         * @param {number} [options.digits=2|0] optional number of digits to override, instead of using the configured number of digits
         * @param {boolean} [options.fullPrecision=false] fullPrecision will set the number of digits to the precision given in value
         * @param {number} [options.value] numeric value, in case the fullPrecision-mode is enabled, to determine the siginificant number of digits
         * @param {string} [options.concatCharacter="\n"]
         * @return {string}
         */
        MedDataItemConfigSchema.prototype.formatMedDataItemForPDF = function formatMedDataItem( medDataItem, options ) {
            var formattedValue = this.formatMedDataItem( medDataItem, options );
            if( typeof this.formatMedDataItemForPDFPostProcessor === "function" ) {
                formattedValue = this.formatMedDataItemForPDFPostProcessor( formattedValue, medDataItem, options );
            }
            return formattedValue;
        };

        /**
         * Returns the value in the format defined by this config
         * If a string is given, the value gets converted to FLOAT/INT depending on the data format.
         * @param {number|string} value
         * @param {object} options
         * @param {string} [options.decimalSeparator="."]
         * @param {string} [options.thousandSeparator=","]
         * @param {boolean} [options.renderZeroEmpty=false]
         * @param {number} [options.digits=2|0] optional number of digits to override, instead of using the configured number of digits
         * @param {boolean} [options.fullPrecision=false] fullPrecision will set the number of digits to the precision given in value
         * @param {number} [options.value] numeric value, in case the fullPrecision-mode is enabled, to determine the siginificant number of digits
         * @return {string}
         */
        MedDataItemConfigSchema.prototype.formatValue = function formatValue( value, options ) {

            // depending on the input type, convert the value from string to number
            switch( typeof value ) {
                case "string":
                    switch( true ) {
                        // invalid strings get rendered as they are ...
                        // the UI should mark them appropriately as invalid (e.g. red background)
                        case value.length === 0:
                        case value.match( Y.doccirrus.regexp.decimal ) === null:
                            return value;

                        case this.isValueFloatingPoint():
                            value = parseFloat( value );
                            break;
                        default:
                            value = parseInt( value, 10 );
                    }

                    break;
                case "number":
                    break;
                default:
                    return '';
            }

            // By reaching here, value should be a number. If not, return.
            if( isNaN( value ) || !isFinite( value ) ) {
                return 'NaN';
            }

            // check if we have to proceed.... not required, if value is zero and we should not render zero at all.
            if( value === 0 && options && options.renderZeroEmpty ) {
                return '';
            }

            // get the options
            var
                locale = Y.doccirrus.comctl.getUserLang(),
                defaultDecimalSeparator = (locale === 'de') ? "," : ".",
                defaultThousandSeparator = (locale === 'de') ? "." : ",",
                decimalSeparator = options && options.decimalSeparator || defaultDecimalSeparator,
                thousandSeparator = options && options.thousandSeparator || defaultThousandSeparator;

            // first, get the rounding method and apply it to the number
            var
                significantDigits = this.getSignificantDigits( options ),
                roundingMethod = this.getValueRoundingMethod(),
                roundedValue = roundingMethod( value, significantDigits );

            // second, count the digits of the integer decimal, and the decimal part
            var
                // integer part
                integerValue = parseInt( roundedValue, 10 ),
                integerPart = integerValue.toFixed( 0 ).padStart( this.valueLeadingZeros, "0" ),

                // decimal part
                decimalSplitValue = (roundedValue - integerValue).toFixed( significantDigits ).split( "." ),
                // decimalSplitValue contains 12.44 = ["12", "44"], or 12.00 = ["12"]
                decimalPart = ((decimalSplitValue.length === 2) ? decimalSplitValue[1] : "").padEnd( significantDigits, "0" );

            // third, add thousand separator, if required
            if( thousandSeparator ) {
                integerPart = integerPart.replace( /\B(?=(\d{3})+(?!\d))/g, thousandSeparator );
            }

            // forth, format the output
            var formattingArray = [integerPart];
            if( significantDigits > 0 && decimalPart.length > 0 ) {
                formattingArray.push( decimalPart );
            }

            return formattingArray.join( decimalSeparator );
        };

        /**
         * Returns the formatted bool-value.
         * @param {boolean} value
         * @return {string}
         */
        MedDataItemConfigSchema.prototype.formatBoolValue = function formatBoolValue( value ) {
            if( typeof value === 'boolean' ) {
                return value ? BOOLEAN_TRUE : BOOLEAN_FALSE;
            }
            return '';
        };

        /**
         * Returns the formatted bool-value.
         * @param {string} value
         * @return {string}
         */
        MedDataItemConfigSchema.prototype.formatTextValue = function formatTextValue( value ) {
            // if a custom formatting function is defined, it overwrites any other formatter
            if( typeof this.textValueFormattingFunction === "function" ) {
                return this.textValueFormattingFunction.call( this, value );
            }

            // else simply return the string if the value is a string or get the enum value
            var enumObject;
            switch( this.dataType ) {
                case medDataItemDataTypes.STRING_ENUM:
                    /**
                     * The value is representing an id within the enumValueCollectionOptions.
                     * However, the value collection may only be populated through an external API call.
                     * In this case, we ignore the extraction of the real value, as the value to show should
                     * be current textValue.
                     */
                    if(
                        Array.isArray( this.enumValueCollectionOptions ) &&
                        typeof this.enumValueCollectionGenerator !== "function"
                    ) {
                        enumObject = this.enumValueCollectionOptions.find( function forEachEnumObject( obj ) {
                            return obj.id === value;
                        } );

                        if( enumObject ) {
                            return enumObject.text;
                        }
                    }
            }

            return (typeof value === 'string') ? value : '';
        };

        /**
         * Returns the formatted string. Basically uses moment to do the formatting.
         * @param {Date|string} value
         * @return {string}
         */
        MedDataItemConfigSchema.prototype.formatDateValue = function formatDateValue( value ) {
            var moment = Y.doccirrus.commonutils.getMoment();
            if( value ) {
                return moment( value ).format( this.getDateValueFormatPattern() );
            }
            return '';
        };

        /**
         * Returns the format pattern for the date string. Basically to be used with moment to do the formatting.
         * @return {string}
         */
        MedDataItemConfigSchema.prototype.getDateValueFormatPattern = function getDateValueFormatPattern() {
            // if no custom format has been provided, use the default one, depending on the dataType
            if( this.dateValueFormat ) {
                return this.dateValueFormat;
            }

            switch( this.dataType ) {
                case medDataItemDataTypes.DATE:
                    return TIMESTAMP_FORMAT;
                case medDataItemDataTypes.DATE_TIME:
                    return TIMESTAMP_FORMAT_LONG;
            }
            return '';
        };

        /**
         * Returns the placeholder value for the medDataItem, depending on the given data type.
         * @param {object} options
         * @param {string} [options.concatCharacter=", "]
         * @return {string}
         */
        MedDataItemConfigSchema.prototype.getPlaceholderForMedDataItem = function getPlaceholderForMedDataItem( options ) {
            var stringCollection = [];
            switch( this.dataType ) {
                case medDataItemDataTypes.ANY:
                    stringCollection.push( this.getPlaceholderForBoolValue() );
                    stringCollection.push( this.getPlaceholderForValue() );
                    stringCollection.push( this.getPlaceholderForTextValue() );
                    stringCollection.push( this.getPlaceholderForDateValue() );
                    break;

                case medDataItemDataTypes.STRING_OR_NUMBER:
                    stringCollection.push( this.getPlaceholderForValue() );
                    stringCollection.push( this.getPlaceholderForTextValue() );
                    break;

                case medDataItemDataTypes.STRING:
                case medDataItemDataTypes.STRING_ENUM:
                    return this.getPlaceholderForTextValue();

                case medDataItemDataTypes.NUMBER_INT:
                case medDataItemDataTypes.NUMBER_TIMEDIFF:
                case medDataItemDataTypes.NUMBER_FLOAT:
                    return this.getPlaceholderForValue();

                case medDataItemDataTypes.BOOLEAN:
                    return this.getPlaceholderForBoolValue();

                case medDataItemDataTypes.DATE:
                case medDataItemDataTypes.DATE_TIME:
                    return this.getPlaceholderForDateValue();
            }

            // return the concatenation of non-empty values
            return stringCollection
                .filter( function filterEmptyValues( value ) {
                    return value.length > 0;
                } )
                .join( options && options.concatCharacter || ", " );
        };

        /**
         * Returns the placeholder for a number value
         * @return {string}
         */
        MedDataItemConfigSchema.prototype.getPlaceholderForValue = function getPlaceholderForValue() {
            var stringCollection = [];

            if( typeof this.valueMinValue === "number" ) {
                if( typeof this.valueMaxValue !== "number" ) {
                    // case "≥ MINVALUE"
                    stringCollection.push( GREATERTHAN_OR_EQUAL );
                }
                stringCollection.push( this.formatValue( this.valueMinValue ) );
                if( typeof this.valueMaxValue === "number" ) {
                    // case "MINVALUE - MAXVALUE"
                    stringCollection.push( RANGETO );
                }
            } else if( typeof this.valueMaxValue === "number" ) {
                // case "≤ MAXVALUE"
                stringCollection.push( LESSTHAN_OR_EQUAL );
            }

            if( typeof this.valueMaxValue === "number" ) {
                // case "MINVALUE - MAXVALUE"
                stringCollection.push( this.formatValue( this.valueMaxValue ) );
            }

            if( stringCollection.length === 0 ) {
                // case just an example value, as no range is defined
                stringCollection.push( this.formatValue( 123.45 ) );
            }
            return stringCollection.join( " " );
        };

        /**
         * Returns the placeholder for a bool-value.
         * @return {string}
         */
        MedDataItemConfigSchema.prototype.getPlaceholderForBoolValue = function getPlaceholderForBoolValue() {
            return [BOOLEAN_TRUE, BOOLEAN_FALSE].join( ENUMOR );
        };

        /**
         * Returns the placeholder for a text value.
         * @return {string}
         */
        MedDataItemConfigSchema.prototype.getPlaceholderForTextValue = function getPlaceholderForTextValue() {
            // if a custom placeholder function is defined, it overwrites any other generator
            if( typeof this.textValuePlaceholderFunction === "function" ) {
                return this.textValuePlaceholderFunction.call( this );
            }

            // special treatment for enum => this is simple
            if( this.dataType === medDataItemDataTypes.STRING_ENUM ) {
                return (Array.isArray( this.enumValueCollection )) ? this.enumValueCollection.join( ENUMOR ) : "";
            }

            // normal text needs to display the range
            var stringCollection = [];

            if( typeof this.textValueMinLength === "number" ) {
                if( typeof this.textValueMaxLength !== "number" ) {
                    // case "≥ MINLENGTH"
                    stringCollection.push( GREATERTHAN_OR_EQUAL );
                }
                stringCollection.push( this.textValueMinLength.toFixed( 0 ) );
                if( typeof this.textValueMaxLength === "number" ) {
                    // case "MINLENGTH - MAXLENGTH"
                    stringCollection.push( RANGETO );
                }
            } else if( typeof this.textValueMaxLength === "number" ) {
                // case "≤ MAXLENGTH"
                stringCollection.push( LESSTHAN_OR_EQUAL );
            }

            if( typeof this.textValueMaxLength === "number" ) {
                // case "MINLENGTH - MAXLENGTH"
                stringCollection.push( this.textValueMaxLength.toFixed( 0 ) );
            }

            if( stringCollection.length > 0 ) {
                // append the suffix "characters"
                stringCollection.push( CHARACTERS );
            }

            return stringCollection.join( " " );
        };

        /**
         * Returns the placeholder for a date value. Basically uses moment to do the formatting.
         * @return {string}
         */
        MedDataItemConfigSchema.prototype.getPlaceholderForDateValue = function getPlaceholderForDateValue() {
            var
                moment = Y.doccirrus.commonutils.getMoment(),
                stringCollection = [];

            if( this.dateValueMinDate ) {
                if( !this.dateValueMaxDate ) {
                    // case "≥ MINDATE"
                    stringCollection.push( GREATERTHAN_OR_EQUAL );
                }
                stringCollection.push( moment( this.dateValueMinDate ).format( this.getDateValueFormatPattern() ) );
                if( this.dateValueMaxDate ) {
                    // case "MINDATE - MAXDATE"
                    stringCollection.push( RANGETO );
                }
            } else if( this.dateValueMaxDate ) {
                // case "≤ MAXDATE"
                stringCollection.push( LESSTHAN_OR_EQUAL );
            }

            if( this.dateValueMaxDate ) {
                // case "MINDATE - MAXDATE"
                stringCollection.push( moment( this.dateValueMaxDate ).format( this.getDateValueFormatPattern() ) );
            }

            if( stringCollection.length === 0 ) {
                // case just an example date, as no range is defined
                stringCollection.push( moment().format( this.getDateValueFormatPattern() ) );
            }
            return stringCollection.join( " " );
        };

        /**
         *  Options for initializing editable table UI component
         *  for the "smartValue" column. It displays an own UI,
         *  depending on the dataType of the underlying medDataItem.
         *  @return {object}
         */
        MedDataItemConfigSchema.prototype.getSmartValueComponentOptions = function getSmartValueComponentOptions() {
            var medDataItemConfig = this;
            switch( medDataItemConfig.dataType ) {
                case medDataItemDataTypes.STRING_ENUM:
                    return {
                        componentType: 'KoFieldSelect2',
                        componentConfig: {
                            optionsText: 'text',
                            optionsValue: 'id',
                            useSelect2Data: true,
                            select2Read: function __type_select2Read( value ) {
                                if( !value ) {
                                    return value;
                                } else {
                                    return {
                                        id: value,
                                        text: value
                                    };
                                }
                            },
                            select2Write: function __type_select2Write( $event, observable ) {
                                if( typeof medDataItemConfig.onTextValueEnumSelect2Write === "function" ) {
                                    medDataItemConfig.onTextValueEnumSelect2Write.call( this, $event, observable );
                                }
                                if( typeof observable === "function" ) {
                                    observable( $event.val );
                                }
                            },
                            select2Config: {
                                multiple: false,
                                allowClear: medDataItemConfig.isOptional,
                                placeholder: medDataItemConfig.getPlaceholderForMedDataItem(),
                                query: function( query ) {
                                    // if a generator function is declared, we should use that to obtain the values instead
                                    if( typeof medDataItemConfig.enumValueCollectionGenerator === "function" ) {
                                        return medDataItemConfig.enumValueCollectionGenerator( query )
                                            .then( function enumValueCollectionFetched( results ) {
                                                return query.callback( { results: results } );
                                            } );
                                    }

                                    // by default, return the value collection options
                                    return query.callback( { results: medDataItemConfig.enumValueCollectionOptions } );
                                }
                            }
                        }
                    };
                case medDataItemDataTypes.DATE:
                case medDataItemDataTypes.DATE_TIME:
                    return {
                        componentType: 'KoSchemaValue',
                        componentConfig: {
                            fieldType: medDataItemDataTypes.DATE === medDataItemConfig.dataType ? 'Date' : 'DateTime',
                            showLabel: false,
                            useIsoDate: true,
                            preventUtcOffsetAdjust: true,
                            minDate: medDataItemConfig.dateValueMinDate,
                            maxDate: medDataItemConfig.dateValueMaxDate,
                            placeholder: medDataItemConfig.getPlaceholderForMedDataItem()
                        }
                    };
                case medDataItemDataTypes.NUMBER_INT:
                case medDataItemDataTypes.NUMBER_TIMEDIFF:
                    return {
                        componentType: 'KoSchemaValue',
                        componentConfig: {
                            fieldType: 'Number',
                            showLabel: false,
                            useIsoDate: false,
                            placeholder: medDataItemConfig.getPlaceholderForMedDataItem()
                        }
                    };
                case medDataItemDataTypes.BOOLEAN:
                    return {
                        componentType: 'KoEditableTableCheckboxCell',
                        placeholder: medDataItemConfig.getPlaceholderForMedDataItem()
                    };
                case medDataItemDataTypes.NUMBER_FLOAT:
                    return {
                        componentType: 'KoEditableTableInputCell',
                        placeholder: medDataItemConfig.getPlaceholderForMedDataItem(),
                        componentConfig: {
                            beforeEditorOpen: function( value, cellModel ) {
                                var medDataItemConfig;

                                // get the item's config, and format the value with full-precision
                                if( cellModel && cellModel.row && cellModel.row.medDataItemConfig ) {
                                    medDataItemConfig = cellModel.row.medDataItemConfig();
                                    if( medDataItemConfig instanceof MedDataItemConfigSchema ) {
                                        value = medDataItemConfig.formatValue( value, {
                                            value: value,
                                            fullPrecision: true
                                        } );
                                    }
                                }

                                return value;
                            },
                            beforeEditorWriteBack: function( value ) {
                                // an optional field may be reset to undefined by writing an empty value
                                if( medDataItemConfig.isOptional && ( value === "" || value === null )  ) {
                                    return undefined;
                                }

                                // convert the string from local format to a number
                                return Y.doccirrus.comctl.localStringToNumber( value );
                            }
                        }
                    };

                case medDataItemDataTypes.STRING_OR_NUMBER:
                    return {
                        componentType: 'KoEditableTableInputCell',
                        placeholder: medDataItemConfig.getPlaceholderForMedDataItem(),
                        componentConfig: {
                            beforeEditorOpen: function( value, cellModel ) {
                                var medDataItemConfig, splitValue, numericValue;
                                /**
                                 * Split the input into value (numeric) and textValue (string) part
                                 * at the first space " ". E.g. "1,234 abcde" => value = "1.234", textValue = "abcde".
                                 * To adapt the value for parseFloat, the number needs to be interpreted as type number,
                                 * and hence formatted in international format.
                                 */
                                if( typeof value === "string" ) {
                                    splitValue = value.split( " " );

                                    if( splitValue[0] ) {
                                        // try to parse the first value as localized number string
                                        numericValue = parseFloat( splitValue[0] );

                                        // if the value is indeed a parsable number => merge it back in international form
                                        if( !isNaN( numericValue ) ) {
                                            if( cellModel && cellModel.row && cellModel.row.medDataItemConfig ) {
                                                medDataItemConfig = cellModel.row.medDataItemConfig();
                                                if( medDataItemConfig instanceof MedDataItemConfigSchema ) {
                                                    splitValue[0] = medDataItemConfig.formatValue( numericValue, {
                                                        value: numericValue,
                                                        fullPrecision: true
                                                    } );
                                                }
                                            }
                                        }
                                    }

                                    return splitValue.join( " " );
                                }

                                return value;
                            },
                            beforeEditorWriteBack: function( value ) {
                                /**
                                 * Split the input into value (numeric) and textValue (string) part
                                 * at the first space " ". E.g. "1,234 abcde" => value = "1.234", textValue = "abcde".
                                 * To adapt the value for parseFloat, the number needs to be interpreted as type number,
                                 * and hence formatted in international format.
                                 */
                                var splitValue, numericValue;
                                if( typeof value === "string" ) {
                                    splitValue = value.split( " " );

                                    if( splitValue[0] ) {
                                        // try to parse the first value as localized number string
                                        numericValue = Y.doccirrus.comctl.localStringToNumber( splitValue[0] );

                                        // if the value is indeed a parsable number => merge it back in international form
                                        if( !isNaN( numericValue ) ) {
                                            splitValue[0] = numericValue.toString();
                                        }
                                    }

                                    return splitValue.join( " " );
                                }

                                return value;
                            }
                        }
                    };

                case medDataItemDataTypes.STRING:
                default:
                    return {
                        componentType: 'KoEditableTableInputCell',
                        placeholder: medDataItemConfig.getPlaceholderForMedDataItem()
                    };
            }
        };

        /**
         * Returns a default config based in the medDataItem values
         * @param {MedDataItemSchema} medDataItem
         * @param {MedDataItemSchema|undefined} fallback
         * @return {MedDataItemConfigSchema}
         */
        MedDataItemConfigSchema.getDefaultConfigBasedOnMedDataItemProperties = function getDefaultConfigBasedOnMedDataItemProperties( medDataItem, fallback ) {
            var
                value = medDataItem.value,
                textValue = medDataItem.textValue,
                boolValue = medDataItem.boolValue,
                dateValue = medDataItem.dateValue;

            switch( true ) {
                // If textValue is defined and others not === STRING
                case textValue && isNaN( value ) && !dateValue && boolValue === undefined:
                    return new MedDataItemConfigSchema( {
                        validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                        dataType: medDataItemDataTypes.STRING
                    } );
                // If value is defined and others not === NUMBER_FLOAT
                case !isNaN( value ) && !textValue && !dateValue && boolValue === undefined:
                    return new MedDataItemConfigSchema( {
                        validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                        dataType: medDataItemDataTypes.NUMBER_FLOAT,
                        valueLeadingZeros: 0,
                        valueDigits: 2,
                        valueRoundingMethod: 0
                    } );
                // If boolValue is defined and others not === NUMBER_FLOAT
                case typeof boolValue === 'boolean' && !textValue && isNaN( value ) && !dateValue:
                    return new MedDataItemConfigSchema( {
                        validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                        dataType: medDataItemDataTypes.BOOLEAN
                    } );
                // if textValue and Value are defined and others not === STRING_OR_NUMBER, also the default config
                case textValue && !isNaN( value ) && !dateValue && boolValue === undefined:
                    return MedDataItemConfigSchema.getDefaultConfig();
                // if fallback defined e.g. in MedDataModel for tags created by user
                case fallback instanceof MedDataItemConfigSchema:
                    return fallback;
                // Default to ANY
                default:
                    return new MedDataItemConfigSchema( {
                        validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                        dataType: medDataItemDataTypes.ANY
                    } );
            }
        };

        /**
         * Returns a default config of DataType "STRING_OR_NUMBER"
         * @param {MedDataItemTemplateSchema|undefined} template
         * @return {MedDataItemConfigSchema}
         */
        MedDataItemConfigSchema.getDefaultConfig = function getDefaultConfig( template ) {
            return new MedDataItemConfigSchema( {
                validFromIncl: new Date(),
                dataType: medDataItemDataTypes.STRING_OR_NUMBER,
                valueLeadingZeros: 0,
                valueDigits: 2,
                valueRoundingMethod: 0,
                textValueMinLength: 1
            }, template );
        };

        /**
         * @return {{textValueMinLength: number, validFromIncl: Date, dateValueFormat: string, dateValueMinDate: (Date|string), dataType: string, validForUnit: *, valueDigits: number, textValueMaxLength: number, enumValueCollection: (string|number|(string|number)[]), valueLeadingZeros: number, dateValueMaxDate: (Date|string), valueRoundingMethod: number, textValueValidationRegExp: (string), valueMinValue: number, valueMaxValue: number}}
         */
        MedDataItemConfigSchema.prototype.toObject = function() {
            return {
                validFromIncl: this.validFromIncl,
                validForUnit: this.validForUnit,
                dataType: this.dataType,
                valueRoundingMethod: this.valueRoundingMethod,
                valueLeadingZeros: this.valueLeadingZeros,
                valueDigits: this.valueDigits,
                valueMinValue: this.valueMinValue,
                valueMaxValue: this.valueMaxValue,
                textValueMinLength: this.textValueMinLength,
                textValueMaxLength: this.textValueMaxLength,
                textValueValidationRegExp: (this.textValueValidationRegExp instanceof RegExp) ? this.textValueValidationRegExp.source : this.textValueValidationRegExp,
                enumValueCollection: this.enumValueCollection,
                dateValueFormat: this.dateValueFormat,
                dateValueMinDate: this.dateValueMinDate,
                dateValueMaxDate: this.dateValueMaxDate,
                valueFormulaExpression: this.valueFormulaExpression,
                valueFormulaScope: this.valueFormulaScope,
                manualCalculation: this.manualCalculation,
                isOptional: this.isOptional
            };
        };

        MedDataItemConfigSchema.prototype.toJSON = MedDataItemConfigSchema.prototype.toObject;

        /**
         * RegExp flags to be set for textValueValidationRegExp when converting from string to regexp.
         * @type {string}
         */
        MedDataItemConfigSchema.DEFAULTREGEXPFLAGS = "i";

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'validFromIncl', {
            /**
             * @return {Date|undefined}
             */
            get: function() {
                return this._validFromIncl;
            },
            set: function( v ) {
                this._validFromIncl = v ? new Date( v ) : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'validForUnit', {
            /**
             * @return {string|undefined}
             */
            get: function() {
                return this._validForUnit;
            },
            set: function( v ) {
                this._validForUnit = (typeof v === "string") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'dataType', {
            /**
             * @return {string}
             */
            get: function() {
                return this._dataType;
            },
            set: function( v ) {
                if( Object.keys( medDataItemDataTypes ).indexOf( v ) !== -1 ) {
                    this._dataType = v;
                }
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'valueRoundingMethod', {
            /**
             * @return {number|undefined|null}
             */
            get: function() {
                return this._valueRoundingMethod;
            },
            set: function( v ) {
                this._valueRoundingMethod = (typeof v === "number") ? v : null;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'valueLeadingZeros', {
            /**
             * @return {number}
             */
            get: function() {
                return this._valueLeadingZeros;
            },
            set: function( v ) {
                this._valueLeadingZeros = (typeof v === "number") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'valueDigits', {
            /**
             * @return {number}
             */
            get: function() {
                return this._valueDigits;
            },
            set: function( v ) {
                this._valueDigits = (typeof v === "number") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'valueMinValue', {
            /**
             * @return {number|undefined}
             */
            get: function() {
                return this._valueMinValue;
            },
            set: function( v ) {
                this._valueMinValue = (typeof v === "number") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'valueMaxValue', {
            /**
             * @return {number|undefined}
             */
            get: function() {
                return this._valueMaxValue;
            },
            set: function( v ) {
                this._valueMaxValue = (typeof v === "number") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'textValueMinLength', {
            /**
             * @return {number|undefined}
             */
            get: function() {
                return this._textValueMinLength;
            },
            set: function( v ) {
                this._textValueMinLength = (typeof v === "number") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'textValueMaxLength', {
            /**
             * @return {number|undefined}
             */
            get: function() {
                return this._textValueMaxLength;
            },
            set: function( v ) {
                this._textValueMaxLength = (typeof v === "number") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'textValueValidationRegExp', {
            /**
             * @return {RegExp|undefined}
             */
            get: function() {
                return this._textValueValidationRegExp;
            },
            /**
             * @param {string|RegExp} v
             */
            set: function( v ) {
                if( typeof v === "string" ) {
                    v = new RegExp( v, MedDataItemConfigSchema.DEFAULTREGEXPFLAGS );
                }
                this._textValueValidationRegExp = (v instanceof RegExp) ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'textValueValidationFunction', {
            /**
             * @return {(function(textValue: string): MedDataItemConfigSchemaValidationError[])|undefined}
             */
            get: function() {
                return this._textValueValidationFunction;
            },
            /**
             * @param {(function(textValue: string): MedDataItemConfigSchemaValidationError[])|undefined} v
             */
            set: function( v ) {
                this._textValueValidationFunction = (typeof v === "function") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'textValuePlaceholderFunction', {
            /**
             * @return {function(): string|undefined}
             */
            get: function() {
                return this._textValuePlaceholderFunction;
            },
            /**
             * @param {function(): string|undefined} v
             */
            set: function( v ) {
                this._textValuePlaceholderFunction = (typeof v === "function") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'textValueFormattingFunction', {
            /**
             * @return {function(textValue: string): string|undefined}
             */
            get: function() {
                return this._textValueFormattingFunction;
            },
            /**
             * @param {function(textValue): string|undefined} v
             */
            set: function( v ) {
                this._textValueFormattingFunction = (typeof v === "function") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'chartValueFormattingFunction', {
            /**
             * @return {(function(medDataItem: MedDataItemSchema): (null|MedDataItemChartValue)) | undefined}
             */
            get: function() {
                return this._chartValueFormattingFunction;
            },
            /**
             * @param {function(medDataItem: MedDataItemSchema): (null|MedDataItemChartValue)} v
             */
            set: function( v ) {
                this._chartValueFormattingFunction = (typeof v === "function") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'onTextValueEnumSelect2Write', {
            /**
             * @return {function(textValue: string): string|undefined}
             */
            get: function() {
                return this._onTextValueEnumSelect2Write;
            },
            /**
             * @param {function(textValue): string|undefined} v
             */
            set: function( v ) {
                this._onTextValueEnumSelect2Write = (typeof v === "function") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'enumValueCollectionGenerator', {
            /**
             * @return {function(query: {term: (string|undefined), callback: (function({results: {id: string, text: string}[]})|undefined)})|undefined}
             */
            get: function() {
                return this._enumValueCollectionGenerator;
            },
            /**
             * @param {string|number|(string|number)[]|{id: (string|number), text: (string|number)}[]|function(): Promise<{id: (string|number), text: (string|number)}[]>|{id: (string|number), text: (string|number)}[]|undefined} v
             */
            set: function( v ) {
                this._enumValueCollectionGenerator = (typeof v === "function") ? v : undefined;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'enumValueCollectionOptions', {
            /**
             * @return {{id: (string|number), text: (string|number)}[]}
             */
            get: function() {
                return this._enumValueCollection;
            },
            /**
             * @param {string|number|(number|string)[]|{id: (string|number), text: (string|number)}[]|function(): (string[]|{id: (string|number), text: (string|number)}[])} v
             */
            set: function( v ) {
                this._enumValueCollection = Y.doccirrus.commonutils.getSelect2OptionsArray( v );
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'enumValueCollection', {
            /**
             * @return {(string|number)[]}
             */
            get: function() {
                return this._enumValueCollection.map( function forEachEnumValueSelect2( v ) {
                    return v.id;
                } );
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'enumValueCollectionValues', {
            /**
             * @return {(string|number)[]}
             */
            get: function() {
                return this._enumValueCollection.map( function forEachEnumValueSelect2( v ) {
                    return v.text;
                } );
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'dateValueFormat', {
            /**
             * @return {string}
             */
            get: function() {
                return this._dateValueFormat;
            },
            set: function( v ) {
                this._dateValueFormat = v;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'dateValueMinDate', {
            /**
             * @return {Date|string|undefined}
             */
            get: function() {
                return this._dateValueMinDate;
            },
            set: function( v ) {
                this._dateValueMinDate = v;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'dateValueMaxDate', {
            /**
             * @return {Date|string|undefined}
             */
            get: function() {
                return this._dateValueMaxDate;
            },
            set: function( v ) {
                this._dateValueMaxDate = v;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'valueFormulaExpression', {
            /**
             * @return {string}
             */
            get: function() {
                return this._valueFormulaExpression;
            },
            set: function( v ) {
                this._valueFormulaExpression = v;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'valueFormulaScope', {
            /**
             * @return {string}
             */
            get: function() {
                return this._valueFormulaScope;
            },
            set: function( v ) {
                var newValue;

                if ( Array.isArray( v ) ) {
                    newValue = v.map( function ( i ) {
                        if ( i && i.testValue && typeof i.testValue === "function" ) {
                            i.testValue = i.testValue();
                        }

                        if ( i && i.text ) {
                            delete i.text;
                        }

                        return i;
                    } );
                }

                this._valueFormulaScope =  newValue;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'manualCalculation', {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._manualCalculation;
            },
            set: function( v ) {
                // string and number conversion to boolean
                if( typeof v === "string" ) {
                    switch( v.toLowerCase() ) {
                        case "true":
                            v = true;
                            break;
                        case "false":
                            v = false;
                            break;
                    }
                }

                // finally check the type
                if( typeof v !== "boolean" && typeof v !== "undefined" && v !== null ) {
                    throw new TypeError( 'medDataItem.manualCalculation must be of type boolean or a string equaling "true" or "false"' );
                }
                this._manualCalculation = v;
            }
        } );

        Object.defineProperty( MedDataItemConfigSchema.prototype, 'formatMedDataItemForPDFPostProcessor', {
            /**
             * @return {(function(value: string): string) | undefined}
             */
            get: function() {
                return this._formatMedDataItemForPDFPostProcessor;
            },
            /**
             * @param {(function(value: string): string) | undefined} v
             */
            set: function( v ) {
                this._formatMedDataItemForPDFPostProcessor = (typeof v === "function") ? v : undefined;
            }
        } );


        Object.defineProperty( MedDataItemConfigSchema.prototype, 'isOptional', {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._isOptional;
            },
            set: function( v ) {
                this._isOptional = (typeof v === "boolean") ? v : false;
            }
        } );

        /**
         * Simple object on whose basis a MedDataItem may be constructed.
         * @param {object} input
         * @param {string} input.type
         * @param {string} input.category
         * @param {string} input.unit? optional unit
         * @param {string[]} input.sampleNormalValueText? optional value range
         * @param {object} input.additionalData? optional storage for additional data (dictionary object, key-value)
         * @param {string|undefined} input.i18n? optional translation of the title, if provided
         * @param {boolean|undefined} input.isStatic? optional flag that is set on programmatically created items for identification of those
         * @param {boolean|undefined} input.isUnitDisabled? optional flag that the unit may not be changed on this item
         * @param {boolean|undefined} input.isReadOnly? optional flag that the item's value may not be changed
         * @param {string|undefined} input.justForCaseFolderType? optional list of case folder types where the template is valid
         * @param {string|undefined} input.justForCountryMode? options list of countrys where the template is valid
         * @param {MedDataItemConfigSchema} input.medDataItemConfig?
         * @constructor
         */
        function MedDataItemTemplateSchema( input ) {
            var self = this;

            if( typeof input.type !== "string" ) {
                throw new TypeError( 'MedDataItemTemplateSchema requires an input.type to be set.' );
            }

            this.type = input.type;
            this.category = Y.doccirrus.commonutils.getAlphaNumericStringArray( input.category );

            // values with default value
            this.unit = (typeof input.unit === "string") ? input.unit : "";
            this.sampleNormalValueText = Array.isArray( input.sampleNormalValueText ) ? input.sampleNormalValueText : [];
            this.additionalData = (typeof input.additionalData === "object" && input.additionalData !== null) ? input.additionalData : {};
            this.medDataItemConfig = (Array.isArray( input.medDataItemConfig ))
                ? input.medDataItemConfig.map( function forEachMedDataItemConfig( config ) {
                    return new MedDataItemConfigSchema( config, self );
                } ) : undefined;

            this.i18n = (typeof input.i18n === "string") ? input.i18n : input.type;
            this.isStatic = (typeof input.isStatic === "boolean") ? input.isStatic : false;
            this.isUnitDisabled = (typeof input.isUnitDisabled === "boolean") ? input.isUnitDisabled : false;
            this.isReadOnly = (typeof input.isReadOnly === "boolean") ? input.isReadOnly : false;
            this.unitEnumCollection = (input.unitEnumCollection) ? Y.doccirrus.commonutils.getAlphaNumericStringArray( input.unitEnumCollection ) : undefined;
            this.justForCaseFolderType = (input.justForCaseFolderType) ? Y.doccirrus.commonutils.getAlphaNumericStringArray( input.justForCaseFolderType ) : undefined;
            this.justForCountryMode = (input.justForCountryMode) ? Y.doccirrus.commonutils.getAlphaNumericStringArray( input.justForCountryMode ) : undefined;
        }

        MedDataItemTemplateSchema.prototype = {};

        /**
         * Get an example MedDataItem. As category, the first available is chosen.
         * You can override that by setting the initial parameters
         * @param {Partial<MedDataItemSchema>} initialParameters
         * @return {MedDataItemSchema}
         */
        MedDataItemTemplateSchema.prototype.toMedDataItem = function toMedDataItem( initialParameters ) {
            return new MedDataItemSchema(
                Object.assign( {
                    category: this.category[0], // choose the first one (the user may overwrite it using the initialParameters)
                    type: this.type,
                    unit: this.unit,
                    sampleNormalValueText: this.sampleNormalValueText,
                    additionalData: this.additionalData
                }, initialParameters ) );
        };

        /**
         * Returns a boolean, if the template is valid for a given case folder type or list of types.
         * @param {string[]|string|undefined} caseFolderTypeOrList
         * @return {boolean}
         */
        MedDataItemTemplateSchema.prototype.isValidForCaseFolderType = function isValidForCaseFolderType( caseFolderTypeOrList ) {
            var self = this;
            // apply template-based filter
            if( Array.isArray( self.justForCaseFolderType ) ) {
                if( typeof caseFolderTypeOrList === "string" && self.justForCaseFolderType.indexOf( caseFolderTypeOrList ) === -1 ) {
                    return false;
                } else if( Array.isArray( caseFolderTypeOrList ) ) {
                    return caseFolderTypeOrList.find( function forEachCaseFolderType( type ) {
                        return self.justForCaseFolderType.indexOf( type ) !== -1;
                    } );
                }
            }
            return true;
        };

        /**
         * Returns a boolean, if the template is valid for a given case folder type or list of types.
         * @param {string[]|string|undefined} countryModeOrList
         * @return {boolean}
         */
        MedDataItemTemplateSchema.prototype.isValidForCountryMode = function isValidForCountryMode( countryModeOrList ) {
            var self = this;
            // apply template-based filter
            if( Array.isArray( self.justForCountryMode ) ) {
                if( typeof countryModeOrList === "string" && self.justForCountryMode.indexOf( countryModeOrList ) === -1 ) {
                    return false;
                } else if( Array.isArray( countryModeOrList ) ) {
                    return countryModeOrList.find( function forEachCountryMode( countryMode ) {
                        return self.justForCountryMode.indexOf( countryMode ) !== -1;
                    } );
                }
            }
            return true;
        };

        /**
         * MedData class, representing an object storing multiple MedDataItems.
         * @param {object} args
         * @class
         * @constructor
         */
        function MedDataSchema( args ) {
            ActivitySchema.call( this, args );

            this._medData = [];
        }

        MedDataSchema.prototype = Object.create( ActivitySchema.prototype );
        MedDataSchema.prototype.constructor = MedDataSchema;
        MedDataSchema.prototype._super = ActivitySchema;

        /**
         * @return {Array<MedDataItemSchema>}
         */
        Object.defineProperty( MedDataSchema.prototype, "medData", {
            get: function() {
                return this._medData;
            }
        } );

        /**
         * @param {MedDataItemSchema} item
         * @return {MedDataSchema}
         */
        MedDataSchema.prototype.addMedDataItem = function( item ) {
            if( item instanceof MedDataItemSchema ) {
                this._medData.push( item );
            } else {
                Y.log( "MedDataSchema.addMedDataItem invalid object added", "debug", NAME );
            }
            return this;
        };

        /**
         * Returns just unique MedData, by comparing the medDataItem.type.
         * @return {Array<MedDataItemSchema>}
         */
        MedDataSchema.prototype.getUniqueMedData = function() {
            var uniqueMedData = {};
            this._medData.forEach(
                /**
                 * @param {MedDataItemSchema} medDataItem
                 */
                function forEachMedDataItem( medDataItem ) {
                    if( !Object.prototype.hasOwnProperty.call( uniqueMedData, medDataItem.type ) ) {
                        uniqueMedData[medDataItem.type] = medDataItem;
                    }
                }
            );
            return Object.values( uniqueMedData );
        };

        /**
         * @return {object}
         */
        MedDataSchema.prototype.toObject = function() {
            return {
                actType: MedDataSchema.actType(),
                medData: this.medData.map( function( medDataItem ) {
                    return medDataItem.toObject();
                } )
            };
        };

        MedDataSchema.prototype.toJSON = MedDataSchema.prototype.toObject;

        /**
         * returns the actType of this class.
         * @return {string}
         */
        MedDataSchema.actType = function() {
            return 'MEDDATA';
        };

        /**
         * @param {object} obj
         * @return {MedDataSchema|null}
         */
        MedDataSchema.fromObject = function( obj ) {
            var medDataSchema = null;

            if( typeof obj === "object" && obj.actType === MedDataSchema.actType() ) {
                medDataSchema = new MedDataSchema();
                if( obj.hasOwnProperty( "medData" ) && Array.isArray( obj.medData ) ) {
                    obj.medData.forEach(
                        function( medDataObj ) {
                            medDataSchema.addMedDataItem( MedDataItemSchema.fromObject( medDataObj ) );
                        }
                    );
                }
            }

            return medDataSchema;
        };

        /**
         * @param {object} props
         * @param {string} props.keyRoot column id
         * @param {string} props.key the property name of the object
         * @param {string} props.width
         * @param {string} props.title title in the column
         * @param {string} props.label label of the column
         * @param {string|Array} props.type data type (used for validation)
         * @param {boolean} props.visible = true
         * @param {boolean} props.excluded = false An excluded column should not be added to the table at all.
         * @param {boolean} props.static = false
         * @param {boolean} props.disabled = false
         * @class
         * @constructor
         */
        function MedDataColumnSchema( props ) {
            var
                keyRoot = props.keyRoot || null,
                key = props.key,
                width = props.width || "auto",
                label = props.label,
                title = props.title,
                type = props.type,
                visible = props.visible || true,
                excluded = props.excluded || false,
                disabled = props.disabled || false,
                isFilterable = props.isFilterable || false,
                isSortable = props.isSortable || false,
                required = props.required || false;

            this._keyRoot = keyRoot;
            this._key = key;
            this._width = width;
            this._title = title;
            this._label = label;
            this._type = type;
            this._visible = visible;
            this._excluded = excluded;
            this._disabled = disabled;
            this._static = (typeof props.static === "boolean") ? props.static : false;
            this._isFilterable = isFilterable;
            this._isSortable = isSortable;
            this._required = required;
        }

        MedDataColumnSchema.prototype = {};

        Object.defineProperty( MedDataColumnSchema.prototype, 'static', {
            /**
             * A static column will be displayed at the front of the table.
             * @return {boolean}
             */
            get: function() {
                return this._static;
            }
        } );

        Object.defineProperty( MedDataColumnSchema.prototype, 'keyRoot', {
            /**
             * Root property of which to take the key.
             * NULL means within the root of the MedDataItem.
             * I.e. may be set to "additionalData".
             * @return {string|null}
             */
            get: function() {
                return this._keyRoot;
            }
        } );

        Object.defineProperty( MedDataColumnSchema.prototype, 'key', {
            /**
             * The property key of the value that should be displayed within the column.
             * Relative to the _keyRoot.
             * @return {string}
             */
            get: function() {
                return this._key;
            }
        } );

        Object.defineProperty( MedDataColumnSchema.prototype, 'width', {
            /**
             * @return {string|null}
             */
            get: function() {
                return this._width;
            }
        } );

        Object.defineProperty( MedDataColumnSchema.prototype, 'title', {
            /**
             * @return {string}
             */
            get: function() {
                return this._title;
            }
        } );

        Object.defineProperty( MedDataColumnSchema.prototype, 'label', {
            /**
             * @return {string}
             */
            get: function() {
                return this._label;
            }
        } );

        Object.defineProperty( MedDataColumnSchema.prototype, 'type', {
            /**
             * The type is used to validate the data, and to construct KoTable column configs.
             * @return {string|Array}
             */
            get: function() {
                return this._type;
            }
        } );

        Object.defineProperty( MedDataColumnSchema.prototype, 'visible', {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._visible;
            }
        } );

        Object.defineProperty( MedDataColumnSchema.prototype, 'excluded', {
            /**
             * An excluded column should not be added to the table at all.
             * Compared to an invisible column, which is just hidden, and may be displayed by the user.
             * @return {boolean}
             */
            get: function() {
                return this._excluded;
            }
        } );

        Object.defineProperty( MedDataColumnSchema.prototype, 'disabled', {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._disabled;
            }
        } );

        Object.defineProperty( MedDataColumnSchema.prototype, 'isFilterable', {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._isFilterable;
            }
        } );

        Object.defineProperty( MedDataColumnSchema.prototype, 'isSortable', {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._isSortable;
            }
        } );

        Object.defineProperty( MedDataColumnSchema.prototype, 'required', {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._required;
            }
        } );

        /**
         * A MedDataConfigSchema represents a configuration for additional columns and data-sets, beside the default ones.
         * There are static and dynamic columns:
         *      Static columns are stored in the additionalData of Tag_T,
         *      dynamic columns are stored in the additionalData of MedDataItem_T.
         *
         * @param {object} props
         * @param {string|undefined} props.subType
         * @param {object} props.columns
         * @param {Array|object} props.columnOrder
         * @param {Array} props.hiddenColumns
         * @param {object} props.widthOverrides
         * @param {object} props.titleOverrides
         * @param {object} props.labelOverrides
         * @param {string|undefined} props.defaultCategoryForNewItems = "BIOMETRICS"
         * @param {MedDataItemConfigSchema|undefined} props.defaultItemConfig
         * @param {boolean} props.isValueReadOnly
         * @param {boolean} props.isTextValueReadOnly
         * @param {number} props.version
         * @param {object} props.defaultValues
         * @class
         * @constructor
         */
        function MedDataConfigSchema( props ) {
            var
                self = this,
                properties = (typeof props === "object") ? props : {},
                subType = properties.subType || "",
                columns = properties.columns || {},
                columnOrder = properties.columnOrder || ['category', 'type', 'smartValue', 'unit', 'deleteButton'],
                hiddenColumns = properties.hiddenColumns || [],
                widthOverrides = properties.widthOverrides || {},
                titleOverrides = properties.titleOverrides || {},
                labelOverrides = properties.labelOverrides || {},
                defaultCategoryForNewItems = properties.defaultCategoryForNewItems || medDataCategories.BIOMETRICS,
                defaultItemConfig = properties.defaultItemConfig,
                isValueReadOnly = properties.isValueReadOnly || false,
                isTextValueReadOnly = properties.isTextValueReadOnly || false,
                version = properties.version || 0,
                defaultValues = properties.defaultValues || {},
                i, l, config;

            self._subType = subType;
            self._isValueReadOnly = isValueReadOnly;
            self._isTextValueReadOnly = isTextValueReadOnly;
            self._defaultCategoryForNewItems = defaultCategoryForNewItems;
            self._defaultItemConfig = defaultItemConfig;
            self._columnOrder = columnOrder;
            self._hiddenColumns = hiddenColumns;
            self._widthOverrides = widthOverrides;
            self._titleOverrides = titleOverrides;
            self._labelOverrides = labelOverrides;
            self.version = version;
            self.defaultValues = defaultValues;

            /**
             * @type {Array<MedDataColumnSchema>}
             * @private
             */
            self._columns = [];

            // add preconfigured columns (may be given as array, or as object, we just use the values
            if( typeof columns === "object" ) {
                columns = Object.values( columns );
            }

            if( Array.isArray( columns ) ) {
                for( i = 0, l = columns.length; i < l; i++ ) {
                    config = columns[i];

                    // add a new column, either to the static column array, or to the dynamic one
                    self._addColumn( new (self.columnConstructor)( config ) );
                }
            }
        }

        MedDataConfigSchema.prototype = {};

        Object.defineProperty( MedDataConfigSchema.prototype, 'version', {
            /**
             * Version of this config. Used to overwrite parameters, if the config has a newer Version than the existing data.
             * @return {number}
             */
            get: function() {
                return this._version;
            },

            set: function( version ) {
                this._version = (typeof version === "number") ? version : 0;
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'defaultCategoryForNewItems', {
            /**
             * New items will have pre-selected this category
             * @return {string}
             */
            get: function() {
                return this._defaultCategoryForNewItems;
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'defaultItemConfig', {
            /**
             * @return {MedDataItemConfigSchema}
             */
            get: function() {
                return this._defaultItemConfig;
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'subType', {
            /**
             * SubType of this MedData config.
             * E.g. INGREDIENTPLAN for a static IngredientPlan.
             * @return {string}
             */
            get: function() {
                return this._subType;
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'columnOrder', {
            /**
             * Apply this order to the columns.
             * @return {Array<string>}
             */
            get: function() {
                return this._columnOrder;
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'hiddenColumns', {
            /**
             * Hidden columns are those just not visible.
             * @return {Array<string>}
             */
            get: function() {
                return this._hiddenColumns;
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'labelOverrides', {
            /**
             * Apply these labels for the columns, instead of the original names.
             * @return {Object}
             */
            get: function() {
                return this._labelOverrides;
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'titleOverrides', {
            /**
             * Apply these titles for the columns, instead of the original names.
             * @return {Object}
             */
            get: function() {
                return this._titleOverrides;
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'isValueReadOnly', {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._isValueReadOnly;
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'isTextValueReadOnly', {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._isTextValueReadOnly;
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'columns', {
            /**
             * All columns: first the static, then the dynamic ones.
             * @return {Array<MedDataColumnSchema>}
             */
            get: function() {
                return this._columns;
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'dynamicColumns', {
            /**
             * @return {Array<MedDataColumnSchema>}
             */
            get: function() {
                return this._columns.filter( function( medDataColumn ) {
                    return medDataColumn.static === false;
                } );
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'staticColumns', {
            /**
             * @return {Array<MedDataColumnSchema>}
             */
            get: function() {
                return this._columns.filter( function( medDataColumn ) {
                    return medDataColumn.static === true;
                } );
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'columnConstructor', {
            /**
             * Returns the constructor class for MedDataColumns
             * @return {function}
             */
            get: function() {
                return MedDataColumnSchema;
            }
        } );

        Object.defineProperty( MedDataConfigSchema.prototype, 'defaultValues', {
            /**
             * Key-Value store for default values for items.
             * @return {object}
             */
            get: function() {
                return this._defaultValues;
            },

            set: function( defaultValues ) {
                this._defaultValues = (typeof defaultValues === "object" && defaultValues !== null) ? defaultValues : {};
            }
        } );

        /**
         * @param {MedDataColumnSchema} medDataColumn
         * @return {this}
         * @private
         */
        MedDataConfigSchema.prototype._addColumn = function( medDataColumn ) {
            if( !(medDataColumn instanceof MedDataColumnSchema) ) {
                throw new TypeError( "MedDataConfigSchema->_addColumn requires a MedDataColumnSchema" );
            }

            // always set the version of the column to the version of the config
            medDataColumn.version = this.version;

            this._columns.push( medDataColumn );
            return this;
        };

        /**
         * Returns, if a preconfigured column is hidden.
         * @param {string} columnName
         * @return {boolean}
         */
        MedDataConfigSchema.prototype.isColumnHidden = function( columnName ) {
            return (this._hiddenColumns.indexOf( columnName ) !== -1);
        };

        /**
         * Returns, if a preconfigured title is overridden.
         * @param {string} columnName
         * @return {boolean}
         */
        MedDataConfigSchema.prototype.isTitleOverridden = function( columnName ) {
            return this._titleOverrides.hasOwnProperty( columnName );
        };

        /**
         * Returns, if a preconfigured label is overridden.
         * @param {string} columnName
         * @return {boolean}
         */
        MedDataConfigSchema.prototype.isLabelOverridden = function( columnName ) {
            return this._labelOverrides.hasOwnProperty( columnName );
        };

        /**
         * @param {string} columnName
         * @param {string|undefined} valueIfNotOverridden (if undefined, defaults to "auto")
         * @return {string|null}
         */
        MedDataConfigSchema.prototype.getOverriddenWidth = function( columnName, valueIfNotOverridden ) {
            if( this._widthOverrides.hasOwnProperty( columnName ) ) {
                return this._widthOverrides[columnName];
            }
            return (typeof valueIfNotOverridden === "string") ? valueIfNotOverridden : "auto";
        };

        /**
         * @param {string} columnName
         * @param {string} valueIfNotOverridden
         * @return {string|null}
         */
        MedDataConfigSchema.prototype.getOverriddenTitle = function( columnName, valueIfNotOverridden ) {
            if( this._titleOverrides.hasOwnProperty( columnName ) ) {
                return this._titleOverrides[columnName];
            }
            return valueIfNotOverridden;
        };

        /**
         * @param {string} columnName
         * @param {string} valueIfNotOverridden
         * @return {string|null}
         */
        MedDataConfigSchema.prototype.getOverriddenLabel = function( columnName, valueIfNotOverridden ) {
            if( this._labelOverrides.hasOwnProperty( columnName ) ) {
                return this._labelOverrides[columnName];
            }
            return valueIfNotOverridden;
        };

        /**
         * A MedDataItem collects parametrized data of different categories.
         * E.g. biometrics, such as body weight.
         * @param {object} props
         * @param {string} props.category
         * @param {string} props.type
         * @param {number} props.value?
         * @param {string} props.unit?
         * @param {Date|undefined} props.dateValue?
         * @param {boolean|undefined} props.boolValue?
         * @param {string} props.textValue?
         * @param {(string|number)[]|string|number} props.sampleNormalValueText?
         * @param {object} props.additionalData?
         * @param {boolean} props.noTagCreation?
         * @constructor
         * @class
         */
        function MedDataItemSchema( props ) {
            this.category = props.category;
            this.type = props.type;
            this.value = props.value;
            this.unit = props.unit;
            this.textValue = props.textValue;
            this.dateValue =  props.dateValue;
            this.boolValue = props.boolValue;
            this.sampleNormalValueText = props.sampleNormalValueText;
            this.cchKey = props.cchKey; // swiss database lookup-key
            this.additionalData = props.additionalData;
            this.noTagCreation = props.noTagCreation;

            // NOTE: this needs to be initialized AFTER additional data,
            // as IngredientPlan will write its version to additionalData on initialization
            this.version = props.version;
        }

        MedDataItemSchema.prototype = {};

        Object.defineProperty( MedDataItemSchema.prototype, "version", {
            /**
             * @return {number}
             */
            get: function() {
                return this._version;
            },

            /**
             * @param {number} v
             */
            set: function( v ) {
                this._version = (typeof v === "number") ? v : 0;
            }
        } );

        Object.defineProperty( MedDataItemSchema.prototype, "category", {
            /**
             * @return {string}
             */
            get: function() {
                return this._category;
            },

            /**
             * @param {string} v
             */
            set: function( v ) {
                this._category = v;
            }
        } );

        Object.defineProperty( MedDataItemSchema.prototype, "type", {
            /**
             * @return {string}
             */
            get: function() {
                return this._type;
            },

            /**
             * @param {string} v
             */
            set: function( v ) {
                this._type = v;
            }
        } );

        Object.defineProperty( MedDataItemSchema.prototype, "value", {
            /**
             * @return {number}
             */
            get: function() {
                return this._value;
            },

            /**
             * @param {number} v
             */
            set: function( v ) {
                this._value = v;
            }
        } );

        Object.defineProperty( MedDataItemSchema.prototype, "unit", {
            /**
             * @return {string}
             */
            get: function() {
                return this._unit;
            },

            /**
             * @param {string} v
             */
            set: function( v ) {
                this._unit = (typeof v === "string") ? v : "";
            }
        } );

        Object.defineProperty( MedDataItemSchema.prototype, "textValue", {
            /**
             * @return {string}
             */
            get: function() {
                return this._textValue;
            },

            /**
             * @param {string} v
             */
            set: function( v ) {
                this._textValue = v;
            }
        } );

        Object.defineProperty( MedDataItemSchema.prototype, "dateValue", {
            /**
             * @return {Date}
             */
            get: function() {
                return this._dateValue;
            },

            /**
             * @param {Date|string|undefined} v
             */
            set: function( v ) {
                var parsedDate;
                if( typeof v === "string" ) {
                    // try to parse the date, before storing to variable
                    parsedDate = new Date( v );
                    if( parsedDate instanceof Date && !isNaN( parsedDate ) ) {
                        v = parsedDate;
                    }
                }
                if( !(v instanceof Date) && typeof v !== "undefined" && v !== null ) {
                    throw new TypeError( 'medDataItem.dateValue must be of type date or a string convertible to a date' );
                }
                this._dateValue = v;
            }
        } );

        Object.defineProperty( MedDataItemSchema.prototype, "boolValue", {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._boolValue;
            },

            /**
             * @param {boolean|undefined|"true"|"false"|0|1} v
             */
            set: function( v ) {
                // string and number conversion to boolean
                if( typeof v === "string" ) {
                    switch( v.toLowerCase() ) {
                        case "true":
                            v = true;
                            break;
                        case "false":
                            v = false;
                            break;
                    }
                }
                if( typeof v === "number" ) {
                    v = (v !== 0);
                }

                // finally check the type
                if( typeof v !== "boolean" && typeof v !== "undefined" && v !== null ) {
                    throw new TypeError( 'medDataItem.boolValue must be of type boolean or a string equaling "true" or "false" or a number equaling 0 (false) or anything else (true)' );
                }
                this._boolValue = v;
            }
        } );

        Object.defineProperty( MedDataItemSchema.prototype, "sampleNormalValueText", {
            /**
             * @return {string[]}
             */
            get: function() {
                return this._sampleNormalValueText;
            },

            /**
             * @param {(string|number)[]|string|number} v
             */
            set: function( v ) {
                this._sampleNormalValueText = Y.doccirrus.commonutils.getAlphaNumericStringArray( v );
            }
        } );

        Object.defineProperty( MedDataItemSchema.prototype, "additionalData", {
            /**
             * @return {object}
             */
            get: function() {
                return this._additionalData;
            },

            /**
             * @param {object} v
             */
            set: function( v ) {
                this._additionalData = (typeof v === "object" && v !== null) ? v : {};
            }
        } );

        //Swiss
        Object.defineProperty( MedDataItemSchema.prototype, "cchKey", {
            /**
             * @return {object}
             */
            get: function() {
                return this._cchKey;
            },

            /**
             * @param {object} v
             */
            set: function( v ) {
                this._cchKey = v;
            }
        } );

        Object.defineProperty( MedDataItemSchema.prototype, "noTagCreation", {
            /**
             * @return {boolean}
             */
            get: function() {
                return this._noTagCreation;
            },

            /**
             * @param {boolean} v
             */
            set: function( v ) {
                this._noTagCreation = (typeof v === "boolean") ? v : false;
            }
        } );

        /**
         * adds a key value pair to the additional data object
         * @param {string} key
         * @param {mixed} value
         * @return {this}
         */
        MedDataItemSchema.prototype.setAdditionalData = function( key, value ) {
            this._additionalData[key] = value;
            return this;
        };

        /**
         * returns a plain object
         * @return {{unit: string, textValue: string, sampleNormalValueText: string[], additionalData: {}, category: string, type: string, value: number}}
         */
        MedDataItemSchema.prototype.toObject = function() {
            return {
                category: this.category,
                type: this.type,
                value: this.value,
                unit: this.unit,
                textValue: this.textValue,
                boolValue: this.boolValue,
                dateValue: this.dateValue,
                sampleNormalValueText: this.sampleNormalValueText,
                additionalData: this.additionalData,
                cchKey: this.cchKey, //Swiss
                noTagCreation: this.noTagCreation
            };
        };

        MedDataItemSchema.prototype.toJSON = MedDataItemSchema.prototype.toObject;

        /**
         * Creates a key for additional data.
         * @param {string} [prefix="NONE"]
         * @param {string} [middle=""]
         * @param {string} [varName=""]
         * @return {string}
         */
        MedDataItemSchema.createAdditionalDataKey = function( prefix, middle, varName ) {
            return [
                (typeof prefix === "string" && prefix.length > 0) ? prefix : "NONE",
                (typeof middle === "string") ? middle : "",
                (typeof varName === "string") ? varName : ""
            ].join( "_" );
        };

        /**
         * @param {object} obj
         * @return {MedDataItemSchema|null}
         */
        MedDataItemSchema.fromObject = function( obj ) {
            return new MedDataItemSchema( obj );
        };

        function createSchemaMedDataTypeList() {
            return SchemaUtils.createSchemaTypeList( medDataTypes, 'v_meddata-schema.medDataTypes.' );
        }

        function createSchemaMedDataCategoryList() {
            return SchemaUtils.createSchemaTypeList( medDataCategories, 'v_meddata-schema.medDataCategories.' );
        }

        function createSchemaMedDataItemDataTypeList() {
            return SchemaUtils.createSchemaTypeList( medDataItemDataTypes, 'v_meddata-schema.medDataItemDataTypes.' );
        }

        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VMeDData_T",
                        "lib": types,
                        "apiv": {v: 2, queryParam: false}
                    }
                },
                "MedDataActType_E": {
                    "type": "String",
                    "default": "MEDDATA",
                    "apiv": {v: 2, queryParam: true},
                    "list": [
                        {
                            "val": "MEDDATA",
                            "-de": i18n( 'activity-schema.Activity_E.MEDDATA' ),
                            i18n: i18n( 'activity-schema.Activity_E.MEDDATA' ),
                            "-en": i18n( 'activity-schema.Activity_E.MEDDATA' )
                        },
                        {
                            "val": "GRAVIDOGRAMMPROCESS",
                            "-de": i18n( 'activity-schema.Activity_E.GRAVIDOGRAMMPROCESS' ),
                            i18n: i18n( 'activity-schema.Activity_E.GRAVIDOGRAMMPROCESS' ),
                            "-en": i18n( 'activity-schema.Activity_E.GRAVIDOGRAMMPROCESS' )
                        },
                        {
                            "val": "PERCENTILECURVE",
                            "-de": "Perzentilenkurven",
                            i18n: i18n( 'activity-schema.Activity_E.PERCENTILECURVE' ),
                            "-en": "Percentilecurve"
                        },
                        {
                            "val": "GRAVIDOGRAMM",
                            "-de": "Gravidogramm",
                            i18n: i18n( 'activity-schema.Activity_E.GRAVIDOGRAMM' ),
                            "-en": "Gravidogramm"
                        }
                    ]
                },
                "VMeDData_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "MedDataActType_E",
                        "lib": types,
                        "apiv": {v: 2, queryParam: false},
                        "required": true
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity",
                        "apiv": {v: 2, queryParam: false}
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "MedData_T",
                        "lib": "activity"
                    },
                    "gravidogrammBase": {
                        "complex": "ext",
                        "type": "Gravidogramm_T",
                        "lib": "activity"
                    }
                },
                medDataType_E: {
                    "type": "String",
                    "list": createSchemaMedDataTypeList()
                },
                medDataCategory_E: {
                    "type": "String",
                    "list": createSchemaMedDataCategoryList()
                },
                medDataItemDataType_E: {
                    "type": "String",
                    "list": createSchemaMedDataItemDataTypeList()
                }

            }
        );

        /**
         * Specialized medDataItemConfig to be used in multiple tags.
         * These objects NEED to be defined BELOW the classes,
         * because Object.defineProperty is not yet declared of these objects!
         */
        var
            medDataItemConfigForBloodPressure = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING,
                textValueValidationRegExp: Y.doccirrus.regexp.bloodPressure,
                /**
                 * @return {string}
                 */
                textValuePlaceholderFunction: function medDataItemPlaceholderBloodPressureSystDiast() {
                    return i18n( 'InCaseMojit.MedDataEditorModel_clientJS.placeholder.BLOOD_PRESSURE' );
                },
                /**
                 * @param {string|any} textValue
                 * @return {MedDataItemConfigSchemaValidationError[]}
                 */
                textValueValidationFunction: function medDataItemValidateBloodPressureSystDiast( textValue ) {
                    var
                        errors = [],
                        matches,
                        options,
                        systUpperLimit = 300,
                        systLowerLimit = 50,
                        diastUpperLimit = 180,
                        diastLowerLimit = 30,
                        syst,
                        diast;

                    switch( true ) {
                        case typeof textValue === "string":
                            // for pregnancy, the "isOptional"-flag is set to true (empty string is also allowed)
                            if( this.isOptional && textValue === "" ) {
                                break;
                            }

                            // match the textValue with the regexp to
                            // split up the value into systolic and diastolic value
                            matches = Y.doccirrus.regexp.bloodPressure.exec( textValue );

                            if( !Array.isArray( matches ) || matches.length < 3 ) {
                                errors.push( 'SYST_VALUE_INVALID' );
                                errors.push( 'DIAST_VALUE_INVALID' );
                            } else {
                                syst = matches[1] && parseFloat( matches[1] );
                                diast = matches[2] && parseFloat( matches[2] );
                                options = {
                                    data: {
                                        SYST: syst,
                                        DIAST: diast,
                                        SYST_MIN: systLowerLimit,
                                        SYST_MAX: systUpperLimit,
                                        DIAST_MIN: diastLowerLimit,
                                        DIAST_MAX: diastUpperLimit
                                    }
                                };

                                if( isNaN( syst ) ) {
                                    errors.push( 'SYST_VALUE_INVALID' );
                                } else if( syst < systLowerLimit ) {
                                    errors.push( 'SYST_VALUE_TOO_LOW_INVALID' );
                                } else if( syst > systUpperLimit ) {
                                    errors.push( 'SYST_VALUE_TOO_HIGH_INVALID' );
                                }

                                if( isNaN( diast ) ) {
                                    errors.push( 'DIAST_VALUE_INVALID' );
                                } else if( diast < diastLowerLimit ) {
                                    errors.push( 'DIAST_VALUE_TOO_LOW_INVALID' );
                                } else if( diast > diastUpperLimit ) {
                                    errors.push( 'DIAST_VALUE_TOO_HIGH_INVALID' );
                                }

                                if( !isNaN( diast ) && !isNaN( syst ) && diast > syst ) {
                                    errors.push( 'DIAST_LARGER_SYST_INVALID' );
                                }
                            }
                            break;
                        case textValue === null || textValue === undefined:
                            // for pregnancy, the "isOptional"-flag is set to true
                            if( this.isOptional ) {
                                break;
                            }
                        // fall-through
                        default:
                            errors.push( 'SYST_VALUE_INVALID' );
                            errors.push( 'DIAST_VALUE_INVALID' );
                    }

                    // map the error message to real error objects
                    // containing the template data replaced in the messages (stored in "options")
                    return errors.map( function forEachErrorMessage( message ) {
                        return new MedDataItemConfigSchemaValidationError( {
                            message: message,
                            options: options
                        } );
                    } );
                },
                /**
                 * Returns a ChartValue entry.
                 * @param {MedDataItemSchema} medDataItem
                 * @return {null|{valueKey: string, valueKey2: (string|undefined), value: number, value2: (number|undefined)}}
                 */
                chartValueFormattingFunction: function chartValueFormattingFunction( medDataItem ) {
                    // match the text value with the regexp for
                    var bloodPressureMatches = Y.doccirrus.regexp.bloodPressure.exec( medDataItem.textValue );
                    if( bloodPressureMatches && bloodPressureMatches.length ) {
                        return {
                            hasChartValue: true,
                            valueKey: i18n( 'v_meddata-schema.medDataTypes.BLOODPRESSURE_SYST' ),
                            value2Key: i18n( 'v_meddata-schema.medDataTypes.BLOODPRESSURE_DIAST' ),
                            value: Number( bloodPressureMatches[1] ),
                            value2: Number( bloodPressureMatches[2] )
                        };
                    }
                    return null;
                }
            } ),

            /**
             * For pregnancy, handing over the parameter is optional
             * @type {MedDataItemConfigSchema}
             */
            medDataItemConfigForBloodPressureP = Object.assign(
                new MedDataItemConfigSchema( medDataItemConfigForBloodPressure ),
                { _isOptional: true }
            ),

            medDataItemConfigForPregnancyWeekAndDay = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING,
                isOptional: true,
                textValueFormattingFunction: function textValueFormattingFunctionForWeekAndDayCorrection( textValue ) {
                    textValue = textValue && textValue.toString() && textValue.toString().trim();
                    textValue = textValue && textValue.split( '/' );
                    if( textValue && textValue[0] ) {
                        return i18n( 'patient-schema.calculateWeekOfGestation.asShortString', {
                            data: {
                                week: textValue[0],
                                days: textValue[1]
                            }
                        } );
                    }
                    return textValue;
                },
                textValuePlaceholderFunction: function textValuePlaceholderFunctionForWeekAndDayCorrection() {
                    return i18n( 'v_meddata-schema.unit.WEEK_AND_DAY_OF_PREGNANCY' );
                },
                /**
                 * Return for PDF the raw textValue (e.g. 4/2) instead of the formatted ("4 und 2")
                 * @param {string} formattedValue
                 * @param {MedDataItemSchema} medDataItem
                 * @return {string}
                 */
                formatMedDataItemForPDFPostProcessor: function formatMedDataItemForPDFPostProcessor( formattedValue, medDataItem ) {
                    if( medDataItem.textValue ) {
                        return medDataItem.textValue;
                    }
                    return formattedValue;
                }
            } ),
            medDataItemConfigForUterineDistance = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING_ENUM,
                isOptional: true,
                enumValueCollection: [
                    'S', 'S/N', '1 ↑ N', '2 ↑ N', 'Rbg', '1 ↓ N', '2 ↓ N', '3 ↓ N'
                ],
                /**
                 * Custom PDF post-processing function to convert PDF-incompatible content.
                 * @param {string} formattedValue
                 * @return {string}
                 */
                formatMedDataItemForPDFPostProcessor: function formatMedDataItemForPDFPostProcessor( formattedValue ) {
                    if( typeof formattedValue === "string" ) {
                        return formattedValue
                            .replace( '↑', '/\\' )
                            .replace( '↓', '\\/' );
                    }
                    return formattedValue;
                }
            } ),
            medDataItemConfigForFoetalPosition = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING_ENUM,
                isOptional: true,
                enumValueCollection: [
                    '(-)', 'I SL', 'II SL', 'I BEL', 'II BEL', 'I QL', 'II QL'
                ]
            } ),
            medDataItemConfigForHeartBeat = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING_ENUM,
                isOptional: true,
                enumValueCollection: [
                    '+ Sono', '+ Doppler', '+ CTG'
                ]
            } ),
            medDataItemConfigForMovement = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING_ENUM,
                isOptional: true,
                enumValueCollection: [
                    '/', '(+)', '+', '-'
                ]
            } ),
            medDataItemConfigForPresence = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING_ENUM,
                isOptional: true,
                enumValueCollection: [
                    '---', '--', '-', '0', '+', '++', '+++'
                ]
            } ),
            medDataItemConfigForRiskCategory = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING_ENUM,
                isOptional: true,
                enumValueCollection: function enumValueCollectionGeneratorForRiskCategory() {
                    var
                        options = [],
                        FIRST_CATEGORY = 28,
                        LAST_CATEGORY = 52,
                        i;

                    for( i = FIRST_CATEGORY; i < LAST_CATEGORY; i++ ) {
                        options.push( {
                            id: i + '',
                            text: i18n( 'activity-schema.Gravidogramm_T.riskCategories.' + i ) + 'X'
                        } );
                    }
                    return options;
                }
            } ),
            medDataItemConfigVaccination = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING_ENUM,
                enumValueCollection: [
                    {
                        id: "0",
                        text: i18n( 'InCaseMojit.MedDataEditorModel_clientJS.title.IMPF0' )
                    },
                    {
                        id: "1",
                        text: i18n( 'InCaseMojit.MedDataEditorModel_clientJS.title.IMPF1' )
                    },
                    {
                        id: "2",
                        text: i18n( 'InCaseMojit.MedDataEditorModel_clientJS.title.IMPF2' )
                    },
                    {
                        id: "3",
                        text: i18n( 'InCaseMojit.MedDataEditorModel_clientJS.title.IMPF3' )
                    }
                ]
            } ),

            // ----------------------- SWISS ITEM CONFIGS ------------------------
            medDataItemConfigAthlete = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING_ENUM,
                /**
                 * @param {object} query select2 query object
                 * @param {string} query.term search term
                 * @return {Promise<{id: string, text: string, cchKey: (number|null)}[]>}
                 */
                enumValueCollectionGenerator: function enumValueCollectionGeneratorForAthlete( query ) {
                    return cdsCodeSearch( {
                        itemsPerPage: 10,
                        query: {
                            term: query && query.term || "",
                            cchType: "CHD"
                        }
                    } ).then( function( response ) {
                        var result = (response || []).map( function( item ) {
                            if( item.title === "Leistungssportler" ) {
                                return {
                                    id: i18n( 'general.text.YES' ),
                                    text: i18n( 'general.text.YES' ),
                                    cchKey: item.cchKey
                                };
                            }
                            return { id: item.title, text: item.title, cchKey: item.cchKey };
                        } );
                        result.unshift( {
                            id: i18n( 'general.text.NO' ),
                            text: i18n( 'general.text.NO' ),
                            cchKey: -1
                        } );
                        result.unshift( { id: '?', text: '?', cchKey: null } );

                        return result;
                    } );
                },
                onTextValueEnumSelect2Write: function __type_select2Write( $event ) {
                    var row;
                    if( this && this.owner && this.owner.owner && this.owner.owner.activeRow &&
                        typeof this.owner.owner.activeRow === "function" ) {
                        row = this.owner.owner.activeRow();
                        if( row && row.cchKey && typeof row.cchKey === "function" ) {
                            row.cchKey( $event.added.cchKey );
                        }
                    }
                }
            } ),
            medDataItemConfigDriver = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING_ENUM,
                /**
                 * @param {object} query select2 query object
                 * @param {string} query.term search term
                 * @return {Promise<{id: string, text: string, cchKey: (number|null)}[]>}
                 */
                enumValueCollectionGenerator: function enumValueCollectionGeneratorForDriver( query ) {
                    return cdsCodeSearch( {
                        itemsPerPage: 10,
                        query: {
                            term: query && query.term || "",
                            cchType: "CHO"
                        }
                    } ).then( function( response ) {
                        var result = (response || []).map( function( item ) {
                            if( item.cchKey === 615 ) {
                                return {
                                    id: i18n( 'general.text.YES' ),
                                    text: i18n( 'general.text.YES' ),
                                    cchKey: item.cchKey
                                };
                            }
                            return { id: item.title, text: item.title, cchKey: item.cchKey };
                        } );

                        result.unshift( {
                            id: i18n( 'general.text.NO' ),
                            text: i18n( 'general.text.NO' ),
                            cchKey: -1
                        } );
                        result.unshift( { id: '?', text: '?', cchKey: null } );

                        return result;
                    } );
                },
                onTextValueEnumSelect2Write: function __type_select2Write( $event ) {
                    var row;
                    if( this && this.owner && this.owner.owner && this.owner.owner.activeRow &&
                        typeof this.owner.owner.activeRow === "function" ) {
                        row = typeof this.owner.owner.activeRow();
                        if( row && row.cchKey && typeof row.cchKey === "function" ) {
                            this.owner.owner.activeRow().cchKey( $event.added.cchKey );
                        }
                    }
                }
            } ),
            medDataItemConfigHepaticInsufficiency = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING_ENUM,
                /**
                 * @param {object} query select2 query object
                 * @param {string} query.term search term
                 * @return {Promise<{id: string, text: string, cchKey: (number|null)}[]>}
                 */
                enumValueCollectionGenerator: function enumValueCollectionGeneratorForHepaticInsufficiency( query ) {
                    return cdsCodeSearch( {
                        itemsPerPage: 10,
                        query: {
                            term: query && query.term || "",
                            cchType: "CHS",
                            state: "1"
                        }
                    } ).then( function( response ) {
                        var result = (response || []).map( function( item ) {
                            return { id: item.title, text: item.title, cchKey: item.cchKey };
                        } );

                        result.unshift( {
                            id: i18n( 'general.text.NO' ),
                            text: i18n( 'general.text.NO' ),
                            cchKey: -1
                        } );
                        result.unshift( { id: '?', text: '?', cchKey: null } );

                        return result;
                    } );
                },
                onTextValueEnumSelect2Write: function __type_select2Write( $event ) {
                    var row;
                    if( this && this.owner && this.owner.owner && this.owner.owner.activeRow &&
                        typeof this.owner.owner.activeRow === "function" ) {
                        row = typeof this.owner.owner.activeRow();
                        if( row && row.cchKey && typeof row.cchKey === "function" ) {
                            this.owner.owner.activeRow().cchKey( $event.added.cchKey );
                        }
                    }
                }
            } ),
            medDataItemConfigRenalFailure = new MedDataItemConfigSchema( {
                validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                dataType: medDataItemDataTypes.STRING_ENUM,
                /**
                 * @param {object} query select2 query object
                 * @param {string} query.term search term
                 * @return {Promise<{id: string, text: string, cchKey: (number|null)}[]>}
                 */
                enumValueCollectionGenerator: function enumValueCollectionGeneratorForRenalFailure( query ) {
                    return cdsCodeSearch( {
                        itemsPerPage: 10,
                        query: {
                            term: query && query.term || "",
                            cchType: "CHS",
                            state: "2"
                        }
                    } ).then( function( response ) {
                        var result = (response || []).map( function( item ) {
                            return { id: item.title, text: item.title, cchKey: item.cchKey };
                        } );

                        result.unshift( {
                            id: i18n( 'general.text.NO' ),
                            text: i18n( 'general.text.NO' ),
                            cchKey: -1
                        } );
                        result.unshift( { id: '?', text: '?', cchKey: null } );

                        return result;
                    } );
                },
                onTextValueEnumSelect2Write: function __type_select2Write( $event ) {
                    var row;
                    if( this && this.owner && this.owner.owner && this.owner.owner.activeRow &&
                        typeof this.owner.owner.activeRow === "function" ) {
                        row = typeof this.owner.owner.activeRow();
                        if( row && row.cchKey && typeof row.cchKey === "function" ) {
                            this.owner.owner.activeRow().cchKey( $event.added.cchKey );
                        }
                    }
                }
            } );

        /**
         * Client/Server independent CDS code search via direct API or jsonrpc call.
         * @param {object} args
         * @param {Object} args.query
         * @param {string} args.query.term
         * @param {string} args.query.cchType
         * @param {string} args.query.state
         * @param {Number} [args.itemsPerPage]
         * @return {Promise<object[]>}
         */
        function cdsCodeSearch( args ) {
            if( Y.doccirrus.commonutils.isClientSide() ) {
                return Y.doccirrus.jsonrpc.api.meddata.cdsCodesSearch( {
                    itemsPerPage: args && args.itemsPerPage || 10,
                    query: args && args.query || {}
                } ).then( function( response ) {
                    return response && response.data || [];
                } ).fail( function() {
                    return [];
                } );
            } else {
                return Y.doccirrus.api.meddata.cdsCodesSearch( {
                    originalParams: { itemsPerPage: args && args.itemsPerPage || 10 },
                    query: args && args.query || {}
                } );
            }
        }

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            ramlConfig: ramlConfig,

            /* MANDATORY */
            name: NAME,

            // ENUMs
            types: types,
            medDataTypes: medDataTypes,
            medDataCategories: medDataCategories,
            medDataCategoriesNonPublic: medDataCategoriesNonPublic,
            gravidogrammDataTypes: gravidogrammDataTypes,
            percentileCurveDataTypes: percentileCurveDataTypes,
            medDataItemDataTypes: medDataItemDataTypes,
            medDataBiometrics: medDataBiometrics,
            medDataBiometricsSwiss: medDataBiometricsSwiss,
            medDataIndividualParameters: medDataIndividualParameters,
            medDataSymptoms: medDataSymptoms,
            medDataAlimentations: medDataAlimentations,
            medDataAllergies: medDataAllergies,

            // specialized medDataItemConfigurations to be loaded in the static tags in tag-schema
            medDataItemConfigForBloodPressure: medDataItemConfigForBloodPressure,
            medDataItemConfigForBloodPressureP: medDataItemConfigForBloodPressureP,
            medDataItemConfigForPregnancyWeekAndDay: medDataItemConfigForPregnancyWeekAndDay,
            medDataItemConfigForUterineDistance: medDataItemConfigForUterineDistance,
            medDataItemConfigForFoetalPosition: medDataItemConfigForFoetalPosition,
            medDataItemConfigForHeartBeat: medDataItemConfigForHeartBeat,
            medDataItemConfigForMovement: medDataItemConfigForMovement,
            medDataItemConfigForPresence: medDataItemConfigForPresence,
            medDataItemConfigForRiskCategory: medDataItemConfigForRiskCategory,
            medDataItemConfigVaccination: medDataItemConfigVaccination,
            medDataItemConfigAthlete: medDataItemConfigAthlete,
            medDataItemConfigDriver: medDataItemConfigDriver,
            medDataItemConfigHepaticInsufficiency: medDataItemConfigHepaticInsufficiency,
            medDataItemConfigRenalFailure: medDataItemConfigRenalFailure,

            // expose classes
            MedDataSchema: MedDataSchema,
            MedDataColumnSchema: MedDataColumnSchema,
            MedDataConfigSchema: MedDataConfigSchema,
            MedDataItemSchema: MedDataItemSchema,
            MedDataItemConfigSchema: MedDataItemConfigSchema,
            MedDataItemConfigSchemaValidationError: MedDataItemConfigSchemaValidationError,
            MedDataItemChartValue: MedDataItemChartValue,
            MedDataItemTemplateSchema: MedDataItemTemplateSchema,

            //  if no cycle length entered then assume 28 day menstrual cycle for estimating pregnancy dates
            DEFAULT_CYCLE_LENGTH: 28
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'dcregexp',
            'dc-comctl',
            'activity-schema',
            'schemautils',
            'dccommonutils'
        ]
    }
);
