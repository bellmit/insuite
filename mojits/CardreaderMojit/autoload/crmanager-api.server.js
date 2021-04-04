/*
 @author: jm
 @date: 2014-10-13
 */
//TRANSLATION INCOMPLETE!! MOJ-3201
/**
 * Library for management of data transfer between attached cardreaders and client websites/Datensafe.
 */

/*global YUI */



YUI.add( 'dccrmanager', function( Y, NAME ) {

        var http = require( 'http' ),
            util = require( 'util' ),
            port = 80,
            tenantLastCall = {},
        /* tenantLastCall structure:
         {
         -tenant ID-: -last called cardreader-, // in format socket_id/device_name, like "2XIxS6ag9ixaZWj/file"
         ...
         } */

            tenantSockets = {},
        /* tenantSockets structure:
         {
         -tenant ID-: [socket, ...], //sockets grouped by tenant
         ...
         } */

            requests = {};
        /* requests structure:
         {
         -unique ID-: {
         "callback"  : function callback() {}, //stored here since we can't send it anywhere
         "CRSAmount" : -#CRServer of tenant-,  //counts upwards per response to see when all available devices have answered - prevents waiting forever for a disconnected device.
         "tenant"    : -tenant ID-,
         "devList"   : -devList-               //parsed per server
         },
         ...
         }
         */
        
        dbg("on.");

        function Request( args, timeout ) {
            var self = this;
            
            this.callID = args.callID?args.callID:args.originalParams.callID;

            this.callback = args.callback;
            this.args = args;
            this.CRSAmount = 0;
            this.tenant = args.user.tenantId;
            this.devList = [];

            this.cancel = function() {
                if( requests[this.callID] ) {
                    Y.log( "crmanager: cardreader request timed out for call " + this.callID, "warn", NAME );
                    self.CRSAmount++;
                    if( tenantSockets[self.tenant] && self.CRSAmount >= Object.keys( tenantSockets[self.tenant] ).length ) {
                        if (self.callback) {  self.callback( null, self.devList );  }
                        delete requests[this.callID];
                    }
                }
            };

            if (timeout) {  setTimeout( this.cancel, timeout );  }
        }

        /**
         * configuring listeners once the system is actually ready to receive them.
         * this should be done immediately to prevent any reconnecting devices from slipping through before the
         * listeners are set up
         * @method  init
         * @param  {Number}         newPort
         */
        function init( newPort ) {
            Y.log( "crmanager: registering cardreader listeners..." );
            Y.doccirrus.api.crManager.port = newPort;
            //hello listener for initial handshake
            Y.doccirrus.communication.setListenerForNamespace( "cardreader", "cr.hello", function( msg ) {
                if( msg.tenant ) {
                    var tenant = msg.tenant;//eslint-disable-line no-inner-declarations
                    this.emit( "cr.setupComplete", {ip: this.handshake.address} );
                    addReaderSocket( this, tenant );
                    //listener for the same socket to give us data back when it disconnects so we can remove it from any lists
                    this.on( 'disconnect', function() {
                        remReaderSocket( this, tenant );
                    } );
                } else {
                    this.emit( "cr.error", {error: "No Tenant."} );
                    Y.log( "crmanager: cardreader server tried to connect without tenant.", 'warn', NAME );
                }
            } );
            //listener for the two return CRServer types: deviceList and cardData
            Y.doccirrus.communication.setListenerForNamespace( "cardreader", "cr.deviceList", function( msg ) {
                dbg("got devicelist: "+ util.inspect( msg ));
                returnDeviceListSIO( msg, this );
            } );
            Y.doccirrus.communication.setListenerForNamespace( "cardreader", "cr.cardData", function( msg ) {
                returnCardData( msg );
            } );
            Y.doccirrus.communication.setListenerForNamespace( "cardreader", "cr.readLog", function( msg ) {
                if (this.id && msg && msg.command && msg.response) {
                    Y.log(
                        "crmanager: card terminal command log from "+this.id+":" +
                        "\n    command:  "+msg.command+
                        "\n    response: "+msg.response
                    );
                }
            } );
            
            //listener for Socket.IO requests from browser clients
            //kinda redundant so that JSHint isn't complaining about my use of THIS to get the current port
            Y.doccirrus.communication.setListenerForNamespace("/", "cr.getDeviceList", function (msg) {
                dbg("getting getDeviceList call :: "+ util.inspect( msg ));
                dbg("current connection data: "+ util.inspect( this.user.tenantId ));
                getDeviceListSIO({  port: this, callID: msg.callID  });
            });
            Y.doccirrus.communication.setListenerForNamespace("/", "cr.getClientList", function (msg) {
                dbg("getting getClientList call :: "+ util.inspect( msg ));
                getClientListSIO({  port: this, callID: msg.callID  });
            });
        }

        /**
         * associate socket with specific tenant in tennant/socket list
         * @method addReaderSocket
         * @param {Object} socket
         * @param {String} tenant
         */
        function addReaderSocket( socket, tenant ) {
            //check if tenant group exists in our list - if not, add
            if( !tenantSockets[tenant] ) {
                tenantSockets[tenant] = {};
            }
            //add socket to group
            console.log("socket.id: "+socket.id);//eslint-disable-line
            tenantSockets[tenant][socket.id] = socket;
        }

        /**
         * remove socket from specific tenant, and remove tenant from list if no more sockets present
         * @method addReaderSocket
         * @param {Object} socket
         * @param {String} tenant
         */
        function remReaderSocket( socket, tenant ) {
            if( tenantSockets[tenant] ) {
                if( tenantSockets[tenant][socket.id] ) {
                    delete tenantSockets[tenant][socket.id];
                } else {
                    Y.log( "crmanager: socketless deletion of tenant-associated CRS. This should never happen. contact cardreader dev.", "warn", NAME );
                }
                if( 0 === Object.keys( tenantSockets[tenant] ).length ) {
                    delete tenantSockets[tenant];
                }
            }
            else {
                Y.log( "crmanager: tenantless deletion of CRS. This should never happen. contact cardreader dev.", "warn", NAME );
            }
        }

        /**
         * Called preferably from client; request to send device list.
         * creates request object to store data for later use, identified by callID
         * @method getDeviceListSIO
         * @param {Object} args
         * @return {Function} callback
         */
        function getDeviceListSIO( args ) {
            //check if tenant has socks
            var user = args.user || args.port.user;
            if (!args.callID) {
                if (!args.originalParams.callID) {
                    args.callID = base64Gen(16);
                    dbg("no callID; generated: "+args.callID);
                } else {
                    args.callID = args.originalParams.callID;
                }
            }
            
            if( tenantSockets[user.tenantId] ) {
                var callID = args.callID,//eslint-disable-line no-inner-declarations
                    myTenSocks = tenantSockets[user.tenantId];

                //new request object - callID generated by client, usually 16-byte long base64 string
                //TTL is 2 minutes because we are generous and don't wait for anything in particular to happen
                
                //redundant attribute data is a necessary evil for now
                args.user = user;
                if (args.originalParams) {
                    args.originalParams.callID = args.callID;
                } else {
                    args.originalParams = {callID: args.callID};
                }
                
                requests[callID] = new Request( args, 120000 );

                //send on all sockets of tenant
                for( var socketID in myTenSocks ) {//eslint-disable-line no-inner-declarations
                    if( myTenSocks.hasOwnProperty( socketID ) ) {
                        dbg("sending getDeviceList out to "+socketID + "(call: "+args.callID+")");
                        myTenSocks[socketID].emit( 'cr.getDeviceList', {callID: callID} );
                    }
                }
                
                setTimeout(() => {
                    let myRequest = requests[callID];
                    if (myRequest) {
                        dbg("accumulated devices: "+ util.inspect(myRequest.devList));
                        if (myRequest.args.callback) {
                            dbg("very definitely callback here");
                            var sources = [];//eslint-disable-line no-inner-declarations
                            for(var j = 0; j < myRequest.devList.length; j++) {//eslint-disable-line no-inner-declarations
                                sources.push(myRequest.devList[j].source);
                            }
                            myRequest.args.callback( null, {data: sources} );
                        }
                        if (myRequest.args.port) {
                            myRequest.args.port.emit("cr.doneListing", {data: {callID: callID}});
                        } else {
                            dbg("no port to send request to, request is: "+ util.inspect(myRequest));
                        }
                        delete requests[callID];
                    }
                }, 10000);
            }
            else {
                dbg("no sockets for tenant in getDeviceListSIO args: "+ util.inspect(args));
                if (args.port) {
                    args.port.emit("cr.doneListing", {data: {callID: args.callID}});
                }
                if (args.callback) {
                    return args.callback( null, {data: []} );
                }
            }
        }

        function getClientListSIO( args ) {
            //check if tenant has socks
            if( tenantSockets[args.port.user.tenantId] ) {
                var myTenSocks = tenantSockets[args.port.user.tenantId],//eslint-disable-line no-inner-declarations
                    clientList = [];

                for( var socketID in myTenSocks ) {//eslint-disable-line no-inner-declarations
                    if( myTenSocks.hasOwnProperty( socketID ) ) {
                        var address = {};//eslint-disable-line no-inner-declarations

                        //jm@dc: temp debug thing with an undocumented feature. have no faith in the object structure and check every step
                        if (myTenSocks[socketID].request && myTenSocks[socketID].request.connection && myTenSocks[socketID].request.connection._peername) {  address = myTenSocks[socketID].request.connection._peername;  }

                        var newClientAddresses = {//eslint-disable-line no-inner-declarations
                            id:socketID,
                            ip:address.address + ":" + address.port
                        };
                        
                        clientList.push(newClientAddresses);
                    }
                }
                args.port.emit("cr.returnClientList", {data: {clients: clientList, callID: args.callID}});
            }
            else {
                args.port.emit("cr.returnClientList", {data: {clients: [], callID: args.callID}});
            }
        }

        /**
         * Called preferably from client; request to send card data from specified device.
         * Stores callback and calls appropriate socket.
         * @method getCardData
         * @param {Object} args
         * @return {Function} callback
         */
        function getCardData( args ) {
            dbg("getCardData call");
            if( "prc" === args.originalParams.dataSource ) {
                tenantLastCall[args.user.tenantId] = args.originalParams.dataSource;
                var options = {//eslint-disable-line no-inner-declarations
                    host: 'localhost',
                    port: "8888",
                    path: '/cardreader/default'
                };

                var callback = function( response ) {//eslint-disable-line no-inner-declarations
                    var str = '';

                    response.on( 'data', function( chunk ) {
                        str += chunk;
                    } );

                    response.on( 'end', function() {
                        args.callback( null, JSON.parse( str ) );
                    } );
                };

                var req = http.request( options, callback );//eslint-disable-line no-inner-declarations

                req.on( 'error', function( error ) {
                    Y.log( "cannot connect to PRCS: " + error, 'warn', NAME );
                    args.callback( "Verbindung zu Datensafe Kartenleser Software fehlgeschlagen." );
                } );

                req.end();

            }
            else {
                if( tenantSockets[args.user.tenantId] ) {
                    tenantLastCall[args.user.tenantId] = args.originalParams.dataSource;

                    //setting some defaults
                    if (!args.originalParams.callID) {
                        args.originalParams.callID = base64Gen(16);
                    }
                    if (!args.originalParams.urlSuffix) {
                        args.originalParams.urlSuffix = "";
                    }
                    
                    
                    var tenant = args.user.tenantId;//eslint-disable-line no-inner-declarations
                    var callID = args.originalParams.callID;//eslint-disable-line no-inner-declarations
                    var dataSource = args.originalParams.dataSource;//eslint-disable-line no-inner-declarations
                    var socketId = dataSource.match(/^(\/?).*?(?=\/)/)[0];//eslint-disable-line no-inner-declarations
                    var curSocket = tenantSockets[tenant][socketId] || tenantSockets[tenant]["/"+socketId];//eslint-disable-line no-inner-declarations
                    if (0 === args.originalParams.dataSource.indexOf("/")) {
                        args.originalParams.dataSource = dataSource.substring(1,dataSource.length);
                    }
                    requests[callID] = new Request( args, 40000 );
                    
                    dbg("trying to send to "+socketId+" ("+(curSocket?"exists":"doesn't exist")+") with callID "+callID);
                    if (!curSocket) {  return args.callback(Y.doccirrus.errors.rest(16000));  }
                    curSocket.emit( 'cr.getCardData', args.originalParams );
                }
                else {
                    return args.callback( null, {data: [{Error: "ausgewählter Computer mit Kartenleser Software antwortet nicht."}]} );
                }
            }
        }

        /**
         * Called preferably from cardreader; Answer to device list request.
         * @method returnDeviceListSIO
         * @param {Object} response
         * @param {Object} socket
         */
        function returnDeviceListSIO( response, socket ) {
            var myRequest = requests[response.meta.callID];
            dbg("returnDeviceList call with: "+ util.inspect( response ));
            if( myRequest ) {
                dbg("found associated request");
                //add response to temporary list to hold data of all CRServers, including seperation by ID
                var curDevList = [];//eslint-disable-line no-inner-declarations
                for( var i = 0; i < response.data.length; i++ ) {//eslint-disable-line no-inner-declarations
                    var nameElements = response.data[i].split("::");//eslint-disable-line no-inner-declarations
                    var text = nameElements[0];//eslint-disable-line no-inner-declarations
                    text = nameElements[2] || nameElements[0]+" - "+nameElements[1];
                    
                    var sourceString = socket.id + "/" + nameElements[0]+"::"+nameElements[1]+((nameElements[2])?("::"+nameElements[2]):"");//eslint-disable-line no-inner-declarations
                    curDevList.push( {
                        text: text,
                        source: sourceString,
                        mobile: !(nameElements[3] && "Y" !== nameElements[3]),
                        host: "(" + response.meta.hostUser + ")"
                    } );
                    if (tenantLastCall[myRequest.tenant] && tenantLastCall[myRequest.tenant] === sourceString && myRequest.args.port) {
                        dbg("yeah, found the one from last time: "+sourceString);
                        myRequest.args.port.emit("cr.lastDeviceFound", {
                            data: {
                                callID: response.meta.callID,
                                text: text,
                                source: sourceString
                            }
                        });
                    }

                }
                dbg("current device List: "+ util.inspect( curDevList ));
                if (myRequest.args.port) {
                    myRequest.args.port.emit("cr.returnDeviceList", {
                        data: {
                            devList: curDevList,
                            callID: response.meta.callID
                        }
                    });
                }
                else {
                    dbg("no port to send request to, request is: "+ util.inspect(myRequest));
                }
                
                myRequest.devList = myRequest.devList.concat(curDevList);
                dbg("expanded devList: "+util.inspect(myRequest.devList));

                //count responses up
                myRequest.CRSAmount++;
                //check if we have equal or more responses than there are devices for the tenant.
                if( myRequest.CRSAmount >= Object.keys( tenantSockets[myRequest.tenant] ).length ) {
                    dbg("another fulfilled request bites the dust: "+myRequest.callID);
                    dbg("accumulated devices: "+ util.inspect(myRequest.devList));
                    if (myRequest.args.callback) {
                        dbg("very definitely callback here");
                        var sources = [];//eslint-disable-line no-inner-declarations
                        for(var j = 0; j < myRequest.devList.length; j++) {//eslint-disable-line no-inner-declarations
                            sources.push(myRequest.devList[j].source);

                        }
                        myRequest.args.callback( null, {data: sources} );
                    }
                    if (myRequest.args.port) {
                        myRequest.args.port.emit("cr.doneListing", {data: {callID: response.meta.callID}});
                    } else {
                        dbg("no port to send request to, request is: "+ util.inspect(myRequest));
                    }

                    delete requests[response.meta.callID];
                }
            }
        }

        /**
         * Called preferably from cardreader; Answer to card data request.
         * Calls stored callback.
         * @method returnCardData
         * @param {Object} response
         */
        function returnCardData( response ) {
            dbg("returnCardData called");
            if( requests[response.meta.callID] && requests[response.meta.callID].callback ) {
                requests[response.meta.callID].callback( null, response );
                delete requests[response.meta.callID];
            }
        }

        /**
         * Called preferably from client; request to send last used device.
         * Stores callback and calls appropriate socket
         * @method getLastDevice
         * @param {Object} args
         * @return {Function} callback
         */
        function getLastDevice( args ) {
            //check if tenant has socks
            if( tenantLastCall[args.user.tenantId] ) {
                if( "prc" === tenantLastCall[args.user.tenantId] ) {
                    return args.callback( null, [
                        {
                            text: "Datensafe",
                            source: tenantLastCall[args.user.tenantId]
                        }
                    ] );
                }
                var nameElements = tenantLastCall[args.user.tenantId].split( "/" )[1].split("::");//eslint-disable-line no-inner-declarations
                var text = nameElements[0];//eslint-disable-line no-inner-declarations
                if (2 === nameElements.length) {  text = nameElements[0]+" - "+nameElements[1];  }
                if (2 < nameElements.length) {  text = nameElements[2];  }

                return args.callback( null, [
                    {
                        text: text,
                        source: tenantLastCall[args.user.tenantId]
                    }
                ] );
            }

            args.callback( null, [] );
        }

        /**
         * Calls back with mapped patient data, original patient data and card errors.
         *
         * @param   {Object}            args
         */
        function getPatientFromCard( args ) {
            Y.log('Entering Y.doccirrus.api.crManager.getPatientFromCard', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.crManager.getPatientFromCard');
            }
            var user = args.user,
                params = args.originalParams,
                callback = args.callback;
            function onCardData( err, result ) {
                if( err ) {
                    return callback( err );
                }

                if( !result ) {
                    return callback( new Error( 'No Data' ) );
                }
                Y.doccirrus.cardreader.mapCardData( user, result, callback );

            }

            Y.doccirrus.api.crManager.getCardData( {
                user: user,
                originalParams: {
                    dataSource: params.dataSource
                },
                callback: onCardData
            } );

        }


        /**
         * debug logging function, so that we don't need to delete debug logging messages in this module
         * @method dbg
         * @param {String} msg
         */
        function dbg(msg) {Y.log("crmanager debug: "+msg, 'debug', NAME);}

        /**
         * quickly generate base64 number of given length
         * @method base64Gen
         * @param {Number} len
         *
         * @return {String}
         */
        function base64Gen(len) {
            var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", rtn="";
            for (var i = 1; i<len; i++) {rtn += alphabet[Math.floor(Math.random()*alphabet.length)];} //eslint-disable-line no-inner-declarations
            return rtn;
        }
        
        Y.namespace( 'doccirrus.api' ).crManager = {
            /**
             * @property name
             * @type {String}
             * @default dccrmanager
             * @protected
             */
            name: NAME,
            port: port,
            init: function( newPort ) {
                init( newPort );
            },
            getCardData: function( args ) {
                Y.log('Entering Y.doccirrus.api.crManager.getCardData', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.crManager.getCardData');
                }
                getCardData( args );
            },
            getLastDevice: function( args ) {
                Y.log('Entering Y.doccirrus.api.crManager.getLastDevice', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.crManager.getLastDevice');
                }
                getLastDevice( args );
            },
            getDeviceList: function(args) {
                Y.log('Entering Y.doccirrus.api.crManager.getDeviceList', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.crManager.getDeviceList');
                }
                getDeviceListSIO(args);
            },
            getPatientFromCard: getPatientFromCard
        };

    },
    '0.0.1', {requires: ['cardreader']}
);
