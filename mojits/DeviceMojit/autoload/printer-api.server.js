/*global YUI */


YUI.add( 'print-api', function( Y, NAME ) {
        /**
         * @module print-api
         */

        const
            async = require( 'async' ),
            util = require( 'util' ),
            shellexec = require( 'child_process' ).exec,
            { formatPromiseResult, handleResult } = require( 'dc-core' ).utils,

            PRINTER_POLL_INETERVAL = 10 * 60 * 1000,         //  ten minutes
            PRINTER_POLL_EVENT = 'UPDATED_ONLINE_PRINTERS',
            PRINTER_REFRESH_EVENT = 'REFRESH_ONLINE_PRINTERS';

        let
            onlinePrinters = [],
            cupsInstallStatus = false;

        /**
         *  On startup of the print API, set up IPC handlers and begin poll on master
         *  @param callback
         */

        function runOnStart( callback ) {
            const getPrinterP = util.promisify( Y.doccirrus.printer.getPrinter );

            if ( Y.doccirrus.ipc.isMaster() ) {

                Y.log( `Initializing printer polling and IPC handling on master.`, 'info', NAME );

                //  master does the poll, start it here
                setInterval( checkOnlinePrinters, PRINTER_POLL_INETERVAL );

                //  master receives requests to update the list
                Y.doccirrus.ipc.subscribeNamed( PRINTER_REFRESH_EVENT, NAME, true, onRequestRefreshList );

            } else {

                Y.log( `Initializing printer IPC listener on ${Y.doccirrus.ipc.whoAmI()}.`, 'info', NAME );

                //  workers receive updates to printer list
                Y.doccirrus.ipc.subscribeNamed( PRINTER_POLL_EVENT, NAME, true, onReceivedPrinterList );

                //  when a new worker is brought online, refresh the list
                Y.doccirrus.ipc.send( PRINTER_REFRESH_EVENT, [], false, true );

            }

            //  called on master
            async function checkOnlinePrinters() {
                let err, hasCups, result;

                //  only do this if CUPs is installed, if not, leave onlinePrinters empty
                [ err, hasCups ] = await formatPromiseResult( isCUPSEnabled() );

                if ( err || !hasCups ) { return; }

                //  passing an empty printerName causes all printers to be resurned
                [ err, result ] = await formatPromiseResult( getPrinterP( { printerName: '' } ) );

                if ( err ) {
                    //  downgraded to warning, it's sometimes OK for the system to have no printers
                    Y.log( `Could not check available printers: ${err.stack||err}`, 'warn', NAME );
                    return;
                }

                onlinePrinters = result;
                Y.log( `${Y.doccirrus.ipc.whoAmI()} updated list of printers from CUPS: ${onlinePrinters.length}` );
                Y.doccirrus.ipc.send( PRINTER_POLL_EVENT, onlinePrinters, false, false );
            }

            //  raised on workers
            function onReceivedPrinterList( latest ) {
                Y.log( `${Y.doccirrus.ipc.whoAmI()} Received list of printers from master: ${latest.length}` );
                onlinePrinters = latest;
            }

            //  raised on master when worker wants the list refreshed
            function onRequestRefreshList( data, callback ) {

                //  worker sends updated list
                if ( data && data.length ) {
                    return Y.doccirrus.ipc.send( PRINTER_POLL_EVENT, data, false, false );
                }

                //  worker did not send an updated list, get one from CUPs
                checkOnlinePrinters( callback );
            }

            callback( null );
        }

        /**
         *  Get updated list of printers from CUPs
         *
         *  Raised repeatedly on the master by timer, or on any worker when requested by special option on clients
         *
         *  @param  {Object}    args
         *  @param  {Function}  args.callback       Of the form fn( err, printerList )
         */

        async function refreshPrinterList( args ) {
            const getPrinterP = util.promisify( Y.doccirrus.printer.getPrinter );
            let err, hasCups, result;

            //  only do this if CUPs is installed, if not, empty list of printers
            [ err, hasCups ] = await formatPromiseResult( isCUPSEnabled() );

            if ( err ) {
                Y.log( `Could not get printer information, could nto check CUPs install status ${err.stack||err}.`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            if ( !hasCups ) {
                //  if no CUPS, then call back with empty list of printers
                return handleResult( null, [], args.callback );
            }

            //  passing an empty printerName causes all printers to be returned as array
            [ err, result ] = await formatPromiseResult( getPrinterP( { printerName: '' } ) );

            if ( !err ) {
                Y.doccirrus.ipc.send( PRINTER_REFRESH_EVENT, result, false, true );
            }

            handleResult( err, result, args.callback );
        }

        /**
         *  Check / list available or online printers
         *
         *  This should use a pre-cached list of printers, polled by master
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.data
         *  @param  {String}    args.data.printerName
         *  @param  {Function}  args.callback
         */

        async function getPrinter( args ) {
            Y.log('Entering Y.doccirrus.api.printer.getPrinter', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.printer.getPrinter');
            }

            const
                getPrinterP = util.promisify( Y.doccirrus.printer.getPrinter ),
                params = args.data || {},
                printerName = params.printerName || '';

            let err, hasCups, hasCli, printerDetail = [], printerObj;

            //  1.  Check that CUPS is present

            [ err, hasCups ] = await formatPromiseResult( isCUPSEnabled() );

            if ( err ) {
                Y.log( `Could not get printer information, could nto check CUPs install status ${err.stack||err}.`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            if ( !hasCups ) {
                //  if no CUPS enabled by dc-cli, we may be on a dev system with CUPS
                [ err, hasCli ] = await formatPromiseResult( Y.doccirrus.api.cli.hasDCcli() );

                if ( hasCli && false === hasCli.hasDCcli ) {
                    Y.log( `Querying CUPS for printer information, no DCcli available, not using cache`, 'info', NAME );
                    [ err, printerDetail ] = await formatPromiseResult( getPrinterP( {printerName: printerName} ) );
                }

                return handleResult( null, printerDetail, args.callback );
            }

            if ( onlinePrinters && onlinePrinters.length ) {
                if ( '' === printerName) {
                    //  client requests list of all printers
                    return handleResult( null, onlinePrinters, args.callback );
                }

                for ( printerObj of onlinePrinters ) {
                    if ( printerObj.name === printerName ) {
                        //  client request sdetails of single printer
                        return handleResult( null, [ printerObj ], args.callback );
                    }
                }

            }

            //  3.  Load printers if not cached, fallback, should generally not arrive here
            Y.log( `Querying CUPS for printer information, not using cache`, 'warn', NAME );
            [ err, printerDetail ] = await formatPromiseResult( getPrinterP( {printerName: printerName} ) );
            handleResult( err, printerDetail, args.callback );
        }

        /**
         *  Get the state of a print job from CUPs
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.data
         *  @param  {String}    args.data.printerName
         *  @param  {String}    args.data.jobId
         *  @return {Promise<*>}
         */

        async function getJob( args ) {
            Y.log('Entering Y.doccirrus.api.printer.getJob', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.printer.getJob');
            }

            const
                gePrintJobP = util.promisify( Y.doccirrus.printer.getJob ) ,

                params = args.data || {},
                printerName = params.printerName || '',
                jobId = params.jobId || '';

            //  1.  Check CUPs is installed

            let err, hasCups, result;

            [ err, hasCups ] = await formatPromiseResult( isCUPSEnabled() );

            if ( err ) {
                //  should not happen
                return handleResult( err, null, args.callback );
            }

            if ( !hasCups ) {
                //  if not CUPS then no print job data
                return handleResult( null, null, args.callback );
            }

            //  2.  Get the print job

            [ err, result ] = await formatPromiseResult( gePrintJobP( { 'printerName': printerName, 'jobId': jobId } ) );
            return handleResult( err, result, args.callback );
        }

        /**
         *  Print a file from disk
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.data
         *  @param  {String}    args.data.printerName
         *  @param  {String}    args.data.filePath
         */

        async function printFile( args ) {
            Y.log('Entering Y.doccirrus.api.printer.printFile', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.printer.printFile');
            }

            const
                printFileP = util.promisify( Y.doccirrus.printer.printFile ),
                params = args.data || {};

            //  1.  Check CUPs is installed

            let err, hasCups, result;

            [ err, hasCups ] = await formatPromiseResult( isCUPSEnabled() );

            if ( err ) {
                //  should not happen
                return handleResult( err, null, args.callback );
            }

            if ( !hasCups ) {
                //  if not CUPS then no print job data
                handleResult( null, null, args.callback );
            }

            //  2.  Create a new print job
            [ err, result ] = await formatPromiseResult(
                printFileP( {printerName: params.printerName, filePath: params.filePath} )
            );

            handleResult( err, result, args.callback );
        }

        /**
         *  Check if cups is installed, and cache first successful result
         *
         *  @param args
         *  @return {*}
         */

        async function isCUPSEnabled() {
            const
                isCupsInstalledP = util.promisify( Y.doccirrus.printer.isCUPSInstalled );

            let err, result;

            Y.log('Entering Y.doccirrus.api.printer.isCUPSEnabled', 'info', NAME);


            if ( cupsInstallStatus ) {
                return cupsInstallStatus;
            }

            [ err, result ] = await formatPromiseResult( isCupsInstalledP() );

            if ( err ) {
                Y.log( 'Could not check CUPs install status.', 'error', NAME );
                throw err;
            }

            cupsInstallStatus = result;

            Y.log( 'Exiting Y.doccirrus.api.printer.isCUPSEnabled', 'info', NAME );

            return cupsInstallStatus;
        }

        /**
         *  List the available printers and the number of jobs in their queues
         *
         *      1. List status of all CUPS printers
         *      2. Get queue length for all listed printers
         *      --> 2.1 Count jobs on a single printer
         *
         *  @param args
         */

        function listPrinterQueues( args ) {

            var
                printers = [],
                queues = [];

            //  shellCmd = "for printer in $(" + lpstatPath +  " -a | cut -d' ' -f1); do echo $printer $(" + lpstatPath + " -o $printer | wc -l);done";

            async.series( [listPrinters, countAllJobs], onAllDone );

            //  1. List status of all CUPS printers
            async function listPrinters( itcb ) {
                let [err, shellCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'lpstat',
                        shellArgs: [
                            '-a'
                        ]
                    } )
                );

                if( err ) {
                    return itcb( err );
                }

                shellexec( shellCmd, onListQueues );

                function onListQueues( err, stdout, stderr ) {
                    if( !err && stderr && '' !== stderr ) {
                        err = Y.doccirrus.errors.rest( 500, 'STDERR: ' + stderr, true );
                    }
                    if( err ) {
                        Y.log( 'Error listing printers: ' + JSON.stringify( err ), 'warn', NAME );
                        return args.callback( err );
                    }

                    var
                        lines = stdout.split( '\n' ),
                        printerName,
                        parts,
                        i;

                    for( i = 0; i < lines.length; i++ ) {
                        if( '' !== lines[i].trim() ) {
                            parts = lines[i].split( ' ' );

                            //  make safe for use on the command line
                            //  (prevent crafted printerName strings from being injected)
                            printerName = Y.doccirrus.printer.sanitizePrinterName( parts[0] );
                            printers.push( printerName );
                        }
                    }

                    itcb( null );
                }
            }

            //  2. Get queue length for all listed printers
            function countAllJobs( itcb ) {
                async.eachSeries( printers, countJobsSingle, itcb );
            }

            //  2.1 Count jobs on a single printer
            async function countJobsSingle( printerName, itcb ) {
                Y.log( 'Counting jobs on single printer: ' + printerName, 'debug', NAME );

                let [err, shellCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'lpstat',
                        shellArgs: [
                            '-o',
                            `"${printerName}"`
                        ]
                    } )
                );

                if( err ) {
                    return itcb( err );
                }

                shellexec( shellCmd, onListJobs );

                function onListJobs( err, stdout, stderr ) {
                    if( !err && stderr && '' !== stderr ) {
                        err = Y.doccirrus.errors.rest( 500, 'STDERR: ' + stderr, true );
                    }
                    if( err ) {
                        Y.log( 'Error listing print jobs on ' + printerName + ': ' + JSON.stringify( err ), 'warn', NAME );
                        //  continue despite unavailable printer or bad line in output, do not list the queue
                        return itcb( null );
                    }

                    var
                        lines = stdout.split( '\n' ),
                        countJobs = 0,
                        i;

                    for( i = 0; i < lines.length; i++ ) {
                        if( '' !== lines[i].trim() ) {
                            countJobs = countJobs + 1;
                        }
                    }

                    Y.log( 'Print jobs on ' + printerName + ': ' + printers[printerName], 'debug', NAME );
                    queues.push( {
                        'printerName': printerName,
                        'queueLen': countJobs
                    } );

                    itcb( null );
                }
            }

            //  Finally
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Could not enumerate printer queues: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                args.callback( null, queues );
            }

        }

        /**
         *  Delete all jobs enqueued at the given printer
         *
         *      1. List available printers, to to sanitize request
         *      2. Printer exists, cancel all queues (series of shell commands)
         *      --> 2.5 Run a single shell command
         *
         *  @param  args
         *  @param  args.originalParams             {Object}
         *  @param  args.originalParams.printerName {String}
         */

        function clearPrinterQueue( args ) {
            var
                async = require( 'async' ),

                params = args.originalParams,
                printerName = params.printerName || '',
                printers;

            if( '' === printerName ) {
                return args.callback( Y.doccirrus.errors.rest( 404, 'Please specify a printerName', true ) );
            }

            //  make safe for use on the command line
            //  (prevent crafted printerName strings from being injected)
            printerName = Y.doccirrus.printer.sanitizePrinterName( printerName );

            async.series(
                [
                    loadPrinters,
                    cancelAllJobs
                ],
                onAllDone
            );

            //  1. List available printers, to to sanitize request
            function loadPrinters( itcb ) {
                function onPrintersListed( err, printerList ) {
                    if( err ) {
                        Y.log( 'Could not list printers: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    printers = printerList;

                    var
                        found = false,
                        i;

                    for( i = 0; i < printers.length; i++ ) {
                        if( printers[i].name === printerName ) {
                            found = true;
                        }
                    }

                    //  if printer not found then reject, potential command injection
                    if( false === found ) {
                        return itcb( Y.doccirrus.errors.rest( 404, 'Unknown printer: ' + printerName, true ) );
                    }

                    itcb( null );
                }

                Y.doccirrus.printer.getPrinter( {printerName: ''}, onPrintersListed );
            }

            //  2. Printer exists, cancel all queues (series of shell commands)
            async function cancelAllJobs( itcb ) {
                var shellCmds = [];

                let [err, shellCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'cupsdisable',
                        shellArgs: [
                            `"${printerName}"`
                        ]
                    } )
                );

                if( err ) {
                    return itcb( err );
                }
                shellCmds.push( shellCmd );

                [err, shellCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'cancel',
                        shellArgs: [
                            '-a',
                            `"${printerName}"`
                        ]
                    } )
                );

                if( err ) {
                    return itcb( err );
                }
                shellCmds.push( shellCmd );

                [err, shellCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'cupsenable',
                        shellArgs: [
                            `"${printerName}"`
                        ]
                    } )
                );

                if( err ) {
                    return itcb( err );
                }
                shellCmds.push( shellCmd );

                async.eachSeries( shellCmds, runSingleCommand, onCancelComplete );

                function onCancelComplete( err ) {
                    if( err ) {
                        Y.log( 'Error cancelling print job: ' + JSON.stringify( err ), 'debug', NAME );
                        return itcb( err );
                    }
                    itcb( null );
                }
            }

            //  2.5 Run a single shell command
            function runSingleCommand( shellCmd, itcb ) {
                Y.log( '>> Running shell command: ' + shellCmd, 'debug', NAME );
                shellexec( shellCmd, onCommandComplete );

                function onCommandComplete( err, stdout, stderr ) {
                    if( !err && stderr && '' !== stderr ) {
                        err = Y.doccirrus.errors.rest( 500, 'STDERR: ' + stderr, true );
                    }
                    if( err ) {
                        Y.log( 'Error running command ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    Y.log( 'Command completed successfully, stdout: ' + stdout, 'debug', NAME );
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Error while clearing printer queue: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                //  callback with new queue information
                listPrinterQueues( args );
            }
        }

        function get(args) {
            Y.log('Entering Y.doccirrus.api.printer.get', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.printer.get');
            }
            var myCb = args.callback;

            args.callback = function( err, result ) {
                /*if(result) {
                    return myCb( err, result.map( ( item ) => {
                        return {name: item.name};
                    } ) );
                }*/

                return myCb( err, result );
            };

            getPrinter( args );
        }

        /**
         * @class print
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).printer = {
            runOnStart,
            get,
            getPrinter,
            getJob,
            printFile,
            refreshPrinterList,

            listQueues: listPrinterQueues,
            clearQueue: clearPrinterQueue
        };

    },
    '0.0.1', {requires: ['dcprinter', 'dcipc']}
);
