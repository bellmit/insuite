/**
 * User: pi
 * Date: 22/05/17  14:22
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';
YUI.add( 'cache-utils', function( Y, NAME ) {

    const
        async = require( 'async' ),
        EventEmitter = require( 'events' ),
        crypto = require( 'crypto' ),
        cluster = require('cluster'),
        {promisify} = require('util'),

        logWrapping = require('../server/utils/logWrapping.js')(Y, NAME),

        redisAdapter = {
            currentClient: null,
            event: new EventEmitter(),
            /**
             * Creates or returns (existing) redis client object
             * @method getClient
             * @returns {object}
             */
            getClient() {
                if( !this.currentClient ) {
                    //return this.createClient();
                    Y.log( 'redis client has not been initialized', 'warn', NAME );
                    return null;
                } else {
                    return this.currentClient;
                }

            },
            /**
             * @method isClientConnected
             * @param {Object} [redisClient] default is "currentClient"
             * @returns {Boolean}
             */
            isClientConnected( redisClient ) {
                let
                    client = redisClient || this.currentClient;
                return Boolean( client && client.connected );
            },
            /**
             * Creates redis client and set it to "currentClient"
             * @method createClient
             * @returns {object} "currentClient"
             */
            createClient() {
                const
                    config = Y.doccirrus.utils.tryGetConfig( 'redis.json', {
                        "path": "/var/run/redis/redis.sock"
                    } ),
                    redis = require( 'redis' );
                Y.log( 'creating redis client', 'debug', NAME );
                this.currentClient = redis.createClient( config );
                this.currentClient.on( 'connect', () => {
                    Y.log( 'Connected to redis server', 'info', NAME );
                    if( cluster.isMaster && this.currentClient.connected ) {
                        Y.log( 'Master was connected to redis', 'info', NAME );
                        Y.doccirrus.eventloopmonitor.redisConnection( { id: 0 }, this.currentClient.connected );
                    }
                    if ( cluster.isWorker ) {
                        cluster.worker.send({ isConnected: this.currentClient.connected });
                    }
                    this.event.emit( 'onConnect' );
                } );
                this.currentClient.on( 'error', ( err ) => {
                    Y.log( `Redis connection error. ${JSON.stringify( err )}`, 'warn', NAME );
                    this.event.emit( 'onError' );
                } );
                return this.currentClient;
            },
            /**
             * redis command SET
             * @method set
             * @param {Object} params
             * @param {String} params.key
             * @param {String} params.data
             * @param {Number} [params.expirySeconds]
             * @param {Function} callback
             */
            set( params, callback ) {
                const
                    { key, data, expirySeconds = null } = params,
                    client = this.getClient();
                if( this.isClientConnected() ) {
                    if( expirySeconds ) {
                        return client.set( key, data, 'EX', expirySeconds, callback);
                    } else {
                        return client.set( key, data, callback );
                    }
                }
                callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Redis offline' } ) );

            },
            /**
             * redis command KEYS
             * @method keys
             * @param {Object} params
             * @param {String} params.key key pattern
             * @param {Function} callback
             */
            keys( params, callback ) {
                Y.log('Entering Y.doccirrus.api.cacheUtils.keys', 'info', NAME);
                callback = logWrapping.wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.cacheUtils.keys');

                const
                    { key } = params,
                    client = this.getClient();
                if( this.isClientConnected() ) {
                    return client.keys( key, callback );
                }
                callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Redis offline' } ) );
            },
            /**
             * redis command GET
             * @param {Object} params
             * @param {String} params.key
             * @param {Function} callback
             */
            get( params, callback ) {
                Y.log(`Entering Y.doccirrus.api.cacheUtils.get ${params.key}`, 'info', NAME);
                callback = logWrapping.wrapAndLogExitAsync( callback, `Exiting Y.doccirrus.api.cacheUtils.get ${params.key}`);

                const
                    { key } = params,
                    client = this.getClient();
                if( this.isClientConnected() ) {
                    return client.get( key, callback );
                }
                callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Redis offline' } ) );
            },
            /**
             * redis command DEL
             * @param {Object} params
             * @param {String|Array} params.key
             * @param {Function} callback
             */
            del( params, callback ) {
                Y.log(`Entering Y.doccirrus.api.cacheUtils.del ${params.key}`, 'info', NAME);
                callback = logWrapping.wrapAndLogExitAsync( callback, `Exiting Y.doccirrus.api.cacheUtils.del ${params.key}`);

                const
                    { key } = params,
                    client = this.getClient();
                if( this.isClientConnected() ) {
                    return client.del( key, callback );
                }
                callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Redis offline' } ) );
            },
            /**
             * redis command FLUSHALL
             * @param {Function} callback
             */
            flushall( callback ) {
                Y.log(`Entering Y.doccirrus.api.cacheUtils.flushAll`, 'info', NAME);
                callback = logWrapping.wrapAndLogExitAsync( callback, `Exiting Y.doccirrus.api.cacheUtils.flushAll`);

                const
                    client = this.getClient();
                if( this.isClientConnected() ) {
                    return client.flushall( ( err ) => {
                        if( !err ) {
                            Y.log( 'command FLUSHALL has been executed.', 'debug', NAME );
                        }
                        callback( err );
                    } );
                }
                callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Redis offline' } ) );
            },
            /**
             * stringifies object
             * @method stringify
             * @param {Object|Array}data
             * @return {string} JSON string
             */
            stringify( data ) {
                return JSON.stringify( data );
            },
            /**
             * parses string
             * @param {String} stringData
             * @returns {Object|Array}
             */
            parse( stringData ) {
                let
                    result;
                try {
                    result = JSON.parse( stringData );
                } catch( err ) {
                    Y.log( `Parsing error for: ${JSON.stringify( err )}`, 'error', NAME );
                }
                return result;
            },
            /**
             * Stringifies and set data
             * @method setObject
             * @param {Object} params
             * @param {String} params.key
             * @param {Object} params.data
             * @param {Number} [params.expirySeconds]
             * @param {Function} callback
             */
            setObject( params, callback ) {
                const
                    { key, data, expirySeconds = null } = params;
                this.set( {
                    key,
                    expirySeconds,
                    data: this.stringify( data )
                }, callback );
            },
            /**
             * Gets data by key and parses it
             * @method setObject
             * @param {Object} params
             * @param {String} params.key
             * @param {Function} callback
             */
            getObject( params, callback ) {
                const
                    { key } = params;
                this.get( {
                    key
                }, ( err, data ) => {
                    let
                        result;
                    if( err ) {
                        return callback( err );
                    }
                    if( data ) {
                        result = this.parse( data );
                        if( 'undefined' === typeof result ) {
                            Y.log( `there is no value for key: ${key}`, 'warn', NAME );
                        }
                    }
                    callback( null, result );
                } );
            },
            /**
             * Removes all keys which match key pattern.
             * 1. gets all keys by pattern,
             * 2. removes all these keys.
             * removeAllByPattern
             * @param {Object} params
             * @param {String} params.key key pattern
             * @param {Function} callback
             */
            removeAllByPattern( params, callback ) {
                Y.log(`Entering Y.doccirrus.api.cacheUtils.removeAllByPattern ${params.key}`, 'info', NAME);
                callback = logWrapping.wrapAndLogExitAsync( callback, `Exiting Y.doccirrus.api.cacheUtils.removeAllByPattern ${params.key}`);

                const
                    self = this,
                    { key } = params;
                Y.log( `Removing cache by key pattern: ${key}`, 'debug', NAME );
                async.waterfall( [
                    function( next ) {
                        self.keys( { key }, next );
                    },
                    function( list, next ) {
                        if( list.length ) {
                            return self.del( { key: list }, next );
                        }
                        setImmediate( next, null, 0 );

                    }
                ], callback );
            },
            /**
             * set lock key only if not exists
             * @param {Object} params
             * @param {String} params.key key pattern
             * @param {String} params.data value to put into key
             * @param {Function} callback
             */
            acquireLock( params, callback ) {
                Y.log(`Entering Y.doccirrus.api.cacheUtils.acquireLock ${params.key}`, 'info', NAME);
                callback = logWrapping.wrapAndLogExitAsync( callback, `Exiting Y.doccirrus.api.cacheUtils.acquireLock ${params.key}`);

                const
                    { key, data } = params,
                    client = this.getClient();
                if( this.isClientConnected() ) {
                    // to set expire use: client.set( key, data, 'EX', 10, 'NX', callback ) - response OK|null
                    // just unique client.setnx( key, data, callback )                      - response 1|0
                    client.multi()
                        .setnx( key, data )
                        .get( key )
                        .exec( callback );
                    return;
                }
                Y.log('acquireLock: Redis offline', 'warn', NAME );
                callback( null, [ 0 ] );
            },
            /**
             * update part of data by index only if key exists
             * @param {Object} params
             * @param {String} params.key key pattern
             * @param {Array} [params.data] array of objects
             * @param {Number} params.index index of string part divided by | in data
             * @param {String} value to write into data part
             * @param {Function} callback
             */
            updateLockData( params, callback ) {
                Y.log(`Entering Y.doccirrus.api.cacheUtils.updateLockData ${params.key}`, 'info', NAME);
                callback = logWrapping.wrapAndLogExitAsync( callback, `Exiting Y.doccirrus.api.cacheUtils.updateLockData ${params.key}`);

                const
                    { key, data : updateData = []} = params,
                    client = this.getClient();
                if( this.isClientConnected() ) {
                    client.watch(key, function( err ) {
                        if( err ) {
                            Y.log( `updateLockData.watch: Error: ${err.message||err}`, 'error', NAME );
                            return;
                        }

                        client.get(key, (err, data) => {
                            if( err ) {
                                Y.log( `updateLockData.get: Error: ${err.message||err}`, 'error', NAME );
                                return;
                            }
                            let arr = (data || '').split('|');
                            for(let updateObj of updateData){
                                let {index, value} = updateObj;
                                if(index < arr.length){
                                    arr[index] = value;
                                }
                            }

                            let newData = arr.join('|');

                            client.multi()
                                .set( key, newData, 'XX')
                                .exec( (err, result) => {
                                    if(err){
                                        Y.log( `updateLockData.exec: Error: ${err.message||err}`, 'error', NAME );
                                        return callback( err );
                                    }
                                    if(result.length === 1 && result[0] === 'OK' ){
                                        result = [ 1, newData ];
                                    }
                                    if(result.length === 1 && result[0] === null ){
                                        result = [ 0, data ];
                                    }
                                    callback( null, result );
                                } );
                        } );
                    } );
                    return;
                }
                Y.log('updateLockData: Redis offline', 'warn', NAME );
                callback( null, [ 0 ] );
            }
        };

    class CacheHelper {
        constructor( adapter ) {
            this.adapter = adapter;
        }

        /**
         * @metho isClientConnected
         * @returns {Boolean}
         */
        isClientConnected() {
            return this.adapter.isClientConnected();
        }

        /**
         * @method getPrefix
         * @returns {string}
         */
        getPrefix() {
            return 'cache';
        }

        /**
         * Resolves key part:
         * 1. if it is undefined => return "*"
         * 2. if it is an object => stringify
         * 3. otherwise return as it is
         * @method resolveKeyPart
         * @param {String|Object|Array|Undefined} item
         * @returns {String}
         */
        resolveKeyPart( item ) {
            if( 'undefined' !== typeof item ) {
                if( 'object' === typeof item ) {
                    return JSON.stringify( item );
                }
                return item;
            } else {
                return '*';
            }
        }

        /**
         * Generates key base on params.
         * Missing parts are replaced with "*"
         * @method generateQueryKey
         * @param {Object} params
         * @param {Object} [params.user]
         * @param {String} [params.tenantId] if undefined, will be taken from user object
         * @param {String} [params.identityId] if undefined, will be taken from user object
         * @param {Array} [params.additionalParts]
         * @returns {String}
         * @example
         // generate full key
         .generateKey( {
                        user
                    } )
         // generate key which matches all tenantId caches
         .generateQueryKey( {
                        tenantId: user.tenantId
                    } )
         // generate jey which matches all user caches
         .generateKey( {
                        identityId: user.identityId
                    } )
         * @see resolveKeyPart
         */
        generateKey( params ) {
            let
                { tenantId, identityId, user, additionalParts = [] } = params,
                parts = [
                    this.getPrefix()
                ],
                userJSON;

            if( user ) {
                let
                    hash = crypto.createHash( 'md5' );
                tenantId = tenantId || user.tenantId;
                identityId = identityId || user.identityId;
                userJSON = hash.update( JSON.stringify( user ) ).digest( 'hex' );
            }
            parts = parts.concat( [
                this.resolveKeyPart( tenantId ),
                this.resolveKeyPart( identityId ),
                this.resolveKeyPart( userJSON )
            ], additionalParts.map( item => this.resolveKeyPart( item ) ) );
            return parts.join( ':' );
        }
    }

    /**
     * manage html cache
     * @class HtmlCache
     */
    class HtmlCache extends CacheHelper {
        /**
         * @method getPrefix
         * @returns {string}
         * @override
         */
        getPrefix() {
            return 'j';
        }

        /**
         *
         * @method generateHtmlKey
         * @param {Object} params
         * @param {Object} [params.user]
         * @param {String} [params.tenantId] if undefined, will be taken from user object
         * @param {String} [params.identityId] if undefined, will be taken from user object
         * @param {String} [params.url]
         * @returns {String}
         * @see generateKey
         */
        generateHtmlKey( params ) {
            let
                { user, tenantId, identityId, url } = params;
            return this.generateKey( {
                tenantId,
                identityId,
                user,
                additionalParts: [ url ]
            } );
        }

        /**
         * @method setHtml
         * @param {Object} params
         * @param {Object} params.user
         * @param {String} [params.tenantId]
         * @param {String} [params.identityId]
         * @param {String} params.url
         * @param {Object} params.data html data object {data:{Object}, meta: {Object}}
         * @param {Function} callback
         */
        setHtml( params, callback ) {
            let
                { user, tenantId, identityId, url, data } = params,
                key;
            if( !url || !data || 'object' !== typeof user ) {
                Y.log( `can not set html cache. some param is missing. url:${Boolean( url )}, data:${Boolean( data )}, user:${Boolean( user )}`, 'warn', NAME );
                return setImmediate( callback, new Y.doccirrus.commonerrors.DCError( 400, { message: 'bad params' } ) );
            }
            key = this.generateHtmlKey( { user, tenantId, identityId, url } );
            this.adapter.setObject( { data, key }, callback );
        }

        /**
         * @method getHtml
         * @param {Object} params
         * @param {Object} params.user
         * @param {String} [params.tenantId]
         * @param {String} [params.identityId]
         * @param {String} params.url
         * @param {Function} callback
         */
        getHtml( params, callback ) {
            let
                { user, url, tenantId, identityId } = params,
                key;
            if( !url || 'object' !== typeof user ) {
                Y.log( `can not get html cache. some param is missing. url:${Boolean( url )}, user:${Boolean( user )}`, 'warn', NAME );
                return setImmediate( callback, new Y.doccirrus.commonerrors.DCError( 400, { message: 'bad params' } ) );
            }
            key = this.generateHtmlKey( { user, tenantId, identityId, url } );
            this.adapter.getObject( { key }, callback );
        }

        /**
         * @method removeCache
         * @param {Object} params
         * @param {Object} [params.user]
         * @param {String} [params.tenantId]
         * @param {String} [params.identityId]
         * @param {String} [params.url]
         * @param {Function} callback
         */
        removeCache( params, callback ) {
            const
                { user, tenantId, identityId, url } = params,
                key = this.generateHtmlKey( { user, identityId, tenantId, url } );
            this.adapter.removeAllByPattern( { key: `${key}*` }, callback );
        }
    }

    /**
     * Manage mongodb cache
     * @class MongoDbCache
     */
    class MongoDbCache extends CacheHelper {
        /**
         * @method getPrefix
         * @returns {string}
         * @override
         */
        getPrefix() {
            return 'q';
        }

        /**
         * Generates key base on params.
         * Missing parts are replaced with "*"
         * @method generateQueryKey
         * @param {Object} params
         * @param {Object} [params.user]
         * @param {String} [params.tenantId] if undefined, will be taken from user object
         * @param {String} [params.identityId] if undefined, will be taken from user object
         * @param {String} [params.model]
         * @param {Object} [params.query]
         * @returns {String}
         * @see generateKey
         */
        generateQueryKey( params ) {
            let
                { user, tenantId, identityId, model, query } = params,
                sortedQuery;
            if( 'undefined' !== typeof query ) {
                sortedQuery = this.sortProperties( query );
            }
            return this.generateKey( {
                user,
                tenantId,
                identityId,
                additionalParts: [
                    model,
                    sortedQuery
                ]
            } );
        }

        /**
         * Sort first level properties of obj and returns "cloned" object
         * @method sortProperties
         * @param {Object} obj
         * @returns {Object}
         */
        sortProperties( obj ) {
            let
                keys = Object.keys( obj ),
                result = {};
            keys.sort();
            keys.forEach( key => {
                result[ key ] = obj[ key ];
            } );
            return result;
        }

        /**
         * 1. generates key for query
         * 2. calls adapter.setObject
         * @method setQuery
         * @param {Object} params
         * @param {Object} params.user
         * @param {String} [params.tenantId]
         * @param {String} [params.identityId]
         * @param {String} params.model
         * @param {Object} params.data
         * @param {Object} params.query
         * @param {Function} callback
         * @see generateQueryKey
         */
        setQuery( params, callback ) {
            let
                { user, model, tenantId, identityId, data, query } = params,
                key;
            if( 'undefined' === typeof data || !query || 'object' !== typeof user || !model ) {
                Y.log( `can not set query cache. some param is missing. data:${Boolean( data )}, model:${Boolean( model )}, user:${Boolean( user )}, query:${JSON.stringify( query )}`, 'warn', NAME );
                return setImmediate( callback, new Y.doccirrus.commonerrors.DCError( 400, { message: 'bad params' } ) );
            }
            key = this.generateQueryKey( { user, model, tenantId, identityId, query } );
            this.adapter.setObject( { data, key }, callback );

        }

        /**
         * 1. generates key for query
         * 2. calls adapter.getObject
         * @method getQuery
         * @param {Object} params
         * @param {Object} params.user
         * @param {String} [params.tenantId]
         * @param {String} [params.identityId]
         * @param {String} params.model
         * @param {Object} params.query
         * @param {Function} callback
         * @see generateQueryKey
         */
        getQuery( params, callback ) {
            let
                { user, model, tenantId, identityId, query } = params,
                key;
            if( !query || 'object' !== typeof user || !model ) {
                Y.log( `can not get query cache. some param is missing. model:${Boolean( model )}, user:${Boolean( user )}, query:${JSON.stringify( query )}`, 'warn', NAME );
                return setImmediate( callback, new Y.doccirrus.commonerrors.DCError( 400, { message: 'bad params' } ) );
            }
            key = this.generateQueryKey( { user, model, tenantId, identityId, query } );
            this.adapter.getObject( { key }, callback );
        }

        /**
         * @method removeCache
         * @param {Object} params
         * @param {Object} [params.user]
         * @param {String} [params.tenantId]
         * @param {String} [params.identityId]
         * @param {String} [params.model]
         * @param {Function} callback
         * @see generateQueryKey
         */
        removeCache( params, callback ) {
            const
                { user, tenantId, identityId, model } = params,
                key = this.generateQueryKey( { user, tenantId, identityId, model } );
            this.adapter.removeAllByPattern( { key: `${key}*` }, callback );
        }
    }

    class OauthTokenCache extends CacheHelper {
        /**
         * @method getPrefix
         * @returns {string}
         * @override
         */
        getPrefix() {
            return 'OauthToken';
        }

        /**
         * Generates redis key. Example key = 'OauthToken:0'
         * @param {Object} [params]
         * @param {String} [params.tenantId]
         * @returns {string}
         */
        generateTokenKey( params = {} ) {
            const
                { tenantId = '0' } = params;

            return `${this.getPrefix()}:${tenantId}`;
        }

        /**
         * This method saves the oauth access token in the redis cache
         * @param {Object} params :REQUIRED:
         * @param {String} [params.tenantId] :OPTIONAL: incase case of vprc this is required (if VPRC is supported in future)
         * @param {Object} params.oauthTokenObj :REQUIRED: the oauth token object to be cached in redis
         * @param {String} params.oauthTokenObj.access_token :REQUIRED: this is oauth access token
         * @param {String} params.oauthTokenObj.token_type :REQUIRED: the value would be "Bearer"
         * @param {String} params.oauthTokenObj.tokenExpiryDate :REQUIRED: ISO string date
         * @returns {Promise<*>}
         */
        async saveToken( params = {} ) {
            const
                { tenantId, oauthTokenObj } = params,
                setObjectProm = promisify(this.adapter.setObject).bind(this.adapter),
                key = this.generateTokenKey( { tenantId } );

            if( !oauthTokenObj || typeof oauthTokenObj !== "object" || !Object.keys(oauthTokenObj).length) {
                Y.log( `OauthTokenCache.saveToken(): Cannot save oauth token in redis cache. Missing/empty 'oauthTokenObj' in input params. oauthTokenObj = ${JSON.stringify(oauthTokenObj)}`, 'warn', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 400, { message: 'bad params' } ); //todo check this
            }

            return setObjectProm( { data: oauthTokenObj, key } );
        }

        /**
         * This method gets the oauth token from redis cache based on the key.
         *
         * @param {Object} [params] :OPTIONAL:
         * @param {String} [params.tenantId] :OPTIONAL: incase case of vprc this is required (if VPRC is supported in future)
         * @returns {Promise<{access_token: <String>, token_type: <String>, tokenExpiryDate: <String>}>}
         */
        getToken( params = {} ) {
            const
                { tenantId } = params,
                getObjectProm = promisify(this.adapter.getObject).bind(this.adapter),
                key = this.generateTokenKey( { tenantId } );

            return getObjectProm( { key } );
        }

        /**
         * @method removeCache
         * @param {Object} [params]
         * @param {String} [params.tenantId] :OPTIONAL: incase case of vprc this is required (if VPRC is supported in future)
         * @returns {Promise<*>}
         */
        removeCache( params = {} ) {
            const
                { tenantId } = params,
                removeAllByPatternProm = promisify(this.adapter.removeAllByPattern).bind(this.adapter),
                key = this.generateTokenKey( { tenantId } );

            return removeAllByPatternProm( { key: `${key}*` } );
        }
    }

    /**
     * Manage ratelimiter data cache
     * @class RateLimiterCache
     */
    class RateLimiterCache extends CacheHelper {

        /**
         * @method getPrefix
         * @returns {string}
         * @override
         */
        getPrefix() {
            return 'ratelimiter';
        }

        /**
         * Returns promise that resolves a Number or rejects as a String
         * 1. Check if Redis is connected
         * 2. Set Redis key (discriminator) with value 0 if it doesn't already exist and expiry as expirySeconds
         * 3. Increase the value of the key
         * 4. Return result of transaction i.e. the current value of the discriminator
         *
         * @method getQuota
         * @param {String} discriminator
         * @param {Number} expirySeconds
         * @returns {Promise}
         */
        getQuota( {discriminator, expirySeconds} ) {
            if( this.adapter.isClientConnected() ) {
                let client = this.adapter.getClient();
                return new Promise( function( resolve, reject ) {
                    client
                        .multi()
                        .set( [discriminator, 0, 'EX', expirySeconds, 'NX'] )
                        .incr( discriminator )
                        .exec( function( err, replies ) {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( replies[1] );
                            }
                        } );
                } );
            } else {
                return Promise.reject( 'Redis client is disconnected' );
            }
        }

    }

    /**
     * Manage server data cache
     * @class DataCache
     */
    class DataCache extends CacheHelper {
        /**
         * @method getPrefix
         * @returns {string}
         * @override
         */
        getPrefix() {
            return 'd';
        }

        /**
         * Generates key.
         * Missing parts are replaced with "*"
         * @method generateDataKey
         * @param {Object} params
         * @param {String} [params.key]
         * @param {String} [params.tenantId]
         * @returns {String}
         * @see generateKey
         */
        generateDataKey( params ) {
            const
                { key, tenantId = 'tenantId' } = params;
            return this.generateKey( {
                tenantId: tenantId,
                identityId: 'identityId',
                additionalParts: [
                    key
                ]

            } );
        }

        /**
         * 1. generates key for data
         * 2. calls adapter.setObject
         * @method setQuery
         * @param {Object} params
         * @param {String} params.key
         * @param {String} [params.tenantId]
         * @param {Number} [params.expirySeconds]
         * @param {Object} params.data
         * @param {Function} callback
         * @see generateDataKey
         */
        setData( params, callback ) {
            let
                { key, data, tenantId, expirySeconds = null } = params,
                _key;
            if( 'undefined' === typeof data || !key ) {
                Y.log( `can not set data cache. some param is missing. data:${Boolean( data )}, key:${Boolean( key )}`, 'warn', NAME );
                return setImmediate( callback, new Y.doccirrus.commonerrors.DCError( 400, { message: 'bad params' } ) );
            }
            _key = this.generateDataKey( { key, tenantId } );
            this.adapter.setObject( { data, key:_key, expirySeconds }, callback );

        }

        /**
         * 1. generates key for data
         * 2. calls adapter.getObject
         * @method getData
         * @param {Object} params
         * @param {String} params.key
         * @param {Function} callback
         * @see generateDataKey
         */
        getData( params, callback ) {
            let
                { key, tenantId } = params,
                _key;
            if( !key ) {
                Y.log( `can not get data cache. some param is missing. key:${Boolean( key )}`, 'warn', NAME );
                return setImmediate( callback, new Y.doccirrus.commonerrors.DCError( 400, { message: 'bad params' } ) );
            }
            _key = this.generateDataKey( { key, tenantId } );
            this.adapter.getObject( { key: _key }, callback );
        }

        /**
         * @method removeCache
         * @param {Object} params
         * @param {Object} [params.user]
         * @param {String} [params.tenantId]
         * @param {String} [params.identityId]
         * @param {String} [params.model]
         * @param {Function} callback
         * @see generateDataKey
         */
        removeCache( params, callback ) {
            const
                { key } = params,
                _key = this.generateDataKey( { key } );
            this.adapter.removeAllByPattern( { key: `${_key}*` }, callback );
        }

        /**
         * @method acquireLock
         * @param {Object} params
         * @param {Object} [params.user]
         * @param {String} [params.tenantId]
         * @param {String} [params.identityId]
         * @param {String} [params.key] - will be part of composed key d:{tenantId}:identityId:*:{key}
         * @param {String} [params.data]
         *
         * @see generateDataKey
         *
         * @returns {Promise}{Array} index:0 - status of operation, index:1 - data in lock key
         */
        acquireLock( params ) {
            const
                _key = this.generateDataKey( params ),
                { data = (new Date()).getTime() } = params,
                self = this;
            return new Promise( ( resolve, reject ) => {
                self.adapter.acquireLock( { key: `${_key}`, data }, (err, result) => {
                    if( err ){
                        return reject( err );
                    }
                    resolve( result );
                } );
            } );
        }

        /**
         * @method releaseLock
         * @param {Object} params
         * @param {Object} [params.user]
         * @param {String} [params.tenantId]
         * @param {String} [params.identityId]
         * @param {String} [params.key]
         *
         * @see generateDataKey
         *
         * @returns {Promise}{Array} index:0 - status of operation
         */
        releaseLock( params ) {
            const
                _key = this.generateDataKey( params ),
                self = this;
            return new Promise( ( resolve, reject ) => {
                self.adapter.del( { key: `${_key}` }, (err, result) => {
                    if( err ){
                        return reject( err );
                    }
                    resolve( result === 1 ? [ 1 ] : ( result === 0 ? [ 0 ] : result ) );
                } );
            } );
        }

        /**
         * @method updateLockData
         * @param {Object} params
         * @param {Object} [params.user]
         * @param {String} [params.tenantId]
         * @param {String} [params.identityId]
         * @param {String} [params.key]
         * @param {Array} [params.data]
         * @param {Number} [params.data.index]
         * @param {String} [params.data.value]
         *
         * @see generateDataKey
         *
         * @returns {Promise}{Array} index:0 - status of operation, index:1 - data in lock key
         */
        updateLockData( params ) {
            const
                _key = this.generateDataKey( params ),
                { data } = params,
                self = this;
            return new Promise( ( resolve, reject ) => {
                self.adapter.updateLockData( {key: `${_key}`, data}, (err, result) => {
                    if( err ){
                        return reject( err );
                    }
                    resolve( result );
                } );
            } );
        }
    }

    function storeData( callback ) {
        /**
         * tmp solution - websocket reconnection does not wait till prc gets token info
         * we have to keep token data till another way of ws auth is introduced
         *
         */
        const
            async = require( 'async' ),
            storage = {};
        async.waterfall( [
            function( next ) {
                Y.doccirrus.cacheUtils.dataCache.getData( {
                    key: 'DcAppTokens'
                }, ( err, results = [] ) => {
                    if( !err ) {
                        storage.DcAppTokens = results;
                    }
                    next( null, storage );
                } );
            }
        ], callback );
    }

    function restoreData( storage = {}, callback ) {
        const
            async = require( 'async' );
        async.waterfall( [
            function( next ) {
                if( storage.DcAppTokens ) {
                    Y.doccirrus.cacheUtils.dataCache.setData( {
                        key: 'DcAppTokens',
                        data: storage.DcAppTokens
                    }, () => {
                        next();
                    } );
                } else {
                    setImmediate( next );
                }
            }
        ], callback );
    }

    Y.namespace( 'doccirrus' ).cacheUtils = {
        /**
         * Init redis client
         * @method init
         */
        init( params = {}, callback ) {
            const
                async = require( 'async' ),
                { flushall } = params,
                client = redisAdapter.createClient();
            let
                callbackWasCalled = false;
            if( flushall ) {
                client.once( 'connect', () => {
                    async.waterfall( [
                        storeData,
                        function( storage, next ) {
                            redisAdapter.flushall( ( err ) => {
                                if( err ) {
                                    Y.log( `could not flush all caches. Error: ${err.toString()}`, 'error', NAME );
                                }
                                next( null, storage );
                            } );
                        },
                        restoreData
                    ], () => {
                        if( !callbackWasCalled ) {
                            callbackWasCalled = true;
                            callback();
                        }

                    } );

                } );
                client.once( 'error', () => {
                    if( !callbackWasCalled ) {
                        callbackWasCalled = true;
                        callback();
                    }
                } );
            } else {
                setImmediate( callback );
            }
        },
        adapter: redisAdapter,
        mongoDbCache: new MongoDbCache( redisAdapter ),
        htmlCache: new HtmlCache( redisAdapter ),
        dataCache: new DataCache( redisAdapter ),
        rateLimiterCache: new RateLimiterCache( redisAdapter ),
        oauthTokenCache: new OauthTokenCache( redisAdapter )
    };

    Y.namespace( 'doccirrus.api' ).cacheUtils = {
        getData: ( args ) => {
            const { originalParams: params, callback } = args;
            new DataCache( redisAdapter ).getData( params, callback );
        }
    };
}, '0.0.1', {
    requires: [ 'dcutils', 'dccommonerrors' ]
} );