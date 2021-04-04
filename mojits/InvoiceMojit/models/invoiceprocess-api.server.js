/**
 * User: strix
 * Date: 2016-07-21
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'invoiceprocess-api', function( Y, NAME ) {

        /**
         * @module invoiceprocess-api
         */

        const
            SYSNUM_PROCESS_NAME = '000000000000000000000450',
            SYSNUM_PROCESS_PERCENT = '000000000000000000000451',

            //  Not currently used - if stored in GridFS we use this filename
            //MAGIC_PDF_ID = 'latest-generated-invoices.pdf',

            processNumbers = {
                'PROCESS_NONE': -1,
                'PROCESS_VALIDATE': 10,
                'PROCESS_GENERATE': 20,
                'PROCESS_GENCOMPILE': 30,
                'PROCESS_BATCHTRANSITION': 40,
                'PROCESS_BATCHTZIP': 50
            },

            i18n = Y.doccirrus.i18n,
            async = require( 'async' ),
            moment = require( 'moment' ),
            {formatPromiseResult} = require( 'dc-core' ).utils;

        //  REST METHODS

        /**
         *  Called by client when opening the cashbook, get current state of existing process
         *  @param  args
         */

        function getProcessInfo( args ) {
            Y.log('Entering Y.doccirrus.api.invoiceprocess.getProcessInfo', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoiceprocess.getProcessInfo');
            }
            var
                info = {
                    'name': 'PROCESS_NONE',
                    'nameId': -1,
                    'percent': 0
                };
            async.series( [ getProcName, getProcPercent ], onAllDone );

            //  1. Get the name from sysnums
            function getProcName( itcb ) {
                function onHaveName( err, nameId, nameStr ) {
                    if ( err ) { return itcb( err ); }
                    info.nameId = nameId;
                    info.name = nameStr;
                    itcb( null );
                }
                getInvoiceProcessName( args.user, onHaveName );
            }

            //  2. Get progress percentage
            function getProcPercent( itcb ) {
                function onHavePercent( err, percent ) {
                    if ( err ) { return itcb( err ); }
                    info.percent = percent;
                    itcb( null );
                }
                getInvoiceProcessPercent( args.user, onHavePercent );
            }

            function onAllDone( err ) {
                args.callback( err, info );
            }
        }

        //  SERVER API METHODS

        /**
         *  Get the name of any currently-running invoice process
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  callback    {Function}  Of the form fn( err, nameId, name )
         */

        function getInvoiceProcessName( user, callback ) {
            function onSemaphoreLookup( err, nameId ) {
                var procName;
                if ( err ) { return callback( err ); }
                for ( procName in processNumbers ) {
                    if ( processNumbers[procName] === nameId ) {
                        return callback( null, nameId, procName );
                    }
                }
                //  should never happen
                callback( Y.doccirrus.errors.rest( 500, `Unknown semaphore value: ${ nameId}`, true ) );
            }
            Y.doccirrus.schemas.sysnum.getSemaphoreValue( user, SYSNUM_PROCESS_NAME, onSemaphoreLookup );
        }

        /**
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  processName {Number}    One of the values of processNumbers above
         *  @param  callback    {Function}  Of the form fn( err )
         */

        function setInvoiceProcessName( user, processName, callback ) {
            Y.doccirrus.schemas.sysnum.setSemaphoreValue( user, SYSNUM_PROCESS_NAME, processName, callback );
        }

        /**
         *  Get the current progress of any currently-running invoice process
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  callback    {Function}  Of the form fn( err, string )
         */

        function getInvoiceProcessPercent( user, callback ) {
            Y.doccirrus.schemas.sysnum.getSemaphoreValue( user, SYSNUM_PROCESS_PERCENT, callback );
        }

        /**
         *  Set the current process progress
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  percent     {Number}    0-100
         *  @param  callback    {Function}  Of the form fn( err )
         */

        function setInvoiceProcessPercent( user, percent, callback ) {
            Y.doccirrus.schemas.sysnum.setSemaphoreValue( user, SYSNUM_PROCESS_PERCENT, percent, callback );
        }


        /**
         *  Load activities, test and perform a batch transition
         *
         *  We don't wait for this process, but call back immediately and then update the client by websocket events
         *
         *  This wraps the doTransitionBatch method on activityapi with methods to update cashbook progress on client
         *
         *  @param  args
         *  @param  args.user                           {Object}    REST user or equivalent
         *  @param  args.callback                       {Function}  Of the form fn(err, newStates)
         *  @param  args.originalParams                 {Object}    From JSONRPC
         *  @param  args.originalParams.activityIds     {String[]}  Array of activity _id strings
         *  @param  args.originalParams.transition      {String}    Name of a transition on the invoice-fsm
         *  @param  args.originalParams.sumPayed        {Number}    sum user was paying
         */

        async function doInvoiceTransitionBatch( args ) {
            Y.log('Entering Y.doccirrus.api.invoiceprocess.doInvoiceTransitionBatch', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoiceprocess.doInvoiceTransitionBatch');
            }
            var
                params = args.originalParams.query,
                activityIds = params.ids || null,
                transition = params.transition || null,
                fsmOptions = {},
                totalTasks = 0,
                pdfsComplete = 0,
                newStates = [];
            let [ err, getLock ] = await formatPromiseResult(
                Y.doccirrus.cacheUtils.dataCache.acquireLock( {
                    key: 'invoicing',
                    data: `${'invoice_book'}|${'change_status'}|${args.user.U}|${(new Date()).getTime()}|0`
                } )
            );
            if (err) {
                Y.log(`invoiceStatusChange: Error acquiring invoice status change: ${err.stack || err}`, 'error', NAME);
            }

            if (!getLock || !getLock.length || 1 !== getLock[0]) {
                return args.callback( Y.doccirrus.invoiceserverutils.getLockNotification( getLock ) );
            }

            async.series(
                [
                    checkParams,
                    checkOtherProcesses,
                    startInvoiceProcess,
                    countBatchTasks,
                    startBatchProcess
                ],
                onAllDone
            );

            //  1.  Sanity check the request
            function checkParams( itcb ) {
                var err = null;
                if ( !activityIds || !transition ) {
                    err = Y.doccirrus.errors.rest( 400, 'Missing required param transition or activityIds', true );
                }

                itcb( err );
            }

            //  2. Check that another process in not currently underway
            function checkOtherProcesses( itcb ) {
                function onCheckOtherProcess( err, nameId, nameStr ) {
                    var msg;

                    if ( !err && nameStr && 'PROCESS_NONE' !== nameStr ) {
                        msg = `Ein weiterer Rechnungsprozess läuft: ${ nameId } / ${ nameStr}`;
                        return itcb( Y.doccirrus.errors.rest( 500, msg ) );
                    }

                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
                getInvoiceProcessName( args.user, onCheckOtherProcess );
            }

            //  3. Start a process, blocking all others
            function startInvoiceProcess( itcb ) {
                Y.log( 'Starting batchtransition process, setting semaphore PROCESS_BATCHTRANSITION.', 'debug', NAME );
                setInvoiceProcessName( args.user, processNumbers.PROCESS_BATCHTRANSITION, itcb );
            }

            //  4. Count outstanding tasks and call back to the client
            function countBatchTasks( itcb ) {
                totalTasks = activityIds.length * 3; //  load, test, transition
                if ( 'approve' === transition ) {
                    //  ten stops per PDF
                    totalTasks = totalTasks + ( activityIds.length * 10 );
                }

                //  return to the client
                Y.log( `Returning to client and starting batch transition, totalTasks: ${ totalTasks } new states: ${ JSON.stringify( newStates )}`, 'debug', NAME);
                args.callback( null, { 'label': 'Starting batch transition', 'percent': 0, 'totalTasks': totalTasks } ); // eslint-disable-line callback-return
                itcb( null );
            }

            //  5. Pass to activity API to do the transition and generate any PDFs
            function startBatchProcess( itcb ) {

                //  Raised by doTransitionBatch
                function onProgress( detail ) {
                    if ( 'approve' === transition ) {
                        //  on approve transitions we devote half of the process to waiting on PDF generation
                        detail.percent = detail.percent / 2;
                    }

                    emitProcessUpdate( args.user, detail.percent, detail.mapId, detail.label );
                }

                //  Callback from doTransitionBatch
                function onBatchTransitionComplete( err, haveNewStates ) {
                    if ( err ) { return itcb( err ); }
                    newStates = haveNewStates;

                    if ( 'approve' !== transition ) {
                        //  No PDFs to wait for
                        return itcb( null );
                    }
                    emitProcessUpdate( args.user, 50, '', '<!- reload ->' );
                    Y.log( `Waiting on PDFs after batch transition: ${ activityIds.length}`, 'debug', NAME );
                }

                //  Raised by PDF queue, whenever it gets around to (re)creating PDFs for approved activities
                function onPdfReGenerated( mediaId, documentId, activityId ) {
                    pdfsComplete = pdfsComplete + 1;

                    Y.log( `PDF regenerated, new document _id: ${ documentId } mediaId: ${ mediaId}`, 'debug', NAME );

                    var percent = ( 100 * (pdfsComplete / activityIds.length) );

                    emitProcessUpdate( args.user, (50 + (percent / 2) ), activityId, `Erzeugen der Rechnung (${ pdfsComplete }/${ activityIds.length })` );

                    if ( pdfsComplete === activityIds.length ) {
                        //  all done with the batch transition
                        Y.log( 'All PDFS regenerated, finished with batch approval.', 'info', NAME );
                        itcb( null ); //  eslint-disable-line callback-return
                    }
                }

                //  Raised at intervals by hpdf.server.js as PDF is generated
                function onPdfProgressApprove( evt ) {
                    //  MOJ-6996 send ws event to single user who requested this batch
                    evt.targetId = args.user.identityId;
                    Y.dcforms.raisePdfProgressEvent( evt );
                }

                if ( 'approve' === transition ) {
                    fsmOptions.onPdfGenerated = onPdfReGenerated;
                    fsmOptions.onPdfProgress = onPdfProgressApprove;
                }

                Y.doccirrus.activityapi.doTransitionBatch(
                    args.user,
                    fsmOptions, //  track pdf progress on approve
                    activityIds,
                    transition,
                    onProgress, //  called after single activity transition step
                    onBatchTransitionComplete //  called after PDF generation
                );
            }

            //  Finally
            async function onAllDone( err ) {
                function onSemaphoreReset( err ) {
                    if ( err ) {
                        Y.log( `Error resetting semaphore: ${ JSON.stringify( err )}`, 'warn', NAME );
                        //  continue despite error, client needs to know this is over
                    }

                    //  special marker to tell the client that process is complete
                    emitProcessUpdate( args.user, 100, '', '<!- reload ->' );
                    emitProcessUpdate( args.user, 100, '', '<!- complete ->' );
                }

                if ( err ) {
                    Y.log( `Error during batch transition: ${ JSON.stringify( err )}`, 'warn', NAME );
                    //  continue despite error, semaphore must be reset
                }
                Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );

                let [error, invoices] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'get',
                        model: 'activity',
                        query: {
                            actType: 'INVOICE',
                            _id: { $in: activityIds }
                        },
                        options: {
                            lean: true
                        }
                    } )
                );

                if( error ) {
                    Y.log( `getOverdueInvoices: Problem getting invoices: ${err.stack || err}`, 'warn', NAME );
                }

                let invoicesMediaIds = invoices.map( ( invoice ) => {
                    return invoice.formPdf;
                });

                Y.doccirrus.communication.emitEventForUser( {
                    targetId: args.user.identityId,
                    event: 'invoiceTransitionPrint',
                    msg: {
                        data: invoicesMediaIds
                    }
                } );

                //  called regardless of success
                Y.log( 'Ending batchtransition process, setting semaphore PROCESS_NONE.', 'debug', NAME );
                setInvoiceProcessName( args.user, processNumbers.PROCESS_NONE, onSemaphoreReset );
            }

        }

        /**
         *  This is a wrapper around activity API validateInvoices method which manages process semaphores and
         *  updates cashbook UI
         *
         *  @param args
         */

        function validateInvoices( args ) {
            Y.log('Entering Y.doccirrus.api.invoiceprocess.validateInvoices', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoiceprocess.validateInvoices');
            }
            var
                params = args.originalParams,
                activityIds = params.invoiceIds || null,
                //validationResult = null,
                totalTasks = 0,
                completeTasks = 0;

            async.series(
                [
                    checkParams,
                    checkOtherProcesses,
                    startInvoiceProcess,
                    countValidationTasks,
                    startValidationProcess
                ],
                onAllDone
            );

            //  1.  Sanity check the request
            function checkParams( itcb ) {
                var err = null;
                if ( !activityIds ) {
                    err = Y.doccirrus.errors.rest( 400, 'Missing required param transition or activityIds', true );
                }

                itcb( err );
            }

            //  2. Check that another process in not currently underway
            function checkOtherProcesses( itcb ) {
                function onCheckOtherProcess( err, nameId, nameStr ) {
                    var msg;

                    if ( !err && nameStr && 'PROCESS_NONE' !== nameStr ) {
                        msg = `Ein weiterer Rechnungsprozess läuft: ${ nameId } / ${ nameStr}`;
                        return itcb( Y.doccirrus.errors.rest( 500, msg ) );
                    }

                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
                getInvoiceProcessName( args.user, onCheckOtherProcess );
            }

            //  3. Start a process, blocking all others
            function startInvoiceProcess( itcb ) {
                Y.log( 'Starting batchtransition process, setting semaphore PROCESS_BATCHTRANSITION.', 'debug', NAME );
                setInvoiceProcessName( args.user, processNumbers.PROCESS_VALIDATE, itcb );
            }

            //  4. Count outstanding tasks and call back to the client
            function countValidationTasks( itcb ) {
                totalTasks = activityIds.length; //  load, test, transition

                //  return to the client
                Y.log( `Returning to client and starting validation transition, totalTasks: ${ totalTasks}`, 'debug', NAME);
                args.callback( null, { 'label': 'Starting validation', 'percent': 0, 'totalTasks': totalTasks } ); //  eslint-disable-line callback-return
                itcb( null );
            }

            //  5. Pass to activity API to do the transition and generate any PDFs
            function startValidationProcess( itcb ) {

                //  Callback from doTransitionBatch
                function onAllValidationsComplete( err /*, result */ ) {
                    if ( err ) {
                        Y.log( `Could not validate invoices: ${ JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }
                    //validationResult = result;

                    emitProcessUpdate( args.user, 100, '', '<!- reload ->' );
                    return itcb( null );
                }

                function onSingleValidation( activityId, activityContent ) {
                    var percent;
                    completeTasks = completeTasks + 1;
                    percent = parseInt( 100 * ( completeTasks / totalTasks), 10 );
                    emitProcessUpdate( args.user, percent, activityId, `${activityContent } (${ completeTasks })` );
                }

                Y.doccirrus.api.activity.validateInvoices( {
                    'user': args.user,
                    'originalParams': args.originalParams,
                    'onSingleValidation': onSingleValidation,
                    'callback': onAllValidationsComplete
                } );
            }

            //  Finally
            function onAllDone( err ) {
                function onSemaphoreReset( err ) {
                    if ( err ) {
                        Y.log( `Error resetting semaphore: ${ JSON.stringify( err )}`, 'warn', NAME );
                        //  continue despite error, client needs to know this is over
                    }

                    //  special marker to tell the client that process is complete
                    emitProcessUpdate( args.user, 100, '', '<!- complete ->' );
                }

                if ( err ) {
                    Y.log( `Error during validation process: ${ JSON.stringify( err )}`, 'warn', NAME );
                    //  continue despite error, semaphore must be reset
                }

                //  called regardless of success
                Y.log( 'Ending validation process, setting semaphore PROCESS_NONE.', 'debug', NAME );
                setInvoiceProcessName( args.user, processNumbers.PROCESS_NONE, onSemaphoreReset );
            }
        }

        /**
         *  This is a wrapper around activity API invoiceBatchCreation method which manages process semaphores and
         *  updates cashbook UI
         *
         *  @param  args                                    {Object}    REST /1/ API
         *  @param  args.user                               {Object}    REST user or equialent
         *  @param  args.originalParams                     {Object}
         *
         *  @param  args.originalParams.caseFolderTypes     {Object}    Array of strings: 'BG', 'SELFPAYER', 'PRIVATE'
         *  @param  args.originalParams.useStartDate        {Boolean}   True if we have a start date (MOJ-6637)
         *  @param  args.originalParams.useEndDate          {Boolean}   True if we have an end date (MOJ-6637)
         *  @param  args.originalParams.startDate           {String}    Treatments and diagnoses must be $gte (MOJ-6637)
         *  @param  args.originalParams.endDate             {String}    Treatments and diagnoses must be $lte (MOJ-6637)
         *  @param  args.originalParams.minTotal            {String}    Treatments and diagnoses must be $lte (MOJ-6637)
         *
         *  @param  args.callback                           {Function}  Calls back immediately if not blocked by other process
         */

        function invoiceBatchCreation( args ) {
            //var generationResult = null;

            async.series(
                [
                    checkOtherProcesses,
                    startInvoiceProcess,
                    startGenerationProcess
                ],
                onAllDone
            );

            //  1. Check that another process in not currently underway
            async function checkOtherProcesses( itcb ) {
                let [ err, getLock ] = await formatPromiseResult(
                    Y.doccirrus.cacheUtils.dataCache.acquireLock( {
                        key: 'invoicing',
                        data: `cashlog|invoiceGeneration|${args.user.U}|${(new Date()).getTime()}|0`
                    } )
                );
                if( err ) {
                    Y.log( `validatePvsLog: Error acquiring invoice log: ${err.stack || err}`, 'error', NAME );
                }
                if( !getLock || !getLock.length || 1 !== getLock[0] ) {
                    return args.callback( Y.doccirrus.invoiceserverutils.getLockNotification( getLock ) );
                }

                itcb( null );
            }

            //  2. Start a process, blocking all others
            function startInvoiceProcess( itcb ) {
                //return earlier progress will be shown using events
                args.callback( null ); //  eslint-disable-line callback-return

                Y.doccirrus.communication.emitEventForUser({
                    targetId: args.user.identityId,
                    event: 'invoicelogAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                    msg: {
                        data: {
                            invoiceType: 'CASH',
                            action: 'invoicing',
                            state: 'started'
                        }
                    }
                });

                itcb( null );
            }

            //  3. Pass to activity API to iterate over patients casefiles and collect unbilled items into invoices
            function startGenerationProcess( itcb ) {

                function onGenerationComplete( err ) {
                    if ( err ) { return itcb( err ); }
                    return itcb( null );
                }

                function onProgressUpdate( id, progress ) {
                    progress.type = 'invoicing';

                    Y.doccirrus.communication.emitEventForUser({
                        targetId: args.user.identityId,
                        event: 'invoicelogAction',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                        msg: {
                            data: {
                                invoiceType: 'CASH',
                                action: 'invoicing',
                                state: 'progress',
                                id,
                                progress
                            }
                        }
                    });
                }

                Y.doccirrus.api.cashlog.invoiceBatchCreation( {
                    'user': args.user,
                    'forPDF': false,
                    'originalParams': args.originalParams,
                    'onProgress': onProgressUpdate,
                    'callback': onGenerationComplete
                } );
            }

            //  Finally
            function onAllDone( err ) {
                Y.doccirrus.communication.emitEventForUser({
                    targetId: args.user.identityId,
                    event: 'invoicelogAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                    msg: {
                        data: {
                            invoiceType: 'CASH',
                            action: 'invoicing',
                            state: 'finished'
                        }
                    }
                });

                if ( err ) {
                    Y.log( `Error during validation process: ${ JSON.stringify( err )}`, 'warn', NAME );
                    //  continue despite error, semaphore must be reset
                }

                Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
            }
        }


        /**
         *  This action will:
         *
         *      (*) Perform a batch creation of invoices,
         *      (*) Generate PDFs of all new invoices
         *      (*) Make the compiled PDF available for download
         *
         *  @param args
         */

        function invoiceBatchCreationPDF( args ) {
            var
                formId,
                formVersionId,
                invoiceIds = [],
                mediaIds = [],
                pdfId;

            async.series(
                [
                    checkOtherProcesses,
                    startInvoiceProcess,
                    startGenerationProcess,
                    generateAllPDFs,
                    compileAllPDFs,
                    storePdfLink
                ],
                onAllDone
            );

            //  1. Check that another process in not currently underway
            async function checkOtherProcesses( itcb ) {
                let [ err, getLock ] = await formatPromiseResult(
                    Y.doccirrus.cacheUtils.dataCache.acquireLock( {
                        key: 'invoicing',
                        data: `cashlog|invoiceAndPDFGeneration|${args.user.U}|${(new Date()).getTime()}|0`
                    } )
                );
                if( err ) {
                    Y.log( `validatePvsLog: Error acquiring invoice log: ${err.stack || err}`, 'error', NAME );
                }
                if( !getLock || !getLock.length || 1 !== getLock[0] ) {
                    return args.callback( Y.doccirrus.invoiceserverutils.getLockNotification( getLock ) );
                }

                itcb( null );
            }

            //  2. Start a process, blocking all others
            function startInvoiceProcess( itcb ) {
                //return earlier progress will be shown using events
                args.callback( null ); //  eslint-disable-line callback-return

                Y.doccirrus.communication.emitEventForUser({
                    targetId: args.user.identityId,
                    event: 'invoicelogAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                    msg: {
                        data: {
                            invoiceType: 'CASH',
                            action: 'invoicing',
                            state: 'started'
                        }
                    }
                });

                itcb( null );
            }

            //  3. Pass to activity API to iterate over patients casefiles and collect unbilled items into invoices
            function startGenerationProcess( itcb ) {

                //  Callback from doTransitionBatch
                function onGenerationComplete( err ) {
                    if ( err ) { return itcb( err ); }
                    return itcb( null );
                }

                Y.doccirrus.api.cashlog.invoiceBatchCreation( {
                    'user': args.user,
                    'forPDF': true,
                    'originalParams': args.originalParams,
                    'onFormResolved': onFormResolved,
                    'onProgress': onPatientProgressUpdate,
                    'onInvoiceCreated': onInvoiceCreated,
                    'callback': onGenerationComplete
                } );
            }

            //  4. Generate PDFs of all new invoices
            function generateAllPDFs( itcb ) {
                Y.log( `Making PDFs from ${ invoiceIds.length } generated invoices`, 'debug', NAME );

                if ( 0 === invoiceIds.length ) {
                    //TODO: event to inform user
                    return itcb( null );
                }

                Y.doccirrus.communication.emitEventForUser({
                    targetId: args.user.identityId,
                    event: 'invoicelogAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                    msg: {
                        data: {
                            invoiceType: 'CASH',
                            action: 'invoicing',
                            state: 'progress',
                            id: args.originalParams.cashLogId,
                            progress: {
                                type: 'pdf',
                                total: invoiceIds.length,
                                current: 0,
                                percent: 0
                            }
                        }
                    }
                });

                async.eachSeries( invoiceIds, makeSinglePDF, itcb );
            }

            //  4.5 Make the PDF of a single generated invoice
            function makeSinglePDF( invoiceId, itcb ) {

                Y.doccirrus.forms.mappinghelper.initializeFormForActivity( args.user, invoiceId, {}, null, onFormMapped );

                function onFormMapped( err ) {
                    if ( err ) {
                        Y.log( `Could not map invoice on server: ${err.stack||err}`, 'error', NAME );
                        return itcb( err );
                    }

                    Y.doccirrus.forms.renderOnServer.toPDF( {
                        user: args.user,
                        formId: formId,
                        formVersionId: formVersionId,
                        mapperName: '', //  set from form, may be InCase_T or Invoice_T (legacy)
                        mapCollection: 'activity',
                        mapObject: invoiceId,
                        saveTo: 'db',
                        zipId: '',
                        preferName: '',
                        onProgress: onPdfProgress,
                        callback: onPdfComplete
                    } );
                }

                function onPdfComplete( err, mediaId, documentId ) {
                    if ( err ) {
                        Y.log( `Error generating PDF for generated invoice ${ invoiceId }: ${ JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( null );
                    }

                    Y.log( `Completed PDF, new media id: ${ mediaId } documentId: ${ documentId}`, 'debug', NAME );
                    mediaIds.push( mediaId );

                    Y.doccirrus.communication.emitEventForUser({
                        targetId: args.user.identityId,
                        event: 'invoicelogAction',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                        msg: {
                            data: {
                                invoiceType: 'CASH',
                                action: 'invoicing',
                                state: 'progress',
                                id: args.originalParams.cashLogId,
                                progress: {
                                    type: 'pdf',
                                    total: invoiceIds.length,
                                    current: mediaIds.length,
                                    percent: parseInt(  100 * ( mediaIds.length / invoiceIds.length ), 10 )
                                }
                            }
                        }
                    });

                    itcb( null );
                }

                Y.log( `Making PDF from single generated invoice: ${ invoiceId}`, 'debug', NAME );
            }

            //  5. Compile all PDFs into a single document
            function compileAllPDFs( itcb ) {
                if ( 0 === mediaIds.length ) { return itcb( null ); }

                function onMediaStored( err, fileId ) {
                    if ( err ) { return itcb( err ); }

                    pdfId = fileId;
                    Y.log( `Concatenated PDFs stored into gridfs: ${ fileId }`, 'debug', NAME );

                    var
                        realmHost = args.httpRequest.headers.host,
                        pdfGridURL = '//' + realmHost + '/media/grid_' + fileId;
                    //pdfCacheUrl = `//${ realmHost }/download/${ mediaRes._id }`;

                    Y.log( `Saved compiled PDF to media: ${ pdfGridURL }`, 'debug', NAME );

                    emitPDFSystemMessage( args.user, pdfGridURL );

                    itcb( null );
                }

                function onConcatenated( err, diskFile ) {
                    if ( err ) { return itcb( err ); }

                    Y.log( `Generated PDFs concatenated to single file: ${ diskFile }`, 'debug', NAME );
                    Y.doccirrus.media.gridfs.importFile( args.user, diskFile, Y.doccirrus.media.getCacheDir() + diskFile, false, onMediaStored );
                }

                //  TODO: add event to report progress of compilation
                Y.doccirrus.media.pdf.concatenatePDFs( { user: args.user, mediaIds }, onConcatenated);
            }

            //  6. store compiled pdf link back to log
            function storePdfLink( itcb ) {
                if ( 0 === mediaIds.length ) { return itcb( null ); }

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    action: 'update',
                    model: 'cashlog',
                    query: {'_id': args.originalParams.cashLogId},
                    data: {$set: { padnextFileId: pdfId }}
                }, itcb );
            }
            //  Finally
            function onAllDone( err ) {

                Y.doccirrus.communication.emitEventForUser({
                    targetId: args.user.identityId,
                    event: 'invoicelogAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                    msg: {
                        data: {
                            invoiceType: 'CASH',
                            action: 'invoicing',
                            state: 'finished'
                        }
                    }
                });

                if ( err ) {
                    Y.log( `Error during validation process: ${ JSON.stringify( err )}`, 'warn', NAME );
                    //  continue despite error, semaphore must be reset
                }

                Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
            }

            //  Events from activity api

            function onFormResolved( foundFormId, foundFormVersionId ) {
                formId = foundFormId;
                formVersionId = foundFormVersionId;
                Y.log( `Setting form for PDF generation process: ${ formId }-v-${ formVersionId}`, 'debug', NAME );
            }

            function onPatientProgressUpdate( id, progress ) {
                progress.type = 'invoicing';

                Y.doccirrus.communication.emitEventForUser({
                    targetId: args.user.identityId,
                    event: 'invoicelogAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                    msg: {
                        data: {
                            invoiceType: 'CASH',
                            action: 'invoicing',
                            state: 'progress',
                            id,
                            progress
                        }
                    }
                });
            }

            function onInvoiceCreated( activityId ) {
                Y.log( `New invoice generated: ${ activityId}`, 'debug', NAME );
                invoiceIds.push( activityId );
            }

            function onPdfProgress( evt ) {
                //  MOJ-6996 send ws event to single user who requested this batch
                evt.targetId = args.user.identityId;
                Y.dcforms.raisePdfProgressEvent( evt );
            }

        }

        /**
         *  (Re)generate a set of invoice PDFs and add them all to a ZIP archive
         *
         *  @param  args                            {Object}
         *  @param  args.user                       {Object}
         *  @param  args.originalParams             {Object}
         *  @param  args.originalParams.invoiceIds  {Object}    Array of INVOICE activity _ids
         *  @param  args.callback                   {Function}  Of the form (err, zipId)
         */

        function invoiceBatchZip( args ) {
            Y.log('Entering Y.doccirrus.api.invoiceprocess.invoiceBatchZip', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoiceprocess.invoiceBatchZip');
            }
            var
                params = args.originalParams,
                invoiceIds = params.invoiceIds,
                mediaSet = [],
                percent = 0,
                progress = 0,
                zipId = '';

            async.series(
                [
                    checkOtherProcesses,
                    startInvoiceProcess,
                    makeAllPDFs,
                    lookupPatientNames,
                    zipAllMedia
                ],
                onAllDone
            );

            //  1. Check that another process in not currently underway
            function checkOtherProcesses( itcb ) {
                function onCheckOtherProcess( err, nameId, nameStr ) {
                    var msg;

                    if ( !err && nameStr && 'PROCESS_NONE' !== nameStr ) {
                        //  TODO: i18n
                        msg = `Ein weiterer Rechnungsprozess läuft: ${ nameId } / ${ nameStr}`;
                        return itcb( Y.doccirrus.errors.rest( 500, msg ) );
                    }

                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
                getInvoiceProcessName( args.user, onCheckOtherProcess );
            }

            //  2. Start a process, blocking all others
            function startInvoiceProcess( itcb ) {
                Y.log( 'Starting invoice generation process, setting semaphore PROCESS_BATCHTRANSITION.', 'debug', NAME );
                setInvoiceProcessName( args.user, processNumbers.PROCESS_GENCOMPILE, itcb );

                //  return to the client
                Y.log( 'Returning to client', 'debug', NAME);
                args.callback( null, { 'label': 'Starting invoice generation', 'percent': 0 } ); //  eslint-disable-line callback-return

                emitProcessUpdate( args.user, 0, '', '<!- start ->' );
            }

            //  3. (re)generate all PDFs for unapproved invoices
            function makeAllPDFs( itcb ) {
                async.eachSeries( invoiceIds, makeSinglePdf, itcb );
            }

            //  3.5 (re)generate a single PDF
            function makeSinglePdf( activityId, itcb ) {
                Y.log( `Regenerating PDF for single activity: ${ activityId}`, 'debug', NAME );

                var invoice, label;

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'activity',
                    'query': { '_id': activityId },
                    'callback': onActivityLoaded
                } );

                progress = progress + 1;
                percent = ( progress / invoiceIds.length );

                //  translateme
                label = `Adding PDF ${ progress }/${ invoiceIds.length}`;
                emitProcessUpdate( args.user, percent, activityId, label );

                function onActivityLoaded( err, result ) {
                    if ( err || 0 === result.length ) {
                        Y.log( `Could not find invoice to add to ZIP: ${ activityId}`, 'warn', NAME );
                        //  continue despite missing invoice (best effort)
                        return itcb( null );
                    }

                    invoice = result[0];

                    //  if invoice is approved and we have a PDF then no need to regenerate it
                    if ( 'CREATED' !== invoice.status && 'VALID' !== invoice.status ) {
                        if ( invoice.formPdf && '' !== invoice.formPdf ) {
                            mediaSet.push( {
                                'mediaId': invoice.formPdf,
                                'invoiceId': `${invoice._id }`,
                                'patientId': `${invoice.patientId }`,
                                'invoiceDate': invoice.timestamp
                            } );
                            return itcb( null );
                        }
                    }

                    var
                        passArgs = {
                            'user': args.user,
                            'originalParams': {
                                'mapObject': `${invoice._id }`,
                                'mapCollection': 'activity',
                                'formId': invoice.formId,
                                'formVersionId': invoice.formVersionId
                            },
                            'callback': onPdfGenerated
                        };

                    Y.doccirrus.api.formtemplate.makepdf( passArgs );
                }

                function onPdfGenerated( err, result ) {
                    if ( err ) {
                        Y.log( `Could not regenerate PDF for activity ${ activityId }: ${ JSON.stringify( err )}`, 'warn', NAME );
                        //  continue despite error (best effort)
                        //  TODO: emit a warning to the client
                        return itcb( null );
                    }
                    mediaSet.push( {
                        'mediaId': invoice.formPdf,
                        'invoiceId': `${result.mediaId }`,
                        'patientId': `${invoice.patientId }`,
                        'invoiceDate': invoice.timestamp
                    } );

                    itcb( null );
                }

            }

            //  4. Get patient names from database
            function lookupPatientNames( itcb ) {
                async.eachSeries( mediaSet, lookupSinglePatientName, itcb );
            }

            //  4.5 Get patient name for a single invoice
            function lookupSinglePatientName( item, itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'patient',
                    'query': { '_id': item.patientId },
                    'callback': onPatientLoaded
                } );

                function onPatientLoaded( err, result ) {
                    if ( err || 0 === result.length ) {
                        // this should never happen, but continue despite error, best effort
                        item.patientName = 'Unknown Patient';
                        return itcb( null );
                    }

                    var patient = result[0];
                    item.patientName = `${patient.firstname } ${ patient.lastname}`;
                    itcb( null );
                }
            }

            //  5. Add all media to a zip file
            function zipAllMedia( itcb ) {
                var preferName = `${ 
                    moment().format('YYYYMMDD') }_${ moment().format('HHmmss') }_` +
                    `Rechnungen_x${ mediaSet.length}`;

                Y.doccirrus.media.zip.create( preferName, onZipCreated );
                function onZipCreated( err, newZipId ) {
                    if ( err ) {
                        Y.log( `Could not create ZIP archive: ${ JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }

                    zipId = newZipId;
                    async.eachSeries( mediaSet, zipSingleFile, itcb );
                }
            }

            //  5.5 Extract a single PDF from GridFS and add it to the zip with a friendly name
            function zipSingleFile( item, itcb ) {
                var fileName = `${ 
                        moment( item.invoiceDate ).format( 'YYYYMMDD' ) }_${ 
                        moment( item.invoiceDate ).format( 'HHmmss' ) }_${ 
                        item.patientName.replace( new RegExp( ' ', 'g' ), '_' ) }.pdf`;

                //  TODO: check legal filename (prevent command injection via patient name)
                Y.log( `Writing invoice PDF to ZIP directory as: ${ fileName}`, 'debug', NAME );
                fileName = `${Y.doccirrus.media.getTempDir() + zipId }/${ fileName}`;
                Y.doccirrus.media.gridfs.exportFile( args.user, item.mediaId, fileName, false, onPdfWritten );

                function onPdfWritten( err ) {
                    if ( err ) {
                        Y.log( `Error extracting PDF from GridFS for ZIP: ${ JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }
                    itcb( null );
                }
            }

            //  Finally
            function onAllDone( err ) {

                function onSemaphoreReset( err ) {
                    if ( err ) {
                        Y.log( `Error resetting semaphore: ${ JSON.stringify( err )}`, 'warn', NAME );
                        //  continue despite error, client needs to know this is over
                    }

                    //  special marker to tell the client that process is complete
                    if ( '' !== zipId ) {
                        //  TODO: review this
                        emitProcessUpdate( args.user, 100, 'zipId', zipId );
                    }
                    emitProcessUpdate( args.user, 100, '', '<!- reload ->' );
                    emitProcessUpdate( args.user, 100, '', '<!- complete ->' );
                }

                if ( err ) {
                    Y.log( `Could not generate batch invoice ZIP: ${ JSON.stringify( err )}` );
                    //  continue despite error, semaphore must be reset
                }

                //  called regardless of success
                Y.log( 'Ending validation process, setting semaphore PROCESS_NONE.', 'debug', NAME );
                setInvoiceProcessName( args.user, processNumbers.PROCESS_NONE, onSemaphoreReset );
            }

        }

        /**
         *  Update the major progress bar of cashbook
         *
         *  @param  user    {Object}    REST user or equivalent
         *  @param  percent {Number}    Overall completion
         *  @param  mapId   {String}    Invoice activity _id
         *  @param  label   {String}    Text of progressbar
         */

        function emitProcessUpdate( user, percent, mapId, label ) {
            Y.doccirrus.communication.emitNamespaceEvent( {
                nsp: 'default',
                tenantId: user && user.tenantId,
                event: 'cashbookProgress',
                msg: {
                    data: {
                        'percent': percent,
                        'mapId': mapId,
                        'label': label
                    }
                }
            } );

            setInvoiceProcessPercent( user, ( percent || 0 ), onUpdatePercent );

            function onUpdatePercent( err ) {
                if ( err ) {
                    Y.log( `Could not set invoice process semaphore: ${ JSON.stringify( err )}` );
                    //  donot break on this error
                }
                Y.log( `Report invoice batch progress: ${ percent } / ${ mapId } / ${ label}`, 'debug', NAME );
            }
        }

        /**
         *  Show a system message once a PDF has been compiled
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  pdfURL      {String}    Message content
         */

        function emitPDFSystemMessage( user, pdfURL ) {
              var
                  content = i18n( 'InvoiceMojit.cashbook.label.INVOICE_PDF_COMPILED' ),
                  evt = {
                        targetId: user.identityId,
                        tenantId: user.tenantId,
                        messageId: `socket-invoicepdf-message-${ user.tenantId}`,
                        user: user,
                        event: 'message',
                        msg: { data: content }
                  };

            evt.msg.data = evt.msg.data.replace( '%%pdfUrl%%', pdfURL );
            Y.doccirrus.communication.emitEventForUser( evt );
        }


        /**
         *  Method to query locations which may have unbilled treatments and diagnoses
         *
         *      1. Check given settings
         *      2. Load locations which may have treatments and diagnoses within the date range
         *      3. Check if these locations have an open pvslog
         *      --> 3.1 Check for an existing pvslog which would overlap with args.settings
         *      Finally, call back with locations and statuses
         *
         *  Note, change for MOJ-6447 allows more than one pvslog per location so long as they do not overlap on
         *  insurance type and date range.
         *
         *  Note, change for EXTMOJ-773 enforces user location restrictions - a user can only generate invoices for
         *  locations listed on their profile.
         *
         *  @param  {Object}    args                                            /1/ API
         *  @param  {Object}    args.user                                       REST user or equivalent
         *  @param  {Object}    args.originalParams
         *  @param  {Object}    args.originalParams.settings                    Date range and insurance types, see: filterInvoiceItems modal
         *  @param  {Boolean}   args.originalParams.settings.useStartDate       True if new pvslog would have a start date
         *  @param  {Boolean}   args.originalParams.settings.useEndDate         True if new pvslog would have an end date
         *  @param  {Date}      args.originalParams.settings.startDate          Collect entries starting at this date
         *  @param  {Date}      args.originalParams.settings.endDate            Collect entries up to this date
         *  @param  {Object}    args.originalParams.settings.insuranceTypes     Collect entries from patients with these insurance types
         *  @param  {Function}  args.callback                                   Of the form fn( err, locations )
         */

        function getCandidateLocations( args ) {
            Y.log('Entering Y.doccirrus.api.invoiceprocess.getCandidateLocations', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoiceprocess.getCandidateLocations');
            }
            var
                params = args.originalParams,
                settings = params.settings || {},
                allowedLocationIds = [],
                locations = [],
                candidates = [];

            async.series( [ checkArgs, loadAllPrimaryLocations, checkAllPrimaryLocations ], onAllDone );

            //  1. Check given settings
            function checkArgs( itcb ) {
                if ( !settings.insuranceTypes || 0 === settings.insuranceTypes.length ) {
                    return itcb( Y.doccirrus.errors.rest( 500, 'Request is missing insurance types' ) );
                }
                if ( settings.useStartDate && settings.useEndDate && moment( settings.startDate ).isAfter( settings.endDate ) ) {
                    return itcb( Y.doccirrus.errors.rest( 500, 'Start date must be before end date' ) );
                }

                //  user can only generate invoices for treatments in their location(s) EXTMOJ-773
                var i;
                for ( i = 0; i < args.user.locations.length; i++ ) {
                    if( !Array.isArray( settings.locationIdsFromSelectedEmployees ) || -1 !== settings.locationIdsFromSelectedEmployees.indexOf( args.user.locations[i]._id ) ) {
                        allowedLocationIds.push( args.user.locations[i]._id );
                    }
                }

                itcb( null );
            }

            //  2. Load locations which may have logs
            function loadAllPrimaryLocations( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'location',
                    query: {
                        _id: { $in: allowedLocationIds }
                    },
                    options: {
                        lean: true
                    },
                    callback: onLocationsLoaded
                } );

                function onLocationsLoaded( err, foundLocations ) {
                    if( err ) {
                        Y.log( `Could not load locations: ${ err}`, 'warn', NAME );
                        return itcb( Y.doccirrus.errors.http( 500, `Could not load locations: ${ JSON.stringify( err )}`, true ) );
                    }

                    if( !foundLocations || 0 === foundLocations.length ) {
                        Y.log( 'no locations for current tenant', 'warn', NAME );
                        return itcb( Y.doccirrus.errors.rest( '1003', {
                            $entity: {
                                '-de': 'Betriebsstätten',
                                '-en': 'locations'
                            }
                        } ) );
                    }

                    locations = foundLocations;

                    itcb( null );
                }
            }

            //  3. Check if these locations have an open pvslog
            function checkAllPrimaryLocations( itcb ) {
                async.eachSeries( locations, checkSingleLocation, itcb );
            }

            //  3.1 Check for an existing pvslog which would overlap with args.settings
            function checkSingleLocation( location, itcb ) {

                var
                    //  location metadata - candidate locations with hasPvsLog cannot take a new one with args.settings
                    //  NOTE: that for MOJ-9186 we no longer check for a commercialNo on locations, since additional
                    //  locations may not have them, but still have billable treatments.
                    candidate = {
                        'locationId': `${location._id }`,
                        'locationName': location.locname,
                        'commercialNo': location.commercialNo,
                        'hasPvsLog': false,
                        'pvsLogId': '',
                        'pvsLogState': '',
                        'noActivities': false
                    },
                    query = {
                        locationId: location._id,
                        status: { $in: [ 'VALID', 'APPROVED' ] },
                        $or: [
                            {
                                actType: 'TREATMENT',
                                areTreatmentDiagnosesBillable: '1',
                                invoiceLogId: {$exists: false},

                                invoiceId: {$exists: false}
                            },
                            {
                                actType: 'DIAGNOSIS'
                            }
                        ]
                    };

                if( settings.useStartDate ) {
                    query.timestamp = { $gte: settings.startDate };
                }

                if( settings.useStartDate && settings.useEndDate ) {
                    query.timestamp.$lt = settings.endDate;
                }

                //  count billable activities at this location in this date range
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'activity',
                    query: query,
                    options: { lean: true },
                    callback: onCheckActivities
                } );

                function onCheckActivities( err, result ) {
                    if ( err ) { return itcb( err ); }

                    if ( result && result.length > 0 ) {
                        candidate.activityCount = result.length;
                        candidate.noActivities = false;
                    } else {
                        candidate.activityCount = 0;
                        candidate.noActivities = true;
                    }

                    candidates.push( candidate );
                    itcb( null );
                }
            }

            //  Finally, call back with locations and status
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Could not get candidate locations: ${ JSON.stringify( err )}`, 'warn', NAME );
                    return args.callback( err );
                }

                args.callback( null, candidates );
            }
        }

        /**
         *  Dev / support method to clear progress when locked up
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user       REST user or equivalent
         *  @param  {Function}  args.callback   Of the form fn( err, { status: msg } )
         */

        function resetInvoiceProcess( args ) {
            Y.log('Entering Y.doccirrus.api.invoiceprocess.resetInvoiceProcess', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoiceprocess.resetInvoiceProcess');
            }
            async.series( [ clearProcessName, clearProcessProgress, clearInvoiceLock ], onAllDone );

            function clearProcessName( itcb ) {
                Y.doccirrus.api.invoiceprocess.setInvoiceProcessName( args.user, processNumbers.PROCESS_NONE, itcb );
            }

            function clearProcessProgress( itcb ) {
                Y.doccirrus.api.invoiceprocess.setInvoiceProcessPercent( args.user, -1, itcb );
            }

            async function clearInvoiceLock( itcb ) {
                let [ err, res ] = await formatPromiseResult(
                    Y.doccirrus.cacheUtils.dataCache.releaseLock( { key: 'invoicing' } )
                );
                if( err ){
                    Y.log( `resetInvoiceProcess: Error releasing invoice lock ${err.stack || err}`, 'error', NAME );
                }
                if( res === 1 ){
                    Y.log(`invoice lock released successfully`, 'debug', NAME);
                }
                itcb( err );
            }

            function onAllDone( err ) {
                if ( err ) { return args.callback( err ); }
                args.callback( null, { 'status': 'Invoice process unlocked and reset' } );
            }
        }

        function checkInvoiceReferences( user, invoiceId, activities, currentInvoiceLogId ) {

            let invoiceLogIdClause = {
                $and: [
                    { invoiceLogId: {$exists: true} },
                    { invoiceLogId: {$ne: ''} }
                ]
            };
            if(currentInvoiceLogId){
                invoiceLogIdClause.$and.push( {invoiceLogId: {$ne: currentInvoiceLogId.toString() } });
            }

            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'count',
                query: {
                    $or: [
                        {
                            $and: [
                                { invoiceId: { $exists: true } },
                                { invoiceId: { $ne: invoiceId } },
                                { invoiceId: { $ne: '' } }
                            ]
                        },
                        invoiceLogIdClause
                    ],
                    _id: {$in: activities},
                    actType: {$nin: ['SCHEIN', 'PKVSCHEIN', 'BGSCHEIN']}
                }
            } ).then( count => {
                // TODO: get invalid ids and remove from invoice.activities or just count invalid and discard save if c < 0
                if( count ) {
                    Y.log( `checkInvoiceReferences: found ${count} activities of invoice ID=${invoiceId} referenced to another invoice or invoicelog.`, 'debug', NAME );
                    throw new Y.doccirrus.commonerrors.DCError( 18027 );
                }
            } );

        }

        /**
         * @class invoiceprocess-api
         * @constructor
         */
        Y.namespace( 'doccirrus.api' ).invoiceprocess = {
            /**
             * @property name
             * @type {String}
             * @default invoiceprocess-api
             * @protected
             */

            'name': NAME,

            //  REST METHODS

            'getProcessInfo': getProcessInfo,
            'doInvoiceTransitionBatch': doInvoiceTransitionBatch,
            'validateInvoices': validateInvoices,
            'invoiceBatchCreation': invoiceBatchCreation,
            'invoiceBatchCreationPDF': invoiceBatchCreationPDF,
            'invoiceBatchZip': invoiceBatchZip,
            'getCandidateLocations': getCandidateLocations,
            'resetInvoiceProcess': resetInvoiceProcess,

            //  SERVER API METHODS

            'getInvoiceProcessName': getInvoiceProcessName,
            'setInvoiceProcessName': setInvoiceProcessName,
            'getInvoiceProcessPercent': getInvoiceProcessPercent,
            'setInvoiceProcessPercent': setInvoiceProcessPercent,
            'emitProcessUpdate': emitProcessUpdate,
            //markActivitiesWithInvoiceId,                  //  functionality moved to linkedactivities-api
            checkInvoiceReferences
        };

    },
    '0.0.1', {requires: ['activity-schema', 'dcmedia-store']}
);
