/*
 @author: strix
 @date: 2015 February
 */

/**
 * Library of Queueing functions specifically for separate calendar queues for doctors.
 *
 * Used by the scheduling library.
 *
 * Uses the YUI namespace.
 */
//TRANSLATION INCOMPLETE!! MOJ-3201
/*global YUI, ko */
/*jslint latedef:false */

'use strict';

YUI.add( 'document-api', function( Y, NAME ) {

        var MAX_CAPTION_LENGTH = Y.doccirrus.schemas.document.MAX_CAPTION_LENGTH;           //  MOJ-13525

        /**
         *  Select a single document from a set of documents according to an identifier
         *
         *  @param documents    {Object}    Observable array of documents
         *  @param identifier   {String}    A string to find (mediaId, type or _hasFormData)
         */

        function selectDocument(documents, identifier) {
            var
                plainDocs = ko.unwrap( documents ),
                foundDoc = null;

            if( !plainDocs || 0 === plainDocs.length ) {
                return foundDoc;
            }

            plainDocs.forEach( function( doc ) {

                var mediaId;

                if( doc._id === identifier ) {
                    foundDoc = doc;
                }

                if( 'FORM' === identifier && 'FORM' === ko.unwrap( doc.type ) ) {
                    foundDoc = doc;
                }

                if( 'FORMPDF' === identifier && 'FORMPDF' === ko.unwrap( doc.type ) ) {
                    foundDoc = doc;
                }

                if(
                    ('_hasFormData' === identifier) &&
                    (doc.formData) &&
                    (doc.type) &&
                    (ko.unwrap( doc.formData )) &&
                    (('' !== ko.unwrap( doc.formData ))) &&
                    (('FORMPDF' !== ko.unwrap( doc.type )))
                ) {
                    foundDoc = doc;
                }

                if(
                    ('_hasFormData' === identifier) &&
                    (doc.formState) &&
                    (doc.type) &&
                    (ko.unwrap( doc.formState )) &&
                    (('' !== ko.unwrap( doc.formState ))) &&
                    (('FORMPDF' !== ko.unwrap( doc.type )))
                ) {
                    foundDoc = doc;
                }

                if( doc.url && ko.unwrap( doc.url ) ) {
                    mediaId = /id=([a-fA-F\d]+)/.exec( doc.url ? ko.unwrap( doc.url ) : '' ); // extract the mediaId
                    mediaId = (mediaId) ? mediaId[ 1 ] : mediaId;

                    if( mediaId === identifier ) {
                        foundDoc = doc;
                    }
                }

            } );

            if( 'function' === typeof foundDoc ){
                foundDoc = ko.unwrap( foundDoc );
            }

            return foundDoc;

        }

        /**
         *  Create a document viewmodel of type FORM
         *
         *  @param context      {Object}    Made up of activity, patient and documents (expanded attachments)
         *  @param template     {Object}    A dcforms-template object
         *  @param callback     {Function}  Of the form fn(err, doc)
         */

        function createDocumentFromForm( context, template, callback ) {
            Y.log( 'Creating document from form: ' + template.formId, 'info', NAME );

            if( context && context.activity && ko.unwrap( context.activity.name )){
                createKoDocumentFromForm( context, template, callback );
                return;
            }

            var
                newDoc = new Y.doccirrus.uam.DocumentModel( {
                    type: (('QUESTIONNAIRE' === ko.unwrap( context.activity.actType )) ? 'QUESTIONNAIRE' : 'FORM'),
                    contentType: (('QUESTIONNAIRE' === ko.unwrap( context.activity.actType )) ? 'dc/questionnaire' : 'dc/form'),
                    formId: template.canonicalId,
                    formInstanceId: template.formVersionId,
                    formData: '',
                    formState: template.toDict(),
                    publisher: Y.doccirrus.comctl.fullNameOfUser, //Y.doccirrus.utils.loggedInUser,
                    activityId: context.activity._id,
                    printerName: '',
                    locationId: ko.unwrap( context.activity.locationId ),
                    caseFolderId: ko.unwrap( context.activity.caseFolderId ),
                    actType: ko.unwrap( context.activity.actType ) || '',
                    subType: ko.unwrap( context.activity.subType ) || '',
                    createdOn: (new Date()).toJSON(),
                    accessBy: [],
                    attachedTo: context.patient._id,
                    caption: ko.unwrap( context.activity.content ),
                    isEditable: ('QUESTIONNAIRE' === ko.unwrap( context.activity.actType ))
                } );

            if ( newDoc.caption && ( newDoc.caption.length > MAX_CAPTION_LENGTH ) ) {
                newDoc.caption = newDoc.caption.substr( 0, MAX_CAPTION_LENGTH ) + '...';
            }

            //  look up any confiured printer for this form, user and location

            Y.doccirrus.comctl.privateGet(
                '/1/formprinter/:getprinter',
                {
                    'canonicalId': template.canonicalId,
                    'locationId': ko.unwrap( context.activity.locationId )
                },
                onPrinterLookup
            );

            function onPrinterLookup(err, response) {
                if (err) {
                    Y.log('Error looking up printer assignment: ' + JSON.stringify(err), 'warn', NAME);
                } else {

                    response = response && response.data ? response.data : response;
                    if (response && '' !== response) {
                        Y.log('Assigning configured printer: ' + JSON.stringify(response), 'debug', NAME);
                        newDoc.printerName = response;
                    }

                }

                callback( null, newDoc );
            }

        }

        /**
         *  Addition to the document API to use new KOViewModels consistent with InCaseMojit
         */

        function createKoDocumentFromForm(context, template, callback) {

            var
                KoViewModel = Y.doccirrus.KoViewModel,

                newDocPlain = {
                    type: (('QUESTIONNAIRE' === ko.unwrap( context.activity.actType )) ? 'QUESTIONNAIRE' : 'FORM'),
                    contentType: (('QUESTIONNAIRE' === ko.unwrap( context.activity.actType )) ? 'dc/questionnaire' : 'dc/form'),
                    formId: template.canonicalId,
                    formInstanceId: template.formVersionId,
                    formData: '',
                    formState: template.toDict(),
                    publisher: Y.doccirrus.comctl.fullNameOfUser, //Y.doccirrus.utils.loggedInUser,
                    activityId: context.activity._id,
                    printerName: '',
                    locationId: ko.unwrap( context.activity.locationId ),
                    caseFolderId: ko.unwrap( context.activity.caseFolderId ),
                    actType: ko.unwrap( context.activity.actType ) || '',
                    subType: ko.unwrap( context.activity.subType ) || '',
                    createdOn: ( new Date() ).toJSON(),
                    accessBy: [],
                    attachedTo: context.patient._id,
                    caption: ko.unwrap( context.activity.content ),
                    isEditable: ('QUESTIONNAIRE' === ko.unwrap( context.activity.actType ))
                },

                newDoc;

            if ( newDocPlain.caption && ( newDocPlain.caption.length > MAX_CAPTION_LENGTH ) ) {
                newDocPlain.caption = newDocPlain.caption.substr( 0, MAX_CAPTION_LENGTH ) + '...';
            }

            newDoc = new KoViewModel.createViewModel( {
                NAME: 'DocumentModel',
                config: { data: newDocPlain }
            } );

            //  look up any confiured printer for this form, user and location

            Y.doccirrus.comctl.privateGet(
                '/1/formprinter/:getprinter',
                {
                    'canonicalId': template.canonicalId,
                    'locationId': ko.unwrap( context.activity.locationId )
                },
                onPrinterLookup
            );

            function onPrinterLookup(err, response) {
                if (err) {
                    Y.log('Error looking up printer assignment: ' + JSON.stringify(err), 'warn', NAME);
                } else {

                    response = response && response.data ? response.data : response;
                    if (response && '' !== response) {
                        Y.log('Assigning configured printer: ' + JSON.stringify(response), 'debug', NAME);
                        newDoc.printerName = response;
                    }

                }

                callback( null, newDoc );
            }
        }

        /**
         *  Call back with form document on activity, creating one if necessary
         *
         *  DEPRECATED to be removed
         *
         *  @param  context     {Object}    References to relevant viewModels
         *  @param  template    {Object}    A dcforms-template object
         *  @param  callback    {Function}  Of the form fn(err, formDoc, needsReMap)
         */

        function getOrCreateFormDocument( context, template, callback ) {

            var
                needsRemap = true,
                needsRemapLinked = true,
                foundDoc = selectDocument( context.documents, '_hasFormData' );

            //  CASE: activity has a document
            //  'remap' is magic value which indicates that the mapper needs to recreate the content of this form

            if( foundDoc && foundDoc.formData) {
                if( Y.config.debug ) {
                    Y.log('Found form document on activity: ' + ko.unwrap( foundDoc._id ) + ' ' + ko.unwrap( foundDoc.formData ), 'debug', NAME);
                }

                needsRemap = ( 'remap' === ko.unwrap( foundDoc.formData ) );
                needsRemapLinked = ( 'remaplinked' === ko.unwrap(foundDoc.formData) );

                callback(null, foundDoc, needsRemap, needsRemapLinked);
                return;
            }

            //  CASE: activity has no 'FORM' type document

            createDocumentFromForm(context, template, onFormDocCreated);

            function onFormDocCreated(err, newDoc) {
                if (err) {
                    Y.log('Could not create new FORM document: ' + JSON.stringify(err), 'warn', NAME);
                    callback(err);
                    return;
                }

                //  No longer saving immediately - document now added to activity to be persisted on FSM change
                if (context.activity._isEditable()) {
                    context.documents.push(newDoc);
                } else {
                    Y.log('Activity is not editable by user, not adding form document.', 'warn', NAME);
                }
                callback( null, newDoc, needsRemap, needsRemapLinked );
            }

        }

        /**
         *  Extract form state from a 'FORM' type document viewModel
         *
         *  Legacy data is serialized as a base64 encoded string in the formData property, to be replaced by migration
         *  or use with a formState object property with keys and values representing form element names and values.
         *
         *  @param  formDoc {Object}    A document viewModel holding form state
         *  @return         {Object}    form data in native serialzation of forms
         */

        function formDocToDict(formDoc) {
            var
                formState = formDoc.formState ? ko.unwrap( formDoc.formState ) : null,
                formData = formDoc.formData ? ko.unwrap( formDoc.formData ) : '',
                formDict = {};

            if (formState) {

                if ('string' === typeof formState) {
                    try {
                        formDict = JSON.parse(formState);
                    } catch (parseErr) {
                        Y.log('Could not parse stored form state: ' + JSON.stringify(parseErr), 'warn', NAME);
                        formDict = {};
                    }
                }

                if ('object' === typeof formState) {
                    formDict = formState;
                }

                return formDict;
            }

            if( '' !== formData && 'remap' !== formData ) {

                formData = Y.doccirrus.comctl.B64ToUTF8( formData );

                if ('string' === typeof formData) {
                    try {
                        formDict = JSON.parse(formData);
                    } catch (parseErr) {
                        Y.log('Could not parse saved form data: ' + formData, 'warn', NAME);
                    }
                } else {
                    if( Y.config.debug ) {
                        Y.log('Form data is not a string: ' + JSON.stringify(formData), 'debug', NAME);
                    }
                }

            } else {
                Y.log( 'Form data not available: ' + ko.unwrap( formDoc._id ), 'warn', NAME );
            }

            return formDict;
        }

        /**
         *  Update the 'FORM' type attachment on an activity - if present - from the contents of the form
         *
         *  @param  context     {Object}    Includes activity, patient and documents
         *  @param  template    {Object}    A dcforms-template object
         *  @param  callback    {Function}  Of the form fn(err)
         */

        function updateFormDoc( context, template, callback ) {
            var formDoc = selectDocument( context.documents, '_hasFormData' );

            function onCreatedNewDocument( err ) {

                if ( err ) {
                    Y.log( 'Could not create new FORM type document: ' + JSON.stringify( err ), 'warn', NAME );
                    callback( err );
                    return;
                }

                Y.log('Created new form document, saving state of form into it.', 'debug', NAME);
                updateFormDoc( context, template, callback );
            }

            if ( formDoc && formDoc.formId() && formDoc.formId() !== template.canonicalId ) {
                if ( context.activity._isEditable() ) {
                    formDoc.formData( 'remap' );
                    formDoc.formState( { 'remap': true } );
                    formDoc.formId( template.canonicalId );
                    formDoc.formInstanceId( template.formVersionId );
                    formDoc.usesMedia( template.getReferencedMedia() );
                }
            }

            if ( !formDoc ) {
                Y.log( 'Could not find form document: creating', 'debug', NAME );
                //callback(new Error('Could not find form document, activity may still be loading.'));

                formDoc = createDocumentFromForm( context, template, onCreatedNewDocument );
                return;
            }

            if ( context.activity._isEditable() && template.mode !== 'shutdown' ) {
                //  update the document and make the activity dirty
                //formDoc.formData(Y.doccirrus.comctl.UTF8ToB64(JSON.stringify(template.toDict())));

                formDoc.formData( '' );
                formDoc.formState( template.toDict() );

                //  deprecated
                if ( !formDoc.printerName ) {
                    formDoc.printerName = '';
                }

            } else {
                //  do not update the document, locked to the user in this state
                Y.log( 'Not updating form document, activity is not editable', 'warn', NAME );
            }

            callback( null );
        }

        /*
         *  Add API
         */

        Y.namespace( 'doccirrus.api' ).document = {
            //'setFormDocument': setFormDocument,
            //'getSingleDocument': getSingleDocument,
            'selectDocument': selectDocument,
            'getOrCreateFormDocument': getOrCreateFormDocument,
            'createDocumentFromForm': createDocumentFromForm,
            'formDocToDict': formDocToDict,
            'updateFormDoc': updateFormDoc
        };
    },
    '0.0.1', { requires: [
        'dcschemaloader',
        'document-schema',
        'KoViewModel'
    ]
    }
);