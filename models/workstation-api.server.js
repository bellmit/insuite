/**
 * User: oliversieweke
 * Date: 10.04.18  17:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'workstation-api', function( Y, NAME ) {
        /**
         * @module workstation-api
         */
        const
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            runDb = Y.doccirrus.mongodb.runDb,
            {formatPromiseResult} = require( 'dc-core' ).utils;

        async function updateCollection( params ) {
            Y.log( 'Entering Y.doccirrus.api.workstation.updateCollection', 'info', NAME );
            if( params.callback ) {
                params.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( params.callback, 'Exiting Y.doccirrus.api.workstation.updateCollection' );
            }
            const
                {user, model, originalParams, callback} = params,
                {created, updated, deleted} = originalParams;
            let
                res = {};

            [...created, ...updated].forEach( workStation => {
                workStation.tiCardReaders = workStation.tiCardReaders.map( cardReaderId => ObjectId( cardReaderId ) );
            } );

            function createUnits( created ) {
                if( created.length > 0 ) {
                    return runDb( {
                        user, model,
                        action: 'mongoInsertMany',
                        data: created
                    } ).then( insertedWorkStations => {
                        res.insertedWorkStations = insertedWorkStations;
                    } );
                } else {
                    return Promise.resolve();
                }
            }

            function updateUnits( updated ) {
                if( updated.length > 0 ) {
                    const
                        promises = [];

                    updated.forEach( update => {
                        let fields = Object.keys( update );
                        fields.shift();
                        promises.push(
                            runDb( {
                                user, model,
                                action: 'put',
                                query: {_id: update._id},
                                fields: fields,
                                data: Y.doccirrus.filters.cleanDbObject( update )
                            } )
                        );
                    } );
                    return Promise.all( promises );
                } else {
                    return Promise.resolve();
                }
            }

            function deleteUnits( deleted ) {
                if( deleted.length > 0 ) {
                    return runDb( {
                        user, model,
                        action: 'delete',
                        query: {_id: {$in: deleted}},
                        options: {override: true}
                    } ).catch( err => {
                        res.workStationFailedToDelete = err;
                    } );
                } else {
                    return Promise.resolve();
                }
            }

            let [err] = await formatPromiseResult(
                deleteUnits( deleted )
            );

            if( err ) {
                Y.log( `error deleting ti workstations: ${err}`, `warn`, NAME );
            }

            [err] = await formatPromiseResult(
                createUnits( created )
            );

            if( err ) {
                Y.log( `error creating ti workstations: ${err}`, `warn`, NAME );
            }

            [err] = await formatPromiseResult(
                updateUnits( updated )
            );

            if( err ) {
                Y.log( `error updating ti workstations: ${err}`, `warn`, NAME );
            }

            [err] = await formatPromiseResult(
                Y.doccirrus.api.ticontext.reloadSMCBs( {user} )
            );

            if( err ) {
                Y.log( `error reloading SMCBs: ${err}`, `warn`, NAME );
            }

            return callback( null, res );
        }

        function getWithTiCardReaders( params ) {
            Y.log( 'Entering Y.doccirrus.api.workstation.getWithTiCardReaders', 'info', NAME );
            if( params.callback ) {
                params.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( params.callback, 'Exiting Y.doccirrus.api.workstation.getWithTiCardReaders' );
            }
            const
                {user, model, callback} = params;

            if( !Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, 'inTi' ) ) {
                return runDb( {
                    user, model,
                    action: 'get'
                } ).then( res => {
                    res.forEach( workStation => {
                        workStation.tiCardReaders = []; // Keep same object structure as for License users to preempt bugs on front end for missing tiCardReaders field.
                    } );

                    if( callback ) {
                        return callback( null, res );
                    } else {
                        return res;
                    }
                } ).catch( err => {
                    Y.log( `Unable to get workstations. ${err}`, 'error', NAME );
                    if( callback ) {
                        return callback( null, [] );
                    } else {
                        return [];
                    }
                } );
            } else {
                return runDb( {
                    user, model,
                    action: 'aggregate',
                    pipeline: [
                        {
                            $lookup: {
                                from: "ticardreaders",
                                localField: "tiCardReaders",
                                foreignField: "_id",
                                as: "tiCardReaders"
                            }
                        }
                    ]
                } ).then( res => {
                    if( callback ) {
                        return callback( null, res.result );
                    } else {
                        return res.result;
                    }
                } ).catch( function( err ) {
                    Y.log( `Unable to get workstations with card readers. ${err}`, 'error', NAME );
                    if( callback ) {
                        return callback( null, [] );
                    } else {
                        return [];
                    }
                } );
            }
        }

        /**
         * @class workstation
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).workstation = {
            name: NAME,
            updateCollection,
            getWithTiCardReaders
        };
    },
    '0.0.1', {
        requires: []
    }
);

