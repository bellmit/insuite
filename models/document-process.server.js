/**
 * User: ma
 * Date: 27/05/14  15:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*jshint esnext:true */
/*global YUI */
'use strict';

// New pattern for cascading pre and post processes.
// automatically called by the DB Layer before any
// mutation (CUD, excl R) is called on a data item.

YUI.add( 'document-process', function( Y, NAME ) {

        const
            {formatPromiseResult} = require( 'dc-core' ).utils,
            i18n = Y.doccirrus.i18n,

            MAX_CAPTION_LENGTH = Y.doccirrus.schemas.document.MAX_CAPTION_LENGTH;

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         *  Notes on the document who last edited or created it
         *
         *  @param  user        {object}    ac.rest.user or equivalent
         *  @param  document    {object}    mongoose doc loaded from database
         *  @param  callback    {function}  of the form fn(err, document)
         */

        function setPublisher( user, document, callback ) {

            function getEmployeeCb( err, result ) {
                if( err ) {
                    Y.log('Employee lookup error', 'warn', 'document-process');

                    //  letting this slide for now, since needle requests from patient portal can fail here
                    callback( null, document );

                    //callback( err );
                    return;
                }
                if( !result || !result[0] ) {
                    Y.log( 'no employee found for the logged-in user', 'warn', 'document-process' );
                    document.publisher = user.id;
                } else if( user.superuser ) {

                    //  the publisher string may be set to the patient name if submitted by the patient from the patient
                    //  portal.

                    if ( !document.type || 'FROMPATIENT' !== document.type ) {
                        document.publisher = Y.doccirrus.auth.superuserDisplayName;
                    }

                } else {
                    document.publisher = result[0].firstname + ' ' + result[0].lastname;
                }

                Y.log('Set document publisher to: ' + document.publisher, 'debug', 'document-process' );
                callback( null, document );
            }

            function getIdentityCb( err, result ) {

                Y.log('in getIdentityCb of preprocess chain to set publisher', 'debug', 'document-process');

                if (err) {
                    Y.log('Error looking up identity of current user.', 'warn', 'document-process');
                    //  let this slide for the sake of needle requests, temporary
                    //  TODO: find why identity sometimes does not pass from patient portal
                    callback( null, document );
                    return;
                }

                if (!result || !result[0] ) {
                    Y.log('Could not load user identity to note on model revision, cannot update publisher.' , 'warn', 'document-process');
                    //  letting this slide for now since this cannot always be discovered on needle requests
                    callback( null, document );
                    return;
                }

                Y.log('Identity lookup yields ' + result.length + ' results', 'debug', 'document-process');

                Y.doccirrus.mongodb.runDb( {
                    'action': 'get',
                    'model': 'employee',
                    'user': user,
                    'noAudit': true,
                    'query': { '_id': result[0].specifiedBy},
                    'callback': getEmployeeCb
                } );
            }

            if (!user.identityId) {
                Y.log( 'User identityId not set, publisher cannot be found', 'warn', 'document-process' );
                return callback( null, document );
            }

            Y.log('Getting identity: ' + user.identityId, 'debug', 'document-process');

            if( !user.superuser ) {
                Y.doccirrus.mongodb.runDb( {
                    'action': 'get',
                    'model': 'identity',
                    'user': user,
                    'query': {'_id': user.identityId},
                    'noAudit': true,
                    'callback': getIdentityCb
                } );
            } else {
                getEmployeeCb( null, [user] );
            }
        }



        function syncDocumentWithDispatcher(user, document, callback) {
            if ( !document.activityId || 24 !== document.activityId.length || /[^0-9a-f]/.test( document.activityId.toLowerCase() ) ) {
                //  activityId is actually a temp, random id of an activity which is not yet saved, cannot be synced
                return callback( null, document );
            }

            callback( null, document );
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'reference', {
                addedFrom: 'document_' + document._id.toString(),
                syncActivityId: document.activityId
            }, () => {} );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `document_${  document._id.toString()}`,
                entityName: 'document',
                entryId: document._id.toString(),
                lastChanged: document.lastChanged,
                onDelete: false
            }, () => {} );
        }

        function syncDocumentWithDispatcherOnDelete(user, document, callback) {
            callback( null, document );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `document_${  document._id.toString()}`,
                entityName: 'document',
                entryId: document._id.toString(),
                lastChanged: document.lastChanged,
                onDelete: true
            }, () => {} );
        }
        /**
         * Updates tag collection
         * @param {Object} user
         * @param {Object} document
         * @param {Function} callback
         */
        function updateTags( user, document, callback ){
            let
                oldTags = document.originalData_ && document.originalData_.tags || [],
                currentTags = document.tags || [];
            if( document.wasNew ) {
                oldTags = [];
            }
            Y.doccirrus.api.tag.updateTags({
                user,
                data: {
                    type: Y.doccirrus.schemas.tag.tagTypes.DOCUMENT,
                    oldTags,
                    documentId: document._id.toString(),
                    currentTags
                },
                callback: function( err ) {
                    callback( err, document );
                }
            });
        }

        function updateReporting( user, document, callback ) {
            let
                syncAuxManager = Y.doccirrus.insight2.syncAuxManager;
            syncAuxManager.auxHook( document, 'document', user );
            callback( null, document );
        }

        /**
         * Updates tag collection
         * @param {Object} user
         * @param {Object} document
         * @param {Function} callback
         */
        function updateTagsOnDelete( user, document, callback ){
            let
                oldTags = document.tags || [],
                currentTags = [];
            Y.doccirrus.api.tag.updateTags({
                user,
                data: {
                    type: Y.doccirrus.schemas.tag.tagTypes.DOCUMENT,
                    oldTags,
                    documentId: document._id.toString(),
                    currentTags
                },
                callback: function( err ) {
                    callback( err, document );
                }
            });
        }

        function removeReporting( user, document, callback ) {
            let
                activityId = document.activityId || null;

            if ( activityId ) {
                //  the activity which owns this document will need to be updated, this will recreate document reporting
                Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activityId );
            }

            callback( null, document );
        }

        // workaround @MOJ-6625
        function setIsModified( user, document, callback ) {
            document.wasNew = document.isNew;
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                document.lastChanged = document.lastChanged || new Date();
            } else {
                document.lastChanged = new Date();
            }
            callback( null, document );
        }

        function filterDocuments( user, document, callback ) {
            let filterFn = Y.doccirrus.filtering.models.document.resultFilters[0].bind( this );

            filterFn( user, document, onLocationFiltered );

            function onLocationFiltered( err, document ) {
                if ( err ) {
                    Y.log( `Problem filtering documents for locationId: ${JSON.stringify(err)}`, 'warn', NAME );
                    return callback( err, document );
                }
                callback( null, document );
            }
        }

        /**
         *  Clear meddata from form document mapping cache, can cause validations fail on save,
         *  and is not used to remapping MOJ-10112 MOJ-10117
         *
         *  @param  {Object}    user
         *  @param  {Object}    document
         *  @param  {Function}  callback
         */

        function clearMedData( user, document, callback ) {
            if ( document && document.mapData && document.mapData.latestMedDataTable ) {
                delete document.mapData.latestMedDataTable;
            }

            if ( document && document.mapData && document.mapData.md ) {
                delete document.mapData.md;
            }

            callback( null, document );
        }

        /**
         *  Check the max length of the caption, MOJ-13525
         *
         *  @param  {Object}    user
         *  @param  {Object}    document
         *  @param  {Function}  callback
         */

        function checkCaptionLength( user, document, callback ) {

            if ( document.caption && ( document.caption.length > MAX_CAPTION_LENGTH ) ) {
                Y.log( `Trimmed over-long document caption to ${MAX_CAPTION_LENGTH}`, 'warn', NAME );
                document.caption = document.caption.substr( 0, MAX_CAPTION_LENGTH ) + '...';
            }

            callback( null, document );
        }

        /**
         *  Check whether their are any malware warnings associated with this document
         *
         *  If so, copy the malware name to the document to display a warning in inCase / patient portal
         *
         *  @param user
         *  @param document
         *  @param callback
         *  @return {Promise<void>}
         */

        async function checkMalwareWarning( user, document, callback ) {
            //  only needed if there is an attached file
            if ( !document.mediaId ) { return callback( null, document ); }

            let err, result, media;

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'media',
                    query: { _id: document.mediaId }
                } )
            );

            media = result[0];

            if ( err || !result[0] ) {
                //   do not block save of document, media object might arrive later
                Y.log( `Could not load media ${document.mediaId} for document ${document._id}.`, 'warn', NAME );
                return callback( null, document );
            }

            if ( !media.malwareWarning || media.markFalsePositive ) {
                if ( document.malwareWarning ) {
                    //  remove false positive
                    delete document.malwareWarning;
                }
                return callback( null, document );
            }

            // we don't need all the clamdscan output on the document, just the malware name
            document.malwareWarning = media.malwareWarning.split( '\n' )[0];
            document.malwareWarning = document.malwareWarning.replace( ':', '' ).replace( 'FOUND', '' ).trim();

            return callback( null, document );
        }

        /**
         *  Create a task for roles from incaseconfiguration (or 'Empfang' if not set) about documents' creating/updating/deleting
         *  from Patient Portal with link to the document if it was created and with a patient name.
         *  There should be specific incaseconfiguration settings set to enable task creation -
         *      - incaseconfiguration.onPracticeDocumentNew - if document is just created
         *      - incaseconfiguration.onPracticeDocumentChanged - if document is updated (basically for forms)
         *      - incaseconfiguration.onPracticeDocumentDeleted - if document is deleted
         *
         *  @param  {Object}    user
         *  @param  {Object}    document
         *  @param  {Function}  callback
         */
        async function createTaskForReception( user, document, callback ) {
            let context = this.context,
                incaseconfiguration, err,
                usePatientId = document.patientId;

            if( context && ( context.deleteFromPP || context.postFromPP || context.updateFromPP ) ) {

                const
                    ID_LENGTH = 24,
                    taskData = {
                        allDay: false,
                        alertTime: (new Date()).toISOString(),
                        title: '',
                        urgency: 2,
                        group: false,
                        roles: [Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG],
                        creatorName: "System",
                        details: '',
                        skipcheck_: true,
                        patientId: '',
                        patientName: ''
                    };

                if( !document.patientId ) {
                    return callback( null, document );
                }

                if( 'string' === typeof usePatientId && usePatientId.length > ID_LENGTH ) {
                    try {
                        usePatientId = JSON.parse( usePatientId );
                    } catch( parseErr ) {
                        return callback( Y.doccirrus.errors.rest( 500, `Invalid patient to create task: ${JSON.stringify( usePatientId )}` ) );
                    }
                }

                if( 'object' === typeof usePatientId ) {
                    if( !usePatientId._id ) {
                        return callback( Y.doccirrus.errors.rest( 500, `Invalid patient to create task: ${JSON.stringify( usePatientId )}` ) );
                    }
                    usePatientId = usePatientId._id;
                }

                [err, incaseconfiguration] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.incaseconfiguration.readConfig( {
                            user: user,
                            callback: function( err, res ) {
                                if( err ) {
                                    reject( err );
                                }
                                resolve( res );
                            }
                        } );
                    } )
                );
                if( err ) {
                    Y.log( `createTaskForReception: Cannot get in case configuration: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                if( !incaseconfiguration ) {
                    Y.log( `createTaskForReception: There is no incaseconfiguration`, 'warn', NAME );
                    return callback( null, document );
                }

                if( incaseconfiguration.roles && incaseconfiguration.roles[0] ) {
                    taskData.roles = incaseconfiguration.roles;
                }

                if( context.postFromPP && incaseconfiguration.onPracticeDocumentNew ) {
                    taskData.title = i18n( 'document_process.tasks.documentAdded.TITLE' );
                    taskData.details = i18n( 'document_process.tasks.documentAdded.DETAILS', {
                        data: {
                            patientName: document.publisher,
                            caption: document.caption
                        }
                    } );
                    taskData.mediaId = document.mediaId;
                }

                if( context.updateFromPP && incaseconfiguration.onPracticeDocumentChanged ) {
                    taskData.title = i18n( 'document_process.tasks.documentChanged.TITLE' );
                    taskData.details = i18n( 'document_process.tasks.documentChanged.DETAILS', {
                        data: {
                            patientName: document.publisher,
                            caption: document.caption
                        }
                    } );
                    taskData.mediaId = document.mediaId;
                }

                if( context.deleteFromPP && incaseconfiguration.onPracticeDocumentDeleted ) {
                    taskData.title = i18n( 'document_process.tasks.documentDeleted.TITLE' );
                    taskData.details = i18n( 'document_process.tasks.documentDeleted.DETAILS', {
                        data: {
                            patientName: document.publisher,
                            caption: document.caption
                        }
                    } );
                }
                taskData.patientId = usePatientId;
                taskData.patientName = document.publisher;

                if( taskData.title ) {
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'task',
                            action: 'post',
                            data: taskData
                        } )
                    );
                    if( err ) {
                        return callback( err );
                    }
                    return callback( null, document );
                } else {
                    return callback( null, document );
                }
            }
            else {
                return callback( null, document );
            }
        }

        /**
         *  Send an email to a patient about linked documents' creating/updating/deleting by practice.
         *
         *  Due to the current logic, document became linked to the patient
         *  when we approve an activity with that document - then we send an email about creating.
         *
         *  There should be specific incaseconfiguration settings set to enable email sending -
         *      - incaseconfiguration.onPatientDocumentNew - if document is just created ( linked to patient and activity )
         *      - incaseconfiguration.onPatientDocumentChanged - if document is updated ( accessBy is changed )
         *      - incaseconfiguration.onPatientDocumentDeleted - if document is deleted or unlinked from patient and activity
         *
         *  @param  {Object}    user
         *  @param  {Object}    document
         *  @param  {Function}  callback
         */
        async function notifyPatientAboutDocumentFromPractice( user, document, callback ) {
            let err, incaseconfiguration, patient, patientEmails, prefferedEmail, practice, message = {},
                oldData = document.originalData_,
                patientConf = Y.doccirrus.email.getServiceConf( 'patientService' ),
                patientAdded = oldData && Boolean( document.patientId && !oldData.patientId ),
                patientRemoved = oldData && Boolean( oldData.patientId && !document.patientId ),
                patientId = patientRemoved ? oldData.patientId : document.patientId,
                context = this.context,
                updateFromPractice = context && context.updateFromPractice,
                deleteFromPractice = patientId && context && context.deleteFromPractice || ( updateFromPractice && !document.accessBy.length );

            if( ( patientAdded || patientRemoved || deleteFromPractice || updateFromPractice ) && document.caption && patientId && document.accessBy.includes( patientId ) ) {
                [err, incaseconfiguration] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.incaseconfiguration.readConfig( {
                            user: user,
                            callback: function( err, res ) {
                                if( err ) {
                                    reject( err );
                                }
                                resolve( res );
                            }
                        } );
                    } )
                );
                if( err ) {
                    Y.log( `notifyPatientAboutDocumentFromPractice: Cannot get in case configuration: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                if( !incaseconfiguration ) {
                    Y.log( `notifyPatientAboutDocumentFromPractice: There is no incaseconfiguration`, 'warn', NAME );
                    return callback( null, document );
                }

                if( !incaseconfiguration.onPatientDocumentNew && !incaseconfiguration.onPatientDocumentChanged && !incaseconfiguration.onPatientDocumentDeleted ) {
                    return callback( null, document );
                }

                [err, patient] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        action: 'get',
                        query: {_id: patientId},
                        options: {
                            select: {communications: 1}
                        }
                    } )
                );

                if( err ) {
                    Y.log( `notifyPatientAboutDocumentFromPractice: Cannot get patient with id ${patientId}. Error: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( !patient || !patient[0] || !patient[0].communications ) {
                    Y.log( `notifyPatientAboutDocumentFromPractice: There is no patient to notify.`, 'warn', NAME );
                    return callback( null, document );
                }

                patientEmails = patient[0].communications.filter( item => {
                    return ['EMAILPRIV', 'EMAILJOB'].includes( item.type );
                } );

                if( !patientEmails || !patientEmails[0] ) {
                    Y.log( `notifyPatientAboutDocumentFromPractice: Patient has no email to send notifications to.`, 'warn', NAME );
                    return callback( null, document );
                }
                prefferedEmail = patientEmails.find( item => {
                    return item.preferred;
                } );

                [err, practice] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.practice.getMyPractice( {
                            user,
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
                    Y.log( `notifyPatientAboutDocumentFromPractice: Error getting practice data: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                if( !practice ) {
                    Y.log( 'notifyPatientAboutDocumentFromPractice: practice data not found', 'error', NAME );
                    return callback( null, document );
                }

                if( incaseconfiguration.onPatientDocumentNew && ( patientAdded && incaseconfiguration.autoshareCheck || ( updateFromPractice && document.accessBy.length ) )) {
                    message.subject = i18n( 'document_process.emails.documentAdded.TITLE', {
                        data: {name: practice.coname}
                    } );

                    if ( 'FORM' === document.type ) {
                        message.text = i18n( 'document_process.emails.documentAdded.MAIL_TEXT_FORMS', {
                            data: {name: practice.coname, documentCaption: document.caption || ''}
                        } );
                    } else {
                        message.text = i18n( 'document_process.emails.documentAdded.MAIL_TEXT_DOCS', {
                            data: {name: practice.coname, documentCaption: document.caption || ''}
                        } );
                    }
                }

                if( incaseconfiguration.onPatientDocumentDeleted && ( patientRemoved || deleteFromPractice ) ) {
                    message.subject = i18n( 'document_process.emails.documentDeleted.TITLE', {
                        data: {name: practice.coname}
                    } );
                    message.text = i18n( 'document_process.emails.documentDeleted.MAIL_TEXT', {
                        data: {name: practice.coname, documentCaption: document.caption || ''}
                    } );
                }

                message.to = ( prefferedEmail && prefferedEmail.value ) || patientEmails[0].value;
                message.from = patientConf.from;
                message.noBcc = true;

                message = Y.doccirrus.email.createHtmlEmailMessage( message );

                if( message.text ) {
                    [err] = await formatPromiseResult(
                        new Promise( ( resolve, reject ) => {
                            Y.doccirrus.email.sendEmail( {...message, user}, ( err ) => {
                                if( err ) {
                                    Y.log( `notifyPatientAboutDocumentFromPractice. could not send email. ${err.stack || err}`, 'error', NAME );
                                    return reject( err );
                                }
                                resolve();
                            } );
                        } )
                    );
                    if( err ) {
                        Y.log( `notifyPatientAboutDocumentFromPractice: Cannot send email to patient: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                }

                return callback( null, document );
            } else {
                return callback( null, document );
            }
        }

        /**
         *  Call function to create audit log entry on each create/delete of document from Patient Portal
         *
         *  @param  {Object}    user
         *  @param  {Object}    document
         *  @param  {Function}  callback
         */
        async function auditPP( user, document, callback ) {
            if( this.context && this.context.postFromPP ) {
                await Y.doccirrus.utils.auditPPAction( user, {
                    model: 'document',
                    action: 'post',
                    who: document.patientId,
                    entry: document
                } );
            }
            if( this.context && this.context.deleteFromPP ) {
                await Y.doccirrus.utils.auditPPAction( user, {
                    model: 'document',
                    action: 'delete',
                    who: document.patientId,
                    entry: document
                } );
            }
            return callback( null, document );
        }

        /**
         * Pre-process to retrieve connected patients' full name
         * - if there is a patientId in document then directly from patient collection
         * - otherwise, if there is an activityId
         * -- get patientLastName and patientFirstName from activity
         * -- otherwise, get patientId from activity and then get a patient
         *
         * @param user
         * @param document
         * @param callback
         * @returns {Promise<*>}
         */
        async function populatePatientData( user, document, callback ) {
            let err, activity, patient;
            if( !document.activityId && !document.patientId ) {
                return callback( null, document );
            }
            if( document.patientId && Y.doccirrus.comctl.isObjectId( document.patientId ) ) {
                [err, patient] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: document.patientId
                        },
                        options: {
                            select: {
                                firstname: 1,
                                lastname: 1
                            }
                        }
                    } )
                );

                if( err ) {
                    Y.log( `populatePatientData: Cannot get patient for document: ${err.stack || err}`, 'warn', NAME );
                    // as it's needed for audit only, we don't break the process
                    return callback( null, document );
                }
                document.patientName = patient && patient.length && patient[0] && Y.doccirrus.schemas.person.personDisplay( {
                    firstname: patient[0].firstname,
                    lastname: patient[0].lastname
                } );
                return callback( null, document );
            }
            if( document.activityId && Y.doccirrus.comctl.isObjectId( document.activityId ) ) {
                [err, activity] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            _id: document.activityId
                        },
                        options: {
                            select: {
                                patientFirstName: 1,
                                patientLastName: 1,
                                patientId: 1
                            }
                        }
                    } )
                );

                if( err ) {
                    Y.log( `populatePatientData: Cannot get activity for document: ${err.stack || err}`, 'warn', NAME );
                    // as it's needed for audit only, we don't break the process
                    return callback( null, document );
                }
                if( !activity || !activity.length || !activity[0] ) {
                    return callback( null, document );
                }
                if( activity[0].patientFirstName && activity[0].patientLastName ) {
                    document.patientName = Y.doccirrus.schemas.person.personDisplay( {
                        firstname: activity[0].patientFirstName,
                        lastname: activity[0].patientLastName
                    } );
                    return callback( null, document );
                }
                if( activity[0].patientId ) {
                    [err, patient] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'patient',
                            action: 'get',
                            query: {
                                _id: activity[0].patientId
                            },
                            options: {
                                select: {
                                    firstname: 1,
                                    lastname: 1
                                }
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `populatePatientData: Cannot get patient for document: ${err.stack || err}`, 'warn', NAME );
                        // as it's needed for audit only, we don't break the process
                        return callback( null, document );
                    }
                    document.patientName = patient && patient.length && patient[0] && Y.doccirrus.schemas.person.personDisplay( {
                        firstname: patient[0].firstname,
                        lastname: patient[0].lastname
                    } );
                    return callback( null, document );
                }
                return callback( null, document );
            }
            return callback( null, document );
        }
        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class DocumentProcess
         */
        NAME = Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        clearMedData,
                        filterDocuments,
                        setIsModified,
                        setPublisher,
                        populatePatientData,
                        checkCaptionLength,
                        checkMalwareWarning
                    ], forAction: 'write'
                },
                {
                    run: [
                        filterDocuments,
                        syncDocumentWithDispatcherOnDelete,
                        populatePatientData
                    ],
                    forAction: 'delete'
                }
            ],

            post: [
                {
                    run: [
                        updateReporting,
                        updateTags,
                        syncDocumentWithDispatcher,
                        createTaskForReception,
                        notifyPatientAboutDocumentFromPractice,
                        auditPP
                    ], forAction: 'write'
                },
                {
                    run: [
                        updateTagsOnDelete,
                        removeReporting,
                        createTaskForReception,
                        notifyPatientAboutDocumentFromPractice,
                        auditPP
                    ], forAction: 'delete'
                }
            ],

            audit: {
                // audit: {}  switches on auditing.  for no auditing, do not include the "audit" parameter

                /**
                 * optional:  true = in addition to regular auditing note down actions
                 * on this model that were attempted as well as ones that failed.
                 * Descr. in this case will always be "Versuch".
                 *
                 * false = note down only things that actually took place,
                 * not attempts that failed
                 */
                noteAttempt: false,

                /**
                 * optional: here we can override what is shown in the audit log description
                 * only used when the action succeeds (see noteAttempt)
                 *
                 * @param data
                 * @returns {*|string|string}
                 */
                descrFn: function( data ) {
                    Y.log( 'Called schemaprocess descrFn', 'debug', NAME );
                    return data.patientName ? `${data.patientName}, ${data.caption || "Eintrag ohne caption"}` : (data.caption || "Eintrag ohne caption");
                }

            },

            processQuery: Y.doccirrus.filtering.models.document.processQuery,
            processAggregation: Y.doccirrus.filtering.models.document.processAggregation,

            name: NAME
        };

    },
    '0.0.1', {requires: [
        'tag-schema'
    ]}
);
