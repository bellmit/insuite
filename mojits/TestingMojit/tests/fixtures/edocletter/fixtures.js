/**
 * User: do
 * Date: 25.03.21  10:01
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

const ObjectId = require( 'mongoose' ).Types.ObjectId;
exports.getFlatFee = ( _id, patientId, employeeId, locationId, caseFolderId ) => {
    return {
        "_id" : _id,
        "actType" : "TREATMENT",
        "status" : "VALID",
        "attachments" : [ ],
        "attachedMediaTags" : [ ],
        "subType" : "",
        "time" : "",
        "backupEmployeeIds" : [ ],
        "userContent" : "Empfangen eines elektronischen Briefes je empfangenem eArztbrief",
        "mediaImportError" : "",
        "partnerInfo" : "",
        "explanations" : "",
        "activities" : [ ],
        "referencedBy" : [ ],
        "formId" : "",
        "formVersion" : "",
        "formPdf" : "",
        "formLang" : "de",
        "formGender" : "n",
        "apkState" : "IN_PROGRESS",
        "unlinkedMirrorIds" : [ ],
        "savedEmails" : [ ],
        "scheinOrder" : "",
        "scheinDiagnosis" : "",
        "reasonType" : "",
        "countryMode" : [
            "D"
        ],
        "fk5002" : "",
        "fk5005" : "",
        "fk5008" : "",
        "fk5013" : "",
        "fk5017" : "",
        "fk5019" : "",
        "fk5023" : "",
        "fk5024" : "",
        "fk5025" : null,
        "fk5026" : null,
        "fk5034" : null,
        "fk5037" : "",
        "fk5040" : "",
        "fk5044" : "",
        "fk5015" : "",
        "fk5016" : "",
        "fk5018" : "",
        "fk5038" : "",
        "fk5010BatchNumber" : "",
        "treatmentCategory" : "",
        "divisionCode" : null,
        "divisionText" : "",
        "anaesthesiaText" : "",
        "medicalText" : "",
        "technicalText" : "",
        "taxPoints" : 0,
        "medicalTaxPoints" : 0,
        "technicalTaxPoints" : 0,
        "assistanceTaxPoints" : 0,
        "medicalScalingFactor" : 1,
        "technicalScalingFactor" : 1,
        "treatmentTime" : 0,
        "preparationAndFollowUpTime" : 0,
        "reportTime" : 0,
        "roomOccupancyTime" : 0,
        "rotationTime" : 0,
        "assistanceQuantity" : 0,
        "benefitsText" : "",
        "billingRole" : [
            "MEDICAL",
            "TECHNICAL"
        ],
        "treatmentTypeCh" : "AMBULATORY",
        "sideMandatory" : false,
        "price" : 0.27,
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
        "catalog" : true,
        "catalogRef" : "DC-EBM-D-1616398332031.json",
        "forInsuranceType" : "",
        "modifyHomeCat" : false,
        "deleteEntryHomeCat" : false,
        "hasVat" : false,
        "icds" : [ ],
        "icdsExtra" : [ ],
        "numberOfCopies" : 1,
        "__t" : "TREATMENT",
        "catalogShort" : "EBM",
        "code" : "86901",
        "timestamp" : new Date(),
        "locationId" : locationId,
        "employeeId" : employeeId,
        "caseFolderId" : caseFolderId,
        "patientId" : patientId,
        "u_extra" : {},
        "generalCosts" : 0,
        "specialCosts" : 0,
        "chapter" : "87.9",
        "actualUnit" : "Euro",
        "unit" : "Euro",
        "actualPrice" : 0.27,
        "attachedMedia" : [ ],
        "editor" : [
            {
                "_id" : ObjectId("605c66815b6940a524cb375c"),
                "name" : "Denis Oczko",
                "initials" : "DO"
            }
        ],
        "fk5012Set" : [ ],
        "fk5020Set" : [ ],
        "fk5035Set" : [ ],
        "fk5036Set" : [ ],
        "fk5042Set" : [ ],
        "hierarchyRules" : [ ],
        "omimCodes" : [ ],
        "employeeName" : "Oczko, Denis",
        "employeeInitials" : "DO",
        "content" : "Empfangen eines elektronischen Briefes je empfangenem eArztbrief",
        "patientLastName" : "00000",
        "patientFirstName" : "00000",
        "asvTeamnumber" : null,
        "lastChanged" : new Date(),
        "materialCosts" : 0,
        "vat" : 0,
        "vatAmount" : 0,
        "BSK" : 0,
        "ASK" : 0,
        "AHB" : 0,
        "BHB" : 0
    };
};
exports.getPatientTransfer = ( _id, patientId, employeeId, locationId, caseFolderId, activityIds ) => {
    return {
        "_id": _id,
        "mirrorActivitiesIds": [],
        "mirrorActivitiesActTypes": [],
        "status": "NEW",
        "activityIds": activityIds,
        "doctorName": "sarah.mustermann@kim.local",
        "practiceName": "Praxis Dr. Sarah Mustermann",
        "practiceCity": "Berlin",
        "attachedMedia": [
            {
                "mediaId": "605c323a6829339a7d056183",
                "contentType": "application/xml",
                "caption": "Arztbrief.xml",
                "title": "Arztbrief.xml",
                "_id": ObjectId( "605c323b6829339a7d056193" )
            },
            {
                "mediaId": "605c323a6829339a7d056188",
                "contentType": "application/pdf",
                "caption": "Arztbrief",
                "title": "Arztbrief",
                "_id": ObjectId( "605c323b6829339a7d056192" )
            }
        ],
        "subject": "Arztbrief",
        "textContent": "Wir übersenden Ihnen den eArztbrief.",
        "created": new Date(),
        "partners": [],
        "timestamp" : new Date(),
        "emailType": "KIM",
        "kimAccount": "603cab4cc9a72aa74f1f4b73",
        "kimReceiverEmail": "dr.peter.mustermann@kim.local",
        "messageID": "<5d27031a-3fbc-c426-5e35-aaf793909940@kim.local>",
        "user": [
            {
                "_id": ObjectId( "605c39b46829339a7d0561da" ),
                "name": "Oczko, Denis",
                "employeeNo": "5e55190ed7d326bf8f1b6afd"
            }
        ],
        "kimRecipient": [],
        "senderKimAccounts": [],
        "receiverKimAccounts": [],
        "parsedKIMPatient": [
            {
                "firstname": "001",
                "lastname": "001",
                "title": "",
                "nameaffix": "",
                "dob": new Date( "1929-12-11T23:00:00Z" ),
                "kbvDob": "12.12.1929",
                "gender": "MALE",
                "addresses": [
                    {
                        "kind": "OFFICIAL",
                        "street": "Lala",
                        "houseno": "1",
                        "zip": "12105",
                        "city": "Berlin",
                        "postbox": null,
                        "country": "Deutschland",
                        "countryCode": "D"
                    }
                ],
                "communications": [
                    {
                        "type": "PHONEPRIV",
                        "value": "030303"
                    }
                ],
                "insuranceStatus": [
                    {
                        "type": "PUBLIC",
                        "insuranceNo": "M123456678",
                        "insuranceId": "104940005",
                        "insuranceGrpId": "72601"
                    }
                ]
            }
        ],
        "patientId": "5ff473f377f396828cbcf324",
        "patientName": "00000, 00000"
    };
};