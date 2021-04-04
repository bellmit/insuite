/**
 * User: mahmoud
 * Date: 15/06/15  16:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global describe, it */

var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    countryMode = utils.countryMode,
    testData = utils.getTestData( 'patient-test-data' ),
    modelName = 'patient';

describe( 'Clean up data', function() {
    testLib.cleanUpWellKnownIds();
} );

testLib.insertCommonSuites( modelName, testData );

var
    modelData = testData.getData(),
    addr = testData.putParams.address,
    comm = testData.putParams.communication;

function addressesSuite() {
    var
        myData = {};

    describe( 'PUT patient.addresses', function() {

        it( 'PUT addresses', function( done ) {
            utils.put( modelName, `/${modelData._id}/addresses/${addr._id}`, addr, function( error, body ) {
                myData.body = body;
                myData.error = error;
                done();
            } );
        } );

        testLib.insertCommonChecks( myData );

        it( 'should return the target address entry', function( done ) {
            myData.body.data[0].should.be.an( 'object' );
            myData.body.data[0].should.contain.all.keys( Object.keys( addr ) );
            myData.body.data[0].street.should.equal( addr.street );
            done();
        } );
    } );
}

function communicationsSuite() {
    describe( 'PUT patient.communications', function() {
        var
            myData = {};

        it( 'PUT communications', function( done ) {
            utils.put( modelName, `/${modelData._id}/communications/${comm._id}`, comm, function( error, body ) {
                myData.body = body;
                myData.error = error;
                done();
            } );
        } );

        testLib.insertCommonChecks( myData );

        it( 'should return the target communication entry', function( done ) {
            myData.body.data[0].should.be.an( 'object' );
            myData.body.data[0].should.contain.all.keys( Object.keys( comm ) );
            myData.body.data[0].value.should.equal( comm.value );
            done();
        } );
    } );
}

function insuranceStatusSuite() {
    describe( 'PUT patient.insuranceStatus', function() {
        var
            insuranceStatus = modelData.insuranceStatus[0],
            myData = {};

        insuranceStatus.insuranceName = 'Bime Abalfarz!';

        it( 'PUT insuranceStatus', function( done ) {
            utils.put( modelName, `/${modelData._id}/insuranceStatus/${insuranceStatus._id}`, insuranceStatus, function( error, body ) {
                myData.body = body;
                myData.error = error;
                done();
            } );
        } );

        testLib.insertCommonChecks( myData );
        if ( !countryMode || countryMode === 'de' ) {
            it( 'should return the target insuranceStatus entry', function( done ) {
                myData.body.data[0].should.be.an( 'object' );
                myData.body.data[0].should.contain.all.keys( Object.keys( insuranceStatus ).filter( ( el ) => {
                    return el !== 'cardSwipe'; // skip read only field
                } )  );
                myData.body.data[0].insuranceName.should.equal( insuranceStatus.insuranceName );
                myData.body.meta.warnings[0].should.have.deep.property( 'code', '100001' );
                done();
            } );
        }
    } );
}

modelData.addresses.push( addr );

describe( 'PUT patient.addresses/communications directly', function() {

    modelData.communications.push( comm );
    modelData.addresses.push( addr );

    const
        modelTestDataObj = {
            getData() {
                return modelData;
            },
            getPostResult: testData.getPostResult,
            getDeleteResult: testData.getDeleteResult
        };
    testLib.insertPOSTSuite( modelName, modelTestDataObj, { description: 'POST patient with a new address and communication' }, function afterCb( error, body ) {
        // eslint-disable-next-line no-mixed-operators
        modelData._id = body.data[0] && body.data[0]._id || body.data[0];
    } );

    addressesSuite();
    communicationsSuite();
    insuranceStatusSuite();

    testLib.insertDELETESuite( modelName, modelTestDataObj, { query: { _id: modelData._id } } );
} );
