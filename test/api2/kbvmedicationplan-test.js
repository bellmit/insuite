/* global should, describe, it */
var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    countryMode = utils.countryMode,
    POST_PROCESS_WAIT = 500,
    testData = utils.getTestData( 'kbvmedicationplan-test-data' ),
    postTestData = utils.getTestData( 'post-kbvmedicationplan-test-data' ),
    formatPromiseResult = utils.formatPromiseResult,
    makeAPICall = utils.makeAPICall;

if ( !countryMode || countryMode === 'de' ) {
    kbvMedicationPlanTestSuite( testData, postTestData );
}

function kbvMedicationPlanTestSuite( testData, postTestData ) {
    var
        contractTestData = utils.getTestData( 'contract-gkv0102-test-data' ),
        patientTestData = utils.getTestData( 'patient-test-data' ),
        employeeTestData = utils.getTestData( 'user-test-data' ),
        caseFolderTestData = utils.getTestData( 'casefolder-test-data' ),
        locationTestData = utils.getTestData( 'location-test-data' );

    describe( 'kbvMedicationPlan Test (Activity Suite)', function() {
        this.timeout( 30000 );

        var
            myParams = {
                contract: contractTestData.getData(),
                patientQuery: { _id: patientTestData.getData()._id },
                employeeQuery: { _id: employeeTestData.getData()._id },
                contractQuery: { _id: contractTestData.getData()._id },
                caseFolderQuery: { _id: caseFolderTestData.getData()._id },
                locationQuery: { _id: locationTestData.getData()._id }
            },
            options = {};

        // kludgy - should have more sample files!
        myParams.contract.scheinRemittor = '934770004';
        myParams.contract.scheinEstablishment = '700100200';

        testLib.cleanUpWellKnownIds();

        // -- SETUP ---
        testLib.insertPOSTSuite( 'location', locationTestData, {}, function successCb( error, body ) {
            var locationId = body.data[0];
            myParams.locationQuery._id = locationId;
            testData.putParams.data.locationId = locationId;
            postTestData.putParams.data.locationId = locationId;
        } );

        testLib.insertPOSTSuite( 'user', employeeTestData, {}, function successCb( error, body ) {
            var employeeId = body.data[0];
            myParams.employeeQuery._id = employeeId;
            testData.putParams.data.employeeId = employeeId;
            postTestData.putParams.data.employeeId = employeeId;
        } );

        testLib.insertPOSTSuite( 'patient', patientTestData, {}, function successCb( error, body ) {
            var patientId = body.data[0];
            myParams.patientQuery._id = patientId;
            testData.putParams.data.patientId = patientId;
            postTestData.putParams.data.patientId = patientId;
            myParams.contract.patientId = patientId;
            myParams.contract.timestamp = Date.now();
        } );

        testLib.insertPOSTSuite( 'casefolder', caseFolderTestData, {}, function successCb( error, body ) {
            var
                caseFolderId = body.data[0];
            myParams.caseFolderQuery._id = caseFolderId;
            contractTestData.putParams.data.caseFolderId = caseFolderId;
            testData.putParams.data.caseFolderId = caseFolderId;
            postTestData.putParams.data.caseFolderId = caseFolderId;
            postTestData.putParams.data.kbvMedicationPlan.caseFolderId = caseFolderId;
        } );

        testLib.insertPOSTSuite( 'contract', contractTestData, {},
            function successCb( error, body ) {
                myParams.contractQuery._id = body.data[0];
            } );

        // -- The actual test ---
        describe( 'kbvMedicationPlan CRUD test', function() {

            describe( 'self checks', function() {
                it( 'check test data', function( done ) {
                    should.exist( testData );
                    testData.should.contain.all.keys( ['getData', 'putParams'] );
                    testData.putParams.should.contain.keys( ['data'] );

                    // this timeout gives the DB a bit of time to complete post-processes
                    // for dev systems
                    setTimeout( done, POST_PROCESS_WAIT );
                } );
            } );

            testLib.insertGETSuite( 'kbvmedicationplan', testData, options );

            testLib.insertPOSTSuite( 'kbvmedicationplan', postTestData, { caseFolderQueryId: myParams.caseFolderQuery }, function afterCb( error, body ) {
                options.query = options.query || {};
                options.query._id = body.data[0];
            } );
            testLib.insertPUTSuite( 'kbvmedicationplan', testData, options );
            testLib.insertDELETESuite( 'kbvmedicationplan', testData, options );

            describe( 'Medications created by the kbvmedicationplan out of all the medicationPlanEntries with type \'MEDICATION\' inside', function() {
                it( 'Get and delete them ', async function() {
                    let
                        err,
                        resp;

                    [err, resp] = await formatPromiseResult( makeAPICall( utils.get, { patientId: myParams.patientQuery._id }, null, 'medication' ) );

                    if( err ) {
                        err.should.be.equal( null );
                    }

                    for( const medId of resp.data.map( med => med._id ) ) {
                        [err, resp] = await formatPromiseResult( makeAPICall( utils.delete, { _id: medId }, null, 'medication' ) );

                        if( err ) {
                            err.should.be.equal( null );
                        }
                    }
                } );
            } );
        } );

        // -- TEAR DOWN ---
        testLib.insertDELETESuite( 'contract', contractTestData, { query: myParams.contractQuery } );
        testLib.insertDELETESuite( 'casefolder', caseFolderTestData, { query: myParams.caseFolderQuery } );
        testLib.insertDELETESuite( 'patient', patientTestData, { query: myParams.patientQuery } );
        testLib.insertDELETESuite( 'user', employeeTestData, { query: myParams.employeeQuery } );
        testLib.insertDELETESuite( 'location', locationTestData, { query: myParams.locationQuery } );
    } );
}
