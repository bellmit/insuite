/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
'use strict';
YUI.add( 'promise', function( Y, NAME ) {

    var
        dcPromise = {
            /**
             * default unhandled catch handler
             * @param error
             */
            catchUnhandled: function catchUnhandled( error ) {
                setTimeout( function() {
                    throw error;
                } );
            },
            /**
             * log unhandled error
             * @param {Object} error
             */
            logUnhandled: function( error ){
                Y.log( 'unhandled error: ' + JSON.stringify( error ), 'error', NAME );
                throw error;
            }
        };
    /**
     * Promise configuration
     */
    Promise.config( {
        // Enable cancellation
        cancellation: true
    } );

    /**
     * @module promise
     */
    Y.namespace( 'doccirrus' ).promise = dcPromise;
}, '3.16.0', {
    requires: []
} );
