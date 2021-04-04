/**
 * User: do
 * Date: 30.04.20  09:07
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, before, describe, it, should*/

const
    mongoose = require( 'mongoose' ),
    ObjectId = mongoose.Types.ObjectId,
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    util = require( 'util' ),
    _ = require( 'lodash' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    locationId = ObjectId().toString(),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

const getActivityData = ( context, patientData, caseFolderData, caseFolderConfig, activityConfig ) => {

    if( caseFolderConfig.type !== 'PUBLIC' ) {
        throw Error( `getActivityData has no implementation for case folder of type ${caseFolderConfig.type}` );
    }

    const basicData = {
        "_id": ObjectId().toString(),
        "caseFolderId": caseFolderData._id.toString(),
        "patientId": patientData._id.toString(),
        "locationId": ObjectId( context.locations[activityConfig.location]._id.toString() ),
        "employeeId": ObjectId( context.doctors[activityConfig.doctor].employee._id.toString() ),
        "timestamp": mochaUtils.generateNewDate(),
        "lastChanged": mochaUtils.generateNewDate()
    };

    switch( activityConfig.actType ) {
        case 'SCHEIN':
            return {
                ...basicData,
                "actType": "SCHEIN",
                "attachments": [],
                "subType": "",
                "time": "",
                "backupEmployeeIds": [],
                "userContent": "ambulante Behandlung (ambulante Behandlung)",
                "mediaImportError": "",
                "partnerInfo": "",
                "explanations": "",
                "status": "VALID",
                "activities": [],
                "referencedBy": [],
                "formId": "",
                "formVersion": "",
                "formPdf": "",
                "formLang": "de",
                "formGender": "m",
                "apkState": "IN_PROGRESS",
                "unlinkedMirrorIds": [],
                "forInsuranceType": "",
                "locationFeatures": "",
                "scheinRemittor": "",
                "scheinEstablishment": "",
                "scheinSpecialisation": "",
                "scheinOrder": "",
                "scheinDiagnosis": "",
                "reasonType": "",
                "scheinFinding": "",
                "scheinNotes": "",
                "scheinClinicalTreatmentFrom": null,
                "scheinClinicalTreatmentTo": null,
                "scheinNextTherapist": "",
                "fk4234": false,
                "fk4219": "",
                "continuousIcds": [],
                "createContinuousDiagnosisOnSave": false,
                "caseNumber": "",
                "icds": [],
                "icdsExtra": [],
                "scheinQuarter": "2",
                "scheinYear": "2020",
                "scheinBillingArea": "00",
                "scheinType": "0101",
                "scheinSubgroup": "00",
                "scheinTransferTypeInfo": "",
                "fk4124": "",
                "fk4126": "",
                "fk4125from": null,
                "fk4125to": null,
                "fk4123": "",
                "fk4206": null,
                "fk4236": false,
                "fk4241": "",
                "fk4217": "",
                "scheinSlipMedicalTreatment": "",
                "attachedMedia": [],
                "content": "ambulante Behandlung (ambulante Behandlung)",
                "editor": [],
                "fk4235Set": [],
                "invoiceData": [],
                "scheinTransferType": ""
            };
        case 'TREATMENT':
            return {
                ...basicData,
                "actType": "TREATMENT",
                "status": "VALID",
                "attachments": [],
                "subType": "",
                "time": "",
                "backupEmployeeIds": [],
                "userContent": "Bronchialer Provokationstest",
                "mediaImportError": "",
                "partnerInfo": "",
                "explanations": "",
                "activities": [],
                "referencedBy": [],
                "formId": "",
                "formVersion": "",
                "formPdf": "",
                "formLang": "de",
                "formGender": "m",
                "apkState": "IN_PROGRESS",
                "unlinkedMirrorIds": [],
                "scheinOrder": "",
                "scheinDiagnosis": "",
                "reasonType": "",
                "countryMode": [
                    "D"
                ],
                "fk5002": "",
                "fk5005": "",
                "fk5008": "",
                "fk5013": "",
                "fk5017": "",
                "fk5019": "",
                "fk5023": "",
                "fk5024": "",
                "fk5025": null,
                "fk5026": null,
                "fk5034": null,
                "fk5037": "",
                "fk5040": "",
                "fk5044": "",
                "fk5015": "",
                "fk5016": "",
                "fk5018": "",
                "fk5038": "",
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
                "price": 81.41,
                "displayPrice": "0",
                "bstrReferenceCode": "",
                "tariffType": "",
                "areTreatmentDiagnosesBillable": "1",
                "billingFactorValue": "0.109871",
                "costType": "",
                "gnrAdditionalInfo": [],
                "gnrAdditionalInfoType": "AUSWAHL",
                "catalog": false,
                "forInsuranceType": "",
                "modifyHomeCat": false,
                "deleteEntryHomeCat": false,
                "hasVat": false,
                "icds": [],
                "icdsExtra": [],
                "numberOfCopies": 1,
                "catalogShort": "EBM",
                "vat": 0,
                "attachedMedia": [],
                "content": "Bronchialer Provokationstest",
                "editor": [
                    {
                        "_id": ObjectId( "5e87418a641d3c957c90a6bf" ),
                        "name": "Denis Oczko",
                        "initials": "DO"
                    }
                ],
                "u_extra": {},
                "chapter": "30.1.2",
                "fk5012Set": [],
                "fk5020Set": [],
                "fk5035Set": [],
                "fk5036Set": [],
                "fk5042Set": [],
                "hierarchyRules": [],
                "generalCosts": 0,
                "specialCosts": 0,
                "omimCodes": [],
                "code": "30122",
                "actualPrice": 741,
                "unit": "Euro",
                "actualUnit": "Punkte",
                "asvTeamnumber": null,
                "materialCosts": 0,
                "vatAmount": 0,
                "BSK": 0,
                "ASK": 0,
                "AHB": 0,
                "BHB": 0,
                "debtCollection": null,
                "includesBSK": null,
                "isChiefPhysician": null
            };
        case 'DIAGNOSIS':
            return {
                ...basicData,
                "actType": "DIAGNOSIS",
                "status": "VALID",
                "attachments": [],
                "subType": "",
                "time": "",
                "backupEmployeeIds": [],
                "userContent": "Oberflächliche Verletzung der behaarten Kopfhaut durch oberflächlichen Fremdkörper (Splitter)",
                "mediaImportError": "",
                "partnerInfo": "",
                "explanations": "",
                "activities": [],
                "referencedBy": [],
                "formId": "",
                "formVersion": "",
                "formPdf": "",
                "formLang": "de",
                "formGender": "m",
                "apkState": "IN_PROGRESS",
                "unlinkedMirrorIds": [],
                "diagnosisCert": "CONFIRM",
                "diagnosisType": "CONTINUOUS",
                "diagnosisTreatmentRelevance": "TREATMENT_RELEVANT",
                "diagnosisSite": "",
                "diagnosisDerogation": "",
                "diagnosisPeriod": "03",
                "diagnosisLaterality": "01",
                "catalog": true,
                "catalogShort": "ICD-10",
                "catalogRef": "DC-ICD-10-D,CH-1583833525695.json",
                "forInsuranceType": "",
                "modifyHomeCat": false,
                "deleteEntryHomeCat": false,
                "__t": "DIAGNOSIS",
                "attachedMedia": [],
                "content": "Oberflächliche Verletzung der behaarten Kopfhaut durch oberflächlichen Fremdkörper (Splitter)",
                "editor": [],
                "u_extra": {
                    "abrechenbar": "j",
                    "krankheit_in_mitteleuropa_sehr_selten": "n",
                    "schlüsselnummer_mit_inhalt_belegt": "j",
                    "infektionsschutzgesetz_meldepflicht": "n",
                    "infektionsschutzgesetz_abrechnungsbesonderheit": "n"
                },
                "relatedCodes": [],
                "code": "S00.04",
                "diagnosisInvalidationDate": null
            };
        default:
            throw Error( `getActivityData has no implementation for activity of type ${activityConfig.actType}` );
    }
};

const getUserByDoctor = ( doctorName, context ) => {
    return {
        id: doctorName,
        U: doctorName,
        tenantId: user.tenantId,
        identityId: context.doctors[doctorName].identity._id.toString(),
        specifiedBy: context.doctors[doctorName].employee._id.toString(),
        groups:
            [
                {_id: '5e55190ed7d326bf8f1b6aff', group: 'USER'},
                {_id: '5e86daf471b70670b0111796', group: 'PHYSICIAN'}
            ],
        roles: ['Empfang'],
        locations: context.doctors[doctorName].employee.locations,
        country: 'Deutschland',
        countryCode: 'D',
        coname: 'DO_NEU',
        preferredLanguage: '',
        sessionId: '',
        ip: '127.0.0.1',
        realmDCPRC: false
    };
};

const testSetupConfig = {
    settings: {
        noCrossLocationAccess: true,
        noCrossLocationPatientAccess: false,
        crossLocationPatientEditingAllowed: false,
        noCrossLocationCalendarAccess: false
    },
    locations: [
        {name: 'LOC_A'},
        {name: 'LOC_B'},
        {name: 'LOC_C'}
    ],
    doctors: [
        {name: 'DOC_1', locations: ['LOC_A', 'LOC_B', 'LOC_C']},
        {name: 'DOC_2', locations: ['LOC_B']},
        {name: 'DOC_3', locations: ['LOC_C']}
    ],
    patients: [
        {
            name: 'PAT_1',
            insurances: [{type: 'PUBLIC', location: 'LOC_A'}],
            caseFolders: [
                {
                    name: 'PAT_1_CF',
                    type: 'PUBLIC',
                    content: [
                        {actType: 'SCHEIN', location: 'LOC_A', doctor: 'DOC_1'},
                        {actType: 'TREATMENT', location: 'LOC_A', doctor: 'DOC_1'},
                        {actType: 'DIAGNOSIS', location: 'LOC_A', doctor: 'DOC_1'}
                    ]
                }
            ]
        },
        {
            name: 'PAT_2',
            insurances: [{type: 'PUBLIC', location: 'LOC_B', doctor: 'DOC_2'}],
            caseFolders: [
                {
                    name: 'PAT_2_CF',
                    type: 'PUBLIC',
                    content: [
                        {actType: 'SCHEIN', location: 'LOC_B', doctor: 'DOC_2'}
                    ]
                }
            ]
        }

    ]
};

const getTestSetupConfig = ( options = {} ) => {
    const newTestSetupConfig = JSON.parse( JSON.stringify( testSetupConfig ) );
    return _.merge( newTestSetupConfig, options );
};

let testEnv;

async function setupEnvirnoment( config ) {
    const result = {
        locations: {},
        doctors: {},
        patients: {}
    };
    if( config.settings ) {
        await promisifyArgsCallback( Y.doccirrus.api.settings.put )( {
            user,
            query: {
                _id: Y.doccirrus.schemas.settings.getDefaultSettings()._id
            },
            data: {
                ...config.settings,
                fields_: Object.keys( config.settings )
            }
        } );
    }

    if( config.locations ) {
        let index = 0;
        for( let locationConfig of config.locations ) {
            const locationData = {
                ...mochaUtils.getLocationData(),
                locname: locationConfig.name,
                commercialNo: '990000000'.concat( ++index ).slice( -9 )
            };
            result.locations[locationConfig.name] = locationData;
            await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'post',
                model: 'location',
                data: {
                    ...locationData,
                    skipcheck_: true
                }
            } );
        }
    }
    if( config.doctors ) {
        let index = 0;
        for( let doctorConfig of config.doctors ) {

            const locations = Object.values( result.locations )
                .filter( location => doctorConfig.locations.includes( location.locname ) )
                .map( location => ({_id: location._id, locname: location.locname}) );

            const identityData = {
                ...mochaUtils.getIdentityData(),
                username: doctorConfig.name,
                firstname: doctorConfig.name,
                lastname: doctorConfig.name,
                locations
            };

            result.doctors[doctorConfig.name] = {identity: identityData};

            await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'post',
                model: 'identity',
                data: {
                    ...identityData,
                    skipcheck_: true
                }
            } );

            const employeeBasicData = mochaUtils.getEmployeeData();
            employeeBasicData._id = result.doctors[doctorConfig.name].identity._id;

            const employeeData = {
                ...employeeBasicData,
                locname: doctorConfig.name,
                officialNo: 'doctorConfig'.concat( ++index ).slice( -9 ),
                locations
            };

            result.doctors[doctorConfig.name].employee = employeeData;

            await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'post',
                model: 'employee',
                data: {
                    ...employeeData,
                    skipcheck_: true
                }
            } );
        }
    }

    if( config.patients ) {
        for( let patientConfig of config.patients ) {
            const patientData = {
                firstname: patientConfig.name,
                lastname: patientConfig.name
            };

            if( patientConfig.insurances ) {
                patientData.insuranceStatus = [];
            }
            const patientBasicData = mochaUtils.getPatientData( patientData );
            if( patientConfig.insurances ) {
                patientConfig.insurances.forEach( insuranceConfig => {
                    let insurance;
                    switch( insuranceConfig.type ) {
                        case 'PUBLIC':
                            insurance = {
                                'insuranceId': '109519005',
                                'insuranceName': 'AOK Nordost - Die Gesundheitskasse',
                                'insurancePrintName': 'AOK Nordost',
                                'insuranceGrpId': '72101',
                                'type': 'PUBLIC',
                                'kv': '72',
                                'locationId': locationId,
                                'address2': '10957 Berlin',
                                'address1': 'Wilhelmstraße 1',
                                'bgNumber': '',
                                'unzkv': [],
                                'fused': false,
                                'feeSchedule': '1',
                                'costCarrierBillingGroup': '01',
                                'costCarrierBillingSection': '00',
                                'dmp': '',
                                'persGroup': '',
                                'insuranceKind': '1',
                                'fk4110': null,
                                'fk4133': null
                            };
                            break;
                        default:
                            throw Error( 'missing insuranceConfig.type' );

                    }
                    if( insuranceConfig.location ) {
                        insurance.locationId = result.locations[insuranceConfig.location]._id.toString();
                    }

                    patientBasicData.insuranceStatus.push( insurance );
                } );
            }
            await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'post',
                model: 'patient',
                data: {
                    ...patientBasicData,
                    skipcheck_: true
                }
            } );

            result.patients[patientConfig.name] = patientBasicData;
            patientBasicData.caseFolders = {};

            if( patientConfig.caseFolders ) {
                for( let caseFolderConfig of patientConfig.caseFolders ) {
                    const caseFolderData = mochaUtils.getCaseFolderData( {
                        title: caseFolderConfig.name,
                        patientId: patientBasicData._id.toString(),
                        type: caseFolderConfig.type
                    } );

                    await Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'post',
                        model: 'casefolder',
                        data: {
                            ...caseFolderData,
                            skipcheck_: true
                        }
                    } );

                    patientBasicData.caseFolders[caseFolderConfig.name] = caseFolderData;
                    caseFolderData.content = [];
                    if( caseFolderConfig.content ) {
                        for( let caseFolderContentConfig of caseFolderConfig.content ) {
                            const activityData = getActivityData( result, patientBasicData, caseFolderData, caseFolderConfig, caseFolderContentConfig );
                            await Y.doccirrus.mongodb.runDb( {
                                user,
                                action: 'post',
                                model: 'activity',
                                data: {
                                    ...activityData,
                                    skipcheck_: true
                                }
                            } );

                            caseFolderData.content.push( activityData );
                        }
                    }
                }
            }

        }
    }

    return result;
}

