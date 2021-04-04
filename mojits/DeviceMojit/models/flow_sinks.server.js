/**
 * User: pi
 * Date: 26/08/2015  16:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add(
    'flow_sinks',
    function( Y, NAME ) {
        /**
         * @module flow_sinks
         */

        /**
         * HELPERS
         */

        var sinkTypes = Y.doccirrus.schemas.v_flowsource.resourceTypes;
        const {promisify} = require( 'util' ),
            {formatPromiseResult} = require( 'dc-core' ).utils;

        function error(msg, cb) {
            Y.log(msg , 'warn', NAME );
            cb( Y.doccirrus.errors.rest( 400, msg, true ) );
        }

        /**
         * Removes ".." and convers path to linux format
         * @param {String} path
         * @returns {string}
         */
        function cleanPath( path ) {
            var
                result = '';
            if( !path ) {
                return result;
            }
            result = path.replace( /\.\.\//g, '' );
            return result;
        }

        /**
         * Gets free name for file
         * @param {String} filename prefix
         * @param {Array} existingFiles list of existing files
         * @param {Function} callback
         */
        function createNameNumber( filename, existingFiles, callback ) {
            function pad( num ) {
                num+="";
                while (num.length < 3) {
                    num = "0"+num;
                }
                return num;
            }

            var result = filename;
            var extension = "";
            if (filename[filename.length-4]==='.') {
                result = filename.substr(0, result.length-4);
                extension = filename.substr(-3);
            }
            if (isNaN(extension) || "" === extension) {
                extension = "000";
            }
            result = result+"."+pad(parseInt(extension, 10)+1);

            if( existingFiles.some( function( _filename ) {
                    return result === _filename;
                } ) ) {
                setImmediate( function() {
                    createNameNumber( result, existingFiles, callback );
                } );

            } else {
                return callback( result );
            }
        }

        /**
         * Writes file to file system
         * @param {Object} config
         * @param {String} config.localFolderPath main directory path
         * @param {String} config.filePath path from resource
         * @param {Boolean} config.overwriteFile
         * @param {Object} config.data
         * @param {Function} callback
         *
         * @return {Function} callback
         */
        function writeFileToFS( config, callback ) {
            var
                localFolderPath = config.localFolderPath,
                filePath = config.filePath,
                overwriteFile = config.overwriteFile,
                data = config.data,
                completePath,
                async = require( 'async' ),
                path = require( 'path' ),
                fs = require( 'fs' ),
                fileConfObj = {},
                localFolderStatObj;

            if( !filePath ) {
                return callback( Y.doccirrus.errors.rest( 400, 'filePath is mandatory.', true ) );
            }
            if( path.win32.basename( filePath ).match( /^\./ ) ) {
                return callback( Y.doccirrus.errors.rest( 21006, '', true ) );
            }

            try{
                localFolderStatObj = fs.statSync(localFolderPath);
            } catch(fileErr) {
                return callback(fileErr);
            }
            fileConfObj = {uid:localFolderStatObj.uid, gid:localFolderStatObj.gid, mode:localFolderStatObj.mode};

            completePath = path.join( localFolderPath, cleanPath( filePath ) );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.comctl.createFullPath( path.win32.dirname( completePath ), fileConfObj, function( err ) { //path.win32 is the win variant of the path module that accepts both windows and unix paths
                        Y.log( 'Flow api. Create full path, err: ' + JSON.stringify( err ), 'debug', NAME );
                        next( err );
                    } );
                },
                function( next ) {
                    if( overwriteFile ) {
                        fs.writeFile( completePath, data, (err, res)=>{
                            if(!err) {
                                try {
                                    fs.chownSync( completePath, fileConfObj.uid, fileConfObj.gid );
                                    fs.chmodSync( completePath, fileConfObj.mode );
                                } catch( fsError ) {
                                    Y.log( `Flow api(writeFileToFS): Error in chownSync/chmodSync after writing file: ${fsError}`, 'error', NAME );
                                }
                            }
                            next(err, res);
                        } );
                    } else {
                        fs.readdir( path.win32.dirname( completePath ), function( err, files ) { //path.win32 is the win variant of the path module that accepts both windows and unix paths
                            if( err ) {
                                return next( err );
                            }
                            createNameNumber( path.win32.basename( completePath ), files, function( filename ) {
                                let filePath = path.join( path.win32.dirname( completePath ), filename ); //path.win32 is the win variant of the path module that accepts both windows and unix paths
                                fs.writeFile( filePath, data, (err, res)=>{
                                    if(!err) {
                                        try {
                                            fs.chownSync( filePath, fileConfObj.uid, fileConfObj.gid );
                                            fs.chmodSync( filePath, fileConfObj.mode );
                                        } catch( fsError ) {
                                            Y.log( `Flow api(writeFileToFS): Error in chownSync/chmodSync after writing file: ${fsError}`, 'error', NAME );
                                        }
                                    }
                                    next(err, res);
                                } );
                            } );

                        } );
                    }
                }
            ], callback );

        }


        /**
         * Writes file to device server
         * @param {Object} config
         * @param {String} config.deviceServers device server name
         * @param {String} config.filePath full file path
         * @param {Boolean} config.overwriteFile
         * @param {Boolean} config.overwrite
         * @param {Object||String||Array} config.dataObj
         * @param {Function} callback
         */
        function writeFileToDeviceServer( config, callback ) {
            const
                filePath = cleanPath( config.filePath ),
                overwriteFile = config.overwriteFile,
                dataObj = config.dataObj,
                overwrite = config.overwrite,
                async = require( 'async' ),
                path = require( 'path' );

            let errors = [],
                deviceServers = config.deviceServers;

            if( !filePath ) {
                return callback( Y.doccirrus.errors.rest( 400, 'filePath is mandatory.', true ) );
            }
            if( path.win32.basename( filePath ).match( /^\./ ) ) {
                return callback( Y.doccirrus.errors.rest( 21006, '', true ) );
            }
            Y.doccirrus.api.sdManager.getOneDeviceServerNameFromLokalDummy( {
                deviceServers: deviceServers,
                ip: overwrite.ip
            } )
                .then( currentConnectedDeviceServers => {
                    if( currentConnectedDeviceServers !== deviceServers ) {
                        deviceServers = currentConnectedDeviceServers;
                    }
                } )
                .catch( err => {
                    Y.log( `error getting device server names from sd-manager: ${JSON.stringify( err )}`, 'error', NAME );
                } )
                .finally( () => {

                    //  device server may be offline or have recently changed IP
                    if ( !deviceServers || 0 === deviceServers.length ) {
                        return callback();
                    }

                    async.eachSeries( deviceServers, ( deviceServer, nextDS ) => {
                        async.waterfall( [
                            function( next ) {
                                if( overwriteFile ) {
                                    setImmediate( function() {
                                        next( null, [] );
                                    } );
                                } else {
                                    Y.doccirrus.api.device.readDirDeviceServer( {
                                        query: {
                                            deviceServer,
                                            path: path.win32.dirname( filePath ), //path.win32 is the win variant of the path module that accepts both windows and unix paths
                                            fileOnly: true,
                                            overwrite
                                        },
                                        callback: function( err, files ) {
                                            if( err ) {
                                                if( 'ENOENT' === err.code ) {
                                                    // folder does not exist, any filename will be ok
                                                    return next( null, [] );
                                                } else {
                                                    return next( err );
                                                }
                                            }
                                            next( err, files );
                                        }
                                    } );
                                }
                            },
                            function( files, next ) {
                                // in case of files added throw mediport, I do not need execute function createNameNumber
                                if ( config.isMediport ) {
                                    return next( null, filePath );
                                } else {
                                    if( files.length ) {
                                        createNameNumber( path.win32.basename( filePath ), files, function( filename ) {
                                            next( null, path.join( path.win32.dirname( filePath ), filename ) ); //path.win32 is the win variant of the path module that accepts both windows and unix paths
                                        } );
                                    } else {
                                        setImmediate( function() {
                                            next( null, filePath );
                                        } );
                                    }
                                }
                            },
                            function( completePath, next ) {
                                Y.doccirrus.api.device.writeFileDeviceServer( {
                                    query: {
                                        deviceServer,
                                        path: completePath,
                                        createFullPath: false,
                                        overwrite
                                    },
                                    data: dataObj,
                                    callback: err => {
                                        if( err ) {
                                            errors.push( err );
                                        }
                                        next();
                                    }
                                } );
                            }
                        ], nextDS );
                    }, () => {
                        if( errors.length > 0 ) {
                            callback( errors[0] );
                        } else {
                            callback();
                        }
                    } );
                } );
        }

        /**
         * Calls api method which is specified in resource.
         * @param {Object} config
         * @param {Object} config.user
         * @param {Object} config.resource source or sink
         * @param {Object} [config.query] query to api
         * @param {Object} [config.data] data to api
         * @param {Object} [config.action] action to api
         * @param {Function} callback
         *
         * @return {Function} callback
         */
        function callResourceApiMethod( config, callback ) {
            var
                resource = config.resource,
                user = config.user,
                data = config.data,
                query = config.query,
                action = config.action,
                path = config.path;
            if( Y.doccirrus.api[resource.collectionName] && 'function' === typeof Y.doccirrus.api[resource.collectionName][resource.apiMethod] ) {
                Y.doccirrus.api[resource.collectionName][resource.apiMethod]( {
                    user: user,
                    query: query,
                    action: action,
                    data: data,
                    path: path,
                    options: {
                        lean: true
                    },
                    callback: callback
                } );
            } else {
                Y.log( 'Api method does not exist. Collection name: ' + resource.collectionName + ', method: ' + resource.apiMethod, 'warn', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'Api method does not exist.', true ) );
            }
        }


        /**
         * SINKS
         */

        var flow_sinks = {
            name: NAME
        };


        flow_sinks[sinkTypes.XDTSERIAL] = function XDTSERIAL(config, user, callback, isTest) {
            if( isTest ) {
                return callback();
            }
            Y.doccirrus.api.device.sendToSerial( {
                query: {
                    serialPath: config.sink.serialPath
                },
                data: {
                    serialData: config.data
                },
                callback: callback
            } );
        };

        flow_sinks[sinkTypes.FILE] = function FILE(config, user, callback) {
            var { sink } = config;
            if ( !sink.noFile ) {
                let dataObj = config.data;
                let localFolderPath = Y.doccirrus.auth.getDirectories( 'smbRootOut' );
    
                if( !Buffer.isBuffer( dataObj ) && 'string' !== typeof dataObj ) {
                    Y.log( 'Convert data to JSON before it will be written to file. Type of data: ' + (typeof dataObj), 'debug', NAME );
                    dataObj = JSON.stringify( dataObj );
                }
                switch( sink.fileType ) {
                    case Y.doccirrus.schemas.file.fileTypes.DOWNLOAD:
                        writeFileToFS( {
                            localFolderPath: localFolderPath,
                            filePath: sink.filePath,
                            overwriteFile: sink.overwriteFile,
                            data: dataObj
                        }, (err, response) => {
                            if( err ) {
                                if(err.code === "ENOTDIR") {
                                    callback( Y.doccirrus.errors.rest( '20403') ) ;
                                } else if(err.code === "EISDIR") {
                                    callback( Y.doccirrus.errors.rest( '20404') ) ;
                                } else if(err.code === "ENOENT") {
                                    callback( Y.doccirrus.errors.rest( '20402') ) ;
                                } else {
                                    callback( err );
                                }
                            } else {
                                callback( null, response ) ;
                            }
                        } );
                        break;
                    case Y.doccirrus.schemas.file.fileTypes.SMBSHARE:
                        Y.doccirrus.api.file.smbclientWriteFile( {
                            query: sink,
                            data: dataObj,
                            callback: callback
                        } );
                        break;
                    case Y.doccirrus.schemas.file.fileTypes.DEVICE_SERVER:
                        writeFileToDeviceServer( {
                            deviceServers: sink.deviceServers,
                            filePath: sink.filePath,
                            overwriteFile: sink.overwriteFile,
                            overwrite: config.overwrite,
                            dataObj: dataObj
                        }, ( err, response ) => {
                            if( err ) {
                                if( err.code === "EISDIR" && err.errno === -4068 && err.syscall === "open" ) {
                                    //Means input file name matched an existing directory
                                    callback( Y.doccirrus.errors.rest( '20404') ) ;
                                } else if( err.code === "EPERM" ) {
                                    //Means no permission for this path to do anything (read/write etc.)
                                    callback( Y.doccirrus.errors.rest( '20405') ) ;
                                } else if( err.code === "ENOENT" && err.errno === -4058 && err.syscall === "open" ) {
                                    //One of the path in the complete path is not a directory
                                    callback( Y.doccirrus.errors.rest( '20403') ) ;
                                } else if( err.code === 408 ) {
                                    callback( Y.doccirrus.errors.rest( '500') ) ;
                                } else if( err.code === "ENOTDIR" ) {
                                    callback( Y.doccirrus.errors.rest( '20403') ) ;
                                } else if( err.code === "EISDIR" ) {
                                    callback( Y.doccirrus.errors.rest( '20404') ) ;
                                } else if( err.code === "EACCES" ) {
                                    callback( Y.doccirrus.errors.rest( '20405') ) ;
                                } else {
                                    callback( err );
                                }
                            } else {
                                callback( null, response );
                            }
                        } );
                        break;
                    default:
                        error( 'sink file type is not supported. fileType: ' + sink.fileType, callback );
                }
            } else {
                callback( null, true );
            }
        };

        flow_sinks[sinkTypes.MEDIPORT] = async function MEDIPORT(config, user, callback) {
            const { sink, data } = config;

            let writeToDC = promisify( writeFileToDeviceServer );

            let [ err, res ] = await formatPromiseResult( writeToDC( {
                deviceServers: sink.deviceServers,
                filePath: sink.incomingFileDirPath + data.filename,
                overwriteFile: false,
                overwrite: false,
                dataObj: data.dataObj,
                isMediport: true
            } ) );
            if ( err ) {
                Y.log( `Error:\n${err.stack || err.message || JSON.stringify(err)}`, 'error', NAME );
                return callback(err);
            }
            callback( null, res);
        };
        
        flow_sinks[sinkTypes.DATABASE] = function DATABASE(config, user, callback) {
            var dataObj = config.data;
            
            callResourceApiMethod( {
                user: user,
                data: dataObj.data,
                action: dataObj.action,
                query: dataObj.query,
                resource: config.sink,
                path: dataObj.path
            }, callback );
        };

        flow_sinks[sinkTypes.EVENT] = function EVENT(config, user, callback) {
            Y.doccirrus.communication.emitNamespaceEvent( {
                nsp: "/",
                tenantId: user && user.tenantId,
                event: config.sink.eventName,
                msg: config.data
            } );
            callback();
        };
        
        /**
         * @class flow_sinks
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).flow_sinks = flow_sinks;

    },
    '0.0.1', {
        requires: [
            'v_flowsource-schema',
            'file-schema',
            'dcipc',
            'dc-comctl',
            'dccommunication'
        ]
    }
);
