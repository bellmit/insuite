import sinon from 'sinon';

describe( 'v_meddata-schema', function() {
    let
        MedDataItemSchema,
        MedDataItemConfigSchema,
        MedDataItemConfigSchemaValidationError,
        MedDataItemTemplateSchema,
        MedDataTypes,
        GravidogrammDataTypes,
        MedDataCategories,
        MedDataItemDataTypes,
        MedDataIndividualParameters,
        MedDataSymptoms,
        MedDataAlimentations,
        MedDataAllergies,
        MedDataBiometricsSwiss,

        medDataItemConfigForBloodPressure,
        medDataItemConfigForBloodPressureP,
        medDataItemConfigForPregnancyWeekAndDay,
        medDataItemConfigForUterineDistance,
        medDataItemConfigForFoetalPosition,
        medDataItemConfigForHeartBeat,
        medDataItemConfigForMovement,
        medDataItemConfigForPresence,
        medDataItemConfigForRiskCategory,
        medDataItemConfigVaccination,
        medDataItemConfigAthlete,
        medDataItemConfigDriver,
        medDataItemConfigHepaticInsufficiency,
        medDataItemConfigRenalFailure;

    before( async function() {
        await import( '../../../../autoload/doccirrus.common.yui' );

        Y.doccirrus.i18n = sinon.stub().callsFake( ( key ) => key );

        await import( './v_meddata-schema.common.yui' );

        MedDataItemSchema = Y.doccirrus.schemas.v_meddata.MedDataItemSchema;
        MedDataItemConfigSchema = Y.doccirrus.schemas.v_meddata.MedDataItemConfigSchema;
        MedDataItemConfigSchemaValidationError = Y.doccirrus.schemas.v_meddata.MedDataItemConfigSchemaValidationError;
        MedDataItemTemplateSchema = Y.doccirrus.schemas.v_meddata.MedDataItemTemplateSchema;

        MedDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories;
        MedDataItemDataTypes = Y.doccirrus.schemas.v_meddata.medDataItemDataTypes;

        MedDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes;
        GravidogrammDataTypes = Y.doccirrus.schemas.v_meddata.gravidogrammDataTypes;
        MedDataIndividualParameters = Y.doccirrus.schemas.v_meddata.medDataIndividualParameters;
        MedDataSymptoms = Y.doccirrus.schemas.v_meddata.medDataSymptoms;
        MedDataAlimentations = Y.doccirrus.schemas.v_meddata.medDataAlimentations;
        MedDataAllergies = Y.doccirrus.schemas.v_meddata.medDataAllergies;
        MedDataBiometricsSwiss = Y.doccirrus.schemas.v_meddata.medDataBiometricsSwiss;

        medDataItemConfigForBloodPressure = Y.doccirrus.schemas.v_meddata.medDataItemConfigForBloodPressure;
        medDataItemConfigForBloodPressureP = Y.doccirrus.schemas.v_meddata.medDataItemConfigForBloodPressureP;
        medDataItemConfigForPregnancyWeekAndDay = Y.doccirrus.schemas.v_meddata.medDataItemConfigForPregnancyWeekAndDay;
        medDataItemConfigForUterineDistance = Y.doccirrus.schemas.v_meddata.medDataItemConfigForUterineDistance;
        medDataItemConfigForFoetalPosition = Y.doccirrus.schemas.v_meddata.medDataItemConfigForFoetalPosition;
        medDataItemConfigForHeartBeat = Y.doccirrus.schemas.v_meddata.medDataItemConfigForHeartBeat;
        medDataItemConfigForMovement = Y.doccirrus.schemas.v_meddata.medDataItemConfigForMovement;
        medDataItemConfigForPresence = Y.doccirrus.schemas.v_meddata.medDataItemConfigForPresence;
        medDataItemConfigForRiskCategory = Y.doccirrus.schemas.v_meddata.medDataItemConfigForRiskCategory;
        medDataItemConfigVaccination = Y.doccirrus.schemas.v_meddata.medDataItemConfigVaccination;
        medDataItemConfigAthlete = Y.doccirrus.schemas.v_meddata.medDataItemConfigAthlete;
        medDataItemConfigDriver = Y.doccirrus.schemas.v_meddata.medDataItemConfigDriver;
        medDataItemConfigHepaticInsufficiency = Y.doccirrus.schemas.v_meddata.medDataItemConfigHepaticInsufficiency;
        medDataItemConfigRenalFailure = Y.doccirrus.schemas.v_meddata.medDataItemConfigRenalFailure;

        this.now = new Date();
    } );

    after( function() {
        Y = null;
    } );

    context( 'MedDataTypes', function() {

        it( 'is an ENUM object', function() {
            expect( MedDataTypes ).to.be.an( "object" );
        } );

        it( 'is symmetric (keys match values)', function() {
            expect( Object.keys( MedDataTypes ) ).to.be.eql( Object.values( MedDataTypes ) );
        } );

    } );

    context( 'MedDataCategories', function() {

        it( 'is an ENUM object', function() {
            expect( MedDataCategories ).to.be.an( "object" );
        } );

        it( 'has expected keys', function() {
            expect( Object.keys( MedDataCategories ) ).to.be.eql( [
                'BIOMETRICS',
                'ALLERGIES',
                'SYMPTOMS',
                'ALIMENTATIONS',
                'ACTIVEINGREDIENTS',
                'GRAVIDOGRAMM',
                'PERCENTILECURVE'
            ] );
        } );

        it( 'is symmetric (keys match values)', function() {
            expect( Object.keys( MedDataCategories ) ).to.be.eql( Object.values( MedDataCategories ) );
        } );

    } );

    context( 'MedDataItemDataTypes', function() {

        it( 'is an ENUM object', function() {
            expect( MedDataItemDataTypes ).to.be.an( "object" );
        } );

        it( 'has expected keys', function() {
            expect( Object.keys( MedDataItemDataTypes ) ).to.be.eql( [
                'ANY', // fill out any values
                'STRING_OR_NUMBER', // stored in textValue or value (OLD default of inSuite)
                'STRING', // stored in textValue
                'STRING_ENUM', // stored in textValue, validated by list
                'NUMBER_INT', // stored in value
                'NUMBER_TIMEDIFF', // stored in value`
                'NUMBER_FLOAT', // stored in value,
                'NUMBER_FORMULA', // stored in value
                'BOOLEAN', // stored in boolValue
                'DATE', // stored in dateValue,
                'DATE_TIME' // stored in dateValue
            ] );
        } );

        it( 'is symmetric (keys match values)', function() {
            expect( Object.keys( MedDataItemDataTypes ) ).to.be.eql( Object.values( MedDataItemDataTypes ) );
        } );

    } );

    context( 'MedDataItemSchema', function() {

        describe( '#constructor()', function() {

            describe( 'called with native data types for each property', function() {

                beforeEach( function() {
                    this.fixture = {
                        category: MedDataCategories.BIOMETRICS,
                        type: 'I am a test',
                        value: 1.23456789,
                        textValue: "TEST",
                        boolValue: true,
                        dateValue: new Date( 2011, 11, 11, 0, 0, 0 ),
                        unit: "ms",
                        sampleNormalValueText: ["10-100"],
                        cchKey: undefined,
                        additionalData: {
                            textKey: "Text in additionalData",
                            numberKey: 12345.6789,
                            boolKey: true,
                            dateKey: new Date( 2020, 2, 22, 22, 22, 22 )
                        }
                    };
                    this.candidate = new MedDataItemSchema( this.fixture );
                } );

                afterEach( function() {
                    this.candidate = null;
                    this.fixture = null;
                } );

                it( 'returns instance of MedDataItemSchema', function() {
                    expect( this.candidate ).to.be.instanceOf( MedDataItemSchema );
                } );

                it( 'has input parameters properly set', function() {
                    expect( this.candidate.category ).to.be.equal( this.fixture.category );
                    expect( this.candidate.type ).to.be.equal( this.fixture.type );
                    expect( this.candidate.value ).to.be.equal( this.fixture.value );
                    expect( this.candidate.unit ).to.be.equal( this.fixture.unit );
                    expect( this.candidate.textValue ).to.be.equal( this.fixture.textValue );
                    expect( this.candidate.dateValue ).to.be.equal( this.fixture.dateValue );
                    expect( this.candidate.boolValue ).to.be.equal( this.fixture.boolValue );
                    expect( this.candidate.cchKey ).to.be.equal( this.fixture.cchKey );

                    // deep equalities
                    expect( this.candidate.sampleNormalValueText ).to.be.eql( this.fixture.sampleNormalValueText );
                    expect( this.candidate.additionalData ).to.be.eql( this.fixture.additionalData );
                    expect( this.candidate.noTagCreation ).to.be.eql( false );
                    expect( this.candidate.version ).to.be.equal( 0 );
                } );

                it( 'returns a plain object with toJSON and toObject method', function() {
                    expect( this.candidate.toJSON() ).to.be.eql(
                        Object.assign(
                            {
                                noTagCreation: false
                            },
                            this.fixture
                        )
                    );
                } );

                it( 'fromObject should return the same as the constructor', function() {
                    expect( MedDataItemSchema.fromObject( this.fixture ) ).to.be.instanceOf( MedDataItemSchema );
                    expect( MedDataItemSchema.fromObject( this.fixture ) ).to.be.eql( this.candidate );
                } );

            } );

            describe( 'called with non-native data types, i.e. date-string instead of Date', function() {

                beforeEach( function() {
                    this.dateString = new Date( 2011, 11, 11, 0, 0, 0 ).toISOString();
                    this.boolString = "TrUe";
                    this.fixture = {
                        category: MedDataCategories.BIOMETRICS,
                        type: 'I am a test',
                        value: 1.23456789,
                        textValue: "TEST",
                        boolValue: this.boolString,
                        dateValue: this.dateString,
                        unit: "ms",
                        sampleNormalValueText: ["10-100"],
                        additionalData: null
                    };
                    this.candidate = new MedDataItemSchema( this.fixture );
                } );

                afterEach( function() {
                    this.candidate = null;
                    this.fixture = null;
                    this.dateString = null;
                    this.boolString = null;
                } );

                it( 'returns instance of MedDataItemSchema', function() {
                    expect( this.candidate ).to.be.instanceOf( MedDataItemSchema );
                } );

                it( 'has non-native types properly converted', function() {
                    expect( this.candidate.dateValue ).to.be.instanceOf( Date );
                    expect( this.candidate.dateValue.toISOString() ).to.be.equal( this.dateString );
                    expect( this.candidate.boolValue ).to.be.an( "boolean" );
                    expect( this.candidate.boolValue ).to.be.equal( true );
                    expect( this.candidate.additionalData ).to.be.eql( {} );
                } );

                it( 'fromObject should return the same as the constructor', function() {
                    expect( MedDataItemSchema.fromObject( this.fixture ) ).to.be.instanceOf( MedDataItemSchema );
                    expect( MedDataItemSchema.fromObject( this.fixture ) ).to.be.eql( this.candidate );
                } );

            } );

        } );

        describe( '#setAdditionalData()', function() {

            beforeEach( function() {
                this.fixture = {
                    category: MedDataCategories.BIOMETRICS,
                    type: 'I am a test',
                    value: 1.23456789,
                    textValue: "TEST",
                    boolValue: true,
                    dateValue: new Date( 2011, 11, 11, 0, 0, 0 ),
                    unit: "ms",
                    sampleNormalValueText: ["10-100"],
                    cchKey: undefined,
                    additionalData: {
                        textKey: "Text in additionalData",
                        numberKey: 12345.6789,
                        boolKey: true,
                        dateKey: new Date( 2020, 2, 22, 22, 22, 22 )
                    }
                };
                this.candidate = new MedDataItemSchema( this.fixture );
            } );

            afterEach( function() {
                this.candidate = null;
                this.fixture = null;
            } );

            it( 'add a new key-value-pair', function() {
                this.candidate.setAdditionalData( "testValue", "12345" );
                expect( this.candidate.additionalData ).to.be.eql(
                    Object.assign(
                        {},
                        this.fixture.additionalData,
                        { testValue: "12345" }
                    )
                );
            } );

            it( 'overwrite an existing key-value-pair', function() {
                this.candidate.setAdditionalData( "numberKey", "12345" );
                expect( this.candidate.additionalData ).to.be.eql(
                    Object.assign(
                        {},
                        this.fixture.additionalData,
                        { numberKey: "12345" }
                    )
                );
            } );

        } );

        describe( '.createAdditionalDataKey()', function() {

            it( 'returns a properly formated key', function() {
                expect( MedDataItemSchema.createAdditionalDataKey( "TESTPREFIX", "TESTMIDDLE", "TESTVARIABLE" ) ).to.be.equal( "TESTPREFIX_TESTMIDDLE_TESTVARIABLE" );
                expect( MedDataItemSchema.createAdditionalDataKey( null, "TESTMIDDLE", "TESTVARIABLE" ) ).to.be.equal( "NONE_TESTMIDDLE_TESTVARIABLE" );
                expect( MedDataItemSchema.createAdditionalDataKey( null, null, "TESTVARIABLE" ) ).to.be.equal( "NONE__TESTVARIABLE" );
                expect( MedDataItemSchema.createAdditionalDataKey( null, null, null ) ).to.be.equal( "NONE__" );
            } );

        } );

    } );

    context( 'MedDataItemConfigSchema', function() {

        describe( '#constructor()', function() {

            describe( 'with full set of input parameters', function() {

                beforeEach( function() {
                    /**
                     * @type {MedDataItemConfigSchema}
                     */
                    this.fixture = {
                        dataType: MedDataItemDataTypes.STRING,

                        isOptional: true,
                        validForUnit: "ms",

                        validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),

                        dateValueFormat: "DD.MM.YYYY",
                        dateValueMinDate: new Date( 1900, 1, 1, 0, 0, 0, 0, 0 ),
                        dateValueMaxDate: new Date( 2000, 1, 1, 0, 0, 0, 0, 0 ),

                        enumValueCollection: ["TEST-1", "TEST-2", "TEST-3"],

                        textValueMinLength: 0,
                        textValueMaxLength: 10,
                        textValueValidationRegExp: /^[a-zA-Z]$/,
                        textValuePlaceholderFunction: () => "placeholder",
                        textValueValidationFunction: ( textValue ) => textValue !== null ? null : null,

                        valueLeadingZeros: 2,
                        valueDigits: 2,
                        valueMaxValue: 200,
                        valueMinValue: 0,
                        valueRoundingMethod: 1,
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
                        manualCalculation: false,

                        chartValueFormattingFunction: ( medDataItem ) => ( {
                            hasChartValue: true,
                            valueKey: "value key",
                            value2Key: "value 2 key",
                            value: 123.456,
                            value2: 456.789
                        } ),
                        onTextValueEnumSelect2Write: ( $event, observable ) => !!$event && !!observable
                    };
                    this.candidate = new MedDataItemConfigSchema( this.fixture );
                } );

                afterEach( function() {
                    this.candidate = null;
                    this.fixture = null;
                } );

                it( 'returns instance of MedDataItemConfigSchema', function() {
                    expect( this.candidate ).to.be.instanceOf( MedDataItemConfigSchema );
                } );

                it( 'has the template correctly transferred', function() {
                    expect( this.candidate.template ).to.be.equal( this.fixture.template );
                } );

                it( 'has the validFromIncl date set', function() {
                    expect( this.candidate.validFromIncl ).to.be.eql( this.fixture.validFromIncl );
                } );

                it( 'has the validForUnit passed', function() {
                    expect( this.candidate.validForUnit ).to.be.equal( this.fixture.validForUnit );
                } );

                it( 'has the dataType set', function() {
                    expect( this.candidate.dataType ).to.be.equal( this.fixture.dataType );
                } );

                it( 'has the isOptional flag set', function() {
                    expect( this.candidate.isOptional ).to.be.equal( this.fixture.isOptional );
                } );

                it( 'has value-properties properly passed', function() {
                    expect( this.candidate.valueRoundingMethod ).to.be.equal( this.fixture.valueRoundingMethod );
                    expect( this.candidate.valueLeadingZeros ).to.be.equal( this.fixture.valueLeadingZeros );
                    expect( this.candidate.valueDigits ).to.be.equal( this.fixture.valueDigits );
                    expect( this.candidate.valueMinValue ).to.be.equal( this.fixture.valueMinValue );
                    expect( this.candidate.valueMaxValue ).to.be.equal( this.fixture.valueMaxValue );
                    expect( this.candidate.valueFormulaExpression ).to.be.equal( this.fixture.valueFormulaExpression );
                    expect( this.candidate.valueFormulaScope ).to.be.eql( this.fixture.valueFormulaScope );
                    expect( this.candidate.manualCalculation ).to.be.equal( this.fixture.manualCalculation );
                } );

                it( 'has textValue-properties properly passed', function() {
                    expect( this.candidate.textValueMinLength ).to.be.equal( this.fixture.textValueMinLength );
                    expect( this.candidate.textValueMaxLength ).to.be.equal( this.fixture.textValueMaxLength );
                    expect( this.candidate.textValueValidationRegExp ).to.be.equal( this.fixture.textValueValidationRegExp );
                    expect( this.candidate.textValueValidationFunction ).to.be.equal( this.fixture.textValueValidationFunction );
                    expect( this.candidate.textValuePlaceholderFunction ).to.be.equal( this.fixture.textValuePlaceholderFunction );
                    expect( this.candidate.textValueFormattingFunction ).to.be.equal( this.fixture.textValueFormattingFunction );
                    expect( this.candidate.enumValueCollectionOptions ).to.be.eql( this.fixture.enumValueCollection.map( item => {
                        return { id: item, text: item };
                    } ) );
                    expect( this.candidate.enumValueCollectionGenerator ).to.be.equal( this.fixture.enumValueCollectionGenerator );
                    expect( this.candidate.onTextValueEnumSelect2Write ).to.be.equal( this.fixture.onTextValueEnumSelect2Write );
                } );

                it( 'has dateValue-properties properly passed', function() {
                    expect( this.candidate.dateValueFormat ).to.be.equal( this.fixture.dateValueFormat );
                    expect( this.candidate.dateValueMinDate ).to.be.equal( this.fixture.dateValueMinDate );
                    expect( this.candidate.dateValueMaxDate ).to.be.equal( this.fixture.dateValueMaxDate );
                } );

                it( 'returns a plain object with toJSON and toObject method', function() {
                    const
                        expectedObject = Object.assign( {}, this.fixture,
                            // overrides
                            {
                                textValueValidationRegExp: "^[a-zA-Z]$"
                            }
                        );

                    // delete non-exported properties (especially functions)
                    Object.keys( expectedObject ).forEach( ( key ) => {
                        if( typeof expectedObject[key] === "function" ) {
                            delete expectedObject[key];
                        }
                    } );

                    expect( this.candidate.toJSON() ).to.be.eql( expectedObject );
                } );

            } );

            describe( 'with minimum set of input parameters', function() {

                beforeEach( function() {
                    /**
                     * @type {MedDataItemConfigSchema}
                     */
                    this.fixture = {
                        dataType: MedDataItemDataTypes.STRING,
                        validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 )
                    };
                    this.candidate = new MedDataItemConfigSchema( this.fixture );
                } );

                afterEach( function() {
                    this.candidate = null;
                    this.fixture = null;
                } );

                it( 'returns instance of MedDataItemConfigSchema', function() {
                    expect( this.candidate ).to.be.instanceOf( MedDataItemConfigSchema );
                } );

                it( 'has the template correctly transferred', function() {
                    expect( this.candidate.template ).to.be.equal( this.fixture.template );
                } );

                it( 'has the validFromIncl date set', function() {
                    expect( this.candidate.validFromIncl ).to.be.eql( this.fixture.validFromIncl );
                } );

                it( 'has the validForUnit passed', function() {
                    expect( this.candidate.validForUnit ).to.be.equal( undefined );
                } );

                it( 'has the dataType set', function() {
                    expect( this.candidate.dataType ).to.be.equal( this.fixture.dataType );
                } );

                it( 'has the isOptional flag set', function() {
                    expect( this.candidate.isOptional ).to.be.equal( false );
                } );

                it( 'has value-properties properly passed', function() {
                    expect( this.candidate.valueRoundingMethod ).to.be.equal( null );
                    expect( this.candidate.valueLeadingZeros ).to.be.equal( undefined );
                    expect( this.candidate.valueDigits ).to.be.equal( undefined );
                    expect( this.candidate.valueMinValue ).to.be.equal( undefined );
                    expect( this.candidate.valueMaxValue ).to.be.equal( undefined );
                    expect( this.candidate.valueFormulaExpression ).to.be.equal( undefined );
                    expect( this.candidate.valueFormulaScope ).to.be.eql( undefined );
                    expect( this.candidate.manualCalculation ).to.be.equal( undefined );
                } );

                it( 'has textValue-properties properly passed', function() {
                    expect( this.candidate.textValueMinLength ).to.be.equal( undefined );
                    expect( this.candidate.textValueMaxLength ).to.be.equal( undefined );
                    expect( this.candidate.textValueValidationRegExp ).to.be.equal( undefined );
                    expect( this.candidate.textValueValidationFunction ).to.be.equal( undefined );
                    expect( this.candidate.textValuePlaceholderFunction ).to.be.equal( undefined );
                    expect( this.candidate.textValueFormattingFunction ).to.be.equal( undefined );
                    expect( this.candidate.enumValueCollectionOptions ).to.be.eql( [] );
                    expect( this.candidate.enumValueCollectionGenerator ).to.be.equal( undefined );
                    expect( this.candidate.onTextValueEnumSelect2Write ).to.be.equal( undefined );
                } );

                it( 'has dateValue-properties properly passed', function() {
                    expect( this.candidate.dateValueFormat ).to.be.equal( undefined );
                    expect( this.candidate.dateValueMinDate ).to.be.equal( undefined );
                    expect( this.candidate.dateValueMaxDate ).to.be.equal( undefined );
                } );

                it( 'returns a plain object with toJSON and toObject method', function() {
                    const
                        plainObject = this.candidate.toJSON(),
                        expectedObject = Object.assign(
                            {},
                            this.fixture,
                            {
                                isOptional: false,
                                enumValueCollection: [],
                                valueRoundingMethod: null
                            }
                        );

                    // delete non-exported properties (especially functions)
                    Object.keys( expectedObject ).forEach( ( key ) => {
                        if( typeof expectedObject[key] === "function" ) {
                            delete expectedObject[key];
                        }
                    } );

                    // add all missing properties as undefined
                    Object.keys( plainObject ).forEach( ( key ) => {
                        if( typeof plainObject[key] === "undefined" ) {
                            expectedObject[key] = undefined;
                        }
                    } );

                    expect( plainObject ).to.be.eql( expectedObject );
                } );

            } );

        } );

        describe( '#getSignificantDigits()', function() {

            it( 'returns correct default value for NUMBER_FLOAT', function() {
                const config = new MedDataItemConfigSchema( {
                    dataType: MedDataItemDataTypes.NUMBER_FLOAT
                } );
                expect( config.getSignificantDigits() ).to.be.equal( 2 );
            } );

            it( 'returns correct default value for NUMBER_INT', function() {
                const config = new MedDataItemConfigSchema( {
                    dataType: MedDataItemDataTypes.NUMBER_INT
                } );
                expect( config.getSignificantDigits() ).to.be.equal( 0 );
            } );

            it( 'returns proper values for individual options', function() {
                const
                    config = new MedDataItemConfigSchema( {} ),
                    options = [
                        {
                            value: 123.34567,
                            fullPrecision: false,
                            digits: 4,

                            expectedResult: 4
                        },
                        {
                            value: 123.34567,
                            fullPrecision: true,
                            digits: 2,

                            expectedResult: 5
                        }
                    ];

                options.forEach( ( option ) => {
                    expect( config.getSignificantDigits( option ),
                        `${option}`
                    ).to.be.equal( option.expectedResult );
                } );
            } );

        } );

        describe( '#appendValidationErrorMessage()', function() {

            it( 'converts strings into a MedDataItemConfigSchemaValidationError and appends them to the collection', function() {
                const
                    config = new MedDataItemConfigSchema( {} ),
                    errorMessages = [];

                config.appendValidationErrorMessage( errorMessages, "test", { test: "TEST" } );

                expect( errorMessages ).to.be.eql( [
                    new MedDataItemConfigSchemaValidationError( {
                        message: "test",
                        options: {
                            data: { test: "TEST" }
                        }
                    } )
                ] );
            } );

            it( 'appends MedDataItemConfigSchemaValidationError to the collection', function() {
                const
                    config = new MedDataItemConfigSchema( {} ),
                    error = new MedDataItemConfigSchemaValidationError( {
                        message: "test",
                        options: {
                            data: { test: "TEST" }
                        }
                    } ),
                    errorMessages = [];

                config.appendValidationErrorMessage( errorMessages, error );
                config.appendValidationErrorMessage( errorMessages, error );

                expect( errorMessages ).to.be.eql( [error, error] );
            } );

        } );

        describe( '#getValueRoundingMethod()', function() {

            before( function() {
                this.tests = [
                    {
                        valueRoundingMethod: null,
                        expectedFunction: "trunc",
                        testCases: [
                            {
                                value: 12.345,
                                output: 12.3
                            },
                            {
                                value: 45.678,
                                output: 45.6
                            }
                        ]
                    },
                    {
                        valueRoundingMethod: -1,
                        expectedFunction: "floor",
                        testCases: [
                            {
                                value: 12.345,
                                output: 12.3
                            },
                            {
                                value: 45.678,
                                output: 45.6
                            }
                        ]

                    },
                    {
                        valueRoundingMethod: 0,
                        expectedFunction: "round",
                        testCases: [
                            {
                                value: 12.345,
                                output: 12.3
                            },
                            {
                                value: 45.678,
                                output: 45.7
                            }
                        ]
                    },
                    {
                        valueRoundingMethod: 1,
                        expectedFunction: "ceil",
                        testCases: [
                            {
                                value: 12.345,
                                output: 12.4
                            },
                            {
                                value: 45.678,
                                output: 45.7
                            }
                        ]
                    }
                ];
                this.roundingMethodSpy = {};
                for( let test of this.tests ) {
                    this.roundingMethodSpy[test.expectedFunction] = sinon.spy( Math, test.expectedFunction );
                }
            } );

            after( function() {
                for( let test of this.tests ) {
                    this.roundingMethodSpy[test.expectedFunction].restore();
                }
                this.roundingMethodSpy = null;
                this.tests = null;
            } );

            it( `returns an encapsuled Math function (.floor,.ceil,.round,.trunc) which when applied to an input leads to the expected output`, function() {
                for( let test of this.tests ) {
                    const
                        config = new MedDataItemConfigSchema( {
                            dataType: MedDataItemDataTypes.NUMBER_FLOAT,
                            valueRoundingMethod: test.valueRoundingMethod
                        } ),
                        method = config.getValueRoundingMethod();

                    // check output
                    test.testCases.forEach( ( testCase ) => {
                        expect(
                            method( testCase.value, 1 ),
                            `${test.expectedFunction} leads to an unexpected output`
                        ).to.be.equal( testCase.output );
                    } );

                    // check function's call count
                    expect(
                        this.roundingMethodSpy[test.expectedFunction].callCount,
                        `callCount to the rounding method ${test.expectedFunction} does not match`
                    ).to.be.equal( test.testCases.length );
                }
            } );

        } );

        describe( '#getDateValueFormatPattern()', function() {

            it( `returns a proper date format for Date dataTypes or else an empty string`, function() {

                Object.keys( MedDataItemDataTypes ).forEach( ( dataType ) => {
                    const
                        correctPatterns = {
                            [MedDataItemDataTypes.DATE]: "general.TIMESTAMP_FORMAT",
                            [MedDataItemDataTypes.DATE_TIME]: "general.TIMESTAMP_FORMAT_LONG"
                        },
                        correctPattern = correctPatterns[dataType] || "",
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );

                    expect(
                        config.getDateValueFormatPattern(),
                        `expected getDateValueFormatPattern to return ${correctPattern} for dataType ${dataType}`
                    ).to.be.equal( correctPattern );
                } );

            } );

            it( `returns the predefined date format for all data types, when defined`, function() {

                Object.keys( MedDataItemDataTypes ).forEach( ( dataType ) => {
                    const
                        correctPattern = "DD.MM.YYYY",
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType,
                            dateValueFormat: correctPattern
                        } );

                    expect(
                        config.getDateValueFormatPattern(),
                        `expected getDateValueFormatPattern to return ${correctPattern} for dataType ${dataType}`
                    ).to.be.equal( correctPattern );
                } );

            } );

        } );

        describe( '#getValueFormulaScope()', function() {

            before( function() {
                this.valueFormulaScope = [
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
                ];
            } );

            after( function() {
                this.valueFormulaScope = null;
            } );

            it( 'returns a scope for values only located in latestMedData', function() {
                const
                    errorMessages = [],
                    latestMedData = [
                        new MedDataItemSchema( {
                            type: "WEIGHT",
                            value: 100
                        } ),
                        new MedDataItemSchema( {
                            type: "HEIGHT",
                            value: 1
                        } )
                    ],
                    extendedMedData = [],
                    expectedResult = {
                        "w": 100,
                        "h": 1
                    },
                    config = new MedDataItemConfigSchema( { valueFormulaScope: this.valueFormulaScope } ),
                    staticScope = MedDataItemConfigSchema.getStaticScope(),
                    scope = config.getValueFormulaScope( { latestMedData }, errorMessages, { extendedMedData } );

                // static scope keys given (just check the keys, the content may be hard to compare (i.e. Date.now())
                Object.keys( staticScope ).forEach( ( key ) => {
                    expect(
                        typeof scope[key],
                        `static scope key ${key} is expected but undefined on scope`
                    ).to.be.not.equal( "undefined" );

                    // delete the key from the scope to allow the test to pass
                    delete scope[key];
                } );

                // correctly defined scope
                expect( scope ).to.be.eql( expectedResult );

                // no errors
                expect( errorMessages ).to.have.length( 0 );
            } );

            it( 'returns a scope for values in latestMedData being overwritten by extendedMedData', function() {
                const
                    errorMessages = [],
                    latestMedData = [
                        new MedDataItemSchema( {
                            type: "WEIGHT",
                            value: 100
                        } ),
                        new MedDataItemSchema( {
                            type: "HEIGHT",
                            value: 1
                        } )
                    ],
                    extendedMedData = [
                        new MedDataItemSchema( {
                            type: "HEIGHT",
                            value: 2
                        } )
                    ],
                    expectedResult = {
                        "w": 100,
                        "h": 2
                    },
                    config = new MedDataItemConfigSchema( { valueFormulaScope: this.valueFormulaScope } ),
                    staticScope = MedDataItemConfigSchema.getStaticScope(),
                    scope = config.getValueFormulaScope( { latestMedData }, errorMessages, { extendedMedData } );

                // static scope keys given (just check the keys, the content may be hard to compare (i.e. Date.now())
                Object.keys( staticScope ).forEach( ( key ) => {
                    expect(
                        typeof scope[key],
                        `static scope key ${key} is expected but undefined on scope`
                    ).to.be.not.equal( "undefined" );

                    // delete the key from the scope to allow the test to pass
                    delete scope[key];
                } );

                // correctly defined scope
                expect( scope ).to.be.eql( expectedResult );

                // no errors
                expect( errorMessages ).to.have.length( 0 );
            } );

            it( 'logs an error for missing scope values', function() {
                const
                    errorMessages = [],
                    latestMedData = [
                        new MedDataItemSchema( {
                            type: "HEIGHT",
                            value: 1
                        } )
                    ],
                    extendedMedData = [
                        new MedDataItemSchema( {
                            type: "HEIGHT",
                            value: 2
                        } )
                    ],
                    expectedResult = {
                        "h": 2
                    },
                    config = new MedDataItemConfigSchema( { valueFormulaScope: this.valueFormulaScope } ),
                    staticScope = MedDataItemConfigSchema.getStaticScope(),
                    scope = config.getValueFormulaScope( { latestMedData }, errorMessages, { extendedMedData } );

                // static scope keys given (just check the keys, the content may be hard to compare (i.e. Date.now())
                Object.keys( staticScope ).forEach( ( key ) => {
                    expect(
                        typeof scope[key],
                        `static scope key ${key} is expected but undefined on scope`
                    ).to.be.not.equal( "undefined" );

                    // delete the key from the scope to allow the test to pass
                    delete scope[key];
                } );

                // correctly defined scope
                expect( scope ).to.be.eql( expectedResult );

                // an error is logged for the missing WEIGHT
                expect( errorMessages ).to.have.length( 1 );
                expect( errorMessages[0].message ).to.be.equal( "FORMULA_ERROR_SCOPE_NOT_FOUND" );
                expect( errorMessages[0].options.data.PROPERTIES ).to.be.equal( "WEIGHT" );
            } );

        } );

        describe( '#getPlaceholderForMedDataItem()', function() {

            before( function() {
                this.getPlaceholderForBoolValueStub = sinon.stub( MedDataItemConfigSchema.prototype, 'getPlaceholderForBoolValue' );
                this.getPlaceholderForBoolValueStub.callsFake( () => {
                    return "BOOLVALUE";
                } );
                this.getPlaceholderForValueStub = sinon.stub( MedDataItemConfigSchema.prototype, 'getPlaceholderForValue' );
                this.getPlaceholderForValueStub.callsFake( () => {
                    return "VALUE";
                } );
                this.getPlaceholderForTextValueStub = sinon.stub( MedDataItemConfigSchema.prototype, 'getPlaceholderForTextValue' );
                this.getPlaceholderForTextValueStub.callsFake( () => {
                    return "TEXTVALUE";
                } );
                this.getPlaceholderForDateValueStub = sinon.stub( MedDataItemConfigSchema.prototype, 'getPlaceholderForDateValue' );
                this.getPlaceholderForDateValueStub.callsFake( () => {
                    return "DATEVALUE";
                } );
            } );

            after( function() {
                this.getPlaceholderForBoolValueStub.restore();
                this.getPlaceholderForBoolValueStub = null;
                this.getPlaceholderForValueStub.restore();
                this.getPlaceholderForValueStub = null;
                this.getPlaceholderForTextValueStub.restore();
                this.getPlaceholderForTextValueStub = null;
                this.getPlaceholderForDateValueStub.restore();
                this.getPlaceholderForDateValueStub = null;
            } );

            it( 'calls the output of the dataType-specific functions', function() {

                Object.keys( MedDataItemDataTypes ).forEach( ( dataType ) => {
                    const
                        concatCharacterDefault = ", ",
                        concatCharacter = " | ",
                        expectedOutput = {
                            [MedDataItemDataTypes.ANY]: ["BOOLVALUE", "VALUE", "TEXTVALUE", "DATEVALUE"],

                            [MedDataItemDataTypes.STRING_OR_NUMBER]: ["VALUE", "TEXTVALUE"],

                            [MedDataItemDataTypes.NUMBER_INT]: "VALUE",
                            [MedDataItemDataTypes.NUMBER_TIMEDIFF]: "VALUE",
                            [MedDataItemDataTypes.NUMBER_FLOAT]: "VALUE",

                            [MedDataItemDataTypes.BOOLEAN]: "BOOLVALUE",

                            [MedDataItemDataTypes.STRING]: "TEXTVALUE",
                            [MedDataItemDataTypes.STRING_ENUM]: "TEXTVALUE",

                            [MedDataItemDataTypes.DATE]: "DATEVALUE",
                            [MedDataItemDataTypes.DATE_TIME]: "DATEVALUE",

                            [MedDataItemDataTypes.NUMBER_FORMULA]: ""
                        },
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );

                    expect(
                        expectedOutput[dataType],
                        `if this test fails, please define an output for dataType: ${dataType}`
                    ).to.be.not.equal( undefined );

                    const
                        expectedOutputWithSeparator = Array.isArray( expectedOutput[dataType] )
                            ? expectedOutput[dataType].join( concatCharacter )
                            : expectedOutput[dataType],
                        expectedOutputWithDefaultSeparator = Array.isArray( expectedOutput[dataType] )
                            ? expectedOutput[dataType].join( concatCharacterDefault )
                            : expectedOutput[dataType];

                    expect(
                        config.getPlaceholderForMedDataItem( { concatCharacter } ),
                        `expected getPlaceholderForMedDataItem to return ${expectedOutputWithSeparator} for dataType ${dataType} and separator ${concatCharacter}`
                    ).to.be.equal( expectedOutputWithSeparator );

                    expect(
                        config.getPlaceholderForMedDataItem(),
                        `expected getPlaceholderForMedDataItem to return ${expectedOutputWithDefaultSeparator} for dataType ${dataType} (default separator)`
                    ).to.be.equal( expectedOutputWithDefaultSeparator );

                } );

            } );

        } );

        describe( '#getPlaceholderForBoolValue()', function() {

            it( 'returns properly formatted placeholder with both boolean options', function() {
                const config = new MedDataItemConfigSchema( {} );
                expect( config.getPlaceholderForBoolValue() ).to.be.equal( [
                    "general.BOOLEAN_TRUE",
                    "general.BOOLEAN_FALSE"
                ].join( "general.ENUMOR" ) );
            } );

        } );

        describe( '#getPlaceholderForValue()', function() {

            it( 'returns the formatted value range configured or an exemplary value', function() {
                const
                    tests = [
                        {
                            valueMinValue: undefined,
                            valueMaxValue: undefined,
                            valueRoundingMethod: 0,
                            valueDigits: 2,
                            expectedOutput: "123.45"
                        },
                        {
                            valueMinValue: 1.23456,
                            valueMaxValue: 123.456,
                            valueRoundingMethod: 0,
                            valueDigits: 2,
                            expectedOutput: "1.23 general.RANGETO 123.46" // rounded by default to two digits
                        },
                        {
                            valueMinValue: 1.23456,
                            valueMaxValue: undefined,
                            valueRoundingMethod: 0,
                            valueDigits: 2,
                            expectedOutput: "general.GREATERTHAN_OR_EQUAL 1.23" // rounded by default to two digits
                        },
                        {
                            valueMinValue: undefined,
                            valueMaxValue: 123.456,
                            valueRoundingMethod: 0,
                            valueDigits: 2,
                            expectedOutput: "general.LESSTHAN_OR_EQUAL 123.46" // rounded by default to two digits
                        }
                    ];

                tests.forEach( ( test ) => {
                    const config = new MedDataItemConfigSchema( test );
                    expect(
                        config.getPlaceholderForValue(),
                        `minValue: ${test.valueMinValue}, maxValue: ${test.valueMaxValue}`
                    ).to.be.equal( test.expectedOutput );
                } );
            } );

        } );

        describe( '#getPlaceholderForTextValue()', function() {

            it( 'returns the output of a textValuePlaceholderFunction, when defined', function() {
                const textValuePlaceholderFunction = () => "placeholder";
                const config = new MedDataItemConfigSchema( { textValuePlaceholderFunction } );
                expect( config.getPlaceholderForTextValue() ).to.be.equal( textValuePlaceholderFunction() );
            } );

            it( 'returns all options for an STRING_ENUM data type defined in enumValueCollection', function() {
                const
                    enumValueCollection = ["TEST-1", "TEST-2", "TEST-3"],
                    expectedOutput = enumValueCollection.join( 'general.ENUMOR' ),
                    config = new MedDataItemConfigSchema( {
                        dataType: MedDataItemDataTypes.STRING_ENUM,
                        enumValueCollection
                    } );
                expect( config.getPlaceholderForTextValue() ).to.be.equal( expectedOutput );
            } );

            it( 'returns the properly formatted min and max length of characters configured', function() {
                const
                    tests = [
                        {
                            textValueMinLength: undefined,
                            textValueMaxLength: undefined,
                            expectedOutput: ""
                        },
                        {
                            textValueMinLength: 1,
                            textValueMaxLength: 10,
                            expectedOutput: "1 general.RANGETO 10 validations.message.CHARACTERS"
                        },
                        {
                            textValueMinLength: 1,
                            textValueMaxLength: undefined,
                            expectedOutput: "general.GREATERTHAN_OR_EQUAL 1 validations.message.CHARACTERS"
                        },
                        {
                            textValueMinLength: undefined,
                            textValueMaxLength: 10,
                            expectedOutput: "general.LESSTHAN_OR_EQUAL 10 validations.message.CHARACTERS"
                        }
                    ];

                tests.forEach( ( test ) => {
                    const config = new MedDataItemConfigSchema( test );
                    expect(
                        config.getPlaceholderForTextValue(),
                        `minLength: ${test.textValueMinLength}, maxLength: ${test.textValueMaxLength}`
                    ).to.be.equal( test.expectedOutput );
                } );
            } );

        } );

        describe( '#getPlaceholderForDateValue()', function() {

            before( function() {
                this.momentStub = sinon.stub( Y.doccirrus.commonutils, 'getMoment' );
                this.momentStub.callsFake( () => {
                    return function( date ) {
                        return {
                            format: function( format ) {
                                return date instanceof Date ? date.toISOString() : "StubbedCurrentDate";
                            }
                        };
                    };
                } );
            } );

            after( function() {
                this.momentStub.restore();
                this.momentStub = null;
            } );

            it( 'returns the properly formatted min and max date configured', function() {
                const
                    dateValueFormat = "DD.MM.YYYY",
                    tests = [
                        {
                            dateValueFormat,
                            dateValueMinDate: undefined,
                            dateValueMaxDate: undefined,
                            expectedOutput: "StubbedCurrentDate"
                        },
                        {
                            dateValueFormat,
                            dateValueMinDate: new Date( 2020, 2, 2, 0, 0, 0 ),
                            dateValueMaxDate: new Date( 2020, 12, 12, 0, 0, 0 ),
                            expectedOutput: `{minDateValue} general.RANGETO {maxDateValue}`
                        },
                        {
                            dateValueFormat,
                            dateValueMinDate: new Date( 2020, 2, 2, 0, 0, 0 ),
                            dateValueMaxDate: undefined,
                            expectedOutput: "general.GREATERTHAN_OR_EQUAL {minDateValue}"
                        },
                        {
                            dateValueFormat,
                            dateValueMinDate: undefined,
                            dateValueMaxDate: new Date( 2020, 12, 12, 0, 0, 0 ),
                            expectedOutput: "general.LESSTHAN_OR_EQUAL {maxDateValue}"
                        }
                    ];

                tests.forEach( ( test ) => {
                    const
                        minDateValue = test.dateValueMinDate instanceof Date ? test.dateValueMinDate.toISOString() : "",
                        maxDateValue = test.dateValueMaxDate instanceof Date ? test.dateValueMaxDate.toISOString() : "",
                        config = new MedDataItemConfigSchema( test );
                    expect(
                        config.getPlaceholderForDateValue(),
                        `minDate: ${minDateValue}, maxDate: ${maxDateValue}`
                    ).to.be.equal(
                        test.expectedOutput
                            .replace( "{minDateValue}", minDateValue )
                            .replace( "{maxDateValue}", maxDateValue )
                    );
                } );
            } );

        } );

        describe( '#isValueFloatingPoint()', function() {

            it( `returns false for all non-floating point dataTypes`, function() {

                Object.keys( MedDataItemDataTypes ).forEach( ( dataType ) => {
                    const
                        isValueFloatingPoint = [
                            MedDataItemDataTypes.NUMBER_FLOAT,
                            MedDataItemDataTypes.NUMBER_FORMULA,
                            MedDataItemDataTypes.STRING_OR_NUMBER
                        ].includes( dataType ),
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );
                    expect(
                        config.isValueFloatingPoint(),
                        `expected isValueFloatingPoint to be ${isValueFloatingPoint} for dataType ${dataType}`
                    ).to.be.equal( isValueFloatingPoint );
                } );

            } );

        } );

        describe( '#isNumericDataType()', function() {

            it( `returns false for all non-numeric dataTypes`, function() {

                Object.keys( MedDataItemDataTypes ).forEach( ( dataType ) => {
                    const
                        isNumericDataType = [
                            MedDataItemDataTypes.NUMBER_FLOAT,
                            MedDataItemDataTypes.NUMBER_FORMULA,
                            MedDataItemDataTypes.STRING_OR_NUMBER,
                            MedDataItemDataTypes.NUMBER_INT,
                            MedDataItemDataTypes.NUMBER_TIMEDIFF
                        ].includes( dataType ),
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );
                    expect(
                        config.isNumericDataType(),
                        `expected isNumericDataType to be ${isNumericDataType} for dataType ${dataType}`
                    ).to.be.equal( isNumericDataType );
                } );

            } );

        } );

        describe( '#hasChartValue()', function() {

            it( `returns false for all non-numeric dataTypes`, function() {

                Object.keys( MedDataItemDataTypes ).forEach( ( dataType ) => {
                    const
                        hasChartValue = [
                            MedDataItemDataTypes.NUMBER_FLOAT,
                            MedDataItemDataTypes.NUMBER_FORMULA,
                            MedDataItemDataTypes.STRING_OR_NUMBER,
                            MedDataItemDataTypes.NUMBER_INT,
                            MedDataItemDataTypes.NUMBER_TIMEDIFF
                        ].includes( dataType ),
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );
                    expect(
                        config.hasChartValue(),
                        `expected hasChartValue to be ${hasChartValue} for dataType ${dataType}`
                    ).to.be.equal( hasChartValue );
                } );

            } );

            it( `returns true for all dataTypes, if a chartValueFormattingFunction is given`, function() {

                Object.keys( MedDataItemDataTypes ).forEach( ( dataType ) => {
                    const
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType,
                            chartValueFormattingFunction: () => {
                                // nothing
                            }
                        } );
                    expect(
                        config.hasChartValue(),
                        `expected hasChartValue to be ${true} for dataType ${dataType}, since a chartValueFormattingFunction is given`
                    ).to.be.equal( true );
                } );

            } );

        } );

        describe( '#formatMedDataItem()', function() {

            before( function() {
                this.formatBoolValueStub = sinon.stub( MedDataItemConfigSchema.prototype, 'formatBoolValue' );
                this.formatBoolValueStub.callsFake( () => {
                    return "BOOLVALUE";
                } );
                this.formatValueStub = sinon.stub( MedDataItemConfigSchema.prototype, 'formatValue' );
                this.formatValueStub.callsFake( () => {
                    return "VALUE";
                } );
                this.formatTextValueStub = sinon.stub( MedDataItemConfigSchema.prototype, 'formatTextValue' );
                this.formatTextValueStub.callsFake( () => {
                    return "TEXTVALUE";
                } );
                this.formatDateValueStub = sinon.stub( MedDataItemConfigSchema.prototype, 'formatDateValue' );
                this.formatDateValueStub.callsFake( () => {
                    return "DATEVALUE";
                } );
            } );

            after( function() {
                this.formatBoolValueStub.restore();
                this.formatBoolValueStub = null;
                this.formatValueStub.restore();
                this.formatValueStub = null;
                this.formatTextValueStub.restore();
                this.formatTextValueStub = null;
                this.formatDateValueStub.restore();
                this.formatDateValueStub = null;
            } );

            it( 'calls the dataType-specific functions', function() {

                Object.keys( MedDataItemDataTypes ).forEach( ( dataType ) => {
                    const
                        concatCharacter = " | ",
                        concatCharacterDefault = "\n",
                        expectedOutput = {
                            [MedDataItemDataTypes.ANY]: ["BOOLVALUE", "VALUE", "TEXTVALUE", "DATEVALUE"],

                            [MedDataItemDataTypes.STRING_OR_NUMBER]: ["VALUE", "TEXTVALUE"],

                            [MedDataItemDataTypes.NUMBER_INT]: "VALUE",
                            [MedDataItemDataTypes.NUMBER_TIMEDIFF]: "VALUE",
                            [MedDataItemDataTypes.NUMBER_FLOAT]: "VALUE",
                            [MedDataItemDataTypes.NUMBER_FORMULA]: "VALUE",

                            [MedDataItemDataTypes.BOOLEAN]: "BOOLVALUE",

                            [MedDataItemDataTypes.STRING]: "TEXTVALUE",
                            [MedDataItemDataTypes.STRING_ENUM]: "TEXTVALUE",

                            [MedDataItemDataTypes.DATE]: "DATEVALUE",
                            [MedDataItemDataTypes.DATE_TIME]: "DATEVALUE"
                        },
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );

                    expect(
                        expectedOutput[dataType],
                        `if this test fails, please define an output for dataType: ${dataType}`
                    ).to.be.not.equal( undefined );

                    const
                        expectedOutputWithSeparator = Array.isArray( expectedOutput[dataType] )
                            ? expectedOutput[dataType].join( concatCharacter )
                            : expectedOutput[dataType],
                        expectedOutputWithDefaultSeparator = Array.isArray( expectedOutput[dataType] )
                            ? expectedOutput[dataType].join( concatCharacterDefault )
                            : expectedOutput[dataType];

                    expect(
                        config.formatMedDataItem( {}, { concatCharacter } ),
                        `expected formatMedDataItem to return ${expectedOutputWithSeparator} for dataType ${dataType} with separator ${concatCharacter}`
                    ).to.be.equal( expectedOutputWithSeparator );

                    expect(
                        config.formatMedDataItem( {} ),
                        `expected formatMedDataItem to return ${expectedOutputWithDefaultSeparator} for dataType ${dataType} (default separator)`
                    ).to.be.equal( expectedOutputWithDefaultSeparator );

                } );

            } );

        } );

        describe( '#formatMedDataItemForPDF()', function() {

            before( function() {
                this.formatBoolValueStub = sinon.stub( MedDataItemConfigSchema.prototype, 'formatBoolValue' );
                this.formatBoolValueStub.callsFake( () => {
                    return "BOOLVALUE";
                } );
                this.formatValueStub = sinon.stub( MedDataItemConfigSchema.prototype, 'formatValue' );
                this.formatValueStub.callsFake( () => {
                    return "VALUE";
                } );
                this.formatTextValueStub = sinon.stub( MedDataItemConfigSchema.prototype, 'formatTextValue' );
                this.formatTextValueStub.callsFake( () => {
                    return "TEXTVALUE";
                } );
                this.formatDateValueStub = sinon.stub( MedDataItemConfigSchema.prototype, 'formatDateValue' );
                this.formatDateValueStub.callsFake( () => {
                    return "DATEVALUE";
                } );
            } );

            after( function() {
                this.formatBoolValueStub.restore();
                this.formatBoolValueStub = null;
                this.formatValueStub.restore();
                this.formatValueStub = null;
                this.formatTextValueStub.restore();
                this.formatTextValueStub = null;
                this.formatDateValueStub.restore();
                this.formatDateValueStub = null;
            } );

            it( 'returns the post-processed output of #formatMedDataItem() if a post-processor is given', function() {

                Object.keys( MedDataItemDataTypes ).forEach( ( dataType ) => {
                    const
                        concatCharacter = " | ",
                        concatCharacterDefault = "\n",
                        expectedOutput = {
                            [MedDataItemDataTypes.ANY]: ["BOOLBUNNYS", "BUNNYS", "TEXTBUNNYS", "DATEBUNNYS"],

                            [MedDataItemDataTypes.STRING_OR_NUMBER]: ["BUNNYS", "TEXTBUNNYS"],

                            [MedDataItemDataTypes.NUMBER_INT]: "BUNNYS",
                            [MedDataItemDataTypes.NUMBER_TIMEDIFF]: "BUNNYS",
                            [MedDataItemDataTypes.NUMBER_FLOAT]: "BUNNYS",
                            [MedDataItemDataTypes.NUMBER_FORMULA]: "BUNNYS",

                            [MedDataItemDataTypes.BOOLEAN]: "BOOLBUNNYS",

                            [MedDataItemDataTypes.STRING]: "TEXTBUNNYS",
                            [MedDataItemDataTypes.STRING_ENUM]: "TEXTBUNNYS",

                            [MedDataItemDataTypes.DATE]: "DATEBUNNYS",
                            [MedDataItemDataTypes.DATE_TIME]: "DATEBUNNYS"
                        },
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType,
                            formatMedDataItemForPDFPostProcessor: function( formattedValue ) {
                                return formattedValue.replace( /VALUE/g, "BUNNYS" );
                            }
                        } );

                    expect(
                        expectedOutput[dataType],
                        `if this test fails, please define an output for dataType: ${dataType}`
                    ).to.be.not.equal( undefined );

                    const
                        expectedOutputWithSeparator = Array.isArray( expectedOutput[dataType] )
                            ? expectedOutput[dataType].join( concatCharacter )
                            : expectedOutput[dataType],
                        expectedOutputWithDefaultSeparator = Array.isArray( expectedOutput[dataType] )
                            ? expectedOutput[dataType].join( concatCharacterDefault )
                            : expectedOutput[dataType];

                    expect(
                        config.formatMedDataItemForPDF( {}, { concatCharacter } ),
                        `expected formatMedDataItemForPDF to return ${expectedOutputWithSeparator} for dataType ${dataType} with separator ${concatCharacter}`
                    ).to.be.equal( expectedOutputWithSeparator );

                    expect(
                        config.formatMedDataItemForPDF( {} ),
                        `expected formatMedDataItemForPDF to return ${expectedOutputWithDefaultSeparator} for dataType ${dataType} (default separator)`
                    ).to.be.equal( expectedOutputWithDefaultSeparator );

                } );

            } );

            it( 'returns the same output of #formatMedDataItem() if no post-processor is given', function() {

                Object.keys( MedDataItemDataTypes ).forEach( ( dataType ) => {
                    const
                        concatCharacter = " | ",
                        concatCharacterDefault = "\n",
                        expectedOutput = {
                            [MedDataItemDataTypes.ANY]: ["BOOLVALUE", "VALUE", "TEXTVALUE", "DATEVALUE"],

                            [MedDataItemDataTypes.STRING_OR_NUMBER]: ["VALUE", "TEXTVALUE"],

                            [MedDataItemDataTypes.NUMBER_INT]: "VALUE",
                            [MedDataItemDataTypes.NUMBER_TIMEDIFF]: "VALUE",
                            [MedDataItemDataTypes.NUMBER_FLOAT]: "VALUE",
                            [MedDataItemDataTypes.NUMBER_FORMULA]: "VALUE",

                            [MedDataItemDataTypes.BOOLEAN]: "BOOLVALUE",

                            [MedDataItemDataTypes.STRING]: "TEXTVALUE",
                            [MedDataItemDataTypes.STRING_ENUM]: "TEXTVALUE",

                            [MedDataItemDataTypes.DATE]: "DATEVALUE",
                            [MedDataItemDataTypes.DATE_TIME]: "DATEVALUE"
                        },
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );

                    expect(
                        expectedOutput[dataType],
                        `if this test fails, please define an output for dataType: ${dataType}`
                    ).to.be.not.equal( undefined );

                    const
                        expectedOutputWithSeparator = Array.isArray( expectedOutput[dataType] )
                            ? expectedOutput[dataType].join( concatCharacter )
                            : expectedOutput[dataType],
                        expectedOutputWithDefaultSeparator = Array.isArray( expectedOutput[dataType] )
                            ? expectedOutput[dataType].join( concatCharacterDefault )
                            : expectedOutput[dataType];

                    expect(
                        config.formatMedDataItemForPDF( {}, { concatCharacter } ),
                        `expected formatMedDataItemForPDF to return ${expectedOutputWithSeparator} for dataType ${dataType} with separator ${concatCharacter}`
                    ).to.be.equal( expectedOutputWithSeparator );

                    expect(
                        config.formatMedDataItemForPDF( {} ),
                        `expected formatMedDataItemForPDF to return ${expectedOutputWithDefaultSeparator} for dataType ${dataType} (default separator)`
                    ).to.be.equal( expectedOutputWithDefaultSeparator );

                } );

            } );

        } );

        describe( '#formatBoolValue()', function() {

            it( 'returns the formatted value for each boolean type', function() {
                const config = new MedDataItemConfigSchema( {} );
                expect( config.formatBoolValue( true ) ).to.be.equal( "general.BOOLEAN_TRUE" );
                expect( config.formatBoolValue( false ) ).to.be.equal( "general.BOOLEAN_FALSE" );
            } );

            it( 'returns an empty string for a non-boolean input', function() {
                const config = new MedDataItemConfigSchema( {} );
                expect( config.formatBoolValue( null ) ).to.be.equal( "" );
                expect( config.formatBoolValue( 123 ) ).to.be.equal( "" );
                expect( config.formatBoolValue( "false" ) ).to.be.equal( "" );
                expect( config.formatBoolValue( new Date() ) ).to.be.equal( "" );
            } );

        } );

        describe( '#formatValue()', function() {

            it( 'returns the formatted numeric value for different input and options', function() {
                const
                    tests = [
                        {
                            value: 123.4567,
                            expectedOutput: "123.46",
                            options: null,

                            itemConfig: {
                                valueDigits: 2,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 123.4567,
                            expectedOutput: "123.457",
                            options: null,

                            itemConfig: {
                                valueDigits: 3,
                                valueRoundingMethod: 1,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 123.4567,
                            expectedOutput: "00,123.457", // thousand separator
                            options: {
                                thousandSeparator: ","
                            },

                            itemConfig: {
                                valueDigits: 3,
                                valueRoundingMethod: 1,
                                valueLeadingZeros: 5,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 123.4567,
                            expectedOutput: "00,124", // thousand separator
                            options: {
                                thousandSeparator: ","
                            },

                            itemConfig: {
                                valueDigits: 0,
                                valueRoundingMethod: 1,
                                valueLeadingZeros: 5,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 123.4567,
                            expectedOutput: "123",
                            options: {
                                thousandSeparator: ","
                            },

                            itemConfig: {
                                valueDigits: 0,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 100000000.4567,
                            expectedOutput: "100,000,000", // thousand separator
                            options: {
                                thousandSeparator: ","
                            },

                            itemConfig: {
                                valueDigits: 0,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 10000000000.123457,
                            expectedOutput: "10,000,000,000.1235", // thousand separator
                            options: {
                                thousandSeparator: ",",
                                decimalSeparator: "."
                            },

                            itemConfig: {
                                valueDigits: 4,
                                valueRoundingMethod: 1,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: -100000000.4567,
                            expectedOutput: "-100,000,000", // thousand separator
                            options: null,

                            itemConfig: {
                                valueDigits: 0,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: -10000000000.12312,
                            expectedOutput: "-10,000,000,000.1231",
                            options: null,

                            itemConfig: {
                                valueDigits: 4,
                                valueRoundingMethod: 1,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 100000000.4567,
                            expectedOutput: "100,000,000",
                            options: null,

                            itemConfig: {
                                valueDigits: 0,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: "123.4567",
                            expectedOutput: "123.46",
                            options: null,

                            itemConfig: {
                                valueDigits: 2,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: "123.4567",
                            expectedOutput: "123.457",
                            options: null,

                            itemConfig: {
                                valueDigits: 3,
                                valueRoundingMethod: 1,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: "123.4567",
                            expectedOutput: "123",
                            options: null,

                            itemConfig: {
                                valueDigits: 0,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: "123.4567",
                            expectedOutput: "123",
                            options: null,

                            itemConfig: {
                                valueDigits: 0,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: "123.4567",
                            expectedOutput: "123",
                            options: null,

                            itemConfig: {
                                valueDigits: 3,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_INT
                            }
                        },
                        {
                            value: "",
                            expectedOutput: "",
                            options: null,

                            itemConfig: {
                                valueDigits: 0,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: "abc",
                            expectedOutput: "abc",
                            options: null,

                            itemConfig: {
                                valueDigits: 0,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: null,
                            expectedOutput: "",
                            options: null,

                            itemConfig: {
                                valueDigits: 0,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 0,
                            expectedOutput: "0.000",
                            options: null,

                            itemConfig: {
                                valueDigits: 3,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: Number.NaN,
                            expectedOutput: "NaN",
                            options: null,

                            itemConfig: {
                                valueDigits: 3,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: Number.POSITIVE_INFINITY,
                            expectedOutput: "NaN",
                            options: null,

                            itemConfig: {
                                valueDigits: 3,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 0,
                            expectedOutput: "",
                            options: {
                                renderZeroEmpty: true
                            },

                            itemConfig: {
                                valueDigits: 3,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 12,
                            expectedOutput: "12",

                            itemConfig: {
                                dataType: MedDataItemDataTypes.NUMBER_INT
                            }
                        },
                        {
                            value: 12345.123,
                            expectedOutput: "12,345",

                            itemConfig: {
                                valueDigits: 3,
                                valueRoundingMethod: 0,
                                dataType: MedDataItemDataTypes.NUMBER_INT
                            }
                        }
                    ];

                for( let test of tests ) {
                    const config = new MedDataItemConfigSchema( test.itemConfig );
                    expect(
                        config.formatValue( test.value, test.options ),
                        `value: ${test.value} (${typeof test.value}) with options ${JSON.stringify( test.options )}`
                    ).to.be.equal( test.expectedOutput );
                }
            } );

        } );

        describe( '#formatTextValue()', function() {

            it( 'returns the output of a textValueFormattingFunction, when defined', function() {
                const textValueFormattingFunction = () => {
                    return "TEST";
                };
                const config = new MedDataItemConfigSchema( { textValueFormattingFunction } );
                expect( config.formatTextValue( "TEST" ) ).to.be.equal( textValueFormattingFunction() );
            } );

            describe( 'given dataType STRING_ENUM', function() {

                describe( 'given a hard-coded enum object list', function() {

                    it( 'returns the text property of the enum', function() {
                        const
                            enumValueCollection = [
                                { id: "1", text: "TEST-1" },
                                { id: "2", text: "TEST-2" },
                                { id: "3", text: "TEST-3" }
                            ],
                            config = new MedDataItemConfigSchema( {
                                dataType: MedDataItemDataTypes.STRING_ENUM,
                                enumValueCollection
                            } );

                        for( let test of enumValueCollection ) {
                            expect( config.formatTextValue( test.id ) ).to.be.equal( test.text );
                        }
                    } );

                } );

                describe( 'given a hard-coded enum string list', function() {

                    it( 'returns the text property of the enum', function() {
                        const
                            enumValueCollection = ["TEST-1", "TEST-2", "TEST-3"],
                            config = new MedDataItemConfigSchema( {
                                dataType: MedDataItemDataTypes.STRING_ENUM,
                                enumValueCollection
                            } );

                        for( let test of enumValueCollection ) {
                            expect( config.formatTextValue( test ) ).to.be.equal( test );
                        }
                    } );

                } );

                describe( 'given an enum generator function', function() {

                    it( 'returns the input value, which is trusted as it should come from the generator itself', function() {
                        const
                            enumValueCollection = [
                                { id: "1", text: "TEST-1" },
                                { id: "2", text: "TEST-2" },
                                { id: "3", text: "TEST-3" }
                            ],
                            enumValueCollectionGenerator = function() {
                                return enumValueCollection;
                            },
                            config = new MedDataItemConfigSchema( {
                                dataType: MedDataItemDataTypes.STRING_ENUM,
                                enumValueCollectionGenerator
                            } );

                        for( let test of enumValueCollection ) {
                            expect( config.formatTextValue( test.id ) ).to.be.equal( test.id );
                        }
                    } );

                } );

                it( 'returns the value itself if a non-matching string is passed', function() {
                    const
                        enumValueCollection = ["TEST-1", "TEST-2", "TEST-3"],
                        config = new MedDataItemConfigSchema( {
                            dataType: MedDataItemDataTypes.STRING_ENUM,
                            enumValueCollection
                        } );

                    expect( config.formatTextValue( "TEST-NOT_FOUND" ) ).to.be.equal( "TEST-NOT_FOUND" );
                } );

                it( 'returns an empty string if a non-string value is passed', function() {
                    const
                        enumValueCollection = ["TEST-1", "TEST-2", "TEST-3"],
                        config = new MedDataItemConfigSchema( {
                            dataType: MedDataItemDataTypes.STRING_ENUM,
                            enumValueCollection
                        } );

                    expect( config.formatTextValue( null ) ).to.be.equal( "" );
                } );

            } );

            describe( 'given any other dataType', function() {

                it( 'returns the value itself if a string is passed', function() {
                    const
                        config = new MedDataItemConfigSchema( {
                            dataType: MedDataItemDataTypes.STRING
                        } );

                    expect( config.formatTextValue( "TEST" ) ).to.be.equal( "TEST" );
                } );

                it( 'returns an empty string if a non-string value is passed', function() {
                    const
                        config = new MedDataItemConfigSchema( {
                            dataType: MedDataItemDataTypes.STRING
                        } );

                    expect( config.formatTextValue( null ) ).to.be.equal( "" );
                } );

            } );

        } );

        describe( '#formatDateValue()', function() {

            before( function() {
                this.momentStub = sinon.stub( Y.doccirrus.commonutils, 'getMoment' );
                this.momentStub.callsFake( () => {
                    return function( date ) {
                        return {
                            format: function( format ) {
                                return date instanceof Date ? "StubbedDate" : "StubbedCurrentDate";
                            }
                        };
                    };
                } );
            } );

            after( function() {
                this.momentStub.restore();
                this.momentStub = null;
            } );

            it( 'returns the properly formatted date', function() {
                const config = new MedDataItemConfigSchema( {} );
                expect( config.formatDateValue( new Date() ) ).to.be.equal( "StubbedDate" );
            } );

            it( 'returns an empty string, if the value is not defined', function() {
                const config = new MedDataItemConfigSchema( {} );
                expect( config.formatDateValue( null ) ).to.be.equal( "" );
            } );

        } );

        describe( '#readMedDataItem()', function() {

            it( 'returns the correct medDataItem values concatenated as a single string', function() {

                Object.keys( MedDataItemDataTypes ).forEach( ( dataType ) => {
                    const
                        medDataItem = new MedDataItemSchema( {
                            type: "TEST",
                            category: "TEST",
                            value: 0,
                            textValue: "TEXTVALUE",
                            boolValue: true,
                            dateValue: new Date()
                        } ),
                        concatCharacter = " ",
                        expectedOutput = {
                            [MedDataItemDataTypes.ANY]: medDataItem.textValue,

                            [MedDataItemDataTypes.STRING_OR_NUMBER]: [medDataItem.value, medDataItem.textValue],

                            [MedDataItemDataTypes.NUMBER_INT]: medDataItem.value,
                            [MedDataItemDataTypes.NUMBER_TIMEDIFF]: medDataItem.value,
                            [MedDataItemDataTypes.NUMBER_FLOAT]: medDataItem.value,
                            [MedDataItemDataTypes.NUMBER_FORMULA]: medDataItem.value,

                            [MedDataItemDataTypes.BOOLEAN]: medDataItem.boolValue,

                            [MedDataItemDataTypes.STRING]: medDataItem.textValue,
                            [MedDataItemDataTypes.STRING_ENUM]: medDataItem.textValue,

                            [MedDataItemDataTypes.DATE]: medDataItem.dateValue,
                            [MedDataItemDataTypes.DATE_TIME]: medDataItem.dateValue
                        },
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );

                    expect(
                        expectedOutput[dataType],
                        `if this test fails, please define an output for dataType: ${dataType}`
                    ).to.be.not.equal( undefined );

                    const
                        expectedOutputWithSeparator = Array.isArray( expectedOutput[dataType] )
                            ? expectedOutput[dataType].join( concatCharacter )
                            : expectedOutput[dataType];

                    expect(
                        config.readMedDataItem( medDataItem ),
                        `expected readMedDataItem to return ${expectedOutputWithSeparator} for dataType ${dataType} with separator ${concatCharacter}`
                    ).to.be.equal( expectedOutputWithSeparator );

                } );

            } );

        } );

        describe( '#writeMedDataItem()', function() {

            beforeEach( function() {
                this.medDataItem = new MedDataItemSchema( {
                    type: "TEST",
                    category: "TEST",
                    value: 0,
                    textValue: "BEFORE",
                    boolValue: true,
                    dateValue: new Date()
                } );
            } );

            afterEach( function() {
                this.medDataItem = null;
            } );

            it( 'sets the textValue of the medDataItem', function() {
                const
                    expectedForDataTypes = [
                        MedDataItemDataTypes.ANY,
                        MedDataItemDataTypes.STRING,
                        MedDataItemDataTypes.STRING_ENUM,
                        MedDataItemDataTypes.STRING_OR_NUMBER
                    ],
                    beforeValue = "BEFORE",
                    afterValue = "AFTER";

                expectedForDataTypes.forEach( ( dataType ) => {
                    // reset
                    this.medDataItem.textValue = beforeValue;

                    // create config
                    const
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );

                    // write
                    config.writeMedDataItem( this.medDataItem, afterValue );

                    // test
                    expect(
                        this.medDataItem.textValue,
                        `for dataType ${dataType}, the textValue should have changed`
                    ).to.be.equal( afterValue );
                } );
            } );

            it( 'sets the boolValue of the medDataItem', function() {
                const
                    expectedForDataTypes = [
                        MedDataItemDataTypes.BOOLEAN
                    ],
                    beforeValue = true,
                    afterValue = false;

                expectedForDataTypes.forEach( ( dataType ) => {
                    // reset
                    this.medDataItem.boolValue = beforeValue;

                    // create config
                    const
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );

                    // write
                    config.writeMedDataItem( this.medDataItem, afterValue );

                    // test
                    expect(
                        this.medDataItem.boolValue,
                        `for dataType ${dataType}, the boolValue should have changed`
                    ).to.be.equal( afterValue );
                } );
            } );

            it( 'sets the dateValue of the medDataItem', function() {
                const
                    expectedForDataTypes = [
                        MedDataItemDataTypes.DATE,
                        MedDataItemDataTypes.DATE_TIME
                    ],
                    beforeValue = new Date(),
                    afterValue = new Date();

                expectedForDataTypes.forEach( ( dataType ) => {
                    // reset
                    this.medDataItem.dateValue = beforeValue;

                    // create config
                    const
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );

                    // write
                    config.writeMedDataItem( this.medDataItem, afterValue );

                    // test
                    expect(
                        this.medDataItem.dateValue,
                        `for dataType ${dataType}, the dateValue should have changed`
                    ).to.be.equal( afterValue );
                } );
            } );

            it( 'sets the value of the medDataItem', function() {
                const
                    expectedForDataTypes = [
                        MedDataItemDataTypes.NUMBER_FLOAT,
                        MedDataItemDataTypes.NUMBER_INT,
                        MedDataItemDataTypes.NUMBER_TIMEDIFF,
                        MedDataItemDataTypes.STRING_OR_NUMBER
                    ],
                    beforeValue = 0,
                    afterValue = 2;

                expectedForDataTypes.forEach( ( dataType ) => {
                    // reset
                    this.medDataItem.value = beforeValue;

                    // create config
                    const
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );

                    // write
                    config.writeMedDataItem( this.medDataItem, afterValue );

                    // test
                    expect(
                        this.medDataItem.value,
                        `for dataType ${dataType}, the value should have changed`
                    ).to.be.equal( afterValue );
                } );
            } );

            it( 'sets the value of the medDataItem to undefined, if the value can not be parsed as number', function() {
                const
                    expectedForDataTypes = [
                        MedDataItemDataTypes.NUMBER_FLOAT,
                        MedDataItemDataTypes.NUMBER_INT,
                        MedDataItemDataTypes.NUMBER_TIMEDIFF,
                        MedDataItemDataTypes.STRING_OR_NUMBER
                    ],
                    beforeValue = 0,
                    afterValue = "";

                expectedForDataTypes.forEach( ( dataType ) => {
                    // reset
                    this.medDataItem.value = beforeValue;

                    // create config
                    const
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } );

                    // write
                    config.writeMedDataItem( this.medDataItem, afterValue );

                    // test
                    expect(
                        this.medDataItem.value,
                        `for dataType ${dataType}, the value should have changed to undefined`
                    ).to.be.equal( undefined );
                } );
            } );

            it( 'sets the value AND textValue if type STRING_OR_NUMBER of the medDataItem', function() {
                const
                    dataType = MedDataItemDataTypes.STRING_OR_NUMBER,
                    valueToSet = "123.345 AFTER",
                    afterValue = 123.345,
                    afterTextValue = "AFTER";

                // reset
                this.medDataItem.value = 0;
                this.medDataItem.textValue = "BEFORE";

                // create config
                const
                    config = new MedDataItemConfigSchema( {
                        dataType
                    } );

                // write
                config.writeMedDataItem( this.medDataItem, valueToSet );

                // test
                expect( this.medDataItem.value ).to.be.equal( afterValue );
                expect( this.medDataItem.textValue ).to.be.equal( afterTextValue );
            } );

        } );

        describe( '#isMedDataItemValid()', function() {

            before( function() {
                this.isMedDataItemBoolValueValidStub = sinon.stub( MedDataItemConfigSchema.prototype, 'isMedDataItemBoolValueValid' );
                this.isMedDataItemBoolValueValidStub.callsFake( () => {
                    return Promise.resolve( true );
                } );
                this.isMedDataItemValueValidStub = sinon.stub( MedDataItemConfigSchema.prototype, 'isMedDataItemValueValid' );
                this.isMedDataItemValueValidStub.callsFake( () => {
                    return Promise.resolve( true );
                } );
                this.isMedDataItemTextValueValidStub = sinon.stub( MedDataItemConfigSchema.prototype, 'isMedDataItemTextValueValid' );
                this.isMedDataItemTextValueValidStub.callsFake( () => {
                    return Promise.resolve( true );
                } );
                this.isMedDataItemDateValueValidStub = sinon.stub( MedDataItemConfigSchema.prototype, 'isMedDataItemDateValueValid' );
                this.isMedDataItemDateValueValidStub.callsFake( () => {
                    return Promise.resolve( true );
                } );
            } );

            after( function() {
                this.isMedDataItemBoolValueValidStub.restore();
                this.isMedDataItemBoolValueValidStub = null;
                this.isMedDataItemValueValidStub.restore();
                this.isMedDataItemValueValidStub = null;
                this.isMedDataItemTextValueValidStub.restore();
                this.isMedDataItemTextValueValidStub = null;
                this.isMedDataItemDateValueValidStub.restore();
                this.isMedDataItemDateValueValidStub = null;
            } );

            it( 'calls the dataType-specific validation functions', async function() {

                await Object.keys( MedDataItemDataTypes ).map( async( dataType ) => {
                    const
                        config = new MedDataItemConfigSchema( {
                            dataType: dataType
                        } ),
                        errorMessages = [],
                        output = config.isMedDataItemValid( {}, errorMessages );

                    expect(
                        await output,
                        `if this test fails, please define a stub-function evaluated for dataType: ${dataType}`
                    ).to.be.equal( true );

                    expect( errorMessages ).to.have.length( 0 );

                    return true;
                } );

            } );

            it( 'returns true, even if errors have been passed for one of the STRING_OR_NUMBER validators', async function() {

                // modify the stub
                this.isMedDataItemValueValidStub.callsFake( ( medDataItem, errorMessages ) => {
                    errorMessages.push( "test" );
                    return Promise.resolve( false );
                } );

                const
                    config = new MedDataItemConfigSchema( {
                        dataType: MedDataItemDataTypes.STRING_OR_NUMBER
                    } ),
                    errorMessages = [],
                    output = config.isMedDataItemValid( {}, errorMessages );

                expect( await output ).to.be.equal( true );
                expect( errorMessages ).to.have.length( 0 );

            } );

            it( 'returns false, if errors have been passed for both of the STRING_OR_NUMBER validators', async function() {

                // modify the stub
                this.isMedDataItemValueValidStub.callsFake( ( medDataItem, errorMessages ) => {
                    errorMessages.push( "VALUE failed" );
                    return Promise.resolve( false );
                } );
                this.isMedDataItemTextValueValidStub.callsFake( ( medDataItem, errorMessages ) => {
                    errorMessages.push( "TEXTVALUE failed" );
                    return Promise.resolve( false );
                } );

                const
                    config = new MedDataItemConfigSchema( {
                        dataType: MedDataItemDataTypes.STRING_OR_NUMBER
                    } ),
                    errorMessages = [],
                    output = config.isMedDataItemValid( {}, errorMessages );

                expect( await output ).to.be.equal( false );
                expect( errorMessages ).to.have.length( 2 );

            } );

        } );

        describe( '#isMedDataItemBoolValueValid()', async function() {

            it( 'returns true, if a boolean value is given', async function() {
                const
                    config = new MedDataItemConfigSchema( {} );
                expect( await config.isMedDataItemBoolValueValid( {
                    boolValue: false
                } ) ).to.be.equal( true );
            } );

            it( 'returns false, if no boolean is given', async function() {
                const
                    config = new MedDataItemConfigSchema( {} );
                expect( await config.isMedDataItemBoolValueValid( {
                    boolValue: "TEST"
                } ) ).to.be.equal( false );
            } );

        } );

        describe( '#isMedDataItemValueValid()', async function() {

            it( 'validates different input types and medDataItemConfigs', async function() {
                const
                    tests = [
                        {
                            value: "abcsd",
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: "123.4567",
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: "123",
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.NUMBER_INT
                            }
                        },
                        {
                            value: "123.2345",
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.NUMBER_INT
                            }
                        },
                        {
                            value: undefined,
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT,
                                isOptional: true
                            }
                        },
                        {
                            value: undefined,
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: null,
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT,
                                isOptional: true
                            }
                        },
                        {
                            value: null,
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: Number.NaN,
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 123.4567,
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.NUMBER_INT
                            }
                        },
                        {
                            value: 123,
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.NUMBER_INT
                            }
                        },
                        {
                            value: 10,
                            expectedOutput: true,
                            itemConfig: {
                                valueMinValue: 10,
                                valueMaxValue: 100,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 100,
                            expectedOutput: true,
                            itemConfig: {
                                valueMinValue: 10,
                                valueMaxValue: 100,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 1,
                            expectedOutput: false,
                            itemConfig: {
                                valueMinValue: 10,
                                valueMaxValue: 100,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 1000,
                            expectedOutput: false,
                            itemConfig: {
                                valueMinValue: 10,
                                valueMaxValue: 100,
                                dataType: MedDataItemDataTypes.NUMBER_FLOAT
                            }
                        },
                        {
                            value: 123.4567,
                            expectedOutput: true,
                            itemConfig: {
                                valueMinValue: 10,
                                valueMaxValue: 100, // min and max play NO role for formulas
                                dataType: MedDataItemDataTypes.NUMBER_FORMULA
                            }
                        }
                    ];

                for( let test of tests ) {
                    const config = new MedDataItemConfigSchema( test.itemConfig );
                    expect(
                        await config.isMedDataItemValueValid( {
                            value: test.value
                        } ),
                        `value: ${test.value} (${typeof test.value}) with MedDataItemConfig ${JSON.stringify( test.itemConfig )}`
                    ).to.be.equal( test.expectedOutput );
                }
            } );

        } );

        describe( '#isMedDataItemTextValueValid()', async function() {

            it( 'validates according to an external synchronous textValueValidationFunction, if defined', async function() {
                const textValueValidationFunction = function() {
                    return [];
                };
                const config = new MedDataItemConfigSchema( { textValueValidationFunction } );
                expect( await config.isMedDataItemTextValueValid( {} ) ).to.be.equal( true );
            } );

            it( 'validates according to an external asynchronous textValueValidationFunction, if defined', async function() {
                const textValueValidationFunction = async function() {
                    return Promise.resolve( [] );
                };
                const config = new MedDataItemConfigSchema( { textValueValidationFunction } );
                expect( await config.isMedDataItemTextValueValid( {} ) ).to.be.equal( true );
            } );

            it( 'validates different STRING or STRING_OR_NUMBER input types and itemConfigs', async function() {
                const
                    tests = [
                        {
                            textValue: "abcde",
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING
                            }
                        },
                        {
                            textValue: "abcde",
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING_OR_NUMBER
                            }
                        },
                        {
                            textValue: undefined,
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING,
                                isOptional: true
                            }
                        },
                        {
                            textValue: "",
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING,
                                isOptional: true
                            }
                        },
                        {
                            textValue: null,
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING,
                                isOptional: true
                            }
                        },
                        {
                            textValue: null,
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING
                            }
                        },
                        {
                            textValue: "abcde",
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING,
                                textValueMinLength: 1,
                                textValueMaxLength: 5
                            }
                        },
                        {
                            textValue: "abcdeafsd",
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING,
                                textValueMinLength: 1,
                                textValueMaxLength: 5
                            }
                        },
                        {
                            textValue: "",
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING,
                                textValueMinLength: 1,
                                textValueMaxLength: 5
                            }
                        },
                        {
                            textValue: "abcde",
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING,
                                textValueMinLength: 1,
                                textValueMaxLength: 5,
                                textValueValidationRegExp: /^abc/
                            }
                        },
                        {
                            textValue: "abcde",
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING,
                                textValueMinLength: 1,
                                textValueMaxLength: 5,
                                textValueValidationRegExp: /^abc$/
                            }
                        }
                    ];

                for( let test of tests ) {
                    const config = new MedDataItemConfigSchema( test.itemConfig );
                    expect(
                        await config.isMedDataItemTextValueValid( {
                            textValue: test.textValue
                        } ),
                        `textValue: ${test.textValue} (${typeof test.textValue}) with MedDataItemConfig ${JSON.stringify( test.itemConfig )}`
                    ).to.be.equal( test.expectedOutput );
                }
            } );

            it( 'validates different STRING_ENUM input types and itemConfigs', async function() {
                const
                    tests = [
                        {
                            textValue: "TEST-1",
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING_ENUM,
                                enumValueCollection: ["TEST-1", "TEST-2"]
                            }
                        },
                        {
                            textValue: "TEST-5",
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING_ENUM,
                                enumValueCollection: ["TEST-1", "TEST-2"]
                            }
                        },
                        {
                            textValue: "TEST-2",
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING_ENUM,
                                enumValueCollectionGenerator: async function() {
                                    return ["TEST-1", "TEST-2"];
                                }
                            }
                        },
                        {
                            textValue: "TEST-5",
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING_ENUM,
                                enumValueCollectionGenerator: async function() {
                                    return ["TEST-1", "TEST-2"];
                                }
                            }
                        },
                        {
                            textValue: "1",
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING_ENUM,
                                enumValueCollectionGenerator: async function() {
                                    return [
                                        { id: "1", text: "TEST-1" },
                                        { id: "2", text: "TEST-2" }
                                    ];
                                }
                            }
                        },
                        {
                            textValue: "5",
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.STRING_ENUM,
                                enumValueCollectionGenerator: async function() {
                                    return [
                                        { id: "1", text: "TEST-1" },
                                        { id: "2", text: "TEST-2" }
                                    ];
                                }
                            }
                        }
                    ];

                for( let test of tests ) {
                    const config = new MedDataItemConfigSchema( test.itemConfig );
                    expect(
                        await config.isMedDataItemTextValueValid( {
                            textValue: test.textValue
                        } ),
                        `textValue: ${test.textValue} (${typeof test.textValue}) with MedDataItemConfig ${JSON.stringify( test.itemConfig )}`
                    ).to.be.equal( test.expectedOutput );
                }
            } );

        } );

        describe( '#isMedDataItemDateValueValid()', async function() {

            before( function() {
                this.momentStub = sinon.stub( Y.doccirrus.commonutils, 'getMoment' );
                this.momentStub.callsFake( () => {
                    return function( date ) {
                        if( typeof date === "string" ) {
                            date = new Date( date );
                        }
                        return {
                            isValid: function() {
                                return date instanceof Date && !isNaN( date );
                            },
                            format: function( format ) {
                                return date instanceof Date ? "StubbedDate" : "StubbedCurrentDate";
                            },
                            isAfter: function( compareDate ) {
                                return date.getTime() > compareDate.getTime();
                            },
                            isBefore: function( compareDate ) {
                                return date.getTime() < compareDate.getTime();
                            }
                        };
                    };
                } );
            } );

            after( function() {
                this.momentStub.restore();
                this.momentStub = null;
            } );

            it( 'validates different values with medDataItemConfigs', async function() {
                const
                    tests = [
                        {
                            testValue: new Date( 2020, 6, 1, 0, 0, 0 ),
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.DATE
                            }
                        },
                        {
                            testValue: undefined,
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.DATE
                            }
                        },
                        {
                            testValue: null,
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.DATE
                            }
                        },
                        {
                            testValue: null,
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.DATE,
                                isOptional: true
                            }
                        },
                        {
                            testValue: undefined,
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.DATE,
                                isOptional: true
                            }
                        },
                        {
                            testValue: "2020-06-01",
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.DATE
                            }
                        },
                        {
                            testValue: "abcsadsd",
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.DATE
                            }
                        },
                        {
                            testValue: new Date( 2020, 6, 1, 0, 0, 0 ),
                            expectedOutput: true,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.DATE,
                                dateValueMinDate: new Date( 2020, 1, 1, 0, 0, 0 ),
                                dateValueMaxDate: new Date( 2020, 12, 1, 0, 0, 0 )
                            }
                        },
                        {
                            testValue: new Date( 2019, 6, 1, 0, 0, 0 ),
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.DATE,
                                dateValueMinDate: new Date( 2020, 1, 1, 0, 0, 0 ),
                                dateValueMaxDate: new Date( 2020, 12, 1, 0, 0, 0 )
                            }
                        },
                        {
                            testValue: new Date( 2021, 6, 1, 0, 0, 0 ),
                            expectedOutput: false,
                            itemConfig: {
                                dataType: MedDataItemDataTypes.DATE,
                                dateValueMinDate: new Date( 2020, 1, 1, 0, 0, 0 ),
                                dateValueMaxDate: new Date( 2020, 12, 1, 0, 0, 0 )
                            }
                        }
                    ];

                for( let test of tests ) {
                    const config = new MedDataItemConfigSchema( test.itemConfig );
                    expect(
                        await config.isMedDataItemDateValueValid( {
                            dateValue: test.testValue
                        } ),
                        `testValue: ${test.testValue} (${typeof test.testValue}) with MedDataItemConfig ${JSON.stringify( test.itemConfig )}`
                    ).to.be.equal( test.expectedOutput );
                }
            } );

        } );

        describe( '.getDefaultConfig()', function() {

            it( 'returns a STRING_OR_NUMBER config with two decimal digits and business rounding, and textValueMinLength = 1', function() {
                const
                    defaultConfig = MedDataItemConfigSchema.getDefaultConfig(),
                    expectedConfig = new MedDataItemConfigSchema( {
                        validFromIncl: defaultConfig.validFromIncl,
                        dataType: MedDataItemDataTypes.STRING_OR_NUMBER,
                        valueLeadingZeros: 0,
                        valueDigits: 2,
                        valueRoundingMethod: 0,
                        textValueMinLength: 1
                    } );

                expect( defaultConfig ).to.be.eql( expectedConfig );
            } );

            it( 'returns a default MedDataItemConfigSchema with an optional template properly set', function() {
                const
                    template = new MedDataItemTemplateSchema( {
                        type: "TEST",
                        category: MedDataCategories.BIOMETRICS
                    } ),
                    defaultConfig = MedDataItemConfigSchema.getDefaultConfig( template ),
                    expectedConfig = new MedDataItemConfigSchema( {
                        validFromIncl: defaultConfig.validFromIncl,
                        dataType: MedDataItemDataTypes.STRING_OR_NUMBER,
                        valueLeadingZeros: 0,
                        valueDigits: 2,
                        valueRoundingMethod: 0,
                        textValueMinLength: 1
                    }, template );

                expect( defaultConfig ).to.be.eql( expectedConfig );
            } );

        } );

        describe( '.getStaticScope()', function() {

            it( 'returns a list of static variables used in formula calculations', function() {
                const
                    staticVariables = {
                        "now": "number"
                    },
                    scope = MedDataItemConfigSchema.getStaticScope();
                expect( Object.keys( scope ) ).to.be.eql( Object.keys( staticVariables ) );
                Object.keys( staticVariables ).forEach( ( key ) => {
                    expect( scope[key] ).to.be.an( staticVariables[key] );
                } );
            } );

        } );

        describe( '.DEFAULTREGEXPFLAGS', function() {

            it( 'be defined', function() {
                expect( MedDataItemConfigSchema.DEFAULTREGEXPFLAGS ).to.be.equal( "i" );
            } );

        } );

        describe( '.getDefaultConfigBasedOnMedDataItemProperties()', function() {

            it( 'returns a STRING config if ONLY a textValue is defined', function() {
                expect( MedDataItemConfigSchema.getDefaultConfigBasedOnMedDataItemProperties( new MedDataItemSchema( {
                    category: MedDataCategories.BIOMETRICS,
                    type: "TEST",
                    textValue: "BLABLA"
                } ) ) ).to.be.eql( new MedDataItemConfigSchema( {
                    validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                    dataType: MedDataItemDataTypes.STRING
                } ) );
            } );

            it( 'returns a NUMBER_FLOAT config if ONLY a value is defined', function() {
                expect( MedDataItemConfigSchema.getDefaultConfigBasedOnMedDataItemProperties( new MedDataItemSchema( {
                    category: MedDataCategories.BIOMETRICS,
                    type: "TEST",
                    value: 123.345
                } ) ) ).to.be.eql( new MedDataItemConfigSchema( {
                    validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                    dataType: MedDataItemDataTypes.NUMBER_FLOAT,
                    valueLeadingZeros: 0,
                    valueDigits: 2,
                    valueRoundingMethod: 0
                } ) );
            } );

            it( 'returns a BOOLEAN config if ONLY a boolValue is defined', function() {
                expect( MedDataItemConfigSchema.getDefaultConfigBasedOnMedDataItemProperties( new MedDataItemSchema( {
                    category: MedDataCategories.BIOMETRICS,
                    type: "TEST",
                    boolValue: true
                } ) ) ).to.be.eql( new MedDataItemConfigSchema( {
                    validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                    dataType: MedDataItemDataTypes.BOOLEAN
                } ) );
            } );

            it( 'returns a STRING_OR_NUMBER default config if BOTH, textValue AND value are defined', function() {
                const
                    defaultConfig = MedDataItemConfigSchema.getDefaultConfig(),
                    configToTest = MedDataItemConfigSchema.getDefaultConfigBasedOnMedDataItemProperties( new MedDataItemSchema( {
                        category: MedDataCategories.BIOMETRICS,
                        type: "TEST",
                        textValue: "TEST",
                        value: 123.1234
                    } ) );

                // harmonize validFrom dates
                configToTest.validFromIncl = defaultConfig.validFromIncl;

                expect( configToTest ).to.be.eql( defaultConfig );
            } );

            it( 'returns a fallback if values for each dataType are provided, and a fallback is given', function() {
                const fallback = new MedDataItemConfigSchema( {
                    validFromIncl: new Date( 1912, 12, 12, 12, 12, 12, 12 ),
                    dataType: MedDataItemDataTypes.NUMBER_FLOAT
                } );
                expect( MedDataItemConfigSchema.getDefaultConfigBasedOnMedDataItemProperties( new MedDataItemSchema( {
                    category: MedDataCategories.BIOMETRICS,
                    type: "TEST",
                    textValue: "TEST",
                    value: 123.1234,
                    boolValue: true,
                    dateValue: new Date()
                } ), fallback ) ).to.be.equal( fallback );
            } );

            it( 'returns a default config of dataType ANY, if values for each dataType are provided, and NO fallback is given', function() {
                expect( MedDataItemConfigSchema.getDefaultConfigBasedOnMedDataItemProperties( new MedDataItemSchema( {
                    category: MedDataCategories.BIOMETRICS,
                    type: "TEST",
                    textValue: "TEST",
                    value: 123.1234,
                    boolValue: true,
                    dateValue: new Date()
                } ) ) ).to.be.eql( new MedDataItemConfigSchema( {
                    validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                    dataType: MedDataItemDataTypes.ANY
                } ) );
            } );

        } );

    } );

    describe( 'medDataItemConfigFor* (pre-defined configurations for static tags)', function() {

        describe( 'medDataItemConfigForBloodPressure', function() {

            it( 'textValueValidationFunction correctly validates the input for BLOODPRESSURE', function() {
                const
                    tests = [
                        {
                            textValue: "123/80",
                            errorCount: 0
                        },
                        {
                            textValue: "123/20",
                            errorCount: 1
                        },
                        {
                            textValue: "423/60",
                            errorCount: 1
                        },
                        {
                            textValue: "120/140",
                            errorCount: 1
                        },
                        {
                            textValue: "asd/as",
                            errorCount: 2
                        },
                        {
                            textValue: "",
                            errorCount: 2
                        }
                    ];

                for( let test of tests ) {
                    expect(
                        medDataItemConfigForBloodPressure.textValueValidationFunction( test.textValue ),
                        `test for ${test.textValue} should produce ${test.errorCount} errors`
                    ).to.have.length( test.errorCount );
                }
            } );

            it( 'chartValueFormattingFunction correctly returns a chartValue object', function() {
                const
                    tests = [
                        {
                            textValue: "123/80",
                            expectedOutput: {
                                hasChartValue: true,
                                valueKey: 'v_meddata-schema.medDataTypes.BLOODPRESSURE_SYST',
                                value2Key: 'v_meddata-schema.medDataTypes.BLOODPRESSURE_DIAST',
                                value: 123,
                                value2: 80
                            }
                        },
                        {
                            textValue: "asdasd",
                            expectedOutput: null
                        }
                    ];

                for( let test of tests ) {
                    expect(
                        medDataItemConfigForBloodPressure.chartValueFormattingFunction( {
                            textValue: test.textValue
                        } ),
                        `for ${test.textValue} should return as ${JSON.stringify( test.expectedOutput )}`
                    ).to.be.eql( test.expectedOutput );
                }
            } );

        } );

        describe( 'medDataItemConfigForBloodPressureP', function() {

            it( 'textValueValidationFunction correctly validates the input for BLOODPRESSURE but "isOptional" (validates empty and undefined)', function() {
                const
                    tests = [
                        {
                            textValue: "123/80",
                            errorCount: 0
                        },
                        {
                            textValue: "123/20",
                            errorCount: 1
                        },
                        {
                            textValue: "423/60",
                            errorCount: 1
                        },
                        {
                            textValue: "120/140",
                            errorCount: 1
                        },
                        {
                            textValue: "asd/as",
                            errorCount: 2
                        },
                        {
                            textValue: "",
                            errorCount: 0
                        },
                        {
                            textValue: undefined,
                            errorCount: 0
                        },
                        {
                            textValue: null,
                            errorCount: 0
                        }
                    ];

                for( let test of tests ) {
                    expect(
                        medDataItemConfigForBloodPressureP.textValueValidationFunction( test.textValue ),
                        `test for ${test.textValue} should produce ${test.errorCount} errors`
                    ).to.have.length( test.errorCount );
                }
            } );

        } );

    } );

} );
