/**
 * User: Mykhaylo Dolishniy
 * Date: 25/05/16  11:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    testData = utils.getTestData( 'medication-test-data' );


testLib.insertCommonActivitySuite( 'medication', testData, {} );

