/**
 * User: pi
 * Date: 06/06/17  09:05
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
'use strict';

module.exports = function( Y, app, server ) {
    let
        proxy,
        nodeRedConfig;
    const
        route = 'nodered',
        roteRegExp = new RegExp( `^/${route}$` ),
        pathRewrite = `^/${route}/?`;
    if( Y.doccirrus.auth.isPUC() || Y.doccirrus.auth.isDCPRC() ) {
        return;
    }
    proxy = require( 'http-proxy-middleware' );
    nodeRedConfig = Y.doccirrus.utils.tryGetConfig( 'nodeRed.json', {
        "port": 1880,
        "host": "localhost"
    } );

    let middlewareProxy = proxy( {
        target: `http://${nodeRedConfig.host}:${nodeRedConfig.port}`,
        changeOrigin: true,
        pathRewrite: {
            [pathRewrite]: '/'
        }
    } );

    app.use( roteRegExp, ( req, res ) => {
        res.redirect( 301, `/${route}/` );
    } );
    app.use( `/${route}/`, ( req, res, next ) => {
        if( !Object.keys( req.body ).length ) {
            return next();
        }
        req.removeAllListeners( 'data' );
        req.removeAllListeners( 'end' );
        // need nextTick here!
        process.nextTick( function() {
            if( req.body ) {
                req.emit( 'data', JSON.stringify( req.body ) );
            }
            req.emit( 'end' );
        } );
        next();


    } );
    app.use( `/${route}/`, middlewareProxy );

    server.on('upgrade', (...rest)=>{
        if(Array.isArray(rest) && rest[0] && (typeof rest[0].url === "string") && rest[0].url.includes(route)) {
            middlewareProxy.upgrade(...rest);
        }
    });
};



