/**
 *  Cache object to speed up regeneration of reportings and forms which share loaded objects with mappers
 *
 *  Note that this is to prevent repeated reloading of objects from database, and should only be used in atomic
 *  operations which do not require invalidation of these objects by outside processes.  Examples include
 *  migrations of reportings (original purpose) and generation of sets of forms for activity sequences.
 *
 *  For rough management of memory, a limited number of the most recent objects of each type will be kept, to prevent
 *  unbounded growth during large operations such as migrations.
 *
 *  To disable caching for an object type set cacheLimit to 0
 *
 *  Entries in the cache record:
 *
 *      _id     {String}    Database _id of some object
 *      hits    {Number}    Number of cache requests for this object since insertion
 *      misses  {Number}    Number of cache requests not for this object since insertion
 *      serial  {String}    Lean object serialized as string
 */

/*global YUI */



YUI.add( 'reporting-cache', function( Y, NAME ) {

    const
        dcCore = require( 'dc-core' ),
        formatPromiseResult = dcCore.utils.formatPromiseResult;

    function createReportingCache() {

        const
            DEFAULT_LIMIT = 10,
            SERIALIZED_SIZE_LIMIT = 10e4; //length of serialized object to string allowed to put into cache

        let
            self = {
                cacheModels: [],
                cacheLimits: {
                    'activity': 120,
                    'mirroractivity': 120,
                    'lastSchein': 120,
                    'fullActivity': 10
                },
                //  used to keep track of performance of this cache
                totalHits: 0,
                totalMisses: 0,
                //  used when batch loading objects
                models: {},
                quiet: false
            };

        /**
         *  Clear the cache
         */

        self.clear = function __cacheClear() {
            self.cacheModels = [];
            return true;
        };

        /**
         *  Check if an object is in the cache
         *
         *  @param  model   {String}
         *  @param  _id     {String}
         */

        self.has = function __cacheHas( model, _id ) {
            var
                found = false,
                cacheSet,
                cacheEntry,
                i;

            if ( !self.cacheModels.hasOwnProperty( model ) ) { return false; }

            cacheSet = self.cacheModels[ model ];

            //  update entries with hit / miss
            for ( i = 0; i < cacheSet.length; i++ ) {
                cacheEntry = cacheSet[i];
                if ( cacheEntry._id === _id ) {
                    cacheEntry.hits = cacheEntry.hits + 1;
                    found = true;
                } else {
                    cacheEntry.misses = cacheEntry.misses + 1;
                }
            }

            if ( found ) {
                self.totalHits = self.totalHits + 1;
            } else {
                self.totalMisses = self.totalMisses + 1;
            }

            // used to track down any invocations of this when disabled
            //console.log( '(****) stack trace follows: ', new Error().stack );       //  jshint ignore:line

            if ( !self.quiet ) {
                Y.log( 'Reporting ' + ( found ? 'CACHE HIT' : 'CACHE MISS' ) + ' for ' + model + '::' + _id + ' (hit ' + self.totalHits + ' miss ' + self.totalMisses + ')', 'debug', NAME );
            }
            return found;
        };

        /**
         *  Given an array of _ids, return a new array of _ids which are NOT in the cache
         *
         *  Used to reduce load queries to objects to exclude items which are already cached
         *
         *  @param      {String}    model
         *  @param      {String}    ids
         *  @returns    {Object}    array of _ids not yet cached
         */

        self.checkMissing = function( model, ids ) {
            let notInCache = [], i;
            for ( i = 0; i < ids.length; i++ ) {
                if ( !self.has( model, ids[i] ) ) {
                    notInCache.push( ids[i] );
                }
            }
            return notInCache;
        };

        /**
         *  Check if an object is in the cache
         *
         *  @param  model   {String}
         *  @param  _id     {String}
         */

        self.get = function __cacheGet( model, _id ) {
            var
                objJson = null,
                cacheSet,
                cacheEntry,
                i;

            if ( !model || !self.cacheModels[model] ) {
                Y.log( `Could not find cache for requested model.`, 'warn', NAME );
                Y.log( `Requested model was: ${ model }`, 'warn', NAME );
                return null;
            }

            cacheSet = self.cacheModels[model];

            for ( i = 0; i < cacheSet.length; i++ ) {
                cacheEntry = cacheSet[i];
                if ( cacheEntry._id === _id ) {
                    try {
                        objJson = JSON.parse( cacheEntry.serial );
                    } catch( parseErr ) {
                        Y.log( `Could not parse JSON: ${parseErr}`, 'debug', NAME );
                    }
                }
            }

            return objJson;
        };

        /**
         *  Remove an item from the cache
         *
         *  @param  model   {String}
         *  @param  _id     {String}
         */

        self.invalidate = function __cacheInvalidate( model, _id ) {
            var
                cacheSet = ( self.cacheModels.hasOwnProperty( model ) ? self.cacheModels[ model ] : [] ),
                newSet = [],
                found = false,
                i;

            for ( i = 0; i < cacheSet.length; i++ ) {
                if ( cacheSet[i]._id !== _id ) {
                    newSet.push( cacheSet[i] );
                } else {
                    found = true;
                }
            }

            self.cacheModels[ model ] = newSet;
            return found;
        };

        /**
         *  Store an object in the cache
         *
         *  @param  model   {String}
         *  @param   _id    {String}
         *  @param  obj     {Object}
         */

        self.store = function __cacheStore( model, _id, obj ) {
            var
                found = false,
                cacheSize = self.getCacheSize( model ),
                cacheSet,
                cacheEntry,
                worstIndex = 0,
                worstScore = 1,
                strJson,
                newEntry,
                i;

            //  do not store if caching is disabled for this object type
            if ( 0 === cacheSize ) {
                return false;
            }

            //  try to serialize this object
            try {
                strJson = JSON.stringify( obj );
            } catch ( jsonErr ) {
                Y.log( 'Could not serialize object: ' + JSON.stringify( jsonErr ), 'warn', NAME );
                return false;
            }

            if( !strJson ){
                Y.log( `Resulted string of serialized object is undefined: ${model}::${_id} ${obj}`, 'warn', NAME );
                return false;
            }

            if( strJson.length > SERIALIZED_SIZE_LIMIT ){
                Y.log( `Resulted string of serialized object us too big: ${model}::${_id} ${strJson.length}`, 'warn', NAME );
                return false;
            }

            //  check if a cache exists for objects of this type, create if not
            if ( !self.cacheModels.hasOwnProperty( model ) ) {
                //Y.log( 'Starting cache for object type: ' + model, 'debug', NAME );
                self.cacheModels[ model ] = [];
            }

            //  check if an older version of this object is already cached
            //  update scores while we do, and update the object if we find it
            cacheSet = self.cacheModels[ model ];
            for ( i = 0; i < cacheSet.length; i++ ) {
                cacheEntry = cacheSet[i];
                if ( cacheEntry._id === _id ) {
                    cacheEntry.serial = strJson;
                    found = true;
                }

                cacheEntry.score = ( cacheEntry.hits / cacheEntry.misses );
                if ( worstScore > cacheEntry.score ) {
                    worstScore = cacheEntry.score;
                    worstIndex = i;
                }
            }

            if ( true === found ) {
                return true;
            }

            //  create new cache entry
            newEntry = {
                '_id': _id,
                'hits': 1,
                'misses': 10,
                'score': 1,
                'serial': strJson
            };

            //  if cache is not yet full we can just add it
            if ( cacheSet.length <= cacheSize ) {
                cacheSet.push( newEntry );
                return true;
            }

            //  cache is full, replace worst performing cache entry
            cacheSet[worstIndex] = newEntry;
            return true;
        };


        /**
         *  Get the number of objects of a given type which the cache can hold
         */

        self.getCacheSize = function __cacheGetSize( model ) {
            if ( self.cacheLimits.hasOwnProperty( model ) ) {
                return self.cacheLimits[ model ];
            }

            return DEFAULT_LIMIT;
        };

        /**
         *  Set the cache size for a given object
         *
         *  Will clear the cache if reducing
         *
         *  @param  {String}    model
         *  @param  {Number}    size
         */

        self.setCacheSize = function __cacheSetSize( model, size ) {
            //  record the new cache size
            self.cacheLimits[ model ] = size;

            //  enforce the new size on existing cache
            var cacheSet = self.cacheModels.hasOwnProperty( model ) ? self.cacheModels[ model ] : [];
            if ( cacheSet.length > size ) {
                Y.log( 'Invalidating reporting cache for ' + model, 'debug', NAME );
                self.cacheModels[ model ] = [];
            }
        };

        /**
         *  Load an object from database into the cache
         *
         *  @param  {Object}    user
         *  @param  {String}    model
         *  @param  {String}    _id
         *  @param  {Function}  callback
         */

        self.load = function __cacheLoad( user, model, _id, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                query: { _id: _id },
                options: { lean: true, quiet: true },
                callback: onObjectLoaded
            } );

            function onObjectLoaded( err, result ) {
                if ( !err && !result[0] ) {
                    err = Y.doccirrus.errors.rest( 404, 'Object not found ' + model + '::' + _id, true );
                }
                if ( err ) {
                    Y.log( 'Error loading object into cache ' + model + '::' + _id + ': ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                if ( !self.quiet ) {
                    Y.log( 'Reporting CACHE LOAD ' + model + '::' + _id, 'debug', NAME );
                }
                self.store( model, _id, result[0] );
                callback( null, result[0] );
            }
        };

        /**
         *  Load an object from database into the cache if not already present
         *
         *  @param  {Object}    user
         *  @param  {String}    model
         *  @param  {String}    _id
         *  @param  {Function}  callback
         */

        self.loadOrGet = function __cacheLoadOrGet( user, model, _id, callback ) {
            if ( self.has( model, _id ) ) {
                return callback( null, self.get( model, _id ) );
            }

            self.load( user, model, _id, callback );
        };

        return self;
    }


    /**
     *  Populate a single activity similarly to activity-api::getActivitiesPopulated, using cache where possible
     *
     *  Overall process:
     *
     *      1.  Load the plain activity
     *      2.  Populate child activities, icds, icdsExtra, continuousIcds
     *      3.  Populate patient
     *      4.  Populate attached documents
     *      5.  Populate employees (DISABLED)
     *      6.  Translate prices
     *
     *
     *  @param  {Object}    user            REST user or equivalent
     *  @param  {String}    activityId      Database _id of activity to load and populate
     *  @param  {Object}    useCache        Instance of reportingCache as above
     *  @param  {Function}  callback        Of the form fn( err, fullActivity )
     *
     */

    function getActivityPopulated( user, activityId, useCache, callback ) {
        const
            async = require( 'async' );

        let
            rCache = ( useCache && useCache.cacheModels ) ? useCache : createReportingCache(),
            activityModelName = Y.doccirrus.auth.isISD() ? 'mirroractivity' : 'activity',
            act;

        async.series(
            [
                getActivity,
                populateActivities,
                //populatePatients,
                populateAttachments,
                populateEmployees,
                translatePrices
            ],
            onAllDone
        );

        //  1.  Load the plain activity
        function getActivity( itcb ) {


            if ( rCache.has( activityModelName, activityId ) ) {
                act = rCache.get( activityModelName, activityId );
                return itcb( null );
            }

            rCache.load( user, activityModelName, activityId, onActivityLoaded );

            function onActivityLoaded( err, activity ) {
                if ( err ) { return itcb( err ); }
                act = activity;
                itcb( null );
            }
        }

        //  2.  Populate child activities, icds, icdsExtra, continuousIcds
        function populateActivities( itcb ) {
            if( !act ){ return itcb( null ); }
            // populate with waterfall to avoid
            // race conditions.
            async.series(
                [
                    function( next ) { doPopulate( 'activities', next ); },
                    function( next ) { doPopulate( 'icds', next ); },
                    function( next ) { doPopulate( 'icdsExtra', next ); },
                    function( next ) { doPopulate( 'continuousIcds', next ); },

                    //  for invoice related activities we also need the referencedBy activities
                    function( next ) {
                        if ( !Y.doccirrus.schemas.activity.isInvoiceCommunicationActType(act.actType) ) {
                            //  only invoice communications use this so far (receipts, warnings, etc)
                            return next();
                        }
                        doPopulate( 'referencedBy', next );
                    }
                ],
                itcb
            );

            function doPopulate( fld, onStepComplete ) {
                let
                    actIds = act && act.hasOwnProperty( fld ) ? act[ fld ] : [],
                    expandedActs = [];

                if ( 0 === actIds.length ) { return onStepComplete(); }
                async.eachSeries( actIds, populateSingleAct, onAllCollected );

                function populateSingleAct( childActId, onSingleComplete ) {
                    if ( rCache.has( activityModelName, childActId ) ) {
                        expandedActs.push( rCache.get( activityModelName, childActId ) );
                        return onSingleComplete( null );
                    }

                    rCache.load( user, activityModelName, childActId, onChildActLoaded );

                    function onChildActLoaded( err ) {
                        if ( err ) {
                            Y.log( 'Could not load child activity ' + childActId + ' into ' + fld + ': ' + JSON.stringify( err ), 'warn', NAME );
                            //  best effort, continue despite error
                        }
                        expandedActs.push( rCache.get( activityModelName, childActId ) );
                        onSingleComplete( null );
                    }
                }

                function onAllCollected( err ) {
                    if ( err ) {
                        Y.log( 'Could not populate activity on: ' + activityId + ' field: ' + fld, 'debug', NAME );
                        //  best effort, continue despite missing linked activity
                    }
                    act[ '_' + fld + 'Obj' ] = expandedActs;
                    return onStepComplete( null );
                }
            }
        }

        //  3.  Populate patient - no longer used by form mappers, superceded by context.patient
        /*
        function populatePatients( itcb ) {
            if ( rCache.has( 'patient', act.patientId ) ) {
                act.patientId = rCache.get( 'patient', act.patientId );
                return itcb( null );
            }

            rCache.load( user, 'patient', act.patientId, onPatientLoaded );

            function onPatientLoaded( err ) {
                if ( err ) { return itcb( err ); }
                act.patientId = rCache.get( 'patient', act.patientId );
                itcb( null );
            }
        } */

        //  4.  Populate attached documents
        function populateAttachments( itcb ) {
            //  currently not used in reporting
            return itcb( null );
        }

        //  5.  Populate employees (DISABLED)
        function populateEmployees( itcb ) {
            return itcb( null );
            //  not used in reporting
            /*
            if ( rCache.has( 'employee', act.employeeId ) ) {
                act.employeeId = rCache.get( 'employee', act.employeeId );
                return itcb( null );
            }

            rCache.load( user, 'employee', act.employeeId, onEmployeeLoaded );

            function onEmployeeLoaded( err ) {
                if ( err ) { return itcb( err ); }
                act.employeeId = rCache.get( 'employee', act.employeeId );
                itcb( null );
            }
            */
        }

        //  6.  Translate prices
        function translatePrices( itcb ) {
            if( !act ){ return itcb( null ); }
            Y.doccirrus.api.activity.translatePrices( [ act ], itcb );
        }

        //  X.  Done
        function onAllDone( err ) {
            if (err) {
                Y.log( 'Could not populate activity for reporting: ' + JSON.stringify( err ), 'warn', NAME );
                return callback( err );
            }
            callback( null, act );
        }
    }


    /**
     *  Pre-warm a reporting cache given a set of syncreporting entries
     *
     *  Load objects in bulk using mongoose to take advantage of batch efficiencies.
     *
     *  @param  {Object}    rCache          A reporting cache
     *  @param  {Object}    syncreportings   An array of syncreporting items
     *  @return {Promise<void>}
     */

    async function preCacheBulk( user, rCache, syncreportings ) {

        const
            activityModelName = Y.doccirrus.auth.isISD() ?  'mirroractivity' : 'activity',
            locationModelName = Y.doccirrus.auth.isISD() ? 'mirrorlocation' : 'location',
            employeeModelName = Y.doccirrus.auth.isISD() ? 'mirroremployee' : 'employee' ,
            patientModelName = Y.doccirrus.auth.isISD() ? 'mirrorpatient' : 'patient',
            caseFolderModelName = Y.doccirrus.auth.isISD() ? 'mirrorcasefolder' : 'casefolder';

        let
            err,
            hits = 0,
            misses = 0,
            stores = 0,
            toLoad = {},
            i;

        //  (1) Seed with syncreporting items

        for ( i = 0; i < syncreportings.length; i++ ) {
            switch( syncreportings[i].entityName ) {
                case 'LABDATA':     //  deliberate fallthrough
                case 'ACTIVITY':    enqueueObj( activityModelName, syncreportings[i].entryId );    break;
                case 'DOCUMENT':    enqueueObj( 'document',  syncreportings[i].entryId );   break;
                case 'TASK':        enqueueObj( 'task', syncreportings[i].entryId );        break;
                case 'SCHEDULE':    enqueueObj( 'schedule', syncreportings[i].entryId );    break;
                default:
                    throw Error( `Unknown entity type: ${syncreportings[i].entityName}` );
            }
        }

        //  (2) Load Load primary objects (enqueues secondary)
        [err] = await formatPromiseResult( loadQueuedObjects() );
        if ( err ) { return err; }

        //  (3) Load secondary objects (eg, locations and employees for activities, etc)
        [err] = await formatPromiseResult( loadQueuedObjects() );
        if ( err ) { return err; }

        //  (3) Load tertiary objects (eg, contacts for patients for activities, etc)
        [err] = await formatPromiseResult( loadQueuedObjects() );
        if ( err ) { return err; }

        //console.log( '(**--**) preCache bulk, hits/misses/stores: ', hits, '/', misses, '/', stores );

        preCacheBulkLastSchein( user, rCache, syncreportings );
        preCacheBulkCatalogUsage( user, rCache, syncreportings );

        return true;

        /**
         *  Helper function to keep track of objects to load
         *
         *  @param  {String}    modelName       Name of a database collection
         *  @param  {String}    id              Database _id of an object
         *  @param  {Array}     path            Array of activity _ids, prevent following circular refs
         */

        function enqueueObj( modelName, id, path ) {
            if ( !id ) {
                Y.log( `Invalid ${modelName} entry added to reporting queue, stack trace follows: ${new Error().stack}`, 'error', NAME );
                return;
            }

            let idStr = id.toString();
            path = path || [];
            //console.log( '(**--**) enqueue obj: ', modelName, idStr, rCache.has( modelName, idStr ) );

            if ( rCache.has( modelName, idStr ) ) {
                //  already present in cache
                hits = hits  + 1;

                if ( 'activity' === modelName ) {
                    if ( -1 !== path.indexOf( idStr ) ) {
                        Y.log( `Circular reference between activities: ${idStr} ${JSON.stringify(path)}`, 'warn', NAME );
                        return;
                    }
                    path.push( idStr );
                }

                //  follow references in case any of its dependent objects need to be loaded
                followReferences( modelName, rCache.get( modelName, idStr ), path );
                return;
            }

            if ( !toLoad.hasOwnProperty( modelName ) ) {
                toLoad[ modelName ] = [];
            }

            if ( -1 !== toLoad[ modelName ].indexOf( idStr ) ) {
                //  already queued in this batch
                return;
            }

            misses = misses + 1;
            toLoad[ modelName ].push( idStr );
        }

        //

        async function getRequiredModels() {
            let newModel, k;
            for ( k in toLoad ) {
                if ( toLoad.hasOwnProperty( k ) && !rCache.models.hasOwnProperty( k ) ) {

                    //  creating mongoose model
                    [err, newModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, k ) );

                    if ( err ) {
                        Y.log( `Could not instantiate mongoose model ${k}: ${err.stack||err}`, 'error', NAME );
                        throw err;
                    }

                    rCache.models[ k ] = newModel;
                }
            }
            return true;
        }

        /**
         *  @return {Promise<void>}
         */

        async function loadQueuedObjects() {
            let
                cachedModel, findQuery,
                err, result,
                i, k;

            //  instantiate any mongoose models needed to do this, if not already cached
            [err] = await formatPromiseResult( getRequiredModels() );
            if ( err ) { throw err; }

            for ( k in toLoad ) {
                if ( toLoad.hasOwnProperty( k ) ) {

                    cachedModel = rCache.models[k];
                    findQuery = { '_id': { '$in': toLoad[k] } };

                    [ err, result ] = await formatPromiseResult( cachedModel.mongoose.find( findQuery ).lean().exec() );

                    if ( err ) { return err; }

                    for ( i = 0; i < result.length; i++ ) {
                        rCache.store( k, result[i]._id.toString(), result[i] );
                        stores = stores + 1;
                    }

                    //  clear the objects we have loaded from the queue
                    toLoad[k] = [];

                    //  also enqueue dependencies of the objects we have loaded which will be needed by form mappers
                    for ( i = 0; i < result.length; i++ ) {
                        followReferences( k, result[i] );
                    }
                }
            }

            return true;
        }

        function followReferences( modelName, obj, path ) {
            let i;
            path = path || [];
            switch( modelName ) {
                case 'mirroractivity':
                case 'activity':
                    //  basic context
                    if ( obj.patientId ) { enqueueObj( patientModelName, obj.patientId ); }
                    if ( obj.employeeId ) { enqueueObj( employeeModelName, obj.employeeId ); }
                    if ( obj.locationId ) { enqueueObj( locationModelName, obj.locationId ); }
                    if ( obj.patientId ) { enqueueObj( patientModelName, obj.patientId ); }
                    if ( obj.caseFolderId ) { enqueueObj( caseFolderModelName, obj.caseFolderId ); }

                    //  attached documents
                    if ( obj.attachments && obj.attachments.length ) {
                        for ( i = 0; i < obj.attachments.length; i++ ) {
                            enqueueObj( 'document', obj.attachments[i] );
                        }
                    }

                    //  linked activities
                    if ( obj.activities && obj.activities.length ) {
                        for ( i = 0; i < obj.activities.length; i++ ) {
                            enqueueObj( activityModelName, obj.activities[i], path );
                        }
                    }

                    if ( obj.icds && obj.icds.length ) {
                        for ( i = 0; i < obj.icds.length; i++ ) {
                            enqueueObj( activityModelName, obj.icds[i], path );
                        }
                    }

                    if ( obj.icdsExtra && obj.icdsExtra.length ) {
                        for ( i = 0; i < obj.icdsExtra.length; i++ ) {
                            enqueueObj( activityModelName, obj.icdsExtra[i], path );
                        }
                    }

                    if ( obj.continuousIcds && obj.continuousIcds.length ) {
                        for ( i = 0; i < obj.continuousIcds.length; i++ ) {
                            enqueueObj( activityModelName, obj.continuousIcds[i], path );
                        }
                    }
                    break;

                case 'mirrorpatient':
                case 'patient':

                    //  MOJ-10799 Allow default mapping helper to load contacts - will expand specialization text
                    //  To be returned to batch operation when possible, perhapss filling expertiseText in a pre-process
                    //  when saving basecontacts, to be discussed

                    /*
                    if ( obj.familyDoctor ) { enqueueObj( 'basecontact', obj.familyDoctor ); }

                    if ( obj.physicians && obj.physicians.length ) {
                        for ( i = 0; i < obj.physicians.length; i++ ) {
                            enqueueObj( 'basecontact', obj.physicians[i] );
                        }
                    }

                    if ( obj.additionalContacts && obj.additionalContacts.length ) {
                        for ( i = 0; i < obj.additionalContacts.length; i++ ) {
                            enqueueObj( 'basecontact', obj.additionalContacts[i] );
                        }
                    }
                    */

                    if ( obj.employees && obj.employees.length  ) {
                        for ( i = 0; i < obj.employees.length; i++ ) {
                            if ( obj.employees[i] ) {
                                //  note that null entries are sometimes found in this array
                                enqueueObj( employeeModelName, obj.employees[i] );
                            }
                        }
                    }

                    break;
            }
        }

    }

    /**
     *  Temporary helper to pre-warm the cache, in future the lastSchein should already be cached
     *
     *  @param user
     *  @param rCache
     *  @param syncReportings
     *  @return {Promise<void>}
     */

    async function preCacheBulkLastSchein( user, rCache, syncreportings ) {
        const
            activityModelName = Y.doccirrus.auth.isISD() ? 'mirroractivity' : 'activity';

        let
            err, result, activityModel,
            item,
            activity,
            query,
            cacheKey,
            i;

        [err, activityModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, activityModelName ) );

        let startTime = ( new Date() ).getTime();
        let countScheine = 0;

        for ( i = 0; i < syncreportings.length; i++ ) {
            item = syncreportings[i];

            if ( 'ACTIVITY' === item.entityName && rCache.has( activityModelName, item.entryId ) ) {

                activity = rCache.get( activityModelName, item.entryId );

                //  At present only invoices, treatments and diagnoses need lastSchein - MOJ-9048, EXTMOJ-2066, KUN-204
                if ( Y.doccirrus.schemas.activity.generatesLastScheinContext( activity.actType ) ) {

                    countScheine = countScheine + 1;

                    query = {
                        actType: { $in: Y.doccirrus.schemas.v_contract.scheinActTypes },
                        caseFolderId: activity.caseFolderId,
                        patientId: activity.patientId,
                        locationId: activity.locationId,
                        timestamp: {
                            $lte: new Date( activity.timestamp )
                        },
                        status: {$ne: 'CANCELLED'}
                    };

                    cacheKey = '' +
                        activity.patientId + '_' +
                        activity.timestamp + '_' +
                        activity.locationId + '_' +
                        activity.caseFolderId;

                    [err, result ] = await formatPromiseResult(
                        activityModel.mongoose.find( query ).sort( { timestamp: -1  } ).limit( 1 ).lean().exec()
                    );

                    if ( err ) {
                        Y.log( `Error while finding schein for invoice: ${err.stack||err}`, 'error', NAME );
                    } else {

                        if ( result && result[0] ) {
                            rCache.store( 'lastSchein', cacheKey, result[0] );
                        } else {
                            Y.log( `Could not find last schein for activity: ${activity._id}`, 'warn', NAME );
                        }
                    }

                }

            }
        }

        let endTime = ( new Date() ).getTime();

        Y.log( `Pre-cached ${countScheine} scheine in: ${( endTime - startTime )}`, 'debug', NAME );

        return true;
    }

    /**
     *  Temporary helper to pre-warm the cache, in future catalogUsage should be referenced directly should already be cached
     *
     *  @param user
     *  @param rCache
     *  @param syncReportings
     *  @return {Promise<void>}
     */

    async function preCacheBulkCatalogUsage( user, rCache, syncreportings ) {
        const
            activityModelName = Y.doccirrus.auth.isISD() ? 'mirroractivity' : 'activity';

        let
            err, result, catalogUsageModel,
            item,
            activity,
            query,
            cacheKey,
            i;

        [err, catalogUsageModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, 'catalogusage' ) );

        let startTime = ( new Date() ).getTime();
        let countCatUsage = 0;

        for ( i = 0; i < syncreportings.length; i++ ) {
            item = syncreportings[i];

            if ( 'ACTIVITY' === item.entityName && rCache.has( activityModelName, item.entryId ) ) {

                activity = rCache.get( activityModelName, item.entryId );
                cacheKey = activity._id + '_lastCatalogUsage';

                //  only done if this activity has a code or short code to look up
                if ( activity.code || activity.catalogShort ) {

                    countCatUsage = countCatUsage + 1;
                    query = Y.doccirrus.api.catalogusage.getQueryForActivity( activity );


                    [err, result ] = await formatPromiseResult(
                        catalogUsageModel.mongoose.find( query ).limit( 1 ).lean().exec()
                    );

                    if ( err ) {
                        Y.log( `Error while finding catalog usage for activity: ${err.stack||err}`, 'error', NAME );
                    } else {

                        if ( result && result[0] ) {
                            rCache.store( 'actcatusage', cacheKey, result[0] );
                        } else {
                            Y.log( `Could not find catalog usage for activity: ${activity._id}`, 'debug', NAME );
                        }
                    }

                }

            }
        }

        //16:31:46:119 1: debug: (dc-core/model): GET activity  {"actType":{"$in":["SCHEIN","PKVSCHEIN","SZSCHEIN","BGSCHEIN"]},"caseFolderId":"5708d2418cc453a42daf22e4","patientId":"5708d2228cc453a42daf22a7","timestamp":{"$lte":"2016-04-09T09:59:06.762Z"},"status":{"$ne":"CANCELLED"}}   {"sort":{"timestamp":-1},"limit":1,"lean":true}

        let endTime = ( new Date() ).getTime();

        Y.log( `Pre-cached ${countCatUsage} catalog usages in: ${( endTime - startTime )}`, 'debug', NAME );

        return true;
    }

    /**
     * @namespace doccirrus.api
     */

    Y.namespace( 'doccirrus.insight2' ).reportingCache = {
        'createReportingCache': createReportingCache,
        'getActivityPopulated': getActivityPopulated,
        'preCacheBulk': preCacheBulk
    };

}, '0.0.1', {
    requires: [
        'dcforms-schema-InCase-T',
        'reporting-schema',
        'AnalysisGen',
        'analysisUtils',
        'v_contract-schema'
    ]
} );