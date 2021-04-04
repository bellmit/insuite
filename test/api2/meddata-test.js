/**
 * User: nazar krania
 * Date: 1/24/19  12:39 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

const
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    testData = utils.getTestData( 'meddata-test-data' );

testLib.insertCommonActivitySuite( 'meddata', testData, {} );
