/**
 * User: do
 * Date: 15/02/18  16:50
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Y, it, before, expect, should, describe */

const
    mongoose = require( 'mongoose' ),
    //depending on this ID: catalog-api.server.js:verifyKT
    mainLocationId = new mongoose.Types.ObjectId( '000000000000000000000001' ).toString(),
    getObject = Y.doccirrus.commonutils.getObject,
    user = Y.doccirrus.auth.getSUForLocal(),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    fs = require( 'fs' ),
    Path = require( 'path' ),
    basePath = Path.join( __dirname, '../cardData' ),
    testFileToObject = ( path ) => {
        return JSON.parse( fs.readFileSync( Path.join( basePath, path ) ).toString() );
    },
    pathsToTest = [
        'firstname',
        'lastname',
        'gender',
        'talk',
        'kbvDob',
        'nameaffix',
        'fk3120',
        'title',
        'dob',
        // TODO: create different set with additional "POSTFACH" address and only
        'addresses.0.kind',
        'addresses.0.street',
        'addresses.0.houseno',
        'addresses.0.zip',
        'addresses.0.city',
        'addresses.0.countryCode',
        'addresses.0.addon',
        // 'insuranceStatus.0.cardSwipe',
        'insuranceStatus.0.type',
        'insuranceStatus.0.cardType',
        'insuranceStatus.0.cardTypeGeneration',
        'insuranceStatus.0.cdmVersion',
        'insuranceStatus.0.fk4108',
        'insuranceStatus.0.fk4133',
        'insuranceStatus.0.fk4110',
        'insuranceStatus.0.insuranceNo',
        'insuranceStatus.0.insuranceName',
        'insuranceStatus.0.insurancePrintName',
        'insuranceStatus.0.kv',
        'insuranceStatus.0.insuranceId',
        'insuranceStatus.0.insuranceGrpId',
        'insuranceStatus.0.insuranceCountry',
        'insuranceStatus.0.insuranceKind',
        'insuranceStatus.0.costCarrierBillingSection',
        'insuranceStatus.0.costCarrierBillingGroup',
        'insuranceStatus.0.locationFeatures',
        // 'insuranceStatus.0.abrechnungsbereiche',
        'insuranceStatus.0.feeSchedule',
        'insuranceStatus.0.fused',
        'insuranceStatus.0.address1',
        'insuranceStatus.0.address2'
    ],
    compareParsedPatients = ( a, b ) => {
        pathsToTest.forEach( path => {
            expect( getObject( path, a ) ).to.be.eql( getObject( path, b ), `expect "${path}" to be equal` );
        } );
    },
    egkTests = [
        {
            // Denis Oczko
            rawDataFile: 'test_1_rawData.json',
            parsedDataFile: 'test_1_parsedData.json'
        },
        {
            // Mãrianne Hünsch
            rawDataFile: 'test_2_rawData.json',
            parsedDataFile: 'test_2_parsedData.json'
        }
    ].map( config => {
        config.rawData = testFileToObject( config.rawDataFile );
        config.parsedData = testFileToObject( config.parsedDataFile );
        return config;
    } ),
    kvkTests = [
        {
            // Denis Oczko 06/2016
            rawDataFile: 'test_kvk_1_rawData.json',
            parsedDataFile: 'test_kvk_1_parsedData.json'
        },
        {
            // Manfred Metzger 12/2020
            rawDataFile: 'test_kvk_2_rawData.json',
            parsedDataFile: 'test_kvk_2_parsedData.json'
        }
        // test_kvk_2_rawData.json Elke-Erna Bäcker
    ].map( config => {
        config.rawData = testFileToObject( config.rawDataFile );
        config.parsedData = testFileToObject( config.parsedDataFile );
        return config;
    } ),

    sdktCatalogDesc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
        actType: '_CUSTOM',
        short: 'SDKT'
    } ),

    KV_INSURANCE_CATALOG = sdktCatalogDesc.filename,

    catalogData = [
        { //fused eGK Tests
            "iknr": "108433248",
            "ktab": "00",
            "name": "Siemens Betriebskrankenkasse",
            "kv": "52",
            "kostentraegergruppeId": "04",
            "gebuehrenordnung": "1",
            "abrechnungsbereich": "Siemens Betriebskrankenk",
            "kt_gueltigkeit_start": new Date( "2009-09-30" ),
            "kt_gueltigkeit_end": new Date( "2018-05-30" ),
            "existenzbeendigung_vk": "61495",
            "catalog": KV_INSURANCE_CATALOG
        }, {
            "vknr": "61495",
            "iknr": "108433248",
            "ktab": "00",
            "name": "Siemens Betriebskrankenkasse",
            "kv": "52",
            "kostentraegergruppeId": "04",
            "gebuehrenordnung": "1",
            "abrechnungsbereich": "Siemens Betriebskrankenk",
            "kt_gueltigkeit_start": new Date( "2018-05-30" ),
            "kt_gueltigkeit_end": new Date( "2028-05-30" ),
            "existenzbeendigung_vk": "61495",
            "catalog": KV_INSURANCE_CATALOG,
            "addresses": [
                {
                    "street": "In den Seewiesen 26",
                    "countryCode": "D",
                    "country": "Deutschland",
                    "city": "Heidenheim",
                    "zip": "89250",
                    "kind": "OFFICIAL"
                }
            ]
        },
        { //fused KVK Tests 1
            "iknr": "108223858",
            "ktab": "00",
            "name": "Siemens Betriebskrankenkasse",
            "kv": "52",
            "kostentraegergruppeId": "04",
            "gebuehrenordnung": "1",
            "abrechnungsbereich": "Siemens Betriebskrankenk",
            "kt_gueltigkeit_start": new Date( "2009-09-30" ),
            "kt_gueltigkeit_end": new Date( "2018-05-30" ),
            "existenzbeendigung_vk": "61495",
            "catalog": KV_INSURANCE_CATALOG
        },
        {
            "vknr": "61495",
            "iknr": "108223858",
            "ktab": "00",
            "name": "Siemens-Betriebskrankenkasse - Ost",
            "sortierungsname": "Siemens-Ost",
            "kurzname": "BKK Siemens-Ost",
            "suchname": "Siemens-Betriebskrankenkasse - Ost",
            "gebuehrenordnung": "1",
            "kostentraegergruppeId": "04",
            "kv": "52",
            "addresses": [
                {
                    "street": "Heimeranstr. 31",
                    "countryCode": "D",
                    "country": "Deutschland",
                    "city": "München",
                    "zip": "80339",
                    "kind": "OFFICIAL"

                }
            ],
            "catalog": KV_INSURANCE_CATALOG
        },
        { //fused KVK Tests 2
            "iknr": "107289684",
            "ktab": "00",
            "kt_gueltigkeit_start": new Date( "2009-09-30" ),
            "kt_gueltigkeit_end": new Date( "2018-05-30" ),
            "existenzbeendigung_vk": "72601",
            "catalog": KV_INSURANCE_CATALOG

        },
        {
            "vknr": "72601",
            "iknr": "108223858",
            "ktab": "00",
            "name": "Gmünder ErsatzKasse",
            "sortierungsname": "GEK",
            "kurzname": "GEK",
            "suchname": "Gmünder ErsatzKasse",
            "gebuehrenordnung": "2",
            "kostentraegergruppeId": "11",
            "abrechnungsbereich": "BARMER",
            "kt_gueltigkeit_start": new Date( "2018-05-30" ),
            "kv": "72",
            "addresses": [
                {
                    "street": "",
                    "countryCode": "D",
                    "country": "Deutschland",
                    "city": "Berlin",
                    "zip": "10837",
                    "postbox": "0",
                    "kind": "POSTBOX"
                }
            ],
            "catalog": KV_INSURANCE_CATALOG
        }
    ];

