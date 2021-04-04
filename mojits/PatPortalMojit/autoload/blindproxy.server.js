/**
 * User: strix
 * Date: 22.04.14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jshint esnext:true */
/*global YUI*/



/**
 *  The PUC Proxy passes calls from the PUC/PatientPortal to PRC instances.
 *
 *  This is a draft replacement PUC proxy which should blindly forward requests from the
 *  patient portal to the PRC.
 *
 *  Ultimately the proxy should only perform routing and perimission checks on routes,
 *  with data exchanged between patient protected by public key encryption.
 *
 *  ROADMAP: this is likely to be moved to PUCMojit
 *
 */

YUI.add( 'dcblindproxy', function( Y, NAME ) {

        var async = require( 'async' );

        function getMetaPracForUser( user, customerIdPrac, callback ) {

            var dbQuery = {};

            if( ('string' === typeof customerIdPrac) && ('' !== customerIdPrac) ) {
                dbQuery.customerIdPrac = customerIdPrac;
            } else {
                callback( 'customer practice id not given' );
                return;
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'metaprac',
                action: 'get',
                callback: callback,
                query: dbQuery,
                options: {}
            } );
        }

        /**
         *  Load something from a PRC or tenant
         *
         *  @param  user        {Object}    REST user
         *  @param  options     {Object}    Auth internalAccessOptions
         *  @param  params      {Object}    From the patent's browser, requesting something
         *  @param  callback    {Function}  Of the form fn(err, data, redirect)
         */

        function getFromPRC( user, options, params, callback ) {

            var
                remoteUrl = '',
                redirectUrl = '',
                patientReg,
                metaPrac,
                querystring = require( 'querystring' ),
                responseBody;

            async.series(
                [
                    checkRequiredArguments,
                    getPatientRegistration,
                    getMetaPrac,
                    reconstructUrl,
                    makeRemoteRequest
                ],
                onAllDone
            );

            //  1. check required arguments
            function checkRequiredArguments( itcb ) {
                if( params.hasOwnProperty( 'remoteparams64' ) ) {
                    params.remoteparams = Buffer.from( params.remoteparams64, 'base64' ).toString();
                    //
                    // Y.log('Decoding remote params: ' + JSON.stringify(params.remoteparams, undefined, 2), 'debug', NAME);
                }

                if(
                    (!params.hasOwnProperty( 'patientregid' ) && !params.hasOwnProperty( 'patientreg' )) ||
                    (!params.hasOwnProperty( 'remoteurl' )) ||
                    (!params.hasOwnProperty( 'remoteparams' )) ||
                    (!params.hasOwnProperty( 'remotemethod' ))
                ) {
                    itcb( Y.doccirrus.errors.http( 409, 'Missing required parameter, aborting proxy request.' ) );
                    return;
                }

                if( 'string' === typeof params.remoteparams ) {
                    try {
                        params.remoteparams = JSON.parse( params.remoteparams );
                    } catch( parseErr ) {
                        itcb( Y.doccirrus.errors.http( 409, 'Could not parse given parameters: ' + parseErr ) );
                        return;
                    }
                }

                // if this is a data upload
                if( 'upload64' === params.remoteparams.action || 'download64' === params.remoteparams.action ) {
                    Y.log( 'Blindproxy detected upload/download: increasing wait time.', 'info', NAME );

                    // base64 encoded upload, so take this into account when blocking the
                    // too large upload. 10 MB limit for now.
                    if( params.remoteparams && (10 * 1024 * 1024 * 4 / 3) < params.remoteparams.length ) {
                        itcb( Y.doccirrus.errors.http( 409, 'Payload exceeds 10Mb.' ) );
                        return;
                    }

                    // we may be uploading a large file and so we have to increase the file
                    // tx timeout to 10 * 60 secs.
                    options.timeout = 10 * 60000;
                }

                itcb( null );
            }

            //  2. get the patientreg
            function getPatientRegistration( itcb ) {
                function onLoadPatientReg( err, data ) {
                    if( err || (0 === data.length) ) {
                        itcb( Y.doccirrus.errors.http( 409, 'Could not load patientreg: ' + err ) );
                        return;
                    }

                    //Y.log( 'Loaded patientReg: ' + JSON.stringify( data[0], undefined, 2 ) );
                    patientReg = data[0];

                    if( !patientReg.customerIdPrac ) {
                        Y.log( 'Missing customerIdPrac: ' + JSON.stringify( patientReg ), 'warn', NAME );
                        itcb( Y.doccirrus.errors.http( 409, 'Missing customerIdPrac.' ) );
                        return;
                    }

                    itcb( null );
                }

                if( !params.patientreg ) {
                    Y.log( 'Loading patientreg for user, with patientregid: ' + params.patientregid, 'info', NAME );
                    Y.doccirrus.api.patientreg.getForCurrentUser( user, params.patientregid, onLoadPatientReg );
                } else {
                    onLoadPatientReg( null, [params.patientreg] );
                }
            }

            //  3. get practice metadata
            function getMetaPrac( itcb ) {
                function onLoadMetaPrac( err, data ) {
                    if( err || (0 === data.length) ) {
                        itcb( Y.doccirrus.errors.http( 409, 'Could not load metaprac: ' + err ) );
                        return;
                    }

                    //Y.log('Loaded metaPrac: ' + JSON.stringify(data[0], undefined, 2));
                    metaPrac = data[0];
                    itcb( null );
                }

                getMetaPracForUser( user, patientReg.customerIdPrac.toString(), onLoadMetaPrac );
            }

            //  4. create base URL without trailing slash after domain, add patient Id
            function reconstructUrl( itcb ) {
                var
                    versionedREST = false,
                    hasQuery = ( -1 !== params.remoteurl.indexOf( '?' ) ),
                    nonRestParams = {},
                    nonRestParamsFormatted;

                if( ('1/' === params.remoteurl.substring( 0, 2 )) || ('/1/' === params.remoteurl.substring( 0, 3 )) ) {
                    //  versioned REST API
                    Y.log( 'Using versioned REST API', 'debug', NAME );
                    versionedREST = true;

                    remoteUrl = params.remoteurl;
                    remoteUrl = remoteUrl + ( hasQuery ? '&' : '?' ) + 'pid=' + patientReg.patientId;
                    remoteUrl = metaPrac.host + remoteUrl;
                    remoteUrl = remoteUrl.replace( '//1/', '/1/' );

                } else {
                    //  previous REST API
                    remoteUrl = metaPrac.host + params.remoteurl;
                    remoteUrl = remoteUrl.replace( '//r/', '/r/' );
                    remoteUrl = remoteUrl.replace( '//r/', '/r/' );
                    remoteUrl = remoteUrl + ((-1 === remoteUrl.indexOf( '?' )) ? '?' : '');
                    remoteUrl = remoteUrl + '&pid=' + patientReg.patientId;
                    remoteUrl = remoteUrl.replace( '?&pid=', '?pid=' );
                }

                if ( 'GET' === params.remotemethod.toUpperCase() && params.remoteparams ) {
                    
                    if( versionedREST ) {
                        Object.keys( params.remoteparams ).forEach( function( k ) {
                            //Y.log( 'Adding querystring param: ' + k + ': ' + params.remoteparams[ k ], 'debug', NAME );
                            if( !Y.Object.hasValue( Y.doccirrus.urls, k ) ) {
                                remoteUrl = remoteUrl + '&' + k + '=' + params.remoteparams[ k ];
                            } else {
                                nonRestParams[ k ] = params.remoteparams[ k ];
                            }
                        } );
                    } else {
                        nonRestParams = params.remoteparams;
                    }

                    nonRestParamsFormatted = querystring.stringify( nonRestParams );
                    if( nonRestParamsFormatted ) {
                        remoteUrl = (-1 < remoteUrl.indexOf( '?' )) ? remoteUrl : remoteUrl + '?';
                        if( '?' !== remoteUrl.slice( -1 ) ) {
                            remoteUrl += '&';
                        }
                        Y.log( 'Adding querystring params: ' + nonRestParamsFormatted, 'debug', NAME );
                        remoteUrl = remoteUrl + nonRestParamsFormatted;
                    }

                }

                itcb( null );
            }

            //  5. make the request to the PRC
            function makeRemoteRequest( itcb ) {

                var method = params.remotemethod ? params.remotemethod.toUpperCase() : 'GET';

                Y.log( 'Blind proxy ' + method + ' request to: ' + remoteUrl, 'info', NAME );
                Y.log( 'Blind proxy ' + method + ' params: ' + JSON.stringify( params.remoteparams || [] ), 'debug', NAME );
                
                switch( method ) {

                    case 'GET':
                        Y.doccirrus.https.externalGet( remoteUrl, options, onHttpResponse );
                        break;

                    case 'POST':
                        Y.doccirrus.https.externalPost( remoteUrl, params.remoteparams, options, onHttpResponse );
                        break;

                    case 'PUT':
                        Y.doccirrus.https.externalPut( remoteUrl, params.remoteparams, options, onHttpResponse );
                        break;

                    case 'DELETE':
                        Y.doccirrus.https.externalDelete( remoteUrl, params.remoteparams, options, onHttpResponse );
                        break;
                }

                //  log this request and pass remote data to client
                function onHttpResponse( err, response, body ) {

                    if( err ) {
                        Y.log( 'Could not complete needle request: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( Y.doccirrus.errors.http( 504, 'Could not complete needle request: ' + err ) );
                    }

                    var data = ( body && ( 'object' === typeof body ) && body.data ) ? body.data : body;

                    //  follow redirects on same server
                    if( response && response.headers && response.headers.location ) {

                        redirectUrl = response.headers.location;
                        redirectUrl = redirectUrl.split( '?' )[0];

                        redirectUrl = metaPrac.host + redirectUrl + '?dataurl=true';
                        redirectUrl = redirectUrl.replace( '//r/', '/r/' );
                        redirectUrl = redirectUrl.replace( '//pdf/', '/pdf/' );
                        redirectUrl = redirectUrl.replace( '//img/', '/img/' );
                        redirectUrl = redirectUrl + '&pid=' + patientReg.patientId;

                        Y.log( 'Following redirect to: ' + redirectUrl, 'debug', NAME );
                        Y.doccirrus.https.externalGet( redirectUrl, options, onHttpResponse );
                        return;
                    }

                    //  should no longer be used, media is no longer exchanged as dataURIs
                    if (
                        ( 'string' === typeof data ) &&
                        ( response.headers.hasOwnProperty( 'content-type' ) ) &&
                        ( 'text/plain' === response.headers['content-type'] )
                    ) {
                        Y.log( 'Received base64 encoded document: ' +  response.headers['content-type'] + ' ' + data.length + 'bytes', 'debug', NAME );
                        responseBody = body;
                        return itcb( null );
                    }

                    if( 'object' === typeof body && body.meta && body.meta.query && body.meta.query.pid ) {
                        delete body.meta.query.pid;
                    }

                    //Y.log( 'Received data from ' + remoteUrl + ': ' + JSON.stringify( body ).substring( 0, 1024 ), 'debug', NAME );
                    //Y.log( 'Received headers: ' + JSON.stringify( response.headers, undefined, 2 ), 'info', NAME );

                    if( data && (data.encrypted && data.senderKey || data.noPatientKey) ) {
                        data.patientId = data.patientId || patientReg.patientId;
                        data.senderKey = data.senderKey || metaPrac.senderKey;
                    }

                    responseBody = body;
                    itcb( null );
                }

            }

            //  return PRC response to the client
            function onAllDone( err ) {
                if ( err ) { 
                    Y.log( 'Error making request of PRC: ' + JSON.stringify( err ), 'warn', NAME ); 
                    return callback( err );
                }
                callback( null, responseBody );
            }

        }

        //  create the blindproxy

        Y.namespace( 'doccirrus' ).blindproxy = {
            'getMetaPracForUser': getMetaPracForUser,
            'getFromPRC': getFromPRC
        };

    },
    '0.0.1', {requires: [ 'dcmedia-store', 'patientreg-schema' ]}
);