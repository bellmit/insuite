'use strict';

var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    countryMode = utils.countryMode,
    testData = utils.getTestData( 'document-test-data' );

if ( !countryMode || countryMode === 'de' ) {
    testLib.insertGETSuite( 'document', testData );
    testLib.insertPOSTSuite( 'document', testData );
    testLib.insertPUTSuite( 'document', testData );
}
