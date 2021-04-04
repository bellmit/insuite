/**
 * User: oliversieweke
 * Date: 10.04.18  17:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'ticardreader-api', function( Y, NAME ) {
        /**
         * @module ticardreader-api
         */
        const
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            runDb = Y.doccirrus.mongodb.runDb,
            {formatPromiseResult} = require( 'dc-core' ).utils;

        async function updateCollection( params ) {
            Y.log( 'Entering Y.doccirrus.api.ticardreader.updateCollection', 'info', NAME );
            if( params.callback ) {
                params.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( params.callback, 'Exiting Y.doccirrus.api.ticardreader.updateCollection' );
            }
            const
                {user, model, originalParams, callback} = params,
                {created, updated, deleted} = originalParams;
            let
                res = {};

            [...created, ...updated].forEach( cardReader => {
                cardReader.organisationalUnits = cardReader.organisationalUnits.map( organisationalUnitId => ObjectId( organisationalUnitId ) );
            } );

            function createCardReaders( created ) {
                if( created.length > 0 ) {
                    return runDb( {
                        user, model,
                        action: 'mongoInsertMany',
                        data: created
                    } ).then( insertedCardReaders => {
                        res.insertedCardReaders = insertedCardReaders;
                    } );
                } else {
                    return Promise.resolve();
                }
            }

            function updateCardReaders( updated ) {
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

            function deleteCardReaders( deleted ) {
                if( deleted.length > 0 ) {
                    return runDb( {
                        user, model,
                        action: 'delete',
                        query: {_id: {$in: deleted}},
                        options: {override: true}
                    } ).catch( err => {
                        res.cardReadersFailedToDelete = err;
                    } );
                } else {
                    return Promise.resolve();
                }
            }

            let [err] = await formatPromiseResult(
                deleteCardReaders( deleted )
            );

            if( err ) {
                Y.log( `error deleting ti card readers: ${err}`, `warn`, NAME );
            }

            [err] = await formatPromiseResult(
                createCardReaders( created )
            );

            if( err ) {
                Y.log( `error creating ti card readers: ${err}`, `warn`, NAME );
            }

            [err] = await formatPromiseResult(
                updateCardReaders( updated )
            );

            if( err ) {
                Y.log( `error updating ti card readers: ${err}`, `warn`, NAME );
            }

            [err] = await formatPromiseResult(
                Y.doccirrus.api.ticontext.reloadSMCBs( {user} )
            );

            if( err ) {
                Y.log( `error reloading SMCBs: ${err}`, `warn`, NAME );
            }

            return callback( null, res );
        }

        /**
         * @class ticardreader
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).ticardreader = {
            name: NAME,
            updateCollection
        };
    },
    '0.0.1', {
        requires: []
    }
);
