/**
 * User: Sebastian Lara
 * Date: 05/08/19  16:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global describe, it, should */
'use strict';

var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    testData = utils.getTestData( 'configuration-test-data' ).getData();

describe( 'Configuration Tests', function() {
    testLib.insertGETSuite( 'configuration', {}, {}, moreTests );

    function moreTests( err, body ) {

        if( err ) {
            return;
        }

        describe( 'Configuration Additional Tests', function() {
            it( 'should contain array with only 1 item', function() {
                should.exist( body );
                body.data.should.be.an( 'array' );
                body.data.length.should.be.equal( 1 );
            } );

            it( 'should contain insuite property as object', function() {
                should.exist( body.data[0].inSuite );
                body.data[0].should.contain.keys( ['inSuite'] );
                body.data[0].inSuite.should.be.an( 'object' );
            } );

            // Check language
            it( `'body.data[0].inSuite' should contain 'language' property and it must be string`, function() {
                should.exist( body.data[0].inSuite.language );
                body.data[0].inSuite.language.should.be.an( 'string' );
            } );

            // Check Network
            it( `'body.data[0].inSuite' should contain network object`, function() {
                should.exist( body.data[0].inSuite.network );
                body.data[0].inSuite.should.contain.keys( ['network'] );
                body.data[0].inSuite.network.should.be.an( 'object' );
            } );

            it( `'body.data[0].inSuite.network' should contain externalURL property, as string`, function() {
                should.exist( body.data[0].inSuite.network.externalURL );
                body.data[0].inSuite.network.should.contain.keys( ['externalURL'] );
                body.data[0].inSuite.network.externalURL.should.be.an( 'string' );
            } );

            it( `'body.data[0].inSuite.network' should contain sn property, as string`, function() {
                should.exist( body.data[0].inSuite.network.sn );
                body.data[0].inSuite.network.should.contain.keys( ['sn'] );
                body.data[0].inSuite.network.sn.should.be.an( 'string' );
            } );

            // Check licenses
            it( `'body.data[0].inSuite' should contain licenseScope object`, function() {
                should.exist( body.data[0].inSuite.licenseScope );
                body.data[0].inSuite.should.contain.keys( ['licenseScope'] );
                body.data[0].inSuite.licenseScope.should.be.an( 'object' );
            } );

            // deep check all testData property value types
            testLib.matchDataPropertiesTypes( 'configuration', body.data[0], testData );
        } );
    }
} );
