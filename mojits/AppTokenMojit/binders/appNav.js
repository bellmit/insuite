/**
 * User: pi
 * Date: 17.01.18  08:47
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/
'use strict';
YUI.add( 'AppNavBinderIndex', function( Y, NAME ) {
    /**
     * @module AppNavBinderIndex
     */
    Y.namespace( 'mojito.binders' )[ NAME ] = Y.doccirrus.entryPoints.AppNavEntryPoint;
}, '0.0.1', {
    requires: [
        'AppNavEntryPoint'
    ]
} );