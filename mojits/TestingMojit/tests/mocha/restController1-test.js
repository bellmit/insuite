/**
 * User: pi
 * Date: 05.12.17  08:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe, after, before */
const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    mongoose = require( 'mongoose' ),
    identityId = new mongoose.Types.ObjectId().toString(),
    employeeId = new mongoose.Types.ObjectId().toString(),
    user = Y.doccirrus.auth.getSUForLocal();

function makeCall( path, params = {} ) {
    const
        config = {
            params: Object.assign( {
                '0': path.replace( '/1/', '' ),
                identityId
            }, params ),
            req: {
                method: 'POST',
                path: path,
                isFromFriend: true,
                friendData: {appName: 'UVITA'},
                user: user
            }
        };
    return new Promise( ( resolve, reject ) => {
        Y.doccirrus.RESTController_1.handleRequest( config, ( err, result ) => {
            if( err ) {
                return reject( err );
            }
            resolve( result );
        } );
    } );
}

describe( 'Test rest controller calls by friends', function() {
    describe( '0. Setup', function() {
        it( 'cleans db', function( done ) {
            this.timeout( 20000 );
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
        it( 'Inserts identity', function() {
            let
                identityData = mochaUtils.getIdentityData( {
                    _id: identityId,
                    specifiedBy: employeeId,
                    partnerIds: [{partnerId: 'UVITA'}]
                } );
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'post',
                data: Object.assign( {skipcheck_: true}, identityData )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
            } );
        } );
    } );
    describe( '1. Test blind proxy calls', function() {
        it( 'Makes blind proxy call with remote url "/1/practice/:getMyPractice" - 200', function() {
            return makeCall( '/1/metaprac/:blindproxy', {
                patientregid: '5a2124860d79dc0d77472ed3',
                remoteurl: '/1/practice/:getMyPractice',
                remoteparams: '{"source_":"patient","id_":"5a2124870d79dc0d77472ed4"}',
                remotemethod: 'GET',
                ann: '/1/practice/:getMyPractice'
            } )
                .should.be.fulfilled;
        } );
        it( 'Makes blind proxy call with remote url "/1/location" - 200', function() {
            return makeCall( '/1/metaprac/:blindproxy', {
                patientregid: '5a2663c24e561a083028d464',
                remoteurl: '/1/location',
                remoteparams: '{"pubKeyHash_":"7e4aba69bcea38d58a02bdc505a025a3b3938daa","source_":"patient","id_":"5a2124870d79dc0d77472ed4"}',
                remotemethod: 'GET',
                ann: '/1/location'
            } ).should.be.fulfilled;
        } );
        it( 'Makes blind proxy call with remote url "/1/document/:patientDocument" - 200', function() {
            return makeCall( '/1/metaprac/:blindproxy', {
                patientregid: {
                    _id: '5a2663c24e561a083028d464',
                    identityId: '5a2663d74e561a083028d465',
                    patientId: '5a2124870d79dc0d77472ed4',
                    customerIdPat: '5a212617d555560ddd44cd3d',
                    customerIdPrac: '1001',
                    accessPRC: true,
                    prcKey: 'g8nIM/d/lkHmg5rsMAWdjMipwNR9iPNjDiqH1FYEg1wfpwqWfC2VPfXfgAX3X8YZW6Xq1Fr4K0I0oc7VzIfeKw==',
                    confirmed: true
                },
                remoteurl: '/1/document/:patientDocument',
                remoteparams: '{"itemsPerPage":1000,"page":1,"sort":"createdOn","pubKeyHash_":"7e4aba69bcea38d58a02bdc505a025a3b3938daa","source_":"patient","id_":"5a2124870d79dc0d77472ed4"}',
                remotemethod: 'GET',
                patientreg: {
                    _id: '5a2663c24e561a083028d464',
                    identityId: '5a2663d74e561a083028d465',
                    patientId: '5a2124870d79dc0d77472ed4',
                    customerIdPat: '5a212617d555560ddd44cd3d',
                    customerIdPrac: '1001',
                    accessPRC: true,
                    prcKey: 'g8nIM/d/lkHmg5rsMAWdjMipwNR9iPNjDiqH1FYEg1wfpwqWfC2VPfXfgAX3X8YZW6Xq1Fr4K0I0oc7VzIfeKw==',
                    confirmed: true
                },
                ann: '/1/document/:patientDocument'
            } ).should.be.fulfilled;
        } );

        it( 'Makes blind proxy call with remote url "metaprac/:someOtherApi" - 401', function() {
            return makeCall( '/1/metaprac/:someOtherApi', {
                patientregid: '5a2663c24e561a083028d464',
                remoteurl: '/1/location',
                remoteparams: '{"pubKeyHash_":"7e4aba69bcea38d58a02bdc505a025a3b3938daa","source_":"patient","id_":"5a2124870d79dc0d77472ed4"}',
                remotemethod: 'GET',
                ann: '/1/location'
            } ).should.be.rejected;
        } );
    } );

    describe( '2. Test patientportal api calls', function() {
        const
            onGetFullPracticeInfo = [];
        before( function() {
            Y.doccirrus.api.patientportal.event.on( 'onGetFullPracticeInfo', ( params ) => {
                onGetFullPracticeInfo.push( params );
            } );
        } );
        after( function() {
            Y.doccirrus.api.patientportal.event.removeAllListeners( 'onGetFullPracticeInfo' );
        } );
        it( 'Makes "someOtherApi" call - 401', function() {
            return makeCall( '/1/patientportal/:someOtherApi' )
                .catch( err => {
                    err.code.should.be.equal( 401 );
                    throw err;
                } )
                .should.be.rejected;
        } );
        it( 'Makes "getFullPracticeInfo" call - 200', function() {
            return makeCall( '/1/patientportal/:getFullPracticeInfo', {identityId} ).should.be.fulfilled;
        } );
        it( 'Makes "getPracticeAppointmentTypes" call - 200', function() {
            return makeCall( '/1/patientportal/:getPracticeAppointmentTypes' ).should.be.fulfilled;
        } );
        it( 'Makes "getFreeAppointments" call- 200', function() {
            return makeCall( '/1/patientportal/:getFreeAppointments' ).should.be.fulfilled;
        } );
        it( 'Makes "makeAppointment" call - 200', function() {
            return makeCall( '/1/patientportal/:makeAppointment' ).should.be.fulfilled;
        } );
        it( 'Makes "getPatientSchedule" call - 200', function() {
            return makeCall( '/1/patientportal/:getPatientSchedule' ).should.be.fulfilled;
        } );
        it( 'Checks onGetFullPracticeInfo', function() {
            onGetFullPracticeInfo.should.have.lengthOf( 1 );
            onGetFullPracticeInfo[0].user.groups.forEach( item => {
                delete item._id;
            } );
            onGetFullPracticeInfo[0].user.should.deep.equal( {
                U: "First name Last name",
                groups: [
                    {
                        group: "ADMIN"
                    },
                    {
                        group: "CONTROLLER"
                    },
                    {
                        group: "PHYSICIAN"
                    }
                ],
                id: "username",
                identityId: identityId,
                locations: [],
                roles: [],
                specifiedBy: employeeId,
                tenantId: "1213141513Mocha"
            } );
        } );

    } );

    describe( '3. Test getApiUser', function() {
        it( 'Checks getApiUser of patientportal api, action "register"', function( done ) {
            Y.doccirrus.api.patientportal.getApiUser( {
                rest: {
                    action: 'register'
                }
            }, ( err, user ) => {
                should.not.exist( err );
                should.exist( user );
                user.id.should.equal( 'su' );
                done();
            } );
        } );
    } );
} );
