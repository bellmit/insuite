/**
 * User: rw
 * Date: 22/10/15  12:12
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

"use strict";

var
    Y, NAME;

NAME = 'dcmojito-context';

function handle( req, res, next ) {

    Y.log( 'MIDDLEWARE: adding context ' + req.url, 'debug', NAME );

    let lang = 'de',
        envConfig = Y.doccirrus.utils.getConfig( 'env.json' );

    if( envConfig.i18nMode ) {
        let userLang = req.user ? req.user.preferredLanguage : null;
        lang = userLang || req.cookies.preferredLanguage || ( req.headers['accept-language'] && req.headers['accept-language'].toString().split( ',' ) ) || lang;
    }

    Y.log( 'MIDDLEWARE: language to use ' + lang, 'debug', NAME );

    // Here we take over more mojito functionality
    // Make this configurable, need new requirements & better plan for context
    req.context = {
        runtime: 'server',
        site: '',
        device: '',
        lang: Y.Intl.lookupBestLang( lang, ['en', 'de', 'de-ch'] ),
        langs: 'de-DE,de,en-US,en',
        region: '',
        jurisdiction: '',
        bucket: '',
        flavor: '',
        tz: ''
    };
    next();
}

module.exports = function( _Y ) {
    Y = _Y;
    return handle;
};


