/**
 * middleware-wise util functionality
 *
 * User: fudge
 * Date: 01.11.13  16:27
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

function DCMidUtils() {
}

// TODO use YUI logger
DCMidUtils.prototype.log = function( msg ) {
    console.log( new Date().toISOString() + ' [DC-Middleware] ' + msg );        // eslint-disable-line
};

var util = new DCMidUtils();

/**
 * TODO this is totally dirty and needs reconception ASAP
 */
DCMidUtils.prototype.isPatientRequest = function isPatientRequest( req ) {
    var
        anotherServer = req.realmISD || req.realmPRC || req.realmDCPRC || req.realmVPRC,
        url = req.url;
    if(
        !anotherServer && (
            0 === url.lastIndexOf( '/intime', 0 ) ||
            0 === url.lastIndexOf( '/inconference', 0 ) ||
            0 === url.lastIndexOf( '/jawbone', 0 ) ||
            0 === url.lastIndexOf( '/1/metaprac', 0 ) ||
            0 === url.lastIndexOf( '/1/patientreg', 0 ) ||
            0 === url.lastIndexOf( '/1/patientportal', 0 ) ||
            0 === url.lastIndexOf( '/intime/patient', 0 ) ||
            0 === url.lastIndexOf( '/r/p_', 0 ) ||
            0 === url.lastIndexOf( '/dologin?intime=1', 0 ) ||
            url.match( /pplogout/ ) ) ) {

        util.log( 'patient portal request' );
        return true;
    }
    if( 0 === url.lastIndexOf( '/1/jsonrpc', 0 ) ) {
        if( req.headers && req.headers.referer && -1 !== req.headers.referer.toLowerCase().indexOf( 'admin/intime' ) ) {
            return false;
        }
        if( req.headers && req.headers.referer && -1 !== req.headers.referer.toLowerCase().indexOf( '/intime' ) ) {
            util.log( 'patient portal request' );
            return true;
        }
        if( req.headers && req.headers.referer && -1 !== req.headers.referer.toLowerCase().indexOf( '/inconference' ) ) {
            util.log( 'patient portal request for video conference' );
            return true;
        }
    }

    return false;
};

/**
 * First tries to load moduleName, then moduleNameExt
 * @method getModule
 * @param {String} moduleName
 * @param {String} moduleNameExt
 * @returns {*}
 */
DCMidUtils.prototype.getModule = function( moduleName, moduleNameExt ) {
    let
        middleware;
    try {
        middleware = require( moduleName );
    } catch( e ) {
        util.log( `Error during loading ${moduleName}, error: ${JSON.stringify( e )}. Trying to load ${moduleNameExt}` );
        middleware = require( moduleNameExt );
    }
    return middleware;
};

/**
 * Loads dc-server-middleware for different projects(dev, ext-dev)
 * @method getServerMiddleware
 * @returns {*}
 */
DCMidUtils.prototype.getServerMiddleware = function() {
    return this.getModule( 'dc-server-middleware', 'dc-server-middleware-ext' );
};

/**
 * Loads dc-server-communications for different projects(dev, ext-dev)
 * @method getServerCommunications
 * @returns {*}
 */
DCMidUtils.prototype.getServerCommunications = function() {
    return this.getModule( 'dc-server-communications', 'dc-server-communications-ext' );
};

DCMidUtils.prototype.isPublicURL = function isPublicURL( req ) {
    var
        publicURLPrefixes = [
            // some of these routes are only applicable to specific contexts. Should be made explicit. TODO MOJ-415
            '/1/auth/:unlockLogin',
            '/1/patientreg/:patientDCRegister',
            '/1/patientreg/:patientPRCRegister',
            '/1/auth/:loginDevicePoll',
            '/1/auth/:testConnection',
            '/1/company/:checkTrial',
            '/1/calendar/:gettime',
            '/1/employee/:doResetEmployeePw',
            '/1/errors/:log',
            '/r/countries/?action=countries',
            '/1/patientportal/:resetPassword',
            '/1/patientportal/:registerPatient',
            '/1/patientportal/:confirmOptin',
            '/3/statuscheck',
            '/favicon',
            '/static',
            '/combo~',
            '/r/jade',
            '/login',
            '/robots.txt',
            '/3/inphone/:inboundphonecall',
            '/impress',
            '/intime',
            '/register',
            '/r/p_receivewaitingtime/?action=p_receivewaitingtime',
            '/rgnx?ccode',
            '/prgn?ccode',
            '/wrongbrowser',
            '/dcauth?grant_type=authorization_code',
            '/r/auth/issueAccessToken',
            '/r/addpractice/?action=addpractice',
            '/r/changePWPatient/?action=changePWPatient',
            '/passreset',
            '/test',
            '/noscript',
            '/cmstest',
            '/newsletter',
            '/optin',
            '/confirmVC?prac',
            '/intouch/conference',
            '/fonts',
            '/asv',
            '/formportal',
            '/1/inpacs/:getInstanceDcm',
            '/1/test/:websmsrecv',
            '/3/test/:toggleLogging',
            '/3/test/:migrateFormularToQDocu',
            '/3/commission/:getCommission',
            '/3/lab/:checkAndCreateMissingTreatmentsFromLabdata',
            '/3/lab/:regenerateAllLabEntries'
        ],
        i, isPublic, nextUrlChar;

    //for now all jade loader requests go unchecked -->
    // need to rather, in case of  Jade:
    // Public mojits:  DataViewMojit, RegistrationMojit, LoginMojit (and only allow those). TODO
    for( i = 0; i < publicURLPrefixes.length; i++ ) {
        // current algorithm is very fast... not sure if we need the wildcards solution...
        // Change  this so that wildcard stars are allowed at the end of the
        // of the publicurlprefix,  semantic is then:
        //   with star anything starting with prefix
        //   without star must be an exact match, needed for /
        // optimise code with pup[i][pup.length]  use char array nature of string... TODO
        //            s = publicURLPrefixes[i].split('*');
        //            if(1< s.length)
        //                //contained a *
        if( 0 === req.url.lastIndexOf( publicURLPrefixes[i], 0 ) ) {
            nextUrlChar = req.url[publicURLPrefixes[i].length];
            //additionally test if it is subset of longer url
            if( !nextUrlChar || !(/[a-z]/i.test(nextUrlChar)) ){
                isPublic = true;
            }

        }
    }

    // here are exceptions to the public rule, simply listed in an if statement.
    //
    if( // exact match (the root itself is not public)
        '/' === req.url ||
            // prefix match (non-public patient portal pages)
        0 === req.url.lastIndexOf( '/intime/patient', 0 )
        ) {
        isPublic = false;
    }

    return isPublic;
};

module.exports = util;