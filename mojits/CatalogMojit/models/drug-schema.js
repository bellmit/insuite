/**
 * User: nicolas.pettican
 * Date: 21.04.20  12:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'drug-schema', function( Y, NAME ) {

        /**
         * @module drug-api
         * @submodule models
         * @namespace doccirrus.schemas
         * @class drug_T
         */

        

        let types = {};
        const
            i18n = Y.doccirrus.i18n,
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Provides read-only access to medical products if MMI license is available (inScribe). For v.2. we only allow GET."
                }
            },

            queryStringParameters = {
                catalogShort: {
                    apiv: {v: 2, queryParam: true},
                    default: "",
                    type: "String",
                    i18n: i18n( 'activity-schema.Medication_T.catalogShort.i18n' )
                },
                atc: {
                    apiv: {v: 2, queryParam: true},
                    default: "",
                    type: "String",
                    i18n: i18n( 'activity-schema.Medication_T.phAtc.i18n' )
                },
                productName: {
                    apiv: {v: 2, queryParam: true},
                    default: "",
                    type: "String",
                    i18n: i18n( 'activity-schema.Medication_T.productName.i18n' )
                },
                pzn: {
                    apiv: {v: 2, queryParam: true},
                    default: "",
                    type: "String",
                    i18n: i18n( 'activity-schema.Medication_T.phPZN.i18n' )
                },
                moleculeName: {
                    apiv: {v: 2, queryParam: true},
                    default: "",
                    type: "String",
                    i18n: i18n( 'activity-schema.Medication_T.moleculeName.i18n' )
                },
                fetchProductInfo: {
                    apiv: {v: 2, queryParam: true},
                    default: false,
                    type: "Boolean",
                    i18n: i18n( 'activity-schema.Medication_T.fetchProductInfo.i18n' )
                },
                fetchPackageDetails: {
                    apiv: {v: 2, queryParam: true},
                    default: false,
                    type: "Boolean",
                    i18n: i18n( 'activity-schema.Medication_T.fetchProductInfo.i18n' )
                },
                icd10: {
                    apiv: {v: 2, queryParam: true},
                    default: "",
                    type: "String",
                    i18n: i18n( 'activity-schema.Medication_T.ICD10.i18n' )
                },
                maxResult: {
                    apiv: {v: 2, queryParam: true},
                    default: "",
                    type: "String",
                    i18n: i18n( 'activity-schema.Medication_T.maxResult.i18n' )
                },
                originalResult: {
                    apiv: {v: 2, queryParam: true},
                    default: "",
                    type: "String",
                    i18n: i18n( 'activity-schema.Medication_T.maxResult.i18n' )
                }
            },

            methodBodyParameters = {
                parents: {
                    apiv: {v: 2, queryParam: true},
                    type: "String"
                },
                children: {
                    apiv: {v: 2, queryParam: true},
                    type: "String"
                }
            },

            ATCCodeObjTemplate = {
                name: {
                    apiv: {v: 2},
                    type: "String",
                    i18n: i18n( 'activity-schema.Medication_T.name.i18n' )
                },
                atcCode: {
                    apiv: {v: 2},
                    type: "String",
                    i18n: i18n( 'activity-schema.Medication_T.code.i18n' ) // TODO add translations
                },
                upperCode: {
                    apiv: {v: 2},
                    type: "String",
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
                    base: {
                        complex: "ext",
                        type: "Drug_T",
                        lib: types
                    }
                },

                Drug_T: {
                    ...queryStringParameters,
                    ...methodBodyParameters,

                    /* response body schema */

                    name: {
                        apiv: {v: 2, queryParam: false},
                        default: "",
                        type: "String",
                        i18n: i18n( 'activity-schema.Medication_T.name.i18n' )
                    },
                    original: {
                        apiv: {v: 2},
                        type: "any",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.original.i18n' )
                    },
                    moleculeList: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "Molecule_T",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.moleculeNameList.i18n' )
                    },
                    icd10CodeList: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "ICD10_T",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.icd10CodeList.i18n' )
                    },
                    atcCodeList: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "ATCCodeList_T",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.atcCodeList.i18n' )
                    },
                    packageList: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "PackageList_T",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.packageList.i18n' )
                    },
                    documents: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "Document_T",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.documents.i18n' )
                    },
                    divisibility: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.Medication_T.divisibility.i18n' )
                    },
                    company: {
                        apiv: {v: 2},
                        default: "",
                        type: "String",
                        i18n: i18n( 'activity-schema.Medication_T.company.i18n' )
                    },
                    atcCode: {
                        apiv: {v: 2},
                        default: "",
                        type: "String",
                        i18n: i18n( 'activity-schema.Medication_T.phAtc.i18n' ),
                        "-en": "ATC code",
                        "-de": "ATC code"
                    },
                    isTeratogen: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phTer')
                    },
                    isTransfusion: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phTrans')
                    },
                    isReImport: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phImport')
                    },
                    isInNegative: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phNegative')
                    },
                    isLifestyleDrug: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phLifeStyle')
                    },
                    isConditionalLifeStyleDrug: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phLifeStyleCond')
                    },
                    isGBATherapyAdvice: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phGBA')
                    },
                    isDiscountAgreement: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phDisAgr')
                    },
                    isAltDiscountAgreement: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phDisAgrAlt')
                    },
                    isMedProduct: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phMed')
                    },
                    isPrescMed: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phPrescMed')
                    },
                    isOTC: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phOTC')
                    },
                    isPharmacyOnly: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.')
                    },
                    isRecipeOnly: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phRecipeOnly')
                    },
                    isBTM: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phBTM')
                    },
                    isContraceptive: {
                        apiv: {v: 2},
                        type: "Boolean",
                        i18n: i18n('activity-schema.Medication_T.phContraceptive')
                    },
                    GBATherapyHintName: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n('activity-schema.Medication_T.phGBATherapyHintName')
                    },
                    formAbbreviation: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n('activity-schema.Medication_T.phForm')
                    },
                    signetIcons: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "SignetIcon_T",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.signetIcons.i18n' )
                    },
                    identaImages: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "IdentaImage_T",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.signetIcons.i18n' )
                    }
                },
                ICD10_T: {
                    name: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.ICD10_T.name.i18n' )
                    },
                    icd10Code: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.ICD10_T.icd10Code.i18n' )
                    },
                    upperCode: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.ICD10_T.upperCode.i18n' )
                    },
                    level: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.ICD10_T.level.i18n' )
                    }
                },
                Document_T: {
                    BI: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "Chapter_T",
                        lib: types,
                        i18n: i18n( 'activity-schema.Document_T.BI.i18n' )
                    },
                    SPC: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "Chapter_T",
                        lib: types,
                        i18n: i18n( 'activity-schema.Document_T.SPC.i18n' )
                    }
                },
                Chapter_T: {
                    title: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.Chapter_T.title.i18n' )
                    },
                    content: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.Chapter_T.content.i18n' )
                    }
                },
                ATCCodeList_T: {
                    name: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.ATCCodeList_T.name.i18n' )
                    },
                    atcCode: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.ATCCodeList_T.atcCode.i18n' )
                    },
                    upperCode: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.ATCCodeList_T.upperCode.i18n' )
                    },
                    children: {
                        apiv: {v: 2},
                        type: "TherapeuticATCList_T",
                        complex: "inc",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.children.i18n' )
                    },
                    level: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.ATCCodeList_T.level.i18n' )
                    }
                },
                TherapeuticATCList_T: {
                    ...ATCCodeObjTemplate,
                    children: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "TherapeuticPharmacologicalATCList_T",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.children.i18n' )
                    }
                },
                TherapeuticPharmacologicalATCList_T: {
                    ...ATCCodeObjTemplate,
                    children: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "ChemicalTherapeuticPharmacologicalATCList_T",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.children.i18n' )
                    }
                },
                ChemicalTherapeuticPharmacologicalATCList_T: {
                    ...ATCCodeObjTemplate,
                    children: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "ChemicalATCList_T",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.children.i18n' )
                    }
                },
                ChemicalATCList_T: {
                    ...ATCCodeObjTemplate
                },
                PackageList_T: {
                    pzn: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.Medication_T.phPZN.i18n' )
                    },
                    pznOriginal: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.PackageList_T.phPZNOriginal.i18n' )
                    },
                    name: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.Medication_T.name.i18n' )
                    },
                    quantity: {
                        apiv: {v: 2},
                        type: "Number",
                        i18n: i18n( 'activity-schema.PackageList_T.quantity.i18n' )
                    },
                    prices: {
                        apiv: {v: 2},
                        type: "PricesList_T",
                        complex: "ext",
                        lib: types,
                        i18n: i18n( 'activity-schema.PackageList_T.prices.i18n' )
                    },
                    priceHistory: {
                        apiv: {v: 2},
                        complex: "inc",
                        type: "PriceByDate_T",
                        lib: types,
                        i18n: i18n( 'InCaseMojit.medication_modal.submenu.PRICE_HISTORY.i18n' )
                    },
                    original: {
                        apiv: {v: 2},
                        type: "any",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.original.i18n' )
                    }
                },
                Molecule_T: {
                    name: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.Molecule_T.name.i18n' )
                    },
                    moleculeTypeCode: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.Medication_T.moleculeTypeCode.i18n' )
                    },
                    ingredientCode: {
                        apiv: {v: 2},
                        type: "IngredientCode_T",
                        complex: "inc",
                        lib: types,
                        i18n: i18n( 'activity-schema.Medication_T.ingredientCode.i18n' ) // TODO add translations
                    }
                },
                IngredientCode_T: {
                    type: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.Medication_T.type.i18n' ) // TODO add translations
                    },
                    value: {
                        apiv: {v: 2},
                        type: "Number",
                        i18n: i18n( 'activity-schema.Molecule_T.moleculeId.i18n' )
                    },
                    strengthValue: {
                        apiv: {v: 2},
                        type: "Number",
                        i18n: i18n( 'activity-schema.Molecule_T.strengthValue.i18n' )
                    },
                    strengthUnitCode: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.Molecule_T.strengthUnitCode.i18n' )
                    },
                    moleculeTypeCode: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.Molecule_T.moleculeTypeCode.i18n' )
                    }
                },
                PricesList_T: {
                    pricePatientPayment: {
                        apiv: {v: 2},
                        type: "Number",
                        i18n: i18n( 'activity-schema.PricesList_T.PRICE_PATIENTPAYMENT.i18n' )
                    },
                    pricePharmacyBuy: {
                        apiv: {v: 2},
                        type: "Number",
                        i18n: i18n( 'activity-schema.PricesList_T.PRICE_PHARMACYBUY.i18n' )
                    },
                    pricePharmacySale: {
                        apiv: {v: 2},
                        type: "Number",
                        i18n: i18n( 'activity-schema.PricesList_T.PRICE_PHARMACYSALE.i18n' )
                    },
                    priceFixed: {
                        apiv: {v: 2},
                        type: "Number",
                        i18n: i18n( 'activity-schema.PricesList_T.PRICE_FIXED.i18n' )
                    }
                },
                SignetIcon_T: {
                    title: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'general.PAGE_TITLE.title.TITLE.i18n' )
                    },
                    src: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.Molecule_T.iconSrc.i18n' )
                    }
                },
                IdentaImage_T: {
                    weight: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'InCaseMojit.medication_modal.text.WEIGHT.i18n' )
                    },
                    diameter: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'InCaseMojit.medication_modal.text.DIAMETER.i18n' )
                    },
                    height: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'InCaseMojit.medication_modal.text.HEIGHT.i18n' )
                    },
                    src: {
                        apiv: {v: 2},
                        type: "String",
                        i18n: i18n( 'activity-schema.Molecule_T.identaImgSrc.i18n' )
                    }
                },
                PriceByDate_T: {
                    date: {
                        i18n: i18n( 'InBackupMojit.InBackupViewModel.label.DATE.i18n' )
                    },
                    price: {
                        i18n: i18n( 'activity-schema.Medication_T.phPriceSale.i18n' )
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
            types: types
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
