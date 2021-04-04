/**
 * User: mahmoud
 * Date: 15/06/15  16:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*global describe*/

const
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    testData = utils.getTestData( 'user-test-data' );


describe( 'Clean up data', function() {
    testLib.cleanUpWellKnownIds();
} );

describe( 'Test User API -- unified employee-identity API', function() {
    testLib.insertCRUDSuites( 'user', testData );
} );



