/**
 * User: rrrw
 * Date: 08.01.13  13:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 *
 * Official CORS logic implementation.
 *
 * Configurable via dc-core.  Config is in cors.json file.
 *
 */

/*global __dirname */

"use strict";

var
    dccors = require( __dirname + '/../node_modules/dc-core' ).cors;

function handleCors() {
    return function( req, res, next ) {
        var
            headers = dccors.getCorsHeaders(),
            preflighting = false;

        req.__timing = [{cors: Date.now()}];

        function setPreFlightHeaders() {
            res.header( 'Access-Control-Allow-Methods', headers['Access-Control-Allow-Methods']);
            res.header( 'Access-Control-Allow-Headers', headers['Access-Control-Allow-Headers'] );
        }

        function setCorsReqHeaders() {
            res.header('Access-Control-Expose-Headers','true');
        }

        if( req.headers.origin ) {

            // 1. check Origin header
            // Fix MOJ 475: cors core module now configurable
            if( !dccors.isValidCorsOrigin(req.headers.origin) ) {
                let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                dccors.log( `Rejecting invalid CORS origin ${req.headers.origin} from IP ${ip}`, 'warn', 'cors-all' );
                return res.send( 403 );
            }

            // 2. intercept OPTIONS method
            if( 'OPTIONS' === req.method ) {

                // 3.
                if( req.headers['access-control-request-method'] ) {
                    setPreFlightHeaders();
                    preflighting = true;
                } else {
                    setCorsReqHeaders();
                }
                dccors.log( '*** CORSING *** ' + (preflighting?'PREFLIGHT':'regular') );
                //console.dir(req.headers);

            } else {
                setCorsReqHeaders();
            }

            // 3. set response headers
            res.header('Access-Control-Allow-Origin', req.headers.origin );
            res.header('Access-Control-Allow-Credentials', 'true');
            setPreFlightHeaders();

        } else {
            //  No need for CORS headers when accessed from own security context
            //  eg, puc sends a page which makes an AJAX request back to the puc
        }

        if( preflighting ) {
            return res.send( 200 );
        }
        return next();

    };
}

module.exports = handleCors();
