/**
 * User: pi
 * Date: 06/06/17  09:05
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
'use strict';

const
    url = require('url'),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    proxy = require( 'http-proxy-middleware' );

/**
 * @private
 *
 * Converts JSON object to a string of key valye pairs separated by & as below:
 * Converts: {key:"value", newKey:"value"}
 * to
 * "key=value&newKey=value"
 * So that it can be submitted as a part of proxy POST for form data request
 *
 * @param {Object} json - JSON object to convert to form data string
 * @returns {string|*}
 */
function getFormDataStringFromJson( json ) {
    if( json && typeof json === "object" ) {
        return Object.entries(json).map( ([key, value]) => `${key}=${encodeURIComponent(value)}` ).join("&");
    }
    return json;
}

/**
 * @private
 *
 * This method adds "insuiteUserId" query param to "path" and returns
 * the generated URL.
 *
 * @param {string} path - req.url
 * @param {string} employeeId - employee _id
 * @returns {string} - ex: /my/url?insuiteUserId=employeeId
 */
function appendLoggedInEmployeeId( path, employeeId ) {
    const
        parsedPathObj = url.parse(path),
        searchParam = new URLSearchParams(parsedPathObj.search);

    searchParam.append("insuiteUserId", employeeId);
    parsedPathObj.search = searchParam.toString();
    return url.format(parsedPathObj);
}

