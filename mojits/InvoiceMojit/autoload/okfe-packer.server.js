/**
 * User: sabine.gottfried
 * Date: 11.02.21  15:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'okfe-packer', function( Y, NAME ) {

        const
            {spawn} = require( 'child_process' ),
            joinPaths = require( 'path' ).join,
            envConfig = Y.doccirrus.utils.getConfig( 'env.json' ),
            baseQDocu = envConfig.directories.xkm,
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;


        async function spawnXPacker( args ) {
            const {packerDir, filePath, elNode, key, packerType, outputFile, password } = args;
            let shellParams;

            if(packerType === 'XPacker') {
                const keyPath = joinPaths(packerDir, 'keys', key);
                shellParams = {
                    bin: 'java',
                    shellArgs: [
                        '-jar XPacker-4.2.8-jar-with-dependencies.jar -e',
                        `-f  ${filePath}`,
                        `-o  ${filePath}`,
                        `-t  ${elNode}`,
                        `-k  ${keyPath}`
                    ]
                };
            }



            if(packerType === 'TPacker') {
                shellParams = {
                    bin: 'java',
                    shellArgs: [
                        '-jar TPacker-4.2.8-jar-with-dependencies.jar -e -z',
                        `-f  ${filePath}`,
                        `-o  ${outputFile}`,
                        `-p  ${password}`
                    ]
                };
            }

            let [err, command] = await formatPromiseResult( Y.doccirrus.binutilsapi.constructShellCommand( shellParams ) );

            if( err ) {
                Y.log( `could not construct shell okfe-packer command: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            Y.log( `executing okfe-packer ${command} in ${packerDir}`, 'info', NAME );
            return new Promise( ( resolve, reject ) => {

                let params = command.split( ' ' ).filter( el => el.trim() ),
                    stderr = "",
                    returnedAlready = false;

                const processExitStatus = ( code ) => {
                    if( !returnedAlready ) { //return only once
                        returnedAlready = true;

                        if(code !== 0) {
                            return reject( new Error(`${stderr}`));
                        }

                        resolve( code );
                    }
                };

                if( !params.length ) {
                    return reject( Error( 'okfe-packer: command not given' ) );
                }

                const packerProcess = spawn( params[0], params.slice( 1 ), {cwd: packerDir, shell: true} );

                packerProcess.stderr.on( 'data', ( data ) => {
                    stderr += data;
                    Y.log( `okfe-packer stderr: ${data}`, 'warn', NAME );
                } );

                packerProcess.stdout.on( 'data', ( data ) => {
                    Y.log( `okfe-packer stdout: ${data}`, 'info', NAME );
                } );

                packerProcess.on( 'error', ( error ) => {
                    Y.log( `okfe-packer  error spawning packer  ${error}`, 'warn', NAME );
                    processExitStatus( error && error.code );
                } );

                packerProcess.on( 'close', ( code ) => {
                    Y.log( `okfe-packer  ${command} in ${packerDir} exited with code ${code}`, 'info', NAME );
                    processExitStatus( code );
                } );
            } );
        }


        async function execute( args ) {
            const {filePath, callback, elNode, key, packerType, outputFile, password} = args;
            const packerDir = joinPaths( baseQDocu, 'qdocu-packer' );
            let err;

            if( !packerDir ) {
                return handleResult( Y.doccirrus.errors.rest( 400, 'packer dir not given' ), undefined, callback );
            }

            if( !filePath ) {
                return handleResult( Y.doccirrus.errors.rest( 400, 'insufficient parameters' ), undefined, callback );
            }

            [err] = await formatPromiseResult( spawnXPacker( {filePath, packerDir, elNode, key, packerType, outputFile, password} ) );

            if( err ) {
                Y.log( `okfe-packer: execute: could not spawn packer: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( undefined, null, callback );
        }

        Y.namespace( 'doccirrus.okfe' ).packer = {
            name: NAME,
            execute
        };
    },
    '0.0.1', {requires: ['xpm']}
);