const checkActivityVisibility = async ( doctorName, patientName, nActivities ) => {
    const docUser = getUserByDoctor( doctorName, testEnv );
    const patientId = getPatientId( patientName );
    const results = await Y.doccirrus.mongodb.runDb( {
        user: docUser,
        model: 'activity',
        query: {
            patientId
        }
    } );
    results.should.be.an( 'Array' );
    results.should.have.length( nActivities );
};

const checkPatientVisibility = async ( doctorName, patientName, nPatients ) => {
    const docUser = getUserByDoctor( doctorName, testEnv );
    const query = {};
    if( patientName ) {
        const patientId = getPatientId( patientName );
        query._id = patientId;
    }

    const results = await Y.doccirrus.mongodb.runDb( {
        user: docUser,
        model: 'patient',
        query
    } );
    results.should.be.an( 'Array' );
    results.should.have.length( nPatients );
};

const checkUpdateResult = ( err, results, update, shouldFail, failsWithEmptyArray ) => {
    if( shouldFail ) {
        if( failsWithEmptyArray ) {
            results.should.be.an( 'Array' );
            results.should.have.length( 0 );
        } else {
            should.exist( err );
            err.code.should.equal( 7015 );
        }
    } else {
        results.should.be.an( 'object' );
        Object.keys( update ).forEach( updateKey => {
            results[updateKey].should.eql( update[updateKey] );
        } );
    }
};

