/**
 * User: pi
 * Date: 07/08/14  12:33
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, describe, before, it */

const
    model = 'activitysequence',
    user = Y.doccirrus.auth.getSUForLocal(),
    mongoose = require( 'mongoose' ),
    locationId = new mongoose.Types.ObjectId().toString();

function getActivity( timestamp ) {
    var result = {
        "content": "1",
        "actType": "PKVSCHEIN",
        "patientId": "553635100be955810240eea2",
        "employeeId": "54b3918a3edc91193e753fc7",
        //TODO: FIX LOCATIONID
        "locationId": locationId,
        "caseFolderId": "5567002a058124dd6867cd7a",
        "treatmentType": "AMBULANT",
        "finished": false,
        "deleteEntryHomeCat": false,
        "modifyHomeCat": false,
        "participants": [],
        "orHSA": null,
        "orPD": null,
        "orNearB": null,
        "orNearR": null,
        "orNearL": null,
        "orFarB": null,
        "orFarR": null,
        "orFarL": null,
        "orVisAcuTyp": "",
        "orAdd2R": null,
        "orAdd2L": null,
        "orBasR": "",
        "orBasL": "",
        "orPsmR": null,
        "orPsmL": null,
        "orAddR": null,
        "orAddL": null,
        "orAxsR": null,
        "orAxsL": null,
        "orCylR": null,
        "orCylL": null,
        "orSphR": null,
        "orSphL": null,
        "orRead": null,
        "orType": "",
        "otAppliedSet": [],
        "otIL2": null,
        "otIL1": null,
        "otIR2": null,
        "otIR1": null,
        "otIRead": null,
        "otGL2": null,
        "otGL1": null,
        "otGR2": null,
        "otGR1": null,
        "otGRead": null,
        "otPL4": null,
        "otPL3": null,
        "otPL2": null,
        "otPL1": null,
        "otPR4": null,
        "otPR3": null,
        "otPR2": null,
        "otPR1": null,
        "otPRead": null,
        "otNFacL": null,
        "otNCCTL": null,
        "otNL4": null,
        "otNL3": null,
        "otNL2": null,
        "otNL1": null,
        "otNFacR": null,
        "otNCCTR": null,
        "otNR4": null,
        "otNR3": null,
        "otNR2": null,
        "otNR1": null,
        "otNRead": null,
        "observationValuation": "",
        "observationTherapyStatus": "",
        "dosis": "",
        "phContinuousMed": false,
        "phCheaperPkg": false,
        "phARV": false,
        "phOTX": false,
        "phOTC": false,
        "phNLabel": "",
        "phRecipeOnly": false,
        "phBTM": false,
        "phPrescMed": false,
        "phMed": false,
        "phDisAgrAlt": false,
        "phDisAgr": false,
        "phGBA": false,
        "phAMR": [],
        "phLifeStyleCond": false,
        "phLifeStyle": false,
        "phNegative": false,
        "phImport": false,
        "phTrans": false,
        "phTer": false,
        "phOnly": false,
        "phAtc": [],
        "phIngr": [],
        "phFixedPay": null,
        "phPatPayHint": "",
        "phPatPay": null,
        "phPriceSale": null,
        "phPackSize": "",
        "phForm": "",
        "phCompany": "",
        "phPZN": "",
        "fk5042Set": [],
        "fk5038": "",
        "fk5036Set": [],
        "fk5035Set": [],
        "fk5020Set": [],
        "fk5018": "",
        "fk5016": "",
        "fk5015": "",
        "fk5012Set": [],
        "fk5073": "",
        "fk5072": "",
        "fk5071": "",
        "fk5070": "",
        "fk5044": "",
        "fk5040": "",
        "fk5037": "",
        "fk5034": null,
        "fk5026": null,
        "fk5025": null,
        "fk5024": "",
        "fk5023": "",
        "fk5019": "",
        "fk5017": "",
        "fk5013": "",
        "fk5008": "",
        "fk5005": "",
        "fk5002": "",
        "billingFactorValue": "1",
        "areTreatmentDiagnosesBillable": "1",
        "accidentCompanyCity": "",
        "accidentCompanyPLZ": "",
        "accidentCompanyHouseno": "",
        "accidentCompanyStreet": "",
        "accidentCompany": "",
        "fristTreatPhysician": "",
        "fk4217": "",
        "fk4241": "",
        "fk4236": false,
        "fk4206": null,
        "fk4123": "",
        "fk4125to": null,
        "fk4125from": null,
        "fk4126": "",
        "fk4124": "",
        "scheinSlipMedicalTreatment": "",
        "scheinSubgroup": "",
        "scheinType": "",
        "scheinBillingArea": "00",
        "scheinYear": "",
        "scheinQuarter": "",
        "isChiefPhysician": false,
        "includesBSK": false,
        "continuousIcds": [],
        "fk4219": "",
        "fk4235Set": [],
        "fk4234": false,
        "scheinNextTherapist": "",
        "scheinClinicalTreatmentTo": null,
        "scheinClinicalTreatmentFrom": null,
        "scheinNotes": "",
        "scheinFinding": "",
        "scheinDiagnosis": "",
        "scheinOrder": "",
        "scheinSpecialisation": "",
        "scheinEstablishment": "",
        "scheinRemittor": "",
        "locationFeatures": "",
        "vat": 0,
        "hasVat": false,
        "icdsExtra": [],
        "icds": [],
        "diagnosisDerogation": "",
        "diagnosisSite": "",
        "diagnosisTreatmentRelevance": "TREATMENT_RELEVANT",
        "diagnosisType": "ACUTE",
        "diagnosisCert": "",
        "forInsuranceType": "",
        "catalogRef": "",
        "catalogShort": "",
        "catalog": false,
        "formVersion": "",
        "formId": "",
        "activities": [],
        "editor": [
            {
                "name": "Tanja Treiner",
                "employeeNo": "1"
            }
        ],
        "status": "VALID",
        "explanations": "",
        "teleConsultNote": "",
        "userContent": "1",
        "subType": "",
        "attachments": []
    };
    if( timestamp ) {
        result.timestamp = new Date();
    }
    return result;
}

function getData( title, activity, timestamp ) {
    var result = {
        order: 5000000000,
        description: 'description',
        activities: []
    };
    if( title ) {
        result.title = title;
    }
    if( activity ) {
        result.activities.push( getActivity( timestamp ) );
    }
    return result;
}

describe( 'Checks if validation is triggered for undefined fields', function() {
    before( async function() {
        await Y.doccirrus.mongodb.runDb( {
            model: model,
            user: user,
            action: 'delete',
            query: {
                _id: {
                    $exists: true
                }
            },
            options: {
                override: true
            }
        } );
    } );

    it( 'Should not be possible to create activitysequence without title', async function() {
        try {
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( getData() )
            } );
        } catch( err ) {
            should.exist( err );
            Boolean( err ).should.equal( true );
        }
    } );

    it( 'Should not be possible to create activitysequence with title but with invalid activity(subdocuemnt)', async function() {
        try {
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( getData( 'title', true ) )
            } );
        } catch( err ) {
            should.exist( err );
            Boolean( err ).should.equal( true );
        }
    } );

    it( 'Should be possible to create activitysequence with title but with valid activity(subdocuemnt)', async function() {
        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: model,
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( getData( 'title', true, true ) )
        } );
    } );

    it( 'Should be possible to create activitysequence with title', async function() {
        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: model,
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( getData( 'title' ) )
        } );
    } );
} );