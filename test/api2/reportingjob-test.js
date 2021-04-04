'use strict';
/*global it, should, expect, describe, beforeEach */

const
    utils = require( './testUtils' ),
    fs = require( 'fs' ),
    path = require( 'path' ),
    formatPromiseResult = utils.formatPromiseResult,
    makeAPICall = utils.makeAPICall;


const cleanupFileAtPath = filepath => {
    fs.unlink( path.resolve( __dirname, '..', '..', filepath ), ( err ) => {
        should.not.exist( err );
    } );
};


describe( '2/reportingjob/:outputCSV @local', () => {
    const
        reportingjobData = utils.getTestData( 'reportingjob-outputCsv-test-data' ),
        model = 'reportingjob/:outputCsv';

    describe( 'given default reporting "Patienten mit Leistungen und Diagnosen"', () => {
        const insightConfig = reportingjobData.getInsightConfig();

        describe( 'when POST a request with insightConfigId, startDate and endDate', async function() {
            const requestBody = reportingjobData.getDataSet1();

            it( 'should return with successful response', async () => {
                let filepath;
                const [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( err );
                should.exist( resp );
                resp.should.be.a( 'object' );
                resp.meta.warnings.should.have.length( 0 );
                resp.meta.errors.should.have.length( 0 );
                resp.should.have.property( 'data' );

                filepath = resp.data[0];
                cleanupFileAtPath( filepath );
            } );

            it( 'should return the correct filepath to which the file got written to', async () => {
                let filepath;
                const [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( err );

                filepath = resp.data[0];

                // Checks if file at path exists, fails with error if it doesn't
                fs.access( path.resolve( __dirname, '..', '..', filepath ), fs.constants.F_OK, ( err ) => {
                    should.not.exist( err );
                } );

                cleanupFileAtPath( filepath );
            } );

            it( 'should use the default filename ("test.csv"), separator (,), newline (\\n) and language option (de)', async () => {
                let
                    filepath,
                    fileData,
                    fileName,
                    firstFileRow,
                    headersOfOutputFile;

                const
                    listOfExpectedLabels = insightConfig.displayFields.map( field => `"${field.label.de}"` ),
                    [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( err );
                filepath = resp.data[0];

                fs.readFile( path.resolve( __dirname, '..', '..', filepath ), 'utf8', ( err, data ) => {

                    should.not.exist( err );
                    fileData = data;

                    // The end of the filepath should match the requested filename
                    fileName = filepath.substr( -'test.csv'.length );
                    expect( fileName ).to.equal( 'test.csv' );

                    // If newline symbol is applied, the lines can be split using the newline value of the request body
                    firstFileRow = fileData.split( '\n' )[0];

                    // If separator symbol is applied, the rows can be split using the separator value of the request body
                    headersOfOutputFile = firstFileRow.split( ',' );

                    // The number of headers should match the number of displayFields from the insight config
                    expect( headersOfOutputFile.length ).to.equal( insightConfig.displayFields.length );

                    // Check if language settings got also applied
                    expect( headersOfOutputFile ).to.eql( listOfExpectedLabels );
                } );

                cleanupFileAtPath( filepath );
            } );


        } );

        describe( 'when POST a request with insightConfigId, startDate, endDate, separator, newline, lang, fileName', function() {
            const requestBody = reportingjobData.getDataSet2();

            it( 'should return with successful response', async () => {
                let filepath;
                const [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( err );
                should.exist( resp );
                resp.should.be.a( 'object' );
                resp.meta.warnings.should.to.have.length( 0 );
                resp.meta.errors.should.to.have.length( 0 );
                resp.should.have.property( 'data' );

                filepath = resp.data[0];
                cleanupFileAtPath( filepath );
            } );

            it( 'should return the correct filepath to which the file got written to', async () => {
                let filepath;
                const [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( err );
                filepath = resp.data[0];

                // Checks if file at path exists, fails with error if it doesn't
                fs.access( path.resolve( __dirname, '..', '..', filepath ), fs.constants.F_OK, ( err ) => {
                    should.not.exist( err );
                } );

                cleanupFileAtPath( filepath );
            } );


            it( 'should use the values given in the request body', async () => {
                let
                    filepath,
                    fileData,
                    firstFileRow,
                    headersOfOutputFile;

                const
                    listOfExpectedLabels = insightConfig.displayFields.map( field => `"${field.label.en}"` ),
                    [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( err );
                filepath = resp.data[0];

                fs.readFile( path.resolve( __dirname, '..', '..', filepath ), 'utf8', ( err, data ) => {

                    should.not.exist( err );

                    fileData = data;

                    // The end of the filepath should match the requested filename
                    const fileName = filepath.substr( -requestBody.fileName.length );
                    expect( fileName ).to.equal( requestBody.fileName );

                    // If newline symbol is applied, the lines can be split using the newline value of the request body
                    firstFileRow = fileData.split( requestBody.newline )[0];

                    // If separator symbol is applied, the rows can be split using the separator value of the request body
                    headersOfOutputFile = firstFileRow.split( requestBody.separator );

                    // The number of headers should match the number of displayFields from the insight config
                    expect( headersOfOutputFile.length ).to.equal( insightConfig.displayFields.length );

                    // Check if language settings got also applied
                    expect( headersOfOutputFile ).to.eql( listOfExpectedLabels );
                } );

                cleanupFileAtPath( filepath );
            } );

        } );


        describe( 'when POST a request with bad request body', function() {
            let
                err,
                resp;

            beforeEach( () => {
                err = null;
                resp = null;
            });

            it( 'should return a http error with code 400 if no insight config Id is given', async () => {
                const requestBody = reportingjobData.getDataSet1();

                delete requestBody.insightConfigId;

                [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( resp );
                should.exist(err);
                expect( err.statusCode ).to.equal( 400 );
            } );

            it( 'should return a http error with code 404 if no existing report for insight config id is found', async () => {
                const requestBody = reportingjobData.getDataSet1();

                requestBody.insightConfigId = utils.getPseudoMongooseId();

                [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( resp );
                should.exist(err);
                expect( err.statusCode ).to.equal( 404 );
            } );

            it( 'should return a http error with code 400 if insight config Id is given in wrong format', async () => {
                const requestBody = reportingjobData.getDataSet1();

                requestBody.insightConfigId = requestBody.insightConfigId + '123';

                [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( resp );
                should.exist(err);
                expect( err.statusCode ).to.equal( 400 );
            } );

            it( 'should return a http error with code 403 if no access to write files is available', async () => {
                let
                    filepath,
                    pathToOutputFile,
                    baseDirectoryOfOutputFile;

                const requestBody = reportingjobData.getDataSet1();


                [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( err );

                filepath = resp.data[0];

                pathToOutputFile = path.resolve( __dirname, '..', '..', filepath );
                baseDirectoryOfOutputFile = path.dirname( pathToOutputFile );

                fs.mkdir( path.resolve( baseDirectoryOfOutputFile, 'testDirectory' ), {mode: 444}, ( err ) => {
                    should.not.exist( err );
                } );

                requestBody.fileName = 'testDirectory/badFileName.csv';

                [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( resp );
                should.exist(err);
                expect( err.statusCode ).to.equal( 403 );

                fs.rmdir( path.resolve( baseDirectoryOfOutputFile, 'testDirectory' ), ( err ) => {
                    should.not.exist( err );
                } );

                cleanupFileAtPath( filepath );

            } );

            it( 'should return a http error with code 400 if filename leads to directory that doesn`t exist', async () => {
                const requestBody = reportingjobData.getDataSet1();

                requestBody.fileName = 'nonExistantDirectory/badFileName.csv';
                [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( resp );
                should.exist(err);
                expect( err.statusCode ).to.equal( 400 );
            } );

            it( 'should return a http error with code 400 if filename causes directory traversal', async () => {
                const requestBody = reportingjobData.getDataSet1();

                requestBody.fileName = '../../badFileName.csv';
                [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, requestBody, model ) );

                should.not.exist( resp );
                should.exist(err);
                expect( err.statusCode ).to.equal( 400 );
            } );

        } );

    } );

} );

