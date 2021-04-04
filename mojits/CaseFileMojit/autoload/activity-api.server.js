/*
 @author: rw
 @date: 2013 May
 */

/**
 * Library of Queueing functions specifically for separate calendar queues for doctors.
 *
 * Used by the scheduling library.
 *
 * Uses the YUI namespace.
 */
//TRANSLATION INCOMPLETE!! MOJ-3201
/*global YUI*/
/*jslint latedef:false */

const
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils;

YUI.add( 'activityapi', function( Y, NAME ) {

        //  shortcut
        var
            restErr = Y.doccirrus.errors.rest,
            i18n = Y.doccirrus.i18n;

        /**
         *
         * @constructor
         */
        function DCActitvityApi() {
        }

        /**
         * user a valid user object
         * options
         *  -patientId: a patient´s id to group activities - required
         *  -
         *
         * @param    {Object}           user
         * @param   {Object}            options
         * @param   {Function}          callback
         * @return  {Function}          callback
         */
        DCActitvityApi.prototype.loadActivities = function( user, options, callback ) {
            if( options.patientId ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: {patientId: options.patientId}
                }, callback );
            } else {
                return callback( 'patientId is needed' );
            }

        };

        DCActitvityApi.prototype.addActivity = function( user, activity, callback ) {
            var
                Promise = require( 'bluebird' ),
                patientId = activity.patientId || '',
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

            function getPatient( patientId ) {
                return runDb( {
                    migrate: true,
                    user: user,
                    model: 'patient',
                    action: 'get',
                    query: { _id: patientId}
                } );
            }

            function addActivityToPatient( patient ) {
                return runDb( {
                    migrate: true,
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: activity
                } ).then( function() {
                        return patient;
                    } );
            }

            if( patientId ) {
                getPatient( patientId ).
                    then( addActivityToPatient ).
                    finally( callback );
            } else {
                return callback( 'patient id missing' );
            }
        };

        /**
         *
         * @param {Object}          params
         *
         * @return {Object}        query
         */
        DCActitvityApi.prototype.queryBuilder = function( params ) {
            var query = {
                patientId: params.patientId || ''
            };

            if( params.actType ) {
                query.actType = params.actType;
            }

            return query;
        };

        /**
         *  Make copies of all attachments and their media for the given activity
         *
         *  @param  {Object}    user            REST user or equivalent
         *  @param  {Boolean}   inMigration     True if runing during migration
         *  @param  {Object}    fromActivity    single activity object
         *  @param  {String}    toActId         database _id of new object
         *  @param  {Function}  callback        Of the form fn(err, attachmentIds)
         */

        DCActitvityApi.prototype.copyActivityAttachments = function( user, inMigration, fromActivity, toActId, callback ) {

            var
                mongoose = require( 'mongoose' ),
                async = require( 'async' ),
                attachmentIds = [];

            if( !Array.isArray( fromActivity.attachments ) ) {
                callback( null, [] );
                return;
            }

            async.eachSeries( fromActivity.attachments, copySingleAttachment, onAttachmentsCopied );

            function copySingleAttachment( docId, next ) {
                Y.log( `copyActivity: copying document: ${docId} from ${fromActivity._id}`, 'info', NAME );

                var
                    document,
                    oldMediaId;

                async.series( [ loadDocument, cleanDocument, copyMedia, postDocument ], onDocumentCopied );

                //  first load the document we want to copy
                function loadDocument( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'document',
                        migrate: inMigration,
                        user: user,
                        query: {_id: docId},
                        callback: onDocumentLoaded
                    } );

                    //  when loaded, way may need to copy any media it owns

                    function onDocumentLoaded(err, result) {

                        if( err || !result || !result[0] ) {
                            Y.log(`Error copying document ${docId} from activity ${fromActivity._id}: ${JSON.stringify(err)}`, 'warn', NAME);
                            itcb( err || 'attached document not found' );
                            return;
                        }

                        document = result[0];

                        //  rendered PDFs are not copied with the activity, as of 23-02-2015, skip without error
                        if ( !document.type || 'FORMPDF' === document.type ) { return next( null ); }

                        itcb( null );
                    }
                }

                function cleanDocument( itcb ) {
                    //  clear any assigned invoice or receipt number (element must be correctly named for this to work)
                    if ( document.type && 'FORM' === document.type && document.formState ) {
                        if ( document.formState.invoiceNo ) {
                            document.formState.invoiceNo = '';
                        }
                        if ( document.formState.receiptNo ) {
                            document.formState.receiptNo = '';
                        }
                    }
                    itcb( null );
                }

                function copyMedia( itcb ) {
                    oldMediaId = document.mediaId ? document.mediaId : '';

                    //  legacy data may not have mediaId document, but store the mediaId in url
                    if ( '' === oldMediaId && document.url && -1 !== document.url.indexOf('id=') ) {
                        oldMediaId = document.url.match( /id=([\da-fA-F]+)/ ); //extract mediaId from url
                        oldMediaId = (oldMediaId && oldMediaId[0]) ? oldMediaId[0] : '';
                        oldMediaId = oldMediaId.replace('id=', '');
                        Y.log( `Copying document ${docId} has linked media: ${oldMediaId}`, 'info', NAME);

                        return;
                    }

                    //  if no media to copy then skip to next step
                    if ( '' === oldMediaId ) { return itcb( null ); }

                    //  note that this copied activity may not yet exist at time of this post
                    Y.doccirrus.api.media.makecopy( {
                        'user': user,
                        'originalParams': {
                            'mediaId': oldMediaId,
                            'ownerCollection': 'activity',
                            'ownerId': toActId
                        },
                        'migrate': inMigration,
                        'callback': onMediaCopied
                    } );

                    //copyMedia(oldMediaId, 'activity', fromActivity._id, onMediaCopied);

                    //  copied a media object, update the document URL with new media id and continue to save

                    function onMediaCopied(err, newMediaId) {

                        if (err) {
                            Y.log( `Error copying media for document ${docId}: ${err}`, 'warn', NAME);
                            itcb( err || 'attached document not found' );
                            return;
                        }

                        document.url = document.url.replace( new RegExp( oldMediaId, 'g' ), newMediaId ); // two occurrences
                        document.mediaId = newMediaId;

                        Y.log( `Copied media item to new _id ${newMediaId} and updated doc url to: ${document.url}`, 'info', NAME);

                        itcb( null );
                    }
                }

                //  any media have been copied and the new copy of this document is ready for db

                function postDocument( itcb ) {

                    //  this activity _id does not exist at time of post
                    document.activityId = toActId;
                    document.attachedTo = toActId;
                    // nt sharing on Patient Portal by default, assume new, unapproved activity
                    document.accessBy = [];

                    document._id = new mongoose.Types.ObjectId();
                    document.skipcheck_ = true;

                    Y.doccirrus.mongodb.runDb( {
                        action: 'post',
                        model: 'document',
                        migrate: inMigration,
                        user: user,
                        data: document,
                        callback: onNewDocumentSaved
                    } );

                    //  after saving the document, note the _id of the new object in DB for activity.attachments

                    function onNewDocumentSaved( err, result ) {
                        if( err || !result || !result[0] ) {
                            itcb( err || 'error posting the document' );
                            return;
                        }

                        document._id = result[0];
                        attachmentIds.push( result[0] );
                        itcb( null );
                    }

                }

                function onDocumentCopied( err ) {
                    next( err );
                }
            }

            function onAttachmentsCopied( err ) {
                if ( err ) {
                    callback( err );
                    return;
                }
                callback( null, attachmentIds );
            }

        };

        /**
         *  Make a copy of an activity and any attachments it may have
         *
         *  Overall process:
         *
         *      1.  Load the original activity
         *      2.  Get a timestamp based on a more recent activity (documentme?)
         *      3.  Remove sequence numbers, set employee, etc
         *      4.  Copy any documents and media owned by this activity (excepting PDFs made from forms)
         *      5.  Store the new activity in the database
         *      6. Update any form to show any changes to timestamp, Personalienfeld, etc
         *
         *  @param  {Object}    user
         *  @param  {Object}    activityId
         *  @param  {Object}    options
         *  @param  {Function}  callback
         */

        DCActitvityApi.prototype.copyActivity = function( user, activityId, options, callback ) {

            const
                async = require( 'async' ),
                mongoose = require( 'mongoose' );

            let
                { currentDate, setLocationId, setEmployeeId, setTimestamp, setCaseFolderId, setBatch, fromImported } = options || {},
                newActivityId = new mongoose.Types.ObjectId(),

                originalId,
                activity,
                attachmentIds = [],
                employee,
                notPresentInMMIArr = [];

            currentDate = currentDate || false;

            async.series(
                [
                    loadActivity,
                    loadEmployee,
                    processImportedMedications,
                    trySetTimestamp,
                    updateActivity,
                    copyAttachments,
                    copyLinkedActivity,
                    postActivity,
                    updateForm
                ],
                onAllDone
            );

            //  1.  Load the original activity
            function loadActivity( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: { _id: activityId },
                    callback: onActivityLoaded
                } );

                function onActivityLoaded( err, result ) {
                    if ( !err && !result[0] ) { err = Y.doccirrus.errors.rest( 404, `Failed to get the activity ${activityId}` ); }
                    if( err ) { return itcb( err ); }

                    activity = result[0];

                    //  save the previous activity id and create one for the new record
                    //  this new _id will be used to link documents
                    originalId = activity._id;
                    activity._id = newActivityId;

                    //additionally set employeeId an location ID when copy transferred activities
                    if( activity.mirrorActivityId ){
                        setEmployeeId = setEmployeeId || user.specifiedBy;
                    }

                    itcb( null );
                }
            }

            //  1.1  Load employee for transferred activity
            function loadEmployee( itcb ) {
                if( !activity.mirrorActivityId || !setEmployeeId ){
                    return itcb( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'get',
                    query: { _id: setEmployeeId },
                    callback: onEmployeeLoaded
                } );

                function onEmployeeLoaded( err, result ) {
                    if ( !err && !result[0] ) { err = Y.doccirrus.errors.rest( 404, `Failed to get the emploee for activity ${activityId}` ); }
                    if( err ) { return itcb( err ); }

                    employee = result[0];

                    itcb( null );
                }
            }

            //  1.2  If we are copying IMPORTED MEDICATION then only update data from MMI before saving
            function processImportedMedications( itcb ) {
                if( !fromImported || !( activity.actType === 'MEDICATION' && activity.empImportId && activity.patImportId && activity.locImportId ) ){
                    return itcb( null );
                }

                Y.doccirrus.api.activity.getMedicationData( {
                    user,
                    data: {
                        locationId: activity.locationId.toString(),
                        employeeId: activity.employeeId,
                        patientId: activity.patientId,
                        pzn: activity.phPZN,
                        caseFolderId: activity.caseFolderId
                    },
                    callback: omMedicationData
                } );

                function omMedicationData( err, result ){
                    if( err ) {
                        Y.log( `Error occurred while request to mmi: ${err.stack || err}`, 'warn', NAME );
                        return itcb( err );
                    }
                    if( result && result.medicationData && Object.keys( result.medicationData ).length ) {
                        Object.keys( result.medicationData ).forEach( key => {
                            activity[key] = result.medicationData[key];
                        } );
                    } else {
                        notPresentInMMIArr.push( activity.phPZN );
                    }
                    itcb( null );
                }
            }

            //  2.  Get a timestamp based on a more recent activity (documentme?)
            async function trySetTimestamp( itcb ) {

                let [ err, newTimestamp ] = await formatPromiseResult(
                    Y.doccirrus.api.activity.getNextTimestamp( { user, activity, options: { setTimestamp, currentDate } } )
                );
                if( err ){
                    Y.log( `trySetTimestamp: error getting new timestamp: ${err.stack || err}`, 'error', NAME );
                    return itcb( err );
                }

                activity.timestamp = newTimestamp;
                itcb( null );
            }

            //  3.  Remove sequence numbers, set employee, etc
            async function updateActivity( itcb ) {
                const updatePrescriptionCaseAsync = promisifyArgsCallback( Y.doccirrus.api.kbvutility2.updatePrescriptionCase );
                const checkBlankRegulationAsync = promisifyArgsCallback( Y.doccirrus.api.kbvutility2.checkBlankRegulation );
                activity.copyRef = originalId;

                //  remove sequence numbers which should be unique
                delete activity.importId;
                delete activity.invoiceNo;
                delete activity.receiptNo;

                // remove invoice references
                delete activity.invoiceId;
                delete activity.invoiceLogId;
                delete activity.invoiceLogType;

                delete activity.mirrorCaseFolderType;

                delete activity.referencedBy;       //  set be post-process when parent is saved, MOJ-10158

                delete activity.isDispensed;
                delete activity.isArrived;
                delete activity.orderId;

                if( activity.actType === 'INVOICE' ) {
                    activity.activities = [];
                    delete activity.invoiceNo;
                }

                if( 'PREPARED' === activity.status ) {
                    activity.timestamp = new Date().toISOString();
                }

                if( activity.actType === "FINDING" ) {
                    /**
                     * If actType is FINDING then it could be pointing to Orthanc study i.e. inpacs feature so just make sure studyId and g_extra
                     * are deleted if present in activity or else they might be prone to unwanted behaviour especially while creating key images
                     * from Osimis viewer
                     */
                    delete activity.studyId;
                    delete activity.g_extra;
                }

                // Remove KIM related files from KimBase_T and EDocLetter_T
                if( activity.actType === 'DOCLETTER' ) {
                    activity.kimState = 'NOT_SIGNED';
                    delete activity.flatFeeTreatmentId;
                    activity.kimSignedBy = [];
                    activity.attachedMedia = [];
                    activity.attachments = [];
                }

                if( activity.mirrorActivityId ){
                    let locationsFromEmployee = employee && (employee.locations || []);

                    if( locationsFromEmployee.length ){
                        setLocationId = setLocationId || locationsFromEmployee[0]._id;
                        activity.locationName = locationsFromEmployee[0].locname || '';
                    } else {
                        setLocationId = setLocationId || Y.doccirrus.schemas.location.getMainLocationId();
                    }

                    if( employee ){
                        activity.employeeInitials = employee.initials;
                        activity.employeeName = Y.doccirrus.schemas.person.personDisplay( employee );
                    }
                    delete activity.mirrorActivityId;
                }

                if( setLocationId ) {
                    activity.locationId = setLocationId;
                }

                if( setEmployeeId ) {
                    activity.employeeId = setEmployeeId;
                }

                if( setCaseFolderId ) {
                    activity.caseFolderId = setCaseFolderId;
                }

                if( 'CANCELLED' === activity.status ){
                    delete activity.cancelReason;
                }

                if( 'MEDICATION' === activity.actType ){
                    activity.activities = [];
                    activity.isPrescribed = false;
                }

                activity.status = 'VALID';
                activity.apkState = 'IN_PROGRESS';
                activity.skipcheck_ = true;

                delete activity.labRequestId;

                if( activity.actType === 'KBVUTILITY2' ) {
                    let [err, result] = await formatPromiseResult( updatePrescriptionCaseAsync( {
                        user,
                        data: {
                            patientId: activity.patientId,
                            employeeId: activity.employeeId,
                            timestamp: activity.timestamp,
                            hasBlankRegulation: activity.ut2BlankRegulation && !activity.ut2BlankRegulationIgnored,
                            icdCode: activity.utIcdCode,
                            icdCode2: activity.utSecondIcdCode,
                            diagnosisGroup: activity.ut2DiagnosisGroupCode
                        }
                    } ) );

                    if( err ) {
                        Y.log( `could not update kbvutility2 prescription case on copy of ${originalId}: ${err.stack || err}`, 'warn', NAME );
                    }
                    result = result || {};

                    activity.ut2PrescriptionCaseId = result.ut2PrescriptionCaseId;
                    activity.ut2PrescriptionCaseUnitsSum = result.ut2PrescriptionCaseUnitsSum;
                    activity.ut2PrescriptionCaseMassageUnitsSum = result.ut2PrescriptionCaseMassageUnitsSum;
                    activity.ut2PrescriptionCaseStandardizedCombinationUnitsSum = result.ut2PrescriptionCaseStandardizedCombinationUnitsSum;
                    activity.ut2BlankRegulationNeedsConfirmationAfterCopy = false;
                    activity.ut2BlankRegulation = null;
                    activity.ut2BlankRegulationIgnore = false;

                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        query: {_id: activity.patientId},
                        options: {
                            select: {
                                kbvDob: 1
                            },
                            limit: 1
                        }
                    } ) );

                    let patientAge = null;

                    if( err ) {
                        Y.log( `could not get patient for kbvutility2 copy of ${originalId}: ${err.stack || err}`, 'warn', NAME );
                    } else if( result[0] && result[0].kbvDob ) {
                        patientAge = Y.doccirrus.schemas.v_kbvutility2.getPatientAgeAt( result[0].kbvDob, activity.timestamp );
                    }

                    [err, result] = await formatPromiseResult( checkBlankRegulationAsync( {
                        user,
                        originalParams: {
                            icdCode: activity.utIcdCode,
                            icdCode2: activity.utSecondIcdCode,
                            diagnosisGroup: activity.ut2DiagnosisGroupCode,
                            patientAge: patientAge
                        }
                    } ) );

                    if( err ) {
                        Y.log( `could not check kbvutility2 blank regulation on copy of ${originalId}: ${err.stack || err}`, 'warn', NAME );
                    } else if( result && result.length ) {
                        const sdhm2bEntry = result && result[0];
                        activity.ut2BlankRegulation = sdhm2bEntry;
                        activity.ut2BlankRegulationNeedsConfirmationAfterCopy = true;
                    }
                }

                itcb( null );
            }

            //  4.  Copy any documents and media owned by this activity (excepting PDFs made from forms)
            function copyAttachments( itcb ) {
                //  if activity has no attachments then we can skip this step
                if ( !activity.attachments || 0 === activity.attachments.length ) { return itcb( null ); }

                Y.doccirrus.activityapi.copyActivityAttachments( user, false, activity, newActivityId, onAttachmentsCopied );

                function onAttachmentsCopied( err, newAttachmentIds ) {
                    if ( err ) {
                        Y.log( `Problem copying attachments: ${JSON.stringify( err )}`, 'warn', NAME );
                    }
                    if ( newAttachmentIds ) {
                        attachmentIds = newAttachmentIds;
                        activity.attachments = attachmentIds;
                    }
                    itcb( null );
                }
            }

            //  5.  Clone linked activities
            async function copyLinkedActivity( itcb ) {
                if( ['MEDICATIONPLAN', 'KBVMEDICATIONPLAN'].indexOf( activity.actType ) === -1 ) {
                    //for now only medication plans are copied with linked activities
                    return itcb( null );
                }
                let references = Y.doccirrus.api.linkedactivities.getAllReferences( activity ) || [];
                if(!references.length){
                    return itcb( null );
                }

                let [err, result] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.casefolder.copyActivitiesToCaseFolder( {
                            user,
                            query: {
                                caseFolderId: activity.caseFolderId,
                                activityIds: references,
                                timestamp: activity.timestamp,
                                employeeId: activity.employeeId,
                                locationId: activity.locationId
                            },
                            callback: ( err, result ) => {
                                if( err ) {
                                    return reject( err );
                                }
                                resolve( result );
                            }
                        } );
                    } )
                );
                if( err ) {
                    Y.log( `copyLinkedActivity: Error on creating linked activities: ${err.stack || err }`, 'error', NAME );
                    return itcb( err );
                }
                if( !result || !result.length ){
                    return itcb( null );
                }

                // here we change medicationRef property of each MEDICATION in medicationPlanEntries
                // to id of newly created linked MEDICATION
                // NOTE: order of old references are the same as order of new one
                for( let medPlanEntry of activity.medicationPlanEntries ) { // eslint-disable-line no-unused-vars
                    if( medPlanEntry.medicationRef && references.includes( medPlanEntry.medicationRef ) ) {
                        let indexInOldReferences = references.indexOf( medPlanEntry.medicationRef );
                        medPlanEntry.medicationRef = result[indexInOldReferences];
                    }
                    // also change medPlanEntry timestamp to new value when copyToToday
                    if( currentDate ) {
                        medPlanEntry.timestamp = activity.timestamp;
                    }
                }

                // get activity types to figure out in which field ids should be placed
                let newActivities;
                [err, newActivities] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb({
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {_id: {$in: result}},
                        options: { select: {actType: 1} }
                    } )
                );
                if( err ) {
                    Y.log( `copyLinkedActivity: Error on getting newly created linked activities: ${err.stack || err }`, 'error', NAME );
                    return itcb( err );
                }

                //TODO define other cases:
                activity.icds = (newActivities || []).filter( el => el.actType === 'DIAGNOSIS').map( el => el._id.toString() );
                // activity.icdsExtra = [];
                // activity.receipts = [];
                // activity.invoiceId = [];
                activity.activities = (newActivities || []).filter( el => !['DIAGNOSIS'].includes(el.actType) ).map( el => el._id.toString() );
                itcb();
            }

            //  6.  Store the new activity in the database
            function postActivity( itcb ) {
                if( setBatch ){
                    Object.assign( activity, { processingType: 'batch' } );
                }
                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    model: 'activity',
                    user: user,
                    data: activity,
                    context: {
                        noMedicationCheck: true, // to skip checkKbvMedicationPlanMedications step of post-process
                        forceScheinCheck: true
                    },
                    callback: onNewActivitySaved
                } );

                function onNewActivitySaved( err, result ) {
                    if ( err ) { return itcb( err ); }

                    //  should never happen
                    if ( activity._id.toString() !== result[0].toString() ) {
                        Y.log( 'Copy error: Activity _id after post does not match _id used to link media.', 'warn', NAME );
                    }

                    activity._id = result[0];

                    Y.log( `Saved copy of activity as ${JSON.stringify( result[0] )} with attachments ${JSON.stringify( activity.attachments )}`, 'debug', NAME );
                    itcb( null );
                }

            }

            //  7. Update any form to show any changes to timestamp, Personalienfeld, etc
            function updateForm( itcb ) {
                if ( !activity.formId ) { return itcb( null ); }
                Y.doccirrus.forms.mappinghelper.remapInNewContext( user, newActivityId.toString(), null, onFormRemapped );
                function onFormRemapped( err ) {
                    itcb( err );
                }
            }

            function onAllDone( err ) {
                if( err ) {
                    Y.log( `Could not copy activity: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }
                if( notPresentInMMIArr && notPresentInMMIArr.length ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {
                            data: i18n('casefolder-api.MEDICATION_NOT_FOUNDIN_DB_MSG') + notPresentInMMIArr.join( ', ' )
                        }
                    } );
                }
                callback( null, activity );
            }

        }; // copyActivity

        /**
         *  Invoke an activity transition on the FS, call back with the activity and new state, or error
         *
         *  Note changes for EXTMOJ-918 - we previously did not reload the activity, and so changes made by post-process
         *  or other users would not be returned to the client.
         *
         *  @param  user                    {Object}    REST user or equivalent
         *  @param  options                 {Object}    Transition options, used for quickprint, etc
         *  @param  options.activityContext {Object}    Optional, pass to post-processes
         *  @param  activity                {Object}    As defined by activity-schema
         *  @param  transition              {String}    Name of a transition on the current activity's FSM
         *  @param  isTest                  {Boolean}   True if transition should be checked but not executed
         *  @param  callback                {Function}  Of the form fn( err, [ { state: <newState>, data: <updatedActivity> } ]
         */

        DCActitvityApi.prototype.doTransition = function( user, options, activity, transition, isTest, callback ) {
            var
                async = require( 'async' ),
                fsmName = Y.doccirrus.schemas.activity.getFSMName( activity.actType ),
                defaultErrorText = 'Speichern nicht möglich. Pflichtfelder nicht korrekt.',
                i18n = Y.doccirrus.i18n,
                EMPLOYEE_ID_ERROR = i18n( 'InCaseMojit.activity_api_serverJS.text.EMPLOYEE_ID_ERROR' ),
                ASSIGN_DOCTOR = i18n( 'InCaseMojit.activity_api_serverJS.text.ASSIGN_DOCTOR' ),
                updatedActivity = activity,
                finalActivityId = null;

            let redirectToActivity;

            //  try the transition
            Y.log( `Called doTransition() with ${activity._id} for ${fsmName}::${transition}`, 'debug', NAME);

            async.series( [ setCancelReason, invokeFsm, reloadActivity ], onAllDone );

            function setCancelReason( itcb ) {
                //  save a revision of this activity for audit log before returning the new state
                if('cancel' === transition && options.cancelReason && '' !== options.cancelReason ){
                    activity.cancelReason = options.cancelReason;
                }
                itcb( null );
            }

            function invokeFsm( itcb ) {
                function onTransitionComplete( err, newState, repetitionId, createdActivity ) {
                    if( err ) { return itcb( err ); }
                    finalActivityId = activity._id;
                    if( !isTest ) {
                        updatedActivity.status = newState;

                        if( createdActivity ) {
                            redirectToActivity = createdActivity;
                        }

                        // MOJ-8309 when creating a repetition, return it
                        if ( 'repeat' === transition && repetitionId ) {
                            finalActivityId = repetitionId;
                        }
                    }

                    itcb( null );
                }
                Y.doccirrus.fsm[fsmName][transition]( user, options, activity, isTest, onTransitionComplete );
            }

            function reloadActivity( itcb ) {

                if( isTest ){
                    return itcb( null );
                }

                if ( 'delete' === transition ) {
                    //  after deletion there will be no activity to load, use passed activity
                    Y.log( `Deleted activity, not reloading: ${activity._id} transition: ${transition}`, 'debug', NAME );
                    return itcb( null );
                }

                Y.log( `Reloading activity from database: ${activity._id} transition: ${transition}`, 'debug', NAME );

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activity',
                    'query': { _id: finalActivityId + '' },
                    'options': { lean: true },
                    'callback': onActivityReloaded
                } );

                function onActivityReloaded( err, result ) {
                    if ( !err && !result[0] ) { err = Y.doccirrus.errors.rest( 404, 'Could not find activity' ) ; }
                    if ( err ) { return itcb( err ); }

                    updatedActivity = result[0];
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                var error;

                function notifyClient() {
                    if( 'INVOICE' === updatedActivity.actType ) {
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            event: 'invoiceTransitionDone',
                            msg: {
                                data: updatedActivity.caseFolderId
                            }
                        } );
                    }
                }

                if( err ) {
                    Y.log( `Transition incomplete or blocked: ${errToString( err )}`, 'warn', NAME );
                    if( err.code ) {
                        notifyClient();
                        return callback( Y.doccirrus.errors.rest( err.code, err.data || '', true ) );
                    }
                    if(err.errors && err.errors.employeeId ){
                        error = Y.doccirrus.errors.http( 409, EMPLOYEE_ID_ERROR + ' <a href="/admin/insuite#/location">' + ASSIGN_DOCTOR + '</a>' );
                    } else {
                        error = Y.doccirrus.errors.http( 409, defaultErrorText );
                    }
                    error.name = err.name;
                    return callback( error );
                }

                if( redirectToActivity ) {
                    updatedActivity.redirectAfter = redirectToActivity;
                }

                notifyClient();
                callback( null, [ { state: updatedActivity.status, data: updatedActivity } ] );
            }

            //  helper function to serialize error from FSM
            function errToString( fsmErr ) {
                if( 'string' === typeof fsmErr ) {
                    return fsmErr;
                }

                var
                    errMsg = defaultErrorText,
                    k,
                    message;

                if( 'object' === typeof fsmErr ) {
                    if (fsmErr.hasOwnProperty( 'code' ) && !fsmErr.hasOwnProperty( 'errors' )) {
                        message = Y.doccirrus.errorTable.getMessage(fsmErr);
                        if (message){
                            return message;
                        }
                        fsmErr.errors = [fsmErr];
                    }

                    if( fsmErr.hasOwnProperty( 'errors' ) && ('object' === typeof fsmErr.errors) ) {
                        errMsg = '';

                        for( k in fsmErr.errors ) {
                            if( fsmErr.errors.hasOwnProperty( k ) ) {
                                if( fsmErr.errors[k].hasOwnProperty( 'message' ) ) {
                                    errMsg = errMsg + fsmErr.errors[k].message + '<br/>';
                                }
                            }
                        }
                    }
                }

                return errMsg;
            }

        }; // doTransition

        /**
         *  Load activities, test and perform a batch transition
         *
         *  Callback returns an array of descriptors for the new states applied, or an error if the transition
         *  could not be made for some subset of activities
         *
         *  @param  user                {object}    REST user or equivalent
         *  @param  options             {object}    Transition options
         *  @param  activityIds         {object}    Array of activity _id strings
         *  @param  transition          {string}    Name of a transition
         *  @param  progressCallback    {Function}  Of the form fn( info )
         *  @param  callback            {function}  Of the form fn( err, newStates )
         */

        DCActitvityApi.prototype.doTransitionBatch = function( user, options = {}, activityIds, transition, progressCallback, callback ) {
            var
                that = this,
                async = require( 'async' ),
                descriptors = [],
                newStates = [],
                total = activityIds.length * 3,
                current = 0,
                i,
                queueKey = {},
                cacheObj = {},
                activities = [];

            Y.doccirrus.weakQueue.newQueue( queueKey );
            async.series(
                [
                    makeDescriptors,
                    loadAllActivities,
                    checkAllFormsExist,
                    testAllTransitions,
                    runAllTransitions
                ],
                onAllDone
            );

            //  1. Make objects to represent each activity transition
            function makeDescriptors( itcb ) {
                for (i = 0; i < activityIds.length; i++) {
                    descriptors.push({
                        '_id': activityIds[i],
                        'transition': transition
                    });
                }
                Y.log( `Received ${activityIds.length} _ids and created ${descriptors.length} descriptors`, 'debug', NAME);
                itcb( null );
            }

            //  2. Load all requested activities (will also check validity of transition for each activity)
            function loadAllActivities( itcb ) {
                //foreachDescriptor('loadSingleActivity', 'activity', onActivitiesLoaded);
                async.eachSeries( descriptors, loadSingleActivity, itcb );
            }

            function checkAllFormsExist( itcb ) {
                async.eachSeries( descriptors, checkFormExists, itcb );
            }

            //  3. Test each transition through FSM (fail as a batch if any does not validate)
            function testAllTransitions( itcb ) {
                function onAllTested( err ) {
                    Y.log( `Test transition blocked by FSM: ${err}`, 'info', NAME );
                    return itcb(err);
                }
                //foreachDescriptor('testSingleFromBatch', 'testResult', onTestTransitionsComplete);
                async.eachSeries( descriptors, testSingleFromBatch, onAllTested );
            }

            //  4. Run each transition
            function runAllTransitions( itcb ) {
                //foreachDescriptor('runSingleFromBatch', 'newState', onTransitionsComplete);
                async.eachSeries( descriptors, runSingleFromBatch, itcb );
            }

            //  Finally
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Error during batch transition: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }
                callback( null, newStates );
            }

            /**
             *  Helper function to raise the progress event
             *  @param label
             */

            function progress( label, actId ) {
                current++;
                progressCallback( {
                    mapId: actId,
                    current: current,
                    total: total,
                    percent: parseInt( 100 * ( current / total ), 10 ),
                    state: 'progress',
                    label: label
                } );
            }

            /**
             *  Load a single activity from the database
             *
             *  @param  descriptor  {object}    Represents a single activity transition
             *  @param  itcb        {function}  Of the form fn(err)
             */

            function loadSingleActivity( descriptor, itcb ) {

                Y.log( `Loading activity for batch transition: ${descriptor._id}`, 'debug', NAME );

                function onActivityLoaded(err, result) {
                    if ( !err && 0 === result.length) {
                        err = restErr( 404, `Could not load activity ${descriptor._id}: ${err}`, true );
                    }

                    if ( err ) { return itcb( err ); }

                    descriptor.activity = result[0];
                    descriptor.activity.skipcheck_ = true;
                    descriptor.fnmName = Y.doccirrus.schemas.activity.getFSMName( result[0].actType );
                    descriptor.loadOK = true;

                    progress( i18n( 'InvoiceMojit.cashbook.label.LOADED_ACTIVITY' ) + ' ' + descriptor.activity.content, descriptor.activity._id );

                    //  check that this activity support the requested transition
                    descriptor.fsmName = Y.doccirrus.schemas.activity.getFSMName( descriptor.activity.actType );
                    if( !Y.doccirrus.fsm[descriptor.fsmName].hasOwnProperty( transition ) ) {
                        Y.log( `Unimplemented state transition ${transition} on ${descriptor.fsmName}`, 'error', NAME );
                        return itcb( restErr( 500, `Transition not implemented on: ${descriptor.fsmName}`, true ) );
                    }

                    //  Some batch processes/rules may not initialize forms, check for this MOJ-11292
                    itcb( null );
                }

                //Y.log(Y.doccirrus.util.JSONSafe);

                descriptor.activity = { '_id': descriptor._id};

                descriptor.loadOK = false;

                Y.doccirrus.mongodb.runDb({
                    user: user,
                    action: 'get',
                    model: 'activity',
                    query: { _id: descriptor._id },
                    options: {},
                    callback: onActivityLoaded
                } );

            }

            /**
             *  Check each descriptor for missing forms, may not be possible to create them after transitions
             *
             *      1.  Load the attachmentts of the activity
             *      2.  Check if a form exists
             *      3.  Create if missing
             *
             *  @param descriptor
             *  @param itcb
             */

            async function checkFormExists( descriptor, itcb ) {
                const
                    util = require( 'util' ),
                    attachments = Y.dcforms.AttachmentsModel(),
                    loadAttachmentsP = util.promisify( attachments.loadFromActivity ),
                    initializeFormP = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity ),
                    activity = descriptor.activity;

                let err, formDoc, updatedActivity;

                if ( !activity.formId ) { return itcb( null ); }
                if ( !activity.attachments ) { activity.attachments = []; }

                //  1.  Load attachments of this activity

                [ err ] = await formatPromiseResult( loadAttachmentsP( user, activity ) );

                if ( err ) {
                    Y.log( `Could not load attachments of activity: ${activity._id}: ${err.stack||err}`, 'error', NAME );
                    return itcb( err );
                }

                //  2. Check if form exists

                formDoc = attachments.findDocument( '_hasFormData' );

                //  a form document exists - TODO: check for remap
                if ( formDoc ) { return itcb( null ); }

                //  3. Make missing form if necessary

                Y.log( `Creating form for ${activity.actType} activity ${activity._id} ${activity.formId}`, 'info', NAME );

                [ err ] = await formatPromiseResult( initializeFormP( user, activity._id.toString(), null, null ) );

                if ( err ) {
                    Y.log( `Could not load attachments of activity: ${activity._id}: ${err.stack||err}`, 'error', NAME );
                    return itcb( err );
                }

                //  the activity will have been updated with reference to the new form, possibly corrected versionId, content etc

                [ err, updatedActivity ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'activity',
                    query: { _id: activity._id }
                } ) );

                if ( err || !updatedActivity[0] ) {
                    Y.log( `Could not reload activity with form: ${activity._id}: ${err.stack||err}`, 'error', NAME );
                    return itcb( err );
                }

                descriptor.activity = updatedActivity[0];
                descriptor.activity.skipcheck_ = true;

                itcb( null );
            }

            /**
             *  Test the transition for a single activity
             *
             *  @param  descriptor  {object}    Represents a single activity transition
             *  @param  itcb        {function}  Of the form fn(err)
             */

            function testSingleFromBatch ( descriptor, itcb ) {

                function onTestComplete(err) {
                    progress( i18n( 'InvoiceMojit.cashbook.label.INVOICE_VALID' ) + ' ' + descriptor.activity.content + ' ' + ( err ? 'FAIL' : 'PASS' ), descriptor.activity._id );
                    descriptor.testResult = !err;
                    itcb( err || null );
                }

                var msg;

                descriptor.testResult = false;
                Y.log( `Testing transition for activity: ${descriptor._id}`, 'info', NAME);

                //  first check that the FSM supports this transition
                if( !Y.doccirrus.fsm[descriptor.fsmName].hasOwnProperty( descriptor.transition ) ) {
                    msg = `Unimplemented state transition ${descriptor.transition} on ${descriptor.fsmName}`;
                    return itcb( restErr( 500, msg, true ) );
                }

                //  and check that the transition is valid from the current state
                if( !Y.doccirrus.schemas.activity.hasTransition( descriptor.activity.actType, descriptor.activity.status, descriptor.transition ) ) {

                    msg = '' +
                        'Transition ' + descriptor.transition + ' unavailable from state ' + descriptor.activity.status +
                        ' for activities of type ' + descriptor.activity.actType;

                    return itcb( restErr( 500, msg, true ) );
                }

                that.doTransition( user, {}, descriptor.activity, descriptor.transition, true, onTestComplete );
            }

            /**
             *  Execute the (tested) transition for a single activity
             *
             *  @param  descriptor  {object}    Represents a single activity transition
             *  @param  itcb        {function}  Of the form fn(err)
             */

            function runSingleFromBatch( descriptor, itcb ) {
                const
                    isLastInBatch = descriptors.indexOf( descriptor ) === descriptors.length - 1;
                function onSingleComplete(err, newState) {
                    if ( err ) {
                        Y.log( `FSM error on transition: ${err}`, 'debug', NAME);
                        itcb( err );
                        return;
                    }

                    Y.log( `Completed transition for single activity: ${descriptor._id}`, 'debug', NAME);

                    if ('object' === (typeof newState)) {
                        descriptor.newState = newState.state;
                        descriptor.activity = newState.data ? newState.data : descriptor.activity;
                        activities.push( descriptor.activity._id );
                    } else {
                        descriptor.newState = newState;
                    }

                    newStates.push( newState );
                    progress( i18n( 'InvoiceMojit.cashbook.label.INVOICE_APPROVED' ) + descriptor.activity.content, descriptor.activity._id );
                    itcb( null );
                }

                descriptor.newState = 'err';
                Y.log(`Running transition for activity: ${descriptor._id}`, 'info', NAME);

                options.activityContext = {
                    isLastInBatch,
                    activitiesInBatch: activityIds.slice(),     //  MOJ-9943, do not update other in batch when deleting
                    weakQueueKey: queueKey,
                    cache: cacheObj
                };

                that.doTransition( user, options, descriptor.activity, descriptor.transition, false, onSingleComplete );
            }

        }; // end doTransitionBatch

        Y.namespace( 'doccirrus' ).activityapi = new DCActitvityApi();
    },
    '0.0.1', { requires: [
        'dcschemaloader',
        'activity-schema',
        'dc-fsm-default',
        'dc-fsm-invoice',
        'dc-fsm-receipt',
        'dc-fsm-treatment',
        'dcerrortable',
        'DcWeakQueue'
    ]
    }
);
