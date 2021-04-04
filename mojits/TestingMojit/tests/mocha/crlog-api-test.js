/**
 * User: dcdev
 * Date: 3/12/20  12:29 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global Y, it, describe, expect, before, after */
const
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    getObject = Y.doccirrus.commonutils.getObject,
    _ = require( 'lodash' ),
    fs = require( 'fs' ),
    util = require( 'util' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

function simplifyAndRemoveId( object ) {
    return JSON.parse( JSON.stringify( object ), ( key, value ) => {
        if( key === '_id' ) {
            return;
        }
        return value;
    } );
}

describe( 'crlog-api', () => {
    const insuranceCatalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
        actType: '_CUSTOM',
        short: 'IVG_KVG_MVG_UVG_VVG'
    } );

    before( async function() {
        await cleanDb( {
            user
        } );

        const
            catalogData = JSON.parse( fs.readFileSync( `${__dirname}/../covercardData/catalogData.json`, 'utf8' ) ),
            {insurance, canton} = catalogData;
        insurance.catalog = insuranceCatalogDescriptor.filename;
        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'catalog',
            action: 'mongoInsertMany',
            data: [insurance, canton]
        } );
    } );

    after( async function() {
        await cleanDb( {
            user
        } );
    } );

    describe( '1. Person with insurance from catalog', () => {
        const
            testData = JSON.parse( fs.readFileSync( `${__dirname}/../covercardData/personTestData1.json`, 'utf8' ) ),
            getInsurancesPromise = promisifyArgsCallback( Y.doccirrus.api.catalog.getInsurances ),
            {resultData} = testData;

        let insuranceGLN = getObject( 'CH-Baseinformation.nationalExtension.insurerInformation.contactEanNumber', testData.rawData );
        insuranceGLN = insuranceGLN && insuranceGLN.toString();
        const query = {insuranceGLN};

        before( async function() {
            this.parsedData = await Y.doccirrus.api.crlog.parseCovercardRawData( user, testData.rawData, testData.cardData );
        } );

        it( 'should match insurance', async function() {
            let insurancesFromCatalog = await getInsurancesPromise( {
                user, originalParams: {insuranceType: 'PRIVATE_CH'}, query
            } );
            let
                insurance = insurancesFromCatalog[0],
                parsedInsurance = this.parsedData.insuranceStatus[0];

            insurance = insurance && _.omit( insurance, '_id' );
            expect( parsedInsurance ).to.deep.include( insurance );
        } );
        it( 'should match patient', async function() {
            this.parsedData = this.parsedData && simplifyAndRemoveId( this.parsedData );
            resultData.insuranceStatus[0].catalog = insuranceCatalogDescriptor.filename;
            resultData.insuranceStatus[1].catalog = insuranceCatalogDescriptor.filename;
            expect( this.parsedData ).to.deep.equalInAnyOrder( resultData );
        } );
    } );

    describe( '2. Person with insurance NOT from catalog or without GLN', () => {
        const testData = JSON.parse( fs.readFileSync( `${__dirname}/../covercardData/personTestData2.json`, 'utf8' ) ),
            resultData = testData.resultData;

        it( '2.1. insurance without GLN', async function() {
            let parsedData = await Y.doccirrus.api.crlog.parseCovercardRawData( user, testData.rawData, testData.cardData );
            parsedData = parsedData && simplifyAndRemoveId( parsedData );
            expect( parsedData ).to.deep.equalInAnyOrder( resultData );
        } );

        it( '2.2. insurance with GLN but not from catalog', async function() {
            const insuranceGLN = '1111111111111';
            testData.rawData['CH-Baseinformation'].nationalExtension.insurerInformation.contactEanNumber = insuranceGLN;
            resultData.insuranceStatus[0].insuranceGLN = insuranceGLN;
            resultData.insuranceStatus[1].insuranceGLN = insuranceGLN;
            let parsedData = await Y.doccirrus.api.crlog.parseCovercardRawData( user, testData.rawData, testData.cardData );
            parsedData = parsedData && simplifyAndRemoveId( parsedData );
            expect( parsedData ).to.deep.equalInAnyOrder( resultData );
        } );
    } );
    describe( '3. Empty input', () => {
        const rawData = {},
            cardData = {},
            resultData = {
                insuranceStatus: []
            };

        it( '3.1. should not throw error', async function() {
            let parsedData = await Y.doccirrus.api.crlog.parseCovercardRawData( user, rawData, cardData );
            parsedData = parsedData && simplifyAndRemoveId( parsedData );
            expect( parsedData ).to.deep.equalInAnyOrder( resultData );
        } );
    } );
} );