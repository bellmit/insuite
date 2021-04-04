/*global YUI*/
YUI.add( 'medicationscatalog-schema', function( Y, NAME ) {

        /**
         * @module InStock
         * @submodule models
         * @namespace doccirrus.schemas
         * @class medicationsCatalog_T
         */

        'use strict';

        var
            types = {},
            i18n = Y.doccirrus.i18n,
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "MedicationsCatalog available, if MMI license available, will trigger from there. For v.2. we only allow get"
                }
            },
            ATCCodeObjTemplate = {
                "name": {
                    "apiv": {v: 2},
                    "type": "String",
                    i18n: i18n( 'activity-schema.Medication_T.name.i18n' )
                },
                "atcCode": {
                    "apiv": {v: 2},
                    "type": "String",
                    i18n: i18n( 'activity-schema.Medication_T.code.i18n' ) // TODO add translations
                },
                "upperCode": {
                    "apiv": {v: 2},
                    "type": "String",
                    i18n: i18n( 'activity-schema.Medication_T.code.i18n' ) // TODO add translations
                }
            };

        /**
         * Schema definitions
         * @property types
         * @type {YUI}
         */
        types = Y.mix( types, {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "medicationsCatalog_T",
                        "lib": types
                    }
                },
                medicationsCatalog_T: {
                    "name": {
                        "apiv": {v: 2, queryParam: true},
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.name.i18n' )
                    },
                    "catalogShort": {
                        "apiv": {v: 2, queryParam: true},
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.catalogShort.i18n' )
                    },
                    "atc": {
                        "apiv": {v: 2, queryParam: true},
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.phAtc.i18n' )
                    },
                    "productName": {
                        "apiv": {v: 2, queryParam: true},
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.productName.i18n' )
                    },
                    "pzn": {
                        "apiv": {v: 2, queryParam: true},
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.phPZN.i18n' )
                    },
                    "moleculeName": {
                        "apiv": {v: 2, queryParam: true},
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.moleculeName.i18n' )
                    },
                    "moleculeList": {
                        "apiv": {v: 2},
                        "complex": "inc",
                        "type": "Molecule_T",
                        "lib": types,
                        i18n: i18n( 'activity-schema.Medication_T.moleculeNameList.i18n' )
                    },
                    "maxResult": {
                        "apiv": {v: 2, queryParam: true},
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.maxResult.i18n' )
                    },
                    "fetchProductInfo": {
                        "apiv": {v: 2, queryParam: true},
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'activity-schema.Medication_T.fetchProductInfo.i18n' )
                    },
                    "parents": {
                        "apiv": {v: 2, queryParam: true},
                        "type": "String"
                    },
                    "children": {
                        "apiv": {v: 2, queryParam: true},
                        "type": "String"
                    },
                    "icd10": {
                        "apiv": {v: 2, queryParam: true},
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.ICD10.i18n' )
                    },
                    "icd10CodeList": {
                        "apiv": {v: 2},
                        "complex": "inc",
                        "type": "ICD10_T",
                        "lib": types,
                        i18n: i18n( 'activity-schema.Medication_T.icd10CodeList.i18n' )
                    },
                    "atcCodeList": {
                        "apiv": {v: 2},
                        "complex": "inc",
                        "type": "ATCCodeList_T",
                        "lib": types,
                        i18n: i18n( 'activity-schema.Medication_T.atcCodeList.i18n' )
                    },
                    "packageList": {
                        "apiv": {v: 2},
                        "complex": "inc",
                        "type": "PackageList_T",
                        "lib": types,
                        i18n: i18n( 'activity-schema.Medication_T.packageList.i18n' )
                    },
                    "documents": {
                        "apiv": {v: 2},
                        "complex": "inc",
                        "type": "Document_T",
                        "lib": types,
                        i18n: i18n( 'activity-schema.Medication_T.documents.i18n' )
                    },
                    "divisibility": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.divisibility.i18n' )
                    },
                    "code": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'instock-schema.InStock_T.gtinCode' ),
                        "-en": "GTIN code",
                        "-de": "GTIN code"
                    },
                    "company": {
                        "apiv": {v: 2},
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.company.i18n' )
                    },
                    "phPZN": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.phPZN.i18n' ),
                        "-en": "PZN code",
                        "-de": "PZN Code"
                    },
                    "phUnit": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.phUnit.i18n' ),
                        "-en": "Einheit",
                        "-de": "Unit"
                    },
                    'phUnitDescription': {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.phUnit.i18n' ),
                        "-en": "Einheit",
                        "-de": "Unit"
                    },
                    "phCompany": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.phCompany.i18n' ),
                        "-en": "Manufactory",
                        "-de": "Hersteller"
                    },
                    "phForm": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.phForm.i18n' ),
                        "-en": "Format",
                        "-de": "Darreichungsform"
                    },
                    "phPackSize": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.phPackSize.i18n' ),
                        "-en": "Package size",
                        "-de": "Packungsgröße"
                    },
                    "phIngr": {
                        "complex": "inc",
                        "type": "PhIngr_T",
                        "lib": types,
                        //"default": [],
                        i18n: i18n( 'activity-schema.Medication_T.phIngr.i18n' ),
                        "-en": "Ingredient list",
                        "-de": "Wirkstoffe"
                    },
                    "phAtc": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.phAtc.i18n' ),
                        "-en": "ATC code",
                        "-de": "ATC code"
                    },
                    "phDescription": {
                        "default": "",
                        type: "String",
                        i18n: i18n( 'activity-schema.Medication_T.phDescription.i18n' ),
                        "-en": "Description",
                        "-de": "Beschreibung"
                    },
                    phGTIN: {
                        "default": null,
                        "type": "String"
                    },
                    prdNo: {
                        "default": "",
                        "type": "String"
                    },
                    phPriceSale: {
                        "default": 0,
                        "type": "Number"
                    },
                    phPriceCost: {
                        "default": "",
                        "type": "number"
                    },
                    articleType: {
                        "default": "",
                        "type": "String"
                    },
                    u_extra: {
                        "default": "",
                        "type": "any"
                    },
                    units: {
                        "default": [],
                        "type": "any"
                    },
                    insuranceCode: {
                        "default": "",
                        "type": "String"
                    },
                    paidByInsurance: {
                        "default": false,
                        "type": "Boolean"
                    },
                    insuranceDescription: {
                        "default": "",
                        "type": "String"
                    },
                    supplyCategory: {
                        "default": "",
                        "type": "String"
                    }
                },
                "PhIngr_T": {
                    "code": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.PhIngr_T.code.i18n' ),
                        "-en": "Ingredient id",
                        "-de": "Ingredient id"
                    },
                    "name": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.PhIngr_T.name.i18n' ),
                        //  ": "kbv.PhIngr_T_name",
                        "-en": "Ingredient name",
                        "-de": "Ingredient name",
                        default: ""
                    },
                    "shortName": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.PhIngr_T.shortName.i18n' ),
                        "-en": "Ingredient name (shorter)",
                        "-de": "Ingredient name (shorter)"
                    },
                    "strength": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.PhIngr_T.strength.i18n' ),
                        "-en": "Ingredient strength/dosage",
                        "-de": "Ingredient strength/dosage"
                    },
                    "type": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.PhIngr_T.strength.i18n' ),
                        "-en": "Ingredient name",
                        "-de": "Ingredient name"
                    }
                },
                "ICD10_T": {
                    "name": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.ICD10_T.name.i18n' )
                    },
                    "icd10Code": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.ICD10_T.icd10Code.i18n' )
                    },
                    "upperCode": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.ICD10_T.upperCode.i18n' )
                    },
                    "level": {
                        "apiv": {v: 2},
                        "type": "Number",
                        i18n: i18n( 'activity-schema.ICD10_T.level.i18n' )
                    }
                },
                "Document_T": {
                    "BI": {
                        "apiv": {v: 2},
                        "complex": "inc",
                        "type": "Chapter_T",
                        "lib": types,
                        i18n: i18n( 'activity-schema.Document_T.BI.i18n' )
                    },
                    "SPC": {
                        "apiv": {v: 2},
                        "complex": "inc",
                        "type": "Chapter_T",
                        "lib": types,
                        i18n: i18n( 'activity-schema.Document_T.SPC.i18n' )
                    }
                },
                "Chapter_T": {
                    "title": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.Chapter_T.title.i18n' )
                    },
                    "content": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.Chapter_T.content.i18n' )
                    }
                },
                "ATCCodeList_T": {
                    "name": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.ATCCodeList_T.name.i18n' )
                    },
                    "atcCode": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.ATCCodeList_T.atcCode.i18n' )
                    },
                    "upperCode": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.ATCCodeList_T.upperCode.i18n' )
                    },
                    "children": {
                        "apiv": {v: 2},
                        "type": "TherapeuticATCList_T",
                        "complex": "inc",
                        "lib": types,
                        i18n: i18n( 'activity-schema.Medication_T.children.i18n' )
                    },
                    "level": {
                        "apiv": {v: 2},
                        "type": "Number",
                        i18n: i18n( 'activity-schema.ATCCodeList_T.level.i18n' )
                    }
                },
                "TherapeuticATCList_T": {
                    ...ATCCodeObjTemplate,
                    "children": {
                        "apiv": {v: 2},
                        "complex": "inc",
                        "type": "TherapeuticPharmacologicalATCList_T",
                        "lib": types,
                        i18n: i18n( 'activity-schema.Medication_T.children.i18n' )
                    }
                },
                "TherapeuticPharmacologicalATCList_T": {
                    ...ATCCodeObjTemplate,
                    "children": {
                        "apiv": {v: 2},
                        "complex": "inc",
                        "type": "ChemicalTherapeuticPharmacologicalATCList_T",
                        "lib": types,
                        i18n: i18n( 'activity-schema.Medication_T.children.i18n' )
                    }
                },
                "ChemicalTherapeuticPharmacologicalATCList_T": {
                    ...ATCCodeObjTemplate,
                    "children": {
                        "apiv": {v: 2},
                        "complex": "inc",
                        "type": "ChemicalATCList_T",
                        "lib": types,
                        i18n: i18n( 'activity-schema.Medication_T.children.i18n' )
                    }
                },
                "ChemicalATCList_T": {
                    ...ATCCodeObjTemplate
                },
                "PackageList_T": {
                    "pzn": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.phPZN.i18n' )
                    },
                    "name": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.name.i18n' )
                    },
                    "quantity": {
                        "apiv": {v: 2},
                        "type": "Number",
                        i18n: i18n( 'activity-schema.PackageList_T.quantity.i18n' )
                    },
                    "prices": {
                        "apiv": {v: 2},
                        "type": "PricesList_T",
                        "complex": "ext",
                        "lib": types,
                        i18n: i18n( 'activity-schema.PackageList_T.prices.i18n' )
                    }
                },
                "Molecule_T": {
                    "name": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.Molecule_T.name.i18n' )
                    },
                    "moleculeTypeCode": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.moleculeTypeCode.i18n' )
                    },
                    "ingredientCode": {
                        "apiv": {v: 2},
                        "type": "IngredientCode_T",
                        "complex": "inc",
                        "lib": types,
                        i18n: i18n( 'activity-schema.Medication_T.ingredientCode.i18n' ) // TODO add translations
                    }
                },
                "IngredientCode_T": {
                    "type": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.Medication_T.type.i18n' ) // TODO add translations
                    },
                    "value": {
                        "apiv": {v: 2},
                        "type": "Number",
                        i18n: i18n( 'activity-schema.Molecule_T.moleculeId.i18n' )
                    },
                    "strengthValue": {
                        "apiv": {v: 2},
                        "type": "Number",
                        i18n: i18n( 'activity-schema.Molecule_T.strengthValue.i18n' )
                    },
                    "strengthUnitCode": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.Molecule_T.strengthUnitCode.i18n' )
                    },
                    "moleculeTypeCode": {
                        "apiv": {v: 2},
                        "type": "String",
                        i18n: i18n( 'activity-schema.Molecule_T.moleculeTypeCode.i18n' )
                    }
                },
                "PricesList_T": {
                    "PRICE_PATIENTPAYMENT": {
                        "apiv": {v: 2},
                        "type": "Number",
                        i18n: i18n( 'activity-schema.Medication_T.priceX.i18n' )
                    },
                    "PRICE_PHARMACYBUY": {
                        "apiv": {v: 2},
                        "type": "Number",
                        i18n: i18n( 'activity-schema.Medication_T.priceX.i18n' )
                    },
                    "PRICE_PHARMACYSALE": {
                        "apiv": {v: 2},
                        "type": "Number",
                        i18n: i18n( 'activity-schema.Medication_T.priceX.i18n' )
                    },
                    "PRICE_FIXED": {
                        "apiv": {v: 2},
                        "type": "Number",
                        i18n: i18n( 'activity-schema.Medication_T.priceX.i18n' )
                    }
                }
            }
        );
        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,
            ramlConfig: ramlConfig,

            /* MANDATORY */
            types: types,
            indexes: [
                {
                    key: {
                        "phPZN": 1
                    },
                    indexType: {sparse: true, unique: true}
                },
                {
                    key: {
                        "prdNo": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        "code": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        "phCompany": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        "phForm": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        "phPackSize": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        "phDescription": 1
                    },
                    indexType: {sparse: true}
                }

            ]
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations'
        ]
    }
);
/**
 * User: dcdev
 * Date: 3/21/19  8:26 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
