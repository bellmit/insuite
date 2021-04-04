/**
 * User: pi
 * Date: 29/07/2015  15:15
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'patientportal-api', function( Y, NAME ) {
        /**
         * Contains general api for patient portal
         * @module patientportal-api
         */

        const
            i18n = Y.doccirrus.i18n,
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            util = require( 'util' ),
            PASSWORD_RESET_SUBJECT = i18n( 'PatPortalMojit.patientportal_api.text.PASSWORD_RESET_SUBJECT' ),
            PASSWORD_RESET_TEXT = i18n( 'PatPortalMojit.patientportal_api.text.PASSWORD_RESET_TEXT' );

        /**
         * Returns all prictices of user.
         * @method getPatientPractice
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function getPatientPractice( args ) {
            var
                user = args.user,
                callback = args.callback,
                async = require( 'async' );

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'patientreg',
                        query: {
                            identityId: user.identityId
                        },
                        options: {
                            select: {
                                customerIdPrac: 1
                            }
                        }
                    }, next );
                },
                function( patientregs, next ) {
                    var practices = [];
                    async.eachSeries( patientregs, function( patientreg, next ) {
                        Y.doccirrus.utils.dcprcGetCustomer( patientreg.customerIdPrac, function( err, results ) {
                            var data = results && results[ 0 ];
                            practices.push( data );
                            next( err );
                        } );
                    }, function( err ) {
                        next( err, practices );
                    } );

                }
            ], callback );

        }

        /**
         * Sends jawbone data to practice' prc
         * @method sendJawboneDataPRC
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.customerIdPrac customer number of practice
         * @param {String} [args.data.startTime] Epoch timestamp
         * @param {String} [args.data.update] new update status of device configuration
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function sendJawboneDataPRC( args ) {
            var
                user = args.user,
                callback = args.callback,
                data = args.data || {},
                jawboneData,
                patientData,
                identityId = user.identityId,
                moment = require( 'moment' ),
                async = require( 'async' );

            if( !data.customerIdPrac ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'customerIdPrac is missing.' } ) );
            }

            if( data.startTime ) {
                data.startTime = moment( data.startTime ).unix();
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.jawbone.getPatientJawboneData( {
                        user: user,
                        query: {
                            startTime: data.startTime
                        },
                        callback: function( err, result ) {
                            jawboneData = result;
                            next( err );
                        }
                    } );
                },
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patientreg',
                        action: 'get',
                        query: {
                            customerIdPrac: data.customerIdPrac,
                            identityId: identityId
                        },
                        options: {
                            limit: 1,
                            lean: true
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        patientData = results[ 0 ];
                        next();
                    } );
                },

                function( next ) {
                    var
                        options = Y.doccirrus.auth.setInternalAccessOptions(),
                        apiUrl = '/1/activity/:createJawboneActivity',
                        data = {
                            jawboneData: jawboneData,
                            patientId: patientData.patientId
                        };
                    Y.log( 'Sending jawbone data to PRC. url: ' + apiUrl, 'debug', NAME );
                    Y.doccirrus.blindproxy.getFromPRC( user, options, {
                        patientreg: patientData,
                        remoteurl: apiUrl,
                        remoteparams: data,
                        remotemethod: 'POST'
                    }, next );
                },
                function( results, next ) {
                    Y.log( 'Jawbone data has been sent successfully. Update jawbone device configuration. PatientregId: ' + patientData._id.toString(), 'debug', NAME );
                    var info = {
                        lastUpdate: moment().toISOString()
                    };
                    Y.doccirrus.api.deviceconfiguration.upsert( {
                        user: user,
                        data: {
                            lastUpdate: info.lastUpdate,
                            patientregId: patientData._id.toString(),
                            update: data.update,
                            type: 'JAWBONE'
                        },
                        query: {
                            deviceType: 'JAWBONE',
                            patientregId: patientData._id.toString()
                        },
                        callback: next
                    } );
                }
            ], callback );
        }

        /**
         * Returns device configuration for specified practice of current user
         * @method getDeviceConfigData
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.customerIdPrac customer number of practice
         * @param {Object} [args.query.deviceType=JAWBONE]
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function getDeviceConfigData( args ) {
            var
                async = require( 'async' ),
                user = args.user,
                queryParams = args.query || {},
                callback = args.callback;
            if( !queryParams.customerIdPrac ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'customerIdPrac is missing' } ) );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patientreg',
                        action: 'get',
                        query: {
                            customerIdPrac: queryParams.customerIdPrac,
                            identityId: user.identityId
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        if( !results[ 0 ] ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Patient is not registered in this Practice, customer No: ' + queryParams.customerIdPrac } ) );
                        }
                        next( err, results[ 0 ] );
                    } );
                },
                function( patientData, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'deviceconfiguration',
                        query: {
                            patientregId: patientData._id.toString(),
                            type: queryParams.deviceType || 'JAWBONE'
                        }
                    }, next );
                }
            ], callback );
        }

        /**
         * check if prc allows activity transfer
         * @method doesPRCAllowTransfer
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.patientreg patientreg entry
         * @param {Function} args.callback
         */
        function doesPRCAllowTransfer( args ) {
            var
                user = args.user,
                query = args.query || {},
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                callback = args.callback,
                apiUrl = '/1/incaseconfiguration/:isTransferAllowed';
            Y.doccirrus.blindproxy.getFromPRC( user, options, {
                patientreg: query.patientreg,
                remoteurl: apiUrl,
                remoteparams: {},
                remotemethod: 'GET'
            }, function( err, response ) {
                callback( err, response && response.data );
            } );
        }

        /**
         * @method patientSchedule
         * @param {Object}  args
         *
         * @deprecated
         */
        function patientSchedule( args ) {
            var
                callback = args.callback,
                params = args.data,
                user = args.user,
                subaction = params.subaction || (args.query && args.query.subaction),
                nRequests,
                nResp = 0,
                patientInfo,
                result = { error: [], data: [] },
                curPrac;

            // 4. Collate results from getSchedule()
            function getJoinSchedCb( pracInfo ) {
                var
                    //remember which host the response is from
                    myData = pracInfo;

                return function join( err, data ) {
                    nResp++;
                    if( err ) {
                        Y.log( 'Error getting db info: ' + err, 'warn', NAME );
                        result.error.push( err.toString() );
                    }
                    if( !data || !data[ 0 ] ) {
                        Y.log( 'Empty result schedules. ' + myData.host, 'info', NAME );
                    } else {
                        result.data.push( {
                            customerIdPrac: myData.customerIdPrac,
                            coname: myData.coname,
                            schedules: data
                        } );
                    }
                    if( nResp === nRequests ) {
                        return callback( null, result );
                    }
                };
            }

            function postCb( err, result ) {
                var fields = [ 'noPRC' ],
                    patientId = result && result.patientId;

                result = result && result.scheduleId || result; // just to keep it backward compatible

                if( err ) {
                    Y.log( 'error came back from PRC trying to post a schedule: ' + JSON.stringify( err ), NAME );
                    return callback( err );
                }

                if( curPrac.noPRC ) { // patient should have been created on PRC by now, then reset the flag
                    if( patientId ) { // possibly a different patient id came back, therefore must update it
                        fields.push( 'patientId' );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patientreg',
                        action: 'put',
                        fields: fields,
                        query: { _id: curPrac._id },
                        data: { noPRC: false, patientId: patientId, skipcheck_: true },
                        callback: function( err ) {
                            if( err ) {
                                Y.log( err, 'debug', NAME );
                            }
                            callback( null, result );
                        }
                    } );
                } else {
                    return callback( null, result );
                }
            }

            // data contains which hosts are available and now do the subaction.
            function handlePracData( err, data ) {
                var
                    i,
                    j;

                if( err ) {
                    Y.log( 'Error getting db info: ' + err, 'warn', NAME );
                    result.error.push( err.toString() );
                    callback( Y.doccirrus.errors.rest( 500, 'Nicht freigeschaltet [500]' ) );
                    return;
                }
                if( !data || !data.length ) {
                    callback( Y.doccirrus.errors.rest( 400, 'Nicht freigeschaltet [400]' ) );

                    return;
                }

                switch( subaction ) {
                    case 'get':
                        // get all prc schedules, requires only login
                        // all other info we extract from cache... (currently not caching host name)
                        nRequests = patientInfo.data.length;
                        for( i = 0; i < patientInfo.data.length; i++ ) {
                            // and from patientreg info...
                            for( j = 0; j < data.length; j++ ) {
                                if( patientInfo.data[ i ].customerIdPrac === data[ j ].customerIdPrac ) {
                                    curPrac = data[ j ];
                                    break;
                                }
                            }
                            if( j < data.length ) {
                                // get the schedule for the host.
                                Y.doccirrus.pucproxy.getSchedule( curPrac, getJoinSchedCb( patientInfo.data[ i ] ) );
                            } else {
                                Y.log( 'Skipping cache entry, ' + patientInfo.data[ i ].coname + ', patientreg not found!', 'error', NAME );
                            }
                        }
                        break;
                    case 'post':
                        // refactor code duplication TODO
                        if( !params.customerIdPrac ) {
                            callback( Y.doccirrus.errors.rest( 400, 'Praxis nicht ausgewählt' ) );
                            return;
                        }
                        // identify which prac info -- needed only to check access rights to the calendarId!!
                        for( i = 0; i < patientInfo.data.length; i++ ) {
                            if( params.customerIdPrac === patientInfo.data[ i ].customerIdPrac ) {
                                break;
                            }
                        }
                        curPrac = undefined;
                        // identify which patientreg info
                        for( i = 0; i < data.length; i++ ) {
                            if( params.customerIdPrac === data[ i ].customerIdPrac ) {
                                curPrac = data[ i ];
                                break;
                            }
                        }
                        // test if you have rights to access the calendar ...
                        // MOJ-1044, only use createPlanned
                        if( curPrac && curPrac.createPlanned ) {
                            // have access rights
                            // post specific prc schedule, requires login, customerIdPrac, start, end, title, ...
                            if( curPrac.noPRC ) { // if still not registered on PRC
                                Y.doccirrus.pucproxy.postFirstSchedule( user, curPrac, params, postCb );
                            } else {
                                Y.doccirrus.pucproxy.postSchedule( user, curPrac, params, postCb );
                            }
                        } else {
                            // have no access rights
                            callback( Y.doccirrus.errors.rest( 401, 'Nicht freigeschaltet von dieser Praxis' ) );
                            return;
                        }
                        break;
                    case 'delete':
                        // delete specific prc schedule, requires login, customerIdPrac, scheduleId
                        if( !params.customerIdPrac ) {
                            callback( Y.doccirrus.errors.rest( 400, 'Praxis nicht ausgewählt' ) );
                            return;
                        }
                        // identify which prac info -- needed only to check access rights to the calendarId!!
                        for( i = 0; i < patientInfo.data.length; i++ ) {
                            if( params.customerIdPrac === patientInfo.data[ i ].customerIdPrac ) {
                                break;
                            }
                        }
                        curPrac = undefined;
                        // identify which patientreg info
                        for( i = 0; i < data.length; i++ ) {
                            if( params.customerIdPrac === data[ i ].customerIdPrac ) {
                                curPrac = data[ i ];
                                break;
                            }
                        }

                        // test if you have rights to access the calendar ...
                        if( curPrac && curPrac.createPlanned ) {
                            curPrac.scheduleId = params.scheduleId;
                            curPrac.calendarId = params.calendarId;
                            curPrac.adhoc = params.adhoc;
                            Y.log( 'Deleting schedule ' + JSON.stringify( curPrac ), 'debug', NAME );
                            // have access rights
                            // post specific prc schedule, requires login, customerIdPrac, start, end, title, ...
                            Y.doccirrus.pucproxy.deleteSchedule( curPrac, postCb );
                        } else {
                            // have no access rights
                            callback( Y.doccirrus.errors.rest( 401, 'Nicht freigeschaltet von dieser Praxis' ) );
                            return;
                        }
                        break;

                    default:
                        return callback( Y.doccirrus.errors.rest( 500, 'No action defined [500]' ) );
                }
            }

            function patInfoCb( err, info ) {
                patientInfo = info;
                if( err ) {
                    // Some error occured
                    Y.log( 'System Error (PatInfo): ' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                if( !patientInfo.data || !patientInfo.data.length ) {
                    callback( Y.doccirrus.errors.rest( 400, 'Nicht freigeschaltet' ) );
                    return;
                }

                Y.doccirrus.pucproxy.getPracticesByUser( user, {}, handlePracData );
            }

            // Ask PUC Proxy to get the info
            Y.doccirrus.pucproxy.loadPatientInfo( user, patInfoCb );
        }

        /**
         * @method getPatientSchedule
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.calblack
         */
        function getPatientSchedule( args ) {
            var
                async = require( 'async' ),
                callback = args.callback,
                user = args.user,
                canCreateEvent = false;

            function patInfoCb( err, info ) {
                var
                    patientInfo = info;
                if( patientInfo && patientInfo.data ) {
                    canCreateEvent = patientInfo.data.some( practice => true === practice.createEvent && practice.confirmed );
                }
                if( err ) {
                    // Some error occured
                    Y.log( 'System Error (getPatientSchedule): ' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                if( !patientInfo.data || !patientInfo.data.length ) {
                    callback( Y.doccirrus.errors.rest( 400, 'Nicht freigeschaltet' ) );
                    return;
                }
                // get all prc schedules, requires only login
                async.mapSeries( patientInfo.data, function( practice, next ) {
                    var
                        calendarsMap = new Map(),
                        prcOffline = practice.prcOffline,
                        practiceData = {
                            customerIdPrac: practice.customerIdPrac,
                            coname: practice.coname,
                            patientId: practice.patientId,
                            calendars: practice.calendars,
                            canCreateEvent: canCreateEvent,
                            prcOffline: prcOffline,
                            schedules: []
                        };
                    if( prcOffline ) {
                        return next( null, practiceData );
                    } else {
                        Y.doccirrus.pucproxy.getSchedule( practice, function( err, data ) {
                            if( err ) {
                                Y.log( 'Error getting db info: ' + err, 'warn', NAME );
                                if( 503 === err.code ) {
                                    /**
                                     * FIXME this is a hack. We need a way how to pass data with errors. Client side should understand
                                     *  that data from server is not complete because of some of requests were failed
                                     */
                                    prcOffline = true;
                                    return next();
                                } else {
                                    return next( err );
                                }
                            }
                            if( !data || !data[ 0 ] ) {
                                Y.log( 'Empty result schedules. ' + practice.host, 'info', NAME );
                            }
                            practiceData.prcOffline = prcOffline;
                            // process all resourceBased appointments to merge events with same linkByResource into one entry
                            for( let item of data ) {
                                if( item.linkByResource ) {
                                    if( calendarsMap.has( item.linkByResource ) ) {
                                        calendarsMap.set( item.linkByResource, [...calendarsMap.get( item.linkByResource ), item.calendar]);
                                    } else {
                                        calendarsMap.set( item.linkByResource, [item.calendar] );
                                    }
                                }
                            }
                            data = data.filter( item => {
                                if( item.linkByResource ) {
                                    if( calendarsMap.get( item.linkByResource ) ) {
                                        item.calendar = calendarsMap.get( item.linkByResource );
                                        calendarsMap.delete( item.linkByResource );
                                        return true;
                                    } else {
                                        return false;
                                    }
                                } else {
                                    return true;
                                }
                            } );
                            practiceData.schedules = data || [];

                            next( err, practiceData );
                        } );
                    }
                }, function( err, result ) {
                    callback( err, result );

                } );
            }

            // Ask PUC Proxy to get the info
            Y.doccirrus.pucproxy.loadPatientInfo( user, patInfoCb );
        }

        /**
         * @method getFullPracticeInfo
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.dcCustomerNo
         * @param {Boolean} args.query.checkTransfer
         * @param {Function} args.callback
         */
        function getFullPracticeInfo( args ) {
            var
                user = args.user,
                queryParams = args.query || {},
                callback = args.callback;
            Y.doccirrus.pucproxy.getFullPracticeInfo( user, {
                dcCustomerNo: queryParams.dcCustomerNo,
                checkTransfer: queryParams.checkTransfer
            }, callback );
        }

        /**
         * @method getPracticeAppointmentTypes
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.customerIdPrac dcCustomerNo
         * @param {Function} args.callback
         */
        function getPracticeAppointmentTypes( args ) {
            var
                callback = args.callback,
                queryParams = args.query || {},
                user = args.user,
                isVCUser = user && 'VC Proxy User' ===  user.U && 'vc-user' === user.id,
                getPractices = isVCUser ? Y.doccirrus.pucproxy.getPracticesByVCUser : Y.doccirrus.pucproxy.getPracticesByUser;

            function getPracticeType( practice ) {
                let query;
                if( isVCUser ) {
                    query = {type: Y.doccirrus.schemas.conference.conferenceTypes.ONLINE_CONSULTATION};
                }
                Y.doccirrus.pucproxy.getScheduleType( practice, query, function( err, data ) {
                    if( err ) {
                        Y.log( 'Error getting db info: ' + err, 'warn', NAME );
                        return callback( err );
                    }
                    if( !data && 'MochaTest' === queryParams.browser ) {
                        return callback();
                    }
                    if( !data || !data[ 0 ] ) {
                        Y.log( 'Empty result metaprac. ' + practice.host, 'info', NAME );
                        if( isVCUser ) {
                            return callback( new Y.doccirrus.commonerrors.DCError( 'patientportal_01' ) );
                        }
                        return callback( Y.doccirrus.errors.rest( 400, 'Keine Informationen vorhanden5' ) );
                    }
                    callback( err, data );
                } );
            }

            getPractices( user, { dcCustomerNo: queryParams.customerIdPrac }, function( err, data ) {
                if( err ) {
                    Y.log( 'Error getting db info: ' + err, 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( 500, 'Internal Server Error' ) );
                }
                if( !data || !data[ 0 ] ) {
                    Y.log( 'Empty result metaprac.', 'info', NAME );
                    return callback( Y.doccirrus.errors.rest( 400, 'Keine Informationen vorhanden5' ) );
                }
                getPracticeType( data[ 0 ] );
            } );
        }

        /**
         * Gets 3 free appointments
         * @method getFreeAppointments
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.customerIdPrac
         * @param {String} args.query.appointmentType scheduleType id
         * @param {Boolean} args.query.isPreconfigured
         * @param {String} args.query.datetime
         * @param {String} args.query.calendarId
         * @param {String} args.query.duration
         * @param {Function} args.callback
         *
         * @return {Function}   callback
         */
        function getFreeAppointments( args ) {
            var
                callback = args.callback,
                user = args.user,
                queryParams = args.query || {},
                searchParams = {},
                isVCUser = user && 'VC Proxy User' ===  user.U && 'vc-user' === user.id,
                getPractices = isVCUser ? Y.doccirrus.pucproxy.getPracticesByVCUser : Y.doccirrus.pucproxy.getPracticesByUser,
                moment = require( 'moment' );

            if( !queryParams.customerIdPrac ) {
                return callback( Y.doccirrus.errors.rest( 400, 'customerIdPrac is missing' ) );
            }

            function handlePracData( err, pracData ) {
                if( err ) {
                    Y.log( 'getFreeAppointments. Error getting db info: ' + err, 'error', NAME );
                    return callback( Y.doccirrus.errors.rest( 500, 'Nicht freigeschaltet [500]' ) );
                }
                if( !pracData || !pracData[ 0 ] ) {
                    return callback( Y.doccirrus.errors.rest( 400, 'Nicht freigeschaltet [400]' ) );
                }

                searchParams = pracData[ 0 ];
                searchParams.scheduleType = queryParams.appointmentType;
                searchParams.n = queryParams.n;
                searchParams.startTime = queryParams.startTime;
                searchParams.endTime = queryParams.endTime;
                searchParams.isPreconfigured = queryParams.isPreconfigured;
                searchParams.resourceSlotSearch = queryParams.resourceSlotSearch;
                searchParams.isRandomMode = queryParams.isRandomMode;
                searchParams.start = moment( queryParams.datetime ).utc().toJSON();
                searchParams.calendar = queryParams.calendarId;
                searchParams.pracId = queryParams.customerIdPrac;
                searchParams.duration = queryParams.duration;
                Y.doccirrus.pucproxy.getNextSchedules( searchParams, callback );
            }

            getPractices( user, { dcCustomerNo: queryParams.customerIdPrac }, handlePracData );
        }

        /**
         * Gets "adhoc" appointment
         * @method getWaitingTime
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.calendarId
         * @param {Object} [args.query.isPreconfigured]
         * @param {Object} args.query.customerIdPrac dcCustomerNo
         * @param {Object} args.callback
         */
        function getWaitingTime( args ) {
            var
                callback = args.callback,
                queryParams = args.query || {},
                searchParams,
                user = args.user,
                moment = require( 'moment' );

            function handleWaitingtimeData( err, data ) {
                var
                    waitingtime;
                if( err ) {
                    return callback( Y.doccirrus.errors.rest( 500, 'System error' ) );
                }
                if( data && data[ 0 ] && data[ 0 ].start ) {

                    waitingtime = {
                        waitingtime: moment( data[ 0 ].start ).diff( moment(), 'minutes' ),
                        type: 'MINUTES'
                    };
                }
                callback( null, [ waitingtime ] );
            }

            function handlePracData( error, pracData ) {
                if( error ) {
                    Y.log( 'getWaitingTime. Error getting db info: ' + error, 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( 500, 'Nicht freigeschaltet [500]' ) );
                }

                if( !pracData || !pracData[ 0 ] ) {
                    return callback( Y.doccirrus.errors.rest( 401, 'Nicht freigeschaltet [401]' ) );
                }

                searchParams = pracData[ 0 ];
                searchParams.calendarId = queryParams.calendarId;
                searchParams.isRandomMode = queryParams.isRandomMode;
                //searchParams.pracId = queryParams.customerIdPrac;

                if( queryParams.isPreconfigured ) {
                    handleWaitingtimeData( null, null ); // short circuit
                } else {

                    Y.doccirrus.pucproxy.getWaitingtime( searchParams, handleWaitingtimeData );
                }
            }

            Y.doccirrus.pucproxy.getPracticesByUser( user, { dcCustomerNo: queryParams.customerIdPrac }, handlePracData );
        }

        /**
         * Creates an appointment for the user
         * @method makeAppointment
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.customerIdPrac
         * @param {Object} args.data schedule data
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function makeAppointment( args ) {
            var
                callback = args.callback,
                data = args.data,
                queryParams = args.query || {},
                user = args.user,
                currentPractice;

            if( !queryParams.customerIdPrac ) {
                return callback( Y.doccirrus.errors.rest( 400, 'customerIdPrac is missing' ) );
            }
            if( !data ) {
                return callback( Y.doccirrus.errors.rest( 400, 'data is missing' ) );
            }

            function postCb( err, result ) {
                var fields = [ 'noPRC' ],
                    patientId = result && result.patientId;

                result = result && result.scheduleId || result; // just to keep it backward compatible

                if( err ) {
                    Y.log( 'error came back from PRC trying to post a schedule: ' + JSON.stringify( err ), NAME );
                    return callback( err );
                }

                if( currentPractice.noPRC ) { // patient should have been created on PRC by now, then reset the flag
                    if( patientId ) { // possibly a different patient id came back, therefore must update it
                        fields.push( 'patientId' );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patientreg',
                        action: 'put',
                        fields: fields,
                        query: { _id: currentPractice._id },
                        data: { noPRC: false, patientId: patientId, skipcheck_: true },
                        callback: function( err ) {
                            if( err ) {
                                Y.log( err, 'debug', NAME );
                            }
                            callback( null, result );
                        }
                    } );
                } else {
                    return callback( null, result );
                }
            }

            // data contains which hosts are available and now do the subaction.
            function handlePracData( err, practices ) {
                if( err ) {
                    Y.log( 'makeAppointment. Error getting db info: ' + err, 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( 500, 'Nicht freigeschaltet [500]' ) );

                }
                if( !practices || !practices.length ) {
                    return callback( Y.doccirrus.errors.rest( 400, 'Nicht freigeschaltet [400]' ) );
                }
                currentPractice = practices[ 0 ];
                // test if you have rights to access the calendar ...
                // MOJ-1044, only use createPlanned
                if( currentPractice && currentPractice.createPlanned ) {
                    // have access rights
                    // post specific prc schedule, requires login, customerIdPrac, start, end, title, ...
                    if( currentPractice.noPRC ) { // if still not registered on PRC
                        Y.doccirrus.pucproxy.postFirstSchedule( user, currentPractice, data, postCb );
                    } else {
                        Y.doccirrus.pucproxy.postSchedule( user, currentPractice, data, postCb );
                    }
                } else {
                    // have no access rights
                    return callback( Y.doccirrus.errors.rest( 401, 'Nicht freigeschaltet von dieser Praxis' ) );
                }

            }

            Y.doccirrus.pucproxy.getPracticesByUser( user, { dcCustomerNo: queryParams.customerIdPrac }, handlePracData );

        }

        /**
         *  Get Recaptcha SiteKey
         *  @method getRecaptchaSiteKey
         *  @param {Object} args
         *  @return {Promise<*>}
         */
        async function getRecaptchaSiteKey(args) {
            const { /*user,*/ callback} = args,
                googleApiCfg = Y.doccirrus.utils.tryGetConfig('googleApiKeys.json', null);

            if (!googleApiCfg || !googleApiCfg.grecaptchaV2 || !googleApiCfg.grecaptchaV2.siteKey) {
                Y.log(`getRecaptchaSiteKey: googleApiCfg could not be loaded: ${JSON.stringify(googleApiCfg)}`, 'error', NAME);
                return callback(Y.doccirrus.errors.rest(404, 'Internal Server Error', true));
            }

            return callback(null, googleApiCfg.grecaptchaV2.siteKey);

        }

        /**
         *  Verify Recaptchatoken
         *  @method verifyRecaptchaToken
         * @param {Object} token
         *  @return {Promise<*>}
         */
        async function verifyRecaptchaToken(token) {

            if (!token) {
                Y.log(`verifyRecaptchaToken: insufficient parameters: ${JSON.stringify(token)}`, 'error', NAME);
                return false;
            }

            const rp = require('request-promise'),
                googleApiCfg = Y.doccirrus.utils.tryGetConfig('googleApiKeys.json', null);

            if (!googleApiCfg || !googleApiCfg.grecaptchaV2 || !googleApiCfg.grecaptchaV2.siteKey) {
                Y.log(`verifyRecaptchaToken: googleApiCfg could not be loaded: ${JSON.stringify(googleApiCfg)}`, 'error', NAME);
                return true;
            }
            const SECRET_KEY = googleApiCfg.grecaptchaV2.secretKey;

            let url = 'https://www.google.com/recaptcha/api/siteverify?secret=' + SECRET_KEY + '&response=' + token;

            let promise = rp({
                method: 'POST',
                rejectUnauthorized: false,
                uri: url,
                body: {},
                json: true
            });
            let [err, response] = await formatPromiseResult(promise);

            if (err) {
                Y.log(`verifyRecaptchaToken: could not query google.com/recaptcha/api/siteverify ${err.stack || err}`, 'error', NAME);
                return true; //fail open
            }

            if (!response || 'undefined' === typeof response.success) {
                Y.log(`verifyRecaptchaToken: Response content not present : ${JSON.stringify(response)}`, 'error', NAME);
                return true; // fail open
            }

            return response.success;
        }

        /**
         * Makes call of proxy function postConference() and passes conference and patient data into it
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query - contains dcCustomerNo to get practice by
         * @param {Object} args.data - data to pass to PRC to create conference and stub for patient
         * @param {Function} args.callback
         * @returns {Promise<*>}
         */
        async function makeVideoConference( args ) {
            let
                { user, query, data, callback } = args,
                getPracticesByVCUserP = util.promisify( Y.doccirrus.pucproxy.getPracticesByVCUser ),
                challengeSucess;

            if (!data && !data.patientData && !data.patientData.token || !data.patientData.emailVerify) {
                Y.log( `makeVideoConference: insufficient parameters token || emailVerify: ${JSON.stringify(data.patientData)}`, 'error', NAME );
                return callback(Y.doccirrus.errors.rest(404, 'Recaptcha token or EmailVerify is not defined ', true));
            }

            challengeSucess = await verifyRecaptchaToken(data.patientData.token);

            if (data.patientData.emailVerify !== 'emailVerify' || challengeSucess === false){
                Y.log( `makeVideoConference: emailVerify( ${data.patientData.emailVerify}) is not empty or recaptcha challenge failed ${!challengeSucess}: `, 'error', NAME );
                return callback(Y.doccirrus.errors.rest(404, 'Challenge failed', true));
            }

            let err, practice, result;

            [err, practice] = await formatPromiseResult( getPracticesByVCUserP( user, query ) );

            if( err ) {
                Y.log( `makeVideoConference: Error while getting practice for VC user: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }

            if( !practice || !practice[0] ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'practice is missing' } )  );
            }

            [err, result] = await formatPromiseResult( Y.doccirrus.pucproxy.postConference( user, practice[0], data ) );

            if( err ) {
                Y.log( `makeVideoConference: Error while ost conference: ${JSON.stringify(err.stack || err)}`, 'warn', NAME );
                return callback( err );
            }
            return callback( null, result );
        }

        /**
         * Handles request from VC confirmation email
         * - gets a practice by given 'dcCustomerNo' value
         * - calls a pucproxy function to send a confirmation to practice
         *
         * @param {Object}  args
         * @returns {Promise<*>}
         */
        async function confirmVC( args ) {
            let
                {user, data: {dcCustomerNo, scheduleId} = {}, callback} = args,
                getPracticesByVCUserP = util.promisify( Y.doccirrus.pucproxy.getPracticesByVCUser );

            let err, practice, result;

            [err, practice] = await formatPromiseResult( getPracticesByVCUserP( user, {dcCustomerNo} ) );

            if( err ) {
                Y.log( `confirmVC: Error while getting practice for VC user: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }

            if( !practice || !practice[0] ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'practice is missing'} ) );
            }

            [err, result] = await formatPromiseResult( Y.doccirrus.pucproxy.sendVCConfirmationToPractice( user, practice[0], {scheduleId} ) );

            if( err ) {
                Y.log( `confirmVC: Error while send confirmation to PRC: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }
            return callback( null, result );
        }

        /**
         *  Check Password of Patient
         *  @method checkPassword
         *  @param {Object} args
         *  @param {Object} args.user
         *  @param {String} args.user.identityId
         *  @param {String} args.originalParams.hash
         *  @param {Function} args.callback
         *  @return {Promise<*>}
         */
        async function checkPassword(args) {

            var
                user = args.user,
                identityId = user.identityId,
                hash = args.originalParams.hash,
                callback = args.callback;
            let
                dbPw,
                oldSalt,
                saltedHash,
                identity,
                err, result;

            if (!identityId || !hash) {
                Y.log( `checkPassword: insufficient parameters: ${JSON.stringify(args.originalParams)}`, 'error', NAME );
                return callback(Y.doccirrus.errors.rest(404, 'IdentityId or Hash is not defined', true));
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    model: 'identity',
                    user: user,
                    action: 'get',
                    query: {_id: identityId},
                    options: {}
                })
            );

            if (err) {
                Y.log( `checkPassword: could not query  patient account: ${err.stack||err}`, 'error', NAME );
                return callback(err);
            }

            identity = result && result[0];

            if (!identity || !identity.pw) {
                Y.log( `checkPassword: patient account not found: ${user.id}`, 'error', NAME );
                return callback(Y.doccirrus.errors.rest(404, 'Patient account not found', true));
            }

            dbPw = identity.pw;
            oldSalt = dbPw.slice(3, 15);
            saltedHash = Y.doccirrus.auth.getSaltyPassword(hash, oldSalt);
            if (saltedHash === dbPw) {
                return callback(null, {match: true});
            }
            return callback(null, {match: false});
        }

        /**
         * _sendMail
         * @param {Object}          identity
         * @param {Object}          user
         * @param {Function}        callback
         * @private
         */
        function _sendMail( identity, user, callback ) {
            var
                jadeParams = {},
                emailOptions,
                myEmail,
                qry = '?user=' + encodeURIComponent( identity.username ) +
                      '&token=' + encodeURIComponent( identity.pwResetToken );

            jadeParams.text = Y.Lang.sub( PASSWORD_RESET_TEXT, {
                username: identity.username,
                link: Y.doccirrus.auth.getPUCUrl( '/passreset' + qry )
            } );
            emailOptions = {
                subject: PASSWORD_RESET_SUBJECT,
                serviceName: 'patientPortalService',
                to: identity.username,
                jadeParams: jadeParams,
                jadePath: './mojits/PUCMojit/views/passwordresetemail.jade.html',
                attachments: []
            };

            myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
            Y.doccirrus.email.sendEmail( {...myEmail, user}, callback );
        }

        /**
         * resetPassword
         * @param {Object}          args
         * @returns {Promise<*>}
         */
        async function resetPassword( args ) {
            var
                user = args.user || Y.doccirrus.auth.getSUForTenant( Y.doccirrus.auth.getPUCTenantId() ),
                data = args.data || {},
                username = data.username,
                callback = args.callback;

            Y.log( 'resetPassword; called for patient: ' + user, 'debug', NAME );

            if( !username ) {
                Y.log( 'resetPassword. Invalid params, username is missing' );
                return callback( Y.doccirrus.errors.rest( 400, 'Invalid params, username is missing', true ) );
            }

            let
                err,
                errorMessage = 'Something went wrong during Password reset request, please try again later or contact support.',
                successMessage = 'If there is a user, you will shortly receive an email with your token to reset the password.',
                result,
                identity;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    model: 'identity',
                    user: user,
                    action: 'get',
                    query: {username: username},
                    options: {}
                } ) );

            if( err ) {
                Y.log( `resetPassword: Error while calling identity model: ${err}`, 'error', NAME );
                // Client shut not know what went wrong (no-brute-force)
                return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: errorMessage } )  );
            }

            if( !result.length ) {
                Y.log( `resetPassword: User not found for Password reset: for ${username} `, 'error', NAME );
                // Client shut not know if an identity exists (no-brute-force)
                return callback( null, successMessage );
            }

            identity = result[0];
            if( identity.pwResetToken ) {
                Y.log( 'resetpw repeated for patient: ' + user, 'info', NAME );
            }

            // generate token
            identity.pwResetToken = Y.doccirrus.auth.getToken();
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'put',
                query: {
                    _id: identity._id
                },
                fields: Object.keys( identity ),
                data: Y.doccirrus.filters.cleanDbObject( identity )
            } );

            _sendMail( identity, user, ( err ) => {
                if( err ) {
                    Y.log( `resetPassword: Error while sendMail ${err}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: errorMessage } )  );
                }
                return callback( null, successMessage );
            } );
        }

        function getPatientPortalUrlOfPRC( args ) {
            const
                { user, data: { dcCustomerNo } = {}, callback } = args,
                async = require( 'async' );
            if( !dcCustomerNo ) {
                Y.log( 'getPatientPortalUrlOfPRC error: dcCustomerNo is missing.', 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'dcCustomerNo is missing' } ) );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'metaprac',
                        action: 'get',
                        query: {
                            customerIdPrac: dcCustomerNo
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results[ 0 ] ) {
                            Y.log( `getPatientPortalUrlOfPRC. metaprac entry not found for dcCustomerNo: ${dcCustomerNo}`, 'error', NAME );
                            return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: `metaprac entry not found for dcCustomerNo: ${dcCustomerNo}` } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( metaprac, next ) {
                    Y.doccirrus.pucproxy.getPRCPatientPortalUrl( {
                        data: { host: metaprac.host },
                        callback( err, data ) {
                            if( err ) {
                                return next( err );
                            }
                            next( null, data.patientPortalUrl );
                        }
                    } );
                }
            ], callback );
        }

        /**
         * Registers patient on Patient Portal
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} args.data.patientregId
         * @param {Object} args.data.pwHash
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function registerPatient( args ) {
            var
                user = Y.doccirrus.auth.getSUForPUC(),
                data = args.data,
                callback = args.callback,
                async = require( 'async' ),
                patientreg,
                patientPortalUrl,
                identityId;
            if( !data.patientregId || !data.pwHash ) {
                return callback( Y.doccirrus.errors.rest( 400, 'Invalid params', true ) );
            }
            async.series( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patientreg',
                        action: 'get',
                        query: {
                            _id: data.patientregId
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        if( !results.length ) {
                            return next( Y.doccirrus.errors.rest( 400, 'Wrong patientreg id', true ) );
                        }
                        if( !results[ 0 ].email ) {
                            return next( Y.doccirrus.errors.rest( 400, 'invalid patientreg', true ) );
                        }
                        patientreg = results[ 0 ];
                        next();
                    } );
                },
                function( next ) {
                    getPatientPortalUrlOfPRC( {
                        user,
                        data: { dcCustomerNo: patientreg.customerIdPrac },
                        callback( err, data ) {
                            if( err ) {
                                return next( err );
                            }
                            patientPortalUrl = data;
                            if( patientreg.identityId ) {
                                return next( Y.doccirrus.errors.rest( 22003, '', true ) );
                            }
                            next();
                        }
                    } );
                },
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'identity',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( {
                            status: 'ACTIVE',
                            username: patientreg.email,
                            pw: Y.doccirrus.auth.getSaltyPassword( data.pwHash )
                        } )
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        identityId = results[ 0 ];
                        next();
                    } );
                },
                function( next ) {
                    patientreg.identityId = identityId;
                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patientreg',
                        action: 'put',
                        query: {
                            _id: patientreg._id
                        },
                        fields: Object.keys( patientreg ),
                        data: Y.doccirrus.filters.cleanDbObject( patientreg )
                    }, next );
                },
                function( next ) {
                    Y.doccirrus.api.patientreg.confirmPatientEmailToPRC( {
                        user: user,
                        data: {
                            patientreg: patientreg
                        }
                    }, function() {
                        /**
                         * it is not a problem that we can not confirm email. After registration user can do it manually.
                         */
                        next();
                    } );
                }
            ], function( err ) {
                if( err ) {
                    return callback( err, { identityId, patientPortalUrl } );
                }
                callback( err, { identityId, patientPortalUrl } );
            } );
        }

        function checkApiAccess( params, callback ) {
            const
                { rest: { action } = {}, friend } = params,
                actionWhiteList = [
                    'getFullPracticeInfo',
                    'getPracticeAppointmentTypes',
                    'getFreeAppointments',
                    'makeAppointment',
                    'getPatientSchedule',
                    'listMedia',
                    'getMedia',
                    'postMedia',
                    'register',
                    'sendPINEmail',
                    'registerPatientKey',
                    'getPatientInfo'
                ],
                forbidden = new Y.doccirrus.commonerrors.DCError( 401 );
            if( Y.doccirrus.auth.friendsList.UVITA !== friend ) {
                return setImmediate( callback );
            }
            switch( friend ) {
                case Y.doccirrus.auth.friendsList.UVITA:
                    if( actionWhiteList.includes( action ) ) {
                        return setImmediate( callback );
                    }
                    break;
            }
            return setImmediate( callback, forbidden );
        }

        function getApiUser( params, callback ) {
            const
                { rest: { action, data, user = {} } = {}, friend } = params,
                publicActions = [ 'register' ];
            if( publicActions.includes( action ) ) {
                return setImmediate( callback, null, Y.doccirrus.auth.getSUForPUC() );
            }
            if( data && data.identityId ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'identity',
                    action: 'get',
                    query: {
                        _id: data.identityId,
                        'partnerIds.partnerId': friend
                    }
                }, ( err, results ) => {
                    let
                        _user;
                    if( err ) {
                        Y.log( `Could not get user for patientportal api. Error: ${JSON.stringify( err )}`, 'error', NAME );
                        return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'could not get identity' } ) );
                    }
                    if( !results || !results[ 0 ] ) {
                        return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'identity not found' } ) );
                    }

                    _user = Y.doccirrus.auth.buildUserByIdentity( {
                        identity: results[ 0 ],
                        tenantId: user.tenantId
                    } );
                    callback( null, _user );
                } );
            } else {
                setImmediate( callback, new Y.doccirrus.commonerrors.DCError( 400, { message: 'identityId is missing' } ) );
            }
        }

        /**
         * @method confirmOptin
         * @param {Object} args
         * @param {Object} args.data
         * @param {String} args.data.code
         * @param {String} args.data.email
         * @param {Function} args.callback
         * @see Y.doccirrus.api.patientreg.patientOptin
         */
        function confirmOptin( args ) {
            Y.log('Entering Y.doccirrus.api.patientportal.confirmOptin', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.confirmOptin');
            }
            const
                { data: { code, email } = {}, callback } = args,
                user = Y.doccirrus.auth.getSUForPUC();
            Y.doccirrus.api.patientreg.patientOptin( {
                user: user,
                data: {
                    ccode: code,
                    email: email
                },
                callback
            } );
        }

        /**
         * Register new patient without email confirmation
         * @method register
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.firstname
         * @param {String} args.data.lastname
         * @param {String} args.data.email
         * @param {String} args.data.dob
         * @param {String} args.data.customerId
         * @param {String} args.data.pw
         * @param {String} args.data.talk
         * @param {String} args.data.phone
         * @param {Function} args.callback
         */
        function register( args ) {
            Y.log('Entering Y.doccirrus.api.patientportal.register', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.register');
            }
            const
                { data: { firstname, lastname, email, dob, customerId, pw, talk, phone } = {}, user, callback, httpRequest = {} } = args,
                async = require( 'async' );
            let
                partnerId;
            Y.log( `patient trying self-registration on practice: ${customerId}`, 'info', NAME );

            if( httpRequest && httpRequest.friendData && httpRequest.friendData.appName ) {
                partnerId = httpRequest.friendData.appName;
            }
            // check params
            if( !firstname || !lastname || !email || !customerId || !dob || !pw || !talk ) {
                callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Bad params. firstname, lastname, email, dob, customerId, pw, talk are required' } ) );
                return;
            }
            async.waterfall( [
                function( next ) {
                    // check if customerId is correct
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'metaprac',
                        query: { 'customerIdPrac': customerId }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results.length ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Practice not found.' } ) );
                        }
                        next();
                    } );
                },
                function( next ) {
                    // check if email is not registered in patientreg
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patientreg',
                        query: { 'customerIdPrac': customerId, 'email': email, 'dob': dob }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( results.length ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 60001 ) );
                        }
                        next();
                    } );
                },
                function( next ) {
                    // check if email is not registered in identity
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'identity',
                        query: { username: email }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( results.length ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 60001 ) );
                        }
                        next();
                    } );
                },
                function( next ) {
                    // check if user was already registered with the email on dcprc
                    Y.doccirrus.utils.dcprcKnowsEmailOrPhone( email, null, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( results.length ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 60001 ) );
                        }
                        next();
                    } );
                },
                function( next ) {
                    // create identity
                    const
                        identityData = Y.doccirrus.api.identity.createNewIdentityForPatientreg( {
                            email,
                            lastname,
                            firstname,
                            pw: Y.doccirrus.auth.getSaltyPassword( pw )

                        }, false, false );
                    Y.log( `Writing identity on PUC. username: ${identityData.username}`, 'debug', NAME );
                    if( partnerId ) {
                        identityData.partnerIds = [
                            {
                                partnerId
                            }
                        ];
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'post',
                        model: 'identity',
                        data: Y.doccirrus.filters.cleanDbObject( identityData ),
                        options: { entireRec: true }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        next( null, { identity: results[ 0 ] } );
                    } );
                },
                function( data, next ) {
                    const
                        profileData = {
                            firstname,
                            lastname,
                            dob,
                            confirmed: true, // confirmed for DC
                            talk,
                            email,
                            phone
                        };

                    if( partnerId ) {
                        profileData.partnerIds = [
                            {
                                partnerId
                            }
                        ];
                    }
                    Y.log( `Writing contact on DCPRC: ${JSON.stringify( profileData )}`, 'debug', NAME );
                    Y.doccirrus.utils.dcprcSetPatientAsContact( profileData, ( err, response ) => {
                        const
                            customerIdPat = response && response.data && response.data[ 0 ];
                        if( response.meta && response.meta.errors && response.meta.errors.length ) {
                            return next( response.meta && response.meta.errors[ 0 ] );
                        }
                        data.customerIdPat = customerIdPat;
                        next( err, data );
                    } );
                },
                function( data, next ) {
                    // patientreg
                    const
                        mongoose = require( 'mongoose' ),
                        patientregData = {
                            identityId: data.identity._id.toString(),
                            talk,
                            customerIdPat: data.customerIdPat,
                            customerIdPrac: customerId,
                            createPlanned: true,
                            email: email,
                            patientId: new mongoose.Types.ObjectId().toString(),
                            noPRC: true,
                            confirmed: false
                        };
                    Y.log( `Posting fresh patientreg ${JSON.stringify( patientregData )}`, 'debug', NAME );

                    // post fresh data, clean of XSS first
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'post',
                        model: 'patientreg',
                        data: Y.doccirrus.filters.cleanDbObject( patientregData ),
                        options: { entireRec: true }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        data.patientReg = results[ 0 ];
                        next( null, data );
                    } );
                },
                function( data, next ) {
                    // send notification email to dc
                    const
                        cfgRaw = require( 'dc-core' ).config.load( process.cwd() + '/email.json' ),
                        myEmailCfg = cfgRaw.config || {},
                        identity = data.identity,
                        lang = Y.doccirrus.i18n( 'patientRegistration' ),
                        jadeParams = {
                            text: ''
                        },
                        tstamparr = new Date().toJSON().match( /([\-0-9]*)T([0-9:.]*)Z/ ),
                        userName = identity.firstname + ' ' + identity.lastname;
                    let
                        myEmail,
                        emailOptions;
                    if( !myEmailCfg || !myEmailCfg.infoService || !myEmailCfg.infoService.to ) {
                        Y.log( `could not inform DC of new patient optin, missing email config:${JSON.stringify( myEmailCfg )}`, 'error', NAME );
                        return;
                    }

                    jadeParams.text = lang.optinConfirmEmail.TEXT.replace( '$username$', userName ).replace( '$tstamparr[1]$', tstamparr[ 1 ] )
                        .replace( '$tstamparr[2]$', tstamparr[ 2 ] ).replace( /\$url\$/g, Y.doccirrus.auth.getPUCUrl( '/intime/patient' ) );
                    emailOptions = {
                        serviceName: 'patientPortalService',
                        to: myEmailCfg.infoService.to,
                        user: user,
                        subject: lang.optinConfirmEmail.SUBJECT.replace( '$username$', userName ),
                        jadeParams: jadeParams,
                        jadePath: './mojits/PUCMojit/views/patientupdateemail.jade.html',

                        attachments: [
                            {
                                path: process.cwd() + "/mojits/DocCirrus/assets/docs/Datenschutz.pdf",
                                type: "application/pdf",
                                filename: "Datenschutz.pdf"
                            }
                        ]
                    };

                    myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
                    Y.doccirrus.email.sendEmail( { ...myEmail, user }, () => {
                        setImmediate( next, null, { identityId: data.identity && data.identity._id } );
                    } );

                }
            ], callback );

        }

        /**
         * Sends confirmation email to patient
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.customerIdPrac
         * @param {Function} args.callback
         */
        function sendPINEmail( args ) {
            Y.log('Entering Y.doccirrus.api.patientportal.sendPINEmail', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.sendPINEmail');
            }
            Y.doccirrus.api.patientreg.triggerPinEmail( args );
        }

        /**
         * Registers patient device key on prc
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.customerIdPrac
         * @param {String} args.data.prcPackage
         * @param {String} args.data.patientPublicKey
         * @param {String} args.data.pinHash
         * @param {String} args.data.prcKey
         * @param {String} args.data.browser
         * @param {Function} args.callback
         *
         * @return {Function} args.callback
         */
        function registerPatientKey( args ) {
            Y.log('Entering Y.doccirrus.api.patientportal.registerPatientKey', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.registerPatientKey');
            }
            const
                async = require( 'async' ),
                { user, callback, data: { prcKey, prcPackage, patientPublicKey, pinHash, browser, customerIdPrac } = {} } = args;
            if( !customerIdPrac ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'customerIdPrac is missing' } ) );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patientreg',
                        action: 'get',
                        query: {
                            identityId: user.identityId,
                            customerIdPrac
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results.length ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Patient data not found' } ) );
                        }
                        if( !results[ 0 ].patientId ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Patient has no connected prc' } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( patientreg, next ) {
                    Y.doccirrus.api.patientreg.submitPatientDeviceKey( {
                        user,
                        data: {
                            patientId: patientreg.patientId,
                            prcPackage,
                            patientPublicKey,
                            pinHash,
                            prcKey,
                            browser: {
                                name: browser
                            }
                        },
                        callback: next
                    } );
                }
            ], ( err, result ) => {
                if( err ) {
                    Y.log( 'Error registerPatientKey: ' + err.message , 'error', NAME );
                    return callback( err );
                }
                callback( null, {
                    identityId: result.identityId,
                    prcKey: result.prcKey,
                    patientPublicKey: patientPublicKey,
                    createPlanned: result.createPlanned,
                    accessPRC: result.accessPRC,
                    customerIdPrac: result.customerIdPrac
                } );
            } );
        }

        /**
         * @method getPatientInfo
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function getPatientInfo( args ) {
            Y.log('Entering Y.doccirrus.api.patientportal.getPatientInfo', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.getPatientInfo');
            }
            const
                { user, callback } = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patientreg',
                        action: 'get',
                        query: {
                            identityId: user.identityId
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results.length ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 500, { message: 'current user does not have any data' } ) );
                        }
                        next( null, results );
                    } );
                },
                function( patientRegs, next ) {
                    Y.doccirrus.api.patientreg.getRegisteredPublicKeys( {
                        user,
                        data: {
                            patientRegs
                        },
                        callback( err, results ) {
                            if( err ) {
                                return next( err );
                            }
                            next( null, {
                                identityId: user.identityId,
                                prcInfo: results.map( prcData => {
                                    return {
                                        registeredKeys: prcData.registeredKeys,
                                        createPlanned: prcData.createPlanned,
                                        accessPRC: prcData.accessPRC,
                                        customerIdPrac: prcData.customerIdPrac
                                    };
                                } )
                            } );
                        }
                    } );
                }
            ], callback );

        }

        /**
         *  NOTE: this lists documents with media, it does not list media.  Name is for UVITA / external consumer.
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.user.identityId
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.customerIdPrac      Which PRC to pass message to
         *  @param  {String}    args.originalParams.identityId          Not presently used at this level, should be passed
         *  @param  {String}    args.originalParams.sha1KeyHash         Used by PRC to look up key for return message
         *  @param  {Function}  args.callback                           Of the form fn( err, encryptedDocumentList )
         */

        function listMedia( args ) {
            Y.log('Entering Y.doccirrus.api.patientportal.listMedia', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.listMedia');
            }
            var
                async = require( 'async' ),
                params = args.originalParams,
                customerIdPrac = params.customerIdPrac ? params.customerIdPrac : null,
                sha1KeyHash = params.sha1KeyHash ? params.sha1KeyHash : null,
                currentPractice,
                encryptedDocumentsList;

            if ( !customerIdPrac ) {
                return args.callback( Y.doccirrus.errors.rest( 400, 'CustomerIdPrac not specified' ) );
            }

            if ( !sha1KeyHash ) {
                return args.callback( Y.doccirrus.errors.rest( 400, 'sha1KeyHash not given' ) );
            }

            async.series( [ getPractice, requestDocuments ], onAllDone );

            function getPractice( itcb ) {
                Y.doccirrus.pucproxy.getPracticesByUser( args.user, { dcCustomerNo: customerIdPrac }, onPracDataLoaded );

                // data contains which hosts are available and now do the subaction.
                function onPracDataLoaded( err, practices ) {

                    if( !err && ( !practices || !practices.length ) ) {
                        err = Y.doccirrus.errors.rest( 400, 'Nicht freigeschaltet [400]' );
                    }

                    if( err ) {
                        return itcb( Y.doccirrus.errors.rest( 500, 'Nicht freigeschaltet [500]' ) );
                    }

                    currentPractice = practices[0];
                    itcb( null );
                }
            }

            function requestDocuments( itcb ) {
                Y.doccirrus.pucproxy.getDocumentsForPatient( args.user, currentPractice, sha1KeyHash, onDocumentsLoaded );
                function onDocumentsLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    encryptedDocumentsList = ( result && result.data ) ? result.data : result;
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not list documents shared with this patient by PRC: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }
                args.callback( null, encryptedDocumentsList );
            }

        }

        /**
         *  Retrieve a file (full or thumbnail) from the PRC
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {String}    args.user.identityId                Used to find patientreg
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.customerIdPrac  Which PRC to pass message to
         *  @param  {String}    args.originalParams.sha1KeyHash     Used to look up encryption key for return message
         *  @param  {String}    args.originalParams.content_        Encrypted message for PRC, includes mediaId, transform, format
         *  @param  {Function}  args.callback                       Of the form fn( err, encryptedDataURI )
         */

        function getMedia( args ) {
            Y.log('Entering Y.doccirrus.api.patientportal.getMedia', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.getMedia');
            }
            var
                async = require( 'async' ),
                params = args.originalParams || {},

                customerIdPrac = params.customerIdPrac ? params.customerIdPrac : null,
                sha1KeyHash = params.sha1KeyHash ? params.sha1KeyHash : null,
                content = params.content ? params.content : null,
                currentPractice,
                encryptedDataURI;

            //  check arguments

            if ( !customerIdPrac ) {
                return args.callback( Y.doccirrus.errors.rest( 400, 'Missing required property, customerIdPrac' ) );
            }

            if ( !sha1KeyHash ) {
                return args.callback( Y.doccirrus.errors.rest( 400, 'Missing required property, sha1KeyHash' ) );
            }

            if ( !content ) {
                return args.callback( Y.doccirrus.errors.rest( 400, 'Missing required property, content' ) );
            }

            async.series( [ getPractice, requestMedia ], onAllDone );

            function getPractice( itcb ) {
                Y.doccirrus.pucproxy.getPracticesByUser( args.user, { dcCustomerNo: customerIdPrac }, onPracDataLoaded );

                // data contains which hosts are available and now do the subaction.
                function onPracDataLoaded( err, practices ) {
                    if( !err && ( !practices || !practices.length ) ) {
                        err = Y.doccirrus.errors.rest( 400, 'Nicht freigeschaltet [400]' );
                    }

                    if( err ) {
                        return itcb( Y.doccirrus.errors.rest( 500, 'Nicht freigeschaltet [500]' ) );
                    }

                    currentPractice = practices[0];
                    itcb( null );
                }

            }

            function requestMedia( itcb ) {
                Y.doccirrus.pucproxy.getMediaForPatient( args.user, currentPractice, sha1KeyHash, content, onMediaLoaded );
                function onMediaLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    encryptedDataURI = ( result && result.data ) ? result.data : result;
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not list documents shared with this patient by PRC: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }
                args.callback( null, encryptedDataURI );
            }
        }

        /**
         *  Store a file on the PRC, will result in media, document and activity being created in a 'Von Patient'
         *  casefolder on the patient, provided that the file is allowed by our validation rules.
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {String}    args.user.identityId
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.customerIdPrac      Which PRC to send message to
         *  @param  {String}    args.originalParams.identityId          Not used at this level
         *  @param  {String}    args.originalParams.sha1KeyHash         Used to look up key for encrypting return message
         *  @param  {String}    args.originalParams.content_            Encrypted message, includes dataURI, caption, type
         *  @param  {Function}  args.callback                           Of the form fn( err, encryptedDocument )
         */

        function postMedia( args ) {
            Y.log('Entering Y.doccirrus.api.patientportal.postMedia', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.postMedia');
            }
            var
                async = require( 'async' ),
                params = args.originalParams || {},

                customerIdPrac = params.customerIdPrac ? params.customerIdPrac : null,
                sha1KeyHash = params.sha1KeyHash ? params.sha1KeyHash : null,
                content_ = params.content ? params.content : null,

                currentPractice,
                document;

            //  check arguments

            if ( !customerIdPrac ) {
                return args.callback( Y.doccirrus.errors.rest( 400, 'Missing required property customerIdPrac' ) );
            }

            if ( !sha1KeyHash ) {
                return args.callback( Y.doccirrus.errors.rest( 400, 'Missing required property sha1KeyHash' ) );
            }

            if ( !content_ ) {
                return args.callback( Y.doccirrus.errors.rest( 400, 'Missing required property content_' ) );
            }

            async.series( [ getPractice, storeMedia ], onAllDone );

            function getPractice( itcb ) {
                Y.doccirrus.pucproxy.getPracticesByUser( args.user, { dcCustomerNo: customerIdPrac }, onPracDataLoaded );

                // data contains which hosts are available and now do the subaction.
                function onPracDataLoaded( err, practices ) {
                    if( !err && ( !practices || !practices.length ) ) {
                        err = Y.doccirrus.errors.rest( 400, 'Practice not found.' );
                    }

                    if( err ) {
                        return itcb( Y.doccirrus.errors.rest( 500, 'Nicht freigeschaltet [500]' ) );
                    }

                    currentPractice = practices[0];
                    itcb( null );
                }
            }

            function storeMedia( itcb ) {
                Y.doccirrus.pucproxy.postMediaToPatient( args.user, currentPractice, sha1KeyHash, content_, onMediaStored );
                function onMediaStored( err, result ) {
                    if ( err ) { return itcb( err ); }
                    //  should return new document object, same format as listMedia
                    document = ( result && result.data ) ? result.data : result;
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not list documents shared with this patient by PRC: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }
                args.callback( null, document );
            }
        }

        async function sendAccountDeletionRequestToSupport( args ) {
            const {user, originalParams, callback} = args;
            const email = originalParams.email;
            const firstname = originalParams.firstname;
            const lastname = originalParams.lastname;
            const DELETE_ACCESS = i18n( 'PatPortalMojit.patientportal_api.text.DELETE_ACCESS_EMAIL_SUBJECT' );
            const dcprcAddress = Y.doccirrus.auth.getDCPRCUrl();

            if( !email || !lastname || !firstname ) {
                return handleResult( Y.doccirrus.errors.rest( 500, 'insufficient arguments' ) );
            }

            const cfgRaw = require( 'dc-core' ).config.load( process.cwd() + '/email.json' ),
                myEmailCfg = cfgRaw.config || {},
                EMAIL_TEXT = i18n('patientRegistration.requestAccountDeletion.EMAIL_TEXT');

            let myEmail,
                emailText,
                emailOptions;

            if( !myEmailCfg || !myEmailCfg.dcInfoService_support || !myEmailCfg.dcInfoService_support.to ) {
                Y.log( `sendAccountDeletionRequestToSupport: could not inform DC of patient account deletion request, missing email config:${JSON.stringify( myEmailCfg )}`, 'warn', NAME );
                return;
            }

            let [errDbCall, patientreg] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    model: 'patientreg',
                    user: user,
                    action: 'get',
                    query: {identityId: user.identityId},
                    options: {}
                }));

            if( errDbCall ){
                Y.log( `sendAccountDeletionRequestToSupport: Error on getting patientreg: ${errDbCall.stack || errDbCall}`, 'error', NAME );
                return callback( errDbCall );
            }

            let link = "<a href=\""+dcprcAddress+"/crm#/patients_tab/" + patientreg[0].customerIdPat + "\">Link to DCPRC</a>";

            emailText = Y.Lang.sub( EMAIL_TEXT, {
                lastname: lastname,
                firstname: firstname,
                email: email,
                link: link
            } );

            emailOptions = {
                serviceName: 'patientPortalService',
                to: myEmailCfg.dcInfoService_support.to,
                user: user,
                subject: DELETE_ACCESS,
                text: emailText
            };

            myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );

            let [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                Y.doccirrus.email.sendEmail( {...myEmail, user}, ( err, result ) => {
                    if( err ) {
                        reject( err );
                    } else {
                        resolve( result );
                    }
                } );
            } ) );

            if( err ) {
                Y.log( `sendAccountDeletionRequestToSupport: could not inform DC of patient account deletion request, missing email config:${err.stack || err}`, 'warn', NAME );
            } else {
                Y.log( `sendAccountDeletionRequestToSupport: send mail ${result}`, 'debug', NAME );
            }

            return handleResult( err, result, callback );
        }

        /**
         * @class patientportal
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).patientportal = {
            /**
             * @property name
             * @type {String}
             * @default patientportal-api
             * @protected
             */
            name: NAME,
            sendJawboneDataPRC: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.sendJawboneDataPRC', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.sendJawboneDataPRC');
                }
                sendJawboneDataPRC( args );
            },
            getPatientPractice: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.getPatientPractice', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.getPatientPractice');
                }
                getPatientPractice( args );
            },
            getDeviceConfigData: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.getDeviceConfigData', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.getDeviceConfigData');
                }
                getDeviceConfigData( args );
            },
            doesPRCAllowTransfer: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.doesPRCAllowTransfer', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.doesPRCAllowTransfer');
                }
                doesPRCAllowTransfer( args );
            },
            /**
             * Gets/Sets the patient's profile info from the DCPRC
             *
             * @param {Object} args
             */
            getPatientProfile: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.getPatientProfile', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME).wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.getPatientProfile');
                }
                var
                    callback = args.callback,
                    user = args.user;

                function patInfoCb( err, result, patientReg ) {
                    if( err ) {
                        Y.log( 'error receiving patient profile data:' + JSON.stringify( err ), 'error', NAME );
                        callback( Y.doccirrus.errors.rest( 500, 'System Error (PatInfo)' ) );
                        return;
                    }

                    if( !result || 1 > result.length ) {
                        callback( Y.doccirrus.errors.rest( 400, 'Nicht freigeschaltet' ) );
                        return;
                    }
                    result.forEach( function( profile ) {
                        profile.communications = profile.communications.filter( communication => (communication.confirmed || !communication.confirmNeeded) || ('PHONEJOB' === communication.type || 'PHONEPRIV' === communication.type) );
                    } );

                    callback( null, result, patientReg );
                }

                // Ask PUC Proxy to get the profile
                Y.doccirrus.pucproxy.getPatientProfile( user, patInfoCb );
            },
            setPatientProfile: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.setPatientProfile', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.setPatientProfile');
                }
                var
                    callback = args.callback,
                    data = args.data,
                    user = args.user,
                    emailChanged = (true === data.emailChanged || 'true' === data.emailChanged);

                function patInfoCb( err, info ) {
                    if( err ) {
                        Y.log( 'error updating patient profile data:' + JSON.stringify( err ), 'error', NAME );
                        callback( Y.doccirrus.errors.rest( 500, 'System Error (PatInfo)' ) );
                        return;
                    }

                    if( !info || 1 > info.length ) {
                        callback( Y.doccirrus.errors.rest( 400, 'no profile on DCPRC' ) );
                        return;
                    }

                    if( emailChanged ) {
                        Y.doccirrus.api.patientreg.sendOptinEmail( {
                            user,
                            email: data.email,
                            optIn: data.optIn,
                            firstname: data.firstname,
                            lastname: data.lastname
                        }, callback );

                    } else {
                        return callback();
                    }
                }

                if( emailChanged ) { // then the new email must be confirmed by user
                    data.confirmed = false;
                    data.optIn = Y.doccirrus.api.patientreg.getOptinUrl();
                    data.communicationEntry = { // will add as a new entry to the current list
                        type: 'EMAILPRIV',
                        value: data.email,
                        confirmed: false,
                        preferred: false
                    };
                }
                // Ask PUC Proxy to update the profile
                Y.doccirrus.pucproxy.setPatientProfile( user, data, patInfoCb );
            },
            getPatientSchedule: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.getPatientSchedule', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.getPatientSchedule');
                }
                getPatientSchedule( args );
            },
            /**
             * Handles a request from patient portal to get, create or delete a schedule for the
             * logged in patient.
             *
             * @param {Object}          args
             * @deprecated
             */
            patientSchedule: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.patientSchedule', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.patientSchedule');
                }
                patientSchedule( args );
            },
            getFullPracticeInfo: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.getFullPracticeInfo', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.getFullPracticeInfo');
                }
                getFullPracticeInfo( args );
            },
            getPracticeAppointmentTypes: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.getPracticeAppointmentTypes', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.getPracticeAppointmentTypes');
                }
                getPracticeAppointmentTypes( args );
            },
            getFreeAppointments: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.getFreeAppointments', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.getFreeAppointments');
                }
                getFreeAppointments( args );
            },
            getWaitingTime: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.getWaitingTime', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.getWaitingTime');
                }
                getWaitingTime( args );
            },
            makeAppointment: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.makeAppointment', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.makeAppointment');
                }
                makeAppointment( args );
            },
            getRecaptchaSiteKey: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.getRecaptchaSiteKey', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.getRecaptchaSiteKey');
                }
                getRecaptchaSiteKey( args );
            },
            makeVideoConference: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.makeVideoConference', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.makeVideoConference');
                }
                makeVideoConference( args );
            },
            confirmVC: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.confirmVC', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.confirmVC');
                }
                confirmVC( args );
            },
            checkPassword: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.checkPassword', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.checkPassword');
                }
                checkPassword( args );
            },
            resetPassword: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.resetPassword', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.resetPassword');
                }
                resetPassword( args );
            },
            registerPatient: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientportal.registerPatient', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientportal.registerPatient');
                }
                registerPatient( args );
            },
            sendPINEmail,
            register,
            registerPatientKey,
            checkApiAccess,
            getApiUser,
            confirmOptin,
            getPatientInfo,

            listMedia: listMedia,
            getMedia: getMedia,
            postMedia: postMedia,
            sendAccountDeletionRequestToSupport,
            getPatientPortalUrlOfPRC: getPatientPortalUrlOfPRC
        };

    },
    '0.0.1', { requires: [] }
);