module.exports = function( Y, app, server ) {
    const
        route = 'sol',
        pathExp = new RegExp( `\/${route}\/([^\/]+)` );

    /**
     * Getting app data and check if the app has access (has port)
     * @param {String} appName
     */
    function getAppData( appName ) {
        return new Promise( ( resolve, reject ) => {
            if( !appName ) {
                return reject( new Y.doccirrus.commonerrors.DCError( 400, { message: 'missing app name' } ) );
            }
            Y.doccirrus.api.appreg.getPopulated( {
                query: {
                    appName
                },
                callback( err, results ) {
                    const
                        appReg = results && results[ 0 ],
                        appPort = appReg && appReg.appCurrentPort;
                    if( err ) {
                        return reject( err );
                    }
                    if( !appPort ) {
                        return reject( new Y.doccirrus.commonerrors.DCError( 400, { message: 'App does not have access' } ) );
                    }
                    resolve( appReg );
                }
            } );
        } );
    }

    /**
     * Retrieves appReg from cache, else from api.appreg.getPopulated via getAppData
     *  in the latter, it will save the necessary appReg data in the cache
     * @param {String} appName
     * @returns {Promise<Array>}
     */
    async function getAppReg( appName ) {
        if( !appName ) {
            return [new Y.doccirrus.commonerrors.DCError( 400, {message: 'missing app name'} )];
        }

        let error, appReg;

        [error, appReg] = await formatPromiseResult( Y.doccirrus.api.appreg.getAppRegDataFromCache( appName ) );

        if( error ) {
            Y.log( `getAppReg: Error while getting appreg data from cache: ${error.stack || error}` );
        }

        if( !appReg ) {
            [error, appReg] = await formatPromiseResult( getAppData( appName ) );

            if( error ) {
                Y.log( `getAppReg: Error while getting appreg data from db: ${error.stack || error}` );
                throw new Error( `Failed to get appreg data from db: ${error}` );
            }

            if( appReg ) {
                [error] = await formatPromiseResult( Y.doccirrus.api.appreg.saveAppRegDataToCache( appReg ) );

                if( error ) {
                    Y.log( `getAppReg: Error while saving appreg data to cache: ${error}` );
                }
            }
        }

        return [null, appReg || {}];
    }

    /**
     * checks jwt and date of the request
     * @param {Object} params
     * @param {Object} params.headers request headers
     * @param {String} params.appName
     * @param {String} params.solToken
     * @returns {Promise}
     */
    function checkHeader( params ) {
        const
            { headers, appName, solToken } = params,
            sdk = require( 'dc-sdk-communications' ),
            token = headers[ 'x-dc-friend' ],
            date = headers[ 'x-dc-date' ];
        return sdk.auth.signObject( {
            objectToSign: {
                date,
                name: appName
            },
            secretKey: solToken
        } )
            .then( _token => {
                return Y.doccirrus.auth.doTokenCheck( {
                    token,
                    generatedToken: _token,
                    date
                } );
            } );
    }

    /**
     *
     * This method handles proxy failure scenario.
     * @see https://github.com/chimurai/http-proxy-middleware#options
     *
     * @param {Object} err - Error object denoting why proxying to proxyUrl failed
     * @param {Object} req - Express req object
     * @param {Object} res - Express res object
     * @param {string} proxyUrl - The URL to proxy request to which failed
     */
    function handleProxyError(err, req, res, proxyUrl) {
        const
            code = err.code;

        if (res.writeHead && !res.headersSent) {
            if (/HPE_INVALID/.test(code)) {
                res.writeHead(502);
            } else {
                switch(code) {
                    case 'ECONNRESET':
                    case 'ENOTFOUND':
                    case 'ECONNREFUSED':
                        res.writeHead(504);
                        break;
                    default: res.writeHead(500);
                }
            }
        }

        res.end(`Error occured while trying to proxy to: ${proxyUrl}`);
    }

    function removeTrailingSlash( path ) {
        return path.match( /\/.*\/$/ ) && path.replace( /\/$/, '' ) || path;
    }

    /**
     * Returns appReg from database by applying a targetUrl match to req.path
     *
     * @param {String} appName
     * @returns {Promise<Array>}
     * @private
     */
    async function getAppRegFromDb( appName ) {
        let [err, appReg] = await formatPromiseResult( Y.doccirrus.api.appreg.get( {
            query: {
                appName,
                'webHooksConfiguration.0': {$exists: true}
            }
        } ) );
        if( err ) {
            Y.log( `Error while checking db in isWebHookRegistered: ${err}`, 'error', 'dcapp-proxy' );
            throw err;
        }
        return appReg;
    }

    /**
     * Compares the registered endpoints to the incoming one
     * If the Sol registered the endpoints with the extra
     *  '/3/webhook/:<appname>' extension, this will be removed
     * @param {Array} webHooksConfiguration
     * @param {String} reqPath
     * @param {RegExp} pathExcessRegEx
     * @returns {Boolean}
     * @private
     */
    function isPathRegistered( args ) {
        const {webHooksConfiguration, reqPath, pathExcessRegEx} = args;
        let targetUrls = webHooksConfiguration.map( ( endpointConfig ) => {
            return [endpointConfig.targetUrl, endpointConfig.targetUrl.replace( pathExcessRegEx, '' )];
        } );
        targetUrls = targetUrls.reduce( ( acc, val ) => acc.concat( val ), [] );
        return targetUrls.some( ( url ) => reqPath === url );
    }

    /**
     * Checks if the webhook endpoint is registered by the Sol
     * 1. checks Redis cache
     * 2. if information is not in cache, it checks the appreg document in db
     *  2.1. saves webHooksConfiguration to cache for future use
     * @param {String} args.appName
     * @param {Object} args.req
     * @returns {Promise<boolean>}
     */
    async function isWebHookRegistered( args ) {
        const {appName, req} = args;
        const path = req.path && removeTrailingSlash( req.path ) || '';
        const pathExcessRegEx = new RegExp( `/3/webhook/:${appName}` );
        let error, appReg, webHooksConfiguration;

        // actual operations
        [error, webHooksConfiguration] = await formatPromiseResult( Y.doccirrus.api.appreg.getWebHooksConfigFromCache( appName ) );

        if( error ) {
            Y.log( `isWebHookRegistered: Error getting webhooks config from cache: ${error}`, 'error', 'dcapp-proxy' );
        }

        if( !webHooksConfiguration ) {
            Y.log('Did not find webhooks config in cache, trying db...', 'debug', 'dcapp-proxy');

            [error, appReg] = await formatPromiseResult( getAppRegFromDb( appName ) );

            if( error ) {
                Y.log( `isWebHookRegistered: Error getting appreg from db: ${error}`, 'error', 'dcapp-proxy' );
                throw new Error( `Failed to get appreg from db: ${error}` );
            }

            webHooksConfiguration = appReg && appReg.length && appReg[0].webHooksConfiguration;

            Y.log('Caching webhooks config...', 'debug', 'dcapp-proxy');

            [error] = await formatPromiseResult( Y.doccirrus.api.appreg.saveWebHooksConfigToCache( {
                appName,
                webHooksConfiguration
            } ) );

            if( error ) {
                Y.log( `isWebHookRegistered: Error saving webhooks config to cache: ${error}`, 'error', 'dcapp-proxy' );
            }
        }

        if( webHooksConfiguration ) {
            Y.log(`Obtained webhooks config: ${JSON.stringify(webHooksConfiguration)}`, 'debug', 'dcapp-proxy');

            return isPathRegistered( {webHooksConfiguration, reqPath: path, pathExcessRegEx} );
        }

        Y.log('Could not deduce if webhook is registered', 'debug', 'dcapp-proxy');

        return false;
    }

    return {
        initUIProxy() {
            if( Y.doccirrus.auth.isPUC() || Y.doccirrus.auth.isDCPRC() ) {
                return;
            }
            app.use( `/${route}/:appName/`, ( req, res, next ) => {
                getAppData( req.params.appName )
                    .then( ( { appCurrentPort, appHost } ) => {
                        let middlewareProxy;

                        if( appHost ) {
                            middlewareProxy = proxy( `/${route}`, {
                                target: `${appHost}:${appCurrentPort}`,
                                changeOrigin: true,
                                pathRewrite( path ) {
                                    if( req.user && req.user.specifiedBy ) {
                                        return appendLoggedInEmployeeId( path, req.user.specifiedBy );
                                    }

                                    return path;
                                },
                                onError(err, req, res){
                                    handleProxyError( err, req, res, `${appHost}:${appCurrentPort}${req.url}` );
                                }
                            } );
                        } else {
                            middlewareProxy = proxy( `/${route}`, {
                                target: `http://localhost:${appCurrentPort}`,
                                changeOrigin: true,
                                pathRewrite( path ) {
                                    if( req.user && req.user.specifiedBy ) {
                                        return appendLoggedInEmployeeId( path, req.user.specifiedBy );
                                    }

                                    return path;
                                },
                                onError(err, req, res){
                                    handleProxyError( err, req, res, `http://localhost:${appCurrentPort}${req.url}` );
                                }
                            } );
                        }
                        /**
                         * body buffer recreation
                         */
                        if( Object.keys( req.body ).length ) {
                            req.removeAllListeners( 'data' );
                            req.removeAllListeners( 'end' );
                            // need nextTick here!
                            process.nextTick( function() {
                                if( req.body ) {
                                    if( req.headers["content-type"] === "application/x-www-form-urlencoded" ) {
                                        // Emit the data as per "x-www-form-urlencoded" standard
                                        req.emit( 'data', getFormDataStringFromJson( req.body ) );
                                    } else {
                                        req.emit( 'data', JSON.stringify( req.body ) );
                                    }
                                }
                                req.emit( 'end' );
                            } );
                        }

                        middlewareProxy( req, res, next );
                    } )
                    .catch( err => {
                        next( err );
                    } );

            } );
            server.on( 'upgrade', ( req, socket, head ) => {
                if( req && "string" === typeof req.url && pathExp.test( req.url ) ) {
                    const
                        matches = req.url.match( pathExp ),
                        appName = matches && matches[ 1 ];
                    getAppData( appName )
                        .then( ( { appCurrentPort, appHost } ) => {
                            const
                                dcUtil = require( process.cwd() + '/middleware/dc-util.js' ),
                                dcServerMiddleware = dcUtil.getServerMiddleware(),
                                async = require( 'async' );
                            return new Promise( ( resolve, reject ) => {
                                async.series( [
                                    ( next ) => {
                                        const
                                            cookieParser = require( 'cookie-parser' )();
                                        req.isSocketio = true;
                                        cookieParser( req, {}, next );
                                    },
                                    ( next ) => {
                                        const
                                            sessionHandler = require( process.cwd() + '/middleware/expresssession-init' )( Y );
                                        sessionHandler( req, {}, next );
                                    },
                                    ( next ) => {
                                        const
                                            dcSession = dcServerMiddleware.dcsession( Y );
                                        dcSession( req, {}, next );
                                    }
                                ], ( err ) => {
                                    if( err ) {
                                        return reject( err );
                                    }
                                    if( req.user && req.isAuthenticated && req.isAuthenticated() ) {
                                        resolve( {appCurrentPort, appHost} );
                                    } else {
                                        reject( new Y.doccirrus.commonerrors.DCError( 401 ) );
                                    }
                                } );
                            } );
                        } )
                        .then( ({appCurrentPort, appHost}) => {
                            let middlewareProxy;

                            if( appHost ) {
                                middlewareProxy = proxy( `/${route}`, {
                                    target: `${appHost}:${appCurrentPort}`,
                                    changeOrigin: true
                                } );
                            } else {
                                middlewareProxy = proxy( `/${route}`, {
                                    target: `http://localhost:${appCurrentPort}`,
                                    changeOrigin: true
                                } );
                            }

                            middlewareProxy.upgrade( req, socket, head );
                        } )
                        .catch( err => {
                            socket.destroy();
                            Y.log( `Count not upgrade socket connection for ${appName}. Error: ${JSON.stringify( err )}`, 'error', 'dcapp-proxy' );
                        } );
                }
            } );
        },
        initRestProxy() {
            if( Y.doccirrus.auth.isPUC() || Y.doccirrus.auth.isDCPRC() ) {
                return;
            }
            app.use( `/${route}/:appName/_rest_`, ( req, res, next ) => {
                getAppData( req.params.appName )
                    .then( ( { solToken, appCurrentPort, appHost } ) => {
                        Y.log( `Adding Sol REST Proxy at ${appHost} ${appCurrentPort} ${solToken.substring(0,10)}...`, 'info', 'dcapp-proxy' );
                        return checkHeader( {
                            headers: req.headers,
                            appName: req.params.appName,
                            solToken
                        } )
                            .then( () => ({appCurrentPort, appHost}) );
                    } )
                    .then( ({appCurrentPort, appHost}) => {
                        let
                            middlewareProxy;

                        if( appHost ) {
                            middlewareProxy = proxy( `/${route}`, {
                                target: `${appHost}:${appCurrentPort}`,
                                changeOrigin: true,
                                pathRewrite( path ) {
                                    if( req.user && req.user.specifiedBy ) {
                                        return appendLoggedInEmployeeId( path, req.user.specifiedBy );
                                    }

                                    return path;
                                }
                            } );
                        } else {
                            middlewareProxy = proxy( `/${route}`, {
                                target: `http://localhost:${appCurrentPort}`,
                                changeOrigin: true,
                                pathRewrite( path ) {
                                    if( req.user && req.user.specifiedBy ) {
                                        return appendLoggedInEmployeeId( path, req.user.specifiedBy );
                                    }

                                    return path;
                                }
                            } );
                        }

                        middlewareProxy( req, res, next );
                    } )
                    .catch( err => {
                        res.status(err.code).send( err.toString() );
                    } );

            } );
        },
        /**
         * Handles the special WebHook endpoint
         * 1. Retrieves SOL PORT and URL from appName to proxy the request to the SOL
         * 2. Responds to request either through the dcLimiter middleware or through the SOL proxy
         */
        initWebHookProxy() {
            if( Y.doccirrus.auth.isPUC() || Y.doccirrus.auth.isDCPRC() ) {
                return;
            }

            /**
             * Express middleware that handles the response if it passes through the rate limiter
             * 1. Retrieves SOL PORT using the SOL appName
             * 2. Creates middleware proxy to SOL
             * @param {Object} req
             * @param {Object} res
             * @param {Function} next
             */
            async function handleWebHookProxying( req, res, next ) {
                try {
                    let [error, {appCurrentPort, appHost} = {}] = await getAppReg( req.params.appName );

                    if( error ){
                        return res.status( error.code || 500 ).send(error.toString());
                    }

                    Y.log( `Executing SOL Webhook Proxy at ${appHost || 'localhost'} ${appCurrentPort}...`, 'info', 'dcapp-proxy' );

                    let middlewareProxy;

                    if( appHost ) {
                        middlewareProxy = proxy( {
                            target: `${appHost}:${appCurrentPort}/webhook`,
                            changeOrigin: true
                        } );
                    } else {
                        middlewareProxy = proxy( {
                            target: `http://localhost:${appCurrentPort}/webhook`,
                            changeOrigin: true
                        } );
                    }

                    return middlewareProxy( req, res, next );
                } catch( error ) {
                    Y.log(`handleWebHookProxying: Uncaught error: ${error}`);
                    return res.status( error.code || 500 ).send( error.toString() );
                }
            }

            /**
             * Express middleware that handles checking whether the incoming request
             * endpoint is registered by SOL in inSuite
             * @param req
             * @param res
             * @param next
             */
            async function checkWebHookRegistration( req, res, next ) {
                const extraColonRegEx = /^\:/;
                let appName = req.params.appName;

                if( extraColonRegEx.test( appName ) ) {
                    appName = appName.replace( extraColonRegEx, '' );
                }

                Y.log( `Checking webhook registration for ${appName}`, 'info', 'dcapp-proxy' );

                let [error, webHookIsRegistered] = await formatPromiseResult( isWebHookRegistered( {appName, req} ) );

                if( error ) {
                    Y.log( `checkWebHookRegistration: Error in isWebHookRegistered: ${error.stack || error}` );
                    return res.status( 500 ).send( `${error}` );
                }

                if( webHookIsRegistered ) {
                    Y.log( `Webhook ${req.path} is registered for ${appName}`, 'info', 'dcapp-proxy' );
                    return next();
                } else {
                    Y.log( `Webhook ${req.path} is NOT registered for ${appName}`, 'info', 'dcapp-proxy' );
                    res.status( 400 ).send( {message:`${req.path} is not registered as a webhook for ${appName}`} );
                }
            }

            app.use( `/3/webhook/:appName`, checkWebHookRegistration, handleWebHookProxying );
        }
    };

};



