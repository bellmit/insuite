/**
 * User: oliversieweke
 * Date: 10.04.18  17:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'ticardreader-process', function( Y, NAME ) {
        /**
         * @module ticardreader-process
         */
        const
            runDb = Y.doccirrus.mongodb.runDb,
            {formatPromiseResult} = require( 'dc-core' ).utils;

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function deleteReference( user, tiCardReader, callback) {
            runDb({
                user,
                model: 'workstation',
                action: 'mongoUpdate',
                query: {},
                data: { $pull: { tiCardReaders: tiCardReader._id } },
                options: { multi: true }
            }, callback);
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
         * @class ticardreader
         * @namespace doccirrus.schemaprocess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            post: [
                {
                    run: [ deleteReference ] ,
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
