/**
 * User: mahmoud
 * Date: 15/06/15  16:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global describe */

'use strict';

var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    countryMode = utils.countryMode,
    testData = utils.getTestData( 'contract-bg-test-data' ),
    patientTestData = utils.getTestData( 'patient-test-data' ),
    employeeTestData = utils.getTestData( 'user-test-data' ),
    locationTestData = utils.getTestData( 'location-test-data' );

if ( !countryMode || countryMode === 'de' ) {
    // eslint-disable-next-line no-inner-declarations
    var
        myParams = {
            patientQuery: {_id: patientTestData.getData()._id},
            employeeQuery: {},
            locationQuery: {}
        };

    describe( 'Clean up data', function() {
        testLib.cleanUpWellKnownIds();
    } );

    describe( 'Setting up data', function() {
        testLib.insertPOSTSuite( 'location', locationTestData, {}, function successCb( error, body ) {
            var locationId = body.data[0];
            myParams.locationQuery._id = locationId;
        } );

        testLib.insertPOSTSuite( 'user', employeeTestData, {}, function successCb( error, body ) {
            var employeeId = body.data[0];
            myParams.employeeQuery._id = employeeId;
        } );

        testLib.insertPOSTSuite( 'patient', patientTestData, {}, function successCb( error, body ) {
            var patientId = body.data[0] || patientTestData._id; // id is hardcoded in testdata
            myParams.patientQuery._id = patientId;
        } );
    } );

    testLib.insertCommonSuites( 'contract', testData, {description: 'contract (bg) CRUD', only: true} );

    describe( 'Breakdown setup', function() {
        testLib.insertDELETESuite( 'patient', patientTestData, {query: myParams.patientQuery} );
        testLib.insertDELETESuite( 'user', employeeTestData, {query: myParams.employeeQuery} );
        testLib.insertDELETESuite( 'location', locationTestData, {query: myParams.locationQuery} );
    } );
}
