/**
 * User: md
 * Date: 20/12/18  16:
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global Y, it, describe, before, after, should */

/**
 * Please, make sure that you mocked https before execution.
 * You can find mock usage in mocha-runner or:
 * mockHttps = require( '../../server/https-mock' );
 * mockHttps( Y, user );
 */

const
    mockHttps = require( '../../server/https-mock' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    URL = require( 'url' ),
    getRandomString = () => Math.random().toString( 36 ).substring( 2, 15 ),
    getHostName = () => URL.parse( Y.doccirrus.auth.getVPRCUrl() ).hostname,
    user = Y.doccirrus.auth.getSUForLocal(),
    externalGet = [],
    externalPut = [],
    externalPost = [],
    pucCalls = [],
    externalDelete = [],
    practiseId = '100000000000000000000001';

let mockedHere;

describe( 'Change vprcFQHostName', () => {
    const CUSTOMER_ID = '1234';
    let hostNameOrigin, newHostname;
    before( () => {
        if( !Y.doccirrus.https.mocked ) {
            mockHttps( Y, user );
            mockedHere = true;
        }

        Y.doccirrus.https.event.on( 'onExternalGet', ( data ) => {
            externalGet.push( data );
        } );
        Y.doccirrus.https.event.on( 'onExternalPut', ( data ) => {
            externalPut.push( data );
        } );
        Y.doccirrus.https.event.on( 'onExternalPost', ( data ) => {
            externalPost.push( data );
        } );
        Y.doccirrus.communication.event.on( 'onCallPUCAction', ( data ) => {
            pucCalls.push( data );
        } );
        Y.doccirrus.https.event.on( 'onExternalDelete', ( data ) => {
            externalDelete.push( data );
        } );
        Y.doccirrus.auth._getSUForLocal = Y.doccirrus.auth.getSUForLocal;
        Y.doccirrus.auth.getSUForLocal = () => {
            return user;
        };
        Y.doccirrus.licmgr._getActiveCustomersEnsure = Y.doccirrus.licmgr.getActiveCustomersEnsure;
        Y.doccirrus.licmgr.getActiveCustomersEnsure = ( callback ) => {
            callback( null, [
                {
                    tenantId: user.tenantId //'FAKE_TENANT_ID'
                }]
            );
        };
    } );
    after( () => {
        Y.doccirrus.https.event.removeAllListeners( 'externalGet' );
        Y.doccirrus.https.event.removeAllListeners( 'externalPut' );
        Y.doccirrus.https.event.removeAllListeners( 'externalPost' );
        Y.doccirrus.https.event.removeAllListeners( 'externalDelete' );
        Y.doccirrus.communication.event.removeAllListeners( 'onCallPUCAction' );

        if( mockedHere ) {
            //revert mocked Y.doccirrus.https
            Y.doccirrus.https = Y.doccirrus.https.original;
        }
        Y.doccirrus.auth.getSUForLocal = Y.doccirrus.auth._getSUForLocal;
        Y.doccirrus.licmgr.getActiveCustomersEnsure = Y.doccirrus.licmgr._getActiveCustomersEnsure;
    } );
    it( 'setup practice collection on test tenant', () => {
        const data = {
            _id: practiseId,
            countryMode: [mochaUtils.getCountryMode()],
            dcCustomerNo: CUSTOMER_ID,
            tenantId: user.tenantId,
            coname: 'testPractice',
            cotype: 'ARZTPRAXIS',
            serverType: 'MTS',
            systemType: 'APPLIANCE',
            addresses: [
                {
                    "street": "1",
                    "houseno": "1",
                    "zip": "12007",
                    "city": "1",
                    "country": "Deutschland",
                    "countryCode": "D",
                    "addon": "",
                    "kind": "OFFICIAL"
                }
            ]
        };
        return Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'practice',
            action: 'upsert',
            fields: Object.keys( data ),
            data: {...data, skipcheck_: true}
        } ).should.be.fulfilled.then( ( result ) => {
            should.exist( result );
        } );
    } );

    it( 'get original hostname', () => {
        hostNameOrigin = getHostName();
        hostNameOrigin.should.not.be.empty; //eslint-disable-line no-unused-expressions
    } );
    it( 'set new hostname', () => {
        newHostname = `${getRandomString()}.${hostNameOrigin}`;
        return new Promise( resolve => {
            Y.doccirrus.api.company.setVprcFQHostNameFromMVPRC( {
                user,
                data: {vprcFQHostName: newHostname},
                callback: ( err ) => {
                    should.not.exist( err );
                    //only external post is expected
                    externalGet.should.to.have.length( 0 );
                    externalPut.should.to.have.length( 0 );
                    externalDelete.should.to.have.length( 0 );

                    //expect call to puc
                    let pucCall = pucCalls.filter( el => 'setBookFlag' === el.action ),
                        dcprcCall = externalPost.filter( el => /\/\/dcprc\..*?\/1\/company\/:setVprcFQHostName/.test( el.url ) );

                    //only DCPRC external calls, PUC calls going through socket.io
                    (dcprcCall.length).should.be.equal( externalPost.length );

                    //check specific values in calls
                    pucCall[0].params.customerIdPrac.should.be.equal( CUSTOMER_ID );
                    dcprcCall[0].data.vprcFQHostName = newHostname;
                    resolve();
                }
            } );
        } ).should.be.fulfilled;
    } );
    it( 'check updated core infrastructure', () => {
        (getHostName()).should.be.equal( newHostname );
    } );
    it( 'check updated practice', () => {
        return Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'practice',
            action: 'get',
            query: {_id: '100000000000000000000001'}
        } ).should.be.fulfilled.then( ( result ) => {
            should.exist( result );
            (result[0].vprcFQHostName).should.be.equal( newHostname );
        } );
    } );
    it( 'set original hostname back', () => {
        return new Promise( resolve => {
            Y.doccirrus.api.company.setVprcFQHostNameFromMVPRC( {
                user,
                data: {vprcFQHostName: hostNameOrigin},
                callback: ( err ) => {
                    should.not.exist( err );
                    resolve();
                }
            } );
        } ).should.be.fulfilled;
    } );
    it( 'remove practise', () => {
        return Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'practice',
            action: 'delete',
            query: {
                _id: practiseId
            }
        } ).should.be.fulfilled;
    } );
} );

