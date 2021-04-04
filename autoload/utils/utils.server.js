/**
 * User: rrrw
 * Date: 12.02.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * This is a library of useful DC methods that are available throughout mojito without
 * having to dynamically boot the action context into including them.
 *
 * They do however mostly need the Action Context to work (i.e. mojito).
 *
 * Uses the YUI namespace.
 */

/*global YUI*/

'use strict';

YUI.add( 'dcutils', function( Y, NAME ) {

        const RESTART = Y.doccirrus.ipc.events.RESTART_SERVER,
            migrate = require( 'dc-core' ).migrate,
            {formatPromiseResult} = require( 'dc-core' ).utils,
            util = require( 'util' );

        var
        // this is the singleton Utils Object for the application
        // at the moment offers static functions
            myUtils,
            i18n = Y.doccirrus.i18n;

        /**
         * Constructor for the module class.
         *
         * @class DCUtils
         * @private
         */
        function DCUtils() {
            // purely static object at the moment, nothing in the instances.
        }

        DCUtils.prototype.init = function() {
            //moment = require( 'moment' );
        };

        DCUtils.prototype.runOnTenents = function(fn) {
            let user = Y.doccirrus.auth.getSUForLocal();

            if( Y.doccirrus.auth.isVPRC() ) {
                Y.doccirrus.api.company.getActiveTenants( {
                    user: user,
                    callback: function( err, activeTenants ) {
                        if( err ) {
                            Y.log( 'error in getting tenants for runOnTenant: ' + JSON.stringify( err ), 'error', NAME );
                        } else {

                            let activeTenantList = activeTenants.map( doc => doc.tenantId ),
                                tenantSU = null;

                            activeTenantList.forEach( function( tenantId ) {
                                tenantSU = Y.doccirrus.auth.getSUForTenant( tenantId );
                                fn( tenantSU );
                            } );

                        }
                    }
                } );

            } else if( Y.doccirrus.auth.isPRC() ) {
                fn( user );
            }
        };

        /**
         * Executes given iterator on each tenant
         *
         * @param {Function} iterator - function to execute
         * @param {Number} nConcurrent - number of maximum async operations at a time for async.parallelLimit
         * @returns {Promise}
         */
        DCUtils.prototype.iterateTenants = async function( iterator, nConcurrent = 1 ) {
            return new Promise( ( resolve, reject ) => {
                migrate.eachTenantParallelLimit( ( user, callback ) => {
                    iterator( user )
                        .then( tenantResult => callback( null, tenantResult ) )
                        .catch( tenantError => callback( tenantError ) );
                }, nConcurrent, ( err, results ) => {
                    if( err ) {
                        Y.log( `error while iterating tenants: ${err.stack || err}`, 'warn', NAME );
                        reject( err );
                    } else {
                        resolve( results );
                    }
                } );
            } );
        };

        /**
         * produce output similar to JSON.stringify(),
         *
         * - default - only down to one level, use "complete" flag for whole thing
         * - does not trow TypeError on circular ref.
         *
         * @param object
         * @param complete
         * @returns {*}
         */
        DCUtils.prototype.safeStringify = function safeStringify( object, complete, lib ) {
            var
                seen = [];
            if( 'object' !== typeof object ) {
                return JSON.stringify( object );
            }

            if( object.toJSON ) {
                return object.toJSON();
            }

            function flatten( key, value ) {
                var ret = value;
                if( value && 'object' === typeof value ) {
                    if( value === lib ) {
                        ret = 'types';
                    } else if( seen.indexOf( value ) !== -1 ) {
                        ret = '[CircularRef]';
                    }
                    else {
                        seen.push( value );
                    }
                }
                return ret;
            }

            function flattenOne( obj ) {
                var res = '{ ', key, init = true;
                for( key in obj ) {
                    if( obj.hasOwnProperty( key ) ) {
                        if( init ) {
                            init = false;
                        }
                        else {
                            res += ', ';
                        }
                        res = res + '"' + key + '": ';
                        if( obj[key] && 'object' === typeof obj[key] ) {
                            res += '"[...]"';
                        } else {
                            res += obj[key];
                        }
                    }
                }
                res += ' }';
                return res;
            }

            if( complete ) {
                return JSON.stringify( object, flatten, 4 );
            } else {
                return flattenOne( object );
            }
        };

        /**
         *
         * This is the immediate redirect via Express.
         *
         * MOJITO needs exit of the mojito system via output-handler.server.js, which does not
         * allow redirects using the express infrastructure.
         *
         * Danger: Here we override the mojito system and use the
         * Express end condition of redirecting. Thereafer, there
         * should be no more mojito events processed for this action context,
         * whose timer is disabled.
         *
         * @param redirectUrl  String URL to redirect to.
         * @param ac  must have required   mojito-http-addon
         * @param soft  if true do a hard redirect using express
         */
        DCUtils.prototype.redirect = function( redirectUrl, ac, soft ) {
            var
                acResponse = {
                    status: 'ok',
                    data: 'Found: ' + redirectUrl
                },
                acMeta = {
                    'http': {
                        'code': 302,
                        headers: {
                            'location': redirectUrl
                        }
                    }
                },
                res;

            // do a hard redirect using express
            if( !soft ) {
                Y.log( 'Redirecting to ' + redirectUrl, 'info', NAME );
                if( ac && ac.http ) {
                    res = ac.http.getResponse();
                    //   the following calls do not disable the de-zombifier...
                    //   must call ac.done and then catch the error.
                    //                    clearTimeout(ac._timer); ac._timer = null;
                    res.setHeader( 'Content-Type', 'application/x-www-form-urlencoded' );
                    res.redirect( redirectUrl );
                }

                setTimeout( function() {
                        Y.log( 'Finalizing redirect ' + redirectUrl, 'info', NAME );
                        try {
                            ac.done( null, { view: {abort: true}} );
                        } catch( e ) {
                            // we don't care about any errors that happen when mojito fails to clean up.
                            // if memory leaks, clustering and domains will take care of a scheduled restart
                        }
                    },
                    1000
                );
                return;
            }

            // do a soft redirect through mojito (only works in REST routes) because mojito overwrites meta with >1 child.
            ac.done( acResponse, acMeta );

        };

        /**
         * Perform an HTTP redirect from /1/ REST API (without ac object)
         *
         * @param args  {Object}    As passed to REST API
         * @param url   {String}    Redirect location
         */

        DCUtils.prototype.redirectRest1 = function( args, url ) {
            var res = args.httpRequest.res;
            Y.log( 'Redirecting to ' + url, 'info', NAME );

            if( res ) {
                res.redirect( url );

                setTimeout( function() {
                    args.callback( null, 'Found: ' + url );
                } );

                return;
            }

            //  should not happen unless framework is changed
            //console.log( 'Could not access server response object: ', args );
            args.callback( Y.doccirrus.errors.rest( 500, 'Could not access server response object', true ) );
        };

        /**
         * Returns the JSON message stating a given action
         * is unsupported. And a 400 HTTP error.
         *
         * Wrapper for reportErrorJSON
         *
         * @param ac  the action context
         * @param action the action that was attempted
         * @param name  the name of the mojit handling the action
         */
        DCUtils.prototype.unsupportedActionJSON = function( ac, action, name ) {
            this.reportErrorJSON( ac, 400, name + ': Called unsupported action: ' + action );
        };

        /**
         * JSON wrapper for reportError, just for backward comp.
         * @param ac
         * @param code
         * @param msg
         */
        DCUtils.prototype.reportErrorJSON = function( ac, code, msg ) {
            this.reportError( ac, code, msg );
        };

        /**
         * Returns the JSON message stating a given error
         * occured. And a HTTP error with the given code.
         *
         * @param ac  the action context
         * @param code  HTTP error code
         * @param msg  the error msg for the user
         */
        DCUtils.prototype.reportError = function( ac, code, msg ) {
            var
                validCode = function( c ) {
                    return isNaN( +c ) ? 500 : c;
                },
                data = {
                    reasonPhrase: msg,
                    statusCode: validCode( code ),
                    code: validCode( code )
                };

            Y.log( 'reporting ' + JSON.stringify( data ), 'debug', NAME );

            /* MOJ-387*/
            // add this ac, because it may fail to be cleaned up
            //Y.doccirrus.cleanup.addCleaner( myAc );  MOJ-845 no longer requires cleanup

            try {
                ac.error( data );
            } catch( e ) {
                // we don't care about any errors that happen when mojito fails to clean up.
                // if memory leaks, clustering and domains will take care of a scheduled restart
            }

            // now go and clean up all the hanging acs
            // Y.doccirrus.cleanup.clean( myAc ); MOJ-845 no longer requires clean
            // mojito cleans up acs because we call ac.done after redirect.
        };

        DCUtils.prototype.logParams = function( ac, level, theName ) {
            var params = ac.rest.originalparams;

            function censor( key, value ) {
                if( '_' === key[0] ) {
                    return 'censored';
                }
                return value;
            }

            Y.log( JSON.stringify( params, censor ), level, theName );
        };

        /**
         * just take care of the ending slash
         * @param host the first part of final url or host name
         * @param path the second part
         * @returns {*}
         */
        DCUtils.prototype.appendUrl = function( host, path ) {
            if( '/' === host.slice( -1 ) ) {
                return host.slice( 0, -1 ) + path;
            } else {
                return host + path;
            }
        };

        // ====================  DCPRC CALLS SECTION  =====================

        /**
         * Create or update a patient type contact in the dcprc.
         * If updating, the data must have an _id field.
         * If posting there must not be an _id field.
         * Returns the new id.
         *
         * Uses POST / PUT. Assumes that checks have been made for duplicate
         * contacts (by email and phone) and that the posted user does not exist.
         *
         * TODO-today: add this check here and don't make the caller make the check
         * (refactor).
         *
         * @param data
         * @param callback
         */
        DCUtils.prototype.dcprcSetPatientAsContact = function( data, callback ) {
            var
                baseurl = '/1/contact/',
                id;

            // now extend data into a contact
            if( !data.communications && (data.email || data.phone) ) {
                data.communications = [];
                if( data.email ) {
                    data.communications.push( {
                        type: 'EMAILJOB',
                        value: data.email,
                        confirmed: data.confirmed || false
                    } );
                }
                if( data.phone ) {
                    data.communications.push( {
                        type: 'PHONEJOB',
                        value: data.phone
                    } );
                }
            }

            Y.log( 'DCPRC: Writing Contact/Customer: ' + JSON.stringify( data ), 'debug', NAME );

            function cbWrapper( err, response, body ) {
                // just drop the status code.
                callback( err, body );
            }

            if( data._id ) {
                id = data._id;
                // PUT branch of logic, has _id
                delete data._id;
                delete data._rest;
                delete data.action;
                data.fields_ = Object.keys( data );
                Y.doccirrus.https.externalPut( Y.doccirrus.auth.getDCPRCUrl( baseurl + id ), data, Y.doccirrus.auth.setInternalAccessOptions(), cbWrapper );
            } else {
                // POST branch of logic, no  _id  assigned yet
                data.confirmed = data.confirmed || false;
                data.patient = true;
                data.persServices = data.persServices || [
                    {persService: 'NEWSLETTER'}
                ];
                Y.doccirrus.https.externalPost( Y.doccirrus.auth.getAdminUrl( baseurl ), data, Y.doccirrus.auth.setInternalAccessOptions(), cbWrapper );
            }
        };

        /**
         * Get the patient customer information.
         * @param id
         * @param callback
         */
        DCUtils.prototype.dcprcGetPatientAsContact = function( params, callback ) {
            Y.log( 'DCPRC: Reading Contact/Customer: ' + JSON.stringify( params ), 'debug', NAME );
            var
                    query = {};
            if( params._id ) {
                query._id = params._id;
            } else {
                if( params.lastname ) {
                    query.lastname = params.lastname;
                }
                if( params.firstname ) {
                    query.firstname = params.firstname;
                }
                if( params.email ) {
                    query.$and = [ { 'communications.value': params.email } ];
                }
                if( params.phone ) {
                    query.$and = query.$and || [];
                    query.$and.push( { 'communications.value': params.phone } );
                }
                if( params.dob ) {
                    query.dob = params.dob;
                }
            }
            function transformCb( err, text, body ) {
                var
                    contacts = body && body.data && body.data;
                if( err || !contacts.length ) {
                    return callback( err, contacts );
                }

                //Y.log( 'Got Contacts: ' + JSON.stringify( contacts.map( contact => contact._id.toString() ) ), 'debug', NAME );
                // here we are running a static transform custom function on the
                // model so this can be done locally
                Y.doccirrus.schemas.contact.getPatientsFromContacts( contacts, callback );
            }

            // do the actual needle call
            Y.doccirrus.https.externalPost( Y.doccirrus.auth.getAdminUrl( '/1/contact/:getPatient' ), { query: query }, Y.doccirrus.auth.setInternalAccessOptions(), transformCb );
        };
        /**
         * Set a company information and return the new id.
         * @param data
         * @param callback
         * @deprecated
         */
        DCUtils.prototype.dcprcSetCompany = function( data, callback ) {
            var
                baseurl = '/1/company/';

            data = JSON.parse( JSON.stringify( data ) );
            Y.doccirrus.https.externalPost( Y.doccirrus.auth.getAdminUrl( baseurl ), data, Y.doccirrus.auth.setInternalAccessOptions(), callback );
        };

        /**
         * Set a contact information and return the new id.
         * @param data
         * @param callback
         * @deprecated
         */
        DCUtils.prototype.dcprcSetContact = function( data, callback ) {
            var
                baseurl = '/1/contact/',
                _data = Object.assign( {}, data );

            Y.doccirrus.https.externalPost( Y.doccirrus.auth.getAdminUrl( baseurl ), _data, Y.doccirrus.auth.setInternalAccessOptions(), callback );
        };

        /**
         * Get a customers information by Customer No.
         * @param dcCustomerNo
         * @param callback
         */
        DCUtils.prototype.dcprcGetCustomer = function( dcCustomerNo, callback ) {
            function cbWrapper( err, response, body ) {
                body = body && body.data ? body.data : body;
                // just drop the status code.
                callback( err, body );
            }
            Y.doccirrus.https.externalPost( Y.doccirrus.auth.getDCPRCUrl( '/1/company/:getCompanyDataByDCCustomerNo' ), { dcCustomerNo }, Y.doccirrus.auth.setInternalAccessOptions(), cbWrapper );
        };

        /**
         *
         * @param callback
         */
        DCUtils.prototype.dcprcGetCompanies = function( callback ) {
            callback( null, [] );

        };
        /**
         * Do we already have a customer with this phone or email.
         * @param email
         * @param phone
         * @param callback (err, result) result is an array matched contacts
         */
        DCUtils.prototype.dcprcKnowsEmailOrPhone = function( email, phone, callback ) {
            var
                values = [],
                orOpr = encodeURIComponent( '|' );

            function cbWrapper( err, response, body ) {
                callback( err, body.data );
            }

            if( phone ) {
                values.push( Y.doccirrus.commonutils.$regexEscape( phone ) );
            }
            if( email ) {
                values.push( Y.doccirrus.commonutils.$regexEscape( email ) );
            }
            if( values.length ) {
                Y.doccirrus.https.externalGet( Y.doccirrus.auth.getAdminUrl( '/1/contact/communications.value_iregex/' + values.join( orOpr ) ), Y.doccirrus.auth.setInternalAccessOptions(), cbWrapper );
            } else {
                return callback( Y.doccirrus.errors.rest( 400 ) );
            }
        };
        /**
         *
         * @param customerId
         * @param callback (err, level)  levels are:  0 = no intime, 1 = intime,
         *                               2 = intime+, 3 = intime connect
         */
        DCUtils.prototype.dcprcHasIntimeLevel = function( customerId, callback ) {
            callback( null, [] );

        };

        /**
         * If location already has KV, then we callback with this value.
         * Otherwise try to lazy migrate by checking locations's zip codes:
         *  If zip is included in the KBV catalog, we use the KV specified there.
         *  Otherwise use the kbvZip which should always be included.
         *
         * @param user
         * @param location
         * @param callback
         * @returns {*}
         */
        DCUtils.prototype.getKvFromLocation = function( user, location, callback ) {
            var filename,
                descriptor = Y.doccirrus.api.catalog.getCatalogDescriptors( {short: 'SDPLZ'} );

            function saveKvAndCallback( kv ) {

                function saved( err ) {
                    if( err ) {
                        Y.log( 'getKvFromLocation: could not save location.kv ' + err, 'error', NAME );
                        return callback( err );
                    }

                    Y.log( 'getKvFromLocation: saved location.kv ' + kv, 'debug', NAME );
                    callback( null, kv );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'put',
                    model: 'location',
                    query: {
                        _id: location._id
                    },
                    data: {
                        kv: kv,
                        skipcheck_: true
                    },
                    fields: ['kv']
                }, saved );
            }

            function kbvZip( err, kv ) {
                if( err ) {
                    Y.log( 'getKvFromLocation: could not lazy migrate locaiton.kv for location ' + location._id + ' ' + err, 'error', NAME );
                    return callback( err );
                }
                if( kv ) {
                    Y.log( 'getKvFromLocation: found kv for location.kbvZip', 'debug', NAME );
                    return saveKvAndCallback( kv );
                }
                Y.log( 'getKvFromLocation: could not lazy migrate locaiton.kv for location ' + location._id, 'error', NAME );
                callback( new Error( 'KV Not Found' ) );
            }

            function zipCb( err, kv ) {
                if( err ) {
                    Y.log( 'getKvFromLocation: could not lazy migrate locaiton.kv for location ' + location._id + ' ' + err, 'error', NAME );
                    return callback( err );
                }
                if( kv ) {
                    Y.log( 'getKvFromLocation: found kv for location.zip', 'debug', NAME );
                    return saveKvAndCallback( kv );
                }

                getKvFromZip( location.kbvZip, kbvZip );
            }

            function getKvFromZip( zip, cb ) {
                function zipCb( err, entries ) {
                    if( err ) {
                        cb( err );
                    }
                    cb( null, entries && entries[0] && entries[0].kv );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'catalog',
                    query: {
                        plz: zip,
                        catalog: filename
                    }
                }, zipCb );
            }

            if( !location ) {
                Y.log( 'getKvFromLocation: missing argument "location"', 'error', NAME );
                return callback( new Error( 'Missing Argument: location' ) );
            }
            if( location.kv ) {
                Y.log( 'getKvFromLocation: location already has kv', 'info', NAME );
                return callback( null, location.kv );
            }

            // lazy migration starts here

            if( descriptor && descriptor._CUSTOM && descriptor._CUSTOM.cat && descriptor._CUSTOM.cat[0] ) {
                filename = descriptor._CUSTOM.cat[0].filename;
            }

            if( !filename ) {
                Y.log( 'getKvFromLocation: filename missing', 'error', NAME );
                return callback( new Error( 'could not find SDPLZ catalog descriptor/filename' ) );
            }
            if( location.zip ) {
                getKvFromZip( location.zip, zipCb );
            } else if( location.kbvZip ) {
                getKvFromZip( location.kbvZip, kbvZip );
            } else {
                return callback( new Error( 'Location has no zip code' ) );
            }

        };

        /**
         * @deprecated
         *
         * @param bsnr
         * @param callback
         */
        DCUtils.prototype.getKvFromBsnr = function( bsnr, callback ) {
            /*jshint -W106 */
            var catalog = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: '_CUSTOM',
                    "short": 'KVREG'
                } ),
                user = Y.doccirrus.auth.getSUForLocal();
            /*jshint +W106 */
            function catalogCb( err, cat ) {
                if( err || !cat.length ) {
                    callback( err || new Error( 'KV Not Found' ) );
                    return;
                }
                callback( null, cat[0].kvKey );

            }

            if( !catalog ) {
                callback( new Error( 'KVRegister Catalog Not Found ' ) );
                return;
            }

            if( 'string' !== typeof bsnr ) {
                callback( new Error( 'BSNR Not Passed' ) );
                return;
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'catalog',
                query: {
                    catalog: catalog.filename,
                    bzKey: bsnr.slice( 0, 2 )
                }
            }, catalogCb );
        };

        /**
         * Reads config file. 1st - dev version, if not found original file.
         * Throws error if both files are missing.
         * @param {String} fileName original file name, e.g. "db.json"
         * @returns {Object}
         */
        DCUtils.prototype.getConfig = function( fileName ) {
            let
                config;
            if( '/' === fileName[0] ) {
                config = require( 'dc-core' ).config.load( process.cwd() + fileName );
            } else {
                config = require( 'dc-core' ).config.load( process.cwd() + '/' + fileName );
            }

            return config;
        };

        /**
         * Reads config file.
         * If both files are missing - returns userDefaultValue, or systemDefaultValue.
         * systemDefaultValue is {}
         *
         * To suppress an error message, provide a default value. If no default value is provided,
         * the error will be logged.
         *
         * @param {String} fileName original file name, e.g. "db.json"
         * @param {*} [userDefaultValue={}] used as return value if file is missing. Can be null.
         * @returns {Object}
         */
        DCUtils.prototype.tryGetConfig = function( fileName, userDefaultValue ) {
            let
                self = this,
                config = {}; // set a system default value

            try {
                config = self.getConfig( fileName );
            } catch( e ) {
                if( userDefaultValue===null || userDefaultValue ) {
                    config = userDefaultValue;
                } else {
                    Y.log(`tryGetConfig: Can not read ${fileName} and no default set: ${e.toString()}`, 'error', NAME);
                }
            }
            return config;
        };

        /**
         * Restarts server(Master).
         */
        DCUtils.prototype.restartServer = function(){

            Y.doccirrus.communication.emitEventForAll( {
                event: 'message',
                msg: {data: i18n( 'communications.message.RESTART_SERVER' )}
            } );

            if( Y.doccirrus.ipc.isMaster() ) {
                process.exit();
            } else {
                Y.doccirrus.ipc.send( RESTART, {}, true ); // emit SIO event via master
            }
        };

        DCUtils.prototype.getPublicCardSwipe = function( patient ) {
            var insurance;
            if( !patient || !patient.insuranceStatus || !patient.insuranceStatus.length ) {
                return false;
            }
            patient.insuranceStatus.some( function( insuranceStatus ) {
                if( 'PUBLIC' === insuranceStatus.type ) {
                    insurance = insuranceStatus;
                    return true;
                }
            } );
            return insurance && insurance.cardSwipe;
        };

        DCUtils.prototype.generateLabRequestId = function() {
            return Math.floor( Date.now() / 100000000 ).toString( 36 ) + '' + Math.floor( Math.random() * 3656158440062975 - 0 ).toString( 36 );
        };

        // used for optIn link
        DCUtils.prototype.generateSecureToken = function() {
            var seed = Number( Date.now() ).toString( 16 );
            return seed.slice( -((Math.random() * 6)) ) + seed;
        };

        DCUtils.prototype.getMongoDBConfig = function() {
            return require( 'dc-core' ).db.loadDbConfig().mongoDb;
        };

        DCUtils.prototype.getCupsConfig = function() {
            return Y.doccirrus.utils.tryGetConfig( 'cups.json', {
                "port": 631,
                "host": "localhost",
                "protocol": "http",
                "enabled": true
            } );
        };

        DCUtils.prototype.setApkState = function( user, activity, callback ) {

            const
                context = this && this.context,
                ignoreAPK = Y.doccirrus.schemas.activity.ignoreAPK;
            //  do not set the APK state if this is an invoice, MOJ-7558
            if( ignoreAPK.includes( activity.actType + '' ) ) {
                return callback( null, activity );
            }
            if( context && 'undefined' !== typeof context.weakQueueKey ) {
                let
                    queue = Y.doccirrus.weakQueue.getQueue( context.weakQueueKey );
                queue.set( Y.doccirrus.utils.setApkState, function( callback ) {
                    Y.doccirrus.utils.setApkState.call( {}, user, activity, callback );
                } );
                return setImmediate( callback );
            }

            function finalCb( err, numberAffected ) {
                if( err ) {
                    Y.log( 'Could not update apkState of activities: ' + err, 'error', NAME );
                    callback( err );
                    return;
                }
                Y.log( 'updated apkState for ' + numberAffected.nModified + ' activities', 'info', NAME );
                if( numberAffected.nModified ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'system.UPDATE_ACTIVITIES_TABLES',
                        msg: {
                            data: activity.caseFolderId
                        }
                    } );
                }

                callback( null, activity );
            }

            function updateEntries( err, results ) {
                let
                    async = require( 'async' ),
                    activityIds;
                if( err ) {
                    Y.log( `setApkState. Can not get activity for update. Error: ${err}`, 'error', NAME );
                    return callback( err );
                }
                activityIds = results.map( activity => activity._id.toString() );
                async.parallel( {
                    activity: function( done ) {
                        if(!activityIds.length){
                            return done( null, {nModified: 0} );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'update',
                            model: 'activity',
                            query: {
                                _id: {$in: activityIds}
                            },
                            data: {apkState: activity.apkState},
                            options: {
                                multi: true
                            }
                        }, done );
                    },
                    reporting: function( done ) {
                        return done( null, {nModified: 0} );
                    }
                }, function( err, result ) {
                    if( err ) {
                        return finalCb( err );
                    }
                    finalCb( err, {nModified: result.activity.nModified + result.reporting.nModified} );
                } );
            }

            function modelCb( err, model ) {
                if( err ) {
                    Y.log( 'Could not get activity model ' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                var
                    startDay = new Date( new Date( activity.timestamp ).setHours( 0, 0, 0, 0 ) ),
                    endDay = new Date( new Date( activity.timestamp ).setHours( 23, 59, 59, 999 ) ),

                    query = {
                        patientId: activity.patientId.toString(),
                        caseFolderId: { $in: activity.caseFolderId },
                        timestamp: {
                            $gte: startDay,
                            $lte: endDay
                        },
                        apkState: {$ne: activity.apkState}
                    };

                model.mongoose.find( query, {_id: 1}, {lean: true}, function( err, results ) {
                    updateEntries( err, results );
                } );
            }

            Y.doccirrus.mongodb.getModel( user, 'activity', true, modelCb );
        };

        DCUtils.prototype.checkPersonPhone = function( user, person, model, callback ) {

            var async = require( 'async' ),
                voipIndDocs = [];

            async.series( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'delete',
                        model: 'voipindex',
                        query: {
                            personId: person && person._id.toString(),
                            model: model
                        },
                        options: {
                            override: true
                        }
                    }, next );
                },
                function( next ) {
                    async.eachSeries( person.communications, function( item, done ) {
                        if( item.type === 'PHONEJOB' || item.type === 'PHONEPRIV' || item.type === 'MOBILEPRIV' || item.type === 'PHONEEMERGENCY' ) {
                            let phoneValue = Y.doccirrus.commonutils.homogenisePhoneNumber( item.value );
                            voipIndDocs.push( {
                                model: model,
                                personId: person._id,
                                homogenisednumber: phoneValue
                            } );
                        } else if( 'PHONEEXT' === item.type ) {
                            voipIndDocs.push( {
                                model: model,
                                personId: person._id,
                                homogenisednumber: item.value
                            } );
                        }
                        return done();
                    }, err => {
                        if( err ) {
                            return next( err );
                        } else {
                            if( 0 === voipIndDocs.length ) {
                                return next();
                            }
                            Y.doccirrus.mongodb.runDb( {
                                action: 'post',
                                user: user,
                                model: 'voipindex',
                                data: Y.doccirrus.filters.cleanDbObject( voipIndDocs )
                            }, err => {
                                if( err ) {
                                    return next( err );
                                }
                                return next();
                            } );
                        }
                    } );
                }], ( err ) => {
                if( err ) {
                    return callback( err, person );
                }
                return callback( null, person );
            } );

        };

        /**
         * Remove person's phone numbers from voipindex collection.
         * @param user
         * @param person
         * @param model
         * @param callback
         */
        DCUtils.prototype.removePersonPhoneNumbers = function( user, person, model, callback ) {

            Y.doccirrus.mongodb.runDb( {
                user,
                action: 'delete',
                model: 'voipindex',
                query: {
                    personId: person && person._id && person._id.toString(),
                    model: model
                },
                options: {
                    override: true
                }
            }, ( err ) => {
                if( err ) {
                    return callback( err, person );
                }
                return callback( null, person );
            } );
        };

        /**
         * Sets candidates names for task or tasktype
         * @param {Object} user
         * @param {Object} entry
         * @param {Function} callback
         */
        DCUtils.prototype.setCandidatesNames = function( user, entry, callback ) {
            if( entry.candidates.length > 0 ) {

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'get',
                    query: {
                        _id: { $in: entry.candidates }
                    },
                    options: {
                        lean: true,
                        select: {
                            lastname: 1,
                            middlename: 1,
                            nameaffix: 1,
                            firstname: 1,
                            title: 1,
                            specifiedBy: 1
                        }
                    },
                    callback: function( err, result ) {
                        if( err ) {
                            Y.log( 'setCandidatesNames. getting employee error: ' + JSON.stringify( err ), 'error', NAME );
                            callback( err, entry );
                            return;
                        }
                        entry.candidatesNames = result.map( ( emp ) => Y.doccirrus.schemas.person.personDisplay( emp ) );
                        callback( null, entry );
                    }
                } );

            } else {
                entry.candidatesNames = [];
                callback( null, entry );
            }
        };

        /**
         * Sets employee name for task or tasktype
         * @param {Object} user
         * @param {Object} entry
         * @param {Function} callback
         */
        DCUtils.prototype.setEmployeeName = async function( user, entry, callback ) {
            let
                employee, err, result;
            if( !entry.employeeId ) {
                return callback( null, null );
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    migrate: true,
                    user: user,
                    model: 'employee',
                    action: 'get',
                    query: {
                        _id: entry.employeeId
                    },
                    options: {
                        lean: 1,
                        select: {
                            lastname: 1,
                            middlename: 1,
                            nameaffix: 1,
                            firstname: 1,
                            title: 1
                        }
                    }
                } )
            );

            if( err ) {
                return callback( err );
            }
            employee = result && result[0] || {};
            entry.employeeName = Y.doccirrus.schemas.person.personDisplay( employee );
            callback( null, entry );
        };

        /**
         * Gets employee from user object
         * @method getEmployeeFromUser
         * @param {Object} user
         * @returns {Promise}
         */
        DCUtils.prototype.getEmployeeFromUser = function( user ) {
            const runDb = util.promisify( Y.doccirrus.mongodb.runDb );
            return runDb( {
                user: user,
                model: 'employee',
                action: 'get',
                query: {
                    _id: user.specifiedBy
                },
                options: {
                    limit: 1,
                    lean: true
                }
            } );
        };

        /**
         * Gets employee from user object
         * @method getLocationFromUser
         * @param {Object} user
         * @returns {Promise}
         */
        DCUtils.prototype.getLocationFromUser = function( user ) {
            const runDb = util.promisify( Y.doccirrus.mongodb.runDb );
            return Y.doccirrus.utils.getEmployeeFromUser( user )
                .then( ( employeeFromUser ) => {
                    return runDb( {
                        user: user,
                        model: 'location',
                        query: {
                            _id: employeeFromUser[0] && employeeFromUser[0].locations[0] && employeeFromUser[0].locations[0]._id
                        }
                    } );
                } );
        };

        /**
         * Gets super users for all active tenants
         * @method getActiveSUForAllTenants
         * @param {Function} callback
         */
        DCUtils.prototype.getActiveSUForAllTenants = function( callback ) {
            var
                myLicMgr,
                user = Y.doccirrus.auth.getSUForLocal();

            function getSUForTenants( companies ) {
                var
                    superUsers;
                superUsers = companies
                    .filter(function( company ) {
                        return company.tenantId !== '0';
                    } ).map( function( company ) {
                        return Y.doccirrus.auth.getSUForTenant( company.tenantId );
                    } );
                return superUsers;
            }

            if( Y.doccirrus.auth.isVPRC() ) {
                myLicMgr = Y.doccirrus.licmgr;
                if( undefined === myLicMgr ) {
                    Y.log( 'getActiveSUForAllTenants: License Manager not available', 'error', NAME );
                    setImmediate( function() {
                        callback( new Y.doccirrus.commonerrors.DCError( 500, {message: 'License Manager not available'} ) );
                    } );
                    return;
                }

                setImmediate( function() {
                    callback( null, getSUForTenants( myLicMgr.getActiveCustomers() || [] ) );
                } );
                return;
            } else if( Y.doccirrus.auth.isPRC() ) {
                setImmediate( function() {
                    callback( null, [user] );
                } );
                return;
            } else if( Y.doccirrus.auth.isISD() ) {
                setImmediate( function() {
                    callback( null, [user] );
                } );
                return;
            } else if( Y.doccirrus.auth.isPUC() ) {
                setImmediate( function() {
                    callback( null, [user] );
                } );
                return;
            } else {
                setImmediate( function() {
                    callback( null, [] );
                } );
                return;
            }
        };

        /**
         * Deletes the cached instance of a required module, if it exists
         * see: http://stackoverflow.com/questions/9210542/node-js-require-cache-possible-to-invalidate
         *
         * You MUST not use this with anything but 3rd party libraries.
         * This is a major source of memory leaks (see MOJ-5288).
         *
         * @method requireUncached
         * @param module            {string}    name of module to require
         * @param [newCacheKeys]    {object}    empty array containing primary and secondary cache keys of the required module
         */
        DCUtils.prototype.requireUncached = function( module /*, newCacheKeys */ ) {

            return require( module );

            /*
            newCacheKeys = newCacheKeys || [];
            var moduleName = require.resolve(module);
            if( moduleName ) {
                Y.log( 'Removing from require.cache:' + moduleName, 'warn', NAME );
                delete require.cache[moduleName];
            }

            var
                oldCacheKeys = [],
                reqmod,
                k;

            for ( k in require.cache ) {
                if ( require.cache.hasOwnProperty( k ) ) {
                    //console.log( 'old require cache key:' + k );
                    oldCacheKeys.push( k );
                }
            }

            reqmod = require(module);

            for ( k in require.cache ) {
                if ( require.cache.hasOwnProperty( k ) && -1 === oldCacheKeys.indexOf( k ) ) {
                    //console.log( 'new require cache key:' + k );
                    newCacheKeys.push( k );
                }
            }

            return reqmod;
            */
        };

        DCUtils.prototype.getBundlePath = function( name ) {
            return `/static/dcbaseapp/assets/js/webpack_dist/${name}`;
        };

        DCUtils.prototype.getWorkaroundPath = function() {
            return `/static/dcbaseapp/assets/js/workarounds.js`;
        };

        DCUtils.prototype.isPortAvailable = function( port ) {
            const net = require( 'net' );
            return new Promise( ( resolve, reject ) => {
                port = parseInt( port, 10 );
                if( 0 > port || 65536 < port ) {
                    return reject( new Error( `isPortAvailable. invalid port: ${port}` ) );
                }
                const testServer = net.createServer()
                    .once( 'error', () => {
                        resolve( false );
                    } )
                    .once( 'listening', () => testServer.once( 'close', () => resolve( true ) ).close() )
                    .listen( port );
            } );

        };
        /**
         *  Utility method to generate new token in base64
         *
         * @returns {String}
         */
        DCUtils.prototype.generateSupportLoginToken = function() {
            var loginToken = Y.doccirrus.auth.getToken(),
                tokenBase64 = Buffer.from( loginToken, 'ascii' ).toString( 'base64' );

            return tokenBase64;
        };

        /**
         * Creates entry in audit log after such actions of patient in Patient Portal:
         * -- create/delete/download document
         * -- create/delete schedule
         * -- open page with all practices and calendars
         * -- open page with list of all documents of patient
         * -- open page with list of all schedules of patient
         *
         *
         *
         * @param {Object} user
         * @param {Object} auditData
         * @param {String} auditData.model - identify which model user interact with
         * @param {String} auditData.action - action with model
         * @param {String} auditData.who - patient from PP
         * @param {Object} [auditData.entry] - entry that is involved in action - created/deleted
         * @param {String} [auditData.mediaId] - id of media for case of open/download document
         * @returns {Promise<void>}
         */
        DCUtils.prototype.auditPPAction = async function( user, auditData ) {
            let err, patient,
                {model, action, who, entry, mediaId} = auditData,
                modelName = Y.doccirrus.schemaloader.getEnumListTranslation( 'audit', 'ModelMeta_E', model, 'i18n', 'Unbekannter Typ' ),
                auditEntry, entryCaption, calendar,
                auditDescription;

            // get patient data to generate fullName
            [err, patient] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'get',
                    query: {_id: who},
                    options: {
                        select: {
                            firstname: 1,
                            lastname: 1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `auditPPAction: Error while getting patient: ${err.stack || err}`, 'error', NAME );
                return;
            }
            if( !patient || !patient[0] ) {
                Y.log( `auditPPAction: There is no such patient: ${who}`, 'warn', NAME );
                return;
            }

            // basic audit description constructed from patient full name and model name
            auditDescription = `${Y.doccirrus.schemas.person.personDisplay( patient[0] )}, ${modelName}`;

            if( entry ) {
                // get entry caption based on model
                switch( model ) {
                    case 'schedule':
                        entryCaption = Y.doccirrus.schemaprocess.schedule.describe( entry );
                        break;
                    case 'document':
                        entryCaption = entry.caption;
                }
            }

            // additionally, for schedule model add calendar name to audit description
            if( 'schedule' === model && entry && entry.calendar ) {
                [err, calendar] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'calendar',
                        action: 'get',
                        query: {
                            _id: entry.calendar
                        }
                    } )
                );
                if( err ) {
                    Y.log( `auditPPAction: Error while getting calendar for audit: ${err.stack || err}`, 'error', NAME );
                    return;
                }
                if( calendar && calendar[0] && calendar[0].name ) {
                    entryCaption = `${calendar[0].name}, ${entryCaption}`;
                }
            }

            if( entryCaption ) {
                // add entryCaption to basic audit description
                auditDescription += `, ${entryCaption}`;
            }

            // separate case for open/download document by mediaId
            if( mediaId ) {
                [err, entry] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'document',
                        action: 'get',
                        query: {
                            mediaId: mediaId
                        }
                    } )
                );

                if( err ) {
                    Y.log( `auditPPAction: Error while getting entry: ${err.stack || err}`, 'error', NAME );
                    return;
                }
                if( entry && entry[0] ) {
                    auditDescription += `, ${entry[0].caption}`;
                }
            }

            auditEntry = Y.doccirrus.api.audit.getBasicEntry( user, action, 'patientPortal', auditDescription );
            auditEntry.objId = entry && ((entry[0] && entry[0]._id) || entry._id) || null;

            // post audit entry
            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'audit',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( auditEntry )
                } )
            );

            if( err ) {
                Y.log( `auditPPAction: Error while creating audit entry: ${err.stack || err}`, 'error', NAME );
            }
            return;
        };

        /**
         * Util function which called from post-process of scheduletype or patient and from migrate.server
         *
         * Gets all schedules with some patient or some scheduletype or just with existed patient(for migration)
         * and generate their title and then update them
         *
         * @param {Object} user
         * @param {Object} params
         * @param {String} [params.model] - name of model which call this function
         * @param {String} [params.entryId] - id of entry (patient | scheduletype)
         * @param {Boolean} [migrate] - flag to indicate call from migration
         * @returns {Promise<void>}
         */
        DCUtils.prototype.updateScheduleTitle = async function( user, params, migrate = false ) {
            const
                getModel = util.promisify( Y.doccirrus.mongodb.getModel ),
                getScheduleTitleP = util.promisify( Y.doccirrus.calUtils.getScheduleTitle ),
                {model, entryId} = params;

            let
                err, scheduleModel, schedule,
                scheduleTitle,
                query = {};

            if( model && entryId ) {
                query[model] = entryId;
            }
            if( migrate ) {
                query.patient = {$exists: true};
            }

            [err, scheduleModel] = await formatPromiseResult( getModel( user, 'schedule', migrate ) );

            if( err ) {
                Y.log( `updateScheduleTitle. Error getting schedule model: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            const scheduleCursor = scheduleModel.mongoose.find(
                query,
                {},
                {lean: true}
            ).cursor();

            schedule = await scheduleCursor.next();

            while( schedule ) {
                [err, scheduleTitle] = await formatPromiseResult( getScheduleTitleP( user, schedule ) );

                if( err ) {
                    Y.log( `updateScheduleTitle. Error getting schedule title: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

                [err] = await formatPromiseResult( scheduleModel.mongoose.collection.updateOne( {_id: schedule._id}, {
                    $set: {
                        title: scheduleTitle
                    }
                } ) );

                if( err ) {
                    Y.log( `updateScheduleTitle. Error updating schedule title: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

                schedule = await scheduleCursor.next();
            }

            return;
        };

        /**
         *  Utility method to set logLevel
         *
         *  @param  {Object}   data
         *  @param  {String}   data.logLevel - New logLevel, default = info
         */
        DCUtils.prototype.setLogLevel = function( data ) {
            let oldLogLevel = Y.config.logLevel,
                newLogLevel = data && data.logLevel || 'info';

            Y.config.logLevel = newLogLevel;
            Y.log(`LogLevel changed from ${oldLogLevel} to ${newLogLevel}`, 'debug', NAME);
        };

        myUtils = new DCUtils();
        myUtils.init();

        if( Y.doccirrus.ipc.isMaster() ) {
            Y.doccirrus.ipc.subscribeNamed( RESTART, NAME, true, function() {
                myUtils.restartServer();
            } );
        }

        Y.namespace( 'doccirrus' ).utils = myUtils;

    },
    '0.0.1', {
        requires: [
            'dcauth',
            'dccommonutils',
            'dcipc'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'company-api',
            // 'dcerror',
            // 'dchttps',
            // 'contact-schema',
            // 'catalog-api',
            // 'activity-schema',
            // 'DcWeakQueue',
            // 'dcfilters',
            // 'person-schema',
            // 'dclicmgr',
            // 'dcschemaloader',
            // 'schedule-process',
            // 'audit-api',
            // 'dccalutils'
        ]
    }
);
