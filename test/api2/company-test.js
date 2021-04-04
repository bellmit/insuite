/**
 * User: mahmoud
 * Date: 15/06/15  16:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global describe*/
'use strict';

var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    testData = utils.getTestData( 'company-test-data' );

describe( 'GET company without query', function() {
    testLib.insertGETSuite( 'company', testData );
} );

describe( 'POST company, should return with error 403', function() {
    testLib.insertPOSTSuite( 'company', testData, {negate: true, errorCode: 403} );
} );