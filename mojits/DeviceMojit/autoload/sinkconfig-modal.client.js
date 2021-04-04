/**
 * User: pi
 * Date: 12/08/15  10:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $ */

'use strict';

YUI.add( 'DCSinkConfigModal', function( Y ) {

        function SinkConfigModal() {

        }

        SinkConfigModal.prototype.showModal = function( data, sinkModelType, callback ) {

            function show() {
                var
                    modal,
                    KoViewModel = Y.doccirrus.KoViewModel,
                    i18n = Y.doccirrus.i18n,
                    TITLE = i18n('DeviceMojit.sinkconfig_modal_clientJS.title.MODAL_TITLE' ) + ": " + data.name,
                    SMB_TEST = i18n('DeviceMojit.sinkconfig_modal_clientJS.button.SMB_TEST' ),
                    node = Y.Node.create( '<div></div>' ),
                    sinkModel = new KoViewModel.createViewModel( {NAME: sinkModelType, config: {
                        data: data
                    } } ),
                    template = "flowSink_modal/" + data.resourceType;

                sinkModel.checkPath = function() {
                    sinkModel.filePath.validate();
                    return true;
                };
                
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    template,
                    'DeviceMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close' ],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    {
                                        name: 'checkSMB',
                                        label: SMB_TEST,
                                        action: function() {

                                            Y.doccirrus.jsonrpc.api.file.testSmb({
                                                query: {
                                                    smbShare: sinkModel.smbShare(),
                                                    smbUser: sinkModel.smbUser(),
                                                    smbPw: sinkModel.smbPw(),
                                                    filePath: sinkModel.filePath(),
                                                    resourceType: 'sink'
                                                },
                                                options: {
                                                    pureLog: true
                                                }
                                            } )
                                                .done(function(){
                                                    Y.doccirrus.DCWindow.notice({
                                                        type: 'success',
                                                        message: 'OK'
                                                    });
                                                })
                                                .fail(function(error){
                                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                });
                                        }
                                    },
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        isDefault: true,
                                        action: function() {
                                            callback( sinkModel.toJSON() );
                                            this.close();
                                        }
                                    } )
                                ]
                            }
                        } );
                        if( 'FlowSinkFileModel' === sinkModelType ) {
                            sinkModel.addDisposable(ko.computed(function(){
                                var
                                    fileType = sinkModel.fileType();
                                if( Y.doccirrus.schemas.file.fileTypes.SMBSHARE === fileType ){
                                    modal.getButton( 'checkSMB' ).show();
                                } else {
                                    modal.getButton( 'checkSMB' ).hide();
                                }
                            }));
                            sinkModel.addDisposable(ko.computed(function(){
                                var
                                    modelValid = sinkModel._isValid(),
                                    okBtn = modal.getButton( 'SAVE' ).button;
                                if( modelValid ){
                                    okBtn.enable();
                                } else {
                                    okBtn.disable();
                                }
                            }));
                        } else {
                            modal.getButton( 'checkSMB' ).hide();
                        }

                        modal.set( 'focusOn', [] );
                        sinkModel.eventNameI18n = i18n( 'v_event-schema.EventName_E.i18n' );
                        sinkModel.fileTypeI18n = i18n( 'file-schema.FileType_E.i18n' );
                        sinkModel.deviceServerI18n = i18n('file-schema.base_File_T.deviceServer.i18n');
                        sinkModel.smbShareExampleI18n = i18n('file-schema.base_File_T.smbShare.example');
                        sinkModel.filePathSinkExampleI18n = i18n('file-schema.base_File_T.filePath.sinkExample');
                        sinkModel.pathExplanationI18n = i18n('file-schema.base_File_T.filePath.pathExplanation');
                        sinkModel.incomingPathI18n = 'Incoming File Dir path';
                        sinkModel.outgoingPathI18n = 'Outgoing File Dir path';
                        sinkModel.devicesI18n = "Devices";
                        ko.applyBindings( sinkModel, node.getDOMNode().querySelector( '#sourceModel' ) );
                        $('[data-toggle="popover"]').popover();
                    }
                );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).sinkConfigModal = new SinkConfigModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'file-schema'
        ]
    }
);
