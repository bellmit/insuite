/*global YUI */


YUI.add( 'reporting-api', function( Y, NAME ) {

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
        Prom = require( 'bluebird' ),
        fs = require( 'fs' ),
        path = require( 'path' ),
        util = require( 'util' ),
        redis = require( 'redis' ),
        cluster = require( 'cluster' ),
        dcCore = require( 'dc-core' ),
        v8 = require('v8'),
        {formatPromiseResult, handleResult} = dcCore.utils,
        ObjectId = require( 'mongoose' ).Types.ObjectId,

        redisConfig = Y.doccirrus.utils.tryGetConfig( 'insight.json', null ),

        MAX_RETRY_INTERVAL = 3000,                  //  reconnect spaced at most 3s
        MICROSERVICE_TIMEOUT = 60 * 60 * 1000;      //  one hour

    let
        //  redis connection made on startup
        insightRedisSubscriber,
        insightRedisPublisher,
        microserviceChannels = {};

    /**
     *  Used to control redis reconnection in case of broken link
     *
     *  For additional options, see documentation at: https://www.npmjs.com/package/redis
     *
     *  @param  {Object}    options
     *  @param  {Number}    options.attempt             Number of (re)connection attempts so far
     *  @param  {Number}    options.total_retry_time    In milliseconds
     *  @param  {Object}    [options.error]             Error associated with this failure to connect
     *  @return {Number}
     */
    function retryStrategy( options ) {

        Y.log( `Lost connection to redis-server on reporting, attempting reconnect since ${options.total_retry_time}`, 'warn', NAME );

        if ( options.error ) {

            if ( options.error.code === 'ECONNREFUSED' ) {
                Y.log( `IPC connection refused: ${options.error.stack||options.error}`, 'error', NAME );
                Y.log( 'Please check config in insight.json and ensure that the redis service is started.', 'error', NAME );
                Y.log( 'ps -aux | grep redis-server', 'error', NAME );
            } else {
                Y.log( `IPC connection failed: ${options.error.stack||options.error}`, 'error', NAME );
                Y.log( 'Please check config in insight.json.', 'error', NAME );
            }

        }

        // reconnect after
        return Math.min(options.attempt * 100, MAX_RETRY_INTERVAL);
    }

    // ----------------
    // REPORTS GENEARTION
    // ----------------

    /**
     *  Clear the reporting collection and regenerate entries
     *  TODO: rename to something clearer
     *
     *  @param  {Object}    args
     *  @param  {Object}    args.user
     *  @param  {Object}    args.query
     *  @param  {Object}    args.callback
     */

    function generateReport( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.generateReport', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.generateReport');
        }
        Y.doccirrus.insight2.regenerate.generateReport( args );
    }

    function getModel( user, modelName ) {
        return new Promise( function( resolve, reject ) {
            Y.doccirrus.mongodb.getModel( user, modelName.toLowerCase(), true, function( err, model ) {
                if( err ) {
                    Y.log( 'ERR CANT GET MODEL ' + modelName, 'error', NAME );
                    reject();
                } else {
                    resolve( model );
                }
            } );
        } );
    }

    /**
     *  Indirection to pass this request to the reporting worker if not originating there
     *
     *  If not in reporting worker, the result of the aggregation will be written to disk and the filename broadcast
     *  via IPC.  Results of these aggregations can be larger than the IPC limit, and it's better not to broadcast
     *  large objects around for all of the workers to decode.
     *
     *  @param args
     *  @param apiCall
     */

    function relayToReportingWorker( args, apiCall ) {
        const
            user = args.user,
            userGroupsPartner = Y.doccirrus.schemas.employee.userGroups.PARTNER,
            isPartner = user.groups && user.groups.some( item => userGroupsPartner === item.group ),
            isSuperUser = Boolean( user.superuser );

        let relayData = {
            user: args.user,
            originalParams: args.originalParams,
            model: args.model,
            query: args.query || null,
            sort: args.sort || null,
            limit: args.limit || null,
            options: args.options || {},
            apiCall: apiCall,
            isPartner: isPartner,
            isSuperUser: isSuperUser,
            ipcRequestId: Y.doccirrus.ipc.getUniqueId()
        };

        let startTime = new Date().getTime();

        if ( process.env.REPORTING_WORKER ) {
            return Y.doccirrus.insight2.aggregations[ apiCall ]( args );
        } else {
            let responseEvent = `REPLY_REPORTING_AGGREGATION_${relayData.ipcRequestId}`;
            Y.log( `Subscribing to one-time event for response from reportign worker: ${responseEvent}`, 'debug', NAME );

            Y.doccirrus.ipc.oneTimeSubscribe( responseEvent, onIpcReturned );

            Y.doccirrus.ipc.send( 'REQUEST_REPORTING_AGGREGATION', Buffer.from( v8.serialize( relayData ) ).toString( 'base64' ), false, false );
        }

        async function onIpcReturned( reply ) {
            if ( reply.err ) {
                Y.log(`IPC reports aggregation error: ${JSON.stringify( reply.err )}`, 'error', NAME );
                return args.callback( reply.err );
            }

            const
                readFileP = util.promisify( fs.readFile ),
                deleteFileP = util.promisify( fs.unlink );

            let err, result, resultObj, endTime;

            //  management operations passing results directly

            switch ( apiCall ) {
                case 'clearReportings':
                case 'clearSyncreportings':
                case 'getReportingDbStatus':
                case 'startGenerateFromUI':
                    return args.callback( null, reply.result );
            }

            //  aggregations passing results by temp file

            [ err, result ] = await formatPromiseResult( readFileP( reply.tempFile ) );

            if ( err ) {
                Y.log( `Could not read reply from reporting worker: ${err.stack||err}`, 'error', NAME );
                return args.callback( err );
            }

            try {
                resultObj = JSON.parse( result );
            } catch( parseErr ) {
                Y.log( `Could not parse aggregation results: ${parseErr.stack||parseErr}`, 'error', NAME );
                return args.callback( parseErr );
            }

            endTime =  new Date().getTime();
            Y.log( `Have reporting results from IPC, ${result.length} bytes, elapsed time ${endTime - startTime}ms`, 'info', NAME );

            args.callback( null, resultObj );       //  eslint-disable-line callback-return

            //  clean up after callback
            [ err ] = await formatPromiseResult( deleteFileP( reply.tempFile ) );

            if ( err ) {
                Y.log( `Could not delete temporary reporting file: ${err.stack||err}`, 'error', NAME );
            }
        }
    }

    /**
     * control lands here on reporting worker after raising REQUEST_REPORTING_AGGREGATION event above
     *
     * @param   data
     */

    function onRequestAggregationIPC( data ) {
        const
            reportStub = { mime: 'TEXT_PLAIN', transform: 'aggregation' },
            tempFile = Y.doccirrus.media.getTempFileName( reportStub );

        data = v8.deserialize( Buffer.from( data, 'base64' ) );

        if ( !data || !data.ipcRequestId ) {
            //  should never happen
            Y.log( `Missing ipcRequestId, reporting worker cannot respond to caller.`, 'error', NAME );
            return;
        }

        let responseEvent = `REPLY_REPORTING_AGGREGATION_${data.ipcRequestId}`;

        data.user = data.user || Y.doccirrus.auth.getSUForLocal();
        data.callback = onAggregationRun;

        switch( data.apiCall ) {
            case 'clearReportings':
            case 'clearSyncreportings':
            case 'getReportingDbStatus':
            case 'startGenerateFromUI':
                Y.doccirrus.api.reporting[ data.apiCall ]( data );
                return;
        }

        Y.log( `Reporting worker received IPC request for aggregation by: ${data.apiCall}`, 'info', NAME );
        Y.doccirrus.insight2.aggregations[ data.apiCall ]( data );

        function onAggregationRun( err, result ) {
            if ( err ) {
                Y.log( `Could not run aggregation ${data.apiCall}: ${err.stack||err}`, 'error', NAME );
                Y.doccirrus.ipc.send( responseEvent, { err: err, tempFile: tempFile }, false, false );
                return;
            }

            //  management operations which do not need to be stored on disk
            switch( data.apiCall ) {
                case 'clearReportings':
                case 'clearSyncreportings':
                case 'getReportingDbStatus':
                case 'startGenerateFromUI':
                    Y.doccirrus.ipc.send( responseEvent, { err, result }, false, false );
                    return;
            }

            //  aggregation operations which should be stored on disk
            Y.log( `Storing report on disk: ${tempFile}`, 'debug', NAME );
            fs.writeFile( tempFile, JSON.stringify( result ), onAggregationSaved );
        }

        function onAggregationSaved( err ) {
            if ( err ) {
                Y.log( `Could not save aggregation data to disk ${data.apiCall}: ${err.stack||err}`, 'error', NAME );
                Y.doccirrus.ipc.send( responseEvent, { err: err, tempFile: tempFile }, false, false );
                return;
            }

            Y.log( `Reporting written to disk, broadcasting reply: ${data.ipcRequestId} ${tempFile}`, 'debug', NAME );
            Y.doccirrus.ipc.send( responseEvent, { err: err, tempFile: tempFile }, false, false );
        }
    }

    // ----------------
    // GET DATA BY CONFIG ID
    // ----------------

    function getDataByConfigId( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.getDataByConfigId', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.getDataByConfigId');
        }

        relayToReportingWorker( args, 'getDataByConfigId' );
        //Y.doccirrus.insight2.aggregations.getDataByConfigId( args );
    }

    function setCancelRegenerationFlag( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.setCancelRegenerationFlag', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.setCancelRegenerationFlag');
        }
        return Y.doccirrus.insight2.regenerate.setCancelRegenerationFlag( args );
    }

    /**
     *  Get the number of entries in the reporting and syncreporting collections
     *
     *  This is light and can run on the worker which receives the request
     *
     *  May need to be redirected to IPC in future if microservice is used
     *
     *  @param  {Object}    args
     *  @param  {Object}    args.user
     *  @param  {String}    args.user.tenantId
     *  @param  {Function}  args.callback
     */

    async function getReportingDbStatus( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.getReportingDbStatus', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.getReportingDbStatus');
        }

        //  must run on reporting worker to get accurate values from reporting microservice
        if ( !process.env.REPORTING_WORKER ) {
            return relayToReportingWorker( args, 'getReportingDbStatus' );
        }

        let
            err,
            syncreportingModel,
            result,

            stats = {
                reportings: 0,
                syncreportings: 0
            };

        //  1.  Count entries in the reporting collection

        [err, result] = await formatPromiseResult(
            new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.reporting.reportingDBaction( {
                    mongoose: true,
                    user: args.user,
                    action: 'count',
                    query: {},
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
            return handleResult( err, null, args.callback );
        }

        stats.reportings = result;

        //  2.  Count entries in the syncreporting queue

        [ err, syncreportingModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( args.user, 'syncreporting' ) );

        if ( err ) {
            return handleResult( err, null, args.callback );
        }

        [ err, result ] = await formatPromiseResult(
            syncreportingModel.mongoose.count().exec()
        );

        if ( err ) {
            return handleResult( err, null, args.callback );
        }

        stats.syncreportings = result;

        //  3.  Check if system load is high
        stats.isLoadHigh = Y.doccirrus.insight2.utils.isLoadHigh();
        stats.isRegenerating = Y.doccirrus.insight2.regenerate.isRegenerating();

        return handleResult( null, stats, args.callback );
    }

    /**
     *  Delete the entire reportings collection
     *
     *  @param  {Object}    args
     *  @param  {Object}    args.user
     *  @paramn {Function}  args.callback
     */

    async function clearReportings( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.clearReportings', 'info', NAME);

        if ( !process.env.REPORTING_WORKER ) {
            relayToReportingWorker( args, 'clearReportings' );
            return;
        }

        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.clearReportings');
        }

        //  TODO: check user permissions here
        //  TODO: audit log?

        let err, result;

        [err, result] = await formatPromiseResult(
            new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.reporting.reportingDBaction( {
                    mongoose: true,
                    user: args.user,
                    action: 'deleteMany',
                    query: {},
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
            Y.log( `clearReportings: Problem clearing reportings: ${err.stack||err}`, 'error', NAME );
            return handleResult( err, null, args.callback );
        }

        return handleResult( err, result, args.callback );
    }

    /**
     *  Empty the syncreportings queue
     *
     *  @param  {Object}    args
     *  @param  {Object}    args.user
     *  @paramn {Function}  args.callback
     */

    async function clearSyncreportings( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.clearSyncreportings', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.clearSyncreportings');
        }

        if ( !process.env.REPORTING_WORKER ) {
            Y.log( `Passing request to clear reporting queue to reporting worker.`, 'info', NAME );
            return relayToReportingWorker( args, 'clearSyncreportings' );
        }

        //  TODO: check user permissions here
        //  TODO: audit log?

        let err, result, reportingModel;

        [ err, reportingModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( args.user, 'syncreporting' ) );

        if ( err ) {
            Y.log( `clearSyncreportings: Problem creating mongoose model: ${err.stack||err}`, 'error', NAME );
            return handleResult( err, null, args.callback );
        }

        [ err, result ] = await formatPromiseResult(
            reportingModel.mongoose.deleteMany( {} ).exec()
        );

        if ( err ) {
            Y.log( `clearSyncreportings: Problem clearing syncreportings: ${err.stack||err}`, 'error', NAME );
            return handleResult( err, null, args.callback );
        }

        return handleResult( err, result, args.callback );
    }

    /*
    function getCancelRegenerationFlag( user, callback ) {
        return Y.doccirrus.insight2.regenerate.getCancelRegenerationFlag( user, callback );
    }
    */

    /*
    function unsetCancelRegenerationFlag( user, callback ) {
        return Y.doccirrus.insight2.regenerate.unsetCancelRegenerationFlag( user, callback );
    }
    */

    function setRegenerationFlag( user, dateRange, callback ) {
        return Y.doccirrus.insight2.regenerate.setRegenerationFlag( user, dateRange, callback );
    }

    function unsetRegenerationFlag( user, callback ) {
        return Y.doccirrus.insight2.regenerate.unsetRegenerationFlag( user, callback );
    }

    async function getRegenerationFlagUI( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.getRegenerationFlagUI', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.getRegenerationFlagUI');
        }
        let [ err, regenerationFlag ] = await formatPromiseResult(
            Y.doccirrus.insight2.regenerate.getRegenerationFlag( args.user )
        );

        if ( err ) { return args.callback( err ); }

        args.callback( null, { regenerationFlag: regenerationFlag } );
        return regenerationFlag;
    }

    function startGenerateFromUI( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.startGenerateFromUI', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.startGenerateFromUI');
        }
        const {user, callback} = args;

        if( !user ) {
            return callback( 'No user' );
        }

        if ( !process.env.REPORTING_WORKER ) {
            Y.log( `Passing request to regenerate reporting to reporting worker.`, 'info', NAME );
            return relayToReportingWorker( args, 'startGenerateFromUI' );
        }

        Y.doccirrus.insight2.regenerate.generateReport( args );
        callback();
    }

    // ----------------
    // SCHEDULES
    // ----------------

    function dailyReportingsUpdate( user ) {
        Y.log( 'RUN Daily Reportings Update', 'info', NAME );

        Y.doccirrus.api.reporting.reportingDBaction( {
            mongoose: true,
            user,
            action: 'updateAge',
            callback: ()=> {return;}
        } );
    }

    function dailyReportingsAuxUpdate( user ) {
        var
            SyncAux = Y.doccirrus.insight2.SyncAux,
            isISD = Y.doccirrus.auth.isISD();
        Y.log( 'RUN Daily Reportings AUX Update', 'info', NAME );

        let auxitem, syncmodel, queueLength = 0, updateModel;
        getModel( user, 'syncauxreporting' ).then( function( syncauxmodel ) {
            syncmodel = syncauxmodel;
            return syncauxmodel.mongoose.find( {} ).limit( 1 ).exec();
        } ).then( function( queueItems ) {
            queueLength = queueItems.length;
            if( queueLength ) {
                Y.log( 'AUX Update processing items in queue: ' + queueLength.toString(), 'info', NAME );
                auxitem = queueItems[0];
                updateModel = ( ( isISD ) ? 'mirror' : '' ) + auxitem.entityName;
                return getModel( user, updateModel );
            } else {
                return Prom.resolve();
            }
        } ).then( function( model ) {
            if( model ) {
                return model.mongoose.find( {_id: auxitem.entryId} ).limit( 1 ).exec();
            } else {
                return Prom.resolve();
            }
        } ).then( function( document ) {
            if( document && document.length ) {
                let sync = new SyncAux( document[0], auxitem.entityName, user );
                Y.log( `Running syncAuxReporting for ${auxitem.entityName} ${auxitem.entryId}`, 'info', NAME );
                return Prom.resolve( sync.run().catch( function( err ) {
                    Y.log( `dailyReportingsAuxUpdate. Error during sync run: ${JSON.stringify( err )}. Entity: ${auxitem.entityName} with _id: ${auxitem.entryId}`, 'error', NAME );
                } ) );
            } else {
                return Prom.resolve();
            }
        } ).then( function() {
            if( auxitem && syncmodel ) {
                return syncmodel.mongoose.remove( {_id: auxitem._id} ).exec();
            } else {
                return Prom.resolve();
            }
        } ).then( function() {
            if( queueLength ) {
                dailyReportingsAuxUpdate( user );
            }

            return Prom.resolve();
        } );
    }

    function updateAge( model ) {
        var todayMM = moment().format( 'MM' ),
            todayDD = moment().format( 'DD' ),
            query = {
                dd: todayDD,
                mm: todayMM
            },
            stream,
            updated = 0;

        Y.log( 'Daily Reportings Update - increase age start', 'info', NAME );
        stream = model.mongoose.find( query, {}, {timeout: true} ).stream();

        function onData( report ) {
            let updateQuery,
                reportId = report._id;

            stream.pause();
            report = JSON.parse( JSON.stringify( report ) );

            if( 'number' === typeof report.age ) {
                updateQuery = {$inc: {age: 1}};
            } else {
                let newDate = Number( report.age );
                newDate++;
                updateQuery = {$set: {age: newDate}};
            }
            model.mongoose.collection.update( {_id: reportId}, updateQuery, ( err ) => {
                if( err ) {
                    Y.log( 'Patient Age updating error: ' + JSON.stringify( err ), 'error', NAME );
                } else {
                    updated++;
                }
                stream.resume();
            } );
        }

        function onError( err ) {
            Y.log( 'Error on updating reports patient name ' + JSON.stringify( err ), 'error', NAME );
        }

        function finalCb() {
            Y.log( 'Daily Reportings Update - increase age finished, updated ' + updated.toString(), 'info', NAME );
        }

        stream.on( 'data', onData ).on( 'error', onError ).on( 'close', finalCb );
    }

    /**
     * Gets LABDATA activities from reporting collection
     * @method getLabDataOverview
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.query
     * @param {Object} args.query.timestamp if labReqReceived is not set, query "timestamp" moved to "labReqReceived"
     * @param {Object} args.query.labReqReceived main timestamp query
     * @param {Object} args.options
     * @param {Function} args.callback
     */
    function getLabDataOverview( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.getLabDataOverview', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.getLabDataOverview');
        }
        //  moved to reporting-aggregations.server.js
        Y.doccirrus.insight2.aggregations.getLabDataOverview( args );
    }

    /**
     *  Gets patient labdata / findings
     *
     *  Testing alternate backend which uses reporting rather than aggregation
     *  This is the endpoint requested by the Tabelle tab of LABDATA activities in inCase
     *
     *  @param  args                        {Object}    REST /1/ format
     *  @param  args.user                   {Object}    REST user or equivalent
     *  @param  args.query                  {Object}
     *  @param  args.callback               {Function}  Of the form fn( err, { results: [], count: {Number} } )
     *
     *  Option to query a single activity:
     *  @param  args.query.activityId       {String}    activity id. If it is set, api will produce data for single LABDATA activity
     *
     *  Option to query a casefolder before a given date:
     *  @param  args.query.caseFolderId     {String}    casefolder _id, if showing a set of results
     *  @param  args.query.patientId        {String}    patient _id, if showing casefolder results
     *  @param  args.query.timestamp        {Date}      if showing casefolder results
     */

    function getLabDataTablePivot( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.getLabDataTablePivot', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.getLabDataTablePivot');
        }
        //  moved to reporting-aggregations.server.js
        Y.doccirrus.insight2.aggregations.getLabDataTablePivot( args );
    }

    /**
     *  During development it is necessary to repeatedly update the reportings collection for labdta
     *  TODO: this should be removed in production
     *
     *  @param  args
     *  @param  args.user
     *  @param  args.callback
     */

    /**
     * Cleans reporting and syncreporting collections
     * @method clearReportingCollections
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} [args.query]
     * @param {Object} [args.data]
     * @param {Boolean} [args.data.keepSyncReporting=false] if true, will not clean syncreporting collection
     * @param {Function} args.callback
     *
     * @return {Function}
     */
    function clearReportingCollections( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.clearReportingCollections', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.clearReportingCollections');
        }

        //  moved to reporting-regenerate.server.js
        return Y.doccirrus.insight2.regenerate.clearReportingCollections( args );
    }

    /**
     *  Generates reportings from activities.
     */

    function generateActivityReportings( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.generateActivityReportings', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.generateActivityReportings');
        }
        return Y.doccirrus.insight2.regenerate.generateActivityReportings( args );
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
    function generateTaskReportings( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.generateTaskReportings', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.generateTaskReportings');
        }
        Y.doccirrus.insight2.regenerate.generateTaskReportings( args );
    }

    /**
     * Generates schedule reportings from schedules.
     *  1. Check smallest _id
     *  2. if exists uses as query for _id: query._id = { $lte: _id }
     * @method generateScheduleReportings
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} [args.data]
     * @param {Object} [args.data.fullGeneration] if set - does not check for smallest _id
     * @param {Object} [args.query]
     * @param {Function} args.callback
     * @for Y.doccirrus.api.reporting
     * @see generateReportings
     *
     * @return {Function}
     */
    function generateScheduleReportings( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.generateScheduleReportings', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.generateScheduleReportings');
        }
        return Y.doccirrus.insight2.regenerate.generateScheduleReportings( args );
    }

    /**
     *  Generates document reportings from activities.
     *  These are generated along with activities, since they share activity fields
     */

    function generateDocumentReportings( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.generateDocumentReportings', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.generateDocumentReportings');
        }
        return Y.doccirrus.insight2.regenerate.generateDocumentReportings( args );
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
     */
    function generateReportings( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.generateReportings', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.generateReportings');
        }
        Y.doccirrus.insight2.regenerate.generateReportings( args );
    }

    /**
     * Regenerates activity, document, task, schedule reportings.
     * @method regenerateReporting
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} [args.query] Used in cleaning process, and in documents(activity,task,schedule) selection.
     * @param {Function} args.callback
     */
    function regenerateReporting( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.regenerateReporting', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.regenerateReporting');
        }
        Y.doccirrus.insight2.regenerate.regenerateReporting( args );
    }

    /**
     *  Recreate report entries for all LABDATA findings
     *
     *  This is a dev/support route in for MOJ-7137, to be removed in future
     *
     *  @param  args            {Object}    REST v1
     *  @param  args.user       {Object}    REST user or equivalent
     *  @param  args.callback   {Function}  Of the form fn( err )
     */

    function regenerateLabdataReportings( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.regenerateLabdataReportings', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.regenerateLabdataReportings');
        }
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
                    Y.log( 'Cleared ' + data.result.n + ' LABDATA reportings for regeneration.', 'debug', NAME );
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
                Y.log( 'Problem recreating reporting entries for LABDATA activities: ' + JSON.stringify( err ), 'warn', NAME );
                return args.callback( err );
            }
            args.callback( null );
        }
    }

    /**
     *  List all activities for a patient and create syncreporting entries for them
     *
     *  NOTE: emergency patch only - general pattern is that query should be passed to reporting manager
     *  TODO: remove if possible
     *
     *  @param  args                            {Object}
     *  @param  args.user                       {Objecct}
     *  @param  args.originalParams             {Object}
     *  @param  args.originalParams.patientId   {String}
     *  @paran  args.callback                   {Function}  Calls back immediately by default
     *  @param  args.onComplete                 {Function}  Callback on completion for internal API use
     */

    function regenerateForPatient( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.regenerateForPatient', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.regenerateForPatient');
        }
        Y.doccirrus.insight2.regenerate.regenerateForPatient( args );
    }

    /**
     *  Dev/support route to manually run migration to fix missing actType on reporting entries
     *  TODO: move to migration helper
     *  @param args
     */

    function fixMissingActType( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.fixMissingActType', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.fixMissingActType');
        }
        Y.doccirrus.insight2.migrationhelper.fixMissingActType( args.user, false, onFixComplete );

        //  slow process, call back immediately
        args.callback( null, {'status': 'Started migration to correct missing actType on reporting entries.'} );  //  eslint-disable-line callback-return

        function onFixComplete( err ) {
            if( err ) {
                Y.log( 'Problem during reporting actType migration: ' + JSON.stringify( err ), 'warn', NAME );
                return;
            }
            Y.log( 'Finished test run of migration to correct actType where missing on reporting entries.', 'debug', NAME );
        }
    }

    /**
     *  Dev/support route to manually run migration to fix missing content on activities and reporting entries
     *  TODO: move to migration helper
     *  @param args
     */

    function fixMissingActContent( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.fixMissingActContent', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.fixMissingActContent');
        }
        Y.doccirrus.insight2.migrationhelper.fixMissingActContent( args.user, false, onFixComplete );

        //  slow process, call back immediately
        args.callback( null, {'status': 'Started migration to correct missing content on activities and their reporting entries.'} );  //  eslint-disable-line callback-return

        function onFixComplete( err ) {
            if( err ) {
                Y.log( 'Problem in migration to correct missing activity content: ' + JSON.stringify( err ), 'warn', NAME );
                return;
            }
            Y.log( 'Finished test run of migration to correct activity content where missing.', 'debug', NAME );
        }
    }

    /**
     *  Dev/support route to manually run migration to fix missing content on activities and reporting entries
     *  TODO: move to migration helper
     *  @param args
     */

    function regenerateLabdataOneMonth( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.regenerateLabdataOneMonth', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.regenerateLabdataOneMonth');
        }
        Y.doccirrus.insight2.migrationhelper.regenerateLabdataOneMonth( args.user, false, onQueuedRegeneration );
        function onQueuedRegeneration( err, report ) {
            if( err ) {
                return args.callback( err );
            }
            args.callback( null, {'data': report} );
        }
    }

    // ----------------
    // GET DATA (ANALYSIS)
    // ----------------

    function getAnalysis( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.getAnalysis', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.getAnalysis');
        }

        relayToReportingWorker( args, 'getAnalysis' );
        //Y.doccirrus.insight2.aggregations.getAnalysis( args );
    }

    function getDataByAggregation( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.getDataByAggregation', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.getDataByAggregation');
        }

        relayToReportingWorker( args, 'getDataByAggregation' );
        //Y.doccirrus.insight2.aggregations.getDataByAggregation( args );
    }

    function generateSchneiderKBVLogAnalysis( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.generateSchneiderKBVLogAnalysis', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.generateSchneiderKBVLogAnalysis');
        }

        relayToReportingWorker( args, 'generateSchneiderKBVLogAnalysis' );
        //return Y.doccirrus.insight2.aggregations.generateSchneiderKBVLogAnalysis( args );
    }

    function generatePerformanceGroupReport( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.generatePerformanceGroupReport', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.generatePerformanceGroupReport');
        }

        relayToReportingWorker( args, 'generatePerformanceGroupReport' );
        //return Y.doccirrus.insight2.aggregations.generatePerformanceGroupReport( args );
    }

    function generatePerformanceReportByEmployees( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.generatePerformanceReportByEmployees', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.generatePerformanceReportByEmployees');
        }

        relayToReportingWorker( args, 'generatePerformanceReportByEmployees' );
        //return Y.doccirrus.insight2.aggregations.generatePerformanceReportByEmployees( args );
    }

    function generatePVSPerformanceReport( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.generatePVSPerformanceReport', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.generatePVSPerformanceReport');
        }

        relayToReportingWorker( args, 'generatePVSPerformanceReport' );
        //return Y.doccirrus.insight2.aggregations.generatePVSPerformanceReport( args );
    }

    function generatePVSLogAnalysis( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.generatePVSLogAnalysis', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.generatePVSLogAnalysis');
        }

        relayToReportingWorker( args, 'generatePVSLogAnalysis' );
        //return Y.doccirrus.insight2.aggregations.generatePVSLogAnalysis( args );
    }

    /**
     *  Manually run syncAux reportings from test route, dev/support/testing use for EXTMOJ-1958
     *
     *  @param  {Object}    args    Rest /1/
     */

    function runSyncAux( args ) {
        dailyReportingsAuxUpdate( args.user );
        args.callback( null, { 'status': 'manually started syncAux, checks log for details' } );
    }

    /**
     *  Manually run regeneration of reportings based on audit log activity, test MOJ-12129
     */

    async function regenerateFromAuditLog( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.regenerateFromAuditLog', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.regenerateFromAuditLog');
        }

        let
            startDate = moment().subtract( 24, 'hours' ).startOf( 'day' ).toDate(),
            endDate = moment().toDate(),
            err, result;

        [ err, result ] = await formatPromiseResult(
            Y.doccirrus.insight2.regenerate.regenerateFromAuditLog( args.user, startDate, endDate )
        );

        if ( err ) {
            Y.log( `Problem generating syncreportings from audit log: ${err.sack||err}`, 'error', NAME );
            return handleResult( err, null, args.callback );
        }

        return handleResult( null, { 'status': `Regenerated reportings from audit logs between ${startDate} and ${endDate}: ${JSON.stringify( result )}` }, args.callback );
    }

    /**
     *  Temporary / dev method to add some syncreportings
     *  @param args
     *  @return {Promise<*>}
     */

    async function testAddReportings( args ) {
        Y.log('Entering Y.doccirrus.api.reporting.testAddReportings', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.testAddReportings');
        }
        const
            activityIds = [
                //  TEST IDS HERE
            ];
        let
            err,// result,
            postArgs,
            postData,
            startTime = (new Date()).getTime(),
            endTime,
            i;


        for (i = 0; i < activityIds.length; i++) {

            postData = {
                'entityName': 'ACTIVITY',
                'entryId': activityIds[i],
                'timestamp': moment().subtract(1, 'hour').toISOString()
            };

            postArgs = {
                'user': args.user,
                'model': 'syncreporting',
                'action': 'post',
                'data': Y.doccirrus.filters.cleanDbObject(postData)
            };

            [err /*, result */] = await formatPromiseResult(Y.doccirrus.mongodb.runDb(postArgs));

            if (err) {
                return args.callback(err);
            }
        }

        endTime = (new Date()).getTime();

        args.callback( null, { 'activityIds': activityIds, 'time': (endTime - startTime) } );
    }

    /**
     *  Called from dbdb.server.js during startup
     *  @param callback
     */

    function runOnStart( callback ) {
        const useRedisConfig = {...redisConfig, retry_strategy: function( options ) { return retryStrategy( options ); } };

        //  Try connect to redis and subscribe to messages from the reporting microservice
        if( cluster.isWorker && cluster.worker.process.env.REPORTING_WORKER && redisConfig ) {

            Y.log( `Attempting to connect to reporting microservice, ${JSON.stringify( redisConfig, undefined, 2 )}`, 'info', NAME );

            insightRedisSubscriber = redis.createClient( useRedisConfig );
            insightRedisPublisher = redis.createClient( useRedisConfig );

            if ( insightRedisSubscriber && insightRedisPublisher ) {
                insightRedisSubscriber.on( "error", ( err ) => {
                    Y.log( `reporting microservice: subscriber error: ${err.stack || err}`, 'error', NAME );
                    return;
                } );

                insightRedisSubscriber.subscribe( `reportingreply` );
                insightRedisSubscriber.addListener( 'message', onRedisMessageFromMicroservice );
            }
        }

        //  Listen for request for aggregations
        if ( Y.doccirrus.insight2.utils.isReportingWorker() ) {
            Y.log( 'Subscribing to REQUEST_REPORTING_AGGREGATION on reporting worker', 'info', NAME );
            Y.doccirrus.ipc.subscribeNamed( 'REQUEST_REPORTING_AGGREGATION', NAME, true, onRequestAggregationIPC );
        }

        //  Listen for restart
        Y.log( `Listen for reporting worker restart`, 'info', NAME );
        if( Y.doccirrus.insight2.utils.isReportingWorker() ) {
            Y.doccirrus.ipc.subscribeNamed( 'REPORTING_WORKER_RESTART', NAME, false, restartWorker );
        }

        //  Tell the reporting manager to start the queues going
        if ( Y.doccirrus.insight2.utils.isReportingWorker() ) {
            Y.log( `Starting reporting worker.`, 'info', NAME );
            Y.doccirrus.insight2.syncReportingManager.runOnStart( callback );
            return;
        }

        callback( null );
    }

    /**
     *  restart reporting worker if rule engine queue is empty. Notify user about result.
     *
     *  @param  {Object}    user    user from client to send notification to
     */
    function restartWorker( user ) {
        let length = Y.doccirrus.api.rule.getQueueLength();

        Y.doccirrus.communication.emitEventForUser( {
            targetId: user.identityId,
            messageId: 'restartReportingWorker',
            event: 'message',
            msg: {
                data: length ? `${Y.doccirrus.errorTable.getMessages( {code: 25005} )} (${length})` : Y.doccirrus.i18n( 'TaskMojit.TaskModal.button.DONE')
            },
            meta: {
                level: length ? 'WARNING' : 'SUCCESS'
            }
        } );

        if( !length ) {
            cluster.worker.kill();
        }
    }

    /**
     *  route execution of command to reporting worker
     *
     *  @param  {Object}    args
     *  @param  {Object}    args.user
     *  @param  {Object}    args.callback
     */
    function restartReportingWorker( args ){
        Y.log('Entering Y.doccirrus.api.reporting.restartReportingWorker', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.reporting.restartReportingWorker');
        }
        const { user, callback } = args;

        if( Y.doccirrus.insight2.utils.isReportingWorker() ){
            restartWorker( user );
        } else {
            Y.doccirrus.ipc.send( 'REPORTING_WORKER_RESTART', user );
        }
        callback();
    }

    /**
     *  Wrapper function for all calls to reporting model
     *  Receive a call from server - if there are redis clients for subscriber and publisher then use new logic,
     *  otherwise, use old logic and functions
     *  NEW LOGIC
     *  1. Serialize all info (channelId, query, user, data, options) into v8 internal object
     *  2. Send received message using redis publisher client to reporting service
     *  3. Add listener for 'message' event which comes from publisher from reporting service side
     *  4. Once message is received from reporting service:
     *      - try to deserialize it
     *      - send response back to caller
     *
     * @param {Object} args
     * @param {Object} args.user
     * @param {Boolean} args.mongoose - flag to indicate mongoose call (like deleteMany, insertMany, update)
     * @param {String} args.model - model where action should be made
     * @param {Object} args.data - data to process
     * @param {Array} args.fields - fields to update
     * @param {Object} args.query - object with desired query to execute
     * @param {String} args.action - indicate what should be done
     * @param {Object} args.options - set of options
     * @param {Array} args.pipeline - array of steps to proceed during aggrerate action
     * @param {Boolean} args.migrate - flag which indicate that call was made from migration
     * @param {Function} args.callback - REQUIRED we must pass a callback to this function to return a result from service listener
     *                      - it will be lost with using promise
     * @returns {Promise<void>}
     */
    async function reportingDBaction( args ) {
        Y.log( 'Entering Y.doccirrus.api.reporting.reportingDBaction', 'info', NAME );
        const
            {mongoose = false, model = 'reporting', data, fields, query, action = 'get', options, pipeline, migrate = false} = args,
            {user, callback, ...params} = args,
            getModelPromisify = util.promisify( Y.doccirrus.mongodb.getModel ),
            exitFn = ( err, results ) => {
                Y.log( 'Exiting Y.doccirrus.api.reporting.reportingDBaction', 'info', NAME );
                return handleResult( err, results, callback );
            };

        let err,
            messageStr,
            serializedMessage;

        async function publish( message ) {
            let [err] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    insightRedisPublisher.publish( 'reporting', message, ( err ) => {
                        if( err ) {
                            return reject( err );
                        }
                        resolve();
                    } );
                } )
            );
            if( err ) {
                Y.log( `reportingDBaction: error on publish ${action}: ${err.stack || err}`, 'error', NAME );
                return exitFn( err );
            }
        }

        if( insightRedisPublisher && insightRedisSubscriber ) {
            const
                channelId = new ObjectId().toString(),

                message = {
                    channelId,
                    tenantId: user.tenantId,
                    action,
                    ...params
                };

            try {
                messageStr = JSON.stringify( message );
            } catch( err ) {
                return Y.log( `reportingDBaction. Error while stringify output message: ${err.stack || err}`, 'error', NAME );
            }

            microserviceChannels[ channelId ] = {
                tenantId: user.tenantId,
                timeout: ( new Date().getTime() + MICROSERVICE_TIMEOUT ),
                callback: exitFn
            };

            setTimeout( function() {
                if ( microserviceChannels.hasOwnProperty( channelId ) ) {
                    Y.log( `reportingDBAction: Removing expired callback for reporting service: ${channelId}`, 'warn', NAME );
                    delete microserviceChannels[ channelId ];
                }
            }, MICROSERVICE_TIMEOUT );

            if( Buffer.byteLength( messageStr ) > 8000000 && message.data && message.data.length ) { // The message has data and is larger than 8MB
                Y.log( 'reportingDBAction: messages larger than 8MB should not be sent over redis. Trying to share data over the file system instead.', 'warn', NAME );

                const tmpPath = path.normalize( `/var/tmp/${message.channelId}` );
                const writePromises = [];
                const dataToWrite = v8.serialize( {data: message.data} );
                message.fs = [];

                //leave in case of need to write each data part separately
                writePromises.push( util.promisify( fs.writeFile )( `${tmpPath}_report`, dataToWrite )
                    .then( () => Y.log( `reportingDBAction. message data was successfully written to the file system: ${tmpPath}_report.`, 'info', NAME ) ) );

                delete message.data;
                message.fs.push( {
                    tmpPath: `${tmpPath}_report`
                } );

                await Promise.all( writePromises )
                    .then( () => {
                        messageStr = JSON.stringify( message );
                        if( Buffer.byteLength( messageStr ) > 8000000 ) { // The message is larger than 8MB
                            Y.log( 'reportingDBAction: all buffers were shared over the file system and the message data still exceeds 8MB.', 'error', NAME );
                            const deletePromises = [];
                            for( let i = 0; i < message.fs.length; i++ ) {
                                deletePromises.push( util.promisify( fs.unlink )( message.fs[i].tmpPath ) );
                            }
                            Promise.all( deletePromises );
                            return exitFn( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Could not transfer data to reporting service, data is too large.'} ) );
                        } else {
                            serializedMessage = v8.serialize( message ).toString( 'base64' );
                            publish( serializedMessage );
                        }
                    } )
                    .catch( err => Y.log( `reportingDBAction: error in sending message: the message was larger than 8MB and it was not possible to share the data over the file system. ${err.stack || err}`, 'error', NAME ) );
            } else {
                serializedMessage = v8.serialize( message ).toString( 'base64' );
                publish( serializedMessage );
            }
        } else {
            // normal processing on local mongodb
            let results;
            if( !mongoose ) {
                [err, results] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action,
                        model,
                        pipeline,
                        data,
                        fields,
                        options,
                        migrate,
                        query
                    } ) );
                return exitFn( err, results );
            } else {
                let reportingModel;
                [err, reportingModel] = await formatPromiseResult( getModelPromisify( user, model, migrate ) );
                if( err ) {
                    Y.log( `reportingDBaction: error on getting model ${action} on mongoose:${mongoose} : ${err.stack || err}`, 'error', NAME );
                    return exitFn( err );
                }

                switch( action ) {
                    case 'deleteMany':
                        [err, results] = await formatPromiseResult(
                            reportingModel.mongoose.deleteMany( query ).exec()
                        );
                        break;
                    case 'insertMany':
                        [err, results] = await formatPromiseResult(
                            reportingModel.mongoose.collection.insertMany( data, options || {} )
                        );
                        break;
                    case 'update':
                        [err, results] = await formatPromiseResult(
                            reportingModel.mongoose.collection.update( query, data, options || {} )
                        );
                        break;
                    case 'remove':
                        [err, results] = await formatPromiseResult(
                            reportingModel.mongoose.collection.remove( query, options || {} )
                        );
                        break;
                    case 'count':
                        [err, results] = await formatPromiseResult(
                            reportingModel.mongoose.collection.count( query, options || {} )
                        );
                        break;
                    case 'updateAge':
                        updateAge( reportingModel );
                        break;
                }
            }
            if( err ) {
                Y.log( `reportingDBaction: error on calling ${action} on mongoose:${mongoose} : ${err.stack || err}`, 'error', NAME );
            }
            return exitFn( err, results );
        }
    }


    /**
     *  Event handler for when the reporting microservice recieves a message
     *
     *  see runOnStart and reportingDBAction above
     *
     *  @param   {String}    channel             An objectId representing a request -> response pair
     *  @param   {String}    responseMessage     Base64 encoded v8 serialized object
     *  @return {Promise<*>}
     */


    async function onRedisMessageFromMicroservice( channel, responseMessage ) {
        const
            readFileP = util.promisify( fs.readFile );

        Y.log( `onRedisMessageFromMicroservice: received message, ${responseMessage.length} bytes`, 'info', NAME );

        try {
            responseMessage = v8.deserialize( Buffer.from( responseMessage, 'base64' ) );
        } catch( err ) {
            Y.log( `onRedisMessageFromMicroservice: error on deserializing : ${err.stack || err}`, 'error', NAME );
            return;
        }

        if ( !responseMessage.channelId ) {
            Y.log( 'Invalid message from reporting microservice, detail in debug log.', 'error', NAME );
            Y.log( `Invalid message from reporting microservice: ${JSON.stringify( responseMessage )}`, 'debug', NAME );
            return;
        }

        if( responseMessage && Array.isArray( responseMessage.fs ) && responseMessage.fs[0] ) {
            Y.log( 'onRedisMessageFromMicroservice: the received message does not contain all the data. Trying to retrieve the missing data over the file system. ', 'info', NAME );

            //  in practice there will only be one file, reports are limited to the limit of 16MB
            //  this is more than enough for one page of reporting results, PDFs have their own limits for now

            let
                fileName = responseMessage.fs[0].tmpPath,
                err, fileData;

            [ err, fileData ] = await formatPromiseResult( readFileP( fileName ) );

            if ( err ) {
                Y.log( `onRedisMessageFromMicroservice: error in reading message from the file system. ${err.stack || err}`, 'error', NAME );
                if ( microserviceChannels[ responseMessage.channelId ] ) {
                    microserviceChannels[responseMessage.channelId].callback(err);
                }
                return;
            }

            try {
                let v8Data = v8.deserialize( fileData );
                responseMessage.result = v8Data;
            } catch ( v8Err ) {
                Y.log( `Could not deserialize reporting data: ${responseMessage.fs[0].tmpPath}`, 'error', NAME );
                Y.log( `onRedisMessageFromMicroservice: error in reading message from the file system. ${v8Err.stack || v8Err}`, 'error', NAME );
                if ( microserviceChannels[ responseMessage.channelId ] ) {
                    microserviceChannels[responseMessage.channelId].callback(err);
                }
                return;
            }

            //  Note, file not deleted here due to permissions here, will be deleted by reporting microservice user in one minute

            delete responseMessage.fs;
        }

        if( !microserviceChannels.hasOwnProperty( responseMessage.channelId ) ) {
            Y.log( `onRedisMessageFromMicroservice: Could not find callback for microservice channel: ${responseMessage.channelId}`, 'error', NAME );
            return;
        }

        microserviceChannels[ responseMessage.channelId ].callback( responseMessage.err, responseMessage.result );

        //  close the channel
        delete microserviceChannels[ responseMessage.channelId ];
    }


    async function createCSVFromReporting( args ) {
        let [ err, fileName ] = await formatPromiseResult( Y.doccirrus.insight2.csv.createCSVFromCursor( args ) );
        args.callback( err, fileName );
    }

    function createCSVFromAPI( args ) {
        Y.doccirrus.insight2.csv.createCSVFromPagedAPI( args );
    }



    /**
     * @class rlv
     * @namespace doccirrus.api
     */
    Y.namespace( 'doccirrus.api' ).reporting = {
        name: NAME,

        //  shared constants
        PROD_IPC_SIGNAL: 'ProdSyncReporting',
        REMOVE_IPC_SIGNAL: 'RemoveReporting',
        FLUSH_CACHE_IPC_SIGNAL: 'FlushReportingCache',

        //  initialize IPC stuff
        runOnStart,

        //  set up syncreportings for large batch generation
        'generateReportings': generateReportings,
        'regenerateReporting': regenerateReporting,
        'generateTaskReportings': generateTaskReportings,
        'generateScheduleReportings': generateScheduleReportings,
        'generateActivityReportings': generateActivityReportings,
        'generateDocumentReportings': generateDocumentReportings,

        'deleteAll': clearReportingCollections,
        'getModel': getModel,

        //  aggregations to show reports
        'generate': generateReport,
        'getData': getDataByConfigId,
        'getAnalysis': getAnalysis,
        'aggregate': getDataByAggregation,

        //  manage scheduled generation during migrations with a flag in the admins collection
        setRegenerationFlag,
        unsetRegenerationFlag,

        //  large batches can be caused by changes to locations, employees, etc, these are run at night
        dailyReportingsUpdate,
        dailyReportingsAuxUpdate,

        //  used to generate a special report for labdata results, pathological items requiring special attention
        'getLabDataOverview': getLabDataOverview,
        'getLabDataTable': getLabDataTablePivot,        //  TODO: check if still in use, remove if not

        //  handle generation from UI
        startGenerateFromUI,
        getRegenerationFlagUI,
        setCancelRegenerationFlag,
        getReportingDbStatus,
        clearReportings,
        clearSyncreportings,

        // migration and maintenance, special case for LABDATA reportings
        regenerateLabdataReportings,
        regenerateForPatient,

        //  manually run migrations for test / dev purposes
        fixMissingActType,
        fixMissingActContent,
        regenerateLabdataOneMonth,

        //  special reports
        generateSchneiderKBVLogAnalysis,
        generatePerformanceGroupReport,
        generatePerformanceReportByEmployees,
        generatePVSPerformanceReport,
        generatePVSLogAnalysis,

        runSyncAux,
        regenerateFromAuditLog,
        restartReportingWorker,
        reportingDBaction,

        //  test / dev / 3LS routes
        testAddReportings,

        createCSVFromReporting: createCSVFromReporting,
        createCSVFromAPI
    };


}, '0.0.1', {
    requires: [
        'dcforms-schema-InCase-T',
        'reporting-schema',
        'AnalysisGen',
        'analysisUtils',
        'reporting-cache',
        'insight2-migrationhelper',
        'syncAuxManager',
        'reporting-aggregations',
        'reporting-regenerate',
        'csv-utils'
    ]
} );