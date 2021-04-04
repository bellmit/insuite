/**
 * User: abhijit.baldawa
 * Date: 2019-01-16  15:12
 * (c) 2012, Doc Cirrus GmbH, Berlin
 *
 * This module exposes model methods required by Oauth server in DCPRC
 */

const
    NAME = "dcprcOauthModel",
    {formatPromiseResult} = require( 'dc-core' ).utils;

let
    Y;

/**
 * @method PUBLIC
 *
 * For the semantics of below method follow the link below:
 * https://oauth2-server.readthedocs.io/en/latest/model/spec.html#getclient-clientid-clientsecret-callback
 *
 * This method does below:
 * 1] Parse JSON string'clientId' and verify whether it has "dcCustomerNo" and "publicCertificate" in it
 * 2] Verifies whether company exists in DB for "dcCustomerNo"
 * 3] Confirms that the company "activeState" is true
 * 4] Confirms that systemId is set on queried company
 * 5] Verifies "clientSecret" i.e. signaure of datensafe using its provided "publicCertificate" and "dcCustomerNo"
 * 6] Parses and checks whether the datensafe 'publicCertificate' is valid and has valid systemId which equals companyObj.systemId
 * 7] If any of the above step is not satisfied then this method throws appropriate error else is successful
 *
 * @param {String} clientId --> in Doc Cirrus case this contains stringified JSON with "dcCustomerNo" and "publicCertificate" keys
 * @param {String} clientSecret --> this is 'base64' encoded signature string coming from datensaafe
 * @returns {Promise<{id: String, grants: [String]}>}
 */
async function getClient( clientId, clientSecret ) {
    let
        err,
        companyObj,
        clientObject;

    Y.log(`Entering 'getClient' method of dcprcOauthModel.server.js. Parsing 'clientId'`, "info", NAME);

    // ------------------------------- 1. Parse JSON string'clientId' and verify  -----------------------------------------------
    [err, clientObject] = await formatPromiseResult( Promise.resolve().then(() => JSON.parse(clientId)) );

    if( err ) {
        Y.log(`getClient: 'clientId' is not a valid JSON string. Error while parsing 'clientId' = ${clientId}. Error: ${err.stack || err}`, "warn", NAME);

        /**
         * This will send HTTP response as below:
         * http statusCode = 503
         *
         * body = {
         *     "error": "server_error",
         *     "error_description": err.message
         * }
         */
        throw new Error(`'clientId' is not a valid JSON string`);
    }

    if( !clientObject.dcCustomerNo ) {
        Y.log(`getClient: Missing 'dcCustomerNo' key from input JSON string 'clientId' = ${clientId}`, "warn", NAME);
        throw new Error(`Missing 'dcCustomerNo' key from input JSON string 'clientId'`);
    }

    if( !clientObject.publicCertificate ) {
        Y.log(`getClient: Missing 'publicCertificate' key from input JSON string 'clientId' = ${clientId}`, "warn", NAME);
        throw new Error(`Missing 'publicCertificate' key from input JSON string 'clientId'`);
    }

    Y.log(`getClient: Successfully parsed 'clientId' and found dcCustomerNo = ${clientObject.dcCustomerNo}. Proceeding...`, "info", NAME);
    // -------------------------------------------------- 1. END ----------------------------------------------------------------


    // ----------------------------- 2. Verify whether provided dcCustomerNo is valid and has systemId set --------------------------------------
    [err, companyObj] = await formatPromiseResult( Y.doccirrus.api.company.getCompanyByDcCustomerNo({ dcCustomerNo: clientObject.dcCustomerNo }) );

    if(err) {
        Y.log(`getClient: Error in getCompanyByDcCustomerNo for dcCustomerNo = '${clientObject.dcCustomerNo}'. Error: ${err.stack || err}`, "warn", NAME);
        throw err;
    }

    if( !companyObj.activeState ) {
        Y.log(`getClient: Company associated with dcCustomerNo: '${clientObject.dcCustomerNo} is inactive in DCPRC DB i.e companyObj.activeState = ${companyObj.activeState}'. Blocking access`, "warn", NAME);
        throw new Error(`Company associated with dcCustomerNo: '${clientObject.dcCustomerNo} is inactive`);
    }

    if( !companyObj.systemId ) {
        Y.log(`getClient: Company associated with dcCustomerNo: '${clientObject.dcCustomerNo} does not have 'systemId' in DCPRC DB`, "warn", NAME);
        throw new Error(`Company associated with dcCustomerNo: '${clientObject.dcCustomerNo} does not have 'systemId' in DCPRC DB`);
    }
    // ------------------------------------------------ 2. END ------------------------------------------------------------


    // ------------------------------------- 3. Verify clientSecret -------------------------------------------------------
    if( !Y.doccirrus.https.verifySignature( clientObject.dcCustomerNo, clientObject.publicCertificate, clientSecret ) ) {
        Y.log(`getClient: provided clientSecret = ${clientSecret} failed to verify against received 'publicCertificate' for dcCustomerNo = ${clientObject.dcCustomerNo}`, "warn", NAME);
        throw new Error(`provided clientSecret = ${clientSecret} failed to verify against received 'publicCertificate' for dcCustomerNo = ${clientObject.dcCustomerNo}`);
    }
    // ----------------------------------------------- 3. END -------------------------------------------------------------


    // --------- 4. Parse and check whether 'clientObject.publicCertificate' is valid and has valid systemId which equals companyObj.systemId ------
    [err] = await formatPromiseResult(
                    Y.doccirrus.https.verifyPrcPublicCertificate({
                        publicCertificate: clientObject.publicCertificate,
                        systemId: companyObj.systemId
                    })
                  );

    if( err ) {
        Y.log(`getClient: Failed to verify provided public certificate for dcCustomerNo: ${clientObject.dcCustomerNo}. Error: ${err.stack || err}`, "warn", NAME);

        /**
         * NOTE: if we return null from here then below response will be sent:
         *
         * This responds as http.statusCode = 400 and body as below
         * {
         *    "error": "invalid_client",
         *    error_description = "Invalid client: client is invalid",
         * }
         *
         * But precise error message will not be sent. In order to send exact reason for what went wrong its better to
         * throw error with string message so that exact error message will be sent
         */
        throw err;
    }
    // ------------------------------------------------------------- 4. END --------------------------------------------------------------------------

    Y.log(`Exiting 'getClient' method of dcprcOauthModel.server.js for (dcCustomerNo) = ${clientObject.dcCustomerNo}`, "info", NAME);

    return {
        id: clientObject.dcCustomerNo,
        grants: ['client_credentials']
    };
}

