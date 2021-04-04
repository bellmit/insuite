/**
 * User: strix
 * Date: 25/02/2020
 * (c) 2020, Doc Cirrus GmbH, Berlin
 */

/**
 * API to give accesss to memory and stack information for debugging performance issues
 */


/*global YUI*/
YUI.add( 'performance-api', function( Y, NAME ) {
        'use strict';

        const
            util = require( 'util' ),
            moment = require( 'moment' ),
            fs = require( 'fs' ),
            { formatPromiseResult, handleResult } = require('dc-core').utils,
            { logEnter, logExit } = require( '../server/utils/logWrapping.js' )(Y, NAME),
            shellexec = require( 'child_process' ).exec,

            IPC_REQUEST_PERF = 'IPC_REQUEST_PERF',

            PERF_CAPTURE_DURATION = 10,
            PERF_CAPTURE_FREQUENCY = 99;

        /**
         *  Startup routine, subscribe to IPC event
         */

        function runOnStart( callback ) {
            Y.log( 'Setting up IPC for performance API.', 'info', NAME );
            Y.doccirrus.ipc.subscribeNamed( IPC_REQUEST_PERF, NAME, true, getPerfStackSamples );
            callback( null );
        }

        /**
         *  Send an IPC ping to master and all workers, requesting stack samples from perf
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Function}  args.callback
         */

        async function captureStackTraces( args ) {
            const
                createZipP = util.promisify( Y.doccirrus.media.zip.create ),
                pid = Y.doccirrus.ipc.pid(),
                timer = logEnter( `captureStackTraces ${pid} ${Y.doccirrus.ipc.whoAmI()}` ),
                readdirP = util.promisify( fs.readdir ),
                writeFileP = util.promisify( fs.writeFile );

            let
                zipId = 'perf-' + moment().format( 'YYYY-MM-DD-HH-mm-ss' ),
                tempDir = Y.doccirrus.media.getTempDir() + zipId + '/',
                stackvisFile = tempDir + 'stackvis.sh',
                stackvisScript = '',
                filesList,
                err,
                i;

            if ( !isAdminOrSupport( args.user ) ) {
                return handleResult( { message: 'not authorized, please add ADMIN group to your employee profile' }, null, args.callback );
            }

            //  start a new zip archive
            [ err, zipId ] = await formatPromiseResult( createZipP( zipId ) );
            if ( err ) {
                return handleResult( err, null, args.callback );
            }

            Y.log( `Creating new zip archive: ${zipId}`, 'info', NAME );

            //  request all workers start recording stack traces to files in the temp directory
            Y.doccirrus.ipc.send( IPC_REQUEST_PERF, { zipId: zipId, zipDir: tempDir }, false, false );

            //  wait for five seconds past the sampling interval
            [ err ] = await formatPromiseResult( delay( ( PERF_CAPTURE_DURATION + 5 ) * 1000 ) );

            if ( err ) {
                //  should never happen
                return args.callback( err );
            }

            //  make a script to run stackvis against the captured data
            //  manually: "find ./ -name \"perf.*.txt\" -exec echo stackvis perf \\< {} \\> {}.html \\; > ${tempDir}/stackvis.sh";

            [ err, filesList ] = await formatPromiseResult( readdirP( tempDir ) );

            if ( err ) {
                Y.log( `Could not list files in zip: ${zipId}`, 'error', NAME );
                return args.callback( err );
            }

            for ( i = 0; i < filesList.length; i++ ) {
                if ( -1 !== filesList[i].indexOf( 'perf.' ) && -1 !== filesList[i].indexOf( '.txt' ) ) {
                    stackvisScript = stackvisScript + `stackvis perf < ${filesList[i]} > ${filesList[i]}.html\n`;
                }
            }

            [ err ] = await formatPromiseResult( writeFileP( stackvisFile, stackvisScript ) );
            if ( err ) {
                Y.log( `Could not add file to zip: ${zipId}`, 'error', NAME );
                return args.callback( err );
            }

            logExit( timer );
            args.callback( null, { zipUrl:  `/zip/${zipId}.zip` } );
        }

        /**
         *  Simple wrapper to promisify setTimeout
         *
         *  Credit jfriend00 on this stack overflow thread
         *  https://stackoverflow.com/questions/39538473/using-settimeout-on-promise-chain
         *
         */

        function delay(t, v) {
            return new Promise( function(resolve) {
                setTimeout( resolve.bind( null, v ), t );
            } );
        }

        /**
         *  Check if user is member of 'ADMIN' or 'SUPPORT'
         */

        function isAdminOrSupport( user ) {
            let i;
            for ( i = 0; i < user.groups.length; i++ ) {
                if ( 'ADMIN' === user.groups[i].group || 'SUPPORT' === user.groups[i].group ) {
                    return true;
                }
            }
            return false;
        }

        /**
         *  Sample stack traces from this worker
         *
         *  Note that node's default perf options do not seem to be working with the clustering, use npm linux perf to
         *  resolve Javascript function names in the stack traces.
         *
         *  @param  {Object}    params
         *  @param  {String}    params.zipId        Store files here for download later
         */
        async function getPerfStackSamples( params ) {
            const
                linuxPerf = require( 'linux-perf' ),
                pid = Y.doccirrus.ipc.pid(),
                iAm = Y.doccirrus.ipc.whoAmI().replace( ' ', '-' ),
                shellexecP = util.promisify( shellexec ),
                timer = logEnter( `captureStackTraces ${pid} ${iAm}` ),
                tempDir = params.zipDir,
                dataFile = `${tempDir}perf.${iAm}.${pid}.data`,
                stackFile = `${tempDir}perf.${iAm}.${pid}.txt`,
                chmodData = `sudo chmod 777 "${dataFile}"`,
                chmodStack = `sudo chmod 777 "${stackFile}"`;

            let
                perfRecord,
                perfConvert,
                err,
                result;

            //  make a perf file for this process (map of memory addresses to Javascript function names
            linuxPerf.start();

            [err, perfRecord] = await formatPromiseResult(
                Y.doccirrus.binutilsapi.constructShellCommand( {
                    bin: 'perf',
                    sudo: true,
                    shellArgs: [
                        'record',
                        `-F${PERF_CAPTURE_FREQUENCY}`,
                        '-p',
                        pid,
                        '-o',
                        `"${dataFile}"`,
                        '-g',
                        '--',
                        'sleep',
                        `${PERF_CAPTURE_DURATION}s`
                    ]
                } )
            );

            if( err ) {
                Y.log( `getPerfStackSamples, err: ${err.stack || err}`, 'warn', NAME );
                return;
            }

            Y.log( `Recording stack traces, exec: ${perfRecord}`, 'info', NAME );
            [err, result] = await formatPromiseResult( shellexecP( perfRecord ) );

            if( err ) {
                Y.log( `Could not invoke perf on ${pid} ${iAm}: ${err.stack || err}`, 'error', NAME );
                return;
            }

            //  stop maintaining the perf file after sampling stack traces
            linuxPerf.stop();
            Y.log( `Finished perf on ${pid} ${iAm}: ${JSON.stringify( result )}`, 'info', NAME );

            [err, perfConvert] = await formatPromiseResult(
                Y.doccirrus.binutilsapi.constructShellCommand( {
                    bin: 'perf',
                    sudo: true,
                    shellArgs: [
                        'report',
                        '>',
                        `"${stackFile}"`
                    ]
                } )
            );

            if( err ) {
                Y.log( `getPerfStackSamples, err: ${err.stack || err}`, 'warn', NAME );
                return;
            }

            //  process the captured stack traces into human-readable format
            Y.log( `Converting stack traces: ${perfConvert}` );
            [err] = await formatPromiseResult( shellexecP( perfConvert ) );
            if( err ) {
                Y.log( `Could not convert perf data on ${pid} ${iAm}: ${err.stack || err}`, 'error', NAME );
                return;
            }

            //  change permissions so that we can download the zip
            [err] = await formatPromiseResult( shellexecP( chmodData ) );
            if( err ) {
                Y.log( `Could not change permissions on ${dataFile}: ${err.stack || err}`, 'error', NAME );
                return;
            }

            [err] = await formatPromiseResult( shellexecP( chmodStack ) );
            if( err ) {
                Y.log( `Could not change permissions on ${stackFile}: ${err.stack || err}`, 'error', NAME );
                return;
            }

            //  done
            logExit( timer );
        }

        /**
         *  Test / dev route to get memory stats for the current worker, MOJ-12426
         *  @param args
         */

        function getMemoryUsage( args ) {
            const v8 = require('v8');
            let
                result = {
                    statistics: v8.getHeapStatistics(),
                    usage: process.memoryUsage()
                };

            if ( !isAdminOrSupport( args.user ) ) {
                return handleResult( { message: 'not authorized, please add ADMIN group to your employee profile' }, null, args.callback );
            }

            args.callback( null, result );
        }

        /**
         *  Expose API
         */

        Y.namespace( 'doccirrus.api' ).performance = {
            runOnStart,
            getMemoryUsage,
            captureStackTraces
        };
    },
    '0.0.1', {
        requires: [
            'dcmedia-store',
            'dcmedia-zip',
            'dcipc'
        ]
    }
);
