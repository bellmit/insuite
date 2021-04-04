/**
 * User: mahmoud
 * Date: 10/09/14  11:50
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

"use strict";

/**
 * Detect to which server the request arrived.
 * Realm info is used throughout the whole app.
 */

var
    Y, NAME, logger,
    util = require( './dc-util' ),
    dcauth = require( 'dc-core' ).auth;

NAME = 'dcrealm';

function setRealm( req ) {
    var
        host, dcprc;

    function sanitize( host ) {
        var _host = (host || '').toLowerCase();
        if( _host.indexOf( ':' ) > -1 ) {
            _host = _host.substring( 0, _host.indexOf( ':' ) );
        }
        return _host;
    }

    host = sanitize( req.headers.host );
    dcprc = sanitize( dcauth.getDCPRCHost() );

    if( !dcprc ) {
        logger.log( 'missing DCPRC host in config!', 'debug', NAME );
        //        return;
    }

    if( -1 !== req.url.indexOf( '/1/import/:uploadBdtFile' ) ) {
        req.overrideTimeout = 900000;
    }
    if( -1 !== req.url.indexOf( '/1/company/:initializeTenant' ) ) {
        req.overrideTimeout = 180000;
    }
    if( -1 !== req.url.indexOf( '/2/' ) ) {
        req.overrideTimeout = 600000;
    }
    req.realmHost = host; // undefined for http 1.0

    // TODO atm checks for DCPRC only
    req.isLoggingIn = req.url.startsWith( "/login" ) || req.url.startsWith( "/dologin" );
    req.isDCPublic = util.isPublicURL( req ) || false;
    req.realmPRC = dcauth.isPRC();
    req.realmPUC = dcauth.isPUC();
    req.realmISD = dcauth.isISD();
    req.realmDCPRC = dcauth.isDCPRC();
    req.realmVPRC = dcauth.isVPRC();
    req.isPatientPortal = util.isPatientRequest( req ) || false;
    return req.isPatientPortal || req.realmVPRC || req.isFromFriend || req.realmDCPRC || req.isDCPublic || req.realmPRC || req.realmISD;
}

function realmDetector( req, res, next ) {

    logger.log('MIDDLEWARE: Realm detect.', 'info', NAME );

    if( setRealm( req ) ) {
        logger.log( 'realmHost+URL: ' + req.realmHost + req.url, 'debug', NAME );
        logger.log( 'realmPRC: ' + dcauth.isPRC(), 'debug', NAME );
        logger.log( 'realmISD: ' + dcauth.isISD(), 'debug', NAME );
        logger.log( 'realmVPRC: ' + dcauth.isVPRC(), 'debug', NAME );
        logger.log( 'isPUC: ' + dcauth.isPUC(), 'debug', NAME );
        logger.log( 'realmDCPRC: ' + dcauth.isDCPRCRealm( req ), 'debug', NAME );
        logger.log( 'isPatientPortal: ' + req.isPatientPortal, 'debug', NAME );
        logger.log( 'isDCPublic: ' + req.isDCPublic, 'debug', NAME );
    } else {
        req.unknownRealm = true;
        logger.log( 'Unknown request: ' + req.url + ', could not detect realm for host: ' + req.realmHost, 'debug', NAME );
    }
    return next();
}

module.exports = function getMiddleware( _Y ) {
    Y = _Y;
    logger = Y;
    return realmDetector;
};