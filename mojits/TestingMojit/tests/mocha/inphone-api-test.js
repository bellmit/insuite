/**
 * User: dcdev
 * Date: 5/21/20  6:20 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Y, describe, it, should, expect*/

const
    mongoose = require( 'mongoose' ),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    util = require( 'util' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    runDb = util.promisify( Y.doccirrus.mongodb.runDb ),
    _ = require( 'lodash' ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

const postEntry = async ( model, entry, su ) => {
    return runDb( {
        user: su || user,
        model: model,
        action: 'post',
        data: Y.doccirrus.filters.cleanDbObject( entry )
    } );
};
const waitForInphoneUpdate = async ( self, timeToWait = 4000 ) => {
    self.timeout( self.timeout() + timeToWait );
    await formatPromiseResult(
        new Promise( ( resolve ) => {
            setTimeout( resolve, timeToWait );
        } )
    );
};
const cleanCollections = async () => {
    await cleanDb( {user, collections2clean: ['voipindex', 'patient', 'location', 'employee', 'identity']} );
};
describe( 'inphone-api tests', () => {
    const patientId = new mongoose.Types.ObjectId().toString(),
        employeeId = new mongoose.Types.ObjectId().toString(),
        identityId = new mongoose.Types.ObjectId().toString(),
        patientNo = '+41000000000',
        employeeNo = '+41000000001';
    let countryMode;

    describe( '0. Setup up.', () => {
        it( 'Clean db', async () => {
            await cleanCollections();
            // must validate for CH countryMode
            if( !Y.config ) {
                Y.config = {};
            }

            if( !Y.config.doccirrus ) {
                Y.config.doccirrus = {};
            }

            if( !Y.config.doccirrus.Env ) {
                Y.config.doccirrus.Env = {};
            }

            countryMode = Y.config.doccirrus.Env.countryMode;
            Y.config.doccirrus.Env.countryMode = ['CH'];
        } );
        it( 'Setup data', async function() {
            let error;
            const employeeData = mochaUtils.getEmployeeData( {
                    _id: employeeId,
                    countryMode: 'CH',
                    zsrNumber: 'T277489'
                } ),
                patientData = mochaUtils.getPatientData( {_id: patientId, countryMode: 'CH', cantonCode: '3'} ),
                identityData = mochaUtils.getIdentityData( {_id: identityId, specifiedBy: employeeId} );

            patientData.communications.push( {
                'type': 'PHONEPRIV',
                'value': patientNo,
                'confirmNeeded': false,
                'signaling': true
            } );
            employeeData.communications.push( {
                'type': 'PHONEPRIV',
                'value': employeeNo,
                'confirmNeeded': false,
                'signaling': true
            } );
            [error] = await formatPromiseResult( postEntry( 'employee', Y.doccirrus.filters.cleanDbObject( employeeData ) ) );
            should.not.exist( error );
            user.specifiedBy = employeeId;
            [error] = await formatPromiseResult( postEntry( 'patient', Y.doccirrus.filters.cleanDbObject( patientData ) ) );
            should.not.exist( error );
            [error] = await formatPromiseResult( postEntry( 'identity', Y.doccirrus.filters.cleanDbObject( identityData ) ) );
            should.not.exist( error );
            user.identityId = identityId;
            // voipIndex is asynchronously updated after updating person contacts. need to wait
            await waitForInphoneUpdate( this );
        } );
    } );
    describe( '1. leanSyncOnIncomingCall', () => {
        it( '1.1. should post inphone entry', async function() {
            let error, result, callingData = {
                number: patientNo,
                callee: employeeNo
            };
            [error] = await formatPromiseResult( Y.doccirrus.api.inphone.leanSyncOnIncomingCall( {
                user,
                data: callingData
            } ) );
            should.not.exist( error );
            await waitForInphoneUpdate( this );
            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'inphone',
                query: {},
                options: {
                    sort: {_id: -1},
                    limit: 1
                }
            } ) );
            should.not.exist( error );

            const expected = {
                callInfo: "Von: 41000000000 (Test Patient), An: 41000000001 (First name Last name)",
                callerType: "PATIENT",
                callername: "Herr  Test   Patient",
                caller: Y.doccirrus.commonutils.homogenisePhoneNumber( patientNo ),
                callee: Y.doccirrus.commonutils.homogenisePhoneNumber( employeeNo )
            };
            expect( _.omit( result[0], ['_id', 'callTime'] ) ).to.deep.equalInAnyOrder( expected );
        } );
    } );
    describe( 'Tear Down.', () => {
        it( 'restore country Mode', async () => {
            Y.config.doccirrus.Env.countryMode = countryMode || ['D'];
        } );
    } );
} );