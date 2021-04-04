/*
 @author: mp
 @date: 2013/11/10
 */

/*jslint anon:true, nomen:true, latedef:false */
/*global YUI, ko, $, moment */

'use strict';

YUI.add( 'dcdocumentmodel', function( Y, NAME ) {

        var DocumentModel;

        /**
         * documents are in real activities of type finding that link to document instances
         * @param document
         * @constructor
         */
        DocumentModel = function DocumentModel( document ) {

            //Y.log('Initializing document viewModel', 'info', NAME);
            //console.log(document);

            var self = this;

            if (!document.hasOwnProperty('accessBy')) {
                document.accessBy = [];
            }

            self._modelName = 'DocumentModel';
            Y.doccirrus.uam.ViewModel.call( self );

            self._schemaName = 'document';
            self._runBoilerplate( document );

            // url
            this._dataUrl = '/r/document';

            self._displayUrl = ko.computed( function() {
                    var url = self.url();
                    if( url ) {
                        if ('application/pdf' === self.contentType()) {
                            url = url.replace('displayimage', 'downloadpdf');
                        }
                        return Y.doccirrus.infras.getPrivateURL( url );
                    }
                    return '';
                }
            );
            self._displayDescr = ko.computed( function() {
                    var
                        ct = self.contentType(),
                    //  escape any HTML in the caption, prevent XSS
                    //  http://stackoverflow.com/questions/24816/escaping-html-strings-with-jquery
                        caption = $('<div/>').text(self.caption()).html();

                    if (!caption) {
                        caption = 'Untitled Eintrag ' + self._id;
                    }

                    if (
                        ('application/pdf' === ct) ||
                        ('image/jpeg' === ct) ||
                        ('image/png' === ct) ||
                        ('image/gif' === ct) ) {
                        caption = '<a href="javascript:viod(0);">' + caption + ' </a>';
                    }

                    return caption;
                }
            );

            self._displayDate = ko.computed( function() {
                return moment(self.createdOn()).format('DD.MM.YYYY');
            });

            // a helper observable to provide date to UI and feed the date back to the original observable, "createdOn"
            self.createDate = ko.computed( {
                write: function( value ) {

                    Y.log('Setting createdOn to current date');
                    console.trace();

                    function onSaveCreatedOn() {
                        Y.log('Added createdOn to document', 'debug', NAME);
                    }

                    function onFailCreatedOn() {
                        Y.log('Failed to save createdOn', 'debug', NAME);
                    }

                    if( self._id ) {
                        if( Y.config.debug ) {
                            Y.log('Computing date from ' + JSON.stringify(value), 'debug', NAME);
                        }
                        var now = new Date(),
                            newDate = new Date( Date.parse( value ) ),
                            isToday = (now.getYear() === newDate.getYear() &&
                                       now.getMonth() === newDate.getMonth() &&
                                       now.getDate() === newDate.getDate());
                        value = (isToday) ? now.toJSON() : value; // to preserve hour,minute,second values if it is today
                        self.createdOn( value ); // the original observable
                        //  save the document on each change, because currently saving activity doesn't trigger document save
                        self._save( 'createdOn', onSaveCreatedOn, onFailCreatedOn );
                    }
                },
                read: function() {
                    return self.createdOn();
                }
            } );

            // translated type value
            self._type = ko.computed( function() {

                    //  some legacy data is missing this field for QUESTIONNAIREs
                    if (!self.type()) {
                        self.type('FORM');
                    }

                    var typeLabel = Y.doccirrus.schemaloader.translateEnumValue(
                        '-de',
                        self.type(),
                        Y.doccirrus.schemas.document.types.DocType_E.list,
                        'Unsupported'
                    );

                    if ('Unsupported' === typeLabel) {
                        typeLabel = self.type();
                    }

                    return typeLabel;
                }
            );

            self._isVisibleRow = ko.computed( function() {

                    var isVisible = false;

                    switch(self.contentType()) {
                        case 'application/pdf':
                        case 'image/jpeg':
                        case 'image/png':
                        case 'image/gif':
                        case 'dc/questionnaire':
                        case 'dc/frompatient':
                            isVisible = true;
                            break;
                    }

                    return isVisible;
                }
            );

            /*
             *  Allows parent to subscribe to deletion of documents
             */

            self._isDeleted = ko.observable(false);

            // can be viewed in patient portal if patient is in the accessBy array
            self._patientAccess = ko.computed( function() {
                var hasAccess = false;
                if (!self._id) {
                    Y.log('Document not yet saved to server, cannot grant patient accesss.');
                    hasAccess = false;
                } else {
                    hasAccess = (
                        //  new mechanism, set my migration in 3.12, see MOJ-9190
                        (-1 !== self.accessBy.indexOf( ko.unwrap( self.patientId ) ) ) ||
                        //  deprecated, to be removed
                        (-1 !== self.accessBy.indexOf( ko.unwrap( self.attachedTo ) ) )
                    );
                }
                //Y.log('Checking if patient has access to document: ' + (hasAccess ? 'TRUE' : 'FALSE'), 'debug', NAME);
                return hasAccess;
            });

            //  tick the checkbox column in the data table if shared with patent
            self._selected(self._patientAccess());

            self._inToggle = false;

            /**
             *  Add or remove the patient from this document's access list
             *  @param callback
             */

            self._togglePatientAccess = function togglePatientAccess(callback) {
                //  prevent strange feedback loop in some cases
                if (self._inToggle) { return; }
                self._inToggle = true;

                //  initialize patientId if not yet migrated
                if (
                    ko.unwrap( self.attachedTo ) &&
                    !ko.unwrap( self.patientId ) &&
                    self.attachedTo() !== self.activityId()
                ) {
                    //  attached to patient, use this to populate patientId
                    self.patientId( self.attachedTo() );
                }

                //  clean up some broken legacy data
                if ( !ko.unwrap( self.attachedTo ) && !ko.unwrap( self.patientId ) ) {
                    //  document not attached to a patient
                    Y.log('Document ' + self._id + ' not linked to any patient, legacy data?', 'warn', NAME);
                    self._selected(false);
                    return;
                }

                //  add or remove patient from ACL
                if (self._patientAccess()) {
                    Y.log('Removing patient accesss to document: ' + self._id, 'info', NAME);

                    if ('dc/frompatient' === self.contentType()) {
                        Y.doccirrus.comctl.setModal(
                            'Hinweis',
                            'Dokument stammt vom Patienten. Zugriffsänderung daher nicht möglich.',
                            true
                        );
                        return;
                    }

                    self.accessBy.splice(self.accessBy.indexOf( ko.unwrap( self.patientId ) ), 1);
                } else {
                    if( Y.config.debug ) {
                        Y.log('Granting patient ' + ko.unwrap( self.patientId ) + ' accesss to document: ' + self._id, 'info', NAME);
                    }
                    self.accessBy.push( ko.unwrap( self.patientId ) + '');
                }

                //  save back to PRC / tenant database

                function onSaveSuccess() {
                    var paString = self._patientAccess() ? '(patient access granted)' : '(patient access revoked)';
                    self._selected(self._patientAccess());
                    self._inToggle = false;
                    Y.log('Document updated on server: ' + self._id + ' ' + paString, 'info', NAME);
                    callback(null);
                }

                function onSaveFailure(err) {
                    Y.log('Document not updated on server: ' + JSON.stringify(err), 'warn', NAME);
                    self._inToggle = false;
                    callback(err);
                }

                self._save( 'accessBy', onSaveSuccess, onSaveFailure);
            };

            // save the document on each change to this field because currently saving activity doesn't update the document
            self._addDisposable( self.type.subscribe( function() {
                if( self._id ) {
                    self._save( 'type' );
                }
            } ) );

            //  respond to caption being clicked
            self._captionClick = function (data) {

                if ('application/json' === data.contentType()) {
                    if ('FORM' === data.type()) {
                        data.type('dc/questionnaire');
                    }
                }

                switch(self.contentType()) {

                    case 'image/jpeg':
                    case 'image/png':
                    case 'application/pdf':
                        //alert('redirecting to ' + data._displayUrl());
                        window.open(data._displayUrl(), 'media' + data._id);
                        break;


                    case 'dc/questionnaire':
                    case 'dc/frompatient':
                    case 'application/json':
                    case 'dc/form':
                        openQuestionnaireInModal(data);
                        break;

                    default:
                        if( Y.config.debug ) {
                            Y.log('Could not open document ' + data._id + ' of unknown type: ' + data.type() + ' - ' + data.contentType());
                        }

                }

            };

            /**
             *  If this document references an attached media item, get the mediaId
             *
             *  @return     {String}    MediaId or empty string on failure
             *  @private
             */

            self._mediaId = function() {
                //  TODO; safer way to extract this
                var mediaId = /id=([a-fA-F\d]+)/.exec( self.url ? self.url() : '' ); // extract the mediaId
                mediaId = (mediaId) ? mediaId[1] : mediaId;
                return mediaId;
            };

            /**
             *  There is probably a better way to do this in the tables, thsi works for now
             *  @private
             */

            self._deleteButton = ko.computed( function() {
                return '' +
                    '<button class="btn btn-default btn-sm" id="btnDeleteAttachment' + self._id + self._mediaId() + '">' +
                    '<i class="fa fa-trash-o"></i>' +
                    '</button>';
            });

            /**
             *  Shows the confirmation dialog for deleting attachments
             *  @private
             */

            self._deleteButtonClick = function() {

                function onConfirmClick() {
                    self._deleteWithMedia();
                }

                Y.doccirrus.comctl.setModal('Hinweis', 'Wollen Sie dieses Dokument wirklich löschen?', true, onConfirmClick);
            };

            /**
             *  Get form data as object
             *  @private
             */

            self._getFormData = function() {

            };

            /**
             *  Set or update form data
             *  @private
             */

            self._setFormData = function() {

            };

            self._deleteWithMedia = function() {

                var
                    mediaId = self._mediaId(),
                    currentActivity = Y.doccirrus.uam.loadhelper.get('currentActivity');

                if( Y.config.debug ) {
                    Y.log('Deleting document and attached media: ' + (self._id ? self._id : 'new') + ' media Id: ' + self._mediaId(), 'debug', NAME);
                }

                //  only allow delete in some states
                if (false === currentActivity._isEditable) {
                    Y.doccirus.comctl.setModal('Hinweis', 'Dieser Eintrag ist nicht editierbar.');
                    Y.log('Not deleting PDF attachment, document cannot be edited in this state.','info', NAME);
                    return;
                }

                Y.doccirrus.comctl.setModal('Bitte warten', '<i>Löschen von Dokumenten</i>');
                self.caption('deleted');

                //  hide the delete button, prevent double click
                $('#btnDeleteAttachment' + self._id + self._mediaId()).hide();

                //  first delete document on server if it has been saved there
                //  delete the document on the server if it has been saved there
                if (self._id) {
                    //Y.doccirrus.comctl._ajax('DELETE', 'VPRC', '/1/document/', { 'query': '_id,' + self._id }, onDocumentDeleted);
                    Y.doccirrus.jsonrpc.api.document
                        .remove( { 'query': { '_id': self._id } } )
                        .then( onDocumentDeleted );
                    
                } else {
                    onDocumentDeleted(null);
                }

                function onDocumentDeleted(err /* , data */ ) {
                    if (err) {
                        onFailure('Could not delete document: ' + err);
                        return;
                    }

                    //Y.doccirrus.comctl._ajax('DELETE', 'VPRC', '/1/media/', { 'query': '_id,' + mediaId }, onMediaDeleted);
                    Y.doccirrus.jsonrpc.api.media
                        .remove( { 'query': { '_id': mediaId } } )
                        .then( onMediaDeleted );
                    
                }

                function onMediaDeleted(err /* , data */ ) {
                    if (err) {
                        onFailure('Could not delete attached file: ' + err);
                        return;
                    }
                    removeFromAttachments();
                }


                //  remove the media attachment from the attachments observable array

                function removeFromAttachments() {
                    currentActivity._removeAttachment(self);
                    currentActivity._makeDirty();
                    onSuccess();
                }

                //  deleted the document and media, unlinked it, next we should update the UI (table, modal)

                function onSuccess() {
                    if (Y.doccirrus.uam.events.hasOwnProperty('onRequestPDFDocumentReload')) {
                        Y.doccirrus.uam.events.onRequestPDFDocumentReload();
                    }

                    self._isDeleted(true);

                    if (self._onDeleted) {
                        self._onDeleted(self._id);
                    }

                    Y.doccirrus.comctl.clearModal();
                }

                //  something went wrong, tell the user

                function onFailure(err) {
                    Y.doccirrus.comctl.setModal('Hinweis', 'Dokument konnte nicht gelöscht werden.<br/>' + err);
                }
            };

            function openQuestionnaireInModal(fromDoc) {

                function onModalCreated() {

                    function onSubmitQuestionnaire() {
                        Y.log('Blocked questionnaire submission from CaseFile', 'warn', NAME);
                    }

                    function onQuestionnaireCreated() {
                        Y.log('Questionnaire container created.', 'info', NAME);
                    }

                    var questionnaireNode = Y.one( '#divModalForm' + fromDoc._id);

                    questionnaireNode.passToBinder = {
                        'formId': fromDoc.formId(),
                        'instanceId': fromDoc.formInstanceId(),
                        'onSubmit': onSubmitQuestionnaire,
                        'serialized64': (fromDoc.hasOwnProperty('formData') ? fromDoc.formData() : ''),
                        'onSubmitDisabled': true
                    };

                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'forms_embed',
                        'FormEditorMojit',
                        {},
                        questionnaireNode,
                        onQuestionnaireCreated
                    );
                }

                var myTitle = 'Formular';

                if ('FROMPATIENT' === fromDoc.type()) {
                    myTitle = 'Formular von Patient';
                }

                Y.doccirrus.comctl.setModal(
                    myTitle,
                    '<div id="divModalForm' + fromDoc._id + '"">bitte warten</div>',
                    true,
                    null,
                    onModalCreated
                );

            }

            //  Hack to fix late-added fields, to be moved to migration
            //  will search for an activity with this document as an attachment, then copy fields across

            function trySetFieldsFromActivity(document) {

                function onActivityLoaded(err, data) {
                    if (err || (0 === data.length)) {
                        Y.log('Could not fix document object: ' + document._id, 'warn', NAME);
                        return;
                    }

                    var act = data[0],

                        params = {
                            'action': 'put',
                            'query': 'id,' + document._id,
                            'fields_': 'activityId,locationId,caption',
                            'activityId': act._id,
                            'locationId': act.locationId,
                            'caption': act.content
                        };

                    Y.doccirrus.comctl.privatePost('/r/document/?action=put&query=id,' + document._id, params, onSaved);
                }

                function onSaved(err, data) {
                    if (err) {
                        Y.log('Could not save document after updating from activity', 'info', NAME);
                        return;
                    }

                    if( Y.config.debug ) {
                        Y.log('Saved document after updating from activity: ' + JSON.stringify(data), 'info', NAME);
                    }
                }

                Y.doccirrus.comctl.privateGet('/r/activity', { 'query': 'attachments,' + document._id }, onActivityLoaded);
            }

            if (document.hasOwnProperty('_id') && document._id  && false) {
                if (
                    ( false === document.hasOwnProperty('activityId')) ||
                    ( false === document.hasOwnproperty('locationId')) ||
                    ( false === document.hasOwnProperty('caption')) ||
                    ('undefined' === typeof (document.activityId)) ||
                    ('undefined' === typeof (document.locationId)) ||
                    ('undefined' === typeof (document.caption))
                    ) {
                    Y.log('incomplete document: ' + document._id, 'info', NAME);
                    trySetFieldsFromActivity(document);
                }
            }


            //Y.log('Finished creating DocumentModel', 'info', NAME);
        };

        Y.namespace( 'doccirrus.uam' ).DocumentModel = DocumentModel;
    },
    '0.0.1', {requires: [ 'dcviewmodel' ] }
);