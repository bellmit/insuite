/*global YUI, ko */

'use strict';

YUI.add( 'dcpreviewtranfermodal', function( Y/*,NAME*/ ) {

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel;

        Y.namespace( 'doccirrus.modals' ).previewTransferModal = {
            show: function( data, callback ) {
                var callbackCalled = false;
                if( 'function' !== typeof callback ) {
                    callback = function(){};
                }

                Y.doccirrus.jsonrpc.api.jade.renderFile( { path: 'PatientTransferMojit/views/tab_new_message' } )
                    .then( function( response ) {
                        return { template: response.data };
                    } )
                    .then( function( templateData ) {
                        var buttons = [
                                Y.doccirrus.DCWindow.getButton( 'CLOSE', {
                                    isDefault: true
                                } )
                            ],
                            dialogModel = new KoViewModel.createViewModel( {
                                NAME: 'MessageViewModel',
                                config: { data: data }
                            } ),
                            template = templateData.template,
                            bodyContent = Y.Node.create( template ),
                            modal,
                            attachedPDFs = (data.attachedMedia || []).filter( function( attachedMedia ) {
                                return attachedMedia.contentType === 'application/pdf';
                            } ).map( function( attachedMedia ) {
                                attachedMedia.timestamp = data.created;
                                attachedMedia.content = attachedMedia.title || attachedMedia.caption;
                                return attachedMedia;
                            } );

                        if( data && Y.doccirrus.schemas.patienttransfer.patientTransferTypes.CANCELED === data.status ) {
                            buttons.unshift( {
                                name: 'resend',
                                label: i18n( 'general.button.RESEND' ),
                                value: 'Resend',
                                action: function() {
                                    dialogModel.handleSendTransfer()
                                        .always( function(){
                                            modal.close();
                                            callbackCalled = true;
                                            callback();
                                        });
                                }
                            } );
                        }

                        if( data.emailType === 'KIM' && attachedPDFs.length ) {
                            buttons.unshift( Y.doccirrus.DCWindow.getButton( 'OK', {
                                label: i18n( 'InCaseMojit.casefile_nav.tab_kim.verifySignatureBtnText' ),
                                action: function() {
                                    Y.doccirrus.modals.kimVerifySignatureModal.show( {attachedMedia: attachedPDFs} );
                                }
                            } ) );
                        }

                        modal = new Y.doccirrus.DCWindow( {// jshint ignore:line
                            className: 'DCWindow-tab_roles',
                            bodyContent: bodyContent,
                            title: i18n( 'PatientTransferMojit.dialog.transfer_details.title' ),
                            width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            height: Y.doccirrus.DCWindow.SIZE_LARGE,
                            minHeight: Y.doccirrus.DCWindow.SIZE_LARGE,
                            minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close' ],
                                footer: buttons
                            },
                            after: {
                                destroy: function(){
                                    if(data.emailType === 'KIM' && data.status === 'NEW') {
                                        Promise.resolve(Y.doccirrus.jsonrpc.api.patienttransfer.put( {
                                            data: { status: 'READ' },
                                            query: { _id: data._id },
                                            fields: ['status']
                                        } ).then(function() {
                                            if(!callbackCalled) {
                                                callback();
                                            }
                                        }));
                                    }
                                }
                            }
                        } );

                        dialogModel.updateReadOnly();
                        dialogModel.newMessageWhenI18n = i18n( 'PatientTransferMojit.NewMessage.when' );
                        dialogModel.newMessageWhoI18n = i18n( 'PatientTransferMojit.NewMessage.who' );
                        dialogModel.newMessageSubjectI18n = i18n( 'PatientTransferMojit.NewMessage.subject' );
                        dialogModel.newMessageContentI18n = i18n( 'PatientTransferMojit.NewMessage.content' );
                        dialogModel.newMessageSendI18n = i18n( 'PatientTransferMojit.NewMessage.send' );
                        ko.applyBindings( dialogModel, bodyContent.getDOMNode() );
                    } );
            }
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'template',
            'MessageViewModel'
        ]
    }
);