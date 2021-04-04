/**
 * User: pi
 * Date: 03/12/15  16:35
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

'use strict';

YUI.add( 'FindingModel', function( Y, NAME ) {
        /**
         * @module FindingModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' );

        /**
         * @class FindingModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function FindingModel( config ) {
            FindingModel.superclass.constructor.call( this, config );
        }

        FindingModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( FindingModel, FormBasedActivityModel, {

                updateActivityAttachmentsInPacsHandler: null,

                initializer: function FindingModel_initializer() {
                    var
                        self = this;

                    self.initFindingModel();
                },

                destructor: function FindingModel_destructor() {
                    if( this.updateActivityAttachmentsInPacsHandler ) {
                        this.updateActivityAttachmentsInPacsHandler.removeEventListener();
                        this.updateActivityAttachmentsInPacsHandler = null;
                    }
                },

                initFindingModel: function FindingModel_initFindingModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        updateActivityAttachmentQueue = {isRunning: false, responseArr : []};

                    self.updateActivityAttachmentsInPacsHandler = Y.doccirrus.communication.on( {
                        event: 'updateActivityAttachmentsInPacs',
                        done: function( response ) {
                            if(updateActivityAttachmentQueue.isRunning) {
                                updateActivityAttachmentQueue.responseArr.push(response);
                            } else {
                                handleResponse(response);
                            }

                            function checkQueueAndCallHandler() {
                                if(updateActivityAttachmentQueue.responseArr.length) {
                                    handleResponse(updateActivityAttachmentQueue.responseArr.shift());
                                } else {
                                    updateActivityAttachmentQueue.isRunning = false;
                                }
                            }

                            function handleResponse(updatedActivityResponse) {
                                updateActivityAttachmentQueue.isRunning = true;

                                var
                                    data = updatedActivityResponse.data && updatedActivityResponse.data[0],
                                    caseFileVM = ko.unwrap( binder.currentView ),
                                    activityDetailsVM = ko.unwrap( caseFileVM.activityDetailsViewModel ),
                                    isInitialModified = self.isModified(),
                                    userContent = ko.unwrap( self.userContent ) || '',
                                    arrivedContent,
                                    newUserContent;

                                if(data && data.error) {
                                    checkQueueAndCallHandler();
                                    return;
                                }

                                if( data && data.activity && data.activity.ONLY_G_EXTRA === "ONLY_G_EXTRA" && data.activity._id === ko.unwrap( self._id ) && data.activity.g_extra ) {
                                    self.set( 'data.g_extra', data.activity.g_extra );
                                    if( caseFileVM.activitiesTable ) {
                                        caseFileVM.activitiesTable.reload();
                                    }

                                    checkQueueAndCallHandler();
                                } else if( data && data.activity && data.activity._id === ko.unwrap( self._id ) ) {

                                    if( !activityDetailsVM.attachmentsModel.documents || !data.activity.insertedDocument) {
                                        checkQueueAndCallHandler();
                                        return;
                                    }

                                    if( data.activity.attachments ) {
                                        Y.log( 'new attachments: ' + JSON.stringify( data.activity.attachments ), 'debug', NAME );
                                        self.set( 'data.attachments',  data.activity.attachments);
                                    }

                                    var newDocModel = new KoViewModel.createViewModel( {
                                        NAME: 'DocumentModel',
                                        config: { data: data.activity.insertedDocument, tagInitList: activityDetailsVM.attachmentsModel.tagInitList }
                                    } );


                                    activityDetailsVM.attachmentsModel.documents.push( newDocModel );

                                    self.set( 'data.g_extra', data.activity.g_extra );

                                    arrivedContent = data.activity.userContent || '';

                                    // Update only when we have what to set
                                    if( arrivedContent ) {

                                        // If user content exist, combine with new arrived content
                                        // else set content with the arrived
                                        if( userContent ) {
                                            newUserContent = userContent + '\n' + arrivedContent;
                                        } else {
                                            newUserContent = arrivedContent;
                                        }

                                        if( isInitialModified ) {
                                            self.userContent( newUserContent );
                                        } else if( newUserContent ) {
                                            self.set( 'data.userContent', newUserContent );
                                            self.setNotModified();
                                        }
                                    }

                                    if( caseFileVM.activitiesTable ) {
                                        caseFileVM.activitiesTable.reload();
                                    }

                                    checkQueueAndCallHandler();
                                } else {
                                    checkQueueAndCallHandler();
                                }
                            }
                        }
                    } );
                }
            },
            {
                schemaName: 'v_finding',
                NAME: 'FindingModel'
            }
        );
        KoViewModel.registerConstructor( FindingModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'v_finding-schema'
        ]
    }
);