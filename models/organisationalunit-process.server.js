/**
 * User: oliversieweke
 * Date: 10.04.18  17:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'organisationalunit-process', function( Y, NAME ) {
        /**
         * @module organisationalunit-process
         */
        const
            runDb = Y.doccirrus.mongodb.runDb,
            {formatPromiseResult} = require( 'dc-core' ).utils;

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        async function deleteReference( user, organisationalUnit, callback ) {
            let [err, data] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'ticardreader',
                    action: 'mongoUpdate',
                    query: {},
                    data: {$pull: {organisationalUnits: organisationalUnit._id}},
                    options: {multi: true}
                } )
            );

            if( err ) {
                return callback( err );
            }

            [err, data] = await formatPromiseResult(
                Y.doccirrus.api.ticontext.reloadSMCBs( {user} )
            );

            if( err ) {
                return callback( err );
            }

            return callback( null, data );
        }

        async function updateReference( user, organisationalUnit, callback ) {
            let [err, data] = await formatPromiseResult(
                Y.doccirrus.api.ticontext.reloadSMCBs( {user} )
            );

            if( err ) {
                return callback( err );
            }

            return callback( null, data );
        }

        /**
         * @class organisationalunit
         * @namespace doccirrus.schemaprocess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            post: [
                {
                    run: [deleteReference],
                    forAction: 'delete'
                },
                {
                    run: [updateReference],
                    forAction: 'write'
                }
            ],

            name: NAME
        };

    },
    '0.0.1', {
        requires: []
    }
);