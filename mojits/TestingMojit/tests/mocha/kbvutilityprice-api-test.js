/**
 * User: do
 * Date: 10.12.20  14:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global Y, it, describe, expect, after, before */

const
    sinon = require( 'sinon' ),
    fs = require( 'fs' ),
    path = require( 'path' ),
    util = require( 'util' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

describe( 'kbvutilityprice-api', async function() {
    describe( '.updatePrices()', async function() {
        before( async function() {
            await cleanDb( {
                user,
                collections2clean: ['location', 'kbvutilityprice', 'catalog']
            } );
            const locationData = mochaUtils.getLocationData();
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( locationData )
            } );

            const sdhm2pricesCatalogData = JSON.parse( fs.readFileSync( path.join( __dirname, '..', 'fixtures/kbvutilityprice/sdhm2prices-1.json' ), 'utf8' ) );
            const sdhm2CatalogData = JSON.parse( fs.readFileSync( path.join( __dirname, '..', 'fixtures/kbvutilityprice/sdhm2-1.json' ), 'utf8' ) );

            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'catalog',
                action: 'mongoInsertMany',
                data: sdhm2pricesCatalogData.concat( sdhm2CatalogData )
            } );

            this.getCatalogDescriptorStub = sinon.stub( Y.doccirrus.api.catalog, 'getCatalogDescriptor' ).callsFake( function( params ) {
                if( params.short === 'SDHM2PRICES' ) {
                    return {filename: sdhm2pricesCatalogData[0].catalog};
                } else if( params.short === 'SDHM2' ) {
                    return {filename: sdhm2CatalogData[0].catalog};
                }
                throw Error( 'stub called with unexpected params' );
            } );
        } );

        after( async function() {
            this.getCatalogDescriptorStub.restore();
        } );

        describe( 'update an empty db', async function() {
            before( function() {
                this.kbvutilityprices1 = JSON.parse( fs.readFileSync( path.join( __dirname, '..', 'fixtures/kbvutilityprice/kbvutilityprices-1.json' ), 'utf8' ) );
            } );
            it( 'should create all prices', async function() {
                await Y.doccirrus.api.kbvutilityprice.updatePrices( user );
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'kbvutilityprice',
                    query: {}
                } );
                expect( result ).to.have.length( 6 );
                this.kbvutilityprices1.forEach( price => {
                    const createdPrice = result.find( r => r.utilityName === price.utilityName );
                    [
                        'active',
                        'official',
                        'confirmOfficial',
                        'careProvider',
                        'utilityName',
                        'utilityPositionNo',
                        'kv',
                        'insuranceType',
                        'prices'
                    ].forEach( pathToTest => {
                        if( pathToTest === 'prices' ) {
                            expect( createdPrice[pathToTest][0].price ).to.equal( price[pathToTest][0].price );
                        } else {
                            expect( createdPrice[pathToTest] ).to.equal( price[pathToTest] );
                        }
                    } );
                } );

            } );
        } );
        describe( 'update an existing db', async function() {
            before( async function() {
                await cleanDb( {
                    user,
                    collections2clean: ['kbvutilityprice']
                } );
                const kbvutilityprices2 = JSON.parse( fs.readFileSync( path.join( __dirname, '..', 'fixtures/kbvutilityprice/kbvutilityprices-2.json' ), 'utf8' ) );
                this.kbvutilityprices = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'kbvutilityprice',
                    query: {}
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'kbvutilityprice',
                    action: 'mongoInsertMany',
                    data: kbvutilityprices2
                } );
                await Y.doccirrus.api.kbvutilityprice.updatePrices( user );
                this.kbvutilityprices = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'kbvutilityprice',
                    query: {}
                } );
            } );

            it( 'should not add more prices', async function() {
                expect( this.kbvutilityprices ).to.have.length( 7 );
            } );

            [
                {
                    active: true,
                    utilityName: 'Psychisch-funkt. Beh. Gruppe',
                    description: 'update standard price that was not changed by user from 66 to 52',
                    newPrice: 52,
                    official: true,
                    confirmOfficial: false,
                    officialPrice: null
                },
                {
                    active: true,
                    utilityName: 'Hirnleistungstraining/neuropsych. orientierte Beh.',
                    description: 'flag user changed standard price',
                    newPrice: 99,
                    official: false,
                    confirmOfficial: true,
                    officialPrice: 43.22
                },
                {
                    active: true,
                    utilityName: 'Hirnleistungstraining Gruppe',
                    description: 'should set official flag if unofficial but standard price is same',
                    newPrice: 34,
                    official: true,
                    confirmOfficial: false,
                    officialPrice: null
                },
                {
                    active: true,
                    utilityName: 'Sensomotorisch-perz. Beh. Gruppe',
                    description: 'should add standard insuranceGroup price if not present',
                    newPrice: 42,
                    official: true,
                    confirmOfficial: false,
                    officialPrice: null
                },
                {
                    active: false,
                    utilityName: 'random price',
                    description: 'should set active flag to false if utility is not in new catalog',
                    newPrice: 22,
                    official: true,
                    confirmOfficial: false,
                    officialPrice: null
                }
            ].forEach( ( {active, description, utilityName, newPrice, official, confirmOfficial, officialPrice} ) => {
                it( description, async function() {
                    const kbvUtilityPrice = this.kbvutilityprices.find( price => price.utilityName === utilityName );
                    expect( kbvUtilityPrice.active ).to.equal( active );
                    expect( kbvUtilityPrice.prices.find( priceObj => priceObj.insuranceGroupId === '000000000000000000000222' ).price ).to.equal( newPrice );
                    expect( kbvUtilityPrice.official ).to.equal( official );
                    expect( kbvUtilityPrice.confirmOfficial ).to.equal( confirmOfficial );
                    expect( kbvUtilityPrice.officialPrice ).to.equal( officialPrice );
                } );
            } );

        } );

    } );

} );