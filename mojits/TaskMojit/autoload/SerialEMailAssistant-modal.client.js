'use strict';

/*global YUI, ko, $, Promise */

YUI.add( 'SerialEMailAssistantModal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n;

        function SerialEMailAssistantModal() {
            var self = this;

            function makePatientLink( data ) {
                return ['<a href="incase#/patient/', data.patientId, '" target="_blank">', data.patientName || data.patientId, '</a>'].join( '' );
            }

            function notifiyUser( errors, sentMails ) {
                var content = i18n( 'TaskMojit.SerialEMailModal.successMessage', {
                        data: {
                            num: sentMails.length,
                            of: errors.length + sentMails.length,
                            typeOfRecipients: i18n( 'general.PAGE_TITLE.PATIENTS' )
                        }
                    } ),
                    errorContent = i18n( 'TaskMojit.SerialEMailModal.errorMessage', {
                        data: {
                            typeOfRecipients: i18n( 'general.PAGE_TITLE.PATIENTS' )
                        }
                    } );

                if( sentMails.length ) {
                    content += '\n' + sentMails.map( makePatientLink ).join( '\n' );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'mailActivitiesMessage',
                        content: content
                    } );
                }

                if( errors.length ) {
                    errorContent += '\n' + errors.map( makePatientLink ).join( '\n' );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'mailActivitiesMessageError',
                        content: errorContent,
                        level: 'ERROR'
                    } );
                }
            }

            Y.doccirrus.communication.on( {
                event: 'onSerialEMailComplete',
                done: function onSerialEMailComplete( message ) {
                    var
                        result = message.data && message.data[0],
                        serverRequestId = result && result.requestId,
                        clientRequestId = self && self.serialEMailModel && self.serialEMailModel.requestId,
                        messageData = result && result.data,
                        step1Errors = messageData && messageData.errors || [],
                        additionalData = result && result.additionalData,
                        data = {
                            senderEmail: additionalData && additionalData.senderEmail,
                            content: additionalData && additionalData.emailContent,
                            subject: additionalData && additionalData.subject,
                            currentLocationId: additionalData && additionalData.locationId,
                            origin: additionalData && additionalData.origin,
                            patientIds: []
                        },
                        patientId;

                    if( !serverRequestId || serverRequestId !== clientRequestId ) {
                        Y.log( 'onSerialEMailComplete: server and client id not match ' + serverRequestId + ' ' + clientRequestId, 'info', NAME );
                        return;
                    }

                    data.mediaIds = messageData && messageData.mediaIds && messageData.mediaIds.map( function( mediaId ) {
                        return mediaId;
                    } );

                    for( patientId in (messageData && messageData.patients) ) {
                        if( patientId !== undefined && messageData.patients.hasOwnProperty( patientId ) ) {
                            data.patientIds.push( patientId );
                        }
                    }
                    Promise.resolve( Y.doccirrus.jsonrpc.api.activity.sendEmailsFromPatientId( {
                        data: data
                    } ) ).then( function( res ) {
                        var step2Errors = (res && res.data && Array.isArray( res.data.errors )) ? res.data.errors : [],
                            sentEmails = (res && res.data && Array.isArray( res.data.sentEmails )) ? res.data.sentEmails : [];
                        notifiyUser( step1Errors.concat( step2Errors ), sentEmails );
                    } ).catch( function( err ) {
                        Y.log( 'sendEmailsFromPatientId failed: ' + err, 'warn', NAME );
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'mailActivitiesError',
                            content: JSON.stringify( err ),
                            level: 'ERROR'
                        } );
                    } );
                },
                handlerId: 'TaskMojit_onSerialEMailComplete'
            } );

            Y.doccirrus.communication.on( {
                event: 'onSerialEMailError',
                done: function onSerialEMailError( message ) {
                    var result = message.data && message.data[0],
                        serverRequestId = result && result.requestId,
                        clientRequestId = self && self.serialEMailModel && self.serialEMailModel.requestId,
                        errorMessage = message && message.data && Array.isArray( message.data ) && message.data[0] && message.data[0].error && message.data[0].error.message;

                    if( !serverRequestId || serverRequestId !== clientRequestId ) {
                        Y.log( 'onSerialEMailError: server and client id not match ' + serverRequestId + ' ' + clientRequestId, 'info', NAME );
                        return;
                    }

                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'mailActivitiesError',
                        content: errorMessage,
                        level: 'ERROR'
                    } );
                },
                handlerId: 'TaskMojit_onSerialEMailError'
            } );
        }

        /**
         * @param {String} modalData.origin - CONTACTS || TASK || CALENDAR
         * @param {Array} [modalData.selectedPatientsIds]
         * @param {Array} [modalData.selectedPatients]
         * @param {Array} [modalData.selectedContacts]
         * @param {Array} [modalData.selectedContactsIds]
         * @param {Array} modalData.locations
         * @param {Array} modalData.employee
         * @param {Array} [modalData] specialitiesList - necessary for contacts branch, optional for the rest
         */
        SerialEMailAssistantModal.prototype.show = function( modalData/*, callback*/ ) {
            var origin = modalData.origin || "TASKS";
            var self = this;

            Promise.all( [
                Y.doccirrus.jsonrpc.api.jade.renderFile( {path: 'TaskMojit/views/SerialEMailAssistant-modal'} )
            ] ).then( function( response ) {
                return {template: response[0].data};
            } ).then( function( data ) {
                var
                    template = data.template,
                    modal,
                    bodyContent = Y.Node.create( template ),

                    SerialEMailModel = Y.doccirrus.KoViewModel.createViewModel( {
                        NAME: 'SerialEMailAssistantViewModel',
                        config: modalData
                    } );
                self.serialEMailModel = SerialEMailModel;

                //  clear any previous PDF download
                SerialEMailModel.pdfFile( '' );
                SerialEMailModel.step0TitleI18n = i18n( 'TaskMojit.SerialEMailModal.steps.STEP_0.title' );
                SerialEMailModel.step1TitleI18n = i18n( 'TaskMojit.SerialEMailModal.steps.STEP_1.title' );
                SerialEMailModel.step2TitleI18n = i18n( 'TaskMojit.SerialEMailModal.steps.STEP_2.title' );
                SerialEMailModel.step2HintI18n = i18n( 'TaskMojit.SerialEMailModal.steps.STEP_2.hint' );
                SerialEMailModel.step2TextI18n = i18n( 'TaskMojit.SerialEMailModal.steps.STEP_2.text' );
                SerialEMailModel.step3TitleI18n = i18n( 'TaskMojit.SerialEMailModal.steps.STEP_3.title' );
                SerialEMailModel.step3ForEachPatientI18n = i18n( 'TaskMojit.SerialEMailModal.steps.STEP_3.label.FOR_EACH_PATIENT' );
                SerialEMailModel.step3caseFolderI18n = i18n( 'tasktemplate-schema.TaskTemplate_T.caseFolder.i18n' );
                SerialEMailModel.step3HintI18n = i18n( 'TaskMojit.SerialEMailModal.steps.STEP_3.hint' );
                SerialEMailModel.step3Text1I18n = i18n( 'TaskMojit.SerialEMailModal.steps.STEP_3.text_1' );
                SerialEMailModel.step3Text2I18n = i18n( 'TaskMojit.SerialEMailModal.steps.STEP_3.text_2' );
                SerialEMailModel.step3Text3I18n = i18n( 'TaskMojit.SerialEMailModal.steps.STEP_3.text_3' );

                SerialEMailModel.locationTemplateI18n = i18n( 'InCaseMojit.mailActivities.LOCATION_TEMPLATE' );
                SerialEMailModel.senderI18n = i18n( 'InCaseMojit.mailActivities.SENDER' );
                SerialEMailModel.senderEmailI18n = i18n( 'InCaseMojit.mailActivities.SENDER_EMAIL' );
                SerialEMailModel.subjectI18n = i18n( 'IntouchPrivateMojit.inviteparticipant_modal.placeholder.SUBJECT' );
                SerialEMailModel.titleMessageI18n = i18n( 'general.title.MESSAGE' );
                SerialEMailModel.documentForI18n = i18n( 'TaskMojit.SerialEMailModal.steps.STEP_3.label.DOCUMENT_FOR' );

                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-SerialEMailAssistantModal',
                    bodyContent: bodyContent,
                    title: i18n( 'TaskMojit.SerialEMailModal.title.' + origin ),
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    height: "90%",
                    width: "90%",
                    centered: true,
                    focusOn: [],
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            {
                                name: 'PREVIOUS',
                                label: i18n( 'TaskMojit.SerialEMailModal.footer.buttons.PREVIOUS' ),
                                icon: Y.doccirrus.DCWindow.CHEVRON_LEFT,
                                action: function() {
                                    SerialEMailModel.prevStep();
                                }
                            },
                            {
                                name: 'NEXT',
                                label: i18n( 'TaskMojit.SerialEMailModal.footer.buttons.NEXT' ),
                                isDefault: true,
                                action: function() {
                                    SerialEMailModel.nextStep();
                                }
                            },
                            Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                label: i18n( 'TaskMojit.SerialEMailModal.footer.buttons.SAVE' ),
                                isDefault: true,
                                action: function() {
                                    SerialEMailModel.save( {origin: origin} )
                                        .done( function() {
                                            modal.close();
                                        } )
                                        .fail( function( error ) {
                                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                        } );
                                }
                            } )
                        ]
                    },
                    after: {
                        visibleChange: function( event ) {
                            if( !event.newVal ) {
                                ko.cleanNode( bodyContent.getDOMNode() );
                                SerialEMailModel.destroy();
                            }
                        }
                    }
                } );

                SerialEMailModel.addDisposable( ko.computed( function() {
                    var
                        PREV = modal.getButton( 'PREVIOUS' ).button,
                        NEXT = modal.getButton( 'NEXT' ).button,
                        SAVE = modal.getButton( 'SAVE' ).button,
                        isPrevEnabled = SerialEMailModel.isPreviousButtonEnabled(),
                        isValid = SerialEMailModel.isValid();

                    if( isValid ) {
                        NEXT.enable();
                        SAVE.enable();
                    } else {
                        NEXT.disable();
                        SAVE.disable();
                    }

                    if( isPrevEnabled ) {
                        PREV.enable();
                    } else {
                        PREV.disable();
                    }

                    switch( origin ) {
                        case 'CONTACTS':
                            switch( SerialEMailModel.getCurrentStep() ) {
                                case 0:
                                    $( modal.getButton( 'CANCEL' )._node ).show();
                                    $( modal.getButton( 'NEXT' )._node ).show();
                                    $( modal.getButton( 'PREVIOUS' )._node ).hide();
                                    $( modal.getButton( 'SAVE' )._node ).hide();
                                    break;
                                case 1:
                                    $( modal.getButton( 'CANCEL' )._node ).show();
                                    $( modal.getButton( 'NEXT' )._node ).hide();
                                    $( modal.getButton( 'PREVIOUS' )._node ).show();
                                    $( modal.getButton( 'SAVE' )._node ).show();
                                    break;
                            }
                            break;
                        default:
                            switch( SerialEMailModel.getCurrentStep() ) {
                                case 0:
                                    $( modal.getButton( 'CANCEL' )._node ).show();
                                    $( modal.getButton( 'NEXT' )._node ).show();
                                    $( modal.getButton( 'PREVIOUS' )._node ).hide();
                                    $( modal.getButton( 'SAVE' )._node ).hide();
                                    break;
                                case 1:
                                    $( modal.getButton( 'CANCEL' )._node ).show();
                                    $( modal.getButton( 'NEXT' )._node ).show();
                                    $( modal.getButton( 'PREVIOUS' )._node ).show();
                                    $( modal.getButton( 'SAVE' )._node ).hide();
                                    break;
                                case 2:
                                    $( modal.getButton( 'CANCEL' )._node ).show();
                                    $( modal.getButton( 'NEXT' )._node ).hide();
                                    $( modal.getButton( 'PREVIOUS' )._node ).show();
                                    $( modal.getButton( 'SAVE' )._node ).show();
                                    break;
                            }
                            break;
                    }
                } ) );

                //  apply model
                ko.applyBindings( SerialEMailModel, bodyContent.getDOMNode() );

                //  reposition form control edit layer
                var
                    jqFloatEditor = $( '#divFloatEditor' ),
                    modalOffset = jqFloatEditor.offset();

                jqFloatEditor
                    .css( 'position', 'relative' )
                    .css( 'background-color', 'rgba(100,0,0,0.3)' )
                    .css( 'left', -1 * modalOffset.left )
                    .css( 'top', (-1 * modalOffset.top) + adjustBootstrapHeader() );

            } ).catch( Y.doccirrus.promise.catchUnhandled );
        };

        function adjustBootstrapHeader() {
            var navHeader = $( '#NavBarHeader' );
            if( navHeader[0] && navHeader.hasClass( 'NavBarHeader-fixed' ) ) {
                return navHeader.height();
            }
            return 0;
        }

        Y.namespace( 'doccirrus.modals' ).serialEMailAssistantModal = new SerialEMailAssistantModal();

    }, '0.0.1', {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'KoUI-all',
            'SerialEMailAssistantViewModel'
        ]
    }
);