/**
 * @method PUBLIC
 *
 * For the semantics of below method follow the link below:
 * https://oauth2-server.readthedocs.io/en/latest/model/spec.html#getuserfromclient-client-callback
 *
 * @param {Object} client
 * @param {String} client.id  This is same as what is returned from "getClient" method (i.e. dcCustomerNo)
 * @param {Array} client.grants  This is same as what is returned from "getClient" method
 * @returns {Promise<{}>}
 */
async function getUserFromClient(client) {  // eslint-disable-line
    Y.log(`Entering 'getUserFromClient' method of dcprcOauthModel.server.js for clientId (dcCustomerNo) = ${client.id}`, "info", NAME);
    Y.log(`Exiting 'getUserFromClient' method of dcprcOauthModel.server.js for clientId (dcCustomerNo) = ${client.id}`, "info", NAME);
    /**
     * There is no user associated in the entire flow so we return empty object so that
     * Oauth server does not complain
     *
     * If empty object is not returned i.e. null/undefined is returned then Oauth server responds as below
     * as HTTP response
     *
     * statusCode = 400
     * Json response = {
     *     "error": "invalid_grant",
     *     "error_description": "Invalid grant: user credentials are invalid"
     * }
     */
    return {};
}

/**
 * @method PUBLIC
 *
 * For the semantics of below method follow the link below:
 * https://oauth2-server.readthedocs.io/en/latest/model/spec.html#savetoken-token-client-user-callback
 *
 * This method does below:
 * 1] Signs the oauth token.accessToken with DCPRC private key and gets the DCPRC signature and public key string
 * 2] Saves the token.accessToken in the DB
 * 3] Return "access_token" and its information along with DCPRC signature and its public key
 *
 * The response of this method is converted by Oauth server and the final response received by datensafe as REST response is as below:
 *
 * {
 *     access_token: String,
 *     token_type: "Bearer",
 *     expires_in: Number,
 *     tokenExpiryDate: String,
 *     dcprcSignature: String,
 *     publicCertificate: String //DCPRC public certificate
 * }
 *
 * @param {Object} token  This is generated and provided by oauth server
 * @param {Object} client  This is same as what is returned from "getClient" method
 * @param {Object} user  This is exactly same as what is returned from 'getUserFromClient' method i.e. empty object ({})
 *
 * @returns {Promise<{
 *     accessToken: String,
 *     accessTokenExpiresAt: Date,
 *     client: Object,
 *     user: Object,
 *     tokenExpiryDate: String,
 *     dcprcSignature: String,
 *     publicCertificate: String
 * }>}
 */
