/**
 * User: dcdev
 * Date: 6/11/20  5:01 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
'use strict';
var
    scheinDate = new Date(),
    scheinYear,
    scheinQuarter;

// ensure the schein date is in the past (compared to the other entries being created)
scheinDate.setHours( scheinDate.getHours() - 1 );
scheinYear = scheinDate.getYear() + 1900;
scheinQuarter = (Math.floor( scheinDate.getMonth() / 3 )) + 1;

var
    contractWithLinkedActivities = {
        "_id": "54eb41b878382da86381aaa1",
        "actType": "AMTSSCHEIN",
        "timestamp": scheinDate,
        "patientId": "54be764fc404c1d77a286d4d",
        "locationId": "54eb41b878382da863181d3b",
        "employeeId": "56f5382c37644678aa923d92",
        "userContent": "",
        "comment": "API2TestingActivity",
        "activities": [
            "54eb41b878382da863810001",
            "54eb41b878382da863810002",
            "54eb41b878382da863810003",
            "54eb41b878382da863810005",
            "54eb41b878382da863810006"
        ],
        "apkState": "IN_PROGRESS",
        "attachedMedia": "",
        "attachedMediaTags": "",
        "attachments": [],
        "backupEmployeeIds": "",
        "content": "",
        "employeeName": "",
        "explanations": "",
        "partnerInfo": "",
        "status": "",
        "subType": ""
    },
    contractJustForLocationValidContract = {
        "_id": "54eb41b878382da863000001",
        "actType": "SCHEIN",
        "timestamp": scheinDate,
        "patientId": "54be764fc404c1d77a286d4d",
        "locationId": "54eb41b878382da863181d3b",
        "employeeId": "56f5382c37644678aa923d92",
        "userContent": "",
        "treatmentType": "AMBULANT",
        "fk4217": "",
        "fk4241": "",
        "fk4236": false,
        "fk4206": null,
        "fk4123": "",
        "fk4125to": null,
        "fk4125from": null,
        "fk4126": "",
        "fk4124": "",
        "scheinSubgroup": "00",
        "scheinType": "0101",
        "scheinBillingArea": "00",
        "scheinYear": scheinYear,
        "scheinQuarter": scheinQuarter,
        "fk4219": "",
        "scheinNotes": "Blabla",
        "scheinFinding": "",
        "scheinDiagnosis": "",
        "scheinOrder": "",
        "scheinSpecialisation": "",
        "scheinEstablishment": "",
        "scheinRemittor": "",
        "explanations": "",
        "comment": "API2TestingActivity"
    },
    linkedActivityMEDDATA = {
        "_id": "54eb41b878382da863810001",
        "actType": "MEDDATA",
        "activities": [],
        "apkState": "IN_PROGRESS",
        "attachedMedia": [],
        "attachedMediaTags": [],
        "attachments": [],
        "backupEmployeeIds": [],
        "comment": "API2TestingActivity",
        "content": "",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "employeeName": "Last name, First name",
        "explanations": "",
        "partnerInfo": "",
        "patientId": "54be764fc404c1d77a286d4d",
        "status": "VALID",
        "subType": "",
        "timestamp": new Date(),
        "userContent": ""
    },
    linkedActivityLABDATA = {
        "_id": "54eb41b878382da863810002",
        "actType": "LABDATA",
        "activities": [],
        "apkState": "IN_PROGRESS",
        "attachedMedia": [],
        "attachedMediaTags": [],
        "attachments": [],
        "backupEmployeeIds": [],
        "comment": "API2TestingActivity",
        "content": "",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "employeeName": "Last name, First name",
        "explanations": "",
        "partnerInfo": "",
        "patientId": "54be764fc404c1d77a286d4d",
        "status": "VALID",
        "subType": "",
        "timestamp": new Date(),
        "userContent": ""
    },
    linkedActivityEXTERNAL = {
        "_id": "54eb41b878382da863810003",
        "actType": "EXTERNAL",
        "activities": [],
        "apkState": "IN_PROGRESS",
        "attachedMedia": [],
        "attachedMediaTags": [],
        "attachments": [],
        "backupEmployeeIds": [],
        "comment": "API2TestingActivity",
        "content": "",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "employeeName": "Last name, First name",
        "explanations": "",
        "partnerInfo": "",
        "patientId": "54be764fc404c1d77a286d4d",
        "status": "VALID",
        "subType": "",
        "timestamp": new Date(),
        "userContent": ""
    },
    linkedActivityMEDICATION = {
        "_id": "54eb41b878382da863810005",
        "actType": "MEDICATION",
        "activities": [],
        "apkState": "IN_PROGRESS",
        "attachedMedia": [],
        "attachedMediaTags": [],
        "attachments": [],
        "backupEmployeeIds": [],
        "comment": "API2TestingActivity",
        "content": "",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "employeeName": "Last name, First name",
        "explanations": "",
        "partnerInfo": "",
        "patientId": "54be764fc404c1d77a286d4d",
        "status": "VALID",
        "subType": "",
        "timestamp": new Date(),
        "userContent": "",
        "adherence": true,
        "catalog": null,
        "catalogShort": "MMI",
        "editor": [],
        "forInsuranceType": null,
        "phNLabel": "unit test Medication",
        "phPZN": "09710269",
        "phAsNeededMedication": false,
        "phContinuousMed": true,
        "phSampleMed": true,
        "phCompany": "Test Company AG",
        "dosis": "4mg"
    },
    linkedActivityDIAGNOSIS = {
        "_id": "54eb41b878382da863810006",
        "actType": "DIAGNOSIS",
        "activities": [],
        "apkState": "IN_PROGRESS",
        "attachedMedia": [],
        "attachedMediaTags": [],
        "attachments": [],
        "backupEmployeeIds": [],
        "comment": "API2TestingActivity",
        "content": "",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "employeeName": "Last name, First name",
        "explanations": "",
        "partnerInfo": "",
        "patientId": "54be764fc404c1d77a286d4d",
        "status": "VALID",
        "subType": "",
        "timestamp": new Date(),
        "userContent": "",
        "patientName": "Test Mustermann",
        "code": "M50.7",
        "diagnosisDerogation": "",
        "diagnosisSite": "BOTH",
        "diagnosisTreatmentRelevance": "TREATMENT_RELEVANT",
        "diagnosisType": "ACUTE",
        "diagnosisCert": "CONFIRM",
        "forInsuranceType": "",
        "catalogShort": "ICD-10",
        "catalog": true
    },
    linkedActivityKBVMEDICATIONPLAN = {
        "_id": "54eb41b878382da863810007",
        "actType": "KBVMEDICATIONPLAN",
        "activities": [
            "54eb41b878382da863810005"
        ],
        "apkState": "IN_PROGRESS",
        "attachedMedia": [],
        "attachedMediaTags": [],
        "attachments": [],
        "backupEmployeeIds": [],
        "comment": "API2TestingActivity",
        "content": "",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "employeeName": "Last name, First name",
        "explanations": "",
        "partnerInfo": "",
        "patientId": "54be764fc404c1d77a286d4d",
        "status": "VALID",
        "subType": "",
        "timestamp": new Date(),
        "userContent": "",
        "patientName": "Test Mustermann",
        "referencedBy": [],
        "patientGender": "FEMALE",
        "medicationPlanEntries": [
            {
                "_id": "54eb41b878382da863810005",
                "actType": "MEDICATION",
                "activities": [],
                "apkState": "IN_PROGRESS",
                "attachedMedia": [],
                "attachedMediaTags": [],
                "attachments": [],
                "backupEmployeeIds": [],
                "comment": "API2TestingActivity",
                "content": "",
                "employeeId": "56f5382c37644678aa923d92",
                "locationId": "54eb41b878382da863181d3b",
                "employeeName": "Last name, First name",
                "explanations": "",
                "partnerInfo": "",
                "patientId": "54be764fc404c1d77a286d4d",
                "status": "VALID",
                "subType": "",
                "timestamp": new Date(),
                "userContent": "",
                "adherence": true,
                "caseFolderId": "312830f4370c4045538fba4c",
                "catalog": null,
                "catalogShort": "MMI",
                "editor": [],
                "forInsuranceType": null,
                "phNLabel": "unit test Medication",
                "phPZN": "09710269",
                "phContinuousMed": true,
                "phSampleMed": true,
                "phCompany": "Test Company AG",
                "dosis": "4mg",
                "phForm": "Filmtbl.",
                "phPackSize": "10 st",
                "phPackQuantity": 1,
                "phPriceSale": 13.14,
                "phRefundAmount": null,
                "phPriceRecommended": null,
                "phPatPay": 5,
                "phPatPayHint": "AVP<50,00 => ZuZa=5,00",
                "phFixedPay": 13.38,
                "phAtc": [
                    "J01CA04"
                ],
                "phOnly": false,
                "phTer": false,
                "phTrans": false,
                "phImport": false,
                "phNegative": false,
                "phLifeStyle": false,
                "phLifeStyleCond": false,
                "phAMR": [],
                "phGBA": false,
                "phDisAgr": false,
                "phDisAgrAlt": false,
                "phMed": false,
                "phPrescMed": false,
                "phBTM": false,
                "phRecipeOnly": true,
                "phOTC": false,
                "phOTX": false,
                "phARV": false,
                "phCheaperPkg": true,
                "hasVat": false,
                "vat": 0,
                "phDosisMorning": "0",
                "phDosisAfternoon": "0",
                "phDosisEvening": "0",
                "phDosisNight": "0",
                "phDosisType": "TEXT",
                "phAsNeededMedication": false,
                "phUnit": "",
                "phNote": "",
                "phReason": "",
                "phSelfMedication": false,
                "phSalesStatus": "ONMARKET",
                "phNormSize": "1",
                "phHeader": "",
                "isPrescribed": false,
                "isDispensed": false,
                "isArrived": true,
                "orderId": null,
                "phGTIN": "",
                "insuranceDescription": "",
                "insuranceCode": "",
                "phUnitDescription": "",
                "phForeignUnit": "",
                "source": "",
                "phAMRContent": [],
                "phIngr": [
                    {
                        "_id": "5eaaa56762695a2eb23c1cae",
                        "code": 279,
                        "name": "Amoxicillin trihydrat",
                        "shortName": "Amoxicillin",
                        "strength": "1.147,91 mg"
                    }
                ],
                "phFormCode": "FTA",
                "phARVContent": [],
                "type": "MEDICATION",
                "medicationRef": "54eb41b878382da863810005"
            }
        ]
    },
    linkedActivityTREATMENT = {
        "_id": "54eb41b878382da863810008",
        "actType": "TREATMENT",
        "status": "VALID",
        "attachments": [],
        "attachedMediaTags": [],
        "subType": "",
        "backupEmployeeIds": [],
        "userContent": "Digitaluntersuchung des Mastdarms und/oder der Prostata",
        "partnerInfo": "",
        "explanations": "",
        "activities": [],
        "referencedBy": [],
        "formId": "",
        "formVersion": "",
        "apkState": "IN_PROGRESS",
        "scheinOrder": "",
        "scheinDiagnosis": "",
        "countryMode": [
        "D"
    ],
        "fk5037": "",
        "treatmentCategory": "",
        "divisionCode": null,
        "divisionText": "",
        "anaesthesiaText": "",
        "medicalText": "",
        "technicalText": "",
        "taxPoints": 0,
        "medicalTaxPoints": 0,
        "technicalTaxPoints": 0,
        "assistanceTaxPoints": 0,
        "medicalScalingFactor": 1,
        "technicalScalingFactor": 1,
        "treatmentTime": 0,
        "preparationAndFollowUpTime": 0,
        "reportTime": 0,
        "roomOccupancyTime": 0,
        "rotationTime": 0,
        "assistanceQuantity": 0,
        "benefitsText": "",
        "billingRole": [
        "MEDICAL",
        "TECHNICAL"
    ],
        "treatmentTypeCh": "AMBULATORY",
        "sideMandatory": false,
        "price": 8.04,
        "displayPrice": "0",
        "bstrReferenceCode": "",
        "tariffType": "",
        "areTreatmentDiagnosesBillable": "1",
        "billingFactorValue": "2.30",
        "catalog": true,
        "forInsuranceType": "",
        "numberOfCopies": 1,
        "catalogShort": "GOÄ",
        "vat": 0,
        "attachedMedia": [],
        "timestamp": "2020-11-27T08:49:14.947Z",
        "patientId": "56f5382c37644678aa923d92",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "content": "Digitaluntersuchung des Mastdarms und/oder der Prostata",
        "comment": "Digitaluntersuchung Mastdarm und/oder Prostata",
        "editor": [
        {
            "_id": "5fc0bda5fc516546950116a3",
            "name": "Stefan Riebel",
            "initials": "SR"
        },
        {
            "_id": "5fc0bdba9c274d4687d940d5",
            "name": "Stefan Riebel",
            "initials": "SR"
        },
        {
            "_id": "5fc0bdcfb4e39846926a8ad5",
            "name": "Stefan Riebel",
            "initials": "SR"
        }
    ],
        "u_extra": {
            "bewertung_liste": [
                {
                    "value": "60",
                    "unit": "Punkte",
                    "valuta": {
                        "key": "1",
                        "value": "Punkte"
                    },
                    "factor": 5.82873
                },
                {
                    "value": "3.497238",
                    "unit": "Euro",
                    "valuta": null,
                    "factor": 5.82873
                }
            ],
                "nebenkosten": {
                "allgemeinkosten": "3.07",
                    "allgemeinkostenValuta": {
                    "key": "2",
                        "value": "Betrag in Euro"
                },
                "sachkosten": "3.07",
                    "sachkostenValuta": {
                    "key": "2",
                        "value": "Betrag in Euro"
                },
                "vollkosten": "6.08",
                    "vollkostenValuta": {
                    "key": "2",
                        "value": "Betrag in Euro"
                },
                "besondere_kosten": "0.00",
                    "besondere_kostenValuta": {
                    "key": "2",
                        "value": "Betrag in Euro"
                }
            },
            "rechnungsfaktor": {
                "privatversicherte": "2.30",
                    "bahnbeamte_1-3": "2.20",
                    "bahnbeamte_unfall": "1.85",
                    "postbeamte_b": "1.90",
                    "postbeamte_unfall": "1.85",
                    "bundespolizei_ambulant": "2.20",
                    "bundespolizei_stationär": "2.30",
                    "bundeswehr_ambulant": "1.70",
                    "bundeswehr_stationär": "2.20",
                    "entschaedigungsamt_berlin": "1.30",
                    "pkv_standard": "1.80",
                    "knappschaft": "1.95",
                    "pkv_student": "1.70",
                    "pkv_basis": "1.20"
            },
            "leistung": {
                "art": "AL",
                    "typ": "0"
            },
            "unzeit_liste": [],
                "berichtspflicht": false,
                "administrative_gender_cd": "0",
                "ausschluss_liste": [
                {
                    "value": "1",
                    "unit": "1",
                    "tof": 0,
                    "gnr": [
                        {
                            "seq": "28"
                        },
                        {
                            "seq": "435"
                        }
                    ]
                }
            ],
            "kap_ausschluss_liste": [],
            "anzahlbedingung_liste": [],
            "altersbedingung_liste": [],
            "grundleistungen_liste": []
        },
        "fk5012Set": [],
        "fk5035Set": [],
        "fk5036Set": [],
        "code": "11",
        "unit": "Euro",
        "employeeName": "Last name, First name"
    },
    caseFolder = {
        "_id" : "312830f4370c4045538fba4c",
        "disabled": false,
        "merged": false,
        "patientId": "54be764fc404c1d77a286d4d",
        "title": "API Test Selfpayer",
        "type": "SELFPAYER",
        "additionalType": "AMTS"
    };

module.exports = {
    caseFolder: {
        getData: function() {
            return JSON.parse( JSON.stringify( caseFolder ) );
        },
        putParams: {data: caseFolder}
    },
    contractJustForLocationValidContract: {
        getData: function() {
            return JSON.parse( JSON.stringify( contractJustForLocationValidContract ) );
        },
        putParams: {data: contractJustForLocationValidContract}
    },
    contractWithLinkedData: {
        getData: function() {
            return JSON.parse( JSON.stringify( contractWithLinkedActivities ) );
        },
        putParams: {data: contractWithLinkedActivities}
    },
    linkedActivityDataMEDDATA: {
        getData: function() {
            return JSON.parse( JSON.stringify( linkedActivityMEDDATA ) );
        },
        putParams: {data: linkedActivityMEDDATA}
    },
    linkedActivityDataLABDATA: {
        getData: function() {
            return JSON.parse( JSON.stringify( linkedActivityLABDATA ) );
        },
        putParams: {data: linkedActivityLABDATA}
    },
    linkedActivityDataEXTERNAL: {
        getData: function() {
            return JSON.parse( JSON.stringify( linkedActivityEXTERNAL ) );
        },
        putParams: {data: linkedActivityEXTERNAL}
    },
    linkedActivityDataMEDICATION: {
        getData: function() {
            return JSON.parse( JSON.stringify( linkedActivityMEDICATION ) );
        },
        putParams: {data: linkedActivityMEDICATION}
    },
    linkedActivityDataDIAGNOSIS: {
        getData: function() {
            return JSON.parse( JSON.stringify( linkedActivityDIAGNOSIS ) );
        },
        putParams: {data: linkedActivityDIAGNOSIS}
    },
    linkedActivityDataTREATMENT: {
        getData: function() {
            return JSON.parse( JSON.stringify( linkedActivityTREATMENT ) );
        },
        putParams: {data: linkedActivityTREATMENT}
    },
    linkedActivityDataKBVMEDICATIONPLAN: {
        getData: function() {
            return JSON.parse( JSON.stringify( linkedActivityKBVMEDICATIONPLAN ) );
        },
        putParams: {
            data: {
                kbvMedicationPlan: linkedActivityKBVMEDICATIONPLAN,
                createdMedications: [
                    {
                        "_id": "54eb41b878382da863810005",
                        "actType": "MEDICATION",
                        "activities": [],
                        "apkState": "IN_PROGRESS",
                        "attachedMedia": [],
                        "attachedMediaTags": [],
                        "attachments": [],
                        "backupEmployeeIds": [],
                        "comment": "API2TestingActivity",
                        "content": "",
                        "employeeId": "56f5382c37644678aa923d92",
                        "locationId": "54eb41b878382da863181d3b",
                        "employeeName": "Last name, First name",
                        "explanations": "",
                        "partnerInfo": "",
                        "patientId": "54be764fc404c1d77a286d4d",
                        "status": "VALID",
                        "subType": "",
                        "timestamp": new Date(),
                        "userContent": "",
                        "adherence": true,
                        "caseFolderId": "312830f4370c4045538fba4c",
                        "catalog": null,
                        "catalogShort": "MMI",
                        "editor": [],
                        "forInsuranceType": null,
                        "phNLabel": "unit test Medication",
                        "phPZN": "09710269",
                        "phContinuousMed": true,
                        "phSampleMed": true,
                        "phCompany": "Test Company AG",
                        "dosis": "4mg",
                        "phForm": "Filmtbl.",
                        "phPackSize": "10 st",
                        "phPackQuantity": 1,
                        "phPriceSale": 13.14,
                        "phRefundAmount": null,
                        "phPriceRecommended": null,
                        "phPatPay": 5,
                        "phPatPayHint": "AVP<50,00 => ZuZa=5,00",
                        "phFixedPay": 13.38,
                        "phAtc": [
                            "J01CA04"
                        ],
                        "phOnly": false,
                        "phTer": false,
                        "phTrans": false,
                        "phImport": false,
                        "phNegative": false,
                        "phLifeStyle": false,
                        "phLifeStyleCond": false,
                        "phAMR": [],
                        "phGBA": false,
                        "phDisAgr": false,
                        "phDisAgrAlt": false,
                        "phMed": false,
                        "phPrescMed": false,
                        "phBTM": false,
                        "phRecipeOnly": true,
                        "phOTC": false,
                        "phOTX": false,
                        "phARV": false,
                        "phCheaperPkg": true,
                        "hasVat": false,
                        "vat": 0,
                        "phDosisMorning": "0",
                        "phDosisAfternoon": "0",
                        "phDosisEvening": "0",
                        "phDosisNight": "0",
                        "phDosisType": "TEXT",
                        "phAsNeededMedication": false,
                        "phUnit": "",
                        "phNote": "",
                        "phReason": "",
                        "phSelfMedication": false,
                        "phSalesStatus": "ONMARKET",
                        "phNormSize": "1",
                        "phHeader": "",
                        "isPrescribed": false,
                        "isDispensed": false,
                        "isArrived": true,
                        "orderId": null,
                        "phGTIN": "",
                        "insuranceDescription": "",
                        "insuranceCode": "",
                        "phUnitDescription": "",
                        "phForeignUnit": "",
                        "source": "",
                        "phAMRContent": [],
                        "phIngr": [
                            {
                                "_id": "5eaaa56762695a2eb23c1cae",
                                "code": 279,
                                "name": "Amoxicillin trihydrat",
                                "shortName": "Amoxicillin",
                                "strength": "1.147,91 mg"
                            }
                        ],
                        "phFormCode": "FTA",
                        "phARVContent": [],
                        "type": "MEDICATION",
                        "medicationRef": "54eb41b878382da863810005"
                    }
                ]
            }
        },
        getPostResult: function() {
            return JSON.parse( JSON.stringify( linkedActivityKBVMEDICATIONPLAN ) );
        },
        getDeleteResult: function() {
            let
                deleteResultForMedication = JSON.parse( JSON.stringify( this.putParams.data.createdMedications ) ),
                addedKeys = [
                    "code",
                    "employeeInitials",
                    "formId",
                    "formVersion",
                    "referencedBy",
                    "sourceType"
                ],
                removedKeys = [
                    "type",
                    "vat",
                    "phUnitDescription",
                    "hasVat",
                    "insuranceCode",
                    "insuranceDescription",
                    "isArrived",
                    "isDispensed",
                    "isPrescribed",
                    "medicationRef",
                    "orderId",
                    "phAMR",
                    "phAMRContent",
                    "phARV",
                    "phARVContent",
                    "phBTM",
                    "phCheaperPkg",
                    "phDisAgr",
                    "phDisAgrAlt",
                    "phFixedPay",
                    "phForeignUnit",
                    "phFormCode",
                    "phGBA",
                    "phGTIN",
                    "phHeader",
                    "phImport",
                    "phLifeStyle",
                    "phLifeStyleCond",
                    "phMed",
                    "phNegative",
                    "phNormSize",
                    "phOTC",
                    "phOTX",
                    "phOnly",
                    "phPackQuantity",
                    "phPackSize",
                    "phPatPay",
                    "phPatPayHint",
                    "phPrescMed",
                    "phPriceRecommended",
                    "phPriceSale",
                    "phRecipeOnly",
                    "phRefundAmount",
                    "phSelfMedication",
                    "phTer",
                    "phTrans",
                    "comment"
                ];
            removedKeys.forEach( key => {
                delete deleteResultForMedication[0][key];
            } );
            addedKeys.forEach( key => {
                deleteResultForMedication[0][key] = "empty";
            } );
            return {
                data: {
                    kbvMedicationPlan: linkedActivityKBVMEDICATIONPLAN,
                    createdMedications: deleteResultForMedication
                }
            };
        }
    }
};