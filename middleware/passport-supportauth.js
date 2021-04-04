"use strict";
const
    passport = require( 'passport' ),
    LocalStrategy = require( 'passport-local' ).Strategy,
    dcauth = require( 'dc-core' ).auth,
    {formatPromiseResult} = require('dc-core').utils,
    NAME = 'passport-supportauth';

let
    Y, newLoginToken, oldLoginToken,
    ACCOUNT_EXPIRED;

async function findSupportUserByToken( req, loginToken, callback ) {
    let
        tenantId = Y.doccirrus.auth.getTenantFromHost( req.realmHost ),
        dbUser, err, result, model;

    if( dcauth.isPRC() || dcauth.isISD() ) {
        tenantId = dcauth.getLocalTenantId();
    }

    if( 'MOCHA' === loginToken.slice( -5 ) ) {
        tenantId = '1213141513Mocha';
    }

    oldLoginToken = loginToken;
    newLoginToken = Y.doccirrus.utils.generateSupportLoginToken();
    dbUser = Y.doccirrus.auth.getSUForTenant( tenantId );

    [err, result] = await formatPromiseResult(
        new Promise( ( resolve, reject ) => {
            Y.doccirrus.mongodb.getModel( dbUser, 'identity', true, ( modelErr, model ) => {
                if( modelErr ) {
                    reject( modelErr );
                } else {
                    resolve( model );
                }
            } );
        } )
    );

    if( err ) {
        Y.log( `findSupportUserByToken: Error getting 'identity' collection model. Error: ${err.stack || err}`, "error", NAME );
        return callback( err );
    }

    if( !result ) {
        Y.log( `findSupportUserByToken: Failed to fetch 'identity' collection model`, "error", NAME );
        return callback( `Failed to fetch 'identity' collection model` );
    }

    model = result;

    [err, result] = await formatPromiseResult(
        model.mongoose.findOneAndUpdate( {loginToken: loginToken}, {$set: {loginToken: newLoginToken}}, {new: true} )
    );

    if( err ) {
        Y.log( `findSupportUserByToken: Error while saving new loginToken in identity. Error: ${err.stack || err}`, "error", NAME );
        return callback( err );
    }

    if( !result ) {
        return callback( Y.doccirrus.errors.http( 400, ACCOUNT_EXPIRED ) );
    }

    if( result.expireDate && result.expireDate > new Date() ) {
        return callback( null, result, tenantId );
    } else {
        callback( Y.doccirrus.errors.http( 400, ACCOUNT_EXPIRED ) );
    }
}

function init() {
    let
        loginData;

    passport.serializeUser( dcauth.serializeUser );
    passport.deserializeUser( dcauth.deSerializeUser );
    passport.use( 'support-local', new LocalStrategy( {
        usernameField: 'id',
        passwordField: 'loginToken',
        passReqToCallback: true
    }, function( req, username, loginToken, done ) {
        findSupportUserByToken( req, loginToken, function( err, identity, tenantId ) {
            if( err ) {
                Y.log( `failed to authenticate with support token: ${ err && err.reasonPhrase }`, 'error', NAME );
                return done( err && err.reasonPhrase );
            }

            if( identity && identity.username ) {
                loginData = {
                    identity: identity && identity.username && JSON.parse( JSON.stringify( identity ) ),
                    tenantId: tenantId
                };
                return done( null, loginData );
            } else {
                return done( null, {} );
            }
        } );
    } ) );
}

function handler( req, res, next ) {
    let userAuth,
        url = Y.doccirrus.auth.getDCPRCUrl( '/1/supportrequest/:createNew' );

    if( req.isAuthenticated() ) {
        next();
        return;
    }

    if( req.query && req.query.loginToken ) {
        passport.authenticate( 'support-local', {
            session: true,
            assignProperty: 'body'
        }, ( err, loginData ) => {

            if( err || loginData === false || !loginData.identity ) {
                Y.log( `Error in support authentication. Error: ${ err && err.stack }`, 'error', NAME );
                return next( err || Y.doccirrus.errors.http( 400 ) );
            }
            userAuth = dcauth.buildUserByIdentity( {
                identity: loginData.identity,
                tenantId: loginData.tenantId
            } );
            userAuth.sessionId = req.session && req.session.id;
            req.logIn( userAuth, function cb( err ) {
                if( err ) {
                    return next( 'Support Login failed at Passport logIn(). ' );
                }
                Y.log( 'Support login authorised: ' + JSON.stringify( userAuth ), 'info', NAME );
                // do session handling
                dcauth.addUserSession( userAuth, function( err, res ) {
                    Y.log( 'Support session registered ', 'info', NAME );

                    Y.log( `handler: Sending request to DCPRC to save new login token.`, 'debug', NAME );

                    Y.doccirrus.https.externalPost( url, {
                        oldLoginToken: oldLoginToken,
                        newLoginToken: newLoginToken
                    }, Object.assign( {errDataCallback: true}, Y.doccirrus.auth.setInternalAccessOptions() ), function( error ) {
                        if( error ) {
                            Y.log( `handler. Error from DCPRC: ${error.stack || error}`, 'error', NAME );
                            return next( error );
                        }
                        next( err, res );
                    } );
                } );
            } );
        } )( req, res, next );
    } else {
        return next();
    }
}

module.exports = function( _Y ) {
    Y = _Y;
    ACCOUNT_EXPIRED = Y.doccirrus.i18n( 'SupportMojit.passport-supportauth.errors.ACCOUNT_EXPIRED' );

    Y.log( 'SupportLogin authentication is configured', 'info', NAME );

    init();
    return handler;
};