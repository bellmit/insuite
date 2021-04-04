describe( 'tag-schema', function() {
    let
        // enums
        MedDataTypes,
        MedDataSymptoms,
        MedDataAlimentations,
        MedDataAllergies,
        GravidogrammDataTypes,
        MedDataBiometricsSwiss,
        MedDataCategories,
        TagTypes,
        TagErrors,
        StaticTags,

        // procedures
        findStaticTag,
        isStaticTag,

        // classes
        TagSchema,
        MedDataItemTemplateCollection;

    before( async function() {
        await import( './tag-schema.common.yui' );

        // enums
        MedDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes;
        MedDataSymptoms = Y.doccirrus.schemas.v_meddata.medDataSymptoms;
        MedDataAlimentations = Y.doccirrus.schemas.v_meddata.medDataAlimentations;
        MedDataAllergies = Y.doccirrus.schemas.v_meddata.medDataAllergies;
        GravidogrammDataTypes = Y.doccirrus.schemas.v_meddata.gravidogrammDataTypes;
        MedDataBiometricsSwiss = Y.doccirrus.schemas.v_meddata.medDataBiometricsSwiss;
        MedDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories;
        TagTypes = Y.doccirrus.schemas.tag.tagTypes;
        TagTypes = Y.doccirrus.schemas.tag.tagTypes;
        TagErrors = Y.doccirrus.schemas.tag.tagErrors;
        StaticTags = Y.doccirrus.schemas.tag.staticTags;

        // procedures
        findStaticTag = Y.doccirrus.schemas.tag.findStaticTag;
        isStaticTag = Y.doccirrus.schemas.tag.isStaticTag;

        // classes
        TagSchema = Y.doccirrus.schemas.tag.TagSchema;
        MedDataItemTemplateCollection = Y.doccirrus.schemas.tag.MedDataItemTemplateCollection;

        this.now = new Date();
    } );

    after( function() {
        Y = null;
    } );

    context( 'TagTypes', function() {

        it( 'is an ENUM object', function() {
            expect( TagTypes ).to.be.an( "object" );
        } );

        it( 'has expected keys', function() {
            expect( Object.keys( TagTypes ) ).to.be.eql( [
                'JOBSTATUS',
                'DOCUMENT',
                'CATALOG',
                'SUBTYPE',
                'MEDDATA',
                'LABDATA',
                'INPACSNAME',
                'CANCELREASON',
                'DOSE',
                'PHNOTE',
                'PHREASON',
                'RELATIONSHIPSTATUS'
            ] );
        } );

        it( 'is symmetric (keys match values)', function() {
            expect( Object.keys( TagTypes ) ).to.be.eql( Object.values( TagTypes ) );
        } );

    } );

    context( 'TagErrors', function() {

        it( 'is an ENUM object', function() {
            expect( TagErrors ).to.be.an( "object" );
        } );

        it( 'has expected keys', function() {
            expect( Object.keys( TagErrors ) ).to.be.eql( [
                "NO_TAGS_TO_UPDATE",
                "INVALID_INPUT",
                "DEFAULT_MED_TAG",
                "TAG_NOT_FOUND",
                "TAG_ALREADY_EXISTS"
            ] );
        } );

        it( 'is symmetric (keys match values)', function() {
            expect( Object.keys( TagErrors ) ).to.be.eql( Object.values( TagErrors ) );
        } );

    } );

    context( 'StaticTags', function() {

        it( 'is an array containing at least one element of type TagSchema', function() {
            expect( StaticTags ).to.be.an( "array" );
            expect( StaticTags ).to.have.length.greaterThan( 0 );

            for( let tag of StaticTags ) {
                expect( tag ).to.be.instanceof( TagSchema );
            }
        } );

        it( 'contains a static tag for each expected title', function() {
            const
                existingTypes = StaticTags.map( tag => tag.title ),
                expectedTypes = [
                    ...[
                        MedDataTypes.EGFR,
                        MedDataTypes.HBA1C,
                        MedDataTypes.LDL,
                        MedDataTypes.WEIGHT,
                        MedDataTypes.HEIGHT,
                        MedDataTypes.CYCLE_LENGTH,
                        MedDataTypes.CHECKUP_WEIGHT,
                        MedDataTypes.HAEMOGLOBIN,
                        MedDataTypes.HEAD_CIRCUMFERENCE,
                        MedDataTypes.BMI,
                        MedDataTypes.BLOODPRESSURE,
                        MedDataTypes.BLOODPRESSUREP,
                        MedDataTypes.WEEK_AND_DAY_CORRECTION,
                        MedDataTypes.END_OF_PREGNANCY,
                        MedDataTypes.SMOKER,
                        MedDataTypes.VACCINATION,
                        MedDataTypes.LAST_MENSTRUATION,
                        MedDataTypes.MATERNITY_LEAVE_DATE,
                        MedDataTypes.DUE_DATE,
                        MedDataTypes.LAST_MENSTRUATION_P,
                        MedDataTypes.BREAST_FEEDING,
                        MedDataTypes.PREGNANT
                    ],
                    ...Object.keys( MedDataSymptoms ),
                    ...Object.keys( MedDataAlimentations ),
                    ...Object.keys( MedDataAllergies ),
                    ...Object.keys( GravidogrammDataTypes ),
                    ...Object.keys( MedDataBiometricsSwiss )
                ];

            for( let expectedType of expectedTypes ) {
                expect( existingTypes ).to.include( expectedType );
            }
        } );

        it( 'contains at least one element for each MedDataCategory (no empty categories)', function() {

            /**
             * private categories, created just for partners (i.e. ACTIVEINGREDIENTS for Semdatex),
             * or for internal usage, i.e. ACTIVEINGREDIENTS for IngredientPlan
             * @type {(string)[]}
             */
            const privateCategories = [
                MedDataCategories.ACTIVEINGREDIENTS
            ];

            for( let category of Object.keys( MedDataCategories ) ) {
                let hasItemForCategory = StaticTags.some( tag => tag.category.some( cat => cat === category ) ) || privateCategories.includes( category );
                expect(
                    hasItemForCategory,
                    `could not find a staticTag with category: ${category}`
                ).to.be.equal( true );
            }

        } );

    } );

    context( 'TagSchema', function() {

    } );

    context( 'MedDataItemTemplateCollection', function() {

        describe( '#constructor()', function() {

            describe( 'given no templates as input', function() {

                beforeEach( function() {

                    this.collection = new MedDataItemTemplateCollection();

                    this.uniqueCategoriesInStaticTag = new Set();
                    StaticTags.forEach( tag => {
                        tag.category.forEach( category => {
                            this.uniqueCategoriesInStaticTag.add( category );
                        } );
                    } );

                } );

                afterEach( function() {
                    this.uniqueCategoriesInStaticTag = null;
                    this.collection = null;
                } );

                it( 'returns an object of type MedDataItemTemplateCollection', function() {
                    expect( this.collection ).to.be.instanceOf( MedDataItemTemplateCollection );
                    expect( this.collection.medDataItemTemplatesByCategory ).to.be.an( "object" );
                } );

                it( 'initalizes an object medDataItemTemplatesByCategory', function() {
                    expect( this.collection.medDataItemTemplatesByCategory ).to.be.an( "object" );
                } );

                it( 'fills medDataItemTemplatesByCategory with an entry for each category within StaticTags', function() {
                    expect( Object.keys( this.collection.medDataItemTemplatesByCategory ) ).to.eql( [...this.uniqueCategoriesInStaticTag] );
                } );

            } );

            describe( 'given custom templates as input', function() {

                beforeEach( function() {

                    this.customTemplates = {
                        "TEST-CATEGORY": {
                            "TEST-TYPE": {
                                type: "TEST-TYPE",
                                category: "TEST-CATEGORY",
                                unit: "TEST-UNIT",
                                sampleNormalValueText: [],
                                additionalData: {},
                                medDataItemConfig: [
                                    {
                                        validFromIncl: new Date( 2020, 10, 2, 1, 1, 1, 1, 1, 1 ),
                                        dataType: "STRING"
                                    }
                                ],
                                i18n: "TEST-I18N",
                                isStatic: false,
                                isUnitDisabled: false,
                                isReadOnly: false,
                                unitEnumCollection: undefined,
                                justForCaseFolderType: undefined,
                                justForCountryMode: undefined
                            }
                        },
                        "TEST-CATEGORY2": {
                            "TEST-TYPE2": {
                                type: "TEST-TYPE2",
                                category: "TEST-CATEGORY2",
                                unit: "TEST-UNIT2",
                                sampleNormalValueText: [],
                                additionalData: {},
                                medDataItemConfig: [
                                    {
                                        validFromIncl: new Date( 2020, 10, 2, 1, 1, 1, 1, 1, 1 ),
                                        dataType: "STRING"
                                    }
                                ],
                                i18n: "TEST-I18N2",
                                isStatic: false,
                                isUnitDisabled: false,
                                isReadOnly: false,
                                unitEnumCollection: undefined,
                                justForCaseFolderType: undefined,
                                justForCountryMode: undefined
                            }
                        }
                    };

                    this.collection = new MedDataItemTemplateCollection( {
                        medDataItemTemplatesByCategory: this.customTemplates
                    } );

                    this.uniqueCategoriesInStaticTag = new Set();
                    StaticTags.forEach( tag => {
                        tag.category.forEach( category => {
                            this.uniqueCategoriesInStaticTag.add( category );
                        } );
                    } );

                } );

                afterEach( function() {
                    this.customTemplates = null;
                    this.uniqueCategoriesInStaticTag = null;
                    this.collection = null;
                } );

                it( 'returns an object of type MedDataItemTemplateCollection', function() {
                    expect( this.collection ).to.be.instanceOf( MedDataItemTemplateCollection );
                    expect( this.collection.medDataItemTemplatesByCategory ).to.be.an( "object" );
                } );

                it( 'initalizes an object medDataItemTemplatesByCategory', function() {
                    expect( this.collection.medDataItemTemplatesByCategory ).to.be.an( "object" );
                } );

                it( 'fills medDataItemTemplatesByCategory with an entry for each category within StaticTags + with the category of the static tags', function() {
                    expect( Object.keys( this.collection.medDataItemTemplatesByCategory ) ).to.eql( [
                        ...Object.keys( this.customTemplates ),
                        ...this.uniqueCategoriesInStaticTag
                    ] );
                } );

            } );

        } );

        describe( '#getMedDataTypeListByCategory()', function() {

            beforeEach( function() {
                this.collection = new MedDataItemTemplateCollection();
                this.medDataTypeList = this.collection.getMedDataTypeListByCategory();
            } );

            afterEach( function() {
                this.collection = null;
                this.medDataTypeList = null;
            } );

            it( 'returns a dictionary object of with all categories as root keys', function() {
                expect(
                    Object.keys( this.medDataTypeList ),
                    `type list should have the same root-keys (categories) as the template dictionary`
                ).to.be.eql( Object.keys( this.collection.medDataItemTemplatesByCategory ) );
            } );

            it( 'returns an array of MedDataTypes stored inside each category key', function() {
                Object.keys( this.medDataTypeList ).forEach( category => {
                    expect(
                        this.medDataTypeList[category],
                        `expected MedDataTypeList[${category}] to be an array` )
                        .to.be.an( "array" );
                    expect(
                        this.medDataTypeList[category],
                        `unexpected items inside MedDataTypeList[${category}]`
                    ).to.be.eql(
                        Object.keys( this.collection.medDataItemTemplatesByCategory[category] )
                    );
                } );
            } );

        } );

        describe( '#getMedDataTypeListByCategoryForSelect2()', function() {

            describe( 'given no arguments', function() {

                beforeEach( function() {
                    this.collection = new MedDataItemTemplateCollection();
                    this.medDataTypeList = this.collection.getMedDataTypeListByCategoryForSelect2();
                } );

                afterEach( function() {
                    this.collection = null;
                    this.medDataTypeList = null;
                } );

                it( 'returns a dictionary object of with all categories as root keys', function() {
                    expect(
                        Object.keys( this.medDataTypeList ),
                        `type list should have the same root-keys (categories) as the template dictionary`
                    ).to.be.eql( Object.keys( this.collection.medDataItemTemplatesByCategory ) );
                } );

                it( 'returns an array of select2 objects stored inside each category key', function() {

                    Object.keys( this.medDataTypeList ).forEach( category => {

                        const expectedElements = [];
                        for( let template of Object.values( this.collection.medDataItemTemplatesByCategory[category] ) ) {
                            expectedElements.push( {
                                id: template.type,
                                i18n: template.i18n || template.type,
                                text: template.i18n || template.type
                            } );
                        }

                        expect(
                            this.medDataTypeList[category],
                            `expected MedDataTypeList[${category}] to be an array`
                        ).to.be.an( "array" );
                        expect(
                            this.medDataTypeList[category],
                            `unexpected select2 items inside MedDataTypeList[${category}]`
                        ).to.be.eql( expectedElements );

                    } );

                } );

            } );

            describe( 'given a string as category filter argument', function() {

                beforeEach( function() {
                    this.arguments = {
                        categoryOrCategories: MedDataCategories.BIOMETRICS
                    };
                    this.collection = new MedDataItemTemplateCollection();
                    this.medDataTypeList = this.collection.getMedDataTypeListByCategoryForSelect2( this.arguments );
                } );

                afterEach( function() {
                    this.arguments = null;
                    this.collection = null;
                    this.medDataTypeList = null;
                } );

                it( 'returns only the items matching the category filter inside each category key', function() {

                    Object.keys( this.medDataTypeList ).forEach( category => {

                        const
                            expectedElements = [];

                        if( this.arguments.categoryOrCategories === category ) {
                            for( let template of Object.values( this.collection.medDataItemTemplatesByCategory[category] ) ) {
                                expectedElements.push( {
                                    id: template.type,
                                    i18n: template.i18n || template.type,
                                    text: template.i18n || template.type
                                } );
                            }
                        }

                        expect(
                            this.medDataTypeList[category],
                            `expected MedDataTypeList[${category}] to be an array`
                        ).to.be.an( "array" );
                        expect(
                            this.medDataTypeList[category],
                            `unexpected select2 items inside MedDataTypeList[${category}]`
                        ).to.be.eql( expectedElements );

                    } );

                } );

            } );

            describe( 'given a string-array as category filter argument', function() {

                beforeEach( function() {
                    this.arguments = {
                        categoryOrCategories: [MedDataCategories.BIOMETRICS, MedDataCategories.PERCENTILECURVE]
                    };
                    this.collection = new MedDataItemTemplateCollection();
                    this.medDataTypeList = this.collection.getMedDataTypeListByCategoryForSelect2( this.arguments );
                } );

                afterEach( function() {
                    this.arguments = null;
                    this.collection = null;
                    this.medDataTypeList = null;
                } );

                it( 'returns only the items matching the category filter inside each category key', function() {

                    Object.keys( this.medDataTypeList ).forEach( category => {

                        const
                            expectedElements = [];

                        if( this.arguments.categoryOrCategories.includes( category ) ) {
                            for( let template of Object.values( this.collection.medDataItemTemplatesByCategory[category] ) ) {
                                expectedElements.push( {
                                    id: template.type,
                                    i18n: template.i18n || template.type,
                                    text: template.i18n || template.type
                                } );
                            }
                        }

                        expect(
                            this.medDataTypeList[category],
                            `expected MedDataTypeList[${category}] to be an array`
                        ).to.be.an( "array" );
                        expect(
                            this.medDataTypeList[category],
                            `unexpected select2 items inside MedDataTypeList[${category}]`
                        ).to.be.eql( expectedElements );

                    } );

                } );

            } );

        } );

        describe( '#getMedDataTypeList()', function() {

            beforeEach( function() {
                this.collection = new MedDataItemTemplateCollection();
                this.medDataTypeList = this.collection.getMedDataTypeList();
            } );

            afterEach( function() {
                this.collection = null;
                this.medDataTypeList = null;
            } );

            it( 'returns a plain array of all unique and sorted MedDataTypes in that collection', function() {
                let
                    expectedResult = new Set(),
                    expectedResultArray;

                for( let category of Object.keys( this.collection.medDataItemTemplatesByCategory ) ) {
                    for( let type of Object.keys( this.collection.medDataItemTemplatesByCategory[category] ) ) {
                        expectedResult.add( type );
                    }
                }

                // convert to array
                expectedResultArray = [...expectedResult];

                // output is sorted
                expectedResultArray.sort();

                expect( this.medDataTypeList ).to.have.length( expectedResultArray.length );
                for( let i = 0; i < this.medDataTypeList.length; i++ ) {
                    expect(
                        this.medDataTypeList[i],
                        `type list should contain all types unique and sorted, mismatch in element [${i}]`
                    ).to.be.equal( expectedResultArray[i] );
                }

            } );

        } );

        describe( '#getMedDataTypeListForSelect2()', function() {

            describe( 'given no arguments', function() {

                beforeEach( function() {
                    this.collection = new MedDataItemTemplateCollection();
                    this.medDataTypeList = this.collection.getMedDataTypeListForSelect2();
                } );

                afterEach( function() {
                    this.collection = null;
                    this.medDataTypeList = null;
                } );

                it( 'returns a plain array of sorted unique select2 MedDataTypes in that collection', function() {
                    let
                        expectedResult = new Set(),
                        expectedResultArray = [];

                    for( let category of Object.keys( this.collection.medDataItemTemplatesByCategory ) ) {
                        for( let type of Object.keys( this.collection.medDataItemTemplatesByCategory[category] ) ) {
                            if( !expectedResult.has( type ) ) {
                                expectedResult.add( type );

                                let template = this.collection.medDataItemTemplatesByCategory[category][type];
                                expectedResultArray.push( {
                                    id: type,
                                    i18n: template.i18n || template.type,
                                    text: template.i18n || template.type
                                } );
                            }
                        }
                    }

                    // output is properly sorted
                    expectedResultArray.sort( ( a, b ) => {
                        return a.i18n < b.i18n;
                    } );

                    expect( this.medDataTypeList ).to.have.length( expectedResultArray.length );
                    for( let i = 0; i < this.medDataTypeList.length; i++ ) {
                        expect(
                            this.medDataTypeList[i],
                            `type list should contain all types unique and sorted, mismatch in element [${i}]`
                        ).to.be.eql( expectedResultArray[i] );
                    }

                } );

            } );

            describe( 'given a string as category filter argument', function() {

                beforeEach( function() {
                    this.arguments = {
                        categoryOrCategories: MedDataCategories.BIOMETRICS
                    };
                    this.collection = new MedDataItemTemplateCollection();
                    this.medDataTypeList = this.collection.getMedDataTypeListForSelect2( this.arguments );
                } );

                afterEach( function() {
                    this.arguments = null;
                    this.collection = null;
                    this.medDataTypeList = null;
                } );

                it( 'returns a plain array of sorted unique select2 MedDataTypes in that collection', function() {
                    let
                        expectedResult = new Set(),
                        expectedResultArray = [];

                    for( let category of Object.keys( this.collection.medDataItemTemplatesByCategory ) ) {
                        if( this.arguments.categoryOrCategories === category ) {
                            for( let type of Object.keys( this.collection.medDataItemTemplatesByCategory[category] ) ) {
                                if( !expectedResult.has( type ) ) {
                                    expectedResult.add( type );

                                    let template = this.collection.medDataItemTemplatesByCategory[category][type];
                                    expectedResultArray.push( {
                                        id: type,
                                        i18n: template.i18n || template.type,
                                        text: template.i18n || template.type
                                    } );
                                }
                            }
                        }
                    }

                    // output is properly sorted
                    expectedResultArray.sort( ( a, b ) => {
                        return a.i18n < b.i18n;
                    } );

                    expect( this.medDataTypeList ).to.have.length( expectedResultArray.length );
                    for( let i = 0; i < this.medDataTypeList.length; i++ ) {
                        expect(
                            this.medDataTypeList[i],
                            `type list should contain all types unique and sorted, mismatch in element [${i}]`
                        ).to.be.eql( expectedResultArray[i] );
                    }

                } );

            } );

            describe( 'given a string array as category filter argument', function() {

                beforeEach( function() {
                    this.arguments = {
                        categoryOrCategories: [MedDataCategories.BIOMETRICS, MedDataCategories.PERCENTILECURVE]
                    };
                    this.collection = new MedDataItemTemplateCollection();
                    this.medDataTypeList = this.collection.getMedDataTypeListForSelect2( this.arguments );
                } );

                afterEach( function() {
                    this.arguments = null;
                    this.collection = null;
                    this.medDataTypeList = null;
                } );

                it( 'returns a plain array of sorted unique select2 MedDataTypes in that collection', function() {
                    let
                        expectedResult = new Set(),
                        expectedResultArray = [];

                    for( let category of Object.keys( this.collection.medDataItemTemplatesByCategory ) ) {
                        if( this.arguments.categoryOrCategories.includes( category ) ) {
                            for( let type of Object.keys( this.collection.medDataItemTemplatesByCategory[category] ) ) {
                                if( !expectedResult.has( type ) ) {
                                    expectedResult.add( type );

                                    let template = this.collection.medDataItemTemplatesByCategory[category][type];
                                    expectedResultArray.push( {
                                        id: type,
                                        i18n: template.i18n || template.type,
                                        text: template.i18n || template.type
                                    } );
                                }
                            }
                        }
                    }

                    // output is properly sorted
                    expectedResultArray.sort( ( a, b ) => {
                        return a.i18n < b.i18n;
                    } );

                    expect( this.medDataTypeList ).to.have.length( expectedResultArray.length );
                    for( let i = 0; i < this.medDataTypeList.length; i++ ) {
                        expect(
                            this.medDataTypeList[i],
                            `type list should contain all types unique and sorted, mismatch in element [${i}]`
                        ).to.be.eql( expectedResultArray[i] );
                    }

                } );

            } );

        } );

    } );

} );
