/**
 * User: pi
 * Date: 20.11.14  14:09
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */


/**
 * This is a library of communication methods that are available throughout mojito without
 * having to dynamically boot the action context into including them.
 *
 * Uses the YUI namespace.
 */




/*global YUI, io*/

'use strict';

YUI.add( 'dccommunication-client', function( Y, NAME ) {
        /**
         * dccommunication Module
         * @module dccommunication
         */
        var
            listeners = {},
            TEST_PACKAGE_SIZE = 20480,
            i18n = Y.doccirrus.i18n,
            SUBSCRIBED = i18n( 'communications_clientJS.message.SUBSCRIBED' ),
            speedTestString = Y.doccirrus.comctl.getRandomString( TEST_PACKAGE_SIZE ); //in bytes

        /**
         * Socket.
         * @class Socket
         * @constructor
         */
        function Socket() {
            var self = this;
            self.socket = null;

        }

        Socket.prototype = {
            constructor: Socket,
            const: {
                TIMEOUT: 'timeout'
            },
            EVENTS: Object.freeze( {
                SUBSCRIBE_COLLECTION: 'SUBSCRIBE_COLLECTION',
                RELEASE_SUBSCRIPTION: 'RELEASE_SUBSCRIPTION',
                HAS_COLLECTION_SUBSCRIBER: 'system.hasCollectionSubscriber',
                MESSAGE_TO: 'system.messageTo',
                MESSAGE_TO_ME: 'system.messageToMe',
                MESSAGE_TO_MY_SESSION: 'system.messageToMySession'
            } ),
            /**
             * @method _createConnection
             * @param url
             * @param namespace
             * @param params
             * @private
             */
            _createConnection: function( url, namespace, params ) {
                var
                    self = this;
                params = params || '';
                namespace = namespace || '/';
                url = url || '';
                if( self.getSocket( namespace ) ) {
                    Y.log( 'Socket is already connected. url: ' + url + ', namespace: ' + namespace + ', params: ' + params, 'debug', NAME );
                    return;
                }
                Y.log( 'Client is creating connection to server via socket.io. url: ' + url + ', namespace: ' + namespace + ', params: ' + params, 'debug', NAME );
                self.socket = io( url + namespace + params );
            },
            /**
             * Opens connection via socket
             * @method openConnection
             * @param {String} [url] connection url
             * @param {String} [namespace]
             * @return {Object} Socket
             */
            openConnection: function( url, namespace ) {
                var
                    supportsWebRTC = Y.doccirrus.utils.supportsWebRTC(), params = '',
                    self = this;
                url = url || Y.doccirrus.infras.getPrivateURL();
                namespace = namespace || '/';
                if( supportsWebRTC ) {
                    params = '?supportsWebRTC=true';
                }
                self._createConnection( url, namespace, params );

                return self.socket;
            },
            createNspName: function( name ) {
                var result = name;
                if( !name || 'default' === name ) {
                    result = '/';
                } else if( 0 !== name.indexOf( '/' ) ) {
                    result = '/' + name;
                }
                return result;
            },
            /**
             * Returns current active socket
             * @method getSocket
             * @return {Object} Socket
             */
            getSocket: function( nsp ) {
                if( !this.socket ) {
                    return this.socket;
                } else if( nsp || '' === nsp ) {
                    nsp = this.createNspName( nsp );
                    return this.socket.io.nsps[nsp];
                } else {
                    return this.socket;
                }
            },
            /**
             * Parses response and calls appropriate callbacks.
             * @method _parseResponse
             * @param {Object} response response object
             * @param {Function} successCb callback which is fired in response to success request
             * @param {Function} failCb callback which is fired in response to error request
             * @param {Function} alwaysCb callback which is fired in response to any request,
             *          in response to success request the function's arguments are the same as of successCb,
             *          in response to error request - arguments are the same as of failCb
             * @protected
             */
            _parseResponse: function( response, successCb, failCb, alwaysCb ) {
                if( Y.config.debug ) {
                    Y.log( 'Socket received message: ' + JSON.stringify( response ), 'debug', NAME );
                }
                var err,
                    result = {
                        meta: {},
                        data: null
                    },
                    meta = response && response.meta || {};
                response = response || {};
                result.meta = meta;

                if( response.data ) {
                    result.data = response.data;
                }
                if( response.error && response.error.code ) {
                    err = JSON.parse( JSON.stringify( response.error ) );
                    if( !err.data ) {
                        err.data = Y.doccirrus.errorTable.getMessages( err );
                    }
                }
                if( 'function' === typeof failCb && err ) {
                    failCb( err, meta );
                }
                if( 'function' === typeof successCb && !err ) {
                    if( result.meta && (Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY === result.meta.eventType) ) {
                        Y.doccirrus.jsonrpc.api.socketioevent.deleteEventByMessageId( {
                            query: {
                                messageId: result.meta.messageId
                            }
                        } );
                    }
                    successCb( result );
                }
                if( 'function' === typeof alwaysCb ) {
                    if( err ) {
                        alwaysCb( err, meta );
                    } else {
                        alwaysCb( result );
                    }
                }
            },
            /**
             * Sets listener for event.
             * If there is no socket, opens connection
             * @method on
             * @param {Object} config
             * @param {String} config.event event name which triggers callbacks
             * @param {Object} [config.socket] specific socket
             *  If specific socket is provided, it would be used for current action,
             *  otherwise default socket connection will be used.
             * @param {Function} [config.done] callback which is fired in response to success request
             * @param {Function} [config.fail] callback which is fired in response to error request
             * @param {Function} [config.always] callback which is fired in response to any request,
             *          in case of success response the function's arguments are the same as of successCb,
             *          in case of error response - arguments are the same as of failCb
             * @param {String} [config.handlerId="default"] handler id. Allows to set more than 1 handler for same event. Should be unique for event
             * @return {Object} { {Function} listener, {String} handlerId, {Function} removeEventListener }
             * @example
             // event 'foo' has 2 handler(func1, func2)
             Y.doccirrus.communication.on({ event: 'foo', done: func1, handlerId: 'superman'});
             Y.doccirrus.communication.on({ event: 'foo', done: func2, handlerId: 'batman'});

             // event 'foo' has only 'func2' handler
             Y.doccirrus.communication.on({ event: 'foo', done: func1});
             Y.doccirrus.communication.on({ event: 'foo', done: func2});

             // removing event listener
             var superMan = Y.doccirrus.communication.on({ event: 'foo', done: func1, handlerId: 'superman'});
             var batman = Y.doccirrus.communication.on({ event: 'foo', done: func2, handlerId: 'batman'});

             // 1st way
             superMan.removeEventListener();
             // 2nd way
             Y.doccirrus.communication.off( 'foo', 'batman' )
             // or
             Y.doccirrus.communication.off( 'foo', batman.handlerId )
             */
            on: function( config ) {
                //console.log("jm@dc: adding new listener for "+event);
                var self = this,
                    socket = config.socket || self.getSocket( '/' ) || self.socket,
                    event = config.event,
                    successCb = config.done,
                    failCb = config.fail,
                    alwaysCb = config.always,
                    handlerId = config.handlerId || (new Y.doccirrus.mongo.ObjectId()).toString(),
                    myListener = function( message ) {
                        Y.log( 'Communication: socket io event has been emitted(on). Event: ' + config.event, 'debug', NAME );
                        self._parseResponse( message, successCb, failCb, alwaysCb );
                    };

                if( socket ) {
                    socket.on( event, myListener );
                } else {
                    self.openConnection().on( event, myListener );
                }
                listeners[event] = listeners[event] || {};
                listeners[event][handlerId] = myListener;
                return {
                    listener: myListener,
                    handlerId: handlerId,
                    removeEventListener: function() {
                        self.off( event, handlerId, socket );
                    }
                };
            },
            /**
             * Sets listener for event. Listener will be removed after first call.
             * If there is no socket, opens connection
             * @method once
             * @param {Object} config
             * @param {String} config.event event name which triggers callbacks
             * @param {Object} [config.socket] specific socket
             *  If specific socket is provided, it would be used for current action,
             *  otherwise default socket connection will be used.
             * @param {Function} [config.done] callback which is fired in response to success request
             * @param {Function} [config.fail] callback which is fired in response to error request
             * @param {Function} [config.always] callback which is fired in response to any request,
             *          in case of success response the function's arguments are the same as of successCb,
             *          in case of error response - arguments are the same as of failCb
             * @param {String} [config.handlerId] unique handler id. Is needed to set more than 1 handler for same event.
             * @return {Object} { {Function} listener, {String} handlerId, {Function} removeEventListener }
             * @example
             // event 'foo' has 2 handler
             Y.doccirrus.communication.once({ event: 'foo', done: func1, handlerId: 'superman'});
             Y.doccirrus.communication.once({ event: 'foo', done: func2, handlerId: 'batman'});

             // event 'foo' has only 'func2' handler
             Y.doccirrus.communication.once({ event: 'foo', done: func1});
             Y.doccirrus.communication.once({ event: 'foo', done: func2});

             // removing event listener
             var superMan = Y.doccirrus.communication.on({ event: 'foo', done: func1, handlerId: 'superman'});
             var batman = Y.doccirrus.communication.on({ event: 'foo', done: func2, handlerId: 'batman'});

             // 1st way
             superMan.removeEventListener();
             // 2nd way
             Y.doccirrus.communication.off( 'foo', 'batman' )
             // or
             Y.doccirrus.communication.off( 'foo', batman.handlerId )
             */
            once: function( config ) {
                var self = this,
                    socket = config.socket || self.getSocket( '/' ) || self.socket,
                    event = config.event,
                    successCb = config.done,
                    failCb = config.fail,
                    alwaysCb = config.always,
                    handlerId = config.handlerId || (new Y.doccirrus.mongo.ObjectId()).toString(),
                    myListener = function( message ) {
                        Y.log( 'Communication: socket io event has been emitted(once). Event: ' + config.event, 'debug', NAME );
                        self._parseResponse( message, successCb, failCb, alwaysCb );
                    };

                if( socket ) {
                    socket.once( event, myListener );
                } else {
                    self.openConnection().once( event, myListener );
                }
                listeners[event] = listeners[event] || {};
                listeners[event][handlerId] = myListener;
                return {
                    listener: myListener,
                    handlerId: handlerId,
                    removeEventListener: function() {
                        self.off( event, handlerId, socket );
                    }
                };
            },
            /**
             * Sets listener for 'connect' event
             * @param {Object} config
             * @param {Object} [config.socket]
             * @param {Function} config.callback will be called each time socket is connected to server
             * @returns {{listener: callback, handlerId: *, removeEventListener: removeEventListener}}
             */
            onConnect: function( config ) {
                var self = this,
                    socket = config.socket || self.getSocket( '/' ) || self.socket,
                    event = 'connect',
                    callback = config.callback,
                    handlerId = config.handlerId || (new Y.doccirrus.mongo.ObjectId()).toString();

                if( socket ) {
                    socket.on( event, callback );
                } else {
                    self.openConnection().on( event, callback );
                }
                listeners[event] = listeners[event] || {};
                listeners[event][handlerId] = callback;
                return {
                    listener: callback,
                    handlerId: handlerId,
                    removeEventListener: function() {
                        self.off( event, handlerId, socket );
                    }
                };
            },
            /**
             * Sets listener for 'disconnect' event
             * @param {Object} config
             * @param {Object} [config.socket]
             * @param {String} [config.handlerId] unique handler id. Is needed to set more than 1 handler for same event.
             * @param {Function} config.callback will be called each time socket is disconnected from server
             * @returns {{listener: callback, handlerId: *, removeEventListener: removeEventListener}}
             */
            onDisconnect: function( config ) {
                var self = this,
                    socket = config.socket || self.getSocket( '/' ) || self.socket,
                    event = 'disconnect',
                    callback = config.callback,
                    handlerId = config.handlerId || (new Y.doccirrus.mongo.ObjectId()).toString();

                if( socket ) {
                    socket.on( event, callback );
                } else {
                    self.openConnection().on( event, callback );
                }
                listeners[event] = listeners[event] || {};
                listeners[event][handlerId] = callback;
                return {
                    listener: callback,
                    handlerId: handlerId,
                    removeEventListener: function() {
                        self.off( event, handlerId, socket );
                    }
                };
            },

            /**
             * Removes listener for event.
             *  Use handlerId in case if event has more that one handler.
             * @method off
             * @param {String} event
             * @param {String} [handlerId=default]
             * @param {Object} [socket] specific socket
             *  If specific socket is provided, it would be used for current action,
             *  otherwise default socket connection will be used.
             * @see Y.doccirrus.communication.on || Y.doccirrus.communication.once
             */
            off: function( event, handlerId, socket ) {
                var self = this,
                    _socket = socket || self.getSocket( '/' ) || self.socket;
                handlerId = handlerId || 'default';
                if( _socket ) {
                    if( listeners[event] && listeners[event][handlerId] ) {
                        _socket.off( event, listeners[event][handlerId] );
                        delete listeners[event][handlerId];
                    }
                }
            },

            /**
             * Emits event.
             * @method emit
             * @param {String} event event name
             * @param {Object} message message which is sent to all listeners for this event
             * @param {Object} [socket] specific socket
             *  If specific socket is provided, it would be used for current action,
             *  otherwise default socket connection will be used.
             */
            emit: function( event, message, socket, cb ) {
                var self = this,
                    _socket = socket || self.getSocket( '/' ) || self.socket;
                if( _socket ) {
                    _socket.emit( event, message, cb );
                } else {
                    self.openConnection().emit( event, message, cb );
                }

            },
            /**
             * Sets listener for event and emits it.
             * @method request
             * @param {Object} params
             * @param {String} params.event
             * @param {Object} [params.socket] specific socket
             * @param {Boolean} [params.keepListen=false] if true, socket will listen for this event even after receiving message
             *  otherwise listener will be removed
             * @param {Function} [params.done] callback which is fired in response to success request. Don't use this with callback.
             * @param {Function} [params.fail] callback which is fired in response to error request. Don't use this with callback.
             * @param {Function} [params.callback] callback which is fired in response to request. Don't use this with done or fail.
             * @param {String} [params.handlerId] unique handler id. Is needed to set more than 1 handler for same event.
             * @param {Function} [params.always] callback which is fired in response to any request,
             *          in response to success request the function's arguments are the same as of done,
             *          in response to error request - arguments are the same as of fail
             * @param {*} params.message message which is sent to all listeners for this event
             * @return {Object}
             * @see Y.doccirrus.communication.on || Y.doccirrus.communication.once
             */
            request: function( params, callback ) {
                var
                    self = this,
                    result;
                params = params || {};
                if( params.callback || callback ) {
                    return self.emit( params.event, params.message, params.socket, params.callback || callback );
                } else if( params.keepListen ) {
                    result = self.on( {
                        event: params.event,
                        done: params.done,
                        fail: params.fail,
                        always: params.always,
                        handlerId: params.handlerId,
                        socket: params.socket
                    } );
                } else {
                    result = self.once( {
                        event: params.event,
                        done: params.done,
                        fail: params.fail,
                        always: params.always,
                        handlerId: params.handlerId,
                        socket: params.socket
                    } );
                }
                self.emit( params.event, params.message, params.socket );
                return result;
            },

            /**
             * @method apiCall
             * @param {Object} params api params
             * @param {Object} [params.data]
             * @param {String} [params.method]
             * @param {Object} [params.query]
             * @param {Object} [params.options]
             * @param {Function} callback
             * @returns {*|Object}
             */
            apiCall: function( params, callback ) {
                var
                    self = this;
                return self.request( {
                    event: 'apiCall',
                    message: params
                }, function( err, response ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( response.error, response.result );
                } );
            },

            /**
             * send confirmation that user received message
             * @method confirmMessage
             * @param {Object} params
             * @param {String} params.messageId id of message
             * @return {jQuery.promise}
             */
            confirmMessage: function( params ) {
                return Y.doccirrus.jsonrpc.api.socketioevent.deleteEventByMessageId( {
                    query: {
                        messageId: params.messageId
                    }
                } );
            },

            /**
             * Send message to other user
             * @method sendMessageTo
             * @param {Object} message
             * @param {Object} message.data message object
             * @param {Object} [message.targetId] target user id. if missing will send to himself.
             * @param {Object} [socket] specific socket
             * @see Y.doccirrus.communication.emit
             */
            sendMessageTo: function( message, socket ) {
                var self = this;
                self.emit( self.EVENTS.MESSAGE_TO, message, socket );
            },

            /**
             * Send message to my session
             * @method sendMessageToMySession
             * @param {Object} message
             * @param {Object} message.data message object
             * @param {Object} [socket] specific socket
             * @see Y.doccirrus.communication.emit
             */
            sendMessageToMySession: function( message, socket ) {
                var self = this;
                self.emit( self.EVENTS.MESSAGE_TO_MY_SESSION, message, socket );
            },

            /**
             * Listener for receiving message from other user
             * @method onMessageToMe
             * @param {Object} config
             * @param {Object} [config.socket] specific socket
             * @param {String} [config.handlerId] handler id
             * @param {Function} [config.done] success callback
             * @param {Function} [config.fail] fail callback
             * @param {Function} [config.always] always callback
             * @return {Object}
             * @see Y.doccirrus.communication.request
             * @see Y.doccirrus.communication.on
             */
            onMessageToMe: function( config ) {
                var self = this;
                return self.on( {
                    event: self.EVENTS.MESSAGE_TO_ME,
                    done: config.done,
                    fail: config.fail,
                    always: config.always,
                    handlerId: config.handlerId,
                    socket: config.socket
                } );
            },

            /**
             * Listener for receiving message from other user,
             *  it will be removed after message is received
             * @method onceMessageToMe
             * @param {Object} config
             * @param {Object} [config.socket] specific socke
             * @param {String} [config.handlerId] handler idt
             * @param {Function} [config.done] success callback
             * @param {Function} [config.fail] fail callback
             * @param {Function} [config.always] always callback
             * @return {Object}
             * @see Y.doccirrus.communication.once
             */
            onceMessageToMe: function( config ) {
                var self = this;
                return self.once( {
                    event: self.EVENTS.MESSAGE_TO_ME,
                    done: config.done,
                    fail: config.fail,
                    always: config.always,
                    handlerId: config.handlerId,
                    socket: config.socket
                } );
            },

            /**
             * Remove MessageToMe Listener
             * @method offMessageToMe
             * @param {Object} [socket] specific socket
             * @see Y.doccirrus.communication.off
             * */
            offMessageToMe: function( socket ) {
                var self = this;
                self.off( self.EVENTS.MESSAGE_TO_ME, null, socket );
            },

            /**
             * test download/upload speed
             * @method testSpeed
             * @param {Object} config
             * @param {Boolean} [config.uploadTest=false] if true - will test upload speed, false - download speed.
             * @param {Object} [config.socket] specific socket
             * @param {Function} config.callback will be called with 2 param: 1 - err, 2 - speed.
             * @return {Object}
             * @see Y.doccirrus.communication.on || Y.doccirrus.communication.once
             */
            testSpeed: function( config ) {
                var self = this,
                    id = config.id,
                    uploadTest = config.uploadTest,
                    callback = config.callback,
                    sendTime,
                    message = {
                        id: id,
                        uploadTest: uploadTest
                    },
                    ping,
                    lock = false;

                function onTestFail() {
                    if( lock ) {
                        return;
                    }
                    lock = true;
                    ping = 0;
                    if( 'function' === typeof callback ) {
                        callback( self.const.TIMEOUT, ping );
                    }
                }

                if( uploadTest ) {
                    message.speedTestString = speedTestString;
                }
                sendTime = new Date();
                setTimeout( onTestFail, 5000 );
                return self.request( {
                    event: 'speedTest',
                    message: message,
                    socket: config.socket,
                    done: function( response ) {
                        var receiveTime;
                        if( lock || !(response.data[0] && id === response.data[0].id) ) {
                            return;
                        }
                        lock = true;
                        receiveTime = new Date();
                        ping = TEST_PACKAGE_SIZE / ( receiveTime - sendTime );
                        if( 'function' === typeof callback ) {
                            callback( null, Math.round( ping ) );
                        }
                    },
                    fail: onTestFail
                } );

            },

            /**
             * Subscribes for changes in specific document of collection
             * @method subscribeCollectionId
             * @param {Object} config
             * @param {String} config.collection collection name
             * @param {String} config.documentId document id
             * @param {Object} [config.options]
             * @param {Object} [config.options.skipCurrentUser] do not send event to user if he changed collection
             * @param {Function} [config.callback] is called when the document is changed.
             *  If not specified then warning is shown.
             * @return {Object} { {Function} listener, {String} handlerId, {Function} removeEventListener, {String} collection, {String} documentId }
             * @see Y.doccirrus.communication.request
             */
            subscribeCollectionId: function( config ) {
                var
                    self = this,
                    collection = config.collection,
                    documentId = config.documentId,
                    socket = config.socket,
                    options = config.options || {},
                    handlerId = self.getHandlerId( {
                        collection: collection,
                        documentId: documentId,
                        type: 'subscription'
                    } ),
                    callback = config.callback,
                    result;
                Y.log( 'subscribeCollectionId. set subscription for collection: ' + collection + ', docuemntId: ' + documentId, 'debug', NAME );
                result = Y.doccirrus.communication.request( {
                    keepListen: true,
                    socket: socket,
                    message: {
                        collection: collection,
                        documentId: documentId,
                        options: options
                    },
                    handlerId: handlerId,
                    event: Y.doccirrus.communication.EVENTS.SUBSCRIBE_COLLECTION,
                    done: function( response ) {
                        var
                            data = response.data && response.data[0],
                            meta = response.meta || {},
                            _collection = meta.collection,
                            _documentId = meta.documentId;
                        if( _collection !== collection || _documentId !== documentId ) {
                            return;
                        }
                        Y.log( 'Document of ' + collection + ' collection with id: ' + documentId + ' has been changed.', 'debug', NAME );
                        if( 'function' === typeof callback ) {
                            callback( data, meta );
                        }
                    }
                } );
                result.collection = collection;
                result.documentId = documentId;
                return result;
            },
            /**
             * Subscribes for changes in specific collection
             * @method subscribeCollection
             * @param {Object} config
             * @param {String} config.collection collection name
             * @param {Object} [config.options]
             * @param {Object} [config.options.skipCurrentUser] do not send event to user if he changed collection
             * @param {Function} config.callback is called when collection is changed
             * @return {Object} { {Function} listener, {String} handlerId, {Function} removeEventListener, {String} collection }
             * @see Y.doccirrus.communication.request
             */
            subscribeCollection: function( config ) {
                var
                    self = this,
                    collection = config.collection,
                    options = config.options || {},
                    callback = config.callback,
                    socket = config.socket,
                    handlerId = self.getHandlerId( {
                        collection: collection,
                        type: 'subscription'
                    } ),
                    result;
                Y.log( 'subscribeCollectionId. set subscription for collection: ' + collection, 'debug', NAME );
                result = Y.doccirrus.communication.request( {
                    keepListen: true,
                    message: {
                        collection: collection,
                        options: options
                    },
                    socket: socket,
                    handlerId: handlerId,
                    event: Y.doccirrus.communication.EVENTS.SUBSCRIBE_COLLECTION,
                    done: function( response ) {
                        var
                            data = response.data,
                            meta = response.meta || {};

                        Y.log( 'Collection ' + meta.collection + ' has been changed. Action: ' + meta.action, 'debug', NAME );
                        if( 'function' === typeof callback ) {
                            callback( data, meta );
                        }
                    }
                } );
                result.collection = collection;
                return result;
            },
            /**
             * @method hasCollectionSubscriber
             * @param {Object} config
             * @param {String} config.collection
             * @param {String} config.documentId
             * @param {Function} callback
             * @return {Object}
             * @see Y.doccirrus.communication.request
             */
            hasCollectionSubscriber: function( config, callback ) {
                var
                    self = this,
                    collection = config.collection,
                    documentId = config.documentId,
                    handlerId = self.getHandlerId( {
                        collection: collection,
                        type: 'subscription'
                    } );
                return Y.doccirrus.communication.request( {
                    message: {
                        collection: collection,
                        documentId: documentId
                    },
                    handlerId: handlerId,
                    event: Y.doccirrus.communication.EVENTS.HAS_COLLECTION_SUBSCRIBER,
                    done: function( response ) {
                        var
                            data = response.data && response.data[0],
                            meta = response.meta || {};
                        if( 'function' === typeof callback ) {
                            callback( data, meta );
                        }
                    }
                } );
            },
            /**
             * @method notifyIfCollectionHasSubscriber
             * @param {Object} config
             * @param {String} config.collection
             * @param {String} config.documentId
             * @return {Object}
             * @see Y.doccirrus.communication.hasCollectionSubscriber
             */
            notifyIfCollectionHasSubscriber: function( config ) {
                var
                    self = this,
                    collection = config.collection,
                    documentId = config.documentId;
                return self.hasCollectionSubscriber( {
                        collection: collection,
                        documentId: documentId
                    }, function( data ) {
                        var
                            text;
                        if( data.subscribed ) {
                            text = SUBSCRIBED;
                        } else {
                            return;
                        }
                        Y.doccirrus.DCSystemMessages.removeMessage( Y.doccirrus.communication.EVENTS.SUBSCRIBE_COLLECTION );
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: Y.doccirrus.communication.EVENTS.SUBSCRIBE_COLLECTION,
                            content: text,
                            level: 'WARNING'
                        } );
                    }
                );
            },
            /**
             * Releases subscription for collection. It means server won't emit any notification about the collection for the user.
             * !!!!! Attention!!!! Once this function is called for collection(and documentId)
             * @method releaseSubscription
             * @param {String} config.collection
             * @param {Object} [config.socket]
             * @param {String} [config.documentId]
             * @param {Boolean} [config.entireCollection] if set, releases all subscriptions of collection.
             *  is set, All listeners should be removed manually
             * @see Y.doccirrus.communication.off
             */
            releaseSubscription: function( config ) {
                var
                    self = this,
                    socket = config.socket || self.getSocket( '/' ) || self.socket,
                    collection = config.collection,
                    documentId = config.documentId,
                    entireCollection = config.entireCollection,
                    handlerId = self.getHandlerId( {
                        collection: collection,
                        documentId: documentId,
                        type: 'subscription'
                    } );
                Y.doccirrus.communication.emit( Y.doccirrus.communication.EVENTS.RELEASE_SUBSCRIPTION, {
                    collection: collection,
                    documentId: documentId,
                    entireCollection: entireCollection
                } );
                if( socket ) {
                    self.off( Y.doccirrus.communication.EVENTS.SUBSCRIBE_COLLECTION, handlerId, socket );
                }

            },
            /**
             * @method getHandlerId
             * @param config
             * @returns {String}
             */
            getHandlerId: function( config ) {
                config = config || {};
                var
                    type = config.type,
                    handlerId;
                switch( type ) {
                    case 'subscription':
                        handlerId = config.collection + '.' + (config.documentId || 'common');
                        break;
                    default:
                        handlerId = 'default';
                }
                return handlerId;
            }
        };

        Y.namespace( 'doccirrus' ).communication = new Socket();
    },
    '0.0.1', { requires: ['dcerrortable', 'socketioevent-schema', 'dcutils', 'dc-comctl', 'dcmongo'] }
);
