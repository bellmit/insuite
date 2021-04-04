/**
 * User: Mykhaylo Dolishniy
 * Date: 26/05/16  11:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global describe */
'use strict';

var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    testData = utils.getTestData( 'invoice-test-data' ),
    SCHEINtestData = utils.getTestData( 'contract-pkv-invoice-test-data' ),
    patientTestData = utils.getTestData( 'patient-test-data' ),
    employeeTestData = utils.getTestData( 'user-test-data' ),
    locationTestData = utils.getTestData( 'location-test-data' );

var
    myParams = {
        invoice: testData,
        contract: SCHEINtestData.getData(),
        contractQuery: {},
        caseFolderIdQuery: {},
        patientQuery: {},
        employeeQuery: {},
        locationQuery: {}
    };

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
        var employeeId = body.data[0];
        myParams.employeeQuery._id = employeeId;
    } );
} );

describe( 'Setup Patient', function() {
    testLib.insertPOSTSuite( 'patient', patientTestData, {}, function successCb( error, body ) {
        var patientId = body.data[0];
        myParams.patientQuery._id = patientId;
    } );
} );

describe( 'Setup PKV SCHEIN', function() {
    myParams.contract.scheinRemittor = '934770004';
    myParams.contract.scheinEstablishment = '700100200';

    testLib.insertPOSTSuite( 'contract', {
        getData() {
            return myParams.contract;
        },
        getPostResult: SCHEINtestData.getPostResult
    }, {}, function successCb( error, body ) {
        myParams.contractQuery._id = body.data[0];

    } );
} );

describe( 'Checking automatically created UUU Diagnoses', function() {

    testLib.insertGETSuite( 'contract', {}, {query: myParams.contractQuery}, function successCb( error, body ) {
        myParams.caseFolderIdQuery._id = body.data[0].caseFolderId; // for tear down
        myParams.invoice.putParams.data.caseFolderId = myParams.caseFolderIdQuery._id;
    } );

} );

// -- The actual test ---
testLib.insertCommonSuites( 'invoice', myParams.invoice, {} );

describe( 'Tear Down', function() {
    testLib.insertDELETESuite( 'contract', {
        getData() {
            return myParams.contract;
        },
        getDeleteResult: SCHEINtestData.getDeleteResult
    }, {query: myParams.contractQuery} );
    testLib.insertDELETESuite( 'casefolder', myParams.caseFolderIdQuery, {notWhiteListedGet: true} );
    testLib.insertDELETESuite( 'patient', patientTestData, {query: myParams.patientQuery} );
    testLib.insertDELETESuite( 'user', employeeTestData, {query: myParams.employeeQuery} );
    testLib.insertDELETESuite( 'location', locationTestData, {query: myParams.locationQuery} );
} );
