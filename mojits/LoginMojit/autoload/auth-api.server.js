/*global YUI*/


YUI.add( 'auth-api', function( Y, NAME ) {
        var
            dcUtil = require( process.cwd() + '/middleware/dc-util.js' ),
            dcServerMiddleware = dcUtil.getServerMiddleware(),
            setSessionInfo = dcServerMiddleware.mojitoDoccirrus.setSessionInfo,
            getRedirectUrl = dcServerMiddleware.mojitoDoccirrus.getRedirectUrl,
            myCache = Y.doccirrus.cache.getCacheBase( { // available to all processes
                onlineCards: {} // list of login cards online to this PRC
            }, onCacheUpdate ),
            loginQueue = [], // queue of poll requests waiting for their card to come online
            CALL_onLoginDeviceData = 'CALL_onLoginDeviceData';

        function checkAndCreateDBSession( deviceLogin, userLogin ) {
            var callback = userLogin.callback;
            var mySession = Y.mix( userLogin, deviceLogin );
            var dbUser = Y.doccirrus.auth.getSUForTenant( mySession.tenantId );
            Y.doccirrus.mongodb.runDb({
                user: dbUser,
                model: 'identity',
                action: 'get',
                query: {_id: mySession.identityId},
                callback: (err, res) => {
                    if( err ) {
                        Y.log( "checkAndCreateDBSession can't get identity. Error: " + err, 'error', NAME );
                    }
                    if (res && res[0] && "ACTIVE" === res[0].status) {
                        createDBSession( deviceLogin, userLogin );
                    } else {
                        delete myCache.onlineCards[userLogin.deviceName];
                        myCache.onlineCards = myCache.onlineCards;
                        callback("INACTIVE");
                    }
                }
            });
        }
        /**
         * if the device is free then
         * create a valid DB session with which user will login, then call back
         *
         * @param   {Object}            deviceLogin         data from device
         * @param   {Object}            userLogin           data from poll request with the embedded callback
         */
        function createDBSession( deviceLogin, userLogin ) {
            var
                dcauth = require( 'dc-core' ).auth,
                callback = userLogin.callback, // the poll callback
                mySession = Y.mix( userLogin, deviceLogin ),
                dbUser = Y.doccirrus.auth.getSUForTenant( mySession.tenantId ),
                alreadyCreated;

            // block further calls for the same sessionId and deviceName that arrive in a racing condition
            loginQueue = loginQueue.map( function( item ) {
                if( item.sessionId === mySession.sessionId ) {
                    if( item.done ) {
                        alreadyCreated = true;
                    } else {
                        item.done = mySession.sessionId; // quick flag to prevent concurrent requests recreating the session
                    }
                }
                return item;
            } );

            if( alreadyCreated ) {
                Y.log( 'already logged in (1)', 'debug', NAME );
                callback( null, true );

            } else if( deviceLogin.inUse ) {
                Y.log( 'the login device is already in use', 'debug', NAME );
                callback( null, false );

            } else {
                Y.doccirrus.mongodb.runDb( {
                    user: dbUser,
                    model: 'auth',
                    query: {identityId: mySession.identityId, deviceName: mySession.deviceName, sessionId: mySession.sessionId}, // also device name?
                    callback: function( err, result ) {
                        if( err ) {
                            callback( err );

                        } else if( result && result[0] ) { // session already created
                            Y.log( 'already logged in', 'debug', NAME );
                            callback( null, true );

                        } else {
                            Y.log( 'creating DB session for user ' + JSON.stringify( mySession ) + ' on ' + Y.doccirrus.ipc.whoAmI(), 'debug', NAME );
                            myCache.onlineCards[mySession.deviceName].inUse = true; // no other session should use the device
                            myCache.onlineCards = myCache.onlineCards;
                            mySession.id = mySession.username;
                            dcauth.addUserSession( mySession, callback );
                        }
                    }
                } );
            }
        }

        function handleDeviceLogout( dbUser, params, callback ) {
            var
                identityId = params.identityId,
                doAutoLogout = dcServerMiddleware.timeoutHandler.doAutoLogout;

            loginQueue = loginQueue.filter( function( item ) {
                return item.identityId !== identityId;
            } );
            Y.log( loginQueue.length + ' login requests are still waiting', 'debug', NAME );
            Y.doccirrus.mongodb.runDb( {
                user: dbUser,
                model: 'auth',
                query: {identityId: identityId, deviceName: params.deviceName},
                callback: function( err, result ) {
                    if( err || !result || !result[0] ) {
                        callback( err );
                    } else {
                        Y.log( 'logging out ' + result.length + ' sessions for the user ' + identityId, 'debug', NAME );
                        result.forEach( function( item ) {
                            doAutoLogout( {identityId: identityId, sessionId: item.sessionId, tenantId: item.tenantId} );
                        } );
                        callback();
                    }
                }
            } );
        }

        /**
         * on master, user put/removed a login card.
         * on worker,
         * capture the device login that has occurred on master,
         * find any request waiting for the device and serve it
         */
        function onCacheUpdate() {
            Y.log( 'onCacheUpdate on ' + Y.doccirrus.ipc.whoAmI() + ', ' + loginQueue.length + ' requests in queue', 'debug', NAME );
            //  respond to all requests waiting for card and filter out those that are served
            loginQueue = loginQueue.filter( function( item ) {
                if( myCache.onlineCards[item.deviceName] ) {
                    // create session for the request
                    checkAndCreateDBSession( myCache.onlineCards[item.deviceName], item );
                } else {
                    return true;
                }
            } );
        }
    
        /**
         * checks if inOut is actuve
         * @param   {Object}            args
         * @param   {String}            args.tenant
         * @param   {Function}          callback
         */
        function getInOutActivated(args, callback) {
            Y.doccirrus.api.settings.get( {
                user: Y.doccirrus.auth.getSUForTenant(args.tenant||0),
                callback: function( err, result ) {
                    if (!err && result && result[0] && result[0].inOutActivated) {
                        callback(null, result[0].inOutActivated);
                    } else {
                        callback(err || "broken config");
                    }
                }
            });
        }

        /**
         * triggered by device manager on master,
         * handle login and logout events
         * @param   {Object}            params
         * @param   {Function}          callback
         *
         */
        function onLoginDeviceData( params, callback ) {
            Y.log( 'login/logout with device on  ' + Y.doccirrus.ipc.whoAmI() + ': ' + JSON.stringify( params ), 'debug', NAME );
            getInOutActivated({tenant: params.tenant}, function(err, inOutActivated) {
                if (err || !inOutActivated) {
                    callback (err);
                    return;
                }
                
                var dbUser = Y.doccirrus.auth.getSUForTenant(params.tenant);
                
                if( !params || !params.deviceName || !params.cardKey ) {
                    Y.log("missing params in onLoginDeviceData", 'warn', NAME);
                    callback( 'missing params' );
                    return;
                }
                
                Y.doccirrus.mongodb.runDb( {
                    user: dbUser,
                    model: 'identity',
                    query: {cardKey: params.cardKey},
                    callback: function( err, result ) {
                        var
                            deviceLogin;
                        if( err || !result || !result[0] ) {
                            Y.log( 'invalid cardKey: ' + err, 'debug', NAME );
                            callback( err );
                        } else {
                            let onlineCard = myCache.onlineCards[params.deviceName];
                            let checkMatch = params.isLogin && onlineCard && params.ip === onlineCard.ip; //&& onlineCard.inUse

                            if( checkMatch && onlineCard.identityId === result[0]._id.toString() ) {
                                Y.log( 'repeated login with the same device and card results in logout', 'debug', NAME );
                                handleDeviceLogout( dbUser, onlineCard, callback );
                                delete myCache.onlineCards[params.deviceName];
                                myCache.onlineCards = myCache.onlineCards;
                                return;
                            }

                            Y.log("regular inOut login route", 'debug', NAME);
                            deviceLogin = {
                                identityId: result[0]._id,
                                username: result[0].username,
                                deviceName: params.deviceName,
                                cardKey: params.cardKey,
                                ip: params.ip
                            };
                            if( params.isLogin ) {
                                myCache.onlineCards[params.deviceName] = deviceLogin;

                                if( checkMatch && onlineCard.identityId !== result[0]._id.toString() ) {
                                    handleDeviceLogout( dbUser, onlineCard, callback );
                                    myCache.onlineCards = myCache.onlineCards;
                                } else {
                                    callback( null );
                                }
                            } else {//this never happens currently, but isLogin might change in the future
                                handleDeviceLogout( dbUser, deviceLogin, callback );
                                delete myCache.onlineCards[params.deviceName];
                            }
                            // update the cache system-wide, workers will capture this and will serve any waiting request fir the device
                            myCache.onlineCards = myCache.onlineCards;

                        }
                    }
                } );
            });
        }

        /**
         * a public route for user to use login device
         * @param   {Object}              args
         * @param   {Object}              args.httpRequest
         * @param   {Function}            args.callback
         *
         * @return {Function}             args.callback
         */
        function loginDevicePoll( args ) {
            Y.log('Entering Y.doccirrus.api.auth.loginDevicePoll', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.auth.loginDevicePoll');
            }
            Y.log( 'loginDevicePoll on: ' + Y.doccirrus.ipc.whoAmI() + '  ' + JSON.stringify( args.data ), 'debug', NAME );

            var detectedIp = Y.doccirrus.api.sdManager.getIpOfRequestArgs(args);

            var checkableIps = [detectedIp, "127.0.0.1", "::ffff:127.0.0.1"];

            function getTenant(i) {
                detectedIp = checkableIps[i];
                Y.doccirrus.ipc.sendAsync( "getSocketTenantByIPFromMaster", {ip: detectedIp}, function(err,res) {
                    if( err ) {
                        Y.log( "getTenant can't getSocketTenantByIPFromMaster. Error: " + err, 'error', NAME );
                    }
                    if (res) {
                        queueWithDevice(res);
                    } else if ( i < checkableIps.length-1 ) {
                        getTenant(i+1);
                    } else {
                        return args.callback( Y.doccirrus.errors.rest( 80000 ) );
                    }
                });
            }

            if ( Y.doccirrus.ipc.isMaster() ) {
                //sync
                let tenant;
                for (let i = 0; i < checkableIps.length; i++) {
                    detectedIp = checkableIps[i];
                    tenant = Y.doccirrus.api.sdManager.getSocketByIP(detectedIp).__DC__tenant;
                    if (tenant) { break; }
                }
                if (tenant) { queueWithDevice(tenant); }
                else { return args.callback( null, false ); }
            } else {
                //async
                getTenant(0);
            }
            
            function queueWithDevice(tenant) {
                getInOutActivated({tenant: tenant}, function(err, inOutActivated) {
                    if( err ) {
                        Y.log( "getInOutActivated error: " + err, 'error', NAME );
                    }
                    if( !inOutActivated ) {
                        args.callback( null, false );
                    } else {
                        let
                            params = args.data,
                            req = args.httpRequest,
                            tenantId = tenant,
                            callback = args.callback,
                            deviceLogin = myCache.onlineCards[detectedIp],
                            myLogin = {
                                deviceName: detectedIp,
                                checkinTime: new Date(),
                                tenantId: tenantId,
                                redirectParam: {redirectUrl: getRedirectUrl( {url: decodeURIComponent( params.url )} ) || '/'}
                            };

                        if( !detectedIp ) {
                            return callback( Y.doccirrus.errors.rest( 400, 'cannot detect IP' ) );
                        }

                        setSessionInfo( myLogin, req );

                        myLogin.callback = function devicePollCb( err, result ) {
                            //console.warn( 'myLogin.redirectParam:', myLogin.redirectParam, 'params.url: ', params.url );
                            Y.log( 'loginDevicePoll: responding to poll request: ' + JSON.stringify( result || 'terminating the poll' ), 'debug', NAME );
                            callback( err, result ? myLogin.redirectParam : 'inUse' ); // redirect to where the user was headed, or end the poll
                        };

                        if( deviceLogin ) { //card is already in place
                            checkAndCreateDBSession( deviceLogin, myLogin );
                        } else { //wait for the card
                            args.callback( null, 'no card' );
                            // Y.log( 'waiting until login device is triggered, added to queue', 'debug', NAME );
                            // loginQueue = loginQueue.filter( function( item ) { // purge any other request waiting for this device
                            //     if( item.deviceName === myLogin.deviceName && item.sessionId !== myLogin.sessionId ) {
                            //         item.callback( null, false ); // dismiss the poll request to prevent more than one browser do login on the next device login event (security)
                            //     } else {
                            //         return true;
                            //     }
                            // } );
                            // loginQueue.push( myLogin ); // queue until device login
                        }
                    }
                });                
            }
        }

        // this is just for test,
        // used to mock login device events
        function putCard( args ) {
            Y.log('Entering Y.doccirrus.api.auth.putCard', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.auth.putCard');
            }
            Y.doccirrus.ipc.sendAsync( CALL_onLoginDeviceData, args.data, function( err, data ) { // call it on master
                args.callback( err, data );
                onCacheUpdate();
            } );
        }

        /**
         * user has tried to login externally with an access code.
         * check the if the code is correct then let user in.
         * if the code is expired then delete the temporary session.
         * @param   {Object}            args
         */
        function unlockLogin( args ) {
            Y.log('Entering Y.doccirrus.api.auth.unlockLogin', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.auth.unlockLogin');
            }
            var
                MAX_ATTEMPTS = 3, // number of allowed failures
                TIMEOUT = 600000,
                callback = args.callback,
                sessionId = args.httpRequest.session && args.httpRequest.session.id,
                tenantId = args.data && args.data.tenantId,
                accessCode = args.data && args.data.accessCode,
                dbUser = Y.doccirrus.auth.getSUForTenant( tenantId );

            if( !sessionId || !accessCode || !tenantId ) {
                callback( Y.doccirrus.errors.rest( 400, 'missing params' ) );
                return;
            }

            Y.doccirrus.mongodb.runDb( {
                user: dbUser,
                model: 'auth',
                query: {sessionId: sessionId},
                callback: function( err, result ) {
                    var
                        auth = require( 'dc-core' ).auth,
                        userData;
                    if( err || !result || !result[0] ) {
                        return callback( err || Y.doccirrus.errors.rest( 400, 'session not found' ) );

                    } else if( TIMEOUT < Date.now() - Y.doccirrus.commonutils.dateFromObjectId( result[0]._id ) ) {
                        console.log(`(SocketIO_ debugging) Deleteing auth for ${sessionId} at unlockLogin using query: _id: ${result[0]._id}`); //eslint-disable-line
                        //mongooselean.remove
                        Y.doccirrus.mongodb.runDb( {
                            user: dbUser,
                            action: 'delete',
                            model: 'auth',
                            query: {
                                _id: result[0]._id
                            }
                        }, () => {
                            return callback( Y.doccirrus.errors.rest( 400, 'temporary session expired' ) );
                        } );


                    } else if( result[0].accessCode !== accessCode ) {

                        result[0].failureCounter = (result[0].failureCounter || 0) + 1;

                        if( result[0].failureCounter >= MAX_ATTEMPTS ) {
                            Y.doccirrus.api.employee.inactivateIdentity( {user: dbUser, data: {_id: result[0].identityId}, callback: function() {
                                Y.log( 'account was deactivated for user ' + result[0].U + ' after three wrong access codes: ' + err, 'debug', NAME );
                                //mongooselean.remove
                                Y.doccirrus.mongodb.runDb( {
                                    user: dbUser,
                                    action: 'delete',
                                    model: 'auth',
                                    query: {
                                        _id: result[0]._id
                                    }
                                }, () => {
                                    return callback( Y.doccirrus.errors.rest( 106, 'invalid access code (3rd time)' ) );
                                } );
                            } } );

                        } else {
                            // save the count
                            //mongooselean.save_fix
                            Y.doccirrus.mongodb.runDb( {
                                user: dbUser,
                                model: 'auth',
                                action: 'put',
                                query: {
                                    _id: result[0]._id
                                },
                                fields: Object.keys(result[0]),
                                data: Y.doccirrus.filters.cleanDbObject(result[0])
                            }, () => {
                                return callback( Y.doccirrus.errors.rest( 400, {attempts: MAX_ATTEMPTS - result[0].failureCounter} ) );
                            } );
                        }

                    } else {
                        Y.log( 'external access is granted to user ' + result[0].U, 'debug', NAME );
                        //mongooselean.toObject
                        userData = result[0];
                        userData.accessCode = null;
                        auth.addUserSession( userData ); // will also audit the login
                        callback();
                    }
                }
            } );
        }

        /**
         * send the code to the primary contact of the user (employee)
         *
         * @param {Object}              user
         * @param {String}              accessCode
         * @param {Function}            callback
         */
        function deliverAccessCode( user, accessCode, callback ) {

            callback = callback || function( err ) {
                if( err ) {
                    Y.log( 'failed to deliver access code to user ' + user.U + ': ' + JSON.stringify( err ), 'error', NAME );
                }
            };

            function sendEmailOrSms( email, mobileNo ) {
                var
                    params = {text: ''},
                    serialNumber = Y.doccirrus.auth.getSerialNumber( Y.doccirrus.auth.getGeneralExternalUrl( user ) );

                params.subject = 'Ihr Zugangscode';
                params.text += 'Zugangscode: ' + accessCode;
                if( email ) {
                    params.to = email;
                    params.user = user;
                    params.noBCC = true;
                    params.serviceName = 'prcService';
                    params = Y.doccirrus.email.createHtmlEmailMessage( params );
                    params.text += '\n -- \n\n (SN: ' + serialNumber + ')';
                    Y.doccirrus.email.sendEmail( { ...params, user }, callback );
                }

                if( mobileNo ) {
                    Y.doccirrus.communication.dispatchSMS( user, {
                        phone: mobileNo,
                        subject: '',
                        text: params.text
                    }, callback );
                }
            }

            Y.doccirrus.api.employee.getPrimaryContact( user, function( err, data ) {
                if( err ) {
                    Y.log( "getPrimaryContact error: " + err, 'error', NAME );
                }
                if( data.mobile ) {
                    Y.log( 'sending the code to employee phone', 'debug', NAME );
                    sendEmailOrSms( null, data.mobile );

                } else if( data.email ) {
                    Y.log( 'sending the code to employee email', 'debug', NAME );
                    sendEmailOrSms( data.email, null );
                } else {
                    Y.log( 'the employee has no primary contact', 'debug', NAME );
                    callback();
                }
            } );
        }

        /**
         * removes the connection of the given user from the cache
         *
         * @param   {Object}            user
         */
        function removeUser(user) {
            if (myCache.onlineCards[user.ip]) {
                delete myCache.onlineCards[user.ip];
                myCache.onlineCards = myCache.onlineCards;
            }
        }

        function testConnection(args) {
            Y.log('Entering Y.doccirrus.api.auth.testConnection', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.auth.testConnection');
            }
            return args.callback( Y.doccirrus.errors.rest( 80000 ) );
        }

        if( Y.doccirrus.ipc.isMaster() ) {
            Y.doccirrus.ipc.subscribeNamed( CALL_onLoginDeviceData, NAME, true, function( params, callback ) {
                onLoginDeviceData( params, callback );
            } );
        }

        Y.namespace( 'doccirrus.api' ).auth = {
            onLoginDeviceData: onLoginDeviceData,
            loginDevicePoll: loginDevicePoll,
            putCard: putCard,
            unlockLogin: unlockLogin,
            deliverAccessCode: deliverAccessCode,
            removeUser: removeUser,
            testConnection: testConnection
        };
    },
    '0.0.1', {requires: []}
);
