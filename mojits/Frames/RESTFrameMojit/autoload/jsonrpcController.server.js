/**
 * User: pi
 * Date: 27/11/15  11:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/



YUI.add( 'JSONRPCController', function( Y, NAME ) {

    /**
     * JSONRPCHandler handles all jsonrpc requests.
     * @class JSONRPCHandler
     * @extends RestHandlerClass
     */
    class JSONRPCHandler extends Y.doccirrus.classes.RestHandlerClass {

        /**
         * @method translateAction
         * @static
         * @param {String} action
         * @returns {String}
         */
        static translateAction( action ) {
            switch( action ) {
                case 'read':
                    return 'get';
                case 'delete':
                    return 'delete';
                case 'create':
                    return 'post';
                case 'update':
                    return 'put';
                default:
                    return action;
            }
        }

        /**
         * @method isValidRPC
         * @param {Objsect} rpc
         * @param {String} rpc.id
         * @param {String} rpc.method
         * @param {String} rpc.jsonrpc
         * @param {Objsect} rpc.params
         * @returns {boolean}
         */
        isValidRPC( rpc ) {
            return ( rpc.id && rpc.method && '2.0' === rpc.jsonrpc && 'object' === typeof rpc.params );
        }

        /**
         * @method buildResult
         * @param {Object} rpc
         * @param {Object} err
         * @param {Object} [result={}]
         * @param {Object} [warning]
         * @returns {Object}
         */
        buildResult( rpc, err, result = {}, warning ) {
            const
                wrappedResult = this.wrapResponse( rpc.params, err, result, warning ), // wrapped response will include the actual errors (if any)
                rpcRes = { "jsonrpc": "2.0" };

            rpcRes.dur = rpc.duration;

            if( err ) {
                // http://www.jsonrpc.org/specification#error_object
                rpcRes.error = {
                    code: -32500,
                    message: 'application error',
                    data: wrappedResult.meta.errors
                };

            } else {
                rpcRes.result = wrappedResult;
            }

            rpcRes.id = rpc.id;
            return rpcRes;

        }

        /**
         * @method handleSingleRpc
         * @param {Object} config
         * @param {Object} config.rpc
         * @param {Object} config.rest
         * @param {Object} config.req
         * @param {Function} callback
         */
        handleSingleRpc( config, callback ) {
            var
                rpc = config.rpc,
                rest = config.rest,
                req = config.req,
                parts = rpc.method.split( '.' ),
                action = parts[ 1 ],
                model = parts[ 0 ];
            rpc.start = new Date();

            rest.action = JSONRPCHandler.translateAction( action );
            rest.model = model;
            rest.query = rpc.params.query || {};
            rest.data = rpc.params.data || {};
            rest.httpRequest = req;
            rest.fields = rpc.params.fields;
            this.setParams( req, rest, rpc.params ); // set data and options
            rest.callback = callback;
            this.callApi( rest, 'JSONRPC' );
        }

        /**
         * @method handleRequest
         * @param {Object} config
         * @param {Object} config.params
         * @param {Object} config.req
         * @param {Object} config.lang
         * @param {Function} callback
         */
        handleRequest( config, callback ) {
            var
                self = this,
                params = config.params,
                doNotStringify = config.doNotStringify,
                req = config.req,
                async = require( 'async' ),
                meta = {
                    'http': {
                        headers: {
                            'content-type': 'application/json; charset=utf-8'
                        }
                    }
                },
                seriesArr = [],
                lang = config.lang,
                rest = { fields: 'all' };

            rest.user = req.user;
            rest.lang = lang;

            if( !(params && params.params && params.params.options && params.params.options.pureLog) ) {
                Y.log( 'JSONRPC received: ' + JSON.stringify( params ).replace(/"smtpPassword" ?: ?".*"/,'"smtpPassword":"xxx"'), 'debug', NAME );
            } else {
                Y.log( 'JSONRPC received: jsonrpc - ' + JSON.stringify( params && params.jsonrpc ) + ', method - ' + JSON.stringify( params && params.method ), 'debug', NAME );
            }

            // gather all results then send back at once
            // the error returned is decided here

            function doJob( rpc, callback ) {
                let err, apiAndMethod;
                if( req.isFromFriend || req.hasValidOauthToken ) {
                    return callback( null, self.buildResult( rpc, new Y.doccirrus.commonerrors.DCError( 403 ) ) );
                }

                rpc.method = rpc.method || '';
                apiAndMethod = rpc.method.split( '.' );


                if ( !apiAndMethod[0] || !apiAndMethod[1] ) {
                    err = new Y.doccirrus.commonerrors.DCError( 500, {message: 'Malformed RPC request.'} );
                    // may need to set timeout here (mongodb updates are not reflecting always)
                    return callback( null, self.buildResult( rpc, err, null ) );
                }

                if( !Y.doccirrus.jsonrpc.privilige.evaluator.isAllowed( rest.user, apiAndMethod[0], apiAndMethod[1] ) ) {
                    Y.log( `doJob: User (${rest.user ? '_id: ' + rest.user._id : 'n/a'}) with no role tried to call api: ${rest.model}.${rest.action}`, 'warn', NAME);
                    err = new Y.doccirrus.commonerrors.DCError( 403, {message: 'User does not have enough access rights.'} );

                    // may need to set timeout here (mongodb updates are not reflecting always)
                    return callback( null, self.buildResult( rpc, err, null ) );
                }
                if( self.isValidRPC( rpc ) ) {
                    self.handleSingleRpc( {
                        rest: rest,
                        rpc: rpc,
                        req: req
                    }, function rpcCallback( err, result, warning ) {
                        Y.log( 'Valid JSONRPC', 'debug', NAME );
                        // serial options because we are doing this serially
                        rpc.duration = (new Date() - rpc.start) / 1000;
                        //batchResult.push( self.buildResult( rpc, err, result, warning ) );
                        // may need to set timeout here (mongodb updates are not reflecting always)
                        setImmediate( callback, null, self.buildResult( rpc, err, result, warning ) );
                    } );
                } else {
                    Y.log( 'Invalid JSONRPC: ' + JSON.stringify( rpc ), 'warning', NAME );
                    //batchResult.push( self.buildResult( rpc, Y.doccirrus.errors.rest( -32600, 'Invalid Request' ), null ) );
                    callback( null, self.buildResult( rpc, Y.doccirrus.errors.rest( -32600, 'Invalid Request' ), null ) );
                }
            }

            if( Array.isArray( params ) ||
                (
                    // workaround: mojito makes anything to object or string …
                    Y.Lang.isObject( params ) && !Y.Object.owns( params, 'jsonrpc' )
                )
            ) {

                Y.each( params, function( item ) {
                    seriesArr.push( item );
                } );
                async.mapSeries( seriesArr, doJob, function finalCallback( err, batchResult ) {
                    if( err ) {
                        Y.log(`JSONRPC error. Error: ${err.stack || err}`, "warn", NAME);
                    }

                    var
                        result = doNotStringify ? batchResult : JSON.stringify( batchResult );
                    Y.log( 'JSONRPC returning batch response items: ' + batchResult.length, 'info', NAME );
                    Y.log( 'JSONRPC returning batch response bytes: ' + result.length, 'debug', NAME );

                    callback( null, {
                        data: result,
                        meta: meta
                    } );
                } );

            } else if( Y.Lang.isObject( params ) ) { // a single rpc request
                doJob( params, function( err, result ) {
                    if( err ) {
                        Y.log(`doJob error. Error: ${err.stack || err}`, "warn", NAME);
                    }

                    callback( null, {
                        data: doNotStringify ? result : JSON.stringify( result ),
                        meta: meta
                    } );
                } );
            }

        }

    }
    var
        handler = new JSONRPCHandler();
    /**
     * jsonRPCController handles all jsonrpc requests.
     * @class jsonRPCController
     *
     */
    Y.namespace( 'doccirrus' ).JSONRPCController = {
        handleRequest: function( config, callback ) {
            handler.handleRequest( config, callback );
        }

    };

    Y.log( 'JSONRPCController initialized', 'debug', NAME );
}, '0.0.1', {
    requires: [
        'oop',
        'dcutils',
        'RestHandlerClass'
    ]
} );
