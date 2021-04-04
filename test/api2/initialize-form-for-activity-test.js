/**
 * User: dcdev
 * Date: 6/11/20  3:25 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global describe, it, should */

describe( 'API call for special POST method to initialize a form for an activity', function() {

    var
        utils = require( './testUtils' ),
        testLib = require( './testLib' ),
        casefolderTestData = utils.getTestData( 'casefolder-test-data' ),
        patientTestData = utils.getTestData( 'patient-test-data' ),
        employeeTestData = utils.getTestData( 'user-test-data' ),
        locationTestData = utils.getTestData( 'location-test-data' ),
        {
            medDataWithValidForm,
            medDataWithInValidForm
        } = utils.getTestData( 'meddata-with-form-test-data' );

    var
        queryToInitializeForm = { _id: medDataWithValidForm.getData()._id },
        queryToInitializeInvalidForm = { _id: medDataWithInValidForm.getData()._id },
        locationId,
        employeeId,
        patientId,
        caseFolderId;

    describe( 'Setting up data', function() {
        testLib.changeMochaState( false ); // run before cleaning Ids to prevent triggering rule-engine
        testLib.cleanUpWellKnownIds();

        testLib.insertPOSTSuite( 'location', locationTestData, {}, function successCb( error, body ) {
            locationId = body.data[0];
            medDataWithValidForm.putParams.data.locationId = locationId;
            medDataWithInValidForm.putParams.data.locationId = locationId;
        } );
        testLib.insertPOSTSuite( 'user', employeeTestData, {}, function successCb( error, body ) {
            employeeId = body.data[0];
            medDataWithValidForm.putParams.data.employeeId = employeeId;
            medDataWithInValidForm.putParams.data.employeeId = employeeId;
        } );
        testLib.insertPOSTSuite( 'patient', patientTestData, {}, function successCb( error, body ) {
            patientId = body.data[0];
            medDataWithValidForm.putParams.data.patientId = patientId;
            medDataWithInValidForm.putParams.data.patientId = patientId;
        } );
        testLib.insertPOSTSuite( 'casefolder', casefolderTestData, {}, function successCb( error, body ) {
            caseFolderId = body.data[0];
            medDataWithValidForm.putParams.data.caseFolderId = caseFolderId;
            medDataWithInValidForm.putParams.data.caseFolderId = caseFolderId;
        } );

        testLib.insertPOSTSuite( 'meddata', medDataWithValidForm, {}, function successCb( error, body ) {
            queryToInitializeForm._id = body.data[0];
        } );
        testLib.insertPOSTSuite( 'meddata', medDataWithInValidForm, {}, function successCb( error, body ) {
            queryToInitializeInvalidForm._id = body.data[0];
        } );
    } );

    describe( 'Check api call', function() {

        it( '/2/simple_activity/:initializeFormForActivity Should return the activity if the form is found', ( done ) => {
            utils.post( 'simple_activity/:initializeFormForActivity', queryToInitializeForm, function cb( error, body ) {
                    should.not.exist( error );
                    body.data.length.should.be.equal( 1 );
                    body.data[0]._id.should.be.equal( queryToInitializeForm._id );
                    body.data[0].attachments.length.should.be.equal( 1 );
                    body.data[0].formVersion.length.should.be.greaterThan( 0 );
                done();
            } );
        } );

        it( '/2/simple_activity/:initializeFormForActivity Should return an error if the form is not found', ( done ) => {
            utils.post( 'simple_activity/:initializeFormForActivity', queryToInitializeInvalidForm, function cb( error ) {
                // form does not exist
                should.exist( error );
                error.message.should.have.string( queryToInitializeInvalidForm._id );
                error.statusCode.should.be.equal( 500 );
                done();
            } );
        } );

    } );

    describe( 'Breakdown setup', function() {
        testLib.insertDELETESuite( 'meddata', medDataWithValidForm, { query: queryToInitializeForm } );
        testLib.insertDELETESuite( 'meddata', medDataWithInValidForm, { query: queryToInitializeInvalidForm } );
    } );

} );