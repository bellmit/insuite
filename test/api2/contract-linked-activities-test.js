/**
 * User: dcdev
 * Date: 6/11/20  3:25 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global describe, it, should */

var utils = require( './testUtils' ),
    countryMode = utils.countryMode;
if ( !countryMode || countryMode === 'de' ) {
    describe( 'API call for special POST methods to get linked activities', function() {

        var
            testLib = require( './testLib' ),
            {
                contractJustForLocationValidContract,
                contractWithLinkedData,
                linkedActivityDataMEDDATA,
                linkedActivityDataLABDATA,
                linkedActivityDataEXTERNAL,
                linkedActivityDataMEDICATION,
                linkedActivityDataDIAGNOSIS,
                linkedActivityDataTREATMENT,
                linkedActivityDataKBVMEDICATIONPLAN,
                caseFolder
            } = utils.getTestData( 'contract-linked-activities-test-data' ),
            patientTestData = utils.getTestData( 'patient-test-data' ),
            employeeTestData = utils.getTestData( 'user-test-data' ),
            locationTestData = utils.getTestData( 'location-test-data' );

        var
            myParams = {
                contractJustForLocationValidContractQuery: {},
                contractWithLinkedDataQuery: {},
                queryForMEDDATA: {},
                queryForLABDATA: {},
                queryForEXTERNAL: {},
                queryForMEDICATION: {},
                queryForDIAGNOSIS: {},
                queryForTREATMENT: {},
                queryForKBVMEDICATIONPLAN: {},
                queryForKBVMEDICATIONPLANMEDICATION: {},
                caseFolder: {}
            },
            locationId,
            employeeId,
            patientId,
            caseFolderId;

        describe( 'Setting up data', function() {
            testLib.changeMochaState( false ); // run before cleaning Ids to prevent triggering rule-engine
            testLib.cleanUpWellKnownIds();

            testLib.insertPOSTSuite( 'location', locationTestData, {}, function successCb( error, body ) {
                locationId = body.data[0];
                contractJustForLocationValidContract.putParams.data.locationId = locationId;
                contractWithLinkedData.putParams.data.locationId = locationId;
                linkedActivityDataMEDDATA.putParams.data.locationId = locationId;
                linkedActivityDataLABDATA.putParams.data.locationId = locationId;
                linkedActivityDataEXTERNAL.putParams.data.locationId = locationId;
                linkedActivityDataMEDICATION.putParams.data.locationId = locationId;
                linkedActivityDataDIAGNOSIS.putParams.data.locationId = locationId;
                linkedActivityDataTREATMENT.putParams.data.locationId = locationId;
                linkedActivityDataKBVMEDICATIONPLAN.putParams.data.locationId = locationId;
                linkedActivityDataKBVMEDICATIONPLAN.putParams.data.kbvMedicationPlan.locationId = locationId;
                linkedActivityDataKBVMEDICATIONPLAN.putParams.data.createdMedications.forEach( ( entry ) => {
                    entry.locationId = locationId;
                } );
            } );
            testLib.insertPOSTSuite( 'user', employeeTestData, {}, function successCb( error, body ) {
                employeeId = body.data[0];
                contractJustForLocationValidContract.putParams.data.employeeId = employeeId;
                contractWithLinkedData.putParams.data.employeeId = employeeId;
                linkedActivityDataMEDDATA.putParams.data.employeeId = employeeId;
                linkedActivityDataLABDATA.putParams.data.employeeId = employeeId;
                linkedActivityDataEXTERNAL.putParams.data.employeeId = employeeId;
                linkedActivityDataMEDICATION.putParams.data.employeeId = employeeId;
                linkedActivityDataDIAGNOSIS.putParams.data.employeeId = employeeId;
                linkedActivityDataTREATMENT.putParams.data.employeeId = employeeId;
                linkedActivityDataKBVMEDICATIONPLAN.putParams.data.employeeId = employeeId;
                linkedActivityDataKBVMEDICATIONPLAN.putParams.data.kbvMedicationPlan.employeeId = employeeId;
                linkedActivityDataKBVMEDICATIONPLAN.putParams.data.createdMedications.forEach( ( entry ) => {
                    entry.employeeId = employeeId;
                } );
            } );
            testLib.insertPOSTSuite( 'patient', patientTestData, {}, function successCb( error, body ) {
                patientId = body.data[0];
                myParams.contractJustForLocationValidContractQuery.patientId = patientId;
                myParams.contractWithLinkedDataQuery.patientId = patientId;
                myParams.queryForMEDDATA.patientId = patientId;
                myParams.queryForLABDATA.patientId = patientId;
                myParams.queryForEXTERNAL.patientId = patientId;
                myParams.queryForMEDICATION.patientId = patientId;
                myParams.queryForDIAGNOSIS.patientId = patientId;
                myParams.queryForKBVMEDICATIONPLAN.patientId = patientId;
                myParams.caseFolder.patientId = patientId;
                contractJustForLocationValidContract.putParams.data.patientId = patientId;
                contractWithLinkedData.putParams.data.patientId = patientId;
                caseFolder.putParams.data.patientId = patientId;
                linkedActivityDataMEDDATA.putParams.data.patientId = patientId;
                linkedActivityDataLABDATA.putParams.data.patientId = patientId;
                linkedActivityDataEXTERNAL.putParams.data.patientId = patientId;
                linkedActivityDataMEDICATION.putParams.data.patientId = patientId;
                linkedActivityDataDIAGNOSIS.putParams.data.patientId = patientId;
                linkedActivityDataTREATMENT.putParams.data.patientId = patientId;
                linkedActivityDataKBVMEDICATIONPLAN.putParams.data.patientId = patientId;
                linkedActivityDataKBVMEDICATIONPLAN.putParams.data.kbvMedicationPlan.patientId = patientId;
                linkedActivityDataKBVMEDICATIONPLAN.putParams.data.createdMedications.forEach( ( entry ) => {
                    entry.patientId = patientId;
                } );
            } );
            testLib.insertPOSTSuite( 'casefolder', caseFolder, {}, function successCb( error, body ) {
                caseFolderId = body.data[0];
                myParams.caseFolder._id = caseFolderId;
                contractJustForLocationValidContract.putParams.data.caseFolderId = caseFolderId;
                contractWithLinkedData.putParams.data.caseFolderId = caseFolderId;
                linkedActivityDataMEDDATA.putParams.data.caseFolderId = caseFolderId;
                linkedActivityDataLABDATA.putParams.data.caseFolderId = caseFolderId;
                linkedActivityDataEXTERNAL.putParams.data.caseFolderId = caseFolderId;
                linkedActivityDataMEDICATION.putParams.data.caseFolderId = caseFolderId;
                linkedActivityDataDIAGNOSIS.putParams.data.caseFolderId = caseFolderId;
                linkedActivityDataTREATMENT.putParams.data.caseFolderId = caseFolderId;
                linkedActivityDataKBVMEDICATIONPLAN.putParams.data.caseFolderId = caseFolderId;
                linkedActivityDataKBVMEDICATIONPLAN.putParams.data.kbvMedicationPlan.caseFolderId = caseFolderId;
                linkedActivityDataKBVMEDICATIONPLAN.putParams.data.createdMedications.forEach( ( entry ) => {
                    entry.caseFolderId = caseFolderId;
                } );
            } );

            testLib.insertPOSTSuite( 'meddata', linkedActivityDataMEDDATA.putParams.data, {}, function cb( error, body ) {
                myParams.queryForMEDDATA._id = body.data[0];
                contractWithLinkedData.putParams.data.activities.push( myParams.queryForMEDDATA._id );
            } );

            testLib.insertPOSTSuite( 'labdata', linkedActivityDataLABDATA.putParams.data, {}, function cb( error, body ) {
                myParams.queryForLABDATA._id = body.data[0];
                contractWithLinkedData.putParams.data.activities.push( myParams.queryForLABDATA._id );
            } );

            testLib.insertPOSTSuite( 'simple_activity', linkedActivityDataEXTERNAL.putParams.data, {}, function cb( error, body ) {
                myParams.queryForEXTERNAL._id = body.data[0];
                contractWithLinkedData.putParams.data.activities.push( myParams.queryForEXTERNAL._id );
            } );

            testLib.insertPOSTSuite( 'medication', linkedActivityDataMEDICATION.putParams.data, {}, function cb( error, body ) {
                myParams.queryForMEDICATION._id = body.data[0];
                contractWithLinkedData.putParams.data.activities.push( myParams.queryForMEDICATION._id );
            } );

            testLib.insertPOSTSuite( 'diagnosis', linkedActivityDataDIAGNOSIS.putParams.data, {}, function cb( error, body ) {
                myParams.queryForDIAGNOSIS._id = body.data[0];
                contractWithLinkedData.putParams.data.activities.push( myParams.queryForDIAGNOSIS._id );
            } );

            testLib.insertPOSTSuite( 'treatment', linkedActivityDataTREATMENT.putParams.data, {}, function cb( error, body ) {
                myParams.queryForTREATMENT._id = body.data[0];
                contractWithLinkedData.putParams.data.activities.push( myParams.queryForTREATMENT._id );
            } );

            testLib.insertPOSTSuite( 'kbvmedicationplan', {
                getData: function() {
                    return linkedActivityDataKBVMEDICATIONPLAN.putParams.data;
                },
                getPostResult: linkedActivityDataKBVMEDICATIONPLAN.getPostResult
            },
            {},
            function cb( error, body ) {
                myParams.queryForKBVMEDICATIONPLAN._id = body.data[0];
                contractWithLinkedData.putParams.data.activities.push( myParams.queryForKBVMEDICATIONPLAN._id );
            }
            );

            testLib.insertPOSTSuite( 'contract', contractWithLinkedData.putParams.data, {}, function cb( error, body ) {
                myParams.contractWithLinkedDataQuery._id = body.data[0];
            } );
        } );

        describe( 'Check api call', function() {

            it( 'kbvmedicationplan should have created a medication entry', ( done ) => {
                // get the ids of the created medications
                utils.get( `kbvmedicationplan`, myParams.queryForKBVMEDICATIONPLAN, function cb( error, body ) {
                    should.not.exist( error );
                    body.data.length.should.be.equal( 1 );
                    body.data[0].medicationPlanEntries.length.should.be.equal( 1 );
                    body.data[0].medicationPlanEntries[0].medicationRef.length.should.be.greaterThan( 0 );
                    myParams.queryForKBVMEDICATIONPLANMEDICATION._id = body.data[0].medicationPlanEntries[0].medicationRef;
                    done();
                } );
            } );

            it( 'Should return linked activities on /contract', ( done ) => {
                utils.post( 'contract/:getLinkedActivities', myParams.contractWithLinkedDataQuery, function cb( error, body ) {
                    should.not.exist( error );
                    body.data.length.should.be.equal( 7 );
                    done();
                } );
            } );

            it( 'Should return linked activities on /meddata', ( done ) => {
                utils.post( 'meddata/:getActivitiesLinkedToContract', myParams.contractWithLinkedDataQuery, function cb( error, body ) {
                    should.not.exist( error );
                    body.data.length.should.be.equal( 1 );
                    body.data[0]._id.should.be.equal( myParams.queryForMEDDATA._id );
                    done();
                } );
            } );

            it( 'Should return linked activities on /labdata', ( done ) => {
                utils.post( 'labdata/:getActivitiesLinkedToContract', myParams.contractWithLinkedDataQuery, function cb( error, body ) {
                    should.not.exist( error );
                    body.data.length.should.be.equal( 1 );
                    body.data[0]._id.should.be.equal( myParams.queryForLABDATA._id );
                    done();
                } );
            } );

            it( 'Should return linked activities on /simple_activity', ( done ) => {
                utils.post( 'simple_activity/:getActivitiesLinkedToContract', myParams.contractWithLinkedDataQuery, function cb( error, body ) {
                    should.not.exist( error );
                    body.data.length.should.be.equal( 1 );
                    body.data[0]._id.should.be.equal( myParams.queryForEXTERNAL._id );
                    done();
                } );
            } );

            it( 'Should return linked activities on /medication', ( done ) => {
                utils.post( 'medication/:getActivitiesLinkedToContract', myParams.contractWithLinkedDataQuery, function cb( error, body ) {
                    should.not.exist( error );
                    body.data.length.should.be.equal( 1 );
                    body.data[0]._id.should.be.equal( myParams.queryForMEDICATION._id );
                    done();
                } );
            } );

            it( 'Should return linked activities on /diagnosis', ( done ) => {
                utils.post( 'diagnosis/:getActivitiesLinkedToContract', myParams.contractWithLinkedDataQuery, function cb( error, body ) {
                    should.not.exist( error );
                    body.data.length.should.be.equal( 1 );
                    body.data[0]._id.should.be.equal( myParams.queryForDIAGNOSIS._id );
                    done();
                } );
            } );

            it( 'Should return linked activities on /treatment', ( done ) => {
                utils.post( 'treatment/:getActivitiesLinkedToContract', myParams.contractWithLinkedDataQuery, function cb( error, body ) {
                    should.not.exist( error );
                    body.data.length.should.be.equal( 1 );
                    body.data[0]._id.should.be.equal( myParams.queryForTREATMENT._id );
                    done();
                } );
            } );

            it( 'Should return linked activities on /kbvmedicationplan', ( done ) => {
                utils.post( 'kbvmedicationplan/:getActivitiesLinkedToContract', myParams.contractWithLinkedDataQuery, function cb( error, body ) {
                    should.not.exist( error );
                    body.data.length.should.be.equal( 1 );
                    body.data[0]._id.should.be.equal( myParams.queryForKBVMEDICATIONPLAN._id );
                    done();
                } );
            } );

        } );

        describe( 'Breakdown setup', function() {
            testLib.insertDELETESuite( 'meddata', linkedActivityDataMEDDATA, { query: myParams.queryForMEDDATA } );
            testLib.insertDELETESuite( 'labdata', linkedActivityDataLABDATA, { query: myParams.queryForLABDATA } );
            testLib.insertDELETESuite( 'simple_activity', linkedActivityDataEXTERNAL, { query: myParams.queryForEXTERNAL } );
            testLib.insertDELETESuite( 'medication', linkedActivityDataMEDICATION, { query: myParams.queryForMEDICATION } );
            testLib.insertDELETESuite( 'diagnosis', linkedActivityDataDIAGNOSIS, { query: myParams.queryForDIAGNOSIS } );
            testLib.insertDELETESuite( 'treatment', linkedActivityDataTREATMENT, { query: myParams.queryForTREATMENT } );
            testLib.insertDELETESuite( 'kbvmedicationplan', linkedActivityDataKBVMEDICATIONPLAN, { query: myParams.queryForKBVMEDICATIONPLAN } );
            testLib.insertDELETESuite( 'medication', linkedActivityDataKBVMEDICATIONPLAN.getDeleteResult().data.createdMedications[0], { query: myParams.queryForKBVMEDICATIONPLANMEDICATION } );
            testLib.insertDELETESuite( 'contract', contractWithLinkedData, { query: myParams.contractWithLinkedDataQuery } );
            testLib.insertDELETESuite( 'patient', patientTestData );
            testLib.insertDELETESuite( 'user', employeeTestData );
            testLib.insertDELETESuite( 'location', locationTestData );
        } );
    } );
}
