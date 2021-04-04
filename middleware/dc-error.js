/**
 * User: ts
 * Date: 5.9.13  09:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 *
 * this is our own error handler for 404 errors
 *
 * requires a small patch in mojito-router.js
 * shows note on browser ane server log if mojito was not pacthed
 *
 */

"use strict";

/**
 * Escape special characters in the given string of html.
 *
 * @param  {String} html
 * @return {String}
 * @api private
 */

// eslint-disable-next-line no-unused-vars
function escape(html) {
    return String(html).
        replace(/&/g, '&amp;').
        replace(/"/g, '&quot;').
        replace(/</g, '&lt;').
        replace(/>/g, '&gt;');
}

/**
 * hook into the handle() chain of express
 * please make sure that this middleware is called as last one!
 *
 * FIXME: mojito 0.9 pass Y in and log properly.
 */

module.exports = function handle(req, res) {

    //eslint-disable-next-line no-console
    console.log('DC: Entering dc-error... status = ' + res.statusCode);

    function next() {
        if(res.statusCode === 404){
            //eslint-disable-next-line no-console
            console.log('DC: 404 handled');

            res.setHeader('Content-Type', 'text/plain');
            if ('HEAD' === req.method) {
                res.end();
            } else {
                res.end('DC: 404 ' + req.method + ' ');
            }
        } else if( res.statusCode === 200 ) {
            res.statusCode = 404;

            //eslint-disable-next-line no-console
            console.log( `DC: The route: ${req.url} is not configured. Update routes.json or add the route to express middleware.` );
            res.end(  `DC: The route is not configured. Update routes.json or add the route to express middleware.` );
        } else {
            //eslint-disable-next-line no-console
            console.log( 'DC: error code set ' + res.statusCode );
            res.setHeader('Content-Type', 'text/plain');

            if ('HEAD' === req.method) {
                res.end();
            } else {                res.end( 'DC: You should not be seeing this message. Please contact Doc Cirrus, and report error #4702' );

            }
        }
    }

    next();
};
