/**
 * User: pi
 * Date: 10/03/16  15:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global Y, should, describe, it, expect, afterEach*/

const
    util = require( 'util' ),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    user = Y.doccirrus.auth.getSUForLocal(),
    { filterWhitelisted } = require( '../../server/mochaUtils' )( Y );

function getPatientData( data = {} ) {
    let
        patient = {
            "_id": "54be764fc404c1d77a286d4d",
            "patientNo": null,
            "patientNumber": "211",
            countryMode: ["D"],
            "kbvDob": "04.04.1970",
            "careDegree": "NO",
            "dob": "2008-04-03T22:00:00.000Z",
            "gender": "FEMALE",
            "talk": "MS",
            "markers": [],
            "physicians": [
                "54be2294c404c1d77a286c6f"
            ],
            "lastname": "A001-v2.1.2 (Ron)",
            "fk3120": "",
            "middlename": "",
            "nameaffix": "",
            "firstname": "A001-v2.1.2",
            "title": "",
            "amtsActivated": false,
            "amtsApprovalForReleaseFromConfidentiality": false,
            "amtsApprovalForDataEvaluation": false,
            "amtsParticipationInSelectiveContract": false

        };

    return Object.assign( {}, patient, data );
}

describe( 'Partner test', function() {
    const
        INCARE = Y.doccirrus.schemas.company.systemTypes.INCARE,
        INSPECTOR_LEARNING_SYSTEM = Y.doccirrus.schemas.company.systemTypes.INSPECTOR_LEARNING_SYSTEM,
        INSPECTOR_EXPERT_SYSTEM = Y.doccirrus.schemas.company.systemTypes.INSPECTOR_EXPERT_SYSTEM,
        INSPECTOR_SELECTIVECARE_SYSTEM = Y.doccirrus.schemas.company.systemTypes.INSPECTOR_SELECTIVECARE_SYSTEM,
        DSCK = Y.doccirrus.schemas.company.systemTypes.DSCK,
        DOQUVIDE = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE,
        DQS = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS,
        INCARECase = Y.doccirrus.schemas.casefolder.additionalTypes.INCARE,
        DOQUVIDECase = Y.doccirrus.schemas.casefolder.additionalTypes.DOQUVIDE,
        DQSCase = Y.doccirrus.schemas.casefolder.additionalTypes.DQS,
        getExpectedPartner = ( systemType ) => {
            let licesedConfiguration = {
                INCARE: {
                    'status': 'LICENSED',
                    'name': INCARE,
                    'dcId': INCARE,
                    'partnerType': "OTHER",
                    'comment': INCARE,
                    'systemType': INCARE,
                    'anonymizing': false,
                    'bidirectional': true,
                    'anonymizeKeepFields': [],
                    'unlock': false,
                    'configuration' : [
                        {
                            'automaticProcessing': true,
                            'subTypes': [],
                            'caseFolders': [ INCARECase ],
                            'actStatuses': [ 'ALL' ],
                            'actTypes': [ 'ALL' ]
                        }
                    ]
                },
                INSPECTOR_LEARNING_SYSTEM: {
                    'status': 'LICENSED',
                    'name': INSPECTOR_LEARNING_SYSTEM,
                    'dcId': INSPECTOR_LEARNING_SYSTEM,
                    'partnerType': "OTHER",
                    'comment': INSPECTOR_LEARNING_SYSTEM,
                    'systemType': INSPECTOR_LEARNING_SYSTEM,
                    'anonymizing': true,
                    'bidirectional': true,
                    'anonymizeKeepFields': [],
                    'preserveCaseFolder': true,
                    'unlock': false,
                    'configuration' : [
                        {
                            'automaticProcessing': true,
                            'condition': Y.doccirrus.schemas.partner.conditionsType.AmtsApprovalForDataEvaluation,
                            'subTypes': [],
                            'caseFolders': [ 'ALL' ],
                            'actStatuses': [ 'APPROVED' ],
                            'actTypes': [ 'AMTSSCHEIN' ]
                        }
                    ]
                },
                INSPECTOR_EXPERT_SYSTEM: {
                    'status': 'LICENSED',
                    'name': INSPECTOR_EXPERT_SYSTEM,
                    'dcId': INSPECTOR_EXPERT_SYSTEM,
                    'partnerType': "OTHER",
                    'comment': INSPECTOR_EXPERT_SYSTEM,
                    'systemType': INSPECTOR_EXPERT_SYSTEM,
                    'anonymizing': true,
                    'bidirectional': true,
                    'anonymizeKeepFields': [],
                    'preserveCaseFolder': true,
                    'unlock': false,
                    'configuration' : [
                        {
                            'automaticProcessing': true,
                            'subTypes': [ 'Expertenanfrage' ],
                            'caseFolders': [ 'ALL' ],
                            'actStatuses': [ 'APPROVED' ],
                            'actTypes': [ 'COMMUNICATION' ]
                        }
                    ]
                },
                INSPECTOR_SELECTIVECARE_SYSTEM: {
                    'status': 'LICENSED',
                    'name': INSPECTOR_SELECTIVECARE_SYSTEM,
                    'dcId': INSPECTOR_SELECTIVECARE_SYSTEM,
                    'partnerType': "OTHER",
                    'comment': INSPECTOR_SELECTIVECARE_SYSTEM,
                    'systemType': INSPECTOR_SELECTIVECARE_SYSTEM,
                    'anonymizing': false,
                    'bidirectional': true,
                    'anonymizeKeepFields': [],
                    'unlock': false,
                    'preserveCaseFolder': true,
                    'configuration' : [
                        {
                            'automaticProcessing': true,
                            'subTypes': [],
                            'caseFolders': [ 'AMTS' ],
                            'actStatuses': [ 'APPROVED' ],
                            'actTypes': [ 'TREATMENT' ]
                        },
                        {
                            'automaticProcessing': true,
                            'subTypes': [ 'Einschreibung' ],
                            'caseFolders': [ 'AMTS' ],
                            'actStatuses': [ 'APPROVED' ],
                            'actTypes': [ 'PROCESS' ]
                        },
                        {
                            'automaticProcessing': true,
                            'subTypes': [ 'Vertragsende' ],
                            'caseFolders': [ 'AMTS' ],
                            'actStatuses': [ 'APPROVED' ],
                            'actTypes': [ 'PROCESS' ]
                        }
                    ]
                },
                DOQUVIDE: {
                    'status': 'LICENSED',
                    'name': DOQUVIDE,
                    'dcId': DOQUVIDE,
                    'partnerType': "OTHER",
                    'comment': DOQUVIDE,
                    'systemType': DSCK,
                    'anonymizing': true,
                    'bidirectional': true,
                    'anonymizeKeepFields': [],
                    'unlock': false,
                    'configuration': [
                        {
                            'automaticProcessing': true,
                            'subTypes': [DSCK],
                            'caseFolders': [DOQUVIDECase],
                            'actStatuses': ['ALL'],
                            'actTypes': ['FORM']
                        }
                    ]
                },
                DQS: {
                    'status': 'LICENSED',
                    'name': DQS,
                    'dcId': DQS,
                    'partnerType': "OTHER",
                    'comment': DQS,
                    'systemType': DSCK,
                    'anonymizing': true,
                    'bidirectional': true,
                    'anonymizeKeepFields': [],
                    'unlock': false,
                    'configuration': [
                        {
                            'automaticProcessing': true,
                            'subTypes': [DSCK],
                            'caseFolders': [DQSCase],
                            'actStatuses': ['ALL'],
                            'actTypes': ['FORM']
                        }
                    ]
                }
            };

            return licesedConfiguration[systemType];
        };

    describe( '1. getPartnerQueryForAmts', function() {

        it( '1.1. Should return query for partner amts if patient not approved data evaluation', function() {
            let
                patient = getPatientData(
                    {
                        amtsApprovalForDataEvaluation: false,
                        amtsParticipationInSelectiveContract: true
                    }
                ),
                result = Y.doccirrus.schemas.partner.getPartnerQueryForAmts( patient );

            should.exist( result );
            result.should.be.an( 'array' );
            result.should.have.lengthOf( 1 );
            result[0].should.be.an( 'object' );
            result[0].should.be.eql( {condition: {$ne: 'AmtsApprovalForDataEvaluation'}} );
        } );

        it( '1.2. Should return query for partner amts if patient not approved inselective contract participation', function() {
            let
                patient = getPatientData(
                    {
                        amtsApprovalForDataEvaluation: true,
                        amtsParticipationInSelectiveContract: false
                    }
                ),
                result = Y.doccirrus.schemas.partner.getPartnerQueryForAmts( patient );

            should.exist( result );
            result.should.be.an( 'array' );
            result.should.have.lengthOf( 1 );
            result[0].should.be.an( 'object' );
            result[0].should.be.eql( {condition: {$ne: 'AmtsParticipationInSelectiveContract'}} );
        } );

        it( '1.3. Should return query for partner amts if patient not approved data evaluation and inselective contract participation', function() {
            let
                patient = getPatientData(
                    {
                        amtsApprovalForDataEvaluation: false,
                        amtsParticipationInSelectiveContract: false
                    }
                ),
                result = Y.doccirrus.schemas.partner.getPartnerQueryForAmts( patient );

            should.exist( result );
            result.should.be.an( 'array' );
            result.should.have.lengthOf( 2 );
            result[0].should.be.an( 'object' );
            result[0].should.be.eql( {condition: {$ne: 'AmtsApprovalForDataEvaluation'}} );
            result[1].should.be.an( 'object' );
            result[1].should.be.eql( {condition: {$ne: 'AmtsParticipationInSelectiveContract'}} );
        } );

        it( '1.4. Should return empty query array for partner amts if patient approved both', function() {
            let
                patient = getPatientData(
                    {
                        amtsApprovalForDataEvaluation: true,
                        amtsParticipationInSelectiveContract: true
                    }
                ),
                result = Y.doccirrus.schemas.partner.getPartnerQueryForAmts( patient );

            should.exist( result );
            result.should.be.an( 'array' );
            result.should.have.lengthOf( 0 );
        } );
    } );

    describe( '2. checkAndAddLicensedPartner', function() {
        const
            checkAndAddLicensedPartner = util.promisify( Y.doccirrus.api.partner.checkAndAddLicensedPartner ),
            partnerWhiteListed = [
                'status', 'name', 'dcId', 'partnerType', 'comment', 'systemType', 'anonymizing', 'unlock', 'preserveCaseFolder',
                'bidirectional', 'anonymizeKeepFields', 'configuration', 'configuration.caseFolders', 'configuration.condition',
                'configuration.subTypes', 'configuration.automaticProcessing', 'configuration.actStatuses', 'configuration.actTypes'
            ];

        const
            getPartner = ( systemType ) => {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'partner',
                    query: {
                        'status': 'LICENSED',
                        'dcId': systemType
                    },
                    options: {
                        lean: true,
                        limit: 1
                    }
                } );
            },
            checkInsert = async ( systemType, expectedResult ) => {
                let [err, result] = await formatPromiseResult( checkAndAddLicensedPartner( user, systemType ) );

                should.not.exist( err );
                result.should.be.an( 'object' );
                result = result.result || result; //if insert done: result.result else just result
                result.should.be.eql( expectedResult );

                [err, result] = await formatPromiseResult( getPartner( systemType ) );
                should.not.exist( err );
                result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                let whiteListedResult = filterWhitelisted( result[0], [], partnerWhiteListed );
                expect( whiteListedResult ).to.deep.equalInAnyOrder( getExpectedPartner( systemType ) );
                return result;
            },
            checkUpdate = async ( systemType, expectedResult, clearSubtype = true ) => {
                const
                    isDSCK = [DQS, DOQUVIDE].includes(systemType),
                    isInspectorExpertSystem = systemType === INSPECTOR_EXPERT_SYSTEM,
                    isIncare = systemType === INCARE;

                //do insert first to ensure partner is created
                let insertedPartner = await checkInsert( systemType, { n: 1, ok: 1 } );

                if( clearSubtype ){
                    //update partner with cleared subType in config
                    await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'partner',
                        action: 'update',
                        query: { _id: insertedPartner[0]._id },
                        data: { $set: { configuration: [ { ...insertedPartner[0].configuration[0], subTypes: [] } ] } }
                    } );
                }

                //process licensed partners one more time to update if needed
                let [err, result] = await formatPromiseResult( checkAndAddLicensedPartner( user, systemType ) );

                should.not.exist( err );
                if (isIncare) {
                    should.not.exist( result ); //from return callback()
                } else {
                    result.should.be.an( 'object' );
                    result.should.be.eql( expectedResult );
                }

                //check that subType processed as expected
                [err, result] = await formatPromiseResult( getPartner( systemType ) );
                should.not.exist( err );
                result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                (result[0].configuration[0].subTypes).should.be.an( 'array' ).which.has.lengthOf( isDSCK || isInspectorExpertSystem ? 1 : 0 );
                if( isDSCK ){
                    (result[0].configuration[0].subTypes[0]).should.be.equal( 'DSCK' );
                }
            };

        afterEach( async function() {
            this.timeout( 4000 );
            //delete partners to provide clean state for test case, can't be done with runDb/delete due to pre processing validation
            await Y.doccirrus.mongodb.getModel( user, 'partner', true ).then( model => {
                return model.mongoose.collection.remove( {
                    'status': 'LICENSED',
                    'dcId': {$in: [INCARE, DOQUVIDE, DQS, INSPECTOR_EXPERT_SYSTEM, INSPECTOR_LEARNING_SYSTEM, INSPECTOR_SELECTIVECARE_SYSTEM]}
                } );
            } );
        } );

        it( 'Should insert INCARE partner while not exists on system', async function() {
            this.timeout( 4000 );
            await checkInsert( INCARE, { n: 1, ok: 1 } );
        } );

        it( 'Should insert DOQUVIDE partner while not exists on system', async function() {
            this.timeout( 4000 );
            await checkInsert( DOQUVIDE, { n: 1, ok: 1 } );
        } );

        it( 'Should insert DQS partner while not exists on system', async function() {
            this.timeout( 4000 );
            await checkInsert( DQS, { n: 1, ok: 1 } );
        } );

        it( 'Should NOT insert DQS partner because it already exists on system', async function() {
            this.timeout( 4000 );
            await checkInsert( DQS, { n: 1, ok: 1 } );
            //do same processing twice
            await checkInsert( DQS, { n: 0, nModified: 0, ok: 1 } );
        } );

        it( 'Should insert INSPECTOR_LEARNING_SYSTEM partner while not exists on system', async function() {
            this.timeout( 4000 );
            await checkInsert( INSPECTOR_LEARNING_SYSTEM, { n: 1, ok: 1 } );
        } );

        it( 'Should insert INSPECTOR_EXPERT_SYSTEM partner while not exists on system', async function() {
            this.timeout( 4000 );
            await checkInsert( INSPECTOR_EXPERT_SYSTEM, { n: 1, ok: 1 } );
        } );

        it( 'Should insert INSPECTOR_SELECTIVECARE_SYSTEM partner while not exists on system', async function() {
            this.timeout( 4000 );
            await checkInsert( INSPECTOR_SELECTIVECARE_SYSTEM, { n: 1, ok: 1 } );
        } );

        it( 'Should NOT update INCARE partner', async function() {
            this.timeout( 4000 );
            await checkUpdate( INCARE, undefined );
        } );

        it( 'Should update DOQUVIDE partner because subtype is empty', async function() {
            this.timeout( 4000 );
            await checkUpdate( DOQUVIDE, { n: 1, nModified: 1, ok: 1 } );
        } );

        it( 'Should update DQS partner because subtype is empty', async function() {
            this.timeout( 4000 );
            await checkUpdate( DQS, { n: 1, nModified: 1, ok: 1 } );
        } );

        it( 'Should NOT update DQS partner because subtype is not empty', async function() {
            this.timeout( 4000 );
            await checkUpdate( DQS, { n: 0, nModified: 0, ok: 1 }, false );
        } );

        it( 'Should update INSPECTOR_LEARNING_SYSTEM partner', async function() {
            this.timeout( 4000 );
            await checkUpdate( INSPECTOR_LEARNING_SYSTEM, { n: 1, nModified: 1, ok: 1 } );
        } );

        it( 'Should update INSPECTOR_EXPERT_SYSTEM partner', async function() {
            this.timeout( 4000 );
            await checkUpdate( INSPECTOR_EXPERT_SYSTEM, { n: 1, nModified: 1, ok: 1 } );
        } );

        it( 'Should update INSPECTOR_SELECTIVECARE_SYSTEM partner', async function() {
            this.timeout( 4000 );
            await checkUpdate( INSPECTOR_SELECTIVECARE_SYSTEM, { n: 1, nModified: 1, ok: 1 } );
        } );
    } );

    describe( '3. removeConfigurationForLicensedPartner', function() {
        const
            removeConfigurationForLicensedPartner = util.promisify( Y.doccirrus.api.partner.removeConfigurationForLicensedPartner ),
            getPartner = ( systemType ) => {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'partner',
                    query: {
                        'status': 'LICENSED',
                        'dcId': systemType
                    },
                    options: {
                        lean: true,
                        limit: 1
                    }
                } );
            },
            insertPartner = ( systemType ) => {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'partner',
                    action: 'mongoInsertOne',
                    data: getExpectedPartner( systemType )
                } );
            };

        afterEach( async function() {
            this.timeout( 4000 );
            //delete partners to provide clean state for test case, can't be done with runDb/delete due to pre processing validation
            await Y.doccirrus.mongodb.getModel( user, 'partner', true ).then( model => {
                return model.mongoose.collection.remove( {
                    'status': 'LICENSED',
                    'dcId': {$in: [INCARE, DOQUVIDE, DQS, INSPECTOR_LEARNING_SYSTEM, INSPECTOR_EXPERT_SYSTEM, INSPECTOR_SELECTIVECARE_SYSTEM ]}
                } );
            } );
        } );

        it( 'Returns an error when there is no partner with such dcId', async function() {
            this.timeout( 4000 );
            let [err] = await formatPromiseResult( removeConfigurationForLicensedPartner( user, INSPECTOR_EXPERT_SYSTEM ) );
            should.exist( err );
        } );

        it( 'Returns true when partner\'s configuration successfully updated', async function() {
            this.timeout( 4000 );
            let err, result;

            [err] = await formatPromiseResult( insertPartner( INSPECTOR_EXPERT_SYSTEM ) );
            should.not.exist( err );
            [err, result] = await formatPromiseResult( removeConfigurationForLicensedPartner( user, INSPECTOR_EXPERT_SYSTEM ) );
            should.not.exist( err );
            result.should.be.equal( true );
            [err, result] = await formatPromiseResult( getPartner( INSPECTOR_EXPERT_SYSTEM ) );
            should.not.exist( err );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            (result[0].dcId).should.be.equal( INSPECTOR_EXPERT_SYSTEM );
            (result[0].configuration).should.be.eql( [] );
        } );
    } );

} );
