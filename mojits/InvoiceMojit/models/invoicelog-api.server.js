/**
 * User: do
 * Date: 25/02/15  18:31
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'invoicelog-api', function( Y, NAME ) {

        const
            accessError = Y.doccirrus.errors.rest( 401, '', true ),
            Prom = require( 'bluebird' ),
            runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),

            {formatPromiseResult} = require('dc-core').utils,

            noop = function() {},

            IPC_CHECK_ITERMEDIATE_INVOICELOG_STATES = 'check-intermediate-invoicelog-states',
            INTERMIDIATE_STATES = ['VALIDATING', 'APPROVING', 'MERGING'],
            INVOICE_TYPES = ['KBV', 'PVS', 'CASH', 'KVG'];
        const notifyUser = ( user, data ) => {
            if( data.progress ) {
                data.progress.type = data.action;
            }
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'invoicelogAction',
                eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                msg: {
                    data
                }
            } );
        },
        schemaPathsMap = Y.doccirrus.schemas.invoicelog.schemaPathsMap;


        var
            initalWorkerPids;

        function getInvoiceAPI( type ) {
            switch( type ) {
                case'KBV':
                case'GKV':
                    return Y.doccirrus.api.kbvlog;
                case 'PVS':
                    return Y.doccirrus.api.pvslog;
                case 'CASH':
                    return Y.doccirrus.api.cashlog;
                case 'KVG':
                    return Y.doccirrus.api.tarmedlog;
            }
        }

        function getInvoiceModelName( type ) {
            switch( type ) {
                case'KBV':
                case'GKV':
                case'ASV':
                    return 'kbvlog';
                case 'PVS':
                    return 'pvslog';
                case 'CASH':
                    return 'cashlog';
                case 'KVG':
                    return 'tarmedlog';
            }
        }

        function pushActivity( activity, arr ) {
            if( 'VALID' === activity.status ) {
                arr.push( activity._id );
            }
        }

        function collectIdsToApprove( schein ) {
            var _ = require( 'lodash' ),
                results = [], activities;

            activities = _.flatten( [[schein], schein.treatments, schein.medications, schein.diagnoses, schein.continuousDiagnoses] );
            activities.forEach( function( activity ) {
                pushActivity( activity, results );
            } );

            return results;
        }

        function onApproveProgress( user, id, progress, invoiceType ) {
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'invoicelogAction',
                eventType: Y.doccirrus.schemas.socketioevent.eventTypes.NODB,
                msg: {
                    data: {
                        invoiceType: invoiceType,
                        action: 'approving',
                        state: 'progress',
                        progress: progress,
                        id: id
                    }
                }
            } );
        }

        /**
         * Will try to reset intermediate invoicelog states
         */
        function reset() {
            var migrate = require( 'dc-core' ).migrate;

            function finalCb( err, results ) {
                if( err ) {
                    Y.log( 'could not hard reset itermediate invoicelog states for ' + (results && results.length) + ' tenants ' + err, 'error', NAME );
                    return;
                }
                Y.log( 'reset itermediate invoicelog states for ' + (results && results.length) + ' tenants ', 'info', NAME );
            }

            function onTenant( user, cb ) {
                Y.log( 'try hard reset of invoicelog intermediate states', 'info', NAME );
                Prom.map( INVOICE_TYPES, function( invoiceType ) {
                    var modelName = getInvoiceModelName( invoiceType );
                    return runDb( {
                        user: user,
                        model: modelName,
                        action: 'put',
                        migrate: true,
                        fields: ['status', 'pid', 'notApproved', 'isPreValidated', 'totalItems'],
                        query: {
                            status: {
                                $in: INTERMIDIATE_STATES
                            },
                            pid: {
                                $nin: Y.doccirrus.ipc.getPids()
                            }
                        },
                        data: Y.doccirrus.filters.cleanDbObject( {
                            status: 'CANCELED',
                            pid: '',
                            multi_: true,
                            notApproved: [0, 0, 0],
                            isPreValidated: false,
                            totalItems: ''
                        } )
                    } ).then( function( updatedDocs ) {
                        return updatedDocs.length;
                    } );
                } ).then( function( updated ) {
                    updated.forEach( function( count, index ) {
                        Y.log( 'hard reset intermediate invoicelog (' + INVOICE_TYPES[index] + ') states for tenant' + user.tenantId + ': ' + count, 'debug', NAME );
                    } );
                    cb();
                } ).catch( function( err ) {
                    Y.log( 'could not hard reset intermediate invoicelog states for tenant' + user.tenantId + ': ' + err, 'error', NAME );
                    cb( err );
                } );

            }

            migrate.eachTenantParallelLimit( onTenant, 1, finalCb );
        }

        /**
         * Will be called if worker restarts
         *
         * @param   {Object}     data
         * @param   {Number}    data.pid
         * @param   {Function}  callback    Always calls back immediately, does not wait for reset operation
         */
        function workerRestarted( data, callback ) {
            if( -1 !== initalWorkerPids.indexOf( data.pid ) ) {
                callback( null );
                return;
            }
            reset();
            callback( null );
        }

        function init() {
            if( Y.doccirrus.ipc.isMaster() ) {
                // save initial pids so we only do a soft reset in case a worker dies
                initalWorkerPids = Y.doccirrus.ipc.getPids();
                reset();
                Y.doccirrus.ipc.subscribeNamed( IPC_CHECK_ITERMEDIATE_INVOICELOG_STATES, NAME, true, workerRestarted );
            } else {
                Y.doccirrus.ipc.sendAsync( IPC_CHECK_ITERMEDIATE_INVOICELOG_STATES, {pid: Y.doccirrus.ipc.pid()}, noop );
            }
        }

        Y.doccirrus.auth.onReady( function() {
            // MOJ-2445
            setTimeout( function() {

                init();

            }, 5000 );
        } );


        /**
         *  Create a INVOICEREFPVS/GKV activity corresponding to an invoice log entry
         *
         *  Invoice log entry should have:
         *
         *      patient                 -   patient object
         *      treatments              -   array of reduced treatment objects including activity _ids
         *      diagnoses               -   array of reduced diagnosis objects including activity _ids
         *      continuousDiagnoses     -   optional array of continuous diagnoses
         *
         *  Overview:
         *
         *      1.  If the activity has already been created then we can skip this
         *      2.  Create new INVOICEREFPVS/GKV activity
         *      3.  Lookup employee and set employee properties on activity
         *      4.  Add linked treatments and diagnoses
         *      5.  Save new activity to database
         *      6.  Write new activity _id to the invoicelog entry
         *
         *  Promise should resolve with _id of new activity
         *
         *  @public
         *  @param  {Object}    user                REST user with reference to employee
         *  @param  {Object}    invoiceLogEntry     As stored in database
         *  @param  {String}    actType             May be INVOICEREFPVS or INVOICEREFGKV
         *  @param  {String}    description         String describing PVSlog creation settings
         *  @param  {Boolean}   returnFullActivity  Return weather id or full object
         *  @return {Promise}
         */

        async function createReferenceActivity(user, invoiceLogEntry, actType, description = '', returnFullActivity = false) {

            const isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
            //  1.  If the activity has already been created then we can skip this
            if ( invoiceLogEntry.activityId ) {
                if(returnFullActivity) {
                    let [err, invoiceRef] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            _id: invoiceLogEntry.activityId
                        }
                    }));
                    if(err) {
                        throw Y.doccirrus.errors.rest(500, `Cannot get invoiceRef from invoiceLog ${invoiceLogEntry._id}`);
                    }
                    return invoiceRef[0];
                }
                return invoiceLogEntry.activityId;
            }

            if (!invoiceLogEntry || !invoiceLogEntry.data || !invoiceLogEntry.data.locationId) {
                throw Y.doccirrus.errors.rest(500, 'Invalid invoice log entry, missing locationId.');
            }

            if (!invoiceLogEntry || !invoiceLogEntry.data || !invoiceLogEntry.data.caseFolderId) {
                throw Y.doccirrus.errors.rest(500, 'Invalid invoice log entry, missing caseFolderId.');
            }

            if (!invoiceLogEntry || !invoiceLogEntry.data.patient || !invoiceLogEntry.data.patient._id) {
                throw Y.doccirrus.errors.rest(500, 'Invalid invoice log entry, no patient.');
            }

            if (!user || !user.specifiedBy) {
                throw Y.doccirrus.errors.rest(500, 'Missing specifiedBy, cannot create reference activity');
            }

            //  2.  Create new INVOICEREFPVS activity
            let
                err, result,
                REFERENCE_NO_i18n = Y.doccirrus.i18n( 'banklog-schema.BankLog_T.referenceNumber.i18n' ),
                referenceNo = invoiceLogEntry.data.referenceNo,
                invoiceNo = invoiceLogEntry.data.invoiceNo,
                patientId = invoiceLogEntry.data.patient._id,
                employeeId = invoiceLogEntry.data.employeeId || user.specifiedBy || invoiceLogEntry.data.employeeId,
                userContent = (referenceNo ? `${REFERENCE_NO_i18n}: ${referenceNo}` : '') + description,
                timestamp = Date.now(),
                employee,

                activity = {
                    'actType': actType,
                    'status': 'ACCEPTED',
                    'apkState': 'VALIDATED',
                    'timestamp': timestamp,                             //  ~at which the pvslog was finalized
                    'patientId': patientId,                             //  from schein
                    'employeeId': employeeId,                           //  from current user
                    'locationId': invoiceLogEntry.data.locationId,      //  from schein
                    'caseFolderId': invoiceLogEntry.data.caseFolderId,  //  from schein
                    'content': '' + userContent,
                    'userContent': '' + userContent,

                    'invoiceentryId': invoiceLogEntry._id.toString(),

                    'activities': [],
                    'medications': [],
                    'icds': [],
                    'icdsExtra': [],
                    'attachments': [],
                    'attachedMedia': [],
                    'subType': '',
                    'time': '',

                    'partnerInfo': '',
                    'explanations': '',
                    'referencedBy': [],

                    'formId': '',
                    'formVersion': '',
                    'formPdf': '',
                    'formLang': 'de',
                    'formGender': 'f',

                    'patientLastName': invoiceLogEntry.data.patient.lastname,
                    'patientFirstName': invoiceLogEntry.data.patient.firstname,
                    'code': '',
                    'catalogShort': '',
                    'scheinNotes': invoiceLogEntry.data.scheinNotes
                },

                treatments = invoiceLogEntry.data.treatments || [],
                diagnoses = invoiceLogEntry.data.diagnoses || [],
                medications = invoiceLogEntry.data.medications || [],
                continuousDiagnoses = invoiceLogEntry.data.continuousDiagnoses || [],
                putData,
                i;

            switch( actType ) {
                case 'INVOICEREFPVS':
                    activity.pvslogId = invoiceLogEntry.invoiceLogId;
                    break;
                case 'INVOICEREFGKV':
                    activity.kbvlogId = invoiceLogEntry.invoiceLogId;
                    break;
                case 'INVOICEREF':
                    activity.kvglogId = invoiceLogEntry.invoiceLogId;
                    activity.invoiceLogId = invoiceLogEntry.invoiceLogId;
                    activity.invoiceLogType = 'Medidata';
                    activity.status = 'APPROVED';
                    activity.receipts = [];
                    activity.content = `${userContent} ${activity.patientFirstName} ${activity.patientLastName}`;
                    activity.userContent = `${userContent} ${activity.patientFirstName} ${activity.patientLastName}`;
                    activity.invoiceDate = timestamp;
                    activity.total = 0;
                    activity.totalReceiptsOutstanding = 0;
                    activity.totalReceipts = 0;
                    activity.invoiceNo = invoiceNo;
                    activity.invoiceRefNo = referenceNo;
                    break;
                default: throw Y.doccirrus.errors.rest(500, 'Invalid invoice log entry activity type.');
            }

            if (invoiceLogEntry.data.referenceNo) {
                activity.referenceNo = invoiceLogEntry.data.referenceNo;
            }

            //  3.  Lookup employee and set employee properties on activity

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                'model': 'employee',
                'user': user,
                'query': { '_id': employeeId }
                } )
            );

            if ( !err && !result[0] ) {
                err = Y.doccirrus.errors.rest( 404, 'Could not find employee for current user' );
            }

            if ( err ) {
                Y.log( `Could not load employee for current user: ${JSON.stringify( err )}`, 'warn', NAME );
                throw err;
            }

            employee = result[0];
            activity.employeeName = Y.doccirrus.schemas.person.personDisplay( employee );
            activity.employeeInitials = employee.initials;
            activity.price = activity.price || 0;
            //  4.  Add linked treatments and diagnoses

            for (i = 0; i < treatments.length; i++) {
                activity.activities.push(treatments[i]._id);
            }


            if( isSwiss && 'INVOICEREF' === actType ) {
                for (i = 0; i < medications.length; i++) {
                    activity.activities.push(medications[i]._id);
                }

                const {total = 0, totalVat = 0} = Y.doccirrus.invoiceutils.calculateSwissInvoiceTotal( {
                        linkedActivities: treatments.concat( medications )
                    } ),
                    totalRounded = Y.doccirrus.commonutilsCh.roundSwissPrice( total + totalVat );

                activity.price = activity.price + totalRounded;
                activity.total = activity.total + totalRounded;
                activity.totalReceiptsOutstanding = activity.totalReceiptsOutstanding + totalRounded;
                activity.totalReceipts = activity.totalReceipts + totalRounded;
            }

            for (i = 0; i < diagnoses.length; i++) {
                activity.icds.push(diagnoses[i]._id);
            }

            for (i = 0; i < continuousDiagnoses.length; i++) {
                activity.icdsExtra.push(continuousDiagnoses[i]._id);
            }

            //  5.  Save new activity to database

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    'model': 'activity',
                    'action': 'post',
                    'user': user,
                    'data': Y.doccirrus.filters.cleanDbObject(activity),
                    'options': {}
                })
            );

            if (err) {
                Y.log( `Could not create ${actType} for SCHEIN log: ${invoiceLogEntry._id}: ${err.stack||err}`, 'warn', NAME );
                throw err;
            }

            activity._id = result[0];

            //  6.  Write new activity _id to the invoicelog entry

            putData = {
                'fields_': ['activityId'],
                'activityId': activity._id
            };

            Y.log( `Setting new activityId on invoice entry: ${activity._id}`, 'debug', NAME);

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    'user': user,
                    'action': 'put',
                    'model': 'invoiceentry',
                    'query': {
                        '_id': invoiceLogEntry._id
                    },
                    'data': Y.doccirrus.filters.cleanDbObject(putData),
                    'options': {}
                })
            );

            if (err) {
                Y.log( `Could not store activityId on invoiceeentry: ${err.stack||err}`, 'warn', NAME);
            }

            Y.log( `Recorded activityId ${activity._id} on invoiceentry: ${invoiceLogEntry._id}`, 'debug', NAME);

            return returnFullActivity? activity : activity._id;
        }


        /**
         *  Save error item to invoiceentry
         *
         *  @public
         *  @param  {Object}    user                REST user with reference to employee
         *  @param  {Object}    entry               error data
         *  @param  {String}    ruleLogType         type of entry
         *  @param  {String}    inVoiceLogId        Id of invoice log
         *  @param  {String}    logType             type of log: KBV, PVS ...
         *  @param  {String}    source
         *  @return {*}
         */

        async function saveEntry( { user, entry, ruleLogType, inVoiceLogId, logType, source } ) {
            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user,
                    action: 'post',
                    model: 'invoiceentry',
                    data: Y.doccirrus.filters.cleanDbObject({
                        type: ruleLogType,
                        invoiceLogId: inVoiceLogId,
                        logType: logType,
                        data: entry,
                        source: source
                    })
                })
            );

            if (err) {
                Y.log( `Could not store invoice entry${ err.stack || err }`, 'warn', NAME);
                throw err;
            }
            Y.log( `Successfully set ${ruleLogType} item`, 'debug', NAME);
        }

        async function saveEntries( { user, entries, ruleLogType, inVoiceLogId, logType, source } ) {
            entries = entries.map(entry => {
                return {
                    type: ruleLogType,
                    invoiceLogId: inVoiceLogId,
                    logType: logType,
                    data: entry,
                    source: source
                };
            });
            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user,
                    action: 'post',
                    model: 'invoiceentry',
                    data: Y.doccirrus.filters.cleanDbObject( entries )
                })
            );

            if (err) {
                Y.log( `Could not store invoice entries ${ err.stack || err }`, 'warn', NAME);
                throw err;
            }
            Y.log( `Successfully set ${ruleLogType} item`, 'debug', NAME);
        }

        /**
         *  Get errors from invoiceentry
         *
         *  @public
         *  @param  {Object}    user                REST user with reference to employee
         *  @param  {Object}    query               query data
         *  @param  {String}    options             options
         *  @param  {String}    callback            callback function
         *  @return {Function}  callback            (err, entries)
         */

        async function getEntries( {user, query = {}, options, callback} ) {
            Y.log( 'Entering Y.doccirrus.api.invoicelog.getEntries', 'info', NAME );
            if( callback ) {
                callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.invoicelog.getEntries' );
            }
            let err, result, skipNumbers = options.skip || 0, patient, patientIds;

            if( query['data.patientName'] ) {
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'patient',
                        query: {
                            '$or': [
                                {'firstname': query['data.patientName']},
                                {'lastname': query['data.patientName']}
                            ]
                        }
                    } )
                );
                if( err ) {
                    Y.log( `getEntries: error getting patients:  ${err.stack || err}`, 'error', NAME );
                }
                patientIds = result && result.result && result.result.map( el => el._id.toString() ) || [];
            }

            if( patientIds && patientIds.length === 0 && query['data.patientName'] ) {
                return callback( null, [] );
            }

            delete query['data.patientName'];

            if( patientIds && (patientIds.length > 0) ) {
                query['data.patientId'] = {$in: patientIds};
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'invoiceentry',
                    query,
                    options
                } )
            );

            if ( err ) {
                Y.log( `getEntries: could not get invoice entry ${ err.stack || err}`, 'warn', NAME);
                return callback( err );
            }

            if( result.result && result.result.length ) {
                for (let entry of result.result ) { // eslint-disable-line no-unused-vars
                    if (entry.logType === "KVG" && entry.type === "ERROR" && entry.data && entry.data.patientId) {
                        [err, patient] = await  formatPromiseResult(
                            Y.doccirrus.mongodb.runDb({
                                user,
                                action: 'get',
                                model: 'patient',
                                query: {_id : entry.data.patientId}
                            })
                        );

                        if ( err  || !patient.length) {
                            Y.log( `Could not get invoice entry, failed to get patients ${ err.stack || err}`, 'warn', NAME);
                            return callback( err || Y.doccirrus.errors.rest(4502, {}, true) );
                        }

                        patient = patient[0];

                        entry.data.patientName = `${patient.firstname} ${patient.lastname}`;
                    }
                }

                // set number to items
                result.result.forEach( function( item, idx ) {
                    item.number = (idx + skipNumbers) + 1;
                });
            }
            return callback( null, result );
        }

        /**
         *  Calculate errors from invoiceentry
         *
         *  @public
         *  @param  {Object}    args                list of arguments
         *  @param  {String}    args.callback       callback function
         *  @param  {Object}    args.originalParams
         *  @param  {Object}    args.originalParams.inVoiceLogId
         *  @return {Function}  callback            (err, entries)
         */

        async function calculateEntries( args ) {
            Y.log('Entering Y.doccirrus.api.invoicelog.calculateEntries', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoicelog.calculateEntries');
            }
            const
                user = args.user,
                params = args.originalParams,
                inVoiceLogId = params.inVoiceLogId,
                callback = args.callback;
            let [ err, res ] = await formatPromiseResult(
                new Promise( (resolve, reject) => {
                    Y.doccirrus.invoiceserverutils.calculateErrors( user, inVoiceLogId, ( err, res ) => {
                        if( err ){
                            return reject(err);
                        }
                        resolve( res );
                    } );
                } )
            );
            if( err ) {
                Y.log(`calculateErrors: Error calculating: ${err.stack || err}`, 'error', NAME);
                throw err;
            }
            return callback( null, res );
        }

        /**
         *  Removes codes from invoice entries
         *
         *  @public
         *  @param  {Object}    user                REST user with reference to employee
         *  @param  {Object}    data                data to update
         *  @param  {Object}    query               query data
         *  @param  {String}    options             options
         *  @param  {String}    callback            callback function
         *  @return {Function}  callback            (err, result)
         */
        async function removeCode( { user, data, query = {}, options = {}, callback } ) {
            Y.log('Entering Y.doccirrus.api.invoicelog.removeCode', 'info', NAME);
            if (callback) {
                callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(callback, 'Exiting Y.doccirrus.api.budget.calculate');
            }
            let err, result;
            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user,
                    action: 'update',
                    model: 'invoiceentry',
                    data,
                    query,
                    options,
                    fields: ['data.affectedActivities']
                })
            );

            if ( err ) {
                Y.log( `Could not update invoice entry ${ err.stack || err}`, 'warn', NAME);
                return callback( err );
            }
            return callback( null, result );
        }

        /**
         *  Remove errors from invoiceentry
         *
         *  @public
         *  @param  {Object}    user                REST user with reference to employee
         *  @param  {Array}     data                list of items to remove
         *  @param  {String}    callback            callback function
         *  @return {*}
         */


        function removeEntries( { user, data, callback } ) {
            Y.log('Entering Y.doccirrus.api.invoicelog.removeEntries', 'info', NAME);
            if (callback) {
                callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(callback, 'Exiting Y.doccirrus.api.budget.calculate');
            }
            let async = require( 'async' );
            async.each( data, function( record, done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'invoiceentry',
                    action: 'delete',
                    query: {
                        _id: record._id
                    }
                }, () => {
                    if ( record.data.caseFolderId ) {
                        Y.doccirrus.api.rulelog.updateCaseFolderStats( {
                            user: user,
                            originalParams: {
                                caseFolderId: record.data.caseFolderId
                            },
                            callback: ( err ) => {
                                if( err ) {
                                    return;
                                }
                            }
                        } );
                    }
                    done();
                } );
            }, callback );
        }

        /**
         *  Update all INVOICEREF activities to status 'REPLACED' when corresponding log is replaced
         *
         *  May apply to INVOICEREFPVS or INVOICEREFGKV
         *  @param      {Object}    args
         *  @param      {Object}    args.user
         *  @param      {String}    args.invoiceLogId        PVS or KBV log
         *  @param      {Function}  args.callback
         *
         *  @returns    {Function}  callback            Of the form fn( err, activityIds )
         */

        async function replaceReferenceActivities( args) {
            const {user, invoiceLogId, onProgress} = args;
            const startTime = new Date();
            let
                err;

            Y.log(`Marking activities replaced for for invoicelog: ${invoiceLogId}`, 'debug', NAME);

            [ err ] = await formatPromiseResult (
                Y.doccirrus.invoiceprocess.forEachInvoiceEntry( {
                    'user': user,
                    'invoiceLogId': invoiceLogId,
                    startTime,
                    onProgress,
                    'iterator': replaceSingleReferenceActivity
                } )
            );

            if (err) {
                Y.log( `replaceReferenceActivities: Problem while replacing reference activities for pvslog ${invoiceLogId}: ${err.stack || err}`, 'warn', NAME);
                throw err;
            }

            async function replaceSingleReferenceActivity( invoiceEntry ) {

                //  reference activities are created for each schein, but not for headers, etc
                if ('schein' !== invoiceEntry.type || !invoiceEntry.activityId ) { return; }

                let
                    newStatusData = {
                        'status': 'REPLACED'
                    };

                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb({
                        'user': user,
                        'model': 'activity',
                        'action': 'update',
                        'query': {'_id': invoiceEntry.activityId },
                        'data': newStatusData
                    })
                );

                if (err) {
                    Y.log( `Could not update status of activity ${invoiceEntry.activityId}: ${JSON.stringify(err)}`, 'warn', NAME);
                    //  continue despite error
                    return;
                }

                Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', invoiceEntry.activityId );

                [ err ] = await formatPromiseResult(
                    Y.doccirrus.invoiceserverutils.auditChangeValues( user, invoiceEntry.activityId, { status: invoiceEntry.data && invoiceEntry.data.status || 'BILLED' }, { status: 'REPLACED' } )
                );
                if( err ){
                    Y.log( `replaceSingleReferenceActivity: error creating audit entry for ${invoiceEntry.activityId} : ${err.stack || err}`, 'warn', NAME );
                }
                Y.log( `Set activity status to RESET: ${invoiceEntry.activityId}`, 'debug', NAME);
            }
        }

        async function searchInvoiceLog( args ) {
            Y.log( 'Entering Y.doccirrus.api.invoicelog.searchInvoiceLog', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoicelog.searchInvoiceLog' );
            }

            const {user, query: {term, invoiceLogType}, callback} = args;
            let inactivePhysicianIds = null;

            if( (!term && term !== '') || !invoiceLogType ) {
                callback( Y.doccirrus.errors.rest( 500, 'Missing Parameter' ) );
                return;
            }
            const modelName = getInvoiceModelName( invoiceLogType );

            if( !modelName ) {
                callback( Y.doccirrus.errors.rest( 500, `Invoice Log Type ${invoiceLogType} not found` ) );
                return;
            }

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: modelName,
                fields: [
                    'status',
                    'locname',
                    'totalItems',
                    'insuranceTypes',
                    'minTotal',
                    'doNotcheckCatalog',
                    'useStartDate',
                    'startDate',
                    'useEndDate',
                    'endDate',
                    'employeeFilterEnabled',
                    'employees',
                    'padnextSettingTitle'
                ],
                query: {
                    status: {
                        $in: ['CREATED', 'VALID', 'INVALID']
                    },
                    $or: [
                        {locname: {$regex: term, $options: 'i'}},
                        {commercialNo: {$regex: term, $options: 'i'}}
                    ]
                }
            } ) );

            if( err ) {
                Y.log( `could not search ${modelName}: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }
            if( args.originalParams && args.originalParams.includeInvoiceEntryHeader === true ) {
                const physicianIdsToCheckIfActive = [];
                for( let invoiceLog of result ) {  // eslint-disable-line no-unused-vars
                    let invoiceEntryHeader;
                    [err, invoiceEntryHeader] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'invoiceentry',
                        query: {
                            invoiceLogId: invoiceLog._id,
                            type: 'header'
                        },
                        options: {
                            limit: 1
                        }
                    } ) );

                    if( err ) {
                        Y.log( `could not get invoice entry header for invoicelog ${invoiceLog._id}: ${err.stack || err}`, 'warn', NAME );
                        callback( err );
                        return;
                    }

                    invoiceLog.invoiceEntryHeader = invoiceEntryHeader && invoiceEntryHeader[0];

                    // Create list of inactive physicians ids so we can filter them in ui target employee select

                    if( invoiceLog.invoiceEntryHeader && invoiceLog.invoiceEntryHeader.data && Array.isArray( invoiceLog.invoiceEntryHeader.data.locations ) ) {
                        invoiceLog.invoiceEntryHeader.data.locations.forEach( location => {
                            if( location.physicians ) {
                                location.physicians.forEach( physician => {
                                    physicianIdsToCheckIfActive.push( physician._id );
                                } );

                            }
                        } );
                    }
                }

                if( physicianIdsToCheckIfActive && physicianIdsToCheckIfActive.length ) {
                    let inactivePhysicians;
                    [err, inactivePhysicians] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        query: {
                            _id: {$in: physicianIdsToCheckIfActive},
                            status: {$ne: 'ACTIVE'}
                        },
                        options: {
                            select: {
                                _id: 1
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `searchInvoiceLog: could not fetch inactive physicians assigned to invoicelog: ${err.stack || err}`, 'warn', NAME );
                    } else {
                        inactivePhysicianIds = inactivePhysicians.map( inactivePhysician => inactivePhysician._id.toString() );
                    }

                }
            }

            callback( null, {result, inactivePhysicianIds} );
        }

        async function replaceProcess( args ) {
            const {user, invoiceLogId, invoiceLogType, modelName, invoiceLog, createNewLog, onlyApproved = false} = args;
            let newInvoiceLogId, err, results;
            [err, results] = await formatPromiseResult( Y.doccirrus.invoicelogutils.resetInvoiceLogContent( {
                user, invoiceLog, invoiceType: invoiceLogType, onlyApproved, onProgress: ( progress ) => { // TODO: check onlyApproved works (cash)
                    notifyUser( user, {
                            invoiceType: invoiceLogType,
                            action: 'resetting',
                            state: 'progress',
                            progress: progress,
                            id: invoiceLogId
                        }
                    );
                }
            } ) );
            if( err ) {
                Y.log( `could not reset invoice log ${invoiceLogId}: ${err.stack || err}`, 'warn', NAME );
                // TODO: more todo here?
                return;
            }

            [err, results] = await formatPromiseResult( replaceReferenceActivities( {
                user, invoiceLogId, onProgress: ( progress ) => {
                    notifyUser( user, {
                            invoiceType: invoiceLogType,
                            action: 'replace_references',
                            state: 'progress',
                            progress: progress,
                            id: invoiceLogId
                        }
                    );
                }
            } ) );

            if( err ) {
                Y.log( `Problem updating INVOICEREF ${invoiceLogType} activities with new status: ${JSON.stringify( err )}`, 'warn', NAME );
                //  continue despite error, best effort
            } else {
                Y.log( `Updated status of INVOICEREF ${invoiceLogType} activities: ${JSON.stringify( results )}`, 'debug', NAME );
            }

            [err, results] = await formatPromiseResult( runDb( {
                user,
                model: modelName,
                action: 'put',
                query: {
                    _id: invoiceLogId
                },
                data: {
                    status: 'REPLACED',
                    skipcheck_: true
                },
                fields: ['status']
            } ) );

            if( err ) {
                Y.log( `could not set REPLACED status on ${modelName} with id ${invoiceLogId}: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            if( typeof createNewLog === 'function' ) {
                Y.log( `createNewLog is provided by ${modelName}`, 'debug', NAME );
                [err, results] = await formatPromiseResult( Promise.resolve( createNewLog( invoiceLog ) ) );
                if( err ) {
                    // TODO: distingish between business and actual errors
                    Y.log( `provided createNewLog returns error ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
                newInvoiceLogId = results && results[0];
            } else {
                Y.log( `createNewLog is NOT provided by ${modelName}`, 'debug', NAME );
            }

            Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );

            notifyUser( user, {
                state: 'finished',
                action: 'replace',
                invoiceType: invoiceLogType,
                logInfo: {
                    id: invoiceLog._id.toString(),
                    commercialNo: invoiceLog.commercialNo
                },
                warnings: [],
                errors: []
            } );
            Y.log( `Replaced ${modelName} ${invoiceLogId} with ${newInvoiceLogId || 'nothing'}`, 'info', NAME );
        }

        /**
         * Abstract replace invoice log function.
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.invoiceLogId
         * @param {String} args.invoiceLogType
         * @param {Boolean} args.preChecks
         * @param {Boolean} args.createNewLog
         * @return {Promise<undefined>}
         */
        async function replace( args ) {
            const DCError = Y.doccirrus.commonerrors.DCError;
            const {user, invoiceLogId, invoiceLogType, preChecks} = args;

            if( !invoiceLogId || !invoiceLogType ) {
                throw new DCError( 500, {message: 'insufficient arguments'} );
            }

            const modelName = getInvoiceModelName( invoiceLogType );

            if( !modelName ) {
                const errorMsg = `unknown invoiceLogType "${invoiceLogType}"`;
                Y.log( errorMsg, 'warn', NAME );
                throw Error( errorMsg );
            }

            let [err, getLock] = await formatPromiseResult(
                Y.doccirrus.cacheUtils.dataCache.acquireLock( {
                    key: 'invoicing',
                    data: `${modelName}|replace|${user.U}|${(new Date()).getTime()}|0`
                } )
            );

            if( err ) {
                Y.log( `replacing ${modelName}: Error acquiring  lock: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            if( !getLock || !getLock.length || 1 !== getLock[0] ) {
                throw Y.doccirrus.invoiceserverutils.getLockNotification( getLock );
            }

            let results;
            [err, results] = await formatPromiseResult( runDb( {
                user: user,
                model: modelName,
                query: {
                    _id: invoiceLogId
                }
            } ) );

            if( err ) {
                Y.log( `could not get ${modelName} with id ${invoiceLogId}: ${err.stack || err}`, 'warn', NAME );
                Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                throw err;
            }

            if( !results.length ) {
                Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                const error = new DCError( 2031 );
                Y.log( error.message, 'warn', NAME );
                throw error;
            }

            const invoiceLog = results && results[0];

            if( typeof preChecks === 'function' ) {
                Y.log( `preChecks is provided by ${modelName}`, 'debug', NAME );
                [err, results] = await formatPromiseResult( Promise.resolve( preChecks( invoiceLog ) ) );
                if( err ) {
                    // TODO: distinguish between business and actual errors
                    Y.log( `provided preChecks returns error ${err.stack || err}`, 'warn', NAME );
                    Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                    throw err;
                }

            } else {
                Y.log( `preChecks is NOT provided by ${modelName}`, 'debug', NAME );
            }

            [err, results] = await formatPromiseResult( runDb( {
                user,
                model: modelName,
                action: 'put',
                query: {
                    _id: invoiceLogId
                },
                data: {
                    status: 'REPLACING',
                    skipcheck_: true
                },
                fields: ['status']
            } ) );

            if( err ) {
                Y.log( `could not set REPLACING status on ${modelName} with id ${invoiceLogId}: ${err.stack || err}`, 'warn', NAME );
                Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                throw err;
            }

            notifyUser( user, {
                invoiceType: invoiceLogType,
                action: 'replace',
                state: 'started'
            } );

            // Following code runs outside of the resolving promise context!
            replaceProcess( {...args, modelName, invoiceLog} ).catch( async ( err ) => {
                Y.log( `error during replaceProcess ${err.stack || err}`, 'warn', NAME );
                Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                [err, results] = await formatPromiseResult( runDb( {
                    user,
                    model: modelName,
                    action: 'put',
                    query: {
                        _id: invoiceLogId
                    },
                    data: {
                        status: 'REPLACE_ERR',
                        skipcheck_: true
                    },
                    fields: ['status']
                } ) );

                if( err ) {
                    Y.log( `could not set REPLACE_ERR status on ${modelName} with id ${invoiceLogId}: ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
                notifyUser( user, {
                    state: 'finished',
                    action: 'replace',
                    invoiceType: invoiceLogType,
                    logInfo: {
                        id: invoiceLog._id.toString(),
                        commercialNo: invoiceLog.commercialNo
                    },
                    warnings: [],
                    errors: [err]
                } );
            } );
        }

        async function get( args ) {
            Y.log( 'Entering Y.doccirrus.api.invoicelog.get', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoicelog.get' );
            }

            const {user, query, options = {}, originalParams = {}, callback} = args;

            const modelName = originalParams.invoiceLogType && getInvoiceModelName( originalParams.invoiceLogType );

            if( !modelName ) {
                callback( Y.doccirrus.errors.rest( 500, `Invoice Log Type ${originalParams.invoiceLogType} not found` ) );
                return;
            }

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: modelName,
                query,
                options
            } ) );

            if( err ) {
                Y.log( `could not get ${modelName}: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }

            callback( null, result );
        }

        /**
         * Must be called from activity process. Checks if activity is related to invoice log and sets isContentOutdated
         * to true on related invoice log if needed.
         *
         * Scheins and treatments already have invoiceLogId and invoiceLogType assigned. For newly created activities
         * and diagnoses, last schein is fetched to gather invoice log references.
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.activity
         * @param {Object} args.context
         * @param {Function} args.getLastScheinFromCache
         *
         * @return {Promise<void>}
         */
        async function checkInvoiceLogs( args ) {
            const {user, activity, context, getLastScheinFromCache} = args;
            let err, invoiceLogId, invoiceLogType;
            const hasRelevantActType = ['SCHEIN', 'PKVSCHEIN', 'BGSCHEIN', 'TREATMENT', 'DIAGNOSIS'].includes( activity.actType );

            if( activity.status !== 'VALID' || !hasRelevantActType ) {
                return;
            }

            if( activity.wasNew || activity.actType === 'DIAGNOSIS' ) {
                Y.log( `${activity.wasNew ? 'activity is new' : 'activity is diagnosis'} try to get invoice log id by last schein`, 'debug' );
                let lastSchein;
                [err, lastSchein] = await formatPromiseResult( getLastScheinFromCache( {user, context, activity} ) );
                if( err ) {
                    Y.log( `could not get last schein: ${err.stack || err}`, 'warn', NAME );
                    return;
                }
                if( !lastSchein ) {
                    Y.log( `did not find last schein for activity ${activity._id}`, 'debug', NAME );
                    return;
                }
                if( !lastSchein.invoiceLogId || !lastSchein.invoiceLogType ) {
                    Y.log( `last schein is not connected to invoice log ${activity._id}`, 'debug', NAME );
                    return;
                }
                invoiceLogId = lastSchein.invoiceLogId;
                invoiceLogType = lastSchein.invoiceLogType;
            } else if( activity.invoiceLogId && activity.invoiceLogType ) {
                invoiceLogId = activity.invoiceLogId;
                invoiceLogType = activity.invoiceLogType;
            } else {
                return;
            }
            let isOutdated = true;
            if( !activity.wasNew ) {
                [err, isOutdated] = await formatPromiseResult( isContentOutdated( activity ) );
            }
            if( err ) {
                Y.log( `could not check if activity outdates an invoice log${err.stack || err}`, 'warn', NAME );
                return;
            }

            if( !isOutdated ) {
                return;
            }

            [err] = await formatPromiseResult( setContentOutdated( {
                user,
                invoiceLogId,
                invoiceLogType
            } ) );

            if( err ) {
                Y.log( `could not set invoice log content is outdated: ${err.stack || err}`, 'warn', NAME );
            }
        }

        /**
         * Check if activity data was modified and invoice log should be re-validated
         * by the user.
         *
         * @param {Object} activity
         * @return {Promise<*>}
         */
        async function isContentOutdated( activity ) {
            const invoiceLogType = activity.invoiceLogType;
            const api = getInvoiceAPI( invoiceLogType );

            if( !api ) {
                Y.log( `invoicelog api found for type ${invoiceLogType}`, 'debug', NAME );
                return false;
            }

            return api.server.isContentOutdated( activity );
        }

        /**
         * Simply marks an invoice log as dirty by setting isContentOutdated to true if not already set.
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.invoiceLogId
         * @param {String} args.invoiceLogType
         *
         * @return {Promise<void>}
         */
        async function setContentOutdated( args ) {
            const {user, invoiceLogId, invoiceLogType} = args;
            const modelName = getInvoiceModelName( invoiceLogType );

            if( !modelName ) {
                Y.log( `could not find invoicelog model name for type: ${invoiceLogType}`, 'warn', NAME );
                return;
            }

            Y.log( `try to set isContentOutdated from 'false' to 'true' for ${modelName} ${invoiceLogId}`, 'info', NAME );

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: modelName,
                action: 'update',
                query: {
                    _id: invoiceLogId,
                    status: ['CREATED', 'VALID', 'INVALID'],
                    isContentOutdated: {$ne: true}
                },
                fields: ['isContentOutdated'],
                data: {isContentOutdated: true}
            } ) );

            if( err ) {
                Y.log( `could not set isContentOutdated ${modelName} ${invoiceLogId}: ${err.stack || err}`, 'warn', NAME );
                return;
            }

            Y.log( `isContentOutdated of ${modelName} ${invoiceLogId}: was${result.nModified ? '' : ' already'} set`, 'debug', NAME );

        }

        /**
         * mapRuleEngineResults
         * @param {Object} user
         * @param {Array}  ruleEngineResults
         * @param {Object} log
         * @param {String} logType - KVG, KBV ...
         * @param {Object} invoiceConfig
         *
         * @return {Promise}
         */

        async function mapRuleEngineResults( user, ruleEngineResults, log, logType, invoiceConfig ) {
            Y.log( 'Entering Y.doccirrus.api.invoicelog.mapRuleEngineResults', 'info', NAME );
            const invoiceLogEntries = [],
                promises = [];

            let [err, affectedActivities] = await formatPromiseResult( Y.doccirrus.invoiceserverutils.employeesForRuleLog( user,  ruleEngineResults) );
            if( err ) {
                Y.log( `mapRuleEngineResults: Failed to get employees for invoicelog ${log._id}. \nError: ${err.message || err}`, 'error', NAME );
                throw err;
            }

            for( let result of ruleEngineResults ) {  // eslint-disable-line no-unused-vars
                let entry = {
                    ruleId: result.ruleId,
                    ruleSetId: result.ruleSetId,
                    text: result.message,
                    caseFolderId: result.caseFolderId,
                    ruleLogId: result._id
                };

                if( result.patientId ) {
                    entry.patientId = result.patientId;
                }
                if( result.patient ) {
                    entry.patientName = result.patient;
                }
                if( result.affectedActivities ) {
                    entry.affectedActivities = result.affectedActivities;
                }
                // get codes and actTypes
                if( result.activity && result.activity.length ) {
                    let factCodes = [], requiredCodes = [], actTypes = [];
                    result.activity.forEach( item => {

                        if( item.metaCodes ) {
                            factCodes = factCodes.concat( item.metaCodes );
                        }

                        if( item.metaRequiredCodes ) {
                            requiredCodes = requiredCodes.concat( item.metaRequiredCodes );
                        }

                        if( item.metaActTypes ) {
                            actTypes = actTypes.concat( item.metaActTypes );
                        }
                    } );

                    if( factCodes.length ) {
                        if( 20 < factCodes.length ) {
                            entry.factIdCode = entry.affectedActivities.map( ( activity ) => {
                                return activity.code;
                            } );
                            entry.allCodes = factCodes;
                        } else {
                            entry.factIdCode = factCodes;
                        }
                    }

                    if( actTypes.length ) {
                        entry.actTypes = actTypes;
                    }

                    if( requiredCodes.length ) {
                        entry.requiredCodes = requiredCodes;
                    }
                }

                if( result.factId || result.affectedActivities && result.affectedActivities.length ) {
                    entry.employeeName = affectedActivities[result.factId] ||
                                         [...new Set( result.affectedActivities.map( el => affectedActivities[el.id]).filter( Boolean ) )].join( '; ' );
                }

                if( result.factId ) {
                    entry.link = schemaPathsMap.activity.path + '#' + schemaPathsMap.activity.hashPath + result.factId + schemaPathsMap.patient.hashPath + result.patientId + schemaPathsMap.patient.caseFolder + result.caseFolderId;
                } else {
                    entry.link = schemaPathsMap.patient.path + '#' + schemaPathsMap.patient.hashPath + result.patientId + schemaPathsMap.patient.section + schemaPathsMap.patient.caseFolder + result.caseFolderId;
                }

                if( invoiceConfig ) { // only passed kbvlog-api
                    const excludeError = await Y.doccirrus.invoicelogutils.filterValidationResult( {
                        user,
                        validationResult: entry,
                        invoiceConfig
                    } );

                    if( excludeError ) {
                        continue;
                    }
                }

                if( 'ERROR' === result.ruleLogType ) {
                    log.output.push( entry );
                } else if( 'WARNING' === result.ruleLogType ) {
                    log.warnings.push( entry );
                }
                promises.push( Y.doccirrus.api.invoicelog.saveEntry( {
                    user,
                    entry,
                    ruleLogType: result.ruleLogType,
                    inVoiceLogId: log._id,
                    logType
                } ) );
                invoiceLogEntries.push( {
                    ...entry,
                    ruleLogType: result.ruleLogType
                } );
            }

            [err] = await formatPromiseResult( Promise.all( promises ) );

            if( err ) {
                Y.log( `mapRuleEngineResults: Failed to save invoicelog entries for invoicelog ${log._id}. \nError: ${err.message || err}`, 'error', NAME );
                throw err;
            }
            return invoiceLogEntries;
        }

        //  Expose public API

        Y.namespace( 'doccirrus.api' ).invoicelog = {

            name: NAME,

            server: {
                replace,
                checkInvoiceLogs,
                /**
                 * Triggered by invoicelog-manager cron jobs.
                 * Starts validation according to last state of invoicelog:
                 * - If last log is in state 'CREATED', then start prevalidation.
                 * - If last log is in state 'VALID' or 'INVALID', then start validation according to it last validation state (isPreValidated?).
                 * @param {Object} args
                 * @return {Promise}
                 */
                autoValidate: function( args ) {
                    let delay = 0;
                    const
                        Promise = require( 'bluebird' ),
                        {user, invoiceLogType} = args,
                        modelName = getInvoiceModelName( invoiceLogType ),
                        api = getInvoiceAPI( invoiceLogType );

                    return runDb( {
                        user,
                        model: modelName,
                        query: {
                            status: {$in: ['CREATED', 'VALID', 'INVALID']}
                        }
                    } ).each( invoiceLog => {
                        return new Promise( ( resolve ) => {
                            Y.log( `start auto validation for invoicelog of type ${invoiceLogType} and ID ${invoiceLog._id} with delay of ${delay}ms`, 'info', NAME );
                            api.validate( {
                                user,
                                originalParams: {
                                    preValidation: ('CREATED' === invoiceLog.status ? true : invoiceLog.isPreValidated),
                                    id: invoiceLog._id.toString()
                                },
                                options: {
                                    lateCallback: true
                                },
                                callback: ( err ) => {
                                    if( err ) {
                                        Y.log( `could not auto validate invoicelog of type ${invoiceLogType} with ID ${invoiceLog._id}: ${err}`, 'error', NAME );
                                    }
                                    resolve();
                                }
                            } );
                        } );
                    } );
                }
            },

            get,

            searchInvoiceLog,

            approveByIds: function( args ) {
                Y.log('Entering Y.doccirrus.api.invoicelog.approveByIds', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoicelog.approveByIds');
                }
                const
                    {user, originalParams: {invoiceType, invoiceLogId, scheinId, activityIdsToApprove, nScheine = 0, nTreatments = 0, nDiagnoses = 0}, callback} = args,
                    invoiceModelName = getInvoiceModelName( invoiceType );

                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'activity',
                    migrate: true,
                    query: {
                        _id: { $in: activityIdsToApprove },
                        status: 'VALID'
                    },
                    data: {
                        status: 'APPROVED'
                    },
                    options: { multi: true }
                } ).then( async function() {
                    for (let activityId of activityIdsToApprove){
                        Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activityId );
                        let [ err ] = await formatPromiseResult(
                            Y.doccirrus.invoiceserverutils.auditChangeValues( user, activityId, { status: 'VALID' }, { status: 'APPROVED' } )
                        );
                        if( err ){
                            Y.log( `approveByIds: error creating audit entry for ${activityId} : ${err.stack || err}`, 'warn', NAME );
                        }
                    }

                    return runDb( {
                        user: user,
                        model: 'invoiceentry',
                        query: {
                            invoiceLogId: invoiceLogId,
                            type: 'schein',
                            'data._id': scheinId
                        }
                    } );
                } ).then( function( invoiceEntries ) {
                    if( !invoiceEntries || !invoiceEntries.length ) {
                        throw new Error( 'Could not find schein invoice entry' );
                    }
                    return invoiceEntries[0];
                } ).then( function( invoiceEntry ) {
                    if( -1 !== activityIdsToApprove.indexOf( invoiceEntry.data._id ) && 'VALID' === invoiceEntry.data.status ) {
                        invoiceEntry.data.status = 'APPROVED';
                    }

                    invoiceEntry.data.treatments.forEach( function( treatment ) {
                        if( -1 !== activityIdsToApprove.indexOf( treatment._id ) && 'VALID' === treatment.status ) {
                            treatment.status = 'APPROVED';
                        }
                    } );

                    invoiceEntry.data.medications.forEach( function( medication ) {
                        if( -1 !== activityIdsToApprove.indexOf( medication._id ) && 'VALID' === medication.status ) {
                            medication.status = 'APPROVED';
                        }
                    } );

                    invoiceEntry.data.diagnoses.forEach( function( diagnosis ) {
                        if( -1 !== activityIdsToApprove.indexOf( diagnosis._id ) && 'VALID' === diagnosis.status ) {
                            diagnosis.status = 'APPROVED';
                        }
                    } );

                    invoiceEntry.data.continuousDiagnoses.forEach( function( conDiagnosis ) {
                        if( -1 !== activityIdsToApprove.indexOf( conDiagnosis._id ) && 'VALID' === conDiagnosis.status ) {
                            conDiagnosis.status = 'APPROVED';
                        }
                    } );

                    if(invoiceEntry.markModified) {
                        invoiceEntry.markModified( 'data' );
                        console.error((new Error("markModified found")).stack);     //  eslint-disable-line no-console
                    }

                    return new Prom( function( resolve, reject ) {
                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'invoiceentry',
                            action: 'put',
                            query: {
                                _id: invoiceEntry._id
                            },
                            fields: Object.keys(invoiceEntry),
                            data: Y.doccirrus.filters.cleanDbObject(invoiceEntry)
                        }, function( err ) {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve();
                            }
                        });
                    } );

                } ).then( function() {
                    return runDb( {
                        user: user,
                        model: invoiceModelName,
                        query: {
                            _id: invoiceLogId
                        }
                    } );
                } ).then( function( invoiceLogs ) {
                    if( !invoiceLogs || !invoiceLogs.length ) {
                        throw new Error( 'invoice log not found' );
                    }
                    return invoiceLogs[0];
                } ).then( function( invoiceLog ) {
                    var notApprovedScheine = invoiceLog.notApproved[0],
                        notApprovedTreatments = invoiceLog.notApproved[1],
                        notApprovedDiagnoses = invoiceLog.notApproved[2];

                    invoiceLog.notApproved[0] = 0 < notApprovedScheine ? notApprovedScheine - nScheine : 0;
                    invoiceLog.notApproved[1] = 0 < notApprovedTreatments ? notApprovedTreatments - nTreatments : 0;
                    invoiceLog.notApproved[2] = 0 < notApprovedDiagnoses ? notApprovedDiagnoses - nDiagnoses : 0;
                    if(invoiceLog.markModified) {
                        invoiceLog.markModified( 'notApproved' );
                        console.error((new Error("markModified found")).stack);     //  eslint-disable-line no-console
                    }

                    invoiceLog.lastUpdated = new Date();

                    return Y.doccirrus.invoicelogutils.saveInvoiceLog( invoiceLog, user, invoiceModelName);
                } ).then( function() {
                    callback();
                } ).catch( function( err ) {
                    Y.log( 'could not approve by ids ' + err, 'error', NAME );
                    callback( err );
                } );
            },

            approve: async function( args ) {
                Y.log('Entering Y.doccirrus.api.invoicelog.approve', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoicelog.approve');
                }
                var user = args.user,
                    callback = args.callback,
                    id = args.originalParams.id,
                    startTime = new Date(),
                    invoiceLog,
                    invoiceType = args.originalParams.invoiceType,
                    invoiceModelName = getInvoiceModelName( invoiceType );

                function hasValdiateRights() {
                    if('KBV' === invoiceType){
                        return Y.doccirrus.auth.hasAPIAccess( user, 'kbvlog.validate' );
                    } else if('PVS' === invoiceType){
                        return Y.doccirrus.auth.hasAPIAccess( user, 'pvslog.validate' );
                    } else if('CASH' === invoiceType){
                        return Y.doccirrus.auth.hasAPIAccess( user, 'cashlog.validate' );
                    } else if('KVG' === invoiceType){
                        return Y.doccirrus.auth.hasAPIAccess( user, 'tarmedlog.validate' );
                    } else {
                        return false;
                    }
                }

                function finalCb( err ) {
                    Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' ); //new Lock will be acquire in approve
                    var api = getInvoiceAPI( invoiceType ),
                        msg = {
                            data: {
                                invoiceType: invoiceType,
                                state: 'finished',
                                action: 'approve',
                                logInfo: {
                                    id: id,
                                    commercialNo: invoiceLog.commercialNo
                                },
                                warnings: [],
                                errors: []
                            }
                        };

                    if( err ) {
                        msg.data.errors.push( err.code ? err : Y.doccirrus.errors.rest( '500', err ) );
                    } else if( api ) {
                        api.validate( {
                            user: user,
                            originalParams: {
                                id: id,
                                preValidation: false
                            },
                            callback: function( err ) {
                                if ( err ) {
                                    Y.log( `approve: could not validate ${invoiceType} log ${err.message || err}`, 'error', NAME );
                                    msg.data.errors.push( err );

                                    if( err.code === '2507' ){
                                        //status suppose to be set in validation but due to error
                                        Y.doccirrus.mongodb.runDb( {
                                            user,
                                            model: getInvoiceModelName( invoiceType ),
                                            action: 'put',
                                            query: {
                                                _id: id,
                                                status: {$in: ['VALIDATING', 'APPROVING']}
                                            },
                                            data: {
                                                status: 'VALIDATION_ERR',
                                                skipcheck_: true
                                            },
                                            fields: ['status']
                                        } );
                                    }

                                }
                            }
                        } );
                    } else {
                        msg.data.errors.push( Y.doccirrus.errors.http( 500, 'Could not specific invoice api' ) );
                    }

                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: args.user.identityId,
                        event: 'invoicelogAction',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                        msg: msg
                    } );

                }

                if( !Y.doccirrus.auth.hasAPIAccess( user, 'invoicelog.approve' ) || !hasValdiateRights() ) {
                    return callback( accessError );
                }

                if( !id || !invoiceType || !invoiceModelName ) {
                    return callback( Y.doccirrus.errors.http( 500, 'Missing Parameter' ) );
                }

                let [ err, getLock] = await formatPromiseResult(
                    Y.doccirrus.cacheUtils.dataCache.acquireLock( {
                        key: 'invoicing',
                        data: `${getInvoiceModelName( invoiceType )}|approve|${user.U}|${(new Date()).getTime()}|0`
                    } )
                );
                if( err ) {
                    Y.log( `approve: Error acquiring invoice log: ${err.stack || err}`, 'error', NAME );
                }
                if( !getLock || !getLock.length || 1 !== getLock[0] ) {
                    return callback( Y.doccirrus.invoiceserverutils.getLockNotification( getLock ) );
                }

                runDb( {
                    user: user,
                    model: invoiceModelName,
                    query: {
                        _id: id
                    }
                } ).then( function( log ) {
                    invoiceLog = log && log[0];
                    if( !invoiceLog ) {
                        throw new Error( 'Could not find invoice log model ' + invoiceModelName, 'debug', NAME );
                    }
                    invoiceLog.status = 'APPROVING';
                    invoiceLog.pid = Y.doccirrus.ipc.pid();
                    return Y.doccirrus.invoicelogutils.saveInvoiceLog( invoiceLog, user, invoiceModelName);
                } ).then( function() {
                    // return early
                    callback(); //eslint-disable-line callback-return

                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: args.user.identityId,
                        event: 'invoicelogAction',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                        msg: {
                            data: {
                                invoiceType: invoiceType,
                                action: 'approve',
                                state: 'started'
                            }
                        }
                    } );

                    Y.doccirrus.invoiceprocess.forEachInvoiceEntry( {
                        user: args.user,
                        invoiceLogId: id,
                        startTime: startTime,
                        excludedPatientIds: invoiceLog.excludedPatientIds,
                        excludedScheinIds: invoiceLog.excludedScheinIds,
                        mediportNotAllowedPatientIds: invoiceLog.mediportNotAllowedPatientIds,
                        unknownInsuranceScheinIds: invoiceLog.unknownInsuranceScheinIds,
                        onProgress: function( progress ) {
                            progress.type = 'approve';
                            onApproveProgress( user, id, progress, invoiceType );
                        },
                        iterator: function( invoiceEntry ) {
                            if( 'schein' === invoiceEntry.type ) {
                                let activityIds;
                                return Prom.resolve()
                                    .then( function() {
                                        return collectIdsToApprove( invoiceEntry.data );
                                    } ).then( function( ids ) {
                                        activityIds = ids;
                                        return Y.doccirrus.mongodb.runDb( {
                                            user,
                                            action: 'update',
                                            model: 'activity',
                                            migrate: true,
                                            query: {
                                                _id: { $in: ids },
                                                status: 'VALID'
                                            },
                                            data: {
                                                status: 'APPROVED'
                                            },
                                            options: { multi: true }
                                        } );
                                    } ).then( async function(){
                                       for (let activityId of activityIds){
                                           Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activityId );
                                           let [ err ] = await formatPromiseResult(
                                               Y.doccirrus.invoiceserverutils.auditChangeValues( user, activityId, { status: 'VALID' }, { status: 'APPROVED' } )
                                           );
                                           if( err ){
                                               Y.log( `approve: error creating audit entry for ${activityId} : ${err.stack || err}`, 'warn', NAME );
                                           }
                                       }
                                    });
                            }
                        }
                    } ).then( function() {
                        finalCb();
                    } ).catch( function( err ) {
                        finalCb( err );
                    } );

                } ).catch( function( err ) {
                    callback( err );
                } );
            },

            /**
             * @method getInvoiceEntries
             * @public
             *
             * return invoice entries by type, additionally allows filtering by excluded scheins and patients
             *
             * @param {Object} args
             * @param {Object} args.user
             * @param {String} args.originalParams.itemsPerPage
             * @param {String} args.originalParams.page
             * @param {Object} args.options
             * @param {Object} args.query
             * @param {String} args.data.invoiceType     - KBV|PVS|CASH
             * @param {String} args.data.filterScheine   - all|incl|excl
             * @param {Function} args.callback
             *
             * @returns {Function} callback
             */
            getInvoiceEntries: async function( args ) {
                Y.log('Entering Y.doccirrus.api.invoicelog.getInvoiceEntries', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoicelog.getInvoiceEntries');
                }
                const { user, data, options, originalParams: params = {}, callback } = args;
                let
                    { query } = args,
                    cardSwipeStatusFilterOrg,
                    vsdmStatusFilterOrg,
                    invoiceStatusesQuery,
                    originalLimit;

                if( !query.invoiceLogId ) {
                    return callback( new Error( 'Missing parameter: id' ) );
                }

                if( query.type === 'patient' && !data.invoiceType ) {
                    return callback( new Error( `Missing invoice type for ${query.type} query` ) );
                }

                let err;
                if( query.type === 'patient' && ['incl', 'excl'].includes( data.filterScheine ) ){

                    let
                        model = (data.invoiceType === 'PVS') ? 'pvslog' : ( (data.invoiceType === 'CASH') ?'cashlog' : (data.invoiceType === 'KVG') ? "tarmedlog" : 'kbvlog' ),
                        logs;

                    // get excluded patients and scheins from log
                    [ err, logs ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model,
                            action: 'get',
                            query: { _id: query.invoiceLogId },
                            options: { select: { excludedPatientIds: 1, excludedScheinIds: 1 } }
                        } )
                    );
                    if( err ) {
                        Y.log(`getInvoiceEntries: Error getting ${model}: ${err.stack || err}`, 'error', NAME);
                        return callback( err );
                    }

                    let log = ( logs && logs[0] ) || {},
                        excludedPatientIds = log.excludedPatientIds || [],
                        excludedScheinIds = log.excludedScheinIds || [],
                        patientsFromScheins,
                        orArray = [];

                    let scheineQuery;

                    switch(data.filterScheine){
                        case 'incl': {
                            if( data.invoiceType === 'PVS' ){
                                query['data.dataTransmissionToPVSApproved'] = {$eq: true};
                            }
                            if( excludedPatientIds.length ){
                                orArray = [...orArray, {'data._id': {$nin: excludedPatientIds} } ];
                            }
                            if( excludedScheinIds.length ){
                                scheineQuery = {'data._id': {$nin: excludedScheinIds} };
                            }
                            break;
                        }
                        case 'excl': {
                            if( excludedPatientIds.length ){
                                orArray = [...orArray, {'data._id': {$in: excludedPatientIds} } ];
                            }
                            if( excludedScheinIds.length ){
                                scheineQuery = {'data._id': {$in: excludedScheinIds} };
                            }
                            if( data.invoiceType === 'PVS' ) {
                                orArray = [
                                    ...orArray,
                                    {'data.dataTransmissionToPVSApproved': {$eq: false}},
                                    {'data.dataTransmissionToPVSApproved': {$exists: false}}
                                ];
                            }
                            break;
                        }
                    }

                    if( scheineQuery ){
                        let scheinIds;
                        [ err, scheinIds ] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'invoiceentry',
                                action: 'aggregate',
                                pipeline: [
                                    { $match: {...scheineQuery, invoiceLogId: query.invoiceLogId, type: 'schein' } },
                                    { $project: { patientId: '$data.patientId'} },
                                    { $group: {_id: '$patientId' } }
                                ]
                            } )
                        );
                        if( err ) {
                            Y.log(`getInvoiceEntries: Error getting scheins: ${err.stack || err}`, 'error', NAME);
                            return callback( err );
                        }
                        patientsFromScheins = (scheinIds && scheinIds.result || []).map( el => el._id.toString() );
                        orArray = [...orArray, {'data._id': {$in: patientsFromScheins} } ];
                    } else if( data.filterScheine === 'excl' ){
                        orArray = [...orArray, {'data._id': {$in: []} } ];
                    }

                    if(orArray.length){
                        if( query.$or ){
                            query.$or = [...query.$or, orArray];
                        } else {
                            query.$or = orArray;
                        }
                    }
                }
                if( query.type === 'patient' && query.cardSwipeStatus && query.cardSwipeStatus.$in && query.cardSwipeStatus.$in.includes( 'WOCARD' )) {
                    cardSwipeStatusFilterOrg = [...query.cardSwipeStatus.$in ];
                    query.cardSwipeStatus.$in.push( 'SOME' );
                }

                if( query.type === 'patient' && query.vsdmStatus && query.vsdmStatus.$in && query.vsdmStatus.$in.includes( 'WOCARD' )) {
                    vsdmStatusFilterOrg = [...query.vsdmStatus.$in ];
                    query.vsdmStatus.$in.push( 'SOME' );
                }

                if( query.invoiceStatuses ) {
                    invoiceStatusesQuery = query.invoiceStatuses;
                    originalLimit = options.limit;
                    options.limit = 1000;
                    delete query.invoiceStatuses;
                }

                let results;
                [ err, results ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'invoiceentry',
                        action: 'get',
                        query,
                        options
                    } )
                );
                if( err ) {
                    Y.log(`getInvoiceEntries: Error getting invoiceentry q: ${JSON.stringify(query)}, o: ${options} e: ${err.stack || err}`, 'error', NAME);
                    return callback( err );
                }

                // get all invoice statuses for patient
                if( data.collectMedidataRejected ) {
                    let scheins,
                        match = {invoiceLogId: query.invoiceLogId, type: 'schein'};

                    if( invoiceStatusesQuery ) {
                        match['data.invoiceStatus'] = invoiceStatusesQuery;
                    }

                    [err, scheins] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'invoiceentry',
                            action: 'aggregate',
                            pipeline: [
                                {$match: match},
                                {$project: {patientId: '$data.patientId', invoiceStatus: '$data.invoiceStatus'}},
                                {$group: {_id: '$patientId', invoiceStatuses: {$addToSet: "$invoiceStatus"}}}
                            ]
                        } )
                    );
                    if( err || !scheins ) {
                        err = err || new Y.doccirrus.commonerrors.DCError( 404, {message: 'scheins not found!'} );
                        Y.log( `getInvoiceEntries: Error getting invoice statuses for patient ${err.stack || err}`, 'error', NAME );
                    } else {
                        const scheinResults = scheins.result || [];

                        for( let scheinResult of scheinResults ) {  // eslint-disable-line no-unused-vars
                            let obj = results.result.find( el => el.data._id && el.data._id.toString() === scheinResult._id.toString() );

                            if( obj && scheinResult.invoiceStatuses && scheinResult.invoiceStatuses.length ) {
                                obj.invoiceStatuses = scheinResult.invoiceStatuses;
                            }
                        }
                        if( invoiceStatusesQuery ) {
                            results.result = results.result.filter( r => r.invoiceStatuses ).slice( 0, originalLimit );
                        }
                    }
                }

                if( query.type === 'patient' ){
                    let patienIds = ( results && results.result || [] ).map( el => el.data && el.data._id ).filter( el => el );

                    if( patienIds.length ){
                        let patients;
                        [ err, patients ] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'patient',
                                action: 'get',
                                query: {
                                    _id: {$in: patienIds },
                                    insuranceWOCard: {$exists: true, $ne: null}

                                },
                                options: { select: { _id: 1 } }
                            } )
                        );
                        if( err ) {
                            Y.log(`getInvoiceEntries: Error getting patients marked as without cards ${err.stack || err}`, 'error', NAME);
                            return callback( err );
                        }
                        for( let patient of patients ){  // eslint-disable-line no-unused-vars
                            let
                                obj = results.result.find( el => el.data._id && el.data._id.toString() === patient._id.toString() ),
                                objVsdm = results.result.find( el => el.data._id && el.data._id.toString() === patient._id.toString() );

                            if( obj && obj.cardSwipeStatus === 'SOME' ){
                                obj.cardSwipeStatus = 'WOCARD';
                            }
                            if( objVsdm && objVsdm.vsdmStatus === 'SOME' ){
                                objVsdm.vsdmStatus = 'WOCARD';
                            }
                        }
                    }
                }

                let
                    responseData = results.result || [],
                    totalItems = results.count;
                if( cardSwipeStatusFilterOrg || query.cardSwipeStatus && query.cardSwipeStatus.$in && query.cardSwipeStatus.$in.length ){
                    let filtered = responseData.filter( el => (cardSwipeStatusFilterOrg || []).includes( el.cardSwipeStatus ) || query.cardSwipeStatus.$in.includes( el.cardSwipeStatus ) );
                    totalItems = totalItems - responseData.length + filtered.length;
                    responseData = filtered;
                }
                if( vsdmStatusFilterOrg || query.vsdmStatus && query.vsdmStatus.$in && query.vsdmStatus.$in.length ){
                    let filteredVsdm = responseData.filter( el => (vsdmStatusFilterOrg || []).includes( el.vsdmStatus ) || query.vsdmStatus.$in.includes( el.vsdmStatus ) );
                    totalItems = totalItems - responseData.length + filteredVsdm.length;
                    responseData = filteredVsdm;
                }
                callback( null, {
                    meta: {
                        errors: [],
                        warnings: [],
                        query: null,
                        itemsPerPage: params.itemsPerPage,
                        totalItems,
                        page: params.page || 1,
                        replyCode: 200
                    },
                    data: responseData
                } );
            },
            invalidateExcludedIds: function( args ) {
                Y.log('Entering Y.doccirrus.api.invoicelog.invalidateExcludedIds', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.invoicelog.invalidateExcludedIds');
                }
                const
                    {user, originalParams, callback} = args,
                    _ = require( 'lodash' ),
                    excludedPatientIds = originalParams.excludedPatientIds,
                    excludedScheinIds = originalParams.excludedScheinIds,
                    invoiceLogId = originalParams.invoiceLogId,
                    invoiceLogType = originalParams.invoiceLogType;

                if( !invoiceLogId || !invoiceLogType || (!excludedPatientIds && !excludedScheinIds) ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ) );
                }

                let invoiceModelName = getInvoiceModelName( invoiceLogType );

                if( !invoiceModelName ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: `could not find invoice log model name for type ${invoiceLogType}`} ) );
                }
                let data = {
                    isContentOutdated: true,
                    skipcheck_: true
                };
                let fields = ['isContentOutdated'];
                if( excludedPatientIds ) {
                    data.excludedPatientIds = excludedPatientIds;
                    fields.push( 'excludedPatientIds' );

                }
                if( excludedScheinIds ) {
                    data.excludedScheinIds = excludedScheinIds;
                    fields.push( 'excludedScheinIds' );
                }

                runDb( {
                    user: user,
                    model: invoiceModelName,
                    query: {
                        _id: invoiceLogId
                    },
                    options: {
                        lean: true,
                        select: {
                            status: 1,
                            excludedScheinIds: 1,
                            excludedPatientIds: 1,
                            isContentOutdated: 1
                        },
                        limit: 1
                    }
                } ).get( 0 ).then( invoiceLog => {
                    const validStates = ['INVALID', 'VALID', 'VALIDATION_ERR'];
                    if( !invoiceLog || !validStates.includes( invoiceLog.status ) ) {
                        throw new Y.doccirrus.commonerrors.DCError( 400, {message: `could not invalidate excluded ids of invoice log: ${invoiceLogType}. Invoicelog must be in one of the states ${validStates}, but was in state ${invoiceLog && invoiceLog.status}`} );
                    }

                    // if excludedScheinIds and excludedPatientIds didn't change - do not set isContentOutdated
                    if( !invoiceLog.isContentOutdated &&
                        _.isEqual( (invoiceLog.excludedScheinIds || []).sort(), (data.excludedScheinIds || []).sort() ) &&
                        _.isEqual( (invoiceLog.excludedPatientIds || []).sort(), (data.excludedPatientIds || []).sort() ) ) {
                        data.isContentOutdated = false;
                    }

                    return runDb( {
                        user: user,
                        model: invoiceModelName,
                        action: 'put',
                        query: {
                            _id: invoiceLogId
                        },
                        data: data,
                        fields: fields
                    } );
                } ).then( () => {
                    callback();
                } ).catch( err => {
                    callback( err );
                } );
            },


            createReferenceActivity: createReferenceActivity,
            replaceReferenceActivities: replaceReferenceActivities,
            saveEntry: saveEntry,
            saveEntries: saveEntries,
            getEntries: getEntries,
            removeEntries: removeEntries,
            removeCode: removeCode,
            calculateEntries,
            mapRuleEngineResults
        };
    },
    '0.0.1', {requires: ['dcinvoicelogutils', 'dcinvoiceprocess', 'ConFileWriter', 'dccommonerrors']}
);
