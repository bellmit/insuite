/*
 @user: jm
 @date: 2015-11-23
 */


/*global YUI */
/*jshint esnext:true */

YUI.add( 'test-api', function( Y, NAME ) {

    const
        {formatPromiseResult,promisifyArgsCallback} = require( 'dc-core' ).utils,
        ObjectId = require('mongoose').Types.ObjectId,
        fs = require( 'fs' ),
        util = require( 'util' ),
        moment = require( 'moment' );

    /**
     * @method isSystemAllowedToSupportTesting
     * @private
     *
     * determine if current system allow call speciall functions that can compromise licensing for testing purpose
     * it allowed if one of following is true:
     *  1. node run with --dev
     *  2. host is ended with known string
     *  3. testmode.json exists in root folder
     *
     * @param {Object} httpRequest
     *
     * @returns {Boolean} true if system allow call special functions to support testing
     */
    function isSystemAllowedToSupportTesting( httpRequest ) {
        const
            stages = ['ci', 'test', 'sprint'],
            intranetUrl = 'intra.doc-cirrus.com';
        let
            host = httpRequest && httpRequest.headers.host || '',
            allowedParameter = -1 !== process.argv.indexOf( '--dev' );

        const allowedHost = stages.some( stage => host.endsWith( `${stage}.${intranetUrl}` ) );

        return allowedHost || allowedParameter || fs.existsSync( `${process.cwd()}/testmode.json` );
    }

    function testWarnings(args) {
        var
            user = args.user,
            callback = args.callback;
        Y.doccirrus.mongodb.runDb({
            user: user,
            model: 'patient',
            query: {
                lastname: {$exists: true}
            },
            options: {
                limit: 1,
                sort: {
                    _id: -1
                }
            }
        }, function (err, results) {
            return callback(err, results, {warning: 'test warning!!!'});
        });
    }

    function testErrorNotInErrorTable(args) {
        args.callback(Y.doccirrus.errors.rest(20002000, '20002000 code', true));

    }

    function testErrorInErrorTable(args) {
        args.callback(Y.doccirrus.errors.rest(2000, '', true));

    }

    function testSocketApiCall(args) {
        let
            user = args.user,
            data = args.data,
            query = args.query,
            options = args.options,
            callback = args.callback;
        if (!data || !data.someData) {
            return callback(Y.doccirrus.errors.rest(400, 'data is missing', true));
        }
        if (!query || !query.someQuery) {
            return callback(Y.doccirrus.errors.rest(400, 'query is missing', true));
        }
        if (!options || !options.fields) {
            return callback(Y.doccirrus.errors.rest(400, 'options is missing', true));
        }
        if (!user) {
            return callback(Y.doccirrus.errors.rest(400, 'user is missing', true));
        }
        callback(null, {field: 'field', field2: 'field2'});
    }

    function runSingleMochaSuite(args) {
        Y.doccirrus.test.mochaRunner.runSingleMochaSuite(args);
    }

    /**
     *  Run through labdata activities and attempt to get full text of lab results
     */

    function testAddLabdataFullText(args) {

        var
            async = require('async'),
            report = '',
            reportings;

        async.series([loadAllReportings, addAllTexts], onAllDone);

        function loadAllReportings(itcb) {
            Y.doccirrus.api.reporting.reportingDBaction( {
                user: args.user,
                action: 'get',
                query: {'actType': 'LABDATA'},
                options: {'lean': true},
                callback: onReportingsLoaded
            } );

            function onReportingsLoaded(err, data) {
                if (err) {
                    return itcb(err);
                }
                report = report + '[ii] Loaded ' + data.length + ' reporting entries\n';
                reportings = data;
                itcb(null);
            }
        }

        function addAllTexts(itcb) {
            report = report + '[**] (re)generating fulltext for ' + reportings.length + ' entries\n';
            async.eachSeries(reportings, addSingleText, itcb);
        }

        function addSingleText(entry, itcb) {
            report = report + '[**] (re)generating fulltext for single entry ' + entry._id + ' activity: ' + entry.activityId + '\n';

            expandLabdataText(args.user, entry, onExpandedSingle);

            function onExpandedSingle(err, reportFragment) {
                if (err) {
                    report = report + reportFragment;
                    report = report + '[!!] problem (re)generating fulltext for single entry ' + entry._id + ': ' + JSON.stringify(err) + '\n';
                    return itcb(err);
                }
                report = report + '[**] completed (re)generating fulltext for single entry ' + entry._id + '\n';
                report = report + reportFragment;
                itcb(null);
            }
        }

        function onAllDone(err) {
            if (err) {
                Y.log('Problem expanding fulltext of labdata results: ' + JSON.stringify(err), 'warn', NAME);
                return args.callback(err);
            }
            return args.callback(null, report);
        }
    }

    /**
     *  Look up ( and save ) the full text of a labdata reporting item
     * @param user
     * @param entry
     * @param callback
     */

    function expandLabdataText(user, entry, callback) {
        var
            async = require('async'),
            report = '',
            activity,
            fullText = '';

        async.series([loadActivity, getLabText, updateReportingEntry /*, saveActivity */], onAllDone);

        function loadActivity(itcb) {
            report = report + '[--] Loading activity: ' + entry.activityId + '\n';
            Y.doccirrus.mongodb.runDb({
                'user': user,
                'model': 'activity',
                'query': {'_id': entry.activityId + ''},
                'options': {'lean': true},
                'callback': onActivityLoaded
            });

            function onActivityLoaded(err, data) {
                if (err) {
                    return itcb(err);
                }
                if (!data || 0 === data.length) {
                    return itcb(Y.doccirrus.errors.rest(404, 'Missing activity: ' + entry.activityId));
                }
                activity = data[0];
                report = report + '[ii] Loaded activity: ' + activity._id + ' for report: ' + entry._id + '\n';
                itcb(null);
            }
        }

        function getLabText(itcb) {
            var
                lines = activity.labText.split('\n'),
                hasFour,
                hasSix,
                inEntry = false,
                labHead,
                buffer = '',
                i;

            report = report + '[--] Extracting text section: ' + entry.labHead + ' (from ' + lines.length + ' lines)\n';

            for (i = 0; i < lines.length; i++) {
                hasFour = ('    ' === lines[i].substr(0, 4));
                hasSix = ('      ' === lines[i].substr(0, 6));

                if (hasFour && !hasSix && inEntry) {
                    inEntry = false;
                }

                if (hasFour && !hasSix) {
                    labHead = lines[i].trim().replace(':', '');
                    Y.log('Found labHead: ' + labHead, 'debug', NAME);
                    report = report + '[--] Found labHead: ' + labHead + ', compare: ' + entry.labHead + '\n';
                    if (labHead === entry.labHead) {
                        report = report + '[--] Match, collect entry lines...\n';
                        inEntry = true;
                    }
                }

                if (inEntry) {
                    report = report + '[--] Add line: ' + lines[i] + '\n';
                    buffer = buffer + lines[i] + '\n';
                }
            }

            fullText = buffer;

            Y.log('Extracted lab entry text:\n' + fullText, 'debug', NAME);

            report = report + '[ii] + set labFullText:\n' + fullText + '\n';
            itcb(null);
        }

        function updateReportingEntry(itcb) {
            var
                mongooseQuery = {
                    '_id': entry._id
                },
                mongooseUpdate = {
                    $set: {
                        'labFullText': fullText
                    }
                },
                mongooseOptions = {
                    multi: false
                };

            Y.doccirrus.api.reporting.reportingDBaction( {
                user,
                mongoose: true,
                action: 'update',
                query: mongooseQuery,
                data: mongooseUpdate,
                options: mongooseOptions,
                callback: onMongooseUpdate
            } );

            function onMongooseUpdate(err) {
                if (err) {
                    Y.log('Mongoose update failed: ' + JSON.stringify(err), 'warn', NAME);
                    return itcb(err);
                }
                report = report + '[ii] Updated reporting entry via mongoose with labFullText\n';
                itcb(null);
            }
        }

        /*
        function saveEntry( itcb ) {
            var
                putData = {
                    'labFullText': fullText,
                    'fields_': 'labFullText'
                };

            report = report + '[ii] Saving LABDATA report entry: ' + entry._id + '\n';

            putData = Y.doccirrus.filters.cleanDbObject( putData );

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'reporting',
                'action': 'put',
                'query': { '_id': entry._id + '' },
                'data': putData,
                'callback': onReportingSaved
            } );

            function onReportingSaved( err, data ) {
                if ( err ) {
                    report = report + '[!!] Could not save reporting entry: ' + entry._id + ' err: ' + JSON.stringify( err ) + '\n';
                    return itcb( err );
                }

                report = report + '[ii] Saved reporting entry: ' + entry._id + ' data: ' + JSON.stringify( data ) + '\n';
                entry.labFullText = fullText;
                itcb( null );
            }
        }
        */

        // Update the l_text field of activities NOTE: l_text no longer used
        /*
        function saveActivity( itcb ) {
            if ( !activity.l_text ) { activity.l_text = {}; }
            activity.l_text[ entry.labHead + '' ] = fullText;

            report = report + '[**] Recording fullText on activity ' + activity._id + '\n';

            var
                putData = {
                    'l_text': activity.l_text,
                    'fields_': 'l_text'
                };

            putData = Y.doccirrus.filters.cleanDbObject( putData );

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'action': 'put',
                'query': { '_id': activity._id },
                'data': putData,
                'callback': onActivityUpdated
            } );

            function onActivityUpdated( err /--* , data *--/ ) {
                if ( err ) {
                    report = report + '[!!] Could not update activity: ' + JSON.stringify( err ) + '\n';
                    Y.log( 'Could not save activity: ' + JSON.stringify( err ), 'warn', NAME );
                    return itcb( err );
                }

                report = report + '[ii] Updated l_text on activity: ' + activity._id + ' with ' + entry.labHead + '\n';
                return itcb( null );
            }
        } */

        function onAllDone(err) {
            if (err) {
                Y.log('Could not expand labadata entry: ' + JSON.stringify(err));
                report = report + '[!!] Could not expand fullText of labdata entry: ' + JSON.stringify(err) + '\n';
                return callback(err, report);
            }
            report = report + '[**] Finished expanding fullText for: ' + entry._id + '\n\n';
            callback(null, report);
        }

    }

    /**
     *  Recreate report entries for all LABDATA findings
     *
     *  @param  args            {Object}    REST v1
     *  @param  args.user       {Object}    REST user or equivalent
     *  @param  args.callback   {Function}  Of the form fn( err )
     */

    function regenerateLabdataReportings(args) {
        var
            async = require('async');

        Y.log('Regenerating reporting for all LABDATA findings.', 'debug', NAME);

        async.series([clearExistingLABDATA, invokeSyncReporting], onAllDone);

        /* - runDb returns all deleted objects, will not scale to millions of reportings
        function clearExistingLABDATA( itcb ) {
            Y.doccirrus.mongodb.runDb( {
                'user': args.user,
                'action': 'delete',
                'model': 'reporting',
                'query': { 'actType': 'LABDATA' },
                'options': { 'override': true },            //  override safety limit on deletions
                'callback': onReportingsDeleted
            } );

            function onReportingsDeleted( err, data ) {
                if ( err ) { return itcb( err ); }
                //console.log( '(****) deleted reportings, data: ', data );
                itcb( null );
            }
        }
        */

        function clearExistingLABDATA( itcb ) {
            Y.doccirrus.api.reporting.reportingDBaction( {
                user: args.user,
                mongoose: true,
                action: 'remove',
                query: {'actType': 'LABDATA'},
                callback: onRemovedReportings
            } );

            function onRemovedReportings( err, data ) {
                if( err ) {
                    return itcb( err );
                }

                if( data.result && data.result.n ) {
                    Y.log( 'Cleared ' + data.result.n + ' LABDATA reportings for regeneration.', 'debug', NAME );
                }

                itcb( null );
            }
        }

        function invokeSyncReporting(itcb) {

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

            Y.doccirrus.api.reporting.generateActivityReportings({
                'user': args.user,
                'query': {'actType': 'LABDATA'},
                'data': {'skipDocuments': true},
                'callback': onSyncReportingInvoked
            });

            function onSyncReportingInvoked(err) {
                if (err) {
                    return itcb(err);
                }
                itcb(null);
            }
        }

        function onAllDone(err) {
            if (err) {
                Y.log('Problem recreating reporting entries for LABDATA activities: ' + JSON.stringify(err), 'warn', NAME);
                return args.callback(err);
            }
            args.callback(null);
        }
    }

    /**
     *  Make an array of all patientIds which have activities created in the past three months
     *
     *  TODO: make this faster, search distinct patientIds, parhaps use aggregation
     *
     *  @param  args
     *  @param  args.user                       {Object}
     *  @param  args.originalParams             {Object}
     *  @param  args.originalParams.timePeriod  {String}    Length of period to look for patients
     *  @param  args.originalParams.timeUnit    {String}    eg, 'days'|'months'|'years'
     *  @param  args.callback                   {Function}  Of the form fn( err, [ patientIds ] )
     */

    function activePatientList(args) {
        var
            async = require('async'),
            moment = require('moment'),
            params = args.originalParams,
            timePeriod = params.timePeriod || '3',
            timeUnit = params.timeUnit || 'months',
            patientIds = [],
            labdataOnly = false,     // args.labdataOnly
            activityCount = 0,
            activityModel;

        async.series([createActivityModel, streamActivityIds], onAllDone);

        function createActivityModel(itcb) {
            Y.doccirrus.mongodb.getModel(args.user, 'activity', onActivityModelCreated);

            function onActivityModelCreated(err, newModel) {
                if (err) {
                    return itcb(err);
                }
                activityModel = newModel;
                itcb(null);
            }
        }

        function streamActivityIds(itcb) {
            var
                threeMonthsAgo = moment().subtract(timePeriod, timeUnit).local().format(),
                query = {'timestamp': {$gt: threeMonthsAgo}},
                activityStream;

            if (labdataOnly) {
                query.actType = 'LABDATA';
            }

            activityStream = activityModel.mongoose
                .find(query, {}, {timeout: true})
                .select({_id: 1, patientId: 1})
                .stream();

            activityStream
                .on('data', onStreamData)
                .on('error', onStreamError)
                .on('end', onStreamEnd);

            function onStreamData(resultObj) {
                activityCount = activityCount + 1;
                //console.log( '(****) found new activity in date range > '  + threeMonthsAgo + ': ' + resultObj._id );
                //console.log( resultObj );
                if (-1 === patientIds.indexOf(resultObj.patientId + '')) {
                    //console.log( '(****) found new patientId in date range: ' + resultObj.patientId );
                    patientIds.push(resultObj.patientId + '');
                }
            }

            function onStreamEnd() {
                Y.log('Finished processing all ' + activityCount + ' results in date range.', 'debug', NAME);
                itcb(null);
            }

            function onStreamError(err) {
                Y.log('Error in activity stream: ' + JSON.stringify(err), 'debug', NAME);
                itcb(err);
            }
        }

        function onAllDone(err) {
            if (err) {
                return args.callback(err);
            }
            //console.log( '(****) Found patients: ', patientIds );
            args.callback(null, patientIds);
        }

    }

    /**
     *  @param args
     */

    function addInitials(args) {
        var
            async = require('async'),
            user = args.user,
            employees = [],
            activityCount = 0,
            activityModel;

        args.callback(null, {'status': 'started processing of activities to add editor initials'}); // eslint-disable-line callback-return

        async.series([getEmployees, createActivityModel, streamActivityIds], onAllDone);

        function getEmployees(itcb) {
            Y.doccirrus.mongodb.runDb({
                'user': args.user,
                'model': 'employee',
                'query': {},
                'options': {'lean': true},
                'callback': onEmployeesLoaded
            });

            function onEmployeesLoaded(err, result) {
                if (err) {
                    Y.log('Could not load employees: ' + JSON.stringify(err), 'warn', NAME);
                    return;
                }
                employees = result;
                Y.log('Loaded ' + employees.length + ' employees', 'debug', NAME);
                itcb(null);
            }
        }

        function createActivityModel(itcb) {
            Y.doccirrus.mongodb.getModel(args.user, 'activity', onActivityModelCreated);

            function onActivityModelCreated(err, newModel) {
                if (err) {
                    return itcb(err);
                }
                activityModel = newModel;
                itcb(null);
            }
        }

        function streamActivityIds(itcb) {
            var
                query = {},
                activityStream;

            activityStream = activityModel.mongoose
                .find(query, {}, {timeout: true})
                .select({
                    _id: 1,
                    employeeId: 1,
                    editor: 1,
                    employeeInitials: 1,
                    employeeName: 1
                })
                .sort({timestamp: 'desc'})
                .stream();

            activityStream
                .on('data', onStreamData)
                .on('error', onStreamError)
                .on('end', onStreamEnd);

            function onStreamData(resultObj) {
                activityCount = activityCount + 1;

                if (resultObj.employeeInitials && '' !== resultObj.employeeInitials) {
                    //  already set
                    return;
                }

                activityStream.pause();

                var
                    newInitials = getInitialsId(resultObj.employeeId, resultObj.employeeName),
                    updateEditor = setEditorInitials(resultObj.editor),
                    putData = {
                        employeeInitials: newInitials,
                        editor: updateEditor
                    };

                Y.doccirrus.mongodb.runDb({
                        user,
                        action: 'update',
                        model: 'activity',
                        query: {'_id': resultObj._id},
                        data: putData,
                        options: {}
                    }, onUpdateActivity
                );

                function onUpdateActivity(err) {
                    if (err) {
                        Y.log('Error updating activity with initials: ' + JSON.stringify(err), 'warn', NAME);
                    }
                    Y.log('Added initials to activity: ' + resultObj._id + ' (' + activityCount + ')', 'debug', NAME);
                    activityStream.resume();
                }
            }

            function onStreamEnd() {
                Y.log('Finished processing all ' + activityCount + ' activities.', 'debug', NAME);
                itcb(null);
            }

            function onStreamError(err) {
                Y.log('Error in activity stream: ' + JSON.stringify(err), 'debug', NAME);
                itcb(err);
            }
        }

        //  get employee initials given employee id
        function getInitialsId(employeeId, employeeName) {
            var i, initials = '', parts;
            //  try to use _id
            for (i = 0; i < employees.length; i++) {
                if (employees[i]._id === employeeId) {
                    initials = employees[i].firstname.substr(0, 1) + employees[i].lastname.substr(0, 1);
                }
            }
            //  if not found, make best guess from employee name
            if ('' === initials) {
                parts = employeeName.split(' ');
                if (parts.length >= 2) {
                    //  Lastname, Firstname --> FL
                    initials = parts[1].substr(0, 1) + parts[0].substr(0, 1);
                }
            }

            initials = initials.toUpperCase();
            //console.log('(****) setting employee initials: ' + employeeName + ' --> ' + initials );
            return initials;
        }

        //  add best guess of employee initials
        function setEditorInitials(editorSet) {
            var i, j, editor, tempName, parts;
            for (i = 0; i < editorSet.length; i++) {
                editor = editorSet[i];
                if (!editor.initials || '' === editor.initials) {

                    //  try match employee name
                    for (j = 0; j < employees.length; j++) {
                        tempName = employees[i].firstname + ' ' + employees[i].lastname;
                        if (editor.name && editor.name === tempName) {
                            editor.initials = employees[i].firstname.substr(0, 1) + employees[i].lastname.substr(0, 1);
                        }
                    }

                    //  try to match employee number
                    for (j = 0; j < employees.length; j++) {
                        if (editor.employeeNo && employees[i].employeeNo && editor.employeeNo === employees[i].employeeNo) {
                            editor.initials = employees[i].firstname.substr(0, 1) + employees[i].lastname.substr(0, 1);
                        }
                    }

                    //  not found, try set from existing name
                    if (!editor.initials || '' === editor.initials) {
                        parts = editor.name.split(' ');
                        if (parts.length >= 2) {
                            editor.initials = parts[0].substr(0, 1) + parts[1].substr(0, 1);
                        }
                    }

                    editor.initials = editor.initials.toUpperCase();
                    //console.log('(****) setting editor initials: ' + editor.name + ' --> ' + editor.initials );
                }
            }

            return editorSet;
        }

        function onAllDone(err) {
            if (err) {
                Y.log('Could not update employee initials on activities: ' + JSON.stringify(err), 'warn', NAME);
                return;
            }
            Y.log('Updated initials on activities: ', activityCount);
        }
    }


    /**
     * checks all media imports for mismatched activity associations
     *
     * Steps:
     *
     * 1) check patient mismatch
     * 2) get offending attachment based on Mediabuch log entry
     * 3) create new activity with data from the old activity, including the mismatched activity
     * 4) trim old activity
     * 5) relink log entry with new activityId
     *
     * @param args
     */
    function migrateMisassignedMediaImports(args) {
        let {user, callback} = args;
        Y.log('Starting migration migrateMisassignedMediaImports, tenant: ' + user.tenantId, 'debug', NAME);
        let async = require('async');
        let mongoose = require('mongoose');
        let objectId = mongoose.Types.ObjectId;

        let activityModel;
        let devicelogModel;
        let patientModel;

        function modelCb(err) {
            if (err) {
                return callback(err);
            }

            const query = {
                status: "PROCESSED",
                activityId: {$exists: true}
            };

            let error;
            let count = 0;
            let errornous = 0;

            let stream = devicelogModel.mongoose.collection.find(query, {}, {timeout: true}).stream();

            Y.log("device log entry check:\n", 'debug', NAME);
            Y.log("Device Log Entry            activityId                  patientId from log          patientId from log's activity", 'debug', NAME);
            Y.log("-----------------------------------------------------------------------------------------------------------------------", 'debug', NAME);
            //      581324a98145beb613b08177    581324a88145beb613b0816b    5654597f02750905152423b7 vs 5654597f02750905152423b7

            stream.on('data', logEntry => {
                stream.pause();
                count++;
                let attachmentIndex = 0;
                let newActivityId;

                activityModel.mongoose.collection.findOne({_id: objectId(logEntry.activityId)}).then(loggedActivity => {

                    function checkPatientMismatch() {
                        if (logEntry.patientId !== loggedActivity.patientId) {
                            Y.log(logEntry._id + "    " + logEntry.activityId + "    " + logEntry.patientId + " vs " + loggedActivity.patientId + " X", 'debug', NAME);
                            errornous++;
                            findAttachment();
                        } else {
                            Y.log(logEntry._id + "    " + logEntry.activityId + "    " + logEntry.patientId + " vs " + loggedActivity.patientId, 'debug', NAME);
                            stream.resume();
                        }
                    }

                    function findAttachment() {
                        for (; attachmentIndex < loggedActivity.attachments.length; attachmentIndex++) {
                            if (logEntry.attachments[0] === loggedActivity.attachments[attachmentIndex]) {
                                Y.log("    ATTACHMENT : " + loggedActivity.attachments[attachmentIndex], 'debug', NAME);
                                Y.log("    MEDIA      : " + loggedActivity.attachedMedia[attachmentIndex].mediaId, 'debug', NAME);
                                break;
                            }
                        }

                        if (attachmentIndex < loggedActivity.attachments.length) {
                            patientModel.mongoose.collection.findOne({_id: objectId(logEntry.patientId)}).then(createNewActivityForPatient).catch(callback);
                        } else {
                            stream.resume();
                        }
                    }

                    function createNewActivityForPatient(patient) {
                        Y.log("    moving to patient: " + patient.lastname + ", " + patient.firstname + " (" + patient.patientNo + ")", 'debug', NAME);
                        Y.doccirrus.api.activity.getActivityDataForPatient({
                            user,
                            data: {patient},
                            callback(err, activityData) {
                                if (err) {
                                    stream.destroy();
                                    callback(err);
                                    return;
                                }
                                activityModel.mongoose.collection.insert({
                                    patientId: logEntry.patientId,
                                    employeeId: activityData.employeeId,
                                    locationId: activityData.locationId,
                                    caseFolderId: activityData.caseFolderId,
                                    userContent: loggedActivity.userContent,
                                    content: loggedActivity.content,
                                    timestamp: loggedActivity.timestamp,
                                    subType: loggedActivity.subType,
                                    actType: loggedActivity.actType,
                                    attachedMedia: [loggedActivity.attachedMedia[attachmentIndex]],
                                    attachments: [loggedActivity.attachments[attachmentIndex]]
                                }, (err, newActivity) => {
                                    if (err) {
                                        stream.destroy();
                                        callback(err);
                                        return;
                                    }
                                    newActivityId = newActivity.insertedIds[0];
                                    Y.log("    created: " + newActivityId, 'debug', NAME);
                                    removeOldAttachment();
                                });
                            }
                        });
                    }

                    function removeOldAttachment() {
                        loggedActivity.attachedMedia.splice(attachmentIndex, 1);
                        loggedActivity.attachments.splice(attachmentIndex, 1);
                        activityModel.mongoose.collection.update({
                                _id: loggedActivity._id
                            },
                            loggedActivity,
                            (err) => {
                                if (err) {
                                    stream.destroy();
                                    callback(err);
                                    return;
                                }
                                Y.log("removed attachments from old activity...", 'debug', NAME);
                                relink();
                            }
                        );
                    }

                    function relink() {
                        devicelogModel.mongoose.collection.update({
                            _id: logEntry._id
                        }, {
                            $set: {
                                activityId: newActivityId
                            }
                        }, (err) => {
                            if (err) {
                                stream.destroy();
                                callback(err);
                                return;
                            }
                            Y.log("fixed Mediabuch entry.", 'debug', NAME);
                            stream.resume();
                        });
                    }

                    checkPatientMismatch();

                }).catch(callback);

            }).on('error', err => {
                Y.log('migrating migrateMisassignedMediaImports stream error' + err + ' tenant: ' + user.tenantId, 'error', NAME);
                error = err;
            }).on('end', () => {
                Y.log("total:", 'debug', NAME);
                Y.log(count, 'debug', NAME);
                Y.log("errornous:", 'debug', NAME);
                Y.log(errornous, 'debug', NAME);
                Y.log('migrating migrateMisassignedMediaImports stream end, tenant: ' + user.tenantId, 'info', NAME);
                callback(error);
            });
        }

        async.parallel([
            function (done) {
                Y.doccirrus.mongodb.getModel(user, 'activity', true, (err, model) => {
                    activityModel = model;
                    done(err);
                });
            },
            function (done) {
                Y.doccirrus.mongodb.getModel(user, 'patient', true, (err, model) => {
                    patientModel = model;
                    done(err);
                });
            },
            function (done) {
                Y.doccirrus.mongodb.getModel(user, 'devicelog', true, (err, model) => {
                    devicelogModel = model;
                    done(err);
                });
            }
        ], function (err) {
            if (err) {
                return callback(err);
            } else {
                modelCb();
            }
        });
    }

    /*
    * Websms hits this endpoint via <doc_cirrus_host>/1/test/:websmsrecv
    * whenever it receives new SMS from the patient.
    * We then do below:
    *   1] Query latest message from PUC messages collection by patient mobile number and get practiceId and patientId from it.
    *   2] Query metaprac collection by practiceId to get practice host URL (PRC or VRC URL)
    *   3] Hit the REST API "/1/task/:createTaskForRoles" and POST following body to create task for "Empfang" role notifying them of
    *      patient SMS reply.
    *      Sample POST object is as below:
    *      {
    *        tenant: <tenantId>,
    *        roles: ["Empfang"],
    *        alertTime: <sms received time>,
    *        title: <"Patient message from "+patientMobileNo>,
    *        details: <patientSms>,
    *        urgency: 2,
    *        allDay: true,
    *        patientId: <patientId>
    *     }
    *
    * @param {Object} args standard doc cirrus args object
    * @param {Object} args.httpRequest.body contains JSON message object from websms. A sample object is
    *                     {
    *                       "messageType":"text",
    *                       "notificationId":"0a0d015b904c40cc0a7e",
    *                       "senderAddress":"<patient mobile number>",
    *                       "recipientAddress":"491771781215",
    *                       "recipientAddressType":"international",
    *                       "senderAddressType":"international",
    *                       "textMessageContent":"<SMS reply from patient>"
    *                         }
    * @param {Function} args.callback to respond to REST request
    * */
    function websmsrecv(args) {
        //Immediately send reply to websms so that we do not keep the http request waiting as we got all the required details to proceed further
        Y.log(`websmsrecv: Received message from websms: ${JSON.stringify(args.httpRequest.body)}`, 'info', NAME);
        args.callback(null, {meta: {}, statusCode: 2000, statusMessage: "ok"});        //  eslint-disable-line callback-return

        if (args.httpRequest.body.messageType !== "text") {
            Y.log(`websmsrecv: No processing required for message type: ${JSON.stringify(args.httpRequest.body.messageType)}`, 'info', NAME);
            return;
        }

        const Prom = require('bluebird'),
            moment = require('moment'),
            patientMobileNo = args.httpRequest.body.senderAddress,
            patientSms = args.httpRequest.body.textMessageContent,
            runDb = Prom.promisify(Y.doccirrus.mongodb.runDb),
            user = Y.doccirrus.auth.getSUForTenant(Y.doccirrus.auth.getPUCTenantId());

        let patientId,
            practiceId;

        Y.log(`websmsrecv: ${patientMobileNo} sent/replied to SMS notification`, 'info', NAME);
        Y.log('websmsrecv: Quering messages collection to fetch latest message', 'info', NAME);
        // Query latest message by senderAddress
        runDb({
            user,
            model: 'message',
            query: {
                phone: patientMobileNo
            },
            options: {
                limit: 1,
                sort: {
                    _id: -1
                }
            }
        })
            .then((messages) => {
                if (messages && messages.length) {
                    practiceId = messages[0].practiceId;
                    patientId = messages[0].patientId;

                    Y.log(`websmsrecv: latest message found in DB for mobile no ${patientMobileNo}`, 'info', NAME);
                    //Query metapracs to get practice host URL
                    return runDb({
                        user,
                        model: 'metaprac',
                        query: {customerIdPrac: practiceId}
                    });
                } else {
                    Y.log(`websmsrecv: no SMS found in DB for mobile number ${patientMobileNo}`, 'info', NAME);
                    return [];
                }
            })
            .then((metaPracs) => {
                if (metaPracs && metaPracs.length) {
                    Y.log('websmsrecv: metaprac found', 'info', NAME);
                    const host = metaPracs[0].host;
                    const endPointUrl = host + "/1/task/:createTaskForRoles";
                    let tenantId;

                    if (host.indexOf("http://") !== -1) {
                        tenantId = Y.doccirrus.auth.getTenantFromHost(host.replace("http://", ""));
                    } else if (host.indexOf("https://") !== -1) {
                        tenantId = Y.doccirrus.auth.getTenantFromHost(host.replace("https://", ""));
                    }

                    Y.log(`websmsrecv: creating task by calling ${endPointUrl}`, 'info', NAME);
                    //Hit the REST APi createTaskForRoles (on VPRC or PRC server based on host URL) to create task for Empfang
                    Y.doccirrus.https.externalPost(
                        endPointUrl,
                        {
                            tenant: tenantId,
                            roles: ["Empfang"],
                            alertTime: moment().format(),
                            title: "SMS von Patient - " + patientMobileNo,
                            details: patientSms,
                            urgency: 2,
                            allDay: true,
                            patientId: patientId
                        },
                        Y.doccirrus.auth.setInternalAccessOptions(),
                        function checkResponse(err, response, body) {
                            if (err) {
                                Y.log(`websmsrecv: failed to POST: ${endPointUrl},` + JSON.stringify(err), 'error', NAME);
                            }

                            if (body && body.meta && body.meta.errors && body.meta.errors.length) {
                                Y.log(`websmsrecv: error in POST: ${endPointUrl} for data: ` + JSON.stringify(body.meta.errors), 'error', NAME);
                            }

                            if (body && body.data && body.data.length) {
                                Y.log(`websmsrecv: POST success to:  ${endPointUrl} with response body:  ` + JSON.stringify(body.data), 'info', NAME);
                            }
                        }
                    );
                } else {
                    Y.log(`websmsrecv: No metapracs found for practiceId: ${practiceId}`, 'debug', NAME);
                }
            })
            .catch((err) => {
                Y.log(`websmsrecv: error while processing SMS reply from ${patientMobileNo}: ${err}`, 'error', NAME);
            });
    }

    /**
     *  Load and return a reduced schema file
     *  @param args
     */

    function getReducedSchema(args) {

        var
            async = require('async'),
            fs = require('fs'),
            fileName = process.cwd() + '/mojits/FormEditorMojit/autoload/reduced-schema/InCase_T.common.js.copy',
            rawFile,
            schemaJSON;

        async.series([loadFile, cutOutJSON], onAllDone);

        function loadFile(itcb) {
            fs.readFile(fileName, onFileRead);

            function onFileRead(err, buffer) {
                if (err) {
                    return itcb(err);
                }

                rawFile = buffer + '';
                itcb(null);
            }
        }

        function cutOutJSON(itcb) {
            var
                lines = rawFile.split('\n'),
                selectedLines = [],
                selectedText,
                inJson = false,
                i;

            for (i = 0; i < lines.length; i++) {
                if (lines[i].trim() === '//-- end schema') {
                    inJson = false;
                }

                if (true === inJson) {
                    if ('//' !== lines[i].trim().substr(0, 2)) {
                        selectedLines.push(lines[i]);
                    }
                }

                if (lines[i].trim() === '//-- start schema') {
                    inJson = true;
                }
            }

            selectedText = selectedLines.join('\n').trim();

            selectedLines = selectedText.split('=', 2);

            selectedText = selectedLines[1].trim();
            selectedText = selectedText.substr(0, selectedText.length - 1);

            schemaJSON = JSON.parse(selectedText);
            itcb(null);
        }

        function onAllDone(err) {
            if (err) {
                Y.log('Could not load JSON: ' + JSON.stringify(err), 'warn', NAME);
                return args.callback(err);
            }
            args.callback(null, schemaJSON);
        }
    }

    /**
     *  Overwrite the reduced schema on disk
     *  @param args
     */

    function updateReducedSchema(args) {
        var
            async = require('async'),
            fs = require('fs'),
            fileName = process.cwd() + '/mojits/FormEditorMojit/autoload/reduced-schema/InCase_T.common.js.copy',
            rawFile,
            fileHead = [],
            fileFoot = [],

            schema,
            params = args.originalParams,
            schemaMember = params.schemaMember || '';

        if ('' === schemaMember || !Y.dcforms.schema.InCase_T.hasOwnProperty(schemaMember)) {
            return args.callback('Missing or invalid argument: schemaMember');
        }

        async.series([loadSchema, updateSchema, cleanDynamicMembers, loadFile, cutOutJSON, saveFile], onAllDone);

        function loadSchema(itcb) {
            getReducedSchema({
                'user': args.user,
                'callback': onLoadedFromDisk
            });

            function onLoadedFromDisk(err, jsonObj) {
                if (err) {
                    return itcb(err);
                }
                schema = jsonObj;
                itcb(null);
            }
        }

        function updateSchema(itcb) {
            var member = schema[schemaMember];

            member.label = member.label ? member.label : {};
            member.label.en = member.label.en ? member.label.en : 'missing';
            member.label.de = member.label.de ? member.label.de : 'missing';

            member.description = member.description ? member.description : {};
            member.description.en = member.description.en ? member.description.en : 'missing';
            member.description.de = member.description.de ? member.description.de : 'missing';

            params.label = params.label ? params.label : {};
            member.label.en = params.label.en ? params.label.en : member.label.en;
            member.label.de = params.label.de ? params.label.de : member.label.de;

            params.description = params.description ? params.description : {};
            member.description.en = params.description.en ? params.description.en : member.description.en;
            member.description.de = params.description.de ? params.description.de : member.description.de;

            itcb(null);
        }

        function cleanDynamicMembers(itcb) {
            var
                member,
                disallow = [
                    'actTypes',
                    'actTypesLabel',
                    '-en',
                    '-de',
                    'dateFormat',
                    'modeLabel',
                    'list'
                ],
                i, k;

            for (k in schema) {
                if (schema.hasOwnProperty(k)) {
                    member = schema[k];
                    //  remove members which are dynamically added
                    for (i = 0; i < disallow.length; i++) {
                        if (member.hasOwnProperty(disallow[i])) {
                            Y.log('Clean up submitted schema, remove dynamic property: ' + k + '.' + disallow[i], 'debug', NAME);
                            delete member[disallow[i]];
                        }
                    }
                }
            }

            itcb(null);
        }

        function loadFile(itcb) {
            fs.readFile(fileName, onFileRead);

            function onFileRead(err, buffer) {
                if (err) {
                    return itcb(err);
                }

                rawFile = buffer + '';
                itcb(null);
            }
        }

        function cutOutJSON(itcb) {
            var
                IN_HEADER = 0,
                IN_JSON = 1,
                IN_FOOTER = 2,

                lines = rawFile.split('\n'),
                state = IN_HEADER,
                i;

            for (i = 0; i < lines.length; i++) {
                if (lines[i].trim() === '//-- end schema') {
                    state = IN_FOOTER;
                }

                if (state === IN_FOOTER) {
                    fileFoot.push(lines[i]);
                }

                if (state === IN_HEADER) {
                    fileHead.push(lines[i]);
                }

                if (lines[i].trim() === '//-- start schema') {
                    state = IN_JSON;
                }
            }

            itcb(null);
        }

        function saveFile(itcb) {
            var
                jsonText = JSON.stringify(schema, undefined, 4),
                jsonLines = jsonText.split('\n'),
                fileText = fileHead.join('\n') + '\n' + '        Y.dcforms.schema.InCase_T = ',
                i;

            for (i = 0; i < jsonLines.length; i++) {
                if (i === jsonLines.length - 1) {
                    jsonLines[i] = jsonLines[i] + ';';
                }
                fileText = fileText + '        ' + jsonLines[i] + '\n';
            }

            fileText = fileText + '\n' + fileFoot.join('\n');

            fs.writeFile(fileName, fileText, itcb);
        }

        function onAllDone(err) {
            if (err) {
                Y.log('Could not load ' + fileName + ': ' + JSON.stringify(err), 'warn', NAME);
                return args.callback(err);
            }

            // schema may have been changed by other users, send back updated file from disk
            args.callback(null, schema);
        }
    }

    function checkApiAccess(params, callback) {
        const
            {friend} = params,
            forbidden = new Y.doccirrus.commonerrors.DCError(401),
            mochaUtils = require('../server/mochaUtils')(Y);

        if (mochaUtils.getAppName() === friend) {
            return setImmediate(callback);
        }
        return setImmediate(callback, forbidden);
    }

        /**
         *  Send an IPC ping to the master instance, call back with response from server
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.callback
         */

        function ipcping( args ) {
            Y.log( `Invoke IPC ping from worker: ${Y.doccirrus.ipc.whoAmI()}`, 'debug', NAME );

            let
                startTime = ( new Date() ).getTime(),
                eventName = Y.doccirrus.ipc.events.IPC_PING,
                msg = 'ping ' + ( new Date() );

            Y.doccirrus.ipc.sendAsync( eventName, { 'msg': msg }, onMasterResponse );

            function onMasterResponse( err, data ) {

                if ( !err && !data ) {
                    err = new Error( `Ping data us empty: '${data}'` );
                }

                if ( err ) {
                    Y.log( `Problem with IPC call to master ${err.stack||err}`, 'error', NAME );
                    return args.callback( err );
                }

                let endTime = ( new Date() ).getTime();

                data.callerWhoAmI = Y.doccirrus.ipc.whoAmI();
                data.duration = ( endTime - startTime );
                args.callback( null, data );
            }
        }

        function ipcmastersubscribers( args ) {
            Y.log( `List IPC handlers on master from: ${Y.doccirrus.ipc.whoAmI()}`, 'debug', NAME );

            let
                eventName = Y.doccirrus.ipc.events.IPC_LIST_SUBSCRIBERS;

            Y.doccirrus.ipc.sendAsync( eventName, {}, onMasterResponse );

            function onMasterResponse( err, data ) {
                if ( err ) {
                    Y.log( `Problem with IPC call to master ${err.stack||err}`, 'error', NAME );
                    return args.callback( err );
                }
                args.callback( null, data );
            }
        }

        /**
         *  Toggle noisy IPC logging
         *  @param args
         */

        function ipclogging( args ) {
            let
                currentState = Y.doccirrus.ipc.useNoisyLogging,
                eventName = Y.doccirrus.ipc.events.IPC_SET_NOISY;

            Y.doccirrus.ipc.send( eventName, { 'noisy': !currentState }, false, false );
            Y.doccirrus.ipc.useNoisyLogging = !currentState;

            args.callback( null, { 'noisy': Y.doccirrus.ipc.useNoisyLogging } );
        }

        async function ipcspeedtest( args ) {
            const
                eventName = Y.doccirrus.ipc.events.IPC_PING,
                DATA_SIZE = 1024,
                ROUND_TRIPS = 1024;

            let
                err,
                startTime, endTime,
                packet = '',
                i;

            for ( i = 0; i < DATA_SIZE; i++ ) {
                packet = packet + ( ( Math.random() > 0.5 ) ? 'A' : 'b' );
            }

            //console.log( '(*****) packet: ', packet );

            startTime = ( new Date() ).getTime();

            for ( i = 0; i < ROUND_TRIPS; i++ ) {
                [ err ] = await formatPromiseResult( pingOnce() );
                if ( err ) {
                    Y.log( `IPC problem during speed test: ${err.stack||err}`, 'error', NAME );
                    return args.callback( err );
                }

            }

            endTime = ( new Date() ).getTime();
            args.callback( null, {
                'time': ( endTime - startTime ),
                'roundTrips': ROUND_TRIPS,
                'packet': packet
            } );

            async function pingOnce() {
                return new Promise( function( resolve, reject ) {

                    Y.doccirrus.ipc.sendAsync( eventName, { 'msg': packet }, onMasterResponse );

                    function onMasterResponse( err, data ) {

                        if ( !err && !data ) {
                            err = new Error( `Ping data us empty: '${data}'` );
                        }

                        if ( err ) {
                            Y.log( `Problem with IPC call to master ${err.stack||err}`, 'error', NAME );
                            return reject( err );
                        }

                        resolve( true );
                    }

                } );
            }

        }


        /**
         *  Issue a slow ping to test cleanup of uncalled callbacks, test/dev route
         *
         *  Includes a ten second delay, to allow callback to be in queue during cleanup
         *
         *  @param  {Object}    args
         *  @param  {Function}  args.callback   Will only be called after delay
         */

        function ipcCleanupTest( args ) {
            const
                eventName = Y.doccirrus.ipc.events.IPC_PING,
                ipcData = {
                    msg: 'test slow ping',
                    wait: 10 * 1000,
                    cleanupImmediately: true
                };

            Y.doccirrus.ipc.sendAsync( eventName, ipcData, onMasterResponse );

            function onMasterResponse( err, data ) {
                if ( err ) {
                    Y.log( `Problem with slow IPC call to master ${err.stack||err}`, 'error', NAME );
                    args.callback( err );
                    return;
                }
                args.callback( null, { 'status': 'slow ping', 'data': data } );
            }
        }

        /**
         *  Get/Set system wide logLevel
         *  @param {Object} args
         *      @param {Object} args.httpRequest - HttpRequest object (express.js req object)
         *      @param {Object} args.httpRequest.query - Query params object of the URL
         *      @param {string} args.httpRequest.query.logLevel - Log level the user wants to set.
         *                                                        If empty return currently used
         *                                                        values to set: [debug|info|warn|error]
         *      @param {function} args.callback
         */
        function toggleLogging (  args = {} ) {
            const
                { httpRequest: {query: {logLevel} = {} } = {}, callback } = args,
                LOG_LEVELS = ['debug', 'info', 'warn', 'error'],
                eventName = Y.doccirrus.ipc.events.TOGGLE_LOGGING;

            if(!logLevel){
                return callback( null, {currentLogLevel: Y.config.logLevel});
            }

            if(!LOG_LEVELS.includes(logLevel)){
                return callback( Y.doccirrus.errors.http( 500, `Unknown log level ${logLevel}` ) );
            }

            //set logLevel on current worker
            Y.doccirrus.utils.setLogLevel( { logLevel } );
            //broadcast event to other workers including master
            Y.doccirrus.ipc.send( eventName, { logLevel }, false, false );
            callback( null, { logLevel } );
        }

        /**
         * Gets all group master schedules from 2019-03-25 with patient set and create a group slot from them to show this patient
         *
         * @param args {Object}
         * @param args.user {Object}
         * @param args.callback {Function}
         * @returns {Promise.<*>}
         */
        async function convertPatientCapacityMasterSchedules( args ) {
            const {user, callback} = args;
            let err, result, scheduleModel;

            [err, scheduleModel] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel(
                        user,
                        'schedule',
                        true,
                        ( err, result ) => err ? reject( err ) : resolve( result )
                    );
                } )
            );

            if( err ) {
                Y.log( `convertPatientCapacityMasterSchedules: Error getting schedule collection model. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !scheduleModel ) {
                Y.log( `convertPatientCapacityMasterSchedules: Failed to fetch schedule collection model`, "error", NAME );
                return callback( `convertPatientCapacityMasterSchedules: Failed to fetch schedule collection model` );
            }

            [err, result] = await formatPromiseResult(
                scheduleModel.mongoose.find(
                    {
                        group: true,
                        patient: {$exists: true},
                        _id: {$gt: ObjectId( Math.floor( ( new Date( '2019-03-25' ) ) / 1000 ).toString( 16 ) + "0000000000000000" )}
                    }, {}, {lean: true}
                )
            );

            if( err ) {
                Y.log( `convertPatientCapacityMasterSchedules: Error getting group masters. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            result.forEach( async item => {

                if( 0 >= item.capacityOfGroup ) {
                    Y.log( `convertPatientCapacityMasterSchedules: Group master ${item._id.toString()} was skipped because capacityOfGroup is 0 already.`, "error", NAME );
                    return;
                }
                item.groupId = item._id.toString();
                item.group = null;
                item.capacityOfGroup = null;
                delete item._id;

                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'post',
                        model: 'schedule',
                        context: {
                            migrateGroup: true
                        },
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( item )
                    } )
                );

                if( err ) {
                    Y.log( `convertPatientCapacityMasterSchedules: Error inserting group schedule. Error:\n${err.stack || err}`, "error", NAME );
                }
            } );

            return callback();
        }

        /**
         *  Support / one-off route to regenerate the concatenated PDF on a cashlog, SUP-22883
         *
         *      1.  Make a list of all invoice activities in this log
         *      2.  Make a list of all PDFs and join them together, generate PDFs if missing
         *      3.  Store the new PDF in the database
         *      4.  Link PDF from the cashlog
         *
         *  @param args
         *  @returns {Promise<*>}
         */

        async function regenerateCashlogPdf( args ) {
            const
                util = require( 'util' ),
                moment = require( 'moment' ),
                params = args.originalParams,
                makePdfP = promisifyArgsCallback( Y.doccirrus.api.formtemplate.makepdf ),
                concatenatePDFsP = util.promisify( Y.doccirrus.media.pdf.concatenatePDFs ),
                importFileP = util.promisify( Y.doccirrus.media.gridfs.importFile );

            let
                invoiceLogId = params.invoiceLogId || '',
                err, results,
                newMediaId,
                mediaIds = [],
                diskFile,
                mediaId,
                preferName,
                i;

            if ( !invoiceLogId ) {
                err = new Error( 'please give an invoiceLogId' );
                Y.log( `Could not regenerate cashlog PDF, no invoiceLogId given: ${JSON.stringify( params )}` );
                return args.callback( err );
            }

            //  1.  Make a list of all invoice activities in this log

            [ err, results ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'activity',
                    query: {
                        actType: 'INVOICE',
                        invoiceLogId: invoiceLogId
                    },
                    options: {
                        select: {
                            _id: 1,
                            invoiceNo: 1,
                            status: 1,
                            formPdf: 1,
                            formId: 1,
                            formVersion: 1
                        }
                    }
                } )
            );

            if ( err ) {
                Y.log( `Could not load activities from invoice log: ${err.stack||err}`, 'error', NAME );
                return args.callback( err );
            }

            //  2.  Make a list of all PDFs and join them together, generate the PDFs if missing

            for ( i = 0; i < results.length; i++ ) {
                if ( results[i].formPdf ) {
                    mediaIds.push( results[i].formPdf );
                } else {
                    Y.log( `Invoice does not have a pdf: ${JSON.stringify( results[i] )}, regenerating.`, 'info', NAME );

                    [ err, newMediaId ] = await formatPromiseResult(
                        makePdfP( {
                            user: args.user,
                            originalParams: {
                                mapObject: results[i]._id.toString(),
                                mapCollection: 'activity',
                                formId: results[i].formId,
                                formVersionId: results[i].formVersion
                            },
                            skipTriggerRules: true,
                            skipTriggerSecondary: true
                        } )
                    );

                    if ( err ) {
                        Y.log( `Could not regenerate PDF for: ${JSON.stringify(results[i])}`, 'error', NAME );
                        return args.callback( err );
                    }

                    Y.log( `Generated new PDF ${JSON.stringify(newMediaId)} for INVOICE ${results[i]._id} ${results[i].invoiceNo}`, 'info', NAME );
                    if ( newMediaId.mediaId ) {
                        mediaIds.push( newMediaId.mediaId );
                    }
                }
            }

            if ( 0 === mediaIds.length ) { return args.callback( new Error( `No PDFs found for invoiceLogId ${invoiceLogId}` ) ); }

            [ err, diskFile ] = await formatPromiseResult(
                concatenatePDFsP( { user: args.user, mediaIds: mediaIds } )
            );

            if ( err ) {
                Y.log( `Could not concatenate PDFs: ${err.stack||err}`, 'error', NAME );
                return args.callback( err );
            }

            Y.log( `Generated PDFs concatenated to single file: ${ diskFile }`, 'info', NAME );

            //  3.  Store the new PDF in the database

            [ err, mediaId ] = await formatPromiseResult(
                importFileP( args.user, diskFile, Y.doccirrus.media.getCacheDir() + diskFile, false )
            );

            if ( err ) {
                Y.log( `Could not import file from disk: ${err.stack||err}`, 'error', NAME );
                return args.callback( err );
            }

            Y.log( `Concatenated PDFs stored into gridfs: ${ mediaId }`, 'debug', NAME );

            //  4.  Link PDF from the cashlog

            preferName = `${moment().format('YYYYMMDD') }_${ moment().format('HHmmss') }_Rechnungen_x${mediaIds.length}`;

            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    action: 'update',
                    model: 'cashlog',
                    query: { '_id': invoiceLogId },
                    data: {
                        $set: {
                            padnextFileId: mediaId,
                            padnextFileName: preferName
                        }
                    }
                } )
            );

            if ( err ) {
                Y.log( `Could not update cashlog: ${err.stack||err}`, 'error', NAME );
                return args.callback( err );
            }

            args.callback( null, { status: `Generated PDF: ${preferName}` } );
        }

        /**
         *  Test / dev route to get memory stats for the current worker, MOJ-12426
         *  @param args
         */

        function getMemoryUsage( args ) {
            const v8 = require('v8');
            var
                result = {
                    statistics: v8.getHeapStatistics(),
                    usage: process.memoryUsage()
                };

            args.callback( null, result );
        }

        /**
         *  Creates Q-Docu activities out of old Q-Docu Formular
         *  @method migrateFormularToQDocu
         *  @param {Object} args
         *  @param {Function} args.callback
         *  @param {module:authSchema.auth} args.user
         *  @return {undefined}
         */
        async function migrateFormularToQDocu( args ) {
            Y.log( '==== Entering migrateFormularToQDocu ====', 'info', NAME );

            //immediate callback call to not trigger the 45s jsonrpc timeout
            // eslint-disable-next-line callback-return
            args.callback();

            const {user, callback} = args,
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel ),
                _is2020 = ( datumunt ) => datumunt.getTime() < new Date( 2021, 0, 1 ).getTime() &&
                                          datumunt.getTime() >= new Date( 2020, 0, 1 ).getTime();

            let count = 0, failCount = 0, error, formTotal, result, activityModel;
            const formNames = ['ZKA', 'ZKP', 'ZKH', 'ZKZ'],
                buildFileP = promisifyArgsCallback( Y.doccirrus.api.edoc.buildFile );

            [error, activityModel] = await formatPromiseResult( getModelProm( user, 'activity', true ) );
            if( error ) {
                Y.log( `migrateFormularToQDocu: Cannot get activity model:\n${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            [error, formTotal] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'document',
                query: {
                    'formState.formName': {$in: formNames},
                    type: 'FORM',
                    activityId: {$exists: true},
                    patientId: {$exists: true},
                    caseFolderId: {$exists: true},
                    formId: {$exists: true}
                },
                action: 'count'
            } ) );
            if( error ) {
                Y.log( `migrateFormularToQDocu: Error in counting forms:\n${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            Y.log( 'migrateFormularToQDocu: Founded total ' + formTotal + ' documents.', 'info', NAME );

            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'document',
                action: 'aggregate',
                pipeline: [
                    {
                        $match: {
                            'formState.formName': {$in: formNames},
                            type: 'FORM',
                            activityId: {$exists: true},
                            patientId: {$exists: true},
                            caseFolderId: {$exists: true},
                            formId: {$exists: true}
                        }
                    },
                    {
                        $addFields: {
                            activityIdObj: {$toObjectId: '$activityId'}
                        }
                    },
                    {
                        $lookup: {
                            from: 'activities',
                            localField: 'activityIdObj',
                            foreignField: '_id',
                            as: 'activity'
                        }
                    },
                    {
                        $group: {
                            _id: {
                                locationId: '$locationId'
                            },
                            documents: {$addToSet: '$$ROOT'}
                        }
                    },
                    {
                        $project: {
                            locationId: '$_id.locationId',
                            documents: '$documents'
                        }
                    }
                ]
            } ) );

            result = result.result || [];

            async function validate( activity ) {
                const dbOptions = {ignoreReadOnly: ['actType']};
                let status, err, res;
                [err, res] = await formatPromiseResult( buildFileP( {user: user, activity: activity} ) );

                if( err || !res || res.isCanceled || !res.isValid ) {
                    status = 'INVALID';
                } else {
                    status = 'VALID';
                }

                activity.status = 'VALID';

                activity = Object.assign( activity, res.updateData );
                if( !activity.skipcheck_ ) {
                    activity = Y.doccirrus.filters.cleanDbObject( activity );
                }
                dbOptions.entireRec = true;

                [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'put',
                    model: 'activity',
                    query: {_id: activity._id},
                    data: activity,
                    options: dbOptions,
                    fields: Object.keys( activity )
                } ) );

                if( error || (Array.isArray( result ) && !result.length) ) {
                    Y.log( `migrateFormularToQDocu: Error in putting activity into database. ${error && (error.stack || error)}`, 'error', NAME );

                    delete res.updateData.content;
                    [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'update',
                        model: 'activity',
                        query: {_id: activity._id},
                        data: {$set: res.updateData},
                        options: dbOptions
                    } ) );
                    status = 'INVALID';
                    if( error ) {
                        Y.log( `migrateFormularToQDocu: not possible to update activity. skip. ${error.stack || error}`, 'error', NAME );
                    }
                }

                if( 'INVALID' === status ) {
                    return Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        query: {
                            _id: activity._id
                        },
                        action: 'update',
                        data: {$set: {status: "INVALID"}}
                    } );
                }
            }

            async function convertToQDocu( document ) {
                const hasValue = ( value ) => value && value !== '&nbsp;',
                    activity = document.activity[0],
                    formState = document.formState || {},
                    mapData = document.mapData || {};

                let patients, locations, employees;

                if( !activity || !Object.keys( activity ) || !Object.keys( activity ).length ) {
                    Y.log( `migrateFormularToQDocu: There is no activity by id ${document.activityId} for document ${document._id} ! skip...`, 'error', NAME );
                    return null;
                }

                [error, patients] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    query: {
                        _id: activity.patientId
                    }
                } ) );

                if( error || !patients || !patients.length ) {
                    error = error || new Y.doccirrus.commonerrors.DCError( 404, {message: 'patient not found'} );
                    Y.log( `migrateFormularToQDocu: Patient ${activity.patientId} not found:\n${error.stack || error}`, 'error', NAME );
                    patients = [{}];
                }

                [error, locations] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    query: {
                        _id: activity.locationId
                    }
                } ) );

                if( error || !locations || !locations.length ) {
                    error = error || new Y.doccirrus.commonerrors.DCError( 404, {message: 'location not found'} );
                    Y.log( `migrateFormularToQDocu: Location ${activity.locationId.toString()} not found:\n${error.stack || error}`, 'error', NAME );
                    locations = [{}];
                }

                [error, employees] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'employee',
                    query: {
                        _id: activity.employeeId
                    }
                } ) );

                if( error || !employees || !employees.length ) {
                    error = error || new Y.doccirrus.commonerrors.DCError( 404, {message: 'location not found'} );
                    Y.log( `migrateFormularToQDocu: Location ${activity.locationId.toString()} not found:\n${error.stack || error}`, 'error', NAME );
                    employees = [{}];
                }

                const patient = patients[0],
                    publicInsurance = (patient.insuranceStatus || []).find( elem => elem.type === 'PUBLIC' ),
                    officialAddress = (patient.addresses || []).find( address => address.kind === 'OFFICIAL' ),
                    patientAddress = officialAddress ? officialAddress : (patient.addresses || [])[0],
                    iknrFirst2Digits = hasValue( formState.KennzeichenKK ) && formState.KennzeichenKK.slice( 0, 2 ) || '',
                    versichertenstatusgkv = iknrFirst2Digits === '10' && !publicInsurance.persGroup ? '1' : 0;

                const timestampMoment = moment( activity.timestamp || new Date() );

                const newActivity = {
                    actType: "QDOCU",
                    programmzk: "ZK",
                    module: document.formState.formName,
                    userContent: document.formState.formName,
                    content: document.formState.formName,
                    versichertenstatusgkv: versichertenstatusgkv,
                    locationId: typeof activity.locationId === 'string' ? ObjectId( activity.locationId ) : activity.locationId,
                    patientId: activity.patientId,
                    timestamp: activity.timestamp,
                    dmpQuarter: timestampMoment.quarter(),
                    dmpYear: timestampMoment.year(),
                    caseFolderId: activity.caseFolderId,
                    editor: activity.editor,
                    employeeName: activity.employeeName,
                    patientLastName: activity.patientLastName,
                    patientFirstName: activity.patientFirstName,
                    lastChanged: activity.lastChanged,
                    kasseiknr: publicInsurance.insuranceId || formState.KennzeichenKK,
                    versichertenidneu: publicInsurance.insuranceNo || formState.eGKVersichertennr,
                    bsnrambulant: locations[0].commercialNo || formState.BSNR,
                    lanr: employees[0].officialNo || formState.LANR,
                    idnrpat: patient.patientNo || formState.PatIdentnr,
                    gebdatum: moment( (patient.kbvDob || formState.Patdob), 'DD.MM.YYYY' ).toDate() || null,
                    employeeId: mapData.employeeId
                };

                switch( document.formState.formName ) {
                    case 'ZKA':
                        // this is a form mapper bug. Untersuchungsdatum is mapped to PatPLZ field
                        newActivity.datumunt = formState.PatPLZ ? moment( formState.PatPLZ, 'DD.MM.YYYY' ).toDate() : moment( activity.timestamp ).toDate();
                        break;
                    case 'ZKH':
                        newActivity.datumunt = formState.HPVTestdate ? moment( formState.HPVTestdate, 'DD.MM.YYYY' ).toDate() : moment( activity.timestamp ).toDate();
                        break;
                    case 'ZKP':
                        newActivity.datumunt = formState.Primärscreeningdate ? moment( formState.Primärscreeningdate, 'DD.MM.YYYY' ).toDate() : moment( activity.timestamp ).toDate();
                        break;
                    case 'ZKZ':
                        newActivity.datumunt = formState.ZytotestUntersuchungsdate ? moment( formState.ZytotestUntersuchungsdate, 'DD.MM.YYYY' ).toDate() : moment( activity.timestamp ).toDate();
                        break;
                }

                const is2020 = _is2020( newActivity.datumunt || activity.timestamp );

                switch( document.formState.formName ) {
                    case 'ZKA':
                        newActivity.zytbefundvorunt = formState.VorbefundZytoNomenklaturlll;
                        newActivity.hpvtvoruntvorhand = formState.VorbefundHPV;
                        newActivity.hpvtvorbefund = formState.VorbefundHPVErgebnis;
                        if( is2020 ) {
                            newActivity.zytbefundvorunt01 = formState.VorbefundZytoGruppe0l;
                            newActivity.zytbefundvoruntii = formState.VorbefundZytoGruppell;
                            newActivity.zytbefundvoruntiii = formState.VorbefundZytoGruppelll;
                            newActivity.zytbefundvoruntiiid = formState.VorbefundZytoGruppelllD;
                            newActivity.zytbefundvoruntiv = formState.VorbefundZytoGruppeIV;
                            newActivity.zytbefundvoruntv = formState.VorbefundZytoGrupeV;
                            newActivity.zervixeinstellbar = formState.ZervixEinstellbar;
                            newActivity.verdachtais = formState.VerdachtAIS;
                            newActivity.metaplasievorgaenge = formState.EinstufungDysplasievorgaenge;
                            newActivity.adenocarcinomainsitu = formState.AIS !== '?' ? formState.AIS : '';
                            newActivity.invasivplattenepithelkarz = formState.InvasivesPlattenepithelkarzinom;
                            newActivity.hpvvirustypvorbefund = formState.VorbefundVirustyp;
                            newActivity.invasivadenokarz = formState.InvasivesAdenokarzinom;
                            newActivity.sonstbefbiopskueret = `${formState['1sonstigeBefunde38']}${formState['2sonstigeBefunde38']}`;
                            newActivity.artopeingriff = formState.DurchfuehrungoperativerEingriff;
                            newActivity.endhistolbefundvorh = formState.endueltigerhistoBefund;
                            if( newActivity.artopeingriff === "8" ) {
                                newActivity.sonstopeingr2 = `${formState['1SonstigeoperativeEingriffe52']}${formState['1SonstigeoperativeEingriffe521']}`;
                            }
                        }
                        newActivity.kolposkbefund = formState.KolposkopischerBefund;
                        newActivity.pzgsichtbar = formState.SichtbarkeitPZG;
                        newActivity.tztyp = formState.TypTZ;
                        newActivity.normalbefund = formState.Normalbefund;
                        newActivity.gradabnbefunde = formState.EinstufungabnormenBefunde;
                        newActivity.lokalabnbefunde = formState.LokalisationabnormenBefunde;
                        newActivity.groesselaesion = formState.GroeßeLaesion;
                        newActivity.verdachtinvasion = formState.VerdachtInvasion;
                        newActivity.weiterebefunde = formState.weitereBefunde;
                        newActivity.kongenanomalie = formState.kongenitaleAnomalie;
                        newActivity.kondylome = formState.Kondylome;
                        newActivity.endometriose = formState.Endometriose;
                        newActivity.ektoendopolypen = formState.Polypen;
                        newActivity.entzuendung = formState.Entzuendung;
                        newActivity.stenose = formState.Stenose;
                        newActivity.postopveraend = formState.PostOPVeraenderung;
                        newActivity.sonstweitbefunde = formState.Sonstige32;
                        newActivity.sonstbefunde = `${formState['1Sonstige33']}${formState['2Sonstige33']}`;
                        newActivity.massnahmen = formState.Maßnahmen;
                        newActivity.anzahlbiopsien = formState.AnzahlBiopsien;
                        newActivity.befundbiopskueret = formState.Befund;
                        newActivity.sonstmetaplasiebefunde = formState.sonstigeBefunde37;
                        newActivity.empfohlenemassnahmebiops = formState.EmpfohleneManahme;
                        newActivity.empfohlenekontrabkl = formState.EmpfehlungKontolleAbklaerung;
                        newActivity.zeithorizontkontrabkl = formState.ZeithorizontweitereKolposkopie;
                        newActivity.zeithorizont = formState.Zeithorizont;
                        newActivity.therapieempfehlung = formState.Therapieempfehlung === '&nbsp;' ? null : (formState.Therapieempfehlung || '').split( '' ).pop();
                        switch( newActivity.therapieempfehlung ) {
                            case '3':
                                newActivity.sonstopeingr = `${formState['1SonstigeoperativeEingriffe44']}${formState['2SonstigeoperativeEingriffe44']}`;
                                break;
                            case '8':
                                newActivity.weiteretherapieempf = `${formState.weitereTherapieempfehlungen1}${formState.weitereTherapieempfehlungen1}`;
                                break;
                        }
                        newActivity.opdatum = formState.OPdate ? moment( formState.OPdate, 'DD.MM.YYYY' ).toDate() : null;
                        newActivity.methokonisation = formState.MethodeKonisation;
                        newActivity.tiefekonus = formState.TiefeKonus;
                        newActivity.methoexzision = formState.MethodeExzision;
                        newActivity.umfangexzision = formState.UmfangExzision;
                        newActivity.grading = formState.Grading === '&nbsp;' ? null : (formState.Grading || '').split( '' ).pop();
                        newActivity.stagingfigo = formState.StagingFIGO;
                        newActivity.tnmpt = formState.StagingpT;
                        newActivity.tnmpn = formState.StagingpN;
                        newActivity.tnmpm = formState.StagingpM;
                        break;
                    case 'ZKH':
                        newActivity.untersuchungsnummer = formState.PatUntersuchungsnr;
                        newActivity.produkt = `${formState.HPVTestProduktname1}${formState.HPVTestProduktname2}`;
                        newActivity.hpvtergebnis = formState.HPVTestErgebnis;
                        newActivity.hpvvirustyp = formState.Virustyp;
                        if( is2020 ) {
                            newActivity.pznvorhanden = formState.hatHPVTextPZN;
                            newActivity.pzn = formState.HPVTestPZN;
                        }
                        break;
                    case 'ZKP':
                        newActivity.plz3stellig = patientAddress.zip || formState.PatPLZ;
                        newActivity.hpvimpfung = formState.HPVImpfung;
                        newActivity.produkt = `${formState.NameHPVImpfstoff1}${formState.NameHPVImpfstoff2}`;
                        newActivity.herkunftimpfstatus = formState.FeststellungImpfstatus;
                        newActivity.artuanlunt = formState.ArtAnlassUntersuchung;
                        newActivity.befundevoruntvorh = formState.vorherigeBefunde;
                        newActivity.herkunftergebvoru = formState.Ergebnisdokumentation;
                        newActivity.voruntdatum = formState.letzteUntersuchungdate ? moment( formState.letzteUntersuchungdate ).format( 'MM.YYYY' ) : null;
                        newActivity.zytbefundvoruntvorh = formState.BefundZytoNomenklaturlll_1;
                        newActivity.zytbefundvorunt = formState.VorbefundZytoNomenklaturlll;
                        if( is2020 ) {
                            newActivity.zytbefundvorunt01 = formState.VorbefundZyto0l;
                            newActivity.zytbefundvoruntii = formState.VorbefundZytoGruppell;
                            newActivity.zytbefundvoruntiii = formState.VorbefundZytoGruppelll;
                            newActivity.zytbefundvoruntiiid = formState.VorbefundZytoGruppelllD;
                            newActivity.zytbefundvoruntiv = formState.VorbefundZytoGruppeIV;
                            newActivity.zytbefundvoruntv = formState.VorbefundZytoGruppeV;
                            newActivity.hpvvirustypvorbefund = formState.VorbefundVirustyp;
                            newActivity.invasivadenokarz = formState.InvasivesAdenokarzinom;
                            newActivity.metaplasievorgaenge = formState.EinstufungDysplasievorgaenge;
                            newActivity.adenocarcinomainsitu = formState.AIS !== '?' ? formState.AIS : '';
                            newActivity.invasivplattenepithelkarz = formState.InvasivesPlattenepithelkarzinom;
                            newActivity.zytbefund01 = formState.BefundZytoGruppe0i; //this
                            newActivity.zytbefundii = formState.BefundZytoGruppell;
                            newActivity.zytbefundiii = formState.BefundZytoGruppelll;
                            newActivity.zytbefundiiid = formState.BefundZytoGruppelllD;
                            newActivity.zytbefundiv = formState.BefundZytoGruppeIV;
                            newActivity.zytbefundv = formState.BefundZytoGruppeV;

                        }
                        newActivity.hpvtvoruntvorhand = formState.HPVTestErgebnis_2;
                        newActivity.hpvtvorbefund = formState.VorbefundHPVTestErgebnis;
                        newActivity.histologvorbefundvorunt = formState.VorbefundHisto;
                        newActivity.sonstmetaplasiebefunde = formState.SonstigeBefunde31;
                        newActivity.sonstbefunde = `${formState['1SonstigeBefunde32']}${formState['2SonstigeBefunde32']}`;
                        newActivity.anamabweichvorunt = formState.Abweichungen;
                        newActivity.ausflusspathblutung = formState.AusflusspathBlutungen;
                        newActivity.iup = formState.IUP;
                        newActivity.hormonanwendungen = formState.EinnahmeOvuhemmerSonstigeHormone;
                        newActivity.gynopradiatio = formState.ZustandnachGynOPRadiatio;
                        newActivity.graviditaet = formState.Schwangerschaft;
                        newActivity.klinischerbefund = formState.KlinischerBefund;
                        newActivity.untersuchungsnummer = formState.UntersuchungsnummerZyto;
                        newActivity.zytbefund = formState.BefundZytoNomenklaturlll;
                        newActivity.hpvtest = formState.HPVTest;
                        newActivity.hpvtergebnis = formState.HPVTestErgebnis_1;
                        newActivity.hpvvirustyp = formState.Virustyp;
                        newActivity.empfohlenemassnahme = formState.EmpfohleneMaßnahme;
                        newActivity.empfohlenekontrabkl = formState.EmpfehlungKontrolleAbklaerung;
                        newActivity.zeithorizontkontrabkl = formState.ZeithorizontKontrolleAbklaerung;
                        newActivity.zeithorizont = formState.Zeithorizont;
                        break;
                    case 'ZKZ':
                        newActivity.untersuchungsnummer = formState.PatUntersuchungsnr;
                        newActivity.methoabstrentnahme = formState.MethodeAbstrichentnahmeAufbereitung;
                        newActivity.produkt = `${formState.NameDünnschichtzytoTest1}${formState.NameDünnschichtzytoTest2}`;
                        newActivity.zytbefund = formState.BefundZytoNomenklaturlll;
                        if( is2020 ) {
                            newActivity.zytbefund01 = formState.BefundZytoGruppe0l;
                            newActivity.zytbefundii = formState.BefundZytoGruppell;
                            newActivity.zytbefundiii = formState.BefundZytoGruppelll;
                            newActivity.zytbefundiiid = formState.BefundZytoGruppelllD;
                            newActivity.zytbefundiv = formState.BefundZytoGruppeIV;
                            newActivity.zytbefundv = formState.BefundZytoGruppeV;
                        }
                        break;
                }

                Object.keys( newActivity ).forEach( ( k ) => {
                    if( newActivity[k] === null || newActivity[k] === undefined || newActivity[k] === '&nbsp;' || newActivity[k] === '' ) {
                        delete newActivity[k];
                    }
                } );
                return newActivity;
            }

            if( Array.isArray( result ) ) {
                for( let i = 0; i < result.length; i++ ) {
                    const locationGroup = result[i];
                    for( let j = 0; j < locationGroup.documents.length; j++ ) {
                        let qDocu = await convertToQDocu( locationGroup.documents[j] );
                        if( !qDocu ) {
                            Y.log('migrateFormularToQDocu: converting formular to QDocu failed, skipping...', 'error', NAME);
                            failCount++;
                            continue;
                        }
                        [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( qDocu )
                        } ) );

                        if( error ) {
                            Y.log( `migrateFormularToQDocu: Error in inserting new QDocu from formular ${locationGroup.documents[j]._id.toString()} to database:\n${error.stack || error}`, 'error', NAME );
                            Y.log( 'migrateFormularToQDocu: skipping schema validations...', 'warn', NAME );
                            qDocu = Y.merge( Y.doccirrus.schemaloader.getEmptyDataForSchema( Y.doccirrus.schemaloader.getSchemaForSchemaName( 'v_simple_activity' ) ), qDocu );
                            qDocu.apkState = "IN_PROGRESS";
                            qDocu.activities = [];
                            qDocu._id = new ObjectId();

                            [error, result] = await formatPromiseResult( activityModel.mongoose.collection.insertOne( qDocu ) );
                            if( error ) {
                                Y.log( `migrateFormularToQDocu: Error in inserting new QDocu with skipping validation:\n${error.stack || error}`, 'error', NAME );
                                continue;
                            }
                        } else {
                            const id = result[0];
                            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                query: {
                                    _id: id
                                }
                            } ) );
                            if( error ) {
                                Y.log( `migrateFormularToQDocu: Cannot retrieve Q-Docu form database:\n${error.stack || error}`, 'error', NAME );
                                continue;
                            }
                            qDocu = result[0];
                        }
                        count++;

                        const is2020 = _is2020( qDocu.datumunt );

                        if( is2020 ) {
                            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                action: 'update',
                                query: {
                                    _id: qDocu._id
                                },
                                data: {
                                    $set: {
                                        status: 'SENT'
                                    }
                                }
                            } ) );
                        } else {
                            [error] = await formatPromiseResult( validate( qDocu ) );
                        }
                    }
                }
            }
            Y.log( '==== Exiting migrateFormularToQDocu: Created ' + count + ' activity items, failed ' + failCount + ' items (from ' + formTotal + ' documents total) from formular documents ====', 'info', NAME );
            return callback();
        }

        async function testMedidataAccess( {callback} ) {
            Y.log( `Entering Y.doccirrus.api.test.testMedidataAccess`, 'info', NAME );

            const needle = require( 'needle' ),
                needleGetP = util.promisify( needle.get ),
                httpsGetP = util.promisify( Y.doccirrus.https.externalGet ),
                auth = `Basic ${Buffer.from( `admin:admin` ).toString( 'base64' )}`,
                clientId = '1000004662',
                options = {
                    rejectUnauthorized: false,
                    headers: {
                            'X-CLIENT-ID': clientId,
                            'Authorization': auth
                        }
                };

            let error, result;

            Y.log('testMedidataAccess: needle.get by url https://medidata.ext.doc-cirrus.com:8100/md', 'info', NAME);
            [error, result] = await formatPromiseResult( needleGetP( 'https://medidata.ext.doc-cirrus.com:8100/md', options ) );

            if( error ) {
                Y.log( `testMedidataAccess: error in sending with options ${JSON.stringify( options )}. Error: ${error.stack || error}`, 'error', NAME );
            } else if( result ) {
                const {body, statusCode, statusMessage} = result;
                Y.log( `testMedidataAccess: GET request with options ${JSON.stringify( options )}. Result: ${JSON.stringify( {
                    body,
                    statusCode,
                    statusMessage
                } )}`, 'info', NAME );
            }

            Y.log('testMedidataAccess: needle.get by url https://medidata.ext.doc-cirrus.com:8100', 'info', NAME);
            [error, result] = await formatPromiseResult( needleGetP( 'https://medidata.ext.doc-cirrus.com:8100', options ) );

            if( error ) {
                Y.log( `testMedidataAccess: error in sending with options ${JSON.stringify( options )}. Error: ${error.stack || error}`, 'error', NAME );
            } else if( result ) {
                const {body, statusCode, statusMessage} = result;
                Y.log( `testMedidataAccess: GET request with options ${JSON.stringify( options )}. Result: ${JSON.stringify( {
                    body,
                    statusCode,
                    statusMessage
                } )}`, 'info', NAME );
            }

            Y.log('testMedidataAccess: Y.doccirrus.https.externalGet by url https://medidata.ext.doc-cirrus.com:8100/md', 'info', NAME);
            [error, result] = await formatPromiseResult( httpsGetP( 'https://medidata.ext.doc-cirrus.com:8100/md', options ) );

            if( error ) {
                Y.log( `testMedidataAccess: error in sending with options ${JSON.stringify( options )}. Error: ${error.stack || error}`, 'error', NAME );
            } else if( result ) {
                const {body, response} = result;
                if(!response && !body) {
                    Y.log( `testMedidataAccess: GET request with options ${JSON.stringify( options )}. Result: ${JSON.stringify( {result} )}`, 'info', NAME );
                } else {
                    Y.log( `testMedidataAccess: GET request with options ${JSON.stringify( options )}. Result: ${JSON.stringify( {
                        body, response
                    } )}`, 'info', NAME );
                }
            }

            Y.log('testMedidataAccess: Y.doccirrus.https.externalGet by url https://medidata.ext.doc-cirrus.com:8100', 'info', NAME);
            [error, result] = await formatPromiseResult( httpsGetP( 'https://medidata.ext.doc-cirrus.com:8100', options ) );

            if( error ) {
                Y.log( `testMedidataAccess: error in sending with options ${JSON.stringify( options )}. Error: ${error.stack || error}`, 'error', NAME );
            } else if( result ) {
                const {body, response} = result;
                if(!response && !body) {
                    Y.log( `testMedidataAccess: GET request with options ${JSON.stringify( options )}. Result: ${JSON.stringify( {result} )}`, 'info', NAME );
                } else {
                    Y.log( `testMedidataAccess: GET request with options ${JSON.stringify( options )}. Result: ${JSON.stringify( {
                        body, response
                    } )}`, 'info', NAME );
                }
            }

            return callback();
        }
        /**
         *
         */

        Y.namespace( 'doccirrus.api' ).test = {

            get: function( args ) {
                Y.doccirrus.test.mochaRunner.runSingleMochaSuite( args );
            },
            post: function( args ) {
                args.callback();
            },
            put: function( args ) {
                args.callback();
            },
            delete: function( args ) {
                args.callback();
            },
            zombie: function() {
                // never callback...
            },

            runAllMochaSuites: function ( args ) {
                const cluster = require('cluster');
                if ( cluster.isMaster ) {
                    Y.doccirrus.test.mochaRunner.runAllMochaSuites();
                } else {
                    process.send( {
                        execute: 'runAllMochaSuites'
                    } );
                }
                return args.callback( null, 'Mocha tests started execution, see run log for more details..');
            },
            getLastMochaReport: function ( args ) {
                Y.doccirrus.test.mochaRunner.getLastMochaReport( args );
            },
            testWarnings: function( args ) {
                testWarnings( args );
            },
            testErrorInErrorTable: function( args ) {
                testErrorInErrorTable( args );
            },
            testErrorNotInErrorTable: function( args ) {
                testErrorNotInErrorTable( args );
            },
            testTrialReport: function( args ) {
                Y.doccirrus.monitoring.vprcTrialReport();
                setTimeout(function(){ args.callback(); }, 100);
            },
            testUncaught: function( args ) {
                var a = Math.random()*100, b;

                args.callback();    //  eslint-disable-line callback-return

                setTimeout( function() {
                    if( a > 75 ) {
                        require( 'vm' ).runInThisContext( 'binary ! isNotOk' );

                    } else if( a > 50 ) {
                        a = b.propertyOfUndefined;  // throw reference error.

                    }
                    // to test EADDRINUSE simply start the server twice
                    /*else if( a>75 && a < 85 ) {
                     let e = new Error();
                     Object.assign(e, {
                     syscall: 'dummy System Error',
                     code: 'EADDRINUSE',
                     errno: -999
                     } ); // should crash the system
                     throw e;
                     } */ else if( a > 25 ) {
                        /*global doesNotExist */ // lie to jshint....
                        doesNotExist(); // refrenence error

                    } else {
                        throw new Error( 'Some custom error.' );

                    }
                } );
            },
            testSocketApiCall: function( args ) {
                testSocketApiCall( args );
            },
            testExternalApiCall: function( args ) {
                args.callback();
            },
            testGetOnlineList: function( args ){
                let
                    callback = args.callback,
                    async = require( 'async' );
                async.parallel({
                    getOnlineServerList: function(done){
                        Y.doccirrus.socketIOPRC.getOnlineServerList( list => done( null, list ) );
                    },
                    getFreshOnlineServerList: function(done){
                        Y.doccirrus.communication.getFreshOnlineServerList( done );
                    }
                }, callback );
            },
            testPrintParams: function( args ) {
                var params = args.originalParams;
                Y.log('Made test request with parameters: ' + JSON.stringify(params), 'debug', NAME);
                args.callback(null, params);
            },
            testGetOnlineListPUC: function( args ){
                let
                    callback = args.callback;
                Y.doccirrus.socketIOPUC.getAvailablePractices( callback );
            },
            runSingleMochaSuite: function( args ){
                runSingleMochaSuite( args );
            },

            regenerateLabdataReportings: function( args ) { regenerateLabdataReportings( args ); },
            testAddLabdataFullText: function( args ) { testAddLabdataFullText( args ); },

            mmiS: function( args ) {
                let
                    { callback } = args,
                    testData = {
                        medicationPlan: {
                            "AUTHOR": {
                                "NAME": "Dr. Xra Überall",
                                "CITY": "Am Ort",
                                "STREET": "Hauptstraße 55",
                                "ZIP": "01234",
                                "PHONE": "04562-12345",
                                "EMAIL": "m.ueberall@mein-netz.de"
                            },
                            "PATIENT": {
                                "PARAMETERS": {
                                    "WEIGHT": "86"
                                },
                                "FIRSTNAME": "Michaela",
                                "LASTNAME": "Muster_103"
                            },
                            "IDENTIFICATION": {
                                "LANGUAGECODE": "de-DE",
                                "PRINTINGDATE": 1455750000000,
                                "VERSION": "022",
                                "IDENTIFICATIONNAME": "4A3178DB13504F929C8E4B8D181D10B6"
                            },
                            "CARRIERBLOCKS": [
                                {
                                    "PAGENUMBER": 1,
                                    "PAGECOUNT": 1,
                                    "MEDICATIONENTRIES": [
                                        {
                                            "SUBHEADING": "@411",
                                            "ENTRYTYPE": "HEADING"
                                        }, {
                                            "ACTIVESUBSTANCENAME": "Glyceroltrinitrat",
                                            "DRUGNAME": "Nitrolingual® 1 Pumpspray 14,2g N1",
                                            "STRENGTH": "0.4mg",
                                            "PHARMFORM": "SPR",
                                            "REFERENCE": "bei anhaltender Brustenge",
                                            "ENTRYTYPE": "LABELEDDRUG"
                                        }, {
                                            "ACTIVESUBSTANCENAME": "Zopiclon",
                                            "DOSAGESCHEDULE": "zN:½",
                                            "DRUGNAME": "Zopiclon AL 7,5 10 Filmtbl. N1",
                                            "STRENGTH": "7.5mg",
                                            "PHARMFORM": "FTA",
                                            "ENTRYTYPE": "LABELEDDRUG"
                                        }, {
                                            "ACTIVESUBSTANCENAME": "Melperon hydrochlorid",
                                            "DOSAGESCHEDULE": "mo:5-10ML",
                                            "DRUGNAME": "Melperon-neuraxpharm® Liquidum 300ml Lsg. N3",
                                            "STRENGTH": "4.39mg",
                                            "PHARMFORM": "LSE",
                                            "ENTRYTYPE": "LABELEDDRUG"
                                        }, {
                                            "REFERENCE": "bei Bedarf",
                                            "ENTRYTYPE": "LABELEDDRUG"
                                        }, {
                                            "SUBHEADING": "@412",
                                            "ENTRYTYPE": "HEADING"
                                        }, {
                                            "DRUGNAME": "AGOPTON 15MG",
                                            "PHARMFORM": "KMR",
                                            "ENTRYTYPE": "ACTIVESUBSTANCE"
                                        }, {
                                            "ACTIVESUBSTANCENAME": "Torasemid",
                                            "DOSAGESCHEDULE": "mo:1 mi:(½)",
                                            "DRUGNAME": "Torasemid AL 10mg 50 Tbl. N2",
                                            "STRENGTH": "10.0mg",
                                            "PHARMFORM": "TAB",
                                            "REFERENCE": "bei Besserung ggf. mittags weglassen",
                                            "ENTRYTYPE": "LABELEDDRUG"
                                        }, {
                                            "ACTIVESUBSTANCENAME": "Ursodeoxycholsäure",
                                            "DRUGNAME": "Ursofalk® 250mg 100 Kaps. N3",
                                            "STRENGTH": "250.0mg",
                                            "PHARMFORM": "HKP",
                                            "ENTRYTYPE": "LABELEDDRUG"
                                        }, {
                                            "ACTIVESUBSTANCENAME": "Levothyroxin natrium",
                                            "DRUGNAME": "L-Thyroxin Henning® 75 100 Tbl. N3",
                                            "STRENGTH": "72.9µg",
                                            "PHARMFORM": "TAB",
                                            "ENTRYTYPE": "LABELEDDRUG"
                                        }, {
                                            "ACTIVESUBSTANCENAME": "Allopurinol",
                                            "DRUGNAME": "Allopurinol AL 300 100 Tbl. N3",
                                            "STRENGTH": "300.0mg",
                                            "PHARMFORM": "TAB",
                                            "REFERENCE": "2x/Woche 1/2",
                                            "ENTRYTYPE": "LABELEDDRUG"
                                        }, {
                                            "ACTIVESUBSTANCENAME": "Captopril~Hydrochlorothiazid",
                                            "DRUGNAME": "Captogamma® HCT 25/25 100 Tbl. N3",
                                            "STRENGTH": "25.0mg~25.0mg",
                                            "PHARMFORM": "TAB",
                                            "ENTRYTYPE": "LABELEDDRUG"
                                        } ]
                                } ]
                        }
                    };

                Y.doccirrus.api.mmi.generateCarrierSegments( {
                    data: testData,
                    callback
                } );
            },
            mmiMP( args ){
                let
                    { callback } = args,
                    testData = {
                        carrierSegment: '<MP U="4A3178DB13504F929C8E4B8D181D10B6" l="de-DE" v="022"><P f="Muster_103" g="Michaela"/><A c="Am Ort" e="m.ueberall@mein-netz.de" n="Dr. Xra Überall" p="04562-12345" s="Hauptstraße 55" t="2016-02-18" z="01234"/><O w="86"/><S><M a="Nitrolingual® 1 Pumpspray 14,2g N1" fd="SPR" i="bei anhaltender Brustenge"><W s="0.4mg" w="Glyceroltrinitrat"/></M><M a="Zopiclon AL 7,5 10 Filmtbl. N1" fd="FTA" t="zN:½"><W s="7.5mg" w="Zopiclon"/></M><M a="Melperon-neuraxpharm® Liquidum 300ml Lsg. N3" fd="LSE" t="mo:5-10ML"><W s="4.39mg" w="Melperon hydrochlorid"/></M><M i="bei Bedarf"/></S><S c="412"><M a="AGOPTON 15MG" fd="KMR"/><M a="Torasemid AL 10mg 50 Tbl. N2" fd="TAB" i="bei Besserung ggf. mittags weglassen" t="mo:1 mi:(½)"><W s="10.0mg" w="Torasemid"/></M><M a="Ursofalk® 250mg 100 Kaps. N3" fd="HKP"><W s="250.0mg" w="Ursodeoxycholsäure"/></M><M a="L-Thyroxin Henning® 75 100 Tbl. N3" fd="TAB"><W s="72.9µg" w="Levothyroxin natrium"/></M><M a="Allopurinol AL 300 100 Tbl. N3" fd="TAB" i="2x/Woche 1/2"><W s="300.0mg" w="Allopurinol"/></M><M a="Captogamma® HCT 25/25 100 Tbl. N3" fd="TAB"><W s="25.0mg" w="Captopril"/><W s="25.0mg" w="Hydrochlorothiazid"/></M></S></MP>'
                    };
                Y.doccirrus.api.mmi.generateMedicationPlan( {
                    data: testData,
                    callback
                } );
            },
            mmiPDF( args ){
                let
                    { callback } = args,
                    mongoose = require( 'mongoose' ),
                    tmpFileName = `${new mongoose.Types.ObjectId().toString()}_original.APPLICATION_PDF.pdf`,
                    media = Y.doccirrus.media,
                    tmpF = media.getCacheDir(),
                    testData = {
                        carrierSegment: '<MP U="4A3178DB13504F929C8E4B8D181D10B6" l="de-DE" v="022"><P f="Muster_103" g="Michaela"/><A c="Am Ort" e="m.ueberall@mein-netz.de" n="Dr. Xra Überall" p="04562-12345" s="Hauptstraße 55" t="2016-02-18" z="01234"/><O w="86"/><S><M a="Nitrolingual® 1 Pumpspray 14,2g N1" fd="SPR" i="bei anhaltender Brustenge"><W s="0.4mg" w="Glyceroltrinitrat"/></M><M a="Zopiclon AL 7,5 10 Filmtbl. N1" fd="FTA" t="zN:½"><W s="7.5mg" w="Zopiclon"/></M><M a="Melperon-neuraxpharm® Liquidum 300ml Lsg. N3" fd="LSE" t="mo:5-10ML"><W s="4.39mg" w="Melperon hydrochlorid"/></M><M i="bei Bedarf"/></S><S c="412"><M a="AGOPTON 15MG" fd="KMR"/><M a="Torasemid AL 10mg 50 Tbl. N2" fd="TAB" i="bei Besserung ggf. mittags weglassen" t="mo:1 mi:(½)"><W s="10.0mg" w="Torasemid"/></M><M a="Ursofalk® 250mg 100 Kaps. N3" fd="HKP"><W s="250.0mg" w="Ursodeoxycholsäure"/></M><M a="L-Thyroxin Henning® 75 100 Tbl. N3" fd="TAB"><W s="72.9µg" w="Levothyroxin natrium"/></M><M a="Allopurinol AL 300 100 Tbl. N3" fd="TAB" i="2x/Woche 1/2"><W s="300.0mg" w="Allopurinol"/></M><M a="Captogamma® HCT 25/25 100 Tbl. N3" fd="TAB"><W s="25.0mg" w="Captopril"/><W s="25.0mg" w="Hydrochlorothiazid"/></M></S></MP>'
                    };
                Y.doccirrus.api.mmi.generateMedicationPlanPDF( {
                    data: testData,
                    callback( err, data ){
                        if( err ) {
                            return callback( err );
                        }
                        media.writeFile( tmpF + tmpFileName, tmpF, Buffer.from( data ), function( err ) {

                            return callback( err, tmpFileName );
                        } );
                    }
                } );
            },

            checkMediaOwners: function __checkMediaOwners( args ) {
                Y.doccirrus.media.relationships.checkMediaOwners( args );
            },

            checkMediaDuplicates: function __checkMediaDuplicates( args ) {
                Y.doccirrus.media.relationships.checkMediaDuplicates( args );
            },

            removeWellKnownTestData: function( args ) {
                const async = require( 'async' );
                let { user, httpRequest, data, callback } = args;
                if( !isSystemAllowedToSupportTesting( httpRequest ) ){
                    Y.log( 'it is not allowed on this system', 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( 405 ) );
                }

                if( !data || !data.models || data.models.length === 0 ) {
                    return callback( "at least one model should be provided" );
                }
                async.eachSeries( data.models,
                    ( modelObj, nextModel ) => {
                        let
                            model = Object.keys( modelObj )[0],
                            queries = modelObj[model];

                        async.eachSeries( queries,
                            ( query, next ) => {
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: model,
                                    action: 'delete',
                                    query: query,
                                    options: {
                                        override: true
                                    }
                                }, next );
                            },
                            ( err ) => {
                                nextModel( err );
                            }
                        );
                    },
                    ( err ) => {
                        callback( err, "cleanup finished" );
                    }
                );

            },

            setNoCrossLocationAccessToFalse: function( args ) {
                let { user, httpRequest, callback } = args;
                if( !isSystemAllowedToSupportTesting( httpRequest ) ){
                    Y.log( 'it is not allowed on this system', 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( 405 ) );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'settings',
                    action: 'put',
                    query: {},
                    fields: [ 'noCrossLocationAccess' ],
                    data: Y.doccirrus.filters.cleanDbObject( { noCrossLocationAccess: false } )
                }, ( err ) => {
                    callback( err, 'noCrossLocationAccess set to false' );
                } );
            },

            setIsMocha: function( { user, httpRequest, data, callback } ) {
                if( !isSystemAllowedToSupportTesting( httpRequest ) ){
                    Y.log( 'it is not allowed on this system', 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( 405 ) );
                }
                //Object.getPrototypeOf( Y.doccirrus.licmgr ).ignoresLicensing
                //      will be also affected, therefore overall licensing checks will be compromised

                if( data.revert === false && !Y.doccirrus.auth._isMocha ){
                    Y.log( `Mock isMocha on ${user.tenantId}`, 'debug', NAME );
                    Y.doccirrus.auth._isMocha = Y.doccirrus.auth.isMocha;
                    Y.doccirrus.auth.isMocha = () => { return true; };
                }

                if( data.revert === true && Y.doccirrus.auth._isMocha ) {
                    Y.log( `Revert isMocha on ${user.tenantId}`, 'debug', NAME );
                    Y.doccirrus.auth.isMocha = Y.doccirrus.auth._isMocha;
                    delete Y.doccirrus.auth._isMocha;
                }
                callback( null );
            },

            postRuleSet: function( args ) {
                let { user, data, callback } = args;
                if( !data || !data._id ) {
                    return callback("Exact ruleSet Id is not provided");
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'rule',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( data )
                }, (err, result) => {
                    callback( err, result );
                } );
            },

            activePatientList: activePatientList,

            migrateMisassignedMediaImports: migrateMisassignedMediaImports,

            addInitials: addInitials,
            websmsrecv: websmsrecv,

            getReducedSchema: getReducedSchema,
            updateReducedSchema: updateReducedSchema,
            deleteMongoDbCache( args ){
                let
                    {user, callback} = args;
                Y.doccirrus.cacheUtils.mongoDbCache.removeCache( {
                    tenantId: user.tenantId
                }, callback );
            },
            deleteHtmlCache( args ){
                let
                    {user, callback} = args;
                Y.doccirrus.cacheUtils.htmlCache.removeCache( {
                    tenantId: user.tenantId
                }, callback );
            },
            testScoketManagerCheck(args){
                let
                    {callback} = args;
                Y.doccirrus.socketeventmanager.checkTargetsStatus();
                callback();
            },
            testScoketManagerClean(args){
                let
                    {callback} = args;
                Y.doccirrus.socketeventmanager.cleanSavedExternalApiCalls();
                callback();
            },
            echo( args ){
                args.callback( null, { echo: 'echo' } );
            },
            checkApiAccess,
            ipcping,
            ipcmastersubscribers,
            ipclogging,
            ipcspeedtest,
            ipcCleanupTest,
            toggleLogging,
            migrateFormularToQDocu,
            async getPatientOFACInfo(args) {
                var params = args.originalParams;
                var result = await Y.doccirrus.api.patient.getPatientOFACInfo( {
                    user: args.user,
                    cardNo: (params && params.cardNo) || '80756000080065239808'
                } );
                return args.callback( result );
            },
            convertPatientCapacityMasterSchedules,
            regenerateCashlogPdf,
            getMemoryUsage,
            testMedidataAccess
        };
    },
    '0.0.1',
    {
        requires: [
            'dccommunication',
            'DCSocketIOPRC',
            'DCSocketIOPUC',
            'mocha-runner',
            'dcmedia-store',
            'dcmedia-relationships',
            'reporting-api',
            'reporting-cache',
            'cache-utils',
            'SocketEventManager'
        ]
    }
);