/**
 * User: rrrw
 * Date: 15.08.13  16:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*jslint anon:true, nomen:true*/
/*global YUI*/



/**
 * The PUC Proxy wraps all needle calls from the PUC.
 *
 * FUTURE:
 * The PUC Proxy hides all the security and connection
 * relevant details that are required to
 * successfully proxy Patient requests to the PRC.
 *
 * Currently, the requirements are very light and there is no
 * encryption occuring here. In future a cryptographic secret
 * will be sent (MOJ-42).
 */

YUI.add( 'dcpucproxy', function( Y, NAME ) {

        var
        // cache for patientInfo
            cachePatCals = {},
        //factory singleton
            dcPucProxy;

        const VC_PATIENTREG = {
                _id: '0000000000000000000000010',
                tags: [],
                //ppToken: '2020-02-11T14:37:26.912Z017034aef800',
                customerIdPat: '000000000000000000000008', // id of patient contact on DCPRC
                identityId: '000000000000000000000009', // id of identity on PUC
                prcKey: 'g8nIM/d/lkHmg5rsMAWdjMipwNR9iPNjDiqH1FYEg1wfpwqWfC2VPfXfgAX3X8YZW6Xq1Fr4K0I0oc7VzIfeKw==',
                createPlanned: true,
                accessPRC: true,
                confirmed: true,
                patientId: '000000000000000000000006' // id of patient on PRC
                //customerIdPrac: '2002' should be set for each call from query
            },
            VC_DCPRC_CONTACT = {
                _id: '000000000000000000000008',
                firstname: 'vc-user',
                title: '',
                nameaffix: '',
                middlename: '',
                fk3120: '',
                lastname: 'vc-user',
                talk: 'MR',
                dob: '1990-01-01T08:00:00.000Z',
                communications: [],
                confirmed: true,
                patient: true,
                accounts: [],
                addresses: [],
                partnerIds: [],
                optIn: undefined,
                __v: undefined,
                email: 'test@example.com',
                phone: ''
            };

        const
            {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * selects only the specified array elements and returns a new array.
         * @param {Array}           arr
         * @param {Function}        matchFn  function(elt) returns boolean.
         *                  The match function tells us if we include an
         *                  array element in the returned result array or not.
         * @return {Array}
         */
        function selectCals( arr, matchFn ) {
            var
                i,
                result = [];
            if( Array.isArray( arr ) ) {
                for( i = 0; i < arr.length; i++ ) {
                    if( matchFn( arr[i] ) ) {
                        result.push( arr[i] );
                    }
                }
                Y.log( 'getCalendar n results: ' + i, 'info', NAME );
            } else {
                Y.log( 'getCalendar empty response', 'info', NAME );
            }
            return result;
        }

        /**
         * Gets the patientreg record for the auth record given.
         *
         * @param   {Object}          user
         * @param   {Object}          obj
         * @param   {Function}        callback
         */
        function getPatientRegForUser( user, obj, callback ) {
            var
                query = { identityId: user.identityId};

            if( obj.customerIdPrac ) {
                query.customerIdPrac = obj.customerIdPrac;
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patientreg',
                action: 'get',
                callback: callback,
                query: query,
                options: {}
            } );
        }

        function PucProxy() {
        }

        PucProxy.prototype.getPatientRegForUser = function( user, callback ) {
            getPatientRegForUser( user, {}, callback );
        };

        /**
         * Gets all user's practices with registration information.
         *
         * @param {Object}          user                auth object
         * @param {Object}          obj
         * @param {Function}        callback            (err, result)
         */
        PucProxy.prototype.getPracticesByUser = function getPracticesByUser( user, obj, callback ) {
            var result = [],
                dcCustomerNo,
                self = this;

            if( obj && obj.dcCustomerNo ) {
                dcCustomerNo = obj.dcCustomerNo;
            }

            // for each practice that the identity is registered for,
            // include the contact details of the practice.
            function handleMetaPracData( error, data ) {
                var i, j = 0;

                if( error ) {
                    callback( 'Could not get metaprac data.' );
                    return;
                }
                if( !data || !data[0] ) {
                    callback( null, null );
                    return;
                }
                // do a simple scan search, as lists get longer, can make temp hash tables,
                // and insert this info in the patientreg.
                for( i = 0; i < result.length; i++, j = 0 ) {
                    do {
                        if( result[i].customerIdPrac === data[j].customerIdPrac ) {
                            result[i].secret = data[j].secret;
                            result[i].host = data[j].host;
                            result[i].pubKey = data[j].pubKey;
                            result[i].onlyPracticesPatientsCanBook = data[j].onlyPracticesPatientsCanBook;
                            break; // short circuit the do...while
                        }
                    } while( ++j < data.length );
                }

                callback( undefined, result );
            }

            function handlePatientregData( error, data ) {

                if( error ) {
                    callback( 'Could not get patientreg data.' );
                    return;
                }

                if( !data || !data.length ) {
                    callback( null, null );
                    return;
                }
                if( obj && obj.checkTransfer ) {
                    self.filterTransferPatientregs( {
                        user: user,
                        patientregs: data
                    }, function( filteredData ) {
                        getMetapracData( filteredData );
                    } );
                } else {
                    getMetapracData( data );
                }
            }

            function getMetapracData( data ) {
                var
                    i,
                    arrIds = [];

                for( i = 0; i < data.length; i++ ) {
                    arrIds.push( data[i].customerIdPrac );
                    data[i] = JSON.parse( JSON.stringify( data[i] ) ); // demongooseify, toObject() just doesn't cut it.
                }
                result = data;
                Y.log( 'searching for practice info in: ' + JSON.stringify( arrIds ), 'debug', NAME );
                // get user metaprac info
                Y.doccirrus.mongodb.runDb(
                    {
                        user: user,
                        model: 'metaprac',
                        action: 'get',
                        callback: handleMetaPracData,
                        query: { customerIdPrac: {$in: arrIds } },
                        options: {}
                    }
                );
            }

            getPatientRegForUser( user, {customerIdPrac: dcCustomerNo}, handlePatientregData );
        };

        /**
         * Gets all VC user's practices with registration information.
         * This means that we will get all metaprac entries based on dcCustomerNo from request but patientreg entry will be static
         *
         * @param {Object} user
         * @param {Object} query
         * @param {String} query.dcCustomerNo - value which comes from request url on front-end
         * @param {Function} callback
         * @returns {Promise<*>}
         */
        PucProxy.prototype.getPracticesByVCUser = async function( user, query, callback ) {
            let result,
                err, metaprac;

            if( !query || !query.dcCustomerNo ) {
                Y.log( `getPracticesByVCUser: There are not enough params in query: ${JSON.stringify( query )}`, 'warn', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ) );
            }

            result = [{...VC_PATIENTREG, customerIdPrac: query.dcCustomerNo}];
            // get user metaprac info
            [err, metaprac] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb(
                    {
                        user,
                        model: 'metaprac',
                        action: 'get',
                        query: {customerIdPrac: query.dcCustomerNo},
                        options: {}
                    }
                )
            );

            if( err ) {
                Y.log( `getPracticesByVCUser: Error while getting metaprac: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }

            if( !metaprac || !metaprac[0] ) {
                Y.log( `getPracticesByVCUser: There are no metaprac with customerIdPrac: ${query.dcCustomerNo}`, 'warn', NAME );
                return callback();
            }

            // for each practice that the identity is registered for,
            // include the contact details of the practice.

            let i, j = 0;

            // do a simple scan search, as lists get longer, can make temp hash tables,
            // and insert this info in the patientreg.
            for( i = 0; i < result.length; i++, j = 0 ) {
                do {
                    if( result[i].customerIdPrac === metaprac[j].customerIdPrac ) {
                        result[i].secret = metaprac[j].secret;
                        result[i].host = metaprac[j].host;
                        result[i].pubKey = metaprac[j].pubKey;
                        result[i].onlyPracticesPatientsCanBook = metaprac[j].onlyPracticesPatientsCanBook;
                        break; // short circuit the do...while
                    }
                } while( ++j < metaprac.length );
            }

            return callback( null, result );
        };

        /**
         * Makes externalPost call on /1/calevent path with conference and patient data
         *
         * @param {Object} user
         * @param {Object} practice - practice where conference should be created
         * @param {Object} data - data which should be passed to PRC
         * @returns {Promise}
         */
        PucProxy.prototype.postConference = async function( user, practice, data ) {
            let
                myData,
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                url1 = '/1/calevent',
                myUrl;

            if( 'string' !== typeof practice.host ) {
                Y.log( 'postConference: insufficient parameters.', 'error', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 'internal error: missing parameters' );
            }
            // strip trailing slash on host
            if( '/' === practice.host.slice( -1 ) ) {
                practice.host = practice.host.slice( 0, -1 );
            }

            myUrl = practice.host + url1;

            myData = {
                start: data.start,
                end: data.end,
                scheduletype: data.scheduletype,
                duration: data.duration,
                plannedDuration: data.plannedDuration,
                calendar: data.calendar,
                type: data.type,
                details: data.details,
                adhoc: false,
                allDay: false,
                title: data.title,
                isFromPortal: true,
                isPublicVC: true,
                patientData: data.patientData,
                employee: data.employee,
                conferenceType: data.conferenceType
            };

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.https.externalPost( myUrl, myData, options, ( error, response, body ) => {
                    let
                        fin;
                    error = error || body && body.meta && body.meta.errors && body.meta.errors[0];
                    if( error ) {
                        reject( error );
                    }
                    fin = (body && body.data) || body;
                    resolve( fin );
                } );
            } );
        };

        /**
         * Makes 'externalPut' call on '/1/calevent/' route with scheduleId to confirm it on selected practice
         *
         * @param {Object} user
         * @param {Object} practice - practice which should receive a request
         * @param {String} practice.host - host of desired practice
         * @param {Object} data
         * @param {String} data.scheduleId - id of schedule to confirm
         * @returns {Promise}
         */
        PucProxy.prototype.sendVCConfirmationToPractice = async function( user, practice, data ) {
            let
                myData = {isFromPortal: true, confirmedVC: true},
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                url1 = '/1/calevent/',
                myUrl;

            if( 'string' !== typeof practice.host || !data || !data.scheduleId ) {
                Y.log( 'sendVCConfirmationToPractice: insufficient parameters.', 'error', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 'internal error: missing parameters' );
            }
            // strip trailing slash on host
            if( '/' === practice.host.slice( -1 ) ) {
                practice.host = practice.host.slice( 0, -1 );
            }
            myUrl = practice.host + url1 + data.scheduleId;

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.https.externalPut( myUrl, myData, options, ( error, response, body ) => {
                    let
                        fin;
                    error = error || body && body.meta && body.meta.errors && body.meta.errors[0];
                    if( error ) {
                        reject( error );
                    }
                    fin = (body && body.data) || body;
                    resolve( fin );
                } );
            } );
        };

        /**
         * Gets list of patientregs and returns only those patientregs whose practices allow activity transfer
         * @method filterTransferPatientregs
         * @param {Object} config
         * @param {Object} config.user
         * @param {Array} config.patientregs
         * @param {Function} callback
         */
        PucProxy.prototype.filterTransferPatientregs = function( config, callback ) {
            var
                patientregs = config.patientregs,
                user = config.user,
                async = require( 'async' );

            async.filter( patientregs, function( patientreg, done ) {
                Y.doccirrus.api.patientportal.doesPRCAllowTransfer( {
                    user: user,
                    query: {
                        patientreg: patientreg
                    },
                    callback: function( err, result ) {
                        if( err ) {
                            Y.log( 'Can not check if prc allow transfer. Patientreg Id: ' + (patientreg._id && patientreg._id.toString()) + '. Error: ' + JSON.stringify( err ), 'error', NAME );
                        }
                        done( result && result[0] );
                    }
                } );
            }, function( result ) {
                callback( result );
            } );
        };

        /**
         * Gets the list of calendars (i.e. doctors) per PRC that this
         * logged in user has access to. Must be logged in on the PUC
         * to access this route.
         *
         * May use the cache.
         *
         * Caches the information.
         *
         * @param {Object}   user  auth object
         * @param {Function} callback  function(err,result) where result is an object:
         *                  result.error - Array contains the error strings, one for each problem PRC
         *                  result.data - Array of objects, one object per PRC, where the data objects are:
         *                      {"customerIdPrac":"1003",
         *                       "coname":"QA Arzt2 MVZ",
         *                       "calendars":[
         *                          {"__v":0,"_id":"515ae9604013671c12c1c900","color":"#441122","employee":"51ef83239cb94b7f3100001c","name":"Arztkalender","type":"PATIENTS"},
         *                          {"type":"INFORMAL","name":"53568 QA Arzt","color":"#800080","employee":"51ef83239cb94b7f3100001c","_id":"51fa54ec29de4793f8000018","__v":0},
         *                          {"type":"INFORMAL","name":"18463 QA Arzt","color":"#00ffff","employee":"51ef83239cb94b7f3100001c","_id":"51fa54ec29de4793f8000019","__v":0},
         *                          {"__v":0,"_id":"51fa550729de4793f800001d","color":"#000080","employee":"51ef83239cb94b7f3100001c","name":"Halloele","type":"INFORMAL"},
         *                          {"type":"INFORMAL","name":"17905 QA Arzt","color":"#000080","employee":"51ef83239cb94b7f3100001c","_id":"52015fe2e705920000000017","__v":0},
         *                          {"type":"INFORMAL","name":"77537 QA Arzt","color":"#ffff00","employee":"51ef83239cb94b7f3100001c","_id":"52015fe2e705920000000018","__v":0},
         *                          {"__v":0,"_id":"52016007e70592000000001c","color":"#800080","employee":"51ef83239cb94b7f3100001c","name":"47926 QA Arzt","type":"INFORMAL"}
         *                        ]
         *                       }
         */
        PucProxy.prototype.loadPatientInfo = function loadPatientInfo( user, callback ) {
            var
                nRequests,
                nResp = 0,
                result = {error: [], data: []};

            Y.log( 'Getting Patient Info ', 'debug', NAME );

            // 0. check in the cache, whether we have the info for this user. Timeout stale info. TODO MOJ-...
            //            if( cachePatCals[dbuser.identityId] ) {
            //                callback( null, [cachePatCals[dbuser.identityId]] );
            //                // EXIT: short circuit the entire search
            //                return;
            //            }
            // 3. collate results and return to browser
            function getJoinCb( patientReg ) {
                var
                //remember which host the response is from
                    myData = patientReg;

                myData.namePrac = [];

                // could do this more elegantly with events, but boils down to the same thing:
                // 6.  counting responses, and when we have all our responses, return the result.
                function checkDone() {
                    var i;
                    if( nResp === nRequests ) {
                        // we need to remove the coname out of the array structure
                        for( i = 0; i < result.data.length; i++ ) {
                            result.data[i].coname = result.data[i].coname[0];
                        }
                        // set the cache value before returning.
                        // NB: Do not pass host info to the client -- strictly private Info!
                        cachePatCals[user.identityId] = result;
                        // JSON expects an array
                        return callback( null, result );
                    }
                }

                // This is the DCPRC callback. It does not write into the shared space (result)
                // at all. Instead it writes into the local space, and is ensured that the coname
                // will be merged with the correct PRC data.
                function custCb( err, data ) {
                    nResp++;
                    if( err ) {
                        Y.log( 'No customer name for ' + myData.customerPracId + ' / err ' + err, 'warn', NAME );
                        myData.namePrac[0] = '';
                    } else {
                        Y.log( 'Got customer info ' + JSON.stringify( data ), 'debug', NAME );
                        if( data && data[0] ) {
                            myData.namePrac[0] = data[0].coname;
                        } else {
                            myData.namePrac[0] = 'Kein Name';
                        }
                    }
                    checkDone();
                }

                // 4.  Immediately go to the DCPRC and get the info for this customer (practice).
                // NB could unleash a storm of REST calls. utils DCPRC can buffer this somewhat with caching.
                Y.doccirrus.utils.dcprcGetCustomer( myData.customerIdPrac, custCb );

                // 5.   Return a context sensitive join function that will be the callback of all
                // requests to the PRC.  The PRC response is stored here.
                // This is the only function here that will write into the shared space, so there is no
                // danger of collisions with step 4.
                return function join( err, data ) {
                    var
                        prcOffline;
                    nResp++;
                    if( err ) {
                        if( 503 === err.code ) {
                            /**
                             * FIXME this is a hack. We need a way how to pass data with errors. Client side should understand
                             *  that data from server is not complete because of some of requests were failed
                             */
                            prcOffline = true;
                        }
                        Y.log( 'Error getting calendar info: ' + err, 'warn', NAME );
                        result.error.push( err.toString() );
                    }
                    if( !data || !data[ 0 ] ) {
                        Y.log( 'Empty result calendar. ' + myData.host, 'info', NAME );
                    }
                    result.data.push( {
                        patientId: myData.patientId, // needed for portal pin generation
                        confirmed: myData.confirmed,
                        host: myData.host,
                        customerIdPrac: myData.customerIdPrac,
                        coname: myData.namePrac,
                        createEvent: myData.createPlanned,
                        calendars: data,
                        prcOffline: prcOffline
                    } );
                    checkDone();
                };
            }

            // 2. Send to each one a request for doctors.
            function handlePracData( err, data ) {
                var i;
                if( err ) {
                    Y.log( 'Error getting db info: ' + err, 'warn', NAME );
                    callback( 'Internal Server Error' );
                    return;
                }
                if( !data || !data[0] ) {
                    Y.log( 'Empty result metaprac. (2)', 'info', NAME );
                    callback( 'Keine Informationen vorhanden1' );
                    return;
                }
                // We send two requests per each practice!
                // this is because we check the name on the DCPRC and go to the PRC
                // both responses must be present or timed out before we return to the user.
                nRequests = data.length * 2;

                for( i = 0; i < data.length; i++ ) {
                    Y.doccirrus.pucproxy.getCalendar( data[i], 'doctor', getJoinCb( data[i] ) );
                }

            }

            // 1. get the list of practices.
            dcPucProxy.getPracticesByUser( user, {}, handlePracData );

        };

        /**
         * Internal method implementing get/set PatientProfile
         * @param {Object}                   user
         * @param {Function | Object}        data (optional)
         * @param {Function}                 callback
         *
         * @return {Function}
         */
        function loadPatientProfile( user, data, callback ) {
            var
                myData = data,
                myCb = callback;

            if( 'function' === typeof data ) {
                myCb = data;
                myData = undefined;
            }

            if( user && 'vc-user' === user.id && 'VC Proxy User' === user.U ) {
                //return predefined values for request from VC user
                let resultFromDCPRC = [VC_DCPRC_CONTACT],
                    patientReg = VC_PATIENTREG;
                return myCb( null, resultFromDCPRC, patientReg );
            }

            function handleCb( err, data ) {
                if( err ) {
                    Y.log( 'Error getting db info: ' + err, 'warn', NAME );
                    myCb( 'Internal Server Error' );
                    return;
                }
                if( !data || !data[0] ) {
                    Y.log( 'Empty result metaprac. (4)', 'warn', NAME );
                    myCb( 'Keine Informationen vorhanden2' );
                    return;
                }
                if( !data[0].customerIdPat ) {
                    Y.log( 'No Customer Id in patientreg 1 of ' + data.length, 'warn', NAME );
                    myCb( 'Keine Informationen vorhanden3' );
                    // probably send an email to admin
                    return;
                }
                if( !myData ) {
                    Y.doccirrus.utils.dcprcGetPatientAsContact( { _id: data[ 0 ].customerIdPat }, function( err, result ) {
                        myCb( err, result, data[ 0 ] );
                    } );
                }
                else {
                    Y.doccirrus.utils.dcprcSetPatientAsContact( myData, myCb );
                }
            }

            getPatientRegForUser( user, {}, handleCb );
        }

        /**
         * Use the session to identify the user and set their profile in the DCPRC.
         *
         * @param {Object}                  user
         * @param {Function | Object}        data (optional)
         * @param {Function}                callback
         */
        PucProxy.prototype.setPatientProfile = function setPatientProfile( user, data, callback ) {
            loadPatientProfile( user, Y.clone( data ), callback );
        };

        /**
         * Use the session to identify the user and load their profile from the DCPRC.
         * Returns a contact record, with email and phone fields pre-filled with the
         * matching first item in communications.
         *
         * @param {Object}          user
         * @param {Function}        callback
         */
        PucProxy.prototype.getPatientProfile = function getPatientProfile( user, callback ) {
            loadPatientProfile( user, callback );
        };

        /**
         * Gets schedules for the given patient at one practice.
         *
         * Currently does not get repetitions.
         *
         * @param {Object}  obj     Must have following properties:
         *                          host: URL to access
         *                          patientId: the patientId local to the PRC
         * @param {Function}        callback
         *
         * @return {Function}       callback
         */
        PucProxy.prototype.getSchedule = function getSchedule( obj, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                url1 = '/r/calculateschedule/?action=calculateschedule&subaction=PAT_EVTS&isFromPortal=true&patient=',
                myUrl;

            if( 'string' !== typeof obj.host ||
                'string' !== typeof obj.patientId ) {
                Y.log( 'getSchedule() insufficient parameters.', 'error', NAME );
                return callback( 'internal error: missing parameters' );
            }

            // strip trailing slash on host
            if( '/' === obj.host.slice( -1 ) ) {
                obj.host = obj.host.slice( 0, -1 );
            }

            myUrl = obj.host + url1 + obj.patientId;

            function externalCb( err, response, body ) {
                var
                    fin;
                if( !err ) {
                    fin = body;
                }
                Y.log( 'Got result: ' + JSON.stringify( fin ) );
                callback( err, fin );
            }

            Y.doccirrus.https.externalGet( myUrl, options, externalCb );
        };

        /**
         * Posts information for a new event.
         * @param {Object}      user auth object
         * @param {Object}      prac
         * @param {Object}      data
         * @param {Function}    callback
         *
         * @return {Function}   callback
         */
        PucProxy.prototype.postSchedule = function postSchedule( user, prac, data, callback ) {
            var
                myData,
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                url1 ,
                myUrl,
                isAdhoc = data.adhoc && ('true' === data.adhoc || true === data.adhoc);

            if( isAdhoc ) {
                url1 = '/r/calculateschedule?action=calculateschedule&subaction=NEXT_NUM';
            } else {
                url1 = '/1/calevent';
            }

            // invalidate cache
            cachePatCals[user.identityId] = undefined;

            if( 'string' !== typeof prac.host ||
                'string' !== typeof prac.patientId ) {
                Y.log( 'postCalendar() insufficient parameters.', 'error', NAME );
                return callback( 'internal error: missing parameters' );
            }
            // strip trailing slash on host
            if( '/' === prac.host.slice( -1 ) ) {
                prac.host = prac.host.slice( 0, -1 );
            }

            myUrl = prac.host + url1;

            myData = {
                start: data.start,
                end: data.end,
                scheduletype: data.scheduletype,
                duration: data.duration,
                plannedDuration: data.plannedDuration,
                calendar: data.calendar,
                type: data.type,
                details: data.details,
                adhoc: data.adhoc,
                allDay: data.allDay,
                title: data.title,
                patient: prac.patientId,
                isFromPortal: true
            };
            if( data.conferenceType ) {
                myData.employee = data.employee;
                myData.conferenceType = data.conferenceType;
            }
            if( data.patientData ) {
                myData.patientData = data.patientData; // attach patient data for the case patient is new for the PRC
                myData.patientData.createPlanned = prac.createPlanned;
                myData.patientData.accessPRC = prac.accessPRC;
            }

            if( data.resourceCalendarsToBook && data.resourceCalendarsToBook.length ) {
                myData.bookResourceFromSearch = true;
                myData.calendar = data.resourceCalendarsToBook;
                myData.requiredResources =  data.scheduleTypeMeta.requiredResources.map( function( item ) {
                    return item.resourceType;
                } );
                myData.scheduleTypeMeta = data.scheduleTypeMeta;
            }

            if( data.groupId ) { // for grouped schedules
                myData.groupId = data.groupId;

            } else if( data.scheduleId ) { // useful if group head is a virtual repetition
                myData.groupId = data.scheduleId;
            }

            function externalCb( error, response, body ) {
                var
                    fin = [];
                error = error || body && body.meta && body.meta.errors && body.meta.errors[0];
                if( !error ) {
                    fin = ( body && body.data ) || body;
                }
                Y.log( 'Got result: ' + JSON.stringify( fin ) );
                callback( error, fin );
            }

            myData.isFromPortal = true; // helper for scheduler logic
            Y.doccirrus.https.externalPost( myUrl, myData, options, externalCb );

        };

        /**
         * if the patient has no data on the target PRC then we include their profile data that exist on DCPRC
         * PRC will create the patient with the given id as soon as the schedule is booked
         * @param {Object}          user
         * @param {Object}          prac patientreg + metaprac data
         * @param {Object}          data schedule data
         * @param {Function}        callback
         */
        PucProxy.prototype.postFirstSchedule = function postSchedule( user, prac, data, callback ) {
            var
                patientProfile;

            function fromDCPRC( err, result ) {
                var
                    email;

                if( err || !result || !result[0] ) {
                    Y.log( 'could not get patient profile from DCPRC', 'error', NAME );
                    callback( err || 'no patient profile' );
                    return;
                }
                patientProfile = result[0];

                email = Y.doccirrus.schemas.simpleperson.getEmail( patientProfile.communications || [] );
                if( email ) {
                    patientProfile.communications = patientProfile.communications.map( function( item ) {
                        if( item._id === email._id ) {
                            item.confirmed = true;
                            item.confirmNeeded = true; // because the patient has "Portalrechte"
                        }
                        return item;
                    } );
                }
                Y.log( 'postFirstSchedule: attaching patient data to the schedule: ' + JSON.stringify( patientProfile ), 'debug', NAME );
                data.patientData = patientProfile; // this will tell PRC the patient in new
                Y.doccirrus.pucproxy.postSchedule( user, prac, data, callback );
            }

            // get patient's basic info from DCPRC
            Y.doccirrus.utils.dcprcGetPatientAsContact( { _id: prac.customerIdPat }, fromDCPRC );
        };

        PucProxy.prototype.deleteSchedule = function deleteSchedule( obj, callback ) {
            var
                myData = {isFromPortal: true, patientId: obj.patientId},
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                url1 = '/1/calevent/' + obj.scheduleId + '?eventType=' + (obj.adhoc ? 'adhoc' : 'plan') + '&calendar=' + obj.calendarId + '&createTask=true' + '&auth=',
                myUrl;

            if( 'string' !== typeof obj.host ||
                'string' !== typeof obj.patientId ) {
                Y.log( 'postCalendar() insufficient parameters.', 'error', NAME );
                return callback( 'internal error: missing parameters' );
            }
            // strip trailing slash on host
            if( '/' === obj.host.slice( -1 ) ) {
                obj.host = obj.host.slice( 0, -1 );
            }
            myUrl = obj.host + url1;

            function externalCb( error, response, body ) {
                if ( !error && body && body.meta && body.meta.errors && body.meta.errors[0] ) {
                    error = body.meta.errors[0];
                }
                Y.log( 'deleteSchedule: Got result: ' + JSON.stringify( body ), 'debug', NAME );

                if( error ) {
                    return callback( error );
                }
                callback( null, body.data );
            }

            Y.doccirrus.https.externalDelete( myUrl, myData, options, externalCb );
        };

        /**
         * Gets the next 3 available schedules for given calendar in the obj tenant
         * @param {Object} obj
         * @param {String} obj.calendar calendar id
         * @param {String} [obj.start] start timestamp
         * @param {String} obj.scheduleType scheduleType id
         * @param {String} obj.isPreconfigured
         * @param {String} obj.resourceSlotSearch
         * @param {String} obj.isRandomMode
         * @param {String} obj.patientId
         * @param {Number} obj.n
         * @param {String} obj.endTime
         * @param {String} obj.startTime
         * @param {String} obj.host
         * @param {String} [obj.duration]
         * @param {Function} callback
         */
        PucProxy.prototype.getNextSchedules = function getNextSchedules( obj, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                calendar = obj.calendar,
                start = obj.start,
                params = [
                    'action=calculateschedule',
                    'subaction=NEXT_3RND',
                    `calendar=${calendar}`,
                    `scheduleType=${obj.scheduleType}`,
                    `isPreconfigured=${obj.isPreconfigured}`,
                    `isRandomMode=${obj.isRandomMode}`,
                    `patientId=${obj.patientId}`,
                    `auth=`
                ],
                url;

            if( 'string' !== typeof obj.host ||
                'string' !== typeof obj.patientId ) {
                Y.log( 'getNextSchedules insufficient parameters: ' + JSON.stringify( obj ), 'error', NAME );
                callback( 'internal error: missing parameters' );
                return;
            }

            // strip trailing slash on host
            if( '/' === obj.host.slice( -1 ) ) {
                obj.host = obj.host.slice( 0, -1 );
            }

            if( start ) {
                params.push( `start=${start}` );
            }
            if( obj.duration ) {
                params.push( `duration=${obj.duration}` );
            }
            if( obj.resourceSlotSearch ) {
                params.push( 'resourceSlotSearch=true' );
            }
            if( obj.n ) {
                params.push( `n=${obj.n}` );
            }
            if( obj.startTime ) {
                params.push( `startTime=${obj.startTime}` );
            }
            if( obj.endTime ) {
                params.push( `endTime=${obj.endTime}` );
            }

            url = `${obj.host}/r/calculateschedule/?${params.join( '&' )}`;

            function externalCb( err, response, body ) {
                var
                    fin;
                if( !err ) {
                    fin = body;
                }
                Y.log( 'Got result: ' + JSON.stringify( fin ) );
                callback( err, fin );
            }

            Y.doccirrus.https.externalGet( url, options, externalCb );
        };

        PucProxy.prototype.getScheduleType = function getScheduleType( obj, query, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
            // ultimately we may need a security pattern, to hand over security
            // info with friend requests.
                url1 = '/r/scheduletype/?query=isPublic,true',
                myUrl;

            if( 'string' !== typeof obj.host ) {
                Y.log( 'getSchedule() insufficient parameters.', 'error', NAME );
                return callback( 'internal error: missing parameters' );
            }
            if( query && query.type ) {
                url1 += `,type,${query.type}`;
            }

            // strip trailing slash on host
            if( '/' === obj.host.slice( -1 ) ) {
                obj.host = obj.host.slice( 0, -1 );
            }

            myUrl = obj.host + url1;

            function externalCb( err, response, body ) {
                var
                    fin;
                if( !err ) {
                    fin = body;
                }
                Y.log( 'Got result: ' + JSON.stringify( fin ) );
                callback( err, fin );
            }

            Y.doccirrus.https.externalGet( myUrl, options, externalCb );
        };

        PucProxy.prototype.getContact = function getContact( obj, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                url1 = '/1/contact/patient/true',
                reqUrl;

            if( 'string' !== typeof obj.host ||
                'string' !== typeof obj.patientId ) {
                Y.log( 'getSchedule() insufficient parameters.', 'error', NAME );
                return callback( 'internal error: missing parameters' );
            }

            // strip trailing slash on host
            if( '/' === obj.host.slice( -1 ) ) {
                obj.host = obj.host.slice( 0, -1 );
            }

            reqUrl = obj.host + url1 + obj.patientId;

            function externalCb( err, response, body ) {
                var
                    data = body && body.data;

                Y.log( 'Got result: ' + JSON.stringify( body ) );
                callback( err, data );
            }

            Y.doccirrus.https.externalGet( reqUrl, options, externalCb );
        };

        /**
         *
         * @param {Object}          obj             Must have following properties:
         *                                          host: URL to access
         *                                          patientId: the patientId local to the PRC
         * @param {String}         doctor           'all', 'doctor', 'info', 'doctorWithEmployee' types of calendar required.
         * @param {Function}       callback
         */
        PucProxy.prototype.getCalendar = function getCalendar( obj, doctor, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
            // ultimately we may need a security pattern, to hand over security
            // info with friend requests.
                url1 = '/1/calendar/isPublic/true?isFromPortal=true&pid=',
                myUrl;

            if( 'string' !== typeof obj.host ||
                'string' !== typeof obj.patientId ) {
                Y.log( 'getCalendar() insufficient parameters.', 'error', NAME );
                callback( 'internal error: missing parameters' );
                return;
            }

            // strip trailing slash on host
            if( '/' === obj.host.slice( -1 ) ) {
                obj.host = obj.host.slice( 0, -1 );
            }

            myUrl = obj.host + url1 + obj.patientId;

            function externalCb( error, response, body ) {
                var
                    result,
                    fin = [];
                if( !error ) {
                    result = body && body.data;
                    switch( doctor ) {
                        case 'doctor':
                            fin = selectCals( result, function( elt ) {
                                return (Y.doccirrus.schemas.calendar.isDoctorCalendar( elt._id ));
                            } );
                            break;
                        case 'doctorWithEmployee':
                            fin = selectCals( result, ( calendar ) => {
                                return (Y.doccirrus.schemas.calendar.isDoctorCalendar( calendar._id ) &&
                                        calendar.employee && Y.doccirrus.comctl.isObjectId( calendar.employee ));
                            } );
                            break;
                        case 'info':
                            fin = selectCals( result, function( elt ) {
                                return !(Y.doccirrus.schemas.calendar.isDoctorCalendar( elt._id ));
                            } );
                            break;
                        default:
                            fin = result;
                    }
                }
                Y.log( 'Got result: ' + JSON.stringify( fin ) );
                callback( error, fin );
            }

            Y.doccirrus.https.externalGet( myUrl, options, externalCb );

        };

        /**
         *
         * @param {Object}          obj             Must have following properties:
         *                                          host: URL to access
         *                                          patientId: the patientId local to the PRC
         * @param {function}       callback
         */
        PucProxy.prototype.getLocations = function getLocations( obj, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
            // ultimately we may need a security pattern, to hand over security
            // info with friend requests.
                url1 = '/1/location/:enhancedLocations?pid=',
                myUrl;

            if( 'string' !== typeof obj.host ||
                'string' !== typeof obj.patientId ) {
                Y.log( 'getPractice() insufficient parameters.', 'error', NAME );
                callback( 'internal error: missing parameters' );
                return;
            }

            // strip trailing slash on host
            if( '/' === obj.host.slice( -1 ) ) {
                obj.host = obj.host.slice( 0, -1 );
            }

            myUrl = obj.host + url1 + obj.patientId;

            function externalCb( error, response, body ) {
                var
                    data = body && body.data,
                    fin = [];

                if( !error ) {
                    fin = data;
                }
                Y.log( 'Got result: ' + JSON.stringify( fin ) );
                callback( error, fin );
            }

            Y.doccirrus.https.externalGet( myUrl, options, externalCb );

        };

        /**
         * Makes a call to practice by host to get settings
         * method getSettings
         * @param {Object} data
         * @param {String} data.host - host of desired practice
         * @param {Function} callback
         *
         * @return {Function} callback
         */
        PucProxy.prototype.getSettings = function getSettings( data, callback ) {
            const
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                api = '/1/settings/:get';
            let
                host = data.host,
                url;

            if( !host ) {
                Y.log( 'getSettings error: host is missing.', 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'host is missing'} ) );
            }

            // strip trailing slash on host
            if( '/' === host.slice( -1 ) ) {
                host = host.slice( 0, -1 );
            }

            url = host + api;

            function externalCb( err, data ) {
                if( err ) {
                    Y.log( `getSettings. Error from externalGet of settings: ${err.stack || err}`, 'warn', NAME );
                    return callback( err );
                }
                return callback( err, data );
            }

            Y.doccirrus.https.externalGet( url, Object.assign( {errDataCallback: true}, options ), externalCb );
        };

        /**
         *
         * @param {Object}          obj         Must have following properties:
         *                                      host: URL to access
         *                                      patientId: the patientId local to the PRC
         * @param {Function}        callback
         */
        PucProxy.prototype.getFormCategories = function getFormCategories( obj, callback ) {
            Y.log('DEPRECATED: PucProxy.getFormCategories, please use static YUI object. Host: ' + obj.host, 'warn', NAME);
            callback(null, Y.dcforms.categories);
        };

        PucProxy.prototype.getWaitingtime = function getWaitingtime( data, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                url1 = '/r/calculateschedule?action=calculateschedule&subaction=NEXT_SLOT&scheduletype=' + data.scheduletype +
                       '&isRandomMode=' + data.isRandomMode,
                waitingtimeUrl;

            if( 'string' !== typeof data.host ||
                'string' !== typeof data.patientId ) {
                Y.log( 'getWaitingtime() insufficient parameters.', 'error', NAME );
                return callback( 'internal error: missing parameters' );
            }

            function handleWaitingtime( error, response, body ) {
                if( error ) {
                    return callback( error );
                }
                callback( error, body );
            }

            waitingtimeUrl = [
                data.host,
                (data.host.match( /.*\/$/ ) ? url1.substr( 1 ) : url1),
                '&calendar=',
                data.calendarId
            ].join( '' );
            Y.doccirrus.https.externalGet( waitingtimeUrl, options, handleWaitingtime );
        };

        PucProxy.prototype.getPracticeInfo = function getPracticeInfo( user, obj, callback ) {
            var
                nRequests,
                nResp = 0,
                result = {error: [], data: []};

            // 3. collate results and return to browser
            function getJoinCb( patientReg ) {
                var
                //remember which host the response is from
                    myData = patientReg;

                myData.namePrac = [];

                // could do this more elegantly with events, but boils down to the same thing:
                // 6.  counting responses, and when we have all our responses, return the result.
                function checkDone() {
                    var i;
                    if( nResp === nRequests ) {
                        // we need to remove the coname out of the array structure
                        for( i = 0; i < result.data.length; i++ ) {
                            result.data[i].coname = result.data[i].coname[0];
                        }
                        // set the cache value before returning.
                        // NB: Do not pass host info to the client -- strictly private Info!
                        cachePatCals[user.identityId] = result;
                        // JSON expects an array
                        callback( null, result );
                    }
                }

                // This is the DCPRC callback. It does not write into the shared space (result)
                // at all. Instead it writes into the local space, and is ensured that the coname
                // will be merged with the correct PRC data.
                function custCb( err, data ) {
                    nResp++;
                    if( err ) {
                        Y.log( 'No customer name for ' + myData.customerPracId + ' / err ' + err, 'warn', NAME );
                        myData.namePrac[0] = '';
                    } else {
                        Y.log( 'Got customer info ' + JSON.stringify( data ), 'debug', NAME );
                        if( data && data[0] ) {
                            myData.namePrac[0] = data[0].coname;
                        } else {
                            myData.namePrac[0] = 'Kein Name';
                        }
                    }
                    checkDone();
                }

                // 4.  Immediately go to the DCPRC and get the info for this customer (practice).
                // NB could unleash a storm of REST calls. utils DCPRC can buffer this somewhat with caching.
                Y.doccirrus.utils.dcprcGetCustomer( myData.customerIdPrac, custCb );

                // 5.   Return a context sensitive join function that will be the callback of all
                // requests to the PRC.  The PRC response is stored here.
                // This is the only function here that will write into the shared space, so there is no
                // danger of collisions with step 4.
                return function join( err, data ) {
                    nResp++;
                    if( err ) {
                        Y.log( 'Error getting db info: ' + err, 'warn', NAME );
                        result.error.push( err.toString() );
                    }
                    if( !data || !data[0] ) {
                        Y.log( 'Empty result metaprac. (3)' + myData.host, 'info', NAME );
                        result.error.push( 'Keine Praxis mit der Kundennr.' );
                    } else {
                        result.data.push( { customerIdPrac: myData.customerIdPrac, coname: myData.namePrac, confirmed: myData.confirmed, locations: data } );
                    }
                    checkDone();
                };
            }

            // 2. Send to each one a request for practice infos.
            function handlePracData( err, data ) {
                var i;
                if( err ) {
                    Y.log( 'Error getting db info: ' + err, 'warn', NAME );
                    callback( 'Internal Server Error' );
                    return;
                }
                if( !data || !data[0] ) {
                    Y.log( 'Empty result metaprac. (1)', 'info', NAME );
                    callback( 'Keine Informationen vorhanden4' );
                    return;
                }
                // We send two requests per each practice!
                // this is because we check the name on the DCPRC and go to the PRC
                // both responses must be present or timed out before we return to the user.
                nRequests = data.length * 2;

                for( i = 0; i < data.length; i++ ) {
                    Y.doccirrus.pucproxy.getLocations( data[i], getJoinCb( data[i] ) );
                }

            }

            // 1. get the list of practices.
            dcPucProxy.getPracticesByUser( user, {dcCustomerNo: obj.dcCustomerNo, checkTransfer: obj.checkTransfer}, handlePracData );
        };

        /**
         * @method getFullPracticeInfo
         * @param {Object} user
         * @param {Object} obj
         * @param {String} obj.dcCustomerNo
         * @param {Boolean} obj.checkTransfer
         * @param {Function} callback
         */
        PucProxy.prototype.getFullPracticeInfo = function getFullPracticeInfo( user, obj, callback ){
            var
                async = require( 'async' ),
                isVCUser = user && 'VC Proxy User' ===  user.U && 'vc-user' === user.id,
                getPractices = ( isVCUser && obj && obj.dcCustomerNo ) ? dcPucProxy.getPracticesByVCUser : dcPucProxy.getPracticesByUser;

            /**
             * Populates practice data.
             * @param {Object} practice patient and practice data
             * @param {Function} callback
             */
            function populatePractice( practice, callback ) {
                var
                    prcOffline = false,
                    calendarType = 'doctor';
                async.parallel( {
                    locations: function( done ) {

                        Y.doccirrus.pucproxy.getLocations( practice, function( err, data ) {
                            if( err ) {
                                Y.log( 'Error getting db info: ' + err, 'warn', NAME );
                                if( ( 503 === err.code ) || ( 502 === err.code ) ){
                                    /**
                                     * FIXME this is a hack. We need a way how to pass data with errors. Client side should understand
                                     *  that data from server is not complete because of some of requests were failed
                                     */
                                    prcOffline = true;
                                    return done();
                                } else {
                                    return done( err );
                                }
                            }
                            if( !data || !data[ 0 ] ) {
                                Y.log( 'Empty result metaprac. (3)' + practice.host, 'info', NAME );
                                return done( Y.doccirrus.errors.rest( 500, 'Keine Praxis mit der Kundennr.' ) );

                            }
                            done( err, data );
                        } );
                    },
                    calendars: function( done ) {
                        if( isVCUser ) {
                            calendarType = 'doctorWithEmployee';
                        }
                        Y.doccirrus.pucproxy.getCalendar( practice, calendarType, function( err, data ) {
                            if( err ) {
                                Y.log( 'Error getting calendar info: ' + err, 'warn', NAME );
                                if( ( 503 === err.code ) || ( 502 === err.code ) ){
                                    /**
                                     * FIXME this is a hack. We need a way how to pass data with errors. Client side should understand
                                     *  that data from server is not complete because of some of requests were failed
                                     */
                                    prcOffline = true;
                                    return done();
                                } else {
                                    return done( err );
                                }
                            }
                            if( !data || !data[ 0 ] ) {
                                Y.log( 'Empty result calendar. ' + practice.customerIdPrac, 'info', NAME );
                            }
                            done( err, data );
                        } );
                    },
                    customerData: function( done ) {
                        Y.doccirrus.utils.dcprcGetCustomer( practice.customerIdPrac, function( err, data ) {
                            var
                                result = (data && data[ 0 ]) || {};
                            if( err ) {
                                Y.log( 'No customer name for ' + practice.customerIdPrac + ' / err ' + err, 'error', NAME );
                            }
                            done( null, result );
                        } );
                    },
                    settings: function( done ) {
                        Y.doccirrus.pucproxy.getSettings( practice, function( err, data ) {
                            if( err ) {
                                Y.log( `Error getting db info: ${err.stack || err}`, 'warn', NAME );
                                if( ( 503 === err.code ) || ( 502 === err.code ) ){
                                    /**
                                     * FIXME this is a hack. We need a way how to pass data with errors. Client side should understand
                                     *  that data from server is not complete because of some of requests were failed
                                     */
                                    prcOffline = true;
                                    return done();
                                } else {
                                    return done( err );
                                }
                            }
                            if( !data || !data[ 0 ] ) {
                                Y.log( `populatePractice. Empty results of settings in practice ${practice.host}`, 'info', NAME );
                                return done( Y.doccirrus.errors.rest( 500, 'Keine Praxis mit der Kundennr.' ) );
                            }
                            done( err, data );
                        } );
                    }
                }, function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( err, {
                        customerIdPrac: practice.customerIdPrac,
                        prcPubKey: practice.pubKey,
                        coname: result.customerData.coname,
                        confirmed: practice.confirmed,
                        enablePublicVC: result.settings && result.settings[0] && result.settings[0].enablePublicVC,
                        email: practice.email,
                        locations: result.locations,
                        calendars: result.calendars,
                        prcOffline: prcOffline,
                        noPRC: practice.noPRC,
                        createPlanned: practice.createPlanned,
                        onlyPracticesPatientsCanBook: practice.onlyPracticesPatientsCanBook
                    } );
                } );

            }

            function getPracticesCb( err, data ) {
                if( err ) {
                    Y.log( 'Error getting db info: ' + err, 'error', NAME );
                    callback( Y.doccirrus.errors.rest( 500, 'Internal Server Error' ) );
                    return;
                }
                if( !data || !data[ 0 ] ) {
                    Y.log( 'Empty result metaprac. (1)', 'error', NAME );
                    callback( Y.doccirrus.errors.rest( 500, 'Keine Informationen vorhanden4' ) );
                    return;
                }
                async.map( data, populatePractice, callback );
            }

            getPractices( user, {
                dcCustomerNo: obj.dcCustomerNo,
                checkTransfer: obj.checkTransfer
            }, getPracticesCb );
        };

        /**
         * get a list of employees of given type that can be associated with the patient
         * they come from all practices the patient is a memeber of
         * @param {Object}              user
         * @param {String}              patientId               practice ID
         * @param {String}              employeeType            eg. PHYSICIAN for doctors
         * @param {Function}            callback
         */
        PucProxy.prototype.getEmployees = function getEmployees( user, patientId, employeeType, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                hosts = [],// array of {url,practiceId}
                employees = [],
                counter,
                url = '/1/employee/type/' + employeeType;

            // callback from each PRC
            function getPRCCb( practiceId ) {
                var myPracticeId = practiceId;

                return function collectEmployees( err, response, body ) {
                    var
                        result = body && body.data;
                    counter--;
                    if( err ) {
                        Y.log( 'Error in retrieving employees from PRC, it maybe down: ' + err, 'warn', NAME );
                        return;
                    }
                    if( !result || !result[0] ) {
                        Y.log( 'no employee from PRC, it may be a problem.', 'debug', NAME );
                        return;
                    }

                    result.forEach( function( employee ) {
                        employee.practiceId = myPracticeId;
                        employees.push( employee );
                    } );

                    if( 0 === counter ) {
                        Y.log( employees.length + ' employees collected from  PRCs', 'debug', NAME );
                        callback( null, employees );
                    }
                };
            }

            function callPRCs() {
                Y.log( 'send getEmployee requests to ' + hosts.length + ' PRCs', 'debug', NAME );
                counter = hosts.length;
                hosts.forEach( function( host ) {
                    var prcUrl = Y.doccirrus.utils.appendUrl( host.url, url );
                    Y.log( 'send getEmployee request to ' + prcUrl, 'debug', NAME );
                    Y.doccirrus.https.externalGet( prcUrl, options, getPRCCb( host.practiceId ) );
                } );
            }

            function getPracHost( err, result ) {
                counter--;
                if( err || !result || !result[0] ) { // we expect exactly one metaprac for each patientreg
                    callback( err || 'invalid params' );
                    return;
                }
                hosts.push( {url: result[0].host, practiceId: result[0].customerIdPrac} );
                if( 0 === counter ) {
                    callPRCs();
                }
            }

            function collectPracticeIds( err, result ) {
                if( err || !result || !result[0] ) {
                    callback( err || 'invalid params' );
                    return;
                }
                counter = result.length;
                result.forEach( function( patientreg ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'metaprac',
                        query: {customerIdPrac: patientreg.customerIdPrac},
                        callback: getPracHost
                    } );
                } );

            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'patientreg',
                query: {patientId: patientId},
                callback: collectPracticeIds
            } );
        }; //getEmployees

        /**
         * request for an encrypted TAN from PRC
         * @param {Object}          obj             containing host, patientId and activityIds
         * @param {Function}        callback
         *
         * @return {Function}       callback
         */
        PucProxy.prototype.getETAN = function getETAN( obj, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                url = '/r/initpatienttransfer?action=initpatienttransfer';

            if( 'string' !== typeof obj.host ||
                'object' !== typeof obj.activityIds ||
                'object' !== typeof obj.sourceData ||
                'object' !== typeof obj.targetData ||
                'string' !== typeof obj.sourceData.patientId ) {
                Y.log( 'getETAN() insufficient parameters.', 'error', NAME );
                return callback( 'internal error: missing parameters' );
            }

            url = Y.doccirrus.utils.appendUrl( obj.host, url );

            function externalCb( error, response, body ) {
                var
                    eTAN;

                if( !error ) {
                    eTAN = body.eTAN;
                }
                Y.log( 'received ETAN: ' + eTAN );
                callback( error, eTAN );
            }

            var data = {
                patientId: obj.sourceData.patientId,
                activityIds: obj.activityIds,
                targetData: obj.targetData,
                sourceData: obj.sourceData
            };

            Y.doccirrus.https.externalPost( url, data, options, externalCb );

        };

        /**
         * send a request to PRC to actually start patient transfer
         * @param {Object}          obj
         * @param {Function}        callback
         *
         * @return {Function}       callback
         */
        PucProxy.prototype.sendTransferConfirm = function sendTransferConfirm( obj, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                url = '/r/exportpatientdata?action=exportpatientdata';

            if( 'string' !== typeof obj.host ||
                'string' !== typeof obj.eTAN ||
                'string' !== typeof obj.dcCustomerNo ||
                'string' !== typeof obj.patientId ) {
                Y.log( 'sendTransferConfirm() insufficient parameters.', 'error', NAME );
                return callback( 'internal error: missing parameters' );
            }

            url = Y.doccirrus.utils.appendUrl( obj.host, url );

            // check PRC response
            function externalCb( error, response, body ) {
                Y.log( 'sendTransferConfirm: reponse from PRC:' + JSON.stringify( body ), 'debug', NAME );
                callback( error, {statusCode: response && response.statusCode} );
            }

            var data = {
                dcCustomerNo: obj.dcCustomerNo,
                patientId: obj.patientId,
                eTAN: obj.eTAN
            };

            Y.log( 'sending final request for patient transfer, eTAN=' + obj.eTAN, 'debug', NAME );
            Y.doccirrus.https.externalPost( url, data, options, externalCb );

        };

        /**
         * retrieve approved activities by patientId and practiceId#
         * @param {Object}          user
         * @param {Object}          obj
         * @param {Function}        callback
         *
         * @return {Function}       callback
         */
        PucProxy.prototype.getActivitiesByPractice = function getActivitiesByPractice( user, obj, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                url = '/1/activity/:getActivityForTransfer',
                patientId;

            if( 'string' !== typeof obj.practiceId ) {
                Y.log( 'getActivitiesByPractice() insufficient parameters.', 'error', NAME );
                return callback( 'internal error: missing parameters' );
            }

            function externalCb( err, response, body ) {
                if( err ) {
                    Y.log( 'getActivitiesByPractice: error in getting activities from PRC', 'error', NAME );
                    callback( err );
                    return;
                }
                if( !body ) {
                    Y.log( 'getActivitiesByPractice: patient has no activity on the practice: ' + obj.practiceId, 'debug', NAME );
                }
                callback( err, body && body.data );
            }

            function callPRC( err, result ) {
                var metaprac;
                if( err || !result || !result[0] ) {
                    callback( err || 'no metaprac found for user' );
                    return;
                } else {
                    metaprac = result[0];
                }

                url = Y.doccirrus.utils.appendUrl( result[0].host, url ) + '/patientId/' + patientId + '/status/APPROVED';
                Y.log( 'get the list of patient approved activities from practice: ' + metaprac.customerIdPrac );
                Y.doccirrus.https.externalGet( url, options, externalCb );
            }

            function getMetaprac( err, result ) {
                if( err || !result || !result[0] ) {
                    callback( err || 'no patientreg found for user, identityId=' + user.identityId );
                    return;
                }

                patientId = result[0].patientId;

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'metaprac',
                    query: {customerIdPrac: result[0].customerIdPrac},
                    callback: callPRC
                } );
            }

            getPatientRegForUser( user, {customerIdPrac: obj.practiceId}, getMetaprac );
        };
        /**
         * method getPRCPatientPortalUrl
         * @param {Object} params
         * @param {Object} params.data
         * @param {String} params.data.host
         * @param {Function} params.callback
         *
         * @return {Function} callback
         */
        PucProxy.prototype.getPRCPatientPortalUrl = function( params ) {
            const
                { data = {}, callback } = params,
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                // ultimately we may need a security pattern, to hand over security
                // info with friend requests.
                api = '/1/settings/:getPatientPortalUrl';
            let
                host = data.host,
                url;

            if( !host ) {
                Y.log( 'getPRCPatientPortalUrl error: host is missing.', 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'host is missing' } ) );
            }

            // strip trailing slash on host
            if( '/' === host.slice( -1 ) ) {
                host = host.slice( 0, -1 );
            }

            url = host + api;

            function externalCb( err, data ) {
                if( err ) {
                    return callback( err );
                }
                callback( err, data );
            }

            Y.doccirrus.https.externalGet( url, Object.assign( { errDataCallback: true }, options ), externalCb );
        };


        /**
         *  Get a slightly redacted set of documents shared with this patient
         *
         *  @param  {Object}    user
         *  @param  {Object}    prac
         *  @param  {String}    sha1KeyHash     Fingerprint of patient public key, used to encrypt response from PRC
         *  @param  {Function}  callback
         *
         *  @return {Function}
         */
        PucProxy.prototype.getDocumentsForPatient = function __getDocumentsForPatient( user, prac, sha1KeyHash, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                remoteUrl = '/1/document/:patientMediaDocuments';

            if( 'string' !== typeof prac.host || 'string' !== typeof prac.patientId ) {
                Y.log( 'getDocumentsForPatient() insufficient parameters.', 'error', NAME );
                return callback( 'internal error: missing parameters' );
            }

            // strip trailing slash on host
            if( '/' === prac.host.slice( -1 ) ) {
                prac.host = prac.host.slice( 0, -1 );
            }

            remoteUrl = prac.host + remoteUrl +
                '?pid=' + prac.patientId +
                '&pubKeyHash_=' + sha1KeyHash +
                '&source_=' + 'patient' +
                '&id_=' + prac.patientId;

            Y.doccirrus.https.externalGet( remoteUrl, options, onGetExternalDocuments );

            function onGetExternalDocuments( err, response, body ) {

                if ( !err && body && body.meta && body.meta.errors && body.meta.errors[0] ) {
                    err = body.meta.errors[0];
                }

                if ( err ) {
                    Y.log( 'Could not complete needle request to PRC: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                callback( null, body );
            }
        };

        /**
         *  Get dataURI representation of patient media
         *
         *  @param  {Object}    user                    REST user or equivalent
         *  @param  {Object}    prac                    Metaprac
         *  @param  {Object}    envelope
         *  @param  {String}    envelope.pubKeyHash_    Fingerprint of patient public key, used to encrypt response from PRC
         *  @param  {String}    envelope.source_        Always 'patient'
         *  @param  {String}    envelope.id_            Patient _id
         *  @param  {String}    envelope.content_       Encrypted data, containing mediaId, transform, format
         *  @param  {Function}  callback
         */

        PucProxy.prototype.getMediaForPatient = function __getMediaForPatient( user, prac, sha1KeyHash, content_, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                remoteUrl = '/1/media/:loadDataURI',
                postArgs = {
                    'content_': content_,
                    'pubKeyHash_': sha1KeyHash
                };

            if( 'string' !== typeof prac.host || 'string' !== typeof prac.patientId ) {
                Y.log( 'getDocumentsForPatient() insufficient parameters.', 'error', NAME );
                return callback( 'internal error: missing parameters' );
            }

            // strip trailing slash on host
            if( '/' === prac.host.slice( -1 ) ) {
                prac.host = prac.host.slice( 0, -1 );
            }

            remoteUrl = prac.host + remoteUrl +
                '?pid=' + prac.patientId +
                '&pubKeyHash_=' + sha1KeyHash +
                '&source_=' + 'patient' +
                '&id_=' + prac.patientId;

            Y.doccirrus.https.externalPost( remoteUrl, postArgs, options, onGetMediaForPatient );

            function onGetMediaForPatient( err, response, body ) {
                if ( !err && body && body.meta && body.meta.errors && body.meta.errors[0] ) {
                    err = body.meta.errors[0];
                }

                if ( err ) {
                    Y.log( 'Could not complete needle request to PRC: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                callback( null, body );
            }
        };

        /**
         *  Send a file to a PRC to be created as an attachment on an activity in 'Von Patient' casefolder
         *
         *  @param  {Object}    user            REST user
         *  @param  {Object}    prac            Metaprac object
         *  @param  {String}    sha1KeyHash_    Fingerprint of patient public key, used to encrypt response from PRC
         *  @param  {String}    content_        Encrypted data, containing dataURI, docType, caption
         *  @param  {Function}  callback        Of the form fn( err, envelope )
         */

        PucProxy.prototype.postMediaToPatient = function __postMediaToPatient( user, prac, sha1KeyHash, content_, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                remoteUrl = '/1/media/:saveDataURIAsActivity',
                postArgs = {
                    'content_': content_,
                    'pubKeyHash_': sha1KeyHash,
                    'id_': prac.patientId
                };

            if( 'string' !== typeof prac.host || 'string' !== typeof prac.patientId ) {
                Y.log( 'getDocumentsForPatient() insufficient parameters.', 'error', NAME );
                return callback( 'internal error: missing parameters' );
            }

            // strip trailing slash on host
            if( '/' === prac.host.slice( -1 ) ) {
                prac.host = prac.host.slice( 0, -1 );
            }

            remoteUrl = prac.host + remoteUrl +
                '?pid=' + prac.patientId +
                '&pubKeyHash_=' + sha1KeyHash +
                '&source_=' + 'patient' +
                '&id_=' + prac.patientId;

            Y.doccirrus.https.externalPost( remoteUrl, postArgs, options, onDataURIStored );

            function onDataURIStored( err, response, body ) {
                if ( !err && body && body.meta && body.meta.errors && body.meta.errors[0] ) {
                    err = body.meta.errors[0];
                }

                if ( err ) {
                    Y.log( 'Could not complete needle request to PRC: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                callback( null, body );
            }
        };

        dcPucProxy = new PucProxy();
        Y.namespace( 'doccirrus' ).pucproxy = dcPucProxy;
    },
    '0.0.1', {requires: [
        'oop', 'dc-comctl',
        'dcforms-categories'
    ]}
);