const checkPatientUpdate = async ( doctorName, patientName, update, shouldFail = false ) => {
    const docUser = getUserByDoctor( doctorName, testEnv );
    const patientId = getPatientId( patientName );

    let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
        user: docUser,
        model: 'patient',
        action: 'put',
        query: {
            _id: patientId
        },
        data: {...update, skipcheck_: true},
        fields: Object.keys( update )
    } ) );

    checkUpdateResult( err, results, update, shouldFail );
};

const checkActivityUpdate = async ( doctorName, patientName, update, shouldFail = false ) => {
    const docUser = getUserByDoctor( doctorName, testEnv );
    const patientId = getPatientId( patientName );

    let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
        user: docUser,
        model: 'activity',
        action: 'put',
        query: {
            patientId
        },
        data: {...update, skipcheck_: true},
        fields: Object.keys( update )
    } ) );

    checkUpdateResult( err, results, update, shouldFail, true );
};
const checkActivityDeletion = async ( doctorName, patientName, nActivities ) => {
    const docUser = getUserByDoctor( doctorName, testEnv );
    const patientId = getPatientId( patientName );

    let results = await Y.doccirrus.mongodb.runDb( {
        user: docUser,
        model: 'activity',
        action: 'delete',
        query: {
            patientId
        },
        options: {
            override: true
        }
    } );

    results.should.be.an( 'Array' );
    results.should.have.length( nActivities );
};

