/**
 * User: oliversieweke
 * Date: 10.04.18  17:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'organisationalunit-api', function( Y, NAME ) {
        /**
         * @module organisationalunit-api
         */
        const
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            runDb = Y.doccirrus.mongodb.runDb,
            {formatPromiseResult} = require( 'dc-core' ).utils;

        async function updateCollection( params ) {
            Y.log( 'Entering Y.doccirrus.api.organisationalunit.updateCollection', 'info', NAME );
            if( params.callback ) {
                params.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( params.callback, 'Exiting Y.doccirrus.api.organisationalunit.updateCollection' );
            }
            const
                {user, model, originalParams, callback} = params,
                {created, updated, deleted} = originalParams;
            let
                res = {};

            [...created, ...updated].forEach( organisationalUnit => {
                organisationalUnit.locations = organisationalUnit.locations.map( locationId => ObjectId( locationId ) );
            } );

            function createUnits( created ) {
                if( created.length > 0 ) {
                    return runDb( {
                        user, model,
                        action: 'mongoInsertMany',
                        data: created
                    } ).then( insertedUnits => {
                        res.insertedUnits = insertedUnits;
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
                        res.unitsFailedToDelete = err;
                    } );
                } else {
                    return Promise.resolve();
                }
            }

            let [err] = await formatPromiseResult(
                deleteUnits( deleted )
            );

            if( err ) {
                Y.log( `error deleting ti organisational units: ${err}`, `warn`, NAME );
            }

            [err] = await formatPromiseResult(
                createUnits( created )
            );

            if( err ) {
                Y.log( `error creating ti organisational units: ${err}`, `warn`, NAME );
            }

            [err] = await formatPromiseResult(
                updateUnits( updated )
            );

            if( err ) {
                Y.log( `error updating ti organisational units: ${err}`, `warn`, NAME );
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
         * @class organisationalunit
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).organisationalunit = {
            name: NAME,
            updateCollection
        };
    },
    '0.0.1', {
        requires: []
    }
);
