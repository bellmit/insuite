/**
 * User: pi
 * Date: 17.01.18  08:47
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/
'use strict';
YUI.add( 'AppTokenBinderIndex', function( Y, NAME ) {
    /**
     * @module AppTokenBinderIndex
     */
    Y.namespace( 'mojito.binders' )[ NAME ] = Y.doccirrus.entryPoints.appTokenEntryPoint;
}, '0.0.1', {
    requires: [
        'AppTokenEntryPoint'
    ]
} );