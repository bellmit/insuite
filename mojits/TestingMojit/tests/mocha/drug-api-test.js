/**
 * User: nicolas.pettican
 * Date: 23.04.20  13:37
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

        if( typeof expectedOutput === 'string' ) {
            expect( result ).to.equal( expectedOutput );
            continue;
        }

        expect( result ).to.deep.equal( expectedOutput );

    }
}

describe( 'Drug API REST handlers', function() {

    const {
        _reduceATCCodeEntry,
        _reduceICD10CodeEntry,
        _getDivisibility,
        _mapPackageList,
        _mapMoleculeList,
        _reduceTopDownATCCodeTree,
        _mapATCCodeList,
        _getATCCodeLevelKey,
        _getICD10CodeLevelKey,
        _mergeDrugsWithPhDrugs
    } = Y.doccirrus.api.drug;

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
                            level: 'CS'
                        },
                        {
                            name: 'Interleukin-Inhibitoren',
                            atcCode: 'L04AC',
                            upperCode: 'L04A',
                            level: 'CTPU'
                        },
                        {
                            name: 'Immunsuppressiva',
                            atcCode: 'L04A',
                            upperCode: 'L04',
                            level: 'TPU'
                        },
                        {
                            name: 'Immunsuppressiva',
                            atcCode: 'L04',
                            upperCode: 'L',
                            level: 'TH'
                        },
                        {
                            name: 'Antineoplastische und immunmodulierende Mittel',
                            atcCode: 'L',
                            upperCode: '',
                            level: 'AG'
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
                            level: 'TH',
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
                            level: 'SUB'
                        },
                        {
                            name: 'Psoriasis',
                            icd10Code: 'L40',
                            upperCode: 'L40-L45',
                            level: 'CAT'
                        },
                        {
                            name: 'Papulosquamöse Hautkrankheiten',
                            icd10Code: 'L40-L45',
                            upperCode: 'L00-L99',
                            level: 'GRP'
                        },
                        {
                            name: 'Krankheiten der Haut und der Unterhaut',
                            icd10Code: 'L00-L99',
                            upperCode: '',
                            level: 'CHP'
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
                            level: 'LOC'
                        },
                        {
                            name: 'Spondylitis ankylosans',
                            icd10Code: 'M45.0',
                            upperCode: 'M45',
                            level: 'SUB'
                        },
                        {
                            name: 'Spondylitis ankylosans',
                            icd10Code: 'M45',
                            upperCode: 'M45-M49',
                            level: 'CAT'
                        },
                        {
                            name: 'Spondylopathien',
                            icd10Code: 'M45-M49',
                            upperCode: 'M00-M99',
                            level: 'GRP'
                        },
                        {
                            name: 'Krankheiten des Muskel-Skelett-Systems und des Bindegewebes',
                            icd10Code: 'M00-M99',
                            upperCode: '',
                            level: 'CHP'
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

        it( 'should return a mapped package list', function() {

            const testCases = [
                {
                    input: {
                        packageList: [
                            {
                                "ID": 11233,
                                "CUSTOM_FLAG": 0,
                                "SALESSTATUSCODE": "N",
                                "SIZE_AMOUNT": 30,
                                "SIZE_NORMSIZECODE": "2",
                                "SIZE_UNITCODE": "st",
                                "PZN": "08645877",
                                "PRICE_PATIENTPAYMENT": 6.23,
                                "PRICE_PHARMACYBUY": 42.56,
                                "PRICE_PHARMACYSALE": 62.3,
                                "ONMARKETDATE": 895183200000,
                                "PATIENTPAYMENTHINT": "AVP>=50,00 => ZuZa=AVP/10=6,23",
                                "NAME": "Rovamycine® 1 500 000 I.E. 30 Filmtbl. N2",
                                "NAME_SORT": "00010"
                            }
                        ],
                        packageDetailsMap: new Map()
                    },
                    expectedOutput: [
                        {
                            "pzn": "08645877",
                            "pznOriginal": "",
                            "name": "Rovamycine® 1 500 000 I.E. 30 Filmtbl. N2",
                            "quantity": 30,
                            "phSalesStatus": 'ONMARKET',
                            "phNormSize": "2",
                            "prices": {
                                "pricePatientPayment": 6.23,
                                "pricePharmacyBuy": 42.56,
                                "pricePharmacySale": 62.3
                            }
                        }
                    ]
                }
            ];

            genericTester( testCases, _mapPackageList );

        } );

        it( 'should return a mapped composition list', function() {

            const testCases = [
                {
                    input: [
                        {
                            "COMPOSITIONELEMENTS_LIST": [
                                {
                                    "ID": 4589,
                                    "MASSFROM": 1.5,
                                    "MOLECULEID": 1401,
                                    "MOLECULENAME": "Spiramycin",
                                    "MOLECULETYPECODE": "A",
                                    "MOLECULEUNITCODE": "MIOIE"
                                },
                                {
                                    "ID": 168,
                                    "MOLECULEID": 1108,
                                    "MOLECULENAME": "Lactose",
                                    "MOLECULETYPECODE": "I"
                                },
                                {
                                    "ID": 1333,
                                    "MOLECULEID": 16655,
                                    "MOLECULENAME": "Weizenstärke",
                                    "MOLECULETYPECODE": "I"
                                },
                                {
                                    "ID": 155,
                                    "MOLECULEID": 25052,
                                    "MOLECULENAME": "Siliciumdioxid hydrat",
                                    "MOLECULETYPECODE": "I"
                                },
                                {
                                    "ID": 9,
                                    "MOLECULEID": 15923,
                                    "MOLECULENAME": "Magnesium stearat",
                                    "MOLECULETYPECODE": "I"
                                },
                                {
                                    "ID": 10,
                                    "MOLECULEID": 10122,
                                    "MOLECULENAME": "Hypromellose",
                                    "MOLECULETYPECODE": "I"
                                },
                                {
                                    "ID": 719,
                                    "MOLECULEID": 19691,
                                    "MOLECULENAME": "Macrogol 20.000",
                                    "MOLECULETYPECODE": "I"
                                }
                            ]
                        }
                    ],
                    expectedOutput: [
                        {
                            "name": "Spiramycin",
                            "moleculeTypeCode": "A",
                            "ingredientCode": [
                                {
                                    "type": "MOLECULEID",
                                    "value": 1401
                                }
                            ],
                            "strengthValue": "1,50",
                            "strengthUnitCode": "MIOIE"
                        },
                        {
                            "name": "Lactose",
                            "moleculeTypeCode": "I",
                            "ingredientCode": [
                                {
                                    "type": "MOLECULEID",
                                    "value": 1108
                                }
                            ],
                            "strengthValue": "",
                            "strengthUnitCode": ""
                        },
                        {
                            "name": "Weizenstärke",
                            "moleculeTypeCode": "I",
                            "ingredientCode": [
                                {
                                    "type": "MOLECULEID",
                                    "value": 16655
                                }
                            ],
                            "strengthValue": "",
                            "strengthUnitCode": ""
                        },
                        {
                            "name": "Siliciumdioxid hydrat",
                            "moleculeTypeCode": "I",
                            "ingredientCode": [
                                {
                                    "type": "MOLECULEID",
                                    "value": 25052
                                }
                            ],
                            "strengthValue": "",
                            "strengthUnitCode": ""
                        },
                        {
                            "name": "Magnesium stearat",
                            "moleculeTypeCode": "I",
                            "ingredientCode": [
                                {
                                    "type": "MOLECULEID",
                                    "value": 15923
                                }
                            ],
                            "strengthValue": "",
                            "strengthUnitCode": ""
                        },
                        {
                            "name": "Hypromellose",
                            "moleculeTypeCode": "I",
                            "ingredientCode": [
                                {
                                    "type": "MOLECULEID",
                                    "value": 10122
                                }
                            ],
                            "strengthValue": "",
                            "strengthUnitCode": ""
                        },
                        {
                            "name": "Macrogol 20.000",
                            "moleculeTypeCode": "I",
                            "ingredientCode": [
                                {
                                    "type": "MOLECULEID",
                                    "value": 19691
                                }
                            ],
                            "strengthValue": "",
                            "strengthUnitCode": ""
                        }
                    ]
                }
            ];

            genericTester( testCases, _mapMoleculeList );

        } );

        it( 'should return an ATC tree', function() {

            const testCases = [
                {
                    input: {
                        "CATALOGID": 17,
                        "NAME_SHORT": "J",
                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                        "CHILD_LIST": [
                            {
                                "CATALOGID": 17,
                                "NAME_SHORT": "J01",
                                "UPPERCODE": "J",
                                "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                "CHILD_LIST": [
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J01A",
                                        "UPPERCODE": "J01",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Tetracycline",
                                        "CODE": "J01A",
                                        "NAME_SORT": "J01A"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J01B",
                                        "UPPERCODE": "J01",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 0,
                                        "NAME": "Amphenicole",
                                        "CODE": "J01B",
                                        "NAME_SORT": "J01B"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J01C",
                                        "UPPERCODE": "J01",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Betalactam-Antibiotika, Penicilline",
                                        "CODE": "J01C",
                                        "NAME_SORT": "J01C"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J01D",
                                        "UPPERCODE": "J01",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Andere Beta-Lactam-Antibiotika",
                                        "CODE": "J01D",
                                        "NAME_SORT": "J01D"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J01E",
                                        "UPPERCODE": "J01",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Sulfonamide und Trimethoprim",
                                        "CODE": "J01E",
                                        "NAME_SORT": "J01E"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J01F",
                                        "UPPERCODE": "J01",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Makrolide, Lincosamide und Streptogramine",
                                        "CODE": "J01F",
                                        "NAME_SORT": "J01F"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J01G",
                                        "UPPERCODE": "J01",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Aminoglykosid-Antibiotika",
                                        "CODE": "J01G",
                                        "NAME_SORT": "J01G"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J01M",
                                        "UPPERCODE": "J01",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Chinolone",
                                        "CODE": "J01M",
                                        "NAME_SORT": "J01M"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J01R",
                                        "UPPERCODE": "J01",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 0,
                                        "NAME": "Kombinationen von Antibiotika",
                                        "CODE": "J01R",
                                        "NAME_SORT": "J01R"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J01X",
                                        "UPPERCODE": "J01",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Andere Antibiotika",
                                        "CODE": "J01X",
                                        "NAME_SORT": "J01X"
                                    }
                                ],
                                "NAME": "Antibiotika zur systemischen Anwendung",
                                "CODE": "J01",
                                "NAME_SORT": "J01"
                            },
                            {
                                "CATALOGID": 17,
                                "NAME_SHORT": "J02",
                                "UPPERCODE": "J",
                                "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                "CHILD_LIST": [
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J02A",
                                        "UPPERCODE": "J02",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Antimykotika zur systemischen Anwendung",
                                        "CODE": "J02A",
                                        "NAME_SORT": "J02A"
                                    }
                                ],
                                "NAME": "Antimykotika zur systemischen Anwendung",
                                "CODE": "J02",
                                "NAME_SORT": "J02"
                            },
                            {
                                "CATALOGID": 17,
                                "NAME_SHORT": "J04",
                                "UPPERCODE": "J",
                                "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                "CHILD_LIST": [
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J04A",
                                        "UPPERCODE": "J04",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Mittel zur Behandlung der Tuberkulose",
                                        "CODE": "J04A",
                                        "NAME_SORT": "J04A"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J04B",
                                        "UPPERCODE": "J04",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Mittel zur Behandlung der Lepra",
                                        "CODE": "J04B",
                                        "NAME_SORT": "J04B"
                                    }
                                ],
                                "NAME": "Mittel gegen Mykobakterien",
                                "CODE": "J04",
                                "NAME_SORT": "J04"
                            },
                            {
                                "CATALOGID": 17,
                                "NAME_SHORT": "J05",
                                "UPPERCODE": "J",
                                "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                "CHILD_LIST": [
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J05A",
                                        "UPPERCODE": "J05",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Direkt wirkende Antivirale Mittel",
                                        "CODE": "J05A",
                                        "NAME_SORT": "J05A"
                                    }
                                ],
                                "NAME": "Antivirale Mittel zur systemischen Anwendung",
                                "CODE": "J05",
                                "NAME_SORT": "J05"
                            },
                            {
                                "CATALOGID": 17,
                                "NAME_SHORT": "J06",
                                "UPPERCODE": "J",
                                "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                "CHILD_LIST": [
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J06A",
                                        "UPPERCODE": "J06",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Immunsera",
                                        "CODE": "J06A",
                                        "NAME_SORT": "J06A"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J06B",
                                        "UPPERCODE": "J06",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Immunglobuline",
                                        "CODE": "J06B",
                                        "NAME_SORT": "J06B"
                                    }
                                ],
                                "NAME": "Immunsera und Immunglobuline",
                                "CODE": "J06",
                                "NAME_SORT": "J06"
                            },
                            {
                                "CATALOGID": 17,
                                "NAME_SHORT": "J07",
                                "UPPERCODE": "J",
                                "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                "CHILD_LIST": [
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J07A",
                                        "UPPERCODE": "J07",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Bakterielle Impfstoffe",
                                        "CODE": "J07A",
                                        "NAME_SORT": "J07A"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J07B",
                                        "UPPERCODE": "J07",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Virale Impfstoffe",
                                        "CODE": "J07B",
                                        "NAME_SORT": "J07B"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J07C",
                                        "UPPERCODE": "J07",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 1,
                                        "NAME": "Bakterielle und virale Impfstoffe, kombiniert",
                                        "CODE": "J07C",
                                        "NAME_SORT": "J07C"
                                    },
                                    {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J07X",
                                        "UPPERCODE": "J07",
                                        "PRODUCTEXISTINASSORTMENT_FLAG": 0,
                                        "NAME": "Andere Impfstoffe",
                                        "CODE": "J07X",
                                        "NAME_SORT": "J07X"
                                    }
                                ],
                                "NAME": "Impfstoffe",
                                "CODE": "J07",
                                "NAME_SORT": "J07"
                            }
                        ],
                        "NAME": "Antiinfektiva zur systemischen Anwendung",
                        "CODE": "J",
                        "NAME_SORT": "J"
                    },
                    expectedOutput: {
                        "name": "Antiinfektiva zur systemischen Anwendung",
                        "atcCode": "J",
                        "level": "AG",
                        "upperCode": "",
                        "children": [
                            {
                                "name": "Antibiotika zur systemischen Anwendung",
                                "atcCode": "J01",
                                "level": "TH",
                                "upperCode": "J",
                                "children": [
                                    {
                                        "name": "Tetracycline",
                                        "atcCode": "J01A",
                                        "level": "TPU",
                                        "upperCode": "J01",
                                        "children": []
                                    },
                                    {
                                        "name": "Amphenicole",
                                        "atcCode": "J01B",
                                        "level": "TPU",
                                        "upperCode": "J01",
                                        "children": []
                                    },
                                    {
                                        "name": "Betalactam-Antibiotika, Penicilline",
                                        "atcCode": "J01C",
                                        "level": "TPU",
                                        "upperCode": "J01",
                                        "children": []
                                    },
                                    {
                                        "name": "Andere Beta-Lactam-Antibiotika",
                                        "atcCode": "J01D",
                                        "level": "TPU",
                                        "upperCode": "J01",
                                        "children": []
                                    },
                                    {
                                        "name": "Sulfonamide und Trimethoprim",
                                        "atcCode": "J01E",
                                        "level": "TPU",
                                        "upperCode": "J01",
                                        "children": []
                                    },
                                    {
                                        "name": "Makrolide, Lincosamide und Streptogramine",
                                        "atcCode": "J01F",
                                        "level": "TPU",
                                        "upperCode": "J01",
                                        "children": []
                                    },
                                    {
                                        "name": "Aminoglykosid-Antibiotika",
                                        "atcCode": "J01G",
                                        "level": "TPU",
                                        "upperCode": "J01",
                                        "children": []
                                    },
                                    {
                                        "name": "Chinolone",
                                        "atcCode": "J01M",
                                        "level": "TPU",
                                        "upperCode": "J01",
                                        "children": []
                                    },
                                    {
                                        "name": "Kombinationen von Antibiotika",
                                        "atcCode": "J01R",
                                        "level": "TPU",
                                        "upperCode": "J01",
                                        "children": []
                                    },
                                    {
                                        "name": "Andere Antibiotika",
                                        "atcCode": "J01X",
                                        "level": "TPU",
                                        "upperCode": "J01",
                                        "children": []
                                    }
                                ]
                            },
                            {
                                "name": "Antimykotika zur systemischen Anwendung",
                                "atcCode": "J02",
                                "level": "TH",
                                "upperCode": "J",
                                "children": [
                                    {
                                        "name": "Antimykotika zur systemischen Anwendung",
                                        "atcCode": "J02A",
                                        "level": "TPU",
                                        "upperCode": "J02",
                                        "children": []
                                    }
                                ]
                            },
                            {
                                "name": "Mittel gegen Mykobakterien",
                                "atcCode": "J04",
                                "level": "TH",
                                "upperCode": "J",
                                "children": [
                                    {
                                        "name": "Mittel zur Behandlung der Tuberkulose",
                                        "atcCode": "J04A",
                                        "level": "TPU",
                                        "upperCode": "J04",
                                        "children": []
                                    },
                                    {
                                        "name": "Mittel zur Behandlung der Lepra",
                                        "atcCode": "J04B",
                                        "level": "TPU",
                                        "upperCode": "J04",
                                        "children": []
                                    }
                                ]
                            },
                            {
                                "name": "Antivirale Mittel zur systemischen Anwendung",
                                "atcCode": "J05",
                                "level": "TH",
                                "upperCode": "J",
                                "children": [
                                    {
                                        "name": "Direkt wirkende Antivirale Mittel",
                                        "atcCode": "J05A",
                                        "level": "TPU",
                                        "upperCode": "J05",
                                        "children": []
                                    }
                                ]
                            },
                            {
                                "name": "Immunsera und Immunglobuline",
                                "atcCode": "J06",
                                "level": "TH",
                                "upperCode": "J",
                                "children": [
                                    {
                                        "name": "Immunsera",
                                        "atcCode": "J06A",
                                        "level": "TPU",
                                        "upperCode": "J06",
                                        "children": []
                                    },
                                    {
                                        "name": "Immunglobuline",
                                        "atcCode": "J06B",
                                        "level": "TPU",
                                        "upperCode": "J06",
                                        "children": []
                                    }
                                ]
                            },
                            {
                                "name": "Impfstoffe",
                                "atcCode": "J07",
                                "upperCode": "J",
                                "level": "TH",
                                "children": [
                                    {
                                        "name": "Bakterielle Impfstoffe",
                                        "atcCode": "J07A",
                                        "level": "TPU",
                                        "upperCode": "J07",
                                        "children": []
                                    },
                                    {
                                        "name": "Virale Impfstoffe",
                                        "atcCode": "J07B",
                                        "level": "TPU",
                                        "upperCode": "J07",
                                        "children": []
                                    },
                                    {
                                        "name": "Bakterielle und virale Impfstoffe, kombiniert",
                                        "atcCode": "J07C",
                                        "level": "TPU",
                                        "upperCode": "J07",
                                        "children": []
                                    },
                                    {
                                        "name": "Andere Impfstoffe",
                                        "atcCode": "J07X",
                                        "level": "TPU",
                                        "upperCode": "J07",
                                        "children": []
                                    }
                                ]
                            }
                        ]
                    }
                }
            ];

            genericTester( testCases, _reduceTopDownATCCodeTree );

        } );

        it( 'should return a list of ATC codes', function() {

            const testCases = [
                {
                    input: [
                        {
                            "ID": 1395401,
                            "PRODUCTID": 13954,
                            "DIVISIBILITYTYPECODE": "E",
                            "DIVISIBLE2_FLAG": 1,
                            "DIVISIBLE_FLAG": 1,
                            "NAME": "1 Filmtbl.",
                            "DESCRIPTIONSPC": "Die Filmtablette ist mit einer Bruchrille versehen.",
                            "NAME_SORT": "00010",
                            "ATCCODE_LIST": [
                                {
                                    "CATALOGID": 17,
                                    "NAME_SHORT": "J01FA02",
                                    "UPPERCODE": "J01FA",
                                    "PARENT": {
                                        "CATALOGID": 17,
                                        "NAME_SHORT": "J01FA",
                                        "UPPERCODE": "J01F",
                                        "PARENT": {
                                            "CATALOGID": 17,
                                            "NAME_SHORT": "J01F",
                                            "UPPERCODE": "J01",
                                            "PARENT": {
                                                "CATALOGID": 17,
                                                "NAME_SHORT": "J01",
                                                "UPPERCODE": "J",
                                                "PARENT": {
                                                    "CATALOGID": 17,
                                                    "NAME_SHORT": "J",
                                                    "NAME": "Antiinfektiva zur systemischen Anwendung",
                                                    "CODE": "J",
                                                    "NAME_SORT": "J"
                                                },
                                                "NAME": "Antibiotika zur systemischen Anwendung",
                                                "CODE": "J01",
                                                "NAME_SORT": "J01"
                                            },
                                            "NAME": "Makrolide, Lincosamide und Streptogramine",
                                            "CODE": "J01F",
                                            "NAME_SORT": "J01F"
                                        },
                                        "NAME": "Makrolide",
                                        "CODE": "J01FA",
                                        "NAME_SORT": "J01FA"
                                    },
                                    "NAME": "Spiramycin",
                                    "CODE": "J01FA02",
                                    "NAME_SORT": "J01FA02"
                                }
                            ],
                            "BASECOUNT": 1,
                            "BREAKLINETYPECODE": "B",
                            "ITEMROACODE": "18",
                            "ITEMROA_LIST": [
                                "18"
                            ],
                            "PHARMFORMCODE": "014",
                            "IDENTA": {
                                "custom_FLAG": null
                            },
                            "COMPOSITIONELEMENTS_LIST": [
                                {
                                    "ID": 4589,
                                    "MASSFROM": 1.5,
                                    "MOLECULEID": 1401,
                                    "MOLECULENAME": "Spiramycin",
                                    "MOLECULETYPECODE": "A",
                                    "MOLECULEUNITCODE": "MIOIE"
                                },
                                {
                                    "ID": 168,
                                    "MOLECULEID": 1108,
                                    "MOLECULENAME": "Lactose",
                                    "MOLECULETYPECODE": "I"
                                },
                                {
                                    "ID": 1333,
                                    "MOLECULEID": 16655,
                                    "MOLECULENAME": "Weizenstärke",
                                    "MOLECULETYPECODE": "I"
                                },
                                {
                                    "ID": 155,
                                    "MOLECULEID": 25052,
                                    "MOLECULENAME": "Siliciumdioxid hydrat",
                                    "MOLECULETYPECODE": "I"
                                },
                                {
                                    "ID": 9,
                                    "MOLECULEID": 15923,
                                    "MOLECULENAME": "Magnesium stearat",
                                    "MOLECULETYPECODE": "I"
                                },
                                {
                                    "ID": 10,
                                    "MOLECULEID": 10122,
                                    "MOLECULENAME": "Hypromellose",
                                    "MOLECULETYPECODE": "I"
                                },
                                {
                                    "ID": 719,
                                    "MOLECULEID": 19691,
                                    "MOLECULENAME": "Macrogol 20.000",
                                    "MOLECULETYPECODE": "I"
                                }
                            ]
                        }
                    ],
                    expectedOutput: [
                        {
                            "name": "Spiramycin",
                            "atcCode": "J01FA02",
                            "upperCode": "J01FA",
                            "level": "CS"
                        },
                        {
                            "name": "Makrolide",
                            "atcCode": "J01FA",
                            "upperCode": "J01F",
                            "level": "CTPU"
                        },
                        {
                            "name": "Makrolide, Lincosamide und Streptogramine",
                            "atcCode": "J01F",
                            "upperCode": "J01",
                            "level": "TPU"
                        },
                        {
                            "name": "Antibiotika zur systemischen Anwendung",
                            "atcCode": "J01",
                            "upperCode": "J",
                            "level": "TH"
                        },
                        {
                            "name": "Antiinfektiva zur systemischen Anwendung",
                            "atcCode": "J",
                            "upperCode": "",
                            "level": "AG"
                        }
                    ]
                }
            ];

            genericTester( testCases, _mapATCCodeList );

        } );

        it( 'should return a ATC code level key name', function() {

            const testCases = [
                {
                    input: 'J01FA02',
                    expectedOutput: 'CS'
                },
                {
                    input: 'J01FA',
                    expectedOutput: 'CTPU'
                },
                {
                    input: 'J01F',
                    expectedOutput: 'TPU'
                },
                {
                    input: 'J01',
                    expectedOutput: 'TH'
                },
                {
                    input: 'J',
                    expectedOutput: 'AG'
                }
            ];

            genericTester( testCases, _getATCCodeLevelKey );

        } );

        it( 'should return an ICD10 code level key name', function() {

            const testCases = [
                {
                    input: {icd10Code: 'B58.0', upperCode: 'B58'},
                    expectedOutput: 'SUB'
                },
                {
                    input: {icd10Code: 'B58', upperCode: 'B50-B64'},
                    expectedOutput: 'CAT'
                },
                {
                    input: {icd10Code: 'B50-B64', upperCode: 'A00-B99'},
                    expectedOutput: 'GRP'
                },
                {
                    input: {icd10Code: 'A00-B99', upperCode: ''},
                    expectedOutput: 'CHP'
                },
                {
                    input: {icd10Code: 'Y92.39', upperCode: 'Y92'},
                    expectedOutput: 'LOC'
                },
                {
                    input: {icd10Code: 'S86.011', upperCode: 'S86'},
                    expectedOutput: 'SPL'
                },
                {
                    input: {icd10Code: 'S86.011D', upperCode: 'S86'},
                    expectedOutput: 'EXT'
                }
            ];

            genericTester( testCases, _getICD10CodeLevelKey );

        } );

        it( 'should merge mmi-api (inSuite module) and drug objects in the drug schema structure', function() {

            const testCases = [
                {
                    input: {
                        phDrugs: [
                            {
                                "phAtc": [],
                                "phAtcDisplay": [],
                                "phIcons": [
                                    {
                                        "src": "AM",
                                        "title": "Arzneimittel"
                                    },
                                    {
                                        "src": "RP",
                                        "title": "Verschreibungspflichtig"
                                    },
                                    {
                                        "src": "SCHW",
                                        "title": "Hinweise zu Schwangerschaft beachten"
                                    },
                                    {
                                        "src": "STILL",
                                        "title": "Hinweise zu Stillzeit beachten"
                                    },
                                    {
                                        "src": "TL2",
                                        "title": "In 2 Teile teilbar"
                                    },
                                    {
                                        "src": "TLGD",
                                        "title": "In gleiche Teile teilbar"
                                    }
                                ],
                                "phIngr": [],
                                "phIngrOther": [],
                                "phEqual": [],
                                "phIdenta": [],
                                "phAMRText": [],
                                "id": 13954,
                                "title": "Rovamycine® 1 500 000 I.E. Filmtbl.",
                                "userContent": "Rovamycine® 1 500 000 I.E. Filmtbl.",
                                "phTer": false,
                                "phTrans": false,
                                "phImport": false,
                                "phNegative": false,
                                "phLifeStyle": false,
                                "phLifeStyleCond": false,
                                "phGBA": false,
                                "phDisAgr": false,
                                "phDisAgrAlt": false,
                                "phMed": false,
                                "phPrescMed": false,
                                "phCompany": "Teofarma S.R.I. Fabio Ferrara",
                                "phOTC": false,
                                "phOnly": false,
                                "phRecipeOnly": true,
                                "phBTM": false,
                                "original": {
                                    "text_SPC_ORIGINAL_ID": null,
                                    "text_ATCTEXT_ID": null,
                                    "ID": 13954,
                                    "LIFESTYLE_FLAG": 0,
                                    "IMPORT_FLAG": 0,
                                    "COMPANYNAME": "Teofarma S.R.I. Fabio Ferrara",
                                    "CUSTOM_FLAG": 0,
                                    "ACTIVESUBSTANCE_COUNT": 1,
                                    "EXCEPTIONLIST_FLAG": 0,
                                    "MEDICINEPRODUCT_FLAG": 0,
                                    "MEDICINEPRODUCTEXCEPTION_FLAG": 0,
                                    "OTC_FLAG": 0,
                                    "TEXT_SPC_ID": 194138,
                                    "COMPANYSALE_LIST": [],
                                    "IDENTAPICTURE_FLAG": 0,
                                    "OTX_FLAG": 0,
                                    "BALANCEDDIETETICSADD_FLAG": 0,
                                    "COSMETICS_FLAG": 0,
                                    "DIETARYSUPPLEMENT_FLAG": 0,
                                    "BANDAGE_FLAG": 0,
                                    "DIPSTIC_FLAG": 0,
                                    "ADJUVANT_FLAG": 0,
                                    "DISPENSINGTYPECODE": "2",
                                    "HOMOEOPATHIC_FLAG": 0,
                                    "NAME": "Rovamycine® 1 500 000 I.E. Filmtbl.",
                                    "NEGATIVE_FLAG": 0,
                                    "PHARMACEUTICAL_FLAG": 1,
                                    "TRANSFUSIONLAW_FLAG": 0,
                                    "ANIMALPHARMACEUTICAL_FLAG": 0,
                                    "ANTHROPOSOPHIC_FLAG": 0,
                                    "COMPANYID": 13520,
                                    "DIETETICS_FLAG": 0,
                                    "HERBAL_FLAG": 0,
                                    "ICD10CODE_LIST": [
                                        {
                                            "CATALOGID": 18,
                                            "NAME_SHORT": "B58.0",
                                            "UPPERCODE": "B58",
                                            "PARENT": {
                                                "CATALOGID": 18,
                                                "NAME_SHORT": "B58",
                                                "UPPERCODE": "B50-B64",
                                                "PARENT": {
                                                    "CATALOGID": 18,
                                                    "NAME_SHORT": "B50-B64",
                                                    "UPPERCODE": "A00-B99",
                                                    "PARENT": {
                                                        "CATALOGID": 18,
                                                        "NAME_SHORT": "A00-B99",
                                                        "NAME": "Bestimmte infektiöse und parasitäre Krankheiten",
                                                        "CODE": "A00-B99",
                                                        "NAME_SORT": "A00-B99"
                                                    },
                                                    "NAME": "Protozoenkrankheiten",
                                                    "CODE": "B50-B64",
                                                    "NAME_SORT": "B50-B64"
                                                },
                                                "NAME": "Toxoplasmose",
                                                "CODE": "B58",
                                                "NAME_SORT": "B58"
                                            },
                                            "NAME": "Augenerkrankung durch Toxoplasmen",
                                            "CODE": "B58.0",
                                            "NAME_SORT": "B58.0"
                                        },
                                        {
                                            "CATALOGID": 18,
                                            "NAME_SHORT": "B58.9",
                                            "UPPERCODE": "B58",
                                            "PARENT": {
                                                "CATALOGID": 18,
                                                "NAME_SHORT": "B58",
                                                "UPPERCODE": "B50-B64",
                                                "PARENT": {
                                                    "CATALOGID": 18,
                                                    "NAME_SHORT": "B50-B64",
                                                    "UPPERCODE": "A00-B99",
                                                    "PARENT": {
                                                        "CATALOGID": 18,
                                                        "NAME_SHORT": "A00-B99",
                                                        "NAME": "Bestimmte infektiöse und parasitäre Krankheiten",
                                                        "CODE": "A00-B99",
                                                        "NAME_SORT": "A00-B99"
                                                    },
                                                    "NAME": "Protozoenkrankheiten",
                                                    "CODE": "B50-B64",
                                                    "NAME_SORT": "B50-B64"
                                                },
                                                "NAME": "Toxoplasmose",
                                                "CODE": "B58",
                                                "NAME_SORT": "B58"
                                            },
                                            "NAME": "Toxoplasmose, nicht näher bezeichnet",
                                            "CODE": "B58.9",
                                            "NAME_SORT": "B58.9"
                                        },
                                        {
                                            "CATALOGID": 18,
                                            "NAME_SHORT": "J06.8",
                                            "UPPERCODE": "J06",
                                            "PARENT": {
                                                "CATALOGID": 18,
                                                "NAME_SHORT": "J06",
                                                "UPPERCODE": "J00-J06",
                                                "PARENT": {
                                                    "CATALOGID": 18,
                                                    "NAME_SHORT": "J00-J06",
                                                    "UPPERCODE": "J00-J99",
                                                    "PARENT": {
                                                        "CATALOGID": 18,
                                                        "NAME_SHORT": "J00-J99",
                                                        "NAME": "Krankheiten des Atmungssystems",
                                                        "CODE": "J00-J99",
                                                        "NAME_SORT": "J00-J99"
                                                    },
                                                    "NAME": "Akute Infektionen der oberen Atemwege",
                                                    "CODE": "J00-J06",
                                                    "NAME_SORT": "J00-J06"
                                                },
                                                "NAME": "Akute Infektionen an mehreren oder nicht näher bezeichneten Lokalisationen der oberen Atemwege",
                                                "CODE": "J06",
                                                "NAME_SORT": "J06"
                                            },
                                            "NAME": "Sonstige akute Infektionen an mehreren Lokalisationen der oberen Atemwege",
                                            "CODE": "J06.8",
                                            "NAME_SORT": "J06.8"
                                        },
                                        {
                                            "CATALOGID": 18,
                                            "NAME_SHORT": "O35.8",
                                            "UPPERCODE": "O35",
                                            "PARENT": {
                                                "CATALOGID": 18,
                                                "NAME_SHORT": "O35",
                                                "UPPERCODE": "O30-O48",
                                                "PARENT": {
                                                    "CATALOGID": 18,
                                                    "NAME_SHORT": "O30-O48",
                                                    "UPPERCODE": "O00-O99",
                                                    "PARENT": {
                                                        "CATALOGID": 18,
                                                        "NAME_SHORT": "O00-O99",
                                                        "NAME": "Schwangerschaft, Geburt und Wochenbett",
                                                        "CODE": "O00-O99",
                                                        "NAME_SORT": "O00-O99"
                                                    },
                                                    "NAME": "Betreuung der Mutter im Hinblick auf den Fetus und die Amnionhöhle sowie mögliche Entbindungskomplikationen",
                                                    "CODE": "O30-O48",
                                                    "NAME_SORT": "O30-O48"
                                                },
                                                "NAME": "Betreuung der Mutter bei festgestellter oder vermuteter Anomalie oder Schädigung des Fetus",
                                                "CODE": "O35",
                                                "NAME_SORT": "O35"
                                            },
                                            "NAME": "Betreuung der Mutter bei (Verdacht auf) sonstige Anomalie oder Schädigung des Fetus",
                                            "CODE": "O35.8",
                                            "NAME_SORT": "O35.8"
                                        }
                                    ],
                                    "ICONCODE_LIST": [
                                        "AM",
                                        "RP",
                                        "SCHW",
                                        "STILL",
                                        "TL2",
                                        "TLGD"
                                    ],
                                    "NAME_HTML": "Rovamycine® 1 500 000 I.E. Filmtbl.",
                                    "NAME_SORT": "ROVAMYCINE 00001 00500 00000 I.E. FILMTBL.",
                                    "PHYTOPHARMACEUTICAL_FLAG": 0,
                                    "PRISCUS_FLAG": 0,
                                    "RECIPET_FLAG": 0,
                                    "PACKAGE_LIST": [
                                        {
                                            "ID": 11233,
                                            "CUSTOM_FLAG": 0,
                                            "SALESSTATUSCODE": "N",
                                            "SIZE_AMOUNT": 30,
                                            "SIZE_NORMSIZECODE": "2",
                                            "SIZE_UNITCODE": "st",
                                            "PZN": "08645877",
                                            "PRICE_PATIENTPAYMENT": 6.23,
                                            "PRICE_PHARMACYBUY": 42.56,
                                            "PRICE_PHARMACYSALE": 62.3,
                                            "ONMARKETDATE": 895183200000,
                                            "PATIENTPAYMENTHINT": "AVP>=50,00 => ZuZa=AVP/10=6,23",
                                            "NAME": "Rovamycine® 1 500 000 I.E. 30 Filmtbl. N2",
                                            "NAME_SORT": "00010"
                                        }
                                    ],
                                    "ITEM_LIST": [
                                        {
                                            "ID": 1395401,
                                            "PRODUCTID": 13954,
                                            "DIVISIBILITYTYPECODE": "E",
                                            "DIVISIBLE2_FLAG": 1,
                                            "DIVISIBLE_FLAG": 1,
                                            "NAME": "1 Filmtbl.",
                                            "DESCRIPTIONSPC": "Die Filmtablette ist mit einer Bruchrille versehen.",
                                            "NAME_SORT": "00010",
                                            "ATCCODE_LIST": [
                                                {
                                                    "CATALOGID": 17,
                                                    "NAME_SHORT": "J01FA02",
                                                    "UPPERCODE": "J01FA",
                                                    "PARENT": {
                                                        "CATALOGID": 17,
                                                        "NAME_SHORT": "J01FA",
                                                        "UPPERCODE": "J01F",
                                                        "PARENT": {
                                                            "CATALOGID": 17,
                                                            "NAME_SHORT": "J01F",
                                                            "UPPERCODE": "J01",
                                                            "PARENT": {
                                                                "CATALOGID": 17,
                                                                "NAME_SHORT": "J01",
                                                                "UPPERCODE": "J",
                                                                "PARENT": {
                                                                    "CATALOGID": 17,
                                                                    "NAME_SHORT": "J",
                                                                    "NAME": "Antiinfektiva zur systemischen Anwendung",
                                                                    "CODE": "J",
                                                                    "NAME_SORT": "J"
                                                                },
                                                                "NAME": "Antibiotika zur systemischen Anwendung",
                                                                "CODE": "J01",
                                                                "NAME_SORT": "J01"
                                                            },
                                                            "NAME": "Makrolide, Lincosamide und Streptogramine",
                                                            "CODE": "J01F",
                                                            "NAME_SORT": "J01F"
                                                        },
                                                        "NAME": "Makrolide",
                                                        "CODE": "J01FA",
                                                        "NAME_SORT": "J01FA"
                                                    },
                                                    "NAME": "Spiramycin",
                                                    "CODE": "J01FA02",
                                                    "NAME_SORT": "J01FA02"
                                                }
                                            ],
                                            "BASECOUNT": 1,
                                            "BREAKLINETYPECODE": "B",
                                            "ITEMROACODE": "18",
                                            "ITEMROA_LIST": [
                                                "18"
                                            ],
                                            "PHARMFORMCODE": "014",
                                            "IDENTA": {
                                                "custom_FLAG": null
                                            },
                                            "COMPOSITIONELEMENTS_LIST": [
                                                {
                                                    "ID": 4589,
                                                    "MASSFROM": 1.5,
                                                    "MOLECULEID": 1401,
                                                    "MOLECULENAME": "Spiramycin",
                                                    "MOLECULETYPECODE": "A",
                                                    "MOLECULEUNITCODE": "MIOIE"
                                                },
                                                {
                                                    "ID": 168,
                                                    "MOLECULEID": 1108,
                                                    "MOLECULENAME": "Lactose",
                                                    "MOLECULETYPECODE": "I"
                                                },
                                                {
                                                    "ID": 1333,
                                                    "MOLECULEID": 16655,
                                                    "MOLECULENAME": "Weizenstärke",
                                                    "MOLECULETYPECODE": "I"
                                                },
                                                {
                                                    "ID": 155,
                                                    "MOLECULEID": 25052,
                                                    "MOLECULENAME": "Siliciumdioxid hydrat",
                                                    "MOLECULETYPECODE": "I"
                                                },
                                                {
                                                    "ID": 9,
                                                    "MOLECULEID": 15923,
                                                    "MOLECULENAME": "Magnesium stearat",
                                                    "MOLECULETYPECODE": "I"
                                                },
                                                {
                                                    "ID": 10,
                                                    "MOLECULEID": 10122,
                                                    "MOLECULENAME": "Hypromellose",
                                                    "MOLECULETYPECODE": "I"
                                                },
                                                {
                                                    "ID": 719,
                                                    "MOLECULEID": 19691,
                                                    "MOLECULENAME": "Macrogol 20.000",
                                                    "MOLECULETYPECODE": "I"
                                                }
                                            ]
                                        }
                                    ],
                                    "ADDITIONALFLAGS": [
                                        {
                                            "VALUE": "0",
                                            "NAME": "CHEMICAL_FLAG"
                                        },
                                        {
                                            "VALUE": "0",
                                            "NAME": "CONTRACEPTIVE_FLAG"
                                        },
                                        {
                                            "VALUE": "0",
                                            "NAME": "BIOCIDAL_FLAG"
                                        },
                                        {
                                            "VALUE": "0",
                                            "NAME": "PLANTPROTECTIVE_FLAG"
                                        },
                                        {
                                            "VALUE": "N",
                                            "NAME": "FOODTYPECODE"
                                        },
                                        {
                                            "VALUE": "0",
                                            "NAME": "MEDIAOBJECT_FLAG"
                                        }
                                    ],
                                    "amr": []
                                },
                                "phForm": "Filmtbl.",
                                "phOTX": false,
                                "phAMR": []
                            }],
                        drugs: [
                            {
                                "icd10CodeList": [
                                    {
                                        "name": "Augenerkrankung durch Toxoplasmen",
                                        "icd10Code": "B58.0",
                                        "upperCode": "B58",
                                        "level": "SUB"
                                    },
                                    {
                                        "name": "Toxoplasmose",
                                        "icd10Code": "B58",
                                        "upperCode": "B50-B64",
                                        "level": "CAT"
                                    },
                                    {
                                        "name": "Protozoenkrankheiten",
                                        "icd10Code": "B50-B64",
                                        "upperCode": "A00-B99",
                                        "level": "GRP"
                                    },
                                    {
                                        "name": "Bestimmte infektiöse und parasitäre Krankheiten",
                                        "icd10Code": "A00-B99",
                                        "upperCode": "",
                                        "level": "CHP"
                                    },
                                    {
                                        "name": "Toxoplasmose, nicht näher bezeichnet",
                                        "icd10Code": "B58.9",
                                        "upperCode": "B58",
                                        "level": "SUB"
                                    },
                                    {
                                        "name": "Toxoplasmose",
                                        "icd10Code": "B58",
                                        "upperCode": "B50-B64",
                                        "level": "CAT"
                                    },
                                    {
                                        "name": "Protozoenkrankheiten",
                                        "icd10Code": "B50-B64",
                                        "upperCode": "A00-B99",
                                        "level": "GRP"
                                    },
                                    {
                                        "name": "Bestimmte infektiöse und parasitäre Krankheiten",
                                        "icd10Code": "A00-B99",
                                        "upperCode": "",
                                        "level": "CHP"
                                    },
                                    {
                                        "name": "Sonstige akute Infektionen an mehreren Lokalisationen der oberen Atemwege",
                                        "icd10Code": "J06.8",
                                        "upperCode": "J06",
                                        "level": "SUB"
                                    },
                                    {
                                        "name": "Akute Infektionen an mehreren oder nicht näher bezeichneten Lokalisationen der oberen Atemwege",
                                        "icd10Code": "J06",
                                        "upperCode": "J00-J06",
                                        "level": "CAT"
                                    },
                                    {
                                        "name": "Akute Infektionen der oberen Atemwege",
                                        "icd10Code": "J00-J06",
                                        "upperCode": "J00-J99",
                                        "level": "GRP"
                                    },
                                    {
                                        "name": "Krankheiten des Atmungssystems",
                                        "icd10Code": "J00-J99",
                                        "upperCode": "",
                                        "level": "CHP"
                                    },
                                    {
                                        "name": "Betreuung der Mutter bei (Verdacht auf) sonstige Anomalie oder Schädigung des Fetus",
                                        "icd10Code": "O35.8",
                                        "upperCode": "O35",
                                        "level": "SUB"
                                    },
                                    {
                                        "name": "Betreuung der Mutter bei festgestellter oder vermuteter Anomalie oder Schädigung des Fetus",
                                        "icd10Code": "O35",
                                        "upperCode": "O30-O48",
                                        "level": "CAT"
                                    },
                                    {
                                        "name": "Betreuung der Mutter im Hinblick auf den Fetus und die Amnionhöhle sowie mögliche Entbindungskomplikationen",
                                        "icd10Code": "O30-O48",
                                        "upperCode": "O00-O99",
                                        "level": "GRP"
                                    },
                                    {
                                        "name": "Schwangerschaft, Geburt und Wochenbett",
                                        "icd10Code": "O00-O99",
                                        "upperCode": "",
                                        "level": "CHP"
                                    }
                                ],
                                "name": "Rovamycine® 1 500 000 I.E. Filmtbl.",
                                "company": "Teofarma S.R.I. Fabio Ferrara",
                                "divisibility": "DIVISIBLE2",
                                "actCode": "J01FA02",
                                "atcCodeList": [
                                    {
                                        "name": "Spiramycin",
                                        "atcCode": "J01FA02",
                                        "upperCode": "J01FA",
                                        "level": "CS"
                                    },
                                    {
                                        "name": "Makrolide",
                                        "atcCode": "J01FA",
                                        "upperCode": "J01F",
                                        "level": "CTPU"
                                    },
                                    {
                                        "name": "Makrolide, Lincosamide und Streptogramine",
                                        "atcCode": "J01F",
                                        "upperCode": "J01",
                                        "level": "TPU"
                                    },
                                    {
                                        "name": "Antibiotika zur systemischen Anwendung",
                                        "atcCode": "J01",
                                        "upperCode": "J",
                                        "level": "TH"
                                    },
                                    {
                                        "name": "Antiinfektiva zur systemischen Anwendung",
                                        "atcCode": "J",
                                        "upperCode": "",
                                        "level": "AG"
                                    }
                                ],
                                "packageList": [
                                    {
                                        "pzn": "08645877",
                                        "pznOriginal": "",
                                        "name": "Rovamycine® 1 500 000 I.E. 30 Filmtbl. N2",
                                        "quantity": 30,
                                        "prices": {
                                            "pricePatientPayment": 6.23,
                                            "pricePharmacyBuy": 42.56,
                                            "pricePharmacySale": 62.3
                                        }
                                    }
                                ],
                                "moleculeList": [
                                    {
                                        "name": "Spiramycin",
                                        "moleculeTypeCode": "A",
                                        "ingredientCode": [
                                            {
                                                "type": "MOLECULEID",
                                                "value": 1401
                                            }
                                        ],
                                        "strengthValue": "1,50",
                                        "strengthUnitCode": "MIOIE"
                                    },
                                    {
                                        "name": "Lactose",
                                        "moleculeTypeCode": "I",
                                        "ingredientCode": [
                                            {
                                                "type": "MOLECULEID",
                                                "value": 1108
                                            }
                                        ],
                                        "strengthValue": "",
                                        "strengthUnitCode": ""
                                    },
                                    {
                                        "name": "Weizenstärke",
                                        "moleculeTypeCode": "I",
                                        "ingredientCode": [
                                            {
                                                "type": "MOLECULEID",
                                                "value": 16655
                                            }
                                        ],
                                        "strengthValue": "",
                                        "strengthUnitCode": ""
                                    },
                                    {
                                        "name": "Siliciumdioxid hydrat",
                                        "moleculeTypeCode": "I",
                                        "ingredientCode": [
                                            {
                                                "type": "MOLECULEID",
                                                "value": 25052
                                            }
                                        ],
                                        "strengthValue": "",
                                        "strengthUnitCode": ""
                                    },
                                    {
                                        "name": "Magnesium stearat",
                                        "moleculeTypeCode": "I",
                                        "ingredientCode": [
                                            {
                                                "type": "MOLECULEID",
                                                "value": 15923
                                            }
                                        ],
                                        "strengthValue": "",
                                        "strengthUnitCode": ""
                                    },
                                    {
                                        "name": "Hypromellose",
                                        "moleculeTypeCode": "I",
                                        "ingredientCode": [
                                            {
                                                "type": "MOLECULEID",
                                                "value": 10122
                                            }
                                        ],
                                        "strengthValue": "",
                                        "strengthUnitCode": ""
                                    },
                                    {
                                        "name": "Macrogol 20.000",
                                        "moleculeTypeCode": "I",
                                        "ingredientCode": [
                                            {
                                                "type": "MOLECULEID",
                                                "value": 19691
                                            }
                                        ],
                                        "strengthValue": "",
                                        "strengthUnitCode": ""
                                    }
                                ]
                            }]
                    },
                    expectedOutput: [
                        {
                            "icd10CodeList": [
                                {
                                    "name": "Augenerkrankung durch Toxoplasmen",
                                    "icd10Code": "B58.0",
                                    "upperCode": "B58",
                                    "level": "SUB"
                                },
                                {
                                    "name": "Toxoplasmose",
                                    "icd10Code": "B58",
                                    "upperCode": "B50-B64",
                                    "level": "CAT"
                                },
                                {
                                    "name": "Protozoenkrankheiten",
                                    "icd10Code": "B50-B64",
                                    "upperCode": "A00-B99",
                                    "level": "GRP"
                                },
                                {
                                    "name": "Bestimmte infektiöse und parasitäre Krankheiten",
                                    "icd10Code": "A00-B99",
                                    "upperCode": "",
                                    "level": "CHP"
                                },
                                {
                                    "name": "Toxoplasmose, nicht näher bezeichnet",
                                    "icd10Code": "B58.9",
                                    "upperCode": "B58",
                                    "level": "SUB"
                                },
                                {
                                    "name": "Toxoplasmose",
                                    "icd10Code": "B58",
                                    "upperCode": "B50-B64",
                                    "level": "CAT"
                                },
                                {
                                    "name": "Protozoenkrankheiten",
                                    "icd10Code": "B50-B64",
                                    "upperCode": "A00-B99",
                                    "level": "GRP"
                                },
                                {
                                    "name": "Bestimmte infektiöse und parasitäre Krankheiten",
                                    "icd10Code": "A00-B99",
                                    "upperCode": "",
                                    "level": "CHP"
                                },
                                {
                                    "name": "Sonstige akute Infektionen an mehreren Lokalisationen der oberen Atemwege",
                                    "icd10Code": "J06.8",
                                    "upperCode": "J06",
                                    "level": "SUB"
                                },
                                {
                                    "name": "Akute Infektionen an mehreren oder nicht näher bezeichneten Lokalisationen der oberen Atemwege",
                                    "icd10Code": "J06",
                                    "upperCode": "J00-J06",
                                    "level": "CAT"
                                },
                                {
                                    "name": "Akute Infektionen der oberen Atemwege",
                                    "icd10Code": "J00-J06",
                                    "upperCode": "J00-J99",
                                    "level": "GRP"
                                },
                                {
                                    "name": "Krankheiten des Atmungssystems",
                                    "icd10Code": "J00-J99",
                                    "upperCode": "",
                                    "level": "CHP"
                                },
                                {
                                    "name": "Betreuung der Mutter bei (Verdacht auf) sonstige Anomalie oder Schädigung des Fetus",
                                    "icd10Code": "O35.8",
                                    "upperCode": "O35",
                                    "level": "SUB"
                                },
                                {
                                    "name": "Betreuung der Mutter bei festgestellter oder vermuteter Anomalie oder Schädigung des Fetus",
                                    "icd10Code": "O35",
                                    "upperCode": "O30-O48",
                                    "level": "CAT"
                                },
                                {
                                    "name": "Betreuung der Mutter im Hinblick auf den Fetus und die Amnionhöhle sowie mögliche Entbindungskomplikationen",
                                    "icd10Code": "O30-O48",
                                    "upperCode": "O00-O99",
                                    "level": "GRP"
                                },
                                {
                                    "name": "Schwangerschaft, Geburt und Wochenbett",
                                    "icd10Code": "O00-O99",
                                    "upperCode": "",
                                    "level": "CHP"
                                }
                            ],
                            "name": "Rovamycine® 1 500 000 I.E. Filmtbl.",
                            "company": "Teofarma S.R.I. Fabio Ferrara",
                            "divisibility": "DIVISIBLE2",
                            "formAbbreviation": "Filmtbl.",
                            "signetIcons": [
                                {
                                    "src": "/static/dcbaseapp/assets/img/MMI/signets/AM.png",
                                    "title": "Arzneimittel"
                                },
                                {
                                    "src": "/static/dcbaseapp/assets/img/MMI/signets/RP.png",
                                    "title": "Verschreibungspflichtig"
                                },
                                {
                                    "src": "/static/dcbaseapp/assets/img/MMI/signets/SCHW.png",
                                    "title": "Hinweise zu Schwangerschaft beachten"
                                },
                                {
                                    "src": "/static/dcbaseapp/assets/img/MMI/signets/STILL.png",
                                    "title": "Hinweise zu Stillzeit beachten"
                                },
                                {
                                    "src": "/static/dcbaseapp/assets/img/MMI/signets/TL2.png",
                                    "title": "In 2 Teile teilbar"
                                },
                                {
                                    "src": "/static/dcbaseapp/assets/img/MMI/signets/TLGD.png",
                                    "title": "In gleiche Teile teilbar"
                                }
                            ],
                            "actCode": "J01FA02",
                            "atcCodeList": [
                                {
                                    "name": "Spiramycin",
                                    "atcCode": "J01FA02",
                                    "upperCode": "J01FA",
                                    "level": "CS"
                                },
                                {
                                    "name": "Makrolide",
                                    "atcCode": "J01FA",
                                    "upperCode": "J01F",
                                    "level": "CTPU"
                                },
                                {
                                    "name": "Makrolide, Lincosamide und Streptogramine",
                                    "atcCode": "J01F",
                                    "upperCode": "J01",
                                    "level": "TPU"
                                },
                                {
                                    "name": "Antibiotika zur systemischen Anwendung",
                                    "atcCode": "J01",
                                    "upperCode": "J",
                                    "level": "TH"
                                },
                                {
                                    "name": "Antiinfektiva zur systemischen Anwendung",
                                    "atcCode": "J",
                                    "upperCode": "",
                                    "level": "AG"
                                }
                            ],
                            "packageList": [
                                {
                                    "pzn": "08645877",
                                    "pznOriginal": "",
                                    "name": "Rovamycine® 1 500 000 I.E. 30 Filmtbl. N2",
                                    "quantity": 30,
                                    "prices": {
                                        "pricePatientPayment": 6.23,
                                        "pricePharmacyBuy": 42.56,
                                        "pricePharmacySale": 62.3
                                    }
                                }
                            ],
                            "moleculeList": [
                                {
                                    "name": "Spiramycin",
                                    "moleculeTypeCode": "A",
                                    "ingredientCode": [
                                        {
                                            "type": "MOLECULEID",
                                            "value": 1401
                                        }
                                    ],
                                    "strengthValue": "1,50",
                                    "strengthUnitCode": "MIOIE"
                                },
                                {
                                    "name": "Lactose",
                                    "moleculeTypeCode": "I",
                                    "ingredientCode": [
                                        {
                                            "type": "MOLECULEID",
                                            "value": 1108
                                        }
                                    ],
                                    "strengthValue": "",
                                    "strengthUnitCode": ""
                                },
                                {
                                    "name": "Weizenstärke",
                                    "moleculeTypeCode": "I",
                                    "ingredientCode": [
                                        {
                                            "type": "MOLECULEID",
                                            "value": 16655
                                        }
                                    ],
                                    "strengthValue": "",
                                    "strengthUnitCode": ""
                                },
                                {
                                    "name": "Siliciumdioxid hydrat",
                                    "moleculeTypeCode": "I",
                                    "ingredientCode": [
                                        {
                                            "type": "MOLECULEID",
                                            "value": 25052
                                        }
                                    ],
                                    "strengthValue": "",
                                    "strengthUnitCode": ""
                                },
                                {
                                    "name": "Magnesium stearat",
                                    "moleculeTypeCode": "I",
                                    "ingredientCode": [
                                        {
                                            "type": "MOLECULEID",
                                            "value": 15923
                                        }
                                    ],
                                    "strengthValue": "",
                                    "strengthUnitCode": ""
                                },
                                {
                                    "name": "Hypromellose",
                                    "moleculeTypeCode": "I",
                                    "ingredientCode": [
                                        {
                                            "type": "MOLECULEID",
                                            "value": 10122
                                        }
                                    ],
                                    "strengthValue": "",
                                    "strengthUnitCode": ""
                                },
                                {
                                    "name": "Macrogol 20.000",
                                    "moleculeTypeCode": "I",
                                    "ingredientCode": [
                                        {
                                            "type": "MOLECULEID",
                                            "value": 19691
                                        }
                                    ],
                                    "strengthValue": "",
                                    "strengthUnitCode": ""
                                }
                            ],
                            "isTeratogen": false,
                            "isTransfusion": false,
                            "isReImport": false,
                            "isInNegative": false,
                            "isLifestyleDrug": false,
                            "isConditionalLifeStyleDrug": false,
                            "isGBATherapyAdvice": false,
                            "isDiscountAgreement": false,
                            "isAltDiscountAgreement": false,
                            "isMedProduct": false,
                            "isPrescMed": false,
                            "isOTC": false,
                            "isPharmacyOnly": false,
                            "isRecipeOnly": true,
                            "isBTM": false
                        }]
                }
            ];

            genericTester( testCases, _mergeDrugsWithPhDrugs );

        } );
    } );
} );
