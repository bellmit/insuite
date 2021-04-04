/**
 * User: Sebastian Lara
 * Date: 30/09/19  15:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global describe, before */
'use strict';

var
    utils = require( './testUtils' ),
    testLib = require( './testLib' ),
    testData = utils.getTestData( 'tag-test-data');

describe( 'Tag Tests', function() {
    testLib.insertCommonSuites( 'tag', testData, {});

    describe('getAllAvailableLabDataTags()', function () {
        before(function (done) {
            utils.post( 'tag', testData.getData(), function() {
                done();
            });
        });

        testLib.insertGETSuite( 'tag/:getAllAvailableLabDataTags', testData, {
            query: {
                title: 'ERY'
            }
        });
    });
} );