/**
 * User: pi
 * Date: 26/08/2015  16:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'device-api', function( Y, NAME ) {
        /**
         * @module device-api
         */

        const
            util = require( 'util' ),
            {handleResult} = require( 'dc-core' ).utils,
            { logEnter, logExit } = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME);

        /**
         * Executes ultrasound flow
         * @method pacsExport
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.patientId patient id
         * @param {Function} args.callback
         */
        function pacsExport( args ) {
            var
                user = args.user,
                callback = args.callback,
                queryParams = args.query || {};

            Y.doccirrus.api.flow.execute( {
                user: user,
                callback: callback,
                query: {
                    flowType: Y.doccirrus.schemas.flow.flowTypes.US
                },
                data: {
                    sourceQuery: {
                        _id: queryParams.patientId
                    }

                }
            } );
        }

        /**
         * Gets all devices which are configured
         * @method getConfiguredDevice
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.term path term
         * @param {Function} args.callback
         */
        function getConfiguredDevice( args ) {
            var
                user = args.user,
                callback = args.callback,
                queryParams = args.query || {};
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'inport',
                action: 'get',
                query: {
                    path: {
                        $regex: queryParams.term,
                        $options: 'i'
                    },
                    configured: true
                }
            }, callback );
        }

        /**
         * Gets all connected devices which are not configured
         * @method getNotConfiguredDevice
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.term path term
         * @param {Function} args.callback
         */
        function getNotConfiguredDevice( args ) {
            var
                user = args.user,
                callback = args.callback,
                queryParams = args.query || {};
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'inport',
                action: 'get',
                query: {
                    path: {
                        $regex: queryParams.term,
                        $options: 'i'
                    },
                    configured: false
                }
            }, callback );
        }

        /**
         * Sends data to serial device
         * @method sendToSerial
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.serialPath path to the device
         * @param {Object} args.data
         * @param {Object} args.data.serialData data for the device
         * @param {Function} args.callback
         *
         * @return {Function}
         */
        function sendToSerial( args ) {
            var
                queryParams = args.query || {},
            //user = args.user,
                data = args.data || {},
                callback = args.callback;
            if( !queryParams.serialPath || !data.serialData ) {
                Y.log( 'sendToSerial. serial path or data is missing. serial path: ' + queryParams.serialPath + ', data(converted to Boolean): ' + Boolean( data.serialData ), 'debug', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'serial path and serial data are mandatory', true ) );
            }
            Y.log( 'Sending data to: ' + queryParams.serialPath, 'debug', NAME );

            callback();
        }

        /**
         * Gets procedure list
         * @method getProcedureList
         * @param {Object} args
         * @param {Function} args.callback
         */
        function getProcedureList( args ) {
            var
                callback = args.callback;
            callback( null, Y.doccirrus.api.xdtVersions.gdt.gdt21.procedures );
        }

        /**
         * @method getS2eClients
         * @param {Object} args
         * @param {Function} args.callback
         */
        function getS2eClients( args ) {
            var
                callback = args.callback;
            Y.doccirrus.api.sdManager.getS2eClients( {
                    callback: callback
                }
            );
        }

        /**
         * Executes app
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.path app path
         * @param {String} [args.query.args] args
         * @param {String} args.query.s2eClientName s2eClient name
         * @param {Function} args.callback
         *
         * @return {Function}
         */
        function executeApp( args ) {
            var
                queryParams = args.query || {},
                callback = args.callback,
                async;
            if( !queryParams.path || !queryParams.s2eClientName && !queryParams.overwrite.ip ) {
                Y.log( 'executeApp. path or s2eClientName is missing. Path: ' + queryParams.path + ', s2eClientName: ' + queryParams.s2eClientName, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'path and s2eClientName name are mandatory', true ) );
            }
            async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.sdManager.executeS2eClient( {
                        query: {
                            client: queryParams.s2eClientName,
                            path: queryParams.path,
                            args: queryParams.args,
                            overwrite: queryParams.overwrite
                        },
                        callback: next
                    } );
                }
            ], callback );
        }

        /**
         * @method writeFileDeviceServer
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.path
         * @param {String} args.query.deviceServer
         * @param {String} args.query.createFullPath
         * @param {Array||String} args.data
         * @param {Function} args.callback
         */
        function writeFileDeviceServer( args ) {
            var
                queryParams = args.query || {},
                callback = args.callback;
            if( !queryParams.path || !queryParams.deviceServer && !queryParams.overwrite.ip ) {
                Y.log( 'writeFileDeviceServer. path or s2eClientName is missing. Path: ' + queryParams.path + ', deviceServer: ' + queryParams.deviceServer, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'path and device server name are mandatory', true ) );
            }
            Y.doccirrus.api.sdManager.writeFileS2eClient( {
                query: {
                    client: queryParams.deviceServer,
                    path: queryParams.path,
                    createFullPath: queryParams.createFullPath,
                    overwrite: queryParams.overwrite
                },
                data: args.data,
                callback: callback
            } );
        }

        /**
         * @method readFileDeviceServer
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.path
         * @param {String} args.query.deviceServer
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function readFileDeviceServer( args ) {
            var
                queryParams = args.query || {},
                callback = args.callback;
            

            if( !queryParams.path || !queryParams.deviceServer && !queryParams.overwrite.ip ) {
                Y.log( 'readFileDeviceServer. path or deviceServer is missing. Path: ' + queryParams.path + ', deviceServer: ' + queryParams.deviceServer, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'path and device server name are mandatory', true ) );
            }
            Y.log( `readFileDeviceServer: ${util.inspect( queryParams )}`, 'info', NAME );
            Y.doccirrus.api.sdManager.readFileS2eClient( {
                query: {
                    client: queryParams.deviceServer,
                    path: queryParams.path,
                    overwrite: queryParams.overwrite
                },
                data: args.data,
                callback: callback
            } );
        }
        /**
         * @method readDirDeviceServer
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.path
         * @param {String} args.query.deviceServer
         * @param {Boolean} [args.query.fileOnly=false] if true, will get only file list
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function readDirDeviceServer( args ) {
            var
                queryParams = args.query || {},
                callback = args.callback;
            if( !queryParams.path || (!queryParams.deviceServer && !queryParams.overwrite.ip) ) {
                Y.log( 'readDirDeviceServer. path or deviceServer is missing. Path: ' + queryParams.path + ', deviceServer: ' + queryParams.deviceServer, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'path and device server name are mandatory', true ) );
            }
            Y.doccirrus.api.sdManager.readDirS2eClient( {
                query: {
                    client: queryParams.deviceServer,
                    path: queryParams.path,
                    fileOnly: queryParams.fileOnly,
                    overwrite: queryParams.overwrite
                },
                callback: callback
            } );
        }
        /**
         * @method unlinkDeviceServer
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.path
         * @param {String} args.query.deviceServer
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function unlinkDeviceServer( args ) {
            var
                queryParams = args.query || {},
                callback = args.callback;
            if( !queryParams.path || !queryParams.deviceServer && !queryParams.overwrite.ip ) {
                Y.log( 'unlinkDeviceServer. path or deviceServer is missing. Path: ' + queryParams.path + ', deviceServer: ' + queryParams.deviceServer, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'path and device server name are mandatory', true ) );
            }
            Y.doccirrus.api.sdManager.unlinkS2eClient( {
                query: {
                    client: queryParams.deviceServer,
                    path: queryParams.path,
                    overwrite: queryParams.overwrite
                },
                callback: callback
            } );
        }

        /**
         * @method getGDTVersions
         * @param {Object} args
         * @param {Function} args.callback
         */
        function getGDTVersions( args ){
            var
                callback = args.callback,
                result;
            result = Y.doccirrus.api.xdtTools.getXdtVersions("gdt");
            callback( null, result );
        }

        /**
         * @method getFieldsForXDT
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.xdt
         * @param {String} args.query.version
         * @param {Function} args.callback
         * @return {Promise<any>}
         */
        async function getFieldsForXDT( args ) {
            const
                {
                    callback,
                    query: {
                        xdt,
                        version
                    }
                } = args,
                timer = logEnter( `Y.doccirrus.api.device.getFieldsForXDT` );

            if( !xdt ) {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments: no xdt provided.'} ), undefined, callback );
            }

            if( !version ) {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments: no version provided.'} ), undefined, callback );
            }

            logExit( timer );
            if(
                Y.doccirrus.api.xdtVersions.hasOwnProperty( xdt ) &&
                Y.doccirrus.api.xdtVersions[xdt].hasOwnProperty( version ) &&
                Y.doccirrus.api.xdtVersions[xdt][version].fields
            ) {
                return handleResult( null, Object.keys( Y.doccirrus.api.xdtVersions[xdt][version].fields ), callback );
            } else {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'no xdt & version matched given parameters'} ), undefined, callback );
            }
        }

        /**
         * @method getLDTVersions
         * @param {Object} args
         * @param {Function} args.callback
         */
        function getLDTVersions( args ){
            var
                callback = args.callback,
                result;
            result = Y.doccirrus.api.xdtTools.getXdtVersions("ldt");
            callback( null, result );
        }

        function shareAllPrinters( args ) {
            var data = args.data,
                callback = args.callback,
                cmd1 = '(lpstat -v | cut -d" " -f3 | cut -d":" -f1)',
                exec = require( 'child_process' ).exec,
                async = require( 'async' );

            function executeCommand( cmd, cb ) {
                exec( cmd, function( err, result ) {
                    if( err ) {
                        Y.log( 'Error while executing command: ' + cmd + ' . Err: ' + err, 'error', NAME );
                        return cb( err );
                    }
                    return cb( null, result );
                } );
            }

            args.data = Y.doccirrus.filters.cleanDbObject( args.data );

            Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model: 'admin',
                user: args.user,
                query: { _id: Y.doccirrus.schemas.admin.getId() },
                fields: [ 'allPrintersShared' ],
                data: args.data
            }, ( error ) => {
                if( error ) {
                    return callback( error );
                } else {
                    if( data.allPrintersShared ) {
                        async.waterfall( [
                            ( next ) => {
                                executeCommand( cmd1, next );
                            },
                            ( printers, next ) => {
                                let printersArr = printers && printers.split( '\n' );
                                async.eachSeries( printersArr, ( printer, done ) => {
                                    if( printer ) {
                                        let cmd2 = `lpadmin -p ${printer} -o printer-is-shared=true`;
                                        executeCommand( cmd2, done );
                                    } else {
                                        return done();
                                    }
                                }, ( err ) => {
                                    if( err ) {
                                        return next( err );
                                    } else {
                                        return next();
                                    }
                                } );
                                next();
                            }
                        ], ( err ) => {
                            if( err ) {
                                return callback( err );
                            }
                            return callback();
                        } );
                    } else {
                        return callback();
                    }
                }
            } );
        }

        /**
         * @class device
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).device = {
            /**
             * @property name
             * @type {String}
             * @default hl7-api
             * @protected
             */
            name: NAME,
            pacsExport: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.pacsExport', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.pacsExport');
                }
                pacsExport( args );
            },
            getConfiguredDevice: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.getConfiguredDevice', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.getConfiguredDevice');
                }
                getConfiguredDevice( args );
            },
            getNotConfiguredDevice: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.getNotConfiguredDevice', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.getNotConfiguredDevice');
                }
                getNotConfiguredDevice( args );
            },
            sendToSerial: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.sendToSerial', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.sendToSerial');
                }
                sendToSerial( args );
            },
            getProcedureList: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.getProcedureList', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.getProcedureList');
                }
                getProcedureList( args );
            },
            getS2eClients: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.getS2eClients', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.getS2eClients');
                }
                getS2eClients( args );
            },
            executeApp: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.executeApp', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.executeApp');
                }
                executeApp( args );
            },
            writeFileDeviceServer: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.writeFileDeviceServer', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.writeFileDeviceServer');
                }
                writeFileDeviceServer( args );
            },
            readFileDeviceServer: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.readFileDeviceServer', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.readFileDeviceServer');
                }
                readFileDeviceServer( args );
            },
            readDirDeviceServer: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.readDirDeviceServer', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.readDirDeviceServer');
                }
                readDirDeviceServer( args );
            },
            unlinkDeviceServer: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.unlinkDeviceServer', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.unlinkDeviceServer');
                }
                unlinkDeviceServer( args );
            },
            getGDTVersions: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.getGDTVersions', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.getGDTVersions');
                }
                getGDTVersions( args );
            },
            getFieldsForXDT,
            getLDTVersions: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.getLDTVersions', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.getLDTVersions');
                }
                getLDTVersions( args );
            },
            shareAllPrinters: function( args ) {
                Y.log('Entering Y.doccirrus.api.device.shareAllPrinters', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.device.shareAllPrinters');
                }
                shareAllPrinters( args );
            }
        };

    },
    '0.0.1', {
        requires: [
            'flow-schema',
            'gdt_v_21',
            'gdt_v_30',
            'gdt_v_dicomPACS',
            'dcsdmanager',
            'xdttools',
            'flowimportexport-api'
        ]
    }
);