const getLocationId = ( locationName ) => {
    return testEnv.locations[locationName]._id.toString();
};
const getPatientId = ( patientName ) => {
    return testEnv.patients[patientName]._id.toString();
};
const getRandomString = ( max ) => {
    let rand = ObjectId().toString();
    if( max && rand.length > max ) {
        rand = rand.substring( 0, max );
    }
    return rand;
};

describe( 'Test inCase with enabled strict mode', () => {
    before( 'Setup up', async function() {
        this.timeout( 1000 * 20 );
        await cleanDb( {user} );
        testEnv = await setupEnvirnoment( getTestSetupConfig() );
    } );
    describe( 'Test patient visibility', () => {
        it( 'DOC_1 sees all (2) patients', async function() {
            await checkPatientVisibility( 'DOC_1', null, 2 );
        } );
        it( 'DOC_2 sees all (2) patients', async function() {
            await checkPatientVisibility( 'DOC_2', null, 2 );
        } );
        it( 'DOC_3 sees all (2) patients', async function() {
            await checkPatientVisibility( 'DOC_3', null, 2 );
        } );
    } );
    describe( 'Test activity visibility without patient confirmation', () => {
        it( 'DOC_1 sees all (3) activities of PAT_1', async function() {
            await checkActivityVisibility( 'DOC_1', 'PAT_1', 3 );
        } );
        it( 'DOC_2 does NOT see activities of PAT_1', async function() {
            await checkActivityVisibility( 'DOC_2', 'PAT_1', 0 );
        } );
        it( 'DOC_2 sees all (1) activities of PAT_2', async function() {
            await checkActivityVisibility( 'DOC_2', 'PAT_2', 1 );
        } );
        it( 'DOC_1 does also see activities of PAT_2', async function() {
            await checkActivityVisibility( 'DOC_1', 'PAT_2', 1 );
        } );
        it( 'DOC_3 does NOT see activities of PAT_2', async function() {
            await checkActivityVisibility( 'DOC_3', 'PAT_2', 0 );
        } );
    } );
    describe( 'Test update of patients', () => {
        it( 'DOC_1 can change PAT_1', async function() {
            await checkPatientUpdate( 'DOC_1', 'PAT_1', {nameaffix: getRandomString( 20 )} );
        } );
        it( 'DOC_1 can change PAT_2', async function() {
            await checkPatientUpdate( 'DOC_1', 'PAT_2', {nameaffix: getRandomString( 20 )} );
        } );
        it( 'DOC_2 can NOT change PAT_1', async function() {
            await checkPatientUpdate( 'DOC_2', 'PAT_1', {nameaffix: getRandomString( 20 )}, true );
        } );
        it( 'DOC_2 can change PAT_2', async function() {
            await checkPatientUpdate( 'DOC_2', 'PAT_2', {nameaffix: getRandomString( 20 )} );
        } );
        it( 'DOC_3 can NOT change PAT_1', async function() {
            await checkPatientUpdate( 'DOC_3', 'PAT_1', {nameaffix: getRandomString( 20 )}, true );
        } );
    } );
    describe( 'Test activity update without patient confirmation', () => {
        it( 'DOC_1 can update activities of PAT_1', async function() {
            await checkActivityUpdate( 'DOC_1', 'PAT_1', {explanations: getRandomString()} );
        } );
        it( 'DOC_2 can NOT update activities of PAT_1', async function() {
            await checkActivityUpdate( 'DOC_2', 'PAT_1', {explanations: getRandomString()}, true );
        } );
        it( 'DOC_3 can NOT update activities of PAT_1', async function() {
            await checkActivityUpdate( 'DOC_3', 'PAT_1', {explanations: getRandomString()}, true );
        } );
    } );
    describe( 'Test activity visibility WITH global patient confirmation', () => {
        it( 'DOC_1 can change PAT_1 patient confirmation', async function() {
            await checkPatientUpdate( 'DOC_1', 'PAT_1', {
                confirmedViewFromOtherLocations: true,
                confirmedViewFromLocationIds: []
            } );
        } );
        it( 'DOC_1 sees all (3) activities of PAT_1', async function() {
            await checkActivityVisibility( 'DOC_1', 'PAT_1', 3 );
        } );
        it( 'DOC_2 sees all (3) activities of PAT_1', async function() {
            await checkActivityVisibility( 'DOC_2', 'PAT_1', 3 );
        } );
        it( 'DOC_3 sees all (3) activities of PAT_1', async function() {
            await checkActivityVisibility( 'DOC_3', 'PAT_1', 3 );
        } );

    } );
    describe( 'Test activity update WITH global patient confirmation', () => {
        it( 'DOC_1 can update activities of PAT_1', async function() {
            await checkActivityUpdate( 'DOC_1', 'PAT_1', {explanations: getRandomString()} );
        } );
        it( 'DOC_2 can NOT update activities of PAT_1', async function() {
            await checkActivityUpdate( 'DOC_2', 'PAT_1', {explanations: getRandomString()}, true );
        } );
        it( 'DOC_3 can NOT update activities of PAT_1', async function() {
            await checkActivityUpdate( 'DOC_3', 'PAT_1', {explanations: getRandomString()}, true );
        } );
    } );
    describe( 'Test activity visibility WITH partial location defined patient confirmation', () => {
        it( 'DOC_1 can change PAT_1 patient confirmation to allow viewing from LOC_B', async function() {
            await checkPatientUpdate( 'DOC_1', 'PAT_1', {
                confirmedViewFromOtherLocations: true,
                confirmedViewFromLocationIds: [
                    getLocationId( 'LOC_B' )
                ]
            } );
        } );
        it( 'DOC_1 sees all (3) activities of PAT_1', async function() {
            await checkActivityVisibility( 'DOC_1', 'PAT_1', 3 );
        } );
        it( 'DOC_2 sees all (3) activities of PAT_1', async function() {
            await checkActivityVisibility( 'DOC_2', 'PAT_1', 3 );
        } );
        it( 'DOC_3 does NOT see activities of PAT_1', async function() {
            await checkActivityVisibility( 'DOC_3', 'PAT_1', 0 );
        } );
    } );
    describe( 'Test activity update WITH partial location defined patient confirmation', () => {
        it( 'DOC_1 can update activities of PAT_1', async function() {
            await checkActivityUpdate( 'DOC_1', 'PAT_1', {explanations: getRandomString()} );
        } );
        it( 'DOC_2 can NOT update activities of PAT_1', async function() {
            await checkActivityUpdate( 'DOC_2', 'PAT_1', {explanations: getRandomString()}, true );
        } );
        it( 'DOC_3 can NOT update activities of PAT_1', async function() {
            await checkActivityUpdate( 'DOC_3', 'PAT_1', {explanations: getRandomString()}, true );
        } );
    } );
    describe( 'Test activity deletion', () => {
        it( 'DOC_2 can NOT delete activities of PAT_1', async function() {
            await checkActivityDeletion( 'DOC_2', 'PAT_1', 0 );
        } );
        it( 'DOC_3 can NOT delete activities of PAT_1', async function() {
            await checkActivityDeletion( 'DOC_3', 'PAT_1', 0 );
        } );
        it( 'DOC_1 can delete activities of PAT_1', async function() {
            await checkActivityDeletion( 'DOC_1', 'PAT_1', 3 );
        } );
    } );
} );

