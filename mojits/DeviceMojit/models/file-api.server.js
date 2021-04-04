/**
 * User: pi
 * Date: 31/08/2015  14:20
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'file-api', function( Y, NAME ) {
        /**
         * @module file-api
         */

        /**
         * Transforms smb2 error to dc error format.
         * @param {Object} err
         * @param {String} err.message
         * @param {Array} result
         * @returns {Object}
         */
        function createErrorFromSmbclientErr( err, result ) {
            var
                error = Y.doccirrus.errors.rest( 400, '', true );
            if( err && 'ENOENT' === err.errno ) {
                Y.log( 'smbclient is not installed', 'error', NAME );
                error = Y.doccirrus.errors.rest( 500, 'smbclient is not installed', true );
            }
            if( result ) {
                if( -1 !== result.indexOf( 'NT_STATUS_OBJECT_NAME_NOT_FOUND' ) ) {
                    error = Y.doccirrus.errors.rest( 21002, '', true );
                }
                if( -1 !== result.indexOf( 'NT_STATUS_BAD_NETWORK_NAME' ) ) {
                    error = Y.doccirrus.errors.rest( 21001, '', true );
                }
                if( -1 !== result.indexOf( 'NT_STATUS_LOGON_FAILURE' ) ) {
                    error = Y.doccirrus.errors.rest( 21004, '', true );
                }
            }
            return error;
        }

        /**
         * Reads directory via smb
         * @method smbclientReaddir
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.smbUser username
         * @param {String} args.query.smbPw password
         * @param {String} [args.query.filePath] path to file
         * @param {String} args.query.smbShare share directory
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function smbclientReaddir( args ) {
            var
                queryParams = args.query || {},
                username = queryParams.smbUser,
                pw = queryParams.smbPw,
                filePath = queryParams.filePath || '',
                share = queryParams.smbShare,
                callback = args.callback,
                smbclient,
                SambaClient = require( 'samba-client' ),
                files,
                fileRegex = /\W{2}(.*?)\W+(\w+)\W+\d+\W{2}.{11}[0-9:]{8}\W\d{4}/;
            if( !share || !username || !pw ) {
                return callback( Y.doccirrus.errors.rest( 21000, '', true ) );
            }
            smbclient = new SambaClient( {
                address: share,
                username: username,
                password: pw
            } );
            filePath = formatPathToWin( filePath );
            if( '\\' !== filePath.slice( -1 ) ) {
                filePath += '\\';
            }

            smbclient.runCommand( 'ls', filePath + '*', '', function( err, result ) {
                if( err ) {
                    Y.log( 'readDirSmbclient. error: ' + err + ', error description: ' + result, 'error', NAME );
                    return callback( createErrorFromSmbclientErr( err, result ) );
                }
                files = result.split( '\n' );
                files = files.map( function( fileString ) {
                    var
                        parsed = fileString.match( fileRegex ),
                        fileDesc = {};
                    if( parsed && parsed.length ) {
                        fileDesc.filename = parsed[1];
                        fileDesc.fileType = parsed[2];
                    }
                    return fileDesc;
                } ).filter( function( fileDesc ) {

                    if( fileDesc.filename && ( '.' !== fileDesc.filename.slice( 0, 1 )) && fileDesc.fileType && (!/d/i.test( fileDesc.fileType )) ) {
                        return true;
                    }
                    return false;
                } ).map( function( fileDesc ) {
                    return fileDesc.filename;
                } );
                callback( err, files );
            } );

        }

        /**
         * Reads file via smb
         * @method smbclientReadFile
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.smbUser username
         * @param {String} args.query.smbPw password
         * @param {String} [args.query.filePath] path to file
         * @param {String} args.query.smbShare share directory
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function smbclientReadFile( args ) {
            var
                queryParams = args.query || {},
                username = queryParams.smbUser,
                pw = queryParams.smbPw,
                filePath = queryParams.filePath || '',
                share = queryParams.smbShare,
                callback = args.callback,
                tempFolder = Y.doccirrus.auth.getDirectories( 'tmp' ),
                localPath,
                SambaClient,
                smbclient,
                fs,
                path,
                async,
                fileData,
                filename;

            if( !share || !username || !pw || !filePath ) {
                return callback( Y.doccirrus.errors.rest( 400, 'share, username, password and file path are mandatory.', true ) );
            }
            if( !tempFolder ) {
                return callback( Y.doccirrus.errors.rest( 400, 'tmp folder not found', true ) );
            }
            fs = require( 'fs' );
            SambaClient = require( 'samba-client' );
            async = require( 'async' );
            path = require( 'path' );

            smbclient = new SambaClient( {
                address: share,
                username: username,
                password: pw
            } );

            async.waterfall( [
                function( next ) {
                    fs.stat( tempFolder, function( err ) {
                        if( err ) {
                            Y.log( 'smbclientReadFile. Tmp folder not found', 'error', NAME );
                            return next( Y.doccirrus.errors.rest( 400, 'tmp folder not found', true ) );
                        }
                        next();
                    } );
                },
                function( next ) {
                    filename = path.basename( formatPathToLinux( filePath ) );
                    if( !filename ) {
                        Y.log( 'smbclientReadFile. bad filename in file path: ' + filePath, 'error', NAME );
                        return next( Y.doccirrus.errors.rest( 400, 'bad filename', true ) );
                    }
                    smbclient.getFile( formatPathToWin( filePath ), path.join( formatPathToLinux( tempFolder ), filename ), function( err, result ) {
                        if( err ) {
                            Y.log( 'smbclientReadFile. Can not get file from smb share. path: ' + filePath, 'error', NAME );
                            return next( createErrorFromSmbclientErr( err, result ) );
                        }
                        next();
                    } );
                },
                function( next ) {

                    localPath = path.join( tempFolder, filename );
                    fs.readFile( localPath, function( err, data ) {
                        if( err ) {
                            Y.log( 'smbclientReadFile. Can not read ' + filename, 'error', NAME );
                            return next( err );
                        }
                        fileData = data;
                        next();
                    } );
                },
                function( next ) {
                    fs.unlink( localPath, function( err ) {
                        if( err ) {
                            Y.log( 'smbclientReadFile. Can not remove file ' + filename, 'error', NAME );
                            return next( err );
                        }
                        next();
                    } );
                }
            ], function( err ) {
                if( err ) {
                    return callback( err );
                }
                callback( err, fileData );
            } );
        }

        /**
         * Unlinks file via smb
         * @method smbclientUnlinkFile
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.smbUser username
         * @param {String} args.query.smbPw password
         * @param {String} args.query.filePath path to file
         * @param {String} args.query.smbShare share directory
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function smbclientUnlinkFile( args ) {
            var
                queryParams = args.query || {},
                username = queryParams.smbUser,
                pw = queryParams.smbPw,
                filePath = queryParams.filePath || '',
                share = queryParams.smbShare,
                callback = args.callback,
                SambaClient,
                smbclient;

            if( !share || !username || !pw || !filePath ) {
                return callback( Y.doccirrus.errors.rest( 400, 'share, username, password and file path are mandatory.', true ) );
            }

            SambaClient = require( 'samba-client' );

            smbclient = new SambaClient( {
                address: share,
                username: username,
                password: pw
            } );

            smbclient.runCommand( 'rm', formatPathToWin( filePath ), '', function( err, result ) {
                if( err ) {
                    Y.log( 'smbclientUnlinkFile. Can not remove file. Error: ' + err + ', error desc: ' + result + '\n' + 'filePath: ' + filePath, 'error', NAME );
                    return callback( createErrorFromSmbclientErr( err, result ) );
                }
                callback();
            } );
        }
        /**
         * Writes file via smb
         * @method smbclientWriteFile
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.smbUser username
         * @param {String} args.query.smbPw password
         * @param {String} args.query.filePath path to file
         * @param {String} args.query.smbShare share directory
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function smbclientWriteFile( args ) {
            var
                queryParams = args.query || {},
                username = queryParams.smbUser,
                pw = queryParams.smbPw,
                filePath = queryParams.filePath || '',
                overwriteFile = queryParams.overwriteFile,
                share = queryParams.smbShare,
                callback = args.callback,
                data = args.data || '',
                SambaClient,
                smbclient,
                async,
                path = require( 'path' ),
                fs,
                mongoose,
                tempFolder = Y.doccirrus.auth.getDirectories( 'tmp' );
            if( !share || !username || !pw || !filePath ) {
                return callback( Y.doccirrus.errors.rest( 400, 'share, username, password and file path are mandatory.', true ) );
            }

            if( path.basename( formatPathToLinux( filePath ) ).match( /^\./ ) ) {
                return callback( Y.doccirrus.errors.rest( 21006, '', true ) );
            }

            SambaClient = require( 'samba-client' );
            async = require( 'async' );
            fs = require( 'fs' );
            mongoose = require( 'mongoose' );

            smbclient = new SambaClient( {
                address: share,
                username: username,
                password: pw
            } );

            function createFullPath( dirPath, callback ) {
                Y.log( 'smbclientWriteFile. createFullPath, dirPath: ' + dirPath, 'debug', NAME );
                if( '.' === dirPath.slice( 0, 1 ) || !dirPath ) {
                    return callback();
                }
                smbclient.runCommand( 'mkdir', formatPathToWin( dirPath ), '', function( err, result ) {
                    var
                        _path = formatPathToLinux( dirPath ),
                        dirname = path.dirname( _path );
                    if( err ) {
                        return callback( err, result );
                    }
                    if( result && -1 !== result.indexOf( 'NT_STATUS_OBJECT_PATH_NOT_FOUND' ) ) {
                        createFullPath( dirname, function( err ) {
                            if( err ){
                                return callback( err );
                            }
                            createFullPath( _path, callback );
                        } );
                    } else if( result && -1 !== result.indexOf( 'NT_STATUS_OBJECT_NAME_COLLISION' ) ) {
                        callback();
                    } else if( result && -1 !== result.indexOf( 'NT_STATUS' ) ) {
                        callback( result );
                    } else {
                        callback();
                    }
                } );
            }

            function createName( filename, existingFiles ) {
                var
                    suffix = Y.doccirrus.comctl.getRandomString( 5, 'Aa#' ).toLowerCase(),
                    result = filename + suffix;
                if( existingFiles.some( function( _filename ) {
                        return result === _filename;
                    } ) ) {
                    return createName( filename, existingFiles );
                } else {
                    return result;
                }
            }

            async.waterfall( [
                function( next ) {
                    //create folder(s) if does not exist
                    var
                        _path = formatPathToLinux( filePath );

                    createFullPath( path.dirname( _path ), function( err, result ) {
                        var
                            error;
                        if( err ) {
                            Y.log( 'smbclientWriteFile. Can not create full path to file: ' + _path + '. Error: ' + err + ', description: ' + result, 'error', NAME );
                            error = createErrorFromSmbclientErr( err, result );
                            return next( error );
                        }
                        next();
                    } );
                }, function( next ) {
                    //get free name
                    var
                        _path = formatPathToLinux( filePath ),
                        directory = path.dirname( _path );
                    if( overwriteFile ) {
                        next( null, _path );
                    } else {
                        Y.doccirrus.api.file.smbclientReaddir( {
                            query: {
                                smbUser: username,
                                smbPw: pw,
                                filePath: formatPathToWin( directory ),
                                smbShare: share
                            },
                            callback: function( err, files ) {
                                var filename;
                                if( err ) {
                                    Y.log( 'smbclientWriteFile. Can not read directory: ' + directory + '. Error: ' + JSON.stringify( err ), 'error', NAME );
                                    return next( err );
                                }
                                filename = createName( path.basename( _path ), files );
                                next( err, path.join( path.dirname( _path ), filename ) );
                            }
                        } );
                    }
                },
                function( _filePath, next ) {
                    //write file to local
                    var
                        filename = path.basename( _filePath ),
                        localFilename = filename + '_' + (new mongoose.Types.ObjectId().toString());
                    fs.writeFile( path.join( tempFolder, localFilename ), data, function( err ) {
                        next( err, _filePath, localFilename );
                    } );
                },
                function( removePath, localFilename, next ) {
                    //send to smb share
                    smbclient.sendFile( path.join( tempFolder, localFilename ), formatPathToWin( removePath ), function( err, result ) {
                        if( err ) {
                            Y.log( 'smbclientWriteFile. Can not send file to sbm share. Error: ' + err + ', description: ' + result, 'error', NAME );
                            return next( createErrorFromSmbclientErr( err, result ) );
                        }
                        next( err, localFilename );
                    } );
                },
                function( localFilename, next ) {
                    // remove local file
                    var
                        localFilepath = path.join( tempFolder, localFilename );
                    fs.unlink( localFilepath, function( err ) {
                        if( err ) {
                            Y.log( 'smbclientWriteFile. Can not remove file ' + localFilepath, 'error', NAME );
                            next( err );
                        }
                        next();
                    } );
                }
            ], callback );
        }



        /**
         * Tests smb connection
         * @method testSmb
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.smbUser username
         * @param {String} args.query.smbPw password
         * @param {String} [args.query.filePath] path to file
         * @param {String} args.query.smbShare share directory
         * @param {Function} args.callback
         */
        function testSmb( args ) {
            var
                queryParams = args.query || {};

            if( queryParams.resourceType === 'sink' && args.query.filePath ) {
                queryParams.filePath = '';
            }
            Y.doccirrus.api.file.smbclientReaddir( args );
        }

        /**
         * Replaces '/' with '\'. SMB2 works with '\'
         * @param {String} path
         *
         * @return {String}
         */
        function formatPathToWin( path ) {
            path = path.replace( /\//g, '\\' );
            if( '.' === path ) {
                path = '';
            }
            return path;
        }

        /**
         * Replaces '\' with '/'.
         * @param {String} path
         *
         * @return {Function} callback
         */
        function formatPathToLinux( path ) {
            path = path.replace( /\\/g, '/' );
            if( '.' === path ) {
                path = '';
            }
            return path;
        }

        /**
         * @class file
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).file = {
            /**
             * @property name
             * @type {String}
             * @default file-api
             * @protected
             */
            name: NAME,
            testSmb: function( args ) {
                Y.log('Entering Y.doccirrus.api.file.testSmb', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.file.testSmb');
                }
                testSmb( args );
            },
            smbclientReaddir: function( args ) {
                Y.log('Entering Y.doccirrus.api.file.smbclientReaddir', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.file.smbclientReaddir');
                }
                smbclientReaddir( args );
            },
            smbclientReadFile: function( args ) {
                Y.log('Entering Y.doccirrus.api.file.smbclientReadFile', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.file.smbclientReadFile');
                }
                smbclientReadFile( args );
            },
            smbclientUnlinkFile: function( args ) {
                Y.log('Entering Y.doccirrus.api.file.smbclientUnlinkFile', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.file.smbclientUnlinkFile');
                }
                smbclientUnlinkFile( args );
            },
            smbclientWriteFile: function( args ) {
                Y.log('Entering Y.doccirrus.api.file.smbclientWriteFile', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.file.smbclientWriteFile');
                }
                smbclientWriteFile( args );
            }
        };

    },
    '0.0.1', {
        requires: [
            'dcipc',
            'flow-schema',
            'dccommunication'
        ]
    }
);
