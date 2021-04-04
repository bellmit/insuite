/**
 * User: oliversieweke
 * Date: 27.04.18  17:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'tisettings-api', function( Y, NAME ) {
        /**
         * @module tisettings-api
         */
        const {handleResult, formatPromiseResult} = require( 'dc-core' ).utils;

        async function get( params ) {
            Y.log( 'Entering Y.doccirrus.api.tisettings.get', 'info', NAME );
            if( params.callback ) {
                params.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( params.callback, 'Exiting Y.doccirrus.api.tisettings.get' );
            }
            let {user, callback} = params;
            let puppetrySettings;

            let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'tisettings',
                options: {
                    limit: 1
                }
            } ) );

            if( err ) {
                Y.log( `could not get ti settings: ${err.stack || err}`, 'warn', NAME );
                return;
            }

            const tiSettings = results && results[0];

            if( !tiSettings ) {
                return results;
            }

            try {
                puppetrySettings = require( 'dc-core' ).config.load( `${process.cwd()}/puppetry.json` );
            } catch( err ) {
                Y.log( `could not load puppetry.json: ${err.stack || err}`, 'info', NAME );
            }
            const {puppetry, puppetryClientSystemId, puppetryClientCertificatePassword} = (puppetrySettings || {});

            if( puppetry ) {
                Y.log( `use puppetry client password`, 'info', NAME );
                tiSettings.puppetryClientSystemId = puppetryClientSystemId;
                tiSettings.puppetryClientCertificatePassword = puppetryClientCertificatePassword;
            }

            return handleResult( null, results, callback );
        }

        function put( params ) {
            Y.log('Entering Y.doccirrus.api.tisettings.put', 'info', NAME);
            if (params.callback) {
                params.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(params.callback, 'Exiting Y.doccirrus.api.tisettings.put');
            }
            const {user, options, callback, originalParams} = params;
            const data = Y.doccirrus.filters.cleanDbObject( originalParams );
            options.limit = 1;

            return Y.doccirrus.mongodb.runDb( {
                user, options, data,
                action: 'put',
                model: 'tisettings',
                fields: Object.keys( originalParams ),
                query: {_id: Y.doccirrus.schemas.tisettings.getDefaultData()._id},
                callback: callback
            } );
        }

        /**
         * @class tisettings
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).tisettings = {
            name: NAME,
            get,
            put
        };
    },
    '0.0.1', {
        requires: []
    }
);