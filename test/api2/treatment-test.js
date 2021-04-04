/**
 * User: mahmoud
 * Date: 15/06/15  16:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    testDataGKV = utils.getTestData( 'treatment-gkv-test-data' ),
    testDataPKV = utils.getTestData( 'treatment-pkv-test-data' );

if ( utils.countryMode === 'ch' ) {
    testLib.insertCommonActivitySuite( 'treatment', testDataPKV, {} );
} else {
    testLib.insertCommonActivitySuite( 'treatment', testDataGKV, {} );
    testLib.insertCommonActivitySuite( 'treatment', testDataPKV, {caseFolderType: 'pkv'} );
}
