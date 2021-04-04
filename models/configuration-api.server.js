/**
 * User: Sebastian Lara
 * Date: 05/08/2019  12:31
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */


/*global YUI */
'use strict';

YUI.add( 'configuration-api', function( Y, NAME ) {
    const
        {formatPromiseResult, handleResult} = require('dc-core').utils;

    /**
     * @public
     * @JsonRpcApi Can be accessed via /2/configuration
     *
     * This method returns InSuite configuration.
     *
     * @param {Object} args
     *   @param {function} [args.callback] - Will be present for JSONRPC call only
     *
     * @returns {Promise<[{
     *     inSuite: {
     *         network: {
     *             externalURL: string,
     *             sn: string
     *         },
     *         language: string,
     *         licenseScope: module:companySchema.licenseScopeObj
     *     }
     * }] | undefined>}
     * @constructor
     */
    async function GET( args ) {
        Y.log('Entering Y.doccirrus.api.configuration.get', 'info', NAME);

        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.configuration.get');
        }

        const
            {user, callback} = args,
            adminLanguageDbID = Y.doccirrus.schemas.admin.getLanguageId(),
            externalURL = Y.doccirrus.auth.getGeneralExternalUrl( user );

        let
            err,
            result,
            configuration = {
                inSuite: {
                    network: {
                        externalURL,
                        sn: Y.doccirrus.auth.getSerialNumber(externalURL)
                    },
                    language: null,
                    licenseScope: Y.doccirrus.licmgr.getLicenseData( user.tenantId )
                }
            };

        // ---------------------------------------------------- 1. Query inSuite language from admins collection -------------------------------------------------
        [err, result] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb({
                                    user,
                                    action: 'get',
                                    model: 'admin',
                                    query: {
                                        _id: adminLanguageDbID
                                    }
                                })
                              );

        if( err ) {
            Y.log(`GET: Error querying language settings from admins collection with _id: ${adminLanguageDbID}. Error: ${err.stack || err}`);
            return handleResult( Y.doccirrus.errors.createError(`Error querying InSuite language setting from DB. Error message: ${err}`), undefined, callback );
        }

        // Set "language" on configuration object
        configuration.inSuite.language = result && result[0] && result[0].language || 'DE';
        // ---------------------------------------------------------------------- 1. END --------------------------------------------------------------------------

        return handleResult( null, [configuration], callback );
    }

    Y.namespace( 'doccirrus.api' ).configuration = {
        name: NAME,
        get: GET
    };

    },
    '0.0.1', {
        requires: [
            'dcauth',
            'v_configuration-schema'
        ]
    }
);
