/**
 *  User: pi
 *  Date: 24/07/15  12:53
 *  (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI*/
YUI.add( 'jawbone-api', function( Y, NAME ) {

        /**
         * @module jawbone-api
         */


        var
            i18n = Y.doccirrus.i18n,
            MEAL = i18n('PatPortalMojit.jawboneAPI.title.MEAL' ),
            SLEEP = i18n('PatPortalMojit.jawboneAPI.title.SLEEP' ),
            MOOD = i18n('PatPortalMojit.jawboneAPI.title.MOOD' ),
            MOVE = i18n('PatPortalMojit.jawboneAPI.title.MOVE' ),
            WEIGHT = i18n('PatPortalMojit.jawboneAPI.title.WEIGHT' ),
            HEART_RATE = i18n('PatPortalMojit.jawboneAPI.title.HEART_RATE' ),
            WORKOUT = i18n('PatPortalMojit.jawboneAPI.title.WORKOUT' ),
            EXTENDED = i18n('PatPortalMojit.jawboneAPI.title.EXTENDED' ),
            jawbonePrefix = 'https://jawbone.com',
            jawboneDataTypes = Object.freeze( {
                MEAL: Object.freeze({
                    value:'meal_read',
                    i18n: MEAL
                }),
                SLEEP: Object.freeze({
                    value: 'sleep_read',
                    i18n: SLEEP
                }),
                MOOD: Object.freeze({
                    value: 'mood_read',
                    i18n: MOOD
                }),
                MOVE: Object.freeze({
                    value: 'move_read',
                    i18n: MOVE
                }),
                WEIGHT: Object.freeze({
                    value: 'weight_read',
                    i18n: WEIGHT
                }),
                HEART_RATE: Object.freeze({
                    value: 'heartrate_read',
                    i18n: HEART_RATE
                }),
                EXTENDED_INFO: Object.freeze({
                    value: 'extended_read',
                    i18n: EXTENDED
                })
            } ),
            additionalDataTypes = Object.freeze( {
                WORKOUT: Object.freeze({
                    value: 'workout',
                    i18n: WORKOUT
                })
            } );

        /**
         * Returns jawbone data types as array
         * @param {Boolean} additional if true, additional types will be included
         * @param {Boolean} fullObject if true result full object of data type(value + i18n)
         * @returns {Array}
         */
        function getDataTypesAsArray( additional, fullObject ) {
            var result = [];
            Y.Object.each( jawboneDataTypes, function( data ) {
                if(fullObject){
                    result.push( data );
                } else {
                    result.push( data.value );
                }

            } );
            if( additional ) {
                Y.Object.each( additionalDataTypes, function( data ) {
                    if(fullObject){
                        result.push( data );
                    } else {
                        result.push( data.value );
                    }
                } );
            }
            return result;
        }

        /**
         * Reads jawbone.json and returns data or error
         * @returns {Object} {data: {Object}, error: {Object}}
         */
        function readJawboneConfig() {
            var data,
                
                error;
            try {
                data = require( 'dc-core' ).config.load( process.cwd() + '/jawbone.json' );
            } catch( err ) {
                Y.log( 'Can not read jawbone settings. Error: ' + err.toString() );
                error = new Y.doccirrus.commonerrors.DCError( 'jawbone_01' );
            }
            return {
                data: data,
                error: error
            };
        }

        /**
         * Saves jawbone credential to db
         * @param {Object} user
         * @param {Object} tokenObject
         * @param {Function} callback
         */
        function setJawboneCredential( user, tokenObject, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'put',
                model: 'identity',
                fields: ['jawboneData'],
                data: Y.doccirrus.filters.cleanDbObject( {jawboneData: tokenObject} ),
                query: {
                    _id: user.identityId
                }
            }, function( err, result ) {
                if( 'function' === typeof callback ) {
                    callback( err, result );
                }
            } );
        }

        /**
         * Reads jawbone credential from db
         * @param {Object} user
         * @param {Function} callback
         */
        function getJawboneCredential( user, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'identity',
                query: {
                    _id: user.identityId
                },
                options: {
                    select: {
                        jawboneData: 1
                    }
                }
            }, function( err, results ) {
                if( err ) {
                    return callback( err );
                }
                if( !results[0] || !results[0].jawboneData ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 401 ) );
                }
                callback( err, results[0] && results[0].jawboneData );
            } );
        }

        /**
         * Removes jawbone credentials from db
         * @method removeJawboneCredential
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function removeJawboneCredential( args ) {
            setJawboneCredential( args.user, null, args.callback );
        }

        /**
         * Refreshes jawbone credential of the user
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function restoreAccessToken( args ) {
            var
                callback = args.callback,
                user = args.user,
                url = 'https://jawbone.com/auth/oauth2/token',
                jawbone = readJawboneConfig(),
                needle = require( 'needle' );

            if( jawbone.error ) {
                return callback( jawbone.error );
            }
            getJawboneCredential( user, function( err, tokenObject ) {
                var authData;
                if( err ) {
                    return callback( err );
                }
                authData = {
                    client_id: jawbone.data.client_id,
                    client_secret: jawbone.data.client_secret,
                    grant_type: 'refresh_token',
                    refresh_token: (tokenObject && tokenObject.refresh_token)
                };
                needle.post( url, authData, function( err, response ) {
                    if( err ) {
                        return args.callback( err );
                    }
                    if( response.body && response.body.error ) {
                        return args.callback( new Y.doccirrus.commonerrors.DCError( 400, {message: response.body.error_description} ) );
                    }
                    setJawboneCredential( user, response.body, function( err ) {
                        args.callback( err, [response.body.access_token] );
                    } );

                } );
            } );
        }

        /**
         * Makes query to jawbone api
         * @param {Object} config
         * @param {Object} config.url
         * @param {Object} config.user
         * @param {Object} [config.method=get]
         * @param {Object} [config.limit=200]
         * @param {Object} [config.endTime] Epoch timestamp that denotes the end of the time range of query
         * @param {Object} [config.startTime] Epoch timestamp that denotes the start of the time range of query
         * @param {Object} [config.jawboneCredential] if not provided, will be requested from db
         * @param {Function} config.callback
         */
        function requestToJawboneApi( config ) {
            var
                method = config.method || 'get',
                url = config.url,
                user = config.user,
                limit = config.limit || 200,
                startTime = config.startTime,
                endTime = config.endTime,
                finalCb = config.callback,
                jawboneCredential = config.jawboneCredential,
                needle = require( 'needle' ),
                async = require( 'async' ),
                moment = require( 'moment' ),
                options,
                params = [];

            if( 'number' !== typeof startTime ) {
                startTime = moment( startTime ).unix();
            }
            function makeGetRequest( options, jawbone, callback ) {
                Y.log( 'Making GET request to Jawbone, url: ' + url + ', headers: ' + JSON.stringify( options.headers ), 'debug', NAME );
                needle.get( url, options, function( err, response ) {
                    var result = response && response.body,
                        jawboneError;
                    if( err ) {
                        return callback( err );
                    }
                    if( result.meta && result.meta.error_type ) {
                        jawboneError = new Y.doccirrus.commonerrors.DCError( result.meta.code, {message: result.meta.message} );
                    }
                    if( result && result.data && result.data.links && result.data.links.next ) {
                        /**
                         * run recursion to get all data
                         * last batch does not have links.next
                         */
                        requestToJawboneApi( {
                            user: user,
                            url: 'https://jawbone.com' + result.data.links.next,
                            jawboneCredential: jawbone,
                            callback: function( err, _result ) {
                                if( err ) {
                                    return callback( err );
                                }
                                result.data.items = result.data.items.concat( _result.data.items );
                                result.data.size = result.data.items.length;
                                callback( err, result );
                            }
                        } );
                    } else {
                        callback( jawboneError, result );
                    }
                } );
            }

            params.push( 'start_time=' + startTime );
            params.push( 'limit=' + limit );
            if( endTime ) {
                params.push( 'end_time=' + endTime );
            }
            url = url + '?' + params.join( '&' );

            async.waterfall( [
                function( next ) {
                    if( jawboneCredential && jawboneCredential.token_type && jawboneCredential.access_token ) {
                        return next( null, jawboneCredential );
                    } else {
                        getJawboneCredential( user, next );
                    }
                },
                function( jawbone, next ) {
                    options = {
                        headers: {
                            'Authorization': jawbone.token_type + ' ' + jawbone.access_token
                        }
                    };
                    switch( method ) {
                        case 'get':
                            makeGetRequest( options, jawbone, next );
                            break;
                    }
                }
            ], finalCb );
        }

        /**
         * Checks if current token of user is valid, if no - tries to restore it.
         * @method checkAccessToken
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function checkAccessToken( args ) {
            var callback = args.callback,
                user = args.user,
                url = 'https://jawbone.com/nudge/api/v.1.1/users/@me';
            requestToJawboneApi( {
                user: user,
                url: url,
                callback: function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( results.meta && 401 === results.meta.code ) {
                        restoreAccessToken( {
                            user: user,
                            callback: callback
                        } );
                        return;
                    }
                    callback();
                }
            } );
        }

        /**
         * Provides jawbone app data
         * @method getAppConfig
         * @param {Object} args
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function getAppConfig( args ) {
            var jawbone,
                callback = args.callback;

            jawbone = readJawboneConfig();

            if( jawbone.error ) {
                return callback( jawbone.error );
            }
            args.callback( null, [
                {
                    client_id: jawbone.data.client_id,
                    redirect_uri: jawbone.data.redirect_uri,
                    scope: getDataTypesAsArray(false, true)
                }
            ] );
        }

        /**
         * Gets access token from jawbone
         * @method getAccessToken
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.code code which user received from jawbone auth service
         *
         * @return {Function} callback
         */
        function getAccessToken( args ) {
            var
                callback = args.callback,
                query = args.query || {},
                user = args.user,
                code = query.code,
                url = 'https://jawbone.com/auth/oauth2/token?',
                needle = require( 'needle' ),
                jawbone,
                urlParams = [];

            if( !code ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Invalid code'} ) );
            }
            jawbone = readJawboneConfig();
            if( jawbone.error ) {
                return callback( jawbone.error );
            }
            urlParams.push( 'client_id=' + jawbone.data.client_id );
            urlParams.push( 'client_secret=' + jawbone.data.client_secret );
            urlParams.push( 'grant_type=authorization_code' );
            urlParams.push( 'code=' + code );
            url = url + urlParams.join( '&' );
            Y.log( 'JAWBONE: request to get access token, url: ' + url, 'debug', NAME );
            needle.get( url, function( err, response ) {
                if( err ) {
                    return args.callback( err );
                }
                setJawboneCredential( user, response.body, function( err ) {
                    args.callback( err, [response.body.access_token] );
                } );

            } );

        }

        /**
         * Requests data from jawbone
         * @param {Object} config
         * @param {Object} config.user
         * @param {Object} config.dataType type of requested data
         * @param {Object} [config.endTime] Epoch timestamp that denotes the end of the time range of query
         * @param {Object} [config.startTime=beginning of current day] Epoch timestamp that denotes the start of the time range of query.
         * @param {Object} [config.jawboneCredential]
         * @param {Object} config.callback
         * @see requestToJawboneApi
         */
        function getDataFromJawbone( config ) {
            var
                moment = require( 'moment' ),
                user = config.user,
                dataType = config.dataType,
                callback = config.callback,
                jawboneCredential = config.jawboneCredential,
                startTime = config.startTime || moment().startOf( 'day' ).unix(),
                endTime = config.endTime,
                url;
            switch( dataType ) {
                case jawboneDataTypes.MEAL.value:
                    url = jawbonePrefix + '/nudge/api/v.1.1/users/@me/meals';
                    break;
                case jawboneDataTypes.SLEEP.value:
                    url = jawbonePrefix + '/nudge/api/v.1.1/users/@me/sleeps';
                    break;
                case jawboneDataTypes.MOOD.value:
                    url = jawbonePrefix + '/nudge/api/v.1.1/users/@me/mood';
                    break;
                case jawboneDataTypes.MOVE.value:
                    url = jawbonePrefix + '/nudge/api/v.1.1/users/@me/moves';
                    break;
                case jawboneDataTypes.WEIGHT.value:
                    url = jawbonePrefix + '/nudge/api/v.1.1/users/@me/body_events';
                    break;
                case jawboneDataTypes.HEART_RATE.value:
                    url = jawbonePrefix + '/nudge/api/v.1.1/users/@me/heartrates';
                    break;
                case jawboneDataTypes.EXTENDED_INFO.value:
                    url = jawbonePrefix + '/nudge/api/v.1.1/users/@me';
                    break;
                case additionalDataTypes.WORKOUT.value:
                    url = jawbonePrefix + '/nudge/api/v.1.1/users/@me/workouts';
                    break;
                default:
                    url = jawbonePrefix + '/nudge/api/v.1.1/users/@me';
            }
            requestToJawboneApi( {
                method: 'get',
                url: url,
                callback: callback,
                user: user,
                jawboneCredential: jawboneCredential,
                startTime: startTime,
                endTime: endTime
            } );
        }

        /**
         * Requests all accessible information about user from jawbone
         * @method getPatientJawboneData
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} [args.query.startTime]
         * @param {Function} args.callback
         * @see getDataFromJawbone
         */
        function getPatientJawboneData( args ) {
            var
                callback = args.callback,
                user = args.user,
                query = args.query || {},
                async = require( 'async' );

            async.waterfall( [
                function( next ) {
                    getJawboneCredential( user, next );
                },
                function( jawbone, next ) {
                    var dataToRequest = jawbone.access || getDataTypesAsArray( true ),
                        data = {};
                    async.eachSeries( dataToRequest, function( dataType, done ) {
                        getDataFromJawbone( {
                            user: args.user,
                            dataType: dataType,
                            jawboneCredential: jawbone,
                            startTime: query.startTime,
                            callback: function( err, response ) {
                                if( err ) {
                                    if( 401 === err.code ) {
                                        dataToRequest = dataToRequest.filter( function( _dataType ) {
                                            return _dataType !== dataType;
                                        } );
                                        return done();
                                    } else {
                                        return done( err );
                                    }
                                }
                                data[dataType.replace( '_read', '' )] = response.data;
                                done();
                            }
                        } );
                    }, function( err ) {
                        jawbone.access = dataToRequest;
                        if( err ) {
                            return next( err );
                        }
                        setJawboneCredential( user, jawbone, function( err ) {
                            next( err, data );
                        } );
                    } );
                }
            ], function( err, data ) {
                callback( err, data );
            } );
        }

        /**
         * @class jawbone
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).jawbone = {
            /**
             * @property name
             * @type {String}
             * @default jawbone-api
             * @protected
             */
            name: NAME,
            getAppConfig: function( args ) {
                Y.log('Entering Y.doccirrus.api.jawbone.getAppConfig', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.jawbone.getAppConfig');
                }
                getAppConfig( args );
            },
            getAccessToken: function( args ) {
                Y.log('Entering Y.doccirrus.api.jawbone.getAccessToken', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.jawbone.getAccessToken');
                }
                getAccessToken( args );
            },
            getPatientJawboneData: function( args ) {
                Y.log('Entering Y.doccirrus.api.jawbone.getPatientJawboneData', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.jawbone.getPatientJawboneData');
                }
                getPatientJawboneData( args );
            },
            checkAccessToken: function( args ) {
                Y.log('Entering Y.doccirrus.api.jawbone.checkAccessToken', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.jawbone.checkAccessToken');
                }
                checkAccessToken( args );
            },
            removeJawboneCredential: function( args ) {
                Y.log('Entering Y.doccirrus.api.jawbone.removeJawboneCredential', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.jawbone.removeJawboneCredential');
                }
                removeJawboneCredential( args );
            }
        };

    },
    '0.0.1', {requires: ['dccommonerrors']}
);