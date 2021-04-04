/**
 *  Server-side analog of inCaseMojit/autoload/AttachmentsViewModel.client.js for mappers
 */

/*jslint anon:true, nomen:true*/
/*global YUI */
/*jshint latedef:false */



YUI.add( 'dcforms-attachmentsmodel', function( Y, NAME ) {

    const
        async = require('async'),
        MAX_CAPTION_LENGTH = Y.doccirrus.schemas.document.MAX_CAPTION_LENGTH;           //  MOJ-13525

    if (!Y.dcforms) { Y.dcforms = {}; }

    Y.dcforms.AttachmentsModel = function() {

            var
                self = {
                    'documents': [],

                    'loadFromActivity': loadFromActivity,
                    'updateActivity': updateActivity,
                    'saveAll': saveAll,
                    'findDocument': findDocument,
                    'getOrCreateFormDocument': getOrCreateFormDocument,
                    'createFromForm': createFromForm,
                    'createFromMedia': createFromMedia,
                    'updateFormDoc': updateFormDoc,
                    'updatePdfDoc': updatePdfDoc,
                    'getMediaDocs': getMediaDocs
                };

            /**
             *  Get complete documents referred to as attachments of an activity
             *  @param  user            {Object}    REST user or equivalent
             *  @param  currentActivity {Object}    Should have attachements property
             *  @param  callback        {Function}  Of the form fn(err)
             */

            function loadFromActivity( user, currentActivity, callback ) {

                var plainIds = currentActivity.attachments;

                async.eachSeries(plainIds || [], loadSingleDocument, callback);

                function loadSingleDocument( docId, itcb ) {
                    var
                        dbSetup = {
                            'user': user,
                            'model': 'document',
                            'action': 'get',
                            'query': { '_id': docId + '' }
                        };

                    Y.log('Loading attached document: ' + docId, 'debug', NAME);
                    Y.doccirrus.mongodb.runDb( dbSetup, onDocumentLoaded );

                    function onDocumentLoaded(err, result) {
                        if (err) {
                            Y.log('Could not load document ' + docId + ': ' + JSON.stringify(err), 'warn', NAME);
                            itcb( err );
                            return;
                        }

                        if ( !result || !result.length ) {
                            Y.log( `loadFromActivity: Could not load document ${docId}`, 'warn', NAME );
                        } else {
                            Y.log('Loaded attached document: ' + docId, 'debug', NAME);
                            self.documents.push( result[0] );
                        }
                        itcb( null );
                    }
                }

            }

            /**
             *  Save all documents back to the server
             *  @return {Promise}
             */

            function saveAll( ) {
                Y.log('AttachmentsModel.saveAll() Unimplemented on server', 'warn', NAME);
            }

            /**
             *
             *  @param currentActivity
             */

            function updateActivity( currentActivity ) {
                currentActivity.attachments = [];

                self.documents.forEach(function(doc){
                    currentActivity.attachments.push( doc._id + '' );
                });

                return currentActivity;
            }

            /**
             *  Select a single document from a set of documents according to an identifier
             *
             *  @param identifier   {String}    A string to find (mediaId, type or _hasFormData)
             */

            function findDocument( identifier ) {
                var
                    foundDoc = null;

                if( !self.documents || 0 === self.documents.length ) {
                    return foundDoc;
                }

                self.documents.forEach( function( doc ) {
                    var mediaId;

                    if( (doc._id + '') === identifier ) {
                        foundDoc = doc;
                    }

                    if( 'FORM' === identifier && 'FORM' === doc.type ) {
                        foundDoc = doc;
                    }

                    if( 'SUMEXPDF' === identifier && 'SUMEXPDF' === doc.type ) {
                        foundDoc = doc;
                    }

                    if( 'FORMPDF' === identifier && 'FORMPDF' === doc.type ) {
                        foundDoc = doc;
                    }

                    if( 'MEDICATIONPLAN' === identifier && 'MEDICATIONPLAN' === doc.type ) {
                        foundDoc = doc;
                    }

                    if(
                        ( '_hasFormData' === identifier ) &&
                        ( doc.formData ) &&
                        ( doc.type ) &&
                        ( doc.formData ) &&
                        ( '' !== doc.formData ) &&
                        ( 'FORMPDF' !== doc.type )
                    ) {
                        foundDoc = doc;
                    }

                    if(
                        ( '_hasFormData' === identifier ) &&
                        ( doc.formState ) &&
                        ( doc.type ) &&
                        ( doc.formState ) &&
                        ( '' !== doc.formState ) &&
                        ( 'FORMPDF' !== doc.type )
                    ) {
                        foundDoc = doc;
                    }

                    if( doc.url ) {
                        mediaId = /id=([a-fA-F\d]+)/.exec( doc.url ? doc.url : '' ); // extract the mediaId
                        mediaId = (mediaId) ? mediaId[ 1 ] : mediaId;

                        if( mediaId === identifier ) {
                            foundDoc = doc;
                        }
                    }

                } );

                return foundDoc;
            }

            /**
             *  Returns a form document, creating one from the provided form if none yet exist
             *
             *  @param  context     {Object}    A form mapper's context object
             *  @param  template    {Object}    A dcforms-template object
             *  @param  callback    {Function}  Of the form fn(err, formDoc, needsremap)
             */

            function getOrCreateFormDocument(context, template, callback) {
                var
                    formDoc = self.findDocument( '_hasFormData'),
                    needsremap = false,
                    needsremaplinked = false;

                if ( formDoc ) {
                    //  a saved form state already exists
                    needsremap = ('remap' === formDoc.formData );
                    needsremaplinked = ('remaplinked' === formDoc.formData );

                    if ( 'placeholder' === formDoc.formData ) {
                        needsremap = true;
                        needsremaplinked = true;
                    }

                    if ( 'bake' === formDoc.formData ) {
                        needsremap = true;
                        needsremaplinked = true;
                    }

                    callback(null, formDoc, needsremap, needsremaplinked);
                    return;
                }

                //  a saved form state does not exist, make one from the current form
                self.createFromForm(context, template, callback);
            }

            /**
             *  Saves the template's state to a new form document
             *
             *  TODO: tidy with async.js
             *
             *  @param  context     {Object}    A form mapper's context object
             *  @param  template    {Object}    A dcforms-template object
             *  @param  callback    {Function}  Of the form fn(err, formDoc, needsremap)
             */

            function createFromForm(context, template, callback) {
                Y.log( 'Creating document from form: ' + template.formId, 'info', NAME );
                Y.log( 'Serializing template into form document.', 'debug', NAME );

                var
                    activity = context.activity,

                    formState = template.toDict(),
                    formStateHash = Y.dcforms.fastHash( JSON.stringify( formState ) ),

                    newDoc = {
                        type: (('QUESTIONNAIRE' === activity.actType ) ? 'QUESTIONNAIRE' : 'FORM'),
                        contentType: (('QUESTIONNAIRE' === activity.actType ) ? 'dc/questionnaire' : 'dc/form'),
                        formId: (template.canonicalId + ''),
                        formInstanceId: (template.formVersionId + ''),
                        formData: '',
                        formState: formState,
                        formInitialState: formState,
                        formStateHash: formStateHash,
                        publisher: (Y.doccirrus.comctl.fullNameOfUser + ''), //Y.doccirrus.utils.loggedInUser,
                        activityId: (activity._id + ''),
                        printerName: '',
                        locationId: (activity.locationId + ''),
                        createdOn: (new Date()).toJSON(),
                        accessBy: [],
                        attachedTo: (activity.patientId + ''),
                        caption: (activity.content || activity.userContent || ''),
                        isEditable: ('QUESTIONNAIRE' === activity.actType )
                    };

                if ( newDoc.caption && ( newDoc.caption.length > MAX_CAPTION_LENGTH ) ) {
                    newDoc.caption = newDoc.caption.substr( 0, MAX_CAPTION_LENGTH ) + '...';
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
                        Y.log('Setting printer configured at this locale: ' + printerName, 'debug', NAME);
                        newDoc.printerName = printerName;
                    }

                    dbSetup.data = Y.doccirrus.filters.cleanDbObject( newDoc );

                    Y.log('Serialized template into form document.', 'debug', NAME);
                    Y.doccirrus.mongodb.runDb( dbSetup, onDocumentSaved );
                }

                // changes / additions are autosaved on server, on client are tied to FSM
                function onDocumentSaved(err, result) {
                    Y.log('DB post operation completed.', 'debug', NAME);
                    if (err) {
                        Y.log('Could not create new FORM document: ' + JSON.stringify(err), 'warn', NAME );
                        callback(err);
                        return;
                    }

                    if (!result || result.length === 0 ) {
                        callback(new Error('No _id returned for new document, data is: ' + JSON.stringify(result)));
                        return;
                    }

                    newDoc._id = result[0];
                    Y.log('onSaveSuccess, new document: ' + newDoc._id, 'debug', NAME);

                    //  Update the document list of the activity which owns this document

                    activity.attachments.push( newDoc._id + '' );
                    self.documents.push( newDoc );

                    var
                        plainAttachments = [],
                        activityFields = [ 'attachments', 'userContent', 'formId', 'formVersion' ],
                        activityData = {
                            'attachments': plainAttachments,
                            'formId': context.activity.formId,              //  may be changed for BFB licence reasons
                            'formVersion': context.activity.formVersion,    //  may not have been initialized
                            'userContent': context.activity.userContent,    //  may have been set from form name
                            'fields_': activityFields,
                            'skipcheck_': true
                        },
                        rCache = context && context.rCache ? context.rCache : {},
                        skipTriggerRules = rCache._skipTriggerRules ? true : false,
                        skipTriggerSecondary = rCache._skipTriggerSecondary ? true : false,
                        i;

                    for (i = 0; i < self.documents.length; i++) {
                        if (-1 === plainAttachments.indexOf( self.documents[i]._id )) {
                            plainAttachments.push( self.documents[i]._id );
                        }
                    }

                    Y.log('saving attachments back to activity ' + context.activity._id + ': ' + JSON.stringify(plainAttachments), 'debug', NAME);

                    //  at this point new activities on the server may inherit a subtype from the form, MOJ-11101

                    if ( template.shortName && '' !== template.shortName && !context.activity.subType ) {
                        activityFields.push( 'subType' );
                        activityData.subType = template.shortName;
                    }

                    //  save it to the database

                    Y.doccirrus.mongodb.runDb( {
                        'user': template.user,
                        'model': 'activity',
                        'action': 'put',
                        'query': { '_id': context.activity._id },
                        'field': activityFields,
                        'data': activityData,
                        'options': {
                            ignoreReadOnly: ['attachments']
                        },
                        'context': {
                            //  to be used when generating activity.content in post-process for prescription types
                            '_activitiesObj': context.activity._activitiesObj,
                            //  TODO: some way to control this from the caller
                            _skipTriggerRules: skipTriggerRules,
                            _skipTriggerSecondary: skipTriggerSecondary
                        }
                    }, onActivitySaved );
                }

                function onActivitySaved(err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    callback( null, newDoc, true, true );
                }

            }

        /**
         *  Replace the saved form state with the current state of the passed template
         *
         *  @param context
         *  @param template
         *  @param callback
         */

        function updateFormDoc(context, template, callback) {
            var
                formDoc = self.findDocument( '_hasFormData' ),
                dictString,
                putData,
                putFields;

            function onCreatedNewDocument(err) {

                if (err) {
                    Y.log('Could not create new FORM type document: ' + JSON.stringify(err), 'warn', NAME);
                    callback(err);
                    return;
                }

                Y.log('Created new form document, saving state of form into it.', 'debug', NAME);
                self.updateFormDoc(context, template, callback);
            }

            if (formDoc && formDoc.formId && formDoc.formId !== template.canonicalId) {
                formDoc.formData = 'remap';
                formDoc.formState = { 'remap': true };
                formDoc.formStateHash = -1;
                formDoc.mapData = {};
                formDoc.usesMedia = [];
                formDoc.formId = template.canonicalId;
                formDoc.formInstanceId = template.formVersionId;
            }

            if (!formDoc) {
                Y.log('Could not find form document: creating', 'info', NAME);
                //callback(new Error('Could not find form document, activity may still be loading.'));

                formDoc = self.createFromForm(context, template, onCreatedNewDocument);
                return;
            }

            //formDoc.formData(Y.doccirrus.comctl.UTF8ToB64(JSON.stringify(template.toDict())));

            dictString = JSON.stringify( template.toDict() );

            formDoc.formData = '';
            formDoc.formState = JSON.parse( dictString ) ;
            formDoc.mapData = JSON.parse( JSON.stringify( template.mapData ) );
            formDoc.usesMedia = template.getReferencedMedia();

            formDoc.formStateHash = Y.dcforms.fastHash( dictString );

            if (!formDoc.printerName) {
                formDoc.printerName = '';
            }

            //Y.log('saving formDoc to database ' + context.activity._id + ': ' + JSON.stringify(formDoc.formState), 'debug', NAME);

            putFields = [ 'formData', 'formState', 'formStateHash', 'mapData', 'formInitialState', 'usesMedia', 'printerName' ];

            putData = {
                'formData': formDoc.formData,
                'formState': formDoc.formState,
                'mapData': formDoc.mapData,
                'usesMedia': formDoc.usesMedia,
                'printerName': formDoc.printerName,
                'formInitialState': formDoc.formInitialState || {},
                'formStateHash': formDoc.formStateHash,
                'fields_': putFields,
                'skipcheck_': true
            };

            if ( template.useReporting ) {
                putData.reportingData = template.getReportingData();
                putFields.push( 'reportingData' );
            }

            Y.doccirrus.mongodb.runDb( {
                'user': template.user,
                'model': 'document',
                'action': 'put',
                'query': { '_id': formDoc._id + '' },
                'field': putFields,
                'data': putData,
                'options': {
                    ignoreReadOnly: putFields
                }
            }, callback );

            //callback(null);
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
            var
                formPdf = self.findDocument( 'FORMPDF' );

            Y.log('updatePdfDoc with mediaId ' + mediaId + ' has extant ' + (formPdf ? 'TRUE' : 'FALSE'), 'info', NAME);

            function onActivityFormPdfUpdated(err) {
                callback(err, formPdf);
            }

            function onPdfDocumentSaved(err) {
                //  activity will need to be updated with new link to mediaId

                if (err) {
                    callback(err);
                    return;
                }

                var
                    //  if set then caller will fire these post-processes when overall operation is complete
                    skipTriggerRules = ( template._skipTriggerRules ? true : false ),
                    skipTriggerSecondary = ( template._skipTriggerSecondary ? true : false ),
                    putData = {
                        'fields_': [ 'formPdf' ],
                        'formPdf': mediaId
                    };

                putData = Y.doccirrus.filters.cleanDbObject( putData );

                Y.doccirrus.mongodb.runDb( {
                    'user': template.user,
                    'model': 'activity',
                    'query': { '_id': (activity._id + '')},
                    'action': 'put',
                    'data': putData,
                    'context': {
                        _skipTriggerRules: skipTriggerRules,
                        _skipTriggerSecondary: skipTriggerSecondary
                    },
                    'options': {
                        ignoreReadOnly: [ 'formPdf' ]
                    }
                }, onActivityFormPdfUpdated );

            }

            function onPdfDocumentCreated(err, newDoc) {
                if (newDoc) {
                    formPdf = newDoc;
                }
                onPdfDocumentSaved(err);
            }

            if (!formPdf) {
                Y.log( 'Could not find form PDF document, creating a new one to hold media: ' + mediaId, 'info', NAME );
                // the following recursion was duplicating records in the document collection.
                self.createFromMedia(activity, template, mediaId, onPdfDocumentCreated);
                return;
            }

            var
                putFields = [
                    'type', 'contentType', 'formId', 'formInstanceId', 'publisher', 'activityId', 'printerName',
                    'locationId', 'mediaId', 'formData', 'formState', 'createdOn', 'caption', 'url', 'attachedTo',
                    'usesMedia', 'formStateHash'
                ],

                formState = template.toDict(),
                formStateHash = Y.dcforms.fastHash( JSON.stringify( formState ) ),

                newDoc = {
                    type: 'FORMPDF',
                    contentType: 'application/pdf',
                    formId: (template.canonicalId + ''),
                    formInstanceId: (template.formVersionId + ''),
                    publisher: (Y.doccirrus.comctl.fullNameOfUser + ''), //Y.doccirrus.utils.loggedInUser,
                    activityId: (activity._id + ''),
                    attachedTo: (activity.patientId +''),
                    printerName: '',
                    locationId: (activity.locationId + ''),
                    mediaId: mediaId,
                    formData: '',
                    formState: formState,
                    formStateHash: formStateHash,
                    createdOn: (new Date()).toJSON(),
                    caption: (activity.content || activity.userContent) + '',
                    url: '/media/' + mediaId + '_original.',
                    fields_: putFields
                    //  do not change share status
                    //  accessBy: [(activity.patientId + '')],
                };

            if ( newDoc.caption && ( newDoc.caption.length > MAX_CAPTION_LENGTH ) ) {
                newDoc.caption = newDoc.caption.substr( 0, MAX_CAPTION_LENGTH ) + '...';
            }

            //  MOJ-5844 Check that activity is approved (post-process with update attachedTo after approval)
            if ( 'APPROVED' !== activity.status ) {
                Y.log( 'Activity is not approved, not sharing with patient: ' + activity.patientId, 'debug', NAME );
                newDoc.attachedTo = activity._id + '';
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
                    Y.log('Setting printer configured at this location: ' + printerName, 'debug', NAME);
                    newDoc.printerName = printerName;
                }

                dbSetup.data = Y.doccirrus.filters.cleanDbObject( newDoc);

                Y.log('Updating form PDF with server-side details.', 'debug', NAME);
                Y.doccirrus.mongodb.runDb( dbSetup, onPdfDocumentSaved );
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

        function createFromMedia( activity, template, mediaId, callback ) {
            Y.log( 'Creating document from media item: ' + mediaId, 'info', NAME );

            // changes / additions are autosaved on server, on client are tied to FSM
            function onPdfDocumentSaved(err, result) {
                Y.log('DB post operation completed.', 'debug', NAME);
                if (err) {
                    Y.log('Could not create new FORMPDF document: ' + JSON.stringify(err), 'warn', NAME );
                    callback(err);
                    return;
                }

                if (!result || result.length === 0 ) {
                    callback(new Error('No _id returned for new document, data is: ' + JSON.stringify(result)));
                    return;
                }

                newDoc._id = result[0];
                activity.attachments.push(newDoc);
                Y.log('onSaveSuccess, new FORMPDF document: ' + newDoc._id, 'debug', NAME);

                //  link new PDF document from activity which owns it, remove duplicates
                //  next refactor: would be tidier to separate this out and call from the form Doc method as well

                var
                    //  if set then caller will fire these post-processes when overall operation is complete
                    skipTriggerRules = ( template._skipTriggerRules ? true : false ),
                    skipTriggerSecondary = ( template._skipTriggerSecondary ? true : false ),

                    cleanAttachments = [],
                    putData,
                    i;

                for (i = 0; i < activity.attachments.length; i++) {
                    if ('object' === (typeof activity.attachments[i]) && activity.attachments[i] && activity.attachments[i]._id) {
                        if (-1 === cleanAttachments.indexOf(activity.attachments[i]._id + '')) {
                            cleanAttachments.push(activity.attachments[i]._id + '');
                        }
                    } else {
                        if (-1 === cleanAttachments.indexOf(activity.attachments[i] + '')) {
                            cleanAttachments.push(activity.attachments[i] + '');
                        }
                    }
                }

                Y.log('New clean attachment set for activity: ' + JSON.stringify(cleanAttachments), 'debug', NAME);

                putData = Y.doccirrus.filters.cleanDbObject({ 'attachments': cleanAttachments, 'fields_': ['attachments'] });

                Y.doccirrus.mongodb.runDb( {
                    'user': template.user,
                    'model': 'activity',
                    'query': { '_id': (activity._id + '')},
                    'action': 'put',
                    'data': putData,
                    'context': {
                        _skipTriggerRules: skipTriggerRules,
                        _skipTriggerSecondary: skipTriggerSecondary
                    },
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
                    type: 'FORMPDF',
                    contentType: 'application/pdf',
                    formId: (template.canonicalId + ''),
                    formInstanceId: (template.formVersionId + ''),
                    publisher: (Y.doccirrus.comctl.fullNameOfUser + ''), //Y.doccirrus.utils.loggedInUser,
                    activityId: (activity._id + ''),
                    printerName: '',
                    locationId: (activity.locationId + ''),
                    mediaId: mediaId,
                    accessBy: [],
                    attachedTo: (patId + ''),
                    formData: '',
                    formState: { 'neverSaved': true },
                    createdOn: (new Date()).toJSON(),
                    caption: (activity.content + ''),
                    isEditable: false,
                    url: '/media/' + mediaId + '_original'
                };

            if ( newDoc.caption && ( newDoc.caption.length > MAX_CAPTION_LENGTH ) ) {
                newDoc.caption = newDoc.caption.substr( 0, MAX_CAPTION_LENGTH ) + '...';
            }

            //  MOJ-5844 - only documents belonging to approved activities can be shared with patients
            if ( 'APPROVED' !== activity.status ) {
                newDoc.attachedTo = activity._id + '';
            }

            //  copy the form state at time of PDF creation
            if ( template ) {
                try {
                    newDoc.formState = JSON.parse( JSON.stringify( template.toDict() ) );
                } catch ( parseErr ) {
                    Y.log( `Problem serializing form template: ${parseErr.stack||parseErr}`, 'warn', NAME );
                    //  continue anyway, best effort
                }
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
                    Y.log('Setting printer configured at this locale: ' + printerName, 'debug', NAME);
                    newDoc.printerName = printerName;
                }

                dbSetup.data = Y.doccirrus.filters.cleanDbObject( newDoc);

                Y.log('Linked PDF from form document.', 'debug', NAME);
                Y.doccirrus.mongodb.runDb( dbSetup, onPdfDocumentSaved );
            }
        }

        /**
         *  Returns the set of media attachments for ext dokument table
         */

        function getMediaDocs() {
            Y.log('Not implemented on server AttachmentsModel.getMediaDocs', 'warn', NAME);
        } // getMediaDocs

        return self;
    };

    },
    '0.0.1',
    {
        requires: []
    }
);