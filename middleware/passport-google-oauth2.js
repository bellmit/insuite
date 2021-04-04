/**
 * User: mahmoud
 * Date: 31/03/15  18:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * User: adrianjager
 * Date: 19/08/14  10:34
 * (c) 2014, T&S GmbH, Berlin
 */

"use strict";

var
    passport = require( 'passport' ),
    GoogleStrategy = require( 'passport-google-oauth2' ).Strategy,
    cfgRaw, authConfig,
    GOOGLE_CLIENT_ID , GOOGLE_CLIENT_SECRET,
    Y,
    dcauth = require( 'dc-core' ).auth,
    NAME = 'passport-google-oauth2',
    loginPath = "/login/google", // a public url
    callbackUrl = "/dologin/google";// should start with the path used for REST login

try {
    cfgRaw = require( process.cwd() + '/passport-google.json' );
    authConfig = cfgRaw[0].config || {};
} catch( e ) {
    console.log( 'cannot load passport-google.json: ', e );
}

function findUserByGoogleProfile( req, profile, callback ) {
    var
        tenantId = Y.doccirrus.auth.getTenantFromHost( req.realmHost ),
        dbUser ,
        async = require( 'async' );

    if( dcauth.isPRC() || dcauth.isISD() ) {
        tenantId = dcauth.getLocalTenantId();
    }

    if( tenantId && profile.email ) {
        dbUser = Y.doccirrus.auth.getSUForTenant( tenantId );
        async.waterfall( [
            function findUser( next ) {

                Y.doccirrus.mongodb.runDb( {
                    user: dbUser,
                    model: 'employee',
                    query: {communications: {$elemMatch: {value: profile.email}}},
                    callback: function( err, result ) {
                        if( err || !result || !result[0] ) {
                            next( err || Y.doccirrus.errors.http( 401, 'user not found' ) );
                        } else {
                            next( null, result[0]._id );
                        }
                    }
                } );
            },
            function getUsername( theId, next ) {
                Y.doccirrus.mongodb.runDb( {
                    user: dbUser,
                    model: 'identity',
                    query: {specifiedBy: theId},
                    callback: function( err, result ) {
                        if( err || !result || !result[0] ) {
                            next( err || Y.doccirrus.errors.http( 401, 'user  not found' ) );
                        } else {
                            next( null, result[0] );
                        }
                    }
                } );
            }
        ],
            function done( err, identity ) {
                if( err ) {
                    callback( err );
                } else {
                    callback( null, identity.username, identity.pw, tenantId );
                }
            }
        );

    } else {
        Y.log( 'Cannot authenticate with google strategy, on tenant: ' + tenantId, 'warn', NAME );
        callback( Y.doccirrus.errors.http( 400, 'invalid params' ) );
    }
}

function init() {
    passport.serializeUser( dcauth.serializeUser );
    passport.deserializeUser( dcauth.deSerializeUser );

    passport.use( new GoogleStrategy( {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            authorizationURL: authConfig.authorizationURL,
            tokenURL: authConfig.tokenURL,
            callbackURL: callbackUrl,
            passReqToCallback: true
        },
        function( req, accessToken, refreshToken, profile, done ) {
            Y.log( 'Using google strategy to authenticate, profile: ' + JSON.stringify( profile ), 'debug', NAME );

            // find the user and just set the credentials into the body
            findUserByGoogleProfile( req, profile, function( err, username, password, tenantId ) {
                var
                    loginData = {
                        username: username,
                        password: password,
                        tenantId: tenantId
                    };
                if( username && password ) {
                    Y.log( 'will authenticate with credentials: ' + JSON.stringify( loginData ), 'info', NAME );
                    return done( err, loginData ); // the data will be consumed by local strategy to finalize user authentication
                } else {
                    Y.log( 'failed to authenticate with google: ' + JSON.stringify( loginData ), 'info', NAME );
                    return done( err || Y.doccirrus.errors.http( 400, 'insufficient params' ) );
                }
            } );
        }
    ) );
}

function handler( req, res, next ) {

    if( req.isAuthenticated() ) {
        next();
        return;
    }

    if( -1 < req.url.indexOf( loginPath ) ) {
        // redirect to google, then after authentication google will redirect back at callback url
        passport.authenticate( 'google', { scope: authConfig.scope || []} )( req, res );

    } else if( -1 < req.url.indexOf( callbackUrl ) ) {
        // now back from google, get user profile from google
        passport.authenticate( 'google', {
            failureRedirect: '/login',  // if user cancels
            assignProperty: 'body' // default property is 'user'
        } )( req, res, function( err ) {
            if( err ) {
                Y.log( 'error in google authentication: ' + JSON.stringify( err ), 'error', NAME );
            }
            next();
        } );
    } else {
        next();
    }
}

module.exports = function( _Y ) {
    Y = _Y;

    if( authConfig && authConfig.GOOGLE_CLIENT_ID && authConfig.GOOGLE_CLIENT_SECRET ) {
        GOOGLE_CLIENT_ID = authConfig.GOOGLE_CLIENT_ID;
        GOOGLE_CLIENT_SECRET = authConfig.GOOGLE_CLIENT_SECRET;
        init();
        return handler;
    } else {
        Y.log( 'passport-google-oauth2 is not configured: ' + JSON.stringify( authConfig ), 'warn', NAME );
        return function skip( req, res, next ) {
            next();
        };
    }
};