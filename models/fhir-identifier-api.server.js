/*global YUI */

YUI.add( 'fhir-identifier-api', async function( Y, NAME ) {

    const { Connection } = await import( '../lib/fhir/connection' );

    Y.doccirrus.api['fhir-identifier'] = {
        post: async ( parameters ) => {
            const { user, originalParams, callback } = parameters;

            try {
                const result = await Connection.call(
                    '/registry/identifier.create',
                    originalParams,
                    {
                        tenant: user.tenantId
                    }
                );

                if (!result) {
                    throw new Error('Unexpected identifier received.');
                }

                if ( callback ) {
                    return callback( null, result );
                }

                return result;
            } catch ( error ) {
                Y.log( JSON.stringify( error ), 'error', NAME );

                if ( callback ) {
                    return callback( error );
                }

                throw error;
            }
        }
    };
}, '1.0.0', {requires: []} );
