/**
 * User: ma
 * Date: 24/06/2014  12:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/

/**
 * RESTController
 *
 * This DocCirrus Sub-Controller allows a HTTP/JSON interface to API functionality.
 *
 * This work alongside the old rest controller and completely separately
 *
 * Supports:
 *
 *  /1/<model-name>/<id>
 *
 *  /1/<model-name>/<field1>/<value>/<field2>/<value2>... => a field can contain a mongoose operator, e.g. myField1_gt,4356, myField2_lte
 *  Returns an object in args.query, e.g. { field1: "value", field2: "value2" }
 *  See  DCQuery for all supported operators.
 *
 *  For standard (paging,limit,sort) and other options, use '?'...
 *
 *  /1/<model-name>/?<param1>=<value1>&<param2>=<value2>... => a param can contain a mongoose operator, e.g. myField1_gt,4356, myField2_lte
 *  Returns an object in args.originalParams, e.g. { param1: "value", param2: "value2" }
 *
 *  The above are combinable with custom actions as follows:
 *  /1/<model-name>/:<action-name>
 *
 * @class RESTController_1
 *
 */


YUI.add( 'RESTController_1', function( Y, NAME ) {

    class Rest_1Handler extends Y.doccirrus.classes.RestHandlerClass {
        /**
         * Rest_1Handler handles all rest request under /1/
         * @class Rest_1Handler
         * @constructor
         * @extends RestHandlerClass
         */
        constructor() { // eslint-disable-line
            super();
        }

        /**
         * @method setCallback
         * @param {Object} rest
         * @param {Function} callback
         */
        setCallback( rest, callback ) {
            var
                self = this;
            rest._callback = function restReturn( error, response, warning ) {
                var
                    meta = {
                        'http': {
                            headers: {
                                'content-type': 'application/json; charset=utf-8'
                            }
                        }
                    },
                    data = response,
                    params = rest.originalParams,
                    output;

                if( error ) { //  handle HTTP errors, NOT custom business logic errors
                    if( error.name && 'ValidationError' === error.name ) {
                        callback( error );
                        return; // EXIT
                    } else if( 500 === error.code ) {
                        callback( error );
                        return; // EXIT
                    } else if( 'string' === typeof error ) {
                        callback( error );
                        return; // EXIT
                    }
                }

                response = response || {};
                if( !response.meta && !response.data ) { // if not already wrapped
                    data = self.wrapResponse( params, error, response, warning );
                }

                output = JSON.stringify( data );
                if( !data || !data.data ) {
                    Y.log( 'REST returning EMPTY RESPONSE', 'info', NAME );
                } else {
                    Y.log( 'REST returning ' + output.substr( 0, 300 ) + ' ...', 'debug', NAME );
                }
                callback( null, {
                    data: output,
                    meta: meta
                } );
            };
            rest.callback = function( error, response, warning ) {
                rest._callback( error, response, warning );
            };
        }

        /**
         * @method translateQueryStringIntoObject
         * @param {String} query
         * @returns {Object}
         */
        translateQueryStringIntoObject( query ) {
            var
                dcquery = new Y.doccirrus.DCQuery( query );

            return dcquery.getQueryAsObj();
        }

        /**
         * @method getQueryFromString
         * @param {String} queryString
         * @returns {Object}
         */
        getQueryFromString( queryString ) {
            queryString = ('/' === queryString.slice( 0, 1 )) ? queryString.slice( 1 ) : queryString; // get rid of the starting slash
            // extract slashed-style query, i.e. field/value
            if( queryString ) {
                queryString = queryString.replace( /\//g, ',' );
                if( 24 === queryString.length && /[\da-f]+/.test( queryString ) ) { // if it is a mongodb id
                    return { _id: queryString };
                } else {
                    return this.translateQueryStringIntoObject( queryString );
                }
            } else {
                return {};
            }
        }

        /**
         * @method setupRestObject
         * @param {Object} rest
         * @param {Object} config
         * @param {Object} config.req
         * @param {Object} config.params
         * @param {Object} config.lang
         * @param {Function} [config.redirectFunction]
         * @param {Function} callback
         */
        setupRestObject( rest, config ) { // a single place for setting all required arguments
            var
                model,
                action,
                queryPairs,
                myRegex = /\/1\/([-\w]+)(?:\/:(\w+))?([\/]?.*)/, // /1/<modelname>/:<action>/<query pairs>
                groups,
                actionHttp = config.req.method;

            actionHttp = actionHttp ? actionHttp.toLowerCase() : undefined;

            groups = myRegex.exec( config.req.path );
            if( groups && groups[ 0 ] ) {
                model = groups[ 1 ];
                action = groups[ 2 ];
                queryPairs = groups[ 3 ];
            }

            rest.query = this.getQueryFromString( queryPairs );
            rest.model = model;
            rest.action = action || actionHttp;
            //rest.method = actionHttp;
            rest.data = config.params;
            rest.fields = config.params.fields_;
            delete rest.data.publicRoutes;
            rest.lang = config.lang;
            rest.httpRequest = config.req;
            rest.user = config.req.user;
            this.setParams( config.req, rest, config.params );
            if( !action && 'function' === typeof config.redirectFunction ) {
                rest.redirect = config.redirectFunction;
            }
        }

        decryptData( rest, callback ) {
            let
                data = rest.data,
                user = rest.user,
                decryptionData = rest.decryptionData;

            if( !decryptionData || !decryptionData.pubKeyHash_ ) {
                Y.log( `pubKeyHash_ is not set. Do not need to decrypt data.`, 'debug', NAME );
                return callback( null, data );
            }

            if( decryptionData.content_ ) {
                Y.log( 'Rest controller is trying to decrypt data', 'info', NAME );
                switch( decryptionData.source_ ) {
                    case 'patient':
                        Y.doccirrus.api.patient.decryptPatientData( {
                            user: user,
                            data: {
                                patientId: decryptionData.id_,
                                pubKeyHash: decryptionData.pubKeyHash_,
                                patientPubKey: decryptionData.patientPubKey,
                                encryptedContent: decryptionData.content_
                            },
                            callback: function( err, result ) {
                                if( err ) {
                                    Y.log( `Rest controller has not decrypted data. Error: ${JSON.stringify( err )}`, 'info', NAME );
                                    callback( err );
                                    return;
                                }
                                Y.log( 'Rest controller has decrypted data', 'info', NAME );
                                decryptionData.patientPubKey = result.patientPubKey;
                                callback( null, result.decryptedData, decryptionData );
                            }
                        } );
                        break;
                    default:
                        Y.log( `The source ${data.source_} does not supported for decryption`, 'info', NAME );
                        callback( new Y.doccirrus.commonerrors.DCError( 403, { message: `The source ${data.source_} does not supported for decryption` } ) );
                }
            } else {
                Y.log( 'content_ is empty. Data decryption is not need.', 'debug', NAME );
                callback( null, data, decryptionData );
            }
        }

        /**
         * Encrypts data
         * @method encryptData
         * @param {Object} config
         * @param {Object} config.user
         * @param {*} config.content
         * @param {Object} config.encryptionData
         * @param {Object} config.encryptionData.patientPubKey either patientPubKey or id_ + pubKeyHash_ is required
         * @param {Object} config.encryptionData.id_
         * @param {Object} config.encryptionData.pubKeyHash_
         * @param {Function} callback
         */
        encryptData( config, callback ) {
            let
                user = config.user,
                content = config.content,
                encryptionData = config.encryptionData;

            switch( encryptionData.source_ ) {
                case 'patient':
                    Y.doccirrus.api.patient.encryptPatientData( {
                        user: user,
                        data: {
                            patientPubKey: encryptionData.patientPubKey,
                            patientId: encryptionData.id_,
                            pubKeyHash: encryptionData.pubKeyHash_,
                            content: content
                        },
                        callback: function( err, result ) {
                            if( err ) {
                                Y.log( `Rest controller has not encrypted data. Error: ${JSON.stringify( err )}`, 'info', NAME );
                                callback( err );
                                return;
                            }
                            Y.log( 'Rest controller has encrypted data', 'info', NAME );
                            encryptionData.prcPublicKey = result.prcPublicKey;
                            callback( null, result.encryptedData, encryptionData );
                        }
                    } );
                    break;
                default:
                    Y.log( `The source ${encryptionData.source_} does not supported for data encryption`, 'info', NAME );
                    callback( new Y.doccirrus.commonerrors.DCError( 403, { message: `The source ${encryptionData.source_} does not supported for data encryption` } ) );
            }

        }



        /**
         * @method handleRequest
         * @param {Object} config
         * @param {Object} config.params
         * @param {Object} config.req
         * @param {Object} config.lang
         * @param {Function} [config.redirect]
         * @param {Function} callback
         *
         * @return {Function} callback
         */
        handleRequest( config, callback ) {

            var
                self = this,
                rest = { fields: 'all' },
                async = require( 'async' );

            this.setupRestObject( rest, {
                params: config.params,
                lang: config.lang,
                req: config.req,
                redirectFunction: config.redirect
            } );

            let useAction = rest.action;
            
            switch( useAction ) {
                case 'get': useAction = 'read';     break;
                case 'put': useAction = 'update';   break;
                case 'post': useAction = 'create';    break;
            }

            //check if user belongs to allow group for the api call (for non public urls)
            if (!rest.httpRequest.isDCPublic && !Y.doccirrus.jsonrpc.privilige.evaluator.isAllowed(rest.user, rest.model, useAction)){
                Y.log( `handleRequest: User (${rest.user ? '_id: ' + rest.user._id : 'n/a'}) with no role tried to call api: ${rest.model}.${rest.action}`, 'warn', NAME);
                return callback( new Y.doccirrus.commonerrors.DCError( 403, {message: 'User does not have enough access rights.'}) );
            }

            async.waterfall( [
                function( next ) {
                    if( ( config.req.isFromFriend || config.req.hasValidOauthToken ) && !config.req.isDCPublic ) {
                        let
                            param = {
                                api: Y.doccirrus.api[ rest.model ],
                                rest
                            };

                        if( config.req.isFromFriend ) {
                            param.friend = config.req.friendData && config.req.friendData.appName;
                            param.dcServerType = config.req.friendData && config.req.friendData.serverType;
                        } else {
                            Y.log(`handleRequest: Received request via Oauth process from server: ${config.req.oauthData && config.req.oauthData.serverType}`, "info", NAME);
                            param.dcServerType = config.req.oauthData && config.req.oauthData.serverType;
                        }

                        Y.doccirrus.tokenManager.checkApiAccessAndGetUser( param, ( err, user ) => {
                            if( err ) {
                                return next( err );
                            }
                            rest.user = user;
                            return next();
                        } );
                    } else {
                        setImmediate( next );
                    }
                },
                function( next ) {
                    self.setCallback( rest, next );
                    if( ( config.req.isFromFriend || config.req.hasValidOauthToken ) && rest.data ) {
                        const
                            requestType = `${config.req.isFromFriend ? "friend." : ""}${config.req.hasValidOauthToken ? "Oauth": ""}`;

                        Y.log( `handleRequest: Rest controller is processing request from: ${requestType}`, 'debug', NAME );

                        // request from patient portal
                        async.waterfall( [
                            function( next ) {
                                /**
                                 * check public key hash
                                 */
                                let
                                    data = rest.data,
                                    decryptionData = {
                                        pubKeyHash_: data.pubKeyHash_,
                                        id_: data.id_,
                                        source_: data.source_,
                                        content_: data.content_
                                    };
                                delete data.pubKeyHash_;
                                delete data.id_;
                                delete data.source_;
                                delete data.content_;
                                if( !decryptionData.pubKeyHash_ ) {
                                    Y.log( `pubKeyHash_ is not set. Do not need to decrypt/encrypt data.`, 'debug', NAME );
                                    return next( null, decryptionData );
                                }

                                Y.log( `Rest controller is trying to get public key for source "${decryptionData.source_}"`, 'info', NAME );
                                switch( decryptionData.source_ ) {
                                    case 'patient':
                                        Y.doccirrus.api.patient.findPatientKeyByHash( {
                                            user: rest.user,
                                            data: {
                                                patientId: decryptionData.id_,
                                                pubKeyHash: decryptionData.pubKeyHash_
                                            },
                                            callback: function( err, patientPubKey ) {
                                                decryptionData.patientPubKey = patientPubKey;
                                                next( err, decryptionData );
                                            }
                                        } );
                                        break;
                                    default:
                                        Y.log( `The source ${data.source_} does not supported for decryption/encryption`, 'info', NAME );
                                        callback( new Y.doccirrus.commonerrors.DCError( 403, { message: `The source ${data.source_} does not supported for decryption/encryption` } ) );
                                }

                            },
                            function( decryptionData, next ) {
                                self.decryptData( {
                                    user: rest.user,
                                    data: rest.data,
                                    decryptionData: decryptionData
                                }, function( err, result, decryptionData ) {
                                    if( err ) {
                                        Y.log( `handleRequest: Error during data decryption. The ${requestType} request will be rejected. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                        next( err );
                                        return;
                                    }
                                    Object.keys( result ).forEach( prop => {
                                        rest.data[ prop ] = result[ prop ];
                                    } );

                                    next( err, decryptionData );
                                } );
                            },
                            function( decryptionData, next ) {

                                rest.callback = function( error, response, warning ) {
                                    if( error ) {
                                        return next( error );
                                    }
                                    if( decryptionData && response ) {
                                        self.encryptData( {
                                            content: (response.result ? response.result : response),
                                            encryptionData: decryptionData,
                                            user: rest.user
                                        }, function( err, result, encryptionData ) {
                                            let
                                                _response;
                                            if( err ) {
                                                Y.log( `Error during data encryption. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                                return next( err );
                                            }
                                            _response = {
                                                content_: result,
                                                senderPublicKey_: encryptionData.prcPublicKey
                                            };
                                            if( response.result ) {
                                                response.result = _response;
                                            } else {
                                                response = _response;
                                            }
                                            next( err, response, warning );

                                        } );
                                    } else {
                                        next( null, response, warning );
                                    }
                                };
                                self.callApi( rest, 'RESTController_1' );

                            }
                        ], function( error, response, warning ) {
                            rest._callback( error, response, warning );
                        } );
                    } else {
                        self.callApi( rest, 'RESTController_1' );
                    }
                }
            ], callback );
        }
    }

    var handler = new Rest_1Handler();

    Y.namespace( 'doccirrus' ).RESTController_1 = {
        /**
         * The REST controller simply calls the correct API to
         * deal with the concrete request in each instance.
         *
         * APIs registered here should returns pure JSON RESTfully
         * so that the front-end can use a model based view of the data to
         * display it.
         *
         * 1) Access models using the REST controller as follows:
         *
         * HTTP <action>   /1/<model>/field1/value1/field2/value2/...?<paging_params>
         *
         * <action> is handled here, but can be overridden in <model>-api.server.js
         * the field/value will be translated to a query object and fed into <action> handler
         *
         * 2) Access custom functions as follows:
         *
         * HTTP (GET|POST)  /1/<model>/:<customFunction>?<params>
         *
         *
         * Restrictions on <params>
         *
         *   These are RESERVED WORDS and MUST NOT be used in forms as input field id's or names.
         *   Y.doccirrus.urls.PARAM_LIMIT = 'itemsPerPage',
         *   Y.doccirrus.urls.PARAM_PAGE = 'page',
         *   Y.doccirrus.urls.PARAM_COUNT = 'totalItems',
         *   Y.doccirrus.urls.PARAM_CODE = 'replyCode',
         *   Y.doccirrus.urls.PARAM_RESULT = 'Results',
         *   Y.doccirrus.urls.PARAM_SORT = 'sort',
         *   Y.doccirrus.urls.PARAM_SEARCH = 'query',
         *   Y.doccirrus.urls.PARAM_ACTION = 'action',  // legacy deprecated
         *   Y.doccirrus.urls.PARAM_CONTONERROR = 'continueOnError', // not accepted from client
         *   Y.doccirrus.urls.PARAM_HARDDEL = 'hardDelete',  // not accepted from client
         *   Y.doccirrus.urls.PARAM_OVERWRITE = 'overwrite',  // not accepted from client
         *
         * @param {Object} config
         * @param {Object} config.params request params
         * @param {Object} config.req request
         * @param {String} config.lang
         * @param {Function} [config.redirect]
         * @param {Function} callback
         */
        handleRequest: function( config, callback ) {
            handler.handleRequest( config, callback );
        },
        defaultHandlers: handler.defaultHandlers

    };

    Y.log( 'RESTController_1 initialized', 'debug', NAME );
}, '0.0.1', {
    requires: [
        'dcutils',
        'RestHandlerClass',
        'dcquery',
        'tokenManager'
    ]
} );
