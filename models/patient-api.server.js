/**
 * User: rrrw
 * Date: 2/23/2013  09:45
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

// add this to the DBLayer TODO MOJ-805

'use strict';

YUI.add( 'patient-api', function( Y, NAME ) {
        /**
         * @module patient-api
         */

        const
            util = require( 'util' ),
            _ = require( 'lodash' ),
            EMITPATIENTEVENT = 'emitWebHookEvent',
            cluster = require( 'cluster' ),
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            { formatPromiseResult, handleResult, promisifyArgsCallback } = require( 'dc-core' ).utils,
            { logEnter, logExit } = require( '../server/utils/logWrapping.js' )(Y, NAME);

        var EventEmitter = require( 'events' ).EventEmitter,
            i18n = Y.doccirrus.i18n,
            internalEE,
            MERGENAME = NAME+"_merge";

        function callEmitWebHookEvent( params ) {
            Y.doccirrus.communication.emitWebHookEvent( {
                payload: params.msg,
                roomData: {
                    hook: 'patient',
                    action: params.eventAction,
                    query: {}
                },
                action: params.eventAction
            } );
        }

        if( cluster.isMaster ) {
            Y.doccirrus.ipc.subscribeNamed( EMITPATIENTEVENT, NAME, true, callEmitWebHookEvent );
        }

        function emitPatientSocketEvent( params ) {
            if( Y.doccirrus.ipc.isMaster() ) {
                callEmitWebHookEvent( params );
            } else {
                Y.doccirrus.ipc.send( EMITPATIENTEVENT, params, true, true );
            }
        }

        /**
         * HELPERS
         */
        /* jshint ignore:start */
        const getPatientFromCard = args => {
            const async = require( 'async' );

            const { callback, query, user, options } = args;
            const deviceId = query._id;

            async.waterfall( [
                ( next ) => {
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'cardreaderconfiguration',
                        user: user,
                        query: {
                            _id: deviceId
                        },
                        options: options
                    },(err, res)=>{
                        if (err) {
                            next(err, res);
                        } else {
                            if (res.result && res.result.length) {
                                const { port, driver, mobile, name, ds } = res.result[0];

                                Y.doccirrus.api.dscrmanager.readCard( {
                                    ...args,
                                    data: {
                                        callID: '',
                                        port,
                                        driver,
                                        mobile,
                                        name,
                                        deviceServerName: ds
                                    },
                                    callback(err, res){
                                        next( err, res );
                                    }
                                } );
                            } else {
                                next(res.errors);
                            }
                        }
                    } );
                },
                ( res, next ) => {
                    const { ids } = res;

                    if (ids && Array.isArray(ids) && ids.length) {
                        const crlogId = ids[0];
                        setTimeout( () => {
                            Y.doccirrus.mongodb.runDb( {
                                action: 'get',
                                model: 'crlog',
                                user: user,
                                query: {
                                    _id: crlogId
                                },
                                options: options
                            }, ( err, res ) => {
                                if( err ) {
                                    next( err, res );
                                } else {
                                    if( res.result && res.result.length ) {
                                        next( err, [res.result[0].parsedPatient] );
                                    } else {
                                        next( res.errors );
                                    }
                                }
                            } );
                        }, 2000 );
                    } else {
                        next(res.errors);
                    }
                }
            ], callback);
        };

        const getPatientFromCardBatch = args => {
            // const {callback, ...rest} = args,
            //     async = require( 'async' );

            const async = require( 'async' );

            const { callback, query, user, options } = args;
            const deviceId = query._id;

            let cardConf;

            async.waterfall( [
                ( next ) => {
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'cardreaderconfiguration',
                        user: user,
                        query: {
                            _id: deviceId
                        },
                        options: options
                    },(err, res)=>{
                        if (err) {
                            next(err, res);
                        } else {
                            if (res.result && res.result.length) {
                                cardConf = res;
                                Y.doccirrus.api.sdManager.getDeviceServerNames( {
                                    callback( err, res ) {
                                        next( err, {deviceServers: res, cardConf} );
                                    }
                                } );
                            } else {
                                next(res.errors);
                            }
                        }
                    } );
                },
                ( res, next ) => {
                    const {port, driver, mobile, name, ds} = res.cardConf.result[0];

                    Y.doccirrus.api.dscrmanager.readCardBatch( {
                        ...args,
                        data: {
                            callID: '',
                            port,
                            driver,
                            mobile,
                            name,
                            deviceServerName: ds,
                            deviceServers: res.deviceServers
                        },
                        callback( err, res ) {
                            next( err, res );
                        }
                    } );
                },
                ( res, next ) => {
                    const { ids } = res;

                    if (ids && Array.isArray(ids) && ids.length) {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            model: 'crlog',
                            user: user,
                            query: {
                                _id: {
                                    $in: ids
                                }
                            },
                            options: options
                        },(err, res)=>{
                            if (err) {
                                next(err, res);
                            } else {
                                if( res.result && res.result.length ) {
                                    let toSend = res.result.map( crlog => crlog.parsedPatient );

                                    next( err, toSend );
                                } else {
                                    next(res.errors);
                                }
                            }
                        });
                    } else {
                        next(res.errors);
                    }
                }
            ], callback);
        };
        /* jshint ignore:end */
        /**
         * Sends email with confirmation link to patient
         * @param {Object} params
         * @param {Object} params.user
         * @param {String} params.email
         * @param {String} params.patientId
         * @param {String} params.dcCustomerNo practice dcCustomerNo
         * @param {String} params.practiceName practice name
         */
        function sendConfirmEmail( params, callback ) {
            const { user } = params;
            var
                i18n = Y.doccirrus.i18n,
                jadeParams = {},
                emailOptions = {},
                lang = i18n( 'patientRegistration.emailConfirm' ),
                buttonText = i18n( 'general.button.CONFIRM' ),
                myEmail;

            jadeParams.text = Y.Lang.sub( lang.text, {practiceName: params.practiceName} );
            jadeParams.link = Y.doccirrus.auth.getPUCUrl( '/intime/confirm?email=' + params.email + '&patientId=' + params.patientId + '&customerIdPrac=' + params.dcCustomerNo );
            jadeParams.buttonText = buttonText;

            emailOptions.subject = lang.subject;
            emailOptions = Y.mix( emailOptions, {
                serviceName: 'patientService',
                jadeParams: jadeParams,
                jadePath: './mojits/PatPortalMojit/views/portal_confirm_email.jade.html',
                to: params.email
            } );

            myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
            Y.doccirrus.email.preventBccToDC( myEmail );
            Y.doccirrus.email.sendEmail( { ...myEmail, user }, callback );
        }

        /**
         * API
         */

        //
        // utility classes
        //

        /**
         * The DC Patient API
         *
         * This is the server code that implements the external Interfaces
         * of REST for the patient API. (Similar to the scheduler API in
         * functionality, but the scheduler API still needs to be restructured
         * and renamed from the old pattern)
         *
         * @class patient-api
         */

        /**
         * Helper function populating markers in a list of patients.
         * @param model
         * @param patientList will be a wrapped result if paging is enabled
         * @param callback
         */
        function populateMarkers( model, data, callback ) {
            var
                patientArray = data.result || data; // get the patient array
            require( 'async' ).each( patientArray, function forPatient( patient, _cb ) {
                if( patient.markers ) {
                    // filter out placeholder
                    patient.markers = patient.markers.filter( function( val ) {
                        return val.match( /^[a-z0-9]+$/ );
                    } );
                }

                model.mongoose.populate( patient, [
                    {
                        path: 'markers',
                        select: 'description icon severity',
                        model: 'marker'
                    }
                ], _cb );

            }, function( err ) {
                if( err ) {
                    Y.log( "Couldn't populate markers: \n" + err, 'error', NAME );
                }
                callback( err, data );
            } );
        }

        /**
         * updates a patients markers array
         *
         * @param ac
         * @param dataFn
         * @param callback
         * @private
         */
        function _updateMarkers( args, dataFn, callback ) {
            var
                restUser = args.user,
                params = args.originalParams;

            function _getPatient( args, callback ) {
                if( !params.patient ) {
                    return callback( 'patient id missing in request' );
                }
                if( !restUser ) {
                    return callback( 'not authorized' );
                }
                Y.doccirrus.mongodb.runDb( {
                    user: restUser,
                    model: 'patient',
                    action: 'get',
                    query: {_id: params.patient},
                    options: {limit: 1},
                    callback: function( err, patient ) {
                        if( patient && Array.isArray( patient ) && patient.length ) {
                            return callback( null, patient[0] );
                        }
                        if( err ) {
                            return callback( err );
                        }
                        callback( patient ? null : 'no such patient: ' + params.patient, patient );
                    }
                } );
            }

            if( !params.marker ) {
                return callback( 'marker id array missing in request' );
            }

            if( !Array.isArray( params.marker ) ) {
                return callback( 'invalid value for marker param: ' + params.marker );
            }

            _getPatient( args, function( err, patient ) {
                var
                    data = {
                        skipcheck_: true
                    },
                    flatten = function( o ) {
                        return (o && ('object' === typeof o)) ? o._id : o;
                    };

                if( err ) {
                    return callback( err );
                }

                data.markers = dataFn( (patient.markers || []).map( flatten ) || [], params.marker );

                Y.log( 'attaching markers ' + JSON.stringify( data.markers ) + ' to patient ' + patient._id, 'debug', NAME );

                Y.doccirrus.mongodb.runDb( {
                    user: restUser,
                    model: 'patient',
                    action: 'put',
                    query: {_id: params.patient},
                    fields: 'markers',
                    data: data,
                    callback: callback
                } );
            } );
        }

        function addMarkers( args ) {
            Y.log('Entering Y.doccirrus.api.patient.addMarkers', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.addMarkers');
            }
            var
                callback = args.callback;

            function uniq( a ) {
                return a.reduce( function( p, c ) {
                    if( p.indexOf( c ) < 0 ) {
                        p.push( c );
                    }
                    return p;
                }, [] );
            }

            _updateMarkers( args, function( patientMarker, paramsMarker ) {
                return uniq( (patientMarker).concat( paramsMarker ) );
            }, callback );
        }

        function removeMarkers( args ) {
            Y.log('Entering Y.doccirrus.api.patient.removeMarkers', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.removeMarkers');
            }
            var
                callback = args.callback;

            _updateMarkers( args, function( patientMarker, paramsMarker ) {
                return patientMarker.filter( function( val ) {
                    return paramsMarker.indexOf( val ) === -1;
                } );
            }, callback );
        }

        /**
         * get an array of activities in a quarter for a specified date
         * @param {object} user
         * @param {object} options
         * @param {string} [options.date]
         * @param {string} [options.patientId]
         * @param {string} [options.actType]
         * @param {string} [options.caseFolderId]
         * @param {Array} [options.status]
         * @param {function} callback
         */
        function getActivitiesInQuarterFromDate( user, options, callback ) {
            var
                moment = require( 'moment' ),
                date = moment( options.date ),
                quarterRange,
                query;

            if( !options.date || !date.isValid() ) {
                return callback( new Error( 'getActivitiesInQuarterFromDate: invalid date' ) );
            }

            quarterRange = Y.doccirrus.commonutils.getDateRangeByQuarter( date.quarter(), date.year() );
            query = {
                timestamp: {
                    $gte: quarterRange.start,
                    $lte: quarterRange.end
                }
            };

            if( options.patientId ) {
                query.patientId = options.patientId;
            }
            if( options.actType ) {
                query.actType = options.actType;
            }
            if( options.caseFolderId ) {
                query.caseFolderId = options.caseFolderId;
            }
            if( options.status ) {
                query.$and = options.status;
            }
            Y.doccirrus.mongodb.runDb( {
                model: 'activity',
                user: user,
                query: query,
                callback: callback
            } );
        }

        /**
         * get an array of activities for current quarter
         * @param {object} user
         * @param {object} options
         * @param {string} [options.patientId]
         * @param {string} [options.actType]
         * @param {function} callback
         */
        function getActivitiesInCurrentQuarter( user, options, callback ) {
            options = options || {};
            var
                moment = require( 'moment' ),
                today = moment();

            options.date = today;

            getActivitiesInQuarterFromDate( user, options, callback );
        }

        /**
         *  Find last Schein in casefolder, to set location when creating new activities
         *
         *  This will prefer the last Schein created by the current user, if any, falling back to the latest
         *  schein at any location.  This is distinct from lastSchein method below in that it does not require
         *  a location.
         *
         *  Will call back null if none found
         *
         *  @param  args                                {Object}    REST v1
         *  @param  args.user                           {Object}    REST user or equivalent
         *  @param  args.originalParams                 {Object}
         *  @param  args.originalParams.casefolderId    {String}
         *  @param  args.callback                       {Function}  Of the form fn( err, schein )
         */

        function lastScheinForUser( args ) {
            Y.log('Entering Y.doccirrus.api.patient.lastScheinForUser', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.lastScheinForUser');
            }
            var
                async = require( 'async' ),
                params = args.query || args.originalParams || {},
                caseFolderId = params.caseFolderId || null,
                foundIdentity = null,
                foundEmployee = null,
                foundSchein = null;

            if ( !caseFolderId ) {
                return args.callback( Y.doccirrus.errors.rest( 404, 'caseFolderId not given' ) );
            }

            async.series( [ getIdentity, getEmployee, lookupScheine ], onAllDone );

            //  Look up identity of current user (we need to load employee object, of any)
            function getIdentity( itcb ) {
                //  skip if no identity for this user (should not happen)
                if ( !args.user.identityId ) { return itcb( null ); }

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'identity',
                    'query': { '_id': args.user.identityId },
                    'options': { 'lean': true },
                    'callback': onIdentityLoaded
                } );

                function onIdentityLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    foundIdentity = result[0] || null;
                    itcb( null );
                }
            }

            //  Load employee object corresponding to current user
            function getEmployee( itcb ) {
                //  skip if no idenity for this user (should not happen)
                if ( !foundIdentity || !foundIdentity.specifiedBy ) { return itcb( null ); }

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'employee',
                    'query': { '_id': foundIdentity.specifiedBy },
                    'options': { 'lean': true },
                    'callback': onEmployeeloaded
                } );

                function onEmployeeloaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    foundEmployee = result[0] || null;
                    itcb( null );
                }
            }

            //  Load all Scheine from this casefolder, by date, and compare to current user's employeeNo
            function lookupScheine( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'activity',
                    'query': {
                        'caseFolderId': caseFolderId,
                        'actType':  { $in: Y.doccirrus.schemas.v_contract.scheinActTypes }
                    },
                    'options': {
                        'lean': true,
                        'sort': { 'timestamp': -1 }
                    },
                    'callback': onScheineLoaded
                } );

                function onScheineLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    var i, j, editor;

                    //  first look for latest schine edited by current user
                    for ( i = 0; i < result.length; i++ ) {
                        if ( !foundSchein && result[i].editor ) {
                            for ( j = 0; j < result[i].editor.length; j++ ) {
                                editor = result[i].editor[j];
                                if ( editor.employeeNo === foundEmployee.employeeNo ) {
                                    foundSchein = result[i];
                                }
                            }
                        }
                    }

                    //  if none found for this user, then just use the most recent
                    for ( i = 0; i < result.length; i++ ) {
                        if ( !foundSchein ) {
                            foundSchein = result[i];
                        }
                    }
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not look uplatest schein for user: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }
                args.callback( null, foundSchein );
            }
        }

        /**
         * Searches for last schein in casefolder
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.patientId
         * @param {String} args.query.caseFolderId
         * @param {String} args.query.actType  optional, supply specific type, e.g. BGSCHEIN
         *                                      otherwise, looks for all existing Schein types.
         * @param {String} args.query.locationId required for ASV case folders
         * @param {String} args.query.scheinType - Query specific ScheinType
         * @param {String} args.query.timestamp top time border for search
         * @param {String} args.query.gteTimestamp bottom time border for search
         * @param {Object} args.options
         * @param {Boolean} args.options.doNotQueryCaseFolder=false
         * @param {Function} args.callback
         */
        async function lastSchein( args ) {
            const
                timer = logEnter( 'Y.doccirrus.api.patient.lastSchein' ),
                getLocationSetP = promisifyArgsCallback( Y.doccirrus.api.location.getLocationSet );

            let
                {
                    callback,
                    user,
                    options = {},
                    query: params
                } = args,
                {
                    patientId,
                    caseFolderId,
                    timestamp,
                    locationId
                } = params,
                queryCaseFolder = !options.doNotQueryCaseFolder,
                settings = Y.doccirrus.api.settings.getSettings( user ),
                isISD = Y.doccirrus.auth.isISD();

            if( !patientId ) {
                logExit( timer );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'missing params: [patientId]'} ), undefined, callback );
            }

            if( !caseFolderId && queryCaseFolder ) {
                logExit( timer );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'missing params: [caseFolderId]'} ), undefined, callback );
            }

            if( !timestamp ) {
                logExit( timer );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'missing params: [timestamp]'} ), undefined, callback );
            }

            let
                query = {
                    actType: (params.actType ? params.actType : {$in: Y.doccirrus.schemas.v_contract.scheinActTypes}),
                    patientId: params.patientId,
                    timestamp: {
                        $lte: params.timestamp
                    },
                    status: {$ne: 'CANCELLED'}
                };

            if( queryCaseFolder ) {
                query.caseFolderId = params.caseFolderId;
            }

            if( params.gteTimestamp ) {
                query.timestamp.$gte = params.gteTimestamp;
            }

            if( params.scheinType ) {
                query.scheinType = params.scheinType;
            }

            if( !locationId && true === (settings && settings.noCrossLocationAccess) && 'su' !== user.id && user.locations ) {
                query.locationId = {$in: user.locations.map( location => location._id )};
            } else if( locationId && !isISD ) {
                query.locationId = {
                    $in: [locationId]
                };
                const [err, locations] = await formatPromiseResult(
                    getLocationSetP( {
                        user,
                        query: {
                            _id: locationId
                        },
                        options: {
                            select: {
                                _id: 1
                            },
                            lean: true,
                            migrate: true
                        }
                    } )
                );
                if( err ) {
                    logExit( timer );
                    return handleResult( err, undefined, callback );
                }
                if( locations.length ) {
                    query.locationId.$in = locations.map( location => location._id.toString() );
                }
            }

            let employeeQuery = {
                status: 'ACTIVE'
            };
            if( query.locationId ) {
                employeeQuery["locations._id"] = {
                    $in: query.locationId.$in
                };
            }
            let [err, activeEmployees] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'get',
                    query: employeeQuery
                } )
            );
            if( err ) {
                logExit( timer );
                return handleResult( err, undefined, callback );
            }
            if( !activeEmployees || !activeEmployees.length ) {
                logExit( timer );
                return handleResult( undefined, [], callback );
            }
            query.employeeId = {
                $in: activeEmployees.map( employee => employee._id.toString() )
            };

            let lastScheinFromActivities;
            [err, lastScheinFromActivities] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    migrate: true,
                    query: query,
                    options: {
                        sort: {
                            timestamp: -1
                        },
                        limit: 1,
                        lean: true
                    }
                } )
            );

            logExit( timer );
            if( err ) {
                return handleResult( err, undefined, callback );
            }
            return handleResult( undefined, lastScheinFromActivities, callback );
        }

        /**
         * Gets scheins to which array of given activities are binded
         *
         * @param {object} args
         * @param {object} args.user
         * @param {object} args.activities
         * @return {Array} of scheins with relatedActivitiesIds
         */
        async function getScheinsFromActivities( args ) {
            Y.log('Entering Y.doccirrus.api.patient.getScheinsFromActivities', 'info', NAME);

            const {user, activities = [], params = {}} = args,
                scheinTypes = params.scheinTypes || Y.doccirrus.schemas.activity.scheinActTypes,
                sortedActivities = activities.sort( ( a, b ) => new Date( b.timestamp ) - new Date( a.timestamp ) ),
                groupedActivities = _.groupBy( sortedActivities, 'caseFolderId' ),
                caseFolderIds = Object.keys( groupedActivities );

            let error, scheins = [];
            for( let caseFolderId of caseFolderIds ) {
                const groupAcivities = groupedActivities[caseFolderId],
                    latestDate = groupAcivities[0].timestamp,
                    earliestDate = groupAcivities[groupAcivities.length - 1].timestamp,
                    query = {
                        locationId: groupAcivities[0].locationId,
                        patientId: groupAcivities[0].patientId,
                        caseFolderId: caseFolderId,
                        actType: {
                            $in: scheinTypes
                        },
                        timestamp: {
                            $lte: latestDate
                        }
                    };

                let groupScheins = [], result;

                // get earliest schein
                [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    model: 'activity',
                    user: user,
                    query: {
                        ...query,
                        timestamp: {
                            $lte: earliestDate
                        }
                    },
                    options: {
                        sort: {
                            timestamp: -1
                        },
                        limit: 1
                    }
                } ) );

                if( error || !Array.isArray( result ) || !result.length ) {
                    error = error || new Y.doccirrus.commonerrors.DCError( 404, { message: 'last schein not found' } );
                    Y.log( `getScheinsFromActivities: Failed to get latest schein for casefolder: ${caseFolderId}.\nError: ${error.stack || error}`, 'error', NAME );
                    continue;
                }
                query.timestamp.$gt = result[0].timestamp;
                [error, groupScheins] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: query,
                    options: {
                        sort: {
                            timestamp: -1
                        }
                    }
                } ) );

                if( error ) {
                    Y.log( `getScheinsFromActivities: Failed to get schein by query: ${JSON.stringify( query )}.\nError: ${error.stack || error}`, 'error', NAME );
                    continue;
                }
                groupScheins = (groupScheins || []).concat( result ).map( ( schein, index ) => {
                    const laterSchein = groupScheins[index - 1],
                        scheinDate = new Date( schein.timestamp ),
                        laterScheinDate = laterSchein ? new Date( laterSchein.timestamp ) : new Date();
                    const relatedActivitiesIds = groupAcivities.filter( activity => {
                        const activityDate = new Date( activity.timestamp );
                        return activityDate > scheinDate &&
                               activityDate < laterScheinDate;
                    } );
                    return {
                        ...schein,
                        relatedActivitiesIds
                    };
                } );
                scheins = scheins.concat( groupScheins );
            }
            Y.log('Exiting Y.doccirrus.api.patient.getScheinsFromActivities', 'info', NAME);
            return scheins;
        }

        /**
         * Get last AU inbetween timestamp and 3 month before timestamp.
         *
         * @param args
         */
        function lastAU( args ) {
            Y.log('Entering Y.doccirrus.api.patient.lastAU', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.lastAU');
            }
            var user = args.user,
                moment = require( 'moment' ),
                params = args.originalParams,
                callback = args.callback;

            if( !params.patientId || !params.caseFolderId || !params.timestamp ) {
                callback( new Error( 'insufficient arguments' ) );
                return;
            }

            Y.doccirrus.mongodb.runDb( {
                model: 'activity',
                user: user,
                migrate: true,
                query: {
                    actType: 'AU',
                    caseFolderId: params.caseFolderId,
                    patientId: params.patientId,
                    timestamp: {
                        $lte: params.timestamp,
                        $gte: moment( params.timestamp ).subtract( 3, 'month' ).toJSON()
                    }
                },
                options: {
                    sort: {
                        timestamp: -1
                    },
                    limit: 1,
                    lean: true
                },
                callback: callback
            } );

        }

        /**
         * Checks if patient has at least one actually documented schein. Imported scheins are not considered.
         *
         * @param args
         * @param args.patientId
         */
        async function hasDocumentedSchein( args ) {
            Y.log( 'Entering Y.doccirrus.api.patient.hasDocumentedSchein', 'info', NAME );
            if( args.callback ) {
                args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.patient.hasDocumentedSchein' );
            }
            const {formatPromiseResult} = require( 'dc-core' ).utils;
            const {user, originalParams, callback} = args;

            if( !originalParams.patientId ) {
                callback( Error( 'insufficient arguments' ) );
                return;
            }

            const patientId = originalParams.patientId;

            let [err, notImportedCaseFolders] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                model: 'casefolder',
                user,
                query: {patientId, imported: {$ne: true}},
                options: {select: ['_id']}
            } ) );

            if( err ) {
                Y.log( `could not non imported case folders: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }

            if( !notImportedCaseFolders.length ) {
                callback( null, false );
                return;
            }

            let result;
            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                model: 'activity',
                user,
                query: {
                    actType: {$in: Y.doccirrus.schemas.activity.scheinActTypes},
                    patientId,
                    caseFolderId: {$in: notImportedCaseFolders.map( cf => cf._id )},
                    status: {$ne: 'IMPORTED'}
                },
                options: {
                    limit: 1
                }
            } ) );

            if( err ) {
                Y.log( `could not get first schein: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }

            callback( null, Boolean( result.length ) );
        }


        function patientsWithoutCardSwipe( args ) {
            Y.log('Entering Y.doccirrus.api.patient.patientsWithoutCardSwipe', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.patientsWithoutCardSwipe');
            }
            var async = require( 'async' ),
                moment = require( 'moment' ),
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                user = args.user,
                callback = args.callback,
                params = args.originalParams || {},
                options = args.options || {},
                start = moment().startOf( 'quarter' ).toDate(),
                end = moment().endOf( 'quarter' ).toDate(),
                timeQuery = {
                    $lte: end,
                    $gte: start
                },
                match = {
                    actType: 'SCHEIN',
                    timestamp: timeQuery
                };

            if( Array.isArray( params.locationFilter ) && params.locationFilter.length ) {
                match.locationId = {
                    $in: params.locationFilter.map( function( id ) {
                        return new ObjectId( id );
                    } )
                };
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', next );
                },
                function( activityModel, next ) {
                    activityModel.mongoose.aggregate( [
                        {
                            $match: match
                        },
                        {
                            $group: {
                                _id: {patientId: "$patientId"}
                            }
                        }
                    ], next );
                },
                function( results, next ) {
                    async.map( results, function( result, cb ) {
                        cb( null, result._id.patientId );
                    }, next );
                },
                function( patientIds, next ) {
                    var
                        query = {
                            _id: {$in: patientIds},
                            insuranceWOCard: { $not: { $exists: true, $ne: null } },
                            $or: [
                                // MOJ-14319: [OK] [CARDREAD]
                                {'insuranceStatus.0.type': 'PUBLIC', 'insuranceStatus.0.cardSwipe': {$not: timeQuery}},
                                {'insuranceStatus.1.type': 'PUBLIC', 'insuranceStatus.1.cardSwipe': {$not: timeQuery}},
                                {'insuranceStatus.2.type': 'PUBLIC', 'insuranceStatus.2.cardSwipe': {$not: timeQuery}},
                                {'insuranceStatus.3.type': 'PUBLIC', 'insuranceStatus.3.cardSwipe': {$not: timeQuery}},
                                {'insuranceStatus.4.type': 'PUBLIC', 'insuranceStatus.4.cardSwipe': {$not: timeQuery}},
                                {'insuranceStatus.5.type': 'PUBLIC', 'insuranceStatus.5.cardSwipe': {$not: timeQuery}}
                            ]
                        };

                    Y.doccirrus.api.patient.patientsPopulated( user, query, options, next );
                }
            ], callback );

        }

        /**
         * Gets next schein regardless of quarter.
         *
         * @param args
         * @param args.user
         * @param args.originalParams
         * @param args.originalParams.caseFolderId
         * @param args.originalParams.patientId
         * @param args.originalParams.timestamp
         * @param [args.originalParams.locationId]
         * @param [args.originalParams.statuses]
         * @param {Boolean} [args.originalParams.invertStatusQuery] (default false)
         * @param {Boolean} [args.originalParams.nonGreedy] (default false)   if true take next closest Schein
         * @param args.callback
         */
        function getNextSchein( { user, originalParams: params, callback } ) {
            Y.log('Entering Y.doccirrus.api.patient.getNextSchein', 'info', NAME);
            if (callback) {
                callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(callback, 'Exiting Y.doccirrus.api.budget.calculate');
            }

            function nextScheinCb( err, scheins ) {
                if( err ) {
                    return callback( err );
                }
                callback( null, scheins );
            }

            let query = {
                actType: {$in: Y.doccirrus.schemas.v_contract.scheinActTypes},
                caseFolderId: params.caseFolderId,
                patientId: params.patientId,
                timestamp: {
                    $gt: params.timestamp
                }
            };

            if( params.locationId ) {
                query.locationId = params.locationId;
            }

            if( params.statuses ) {
                query.status = params.invertStatusQuery ? { $nin: params.statuses } : { $in: params.statuses };
            }

            Y.doccirrus.mongodb.runDb( {
                model: 'activity',
                user: user,
                query: query,
                options: {
                    sort: {
                        timestamp: ( true === params.nonGreedy ) ? 1 : -1
                    },
                    limit: 1
                },
                callback: nextScheinCb
            } );

        }

        /**
         * gives an array of schein activites for patient and in a quarter for a specified date
         *
         * Note: In non public cases the quarter range is ignored!
         *
         * @method scheinForQuarterFromDate
         * @param {object} parameters
         * @param {string} parameters.date
         * @param {string} parameters.patientId
         * @param {string} parameters.caseFolderId
         * @async
         */
        function scheinForQuarterFromDate( parameters ) {
            Y.log('Entering Y.doccirrus.api.patient.scheinForQuarterFromDate', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.patient.scheinForQuarterFromDate');
            }
            var scheinType,
                callback = parameters.callback,
                params = parameters.originalParams,
                user = parameters.user,
                statusQuery = [
                    {status: {$ne: 'BILLED'}},
                    {status: {$ne: 'CANCELLED'}}
                ];

            function finalCb( err, scheins ) {
                if( err ) {
                    Y.log( 'could not find schein for current quarter ' + err, 'error', NAME );
                    return callback( err );
                }

                callback( null, {scheins: scheins, scheinType: scheinType} );
            }

            function getScheins( caseFolder, cb ) {
                scheinType = Y.doccirrus.commonutils.mapInsuranceTypeToScheinType( caseFolder.type );

                if( !scheinType ) {
                    return cb( new Error( 'could not map schein type from insurance type' ) );
                }

                if( 'SCHEIN' === scheinType ) {
                    getActivitiesInQuarterFromDate( user, {
                        date: params.date,
                        patientId: params.patientId,
                        actType: 'SCHEIN',
                        caseFolderId: params.caseFolderId,
                        status: statusQuery
                    }, cb );
                } else {
                    Y.doccirrus.mongodb.runDb( {
                        model: 'activity',
                        user: user,
                        query: {
                            patientId: params.patientId,
                            actType: scheinType,
                            caseFolderId: params.caseFolderId,
                            $and: statusQuery
                        },
                        callback: cb
                    } );
                }
            }

            function getCaseFolder( cb ) {
                if( Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId() === params.caseFolderId ) {
                    return cb( null, {
                        _id: Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId(),
                        type: 'PREPARED'
                    } );
                }
                Y.doccirrus.mongodb.runDb( {
                    model: 'casefolder',
                    user: user,
                    query: {
                        _id: params.caseFolderId,
                        patientId: params.patientId
                    },
                    callback: function( err, caseFolders ) {
                        if( err ) {
                            return cb( err );
                        }

                        if( !caseFolders || !caseFolders.length ) {
                            return cb( new Error( 'could not find case folder' ) );
                        }

                        cb( null, caseFolders[0] );
                    }
                } );
            }

            if( !params.patientId || !params.caseFolderId ) {
                finalCb( new Error( 'insufficient arguments' ) );
                return;
            }

            require( 'async' ).waterfall( [getCaseFolder, getScheins], finalCb );
        }

        /**
         * gives an array of schein activites for patient and current quarter
         *
         * Note: In non public cases the quarter range is ignored!
         *
         * @method scheinForCurrentQuarter
         * @param {object} parameters
         * @param {string} parameters.patientId
         * @param {string} parameters.caseFolderId
         * @async
         */
        function scheinForCurrentQuarter( parameters ) {
            Y.log('Entering Y.doccirrus.api.patient.scheinForCurrentQuarter', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.patient.scheinForCurrentQuarter');
            }
            parameters = parameters || {};
            parameters.originalParams = parameters.originalParams || {};
            var
                moment = require( 'moment' );

            parameters.originalParams.date = moment().toJSON();

            scheinForQuarterFromDate( parameters );
        }

        function getPatientById( args ) {
            var queryParams = args.query || {},
                patientData = queryParams.patientData || {};
            if( undefined === patientData.patientId ) {
                args.callback( null, [] );
                return;
            }
            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'patient',
                user: args.user,
                query: {
                    _id: patientData.patientId
                },
                callback: args.callback
            } );
        }

        function getPatientByAlternativeId( args ) {
            var queryParams = args.query || {},
                patientData = queryParams.patientData || {};
            if( undefined === patientData.alternativeId ) {
                args.callback( null, [] );
                return;
            }
            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'patient',
                user: args.user,
                query: {
                    alternativeId: patientData.alternativeId
                },
                callback: args.callback
            } );
        }

        function addPatient( args ) {
            var
                patientExists,
                params = args.data || {},
                patientData = params.patientData || {},
                cleanTelecardioSerial = patientData && 'optionA' === patientData.telekardioSerialEditedOption,
                oldSerial = patientData.telekardioSerialOldSerial,
                internal_message = {
                    eventType: 'NewPatient',
                    content: patientData || '',
                    senderId: 'MISMojit_controller',
                    modelName: 'patient'
                };

            function finalCb( err, result, post ) {
                if( err ) {
                    Y.log( "Error addPatients (finalCb): \n" + err, 'error', NAME );
                    return args.callback( err );
                }
                if( post ) {
                    internal_message.eventType = 'NewPatient';
                } else {
                    internal_message.eventType = 'AlterPatient';
                }
                internal_message.content._id = result && result[0] && result[0]._id || result && result[0];
                internalEE.emit( 'INTERNAL_MESSAGE_EVT', internal_message );
                args.callback( err, result );

            }

            function telecardioCheck( err, result, post ) {

                if( err ) {
                    Y.log( "Error addPatients (telecardioCheck): \n" + err, 'error', NAME );
                    return args.callback( err );
                }
                const
                    CARDIO_PARTNER_ID = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO,
                    partnerId = (patientData.partnerIds || []).find( function( partner ) {
                        return partner.partnerId === CARDIO_PARTNER_ID;
                    } ),
                    newSerial = partnerId && partnerId.patientId;

                if( cleanTelecardioSerial && oldSerial && oldSerial !== newSerial ) {
                    editTelekardioSerial( {
                        user: args.user,
                        originalParams: {
                            patientId: patientData._id.toString(),
                            telekardioPartner: { patientId: oldSerial },
                            clearPrevious: true
                        },
                        callback: err => {
                            if( err ) {
                                Y.log( "Error addPatients (telecardioCheck->editTelekardioSerial) : \n" + err, 'error', NAME );
                                return args.callback( err );
                            }
                            finalCb( null, result, post );
                        }
                    } );

                } else {
                    finalCb( null, result, post );
                }
            }

            function readPatient( err, id, post, callback ) {

                if( !id && !post && !err ){
                    err = Y.doccirrus.errors.rest( 404, 'Patient not found');
                }

                if( err ) {
                    return callback( err );
                }

                Y.doccirrus.api.patient.get( {
                    user: args.user,
                    query: {
                        _id: id
                    },
                    callback: function( err, results ) {
                        callback( err, results, post );
                    }
                } );

            }

            function putOrPost( user, patientData, callback ) {
                var
                    fields = (args.fields && args.fields.length) ? args.fields : null,
                    query = (args.query && Object.keys( args.query ).length) ? args.query : null;

                Y.doccirrus.filters.cleanDbObject( patientData );

                if( patientData._id && !patientData.isNew ) { // we might want post with preset id
                    delete patientData.fields_;
                    Y.doccirrus.mongodb.runDb( {
                        action: 'put',
                        model: 'patient',
                        user: user,
                        fields: fields || Object.keys( patientData ),
                        data: patientData,
                        query: query || {
                            _id: patientData._id
                        },
                        callback: function( err, result ) {
                            return readPatient( err, result && result._id, false, callback );
                        }

                    } );
                } else if( patientExists ) { // found patient with alternativeId
                    // hacky MG DATA thing --> should be cleaned up in the data import and using a well known PHYSICIAN _id for master physician
                    delete patientData.fields_;
                    Y.doccirrus.mongodb.runDb( {
                        action: 'put',
                        model: 'patient',
                        user: user,
                        fields: Object.keys( patientData ),
                        data: patientData,
                        query: {
                            alternativeId: patientData.alternativeId
                        },
                        callback: function( err, result ) {
                            return readPatient( err, result && result._id, false, callback );
                        }
                    } );

                } else if( patientData.isNew || !patientData._id ) {
                    Y.doccirrus.mongodb.runDb( {
                        action: 'post',
                        model: 'patient',
                        user: user,
                        data: patientData,
                        callback: function( err, result ) {
                            return readPatient( err, result && result[0], true, callback );
                        }

                    } );
                } else {
                    return callback();
                }
            }

            getPatientByAlternativeId( {
                user: args.user,
                query: {
                    patientData: patientData
                },
                callback: function afterGetPatient( err, patient ) {
                    if( err ) {
                        Y.log( "Error getPatientByAlternativeId (afterGetPatient): \n" + err, 'error', NAME );
                        return args.callback( err );
                    }
                    patientExists = ( 0 < patient.length );

                    if( patientData.countryMode && patientData.countryMode[0] ) {
                        putOrPost( args.user, patientData, telecardioCheck );
                    } else {
                        Y.doccirrus.api.practice.getMyPractice( {
                            user: args.user,
                            callback: function( err, myPrac ) {
                                if( err ) {
                                    Y.log( `Error getPatientByAlternativeId (getMyPractice): \n + ${err.stack || err}`, 'error', NAME );
                                    args.callback( err );
                                } else {
                                    patientData.countryMode = ( myPrac && myPrac.countryMode ) || ['D'];
                                    putOrPost( args.user, patientData, telecardioCheck );
                                }
                            }
                        } );
                    }
                }
            } );
        }

        function _registerInternalEventEmitter() {
            var
                id = setInterval( function() {
                    if( Y.doccirrus.istack ) {
                        if( !internalEE ) { //just once
                            internalEE = new EventEmitter();
                            Y.doccirrus.istack.register( internalEE );
                            return clearInterval( id );
                        }
                    }
                }, 1000 );
        }

        _registerInternalEventEmitter();

        /**
         * a patientNo is valid if it is unique
         * @param args
         */
        function checkPatientNo( args ) {
            let
                queryParams = args.query || {},
                query = { patientNo: (queryParams.patientNo || '').toString() },
                callback = args.callback,
                user = args.user;

            if( queryParams.patientId ) {
                query._id = {$ne: queryParams.patientId};
            }

            function checkStep1() {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'count',
                    query: query,
                    callback: function( err, count ) {
                        if( err ) {
                            Y.log( 'error getting patient by number: ' + JSON.stringify( err ), 'error', NAME );
                            return callback( err );
                        }

                        if( 0 < count ) {
                            return callback( Y.doccirrus.errors.rest( 7100, 'The patient number is not valid', true ) );

                        }
                        callback( err, queryParams.patientNo );
                    }
                } );
            }

            checkStep1();
        }

        /**
         *  Find the smallest available patient number after or equal to startNumber or the current counter number
         *
         *  @param  {Object}    user
         *  @param  {Number}    startNumber     Optional
         *  @returns {Promise<*>}
         */

        async function getNextPatientNumber( user, startNumber ) {
            const
                getPatientCounterP = util.promisify( Y.doccirrus.schemas.sysnum.getPatientCounter ),
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),

                // the whole patient pool is visible only to SU
                _user = Y.doccirrus.auth.getSUForTenant( user.tenantId );

            let
                checkNumber = startNumber,
                compareNumber,
                err, result,
                patientModel,
                counter,
                cursor,
                checkEntry;

            Y.log( `getNextPatientNumber: Checking next patient number, starting from: ${startNumber}`, 'info', NAME );

            //  1.  Create a patient model

            [ err, patientModel ] = await formatPromiseResult( getModelP( _user, 'patient', false ) );

            if ( err ) {
                Y.log( `getNextPatientNumber: Error creating patient model: ${err.stack||err}`, 'error', NAME );
                throw err;
            }

            //  2.  If no startNumber was given (or is 0), try load the value of the sysnum

            if ( !startNumber ) {
                [ err, result ] = await formatPromiseResult( getPatientCounterP( _user ) );

                if ( err ) {
                    Y.log( `getNextPatientNumber: Can not get the patient counter sysnum: ${err.stack||err}`, 'error', NAME );
                    throw err;
                }

                counter = result && result[0];
                checkNumber = counter.number;
            }

            //  3.  Query patients collection for patient numbers equal to or greater than this

            cursor = patientModel.mongoose.find( { patientNo: { $gte: `${checkNumber}` } }, { patientNo: 1 } )
                .sort( { patientNo: 1 } )
                .collation( { locale: 'de', numericOrdering: true } )
                .lean()
                .cursor();

            while ( checkEntry = await cursor.next() ) {        //  eslint-disable-line no-cond-assign

                try {
                    compareNumber = parseInt( checkEntry.patientNo, 10 );
                } catch ( parseErr ) {
                    Y.log( `getNextPatientNumber: Invalid patient number: ${checkEntry.patientNo}`, 'error', NAME );
                    //  continue with a valid number
                    break;
                }

                if ( checkNumber === compareNumber ) {
                    //  a patient already exists with this number, try the next one
                    checkNumber++;
                } else {
                    //  no patient with this patient number, we are done
                    cursor.close();
                    break;
                }
            }

            Y.log( `getNextPatientNumber: Have next patient number: ${checkNumber}`, 'info', NAME );

            return checkNumber;
        }

        /**
         * Saves attached activity id and content to display
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.patientId patient id
         * @param {String} args.query.activityId attached activity id
         * @param {String} args.query.attachedContent attached content
         * @param {Function} args.callback
         */
        function attachActivity( args ) {
            var queryParams = args.query || {},
                async = require( 'async' );

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( args.user, 'patient', true, next );
                },
                function( patientModel, next ) {

                    var patientData = {};
                    if( queryParams.activityId ) {
                        patientData.attachedActivity = queryParams.activityId;
                    }
                    if( queryParams.content ) {
                        patientData.attachedContent = queryParams.content;
                    }
                    if( queryParams.severity ) {
                        patientData.attachedSeverity = queryParams.severity;
                    }
                    patientModel.mongoose.findOneAndUpdate( {_id: queryParams.patientId}, {$set: patientData}, {new: true}, next );
                }
            ], args.callback );

        }

        /**
         * Removes attached activity id and content to display
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.patientId patient id query
         * @param {Function} args.callback
         */
        function detachActivity( args ) {
            const
                query = args.query || {},
                async = require( 'async' );

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( args.user, 'patient', true, next );
                },
                function( patientModel, next ) {
                    const
                        patientData = {};
                    patientData.attachedActivity = '';
                    patientData.attachedContent = '';
                    patientModel.mongoose.findOneAndUpdate( {_id: query.patientId}, {$set: patientData}, {new: true}, next );
                }
            ], args.callback );

        }

        /**
         * Deletes patient, all related activities and casefolders
         * @param {Object} args
         */
        function deletePatient( args ) {
            var user = args.user,
                callback = args.callback,
                query = args.query,
                async = require( 'async' ),
                activityAmount = 0;
            if( !query ) {
                return callback( Y.doccirrus.errors.rest( 400, '_id is missing' ) );
            }
            function deletePatientData() {
                async.series( [
                    function( done ) {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            user: user,
                            model: 'activity',
                            query: {
                                patientId: query._id
                            },
                            options: {
                                lean: true
                            }
                        }, function( err, results ) {
                            if( err ) {
                                return done( err );
                            }
                            activityAmount = results.length;
                            async.each( results, function( activity, _done ) {
                                Y.doccirrus.activityapi.doTransition( user, {}, activity, 'delete', false, _done );
                            }, done );
                        } );
                    },
                    function( done ) {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'delete',
                            user: user,
                            model: 'casefolder',
                            query: {
                                patientId: query._id
                            },
                            options: {
                                override: true
                            }
                        }, done );
                    },
                    function( done ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patient',
                            query: query,
                            action: 'delete'
                        }, done );
                    }
                ], function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( err, results[2], [
                        {code: 100000, data: activityAmount}
                    ] );
                } );
            }

            Y.doccirrus.mongodb.runDb( {
                action: 'count',
                model: 'activity',
                user: user,
                query: {
                    patientId: query._id,
                    status: {$nin: ["VALID", "CREATED"]}
                }
            }, function( err, count ) {
                if( err ) {
                    return callback( err );
                }
                if( 0 < count ) {
                    return callback( Y.doccirrus.errors.rest( 403, '' ) );
                }
                deletePatientData();
            } );

        }

        /**
         * updates attached content of patient
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.query.activityId
         * @param {Object} args.data
         * @param {Object} [args.data.activity] activity data. Will use this data to generate content, otherwise will make GET with args.query.activityId to fetch data
         * @param {Object} args.options
         * @param {Boolean} args.options.quiet if true, won't emit 'system.NEW_PATIENT_ATTACHED_CONTENT' event(used to update patient header in client side).
         * @param {Function} args.callback
         */
        function updateAttachedContent( args ) {
            var
                async = require( 'async' ),
                { user, data = {}, query = {}, context = {}, options = {}, callback } = args,
                activitySchemaProcess = Y.doccirrus.schemaprocess.activity,
                preLoadedActivity = data.activity,
                activityId = (preLoadedActivity && preLoadedActivity._id && preLoadedActivity._id.toString()) || (query.activityId),
                quiet = options.quiet,
                notify = false,
                severity = '',
                newContent = '';

            function changeAttachedActivity( patient, activity, done ) {
                if( 'CANCELLED' === activity.status ) {
                    Y.doccirrus.api.patient.detachActivity( {
                        user: user,
                        query: {
                            patientId: patient._id
                        },
                        callback: done
                    } );
                } else {
                    newContent = Y.doccirrus.schemas.activity.generateContent( activity );
                    severity = activity.severity;
                    Y.doccirrus.api.patient.attachActivity( {
                        user: user,
                        query: {
                            patientId: patient._id.toString(),
                            activityId: activity._id && activity._id.toString(),
                            content: newContent,
                            severity: severity
                        },
                        callback: done
                    } );
                }
            }

            async.waterfall( [
                function( next ) {
                    if( preLoadedActivity ) {
                        return setImmediate( next, null, preLoadedActivity );
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            _id: activityId
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        next( err, results[ 0 ] );
                    } );
                },
                function( activity, next ) {
                    let
                        cachedPatient = activitySchemaProcess.getCollectionCache( {
                            context,
                            collection: 'patient',
                            key: activity.patientId
                        } );
                    if( cachedPatient ) {
                        return setImmediate( next, null, activity, cachedPatient );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        'migrate': true,
                        user: user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: activity.patientId
                        }
                    }, ( err, results ) => {
                        activitySchemaProcess.setCollectionCache( {
                            context,
                            collection: 'patient',
                            key: activity.patientId,
                            data: results[ 0 ]
                        } );
                        next( err, activity, results[ 0 ] );
                    } );
                },
                function( activity, patient, next ) {
                    if( patient && patient.attachedActivity === activityId ) {
                        notify = true;
                        changeAttachedActivity( patient, activity, next );
                    } else {
                        return next();
                    }
                }
            ], function( err ) {
                if( err ) {
                    return callback( err );
                }
                callback();                                         // eslint-disable-line callback-return
                if( notify && !quiet ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'system.NEW_PATIENT_ATTACHED_CONTENT',
                        msg: {
                            data: {
                                content: newContent,
                                severity: severity
                            }
                        }
                    } );
                }
            } );
        }

        function getPatientHistory( args ) {
            Y.log('Entering Y.doccirrus.api.patient.getPatientHistory', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.getPatientHistory');
            }
            var moment = require( 'moment' ),
                Prom = require( 'bluebird' ),
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                user = args.user,
                params = args.originalParams,
                callback = args.callback,
                quarterDate = moment( params.quarter, 'QYYYY' ),
                from = quarterDate.clone().startOf( 'quarter' ).toDate(),
                to = quarterDate.endOf( 'quarter' ).toDate();

            function getRelatedVersionId( schein ) {
                return new Prom( function( resolve, reject ) {
                    Y.doccirrus.api.kbv.scheinRelatedPatientVersion( {
                        user: user,
                        originalParams: {
                            schein: schein
                        },
                        callback: function( err, patientversion ) {
                            if( err ) {
                                return reject( err );
                            }

                            resolve( patientversion && patientversion._originalId.toString() );
                        }
                    } );

                } );
            }

            function getPatientVersions( patientId ) {

                return runDb( {
                    user: user,
                    model: 'patientversion',
                    query: {
                        patientId: patientId,
                        timestamp: {
                            $gte: from,
                            $lte: to
                        }
                    },
                    options: {
                        sort: {
                            timestamp: -1
                        }
                    }
                } );
            }

            function getRelevantActivities( patientId, caseFolderId ) {
                return runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        patientId: patientId,
                        actType: {$in: ['SCHEIN', 'TREATMENT', 'DIAGNOSIS']},
                        caseFolderId: caseFolderId,
                        timestamp: {
                            $gte: from,
                            $lte: to
                        }
                    }
                } ).map( function( activity ) {
                    if( 'SCHEIN' !== activity.actType ) {
                        return activity;
                    }

                    return getRelatedVersionId( activity ).then( function( pvId ) {
                        var copy = JSON.parse( JSON.stringify( activity ) );
                        copy._relatedPatientVersionId = pvId;
                        return copy;
                    } );

                } );
            }

            Prom.props( {
                patientVersions: getPatientVersions( params.patientId ),
                activities: getRelevantActivities( params.patientId )
            } ).then( function( result ) {
                callback( null, result );
            } ).catch( function( err ) {
                callback( err );
            } );
        }

        /**
         * Returns patient, employee and location data
         * @method getPopulatedPatient
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.user.specifiedBy employee id
         * @param {Object} args.query
         * @param {String} args.query._id patient id
         * @param {Function} args.callback
         */
        function getPopulatedPatient( args ) {
            var
                user = args.user,
                callback = args.callback,
                queryParams = args.query || {},
                async = require( 'async' ),
                result = {};
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'patient',
                        query: {
                            _id: queryParams._id
                        },
                        options: {
                            limit: 1,
                            lean: true
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        result.patient = results[0];
                        next( err );
                    } );
                },
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'employee',
                        query: {
                            _id: user.specifiedBy
                        },
                        options: {
                            limit: 1,
                            lean: true
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        result.employee = results[0];
                        next( err, result[0] );
                    } );
                },
                function( employee, next ) {
                    var
                        locationId = employee && employee.locations && employee.locations[0] && employee.locations[0]._id;
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'location',
                        query: {
                            _id: locationId
                        },
                        options: {
                            limit: 1,
                            lean: true
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        result.location = results[0];
                        next();
                    } );
                }
            ], function( err ) {
                callback( err, [result] );
            } );

        }

        /**
         * @method getPatients
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.options
         * @param {String} args.query.term last, first or dob or patient, patient number
         *  valid formats:
         *  "\d\d\d\d\d\d\d\d" -> search in Kbv Dob and interpret query as DDMMYYYY
         *  "\d\d.\d\d.\d\d\d\d" -> search in Kbv Dob and no need to interpret query
         *  "AAA,BBB" -> search lastname matches /^AAA/ and firstname matches /^BBB/
         *  "AAA,BBB,<Date>" -> search lastname matches /^AAA/ and firstname matches /^BBB/
         *      where <Date> is like the date points above.
         *  string -> search in first or last or dob or patient number ( if previous formats are not match )
         * @param {Function|Promise} args.callback
         */
        async function getPatients( args ) {
            Y.log('Entering Y.doccirrus.api.patient.getPatients', 'info', NAME);

            const
                { user, query: { term = '', _id = '', isStub } = {}, options = { limit: 20 }, callback } = args,
                kbvIntDob = /^\d\d\d\d\d\d\d\d$/,
                kbvDob = /^\d\d\.\d\d\.\d\d\d\d$/,
                parts = term.split( ',' );
            let
                query = {},
                dob;

            function setDefaultQuery( term ) {
                let query = {
                    $or: [
                        { lastname: {
                            $regex: '^' + term,
                            $options: 'i'
                        } },
                        { firstname: {
                            $regex: term,
                            $options: 'i'
                        } },
                        { patientNo: {
                                $regex: term,
                                $options: 'i'
                            } },
                        { kbvDob: {
                            $regex: term.replace(/\./g, '\.'),
                            $options: 'i'
                        } }
                    ]
                };
                return query;
            }

            if( parts.length === 1 ) {
                // dob or default
                dob = parts[0].trim();
                if( kbvIntDob.test( dob ) ) {
                    query.kbvDob = dob.slice( 0, 2 ) + '.' + dob.slice( 2, 4 ) + '.' + dob.slice( 4, 8 );
                } else if( kbvDob.test( dob ) ) {
                    query.kbvDob = dob;
                } else {
                    query = setDefaultQuery( term );
                }
            } else if( parts.length === 2 ) {
                // lastname and firstname
                parts[0] = parts[0].trim();
                parts[1] = parts[1].trim();
                query = {
                    firstname: {
                        $regex: '^' + parts[1],
                        $options: 'i'
                    },
                    lastname: {
                        $regex: '^' + parts[0],
                        $options: 'i'
                    }
                };
            } else if( parts.length === 3 ) {
                //lastname, firstname and dob
                parts[0] = parts[0].trim();
                parts[1] = parts[1].trim();
                dob = parts[2].trim();
                if( kbvIntDob.test( dob ) ) {
                    dob = dob.slice( 0, 2 ) + '.' + dob.slice( 2, 4 ) + '.' + dob.slice( 4, 8 );
                }
                query = {
                    firstname: {
                        $regex: '^' + parts[1],
                        $options: 'i'
                    },
                    lastname: {
                        $regex: '^' + parts[0],
                        $options: 'i'
                    },
                    kbvDob: dob
                };
            } else {
                query = setDefaultQuery( term );
            }

            if( _id ) {
                query._id = _id;
            }

            if( isStub ) {
                query.isStub = isStub;
            }

            let [ err, patients ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    query,
                    options
                } )
            );
            if( err ){
                Y.log( `getPatients: error getting patients q: ${JSON.stringify(query)} e:${err.stack || err}`, 'error', NAME );
            }

            Y.log('Exiting Y.doccirrus.api.patient.getPatients', 'info', NAME);
            return handleResult( err, patients, callback );
        }

        /**
         * encrypt data  using PRC's secret and patient's public key.
         *  Either patientPubKey or patientId + pubKeyHash is required
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {*} args.data.content content for encryption
         * @param {Object} [args.data.patientPubKey] complete patient public key
         * @param {Object} [args.data.patientId]
         * @param {Object} [args.data.pubKeyHash] hash of patient public key
         * @param {Function} args.callback
         */
        function encryptPatientData( args ) {
            Y.log('Entering Y.doccirrus.api.patient.encryptPatientData', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.encryptPatientData');
            }
            let
                async = require( 'async' ),
                user = args.user,
                data = args.data || {},
                patientId = data.patientId,
                patientPubKey = data.patientPubKey,
                content = data.content,
                pubKeyHash = data.pubKeyHash,
                callback = args.callback;
            Y.log( `entered encryptPatientData:  ${(patientId || patientPubKey )}`, 'debug', NAME );
            async.parallel( {
                patientKey: function( done ) {
                    if( patientPubKey ) {
                        return setImmediate( done, null, patientPubKey );
                    }
                    Y.doccirrus.api.patient.findPatientKeyByHash( {
                        user: user,
                        data: {
                            patientId: patientId,
                            pubKeyHash: pubKeyHash
                        },
                        callback: done
                    } );
                },
                prcKey: function( done ) {
                    Y.doccirrus.auth.getKeyPair( user, function( err, data ) {
                        if( err ) {
                            Y.log( `Can not get prc key pair, error: ${JSON.stringify( err )}`, 'error', NAME );
                            return done( err );
                        }
                        if( !data || !data.privateKey || !data.publicKey ) {
                            return done( new Y.doccirrus.commonerrors.DCError( 403, {message: 'prc has no valid key'} ) );
                        }
                        done( err, data );

                    } );
                }
            }, function( err, result ) {
                if( err ) {
                    return callback( err );
                }
                try {
                    let
                        prcPK = result.prcKey,
                        patientPubKey = result.patientKey,
                        sharedSecret = Y.doccirrus.authpub.getSharedSecret( prcPK.privateKey, patientPubKey ),
                        encryptedData = Y.doccirrus.authpub.encJSON( sharedSecret, content );

                    return callback( null, {
                        encryptedData: encryptedData,
                        prcPublicKey: prcPK.publicKey
                    } );
                } catch( e ) {
                    Y.log( `error in encryption: ${JSON.stringify( e.message || e )}`, 'error', NAME );
                    return callback( e );
                }
            } );
        }

        /**
         * @method decryptPatientData
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.pubKeyHash hash of the patient public key
         * @param {String} args.data.patientId patient id
         * @param {String} args.data.encryptedContent encrypted content
         * @param {String} [args.data.patientPubKey] patient public key
         * @param {Function} args.callback
         */
        function decryptPatientData( args ) {
            let
                user = args.user,
                data = args.data,
                callback = args.callback,
                async = require( 'async' );

            async.parallel( {
                    patientKey: function( done ) {
                        if( data.patientPubKey ) {
                            return setImmediate( done, null, data.patientPubKey );
                        }
                        Y.doccirrus.api.patient.findPatientKeyByHash( {
                            user: user,
                            data: {
                                patientId: data.patientId,
                                pubKeyHash: data.pubKeyHash
                            },
                            callback: done
                        } );
                    },
                    prcKey: function( done ) {
                        Y.doccirrus.auth.getKeyPair( user, function( err, data ) {
                            if( err ) {
                                Y.log( `Can not get prc key pair, error: ${JSON.stringify( err )}`, 'error', NAME );
                                return done( err );
                            }
                            if( !data || !data.privateKey || !data.publicKey ) {
                                return done( new Y.doccirrus.commonerrors.DCError( 403, {message: 'prc has no valid key'} ) );
                            }
                            done( err, data );
                        } );
                    }
                }, function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }
                    try {
                        let prcPK = result.prcKey,
                            patientPubKey = result.patientKey,
                            sharedSecret = Y.doccirrus.authpub.getSharedSecret( prcPK.privateKey, patientPubKey ),
                            decryptedData = Y.doccirrus.authpub.decJSON( sharedSecret, data.encryptedContent );

                        return callback( null, {decryptedData: decryptedData, patientPubKey: patientPubKey} );
                    } catch( e ) {
                        Y.log( `error in decryption: ${JSON.stringify( e.message || e )}`, 'error', NAME );
                        return callback( e );
                    }
                }
            );

        }

        /**
         * @method editTelekardioSerial
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {String} args.originalParams.patientId patient id
         * @param {Boolean} args.originalParams.clearPrevious flag to check if all previous data should be deleted
         * @param {Object} args.originalParams.telekardioPartner object containing CARDIO settings including old serial number
         * @param {Function} args.callback
         */
        function editTelekardioSerial( args ) {
            Y.log('Entering Y.doccirrus.api.patient.editTelekardioSerial', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.editTelekardioSerial');
            }
            let {user, originalParams, callback} = args;

            if( originalParams && originalParams.telekardioPartner && originalParams.telekardioPartner.patientId ) {
                Y.doccirrus.cardioutils.removeGeneratedData( user, originalParams.patientId, originalParams.telekardioPartner.patientId, callback );

                //cleanup patientIds in cardiobuch
                if( originalParams && originalParams.patientId ) {
                    Y.doccirrus.api.cardio.clearPatientId( user, originalParams.patientId, () => {
                    } );
                }
            } else {
                Y.log( 'Not provided serial number', 'error' );
                return callback( null );
            }
        }

        function patientsWithApkInProgress( args ) {
            Y.log('Entering Y.doccirrus.api.patient.patientsWithApkInProgress', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.patientsWithApkInProgress');
            }
            var
                moment = require( 'moment' ),
                ObjectId = require( 'mongoose' ).Types.ObjectId,

                user = args.user,
                params = args.originalParams,
                options = args.options || {},
                callback = args.callback,
                actQuery = {
                    apkState: params && params.apkState || 'IN_PROGRESS',
                    actType: {$nin: ['INVOICE',
                        'RECEIPT',
                        'WARNING1',
                        'WARNING2',
                        'CREDITNOTE',
                        'REMINDER']
                    }
                },
                now = moment();

            function aggregationCb( err, results ) {

                var patientIds;
                if( err ) {
                    Y.log( 'patientsWithApkInProgress: could not aggregate patients with APK in progress ' + err, 'error', NAME );
                    return callback( err );
                }

                patientIds = results && results[0] && results.map( function( item ){ return item._id; } );

                if( !patientIds || !Array.isArray( patientIds ) ) {
                    return callback( null, [] );
                }

                Y.doccirrus.api.patient._patientsPopulated( {
                    user: user,
                    query: {
                        _id: {
                            $in: patientIds
                        }
                    },
                    options: options, data: results
                }, callback );

            }

            function modelCb( err, activityModel ) {

                if( err ) {
                    Y.log( 'patientsWithApkInProgress: could not get activity model ' + err, 'error', NAME );
                    return callback( err );
                }

                activityModel.mongoose.aggregate( [
                    {
                        $match: actQuery
                    },
                    {
                        $addFields: {
                            lastEditor: { $arrayElemAt: [ "$editor", -1 ] }
                        }
                    },
                    { $sort: { "lastEditor._id": -1 } },
                    {
                        $group: {
                            _id: "$patientId",
                            lastEditorId: {
                                $first: "$lastEditor._id"
                            }
                        }
                    },
                    { $sort: { "lastEditorId": -1 } }
                ], aggregationCb );
            }

            function startAggregation( err, caseFolderIds ) {

                if( err ) {
                    Y.log( 'patientsWithApkInProgress: could not get caseFolderIds for type ' + params.insuranceTypeFilter + ' ' + err, 'error', NAME );
                    return callback( err );
                }

                if( Array.isArray( caseFolderIds ) && caseFolderIds.length ) {
                    actQuery.caseFolderId = {$in: caseFolderIds};
                }
                Y.doccirrus.mongodb.getModel( user, 'activity', true, modelCb );
            }

            if( Array.isArray( params.locationFilter ) && params.locationFilter.length ) {
                actQuery.locationId = {
                    $in: params.locationFilter.map( function( id ) {
                        return new ObjectId( id );
                    } )
                };
            }

            if( Array.isArray( params.employeeFilter ) && params.employeeFilter.length ) {
                actQuery.employeeId = {
                    $in: params.employeeFilter
                };
            }

            if( params.period.$lte && params.period.$gte ) {
                actQuery.timestamp = {
                    $lte: moment(params.period.$lte).endOf( 'day' ).toDate(),
                    $gte: moment(params.period.$gte).startOf( 'day' ).toDate()
                };
            } else if( 0 <= params.period ) {
                actQuery.timestamp = {
                    $lte: now.clone().endOf( 'day' ).toDate(),
                    $gte: now.subtract( params.period, 'days' ).startOf( 'day' ).toDate()
                };
            } else { // add 2 yr limit to prevent potentially ultra-expensive query with $nin
                actQuery.timestamp = {
                    $lte: now.clone().endOf( 'day' ).toDate(),
                    $gte: now.subtract( 730, 'days' ).startOf( 'day' ).toDate()
                };
            }

            if( Array.isArray( params.insuranceTypeFilter ) && params.insuranceTypeFilter.length ) {
                Y.doccirrus.api.casefolder.getCaseFolderIdsByType( {
                    user: user,
                    originalParams: {
                        type: params.insuranceTypeFilter
                    },
                    callback: startAggregation
                } );
            } else {
                startAggregation();
            }

        }

        /**
         * Sends email to patient to confirm email changes.
         * @param {Object} args
         * @param {Object} args.data
         * @param {String} args.data.patientId
         * @param {Object} args.callback
         */
        function sendEmailConfirmation( args ) {
            var
                user = args.user,
                data = args.data || {},
                callback = args.callback,
                async = require( 'async' );

            if( !data.patientId ) {
                return callback( Y.doccirrus.errors.rest( 400, 'Invalid params. patientId is missing' ) );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: data.patientId
                        },
                        options: {
                            lean: true
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        if( results[0] ) {
                            return next( err, results[0] );
                        }
                        Y.log( 'sendEmailConfirmation. Can not find patient, id: ' + data.patientId, 'error', NAME );
                        return next( Y.doccirrus.errors.rest( 500, 'Patient not found' ) );
                    } );
                },
                function( patient, next ) {
                    //FIXME should filter at least unconfirmed emails or have some extra logic
                    var
                        emailObj = Y.doccirrus.schemas.simpleperson.getEmail( patient.communications || [] );
                    Y.doccirrus.api.patient.askConfirmEMail( {
                        user: user,
                        data: {
                            patientId: patient._id,
                            email: emailObj.value,
                            emailSendOnly: true

                        },
                        callback: next
                    } );
                }
            ], callback );
        }

        /**
         * Asks patient to confirm new email and updates patient entry in PUC.
         *  e.g. after practice changed patient email, patient would need to confirm new email.
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.patientId
         * @param {String} args.data.email
         * @param {Boolean} [args.data.emailSendOnly=false] if the flag is set to true, patientPeg entry will not be updated in PUC( for cases when the entry has been already updated ).
         * @param {Function} args.callback
         */
        function askConfirmEMail( args ) {
            var
                user = args.user,
                data = args.data || {},
                callback = args.callback,
                async = require( 'async' );

            async.waterfall( [
                function( next ) {
                    /**
                     * getting dcCustomerNo
                     */
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'practice',
                        action: 'get',
                        options: {
                            limit: 1,
                            select: {
                                dcCustomerNo: 1,
                                coname: 1
                            }
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        if( !results[0] ) {
                            Y.log( 'askConfirmEMail. Practice entry is missing', 'error', NAME );
                            return next( Y.doccirrus.errors.rest( 500, 'Practice entry is missing' ) );
                        }
                        next( err, results[0] );
                    } );
                },
                function( practice, next ) {
                    /**
                     * update patientreg or skip
                     */
                    if( !data.emailSendOnly ) {
                        Y.doccirrus.api.patientreg.updatePatientEmailFlag( {
                            data: {
                                patientId: data.patientId,
                                email: data.email,
                                customerIdPrac: practice.dcCustomerNo
                            },
                            callback: function( err ) {
                                next( err, practice );
                            }
                        } );
                    } else {
                        setImmediate( next, null, practice );
                    }
                }
            ], function( err, practice ) {
                /**
                 * sending email
                 */
                if( err ) {
                    return callback( err );
                }
                sendConfirmEmail( {
                    dcCustomerNo: practice.dcCustomerNo,
                    practiceName: practice.coname,
                    email: data.email,
                    patientId: data.patientId,
                    user
                }, callback );
            } );
        }

        /**
         * creates umlaut-friendly query
         * @param firstname
         * @param lastname
         * @param kbvDob
         */
        function getNameDobUmlQuery( firstname, lastname, kbvDob ) {
            var umlRegex = Y.doccirrus.commonutils.$regexLikeUmlaut;
            return {
                lastname: umlRegex( lastname ),
                firstname: umlRegex( firstname ),
                kbvDob: kbvDob
            };
        }

        /**
         * @method findPatientKeyByHash
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.pubKeyHash hash of the patient public key
         * @param {String} args.data.patientId patient id
         * @param {Function} args.callback
         */
        function findPatientKeyByHash( args ) {
            let
                user = args.user,
                data = args.data || {},
                callback = args.callback;
            if( !data.pubKeyHash || !data.patientId ) {
                Y.log( ` findPatientKeyByHash. Missing params, pubKeyHash: ${data.pubKeyHash}, patient id: ${data.patientId}`, 'error', NAME );
                callback( new Y.doccirrus.commonerrors.DCError( 400, {message: `Missing params, pubKeyHash: ${data.pubKeyHash}, patient id: ${data.patientId}`} ) );
                return;
            }
            Y.doccirrus.mongodb.runDb( {
                model: 'patient',
                user: user,
                action: 'get',
                query: {
                    _id: data.patientId
                },
                options: {
                    lean: true,
                    select: {
                        _id: 1,
                        devices: 1
                    },
                    limit: 1
                }
            }, function( err, results ) {
                if( err ) {
                    Y.log( `Can not get patient with id: ${data.patientId}, error: ${JSON.stringify( err )}`, 'error', NAME );
                    callback( err );
                    return;
                }
                if( !results || !results[0] ) {
                    Y.log( `Patient not found, id: ${data.patientId}`, 'warn', NAME );
                    callback( new Y.doccirrus.commonerrors.DCError( 403, {message: `Patient not found, id: ${data.patientId}`} ) );
                    return;
                }
                if( !results[0].devices ) {
                    Y.log( `Given public key is not registered by the patient. Patient id: ${data.patientId}`, 'warn', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 22004, {} ) );
                } else {
                    let
                        patientPubKey = results[0].devices.find( device => data.pubKeyHash === Y.doccirrus.authpub.generateHash( device.key ) );
                    if( patientPubKey ) {
                        return callback( null, patientPubKey.key );
                    } else {
                        Y.log( `Given public key is not registered by the patient. Patient id: ${data.patientId}`, 'warn', NAME );
                        return callback( new Y.doccirrus.commonerrors.DCError( 22004, {} ) );
                    }
                }

            } );
        }

        function mergeImportedPatient( args ) {
            Y.log('Entering Y.doccirrus.api.patient.mergeImportedPatient', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.mergeImportedPatient');
            }
            const
                Promise = require( 'bluebird' ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
                getModel = Promise.promisify( Y.doccirrus.mongodb.getModel ),
                user = args.user,
                params = args.originalParams,
                importedPatientId = params && params.importedPatientId,
                patientId = params && params.patientId,
                callback = args.callback;

            let importedPatient, actualPatient, updateQuery, updateData, actualPatientUpdateQuery, actualPatientUpdateData;

            function update( modelName, query, data ) {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: modelName,
                    migrate: true,
                    query: query,
                    data: data,
                    options: {
                        multi: true
                    }
                } );
            }

            function remove( modelName, query ) {
                return getModel( user, modelName, true ).then( model => {
                    return new Promise( function( resolve, reject ) {
                        model.mongoose.remove( query, ( err, result ) => {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( result );
                        } );
                    } );
                } );

            }

            if( !importedPatientId || !patientId ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: `Missing params, importedPatientId: ${importedPatientId}, patient id: ${patientId}`} ) );
            }

            runDb( {
                user: user,
                model: 'patient',
                query: {
                    _id: {$in: [importedPatientId, patientId]}
                },
                options: {
                    limit: 2,
                    lean: true
                }
            } ).then( patients => {

                patients.forEach( patient => {
                    if( patient._id.toString() === importedPatientId ) {
                        importedPatient = patient;
                    } else if( patient._id.toString() === patientId ) {
                        actualPatient = patient;
                    }
                } );

                if( !importedPatient ) {
                    throw new Y.doccirrus.commonerrors.DCError( 29000 );
                }

                if( !importedPatient.importId ) {
                    throw new Y.doccirrus.commonerrors.DCError( 29001 );
                }

                if( !actualPatient ) {
                    throw new Y.doccirrus.commonerrors.DCError( 29002 );
                }

                if( actualPatient.importId ) {
                    throw new Y.doccirrus.commonerrors.DCError( 29001 );
                }
                actualPatientUpdateQuery = {
                    _id: actualPatient._id
                };

                actualPatientUpdateData = {
                    patientNo: importedPatient.patientNo,
                    patientNumber: importedPatient.patientNumber
                };

                updateQuery = {
                    patientId: importedPatient._id.toString()
                };
                updateData = {
                    patientId: actualPatient._id.toString()
                };

                return update( 'activity', updateQuery, updateData );
            } ).then( ( result ) => {
                Y.log( `mergeImportedPatient: updated patientId of ${result && result.nModified} activities`, 'debug', NAME );
                return update( 'casefolder', updateQuery, updateData );
            } ).then( ( result ) => {
                Y.log( `mergeImportedPatient: updated patientId of ${result && result.nModified} casefolders`, 'debug', NAME );
                return remove( 'patient', {_id: importedPatient._id} );
            } ).then( ( result ) => {
                Y.log( `mergeImportedPatient: removed ${result && result.result && result.result.n} imported patient`, 'debug', NAME );
                return update( 'patient', actualPatientUpdateQuery, actualPatientUpdateData );
            } ).then( ( result ) => {
                Y.log( `mergeImportedPatient: updated actual patient ${result && result.nModified}`, 'debug', NAME );
                callback();
            } ).catch( err => {
                Y.log( 'could not merge imported patient ' + err, 'error', NAME );
                callback( err );
            } );

        }

        /**
         *  Populate the patient.latestMedData array with latest measured values (weight, BMI, blood pressure, etc)
         *
         *  This is called by activity post-process when deleting or updating a MEDDATA activity or during migration
         *
         *  Overall process is:
         *
         *      1. Get an activity model (with mongoose model)
         *      2. Stream all MEDDATA activities for this patient
         *      --> 2.1 Check an individual medData entry against the latest values
         *      3. Save the updated latestMedData array to the patient object
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  patientId   {String}    Database _id of a patient object
         *  @param  inMigration {Boolean}   Set true if calling from migration context
         *  @param  callback    {Function}  Of the form fn( err )
         */

        function setLatestMedData( user, patientId, activity, inMigration, forDelete, callback ) {
            var
                async = require( 'async' ),
                moment = require( 'moment' ),
                END_PREGNANCY_MARKER = 'END_OF_PREGNANCY',

                activityModel,
                activityCount = 0,
                latestMedData = [],
                query = {
                    patientId: patientId,
                    actType: { $in : Y.doccirrus.schemas.activity.medDataActTypes },
                    status: {$ne: 'PREPARED'}
                };

            async.series( [ getActivityModel, streamMedData, deduplicateLatestMedData, updatePatient, checkPregnancyStatus ], onAllDone );

            //  1. Get an activity model (with mongoose model)
            function getActivityModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'activity', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    activityModel = newModel;
                    itcb( null );
                }
            }

            //  2. Stream all MEDDATA and INGREDIENTPLAN activities for this patient
            function streamMedData( itcb ) {
                var activityStream = activityModel.mongoose.find( query, {}, { timeout: true } ).stream();

                activityStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );

                function onStreamData( actObj ) {
                    if ( !actObj.medData || 0 === actObj.medData.length ) { return; }

                    var
                        medData = JSON.parse( JSON.stringify( actObj.medData ) ),
                        i;

                    Y.log( `Processing ${actObj.actType} activity from stream: ${actObj._id} for patient: ${patientId}`, 'debug', NAME );
                    activityCount = activityCount + 1;

                    //  check each meddata entry against set of latest values
                    for ( i = 0; i < medData.length; i++ ) {
                        medData[i].measurementDate = actObj.timestamp + '';
                        tryInsertMedData( {...medData[i], activityId: actObj._id } );
                    }
                }

                function onStreamEnd() {
                    Y.log( `Finished processing all ${activityCount} MEDDATA activities for patient ${patientId}.`, 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( `Error in MEDDATA activity stream: ${err.stack||err}`, 'error', NAME );
                    itcb( err );
                }
            }

            //  2.1 Check an individual medData entry against the latest values
            function tryInsertMedData( medData ) {
                var
                    found = false,
                    latest,
                    // Optional parameters may lead to undefined medDataItems values, which we don't have to add to the latestMedData
                    isValueUndefined = (
                        (
                            medData.textValue === null ||
                            medData.textValue === undefined
                        ) &&
                        (
                            medData.dateValue === null ||
                            medData.dateValue === undefined
                        ) &&
                        (
                            medData.value === null ||
                            medData.value === undefined
                        ) &&
                        (
                            medData.boolValue === null ||
                            medData.boolValue === undefined
                        ) &&
                        (
                            typeof medData.additionalData !== "object" ||
                            medData.additionalData === null ||
                            Object.keys(medData.additionalData).length === 0
                        )
                    ),
                    i;

                if (isValueUndefined) {
                    return;
                }

                for ( i = 0; i < latestMedData.length; i++ ) {
                    latest = latestMedData[i];
                    if ( latest.type === medData.type ) {
                        found = true;
                        //  if given value is more recent, use it to replace the current entry
                        if ( moment( medData.measurementDate ).isAfter( latest.measurementDate ) ) {
                            latestMedData[i] = medData;
                        }
                    }
                }

                if ( false === found ) {
                    //  this is the first entry of its type which we have seen
                    latestMedData.push( medData );
                }
            }

            //  3. Prevent more than one entry per type (can happen occasionally)
            function deduplicateLatestMedData( itcb ) {
                latestMedData = latestMedData.filter( checkSingleEntry );

                function checkSingleEntry( entry, index ) {
                    var
                        firstIndex = -1,
                        i;

                    for ( i = 0; i < latestMedData.length; i++ ) {
                        if ( latestMedData[i].type === entry.type && -1 === firstIndex ) {
                            firstIndex = i;
                            break;
                        }
                    }

                    return ( index === firstIndex );
                }

                itcb( null );
            }

            //  4. Save the updated latestMedData array to the patient object
            function updatePatient( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'patient', inMigration,
                    function( err, model ) {
                        if( err ) {
                            Y.log( 'Problem saving latestMedData to patient (1) ' + patientId + ': ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }

                        model.mongoose.update( { '_id': patientId + '' }, { latestMedData: latestMedData }, ( err ) => {
                            if( err ) {
                                Y.log( 'Problem saving latestMedData to patient (2) ' + patientId + ': ' + JSON.stringify( err ), 'warn', NAME );
                                return itcb( err );
                            }
                            Y.log( 'Updated latestMedData on patient ' + patientId, 'debug', NAME );

                            emitPatientSocketEvent({
                                msg: [patientId],
                                eventAction: 'updated'
                            });

                            return itcb();
                        } );
                    }
                );
            }

            //  5. Check for end of pregnancy value
            function checkPregnancyStatus( itcb ) {
                var
                    newDataPoint,
                    i;

                if( forDelete || !activity ) {
                    return itcb();
                }

                for ( i = 0; i < activity.medData.length; i++ ) {
                    newDataPoint = JSON.parse(JSON.stringify(activity.medData[i]));
                    if ( END_PREGNANCY_MARKER === newDataPoint.type ) {
                        Y.doccirrus.api.casefolder.lockAnyPregnancyCaseFolder( {
                            'user': user,
                            'originalParams': {
                                'patientId': activity.patientId,
                                'reasonToClose': newDataPoint.textValue || 'Grund nicht angegeben'
                            },
                            'callback': onPregnanciesMarkedClosed
                        } );
                        return;
                    }
                }

                //  out of band, consider adding a socket event here to update casefolders
                function onPregnanciesMarkedClosed( err ) {
                    if ( err ) {
                        Y.log( 'Problem closing pregnancy casefolder: ' + JSON.stringify( err ), 'warn', NAME );
                        //  continue despite error, activity will still save and post-processes must continue
                        return itcb( null );
                    }
                    Y.log( 'Any active pregnancy case closed for patient: ' + activity.patientId, 'debug', NAME );
                    itcb( null );
                }

                itcb( null );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Error loading latest MEDDATA entries for patient ' + patientId + ': ', 'debug', NAME );
                    return callback( err );
                }
                return callback( null );
            }
        }

        /**
         *  Populate the patient.latestLabData array with latest measured values
         *
         *  This is called by activity post-process when deleting or updating a LABDATA activity or during migration
         *
         *  Overall process is:
         *
         *      1. Get an activity model (with mongoose model)
         *      2. Stream all LABDATA activities for this patient
         *      --> 2.1 Check an individual labData entry against the latest values
         *      3. Save the updated latestLabData array to the patient object
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  patientId   {String}    Database _id of a patient object
         *  @param  inMigration {Boolean}   Set true if calling from migration context
         *  @param  callback    {Function}  Of the form fn( err )
         */

        function setLatestLabData( user, patientId, activity, inMigration, forDelete, callback ) {
            var
                    async = require( 'async' ),
                    moment = require( 'moment' ),

                    activityModel,
                    activityCount = 0,
                    latestLabData = [],
                    query = {
                        'patientId': patientId,
                        'actType': 'LABDATA'
                    };

            async.series( [ getActivityModel, streamLabData, updatePatient ], onAllDone );

            //  1. Get an activity model (with mongoose model)
            function getActivityModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'activity', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    activityModel = newModel;
                    itcb( null );
                }
            }

            //  2. Stream all LABDATA activities for this patient
            function streamLabData( itcb ) {
                var activityStream = activityModel.mongoose.find( query, {}, { timeout: true } ).stream();

                activityStream
                        .on( 'data', onStreamData )
                        .on( 'error', onStreamError )
                        .on( 'end', onStreamEnd );

                function onStreamData( actObj ) {
                    if ( !actObj.labEntries || 0 === actObj.labEntries.length ) { return; }

                    var
                        labData = JSON.parse( JSON.stringify( actObj.labEntries ) ),
                        i;

                    Y.log( 'Processing LABDATA activity from stream: ' + actObj._id + ' for patient: ' + patientId, 'debug', NAME );

                    activityCount = activityCount + 1;

                    //  check each labdata entry against set of latest values
                    for ( i = 0; i < labData.length; i++ ) {
                        tryInsertLabData( labData[i] );
                    }

                    //MOJ-14181
                    //sort latest labdata in descending order
                    latestLabData = _.sortByOrder( latestLabData, ['labReqReceived'], [false] );
                }

                function onStreamEnd() {
                    Y.log( 'Finished processing all ' + activityCount + ' LABDATA activities for patient ' + patientId + '.', 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( 'Error in LABDATA activity stream: ' + JSON.stringify( err ), 'debug', NAME );
                    itcb( err );
                }
            }

            //  2.1 Check an individual labData entry against the latest values
            function tryInsertLabData( labData ) {
                var
                    found = false,
                    latest,
                    i;

                for( i = 0; i < latestLabData.length; i++ ) {
                    latest = latestLabData[i];
                    if( (latest && latest.labHead) === (labData && labData.labHead) ) {
                        found = true;
                        //  if given value is more recent, use it to replace the current entry
                        if( moment( labData && labData.labReqReceived ).isAfter( latest && latest.labReqReceived ) ) {
                            latestLabData[i] = labData;
                        }
                    }
                }

                if( false === found ) {
                    //  this is the first entry of its type which we have seen
                    latestLabData.push( labData );
                }
            }

            //  3. Save the updated latestLabData array to the patient object
            function updatePatient( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'patient', inMigration,
                        function( err, model ) {
                            if( err ) {
                                Y.log( 'Problem saving latestLabData to patient (1) ' + patientId + ': ' + JSON.stringify( err ), 'warn', NAME );
                                return itcb( err );
                            }

                            model.mongoose.update( { '_id': patientId + '' }, { latestLabData: latestLabData }, ( err ) => {
                                if( err ) {
                                    Y.log( 'Problem saving latestLabData to patient (2) ' + patientId + ': ' + JSON.stringify( err ), 'warn', NAME );
                                    return itcb( err );
                                }
                                Y.log( 'Updated latestLabData on patient ' + patientId, 'debug', NAME );

                                emitPatientSocketEvent({
                                    msg: [patientId],
                                    eventAction: 'updated'
                                });

                                return itcb();
                            } );
                        }
                );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Error loading latest LABDATA entries for patient ' + patientId + ': ', 'debug', NAME );
                    return callback( err );
                }
                return callback( null );
            }
        }

        /**
         *  Get Doquvide serial
         *
         *  @param  args            {Object}
         *  @param  args.user       {Object}
         *  @param  args.callback   {Function}
         */

        function getLocalPracticeId( args ) {
            Y.log('Entering Y.doccirrus.api.patient.getLocalPracticeId', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.getLocalPracticeId');
            }
            Y.doccirrus.api.sysnum.getNextDQNo({
                user: args.user,
                callback: args.callback
            } );
        }

        /**
         *  Get DQS serial
         *
         *  @param  args            {Object}
         *  @param  args.user       {Object}
         *  @param  args.callback   {Function}
         */

        function getDQSId( args ) {
            Y.log('Entering Y.doccirrus.api.patient.getDQSId', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.getDQSId');
            }
            Y.doccirrus.api.sysnum.getNextDQSNo({
                user: args.user,
                callback: args.callback
            } );
        }

        /**
         *  Dev / support route to manually run migration to (re)set latestMedData on all patients
         *
         *  @param  args            {Object}
         *  @param  args.user       {Object}
         *  @param  args.callback   {Function}
         */

        function setAllLatestMedData( args ) {
            Y.log('Entering Y.doccirrus.api.patient.setAllLatestMedData', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.setAllLatestMedData');
            }
            // call back immediately
            args.callback( null, { 'status': 'Starded migration to (re)set latestMedData on all patients' } );      //  eslint-disable-line callback-return
            Y.doccirrus.inCaseUtils.migrationhelper.setLatestMedDataOnPatients( args.user, false, onMigrationComplete );
            function onMigrationComplete( err ) {
                if ( err ) { Y.log( 'Error during setLatestMedDataOnPatients migration: ' + JSON.stringify( err ), 'warn', NAME ); }
            }
        }

            /**
             *  Dev / support route to manually run migration to (re)set latestLabData on all patients
             *
             *  @param  args            {Object}
             *  @param  args.user       {Object}
             *  @param  args.callback   {Function}
             */

            function setAllLatestLabData( args ) {
                Y.log('Entering Y.doccirrus.api.patient.setAllLatestLabData', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                            .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.setAllLatestLabData');
                }
                // call back immediately
                args.callback( null, { 'status': 'Starded migration to (re)set latestLabData on all patients' } );      //  eslint-disable-line callback-return
                Y.doccirrus.inCaseUtils.migrationhelper.setLatestLabDataOnPatients( args.user, false, onMigrationComplete );
                function onMigrationComplete( err ) {
                    if ( err ) { Y.log( 'Error during setLatestLabDataOnPatients migration: ' + JSON.stringify( err ), 'warn', NAME ); }
                }
            }

        function mergePatients( args ) {
            Y.log('Entering Y.doccirrus.api.patient.mergePatients', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.mergePatients');
            }
            Y.log( args.originalParams, 'info', MERGENAME );
            let { patient1, patient2 } = args.originalParams;
            let patient1Data = {};
            let patient2Data = {};
            if ( patient1 && patient2 && patient1 !== patient2 ) {
                Y.log( "merging patients " + patient1 + " and " + patient2 + "...", 'info', MERGENAME );
                Y.log( "testing patient1 ID...", 'info', MERGENAME );
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    action: 'get',
                    model: 'patient',
                    query: { _id: patient1 }
                } ).then( res => {
                    Y.log( res.length, 'info', MERGENAME );
                    if ( res.length > 0 ) {
                        patient1Data = res[0];
                        Y.log( "testing patient2 ID...", 'info', MERGENAME );
                        return Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            action: 'get',
                            model: 'patient',
                            query: { _id: patient2 }
                        } );
                    } else {
                        throw 42001;
                    }
                } ).then( res => {
                    Y.log( res.length, 'info', MERGENAME );
                    if ( res.length > 0 ) {
                        patient2Data = res[0];
                        if ( patient2Data.partnerIds && !patient2Data.partnerIds.every( e => e.isDisabled ) ) {
                            throw 42003;
                        }
                        let patient1Insurances = patient1Data.insuranceStatus.map( e => e.type );
                        let mergedInsurances = 0;
                        Y.log( "determined insurance types of patient1: " + patient1Insurances, 'info', MERGENAME );
                        patient2Data.insuranceStatus.forEach( e => {
                            Y.log( "testing "+e.type+" ("+patient1Insurances.indexOf(e.type)+")", 'info', MERGENAME );
                            if ( patient1Insurances.indexOf(e.type) < 0 ) {
                                Y.log( "merging in insurance of type "+e.type, 'info', MERGENAME );
                                patient1Data.insuranceStatus.push( e );
                                mergedInsurances++;
                            }
                        } );
                        if ( mergedInsurances > 0 ) {
                            Y.log("moving billing data to primary patient...", 'info', MERGENAME );
                            return Y.doccirrus.mongodb.runDb( {
                                user: args.user,
                                action: 'update',
                                model: 'patient',
                                query: { _id: patient1 },
                                data: { $set: { insuranceStatus: patient1Data.insuranceStatus } }
                            } );
                        }
                    } else {
                        throw 42002;
                    }
                } ).then( () => {
                    Y.log( "merging comms and portal auths...", 'info', MERGENAME );

                    let mergedComms = patient1Data.communications;
                    let setData = {
                        communications: mergedComms || []
                    };

                    patient2Data.communications.forEach( comm => {
                        let canBeAdded = true;
                        for (let i = 0; i < mergedComms.length; i++) {
                            if ( mergedComms[i].value === comm.value ) {
                                canBeAdded = false;
                                break;
                            }
                        }
                        if ( canBeAdded ) {
                            comm.preferred = false;
                            mergedComms.push( comm );
                        }
                    } );

                    if( patient2Data.accessPRC || patient2Data.createPlanned ) {
                        setData.accessPRC = patient2Data.accessPRC || patient1Data.accessPRC;
                        setData.createPlanned = patient2Data.createPlanned || patient1Data.createPlanned;
                    }

                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'update',
                        model: 'patient',
                        query: { _id: patient1 },
                        data: {
                            $set: setData
                        }
                    } );
                } ).then( () => {
                    Y.log("fetch activities for syncreps...", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'get',
                        model: 'activity',
                        query: { patientId: patient2 },
                        options: {
                            lean: true,
                            select: { _id: 1 }
                        }
                    } );
                } ).then( () => {
                    Y.log( "updating syncauxreporting...", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'upsert',
                        model: 'syncauxreporting',
                        fields: ['entryId', 'entityName', 'timestamp'],
                        data: {
                            entryId: patient1,
                            entityName: "patient",
                            timestamp: new Date(),
                            skipcheck_: true
                        }
                    } );
                } ).then( () => {
                    Y.log( "removing reportings associated with patient2...", 'info', MERGENAME );
                    Y.doccirrus.api.reporting.reportingDBaction( {
                        user: args.user,
                        action: 'delete',
                        query: {
                            patientDbId: patient2
                        },
                        options: {
                            multi: true,
                            override: true
                        },
                        callback: ( err, res )=>{
                            if( err ) {
                                throw err;
                            }

                            res = res.map( e => e._id );
                            Y.log( res, 'info', MERGENAME );
                            Y.log( "creating syncreps...", 'info', MERGENAME );
                            require( 'async' ).eachSeries( res, function( activityId, callback ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user: args.user,
                                    action: 'post',
                                    model: 'syncreporting',
                                    data: {
                                        entryId: activityId,
                                        entityName: "activity",
                                        timestamp: new Date(),
                                        skipcheck_: true
                                    },
                                    callback
                                } );
                            }, function() {
                                Y.log( "done creating syncreps...", 'info', MERGENAME );
                            } );

                            Y.log( "moving activities to primary patient...", 'info', MERGENAME );
                            return Y.doccirrus.mongodb.runDb( {
                                user: args.user,
                                action: 'update',
                                model: 'activity',
                                query: { patientId: patient2 },
                                data: {
                                    $set: {
                                        patientId: patient1,
                                        patientLastName: patient1Data.lastname,
                                        patientFirstName: patient1Data.firstname
                                    }
                                },
                                options: { multi: true }
                            } );
                        }
                    } );
                } ).then( () => {
                    Y.log( "moving casefolders to primary patient...", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'update',
                        model: 'casefolder',
                        query: { patientId: patient2 },
                        data: {
                            $set: {
                                patientId: patient1,
                                merged: true
                            }
                        },
                        options: { multi: true }
                    } );
                } ).then( () => {
                    Y.log( "updating tasks...", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'update',
                        model: 'task',
                        query: { patientId: patient2 },
                        data: {
                            $set: {
                                patientId: patient1
                            }
                        },
                        options: { multi: true }
                    } );
                } ).then( () => {
                    Y.log( "updating devicelogs...", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'update',
                        model: 'devicelog',
                        query: { patientId: patient2 },
                        data: {
                            $set: {
                                patientId: patient1
                            }
                        },
                        options: { multi: true }
                    } );
                } ).then( () => {
                    //  note, attachedTo is deprecated, but kept available for now, see MOJ-9190
                    Y.log( "updating documents (attachments, attachedTo)...", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'update',
                        model: 'document',
                        query: { attachedTo: patient2 },
                        data: {
                            $set: {
                                publisher: patient1Data.firstname + ' ' + patient1Data.lastname,
                                attachedTo: patient1
                            }
                        },
                        options: { multi: true }
                    } );
                } ).then( () => {
                    Y.log( "updating documents (attachments, patientId)...", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'update',
                        model: 'document',
                        query: { patientId: patient2 },
                        data: {
                            $set: {
                                publisher: patient1Data.firstname + ' ' + patient1Data.lastname,
                                patientId: patient1
                            }
                        },
                        options: { multi: true }
                    } );
                } ).then( () => {
                    Y.log( "updating documents (access rights)...", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'update',
                        model: 'document',
                        query: { accessBy: patient2 },
                        data: {
                            $set: {
                                "accessBy": [ patient1 ]
                            }
                        },
                        options: { multi: true }
                    } );
                } ).then( () => {
                    Y.log( "updating schedules...", 'info', MERGENAME );
                    let ObjectId = require( 'mongoose' ).Types.ObjectId;
                    return new Promise( ( resolve, reject ) => {
                        require( 'async' ).waterfall( [
                            function( next ) {
                                Y.doccirrus.mongodb.getModel( args.user, 'schedule', true, next );
                            },
                            function( scheduleModel, next ) {
                                var error,
                                    stream = scheduleModel.mongoose.collection.find( { patient: new ObjectId( patient2 ) }, {} ).stream();

                                function finalCb() {
                                    if( error ) {
                                        return next( error );
                                    }
                                    next();
                                }

                                function updateSchedule( schedule ) {
                                    stream.pause();
                                    schedule.patient = new ObjectId( patient1 );
                                    Y.doccirrus.calUtils.getScheduleTitle( args.user, schedule, function( err, title = "" ) {
                                        if ( err ) {
                                            Y.log( "couldn't get schedule title:", 'warn', NAME );
                                            Y.log( err, 'warn', NAME );
                                            Y.doccirrus.mongodb.runDb( {
                                                user: args.user,
                                                action: 'update',
                                                model: 'schedule',
                                                query: { _id: schedule._id },
                                                data: {
                                                    $set: {
                                                        patient: schedule.patient
                                                    }
                                                },
                                                callback: ( err ) => {
                                                    if ( err ) {
                                                        Y.log("couldn't update " + schedule._id, 'warn', NAME);
                                                    }
                                                    stream.resume();
                                                }
                                            } );
                                        } else {
                                            Y.doccirrus.mongodb.runDb( {
                                                user: args.user,
                                                action: 'update',
                                                model: 'schedule',
                                                query: { _id: schedule._id },
                                                data: {
                                                    $set: {
                                                        patient: schedule.patient,
                                                        title: title
                                                    }
                                                },
                                                callback: ( err ) => {
                                                    if ( err ) {
                                                        Y.log( "couldn't update " + schedule._id, 'warn', NAME );
                                                        Y.log( err, 'warn', NAME );
                                                    }
                                                    stream.resume();
                                                }
                                            } );
                                        }
                                    } );
                                }

                                function onError( err ) {
                                    error = err;
                                }

                                stream.on( 'data', updateSchedule ).on( 'error', onError ).on( 'end', finalCb );
                            }
                        ], function( err ) {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve();
                            }
                        } );
                    } );
                } ).then( () => {
                    let
                        promise = new Promise( ( resolve ) => {
                            Y.doccirrus.api.patientreg.updatePatientregOnPUC( {
                                user: args.user,
                                data: {
                                    oldPatientId: patient2,
                                    newPatientId: patient1
                                },
                                callback( err ) {
                                    if( err ) {
                                        Y.log( `Could not update patient portal entries. Call will be queued. Error: ${JSON.stringify(err)}`, 'warn', NAME );
                                    }
                                    resolve();
                                }
                            } );
                        } );
                    Y.log( "Updating patientreg on Patient Portal", 'info', MERGENAME );
                    return promise;
                } ).then( () => {
                    Y.log( "removing invoiceentries...", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'delete',
                        model: 'invoiceentry',
                        query: {
                            type: "schein",
                            "data.patientId": patient2
                        },
                        options: {
                            multi: true,
                            override: true
                        }
                    } );
                } ).then( () => {
                    Y.log( "removing patient version history...", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'delete',
                        model: 'patientversion',
                        query: { patientId: patient2 },
                        options: {
                            multi: true,
                            override: true
                        }
                    } );
                } ).then( () => {
                    Y.log( "removing patient...", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'delete',
                        model: 'patient',
                        query: { _id: patient2 }
                    } );
                } ).then( () => {
                    Y.log( "removing patient media without activities...", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'delete',
                        model: 'media',
                        query: { ownerId: patient2 },
                        options: {
                            multi: true,
                            override: true
                        }
                    } );
                } ).then( () => {
                    Y.log( "updating rulelogs", 'info', MERGENAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'update',
                        model: 'rulelog',
                        query: { patientId: patient2 },
                        data: {
                            $set: {
                                "patientId":  patient1
                            }
                        },
                        options: { multi: true }
                    } );
                } ).then( () => {
                    Y.log( "done merging", 'info', MERGENAME );
                    args.callback( null, true );
                } ).catch( err => {
                    if ( 'number' === typeof err ) {
                        err = Y.doccirrus.errors.rest( err, null, true );
                    }
                    if ( err && !err.code ) {
                        if ( err.message ) {
                            err = Y.doccirrus.errors.rest( 500, err.message, true );
                        } else {
                            try {
                                err = Y.doccirrus.errors.rest( 500, JSON.stringify(err), true );
                            } catch (e) {
                                err = Y.doccirrus.errors.rest( 500, "additional error: "+e.message, true );
                            }
                        }
                    }
                    if ('undefined' === typeof err) {
                        err = Y.doccirrus.errors.rest( 500, null, true );
                    }
                    Y.log( err, 'warn', MERGENAME );
                    args.callback( err );
                } );
            } else if (patient1 === patient2) {
                return args.callback( Y.doccirrus.errors.rest( 42000 , null, true ));
            } else {
                return args.callback( Y.doccirrus.errors.rest( 42005 , null, true ));
            }
        }

        /**
         * gets registered patient public keys (for devices)
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.patientId
         * @param {Function} args.callback
         */
        function getPatientPublicKeys( args ){
            Y.log('Entering Y.doccirrus.api.patient.getPatientPublicKeys', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.getPatientPublicKeys');
            }
            const
                { user, data: { patientId } = {}, callback } = args;
            if( !patientId ) {
                Y.log( `getPatientPublicKeys. Missing patient _id`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'pateintId is missing' } ) );
            }
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                action: 'get',
                query: {
                    _id: patientId
                }
            }, ( err, results ) => {
                if( err ) {
                    return callback( err );
                }
                if( !results.length ) {
                    Y.log( `getPatientPublicKeys. Patient with _id: ${patientId} not found`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'patient not found' } ) );
                }
                callback( null, { registeredKeys: results[ 0 ].devices } );
            } );
        }

        function getPatientReferenceContacts( args ) {
            Y.log('Entering Y.doccirrus.api.patient.getPatientReferenceContacts', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.getPatientReferenceContacts');
            }
            const
                async = require( 'async' ),
                {user, query: {physicianId, familyDoctorId, institutionId, additionalContacts} = {}, callback} = args;
            if( !physicianId && !familyDoctorId && !institutionId ) {
                Y.log( `getPatientReferenceContacts. Not enough params`, 'debug', NAME );
                return callback();
            }

            // names of functions in this async are used in PatientGadgetDoctorAddress and PatientGadgetReference,
            // so in case of changes those files should be updated as well
            async.series( {
                    physician( done ) {
                        if( !physicianId ) {
                            return done();
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'basecontact',
                            action: 'get',
                            query: {
                                _id: physicianId
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return done( err );
                            }
                            if( !results.length ) {
                                return done();
                            }
                            done( null, results[0] );
                        } );
                    },
                    familyDoctor( done ) {
                        if( !familyDoctorId ) {
                            return done();
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'basecontact',
                            action: 'get',
                            query: {
                                _id: familyDoctorId
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return done( err );
                            }
                            if( !results.length ) {
                                return done();
                            }
                            done( null, results[0] );
                        } );
                    },
                    institution( done ) {
                        if( !institutionId ) {
                            return done();
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'basecontact',
                            action: 'get',
                            query: {
                                _id: institutionId
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return done( err );
                            }
                            if( !results.length ) {
                                return done();
                            }

                            done( null, results[0] );
                        } );
                    },
                    additionalContacts( done ) {
                        {
                            if( !additionalContacts || !additionalContacts[0] ) {
                                return done();
                            }
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'basecontact',
                                action: 'get',
                                query: {
                                    _id: {$in: additionalContacts}
                                }
                            }, ( err, results ) => {
                                if( err ) {
                                    return done( err );
                                }
                                if( !results.length ) {
                                    return done();
                                }
                                done( null, results );
                            } );
                        }
                    }
                }, ( err, result ) => {
                    if( err ) {
                        return callback( err );
                    }
                    return callback( null, result );
                }
            );
        }

        /**
         *  Collect the unique employeeIds associated with the most recent schein of all casefolders for this patient
         *  This is used to set the 'Arzt' column of patient table / pdf
         *
         *  This is called by migration and after save/delete of schein
         *
         *  @param  {Object}    user            REST user or equivalent
         *  @param  {String}    patientId       Patient to update
         *  @param  {Boolean}   inMigration     Set to true if running in migration
         *  @param  {Function}  callback        Of the form fn( err )
         */

        function updateScheinEmployees( user, patientId, inMigration, callback ) {
            var
                async = require( 'async' ),
                caseFolders,
                employeeIds = [];

            async.series( [ getAllCaseFolders, getAllLatestScheine, updatePatient ], onAllDone );

            function getAllCaseFolders( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'casefolder',
                    'query': { 'patientId': patientId },
                    'migrate': inMigration,
                    'callback': onCaseFoldersLoaded
                } );

                function onCaseFoldersLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    caseFolders = result;
                    itcb( null );
                }
            }

            function getAllLatestScheine( itcb ) {
                //  if no casefolders then skip this step
                if ( 0 === caseFolders.length ) { return itcb( null ); }
                async.eachSeries( caseFolders, getSingleLatestScheine, itcb );
            }

            function getSingleLatestScheine( caseFolder, itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activity',
                    'query': {
                        'patientId': patientId,
                        'caseFolderId': caseFolder._id + '',
                        'actType': { $in: Y.doccirrus.schemas.activity.scheinActTypes }
                    },
                    'options': {
                        'limit': 1,
                        'sort': { 'timestamp': -1 },
                        'select': { 'employeeId': 1 }
                    },
                    'migrate': inMigration,
                    'callback': onLastScheinLoaded
                } );

                function onLastScheinLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }

                    //  no schein in CaseFolder
                    if ( !result || !result[0] || !result[0].employeeId ) { return itcb( null ); }

                    var employeeId = result[0].employeeId + '';

                    if ( -1 === employeeIds.indexOf( employeeId ) ) {
                        employeeIds.push( employeeId );
                    }

                    itcb( null );
                }
            }

            function updatePatient( itcb ) {
                //  in migration, do not post this directly, caller will use mongoose
                var
                    putData = {
                        'scheinEmployeeIds': employeeIds,
                        'fields_': [ 'scheinEmployeeIds' ]
                    };

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'patient',
                    'action': 'put',
                    'query': { '_id': patientId },
                    'data': Y.doccirrus.filters.cleanDbObject( putData ),
                    'migrate': inMigration,
                    'context': { '_skipTriggerRules': true },
                    'callback': onPatientUpdated
                } );

                function onPatientUpdated( err ) {
                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
            }

            function onAllDone( err) {
                if ( err ) { return callback( err ); }
                Y.log( 'Updated patient ' + patientId + ' with schein employee _ids: ' + JSON.stringify( employeeIds ), 'debug', NAME );
                callback( null, employeeIds );
            }
        }

        /**
         *  Guess best employeeId for this patient, when creating activities from patient portal / external API
         *
         *  Overall process:
         *
         *      1.  Load the patient object
         *          * check for primaryDoc
         *          * check for scheinEmployeeIds
         *
         *      2.  Load the first employee form the database (patient has no existing Scheine or employee)
         *
         *  @param  {Object}    user        REST user or equivalent
         *  @param  {String}    patientId   _id of a patient obejct
         *  @param  {Function}  callback    Of the form fn( err, employeeId )
         */

        function guessBestEmployeeId( user, patientId, callback ) {
            var
                async = require( 'async' ),
                patientObj,
                employeeId = null;

            async.series( [ loadPatient, loadFirstEmployee ], onAllDone );

            //  1.  Load the patient object
            function loadPatient( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'patient',
                    'query': { '_id': patientId },
                    'callback': onPatientLoaded
                } );

                function onPatientLoaded( err, result ) {
                    if ( !err && !result[0] ) { err = Y.doccirrus.errors.rest( 404, 'Patient not found' ); }
                    if ( err ) { return itcb( err ); }

                    patientObj = result[0];

                    //  look for primaryDoc
                    if ( !employeeId && patientObj.primaryDoc ) {
                        employeeId = patientObj.primaryDoc;
                    }

                    //  look for scheinEmployeeIds
                    if ( !employeeId && patientObj.scheinEmployeeIds && patientObj.scheinEmployeeIds[0] ) {
                        employeeId = patientObj.scheinEmployeeIds[0];
                    }

                    itcb( null );
                }
            }

            //  2.  Load the first employee from the database
            function loadFirstEmployee( itcb ) {
                //  if we found an employee already then we can skip this step
                if ( employeeId ) { return itcb( null ); }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'employee',
                    'query': { },
                    'options': { 'limit': 1 },
                    'callback': onFirstEmployeeLoaded
                } );

                function onFirstEmployeeLoaded( err, result ) {
                    if ( !err && !result[0] ) { err = Y.doccirrus.errors.rest( 404, 'No employees found' ); }
                    if ( err ) { return itcb( err ); }

                    employeeId = result[0]._id;
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) { return callback( err ); }
                callback( null, employeeId );
            }

        }

        /**
         *  Test / manual migration to initialize scheinEmployeeIds on patient entries
         *  @param  args
         */

        function setPatientScheinEmployeeIds( args ) {
            Y.log('Entering Y.doccirrus.api.patient.setPatientScheinEmployeeIds', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.setPatientScheinEmployeeIds');
            }
            Y.doccirrus.inCaseUtils.migrationhelper.setPatientScheinEmployeeIds( args.user, false, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( 'Could not complete migration to initialize scheinEmployeeIds on patients: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                Y.log( 'Completed migration to initialize scheinEmployeeIds on patients.', 'info', NAME );
            }

            //  process is slow, call back immediately
            args.callback( null, { 'status': 'Started migration to initialize scheinEmployeeIds on patients.' } );
        }

        /**
         *  Load additional patient context for forms
         *
         *  TODO: remove to mapper context builder, should not be async
         *
         *  @param args
         */

        function additionalFormData( args ) {
            Y.log('Entering Y.doccirrus.api.patient.additionalFormData', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.additionalFormData');
            }
            var
                user = args.user,
                patientId = args.query.patientId,
                locationId = args.query.locationId,
                employeeId = args.query.employeeId,
                caseFolderId = args.query.caseFolderId,
                timestamp = args.query.timestamp,
                callback = args.callback,
                rCache = args.rCache ? args.rCache : Y.doccirrus.insight2.reportingCache.createReportingCache(),
                isISD = Y.doccirrus.auth.isISD();

            require( 'async' ).parallel( {
                specialization: function( _cb ) {
                    Y.doccirrus.api.kbv.fachgruppe( {
                        user: args.user,
                        originalParams: {},
                        callback: ( err, result) => {
                            if( err ){
                                _cb( err );
                            }
                            _cb( null, result && result[0] && result[0].kvValue || []);
                        }
                    } );
                },
                employee: function( _cb ) {
                    if( !employeeId ) {
                        _cb();
                        return;
                    }

                    if ( rCache.has( 'employee', employeeId ) && !isISD ) {
                        return _cb( null, rCache.get( 'employee', employeeId ) );
                    }

                    Y.doccirrus.mongodb.runDb(
                        {
                            user: user,
                            model: (isISD) ? 'mirroremployee' : 'employee',
                            query: {
                                _id: employeeId
                            },
                            options: {
                                lean: true
                            },
                            callback: async function( err, employees ) {
                                // check for physicians in qualifications and change officialNo if so
                                if( employees && employees[0] && employees[0].physicianInQualification && employees[0].rlvPhysician ) {
                                    let [rlvPhysicianErr, rlvPhysician] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: (isISD) ? 'mirroremployee' : 'employee',
                                        query: {
                                            _id: employees[0].rlvPhysician
                                        },
                                        options: {
                                            lean: true
                                        }
                                    } ) );
                                    if( rlvPhysicianErr ) {
                                        Y.log( `could not get rlvPhysician ${employees[0].rlvPhysician} of physician in qualification ${employees[0]._id}: ${err.stack || err}`, 'warn' );
                                    } else if( !rlvPhysician.length ) {
                                        Y.log( `could not find rlvPhysician ${employees[0].rlvPhysician} of physician in qualification ${employees[0]._id}: ${err.stack || err}`, 'debug' );
                                    } else {
                                        employees[0].officialNo = rlvPhysician[0].officialNo;
                                    }
                                }
                                if ( !err && !isISD && employees && employees[0] ) {
                                    rCache.store( 'employee', employeeId, employees[0] );
                                }
                                _cb( null, employees && employees[0] );
                            }
                        }
                    );
                },
                location: function( _cb ) {
                    if( !locationId ) {
                        _cb();
                        return;
                    }

                    if ( rCache.has( 'location', locationId ) && !isISD ) {
                        return _cb( null, rCache.get( 'location', locationId ) );
                    }

                    Y.doccirrus.mongodb.runDb(
                        {
                            user: user,
                            model: (isISD) ? 'mirrorlocation': 'location',
                            query: {
                                _id: locationId
                            },
                            options: {
                                lean: true
                            },
                            callback: function( err, locations ) {
                                if ( !err && !isISD && locations && locations[0] ) {
                                    rCache.store( 'location', locationId, locations[0] );
                                }
                                let location = locations && locations[0];
                                if(!isISD && location){
                                    location.isMainLocation = (locationId === Y.doccirrus.schemas.location.getMainLocationId());
                                }
                                _cb( null, location );
                            }
                        }
                    );

                },
                schein: function( _cb ) {
                    if( !patientId || !timestamp ) {
                        _cb();
                        return;
                    }

                    var cacheKey = patientId + '_' + timestamp + '_' + locationId + '_' + caseFolderId;
                    if (rCache.has( 'lastSchein', cacheKey ) ) {
                        return _cb( null, rCache.get( 'lastSchein', cacheKey ) );
                    }

                    Y.doccirrus.api.patient.lastSchein( {
                        user: user,
                        query: {
                            patientId: patientId,
                            timestamp: timestamp,
                            locationId: locationId,
                            caseFolderId: caseFolderId
                        },
                        callback: function( err, scheins ) {
                            if ( !err && scheins[0] ) {
                                rCache.store( 'lastSchein', cacheKey, scheins[0] );
                            }
                            _cb( null, scheins && scheins[0] );
                        }
                    } );
                },
                kbvCertNumbers: function( _cb ) {
                    _cb( null, Y.config.insuite.kbv );
                },
                caseFolder: function( _cb ) {
                    if( !caseFolderId ) {
                        Y.log( 'caseFolder no case folder id given', 'debug', NAME );
                        return _cb();
                    }

                    if ( rCache.has( 'casefolder', caseFolderId ) && !isISD ) {
                        return _cb( null, rCache.get( 'casefolder', caseFolderId ) );
                    }

                    Y.doccirrus.mongodb.runDb(
                        {
                            user: user,
                            model: (isISD) ? 'mirrorcasefolder' : 'casefolder',
                            query: {
                                _id: caseFolderId
                            },
                            options: {
                                lean: true
                            },
                            callback: function( err, caseFolders ) {
                                if ( !err && !isISD && caseFolders && caseFolders[0] ) {
                                    rCache.store( 'casefolder', caseFolderId, caseFolders[0] );
                                }
                                _cb( null, caseFolders && caseFolders[0] );
                            }
                        }
                    );
                }
            }, callback );

        }


        /**
         *  Dev/support route - trigger migration to clean up __placeholder__ markers in patients EXTMOJ-1841
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.callback
         */

        function removePlaceholderMarkers( args ) {
            Y.log('Entering Y.doccirrus.api.patient.removePlaceholderMarkers', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.removePlaceholderMarkers');
            }
            Y.doccirrus.inCaseUtils.migrationhelper.removePlaceholderMarkers( args.user, false, onMigrationComplete );

            function onMigrationComplete( err ) {
                if ( err ) {
                    Y.log( `Problem running migration to clean up __placeholder__ markers: ${err.stack||err}`, 'warn', NAME );
                }
            }

            // call back immediately
            args.callback( null, { status: 'started migration to clean up __placeholder__ markers' } );
        }

        /**
         *  private
         *  load patients selected as family members
         *
         *  @param  {Object}    user
         *  @param  {Array}     familyMembers
         */
        function getPatientsForFamilies( user, familyMembers ) {
            let
                filteredPatientIds = familyMembers.map( ( member ) => {
                    return member.patientId;
                });

            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                query: {
                    _id: { $in: filteredPatientIds }
                },
                options: {
                    select: {
                        patientsFamilyMembers: 1
                    }
                }
            } );
        }

        /**
         *  checks if has unlinked patients and links
         *
         *  @param  {Object}    user
         *  @param  {Object}    patient
         *  @param  {Function}  callback
         */

        async function linkPatientFamilyMember( user, patient, callback ) {
            const
                familyMembers = patient.patientsFamilyMembers || [];
            let
                err, result, savedPatients, pat;

            [err, result] = await formatPromiseResult( getPatientsForFamilies( user, familyMembers ) );

            if( err ) {
                Y.log( `linkPatientFamilyMember: Error in getting patients family members. ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            savedPatients = result;
            for( pat of familyMembers ) {
                // to avoid multi-creation
                let
                    savedPatient = savedPatients.filter( ( p ) => { // eslint-disable-line
                        return p._id.toString() === pat.patientId.toString();
                    }),
                    isAlreadyCreated = ( ( savedPatient && savedPatient[0] && savedPatient[0].patientsFamilyMembers ) || [] ).some( ( p ) => { // eslint-disable-line
                        return p.patientId.toString() === patient._id.toString();
                    });

                if( !isAlreadyCreated ) {
                    let
                        entry = savedPatient && savedPatient[0] || null;
                    if( entry && entry._id ) {
                        if( !entry.patientsFamilyMembers ) {
                            entry.patientsFamilyMembers = [];
                        }

                        entry.patientsFamilyMembers.push( {
                            patientId: patient._id,
                            relationStatus: '',
                            patientText: Y.doccirrus.schemas.person.personDisplay( patient )
                        } );

                        [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                model: 'patient',
                                action: 'put',
                                user,
                                query: {_id: entry._id},
                                data: Y.doccirrus.filters.cleanDbObject( {
                                    patientsFamilyMembers: entry.patientsFamilyMembers
                                } ),
                                fields: ['patientsFamilyMembers']
                            } )
                        );

                        if( err ) {
                            Y.log( `linkPatientFamilyMember: Error in updating patient. ${err.stack || err}`, 'error', NAME );
                            callback( err, patient );
                        }
                    }
                }
            }

            callback( null, patient );
        }

        function UPSERT( args ) {
            Y.log('Entering Y.doccirrus.api.patient.upsert', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.upsert');
            }

            if( !args.data.countryMode ) {
                const practiceCountryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs() || [];
                const countryMode = practiceCountryMode.length ? practiceCountryMode[0] : 'D';
                Y.log(`patient (UPSERT):Automatic settings POST: ${practiceCountryMode}`, 'info', NAME);
                args.data.countryMode = [countryMode]; // reqd for /2 REST backward compatibility.
            }

            args.data = Y.doccirrus.filters.cleanDbObject( args.data );
            Y.doccirrus.mongodb.runDb( {
                action: 'upsert',
                model: 'patient',
                user: args.user,
                query: args.query,
                data: args.data,
                options: args.options,
                callback: args.callback
            });
        }

        /**
         * Creates a STUB for patient that made a request from PP for Online Sprechstunde without registration
         * For each request new STUB is created, without checking for email|firstname|lastname duplications         *
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.firstname - firstname of patient
         * @param {String} args.data.lastname - lastname of patient
         * @param {String} args.data.email - email of patient
         * @param {Function} args.callback
         * @returns {Promise<Object|*>} - returns id of created stub as result
         */
        async function addPatientForVC( args ) {
            let
                {user, data: {firstname, lastname, insuranceStatus, email} = {}, callback} = args,
                patientStub = {
                    firstname,
                    lastname,
                    insuranceStatus,
                    isStub: true,
                    communications: [
                        {
                            "_id": new ObjectId(),
                            "signaling": true,
                            "confirmed": false,
                            "confirmNeeded": true,
                            "type": "EMAILPRIV",
                            "value": email
                        }
                    ]
                },
                err, result;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'mongoInsertOne',
                    data: Y.doccirrus.filters.cleanDbObject( patientStub )
                } )
            );
            if( err ) {
                Y.log( `addPatientForVC: Error while creating patient stub: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, null, callback );
            }

            Y.log( `addPatientForVC: Patient stub was succesfully added. _id: ${result && result.insertedId}`, 'debug', NAME );

            return handleResult( null, result && result.insertedId, callback );
        }

        /**
         * Check if patients exist on InSpectorSelectiveCare ISD System
         * Limited to use only from AMTS Data Sol
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.query
         *  @param  {Object}    args.data
         *  @param  {Function}  args.callback
         *  @return {Promise<void>}
         */
        function lookupPatientOnInSpectorSelectiveCareSystem ( args ) {

            const
                { user, callback, query } = args,
                appName = user.appName,
                systemType = Y.doccirrus.schemas.company.systemTypes.INSPECTOR_SELECTIVECARE_SYSTEM;

            Y.log( `PRC query sent to ${systemType} from appName: ${appName}`, 'info', NAME );

            Y.doccirrus.communication.callExternalApiBySystemType( {
                api: 'patient.get',
                user: user,
                query: query,
                systemType: Y.doccirrus.dispatchUtils.getModuleSystemType( user && user.tenantId, systemType ),
                options: {},
                callback: function( err, result ) {
                    if( err ) {
                        Y.log( 'PRC synchronization error:' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err );
                    } else {
                        return callback( null, result );
                    }
                }
            } );
        }


        /**
         *  generate patient diff for KIM data
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.data
         *  @param  {String}    args.data.patienId      - id of existed patient
         *  @param  {Object}    args.data.patientData   - patient data from KIM record
         *  @param  {Object}    args.callback
         */

        async function getPatientDiff( args ) {
            Y.log('Entering Y.doccirrus.api.patient.getPatientDiff', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.getPatientDiff');
            }
            const
                { user, data: { patientId, patientData}, callback } = args,
                patientComparator = Y.doccirrus.compareutils.getComparator( {
                    schema: Y.doccirrus.schemas.patient.schema,
                    whiteList: [
                        'firstname',
                        'lastname',
                        'kbvDob',
                        'gender',
                        'insuranceStatus.0.insuranceNo',
                        'insuranceStatus.0.insuranceId',
                        'insuranceStatus.0.insuranceGrpId',
                        'addresses.0.street',
                        'addresses.0.houseno',
                        'addresses.0.zip',
                        'addresses.0.city',
                        'addresses.0.postbox',
                        'addresses.0.kind',
                        'addresses.0.country',
                        'addresses.0.countryCode',
                        'addresses.0.addon'
                    ]
                } );

            if( !patientId || !patientData ){
                Y.log( `getPatientDiff: insufficient parameters`, 'error', NAME );
                return callback( Y.doccirrus.errors.http( 409, 'insufficient params' ) );
            }

            let [err, patients] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'patient',
                query: {
                    _id: patientId
                },
                options: { select: {
                    firstname: 1,
                    lastname: 1,
                    kbvDob: 1,
                    gender:1,
                    insuranceStatus: 1,
                    addresses: 1
                } }
            } ) );
            if( err ){
                Y.log( `getPatientDiff: error getting patient for patient ${patientId} : ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            if( !patients || !patients.length ){
                Y.log( `getPatientDiff: patient ${patientId} not found`, 'error', NAME );
                return callback( Y.doccirrus.errors.http( 409, 'patient not found' ) );
            }
            let patient = patients[0];

            patient.insuranceStatus = patient.insuranceStatus.filter( is => is.type === 'PUBLIC' );
            patientData.insuranceStatus = patientData.insuranceStatus.filter( is => is.type === 'PUBLIC' );

            Y.doccirrus.compareutils.rearrangeArrayByType( patient, patientData, 'addresses', 'kind', ['OFFICIAL', 'POSTBOX'] );

            const
                compareResult = patientComparator.compare( patientData, patient, {} );

            callback( null, compareResult );
        }

        /**
         *  merge patient with new KIM data
         *
         *  @param  {Object}    user
         *  @param  {String}    patienId      - id of existed patient
         *  @param  {Object}    patientData   - patient data from KIM record
         *  @param  {Object}    updateOptions - define which patient data should be updated
         *
         *  @returns {String}   new patient name from merged elements
         */

        async function mergeKIMPatient( user, patientId, patientData, updateOptions ) {
            Y.log('Entering Y.doccirrus.api.patient.mergeKIMPatient', 'info', NAME);

            const
                commonData =  [
                    'firstname',
                    'lastname',
                    'kbvDob',
                    'gender' ],
                insuranceData = [
                    'insuranceNo',
                    'insuranceId',
                    'insuranceGrpId'
                ],
                addressData = [
                    'street',
                    'houseno',
                    'zip',
                    'city',
                    'postbox',
                    'kind',
                    'country',
                    'countryCode',
                    'addon'
                ],
                publicInsurance = ( el ) => { return el.type === 'PUBLIC'; };

            if( !patientId || !patientData ){
                Y.log( `getPatientDiff: insufficient parameters`, 'error', NAME );
                Y.log('Exiting Y.doccirrus.api.patient.mergeKIMPatient', 'info', NAME);
                throw new Error( 'insufficient parameters' );
            }

            let [err, patients] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'patient',
                query: {
                    _id: patientId
                },
                options: { select: {
                    firstname: 1,
                    lastname: 1,
                    kbvDob: 1,
                    gender:1,
                    insuranceStatus: 1,
                    addresses: 1
                } }
            } ) );
            if( err ){
                Y.log( `getPatientDiff: error getting patient ${patientId} data: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            if( !patients || !patients.length ){
                Y.log( `getPatientDiff: patient ${patientId} not found`, 'error', NAME );
                Y.log('Exiting Y.doccirrus.api.patient.mergeKIMPatient', 'info', NAME);
                throw new Error( 'patient not found' );
            }
            let patient = patients[0];
            let publicInsuranceOld = patient.insuranceStatus.find( publicInsurance );

            if( publicInsurance && publicInsurance.cardSwipe ) {
                Y.log( `mergeKIMPatient: do not update patient with card swipe: ${patient._id}`, 'info', NAME );
                return Y.doccirrus.schemas.person.personDisplay( {
                    firstname: patient.firstname,
                    lastname: patient.lastname,
                    title: patient.title
                } );
            }

            let updateData = {};
            if( updateOptions.common ){
                updateData = {...updateData, ...(_.pick( patientData, commonData))};
            }
            if( updateOptions.insurance ){
                let publicInsuranceNew = patientData.insuranceStatus.find( publicInsurance );
                if( publicInsuranceOld && publicInsuranceNew ){
                    for( let key of insuranceData ) {
                        if( publicInsuranceNew[key] ) {
                            publicInsuranceOld[key] = publicInsuranceNew[key];
                        }
                    }

                    updateData = {...updateData, insuranceStatus: patient.insuranceStatus};
                }
            }
            if( updateOptions.address ){
                for( let addressNew of patientData.addresses || [] ){
                    let addressOld = patient.addresses.find( el => el.kind === addressNew.kind );
                    if( !addressOld ){
                        patient.addresses.push( _.pick( addressNew, addressData ) );
                    } else {
                        for( let key of addressData ){
                            addressOld[ key ] = addressNew[ key ];
                        }
                    }
                }

                updateData = {...updateData, addresses: patient.addresses};
            }

            let updateFields = Object.keys( updateData );
            if( updateFields.length ){
                let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'put',
                    model: 'patient',
                    query: {
                        _id: patientId
                    },
                    data: Y.doccirrus.filters.cleanDbObject( updateData ),
                    fields: updateFields
                } ) );
                if( err ){
                    Y.log( `getPatientDiff: error updating patient ${patientId} : ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
            }

            Y.log('Exiting Y.doccirrus.api.patient.mergeKIMPatient', 'info', NAME);

            return Y.doccirrus.schemas.person.personDisplay( {
                firstname: updateData.firstname || patient.firstname,
                lastname: updateData.lastname || patient.lastname,
                title: updateData.title || patient.title
            } );
        }
        /**
         * @class doccirrus.api.patient
         */
        /**
         * @property patient
         * @for doccirrus.api
         * @type doccirrus.api.patient
         */
        Y.namespace( 'doccirrus.api' ).patient = {

            name: NAME,

            getPopulatedPatient: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.getPopulatedPatient', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.getPopulatedPatient');
                }
                getPopulatedPatient( args );
            },
            get: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.get');
                }
                args.options = args.options || {};
                args.options.show = args.data && args.data.show;

                Y.doccirrus.api.patient.patientsPopulated( args.user, args.query, args.options, args.callback );
                return;
            },

            'delete': function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.delete');
                }
                deletePatient( args );
            },
            /**
             * single end-point for updating patients
             * @param args
             */
            put: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.put');
                }
                args.query = args.query || {};
                if( args.data && args.query.alternativeId ) { // then cannot update alternativeId
                    args.data.alternativeId = args.query.alternativeId;
                }

                if( args.data && !args.data._id && args.query._id ) {
                    args.data._id = args.query._id;
                }
                args.data.isNew = false;

                addPatient( {
                    user: args.user,
                    data: {patientData: args.data},
                    fields: args.fields,
                    query: args.query,
                    options: args.options,
                    callback: args.callback
                } );
            },
            /**
             * single end-point for updating patients
             * @param args
             */
            post: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.post');
                }
                if( args.data ) {
                    args.data.isNew = true;
                }
                if( undefined === args.data.createPlanned || "" === args.data.createPlanned ) {
                    args.data.createPlanned = false;
                }
                if( undefined === args.data.accessPRC || "" === args.data.accessPRC ) {
                    args.data.accessPRC = false;
                }
                if( !args.data.countryMode ) {
                    let practiceCountryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs() || [];
                    let countryMode = practiceCountryMode.length ? practiceCountryMode[0] : 'D';
                    Y.log('Automatic settings POST: ' + practiceCountryMode, 'info', NAME);
                    args.data.countryMode = [countryMode]; // reqd for /2 REST backward compatibility.
                }

                addPatient( {
                    user: args.user,
                    data: {patientData: args.data},
                    field: args.fields,
                    query: args.query,
                    options: args.options,
                    callback: args.callback
                } );
            },
            upsert: UPSERT,
            addPatient: function( user, patientData, callback ) {
                addPatient( {
                    user: user,
                    data: {
                        patientData: patientData
                    },
                    callback: callback
                } );
            },

            getPatients,

            getPatientById: function( user, patientData, callback ) {
                getPatientById( {
                    user: user,
                    query: {
                        patientData: patientData
                    },
                    callback: callback
                } );
            },

            getPatientByAlternativeId: function( user, patientData, callback ) {
                getPatientByAlternativeId( {
                    user: user,
                    query: {
                        patientData: patientData
                    },
                    callback: callback
                } );
            },

            /**
             * Gets patients and populates them with markers
             *
             * This will be the central patient API function,
             * allowing access to a wide variety of patient info
             * with a wide variety of filter / search parameters.
             *
             * @method getPopulatedPatient
             * @param ac  {Object} the Action Context
             * @param options  {Object} Addtional options
             * @param callback {Function}  function(err, data)
             */
            _patientsPopulated: function getPopulatedPatients( params, callback ) {
                var
                    { user, query, options, data } = params,
                    async = require( 'async' ),
                    show = [],
                    results,
                    limit, skip,
                    sortedResult,
                    sortByLastUpdate,
                    finalResult;

                async.series(
                    [
                        setupQueryAndOptions,
                        loadPatientsFromDb,
                        getAllLocationNames,
                        getAllEmployeeNames,
                        createMarkerModel
                    ],
                    onPatientsPopulated
                );

                function setupQueryAndOptions( itcb ) {
                    //let patientIds = [];
                    let sortOptionsKeys = [],
                        sortOptionsValues = [],
                        indexOfAge;

                    if( options.show && options.show.split ) {
                        show = options.show.split( ',' );
                    }

                    if( options.sort && options.sort.hasOwnProperty( 'age' ) ) {
                        sortOptionsKeys = Object.keys( options.sort );
                        sortOptionsValues = Object.values( options.sort );
                        indexOfAge = sortOptionsKeys.indexOf( 'age' );
                        if( indexOfAge !== -1 ) {
                            sortOptionsKeys[indexOfAge] = 'dob';
                        }
                        options.sort = {};
                        for( let i = 0; i < sortOptionsKeys.length; i++ ) {
                            Object.defineProperty( options.sort, sortOptionsKeys[i], {
                                value: sortOptionsValues[i],
                                writable: true,
                                enumerable: true,
                                configurable: true
                            } );
                        }
                    }

                    if( options.sort && options.sort.hasOwnProperty( 'lastUpdate' ) ) {
                        sortByLastUpdate = options.sort.lastUpdate;
                        delete options.sort.lastUpdate;
                    }

                    if( data && data[0] ) {
                        if( options && options.limit ) {
                            limit = options.limit;
                            delete options.limit;
                        }
                        if( options && options.skip ) {
                            skip = options.skip;
                            delete options.skip;
                        }
                        options.select = {
                            lastname: 1,
                            firstname: 1,
                            dob: 1,
                            communications: 1
                        };
                    }

                    options = Y.mix( options || {}, {
                        hide: ['patient']
                    } );


                    if( query.employees ) {
                        query.employees = { $all: query.employees.$in };
                    }

                    if( query.locationName ) {
                        let locationOrQuery = {$or: [{'insuranceStatus.locationId': query.locationName}, {'locationId': query.locationName}]};
                        if( query.$or ) {
                            query = {$and: [query, locationOrQuery]};
                        } else {
                            query.$or = locationOrQuery.$or;
                        }

                        delete query.locationName;
                    }

                    if( query.firstname && 'string' === typeof query.firstname  ) {
                        query.firstname = new RegExp( query.firstname, 'i' );
                    }
                    if( query.lastname && 'string' === typeof query.lastname ) {
                        query.lastname = new RegExp( query.lastname, 'i' );
                    }

                    itcb( null );
                }

                function loadPatientsFromDb( itcb ) {

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        query: query,
                        options: Object.assign( options, { lean:true } ),
                        callback: onPatientsLoaded
                    } );

                    function onPatientsLoaded( err, dbResults ) {
                        if( err || !dbResults ) {
                            Y.log( "Error patientsPopulated (patientCallback): \n" + err || 'no such patient', 'error', NAME );
                            return itcb( err || 'no such patient' );
                        }
                        results = dbResults;
                        itcb( null );
                    }

                }

                //  Get all location names for all patients
                function getAllLocationNames( itcb ) {
                    //  if not creating patients table then skip this step
                    if ( !options.patientTable ) { return itcb( null ); }

                    async.eachSeries( results.result, getLocationNamesForPatient, itcb );
                }

                //  Get all location names for one patient
                function getLocationNamesForPatient( patient, next ) {
                    const patientLocationIds = (patient.insuranceStatus || []).map( insuranceStatus => insuranceStatus.locationId ).filter(a=>a);
                    if( patient.locationId ) {
                        patientLocationIds.push( patient.locationId );
                    }
                    if( !patientLocationIds.length ) {
                        return next();  // short-circuit to prevent unnecessary work/logging
                    }

                    // SU needed to get all locations including locations not visible to the user in strict mode
                    Y.doccirrus.api.location.get( {
                        user: Y.doccirrus.auth.getSUForTenant( user.tenantId ),
                        query: { _id: {$in: patientLocationIds} },
                        options: {
                            select: {
                                locname: 1
                            }
                        },
                        callback: function getLocationName( err, result ) {
                            if( err ) {
                                Y.log( `Could not get locationName for patient ${patient._id}`, 'debug', NAME );
                            }
                            patient.locationName = !Array.isArray( result ) ? [] : result.map( location => location.locname );
                            next();
                        }
                    } );

                }

                //  All employee names for all patients
                function getAllEmployeeNames( itcb ) {
                    //  if not creating patients table then skip this step
                    if ( !options.patientTable ) { return itcb( null ); }

                    async.eachSeries( results.result, getEmployeeNamesForPatient, itcb );
                }

                //  Get all employee names for one patient
                function getEmployeeNamesForPatient( patient, next ) {
                    let employees = [];

                    if ( !patient.employees || !patient.employees[0] ) {
                        return next();
                    }

                    async.eachSeries( patient.employees, getSingleEmployeeName, onEmployeeNamesSingle );

                    //  Get one location name for one patient
                    function getSingleEmployeeName( employeeId, nextInner ) {
                        if ( !employeeId ) { return nextInner(); }

                        Y.doccirrus.api.employee.get( {
                            user: user,
                            query: { _id: employeeId },
                            originalParams: {
                                includeAll: true
                            },
                            callback: function getEmployeeName( err, result ) {
                                if( err || !result[0] ) {
                                    Y.log( "Can't get employeeName for patient " + patient._id, "warn", NAME );
                                } else {
                                    let resultEmployee = result[0].firstname +' '+ result[0].lastname;
                                        employees.push( resultEmployee );
                                }
                                return nextInner();
                            }
                        } );
                    }

                    function onEmployeeNamesSingle( err ) {
                        if( err ) { return next( err ); }
                            patient.employeesArray = employees;
                        return next();
                    }
                }

                function createMarkerModel( itcb ) {
                    finalResult = results;

                    // get a model for 'marker' schema
                    Y.doccirrus.mongodb.getModel( user, 'marker', onMarkerModelCreated );

                    function onMarkerModelCreated( err, model ) {
                        if( err ) {
                            Y.log( "Error patientsPopulated (onMarkerModelCreated): \n" + err, 'error', NAME );
                            return itcb( err );
                        }
                        populateMarkers( model, results, onPopulatedMarkers );
                    }

                    function onPopulatedMarkers( err, populateResult ) {
                        var
                            patientArray = populateResult.result || populateResult, // get the patient array from the wrapped DB layer result
                            activityQuery;

                        if( err ) {
                            Y.log( "Error patientsPopulated (showCb): \n" + err, 'error', NAME );
                            callback( err );
                            return;
                        }

                        if ( -1 === show.indexOf( 'activities' ) ) {
                            finalResult = populateResult;
                            return itcb( null );
                        }

                        async.map(
                            patientArray,
                            function handlePatient( patient, _cb ) {
                                activityQuery = {patientId: patient._id};
                                if( options.activityQuery ) {
                                    activityQuery = Y.mix( activityQuery, options.activityQuery );
                                }
                                Y.doccirrus.api.activity.getActivitiesPopulated( {
                                    user: user,
                                    query: activityQuery,
                                    options: options,
                                    callback: function insertActivities( err, result ) {
                                        if( err ) {
                                            return _cb( err );
                                        }
                                        patient = patient.toObject ? patient.toObject() : patient;
                                        patient.activities = result;
                                        _cb( null, patient );
                                    }
                                } );
                            },
                            function( err, mapResult ) {
                                if( err ) {
                                    Y.log( "Error patientsPopulated (showCb -> final): \n" + err, 'error', NAME );
                                }
                                // replace the result in the original structure
                                if( finalResult.result ) {
                                    finalResult.result = mapResult;
                                } else {
                                    finalResult = mapResult;
                                }

                                itcb( err );
                            }
                        );

                    }

                }

                function onPatientsPopulated( err ) {
                    if( err ) {
                        return callback( err );
                    }

                    if( data && data[0] ) {
                        async.each( finalResult.result || finalResult, ( patient, done ) => {
                            async.each( data, function( item, innerDone ) {
                                if( item._id.toString() === patient._id.toString() ) {
                                    patient.lastUpdate = new require( 'mongoose' ).Types.ObjectId( item.lastEditorId ).getTimestamp();
                                }
                                return innerDone();
                            }, function( innerErr ) {
                                if( innerErr ) {
                                    return done( innerErr );
                                }
                                return done();
                            } );
                        }, function( err ) {
                            if( err ) {
                                Y.log( "Error onPatientsPopulated (could't set lastUpdate date): \n" + err, 'error', NAME );
                                return callback( err );
                            }
                            if( sortByLastUpdate ) {
                                if( 1 === sortByLastUpdate ) {
                                    sortedResult = _.sortBy( finalResult.result || finalResult, function( patient ) {
                                        return new Date( patient.lastUpdate );
                                    } ).reverse();
                                }
                                if( -1 === sortByLastUpdate ) {
                                    sortedResult = _.sortBy( finalResult.result || finalResult, function( patient ) {
                                        return new Date( patient.lastUpdate );
                                    } );
                                }
                                if( finalResult.result ) {
                                    finalResult.result = sortedResult && sortedResult.slice( skip || 0, ( skip || 0 ) + limit );
                                } else {
                                    finalResult = sortedResult && sortedResult.slice( skip || 0, ( skip || 0 ) + limit );
                                }
                            } else {
                                if( finalResult.result ) {
                                    finalResult.result = finalResult.result.slice( skip || 0, ( skip || 0 ) + limit );
                                } else {
                                    finalResult = finalResult && finalResult.slice( skip || 0, ( skip || 0 ) + limit );
                                }
                            }
                            return callback( null, finalResult );
                        } );
                    } else {
                        return callback( null, finalResult );
                    }
                }

            },

            patientsPopulated: function( user, query, options, callback ) {
                Y.doccirrus.api.patient._patientsPopulated( { user: user, query: query, options: options }, callback );
            },

            activitiesInCurrentQuarter: getActivitiesInCurrentQuarter,

            activitiesInQuarterFromDate: getActivitiesInQuarterFromDate,

            scheinForCurrentQuarter: scheinForCurrentQuarter,

            scheinForQuarterFromDate: scheinForQuarterFromDate,

            /**
             * Reads diagnoses in a quarter starting at first "SCHEIN"
             * @method relevantDiagnosesForTreatment
             * @for doccirrus.api.patient
             * @param parameters
             *      @param {Object} parameters.query
             *      @param {Object} parameters.originalParams
             *          @param parameters.originalParams.patientId
             *          @param parameters.originalParams.caseFolderId
             *          @param [parameters.originalParams.timestamp]
             *      @param {Function} parameters.callback
             * @return {Object} { all: [], anamnestic: [], treatmentRelevant: [] }
             */
            relevantDiagnosesForTreatment: function( parameters ) {
                Y.log('Entering Y.doccirrus.api.patient.relevantDiagnosesForTreatment', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.patient.relevantDiagnosesForTreatment');
                }
                var user = parameters.user,
                    callback = parameters.callback,
                    params = parameters.originalParams || parameters.query,
                    moment = require( 'moment' ),
                    today = params.timestamp ? moment( params.timestamp ) : moment(),
                    skipTimestampCheck = false,
                    quarterRange = Y.doccirrus.commonutils.getDateRangeByQuarter( today.quarter(), today.year() );

                function anamnesticFilter( item ) {
                    var diagnosisTreatmentRelevance = item.diagnosisTreatmentRelevance;
                    return 'DOKUMENTATIV' === diagnosisTreatmentRelevance;
                }

                function finalCb( err, diagnosis ) {

                    var result;
                    if( err ) {
                        return callback( err );
                    }

                    result = {
                        all: diagnosis,
                        anamnestic: Y.Array.filter( diagnosis, anamnesticFilter ),
                        treatmentRelevant: Y.Array.reject( diagnosis, anamnesticFilter )
                    };

                    callback( null, result );
                }

                function getDiagnosis( scheineInQuarter, cb ) {

                    var
                        i, matchingSchein, currentSchein, currentScheinTimestamp, nextSchein,
                        query = {
                            actType: 'DIAGNOSIS',
                            caseFolderId: params.caseFolderId,
                            status: {
                                $in: ['VALID', 'APPROVED']
                            }
                        };

                    if( !skipTimestampCheck ) {
                        if( !scheineInQuarter.length ) {
                            setImmediate( cb, null, [] );
                            return;
                        }
                        for( i = 0; i < scheineInQuarter.length; i++ ) {

                            currentSchein = scheineInQuarter[i];
                            nextSchein = scheineInQuarter[i + 1];
                            currentScheinTimestamp = currentSchein.timestamp;

                            if( today.isBefore( currentScheinTimestamp ) ) {
                                continue;
                            }

                            if( today.isAfter( currentScheinTimestamp ) && (!nextSchein || today.isBefore( nextSchein.timestamp )) ) {
                                matchingSchein = currentSchein;
                                break;
                            }

                        }

                        if( !matchingSchein ) {
                            return cb( null, [] );
                        }

                        query.timestamp = {
                            $gt: matchingSchein.timestamp,
                            $lt: nextSchein ? nextSchein.timestamp : quarterRange.end
                        };
                    }

                    Y.doccirrus.mongodb.runDb( {
                        model: 'activity',
                        user: user,
                        query: query,
                        options: {
                            sort: {
                                timestamp: 1
                            }
                        },
                        callback: cb
                    } );

                }

                function getFirstScheinInQuarter( caseFolder, cb ) {
                    var scheinType;

                    scheinType = Y.doccirrus.commonutils.mapInsuranceTypeToScheinType( caseFolder.type );
                    if( caseFolder.additionalType === Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION ) {
                        Y.log( 'relevantDiagnosesForTreatment. There is no "Schein" in "Kostenplan" case folder.', 'info', NAME );
                        skipTimestampCheck = true;
                        setImmediate( cb, null, [] );
                        return;
                    }
                    if( !scheinType ) {
                        Y.log( 'relevantDiagnosesForTreatment. Could not map schein type from insurance type.', 'info', NAME );
                        setImmediate( cb, null, [] );
                        return;
                    }

                    Y.doccirrus.mongodb.runDb( {
                        model: 'activity',
                        user: user,
                        query: {
                            actType: scheinType,
                            caseFolderId: params.caseFolderId,
                            patientId: params.patientId,
                            timestamp: {
                                $gte: quarterRange.start,
                                $lte: quarterRange.end
                            }
                        },
                        options: {
                            sort: {
                                timestamp: 1
                            }
                        },
                        callback: function( err, scheins ) {
                            if( err ) {
                                cb( err );
                            } else if( !scheins || !scheins.length ) {
                                Y.log( 'could not find scheine in specified quarter', 'error', NAME );
                                cb( null, [] );
                            } else {
                                cb( null, scheins );
                            }
                        }
                    } );
                }

                function getCaseFolder( cb ) {

                    if( Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId() === params.caseFolderId ) {
                       return cb( null, {
                            _id: Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId(),
                            type: 'PREPARED'
                        } );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        model: 'casefolder',
                        user: user,
                        query: {
                            _id: params.caseFolderId,
                            patientId: params.patientId
                        },
                        callback: function( err, caseFolders ) {
                            if( err ) {
                                cb( err );
                            } else if( !caseFolders || !caseFolders.length ) {
                                return cb( 'could not find case folder' );
                            }
                            cb( null, caseFolders[0] );
                        }

                    } );
                }

                require( 'async' ).waterfall( [
                    getCaseFolder,
                    getFirstScheinInQuarter,
                    getDiagnosis
                ], finalCb );

            },

            scheinByTimestamp: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.scheinByTimestamp', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.scheinByTimestamp');
                }
                var
                    callback = args.callback;
                if( !args.originalParams.timestamp ) {
                    callback( new Error( 'No timestamp passed' ) );
                    return;
                }

                if( !args.originalParams.patientId ) {
                    callback( new Error( 'No patientId passed' ) );
                    return;
                }
                var
                    params = args.originalParams,
                    user = args.user,
                    moment = require( 'moment' ),
                    date = moment( params.timestamp ),
                    quarterRange = Y.doccirrus.commonutils.getDateRangeByQuarter( date.quarter(), date.year() ),
                    query = {
                        actType: {$in: Y.doccirrus.schemas.v_contract.scheinActTypes},
                        caseFolderId: params.caseFolderId,
                        patientId: params.patientId,
                        timestamp: {
                            $gte: quarterRange.start,
                            $lte: params.timestamp
                        }
                    };
                Y.doccirrus.mongodb.runDb( {
                    model: 'activity',
                    user: user,
                    query: query,
                    options: {
                        sort: {
                            timestamp: -1
                        }
                    },
                    callback: callback
                } );
            },

            hasCardSwiped: function( user, params, callback ) {
                var
                    swiped,
                    moment = require( 'moment' ),
                    date = moment(),
                    quarterRange = Y.doccirrus.commonutils.getDateRangeByQuarter( date.quarter(), date.year() );

                function patientCb( err, patient ) {
                    if( err || !patient.length ) {
                        err = err || 'Patient Not Found';
                        Y.log( 'Error in hasCardSwiped: ' + JSON.stringify( err ), 'error', NAME );
                        callback( err );
                        return;
                    }

                    if( patient[0] && patient[0].insuranceStatus[0] && patient[0].insuranceStatus[0].cardSwipe ) {
                        swiped = moment( patient[0].insuranceStatus[0].cardSwipe );
                        if( swiped && swiped.isValid() && swiped.isAfter( quarterRange.start, 'second' ) && swiped.isBefore( quarterRange.end, 'second' ) ) {
                            callback( null, true );
                            return;
                        }
                    }

                    callback( null, false );
                }

                Y.doccirrus.mongodb.runDb( {
                    model: 'patient',
                    user: user,
                    query: {
                        _id: params.patientId
                    },
                    options: {
                        limit: 1
                    },
                    callback: patientCb
                } );

            },

            /**
             * check if the patient can be deleted
             * @param user
             * @param query patientId
             * @param callback
             */
            deleteCheck: async function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.deleteCheck', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.deleteCheck');
                }

                //mark user to skip location restriction for deleting check
                const
                    { user, originalParams: { id: patientId }, callback } = args,
                    getEventList = util.promisify( Y.doccirrus.calUtils.getEventList ),
                    nonRestrictedByLocationUser = {...user, id: 'su'};
                let
                    status = 0; // OK

                if( !patientId ) {
                    return callback( Y.doccirrus.errors.http( 400, 'patient id required' ) );
                }

                let [ err, eventList ] = await formatPromiseResult(
                    getEventList( user, {
                        patient: patientId,
                        dateFrom: 'now',
                        duration: 'all',
                        eventType: 'all'
                    } )
                );

                if( err ) {
                    Y.log( `deleteCheck: Error getting event list ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( eventList && eventList.length > 0 ) {
                    Y.log( `deleteCheck: patient still has events: ${eventList.length}`, 'debug', NAME );
                    status = 2; // patient has calendar events
                }

                let activityCount;
                [err, activityCount] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: nonRestrictedByLocationUser,
                        model: 'activity',
                        action: 'count',
                        query: { patientId }
                    } )
                );
                if( err ) {
                    Y.log( `deleteCheck: Error counting activities ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( activityCount > 0 ) {
                    status += 1; // only activity
                }
                if( status !== 0 ) {
                    Y.log( `patientdeletecheck: patient cannot be deleted. 1:activity,2:calendarEnevt, 3:both: status=${status}`, 'info', NAME );
                } else {
                    Y.log( `patientdeletecheck: it is OK to delete the patient. status=${status}`, 'info', NAME );
                }
                callback( null, { status } ); // returns 3 if both cases
            },
            /**
             * Determines if a patient saved to the specified timestamp  would be the "head" of patient versions.
             * @method isNewestVersion
             * @for doccirrus.api.patient
             * @param args
             */
            isNewestVersion: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.isNewestVersion', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.isNewestVersion');
                }
                var user = args.user,
                    moment = require('moment'),
                    patientId = args.originalParams && args.originalParams.patientId,
                    timestamp = args.originalParams && args.originalParams.timestamp,
                    callback = args.callback;

                function patientversionCb( err, count ) {
                    if( err ) {
                        Y.log( 'checkPatientOrder error: ' + err, 'error', NAME );
                        callback( err );
                        return;
                    }
                    callback( null, {isNewestVersion: 0 === count} );
                }

                if( !patientId || !timestamp ) {
                    callback( 'Missing Paramter' );
                    return;
                }

                Y.doccirrus.mongodb.runDb( {
                    migrate: true,
                    user: user,
                    model: 'patientversion',
                    action: 'count',
                    query: {
                        patientId: patientId,
                        timestamp: {$gt: moment( timestamp ).endOf( 'day' ).toDate()}
                    },
                    options: {
                        sort: {
                            timestamp: -1
                        }
                    },
                    callback: patientversionCb
                } );

            },
            /**
             * Externally add a patient ONLY if the practice has allowed external patient registration.
             * this is called only from PP and triggered by the patient him/herself
             *
             * @param firstname
             * @param lastname
             * @param dob
             * @param talk
             * @param email
             */
            registerPatient: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.registerPatient', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.registerPatient');
                }
                var
                    params = args.data,
                    callback = args.callback,
                    moment = require( 'moment' ),
                    user = args.user,
                    queryData;

                // TODO MOJ-809 check if practice has permitted such action, return with error if not

                if( !params.dob || !params.firstname || !params.lastname || !params.talk ) { // to prevent returning a wrong patient, all fields must be provided
                    Y.log( 'patient query data is not enough! params: ' + require( 'util' ).inspect( params ), 'warn', NAME );
                    callback( 'prc error' );
                    return;
                }
                let
                    dobDate = Date.parse( params.dob ),
                    kbvDob = moment( dobDate ).format( 'DD.MM.YYYY' );

                queryData = {kbvDob: kbvDob, firstname: params.firstname, lastname: params.lastname};

                function returnPatientId( patientId ) {
                    Y.log( `registerPatient. sending back the patientId to PUC: ${patientId && patientId.toString()}`, 'debug', NAME );
                    callback( null, {patientId: patientId} );
                }

                function createTaskForEmpfang( patient, callback ) {
                    const
                        taskData = {
                            allDay: false,
                            alertTime: (new Date()).toISOString(),
                            title: i18n('patient-api.text.NEW_GP_PATIENT_TASK_TITLE'),
                            urgency: 2,
                            group: false,
                            roles: [ Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG ],
                            creatorName: "System",
                            skipcheck_: true,
                            patientId: patient._id.toString(),
                            patientName: patient.lastname + ', ' + patient.firstname
                        };
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'task',
                        action: 'post',
                        data: taskData
                    }, function( err ) {
                        if( err ) {
                            return callback( err );
                        }
                        callback();
                    } );
                }

                // now we have the patientId
                function addPatientCb( err, result ) {
                    if( err ) {
                        Y.log( 'error in posting patients: ' + JSON.stringify( queryData ), 'error', NAME );
                        Y.log( JSON.stringify( err ), 'error', NAME );
                        callback( err );
                        return;
                    }

                    createTaskForEmpfang( result[0], ( err ) => {
                        if( err ) {
                            Y.log( `createTaskForEmpfang. Failed to create task: ${JSON.stringify( err )}`, 'error', NAME );
                        }
                        returnPatientId( result[0]._id.toString() );
                    } );
                }

                function checkCommunicationsForEmail( communication ) {
                    return communication.some( item => 'EMAILPRIV' === item.type || 'EMAILJOB' === item.type );
                }

                // create the patient if it doesn't exist. return with error if more than one patient found
                function getPatientCb( err, result ) {
                    let patientEmailObj = {},
                        patientCommunications = [];
                    if( err ){
                        Y.log( `registerPatient. error on registerPatient${err.message}`, 'error', NAME );
                    }

                    if( params.communications ) {
                        patientEmailObj = params.communications.find( ( item ) => {
                            return 'EMAILPRIV' === item.type || 'EMAILJOB' === item.type;
                        } );
                    }

                    if( !result || !result[0] ) { // no such patient, so create a new one
                        Y.log( `registerPatient. Patient for query: ${JSON.stringify( queryData )}. Will create the new patient with id: ${params._id && params._id.toString()}`, 'debug', NAME );
                        let
                            dobDate = Date.parse( params.dob ),
                            patient = { // later practice can complete this data
                                dob: params.dob,
                                kbvDob: moment( dobDate ).format( 'DD.MM.YYYY' ),
                                firstname: params.firstname,
                                lastname: params.lastname,
                                talk: params.talk,
                                accessPRC: params.accessPRC,
                                createPlanned: params.createPlanned,
                                isNew: true
                            };
                        if( params._id ) {
                            patient._id = params._id;
                        }
                        if( params.communications ) {
                            patient.communications = params.communications;
                        }
                        if( params.addresses ) {
                            patient.addresses = params.addresses;
                        }

                        if( 'MR' === params.talk ) {
                            patient.gender = 'MALE';
                        } else if( 'MS' === params.talk ) {
                            patient.gender = 'FEMALE';
                        } else {
                            patient.gender = 'UNKNOWN';
                        }

                        Y.doccirrus.api.patient.addPatient( user, patient, addPatientCb );

                    } else if( 1 < result.length ) {
                        Y.log( `registerPatient. More that one patient found for query: ${JSON.stringify( queryData )}`, 'warn', NAME );
                        return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'More that 1 patients were matched' } ) );
                    } else {
                        if( result[0].communications && checkCommunicationsForEmail( result[0].communications ) ) {
                            returnPatientId( result[0]._id );
                        } else {
                            if( result[0].communications ) {
                                patientCommunications = result[0].communications.concat( patientEmailObj );
                            } else {
                                patientCommunications = patientCommunications.push( patientEmailObj );
                            }

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'patient',
                                action: 'update',
                                query: {_id: result[0]._id},
                                data: { $set: { communications: patientCommunications } },
                                callback: ( err ) => {
                                    if( err ) {
                                        Y.log( `getPatientCb. Failed to update patient's email: ${JSON.stringify( err )}`, 'error', NAME );
                                    }
                                    returnPatientId( result[0]._id );
                                }
                            } );
                        }
                    }
                }

                // query patients, see if it already exists, create otherwise
                Y.doccirrus.mongodb.runDb(
                    {
                        user: user,
                        model: 'patient',
                        action: 'get',
                        callback: getPatientCb,
                        query: queryData,
                        options: {}
                    }
                );
            },

            addPatientForVC: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.addPatientForVC', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.addPatientForVC');
                }
                addPatientForVC( args );
            },

            additionalFormData: additionalFormData,

            /**
             * attaches existing markers to an existing patient
             * rest params:
             * * patient: a patient id
             * * marker: an array of marker ids
             *
             * accepts only POSTs
             * TODO fails in case of non-existing entities or misc errors
             *
             * @method
             * @param ac
             */
            addMarkers: addMarkers,

            /**
             * removes a marker from an existing patient
             * rest params:
             * * patient: a patient id
             * * marker: an array of marker ids
             *
             * accepts only POSTs
             * TODO fails in case of non-existing entities or misc errors
             *
             * @method
             * @param ac
             */
            removeMarkers: removeMarkers,

            savePatient: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.savePatient', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.savePatient');
                }
                // this block should be removed once frontend sends data into args.data (and not in args.query)
                if( args.data && args.query ) {
                    args.data = Y.merge( args.data, args.query );
                } else if( args.query ) {
                    args.data = args.query;
                }

                // overwriting the value from front-end
                if( args.data && args.data.patientData && args.data.patientData.communications && args.data.patientData.communications[0] ) {
                    args.data.patientData.communications = args.data.patientData.communications.map( function( item ) {
                        item.confirmed = undefined;
                        return item;
                    } );
                }
                // MOJ-11011: Do not write latestMedData on patient save; could override newest data already written to
                // patient from MEDATA activity-post-process.
                if( args.data && args.data.patientData && Array.isArray( args.data.patientData.latestMedData ) ) {
                    delete args.data.patientData.latestMedData;
                }

                args.query = null;
                addPatient( args );
            },
            checkPatientNo: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.checkPatientNo', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.checkPatientNo');
                }
                checkPatientNo( args );
            },
            attachActivity: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.attachActivity', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.attachActivity');
                }
                attachActivity( args );
            },
            detachActivity: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.detachActivity', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.detachActivity');
                }
                detachActivity( args );
            },
            getNextPatientNumber: getNextPatientNumber,

            lastSchein: lastSchein,

            /**
             * return the list of patients enriched with data required for patient browser
             *
             * @param args
             */
            getForPatientBrowser: function getForPatientBrowser( args ) {
                Y.log('Entering Y.doccirrus.api.patient.getForPatientBrowser', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.getForPatientBrowser');
                }
                var
                    self = this,
                    callback = args.callback,
                    user = args.user,
                    query = args.query,
                    partnerQuery,
                    partnerIds = Y.doccirrus.schemas.patient.types.PartnerIdsPartnerId_E.list,
                    cardioOptions = [ "cardioHeartFailure", "cardioCryptogenicStroke", "cardioCHD" ];


                function done( err, result ) {
                    if( err ) {
                        Y.log( 'getForPatientBrowser: ' + JSON.stringify( err ), 'error', NAME );
                        return callback( err );
                    } else {
                        return callback( null, result );
                    }
                }

                if( args.originalParams.patientTable ){
                    args.options.patientTable = true;

                    if( query && query.dateOfDeathOrInActive && Object.keys( query.dateOfDeathOrInActive ).length ) {
                        query.$or = [
                            {dateOfDeath: {...query.dateOfDeathOrInActive}},
                            {dateOfInActive: {...query.dateOfDeathOrInActive}}];
                        delete query.dateOfDeathOrInActive;
                    }
                }

                if( query['partnerIds.patientId'] ) {
                    let value = query['partnerIds.patientId'].$regex.toJSON();
                    value = value.substring( 1, value.lastIndexOf( "/" ) );
                    partnerQuery = partnerIds.filter( function( partner ) {
                        return ( partner.i18n.toLowerCase().indexOf( value.toLowerCase() ) > -1 ) && partner;
                    } );

                    query.$or = [
                        {
                            partnerIds: {
                                $elemMatch: {
                                    partnerId: {
                                        $in: partnerQuery.map( function( item ) {
                                            return item.val;
                                        } )
                                    }, extra: { $exists: false }
                                }
                            }

                        },
                        { 'partnerIds.patientId': query['partnerIds.patientId'] },
                        { 'partnerIds.extra': query['partnerIds.patientId'] }
                    ];

                    delete query['partnerIds.patientId'];
                }

                if( query['partnerIds.partnerId'] ) {
                    let values = query['partnerIds.partnerId'].$in,
                        cardioPartnersEl = [],
                        cardioOptionsEl = [],
                        cardioOptionsQuery = [];

                    if( values.length ){
                        values.forEach( value => {
                            if( cardioOptions.includes( value ) ){
                                cardioOptionsEl.push( value );
                            } else {
                                cardioPartnersEl.push( value );
                            }
                        } );

                        if( cardioPartnersEl.length ){
                            let obj = { 'partnerIds.partnerId': {
                                '$in': cardioPartnersEl
                            } };
                            cardioOptionsQuery.push( obj );
                        }

                        cardioOptionsEl.forEach( value => {
                            let obj = {};
                            obj[value] = true;
                            cardioOptionsQuery.push( obj );
                        } );


                        delete query['partnerIds.partnerId'];

                        if( query.$or ){
                            query.$or = query.$or.concat( cardioOptionsQuery );
                        } else {
                            query.$or = cardioOptionsQuery;
                        }

                    }
                }

                if( query['insuranceStatus.insuranceNo'] ) {
                    let refinedInsuranceNoQuery = [
                        {'insuranceStatus.insuranceNo': query['insuranceStatus.insuranceNo']},
                        {'insuranceStatus.kvkHistoricalNo': query['insuranceStatus.insuranceNo']}
                    ];
                    query.$or = query.$or ? query.$or.concat( refinedInsuranceNoQuery ) : refinedInsuranceNoQuery;
                    delete query['insuranceStatus.insuranceNo'];
                }

                //  MOJ-9099 if more than 50 then we are probably making a PDF, looking up employees by schein
                //  for potentially thousands of patients will be very slow, so skip that column for now.  May add
                //  employee names to insuranceStatuses in future, pending discussion

                if ( !args.options || !args.options.limit || args.options.limit > 50 ) {
                    args.options.skipEmployeeNames = true;
                }

                self.patientsPopulated( user, query, args.options, done );
            },

            /**
             * get next appointments for a patient
             *
             * In originalParams:
             *  - patientId must be supplied
             *  - limit optional
             * @param args
             */
            getAppointments: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.getAppointments', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.getAppointments');
                }
                var
                    user = args.user,
                    params = args.originalParams,
                    patientId = params.patientId,
                    limit = params.limit,
                    callback = args.callback,
                    query = params.query || {
                            calendarType: 'real',
                            scheduled: 'waiting',
                            dateFrom: 'now',
                            duration: 'all',
                            patient: patientId,
                            show: 'location' // for form mapper
                        };

                if( !patientId ) {
                    callback( Y.doccirrus.errors.rest( 400, 'missing params' ) );
                    return;
                }

                if( limit ) {
                    limit = parseInt( limit, 10 );
                    if( 0 < limit && 1001 > limit ) {
                        query.limit = limit;
                    }
                }

                Y.doccirrus.calUtils.getEventList( user, query,
                    function( err, calevents ) {
                        if( err ) {
                            callback( err );
                            return;
                        }
                        callback( null, calevents );
                    } );
            },

            /**
             * Get data for PatientGadgetAppointments
             * @param {Object} parameters
             * @param {String} parameters.patientId
             * @param {Number} [parameters.limit]
             */
            getForPatientGadgetAppointments: function( parameters ) {
                Y.log('Entering Y.doccirrus.api.patient.getForPatientGadgetAppointments', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.patient.getForPatientGadgetAppointments');
                }
                var
                    async = require( 'async' ),
                    { user, query, options = {}, callback } = parameters,
                    patientId = query.patient,
                    limit = options.limit;

                if( parameters.originalParams && parameters.originalParams.options && parameters.originalParams.options.limit ){
                    limit = parameters.originalParams.options.limit;
                }

                if( !patientId ) {
                    callback( Y.doccirrus.errors.rest( 400, 'missing params' ) );
                    return;
                }

                async.waterfall( [
                    function( cb ) {
                        Y.doccirrus.api.patient.getAppointments( {
                            user: user,
                            originalParams: {
                                patientId: patientId,
                                limit: limit,
                                query: query
                            },
                            callback: cb
                        } );
                    },
                    function( appointments, cb ) {
                        Y.doccirrus.mongodb.getModel( user, 'patient', function( err, model ) {
                            if( err ) {
                                cb( err );
                                return;
                            }
                            model.mongoose.populate( appointments, [
                                {
                                    path: 'patient',
                                    select: ['_id', 'firstname', 'lastname', 'title', 'nameaffix', 'fk3120'].join( ' ' )
                                }
                            ], cb );
                        } );
                    },
                    function( appointments, cb ) {
                        Y.doccirrus.mongodb.getModel( user, 'scheduletype', function( err, model ) {
                            if( err ) {
                                cb( err );
                                return;
                            }
                            model.mongoose.populate( appointments, [
                                {
                                    path: 'scheduletype',
                                    select: ['_id', 'name'].join( ' ' )
                                }
                            ], cb );
                        } );
                    },
                    function( appointments, cb ) {
                        Y.doccirrus.mongodb.getModel( user, 'calendar', function( err, model ) {
                            if( err ) {
                                cb( err );
                                return;
                            }
                            model.mongoose.populate( appointments, [
                                {
                                    path: 'calendar',
                                    select: ['_id', 'name', 'color', 'employee'].join( ' ' )
                                }
                            ], cb );
                        } );
                    },
                    function( appointments, cb ) {
                        Y.doccirrus.mongodb.getModelReadOnly( user, 'employee', function( err, model ) {
                            var apptsWithEmployee = appointments.filter( appt => { return Boolean( appt.calendar && appt.calendar.employee ); } );
                            if( err ) {
                                cb( err );
                                return;
                            }
                            model.mongoose.populate( apptsWithEmployee, [
                                {
                                    path: 'calendar.employee',
                                    select: ['_id', 'firstname', 'lastname', 'title', 'nameaffix', 'fk3120'].join( ' ' )
                                }
                            ], function callbackfinal( err ) {
                                // Note: we need to return the full appointments list.
                                // mongoose populate should update only the references
                                // in the partial list.
                                cb( err, appointments );
                            } );
                        } );
                    }
                ], callback );

            },

            /**
             * Delete all patient crm references to this event.
             *
             * @param args
             */
            deleteCrmReminderCalRef: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.deleteCrmReminderCalRef', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.deleteCrmReminderCalRef');
                }
                var data = {
                    crmReminderCalRef: '',
                    crmReminder: null
                };

                Y.doccirrus.filters.cleanDbObject( data );

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'patient',
                    action: 'put',
                    data: data,
                    fields: ['crmReminderCalRef', 'crmReminder'],
                    query: args.query,
                    callback: function( err ) {
                        if( err ) {
                            Y.log( 'Error deleting crmReminderCalRef ' + err, 'error', NAME );
                        } else {
                            Y.log( 'Successfully deleted crmReminderCalRef for query ' + JSON.stringify( args.query ), 'info', NAME );
                        }
                    }
                } );
            },

            /**
             * queries the database for any patients matching the insurance Id/No, and, if not, the name and DOB
             * @param args
             * @param args.user
             * @param args.originalParams
             * @param args.originalParams.cardData
             * @param args.callback
             */
            getMatchingPatients: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.getMatchingPatients', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.getMatchingPatients');
                }
                var
                    _cb = args.callback,
                    _cardData = args.originalParams.cardData,
                    _query,
                    _find = function( callback ) {
                        Y.doccirrus.api.patient.patientsPopulated( args.user, _query, {}, callback );
                    };

                if( !_cardData ) {
                    return _cb( 'insufficient arguments' );
                }

                if( !_cardData.insuranceStatus || !_cardData.insuranceStatus.length ) {
                    return _cb( 'insurance data missing' );
                }

                _query = {
                    'insuranceStatus.insuranceId': _cardData.insuranceStatus[0].insuranceId,
                    'insuranceStatus.insuranceNo': _cardData.insuranceStatus[0].insuranceNo
                };

                _find( function( err, data ) {
                    if( err ) {
                        return _cb( 'unable to ask for patients: ' + err );
                    } else if( !data || !data.length || (data.length > 1) ) {
                        if( !data || !data.length ) {
                            _query = getNameDobUmlQuery( _cardData.lastname, _cardData.firstname, _cardData.kbvDob );
                            _find( function( err, data ) {
                                if( err ) {
                                    return _cb( 'unable to ask for patients: ' + err );
                                } else {
                                    data = data || [];
                                    return _cb( null, data );
                                }
                            } );
                        } else {
                            return _cb( null, data );
                        }
                    } else {
                        return _cb( null, data );
                    }
                } );

            },
            updateAttachedContent: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.updateAttachedContent', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.updateAttachedContent');
                }
                updateAttachedContent( args );
            },

            getPatientOFACInfo: async function( {user, cardNo} ) {
                const request = require( 'request' ),
                    soap = require( 'strong-soap' ).soap,
                    fs = require('fs'),
                    Path = require('path'),
                    redis = require('redis'),
                    {promisify} = require('util'),
                    {formatPromiseResult, promisifyArgsCallback} = require('dc-core').utils;
                let
                    error, result;

                [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'incaseconfiguration',
                    query: {},
                    options: {
                        fileds: {
                            coverCardCertPass: 1,
                            coverCardOfacId: 1,
                            coverCardPass: 1,
                            coverCardSoftwareId: 1,
                            coverCardSoftwareZsrNo: 1,
                            coverCardUser: 1,
                            coverCardZsrNo: 1
                        }
                    }
                } ) );

                if( error || !Array.isArray( result ) || !result.length ) {
                    error = error || new Y.doccirrus.commonerrors.DCError( 400, {message: 'Covercard configurations not found'} );
                    Y.log( `getCoverCardInfo: No Covercard configurations found, exiting. Error:\n${error.stack || error}`, 'error', NAME );
                    throw error;
                }
                const incaseConfig = result[0] || {};

                if( !Object.keys( incaseConfig ).length ) {
                    Y.log( `getCoverCardInfo: Covercard configurations are empty, exiting.`, 'error', NAME );
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Covercard configurations are empty'} );
                }

                const {coverCardCertPass, coverCardOfacId, coverCardPass, coverCardSoftwareId, coverCardSoftwareZsrNo,
                    coverCardUser, coverCardZsrNo} = incaseConfig;

                const noProxyRequest = request.defaults( {
                    proxy: null,
                    connection: 'keep-alive'
                } );
                const CLIENT_OPTIONS = {
                    request: noProxyRequest,
                    envelopeKey: 'soapenv'
                };

                const wsdlUrl = "https://ofac.ovan.ch/ws42a/wsdl/2.0/42aService.wsdl?WSDL";

                //--------------------- I. SOAP client initialization -------------------------------
                let [err, client] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    soap.createClient( wsdlUrl, CLIENT_OPTIONS, ( err, client ) => {
                        if( err ) {
                            return reject( err );
                        } else {
                            return resolve( client );
                        }
                    } );
                } ) );

                if( err ) {
                    Y.log( `TI-${Y.doccirrus.ipc.whoAmI()}-createClient: Error in creating client with wsdl: ${wsdlUrl} and options: ${CLIENT_OPTIONS}`, 'error', NAME );
                    return null;
                }
                Y.log(`getCoverCardInfo:  II. Setting certificate  ------------------:   Connection config: ${JSON.stringify(coverCardSoftwareId)}`, 'info', NAME);
                // -------------------- II. Setting certificate -----------------------------
                const certPath = Path.join( __dirname, '..', 'ofacCert.pfx' );

                let options = {
                    url: `https://www.ofac.ch/sso2/ident?cardNumber=${coverCardUser}&password=${coverCardPass}`,
                    agentOptions: {
                        pfx: fs.readFileSync(certPath),
                        passphrase: coverCardCertPass
                    }
                };
                Y.log(`getCoverCardInfo:  III. Getting sso token  ------------------:   Read certificate from pfx file`, 'info', NAME );
                // ------------------------------------ III. Getting sso token -----------------------------------------

                // III. A) Create Redis client
                const redisConfig = Y.doccirrus.utils.tryGetConfig( 'redis.json', {
                    "path": "/var/run/redis/redis.sock"
                } );
                const redisClient = redis.createClient( redisConfig ),
                    redisGetAsync = promisify(redisClient.get).bind(redisClient);
                let ssoToken;
                [err, ssoToken] = await formatPromiseResult(redisGetAsync('ssoToken'));
                if(err) {
                    Y.log(`error in redis getAsync: ${err}`, 'error', NAME);
                }

                Y.log(`getCoverCardInfo:  III.A Getting sso token / Redis ------------------:   got from Redis:  ${Boolean(ssoToken)}`, 'info', NAME );

                // III. B) get sso token
                if(!ssoToken) {
                    Y.log(`getCoverCardInfo:  III.B Getting sso token / HTTPS ------------------:   options.url  ${JSON.stringify(options.url)}  options.agentOptions attribs  ${JSON.stringify(Object.keys(options.agentOptions))}`, 'info', NAME );
                    Y.log(`getCoverCardInfo:  options  ${JSON.stringify(options)}`, 'debug', NAME );

                    const getSsoTokenRequest = promisifyArgsCallback(client.httpClient._request.post);
                    let ssoTokenResponse;
                    [err, ssoTokenResponse] = await formatPromiseResult(getSsoTokenRequest(options));

                    Y.log(`getCoverCardInfo:  III.B Getting sso token / HTTPS ------------------:   response  ${JSON.stringify(ssoTokenResponse)}`, 'info', NAME );

                    if(err || !ssoTokenResponse.headers['set-cookie']) {
                        Y.log( `Authorization request is not successfull: ${err}`, 'error', NAME );
                        throw err || Y.doccirrus.errors.rest( 13240, {}, true );
                    }
                    const cookieSSO = ssoTokenResponse.headers['set-cookie'].find(cookie => cookie.startsWith('OFACSSOV2'));
                    if(!cookieSSO) {
                        Y.log( `No OFACSSOV2 cookie in response`, 'error', 'soapClient.js' );
                        throw Y.doccirrus.errors.rest( 13240, {}, true );
                    }
                    ssoToken = cookieSSO.substring( cookieSSO.indexOf("=") + 1, cookieSSO.indexOf(";"));

                    if(!ssoToken) {
                        Y.log( `Corrupted OFACSSOV2 cookie`, 'error', 'soapClient.js' );
                        throw Y.doccirrus.errors.rest( 13240, {}, true );
                    }

                    // III. C) set into redis ssoToken
                    let expireDate = new Date();
                    expireDate.setHours(23,59,59,999);
                    const expires = ((expireDate.getTime() - new Date().getTimezoneOffset()*60000) - new Date().getTime())/1000;
                    redisClient.set('ssoToken', ssoToken, 'EX', Math.floor(expires));
                }
                Y.log(`getCoverCardInfo: IV. get SOAP Header  ------------------:   ssoToken:  ${ssoToken}`, 'info', NAME);

                // ---------------------------------- IV. SOAP Header -------------------------------------------;
                const sendingHeader = {
                        $attributes: {
                            'grp-data': 'OFAC-CA6',
                            'sending-date': new Date().toISOString(),
                            'sending-id' : "1",
                            'lang-code': "1",
                            version: "2.0",
                            test: "true"
                        },
                        sender: {
                            $attributes: {
                                code: '7'
                            },
                            'ofac-id': coverCardSoftwareId,
                            'zsr-id': coverCardSoftwareZsrNo
                        },
                        recipient: {
                            $attributes: {
                                code: '1'
                            },
                            'ofac-id': coverCardOfacId,
                            'zsr-id': coverCardZsrNo
                        },
                        software: {
                            $attributes: {
                                'ofac-id': coverCardSoftwareId,
                                'version': '1.0'
                            },
                            $value: 'Carte Assure 42a'
                        },
                        sso: {
                            $attributes: {
                                token: ssoToken
                            }
                        }
                    };

                client.addSoapHeader(sendingHeader, {nsURI: 'http://www.ofac.ch/XEDO', name: 'sending'});

                Y.log(`getCoverCardInfo:  V. Call of SOAP request  ------------------:   data:  ${cardNo} ${coverCardZsrNo}`, 'info', NAME );
                // ------------------------------------- V. Call of SOAP request -------------------------------------
                let soapResponse;

                Y.log( `getCoverCardInfo:  complete request:\n\n
                ${JSON.stringify( sendingHeader )}
                {  inputData: {
                     cardNoVeka: ${cardNo},
                     ZSRno: ${coverCardZsrNo}
                              }
                }`, 'debug', NAME );

                const promisifiedProcess = promisify(client.Process).bind(client);
                [err, soapResponse] = await formatPromiseResult(
                    promisifiedProcess({
                        inputData: {
                            cardNoVeka: cardNo,
                            ZSRno: coverCardZsrNo
                        }
                    }, {timeout: 9000}));

                if(err || !soapResponse) {
                    Y.log(`SOAP REQUEST ERROR! ${err}`, 'error', NAME);
                    throw Y.doccirrus.errors.rest( 13240, {}, true );
                }

                //--------------------------VI. Insert response to patient model in DB ------------------------------
                let stringifiedResponse, parsedResponse;
                try{
                    stringifiedResponse = JSON.stringify(soapResponse);
                    Y.log(`getCoverCardInfo:  VI. Insert response to patient model in DB  ------------------:   patient data:  ${stringifiedResponse.substr(0,1000)}`, 'info', NAME );
                    parsedResponse = JSON.parse(stringifiedResponse, (key, value) => {
                        if(key === '$attributes') {
                            return;
                        }
                        return value;
                    });
                } catch(err) {
                    Y.log(`Error in parsing soap response! ${err}`, 'error', NAME);
                    throw Y.doccirrus.errors.rest( 13240, {}, true );
                }

                return parsedResponse;
            },

            getNextSchein: getNextSchein,
            //getLastSchein: getLastSchein,
            getPatientHistory: getPatientHistory,
            lastAU: lastAU,
            hasDocumentedSchein,
            patientsWithoutCardSwipe: patientsWithoutCardSwipe,
            encryptPatientData: encryptPatientData,
            patientsWithApkInProgress: patientsWithApkInProgress,
            sendEmailConfirmation: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.sendEmailConfirmation', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.sendEmailConfirmation');
                }
                sendEmailConfirmation( args );
            },
            askConfirmEMail: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.askConfirmEMail', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.askConfirmEMail');
                }
                askConfirmEMail( args );
            },
            getNameDobUmlQuery: getNameDobUmlQuery,
            decryptPatientData: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.decryptPatientData', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.decryptPatientData');
                }
                decryptPatientData( args );
            },
            findPatientKeyByHash: function( args ) {
                Y.log('Entering Y.doccirrus.api.patient.findPatientKeyByHash', 'info', NAME);
                if (args.callback) {
                    args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.findPatientKeyByHash');
                }
                findPatientKeyByHash( args );
            },
            mergeImportedPatient: mergeImportedPatient,
            editTelekardioSerial: editTelekardioSerial,
            lastScheinForUser: lastScheinForUser,

            setLatestMedData: setLatestMedData,                 //  (re)create latestMedData from all activities
            setAllLatestMedData: setAllLatestMedData,           //  manually run migration on all patients

            setLatestLabData: setLatestLabData,                 //  (re)create latestLabData from all activities
            setAllLatestLabData: setAllLatestLabData,           //  manually run migration on all patients

            updateScheinEmployees: updateScheinEmployees,       //  record _ids of employee for latest schein, MOJ-9099
            guessBestEmployeeId: guessBestEmployeeId,
            getLocalPracticeId: getLocalPracticeId,
            getDQSId: getDQSId,
            mergePatients: mergePatients,
            getPatientPublicKeys,
            getPatientReferenceContacts: getPatientReferenceContacts,
            getPatientFromCard, //jshint ignore:line
            getPatientFromCardBatch, //jshint ignore:line
            //  Test / development routes to manually run migrations
            setPatientScheinEmployeeIds,
            removePlaceholderMarkers,
            linkPatientFamilyMember,
            getScheinsFromActivities,
            lookupPatientOnInSpectorSelectiveCareSystem,
            getPatientDiff,
            mergeKIMPatient
        };

    },
    '0.0.1', {
        requires: [
            'cardio-api',
            'casefolder-api',
            'casefolder-schema',
            'dcauth',
            'dccalutils',
            'dccommonutils',
            'dccommunication',
            'dcfilters',
            'doccirrus',
            'incasemojit-migrationhelper',
            'patient-process',
            'patient-schema'
        ]
    }
);
