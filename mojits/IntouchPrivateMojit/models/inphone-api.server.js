/**
 * User: dcdev
 * Date: 9/20/17  12:52 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'inphone-api', function( Y, NAME ) {
        /**
         * @module inphone-api
         */
        const needle = require( 'needle' ),
            WebSocket = require('ws'),
            moment = require( 'moment' ),
            { formatPromiseResult, promisifyArgsCallback } = require('dc-core').utils,
            LEANSYNC_INITIATE_CALL = 'LEANSYNC_INITIATE_CALL';
        let ws, leanSyncKey, leanSyncPlatformKey, leanSyncNumber;

        function getForCallerLog( args ) {
            Y.log('Entering Y.doccirrus.api.inphone.getForCallerLog', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inphone.getForCallerLog');
            }
            var
                callback = args.callback,
                user = args.user,
                options = args.options,
                query = args.query;

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'inphone',
                action: 'get',
                query: query,
                options: Object.assign( options, {lean: true} ),
                callback: callback
            } );
        }

        function inboundphonecall( args ) {
            Y.log('Entering Y.doccirrus.api.inphone.inboundphonecall', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inphone.inboundphonecall');
            }
            var
                async = require( 'async' ),
                user = args.user,
                query = args.query || {},
                callerno,
                calleeno,
                callername,
                calleename,
                messageContent,
                messageId = '',
                employees = [],
                voipMessages = [];

            if( !query.caller ) {
                // this is a normal case - there are many valid numbers that cannot be found.
                return args.callback( new Y.doccirrus.commonerrors.DCError( 200, {message: 'No caller provided.'} ) );
            }

            if( !query.callee ) {
                return args.callback( new Y.doccirrus.commonerrors.DCError( 200, {message: 'No callee provided.'} ) );
            }

            callerno = Y.doccirrus.commonutils.homogenisePhoneNumber( query.caller );
            calleeno = Y.doccirrus.commonutils.homogenisePhoneNumber( query.callee );
            callername = query.callername || callerno;
            calleename = query.calleename || calleeno;

            Y.log( 'Handling inboundphonecall: ' + callerno + ' ' + callername + '  &  ' + calleeno + ' ' + calleename + ' ', 'info', NAME );

            function defineCallerType( _cb ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'voipindex',
                    action: 'get',
                    query: {
                        homogenisednumber: callerno
                    },
                    options: {
                        lean: true
                    }
                }, ( err, result ) => {
                    if( err ) {
                        Y.log( 'Internal Error: ' + JSON.stringify( err ), 'error', NAME );
                        Y.log( 'Could not define caller type. ', 'warn', NAME );
                        return _cb( err );
                    }
                    if( result && result[0] ) {
                        return _cb( null, result );
                    } else {
                        return _cb( new Y.doccirrus.commonerrors.DCError( 200, {message: 'Caller not found.'} ) );
                    }
                } );
            }

            function defineCallee( _cb ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'voipindex',
                    action: 'get',
                    query: {
                        homogenisednumber: { $in: [ calleeno, query.callee ] },
                        model: "EMPLOYEE"
                    },
                    options: {
                        select: {
                            personId: 1
                        }
                    }
                }, ( err, result ) => {
                    if( err ) {
                        Y.log( 'Internal Error: ' + JSON.stringify( err ), 'error', NAME );
                        Y.log( 'Could not define callee. ', 'warn', NAME );
                        return _cb( err );
                    }
                    if( result && result[0] ) {
                        result.forEach( ( item ) => {
                            employees.push( item.personId );
                        } );
                        return _cb();
                    } else {
                        return _cb( new Y.doccirrus.commonerrors.DCError( 200, {message: 'Callee not found.'} ) );
                    }
                } );
            }

            function saveCallInfo( data, _cb ) {

                var callInfo,
                    callerDisplayName;

                callInfo = `Von: ${callerno}`;

                if( callername ) {
                    callInfo += ` (${callername}), An: ${calleeno}`;
                } else {
                    callInfo += `, An: ${calleeno}`;
                }

                if( calleename ) {
                    callInfo += ` (${calleename})`;
                }

                if( data && data[0] ) {
                    async.eachSeries( data, ( person, done ) => {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: person.model.toLowerCase(),
                            action: 'get',
                            query: {
                                _id: person.personId
                            }
                        }, ( err, result ) => {
                            if( err ) {
                                return done( err );
                            }
                            if( result && result[0] ) {
                                //"Anrede Titel Vorname Namenszusatz Vorsatzwort Nachname"
                                callerDisplayName = `${Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Talk_E', result[0].talk, '-de', '' )} ${result[0].title || ''} ${result[0].firstname || result[0].institutionName || ''} ${result[0].nameaffix || ''} ${result[0].fk3120 || ''} ${result[0].lastname || ''}`;
                                voipMessages.push( {
                                    callername: callerDisplayName,
                                    callerType: person.model,
                                    personId: ( 'PATIENT' === person.model || 'BASECONTACT' === person.model ) ? result[0]._id : null
                                } );

                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'inphone',
                                    action: 'post',
                                    data: {
                                        skipcheck_: true,
                                        callInfo: callInfo,
                                        callerType: person.model,
                                        callername: callerDisplayName,
                                        callTime: moment(),
                                        caller: callerno,
                                        callee: calleeno
                                    }
                                }, ( error ) => {
                                    if( error ) {
                                        return done( error );
                                    }
                                    return done();
                                } );
                            } else {
                                return done();
                            }
                        } );
                    }, ( error ) => {
                        if( error ) {
                            return _cb( error );
                        } else {
                            return _cb();
                        }
                    } );
                } else {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'inphone',
                        action: 'post',
                        data: {
                            skipcheck_: true,
                            callInfo: callInfo,
                            callTime: moment(),
                            caller: callerno,
                            callee: calleeno
                        }
                    }, ( error ) => {
                        if( error ) {
                            return _cb( error );
                        } else {
                            return _cb();
                        }
                    } );
                }
            }

            async.waterfall( [
                defineCallerType,
                saveCallInfo,
                defineCallee
            ], ( err ) => {
                if( err ) {
                    return args.callback( err );
                }
                if( employees && employees.length ) {
                    async.eachSeries( employees, ( employee, done ) => {
                        let employeeSignaling = false;
                        async.series( [
                            function( next ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'employee',
                                    method: 'get',
                                    query: {
                                        _id: employee
                                    },
                                    options: {
                                        limit: 1,
                                        select: {
                                            communications: 1
                                        }
                                    }
                                }, next );
                            },
                            function( next ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'identity',
                                    method: 'get',
                                    query: {
                                        specifiedBy: employee
                                    },
                                    options: {
                                        limit: 1,
                                        select: {
                                            signaling: 1
                                        }
                                    }
                                }, next );
                            }
                        ], ( err, results ) => {
                            if( err ) {
                                return done( err );
                            }
                            if( results && results[0] && results[0][0] ) {
                                let communications = results[0][0].communications,
                                    currentPhoneNumber = communications && communications.find( ( item ) => {
                                        return ( Y.doccirrus.commonutils.homogenisePhoneNumber( item.value ) === calleeno ||
                                                 item.value === query.callee );
                                    } );
                                if( currentPhoneNumber && currentPhoneNumber.signaling ) {
                                    employeeSignaling = true;
                                }
                            }
                            if( results && results[1] && results[1][0] && results[1][0].signaling && employeeSignaling && voipMessages.length ) {
                                messageContent = '';

                                messageContent += '<span>Anruf von ' + Y.doccirrus.schemaloader.getEnumListTranslation( 'inphone', 'CallerType_E', voipMessages[0].callerType, 'i18n', '' ) + '</span><br>';

                                voipMessages.forEach( ( message, index ) => {
                                    messageContent += '<span><b>' + message.callername + '</b></span>';

                                    if( message.personId ) {
                                        messageId = message.personId;
                                        if( 1 === voipMessages.length ) {
                                            if( 'PATIENT' === message.callerType ) {
                                                messageContent += `<a class="closeAfterClick" data-messageId="${messageId}" href="/incase#/patient/${messageId}/tab/casefile_browser/" target="_blank">  Öffnen</a><br>`;
                                            } else if( 'BASECONTACT' === message.callerType ) {
                                                messageContent += `<a class="closeAfterClick" data-messageId="${messageId}" href="/contacts#/${messageId}/" target="_blank">  Öffnen</a><br>`;
                                            }
                                        } else {
                                            if( 'PATIENT' === message.callerType ) {
                                                messageContent += `<a href="/incase#/patient/${messageId}/tab/casefile_browser/" target="_blank">  Öffnen</a><br>`;
                                            } else if( 'BASECONTACT' === message.callerType ) {
                                                messageContent += `<a href="/contacts#/${messageId}/" target="_blank">  Öffnen</a><br>`;
                                            }
                                        }

                                        if( voipMessages.length - 1 !== index ) {
                                            messageContent += '<span>oder</span><br>';
                                        }
                                    } else {
                                        messageContent += '<br>';
                                        if( voipMessages.length - 1 !== index ) {
                                            messageContent += '<span>oder</span><br>';
                                        }
                                    }
                                } );

                                Y.doccirrus.communication.emitEventForUser( {
                                    event: 'message',
                                    targetId: results[1][0]._id,
                                    messageId: messageId,
                                    msg: {
                                        data: messageContent
                                    },
                                    meta: {
                                        level: 'ERROR'
                                    }
                                } );
                                return done();
                            } else {
                                return done();
                            }
                        } );
                    }, ( err ) => {
                        if( err ) {
                            return args.callback( err );
                        }
                        return args.callback();
                    } );
                } else {
                    Y.log( 'Warning: inboundphonecall, unknown caller or callee.', 'warn', NAME );
                    return args.callback();
                }
                return args.callback();
            } );
        }

        async function defineCallParticipantsName({user, callerNo, calleeNo}) {
            let result, error;
            const homogenisedCallerNumber = Y.doccirrus.commonutils.homogenisePhoneNumber( callerNo );
            const homogenisedCalleeNumber = Y.doccirrus.commonutils.homogenisePhoneNumber( calleeNo );

            [error, result] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                user,
                model: 'voipindex',
                query: {
                    homogenisednumber: {
                        $in: [homogenisedCallerNumber, homogenisedCalleeNumber]
                    }
                }
            } ) );

            if(error || !Array.isArray(result) || !result.length) {
                error = error || Y.doccirrus.errors.rest('leansync_01', {$phoneNumber: homogenisedCallerNumber}, true);
                Y.log(`defineIncomingCaller(): Failed to get caller by phone number ${homogenisedCallerNumber}. Error:\n${error.stack || error}`, 'error', NAME);
                throw error;
            }
            const callParticipants = {};
            for(let voipIndex of result) {
                [error, result] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                    user,
                    model: voipIndex.model.toLowerCase(),
                    query: {
                        _id: voipIndex.personId
                    }
                } ) );

                if(error || !Array.isArray(result) || !result.length) {
                    error = error || Y.doccirrus.errors.rest('leansync_01', {$phoneNumber: voipIndex.homogenisednumber}, true);
                    Y.log(`Failed to get person by id ${voipIndex.personId} from voipindex ${voipIndex._id}. Error:\n${error.stack || error}`, 'error', NAME);
                    throw error;
                }
                const person = result[0],
                    exactCommunication = person.communications.find(communication =>
                        Y.doccirrus.commonutils.homogenisePhoneNumber( communication.value  ) === voipIndex.homogenisednumber
                    );

                if(voipIndex.homogenisednumber === homogenisedCallerNumber) {
                    callParticipants.caller = `${person.firstname} ${person.lastname}`;
                } else {
                    callParticipants.callee = `${person.firstname} ${person.lastname}`;
                }
                callParticipants.signaling = exactCommunication.signaling;
            }
            return callParticipants;
        }

        /**
         * Initiates a call using leanSync service
         *
         * @param {object} args
         * @param {object} args.user
         * @param {object} args.originalParams
         * @param {function} args.callback
         *
         * @returns {function} callback
         */
        function leanSyncInitCallIPC(args) {
            Y.log("Entering Y.doccirrus.api.inphone.leanSyncInitCall", 'info', NAME);
            const data = args.originalParams || args.query,
                callback = args.callback;

            data.user = args.user;
            if(Y.doccirrus.ipc.isMaster()) {
                leanSyncInitCall(data);
            } else {
                Y.doccirrus.ipc.send( LEANSYNC_INITIATE_CALL, data );
            }
            Y.log("Exiting Y.doccirrus.api.inphone.leanSyncInitCall", 'info', NAME);
            return callback();
        }

        /**
         * Creates websocket connection with leanSync service
         *
         * @param {object} user
         * @param {function} callback
         *
         * @returns {function} callback
         */
        async function leanSyncStart(user, callback) {
            // Should run only on PRC and MVPRC
            if(!Y.doccirrus.auth.isPRC() && !Y.doccirrus.auth.isMVPRC()) {
                Y.log(`leanSync: Not PRC or MVPRC. No need to initialize LeanSync`, 'info', NAME);
                return callback();
            }

            Y.log(`Entering Y.doccirrus.api.inphone.leanSyncStart`, 'info', NAME);
            let err, authData, countryMode;

            //need to get country mode from practice-api since commonutils are not yet initialized
            [err, countryMode] = await formatPromiseResult(Y.doccirrus.api.practice.getCountryMode());
            if(err) {
                Y.log(`leanSync: leanSyncStart(): Error getting country mode:\n${err.stack || err}`, 'error', NAME);
                return callback(err);
            }
            if(!countryMode || !countryMode.includes('CH')) {
                Y.log(`leanSync: Not Swiss country mode, no need to initialize LeanSync`, 'info', NAME);
                return callback();
            }
            let leanSyncConfig;
            try{
                leanSyncConfig = require( `${process.cwd()}/leanSync.json` );
            } catch( e ) {
                Y.log(`leanSync: no leanSync config, no need to initialize LeanSync`, 'info', NAME);
                return callback();
            }
            leanSyncKey = leanSyncConfig.leanSyncKey;
            leanSyncPlatformKey = leanSyncConfig.platform;

            [err, authData] = await formatPromiseResult(leanSyncAuthorize(leanSyncConfig));

            if(err) {
                Y.log( `LeanSync: initLeanSync(): failed to authorize.\n${err && err.stack || err}`, 'error', NAME );
                Y.log(`Exiting Y.doccirrus.api.inphone.leanSyncStart`, 'info', NAME);
                return callback(err);
            }
            const {centerURL, licence, myNumber} = authData;
            leanSyncNumber = myNumber;
            ws = new WebSocket(centerURL);

            ws.on('open', function( ) {
                Y.log( `LeanSync: websocket is opened!`, 'info', NAME );
                ws.send(JSON.stringify({licence, leanSyncKey}));
            });

            ws.on('message', async function( data ) {
                let msg;
                try{
                    msg = JSON.parse(data);
                } catch(ex) {
                    Y.log(`leanSync: error in parsing data from incoming message.\n${ex.message || ex}' received`, 'warn', NAME);
                    msg = data;
                }

                if(msg && msg.data) {
                    Y.log(`leanSync: message with type '${msg.data.type}' received`, 'info', NAME);
                    Y.log(`leanSync: message includes data: ${JSON.stringify(msg.data)}`, 'debug', NAME);

                    if (msg.data.type === 'incomingCall') {
                        await leanSyncOnIncomingCall({user, data: msg.data});
                    }
                } else {
                    Y.log(`leanSync: some unimportant message received!`, 'info', NAME);
                    Y.log(`leanSync: unimportant message includes data: ${JSON.stringify(msg)}`, 'debug', NAME);
                }
            });
            Y.log(`Exiting Y.doccirrus.api.inphone.leanSyncStart`, 'info', NAME);

            if(Y.doccirrus.ipc.isMaster()) {
                Y.doccirrus.ipc.subscribe( LEANSYNC_INITIATE_CALL, leanSyncInitCall );
            }
            return callback();
        }

        async function leanSyncInitCall(data) {
            if(ws.readyState !== WebSocket.OPEN) {
                Y.log(`leanSync: websocket connection is not established. ws.readyState: ${ws.readyState}`, 'error', NAME);
                const webSocketIsClosed_i18n = Y.doccirrus.i18n('inTouchMojit.inphone-api.WEBSOCKET_CLOSED');
                Y.doccirrus.communications.emitEventForUser({
                    event: 'message',
                    targetId: data.user && data.user.identityId,
                    msg: {
                        data: webSocketIsClosed_i18n
                    },
                    meta: {
                        level: 'ERROR'
                    }
                });
                return;
            }
            const calleeno = Y.doccirrus.commonutils.homogenisePhoneNumber( data.calleeno );

            Y.log(`leanSync: initiating a call from ${leanSyncNumber} to ${calleeno}`, 'info', NAME);
            ws.send(JSON.stringify({
                method: "InitiateCall",
                number: calleeno,
                caller: leanSyncNumber,
                platform: leanSyncPlatformKey
            }));
        }

        async function leanSyncOnIncomingCall( {user, data} ) {
            let error, result, callParticipants;
            [error, result] = await formatPromiseResult( defineCallParticipantsName( {
                user,
                callerNo: data.number,
                calleeNo: data.callee
            } ) );

            callParticipants = result || {signaling: true};

            if( error ) {
                Y.log( `Cannot define call participants. Error:\n${error.stack || error}`, 'error', NAME );
            }

            if( callParticipants.signaling ) {
                const inboundphonecallP = promisifyArgsCallback( inboundphonecall );
                await inboundphonecallP( {
                    user,
                    query: {
                        caller: data.number,
                        callee: data.callee,
                        callername: callParticipants.caller,
                        calleename: callParticipants.callee
                    }
                } );
            }
        }

        async function leanSyncAuthorize({leanSyncKey, platform, authUrl}) {
            Y.log(`Entering Y.doccirrus.api.inphone.leanSyncAuthorize`, 'info', NAME);
            const leanSyncConfig = JSON.stringify({leanSyncKey, platform}),
                options = {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 3000
                };
            let [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    needle.post(authUrl, leanSyncConfig, options, (err, res) => {
                        if( err ){
                            return reject( err );
                        } else {
                            resolve( res );
                        }
                    } );
                } )
            );
            if(err) {
                Y.log(`Error in authorising to leanSync service: ${err.message || err}`, 'error', NAME);
                Y.log(`Exiting Y.doccirrus.api.inphone.leanSyncAuthorize`, 'info', NAME);
                throw err;
            }
            const {statusCode, statusMessage, body} = result;

            if( statusCode !== 200 ) {
                err = Y.doccirrus.errors.rest( 'leanSync_02', null, true );
                Y.log( `LeanSync: leanSyncAuthorize(): failed LeanSync request.\nStatus code: ${statusCode}\nStatus message: ${statusMessage}.\n${err && err.stack || err}`, 'error', NAME );
                Y.log(`Exiting Y.doccirrus.api.inphone.leanSyncAuthorize`, 'info', NAME);
                throw err;
            }

            if( !body ) {
                err = Y.doccirrus.errors.rest( 'leanSync_02', null, true );
                Y.log( `LeanSync: leanSyncAuthorize(): no body in response.\n${err && err.stack || err}`, 'error', NAME );
                Y.log(`Exiting Y.doccirrus.api.inphone.leanSyncAuthorize`, 'info', NAME);
                throw err;
            }

            if( body.error ) {
                err = Y.doccirrus.errors.rest( 'leanSync_02', null, true );
                Y.log( `LeanSync: leanSyncAuthorize(): authorisation error occured. Not authorised! \n${JSON.stringify(body)}`, 'error', NAME );
                Y.log(`Exiting Y.doccirrus.api.inphone.leanSyncAuthorize`, 'info', NAME);
                throw err;
            }

            Y.log(`leanSync: response received from leanSync service: ${JSON.stringify(body)}`, 'info', NAME);
            return body;
        }

        Y.namespace( 'doccirrus.api' ).inphone = {

            name: NAME,

            inboundphonecall: inboundphonecall,
            leanSyncStart: leanSyncStart,
            leanSyncInitCall: leanSyncInitCallIPC,
            leanSyncOnIncomingCall,
            getForCallerLog: getForCallerLog
        };

    },
    '0.0.1', {requires: ['dccommunication', 'doccirrus', 'dchttps', 'dcauth']}
);
