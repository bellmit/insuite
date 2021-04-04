/**
 * User: pi
 * Date: 05.12.17  08:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, expect, it, describe */

describe( 'Test rest handler', function() {

    const restHandler = new Y.doccirrus.classes.RestHandlerClass();

    describe( '0. restHandler methods', function() {

        it( 'returns "sort" object for "options" when querying database', function() {

            const testCases = [
                {
                    input: 'timestamp,employeeName,caseFolderId,patientId',
                    expectedOutput: {timestamp: -1, employeeName: -1, caseFolderId: -1, patientId: -1}
                },
                {
                    input: 'timestamp,employeeName,caseFolderId',
                    expectedOutput: {timestamp: -1, employeeName: -1, caseFolderId: -1}
                },
                {
                    input: 'timestamp,employeeName',
                    expectedOutput: {timestamp: -1, employeeName: -1}
                },
                {
                    input: 'timestamp',
                    expectedOutput: {timestamp: -1}
                },
                {
                    input: 'caseFolderId',
                    expectedOutput: {caseFolderId: -1}
                },
                {
                    input: 'caseFolderId:1',
                    expectedOutput: {caseFolderId: 1}
                }
            ];
            let result;

            for( let {input, expectedOutput} of testCases ) {

                result = restHandler.translateSortStringIntoObject( input );
                expect( result ).to.deep.equal( expectedOutput );

            }

        } );

    } );
} );
