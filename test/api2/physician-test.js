/**
 * User: mahmoud
 * Date: 15/06/15  16:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    testData = utils.getTestData( 'physician-test-data' );

describe( 'Clean up data', function() {
    testLib.cleanUpWellKnownIds();
} );

testLib.insertCommonSuites( 'physician', testData );