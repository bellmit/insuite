/**
 * User: nicolas.pettican
 * Date: 19.02.20  17:25
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, expect, it, describe */

function genericTester( testCases, func ) {
    let result;

    for( let {input, expectedOutput} of testCases ) {

        result = func( input );

        // console.table(result);

        if( Array.isArray( expectedOutput ) ) {
            expect( Array.isArray( result ) ).to.equal( true );
            expect( result.length ).to.equal( expectedOutput.length );
            for( let [index, resultObj] of result.entries() ) {
                expect( expectedOutput[index] ).to.deep.equal( resultObj );
            }
        }

        expect( result ).to.deep.equal( expectedOutput );

    }
}

describe( 'Test rest handler', function() {

    const {_reduceATCCodeEntry, _reduceICD10CodeEntry, _getDivisibility} = Y.doccirrus.api.medicationscatalog;

    describe( '0. restHandler methods', function() {

        it( 'returns ATC code object list', function() {

            const testCases = [
                {
                    input: {
                        "CODE": "L04AC10",
                        "NAME": "Secukinumab",
                        "NAME_SORT": "L04AC10",
                        "CATALOGID": 17,
                        "NAME_SHORT": "L04AC10",
                        "UPPERCODE": "L04AC",
                        "PARENT": {
                            "CODE": "L04AC",
                            "NAME": "Interleukin-Inhibitoren",
                            "NAME_SORT": "L04AC",
                            "CATALOGID": 17,
                            "NAME_SHORT": "L04AC",
                            "UPPERCODE": "L04A",
                            "PARENT": {
                                "CODE": "L04A",
                                "NAME": "Immunsuppressiva",
                                "NAME_SORT": "L04A",
                                "CATALOGID": 17,
                                "NAME_SHORT": "L04A",
                                "UPPERCODE": "L04",
                                "PARENT": {
                                    "CODE": "L04",
                                    "NAME": "Immunsuppressiva",
                                    "NAME_SORT": "L04",
                                    "CATALOGID": 17,
                                    "NAME_SHORT": "L04",
                                    "UPPERCODE": "L",
                                    "PARENT": {
                                        "CODE": "L",
                                        "NAME": "Antineoplastische und immunmodulierende Mittel",
                                        "NAME_SORT": "L",
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "L"
                                    }
                                }
                            }
                        }
                    },
                    expectedOutput: [
                        {
                            name: 'Secukinumab',
                            atcCode: 'L04AC10',
                            upperCode: 'L04AC',
                            level: 0
                        },
                        {
                            name: 'Interleukin-Inhibitoren',
                            atcCode: 'L04AC',
                            upperCode: 'L04A',
                            level: 1
                        },
                        {
                            name: 'Immunsuppressiva',
                            atcCode: 'L04A',
                            upperCode: 'L04',
                            level: 2
                        },
                        {
                            name: 'Immunsuppressiva',
                            atcCode: 'L04',
                            upperCode: 'L',
                            level: 3
                        },
                        {
                            name: 'Antineoplastische und immunmodulierende Mittel',
                            atcCode: 'L',
                            upperCode: '',
                            level: 4
                        }
                    ]
                },
                {
                    input: {
                        "CODE": "B05",
                        "NAME": "Blutersatzmittel  und Perfusionslösungen",
                        "NAME_SORT": "B05",
                        "CATALOGID": 17,
                        "NAME_SHORT": "B05",
                        "UPPERCODE": "B",
                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                        "CHILD_LIST": [
                            {
                                "CODE": "B05A",
                                "NAME": "Blut und verwandte Produkte",
                                "NAME_SORT": "B05A",
                                "CATALOGID": 17,
                                "NAME_SHORT": "B05A",
                                "UPPERCODE": "B05",
                                "PRODUCTEXISTINASSORTMENT_FLAG": 1
                            },
                            {
                                "CODE": "B05B",
                                "NAME": "I.V.-Lösungen",
                                "NAME_SORT": "B05B",
                                "CATALOGID": 17,
                                "NAME_SHORT": "B05B",
                                "UPPERCODE": "B05",
                                "PRODUCTEXISTINASSORTMENT_FLAG": 1
                            }
                        ]
                    },
                    expectedOutput: [
                        {
                            name: 'Blutersatzmittel  und Perfusionslösungen',
                            atcCode: 'B05',
                            upperCode: 'B',
                            level: 0,
                            children: [
                                {
                                    name: 'Blut und verwandte Produkte',
                                    atcCode: 'B05A',
                                    upperCode: 'B05'
                                },
                                {
                                    name: 'I.V.-Lösungen',
                                    atcCode: 'B05B',
                                    upperCode: 'B05'
                                }
                            ]
                        }
                    ]
                }
            ];

            genericTester( testCases, _reduceATCCodeEntry );

        } );

        it( 'returns icd10 code object list', function() {

            const testCases = [
                {
                    input: {
                        "CATALOGID": 18,
                        "NAME_SHORT": "L40.5",
                        "UPPERCODE": "L40",
                        "PARENT": {
                            "CATALOGID": 18,
                            "NAME_SHORT": "L40",
                            "UPPERCODE": "L40-L45",
                            "PARENT": {
                                "CATALOGID": 18,
                                "NAME_SHORT": "L40-L45",
                                "UPPERCODE": "L00-L99",
                                "PARENT": {
                                    "CATALOGID": 18,
                                    "NAME_SHORT": "L00-L99",
                                    "NAME": "Krankheiten der Haut und der Unterhaut",
                                    "CODE": "L00-L99",
                                    "NAME_SORT": "L00-L99"
                                },
                                "NAME": "Papulosquamöse Hautkrankheiten",
                                "CODE": "L40-L45",
                                "NAME_SORT": "L40-L45"
                            },
                            "NAME": "Psoriasis",
                            "CODE": "L40",
                            "NAME_SORT": "L40"
                        },
                        "NAME": "Psoriasis-Arthropathie",
                        "CODE": "L40.5",
                        "NAME_SORT": "L40.5"
                    },
                    expectedOutput: [
                        {
                            name: 'Psoriasis-Arthropathie',
                            icd10Code: 'L40.5',
                            upperCode: 'L40',
                            level: 0
                        },
                        {
                            name: 'Psoriasis',
                            icd10Code: 'L40',
                            upperCode: 'L40-L45',
                            level: 1
                        },
                        {
                            name: 'Papulosquamöse Hautkrankheiten',
                            icd10Code: 'L40-L45',
                            upperCode: 'L00-L99',
                            level: 2
                        },
                        {
                            name: 'Krankheiten der Haut und der Unterhaut',
                            icd10Code: 'L00-L99',
                            upperCode: '',
                            level: 3
                        }
                    ]
                },
                {
                    input: {
                        "CATALOGID": 18,
                        "NAME_SHORT": "M45.09",
                        "UPPERCODE": "M45.0",
                        "PARENT": {
                            "CATALOGID": 18,
                            "NAME_SHORT": "M45.0",
                            "UPPERCODE": "M45",
                            "PARENT": {
                                "CATALOGID": 18,
                                "NAME_SHORT": "M45",
                                "UPPERCODE": "M45-M49",
                                "PARENT": {
                                    "CATALOGID": 18,
                                    "NAME_SHORT": "M45-M49",
                                    "UPPERCODE": "M00-M99",
                                    "PARENT": {
                                        "CATALOGID": 18,
                                        "NAME_SHORT": "M00-M99",
                                        "NAME": "Krankheiten des Muskel-Skelett-Systems und des Bindegewebes",
                                        "CODE": "M00-M99",
                                        "NAME_SORT": "M00-M99"
                                    },
                                    "NAME": "Spondylopathien",
                                    "CODE": "M45-M49",
                                    "NAME_SORT": "M45-M49"
                                },
                                "NAME": "Spondylitis ankylosans",
                                "CODE": "M45",
                                "NAME_SORT": "M45"
                            },
                            "NAME": "Spondylitis ankylosans",
                            "CODE": "M45.0",
                            "NAME_SORT": "M45.0"
                        },
                        "NAME": "Spondylitis ankylosans: Nicht näher bezeichnete Lokalisation",
                        "CODE": "M45.09",
                        "NAME_SORT": "M45.09"
                    },
                    expectedOutput: [
                        {
                            name: 'Spondylitis ankylosans: Nicht näher bezeichnete Lokalisation',
                            icd10Code: 'M45.09',
                            upperCode: 'M45.0',
                            level: 0
                        },
                        {
                            name: 'Spondylitis ankylosans',
                            icd10Code: 'M45.0',
                            upperCode: 'M45',
                            level: 1
                        },
                        {
                            name: 'Spondylitis ankylosans',
                            icd10Code: 'M45',
                            upperCode: 'M45-M49',
                            level: 2
                        },
                        {
                            name: 'Spondylopathien',
                            icd10Code: 'M45-M49',
                            upperCode: 'M00-M99',
                            level: 3
                        },
                        {
                            name: 'Krankheiten des Muskel-Skelett-Systems und des Bindegewebes',
                            icd10Code: 'M00-M99',
                            upperCode: '',
                            level: 4
                        }
                    ]
                }
            ];

            genericTester( testCases, _reduceICD10CodeEntry );

        } );

        it( 'should return NOT_DIVISIBLE when there is at least one not divisible item', function() {
            const ITEM_LIST = [
                {
                    DIVISIBLE_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true
                }, {
                    DIVISIBLE_FLAG: false
                }
            ];

            expect( _getDivisibility( ITEM_LIST ) ).to.equal( 'NOT_DIVISIBLE' );
        } );

        it( 'should return DIVISIBLE4 when all items are divisible by 4', function() {
            const ITEM_LIST = [
                {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE4_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE4_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE4_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE4_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE4_FLAG: true
                }
            ];

            expect( _getDivisibility( ITEM_LIST ) ).to.equal( 'DIVISIBLE4' );
        } );

        it( 'should return DIVISIBLE3 when all items divisible by 3', function() {
            const ITEM_LIST = [
                {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE3_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE3_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE3_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE3_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE3_FLAG: true
                }
            ];

            expect( _getDivisibility( ITEM_LIST ) ).to.equal( 'DIVISIBLE3' );
        } );

        it( 'should return DIVISIBLE2 when all items divisible by 2', function() {
            const ITEM_LIST = [
                {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE2_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE2_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE2_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE2_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE2_FLAG: true
                }
            ];

            expect( _getDivisibility( ITEM_LIST ) ).to.equal( 'DIVISIBLE2' );
        } );

        it( 'should return DIVISIBLE2 when all items divisible by 2 or 4', function() {
            const ITEM_LIST = [
                {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE2_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE4_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE2_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE4_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE2_FLAG: true
                }
            ];

            expect( _getDivisibility( ITEM_LIST ) ).to.equal( 'DIVISIBLE2' );
        } );

        it( 'should return DIVISIBLE when all items are divisible but some don\'t have specific divisibility count flag', function() {
            const ITEM_LIST = [
                {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE2_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE4_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE2_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE4_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true
                }
            ];

            expect( _getDivisibility( ITEM_LIST ) ).to.equal( 'DIVISIBLE' );
        } );

        it( 'should return DIVISIBLE when all items are divisible but have different divisibility count flag', function() {
            const ITEM_LIST = [
                {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE2_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE3_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE2_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE4_FLAG: true
                }, {
                    DIVISIBLE_FLAG: true,
                    DIVISIBLE3_FLAG: true
                }
            ];

            expect( _getDivisibility( ITEM_LIST ) ).to.equal( 'DIVISIBLE' );
        } );

        it( 'should return UNKNOWN when there is no items', function() {
            const ITEM_LIST = [];

            expect( _getDivisibility( ITEM_LIST ) ).to.equal( 'UNKNOWN' );
        } );
    } );
} );
