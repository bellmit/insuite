/*
 @author: jm
 @date: 2014-10-13
 */

/**
 * Library for management of data transfer between attached serial devices and client websites/Datensafe.
 */

/*global YUI */



YUI.add( 'dcsdmanager', function( Y, NAME ) {

    const
        util = require( 'util' ),
        fs = require( 'fs' ),
        path = require( 'path' ),
        pcscDevices = require( 'dc-core' ).config.load( `${process.cwd()}/pcsc-devices.json` ),
        {formatPromiseResult} = require( 'dc-core' ).utils,
        readFileProm = util.promisify( fs.readFile ),
        semver = require( 'semver' );

    var server = null;

        /**
         * @module DCSDManager
         */


        let net = require( 'net' );
        let EventEmitter = require('events');

        //ignore the following devices, e.g. mac bluetooth adapters/etc.
        let blacklist = [ "/dev/cu.Bluetooth-Incoming-Port", "/dev/cu.Bluetooth-Modem" ];

        let s2eClients = {};
        let requests = {};
        let devices = {};
        let proxyConnections = {};

        let updateQueue = [];
        
        let serialEvents = new EventEmitter();

        var deviceServerName, //eslint-disable-line no-unused-vars
            deviceServerVersion, //eslint-disable-line no-unused-vars
            devicesInspector;

        const
            SERIALLOG = NAME+"_serial",
            SENDSERIALDATA = "SENDSERIALDATA",
            GET_S2ECLIENTS = 'GET_S2ECLIENTS',
            GET_DS_NAME_LIST = 'GET_DS_NAME_LIST',
            EXECUTE_S2E_CLIENT = 'EXECUTE_S2E_CLIENT',
            WRITE_FILE_S2E_CLIENT = 'WRITE_FILE_S2E_CLIENT',
            READ_FILE_S2E_CLIENT = 'READ_FILE_S2E_CLIENT',
            READ_DIR_S2E_CLIENT = 'READ_DIR_S2E_CLIENT',
            UNLINK_S2E_CLIENT = 'UNLINK_S2E_CLIENT',
            DUMMY = "Dummy/Lokal";

        let updateMigrations = {
            "0.9.3": socket => {
                socket.emit( "unlinkFile", { callID: "migrate_0.9.3_1", path: "./node_modules/engine.io-client/node_modules/engine.io-parser/package.json" } );
                socket.emit( "unlinkFile", { callID: "migrate_0.9.3_2", path: "./node_modules/engine.io-client/node_modules/engine.io-parser/index.js" } );
            }
        };
    
        let lowestKnownVersion = "0.9.3";

        /* requests structure:
         {
         -unique ID-: {
         "callback"  : function callback() {}, //stored here since we can't send it anywhere
         "SDSAmount" : -#S2EServee,  //counts upwards per response to see when all available devices have answered - prevents waiting forever for a disconnected device.
         "deviceList"   : -devList-               //parsed per server
         },
         ...
         }
         */



        function Request( args, timeout ) {
            var self = this,
                callID = args.callID || args.originalParams.callID;

            this.callback = args.callback;

            this.cancel = function() {
                if( requests[ callID ] ) {
                    Y.log( "S2E Manager request timed out for call " + callID, "warn" );
                    self.callback( null, self.devList );
                    delete requests[ callID ];
                }
            };

            setTimeout( this.cancel, timeout );
        }

        function close( callback ) {
            if( server ) {
                return server.close( callback );
            }
            return callback();
        }

        /**
         * configuring listeners once the system is actually ready to receive them.
         * this should be done immediately to prevent any reconnecting devices from slipping through before the
         * listeners are set up
         * @method init
         */
        function init() {
            // if( Y.doccirrus.auth.isPRC() ) {
            //         server = net.createServer( function( socket ) {
            //         socket.miniDS = "1";
            //         socket.on( "data", data => {
            //             s2eClients[ "miniDS:" + data ] = socket;
            //             updateNameList();
            //             Y.log( "miniDS " + data + " (" + socket.remoteAddress + ") cconnected." );
            //             socket.on( "close", () => {
            //                 delete s2eClients[ "miniDS:" + data ];
            //                 updateNameList();
            //                 Y.log( "miniDS " + data + " (" + socket.remoteAddress + ") discconnected." );
            //             } );
            //         } );
            //         socket.on( "error", err => {
            //             Y.log( "miniDS error:", 'warn', NAME );
            //             Y.log( err, 'warn', NAME );
            //         } );
            //     } );
            //
            //     server.listen( 15151 );
            // }

            Y.log( "registering cardreader listeners..." );
            //hello listener for initial handshake



            //Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "hello", function( msg ) {
            // }


            Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "deviceList", function( msg ) {
                //filter blacklisted devices out
                filterDefaultDevices( msg );
                devices[ msg.meta.myName ] = msg.data;

                if( requests[ msg.callID ] ) {
                    requests[ msg.callID ].SDSAmount++;
                    for( var i = 0; i < msg.data.length; i++ ) { //eslint-disable-line no-inner-declarations
                        requests[ msg.callID ].deviceList.push( { name: msg.meta.myName, device: msg.data[ i ].comName } );
                    }
                    if( requests[ msg.callID ].SDSAmount >= Object.keys( s2eClients ).length ) {
                        requests[ msg.callID ].callback( requests[ msg.callID ].deviceList );
                        delete requests[ msg.callID ];
                    }
                }
                else if( !msg.callID || msg.callID === 'serverDevListReq' ) {
                    checkDBforDevices( msg );
                }

                if ( devicesInspector && devicesInspector.identityId ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: devicesInspector.identityId,
                        event: 'inspectDevicesChange',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                        msg: {
                            data: {}
                        }
                    } );
                }

                cleanupDevices( { tenant: msg.meta.tenant, client: msg.meta.myName, deviceList: msg.data } );
            } );
            //listeners that CAN be implemented, but are currently unused
            //Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "serialErrror", function( msg ) {} );
            //Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "openedDevice", function( msg ) {} );
            //Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "deviceClosed", function( msg ) {} );
            //Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "sentSerialData", function( msg ) {} );

            //receiving data
            Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "gotSerialData", function( msg ) {
                var path = msg.meta.myName + ":" + msg.device;
                dbg( path );
                sdbg( "got data from"+path );
                delete msg.user;
                serialEvents.emit( path, msg );
            } );
            Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "pcscReaderData", function( msg ) {
                if( requests[ msg.meta.callID ] ) {
                    requests[ msg.meta.callID ].callback( null, msg.readerData );
                }
            } );
            setTimeout( () => {
                Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "pcscNewCard", function( msg ) {
                    if ( pcscDevices && pcscDevices.NFC
                         && Array.isArray( pcscDevices.NFC ) && pcscDevices.NFC.some( device => msg.data.reader.startsWith( device ) ) ) {

                        const detectedIp = getIpOfSocketConnection( this );
                        Y.doccirrus.api.auth.putCard( {
                            data: {
                                isLogin: true,
                                deviceName: detectedIp,
                                cardKey: msg.data.uid,
                                ip: detectedIp,
                                tenant: msg.meta.tenant
                            },
                            callback: function() {
                            }
                        } );
                    }
                } );
            }, 1000 );

            Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "tcpProxyData", function( msg ) {
                let { sessionId } = msg;
                let self = this;
                switch(msg.type) {
                    case "open":
                        proxyConnections[sessionId] = new net.Socket();
                        proxyConnections[sessionId].connect( msg.port, "127.0.0.1", () => {} );
                        proxyConnections[sessionId].on("data", data => {
                            self.emit( "tcpProxyData", { sessionId, type: "data", data } );
                        });
                        proxyConnections[sessionId].on("close", () => {
                            self.emit( "tcpProxyData", { sessionId, type: "close" } );
                            delete proxyConnections[sessionId];
                        });
                        proxyConnections[sessionId].on("error", err => {
                            Y.log("TCP PROXY CLIENT ERR : "+err, 'warn', NAME);
                            self.emit( "tcpProxyData", { sessionId, type: "close" } );
                            delete proxyConnections[sessionId];
                        });
                        break;
                    case "data":
                        if (proxyConnections[sessionId]) {
                            proxyConnections[sessionId].write(msg.data);
                        }
                        break;
                    default:
                        if (proxyConnections[sessionId]) {
                            proxyConnections[sessionId].destroy();
                            delete proxyConnections[sessionId];
                        }
                }
            } );

            
            /**
             * Helper.
             * @param {Object} params
             * @param {Object} params.user
             * @param {String} params.message
             */
            function sendIPPErrorMessage( params ) {
                let
                    { user, message } = params;
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'message',
                    messageId: 'IPPErrorMessage',
                    msg: {
                        data: message
                    }
                } );
            }

            /**
             * Helper.
             * @param {Object} params
             * @param {String} params.ipAddress
             * @param {String} params.message
             */
            function findUserAndSendMessage( params ) {
                let
                    { ipAddress, message } = params;
                Y.doccirrus.communication.getConnectedSockets( {}, ( err, socketList ) => {
                    let
                        user = null;
                    if( err ) {
                        Y.log( `IPP error. Can not get connected socket list. error: ${JSON.stringify( err )}`, 'error', NAME );
                        return;
                    }
                    socketList.some( connectedSocket => {
                        let
                            ip = Y.doccirrus.communication.getIpOfSocketConnection( connectedSocket );
                        if( ipAddress === ip && connectedSocket.user ) {
                            user = connectedSocket.user;
                            return true;
                        }
                        return false;
                    } );
                    if( user ) {
                        sendIPPErrorMessage( {
                            user,
                            message
                        } );
                    } else {
                        Y.log( `IPP error. User for with ip "${ipAddress}" not found.`, 'error', NAME );
                    }
                } );
            }

            /**
             * @param {Object} msg
             *
             * msg have structure as below:
             * {
             *     data: {
             *         id: <Number, ex. 3>,
             *         name: <String, Page title>,
             *         ps: <Buffer>,
             *         uri: <String, ex: ipp://<computer-name>.local:15157/3>,
             *         userName: <String, firstname.lastname based on computer name>,
             *         attributes: [
             *             {
             *                 tag: <Number, ex. 12>,
             *                 name: <String, ex: 'job-id', 'job-uri', 'job-state' etc.>,
             *                 value: <String | Number, ex: ipp://<computer user name>.local:15157/3 or 3686>
             *             },
             *             ...
             *         ]
             *     },
             *     meta: {
             *         callID: <String, ex: "RN_BA9ACi9CZWkO">,
             *         myName: <String, ex: "Device server name">,
             *         serverName: <String, ex: "device_server_name@Acomputer-name">,
             *         tenant: <String, ex: '0'>,
             *         time: <String, ex: "2018-11-19T13:41:09.994Z">,
             *         version: <String, ex: "2.0.7" -> this is device server version>
             *     },
             *     user: {
             *         P: " ",
             *         U: "DeviceServer",
             *         firstname: "",
             *         groups: [
             *             {
             *                 group: "ADMIN"
             *             }
             *         ],
             *         id: "su",
             *         identityId: "000",
             *         lastname: "Automatischer Prozess",
             *         roles: [],
             *         superuser: true,
             *         tenantId: "0"
             *     }
             * }
             */
            Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "ippJob", async function( msg = {} ) {
                const
                    {data = {}, meta = {}, user: deviceServerSuperUser} = msg,
                    {name: fileTitle, ps: fileBuffer} = data,
                    {myName: deviceServerName, version: deviceServerVersion, tenant, time} = meta,
                    ps2pdfProm = util.promisify(ps2pdf),
                    importMediaFromFileProm = util.promisify(Y.doccirrus.media.importMediaFromFile),
                    ipAddress = Y.doccirrus.communication.getIpOfSocketConnection( this ),
                    openedActivities = Y.doccirrus.socketUtils.getActiveExtDocumentActivityIdByIP( ipAddress ),
                    localSuperUser = Y.doccirrus.auth.getSUForLocal(),
                    IPP_SOURCE_NAME = Y.doccirrus.i18n( 'DeviceMojit.ippPrinter.sourceName' );


                let
                    err,
                    result,
                    mediaObj,
                    user,
                    isNew,
                    socket,
                    activityId,
                    pdfFileBuffer,
                    pdfPath,
                    pdfFileName;

                Y.log(`ippJob-incoming: Incoming message received from deviceServer: '${deviceServerName} (version -> ${deviceServerVersion})' with fileTitle = '${fileTitle}', tenant = '${tenant}' and time = '${time}'`, "info", NAME);


                // -------------------------------------------- 1. Validations ---------------------------------------------------------------
                if( !fileBuffer ) {
                    Y.log(`ippJob-incoming: Incoming message does not have 'msg.data.ps' file buffer. Stopping...`, "warn", NAME);
                    return findUserAndSendMessage( { ipAddress, message: Y.doccirrus.errorTable.getMessage( {code: 'deviceMojit_01'} ) } );
                }
                // --------------------------------------------------- 1. END ----------------------------------------------------------------


                // -------------------- 2. Write incoming file to 'PDF' inside in-suite temp directory -------------------------------------
                [err, {pdfPath} = {}] = await formatPromiseResult( ps2pdfProm(fileBuffer) );

                if( err ) {
                    Y.log(`ippJob-incoming: Error while converting file from 'ps' to 'pdf'. Error: ${err.stack || err}`, "error", NAME);
                    return findUserAndSendMessage( { ipAddress, message: Y.doccirrus.errorTable.getMessage( {code: 'deviceMojit_02'} ) } );
                }

                pdfFileName = path.win32.basename(pdfPath).trim();
                // ----------------------------------------- 2. END -----------------------------------------------------------------------


                // -------------------- 3. Read the contents of file at 'pdfPath' in 'pdfFileBuffer' as buffer -------------------------------
                [err, pdfFileBuffer] = await formatPromiseResult( readFileProm(pdfPath) );

                if( err ) {
                    Y.log(`ippJob-incoming: Error while reading uploaded file at path: '${pdfPath}'. Error: ${err.stack || err}`, "error", NAME);
                    return findUserAndSendMessage( { ipAddress, message: Y.doccirrus.errorTable.getMessage( {code: 'deviceMojit_03'} ) } );
                }
                // --------------------------------------------- 3. END -------------------------------------------------------------------


                // ------- 4. If no activity is opened in the browser then create an 'unassigned' media book entry and notify user the same ------
                if( !openedActivities || !openedActivities.length ) {
                    Y.log( `ippJob-incoming: no activity opened on the browser. Writing input file in media book with status = 'UNPROCESSED'`, 'warn', NAME );

                    [err, result] = await formatPromiseResult(
                                            Y.doccirrus.api.devicelog.matchPatientAndCreateAttachment({
                                                user: deviceServerSuperUser || localSuperUser,
                                                caption: `ippJob (${fileTitle || ""})`,
                                                deviceId: IPP_SOURCE_NAME,
                                                file: {
                                                    data: pdfFileBuffer,
                                                    path: pdfPath
                                                },
                                                documentDetails: {
                                                    fileSource: "From IPP"
                                                }
                                            })
                                          );

                    if( err ) {
                        Y.log(`ippJob-incoming: Error creating unclaimed media book entry for media file: ${pdfPath} for no activity opened on UI scenario. Error: ${err.stack || err}`, "error", NAME);
                        return findUserAndSendMessage( { ipAddress, message: Y.doccirrus.errorTable.getMessage( {code: 'deviceMojit_04'} ) } );
                    }

                    return findUserAndSendMessage( { ipAddress, message: Y.doccirrus.errorTable.getMessage( {code: 'deviceMojit_05'} ) } );
                }
                // -------------------------------------------- 4. END ---------------------------------------------------------------------------


                // ------- 5. If more than one activity tabs are open then create a 'unassigned' media book entry and notify the user the same ---
                if( openedActivities.length > 1 ) {
                    Y.log( `ippJob-incoming: More than 1 activity is opened with ext. document active tab. Writing input file in media book with status = 'UNPROCESSED'`, 'warn', NAME );

                    [err, result] = await formatPromiseResult(
                                            Y.doccirrus.api.devicelog.matchPatientAndCreateAttachment({
                                                user: deviceServerSuperUser || localSuperUser,
                                                caption: `ippJob (${fileTitle || ""})`,
                                                deviceId: IPP_SOURCE_NAME,
                                                file: {
                                                    data: pdfFileBuffer,
                                                    path: pdfPath
                                                },
                                                documentDetails: {
                                                    fileSource: "From IPP"
                                                }
                                            })
                                          );

                    if( err ) {
                        Y.log(`ippJob-incoming: Error creating unclaimed media book entry for media file: ${pdfPath} for more than one activity opened on UI scenario. Error: ${err.stack || err}`, "error", NAME);
                        return sendIPPErrorMessage( {
                                  user: openedActivities[ 0 ].user,
                                  message: Y.doccirrus.errorTable.getMessage( {code: 'deviceMojit_06'} )
                               } );
                    }

                    return sendIPPErrorMessage( {
                              user: openedActivities[ 0 ].user,
                              message: Y.doccirrus.errorTable.getMessage( {code: 'deviceMojit_07'} )
                           } );
                }
                // -------------------------------------------- 5. END ---------------------------------------------------------------------------


                // --------------------- 6. Initialize 'user', 'isNew', 'activityId' and 'socket' from openedActivities[0] ---------------------------------
                ({user, isNew, activityId, socket} = openedActivities[0]);
                // ---------------------------------------------------- 6. END -------------------------------------------------------------------


                // ----------- 7 (If isNew). If activity is not new then create a media book entry which is claimed by activityId ---------------------------
                if( !isNew ) {

                    // --------------- 7a. Query 'activityId' from DB and check if it exists and have a valid status -----------------------------
                    [err, result] = await formatPromiseResult(
                                            Y.doccirrus.mongodb.runDb( {
                                                user,
                                                model: 'activity',
                                                action: 'get',
                                                query: {
                                                    _id: activityId
                                                }
                                            })
                                          );

                    if( err ) {
                        Y.log(`ippJob-incoming: Error while querying activity with _id: ${activityId}. Error: ${err.stack || err}`, "error", NAME);
                        return sendIPPErrorMessage( {
                                  user: user,
                                  message: Y.doccirrus.errorTable.getMessage( {code: 'deviceMojit_12' } )
                               } );
                    }

                    if( !result || !Array.isArray(result) || !result.length ) {
                        Y.log(`ippJob-incoming: activity Id: ${activityId} not found in the DB.`, "warn", NAME);
                        return sendIPPErrorMessage( {
                                  user: user,
                                  message: Y.doccirrus.errorTable.getMessage( {code: 'deviceMojit_11' } )
                               } );
                    }

                    if( result[0].status !== "VALID" ) { //TODO: Removed result[0].status !== "CREATED"
                        Y.log(`ippJob-incoming: activity Id: ${activityId} cannot be changed because it has the status '${result[0].status}'`, "warn", NAME);
                        return sendIPPErrorMessage( {
                                  user: user,
                                  message: Y.doccirrus.errorTable.getMessage( {code: 'deviceMojit_10', data: {$status: Y.doccirrus.i18n(`activity-schema.ActStatus_E.${result[0].status}`)} } )
                               } );
                    }
                    // --------------------------------------------- 7a. END ---------------------------------------------------------------------


                    // -------- 7b. Create media-book entry which is claimed by 'activityId' and notify UI to updateActivityAttachments ----------
                    [err, result] = await formatPromiseResult(
                                            Y.doccirrus.api.devicelog.matchPatientAndCreateAttachment({
                                                user,
                                                caption: `ippJob (${fileTitle || ""})`,
                                                deviceId: IPP_SOURCE_NAME,
                                                overwrite: {
                                                    activityId
                                                },
                                                file: {
                                                    data: pdfFileBuffer,
                                                    path: pdfPath
                                                },
                                                documentDetails: {
                                                    fileSource: "From IPP"
                                                }
                                            })
                                          );

                    if( err ) {
                        Y.log(`ippJob-incoming: Error creating media book entry for media file: ${pdfPath} and claimant activityId: ${activityId}. Error: ${err.stack || err}`, "error", NAME);
                        return sendIPPErrorMessage( {
                                  user: user,
                                  message: Y.doccirrus.errorTable.getMessage( {code: 'deviceMojit_08'} )
                               } );
                    }

                    Y.doccirrus.communication.emitEventForSocket( {
                        socket,
                        event: 'updateActivityAttachments',
                        msg: {
                            data: {
                                activityId: activityId,
                                documentId: result.documentIdArr
                            }
                        },
                        doNotChangeData: true
                    } );
                    return;
                    // ----------------------------------------------- 7b. END -------------------------------------------------------------------
                }
                // -------------------------------------------- 7 (If isNew). END ---------------------------------------------------------------------------


                // ----- 7 (Else). If activity is new then create a media document from the input file and notify the new activity on the UI to update its attachment ----------
                [err, mediaObj] = await formatPromiseResult(importMediaFromFileProm( user, pdfPath, 'activity', activityId, pdfFileName, 'user', 'OTHER' ) );

                if( err ) {
                    Y.log(`ippJob-incoming: Error while creating media object in 'media' collection. Error: ${err.stack || err}`, "error", NAME);
                    return sendIPPErrorMessage( {
                        user: user,
                        message: Y.doccirrus.errorTable.getMessage( {code: 'deviceMojit_09'} )
                    } );
                }

                mediaObj.ownerId = activityId;

                Y.doccirrus.communication.emitEventForSocket( {
                    socket,
                    event: 'updateActivityAttachments',
                    msg: {
                        data: {
                            activityId: activityId,
                            mediaObj: mediaObj
                        }
                    },
                    doNotChangeData: true
                } );
                // ---------------------------------------------------------- 7 (Else). END ------------------------------------------------------------------------------------
            } );

            Y.doccirrus.communication.setListenerForNamespace( "serial-to-ethernet", "checkForUpdate", function( msg ) {
                Y.log( `update check request from a Device Server with data: ${util.inspect( msg, {depth: 1} )}`, 'debug', NAME );
                //Y.log( "update check request from a Device Server with data: " + util.inspect( msg ), 'debug', NAME );

                if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                    Y.log( 'Device Server auto update is disabled server side for switzerland', 'info', NAME );
                    return;
                }

                if( !updateQueue.includes( this.id ) ) {
                    updateQueue.push( this.id );
                    Y.log( `new device server is asking for update: ${updateQueue}`, 'info', NAME );
                } else {
                    // Harden server against MOJ-9929 bug.
                    Y.log( `device server is asking for repeated update, ignoring. ${updateQueue}`, 'info', NAME );
                    return;
                }

                var dlList = getDownloadList();

                var files, pkgJsonPath;
                var JSZip = require( 'jszip' );
                var crypto = require( 'crypto' );
                if( msg.data.os === "Darwin" ) {
                    files = dlList.dir_mac;
                    pkgJsonPath = "DC Device Server.app/Contents/Resources/app.nw/package.json";
                }
                if( msg.data.os === "Windows_NT" ) {
                    files = dlList.dir_win;
                    pkgJsonPath = "package.json";
                }
                if( files && files.length > 0 ) {
                    var mostRecent = files[files.length - 1]; //eslint-disable-line no-inner-declarations
                    if( msg.data.os === "Windows_NT" && semver.lt( msg.data.version, "2.0.26" ) ) {
                        if( !mostRecent.includes( "updater" ) ) {
                            mostRecent = `${mostRecent.slice( 0, mostRecent.length - 4 )}updater${mostRecent.slice( mostRecent.length - 4 )}`;
                        }
                    }
                    var filePath = dlList.path + mostRecent; //eslint-disable-line no-inner-declarations
                    // var filePath = dlList.path + files; //eslint-disable-line no-inner-declarations
                    var update = fs.readFileSync( filePath ); //eslint-disable-line no-inner-declarations
                    var updateZip = new JSZip( update ); //eslint-disable-line no-inner-declarations
                    if( updateZip.files[pkgJsonPath] ) {
                        var pkgJsonObj = updateZip.files[pkgJsonPath].asText(); //eslint-disable-line no-inner-declarations
                        var pkgJson = JSON.parse( pkgJsonObj ); //eslint-disable-line no-inner-declarations
                        var serverDSver = pkgJson.version; //eslint-disable-line no-inner-declarations
                        var clientDSver = msg.data.version; //eslint-disable-line no-inner-declarations
                        Y.log( `most recent DS version on this server: ${serverDSver}`, 'debug', NAME );
                        Y.log( `DS version from Device Server: ${clientDSver}`, 'debug', NAME );
                        Y.log( `compare result: ${semver.lt( clientDSver, serverDSver )}`, 'debug', NAME );
                        if( semver.lt( clientDSver, serverDSver ) ) {

                            setTimeout( () => {
                                //set specific device server version (2.0.27) MOJ-10159
                                //remove this once every device server is on version 2.0.27 and above
                                if( semver.lt( clientDSver, "2.0.27" ) ) {
                                    if( msg.data.os === "Darwin" ) {
                                        const pathMisc = "DC Device Server.app/Contents/Resources/app.nw/device-server.misc.js";
                                        const pathUpdater = "DC Device Server.app/Contents/Resources/app.nw/device-server.updater.js";
                                        const pathNode = "DC Device Server.app/Contents/Resources/app.nw/node";

                                        const writeMisc = {
                                            data: new Buffer( updateZip.files[pathMisc].asText() ),
                                            path: "./device-server.misc.js"
                                        };
                                        const writeUpdater = {
                                            data: new Buffer( updateZip.files[pathUpdater].asText() ),
                                            path: "./device-server-updater.js"
                                        };
                                        const writeNode = {
                                            data: updateZip.files[pathNode].asNodeBuffer(),
                                            path: "./node"
                                        };

                                        this.emit( "writeFile", writeNode );
                                        setTimeout( () => {
                                            this.emit( "writeFile", writeMisc );
                                            setTimeout( () => {
                                                this.emit( "writeFile", writeUpdater );
                                                setTimeout( () => {
                                                    const execUpdateMac = {
                                                        command: "chmod 755 ./node"
                                                    };

                                                    this.emit( 'executeProgramDetached', execUpdateMac );
                                                }, 10000 );
                                            }, 10000 );
                                        }, 10000 );

                                    } else if( msg.data.os === "Windows_NT" ) {
                                        const pathMisc = "device-server.misc.js";
                                        const pathUpdater = "device-server.updater.js";

                                        const writeMisc = {
                                            data: new Buffer( updateZip.files[pathMisc].asText() ),
                                            path: "./device-server.misc.js"
                                        };
                                        const writeUpdater = {
                                            data: new Buffer( updateZip.files[pathUpdater].asText() ),
                                            path: "./device-server-updater.js"
                                        };

                                        this.emit( "writeFile", writeMisc );
                                        setTimeout( () => {
                                            this.emit( "writeFile", writeUpdater );
                                        }, 10000 );
                                    }
                                }

                                setTimeout( () => {
                                    this.emit( "foundVersion", {
                                        callID: msg.meta.callID,
                                        version: serverDSver,
                                        fileName: mostRecent,
                                        fileSize: update.length,
                                        checksum: crypto.createHash( 'md5' ).update( update ).digest( "hex" )
                                    } );

                                    Y.log( "sending update...", 'debug', NAME );

                                    this.emit( "considerUpdating", update );
                                    updateQueue = updateQueue.filter( id => id !== this.id );

                                    Y.log( `device servers currently waiting for update in queue: ${updateQueue}`, 'info', NAME );
                                }, 60000 );

                            }, 240000 );

                        } else if( msg.data.manual ) {
                            //notify if check is manual
                            this.emit( "foundVersion", {
                                callID: msg.meta.callID,
                                version: serverDSver
                            } );
                        }
                    }
                }
            } );



            function startupCleanup() {
                require( 'dc-core' ).migrate.eachTenantParallelLimit( function( superUser, done ) {
                    dbg( "calling cleanup for tenant " + superUser.tenantId );
                    Y.doccirrus.mongodb.runDb( {
                        user: superUser,
                        model: "inport",
                        action: "get",
                        query: {}
                    }, function( err, res ) { //eslint-disable-line handle-callback-err
                        if( res ) {
                            dbg( "res of cleanup query: " + util.inspect( res ) );
                            var toBeRemoved = []; //eslint-disable-line no-inner-declarations
                            for( var i = 0; i < res.length; i++ ) { //eslint-disable-line no-inner-declarations
                                dbg( "checking " + res[ i ].path );
                                if( !res[ i ].configured ) {
                                    dbg( "not configured" );
                                    if( !s2eClients[ res[ i ].path.split( ":" )[ 0 ] ] ) {
                                        toBeRemoved.push( res[ i ].path );
                                    }
                                } else {
                                    dbg( "configured" );
                                }
                            }
                            dbg( "to be removed: " + toBeRemoved );

                            if( 0 < toBeRemoved.length ) {
                                deleteFromDb( { tenant: superUser.tenantId, data: toBeRemoved } );
                            }
                        }
                    } );
                    done( null, true );
                }, 5, function() {
                } );
            }

            Y.doccirrus.communication.setListenerForNamespace("/", "inspectDevicesChange", function(msg) {
                devicesInspector = msg.user;
            });
            //Y.doccirrus.communication.setListenerForNamespace("/", "sd.cleanupDevices", cleanupDevices);
            //Y.doccirrus.communication.setListenerForNamespace("admin", "sd.cleanupDevices", cleanupDevices);

            setTimeout( startupCleanup, 3000 );
        }

        //        function getDeviceList(args) {
        //            var callID = args.callID || args.originalParams.callID;
        //            requests[callID] = new Request(args, 15000);
        //            Y.log("jm@dc: "+util.inspect(s2eClients));
        //            for( var client in s2eClients ) {
        //                if( s2eClients.hasOwnProperty( client ) ) {
        //                    Y.log("jm@dc: sending to "+util.inspect(client));
        //                    s2eClients[client].emit( 'getDeviceList', {callID: callID} );
        //                }
        //            }
        //        }


        /**
         * start of the cleanup callback from the browser client after changes  on the table/disconnecting of SDS clients
         * filters for entries that are no longer connected and have no parser associated with it for deletion
         * @method cleanupDevices
         * @param {Object} msg
         */
        function cleanupDevices( msg ) {
            dbg( "cleanupDevices: " + util.inspect( msg ) );

            if( msg.tenant ) {
                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForTenant( msg.tenant ),
                    model: "inport",
                    action: "get",
                    query: {}
                }, function( err, res ) { //eslint-disable-line handle-callback-err
                    if( res ) {
                        dbg( "res of cleanup query: " + util.inspect( res ) );
                        var toBeRemoved = []; //eslint-disable-line no-inner-declarations
                        for( var i = 0; i < res.length; i++ ) { //eslint-disable-line no-inner-declarations
                            dbg( "checking " + res[ i ].path );
                            if( !res[ i ].configured ) {
                                dbg( "not configured" );
                                var host = res[ i ].path.substring( 0, res[ i ].path.lastIndexOf( ":" ) ); //eslint-disable-line no-inner-declarations
                                if( !s2eClients[ host ] ) {
                                    dbg( "removed because of missing client" );
                                    toBeRemoved.push( res[ i ].path );
                                } else if( devices[ host ] ) {
                                    for( var j = 0; j < devices[ host ].length; j++ ) { //eslint-disable-line no-inner-declarations
                                        dbg( "comparing device: " + res[ i ].path + " :: " + devices[ host ][ j ].comName );
                                        if( res[ i ].path === devices[ host ][ j ].comName ) {
                                            dbg( "found!" );
                                            break;
                                        }
                                        if( j === devices[ host ].length - 1 ) {
                                            dbg( "removing " + res[ i ].path );
                                            toBeRemoved.push( res[ i ].path );
                                        }
                                    }
                                }
                            } else {
                                dbg( "configured" );
                            }
                        }
                        dbg( "to be removed: " + toBeRemoved );

                        if( 0 < toBeRemoved.length ) {
                            deleteFromDb( { tenant: msg.tenant, data: toBeRemoved } );
                        }
                    }
                } );
            }
        }

        function sendGarbledUpdate( args ) {
            Y.log('Entering Y.doccirrus.api.sdManager.sendGarbledUpdate', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sdManager.sendGarbledUpdate');
            }
            if( Y.doccirrus.ipc.isMaster() ) {
                Y.log( "connected s2eClients:\n" + util.inspect( Object.keys( s2eClients ) ), 'debug', NAME );
                var ip = args.ip || "127.0.0.1"; //eslint-disable-line no-inner-declarations
                var breakFingerprint = args.breakFingerprint || false; //eslint-disable-line no-inner-declarations
                var garbleMax = args.garbleMax || 1024; //eslint-disable-line no-inner-declarations

                var socket = getSocketByIP( ip ) || s2eClients[ Object.keys( s2eClients )[ 0 ] ]; //eslint-disable-line no-inner-declarations

                if( socket ) {
                    var garbleData = []; //eslint-disable-line no-inner-declarations
                    for( var i = 0; i < garbleMax; i++ ) { //eslint-disable-line no-inner-declarations
                        garbleData.push( Math.floor( 0xff * Math.random() ) );
                    }
                    var update = new Buffer( garbleData ); //eslint-disable-line no-inner-declarations

                    socket.emit( "foundVersion", {
                        version: "50000.0.0", // we've come a long way
                        fileName: "DC_Device_Server_win-ia32_50000.0.0.zip",
                        fileSize: update.length,
                        checksum: require( 'crypto' ).createHash( breakFingerprint ? 'sha1' : 'md5' ).update( update ).digest( "hex" )
                    } );
                    Y.log( "sending update...", 'debug', NAME );
                    socket.emit( "considerUpdating", update );
                    args.callback();
                } else {
                    args.callback( "no DS for IP " + ip );
                }
            } else {
                Y.doccirrus.ipc.sendAsync( "sendGarbledUpdateFromMaster", {
                    ip: args.ip,
                    breakFingerprint: args.breakFingerprint,
                    garbleMax: args.garbleMax
                }, args.callback );
            }
        }

        /**
         * opens all devices with a driver, and closes all without one (redundancy of opening/closing commands is ok)
         * @method isOnline
         * @param {String} path path to check for
         *
         * @return {Boolean}
         */
        function isOnline( path ) {
            var host = path.substring( 0, path.lastIndexOf( ":" ) );
            var device = path.substring( path.lastIndexOf( ":" ) + 1 );
            if( devices[ host ] ) {
                for( var i = 0; i < devices[ host ].length; i++ ) { //eslint-disable-line no-inner-declarations
                    if( devices[ host ][ i ].comName === device ) {
                        return true;
                    }
                }
            }
            return false;
        }

        /**
         * opens all devices with a driver, and closes all without one (redundancy of opening/closing commands is ok)
         * @method reloadDevices
         * @param {Object} args
         */
        function reloadDevices( args ) {
            Y.log('Entering Y.doccirrus.api.sdManager.reloadDevices', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sdManager.reloadDevices');
            }
            dbg( "reloading with: " + util.inspect( args ) );
            var query = {};
            if ( args.clientName ) {
                query.path = { $regex: `^${args.clientName}:`, $options: '' };
                dbg( "looking for configured inports with properties: " );
                dbg( JSON.stringify(query) );
            }

            //get entire config
            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: "inport",
                action: "get",
                query: {}
            }, function( err, res ) {
                if( !err ) {
                    for( var i = 0; i < res.length; i++ ) { //eslint-disable-line no-inner-declarations
                        closeByPath( res[ i ] );
                        if( res[ i ].configured ) {
                            //activating
                            openByPath( res[ i ] );
                        }
                    }
                }
            } );

            //this is intentional,as it is a responseless call to the DS
            args.callback( null, {} );
        }

        /**
         * opens device at given path
         * @method openByPath
         * @param {Object} con
         */
        function openByPath( con ) {
            //seperating host and device from source string
            var host = con.path.substring( 0, con.path.lastIndexOf( ":" ) );
            var device = con.path.substring( con.path.lastIndexOf( ":" ) + 1 );
            var fc = [];

            dbg( "opening connection to " + device + " on " + host );
            dbg( "available: " + util.inspect( s2eClients ) );

            if( s2eClients[ host ] ) {
                //setting flow control array
                //flowcontrol = ["XON", "XOFF", "XANY", "RTSCTS"];           
                if( con.fc_xon ) {
                    fc.push( "XON" );
                }
                if( con.fc_xoff ) {
                    fc.push( "XOFF" );
                }
                if( con.fc_xany ) {
                    fc.push( "XANY" );
                }
                if( con.fc_rtscts ) {
                    fc.push( "RTSCTS" );
                }

                s2eClients[ host ].emit( "openDevice", {
                    callID: base64Gen( 16 ),
                    device: device,
                    baudrate: con.baudrate,
                    databits: con.databits,
                    stopbits: con.stopbits,
                    parity: con.parity,
                    flowcontrol: fc
                } );
            }
        }

        /**
         * closes device at given path
         * @method closeByPath
         * @param {Object} con
         */
        function closeByPath( con ) {
            dbg( "closing " + con.path );
            var host = con.path.substring( 0, con.path.lastIndexOf( ":" ) );
            var device = con.path.substring( con.path.lastIndexOf( ":" ) + 1 );
            if( s2eClients[ host ] ) {
                s2eClients[ host ].emit( "closeDevice", { callID: base64Gen( 16 ), device: device } );
            }
        }

        /**
         * merges current devices into db
         * @method checkDBforDevices
         * @param {Object} msg
         */
        function checkDBforDevices( msg ) {
            //doing this recursive for now
            function step() {
                msg.data.shift();
                if( 0 < msg.data.length ) {
                    setTimeout( function() {
                        checkDBforDevices( msg );
                    }, 20 );
                }
            }

            if( msg.meta.tenant && 0 < msg.data.length ) {
                var pathname = msg.meta.myName + ":" + msg.data[ 0 ].comName; //eslint-disable-line no-inner-declarations
                //Y.log("jm@dc pathname: "+pathname);

                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForTenant( msg.meta.tenant ),
                    model: "inport",
                    action: "get",
                    query: { path: pathname }
                }, function( err, res ) { //eslint-disable-line handle-callback-err
                    //if not in db, add new path with configured: false
                    if( res.length < 1 ) {
                        var data = { //eslint-disable-line no-inner-declarations
                            path: pathname,
                            configured: false
                        };
                        Y.doccirrus.filters.cleanDbObject( data );
                        Y.doccirrus.mongodb.runDb( {
                            user: Y.doccirrus.auth.getSUForTenant( msg.meta.tenant ),
                            model: "inport",
                            action: "post",
                            data: data
                        }, function() {
                            step();
                        } );
                    }
                    else {
                        step();
                    }
                } );
            }
        }

        /**
         * recursively delete elements from the given list
         * @method deleteFromDb
         * @param {Object} toBeRemoved
         */
        function deleteFromDb( toBeRemoved ) {
            dbg( "deleteFromDb: " + util.inspect( toBeRemoved ) );
            //doing this recursive for now
            function step() {
                toBeRemoved.data.shift();
                if( 0 < toBeRemoved.data.length ) {
                    setTimeout( function() {
                        deleteFromDb( toBeRemoved );
                    }, 20 );
                }
            }

            if( toBeRemoved.tenant && 0 < toBeRemoved.data.length ) {
                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForTenant( toBeRemoved.tenant ),
                    model: "inport",
                    action: "delete",
                    query: { path: toBeRemoved.data[ 0 ] },
                    options: {
                        override: true
                    }
                }, function( err, res ) {
                    if( res ) {
                        dbg( "cleanup successful: " + res );
                    }
                    if( err ) {
                        dbg( "cleanup error: " + err );
                    }
                    step();
                } );
            }
        }

        /**
         * quickly generate base64 number of given length
         * @method base64Gen
         * @param {Number} len
         *
         * @return {String}
         */
        function base64Gen( len ) {
            var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", rtn = "";
            for( var i = 1; i < len; i++ ) { //eslint-disable-line no-inner-declarations
                rtn += alphabet[ Math.floor( Math.random() * alphabet.length ) ];
            }
            return rtn;
        }

        /**
         * check through list of devices and remove those found in the blacklist
         * @method filterDefaultDevices
         * @param {Object} msg
         */
        function filterDefaultDevices( msg ) {
            dbg( "filterDefaultDevices pre: " + util.inspect( msg ) );
            if( msg.data ) {
                for( var i = 0; i < msg.data.length && 0 < msg.data.length; i++ ) { //eslint-disable-line no-inner-declarations
                    dbg( (i + 1) + "/" + msg.data.length );
                    dbg( "checking: " + util.inspect( msg.data[ i ] ) );
                    if( msg.data[ i ].comName && -1 < blacklist.indexOf( msg.data[ i ].comName ) ) {
                        dbg( "removed!" );
                        msg.data.splice( i, 1 );
                        i--;
                    }
                }
            }
            dbg( "filterDefaultDevices post: " + util.inspect( msg ) );
        }

        /**
         * check through list of devices and remove those found in the blacklist
         * @method sendSerialData
         * @param {Object} args
         * @param {String} args.device
         * @param {Buffer} args.serialData
         */
        function sendSerialData( args ) {
            Y.log('Entering Y.doccirrus.api.sdManager.sendSerialData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sdManager.sendSerialData');
            }
            if( Y.doccirrus.ipc.isMaster() ) {
                var host = args.device.substring(0, args.device.lastIndexOf(":")); //eslint-disable-line no-inner-declarations
                var device = args.device.substring(args.device.lastIndexOf(":") + 1); //eslint-disable-line no-inner-declarations
                s2eClients[host].emit("sendSerialData", {
                    callID: base64Gen(16), device: device, serialData: args.serialData
                });
            } else {
                Y.doccirrus.ipc.send( SENDSERIALDATA, args );
            }
        }
        

        function getDownloadList() {
            var
                path = Y.doccirrus.auth.getDirectories( 'download' ) + '/',
                dir,
                dir_mac = [],
                dir_win = [],
                dir_linux = [],
                dir_node = [],
                fs = require( 'fs' );

            if( path && path !== '/' && fs.existsSync( path ) ) {
                dir = fs.readdirSync( path );
            }
            else {
                Y.log( 'invalid Directory: ' + path, 'debug', NAME );
            }

            if( !dir ) {
                dir = [];
            }

            dir.forEach( function( entry ) {
                /* this is temporary code - currently the device server for Switzerland is newer
                   than the German one, but these device servers are compatible. See MOJ-11903
                 */
                function getFilesByNameAndOS( name ) {
                    if( entry.match( new RegExp(name) ) ) {
                        if( entry.indexOf( '-node' ) > -1 ) {
                            dir_node.push( entry );
                        } else if( entry.indexOf( 'osx' ) > -1 ) {
                            dir_mac.push( entry );
                        } else if( entry.indexOf( 'win' ) > -1 ) {
                            dir_win.push( entry );
                        } else if( entry.indexOf( 'linux' ) > -1 ) {
                            dir_linux.push( entry );
                        }
                    }
                }

                if( Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                    getFilesByNameAndOS( '^DC_Device_Server' );
                }
                if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                    getFilesByNameAndOS( '^SWISS_DC_Device_Server' );
                }
            } );
            return {
                path: path,
                dir: dir,
                dir_mac: dir_mac.sort(),
                dir_win: dir_win.sort(),
                dir_linux: dir_linux.sort(),
                dir_node: dir_node.sort()
            };
        }

        function getDeviceServerNames( {callback} = {} ) {
            if( Y.doccirrus.ipc.isMaster() ) {
                Y.log( `getDeviceServerNames: extracting dsNamesList from s2eClients on master: ${util.inspect( s2eClients, {depth: 0} )}`, 'info', NAME );
                const dsNameList = Object.keys( s2eClients ).map( clientName => {
                    return {
                        name: clientName,
                        version: s2eClients[clientName].sdVersion,
                        ip: getIpOfSocketConnection( s2eClients[clientName] )
                    };
                } );
                Y.log( `getDeviceServerNames: retrieved dsNameList from s2eClients on master:\n ${util.inspect( dsNameList )}`, 'info', NAME );
                return callback ? callback( null, dsNameList ) : dsNameList;
            } else {
                Y.log( `getDeviceServerNames: trying to retrieve dsNameList on worker. Sending ipc event 'GET_DS_NAME_LIST' to master.`, 'info', NAME );
                return callback ? Y.doccirrus.ipc.sendAsync( GET_DS_NAME_LIST, null, callback ) : util.promisify( Y.doccirrus.ipc.sendAsync.bind( Y.doccirrus.ipc ) )( GET_DS_NAME_LIST, null );
            }
        }

        function getIpOfLocalConnection( args ) {
            return args.callback ? args.callback( null, this.getIpOfRequestArgs( args ) ) : this.getIpOfRequestArgs( args );
        }

        function getDeviceServerNamesFromLokalDummy( deviceServers ) {
            return new Promise( ( resolve, reject ) => {
                if( deviceServers && deviceServers.length > 0 && deviceServers[0] === "Dummy/Lokal" ) {
                    getDeviceServerNames( {
                        callback: function( err, dsNameList ) {
                            if( err ) {
                                return reject( err );
                            }
                            let currentConnectedDeviceServers = [];
                            for( let i = 0; i < dsNameList.length; i++ ) {
                                currentConnectedDeviceServers.push( dsNameList[i].name );
                            }
                            return resolve( currentConnectedDeviceServers );
                        }
                    } );
                } else {
                    return resolve( deviceServers );
                }
            } );
        }

        /**
         * ...
         * @method getOneDeviceServerNameFromLokalDummy
         *
         * @param {Object} args
         * @param {Array} args.deviceServers - Array of Device Servers provided by the frontend.
         * @param {Object} args.ip - IP of the connection.
         *
         * @return {Array} Returns either the Device Server that runs on the machine of the request or the list provided to the function
         */
        function getOneDeviceServerNameFromLokalDummy( args ) {
            const {
                deviceServers,
                ip
            } = args;

            return new Promise( ( resolve, reject ) => {
                if( deviceServers && deviceServers.length > 0 && deviceServers[0] === "Dummy/Lokal" ) {
                    getDeviceServerNames( {
                        callback: function( err, dsNameList ) {
                            if( err ) {
                                return reject( err );
                            }
                            if( dsNameList && Array.isArray( dsNameList ) ) {
                                const ds = dsNameList.find( ds => ds.ip === ip );

                                //  IP might not be found, MOJ-11396
                                if ( !ds || !ds.name ) {
                                    return resolve( [] );
                                }

                                return resolve( [ds.name] );
                            } else {
                                return resolve( deviceServers );
                            }
                        }
                    } );
                } else {
                    return resolve( deviceServers );
                }
            } );
        }

        async function getDeviceServerVersion( args ) {
            Y.log('Entering Y.doccirrus.api.sdManager.getDeviceServerVersion', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sdManager.getDeviceServerVersion');
            }
            const {callback, user} = args;

            const deviceServers = await getDeviceServerNames();
            const localDeviceServer = deviceServers.filter( deviceServer => deviceServer.ip === (user && user.ip) );
            const deviceServerVersion = localDeviceServer && localDeviceServer.length === 1 && localDeviceServer[0].name ? localDeviceServer[0].version : '1.0.1';

            return callback ? callback( null, {deviceServerVersion} ) : {deviceServerVersion};
        }

        function getIpOfRequest( args ) {
            if (args.httpRequest) {
                var forward = args.httpRequest.headers[ "x-forwarded-for" ]; //eslint-disable-line no-inner-declarations
                //TODO: if there's a better place in a request that does not have a user object/login, please improve and test
                var baseIp = args.httpRequest.client.server._connectionKey.split( ":" ); //eslint-disable-line no-inner-declarations
                baseIp.pop();
                baseIp.shift();
                baseIp = baseIp.join( ":" );
                if ( "null" === baseIp ) {
                    baseIp = "127.0.0.1";
                }
                return forward && forward.split( ", " )[ 0 ] || baseIp;
            } else {
                return null;
            }
        }

        function getIpOfSocketConnection( socket ) {
            return Y.doccirrus.communication.getIpOfSocketConnection( socket );
        }

        function getSocketByIP( ip ) {
            for( var socket in s2eClients ) { //eslint-disable-line no-inner-declarations
                if( s2eClients.hasOwnProperty( socket ) ) {
                    if( getIpOfSocketConnection( s2eClients[ socket ] ) === ip ) {
                        return s2eClients[ socket ];
                    }
                }
            }
        }

        function getSocketByNameOrIp( name, ip ) {
            var s2eClient = s2eClients[ name ];
            if( ip && name === DUMMY ) {
                var checkableIps = [ ip, "127.0.0.1", "::ffff:127.0.0.1" ]; //eslint-disable-line no-inner-declarations
                var socket = null; //eslint-disable-line no-inner-declarations
                for( var i = 0; i < checkableIps.length; i++ ) { //eslint-disable-line no-inner-declarations
                    socket = Y.doccirrus.api.sdManager.getSocketByIP( checkableIps[ i ] );
                    if( socket ) {
                        s2eClient = socket;
                        break;
                    }
                }
            }
            return s2eClient;
        }

        /**
         * debug logging function, so that we don't need to delete debug logging messages in this module
         * @method dbg
         * @param {String} msg
         */
        function dbg( msg ) {
            Y.log( "sdmanager debug: " + msg, "debug", NAME );
        }

        function sdbg( msg ) {
            Y.log( "sdmanager debug: " + msg, "debug", SERIALLOG );
        }

        /**
         * Sets directory watcher for hl7-import directory and imports patients from files which have not been imported yet.
         */
        function initImportHL7Process() {
            var folderPath = Y.doccirrus.auth.getDirectories( 'hl7-import' ),
                path = require( 'path' ),
                fs = require( 'fs' ),
                async = require( 'async' ),
                importedPref = '.imported',
                importedReg = /.*imported$/,
                user = Y.doccirrus.auth.getSUForLocal();

            function checkImportedName( name, callback ) {
                var fullPath = name.fullPath,
                    prefix = name.prefix || '';
                name.prefix = name.prefix || 0;
                fs.exists( fullPath + prefix + importedPref, function( exists ) {
                    if( !exists ) {
                        return callback( fullPath + prefix );
                    }
                    name.prefix++;
                    checkImportedName( name, callback );
                } );
            }

            function savePatientToDb( patient, callback ) {
                async.waterfall( [
                    function( next ) {
                        if( patient._id ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'count',
                                model: 'patient',
                                query: {
                                    _id: patient._id.toString()
                                }
                            }, next );
                        } else {
                            next( null, 0 );
                        }
                    }, function( count, next ) {
                        var patientId;
                        if( count ) {
                            Y.log( 'Imported patient exists. The patient data will be updated.', 'info', NAME );
                            patientId = patient._id;
                            delete patient._id;
                            Y.doccirrus.filters.cleanDbObject( patient );
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'patient',
                                action: 'put',
                                query: {
                                    _id: patientId
                                },
                                fields: Object.keys( patient ),
                                data: patient
                            }, next );
                        } else {
                            Y.log( 'Imported patient does not exist. A new patient will be created.', 'info', NAME );
                            Y.doccirrus.filters.cleanDbObject( patient );
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'post',
                                model: 'patient',
                                data: patient
                            }, next );
                        }
                    }

                ], callback );
            }

            function importPatient( filename, callback ) {
                var fullPath = path.join( folderPath, filename );
                Y.log( 'Importing patient from: ' + filename, 'debug', NAME );
                async.waterfall( [
                    function( next ) {
                        fs.readFile( fullPath, { encoding: 'utf8' }, function( err, data ) {
                            var result;
                            if( err ) {
                                Y.log( 'can not read file: ' + fullPath, 'error', NAME );
                                return next( err );
                            }
                            result = Y.doccirrus.api.hl7.convertHL7toObject( data );
                            next( err, result );
                        } );

                    }, function( result, next ) {
                        if( result.error ) {
                            Y.log( 'Can not get patient object from HL7 file. Filename: ' + fullPath + ', error: ' + result.error, 'debug', NAME );
                            return next( 'Can not get patient object from HL7 file' );
                        } else {
                            savePatientToDb( result.data, function( err ) {
                                next( err );
                            } );
                        }
                    }, function( next ) {
                        checkImportedName( { fullPath: fullPath }, function( name ) {
                            fs.rename( fullPath, name + importedPref, next );
                        } );

                    }
                ], function( err ) {
                    if( err ) {
                        Y.log( 'Can not import new patient from file: ' + filename + ', error: ' + err, 'error', NAME );
                    } else {
                        Y.log( 'New patient was successfully imported from file: ' + filename, 'debug', NAME );
                    }
                    if( 'function' === typeof callback ) {
                        callback( err );
                    }
                } );
            }

            function filterFilename( filename ) {
                return !importedReg.test( filename ) && 0 !== filename.indexOf( '.' );
            }

            function checkFiles( folderPath ) {
                async.waterfall( [
                    function( next ) {
                        fs.exists( folderPath, function( exists ) {
                            if( !exists ) {
                                next( 'hl7-import directory does not exist!' );
                            } else {
                                next();
                            }
                        } );
                    },
                    function( next ) {
                        fs.readdir( folderPath, next );
                    },
                    function( files, next ) {
                        files = files.filter( filterFilename );
                        Y.log( 'Files which will be imported: ' + files.join( ', ' ), 'debug', NAME );
                        async.each( files, importPatient, next );
                    }
                ], function( err ) {
                    if( err ) {
                        Y.log( 'Import HL7 error. ' + err.toString(), 'error', NAME );
                    }
                } );
            }

            function setFolderWatcher( folderPath ) {
                Y.doccirrus.fileutils.watch( folderPath, function( e, filename ) {
                        var fullPath = path.join( folderPath, filename );
                        Y.log( 'File: ' + filename + ' has been changed', 'debug', NAME );
                        if( filterFilename( filename ) ) {
                            fs.exists( fullPath, function( exists ) {
                                if( exists ) {
                                    importPatient( filename );
                                }
                            } );
                        }

                    },
                    function( err ) {
                        if( err ) {
                            Y.log( 'Can not set watcher for directory: ' + folderPath, 'error', NAME );
                        }
                    } );

            }

            if( !folderPath ) {
                Y.log( 'Config for hl7-import is missing!', 'error', NAME );
                return;
            }
            checkFiles( folderPath );
            setFolderWatcher( folderPath );

        }

        /**
         * Converts patient object to hl7 string and saves it into a file
         * @method exportPatientToHL7
         * @param {Object} args
         * @param {Object} args.data patient data
         * @param {Function} args.callback
         */
        function exportPatientToHL7( args ) {
            var data = args.data,
                finalCb = args.callback,
                path = require( 'path' ),
                fs = require( 'fs' ),
                hl7String,
                folderPath = Y.doccirrus.auth.getDirectories( 'hl7-export' ),
                async = require( 'async' );

            Y.log( 'Exporting patient object to HL7 file', 'debug', NAME );
            function findName( filename, callback ) {
                var name;
                if( filename ) {
                    return callback( filename );
                }
                name = Y.doccirrus.comctl.getRandomString( 15, 'Aa#' ).toLowerCase();
                fs.exists( path.join( folderPath, name ), function( exists ) {
                    if( !exists ) {
                        return callback( name );
                    }
                    findName( null, callback );
                } );
            }

            async.series( [
                function( next ) {
                    if( !folderPath ) {
                        Y.log( 'Config for hl7-export is missing!', 'info', NAME );
                        return next();
                    }
                    fs.exists( folderPath, function( exists ) {
                        if( exists ) {
                            next();
                        } else {
                            folderPath = '';
                            Y.log( 'hl7-export directory does not exist!', 'info', NAME );
                            return next( );
                        }
                    } );
                }, function( next ) {
                    if( !folderPath ) {
                        return next();
                    }
                    if( !data || 'object' !== typeof data || Y.Object.isEmpty( data ) ) {
                        return next( Y.doccirrus.errors.http( 400, 'bad request, patient object is missing' ) );
                    }
                    hl7String = Y.doccirrus.api.hl7.convertObjectToHL7( data );
                    findName( data._id && data._id.toString(), function( filename ) {
                        Y.log( 'Creating file: ' + filename + ', for HL7 data', 'debug', NAME );
                        fs.writeFile( path.join( folderPath, filename ), hl7String, next );
                    } );
                }
            ], finalCb );
        }

        if( Y.doccirrus.auth.isPRC() ) {
            if( Y.doccirrus.ipc.isMaster() ) {
                setTimeout( initImportHL7Process, 2000 );
            }
            Y.doccirrus.mongoWatcher.subscribeCollection( {
                collection: 'patient',
                callback: function( results, command ) {
                    var patientId = results && (results._id || results[ 0 ]),
                        user = Y.doccirrus.auth.getSUForLocal();
                    if( command && 'delete' === command.action ) {
                        return;
                    }
                    if( patientId ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patient',
                            action: 'get',
                            query: {
                                _id: patientId
                            },
                            options: {
                                lean: true
                            }
                        }, function( err, results ) {
                            if( !err ) {
                                var patientData = results[ 0 ]; //eslint-disable-line no-inner-declarations
                                if( !patientData ) {
                                    return;
                                }
                                patientData._id = patientData._id.toString();
                                Y.doccirrus.api.sdManager.exportPatientToHL7( {
                                    user: user,
                                    data: patientData,
                                    callback: function( err ) {
                                        if( err ) {
                                            Y.log( 'Post process can not export patient. Error: ' + JSON.stringify( err ), 'error', NAME );
                                            return;
                                        }
                                        Y.log( 'Post process has exported patient. Patient id: ' + (patientData._id && patientData._id.toString()), 'debug', NAME );
                                    }
                                } );
                            }

                        } );
                    }
                }
            } );
        }
        /**
         * Gets s2eClients
         * @method getS2eClients
         * @param {Object} args
         * @param {Function} args.callback
         */
        function getS2eClients( args ) {
            Y.log('Entering Y.doccirrus.api.sdManager.getS2eClients', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sdManager.getS2eClients');
            }
            var
                callback = args.callback;
            if( Y.doccirrus.ipc.isMaster() ) {
                var clients = Object.keys( s2eClients ); //eslint-disable-line no-inner-declarations
                clients.unshift( DUMMY );
                callback( null, clients );
            } else {
                Y.doccirrus.ipc.sendAsync( GET_S2ECLIENTS, {}, callback );
            }
        }

        /**
         * Prints message which is received from device server
         * @param {String} text message text
         * @param {Object} msg message object
         * @param {String} [type="debug"] debug type(debug, error and etc.)
         */
        function printBuffer( text, msg, type ) { //eslint-disable-line no-unused-vars
            var
                data = msg && msg.data,
                path = msg && msg.path;
            
            try {
                var buf = new Buffer( data ); //eslint-disable-line no-inner-declarations
                type = type || 'debug';
                Y.log( text + ' path: ' + path + ', data: ' + buf.toString(), type, NAME );
            } catch(e) {
                Y.log('printBuffer failed; data: ', 'info', NAME);
                Y.log(data, 'info', NAME);
                Y.log('error:', 'info', NAME);
                Y.log(e, 'info', NAME);
            }
        }

        /**
         * Gets specific s2eClient
         * @method executeS2eClient
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.client
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function executeS2eClient( args ) {
            Y.log('Entering Y.doccirrus.api.sdManager.executeS2eClient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sdManager.executeS2eClient');
            }
            var
                callback = args.callback,
                queryParams = args.query || {},
                client = queryParams.client,
                path = queryParams.path,
                _args = queryParams.args,
                overwrite = queryParams.overwrite,
                s2eClient;

            if( Y.doccirrus.ipc.isMaster() ) {
                if ( _args && _args.split ) { //split into args array; respects "a bc", but not a\ bc
                    _args = _args.split( /"(.*?)"| /g ).filter( e => e );
                }
                s2eClient = getSocketByNameOrIp( client, overwrite.ip );

                if( s2eClient && s2eClient.miniDS ) {
                    s2eClient.write( path + (_args ? "|" + _args : "") );
                } else {
                    if( !s2eClient ) {
                        Y.log( 'executeS2eClient. s2eClient not found. Client: ' + client, 'warn', NAME );
                        return callback( Y.doccirrus.errors.rest( 13400, '', true ) );
                    }
                    if( s2eClient.emit ) {
                        Y.log( 'executeS2eClient. Executing app, path: ' + path + ', args: ' + _args, 'debug', NAME );
                        s2eClient.emit( "executeProgram", { path: path, args: _args } );
                    }
                }
                callback();
            } else {
                Y.doccirrus.ipc.sendAsync( EXECUTE_S2E_CLIENT, {
                    client: client,
                    path: path,
                    args: _args,
                    overwrite: overwrite
                }, callback );
            }
        }

        function emitFileEvent( config, callback ) {
            var
                s2eClient = config.s2eClient,
                msg = config.msg,
                event = config.event,
                doneEvent = config.doneEvent,
                failEvent = config.failEvent,
                timer;

            function done( msg ) {
                clearTimeout( timer );
                callback( null, msg.data );
                removeEventListeners();
            }

            function fail( msg ) {
                clearTimeout( timer );
                callback( msg.error );
                removeEventListeners();
            }

            function removeEventListeners() {
                s2eClient.removeListener( doneEvent, done );
                s2eClient.removeListener( failEvent, fail );
            }

            s2eClient.emit( event, msg );
            s2eClient.once( doneEvent, done );
            s2eClient.once( failEvent, fail );

            timer = setTimeout( function() {
                removeEventListeners();
                callback( Y.doccirrus.errors.rest( 408, '', true ) );
            }, 30000 );
        }

        /**
         * @method writeFileS2eClient
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.client device server name
         * @param {String} args.query.path full path of file
         * @param {String} args.query.createFullPath if true, will create full path to file is it does not exist
         * @param {Object | String | Array} args.data
         * @param {Object} args.callback
         *
         * @return {Function} callback
         */
        function writeFileS2eClient( args ) {
            Y.log('Entering Y.doccirrus.api.sdManager.writeFileS2eClient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sdManager.writeFileS2eClient');
            }
            var
                callback = args.callback,
                queryParams = args.query || {},
                client = queryParams.client,
                createFullPath = queryParams.createFullPath,
                data = args.data,
                path = queryParams.path,
                overwrite = queryParams.overwrite || {},
                s2eClient;

            if( Y.doccirrus.ipc.isMaster() ) {
                s2eClient = getSocketByNameOrIp( client, overwrite.ip );
                if( !s2eClient ) {
                    Y.log( 'writeFileS2eClient. s2eClient not found. Client: ' + client, 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( 13400, '', true ) );
                }
                if( s2eClient.emit ) {
                    if( data instanceof Array ) {
                        data = new Buffer( data );
                    }
                    if( !(data instanceof Buffer) && data.data ) {
                        data = new Buffer( data.data );
                    }

                    Y.log( 'writeFileS2eClient. Writing file to: ' + path, 'debug', NAME );

                    //TODO: workaround for bug where system cannot emit buffers properly - fix once it works
                    if( Buffer.isBuffer( data ) ) {
                        var tempArr = []; //eslint-disable-line no-inner-declarations
                        data.forEach( byte => tempArr.push( byte ) );
                        data = tempArr;
                    }

                    emitFileEvent( {
                        s2eClient: s2eClient,
                        event: 'writeFile',
                        doneEvent: 'fileWritten',
                        failEvent: 'fileError',
                        msg: { path: path, data: data, createFullPath: createFullPath }
                    }, callback );
                } else {
                    Y.log( 'writeFileS2eClient. s2eClient does not have emit function. Client: ' + client, 'error', NAME );
                    return callback( Y.doccirrus.errors.rest( 500, '', true ) );
                }
            } else {
                Y.doccirrus.ipc.sendAsync( WRITE_FILE_S2E_CLIENT, {
                    client: client,
                    path: path,
                    data: data,
                    createFullPath: createFullPath,
                    overwrite: overwrite
                }, callback );
            }

        }

        /**
         * @method readFileS2eClient
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.client device server name
         * @param {String} args.query.path full path of file
         * @param {Object} args.callback
         *
         * @return {Function} callback
         */
        function readFileS2eClient( args ) {
            Y.log('Entering Y.doccirrus.api.sdManager.readFileS2eClient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sdManager.readFileS2eClient');
            }
            var
                callback = args.callback,
                queryParams = args.query || {},
                client = queryParams.client,
                path = queryParams.path,
                overwrite = queryParams.overwrite || {},
                s2eClient;

            if( Y.doccirrus.ipc.isMaster() ) {
                s2eClient = getSocketByNameOrIp( client, overwrite.ip );
                if( !s2eClient ) {
                    Y.log( 'readFileS2eClient. s2eClient not found. Client: ' + client, 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( 13400, '', true ) );
                }
                if( s2eClient.emit ) {
                    Y.log( 'readFileS2eClient. Reading file from: ' + path, 'debug', NAME );

                    emitFileEvent( {
                        s2eClient: s2eClient,
                        event: 'readFile',
                        doneEvent: 'fileData',
                        failEvent: 'fileError',
                        msg: { path: path }
                    }, callback );
                } else {
                    Y.log( 'readFileS2eClient. s2eClient does not have emit function. Client: ' + client, 'error', NAME );
                    return callback( Y.doccirrus.errors.rest( 500, '', true ) );
                }
            } else {
                Y.doccirrus.ipc.sendAsync( READ_FILE_S2E_CLIENT, {
                    client: client,
                    path: path,
                    overwrite: overwrite
                }, callback );
            }
        }

        /**
         * @method readDirS2eClient
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.client device server name
         * @param {String} args.query.path full path of file
         * @param {String} [args.query.fileOnly=false] if true, will get only file list
         * @param {Object} args.callback
         *
         * @return {Function} callback
         */
        function readDirS2eClient( args ) {
            Y.log('Entering Y.doccirrus.api.sdManager.readDirS2eClient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sdManager.readDirS2eClient');
            }
            var
                callback = args.callback,
                queryParams = args.query || {},
                client = queryParams.client,
                path = queryParams.path,
                fileOnly = queryParams.fileOnly,
                overwrite = queryParams.overwrite || {},
                s2eClient;

            if( Y.doccirrus.ipc.isMaster() ) {
                s2eClient = getSocketByNameOrIp( client, overwrite.ip );
                if( !s2eClient ) {
                    Y.log( 'readDirS2eClient. s2eClient not found. Client: ' + client, 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( 13400, 'Kein Device Server vorhanden', true ) );
                }
                if( s2eClient.emit ) {
                    Y.log( 'readDirS2eClient. Reading directory: ' + path, 'debug', NAME );

                    emitFileEvent( {
                        s2eClient: s2eClient,
                        event: 'readDir',
                        doneEvent: 'fileList',
                        failEvent: 'fileError',
                        msg: { path: path, fileOnly: fileOnly }
                    }, callback );
                } else {
                    Y.log( 'readDirS2eClient. s2eClient does not have emit function. Client: ' + client, 'error', NAME );
                    return callback( Y.doccirrus.errors.rest( 500, '', true ) );
                }
            } else {
                Y.doccirrus.ipc.sendAsync( READ_DIR_S2E_CLIENT, {
                    client: client,
                    path: path,
                    fileOnly: fileOnly,
                    overwrite: overwrite
                }, callback );
            }
        }

        /**
         * @method unlinkS2eClient
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.client device server name
         * @param {String} args.query.path full path of file
         * @param {Object} args.callback
         *
         * @return {Function} callback
         */
        function unlinkS2eClient( args ) {
            Y.log('Entering Y.doccirrus.api.sdManager.unlinkS2eClient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sdManager.unlinkS2eClient');
            }
            var
                callback = args.callback,
                queryParams = args.query || {},
                client = queryParams.client,
                path = queryParams.path,
                overwrite = queryParams.overwrite || {},
                s2eClient;

            if( Y.doccirrus.ipc.isMaster() ) {
                s2eClient = getSocketByNameOrIp( client, overwrite.ip );
                if( !s2eClient ) {
                    Y.log( 'unlinkS2eClient. s2eClient not found. Client: ' + client, 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( 13400, '', true ) );
                }
                if( s2eClient.emit ) {
                    Y.log( 'unlinkS2eClient. Reading directory: ' + path, 'debug', NAME );
                    emitFileEvent( {
                        s2eClient: s2eClient,
                        event: 'unlinkFile',
                        doneEvent: 'fileDeleted',
                        failEvent: 'fileError',
                        msg: { path: path }
                    }, callback );
                } else {
                    Y.log( 'unlinkS2eClient. s2eClient does not have emit function. Client: ' + client, 'error', NAME );
                    return callback( Y.doccirrus.errors.rest( 500, '', true ) );
                }
            } else {
                Y.doccirrus.ipc.sendAsync( UNLINK_S2E_CLIENT, {
                    client: client,
                    path: path,
                    overwrite: overwrite
                }, callback );
            }
        }

        function ps2pdf( psBuffer, callback ) {
            var tmpPath = Y.doccirrus.auth.getTmpDir() + "/ps2pdf/";
            var fs = require( 'fs' );
            var tempName = Math.random().toString( 16 ).substr( 2 );
            var psPath = tmpPath + tempName + ".ps";
            var pdfPath = tmpPath + tempName + ".pdf";
            Y.log( "using ps2pdf in " + tmpPath, "info", NAME );

            fs.mkdir( tmpPath, () => {
                fs.writeFile( psPath, psBuffer, err => {
                    if( err ) {
                        Y.log( "error writing to file: " + err, "warn", NAME );
                        callback( err );
                        return;
                    }
                    require( 'child_process' ).exec( "ps2pdf " + psPath + " " + pdfPath, {}, err => {
                        if( err ) {
                            Y.log( "error converting file: " + err, "warn", NAME );
                            callback( err );
                            return;
                        }
                        callback( null, { pdfPath, tempName } );
                    } );
                } );
            } );
        }

        if( Y.doccirrus.ipc.isMaster() ) {
            Y.doccirrus.ipc.subscribeNamed( GET_S2ECLIENTS, NAME, true, function( params, callback ) {
                getS2eClients( { callback: callback } );
            } );
            Y.doccirrus.ipc.subscribeNamed( GET_DS_NAME_LIST, NAME, true, function( params, callback ) {
                Y.log( `getDeviceServerNames: received ipc 'GET_DS_NAME_LIST' event on master, going to fetch dsNameList.`, 'info', NAME );
                getDeviceServerNames( {callback} );
            } );
            Y.doccirrus.ipc.subscribeNamed( EXECUTE_S2E_CLIENT, NAME, true, function( params, callback ) {
                executeS2eClient( {
                    query: {
                        client: params.client,
                        path: params.path,
                        args: params.args,
                        overwrite: params.overwrite
                    },
                    callback: callback
                } );
            } );
            Y.doccirrus.ipc.subscribeNamed( WRITE_FILE_S2E_CLIENT, NAME, true, function( params, callback ) {
                writeFileS2eClient( {
                    query: {
                        client: params.client,
                        path: params.path,
                        createFullPath: params.createFullPath,
                        overwrite: params.overwrite
                    },
                    data: params.data,
                    callback: callback
                } );
            } );

            Y.doccirrus.ipc.subscribeNamed( READ_FILE_S2E_CLIENT, NAME, true, function( params, callback ) {
                readFileS2eClient( {
                    query: {
                        client: params.client,
                        path: params.path,
                        overwrite: params.overwrite
                    },
                    callback: callback
                } );
            } );
            Y.doccirrus.ipc.subscribeNamed( READ_DIR_S2E_CLIENT, NAME, true, function( params, callback ) {
                readDirS2eClient( {
                    query: {
                        client: params.client,
                        path: params.path,
                        fileOnly: params.fileOnly,
                        overwrite: params.overwrite
                    },
                    callback: callback
                } );
            } );
            Y.doccirrus.ipc.subscribeNamed( UNLINK_S2E_CLIENT, NAME, true, function( params, callback ) {
                unlinkS2eClient( {
                    query: {
                        client: params.client,
                        path: params.path,
                        overwrite: params.overwrite
                    },
                    callback: callback
                } );
            } );

            Y.doccirrus.ipc.subscribeNamed( "getPCSCReaderDataByIp", NAME, true, function( params, callback ) {
                var ip = params.ip;
                var callID = base64Gen( 16 );

                // it' not forced success, it's forced non-failure
                // (because the same errors will have been thrown a lot more before this very unique call is done)
                var requestCallback = function( err, res ) { //eslint-disable-line handle-callback-err
                    callback( null, res );
                };

                var socket = getSocketByIP( ip );
                if( socket ) {
                    socket.emit( "getPCSCReaderData", { callID: callID } );
                    requests[ callID ] = new Request( { callID: callID, callback: requestCallback }, 40000 );
                } else {
                    callback( Y.doccirrus.errors.rest( 13220 ) );
                }
            } );
            Y.doccirrus.ipc.subscribeNamed( "sendGarbledUpdateFromMaster", NAME, true, function( params, callback ) {
                params.callback = callback;
                sendGarbledUpdate( params );
            } );
            Y.doccirrus.ipc.subscribeNamed( "getSocketTenantByIPFromMaster", NAME, true, function( params, callback ) {
                var ds = getSocketByIP( params.ip );
                callback( null, ds && ds.__DC__tenant );
            } );
            Y.doccirrus.ipc.subscribeNamed( "getSocketNameByIpFromMaster", NAME, true, function( params, callback ) {
                var checkableIps = [ params.ip, "127.0.0.1", "::ffff:127.0.0.1" ];
                var socket = null;
                for( var i = 0; i < checkableIps.length; i++ ) { //eslint-disable-line no-inner-declarations
                    socket = Y.doccirrus.api.sdManager.getSocketByIP( checkableIps[ i ] );
                    if( socket ) {
                        break;
                    }
                }
                callback( null, socket );
            } );
            Y.doccirrus.ipc.subscribeNamed( SENDSERIALDATA, NAME, true, function( params ) {
                sendSerialData( params );
            } );
        }

        function hello (socket, msg) {
            dbg( "got setup data:" );
            // Y.doccirrus.ipc.send( "deviceServerStatusChanged", {newStatus: 'connected'});
            // deviceServerName = msg.myName;
            deviceServerVersion = msg.version;
            dbg( require( 'util' ).inspect( msg, { depth: 10, colors: true } ) );
            var doMigrationFor = lowestKnownVersion;
            if( msg.version ) {
                doMigrationFor = msg.version;
            }
            if ( updateMigrations[ doMigrationFor ] ) {
                dbg( "migrating DS v" + doMigrationFor );
                updateMigrations[ doMigrationFor ]( socket );
            }
            function disconnect () {
                Y.log( `SDManager: disconnecting socket '${socket.id}' and deleting it from s2eClients.`, 'info', NAME );
                // Disconnect:
                socket.disconnect( true );
                // Clean up:
                delete s2eClients[msg.myName];
                cleanupDevices( {tenant: msg.tenant} );
            }
            if( msg.myName && msg.tenant ) {
                socket.__DC__tenant = msg.tenant;

                // check on connect if device server has already an open connection under the given name

                if( s2eClients[ msg.myName ] ) {
                    // we have a two sockets with the same name.
                    // disconnect it.
                    // log

                    s2eClients[ msg.myName ].disconnect(true);

                    dbg("duplicate connection for device server: " + msg.myName + " found!.. disconnecting the old connection...");
                }

                s2eClients[ msg.myName ] = socket;
                s2eClients[ msg.myName ].sdVersion = msg.version || "< 0.9.5";
                dbg( "devices so far: " + Object.keys(s2eClients) );

            // DISCONNECT HANDLING - START -----------------------------------------------------------------------------
                Y.log(`SDManager: Setting up 'disconnect' and 'deviceServerShutdown' listeners for device-server socket. myName: '${msg.myName}', tenant: '${msg.tenant}', socketId: '${socket.id}'`, 'info', NAME);
                socket.on( 'disconnect', disconnect );      // Event emitted by the device server when disconnecting without shutting down.
                socket.on( 'deviceServerShutDown', () => {  // Event emitted by the device server on shutdown.
                    socket.emit( 'deviceServerShutDownAcknowledged' );
                    disconnect();
                } );
            // DISCONNECT HANDLING - END -------------------------------------------------------------------------------

                dbg("emitting getDeviceList");
                socket.emit( 'getDeviceList', { callID: "serverDevListReq" } );
            }
            //sending parser names as array
            //currently not used, S.IO overhead

            socket.emit( "availableParsers", {
                parsers: [],
                ip: getIpOfSocketConnection( socket )
            } );

            reloadDevices( {
                user: { tenantId: msg.tenant },
                clientName: msg.myName,
                callback: function() {}
            } );
            //} );
        }


        /**
         * @class sdManager
         * @namespace doccirrus.api
         */

        Y.namespace( 'doccirrus.api' ).sdManager = {
            /**
             * @property name
             * @type {String}
             * @default dcsdmanager
             * @protected
             */
            name: NAME,
            init,
            close,
            hello,
            getS2eClients,
            executeS2eClient,
            writeFileS2eClient,
            readFileS2eClient,
            readDirS2eClient,
            unlinkS2eClient,
            sendSerialData,
            getDownloadList,
            getDeviceServerNames,
            getIpOfLocalConnection,
            getOneDeviceServerNameFromLokalDummy,
            getDeviceServerNamesFromLokalDummy,
            getIpOfRequestArgs: getIpOfRequest,
            getIpOfSocketConnection,
            getSocketByIP,
            sendGarbledUpdate,
            reloadDevices,
            isOnline,
            serialEvents,
            exportPatientToHL7: function( args ) {
                Y.log('Entering Y.doccirrus.api.sdManager.exportPatientToHL7', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sdManager.exportPatientToHL7');
                }
                if( Y.doccirrus.auth.isPRC() ) {
                    exportPatientToHL7( args );
                } else {
                    args.callback( Y.doccirrus.errors.http( 405, 'method allowed only for PRC' ) );
                }
            },
            getDeviceServerVersion
        };
    },
    '0.0.1', {
        requires: [
            'dcipc',
            'inport-schema',
            'hl7-api',
            'dcfileutils',
            'dcauth',
            'DCMongoWatcher',
            'SocketUtils'
        ]
    }
);
