/**
 *  Utilities to correct / update reporting during migration
 *
 *  @author: strix
 *  @date: 2017-02-01
 */



/*jslint anon:true, nomen:true, latedef:false */
/*global YUI*/



YUI.add( 'insight2-migrationhelper', function( Y, NAME ) {

        var
            async = require( 'async' ),
            moment = require( 'moment' );

        /**
         *  Correct any activity reportings with missing/empty actType property
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  inMigration {Boolean}   True if run in migration, false, if frun from test route
         *  @param  callback    {Function}  Of the form
         */

        function fixMissingActType( user, inMigration, callback ) {

            var
                query = {

                    $and: [
                        {
                            'activityId': { $exists: true }
                        },
                        {
                            $or: [
                                {'actType': ''},
                                {'actType': {$exists: false}},
                                {'actType': null}
                            ]
                        }
                    ]

                },

                select = { '_id': 1, 'activityId': 1 },
                options = { 'timeout': true },

                actModel,
                repModel,
                totalCount = 0,
                fixCount = 0,
                errCount = 0;

            Y.log( 'Starting migration to set actType where missing on reportings.', 'debug', NAME );

            async.series(
                [
                    createActivityModel,
                    createReportingModel,
                    streamReportings
                ],
                onAllDone
            );

            function createActivityModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'activity', inMigration, onActivityModelCreated );
                function onActivityModelCreated( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    actModel = newModel;
                    itcb( null );
                }
            }

            function createReportingModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'reporting', inMigration, onReportingModelCreated );
                function onReportingModelCreated( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    repModel = newModel;
                    itcb( null );
                }
            }

            function streamReportings( itcb ) {
                Y.log( 'Loaded activity and reporting models, streaming broken reporting entriess from database...', 'debug', NAME );

                var repStream;

                repStream = repModel.mongoose
                    .find( query, select, options )
                    .stream();

                repStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );

                function onStreamData( reportingObj ) {
                    Y.log( 'Correcting reporting: ' + JSON.stringify( reportingObj ), 'debug', NAME );
                    totalCount = totalCount + 1;
                    reportingObj = JSON.parse( JSON.stringify( reportingObj ) );

                    repStream.pause();
                    fixSingleReporting( reportingObj, onSingleFixed );

                    function onSingleFixed( err ) {
                        if ( err ) {
                            Y.log( 'Could not correct broken reporting: ' + JSON.stringify( err ), 'warn', NAME );
                            errCount = errCount + 1;
                        } else {
                            fixCount = fixCount + 1;
                        }
                        repStream.resume();
                    }

                    /*
                    activityCount = activityCount + 1;
                    //console.log( '(****) found new activity in date range > '  + threeMonthsAgo + ': ' + resultObj._id );
                    //console.log( resultObj );
                    if ( -1 === patientIds.indexOf( resultObj.patientId + '' ) ) {
                        //console.log( '(****) found new patientId in date range: ' + resultObj.patientId );
                        patientIds.push( resultObj.patientId + '' );
                    }
                    */
                }

                function onStreamEnd() {
                    Y.log( 'Finished processing all ' + totalCount + ' reporting entries.', 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( 'Error in activity stream: ' + JSON.stringify( err ), 'debug', NAME );
                    itcb( err );
                }

            }

            function fixSingleReporting( reportingObj, itcb ) {
                actModel.mongoose.findOne( { _id: reportingObj.activityId }, { '_id': 1, 'actType': 1 }, onLoadActivity );

                function onLoadActivity( err, activityObj ) {
                    if ( !err && !activityObj ) { err = 'Could not load activity ' + reportingObj.activityId;  }
                    if ( err ) { return itcb( err ); }

                    Y.log( 'Add missing actType ' + activityObj.actType + ' to reporting ' + reportingObj._id, 'debug', NAME );

                    repModel.mongoose.update(
                        { '_id': reportingObj._id },
                        { $set: { 'actType': activityObj.actType } },
                        onReportingUpdated
                    );
                }

                function onReportingUpdated( err ) {
                    if ( err ) {
                        Y.log( 'Could not update reporting ' + reportingObj._id + ': ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not correct missing actType in reporting entry during migration: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                Y.log( 'Completed migration to set actType where missing on reporting entries, corrected ' + fixCount + ' of ' + totalCount + ' broken reporting entries.', 'debug', NAME );
                callback( null );
            }
        }

        /**
         *  Correct activities with missing content and update their reportings
         *
         *  Overall process
         *
         *      --> create activity model
         *      --> create reporting model
         *      --> stream any activities mising content
         *          --> assume content from user content or code
         *          --> pause the stream
         *          --> update the activity
         *          --> update any reportings for this activity
         *          --> resume the stream
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  inMigration {Boolean}   True if run in migration, false, if frun from test route
         *  @param  callback    {Function}  Of the form
         */

        function fixMissingActContent( user, inMigration, callback ) {
            Y.log( "migrateLabdataContent_3_0: start...", 'debug', NAME );

            var
                activityModel;

            async.series( [ getActivityModel, streamBrokenActivities ], callback );

            function getActivityModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'activity', inMigration, onActModelCreated );
                function onActModelCreated( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    activityModel = newModel;
                    itcb( null );
                }
            }

            function streamBrokenActivities( itcb ) {
                var
                    cur,
                    updates = 0,
                    notApplicable = 0,
                    actQuery = {
                        content: { $exists: false },
                        userContent: { $exists: true }
                    };

                cur = activityModel.mongoose.collection.find( actQuery, {}, { timeout: true } ).stream();

                cur.on( "error", onStreamError );
                cur.on( "end", onStreamEnd );
                cur.on( "data", onStreamData );

                function onStreamError( err ) {
                    Y.log( "migrateLabdataContent_3_0 error: " + err, 'error', NAME );
                    itcb( err );
                }

                function onStreamEnd( err ) {
                    Y.log( "migrateLabdataContent_3_0: updated " + updates + " entries. (" + notApplicable + " left out due to missing code/userContent)" );
                    itcb( err );
                }

                function onStreamData( activity ){
                    var content = activity.userContent;

                    if( !content || '' === content ) {
                        if( activity.code ) {
                            content = activity.code;
                        }
                    }

                    if( content ) {
                        updates++;

                        //  pause the stream and update the activity and its reportings, then resume
                        cur.pause();
                        async.series( [ updateSingleActivity, updateReportings ], onSingleActivityComplete );

                    } else {
                        notApplicable++;
                    }

                    function updateSingleActivity( itcb ) {
                        Y.log("migrateLabdataContent_3_0: updating activity " + activity._id + " with new content: " + content, 'debug', NAME);
                        activityModel.mongoose.collection.update( { _id: activity._id }, { $set: { content: content } }, itcb );
                    }

                    function updateReportings( itcb ) {
                        Y.log("migrateLabdataContent_3_0: updating reporting for activity " + activity._id + " with new content: "+content, 'debug', NAME);
                        Y.doccirrus.api.reporting.reportingDBaction( {
                            mongoose: true,
                            user,
                            action: 'update',
                            query: { activityId: activity._id },
                            data: { $set: { content: content } },
                            options: { multi: true },
                            callback: itcb
                        } );
                    }

                    function onSingleActivityComplete( err ) {
                        if ( err ) {
                            Y.log( 'migrateLabdataContent_3_0: Error while correcting activity ' + activity._id + ': ' + JSON.stringify( err ), 'warn', NAME );
                            //  do not stop on error, best effort
                        }
                        //  resume stream, process the next one
                        cur.resume();
                    }
                }
            }
        }

        /**
         *  Add all LABDATA activities from the past month to syncReporting queue
         *
         *  MOJ-8274 - Will need to regenerate labdata for some activities imported after 3.4 released and
         *  before fixes for a format change were made avaiilable
         *
         *  @param user         {Object}    REST user or equivalent
         *  @param inMigration  {Boolean}   Should generally be false
         *  @param callback     {Function}  Of the form fn( err, report )
         */

        function regenerateLabdataOneMonth( user, inMigration, callback ) {
            var
                syncReportingManager = Y.doccirrus.insight2.syncReportingManager,
                activityIds,
                report = '';

            addLine( '-', 'Regenerating one month of LABDATA reportings for tenant: ' + user.tenantId );

            async.series( [ getActivityIds, queueAllForRegeneration ], onAllDone );

            addLine( 'i', 'Finding activities newer than: ' + moment().add( -1, 'month' ).format() );

            function getActivityIds( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activity',
                    'query': {
                        'actType': 'LABDATA',
                        'timestamp': { $gte: moment().subtract( 1, 'month' ).format() }
                    },
                    'migrate': inMigration,
                    'options': { 'lean': true },
                    'callback': onActivityIdsLoaded
                } );

                function onActivityIdsLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    activityIds = result;
                    itcb( err );
                }
            }

            function queueAllForRegeneration( itcb ) {
                async.eachSeries( activityIds, queueSingleRegeneration, itcb );
            }

            function queueSingleRegeneration( activity, itcb ) {
                addLine( '*', 'Queue regeneration of LABADATA reportings for: ' + activity._id );

                /*
                var
                    newReportingEntry = {
                        'entryId': activity._id + '',
                        'entityName': 'activity',
                        'timestamp': moment().format()
                    };

                Y.doccirrus.filters.cleanDbObject( newReportingEntry );

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'syncreporting',
                    'action': 'post',
                    'data': newReportingEntry,
                    'migrate': inMigration,
                    'callback': itcb
                } );
                */

                syncReportingManager
                    .hookUpdate( user, activity._id + '', true )
                    .then( onSingleItemAdded )
                    .catch( onHookUpdateError );

                function onSingleItemAdded() { itcb( null ); }
                function onHookUpdateError( err ) { itcb( err ); }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not regenerate past month of LABDATA reportings: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                callback( null, report );
            }

            function addLine( marker, line ) {
                Y.log( '(' + marker + marker + ') ' + line, 'debug', NAME );
                report = report + '(' + marker + marker + ') ' + line + '\n';
            }
        }

        /*
         *  Share this with the rest of mojito
         */

        Y.namespace( 'doccirrus.insight2' ).migrationhelper = {
            'fixMissingActType': fixMissingActType,
            'fixMissingActContent': fixMissingActContent,
            'regenerateLabdataOneMonth': regenerateLabdataOneMonth
        };

    },
    '0.0.1',
    {
        requires: [ ]
    }
);