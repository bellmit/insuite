/*
 @author: strix
 @date: 2015 February
 */

/**
 *  Server-side methods for creating, updating and listing documents
 *
 *  These are mostly structures the same way as client-side ko helpers, and server the same functions when forms
 *  are rendered on the server and need to linked to activities.
 *
 *  Overview:
 *
 *  getSingleDocument           - look up a single document in a set of attachments
 *  setFormDocument             - (REST) set the document which contains an activity's saved form state
 *  updatePdfDoc                - create or update FORMPDF document
 *  createDocumentFromForm      - create a document object of type FORM and link from the activity which owns it
 *  getOrCreateFormDocument     - call back with form document on activity, creating one if necessary
 *  formDocToDict               - extract form state from a 'FORM' type document
 *  updateFormDoc               - update the 'FORM' type attachment on an activity from the contents of a form
 *  setPatientId                - controls whether the document can be shared on patient portal (and auto-shares)
 *  claimForActivityId          - associate existing documents with a newly saved activity
 */
//TRANSLATION INCOMPLETE!! MOJ-3201
/*global YUI*/
/*jslint latedef:false */

YUI.add(
    'document-api',
    function( Y, NAME ) {

        const
            async = require( 'async' ),
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils,
            moment = require( 'moment' ),
            cluster = require( 'cluster' ),
            EMITDOCUMENTEVENT = 'watchDocumentUpdate';

        // Added for sol vivy
        function callEmitWebHookEvent( params ) {
            Y.doccirrus.communication.emitWebHookEvent( {
                payload: params.msg,
                roomData: {
                    hook: 'vivy',
                    action: params.eventAction,
                    query: {}
                },
                action: params.eventAction
            } );
        }

        if( cluster.isMaster ) {
            Y.doccirrus.ipc.subscribeNamed( EMITDOCUMENTEVENT, NAME, true, callEmitWebHookEvent );
        }

        function eventEmitter( params ) {
            if( Y.doccirrus.ipc.isMaster() ) {
                callEmitWebHookEvent( params );
            } else {
                Y.doccirrus.ipc.send( EMITDOCUMENTEVENT, params, true, true );
            }
        }

        /**
         *  Calls back with a single activity of the specified type from the supplied set of documents
         *
         *  Activities with forms keep the form's state as an attachment, called FORM document
         *  This is needed when loading the form in order to restore any previous data added by the user
         *
         *  There should be exactly one form document on any activity with a form
         *
         *  @param  attachments     {Object}    Plain array of document objects
         *  @param  docIdentifier   {Object}    Type, _id, mediaId or '_hasFormData'
         */

        function getSingleDocument(attachments, docIdentifier) {
            var
                foundDoc = null,
                doc,
                mediaId,
                i;

            if ( !attachments ) {
                Y.log('Attachments not loaded, cannot get single document.', 'warn', NAME);
                return foundDoc;
            }

            if( 0 === attachments.length ) {
                return foundDoc;
            }

            for (i = 0; i < attachments.length; i++) {

                doc = attachments[i];
                mediaId = '';

                if( doc._id === docIdentifier ) {
                    foundDoc = doc;
                }

                if( 'FORM' === docIdentifier && 'FORM' === doc.type ) {
                    foundDoc = doc;
                }

                if( 'FORMPDF' === docIdentifier && 'FORMPDF' === doc.type ) {
                    foundDoc = doc;
                }

                if(
                    ('_hasFormData' === docIdentifier) &&
                    (doc.formData) &&
                    ('' !== doc.formData)
                ) {
                    foundDoc = doc;
                }

                if(
                    ('_hasFormData' === docIdentifier) &&
                    (doc.formState) &&
                    ('' !== doc.formState)
                ) {
                    foundDoc = doc;
                }

                if( doc.url && '' !== doc.url ) {
                    mediaId = /id=([a-fA-F\d]+)/.exec( doc.url ); // extract the mediaId
                    mediaId = (mediaId) ? mediaId[1] : mediaId;

                    if( mediaId === docIdentifier ) {
                        foundDoc = doc;
                    }
                }

            }

            return foundDoc;
        }

        /**
         *  Activities which have a form should have exactly one 'FORM' type document to contain the form state
         *
         *  This document must be updated on the server in response to user action, mapping or state change.
         *
         *  TODO: check if this is still used anywhere, probably safe to remove
         *
         *  Expected arguments:
         *
         *      user            {object}    REST user or equivalent
         *      activity        {object}    activity object
         *      formContents    {object}    From template.toDict()
         *      callback        {function}
         *
         *  @param args {object}
         */

        function setFormDocument(args) {
            Y.log('Entering Y.doccirrus.api.document.setFormDocument', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.document.setFormDocument');
            }
            var
                activity = args.activity,
                formContents = args.formContents,
                formDoc;

            Y.doccirrus.schemas.activity.getFormDocumentServer(activity.attachments, onGetExtant);

            function onGetExtant(err, extantFormDoc) {
                if (err) {
                    Y.log(`Error loading form document: ${JSON.stringify(err)}`, 'warn', NAME);
                    args.callback(err);
                    return;
                }

                if (!extantFormDoc) {
                    extantFormDoc = {
                        'type': 'FORM',
                        'contentType': 'dc/form',
                        'formId': activity.formId,
                        'formInstanceId': activity.formVersion,
                        'locationId': activity.locationId,
                        'publisher': activity.editor[0].name,
                        'isEditable': ('QUESTIONNAIRE' === activity.actType ),
                        'caption': activity.content,
                        'createdOn': (new Date()).toString()
                    };
                }

                formDoc = extantFormDoc;
                formDoc.formData = '';
                formDoc.formState = formContents;

                var
                    dbAction = formDoc._id ? 'put' : 'post',
                    dbSetup = {
                        'action': dbAction,
                        'user': args.user,
                        'model': 'document',
                        'query': { '_id': (('' !== activity.formVersionId) ? activity.formVersionId: activity.formId) }
                    };

                /*
                if ('post' === dbAction) {
                    dbSetup.data = Y.doccirrus.filters.cleanDbObject(formDoc);
                } else {
                    dbSetup.data = Y.doccirrus.filters.cleanDbObject({
                        'formId': formContents,
                        'formState': formContents,
                        'fields_': ['formState']
                    });
                }
                */

                Y.doccirrus.mongodb.runDb( dbSetup, args.callback );

            }

        }

        /**
         *  Create or update FORMPDF document
         *
         *  Note that this is called by the forms mojit after a PDF is rendered on the server and saved to the database
         *
         *  @param  activity    {Object}    Object from activities collection
         *  @param  template    {Object}    A formtemplate object
         *  @param  mediaId     {String}    Database _id of a stored PDF in media collection
         *  @param  callback    {Function}  Of the form fn(err)
         */

        function updatePdfDoc(activity, template, mediaId, callback) {
            var formPdf = getSingleDocument(activity.attachments, 'FORMPDF');

            function onActivityFormPdfUpdated(err) {
                callback(err);
            }

            function onPdfDocumentSaved(err) {
                //  activity will need to be updated with new link to mediaId

                if (err) {
                    callback(err);
                    return;
                }

                var
                    putData = {
                        'fields_': [ 'formPdf' ],
                        'formPdf': mediaId
                    };

                putData = Y.doccirrus.filters.cleanDbObject( putData );

                Y.doccirrus.mongodb.runDb( {
                    'user': template.user,
                    'model': 'activity',
                    'query': { '_id': (`${activity._id  }`)},
                    'action': 'put',
                    'data': putData,
                    'options': { ignoreReadOnly: [ 'formPdf' ] }
                }, onActivityFormPdfUpdated );

            }

            if (!formPdf) {
                Y.log('Could not find form document: creating');
                // the following recursion was duplicating records in the document collection.
                createDocumentFromMedia(activity, template, mediaId, onPdfDocumentSaved);
                return;
            }

            var
                putFields = [
                    'type', 'contentType', 'formId', 'formInstanceId', 'publisher', 'activityId', 'printerName',
                    'locationId', 'mediaId', 'formData', 'formState', 'createdOn', 'caption', 'url', 'usesMedia'
                ],
                newDoc = {
                    type: 'FORMPDF',
                    contentType: 'application/pdf',
                    formId: (`${template.canonicalId  }`),
                    formInstanceId: (`${template.formVersionId  }`),
                    publisher: (`${Y.doccirrus.comctl.fullNameOfUser  }`),
                    activityId: (`${activity._id  }`),
                    patientId: activity.patientId,
                    attachedTo: (`${activity.patientId  }`),  //  deprecated, see MOJ-9190
                    printerName: '',
                    locationId: (`${activity.locationId  }`),
                    caseFolderId: activity.caseFolderId,
                    actType: activity.actType,
                    subType: activity.subType,
                    mediaId: mediaId,
                    formData: '',
                    formState: template.toDict(),
                    createdOn: (new Date()).toJSON(),
                    caption: (`${activity.content  }`),
                    url: `/media/${mediaId}_original.APPLICATION_PDF.pdf`,
                    fields_: putFields
                    //  do not change share status
                    //  accessBy: [(activity.patientId + '')],
                };

            if ( 'APPROVED' !== activity.status ) {
                //  not yet shared with patient
                newDoc.attachedTo = `${activity._id  }`;  //  deprecated, see MOJ-9190
                newDoc.patientId = '';
            }

            Y.doccirrus.api.formprinter.getPrinterServer(template.user, newDoc.formId, newDoc.locationId, onPrinterLookup);

            function onPrinterLookup(err, printerName) {
                var
                    dbSetup = {
                        'user': template.user,
                        'model': 'document',
                        'action': 'put',
                        'query': { '_id': formPdf._id },
                        'field': putFields,
                        'options': {}
                    };

                if (!err && printerName && '' !== printerName) {
                    Y.log(`Setting printer configured at this location: ${printerName}`, 'debug', NAME);
                    newDoc.printerName = printerName;
                }

                dbSetup.data = Y.doccirrus.filters.cleanDbObject(newDoc);

                Y.log('Updating form PDF with server-side details.', 'debug', NAME);
                Y.doccirrus.mongodb.runDb( dbSetup, onPdfDocumentSaved );
            }

        }

        /**
         *  Create a document object of type FORM and link from the activity which owns it
         *
         *  @param context      {Object}    Includes activity, patient and attached documents
         *  @param template     {Object}    A dcforms-template object
         *  @param callback     {Function}  Of the form fn(err, doc)
         */

        function createDocumentFromForm( context, template, callback ) {
            Y.log( `Creating document from form: ${template.formId}`, 'info', NAME );

            // changes / additions are autosaved on server, on client are tied to FSM
            function onDocumentSaved(err, result) {
                Y.log('DB post operation completed.', 'debug', NAME);
                if (err) {
                    Y.log(`Could not create new FORM document: ${JSON.stringify(err)}`);
                    callback(err);
                    return;
                }

                if (!result || result.length === 0 ) {
                    callback(new Error(`No _id returned for new document, data is: ${JSON.stringify(result)}`));
                    return;
                }

                newDoc._id = result[0];
                Y.log(`onSaveSuccess, new document: ${newDoc._id}`, 'debug', NAME);

                //  Update the document list of the activity which owns this document

                context.documents.push(newDoc);

                var plainAttachments = [], i;

                for (i = 0; i < context.documents.length; i++) {
                    if (-1 === plainAttachments.indexOf( context.documents[i]._id )) {
                        plainAttachments.push( context.documents[i]._id );
                    }
                }

                if(!context.activity || !context.activity._id){
                   Y.log( 'Activity _id is expected', 'error', NAME );
                   return onActivitySaved(new Error('context.activity._id undefined'));
                }

                Y.log(`saving attachments back to activity ${context.activity._id}: ${JSON.stringify(plainAttachments)}`, 'debug', NAME);

                Y.doccirrus.mongodb.runDb( {
                    'user': template.user,
                    'model': 'activity',
                    'action': 'put',
                    'query': { '_id': context.activity._id },
                    'field': [ 'attachments', 'formId', 'formVersion' ],
                    'data': {
                        'attachments': plainAttachments,
                        'formId': template.canonicalId,
                        'formVersion': template.formVersionId,
                        'fields_': [ 'attachments', 'formId', 'formVersion' ],
                        'skipcheck_': true
                    },
                    'options': {
                        ignoreReadOnly: ['attachments']
                    }
                }, onActivitySaved );
            }

            function onActivitySaved(err) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, newDoc);
            }

            Y.log('Serializing template into form document.', 'debug', NAME);

            var
                activity = context.activity,
                newDoc = {
                    type: (('QUESTIONNAIRE' === activity.actType ) ? 'QUESTIONNAIRE' : 'FORM'),
                    contentType: (('QUESTIONNAIRE' === activity.actType ) ? 'dc/questionnaire' : 'dc/form'),
                    formId: (`${template.canonicalId  }`),
                    formInstanceId: (`${template.formVersionId  }`),
                    formData: '',
                    formState: template.toDict(),
                    formInitialState: template.toDict(),
                    publisher: (`${Y.doccirrus.comctl.fullNameOfUser  }`),
                    activityId: (`${activity._id  }`),
                    patientId: (`${activity.patientId  }`),
                    locationId: `${activity.locationId}`,
                    caseFolderId: activity.caseFolderId,
                    actType: activity.actType,
                    subType: activity.subType,
                    printerName: '',
                    createdOn: (new Date()).toJSON(),
                    accessBy: [],
                    attachedTo: (`${activity.patientId  }`),              //  deprecated, see MOJ-9190
                    caption: (`${activity.content  }`),
                    isEditable: ('QUESTIONNAIRE' === activity.actType )
                };

            if ( 'APPROVED' !== activity.status ) {
                //  deprecated, to be removed but kept for now, see MOJ-9190
                newDoc.attachedTo = `${activity._id  }`;
                //  documents cannot be shared with the patient portal until their activity is approved
                newDoc.patientId = '';
            }

            Y.doccirrus.api.formprinter.getPrinterServer(template.user, newDoc.formId, newDoc.locationId, onPrinterLookup);

            function onPrinterLookup(err, printerName) {
                var
                    dbSetup = {
                        'user': template.user,
                        'model': 'document',
                        'action': 'post',
                        'options': { }
                    };

                if (!err && printerName && '' !== printerName) {
                    Y.log(`Setting printer configured at this locale: ${printerName}`, 'debug', NAME);
                    newDoc.printerName = printerName;
                }

                dbSetup.data = Y.doccirrus.filters.cleanDbObject( newDoc);

                Y.log('Serialized template into form document.', 'debug', NAME);
                Y.doccirrus.mongodb.runDb( dbSetup, onDocumentSaved );
            }
        }

        /**
         *  Create a document object of type FORMPDF and link from the activity which owns it
         *
         *  @param  activity    {Object}    Current activity viewModel
         *  @param  template    {Object}    A dcforms-template object
         *  @param  mediaId     {String}    Database _id of new media object
         *  @param  callback    {Function}  Of the form fn(err, doc)
         */

        function createDocumentFromMedia( activity, template, mediaId, callback ) {
            Y.log( `Creating document from media item: ${mediaId}`, 'info', NAME );

            // changes / additions are autosaved on server, on client are tied to FSM
            function onPdfDocumentSaved(err, result) {
                Y.log('DB post operation completed.', 'debug', NAME);
                if (err) {
                    Y.log(`Could not create new FORMPDF document: ${JSON.stringify(err)}`);
                    callback(err);
                    return;
                }

                if (!result || result.length === 0 ) {
                    callback(new Error(`No _id returned for new document, data is: ${JSON.stringify(result)}`));
                    return;
                }

                newDoc._id = result[0];
                activity.attachments.push(newDoc);
                Y.log(`onSaveSuccess, new FORMPDF document: ${newDoc._id}`, 'debug', NAME);

                //  link new PDF document from activity which owns it, remove duplicates
                //  next refactor: would be tidier to separate this out and call from the form Doc method as well

                var cleanAttachments = [], putData, i;

                for (i = 0; i < activity.attachments.length; i++) {
                    if ('object' === (typeof activity.attachments[i]) && activity.attachments[i]._id) {
                        if (-1 === cleanAttachments.indexOf(`${activity.attachments[i]._id  }`)) {
                            cleanAttachments.push(`${activity.attachments[i]._id  }`);
                        }
                    } else {
                        if (-1 === cleanAttachments.indexOf(`${activity.attachments[i]  }`)) {
                            cleanAttachments.push(`${activity.attachments[i]  }`);
                        }
                    }
                }

                Y.log( `New clean attachment set for activity: ${JSON.stringify(cleanAttachments)}`, 'debug', NAME );

                putData = Y.doccirrus.filters.cleanDbObject({ 'attachments': cleanAttachments, 'fields_': ['attachments'] });

                Y.doccirrus.mongodb.runDb( {
                    'user': template.user,
                    'model': 'activity',
                    'query': { '_id': (`${activity._id  }`)},
                    'action': 'put',
                    'data': putData,
                    'options': { ignoreReadOnly: ['attachments'] }
                }, onActivitySaved );
            }

            function onActivitySaved(err) {
                Y.log('Call into activity updated with new FORMPDF document and saved.', 'debug', NAME);
                if (err) {
                    callback(err);
                    return;
                }
                Y.log('Activity updated with new new FORMPDF document and saved.', 'debug', NAME);
                callback(null, newDoc);
            }

            Y.log('Serializing template into form document.', 'debug', NAME);

            var
                patId = ('object' === typeof activity._currentPatient) ? activity._currentPatient._id : activity.patientId,
                newDoc = {
                    type: `${template.type}` || 'FORMPDF',
                    contentType: 'application/pdf',
                    formId: (`${template.canonicalId  }`),
                    formInstanceId: (`${template.formVersionId  }`),
                    publisher: (`${Y.doccirrus.comctl.fullNameOfUser  }`), //Y.doccirrus.utils.loggedInUser,
                    activityId: (`${activity._id  }`),
                    patientId: activity.patientId,
                    locationId: `${activity.locationId}`,
                    caseFolderId: activity.caseFolderId,
                    actType: activity.actType,
                    subType: activity.subType,
                    printerName: '',
                    mediaId: mediaId,
                    accessBy: [],
                    attachedTo: (`${patId  }`),
                    formData: '',
                    formState: { 'neverSaved': true },
                    createdOn: (new Date()).toJSON(),
                    caption: (`${template.caption || activity.content}`),
                    isEditable: false,
                    url: `/media/:${mediaId}_original.APPLICATION_PDF.pdf`
                };

            if ( 'APPROVED' !== activity.status ) {
                //  deprecated, but kept for now, see MOJ-9190
                newDoc.attachedTo = `${activity._id  }`;
                //  documents cannot be shared on patient portal until approved
                newDoc.patientId = '';
            }

            Y.doccirrus.api.formprinter.getPrinterServer(template.user, newDoc.formId, newDoc.locationId, onPrinterLookup);

            function onPrinterLookup(err, printerName) {
                var
                    dbSetup = {
                        'user': template.user,
                        'model': 'document',
                        'action': 'post',
                        'options': {}
                    };

                if (!err && printerName && '' !== printerName) {
                    Y.log(`Setting printer configured at this locale: ${printerName}`, 'debug', NAME);
                    newDoc.printerName = printerName;
                }

                dbSetup.data = Y.doccirrus.filters.cleanDbObject( newDoc);

                Y.log('Linked PDF from form document.', 'debug', NAME);
                Y.doccirrus.mongodb.runDb( dbSetup, onPdfDocumentSaved );
            }
        }

        /**
         *  Call back with form document on activity, creating one if necessary
         *
         *  DEPRECATED to be removed soon
         *
         *  @param  context     {Object}    With activity, patient and documents
         *  @param  template    {Object}    A dcforms-template object
         *  @param  callback    {Function}  Of the form fn(err, formDoc, needsReMap)
         */

        function getOrCreateFormDocument( context, template, callback ) {
            let foundDoc = getSingleDocument( context.documents, '_hasFormData' );

            //  CASE: activity has a document and it holds form state

            if (null !== foundDoc && 'remap' !== foundDoc.formData) {
                Y.log(`Found form document on activity: ${foundDoc._id} ${foundDoc.formData}`, 'debug', NAME);
                callback(null, foundDoc, false);
                return;
            }

            //  CASE: activity has a document but fields on activity have changed and it needs a remap
            if (foundDoc && foundDoc.formData && 'remap' === foundDoc.formData) {
                return callback(null, foundDoc, true);
            }

            //  CASE: activity has no 'FORM' type document
            createDocumentFromForm( context, template, onFormDocCreated );

            function onFormDocCreated(err, newDoc) {
                if (err) {
                    Y.log(`Could not create new FORM document: ${JSON.stringify(err)}`, 'warn', NAME);
                    callback(err);
                    return;
                }
                //  Server can modify FORM document at any point, added to allow addition of invoiceNo after APPROVE
                callback(null, newDoc, true);
            }

        }

        /**
         *  Extract form state from a 'FORM' type document
         *
         *  Note that this is likely to change in future
         *
         *  @param  formDoc {Object}    A document object holding form state
         *  @return         {Object}    form data in native serialzation of forms
         */

        function formDocToDict(formDoc) {
            var
                formState = formDoc.formState ? formDoc.formState : '',
                formData = formDoc.formData ? formDoc.formData : '',
                formDict = {};

            if (formState) {

                if ('string' === typeof formState) {
                    try {
                        formDict = JSON.parse(formState);
                    } catch (parseErr) {
                        Y.log(`Could not parse stored form state: ${JSON.stringify(parseErr)}`, 'warn', NAME);
                        formDict = {};
                    }
                }

                if ('object' === typeof formState) {
                    formDict = formState;
                }

                return formDict;
            }

            if( '' !== formData ) {

                formData = Y.doccirrus.comctl.B64ToUTF8( formData );

                if ('string' === typeof formData) {
                    try {
                        formDict = JSON.parse( formData );
                    } catch (parseErr) {
                        Y.log(`Could not parse saved form data: ${formData}`, 'warn', NAME);
                    }
                } else {
                    Y.log(`Form data is not a string: (${typeof formData}) ${JSON.stringify(formData)}`, 'debug', NAME);
                }

            } else {
                Y.log( `Form data not available: ${formDoc._id || 'no formDoc'}`, 'warn', NAME );
            }

            return formDict;
        }

        /**
         *  Update the 'FORM' type attachment on an activity - if present - from the contents of the form
         *
         *  @param  context     {Object}    includes activity, pateint and attached documents
         *  @param  template    {Object}    A dcforms-template object
         *  @param  callback    {Function}  Of the form fn(err)
         */

        function updateFormDoc(context, template, callback) {
            var
                formDoc = getSingleDocument( context.documents, '_hasFormData' );

            Y.log('Updating form document in database', 'debug', NAME);

            function onCreatedNewDocument(err) {

                if (err) {
                    Y.log(`Could not create new FORM type document: ${JSON.stringify(err)}`, 'warn', NAME);
                    callback(err);
                    return;
                }

                Y.log('Created new form document, saving state of form into it.', 'debug', NAME);
                updateFormDoc( context, template, callback );
            }

            function onFormDocumentSaved(err) {
                //  activity stays the same
                Y.log('Saved changes to form document', 'debug', NAME);
                callback(err);
            }

            if (!formDoc) {
                Y.log('Could not find form document: creating', 'debug', NAME);
                //callback(new Error('Could not find form document, activity may still be loading.'));
                formDoc = createDocumentFromForm( context, template, onCreatedNewDocument );
                return;
            }

            //  update the document
            formDoc.formData = '';
            formDoc.formState = template.toDict();
            formDoc.formId = template.canonicalId;
            formDoc.formInstanceId = template.formVersionId;
            formDoc.caption = ( `${context.activity.content  }` );
            formDoc.usesMedia = template.getReferencedMedia();
            formDoc.publisher = ( `${Y.doccirrus.comctl.fullNameOfUser  }` );
            formDoc.fields_ = ['formData', 'formState', 'formId', 'formInstanceId', 'usesMedia', 'caption', 'publisher', 'printerName'];
            formDoc.skipcheck_ = true;

            Y.doccirrus.api.formprinter.getPrinterServer(template.user, formDoc.formId, formDoc.locationId, onPrinterLookup);

            function onPrinterLookup(err, printerName) {

                if (!err && printerName && '' !== printerName) {
                    Y.log(`Updating printer according to activity locale: ${printerName}`, 'debug', NAME);
                    formDoc.printerName = printerName;
                }

                Y.log(`Saving: ${JSON.stringify(formDoc.formState, 'undefined', 2)}`, 'debug', NAME);

                var
                    dbSetup = {
                        'user': template.user,
                        'model': 'document',
                        'action': 'put',
                        'query': { '_id': formDoc._id },
                        'data': formDoc,
                        'fields': formDoc.fields_,
                        'options': { ignoreReadOny: true }
                    };

                Y.log(`Saving changes: ${JSON.stringify(dbSetup.data)}`, 'debug', NAME);
                Y.doccirrus.mongodb.runDb( dbSetup, onFormDocumentSaved );

                //callback(null);
            }

        }

        /**
         *  Set the patientId property of a set of documents.
         *
         *  Before an activity is approved, its documents cannot be shared with patient.  This is recorded by setting
         *  and empty patientId on the document.  When the activity is approved, the document.patientId property is set
         *  to the activity's patientId.  When cancelling this is reversed.
         *
         *  There is also an option in the incase configuration to automatically share approved documents with the
         *  patient portal.  If set then the patientId will be added to the accessBy property of the document.
         *
         *  This replaces previous attachedTo mechanism implemented in chownDocumentsForActivity
         *
         *  @param  {Object}    user                REST user or equivalent
         *  @param  {Object}    documentIds         Array of document _ids from activity.attachments
         *  @param  {String}    patientId           From activity.patientId
         *  @param  {Boolean}   updateFromPractice  Flag to indicate this action as update from practice to send notification to patient
         *  @param  {Function}  callback            Of the form fn( err )
         */

        function setPatientId( user, documentIds, patientId, updateFromPractice, callback ) {
            let
                inCaseConfig,
                documents;


            async.series( [ loadInCaseConfig, loadDocuments, updateDocuments ], onAllDone );

            function loadInCaseConfig( itcb ) {
                Y.doccirrus.api.incaseconfiguration.readConfig( {
                    'user': user,
                    'callback': onConfigRead
                } );

                function onConfigRead(err, freshConfig) {
                    if (err) {
                        Y.log(`Could not read invoice configuration: ${JSON.stringify(err)}`, 'warn', NAME);
                        callback(err);
                        return;
                    }

                    inCaseConfig = freshConfig;
                    itcb( null );
                }
            }

            function loadDocuments( itcb ) {
                //  Once we know if we're going to share the documents, load them
                Y.log('Linked PDF from form document.', 'debug', NAME);
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'document',
                    'action': 'get',
                    'query': { '_id': { '$in': documentIds } },
                    'callback': onDocumentsLoaded
                } );

                function onDocumentsLoaded(err, result) {
                    if (err) {
                        Y.log(`Could not load documents attached to activity: ${JSON.stringify( err )}`, 'warn', NAME);
                        itcb( err );
                        return;
                    }

                    documents = result;
                    itcb( null );
                }
            }

            function updateDocuments( itcb ) {
                async.eachSeries( documents, updateSingleDocument, itcb );
            }

            function updateSingleDocument( document, itcb ) {
                let
                    putData = { 'fields_': [] };

                if ( document.patientId !== patientId ) {
                    putData.patientId = patientId;
                    putData.fields_.push( 'patientId' );
                }

                document.accessBy = document.accessBy ? document.accessBy : [];

                if ( patientId && '' !== patientId ) {
                    //  if setting the patientId we also want to share the document on the patient portal if the
                    //  option is set in inCaseConfig (ie, add this patient to accessBy)
                    if ( inCaseConfig.autoshareCheck ) {
                        putData.accessBy = document.accessBy.concat( [] );  //   copy the array
                        if ( -1 === putData.accessBy.indexOf( patientId ) ) {
                            putData.accessBy.push( patientId );
                            putData.fields_.push( 'accessBy' );
                        }
                    }
                } else {
                    //  if clearing patientId then the activity is no longer approved (probably cancelled)
                    //  it should be unshared it from patient portal (any patients removed from accessBy)
                    if ( document.accessBy && document.accessBy.length !== 0 ) {
                        putData.accessBy = [];
                        putData.fields_.push( 'accessBy' );
                    }
                }

                //  also set attachedTo property, for dev and backwards compatibility for partners
                if ( patientId && '' !== patientId ) {
                    //  if setting patientId, the attachedTo should be patientId
                    putData.attachedTo = patientId;
                    putData.fields_.push( 'attachedTo' );
                } else {
                    //  if no patientId, the attachedTo should be activityId
                    putData.attachedTo = document.activityId || '';
                    putData.fields_.push( 'attachedTo' );
                }

                //  if no changes to save then we can skip the db udpate
                if ( 0 === putData.fields_.length ) { return itcb( null ); }

                let context = {};

                if( (putData.accessBy || []).includes( patientId ) && updateFromPractice ) {
                    context = {
                        updateFromPractice: true
                    };
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'document',
                    'action': 'put',
                    'query': { '_id': `${document._id  }` },
                    'data': Y.doccirrus.filters.cleanDbObject( putData ),
                    'field': putData.fields_,
                    'options': { ignoreReadOnly: true },        //  documents can be shared or cancelled after approval
                    'callback': onSingleDocumentSaved,
                    'context': context
                } );

                function onSingleDocumentSaved( err ) {
                    if ( err ) {
                        Y.log( `Problem updating patientId/accessBy properties of document: ${JSON.stringify( err )}`, 'warn', NAME );
                        //  continue despite error, best effort (eg, don't block cancel of broken activity)
                    }
                    itcb( null );
                }

            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Problem updating patientId on documents: ${JSON.stringify( err )}` );
                    return callback( err);
                }

                callback( null );
            }

        }

        /**
         *  Documents may be created before an activity has been saved on the server for the first time.  In this
         *  case they are linked to a temporary id generated on the client, and must be re-linked to the activity _id
         *  when the activity is saved.
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  tempId      {String}    Temporary id  generated on client (viewModel activity._randomId)
         *  @param  activityId  {String}    Final _id generated on server (activity._id)
         *  @param  callback    {Function}  Of the fprm fn(err)
         */

        function claimForActivityId(user, tempId, activityId, callback) {
            var
                mediaId,
                docType,
                toRelink = [],
                dbGetSetup = {
                    'user': user,
                    'model': 'document',
                    'action': 'get',
                    'query': { 'activityId': tempId },
                    'options': {}
                };

            Y.log(`claimForActivityId ${tempId} --> ${activityId}`, 'debug', NAME);

            Y.doccirrus.mongodb.runDb( dbGetSetup, onDocumentsLoaded );

            function onDocumentsLoaded(err, result) {
                if (err) {
                    Y.log(`Could not load documents linked to tempId ${tempId}: ${JSON.stringify(err)}`, 'warn', NAME);
                    callback(err);
                    return;
                }

                var i;
                for (i = 0; i < result.length; i++) {
                    Y.log(`Changing ownership of document ${result[i]._id} to ${activityId}`, 'debug', NAME);
                    toRelink.push(result[i]);
                }

                relinkNext();
            }

            function relinkNext() {
                if (0 === toRelink.length) {
                    //  all done with documents, also claim any media owned by this activity

                    Y.doccirrus.api.media.chown({
                        'user': user,
                        'callback': callback,
                        'originalParams': {
                            'fromCollection': 'activity',
                            'toCollection': 'activity',
                            'fromId': tempId,
                            'toId': activityId
                        }
                    });
                    return;
                }

                //  documents may be attachedTo activity or patient or something else, but they always refer to an
                //  activityId, hence need to update both properties

                var
                    nextDoc = toRelink.pop(),
                    putData = {
                        'activityId': activityId,
                        'attachedTo': ( ( nextDoc.attachedTo + '' === tempId ) ? activityId + '' : nextDoc.attachedTo + '' ),
                        'fields_': [ 'activityId', 'attachedTo' ],
                        'skipcheck_': true
                    },
                    dbPutSetup = {
                        'user': user,
                        'model': 'document',
                        'action': 'put',
                        'query': { '_id': nextDoc._id },
                        'data': putData,
                        'field': putData.fields_,
                        'options': { ignoreReadOnly: true }
                    };

                mediaId = nextDoc.mediaId || '';
                docType = nextDoc.type;

                Y.log(`Re-linking document to new activity ${nextDoc._id}: ${tempId} --> ${activityId}`, 'debug', NAME);
                Y.doccirrus.mongodb.runDb( dbPutSetup, onDocumentSaved );
            }

            function onDocumentSaved(err) {
                if (err) {
                    Y.log(`Could not relink document: ${JSON.stringify(err)}`, 'warn', NAME);
                    callback(err);
                    return;
                }

                //  Once the document has been saved we must unschedule any deletion for media it links
                //  This is to prevent media attached to unsaved activities from hanging around in the
                //  database unlinked

                if (!mediaId || '' === mediaId) {
                    relinkNext();
                    return;
                }

                var
                    putData = {
                        'deleteAfter': '',
                        'docType': docType,
                        'ownerId': activityId,
                        'fields_': ['deleteAfter', 'docType'],
                        'skipcheck_': true
                    },
                    dbPutSetup = {
                        'user': user,
                        'model': 'media',
                        'action': 'put',
                        'query': { '_id': mediaId },
                        'data': putData,
                        'field': putData.fields_,
                        'options': { ignoreReadOnly: true }
                    };

                Y.log(`Cancelling scheduled deleteion of media: ${mediaId}`, 'debug', NAME);
                Y.doccirrus.mongodb.runDb( dbPutSetup, onMediaUpdated);
            }

            function onMediaUpdated(err) {
                if (err) {
                    Y.log(`Could not update media ${mediaId}: ${JSON.stringify(err)}`, 'warn', NAME);
                    callback(err);
                    return;
                }
                relinkNext();
            }

        }

        /**
         *  Test / development route to run the 2.8 document+activities migration from the REST API
         *  @param args
         */

        function migrate28(args) {
            Y.log('Entering Y.doccirrus.api.document.migrate28', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.document.migrate28');
            }
            var reportAll = '';
            Y.doccirrus.documentMigration.setMediaIdsOnDocuments(args.user, onMediaIdsCopied);

            function onMediaIdsCopied(err, report) {
                if (err) {
                    args.callback(err);
                    return;
                }

                reportAll = `${'ADDING MEDIAIDS TO DOCUMENTS' + "\n\n"}${report}\n\n`;
                Y.doccirrus.documentMigration.setPdfIdsOnActivities(args.user, onFormPdfsCopied);
            }

            function onFormPdfsCopied(err, report) {
                if (err) {
                    args.callback(err);
                    return;
                }

                reportAll = `${reportAll}ADDING FORMPDFs TO ACTIVITIES` + `\n\n${report}\n\n`;
                args.callback(null, {'report': reportAll});
            }
        }

        /**
         *  Dev/support route to manually run deduplication of attachments in activities
         *
         *  @param  args    {Object}    REST context
         */

        function testDeduplicationMigration( args ) {
            Y.log('Entering Y.doccirrus.api.document.testDeduplicationMigration', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.document.testDeduplicationMigration');
            }
            Y.doccirrus.inCaseUtils.migrationhelper.checkDuplicateAttachments( args.user, false, args.callback );
        }

        /**
         *  Dev/support route to manually relink attachments incorrectly added by bug MOJ-6075
         *
         *  Add param '?confirm=true' to actually save
         *
         *  @param  args    {Object}    REST context
         */

        function testRelinkDuplicatedDocuments( args ) {
            Y.log('Entering Y.doccirrus.api.document.testRelinkDuplicatedDocuments', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.document.testRelinkDuplicatedDocuments');
            }
            var
                params = args.originalParams,
                isDry = true;

            if ( params && params.confirm ) {
                isDry = false;
            }

            Y.doccirrus.inCaseUtils.migrationhelper.relinkAttachments( args.user, false, isDry, args.callback );
        }

        /**
         *  Extract form fields from saved form state and write into activity content
         *
         *  The activity.userContent property will contain a template to be used
         *
         *  Additional functionality added as of MOJ-7040:
         *
         *      (*) allow backmappings from activity, eg: {activity.status}
         *      (*) allow boolean inclusion of strings, eg: {?mycheckbox:Embed this string} <-- embed if mycheckbox is checked
         *
         *  Overall process
         *
         *      1. Get the FORMDOC for this activity, if any
         *      2. Search the userContent for backmapping embeds / logical phrases
         *      3.  Parse individual phrases for operator, label, source of data
         *      4.  Look up any values referenced in the activity
         *      5.  Look up any values referenced in the form (note if changed)
         *      6.  Replace backmapping in userContent
         *      X.  Call back after replacing activity content
         *
         *  @param  user                    {Object}    REST user or equivalent
         *  @param  activity                {Object}    See activity-schema.common.js
         *  @param  activity.attachments    {Object}    Array of document _ids
         *  @param  activity.userContent    {String}    Template to be filled from form
         *  @param  callback                {Function}  Of the form fn( err )
         */

        function contentFromForm( user, activity, callback ) {
            var
                content = activity.backmappingTemplate || activity.userContent || '',
                formDoc,
                cleanEmptyLines = false,
                embeds = [];

            Y.log( 'Entering Y.doccirrus.api.activity.saveMedicationPlan', 'info', NAME );
            if( callback ) {
                callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.activity.saveMedicationPlan' );
            }

            //  if userContent does not refer to any form fields then we can skip this
            if ( -1 === content.indexOf( '{{' ) ) { return callback( null ); }

            async.series(
                [
                    loadFormDoc,
                    parseFormFieldTemplate,
                    processEmbeds,
                    lookupActivityFields,
                    lookupFormFields,
                    replaceEmbeds
                ],
                onAllDone
            );

            //  1.  Get the FORMDOC for this activity, if any
            function loadFormDoc( itcb ) {
                //  if no attachments then there is no form doc, and this step can be skipped
                if ( !activity.attachments || 0 === activity.attachments.length ) { return itcb( null ); }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'document',
                    'query': {
                        _id: { $in: activity.attachments },
                        type: 'FORM'
                    },
                    'callback': onDocsLoaded
                } );

                function onDocsLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    if ( !result || 0 === result.length ) { return itcb( null ); }

                    //  should never be more than one formDoc
                    formDoc = result[0];
                    itcb( null );
                }
            }

            //  2.  Search the userContent for backmapping embeds / logical phrases
            function parseFormFieldTemplate( itcb ) {

                var
                    text = activity.backmappingTemplate || activity.userContent || activity.content || '',
                    inField = false,
                    char, last = '', buf = '',
                    startPos = 0, endPos = 0,
                    i;

                text = text.replace( /{{\.\.\.(?: ?\((\d+)\) ?)?}}/g, '<!-- custom fold -->' );
                for ( i = 0; i < text.length; i++ ) {
                    char = text.substr( i, 1 );

                    if ( inField && '{' !== char && '}' !== char  ) {
                        buf = buf + char;
                    }

                    if ( !inField ) {
                        if ( '{' === char && '{' === last ) {
                            inField = true;
                            buf = '';
                            startPos = i;
                        }
                    } else {
                        if ( '}' === char && '}' === last ) {
                            inField = false;
                            endPos = i;
                            embeds.push( {
                                'phrase': `${buf}`,
                                'match': `${buf}`,
                                'value': '...',
                                'label': '',
                                'type': 'form',
                                'start': startPos,
                                'end': endPos,
                                'colon': buf.indexOf( ':' ),
                                'op': 'embed',
                                'changed': false
                            } );

                        }
                    }

                    last = char;
                }

                //  process these backwards to keep start and end pos correct
                //embeds.reverse();

                itcb( null );
            }

            //  3.  Parse individual phrases for operator, label, source of data
            function processEmbeds( itcb ) {
                var i;
                for ( i = 0; i < embeds.length; i++ ) {

                    if ( -1 !== embeds[i].colon ) {
                        embeds[i].label = embeds[i].match.substr( embeds[i].colon + 1 );
                        //embeds[i].label = embeds[i].label.replace( ':', '' );
                        embeds[i].match = embeds[i].match.substr(0, embeds[i].colon );
                    }

                    if ( '___' === embeds[i].match.substr( 0, 3 ) ) {
                        //  schedule cleanup of empty lines
                        embeds[i].value = '';
                        cleanEmptyLines = true;
                    }

                    if ( '?' === embeds[i].match.substr( 0, 1 ) ) {
                        embeds[i].op = 'if';
                        embeds[i].match = embeds[i].match.substr( 1 );
                    }

                    if ( '!' === embeds[i].match.substr( 0, 1 ) ) {
                        embeds[i].op = 'ifnot';
                        embeds[i].match = embeds[i].match.substr( 1 );
                    }

                    if ( 'activity.' === embeds[i].match.substr( 0, 9 ) ) {
                        embeds[i].type = 'activity';
                        embeds[i].match = embeds[i].match.substr( 9 );
                    }

                    if ( 'form.' === embeds[i].match.substr( 0, 5 ) ) {
                        embeds[i].type = 'form';
                        embeds[i].match = embeds[i].match.substr( 5 );
                    }
                }

                itcb( null );
            }

            //  4.  Look up any values referenced in the activity
            function lookupActivityFields( itcb ) {
                var i, j, tempArray, defaultValue;

                for ( i = 0; i < embeds.length; i++ ) {

                    if ( 'activity' === embeds[i].type ) {
                        embeds[i].value = activity[ embeds[i].match ] ? activity[ embeds[i].match ] : embeds[i].value;

                        //  translate common enums
                        switch( embeds[i].match ) {
                            case 'status':
                                embeds[i].value = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', embeds[i].value, 'i18n', '' );
                                break;

                            case 'actType':
                                embeds[i].value = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', embeds[i].value, 'i18n', 'k.A.' );
                                break;

                            case 'apkState':
                                embeds[i].value = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ApkState_E', embeds[i].value, 'i18n', 'k.A.' );
                                break;

                            //  MOJ-9291 Format backmapping for TREATMENT OPS values
                            case 'fk5025':                                                  //  deliberate fallthrough
                            case 'fk5026':                                                  //  deliberate fallthrough
                            case 'fk5034':                                                  //  deliberate fallthrough

                            //  MOJ-9623 Format backmapping for REFERRAL date values
                            //  EXTMOJ-2058 and for invoice billing date
                            case 'auBis':                                                   //  deliberate fallthrough
                            case 'datumOP':                                                 //  deliberate fallthrough
                            case 'invoiceBilledDate':                                       //  deliberate fallthrough
                                embeds[i].value = embeds[i].value ? moment( embeds[i].value ).format( 'DD.MM.YYYY' ) : '';
                                break;

                            case 'fk5035':      //  Collection of OP-Schlüssel values (refer to surgeries)
                            case 'fk5035Set':
                                tempArray = [];
                                embeds[i].value = '';
                                if ( activity.fk5035Set && activity.fk5035Set.length > 0 ) {
                                    for ( j = 0; j < activity.fk5035Set.length; j++ ) {
                                        tempArray.push(
                                            activity.fk5035Set[j].fk5035 +
                                            ( activity.fk5035Set[j].fk5041 ? ` ${activity.fk5035Set[j].fk5041}` : '' )
                                        );
                                    }
                                    if ( tempArray.length > 0 ) {
                                        embeds[i].value = tempArray.join( ', ' );
                                    }
                                }
                                break;

                            case 'fk5036':
                            case 'fk5036Set':
                                tempArray = [];
                                embeds[i].value = '';

                                if ( activity.fk5036Set && activity.fk5036Set.length > 0 ) {
                                    for ( j = 0; j < activity.fk5036Set.length; j++ ) {
                                        tempArray.push( activity.fk5036Set[j].fk5036 );
                                    }
                                    if ( tempArray.length > 0 ) {
                                        embeds[i].value = tempArray.join( ', ' );
                                    }
                                }

                                break;

                            case 'l_extra':
                            case 'labEntries':
                                embeds[i].value = Y.doccirrus.labdata.utils.makeFindingText( activity );
                                break;

                            case 'l_extra.labName':
                                if ( activity.l_extra && activity.l_extra.labName ) {
                                    embeds[i].value = activity.l_extra.labName;
                                }
                                break;

                            case 'l_extra.recordRequestId':
                                if ( activity.l_extra && activity.l_extra.recordRequestId ) {
                                    embeds[i].value = activity.l_extra.recordRequestId;
                                }
                                break;

                            case 'l_extra.findingKind':
                                if ( activity.l_extra && activity.l_extra.findingKind ) {
                                    switch( activity.l_extra.findingKind ) {
                                        case 'E': embeds[i].value = '[E] Endbefund';            break;
                                        case 'T': embeds[i].value = '[T] Teilbefund';           break;
                                        case 'V': embeds[i].value = '[V] Vorläufiger Befund';   break;
                                        case 'A': embeds[i].value = '[A] Archiv-Befund';        break;
                                        case 'N': embeds[i].value = '[N] Nachforderung';        break;
                                    }
                                }
                                break;

                            case 'editor.name':
                                if ( activity.editor && activity.editor[0] ) {
                                    embeds[i].value = activity.editor[0].name;
                                }
                                break;

                            case 'editor.initials':
                                if ( activity.editor && activity.editor[0] ) {
                                    embeds[i].value = activity.editor[0].initials;
                                }
                                break;

                            case 'examinations':
                                tempArray = [];
                                embeds[i].value = '';

                                for ( j = 0; j < activity.examinations.length; j++ ) {
                                    let exam = activity.examinations[j];
                                    if ( exam.stage && '' !== exam.stage ) {
                                        let
                                            fmtPFrom = moment( exam.plannedFrom ).format( 'DD.MM.YY' ),
                                            fmtPTo = moment( exam.plannedTo ).format( 'DD.MM.YY' ),
                                            fmtCompleted = exam.completed ? moment( exam.completed ).format( 'DD.MM.YY' ) : '';

                                        tempArray.push( `${exam.stage} ${fmtPFrom}-${fmtPTo} ${fmtCompleted}` );
                                    }
                                }

                                embeds[i].value = tempArray.join( '\n' );
                                break;

                            case 'reasonType':
                                defaultValue = Y.doccirrus.i18n( 'activity-schema.ScheinReasons_E.NO_REASON' );
                                embeds[i].value = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ScheinReasons_E', embeds[i].value, 'i18n', defaultValue );
                                break;

                            case 'scheinType':
                                embeds[i].value = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ScheinType_E', embeds[i].value, 'i18n', '' );
                                break;

                            case 'scheinSubgroup':
                                embeds[i].value = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ScheinSubgroup_E', embeds[i].value, 'i18n', '' );
                                break;
                            case 'dayOfAccident':
                                embeds[i].value = moment( embeds[i].value ).format( 'DD.MM.YYYY' );
                                break;
                        }

                    }
                }

                itcb( null );
            }

            //  5.  Look up any values referenced in the form (note if changed)
            function lookupFormFields( itcb ) {
                var
                    i, k;

                if ( !formDoc || !formDoc.formState ) {
                    Y.log( 'Could not find form state to fill userContent', 'debug', NAME );
                    return itcb( null );
                }

                for ( i = 0; i < embeds.length; i++ ) {
                    if ( 'form' === embeds[i].type ) {
                        //  get this form field from the FORMDOC
                        for ( k in formDoc.formState ) {
                            if ( formDoc.formState.hasOwnProperty( k ) ) {
                                //  default serialization
                                if ( k === embeds[i].match && !formDoc.formState.hasOwnProperty( `${k  }_plaintext` ) ) {
                                    embeds[i].value = formDoc.formState[k];
                                    //Y.log( 'New value of {{' + fieldName + '}} is ' + newValue, 'debug', NAME );
                                }
                                //  extra serialization for embedding as text
                                if ( `${embeds[i].match  }_plaintext` === k ) {
                                    embeds[i].value = formDoc.formState[k];
                                }

                                //  check if this value has changed
                                if ( k === embeds[i].match ) {
                                    embeds[i].changed = true;

                                    embeds[i].changed = ( 'false' === formDoc.formState[`${k  }_default`] );

                                    if ( formDoc.formInitialState && formDoc.formInitialState.hasOwnProperty( k ) ) {
                                        if ( 'string' === typeof formDoc.formInitialState[k] ) {
                                            if ( formDoc.formInitialState[k] !== formDoc.formState[k] ) {
                                                embeds[i].changed = true;
                                            }
                                        } else {
                                            if ( JSON.stringify( formDoc.formInitialState[k] ) !== JSON.stringify( formDoc.formState[k] ) ) {
                                                embeds[i].changed = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                itcb( null );
            }

            //  6.  Replace backmapping in userContent
            function replaceEmbeds( itcb ) {
                var allLines, cleanLines, i;

                for ( i = 0; i < embeds.length; i++ ) {

                    //  use label instead of value if one was given
                    if ( '' !== embeds[i].label ) {
                        embeds[i].value = embeds[i].label;
                    }

                    //  check if a form value has changed
                    if ( 'form' === embeds[i].type && 'if' === embeds[i].op ) {
                        //  clear this embed if form default was not changed
                        if ( !embeds[i].changed ) {
                            embeds[i].value = '';
                        }
                    }

                    //  check if a form value has changed
                    if ( 'form' === embeds[i].type && 'ifnot' === embeds[i].op ) {
                        //  clear this embed if form default was changed
                        if ( embeds[i].changed ) { embeds[i].value = ''; }
                    }

                    content = content.replace( `{{${embeds[i].phrase}}}`, embeds[i].value );
                }

                //  remove empty lines from content, MOJ-8968
                if ( cleanEmptyLines ) {
                    allLines = content.split( '\n' );
                    cleanLines = [];

                    for ( i = 0; i < allLines.length; i++ ) {
                        if ( '' !== allLines[i].trim() ) {
                            cleanLines.push( allLines[i] );
                        }
                    }

                    content = cleanLines.join( '\n' );
                }

                itcb( null );
            }

            //  X.  Call back after replacing activity content
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Could not expand activity content: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }
                //remove all folding markers except first one
                let regexp = /{{\.\.\.(?: ?\((\d+)\) ?)?}}/g,
                    match = regexp.exec( content );
                if( match && match.length > 1 ){
                    content = content.substring(0, match.index + 1) + content.substring(match.index + 1).replace( regexp, '');
                }

                activity.content = content;
                callback( null );
            }

        }

        /**
         *  Gets documents which belong to patient, and to which they have been given access.
         *
         *  @method patientDocument
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.query
         *  @param  {Function}  args.callback
         */

        async function patientDocument( args ) {
            Y.log( 'Entering Y.doccirrus.api.document.patientDocument', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.document.patientDocument' );
            }
            let
                err, data, filtered = [],
                user = args.user,
                query = args.query,
                callback = args.callback;

            if( !Object.keys( query ).length ) {
                query = args.data;
            }

            // if the 'pid' field is set then filter documents to those which can be accessed by this patient
            // (the pid field is set by the PatientPortal proxy)

            if( query.pid ) {
                Y.log( `Set patientId from REST auth (PatPortal): ${query.pid}`, 'info', NAME );
                query.patientId = query.pid;
            }

            if( args.data && 'true' === args.data.isFromPortal ) {
                await Y.doccirrus.utils.auditPPAction( user, {model: 'document', action: 'get', who: query.patientId} );
            }

            Y.log( `params passed to patientdocument: ${JSON.stringify( query )}`, 'debug', NAME );

            [err, data] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'document',
                    user,
                    query: {
                        $or: [
                            //  previous mechanism deprecated, but still allowed for external API consumers
                            {attachedTo: query.patientId},
                            //  new mechanism, created by migration in 3.12, see MOJ-9190
                            {patientId: query.patientId}
                        ]
                    },
                    options: {
                        lean: true
                    }
                } )
            );

            if( err ) {
                Y.log( `patientDocument. Error while getting documents for patient ${query.patientId} : ${err.stack || err}`, 'error', NAME );
                return callback( err, data );
            }

            if( !query.pid ) {
                return callback( null, data );
            }

            for( let doc of data ) {
                let
                    passChecks;

                Y.log( `Check document for patient: ${query.patientId}: ${JSON.stringify( doc )}`, 'debug', NAME );

                if( !doc.accessBy ) {
                    Y.log( `Document ${doc._id} missing accessBy field, adding...`, 'warn', NAME );
                    doc.accessBy = [];
                }
                if( !doc.contentType ) {
                    Y.log( `Document ${doc._id} missing contentType field.`, 'warn', NAME );
                }

                //  attachedTo is deprecated, patientId is set by migration due in 3.12, see MOJ-9190
                if( !doc.attachedTo && !doc.patientId ) {
                    Y.log( `Document ${doc._id} missing attachedTo or patientId field.`, 'warn', NAME );
                }

                Y.log( `Filtering document ${doc._id} ${JSON.stringify( doc.accessBy )}`, 'debug', NAME );

                //  go through the ACL to check if the patient has been given access to this by their doctor
                passChecks = doc.accessBy.some( patientId => patientId === query.patientId );
                if( passChecks ) {
                    //  if patient has been given access by their doctor
                    filtered.push( doc );
                } else if( !passChecks && 'FROMPATIENT' === doc.type ) {
                    //  if patient has supplied this document themselves
                    doc.accessBy.push( query.patientId );
                    filtered.push( doc );
                }
            }

            return callback( null, filtered );
        }

        /**
         * Gets media documents which belong to patient, redacted for external API.
         *  Patient should have access for these documents.
         * @method patientDocument
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback
         */
        function patientMediaDocuments( args ) {
            Y.log('Entering Y.doccirrus.api.document.patientMediaDocuments', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.document.patientMediaDocuments');
            }
            let
                user = args.user,
                query = args.query,
                callback = args.callback;
            if( !Object.keys( query ).length ) {
                query = args.data;
            }
            // if the 'pid' field is set then filter documents to those which can be accessed by this patient
            // (the pid field is set by the PatientPortal proxy)

            if( query.pid ) {
                Y.log( `Set patientId from REST auth (PatPortal): ${query.pid}`, 'info', NAME );
                query.patientId = query.pid;
            }

            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'document',
                user: user,
                query: {
                    contentType: { $ne: 'dc/form' },
                    $or: [
                        { attachedTo: query.patientId },    //  deprecated, see MOJ-9190
                        { patientId: query.patientId }      //  created by migration in 3.12
                    ]
                },
                options: {
                    lean: true
                }
            }, filterByACL );

            Y.log( `params passed to patientMediaDocuments: ${JSON.stringify( query )}`, 'debug', NAME );

            function filterByACL( err, data ) {
                let
                    filtered = [];
                if( err || !query.pid ) {
                    callback( err, data );
                    return;//
                }
                data.forEach( doc => {
                    let
                        passChecks;

                    Y.log( `Check document for patient: ${query.patientId}: ${JSON.stringify( doc )}`, 'debug', NAME );

                    if( !doc.accessBy ) {
                        Y.log( `Document ${doc._id} missing accessBy field, adding...`, 'warn', NAME );
                        doc.accessBy = [];
                    }
                    if( !doc.contentType ) {
                        Y.log( `Document ${doc._id} missing contentType field.`, 'warn', NAME );
                    }
                    if( !doc.attachedTo && !doc.patientId ) {
                        Y.log( `Document ${doc._id} missing attachedTo and patientId field.`, 'warn', NAME );
                    }

                    Y.log( `Filtering document ${doc._id} ${JSON.stringify( doc.accessBy )}`, 'debug', NAME );

                    //  go through the ACL to check if the patient has been given access to this bvy their doctor
                    passChecks = doc.accessBy.some( patientId => patientId === query.patientId );
                    if( passChecks ) {
                        doc = Y.doccirrus.schemas.document.redactForExternalAPI( doc );
                        filtered.push( doc );
                    }
                } );
                callback( null, filtered );
            }
        }


        /**
         * @method getByTag
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} args.callback
         */
        async function getByTag( args ) {
            Y.log( 'Entering Y.doccirrus.api.document.getByTag', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.document.getByTag' );
            }
            const
                {user, query = {}, options = {}, callback} = args,
                reportingDbActionP = promisifyArgsCallback( Y.doccirrus.api.reporting.reportingDBaction );

            let checkHidePdfSettings;
            if( query.patientNum ) {
                // MOJ-11976 hack to keep patientNo as default filter in documentKoTable
                query.patientNo = query.patientNo || query.patientNum;
                delete query.patientNum;
            }
            if( query.checkHidePdfSettings ) {
                checkHidePdfSettings = true;
                delete query.checkHidePdfSettings;
            }

            options.lean = true;
            query.documentId = {$exists: true};
            query.documentMediaId = {$exists: true};

            if( !query.documentContentType ) {
                query.documentContentType = {$exists: true};
            }

            options.select = {
                content: 1,
                documentType: 1,
                documentId: 1,
                documentTags: 1,
                documentCreatedOn: 1,
                documentCaption: 1,
                documentContentType: 1,
                lastname: 1,
                firstname: 1,
                kbvDob: 1,
                employeeLastname: 1,
                employeeFirstname: 1,
                employeeTitle: 1,
                employeeNameaffix: 1,
                actType: 1,
                locName: 1,
                activityId: 1,
                documentMediaId: 1,
                subType: 1,
                patientNo: 1
            };
            let [err, result] = await formatPromiseResult(
                reportingDbActionP( {
                    user,
                    action: 'get',
                    query,
                    options
                } )
            );

            if( err ) {
                Y.log( `getByTag. Error while executing reportingDbAction: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            if( checkHidePdfSettings && result && result.result && result.result[0] ) {
                await removeMediaIdFromDocuments( user, result.result, 'documentMediaId' );
            }
            return handleResult( null, result, callback );
        }

        /**
         *  Manually run migration to initialize patientId from accessBy field (dev / support access)
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Function}  args.callback   Of the form fn( err, status )
         */

        function setPatientIdOnDocuments( args ) {
            Y.log('Entering Y.doccirrus.api.document.setPatientIdOnDocuments', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.document.setPatientIdOnDocuments');
            }
            Y.doccirrus.inCaseUtils.migrationhelper.setPatientIdOnDocuments( args.user, false, onMigrationComplete );
            function onMigrationComplete( err ) {
                if ( err ) {
                    Y.log( `Problem migrating documents top set patientId: ${JSON.stringify( err )}`, 'warn', NAME );
                }
            }
            //  call back immediately
            args.callback( null, { 'status': 'Started migration of documents to set patientId' } );
        }

        /**
         * @method PUBLIC
         * @JsonRpcApi
         *
         * This method is dual intent method and is called from either UI as a JSONRPC call or called from the DELETE post process of an activity if it contains
         * an attachment. This method does below:
         *
         * 1] Based on the query, which is created to delete the correct document from the DB, it queries all the documents
         *    (we expect only 1 as they query is generally for _id)
         * 2] If documents are found then for each found document
         *      2a] Checks and unclaims if the document is contained by devicelog instead of deleting it from the DB so that the same document can be attached to
         *          other activity by the user later
         *      2b] If the document is not contained by the devicelog then hard deletes the document from the DB.
         *
         * If any document is unclaimed instead of deleting then this method returns an array of the documents mediaId's as well so that the calling functio/process
         * will be able to ignore mediaIds instead of deleting them from the DB so that the reassignment of document work and the media exists in the DB during that
         * operation.
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED:
         * @param {Object} args.query :REQUIRED:
         * @param {Object} args.options :OPTIONAL: will be present for JSONPRC call but for local calls can be absent
         * @param {String} args.model :OPTIONAL: If present or not should always be 'document'
         * @param {Boolean} args.shouldUpdateActivity :OPTIONAL: If present (will be only present for local calls and not for JSONRPC) then it means
         *                                                       update activity's 'attachment' and 'attachedMedia' keys as well if the attachment is found and unclaimed
         *                                                       from the devicelogs. The default value is true (which is true for JSONRPC call) and it should be set to false
         *                                                       if called from activity delete fsm
         * @param {Function} args.callback :OPTIONAL: Will be present for JSONRPC calls and for local calls will not be present
         * @param {Object} args.user :REQUIRED:
         *
         * @returns {Promise<[String]>} If successful resolves to mediaId's to ignore for the unclaimed documents. If callback is present then the results will
         *                              be passed via callback
         */
        async function DELETE( args ) {
            Y.log('Entering Y.doccirrus.api.document.DELETE', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.document.DELETE');
            }
            const
                {user, query, model = "document", shouldUpdateActivity = true, deleteFromPractice, callback} = args;

            let
                err,
                mediaIdsToIgnoreArr = [],
                result,
                documentsArr;

            // ------------------- 1. Query documents based on provided 'query' (mostly 1 expected) ---------------------------------
            [err, documentsArr] = await formatPromiseResult(
                                          Y.doccirrus.mongodb.runDb( {
                                              action: 'get',
                                              model: model,
                                              user: user,
                                              query: query
                                          } )
                                        );

            if(err) {
                Y.log(`DELETE: Error querying documents from DB for query: ${JSON.stringify(query)}. Error: ${err.stack || err}`, "error", NAME);

                if( callback ) {
                    return callback( Y.doccirrus.errors.rest('116000') );
                } else {
                    throw Y.doccirrus.errors.rest('116000');
                }
            }

            if( !documentsArr || !Array.isArray(documentsArr) || !documentsArr.length ) {
                // This could be because the document is already deleted (or if the query which user build did not match any document)
                Y.log(`DELETE: No document found for query: ${JSON.stringify(query)}`, "warn", NAME);

                if( callback ) {
                    return callback( Y.doccirrus.errors.rest('116002') );
                } else {
                    throw Y.doccirrus.errors.rest('116002');
                }
            }
            // ---------------------------------------------------- 1. END ----------------------------------------------------------


            // -- 2. For each attachment, try to unclaim the deviceLog (if it contains the attachment). If not attachment present there then delete the attachment ---
            for( let document of documentsArr ) {

                // ----------- 2a. If the attachment is contained by the devicelog then unclaim it --------------------------------------------
                [err, result] = await formatPromiseResult(
                                        Y.doccirrus.api.devicelog.unclaimDeviceLogEntry({
                                            user,
                                            data: {
                                                attachment: document._id.toString(),
                                                shouldUpdateActivity
                                            }
                                        })
                                      );

                if( err ) {
                    Y.log(`DELETE: Error in 'devicelog.unclaimDeviceLogEntry' for documentId: ${document._id.toString()}. Error: ${err.stack || err}. ErrorMessage: ${Y.doccirrus.errorTable.getMessage( {...err, locale: '-en'} )}`, "error", NAME);

                    if( callback ) {
                        return callback(err);
                    } else {
                        throw err;
                    }
                }
                // ------------------------------------------- 2a. END ---------------------------------------------------------------------


                // ------------------------ 2b. If the attachment is not contained by devicelog then DELETE it from the DB ------------------
                if( result === "NOT_FOUND" ) {
                    [err] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        action: 'delete',
                                        context: {
                                            deleteFromPP: args.data && args.data.deleteFromPP,
                                            deleteFromPractice: ( args.originalParams && args.originalParams.deleteFromPractice ) || deleteFromPractice
                                        },
                                        model: model,
                                        user: user,
                                        query: {_id: document._id.toString()}
                                    } )
                                  );

                    if( err ) {
                        Y.log(`DELETE: Error while deleting documentId: ${document._id.toString()} from DB. Error: ${err.stack || err}`, "error", NAME );

                        if( callback ) {
                            return callback( Y.doccirrus.errors.rest( '116001' ) );
                        } else {
                            throw Y.doccirrus.errors.rest( '116001' );
                        }
                    }

                    continue;
                }
                // ------------------------------------------------- 2b. END ---------------------------------------------------------------

                /**
                 * If the code has reached this point it means attachment was contained/referred by devicelog and it was unclaimed. In this case just keep
                 * accumulating the corresponding mediaId's of the unclaimed document so that the calling process will NOT DELETE those mediaId's
                 */
                mediaIdsToIgnoreArr = [...mediaIdsToIgnoreArr, ...result];
            }
            // -------------------------------------------------------- 2. END ---------------------------------------------------------------------------------

            if( callback ) {
                callback(null, mediaIdsToIgnoreArr);
            } else {
                return mediaIdsToIgnoreArr;
            }
        }

        async function updateDocument( args ) {

            const
                eventAction = 'updated';
            let
                {user, model, query, fields, data, options, callback} = args,
                err,
                patient,
                activity;

            //Check if the call is from patient-Document portal & if the patient has document access
            if( data && Object.keys( data ).length && data.isPatientDoc && data.accessBy && !data.accessBy.length ) {

                // Query Patient
                [err, patient] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'patient',
                        query: {_id: data.patientId},
                        options: {
                            lean: true,
                            limit: 1
                        }
                    } ) );

                if( err || !patient || !patient.length ) {
                    if( err ) {
                        Y.log( `updateDocument: Error occurred while querying patient: ${err.stack || err}`, 'error', NAME );
                        eventEmitter( { eventAction, msg: `Error: updateDocument: Error occurred while querying patient: ${err.stack || err}` } );
                    } else {
                        Y.log( `updateDocument: Patient with Id: ${data.patientId} is not found`, 'info', NAME );
                        eventEmitter( { eventAction, msg: `Error: updateDocument: Patient with Id: ${data.patientId} is not found` } );
                    }
                } else {

                    // Query the activity for actType, subType, caseFolderId, patientId and locationId
                    [err, activity] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'get',
                            model: 'activity',
                            query: {_id: data.activityId},
                            options: {
                                select: { actType: 1, subType: 1, caseFolderId: 1, locationId: 1, patientId: 1 },
                                lean: true,
                                limit: 1
                            }
                        } ) );

                    if( err || !activity || !activity.length ) {
                        if( err ) {
                            Y.log( `updateDocument: Error occurred while querying activity: ${err.stack || err}`, 'error', NAME );
                            eventEmitter( { eventAction, msg: `Error: updateDocument: Error occurred while querying activity: ${err.stack || err}` } );
                        } else {
                            Y.log( `updateDocument: Activity with Id: ${data.activityId} is not found`, 'info', NAME );
                            eventEmitter( { eventAction, msg: `Error: updateDocument: Activity with Id: ${data.activityId} is not found.` } );
                        }
                    } else {
                        data.actType = activity[0].actType;
                        data.subType = activity[0].subType || '';
                        data.caseFolderId = activity[0].caseFolderId;
                        data.locationId = `${activity[0].locationId}`;
                        data.patientId = `${activity[0].patientId}`;
                    }

                    //Check if the partnerId for sol-vivy is activated or not
                    let partner = patient[0].partnerIds.filter( partnerObj => {
                        return partnerObj.extra === 'VIVY';
                    } )[0];

                    if( partner && !partner.isDisabled ) {
                        Y.log( `updateDocument: partnerId is enabled, send event to vivy sol`, 'info', NAME );
                        eventEmitter( {eventAction, msg: {patient: patient[0], data}} );
                    } else {
                        Y.log( `updateDocument: VIVY is diabled`, 'info', NAME );
                        eventEmitter( {eventAction, msg: `Error: Vivy is disabled`} );
                    }
                }
            }

            Y.log( `updateDocument: Updating the document ${query._id} with data: ${JSON.stringify( data )}`, 'info', NAME );

            Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model,
                user,
                query,
                fields,
                options,
                context: {
                    updateFromPP: args.data && args.data.updateFromPP,
                    updateFromPractice: args.data && args.data.updateFromPractice
                },
                data: Y.doccirrus.filters.cleanDbObject( data )
            }, callback );

        }

        async function getDocuments( args ) {
            const
                {user, query, options, callback} = args;
            let checkHidePdfSettings;

            if( query.checkHidePdfSettings ) {
                delete query.checkHidePdfSettings;
                checkHidePdfSettings = true;
            }

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'document',
                    user,
                    query,
                    options
                } ) );
            if( err ) {
                Y.log(`getDocuments. Error while getting documents: ${err.stack || err}`, 'warn', NAME);
                return handleResult( err, undefined, callback );
            }
            if( checkHidePdfSettings && result && result.result && result.result[0] ) {
                await removeMediaIdFromDocuments( user, result.result, 'mediaId' );
            }
            return handleResult( null, result, callback );
        }

        /**
         *  Test/3LS route to re-run migration which sets actType and subType pn
         *  @param args
         */

        function addActTypeToAttachments( args ) {
            Y.doccirrus.inCaseUtils.migrationhelper.addActTypeToAttachments( args.user, false, args.callback );
        }

        function addAttachedMediaTags( args ) {
            Y.doccirrus.inCaseUtils.migrationhelper.addAttachedMediaTags( args.user, false, args.callback );
        }

        /**
         * @method PUBLIC
         * @JsonRpcApi
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED:
         * @param {Object} args.data :REQUIRED:
         * @param {Function} args.callback :OPTIONAL: Will be present for JSONRPC calls and for local calls will not be present
         *
         * @returns {Promise<[String]>} If successful resolves to an array with  created document id. If callback is present then the result will
         *                              be passed via callback
         */
        async function POST( args ) {
            Y.log( 'Entering Y.doccirrus.api.document.POST', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.document.POST' );
            }
            const
                {user, data, callback} = args;

            let
                err,
                result;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    model: 'document',
                    context: {
                        postFromPP: args.data && args.data.postFromPP
                    },
                    user: user,
                    data: Y.doccirrus.filters.cleanDbObject( data )
                } )
            );

            if( err ) {
                Y.log( `POST: Error creating document. Error: ${err.stack || err}`, "error", NAME );

                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '116003' ) );
                } else {
                    throw Y.doccirrus.errors.rest( '116003' );
                }
            }

            if( callback ) {
                callback( null, result );
            } else {
                return result;
            }
        }

        /**
         * Remove value of given field from document by checking each activity' per document
         * activitysettings 'hideLinksOfPrintedPDF' option
         *
         * @param {Object}  user          - user that trigger the action
         * @param {Array}   documents     - array of documents to process
         * @param {String}  fieldToRemove - name of field to remove (should be passed because it different in different collections)
         * @returns {Promise<void>}
         */
        async function removeMediaIdFromDocuments( user, documents, fieldToRemove ) {
            const
                loadActivitySettingsP = promisifyArgsCallback( Y.doccirrus.api.activitysettings.loadActivitySettings );

            let
                [err, activitySettings] = await formatPromiseResult( loadActivitySettingsP( {user} ) );
            if( err ) {
                Y.log( `removeMediaIdFromDocuments. Error while getting activitySettings: ${err.stack || err}`, 'warn', NAME );
                return;
            }
            if( !activitySettings || !activitySettings.settings ) {
                return;
            }

            for( let document of documents ) {
                if( document.activityId ) {
                    let [err, activity] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                action: 'get',
                                query: {_id: document.activityId},
                                options: {
                                    select: {
                                        formPdf: 1, actType: 1
                                    }
                                }
                            }
                        )
                    );
                    if( err ) {
                        Y.log( `removeMediaIdFromDocuments. Error while getting activity: ${err.stack || err}`, 'warn', NAME );
                        continue;
                    }
                    if( !activity || !activity[0] ) {
                        continue;
                    }
                    let currentActivitySettings = activitySettings.settings.find( setting => setting.actType === activity[0].actType );
                    if( currentActivitySettings && currentActivitySettings.hideLinksOfPrintedPDF && activity[0].formPdf ) {
                        Y.log( `removeMediaIdFromDocuments: delete ${fieldToRemove} field from ${document._id} document.`, 'debug', NAME );
                        if( fieldToRemove === 'documentMediaId' ) {
                            document.hideLinksOfPrintedPDF = true;
                        } else {
                            delete document[fieldToRemove];
                        }
                    }
                }
            }
            return;
        }

        Y.namespace( 'doccirrus' ).api.document = {
            get: function( args ) {
                Y.log('Entering Y.doccirrus.api.document.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.document.get');
                }
                getDocuments( args );
            },
            put: updateDocument,
            delete: DELETE,
            post: POST,
            setFormDocument,
            getSingleDocument,
            getOrCreateFormDocument,
            createDocumentFromForm,
            formDocToDict,
            updateFormDoc,
            updatePdfDoc,
            setPatientId,
            claimForActivityId,
            contentFromForm,
            createDocumentFromMedia,

            patientDocument,
            patientMediaDocuments,
            getByTag,

            //   test / re-run migrations
            migrate28,
            testDeduplicationMigration,
            testRelinkDuplicatedDocuments,
            setPatientIdOnDocuments,
            addActTypeToAttachments,
            addAttachedMediaTags
        };
    },
    '0.0.1', { requires: [
        'dcschemaloader',
        'document-schema',
        'incaseconfiguration-api',
        'labdata-finding-utils',
        'document-migrate-2-8',
        'devicelog-api'
    ]
    }
);