describe( 'Test inCase with enabled strict mode with enabled "noCrossLocationPatientAccess" option', () => {
    before( 'Setup up', async function() {
        this.timeout( 1000 * 20 );
        await cleanDb( {user} );
        testEnv = await setupEnvirnoment( getTestSetupConfig( {
            settings: {
                noCrossLocationPatientAccess: true
            }
        } ) );
    } );
    describe( 'Test patient visibility without patient confirmation', () => {
        it( 'DOC_1 sees all (2) patients', async function() {
            await checkPatientVisibility( 'DOC_1', null, 2 );
        } );
        it( 'DOC_2 sees all (1) patients', async function() {
            await checkPatientVisibility( 'DOC_2', null, 1 );
        } );
        it( 'DOC_3 sees no patients', async function() {
            await checkPatientVisibility( 'DOC_3', null, 0 );
        } );
    } );
    describe( 'Test patient visibility with WITH global patient confirmation', () => {
        it( 'DOC_1 can change PAT_1 patient confirmation', async function() {
            await checkPatientUpdate( 'DOC_1', 'PAT_1', {
                confirmedViewFromOtherLocations: true,
                confirmedViewFromLocationIds: []
            } );
        } );
        it( 'DOC_1 sees all (2) patients', async function() {
            await checkPatientVisibility( 'DOC_1', null, 2 );
        } );
        it( 'DOC_2 sees all (2) patients (Patient with matching doctor location and the patient confirmede view)', async function() {
            await checkPatientVisibility( 'DOC_2', null, 2 );
        } );
        it( 'DOC_3 sees patient with who confirmed view', async function() {
            await checkPatientVisibility( 'DOC_3', null, 1 );
        } );
    } );
    describe( 'Test patient visibility  WITH partial location defined patient confirmation', () => {
        it( 'DOC_1 can change PAT_1 patient confirmation', async function() {
            await checkPatientUpdate( 'DOC_1', 'PAT_1', {
                confirmedViewFromOtherLocations: true,
                confirmedViewFromLocationIds: [
                    getLocationId( 'LOC_C' )
                ]
            } );
        } );
        it( 'DOC_1 sees all (2) patients', async function() {
            await checkPatientVisibility( 'DOC_1', null, 2 );
        } );
        it( 'DOC_2 does not see patients with different location set in view list', async function() {
            await checkPatientVisibility( 'DOC_2', null, 1 );
        } );
        it( 'DOC_3 sees patient with who confirmed view', async function() {
            await checkPatientVisibility( 'DOC_3', null, 1 );
        } );
    } );

} );

