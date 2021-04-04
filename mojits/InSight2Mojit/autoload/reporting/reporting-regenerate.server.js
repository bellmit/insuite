/**
 *  Routines to efficiently generate syncreportigns in bulk, tidied from reporting-api.server.js
 *
 *  @user   strix
 *  @date   04.10.2018
 */
/*global YUI */


YUI.add( 'reporting-regenerate', function( Y, NAME ) {

    /**
     * @module reporting-api
     *
     * Important: The reporting API does not use a schema and is allowed to use low-level mongoose operations, because of this.
     *
     * !!Do not follow these Database access examples in other Mojits!!
     *
     */

    const
        moment = require( 'moment' ),
        cluster = require( 'cluster' ),

        mongoose = require( 'mongoose' ),
        objectId = mongoose.Types.ObjectId,

        { formatPromiseResult, promisifyArgsCallback } = require( 'dc-core' ).utils;

    let
        //  prevent multiple regeneration operations from running concurrently
        regenerationInProgress = false;

    // ----------------
    // REPORTS GENERATION
    // ----------------

    /**
     *  Clear the reporting collection and regenerate entries, managed by flag
     *
     *  TODO: clearer name for this
     *
     *  @param  {Object}    args
     *  @param  {Object}    args.user
     *  @param  {Object}    args.query
     *  @param  {Object}    args.callback
     */

    function generateReport( args ) {

        Y.log('Entering Y.doccirrus.api.task.generateReport', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.task.createTasksForActivities');
        }

        const
            async = require( 'async' );

        let
            user = args.user,
            query = args.query || {},
            data = args.data;

        if ( args.originalParams && args.originalParams.data ) {
            data = args.originalParams.data;
        }

        Y.log( `Regenerating reportings, params: ${JSON.stringify( data )}`, 'info', NAME );

        async.series( [ regenerateAllForDateRange, unsetRFlag, unsetCRFlag, sendWsToClient ], onAllDone );

        //  (1) (re)generate all reportings of all types according to date range given in query
        function regenerateAllForDateRange( itcb ) {
            regenerateReporting( {
                data,
                user,
                query,
                callback: itcb
            } );
        }

        //  (2) unset the reporting regeneration flag (checked on startup in case this was interrupted)
        function unsetRFlag( itcb ) {
            unsetRegenerationFlag( user, function( err ) {
                if( err ) {
                    Y.log( 'Reporting - failed to unset regeneration flag. This may result in repeated regeneration!', 'error', NAME );
                }
                itcb( err );
            } );
        }

        //  (3) unset cancel regeneration flag
        function unsetCRFlag( itcb ) {
            unsetCancelRegenerationFlag( user, function( err ) {
                if( err ) {
                    Y.log( 'Reporting - failed to unset cancel regeneration flag. Generation might now be work ', 'error', NAME );
                }
                itcb( err );
            } );
        }

        //  (4) let the client know that generation of syncreportings is complete
        function sendWsToClient( itcb ) {
            Y.doccirrus.communication.emitEventForSession( {
                sessionId: user.sessionId,
                event: 'regenerateReportDone',
                msg: {data: {}}
            } );
            itcb( null );
        }

        function onAllDone( err ) {
            if( err ) {
                Y.log( `generateReport. Finished with error: ${JSON.stringify( err )}`, 'error', NAME );
                return;
            }

            Y.log( 'generateReport. Successfully finished.', 'debug', NAME );
        }

        // repsponse for REST  - req call back immediately
        args.callback( null, {
            status: 'ok',
            message: 'Accepted.'
        } );
    }

    // ----------------
    // GET DATA BY CONFIG ID
    // ----------------

    /**
     *  There should always be exactly one settings object.  Properties of interest to regenerating reportings entries:
     *
     *      insightRegenerationFlag         true||false
     *      insightCancelRegenerationFlag   true||false
     *      settings_extra { start: 'DD.MM.YYYY', end: 'DD.MM.YYYY' }
     *
     *  @param user
     *  @return {Promise<*>}
     */

    async function getSettings( user ) {
        let
            err, result,
            settingsRequest = {
                migrate: true,
                user: user,
                model: 'settings',
                query: {},
                options: {
                    quiet: true
                }
            };

        [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( settingsRequest ) );

        if ( err ) {
            //  should never happen
            Y.log( `Problem checking settings collection: ${err.stack||err}`, 'error', NAME );
            throw err;
        }

        if ( !result || !result[0] ) { return {}; }
        return result[0];
    }

    //  MANAGE REGENERATION FLAG

    function setCancelRegenerationFlag( args ) {
        Y.doccirrus.mongodb.runDb( {
            migrate: true,
            user: args.user,
            model: 'settings',
            action: 'put',
            query: {},
            options: {
                quiet: true
            },
            fields: ['insightCancelRegenerationFlag'],
            data: {insightCancelRegenerationFlag: true, skipcheck_: true},
            callback: args.callback
        } );
    }

    function getCancelRegenerationFlag( user, callback ) {
        Y.doccirrus.mongodb.runDb( {
            migrate: true,
            user: user,
            model: 'settings',
            query: {},
            callback: function settingCb( err, result ) {
                if( err ) {
                    Y.log( `Error getting settings: ${err.stack||err}`, 'warn', NAME );
                    return callback( err );
                } else if( result && result[0] ) {
                    //Y.log( 'Got Cancel Regeneration Flag: ' + result[0].insightCancelRegenerationFlag, 'info', NAME );
                    return callback( null, Boolean( result[0].insightCancelRegenerationFlag ) );
                } else {
                    //Y.log( 'No Cancel Regeneration Flag. ', 'info', NAME );
                    return callback( null, false );
                }
            }
        } );
    }

    function unsetCancelRegenerationFlag( user, callback ) {
        Y.doccirrus.mongodb.runDb( {
            migrate: true,
            user: user,
            model: 'settings',
            action: 'put',
            query: {},
            options: {
                quiet: true
            },
            fields: ['insightCancelRegenerationFlag'],
            data: {insightCancelRegenerationFlag: false, skipcheck_: true},
            noAudit: true,
            callback: callback
        } );
    }

    function setRegenerationFlag( user, dateRange, callback ) {
        let
            fields = ['insightRegenerationFlag'],
            data = {insightRegenerationFlag: true, skipcheck_: true};

        if( dateRange ){
            fields.push('settings_extra');
            data.settings_extra = dateRange;
        }

        Y.doccirrus.mongodb.runDb( {
            migrate: true,
            user: user,
            model: 'settings',
            action: 'put',
            query: {},
            options: {
                quiet: true
            },
            fields: fields,
            data: data,
            callback: callback
        } );

    }

    function unsetRegenerationFlag( user, callback ) {
        Y.doccirrus.mongodb.runDb( {
            migrate: true,
            user: user,
            model: 'settings',
            action: 'put',
            query: {},
            fields: ['insightRegenerationFlag'],
            data: {insightRegenerationFlag: false, skipcheck_: true},
            callback: callback
        } );
    }

    async function getRegenerationFlag( user ) {
        let err, settingsObj;

        [ err, settingsObj ] = await formatPromiseResult( getSettings( user ) );

        if ( err ) {
            Y.log( `Could not get settings to check database regeneration: ${err.stack||err}`, 'error', NAME );
            throw err;
        }

        if ( settingsObj.hasOwnProperty( 'insightRegenerationFlag' ) ) {
            Y.log( `Got Regeneration Flag: ${settingsObj.insightRegenerationFlag}`, 'info', NAME );
            return Boolean( settingsObj.insightRegenerationFlag );
        }

        Y.log( 'No Regeneration Flag. ', 'info', NAME );
        return false;
    }

    function getRegenerationDetails( user, callback ) {
        Y.doccirrus.mongodb.runDb( {
            migrate: true,
            user: user,
            model: 'settings',
            query: {},
            options: {
                quiet: true
            },
            callback: function settingCb( err, result ) {
                if( err ) {
                    Y.log( `Error getting settings: ${err}`, 'warn', NAME );
                    return callback( err );
                } else if( result && result[0] && result[0].settings_extra ) {
                    Y.log( `Got Regeneration Details: ${JSON.stringify(result[0].settings_extra)}`, 'info', NAME );
                    return callback( null, result[0].settings_extra );
                } else {
                    Y.log( 'No Regeneration Details. ', 'info', NAME );
                    return callback( null );
                }
            }
        } );
    }


    /**
     *  Check database for requested regeneration of all reportings, as happens after migration
     *
     *  @param  {Object}    user        Superuser for tenant, corresponds to su from syncreporting queue
     *  @param  {Function}  callback    Of the form fn( err )
     *  @return {Promise<*>}
     */

    async function checkRegeneration( user, callback ) {

        //  skip this if not the reporting worker
        //  (just a failsafe, this should only be invoked from the syncreporting queue)
        if( ! (cluster.isWorker && cluster.worker.process.env.REPORTING_WORKER) ) {
            return callback();
        }

        //  (1) Load settings object for this tenant

        let err, settingsObj;

        [ err, settingsObj ] = await formatPromiseResult( getSettings( user ) );

        if ( err ) {
            //  could not get settings from database
            Y.log( `Problem loading settings for reporting regeneration: ${err.stack||err}`, 'error', NAME );
            return callback( err );
        }

        //  (2) Check for regeneration flag in settings

        if ( !settingsObj.insightRegenerationFlag ) {
            //  if the flag has not been set, then there is no batch regeneration of reporting to do
            Y.log( 'No deferred reporting regeneration is noted in database.', 'info', NAME );
            return callback( null );
        }

        //  (3) If regeneration flag is present, check for additional settings for the regeneration and make a query

        let
            settings_extra = settingsObj.settings_extra || {},

            startDay, endDay,
            query = {},
            requestData = {
                fullGeneration: true
            },
            regenerationRequest = {
                'user': user,
                'query': query,
                'data': requestData
            };

        /*
        query = {
            "$or":[
                {"timestamp":{}},
                {"start":{}},
                {"alertTime":{}}
            ]
        };
        */

        if(settings_extra.start){
            startDay = moment( settings_extra.start, 'DD.MM.YYYY' ).startOf( 'day' ).toISOString();
            //query.$or[0].timestamp.$gte = query.$or[1].start.$gte = query.$or[2].alertTime.$gte = startDay; //  deprecated
            requestData.startDate = startDay;
        }

        if(settings_extra.end){
            endDay = moment( settings_extra.end, 'DD.MM.YYYY' ).endOf( 'day' ).toISOString();
            //query.$or[0].timestamp.$lte = query.$or[1].start.$lte = query.$or[2].alertTime.$lte = endDay;   //  deprecated
            requestData.endDate = endDay;
        }

        if( !startDay && !endDay){
            regenerationRequest.query = {};
        }

        //  (4) Start the regeneration
        generateReport( {
            'user': user,
            'query': query,
            'data': requestData,
            'callback': onRegenerationComplete
        } );

        function onRegenerationComplete() {
            if( err ) {
                Y.log( `Check Reporting regeneration failed: reportings cannot be regenerated automatically. ${err.stack||err}`, 'warn', NAME );
            }
            Y.log( `DELAYED REPORTING GENERATION COMPLETED ${user.tenantId}`, 'info', NAME );
            callback();
        }
    }

    /**
     * Cleans reporting and syncreporting collections
     * @method clearReportingCollections
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} [args.query]
     * @param {Object} [args.data]
     * @param {Boolean} [args.data.keepSyncReporting=false] if true, will not clean syncreporting collection
     * @param {Function} args.callback
     */

    function clearReportingCollections( args ) {
        let
            {user, data = {}, query = {}, callback} = args,
            async = require( 'async' );

        async function clearCollection( collectionName, callback ) {
            if( 'reporting' === collectionName ) {
                let
                    [err, result] = await formatPromiseResult(
                        new Promise( ( resolve, reject ) => {
                            Y.doccirrus.api.reporting.reportingDBaction( {
                                mongoose: true,
                                user,
                                action: 'remove',
                                query,
                                callback: ( err, result ) => {
                                    if( err ) {
                                        reject( err );
                                    }
                                    resolve( result );
                                }
                            } );
                        } )
                    );
                return callback( err, result );
            } else {
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, collectionName, true, next );
                    },
                    function( model, next ) {
                        model.mongoose.remove( query, next );
                    }
                ], callback );
            }

        }

        async.parallel( [
            function( done ) {
                if( data.keepSyncReporting ) {
                    Y.log( 'clearReportingCollections. Syncreporting collection will not be cleaned', 'debug', NAME );
                    return setImmediate( done );
                }
                Y.log( 'clearReportingCollections. Cleaning syncreporting collection', 'debug', NAME );
                clearCollection( 'syncreporting', done );
            },
            function( done ) {
                Y.log( 'clearReportingCollections. Cleaning reporting collection', 'debug', NAME );
                clearCollection( 'reporting', done );
            }
        ], callback );
    }

    /**
     * Generates task reportings from tasks:
     * 1. Check smallest _id
     * 2. if exists uses as query for _id: query._id = { $lte: _id }
     * @method generateTaskReportings
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} [args.data]
     * @param {Object} [args.data.fullGeneration] if set - does not check for smallest _id
     * @param {Object} [args.query]
     * @param {Function} args.callback
     * @for Y.doccirrus.api.reporting
     * @see generateReportings
     */

    async function generateTaskReportings( args ) {

        const
            query = args.query || {},
            //  just the _ids of matching tasks
            fields = { _id: 1 };

        let
            deleteQuery = { ...args.query, entityName: { $in: [ 'TASK' ] } },
            err, result;

        //  1.  Clear existing reportings first (otherwise deleted entries will persist)

        //  in reportings collection, timestamp is renamed timestampDate
        if ( deleteQuery.alertTime ) {
            deleteQuery.timestampDate = deleteQuery.alertTime;
            delete deleteQuery.alertTime;
        }

        Y.log( `generateTaskReportings: Deleting existing activity reporting before regeneration: ${JSON.stringify(deleteQuery)}`, 'info', NAME );

        [err, result] = await formatPromiseResult(
            new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.reporting.reportingDBaction( {
                    mongoose: true,
                    user: args.user,
                    action: 'deleteMany',
                    query: deleteQuery,
                    callback: ( err, result ) => {
                        if( err ) {
                            reject( err );
                        }
                        resolve( result );
                    }
                } );
            } )
        );

        if ( err ) {
            Y.log( `generateTaskReportings: Could not clear reporting before regeneration: ${err.stack||err}`, 'error', NAME );
            return args.callback( err );
        }
        
        Y.log( `generateTaskReportings: cleared ${result.n} entries to be regenerated.`, 'info', NAME );

        //  2.  Stream from the activities collection to generate entries in the syncreporting queue

        streamToReportings( args.user, 'task', 'TASK', query, fields, null, args.callback );
    }



    /**
     * Generates schedule reportings from schedules.
     *  1. Check smallest _id
     *  2. if exists uses as query for _id: query._id = { $lte: _id }
     * @method generateScheduleReportings
     * @param {Object} args
     * @param {Object} args.user
     * @param {Boolean} [args.migrate]
     * @param {Object} [args.data]
     * @param {Object} [args.data.fullGeneration] if set - does not check for smallest _id
     * @param {Object} [args.query]
     * @param {Function} args.callback
     * @for Y.doccirrus.api.reporting
     * @see generateReportings
     */

    async function generateScheduleReportings( args ) {
        const
            query = args.query || {},
            //  just the _ids of matching tasks
            fields = { _id: 1 },
            migrate = args.migrate || false;

        let
            deleteQuery = { ...args.query, entityName: { $in: [ 'SCHEDULE' ] } },
            err, result;

        //  1.  Clear existing reportings first (otherwise deleted entries will persist)

        //  in reportings collection, timestamp is renamed timestampDate
        if ( deleteQuery.start ) {
            deleteQuery.timestampDate = deleteQuery.start;
            delete deleteQuery.start;
        }

        Y.log( `generateScheduleReportings: Deleting existing activity reporting before regeneration: ${JSON.stringify(deleteQuery)}`, 'info', NAME );

        [err, result] = await formatPromiseResult(
            new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.reporting.reportingDBaction( {
                    mongoose: true,
                    user: args.user,
                    action: 'deleteMany',
                    query: deleteQuery,
                    migrate: migrate,
                    callback: ( err, result ) => {
                        if( err ) {
                            reject( err );
                        }
                        resolve( result );
                    }
                } );
            } )
        );

        if ( err ) {
            Y.log( `generateScheduleReportings: Could not clear reporting before regeneration: ${err.stack||err}`, 'error', NAME );
            return args.callback( err );
        }

        Y.log( `generateScheduleReportings: cleared ${result.n} entries to be regenerated.`, 'info', NAME );

        //  2.  Stream from the activities collection to generate entries in the syncreporting queue

        streamToReportings( args.user, 'schedule', 'SCHEDULE', query, fields, null, args.callback );
    }

    /**
     *  Generates activity and document (if not skipDocuments) reportings from activities.
     *
     *      1. Check smallest _id
     *      2. if exists uses as query for _id: query._id = { $lte: _id }
     *
     *  Activities from quotation folder will be excluded at a ler stage, in syncReportingQueue
     *
     *  @method generateActivityReportings
     *  @for    Y.doccirrus.api.reporting
     *  @see    generateReportings
     *
     *  @param  {Object}    args
     *  @param  {Object}    args.user
     *  @param  {Object}    [args.query]
     *  @param  {Object}    [args.data]
     *
     *  @param  {Boolean}   [args.data.skipDocuments]   if not set, document reportings will be generated for activities with attachments.
     *  @param  {Object}    [args.data.fullGeneration]  if set - does not check for smallest _id
     *
     *  @param  {Function}  args.callback               of the form fn( err )
     */


    async function generateActivityReportings( args ) {
        Y.log('Entering Y.doccirrus.api.task.generateActivityReportings', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Entering Y.doccirrus.api.task.generateActivityReportings');
        }

        const
            isISD = Y.doccirrus.auth.isISD(),
            modelName = isISD ? 'mirroractivity' : 'activity';

        let
            //  params
            query = args.query || {},
            deleteQuery = { ...args.query, entityName: { $in: [ 'ACTIVITY', 'DOCUMENT', 'LABDATA' ] } },
            data = args.data || {},
            //  group by patient
            sort = { patientId: 1 },
            fields = { _id: 1, patientId: 1, caseFolderId: 1 },

            err, result;

        //  UI option to regenerate labdata only
        if ( data.noActivities && !data.noLabdata ) {
            Y.log( 'Clearing LABDATA reportings for the requested period.', 'info', NAME );
            deleteQuery.entityName = 'LABDATA';
        }

        //  1.  Clear existing reportings first (otherwise deleted entries will persist)

        //  in reportings collection, timestamp is renamed timestampDate
        if ( deleteQuery.timestamp ) {
            deleteQuery.timestampDate = deleteQuery.timestamp;
            delete deleteQuery.timestamp;
        }

        Y.log( `generateActivityReportings: Deleting existing activity reporting before regeneration: ${JSON.stringify(deleteQuery)}`, 'info', NAME );

        [err, result] = await formatPromiseResult(
            new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.reporting.reportingDBaction( {
                    mongoose: true,
                    user: args.user,
                    action: 'deleteMany',
                    query: deleteQuery,
                    callback: ( err, result ) => {
                        if( err ) {
                            reject( err );
                        }
                        resolve( result );
                    }
                } );
            } )
        );

        if ( err ) {
            Y.log( `generateActivityReportings: Could not clear reporting before regeneration: ${err.stack||err}`, 'error', NAME );
            return args.callback( err );
        }

        Y.log( `generateActivityReportings: cleared ${result.n} entries to be regenerated.`, 'info', NAME );

        //  2.  Stream from the activities collection to generate entries in the syncreporting queue

        streamToReportings( args.user, modelName, 'ACTIVITY', query, fields, sort, args.callback );
    }

    /**
     *  Start a stream to create a batch of syncreportings from some other collection
     *
     *  @param  {Object}    user
     *  @param  {String}    modelName   Should be one of 'activity'|'schedule'|'task'
     *  @param  {String}    entityName  Should be one of 'ACTIVITY'|'SCHEDULE'|'TASK'
     *  @param  {Object}    query       Optional, limit to a subset of the collection
     *  @param  {Object}    fields      Fields to load, minimally _id
     *  @param  {Object}    sort        Sort the stream, eg to group by patient or casefolder
     *  @param  {Function}  callback    Of the form fn( err )
     *  @return {Promise<*>}
     */

    async function streamToReportings( user, modelName, entityName, query, fields, sort, callback ) {
        const
            BATCH_SIZE = 1000;
        
        let
            sourceModel,                //  activity, schedule, task, etc
            syncReportingModel,

            stream,

            startTime = ( new Date() ).getTime(),
            endTime,
            total = 0,
            batch = [],
            documentCount,
            err;

        //  (1) get a mongoose model to write batches of syncreportings with
        [ err, syncReportingModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, 'syncreporting' ) );

        if ( err ) {
            Y.log( `Could not create syncreporting model: ${err.stack||err}`, 'error', NAME );
            return callback( err );
        }

        //  (2) get a mongoose model to stream with
        [ err, sourceModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, modelName ) );

        if ( err ) {
            Y.log( `Could not create ${modelName} model to stream into ${entityName} syncreportings: ${err.stack||err}`, 'error', NAME );
            return callback( err );
        }

        //  (3) count matching items, to avoid creating empty streams
        [ err, documentCount ] = await formatPromiseResult( sourceModel.mongoose.countDocuments( query ).exec() );

        if ( 0 === documentCount ) {
            Y.log( `Query does not match any documents, skipping.`, 'debug', NAME );
            endTime = ( new Date() ).getTime();
            return callback( null,  { 'completed': total, 'time': ( endTime - startTime ) } );
        }

        //  (4) start a stream from the database for the requested types / time range

        if ( sort ) {
            stream = sourceModel.mongoose.find( query, fields ).sort( sort ).cursor();
        } else {
            stream = sourceModel.mongoose.find( query, fields ).cursor();
        }

        stream.on( 'data', onStreamData );
        stream.on( 'error', onStreamError );
        stream.on( 'close', onStreamClose );

        //  stream _ids and save in batches
        function onStreamData( data ) {
            batch.push( {
                '_id': objectId(),
                'entityName': entityName,
                'entryId': data._id.toString(),
                //  backdate the syncreporting entries so that reporting cache will be used:
                'timestamp': moment().subtract( 1, 'hour' ).toISOString()
            } );

            if ( batch.length >= BATCH_SIZE ) {
                //  we have a full batch to write, do it
                stream.pause();
                saveBatch( onBufferSaved );
            }

            function onBufferSaved( err ) {
                if ( err ) { return callback( err ); }
                stream.resume();
            }
        }

        function onStreamError( err ) {
            Y.log( `Problem streaming from ${modelName} to ${entityName} syncreportings: ${err.stack||err}`, 'error', NAME );
            callback( err );
        }

        function onStreamClose() {
            //  save any leftovers in the buffer
            saveBatch( onComplete );
        }

        function onComplete( err ) {
            if ( err ) { return callback( err ); }
            endTime = ( new Date() ).getTime();
            Y.log( `Completed regeneration of ${modelName} syncreporting for the specified period: ${total}`, 'debug', NAME );
            callback( null, { 'completed': total, 'time': ( endTime - startTime ) } );
        }

        function saveBatch( callback ) {
            let copyBuffer = batch;
            batch = [];
            if ( 0 === copyBuffer.length ) { return callback( null, [] ); }
            syncReportingModel.mongoose.collection.insertMany( copyBuffer, callback );
        }
    }

    /**
     * Generates document reportings from activities.
     *  1. Check smallest _id
     *  2. if exists uses as query for _id: query._id = { $lte: _id }
     * @method generateDocumentReportings
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} [args.data]
     * @param {Object} [args.data.fullGeneration] if set - does not check for smallest _id
     * @param {Object} [args.query] merged with {
                attachments: {
                    $exists: true,
                    $not: { $size: 0 }
                }
            }
     * @param {Function} args.callback
     * @for Y.doccirrus.api.reporting
     * @see generateReportings
     */
    function generateDocumentReportings( args ) {
        let
            {user, data: {fullGeneration} = {}, query = {}, callback} = args,
            _query = {
                attachments: {
                    $exists: true,
                    $not: {$size: 0}
                }
            },
            async = require( 'async' );
        async.waterfall( [
            function( next ) {
                if( fullGeneration ) {
                    return setImmediate( next, null, null );
                }
                /**
                 * documents are generated from activity
                 */
                Y.doccirrus.api.reporting.reportingDBaction( {
                    user,
                    action: 'get',
                    query: {
                        documentId: {$exists: true}
                    },
                    options: {
                        sort: {
                            documentId: 1
                        },
                        select: {
                            activityId: 1
                        },
                        limit: 1,
                        lean: true
                    },
                    callback: ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        next( null, results[0] && results[0].activityId || null );
                    }
                } );
            },
            function( activityId, next ) {
                if( !query._id && activityId ) {
                    query._id = {$lte: activityId};
                }
                generateReportings( {
                    user,
                    query: Object.assign( _query, query ),
                    data: {
                        syncManager: 'syncDocumentReportingManager',
                        modelName: 'activity'
                    },
                    callback: next
                } );
            }
        ], callback );
    }

    /**
     * Helper
     * Creates a stream for model and calls "hookUpdate" method of syncManager for every received document from the stream.
     * @method generateReportings
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.query
     * @param {Object} args.data
     * @param {Object|String} args.data.syncManager if string, will be taken from Y.doccirrus.insight2[ syncManager ], otherwise should be one of syncManagers
     * @param {String} args.data.modelName model which will be used for reportings generation
     * @param {Object} [args.options]
     * @param {Object} [args.options.select] used in "find". Merged with { _id: 1 }
     * @param {Object} [args.postFunction] if it is provided, will be called after syncManager executes "hookUpdate", but before resuming a stream.
     *  post function is called with following params: (document:{Object}, callback{Function})
     * @param {Function} args.callback
     *
     * @return {Function}   callback
     */
    function generateReportings( args ) {
        let
            {user, query = {}, data: {syncManager, modelName} = {}, postFunction, options: {select = {}} = {}, callback} = args,
            _select = {
                _id: 1
            },
            async = require( 'async' );
        if( 'string' === typeof syncManager ) {
            syncManager = Y.doccirrus.insight2[syncManager];
        }
        if( !syncManager ) {
            return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: `syncManager not found. syncManager: ${syncManager}`} ) );
        }
        if( !modelName ) {
            return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: `model name is missing. modelName: ${modelName}`} ) );
        }

        getCancelRegenerationFlag( user, ( err, cancel ) => {

            if( cancel ) {
                return callback( err, cancel );
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, modelName, true, next );
                },
                function( model, next ) {
                    Y.log( `Regenerate Reportings (${modelName}) using query: ${JSON.stringify( query )}`, 'info', NAME );
                    let
                        error,
                        // see: https://github.com/Automattic/mongoose/issues/3354
                        stream = model.mongoose.find( query, Object.assign( _select, select ), {
                            timeout: true,
                            sort: {_id: -1}
                        } ).cursor();

                    const cancelTimerId = setInterval( () => getCancelRegenerationFlag( user, (( err, response ) => {
                        if(err){
                            Y.log(`Error getting cancel regeneration flag ${err.message}`, 'error', NAME );
                        }
                        if( true === response ) {
                            stream.destroy();
                        }
                    }  ), 1000 ) );

                    function createReporting( document ) {

                        stream.pause();
                        syncManager.hookUpdate( user, document._id, true, true )
                            .then( () => {
                                if( 'function' === typeof postFunction ) {
                                    return new Promise( function( resolve, reject ) {
                                        postFunction( document, function( err ) {
                                            if( err ) {
                                                return reject( err );
                                            }
                                            resolve();
                                        } );
                                    } );
                                }
                            } )
                            .then( function() {
                                stream.resume();
                            } )
                            .catch( function( err ) {
                                Y.log( `Resuming despite error, synreporting will revisit the failed entry: ${JSON.stringify( err )}`, 'warn', NAME );
                                stream.resume();
                            } );
                    }

                    function onError( err ) {
                        error = err;
                    }

                    function finalCb() {
                        clearInterval( cancelTimerId );
                        next( error );
                    }

                    stream.on( 'data', createReporting ).on( 'error', onError ).on( 'close', finalCb );
                }
            ], callback );

        } );
    }

    /**
     *  Creates batches syncreportings to regenerate reportings, typically for a given date range:
     *
     *      (*) ACTIVITY
     *      (*) DOCUMENT
     *      (*) LABDATA
     *      (*) TASK
     *      (*) SCHEDULE
     *
     *  TODO: move to async/await
     *  TODO: check where called from, add option to call back immediately
     *
     * @method regenerateReporting
     * @param   {Object}    args
     * @param   {Object}    args.user
     * @param   {Object}    args.data
     * @param   {Object}    [args.query]    Used in cleaning process, and in documents(activity,task,schedule) selection.
     * @param   {Function}  args.callback
     */

    function regenerateReporting( args ) {
        Y.log('Entering Y.doccirrus.api.task.regenerateReporting', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.task.createTasksForActivities');
        }

        let
            {user, data} = args,
            async = require( 'async' );

        if ( regenerationInProgress ) {
            Y.log( 'Reporting regeneration already in progress, not starting in parallell.', 'warn', NAME );
            return args.callback( new Error( 'Reporting regeneration already in progress' ) );
        }

        regenerationInProgress = true;

        async.series(
            [
                runForActivities,   //  includes documents and labdata
                runForTasks,
                runForSchedules
            ],
            onAllDone
        );

        function runForActivities( itcb ) {
            let activityQuery = {};

            if ( data.noActivities && data.noLabdata ) {
                //  option to skip activities and labdata
                Y.log( `Skipping regeneration of activity reporting due to UI option.`, 'info', NAME );
                return itcb( null );
            }

            if ( args.data && args.data.startDate && args.data.endDate ) {
                activityQuery.timestamp = {
                    '$gte': new Date( args.data.startDate ),
                    '$lte': new Date( args.data.endDate )
                };
            }

            if ( data.noActivities && !data.noLabdata ) {
                //  regenerate labdata only
                Y.log( `Restricting regeneration of activity reporting to LABDATA only due to UI option.`, 'info', NAME );
                activityQuery.actType = 'LABDATA';
            }

            generateActivityReportings( {
                'user': user,
                'query': activityQuery,
                'data': data,
                'callback': itcb
            } );
        }

        function runForTasks( itcb ) {
            let tasksQuery = {};

            if ( data.noTasks ) {
                //  UI option to disable regeneration of task reportings
                Y.log( `Skipping regeneration of tasks reporting due to UI option.`, 'info', NAME );
                return itcb( null );
            }

            if ( args.data && args.data.startDate && args.data.endDate ) {
                tasksQuery.alertTime = {
                    '$gte': new Date( args.data.startDate ),
                    '$lte': new Date( args.data.endDate )
                };
            }

            generateTaskReportings( {
                'user': user,
                'query': tasksQuery,
                'data': data,
                'callback': itcb
            } );
        }

        function runForSchedules( itcb ) {
            let scheduleQuery = {};

            if ( data.noSchedules ) {
                //  UI option to disable regeneration of schedule reportings
                Y.log( `Skipping regeneration of schedule reporting due to UI option.`, 'info', NAME );
                return itcb( null );
            }

            if ( args.data && args.data.startDate && args.data.endDate ) {
                scheduleQuery.start = {
                    '$gte': new Date( args.data.startDate ),
                    '$lte': new Date( args.data.endDate )
                };
            }

            generateScheduleReportings( {
                'user': user,
                'query': scheduleQuery,
                'data': data,
                'callback': itcb
            } );
        }

        function onAllDone( err ) {
            regenerationInProgress = false;
            if ( err ) { return args.callback( err ); }
            args.callback( null );
        }
    }

    /**
     *  Recreate report entries for all LABDATA findings
     *
     *  This is a dev/support route in for MOJ-7137
     *
     *  @param  args            {Object}    REST v1
     *  @param  args.user       {Object}    REST user or equivalent
     *  @param  args.callback   {Function}  Of the form fn( err )
     */

    function regenerateLabdataReportings( args ) {
        var
            async = require( 'async' );

        Y.log( 'Regenerating reporting for all LABDATA findings.', 'debug', NAME );

        async.series( [clearExistingLABDATA, invokeSyncReporting], onAllDone );

        function clearExistingLABDATA( itcb ) {

            function onRemovedReportings( err, data ) {
                if( err ) {
                    return itcb( err );
                }

                if( data.result && data.result.n ) {
                    Y.log( `Cleared ${data.result.n} LABDATA reportings for regeneration.`, 'info', NAME );
                }

                itcb( null );
            }

            Y.doccirrus.api.reporting.reportingDBaction( {
                mongoose: true,
                user: args.user,
                action: 'remove',
                query: {'actType': 'LABDATA'},
                callback: onRemovedReportings
            } );
        }

        function invokeSyncReporting( itcb ) {

            /*
             *  @method generateActivityReportings
             *  @param {Object} args
             *  @param {Object} args.user
             *  @param {Object} [args.query]
             *  @param {Object} [args.data]
             *  @param {Boolean} [args.data.skipDocuments] if not set, document reportings will be generated for activities with attachments.
             *  @param {Function} args.callback
             *  @for Y.doccirrus.api.reporting
             */

            Y.doccirrus.api.reporting.generateActivityReportings( {
                'user': args.user,
                'query': {'actType': 'LABDATA'},
                'data': {'skipDocuments': true},
                'callback': onSyncReportingInvoked
            } );

            function onSyncReportingInvoked( err ) {
                if( err ) {
                    return itcb( err );
                }
                itcb( null );
            }
        }

        function onAllDone( err ) {
            if( err ) {
                Y.log( `Problem recreating reporting entries for LABDATA activities: ${JSON.stringify( err )}`, 'warn', NAME );
                return args.callback( err );
            }
            args.callback( null );
        }
    }

    /**
     *  Regenerate reporting entries based on the audit logs
     *
     *  This is to be run nightly to correct any errors/omissions in the reports, MOJ-12129
     *
     *  @param  {Object}    user            Should generally be SU, since this is called by cron
     *  @param  {Date}      startDate       Stream audit log entries from
     *  @param  {Date}      endDate         String auidt log entries until
     */

    async function regenerateFromAuditLog( user, startDate, endDate ) {
        const
            BATCH_SIZE = 500;

        let
            err, result,
            auditLogModel,
            syncReportingModel,
            documentModel,
            cursor,
            auditEntry,
            syncReportingEntry,
            syncReportingBatch = [],

            countAuditLogs = 0,
            countSyncReportings = 0,

            startTime = new Date().getTime(),
            endTime,

            query = {
                model: { $in: [ 'activity', 'schedule', 'task' ] },
                objId: { $exists: true },
                $and: [
                    { timestamp: { $gte: startDate } },
                    { timestamp: { $lte: endDate } }
                ]
            };

        Y.log( `Entering Y.doccirrus.api.reporting.regenerateFromAuditLog (${startDate} to ${endDate})`, 'info', NAME );

        //  1.  Create models to access audit log, sync reportings and document collections

        [ err, auditLogModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, 'audit' ) );

        if ( err ) {
            Y.log( `Could not create audit log model: ${err.stack||err}`, 'error', NAME );
            throw err;
        }

        [ err, syncReportingModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, 'syncreporting' ) );

        if ( err ) {
            Y.log( `Could not create sync reporting model: ${err.stack||err}`, 'error', NAME );
            throw err;
        }

        [ err, documentModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, 'document' ) );

        if ( err ) {
            Y.log( `Could not create document model: ${err.stack||err}`, 'error', NAME );
            throw err;
        }

        //  2.  Stream relevant audit log entries from requested period for activities, schedules and tasks

        cursor = auditLogModel.mongoose.find( query ).lean().cursor();

        while ( auditEntry = await cursor.next() ) {    //  eslint-disable-line no-cond-assign

            countAuditLogs = countAuditLogs + 1;

            syncReportingEntry = {
                entityName: auditEntry.model.toUpperCase(),
                entryId: auditEntry.objId,
                timestamp: moment().toISOString()
            };

            if ( 'delete' !== auditEntry.action ) {

                //  add to batch if not already present
                syncReportingBatch = addSyncReportingToBatch( syncReportingEntry, syncReportingBatch );

            } else {

                //  ensure that the corresponding reporting entries are deleted (may be many for, eg, labdata)
                Y.doccirrus.insight2.utils.removeReporting( user.tenantId, syncReportingEntry.entityName, syncReportingEntry.entryId );

            }

            //  If we have a full batch, save to syncreporting collection
            if ( syncReportingBatch.length >= BATCH_SIZE ) {

                [ err, result ] = await formatPromiseResult(
                    syncReportingModel.mongoose.insertMany( syncReportingBatch )
                );

                if ( err ) {
                    Y.log( `Could not add batch of ${syncReportingBatch.length} syncreporting entries: ${err.stack||err}`, 'error', NAME );
                    throw err;
                }

                countSyncReportings = countSyncReportings + syncReportingBatch.length;

                syncReportingBatch = [];
            }
        }

        //  3.  Stream documents from this period - documents must be loaded from the collection to check activityId
        //      Note that deleting or creating documents will cause a change on the activity which owns them, so
        //      regeneration will already be queued by the previous step, but deletion of documents must be checked

        query.model = 'document';
        query.action = { $ne: 'post' };

        [ err, result ] = await formatPromiseResult( auditLogModel.mongoose.count( query ).exec() );

        cursor = auditLogModel.mongoose.find( query ).lean().cursor();

        while ( auditEntry = await cursor.next() ) {    //  eslint-disable-line no-cond-assign

            countAuditLogs = countAuditLogs + 1;

            if ( 'delete' === auditEntry.action ) {

                //  ensure that the corresponding reporting entry was deleted
                [err, result] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => { //  eslint-disable-line no-loop-func
                        Y.doccirrus.api.reporting.reportingDBaction( {
                            mongoose: true,
                            user,
                            action: 'deleteMany',
                            query: {documentId: objectId( auditEntry.objId )},
                            callback: ( err, result ) => {
                                if( err ) {
                                    reject( err );
                                }
                                resolve( result );
                            }
                        } );
                    } )
                );

                if ( err ) {
                    Y.log( `Could not check reporting deletion for deleted document ${auditEntry.objId}: ${err.stack||err}`, 'error', NAME );
                    throw err;
                }

            } else {

                //  look up the activity which owns this document, if any
                [ err, result ] = await formatPromiseResult(
                    documentModel.mongoose.findOne( { _id: objectId( auditEntry.objId ) }, { activityId: 1 } ).lean().exec()
                );

                if ( err ) {
                    Y.log( `Could not look up owner of document ${auditEntry.objId} from audit log: ${err.stack||err}`, 'error', NAME );
                    throw err;
                }

                if ( result && result && result.activityId ) {
                    //  it is not certain that there will be a result here, activity might have been deleted since this log entry was created

                    syncReportingEntry = {
                        entityName: 'ACTIVITY',
                        entryId: result.activityId,
                        timestamp: moment().toISOString()
                    };

                    syncReportingBatch = addSyncReportingToBatch( syncReportingEntry, syncReportingBatch );
                }

            }

            //  If we have a full batch, save to syncreporting collection
            if ( syncReportingBatch.length >= BATCH_SIZE ) {
                [ err, result ] = await formatPromiseResult(
                    syncReportingModel.mongoose.insertMany( syncReportingBatch )
                );

                if ( err ) {
                    Y.log( `Could not add batch of ${syncReportingBatch.length} syncreporting entries: ${err.stack||err}`, 'error', NAME );
                    throw err;
                }

                countSyncReportings = countSyncReportings + syncReportingBatch.length;
                syncReportingBatch = [];
            }
        }

        //  4.  Save any leftover syncreportings

        if ( syncReportingBatch.length >= 0 ) {
            [ err, result ] = await formatPromiseResult(
                syncReportingModel.mongoose.insertMany( syncReportingBatch )
            );

            if ( err ) {
                Y.log( `Could not add batch of ${syncReportingBatch.length} syncreporting entries: ${err.stack||err}`, 'error', NAME );
                throw err;
            }

            countSyncReportings = countSyncReportings + syncReportingBatch.length;
        }

        Y.log( `Checked ${countAuditLogs} audit logs in specified period and created ${countSyncReportings} sync reportings on tenant ${user.tenantId}`, 'info', NAME );

        endTime = new Date().getTime();
        Y.log( `Exiting Y.doccirrus.api.reporting.regenerateFromAuditLog [${endTime - startTime}ms]`, 'info', NAME );

        return { auditlogs: countAuditLogs, syncreportings: countSyncReportings };
    }

    /*
     *  Subscribe to nightly cron event to regenerate reporting entries from the past day's audit logs
     */

    if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isMVPRC() || Y.doccirrus.auth.isDCPRC()) {

        Y.doccirrus.kronnd.on( 'reportRegenerate', async () => {
            const getActiveTenantsP = promisifyArgsCallback( Y.doccirrus.api.company.getActiveTenants ),
                user = Y.doccirrus.auth.getSUForLocal,
                startDate = moment().subtract( 24, 'hours' ).startOf( 'day' ).toDate(),
                endDate = moment().toDate();

            let companies = [], err;

            //  if not VPRC then we do not need to look up tenants
            if ( Y.doccirrus.auth.isVPRC() ) {
                //  if VPRC we need to check audit logs of all tenant databases
                [err, companies] = await formatPromiseResult( getActiveTenantsP( {
                    'user': user
                } ) );

                if ( !err && !Array.isArray( companies ) ) {
                    err = new Error( `Invalid list of active tenants: ${JSON.stringify( companies )}` );
                }

                if( err ) {
                    Y.log( `reportingRegenerate: Failed to run cron jobs, failed to get tenants: ${err.stack||err}`, 'error', NAME );
                    return;
                }
            }

            //  if on PRC / single tenant system then the tenantId is always '0'
            companies.push( { tenantId: '0' } );

            for( let company of companies ) {
                let [err] = await formatPromiseResult( regenerateFromAuditLog( Y.doccirrus.auth.getSUForTenant( company.tenantId ), startDate, endDate ) );

                if( err ) {
                    Y.log( `regenerateFromAuditLog: Failed to regenerate reports for tenantId: ${company.tenantId}`, 'error', NAME );
                    continue;
                }
            }

        } );
    }

    /**
     *  Small utility for regenerateFromAuditLog above, reduces duplication in syncreporting queue
     */

    function addSyncReportingToBatch( syncReporting, batch ) {
        var
            isNew = true,
            i;

        //  some audit entries do not record an object _id
        if ( !syncReporting.entryId ) { return; }

        for ( i = 0; i < batch.length; i++ ) {
            if ( batch[i].entryId === syncReporting.entryId && batch[i].entityName === syncReporting.entityName ) {
                //  is a duplicate, discard
                isNew = false;
            }
        }

        if ( isNew ) {
            batch.push( syncReporting );
        }

        return batch;
    }

    /**
     *  List all activities for a patient and create syncreporting entries for them
     *
     *  NOTE: emergency patch only - general pattern is that query should be passed to reporting manager
     *
     *  @param  args                            {Object}
     *  @param  args.user                       {Object}
     *  @param  args.originalParams             {Object}
     *  @param  args.originalParams.patientId   {String}
     *  @paran  args.callback                   {Function}  Calls back immediately by default
     */

    function regenerateForPatient( args ) {

        var
            params = args.originalParams,
            patientId = params.patientId || null;

        if( !patientId || '' === patientId ) {
            return args.callback( Y.doccirrus.errors.rest( 404, 'No patientId given' ) );
        }

        Y.doccirrus.insight2.regenerate.generateActivityReportings( {
            'user': args.user,
            'query': { 'patientId': patientId },
            'callback': args.callback
        } );
    }

    /**
     *  Dev/support route to manually run migration to fix missing content on activities and reporting entries
     *  TODO: move to migration helper
     *  @param args
     */

    function regenerateLabdataOneMonth( args ) {
        Y.doccirrus.insight2.migrationhelper.regenerateLabdataOneMonth( args.user, false, onQueuedRegeneration );
        function onQueuedRegeneration( err, report ) {
            if( err ) {
                return args.callback( err );
            }
            args.callback( null, {'data': report} );
        }
    }

    /**
     *  Check if sync reporting regeneration is currently in progress
     *  @return {boolean}
     */

    function isRegenerating() {
        return regenerationInProgress;
    }

    /**
     * @class rlv
     * @namespace doccirrus.api
     */
    Y.namespace( 'doccirrus.insight2' ).regenerate = {
        name: NAME,

        //  Regenerate reportings and clear the flag
        'generateReport': generateReport,                   //  TODO: rename to something clearer
        'deleteAll': clearReportingCollections,

        //  Regenerate reportings from the audit log (consistency check/cleanup at end of day)
        regenerateFromAuditLog,

        //  set up syncreportings for large batch generation
        regenerateReporting,
        generateTaskReportings,
        generateScheduleReportings,
        generateActivityReportings,
        generateDocumentReportings,


        //  manage scheduled generation during migrations with a flag in the admins collection
        setRegenerationFlag,
        unsetRegenerationFlag,
        getCancelRegenerationFlag,
        setCancelRegenerationFlag,
        unsetCancelRegenerationFlag,
        getRegenerationFlag,
        getRegenerationDetails,
        checkRegeneration,
        isRegenerating,

        // migration and maintenance, special case for LABDATA reportings
        regenerateLabdataReportings,
        regenerateForPatient,

        //  manually run migrations for test / dev purposes
        regenerateLabdataOneMonth
    };

}, '0.0.1', {
    requires: [
    ]
} );