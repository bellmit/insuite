/**
 * User: dcdev
 * Date: 3/10/21  1:39 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
YUI.add( 'instockconfiguration-api', function( Y, NAME ) {
        /** @module instockconfiguration-api */

        const {formatPromiseResult, handleResult} = require('dc-core').utils;

        /**
         * Saves instock configuration
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Function} args.callback
         */

        async function saveConfig( {user, data, callback} ){
            Y.log('Entering Y.doccirrus.api.instockconfiguration.saveConfig', 'info', NAME);

            if( callback ) {
                callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.instockconfiguration.saveConfig' );
            }

            let error, result;

            [error, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'put',
                    model: 'instockconfiguration',
                    fields: Object.keys( data ),
                    migrate: true,
                    query: {_id: Y.doccirrus.schemas.instockconfiguration.getDefaultData()._id},
                    data: Y.doccirrus.filters.cleanDbObject( data )
                } )
            );

            return handleResult(error, result, callback);
        }

        Y.namespace( 'doccirrus.api' ).instockconfiguration = {
            name: NAME,
            saveConfig
        };
    },
    '0.0.1', { requires: [] }
);
