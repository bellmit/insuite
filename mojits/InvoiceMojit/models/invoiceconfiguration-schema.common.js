/**
 * User: do
 * Date: 02/05/14  13:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, require */
'use strict';

YUI.add( 'invoiceconfiguration-schema', function( Y, NAME ) {
        /**
         * The InvoiceConfiguration_T entry schema,
         * @module invoiceconfiguration-schema, invoice configuration schema.
         */
        const tarmedTaxPointValuesForServerSide = Y.doccirrus.commonutils.isClientSide() ? {} : require( '../../../mojits/InvoiceMojit/CountryConfiguration/CH/tarmed-tax-point-values/tarmedTaxPointValues.js' );

        var
            types = {},
            i18n = Y.doccirrus.i18n,
            template = {
                "_id": "000000000000000000000001",
                "invoicefactors": [
                    {
                        "_id": "000000000000000000000001",
                        "year": "2012",
                        "quarter": "1",
                        "factor": 0.035048,
                        "isDefault": true
                    }, {
                        "_id": "000000000000000000000002",
                        "year": "2013",
                        "quarter": "1",
                        "factor": 0.035363,
                        "isDefault": true
                    }, {
                        "_id": "000000000000000000000003",
                        "year": "2013",
                        "quarter": "4",
                        "factor": 0.10,
                        "isDefault": true
                    }, {
                        "_id": "000000000000000000000004",
                        "year": "2014",
                        "quarter": "1",
                        "factor": 0.1013,
                        "isDefault": true
                    }, {
                        "_id": "000000000000000000000005",
                        "year": "2015",
                        "quarter": "1",
                        "factor": 0.102718,
                        "isDefault": true
                    }, {
                        "_id": "000000000000000000000006",
                        "year": "2016",
                        "quarter": "1",
                        "factor": 0.104361,
                        "isDefault": true
                    }, {
                        "_id": "000000000000000000000007",
                        "year": "2017",
                        "quarter": "1",
                        "factor": 0.1053,
                        "isDefault": true
                    }, {
                        "_id": "000000000000000000000008",
                        "year": "2018",
                        "quarter": "1",
                        "factor": 0.106543,
                        "isDefault": true
                    }, {
                        "_id": "000000000000000000000009",
                        "year": "2019",
                        "quarter": "1",
                        "factor": 0.108226,
                        "isDefault": true
                    }, {
                        "_id": "000000000000000000000010",
                        "year": "2020",
                        "quarter": "1",
                        "factor": 0.109871,
                        "isDefault": true
                    }, {
                        "_id": "000000000000000000000011",
                        "year": "2021",
                        "quarter": "1",
                        "factor": 0.111244,
                        "isDefault": true
                    }
                ],
                "invoiceNumberSchemes": [
                    {
                        "_id": "000000000000000000000002",
                        "year": "",
                        "nextNumber": 1,
                        "digits": 5,
                        locationId: Y.doccirrus.schemas.location.getMainLocationId()
                    }
                ],
                "dunningSchemes": [
                    {
                        "_id": "000000000000000000000002",
                        "warning1Value": 0,
                        "warning2Value": 0,
                        locationId: Y.doccirrus.schemas.location.getMainLocationId()
                    }
                ],
                "receiptsSchemes": [
                    {
                        "_id": "000000000000000000000002",
                        locationId: Y.doccirrus.schemas.location.getMainLocationId(),
                        name: i18n( 'InvoiceMojit.invoiceNumberScheme_item.group.CASHBOOK' ),
                        "year": "",
                        "nextNumber": 1,
                        "digits": 5
                    }
                ],
                "receiptNumberSchemes": [
                    {
                        "_id": "000000000000000000000003",
                        "year": "",
                        "nextNumber": 1,
                        "digits": 5,
                        locationId: Y.doccirrus.schemas.location.getMainLocationId()
                    }
                ],
                "bgNumberSchemes": [
                    {
                        "_id": "000000000000000000000004",
                        "year": "",
                        "nextNumber": 1,
                        "digits": 5,
                        locationId: Y.doccirrus.schemas.location.getMainLocationId()
                    }
                ],
                "hasImagingDevice": false,
                tarmedTaxPointValues: tarmedTaxPointValuesForServerSide,
                autoAssignmentOfDiagnosis: true,
                kbvFocusFunctionalityContinuousDiagnosis: true,
                askForCreationOfAdditionalInsurancesAfterCardread: false,
                copyPublicInsuranceDataToAdditionalInsurance: false
            };
        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "InvoiceConfiguration_T",
                        "lib": types
                    }
                },
                "InvoiceConfiguration_T": {
                    "InvoiceConfiguration_Base_T": {
                        "complex": "ext",
                        "type": "InvoiceConfiguration_Base_T",
                        "lib": types
                    },
                    "InvoiceConfiguration_D_T": {
                        "complex": "ext",
                        "type": "InvoiceConfiguration_D_T",
                        "lib": types
                    },
                    "InvoiceConfiguration_CH_T": {
                        "complex": "ext",
                        "type": "InvoiceConfiguration_CH_T",
                        "lib": types
                    }
                },
                "InvoiceConfiguration_Base_T": {
                    "addVat": {
                        "default": false,
                        "type": "Boolean"
                    },
                    "vat": {
                        "type": "Number"
                    },
                    "conFileSplicing": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguratperson-schema.InsuranceStatus_T.conFileSplicing' ),
                        "-en": "Enable option for merging CON files",
                        "-de": "Option zum Zusammenführen von CON-Dateien aktivieren"
                    },
                    "invoicefactors": {
                        "complex": "inc",
                        "type": "InvoiceFactor_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.invoicefactors' ),
                        "-en": "invoice factors",
                        "-de": "Rechnungsfaktoren"
                    },
                    "empiricalvalue": {
                        "default": 5,
                        "validate": "kbv.InvoiceConfiguration_T_empiricalvalue",
                        "type": "Number",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.empiricalvalue' ),
                        "-en": "Empirical value of unpaid services in %",
                        "-de": "Erfahrungswert der nicht vergüteten Leistungen in %"
                    },
                    "kbvFocusFunctionalityKRW": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.kbvFocusFunctionalityKRW' ),
                        "-en": "KBV focus functionality KRW",
                        "-de": "KBV Schwerpunkt-Funktionalität KRW"
                    },
                    "autoAssignmentOfDiagnosis": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.autoAssignmentOfDiagnosis' ),
                        "-en": "autoAssignmentOfDiagnosis",
                        "-de": "autoAssignmentOfDiagnosis"
                    },
                    "kbvFocusFunctionalityContinuousDiagnosis": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.kbvFocusFunctionalityContinuousDiagnosis' ),
                        "-en": "KBV focus functionality ContinuousDiagnosis",
                        "-de": "KBV Schwerpunkt-Funktionalität Dauerdiagnosen"
                    },
                    "invoiceNumberSchemes": {
                        "complex": "inc",
                        "type": "InvoiceNumberScheme_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.invoiceNumberSchemes' ),
                        "-en": "invoice numbering scheme",
                        "-de": "Rechnungsnummern"
                    },
                    "receiptNumberSchemes": {
                        "complex": "inc",
                        "type": "InvoiceNumberScheme_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.receiptNumberSchemes' ),
                        "-en": "receipt numbering scheme",
                        "-de": "Quittungsnummern"
                    },
                    "bgNumberSchemes": {
                        "complex": "inc",
                        "type": "InvoiceNumberScheme_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.bgNumberSchemes' ),
                        "-en": "bg numbering scheme",
                        "-de": "BG-Rechnungsnummern"
                    },
                    "dunningSchemes": {
                        "complex": "inc",
                        "type": "DunningScheme_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.dunningSchemes' ),
                        "-en": "Dunning",
                        "-de": "Mahnwesen"
                    },
                    "receiptsSchemes": {
                        "complex": "inc",
                        "type": "ReceiptsScheme_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.receiptsSchemes' ),
                        "-en": "Receipts",
                        "-de": "Quittungen"
                    },
                    "padxSettings": {
                        "complex": "inc",
                        "type": "PadxSetting_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.i18n' ),
                        "-en": "PADX settings",
                        "-de": "PADX Einstellungen"
                    },
                    "cashSettings": {
                        "complex": "inc",
                        "type": "CashSetting_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.cashSettings' ),
                        "-en": "Invoice settings",
                        "-de": "Rechnungen Einstellungen"
                    },
                    "qDocuSettings": {
                        "complex": "ext",
                        "type": "QDocuSettings_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.QDocuSettings_T.qDocuSettings' ),
                        "-en": "Q-Docu settings",
                        "-de": "Q-Docu Einstellungen"
                    },
                    "isMedneoCustomer": {
                        "default": false,
                        "type": "Boolean",
                        "-en": "isMedneoCustomer",
                        "-de": "isMedneoCustomer"
                    },
                    "askForCreationOfAdditionalInsurancesAfterCardread": {
                        "default": false,
                        "type": "Boolean",
                        "-en": "askForCreationOfAdditionalInsurancesAfterCardread",
                        "-de": "askForCreationOfAdditionalInsurancesAfterCardread"
                    },
                    "copyPublicInsuranceDataToAdditionalInsurance": {
                        "default": false,
                        "type": "Boolean",
                        "-en": "copyPublicInsuranceDataToAdditionalInsurance",
                        "-de": "copyPublicInsuranceDataToAdditionalInsurance"
                    },
                    "gkvAutoValidationAt": {
                        "type": "Date",
                        "-en": "gkvAutoValidationAt",
                        "-de": "gkvAutoValidationAt"
                    },
                    "pvsAutoValidationAt": {
                        "type": "Date",
                        "-en": "pvsAutoValidationAt",
                        "-de": "pvsAutoValidationAt"
                    },
                    "pvsNeedsApproval": {
                        "default": true,
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.pvsNeedsApproval' ),
                        "-en": "Patient consent to PVS billing is always obtained",
                        "-de": "Patienteneinwilligung zur PVS-Abrechnung wird stets eingeholt"
                    },
                    "createUniqCaseIdentNoOnInvoice": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguratperson-schema.InsuranceStatus_T.createUniqCaseIdentNoOnInvoice' ),
                        "-en": "Use Treatment Identification Number for invoicing (FK 3000)",
                        "-de": "Behandlungsfall-Identifikationsnummer in der Abrechnung verwenden (FK 3000)"
                    },
                    "gkvExclusionList": {
                        "complex": "inc",
                        "type": "ExclusionList_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.gkvExclusionList' ),
                        "-en": "Exclusion list",
                        "-de": "Ausschlussliste "
                    },
                    "gkvCombineCaseFolders": {
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.gkvCombineCaseFolders' ),
                        "-en": "Cross-case rule execution",
                        "-de": "Fallübergreifende Regelausführung"
                    },
                    "gkvCombineScheins": {
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.gkvCombineScheins' ),
                        "-en": "Cross-locations rule execution",
                        "-de": "Betriebsstättenübergreifende Regelausführung"
                    }
                },
                "ExclusionList_T": {
                    "title": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.ExclusionList_T.title' ),
                        "-en": "Title",
                        "-de": "Titel"
                    },
                    "excludeFrom": {
                        "complex": "eq",
                        "type": "ExclusionListExcludeFrom_E",
                        "lib": types
                    },
                    "locations": {
                        "complex": "inc",
                        i18n: i18n( 'invoiceconfiguration-schema.ExclusionList_T.locations' ),
                        validate: "notEmptyArray",
                        "type": "EmployeeLocations_T",
                        "lib": types
                    },
                    "employees": {
                        "complex": "inc",
                        "type": "EmployeeShort_T",
                        "lib": types,
                        validate: "notEmptyArray",
                        i18n: i18n( 'invoiceconfiguration-schema.ExclusionList_T.employees' ),
                        "-en": "Physicians",
                        "-de": "Ärzte"
                    },
                    "codes": {
                        "type": ["String"],
                        validate: "notEmptyArray",
                        i18n: i18n( 'invoiceconfiguration-schema.ExclusionList_T.codes' ),
                        "-en": "Codes",
                        "-de": "Ziffern"
                    }
                },
                "ExclusionListExcludeFrom_E": {
                    "type": ["String"],
                    "default": "VALIDATION",
                    i18n: i18n( 'invoiceconfiguration-schema.ExclusionList_T.excludeFrom' ),
                    "-en": i18n( 'invoiceconfiguration-schema.ExclusionList_T.excludeFrom' ),
                    "-de": i18n( 'invoiceconfiguration-schema.ExclusionList_T.excludeFrom' ),
                    "list": [
                        {
                            "val": "VALIDATION",
                            i18n: i18n( 'invoiceconfiguration-schema.ExclusionListExcludeFrom_E.VALIDATION' ),
                            "-en": "Validation",
                            "-de": "Prüfung"
                        },
                        {
                            "val": "INVOICE",
                            i18n: i18n( 'invoiceconfiguration-schema.ExclusionListExcludeFrom_E.INVOICE' ),
                            "-en": "Invoice",
                            "-de": "Abrechnung"
                        }
                    ]
                },
                "InvoiceConfiguration_CH_T": {
                    "kvgSettings": {
                        "complex": "inc",
                        "type": "KvgSetting_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.KvgSetting_T.i18n' )
                    },
                    "mediportDeliverySettings": {
                        "complex": "inc",
                        "type": "MediportDeliverySettings_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.MediportDeliverySettings_T.i18n' )
                    },
                    "tarmedTaxPointValues": {
                        "complex": "inc",
                        "type": "TarmedTaxPointValue_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.TarmedTaxPointValue_T.tarmedTaxPointValues' )
                    },
                    "tarmedInvoiceFactorValues": {
                        "complex": "inc",
                        "type": "TarmedInvoiceFactorValue_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.TarmedInvoiceFactorValue_T.tarmedInvoiceFactorValues' )
                    },
                    "isMocking": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceFactor_T.isMocking' ),
                        "-en": "Demo mode enable",
                        "-de": "Demomodus aktivieren"
                    },
                    "hasImagingDevice": {
                        "required": false,
                        "default": false,
                        "type": "Boolean"
                    }
                },
                "InvoiceConfiguration_D_T": {},
                "InvoiceFactor_T": {
                    "year": {
                        "required": true,
                        "validate": "year",
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceFactor_T.year' ),
                        "-en": "Year",
                        "-de": "Jahr"
                    },
                    "quarter": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceFactor_T.quarter' ),
                        "-en": "quarter",
                        "-de": "Quartal"
                    },
                    "factor": {
                        "required": true,
                        "validate": "validNumber",
                        "type": "Number",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceFactor_T.factor' ),
                        "-en": "factor",
                        "-de": "Faktor"
                    },
                    "isDefault": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceFactor_T.isDefault' ),
                        "-en": "default value",
                        "-de": "Standardwert"
                    }
                },
                "TarmedTaxPointValue_T": {
                    "law": {
                        "required": true,
                        "type": "String"
                    },
                    "cantonCode": {
                        "required": false,
                        "type": "String"
                    },
                    "cantonShort": {
                        "required": false,
                        "type": "String"
                    },
                    "value": {
                        "required": true,
                        "type": "Number"
                    },
                    "specialValue": {
                        "required": false,
                        "type": "Number"
                    },
                    "specialInsurances": {
                        "required": false,
                        "default": undefined,
                        "type": ["String"]
                    },
                    "validFrom": {
                        "required": true,
                        "type": "Date"
                    },
                    "validUntil": { // If missing the entry is currently valid and the end date is unknown
                        "type": "Date"
                    }
                },
                "TarmedInvoiceFactorValue_T": {
                    "qualiDignity": {
                        "required": true,
                        "type": "String"
                    },
                    "caseTypes": {
                        "required": true,
                        "type": ["String"]
                    },
                    "factor": {
                        "required": true,
                        "type": "Number"
                    }
                },
                "InvoiceNumberScheme_T": {
                    "locationId": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceNumberScheme_T.locationId' ),
                        "-en": "Location",
                        "-de": "Betriebsstätte"
                    },
                    "year": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceNumberScheme_T.year' ),
                        "-en": "Year",
                        "-de": "Jahr"
                    },
                    "nextNumber": {
                        "type": "Number",
                        "validate": "nextNumber",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceNumberScheme_T.nextNumber' ),
                        "-en": "Start Number",
                        "-de": "Zählerstart"
                    },
                    "digits": {
                        "type": "Number",
                        "required": true,
                        "validate": "num",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceNumberScheme_T.digits' ),
                        "-en": "End Number",
                        "-de": "Zählerstellen"
                    }
                },
                "DunningScheme_T": {
                    "locationId": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'invoiceconfiguration-schema.DunningScheme_T.locationId' ),
                        "-en": "Location",
                        "-de": "Betriebsstätte"
                    },
                    "warning1Value": {
                        "type": "Number",
                        "required": true,
                        "default": 0,
                        "validate": "floatNumber",
                        i18n: i18n( 'invoiceconfiguration-schema.DunningScheme_T.warning1Value.i18n' ),
                        "-en": "Warning 1",
                        "-de": "Mahnen 1"
                    },
                    "warning2Value": {
                        "type": "Number",
                        "required": true,
                        "default": 0,
                        "validate": "floatNumber",
                        i18n: i18n( 'invoiceconfiguration-schema.DunningScheme_T.warning2Value' ),
                        "-en": "Warning 2",
                        "-de": "Mahnen 2"
                    },
                    "invoiceDays": {
                        "type": "Number",
                        "validate": "numOrEmpty",
                        i18n: i18n( 'invoiceconfiguration-schema.DunningScheme_T.invoiceDays' ),
                        "-en": "Invoice",
                        "-de": "Rechnung"
                    },
                    "reminderDays": {
                        "type": "Number",
                        "validate": "numOrEmpty",
                        i18n: i18n( 'invoiceconfiguration-schema.DunningScheme_T.reminderDays' ),
                        "-en": "Reminder",
                        "-de": "Erinnern"
                    },
                    "warning1Days": {
                        "type": "Number",
                        "validate": "numOrEmpty",
                        i18n: i18n( 'invoiceconfiguration-schema.DunningScheme_T.warning1Days' ),
                        "-en": "Warning 1",
                        "-de": "Mahnen 1"
                    },
                    "warning2Days": {
                        "type": "Number",
                        "validate": "numOrEmpty",
                        i18n: i18n( 'invoiceconfiguration-schema.DunningScheme_T.warning2Days' ),
                        "-en": "Warning 2",
                        "-de": "Mahnen 2"
                    },
                    "invoiceText": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.DunningScheme_T.invoiceText' ),
                        "-en": "Invoice",
                        "-de": "Rechnung"
                    },
                    "reminderText": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.DunningScheme_T.reminderText' ),
                        "-en": "Erinnern",
                        "-de": "Reminder"
                    },
                    "warning1Text": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.DunningScheme_T.warning1Text' ),
                        "-en": "Warning 1",
                        "-de": "Mahnen 1"
                    },
                    "warning2Text": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.DunningScheme_T.warning2Text' ),
                        "-en": "Warning 2",
                        "-de": "Mahnen 2"
                    }
                },
                "ReceiptsScheme_T": {
                    "locationId": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'invoiceconfiguration-schema.ReceiptsScheme_T.locationId' ),
                        "-en": "Location",
                        "-de": "Betriebsstätte"
                    },
                    "name": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'invoiceconfiguration-schema.ReceiptsScheme_T.name' ),
                        "-en": "name",
                        "-de": "name"
                    },
                    "year": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceNumberScheme_T.year' ),
                        "-en": "Year",
                        "-de": "Jahr"
                    },
                    "nextNumber": {
                        "type": "Number",
                        "required": true,
                        "validate": "num",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceNumberScheme_T.nextNumber' ),
                        "-en": "Start Number",
                        "-de": "Zählerstart"
                    },
                    "digits": {
                        "type": "Number",
                        "required": true,
                        "validate": "num",
                        i18n: i18n( 'invoiceconfiguration-schema.InvoiceNumberScheme_T.digits' ),
                        "-en": "End Number",
                        "-de": "Zählerstellen"
                    }
                },
                "EmployeeLocations_T": {
                    locname: {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'employee-schema.EmployeeLocations_T.locname' ),
                        "-en": "location name",
                        "-de": "Betriebsstättenname"
                    },
                    commercialNo: {
                        "type": "String",
                        i18n: i18n( 'location-schema.Location_T.commercialNo.i18n' ),
                        "-en": "Commercial No.",
                        "-de": "Betriebsstättennr."
                    },
                    countryCode: {
                        "type": "String",
                        i18n: i18n( 'person-schema.Address_T.countryCode' ),
                        "-en": "Country code",
                        "-de": "Ländercode"
                    }
                },
                "EmployeeShort_T": {
                    firstname: {
                        "type": "String",
                        i18n: i18n( 'person-schema.Person_T.firstname.i18n' ),
                        "-en": "First Name",
                        "-de": "Vorname"
                    },
                    lastname: {
                        "type": "String",
                        i18n: i18n( 'person-schema.Person_T.lastname.i18n' ),
                        "-en": "Last Name",
                        "-de": "Nachname"
                    }
                },
                "EmployeeShort_KVG_T": {
                    firstname: {
                        "type": "String",
                        i18n: i18n( 'person-schema.Person_T.firstname.i18n' )
                    },
                    lastname: {
                        "type": "String",
                        i18n: i18n( 'person-schema.Person_T.lastname.i18n' )
                    },
                    "billingRole": {
                        "complex": "eq",
                        "type": "Treatment_CH_T_BillingRole",
                        validate: "EmployeeShort_KVG_T_billingRole",
                        "lib": "activity"
                    }
                },
                "EmployeeOrLocationShort_KVG_T": {
                    name: {
                        "type": "String"
                    },
                    glnNumber: {
                        "type": "String"
                    }
                },
                "CashSetting_T": {
                    "cashSettingTitle": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.padxSettingTitle' ),
                        "-en": "Title",
                        "-de": "Titel"
                    },
                    "locations": {
                        "complex": "inc",
                        validate: "PadxSetting_T_locationsOrPhysicians",
                        "type": "EmployeeLocations_T",
                        "lib": types
                    },
                    "employees": {
                        "complex": "inc",
                        "type": "EmployeeShort_T",
                        "lib": types,
                        validate: "PadxSetting_T_locationsOrPhysicians",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.physicians' ),
                        "-en": "Physicians",
                        "-de": "Ärzte"
                    }
                },
                "QDocuSettings_T": {
                    "tPackerUsername": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.QDocuSettings_T.tPackerUsername' ),
                        "-en": "Username TPacker",
                        "-de": "Username TPacker"
                    },
                    "tPackerPassword": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.QDocuSettings_T.tPackerPassword' ),
                        "-en": "Password TPacker",
                        "-de": "Password TPacker"
                    },
                    "qsDataKey": {
                        "complex": "eq",
                        "default": "Pub_key_Bundesauswertungsstelle_GFL_ZK_PRODUKTIV.pub",
                        "type": "qsDataKey_E",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.QDocuSettings_T.qsDataKey' ),
                        "-en": "Key",
                        "-de": "Schlüssel"
                    },
                    "patientKey": {
                        "complex": "eq",
                        "default": "Pub_key_Vertrauensstelle_QS_PRODUKTIV.pub",
                        "lib": types,
                        "type": "patientKey_E",
                        i18n: i18n( 'invoiceconfiguration-schema.QDocuSettings_T.patientKey' ),
                        "-en": "Key",
                        "-de": "Schlüssel"
                    }
                },
                "qsDataKey_E": {
                    "type": "String",
                    list: [
                        {
                            "val": "Pub_key_Bundesauswertungsstelle_GFL_ZK_PRODUKTIV.pub",
                            "-de": "Pub_key_Bundesauswertungsstelle_GFL_ZK_PRODUKTIV.pub"
                        },
                        {
                            "val": "",
                            "-de": "Bitte wählen …",
                            i18n: i18n( 'activity-schema.QDocuZytbefundvorunt_E.' ),
                            "-en": "Please Choose …"
                        },
                        {
                            "val": "Pub_key_Bundesauswertungsstelle_GFL_ZK_TEST.pub",
                            "-de": "Pub_key_Bundesauswertungsstelle_GFL_ZK_TEST.pub"
                        }
                    ]
                },
                "patientKey_E": {
                    "type": "String",
                    list: [
                        {
                            "val": "Pub_key_Vertrauensstelle_QS_PRODUKTIV.pub",
                            "-de": "Pub_key_Vertrauensstelle_QS_PRODUKTIV.pub"
                        },
                        {
                            "val": "",
                            "-de": "Bitte wählen …",
                            i18n: i18n( 'activity-schema.QDocuZytbefundvorunt_E.' ),
                            "-en": "Please Choose …"
                        },
                        {
                            "val": "Pub_key_Vertrauensstelle_QS_TEST.pub",
                            "-de": "Pub_key_Vertrauensstelle_QS_TEST.pub"
                        }
                    ]
                },
                "KvgSetting_T": {
                    "kvgSettingTitle": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'invoiceconfiguration-schema.KvgSetting_T.kvgSettingTitle' )
                    },
                    "law": {
                        "type": "String",
                        "default": "KVG",
                        "required": true
                    },
                    "locations": {
                        "complex": "inc",
                        "type": "EmployeeLocations_T",
                        validate: "KvgSetting_T_locations",
                        i18n: i18n( 'invoiceconfiguration-schema.KvgSetting_T.locations' ),
                        "lib": types
                    },
                    "employees": {
                        "complex": "inc",
                        "type": "EmployeeShort_KVG_T",
                        validate: "KvgSetting_T_employees",
                        i18n: i18n( 'invoiceconfiguration-schema.KvgSetting_T.physicians' ),
                        "lib": types
                    },
                    "billerEqualToProvider": {
                        "type": "Boolean",
                        "default": true,
                        validate: "KvgSetting_T_billerEqualToProvider",
                        i18n: i18n( 'invoiceconfiguration-schema.KvgSetting_T.billerEqualToProvider' )
                    },
                    "biller": {
                        "complex": "eq",
                        "type": "EmployeeOrLocationShort_KVG_T",
                        i18n: i18n( 'invoiceconfiguration-schema.KvgSetting_T.biller' ),
                        "lib": types
                    }
                },
                "MediportDeliverySettings_T": {
                    "mediportBasePath": {
                        "type": "String",
                        "apic": {v: 2, queryParam: false},
                        i18n: i18n( 'invoiceconfiguration-schema.MediportDeliverySettings_T.mediportBasePath' )
                    },
                    "sendFlowId": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.MediportDeliverySettings_T.sendFlowId' )
                    },
                    "receiveFlowId": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.MediportDeliverySettings_T.receiveFlowId' )
                    },
                    "deviceServer": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.MediportDeliverySettings_T.deviceServer' )
                    }
                },
                "PadxSetting_T": {
                    "padxSettingTitle": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.padxSettingTitle' ),
                        "-en": "Title",
                        "-de": "Titel"
                    },
                    "locations": {
                        "complex": "inc",
                        validate: "PadxSetting_T_locationsOrPhysicians",
                        "type": "EmployeeLocations_T",
                        "lib": types
                    },
                    "employees": {
                        "complex": "inc",
                        "type": "EmployeeShort_T",
                        "lib": types,
                        validate: "PadxSetting_T_locationsOrPhysicians",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.physicians' ),
                        "-en": "Physicians",
                        "-de": "Ärzte"
                    },
                    "padxSettingTitleRef": {
                        "type": "String",
                        //"required": true,
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.padxSettingTitleRef' ),
                        "-en": "padxSettingTitleRef",
                        "-de": "padxSettingTitleRef"
                    },
                    "recipientName": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.recipientName' ),
                        "-en": "recipient name",
                        "-de": "Empfänger-Name"
                    },
                    "recipientCustomerNo": {
                        "type": "String",
                        validate: "PadxSetting_T_recipientCustomerNo",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.recipientCustomerNo' ),
                        "-en": "recipient customer number",
                        "-de": "Empfänger-Kundennummer"
                    },
                    "recipientIKNR": {
                        "type": "Number",
                        validate: "PadxSetting_T_recipientIKNR",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.recipientIKNR' ),
                        "-en": "recipient INKR",
                        "-de": "Empfänger-IKNR"
                    },
                    "recipientRZID": {
                        "type": "String",
                        validate: "PadxSetting_T_recipientRZID",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.recipientRZID' ),
                        "-en": "recipient RZID",
                        "-de": "Empfänger-RZID"
                    },
                    "proxyRecipientName": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.proxyRecipientName' ),
                        "-en": "proxy recipient name",
                        "-de": "Zwischenstelle Empfänger-Name"
                    },
                    "proxyRecipientCustomerNo": {
                        "type": "String",
                        validate: "PadxSetting_T_proxyRecipientCustomerNo",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.proxyRecipientCustomerNo' ),
                        "-en": "proxy recipient customer number",
                        "-de": "Zwischenstelle Empfänger-Kundennummer"
                    },
                    "proxyRecipientIKNR": {
                        "type": "Number",
                        validate: "PadxSetting_T_proxyRecipientIKNR",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.proxyRecipientIKNR' ),
                        "-en": "proxy recipient INKR",
                        "-de": "Zwischenstelle Empfänger-IKNR"
                    },
                    "proxyRecipientRZID": {
                        "type": "Number",
                        validate: "PadxSetting_T_proxyRecipientRZID",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.proxyRecipientRZID' ),
                        "-en": "proxy recipient RZID",
                        "-de": "Zwischenstelle Empfänger-RZID"
                    },
                    "senderName": {
                        "type": "String",
                        "required": true,
                        validate: "PadxSetting_T_senderName",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.senderName' ),
                        "-en": "sender name",
                        "-de": "Absender-Name"
                    },
                    "senderCustomerNo": {
                        "type": "String",
                        "required": true,
                        validate: "PadxSetting_T_senderCustomerNo",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.senderCustomerNo' ),
                        "-en": "sender customer number",
                        "-de": "Absender-Kundennummer"
                    },
                    "senderIKNR": {
                        "type": "Number",
                        validate: "PadxSetting_T_senderIKNR",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.senderIKNR' ),
                        "-en": "sender INKR",
                        "-de": "Absender-IKNR"
                    },
                    "senderRZID": {
                        "type": "Number",
                        validate: "PadxSetting_T_senderRZID",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.senderRZID' ),
                        "-en": "sender RZID",
                        "-de": "Absender-RZID"
                    },
                    "senderNameAdd": {
                        "complex": "inc",
                        "type": "PadxSenderNameAdd_T",
                        "lib": types,
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.senderNameAdd' ),
                        "-en": "additional sender names",
                        "-de": "Zusätzliche Absender-Namen"
                    },
                    "senderUstidnr": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.senderUstidnr' ),
                        "-en": "sender Umsatzsteueridentifikationsnummer",
                        "-de": "Absender Umsatzsteueridentifikationsnummer"
                    },
                    "senderCreditorId": {
                        "type": "String",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.senderCreditorId' ),
                        "-en": "sender creditor",
                        "-de": "Absender Gläubiger"
                    },
                    "encryption": {
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.encryption' ),
                        "-en": "use encryption",
                        "-de": "Verschlüsselung verwenden"
                    },
                    "receiptAddress": {
                        "type": "String",
                        validate: "PadxSetting_T_receiptAddress",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.receiptAddress' ),
                        "-en": "receipt e-mail address",
                        "-de": "Empfangsquittung E-Mail"
                    },
                    "invoiceNotice": {
                        "type": "String",
                        validate: "PadxSetting_T_invoiceNotice",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.invoiceNotice' ),
                        "-en": "Information text for entire data set",
                        "-de": "Hinweistext für die gesamte Datenlieferung"
                    },
                    "contacts": {
                        "complex": "inc",
                        "type": "Communication_T",
                        "lib": "person",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.contacts' ),
                        "-en": "PADX additional contact data",
                        "-de": "PADX zusätzliche Kontaktdaten"
                    },
                    "senderAddress": {
                        "complex": "ext",
                        "type": "Address_T",
                        "lib": "person",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.senderAddress' ),
                        "-en": "PADX sender address",
                        "-de": "PADX Absender Adresse"
                    },
                    "oneClickServer": {
                        "type": "String",
                        "default": "www.padtransfer.de",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.oneClickServer' ),
                        "-en": "PAD transfer server address",
                        "-de": "PAD transfer Serveradresse"
                    },
                    "oneClickName": {
                        "type": "String",
                        "default": "",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.oneClickName' ),
                        "-en": "PAD transfer billing name",
                        "-de": "PAD transfer Abrechnungsname"
                    },
                    "oneClickPass": {
                        "type": "String",
                        "default": "",
                        validate: "PadxSetting_T_oneClickPass",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.oneClickPass' ),
                        "-en": "PAD transfer billing password",
                        "-de": "PAD transfer Abrechnungspasswort"
                    },
                    "participantName": {
                        "type": "String",
                        "validate": "PadxSetting_T_participantString",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.participantName' ),
                        "-en": "Name of the participant",
                        "-de": "Name des Beteiligten"
                    },
                    "participantCustomerNumber": {
                        "type": "String",
                        "validate": "PadxSetting_T_participantString",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.participantCustomerNumber' ),
                        "-en": "Customer no of the participant",
                        "-de": "Kundennummer des Beteiligten"
                    },
                    "participantValueType": {
                        "type": "String",
                        "default": "percent",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.participantValueType' ),
                        "-en": "Type of Value",
                        "-de": "Beteiligungsbetrag Typ"
                    },
                    "participantValue": {
                        "type": "Number",
                        "validate": "PadxSetting_T_participantNumber",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.participantValue' ),
                        "-en": "Value of the share",
                        "-de": "Beteiligungsbetrag"
                    },
                    "AISInvoiceNumber": {
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.AISInvoiceNumber' ),
                        "-en": "Invoice no.",
                        "-de": "AIS Rechnungsnummer"
                    },
                    "AISAmount": {
                        "type": "Boolean",
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSetting_T.AISAmount' ),
                        "-en": "Total of invoice",
                        "-de": "AIS Endbetrag"
                    }
                },
                "PadxSenderNameAdd_T": {
                    "name": {
                        "default": "",
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'invoiceconfiguration-schema.PadxSenderNameAdd_T.name' ),
                        "-en": 'Name',
                        "-de": 'Name'
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        function getDefaultData() {
            return template;
        }

        function getReadOnlyFields( data ) {
            var
                roPaths = [],
                invoiceNumberSchemes = data && data.invoiceNumberSchemes,
                receiptNumberSchemes = data && data.receiptNumberSchemes,
                receiptsSchemes = data && data.receiptsSchemes;

            Y.each( invoiceNumberSchemes, function( item, i ) {
                roPaths.push( 'invoiceNumberSchemes.' + i + '.nextNumber' );
            } );

            Y.each( receiptNumberSchemes, function( item, i ) {
                roPaths.push( 'receiptNumberSchemes.' + i + '.nextNumber' );
            } );

            Y.each( receiptsSchemes, function( item, i ) {
                roPaths.push( 'receiptsSchemes.' + i + '.nextNumber' );
            } );

            return roPaths;
        }

        function isTreatmentExcluded( fromWhat, invoiceConfig, treatment ) {
            return ((invoiceConfig && invoiceConfig.gkvExclusionList) || []).some( function( exclusionList ) {
                var listApplies = exclusionList.excludeFrom.indexOf( fromWhat ) !== -1,
                    listMatchesLocation = exclusionList.locations.some( function( location ) {
                        return location._id.toString() === treatment.locationId.toString();
                    } ),
                    listMatchesEmployee = exclusionList.employees.some( function( employee ) {
                        return employee._id.toString() === treatment.employeeId.toString();
                    } ),
                    listMatchesCode = exclusionList.codes.some( function( code ) {
                        return code === treatment.code;
                    } );
                return listApplies && listMatchesLocation && listMatchesEmployee && listMatchesCode;
            } );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [template],
            name: NAME,

            getReadOnlyFields: getReadOnlyFields,

            getDefaultData: getDefaultData,
            isTreatmentExcluded: isTreatmentExcluded,

            cacheQuery: true
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'oop',
            'dcschemaloader',
            'doccirrus',
            'dccommonutils',
            'dcvalidations',
            'activity-schema'
        ]
    }
);
