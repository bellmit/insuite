/**
 * User: abhijit.baldawa
 * Date: 2019-01-25  16:54
 * (c) 2012, Doc Cirrus GmbH, Berlin
 *
 * This module manages CRUD operations of Oauth tokens in DCPRC server
 */

/*global YUI*/
YUI.add( 'dcprcoauthtoken-api', function( Y, NAME ) {

        const
            {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * @method PUBLIC
         *
         * This method saves Oauth token in the DB
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.token
         * @param {String} args.token.accessToken
         * @param {Date} args.token.accessTokenExpiresAt  oauth token expiry date
         * @param {Object} args.client
         * @param {String} args.client.id  This is dcCustomerNo
         * @returns {Promise<void>}
         */
        async function saveToken( args = {} ) {
            const
                {user, token = {}, client = {}} = args,
                {accessToken, accessTokenExpiresAt} = token;

            let
                err,
                oauthTokenIdArr;

            Y.log('Entering Y.doccirrus.api.dcprcoauthtoken.saveToken', 'info', NAME);

            // ----------------------------------- 1. Validations --------------------------------------------------
            if( !user || !accessToken || !accessTokenExpiresAt ) {
                throw new Error(`'user', 'accessToken' and 'accessTokenExpiresAt' required`);
            }

            if( !client.id || typeof client.id !== "string" ) {
                throw new Error(`'client.id' is required and must be a string`);
            }

            if( typeof accessToken !== "string" ) {
                throw new Error(`'accessToken' must be string`);
            }

            if( !(accessTokenExpiresAt instanceof Date) ) {
                throw new Error(`'accessTokenExpiresAt' must Date object`);
            }
            // ------------------------------------------ 1. END ----------------------------------------------------


            // ---------------------------------- 2. Save Oauth token in the DB ------------------------------------
            [err, oauthTokenIdArr] = await formatPromiseResult(
                                             Y.doccirrus.mongodb.runDb( {
                                                 model: 'oauthtoken',
                                                 action: 'post',
                                                 user: user,
                                                 data: Y.doccirrus.filters.cleanDbObject( {
                                                     accessToken,
                                                     accessTokenExpiresAt,
                                                     client: {
                                                         id: client.id
                                                     }
                                                 } )
                                             } )
                                        );

            if( err ) {
                Y.log(`saveToken: Error while saving Oauth token for dcCustomerNo: ${client.id}. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !oauthTokenIdArr || !Array.isArray(oauthTokenIdArr) || !oauthTokenIdArr.length ) {
                Y.log(`saveToken: Failed to save oauthToken in DB for dcCustomerNo: ${client.id}`, "error", NAME);
                throw new Error(`Failed to save oauthToken in DB for dcCustomerNo: ${client.id}`);
            }
            // -------------------------------------------- 2. END --------------------------------------------------

            Y.log('Exiting Y.doccirrus.api.dcprcoauthtoken.saveToken', 'info', NAME);
        }

        /**
         * @method PUBLIC
         *
         * This method queries Oauth token by 'args.accessToken'
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.accessToken  access token to query
         * @returns {Promise<{accessToken: String, accessTokenExpiresAt: Date: client: {id: String}}>}
         */
        async function getToken( args = {} ) {
            const
                {user, accessToken} = args;

            let
                err,
                result;

            Y.log('Entering Y.doccirrus.api.dcprcoauthtoken.getToken', 'info', NAME);

            // ----------------------------------- 1. Validations --------------------------------------------------
            if( !user || !accessToken ) {
                throw new Error(`'user' and 'accessToken' required`);
            }

            if( typeof accessToken !== "string" ) {
                throw new Error(`'accessToken' must be string`);
            }
            // ------------------------------------------ 1. END ----------------------------------------------------


            // ---------------------------------------- 2. Query oauth token by accessToken  ------------------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'oauthtoken',
                                        action: 'get',
                                        query: {
                                            accessToken
                                        }
                                    })
                                  );

            if( err ) {
                Y.log(`getToken: Error while querying oauthtoken by accessToken: ${accessToken}. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }
            // ------------------------------------------------------ 2. END ----------------------------------------------------------------

            Y.log('Exiting Y.doccirrus.api.dcprcoauthtoken.getToken', 'info', NAME);

            return result && Array.isArray(result) && result[0];
        }

        /**
         * @class dcprcoauthtoken
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).dcprcoauthtoken = {
            /**
             * @property name
             * @type {String}
             * @default dcprcoauthtoken-api
             * @protected
             */
            name: NAME,
            saveToken,
            getToken
        };

    },
    '0.0.1', {requires: []}
);