async function saveToken( token, client, user ) {
    let
        err,
        dcprcSignatureAndPublicKeyObj;

    Y.log(`Entering 'saveToken' method of dcprcOauthModel.server.js for clientId (dcCustomerNo) = ${client.id}`, "info", NAME);

    // ----------------------- 1. Sign the oauth accessToken with DCPRC private key and get DCPRC signature and public key --------------------
    [err, dcprcSignatureAndPublicKeyObj] = await formatPromiseResult( Y.doccirrus.https.getDcprcSignatureAndPublicKey( token.accessToken ) );

    if(err) {
        Y.log(`saveToken: Error in 'getDcprcSignatureAndPublicKey'. Error: ${err.stack || err}`, "error", NAME);
        throw err;
    }

    if( !dcprcSignatureAndPublicKeyObj.dcprcSignature ) {
        // Should never happen but still keeping the check
        Y.log(`saveToken: DCPRC failed to sign oauth 'accessToken'`, "error", NAME);
        throw new Error(`DCPRC failed to sign oauth 'accessToken'`);
    }
    // ------------------------------------------------------------ 1. END --------------------------------------------------------------------


    // ----------------------------------------- 2. Save 'token.accessToken' in the DB --------------------------------------------------------
    [err] = await formatPromiseResult(
                    Y.doccirrus.api.dcprcoauthtoken.saveToken({
                        user: Y.doccirrus.auth.getSUForLocal(),
                        token: {
                            accessToken: token.accessToken,
                            accessTokenExpiresAt: token.accessTokenExpiresAt
                        },
                        client: {
                            id: client.id
                        }
                    })
                  );

    if(err) {
        Y.log(`saveToken: Error while saving Oauth token in DB for dcCustomerNo: ${client.id}. Error: ${err.stack || err}`, "error", NAME);
        throw new Error(`Error while saving Oauth token in DB for dcCustomerNo: ${client.id}. Error: ${err.message || err}`);
    }
    // ------------------------------------------------------------ 2. END --------------------------------------------------------------------

    Y.log(`Exiting 'saveToken' method of dcprcOauthModel.server.js for clientId (dcCustomerNo) = ${client.id}`, "info", NAME);

    return {
        ...token,
        client,
        user,
        tokenExpiryDate: token.accessTokenExpiresAt.toISOString(),
        ...dcprcSignatureAndPublicKeyObj
    };
}

/**
 * @method PUBLIC
 *
 * This method verifies whether the Oauth token which the resource server is trying to verify is valid or not.
 * For more information please follow below link:
 * https://oauth2-server.readthedocs.io/en/latest/model/spec.html#getaccesstoken-accesstoken-callback
 *
 * @param {String} accessToken  The access token the resource server is trying to verify
 *
 * @returns {Promise<{
 *     user: {},
 *     accessTokenExpiresAt: Date,
 *     client: {
 *         id: String
 *     }
 * }>}
 */
async function getAccessToken( accessToken ) {
    let
        err,
        oauthTokenObj;

    Y.log(`Entering 'getAccessToken' method of dcprcOauthModel.server.js for oauthToken = ${accessToken}`, "info", NAME);

    [err, oauthTokenObj] = await formatPromiseResult(
                                    Y.doccirrus.api.dcprcoauthtoken.getToken({
                                        user: Y.doccirrus.auth.getSUForLocal(),
                                        accessToken
                                    })
                                 );

    if(err) {
        Y.log(`getAccessToken: Error while querying Oauth token from DB for accessToken: ${accessToken}. Error: ${err.stack || err}`, "error", NAME);

        /**
         * This will send HTTP response as below:
         * http statusCode = 503
         *
         * body = {
         *     "error": "server_error",
         *     "error_description": err.message
         * }
         */
        throw err;
    }

    if( !oauthTokenObj ) {
        Y.log(`getAccessToken: accessToken = '${accessToken}' Is not valid. Blocking access`, "warn", NAME);

        /**
         * Means the oauth token is not valid
         * This responds as http.statusCode = 401 and body as below
         * {
         *    "error": "invalid_token",
         *    "error_description": "Invalid token: access token is invalid"
         * }
         */
        return null;
    }

    Y.log(`Exiting 'getAccessToken' method of dcprcOauthModel.server.js for oauthToken = ${accessToken}. Token expires at: ${oauthTokenObj.accessTokenExpiresAt}`, "info", NAME);

    return {
        user: {}, // There is no user associated in Oauth token flow so we send empty object else Oauth server will complain
        accessTokenExpiresAt: oauthTokenObj.accessTokenExpiresAt,
        client: oauthTokenObj.client
    };
}

/**
 * @method PUBLIC
 *
 * @param {Object} _Y  This is 'Y' object with all the exposed YUI modules
 * @returns {{
 *      saveToken: (function(Object, Object, Object): {accessToken: String, accessTokenExpiresAt: Date, client: Object, user: Object, tokenExpiryDate: String, dcprcSignature: String, publicCertificate: String}),
 *      getUserFromClient: (function({id: String, grants: Array}): {}),
 *      getClient: (function(String, String): {id: String, grants: [String]}),
 *      getAccessToken: (function(String): {user: Object, accessTokenExpiresAt: Date, client: Object})
 * }}
 */
module.exports = function( _Y ) {
    Y = _Y;

    return {
        getClient,
        getUserFromClient,
        saveToken,
        getAccessToken
    };
};