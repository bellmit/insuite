/**
 * User: Sebastian Lara
 * Date: 19/08/19  13:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global describe */
'use strict';

var
    testLib = require( './testLib' );

describe( 'Formportal Tests', function() {

    testLib.insertGETSuite( 'formportal/:getActivePortalList', {}, {});

    testLib.insertPOSTSuite( 'formportal/:sendUrl', {
        force: true,
        portalId: 'test1',
        activeUrl: 'http://prcs.dev.dc/sol/infusion/test-url'
    }, { negate: true });
} );