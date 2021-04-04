/**
 * User: as
 * Date: 30.05.18  10:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/**
 *
 * Default proxy behaviour handles zip / unzip.
 * Since the default proxy behaviour is insufficient to handle the
 * confluence page re-writing, we are forced to handle the zip/unzipping
 * here too. This complicates the code. Otherwise this is regular proxying.
 *
 * @param {Object} Y YUI object
 * @param {Function} app Express function
 * @param {String} [datensafeProxyUrl] URL of a proxy set on datensafe. If present handbuch proxy will proxy requests to this URL
 */
module.exports = function( Y, app, datensafeProxyUrl ) {
    const NAME = 'dchandbuch';
    const pathRewriteRegExp = new RegExp( 'manual' );
    const HttpsProxyAgent = require('https-proxy-agent');
    const proxy = require( 'http-proxy-middleware' );
    const zlib = require( 'zlib' );
    const isResGzipped = ( res ) => {
        return res.headers[ 'content-encoding' ] === 'gzip';
    };
    const chunkLength = ( chunks ) => {
        return chunks.reduce( function( len, buf ) {
            return len + buf.length;
        }, 0 );
    };
    const zipOrUnzip = ( method ) => {
        return function( rspData, res ) {
            return (isResGzipped( res )) ? zlib[ method ]( rspData ) : rspData;
        };
    };
    const maybeUnzipResponse = zipOrUnzip( 'gunzipSync' );
    const maybeZipResponse = zipOrUnzip( 'gzipSync' );
    const replaceLocationHeader = ( res ) => {
        res.headers.location = res.headers.location.replace( new RegExp( '^/dosearchsite.action', 'gi' ), '/handbook_resource/dosearchsite.action' );
        res.headers.location = res.headers.location.replace( new RegExp( '^/download', 'gi' ), '/handbook_resource/download' );
    };
    const handleProxyResponse = ( params ) => {
        const { proxyRes, res, modifyBody, doNotModifyBody = false } = params;
        const _write = res.write.bind( res );
        const chunks = [];
        let body = "";

        if( proxyRes.statusCode === 302 ) {
            replaceLocationHeader( proxyRes );
        }
        proxyRes.on( 'data', function( data ) {
            chunks.push( data );
        } );
        proxyRes.on( 'end', function() {
            const finalBuffer = Buffer.concat( chunks, chunkLength( chunks ) );
            if( doNotModifyBody ) {
                _write( finalBuffer );
            }
            body = maybeUnzipResponse( finalBuffer, proxyRes ).toString();
            body = modifyBody( body );
            _write( maybeZipResponse( body, proxyRes ) );
        } );
        res.write = function() {
        };
    };

    let
        host = '',
        user = '',
        password = '',
        handbuchConfig = {};

    try {
        const handbuchJSON = require( process.cwd() + '/docs.json' );
        handbuchConfig = handbuchJSON;
        host = handbuchConfig.de.host;
        user = handbuchConfig.de.user;
        password = handbuchConfig.de.password;
    } catch( e ) {
        Y.log( e, 'warn', NAME );
    }
    let proxyConfig = {
        target: `https://${host}`,
        changeOrigin: true,
        auth: user && password ? `${user}:${password}` : undefined,
        secure: false
    };

    /**
     * countryMode is avail only after server is up - therefore we need to reset configs according to countryMode
     */
    const resetConfigs = ( ) => {
       host = handbuchConfig.ch.host;
       user = handbuchConfig.ch.user;
       password = handbuchConfig.ch.password;
       proxyConfig.target = `https://${host}`;
    };

    /**
     * If proxy is set then tweak the proxy configuration to handle proxy details such that
     * the proxy middleware should be able to proxy request to the proxy server which in turn
     * will proxy request to actual server and forwards the response
     *
     * So, in a nutshell, action happens as below:
     *
     * (dc-insuite web UI) --> (dc-insuite server http-proxy-middleware) --> (proxy server) --> (handbuch server)
     */


    if( datensafeProxyUrl ) {
        Y.log(`dchandbuch middleware will proxy requests to detected proxy server URL: ${datensafeProxyUrl}`, "info", NAME);
        proxyConfig.agent = new HttpsProxyAgent(datensafeProxyUrl);
    }

    const middlewareProxy = proxy( {
        ...proxyConfig,
        pathRewrite: ( path ) => {
            return path.replace( pathRewriteRegExp, '' );
        },
        onProxyRes( proxyRes, req, res ) {
            handleProxyResponse( {
                proxyRes,
                res,
                modifyBody( body ) {
                    body = body.replace( new RegExp( 'a href="(?!http|#)', 'gi' ), 'a href="/manual' );
                    body = body.replace( new RegExp( `href="/ch/(?!manual)`, 'gi' ), 'href="/ch/handbook_resource/' );
                    body = body.replace( new RegExp( `href="/de/(?!manual)`, 'gi' ), 'href="/de/handbook_resource/' );
                    body = body.replace( new RegExp( 'action="/dosearchsite.action', 'gi' ), 'action="/handbook_resource/dosearchsite.action' );
                    body = body.replace( new RegExp( 'value="/plugins/', 'gi' ), 'value="/handbook_resource/plugins/' );
                    body = body.replace( new RegExp( `action=".*?${host}/plugins/`, 'gi' ), 'action="/handbook_resource/plugins/' );
                    body = body.replace( new RegExp( 'value="/s/', 'gi' ), 'value="/handbook_resource/s/' );
                    body = body.replace( new RegExp( 'content="/s/', 'gi' ), 'content="/handbook_resource/s/' );
                    body = body.replace( new RegExp( 'src="/(?!handbook_resource)', 'gi' ), 'src="/handbook_resource/' );
                    body = body.replace( new RegExp( 'context="/(?!handbook_resource)', 'gi' ), 'context="/handbook_resource/' );
                    body = body.replace( new RegExp( 'content="/(?!handbook_resource)', 'gi' ), 'content="/handbook_resource/' );
                    body = body.replace( new RegExp( `https://${host}`, 'gi' ), "/handbook_resource" );
                    return body;
                }
            } );
        }
    } );

    const middlewareProxy2 = proxy( {
        ...proxyConfig,
        pathRewrite: ( path ) => {
            return path.replace( new RegExp('/handbook_resource', 'g'), '' );
        },
        onProxyRes( proxyRes, req, res ) {
            let
                doNotModifyBody;

            if( !proxyRes.headers || !proxyRes.headers[ 'content-type' ] ) {
                // Sometimes the 'content-type' header is missing
                doNotModifyBody = true;
            } else {
                doNotModifyBody = !proxyRes.headers[ 'content-type' ].includes( 'text' ) && !proxyRes.headers[ 'content-type' ].includes( 'json' );
            }

            handleProxyResponse( {
                proxyRes,
                res,
                doNotModifyBody,
                modifyBody( body ) {
                    if( proxyRes.headers && proxyRes.headers[ 'content-type' ] === 'application/json' ) {
                        try {
                            const searchRes = JSON.parse( body );
                            if( searchRes.contentNameMatches && searchRes.contentNameMatches.length ) {
                                searchRes.contentNameMatches = searchRes.contentNameMatches.map( match => {
                                    match.forEach( item => {
                                        if( item.href.includes( "/dosearchsite.action" ) ) {
                                            item.href = item.href.replace( "/dosearchsite.action", "/manual/dosearchsite.action" );
                                        } else if( item.href.includes( "/display" ) ) {
                                            item.href = item.href.replace( "/display", "/manual/display" );
                                        } else if( item.href.includes( "/pages" ) ) {
                                            item.href = item.href.replace( "/pages", "/manual/pages" );
                                        }
                                    } );
                                    return match;
                                } );
                            }
                            if( searchRes.resources && searchRes.resources.length ) {
                                searchRes.resources.forEach( item => {
                                    if( item.url ) {
                                        item.url = item.url.replace( new RegExp( '^/s/', 'gi' ), '/handbook_resource/s/' );
                                    }
                                    if( item.resultGlobalContainer && item.resultGlobalContainer.displayUrl ){
                                        item.resultGlobalContainer.displayUrl = item.resultGlobalContainer.displayUrl.replace( new RegExp( '^/display', 'gi' ), '/manual/display' );
                                    }
                                } );
                            }
                            if( searchRes.results && searchRes.results.length ) {
                                searchRes.results.forEach( item => {
                                    if( item.downloadUrl ) {
                                        item.downloadUrl = item.downloadUrl.replace( new RegExp( '^/download/', 'gi' ), '/handbook_resource/download/' );
                                    }
                                    if( item.url ) {
                                        if( item.url.startsWith("/pages/viewpage") ) {
                                            item.url = `/manual${item.url}`;
                                        } else {
                                            item.url = item.url.replace( new RegExp( '^/display', 'gi' ), '/manual/display' );
                                        }
                                    }
                                    if( item.resultGlobalContainer && item.resultGlobalContainer.displayUrl ){
                                        item.resultGlobalContainer.displayUrl = item.resultGlobalContainer.displayUrl.replace( new RegExp( '^/display', 'gi' ), '/manual/display' );
                                    }
                                } );
                            }

                            body = JSON.stringify( searchRes );
                        } catch( e ) {
                            Y.log( `Failed to parse JSON: ${e}`, 'debug', NAME );
                        }
                    } else {
                        /**
                         * As per the minified .js files below chnges are needed to rewrite the URLS to proxy format
                         */
                        body = body.replace( new RegExp( 'url\\(\\/s', 'gi' ), 'url(/handbook_resource/s' );
                        body = body.replace( new RegExp( "url\\('/s/", 'gi' ), "url('/handbook_resource/s/" );
                        body = body.replace( new RegExp( 'url\\("/s/', 'gi' ), 'url("/handbook_resource/s/' );
                        body = body.replace( new RegExp('"\\/plugins/', 'gi'), '"/handbook_resource/plugins/' );
                        /**
                         * This is very important because if there is word "login" in the URL arguments then
                         * mojito is redirecting it to login/homepage. To prevent that we remove a letter which
                         * prevents login from appearing. This does not affect the functionality of this URL
                         * response
                         */
                        body = body.replace( 'atl_after_login_redirect', 'atl_after_logi_redirect' );
                        body = body.replace( new RegExp( `https://${host}`, 'gi' ), "/handbook_resource" );
                        body = body.replace( new RegExp( '/rest/', 'gi' ), '/handbook_resource/rest/' );
                        body = body.replace( new RegExp( 'a href="(?!.*?class="toc-link")', 'gi' ), 'a href="/manual' );
                        body = body.replace( new RegExp( 'a href="/dosearchsite.action', 'gi' ), 'a href="/handbook_resource/dosearchsite.action' );
                        body = body.replace( new RegExp( 'href="/(?!manual|handbook_resource)', 'gi' ), 'href="/handbook_resource/' );
                        body = body.replace( new RegExp( 'src="/(?!handbook_resource)', 'gi' ), 'src="/handbook_resource/' );
                        body = body.replace( new RegExp( 'action="/dosearchsite.action', 'gi' ), 'action="/handbook_resource/dosearchsite.action' );
                        body = body.replace( new RegExp( 'value="/plugins/', 'gi' ), 'value="/handbook_resource/plugins/' );
                        body = body.replace( new RegExp( 'value="/s/', 'gi' ), 'value="/handbook_resource/s/' );
                        body = body.replace( new RegExp( 'content="/s/', 'gi' ), 'content="/handbook_resource/s/' );
                        body = body.replace( new RegExp( 'src="/(?!handbook_resource)', 'gi' ), 'src="/handbook_resource/' );
                        body = body.replace( new RegExp( 'context="/(?!handbook_resource)', 'gi' ), 'context="/handbook_resource/' );
                    }
                    return body;
                }
            } );
        }
    } );

    const handleRequest = ( params ) => {
        const
            { req, res, next, middleware } = params,
            isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

        if( isSwiss ) {
            resetConfigs();
        }

        req.headers.origin = `https://${host}`;
        req.headers.referer = `https://${host}`;
        req.headers.host = `${host}`;
        if( Object.keys( req.body ).length ) {
            const querystring = require( 'querystring' );
            req.removeAllListeners( 'data' );
            req.removeAllListeners( 'end' );
            process.nextTick( function() {
                if( req.body ) {
                    if( req.headers[ 'content-type' ] && req.headers[ 'content-type' ].includes( 'json' ) ) {
                        req.emit( 'data', JSON.stringify( req.body ) );
                    } else {
                        req.emit( 'data', querystring.stringify( req.body ) );
                    }
                }
                req.emit( 'end' );
            } );
        }
        middleware( req, res, next );
    };

    app.use( '/de/handbook_resource', ( req, res, next ) => {
        handleRequest( {
            req,
            res,
            next,
            middleware: middlewareProxy2
        } );
    } );

    app.use( '/ch/handbook_resource', ( req, res, next ) => {
        handleRequest( {
            req,
            res,
            next,
            middleware: middlewareProxy2
        } );
    } );

    app.use( '/handbook_resource', ( req, res, next ) => {
        handleRequest( {
            req,
            res,
            next,
            middleware: middlewareProxy2
        } );
    } );

    app.use( '/de', ( req, res, next ) => {
        handleRequest( {
            req,
            res,
            next,
            middleware: middlewareProxy
        } );
    } );

    app.use( '/ch', ( req, res, next ) => {
        handleRequest( {
            req,
            res,
            next,
            middleware: middlewareProxy
        } );
    } );

    return ( req, res, next ) => {
        handleRequest( {
            req,
            res,
            next,
            middleware: middlewareProxy
        } );
    };
};