/**
 * User: pi
 * Date: 20/02/2015  14:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add(
    'cardioconfiguration-api',
    function( Y, NAME ) {

        /**
         * @module cardioconfiguration-api
         */


        /**
         *  Save passed array of configs
         *
         *  If new config (w/o _id) then post, if already existed (with _id) just update
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.data               Should be an array of configs
         *  @param  {Function}  args.callback           Of the form fn( err )
         */
        async function saveConfig( args ) {
            Y.log('Entering Y.doccirrus.api.cardioconfiguration.saveConfig', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cardioconfiguration.saveConfig');
            }
            const
                { formatPromiseResult } = require( 'dc-core' ).utils,
                { user, data, callback } = args;

            let err, result; // eslint-disable-line

            for( let config of data ) {
                if( config._id ) {
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'cardioconfiguration',
                            action: 'update',
                            query: {
                                _id: config._id
                            },
                            data: Y.doccirrus.filters.cleanDbObject( config )
                        } )
                    );

                    if( err ) {
                        Y.log( `saveConfig: Error while updating cardioconfiguration ${config._id}. Error: ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }
                } else {
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'cardioconfiguration',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( config )
                        } )
                    );

                    if( err ) {
                        Y.log( `saveConfig: Error while creating new cardioconfiguration. Error: ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }
                }
            }
            return callback();
        }

        /**
         *  Delete cardioconfig by _id
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {String}    args.query              config's _id
         *  @param  {Function}  args.callback           Of the form fn( err )
         */
        async function deleteConfig( args ) {
            Y.log('Entering Y.doccirrus.api.cardioconfiguration.deleteConfig', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cardioconfiguration.deleteConfig');
            }
            const
                { formatPromiseResult } = require( 'dc-core' ).utils,
                { user, query, callback } = args;

            let err, result; // eslint-disable-line

            if( !query ) {
                Y.log( `deleteConfig error. No query - cannot delete cardioconfiguration.`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'insufficient arguments' } ) );
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'cardioconfiguration',
                    action: 'delete',
                    query: {
                        _id: query
                    }
                } )
            );

            if( err ) {
                Y.log( `saveConfig: Error while deleting cardioconfiguration ${ query }. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            return callback();
        }

        /**
         * @class cardio
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).cardioconfiguration = {
            name: NAME,
            get: function( { user, originalParams: data = {}, callback } ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'cardioconfiguration',
                    action: 'get',
                    query: { serviceType: data.type }
                }, function( err, res ) {
                    if( err ) {
                        return callback( err );
                    }
                    return callback( err, res );
                } );
            },
            saveConfig,
            testConfig: function( {originalParams: conf, callback} ) {

                let options = {
                    host: conf.host,
                    port: conf.port,
                    path: "/rest/api/exports",
                    method: "GET",
                    auth: conf.userId + ":" + conf.userSecret,
                    pfx: '',
                    passphrase: conf.certPass
                };

                if( !conf.host || !conf.port || !conf.userId || !conf.userSecret || !conf.certPass || !conf.cert ) {
                    Y.log( `testConfig error. Not enough params.`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 400 ) );
                }

                options.pfx = new Buffer( conf.cert, "Base64" );

                let chunks = ""; // eslint-disable-line

                let req = require( 'https' ).request( options, function( res ) {
                    res.on( "data", function( chunk ) {
                        chunks += chunk;
                    } );
                    res.on( "end", function() {
                        if( res.statusCode === 200 ) {
                            return callback( null, true );
                        } else {
                            Y.log( `testConfig error. Service connection failed. ${chunks} ${res.statusCode}`, 'warn', NAME );
                            return callback( Y.doccirrus.errors.rest( 'cardio_13001' ) );
                        }
                    } );
                } );
                Y.log( `testConfig error. HTTPS error.`, 'warn', NAME );
                req.on( "error", function( err ) {
                    callback( err );
                } );
                req.end();
            },
            deleteConfig
        };
    },
    '0.0.1', {requires: []}
);
