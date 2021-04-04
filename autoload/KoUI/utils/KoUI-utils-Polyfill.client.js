/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'KoUI-utils-Polyfill', function( /*Y, NAME*/ ) {
    'use strict';
    /**
     * KoUI utility namespace that covers polyfills.
     * @module KoUI-utils-Polyfill
     */

    /**
     * Polyfill Function#name on browsers that do not support it (IE):
     * @property name
     * @for Function
     * @author: http://stackoverflow.com/questions/6903762/function-name-not-supported-in-ie
     */
    if( !(function f() {
        }).name ) {
        Object.defineProperty( Function.prototype, 'name', {
            get: function() {
                var name = this.toString().match( /^\s*function\s*(\S*)\s*\(/ )[1];
                // For better performance only parse once, and then cache the
                // result through a new accessor for repeated access.
                Object.defineProperty( this, 'name', {value: name} );
                return name;
            }
        } );
    }

}, '3.16.0', {
    requires: ['KoUI']
} );
