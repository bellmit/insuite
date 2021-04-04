/**
 * User: pi
 * Date: 12/05/17  11:51
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
'use strict';

const
    NAME = "dccups";
/*
* CUPS server has below issue:
* 1] dc-insuite sets cookie for access to its infrastructure
* E.X. Cookie would be like below:
*   req.headers.cookie = "prc.connect.sid=<string> ; mongoMachineId=<string>; io=<string>; org.cups.sid=<string>"
* For CUPS most important stuff in above cookie is "org.cups.sid". As the above cookie string is not so big, CUPS does not have
* problem reading the cookie and deciding on what the user is asking. But if a inSuite user access datasafe from a HUB URL then, for
* communication between dc-insuite server and the browser, we have a concept called "dctoken".
*
* Now in case of access via HUB, cookie would be as below:
* E.x. Cookie in case of HUB
*   req.headers.cookie = "prc.connect.sid=<string> ; dctoken=<A VERY BIG TOKEN>; mongoMachineId=<string>; io=<string>; org.cups.sid=<string>"
*
* Now with the above cookie string with dctoken set in BETWEEN, it looks like CUPS have some limit on the cookie string length it can parse, so it is
* not able to fetch/reach the part "org.cups.sid" and because of this user clicks (ex. add printer click) are redirected to same page.
*
* As we do not want to alter the "req.header.cookie" string, so, just to make it ease for CUPS What this method does is move dctoken
* to the bottom of the string as show below:
* e.x. (This method does below)
*   Input = req.headers.cookie = "prc.connect.sid=<string> ; dctoken=<A VERY BIG TOKEN>; mongoMachineId=<string>; io=<string>; org.cups.sid=<string>"
*   Output = req.headers.cookie = "prc.connect.sid=<string> ; mongoMachineId=<string>; io=<string>; org.cups.sid=<string>; dctoken=<A VERY BIG TOKEN>"
*
* So, because of this CUPS is able to parse the information it is interested in without loosing the information and we are able to
* keep all information in request object intact at dc-insuite level.
* */
function moveDcTokenToBottom( cookieString ) {
    if( cookieString && typeof cookieString === "string" ) {
        let
            dctoken,
            cookieArr = cookieString.split(";").filter((token)=>{
                if( token.indexOf( "dctoken=" ) !== -1) {
                    dctoken = token;
                    return false;
                } else {
                    return true;
                }
            });

        if( dctoken ) {
            cookieArr.push( dctoken );
        }

        return cookieArr.join(";");
    } else {
        return cookieString;
    }
}

