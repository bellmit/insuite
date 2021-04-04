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
        "actType": "PKVSCHEIN",
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
        "actType": "PKVSCHEIN",
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
        "userContent": "Grundtaxe für das Röntgen und die Ultraschalldiagnostik durch den Arzt in der Arztpraxis und durch Nicht-Radiologen im Spital ({AIP})",
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
            "CH"
        ],
        "fk5037": "",
        "treatmentCategory": "Referenzleistung",
        "divisionCode": null,
        "divisionText": "Sprechzimmer",
        "anaesthesiaText": "",
        "medicalText": "Abgeltung für Administrativ/Infrastruktur-Pauschale anlässlich bildgebender Untersuchungen durch den Arzt in der Arztpraxis und durch Nicht-Radiologen im Spital.\\r\\n\\r\\nNur mit Tarifpositionen mit Sparte Röntgenraum I und Ultraschall gross kumulierbar.\\r\\n\\r\\nNicht abrechenbar durch Röntgeninstitute und Radiologen im Spital.",
        "technicalText" : "",
        "taxPoints" : 0,
        "medicalTaxPoints" : 0,
        "technicalTaxPoints" : 34.49,
        "assistanceTaxPoints" : 0,
        "medicalScalingFactor" : 0.93,
        "technicalScalingFactor" : 1,
        "treatmentTime" : 0,
        "preparationAndFollowUpTime" : 0,
        "reportTime" : 0,
        "roomOccupancyTime" : 23,
        "rotationTime" : 0,
        "assistanceQuantity" : 0,
        "benefitsText" : "-",
        "billingRole": [
            "MEDICAL",
            "TECHNICAL"
        ],
        "treatmentTypeCh": "AMBULATORY",
        "sideMandatory" : false,
        "price" : 30.7,
        "displayPrice" : "0",
        "bstrReferenceCode" : "",
        "tariffType" : "",
        "areTreatmentDiagnosesBillable" : "1",
        "billingFactorValue" : "0.111244",
        "costType" : "",
        "gnrAdditionalInfo" : [
            "NONE"
        ],
        "gnrAdditionalInfoType" : "AUSWAHL",
        "catalog": true,
        "catalogRef" : "DC-TARMED-CH-1614786486003.js",
        "modifyHomeCat" : false,
        "deleteEntryHomeCat" : false,
        "forInsuranceType": "",
        "numberOfCopies": 1,
        "catalogShort": "TARMED",
        "vat": 0,
        "attachedMedia": [],
        "timestamp": "2020-11-27T08:49:14.947Z",
        "patientId": "56f5382c37644678aa923d92",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "content": "Grundtaxe für das Röntgen und die Ultraschalldiagnostik durch den Arzt in der Arztpraxis und durch Nicht-Radiologen im Spital ({AIP})",
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
        "u_extra" : {
            "genderRules" : [ ],
            "ageRules" : [ ],
            "dignityRules" : {
                "quantDignity" : {
                    "code" : null,
                    "text" : null
                },
                "qualDignity" : [
                    {
                        "code" : "0000",
                        "description" : [
                            {
                                "text" : "Keine qualitative Dignität",
                                "fmh" : "0",
                                "validFrom" : "2000-12-31T23:00:00Z",
                                "validUntil" : null,
                                "mutationDate" : "11/08/01 00:00:00",
                                "type" : "N"
                            }
                        ],
                        "validFrom" : "2007-12-31T23:00:00Z",
                        "validUntil" : null,
                        "mutationDate" : "09/25/07 00:00:00",
                        "subDignities" : [ ],
                        "superDignities" : [ ]
                    }
                ]
            },
            "frequencyRules" : [
                {
                    "quantity" : 1,
                    "timeQuantity" : 1,
                    "timeUnit" : "21",
                    "applicability" : "00",
                    "validFrom" : "2007-12-31T23:00:00Z",
                    "validUntil" : null
                }
            ],
            "hierarchyRules" : [ ],
            "combinationRules" : [ ],
            "blocRules" : [ ],
            "cumulationRules" : [
                {
                    "slaveSeq" : "33",
                    "slaveMaster" : "39.0020",
                    "type" : "X",
                    "masterType" : "L",
                    "slaveType" : "G",
                    "display" : "L",
                    "validFrom" : "2007-12-31T23:00:00Z",
                    "validUntil" : null,
                    "mutationDate" : "09/25/07 00:00:00"
                }
            ],
            "treatmentGroups" : [
                {
                    "code" : "03",
                    "validFrom" : "2014-09-30T22:00:00Z",
                    "validUntil" : null,
                    "mutationDate" : "09/01/14 00:00:00",
                    "text" : [
                        {
                            "text" : "Tarifpositionen bei denen der Zuschlag für hausärztliche Leistungen in der Arztpraxis (00.0015) abgerechnet werden kann.",
                            "interpretation" : "",
                            "textValidFrom" : "2017-12-31T23:00:00.000Z",
                            "textValidUntil" : null,
                            "textMutationDate" : "09/01/17 00:00:00"
                        }
                    ],
                    "frequencyRules" : [ ]
                }
            ]
        },
        "fk5012Set": [],
        "fk5035Set": [],
        "fk5036Set": [],
        "code": "39.0020",
        "unit": "Euro",
        "taxPointValue" : 0.89,
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