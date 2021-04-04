/**
 *  Helper object to expand and keep track of the various kinds of documents attached to an activity
 *  Intended to replace most functions of the client-side document API used by previous iteration of CaseFile
 *
 *  User: strix
 *  Date: 22/01/16
 *  (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, ko, moment, jQuery */

'use strict';

YUI.add( 'AttachmentsViewModel', function( Y, NAME ) {

        /**
         * @module AttachmentsViewModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap;

        /**
         * @class AttachmentsViewModel
         * @constructor
         * @extends KoViewModel
         * @param   {Object}    config
         */
        function AttachmentsViewModel( config ) {
            AttachmentsViewModel.superclass.constructor.call( this, config );
        }

        AttachmentsViewModel.ATTRS = {
            validatable: {
                lazyAdd: false
            }
        };

        Y.extend( AttachmentsViewModel, KoViewModel.getBase(), {

                documents: null,
                _binder: null,       //  hack to simplify interaction with activity buttons

                initializer: function AttachmentsViewModel_initializer() {
                    var self = this;
                    self.documents = ko.observableArray( [] );
                    self.tagInitList = [];
                },
                destructor: function AttachmentsViewModel_destructor() {
                    //  destroy all document viewModels
                    var self = this;
                    self.documents().forEach( function( doc ) {
                        doc.destroy();
                    } );
                    self.documents.removeAll();
                    self.documents = null;
                },

                /**
                 *  This is called by forms code and Ext Dokument when changes to document state should
                 *  cause the current activity to behave as if it has been modified.
                 *
                 *  This is to allow a similar API to previous version of CaseFile and allow forms to work
                 *  with minimal changes.
                 */

                // makeDirty: function AttachmentsViewModel_makeDirty( doc ) {
                //     //  useful for debugging spurious saves
                //     //console.log( 'marking document set as dirty, stack trace follow: ', new Error().stack );
                //
                //     Y.fire( 'documentUpdated', doc );
                // },

                /**
                 *  Temporary, complement to makeDirty
                 *
                 *  Both of these to be replaced by an event
                 */

                // makeClean: function AttachmentsViewModel_makeDirty() {
                //     Y.fire( 'documentsAllSaved', {} );
                // },

                /**
                 *  Get complete documents referred to as attachments of an activity (not expanded on server)
                 *  @param currentActivity
                 */

                loadFromActivity: function AttachmentsViewModel_loadFromActivity( currentActivity ) {
                    var
                        self = this,
                        plainIds = unwrap( currentActivity.attachments );

                    if( !self.documents ) {
                        //  activity was destroyed immediately after a transition
                        return;
                    }

                    function loadSingleDocument( documentId ) {
                        return new Promise( function( resolve /*, reject*/ ) {
                            Y.doccirrus.jsonrpc.api.document
                                .read( { query: { _id: documentId }, noBlocking: true } )
                                .done( function( result ) {

                                    if( !result || !result.data || !result.data[0] ) {
                                        Y.log( 'Could not load document from server: ' + documentId, 'warn', NAME );
                                        /*
                                        * Should never really come here as the bug, which used to cause this inconsistency, is fixed on server
                                        * but still just for extra safety we are placing this check.
                                        *
                                        * We should not reject if the document is not present in the DB because:
                                        * 1] The whole purpose of this API is to mirror activity on the UI as it is on server
                                        * 2] If we reject promise here then other documents which are actually stored in activity on server
                                        *    will not be visible on UI, which will mislead user that the document is not attached to activity
                                        *    when in reality the document is attached. The User will only be able to find out about this if
                                        *    page refresh occurs
                                        * */
                                        // reject( new Error( 'Could not load document from server: ' + documentId ) );
                                        resolve();
                                        return;
                                    }

                                    var newDocModel = new KoViewModel.createViewModel( {
                                        NAME: 'DocumentModel',
                                        config: { data: result.data[0], tagInitList: self.tagInitList }
                                    } );

                                    //  parent object may be destroyed by navigation in the middle of this
                                    //  async operation

                                    if( self.documents ) {
                                        self.documents.push( newDocModel );
                                    }

                                    resolve( newDocModel );
                                } );
                        } );
                    }

                    return Promise
                        .each( plainIds, loadSingleDocument )
                        .then( function() {
                            return currentActivity;
                        } );
                },

                /**
                 * Loads documents and push them into "this.documents"
                 * @method loadNewDocuments
                 * @param {Array} documentIds
                 * @return {Promise}
                 */
                loadNewDocuments: function AttachmentsViewModel_loadFromActivity( documentIds ) {
                    var
                        self = this;
                    if( !self.documents ) {
                        //  activity was destroyed immediately after a transition
                        return;
                    }

                    documentIds = documentIds || [];
                    function loadSingleDocument( documentId ) {
                        return Promise.resolve( Y.doccirrus.jsonrpc.api.document.read( { query: { _id: documentId } , noBlocking: true } ) )
                            .then( function( response ) {
                                var
                                    document = response.data && response.data[0],
                                    newDocModel;
                                if( !document ) {
                                    Y.log( 'Could not load document from server: ' + documentId, 'warn', NAME );
                                    throw new Error( 'Could not load document from server: ' + documentId );
                                }

                                newDocModel = new KoViewModel.createViewModel( {
                                    NAME: 'DocumentModel',
                                    config: { data: document, tagInitList: self.tagInitList }
                                } );

                                //  parent object may be destroyed by navigation in the middle of this
                                //  async operation

                                if( self.documents ) {
                                    self.documents.push( newDocModel );
                                }

                                return newDocModel;
                            } );
                    }

                    return Promise
                        .each( documentIds, loadSingleDocument );
                },

                /**
                 *  Instantiate document models for a set of attachments expanded and sent by the server
                 *
                 *  Synchronous, no returned promise.
                 *
                 *  @param  attachmentsObj   {Object}   Array of plain document objects
                 */

                loadFromAttachmentsObj: function AttachmentsViewModel_loadFromAttachmentsObj( attachmentsObj ) {
                    var
                        self = this;

                    attachmentsObj.forEach( instantiateSingleDocument );

                    function instantiateSingleDocument( plainDoc ) {
                        var
                            newDocModel = new KoViewModel.createViewModel( {
                                NAME: 'DocumentModel',
                                config: {
                                    data: plainDoc,
                                    tagInitList: self.tagInitList
                                }
                            } );

                        self.documents.push( newDocModel );
                    }

                },

                /**
                 *  Create / update a FORMPDF document after regenerated on server (on print/pdf/approve)
                 *
                 *
                 */

                updateDocumentsFromAttachmentsObj: function AttachmentsViewModel_updateFromAttachmentsObj( attachmentsObj ) {
                    var self = this;

                    attachmentsObj.forEach( checkSingleDocument );

                    function checkSingleDocument( plainDoc ) {
                        var matched = self.findDocument( plainDoc._id );

                        //  documents don't have an _id before save, compare by type or mediaId to match saved
                        //  documents to set the new _id
                        if ( !matched && 'FORM' === plainDoc.type ) { matched = self.findDocument( 'FORM' ); }
                        if ( !matched && 'FORMPDF' === plainDoc.type ) { matched = self.findDocument( 'FORMPDF' ); }
                        if ( !matched && plainDoc.mediaId ) { matched = self.findDocument( plainDoc.mediaId ); }

                        if ( matched ) {
                            matched.set( 'data', plainDoc );
                            matched.setNotModified();
                        } else {
                            //  create a new one
                            matched = new KoViewModel.createViewModel( {
                                NAME: 'DocumentModel',
                                config: {
                                    data: plainDoc,
                                    tagInitList: self.tagInitList
                                }
                            } );

                            Y.log( 'loadFromAttachmentsObj creating new FORMPDF document model from: ' + plainDoc._id, 'debug', NAME );
                            self.documents.push( matched );
                        }

                    }
                },

                /**
                 *  Return JSON serialization of documents which need to be saved to server
                 *  Pass along with activity transition
                 *
                 *  @param      {Boolean}   getAll      Treat them all as dirty
                 *  @returns    {Object}                Array of serialized documents
                 */

                getDirtyDocuments: function( getAll) {
                    var
                        self = this,
                        allDocuments = ko.unwrap( self.documents ),
                        docModel,
                        dirty = [], i;

                    for ( i = 0; i < allDocuments.length; i++ ) {
                        docModel = allDocuments[i];

                        if ( docModel.isModified() || !ko.unwrap( docModel._id ) || getAll ) {
                            dirty.push( docModel.toJSON() );
                        }
                    }

                    return dirty;
                },

                /**
                 *  Save all documents back to the server
                 *
                 *  @return {Promise}
                 */

                saveAll: function() {
                    var self = this;

                    function saveSingleDocument( docModel ) {
                        var
                            UPDATE_DOCUMENT_FIELDS = Y.doccirrus.schemas.document.updateFieldsOnSave,
                            asJSON = docModel.toJSON(),
                            docId = unwrap( docModel._id );


                        if( docId && '' !== docId ) {
                            //  update existing document
                            return new Promise( promiseToUpdateDocument );
                        }

                        //  create new document and store the _id
                        return new Promise( promiseToCreateDocument );

                        function promiseToUpdateDocument( resolve, reject ) {
                            asJSON.fields_ = UPDATE_DOCUMENT_FIELDS;

                            Y.doccirrus.jsonrpc.api.document
                                .update( { query: { _id: docId }, data: asJSON } )
                                .then( onUpdateComplete )
                                .fail( onUpdateError );

                            function onUpdateComplete( /* result */ ) {
                                docModel.setNotModified();
                                self.tagInitList.length = 0;
                                resolve( true );
                            }

                            function onUpdateError(err) {
                                Y.log( 'Could not update document: ' + JSON.stringify( err ), 'warn', NAME );
                                reject( err );
                            }

                        }

                        function promiseToCreateDocument(resolve, reject ) {

                            Y.doccirrus.jsonrpc.api.document
                                .create( { data: asJSON } )
                                .then( recordDocId )
                                .fail( onCreationError );

                            function recordDocId( result ) {
                                Y.log( 'Received new document_id, result: ' + JSON.stringify( result ), 'debug', NAME );

                                if( result && result.data && result.data[0] ) {
                                    docModel._id( result.data[0] );
                                    docModel.setNotModified();
                                }
                                self.tagInitList.length = 0;
                                return resolve( true );
                            }

                            function onCreationError( err ) {
                                Y.log( 'Could not save attached document to server: ' + JSON.stringify( err ), 'warn', NAME );
                                // pop a modal here to notify the user
                                reject( err );
                            }

                        }
                    }

                    return Promise.each( self.documents(), saveSingleDocument );
                },

                /**
                 *  Write the list of attachment _ids to the currentActivity (after saving them)
                 *
                 *  @param  currentActivity     {Object}    An ActivityViewModel
                 *  @param  inTransition        {Boolean}   True if called during transition process
                 *  @returns                    {Boolean}   True if activity attachments were changedd
                 */

                updateActivity: function( currentActivity, inTransition ) {
                    var
                        self = this,
                        oldString,
                        newString,
                        activityChanged;

                    oldString = JSON.stringify( currentActivity.attachments() );
                    currentActivity.attachments( [] );

                    self.documents().forEach( function( doc ) {
                        var docId = unwrap( doc._id );
                        if ( docId && '' !== docId ) {
                            currentActivity.attachments.push( docId );
                        } else {
                            Y.log( 'Invalid _id on attachment, not linking to activity.', 'warn', NAME );
                        }
                    } );

                    newString = JSON.stringify( currentActivity.attachments() );

                    activityChanged = (oldString !== newString);

                    //  NOTE: this comparison is a little hacky.  It is implemented this way
                    //  because of the deferred execution of the isModified computed on activities
                    //  which does not reliably set the status before it must be compared to
                    //  the status of an incipient transition

                    if( activityChanged && currentActivity._isEditable() && 'CREATED' !== currentActivity.status() ) {

                        if( !inTransition ) {
                            Y.log( 'making documents dirty to force save of updated attachments', 'debug', NAME );
                            currentActivity.status( 'CREATED' );
                            //  mark activity as dirty
                            //Y.fire( 'documentUpdated', null ); // act.status will trigger dirty state
                        } else {
                            Y.log( 'Not changing activity status during transition: ' + currentActivity.status(), 'debug', NAME );
                        }

                    }

                    return activityChanged;
                },

                /**
                 *  Reload the list of attachments from the server
                 *  (eg, after manually generating a PDF)
                 *
                 *  @param currentActivity
                 *  @return {Promise}
                 */

                updateFromServer: function( currentActivity ) {
                    var self = this;

                    return new Promise(function( resolve, reject ) {
                        Y.doccirrus.jsonrpc.api.activity.read( { noBlocking: true, query: { _id: ko.unwrap( currentActivity._id ) } } )
                            .then( function( result ) {
                                var removed;
                                //  update array of attachment _ids
                                if( result && result.data && result.data[0] ) {
                                    if( result.data[0].attachments ) {
                                        Y.log( 'new attachments: ' + JSON.stringify( result.data[0].attachments ), 'debug', NAME );
                                        currentActivity.set( 'data.attachments', result.data[0].attachments );
                                    }

                                    if( result.data[0].subType && currentActivity.subType && currentActivity.subType() !== result.data[0].subType ) {
                                        currentActivity.subType( result.data[0].subType );
                                    }
                                }

                                //  clear previous set of expanded attachments
                                if( self.documents ) {
                                    removed = self.documents.removeAll();
                                    removed.forEach( function( doc ) {
                                        doc.destroy();
                                    } );
                                }
                                resolve();
                            } )
                            .fail( function( error ) {
                                reject(error);
                            } );
                    })
                    .then(function() {
                        //  load new set of expanded attachments
                        return self.loadFromActivity( currentActivity );
                    })
                    .catch(function( error ) {
                        throw error;
                    });
                },

                /**
                 *  Select a single document from a set of documents according to an identifier
                 *
                 *  @param identifier   {String}    A string to find (mediaId, type or _hasFormData)
                 */

                findDocument: function( identifier ) {
                    var
                        self = this,
                        foundDoc = null;

                    if( !self.documents || 0 === self.documents().length ) {
                        return foundDoc;
                    }

                    self.documents().forEach( function( doc ) {

                        var mediaId;

                        if( unwrap( doc._id ) === identifier ) {
                            foundDoc = doc;
                        }

                        if( 'FORM' === identifier && 'FORM' === unwrap( doc.type ) ) {
                            foundDoc = doc;
                        }

                        if( 'FORMPDF' === identifier && 'FORMPDF' === unwrap( doc.type ) ) {
                            foundDoc = doc;
                        }

                        if( 'SUMEXPDF' === identifier && 'SUMEXPDF' === unwrap( doc.type ) ) {
                            foundDoc = doc;
                        }

                        if( 'MEDICATIONPLAN' === identifier && 'MEDICATIONPLAN' === unwrap( doc.type ) ) {
                            foundDoc = doc;
                        }

                        if( 'KBVMEDICATIONPLAN' === identifier && 'KBVMEDICATIONPLAN' === unwrap( doc.type ) ) {
                            foundDoc = doc;
                        }

                        if(
                            ( '_hasFormData' === identifier ) &&
                            ( doc.formData ) &&
                            ( doc.type ) &&
                            ( unwrap( doc.formData ) ) &&
                            ( '' !== unwrap( doc.formData ) ) &&
                            ( 'FORMPDF' !== unwrap( doc.type ) )
                        ) {
                            foundDoc = doc;
                        }

                        if(
                            ( '_hasFormData' === identifier ) &&
                            ( doc.formState ) &&
                            ( doc.type ) &&
                            ( unwrap( doc.formState ) ) &&
                            ( '' !== unwrap( doc.formState ) ) &&
                            ( 'FORMPDF' !== unwrap( doc.type ) )
                        ) {
                            foundDoc = doc;
                        }

                        if( doc.url && unwrap( doc.url ) ) {
                            mediaId = /id=([a-fA-F\d]+)/.exec( doc.url ? ko.unwrap( doc.url ) : '' ); // extract the mediaId
                            mediaId = (mediaId) ? mediaId[1] : mediaId;

                            if( mediaId === identifier ) {
                                foundDoc = doc;
                            }
                        }

                        if ( doc.mediaId && unwrap( doc.mediaId ) === identifier ) {
                            foundDoc = doc;
                        }

                    } );

                    if( 'function' === typeof foundDoc ) {
                        foundDoc = ko.unwrap( foundDoc );
                    }

                    return foundDoc;
                },

                /**
                 *  Returns a form document, creating one from the provided form if none yet exist
                 *
                 *  @param  context     {Object}    A form mapper's context object
                 *  @param  template    {Object}    A dcforms-template object
                 *  @param  callback    {Function}  Of the form fn(err, formDoc, needsremap)
                 */

                getOrCreateFormDocument: function( context, template, callback ) {
                    var
                        self = this,
                        formDoc = self.findDocument( '_hasFormData' ),
                        needsRemap = false,
                        needsRemapLinked = false;

                    function onPlaceholderFilled( err ) {
                        if( err ) {
                            return callback( err );
                        }
                        Y.log( 'Placeholder document filled from form.', 'debug', NAME );
                        callback( null, formDoc, true, true );
                    }

                    if( formDoc ) {
                        //  a saved form state already exists
                        needsRemap = ('remap' === unwrap( formDoc.formData ) );
                        needsRemapLinked = ('remaplinked' === unwrap( formDoc.formData ) );

                        //  placeholder value indicates that a form document was necessary, but no form ever loaded
                        if( 'placeholder' === unwrap( formDoc.formData ) ) {
                            self.updateFormDoc( context, template, onPlaceholderFilled );
                            return;
                        }

                        callback( null, formDoc, needsRemap, needsRemapLinked );
                        return;
                    }

                    //  a saved form state does not exist, make one from the current form
                    self.createFromForm( context, template, callback );
                },

                /**
                 *  Saves the template's state to a new form document
                 *
                 *  @param  context     {Object}    A form mapper's context object
                 *  @param  template    {Object}    A dcforms-template object
                 *  @param  callback    {Function}  Of the form fn(err, formDoc, needsremap)
                 */

                createFromForm: function( context, template, callback ) {
                    var
                        self = this,
                        oldDoc,
                        newDoc = new KoViewModel.createViewModel( {
                            NAME: 'DocumentModel',
                            config: { data: {} }
                        } );

                    function onFormStateSaved( err, newDoc, needsRemap, needsRemapLinked ) {
                        if( err ) {
                            Y.log( 'Error saving form state to new document: ' + JSON.stringify( err ), 'warn', NAME );
                            return callback( err );
                        }

                        //  prevents a crash on callback after destruction of parent view
                        if( !self.documents ) {
                            Y.log( 'Missing documents observable, creating: ', 'warn', NAME );
                            self.documents = ko.observableArray( [] );
                        }

                        //  add new document to activity attachments if no existing formdoc (there may be a placeholder)
                        if( self && self.documents ) {
                            oldDoc = self.findDocument( '_hasFormData' );
                            if( !oldDoc ) {
                                self.documents.push( newDoc );
                            }
                        }

                        callback( err, newDoc, needsRemap, needsRemapLinked );
                    }

                    newDoc.createFromForm( context, template, onFormStateSaved );
                },

                createEmptyFormDoc: function() {
                    var
                        self = this,
                        newDoc = new KoViewModel.createViewModel( {
                            NAME: 'DocumentModel',
                            config: {
                                data: {
                                    'type': 'FORM',
                                    'contentType': 'dc/form',
                                    'formData': 'placeholder',
                                    'formState': { 'placeholder': 'placeholder' }
                                }
                            }
                        } );

                    //  never create more than one form doc
                    if( self.findDocument( '_hasFormData' ) ) {
                        Y.log( 'Not creating placeholder document: a form document already exists', 'warn', NAME );
                        return false;
                    }

                    //  prevents a crash on callback after destruction of parent view
                    if( !self.documents ) {
                        Y.log( 'Missing documents observable, creating: ', 'warn', NAME );
                        self.documents = ko.observableArray( [] );
                    }

                    //  add new document to activity attachments
                    if( self && self.documents ) {
                        self.documents.push( newDoc );
                        return true;
                    }

                    return false;
                },

                /**
                 *  Replace the saved form state with the current state of the passed template
                 *
                 *  @param context
                 *  @param template
                 *  @param callback
                 */

                updateFormDoc: function( context, template, callback ) {
                    var
                        self = this,
                        dictString,
                        formDoc = self.findDocument( '_hasFormData' );
                    
                    //  block save while this is ongoing
                    template.inMapOperations = template.inMapOperations + 1;

                    function onCreatedNewDocument( err /*, newFormDoc */ ) {
                        template.inMapOperations = template.inMapOperations - 1;
                        if( err ) {
                            Y.log( 'Could not create new FORM type document: ' + JSON.stringify( err ), 'warn', NAME );
                            callback( err );
                            return;
                        }

                        //  prevent failure loop
                        context.formDocCreated = true;
                        self.updateFormDoc( context, template, callback );
                    }

                    //  check if form has changed
                    if( formDoc && formDoc.formId() && formDoc.formId() !== template.canonicalId ) {
                        if( context.activity._isEditable() ) {
                            formDoc.formData( 'remap' );
                            formDoc.formState( { 'remap': true } );
                            formDoc.formStateHash( -1 );
                            formDoc.formId( template.canonicalId );
                            formDoc.formInstanceId( template.formVersionId );
                            formDoc.formInitialState( template.toDict() );

                            formDoc.mapData( {} );
                            formDoc.usesMedia( [] );
                        }
                    }

                    if( !formDoc && context.formDocCreated ) {
                        Y.log( 'Missing form document, created but not present.', 'warn', NAME );
                    }

                    if( !formDoc && !context.formDocCreated ) {
                        Y.log( 'Could not find form document: creating', 'info', NAME );
                        //callback(new Error('Could not find form document, activity may still be loading.'));
                        self.createFromForm( context, template, onCreatedNewDocument );
                        return;
                    }

                    //
                    if( context.activity._isEditable() && template.mode !== 'shutdown' ) {
                        //  update the document and make the activity dirty
                        //formDoc.formData(Y.doccirrus.comctl.UTF8ToB64(JSON.stringify(template.toDict())));

                        formDoc.formData( '' );

                        if( formDoc.printerName && !formDoc.printerName() ) {
                            formDoc.printerName( '' );
                        }

                        if( JSON.stringify( formDoc.formState() ) === JSON.stringify( template.toDict() ) ) {
                            Y.log( 'No change to form state, no need to update activity', 'debug', NAME );
                        } else {
                            Y.log( 'form state has changed, updating formDoc', 'debug', NAME );

                            /*
                            //  uncomment to find cause of form updates
                            let
                                cmpState = formDoc.formState(),
                                cmpDict = template.toDict(), k;
                            for ( k in cmpDict ) {
                                if ( cmpDict.hasOwnProperty( k ) ) {
                                    if ( JSON.stringify( cmpDict[k] ) !== JSON.stringify( cmpState[k] ) ) {
                                        console.log( '(----) form state changed ' + k + ' from: ', cmpState[k] );
                                        console.log( '(----) form state changed ' + k + ' --to: ', cmpDict[k] );
                                    }
                                }
                            }
                            */

                            //  serialization is to prevent comparisons to the same array
                            dictString = JSON.stringify( template.toDict() );
                            formDoc.formState( JSON.parse( dictString ) );
                            formDoc.mapData( JSON.parse( JSON.stringify( template.mapData  ) ) );
                            formDoc.usesMedia( template.getReferencedMedia() );

                            formDoc.formStateHash( Y.dcforms.fastHash( dictString ) );

                            if ( template.useReporting ) {
                                formDoc.reportingData( template.getReportingData() );
                            }

                            //  make the activity dirty
                            Y.log( 'formDoc updated, mark attachments dirty', 'debug', NAME );
                            Y.fire( 'documentUpdated', true );
                        }

                    } else {
                        //  do not update the document, locked to the user in this state
                        Y.log( 'Not updating form document, activity is not editable', 'warn', NAME );
                    }

                    //  restore save button
                    template.inMapOperations = template.inMapOperations - 1;
                    callback( null );
                },

                /**
                 *  Returns the set of media attachments for ext dokument table
                 */

                getMediaDocs: function() {
                    var
                        self = this,
                        mediaDocs = [];

                    self.documents().forEach( function( doc ) {
                        if( doc.isExtDoc() ) {
                            mediaDocs.push( doc );
                        }
                    } );

                    mediaDocs.sort( function( a, b ) {
                        //  sort list newest to oldest (MOJ-1452)
                        return new Date( ko.unwrap( b.createdOn ) ) - new Date( ko.unwrap( a.createdOn ) );
                    } );

                    return mediaDocs;
                }, // getMediaDocs

                /**
                 *  Return true is an attachment exists with the given media _id
                 *
                 *  @param  mediaId {String}
                 */

                hasMediaDoc: function( mediaId ) {
                    var
                        self = this,
                        mediaDocs = self.getMediaDocs(),
                        found = false;

                    mediaDocs.forEach( function( doc ) {

                        //  note, strange type comparison here, coerce to string
                        if( ( unwrap( doc.mediaId ) + '' ) === ( mediaId + '' ) ) {
                            found = true;
                        }
                    } );

                    return found;
                },

                /**
                 *  Select the latest FORMPDF type document, or null
                 *  @returns {DocumentModel||null}
                 */

                getLatestPdf: function() {
                    var
                        self = this,
                        latestPDFDocument = null;

                    self.documents().forEach( function( doc ) {
                        var dateCmp, dateLast;

                        if(['SUMEXPDF', 'FORMPDF'].includes(doc.type())) {

                            if( !latestPDFDocument ) {

                                latestPDFDocument = doc;

                            } else {

                                dateCmp = unwrap( doc.createdOn );
                                dateLast = unwrap( latestPDFDocument.createdOn );

                                if( dateCmp && moment( dateCmp ).isAfter( dateLast ) ) {
                                    latestPDFDocument = doc;
                                }
                            }

                        }
                    } );

                    return latestPDFDocument;
                },

                /**
                 *  Called when an upload control on the client adds a file
                 *
                 *  @param  {Object}    facade              From YUI events, no longer used
                 *  @param  {Object}    mediaObj            Plain media object
                 *  @param  {Object}    currentActivity     KO activity model
                 *  @param  {Object}    currentPatient      KO patient model
                 */

                addDocumentFromMedia: function( facade, mediaObj, currentActivity, currentPatient ) {

                    Y.log( 'Received uploaded media to be attached to activity: ' + mediaObj._id + ' facade: ', facade, 'debug', NAME );

                    var
                        self = this,
                        patientName = jQuery.trim( currentPatient.firstname() + ' ' + currentPatient.lastname() ),
                        lookupId = unwrap( currentActivity._id ) || unwrap( currentActivity._randomId ),
                        newDoc,
                        newDocUrl,
                        newDocPlain;

                    if( !currentActivity._isEditable() ) {
                        Y.log( 'Cannot attach media, activity is read only in current state.', 'warn', NAME );
                        return;
                    }

                    if( !currentActivity._id ) {
                        self.scheduleMediaCleanup( mediaObj._id );
                    }

                    if( Y.config.debug ) {
                        Y.log( 'Received media attachment ' + mediaObj._id, 'debug', NAME );
                    }

                    if( !mediaObj ) {
                        if( Y.config.debug ) {
                            Y.log( 'Invalid file uploaded, or error on attaching media, not adding as document.', 'warn', NAME );
                            Y.log( 'Invalid media ' + mediaObj._id + ': ' + JSON.stringify( mediaObj, undefined, 2 ), 'debug', NAME );
                        }
                        return;
                    }

                    // copy the newly added media as an attached document on the current activity

                    Y.log( 'Creating new document to reference attached media: ' + mediaObj._id, 'info', NAME );

                    newDocUrl = '/media/' + mediaObj._id + '_original.' + mediaObj.mime + '.' + Y.doccirrus.media.getExt( mediaObj.mime );

                    newDocPlain = {
                        'type': mediaObj.docType || 'OTHER',
                        'url': newDocUrl + '&from=casefile',
                        'caption': patientName + ' - ' + moment().format( 'DD.MM.YYYY' ) + ' - ' + mediaObj.name,
                        'publisher': Y.doccirrus.comctl.fullNameOfUser,
                        'createdOn': (new Date()).toJSON(),
                        'contentType': mediaObj.mime.replace( '_', '/' ).toLowerCase(),
                        'attachedTo': lookupId,
                        'activityId': lookupId,
                        'mediaId': mediaObj._id,
                        'accessBy': [],
                        'locationId': currentActivity.locationId(),
                        'isEditable': false
                    };

                    if ( mediaObj.malwareWarning ) {
                        newDocPlain.malwareWarning = mediaObj.malwareWarning.split( '\n' )[ 0 ];
                        newDocPlain.malwareWarning = newDocPlain.malwareWarning.replace( ':', '' ).replace( 'FOUND', '' ).trim();
                    }

                    newDoc = new KoViewModel.createViewModel( {
                        NAME: 'DocumentModel',
                        config: { data: newDocPlain, tagInitList: self.tagInitList }
                    } );

                    self.documents.push( newDoc );

                    //  camera UI does not always set file extension and mimeType
                    if( mediaObj.mime && !mediaObj.ext ) {
                        mediaObj.ext = Y.doccirrus.media.getExt( mediaObj.mime );
                    }

                    if( mediaObj.mime && !mediaObj.mimeType ) {
                        mediaObj.mimeType = Y.doccirrus.media.getMimeType( mediaObj.mime );
                    }

                    //  record the media on the current activity (used to list images when embedding in forms)
                    currentActivity.attachedMedia.push( {
                        "_id": mediaObj._id,
                        "caption": mediaObj.ext.toUpperCase(),
                        "contentType": mediaObj.mimeType,
                        "mediaId": mediaObj._id
                    } );

                    return newDoc;
                },

                /**
                 *
                 *  @param  {String}    cacheFileName
                 *  @param  {Object}    currentActivity
                 *  @param  {Object}    currentPatient
                 *  @param  {Function}  callback            Of the form fn( err, newMedia, newDocument )
                 */

                addDocumentFromCacheFile: function( cacheFileName, currentActivity, currentPatient, callback ) {
                    var
                        self = this,
                        useId = unwrap( currentActivity._id ) || unwrap( currentActivity._randomId );

                    Y.doccirrus.jsonrpc.api.media
                        .saveFromCache( {
                            'cacheFile': cacheFileName,
                            'ownerCollection': 'activity',
                            'ownerId': useId
                        } )
                        .then( onSavedMedia )
                        .fail( onSaveErr );

                    function onSavedMedia( result ) {
                        var
                            newMedia, newDoc;

                        newMedia = result.data ? result.data : result;
                        newDoc = self.addDocumentFromMedia( {}, newMedia, currentActivity, currentPatient );
                        callback( null, newMedia, newDoc );
                    }

                    function onSaveErr( err ) {
                        Y.log( 'Could not attach media from cache: ' + JSON.stringify( err ), 'warn', NAME );
                    }

                },

                /**
                 *  Raised when currentActvity._activitiesObj is changed
                 *
                 *  This is to let the formdoc know that it is out of sync, when the form is not loaded
                 *  Only necessary if the activity already has a mapped form
                 */

                markLinkedActivitiesDirty: function() {
                    var
                        self = this,
                        formDoc = self.findDocument( '_hasFormData' );

                    if( !formDoc ) {
                        //  if no form doc then we need to create one
                        self.createEmptyFormDoc();
                        return;
                    }

                    //  full remapping takes precedence
                    if( formDoc.formData && 'remap' === unwrap( formDoc.formData ) ) {
                        return;
                    }

                    //  placeholder form requires recreation, not just remapping of linked activities
                    if( formDoc.formData && 'placeholder' === unwrap( formDoc.formData ) ) {
                        return;
                    }

                    //  hack using legacy field, also used for some other formdoc dirty states on server
                    formDoc.formData( 'remaplinked' );

                    Y.log( 'Linked activities will be remapped next time the form is loaded.', 'debug', NAME );
                },

                processActivityContentEmbeds: function( currentActivity ) {
                    var
                        self = this,
                        formDoc = self.findDocument( 'FORM' ),
                        templateText,
                        formState,
                        filledText;

                    //  if current activity is not editable then embeds should already have been performed
                    if( !currentActivity._isEditable() ) {
                        return;
                    }

                    //  if activity has no form, or no saved form, then we can't
                    if( !formDoc || !formDoc.formState ) {
                        return;
                    }

                    //  if form is a placeholder or scheduled for remapping, then we can't
                    if( 'object' !== typeof unwrap( formDoc.formState ) ) {
                        return;
                    }

                    templateText = unwrap( currentActivity.userContent );
                    formState = unwrap( formDoc.formState );

                    filledText = self.parseFormFieldsInContent( templateText, formState );
                    currentActivity.content( filledText );
                },

                /**
                 *  Helper to set embedded fields in activity content from form
                 *
                 *  @param  text        {String}    Current activity userContent
                 *  @param  formState   {Object}    Dict, keys and values from form
                 *  @return             {String}    userContent with form values replaced
                 */

                parseFormFieldsInContent: function( text, formState ) {
                    var
                        inField = false,
                        char, last = '', buf = '',
                        fields = [],
                        fieldName, fieldValue,
                        i, k;

                    //  get the set of form elements referenced in userContent
                    for( i = 0; i < text.length; i++ ) {
                        char = text.substr( i, 1 );

                        if( inField ) {
                            if( '{' !== char && '}' !== char ) {
                                buf = buf + char;
                            }
                        }

                        if( !inField ) {
                            if( '{' === char && '{' === last ) {
                                inField = true;
                                buf = '';
                            }
                        } else {
                            if( '}' === char && '}' === last ) {
                                inField = false;
                                fields.push( buf.replace( '}', '' ) );
                            }
                        }

                        last = char;
                    }

                    //  replace values from form state
                    for( i = 0; i < fields.length; i++ ) {
                        fieldName = fields[i];
                        fieldValue = '...';

                        for( k in formState ) {
                            if( formState.hasOwnProperty( k ) ) {
                                //  default serialization
                                if( fieldName === k && !formState.hasOwnProperty( k + '_plaintext' ) ) {
                                    fieldValue = formState[k];
                                }
                                //  extra serialization for embedding as text
                                if( fieldName + '_plaintext' === k ) {
                                    fieldValue = formState[k];
                                }
                            }
                        }

                        text = text.replace( '{{' + fieldName + '}}', fieldValue );
                    }

                    return text;
                }

            },
            {
                NAME: 'AttachmentsViewModel'
            }
        );

        KoViewModel.registerConstructor( AttachmentsViewModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'DocumentModel'
        ]
    }
);