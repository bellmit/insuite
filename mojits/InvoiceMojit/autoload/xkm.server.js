/*global YUI */


YUI.add( 'xkm', function( Y, NAME ) {

        const
            envConfig = Y.doccirrus.utils.getConfig( 'env.json' ),
            XKM_DIR = envConfig.directories.xkm,
            XKM_VERSION_FILENAME = 'kmversion.json',
            TOOL_VERSIONS = {};


        var uuid = require( 'node-uuid' ),
            exec = require( 'child_process' ).exec,
            XKM_ERRS = [
                'ok',
                'chunk data in unchunked delivery',
                'no input file',
                'configuration error',
                'internal error',
                'cancel by user',
                'wrong or malformed key',
                'i/o error',
                'unused',
                'missing chunk',
                'unable to write to protocol',
                'checksum error'
            ];

        function createTenantDirName( tenantId ) {
            return tenantId + '-' + uuid.v1();
        }

        /**
         * Encrypts data with the KBV Kryptomodul.
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.fileName
         * @param {Buffer} args.query.fileBinary
         * @param {String} args.query.mode See "Kryptomodul" manual for more information
         * @param {Function} args.callback
         */
        function encrypt( args ) {
            Y.log('Entering Y.doccirrus.xkm.encrypt', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.xkm.encrypt');
            }
            var fs = require( 'fs' ),
                Path = require( 'path' ),
                queryParams = args.query,
                callback = args.callback,
                cryptoDir = Y.doccirrus.api.kbvlog.getKbvPathFor( 'km' ),
                tmpTenantDir = createTenantDirName( args.user.tenantId ),
                tmpTenantPath = Path.join( cryptoDir, tmpTenantDir ),
                inputFileName = queryParams.fileName,
                outputFileName = inputFileName + '.XKM',
                inputFilePath = Path.join( tmpTenantPath, inputFileName ),
                outputFilePath = Path.join( tmpTenantPath, outputFileName ),
                xkmExecutableName = 'dc-verschluesselung.sh',
                mode = queryParams.mode,
                xkmExecutablePath = Path.join( XKM_DIR, xkmExecutableName );

            function onCreated( done ) {

                function outputReadCb( err, data ) {
                    if( err ) {
                        done( err );
                        return;
                    }

                    done( null, {
                        fileName: outputFileName,
                        filePath: outputFilePath,
                        fileBinary: data
                    } );
                }

                function statCb( err, stats ) {
                    if( err || !stats.isFile() ) {
                        return done( 'Could not determine output stats for' + outputFilePath + ': ' + (err || ' path is no directory') );
                    }

                    fs.readFile( outputFilePath, outputReadCb );
                }

                function execCb( err ) {
                    if( err ) {
                        Y.log( 'error executing kbv-km ' + err, 'error', NAME );
                    }
                    var code = err ? err.code : 0;

                    if( code ) {
                        return done( new Error( XKM_ERRS[+code] || 'unknown error ' + 127 ) );
                    }
                    //check existence of the xkm file
                    fs.stat( outputFilePath, statCb );
                }

                function writeFileCb( err ) {
                    var tmpPath = Path.join( tmpTenantPath, 'tmp' ),
                        cmd = xkmExecutablePath + ' -m ' + mode + ' -f ' + inputFilePath + ' -v ' + tmpTenantPath + ' -j ' + tmpPath + ' -p ' + tmpPath;

                    if( err ) {
                        Y.log( 'Could not write input file for CON encryption' + err, 'error', NAME );
                        done( err );
                        return;
                    }

                    Y.log( 'exec kbv-km ' + cmd, 'info', NAME );
                    Y.log( 'exec kbv-km cwd ' + XKM_DIR, 'info', NAME );
                    exec( cmd, {cwd: XKM_DIR}, execCb );

                }

                fs.writeFile( inputFilePath, queryParams.fileBinary, writeFileCb );
            }

            Y.doccirrus.fileutils.createTmpAndDeleteAfter( tmpTenantPath, onCreated, callback );
        }

        /**
         * Decrypts data with the KBV Kryptomodul.
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.mode
         * @param {Object} args.query
         * @param {String} args.query.fileName
         * @param {Buffer} args.query.fileBinary
         * @param {Function} args.callback
         */
        function decrypt( args ) {
            Y.log('Entering Y.doccirrus.xkm.decrypt', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.xkm.decrypt');
            }
            var fs = require( 'fs' ),
                Path = require( 'path' ),
                queryParams = args.query,
                callback = args.callback,
                cryptoDir = Y.doccirrus.api.kbvlog.getKbvPathFor( 'km' ),
                tmpTenantDir = createTenantDirName( args.user.tenantId ),
                tmpTenantPath = Path.join( cryptoDir, tmpTenantDir ),
                inputFileName = queryParams.fileName,
                outputFileName = inputFileName.slice( 0, -4 ),
                inputFilePath = Path.join( tmpTenantPath, inputFileName ),
                outputFilePath = Path.join( tmpTenantPath, outputFileName ),
                xkmExecutableName = 'dc-verschluesselung.sh',
                testFlag = args.query.fileBinary.slice( 167, 171 ).toString(),
                mode = "TEST" === testFlag ? "TEST_Entschluesselung" : args.mode,
                xkmExecutablePath = Path.join( XKM_DIR, xkmExecutableName );

            function onCreated( done ) {

                function outputReadCb( err, data ) {
                    if( err ) {
                        done( err );
                        return;
                    }

                    done( null, {
                        fileName: outputFileName,
                        filePath: outputFilePath,
                        fileBinary: data
                    } );
                }

                function statCb( err, stats ) {
                    if( err || !stats.isFile() ) {
                        return done( 'Could not determine output stats for' + outputFilePath + ': ' + (err || ' path is no directory') );
                    }

                    fs.readFile( outputFilePath, outputReadCb );
                }

                function execCb( err ) {
                    if( err ) {
                        Y.log( 'error executing kbv-km ' + err, 'error', NAME );
                    }
                    var code = err ? err.code : 0;

                    if( code ) {
                        return done( new Error( XKM_ERRS[+code] || 'unknown error ' + 127 ) );
                    }
                    //check existence of the xkm file
                    fs.stat( outputFilePath, statCb );
                }

                function writeFileCb( err ) {
                    var tmpPath = Path.join( tmpTenantPath, 'tmp' ),
                        cmd = xkmExecutablePath + ' -m ' + mode + ' -v ' + tmpTenantPath + ' -f ' + inputFilePath + ' -t ' + tmpTenantPath + ' -j ' + tmpPath + ' -p ' + tmpPath + "/protocol";

                    if( err ) {
                        Y.log( 'Could not write input file for CON encryption' + err, 'error', NAME );
                        done( err );
                        return;
                    }

                    Y.log( 'exec kbv-km ' + cmd, 'info', NAME );
                    Y.log( 'exec kbv-km cwd ' + XKM_DIR, 'info', NAME );
                    exec( cmd, {cwd: XKM_DIR}, execCb );

                }

                fs.writeFile( inputFilePath, queryParams.fileBinary, writeFileCb );
            }

            Y.doccirrus.fileutils.createTmpAndDeleteAfter( tmpTenantPath, onCreated, callback );
        }

        // instead of encrypt method this one only takes a filepath that links to the file to be ecnrypted
        // this function is  executed in dmp mode
        function encryptFile( inputFileName, tmpPath, xkmMode, callback ) {
            if( !inputFileName || !tmpPath || !xkmMode ) {
                return callback( Error( 'insufficient arguments' ) );
            }
            const
                fs = require( 'fs' ),
                Path = require( 'path' ),
                outputFileName = inputFileName + '.XKM',
                inputFilePath = Path.join( tmpPath, inputFileName ),
                outputFilePath = Path.join( tmpPath, outputFileName ),
                xkmExecutableName = 'dc-verschluesselung.sh',
                mode = xkmMode,
                xkmExecutablePath = Path.join( XKM_DIR, xkmExecutableName );

            function statCb( err, stats ) {
                if( err || !stats.isFile() ) {
                    return callback( 'Could not determine output stats for' + outputFilePath + ': ' + (err || ' path is no directory') );
                }

                callback( null, {
                    fileName: outputFileName,
                    filePath: outputFilePath
                } );
            }

            function execCb( err ) {
                if( err ) {
                    Y.log( 'error executing kbv-km ' + err, 'error', NAME );
                }
                var code = err ? err.code : 0;

                if( code ) {
                    return callback( new Error( XKM_ERRS[+code] || 'unknown error ' + 127 ) );
                }
                //check existence of the xkm file
                fs.stat( outputFilePath, statCb );
            }

            //let xmkTmpPath = Path.join( tmpPath, 'tmp' ),
            let xmkTmpPath = Path.join( tmpPath, 'tmp' ),
                cmd = xkmExecutablePath + ' -m ' + mode + ' -f ' + inputFilePath + ' -v ' + tmpPath + ' -j ' + xmkTmpPath + ' -p ' + xmkTmpPath;

            Y.log( 'exec kbv-km ' + cmd, 'info', NAME );
            Y.log( 'exec kbv-km cwd ' + XKM_DIR, 'info', NAME );
            exec( cmd, {cwd: XKM_DIR}, execCb );
        }

        function initXkmVersion() {
            const
                fs = require( 'fs' ),
                Path = require( 'path' );
            var
                xkmVersionPath;
            if( !XKM_DIR || !XKM_VERSION_FILENAME ) {
                Y.log( `kbv km switched off in ${xkmVersionPath}`, 'warn', NAME );
                return;
            }
            xkmVersionPath = Path.join( XKM_DIR, XKM_VERSION_FILENAME );
            Y.log( `initXkmVersion: attempt to read xkm version json fro, ${xkmVersionPath}`, 'debug', NAME );

            fs.readFile( xkmVersionPath, ( err, data ) => {
                if( err ) {
                    Y.log( `could not read xkm version json from ${xkmVersionPath}`, 'error', NAME );
                    return;
                }

                let versionJson;

                try {

                    versionJson = JSON.parse( data && data.toString() );
                    TOOL_VERSIONS.XKM = versionJson && versionJson.kmversion;
                    if( TOOL_VERSIONS.XKM ) {
                        Y.log( `read kbv km version ${TOOL_VERSIONS.XKM} from ${xkmVersionPath}`, 'debug', NAME );
                    } else {
                        Y.log( `no kbv km version found in ${xkmVersionPath}`, 'error', NAME );
                    }
                } catch( error ) {
                    Y.log( `could not parse xkm version json: ${data}`, 'error', NAME );
                }
            } );

        }

        Y.doccirrus.auth.onReady( function() {
            if( !Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isPRC() ) {
                return;
            }

            initXkmVersion();
        } );

        Y.namespace( 'doccirrus' ).xkm = {

            name: NAME,
            encrypt: encrypt,
            encryptFile: encryptFile,
            decrypt: decrypt,
            TOOL_VERSIONS

        };

    },
    '0.0.1', {requires: ['dcfileutils', 'dcutils']}
);
