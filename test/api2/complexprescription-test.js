/**
 * User: md
 * Date: 15/06/15  16:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global should, expect, describe, it */

const
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    countryMode = utils.countryMode,
    patientTestData = utils.getTestData( 'patient-test-data' ),
    employeeTestData = utils.getTestData( 'user-test-data' ),
    locationTestData = utils.getTestData( 'location-test-data' ),
    casefolderTestData = utils.getTestData( 'casefolder-test-data' );

if ( !countryMode || countryMode === 'de' ) {
    let
        testData = utils.getTestData( 'complexprescription-test-data' ),
        caseFolderId,
        PUBPRESCRTestData,
        PRESASSISTIVETestData;

    describe( 'Setup initial data', function() {
        testLib.changeMochaState( false ); // run before cleaning Ids to prevent triggering rule-engine
        testLib.cleanUpWellKnownIds();
        testLib.insertPOSTSuite( 'location', locationTestData, {} );
        testLib.insertPOSTSuite( 'user', employeeTestData, {} );
        testLib.insertPOSTSuite( 'patient', patientTestData, {} );
        testLib.insertPOSTSuite( 'casefolder', casefolderTestData, {}, function successCb( error, body ) {
            caseFolderId = body.data[0];
        } );
    } );

    let err, resp, id;
    describe( 'Test complexprescription API -- entry point to create new prescription with medication', function() {
        PUBPRESCRTestData = JSON.parse( JSON.stringify( testData.getData() ) );
        PUBPRESCRTestData.dispatchActivities = PUBPRESCRTestData.dispatchActivities.filter( act => act.actType === 'PUBPRESCR' );
        PUBPRESCRTestData.caseFolderId = caseFolderId;
        testLib.insertPOSTSuite( 'complexprescription', PUBPRESCRTestData, { simplePost: true }, function successCb( error, body ) {
            err = error;
            resp = body;
        } );
    } );

    describe( 'check complex prescription response for prescription with medication', function() {
        it( 'check response values ', () => {
            should.not.exist( err );
            resp.meta.errors.should.to.have.length( 0 );
            resp.meta.warnings.should.to.have.length( 0 );
            resp.data.should.to.have.length( 1 );
            resp.data[0].requestId.should.not.be.empty; // eslint-disable-line no-unused-expressions
        } );
    } );

    describe( 'Test complexprescription API - entry point to create new presassistive with assistive', function() {
        PRESASSISTIVETestData = JSON.parse( JSON.stringify( testData.getData() ) );
        PRESASSISTIVETestData.dispatchActivities = PRESASSISTIVETestData.dispatchActivities.filter( act => act.actType === 'PRESASSISTIVE' );
        PRESASSISTIVETestData.caseFolderId = caseFolderId;
        testLib.insertPOSTSuite( 'complexprescription', PRESASSISTIVETestData, { simplePost: true }, function successCb( error, body ) {
            err = error;
            resp = body;
        } );
    } );

    describe( 'check complex prescription response for presassistive with assistive', function() {
        it( 'check response values ', () => {
            should.not.exist( err );
            resp.meta.errors.should.to.have.length( 0 );
            resp.meta.warnings.should.to.have.length( 0 );
            resp.data.should.to.have.length( 1 );
            resp.data[0].requestId.should.not.be.empty; // eslint-disable-line no-unused-expressions
        } );
    } );

    describe( 'Test complexprescription API - entry point to create new presassistive without codeHMV', function() {
        let data = JSON.parse( JSON.stringify( PRESASSISTIVETestData ) );
        data.dispatchActivities[0].activities[0].codeHMV = '';
        testLib.insertPOSTSuite( 'complexprescription', data, { simplePost: true, negate: true }, function successCb( error, body ) {
            err = error;
            resp = body;
        } );
    } );

    describe( 'check complex prescription response for presassistive without codeHMV', function() {
        it( 'check response values ', () => {
            should.not.exist( resp );
            should.exist( err );
            err.statusCode.should.be.equal( 400 );
            err.message.should.be.equal( '<html><body><h1>Error: 400</h1><p>400 "Es sollte entweder codeHMV oder codePZN angegeben werden"</p></body></html>' );
        } );
    } );

    describe( 'Test complexprescription API - entry point to create new presassistive without activities', function() {
        let data = JSON.parse( JSON.stringify( PRESASSISTIVETestData ) );
        data.dispatchActivities[0].activities = [];
        testLib.insertPOSTSuite( 'complexprescription', data, { simplePost: true, negate: true }, function successCb( error, body ) {
            err = error;
            resp = body;
        } );
    } );

    describe( 'check complex prescription response for presassistive without activities', function() {
        it( 'check response values ', () => {
            should.not.exist( resp );
            should.exist( err );
            err.statusCode.should.be.equal( 400 );
            err.message.should.be.equal( '<html><body><h1>Error: 400</h1><p>400 "Es sollte mindestens ein Assistent bereitgestellt werden"</p></body></html>' );
        } );
    } );

    describe( 'Test warn message if location was not found by locationId', function() {
        let data = JSON.parse( JSON.stringify( testData.getData() ) );
        data.caseFolderId = caseFolderId;
        data.locationId = utils.getPseudoMongooseId();
        testLib.insertPOSTSuite( 'complexprescription', data, { simplePost: true }, function cb( error, body ) {
            err = error;
            resp = body;
            id = data.locationId;
        } );
    } );

    describe( 'check warn message if location was not found by locationId', function() {
        it( 'check response values ', () => {
            should.not.exist( err );
            should.exist( resp );
            let expected = [
                `Betriebsstätte ${id} nicht gefunden`
            ];
            expect( resp.meta.warnings ).to.deep.equal( expected );
        } );
    } );

    describe( 'Test warn message if location was not found by bsnr', function() {
        let data = JSON.parse( JSON.stringify( testData.getData() ) );
        data.caseFolderId = caseFolderId;
        data.bsnr = '1941233109';
        testLib.insertPOSTSuite( 'complexprescription', data, { simplePost: true }, function cb( error, body ) {
            err = error;
            resp = body;
        } );
    } );

    describe( 'check warn message if location was not found by bsnr', function() {
        it( 'check response values ', () => {
            should.not.exist( err );
            should.exist( resp );
            let expected = [
                'Angeforderter Ort von bsnr 1941233109 nicht gefunden',
                'Standard-Hauptstandort verwendet'
            ];
            expect( resp.meta.warnings ).to.deep.equal( expected );
        } );
    } );

    describe( 'Test warn message if employee was not found by employeeId', function() {
        let data = JSON.parse( JSON.stringify( testData.getData() ) );
        data.caseFolderId = caseFolderId;
        data.employeeId = utils.getPseudoMongooseId();
        testLib.insertPOSTSuite( 'complexprescription', data, { simplePost: true }, function cb( error, body ) {
            err = error;
            resp = body;
            id = data.employeeId;
        } );
    } );

    describe( 'check warn message if employee was not found by employeeId', function() {
        it( 'check response values ', () => {
            should.not.exist( err );
            should.exist( resp );
            let expected = [
                `Mitarbeiter ${id} nicht gefunden`
            ];
            expect( resp.meta.warnings ).to.deep.equal( expected );
        } );
    } );

    describe( 'Test warn message if employee was not found by lanr', function() {
        let data = JSON.parse( JSON.stringify( testData.getData() ) );
        data.caseFolderId = caseFolderId;
        data.lanr = '1941233109';
        delete data.bsnr;
        testLib.insertPOSTSuite( 'complexprescription', data, { simplePost: true }, function cb( error, body ) {
            err = error;
            resp = body;
        } );
    } );

    describe( 'check warn message if employee was not found by lanr', function() {
        it( 'check response values ', () => {
            should.not.exist( err );
            should.exist( resp );
            let expected = [
                'Mitarbeiter von lanr 1941233109 nicht gefunden',
                'Standard-Hauptstandort verwendet'
            ];
            expect( resp.meta.warnings ).to.deep.equal( expected );
        } );
    } );

    describe( 'Test warn message if patient was not found by patientId', function() {
        let data = JSON.parse( JSON.stringify( testData.getData() ) );
        data.caseFolderId = caseFolderId;
        data.patientId = utils.getPseudoMongooseId();
        testLib.insertPOSTSuite( 'complexprescription', data, { simplePost: true }, function cb( error, body ) {
            err = error;
            resp = body;
            id = data.patientId;
        } );
    } );

    describe( 'check warn message if patient was not found by patientId', function() {
        it( 'check response values ', () => {
            should.not.exist( err );
            should.exist( resp );
            let expected = [
                `Patient ${id} nicht gefunden`
            ];
            expect( resp.meta.warnings ).to.deep.equal( expected );
        } );
    } );

    describe( 'Test warn message if casefolder was not found by casefolderId', function() {
        let data = JSON.parse( JSON.stringify( testData.getData() ) );
        data.caseFolderId = utils.getPseudoMongooseId();
        testLib.insertPOSTSuite( 'complexprescription', data, { simplePost: true }, function cb( error, body ) {
            err = error;
            resp = body;
            id = data.caseFolderId;
        } );
    } );

    describe( 'check warn message if casefolder was not found by casefolderId', function() {
        it( 'check response values ', () => {
            should.not.exist( err );
            should.exist( resp );
            let expected = [
                `Fall ${id} nicht gefunden`
            ];
            expect( resp.meta.warnings ).to.deep.equal( expected );
        } );
    } );

    describe( 'Test create complexprescription with medication and presassitive data', function() {
        let data = JSON.parse( JSON.stringify( testData.getData() ) );
        data.caseFolderId = caseFolderId;
        testLib.insertPOSTSuite( 'complexprescription', data, { simplePost: true }, function cb( error, body ) {
            err = error;
            resp = body;
        } );
    } );

    describe( 'check create complexprescription with medication and presassitive data', function() {
        it( 'check response values ', () => {
            should.not.exist( err );
            resp.meta.errors.should.to.have.length( 0 );
            resp.meta.warnings.should.to.have.length( 0 );
            resp.data.should.to.have.length( 1 );
            resp.data[0].requestId.should.not.be.empty; // eslint-disable-line no-unused-expressions
        } );
    } );

    describe( 'Teardown', function() {
        testLib.changeMochaState( true );
    } );
}