module.exports = function( Y ) {
    const
        eproxy = require( 'express-http-proxy' ),
        url = require( 'url' ),
        querystring = require( 'querystring' ),
        is = require( 'type-is' );
    let
        cupsConfig,
        proxyWithBodyParse,
        proxyWithoutBodyParse;
    if( Y.doccirrus.auth.isPUC() || Y.doccirrus.auth.isDCPRC() ) {
        return ( req, res, next ) => {
            next();
        };
    }
    function proxyReqBodyDecorator( bodyContent ) {
        if( 'object' === typeof bodyContent ) {

            bodyContent = querystring.stringify( bodyContent );

        }
        return bodyContent;
    }

    function userResDecorator( proxyRes, data, req, res ) {
        const
            skipExt = [ 'png', 'css', 'gif' ],
            urlExt = req.url.split( '.' ).pop();
        res.removeHeader( 'ETag' );
        res.removeHeader( 'Cache-Control' );
        res.removeHeader( 'X-Frame-Options' );
        res.removeHeader( 'Content-Security-Policy' );
        if( !skipExt.includes( urlExt ) ) {
            data = data.toString( 'utf8' );
            data = data.replace( new RegExp( 'href="/', 'gi' ), 'href="/cups/' );
            data = data.replace( new RegExp( 'src="/', 'gi' ), 'src="/cups/' );
            data = data.replace( new RegExp( 'src="images', 'gi' ), 'src="/cups/images' );
            data = data.replace( new RegExp( 'href="help', 'gi' ), 'href="/cups/help' );
            data = data.replace( new RegExp( 'href="admin', 'gi' ), 'href="/cups/admin' );
            data = data.replace( new RegExp( 'action="/', 'gi' ), 'action="/cups/' );
            data = data.replace( new RegExp( 'URL=/', 'gi' ), 'URL=/cups/' );

            //fix CUPS iframe busting - started at v2.x
            data = data.replace( new RegExp( '<style>html.*<\/style>', 'gi' ), '' );
            data = data.replace( new RegExp( 'if \\(self(.|\\n)*location;\\n.*}', 'gi' ), '' );
            /**
             * Generally we observe that in the response HTML from CUPS server we get below structure in HTML HEAD tag
             * <META HTTP-EQUIV="Refresh" CONTENT="5;URL=/admin/?OP=redirect&amp;URL=/printers/Testi">
             * So, the above scenario is handled in the above regexp but due to non standard behaviour of CUPS server
             * we observer below scenario as well,
             * <META HTTP-EQUIV="Refresh" CONTENT="5;/admin/?OP=redirect&amp;URL=/printers/Testi">
             * And with the regExp applied above the string was replaced to
             * <META HTTP-EQUIV="Refresh" CONTENT="5;/admin/?OP=redirect&amp;URL=/cups/printers/Testi"> but adding /cups
             * after "CONTENT=5;" was not possible because URL parameter was missing and due to this non standard response
             * from CUPS server so adding below regex to handle this scenario
             */
            data = data.replace( new RegExp( 'CONTENT="5;/admin', 'g' ), 'CONTENT="5;/cups/admin' );
        }
        return data;
    }

    /**
     * This method is basically used to handle redirects from a proxy server i.e. 303 status code.
     * If there is a redirect then for ex. userResHeaders.location = "http://127.0.0.1:631/cups/printers/pclPrinterTest"
     * All this method does is convert above to userResHeaders.location = "<protocol>://<datasafe host>/cups/printers/pclPrinterTest"
     * So that the browser can redirect to dcInsuite with the above modified URL and hence the redirect will be proxied correctly
     *
     * For method arguments please see below link
     * https://www.npmjs.com/package/express-http-proxy
     *
     * @param {Object} userResHeaders - Response headers object
     * @param {Object} userReq - Original request from proxy to original server
     * @param {Object} userRes - Original response from server to proxy
     * @param {Object} proxyReq - Proxy wrapped original request
     * @param {Object} proxyRes - Proxy wrapped response from proxy server
     * @returns Object
     */
    function userResHeaderDecorator( userResHeaders, userReq, userRes, proxyReq, proxyRes ) { // eslint-disable-line no-unused-vars
        if( userResHeaders && userResHeaders.location && typeof userResHeaders.location === "string" && userResHeaders.location.startsWith("http") ) {
            const
                {path} = url.parse(userResHeaders.location),
                requestHeaders = userReq && userReq.headers || {};

            let
                proxyLocationUrl;

            if( requestHeaders["x-forwarded-proto"] && requestHeaders.host ) {
                proxyLocationUrl = `${requestHeaders["x-forwarded-proto"]}://${requestHeaders.host}${path}`;
                return {...userResHeaders, location: proxyLocationUrl};
            } else {
                // Should never come here.
                Y.log(`userResHeaderDecorator: As a response for originalUrl = ${userReq.originalUrl} received proxyResHeaders.location = ${userResHeaders.location}. requestHeaders["x-forwarded-proto"] = ${requestHeaders["x-forwarded-proto"]} and requestHeaders.host = ${requestHeaders.host}. One or both of them are invalid. Keeping proxyResHeaders.location = ${userResHeaders.location} as it is`, "debug", NAME);
            }
        }

        // LAM-1746 hotpatch until we have fixed this correctly
        if( userReq.headers && userReq.headers.accept && userReq.headers.accept.startsWith("text/html") ) {
            userResHeaders["content-type"] = "text/html; charset=utf-8'";
        }

        return userResHeaders;
    }

    function proxyReqPathResolver( req ) {
        return url.parse( req.url ).path;
    }

    cupsConfig = Y.doccirrus.utils.getCupsConfig();

    proxyWithoutBodyParse = eproxy( `${cupsConfig.host}:${cupsConfig.port}`, {
        parseReqBody: false,
        https: 'https' === cupsConfig.protocol,
        proxyReqBodyDecorator,
        userResDecorator,
        proxyReqPathResolver,
        userResHeaderDecorator
    } );
    proxyWithBodyParse = eproxy( `${cupsConfig.host}:${cupsConfig.port}`, {
        https: 'https' === cupsConfig.protocol,
        proxyReqBodyDecorator,
        userResDecorator,
        proxyReqPathResolver,
        userResHeaderDecorator
    } );

    return ( req, res, next ) => {
        if( req.headers && req.headers.cookie ) {
            //This is especially required for users accessing CUPS server from HUB
            req.headers.cookie = moveDcTokenToBottom( req.headers.cookie );
        }

        if( is( req, [ 'multipart' ] ) ) {
            proxyWithoutBodyParse( req, res, next );
        } else {
            proxyWithBodyParse( req, res, next );
        }

    };

};



