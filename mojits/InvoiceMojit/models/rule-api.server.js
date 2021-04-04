/**
 * User: do
 * Date: 23/11/15  11:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'rule-api', function( Y, NAME ) {

        /**
         * DC Rule API
         *
         * Overview
         * *********
         *
         * Utilizes the dc rule engine and defines the reference areas and facts that can be triggered.
         * A valid trigger will execute the rule engine and will process the results.
         *
         * Reference Areas
         * ****************
         *
         * - General
         *      Params:
         *      * caseFolderId
         *      * patientId
         *
         *      (this is maybe more related to "execute method" documentation)
         *      * bypassResults
         *        Results will not be saved to rule logs if set to true.
         *      * callback
         *        will be called after exection if defined
         *
         *
         *      Options:
         *      * caseFolderType
         *        Is used to retrieve the matching sub set of rule sets before execution.
         *        Is determined by params.caseFolderId.
         *
         *
         * - ENTRY
         *
         *   All basic data needed to validate rule sets with this reference area must be passed to the trigger.
         *   This means for the fact ACTIVITY you need to pass an activity. If needed sub docs are not yet populated,
         *   patientId, caseFolderId, employeeId and locationId will be populated automatically.
         *
         *      Params:
         *      * data
         *        The raw activity data. Referenced sub docs can be pre populated
         *
         *      Options:
         *      * catalogShort
         *        The catalog type / name e.g. EBM, GOÄ, ICD-10 etc.
         *      * actType
         *        Type of the activity
         *      * kv
         *        indicates that kv specific rules are needed (atm only used for EBM)
         *
         *
         *  - APK
         *      Options:
         *      * timestamp
         *        The range of the APK (atm the day) is retrieved by the timestamp( should be the activity that triggered the execution)
         *
         * - QUARTER
         *      Options:
         *      * quarter
         *      * year
         *      * isPreValidation
         *
         * - RANGE
         *      Options:
         *      * from
         *      * to
         *      * isPreValidation
         *
         * - SCHEIN
         *      Options:
         *      * scheinId
         *      * isPreValidation
         *
         *
         *
         * Actions
         * ********
         * Actions are the "result" of a passing rule. At the moment only one action is allowed. This action has a type
         * e.g. ERROR or WARNING. RuleLog entries will be created out of the passed rule and its action.
         *
         * RuleLog
         * ********
         * A RuleLog entry stores the result of a passed rule. It stores information about he rule, patient and casefolder.
         *
         *
         * Import / Export
         * ****************
         *
         * - upload / download rule sets
         *
         * - one rule set has its own reference area and contains all rules that can be validated
         * - atm one json contains rule set contains
         * - each rule has an array of validation when all validations are passed
         *   one (or maybe more in the future) action is must be 'executed' (atm only saved to rule logs)
         *
         * - how to handle rule set groups?
         *      * zip files or json contains rulesets....
         *
         * Future
         * *******
         *
         * - allow regex in $in tests/queries
         *
         * - validate imported rules (maybe json schema validator?)
         *
         *
         */


        const
            _ = require( 'lodash' ),
            Prom = require( 'bluebird' ),
            cluster = require( 'cluster' ),
            util = require('util'),
            ObjectId = require( 'mongoose' ).Types.ObjectId,

            { logEnter, logExit } = require( '../../../server/utils/logWrapping.js' )(Y, NAME),

            addEntries = Y.doccirrus.api.rulelog.addEntries,
            removeEntries = Y.doccirrus.api.rulelog.removeEntries,
            updateCaseFolderStats = Y.doccirrus.api.rulelog.updateCaseFolderStats,
            walkUpFrom = Y.doccirrus.ruleutils.walkUpFrom,
            addTask = Y.doccirrus.cardioutils.addTask,
            addActivity = Y.doccirrus.ruleutils.addActivity;

        const
            ruleengineUtils = require( '../server/ruleengine.utils'),
            async = require( 'async' ),
            { formatPromiseResult, handleResult, promisifyArgsCallback } = require( 'dc-core' ).utils,
            ProcessingStatus = {
                PROCESSING: 'PROCESSING',
                NO_PROCESSING: 'NOTPROCESSING'
            },

            REQUEST_TRIGGER_IPC = 'REQUEST_TRIGGER_IPC',
            REQUEST_REGENERATE_IPC = 'REQUEST_REGENERATE_IPC',
            REQUEST_DROP_CACHE_IPC = 'REQUEST_DROP_CACHE_IPC',

            //  prevent stalling of the queue on error, clear tasks which take more than two minutes to complete
            QUEUE_TIMEOUT = 5 * 60 * 1000,

            //  warn in the log if rules queue has more than this many items, may indicate a problem or memory leak
            WARN_QUEUE_SIZE = 1000;

        let // GLOBALS
            //  queue of ongoing rule operations (requests to trigger rule engine)
            //  set in single file queue to prevent resource exhaustion and performance problems if too many
            //  rule engines run at once, MOJ-11692
            tasksQueue = [],
            currentActiveTask = null,
            context,
            ruleCached = false,
            dbConfig;


        /**
         * @method trigger
         * @public
         *
         * main api method of triggering rule engine, can be used as direct call (e.g. from force rule regeneration flow) and as well
         * from rule queue (hosted in array on reporting worker)
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams params object for typical content please refer activity-process, patient-process etc.
         * @param {Function} args.callback
         *
         * @returns {Function|Promise} callback - returns when processing is finished, result of processing have to be already processed as cations
         */
        async function trigger( args ) {
            const
                timer = logEnter( `trigger` ),
                createAndLinkTarmedTreatments = util.promisify( Y.doccirrus.api.linkedactivities.createAndLinkTarmedTreatments ),
                settings = Y.doccirrus.api.settings.getSettings( args.user );

            Y.log('Entering Y.doccirrus.api.rule.trigger', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rule.trigger');
            }
            const { user, originalParams: params, callback } = args;

            if( !params ) {
                Y.log( 'RuleAPI: could not trigger rule engine without params', 'error', NAME );
                return handleResult( new Error( 'RuleAPI: could not trigger rule engine without params' ), undefined, callback );
            }

            Y.log( 'RuleAPI: trigger fired ' + require( 'util' ).inspect( params ), 'debug', NAME );

            context = {
                ...params,
                threadId: '1',
                staticData: {
                    isISD: Y.doccirrus.auth.isISD(),
                    DQS: Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS,
                    dbConfig,
                    threadId: 1
                },
                dropCache: !ruleCached
            };
            ruleCached = true;
            context.startProcessing = new Date();

            //pre validate set of activity hierarchy rules
            if( context.preValidateActivities && context.type === 'activity' && context.data ){
                let [err, activities] = await formatPromiseResult( createAndLinkTarmedTreatments( user, context.data, true ) );

                if( err ) {
                    Y.log( `trigger: error on collecting hierarchy rules ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, undefined, callback );
                } else {
                    if(!activities) {activities = []; } else {
                        activities = activities.map( act => {
                            act._id = act._id || new ObjectId();
                            return act;
                        } );
                    }

                    context.preparedActivities = activities;
                }

            }

            //single entry point to new rule engine processing unit
            //ruleEngineResult will contain result object with all pending actions and prepared queries for deleting rule logs
            //no actions is done inside rule engine just validating rules against affected activities or entry data
            let [err, ruleEngineResult] = await formatPromiseResult( ruleengineUtils.trigger( context ) );
            if( err ) {
                Y.log( `trigger: error on calling external trigger ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }


            const
                addEntriesP = promisifyArgsCallback( addEntries ),
                removeEntriesP = promisifyArgsCallback( removeEntries ),
                updateCaseFolderStatsP = promisifyArgsCallback( updateCaseFolderStats ),
                addMarkersP = promisifyArgsCallback( Y.doccirrus.api.patient.addMarkers ),
                addActivityP = util.promisify( addActivity ),
                actionsToDo = ruleEngineResult.result || {};

            Y.log( `trigger: ruleengine finish processing in ${new Date() - context.startProcessing}ms with pending ${actionsToDo.entries && actionsToDo.entries.length} rulelogs`, 'info', NAME );

            //next steps perform pending actions

            if( context.preValidateActivities ){

                Y.doccirrus.communication.emitEventForUser( {
                    targetId: params.user.identityId,
                    event: `preEvaluateRule_${context.callId}`,
                    msg: {
                        data: JSON.stringify( actionsToDo.entries.filter( el => el.ruleLogType === 'ERROR').map( el => {
                            return {
                                affectedCodes: ( el.affectedActivities || [] ).reduce( ( acc, el ) => ( [...acc, el.code] ), [] ),
                                message: el.message
                            };
                        }) )
                    }
                } );


                return handleResult( null, actionsToDo.entries, callback );
            }

            //remove existed rule logs before adding new ones
            if( actionsToDo.removeQueries && actionsToDo.removeQueries.length ){
                let
                    removeQuery = {
                        patientId: ruleEngineResult.patientId,
                        caseFolderId: ruleEngineResult.casefolderId,
                        $or: ruleEngineResult.result && ruleEngineResult.result.removeQueries
                    };

                [err] = await formatPromiseResult( removeEntriesP( {
                    user,
                    query: removeQuery
                } ) );
                if( err ) {
                    Y.log( `trigger: error on removing rule log entries ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, undefined, callback );
                }
            }

            //add new items in patient.markers array and refresh UI widget
            if( actionsToDo.patients && actionsToDo.patients.length ) {
                for( let patientData of actionsToDo.patients ){ // eslint-disable-line
                    let patient;
                    [ err, patient ] = await formatPromiseResult( addMarkersP( {
                        user,
                        originalParams: {
                            patient: patientData.patientId,
                            marker: patientData.markers
                        }
                    } ) );
                    if( err ) {
                        Y.log( `trigger: error on adding marker ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    let markerIds = ( patient.markers || [] ).filter( el => /^[0-9a-fA-F]{24}$/.test(el) );
                    if( !markerIds.length ){
                        continue;
                    }
                    let markers;
                    [ err, markers ] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'marker',
                            action: 'get',
                            query: {_id: {$in: markerIds} }
                        } )
                    );
                    if( err ) {
                        Y.log( `trigger: error on getting markers ${markerIds} : ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, undefined, callback );
                    }
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'refreshMarkersGadget',
                        msg: {
                            data: {
                                patient: patientData.patientId,
                                markers
                            }
                        }
                    } );
                }
            }

            //auto create activities
            if( actionsToDo.activitiesAutoCreate && actionsToDo.activitiesAutoCreate.length ) {
                for( let activityData of actionsToDo.activitiesAutoCreate ){// eslint-disable-line
                    [ err ] = await formatPromiseResult( addActivityP( user, activityData ) );
                    if( err ){
                        Y.log( `trigger: error on autocreating activity ${JSON.stringify(activityData)} : ${err.stack || err}`, 'warn', NAME );
                    }
                }
            }

            //create tasks and tasks with form or form without tasks
            if( actionsToDo.tasks && actionsToDo.tasks.length ) {
                actionsToDo.tasks.forEach( ruleData => addTask( user, ruleData ) );
            }

            //post new rule logs of all Error, Warning and Activity types
            if( actionsToDo.entries && actionsToDo.entries.length ) {

                if( settings.noCrossLocationAccess ) {
                    let allowedLocations;
                    [err, allowedLocations] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'get',
                            model: 'employee',
                            query: {_id: user.specifiedBy},
                            options: {select: {locations: 1}}
                        } )
                    );
                    if( err ) {
                        Y.log( `trigger: error on checking allowed locations ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    allowedLocations = (allowedLocations && allowedLocations[0] && allowedLocations[0].locations || []).map( loc => loc._id );

                    actionsToDo.entries = actionsToDo.entries.map( action => {
                        action.strictModeViolated = (action.affectedActivities || []).filter( affected => {
                            return affected.locationId && !allowedLocations.includes( affected.locationId );
                        } ).length;
                        return action;
                    } );
                }

                let addedEntries;
                [err, addedEntries] = await formatPromiseResult( addEntriesP( {
                    user,
                    originalParams: {
                        patientId: ruleEngineResult.patientId,
                        caseFolderId: ruleEngineResult.caseFolderId,
                        entries: ruleEngineResult.result.entries
                    }
                } ) );
                if( err ) {
                    Y.log( `trigger: error on adding rule log entries ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, undefined, callback );
                }

                if( context.silent ){
                    return handleResult( null, undefined, callback );
                }

                //filter out not allowed by strict mode
                addedEntries.entries = (addedEntries.entries || []).filter( entry => !entry.strictModeViolated );

                if( !addedEntries.entries.length ) {
                    return handleResult( null, undefined, callback );
                }

                let casefolders;
                [err, casefolders] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'casefolder',
                        action: 'get',
                        query: {_id: ruleEngineResult.caseFolderId}
                    } )
                );
                if( err ) {
                    Y.log( `trigger: error getting casefolder ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, undefined, callback );
                }

                let resWo = _.omit( addedEntries, ['entries'] ),
                    grouped = _.groupBy( addedEntries.entries, 'message' );

                for( let message of Object.keys( grouped ) ) {// eslint-disable-line
                    let resWth = {...resWo};
                    resWth.entries = grouped[message];
                    resWth.message = message;

                    await Y.doccirrus.communication.emitEventForSession( {
                        sessionId: user.sessionId,
                        event: 'rulelogUpdated',
                        msg: {
                            data: {
                                caseFolderId: addedEntries.caseFolderId,
                                entries: [resWth],
                                caseFolder: casefolders && casefolders[0]
                            }
                        }
                    } );

                }
            }

            //update casefolder stats for (casefolder blue pill)
            [err] = await formatPromiseResult( updateCaseFolderStatsP( {
                user,
                originalParams: ruleEngineResult.hasAll ?
                    {
                        patientId: ruleEngineResult.patientId
                    } :
                    {   patientId: ruleEngineResult.patientId,
                        caseFolderId: ruleEngineResult.caseFolderId
                    }
            } ) );
            if( err ) {
                Y.log( `trigger: error on updating casefolder stats ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }
            Y.log( `trigger: ruleengine finish processing in ${new Date() - context.startProcessing}ms all pending actions`, 'debug', NAME );
            logExit( timer );
            return handleResult( null, undefined, callback );

        }

        function postRuleSets( args ) {
            Y.log('Entering Y.doccirrus.api.rule.postRuleSets', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rule.postRuleSets');
            }

            const
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                user = args.user,
                data = args.data,
                options = args.options || {},
                callback = args.callback,
                isMasterFormTenant = Y.doccirrus.utils.getConfig( 'env.json' ).masterDCFormTenant === user.tenantId;

            function save() {
                return runDb( {
                    user: user,
                    model: 'rule',
                    action: 'post',
                    data: data
                } );
            }

            Y.doccirrus.filters.cleanDbObject( data );

            if( Array.isArray( data ) ) {
                if( options.isImport ) {
                    save()
                        .then( result => callback( null, result ) )
                        .catch( err => callback( err ) );
                } else {
                    // atm only batch insert for import is allowed
                    Y.log( 'could not batch insert rules: batch insert is currently only allowed for imported rule sets', 'error', NAME );
                    return callback( Y.doccirrus.errors.rest( '500' ) );
                }
                return;
            } else if( !data.parent ) {
                Y.log( 'could not post new ruleSet: parent directory not defined', 'error', NAME );
                callback( Y.doccirrus.errors.rest( '24000' ) );
                return;
            }

            runDb( {
                user: user,
                model: 'rule',
                query: {
                    _id: data.parent
                }
            } )
                .then( function( parentResults ) {
                    let parent = parentResults && parentResults[0];

                    if( !parent || !parent.isDirectory ) {
                        throw Y.doccirrus.errors.rest( '24000' );
                    }

                    // allow copy from locked folder
                    if( data.isLocked && !isMasterFormTenant ) {
                        throw Y.doccirrus.errors.rest( '24002' );
                    }
                    //inherit isLocked from parent
                    //data.isLocked = parent.isLocked || false;

                    return save();
                } )
                .then( result => callback( null, result ) )
                .catch( err => callback( err ) );
        }

        function deleteRuleSets( args ) {
            Y.log('Entering Y.doccirrus.api.rule.deleteRuleSets', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rule.deleteRuleSets');
            }
            const
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                user = args.user,
                query = args.query,
                callback = args.callback;

            runDb( {
                user: user,
                model: 'rule',
                query: query,
                action: 'delete',
                options: {
                    override: true
                }
            } )
                .then( result => callback( null, result ) )
                .catch( err => callback( err ) );
        }

        function importFromCatalog( args ) {
            const
                timer = logEnter( 'importFromCatalog' ),
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            Y.doccirrus.ruleimport.fromCatalog( {
                user: user,
                catalogShort: params.catalogShort
            } )
                .then( () => {
                    //callback( null, result )
                    Y.log( 'importFromCatalog: import completed ', 'debug', NAME );
                } )
                .catch( err => {
                    Y.log( 'importFromCatalog: could not import catalog: ' + err && err.stack, 'error', NAME );
                    //callback( err );
                } )
                .finally( () => {
                    Y.log( 'importFromCatalog: import finally ', 'debug', NAME );
                    Y.doccirrus.schemas.sysnum.resetRuleImportLock( args.user, () => {
                    } );
                } );

            logExit( timer );
            callback( null, { status: ProcessingStatus.PROCESSING } );
        }

        function checkDirectoryName( user, parentId, name ) {
            const
                timer = logEnter( 'checkDirectoryName' ),
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );

            return runDb( {
                user: user,
                model: 'rule',
                action: 'count',
                query: {
                    parent: parentId,
                    $or: [
                        { name: name },
                        { description: name }
                    ]
                }
            } ).then( count => {
                logExit( timer );
                if( 0 < count ) {
                    throw Y.doccirrus.errors.rest( '24006' );
                }
            } );
        }

        function createDirectory( args ) {
            Y.log('Entering Y.doccirrus.api.rule.createDirectory', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rule.createDirectory');
            }
            const
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                user = args.user,
                params = args.originalParams,
                callback = args.callback,
                isMasterFormTenant = Y.doccirrus.utils.getConfig( 'env.json' ).masterDCFormTenant === user.tenantId;

            var parentIsLocked = false;

            function isParentDirectory() {
                return runDb( {
                    user: user,
                    model: 'rule',
                    query: {
                        _id: params.parentId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 ).then( result => {
                    if( !result ) {
                        throw Y.doccirrus.errors.rest( '24000' );
                    }
                    if( true !== result.isDirectory ) {
                        throw Y.doccirrus.errors.rest( '24001' );
                    }
                    if( true === result.isLocked && !isMasterFormTenant ) {
                        throw Y.doccirrus.errors.rest( '24002' );
                    }
                    parentIsLocked = result.isLocked;
                } );
            }

            function createDir() {
                return runDb( {
                    user: user,
                    model: 'rule',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( {
                        parent: params.parentId,
                        isDirectory: true,
                        isLocked: parentIsLocked,
                        name: params.directoryName
                    } )
                } );
            }

            function getDir( ids ) {
                var id = ids && ids[0];

                if( !id ) {
                    return;
                }

                return runDb( {
                    user: user,
                    model: 'rule',
                    query: {
                        _id: id
                    }
                } );

            }

            if( !params.parentId ) {
                return callback( Error( 'parentId not specified!' ) );
            }

            if( !params.directoryName ) {
                return callback( Y.doccirrus.errors.rest( '24004' ) );
            }

            isParentDirectory()
                .then( () => checkDirectoryName( user, params.parentId, params.directoryName ) )
                .then( createDir )
                .then( getDir )
                .then( ( results ) => callback( null, results ) )
                .catch( callback );
        }

        function renameRuleSetOrDirectory( args ) {
            Y.log('Entering Y.doccirrus.api.rule.renameRuleSetOrDirectory', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rule.renameRuleSetOrDirectory');
            }
            const
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                user = args.user,
                params = args.originalParams,
                callback = args.callback,
                isMasterFormTenant = Y.doccirrus.utils.getConfig( 'env.json' ).masterDCFormTenant === user.tenantId;

            let doc;

            if( !params.nodeId ) {
                return callback( Y.doccirrus.errors.rest( '24003' ) );
            }

            if( !params.nodeName ) {
                return callback( Y.doccirrus.errors.rest( '24004' ) );
            }

            runDb( {
                user: user,
                model: 'rule',
                query: {
                    _id: params.nodeId
                }
            } ).then( results => {
                doc = results && results[0];

                if( !doc ) {
                    throw Y.doccirrus.errors.rest( '24005' );
                }

                if( doc.isLocked && !isMasterFormTenant ) {
                    throw Y.doccirrus.errors.rest( '24002' );
                }

                if( doc.isDirectory ) {
                    doc.name = params.nodeName;
                } else {
                    doc.description = params.nodeName;
                }

                return checkDirectoryName( user, doc.parentId, params.nodeName );

            } )
                .then( () => {
                    return new Prom( function( resolve, reject ) {
                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'rule',
                            action: 'put',
                            query: {
                                _id: doc._id
                            },
                            fields: Object.keys(doc),
                            data: Y.doccirrus.filters.cleanDbObject(doc)
                        }, function( err, results ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( results );
                        });

                    } );
                } )
                .then( ( results ) => callback( null, results ) )
                .catch( callback );
        }

        function moveRuleSetOrDirectory( args ) {
            Y.log('Entering Y.doccirrus.api.rule.moveRuleSetOrDirectory', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rule.moveRuleSetOrDirectory');
            }
            const
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                user = args.user,
                params = args.originalParams,
                callback = args.callback,
                isMasterFormTenant = Y.doccirrus.utils.getConfig( 'env.json' ).masterDCFormTenant === user.tenantId;

            if( !params.sourceId ) {
                return callback( Y.doccirrus.errors.rest( '24007' ) );
            }

            if( !params.targetId ) {
                return callback( Y.doccirrus.errors.rest( '24007' ) );
            }

            if( params.sourceId === params.targetId ) {
                return callback( Y.doccirrus.errors.rest( '24009' ) );
            }

            let targetRoot;

            walkUpFrom( user, params.targetId, doc => {
                targetRoot = doc;
                return Prom.resolve().then( () => {
                    if( doc.isLocked && !isMasterFormTenant ) {
                        throw Y.doccirrus.errors.rest( '24002' );
                    }

                    if( !doc.isDirectory ) {
                        throw Y.doccirrus.errors.rest( '24007' );
                    }

                    if( doc._id.toString() === params.sourceId ) {
                        throw Y.doccirrus.errors.rest( '24008' );
                    }
                } );
            } ).then( () => {
                let
                    data = {
                        parent: params.targetId,
                        skipcheck_: true
                    },
                    fields = ['parent'],
                    isPractice = targetRoot._id.toString() === Y.doccirrus.schemas.rule.getPracticeDirId();

                if( targetRoot && null === targetRoot.parent && true === targetRoot.isDirectory ){
                    data.isLocked = !(isPractice);
                    fields = ['parent', 'isLocked'];
                }
                return runDb( {
                    user: user,
                    model: 'rule',
                    action: 'put',
                    query: {
                        _id: params.sourceId
                    },
                    data: data,
                    fields: fields
                } );
            } ).then( () => callback( null ) ).catch( err => callback( err ) );
        }

        /**
         * @method activate
         * @public
         *
         * set new state active/not active to exact rule or to descent ruleSet tree. State is set on ruleSet level as well to each rule inside
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams.isActive  - new state that should be set
         * @param {Object} args.originalParams.ruleId    - id of ruleSet or id of folder
         * @param {Function} args.callback
         *
         * @returns {Function} callback - as result actve state to descend tree is set
         */
        function activate( args ) {
            Y.log('Entering Y.doccirrus.api.rule.activate', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rule.activate');
            }

            const
                getMongooseModel = Prom.promisify( Y.doccirrus.mongodb.getModel ),
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),

                { user, originalParams: { isActive, ruleId }, callback } = args;

            if( !ruleId ) {
                return callback( Y.doccirrus.errors.rest( '24005' ) );
            }

            function changeState( ruleSet ) {
                let rules = ruleSet.rules;

                rules.forEach( rule => {
                    rule.isActive = isActive;
                } );

                ruleSet.isActive = isActive;
                return runDb( {
                    user: user,
                    model: 'rule',
                    action: 'put',
                    query: {
                        _id: ruleSet._id
                    },
                    data: {
                        isActive: isActive,
                        rules: rules,
                        skipcheck_: true
                    },
                    fields: ['isActive', 'rules']
                } );
            }

            runDb( {
                user: user,
                model: 'rule',
                query: {
                    _id: ruleId
                },
                options: {
                    lean: true
                }
            } )
                .then( results => {

                    const foundRule = results[0];

                    if( !foundRule ) {
                        throw Y.doccirrus.errors.rest( '24005' );
                    }

                    if( !foundRule.isDirectory ) {
                        return changeState( foundRule );
                    }

                    let
                        ruleIdsToUpdate = {},
                        ruleLogCleanupQuery = {
                            $or: []
                        },
                        ruleToCleanUpCount = 0;

                    return Y.doccirrus.ruleutils.walkDownFrom( user, foundRule._id.toString(), ( rule ) => {
                        let rulesCount = rule.rules && rule.rules.length || 0;
                        if( !ruleIdsToUpdate[rulesCount] ) {
                            ruleIdsToUpdate[rulesCount] = [];
                        }

                        ruleIdsToUpdate[rulesCount].push( rule._id.toString() );

                        rule.rules.forEach( r => {
                            ruleLogCleanupQuery.$or.push( {
                                "referenceArea": rule.referenceArea,
                                "message": r.description,
                                ruleLogType: {
                                    $in: r.actions.map( el => el.type )
                                }
                            } );
                            ruleToCleanUpCount++;
                        } );
                    } )
                        .then( () => getMongooseModel( user, "rule", true ) )
                        .then( ( ruleModel ) => {
                            return new Prom( ( resolve, reject ) => {
                                let rulesCount = Object.keys( ruleIdsToUpdate );
                                async.forEachSeries( rulesCount,
                                    ( cnt, _next ) => {
                                        let ids = ruleIdsToUpdate[cnt],
                                            update = {
                                                $set: {
                                                    "isActive": isActive
                                                }
                                            };
                                        // create set of update statements like:
                                        // rules.0.isActive = {new state},
                                        // rules.1.isActive = {new state}
                                        // in order to set all elements of rules Array

                                        for( let i = 0; i < cnt; i++ ) {
                                            update["rules." + i.toString() + ".isActive"] = isActive;
                                        }
                                        ruleModel.mongoose.update( { _id: { $in: ids } }, update, { multi: true }, _next );
                                    },
                                    ( err ) => {

                                        if( err ) {
                                            Y.log( `Failed to activate/deactivate rules ${err}`, 'error', NAME );
                                            reject( err );
                                        } else {
                                            resolve( ruleModel );
                                        }
                                    }
                                );
                            } );
                        } )
                        .then( () => {
                            if( isActive === false && ruleToCleanUpCount !== 0 ) {
                                Y.doccirrus.ruleutils.cleanRuleLog( user, ruleLogCleanupQuery, ( err ) => {
                                    if( err ) {
                                        Y.log( `Failed to clean rule log after activate/deactivate rules ${err}`, 'error', NAME );
                                    }
                                } );
                            }
                        } )
                        .then( () => {
                            Y.doccirrus.api.rule.dropCacheIPC();
                        } );
                } )
                .then( () => {
                    callback( null );
                } )
                .catch( ( err ) => {
                    Y.log( 'Error on ativation/deactivation rules ' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                } );
        }

        function lock( args ) {
            Y.log('Entering Y.doccirrus.api.rule.lock', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rule.lock');
            }

            const
                getMongooseModel = Prom.promisify( Y.doccirrus.mongodb.getModel ),
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                { user, originalParams, callback } = args,
                { isLocked, ruleId } = originalParams,
                isMasterFormTenant = Y.doccirrus.utils.getConfig( 'env.json' ).masterDCFormTenant === user.tenantId;


            if( !isMasterFormTenant ) {
                return callback( Y.doccirrus.errors.rest( '24002' ) );
            }

            if( !ruleId ) {
                return callback( Y.doccirrus.errors.rest( '24005' ) );
            }

            function changeState( ruleSet ) {
                return runDb( {
                    user: user,
                    model: 'rule',
                    action: 'update',
                    query: {
                        _id: ruleSet._id
                    },
                    data: {
                        $set: {
                            isLocked: isLocked
                        }
                    }
                } );
            }

            runDb( {
                user: user,
                model: 'rule',
                query: {
                    _id: ruleId
                },
                options: {
                    lean: true
                }
            } )
                .then( results => {
                    const foundRule = results[0];

                    if( !foundRule ) {
                        throw Y.doccirrus.errors.rest( '24005' );
                    }

                    if( !foundRule.isDirectory ) {
                        return changeState( foundRule );
                    }

                    let
                        ruleIdsToUpdate = [ foundRule._id.toString() ];

                    return Y.doccirrus.ruleutils.walkDownFrom( user, foundRule._id.toString(), ( rule ) => {
                        ruleIdsToUpdate.push( rule._id.toString() );
                    }, {includeDirectories: true} )
                    .then( () => getMongooseModel( user, "rule", true ) )
                    .then( ( ruleModel ) => {
                        return new Prom( ( resolve, reject ) => {
                            ruleModel.mongoose.update(
                                { _id: { $in: ruleIdsToUpdate } },
                                { $set: { "isLocked": isLocked } },
                                { multi: true },
                                ( err ) => {
                                    if( err ) {
                                        Y.log( `Failed to lock/unlock rules ${err.message}`, 'error', NAME );
                                        reject( err );
                                    } else {
                                        resolve( ruleModel );
                                    }
                                }
                            );
                        } );
                    } );
                } )
                .then( () => {
                    callback( null );
                } )
                .catch( ( err ) => {
                    Y.log( 'Error on locking/unlocking rules ' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                } );
        }

        function deleteDirectory( args ) {
            Y.log('Entering Y.doccirrus.api.rule.deleteDirectory', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rule.deleteDirectory');
            }
            const runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );
            var user = args.user,
                params = args.originalParams,
                callback = args.callback,
                idsToDelete = [params.directoryId];

            function collect( doc ) {
                idsToDelete.push( doc._id.toString() );
            }

            Y.doccirrus.ruleutils.walkDownFrom( args.user, params.directoryId, collect ).then( () => {
                return runDb( {
                    user: user,
                    model: 'rule',
                    query: {
                        _id: { $in: idsToDelete }
                    },
                    action: 'delete',
                    options: {
                        override: true
                    }
                } );
            } ).then( () => args.callback( null ) ).catch( err => callback( err ) );
        }

        function createRuleActivities( args ) {
            Y.log('Entering Y.doccirrus.api.rule.createRuleActivities', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rule.createRuleActivities');
            }
            const { user, originalParams, callback } = args;

            let activitiesToCreate = originalParams && originalParams.activitiesToCreate || [],
                activitiesToProcess = JSON.parse(JSON.stringify(activitiesToCreate)),
                createAll = originalParams && originalParams.createAllActivities;
            if( !createAll ) {
                activitiesToProcess = activitiesToProcess.filter( el => el.selected );
            }
            let ids = [],
                _ids = [];

            async.eachSeries(
                activitiesToProcess,
                (ruleData, next) => {
                    addActivity( user, {...ruleData, manualCreation: true}, (err, id) => {
                        if(!err){
                            ids.push(ruleData.id);
                            if( id && ruleData && ruleData.template && ruleData.template.linkActivities ) {
                                let idsToAdd = id.split(', ');
                                idsToAdd.forEach(el => {
                                    _ids.push(el);
                                });
                            }
                        }
                        next(err);
                    } );
                },
                ( err ) => {
                    if( err ){
                        Y.log( 'Error on creating rule based activities ' + err.message, 'error', NAME );
                    }
                    if( ids.length === activitiesToCreate.length ) {
                        //all processed so we can remove this rule log
                        Y.doccirrus.api.rulelog.removeEntriesAndUpdateCaseFolderStats( args );
                        return;
                    }

                    let activitiesToKeep = activitiesToCreate.filter( el => !ids.includes( el.id ) ).map( el => {
                        delete el.selected;
                        return el;
                    });

                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'rulelog',
                        action: 'put',
                        fields: [ 'activitiesToCreate' ],
                        query: {
                            _id: originalParams._id
                        },
                        data: Y.doccirrus.filters.cleanDbObject( { activitiesToCreate: activitiesToKeep } )
                    }, ( err ) => {
                        if ( err ){
                            Y.log('Error updating rulelog for partially created activities ' + err.message, 'error', NAME);
                        }
                    } );
                   callback( null );
                }
            );
        }
        /**
         *  Filters rules folders by license and countryMode
         *
         *  @param  {String}    tenantId
         *  @param  {Object}    entry
         *  @return {boolean}
         *
         */
        function filterLicensed( tenantId, entry ) {
            const
                DOQUVIDEparent = Y.doccirrus.schemas.rule.getDOQUVIDEDirId(),
                DQSparent = Y.doccirrus.schemas.rule.getDQSDirId(),
                CARDIOparent = Y.doccirrus.schemas.rule.getCARDIODirId(),
                PEDIAparent = Y.doccirrus.schemas.rule.getPEDIADirId(),
                TARMEDparent = Y.doccirrus.schemas.rule.getTarmedId(),
                TARMEDUVGparent = Y.doccirrus.schemas.rule.getTarmedUVGId(),
                TARMEDOthersParent = Y.doccirrus.schemas.rule.getTarmedOthersId(),
                DcSZparent = Y.doccirrus.schemas.rule.getDcSZId(),
                DcPKVparent = Y.doccirrus.schemas.rule.getDcPKVId(),
                EBMparent = Y.doccirrus.schemas.rule.getEBMDirId(),
                DOQUVIDElicense = Y.doccirrus.licmgr.hasSpecialModule( tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ) || false,
                DQSlicense = Y.doccirrus.licmgr.hasSpecialModule( tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DQS ) || false,
                CARDIOlicense = Y.doccirrus.licmgr.hasSpecialModule( tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO ) || false,
                PEDIAlicense = Y.doccirrus.licmgr.hasSpecialModule( tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.PEDIA ) || false,
                isSwitzMode = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() || false,
                isMasterTenant = Y.doccirrus.utils.getConfig( 'env.json' ).masterDCFormTenant === tenantId,
                entryID = entry._id.toString();

            if( (entryID === DOQUVIDEparent && false === DOQUVIDElicense) ||
                (entryID === CARDIOparent && false === CARDIOlicense) ||
                (entryID === DQSparent && false === DQSlicense) ||
                (entryID === PEDIAparent && false === PEDIAlicense) ||
                (entryID === TARMEDparent && false === isSwitzMode && !isMasterTenant) ||
                (entryID === TARMEDUVGparent && false === isSwitzMode && !isMasterTenant) ||
                (entryID === TARMEDOthersParent && false === isSwitzMode && !isMasterTenant) ||
                (entryID === DcSZparent && isSwitzMode && !isMasterTenant) ||
                (entryID === DcPKVparent && isSwitzMode && !isMasterTenant) ||
                (entryID === EBMparent && isSwitzMode && !isMasterTenant)
            ){
                return false;
            }
            return true;
        }

        function setTotalCountDown( all, parentId ) {
            let nodes = all.filter( el => el.parent === parentId );

            if( !nodes.length ){
                return 0;
            }

            let sum = nodes.filter( el => !el.isDirectory ).length;
            if( sum > 0 ){
                return sum;
            }
            nodes.filter( el => el.isDirectory ).forEach( ( nd ) => {
                sum = sum + setTotalCountDown( all, nd._id.toString() );
            } );
            return sum;
        }

        function getFiltered( args ) {
            Y.log('Entering Y.doccirrus.api.rule.getFiltered', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rule.getFiltered');
            }
            const {user, originalParams, callback} = args;
            const runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );

            let activeStates = [], query;

            if( originalParams.active ){ activeStates.push(true); }
            if( originalParams.inactive ){ activeStates.push(false); }

            query = { $or: [
                {isActive: {$exists: false}},
                {isActive: {$in: activeStates}},
                {isDirectory: true}
            ] };
            runDb( {
                user: user,
                model: 'rule',
                query: query,
                options: {
                    select: {_id: 1, parent: 1, isDirectory: 1}
                }
            } ).then( response => {
                let toShow = response.filter( el => el.parent === originalParams.id ).filter( el => filterLicensed( user.tenantId, el ) );
                toShow = toShow.map( el => {
                    if( el.isDirectory ) {
                        el.count = setTotalCountDown( response, el._id.toString() );
                    } else {
                        el.count = 1;
                    }
                    return el;
                } ).filter( el => el.count > 0 );

                if(!toShow.length){
                    return callback( null, [] );
                }

                return runDb( {
                    user: user,
                    model: 'rule',
                    query: {_id: {$in: toShow.map( el => el._id )}},
                    options: {
                        sort: {
                            _id: 1,
                            isDirectory: -1
                        }
                    }
                } );
            } ).then( response => {
                callback( null, response );
            } ).catch( err => {
                Y.log( 'Error on getting filtered rule tree ' + err.message, 'error', NAME );
                callback( err );
            } );
        }

        /**
         * @method triggerRuleEngineOnCaseOpenIPC
         * @public
         *
         * wrapper method to pass triggerRuleEngineOnCaseOpen call through IPC to reporting worker
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.patientId - id of patient which casefolder was open
         * @param {Function} args.callback
         */
        function triggerRuleEngineOnCaseOpenIPC( args ) {
            Y.doccirrus.api.rule.triggerIpcQueue({
                user: args.user,
                tenantId: args.user.tenantId,
                triggerRuleEngineOnCaseOpen: true,
                query: args.query
            } );
            args.callback( null );
        }

        /**
         * @method triggerRuleEngineOnCaseOpen
         * @public
         *
         * trigger some refernceArea (APK, SCHEIN, PERIOD and PATIENT) rules for patient and current time, this is triggred on
         *  open casefolder or switching active casefolder
         *
         * @param  {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.patientId - id of patient which casefolder was open
         * @param {Function} args.callback
         *
         * @returns {Function} callback - nothing is returned, just run rules
         */
        async function triggerRuleEngineOnCaseOpen( args ){
            const
                { user, query: options, callback } = args;

            if( !options.patientId ){
                return handleResult(new Error('query.patientId should be defined'), undefined, callback);
            }

            let err, patients;

            if( !options.caseFolderId ){
                [err, patients] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        query: { _id: options.patientId },
                        options: { select: {activeCaseFolderId: 1 } }
                    } )
                );

                if( err ){
                    Y.log( `triggerRuleEngineOnCaseOpen: error on getting patient id:${options.patientId} ${err.stack || err}`, 'error', NAME );
                    return handleResult(err, undefined, callback);
                }

                if( !patients.length ){
                    Y.log( `triggerRuleEngineOnCaseOpen: patient id:${options.patientId} not found`, 'error', NAME );
                    return handleResult(new Error( `triggerRuleEngineOnCaseOpen: patient id:${options.patientId} not found` ), undefined, callback);
                }
            }

            [ err ] = await formatPromiseResult(
                Y.doccirrus.api.rule.trigger( {
                    user,
                    originalParams: {
                        tenantId: user.tenantId,
                        caseFolderId: options.caseFolderId || patients[0].activeCaseFolderId,
                        patientId: options.patientId,
                        type: 'caseOpen',
                        onDelete: false,
                        timestamp: new Date(),
                        data: {
                            _id: options.patientId,
                            patientId: options.patientId,
                            caseFolderId: options.caseFolderId || patients[0].activeCaseFolderId,
                            timestamp: new Date()
                        }
                    }
                } )
            );
            if( err ){
                Y.log( `triggerRuleEngineOnCaseOpen: error on triggering rule ${err.stack || err}`, 'error', NAME );
            }

            handleResult(null, undefined, callback);
        }

        /**
         *  Process rules and keep track of queues on the same worker which generates reporting, provisional,
         *  may use master in future.
         *
         *  @return {boolean}
         */

        function isRuleWorker() {
            return cluster.isWorker && cluster.worker.process.env.REPORTING_WORKER
                || cluster.workers && Object.keys(cluster.workers).length === 0;
        }

        /**
         *  Get length of taskQueue
         *  NOTE: should be called always from reporting worker
         *
         *  @returns  {Number}    length of reporting queue
         */

        function getQueueLength(){
            return tasksQueue.length;
        }

        /**
         * @method dropCacheIPC
         * @public
         *
         *  set ruleCached global variable on reporting worker, this variable will be pass to rule engine on next trigger
         */
        function dropCacheIPC() {
            Y.log('Entering Y.doccirrus.api.rule.dropCacheIPC', 'debug', NAME);
            if ( isRuleWorker() ) {
                //  already on the instance responsible
                ruleCached = false;
            } else {
                //  broadcast IPC
                Y.doccirrus.ipc.send( REQUEST_DROP_CACHE_IPC );
            }
            Y.log('Exiting Y.doccirrus.api.rule.dropCacheIPC', 'debug', NAME);
        }


        /**
         *  Forward a request to trigger rules to the worker which keeps track of state of operations
         *
         *  @param  {Object}    params  Same as originalParams of Y.doccirrus.api.rule.trigger
         */

        function triggerIpcQueue( params ) {

            if( params.originalParams ){ //came from jsonrpc
                if( params.callback ){
                    params.callback();
                }
                params = {
                    ...params.originalParams,
                    user: params.user,
                    tenantId: params.user.tenantId
                };
            }

            if ( isRuleWorker() ) {
                //  already on the instance responsible
                receiveIpcTrigger( params );
            } else {
                //  broadcast IPC
                Y.doccirrus.ipc.send( REQUEST_TRIGGER_IPC, params );
            }
        }

        /**
         *  Keep requests to trigger rule engine in a queue, due to extreme server load produced by the rule engine
         *  if many invocations are run in parallell.
         *
         *  @param  {Object}    params  Same as originalParams of Y.doccirrus.api.rule.trigger
         */

        async function receiveIpcTrigger( params ) {
            let
                dataId,
                task;

            if ( !params.tenantId ) {
                Y.log( 'Missing tenantId, cannot process rules.', 'error', NAME );
                return;
            }

            // casefolder open
            if ( params.triggerRuleEngineOnCaseOpen && params.query && params.query.patientId ) {
                dataId = `caseOpen_${params.query.patientId}`;
            }

            // activity, casefolder, task
            if ( ['activity', 'casefolder', 'task'].includes( params.type ) && params.data && params.data ) {
                // in case of prevalidation rules from client id can be empty for new activity
                if( !params.data._id){
                    params.data._id = new ObjectId();
                }
                dataId = `${params.type}_${params.data._id.toString()}`;
            }

            // patient
            if ( params.type === 'patient' && params.data && params.data.patientId && params.data.patientId._id ) {
                dataId = `patient_${params.data.patientId._id.toString()}`;
            }


            Y.log( `Received IPC rules trigger for ${dataId} on ${Y.doccirrus.ipc.whoAmI()}`, 'info', NAME );

            if ( !dataId ) {
                Y.log( `No dataId on request, can not use queue: ${JSON.stringify(params)}`, 'error', NAME );
                return;
            }

            params.dataId = dataId;
            params.isInProgress = false;

            //  check for duplicates and discard this task if duplicate of one already waiting
            for ( task of tasksQueue ) {
                if ( dataId === task.dataId && !task.isInProgress ) {
                    Y.log( `Discarding duplicate request to trigger rule engine, already in queue: ${dataId}`, 'info', NAME );
                    return;
                }
            }

            tasksQueue.push( params );

            runNextInQueue();
        }

        /**
         *  Check the queue and execute the next item, FIFO, unless a task is already ongoing
         *  @return {Promise<void>}
         */

        async function runNextInQueue() {
            if ( 0 === tasksQueue.length ) {
                Y.log( `Rule engine queue is empty, all tasks complete.`, 'info', NAME );
                return;
            }

            let
                triggerP = promisifyArgsCallback( Y.doccirrus.api.rule.trigger ),
                triggerRuleEngineOnCaseOpenP = promisifyArgsCallback( Y.doccirrus.api.rule.triggerRuleEngineOnCaseOpen ),
                timeNow = new Date().getTime(),
                err;

            const
                isBusy = currentActiveTask ? 'busy' : 'free',
                timer = logEnter( `runNextInQueue (queue is ${isBusy}, len: ${tasksQueue.length})`, `info` );

            //  Check for dead items, error or similar, discard to keep the queue moving, should not happen
            if ( currentActiveTask && ( timeNow > ( currentActiveTask.startTime + QUEUE_TIMEOUT ) ) ) {
                Y.log( `Discarding dead entry in rules queue, full entry in debug log: ${currentActiveTask.referenceArea} ${currentActiveTask.dataId}`, 'error', NAME );
                Y.log( `Discarded rule entry due to timeout: ${JSON.stringify( currentActiveTask )}`, 'debug', NAME );

                currentActiveTask = null;
                logExit( timer );
                runNextInQueue();
                return;
            }

            //  safety check for unusual load profiles or memory leaks due to missing callbacks
            if ( tasksQueue.length > WARN_QUEUE_SIZE ) {
                Y.log( `Rules queues have ${tasksQueue.length} pending items, which is high, may indicate a memory leak.`, 'error', NAME );
            }

            //  if a task is already in progress, do not start another, it will be picked off the queue whenn current task completes
            if ( currentActiveTask ) {
                Y.log( `Rule engine is already processing a task, queue length is ${tasksQueue.length}.`, 'info', NAME );
                logExit( timer );
                return;
            }

            currentActiveTask = tasksQueue.shift();
            currentActiveTask.isInProgress = true;
            currentActiveTask.startTime = timeNow;

            timer.message = `${timer.message} ${currentActiveTask.referenceArea} ${currentActiveTask.dataId}`;

            if( currentActiveTask.triggerRuleEngineOnCaseOpen ){
                [ err ] = await formatPromiseResult(
                    triggerRuleEngineOnCaseOpenP( {
                        user: currentActiveTask.user,
                        query: currentActiveTask.query
                    } )
                );
            } else {
                [ err ] = await formatPromiseResult(
                    triggerP( {
                        user: currentActiveTask.user,
                        originalParams: currentActiveTask
                    } )
                );
            }

            if ( err ) {
                Y.log( `Error while running ${currentActiveTask.referenceArea} rules for ${currentActiveTask.dataId}: ${err.stack||err}`, 'error', NAME );
                Y.log( `Request leading to failure of rules was: ${JSON.stringify(currentActiveTask)}`, 'warn', NAME );
                // continue anyway, keep processing the queue
            }

            //  only clear the currentActiveTask if we are inside the timeout, or another invocation of this method
            //  may have already replaced it with a different task
            if ( currentActiveTask && ( timeNow <= ( currentActiveTask.startTime + QUEUE_TIMEOUT ) ) ) {
                currentActiveTask = null;
            }

            //  TODO: adjust this timeout according to load on the system
            setTimeout( function() { runNextInQueue(); }, 20 );
            logExit( timer );
        }

        /**
         *  Set up IPC subscription handle requests to trigger rules
         */

        async function runOnStart( callback ) {
            if ( isRuleWorker() ) {
                dbConfig = require( 'dc-core' ).db.loadDbConfig();
                dbConfig = dbConfig && dbConfig.mongoDb || {};

                Y.log( `Set up IPC for rule API on ${Y.doccirrus.ipc.whoAmI()}`, 'info', NAME );
                Y.doccirrus.ipc.subscribe( REQUEST_TRIGGER_IPC, receiveIpcTrigger );
                Y.doccirrus.ipc.subscribe( REQUEST_REGENERATE_IPC, Y.doccirrus.api.ruleimportexport.docCirrusReloadRegenerateProcess );
                Y.doccirrus.ipc.subscribe( REQUEST_DROP_CACHE_IPC, () => { ruleCached = false; } );
            }
            callback();
        }
        /**
         *  Filters rules by catalog for SwissMode and check license
         *  @return {Promise<Object>}
         */
        async function getFilteredRules ({user, originalParams, callback}) {
            function traverseParent( rule ) {
                var parent = rule.parent;
                if(!parent || dirArray.includes(rule.parent)) {
                    return rule;
                }
                const nextParent = ruleDirectories.find(dir => dir._id.toString() === parent);
                return traverseParent(nextParent);
            }
            function checkLicenseAndCountry( rule ) {
                const parent = traverseParent(rule),
                    parentID = parent && parent.parent;
                return !((parentID === DOQUVIDEparent && false === DOQUVIDElicense) ||
                    (parentID === CARDIOparent && false === CARDIOlicense) ||
                    (parentID === DQSparent && false === DQSlicense) ||
                    (parentID === PEDIAparent && false === PEDIAlicense) ||
                    (parentID === TARMEDparent && false === isSwitzMode && !isMasterTenant) ||
                    (parentID === TARMEDUVGparent && false === isSwitzMode && !isMasterTenant) ||
                    (parentID === DcSZparent && isSwitzMode && !isMasterTenant) ||
                    (parentID === DcPKVparent && isSwitzMode && !isMasterTenant) ||
                    (parentID === EBMparent && isSwitzMode && !isMasterTenant));
            }

            const query = originalParams.query || {},
                options = originalParams.options || {},
                DOQUVIDEparent = Y.doccirrus.schemas.rule.getDOQUVIDEDirId(),
                DQSparent = Y.doccirrus.schemas.rule.getDQSDirId(),
                DcSZparent = Y.doccirrus.schemas.rule.getDcSZId(),
                DcPKVparent = Y.doccirrus.schemas.rule.getDcPKVId(),
                EBMparent = Y.doccirrus.schemas.rule.getEBMDirId(),
                CARDIOparent = Y.doccirrus.schemas.rule.getCARDIODirId(),
                PEDIAparent = Y.doccirrus.schemas.rule.getPEDIADirId(),
                TARMEDparent = Y.doccirrus.schemas.rule.getTarmedId(),
                TARMEDUVGparent = Y.doccirrus.schemas.rule.getTarmedUVGId(),
                DOQUVIDElicense = Y.doccirrus.auth.hasModuleAccess(user, Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ) || false,
                DQSlicense = Y.doccirrus.auth.hasModuleAccess(user, Y.doccirrus.schemas.settings.specialModuleKinds.DQS ) || false,
                CARDIOlicense = Y.doccirrus.auth.hasModuleAccess(user, Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO ) || false,
                PEDIAlicense = Y.doccirrus.auth.hasModuleAccess(user, Y.doccirrus.schemas.settings.specialModuleKinds.PEDIA ) || false,
                isSwitzMode = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() || false,
                dirArray = [DOQUVIDEparent, DQSparent, DcSZparent, DcPKVparent, EBMparent, CARDIOparent, PEDIAparent, TARMEDparent],
                { masterDCFormTenant } = Y.doccirrus.utils.getConfig( 'env.json' ),
                isMasterTenant = user.tenantId === masterDCFormTenant;

            let err, ruleDirectories, rules;

            [err, ruleDirectories] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                    user,
                    action: 'get',
                    model: 'rule',
                    query: {
                        isDirectory: true
                    }
                })
            );

            if(err) {
                Y.log( `Error getting rules directories: ${err.stack||err}`, 'error', NAME );
                return callback(err);
            }

            [err, rules] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                    user,
                    action: 'get',
                    model: 'rule',
                    query,
                    options
                })
            );

            if(err) {
                Y.log( `Error getting rules: ${err.stack||err}`, 'error', NAME );
                return callback(err);
            }
            const filtered = rules.filter(rule => checkLicenseAndCountry(rule));
            return callback(null, filtered);
        }

        /**
         *  Forward a request to regenerate rules to the dedicated worker
         *
         *  @param  {Object}    params
         */

        function regenerateRules( params ) {
            if ( isRuleWorker() ) {
                //  already on the instance responsible
                Y.doccirrus.api.ruleimportexport.docCirrusReloadRegenerateProcess( params );
            } else {
                //  broadcast IPC
                Y.doccirrus.ipc.send( REQUEST_REGENERATE_IPC, params );
            }
        }


        /*
         *  Expose API
         */

        Y.namespace( 'doccirrus.api' ).rule = {
            name: NAME,
            runOnStart,

            post: postRuleSets,
            'delete': deleteRuleSets,
            trigger,
            triggerIpcQueue,
            importFromCatalog: ( args ) => {
                Y.log('Entering Y.doccirrus.api.rule.importFromCatalog', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rule.importFromCatalog');
                }
                Y.doccirrus.schemas.sysnum.getRuleImportLock( args.user, ( err, getLock ) => {
                    if( err ){
                        Y.log( 'Error getting rule import lock ' + err.message, 'error', NAME );
                    }

                    if( args.originalParams.checkOnly ) {
                        //  eslint-disable-next-line callback-return
                        args.callback( null, { status: ( getLock !== true ) ? ProcessingStatus.PROCESSING : ProcessingStatus.NO_PROCESSING } );
                        Y.doccirrus.schemas.sysnum.releaseRuleImportLock( args.user, () => {
                        } );
                    } else {
                        if( getLock !== true ) {
                            args.callback( null, { status: ProcessingStatus.PROCESSING } );
                            return;
                        }
                        importFromCatalog( args );
                    }
                } );
            },
            createDirectory,
            renameRuleSetOrDirectory,
            moveRuleSetOrDirectory,
            activate,
            lock,
            deleteDirectory,
            createRuleActivities,
            getFiltered,
            getFilteredRules,
            triggerRuleEngineOnCaseOpen,
            triggerRuleEngineOnCaseOpenIPC,
            dropCacheIPC,
            getQueueLength,
            regenerateRules,
            filterLicensed
        };

    },
    '0.0.1', {
        requires: [
            'dccommonutils',
            'rulelog-api',
            'ruleimportexport-api',
            'dcruleengine',
            'dcruleutils',
            'dcruleimport',
            'dccardioutils'
        ]
    }
);
