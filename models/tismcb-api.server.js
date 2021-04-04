/**
 * User: maximilian.kramp
 * Date: 30.09.19  09:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'tismcb-api', function( Y, NAME ) {
        /**
         * @module tismcb-api
         */
        const
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            runDb = Y.doccirrus.mongodb.runDb;

        function updateCollection( params ) {
            Y.log( 'Entering Y.doccirrus.api.tismcb.updateCollection', 'info', NAME );
            if( params.callback ) {
                params.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( params.callback, 'Exiting Y.doccirrus.api.tismcb.updateCollection' );
            }
            const
                {user, model, originalParams, callback} = params,
                {created, updated, deleted} = originalParams;
            let res = {};

            [...created, ...updated].forEach( tismcb => {
                tismcb.organisationalUnits = tismcb.organisationalUnits.map( unitId => ObjectId( unitId ) );
            } );

            function createSMCBs( created ) {
                if( created.length > 0 ) {
                    return runDb( {
                        user, model,
                        action: 'mongoInsertMany',
                        data: created
                    } ).then( insertedSMCBs => {
                        res.insertedSMCBs = insertedSMCBs;
                    } );
                } else {
                    return Promise.resolve();
                }
            }

            function updateSMCBs( updated ) {
                if( updated.length > 0 ) {
                    const
                        promises = [];

                    updated.forEach( update => {
                        promises.push(
                            runDb( {
                                user, model,
                                action: 'update',
                                query: {_id: update._id},
                                data: update
                            } )
                        );
                    } );
                    return Promise.all( promises );
                } else {
                    return Promise.resolve();
                }
            }

            function deleteSMCBs( deleted ) {
                if( deleted.length > 0 ) {
                    return runDb( {
                        user, model,
                        action: 'delete',
                        query: {_id: {$in: deleted}},
                        options: {override: true}
                    } ).catch( err => {
                        res.SMCBsFailedToDelete = err;
                    } );
                } else {
                    return Promise.resolve();
                }
            }

            deleteSMCBs( deleted )
                .catch( ( err ) => Y.log( `error deleting ti SMCBs: ${err}`, `warn`, NAME ) )
                .then( () => createSMCBs( created ) )
                .catch( ( err ) => Y.log( `error creating ti SMCBs: ${err}`, `warn`, NAME ) )
                .then( () => updateSMCBs( updated ) )
                .catch( ( err ) => Y.log( `error updating ti SMCBs: ${err}`, `warn`, NAME ) )
                .then( () => callback( null, res ) );
        }

        /**
         * @class tismcb
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).tismcb = {
            name: NAME,
            updateCollection
        };
    },
    '0.0.1', {
        requires: []
    }
);
