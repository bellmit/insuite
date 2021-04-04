/**
 * Handles unhandled exceptions from same origin by sending them to the server
 */

'use strict';

/*global YUI */
YUI.add(
    'dcerrorhandler',
    function( Y, NAME ) {

        if( !Y.doccirrus ) {
            Y.doccirrus = {};
        }

        if( !Y.doccirrus.errorhandler ) {
            Y.doccirrus.errorhandler = {};
        }

        /**
         * Global error handler
         *
         * @param {ErrorEvent} event error event
         * @returns {boolean}
         */
        Y.doccirrus.errorhandler.handler = function( event ) {
            // TODO MOJ-13432 provide an endpoint which can be used by all of our clients
            if( Y.doccirrus.auth.getPatientPortalUser() ) {
                // prevent log out message on the patient portal
                return true;
            }

            const data = {
                url: window.location.href,
                message: event.error.message,
                stack: event.error.stack,
                browser: Y.doccirrus.comctl.getBrowser()
            };

            Y.doccirrus.jsonrpc.api.errors.log( {data: data} ).fail( function( error ) {
                Y.log( 'Failed to transmit error: ' + JSON.stringify( error ), 'error', NAME );
            } );

            return true;
        };
    },
    '0.0.1',
    {
        requires: [
            'dc-comctl',
            'dcinfrastructs'
        ]
    }
);
