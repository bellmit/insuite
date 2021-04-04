/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'moj2687-binder-index', function( Y, NAME ) {
    'use strict';

    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,

        dummyData = [
            {
                original: {
                    "activity.content": "Ibuprofen - 1 A Pharma® 20 mg/ml Suspension zum Einnehmen",
                    "activity.phMed": false,
                    "activity.phDisAgrAlt": false,
                    "activity.phDisAgr": false,
                    "activity.phGBA": false,
                    "activity.phAMR": false,
                    "activity.phLifeStyle": false,
                    "activity.phNegative": false,
                    "activity.phImport": false,
                    "activity.phTrans": false,
                    "activity.phTer": false,
                    "activity.phOnly": true,
                    "activity.phAtc": [
                        "M01AE01"
                    ],
                    "activity.phIngr": [
                        {
                            "code": 20036,
                            "_id": "54490fb860a8bc460dae00a0",
                            "name": "Ibuprofen (100 mg)"
                        },
                        {
                            "code": 220,
                            "_id": "54490fb860a8bc460dae009f",
                            "name": "Natriumbenzoat"
                        },
                        {
                            "code": 45,
                            "_id": "54490fb860a8bc460dae009e",
                            "name": "Citronensäure"
                        },
                        {
                            "code": 44,
                            "_id": "54490fb860a8bc460dae009d",
                            "name": "Natriumcitrat"
                        },
                        {
                            "code": 147,
                            "_id": "54490fb860a8bc460dae009c",
                            "name": "Saccharin-Natrium"
                        },
                        {
                            "code": 2,
                            "_id": "54490fb860a8bc460dae009b",
                            "name": "Natriumchlorid"
                        },
                        {
                            "code": 10,
                            "_id": "54490fb860a8bc460dae009a",
                            "name": "Hypromellose"
                        },
                        {
                            "code": 154,
                            "_id": "54490fb860a8bc460dae0099",
                            "name": "Xanthan-Gummi"
                        },
                        {
                            "code": 43063,
                            "_id": "54490fb860a8bc460dae0098",
                            "name": "Maltitollösung (2.5 g)"
                        },
                        {
                            "code": 219,
                            "_id": "54490fb860a8bc460dae0097",
                            "name": "Glycerol"
                        },
                        {
                            "code": 3488,
                            "_id": "54490fb860a8bc460dae0096",
                            "name": "Erdbeer-Aroma"
                        },
                        {
                            "code": 22,
                            "_id": "54490fb860a8bc460dae0095",
                            "name": "Wasser, ger."
                        }
                    ],
                    "activity.phFixedPay": undefined,
                    "activity.phPatPay": 3.32,
                    "activity.phPriceSale": 3.32,
                    "activity.phPackSize": "200 ml",
                    "activity.phForm": "Susp. z. Einnehmen",
                    "activity.phCompany": "1 A Pharma GmbH",
                    "activity.phPZN": "01865570",
                    "activity.phBTM": false,
                    "activity.phLifeStyleCond": false,
                    "activity.phNLabel": "Ibuprofen-1 A Pharma 20mg/ml Susp z Einn. 100ml N1",
                    "activity.phOTC": false,
                    "activity.phOTX": true,
                    "activity.phRecipeOnly": false,
                    "activity.phRefund": 0
                },
                updated: {
                    "activity.content": "Ibuprofen - 1 A Pharma® 20 mg/ml Suspension zum Einnehmen",
                    "activity.phMed": false,
                    "activity.phDisAgrAlt": false,
                    "activity.phDisAgr": false,
                    "activity.phGBA": false,
                    "activity.phAMR": false,
                    "activity.phNegative": false,
                    "activity.phImport": false,
                    "activity.phTrans": false,
                    "activity.phTer": false,
                    "activity.phOnly": true,
                    "activity.phAtc": [
                        "M01AE01"
                    ],
                    "activity.phIngr": [
                        {
                            "code": 20036,
                            "_id": "54490fb860a8bc460dae00a0",
                            "name": "Ibuprofen (100 mg)"
                        },
                        {
                            "code": 220,
                            "_id": "54490fb860a8bc460dae009f",
                            "name": "Natriumbenzoat"
                        },
                        {
                            "code": 45,
                            "_id": "54490fb860a8bc460dae009e",
                            "name": "Citronensäure"
                        },
                        {
                            "code": 44,
                            "_id": "54490fb860a8bc460dae009d",
                            "name": "Natriumcitrat"
                        },
                        {
                            "code": 147,
                            "_id": "54490fb860a8bc460dae009c",
                            "name": "Saccharin-Natrium"
                        },
                        {
                            "code": 2,
                            "_id": "54490fb860a8bc460dae009b",
                            "name": "Natriumchlorid"
                        },
                        {
                            "code": 10,
                            "_id": "54490fb860a8bc460dae009a",
                            "name": "Hypromellose"
                        },
                        {
                            "code": 154,
                            "_id": "54490fb860a8bc460dae0099",
                            "name": "Xanthan-Gummi"
                        },
                        {
                            "code": 43063,
                            "_id": "54490fb860a8bc460dae0098",
                            "name": "Maltitollösung (2.5 g)"
                        },
                        {
                            "code": 219,
                            "_id": "54490fb860a8bc460dae0097",
                            "name": "Glycerol"
                        },
                        {
                            "code": 3488,
                            "_id": "54490fb860a8bc460dae0096",
                            "name": "Erdbeer-Aroma"
                        },
                        {
                            "code": 22,
                            "_id": "54490fb860a8bc460dae0095",
                            "name": "Wasser, ger."
                        }
                    ],
                    "activity.phFixedPay": null,
                    "activity.phPatPay": 3.32,
                    "activity.phPriceSale": 3.30,
                    "activity.phPackSize": "100 ml",
                    "activity.phForm": "Susp. z. Einnehmen",
                    "activity.phCompany": "1 A Pharma GmbH",
                    "activity.phPZN": "01865570",
                    "activity.phBTM": false,
                    "activity.phLifeStyleCond": false,
                    "activity.phNLabel": "Ibuprofen-1 A Pharma 20mg/ml Susp z Einn. 100ml N1",
                    "activity.phOTC": false,
                    "activity.phOTX": true,
                    "activity.phRecipeOnly": false,
                    "activity.phRefund": 0
                }
            },
            {
                original: {
                    "activity.content": "OPIUM",
                    "activity.phCheaperPkg": false,
                    "activity.phARV": false,
                    "activity.phOTX": false,
                    "activity.phOTC": false,
                    "activity.phNLabel": "OPIUM 25 g",
                    "activity.phRecipeOnly": false,
                    "activity.phBTM": true,
                    "activity.phPrescMed": false,
                    "activity.phMed": false,
                    "activity.phDisAgrAlt": false,
                    "activity.phDisAgr": false,
                    "activity.phGBA": false,
                    "activity.phAMR": [],
                    "activity.phLifeStyleCond": false,
                    "activity.phLifeStyle": false,
                    "activity.phNegative": false,
                    "activity.phImport": false,
                    "activity.phTrans": false,
                    "activity.phTer": false,
                    "activity.phOnly": false,
                    "activity.phAtc": [],
                    "activity.phIngr": [],
                    "activity.phFixedPay": null,
                    "activity.phPatPayHint": "",
                    "activity.phPatPay": null,
                    "activity.phPriceSale": null,
                    "activity.phPackSize": "25 g",
                    "activity.phForm": "",
                    "activity.phCompany": "Intern-Drogen",
                    "activity.phPZN": "01601606"
                },
                updated: {
                    "activity.content": "OPIUM",
                    "activity.phCheaperPkg": false,
                    "activity.phARV": false,
                    "activity.phOTX": false,
                    "activity.phOTC": false,
                    "activity.phNLabel": "OPIUM 25 g",
                    "activity.phRecipeOnly": false,
                    "activity.phBTM": true,
                    "activity.phPrescMed": false,
                    "activity.phMed": false,
                    "activity.phDisAgrAlt": false,
                    "activity.phDisAgr": false,
                    "activity.phGBA": false,
                    "activity.phAMR": [],
                    "activity.phLifeStyleCond": false,
                    "activity.phLifeStyle": false,
                    "activity.phNegative": true,
                    "activity.phImport": false,
                    "activity.phTrans": false,
                    "activity.phTer": false,
                    "activity.phOnly": false,
                    "activity.phAtc": [
                        "M01AE01"
                    ],
                    "activity.phIngr": [],
                    "activity.phFixedPay": null,
                    "activity.phPatPayHint": "",
                    "activity.phPatPay": null,
                    "activity.phPriceSale": null,
                    "activity.phPackSize": "25 g",
                    "activity.phForm": "",
                    "activity.phCompany": "Intern-Drogen!!",
                    "activity.phPZN": "01601606"
                }
            },
            {
                original: {
                    "activity.content": "ASS 500 - 1 A Pharma®, Tbl.",
                    "activity.phCheaperPkg": true,
                    "activity.phARV": false,
                    "activity.phOTX": true,
                    "activity.phOTC": false,
                    "activity.phNLabel": "ASS 500 - 1 A Pharma® 30 Tbl. N2",
                    "activity.phRecipeOnly": false,
                    "activity.phBTM": false,
                    "activity.phPrescMed": false,
                    "activity.phMed": false,
                    "activity.phDisAgrAlt": false,
                    "activity.phDisAgr": false,
                    "activity.phGBA": false,
                    "activity.phAMR": [
                        "amr1"
                    ],
                    "activity.phLifeStyleCond": false,
                    "activity.phLifeStyle": false,
                    "activity.phNegative": false,
                    "activity.phImport": false,
                    "activity.phTrans": false,
                    "activity.phTer": false,
                    "activity.phOnly": true,
                    "activity.phAtc": [
                        "N02BA01"
                    ],
                    "activity.phIngr": [
                        {
                            "code": 433,
                            "_id": "54623f9d9e1023ea11e87898",
                            "name": "Acetylsalicylsäure (500 mg)"
                        }
                    ],
                    "activity.phFixedPay": 2.74,
                    "activity.phPatPayHint": "AVP<=5,00 => ZuZa=2,32",
                    "activity.phPatPay": 2.32,
                    "activity.phPriceSale": 2.32,
                    "activity.phPackSize": "30 st",
                    "activity.phForm": "Tbl.",
                    "activity.phCompany": "1 A Pharma GmbH",
                    "activity.phPZN": "08612429"
                },
                updated: {
                    "activity.content": "ASS 500 - 1 A Pharma®, Tbl.",
                    "activity.phCheaperPkg": true,
                    "activity.phARV": false,
                    "activity.phOTX": true,
                    "activity.phOTC": true,
                    "activity.phNLabel": "ASS 500 - 1 A Pharma® 30 Tbl. N2",
                    "activity.phRecipeOnly": false,
                    "activity.phBTM": false,
                    "activity.phPrescMed": false,
                    "activity.phMed": false,
                    "activity.phDisAgrAlt": false,
                    "activity.phDisAgr": false,
                    "activity.phGBA": false,
                    "activity.phAMR": [
                        "amr1"
                    ],
                    "activity.phLifeStyleCond": false,
                    "activity.phLifeStyle": false,
                    "activity.phNegative": false,
                    "activity.phImport": false,
                    "activity.phTrans": false,
                    "activity.phTer": false,
                    "activity.phOnly": true,
                    "activity.phAtc": [
                        "N02BA01"
                    ],
                    "activity.phIngr": [
                        {
                            "code": 433,
                            "_id": "54623f9d9e1023ea11e87898",
                            "name": "Acetylsalicylsäure (500 mg) F"
                        }
                    ],
                    "activity.phFixedPay": 2.74,
                    "activity.phPatPayHint": "AVP<=5,00 => ZuZa=2,32",
                    "activity.phPatPay": 2.32,
                    "activity.phPriceSale": 2.32,
                    "activity.phPackSize": "30 st",
                    "activity.phForm": "Tbl.",
                    "activity.phCompany": "1 A Pharma GmbH",
                    "activity.phPZN": "08612429"
                }
            }
        ];

    Y.namespace( "mojito.binders" )[NAME] = {

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;

            console.warn( NAME, {
                arguments: arguments,
                this: this,
                Y: Y
            } );

        },

        bind: function( node ) {
            this.node = node;

            var
                moj2687 = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'moj2687',
                        text: 'moj2687',
                        click: function() {

                            Y.doccirrus.uam.utils.showMedicationCompareDialog( {
                                data: dummyData,
                                callback: function( errors, result ) {
                                    console.warn( '[moj2687.js] callback :', errors, result );
                                }
                            } );

                        }
                    }
                } ),
                applyBindings = {
                    moj2687: moj2687
                };

            console.warn( '[moj2687.js] applyBindings :', applyBindings );

            ko.applyBindings( applyBindings, node.getDOMNode() );

        }

    };
}, '3.16.0', {
    requires: [
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dcutils-uam',
        'KoUI-all'
    ]
} );
