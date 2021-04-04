/**
 * User: md
 * Date: 17/08/2020  10:00 AM
 * (c) 2020, Doc Cirrus GmbH, Berlin
 */

/* global Y, should, it, describe, expect */

const
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    fs = require( 'fs' ),
    user = Y.doccirrus.auth.getSUForLocal();

describe( 'Common Import/Export api', () => {
    const
        exportDir = Y.doccirrus.auth.getTmpDir() + '/export/';

    describe( '1. makeExportDir', () => {

        it( '1.0. crates filesystem folder if not exist and returns path', async () => {
            let dir = `${exportDir}${user.tenantId}/`;
            //between runs export dir is deleted by restarting system
            expect( fs.existsSync( dir ) ).to.be.equal( false );
            let [err, result] = await formatPromiseResult( Y.doccirrus.api.importexport.makeExportDir( user ) );
            should.not.exist( err );
            expect( result ).to.be.equal( dir );
            expect( fs.existsSync( dir ) ).to.be.equal( true );
        } );

        it( '1.1. return path of existed filesystem object', async () => {
            let dir = `${exportDir}${user.tenantId}/`;
            //folder is created in previous test case (1.0)
            expect( fs.existsSync( dir ) ).to.be.equal( true );
            let [err, result] = await formatPromiseResult( Y.doccirrus.api.importexport.makeExportDir( user ) );
            should.not.exist( err );
            expect( result ).to.be.equal( dir );
            expect( fs.existsSync( dir ) ).to.be.equal( true );
        } );

    } );

    describe( '2. loadMetadata', () => {

        it( '2.0. load file from folder and parse it to js object', async () => {
            const
                FName = 'test.json',
                JSObj = '{ some: "valid", js: { count: 1 } }';

            let dir = `${exportDir}${user.tenantId}/`;
            //between runs export dir is deleted by restarting system
            fs.writeFileSync( `${dir}${FName}`, JSON.stringify( JSObj ) );

            let [err, result] = await formatPromiseResult( Y.doccirrus.api.importexport.loadMetadata( dir, FName ) );
            should.not.exist( err );

            expect( result ).to.be.deep.equal( JSObj );
        } );

        it( '2.1. returns empty array if file not found (notExpectedArray = false)', async () => {
            const
                FName = 'test.json';

            let
                dir = `${exportDir}${user.tenantId}/`,
                filePath = `${dir}${FName}_not_exisits`;
            expect( fs.existsSync( filePath ) ).to.be.equal( false );

            let [err, result] = await formatPromiseResult( Y.doccirrus.api.importexport.loadMetadata( dir, `${FName}_not_exisits` ) );
            should.not.exist( err );

            expect( result ).to.be.deep.equal( [] );
        } );

        it( '2.2. returns undefined if file not found (notExpectedArray = true)', async () => {
            const
                FName = 'test.json';

            let
                dir = `${exportDir}${user.tenantId}/`,
                filePath = `${dir}${FName}_not_exisits`;
            expect( fs.existsSync( filePath ) ).to.be.equal( false );

            let [err, result] = await formatPromiseResult( Y.doccirrus.api.importexport.loadMetadata( dir, `${FName}_not_exisits`, true ) );
            should.not.exist( err );

            expect( result ).to.be.deep.equal( undefined );
        } );

        it( '2.3. returns error on not parsable file', async () => {
            const
                FName = 'test.json',
                JSObj = '{wrong json}';

            let dir = `${exportDir}${user.tenantId}/`;
            fs.writeFileSync( `${dir}${FName}`, JSObj );

            let [err] = await formatPromiseResult( Y.doccirrus.api.importexport.loadMetadata( dir, FName ) );
            should.exist( err );
        } );
    } );

    describe( '3. clearByMetadata', () => {

        it( '3.0. remove files only related to exact metadata, and keep other', async () => {
            const
                clearByMetadata = promisifyArgsCallback( Y.doccirrus.api.importexport.clearByMetadata ),
                dir = `${exportDir}${user.tenantId}/`;

            //write first set of export like files (minimalistic data)
            fs.writeFileSync( `${dir}test1_meta.json`, JSON.stringify( [{"_id": "5a981b863ece5e2d13b62b38"}, {"_id": "5c80dcce3f4c1f29d3e936f2"}] ) );
            fs.writeFileSync( `${dir}test1_5a981b863ece5e2d13b62b38.json`, '1' );
            fs.writeFileSync( `${dir}test1_5c80dcce3f4c1f29d3e936f2.json`, '2' );

            //write second set of export like files (minimalistic data)
            fs.writeFileSync( `${dir}test2_meta.json`, JSON.stringify( [{"_id": "5d4c160a5b04463e56ea7beb"}, {"_id": "5d4c17bb5b04463e56ea7c34"}] ) );
            fs.writeFileSync( `${dir}test2_5d4c160a5b04463e56ea7beb.json`, '3' );
            fs.writeFileSync( `${dir}test2_5d4c17bb5b04463e56ea7c34.json`, '4' );

            let [err] = await formatPromiseResult( clearByMetadata( {
                user,
                data: {metaDataFileName: 'test1_meta.json'}
            } ) );
            should.not.exist( err );

            //test1 files should be deleted
            expect( fs.existsSync( `${dir}test1_meta.json` ) ).to.be.equal( false );
            expect( fs.existsSync( `${dir}test1_5a981b863ece5e2d13b62b38.json` ) ).to.be.equal( false );
            expect( fs.existsSync( `${dir}test1_5c80dcce3f4c1f29d3e936f2.json` ) ).to.be.equal( false );

            //test2 files should stay
            expect( fs.existsSync( `${dir}test2_meta.json` ) ).to.be.equal( true );
            expect( fs.existsSync( `${dir}test2_5d4c160a5b04463e56ea7beb.json` ) ).to.be.equal( true );
            expect( fs.existsSync( `${dir}test2_5d4c17bb5b04463e56ea7c34.json` ) ).to.be.equal( true );
        } );
    } );
} );
