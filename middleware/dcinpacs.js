/**
 * User: abhijit.baldawa
 * Date: 17.11.17  14:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*
* This module proxies all the communication from browser to inpacs and back
* This also proxies MULTIPART request
*
*
* */
module.exports = function( Y, route, app ) {
    let
        proxy,
        middlewareProxy,
        inpacsConfig;

    /*
    * Ex. for route="/inpacs" this regexp converts it to /^\/inpacs/
    * and "/inpacs/my/route".replace(/^\/inpacs/, "") = "/my/route"
    * */
    const
        pathRewriteRegExp = new RegExp(`^${route}`);

    if( Y.doccirrus.auth.isPUC() || Y.doccirrus.auth.isDCPRC() ) {
        return ( req, res, next ) => {
            next();
        };
    }

    inpacsConfig = Y.doccirrus.utils.tryGetConfig( 'inpacs.json' );
    if( !inpacsConfig.httpPort || !inpacsConfig.host ) {
        return ( req, res, next ) => {
            next();
        };
    }

    proxy = require( 'http-proxy-middleware' );

    /*
    * Calls to <insuite URL>/inpacs redirects to /app/explorer.html
    * So we need to handle it here to redirect back to original URL with
    * /inpacs added at start. After that there are no redirects
    */
    app.use( "/app/explorer.html", ( req, res ) => {
        res.redirect( 301, `/inpacs/app/explorer.html` );
    } );

    middlewareProxy =  proxy( {
        target: `http://${inpacsConfig.host}:${inpacsConfig.httpPort}`,
        changeOrigin: true,
        pathRewrite: (path) => {
            return path.replace(pathRewriteRegExp, '');
        }
    } );

    return ( req, res, next ) => {
        /**
         * body buffer recreation
         */
        if( Object.keys( req.body ).length ) {
            req.removeAllListeners( 'data' );
            req.removeAllListeners( 'end' );
            // need nextTick here!
            let mangledBody;
            if( Object.keys( req.body ).length === 1 ) {
                mangledBody = Object.keys( req.body )[0];
            }

            process.nextTick( function() {
                if( mangledBody ) {
                    req.emit( 'data', mangledBody );
                } else if( req.body ) {
                    req.emit( 'data', JSON.stringify( req.body ) );
                }
                req.emit( 'end' );
            } );
        }

        middlewareProxy( req, res, next );
    };
};



