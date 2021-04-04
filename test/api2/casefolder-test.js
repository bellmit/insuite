/**
 * User: mykhaylo.dolishniy
 * Date: 20/01/17  17:54
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    testData = utils.getTestData( 'casefolder-test-data' ),
    patientTestData = utils.getTestData( 'patient-test-data' );

var
    myParams = {
        patientQuery: {_id: patientTestData.getData()._id}
    };


describe( 'Clean up data', function() {
    testLib.cleanUpWellKnownIds();
} );

describe( 'Setting up data', function() {
    testLib.insertPOSTSuite( 'patient', patientTestData, {}, function successCb( error, body ) {
        var patientId = body.data[0] || patientTestData._id; // id is hardcoded in testdata
        myParams.patientQuery._id = patientId;
    } );
} );

testLib.insertCommonSuites( 'casefolder', testData, {description: 'casefolder', only: true} );

describe( 'Breakdown setup', function() {
    testLib.insertDELETESuite( 'patient', patientTestData, {query: myParams.patientQuery} );
} );
