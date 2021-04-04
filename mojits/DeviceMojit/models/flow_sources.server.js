/**
 * User: pi
 * Date: 26/08/2015  16:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add(
    'flow_sources',
    function( Y, NAME ) {
        /**
         * @module flow_sources
         */

        /**
         * HELPERS
         */

        let {
            i18n,
            api: { flowlog },
            schemas: { v_flowsource: { resourceTypes: resTypes } }
        } = Y.doccirrus;

        function i18nComponent(compName) {
            return i18n( `flow-schema.ResourceType_E.${compName}.i18n` );
        }

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
            let
                result = '';
            if( !path ) {
                return result;
            }
            result = path.replace( /\.\.\//g, '' );
            return result;
        }

        /**
         * Creates file data object
         * @param {Object || String} data
         * @param {String} path
         * @param {String} deviceServer
         * @returns {Object}
         */
        function prepareFileData( data, path, deviceServer ) {
            return {
                _data: { data, path },
                _meta: {
                    deviceServer,
                    postAction: 'unlink',
                    key: path
                }
            };
        }

        function filterFile( config, filename ) {
            const regex = new RegExp( config.filter || '' );
            
            let sep = config.filePath.match(/\/|\\/);
            if( sep ) {
                sep = sep[0]; // set from user input
            } else {
                sep = require('path').delimiter; // or set from OS
            }

            return !config.blacklist[config.filePath+sep+filename] && !filename.match( /^\./ ) && !(config.filter && regex.test( filename ));
        }

        /**
         * Reads files from directory
         * @param {Object} config
         * @param {String} config.localFolderPath main folder path
         * @param {String} config.filePath path from resource
         * @param {Function} callback
         */
        function readDirectoryFilesFromFS( config, callback ) {
            const
                localFolderPath = config.localFolderPath,
                filePath = config.filePath,
                path = require( 'path' ),
                fs = require( 'fs' ),
                async = require( 'async' ),
                dirPath = path.join( localFolderPath, cleanPath( filePath ) );

            async.waterfall( [
                function( next ) {
                    fs.readdir( dirPath, next );
                },
                function( files, next ) {
                    files = files.filter( filename => filterFile(config, filename) );
                    async.filter( files, function( file, done ) {
                        const
                            completePath = path.join( dirPath, file );
                        fs.stat( completePath, function( err, stats ) {
                            if( err ) {
                                return done( false );
                            }
                            done( !stats.isDirectory() );
                        } );
                    }, function( results ) {
                        next( null, results );
                    } );
                },
                function( files, next ) {

                    async.mapSeries( files, function( file, _next ) {
                        const
                            completePath = path.join( dirPath, file );
                        fs.readFile( completePath, function( err, data ) {
                            let
                                _data;
                            if( err ) {
                                return next( err );
                            }
                            _data = prepareFileData( data, completePath, null );
                            _next( err, _data );
                        } );
                    }, next );
                }
            ], function( err, data ) {
                if( err && 'ENOENT' === err.code ) {
                    return callback( Y.doccirrus.errors.rest( 21007, '', true ) );
                }
                callback( err, data );
            } );
        }

        /**
         * Reads files from directory via smb
         * @param {Object} config
         * @param {String} config.smbUser username
         * @param {String} config.smbPw password
         * @param {String} config.filePath path to file
         * @param {String} config.smbShare share directory
         * @param {Function} callback
         */
        function smbReadDirectoryFiles( config, callback ) {
            const
                async = require( 'async' );

            function readFiles( params, callback ) {
                let
                    files = params.files,
                    smbConfig = params.smbConfig,
                    filePath = smbConfig.filePath;

                files = files.filter( filename => filterFile(config, filename) );
                if( '\\' !== filePath.slice( -1 ) ) {
                    filePath += '\\';
                }

                async.mapSeries( files, function( filename, next ) {
                    const
                        completePath = filePath + filename;
                    smbConfig.filePath = completePath;
                    Y.doccirrus.api.file.smbclientReadFile( {
                        query: smbConfig,
                        callback: function( err, data ) {
                            let
                                _data;
                            if( err ) {
                                return next( err );
                            }
                            _data = prepareFileData( data, completePath, null );
                            next( err, _data );
                        }
                    } );
                }, callback );
            }

            Y.doccirrus.api.file.smbclientReaddir( {
                query: config,
                callback: function( err, files ) {
                    if( err ) {
                        return callback( err );
                    }
                    readFiles( {
                        files: files,
                        smbConfig: config
                    }, callback );
                }
            } );
        }

        /**
         * Reads files from device server
         * @param {Object} config
         * @param {String} config.deviceServers device server name
         * @param {String} config.filePath path from resource
         * @param {String} config.filter filter for filename
         * @param {Function} callback
         */
        function readDirectoryFilesFromDeviceServer( config, callback ) {
            let {deviceServers, filePath: basePath, overwrite = {}} = config,
                path = require( 'path' ),
                async = require( 'async' );

            const errors = [];
            const result = [];
            let localDummyImportIndicator = false;

            Y.doccirrus.api.sdManager.getDeviceServerNamesFromLokalDummy( deviceServers )
                .then( currentConnectedDeviceServers => {
                    if( currentConnectedDeviceServers !== deviceServers ) {
                        localDummyImportIndicator = true;
                        deviceServers = currentConnectedDeviceServers;
                    }
                } )
                .catch( err => {
                    Y.log( `error getting device server names from sd-manager: ${JSON.stringify( err )}`, 'error', NAME );
                } )
                .finally( () => {
                    async.eachSeries( deviceServers, ( deviceServer, cb ) => {
                        async.waterfall( [
                            function( next ) {
                                Y.doccirrus.api.device.readDirDeviceServer( {
                                    query: {
                                        deviceServer: deviceServer,
                                        path: basePath,
                                        fileOnly: true,
                                        overwrite: overwrite
                                    },
                                    callback: function( err, files ) {
                                        if( err && !localDummyImportIndicator ) {
                                            errors.push( {
                                                deviceServer,
                                                code: err.code,
                                                data: err.data
                                            } );
                                        }
                                        next( err, files );
                                    }
                                } );
                            }, function( files, next ) {
                                files = files.filter( filename => filterFile( config, filename ) );
                                async.eachSeries( files, function( file, _next ) {
                                    const completePath = path.join( basePath, file );
                                    Y.doccirrus.api.device.readFileDeviceServer( {
                                        query: {
                                            deviceServer: deviceServer,
                                            path: completePath,
                                            overwrite
                                        },
                                        callback: function( err, data ) {
                                            let fileData;
                                            if( err ) {
                                                Y.log( `readDirectoryFilesFromDeviceServer. can not read file: ${completePath}, error: ${JSON.stringify( err )}`, 'error', NAME );
                                                return next( err );
                                            }
                                            if( data === null ) { // File not fully written, will be tried again at the next flow iteration.
                                                return next();
                                            }
                                            fileData = prepareFileData( data, completePath, deviceServer );
                                            fileData._data.deviceServer = deviceServer;
                                            fileData._data.basePath = basePath;
                                            result.push( fileData );
                                            if( err ) {
                                                errors.push( err );
                                            }
                                            _next();
                                        }
                                    } );
                                }, err => {
                                    if( err ) {
                                        errors.push( err );
                                    }
                                    next();
                                } );
                            }
                        ], function( err, data ) {
                            if( err && 'ENOENT' === err.code && !localDummyImportIndicator ) {
                                return cb( Y.doccirrus.errors.rest( 21007, '', true ) );
                            } else if( err && localDummyImportIndicator ) {
                                Y.log( `Device Server Lokal/Dummy Import error.., error: ${JSON.stringify( err )}`, 'debug', NAME );
                            }
                            cb( null, data || true );
                        } );
                    }, () => {
                        callback( errors, result );
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
         */
        function callResourceApiMethod( config, callback ) {
            const
                resource = config.resource,
                user = config.user,
                data = config.data,
                query = config.query,
                action = config.action;
            if( Y.doccirrus.api[resource.collectionName] && 'function' === typeof Y.doccirrus.api[resource.collectionName][resource.apiMethod] ) {
                Y.doccirrus.api[resource.collectionName][resource.apiMethod]( {
                    user: user,
                    query: query,
                    action: action,
                    data: data,
                    options: {
                        lean: true
                    },
                    callback: callback
                } );
            } else if ( resource.collectionName === 'gridFS' ) {
                Y.doccirrus.gridfs.getMediportXMLs( user, query.invoiceXMLs, callback );
            } else {
                Y.log( `Api method does not exist. Collection name: ${resource.collectionName}, method: ${resource.apiMethod}`, 'warn', NAME );
                callback( Y.doccirrus.errors.rest( 400, 'Api method does not exist.', true ) );
            }
        }


        /**
         * SOURCES
         */

        const flow_sources = {
            name: NAME
        };

        flow_sources[resTypes.XDTSERIAL] = function XDTSERIAL( config, data, user, callback ) {
            if( config.source.serialPath ){
                callback( null, [ {
                    serialData: data,
                    device: config.source.serialPath
                } ] );
            } else {
                error( "no serial path given/configured", callback );
            }
        };

        flow_sources[resTypes.FILE] = function FILE( config, data, user, callback ) {
            const source = config.source;
            const localFolderPath = Y.doccirrus.auth.getDirectories( 'smbRootIn' );

            switch( source.fileType ) {
                case Y.doccirrus.schemas.file.fileTypes.DOWNLOAD:
                    readDirectoryFilesFromFS( {
                        filter: source.filter,
                        filePath: source.filePath,
                        localFolderPath: localFolderPath,
                        blacklist: config.fileBlacklist
                    }, callback );
                    break;
                case Y.doccirrus.schemas.file.fileTypes.SMBSHARE:
                    smbReadDirectoryFiles( {
                        smbUser: source.smbUser,
                        smbPw: source.smbPw,
                        smbShare: source.smbShare,
                        filePath: source.filePath,
                        blacklist: config.fileBlacklist
                    }, callback );
                    break;
                case Y.doccirrus.schemas.file.fileTypes.DEVICE_SERVER:
                    readDirectoryFilesFromDeviceServer( {
                        deviceServers: source.deviceServers,
                        filePath: source.filePath,
                        filter: source.filter,
                        overwrite: config.overwrite,
                        blacklist: config.fileBlacklist
                    }, (err, res) => {
                        if ( err.length > 0 ) {
                            err = err.map( e => {
                                if (e.code) {
                                    return Y.doccirrus.errorTable.getMessage( { code: e.code } ) + ( e.data?` (${require('util').inspect( e.data, { depth: 10 } )})`:"");
                                }
                                else {
                                    return e;
                                }
                            } );
                            flowlog.log( config.title, i18nComponent(resTypes.FILE), `Datei konnte nicht gelesen werden:\n${JSON.stringify( err )}`, user );
                        }
                        callback(null, res);
                    } );
                    break;
                default:
                    error(`getDataFromSource can not find fileType: ${source.fileType}`, callback);
            }
        };

        flow_sources[resTypes.DATABASE] = function DATABASE(config, data, user, callback) {
            callResourceApiMethod( {
                user: user,
                query: config.sourceQuery,
                resource: config.source
            }, callback );
        };

        const flow_sourcesPostProcess = {
            name: "flow_sourcesPostProcess"
        };

        flow_sourcesPostProcess[resTypes.XDTSERIAL] = function XDTSERIAL(config, user, callback) {
            callback();
        };

        flow_sourcesPostProcess[resTypes.FILE] = function FILE(config, user, callback) {
            let {
                flow,
                overwrite,
                meta: { postAction, key, deviceServer }
            } = config;
            let source = flow.sources[0] || {};
            let keepFiles = source.keepFiles;
            let fs = require( 'fs' );

            if ( keepFiles && 'unlink' === postAction ) {
                postAction = 'nothing';
            }

            switch( source.fileType ) {
                case Y.doccirrus.schemas.file.fileTypes.DOWNLOAD:
                    switch( postAction ) {
                        case 'unlink':
                            fs.unlink( key, callback );
                            break;
                        case 'nothing':
                            callback(null, true);
                            break;
                        default:
                            Y.log( `File postAction: "${postAction}" is not supported.`, 'debug', NAME );
                            callback();
                    }
                    break;
                case Y.doccirrus.schemas.file.fileTypes.SMBSHARE:
                    switch( postAction ) {
                        case 'unlink':
                            Y.doccirrus.api.file.smbclientUnlinkFile( {
                                query: {
                                    smbUser: source.smbUser,
                                    smbPw: source.smbPw,
                                    smbShare: source.smbShare,
                                    filePath: key
                                },
                                callback: callback
                            } );
                            break;
                        case 'nothing':
                            callback(null, true);
                            break;
                        default:
                            Y.log( `SMB postAction: "${postAction}" is not supported.`, 'debug', NAME );
                            callback();
                    }
                    break;
                case Y.doccirrus.schemas.file.fileTypes.DEVICE_SERVER:
                    switch( postAction ) {
                        case 'unlink':
                            Y.doccirrus.api.device.unlinkDeviceServer( {
                                query: {
                                    deviceServer,
                                    path: key,
                                    overwrite
                                },
                                callback
                            } );
                            break;
                        case 'nothing':
                            callback(null, true);
                            break;
                        default:
                            Y.log( `File postAction: "${postAction}" is not supported.`, 'debug', NAME );
                            callback();
                    }
                    break;
            }
        };

        flow_sourcesPostProcess[resTypes.DATABASE] = function DATABASE(config, user, callback) {
            callback();
        };


        /**
         * @class flow_sources
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).flow_sources = flow_sources;
        Y.namespace( 'doccirrus.api' ).flow_sourcesPostProcess = flow_sourcesPostProcess;

    },
    '0.0.1', {
        requires: [
            'v_flowsource-schema',
            'file-schema',
            'dc-comctl',
            'device-api',
            'flowlog'
        ]
    }
)
;
