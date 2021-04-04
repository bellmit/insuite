/**
 *  Functionality used by the reporting manager, but not central to it - tidy of IPC and load monitoring
 *
 *  These utils are available on all instances, and can pass messages safely to the reporting worker
 */

/*global YUI*/



YUI.add( 'syncreporting-utils', function( Y, NAME ) {

    const
        os = require( 'os' ),
        cluster = require( 'cluster' ),
        moment = require( 'moment' ),
        dcCore = require( 'dc-core' ),

        formatPromiseResult = dcCore.utils.formatPromiseResult,

        OS_TYPE = os.type(),                    //  may be 'Linux' or 'Darwin'
        OS_CPU_COUNT =  os.cpus().length,

        MAX_LOAD_1M = 0.75,
        MAX_LOAD_1M_2 = 0.7,
        MAX_LOAD_5M = 0.8,

        DARWIN_ADDITION = 0.18,

        IPC_REPEAT_AFTER = 1000 * 60;       //  one minute

    Y.log( 'Instantiating syncreporting utils and setting up IPC', 'info', NAME );

    /**
     *  Checks predicted load average of system
     *
     *  Used to defer background tasks when the system load is high
     *
     *  note: The os.loadavg() method returns an array containing the 1, 5, and 15 minute load averages.
     *  see: https://nodejs.org/api/os.html#os_os_loadavg
     *
     *  @returns {boolean}
     */

    function isLoadHigh() {
        const
            avgs = os.loadavg(),

            fiveMinute = avgs[1] / OS_CPU_COUNT,
            load = avgs[0] / OS_CPU_COUNT;

        let
            max1m = MAX_LOAD_1M,
            max1m2 = MAX_LOAD_1M_2,
            max5m = MAX_LOAD_5M;

        if( 'Darwin' === OS_TYPE ) {
            max1m = max1m + DARWIN_ADDITION;
            max1m2 = max1m2 + DARWIN_ADDITION;
            max5m = max5m + DARWIN_ADDITION;
        }

        return ( load > max1m ) || ( load > max1m2 && fiveMinute > max5m );
    }

    /**
     *  The syncreportings are run on a single worker
     *  @return {boolean}
     */

    function isReportingWorker() {
        return cluster.isWorker && cluster.worker.process.env.REPORTING_WORKER || Y.doccirrus.auth.isMocha();
    }

    /**
     *  Add an item to the queue to be regenerated
     *
     *  The request will be written to syncreportinga nd an IPC issued to prod the reporting queue to process it
     *  if conditions allow.
     *
     *  Caller does not need to wait for the syncreporting to be generated, or for the IPC request, so will return
     *  immediately.  We do not check for any other queued requests for the same item, the next successful reporting
     *  regeneration will delete any duplicates.
     *
     *  @param  {Object}    user
     *  @param  {String}    user.tenantId   Save to the correct tenant's syncreporting queue
     *  @param  {String}    entityName      Matching entity type in syncreporting-schema, 'ACTIVITY', 'TASK', etc
     *  @param  {String}    itemId          Database _id of the object to expand in reportings
     */

    async function requestReporting( user, entityName, entryId ) {

        let
            err,
            postData = {
                'entityName': entityName,
                'entryId': entryId.toString(),
                'time': moment().toISOString()
            },
            postRequest = {
                'user': user,
                'model': 'syncreporting',
                'action': 'post',
                'data': Y.doccirrus.filters.cleanDbObject( postData )
            };

        //  (1) Sanity checks
        switch( entityName ) {
            case 'ACTIVITY': break;
            case 'SCHEDULE': break;
            case 'TASK': break;
            default:
                //  should generally not happen
                err = Error( `Unknown entityName ${entityName}` );
        }

        if ( !entryId ) {
            err = Error( `Missing entryId for entityName ${entityName}` );
        }

        if ( err ) {
            Y.log( `Attempted to create invalid syncreporting: ${err.stack||err}`, 'error', NAME );
            return;
        }

        //  (2) Save the new syncreporting
        [ err ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( postRequest ) );

        if ( err ) {
            Y.log( `Could not save syncrepoting ${err.stack||err}`, 'error', NAME );
            return;
        }

        //  (3) prod the queue
        if ( !isReportingWorker() ) {
            Y.doccirrus.insight2.syncReportingManager.prod( user.tenantId );
        } else {
            Y.doccirrus.ipc.send( Y.doccirrus.api.reporting.PROD_IPC_SIGNAL, { 'tenantId': user.tenantId } );
        }

    }

    /**
     *  When an item is deleted we should also delete any reporting and remove any updates to it from queueus
     *
     *  @param  {String}    tenantId
     *  @param  {String}    entityName
     *  @param  {String}    entryId
     */

    function removeReporting( tenantId, entityName, entryId ) {
        let item;

        //  deprecated, safety, catch any inconsistent calls to this
        if ( 'object' === typeof tenantId && tenantId.tenantId && tenantId.entityName && tenantId.entryId ) {
            Y.log( `DEPRECATED arguments to removeReporting, stack trace follows: ${Error().stack}`, 'warn', NAME );
            entityName = tenantId.entryId;
            entryId = tenantId.entryId;
            tenantId = tenantId.tenantId;
        }

        if ( 'object' === typeof tenantId && tenantId.tenantId ) {
            tenantId = tenantId.tenantId;
        }

        //  on the reporting worker we can pass this directly to the reporting manager
        if ( isReportingWorker() ) {
            Y.doccirrus.insight2.syncReportingManager.removeReporting( tenantId, entityName, entryId );
            return;
        }

        //  this is not the reporting worker, signal it by IPC
        item = {
           'tenantId': tenantId,
           'entityName': entityName,
           'entryId': entryId
        };

        sendItemByIPC();

        //  repeat the IPC signal in one minute, in case of dropped IPC, or concurrency issues with a batch of
        //  reportings already in progress (may no longer be necessary, cheap safety measure)
        setTimeout( () => { sendItemByIPC(); }, IPC_REPEAT_AFTER );

        function sendItemByIPC() {
            Y.doccirrus.ipc.send( Y.doccirrus.api.reporting.REMOVE_IPC_SIGNAL, item );
        }
    }

    /**
     *  When reporting-relevant items are updated, drop them from reporting cache
     *
     *  @param  {String}    tenantId
     *  @param  {String}    entityName
     *  @param  {String}    entryId
     */

    function flushReportingCache( tenantId, entityName, entryId ) {
        let item;

        //  on the reporting worker we can pass this directly to the reporting manager
        if ( isReportingWorker() ) {
            Y.doccirrus.insight2.syncReportingManager.invalidateCache( tenantId, entityName, entryId );
            return;
        }

        //  this is not the reporting worker, signal it by IPC
        item = {
            'tenantId': tenantId,
            'entityName': entityName,
            'entryId': entryId
        };

        requestFlushByIPC();

        function requestFlushByIPC() {
            Y.doccirrus.ipc.send( Y.doccirrus.api.reporting.FLUSH_CACHE_IPC_SIGNAL, item );
        }
    }

    /**
     *  Construct a database query which will match a reporting of the given type
     *
     *  @param  {Object}    item
     *  @param  {String}    item.entityName     Type of object to make reporting for (ACTIVITY|DOCUMENT|TASK|SCHEDULE)
     *  @param  {String}    item.entryId        Database _id of an object of this type
     */

    function getReportingQuery( item ) {
        let query = { entityName: item.entityName };

        switch( item.entityName ) {
            case 'ACTIVITY':
                //  when deleting an activity reporting, we also clear up its labdata and document reportings
                query.entityName = { '$nin': [ 'TASK', 'SCHEDULE' ] };
                query.activityId = item.entryId;
                break;

            case 'TASK':
                query = { taskId: item.entryId };
                break;

            case 'SCHEDULE':
                query = { scheduleId: item.entryId };
                break;

            //  LABDATA, MEDDATA and DOCUMENT reporting are deleted wholesale along with activities
            case 'LABDATA':
            case 'MEDDATA':
            case 'DOCUMENT':
                return null;

            default:
                throw new Error( `Could not make query for unknown reporting entity type: ${item.entityName}` );
        }

        return query;
    }

    /**
     *  Called by dcdb.server.js, used to initialize IPC during startup
     *
     *  @param callback
     *  @return {*}
     */

    function runOnStart( callback ) {

        //  skip this if not on reporting worker
        if( !isReportingWorker() ) { return callback( null ); }

        Y.log( 'Sync reporting utils setting up IPC listeners on reporting worker.', 'debug', NAME );

        Y.doccirrus.ipc.subscribeNamed( Y.doccirrus.api.reporting.PROD_IPC_SIGNAL, NAME, true, function( msg ) {
            Y.doccirrus.insight2.syncReportingManager.prod( msg.tenantId );
        } );

        Y.doccirrus.ipc.subscribeNamed( Y.doccirrus.api.reporting.REMOVE_IPC_SIGNAL, NAME, true, function( msg ) {
            removeReporting( msg.tenantId, msg.entityName, msg.entryId );
        } );

        Y.doccirrus.ipc.subscribeNamed( Y.doccirrus.api.reporting.FLUSH_CACHE_IPC_SIGNAL, NAME, true, function( msg ) {
            flushReportingCache( msg.tenantId, msg.entityName, msg.entryId );
        } );

        callback();
    }

    /**
     * Expose API
     */

    Y.namespace( 'doccirrus.insight2' ).utils = {
        runOnStart,
        isReportingWorker,
        isLoadHigh,
        requestReporting,
        removeReporting,
        getReportingQuery,
        flushReportingCache
    };

}, '0.0.1', {
    requires: [
        'reporting-api'
    ]
} );