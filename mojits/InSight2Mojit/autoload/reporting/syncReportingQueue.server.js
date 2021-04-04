/**
 *  Keeps reporting entries in sync with other objects:
 *
 *      (-)   activities
 *              * labdata
 *              * meddata
 *              * documents
 *      (-)   tasks
 *      (-)   calendar entries (schedules)
 *
 *  Update of reportings is done by a dedicated reporting worker, other instances request update of reportings
 *  by IPC.  These requests are made via utility methods in syncreporting-utils.
 *
 *  Reporting entries may also be regenerated in bulk in a few situations:
 *
 *      (-) when migrating between versions and a while collection is updated
 *
 *      (-) when changing a field which is duplicated in a large number of objects/reportings, such as an employee name
 *
 *      (-) when manually invoked by support to correct a problem on a customer system
 *
 *      (-) on import/migration of data from another system
 *
 *  There is one queue per tenant in multi-tenant systems, maintained by the SyncReportingManager
 */

/*global YUI */



YUI.add( 'SyncReportingQueue', function( Y, NAME ) {

    const
        dcCore = require( 'dc-core' ),
        formatPromiseResult = dcCore.utils.formatPromiseResult,

        moment = require( 'moment' ),

        mongoose = require( 'mongoose' ),
        objectId = mongoose.Types.ObjectId,

        //  Wait after queue created for one minute before checking for deferred/incomplete regeneration requests
        CHECK_DELAYED_REGENERATION = ( 60 * 1000 ),

        //  Random increment when waiting to start delayed regeneration, prevent all tenants from starting up
        //  heavy processes all at once.  Legacy behavior, may no longer be necessary.
        RANDOM_DELAY = 15000,

        //  Maximum age of reporting cache
        CACHE_MAX_AGE = ( 60 * 10 * 1000 ),

        //  Maximum time to wait for a reporting entry to generate, consider it failed after this time
        GENERATE_TIMEOUT = ( 60 * 1000 ),

        //  Max interval at which to check for syncreportings
        CHECK_MAX_INTERVAL = 60 * 1000,

        //  Do not hammer the database if there are no syncreportings step back by one second after each empty result
        CHECK_STEP_BACK = 1000,

        //  When generating bulk reportings
        WRITE_BATCH_LIMIT = 100,

        //  Need a smaller limit when bulk deleting reportings, if there are connection timeouts on deletion, reduce this value:
        DELETE_BATCH_LIMIT = 20;

    /**
     * SyncReporting
     * Regenerate and update whole reporting entries
     * @class SyncReporting
     */

    class SyncReportingQueue {

        /**
         *  Initialize the syncreporting queue, there is one queue per tenant database
         *
         *  Only runs on reporting worker
         *
         *  @param  {Object}    user            Superuser for this tenant
         *  @param  {String}    tenantId
         *  @param  {Number}    startAfter      Timestamp, start checking syncreporting collection after this
         */

        constructor( user, tenantId, startAfter ) {
            var self = this;

            Y.log( `Creating syncreporting queue for tenant: ${tenantId}`, 'info', NAME );

            //  PROPERTIES

            self.su = user;                     //  Superuser for this tenant
            self.tenantId = tenantId;           //  Tenant ID

            self.lastCheck = 0;                 //  Timestamp when syncreportings collection was last checked
            self.lastSave = 0;                  //  Timestamp when a reporting was last saved
            self.nextCheck = startAfter;        //  Timestamp after which syncreporting collection should be checked
            self.stepBack = 0;                  //  Timestamp of the last time there was something to do

            self.loadHigh = true;               //  When load is high, reporting work is queued

            //  Reporting entries to regenerate or postpone
            self.toGenerate = new Map();

            //  When generating bulk reportings we don't want to save them individually, rather insert as a batch
            self.writeReportingBatch = [];
            self.writeSyncBatch = [];

            //  Reporting generation task which is currently in progress, entry from self.toGenerate:

            self.inProgress = null;

            self.timingMappers = 0;

            //  Cache is used to speed up bulk generation of reporting entries, it should only be used when
            //  handling entries from the syncreporting collection which are more than 10 minutes old

            self.cache = Y.doccirrus.insight2.reportingCache.createReportingCache();
            self.cache.resetAfter = 0;
            self.cache.quiet = true;

            //  cache sizes, will be manually tweaked
            self.cache.cacheLimits.activity = 200;
            self.cache.cacheLimits.fullActivity = 200;
            self.cache.cacheLimits.patient = 100;
            self.cache.cacheLimits.casefolder = 200;
            self.cache.cacheLimits.location = 40;
            self.cache.cacheLimits.basecontact = 300;
            self.cache.cacheLimits.lastSchein = 300;
            self.cache.cacheLimits.actcatusage = 100;

            //  only used on dispatcher
            self.cache.cacheLimits.mirroractivity = 200;
            self.cache.cacheLimits.mirrorpatient = 100;
            self.cache.cacheLimits.mirrorcasefolder = 200;
            self.cache.cacheLimits.mirrorlocation = 40;

            //  activities may be stored in one of two collections, tasks, documents and schedules are unaffected
            self.ACTIVITY_MODEL_NAME = Y.doccirrus.auth.isISD() ? 'mirroractivity' : 'activity';

            let checkRegenerationAfter = CHECK_DELAYED_REGENERATION + Math.floor( Math.random() * RANDOM_DELAY );
            setTimeout( () => { self.checkDelayedRegeneration(); }, checkRegenerationAfter );

            self.semaphore = 0;
        }

        prod() {
            const
                self = this,
                timestamp = ( new Date() ).getTime();

            self.nextCheck = timestamp - 1;
            self.check();
        }

        /**
         *  Invalidate something in the reporting cache.
         *
         *  If no object specified then Set the reporting cache to be cleared before next cycle (ie, drop the current cache)
         *
         *  @param  {String}    modelName       Section in reporting cache (db collections, virtual)
         *  @param  {String}    objectId        Object in cache
         */

        invalidateCache( modelName, objectId ) {
            var self = this;

            if ( !modelName || !objectId ) {
                self.cache.resetAfter = 0;
                return;
            }

            Y.log( `Invalidating item in reporting queue ${modelName} ${objectId}`, 'debug', NAME );
            self.cache.invalidate( modelName, objectId );
        }

        /**
         *  When the queue is first created, check for deferred or incomplete migration/regeneration of reportings
         *  Should run for each tenant after startup, but not immediately
         */

        checkDelayedRegeneration() {
            const self = this;
            Y.doccirrus.insight2.regenerate.checkRegeneration( self.su, onCheckRegeneration );

            function onCheckRegeneration(err) {
                if(err){
                    Y.log( `Error on report regeneration on tenant ${self.tenantId} : ${err.message}`, 'error', NAME );
                }
            }
        }

        /**
         *  Called periodically by the reporting manager for each queue, checks for any scheduled work which
         *  should happen on this queue (look in syncreportings, flush cache, etc)
         *
         *  @param  loadHigh    Set to true if system load is high
         */

        check( loadHigh ) {
            const
                self = this,
                timestamp = ( new Date() ).getTime();

            //console.log( '(****) syncReportingQueue.check, loadHigh: ', loadHigh, self.tenantId, self.toGenerate.size );

            //  update loadHigh according to latest estimation from reporting manager
            self.loadHigh = loadHigh;

            //  if the cache if too old, flush it.
            if ( timestamp > self.cache.resetAfter ) {
                Y.log( `Flushing reporting cache on tenant: ${self.tenantId}`, 'debug', NAME );
                self.cache.clear();
                self.cache.resetAfter = ( timestamp + CACHE_MAX_AGE );
            }

            //  if we have a task in progress, check it has not timed out
            if ( self.inProgress && timestamp > self.inProgress.timeoutAfter ) {
                Y.log( `Giving up on failed reporting generation ${self.tenantId}: ${self.inProgress.entityName} ${self.inProgress.entryId}`, 'error', NAME );
                self.recordFailed( self.inProgress );
                self.inProgress = null;

                //  if we have received reporting items which are held back, check on them
                self.checkHeldBack();
                return;
            }

            //  if we have not saved in awhile, check for post-dated syncreportings we may be holding on to
            if ( timestamp > self.lastSave + GENERATE_TIMEOUT ) {
                Y.log( `Check for deferred syncreporting items ${self.toGenerate.size} / ${self.writeReportingBatch.length}`, 'debug', NAME );
                if ( self.toGenerate.size > 0 || self.writeReportingBatch.length > 0 ) {
                    Y.log( `Reporting items were deferred / post-dated, checking them again ${self.toGenerate.size}` );
                    self.checkHeldBack();
                }
                self.lastSave = timestamp;
            }

            //  if we have items in progress then let the current batch complete before queueing more work
            if ( self.inProgress || self.toGenerate.size > 0 || self.writeReportingBatch.length > 0 ) {
                return;
            }

            //  if it is time to check the syncreportings collection in the database, and we are not already working on
            //  a batch of syncreportings, then check the database
            if ( 0 === self.toGenerate.size && timestamp > self.nextCheck ) {
                self.checkDbSyncQueue();
            }
        }

        /**
         *  Check the syncreportings collection for deferred work
         */

        async checkDbSyncQueue() {
            const
                self = this,
                timestamp = ( new Date() ).getTime();

            let i, err, result;

            //  check the database for syncreportings left by a batch process or during high load
            [ err, result ] = await formatPromiseResult ( Y.doccirrus.mongodb.runDb( {
                'user': self.su,
                'model': 'syncreporting',
                'query': {},
                'options': {
                    'limit': WRITE_BATCH_LIMIT
                }
            } ) );

            if ( err ) {
                Y.log( `Problem checking syncreporting queue: ${err.stack||err}`, 'error', NAME );
                return;
            }

            if ( 0 === result.length ) {
                //  nothing found, wait a little longer before checking again, don't hammer empty collection
                self.stepBack = self.stepBack + CHECK_STEP_BACK;
                self.stepBack = ( self.stepBack > CHECK_MAX_INTERVAL ) ? CHECK_MAX_INTERVAL : self.stepBack;
                self.nextCheck = timestamp + self.stepBack;
                return;
            }

            //  there is postponed work to do, check again immediately after completing current task
            self.stepBack = 0;

            //  keep the outstanding tasks in self.toGenerate, we'll pre-warm the cache before running self.generate()
            for ( i = 0; i < result.length; i++ ) {

                //  check for invalid entries
                if ( result[i].entryId ) {

                    self.addItem( result[i] );

                } else {

                    Y.log( `Invalid syncreporting found in database: ${JSON.stringify( result[i] )}`, 'warn', NAME );
                    [ err ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            'user': self.su,
                            'model': 'syncreporting',
                            'action': 'delete',
                            'query': { entryId: { $exists: false } }
                        } )
                    );

                    if ( err ) {
                        Y.log( `Could not delete invalid syncreporting: ${err.stack||err}`, 'error', NAME );
                        //  continue processing the queue, there will be a mess in the logs
                    }

                }
            }

            self.timingMappers = 0;

            //  generate the reporting entries
            self.checkHeldBack();
        }

        /**
         *  Add an item to the reporting queue
         *
         *  @param  {Object}    item
         *  @param  {String}    item.entityName     'ACTIVITY', 'DOCUMENT', 'SCHEDULE', 'TASK', etc
         *  @param  {String}    item.entryId        Database _id of object
         *  @param  {Number}    item.startAfter     Timestamp to hold this until
         *  @param  {Boolean}   item.syncOnly       If true, jus save to syncreporting
         */

        addItem( item ) {
            const
                self = this,
                timeNow = ( new Date() ).getTime(),
                timeEntry = parseFloat( moment( item.timestamp ).format( 'x' ) );

            let modelName;

            //  key the items to be processed by entity type and _id, they'll be removed when generation was successful,
            //  failed, or cancelled by a deletion event raised by IPC from another process

            item.key = item.entityName + '-' + item.entryId;

            //  if the new reporting item has a tiemstamp greater than the max cache age, then items in the reporting
            //  cache are newer than the item to be regenerated, and the cache can be used safely

            if ( item.timestamp && ( timeNow > ( timeEntry + CACHE_MAX_AGE ) ) ) {
                //  item is older than CACHE_MAX_AGE, was requested before cache was lat reset, safe to use cached data
                item.canUseCache = true;
            } else {
                //  item was recently changed, ensure it is not in the cache, and don't use old data in cache to generate it
                modelName = item.entityName.toLowerCase();
                item.canUseCache = false;

                //  dispatcher uses mirror collections
                if ( 'activity' === modelName ) { modelName = self.ACTIVITY_MODEL_NAME; }
                self.cache.invalidate( modelName, item.entryId );
            }

            if ( self.toGenerate.has( item.key ) ) {
                Y.log( `Not adding reporting item to current batch, already present: ${item.key}`, 'debug', NAME );
                return;
            }

            self.toGenerate.set( item.key, item );
        }

        /**
         *  Check timing of entries which have been held in self.toGenerate
         *
         *  We do not always generate reporting entries immediately, or send them straight to the syncreportings
         *  This is in case of multiple, rapid changes to an object, such as when it is approved and then a PDF is
         *  generated, or when user makes multiple changes.
         *
         *  We also wish to prevent multiple reporting entries from being generated concurrently, and to keep track
         *  of reporting entries which have failed to generate.
         */

        async checkHeldBack() {
            const
                self = this;

            let
                err,
                items,
                toBeSaved = 0,
                i;

            let startTime = ( new Date() ).getTime();

            //  if no pending items to generate then we're done
            if ( 0 === self.toGenerate.size ) { return; }

            //  if this queue is already working on a task then do not start another
            if ( self.inProgress ) {
                //console.log( '(****) reporting item is currently in progress: ', self.inProgress );
                return;
            }

            items = self.getToGenerateArray();

            //  pre-cache as much as possible in batch operations
            let startPreTimer = ( new Date()).getTime();
            [ err ] = await formatPromiseResult( Y.doccirrus.insight2.reportingCache.preCacheBulk( self.su, self.cache, items ) );
            let endPreTimer = ( new Date()).getTime();
            Y.log( `Precache timer for ${items.length} items: ${( endPreTimer - startPreTimer )}`, 'debug', NAME );

            if ( err ) {
                Y.log( `Could not run batch pre-cache for syncreporting batch: ${err.stack||err}`, 'error', NAME );
            }

            //  go over each item in toGenerate and create reportings
            for ( i = 0; i < items.length; i++ ) {
                [err] = await formatPromiseResult( self.generate( items[i] ) );

                if ( err ) {
                    Y.log( `Problem while generating reporting fields: ${err.stack||err}`, 'error', NAME );
                }

                toBeSaved = toBeSaved + 1;
            }

            if ( toBeSaved > 0 ) {
                await self.saveWriteBatch();
            }

            let endTime = ( new Date() ).getTime();
            Y.log( `Reporting batch time to generate ${toBeSaved} items: ' ${( endTime - startTime)}, cumulative mapper time: ${self.timingMappers}`, 'debug', NAME );
            self.timingMappers = 0;

            //  if the cache if too old, flush it at end of batch (pre-empt timer based flush which might clear it during batch)
            if ( !self.inProgress && endTime > self.cache.resetAfter ) {
                Y.log( `Flushing reporting cache on tenant: ${self.tenantId}`, 'debug', NAME );
                self.cache.clear();
                self.cache.resetAfter = ( endTime + CACHE_MAX_AGE );
            }

            //  nothing to do right now
            return toBeSaved;
        }

        /**
         *  Helper to convert the toGenerate map into an array, may lose the Map() in future
         */

        getToGenerateArray() {
            const self = this;
            let
                iterator, next,
                items = [];

            //  go over each item in toGenerate
            iterator = self.toGenerate.keys();
            next = iterator.next();

            while ( !next.done ) {
                items.push( self.toGenerate.get( next.value ) );
                next = iterator.next();
            }

            return items;
        }

        /**
         *  Start a reporting (re)generation, from an item in heldBack map
         *
         *  @param  {Object}    fromItem
         *  @param  {String}    fromItem.entityName
         *  @param  {String}    fromItem.entryId
         *  @param  {Boolean}   fromItem.canUseCache
         */

        async generate( fromItem ) {
            const
                self = this,
                timestamp = ( new Date() ).getTime();

            let
                reportingFields, err,
                skipSave = false,

                //  make a rough copy of fromItem before processing, prevent some references from hanging around
                item = {
                    '_id': fromItem._id || null,
                    'key': fromItem.key,
                    'entityName': fromItem.entityName,
                    'entryId': fromItem.entryId,
                    'canUseCache': fromItem.canUseCache || false
                };

            item.timeoutAfter = timestamp + GENERATE_TIMEOUT;
            self.inProgress = item;

            if ( self.toGenerate.has( item.key ) ) {
                self.toGenerate.delete( item.key );
            }

            switch( item.entityName ) {
                case 'ACTIVITY':
                    [ err, reportingFields ] = await formatPromiseResult( self.generateForActivity( item ) );
                    break;
                case 'SCHEDULE':
                    [ err, reportingFields ] = await formatPromiseResult( self.generateForSchedule( item ) );
                    break;
                case 'TASK':
                    [ err, reportingFields ] = await formatPromiseResult( self.generateForTask( item ) );
                    break;

                default:
                    err = new Error( `Unrecognized syncreporting type received: ${item.entityName}` );
            }

            self.inProgress = null;

            if ( err ) {
                if ( 404 !== err.code ) {
                    //  404 errors are common and not serious, don't spam the log with them
                    Y.log( `Cannot process reporting item: ${err.stack||err}`, 'error', NAME );
                }
                //  remove the syncreporting from the queue, note failure in audit log
                self.recordFailed( item, err );
                return;
            }

            reportingFields.entityName = item.entityName;
            item.reportingFields = reportingFields;

            // TODO domain specific filtering (deleted activities and quotation folders) must be done in the corresponding mojit but not here

            //  check that item should be saved, currently we skip reporting for QUOTATION casefolders
            if ( 'ACTIVITY' === item.entityName && 'QUOTATION' === item.reportingFields.caseFolderType  ) {
                skipSave = true;
            }

            // filters deleted activities from reporting collection
            if ( 'ACTIVITY' === item.entityName && 'DELETED' === item.reportingFields.status ) {
                skipSave = true;
                self.removeItem( item.entityName, item.entryId );
            }

            //  further exceptions can be added here...

            if ( !skipSave ) {
                self.writeReportingBatch.push( item );
            }
        }

        /**
         *  Create a reporting entry for an activity given item from toGenerate
         *
         *  @param item
         *  @return {Promise}
         */

        async generateForActivity( item ) {
            const self = this;

            let
                startTime = ( new Date()).getTime(),
                reportFields;

            function generateActivityReporting( resolve, reject ) {
                let
                    activityId = item.entryId.toString(),
                    //  if we cannot use the queue's reporting cache, use a cache just for the item to speed up any
                    //  secondary reportings for labadat or documents
                    rCache = ( item.canUseCache ? self.cache : Y.doccirrus.insight2.reportingCache.createReportingCache() );

                Y.doccirrus.forms.mappinghelper.createActivityMapperContext(self.su, activityId, rCache, null, onMapperContextCreated);

                function onMapperContextCreated(err, context) {
                    if (err) {

                        if ( 404 === err.code ) {
                            Y.log(`Could not make reporting for activity, not found: ${activityId}`, 'warn', NAME);
                        } else {
                            Y.log(`Failed to expand activity. Activity id: ${activityId}, error: ${JSON.stringify(err)}`, 'error', NAME);
                        }

                        return reject(err);
                    }
                    if (!context) {
                        return reject( new Error( 'No extended activity object' ) );
                    }

                    context.addDocumentData = true;
                    Y.dcforms.mapper.genericUtils.getFormDataIncase(context, onReportingFieldsGenerated);
                }

                function onReportingFieldsGenerated(err, allReportingFields ) {
                    if (err) {
                        Y.log(`Failed to get form data incase. Error: ${JSON.stringify(err)}`, 'error', NAME);
                        return reject(err);
                    }

                    reportFields = allReportingFields;

                    rCache.loadOrGet( self.su, self.ACTIVITY_MODEL_NAME, activityId, onCacheGetActivity );
                }

                function onCacheGetActivity( err, activity ) {
                    let labdataReports, meddataReports, documentReports;

                    if (err) {
                        //  should not happen except in very unlikely case of activity being deleted while mappers run
                        Y.log(`Failed to get activity to generate reporting. Error: ${JSON.stringify(err)}`, 'error', NAME);
                        return reject(err);
                    }

                    //  additional reporting entries for any labdata this activity may have
                    //  NOTE: this only handles a subset of LDT2, should be improved
                    if ( activity && activity.actType && 'LABDATA' === activity.actType ) {
                        labdataReports = self.getReportsForLabData( activity, reportFields );
                        labdataReports.forEach( ldReport => {
                            ldReport = removeClutter( ldReport );
                            self.writeReportingBatch.push( {
                                entityName: 'LABDATA',
                                entryId: activityId,
                                reportingFields: ldReport
                            } );
                        } );
                    }

                    //  additional reporting entries for MEDDATA this activity may have
                    if( activity && activity.actType && 'MEDDATA' === activity.actType ) {
                        meddataReports = self.getReportsForMedData( activity, reportFields );
                        meddataReports.forEach( mdReport => {
                            mdReport = removeClutter( mdReport );
                            self.writeReportingBatch.push( {
                                entityName: 'MEDDATA',
                                entryId: activityId,
                                reportingFields: mdReport
                            } );
                        } );
                    }

                    //  additional reporting entries for INGREDIENTPLAN this activity may have
                    if( activity && activity.actType && 'INGREDIENTPLAN' === activity.actType ) {
                        meddataReports = self.getReportsForIngredientPlanData( activity, reportFields );
                        meddataReports.forEach( mdReport => {
                            mdReport = removeClutter( mdReport );
                            self.writeReportingBatch.push( {
                                entityName: 'MEDDATA',
                                entryId: activityId,
                                reportingFields: mdReport
                            } );
                        } );
                    }

                    //  additional reporting entries for any document this activity may have
                    if ( activity && activity.attachments && activity.attachments.length > 0 ) {
                        documentReports = self.getReportsForDocuments( reportFields );
                        documentReports.forEach( docReport => {
                            docReport = removeClutter( docReport );
                            self.writeReportingBatch.push( {
                                entityName: 'DOCUMENT',
                                entryId: activityId,
                                reportingFields: docReport
                            } );
                        } );
                    }

                    let endTime = ( new Date()).getTime();
                    self.timingMappers = self.timingMappers + ( endTime - startTime );

                    resolve(reportFields);
                }
            }

            //  remove the ip, document and insight2UserFields properties, they're messy and not used
            function removeClutter( report ) {
                if ( report.ip ) {
                    delete report.ip;
                }
                if ( report.ingredientplanMedDataTable ) {
                    delete report.ingredientplanMedDataTable;
                }
                if ( report.medDataTable ) {
                    delete report.medDataTable;
                }
                if ( report.documents ) {
                    delete report.documents;
                }
                if ( report.insight2UserFields ) {
                    delete report.insight2UserFields;
                }
                return report;
            }

            return new Promise( generateActivityReporting );
        }

        /**
         *  Create an additional reporting entry for each LDT2 labdata entry
         *  @param activity
         *  @return {any[]}
         */

        getReportsForLabData( activity, reportFields ) {
            //  in case of broken labdata activites
            if ( !reportFields || !reportFields.labData ) { return []; }

            //  check for null / undefined entries
            reportFields.labData = reportFields.labData.filter( labData => { return ( labData && 'object' === typeof labData ); } );

            return reportFields.labData.map( labData => {
                let
                    report = Object.assign( {}, reportFields );
                delete report.labData;
                delete report._id;
                Object.keys( labData ).forEach( function( key ) {
                    report[ key ] = labData[ key ];
                } );
                report.entityName = 'LABDATA';
                return report;
            } );
        }

        /**
         *  Create an additional reporting entry for each MedData entry
         *  @param {object} activity
         *  @param {object} reportFields
         *  @param {object} reportFields.medDataTable
         *  @return {any[]}
         */
        getReportsForMedData( activity, reportFields ) {
            //  in case of broken MedData activites
            if ( !reportFields || !reportFields.medDataTable ) {
                return [];
            }

            //  check for null / undefined entries
            reportFields.medDataTable = reportFields.medDataTable.filter( medData => { return ( medData && 'object' === typeof medData ); } );

            return reportFields.medDataTable.map( medData => {
                let
                    report = Object.assign( {}, reportFields );
                delete report.mdt;
                delete report._id;
                Object.keys( medData ).forEach( function( key ) {
                    if ( 'type' !== key ) {
                        report[ key ] = medData[ key ];
                    }
                } );
                report.entityName = 'MEDDATA';
                report.medDataType = medData.type;   //  'type' is not a good field name for reporting
                return report;
            } );
        }

        /**
         *  Create an additional reporting entry for each IngredientPlan entry
         *  @param {object} activity
         *  @param {object} reportFields
         *  @param {object} reportFields.ingredientplanMedDataTable
         *  @return {any[]}
         */
        getReportsForIngredientPlanData( activity, reportFields ) {
            //  in case of broken ingredient plan activites
            if ( !reportFields || !reportFields.ingredientplanMedDataTable ) { return []; }

            //  check for null / undefined entries
            reportFields.ingredientplanMedDataTable = reportFields.ingredientplanMedDataTable.filter( medData => { return ( medData && 'object' === typeof medData ); } );

            return reportFields.ingredientplanMedDataTable.map( medData => {
                let
                    report = Object.assign( {}, reportFields );
                delete report.ip;
                delete report._id;
                Object.keys( medData ).forEach( function( key ) {
                    if ( 'type' !== key ) {
                        report[ key ] = medData[ key ];
                    }
                } );
                report.entityName = 'MEDDATA';
                report.ingredientName = medData.type;   //  'type' is not a good field name for reporting
                return report;
            } );
        }

        /**
         *  Create an additional reporting entry for each document belonging to this activity
         *
         *  See 'addInsight2DocumentsData' mapper for source of these
         *
         *  @param activity
         *  @return {any[]}
         */

        getReportsForDocuments( reportFields ) {
            let
                _data = Object.assign( {}, reportFields ),
                documents = _data.documents;

            delete _data.documents;
            delete _data._id;

            return documents.map( document => {
                let
                    report = Object.assign( {}, _data );
                Object.keys( document ).forEach( key => {
                    report[ key ] = document[ key ];
                } );
                Object.keys( report ).forEach( key => {
                        if( !report[ key ] ) {
                            delete report[ key ];
                        }
                    }
                );
                report.entityName = 'DOCUMENT';
                return report;
            } );
        }

        /**
         *  Create a reporting entry for a schedule / calendar entry given item from toGenerate
         *  @param item
         *  @return {Promise}
         */

        async generateForSchedule( item ) {
            const self = this;

            function generateScheduleReporting( resolve, reject ) {
                //  TODO: move this to mapping helper
                let scheduleId = item.entryId;
                Y.doccirrus.forms.mappinghelper.createScheduleMapperContext( self.su, scheduleId, onScheduleContextCreated );

                function onScheduleContextCreated( error, context ) {
                    if( error ) {
                        Y.log( `Failed to expand schedule. Schedule id: ${scheduleId}, error: ${JSON.stringify( error )}`, 'error', NAME );
                        reject( error );
                        return;
                    }
                    if( !context ) {
                        reject( new Error( 'No extended scheduleId object' ) );
                    } else {
                        Y.dcforms.mapper.genericUtils.getFormDataSchedule( context, ( err, done ) => {
                            if( err ) {
                                Y.log( `Failed to get form schedule data. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                return reject( err );
                            }
                            resolve( done );
                        } );
                    }
                }
            }

            return new Promise( generateScheduleReporting );
        }

        /**
         *  Create a reporting entry for a task given item from toGenerate
         *  @param item
         *  @return {Promise}
         */

        async generateForTask( item ) {
            const self = this;

            function generateTaskReporting( resolve, reject ) {
                //  TODO: move to the mapping helper
                let taskId = item.entryId;
                Y.doccirrus.api.task.createTaskMapperContext( self.su, taskId, onTaskContextCreated );

                function onTaskContextCreated( error, context ) {
                    if( error ) {
                        Y.log( `Failed to expand task. Task id: ${taskId}, error: ${JSON.stringify( error )}`, 'error', NAME );
                        reject( error );
                        return;
                    }

                    if( !context ) {
                        reject( new Error( 'No extended activity object' ) );
                        return;
                    }

                    Y.dcforms.mapper.genericUtils.getFormDataTask( context, ( err, done ) => {
                        if( err ) {
                            Y.log( `Failed to get form data incase. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            return reject( err );
                        }
                        resolve( done );
                    } );
                }
            }

            return new Promise( generateTaskReporting );
        }


        /**
         *  Write recently generated reporting entries to database and clear queues/syncreportings
         *
         *  Assumes self.writeReportingBatch has been populated
         *
         *  Overall process:
         *
         *      (1) Delete any existing syncreportings
         *      (2) Delete any existing reportings for items to be added
         *      (3) Save/insert the generated reporting entries
         *      (4) Completed this batch, clear it and return
         *
         *  @return {Promise<void>}
         */

        async saveWriteBatch() {
            const self = this;

            let
                err, result,
                syncReportingIds = [],
                syncReportingModel,
                delQuery,
                items = [],
                item,
                i;

            if ( self.sempahore > 0 ) {
                Y.log( `Batch processing is called ${self.sempahore} times concurrently: ${new Error().stack}`, 'error', NAME );
            }

            self.sempahore++;

            //  (1) Delete any existing syncreportings

            [ err, syncReportingModel ] = await formatPromiseResult( self.getMongooseModel( 'syncreporting' ) );

            if ( err ) {
                Y.log( `Could not create syncreporting model: ${err.stack||err}`, 'error', NAME );
                self.semaphore--;
                return;
            }

            for ( i = 0; i < self.writeReportingBatch.length; i++ ) {

                if ( self.writeReportingBatch[i]._id ) {
                    syncReportingIds.push( self.writeReportingBatch[i]._id );
                    //console.log( '(****) queue deletion fo syncreporting: ', self.writeReportingBatch[i]._id  );
                }

                //  if we have a full batch to delete
                if ( syncReportingIds.length >= DELETE_BATCH_LIMIT ) {

                    delQuery = { '_id': { $in: syncReportingIds } };
                    [ err ] = await formatPromiseResult( syncReportingModel.mongoose.deleteMany( delQuery ).exec() );

                    if ( err ) {
                        Y.log( `Problem deleting existing syncreportings ${err.stack||err}`, 'error', NAME );
                        Y.log( `Query which has timed out: ${JSON.stringify(delQuery)}`, 'error', NAME );
                        //  should not happen, continue generating reportings, best effort
                    }

                    syncReportingIds = [];
                }

            }

            //  delete any left over
            if ( syncReportingIds.length > 0 ) {

                delQuery = { '_id': { $in: syncReportingIds } };
                [ err ] = await formatPromiseResult( syncReportingModel.mongoose.deleteMany( delQuery ).exec() );

                if ( err ) {
                    Y.log( `Problem deleting existing syncreportings ${err.stack||err}`, 'error', NAME );
                    Y.log( `Query which has timed out: ${JSON.stringify(delQuery)}`, 'error', NAME );
                    //  should not happen, continue generating reportings, best effort
                }

            }

            //  (2) Delete any existing reportings for items to be added

            delQuery = [];
            for ( i = 0; i < self.writeReportingBatch.length; i++ ) {
                //  delete any existing syncreporting entries
                let addQuery = Y.doccirrus.insight2.utils.getReportingQuery( self.writeReportingBatch[i] );
                if ( addQuery ) {
                    delQuery.push( addQuery );
                }

                if ( delQuery.length >= DELETE_BATCH_LIMIT ) {
                    //  deleteMany returns a query, must be executed to get a promise
                    [err, result] = await formatPromiseResult(
                        new Promise( ( resolve, reject ) => { // eslint-disable-line no-loop-func
                            Y.doccirrus.api.reporting.reportingDBaction( {
                                mongoose: true,
                                user: this.su,
                                action: 'deleteMany',
                                query: {'$or': delQuery},
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
                        Y.log( `Cannot delete existing reporting item: ${err.stack||err}`, 'error', NAME );
                        Y.log( `Query which has timed out: ${JSON.stringify(delQuery)}`, 'error', NAME );
                        self.semaphore--;
                        return;
                    }

                    delQuery = [];
                }

            }

            //  delete any left over
            if ( delQuery.length > 0 ) {
                //  deleteMany returns a query, must be executed to get a promise
                [err, result] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.reporting.reportingDBaction( {
                            mongoose: true,
                            user: this.su,
                            action: 'deleteMany',
                            query: {'$or': delQuery},
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
                    Y.log( `Cannot delete existing reporting item: ${err.stack||err}`, 'error', NAME );
                    Y.log( `Query which has timed out: ${JSON.stringify(delQuery)}`, 'error', NAME );
                    self.semaphore--;
                    return;
                }
            }

            //  (3) Save/insert the generated reporting entries

            if ( err ) {
                Y.log( `Could not create mongoose model for reporting: ${err.stack||err}`, 'error', NAME );
                self.semaphore--;
                return;
            }

            for ( i = 0; i < self.writeReportingBatch.length; i++ ) {
                item = self.writeReportingBatch[i];
                item.reportingFields._id = objectId();
                //console.log( '(xxxx) created ' + self.writeReportingBatch[i].entityName + ' document with objectId: ',  self.writeReportingBatch[i].reportingFields._id );
                items.push( item.reportingFields );
            }

            if ( items.length > 0 ) {
                //  no need for exec since insertMany returns a promise
                [err, result] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.reporting.reportingDBaction( {
                            mongoose: true,
                            user: this.su,
                            action: 'insertMany',
                            data: items,
                            callback: ( err, result ) => {
                                if( err ) {
                                    reject( err );
                                }
                                resolve( result );
                            }
                        } );
                    } )
                );

                self.lastSave = ( new Date() ).getTime();

                if ( err ) {
                    Y.log( `Could not insert items into reporting: ${err.stack||err}`, 'error', NAME );
                    self.semaphore--;
                    return;
                }
            }

            //  (4) Completed this batch, clear it and return
            for ( i = 0; i < self.writeReportingBatch.length; i++ ) {
                delete self.writeReportingBatch[i].reportingFields._id;
            }

            //console.log( '(****) clearing writereporting batch' );
            self.writeReportingBatch = [];
            self.semaphore--;
            return result;
        }

        async getMongooseModel( modelName ) {
            const self = this;
            return Y.doccirrus.api.reporting.getModel( self.su, modelName );
        }

        /**
         *  Delete an item from reporting, syncreporting and any batches in progress
         *
         *  This action will be typically repeated after one minute in case of any timing/concurrency issues
         *  or IPC problems.
         *
         *  @param  {String}    entityName
         *  @param  {String}    entryId
         */

        async removeItem( entityName, entryId ) {
            const self = this;
            let
                err,
                newWriteBatch = [];

            //  (1) Immediately remove from any list of items waiting to be generated when load allows

            self.toGenerate.delete( entityName + '-' + entryId );

            //  (2) Immediately remove from any batch in progress /waiting to be saved

            self.writeReportingBatch.forEach( function( item ) {
                if ( ( item.entryId === entryId ) && ( item.entityName === entityName ) ) {
                    Y.log( `Removing reporting from batch in progress: ${entityName} ${entryId}`, 'debug', NAME );
                } else {
                    newWriteBatch.push( item );
                }
            } );

            self.writeReportingBatch = newWriteBatch;

            //  (3) Delete any references to this item from the syncreporting collection

            let
                deleteSyncQuery = {
                    'entityName': entityName,
                    'entryId': entryId
                },
                deleteSyncRequest = {
                    'user': self.su,
                    'model': 'syncreporting',
                    'query': deleteSyncQuery,
                    'action': 'delete',
                    'options': { multiple: true, override: true, noAudit: true, fast: true }
                };

            [ err ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( deleteSyncRequest ) );

            if ( err ) {
                Y.log( `Problem removing syncreportings: ${err.stack||err}`, 'error', NAME );
                //  should never happen, continue anyway
            }

            //  (4) Delete any reportings for this item, any any which immediately depend on it
            //  In case of deleted activity, we will also need to clean up any labdata and documents

            let
                deleteReportingQuery = Y.doccirrus.insight2.utils.getReportingQuery( {
                    'entityName': entityName,
                    'entryId': entryId
                } ),
                deleteReportingRequest = {
                    'user': self.su,
                    'query': deleteReportingQuery,
                    'action': 'delete',
                    'options': { 'multi': true, 'override': true }
                };

            if ( 'ACTIVITY' === entityName ) {
                deleteReportingQuery.entityName = { '$nin': [ 'TASK', 'SCHEDULE' ] };
            }

            [err] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.reporting.reportingDBaction( {
                        ...deleteReportingRequest,
                        callback: ( err ) => {
                            if( err ) {
                                reject( err );
                            }
                            resolve();
                        }
                    } );
                } )
            );

            if ( err ) {
                //  should never happen
                Y.log( `Problem deleting reportings: ${err.stack||err}`, 'error', NAME );
            }

            return true;
        }

        /**
         *  If a reporting entry fails to generate, add a notice to the server log (and audit log?) and clear the
         *  syncreporting item from the queue
         *
         *  This should be uncommon.
         *
         *  @param  {Object}    item
         *  @param  {String}    item.entityName
         *  @param  {String}    item.entryId
         *  @param  {Object}    reportingError
         *  @param  {Number}    [reportingError.code]
         */

        async recordFailed( item, reportingError ) {
            const self = this;
            let
                err, result,

                syncReportingModel,
                deleteQuery = {
                    'entityName': item.entityName,
                    'entryId': item.entryId
                },

                auditText,
                auditRecord,
                auditRequest;

            Y.log( `Sync reporting task failed, reporting could not be generated, discarding: ${item.entityName} ${item.entryId}`, 'warn', NAME );

            //  (1) Sanity checks

            if ( !item.entityName || !item.entryId ) {
                Y.log( `Additional error was encountered when trying to clear invalid syncreporting after failure: ${item.entityName} ${item.entryId}`, 'error', NAME );
                return;
            }

            //  (2) Delete the syncreporting so that failure does not get stuck in the queue

            [ err, syncReportingModel ] = await formatPromiseResult( self.getMongooseModel( 'syncreporting' ) );

            [err, result ] = await formatPromiseResult( syncReportingModel.mongoose.find( deleteQuery ).remove().exec() );

            if ( err ) {
                Y.log( `Additional error was encountered when trying to clear syncreporting after failure: ${err.stack||err}`, 'error', NAME );
                return;
            }

            if ( reportingError && reportingError.code && 404 === reportingError.code ) {
                Y.log( `Cleaned syncreporting for missing object, not adding to audit log.`, 'warn', NAME );
                return;
            }

            //  (3) Notify administrator of the error via the audit log
            auditText = `Eintrag konnte nicht erstellt werden: ${item.entityName} ${item.entryId}`;
            auditRecord = Y.doccirrus.api.audit.getBasicEntry( self.su, 'upsert', 'reporting', auditText );
            auditRecord = Y.doccirrus.filters.cleanDbObject( auditRecord );

            auditRequest = {
                'user': self.su,
                'data': auditRecord
            };

            [ err, result ] = await formatPromiseResult( Y.doccirrus.api.audit.post( auditRequest ) );

            if ( err ) {
                Y.log( `Additional error was encountered when trying to record syncreporting failure in audit log: ${err.stack||err}`, 'error', NAME );
                return;
            }

            Y.log( `Recorded reporting failure in audit log: ${result[0]}`, 'debug', NAME );
        }

    }

    Y.namespace( 'doccirrus.insight2' ).SyncReportingQueue = SyncReportingQueue;

}, '0.0.1', {
    requires: [
        'syncreporting-utils',
        'reporting-regenerate',
        'reporting-cache',
        'dcforms-mappinghelper',
        'audit-api'
    ]
} );