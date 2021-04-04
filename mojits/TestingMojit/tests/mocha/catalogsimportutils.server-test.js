/**
 * User: altynai.iskakova
 * Date: 11.01.21  15:19
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global Y, it, describe, expect, before, after */
const
    util = require( 'util' ),
    join = require( 'path' ).join,
    mongoose = require( 'mongoose' );

describe( 'catalogsimportutils', function() {
    before( function() {
        this.user = Y.doccirrus.auth.getSUForLocal();
        this.mochaUtils = require( '../../server/mochaUtils' )( Y );
        this.cleanDb = util.promisify( this.mochaUtils.cleanDB );
    } );

    describe( '.calculateFileHash()', function() {
        before( function() {
            this.calculateFileHashP = util.promisify( Y.doccirrus.catalogsimportutils.calculateFileHash );
        } );
        it( 'throws an error', async function() {
            await expect( this.calculateFileHashP( '../file.zip' ) ).to.throw;
        } );
        it( 'returns a fileHash', async function() {
            const result = await this.calculateFileHashP( join( __dirname, '../hciFile/2019_catalogdump.zip' ) );
            expect( result ).to.be.an( 'string' );
            expect( result ).to.have.length.of.at.least( 1 );
        } );
    } );
    describe( '.getImportFilesMetaData()', function() {
        it( 'throws an error', async function() {
            await expect( Y.doccirrus.catalogsimportutils.getImportFilesMetaData( {
                importDir: ''
            } ) ).to.throw;
        } );
        it( 'returns an array', async function() {
            this.timeout( 35000 );
            const result = await Y.doccirrus.catalogsimportutils.getImportFilesMetaData( {
                importDir: '/var/lib/catalogs-hci/2020_catalogdump/'
            } );

            expect( result ).to.be.an( 'array' );
        } );
    } );
    describe( '.genericCatalogImport()', function() {
        before( async function() {
            Y.doccirrus.licmgr.setMochaReturnValue( true );

            let adminObj = {
                "_id": new mongoose.Types.ObjectId( "000000000000000000000010" ),
                "backupedDevice": "",
                "catalogsVersion": 1615814629416.0,
                "cronTimeHoursInDay": [],
                "defaultForms": [],
                "error": "",
                "imagesReadOnly": false,
                "initializeDevice": "",
                "proxy": "",
                "status": "",
                "currentVersion": "4.19.0",
                "dbVersion": "4.19",
                "allPrintersShared": false,
                "rulesImportHash": "6cd5493de8a192f44812b4b6bc732a6bf1b1e058",
                "hciCatalogHash": ""
            };
            await Y.doccirrus.mongodb.runDb( {
                user: this.user,
                model: 'admin',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( adminObj )
            } );
        } );
        after( async function() {
            Y.doccirrus.licmgr.setMochaReturnValue( false );
            await this.cleanDb( {user: this.user, collections2clean: ['admin']} );
        } );

        it( 'throws an error', async function() {
            await expect( Y.doccirrus.catalogsimportutils.genericCatalogImport( {
                catalogName: '',
                dirName: '',
                hashName: ''
            } ) ).to.throw;
        } );
        it( 'imports the given catalog', async function() {
            this.timeout( 100000 );
            const result = await Y.doccirrus.catalogsimportutils.genericCatalogImport( {
                catalogName: 'medicationscatalogs',
                dirName: 'catalogs-hci',
                hashName: 'hciCatalogHash'
            } );
            expect( result ).to.equal( 'DocCirrus catalog imported successfully' );
        } );
    } );
} );