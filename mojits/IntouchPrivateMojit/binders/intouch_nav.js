/**
 * User: pi
 * Date: 26/02/15  15:25
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/
'use strict';
YUI.add( 'IntouchNavigationBinderIndex', function( Y, NAME ) {

    /**
     * @module IntouchNavigationBinderIndex
     */
    /**
     * @class IntouchNavigationBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[ NAME ] = Y.doccirrus.entryPoints.inTouchNavEntryPoint;
}, '0.0.1', {
    requires: [
        'InTouchNavEntryPoint'
    ]
} );