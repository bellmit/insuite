/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, jQuery */
'use strict';
YUI.add( 'JsonRpc', function( Y/*, NAME*/ ) {
    var
    /*getObject = Y.doccirrus.utils.getObject,*/
        setObject = Y.doccirrus.utils.setObject;

    /**
     * The Module provides functionality to use batch-able JSON-RPC with different servers.
     *
     * It generates methods in the given {{#crossLink "JsonRpc/namespaceAPI:attribute"}}namespace{{/crossLink}}
     * to communicate with the defined {{#crossLink "doccirrus.jsonrpc.servers"}}servers{{/crossLink}}.
     *
     * if in data provided
     *    noTimeout: true
     * then request will wait until finish and not be killed by _timeout (specified in actionTimeout)
     *
     * @example Call may get batched to a single request (if there are other simultaneous calls):

     Y.doccirrus.jsonrpc.api.patient.read(
         { query: {} },
         function( data ) {},
         function( error ) {}
     )
     .done( function(response) { Y.Array.invoke( Y.doccirrus.errorTable.getWarningsFromResponse( response ), 'display' ); } )
     .fail( function(response) { Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( response ), 'display' ); } )
     * @example Calls will get batched to a single request:

     Y.doccirrus.jsonrpc.api.patient.delete( { query: { _id: 'foo' } } );
     Y.doccirrus.jsonrpc.api.employee.delete( { query: { _id: 'bar' } } );
     * @example The calls return jQuery.promise so jQuery.when can check if both completed:

     jQuery.when(
         Y.doccirrus.jsonrpc.api.patient.update( { query: { _id: 'foo', … } } ),
         Y.doccirrus.jsonrpc.api.patient.update( { query: { _id: 'bar', … } } )
     ).then( function() {} );
     * @module JsonRpc
     * @requires JsonRpcReflection, dcinfrastructs, dcutils
     * @main JsonRpc
     * @since 3.16.0
     */

    /**
     * @property jsonrpc
     * @for doccirrus
     * @type {doccirrus.jsonrpc}
     */
    /**
     * namespace of {{#crossLinkModule "JsonRpc"}}{{/crossLinkModule}} Module in {{#crossLink "doccirrus"}}{{/crossLink}}
     * @class doccirrus.jsonrpc
     * @static
     */
    Y.namespace( 'doccirrus.jsonrpc' );

    /**
     * namespace for available servers
     * @property servers
     * @for doccirrus.jsonrpc
     * @type {doccirrus.jsonrpc.servers}
     */
    /**
     * namespace for available JSON-RPC servers.
     * @class servers
     * @namespace doccirrus.jsonrpc
     * @static
     */
    Y.namespace( 'doccirrus.jsonrpc.servers' );

    /**
     * @class doccirrus.jsonrpc.api
     */
    /**
     * @property api
     * @for doccirrus.jsonrpc
     * @type {doccirrus.jsonrpc.api}
     */
    Y.namespace( 'doccirrus.jsonrpc.api' );

    /**
     * Class to manage batch-able JSON-RPC with different servers.
     *
     * @class JsonRpc
     * @constructor
     * @extends Base
     * @param {Object} config a configuration object
     *     @param {String} config.server the server this Class will use [puc, prc, …]
     * @since 3.16.0
     * @private
     */
    function JsonRpc( config ) {
        JsonRpc.superclass.constructor.call( this, config );
    }

    Y.mix( JsonRpc, {
        NAME: 'JsonRpc',
        ATTRS: {
            /**
             * the namespace this RPC is using
             * @attribute namespaceAPI
             * @type String
             * @default 'doccirrus.jsonrpc.api'
             * @readOnly
             */
            namespaceAPI: {
                value: 'doccirrus.jsonrpc.api',
                readOnly: true
            },
            /**
             * the server this RPC is using
             * @attribute server
             * @type String
             * @default 'prc'
             * @writeOnce initOnly
             */
            server: {
                value: 'prc',
                validator: Y.Lang.isString,
                writeOnce: 'initOnly'
            },
            /**
             * the url this RPC is using
             * @attribute url
             * @type String
             * @default '/1/jsonrpc'
             * @writeOnce initOnly
             */
            url: {
                value: '/1/jsonrpc',
                validator: Y.Lang.isString,
                writeOnce: 'initOnly',
                setter: function( url ) {
                    return Y.doccirrus.infras.getURLforServer( this.get( 'server' ), url );
                }
            },
            /**
             * the underlying jQuery.JsonRpcClient constructor to use
             * @attribute JsonRpcClient
             * @type jQuery.JsonRpcClient
             * @default jQuery.JsonRpcClient
             * @readOnly
             */
            JsonRpcClient: {
                valueFn: function() {
                    var aJsonRpcClient = new jQuery.JsonRpcClient( {
                        ajaxUrl: this.get( 'url' ),
                        xhrFields: { withCredentials: true }
                    } );
                    return aJsonRpcClient;
                },
                readOnly: true
            },
            /**
             * the interval in ms the buffer waits for batching, if 0 no batching will occur
             * @attribute bufferInterval
             * @type Number|* value will be parseInt
             * @default 50
             */
            bufferInterval: {
                value: 100,
                setter: function( value ) {
                    return parseInt( value, 10 ) || 0;
                }
            }
        }
    } );

    Y.extend( JsonRpc, Y.Base, {
        /**
         * handler of the current buffer interval
         * @property _bufferIntervalHandler
         * @type {null|Function}
         * @private
         */
        _bufferIntervalHandler: null,
        /**
         * id of the current buffer interval
         * @property _bufferIntervalId
         * @type {null|Number}
         * @private
         */
        _bufferIntervalId: null,
        /**
         * holder for buffered requests
         * @property _requestBuffer
         * @type {null|Array}
         * @private
         */
        _requestBuffer: null,
        /** @private */
        initializer: function JsonRpc_initializer( /*config*/ ) {
            var self = this;

            self._requestBuffer = [];
            self._initApi();
        },
        /** @private */
        destructor: function JsonRpc_destructor() {
        },
        /**
         * initializes the rpc-api
         * @method _initApi
         * @protected
         */
        _initApi: function JsonRpc_initApi() {
            var self = this,
                namespaceAPI = self.get( 'namespaceAPI' ),
                methods = Y.doccirrus.jsonrpc.reflection.getDescriptionForServer( self.get( 'server' ) );
            // create methods in defined namespaces
            Y.each( methods, function( item ) {
                var clientNs = [namespaceAPI, item.namespace, item.method].join( '.' ),
                    serverNs = [item.namespace, item.method].join( '.' ),
                    fn = setObject( clientNs, self._createMethod( serverNs ), Y );
                fn.description = item;
            } );
        },
        /**
         * create rpc methods in defined namespace
         * @method _createMethod
         * @param {String} namespace
         * @return {jQuery.promise}
         * @protected
         */
        _createMethod: function JsonRpc_createMethod( namespace ) {
            var self = this;
            return function( params, successHandler, errorHandler ) {
                var
                    method = namespace,
                    deferred = jQuery.Deferred();

                self._bufferRequest( {
                    method: method,
                    params: ( Y.Lang.isUndefined( params ) ? {} : params ),
                    success: function JsonRpc_createMethod_success() {
                        if( Y.Lang.isFunction( successHandler ) ) {
                            successHandler.apply( deferred, arguments );
                        }
                        deferred.resolve.apply( deferred, arguments );
                    },
                    error: function JsonRpc_createMethod_error( error ) {
                        error = error.data && error.data[0];
                        if( Y.Lang.isFunction( errorHandler ) ) {
                            errorHandler.call( deferred, error );
                        }
                        deferred.reject.call( deferred, error );
                    }
                } );

                return deferred;
            };
        },
        /**
         * buffers request objects if bufferInterval is greater than 0 else send not batched
         * @method _bufferRequest
         * @param {Object} request
         * @protected
         */
        _bufferRequest: function JsonRpc_bufferRequest( request ) {
            var self = this,
                bufferInterval = self.get( 'bufferInterval' );
            self._requestBuffer.push( request );
            if( bufferInterval ) {
                if( !self._bufferIntervalHandler ) {
                    self._bufferIntervalHandler = function() {
                        clearInterval( self._bufferIntervalId );
                        self._bufferIntervalId = null;
                        self._bufferIntervalHandler = null;
                        self._bufferSend();
                    };
                    self._bufferIntervalId = setInterval( self._bufferIntervalHandler, bufferInterval );
                }
            }
            else {
                self._bufferSend();
            }
        },
        /**
         * send request objects in buffer
         * @method _bufferSend
         * @protected
         */
        _bufferSend: function JsonRpc_bufferSend() {
            var self = this,
                len = self._requestBuffer.length;
            if( len > 0 ) {
                self._doSend( len === 1 ? self._requestBuffer[0] : self._requestBuffer );
                self._requestBuffer = [];
            }
        },
        /**
         * send single or batched request objects
         * @method _doSend
         * @param {Array|Object} data
         * @protected
         */
        _doSend: function JsonRpc_doSend( data ) {
            var self = this,
                jsonRpcClient = self.get( 'JsonRpcClient' ),
                blockingBatch = [],
                noBlockinBatch = [],
                runNoBlockingBatch;

            if( Y.Lang.isArray( data ) ) {
                data.forEach(function( item ) {
                    if (item && item.params && item.params.noBlocking === true) {
                        noBlockinBatch.push(item);
                    } else {
                        blockingBatch.push(item);
                    }
                });

                if (noBlockinBatch.length > 0 && blockingBatch.length > 0) {

                    /**
                     * @private
                     *
                     * When the blocking batch group has finished, it should continue with the non-blocking batch
                     * It's being called in both success and error of the blocking batch
                     *
                     */
                    runNoBlockingBatch = function () {
                        jsonRpcClient.batch(
                            function( batch ) {
                                noBlockinBatch.forEach(function( item ) {
                                    batch.call( item.method, item.params, item.success, item.error );
                                });
                            },
                            self._onBatchSuccess,
                            self._onBatchError
                        );
                    };

                    jsonRpcClient.batch(
                        function( batch ) {
                            blockingBatch.forEach(function( item ) {
                                batch.call( item.method, item.params, item.success, item.error );
                            });
                        },
                        runNoBlockingBatch,
                        runNoBlockingBatch
                    );
                } else {
                    jsonRpcClient.batch(
                        function( batch ) {
                            data.forEach(function( item ) {
                                batch.call( item.method, item.params, item.success, item.error );
                            });
                        },
                        self._onBatchSuccess,
                        self._onBatchError
                    );
                }

            }
            else {
                jsonRpcClient.call(
                    data.method, data.params, data.success, data.error
                );
            }
        },
        /**
         * handles batch success
         * @method _onBatchSuccess
         * @private
         */
        _onBatchSuccess: function( /*success_data*/ ) {
        },
        /**
         * handles batch error
         * @method _onBatchError
         * @private
         */
        _onBatchError: function( /*error_data*/ ) {
            // this doesn't trigger for a single error in success
        }
    } );

    /**
     * connect defined api with **private cloud**
     * @property prc
     * @type {JsonRpc}
     * @for doccirrus.jsonrpc.servers
     */
    Y.doccirrus.jsonrpc.servers.prc = new JsonRpc( { server: 'prc' } );

    /**
     * connect defined api with **public cloud**
     * @property puc
     * @type {JsonRpc}
     * @for doccirrus.jsonrpc.servers
     */
    Y.doccirrus.jsonrpc.servers.puc = new JsonRpc( { server: 'puc' } );

    /**
     * connect defined api with relevant host
     * @property current
     * @type {JsonRpc}
     * @for doccirrus.jsonrpc.servers
     */
    Y.doccirrus.jsonrpc.servers.current = new JsonRpc( { server: 'current' } );

}, '3.16.0', {
    requires: [
        'oop',
        'JsonRpcReflection',
        'JsonRpcReflection-doccirrus',
        'dcinfrastructs',
        'dcutils'
    ]
} );
