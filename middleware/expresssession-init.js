/**
 * User: rrrw
 * Date: 28.12.12  11:29
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

"use strict";

/**
 * initialize session handlers for PP and others
 * @type {exports}
 */

var
    dcauth = require( 'dc-core' ).auth,
    expressSession = require( 'express-session' ),
    express = { session: expressSession },
    theSecret = 'abcdefg1243726354127635QW66',
    store = new express.session.MemoryStore(),
    ppSession = express.session(
        { secret: theSecret,
            key: 'pp.connect.sid',
            store: store,
            resave: false,
            saveUninitialized: true,
            cookie: {
                sameSite: 'none'
            }} ),
    medneoSession = express.session(
        { secret: theSecret,
            key: 'partner.connect.sid',
            store: store,
            resave: false,
            saveUninitialized: true } ),
    elseSession = express.session(
        { secret: theSecret,
            key: 'prc.connect.sid',
            store: store,
            resave: false,
            saveUninitialized: true,
            cookie: {
                sameSite: true
            }
            } ),
    originalGen = store.generate,
    generate = function generate( _req, Y ) {

        if( !_req.sessionID ) {
            originalGen.call( store, _req ); // create a new session and a new sessionID

        } else { // create a new session with the current sessionID
            _req.session = new express.session.Session( _req );
            _req.session.cookie = new express.session.Cookie();
        }

        if( _req.session.cookie ) {
            if( _req.secure ) {
                // this flag requires https connection
                _req.session.cookie.secure = true;
            }

            if( 'pp.connect.sid' === _req.cookieName ) {
                _req.session.cookie.sameSite = 'none';

            }
            if( Y.doccirrus.auth.isMVPRC() ) {
                _req.session.cookie.maxAge = 7257600000;
            }
        }
    };

module.exports = function( Y ){
    // eslint-disable-next-line no-console
    console.log( '**Initializing express session**' );

    store.generate = function( _req ) {
        generate( _req, Y );
    };
    return function( req, res, next ) {

        if( req.isPatientPortal || (req.isDCPublic && dcauth.isPUC()) ) {
            dcauth.expressCookieVal( req ).init( 'pp.connect.sid' );
            ppSession( req, res, next );

        } else if( Y.doccirrus.auth.isMVPRC() ) {
            dcauth.expressCookieVal( req ).init( 'partner.connect.sid' );
            medneoSession( req, res, next );

        } else { // for PRC and everything else
            dcauth.expressCookieVal( req ).init( 'prc.connect.sid' );
            elseSession( req, res, next );
        }
    };
};

function destroySession( sid ) {
    store.destroy( sid );
}

module.exports.destroySession = destroySession;