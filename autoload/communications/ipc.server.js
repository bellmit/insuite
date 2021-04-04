/**
 * User: mahmoud
 * Date: 28/01/15  11:52
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

'use strict';

YUI.add( 'dcipc', function( Y, NAME ) {
        const process = require( 'process' );
        const cluster = require( 'cluster' );
        const redis = require( 'redis' );
        const fs = require( 'fs' );
        const path = require( 'path' );
        const util = require( 'util' );

        Y.log( 'Adding DCIPC YUI module.', 'debug', NAME );

        class RedisIPCAdapter {

            /**
             *  Initialize event emitter
             *  @constructor
             */

            constructor() {
                const self = this;

                self.serverType = '';

                //  name the IPC channel for the server type to prevent crosstalk of instances in dev
                self.serverType = Y.doccirrus.auth.isVPRC() ? 'VPRC' : self.serverType;
                self.serverType = Y.doccirrus.auth.isPRC() ? 'PRC' : self.serverType;
                self.serverType = Y.doccirrus.auth.isISD() ? 'ISD' : self.serverType;
                self.serverType = Y.doccirrus.auth.isPUC() ? 'PUC' : self.serverType;

                self.CHANNEL_NAME = 'DCIPC' + self.serverType;

                Y.log( `DCIPC constructing redis adapter for channel ${self.CHANNEL_NAME}`, 'debug', NAME );

                //  Dispose of uncalled single-use event handlers if not called after this time
                //  TODO: make configurable (in redis.json?)
                self.ASYNC_TIMEOUT = 60 * 60 * 1000;            //  wait for one hour
                self.CLEANUP_INTERVAL = 60 * 10 * 1000;         //  do cleanup every ten minutes
                self.MAX_RETRY_INTERVAL = 3000;                 //  reconnect spaced at most 3s

                self.events = {
                    WORKER_INITIALIZED: 'WORKER_INITIALIZED',
                    REMOTE_CALLBACK: 'IPC_REMOTE_CALLBACK',
                    ACKNOWLEDGE_MESSAGE: 'ACK',
                    IPC_PING: 'IPC_PING',
                    IPC_LIST_SUBSCRIBERS: 'IPC_LIST_SUBSCRIBERS',
                    IPC_SET_NOISY: 'IPC_SET_NOISY',
                    IPC_ONCE: 'IPC_ONCE',
                    RESTART_SERVER: 'RESTART_SERVER',
                    TOGGLE_LOGGING: 'TOGGLE_LOGGING'
                };

                //  Event handlers are stored in a map to check for duplicates and unused callbacks
                self.handlers = new Map();

                //  redis requires two connections for pub/sub, one to send messages, one to receive them
                self.redisOut = null;
                self.redisIn = null;

                //  will be set from config later in boot process, from dcdb.server.js
                self.redisConfig = null;

                //  by default do not show detailed logging, it's very noisy, can be enabled by /1/test/:ipclogging
                self.useNoisyLogging = false;

                //  add default subscribers for ping, introspection and logging
                self.subscribeNamed(
                    self.events.IPC_PING, NAME, true,
                    ( data, cb ) => { self.onPing( data, cb ); }
                );

                self.subscribeNamed(
                    self.events.IPC_LIST_SUBSCRIBERS, NAME, true,
                    ( data, cb ) => { self.onListSubscribers( data, cb ); }
                );

                self.subscribeNamed(
                    self.events.IPC_SET_NOISY, NAME, true,
                    ( data, cb ) => { self.onSetNoisy( data, cb ); }
                );

                self.subscribeNamed(
                    self.events.TOGGLE_LOGGING, NAME, true,
                    ( data ) => { Y.doccirrus.utils.setLogLevel( data ); }
                );
            }

            /**
             *  Connect this instance to redis-server after workers have been forked
             *
             *  Called from dcdb.server.js early in server startup
             *
             *  Note that we require two connections to the redis-server in order to pub/sub:
             *  https://github.com/clue/php-redis-react/issues/39
             */

            connectRedis() {
                const
                    self = this;

                Y.log( 'Creating redis client for IPC', 'debug', NAME );

                //  1.  Get (optional) config from disk and set the retry stategy

                self.redisConfig = Y.doccirrus.utils.tryGetConfig( 'redis.json', {
                    "path": "/var/run/redis/redis.sock",
                    "socket_keepalive": true,
                    "disable_resubscribing": false
                } );

                self.redisConfig.retry_strategy = function( options ) { return self.retryStrategy( options ); };

                self.noisy( `connecting to redis... ${JSON.stringify(self.redisConfig)}` );

                //  2.  Set up inbound redis connection (receives messages)

                self.redisIn = redis.createClient( self.redisConfig );

                self.redisIn.on( 'connect', () => {
                    Y.log( 'Redis listener connected to redis server', 'info', NAME );
                } );

                self.redisIn.on( 'ready', () => {
                    Y.log( 'Redis listener ready', 'info', NAME );
                    self.subscribeRedis();
                } );

                self.redisIn.on( 'reconnecting', () => {
                    Y.log( 'Redis listener disconnected from redis server, reconnecting...', 'info', NAME );
                } );

                self.redisIn.on( 'error', ( err ) => {
                    Y.log( `Redis listener connection error. ${JSON.stringify( err )}`, 'warn', NAME );
                } );

                self.redisIn.on( 'message', ( channel, message ) => {
                    self.onMessageReceived( channel, message );
                } );

                //  3.  Set up outbound redis connection (sends messages)

                self.redisOut = redis.createClient( self.redisConfig );

                self.redisOut.on( 'connect', () => {
                    Y.log( 'Redis publisher connected to redis server', 'info', NAME );
                    self.raise( Y.doccirrus.ipc.events.WORKER_INITIALIZED, {}, null );

                } );

                self.redisOut.on( 'ready', () => {
                    Y.log( 'Redis publisher connected to redis server', 'info', NAME );
                    self.subscribeRedis();
                } );

                self.redisOut.on( 'reconnecting', () => {
                    Y.log( 'Redis publisher disconnected from redis server, reconnecting...', 'info', NAME );
                } );

                self.redisOut.on( 'error', ( err ) => {
                    Y.log( `Redis publisher connection error. ${JSON.stringify( err )}`, 'warn', NAME );
                } );

                //  4.  Set a timer to check for and clean up uncalled callbacks of sendAsync

                setInterval( () => { self.cleanupHandlers(); }, self.CLEANUP_INTERVAL );
            }

            /**
             *  Subscribe to DCIPC channel on redis (inbound connection)
             */

            subscribeRedis() {
                const self = this;
                Y.log( `Redis client subscribing to channel: ${self.CHANNEL_NAME}`, 'debug', NAME );
                self.redisIn.subscribe( self.CHANNEL_NAME );
            }

            /**
             *  Used to control redis reconnection in case of broken link
             *
             *  TODO: review, we probably want to try forever and be noisy about this
             *
             *  For additional options, see documentation at: https://www.npmjs.com/package/redis
             *
             *  @param  {Object}    options
             *  @param  {Number}    options.attempt             Number of (re)connection attempts so far
             *  @param  {Number}    options.total_retry_time    In milliseconds
             *  @param  {Object}    [options.error]             Error associated with this failure to connect
             *  @return {Number}
             */

            retryStrategy( options ) {
                const self = this;

                Y.log( `Lost connection to redis-server, attempting reconnect since ${options.total_retry_time}`, 'warn', NAME );
                self.noisy( `attempting to reconnect to to server, options: ${JSON.stringify(options)}` );

                if ( options.error ) {

                    if ( options.error.code === 'ECONNREFUSED' ) {
                        Y.log( `IPC connection refused: ${options.error.stack||options.error}`, 'error', NAME );
                        Y.log( 'Please check config in redis.json and ensure that the redis service is started.', 'error', NAME );
                        Y.log( 'ps -aux | grep redis-server', 'error', NAME );
                    } else {
                        Y.log( `IPC connection failed: ${options.error.stack||options.error}`, 'error', NAME );
                        Y.log( 'Please check config in redis.json.', 'error', NAME );
                    }

                }

                // reconnect after
                return Math.min(options.attempt * 100, self.MAX_RETRY_INTERVAL);
            }

            //  MANAGE MAP OF EVENT HANDLERS

            /**
             *  Subscribe to IPC events passed over event emitter
             *  This is a just a local subscription, messages received from redis come in on a single channel and
             *  are distributed from local map of callbacks
             *
             *  DEPRECATED, legacy support until subscriber names are added
             *
             *  @param  {String}    name        the event/command name
             *  @param  {Function}  callback    called when a message with this name is received
             */

            subscribe( name, callback ) {
                const self = this;
                self.noisy( `DEPRECATED subscribe to ${name} ANONYMOUS with callback.` );
                return self.subscribeNamed( name, 'UNNAMED', false, callback );
            }

            /**
             *  Subscribe to IPC events passed over event emitter
             *
             *  This version of the method names the caller for introspection, etc, storing callbacks in a map
             *  rather than a standard event emitter.
             *
             *  This is a just a local subscription, messages received from redis come in on a singel channel and
             *  are distributed via a local event emitte (self.ee)
             *
             *  @param  {String}    eventName       the event/command name
             *  @param  {String}    subscriberName  string uniquely identifying the caller
             *  @param  {Boolean}   single          True if there should only be one subscription with this event and handler name
             *  @param  {Function}  callback        called when a message with this name is received
             *  @return {Boolean}                   True if subscription was successful
             */

            subscribeNamed( eventName, subscriberName, single, callback ) {
                const self = this;
                let i;

                self.noisy( `subscribeNamed ${eventName} from ${subscriberName}` );

                //  1.  Sanity

                if ( 'function' !== typeof callback ) {
                    Y.log( `Tried to register invalid event handler: ${eventName} ${subscriberName}`, 'error', NAME );
                    return false;
                }

                //  2.  Get the set of handlers for this named event, check if subscriber is a duplicate

                let extant = self.handlers.has( eventName ) ? self.handlers.get( eventName ) : [];

                if ( single ) {
                    for ( i = 0; i < extant.length; i++ ) {
                        if ( extant[i].subscriberName === subscriberName ) {
                            Y.log( `Refusing duplicate subscription ${eventName} ${subscriberName}`, 'error', NAME );
                            return false;
                        }
                    }
                }

                //  3.  Add named subscriber to the set and return to the map

                extant.push( {
                    'subscriberName': subscriberName,
                    'callback': callback,
                    'raised': 0
                    //  may in future add more debugging info here (times, stack traces, etc)
                } );

                self.handlers.set( eventName, extant );
                return true;
            }

            /**
             *  Remove all subscriptions to an event for the named subscriber
             *
             *  @param  {String}    eventName
             *  @param  {String}    subscriberName
             */

            unsubscribeNamed( eventName, subscriberName ) {
                const self = this;

                if ( !self.handlers.has( eventName ) ) { return; }

                let
                    extant = self.handlers.get( eventName ),
                    reduced = [],
                    i;

                for ( i = 0; i < extant.length; i++ ) {
                    if ( extant[i].subscriberName !== subscriberName ) {
                        reduced.push( extant[i] );
                    }
                }

                //  Tidy up the map, don't keep empty arrays of event handlers
                //  This is because sendAsync events have unique names which accumulate
                if ( 0 === reduced.length ) {
                    self.handlers.delete( eventName );
                    return;
                }

                self.handlers.set( eventName, reduced );
            }

            /**
             *  Raise an event, ie:
             *  Call each handler for the named event with the data and [callback] provided
             *
             *  @param  {String}    eventName   Name of an event
             *  @param  {Object}    data        Properties of the event
             *  @param  {Function}  [callback]  Optional callback
             */

            raise( eventName, data, callback ) {
                const self = this;

                //  if there are no subscribers to this event, we're done
                if ( !self.handlers.has( eventName ) ) {
                    self.noisy( `no handlers for ${eventName}, discarding ${eventName}` );
                    return;
                }

                let extant = self.handlers.get( eventName );

                self.noisy( `raise ${eventName} to handlers: ${extant.length}` );

                extant.forEach( ( handler ) => {
                    handler.callback( data, callback );
                    handler.raised = handler.raised + 1;
                } );
            }

            /**
             *  Will call back only once the event is triggered
             *
             *  @param  {String}    eventName
             *  @param  {Function}  callback
             */

            oneTimeSubscribe( eventName, callback ) {
                const self = this;

                let
                    extant = self.handlers.has( eventName ) ? self.handlers.get( eventName ) : [],
                    subscriberName = self.events.IPC_ONCE;

                self.noisy( `oneTimeSubscribe: ${eventName}` );

                function unsubAndCall( data ) {
                    //  remove subscription to this event
                    self.unsubscribeNamed( eventName, self.events.IPC_ONCE );
                    callback( data );
                }

                //  Add named subscriber to the set and return to the map
                extant.push( {
                    'subscriberName': subscriberName,
                    'callback': unsubAndCall,
                    'timeout': ( ( new Date() ).getTime() + self.ASYNC_TIMEOUT ),
                    'cleanup': true,
                    'raised': 0
                    //  may in future add more debugging info here (times, stack traces, etc)
                } );

                self.handlers.set( eventName, extant );
            }

            /**
             *  Called periodically by a timer to check for uncalled callbacks from sendAsync which may be building up
             */

            cleanupHandlers() {
                const self = this;
                let timeNow = ( new Date() ).getTime();

                self.handlers.forEach( cleanupSingleEvent );

                self.noisy( 'Cleaning up uncalled event handlers.' );

                function cleanupSingleEvent( extant, eventName ) {
                    let reduced = [], i;

                    for ( i = 0; i < extant.length; i++ ) {
                        if ( extant[i].cleanup && ( timeNow > extant[i].timeout ) ) {
                            //  Make a noise about this in the log
                            Y.log( `Deleting uncalled callback ${eventName} ${extant[i].subscriberName}`, 'warn', NAME );
                        } else {
                            reduced.push( extant[i] );
                        }
                    }

                    //  don't keep empty arrays of event handlers
                    if ( 0 === reduced.length ) {
                        self.handlers.delete( eventName );
                        return;
                    }

                    self.handlers.set( eventName, reduced );
                }
            }

            //  SEND AND RECEIVE MESSAGES VIA REDIS

            /**
             *  Send data to all other parties including the master, excluding the sender
             *
             *  Request will be passed over redis channel along with metadata
             *
             *  @param  {String}        name            the event/command
             *  @param  {JSON|Object}   data            plain object to be sent by IPC
             *  @param  {boolean}       quiet_          LEGACY, unused
             *  @param  {boolean}       onlyMaster      if true, then addressed to maser instance
             */

            async send( name, data, quiet_, onlyMaster = false ) {
                const self = this;
                let err, msg;

                self.noisy( `${self.pid()} send: ${name} ${JSON.stringify(data)}` );

                if ( !self.redisOut ) {
                    self.noisy( `ERROR: Received request to send IPC '${name}' before client was initialized.` );

                    err = new Error( `Received request to send IPC '${name}' before client was initialized.` );
                    Y.log( `${err.stack}`, 'error', NAME );
                    return;
                }

                msg = {
                    'from': self.pid(),
                    'to': ( onlyMaster ? 'master' : '*' ),
                    'name': name,
                    'data': data,
                    'ack': false
                };

                self.noisy( `send, publishing: ${JSON.stringify( msg )}` );

                return new Promise( resolve => {
                    self.redisOut.publish( self.CHANNEL_NAME, JSON.stringify( msg ), ()=>{
                        /**
                         * The callback will always have error = null and reply as number ex. 2 if successful
                         * We don't care what the result of the callback is so excluding handling the response
                         * from redis
                         */
                        resolve();
                    } );
                } );
            }

            getUniqueId() {
                const
                    mongoose = require( 'mongoose' ),
                    objectId = new mongoose.Types.ObjectId();

                return `${objectId}`;
            }

            /**
             *  Communicate to master via the callback
             *
             *  @param  {String}    name
             *  @param  {Object}    data
             *  @param  {Function}  callback    will be called after the receiver calls its callback
             */

            sendAsync( name, data, callback ) {
                const
                    self = this;

                let
                    //  used for unique id
                    randId = self.getUniqueId(),
                    myCBEvent = `${self.events.REMOTE_CALLBACK}_${name}_${randId}`,
                    msg;

                self.noisy( `sendAsync: ${name} ${JSON.stringify(data)}` );

                //  A listener will be set up to wait for the response from the master, when we receive it
                //  format the response and call back

                function oneTimeCallback( args ) {
                    args = args || {};
                    let
                        argsArr = [],
                        i;

                    for( i = 0; i < Object.keys( args ).length; i++ ) {
                        argsArr.push( args[i] );
                    }
                    callback.apply( null, argsArr );
                }

                //  if already on master we don't need to send it by IPC

                if( self.isMaster() ) {
                    self.noisy( `sendAsync, isMaster: ${myCBEvent}` );

                    self.raise( name, data, oneTimeCallback );
                    //self.ee.emit( name, data, oneTimeCallback );
                }

                self.noisy( `sendAsync: myCBEvent id: ${myCBEvent}` );

                msg = {
                    'from': self.pid(),
                    'to': 'master',
                    'name': name,
                    'data': data,
                    'ack': myCBEvent
                };

                //  on receiving the event, the master's event handler will also get a callback, which when called will
                //  issue another IPC event addressed to this worker, named for myCBEvent
                self.oneTimeSubscribe( myCBEvent, oneTimeCallback );

                self.redisOut.publish( self.CHANNEL_NAME, JSON.stringify( msg ) );
            }

            //  QUERYING PROCESSES / PIDS / WORKER STATUS

            /**
             * Check if the current instance is Master within the cluster
             * @returns {Boolean}
             */

            isMaster() {
                return cluster.isMaster;
            }

            /**
             * return a name string useful for logging
             * @returns {String}
             */

            whoAmI() {
                return cluster.isMaster ? 'Master' : 'Worker ' + cluster.worker.id;
            }

            /**
             * Returns pid of current instance (master or worker)
             * @returns pid
             */

            pid() {
                return cluster.isMaster ? process.pid : cluster.worker.process.pid;
            }

            /**
             * Return list of all pids.
             * @throws if process is worker
             *
             * NOTE: this seems only to be used by invloicelog process, may be removed
             *
             * @returns {Array}
             */

            getPids() {
                var i, result = [];
                if( !cluster.isMaster ){
                    throw Error( 'only implemented for master' );
                }
                for( i in cluster.workers ) {
                    if( cluster.workers.hasOwnProperty( i ) ) {
                        result.push( cluster.workers[i].process.pid );
                    }
                }
                return result;
            }

            /**
             * means to find out if server is ready to process requests
             * matters only on master
             * @returns {boolean}
             */
            workersReady() {
                var i;
                if( cluster.isMaster ) {
                    for( i in cluster.workers ) {
                        if( cluster.workers.hasOwnProperty( i ) ) {
                            if( 'listening' !== cluster.workers[i].state ) {
                                return false;
                            }
                        }
                    }
                }
                return true;
            }

            /**
             *  Noisy logging used for debugging IPC
             *  @param msg
             */

            noisy( msg ) {
                const self = this;
                if ( !self.useNoisyLogging ) { return; }
                Y.log( `${self.pid()} ${msg}`, 'info', NAME );
            }

            //  REDIS EVENTS

            /**
             *  Handle messages received from redis pub/sub channel
             *
             *  @param  {String}    channel     Should always be DCIPC
             *  @param  {String}    message     JSON serialized
             */

            onMessageReceived( channel, message ) {
                const self = this;
                let
                    addressedToMe = false,
                    pid = self.pid(),
                    response_callback,
                    msgObj;

                self.noisy( `message received on channel ${channel}: ${message}` );

                //  1.  Decode the message

                // recover regexp object: e.g used as query in reporting
                const reviver = ( key, value ) => {
                    if( key === '$regex' && value ){
                        let regexValue = value || '';
                        if( typeof regexValue !== 'string' ){ //toString preferred to keep content of RegExp
                            regexValue = regexValue.toString ? regexValue.toString() : JSON.stringify(regexValue);
                        }
                        let regexpArr = regexValue.split('/');
                        if( regexpArr && regexpArr[1]){
                            value = new RegExp( regexpArr[1], regexpArr[2]);
                        } else {
                            value = regexValue;
                        }
                    }
                    return value;
                };

                try {
                    msgObj = JSON.parse( message, reviver );
                } catch ( parseErr ) {
                    //  should not happen
                    Y.log( `IPC received broken message via redis-server, could not parse: ${parseErr.stack||parseErr}`, 'error', NAME );
                    Y.log( `Rejected IPC message: ${message}`, 'error', NAME );
                    return;
                }

                //  2.  Check if this instance should recieve it, or if it is no addressed to us

                if ( '*' === msgObj.to ) {
                    //  message is addressed to all instance
                    self.noisy( `received message addressed to all instances.` );
                    addressedToMe = true;
                }

                if ( 'master' === msgObj.to && self.isMaster() ) {
                    self.noisy( `received message for master, am master, keeping.` );
                    addressedToMe = true;
                }

                if ( pid === msgObj.to ) {
                    self.noisy( `received message addressed only to me, keeping.` );
                    addressedToMe = true;
                }

                if ( msgObj.from === pid ) {
                    self.noisy( `received message from self, discarding.` );
                    addressedToMe = false;
                }

                if ( !addressedToMe ) {
                    //  message is not for this instance, discard it
                    return;
                }

                //  3.  Set default event callback to warn of callbacks which are non-async/ignored

                //  No response will be sent to the caller unless 'ack' id is sent
                //  If the code receiving the message accepts and calls a callback in this case, we should warn that it
                //  was not returned back to the caller over IPC, as this is likely an error.

                response_callback = function responseCallbackDefault() {
                    Y.log( `Called IPC callback on non-async event '${msgObj.name}', message will not be passed back.`, 'warn', NAME );
                };

                //  4.  Set up callback for ack, to return values by IPC

                if ( msgObj.ack ) {

                    self.noisy( `received message which requires acknowledgement: ${msgObj.ack}` );

                    response_callback = function responseCallbackAck() {

                        let ackMsgStr;
                        const ackMsg = {
                            're': msgObj.ack,
                            'from': self.pid(),
                            'to': msgObj.from,
                            'name': msgObj.ack,
                            'data': arguments,
                            'ack': false,
                            'fs': false
                        };

                        try {
                            ackMsgStr = JSON.stringify( ackMsg );
                        } catch( err ) {
                            return Y.log( `Error sending IPC ack response: ${err.stack || err}`, 'error', NAME );
                        }

                    // Sharing Data over the file system ---------------------------------------------------------------
                        if( Buffer.byteLength( ackMsgStr ) > 8000000 ) { // The message is larger than 8MB
                            Y.log( 'IPC: messages larger than 8MB should not be sent over IPC. Trying to share data over the file system instead.', 'error', NAME );

                            const tmpPath = path.normalize( `/var/tmp/${ackMsg.name}` );
                            const writePromises = [];
                            ackMsg.fs = [];

                            for( let i = 0; i < ackMsg.data.length; i++ ) {
                                if( ackMsg.data[i] instanceof Buffer ) {
                                    writePromises.push( util.promisify( fs.writeFile )( `${tmpPath}_${i}`, ackMsg.data[i] )
                                        .then( () => Y.log( `IPC: message data was successfully written to the file system: ${tmpPath}_${i}.`, 'info', NAME ) ) );

                                    delete ackMsg.data[i];
                                    ackMsg.fs.push( {
                                        index: i,
                                        tmpPath: `${tmpPath}_${i}`
                                    } );
                                }
                            }

                            return Promise.all( writePromises )
                                .then( () => {
                                    const ackMsgStr = JSON.stringify( ackMsg );
                                    if( Buffer.byteLength( ackMsgStr ) > 8000000 ) { // The message is larger than 8MB
                                        Y.log( 'IPC: all buffers were shared over the file system and the message data still exceeds 8MB.', 'error', NAME );
                                        const deletePormises = [];
                                        for( let i = 0; i < ackMsg.fs.length; i++ ) {
                                            deletePormises.push( util.promisify( fs.unlink )( ackMsg.fs[i].tmpPath ) );
                                        }
                                        return Promise.all( deletePormises );
                                    } else {
                                        return publish( ackMsgStr );
                                    }
                                } )
                                .catch( err => Y.log( `IPC: error in sending IPC message: the message was larger than 8MB and it was not possible to share the data over the file system. ${err.stack || err}`, 'error', NAME ) );
                    // Sharing Data over the file system -END ----------------------------------------------------------
                        } else {
                            return publish( ackMsgStr );
                        }

                        function publish( ackMsgStr ) {
                            self.noisy( `IPC ack callback called, returning response: ${JSON.stringify( ackMsgStr )}` );
                            self.redisOut.publish( self.CHANNEL_NAME, ackMsgStr );
                        }
                    };

                    //  if there is no listener, but the IPC caller expects a response, then this is probably an error
                    if ( !self.handlers.has( msgObj.name ) ) {
                        Y.log( `called async IPC method with no listener: ${msgObj.name}`, 'error', NAME );
                        //  TODO: test error callback here, to be discussed
                    }

                }

                //  5.  emit the event

                self.noisy( `relay message via event emitter: ${msgObj.name}: ${JSON.stringify(msgObj.data)}` );

                if( Array.isArray( msgObj.fs ) ) {
                    Y.log( 'IPC: the received IPC message does not contain all the data. Trying to retrieve the missing data over the file system. ', 'info', NAME );
                    const readPromises = [];

                    for( let i = 0; i < msgObj.fs.length; i++ ) {
                        readPromises.push(
                            util.promisify( fs.readFile )( msgObj.fs[i].tmpPath )
                                .then( data => {
                                    msgObj.data[msgObj.fs[i].index] = JSON.stringify( data );
                                } )
                                .then( () => util.promisify( fs.unlink )( msgObj.fs[i].tmpPath ) )
                                .then( () => Y.log( `IPC: message data was successfully read and deleted from the file system: ${msgObj.fs[i].tmpPath}`, 'info', NAME ) )
                        );
                    }
                    return Promise.all( readPromises )
                        .then( () => {
                            self.raise( msgObj.name, msgObj.data, response_callback );
                        } )
                        .catch( err => Y.log( `IPC: error in reading IPC data from the file system. ${err.stack || err}`, 'error', NAME ) );

                } else {
                    self.raise( msgObj.name, msgObj.data, response_callback );
                }
            }

            /**
             *  Respond to ping
             *
             *  @param  {Object}    data
             *  @param  {String}    data.msg                    Message to be repeated back to caller
             *  @param  {Number}    data.wait                   milliseconds, Test delayed IPC / cleanup of uncalled callbacks
             *  @param  {Boolean}   data.cleanupImmediately     perform a cleanup of expired handlers
             *  @param  {Function}  callback                    Of the form fn( err, { msg: 'PONG message', ... } )
             */

            onPing( data, callback ) {
                const self = this;
                data.msg = 'PONG ' + data.msg;
                data.serverWhoAmI = Y.doccirrus.ipc.whoAmI();

                if ( data.cleanupImmediately ) {
                    self.noisy( 'Performing handler cleanup during ping.' );
                    self.cleanupHandlers();
                }

                if ( !data.wait ) {
                    return callback( null, data );
                }

                setTimeout( function() { callback( null, data ); }, data.wait );
            }

            /**
             *  Call back with a list of registered subscribers
             *
             *  @param  {Object}    data        Unused
             *  @param  {Function}  callback    Of the form fn( err, [ .. subscribers ... ] }
             */

            onListSubscribers( data, callback ) {
                const self = this;
                let listSubs = [];
                self.handlers.forEach( listAllHandlers );

                listSubs.push( {
                    'name': 'whoAmI',
                    'val': self.whoAmI(),
                    'count': 1
                } );

                function listAllHandlers( extant, eventName ) {
                    let subs = [], i;

                    for ( i = 0; i < extant.length; i++ ) {
                        subs.push( {
                            'subscriberName': extant[i].subscriberName,
                            'raised': extant[i].raised
                        } );
                    }

                    listSubs.push( {
                        'name': eventName,
                        'count': extant.length,
                        'subs': subs
                    } );
                }

                callback( null, listSubs );
            }

            /**
             *  Event to enable/disable noisy logging
             *
             *  @param  {Object}    data
             *  @param  {Boolean}   data.noisy    New state of useNoisyLogging
             */

            onSetNoisy( data ) {
                const self = this;
                self.useNoisyLogging = true;
                self.noisy( `setting noisy logging to ${data.noisy}` );
                self.useNoisyLogging = data.noisy || false;
            }

        } // end RedisIPCAdapter

        Y.namespace( 'doccirrus' ).ipc = new RedisIPCAdapter();

    },
    '0.0.1', {
        requires: [
            'dckronnd',
            'dcauth',
            'dcutils'
        ]
    }
);