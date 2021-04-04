/**
 * User: as
 * Date: 31.01.18  10:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */ //jshint ignore:line

/* jshint ignore:start */
YUI.add( 'dscrmanager', function( Y, NAME ) {
        const
            inspect = require( 'util' ).inspect,
            DS_TIMEOUT = 15 * 1000,
            Promise = require( 'bluebird' ),
            {formatPromiseResult} = require( 'dc-core' ).utils,
            pcscDevices = require( 'dc-core' ).config.load( process.cwd() + '/pcsc-devices.json' );

        var user;

        let requests = {};

        function Request( args ) {
            // var self = this,
            //     callID = args.callID;

            this.callback = args.callback;

            // this.cancel = function() {
            //     console.log("###########");
            //     if( requests[ callID ] ) {
            //         self.callback( null, '' );
            //         delete requests[ callID ];
            //     }
            // };
            //
            // setTimeout( this.cancel, timeout );
        }

        function base64Gen( len ) {
            var
                alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
                rtn = "",
                i;

            for( i = 1; i < len; i++ ) {
                rtn += alphabet[Math.floor( Math.random() * alphabet.length )];
            }
            return rtn;
        }

        function init() {
            subscribeToIPC();
            setSocketioListeners();
        }

        function subscribeToIPC() {

            //execute program
            Y.doccirrus.ipc.subscribeNamed( "executeProgram", NAME, true, function( params, callback ) {
                var ip = params.user.ip,
                    socket = Y.doccirrus.api.sdManager.getSocketByIP( ip );

                if( !socket ) {
                    return callback( Y.doccirrus.errors.rest( 13220 ) );
                }
                socket.emit( "executeProgram", params );
            } );

            Y.doccirrus.ipc.subscribeNamed( "getOnlineCardreadersList", NAME, true, function( params, callback ) {
                sendGetOnlineCardreadersListToDeviceServer( params )
                    .then( res => {
                        callback( null, res );
                    } )
                    .catch( err => {
                        callback( err );
                    } );
            } );

            Y.doccirrus.ipc.subscribeNamed( "getSmartCardreaders", NAME, true, function( params, callback ) {
                sendGetSmartCardreadersListToDeviceServer( params )
                    .then( res => {
                        callback( null, res );
                    } )
                    .catch( err => {
                        callback( err );
                    } );
            } );

            Y.doccirrus.ipc.subscribeNamed( "deleteCard", NAME, true, function( params, callback ) {
                sendDeleteCardToDeviceServer( params )
                    .then( res => {
                        callback( null, res );
                    } )
                    .catch( err => {
                        callback( err );
                    } );
            } );

            Y.doccirrus.ipc.subscribeNamed( "readCard", NAME, true, function( params, callback ) {
                const
                    {data, user, deviceServers} = params;

                sendReadCardFromDeviceServer( {data, user, deviceServers} ).timeout( DS_TIMEOUT )
                    .then( res => {
                        callback( null, res );
                    } )
                    .catch( err => {
                        callback( err );
                    } );
            } );
        }

        function setSocketioListeners() {
            Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "mediportLog", function( /* msg */ ) {
                // console.log( 'MEDIPORT MESSAGE', msg );
            } );

            Y.doccirrus.communication.setListenerForNamespace( 'serial-to-ethernet', 'ctapi.readCardResult', function( msg ) {
                if( requests[msg.callID] && requests[msg.callID].callback ) {
                    requests[msg.callID].callback( msg );
                }
            } );

            Y.doccirrus.communication.setListenerForNamespace( 'serial-to-ethernet', 'pcsc.readCardResult', function( msg ) {
                if( requests[msg.callID] && requests[msg.callID].callback ) {
                    requests[msg.callID].callback( msg );
                }
            } );

            Y.doccirrus.communication.setListenerForNamespaceOnce( 'serial-to-ethernet', 'updateCardreaders', function( msg ) {
                user = Y.doccirrus.auth.getSUForTenant( msg.tenant );

                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'cardreaderconfiguration',
                    user: user,
                    query: {
                        ds: msg.deviceServerName
                    }
                }, ( err, result ) => {
                    if( err ) {
                        //  should never happen
                        Y.log( `Problem loading device server from database ${JSON.stringify( err )}`, 'warn', NAME );
                        return;
                    }
                    result.forEach( function( cardreader ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'cardreaderconfiguration',
                            action: 'update',
                            query: {
                                deviceId: cardreader.deviceId
                            },
                            fields: ['ds'],
                            data: {ds: msg.newDeviceServerName}
                        } );
                    } );
                } );
            } );
        }

        async function readCard( args ) {
            Y.log('Entering Y.doccirrus.api.dscrmanager.readCard', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.dscrmanager.readCard');
            }
            const {data, user, callback} = args;
            const deviceServers = await Y.doccirrus.api.sdManager.getDeviceServerNames();

            Y.log( `readCard data=${inspect( data, {depth: 3} )}`, 'debug', NAME );

            if( Y.doccirrus.ipc.isMaster() ) {
                sendReadCardFromDeviceServer( {data, user, deviceServers, callback} ).timeout( DS_TIMEOUT )
                    .then( res => {
                        handleReadCardSuccess( res, callback );
                    } )
                    .catch( err => {
                        handleReadCardFailure( err, {...data, deviceServers}, callback );
                    } );
            } else {
                Y.doccirrus.ipc.sendAsync( "readCard", {data, user, deviceServers}, function( err, res ) {
                    if( err ) {
                        handleReadCardFailure( err, {...data, deviceServers}, callback );
                    } else {
                        handleReadCardSuccess( res, callback );
                    }
                } );
            }
        }

        function sendReadCardFromDeviceServer( params ) {
            Y.log( `sendReadCardFromDeviceServer: params=${inspect( params, {depth: 3} )}`, 'debug' );

            return new Promise( ( resolve, reject ) => {
                var
                    deviceServers = params.deviceServers,
                    ipArr = deviceServers.filter( deviceServer => deviceServer.name === params.data.deviceServerName );

                Y.log( `Found device servers: ${JSON.stringify( deviceServers )}`, 'debug', NAME );

                if( ipArr.length !== 1 ) {
                    Y.log( `${params.user.ip} failed to contact a device server`, 'debug', NAME );
                    reject( {error: 'Failed to contact device server'} );
                    return;
                }

                var
                    ip = ipArr[0].ip,
                    socket = Y.doccirrus.api.sdManager.getSocketByIP( ip ),
                    callID = base64Gen( 16 );

                Y.log( `${params.user.ip} wants to read a card from ${ipArr[0].name}`, 'debug', NAME );

                var requestCallback = function( msg ) {
                    Y.doccirrus.api.crlog.server.storeCardRead( {
                        rawCardData: msg.data,
                        user: params.user,
                        deviceName: params.data.name
                    } )
                        .then( function( res ) {
                            Y.log( `${ipArr[0].name} successfully read the card and stored`, 'debug', NAME );
                            // if ( params.data.mobile ) {
                            deleteCard( {
                                data: params.data, user: params.user, ip: ip, callback: function( err ) {
                                    if( err ) {
                                        reject( err );
                                    } else {
                                        resolve( res );
                                    }
                                }
                            } );
                            // } else {
                            //     resolve( res);
                            // }
                        } )
                        .catch( function() {
                            Y.log( `Card failed to be stored`, 'debug', NAME );
                            reject( {error: 'Failed to store card'} );
                        } );
                };

                Y.doccirrus.communication.setListenerForNamespaceOnce( 'serial-to-ethernet', 'ctapi.readCardError', function( msg ) {
                    Y.log( `${ipArr[0].name} failed to read the card, ${JSON.stringify( msg )} `, 'debug', NAME );
                    reject( {error: msg.error} );
                } );

                if( socket ) {
                    Y.log( `${params.user.ip} sended readCard command to ${ipArr[0].name}`, 'debug', NAME );
                    socket.emit( "ctapi.readCard", {...params.data, callID: callID} );
                    requests[callID] = new Request( {callID: callID, callback: requestCallback}, 3000 );
                } else {
                    reject( Y.doccirrus.errors.rest( 13220 ) );
                }
            } ).timeout( DS_TIMEOUT );
        }

        async function sendReadSmartCardFromDeviceServer( params ) {
            Y.log( `sendReadSmartCardFromDeviceServer: params=${inspect( params, {depth: 3} )}`, 'debug' );

            return new Promise( ( resolve, reject ) => {
                const
                    deviceServers = params.deviceServers,
                    ipArr = deviceServers.filter( deviceServer => deviceServer.name === params.data.deviceServerName );

                Y.log( `Found device servers: ${JSON.stringify( deviceServers )}`, 'debug', NAME );

                if( ipArr.length !== 1 ) {
                    Y.log( `${params.user.ip} failed to contact a device server`, 'debug', NAME );
                    reject( {error: 'Failed to contact device server'} );
                    return;
                }

                const
                    ip = ipArr[0].ip,
                    socket = Y.doccirrus.api.sdManager.getSocketByIP( ip ),
                    callID = base64Gen( 16 );

                Y.log( `${params.user.ip} wants to read a card from ${ipArr[0].name}`, 'debug', NAME );

                async function requestCallback( msg ) {
                    const {
                        data,
                        reader
                    } = msg;

                    const
                        buff2F06 = data && data.buff2F06,
                        buff2F07 = data && data.buff2F07,
                        userData2F06 = translate2F06Buffer( buff2F06 ),
                        userData2F07 = translate2F07Buffer( buff2F07 );

                    if( !Object.entries( userData2F07 ).length ) {
                        reject( Y.doccirrus.errors.rest( 13230, {}, true ) );
                    }
                    let userData = {
                        ...userData2F06,
                        ...userData2F07
                    };

                    if( Object.keys( userData ).length > 0 ) {
                        // MOJ-11245: for new patients country mode must be set. Because swiss card parsing has different process
                        // we can just set CH here.
                        userData.countryMode = ['CH'];
                        let [err, result] = await formatPromiseResult( Y.doccirrus.api.crlog.server.storeCardReadJSON( {
                            rawCardData: userData,
                            user: params.user,
                            deviceName: reader
                        } ) );

                        if( err ) {
                            Y.log( `Error during storing crlog data: ${JSON.stringify( err )}`, 'error', NAME );
                            const crlogRejection = new Y.doccirrus.commonerrors.DCError( 110000 );
                            crlogRejection.originalError = err;
                            reject( crlogRejection );
                        }

                        if( result ) {
                            Y.log( `Received result ${result}`, 'debug', NAME );
                        }

                        resolve( {
                            ids: userData,
                            errors: []
                        } );
                    } else {
                        Y.log( `Error during reading card buffer`, 'error', NAME );
                        reject( 'Error during reading card buffer' );
                    }
                }

                Y.doccirrus.communication.setListenerForNamespaceOnce( 'serial-to-ethernet', 'pcsc.readCardError', function( msg ) {
                    Y.log( `${ipArr[0].name} failed to read the card, ${JSON.stringify( msg )} `, 'debug', NAME );
                    reject( {error: msg.error} );
                } );

                if( socket ) {
                    Y.log( `${params.user.ip} sent readCard command to ${ipArr[0].name}`, 'debug', NAME );
                    socket.emit( "pcsc.readCard", {...params.data, callID: callID} );
                    requests[callID] = new Request( {callID: callID, callback: requestCallback}, 3000 );
                } else {
                    reject( Y.doccirrus.errors.rest( 13220 ) );
                }
            } ).timeout( DS_TIMEOUT );
        }

        function handleReadCardSuccess( res, callback ) {
            Y.log( `handleReadCardSuccess: res=${inspect( res, {depth: 3} )}`, 'debug', NAME );
            callback( null, {
                ids: res,
                errors: []
            } );
        }

        function handleReadCardFailure( err, data, callback ) {
            Y.log( `handleReadCardFailure err=${JSON.stringify( err )} | err insp: ${inspect( err, {depth: 3} )}, data=${inspect( data, {depth: 3} )}"`, 'error', NAME );
            if( err.error === 'No card presented within specified time' ) {
                return callback( null, {
                    ids: [],
                    errors: [
                        {
                            message: Y.doccirrus.errors.rest( 110003 ),
                            actions: [],
                            code: 110003,
                            meta: {}
                        }
                    ]
                } );
            }
            if( err.error === 'Command Not Allowed' ) {
                return callback( null, {
                    ids: [],
                    errors: [
                        {
                            message: Y.doccirrus.errors.rest( 110002 ),
                            actions: [],
                            code: 110002,
                            meta: {
                                port: data.port,
                                driver: data.driver,
                                mobile: data.mobile,
                                name: data.name,
                                deviceServerName: data.deviceServerName,
                                deviceServers: data.deviceServers
                            }
                        }
                    ]
                } );
            }
            callback( null, {
                ids: [],
                errors: [
                    {
                        message: Y.doccirrus.errors.rest( 110001 ),
                        actions: [],
                        code: 110001,
                        meta: {
                            port: data.port,
                            driver: data.driver,
                            mobile: data.mobile,
                            name: data.name,
                            deviceServerName: data.deviceServerName,
                            deviceServers: data.deviceServers
                        }
                    }
                ]
            } );
        }

        function deleteCard( args ) {
            const
                {data, user, callback} = args;
            Y.log( `deleteCard: data=${data}`, 'debug', NAME );
            var ip, ipArr;

            if( !args.ip && data.deviceServers ) { //if deleteCard comes from frontend
                ipArr = data.deviceServers.filter( deviceServer => deviceServer.name === data.deviceServerName );
                ip = ipArr.length === 1 ? ipArr[0] : null;
            } else {
                ip = args.ip;
            }

            if( Y.doccirrus.ipc.isMaster() ) {
                sendDeleteCardToDeviceServer( {data, user, ip} )
                    .then( res => {
                        callback( null, res );
                    } )
                    .catch( err => {
                        callback( err );
                    } );
            } else {
                Y.doccirrus.ipc.sendAsync( "deleteCard", {data, user, ip}, function( err, res ) {
                    if( err ) {
                        return callback( {error: 'Failed to delete card'} );
                    }
                    callback( null, res );
                } );
            }
        }

        function sendDeleteCardToDeviceServer( args ) {
            Y.log( `sendDeleteCardToDeviceServer ${args}`, 'debug', NAME );
            return new Promise( ( resolve, reject ) => {

                var socket = Y.doccirrus.api.sdManager.getSocketByIP( args.ip );

                Y.doccirrus.communication.setListenerForNamespaceOnce( 'serial-to-ethernet', 'ctapi.deleteCardResult', function( msg ) {
                    Y.log( `sendDeleteCardToDeviceServer: success ${inspect( msg, {depth: 3} )}`, 'debug', NAME );
                    resolve( msg );
                } );

                Y.doccirrus.communication.setListenerForNamespaceOnce( 'serial-to-ethernet', 'ctapi.deleteCardError', function( msg ) {
                    Y.log( `sendDeleteCardToDeviceServer: error ${JSON.stringify( msg )}`, 'error', NAME );
                    reject( {error: 'Failed to delete card'} );
                } );

                if( socket ) {
                    socket.emit( "ctapi.deleteCard", args.data );
                } else {
                    Y.log( `sendDeleteCardToDeviceServer: no socket`, 'error', NAME );
                    reject( Y.doccirrus.errors.rest( 13220 ) );
                }
            } );
        }

        function readCardBatch( args ) {
            Y.log('Entering Y.doccirrus.api.dscrmanager.readCardBatch', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.dscrmanager.readCardBatch');
            }
            const
                {data, user, callback} = args;

            Y.log( `readCardBatch data=${inspect( data, {depth: 3} )}`, 'debug', NAME );

            var
                deviceServers = data.deviceServers;

            if( !args.batchIds ) {
                args.batchIds = [];
            }

            if( Y.doccirrus.ipc.isMaster() ) {
                sendReadCardFromDeviceServer( {data, user, deviceServers, callback} ).timeout( DS_TIMEOUT )
                    .then( ( res ) => {
                        Y.log( `readCardBatch: push ID="${res[0]}" to batchIds=${inspect( args.batchIds, {depth: 3} )} with result=${inspect( res, {depth: 3} )}`, 'debug', NAME );
                        args.batchIds.push( res[0] );
                        args.callback = function( error, result ) {
                            callback( error, result );
                        };
                        readCardBatch( args );
                    } )
                    .catch( ( err ) => {
                        handleReadCardBatchFailure( err, {...data, deviceServers, batchIds: args.batchIds}, callback );
                    } );
            } else {
                Y.doccirrus.ipc.sendAsync( "readCard", {data, user, deviceServers}, function( err, res ) {
                    if( err ) {
                        handleReadCardBatchFailure( err, {...data, deviceServers, batchIds: args.batchIds}, callback );
                    } else {
                        args.batchIds.push( res[0] );
                        args.callback = function( error, result ) {
                            callback( error, result );
                        };
                        readCardBatch( args );
                    }
                } );
            }
        }

        function handleReadCardBatchFailure( err, data, callback ) {
            Y.log( `handleReadCardBatchFailure err=${err} | ${inspect( err, {depth: 3} )}, data=${inspect( data, {depth: 3} )}`, 'error', NAME );
            if( err.error === 'No card presented within specified time' ) {
                if( data.batchIds.length > 0 ) {
                    return callback( null, {
                        ids: data.batchIds,
                        errors: []
                    } );
                }
                return callback( null, {
                    ids: data.batchIds,
                    errors: [
                        {
                            message: Y.doccirrus.errors.rest( 110003 ),
                            actions: [],
                            code: 110003,
                            meta: {}
                        }
                    ]
                } );
            }
            if( err.error === 'Command Not Allowed' ) {
                return callback( null, {
                    ids: [],
                    errors: [
                        {
                            message: Y.doccirrus.errors.rest( 110002 ),
                            actions: [],
                            code: 110002,
                            meta: {
                                port: data.port,
                                driver: data.driver,
                                mobile: data.mobile,
                                name: data.name,
                                deviceServerName: data.deviceServerName,
                                deviceServers: data.deviceServers
                            }
                        }
                    ]
                } );
            }
            callback( null, {
                ids: data.batchIds,
                errors: [
                    {
                        message: Y.doccirrus.errors.rest( 110001 ),
                        actions: [
                            {
                                name: 'tryAgainBtn110001',
                                text: 'Wiederholen'
                            },
                            {
                                name: 'skipBtn110001',
                                text: 'Überspringen'
                            }
                            // {
                            //     name: 'stopBtn110001',
                            //     text: 'Stoppen'
                            // }
                        ],
                        code: 110001,
                        meta: {
                            port: data.port,
                            driver: data.driver,
                            mobile: data.mobile,
                            name: data.name,
                            deviceServerName: data.deviceServerName,
                            deviceServers: data.deviceServers
                        }
                    }
                ]
            } );
        }

        /**
         * @method PUBLIC
         *
         * This method is ONLY called from UI via websocket and only lands in master cluster.
         *
         * @param args
         */
        function listPlatformDrivers( args ) {
            Y.log('Entering Y.doccirrus.api.dscrmanager.listPlatformDrivers', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.dscrmanager.listPlatformDrivers');
            }
            const
                {data, user, callback} = args;

            sendListPlatformDriversToDeviceServer( {data, user} )
                .then( res => {
                    Y.log( `${user.ip} successfully returns from contactDeviceServer: ${inspect( res, {depth: 3} )}`, 'debug', NAME );
                    callback( null, res );
                } )
                .catch( err => {
                    Y.log( `${user.ip} received error ${err} | ${inspect( err, {depth: 3} )} in contactDeviceServer`, 'error', NAME );
                    callback( err );
                } );
        }

        function sendListPlatformDriversToDeviceServer( args ) {
            return new Promise( ( resolve, reject ) => {
                var ip = args.user.ip,
                    socket = Y.doccirrus.api.sdManager.getSocketByIP( ip );

                Y.doccirrus.communication.setListenerForNamespace( 'serial-to-ethernet', 'ctapi.listPlatformDriversResult', function( msg ) {
                    resolve( msg );
                } );

                if( socket ) {
                    socket.emit( "ctapi.listPlatformDrivers", args );
                } else {
                    reject( Y.doccirrus.errors.rest( 13220 ) );
                }
            } );
        }

        /**
         * @method PUBLIC
         *
         * This method is ONLY called from UI via websocket and only lands in master cluster.
         *
         * @param args
         */
        function scanPorts( args ) {
            Y.log('Entering Y.doccirrus.api.dscrmanager.scanPorts', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.dscrmanager.scanPorts');
            }
            const
                {data, user, callback} = args;

            sendScanPortsToDeviceServer( {data, user} ).timeout( DS_TIMEOUT )
                .then( res => {
                    callback( null, res );
                } )
                .catch( err => {
                    callback( err );
                } );
        }

        function sendScanPortsToDeviceServer( args ) {
            return new Promise( ( resolve, reject ) => {

                var ip = args.user.ip,
                    socket = Y.doccirrus.api.sdManager.getSocketByIP( ip );

                Y.doccirrus.communication.setListenerForNamespace( 'serial-to-ethernet', 'ctapi.portTestResult', function( msg ) {
                    resolve( msg );
                } );

                Y.doccirrus.communication.setListenerForNamespace( 'serial-to-ethernet', 'ctapi.portTestError', function( err ) {
                    reject( err );
                } );

                if( socket ) {
                    socket.emit( "ctapi.portTest", args );
                } else {
                    reject( Y.doccirrus.errors.rest( 13220 ) );
                }
            } );
        }

        /**
         * @method PUBLIC
         *
         * This method is ONLY called from UI via websocket and only lands in master cluster.
         * @param args
         */
        function testPortAvailability( args ) {
            Y.log('Entering Y.doccirrus.api.dscrmanager.testPortAvailability', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.dscrmanager.testPortAvailability');
            }
            const
                {data, user, callback} = args;

            Y.log( `testPortAvailability: emit data=${data}`, 'debug', NAME );

            sendTestPortAvailabilityToDeviceServer( {data, user} )
                .then( res => {
                    Y.log( `testPortAvailability: ${user.ip} successfully returns from contactDeviceServer ${inspect( res, {depth: 3} )}`, 'debug', NAME );
                    callback( null, res );
                } )
                .catch( err => {
                    Y.log( `testPortAvailability: ${user.ip} received error ${err} | ${inspect( err, {depth: 3} )} in contactDeviceServer`, 'error', NAME );
                    callback( err );
                } );
        }

        function sendTestPortAvailabilityToDeviceServer( args ) {
            return new Promise( ( resolve, reject ) => {
                var ip = args.user.ip,
                    socket = Y.doccirrus.api.sdManager.getSocketByIP( ip );

                Y.doccirrus.communication.setListenerForNamespace( 'serial-to-ethernet', 'ctapi.isPortAvailableResult', function( msg ) {
                    Y.log( `sendTestPortAvailabilityToDeviceServer: ctapi.isPortAvailableResult: result=${inspect( msg, {depth: 3} )}`, 'debug', NAME );
                    resolve( msg );
                } );

                Y.doccirrus.communication.setListenerForNamespace( 'serial-to-ethernet', 'ctapi.isPortAvailableError', function( err ) {
                    Y.log( `sendTestPortAvailabilityToDeviceServer: ctapi.isPortAvailableError: err=${err} | ${inspect( err, {depth: 3} )}`, 'error', NAME );
                    reject( err );
                } );

                if( socket ) {
                    socket.emit( "ctapi.isPortAvailable", args );
                } else {
                    Y.log( `sendTestPortAvailabilityToDeviceServer: no socket`, 'error', NAME );
                    reject( Y.doccirrus.errors.rest( 13220 ) );
                }
            } ).timeout( DS_TIMEOUT );
        }

        async function getSmartCardReaderList( args ) {
            Y.log( 'Entering Y.doccirrus.api.dscrmanager.getSmartCardReaderList', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.dscrmanager.getSmartCardReaderList' );
            }

            const {data, user, callback} = args;

            if( Y.doccirrus.ipc.isMaster() ) {
                sendGetSmartCardreadersListToDeviceServer( {data, user} )
                    .then( res => {
                        callback( null, res );
                    } )
                    .catch( err => {
                        callback( err );
                    } );
            } else {
                Y.doccirrus.ipc.sendAsync( 'getSmartCardreaders', {data, user}, function( err, msg ) {
                    if( err ) {
                        Y.log( `${user.ip} received error ${err} | ${inspect( err, {depth: 3} )}`, 'error', NAME );
                        return callback( err );
                    }
                    Y.log( `${user.ip} successfully received results`, 'debug', NAME );
                    callback( null, msg );
                } );
            }
        }

        async function sendGetSmartCardreadersListToDeviceServer( args ) {
            let err,
                result;

            let deviceServers = args.data.deviceServers;
            let cardReaders = [];

            Y.log( `sendGetSmartCardreadersListToDeviceServer: found device servers ${JSON.stringify( deviceServers )} in getOnlineCardreadersList`, 'debug', NAME );

            function getSmartCardDevice( socket, deviceServerName ) {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.communication.setListenerForSocket( {
                        socket,
                        event: 'pcsc.onlineCardreadersList',
                        once: true,
                        callback: ( msg ) => {
                            if( pcscDevices && pcscDevices.CardReader && Array.isArray( pcscDevices.CardReader ) ) {
                                Y.log( `Found configured pcsc-devices ${JSON.stringify( pcscDevices.CardReader )}`, 'debug', NAME );
                                let cardReaders = msg.readers && msg.readers.length && msg.readers.filter( r => r && ((r.pcscReader && pcscDevices.CardReader.some( device => r.pcscReader.startsWith( device ) )) || r.port === 'file') ) || [];
                                Y.log( `Found attached card reader ${JSON.stringify( cardReaders )}`, 'debug', NAME );
                                if( cardReaders.length > 0 ) {
                                    resolve( cardReaders );
                                } else {
                                    let warnMsg = 'Reader for smart cards is not attached to the system';
                                    reject( {msg: warnMsg, type: 'warn'} );
                                }
                            } else {
                                let errMsg = 'pcsc-devices.json should contain CardReader configuration with device name';
                                reject( {msg: errMsg, type: 'error'} );
                            }
                        }
                    } );

                    if( socket ) {
                        let cardreadersToCheck = args.data.registeredCardreaders.filter( cardreader => cardreader.ds === deviceServerName );
                        if( !cardreadersToCheck || (Array.isArray( cardreadersToCheck ) && !cardreadersToCheck.length) ) {
                            return resolve( {
                                "onlineCardreadersList": [],
                                "user": {
                                    "id": "su",
                                    "U": "DeviceServer",
                                    "P": " ",
                                    "firstname": "",
                                    "lastname": "Automatischer Prozess",
                                    "tenantId": "0",
                                    "identityId": "000",
                                    "superuser": true,
                                    "groups": [{"group": "ADMIN"}],
                                    "roles": []
                                }
                            } );
                        }
                        const toSend = {
                            data: {registeredCardreaders: cardreadersToCheck}
                        };
                        socket.emit( "pcsc.getOnlineCardreadersList", toSend );
                    } else {
                        Y.log( `getDeviceServerCardreaders: Device server with name ${deviceServerName} cannot be reached for card listing`, 'error', NAME );
                        reject( [Y.doccirrus.errors.rest( 13220 )] );
                    }
                } );
            }

            for( let i = 0; i < deviceServers.length; i++ ) {
                if( deviceServers[i].version >= '1.1.2' ) {
                    let
                        ip = deviceServers[i].ip,
                        deviceServerName = deviceServers[i].name,
                        socket = Y.doccirrus.api.sdManager.getSocketByIP( ip );

                    [err, result] = await formatPromiseResult(
                        getSmartCardDevice( socket, deviceServerName ).timeout( DS_TIMEOUT )
                    );

                    if( err ) {
                        Y.log( `Issue while tried to get smart card reader from IP: ${ip}, device server: ${deviceServerName}, error: ${err.msg || err}`, err.type || 'error', NAME );
                    }

                    if( result ) {
                        Y.log( `sendGetSmartCardreadersListToDeviceServer: result= ${inspect( result, {depth: 3} )}`, 'debug', NAME );
                        cardReaders = cardReaders.concat( result );
                    }
                }
            }

            return cardReaders;
        }

        async function getOnlineCardreadersList( args ) {
            Y.log('Entering Y.doccirrus.api.dscrmanager.getOnlineCardreadersList', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.dscrmanager.getOnlineCardreadersList');
            }
            const
                {data, user, callback} = args;

            if( Y.doccirrus.ipc.isMaster() ) {
                sendGetOnlineCardreadersListToDeviceServer( {data, user} )
                    .then( res => {
                        callback( null, res );
                    } )
                    .catch( err => {
                        callback( err );
                    } );
            } else {
                Y.doccirrus.ipc.sendAsync( 'getOnlineCardreadersList', {data, user}, function( err, msg ) {
                    if( err ) {
                        Y.log( `${user.ip} received error ${err} | ${inspect( err, {depth: 3} )} in contactDeviceServer`, 'error', NAME );
                        return callback( err );
                    }
                    Y.log( `${user.ip} successfully returns from contactDeviceServer`, 'debug', NAME );
                    callback( null, msg );
                } );
            }
        }

        async function sendGetOnlineCardreadersListToDeviceServer( args ) {
            let
                err,
                result;

            let
                deviceServers = args.data.deviceServers,
                onlineCardreaders = [];

            Y.log( `sendGetOnlineCardreadersListToDeviceServer: found device servers ${JSON.stringify( deviceServers )} in getOnlineCardreadersList`, 'debug', NAME );

            function getDeviceServerCardreaders( socket, deviceServerName ) {
                Y.log( `getDeviceServerCardreaders: deviceServerName=${deviceServerName}`, 'debug', NAME );
                return new Promise( ( resolve, reject ) => {

                    let cardreadersToCheck;

                    if( socket ) {
                        cardreadersToCheck = args.data.registeredCardreaders.filter( cardreader => cardreader.ds === deviceServerName );
                        if( !cardreadersToCheck || ( Array.isArray( cardreadersToCheck ) && !cardreadersToCheck.length ) ) {
                            return resolve({"onlineCardreadersList":[],"user":{"id":"su","U":"DeviceServer","P":" ","firstname":"","lastname":"Automatischer Prozess","tenantId":"0","identityId":"000","superuser":true,"groups":[{"group":"ADMIN"}],"roles":[]}} );
                        }
                        const toSend = {
                            data: {registeredCardreaders: cardreadersToCheck}
                        };
                        Y.doccirrus.communication.setListenerForSocket( {
                            socket,
                            event: 'onlineCardreadersList',
                            once: true,
                            callback: function( msg ) {
                                Y.log( `Device server with name ${deviceServerName} returns online cardreaders ${JSON.stringify( msg )}`, 'debug', NAME );

                                resolve( msg );
                            }
                        } );
                        Y.log( `getDeviceServerCardreaders: Telling ${deviceServerName} to check if the following cardreaders are online: ${JSON.stringify( toSend.data.registeredCardreaders )}`, 'debug', NAME );
                        socket.emit( "getOnlineCardreadersList", toSend );
                    } else {
                        Y.log( `getDeviceServerCardreaders: Device server with name ${deviceServerName} cannot be reached for card listing`, 'error', NAME );
                        reject( [Y.doccirrus.errors.rest( 13220 )] );
                    }
                } );
            }
            for( let i = 0; i < deviceServers.length; i++ ) {
                if( deviceServers[i].version >= '1.1.2' ) {
                    let ip = deviceServers[i].ip;
                    let deviceServerName = deviceServers[i].name;
                    let socket = Y.doccirrus.api.sdManager.getSocketByIP( ip );

                    [err, result] = await formatPromiseResult(
                        getDeviceServerCardreaders( socket, deviceServerName ).timeout( DS_TIMEOUT )
                    );
                    if( err ) {
                        // MOJ-
                        Y.log( `sendGetOnlineCardreadersListToDeviceServer: Device server with ip ${ip} was not reached with error: ${err} | ${inspect( err, {depth: 3} )}`, 'error', NAME );
                    }

                    if( result ) {
                        Y.log( `sendGetOnlineCardreadersListToDeviceServer: result= ${inspect( result, {depth: 3} )}`, 'debug', NAME );
                        onlineCardreaders = onlineCardreaders.concat( result.onlineCardreadersList );
                    }
                }

            }

            return onlineCardreaders;
        }

        function translate2F06Buffer( buf ) {
            const sex = {
                1: "MALE",
                2: "FEMALE",
                0: "UNKNOWN",
                9: "UNDEFINED"
            };
            let translated;
            const userData = {},
                pointerArray = [0x80, 0x82, 0x83, 0x84],
                keys = ['cardName', 'dob', 'cardholderIdentifier', 'cardSex'];

            if( buf[0] === 0x65 && buf[2] === 0x80 ) {
                translated = translateBuffer(buf, pointerArray, keys);

                let date = Y.doccirrus.cardreader.parsers.utils.getKbvDob( translated.dob );
                let kbvDate = new Y.doccirrus.KBVDateValidator( date );

                userData.kbvDob = date;
                userData.dob = kbvDate.getISOString();
                userData.lastname = translated.cardName.split(',')[0];
                userData.firstname = translated.cardName.split(',')[1].trim();
                userData.gender = sex[translated.cardSex];
                userData.socialSecurityNo = translated.cardholderIdentifier;
            } else {
                Y.log( `Was not able to parse 2F06 buffer`, 'error', NAME );
            }
            return userData;
        }

        function translate2F07Buffer( buf ) {
            const pointerArray = [0x90, 0x91, 0x92, 0x93, 0x94],
                keys = ['stateID', 'insurerName', 'insurerID', 'vekaCardNo', 'expiryDate'];
            let userData = {};
            if( buf[0] === 0x65 && buf[2] === 0x90 ) {
                userData = translateBuffer( buf, pointerArray, keys);

                let date = Y.doccirrus.cardreader.parsers.utils.getKbvDob( userData.expiryDate );
                let kbvDate = new Y.doccirrus.KBVDateValidator( date );
                userData.expiryDate = kbvDate;
            } else {
                Y.log( `Was not able to parse 2F07 buffer`, 'error', NAME );
            }
            return userData;
        }

        function translateBuffer(buf, pointerArray, keys) {
            let result = {}, buffer = buf;
            pointerArray.forEach((pointer, index) => {
                let pointIndex = buffer.indexOf(pointer);
                let key = keys[index];
                let length = buffer[pointIndex + 1];
                if( isNumericKey( key ) ) {
                    result[key] = buffer.slice(pointIndex + 2, pointIndex + 2 + length)[0]; // gives us a byte, which is a Number
                } else {
                    result[key] = buffer.slice(pointIndex + 2, pointIndex + 2 + length).toString();
                }
                buffer = buffer.slice(pointIndex + 2 + length, buffer.length);
            });
            return result;
        }

        function isNumericKey( key ) {
            return Boolean( -1!==[ 'cardSex' ].indexOf(key) );
        }

        async function readSmartCard( args ) {
            Y.log( 'Entering Y.doccirrus.api.dscrmanager.readSmartCard', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.dscrmanager.readSmartCard' );
            }

            const {
                data,
                user,
                callback
            } = args;

            const deviceServers = await Y.doccirrus.api.sdManager.getDeviceServerNames();

            Y.log( `readSmartCard data=${inspect( data, {depth: 3} )}`, 'debug', NAME );

            if( Y.doccirrus.ipc.isMaster() ) {
                const [err, res] = await formatPromiseResult(
                    sendReadSmartCardFromDeviceServer( {data, user, deviceServers, callback} )
                );

                if( err ) {
                    Y.log( `Error during storing crlog data: ${JSON.stringify( err )}`, 'error', NAME );
                    return callback( null, {
                        ids: [],
                        errors: [
                            {
                                message: Y.doccirrus.errors.rest( 110000 ),
                                actions: [],
                                code: 110000,
                                meta: {
                                    port: data.port,
                                    driver: data.driver,
                                    mobile: data.mobile,
                                    name: data.name,
                                    deviceServerName: data.deviceServerName,
                                    deviceServers: data.deviceServers
                                }
                            }
                        ]
                    } );
                }
                if( res ) {
                    handleReadCardSuccess( res, callback );
                }
            } else {
                Y.doccirrus.ipc.sendAsync( "readSmartCard", {data, user, deviceServers}, function( err, res ) {
                    if( err ) {
                        Y.log( `Error during storing crlog data: ${JSON.stringify( err )}`, 'error', NAME );
                        return callback( null, {
                            ids: [],
                            errors: [
                                {
                                    message: Y.doccirrus.errors.rest( 110000 ),
                                    actions: [],
                                    code: 110000,
                                    meta: {
                                        port: data.port,
                                        driver: data.driver,
                                        mobile: data.mobile,
                                        name: data.name,
                                        deviceServerName: data.deviceServerName,
                                        deviceServers: data.deviceServers
                                    }
                                }
                            ]
                        } );
                    } else {
                        handleReadCardSuccess( res, callback );
                    }
                } );
            }
        }

        Y.namespace( 'doccirrus.api' ).dscrmanager = {
            /**
             * @property name
             * @type {String}
             * @default dscrmanager
             * @protected
             */
            name: NAME,
            init: init,
            readCard: readCard,
            readSmartCard: readSmartCard,
            readCardBatch: readCardBatch,
            listPlatformDrivers: listPlatformDrivers,
            scanPorts: scanPorts,
            testPortAvailability: testPortAvailability,
            getOnlineCardreadersList: getOnlineCardreadersList,
            getSmartCardReaderList: getSmartCardReaderList
        };
    },
    '0.0.1', {
        requires: [
            'cardreaderconfiguration'
        ]
    }
);
/* jshint ignore:end */