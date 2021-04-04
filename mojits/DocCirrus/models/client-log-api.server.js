/**
 * Log API for clients
 */



/*global YUI */
YUI.add(
    'client-log-api',
    function( Y, NAME ) {

        const {handleResult} = require( 'dc-core' ).utils;

        /**
         * Sink for client errors
         *
         * @class errors
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).errors = {
            /**
             * @property name
             * @type {String}
             * @default identity-api
             * @protected
             */
            name: NAME,

            /**
             * Log single client error
             *
             * @param {Object} args
             * @returns {Object | undefined}
             */
            log: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.errors.log', 'info', NAME );

                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.errors.log' );
                }

                const data = {
                    client: args.data,
                    user: {
                        id: args.user.id,
                        identityId: args.user.identityId,
                        tenantId: args.user.tenantId
                    }
                };

                Y.log( `Client error received: ${JSON.stringify( data )}`, 'info', NAME );

                return handleResult( undefined, true, args.callback );
            }
        };
    },
    '0.0.1',
    {
        requires: []
    }
);