describe( 'Test inCase with enabled strict mode with enabled "crossLocationPatientEditingAllowed" option', () => {
    before( 'Setup up', async function() {
        this.timeout( 1000 * 20 );
        await cleanDb( {user} );
        testEnv = await setupEnvirnoment( getTestSetupConfig( {
            settings: {
                crossLocationPatientEditingAllowed: true
            }
        } ) );
    } );
    describe( 'Test patient visibility without patient confirmation', () => {
        it( 'DOC_1 sees all (2) patients', async function() {
            await checkPatientVisibility( 'DOC_1', null, 2 );
        } );
        it( 'DOC_2 sees all (2) patients', async function() {
            await checkPatientVisibility( 'DOC_2', null, 2 );
        } );
        it( 'DOC_3 sees all (2) patients', async function() {
            await checkPatientVisibility( 'DOC_3', null, 2 );
        } );
        it( 'DOC_1 can change PAT_1', async function() {
            await checkPatientUpdate( 'DOC_1', 'PAT_1', {nameaffix: getRandomString( 20 )} );
        } );
        it( 'DOC_1 can change PAT_2', async function() {
            await checkPatientUpdate( 'DOC_1', 'PAT_2', {nameaffix: getRandomString( 20 )} );
        } );
        it( 'DOC_2 can change PAT_1', async function() {
            await checkPatientUpdate( 'DOC_2', 'PAT_1', {nameaffix: getRandomString( 20 )} );
        } );
        it( 'DOC_2 can change PAT_2', async function() {
            await checkPatientUpdate( 'DOC_2', 'PAT_2', {nameaffix: getRandomString( 20 )} );
        } );
        it( 'DOC_3 can change PAT_1', async function() {
            await checkPatientUpdate( 'DOC_3', 'PAT_1', {nameaffix: getRandomString( 20 )} );
        } );
    } );

} );