describe( 'Card data parsing tests.', function() {
    before( function( done ) {
        Y.doccirrus.mongodb.runDb( {
            model: 'location',
            user: user,
            action: 'delete',
            query: {
                _id: {
                    $exists: true
                }
            },
            options: {
                override: true
            }
        }, done );
    } );
    it( 'setup location', function( done ) {
        let
            locationData = mochaUtils.getLocationData( {
                _id: mainLocationId
            } );
        Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'location',
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( locationData )
        }, function( err, result ) {
            should.not.exist( err );
            should.exist( result );
            result.should.contain( mainLocationId );
            done();
        } );
    } );
    it( 'setup catalog', function( done ) {
        Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'catalog',
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( catalogData )
        }, function( err, result ) {
            should.not.exist( err );
            should.exist( result );
            done();
        } );
    } );

    describe( 'eGK Tests', function() {
        egkTests.forEach( ( config, idx ) => {
            describe( `eGK Test ${idx + 1}: ${config.rawDataFile} => ${config.parsedDataFile}`, function() {
                it( `patient should be equal`, function() {
                    //  KBVDateValidator.getISOString() now adds 10 hours to parsed dates
                    return Y.doccirrus.cardreader.parsers.egk.parse( user, config.rawData ).then( parsedData => {
                        compareParsedPatients( parsedData.patient, config.parsedData );
                    } );
                } );

            } );
        } );
    } );
    describe( 'KVK Tests', function() {
        kvkTests.forEach( ( config, idx ) => {
            describe( `KVK Test ${idx + 1}: ${config.rawDataFile} => ${config.parsedDataFile}`, function() {
                it( 'patient should be equal', function() {
                    return Y.doccirrus.cardreader.parsers.kvk.parse( user, config.rawData ).then( parsedData => {
                        compareParsedPatients( parsedData.patient, config.parsedData );
                    } );
                } );

            } );
        } );
    } );
} );