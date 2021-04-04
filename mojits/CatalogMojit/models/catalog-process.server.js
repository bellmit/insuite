/**
 * User: oliversieweke
 * Date: 11.02.19  12:18
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'catalog-process', function( Y, NAME ) {
        const {formatPromiseResult} = require( 'dc-core' ).utils;

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * This pre-process is to insure that custom Tarmed dignity entries have unique codes and descriptions.
         *
         * [NB: Checking for uniqueness in the pre-process leads to slight race-condition weakness for parallel requests,
         * however as of now partial indexes don't allow enough fine-tuning to enforce the uniqueness criteria for our
         * use case.]
         * @method uniqueTarmedDignityCodes
         *
         * @param {Object} user :REQUIRED:
         * @param {Object} catalog :REQUIRED:
         * @param {Function} callback :REQUIRED:
         */
        //
        async function uniqueTarmedDignityCodes( user, catalog, callback ) {
            let err, result;
            const TARMED_DIGNITY_CATALOG_SHORTS = new Set( ['TARMED_DIGNI_QUALI', 'TARMED_DIGNI_QUANTI'] );
            const {catalogShort, code, text} = catalog;

            if( catalog.isNew && TARMED_DIGNITY_CATALOG_SHORTS.has( catalogShort ) ) {
                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'catalog',
                    action: 'count',
                    query: {
                        catalogShort,
                        $or: [{code}, {text}]
                    }
                } ) );

                if( err || !Number.isInteger( result ) ) {
                    Y.log( `uniqueTarmedDignityCodes: Error in checking for the uniqueness of custom Tarmed dignity: ${err && err.stack || err}`, 'error', NAME );
                    err = Y.doccirrus.errors.rest( 'dignity_02', null, true );
                } else if( result > 0 ) {
                    Y.log( `uniqueTarmedDignityCodes: Could not save custom Tarmed dignity, the code '${code}' or text '${text}' are not unique.`, 'debug', NAME );
                    err = Y.doccirrus.errors.rest( `dignity_03`, null, true );
                } else {
                    Y.log( `uniqueTarmedDignityCodes: The Tarmed dignity code '${code}' and text '${text}' are unique and will be saved.`, 'debug', NAME );
                }
            }

            return callback( err, catalog );
        }

        /**
         * @class catalogProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            name: NAME,
            pre: [
                {
                    run: [
                        uniqueTarmedDignityCodes
                    ], forAction: 'write'
                }
            ],
            post: []
        };
    },
    '0.0.1', {requires: ['dcerrortable']}
);
