/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, $, async */
/*jshint latedef:false */
'use strict';
YUI.add( 'ActivitySectionDocumentViewModel', function( Y, NAME ) {

    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        ActivitySectionViewModel = KoViewModel.getConstructor( 'ActivitySectionViewModel' ),
        FineViewModel = KoViewModel.getConstructor( 'FineViewModel' ),
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,

        createdOnOptions = { format: i18n( 'general.TIMESTAMP_FORMAT_LONG' ) };

    /**
     * @constructor
     * @class ActivitySectionDocumentViewModel
     * @extends ActivitySectionViewModel
     */
    function ActivitySectionDocumentViewModel() {
        ActivitySectionDocumentViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivitySectionDocumentViewModel, ActivitySectionViewModel, {
        templateName: 'ActivitySectionDocumentViewModel',
        /**
         * Options for the "createdOn" datetimepicker
         * @static
         * @property createdOnOptions
         * @type {object}
         */
        createdOnOptions: null,
        /**
         *
         */
        updateActivityAttachmentsHandler: null,
        /** @protected */
        initializer: function() {
            var self = this;
            self.initObservables();
            self.initMediaDocTypes();
            self.initEditControl();

            //  context issue with forEach binding of delete button, run so that this = self
            self.deleteAttachmentClick = function( doc ) {
                self.deleteAttachment( doc );
            };

            self.editImageClick = function( doc ) {
                self.editImage( doc );
            };

            self.createdOnOptions = createdOnOptions;

            self.initSocketListeners();
            self.initSocketReconnection();

            self.attachedIDI18n = i18n('InCaseMojit.casefile_attachments.group.ATTACHED_I_D');
            self.buttonTestI18n = i18n('InCaseMojit.casefile_attachments.button.TEST');
            self.documentTypeTextI18n = i18n('InCaseMojit.casefile_attachments.title.DOCUMENT_TYPE');

        },
        initSocketReconnection: function() {
            var
                self = this;
            self.onConnectListener = Y.doccirrus.communication.onConnect( {
                callback: function() {
                    self.removeSocketListeners();
                    self.initSocketListeners();
                }
            } );
        },
        initSocketListeners: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity ),
                activityId = peek( currentActivity._id ) || ( self.fineViewModel && self.fineViewModel.ownerId());
            self.updateActivityAttachmentsHandler = Y.doccirrus.communication.on( {
                event: 'updateActivityAttachments',
                handlerId: 'ActivitySectionDocumentViewModel',
                done: function( response ) {
                    var
                        data = response.data,
                        documentId = data.documentId,
                        isModified = currentActivity.isModified(),
                        currentActivityId = peek( currentActivity._id );
                    if( currentActivityId === data.activityId && documentId ) {
                        binder.currentView().activityDetailsViewModel().attachmentsModel.loadNewDocuments( documentId ).then( function() {
                            if( isModified ) {
                                documentId.forEach( function( id ) {
                                    currentActivity.attachments.push( id );
                                } );
                            } else {
                                currentActivity.set( 'data.attachments', peek( currentActivity.attachments ).concat( documentId ) );
                                currentActivity.set( 'data.status', 'VALID' );
                                currentActivity.setNotModified();
                            }
                            Y.fire( 'activityPDFChange' );
                            self.updateMediaDocs();

                        } ).catch( catchUnhandled );
                    } else if( !currentActivityId && self.fineViewModel && self.fineViewModel.ownerId() === data.activityId && data.mediaObj ) {
                        self.onMediaUpload( {}, data.mediaObj );
                    }

                }
            } );

            if( activityId ) {
                Y.doccirrus.communication.emit( 'incase.extDocumentTabOpened', {
                    activityId: activityId,
                    isNew: !peek( currentActivity._id )
                } );
            }

        },

        removeSocketListeners: function() {
            var
                self = this;
            Y.doccirrus.communication.emit( 'incase.extDocumentTabClosed' );
            if( self.updateActivityAttachmentsHandler ) {
                self.updateActivityAttachmentsHandler.removeEventListener();
                self.updateActivityAttachmentsHandler = null;
            }
        },
        initObservables: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity );
            self.mediaDocs = ko.observableArray( [] );
            self.addDisposable( ko.computed( function() {
                var
                    mediaDocs = unwrap( self.mediaDocs ),
                    needToSave = false;
                mediaDocs.forEach( function( documentModel ) {
                    needToSave = needToSave || documentModel.isModified() || documentModel.isNew();
                } );
                Y.fire( 'documentUpdated', needToSave );
                return needToSave;
            } ) );

            self.addDisposable( ko.computed( function() {
                var

                    _id = unwrap( currentActivity._id );
                if( !ko.computedContext.isInitial() ) {
                    Y.doccirrus.communication.emit( 'incase.extDocumentTabOpened', {
                        activityId: _id
                    } );
                }
            } ) );
        },
        /** @protected */
        destructor: function() {

            var self = this;
            self.mediaDocs = ko.observableArray( [] );
            self.mediaDocs = null;
            self.canEdit = null;
            self.disableSelect2 = null;
            self.canSave = null;

            self.fineViewModel.destroy();
            self.fineViewModel = null;
            self.removeSocketListeners();
            if( self.onConnectListener ) {
                self.onConnectListener.removeEventListener();
            }
        },

        //  properties and configuration of Jadeloaded compoents

        jq: {},                     //  cached jQuery selectors for jade loading
        mediaViewLoaded: false,     //  set to true when jade load complete
        thumbSize: 100,             //  width of thumbnails
        spacerSize: 10,             //  table col spacer
        useTempId: false,          //  if activity not saved and there is no _id to reference in media yet

        attachedMedia: [],          //  a representation of reduced media objects linked by documents on currentActivity
        mediaDocs: null,
        mediaDocTypes: null,

        canEdit: null,              //  disposable subscription to activity isEditable
        disableSelect2: null,              //  disposable subscription to activity isEditable

        /**
         *  Make an observable array of document types for select box
         */

        initMediaDocTypes: function() {
            var
                self = this,
                typeEnum = Y.doccirrus.schemas.document.types.DocType_E.list,
                disallow = [ 'FORM', 'FORMPDF', 'FORMIMAGE' ],
                toSort = [],
                i;

            self.mediaDocTypes = self.addDisposable( ko.observableArray( [] ) );

            for( i = 0; i < typeEnum.length; i++ ) {
                if( -1 === disallow.indexOf( typeEnum[ i ].val ) ) {
                    toSort.push( {
                        'i18n': typeEnum[ i ].i18n + '',
                        'val': typeEnum[ i ].val + ''
                    } );
                }
            }

            toSort.sort( sortByLocalizedName );

            function sortByLocalizedName( a, b ) {
                if ( a.i18n > b.i18n ) { return 1; }
                if ( b.i18n > a.i18n ) { return -1; }
                return 0;
            }

            self.mediaDocTypes( toSort );
        },

        /**
         *  Disposable subscription to editable status of current activity
         *  (one cannot add or change attachments on an activity after approval)
         */

        initEditControl: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity );

            self.canEdit = self.addDisposable( ko.computed( function() {
                return currentActivity._isEditable();
            } ) );
            self.select2TagsReadOnly = self.addDisposable( ko.computed( function() {
                return !unwrap( self.canEdit );
            } ) );

            self.canSave = self.addDisposable( ko.computed( function() {
                return (currentActivity._id() || currentActivity._randomId());
            } ) );

            self.canDraw = function() {

            };
        },

        initFineViewModel: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                lookupId = unwrap( currentActivity._id ) || unwrap( currentActivity._randomId ),
                hasInScanLicence = Y.doccirrus.auth.hasAdditionalService( 'inScan' ),
                currentPatient = unwrap( binder.currentPatient );

            function linkUploadEvent( facade, mediaObj ) {
                self.onMediaUpload( facade, mediaObj );
            }

            self.fineViewModel = new FineViewModel();
            self.fineViewModel.allowScan = self.fineViewModel.allowScan && hasInScanLicence;

            self.fineViewModel.label( 'user' );
            self.fineViewModel.ownerCollection( 'activity' );
            self.fineViewModel.ownerId( lookupId );                         //  attach to provisional _id or real _id
            self.fineViewModel.patientId( peek( currentPatient._id ) );
            self.fineViewModel.activityId( peek( currentActivity._id ) );   //  attach only to real _id (after save)
            //  subscribe to _id changes
            self.idListener = currentActivity._id.subscribe( function() {
                //  set _id after first save
                self.fineViewModel.activityId( peek( currentActivity._id ) );
                self.fineViewModel.ownerId( peek( currentActivity._id ) );
            } );

            //  subscribe to media upload event
            self.fineViewModel.events.on( 'fineMediaUpload', linkUploadEvent );

            self.fineViewModel.events.on( 'documentImported', function() {
                self.onDocumentImported();
            } );

            self.fineViewModel.events.on( 'ophthalmologistTmpFileImported', function( content ) {
                self.onOphthalmologistTmpFileImported( content );
            } );

            if( !peek( currentActivity._id ) ) {
                Y.doccirrus.communication.emit( 'incase.extDocumentTabOpened', {
                    activityId: self.fineViewModel.ownerId(),
                    isNew: true
                } );
            }

            self.readOnly = ko.computed( function() {
                var isReadOnly = unwrap( currentActivity._isModelReadOnly );
                self.fineViewModel.setReadOnly( isReadOnly );
                return isReadOnly;
            } );

        },
        onDocumentImported: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentAct = unwrap( binder.currentActivity );

            binder.currentView().activityDetailsViewModel().attachmentsModel.updateFromServer( currentAct ).then( function( ) {
                Y.fire( 'activityPDFChange', {
                    model: currentAct,
                    mediaId: ''
                } );
                self.updateMediaDocs();
            } );
        },

        onOphthalmologistTmpFileImported: function(content) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentAct = unwrap( binder.currentActivity );

            currentAct.userContent( content );
        },

        /**
         *  Raised when KO template has been set up in the DOM
         */

        onTemplateReady: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity );

            self.jq = {
                'divAttachmentsAdd': $( '#divAttachmentsAdd' ),
                'divMediaContainer': $( '#divMediaContainer' ),
                'hAttachments': $( '#hAttachments ' ),
                'btnTestDocuments': $( '#btnTestDocuments' ),
                'divMediaLockedMsg': $( '#divMediaLockedMsg' )
            };

            self.updateMediaDocs();
            //  TODO: subscribe to currentActivity _id here, since transition may reset randomId

            //  clear the 'save first' tip if activity is not editable
            if( !currentActivity._isEditable() ) {
                self.jq.divMediaLockedMsg.hide();
            }

            self.initFineViewModel();

            if(currentActivity.isNew()){
                //open button modal if created form configurable shortcut menu
                switch( currentActivity.pressButton() ) {
                    case 'scan':
                        if( self.fineViewModel.allowScan ) {
                            self.fineViewModel.onScanClick();
                        }
                        break;
                    case 'camera':
                        if( self.fineViewModel.allowWebcam ) {
                            self.fineViewModel.onWebcamClick();
                        }
                        break;
                }
                currentActivity.pressButton( '' );
            }
        },

        /**
         *  Shortcut method, returns reference to attachmentsViewModel on binder
         */

        getAttachments: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel );

            return activityDetailsVM.attachmentsModel || null;
        },

        /**
         *  Handle document deletion (to be replaced by KO and promises)
         *
         *  @param  doc {Object}    Document viewModel
         */

        deleteAttachment: function( doc ) {

            var
                self = this,
                documentId = unwrap( doc._id ) || '',
                mediaId = unwrap( doc.mediaId ) || '',
                binder = self.get( 'binder' ),
                attachments = self.getAttachments(),
                currentActivity = unwrap( binder.currentActivity );

            if( false === self.canEdit() ) {
                return;
            }

            //  show modal to confirm deletion

            Y.doccirrus.DCWindow.notice( {
                message: i18n( 'InCaseMojit.DocumentViewModel.CONFIRM_DELETE_ATTACHMENT' ),
                window: {
                    id: 'confirmDeleteDocument',
                    width: 'medium',
                    buttons: {
                        footer: [
                            {
                                isDefault: false,
                                label: i18n( 'general.button.CONFIRM' ),
                                action: function() {
                                    onDeleteConfirmed();
                                    this.close();
                                }
                            },
                            {
                                isDefault: true,
                                label: i18n( 'general.button.CANCEL' ),
                                action: function() {
                                    this.close();
                                }
                            }

                        ]
                    }
                }
            } );

            function onDeleteConfirmed() {
                var
                    skipDeleteMediaCall = false;

                if( Y.config.debug ) {
                    Y.log( 'Deleting document and attached media: ' + mediaId, 'debug', NAME );
                }

                //  only allow delete in some states
                if( false === self.canEdit() ) {
                    //Y.doccirus.comctl.setModal('Hinweis', 'Dieser Eintrag ist nicht editierbar.');
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: i18n( 'InCaseMojit.DocumentViewModel.ACTIVITY_NOT_EDITABLE' ),
                        window: {
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM
                        }
                    } );

                    Y.log( 'Not deleting PDF attachment, document cannot be edited in this state.', 'info', NAME );
                    return;
                }

                //Y.doccirrus.comctl.setModal('Bitte warten', '<i>Löschen von Dokumenten</i>');
                //debug, should not be visibloe to user
                doc.caption( 'deleted' );

                async.series(
                    [   // -- start series

                        //  (1) delete document on server if it has been saved there
                        function deleteDocOnServer( itcb ) {
                            if( documentId && '' !== documentId ) {
                                Y.log( 'Deleting document: ' + documentId, 'info', NAME );
                                Y.doccirrus.jsonrpc.api.document.delete( { 'query': { '_id': documentId }, 'deleteFromPractice': true } )
                                    .then( function( response ) {
                                        if( response && response.data && Array.isArray(response.data) && response.data.length ) {
                                            /**
                                             * Means there was a deviceLog found for this attachment and so instead of hard deleting the attachment the
                                             * attachment is unclaimed from activity ("activityId", "attachedTo" and "locationId" updated to "") and the
                                             * corresponding media item in 'media' collection is unclaimed as well ("ownerId" and "ownerCollection" updated to "")
                                             * instead of hard deleting and so we don't need to call the delete media by _id in the next call
                                             */
                                            skipDeleteMediaCall = true;
                                        }
                                        itcb( null );
                                    } )
                                    .fail( function( error ) {
                                        itcb( error );
                                    } );
                            } else {
                                //  document may not have been saved to server
                                return itcb( null );
                            }
                        },

                        //  (2) delete linked media
                        function deleteMediaOnServer( itcb ) {
                            if( mediaId && '' !== mediaId && !skipDeleteMediaCall ) {
                                Y.log( 'Deleting media: ' + mediaId, 'info', NAME );
                                Y.doccirrus.jsonrpc.api.media.delete( { query: { '_id': mediaId } } )
                                    .then( function() {
                                        itcb();
                                    } )
                                    .fail( function( error ) {
                                        itcb( error );
                                    } );
                            } else {
                                return itcb( null );
                            }
                        },

                        //  (3) remove from activity attachments array
                        function removeFromActivity( itcb ) {
                            //  remove from filtered set of expended documents
                            self.mediaDocs.remove( doc );

                            //  remove from epanded set of documents
                            attachments.documents.remove( doc );

                            //  remove from activity attachment array (plain _ids)
                            currentActivity.attachments.remove( unwrap( doc._id ) );

                            //  mark activity as dirty
                            // Y.fire( 'documentUpdated', doc );                             self.mediaDocs.remove( doc );

                            itcb( null );
                        }

                    ],  // -- end series

                    function atLast( err ) {
                        if( err ) {
                            Y.log( 'Error deleting document: ' + JSON.stringify( err ), 'warn', NAME );

                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );

                            // Y.doccirrus.DCWindow.notice( {
                            //     type: 'error',
                            //     message: i18n( 'InCaseMojit.DocumentViewModel.CANNOT_DELETE_DOCUMENT' ),
                            //     window: {
                            //         width: Y.doccirrus.DCWindow.SIZE_MEDIUM
                            //     }
                            // } );
                        }
                    }
                );
            }

        },

        /**
         *  Prototype of Fabric.js eimage edit modal
         */

        editImage: function( doc ) {
            var self = this;

            Y.doccirrus.modals.editImageFabric.show( {
                'document': doc,
                'mediaId': ko.unwrap( doc.mediaId ),
                'ownerCollection': 'activity',
                'ownerId': ko.unwrap( doc.activityId ),
                'onImageSaved': onImageSaved
            } );

            function onImageSaved( newMedia ) {
                self.onMediaUpload( null, newMedia );
            }
        },

        /**
         *  Set the comment on EXTERNAL type activities to reflect set of attached documents
         *  Vestigial: this may be removed in future or replaced with a KO computed
         */

        updateExternComment: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity );

            if( !unwrap( currentActivity.content ) || 'undefined' === unwrap( currentActivity.content ) ) {
                currentActivity.content( '' );
            }
        },

        /**
         *  Files were attached before the activity has been saved
         *
         *  This will cause the attached files to be automatically deleted in 24h if the activity is never saved to
         *  the server.
         *
         *  @param mediaId
         */

        scheduleMediaCleanup: function( mediaId ) {

            function onDeletionScheduled( err ) {
                if( err ) {
                    Y.log( 'Could not schedule media deletion: ' + JSON.stringify( err ), 'warn', NAME );
                }
                if( Y.config.debug ) {
                    Y.log( 'media cleanup scheduled for: ' + JSON.stringify( postData ), 'debug', NAME );
                }
            }

            if( 'object' === typeof mediaId ) {
                mediaId = mediaId[ 0 ];
            }

            var
                postData = {
                    'id': mediaId,
                    'deleteAfter': moment( new Date() ).add( 24, 'hours' ).format()
                };

            // short deletion timeout for testing
            //postData.deleteAfter = moment(new Date()).add(24, 'seconds').format();

            if( Y.config.debug ) {
                Y.log( 'scheduling deletion of media ' + mediaId + ' if activity is not saved: ' + JSON.stringify( postData ) );
            }
            Y.doccirrus.comctl.privatePost( '/1/media/:scheduleDeletion', postData, onDeletionScheduled );

        },

        //  EVENT HANDLERS

        /**
         *  YUI event raised when FinViewModel has uploadeda file
         *
         *  @param  facade      {Object}    Not used
         *  @param  mediaObj    {Object}    See media-schema.common.js
         */

        onMediaUpload: function( facade, mediaObj ) {
            Y.log( 'Received uploaded media to be attached to activity: ' + mediaObj._id + ' facade: ', facade, 'debug', NAME );

            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentPatient = unwrap( binder.currentPatient ),
                attachments = binder.currentView().activityDetailsViewModel().attachmentsModel;

            if ( !currentActivity._isEditable() ) { return; }

            attachments.addDocumentFromMedia( facade, mediaObj, currentActivity, currentPatient );

            if( true === self.canEdit() ) {
                self.updateMediaDocs();
            }
        },

        /**
         *  Copy any changes made to the media's metadata into the document metadata and mark the activity dirty
         *
         *  @param  mediaId     {String}    Id of media item which has been updated
         *  @param  docFields   {Object}    Keys and values for createdOn, caption and Type
         *
         *  TODO: fix
         */

        onDocumentMetaChange: function( mediaId, docFields ) {
            if( Y.config.debug ) {
                Y.log( 'DocumentMetaChange: ' + mediaId + ' ' + JSON.stringify( docFields ), 'debug', NAME );
            }

            var
                self = this,
                attachments = self.getAttachments(),
                currentDoc = attachments.findDocument( mediaId );

            if( !currentDoc ) {
                Y.log( 'Cannot find document corresponding to media ' + mediaId, 'warn', NAME );
                return;
            }

            if( Y.config.debug ) {
                Y.log( 'Setting document fields from attached media: ' + JSON.stringify( docFields ), 'debug', NAME );
            }

            if( docFields.hasOwnProperty( 'docType' ) ) {
                currentDoc.type( docFields.docType );
            }

            if( docFields.hasOwnProperty( 'createdOn' ) ) {
                currentDoc.createdOn( moment( docFields.createdOn, 'DD.MM.YYYY' ).format() );
            }

            //  note that this activity needs to be saved to update the document
            //  (equivalent to _makeDirty in previous version)
            // Y.fire( 'documentUpdated', currentDoc );  //document was changed

            //  update the attachments links in text table of casefile_detail
            //TODO: consider whether there shuld be an analog for this
            //callWhenChanged(attachedMedia);
        }, // onDocumentMetaChange

        onActivityStatusChange: function() {

            var
                self = this,
                currentActivity = unwrap( self.get( 'binder' ).currentActivity ),
                i;

            self.jq.divMediaLockedMsg.hide();

            //  show the file upload controls if not already visible and if attachments can be made
            if( false === self.mediaViewLoaded && currentActivity._isEditable() ) {
                self.openAttachmentsView();
            }

            //  after first save, any documents added using the temp / random Id need to be linked to the new
            //  activity._id

            if( unwrap( currentActivity._id ) && self.useTempId ) {
                for( i = 0; i < currentActivity.attachments.length; i++ ) {
                    if( ko.unwrap( currentActivity.attachments[ i ].activityId ) === currentActivity._randomId ) {
                        currentActivity.attachments[ i ].activityId( unwrap( currentActivity._id ) );
                    }
                    if( ko.unwrap( currentActivity.attachments[ i ].attachedTo ) === currentActivity._randomId ) {
                        currentActivity.attachments[ i ].attachedTo( unwrap( currentActivity._id ) );
                    }
                }
                self.useTempId = false;
            }

            if( currentActivity._isEditable() ) {
                self.jq.divAttachmentsAdd.show();
            } else {
                self.updateMediaDocs();

                self.jq.divAttachmentsAdd.hide();
                //self.jq.divMediaLockedMsg.html( i18n( 'InCaseMojit.DocumentViewModel.MEDIA_LOCKED' ) );
                //self.jq.divMediaLockedMsg.show();
            }
        }, // onActivityStatusChange

        /**
         *  Update the self.mediaDocs observable array with subset of attachments
         */

        updateMediaDocs: function() {

            var
                self = this,
                attachments = self.getAttachments(),
                newMediaDocs = attachments.getMediaDocs();

            if( !self.mediaDocs ) {
                Y.log( 'mediadocs not present at startup', 'warn', NAME );
                return;
            }

            self.mediaDocs( newMediaDocs );
        }
    }, {
        NAME: 'ActivitySectionDocumentViewModel'
    } );

    KoViewModel.registerConstructor( ActivitySectionDocumentViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'ActivitySectionViewModel',
        'dcutils-dynamsoft',

        'dceditimagemodal',

        'FineViewModel',
        'dccamerainputmodal',
        'promise'
    ]
} );