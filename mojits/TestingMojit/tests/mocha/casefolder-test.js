/**
 * User: pi
 * Date: 13/07/15  12:33
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global Y, before, after, should, it, describe */

const
    mongoose = require( 'mongoose' ),
    util = require( 'util' ),
    moment = require( 'moment' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    getObjectIds = mochaUtils.getObjectIds,
    mainLocationId = new mongoose.Types.ObjectId().toString(),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal(),
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    getCaseFileLight = promisifyArgsCallback( Y.doccirrus.api.activity.getCaseFileLight );

describe( 'Case folder tests.', function() {
    after( async function() {
        await cleanDb( {user} );
    } );

    describe( 'Check case folder creation', function() {
        let
            patientId, gkvCaseFolderId, pkvCaseFolderId;

        before( async function() {
            await cleanDb( {user} );

            [ patientId, gkvCaseFolderId, pkvCaseFolderId ] = getObjectIds();

            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: mainLocationId
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient',
                    _id: patientId,
                    insuranceStatus: [
                        {
                            'insuranceId': '109519005',
                            'insuranceName': 'AOK Nordost - Die Gesundheitskasse',
                            'insurancePrintName': 'AOK Nordost',
                            'insuranceGrpId': '72101',
                            'type': 'PUBLIC',
                            'kv': '72',
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
                            'fk4133': null,
                            'locationId': mainLocationId
                        }
                    ]
                } ) )
            } );
        } );

        it( 'Inserts PVK caseFolder', function() {
            let
                caseFolderData = mochaUtils.getCaseFolderData( {
                    patientId,
                    _id: pkvCaseFolderId,
                    type: 'PRIVATE'
                } );
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'casefolder',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
            } )
                .should.be.rejected.and.eventually.include( {code: 14004} );
        } );
        it( 'Inserts GKV caseFolder', function() {
            let
                caseFolderData = mochaUtils.getCaseFolderData( {
                    patientId,
                    _id: gkvCaseFolderId
                } );
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'casefolder',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
            } ).should.be.fulfilled.then( ( data ) => {
                should.exist( data );
                data.should.contain( gkvCaseFolderId );
            } );
        } );
    } );

    describe( 'Audit case open', function() {
        let patientId, caseFolderId;

        before( async function() {
            this.timeout( 20000 );
            await cleanDb( {user} );

            [ patientId, caseFolderId ] = getObjectIds();

            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: mainLocationId
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient',
                    _id: patientId,
                    insuranceStatus: [
                        {
                            'insuranceId': '109519005',
                            'insuranceName': 'AOK Nordost - Die Gesundheitskasse',
                            'insurancePrintName': 'AOK Nordost',
                            'insuranceGrpId': '72101',
                            'type': 'PUBLIC',
                            'kv': '72',
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
                            'fk4133': null,
                            'locationId': mainLocationId
                        }
                    ]
                } ) )
            } );
            let
                caseFolderData = mochaUtils.getCaseFolderData( {
                    patientId,
                    _id: caseFolderId
                } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'casefolder',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
            } );
        } );

        it( 'Open caseFolder should create audit record', async function() {
            await getCaseFileLight( {
                user,
                query: {patientId, caseFolderId},
                options: {}
            } );

            const audits = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'audit',
                action: 'get',
                query: {
                    action: 'open',
                    model: 'caseFolder'
                }
            } );
            audits.should.be.an( 'array' ).which.has.lengthOf( 1 );
            audits[0].objId.should.be.equal( caseFolderId );
        } );

        it( 'Open same caseFolder again should not create new audit record', async function() {
            await getCaseFileLight( {
                user,
                query: {patientId, caseFolderId},
                options: {}
            } );

            const audits = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'audit',
                action: 'get',
                query: {
                    action: 'open',
                    model: 'caseFolder'
                }
            } );
            audits.should.be.an( 'array' ).which.has.lengthOf( 1 );
            audits[0].objId.should.be.equal( caseFolderId );
        } );

        it( 'Open caseFolder by another user should create audit record', async function() {
            const
                oldUserId = user.identityId,
                newUserId = oldUserId + '_01';

            await getCaseFileLight( {
                user: {...user, identityId: newUserId},
                query: {patientId, caseFolderId},
                options: {}
            } );

            const audits = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'audit',
                action: 'get',
                query: {
                    action: 'open',
                    model: 'caseFolder'
                }
            } );
            audits.should.be.an( 'array' ).which.has.lengthOf( 2 );
            should.exist( audits.find( audit => audit.userId === oldUserId ) );
            should.exist( audits.find( audit => audit.userId === newUserId ) );
        } );

        it( 'Open caseFolder by another System user should not create audit record', async function() {
            const
                oldUserId = user.identityId,
                newUserId = oldUserId + '_02';

            //note user has additional field su that mark it as system user
            await getCaseFileLight( {
                user: {...user, identityId: newUserId, su: newUserId},
                query: {patientId, caseFolderId},
                options: {}
            } );

            const audits = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'audit',
                action: 'get',
                query: {
                    action: 'open',
                    model: 'caseFolder'
                }
            } );
            audits.should.be.an( 'array' ).which.has.lengthOf( 2 );
            should.not.exist( audits.find( audit => audit.userId === newUserId ) );
        } );

        it( 'Open caseFolder after 1 hour should create new audit record', async function() {
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'audit',
                action: 'update',
                query: {
                    action: 'open',
                    model: 'caseFolder',
                    objId: caseFolderId,
                    userId: user.identityId
                },
                data: {$set: {timestamp: moment().subtract( 65, 'minutes' ).toDate()}}
            } );

            await getCaseFileLight( {
                user,
                query: {patientId, caseFolderId},
                options: {}
            } );

            const audits = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'audit',
                action: 'get',
                query: {
                    action: 'open',
                    model: 'caseFolder'
                }
            } );
            audits.should.be.an( 'array' ).which.has.lengthOf( 3 );
        } );
    } );

    describe( 'Audit All cases open', function() {
        let patientId, caseFolderId, historyId;

        before( async function() {
            this.timeout( 20000 );
            await cleanDb( {user} );

            [ patientId, caseFolderId, historyId] = getObjectIds();

            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: mainLocationId
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient',
                    _id: patientId,
                    insuranceStatus: [
                        {
                            'insuranceId': '109519005',
                            'insuranceName': 'AOK Nordost - Die Gesundheitskasse',
                            'insurancePrintName': 'AOK Nordost',
                            'insuranceGrpId': '72101',
                            'type': 'PUBLIC',
                            'kv': '72',
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
                            'fk4133': null,
                            'locationId': mainLocationId
                        }
                    ]
                } ) )
            } );

            let
                caseFolderData = mochaUtils.getCaseFolderData( {
                    patientId,
                    _id: caseFolderId
                } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'casefolder',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
            } );

            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'mongoInsertOne',
                data: {
                    _id: historyId,
                    actType: 'HISTORY',
                    timestamp: new Date(),
                    patientId,
                    employeeId: user.identityId,
                    locationId: mainLocationId,
                    content: '5',
                    caseFolderId,
                    __t: 'HISTORY',
                    status: 'VALID',
                    userContent: '5'
                }
            } );
        } );

        it( 'Open "All case Folders" should create new audit record if there are at least one activity in case folder', async function() {
            //note caseFolderId is not specified in call
            await getCaseFileLight( {
                user,
                query: {patientId},
                options: {}
            } );

            const audits = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'audit',
                action: 'get',
                query: {
                    action: 'open',
                    model: 'caseFolder'
                }
            } );
            audits.should.be.an( 'array' ).which.has.lengthOf( 1 );
            audits[0].objId.should.be.equal( caseFolderId );
        } );
    } );
} );
