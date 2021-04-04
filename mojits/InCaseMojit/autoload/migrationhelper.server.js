/**
 *  Utilities to fix incorrectly linked attachments on activites, re MOJ-6075
 *
 *  @author: strix
 *  @date: 2016-05-30
 */


/*global YUI*/



YUI.add( 'incasemojit-migrationhelper', function( Y, NAME ) {

        const
            mongoose = require('mongoose'),
            moment = require( 'moment' ),
            async = require( 'async' ),
            dcUtils = require( 'dc-core' ).utils,
            util = require( 'util' ),
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            formatPromiseResult = dcUtils.formatPromiseResult,
            handleResult = dcUtils.handleResult,
            medDataItemDataTypes = Y.doccirrus.schemas.v_meddata.medDataItemDataTypes,
            tagTypes = Y.doccirrus.schemas.tag.tagTypes,
            staticTags = Y.doccirrus.schemas.tag.staticTags;

        var
            //  used to find documents linked more than once from activities
            aggregateQuery = [
                {
                    "$match": {
                        "attachments": { "$exists": true }
                    }
                },
                {
                    "$project": {
                        "_id": 1,
                        "attachments": 1,
                        "lengthAttachments": {
                            "$size": { "$ifNull": [ "$attachments", [] ] }
                        }
                    }
                },
                {
                    "$match": {
                        "lengthAttachments": { "$gt": 0 }
                    }
                },
                {
                    "$unwind": "$attachments"
                },
                {
                    "$group": {
                        "_id": {
                            "docId": "$attachments"
                        },
                        "numReferences": {
                            "$sum": 1
                        }
                    }
                },
                {
                    "$match": {
                        "numReferences": { "$gt": 1 }
                    }
                }
            ];

        /**
         *  Run aggregation query to unwind attachments and return all documents linked more than once from activities
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  callback    {Function}  Of the form fn( err, documentIds, report)
         */

        function runAggregationQuery( user, callback ) {

            var
                documentIds = [],
                aggregateResult,
                report = '';

            report = `${report }Creating activity model...\n`;
            Y.doccirrus.mongodb.getModel( user, 'activity', true, onActivityModelLoaded );
            function onActivityModelLoaded( err, activityModel ) {
                if ( err ) {
                    report = `${report }Could not create activity model: ${ JSON.stringify( err ) }\n`;
                    callback( err );
                    return;
                }
                report = `${report }Running aggregate query...\n\n`;
                activityModel.mongoose.aggregate( aggregateQuery, onAggregateResult );
            }

            function onAggregateResult(err, result ) {
                if ( err ) {
                    report = `${report }Could not run aggregate model: ${ JSON.stringify( err ) }\n`;
                    callback( err );
                    return;
                }
                report = `${report }Aggregate query reports ${ result.length } duplications.\n`;
                aggregateResult = result;

                var i, docId;

                for (i = 0; i < aggregateResult.length; i++ ) {
                    docId = `${aggregateResult[i]._id.docId }`;
                    if ( -1 === documentIds.indexOf( docId ) ) {
                        if ( docId.length > 5 ) {
                            report = `${report }  (*) Queueing duplicated document: ${ docId }\n`;
                            documentIds.push( docId );
                        } else {
                            report = `${report }  (!) Skipping invalid document _id: ${ docId } (migrate error?)`;
                        }
                    }
                }

                report = `${report }\n`;
                callback( null, documentIds, report );
            }


        }

        /**
         *  Utility / migration script to check for and correct duplicated activity.attachments (MOJ-6075)
         *
         *  @param  user            {Object}    REST user or equivalent\
         *  @param  inMigration     {Boolean}   True if run in migration context, false if run from REST route
         *  @param  callback        {Function}  Of the form fn(err, report)
         */

        function checkDuplicateAttachments( user, inMigration, callback ) {
            var
                documentIds = [],
                report = `<h1>Checking for duplicated attachments ${ inMigration ? 'MIGRATION' : 'MANUAL' }</h1>\n`,
                tasks = [],
                isDry = false;

            Y.log( `Checking duplicated attachments for tenant: ${ user.tenantId}`, 'debug', NAME );

            async.series( [ getDuplicatedDocuments, checkEachDocument, runAllTasks ], onAllDone );

            //  1.  Run the aggregation query, returns only documents which are referenced more than once
            function getDuplicatedDocuments( itcb ) {
                Y.log( `.. step 1: getDuplicateDocuments (${ user.tenantId });`, 'debug', NAME );

                runAggregationQuery( user, onAggregationQuery );

                function onAggregationQuery( err, foundDocumentIds, reportFragment ) {
                    Y.log( `.. step 1: aggregation query complete (${ user.tenantId });`, 'debug', NAME );

                    if ( err ) {
                        Y.log( `Problem with aggregation query: ${ JSON.stringify( err )}`, 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    documentIds = foundDocumentIds;
                    report = report + reportFragment;

                    Y.log( `.. step 1: found ${ documentIds.length } document _ids of interest`, 'debug', NAME );
                    itcb( null );
                }
            }

            //  2.  Compare each duplicated document against references from the activities collection
            function checkEachDocument( itcb ) {

                if ( !documentIds || 0 === documentIds.length ) {
                    report = `${report }No problems found with duplicated attachment references.\n\n`;
                    itcb( null );
                    return;
                }

                Y.log( `.. step 2: Checking ${ documentIds.length } documents`, 'debug', NAME );

                report = `${report }Checking ${ documentIds.length } documents\n\n`;

                async.eachSeries( documentIds, checkSingleDocId, onAllDocsChecked );

                function onAllDocsChecked( err ) {
                    if ( err ) {
                        Y.log( `.. step 2: Error while checking documents: ${ JSON.stringify( err )}`, 'warn', NAME );
                        report = `${report }  (!) Error while checking documents: ${ JSON.stringify( err ) }\n`;
                        itcb( err );
                        return;
                    }

                    Y.log( '.. step 2: finished checking all documents', 'debug', NAME );
                    itcb( null );
                }
            }

            //  2.5 Compare a single duplicated document against references from the activities collection
            function checkSingleDocId( docId, itcb ) {
                var
                    doc,
                    activities;

                Y.log( `.. step 2.5: checking document ${ docId}`, 'debug', NAME );
                report = `${report }Checking document ${ docId }\n`;

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'document',
                    'query': { '_id': docId },
                    'migrate': inMigration,
                    'callback': onDocumentLoaded
                } );

                function onDocumentLoaded( err, result ) {

                    var
                        noDoc = !err && ( !result || !result[0] ),
                        noBackLink = !err && result && result[0] && !result[0].activityId;

                    if ( noDoc ) {
                        err = Y.doccirrus.errors.rest( 404, `Document not found: ${ docId}`, true );
                    }

                    if ( noBackLink ) {
                        err = Y.doccirrus.errors.rest( 500, `Document does not record an activity which it belongs to: ${ docId}`, true );
                    }

                    if ( err ) {
                        Y.log( `.. step 2.5: Problem loading document form the database: ${ JSON.stringify( err )}`, 'warn', NAME );
                        report = `${report }  (!) Error loading document ${ docId }: ${ JSON.stringify( err ) }\n\n`;
                        //  do not break out of eachSeries, continue with next document
                        itcb( null );
                        return;
                    }

                    doc = result[0];
                    Y.log( `.. step 2.5: Document ${ docId } is owned by activity ${ doc.activityId }, loading it...`, 'debug', NAME );

                    report = `${report }  (i) Document ${ docId } is owned by activity ${ doc.activityId }\n`;

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'activity',
                        'query': { 'attachments': { $elemMatch: { $eq: docId } } },
                        'callback': onActivitiesLoaded,
                        'migrate': inMigration
                    } );

                }

                function onActivitiesLoaded( err, result ) {
                    if ( err ) {
                        Y.log( `.. step 2.5: Problem loading activity form the database: ${ JSON.stringify( err )}`, 'warn', NAME );
                        report = `${report }  (!) Could not look up activities linking to document: ${ JSON.stringify( err ) }\n\n`;
                        itcb( err );
                        return;
                    }

                    activities = result;

                    report = `${report }  (i) ${ activities.length } activities reference document ${ docId }\n`;

                    if ( 1 === activities.length ) {
                        report = `${report }  (>) Deduplicate attachments of single activity ${ activities[0]._id }\n`;

                        tasks.push( {
                            'type': 'DEDUPLICATE',
                            'documentId': `${docId }`,
                            'activityId': `${activities[0]._id }`
                        } );

                        //deduplicateAndSave( activities[0] );
                    }

                    report = `${report }\n`;

                    Y.log( '.. step 2.5: complete for this document', 'warn', NAME );
                    itcb( null );
                }

            }

            //  3.  Action any changes necessary due to duplicated documents
            function runAllTasks( itcb ) {


                //Y.log( 'Dry run, not actually running tasks: ' + JSON.stringify( tasks, undefined, 2), 'info', NAME );
                //report = report + '  (!) Dry run, not actually executing tasks.\n\n';
                //itcb( null );

                function taskIterator( task, _cb ) {
                    function onTaskComplete( err, reportFragment ) {
                        Y.log( `.. step 3.5: single task complete: ${ reportFragment}`, 'debug', NAME );
                        report = `${report + reportFragment }\n`;
                        _cb( err );
                    }
                    Y.log( `.. step 3.5: running single migration task ${ JSON.stringify( task )}`, 'debug', NAME );
                    runSingleMigrationTask( user, task, inMigration, isDry, onTaskComplete );
                }

                Y.log( `.. step 3: Running all ${ tasks.length } tasks`, 'debug', NAME );
                report = `${report }\n\nExecuting all tasks (${ tasks.length }) \n\n`;
                async.eachSeries( tasks, taskIterator, itcb );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Problem during migration to correct duplicated attachments: ${ JSON.stringify( err )}`, 'debug', NAME );
                }

                Y.log( `\n\n${ report }\n\n`, 'info', NAME );
                callback( err, report );
            }
        }

        /**
         *  Utility / migration script to check for and fix incorrectly linked attachments (MOJ-6075)
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  inMigration     {Boolean}   Should always be false
         *  @param  callback        {Function}  Of the form fn(err, report)
         */

        function relinkAttachments( user, inMigration, isDry, callback ) {

            Y.log( 'Relinking broken attachments...', 'debug', NAME );

            var
                tasks = [],
                documentIds = [],

                report = `<h1>Checking / relinking duplicate attachments ${ inMigration ? 'MIGRATION' : 'MANUAL' }</h1>\n\n`;

            async.series( [ getDuplicatedDocuments, checkEachDocument, runAllTasks ], onAllDone );

            //  Query to unwind attachments and return all documents linked more than once from activities
            function getDuplicatedDocuments( itcb ) {

                runAggregationQuery( user, onAggregationQuery );

                function onAggregationQuery( err, foundDocumentIds, reportFragment) {
                    documentIds = foundDocumentIds;
                    report = report + reportFragment;
                    itcb( err );
                }
            }

            function checkEachDocument( itcb ) {
                report = `${report }Checking ${ documentIds.length } documents\n\n`;

                async.eachSeries( documentIds, checkSingleDocId, onAllDocsChecked );

                function onAllDocsChecked( err ) {
                    if ( err ) {
                        report = `${report }  (!) Error checking document: ${ JSON.stringify( err ) }\n`;
                    }
                    itcb( null );
                }

            }

            function checkSingleDocId( docId, itcb ) {
                var
                    doc,
                    activities;

                report = `${report }Checking document ${ docId }\n`;

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'document',
                    'query': { '_id': docId },
                    'migrate': inMigration,
                    'callback': onDocumentLoaded
                } );

                function onDocumentLoaded( err, result ) {
                    var
                        noDoc = !err && ( !result || !result[0] ),
                        noBackLink = !err && result && result[0] && !result[0].activityId;

                    if ( noDoc ) {
                        err = Y.doccirrus.errors.rest( 404, `Document not found: ${ docId}`, true );
                    }

                    if ( noBackLink ) {
                        err = Y.doccirrus.errors.rest( 500, `Document does not record an activity which it belongs to: ${ docId}`, true );
                    }

                    if ( err ) {
                        report = `${report }  (!) Error loading document ${ docId }: ${ JSON.stringify( err ) }\n\n`;
                        //  do not break out of eachSeries, continue with next document
                        itcb( null );
                        return;
                    }

                    doc = result[0];
                    report = `${report }  (i) Document ${ docId } is owned by activity ${ doc.activityId }\n`;

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'activity',
                        'query': { 'attachments': { $elemMatch: { $eq: docId } } },
                        'migrate': inMigration,
                        'callback': onActivitiesLoaded
                    } );
                }

                function onActivitiesLoaded( err, result ) {
                    if ( err ) {
                        report = `${report }  (!) Could not look up activities linking to document: ${ JSON.stringify( err ) }\n\n`;
                        itcb( err );
                        return;
                    }

                    activities = result;

                    report = `${report }  (i) ${ activities.length } activities reference document ${ docId }\n`;

                    if ( 0 === activities.length ) {
                        report = `${report }  (>) No activities claim document ${ docId }, relinking to doc.activityId\n\n`;

                        //  add to task list
                        tasks.push( {
                            'type': 'ADD',
                            'documentId': docId,
                            'activityId': doc.activityId
                        } );

                        itcb( null );
                        return;
                    }

                    if ( 1 === activities.length ) {
                        report = `${report }  (>) Deduplicate attachments of single activity ${ activities[0]._id }\n\n`;

                        //  add to task list (should have been handled by migration)
                        tasks.push( {
                            'type': 'DEDUPLICATE',
                            'documentId': `${docId }`,
                            'activityId': `${activities[0]._id }`
                        } );

                        itcb( null );
                        return;
                    }

                    var i;
                    for ( i = 0; i < activities.length; i++ ) {
                        report = `${report }  (-) Document ${ docId } is linked from activity ${ activities[i]._id } (${ i })\n`;

                        if ( `${activities[i]._id }` === `${doc.activityId }` ) {
                            report = `${report }  (i) Activity ${ activities[i]._id } (${ i }) is correct owner, leaving attachment\n`;
                        } else {
                            report = `${report }  (>) Activity ${ activities[i]._id } (${ i }) is duplicate, removing attachment\n`;

                            //  add to task list
                            tasks.push( {
                                'type': 'REMOVE',
                                'documentId': docId,
                                'activityId': `${activities[i]._id }`
                            } );
                        }

                    }

                    report = `${report }\n`;
                    itcb( null );
                }

            }

            function runAllTasks( itcb ) {

                //Y.log( 'Dry run, not actually running tasks: ' + JSON.stringify( tasks, undefined, 2), 'info', NAME );
                //itcb( null );

                function taskIterator( task, _cb ) {
                    function onTaskComplete( err, reportFragment ) {
                        Y.log( `.. single task complete: ${ reportFragment}`, 'debug', NAME );
                        report = `${report + reportFragment }\n`;
                        _cb( err );
                    }
                    runSingleMigrationTask( user, task, inMigration, isDry, onTaskComplete );
                }
                async.eachSeries( tasks, taskIterator, itcb );
            }

            function onAllDone( err ) {
                Y.log( `checkDuplicateAttachments complete, returning report:\n\n${ report }\n\n\n`, 'info', NAME );
                callback( err, report );
            }

        }

        /**
         *  Run a single task as produced by migration script
         */

        function runSingleMigrationTask( user, task, inMigration, isDry, callback ) {

            var
                report = `  (-) Running task ${ JSON.stringify( task ) }\n`,
                document,                                                       //  eslint-disable-line no-unused-vars
                activity;

            async.series(
                [
                    loadDocument,
                    loadActivity,
                    updateActivity,
                    saveActivity
                ],
                onAllDone
            );

            //  1. Load the affected document from the database
            function loadDocument( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'document',
                    'query': { '_id': task.documentId },
                    'migrate': inMigration,
                    'callback': onDocumentLoaded
                } );

                function onDocumentLoaded( err, result ) {
                    if (err ) {
                        Y.log( `Error loading document: ${ JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }
                    document = result[0]; //  eslint-disable-line no-unused-vars
                    itcb( null );
                }
            }

            //  2. Load the affected activity from the database
            function loadActivity( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activity',
                    'query': { '_id': task.activityId },
                    'migrate': inMigration,
                    'callback': onActivityLoaded
                } );

                function onActivityLoaded( err, result ) {
                    if ( err ) {
                        Y.log( `Error loading activity: ${ JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }
                    activity = result[0];
                    itcb( null );
                }
            }

            //  3. Update the activity as required by the task
            function updateActivity( itcb ) {

                function removeFromArray( item, ary ) {
                    var i, newAry = [];
                    for ( i = 0 ; i < ary.length; i++ ) {
                        if ( ary[i] !== item ) {
                            newAry.push( ary[i] );
                        }
                    }
                    return newAry;
                }

                function deduplicateArray( ary ) {
                    //  trick from: http://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array
                    function filterUnique( item, pos, self ) { return ( self.indexOf( item ) === pos ); }
                    return ary.filter( filterUnique );
                }

                switch( task.type ) {
                    case 'ADD':
                        report = `${report }  (*) ADD attachment ${ task.documentId } to ${ activity._id }\n`;
                        report = `${report }  (i) before: ${ JSON.stringify( activity.attachments ) }\n`;
                        activity.attachments.push( task.documentId );
                        report = `${report }  (i) after ${ JSON.stringify( activity.attachments ) }\n`;
                        break;

                    case 'REMOVE':
                        report = `${report }  (*) REMOVE attachment ${ task.documentId } from ${ activity._id }\n`;
                        report = `${report }  (i) before: ${ JSON.stringify( activity.attachments ) }\n`;
                        activity.attachments = removeFromArray( task.documentId, activity.attachments );
                        report = `${report }  (i) after ${ JSON.stringify( activity.attachments ) }\n`;
                        break;

                    case 'DEDUPLICATE':
                        report = `${report }  (*) DEDUPLICATE attachments of ${ activity._id }\n`;
                        report = `${report }  (i) before: ${ JSON.stringify( activity.attachments ) }\n`;
                        activity.attachments = deduplicateArray( activity.attachments );
                        report = `${report }  (i) after ${ JSON.stringify( activity.attachments ) }\n`;
                        break;

                    default:
                        return itcb( 'Unrecognized task type' );
                }


                itcb( null );
            }

            //  4. Save the activity back to the database
            function saveActivity( itcb ) {

                if ( isDry ) {
                    report = `${report }  (i) Dry run, not executing save.\n`;
                    itcb( null );
                    return;
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'action': 'put',
                    'model': 'activity',
                    'query': { '_id': `${activity._id }` },
                    'fields': [ 'attachments' ],
                    'data': {
                        'fields_': [ 'attachments' ],
                        'skipcheck_': true,
                        'attachments': activity.attachments
                    },
                    'options': {
                        'limit': 1,
                        'ignoreReadOnly': ['dependsOn']
                    },
                    'migrate': inMigration,
                    'callback': onActivitySaved
                } );

                function onActivitySaved( err ) {
                    if ( err ) {
                        Y.log( `Problem while executing task: ${ JSON.stringify( task )}`, 'warn', NAME );
                        report = `${report }  (!) Error saving activity ${ activity._id }: ${ JSON.stringify( err ) }\n`;
                    } else {
                        report = `${report }  (i) Saved activity ${ activity._id }\n`;
                    }

                    //  record the error in the report, but do not stop the process
                    itcb( null );
                }

            }

            //  X. Note any problems
            function onAllDone( err ) {
                callback( err, report );
            }
        }

        /**
         *  Migration to initialize latestMedData on patient for mapping into forms (MOJ-7587)
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  inMigration     {Boolean}   True if called in migration context, false if called from dev/support route
         *  @param  callback        {Function}  fn( err )
         */

        async function setLatestMedDataOnPatients( user, inMigration, callback ) {

            const getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            let err, patientModel, patientCursor, patientCount = 0;

            Y.log( `Starting migration to set latestMedData for all patients on tenant: ${ user.tenantId}`, 'info', NAME );

            //  Get the activity model
            [ err, patientModel ] = await formatPromiseResult( getModelProm( user, 'patient', inMigration ) );

            if( err ) {
                Y.log( `updateMedDataItemsWithBoolAndDateValue: Error while getting 'Activity' model. Error: ${err.stack || err}`, 'error', NAME );

                return handleResult( err, null, callback );
            }

            patientCursor = patientModel.mongoose.find( {}, { _id: true }, { lean: true, timeout: true } ).cursor();

            [ err ] = await formatPromiseResult( patientCursor.eachAsync( async patientObj => {
                let setLatestMedDataPromise = util.promisify( Y.doccirrus.api.patient.setLatestMedData );

                [ err ] = await formatPromiseResult( setLatestMedDataPromise( user, `${ patientObj._id }`, null, inMigration, false ) );

                if ( err ) {
                    Y.log( `Problem initializing latestMedData for patient ${ patientObj._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                } else {
                    patientCount++;
                }
            } ) );

            if ( err ) {
                Y.log( `Could not add latestMedData to patients: ${ JSON.stringify( err )}`, 'warn', NAME );
            }

            Y.log( `Completed migration to all latestMedData to ${ patientCount } patients on tenant: ${ user.tenantId}`, 'info', NAME );

            return handleResult( null, null, callback );
        }

            /**
             *  Migration to initialize latestLabData on patient to display in patientGadgetLatestLabData (EXTMOJ-2272)
             *
             *  @param  user            {Object}    REST user or equivalent
             *  @param  inMigration     {Boolean}   True if called in migration context, false if called from dev/support route
             *  @param  callback        {Function}  Of the form fn( err )
             */

            function setLatestLabDataOnPatients( user, inMigration, callback ) {

                var
                    patientModel,
                    patientCount = 0;

                Y.log( `Starting migration to set latestLabData for all patients on tenant: ${ user.tenantId}`, 'info', NAME );

                async.series( [ getPatientModel, streamAllPatientIds ], onAllDone );

                //  1. Get a patient model (with mongoose model)
                function getPatientModel( itcb ) {
                    Y.doccirrus.mongodb.getModel( user, 'patient', inMigration, onModelLoaded );
                    function onModelLoaded( err, newModel ) {
                        if ( err ) { return itcb( err ); }
                        patientModel = newModel;
                        itcb( null );
                    }
                }

                //  2. Stream all patients (we only need the _id)
                function streamAllPatientIds( itcb ) {
                    var patientStream;
                    function onStreamData( patientObj ) {
                        patientStream.pause();
                        Y.doccirrus.api.patient.setLatestLabData( user, `${ patientObj._id }`, null, inMigration, false, onPatientDone );

                        function onPatientDone( err ) {
                            if ( err ) {
                                Y.log( `Problem initializing latestLabData for patient ${ patientObj._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                                //  continue with migration regardless (best effort)
                            }

                            patientCount++;
                            patientStream.resume();
                        }
                    }

                    function onStreamEnd() {
                        Y.log( `Finished processing all ${ patientCount } patients to (re)set latestLabData`, 'debug', NAME );
                        itcb( null );
                    }

                    function onStreamError( err ) {
                        Y.log( `Error in patient stream: ${ JSON.stringify( err )}`, 'debug', NAME );
                        itcb( err );
                    }

                    patientStream = patientModel.mongoose.find( {}, { _id: true }, { timeout: true } ).stream();
                    patientStream
                            .on( 'data', onStreamData )
                            .on( 'error', onStreamError )
                            .on( 'end', onStreamEnd );
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( `Could not add latestLabData to patients: ${ JSON.stringify( err )}`, 'warn', NAME );
                        return callback( null );
                    }

                    Y.log( `Completed migration to all latestLabData to ${ patientCount } patients on tenant: ${ user.tenantId}`, 'info', NAME );
                    callback( null );
                }

            }

        /**
         *  MOJ-7642, MOJ-6627 - Cashbook - Set receipt totals on invoices when PAID (0) or billed (sum of receipts)
         *
         *  TODO: add a report for this
         *  TODO: force overwrite in PUT
         *
         *  @param user         {Object}
         *  @param inMigration  {Boolean}
         *  @param callback     {Function}
         */

        function checkReceiptTotalsOnInvoices( user, inMigration, callback ) {
            var
                activityModel,
                invoiceCount = 0,
                changeCount = 0,

                //( { 'actType': 'INVOICE', $or: [ { 'status': 'PAID'} , { 'status': 'BILLED' } ] } )

                invoiceQuery = {
                    'actType': 'INVOICE'//,
                    /*
                    $or: [
                        { 'status': 'PAID'} ,
                        { 'status': 'BILLED' },
                        { 'status': 'WARN1' },
                        { 'status': 'WARN2' }
                    ]
                    */
                };

            async.series( [ getActivityModel, streamAllInvoices ], onAllDone );

            //  1. Get a activity model (with mongoose model)
            function getActivityModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'activity', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    activityModel = newModel;
                    Y.log( 'Created activity model for checking invoice receipt totals.', 'debug', NAME );
                    itcb( null );
                }
            }

            //  2. Stream all invoice activities which are BILLED or PAID
            function streamAllInvoices( itcb ) {
                var invoiceStream;

                function onStreamData( invoiceObj ) {
                    invoiceStream.pause();

                    invoiceObj = JSON.parse( JSON.stringify( invoiceObj ) );
                    invoiceObj.receipts = invoiceObj.receipts || [];

                    Y.log( `Checking invoice ${ invoiceObj._id } ${ invoiceObj.status } price: ${ invoiceObj.price } totalReceipts: ${ invoiceObj.totalReceipts } receipts: ${ JSON.stringify( invoiceObj.receipts )}`, 'debug', NAME );

                    invoiceCount = invoiceCount + 1;

                    if ( 'PAID' === invoiceObj.status || 'ARCHIVED' === invoiceObj.status ) {
                        //  ensure that invoice receipts total matches expected total (0 outstanding)
                        ensureInvoicePaid( invoiceObj, onInvoiceDone );

                    } else {
                        //  ensure that invoice receipts total is accurate
                        correctInvoiceReceiptTotal( invoiceObj, onInvoiceDone );
                    }

                    function onInvoiceDone( err ) {
                        if ( err ) {
                            Y.log( `Problem correcting receipt totals on invoice ${ invoiceObj._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                            //  continue with migration regardless (best effort)
                        }
                        invoiceStream.resume();
                    }
                }

                function onStreamEnd() {
                    Y.log( `Finished processing all ${ invoiceCount } invoices to (re)set receiptTotals`, 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( `Error in patient stream: ${ JSON.stringify( err )}`, 'debug', NAME );
                    itcb( err );
                }

                Y.log( `Starting stream of all invoices: ${ JSON.stringify( invoiceQuery )}`, 'debug', NAME );

                invoiceStream = activityModel.mongoose.find( invoiceQuery, {}, { timeout: true } ).stream();
                invoiceStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );
            }

            //  BILLED invoices should have a totalReceipts value which is the sum of linked receipt values
            function correctInvoiceReceiptTotal( invoiceObj, itcb ) {

                if ( 0 === invoiceObj.receipts.length ) {
                    //  skip database query if not receipts to load
                    return onReceiptsLoaded( null, [] );
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activity',
                    'query': {
                        '_id': { $in: invoiceObj.receipts },
                        'actType': 'RECEIPT'
                    },
                    'options': {
                        'lean': true
                    },
                    'migrate': inMigration,
                    'callback': onReceiptsLoaded
                } );

                function onReceiptsLoaded( err, receipts ) {
                    if ( err ) {
                        Y.log( `Could not query receipts for invoice: ${ invoiceObj._id}`, 'warn', NAME );
                        return itcb( err );
                    }

                    var
                        totalReceipts = 0,
                        totalReceiptsOutstanding = invoiceObj.price || 0,
                        i;

                    for ( i = 0; i < receipts.length; i++ ) {
                        if ( !receipts[i].amount || isNaN( receipts[i].amount ) ) {
                            Y.log( `Skipping invalid receipt when calculating outstanding balancee of invoices: ${ receipts[i]._id}`, 'warn', NAME );
                        } else {
                            totalReceipts = totalReceipts + parseFloat( receipts[i].amount );
                            totalReceiptsOutstanding = totalReceiptsOutstanding - parseFloat( receipts[i].amount );
                        }
                    }

                    //  When an invoice is marked as PAID or ARCHIVED the remaining balance is set to 0, MOJ-6627
                    if ( 'CREDITED' === invoiceObj.status || 'ARCHIVED' === invoiceObj.status ) {
                        //  MOJ-9057 oustanding receipts calculated from price, not total
                        totalReceipts = parseFloat( invoiceObj.price );
                        totalReceiptsOutstanding = 0.00;
                    }

                    if (
                        totalReceipts === parseFloat( invoiceObj.totalReceipts ) &&
                        totalReceiptsOutstanding === parseFloat( invoiceObj.totalReceiptsOutstanding )
                    ) {
                        //  all correct, no need to update activity
                        Y.log(
                            `Outstanding balance of invoice ${ invoiceObj._id } matches receipts: ${ 
                            totalReceipts }/${ totalReceipts }/${ totalReceiptsOutstanding}`,
                            'debug', NAME
                        );
                        return itcb( null );
                    } else {
                        Y.log(
                            `Mismatch in totalReceipts (${ invoiceObj.receipts.length }): ${ 
                                totalReceipts } !== ${ invoiceObj.totalReceipts } or oustanding: ${ 
                                totalReceiptsOutstanding } !== ${ invoiceObj.totalReceiptsOutstanding}`,
                            'debug', NAME
                        );
                    }

                    //  totalReceipts/totalReceiptsOutstanding value is incorrect or missing, update
                    setTotalReceipts( invoiceObj._id, invoiceObj.receipts, totalReceipts, totalReceiptsOutstanding, itcb );
                }

            }

            //  PAID invoices should have a receipts total which matches the bill total (0 outstanding)
            function ensureInvoicePaid( invoiceObj, itcb ) {
                if ( invoiceObj.price === invoiceObj.totalReceipts && 0.00 === invoiceObj.totalReceiptsOutstanding ) {
                    //  correct, nothing further to do
                    Y.log( `Invoice ${ invoiceObj._id } is paid, totalReceipts is correct: ${ invoiceObj.totalReceipts}`, 'debug', NAME );
                    return itcb( null );
                }

                //  amounts differ or totalReceipts not set
                setTotalReceipts( invoiceObj._id, invoiceObj.receipts, invoiceObj.price || 0.00, 0.00, itcb );
            }

            /*
                NOTE: passing all invoices through the post-processes is very slow in migration on tenants where there
                are tens of thousands of invoices

            function setTotalReceipts( invoiceId, totalReceipts, totalReceiptsOutstanding, itcb ) {
                changeCount = changeCount + 1;

                Y.log( 'Setting invoice ' + invoiceId + ' totalReceipts to: ' + totalReceipts, 'debug', NAME );

                //  amounts differ or totalReceipts not set
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'action': 'put',
                    'model': 'activity',
                    'query': { _id: invoiceId },
                    'data': {
                        'fields_': [ 'totalReceipts', 'totalReceiptsOutstanding' ],
                        'skipcheck_': true,
                        'totalReceipts': totalReceipts,
                        'totalReceiptsOutstanding': totalReceiptsOutstanding
                    },
                    'migrate': inMigration,
                    'callback': itcb
                } );
            }
             */

            //  amounts differ or totalReceipts not set
            function setTotalReceipts( invoiceId, receipts, totalReceipts, totalReceiptsOutstanding, itcb ) {
                changeCount = changeCount + 1;

                Y.log( `Setting invoice ${ invoiceId } totalReceipts to: ${ totalReceipts } outstanding to: ${ totalReceiptsOutstanding}`, 'debug', NAME );

                var
                    mongooseQuery = { _id: invoiceId },
                    mongooseUpdate = {
                        'receipts': receipts,
                        'totalReceipts': totalReceipts,
                        'totalReceiptsOutstanding': totalReceiptsOutstanding
                    };


                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'activity',
                    migrate: inMigration,
                    query: mongooseQuery,
                    data: mongooseUpdate
                }, onMongooseUpdate );

                function onMongooseUpdate( err ) {
                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Could not correct receipt total of invoices: ${ JSON.stringify( err )}`, 'warn', NAME );
                    return callback( null );
                }

                Y.log( `Completed migration to update receipt total on invoices, changed ${ changeCount } of ${ invoiceCount } invoices on tenant: ${ user.tenantId}`, 'info', NAME );
                callback( null );
            }

        }

        /**
         *  Initialize the scheinEmployeeIds field of patients, employee column of patient tables MOJ-9099
         *
         *  @param user
         *  @param inMigration
         *  @param callback
         */

        function setPatientScheinEmployeeIds( user, inMigration, callback ) {
            var
                patientModel,
                patientQuery = {
                    // select only patients which do not have a scheinEmployeeIds field
                    scheinEmployeeIds: { $exists: false }
                },
                changeCount = 0,
                patientCount = 0;

            async.series( [ getPatientModel, streamAllPatients ], onAllDone );

            //  1. Get a activity model (with mongoose model)
            function getPatientModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'patient', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    patientModel = newModel;
                    Y.log( 'Created patient model for checking invoice receipt totals.', 'debug', NAME );
                    itcb( null );
                }
            }

            //  2. Stream all patients
            function streamAllPatients( itcb ) {
                var patientStream;

                function onStreamData( patientObj ) {
                    patientStream.pause();
                    patientObj = JSON.parse( JSON.stringify( patientObj ) );

                    Y.log( `Checking scheinEmployeeIds for patient ${ patientObj._id}`, 'debug', NAME );

                    patientCount = patientCount + 1;

                    Y.doccirrus.api.patient.updateScheinEmployees( user, `${patientObj._id }`, true /* inMigration */, onEmployeeLookup );

                    function onEmployeeLookup( err /*, scheinEmployeeIds */) {
                        if ( err ) {
                            Y.log( `Problem udpating scheinEmployeeIds on patient ${ patientObj._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                            //  continue with migration regardless (best effort)
                        }
                        changeCount = changeCount + 1;
                        patientStream.resume();
                    }
                }

                function onStreamEnd() {
                    Y.log( `Finished processing all ${ patientCount } patients to (re)set scheinEmployeeIds`, 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( `Error in patient stream: ${ JSON.stringify( err )}`, 'debug', NAME );
                    itcb( err );
                }

                Y.log( `Starting stream of all patients: ${ JSON.stringify( patientQuery )}`, 'debug', NAME );

                patientStream = patientModel.mongoose.find( patientQuery, {}, { timeout: true } ).cursor();
                patientStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );
            }

            function onAllDone( err ) {
                if ( err ) {
                    return callback( err );
                }
                Y.log( `Completed migration to to set scheinEmployeeIds on patient ${ changeCount } of ${ patientCount } invoices on tenant: ${ user.tenantId}`, 'info', NAME );
                callback( null );
            }
        }

        /**
         *  Set patientId on documents when linked activity is approved MOJ-9190
         *
         *  When approved, the document can be shared with patients by setting the patientId in document.accessBy
         *
         *  @param user
         *  @param inMigration
         *  @param callback
         */

        function setPatientIdOnDocuments( user, inMigration, callback ) {
            var
                documentModel,
                documentQuery = {
                    type: { $ne: 'dc/form' }
                },
                changeCount = 0,
                documentCount = 0;

            async.series( [ getDocumentModel, streamAllDocuments ], onAllDone );

            //  1. Get a document model (with mongoose model)
            function getDocumentModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'document', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    documentModel = newModel;
                    Y.log( 'Created document model for initializing patientId from attachedTo field.', 'debug', NAME );
                    itcb( null );
                }
            }

            //  2. Stream all patients
            function streamAllDocuments( itcb ) {
                var documentStream;

                function onStreamData( documentObj ) {
                    var setPatientId;

                    documentStream.pause();
                    documentObj = JSON.parse( JSON.stringify( documentObj ) );
                    setPatientId = documentObj.patientId ? documentObj.patientId : null;

                    Y.log( `Checking share status for document ${ documentObj._id}`, 'debug', NAME );

                    documentCount = documentCount + 1;

                    //  if attachedTo is set and is different from activityId then assume it is patientId

                    if ( documentObj.attachedTo && '' !== documentObj.attachedTo ) {
                        setPatientId = documentObj.attachedTo;
                    }

                    if ( documentObj.patientId === setPatientId ) {
                        //  nothing to change, continue with next document
                        documentStream.resume();
                        return;
                    }

                    Y.log( `Document ${ documentObj._id } is shared with patient ${ setPatientId }, updating...`, 'debug', NAME );

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'action': 'update',
                        'model': 'document',
                        'migrate': inMigration,
                        'query': { _id: documentObj._id },
                        'data': {
                            'fields_': [ 'patientId' ],
                            'patientId': setPatientId
                        },
                        callback: onDocumentUpdated
                    } );

                    function onDocumentUpdated( err ) {
                        if ( err ) {
                            Y.log( `Problem udpating scheinEmployeeIds on patient ${ documentObj._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                            //  continue with migration regardless (best effort)
                        }

                        documentStream.resume();
                    }
                }

                function onStreamEnd() {
                    Y.log( `Finished processing all ${ documentCount } documents to (re)set patientId`, 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( `Error in patient stream: ${ JSON.stringify( err )}`, 'debug', NAME );
                    itcb( err );
                }

                Y.log( `Starting stream of all documents: ${ JSON.stringify( documentQuery )}`, 'debug', NAME );

                documentStream = documentModel.mongoose.find( documentQuery, {}, { timeout: true } ).cursor();
                documentStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );
            }

            function onAllDone( err ) {
                if ( err ) {
                    return callback( err );
                }
                Y.log( `Completed migration to to set patientId, changed ${ changeCount } of ${ documentCount } documents on tenant: ${ user.tenantId}`, 'info', NAME );
                callback( null );
            }
        }

        /**
         *  Stream all invoices and add invoiceId to treatments if not already present
         *
         *  @param  {Object}    user            REST user or equivalent
         *  @param  {Boolean}   reportOnly      Only generate report, do not run migration
         *  @param  {Boolean}   removeIfValid   Remove duplicate treatment links from VALID invoices
         *  @param  {Boolean}   inMigration     True if run from migration, and not from dev / support route
         *  @param  {Function}  callback        of the form fn( err, report )
         */

        function setInvoiceIdOnTreatments( user, reportOnly, removeIfValid, inMigration, callback ) {

            let
                activityModel,
                invoiceCount = 0,
                changeCount = 0,

                report = 'MIGRATION: Setting invoiceIds on treatments (where not duplicate)\n',

                invoiceQuery = {
                    'actType': 'INVOICE'
                },
                invoiceFields = {
                    '_id': 1,
                    'status': 1,
                    'activities': 1,
                    'invoiceNo': 1,
                    'price': 1
                };

            async.series( [ getActivityModel, streamAllInvoices ], onAllDone );

            //  1. Get a activity model (with mongoose model)
            function getActivityModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'activity', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    activityModel = newModel;
                    Y.log( 'Created activity model for checking invoice links from treatments.', 'debug', NAME );
                    itcb( null );
                }
            }

            //  2. Stream all invoice activities which are BILLED or PAID
            function streamAllInvoices( itcb ) {
                var invoiceStream;

                function onStreamData( invoiceObj ) {
                    invoiceStream.pause();

                    invoiceObj = JSON.parse( JSON.stringify( invoiceObj ) );
                    invoiceObj.activities = invoiceObj.activities || [];

                    Y.log( `Checking invoice ${ invoiceObj._id } ${ invoiceObj.status } price: ${ invoiceObj.price } totalReceipts: ${ invoiceObj.totalReceipts } receipts: ${ JSON.stringify( invoiceObj.receipts )}`, 'debug', NAME );

                    report = `${report 
                        }Checking invoice ${ invoiceObj._id } ${ invoiceObj.status } ` +
                        `(${ invoiceObj.activities.length } linked activities.) ${ 
                         invoiceObj.invoiceNo ? `(invoiceNo: ${ invoiceObj.invoiceNo }) ` : '' 
                        }\n`;

                    invoiceCount = invoiceCount + 1;

                    checkTreatmentBacklinks( invoiceObj, onInvoiceDone );

                    function onInvoiceDone( err ) {
                        if ( err ) {
                            Y.log( `Problem correcting treatment backlinks totals on invoice ${ invoiceObj._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                            //  continue with migration regardless (best effort)
                        }

                        //  When inMigration, stream the report to the log, report may become very large on some customers
                        if ( inMigration ) {
                            Y.log( report, 'debug', NAME );
                            report = '';
                        } else {
                            report = `${report }\n`;
                        }

                        invoiceStream.resume();
                    }
                }

                function onStreamEnd() {
                    Y.log( `Finished processing all ${ invoiceCount } invoices to set treatment backlinks`, 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( `Error in invoice stream: ${ JSON.stringify( err )}`, 'debug', NAME );
                    itcb( err );
                }

                Y.log( `Starting stream of all invoices: ${ JSON.stringify( invoiceQuery )}`, 'debug', NAME );

                invoiceStream = activityModel.mongoose.find( invoiceQuery, invoiceFields, { timeout: true } ).stream();
                invoiceStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );
            }

            //  Treatments referenced by the invoice should have invoiceId set to the current invoice
            function checkTreatmentBacklinks( invoiceObj, itcb ) {

                if ( 0 === invoiceObj.activities.length ) {
                    //  skip database query if invoice has no linked activities (ie, no treatments)
                    return onTreatmentsLoaded( null, [] );
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activity',
                    'query': {
                        '_id': { $in: invoiceObj.activities },
                        'actType': 'TREATMENT'
                    },
                    'options': {
                        'lean': true,
                        'fields': {
                            '_id': 1,
                            'invoiceId': 1,
                            'invoiceLogId': 1
                        }
                    },
                    'migrate': inMigration,
                    'callback': onTreatmentsLoaded
                } );

                function onTreatmentsLoaded( err, treatments ) {
                    if ( err ) {
                        Y.log( `Could not query receipts for invoice: ${ invoiceObj._id}`, 'warn', NAME );
                        return itcb( err );
                    }

                    let
                        treatmentsToAdd = [],
                        treatmentsToRemove = [],
                        treatment, i;

                    for ( i = 0; i < treatments.length; i++ ) {
                        treatment = treatments[i];

                        //  note correct, existing links
                        if ( treatment.invoiceId === invoiceObj._id ) {
                            report = `${report }Treatment ${ treatment._id } is correctly assigned to invoice ${ invoiceObj._id }\n`;
                        }

                        //  check for duplicate assignment between invoices
                        if ( treatment.invoiceId && treatment.invoiceId !== invoiceObj._id ) {
                            report = `${report 
                                }Treatment ${ treatment._id } is assigned to more than one invoice, ` +
                                `assigned to:${ treatment.invoiceId } ` +
                                `also in: ${ invoiceObj._id }\n`;


                            if ( 'VALID' === invoiceObj.status ) {
                                report = `${report 
                                    }Remove duplicate reference to treatment ${ treatment._id } from VALID invoice ${ invoiceObj._id }\n`;

                                treatmentsToRemove.push( `${treatment._id }` );
                            }
                        }

                        //  Check for duplicate assignments between invoices and other billing processes
                        if ( treatment.invoiceLogId && '' !== treatment.invoiceLogId ) {
                            report = `${report 
                                }Treatment ${ treatment._id } is claimed by invoice ${ invoiceObj.status } ${ invoiceObj._id } ` +
                                `and also references invoiceLogId: ${ treatment.invoiceLogId }\n`;
                        }

                        if ( !treatment.invoiceId || '' === treatment.invoiceId ) {
                            report = `${report 
                                }Treatment ${ treatment._id } is claimed by invoice ${ invoiceObj._id } ` +
                                `but does not refer to it, ${ 
                                 reportOnly ? 'migration will add it.' : 'adding backlink...' }\n`;

                            treatmentsToAdd.push( `${treatment._id }` );
                        }
                    }

                    if ( !reportOnly && 0 !== treatmentsToRemove.length ) {
                        //  no need to wait for this to complete, continue with next invoice
                        report = `${report }Removing treatments from invoice ${ invoiceObj._id }: ${ JSON.stringify( treatmentsToRemove ) }\n`;
                        removeTreatmentsFromInvoice( invoiceObj, treatmentsToRemove );
                    }

                    if ( 0 === treatmentsToAdd.length ) {
                        report = `${report }No treatments to update for this invoice.\n`;
                        return itcb( null );
                    }

                    changeCount = changeCount + 1;

                    report = `${report }Treatments to be updated with invoiceId: ${ JSON.stringify( treatmentsToAdd ) }\n`;
                    if ( reportOnly ) { return itcb( null ); }

                    async.eachSeries( treatmentsToAdd, updateSingleTreatmentId, itcb );

                    function updateSingleTreatmentId( treatmentId, _cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            'user': user,
                            'action': 'update',
                            'model': 'activity',
                            'migrate': inMigration,
                            'query': { _id: treatmentId },
                            'data': {
                                'invoiceId': invoiceObj._id,
                                'fields_': [ 'invoiceId' ]
                            },
                            'callback': _cb
                        } );
                    }

                }

            }

            function removeTreatmentsFromInvoice( invoiceObj, treatmentIds ) {
                let keepLinks = [], i;

                for ( i = 0; i < invoiceObj.activities.length; i++ ) {
                    if ( -1 === treatmentIds.indexOf( invoiceObj.activities[i] ) ) {
                        keepLinks.push( invoiceObj.activities[i] );
                    }
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'action': 'update',
                    'model': 'activity',
                    'migrate': inMigration,
                    'query': { _id: invoiceObj._id },
                    'data': {
                        'activities': keepLinks,
                        'fields_': [ 'activities' ]
                    },
                    'callback': onLinkedActivitiesUpdated
                } );

                function onLinkedActivitiesUpdated( err ) {
                    if ( err ) {
                        report = `${report }Problem updating linked activities for invoice ${ invoiceObj._id }: ${ JSON.stringify( err ) }\n`;
                        Y.log( `Problem updating linked activities for invoice ${ invoiceObj._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                        return;
                    }

                    report = `${report }Linked activities updated for invoice ${ invoiceObj._id }: ${ keepLinks }\n`;
                    Y.log( `Linked activities updated for invoice ${ invoiceObj._id }: ${ keepLinks}`, 'debug', NAME );
                }

            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Could not complete migration to set treatment backlinks to their invoices: ${ JSON.stringify( err )}`, 'warn', NAME );
                    report = `${report }Could not complete migration to set treatment backlinks to their invoices: ${ JSON.stringify( err ) }\n`;

                    //  do not block the rest of the migrations
                    return callback( null, report );
                }

                Y.log( `Completed migration to link treatments to invoices, changed ${ changeCount } of ${ invoiceCount } invoices on tenant: ${ user.tenantId}`, 'info', NAME );

                report = `${report }Completed migration to link treatments to invoices, changed ${ changeCount } of ${ invoiceCount } invoices on tenant: ${ user.tenantId }\n`;
                callback( null, report );
            }
        }

        /**
         *  Check whether the setInvoiceIdOnTreatments shouold be run - special case migration between versions
         *
         *  Overall process:
         *
         *      (*) load twenty invoices from before invoiceId property came into use (valid, approved or billed)
         *      (*) check all treatments from these invoices for an invoiceId
         *      (*) if any treatments are missing invoiceId, run the migration to correct this
         *      (*) log the migration report and call back
         *
         *  @param  {Object}    user
         *  @param  {Boolean}   inMigration
         *  @param  {Function}  callback
         */

        function checkInvoiceIdOnTreatments( user, inMigration, callback ) {
            const
                START_DATE = '2017.06.01',
                END_DATE = '2018.21.01',
                DATE_FORMAT = 'YYYY.MM.DD',
                LIMIT_INVOICES = 20;

            let
                tId = user.tenantId,
                invoices,
                treatments,
                linkedActivities = [],
                needsMigration = false;

            Y.log( 'Special migration - enter checkInvoiceIdOnTreatments, tenantId: ', tId );

            async.series( [ getSampleInvoices, getTreatments, runTreatmentIdMigration ], onAllDone );

            function getSampleInvoices( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'migrate': inMigration,
                    'model': 'activity',
                    'query': {
                        'actType': 'INVOICE',
                        'status': { $nin: [ 'CANCELLED', 'DERECOGNIZED' ] },
                        '$and': [
                            { 'timestamp': { $lt: moment( END_DATE, DATE_FORMAT ) } },
                            { 'timestamp': { $gt: moment( START_DATE, DATE_FORMAT ) } }
                        ]
                    },
                    'options': {
                        'limit': LIMIT_INVOICES,
                        'fields': { '_id': 1, 'activities': 1 }
                    },
                    'callback': onInvoicesLoaded
                } );

                function onInvoicesLoaded( err, result ) {
                    let i;

                    if ( err ) { return itcb( err ); }
                    invoices = result;

                    Y.log( `Special migration - loaded ${ invoices.length } invoices in date range on tenant: ${ tId}`, 'debug', NAME );

                    for ( i = 0; i < invoices.length; i++ ) {
                        if ( invoices[i].activities ) {
                            linkedActivities = linkedActivities.concat( invoices[i].activities );
                        }
                    }

                    Y.log( `Special migration - collected ${ linkedActivities.length } linked activities on tenant: ${ tId}`, 'debug', NAME );
                    itcb( null );
                }
            }

            function getTreatments( itcb ) {
                if ( 0 === linkedActivities.length ) { return itcb( null ); }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'migrate': inMigration,
                    'model': 'activity',
                    'query': {
                        'actType': 'TREATMENT',
                        '_id': { $in: linkedActivities }
                    },
                    'options': {
                        'fields': { '_id': 1, 'invoiceId': 1 }
                    },
                    'callback': onTreatmentsLoaded
                } );

                function onTreatmentsLoaded( err, result ) {
                    let i;

                    if ( err ) { return itcb( err ); }
                    treatments = result;

                    Y.log( `Special migration - loaded ${ treatments.length } treatments in date range on tenant: ${ tId}`, 'debug', NAME );

                    for ( i = 0; i < treatments.length; i++ ) {
                        if ( !treatments[i].invoiceId || '' === treatments[i].invoiceId ) {
                            Y.log( `Special migration - linked treatment ${ treatments[i]._id } is mising invoiceId: ${ treatments[i].invoiceId}`, 'debug', NAME );
                            needsMigration = true;
                        }
                    }

                    itcb( null );
                }
            }

            function runTreatmentIdMigration( itcb ) {
                Y.log( `Special migration - needsMigration ${ needsMigration ? 'TRUE': 'FALSE' } on tenant: ${ tId}`, 'debug', NAME );
                if ( !needsMigration ) { return itcb( null ); }

                setInvoiceIdOnTreatments( user, false, true, inMigration, onMigrationComplete );

                function onMigrationComplete( err, report ) {
                    Y.log( `Finished:\n${ report }\n\n`, 'debug', NAME );
                    itcb( err );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Problem checking / running migration to set treatment invoiceIds: ${ JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }

                callback( null );
            }

        }

        /**
         *  Migration to set referencedBy property of all activities according to new linking rules in activity-schema
         *
         *  @param  {Object}    user            REST user or equivalent
         *  @param  {Boolean}   inMigration     True if run in migration context
         *  @param  {Function}  callback        Of the form fn( err, report )
         */

        function setAllReciprocalLinks( user, inMigration, callback ) {
            const
                ignoreImportedData = {
                    i_extra: { $exists: false }
                };
            let
                activityModel,
                totalActivities = 0,
                activityCount = 0,
                changeCount = 0,

                report = 'MIGRATION: Setting referencedBy on activities (where rules allow)\n',

                activityFields = {
                    '_id': 1,
                    'status': 1,
                    'activities': 1,
                    'icds': 1,
                    'icdsExtra': 1,
                    'receipts': 1,
                    'invoiceId': 1
                };

            async.series( [ getActivityModel, countActivities, streamAllActivities ], onAllDone );

            //  1. Get a activity model (with mongoose model)
            function getActivityModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'activity', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    activityModel = newModel;
                    Y.log( 'Created activity model for checking invoice links from treatments.', 'debug', NAME );
                    itcb( null );
                }
            }

            //  2. Count activities (to note progress in long operation)
            function countActivities( itcb ) {
                activityModel.mongoose.count( ignoreImportedData, onActivityCount );
                function onActivityCount( err, result ) {
                    if ( err ) { return itcb( err ); }
                    totalActivities = result;
                    itcb( null );
                }
            }

            //  3. Stream all activities which may reference other activities
            function streamAllActivities( itcb ) {
                let activityStream = activityModel.mongoose.find( ignoreImportedData, activityFields, { timeout: true } ).stream();

                Y.log( `Starting stream of all ${ totalActivities } activities...`, 'debug', NAME );

                activityStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );

                function onStreamData( activityObj ) {
                    let
                        activity = JSON.parse( JSON.stringify( activityObj ) ),
                        referencesTo = Y.doccirrus.api.linkedactivities.getAllReferences( activity ),
                        pc = Math.floor( activityCount * 100 / totalActivities );

                    activityStream.pause();

                    //Y.log( 'Checking activity ' + activity._id + ' ' + activity.status + ' references: ' + JSON.stringify( referencesTo ) , 'debug', NAME );
                    activityCount = activityCount + 1;

                    report = `${report}(${ activityCount }/${ totalActivities } ${ pc }%) ` +
                        `Checking activity ${ activity._id } ${ activity.status } ` +
                        `(${ referencesTo.length } referenced activities.) ` + `\n`;

                    checkReciprocalLinks( activity, referencesTo, onReciprocalLinksSet );

                    function onReciprocalLinksSet( err ) {
                        if ( err ) {
                            Y.log( `Problem correcting reciprocal links for activity ${ activity._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                            //  continue with migration regardless (best effort, ignore junk references)
                        }

                        //  This migration - and its report - can be very large, stream report to the log to prevent memory exhaution
                        Y.log( report.trim(), 'debug', NAME );
                        report = '';

                        activityStream.resume();
                    }
                }

                function onStreamEnd() {
                    Y.log( `Finished processing all ${ activityCount } activities to set referencedBy backlinks`, 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( `Error in activity stream: ${ JSON.stringify( err )}`, 'debug', NAME );
                    itcb( err );
                }

            }

            /**
             *  For each child activity referenced by the parent/current activity, make sure the current activity._id
             *  is in the child.referencedBy property.
             *
             *  @param {Object}     activity
             *  @param {Object}     referencesTo
             *  @param {Function}   itcb            Of the form fn( err )
             */

            //  TODO: consider clearing other backlink types here (invoiceId, etc)
            //  TODO: consider adding check for broken links here

            function checkReciprocalLinks( activity, referencesTo = [], itcb ) {

                if( !referencesTo.length ) {
                    return itcb();
                }

                activityModel.mongoose.update(
                        { '_id': { '$in': referencesTo } },
                        { $addToSet: { referencedBy: activity._id.toString() } },
                        { multi: true }
                    )
                    .then( () => {
                        return activityModel.mongoose.update( {
                            '_id': { '$in': referencesTo },
                            actType: {
                                $in: [ 'MEDICATION', 'RECEIPT' ]
                            },
                            activities: {
                                $exists: true,
                                $not: { $size: 0 }
                            }
                        }, { $set: { activities: [] } }, { multi: true } );
                    } )
                    .then( () => {
                        itcb();
                    } )
                    .catch( err => {
                        itcb( err );
                    } );

            }

            function onAllDone( err ) {
                if ( err ) {
                    let errStr = JSON.stringify( err );
                    Y.log( `Could not complete migration to initialize reciprocal links on activities: ${errStr}`, 'warn', NAME );
                    report = `${report}Could not complete migration to initialize reciprocal links on activities: ${errStr}\n`;

                    //  do not block the rest of the migrations
                    return callback( null, report );
                }

                Y.log( `Completed migration to initialize reciprocal links on activities, changed ${changeCount} of ${activityCount} activities on tenant: ${user.tenantId}`, 'info', NAME );

                report = `${report}Completed migration to initialize reciprocal links on activities, changed ${changeCount} of ${activityCount} invoices on tenant: ${user.tenantId}\n`;
                callback( null, report );
            }
        }

        /**
         *  Remove extra spaces in JSON of profiles (localStorage values)
         *
         *  @param  {Object}    user            REST user or equivalent
         *  @param  {Boolean}   inMigration     True if run from migration, false from support/dev route
         *  @param  {Function}  callback        Of the form fn( err )
         */

        function fixJSONInProfiles( user, inMigration, callback ) {
            let
                profileModel,
                totalProfiles = 0,
                profileCount = 0,
                changeCount = 0,

                report = 'MIGRATION: Correcting JSON formatting in stored user profiles\n';


            async.series( [ getProfileModel, countActivities, streamAllActivities ], onAllDone );

            //  1. Get a profile model (with mongoose model)
            function getProfileModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'profile', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    profileModel = newModel;
                    Y.log( 'Created profile model for checking JSON in saved localStorage values.', 'debug', NAME );
                    itcb( null );
                }
            }

            //  2. Count activities (to note progress in long operation)
            function countActivities( itcb ) {
                profileModel.mongoose.count( {}, onProfileCount );
                function onProfileCount( err, result ) {
                    if ( err ) { return itcb( err ); }
                    totalProfiles = result;
                    itcb( null );
                }
            }

            //  3. Stream all invoice activities which are BILLED or PAID
            function streamAllActivities( itcb ) {
                let profileStream = profileModel.mongoose.find( {}, {}, { timeout: true } ).stream();

                Y.log( `Starting stream of all ${ totalProfiles } profiles...`, 'debug', NAME );

                profileStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );

                function onStreamData( profileObj ) {
                    let
                        profile = JSON.parse( JSON.stringify( profileObj ) ),
                        pc = Math.floor( profileCount * 100 / totalProfiles );

                    profileStream.pause();

                    report = `${report}(${ profileCount }/${ totalProfiles } ${ pc }%) Checking profile ${ profile._id }\n`;
                    profileCount = profileCount + 1;

                    correctJSONInProfile( profile, onJSONCorrected );

                    function onJSONCorrected( err ) {
                        if ( err ) {
                            Y.log( `Problem correcting JSON in stored profiles ${ profile._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                            //  continue with migration regardless (best effort)
                        }

                        if ( inMigration ) {
                            //  stream the report to log during migration, return to caller if manually run from API
                            Y.log( report, 'debug', NAME );
                            report = '';
                        }


                        profileStream.resume();
                    }
                }

                function onStreamEnd() {
                    Y.log( `Finished processing all ${ profileCount } profiles.`, 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( `Error in profile stream: ${ JSON.stringify( err )}`, 'debug', NAME );
                    itcb( err );
                }

            }

            function correctJSONInProfile( profile, itcb ) {
                let
                    needsSave = false,
                    localStorage = profile.config && profile.config.localStorage ? profile.config.localStorage : null,
                    i, k;

                if ( !localStorage ) {
                    Y.log( `Profile does not have localStorage value: ${profile._id}`, 'debug', NAME );
                    return itcb( null );
                }

                for ( k in localStorage ) {
                    if ( localStorage.hasOwnProperty( k ) ) {

                        let
                            parts = k.split( '_' );

                        if ( parts.length > 1 && 'printers' === parts[1] ) {
                            let printers = JSON.parse( localStorage[k] );
                            Y.log( `Correcting printers for key: ${k}`, 'debug', NAME );

                            for ( i = 0; i < printers.length; i++ ) {
                                if ( printers[i].name ) {
                                    Y.log( `Correcting printer: ${k} --> ${printers[i].name}`, 'debug', NAME );
                                    printers[i] = tidyPrinter( printers[i] );
                                }
                            }

                            profile.config.localStorage[k] = JSON.stringify( printers );
                            needsSave = true;
                        }
                    }
                }

                if ( !needsSave ) {
                    Y.log( `No update to profile ${profile._id} resuming...`, 'debug', NAME );
                    return itcb( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'profile',
                    'action': 'update',
                    'query': { '_id': profile._id },
                    'data': { 'config': profile.config },
                    'fields': [ 'config' ],
                    'callback': onProfileUpdated
                } );

                function onProfileUpdated( err, result ) {
                    if ( err ) {
                        Y.log( `Problem updating profile to correct stored JSON: ${JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err  );
                    }

                    //console.log( 'Correcting localStorage values on profile ' + profile._id + ': ', profile.config.localStorage );
                    Y.log( `Updated profile ${profile._id}, result : ${JSON.stringify( result )}`, 'debug', NAME );
                    itcb( null );
                }
            }

            function tidyPrinter( printer ) {
                let k;
                for ( k in printer ) {
                    if ( printer.hasOwnProperty( k ) ) {
                        if ( 'string' === typeof printer[k] ) {
                            printer[k] = printer[k].trim();
                        }
                    }
                }
                return printer;
            }

            function onAllDone( err ) {
                if ( err ) {
                    let errStr = JSON.stringify( err );
                    Y.log( `Could not complete migration to initialize reciprocal links on activities: ${errStr}`, 'warn', NAME );
                    report = `${report}Could not complete migration to initialize reciprocal links on activities: ${errStr}\n`;

                    //  do not block the rest of the migrations
                    return callback( null, report );
                }

                let msg = `Completed migration to correct JSON serialization in stored profiles, changed ${changeCount} of ${profileCount} profiles on tenant: ${user.tenantId}`;
                Y.log( msg, 'info', NAME );
                report = `${report}${msg}\n`;

                callback( null, report );
            }

        }

        /**
         *  Stream all LABDATA activities and set labEntries property to array of parsed/simplified values
         *
         *  Note: to be extended to MEDDATA types, including inGyn and inPedia, to allow mapping together in forms.
         *
         *  @param  {Object}    user
         *  @param  {Boolean}   regenerateAll
         *  @param  {Boolean}   inMigration
         *  @param  {Function}  callback
         */

        function updateLabEntries( user, regenerateAll, inMigration, callback ) {
            let
                activityModel,
                totalActivities = 0,
                activityCount = 0,
                changeCount = 0,

                query = { 'actType': 'LABDATA' };


            Y.log( `MIGRATION: Setting labEntries on all LABDATA activities, tenant: ${user.tenantId}`, 'info', NAME );

            async.series( [ getActivityModel, countActivities, streamAllActivities ], onAllDone );

            //  1. Get a activity model (with mongoose model)
            function getActivityModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'activity', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    activityModel = newModel;
                    Y.log( 'Created activity model for updating LABDATA activities with pre-parsed entries.', 'info', NAME );
                    itcb( null );
                }
            }

            //  2. Count LABDATA activities (to note progress in long operation)
            function countActivities( itcb ) {
                activityModel.mongoose.count( query, onActivityCount );
                function onActivityCount( err, result ) {
                    if ( err ) { return itcb( err ); }
                    totalActivities = result;
                    itcb( null );
                }
            }

            //  3. Stream all activities which may need labEntry update
            function streamAllActivities( itcb ) {
                let activityStream = activityModel.mongoose.find( query, {}, { timeout: true } ).stream();

                Y.log( `Starting stream of all ${ totalActivities } LABDATA activities...`, 'info', NAME );

                activityStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );

                function onStreamData( activityObj ) {
                    let
                        activity = JSON.parse( JSON.stringify( activityObj ) ),
                        pc = Math.floor( activityCount * 100 / totalActivities ),
                        progressStr = `(${ activityCount }/${ totalActivities } ${ pc }%) `;

                    if ( activity.labEntries && !regenerateAll ) {
                        Y.log( `${progressStr}Skipping LABDATA activity ${activity._id} ${activity.status} (done)`, 'debug', NAME );
                        return;
                    }

                    Y.log( `${progressStr}Checking LABDATA activity ${activity._id} ${activity.status}`, 'debug', NAME );
                    activityCount = activityCount + 1;
                    activityStream.pause();
                    reGenerateLabEntries( activity, onLabEntriesSet );

                    function onLabEntriesSet( err ) {
                        if ( err ) {
                            Y.log( `Problem correcting labEntries for ${ activity._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                            //  continue with migration regardless (best effort, ignore junk references)
                        }

                        changeCount = changeCount + 1;
                        activityStream.resume();
                    }
                }

                function onStreamEnd() {
                    Y.log( `Finished processing all ${ activityCount } activities to set labEntries, ${changeCount} updated`, 'info', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( `Error in activity stream: ${ JSON.stringify( err )}`, 'error', NAME );
                    itcb( err );
                }
            }

            function reGenerateLabEntries( activity, itcb ) {
                activity.labEntries = Y.doccirrus.api.lab.getLabEntries( activity );

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activity',
                    'action': 'update',
                    'query': { '_id': activity._id },
                    'data': { 'labEntries': activity.labEntries },
                    'callback': onSavedLabEntries
                } );

                function onSavedLabEntries( err /*, result */ ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( `Set labEntries on activity: ${activity._id}`, 'debug', NAME );
                    itcb( null );
                }

            }

            function onAllDone( err ) {
                if ( err ) { return callback( err ); }
                Y.log( `labEntries migration complete for tenant: ${user.tenantId}`, 'debug', NAME );
                callback( null );
            }
        }

        /**
         *  Stream all LABDATA activities and set labEntries property to array of parsed/simplified values
         *
         *  @param  {Object}    user
         *  @param  {Boolean}   regenerateAll
         *  @param  {Boolean}   inMigration
         *  @param  {Function}  callback
         */

        function updateMeddataLabEntries(  user, regenerateAll, inMigration, callback ) {
            let
                activityModel,
                totalActivities = 0,
                activityCount = 0,
                changeCount = 0,
                actTypes = [ 'MEDDATA', 'PERCENTILECURVE' ],
                query = { 'actType': { $in: actTypes } };

            Y.log( `MIGRATION: Setting labEntries on MEDDATA activities ${JSON.stringify(actTypes)} tenant: ${user.tenantId}`, 'debug', NAME );

            async.series( [ getActivityModel, countActivities, streamAllActivities ], onAllDone );

            //  1. Get a activity model (with mongoose model)
            function getActivityModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'activity', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    activityModel = newModel;
                    Y.log( 'Created activity model for updating MEDDATA activities with pre-parsed entries.', 'debug', NAME );
                    itcb( null );
                }
            }

            //  2. Count MEDDATA activities (to note progress in long operation)
            function countActivities( itcb ) {
                activityModel.mongoose.count( query, onActivityCount );
                function onActivityCount( err, result ) {
                    if ( err ) { return itcb( err ); }
                    totalActivities = result;
                    itcb( null );
                }
            }

            //  3. Stream all activities which may need labEntry update
            function streamAllActivities( itcb ) {
                let activityStream = activityModel.mongoose.find( query, {}, { timeout: true } ).stream();

                Y.log( `Starting stream of all ${ totalActivities } MEDDATA activities...`, 'debug', NAME );

                activityStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );

                function onStreamData( activityObj ) {
                    let
                        activity = JSON.parse( JSON.stringify( activityObj ) ),
                        pc = Math.floor( activityCount * 100 / totalActivities ),
                        progressStr = `(${ activityCount }/${ totalActivities } ${ pc }%) `;

                    if ( activity.labEntries && !regenerateAll ) {
                        Y.log( `${progressStr}Skipping ${activity.actType} activity ${activity._id} ${activity.status} (done)`, 'debug', NAME );
                        return;
                    }

                    Y.log( `${progressStr}Checking ${activity.actType} activity ${activity._id} ${activity.status}`, 'debug', NAME );
                    activityCount = activityCount + 1;
                    activityStream.pause();
                    reGenerateLabEntries( activity, onLabEntriesSet );

                    function onLabEntriesSet( err ) {
                        if ( err ) {
                            Y.log( `Problem correcting labEntries for ${ activity._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                            //  continue with migration regardless (best effort, ignore junk references)
                        }

                        changeCount = changeCount + 1;
                        activityStream.resume();
                    }
                }

                function onStreamEnd() {
                    Y.log( `Finished processing all ${ activityCount } activities to set labEntries, ${changeCount} updated`, 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( `Error in activity stream: ${ JSON.stringify( err )}`, 'debug', NAME );
                    itcb( err );
                }
            }

            function reGenerateLabEntries( activity, itcb ) {
                activity.labEntries = Y.doccirrus.api.lab.getMeddataAsLabEntries( activity );

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activity',
                    'action': 'update',
                    'query': { '_id': activity._id },
                    'data': { 'labEntries': activity.labEntries },
                    'callback': onSavedLabEntries
                } );

                function onSavedLabEntries( err /*, result */ ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( `Set labEntries on ${activity.actType} activity: ${activity._id}`, 'debug', NAME );
                    itcb( null );
                }

            }

            function onAllDone( err ) {
                if ( err ) { return callback( err ); }
                Y.log( `labEntries migration complete for tenant: ${user.tenantId}`, 'debug', NAME );
                callback( null );
            }
        }

        /**
         *  Recreate totalReceipts and totalReceiptsOutstanding for invoices, as may be affected by rounding error MOJ-10640
         *
         *  @param  {Object}    user            REST user or equivalent
         *  @param  {Boolean]   inMigration     True if run by migration, false if run from support route after startup
         *  @param  {Function}  callback        Of the form fn(err)
         */

        function checkInvoiceBalance( user, inMigration, callback ) {
            let
                activityModel,
                invoiceCount = 0,
                changeCount = 0,

                report = 'MIGRATION: correcting totalReceipts on invoices (MOJ-10640)\n',

                invoiceQuery = {
                    'actType': 'INVOICE'
                },

                invoiceFields = {
                    '_id': 1,
                    'status': 1,
                    'activities': 1,
                    'receipts': 1,
                    'invoiceNo': 1,
                    'price': 1,
                    'totalReceipts': 1,
                    'totalReceiptsOutstanding': 1
                };

            async.series( [ getActivityModel, streamAllInvoices ], onAllDone );

            //  1. Get a activity model (with mongoose model)
            function getActivityModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'activity', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    activityModel = newModel;
                    Y.log( 'Created activity model for checking invoice links from treatments.', 'debug', NAME );
                    itcb( null );
                }
            }

            //  2. Stream all invoice activities which are BILLED or PAID
            function streamAllInvoices( itcb ) {
                var invoiceStream;

                function onStreamData( invoiceObj ) {
                    invoiceStream.pause();

                    invoiceObj = JSON.parse( JSON.stringify( invoiceObj ) );
                    invoiceObj.activities = invoiceObj.activities || [];

                    Y.log( `Checking invoice ${ invoiceObj._id } ${ invoiceObj.status } price: ${ invoiceObj.price } totalReceipts: ${ invoiceObj.totalReceipts } receipts: ${ JSON.stringify( invoiceObj.receipts )}`, 'debug', NAME );

                    report = `${report
                            }Checking invoice ${ invoiceObj._id } ${ invoiceObj.status } ` +
                        `(${ invoiceObj.activities.length } linked activities.) ${
                            invoiceObj.invoiceNo ? `(invoiceNo: ${ invoiceObj.invoiceNo }) ` : ''
                            }\n`;

                    invoiceCount = invoiceCount + 1;

                    correctInvoiceTotal( invoiceObj, onInvoiceDone );

                    function onInvoiceDone( err ) {
                        if ( err ) {
                            Y.log( `Problem correcting treatment backlinks totals on invoice ${ invoiceObj._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                            //  continue with migration regardless (best effort)
                        }

                        //  When inMigration, stream the report to the log, report may become very large on some customers
                        if ( inMigration ) {
                            Y.log( report, 'debug', NAME );
                            report = '';
                        } else {
                            report = `${report }\n`;
                        }

                        invoiceStream.resume();
                    }
                }

                function onStreamEnd() {
                    Y.log( `Finished processing all ${ invoiceCount } invoices to set treatment backlinks`, 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( `Error in invoice stream: ${ JSON.stringify( err )}`, 'debug', NAME );
                    itcb( err );
                }

                Y.log( `Starting stream of all invoices: ${ JSON.stringify( invoiceQuery )}`, 'debug', NAME );

                invoiceStream = activityModel.mongoose.find( invoiceQuery, invoiceFields, { timeout: true } ).stream();
                invoiceStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );
            }

            //  Check the price and receipt totals of a single ivnoice
            async function correctInvoiceTotal( invoiceObj, itcb ) {

                let
                    compare = {
                        'price': invoiceObj.price,
                        'totalReceipts': invoiceObj.totalReceipts,
                        'totalReceiptsOutstanding': invoiceObj.totalReceiptsOutstanding
                    },

                    recalcTotalReceipts,
                    dbQuery,
                    putData,
                    err;

                if ( 'undefined' === typeof invoiceObj.price ) {
                    invoiceObj.price = 0;
                }

                if ( 'undefined' === typeof invoiceObj.totalReceipts ) {
                    invoiceObj.totalReceipts = 0;
                }

                if ( 'undefined' === typeof invoiceObj.totalReceiptsOutstanding ) {
                    invoiceObj.totalReceiptsOutstanding = 0;
                }

                // MOJ-9057 Outstanding receipts are calculated from price, not total.
                if ( 'number' === typeof invoiceObj.price ) {
                    invoiceObj.price = parseFloat( invoiceObj.price || 0 );
                }

                recalcTotalReceipts = await getTotalReceipts( invoiceObj );

                invoiceObj.totalReceipts = recalcTotalReceipts;
                invoiceObj.totalReceiptsOutstanding = invoiceObj.price - invoiceObj.totalReceipts;

                //  When an invoice is marked as PAID or ARCHIVED the remaining balance is set to 0, MOJ-6627
                //  Note that this behavior is currently under review and may soon be replaced EXTMOJ-1868

                if( 'CREDITED' === invoiceObj.status || 'ARCHIVED' === invoiceObj.status ) {
                    invoiceObj.totalReceipts = invoiceObj.price;
                    invoiceObj.totalReceiptsOutstanding = 0;
                }

                //  if nothing was changed then there is no need to update the invoice
                if (
                    compare.price === invoiceObj.price &&
                    compare.totalReceipts === invoiceObj.totalReceipts &&
                    compare.totalReceiptsOutstanding === invoiceObj.totalReceiptsOutstanding
                ) {
                    return itcb( null );
                }

                //  invoice should be updated with corrected ammount

                putData = {
                    'price': invoiceObj.price,
                    'totalReceipts': invoiceObj.totalReceipts,
                    'totalReceiptsOutstanding': invoiceObj.totalReceiptsOutstanding
                };

                dbQuery =  {
                    'user': user,
                    'model': 'activity',
                    'query': { _id: invoiceObj._id },
                    'action': 'update',
                    'migrate': inMigration,
                    'data': Y.doccirrus.filters.cleanDbObject( putData )
                };

                [ err ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( dbQuery ) );

                if ( err ) {
                    report = report + `Problem updating invoice ${invoiceObj._id} ${invoiceObj.invoiceNo}: ${err.stack||err}\n`;
                    //  continue despite error
                    return itcb( null );
                }

                report = report + `Updated invoice ${invoiceObj._id} ${invoiceObj.invoiceNo}: ${invoiceObj.price} ${invoiceObj.totalReceipts} ${invoiceObj.totalReceiptsOutstanding}\n`;
                changeCount = changeCount + 1;
                itcb( null );
            }

            /**
             *  Load receipts linked from this invoice and calculate total
             *  @param invoiceObj
             *  @return {Promise<number>}
             */

            async function getTotalReceipts( invoiceObj ) {

                let
                    dbQuery = {
                        'action': 'get',
                        'model': 'activity',
                        'query': { '_id': { '$in': invoiceObj.receipts || [] } },
                        'migrate': inMigration,
                        'user': user
                    },

                    err, result,
                    total = 0, i;

                //  if no receipts linked from this invoice then nothing to do
                if ( !invoiceObj.receipts || 0 === invoiceObj.receipts.length ) { return total; }

                [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( dbQuery ) );

                if ( err ) {
                    //  should not happen
                    Y.log( `Could not load receipts for invoice ${invoiceObj._id.toString()}: ${JSON.stringify(invoiceObj.receipts)}`, 'warn', NAME );
                    return total;
                }

                if ( result ) {
                    for ( i = 0; i < result.length; i++ ) {
                        if ( result[i].amount ) {
                            total = total + parseFloat( result[i].amount  );
                        }
                    }
                }

                return total;
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Could not correct receipt total of invoices: ${ JSON.stringify( err )}`, 'warn', NAME );
                    return callback( null );
                }

                Y.log( `Completed migration to update receipt total on invoices, changed ${ changeCount } of ${ invoiceCount } invoices on tenant: ${ user.tenantId}`, 'info', NAME );
                callback( null, report );
            }

        }

        /**
         *  Utility method to stream all patients and run a callback for each result
         *
         *  @param  {Object}    user
         *  @param  {Boolean}   inMigration
         *  @param  {String}    modelName
         *  @param  {Object}    query
         *  @param  {Object}    fields          Fields to return
         *  @param  {Function}  callForEach     Called once per document matching query
         *  @param  {Function}  callback        Of the form fn( err )
         */

        function streamFromQuery( user, inMigration, modelName, query, fields, callForEach, callback ) {
            var
                dbModel,
                dbStream;

            Y.doccirrus.mongodb.getModel( user, modelName, inMigration, onModelLoaded );

            function onModelLoaded( err, newModel ) {
                if ( err ) { return callback( err ); }
                dbModel = newModel;
                Y.log( 'Created model for streaming patients.', 'debug', NAME );

                dbStream = dbModel.mongoose.find( query, fields, { timeout: true } ).stream();
                dbStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );

            }

            async function onStreamData( docObj ) {
                dbStream.pause();
                callForEach( docObj, onPatientHandled );

                function onPatientHandled( err ) {
                    if ( err ) {
                        Y.log( `Problem while migrating ${modelName} ${ docObj._id }: ${err.stack||err}`, 'warn', NAME );
                        //  continue with migration regardless (best effort)
                    }
                    dbStream.resume();
                }
            }

            function onStreamEnd() {
                Y.log( `Finished streaming all ${modelName} documents`, 'debug', NAME );
                callback( null );
            }

            function onStreamError( err ) {
                Y.log( `Error in stream: ${ JSON.stringify( err )}`, 'debug', NAME );
                callback( err );
            }

        }

        /**
         *  Clean up __placeholder__ markers in patients, EXTMOJ-1841
         *
         *  @param user
         *  @param inMigration
         *  @param callback
         */

        function removePlaceholderMarkers( user, inMigration, callback ) {
            const
                //dcUtils = require( 'dc-core' ).utils,
                //formatPromiseResult = dcUtils.formatPromiseResult,
                PLACEHOLDER_STRING = '__placeholder__';

            let
                patientCount = 0,
                changeCount = 0,

                report = 'MIGRATION: correcting totalReceipts on invoices (MOJ-10640)\n',

                patientQuery = {
                    'markers': { $exists: true },
                    'markers.0': { $exists: true }
                },

                patientFields = {
                    '_id': 1,
                    'firstname': 1,
                    'lastname': 1,
                    'markers': 1
                };

            Y.log( `Enter removePlaceholderMarkers on tenant ${user.tenantId}`, 'info', NAME );

            streamFromQuery( user, inMigration, 'patient', patientQuery, patientFields, onStreamPatient, onAllDone );

            function onStreamPatient( patientObj, itcb ) {
                let
                    newMarkers = [],
                    foundPlaceholder = false,
                    i;

                patientCount = patientCount + 1;

                Y.log( `Checking patient markers for ${patientObj._id} ${patientObj.firstname} ${patientObj.lastname}`, 'debug', NAME );

                for ( i = 0; i < patientObj.markers.length; i++ ) {
                    if ( PLACEHOLDER_STRING === patientObj.markers[i] ) {
                        foundPlaceholder = true;
                    } else {
                        newMarkers.push( patientObj.markers[i] );
                    }
                }

                //  if no placeholder markers then we're done with this patient, no need to change anything
                if ( !foundPlaceholder ) { return itcb( null ); }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'patient',
                    'action': 'update',
                    'query': { '_id': patientObj._id },
                    'data': { 'markers': newMarkers },
                    'options': { migrate: inMigration },
                    'callback': itcb
                } );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Could not correct markers on patients: ${err.stack||err}`, 'warn', NAME );
                    return callback( null );
                }

                Y.log( `Completed migration to correct placeholder markers, updated ${ changeCount } of ${ patientCount } patients on tenant: ${ user.tenantId}`, 'info', NAME );
                callback( null, report );
            }
        }

        /**
         *  Correct old EBM prices from Kette to new catalog values MOJ-10729 SUP-12955 SUP-13053 SUP-13040
         *
         *  @param  {Object}    user
         *  @param  {Boolean}   inMigration     False if run from support route
         *  @param  {Function}  callback
         */

        async function correctEBMPrices( user, inMigration, callback ) {
            const
                dcUtils = require( 'dc-core' ).utils,
                formatPromiseResult = dcUtils.formatPromiseResult,
                START_DATE = '2019-01-01T00:00:00.0001Z';

            let
                err, result,

                activityCount = 0,
                changeCount = 0,

                invoiceConfig,
                currentBillingFactor,

                invoiceConfigParams = {
                    'user': user,
                    'model': 'invoiceconfiguration',
                    'query': {},
                    'options': { 'migrate': inMigration }
                },

                activityQuery = {
                    'actType': 'TREATMENT',
                    'catalogShort': 'EBM',
                    'timestamp': { '$gt': new Date( START_DATE ) }
                },

                activityFields = {};

            //  load invoice configuration
            [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( invoiceConfigParams ) );
            if ( !err && !result[0] ) { err = new Error( 'Missing invoice configuration, cannot get billing factor' ); }
            if ( err ) { return callback( err ); }

            invoiceConfig = result[0];

            //  get current billing factor from invoice configuration
            currentBillingFactor = getBillingFactorValue( invoiceConfig, new Date() );

            Y.log( `Start migration to correct 2019 EBM prices on tenant ${user.tenantId}`, 'info', NAME );
            Y.log( `Current billing factor value: ${currentBillingFactor}`, 'info', NAME );

            //  stream all EBM treatments since start of 2019
            streamFromQuery( user, inMigration, 'activity', activityQuery, activityFields, onStreamTreatment, onAllDone );

            async function onStreamTreatment( treatmentObj, itcb ) {
                let
                    originalPrice = treatmentObj.price,
                    originalCatalogRef = treatmentObj.catalogRef,
                    catalogEntry,
                    err;

                activityCount = activityCount + 1;

                [ err, catalogEntry ] = await formatPromiseResult( getCatalogEntryForTreatment( user, inMigration, treatmentObj ) );

                if ( err ) {
                    Y.log( `Could not load catalog entry for EBM treatment ${treatmentObj._id.valueOf}: ${err.stack||err}`, 'warn', NAME );
                    return itcb( err );
                }

                checkTreatmentPrice( treatmentObj, catalogEntry, currentBillingFactor );

                if ( treatmentObj.price === originalPrice && treatmentObj.catalogRef === originalCatalogRef ) {
                    //  only save if price or catalog reference has changed
                    return itcb( null );
                }

                Y.log( `EBM Treatment ${treatmentObj.code} has changed from ${originalPrice} to ${treatmentObj.price} saving new price and catalog information.`, 'info', NAME );

                let
                    dbUpdate = {
                        'catalogRef': treatmentObj.catalogRef,
                        'price': treatmentObj.price,                           //  display only, always Euro
                        'unit': treatmentObj.unit,                             //  "Euro"
                        'actualUnit': treatmentObj.actualUnit,                 //  "Punkte" or "Euro"
                        'actualPrice': treatmentObj.actualPrice,               //  may be in points
                        'billingFactorValue': treatmentObj.billingFactorValue, //  time / location sensitive
                        'u_extra': treatmentObj.u_extra
                    };

                changeCount = changeCount + 1;

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activity',
                    'action': 'update',
                    'query': { _id: treatmentObj._id },
                    'data': dbUpdate,
                    'migrate': inMigration,
                    'callback': itcb
                } );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Could not correct catalog prices on 2019 EBM treatments: ${err.stack||err}`, 'warn', NAME );
                    return callback( null );
                }

                Y.log( `Completed migration to correct prices from EBM catalog, updated ${ changeCount } of ${ activityCount } treatments on tenant: ${ user.tenantId}`, 'info', NAME );
                callback( null );
            }
        }

        /**
         *  Find EBM treatments in activitysequences / Kette and correct prices to match current catalog MOJ-10729 SUP-12955 SUP-13053 SUP-13040
         *
         *  @param  {Object}    user
         *  @param  {Boolean}   inMigration     False if run from support route
         *  @param  {Function}  callback
         */

        async function correctEBMKettePrices( user, inMigration, callback ) {
            Y.log( `Starting migration to update EBM prices in activitysequences on tenant: ${user.tenantId}`, 'info', NAME );

            const
                dcUtils = require( 'dc-core' ).utils,
                formatPromiseResult = dcUtils.formatPromiseResult;

            let
                err, result,
                invoiceConfigParams = {
                    'user': user,
                    'model': 'invoiceconfiguration',
                    'query': {},
                    'migrate': inMigration
                },

                invoiceConfig,
                currentBillingFactor;

            //  load invoice configuration
            [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( invoiceConfigParams ) );
            if ( !err && !result[0] ) { err = new Error( 'Missing invoice configuration, cannot get billing factor' ); }
            if ( err ) { return callback( err ); }

            invoiceConfig = result[0];

            //  get current billing factor from invoice configuration
            currentBillingFactor = getBillingFactorValue( invoiceConfig, new Date() );

            Y.log( `Checking EBM price in activity seqeuences against current billing factor value: ${currentBillingFactor}`, 'info', NAME );

            //  stream all activitysequences, check EBM treatments
            streamFromQuery( user, inMigration, 'activitysequence', {}, {}, onHaveSequence, callback );

            async function onHaveSequence( sequenceObj, itcb ) {
                let
                    hasEBMTreatments,
                    activityObj,
                    catalogEntry,
                    err,
                    i;

                Y.log( `Checking activity sequence: ${sequenceObj._id.valueOf()} ${sequenceObj.title} activities: ${sequenceObj.activities.length}`, 'info', NAME );

                if ( !sequenceObj.activities ) { return itcb( null ); }

                for ( i = 0; i < sequenceObj.activities.length; i++ ) {
                    activityObj = sequenceObj.activities[i];

                    if ( 'TREATMENT' === activityObj.actType && 'EBM' === activityObj.catalogShort ) {
                        Y.log( `[i] checking EBM TREATMENT activity in sequence ${activityObj._id.valueOf()} ${activityObj.actType} ${activityObj.code} ${activityObj.price}`, 'info', NAME );

                        hasEBMTreatments = true;

                        //  get current catalog entry for this treatment template
                        [ err, catalogEntry ] = await formatPromiseResult( getCatalogEntryForTreatment( user, inMigration, activityObj ) );

                        if ( err ) {
                            //  can happen due to missing catalogs, unknown locations, or other bad data stored in Kette
                            Y.log( `Could not get catalog entry for EBM treatment: ${err.stack||err}`, 'warn', NAME );
                            //  continue with migration, best effort...
                        } else {
                            //  check saved activity in Kette against current catalog, update price, actualPrice, unit, etc
                            checkTreatmentPrice( activityObj, catalogEntry, currentBillingFactor );
                        }
                    }
                }

                if ( !hasEBMTreatments ) {
                    //  no treatments to update, no need to save
                    return itcb( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activitysequence',
                    'action': 'update',
                    'query': { '_id': sequenceObj._id },
                    'data': { 'activities': sequenceObj.activities },
                    'migrate': inMigration,
                    'callback': itcb
                } );
            }

        }

        /**
         *  Helper to get the billing factor value for an activity given its timestamp
         *
         *  @param  {Object}    invoiceConfig   invoice configuration document from database
         *  @param  {Mixed}     timestamp       date string, moment or date object
         *  @return {Promise}
         */

        function getBillingFactorValue( invoiceConfig, timestamp ) {
            const BILLING_FACTOR_VALUE_2019 = '0.108226';

            let
                billingFactor = BILLING_FACTOR_VALUE_2019,
                lastMatch,
                bestMatch,
                activityDate = moment( timestamp );

            //  check invoice configuration for matching / best billing factor period
            invoiceConfig.invoicefactors.forEach( checkInvoiceFactor );

            function checkInvoiceFactor( factor ) {
                let current = moment( factor.year, 'YYYY' ).quarter( +factor.quarter ).startOf( 'quarter' ).hour( 0 ).minutes( 0 ).seconds( 0 );

                if( +factor.year === activityDate.year() && +factor.quarter === activityDate.quarter() ) {
                    bestMatch = factor;
                } else if( activityDate.isAfter( current ) && (!lastMatch || current.isAfter( lastMatch )) ) {
                    lastMatch = factor;
                }
            }

            if ( lastMatch && lastMatch.factor ) { billingFactor = lastMatch.factor; }
            if ( bestMatch && bestMatch.factor ) { billingFactor = bestMatch.factor; }

            //  return the billing factor
            Y.log( `Using billing factor for EBM treatments: ${billingFactor}`, 'info', NAME );
            return billingFactor;
        }

        /**
         *  Look up catalog entry for an EBM treatment code, wrap as promise
         *  @param user
         *  @param treatmentObj
         *  @return {Promise}
         */

        function getCatalogEntryForTreatment( user, inMigration, treatmentObj ) {
            return new Promise( function( resolve, reject ) {
                let
                    lookupArgs = {
                        'user': user,
                        'originalParams': {
                            'code': treatmentObj.code,
                            'catalogShort': treatmentObj.catalogShort,
                            'locationId': treatmentObj.locationId.toString()
                        },
                        'options': {
                            'migrate': inMigration
                        },
                        'callback': onCatLookup
                    };

                //  get catalog price
                Y.doccirrus.api.catalog.getTreatmentCatalogEntry( lookupArgs );

                function onCatLookup( err, catEntry ) {
                    if ( err ) { return reject( err ); }
                    resolve( catEntry );
                }
            } );
        }

        /**
         *  Update price on treatment according to catalog and current/local billing factor value
         *
         *  @param  {Object}    treatmentObj
         *  @param  {Object}    catEntry
         *  @param  {Number}    currentBillingFactor
         *  @return {Object}
         */

        function checkTreatmentPrice( treatmentObj, catEntry, currentBillingFactor ) {

            if ( !catEntry ) { return treatmentObj; }

            let
                lastPrice = treatmentObj.price,
                lastUnit = treatmentObj.unit,
                hasBewertungListe = catEntry && ( 'bewertung_liste' === catEntry.unit || 'bewertung_liste' === catEntry.value ),
                priceItem = {};

            Y.log( `[i] Checking EBM TREATMENT object ${treatmentObj._id.valueOf()} ${treatmentObj.code} ${treatmentObj.price}`, 'info', NAME );

            if ( treatmentObj.catalogRef !== catEntry.catalogRef ) {
                Y.log( `[>] updating catalog reference ${treatmentObj.catalogRef} to current ${catEntry.catalogRef}`, 'info', NAME );
                treatmentObj.catalogRef = catEntry.catalogRef;

                Y.log( `[>] replacing treatment u_extra since catalog reference has changed`, 'info', NAME );
                treatmentObj.u_extra = catEntry.u_extra;
            }

            //  set current billing factor in sequence treatment
            if ( treatmentObj.billingFactorValue !== `${currentBillingFactor}` ) {
                Y.log( ` [i] setting billing factor on EBM TREATMENT ${treatmentObj.code} from ${ treatmentObj.billingFactorValue} to ${currentBillingFactor}`, 'debug', NAME );
                treatmentObj.billingFactorValue = `${currentBillingFactor}`;
            }

            if( hasBewertungListe && catEntry.u_extra ) {

                //  first try outpatient price schedule
                priceItem = Y.doccirrus.schemas.catalog.getPriceItemFromList( catEntry.u_extra && catEntry.u_extra.bewertung_liste );

            } else {

                if ( catEntry.value && catEntry.unit ) {

                    priceItem = {
                        'unit': catEntry.unit,
                        'value': catEntry.value
                    };

                    Y.log( `[i] EBM catalog does not have Bewewrtung Liste, using direct value: ${catEntry.unit} ${catEntry.value}`, 'info', NAME );

                } else {
                    Y.log( `Do not have Bewertungliste or price in EBM catalog entry: ${treatmentObj.catalogRef} ${treatmentObj.code}`, 'warn', NAME );
                }
            }

            if ( !priceItem || !priceItem.unit || !priceItem.value ) {
                Y.log( `[!] Do not have price item from catalog entry for ${treatmentObj.catalogRef} ${treatmentObj.code}, not correcting.`, 'warn', NAME );
                return treatmentObj;
            }

            if ( 'Punkte' === priceItem.unit ) {
                treatmentObj.actualUnit = priceItem.unit;
                treatmentObj.actualPrice = priceItem.value;
                treatmentObj.unit = 'Euro';
                treatmentObj.price = Y.doccirrus.comctl.dcMul( priceItem && priceItem.value, treatmentObj.billingFactorValue );

                Y.log( `[>] Setting treatment prices from catalog: ${treatmentObj.actualUnit} ${treatmentObj.actualPrice} ${treatmentObj.unit} ${treatmentObj.price} was ${lastUnit} ${lastPrice}`, 'info', NAME );
            }

            if ( 'Euro' === priceItem.unit ) {
                treatmentObj.actualUnit = priceItem.unit;
                treatmentObj.actualPrice = priceItem.value;
                treatmentObj.unit = 'Euro';
                treatmentObj.price = priceItem.value;

                Y.log( `[>] Setting treatment prices from catalog: ${treatmentObj.actualUnit} ${treatmentObj.actualPrice} ${treatmentObj.unit} ${treatmentObj.price} was ${lastUnit} ${lastPrice}`, 'info', NAME );
            }

            return treatmentObj;
        }


        /**
         *  Check for activities which have a formId but no formVersion, as were created by activity sequences and
         *  some invoice processes.  Set the latest formVersion in the activity.
         *
         *  @param user
         *  @param inMigration
         *  @param callback
         *  @return {Promise<void>}
         */

        async function addMissingFormVersions( user, inMigration, callback ) {

            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),

                activityQuery = {
                    $and: [
                        { formId: { $exists: true } },
                        { formId: { $ne: '' } }
                    ],
                    $or: [
                        {formVersion: {$exists: false}},
                        {formVersion: ''}
                    ]
                };

            let
                err,
                formsList,
                activityModel,
                cursor,

                notFixedCount = 0,
                changedCount = 0;

            //  helper function to promisify form template API call
            function listFormsP() {
                function wrapListForms( resolve, reject ) {
                    Y.doccirrus.api.formtemplate.listforms( {
                        user: user,
                        inMigration: inMigration,
                        callback: onListForms
                    } );
                    function onListForms( err, result ) {
                        if ( err ) { return reject( err ); }
                        resolve( result );
                    }
                }
                return new Promise( wrapListForms );
            }

            //  helper function to look p form version quickly in cached form list, rather than db
            function getFormVersion( formId ) {
                let formMeta;
                for ( formMeta of formsList ) {
                    if ( formId === formMeta.formId ) {
                        return formMeta.latestVersionId;
                    }
                }
                return '';
            }

            Y.log( `Starting migration to set missing formVersion in activities, on tenant ${user.tenantId}.`, 'info', NAME );

            //  0. Make a list of forms
            [ err, formsList ] = await formatPromiseResult( listFormsP() );
            if ( err ) { return callback( err ); }

            //  1. Create a mongoose model for activities
            [ err, activityModel ] = await formatPromiseResult( getModelP(  user, 'activity', inMigration ) );
            if ( err ) { return callback( err ); }

            //  2. Start a stream of activities missing formVersion
            cursor = activityModel.mongoose.find( activityQuery ).cursor();
            [ err ] = await formatPromiseResult( cursor.eachAsync( checkSingleActivity ) );
            if ( err ) { return callback( err ); }

            //  2.1 For each activity, set the form version is missing but known
            async function checkSingleActivity( activity ) {
                if ( activity.formId && !activity.formVersion ) {

                    activity.formVersion = getFormVersion( activity.formId );


                    if ( '' === activity.formVersion ) {

                        Y.log( `Could not correct form version, form not found: ${activity.formId}`, 'debug', NAME );
                        notFixedCount = notFixedCount + 1;

                    } else {


                        [ err ] = await formatPromiseResult(
                            activityModel.mongoose.update(
                                { _id: activity._id },                              //  query
                                { $set: { formVersion: activity.formVersion } }     //  update
                            ).exec()                                                //  return a promise
                        );

                        if ( err ) {
                            Y.log( `Could not update activity ${activity._id} with form version: ${err.stack||err}`, 'warn', NAME );
                            //  should not happen, but not critical continue with best effort
                        }

                        Y.log( `Set formVersion on activity ${activity._id} to ${activity.formId}--v--${activity.formVersion}`, 'debug', NAME );
                        changedCount = changedCount + 1;

                    }

                }

            }

            //  X. Finsihed
            Y.log( `Completed migration to set missing formVersion, corrected ${changedCount} activities on tenant ${user.tenantId}.  ${notFixedCount} activities could not be correted.`, 'info', NAME );
            callback( null );
        }

        /**
         *  Copy documents from original activities into sequences, to prevent erratic behavior in the sequence
         *  when documents are changed or deleted on the original activity.
         *
         *  @param user
         *  @param inMigration
         *  @param callback
         *  @return {Promise<void>}
         */

        async function correctDocumentsInSequences( user, inMigration, callback ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel );

            let err, sequenceModel, cursor, totalSequences = 0, countChanges = 0;

            Y.log( `Start migration to correct documents in sequences, tenant: ${user.tenantId}`, 'info', NAME );

            //  1. Create a mongoose model for activity sequences
            [ err, sequenceModel ] = await formatPromiseResult( getModelP(  user, 'activitysequence', inMigration ) );
            if ( err ) { return callback( err ); }

            //  2. Start a stream of activities missing formVersion
            cursor = sequenceModel.mongoose.find( {} ).cursor();
            [ err ] = await formatPromiseResult( cursor.eachAsync( checkSingleSequence ) );
            if ( err ) { return callback( err ); }

            //  2.1 Check and correct a single sequence
            async function checkSingleSequence( sequence ) {
                let
                    copyErr, activitiesUpdated,
                    saveErr;

                Y.log( `Checking single activity sequence ${sequence._id} ${sequence.title}`, 'debug', NAME );
                totalSequences = totalSequences + 1;

                [ copyErr, activitiesUpdated ] = await formatPromiseResult(
                    Y.doccirrus.api.activitysequence.copyAttachmentsToSequence( user, inMigration, sequence )
                );

                if ( copyErr ) {
                    Y.log( `Problem copying documents into sequence ${sequence._id} during migration: ${copyErr.stack||copyErr}`, 'error', NAME );
                    //  continue, do not block server start for this
                }

                if ( !activitiesUpdated ) {
                    //  no need to save
                    return;
                }

                //  save the sequence
                [ saveErr ] = await formatPromiseResult(
                    sequenceModel.mongoose.update(
                        { _id: sequence._id },
                        { $set: { activities: sequence.activities } }
                    ).exec()
                );

                if ( saveErr ) {
                    Y.log( `Problem updating activity sequence ${sequence._id} during migration: ${saveErr.stack||saveErr}`, 'error', NAME );
                    //  continue, do not block server start for this
                }

                Y.log( `Copied documents into activity sequence: ${sequence._id}.`, 'debug', NAME );
                countChanges = countChanges + 1;
            }

            Y.log( `Completed migration to correct documents in ${countChanges} of ${totalSequences} sequences, tenant: ${user.tenantId}`, 'info', NAME );
            callback( null );
        }

        /**
         *  Add insurance company names to invoice activities for display/filter in cashbook EXTMOJ-2235
         *
         *  For each patient, match each casefolder to insurance company by type, and set the insurance name on all
         *  invoices.
         *
         *  @param  {Object}    user
         *  @param  {Boolean}   inMigration
         *  @param  {Function}  callback
         */

        async function addInsuranceNamesToInvoices( user, inMigration, callback ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel );

            let
                err,
                patientModel,
                casefolderModel,
                activityModel,
                patientCursor,
                patientCount,
                patientProgress = 0,
                matchCount  = 0,
                updateCount = 0;

            Y.log( `Starting migration to set insurance names on invoices for tenant ${user.tenantId}`, 'info', NAME );

            //  Get mongoose models

            [ err, patientModel ] = await formatPromiseResult( getModelP( user, 'patient', inMigration ) );
            if ( err ) { return handleResult( err, null, callback ); }

            [ err, casefolderModel ] = await formatPromiseResult( getModelP( user, 'casefolder', inMigration ) );
            if ( err ) { return handleResult( err, null, callback ); }

            [ err, activityModel ] = await formatPromiseResult( getModelP( user, 'activity', inMigration     ) );
            if ( err ) { return handleResult( err, null, callback ); }

            //  Count patients

            [ err, patientCount ] = await formatPromiseResult( patientModel.mongoose.count({}).exec() );
            if ( err ) { return handleResult( err, null, callback ); }

            //  Stream all patients

            patientCursor = patientModel.mongoose.find( {}, { _id: 1, insuranceStatus: 1 } ).cursor();
            [ err ] = await formatPromiseResult( patientCursor.eachAsync( forEveryPatient ) );
            if ( err ) { return handleResult( err, null, callback ); }

            //  For each patient, load all of their casefolders and match to insurance name

            async function forEveryPatient( patient ) {

                let
                    casefolderCursor = casefolderModel.mongoose.find( { patientId: patient._id.valueOf() } ).cursor(),
                    insurances = patient.insuranceStatus || [],
                    casefolderCount = 0;

                [ err ] = await formatPromiseResult( casefolderCursor.eachAsync( forEveryCaseFolder ) );
                if ( err ) { throw err; }

                async function forEveryCaseFolder( casefolder ) {
                    let insurance;

                    casefolderCount = casefolderCount + 1;

                    for ( insurance of insurances ) {
                        if ( casefolder.type === insurance.type ) {
                            [ err ] = await formatPromiseResult( setInsuranceInCaseFolder( insurance, casefolder ) );
                        }
                    }

                }

                patientProgress = patientProgress + 1;
                Y.log( `Matching ${casefolderCount} casefolders for patient: ${patient._id.valueOf()} [${patientProgress}/${patientCount}]`, 'info', NAME );
            }

            //  For each matched casefolder, update insurance name on all invoices where it is missing

            async function setInsuranceInCaseFolder( insurance, casefolder ) {
                let
                    invoiceQuery = {
                        caseFolderId: casefolder._id.valueOf(),
                        actType: 'INVOICE'
                    },
                    invoiceFields = {
                        _id: 1,
                        insuranceName: 1
                    },
                    insuranceName = insurance.insurancePrintName || insurance.insuranceName || '',

                    err, invoices,

                    invoice;

                [ err, invoices ] = await formatPromiseResult(
                    activityModel.mongoose.find( invoiceQuery, invoiceFields ).exec()
                );

                if ( err ) { throw err; }
                if ( 0 === invoices.length ) { return; }

                matchCount = matchCount + invoices.length;

                for ( invoice of invoices ) {
                    if ( !invoice.insuranceName ) {

                        [ err ] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'activity',
                                action: 'update',
                                migrate: inMigration,
                                query: { _id: invoice._id.valueOf() },
                                data: { insuranceName: insuranceName }
                            } )
                        );

                        if ( err ) {
                            //  continue, best effort
                            Y.log( `Problem setting invoiceName on activity: ${invoice._id.valueOf()}: ${err.stack||err}`, 'warn', NAME );
                        }

                        updateCount = updateCount + 1;

                    }
                }


                if ( err ) { throw err; }
            }

            if ( err ) { return handleResult( null, null, callback ); }

            //  Complete

            Y.log( `Completed migration to set insurance names on invoices for tenant ${user.tenantId}, updated ${updateCount} of ${matchCount}`, 'info', NAME );

            return handleResult( null, null, callback );
        }

        /**
         *  Copy activity type and subtype to attachments
         *  Allow query by activity type / subtype in 'choose media' modal without aggregating
         *
         *  @param  {Object}    user
         *  @param  {Boolean}   inMigration
         *  @param  {Function}  callback
         *  @return {Promise<void>}
         */

        async function addActTypeToAttachments( user, inMigration, callback ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),
                activityQuery = { attachments: { $exists: true, $ne: [] } },
                activityFields = { _id: 1, attachments: 1, actType: 1, subType: 1, caseFolderId: 1, locationId: 1 };

            let
                err,
                activityModel,
                documentModel,
                activityCount = 0,
                attachmentsCount = 0,
                activityCursor,
                activity;

            Y.log( `Starting migration to set actType and subType on attachments on tenant ${user.tenantId}`, 'info', NAME );

            //  Get a document model
            [ err, documentModel ] = await formatPromiseResult( getModelP( user, 'document', inMigration ) );
            if ( err ) { return handleResult( err, null, callback ); }

            //  Get an activity model and run a cursor over all activities with attachments
            [ err, activityModel ] = await formatPromiseResult( getModelP( user, 'activity', inMigration ) );
            if ( err ) { return handleResult( err, null, callback ); }

            activityCursor = activityModel.mongoose.find( activityQuery, activityFields ).cursor();
            activityCursor.addCursorFlag( 'noCursorTimeout', true );

            while ( activity = await activityCursor.next() ) {  /* eslint-disable-line no-cond-assign */
                let
                    setData = {
                        actType: activity.actType,
                        subType: activity.subType || '',
                        caseFolderId: activity.caseFolderId,
                        locationId: activity.locationId
                    },
                    documentIds = [],
                    err,
                    attachmentId;

                if ( !activity.attachments || !Array.isArray( activity.attachments ) ) {
                    //  imported data, etc
                    continue;
                }

                //  need to filter and deduplicate these due to junk sometimes found in older activities
                for ( attachmentId of activity.attachments ) {
                    if ( attachmentId && attachmentId.length === 24 && -1 === documentIds.indexOf( attachmentId ) ) {
                        documentIds.push(  );

                        [ err ] = await formatPromiseResult(
                            documentModel.mongoose.update( { _id: mongoose.Types.ObjectId( attachmentId ) }, { $set: setData } ).exec()
                        );

                        if ( err ) {
                            Y.log( `Problem migrating attachments ${activity._id}: ${err.stack||err}`, 'error', NAME );
                            // continue with the next, might just be a garbage _id
                        }
                    }
                }

                activityCount = activityCount + 1;
                attachmentsCount = attachmentsCount + documentIds.length;
            }

            Y.log( `Completed migration to set actType and subType on attachments on tenant ${user.tenantId}, ${activityCount} activities, ${attachmentsCount} attachments`, 'info', NAME );

            return handleResult( null, null, callback );
        }

        /**
         *  Copy tags and captions from attachmments on the activity for use by the media search modal, MOJ-13111
         *  @param user
         *  @param inMigration
         *  @param callback
         *  @return {Promise<void>}
         */

        async function addAttachedMediaTags( user, inMigration, callback ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),
                activityQuery = { attachments: { $exists: true, $ne: [] } },
                activityFields = { _id: 1, attachments: 1 };

            let
                err,
                activityModel,
                documentModel,
                activityCount,
                attachmentsCount = 0,

                attachments,
                attachmentIds,

                activityCursor,
                activity,

                i, j;

            Y.log( `Starting migration to set attachedMediaTags and captions on tenant ${user.tenantId}`, 'info', NAME );

            //  Get a document model
            [ err, documentModel ] = await formatPromiseResult( getModelP( user, 'document', inMigration ) );
            if ( err ) { return handleResult( err, null, callback ); }

            //  Get an activity model and run a cursor over all activities with attachments
            [ err, activityModel ] = await formatPromiseResult( getModelP( user, 'activity', inMigration ) );
            if ( err ) { return handleResult( err, null, callback ); }

            //  Count the activities to be processed
            [ err, activityCount ] = await formatPromiseResult( activityModel.mongoose.count( activityQuery ).exec() );
            if ( err ) {
                Y.log( `addAttachedMediaTags migration, error in count ${err.stack||err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            Y.log( `attachedMediaTags activity count from mongoose: ${activityCount}`, 'info', NAME );

            if ( 0 === activityCount ) {
                Y.log( `Completed migration to set attachedMediaTags and captions on tenant ${user.tenantId}, no activities with attachments`, 'info', NAME );
                return handleResult( null, null, callback );
            }

            activityCursor = activityModel.mongoose.find( activityQuery, activityFields ).cursor();

            activityCursor.addCursorFlag( 'noCursorTimeout', true );

            while ( activity = await activityCursor.next() ) {  /* eslint-disable-line no-cond-assign */
                if ( !activity.attachments || 0 === activity.attachments.length ) { continue; }

                activity.attachedMedia = [];
                activity.attachedMediaTags = [];
                attachmentIds = [];

                //  convert the attachments array ot ObjectIds and load them

                for ( i = 0; i < activity.attachments.length; i++ ) {
                    if ( activity.attachments[i] && 24 === activity.attachments[i].length ) {
                        attachmentIds.push( mongoose.Types.ObjectId( activity.attachments[i] ) );
                    }
                }

                [ err, attachments ] = await formatPromiseResult(
                    documentModel.mongoose.find( { _id: { $in: attachmentIds} } ).exec()
                );

                if ( err ) {
                    Y.log( `Error loading attachments to migrate activity ${activity._id}: ${JSON.stringify(activity.attachments)}`, 'error', NAME );
                    continue;
                }

                //  for each attachment, add it to attachedMedia and attachedMediaTags

                for ( i = 0; i < attachments.length; i++ ) {

                    if ( attachments[i] && attachments[i] && attachments[i].tags ) {
                        for ( j = 0; j < attachments[i].tags.length; j++ ) {
                            if (-1 === activity.attachedMediaTags.indexOf( attachments[i].tags[j] ) ) {
                                activity.attachedMediaTags.push( attachments[i].tags[j] );
                            }
                        }
                    }

                    if( attachments[i].mediaId ) {
                        activity.attachedMedia.push( {
                            mediaId: attachments[i].mediaId,
                            contentType: attachments[i].contentType,
                            caption: attachments[i].caption,
                            title: attachments[i].title
                        } );
                    }

                }

                //  save the activity and update stats

                [ err ] = await formatPromiseResult(
                    activityModel.mongoose.update(
                        { _id: activity._id },
                        { $set: { attachedMedia: activity.attachedMedia, attachedMediaTags: activity.attachedMediaTags } }
                    )
                );

                attachmentsCount = attachmentsCount + attachmentIds.length;
            }

            Y.log( `Completed migration to set attachedMediaTags and captions on tenant ${user.tenantId}, ${activityCount} activities, ${attachmentsCount} attachments`, 'info', NAME );

            return handleResult( null, null, callback );
        }

        const
            /**
             * Backup libraries to be deleted in an upcoming migration.
             */
            MedDataConversionBackupCollections = {
                _DeleteFor_4_16_MedDataConversionDateValue_4_15: "_DeleteFor_4_16_MedDataConversionDateValue_4_15",
                _DeleteFor_4_16_MedDataConversionVACCINATION_4_15: "_DeleteFor_4_16_MedDataConversionVACCINATION_4_15",
                _DeleteFor_4_16_MedDataConversionPureNumericTextValueToNumber_4_15: "_DeleteFor_4_16_MedDataConversionPureNumericTextValueToNumber_4_15",
                _DeleteFor_4_16_MedDataConversionBoolTextValueToBoolValue_4_15: "_DeleteFor_4_16_MedDataConversionBoolTextValueToBoolValue_4_15",
                _DeleteFor_4_16_MedDataConversionBoolCategoriesToBoolValue_4_15: "_DeleteFor_4_16_MedDataConversionBoolCategoriesToBoolValue_4_15"
            };

        async function migrateMedLabDataCategories( user, inMigration, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            Y.log( `migrateMedLabDataCategories: migrating LabData and MedData on tenant ${user.tenantId}`, 'debug' );

            let err,
                biometricsResult,
                activitySequencesBiometricsResult,
                gravidogrammResult,
                activitySequencesGravidogrammResult,
                percentilcurveResult,
                activitySequencesPercentilcurveResult,
                tagsResult,
                activityModel,
                activitySequenceModel,
                tagModel;

            [err, activityModel] = await formatPromiseResult( getModelProm( user, 'activity', inMigration ) );

            if( err ) {
                Y.log( `migrateMedLabDataCategories: Error while getting 'activity' model. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            [err, activitySequenceModel] = await formatPromiseResult( getModelProm( user, 'activitysequence', inMigration ) );

            if( err ) {
                Y.log( `migrateMedLabDataCategories: Error while getting 'activitysequence' model. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            [err, tagModel] = await formatPromiseResult( getModelProm( user, 'tag', inMigration ) );

            if( err ) {
                Y.log( `migrateMedLabDataCategories: Error while getting 'tag' model. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            // BIOMETRICS UPDATE
            [err, biometricsResult] = await formatPromiseResult(
                activityModel.mongoose.collection.updateMany(
                    {
                        actType: 'MEDDATA'
                    }, {
                        $set: {
                            'medData.$[item].category': 'BIOMETRICS'
                        }
                    }, {
                        arrayFilters: [ {
                            'item.category': {
                                $exists: false
                            }
                        } ]
                    }
                )
            );

            if( err ) {
                Y.log( `migrateMedLabDataCategories: Error while setting default category BIOMETRICS on MedDataItems. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            [err, activitySequencesBiometricsResult] = await formatPromiseResult(
                activitySequenceModel.mongoose.collection.updateMany(
                    {
                        'activities.actType': 'MEDDATA'
                    }, {
                        $set: {
                            'activities.$.medData.$[item].category': 'BIOMETRICS'
                        }
                    }, {
                        arrayFilters: [ {
                            'item.category': {
                                $exists: false
                            }
                        } ]
                    }
                )
            );

            if( err ) {
                Y.log( `migrateMedLabDataCategories: Error while setting default category BIOMETRICS on activitySequence MedDataItems. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            // GRAVIDOGRAMM UPDATE
            [err, gravidogrammResult] = await formatPromiseResult(
                activityModel.mongoose.collection.updateMany(
                    {
                        actType: 'GRAVIDOGRAMMPROCESS'
                    }, {
                        $set: {
                            'medData.$[item].category': 'GRAVIDOGRAMM'
                        }
                    }, {
                        arrayFilters: [ {
                            'item.category': {
                                $exists: false
                            }
                        } ]
                    }
                )
            );

            if( err ) {
                Y.log( `migrateMedLabDataCategories: Error while setting default category GRAVIDOGRAMM on MedDataItems. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            [err, activitySequencesGravidogrammResult] = await formatPromiseResult(
                activitySequenceModel.mongoose.collection.updateMany(
                    {
                        'activities.actType': 'GRAVIDOGRAMMPROCESS'
                    }, {
                        $set: {
                            'activities.$.medData.$[item].category': 'GRAVIDOGRAMM'
                        }
                    }, {
                        arrayFilters: [ {
                            'item.category': {
                                $exists: false
                            }
                        } ]
                    }
                )
            );

            if( err ) {
                Y.log( `migrateMedLabDataCategories: Error while setting default category GRAVIDOGRAMM on activitySequence MedDataItems. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            // PERCENTILECURVE UPDATE
            [err, percentilcurveResult] = await formatPromiseResult(
                activityModel.mongoose.collection.updateMany(
                    {
                        actType: 'PERCENTILECURVE'
                    },
                    {
                        $set: {
                            'medData.$[item].category': 'PERCENTILECURVE'
                        }
                    }, {
                        arrayFilters: [ {
                            'item.category': {
                                $exists: false
                            }
                        } ]
                    }
                )
            );

            if( err ) {
                Y.log( `migrateMedLabDataCategories: Error while setting default category PERCENTILECURVE on MedDataItems. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            [err, activitySequencesPercentilcurveResult] = await formatPromiseResult(
                activitySequenceModel.mongoose.collection.updateMany(
                    {
                        'activities.actType': 'PERCENTILECURVE'
                    }, {
                        $set: {
                            'activities.$.medData.$[item].category': 'PERCENTILECURVE'
                        }
                    }, {
                        arrayFilters: [ {
                            'item.category': {
                                $exists: false
                            }
                        } ]
                    }
                )
            );

            if( err ) {
                Y.log( `migrateMedLabDataCategories: Error while setting default category PERCENTILECURVE on activitySequence MedDataItems. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            // TAGS UPDATE
            [err, tagsResult] = await formatPromiseResult(
                tagModel.mongoose.collection.update( {
                    type: {$in: ['LABDATA', 'MEDDATA']},
                    $or: [
                        {category: {$exists: false}},
                        {category: {$in: [[], null]}}
                    ]
                }, {
                    $set: {
                        'category': ['BIOMETRICS']
                    }
                }, {multi: true} )
            );

            if( err ) {
                Y.log( `migrateMedLabDataCategories: Error while setting default category on tags. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            Y.log( `migrateMedLabDataCategories: Successfully ended migration for tenant: ${user.tenantId}: 
                    biometricsResult modified: ${ JSON.stringify(biometricsResult) }
                    activitySequencesBiometricsResult modified: ${ JSON.stringify(activitySequencesBiometricsResult) }
                    gravidogrammResult modified: ${ JSON.stringify(gravidogrammResult) }
                    activitySequencesGravidogrammResult modified: ${ JSON.stringify(activitySequencesGravidogrammResult) }
                    percentilcurveResult modified: ${ JSON.stringify(percentilcurveResult) }
                    activitySequencesPercentilcurveResult modified: ${ JSON.stringify(activitySequencesPercentilcurveResult) }
                    tagsResult modified: ${ JSON.stringify(tagsResult) }
                    `, "info", NAME );

            return handleResult( null, {
                biometricsResult,
                activitySequencesBiometricsResult,
                gravidogrammResult,
                activitySequencesGravidogrammResult,
                percentilcurveResult,
                activitySequencesPercentilcurveResult,
                tagsResult
            }, callback );
        }

        /**
         *  Migrate MedDataItems with bool values stored inside textValue ("true"/"false")
         *  to real boolValues (true/false) stored in MedDataItem.boolValue.
         *  Mainly used in AMTS.
         *  @param {Object} user
         *  @param {Boolean} inMigration // True if run by migration, false if run from support route after startup
         *  @param {Function} callback
         *  @return {Promise<void>}
         */
        async function updateMedDataItemsWithBoolInTextValueToBoolValue( user, inMigration, callback ) {
            const getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            let err, trueValueResult, falseValueResult, activitySequencesTrueValueResult, activitySequencesFalseValueResult, activityModel, activitySequenceModel;

            Y.log( `updateMedDataItemsWithBoolInTextValueToBoolValue: Starting migration for boolean textValues to boolValues ${user.tenantId}`, 'info', NAME );

            //  Get the activity model
            [ err, activityModel ] = await formatPromiseResult( getModelProm( user, 'activity', inMigration ) );

            if( err ) {
                Y.log( `updateMedDataItemsWithBoolInTextValueToBoolValue: Error while getting 'Activity' model. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            [err, activitySequenceModel] = await formatPromiseResult( getModelProm( user, 'activitysequence', inMigration ) );

            if( err ) {
                Y.log( `updateMedDataItemsWithBoolInTextValueToBoolValue: Error while getting 'activitysequence' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            const query = {
                'actType': 'MEDDATA',
                'medData': {
                    $elemMatch: {
                        'textValue': { $regex: /^true$|^false$/i }
                    }
                }
            };

            // first, create backups of the affected activities and push these into an own collection
            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'aggregate',
                migrate: inMigration,
                pipeline: [
                    { $match: query },
                    { $project: { _id: 1, medData: 1 } },
                    { $out: MedDataConversionBackupCollections._DeleteFor_4_16_MedDataConversionBoolTextValueToBoolValue_4_15 }
                ]
            } ) );

            if( err ) {
                Y.log( `updateMedDataItemsWithBoolInTextValueToBoolValue: Error writing backup entries to ${MedDataConversionBackupCollections._DeleteFor_4_16_MedDataConversionBoolTextValueToBoolValue_4_15}. Error: ${err.stack || err}`, 'error', NAME );
            }

            // update textValue === "true" to boolValue = true and textValue = null
            // activities collection
            [err, trueValueResult] = await formatPromiseResult( activityModel.mongoose.collection.updateMany(
                {
                    actType: 'MEDDATA'
                },
                {
                    $set: {
                        'medData.$[item].boolValue': true,
                        'medData.$[item].textValue': null
                    }
                },
                {
                    arrayFilters: [
                        {
                            'item.textValue': {
                                $regex: /^true$/i
                            }
                        }
                    ]
                }
            ) );

            if( err ) {
                Y.log( `updateMedDataItemsWithBoolInTextValueToBoolValue: Error while migrating "true" boolValue's in activities collection. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            // activitysequences collection
            [err, activitySequencesTrueValueResult] = await formatPromiseResult( activitySequenceModel.mongoose.collection.updateMany(
                {
                    'activities.actType': 'MEDDATA'
                },
                {
                    $set: {
                        'activities.$.medData.$[item].boolValue': true,
                        'activities.$.medData.$[item].textValue': null
                    }
                },
                {
                    arrayFilters: [
                        {
                            'item.textValue': {
                                $regex: /^true$/i
                            }
                        }
                    ]
                }
            ) );

            if( err ) {
                Y.log( `updateMedDataItemsWithBoolInTextValueToBoolValue: Error while migrating "true" boolValue's in activitysequences collection. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            // update textValue === "false" to boolValue = false and textValue = null
            // activities collection
            [err, falseValueResult] = await formatPromiseResult( activityModel.mongoose.collection.updateMany(
                {
                    actType: 'MEDDATA'
                },
                {
                    $set: {
                        'medData.$[item].boolValue': false,
                        'medData.$[item].textValue': null
                    }
                },
                {
                    arrayFilters: [
                        {
                            'item.textValue': {
                                $regex: /^false$/i
                            }
                        }
                    ]
                }
            ) );

            if ( err ) {
                Y.log( `updateMedDataItemsWithBoolInTextValueToBoolValue: Error while migrating "false" boolValue's in activities collection. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            // activitysequences collection
            [err, activitySequencesFalseValueResult] = await formatPromiseResult( activitySequenceModel.mongoose.collection.updateMany(
                {
                    'activities.actType': 'MEDDATA'
                },
                {
                    $set: {
                        'activities.$.medData.$[item].boolValue': false,
                        'activities.$.medData.$[item].textValue': null
                    }
                },
                {
                    arrayFilters: [
                        {
                            'item.textValue': {
                                $regex: /^false$/i
                            }
                        }
                    ]
                }
            ) );

            if ( err ) {
                Y.log( `updateMedDataItemsWithBoolInTextValueToBoolValue: Error while migrating "false" boolValue's in activitysequences collection. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            Y.log( `updateMedDataItemsWithBoolInTextValueToBoolValue: Completed migrating boolean textValues to boolValues.
                    true values:${trueValueResult.modifiedCount} activities, ${activitySequencesTrueValueResult.modifiedCount} activitysequences. 
                    false values: ${falseValueResult.modifiedCount} activities, ${activitySequencesFalseValueResult.modifiedCount} activitysequences`, 'info', NAME );

            return handleResult( null, { trueValueResult, activitySequencesTrueValueResult, falseValueResult, activitySequencesFalseValueResult }, callback );
        }

        /**
         *  Migrate MedDataItems which are interpreted as boolean true if they were simply present
         *  without any value or boolValue. These are converted to boolValue: true.
         *  This was the case for Swiss MedDataItems in category ALLERGIES.
         *  Besides that it may be the case in category SYMPTOMS and ALIMENTATIONS.
         *  @param {Object} user
         *  @param {Boolean} inMigration // True if run by migration, false if run from support route after startup
         *  @param {Function} callback
         *  @return {Promise<void>}
         */
        async function updateMedDataItemsInBooleanCategoriesWithoutAnyValue( user, inMigration, callback ) {
            const
                boolCategories = [
                    Y.doccirrus.schemas.v_meddata.medDataCategories.ALLERGIES,
                    Y.doccirrus.schemas.v_meddata.medDataCategories.SYMPTOMS,
                    Y.doccirrus.schemas.v_meddata.medDataCategories.ALIMENTATIONS
                ],
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            let err, trueValueResult, activitySequencesTrueValueResult, activityModel, activitySequenceModel;

            Y.log( `updateMedDataItemsInBooleanCategoriesWithoutAnyValue: Starting migration for medDataItems in categories ${boolCategories.join( ", " )} to boolValue if no other value was given ${user.tenantId}`, 'info', NAME );

            //  Get the activity model
            [ err, activityModel ] = await formatPromiseResult( getModelProm( user, 'activity', inMigration ) );

            if( err ) {
                Y.log( `updateMedDataItemsInBooleanCategoriesWithoutAnyValue: Error while getting 'Activity' model. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            [err, activitySequenceModel] = await formatPromiseResult( getModelProm( user, 'activitysequence', inMigration ) );

            if( err ) {
                Y.log( `updateMedDataItemsInBooleanCategoriesWithoutAnyValue: Error while getting 'activitysequence' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            const query = {
                'actType': 'MEDDATA',
                'medData': {
                    $elemMatch: {
                        'category': { $in: boolCategories },
                        $and: [
                            {
                                $or: [
                                    { 'textValue': { $exists: false } },
                                    { 'textValue': null },
                                    { 'textValue': '' }
                                ]
                            },
                            {
                                $or: [
                                    { 'value': { $exists: false } },
                                    { 'value': null },
                                    { 'value': '' }
                                ]
                            },
                            {
                                $or: [
                                    { 'boolValue': { $exists: false } },
                                    { 'boolValue': null },
                                    { 'boolValue': '' }
                                ]
                            },
                            {
                                $or: [
                                    { 'dateValue': { $exists: false } },
                                    { 'dateValue': null },
                                    { 'dateValue': '' }
                                ]
                            }
                        ]
                    }
                }
            };

            // first, create backups of the affected activities and push these into an own collection
            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'aggregate',
                migrate: inMigration,
                pipeline: [
                    { $match: query },
                    { $project: { _id: 1, medData: 1 } },
                    { $out: MedDataConversionBackupCollections._DeleteFor_4_16_MedDataConversionBoolCategoriesToBoolValue_4_15 }
                ]
            } ) );

            if( err ) {
                Y.log( `updateMedDataItemsInBooleanCategoriesWithoutAnyValue: Error writing backup entries to ${MedDataConversionBackupCollections._DeleteFor_4_16_MedDataConversionBoolTextValueToBoolValue_4_15}. Error: ${err.stack || err}`, 'error', NAME );
            }

            // update items without any value to boolValue = true
            // actvities collection
            [err, trueValueResult] = await formatPromiseResult( activityModel.mongoose.collection.updateMany(
                {
                    actType: 'MEDDATA'
                },
                {
                    $set: {
                        'medData.$[item].boolValue': true
                    }
                },
                {
                    arrayFilters: [
                        {
                            'item.category': { $in: boolCategories },
                            $and: [
                                {
                                    $or: [
                                        { 'item.textValue': { $exists: false } },
                                        { 'item.textValue': null },
                                        { 'item.textValue': '' }
                                    ]
                                },
                                {
                                    $or: [
                                        { 'item.value': { $exists: false } },
                                        { 'item.value': null },
                                        { 'item.value': '' }
                                    ]
                                },
                                {
                                    $or: [
                                        { 'item.boolValue': { $exists: false } },
                                        { 'item.boolValue': null },
                                        { 'item.boolValue': '' }
                                    ]
                                },
                                {
                                    $or: [
                                        { 'item.dateValue': { $exists: false } },
                                        { 'item.dateValue': null },
                                        { 'item.dateValue': '' }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ) );

            if( err ) {
                Y.log( `updateMedDataItemsInBooleanCategoriesWithoutAnyValue: Error while migrating "true" boolValue's in activities collection. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            // activitysequences collection
            [err, activitySequencesTrueValueResult] = await formatPromiseResult( activitySequenceModel.mongoose.collection.updateMany(
                {
                    'activities.actType': 'MEDDATA'
                },
                {
                    $set: {
                        'activities.$.medData.$[item].boolValue': true
                    }
                },
                {
                    arrayFilters: [
                        {
                            'item.category': { $in: boolCategories },
                            $and: [
                                {
                                    $or: [
                                        { 'item.textValue': { $exists: false } },
                                        { 'item.textValue': null },
                                        { 'item.textValue': '' }
                                    ]
                                },
                                {
                                    $or: [
                                        { 'item.value': { $exists: false } },
                                        { 'item.value': null },
                                        { 'item.value': '' }
                                    ]
                                },
                                {
                                    $or: [
                                        { 'item.boolValue': { $exists: false } },
                                        { 'item.boolValue': null },
                                        { 'item.boolValue': '' }
                                    ]
                                },
                                {
                                    $or: [
                                        { 'item.dateValue': { $exists: false } },
                                        { 'item.dateValue': null },
                                        { 'item.dateValue': '' }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ) );

            if( err ) {
                Y.log( `updateMedDataItemsInBooleanCategoriesWithoutAnyValue: Error while migrating "true" boolValue's in activitysequences collection. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            Y.log( `updateMedDataItemsInBooleanCategoriesWithoutAnyValue: Completed migrating for medDataItems in category ALLERGIES, SYMPTOMS or ALIMENTATIONS: ${trueValueResult.modifiedCount} activities, ${activitySequencesTrueValueResult.modifiedCount} activitysequences`, 'info', NAME );
            return handleResult( null, { trueValueResult, activitySequencesTrueValueResult }, callback );
        }

        /**
         *  Some MedDataTypes are now marked as DATE or DATE_TIME. Before 4.16, their values
         *  were stored inside each item's textValue. This is now pushed to the item's dateValue
         *  as native date format, and appropriately parsed before.
         *  @param {Object} user
         *  @param {Boolean} inMigration // True if run by migration, false if run from support route after startup
         *  @param {Function} callback
         *  @return {Promise<void>}
         */
        async function updateMedDataItemsWithDateInTextValueToDateValue( user, inMigration, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel ),
                dateValueResult = {
                    n: 0,
                    nModified: 0
                },
                activitySequencesDateValueResult = {
                    n: 0,
                    nModified: 0
                };

            let err, activityModel, activitySequenceModel;

            Y.log( `updateMedDataItemsWithDateInTextValueToDateValue: Starting migration for dates stored in textValues to dateValues  ${user.tenantId}`, 'info', NAME );

            //  Get the activity model
            [ err, activityModel ] = await formatPromiseResult( getModelProm( user, 'activity', inMigration ) );

            if( err ) {
                Y.log( `updateMedDataItemsWithDateInTextValueToDateValue: Error while getting 'Activity' model. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            [err, activitySequenceModel] = await formatPromiseResult( getModelProm( user, 'activitysequence', inMigration ) );

            if( err ) {
                Y.log( `updateMedDataItemsWithDateInTextValueToDateValue: Error while getting 'activitysequence' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            const dateStaticTags = staticTags.filter( tag => {
                if ( tag.type !== tagTypes.MEDDATA ) {
                    return false;
                }

                let firstConfig = tag.medDataItemConfig && tag.medDataItemConfig.length ? tag.medDataItemConfig[ tag.medDataItemConfig.length - 1 ] : null;
                if ( firstConfig && firstConfig.dataType ) {
                    return firstConfig.dataType === medDataItemDataTypes.DATE || firstConfig.dataType === medDataItemDataTypes.DATE_TIME;
                }

                return false;
            } );

            const
                medDataQuery = {
                    $elemMatch: {
                        'type': { $in: dateStaticTags.map( tag => tag.title ) },
                        // depending on the format of the timestamp, create a REGEXP matching the numbers
                        'textValue': { $regex: new RegExp( TIMESTAMP_FORMAT.replace( /[DMYhms]/gi, "\\d" ).replace( /\./g, "\\." ) ) },
                        $or: [
                            { 'dateValue': { $exists: false } },
                            { 'dateValue': null }
                            ]
                    }
                },
                query = {
                    'actType': 'MEDDATA',
                    'medData': medDataQuery
                },
                activitySequenceQuery = {
                    'activities.actType': 'MEDDATA',
                    'activities.$.medData': medDataQuery
                };

            // first, create backups of the affected activities and push these into an own collection
            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'aggregate',
                migrate: inMigration,
                pipeline: [
                    { $match: query },
                    { $project: { _id: 1, medData: 1 } },
                    { $out: MedDataConversionBackupCollections._DeleteFor_4_16_MedDataConversionDateValue_4_15 }
                ]
            } ) );

            if( err ) {
                Y.log( `updateMedDataItemsWithDateInTextValueToDateValue: Error writing backup entries to ${MedDataConversionBackupCollections._DeleteFor_4_16_MedDataConversionDateValue_4_15}. Error: ${err.stack || err}`, 'error', NAME );
            }

            // activities collection
            const medDataCursor = activityModel.mongoose.find( query, { _id: 1, medData: 1 }, { lean: true } ).cursor();
            [ err ] = await formatPromiseResult( medDataCursor.eachAsync( async activity => {
                dateValueResult.n++;

                let activityUpdated = false;
                activity.medData.forEach( medDataItem => {

                    const isDateType = dateStaticTags.some( tag => tag.title === medDataItem.type );
                    if( isDateType ) {
                        // if NO date is given yet (which may be the case when running the migration multiple times)
                        if( !medDataItem.dateValue || !moment( medDataItem.dateValue ).isValid() ) {
                            const dateValueFromTextValue = moment( medDataItem.textValue, TIMESTAMP_FORMAT );

                            // if value could be parsed, modify the value
                            if( dateValueFromTextValue.isValid() ) {
                                // set to 12:00:00 to be sure about NOT crossing day borders
                                dateValueFromTextValue.set( "hour", 12 );
                                medDataItem.dateValue = dateValueFromTextValue.toDate();
                                medDataItem.textValue = null;
                                activityUpdated = true;
                            }
                        }
                    }

                    delete medDataItem._id;
                } );

                if( activityUpdated ) {

                    // update the activity
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'mongoUpdate',
                        model: 'activity',
                        query: {
                            _id: activity._id
                        },
                        data: {
                            $set: {
                                medData: activity.medData
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `updateMedDataItemsWithDateInTextValueToDateValue: Error while migrating medData items dateValue's for activity ${activity._id.toString()}. Error: ${err.stack || err}`, 'error', NAME );
                    } else {
                        dateValueResult.nModified++;
                    }
                }
            } ) );

            if ( err ) {
                Y.log( `updateMedDataItemsWithDateInTextValueToDateValue: Error while migrating dateValue's in activities collection. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            // activitysequences collection
            const actvivitySequenceMedDataCursor = activitySequenceModel.mongoose.find( activitySequenceQuery, { _id: 1, 'activities.medData': 1 }, { lean: true } ).cursor();
            [ err ] = await formatPromiseResult( actvivitySequenceMedDataCursor.eachAsync( async activitySequence => {
                activitySequencesDateValueResult.n++;

                let activitySequenceUpdated = false;

                const medDataDateUpdate = function medDataDateUpdate( medDataItem ) {
                    const isDateType = dateStaticTags.some( tag => tag.title === medDataItem.type );

                    if( isDateType ) {
                        // if NO date is given yet (which may be the case when running the migration multiple times)
                        if( !medDataItem.dateValue || !moment( medDataItem.dateValue ).isValid() ) {
                            const dateValueFromTextValue = moment( medDataItem.textValue, TIMESTAMP_FORMAT );

                            // if value could be parsed, modify the value
                            if( dateValueFromTextValue.isValid() ) {
                                // set to 12:00:00 to be sure about NOT crossing day borders
                                dateValueFromTextValue.set( "hour", 12 );
                                medDataItem.dateValue = dateValueFromTextValue.toDate();
                                medDataItem.textValue = null;
                                activitySequenceUpdated = true;
                            }
                        }
                    }

                    delete medDataItem._id;
                };

                activitySequence.activities.forEach( activity => {
                    activity.medData.forEach( medDataDateUpdate );
                } );

                if( activitySequenceUpdated ) {

                    // update the activitysequence
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'mongoUpdate',
                        model: 'activitysequence',
                        query: {
                            _id: activitySequence._id
                        },
                        data: {
                            $set: {
                                activities: activitySequence.activities
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `updateMedDataItemsWithDateInTextValueToDateValue: Error while migrating medData items inside dateValue's for activities inside activitysequence ${activitySequence._id.toString()}. Error: ${err.stack || err}`, 'error', NAME );
                    } else {
                        activitySequencesDateValueResult.nModified++;
                    }
                }
            } ) );

            if ( err ) {
                Y.log( `updateMedDataItemsWithDateInTextValueToDateValue: Error while migrating dateValue's in activitysequences collection. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }


            Y.log( `updateMedDataItemsWithDateInTextValueToDateValue: Completed migrating dates stored in textValue to dateValues: 
                    ${dateValueResult.nModified} out of ${dateValueResult.n} activities
                    ${activitySequencesDateValueResult.nModified} out of ${activitySequencesDateValueResult.n} activitysequences`, 'info', NAME );
            return handleResult( null, { dateValueResult, activitySequencesDateValueResult }, callback );
        }

        /**
         *  MedDataItems of type VACCINATION have been stored as numeric values 0,1,2,3,
         *  although the original data type was string. Now they are stored as type STRING_ENUM.
         *  The values need to move from value to textValue.
         *  @param {Object} user
         *  @param {Boolean} inMigration // True if run by migration, false if run from support route after startup
         *  @param {Function} callback
         *  @return {Promise<void>}
         */
        async function migrateMedDataItemsVACCINATIONFromNumberToStringEnum( user, inMigration, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel ),
                migrationResult = {
                    n: 0,
                    nModified: 0
                },
                activitySequencesMigrationResult = {
                    n: 0,
                    nModified: 0
                };

            let err, activityModel, activitySequenceModel;

            Y.log( `migrateMedDataItemsVACCINATIONFromNumberToStringEnum: Starting migration for numeric value to textValue conversion for MedDataItems of type VACCINATION on tenant ${user.tenantId}`, 'info', NAME );

            //  Get the activity model
            [err, activityModel] = await formatPromiseResult( getModelProm( user, 'activity', inMigration ) );

            if( err ) {
                Y.log( `migrateMedDataItemsVACCINATIONFromNumberToStringEnum: Error while getting 'Activity' model. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            [err, activitySequenceModel] = await formatPromiseResult( getModelProm( user, 'activitysequence', inMigration ) );

            if( err ) {
                Y.log( `migrateMedDataItemsVACCINATIONFromNumberToStringEnum: Error while getting 'activitysequence' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            const
                medDataQuery = {
                    $elemMatch: {
                        'type': Y.doccirrus.schemas.v_meddata.medDataTypes.VACCINATION,
                        'value': { $type: 'number' }
                    }
                },
                query = {
                    'actType': 'MEDDATA',
                    'medData': medDataQuery
                },
                activitySequenceQuery = {
                    'activities.actType': 'MEDDATA',
                    'activities.$.medData': medDataQuery
                };

            // first, create backups of the affected activities and push these into an own collection
            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'aggregate',
                migrate: inMigration,
                pipeline: [
                    { $match: query },
                    { $project: { _id: 1, medData: 1 } },
                    { $out: MedDataConversionBackupCollections._DeleteFor_4_16_MedDataConversionVACCINATION_4_15 }
                ]
            } ) );

            if( err ) {
                Y.log( `migrateMedDataItemsVACCINATIONFromNumberToStringEnum: Error writing backup entries to ${MedDataConversionBackupCollections._DeleteFor_4_16_MedDataConversionVACCINATION_4_15}. Error: ${err.stack || err}`, 'error', NAME );
            }

            // activities collection
            const medDataCursor = activityModel.mongoose.find( query, { _id: 1, medData: 1 }, { lean: true } ).cursor();
            [err] = await formatPromiseResult( medDataCursor.eachAsync( async activity => {

                let activityUpdated = false;
                activity.medData.forEach( medDataItem => {
                    migrationResult.n++;

                    // convert (value: number) to (textValue: string)
                    if(
                        // ONLY: if the medDataItem's type matches the VACCINATION type
                        medDataItem.type === Y.doccirrus.schemas.v_meddata.medDataTypes.VACCINATION &&
                        // ONLY: if a numeric value is given
                        typeof medDataItem.value === "number" &&
                        // ONLY: if textValue is not yet set by a previous migration to a numeric value
                        //       for VACCINATION, there may be text inside describing the status literally
                        isNaN( parseInt( medDataItem.textValue, 10 ) )
                    ) {
                        // update the values of the activity
                        medDataItem.textValue = medDataItem.value.toString();
                        medDataItem.value = null;
                        activityUpdated = true;
                    }
                } );

                if( activityUpdated ) {

                    // update the activity
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'mongoUpdate',
                        model: 'activity',
                        query: {
                            _id: activity._id
                        },
                        data: {
                            $set: {
                                medData: activity.medData
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `migrateMedDataItemsVACCINATIONFromNumberToStringEnum: Error while migrating VACCINATION medData items value to textValue for activity ${activity._id.toString()}. Error: ${err.stack || err}`, 'error', NAME );
                    } else {
                        migrationResult.nModified++;
                    }

                }
            } ) );

            if( err ) {
                Y.log( `migrateMedDataItemsVACCINATIONFromNumberToStringEnum: Error while migrating dateValue's in activities collection. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            // activitysequences collection
            const actvivitySequenceMedDataCursor = activitySequenceModel.mongoose.find( activitySequenceQuery, { _id: 1, 'activities.medData': 1 }, { lean: true } ).cursor();
            [err] = await formatPromiseResult( actvivitySequenceMedDataCursor.eachAsync( async activitySequence => {

                let activitySequenceUpdated = false;

                const medDataStringEnumUpdate = function medDataStringEnumUpdate( medDataItem ) {
                    activitySequencesMigrationResult.n++;

                    // convert (value: number) to (textValue: string)
                    if(
                        // ONLY: if the medDataItem's type matches the VACCINATION type
                        medDataItem.type === Y.doccirrus.schemas.v_meddata.medDataTypes.VACCINATION &&
                        // ONLY: if a numeric value is given
                        typeof medDataItem.value === "number" &&
                        // ONLY: if textValue is not yet set by a previous migration to a numeric value
                        //       for VACCINATION, there may be text inside describing the status literally
                        isNaN( parseInt( medDataItem.textValue, 10 ) )
                    ) {
                        // update the values of the activity
                        medDataItem.textValue = medDataItem.value.toString();
                        medDataItem.value = null;
                        activitySequenceUpdated = true;
                    }
                };

                activitySequence.activities.forEach( activity => {
                    activity.medData.forEach( medDataStringEnumUpdate );
                } );


                if( activitySequenceUpdated ) {

                    // update the activity
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'mongoUpdate',
                        model: 'activitysequence',
                        query: {
                            _id: activitySequence._id
                        },
                        data: {
                            $set: {
                                activities: activitySequence.activities
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `migrateMedDataItemsVACCINATIONFromNumberToStringEnum: Error while migrating VACCINATION medData items value to textValue for activities inside activitysequence ${activitySequence._id.toString()}. Error: ${err.stack || err}`, 'error', NAME );
                    } else {
                        activitySequencesMigrationResult.nModified++;
                    }

                }
            } ) );

            if( err ) {
                Y.log( `migrateMedDataItemsVACCINATIONFromNumberToStringEnum: Error while migrating dateValue's in activitysequences collection. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            Y.log( `migrateMedDataItemsVACCINATIONFromNumberToStringEnum: Completed migrating VACCINATION medData items from value to textValue: 
                    ${migrationResult.nModified} out of ${migrationResult.n} activities
                    ${activitySequencesMigrationResult.nModified} out of ${activitySequencesMigrationResult.n} activitysequences`, 'info', NAME );
            return handleResult( null, { migrationResult, activitySequencesMigrationResult }, callback );
        }

        /**
         *  MedDataItems used to provide two input columns.
         *  One for MedDataItem.textValue: string, one for MedDataItem.value: number.
         *  Since populating these columns with the wrong data type was rarely forbidden
         *  (i.e. writing the WEIGHT 100 kg into the MedDataItem.textValue, instead of the MedDataItem.value)
         *  we need to setup a converter for these cases to avoid invalid entries and errors during migration.
         *  The procedure checks for each StaticTag with numeric type
         *  a MedDataItem.value is given. If NOT, and a MedDataItem.textValue is found,
         *  it tries to parse that value and store it inside MedDataItem.value instead.
         *  @param {Object} user
         *  @param {Boolean} inMigration // True if run by migration, false if run from support route after startup
         *  @param {Function} callback
         *  @return {Promise<void>}
         */
        async function migrateMedDataItemsWithPureNumericTextValueToNumberValue( user, inMigration, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel ),
                migrationResult = {
                    n: 0,
                    nModified: 0
                },
                activitySequencesMigrationResult = {
                    n: 0,
                    nModified: 0
                };

            let err, activityModel, activitySequenceModel;

            Y.log( `migrateMedDataItemsWithPureNumericTextValueToNumberValue: Starting migration for pure numeric textValues  ${user.tenantId}`, 'info', NAME );

            //  Get the activity model
            [ err, activityModel ] = await formatPromiseResult( getModelProm( user, 'activity', inMigration ) );

            if( err ) {
                Y.log( `migrateMedDataItemsWithPureNumericTextValueToNumberValue: Error while getting 'Activity' model. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            [err, activitySequenceModel] = await formatPromiseResult( getModelProm( user, 'activitysequence', inMigration ) );

            if( err ) {
                Y.log( `migrateMedDataItemsWithPureNumericTextValueToNumberValue: Error while getting 'activitysequence' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            let numericTags = staticTags.filter( tag => {
                if( tag.type !== tagTypes.MEDDATA ) {
                    return false;
                }

                let firstConfig = tag.medDataItemConfig && tag.medDataItemConfig.length ? tag.medDataItemConfig[tag.medDataItemConfig.length - 1] : null;
                if( firstConfig && firstConfig.dataType ) {
                    switch( firstConfig.dataType ) {
                        case medDataItemDataTypes.NUMBER_INT:
                        case medDataItemDataTypes.NUMBER_FLOAT:
                        case medDataItemDataTypes.NUMBER_TIMEDIFF:
                        case medDataItemDataTypes.NUMBER_FORMULA:
                            return true;
                    }
                }
                return false;
            } );

            const
                medDataQuery = {
                    $elemMatch: {
                        'type': { $in: numericTags.map( tag => tag.title ) },
                        // no value given at all
                        $or: [
                            { 'value': { $exists: false } },
                            { 'value': null }
                        ],
                        // textValue contains a number
                        'textValue': { $regex: /\d/ }
                    }
                },
                query = {
                    'actType': 'MEDDATA',
                    'medData': medDataQuery
                },
                activitySequenceQuery = {
                    'activities.actType': 'MEDDATA',
                    'activities.$.medData': medDataQuery
                };

            // first, create backups of the affected activities and push these into an own collection
            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'aggregate',
                migrate: inMigration,
                pipeline: [
                    { $match: query },
                    { $project: { _id: 1, medData: 1 } },
                    { $out: MedDataConversionBackupCollections._DeleteFor_4_16_MedDataConversionPureNumericTextValueToNumber_4_15 }
                ]
            } ) );

            if( err ) {
                Y.log( `migrateMedDataItemsWithPureNumericTextValueToNumberValue: Error writing backup entries to ${MedDataConversionBackupCollections._DeleteFor_4_16_MedDataConversionPureNumericTextValueToNumber_4_15}. Error: ${err.stack || err}`, 'error', NAME );
            }

            // activities collection
            const medDataCursor = activityModel.mongoose.find( query, { _id: 1, medData: 1 }, { lean: true } ).cursor();

            [ err ] = await formatPromiseResult( medDataCursor.eachAsync( async activity => {
                // increase the counter for the scanned activities
                migrationResult.n++;

                let activityUpdated = false;
                activity.medData.forEach( medDataItem => {
                    let isNumericType = numericTags.some( tag => tag.title === medDataItem.type );

                    if(
                        // ONLY if this is a numeric medDataItem type
                        isNumericType &&
                        // only if .value is NOT a number
                        typeof medDataItem.value !== "number" &&
                        // only if .textValue is defined and has some value inside
                        typeof medDataItem.textValue === "string" && medDataItem.textValue.length > 0
                    ) {
                        let numberFromTextValue = Y.doccirrus.comctl.localStringToNumber( medDataItem.textValue );

                        if( !isNaN( numberFromTextValue ) ) {
                            medDataItem.value = numberFromTextValue;
                            medDataItem.textValue = null;
                            activityUpdated = true;
                        }
                    }

                    delete medDataItem._id;
                } );

                if( activityUpdated ) {

                    // update the activity
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'mongoUpdate',
                        model: 'activity',
                        query: {
                            _id: activity._id
                        },
                        data: {
                            $set: {
                                medData: activity.medData
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `migrateMedDataItemsWithPureNumericTextValueToNumberValue: Error while migrating medData pure numeric textValue for activity ${activity._id.toString()}. Error: ${err.stack || err}`, 'error', NAME );
                    } else {
                        migrationResult.nModified++;
                    }
                }
            } ) );

            if ( err ) {
                Y.log( `migrateMedDataItemsWithPureNumericTextValueToNumberValue: Error while migrating pure numeric textValue in activities collection. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            // activitysequences collection
            const actvivitySequenceMedDataCursor = activitySequenceModel.mongoose.find( activitySequenceQuery, { _id: 1, 'activities.medData': 1 }, { lean: true } ).cursor();
            [ err ] = await formatPromiseResult( actvivitySequenceMedDataCursor.eachAsync( async activitySequence => {
                // increase the counter for the scanned activities
                migrationResult.n++;

                let activitySequenceUpdated = false;

                const medDataNumberUpdate = function medDataNumberUpdate( medDataItem ) {
                    let isNumericType = numericTags.some( tag => tag.title === medDataItem.type );

                    if(
                        // ONLY if this is a numeric medDataItem type
                        isNumericType &&
                        // only if .value is NOT a number
                        typeof medDataItem.value !== "number" &&
                        // only if .textValue is defined and has some value inside
                        typeof medDataItem.textValue === "string" && medDataItem.textValue.length > 0
                    ) {
                        let numberFromTextValue = Y.doccirrus.comctl.localStringToNumber( medDataItem.textValue );

                        if( !isNaN( numberFromTextValue ) ) {
                            medDataItem.value = numberFromTextValue;
                            medDataItem.textValue = null;
                            activitySequenceUpdated = true;
                        }
                    }

                    delete medDataItem._id;
                };

                activitySequence.activities.forEach( activity => {
                    activity.medData.forEach( medDataNumberUpdate );
                } );

                if( activitySequenceUpdated ) {

                    // update the activity
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'mongoUpdate',
                        model: 'activitysequence',
                        query: {
                            _id: activitySequence._id
                        },
                        data: {
                            $set: {
                                activities: activitySequence.activities
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `migrateMedDataItemsWithPureNumericTextValueToNumberValue: Error while migrating medData pure numeric textValue for activities inside activitysequence ${activitySequence._id.toString()}. Error: ${err.stack || err}`, 'error', NAME );
                    } else {
                        migrationResult.nModified++;
                    }
                }
            } ) );

            if ( err ) {
                Y.log( `migrateMedDataItemsWithPureNumericTextValueToNumberValue: Error while pure migrating numeric textValue in activitysequences collection. Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            Y.log( `migrateMedDataItemsWithPureNumericTextValueToNumberValue: Completed migrating pure numeric textValues to values. 
                    Migrated ${migrationResult.nModified} out of ${migrationResult.n} activities
                    Migrated ${activitySequencesMigrationResult.nModified} out of ${activitySequencesMigrationResult.n} activitysequences`, 'info', NAME );
            return handleResult( null, { migrationResult, activitySequencesMigrationResult }, callback );
        }

        /**
         *  Remove all tags with any category matching AMTS_
         *  @param {Object} user
         *  @param  {Boolean} inMigration // True if run by migration, false if run from support route after startup
         *  @param {Function} callback
         *  @return {Promise<void>}
         */
        async function removeAllAMTSTags ( user, inMigration, callback ) {
            Y.log( `removeAllAMTSTags: Starting migration to delete all tags with any AMTS category  ${user.tenantId}`, 'info', NAME );

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'delete',
                    query: {
                        category: {
                            $elemMatch: {
                                $regex : /^AMTS_/
                            }
                        },
                        type: Y.doccirrus.schemas.tag.tagTypes.MEDDATA
                    },
                    options: {
                        override: true // needed to override MAX_DELETE
                    }
                } )
            );

            if( err ) {
                Y.log( `removeAllAMTSTags: Error while deleting AMTS tags. Error: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, null, callback );
            }

            if( result && result.length ) {
                Y.log( `removeAllAMTSTags: Successfully deleted ${result.length} AMTS tags.`, 'info', NAME );
            }

            return handleResult( err, { amtsTagsDeleted: result.length }, callback );
        }

        /**
         *  Update all MEDDATA tags in the boolCategories to contain a valid MedDataItemConfig with dataType bool
         *  @param {Object} user
         *  @param  {Boolean} inMigration // True if run by migration, false if run from support route after startup
         *  @param {Function} callback
         *  @return {Promise<void>}
         */
        async function updateBoolCategoryMedDataTags( user, inMigration, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel ),
                boolCategories = [
                    Y.doccirrus.schemas.v_meddata.medDataCategories.ALLERGIES,
                    Y.doccirrus.schemas.v_meddata.medDataCategories.SYMPTOMS,
                    Y.doccirrus.schemas.v_meddata.medDataCategories.ALIMENTATIONS
                ],
                defaultBoolConfig = new Y.doccirrus.schemas.v_meddata.MedDataItemConfigSchema( {
                    validFromIncl: new Date( 1900, 1, 1, 0, 0, 0, 0 ),
                    dataType: Y.doccirrus.schemas.v_meddata.medDataItemDataTypes.BOOLEAN
                } );

            Y.log( `updateBoolCategoryMedDataTags: Starting migration to update all tags of categories ${boolCategories.join( ", " )} with a valid BOOLEAN data type config ${user.tenantId}`, 'info', NAME );

            let err, tagModel, result, category;
            [err, tagModel] = await formatPromiseResult( getModelProm( user, 'tag', true ) );

            if( err ) {
                Y.log( `updateBoolCategoryMedDataTags: Error while getting 'tag' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            for( category of boolCategories ) {
                Y.log( `updateBoolCategoryMedDataTags: migrating category ${category} ${user.tenantId}`, 'info', NAME );

                [err, result] = await formatPromiseResult( tagModel.mongoose.collection.updateMany(
                    {
                        type: { $in: [Y.doccirrus.schemas.tag.tagTypes.MEDDATA] },
                        category: { $all: [category] },
                        $or: [
                            { medDataItemConfig: { $exists: false } },
                            { medDataItemConfig: null },
                            { medDataItemConfig: [] }
                        ]
                    },
                    {
                        $set: {
                            'medDataItemConfig': [defaultBoolConfig.toObject()]
                        }
                    }
                ) );

                if( err ) {
                    Y.log( `updateBoolCategoryMedDataTags: Error while updating MedDataItemConfig for ${category} MEDDATA tags. Error: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, null, callback );
                }

                Y.log( `updateBoolCategoryMedDataTags: Successfully migrated category ${category} MEDDATA tags: ${result.modifiedCount}`, 'info', NAME );
            }

            Y.log( `updateBoolCategoryMedDataTags: Successfully added default MedDataConfig for bool categories ${boolCategories.join( ", " )} MEDDATA tags.`, 'info', NAME );
            return handleResult( err, { tagsUpdated: result.length }, callback );
        }

        /*
         *  Add to YUI API
         */

        Y.namespace( 'doccirrus.inCaseUtils' ).migrationhelper = {
            checkDuplicateAttachments,
            relinkAttachments,
            setLatestMedDataOnPatients,
            setLatestLabDataOnPatients,
            checkReceiptTotalsOnInvoices,
            setPatientScheinEmployeeIds,
            setPatientIdOnDocuments,
            setInvoiceIdOnTreatments,
            checkInvoiceIdOnTreatments,
            setAllReciprocalLinks,
            fixJSONInProfiles,
            updateLabEntries,
            updateMeddataLabEntries,
            checkInvoiceBalance,
            removePlaceholderMarkers,
            correctEBMPrices,
            correctEBMKettePrices,
            addMissingFormVersions,
            correctDocumentsInSequences,
            addInsuranceNamesToInvoices,
            addActTypeToAttachments,
            addAttachedMediaTags,
            migrateMedLabDataCategories,
            updateMedDataItemsWithBoolInTextValueToBoolValue,
            updateMedDataItemsInBooleanCategoriesWithoutAnyValue,
            updateMedDataItemsWithDateInTextValueToDateValue,
            migrateMedDataItemsVACCINATIONFromNumberToStringEnum,
            migrateMedDataItemsWithPureNumericTextValueToNumberValue,
            removeAllAMTSTags,
            updateBoolCategoryMedDataTags
        };

    },
    '0.0.1', {
        requires: [
            'linkedactivities-api',
            'catalog-api',
            'dc-comctl',
            'v_meddata-schema',
            'tag-schema'
        ]
    }
);
