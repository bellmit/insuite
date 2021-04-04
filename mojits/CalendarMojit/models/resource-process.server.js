/*global YUI */


YUI.add( 'resource-process', function( Y, NAME ) {
        /**
         * The DC Resource data process definition
         *
         * @class ResourceProcess
         */

        const
            {formatPromiseResult} = require( 'dc-core' ).utils;

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        async function deleteResourceFromCalendars( user, resource, callback ) {
            let
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        'action': 'update',
                        'model': 'calendar',
                        'query': {
                            'resources.resource': resource._id.toString()
                        },
                        'data': {
                            $pull: {resources: {resource: resource._id.toString()}}
                        },
                        'options': {
                            multi: true
                        }
                    } )
                );

            if( err ) {
                Y.log( `deleteResourceFromCalendars. Error while deleting resource: ${resource._id} : ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }

            return callback( null, resource );
        }

        /**
         * Class Resource Processes
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            name: NAME,

            pre: [
                {
                    run: [],
                    forAction: 'write'
                }
            ],

            post: [
                {
                    run: [
                        deleteResourceFromCalendars
                    ],
                    forAction: 'delete'
                }
            ]
        };

    },
    '0.0.1', {
        requires: []
    }
);
