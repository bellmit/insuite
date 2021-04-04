/**
 *  Added to move REST actions from controller.server.js to new REST API
 *
 *  This is the API from which requests are proxied to the PRC
 *
 *  User: strix
 *  Date: 10/08/14  13:27
 *  (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/



YUI.add( 'metaprac-api', function( Y, NAME ) {

        /**
         *  Public cloud directory service
         *  Initially setup for hardwired config.
         *  @param {Object} args
         *
         *  @return {Function}  callback
         */
        function loadMetaPracFromConfig( args ) {
            Y.log('Entering Y.doccirrus.api.metaprac.loadMetaPracFromConfig', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.metaprac.loadMetaPracFromConfig');
            }

            var i,
                metapracs,
                dbQuery = {},
                callback = args && args.callback ||
                           function() {
                           },
                fb = { updated: 0, unchanged: 0, new: 0 },
                user = Y.doccirrus.auth.getSUForLocal();

            function getUpdateCb( metap, cb ) {
                return function updateM( err, result ) {
                    var dd;

                    if( err ) {
                        Y.log( 'Warning: Error occured: Metaprac not found, no trial tenant was made for: ' + JSON.stringify( metap ), 'warn', NAME );
                        Y.log( 'Error: ' + JSON.stringify( err ), 'warn', NAME );
                        // fail fast
                        cb( err );
                    } else {
                        if( result && result.length ) {
                            if( result[0].host !== metap.host ) {
                                Y.log( 'Metaprac being updated: ' + JSON.stringify( metap ) + '\nhost was: ' + result[0].host, 'warn', NAME );
                                result[0].host = metap.host;

                                //mongooselean.save_fix
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'metaprac',
                                    action: 'put',
                                    query: {
                                        _id: result[0]._id
                                    },
                                    fields: Object.keys(result[0]),
                                    data: Y.doccirrus.filters.cleanDbObject(result[0])
                                } );

                                fb.updated++;
                            } else {
                                Y.log( 'Metaprac unchanged: ' + result[0].host, 'warn', NAME );
                                fb.unchanged++;
                            }
                            cb();
                        } else {
                            Y.log( 'Creating entry for: ' + JSON.stringify( metap ), 'info', NAME );
                            dd = { secret: Y.doccirrus.auth.getPUCSecret( metap.customerIdPrac )};
                            dd.host = metap.host;
                            dd.customerIdPrac = metap.customerIdPrac;
                            Y.doccirrus.filters.setSkipCheck( dd, true );
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'metaprac',
                                action: 'post',
                                data: dd
                            }, function( err ) {
                                if( err ) {
                                    Y.log( 'Warning: Metaprac not created for: ' + JSON.stringify( metap ), 'warn', NAME );
                                    cb( err );
                                } else {
                                    fb.new++;
                                    cb();
                                }
                            } );
                        }
                    }
                };
            }

            function updateMetaPrac( m, cb ) {
                dbQuery = { customerIdPrac: m.customerIdPrac };

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'metaprac',
                    action: 'get',
                    query: dbQuery
                }, getUpdateCb( m, cb ) );
            }

            if( Y.doccirrus.auth.isPUC() ) {
                // get dir name from  Y.config.insuite.
                metapracs = require( require( 'path' ).join( process.cwd(), 'metapraclist.json' ) );

                if( metapracs && metapracs.length ) {
                    i = metapracs.length;
                    Y.log( 'Loading ' + i + ' Metaprac', 'debug', NAME );
                    require( 'async' ).each( metapracs, updateMetaPrac, function( err ) {
                        if( err ) {
                            return callback( err );
                        }
                        callback( null, [fb] );

                    } );

                } else {
                    Y.log( 'Warning: No metapracs to load.', 'warn', NAME );
                    return callback();
                }
            } else {
                return callback();
            }
        }

        /**
         *  REST action to make a request of a PRC or VPRC tenant and return results to the client
         *
         *  In order to route and authenticate the request this action will need to know which patientReg to use
         *  for this call, expects params:
         *
         *      patientRegId   {String}    Database ID of a patientreg object
         *
         *  @param  args    {Object}    As passed by RestController_new
         */

        function blindproxy( args ) {
            Y.log('Entering Y.doccirrus.api.metaprac.blindproxy', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.metaprac.blindproxy');
            }

            /**
             *  Callback from blind proxy action
             *
             *  @param  err         {String}    Error / debug message
             *  @param  response    {Mixed}     JSON in most cases
             *  @param  redirect    {String}    URL to redirect to (files middleware)
             */

            function onPRCResponse( err, response ) {

                if( err ) {
                    args.callback( err );
                    return;
                }

                if( response ) {
                    args.callback( null, response );
                    return;
                }

                /*
                 if( redirect ) {
                 Y.doccirrus.utils.redirect( redirect, ac, true );
                 return;
                 }
                 */

                args.callback( new Error( 'Proxy request failed.' ) );
            }

            var options = Y.doccirrus.auth.setInternalAccessOptions();
            Y.doccirrus.blindproxy.getFromPRC( args.user, options, args.originalParams, onPRCResponse );
        }

        /**
         *  REST action to proxy media specifically
         *
         *  TODO: handle binaries from new /media/ middleware
         *
         *  In order to route and authenticate the request this action will need to know which patientReg to use
         *  for this call, expects params:
         *
         *      patientRegId   {String}    Database ID of a patientreg object
         *      mediaId     {String}    id of media object on PRC
         *
         *  FUTURE: this may be used to remove the redirect following for non-media calls
         *
         *  @param  args    {Object}    As passed by RestController_new
         */

        function mediaproxy( args ) {
            Y.log('Entering Y.doccirrus.api.metaprac.mediaproxy', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.metaprac.mediaproxy');
            }

            var
                params = args.originalParams,
                metaRegId = params.metaregid || null,
                mediaId = params.id || null,
                transform = params.transform || 'original',
                mime = params.mime || '',
                ext = Y.doccirrus.media.getExt( mime ),
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                requestArgs = {
                    'patientregid': metaRegId,
                    'remotemethod': 'GET',
                    'remoteurl': '/media/' + mediaId + '_' + transform + '.' + mime + '.' + ext,
                    'remoteparams': { isFromPortal: true }
                };

            if ( !metaRegId || !mediaId ) {
                args.callback( Y.doccirrus.errors.rest( 404, 'missing media id or metaRegId.' ) );
                return;
            }

            Y.doccirrus.blindproxy.getFromPRC( args.user, options, requestArgs, onPRCResponse );

            /**
             *  Callback from blind proxy action
             *
             *  @param  err         {String}    Error / debug message
             *  @param  response    {Buffer}    Raw file contents
             *  @param  redirect    {String}    URL to redirect to (files middleware)
             */

            function onPRCResponse( err, response /* , redirect */ ) {
                var
                    res = args.httpRequest.res,
                    addHeaders = {};

                if ( !err && !res ) {
                    //  should not happen unless framework is changed
                    Y.log( 'Could not access server response object: ' + JSON.stringify( args ), 'warn', NAME );
                    err = Y.doccirrus.errors.rest( 500, 'Could not access server response object', true );
                }

                if ( err ) {
                    Y.log( 'Could not relay media to patient portal: ' + JSON.stringify( err ), 'warn', NAME );
                    args.callback( err );
                    return;
                }

                //  try stream this directly to the client
                addHeaders['Content-Length'] = response.length;
                addHeaders['Content-Type'] = Y.doccirrus.media.getMimeType( mime );

                //txtLog = txtLog + 'Proxying media to patient portal:\n\n';
                //txtLog = txtLog + JSON.stringify( urlObj, undefined, 2 ) + '\n\n';

                res.writeHead( 200, addHeaders );
                res.write( response );

                args.callback( null, null );
            }

            Y.log( 'media proxy query argument: ' + JSON.stringify( args.originalParams ) );
            Y.log( 'media proxy params argument: ' + JSON.stringify( args.query ) );

        } // end mediaproxy

        function registerPRC( args ) {
            Y.log('Entering Y.doccirrus.api.metaprac.registerPRC', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.metaprac.registerPRC');
            }
            var
                user = args.user,
                prcData = args.data,
                callback = args.callback,
                query = {};

            Y.log( 'registering PRC with data: ' + JSON.stringify( prcData ), 'debug', NAME );

            if( !prcData.dcCustomerNo ) {
                Y.log( 'cannot register PRC without dcCustomerNo', 'error', NAME );
                callback( Y.doccirrus.errors.rest( 400, 'missing dcCustomerNo' ) );
                return;
            }

            function createEntry() {
                prcData.customerIdPrac = prcData.dcCustomerNo;
                prcData.pubKey = prcData.publicKey;
                prcData = Y.doccirrus.filters.cleanDbObject( prcData );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'metaprac',
                    action: 'post',
                    data: prcData,
                    callback: callback
                } );
            }

            if( prcData.dcCustomerNo ) {
                query.customerIdPrac = prcData.dcCustomerNo;
            }
            if( prcData.systemType && !prcData.dcCustomerNo ) {
                query.systemType = prcData.systemType;
            }
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'metaprac',
                query: query,
                callback: function( err, result ) {
                    if( err ) {
                        return callback( err );
                    } else if( result && result[0] ) {
                        Object.keys( prcData ).forEach( field => {
                            result[ 0 ][ field ] = prcData[ field ];
                        } );

                        result[0].pubKey = prcData.publicKey;

                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'metaprac',
                            action: 'put',
                            query: {
                                _id: result[0]._id
                            },
                            fields: Object.keys(result[0]),
                            data: Y.doccirrus.filters.cleanDbObject(result[0])
                        }, callback);

                    } else {
                        createEntry();
                    }
                }
            } );
        }

        function setBookFlag( args ) {
            Y.log( 'Entering Y.doccirrus.api.metaprac.setBookFlag', 'info', NAME );
            if( args && args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.metaprac.setBookFlag' );
            }

            var
                user = args.user,
                data = args.data,
                callback = args.callback;

            if( !data.customerIdPrac ) {
                Y.log( 'cannot update metaprac without customerIdPrac', 'error', NAME );
                callback( Y.doccirrus.errors.rest( 400, 'missing customerIdPrac' ) );
                return;
            }

            /**
             * Try to fetch a metaprac entry from the database,
             * which does not match the transmitted bookFlag.
             * If we get one, we may update the entry.
             */
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'metaprac',
                useCache: true,
                query: {
                    customerIdPrac: data.customerIdPrac,
                    onlyPracticesPatientsCanBook: {$ne: data.onlyPracticesPatientsCanBook}
                },
                callback: function( err, result ) {
                    if( err ) {
                        return callback( err );
                    } else if( result && result[0] ) {
                        // found a non-matching entry
                        Y.log( 'updating metaprac key: onlyPracticesPatientsCanBook', 'info', NAME );

                        // put changes to the db
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'metaprac',
                            action: 'put',
                            query: {
                                _id: result[0]._id
                            },
                            fields: ["onlyPracticesPatientsCanBook"],
                            data: Y.doccirrus.filters.cleanDbObject( {onlyPracticesPatientsCanBook: data.onlyPracticesPatientsCanBook} )
                        }, callback );
                    } else {
                        // nothing to do
                        Y.log( 'nothing to do: BookFlag did not change', 'info', NAME );
                        return callback( null );
                    }
                }
            } );
        }

        /**
         * Returns the public practice data.
         * @param {object} args
         * @param {function} args.callback
         * @param {string} args.dcCustomerNo
         * @param {string} args.pubKey
         * @param {string} args.systemId
         */
        function getPublicData( args ) {
            Y.log( 'Entering Y.doccirrus.api.metaprac.getPublicData', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.metaprac.getPublicData' );
            }
            var
                params = args.data,
                callback = args.callback,
                query = {};

            if( !params.dcCustomerNo && !params.pubKey && !params.systemId ) {
                callback( Y.doccirrus.errors.rest( 400, 'insufficient params' ) );
                return;
            }

            if( params.pubKey ) {
                if( Array.isArray( params.pubKey ) ) {
                    query.pubKey = {$in: params.pubKey};
                } else {
                    query.pubKey = params.pubKey;
                }
            }
            if( params.systemId ) {
                if( Array.isArray( params.systemId ) ) {
                    // [MOJ-8629] filter the array for NULL values, which may occur in high load situations during boot
                    query.systemId = {$in: params.systemId.filter( val => val !== null )};
                } else {
                    query.systemId = params.systemId;
                }
            }

            if( Array.isArray( params.dcCustomerNo ) ) {
                query.customerIdPrac = {$in: params.dcCustomerNo};
            } else {
                query.customerIdPrac = params.dcCustomerNo;
            }

            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'metaprac',
                useCache: true,
                query: query,
                callback: function( err, result ) {
                    var
                        myResult = [];

                    if( err ) {
                        Y.log( 'getPublicData. Can not get data. Error: ' + err, 'error', NAME );
                        return callback( err );
                    }

                    if( !result.length ) {
                        Y.log( 'getPublicData. Practice not found. query: ' + JSON.stringify( query ), 'error', NAME );
                        return callback( Y.doccirrus.errors.rest( 400, 'practice not found' ) );
                    }

                    result.forEach( function( item ) {
                        myResult.push( {
                            publicKey: item.pubKey,
                            host: item.host,
                            dcCustomerNo: item.customerIdPrac,
                            systemId: item.systemId,
                            systemType: item.systemType
                        } );
                    } );

                    return callback( null, myResult );
                }
            } );
        }

        function getPatientPractice( args ){
            var
                user = args.user,
                callback = args.callback;

            Y.doccirrus.pucproxy.getPracticeInfo( user, {}, callback );
        }

        /**
         * Creates entry for every tenant in vprc in local db.
         * @method registerTenant
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.publicKey
         * @param {Object} args.callback
         *
         * @return {Function}
         */
        function registerTenant( args ) {
            Y.log('Entering Y.doccirrus.api.metaprac.registerTenant', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.metaprac.registerTenant');
            }
            let
                user = args.user,
                localUser = Y.doccirrus.auth.getSUForLocal(),
                data = args.data || {},
                publicKey = data.publicKey,
                callback = args.callback,
                host = Y.doccirrus.auth.getMyHost( user.tenantId );

            if( !publicKey ) {
                Y.log( 'registerTenant. Can not register tenant. publicKey is missing', 'error', NAME );
                return callback( new Error( 'publicKey is missing' ) );
            }

            function update( entry, callback ) {
                entry.pubKey = data.publicKey;

                //mongooselean.save_fix
                Y.doccirrus.mongodb.runDb( {
                    user: localUser,
                    model: 'metaprac',
                    action: 'put',
                    query: {
                        _id: entry._id
                    },
                    fields: Object.keys(entry),
                    data: Y.doccirrus.filters.cleanDbObject(entry)
                }, callback);
            }

            function create( callback ) {
                let
                    postData = {
                        host: host,
                        pubKey: data.publicKey
                    };
                Y.doccirrus.mongodb.runDb( {
                    user: localUser,
                    model: 'metaprac',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( postData )
                }, callback );
            }

            Y.doccirrus.mongodb.runDb( {
                user: localUser,
                model: 'metaprac',
                action: 'get',
                query: {
                    host: host
                },
                options: {
                    limit: 1
                }
            }, function( err, result ) {
                if( err ) {
                    return callback( err );
                }
                if( result && result[ 0 ] ) {
                    return update( result[ 0 ], callback );
                } else {
                    return create( callback );
                }
            } );
        }

        function checkApiAccess( params, callback ) {
            const
                { rest: { action, data } = {}, friend } = params,
                removeUrlWhiteList = [
                    '/1/practice/:getMyPractice',
                    '/1/document/:patientDocument',
                    '/1/location'
                ],
                forbidden = new Y.doccirrus.commonerrors.DCError( 401 );

            if( Y.doccirrus.auth.friendsList.UVITA !== friend ) {
                return setImmediate( callback );
            }
            switch( friend ) {
                case Y.doccirrus.auth.friendsList.UVITA:
                    if( 'blindproxy' === action && data && data.remoteurl && removeUrlWhiteList.includes( data.remoteurl ) ) {
                        return setImmediate( callback );
                    }
                    break;
            }
            return setImmediate( callback, forbidden );
        }

        Y.namespace( 'doccirrus.api' ).metaprac = {
            'loadMetaPracFromConfig': loadMetaPracFromConfig,
            'blindproxy': blindproxy,
            'mediaproxy': mediaproxy,
            'setBookFlag': setBookFlag,
            registerPRC: registerPRC,
            registerTenant: registerTenant,
            getPublicData: getPublicData,
            getPatientPractice: function( args ) {
                Y.log('Entering Y.doccirrus.api.metaprac.getPatientPractice', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.metaprac.getPatientPractice');
                }
                getPatientPractice( args );
            },
            checkApiAccess
        };

    },
    '0.0.1', {requires: ['metaprac-schema', 'dcblindproxy', 'dcauth']}
);