
var
    patient = {
        "_id": "54be764fc404c1d77a286d4d",
        "talk" : "MR",
        "title" : "",
        "nameaffix" : "",
        "middlename" : "",
        "fk3120" : "",
        "gender" : "MALE",
        "kbvDob" : "12.01.1961",
        "dob" : "1961-01-12T10:00:00.000Z",
        "patientNo" : "297554",
        "primaryDoc" : "5d847dab21eda644db6394a9",
        "countryMode" : [
            "CH"
        ],
        "addresses" : [
            {
                "street" : "Reuti",
                "houseno" : "82",
                "zip" : "5733",
                "city" : "Leimbach AG",
                "country" : "Schweiz",
                "countryCode" : "CH",
                "addon" : "",
                "title" : "",
                "firstname" : "",
                "nameaffix" : "",
                "middlename" : "",
                "lastname" : "",
                "kind" : "OFFICIAL",
                "cantonCode" : "1",
                "_id" : "5ed81c36b6bc8e2362efecb4"
            }
        ],
        "comment" : "Erzeugt durch automatisierten Import\n",
        "communications" : [
            {
                "type" : "MOBILEJOB",
                "value" : "0796307165",
                "note" : "079 630 71 65",
                "signaling" : true,
                "confirmed" : false,
                "confirmNeeded" : false,
                "_id" : "5ed81c36b6bc8e2362efecb3"
            }
        ],
        "images" : [],
        "insuranceStatus" : [
            {
                "insuranceName" : "SuvaZeLuzern",
                "insurancePrintName" : "SuvaZeLuzern",
                "insuranceId" : "7693",
                "insuranceNo" : "",
                "insuranceGLN" : "7601003001075",
                "recipientGLN" : "7601003001075",
                "address1" : "Service Center, Postfach",
                "address2" : "6009  Luzern",
                "zipcode" : "6009",
                "city" : "Luzern",
                "type" : "PRIVATE_CH",
                "isTiersGarant" : false,
                "isTiersPayant" : true,
                "employeeId" : "5d847dab21eda644db6394a9",
                "locationId" : "000000000000000000000001",
                "mediport" : true,
                "insuranceKind" : "1",
                "costCarrierBillingSection" : "00",
                "costCarrierBillingGroup" : "00",
                "feeSchedule" : "3",
                "fused" : false,
                "unzkv" : [],
                "bgNumber" : "",
                "phone" : "",
                "insuranceLink" : "",
                "email" : "example.datenaustausch@concordia.ch",
                "department" : "",
                "_id" : "5ed81c36b6bc8e2362efecb5"
            },
            {
                "insuranceName" : "sansanZürich",
                "insurancePrintName" : "sansanZürich",
                "insuranceId" : "7657",
                "insuranceNo" : "",
                "insuranceGLN" : "7601003006353",
                "recipientGLN" : "7601003006353",
                "address1" : "sansan Versicherungen AG, Postfach",
                "address2" : "8081  Zürich",
                "zipcode" : "8081",
                "city" : "Zürich",
                "type" : "PRIVATE_CH",
                "isTiersGarant" : false,
                "isTiersPayant" : true,
                "employeeId" : "5d847dab21eda644db6394a9",
                "locationId" : "000000000000000000000001",
                "mediport" : true,
                "insuranceKind" : "1",
                "costCarrierBillingSection" : "00",
                "costCarrierBillingGroup" : "00",
                "feeSchedule" : "3",
                "fused" : false,
                "unzkv" : [],
                "bgNumber" : "",
                "phone" : "",
                "insuranceLink" : "",
                "email" : "example.datenaustausch@concordia.ch",
                "department" : "",
                "_id" : "5ea27d91a04cac75d010484b"
            }
        ],
        "dataTransmissionToMediportApproved" : true,
        "socialSecurityNo" : "7564345006231",
        "markers" : [],
        "physicians" : [],
        "additionalMirrorPatientIds" : [],
        "employees" : [],
        "partnerIds" : [
            {
                "patientId" : "Keine",
                "extra" : "Röntgen-Nr.",
                "_id" : "5ed81c36b6bc8e2362efecb6",
                "asvTeamNumbers" : []
            }
        ],
        "edmpTypes" : [],
        "edmpNotifiedAboutStatementOfParticipationTypes" : [],
        "ehksDocType" : "EHKSND",
        "latestMedData" : [],
        "latestLabData" : [],
        "locationId" : "",
        "confirmedViewFromOtherLocations" : false,
        "additionalContacts" : [],
        "patientsFamilyMembers" : [
            {
                "patientId" : "5e735a3efca39c0d0723c389",
                "relationStatus" : "",
                "patientText" : "Nachname_R, Vorname_R"
            }
        ],
        "additionalFamilyMembers" : [],
        "confirmedViewFromLocationIds" : [],
        "dob_DD" : "12",
        "dob_MM" : "01",
        "lastname": "A001-v3.1.2 (Ron)",
        "firstname": "A001-v3.1.2"
    },
    putParams = {
        data: patient,
        address: {
            "street" : "Reuti",
            "houseno" : "82",
            "zip" : "5733",
            "city" : "Leimbach AG",
            "country" : "Schweiz",
            "countryCode" : "CH",
            "addon" : "",
            "title" : "",
            "firstname" : "",
            "nameaffix" : "",
            "middlename" : "",
            "lastname" : "",
            "kind" : "OFFICIAL",
            "cantonCode" : "1",
            "_id" : "5ed81c36b6bc8e2362efecb4"
        },
        communication: {
            "type" : "MOBILEJOB",
            "value" : "0796307165",
            "note" : "079 630 71 65",
            "signaling" : true,
            "confirmed" : false,
            "confirmNeeded" : false,
            "_id" : "5ed81c36b6bc8e2362efecb3"
        }
    },
    postResult = {
        "_id": "54be764fc404c1d77a286d4d",
        "talk" : "MR",
        "title" : "",
        "nameaffix" : "",
        "middlename" : "",
        "fk3120" : "",
        "gender" : "MALE",
        "kbvDob" : "12.01.1961",
        "dob" : "1961-01-12T10:00:00.000Z",
        "patientNo" : "297554",
        "primaryDoc" : "5d847dab21eda644db6394a9",
        "addresses" : [
            {
                "street" : "Reuti",
                "houseno" : "82",
                "zip" : "5733",
                "city" : "Leimbach AG",
                "country" : "Schweiz",
                "countryCode" : "CH",
                "addon" : "",
                "title" : "",
                "firstname" : "",
                "nameaffix" : "",
                "middlename" : "",
                "lastname" : "",
                "kind" : "OFFICIAL",
                "cantonCode" : "1",
                "_id" : "5ed81c36b6bc8e2362efecb4"
            }
        ],
        "comment" : "Erzeugt durch automatisierten Import\n",
        "communications" : [
            {
                "type" : "MOBILEJOB",
                "value" : "0796307165",
                "note" : "079 630 71 65",
                "signaling" : true,
                "confirmed" : false,
                "confirmNeeded" : false,
                "_id" : "5ed81c36b6bc8e2362efecb3"
            }
        ],
        "images" : [],
        "insuranceStatus" : [
            {
                "insuranceName" : "SuvaZeLuzern",
                "insurancePrintName" : "SuvaZeLuzern",
                "insuranceId" : "7693",
                "insuranceNo" : "",
                "insuranceGLN" : "7601003001075",
                "recipientGLN" : "7601003001075",
                "address1" : "Service Center, Postfach",
                "address2" : "6009  Luzern",
                "zipcode" : "6009",
                "city" : "Luzern",
                "type" : "PRIVATE_CH",
                "isTiersGarant" : false,
                "isTiersPayant" : true,
                "employeeId" : "5d847dab21eda644db6394a9",
                "locationId" : "000000000000000000000001",
                "mediport" : true,
                "insuranceKind" : "1",
                "costCarrierBillingSection" : "00",
                "costCarrierBillingGroup" : "00",
                "feeSchedule" : "3",
                "fused" : false,
                "unzkv" : [],
                "bgNumber" : "",
                "phone" : "",
                "insuranceLink" : "",
                "email" : "example.datenaustausch@concordia.ch",
                "department" : "",
                "_id" : "5ed81c36b6bc8e2362efecb5"
            }
        ],
        "socialSecurityNo" : "7564345006231",
        "markers" : [],
        "physicians" : [],
        "additionalMirrorPatientIds" : [],
        "employees" : [],
        "partnerIds" : [
            {
                "patientId" : "Keine",
                "extra" : "Röntgen-Nr.",
                "_id" : "5ed81c36b6bc8e2362efecb6",
                "asvTeamNumbers" : []
            }
        ],
        "edmpTypes" : [],
        "edmpNotifiedAboutStatementOfParticipationTypes" : [],
        "ehksDocType" : "EHKSND",
        "latestMedData" : [],
        "latestLabData" : [],
        "locationId" : "",
        "confirmedViewFromOtherLocations" : false,
        "additionalContacts" : [],
        "patientsFamilyMembers" : [
            {
                "patientId" : "5e735a3efca39c0d0723c389",
                "relationStatus" : "",
                "patientText" : "Nachname_R, Vorname_R"
            }
        ],
        "additionalFamilyMembers" : [],
        "confirmedViewFromLocationIds" : [],
        "dob_DD" : "12",
        "dob_MM" : "01",
        "lastname": "A001-v3.1.2 (Ron)",
        "firstname": "A001-v3.1.2"
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( patient ) );

        return data;
    },
    putParams: putParams,
    getPostResult() {
        return JSON.parse( JSON.stringify(postResult) );
    },
    getPutResult() {
        return JSON.parse( JSON.stringify(postResult) );
    },
    getDeleteResult() {
        return JSON.parse( JSON.stringify( postResult ) );
    },
    getDeleteUpsertResult() {
        return JSON.parse( JSON.stringify( postResult ) );
    }
};

