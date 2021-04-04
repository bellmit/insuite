/**
 * User: mahmoud
 * Date: 15/06/15  16:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*global should, describe, it*/

var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    patientTestData = utils.getTestData( 'patient-test-data' ),
    employeeTestData = utils.getTestData( 'user-test-data' ),
    contractTestData = utils.getTestData( 'contract-pkv-invoice-test-data' ),
    testDataPhysio = utils.getTestData( 'utility-physio-test-data' ),
    testDataWrongIcdPhysio = utils.getTestData( 'utility-physio-wrong-icd-test-data' ),
    testDataPhysioAgreement = utils.getTestData( 'utility-physio-agreement-test-data' ),
    testDataPhysioWrongUt = utils.getTestData( 'utility-physio-wrong-ut-test-data' ),
    testDataLogo = utils.getTestData( 'utility-logo-test-data' ),
    locationTestData = utils.getTestData( 'location-test-data' );

var
    myParams = {
        contract: contractTestData.getData(),
        patientQuery: {_id: patientTestData.getData()._id},
        employeeQuery: {},
        contractQuery: {},
        caseFolderQuery: {},
        diagnosisQuery: {},
        locationQuery: {}
    };

// fails because post api code removes or adds fields on check/sanitizing
// testLib.insertCommonActivitySuite( 'utility', testDataPhysio, {} );
// testLib.insertCommonActivitySuite( 'utility', testDataLogo, {} );

function updateInputData( testData, patientId, caseFolderId, timestamp ) {
    testData.patientId = patientId;
    testData.caseFolderId = caseFolderId;
    testData.timestamp = timestamp;
}

describe( 'Clean up data', function() {
    testLib.cleanUpWellKnownIds();
} );

describe( 'Setup Location', function() {
    testLib.insertPOSTSuite( 'location', locationTestData, {}, function successCb( error, body ) {
        var locationId = body.data[0];
        myParams.locationQuery._id = locationId;
    } );
} );


describe( 'Setup Employee', function() {
    testLib.insertPOSTSuite( 'user', employeeTestData, {}, function successCb( error, body ) {
        myParams.employeeQuery._id = body.data[0];
    } );
} );

describe( 'Setup Patient', function() {
    testLib.insertPOSTSuite( 'patient', patientTestData, {}, function successCb( error, body ) {
        var patientId = body.data[0];
        myParams.patientQuery._id = patientId;
        // myParams.contract.patientId = patientId;
        myParams.contract.timestamp = Date.now();
    } );
} );

describe( 'Setup PKV SCHEIN', function() {
    myParams.contract.scheinRemittor = '934770004';
    myParams.contract.scheinEstablishment = '700100200';

    testLib.insertPOSTSuite( 'contract', {
            getData(){
                return myParams.contract;
            },
            getPostResult: contractTestData.getPostResult
        }, {},
        function successCb( error, body ) {
            myParams.contractQuery._id = body.data[0];
        } );
});

describe( 'checking created contract', function() {
    testLib.insertGETSuite( 'contract', {}, {query: myParams.contractQuery}, function successCb( error, body ) {
        myParams.caseFolderQuery._id = body.data[0].caseFolderId;

        updateInputData( testDataPhysio.putParams.data, myParams.patientQuery._id, body.data[0].caseFolderId, Date.now() );
        updateInputData( testDataWrongIcdPhysio.putParams.data, myParams.patientQuery._id, body.data[0].caseFolderId, Date.now() );
        updateInputData( testDataPhysioAgreement.putParams.data, myParams.patientQuery._id, body.data[0].caseFolderId, Date.now() );
        updateInputData( testDataPhysioWrongUt.putParams.data, myParams.patientQuery._id, body.data[0].caseFolderId, Date.now() );
        updateInputData( testDataLogo.putParams.data, myParams.patientQuery._id, body.data[0].caseFolderId, Date.now() );
    } );
} );

describe( 'Test handling of invalid icd code', function() {
    it( 'should successfully save utility', function( done ) {
        utils.post( 'utility', testDataPhysio.getData(), function( err, result ) {
            should.not.exist( err );
            should.exist( result );
            should.not.exist(result.meta.warnings[0]);
            done();
        } );
    } );
    it( 'should successfully save utility with one warning', function( done ) {
        // will remove wrong icd code from utSecondIcdCode
        utils.post( 'utility', testDataWrongIcdPhysio.getData(), function( err, result ) {
            should.not.exist( err );
            should.exist( result );
            should.exist(result.meta.warnings[0]);
            result.data[0].should.be.a( 'string' );
            done();
        } );
    } );
} );

describe( 'Test handling of kbv utility agreements', function() {
    it( 'should successfully save utility with one warning', function( done ) {
        // warns about missing agreement
        utils.post( 'utility', testDataPhysioAgreement.getData(), function( err, result ) {
            should.not.exist( err );
            should.exist( result );
            should.exist(result.meta.warnings[0]);
            result.data[0].should.be.a( 'string' );
            done();
        } );
    } );
} );

describe( 'Test handling of wrong kbv utilities', function() {
    // will remove wrong utility from list
    it( 'should successfully save utility with one warning', function( done ) {
        utils.post( 'utility', testDataPhysioWrongUt.getData(), function( err, result ) {
            should.not.exist( err );
            should.exist( result );
            should.exist(result.meta.warnings[0]);
            result.data[0].should.be.a( 'string' );
            done();
        } );
    } );
} );


describe( 'Test handling of wrong kbv logo utilities', function() {
    // utVocalTherapy is true but not acceptable for SP1 test date
    it( 'should respond with id of created doc and one warning', function( done ) {
        utils.post( 'utility', testDataLogo.getData(), function( err, result ) {
            should.not.exist( err );
            should.exist( result );
            should.exist(result.meta.warnings[0]);
            result.data[0].should.be.a( 'string' );
            done();
        } );
    } );
} );

describe( 'Tear Down', function() {
    testLib.insertDELETESuite( 'contract', {
        getData(){
            return myParams.contract;
        },
        getDeleteResult: contractTestData.getDeleteResult
    }, {query: myParams.contractQuery} );

    testLib.insertDELETESuite( 'patient', patientTestData, {query: myParams.patientQuery} );
    // testLib.insertDELETESuite( 'casefolder', myParams.caseFolderQuery, {notWhiteListedGet: true} );
    testLib.insertDELETESuite( 'user', employeeTestData, {query: myParams.employeeQuery} );
    testLib.insertDELETESuite( 'location', locationTestData, {query: myParams.locationQuery} );
} );