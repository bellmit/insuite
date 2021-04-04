/**
 * User: rw
 * Date: 08.11.13  08:04
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * Send HTTP(S) sanely and configure CA Certs.
 */

/*global YUI*/

'use strict';

YUI.add( 'dchttps', function( Y, NAME ) {

        let
            myCfg = {},
            ok = false,
            myHttps,

            // This configuration should be present on datensafe
            m2mClientJson,

            // This configuration should be present on DCPRC
            m2mServerJson;

        const
            fs = require('fs'),
            {exec} = require('child_process'),
            crypto = require('crypto'),
            needle = require( 'needle' ),
            HttpsProxyAgent = require('https-proxy-agent'),
            x509 = require('@ghaiklor/x509'),
            {ObjectID} = require('mongodb'),
            moment = require('moment'),
            util = require('util'),
            dcCore = require( 'dc-core' ),
            {formatPromiseResult, handleResult} = dcCore.utils,
            readFileProm = util.promisify(fs.readFile),
            writeFileProm = util.promisify(fs.writeFile),
            unlinkProm = util.promisify(fs.unlink),
            needleTimeoutOpts = {timeout: 45000},

            //Path to which received certificates will be written temporarily so that openssl can verify it
            certificateTmpDir =`${Y.doccirrus.auth.getTmpDir()}/certificateTmp/`,

            //This is the template for openssl command to verify public certificate against CA and CRL
            openSslCmdTemplate = `openssl verify -crl_check -CAfile $CA_PATH $PUB_CERT_PATH`;

        /**
         * @method PRIVATE
         *
         * remove undefined keys recursively
         *
         * @param {Object|Array} obj
         * @returns {Object|Array}
         */
        function cleanObject( obj ) {
            return JSON.parse( JSON.stringify( obj ) );
        }

        /**
         * @method PRIVATE
         *
         * Creates directory based on provided path
         *
         * @param {String} dir  Absolute path to the directory
         */
        function mkdirIfMissing( dir ) {
            // need to block while we check this or catch errors
            // do not allow the possibility of race conditions here.
            if( fs.existsSync( dir ) ) {
                //  exists, nothing to do
                return;
            }

            // does not exist, create it
            Y.log( `mkdirIfMissing: Creating directory: ${dir}`, 'info', NAME );

            try {
                Y.doccirrus.fileutils.mkdirpSync( dir );
            } catch ( fsErr ) {
                Y.log( `Error creating directory: ${  JSON.stringify( fsErr )}`, 'warn', NAME );
                throw fsErr;
            }
        }


        /**
         * @method PRIVATE
         *
         * sets whether or not the initialization constructor has run successfully and certificateTmpDir is created
         *
         * @param bool
         */
        function setReady( bool ) {
            ok = bool;
        }


        /**
         * @method PRIVATE
         *
         * This method deletes file at provided filePath
         *
         * @param {String} filePath  Fully qualified file path to be deleted
         * @param {String} [methodName]  If present then log failure warning by this methodName
         * @returns {Promise<void>}
         */
        async function deleteFile( filePath, methodName ) {
            if(!filePath) {
                throw new Error(`Missing 'filePath'`);
            }

            let
                err;

            [err] = await formatPromiseResult( unlinkProm(filePath) );

            if( err ) {
                Y.log(`${methodName || 'deleteFile'}: Error while cleaning up temp file at path = '${filePath}'. Trace: ${err.stack || err}`, "warn", NAME);
            }
        }

        /**
         * @method PRIVATE
         *
         * This method returns client_id and client_secret as required by Oauth server to generate token
         *
         * @param {Object} [user]
         * @returns {Promise<{client_secret: string, client_id: string}>}
         */
        async function getClientCredentials( user ) {
            let
                err,
                dcCustomerNo,
                privateKeyBuffer,
                publicCertificateBuffer,
                signatureObj,
                client_secret;

            user = user || Y.doccirrus.auth.getSUForLocal();

            Y.log(`Entering getClientCredentials`,"info", NAME);

            // ------------------------------- 1. Get the dcCustomerNo of datensafe ----------------------------------------
            [err, dcCustomerNo] = await formatPromiseResult( Y.doccirrus.api.practice.getDCCustomerNo( user ) );

            if( err ) {
                Y.log(`getClientCredentials: Error fetching dcCustomerNo. Trace: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !dcCustomerNo ) {
                Y.log(`getClientCredentials: No dcCustomer number found`, "error", NAME);
                throw new Error(`No dcCustomerNo found`);
            }
            // -------------------------------------------- 1. END ----------------------------------------------------------


            // ------------------------------ 2. Read the private key ----------------------------------------------------------
            [err, privateKeyBuffer] = await formatPromiseResult( readFileProm(m2mClientJson.clientKeyPath) );

            if( err ) {
                Y.log(`getClientCredentials: Error reading private key from path: ${m2mClientJson.clientKeyPath}. Trace: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !privateKeyBuffer ) {
                // Should never happen but still keep a check for extra safety
                Y.log(`getClientCredentials: Empty file response after reading private key from path: ${m2mClientJson.clientKeyPath}`, "error", NAME);
                throw new Error(`Empty file response after reading private key from path: ${m2mClientJson.clientKeyPath}`);
            }
            // ---------------------------------------- 2. END ------------------------------------------------------------------


            // -------------------------------- 3. Read the public certificate --------------------------------------------------------
            [err, publicCertificateBuffer] = await formatPromiseResult( readFileProm(m2mClientJson.clientCrtPath) );

            if( err ) {
                Y.log(`getClientCredentials: Error reading public certificate from path: ${m2mClientJson.clientCrtPath}. Trace: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !publicCertificateBuffer ) {
                // Should never happen but still keep a check for extra safety
                Y.log(`getClientCredentials: Empty file response after reading public certificate from path: ${m2mClientJson.clientCrtPath}`, "error", NAME);
                throw new Error(`Empty file response after reading public certificate from path: ${m2mClientJson.clientCrtPath}`);
            }
            // ---------------------------------------------- 3. END ------------------------------------------------------------------


            // ------------------------------ 4. Generate the secret key ----------------------------------------------------
            signatureObj = crypto.createSign( 'SHA256' );
            signatureObj.update( dcCustomerNo );
            signatureObj.end();

            client_secret = signatureObj.sign( privateKeyBuffer, 'base64' );
            // -------------------------------------- 4. END ----------------------------------------------------------------

            Y.log(`Exiting getClientCredentials`,"info", NAME);

            return {
                client_id: JSON.stringify({
                               dcCustomerNo,
                               publicCertificate: publicCertificateBuffer.toString() // Public certificate is needed to verify signature on DCPRC
                           }),
                client_secret
            };
        }

        /**
         * @method PRIVATE
         *
         * Generic response handler for all needle calls.
         * @param {Object} options
         * @param {String} options.description
         * @param {String} options.url
         * @param {Boolean} [options.errDataCallback] if set callback will be called with 2 arguments: err, data.
         * @param {Function} callback
         * @return {Function}
         */
        function getExternalResponseHandler( options, callback ) {
            var
                { description, url, errDataCallback } = options;

            return function( error, response, body ) {
                if( error || undefined === response || undefined === body ) {
                    callback( error, response, body );
                    return;
                }

                // HTTP(S) redirect body is not important, 'Location' header is all that's needed, fix for images in MOJ-6101
                if( 302 === response.statusCode ) {
                    if( errDataCallback ) {
                        return Y.doccirrus.https.handlerBodyResponse( { error, body }, callback );
                    }
                    callback( error, response, body );
                    return;
                }

                if( 200 === response.statusCode || 201 === response.statusCode || 204 === response.statusCode ) {
                    if( 'string' === typeof body ) {
                        Y.log( description + ': server reported ' + response.statusCode + ', but delivered stringy output: ' + body.substring( 0, 1024 ), 'warn', NAME );
                        body = body || '[]';

                        if( 'data:' === body.substring( 0, 5 ) ) {

                            Y.log( description + ': server reported ' + response.statusCode + ', sent file as dataURI, ' + body.length + 'bytes', 'warn', NAME );

                        } else {

                            try {
                                body = JSON.parse( body );
                            } catch( e ) {
                                // prb the same old problem with mojito's faulty error handling chain
                                Y.log( description + ': server reported ' + response.statusCode + ', but delivered faulty ouput: ' + require( 'util' ).inspect( body ).substring( 0, 1024 ), 'warn', NAME );
                            }

                        }

                    }

                    if( body instanceof Buffer ) {
                        Y.log( description + ': ' + url + ': ' + callback.name + ' received file: ' + body.length + ' bytes', 'debug', NAME );
                    } else {
                        Y.log( description + ': ' + url + ': ' + callback.name + ' received: ' + JSON.stringify( body ).substring( 0, 1024 ), 'debug', NAME );
                    }

                    if( errDataCallback ) {
                        return Y.doccirrus.https.handlerBodyResponse( { error, body }, callback );
                    }
                    return callback( error, response, body );
                }

                Y.log( `getExternalResponseHandler: '${description}' response status code not in [200,201,204,302], was [${response.statusCode}]. response.statusMessage: ${response.statusMessage}, body = ${JSON.stringify(body)}`, 'debug', NAME );
                callback( new Y.doccirrus.commonerrors.DCError( response.statusCode, {} ) );
            };
        }

        /**
         * Constructor for the module class.
         *
         * @class DCHttps
         * @private
         */
        function DCHttps() {
            let
                cfgRaw = Y.doccirrus.utils.tryGetConfig( 'https.json' );

            myCfg = (cfgRaw && cfgRaw.config) || {};
            if( myCfg.cacerts ) {
                Y.log( 'Set up https with CA certificates: ' + myCfg.cacerts, 'info', NAME );
            }

            // --------- Read 'm2m-client.json' (If present) so that Oauth secret key generation is possible -------
            /**
             * NOTE: Currently this JSON is present on datensafe only but still keeping the code generic and trying
             * to read anyway if present
             */
            try{
                m2mClientJson = dcCore.config.load( `${process.cwd()}/m2m-client.json` );
            } catch(e){
                Y.log( 'DCHttps (constructor): m2m-client.json not found', 'info', NAME );
            }
            // ---------------------------------------- END --------------------------------------------------------


            // ------ Read 'm2m-server.json' (If present) so that DATENSAFE PUBLIC certificate can be validated ----
            /**
             * NOTE: Currently this JSON is only present on DCPRC server but still keeping the code generic and trying to
             * read anyway if present.
             */
            try{
                m2mServerJson = dcCore.config.load( `${process.cwd()}/m2m-server.json` );
            } catch(e){
                Y.log( 'DCHttps (constructor): m2m-server.json not found', 'info', NAME );
            }
            // ---------------------------------------- END --------------------------------------------------------


            // -------------------------------------- Check and create certificateTmpDir directory --------------------------------------------------
            try{
                mkdirIfMissing( certificateTmpDir );
                setReady(true);
            } catch(e) {
                Y.log( `DCHttps (constructor): Failed to create directory at path: ${certificateTmpDir}. Trace: ${e.stack || e}`, 'error', NAME );
            }
            // --------------------------------------------- END ------------------------------------------------------------------------------------
        }

        /**
         * @method PUBLIC
         *
         * Gets completed config, incl. proxy
         * Proxy settings in dc-cli, overrides json file proxy settings.
         * @param {Function} :OPTIONAL: callback
         */
        DCHttps.prototype.getHttpsConfig = async function( callback ) {
            let
                [err, proxyUrl] = await formatPromiseResult(myHttps.getProxyUrl());

            if( proxyUrl ) {
                myCfg.agent = myHttps.getProxyAgent(proxyUrl);
            }

            return handleResult( err, myCfg, callback );
        };

        /**
         * Gets proxy settings from dc-cli.
         * @returns {Promise<String | undefined>}
         */
        DCHttps.prototype.getProxyUrl = async function() {
            let
                [err, result] = await formatPromiseResult(Y.doccirrus.api.cli.getProxyConfig());

            if( err ) {
                if( err.code === "userMgmtMojit_01" ) {
                    // Means dc-cli is not present and so proxy feature is not supported. This is not a error scenario.
                    return;
                }

                Y.log(`getProxyUrl: Error getting proxy configuration from 'cli.getProxyConfig'. Trace: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            return result && result.proxy;
        };

        /**
         * @method PRIVATE
         *
         * If PRC/VPRC is trying to communicate to PUC server then this method gets the Oauth token from DCPRC
         *
         * @param {String} originalUrl  the url datensafe is trying to access
         * @param {Object} [httpConfig]  The http config object. If absent then will be queried
         * @returns {Promise<String | undefined>}
         */
        DCHttps.prototype.checkAndGetTokenFromDcprc = async function ( originalUrl, httpConfig ) {
            if( !Y.doccirrus.auth.isPucUrl(originalUrl) || !( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() ) ) {
                return;
            }

            if( !m2mClientJson ) {
                /**
                 * Meaning this server is not equipped with certificate config .json which is required
                 * to generate client_secret. This is not error scenario as of now because in this case
                 * we default to JWT approach if we just return from here.
                 */
                return;
            }

            const
                DCPRC_TOKEN_URL = Y.doccirrus.auth.getDCPRCUrl( '/oauth/token' ),
                options = {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    timeout: 60000
                };

            let
                err,
                cachedOauthToken,
                redisOauthTokenDate,
                clientCredentialsObj,
                tokenResp,
                tokenObj;

            Y.log(`Entering 'checkAndGetTokenFromDcprc' method`, "info", NAME);

            // --------------------- 1. Get Oauth token from redis (if previously set) and return if valid ----------------------------------
            if( Y.doccirrus.cacheUtils.oauthTokenCache.isClientConnected() ) {
                [err, cachedOauthToken] = await formatPromiseResult( Y.doccirrus.cacheUtils.oauthTokenCache.getToken() );

                if( err ) {
                    Y.log(`checkAndGetTokenFromDcprc: Error while checking if oauth token is present in redis. Trace: ${err.stack || err}`, "warn", NAME);
                }

                if( cachedOauthToken && cachedOauthToken.access_token && cachedOauthToken.tokenExpiryDate && typeof cachedOauthToken.tokenExpiryDate === "string" ) {
                    redisOauthTokenDate = moment(cachedOauthToken.tokenExpiryDate);

                    /**
                     * ex. If token expiry date is 5 minutes from now, then, for safe side subtract 1 minute and make sure that
                     * the token expiry is same or after current date so that we at-least have 1 minute time till the token
                     * is sent to resource server which in-turn will validate it against authorization server (DCPRC)
                     */
                    if( redisOauthTokenDate.isValid() && redisOauthTokenDate.subtract(1, 'minute').isAfter(moment()) ) {
                        Y.log(`Exiting 'checkAndGetTokenFromDcprc' method as we got Oauth token: ${cachedOauthToken.access_token} valid until: ${cachedOauthToken.tokenExpiryDate} from redis cache `, "info", NAME);
                        return cachedOauthToken.access_token;
                    }
                }
            }
            // ------------------------------------------ 1. END ----------------------------------------------------------------------


            // --------------------------------- 2. Get client credentials for oauth communication ---------------------------------
            [err, clientCredentialsObj] = await formatPromiseResult( getClientCredentials() );

            if( err ) {
                Y.log(`checkAndGetTokenFromDcprc: Error in getClientCredentials. Trace: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !clientCredentialsObj || !clientCredentialsObj.client_id || !clientCredentialsObj.client_secret ) {
                Y.log(`checkAndGetTokenFromDcprc: Either 'client_id' or 'client_secret' is missing. Expected both`, "error", NAME);
                throw new Error("invalid client credentials");
            }
            // ------------------------------------------------- 2. END ------------------------------------------------------------


            // -------------------------------------- 3. Get the HTTP config ------------------------------------------------------------
            if( !httpConfig ) {
                [err, httpConfig] = await formatPromiseResult( myHttps.getHttpsConfig() );

                if( err ) {
                    Y.log( `checkAndGetTokenFromDcprc: Error in 'getHttpsConfig()'. Trace: ${err.stack || err}`, "error", NAME );
                    throw err;
                }
            }
            // ------------------------------------------------------ 3. END ------------------------------------------------------------


            // ------ 4. Token either not found or expired in redis so fetch a new token from authorization server (DCPRC) --------
            [err, {tokenResp, tokenObj} = {}] = await formatPromiseResult(
                                                        new Promise((resolve, reject) => {
                                                            needle.post(
                                                                DCPRC_TOKEN_URL,
                                                                {
                                                                    grant_type: 'client_credentials',
                                                                    client_id: clientCredentialsObj.client_id,
                                                                    client_secret: clientCredentialsObj.client_secret
                                                                },
                                                                {...httpConfig, ...options},
                                                                (error, tokenResp, tokenObj) => {
                                                                    if( error ) {
                                                                        reject( error );
                                                                    } else {
                                                                        resolve( {tokenResp, tokenObj} );
                                                                    }
                                                                }
                                                            );
                                                        })
                                                      );

            if( err ) {
                Y.log(`checkAndGetTokenFromDcprc: Error while fetching Oauth token from DCPRC server. Trace: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            /**
             * If successful then
             *      tokenResp.statusCode = 200
             *      tokenResp.statusMessage = "OK"
             *
             *      tokenObj = {
             *          access_token: "6a856f1d091bfa5ad02c8e7526509e611dbdc831",
             *          token_type: "Bearer",
             *          expires_in: 3599
             *          tokenExpiryDate: "2019-01-22T12:28:32.869Z",
             *          dcprcSignature: String,   // This is 'base64' encoded string
             *          publicCertificate: String   // This is DCPRC public certificate
             *      }
             *
             * If server error occurred at DCPRC (ex. during DB operation) then
             *      tokenResp.statusCode = 503 --> service unavailable
             *      body = {
             *          error: "server_error",
             *          "error_description": "error message"
             *      }
             *
             *  else if client_id and/or secret is invalid then
             *      tokenResp.statusCode = 400
             *      tokenResp.statusMessage = "Bad Request"
             *
             *      tokenObj = {
             *          "error": "invalid_client",
             *          "error_description": "Invalid client: client is invalid"
             *      }
             */
            if( !tokenObj ) {
                // This should never happen but keeping it for safety
                Y.log(`checkAndGetTokenFromDcprc: Got empty response from DCPRC.`, "error", NAME);
                throw new Error(`checkAndGetTokenFromDcprc: Got empty response from DCPRC`);
            }

            if( tokenResp && tokenResp.statusCode !== 200 ) {
                Y.log(`checkAndGetTokenFromDcprc: Failed to get Oauth token from DCPRC: statusCode = ${tokenResp.statusCode}, statusMessage = ${tokenResp.statusMessage}, error = ${tokenObj.error}, error_description = ${tokenObj.error_description}`, "error", NAME);
                throw new Error(`checkAndGetTokenFromDcprc: Failed to get Oauth token from DCPRC: statusCode = ${tokenResp.statusCode}, statusMessage = ${tokenResp.statusMessage}, error = ${tokenObj.error}, error_description = ${tokenObj.error_description}`);
            }

            if( !tokenObj.access_token || !tokenObj.tokenExpiryDate ) {
                // This error should never happen but still keeping the check.
                Y.log(`checkAndGetTokenFromDcprc: Missing 'access_token' and/or tokenExpiryDate from DCPRC response. Expected both. statusCode = ${tokenResp && tokenResp.statusCode}, statusMessage = ${tokenResp && tokenResp.statusMessage}`, "error", NAME);
                throw new Error(`checkAndGetTokenFromDcprc: Missing 'access_token' and/or tokenExpiryDate from DCPRC response. Expected both. statusCode = ${tokenResp && tokenResp.statusCode}, statusMessage = ${tokenResp && tokenResp.statusMessage}`);
            }

            if( !tokenObj.dcprcSignature || !tokenObj.publicCertificate ) {
                // This error should never happen but still keeping the check.
                Y.log(`checkAndGetTokenFromDcprc: Missing 'dcprcSignature' and/or 'publicCertificate' from DCPRC response. Expected both. statusCode = ${tokenResp && tokenResp.statusCode}, statusMessage = ${tokenResp && tokenResp.statusMessage}`, "error", NAME);
                throw new Error(`checkAndGetTokenFromDcprc: Missing 'dcprcSignature' and/or 'publicCertificate' from DCPRC response. Expected both. statusCode = ${tokenResp && tokenResp.statusCode}, statusMessage = ${tokenResp && tokenResp.statusMessage}`);
            }
            // -------------------------------------------------------- 3. END ----------------------------------------------------


            // ------------------------------------- 4. Verify DCPRC signature against the oauth access_token ------------------------------
            if( !myHttps.verifySignature( tokenObj.access_token, tokenObj.publicCertificate, tokenObj.dcprcSignature ) ) {
                Y.log(`checkAndGetTokenFromDcprc: DCPRC signature = ${tokenObj.dcprcSignature} failed to verify against provided 'publicCertificate'. Cannot trust the response. Stopping...`, "error", NAME);
                throw new Error(`checkAndGetTokenFromDcprc: DCPRC signature = ${tokenObj.dcprcSignature} failed to verify against provided 'publicCertificate'. Cannot trust the response`);
            }
            // -------------------------------------------------------- 4. END -------------------------------------------------------------


            // --------- 5. Parse and check whether 'clientObject.publicCertificate' is valid and has valid systemId which equals companyObj.systemId ------
            [err] = await formatPromiseResult( myHttps.verifyDcprcPublicCertificate({publicCertificate: tokenObj.publicCertificate}) );

            if( err ) {
                Y.log(`checkAndGetTokenFromDcprc: Failed to verify the received DCPRC public certificate. Cannot trust the response. Trace: ${err.stack || err}`, "error", NAME);
                throw err;
            }
            // ------------------------------------------------------------- 5. END --------------------------------------------------------------------------


            // ---------------------------------------- 6. Cache the Oauth token in redis ------------------------------------------------
            if( Y.doccirrus.cacheUtils.oauthTokenCache.isClientConnected() ) {
                /**
                 * Deleting below keys because there is not need to save this information in redis
                 */
                delete tokenObj.expires_in;
                delete tokenObj.publicCertificate;
                delete tokenObj.dcprcSignature;

                [err] = await formatPromiseResult( Y.doccirrus.cacheUtils.oauthTokenCache.saveToken( {oauthTokenObj: tokenObj} ) );

                if( err ) {
                    Y.log(`checkAndGetTokenFromDcprc: Error while saving oauth token: '${tokenObj}' in redis. Trace: ${err.stack || err}`, "warn", NAME);
                }
            }
            // ---------------------------------------------------- 6. END ----------------------------------------------------------------

            Y.log(`Exiting 'checkAndGetTokenFromDcprc' method`, "info", NAME);

            return tokenObj.access_token;
        };

        /**
         * @method PUBLIC
         *
         * Ths method verifies from DCPRC whether the provided 'oauthToken' is valid or not and responds accordingly.
         * This method is called from PUC middleware
         *
         * @param {String} oauthToken  Token to verify from DCPRC
         * @returns {Promise<Object>} If successful promise resolves to
         *                              {
         *                                  token: "VALID"
         *                              }
         *                            else
         *                              {
         *                                  token: "INVALID",
         *                                  statusCode: <Number ex. 503, 401>,
         *                                  statusMessage: <String>,
         *                                  error: <String, ex: server_error, invalid_token>,
         *                                  error_description: <String>
         *                              }
         */
        DCHttps.prototype.verifyOauthTokenFromDcprc = async function( oauthToken ) {
            if( !oauthToken ) {
                throw new Error(`'oauthToken' required`);
            }

            const
                DCPRC_VERIFY_TOKEN_URL = Y.doccirrus.auth.getDCPRCUrl( '/oauth/validateToken' ),
                options = {
                    headers: { 'authorization': `Bearer ${oauthToken}` }
                };

            let
                err,
                httpConfig,
                response,
                body;

            Y.log(`Entering Y.doccirrus.https.verifyOauthTokenFromDcprc`, "info", NAME);

            // -------------------------------------- 1. Get the HTTP config ------------------------------------------------------------
            [err, httpConfig] = await formatPromiseResult( myHttps.getHttpsConfig() );

            if( err ) {
                Y.log(`verifyOauthTokenFromDcprc: Error in 'getHttpsConfig()'. Trace: ${err.stack || err}`, "error", NAME);
                throw err;
            }
            // -------------------------------------------------- 1. END ----------------------------------------------------------------


            // ---------------------------------- 2. Verify Oauth token from DCPRC ------------------------------------------------------
            [err, {response, body} = {}] = await formatPromiseResult(
                                                    new Promise((resolve, reject) => {
                                                        needle.post(
                                                            DCPRC_VERIFY_TOKEN_URL,
                                                            {},
                                                            {...httpConfig, ...needleTimeoutOpts, ...options},
                                                            (error, response, body) => {
                                                                if( error ) {
                                                                    reject( error );
                                                                } else {
                                                                    resolve( {response, body} );
                                                                }
                                                            }
                                                        );
                                                    })
                                                  );

            if( err ) {
                Y.log(`verifyOauthTokenFromDcprc: Error while validating provided Oauth token = '${oauthToken}' from DCPRC at ${DCPRC_VERIFY_TOKEN_URL}. Trace: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !body ) {
                // Should never come here but still keeping
                Y.log(`verifyOauthTokenFromDcprc: Got empty body as response from DCPRC.`, "error", NAME);
                throw new Error(`verifyOauthTokenFromDcprc: Got empty body as response from DCPRC.`);
            }
            // ------------------------------------------------ 2. END ------------------------------------------------------------------

            Y.log(`Exiting Y.doccirrus.https.verifyOauthTokenFromDcprc`, "info", NAME);

            /**
             * If successful then
             *      response.statusCode = 200
             *      response.statusMessage = "OK"
             *
             *      body = {
             *          valid: true
             *      }
             *
             * If server error occurred at DCPRC (ex. during DB operation) then
             *      response.statusCode = 503 --> service unavailable
             *      body = {
             *          error: "server_error",
             *          "error_description": "error message"
             *      }
             *
             *  else if token is invalid/not found etc then
             *      response.statusCode = 401 --> unauthorized
             *      response.statusMessage = "Unauthorized";
             *
             *      body = {
             *          "error": "invalid_token",
             *          "error_description": "Invalid token: access token is invalid"
             *      }
             */
            if( body.valid ) {
                return {
                    token: "VALID"
                };
            }

            return {
                token: "INVALID",
                statusCode: response && response.statusCode || 500,
                statusMessage: response && response.statusMessage,
                error: body.error,
                error_description: body.error_description || "Unexpected error occurred at the server"
            };
        };

        /**
         * To access restricted routes from a dc-server, use the friend access as follows:
         *
         *    options = Y.doccirrus.auth.setInternalAccessOptions(),
         *
         * @param {String} url
         * @param {Object}  options friend headers and other needle options
         * @param {Object}  [options.errDataCallback] if set callback will be called with 2 arguments: err, data.
         * @param {Function} callback
         */
        DCHttps.prototype.externalGet = async function externalGet( url, options, callback ) {
            options = options || {};

            const
                urlMsg = options.DC_doNotLogReason ? "[url hidden, doNotLogReason = " + options.DC_doNotLogReason + "]" : url;

            let
                err,
                httpConfig,
                friendsHeader,
                oauthToken;

            // --------------------------------------- 1. Get the Http configuration with proxy ------------------------------------
            [err, httpConfig] = await formatPromiseResult( myHttps.getHttpsConfig() );

            if( err ) {
                Y.log( `externalGet: Error in 'getHttpsConfig()'. Trace: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            // --------------------------------------------------------- 1. END ----------------------------------------------------


            // -------- 2. If options.friend is set then check if Oauth token can be fetched for this request and server type ------
            if(options.friend) {
                [err, oauthToken] = await formatPromiseResult( myHttps.checkAndGetTokenFromDcprc(url, httpConfig) );

                if( err ) {
                    Y.log(`externalGet: Error in checkAndGetTokenFromDcprc. Trace: ${err.stack || err}`, "error", NAME);
                    return callback(err);
                }

                if( oauthToken ) {
                    options.headers = {
                        ...(options.headers || {}),
                        'X-DC-Server': options.serverType || Y.doccirrus.auth.getServerType(),
                        'X-DC-Oauth': oauthToken
                    };
                }
            }
            // ------------------------------------------------ 2. END ------------------------------------------------------------


            // ------------------ 3. If Oauth token is not found then go ahead with friends header approach -----------------------
            if( !oauthToken ) {
                [err, friendsHeader] = await formatPromiseResult( Y.doccirrus.auth.setFriendHeader( url, 'GET', options ) );

                if( err ) {
                    Y.log(`externalGet: Error in auth.setFriendHeader. Trace: ${err.stack || err}`, "error", NAME);
                    return callback(err);
                }

                Y.log( `externalGet: Utils: Sending to ${urlMsg} via method=get`, 'debug', NAME );
                options.headers = friendsHeader;
            }
            // ------------------------------------------------ 3. END ------------------------------------------------------------

            needle.get(
                url,
                {...httpConfig, ...needleTimeoutOpts, ...options},
                getExternalResponseHandler( {
                    description: 'externalGet',
                    url,
                    errDataCallback: options.errDataCallback
                }, callback )
            );
        };

        /**
         * Wrapper for needle. See comment for externalGet
         * @param {String} url
         * @param {Object} data
         * @param {Object}  options friend headers and other needle options
         * @param {Object}  [options.errDataCallback] if set callback will be called with 2 arguments: err, data.
         * @param {Function} callback
         */
        DCHttps.prototype.externalPost = async function externalPost( url, data, options, callback ) {
            options = options || {};

            const
                urlMsg = options.DC_doNotLogReason ? "[url hidden, doNotLogReason = " + options.DC_doNotLogReason + "]" : url;

            options.json = true;

            if( !options.binary ) {
                data = cleanObject( data );
            }

            let
                err,
                httpConfig,
                friendsHeader,
                oauthToken;

            // --------------------------------------- 1. Get the Http configuration with proxy ------------------------------------
            [err, httpConfig] = await formatPromiseResult( myHttps.getHttpsConfig() );

            if( err ) {
                Y.log( `externalPost: Error in 'getHttpsConfig()'. Trace: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            // --------------------------------------------------------- 1. END ----------------------------------------------------


            // -------- 2. If options.friend is set then check if Oauth token can be fetched for this request and server type ------
            if(options.friend) {
                [err, oauthToken] = await formatPromiseResult( myHttps.checkAndGetTokenFromDcprc(url, httpConfig) );

                if( err ) {
                    Y.log(`externalPost: Error in checkAndGetTokenFromDcprc. Trace: ${err.stack || err}`, "error", NAME);
                    return callback(err);
                }

                if( oauthToken ) {
                    options.headers = {
                        ...(options.headers || {}),
                        'X-DC-Server': options.serverType || Y.doccirrus.auth.getServerType(),
                        'X-DC-Oauth': oauthToken
                    };
                }
            }
            // ------------------------------------------------ 2. END ------------------------------------------------------------


            // ------------------ 3. If Oauth token is not found then go ahead with friends header approach -----------------------
            if( !oauthToken ) {
                [err, friendsHeader] = await formatPromiseResult( Y.doccirrus.auth.setFriendHeader( url, 'POST', options, data ) );

                if( err ) {
                    Y.log(`externalPost: Error in auth.setFriendHeader. Trace: ${err.stack || err}`, "error", NAME);
                    return callback(err);
                }

                Y.log( `externalPost: Utils: Sending to ${urlMsg} via method=post`, 'debug', NAME );
                options.headers = friendsHeader;
            }
            // ------------------------------------------------ 3. END ------------------------------------------------------------

            needle.post(
                url,
                data,
                {...httpConfig, ...needleTimeoutOpts, ...options},
                getExternalResponseHandler( {
                    description: 'externalPost',
                    url,
                    errDataCallback: options.errDataCallback
                }, callback )
            );
        };

        /**
         * Wrapper for needle. See comment for externalGet
         * @param {String} url
         * @param {Object} data
         * @param {Object}  options friend headers and other needle options
         * @param {Object}  [options.errDataCallback] if set callback will be called with 2 arguments: err, data.
         * @param {Function} callback
         */
        DCHttps.prototype.externalPut = async function externalPut( url, data, options, callback ) {
            options = options || {};

            const
                urlMsg = options.DC_doNotLogReason ? "[url hidden, doNotLogReason = " + options.DC_doNotLogReason + "]" : url;

            options.json = true;

            if( !options.binary ) {
                data = cleanObject( data );
            }

            let
                err,
                httpConfig,
                friendsHeader,
                oauthToken;

            // --------------------------------------- 1. Get the Http configuration with proxy ------------------------------------
            [err, httpConfig] = await formatPromiseResult( myHttps.getHttpsConfig() );

            if( err ) {
                Y.log( `externalPut: Error in 'getHttpsConfig()'. Trace: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            // --------------------------------------------------------- 1. END ----------------------------------------------------


            // -------- 2. If options.friend is set then check if Oauth token can be fetched for this request and server type ------
            if(options.friend) {
                [err, oauthToken] = await formatPromiseResult( myHttps.checkAndGetTokenFromDcprc(url, httpConfig) );

                if( err ) {
                    Y.log(`externalPut: Error in checkAndGetTokenFromDcprc. Trace: ${err.stack || err}`, "error", NAME);
                    return callback(err);
                }

                if( oauthToken ) {
                    options.headers = {
                        ...(options.headers || {}),
                        'X-DC-Server': options.serverType || Y.doccirrus.auth.getServerType(),
                        'X-DC-Oauth': oauthToken
                    };
                }
            }
            // ------------------------------------------------ 2. END ------------------------------------------------------------


            // ------------------ 3. If Oauth token is not found then go ahead with friends header approach -----------------------
            if( !oauthToken ) {
                [err, friendsHeader] = await formatPromiseResult( Y.doccirrus.auth.setFriendHeader( url, 'PUT', options, data ) );

                if( err ) {
                    Y.log(`externalPut: Error in auth.setFriendHeader. Trace: ${err.stack || err}`, "error", NAME);
                    return callback(err);
                }

                Y.log( `externalPut: Utils: Sending to ${urlMsg} via method=put`, 'debug', NAME );
                options.headers = friendsHeader;
            }
            // ------------------------------------------------ 3. END ------------------------------------------------------------

            needle.put(
                url,
                data,
                {...httpConfig, ...needleTimeoutOpts, ...options},
                getExternalResponseHandler( {
                    description: 'externalPut',
                    url,
                    errDataCallback: options.errDataCallback
                }, callback )
            );
        };

        /**
         * Wrapper for needle. See comment for externalGet
         * @param {String} url
         * @param {Object} data
         * @param {Object}  options friend headers and other needle options
         * @param {Object}  [options.errDataCallback] if set callback will be called with 2 arguments: err, data.
         * @param {Function} callback
         */
        DCHttps.prototype.externalDelete = async function externalDelete( url, data, options, callback ) {
            options = options || {};

            const
                urlMsg = options.DC_doNotLogReason ? "[url hidden, doNotLogReason = " + options.DC_doNotLogReason + "]" : url;

            if( !options.binary ) {
                data = cleanObject( data );
            }

            let
                err,
                httpConfig,
                friendsHeader,
                oauthToken;

            // --------------------------------------- 1. Get the Http configuration with proxy ------------------------------------
            [err, httpConfig] = await formatPromiseResult( myHttps.getHttpsConfig() );

            if( err ) {
                Y.log( `externalDelete: Error in 'getHttpsConfig()'. Trace: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            // --------------------------------------------------------- 1. END ----------------------------------------------------


            // -------- 2. If options.friend is set then check if Oauth token can be fetched for this request and server type ------
            if(options.friend) {
                [err, oauthToken] = await formatPromiseResult( myHttps.checkAndGetTokenFromDcprc(url, httpConfig) );

                if( err ) {
                    Y.log(`externalDelete: Error in checkAndGetTokenFromDcprc. Trace: ${err.stack || err}`, "error", NAME);
                    return callback(err);
                }

                if( oauthToken ) {
                    options.headers = {
                        ...(options.headers || {}),
                        'X-DC-Server': options.serverType || Y.doccirrus.auth.getServerType(),
                        'X-DC-Oauth': oauthToken
                    };
                }
            }
            // ------------------------------------------------ 2. END ------------------------------------------------------------


            // ------------------ 3. If Oauth token is not found then go ahead with friends header approach -----------------------
            if( !oauthToken ) {
                [err, friendsHeader] = await formatPromiseResult( Y.doccirrus.auth.setFriendHeader( url, 'DELETE', options, data ) );

                if( err ) {
                    Y.log(`externalDelete: Error in auth.setFriendHeader. Trace: ${err.stack || err}`, "error", NAME);
                    return callback(err);
                }

                Y.log( `externalDelete: Utils: Sending to ${urlMsg} via method=delete`, 'debug', NAME );
                options.headers = friendsHeader;
            }
            // ------------------------------------------------ 3. END ------------------------------------------------------------

            needle.delete(
                url,
                data,
                {...httpConfig, ...needleTimeoutOpts, ...options},
                getExternalResponseHandler( {
                    description: 'externalDelete',
                    url,
                    errDataCallback: options.errDataCallback
                }, callback )
            );
        };

        /**
         * calls one of external methods (POST,PUT,GET,DELETE)
         * @method externalApiCall
         * @param {Object} params
         * @param {String} params.method
         * @param {String} params.model
         * @param {String} [params.action]
         * @param {String} params.host
         * @param {Object} [params.options]
         * @param {Object} [params.data]
         * @param {Object} [params.query]
         * @param {Function} callback
         * @for Y.doccirrus.https
         */
        DCHttps.prototype.externalApiCall = function externalGet( params, callback ) {
            const
                { method = 'GET', model, action, options = {}, data = {}, host, query } = params;
            let
                url = `${host}/1/${model}`;
            if( action ) {
                url += `/:${action}`;
            }
            if( query ){
                url += Object.keys(query).reduce((str, key)=>{
                    const
                        value = query[key];
                    str += `/${key}/${value}`;
                    return str;
                }, '');
            }
            switch( method.toUpperCase() ) {
                case 'GET':
                    Y.doccirrus.https.externalGet( url, options, callback );
                    break;
                case 'POST':
                    Y.doccirrus.https.externalPost( url, data, options, callback );
                    break;
                case 'PUT':
                    Y.doccirrus.https.externalPut( url, data, options, callback );
                    break;
                case 'DELETE':
                    Y.doccirrus.https.externalDelete( url, data, options, callback );
                    break;
            }

        };
        /**
         * Tells the caller if the https service is configured.
         *
         * You can use this service unconfigured, but it may fail with
         * HTTPS calls with untrusted cacerts.
         *
         * @returns {boolean}
         */
        DCHttps.prototype.isReady = function isReady() {
            return ok;
        };

        DCHttps.prototype.sendHTTPS = function( message ) {
            Y.log( 'sending HTTPS message: ' + JSON.stringify( message ), 'debug', NAME );

            var myMessage = { // shrink down to necessary data
                content: message.content,
                practiceId: message.practiceId || '',
                publicKey: message.publicKey || '',
                patientId: message.patientId || ''
            };

            myHttps.externalPost( message.target, myMessage, Y.doccirrus.auth.setInternalAccessOptions(),
                function( err, response ) {
                    if( err ) {
                        Y.log( 'Error in sendHTTPS: ' + JSON.stringify( err ), 'error', NAME );
                    } else {
                        Y.log( 'HTTPS message sent successfully, possible response: ' + Y.doccirrus.utils.safeStringify( response && response.body, true ), 'info', NAME );
                    }
                }
            );
        };

        DCHttps.prototype.handlerBodyResponse = function handlerBodyResponse( param, callback ) {
            let
                { error, body } = param,
                hasDCError = body && body.meta && body.meta.errors && body.meta.errors.length;
            if( error ) {
                return callback( error );
            }
            if( hasDCError ) {
                return callback( new Y.doccirrus.commonerrors.DCError( null, body.meta.errors[ 0 ] ) );
            }
            callback( null, body && body.data );
        };

        /**
         * @method PUBLIC
         *
         * This method verifies public certificate of DCPRC against the CA.
         * Should to be called only by datensaafe which have "m2m-client.json" file in
         * base directory of project
         *
         * This method does below:
         * 1] Write the x509 'publicCertificate' string to a temporary file
         * 2] Verifies 'publicCertificate' against CA's at path "m2mCleintJson.serverCAsPath" using openssl command using exec
         * 3] If the above step is not satisfied then this method throws appropriate error else returns undefined
         *
         * @param {Object} args
         * @param {String} args.publicCertificate  The DCPRC public certificate to verify
         * @returns {Promise<void>}
         */
        DCHttps.prototype.verifyDcprcPublicCertificate = async function( args ) {
            const
                {publicCertificate} = args,
                pubCertTmpFilePath = `${myHttps.getCertificateTmpDir()}${new ObjectID()}.crt`,
                execOptions = {
                    cwd: process.cwd(),
                    detached: false,
                    shell: true
                };

            let
                err,
                stdOut,
                stdErr,
                openSslCommand;

            Y.log(`Entering Y.doccirrus.https.verifyDcprcPublicCertificate`, "info", NAME);

            // ------------------------------------------- 1. Input validation ----------------------------------------------------
            if( !publicCertificate ) {
                throw new Error(`Missing 'publicCertificate' of DCPRC`);
            }

            if( typeof publicCertificate !== "string" ) {
                throw new Error(`'publicCertificate' of DCPRC must be of type string`);
            }
            // --------------------------------------------------- 1. END ---------------------------------------------------------


            // ------------------------------------------ 2. check and verify 'm2mClientJson' ------------------------------------------------------
            if( !m2mClientJson ) {
                Y.log(`verifyDcprcPublicCertificate: Expected 'm2m-client.json' file not found in project base directory. Cannot proceed...`, "error", NAME);
                throw new Error(`Expected 'm2m-client.json' file not found in project base directory`);
            }

            if( !m2mClientJson.serverCAsPath ) {
                Y.log(`verifyDcprcPublicCertificate: Missing 'serverCAsPath' from 'm2m-client.json'`, "error", NAME);
                throw new Error(`Missing 'serverCAsPath' from 'm2m-client.json'`);
            }
            // ------------------------------------------------------ 2. END ------------------------------------------------------------------------


            // -------------------------------- 3. Check and create 'certificateTmpDir' if missing ----------------------------------------------------
            if( !myHttps.isReady() ) {
                try{
                    mkdirIfMissing( myHttps.getCertificateTmpDir() );
                    setReady(true);  // Just mark ready so that next time "myHttps.isReady()" will be true
                } catch(e) {
                    Y.log( `verifyDcprcPublicCertificate: Failed to create certificateTmpDir at path: ${myHttps.getCertificateTmpDir()}. Trace: ${e.stack || e}`, 'error', NAME );
                    throw new Error(`Failed to create certificateTmpDir at path: ${myHttps.getCertificateTmpDir()}`);
                }
            }
            // ------------------------------------------- 3. END -------------------------------------------------------------------------------------


            // --------------------------------------------- 4. Write public certificate to 'pubCertTmpFilePath' ---------------------------------------
            [err] =  await formatPromiseResult( writeFileProm( pubCertTmpFilePath, publicCertificate ) );

            if( err ) {
                Y.log(`verifyDcprcPublicCertificate: Error while writing publicCertificate to temp path: ${pubCertTmpFilePath}. Trace: ${err.stack || err}`, "error", NAME);
                throw new Error(`Error while writing publicCertificate to temp path: ${pubCertTmpFilePath}. Trace: ${err.message || err}`);
            }
            // ------------------------------------------------------------------- 4. END ---------------------------------------------------------------


            // --------------------------------- 5. Verify publicCertificate against only CA using openssl -------------------------------------------
            openSslCommand = openSslCmdTemplate.replace( '$CA_PATH', m2mClientJson.serverCAsPath ).replace( '$PUB_CERT_PATH', pubCertTmpFilePath ).replace( '-crl_check', '' );

            Y.log(`verifyDcprcPublicCertificate: Executing command = '${openSslCommand}' `, "info", NAME);

            [err, {stdErr, stdOut} = {}] = await formatPromiseResult(
                                                    new Promise( (resolve, reject) => {
                                                        exec( openSslCommand, execOptions, ( execErr, stdOut, stdErr ) => {
                                                            if( execErr ) {
                                                                reject( execErr );
                                                            } else {
                                                                resolve({stdOut, stdErr});
                                                            }
                                                        } );
                                                    } )
                                                  );

            if( err ) {
                Y.log(`verifyDcprcPublicCertificate: Public certificate at path = '${pubCertTmpFilePath}' failed to verify. Trace: ${err}`, "warn", NAME);
                Y.log(`verifyDcprcPublicCertificate: Verification of certificate at = ${pubCertTmpFilePath} stdOut = ${stdOut}`, "warn", NAME);
                Y.log(`verifyDcprcPublicCertificate: Verification of certificate at = ${pubCertTmpFilePath} stdErr = ${stdErr}`, "warn", NAME);

                await formatPromiseResult( deleteFile(pubCertTmpFilePath, 'verifyDcprcPublicCertificate') );
                throw new Error(`The provided DCPRC public certificate is invalid.`);
            } else {
                Y.log(`verifyDcprcPublicCertificate: Public certificate at path = '${pubCertTmpFilePath}' is valid. stdOut = ${stdOut}`, "info", NAME);
            }
            // --------------------------------------------------------- 5. END -------------------------------------------------------------------------


            // -------------------------------------- 6. Delete the public certificate at temp path 'pubCertTmpFilePath' --------------------------------
            await formatPromiseResult( deleteFile(pubCertTmpFilePath, 'verifyDcprcPublicCertificate') );
            // --------------------------------------------------------------- 6. END -------------------------------------------------------------------

            Y.log(`Exiting Y.doccirrus.https.verifyDcprcPublicCertificate`, "info", NAME);
        };

        /**
         * @method PUBLIC
         *
         * NOTE: This method is called by DCPRCS server only
         *
         * This method does below:
         * 1] Write the x509 'publicCertificate' string to a temporary file
         * 2] Parses 'publicCertificate' written to a temporary file using x509 module
         * 3] Ensures that the commonName inside the publicCertificate matches systemId provided to this method. Else throws error
         * 4] Verifies 'publicCertificate' against CA's and CRL's at path "m2mServerJson.clientCAsPath" using openssl command using exec
         * 5] If any of the above step is not satisfied then this method throws appropriate error else returns undefined
         *
         * @param {Object} args
         * @param {String} args.publicCertificate  The public certificate to parse, validate and verify
         * @param {String} args.systemId  This is the systemId of the datensafe in DCPRC database.
         *                                This needs to match the public certificate commonName
         * @returns {Promise<void>}
         */
        DCHttps.prototype.verifyPrcPublicCertificate = async function( args ) {
            const
                {publicCertificate, systemId} = args,
                pubCertTmpFilePath = `${myHttps.getCertificateTmpDir()}${new ObjectID()}.crt`,
                execOptions = {
                    cwd: process.cwd(),
                    detached: false,
                    shell: true
                };

            let
                err,
                certificateObj,
                stdOut,
                stdErr,
                openSslCommand;

            Y.log( `Entering Y.doccirrus.https.verifyPrcPublicCertificate`, "info", NAME );

            // ------------------------------------------- 1. Input validation ----------------------------------------------------
            if( !publicCertificate ) {
                throw new Error( `Missing 'publicCertificate'` );
            }

            if( typeof publicCertificate !== "string" ) {
                throw new Error( `'publicCertificate' must be of type string` );
            }

            if( !systemId || typeof systemId !== "string" ) {
                throw new Error( `Missing/Invalid 'systemId'` );
            }
            // --------------------------------------------------- 1. END ---------------------------------------------------------

            // ------------------------------------------ 2. check and verify 'm2mServerJson' ------------------------------------------------------
            if( !m2mServerJson ) {
                Y.log( `verifyPrcPublicCertificate: Expected 'm2m-server.json' file not found in project base directory. Cannot proceed`, "error", NAME );
                throw new Error( `Expected 'm2m-server.json' file not found in project base directory` );
            }

            if( !m2mServerJson.clientCAsPath ) {
                Y.log( `verifyPrcPublicCertificate: Missing 'clientCAsPath' from 'm2m-server.json'`, "error", NAME );
                throw new Error( `Missing 'clientCAsPath' from 'm2m-server.json'` );
            }
            // ------------------------------------------------------ 2. END ------------------------------------------------------------------------

            // -------------------------------- 3. Check and create 'certificateTmpDir' if missing ----------------------------------------------------
            if( !myHttps.isReady() ) {
                try {
                    mkdirIfMissing( myHttps.getCertificateTmpDir() );
                    setReady( true );  // Just mark ready so that next time "myHttps.isReady()" will be true
                } catch( e ) {
                    Y.log( `verifyPrcPublicCertificate: Failed to create certificateTmpDir at path: ${myHttps.getCertificateTmpDir()}. Trace: ${e.stack || e}`, 'error', NAME );
                    throw new Error( `Failed to create certificateTmpDir at path: ${myHttps.getCertificateTmpDir()}` );
                }
            }
            // ------------------------------------------- 3. END -------------------------------------------------------------------------------------

            // --------------------------------------------- 4. Write public certificate to 'pubCertTmpFilePath' ---------------------------------------
            [err] = await formatPromiseResult( writeFileProm( pubCertTmpFilePath, publicCertificate ) );

            if( err ) {
                Y.log( `verifyPrcPublicCertificate: Error while writing publicCertificate to temp path: ${pubCertTmpFilePath}. Trace: ${err.stack || err}`, "error", NAME );
                throw new Error( `Error while writing publicCertificate to temp path: ${pubCertTmpFilePath}. Trace: ${err.message || err}` );
            }
            // ------------------------------------------------------------------- 4. END ---------------------------------------------------------------

            // ------------------- 5. Parse the public certificate and check if the common name inside the certificate === systemId -----------------
            try {
                // Not sure whether this method can throw an exception but still wrapping it under try/catch for precise error handling
                certificateObj = x509.parseCert( pubCertTmpFilePath );
            } catch( e ) {
                Y.log( `verifyPrcPublicCertificate: Error while parsing certificate using 'x509' library. Trace: ${e.stack || e}`, "warn", NAME );

                await formatPromiseResult( deleteFile( pubCertTmpFilePath, 'verifyPrcPublicCertificate' ) );
                throw new Error( `Error parsing certificate using x509 module` );
            }

            if( !certificateObj ) {
                // Should never happen but still keeping check
                await formatPromiseResult( deleteFile( pubCertTmpFilePath, 'verifyPrcPublicCertificate' ) );
                throw new Error( `Got empty object on parsing certificate using x509 module` );
            }

            if( !certificateObj.subject ) {
                // Not sure if this can happen but still keeping this check
                await formatPromiseResult( deleteFile( pubCertTmpFilePath, 'verifyPrcPublicCertificate' ) );
                throw new Error( `Parsed certificate does not have subject` );
            }

            if( typeof certificateObj.subject.commonName === 'string' && typeof systemId === 'string' ) { // both should be strings
                if( certificateObj.subject.commonName.toUpperCase() !== systemId.toUpperCase() ) {
                    Y.log( `verifyPrcPublicCertificate: certificateObj.subject.commonName = ${certificateObj.subject.commonName} did not match systemId = ${systemId}. Rejecting...`, "warn", NAME );

                    await formatPromiseResult( deleteFile( pubCertTmpFilePath, 'verifyPrcPublicCertificate' ) );
                    throw new Error( `certificateObj.subject.commonName = ${certificateObj.subject.commonName} did not match systemId = ${systemId}` );
                }
            } else {
                Y.log( `Cannot compare certs CNAMES. INVALID certificateObj.subject.commonName = ${certificateObj.subject.commonName} or systemId = ${systemId}`, 'warn', NAME );
                await formatPromiseResult( deleteFile( pubCertTmpFilePath, 'verifyPrcPublicCertificate' ) );
                throw new Error( `Cannot compare certs CNAMES. INVALID certificateObj.subject.commonName = ${certificateObj.subject.commonName} or systemId = ${systemId}` );
            }
            // ------------------------------------------------------------- 5. END ------------------------------------------------------------------


            // --------------------------------- 6. Verify publicCertificate against CA and CRL using openssl -------------------------------------------
            openSslCommand = openSslCmdTemplate.replace( '$CA_PATH', m2mServerJson.clientCAsPath ).replace( '$PUB_CERT_PATH', pubCertTmpFilePath );

            Y.log(`verifyPrcPublicCertificate: Executing command = '${openSslCommand}' `, "info", NAME);

            [err, {stdErr, stdOut} = {}] = await formatPromiseResult(
                                                    new Promise( (resolve, reject) => {
                                                        exec( openSslCommand, execOptions, ( execErr, stdOut, stdErr ) => {
                                                            if( execErr ) {
                                                                reject( execErr );
                                                            } else {
                                                                resolve({stdOut, stdErr});
                                                            }
                                                        } );
                                                    } )
                                                 );

            if( err ) {
                Y.log(`verifyPrcPublicCertificate: Public certificate at path = '${pubCertTmpFilePath}' failed to verify. Trace: ${err}`, "warn", NAME);
                Y.log(`verifyPrcPublicCertificate: Verification of certificate at = ${pubCertTmpFilePath} stdOut = ${stdOut}`, "warn", NAME);
                Y.log(`verifyPrcPublicCertificate: Verification of certificate at = ${pubCertTmpFilePath} stdErr = ${stdErr}`, "warn", NAME);

                await formatPromiseResult( deleteFile(pubCertTmpFilePath, 'verifyPrcPublicCertificate') );
                throw new Error(`The provided public certificate is invalid.`);
            } else {
                Y.log(`verifyPrcPublicCertificate: Public certificate at path = '${pubCertTmpFilePath}' is valid. stdOut = ${stdOut}`, "info", NAME);
            }
            // --------------------------------------------------------- 6. END -------------------------------------------------------------------------


            // -------------------------------------- 7. Delete the public certificate at temp path 'pubCertTmpFilePath' --------------------------------
            await formatPromiseResult( deleteFile(pubCertTmpFilePath, 'verifyPrcPublicCertificate') );
            // --------------------------------------------------------------- 7. END -------------------------------------------------------------------

            Y.log(`Exiting Y.doccirrus.https.verifyPrcPublicCertificate`, "info", NAME);
        };

        /**
         * @method PUBLIC
         *
         * This method verifies whether provided 'signature' is valid or not
         * by using provided public certificate.
         *
         * @param {String} input  The input which needs to be used to verify signature
         * @param {String} pubCertStr  The public certificate to use for verifying 'signature'
         * @param {String} signature  The signature to verify encoded in 'base64'
         * @returns {boolean}
         */
        DCHttps.prototype.verifySignature = function( input, pubCertStr, signature ) {
            const
                verify = crypto.createVerify('SHA256');

            verify.update(input);
            verify.end();

            return verify.verify(pubCertStr, signature, 'base64');
        };

        /**
         * @method PUBLIC
         *
         * This methods should only be executed on DCPRC. It generates 'base64' encoded signature of the input string
         * and returns the signature and public certificate of DCPRC.
         *
         * @param {String} inputStr  Input string which needs to be signed by DCPRC
         * @returns {Promise<{dcprcSignature: string, publicCertificate: string}>}
         */
        DCHttps.prototype.getDcprcSignatureAndPublicKey = async function( inputStr ) {
            let
                err,
                privateKeyBuffer,
                publicCertificateBuffer,
                signatureObj,
                dcprcSignature;

            Y.log(`Entering Y.doccirrus.https.getDcprcSignatureAndPublicKey`, "info", NAME);

            // --------------------------- 1. Verify input -----------------------
            if( !inputStr || typeof inputStr !== "string" ) {
                throw new Error(`Missing/invalid inputStr`);
            }
            // --------------------------- 1. END --------------------------------


            // ------------------------------------------ 2. check and verify 'm2mServerJson' ------------------------------------------------------
            if( !m2mServerJson ) {
                Y.log(`getDcprcSignatureAndPublicKey: Expected 'm2m-server.json' file not found in project base directory. Cannot proceed`, "error", NAME);
                throw new Error(`Expected 'm2m-server.json' file not found in project base directory`);
            }

            if( !m2mServerJson.serverKeyPath ) {
                Y.log(`getDcprcSignatureAndPublicKey: Missing 'serverKeyPath' from 'm2m-server.json'`, "error", NAME);
                throw new Error(`Missing 'serverKeyPath' from 'm2m-server.json'`);
            }

            if( !m2mServerJson.serverCrtPath ) {
                Y.log(`getDcprcSignatureAndPublicKey: Missing 'serverCrtPath' from 'm2m-server.json'`, "error", NAME);
                throw new Error(`Missing 'serverCrtPath' from 'm2m-server.json'`);
            }
            // ------------------------------------------------------ 2. END ------------------------------------------------------------------------


            // ------------------------------ 3. Read the private key of DCPRC ----------------------------------------------------------
            [err, privateKeyBuffer] = await formatPromiseResult( readFileProm(m2mServerJson.serverKeyPath) );

            if( err ) {
                Y.log(`getDcprcSignatureAndPublicKey: Error reading private key from path: ${m2mServerJson.serverKeyPath}. Trace: ${err.stack || err}`, "error", NAME);
                throw new Error(`Error reading private key of DCPRC for signing token`);
            }

            if( !privateKeyBuffer ) {
                // Should never happen but still keep a check for extra safety
                Y.log(`getDcprcSignatureAndPublicKey: Empty file response after reading private key from path: ${m2mServerJson.serverKeyPath}`, "error", NAME);
                throw new Error(`Empty file response on reading DCPRC private key`);
            }
            // -------------------------------------------- 3. END ------------------------------------------------------------------


            // -------------------------------- 4. Read the public certificate --------------------------------------------------------
            [err, publicCertificateBuffer] = await formatPromiseResult( readFileProm(m2mServerJson.serverCrtPath) );

            if( err ) {
                Y.log(`getDcprcSignatureAndPublicKey: Error reading public certificate from path: ${m2mServerJson.serverCrtPath}. Trace: ${err.stack || err}`, "error", NAME);
                throw new Error(`Error reading public certificate of DCPRC`);
            }

            if( !publicCertificateBuffer ) {
                // Should never happen but still keep a check for extra safety
                Y.log(`getDcprcSignatureAndPublicKey: Empty file response after reading public certificate from path: ${m2mServerJson.serverCrtPath}`, "error", NAME);
                throw new Error(`Empty file response on reading public certificate of DCPRC`);
            }
            // ---------------------------------------------- 4. END ------------------------------------------------------------------


            // ------------------------------ 5. Generate the secret key ----------------------------------------------------
            signatureObj = crypto.createSign( 'SHA256' );
            signatureObj.update( inputStr );
            signatureObj.end();

            dcprcSignature = signatureObj.sign( privateKeyBuffer, 'base64' );
            // -------------------------------------- 5. END ----------------------------------------------------------------

            Y.log(`Exiting Y.doccirrus.https.getDcprcSignatureAndPublicKey`, "info", NAME);

            return {
                dcprcSignature,
                publicCertificate: publicCertificateBuffer.toString() // Public certificate is needed to verify DCPRC signature on datensafe
            };
        };

        /**
         * @method PUBLIC
         *
         * This method returns http.Agent which can be used with node's inbuilt http/https modules.
         * For more details see: https://github.com/TooTallNate/node-https-proxy-agent
         *
         * @param proxyUrl
         * @returns {HttpsProxyAgent}
         */
        DCHttps.prototype.getProxyAgent = function( proxyUrl ) {
            if( !proxyUrl || typeof proxyUrl !== "string" ) {
                throw new Error(`Missing/invalid proxyUrl parameter`);
            }

            return new HttpsProxyAgent(proxyUrl);
        };

        /**
         * @method PUBLIC
         *
         * This method returns the certificate tmp directory path which the DCPRC (as of now) uses
         * to write the received datensafe certificates so that it can verify it using the certificate path
         *
         * @returns {string}
         */
        DCHttps.prototype.getCertificateTmpDir = function() {
            return certificateTmpDir;
        };

        // ---------------- Getter/Setter methods for m2mClientJson/m2mServerJson. NOTE: ONLY to be used for automated tests ---------------------
        /**
         * @method PUBLIC
         *
         * Getter method for "m2mServerJson"
         *
         * @returns {Object}
         */
        DCHttps.prototype.getM2mServerJson = function() {
            return {...m2mServerJson};
        };

        /**
         * @method PUBLIC
         *
         * Setter method for "m2mServerJson"
         *
         * @returns {undefined}
         */
        DCHttps.prototype.setM2mServerJson = function( config ) {
            m2mServerJson = config;
        };

        /**
         * @method PUBLIC
         *
         * Getter method for "m2mClientJson"
         *
         * @returns {Object}
         */
        DCHttps.prototype.getM2mClientJson = function() {
            return {...m2mClientJson};
        };

        /**
         * @method PUBLIC
         *
         * Setter method for "m2mClientJson"
         *
         * @returns {undefined}
         */
        DCHttps.prototype.setM2mClientJson = function( config ) {
            m2mClientJson = config;
        };

        /**
         * @method PUBLIC
         *
         * builds get request url from base url and parameters
         * @param {String} baseUrl
         * @param {Array} parameters        Array of objects {name {String}, value: {String|Number|Boolean}}
         *
         * @returns {String}
         */
        DCHttps.prototype.buildGetRequestUrl = function( {baseUrl, parameters = []} ) {
            const existingParameters = parameters.filter( parameter => parameter.value );
            let parametersUrl = '';

            if( existingParameters.length ) {
                parametersUrl = existingParameters
                    .reduce( ( url, parameter ) => `${url}${parameter.name}=${parameter.value}&`, '?' )
                    .slice( 0, -1 );       // remove last '&' symbol
            }

            return `${baseUrl}${parametersUrl}`;
        };
        // ------------------------------------------------- (getter/setter) END --------------------------------------------------------------

        myHttps = new DCHttps();

        Y.namespace( 'doccirrus' ).https = myHttps;

    },
    '0.0.1', { requires: [ 'dccommonerrors', 'dcutils', 'dcipc' ] }
);