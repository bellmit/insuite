/**
 * User: pi
 * Date: 12/08/15  10:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $ */

'use strict';

YUI.add( 'DCSourceConfigModal', function( Y ) {

        function SourceConfigModal() {

        }

        SourceConfigModal.prototype.showModal = function( data, sourceModelType, callback ) {

            function show() {
                var
                    modal,
                    KoViewModel = Y.doccirrus.KoViewModel,
                    node = Y.Node.create( '<div></div>' ),
                    i18n = Y.doccirrus.i18n,
                    TITLE = i18n('DeviceMojit.sourceconfig_modal_clientJS.title.MODAL_TITLE' ) + ": " + data.name,
                    SMB_TEST = i18n('DeviceMojit.sinkconfig_modal_clientJS.button.SMB_TEST' ),
                    REGEXP_ERR = i18n('file-schema.base_File_T.filter.error' ),
                    sourceModel = new KoViewModel.createViewModel( {NAME: sourceModelType, config: {
                        data: data
                    }} ),
                    template = "flowSource_modal/" + data.resourceType;

                if( sourceModel.filter ) {
                    sourceModel.filter.hasErrorRegex = ko.observable( false );
                    sourceModel.filter.validationMessagesRegex = ko.observable( "" );
                    sourceModel.filter.subscribe( function( val ) {
                        try {
                            new RegExp( val, "g" ); //jshint ignore:line
                            sourceModel.filter.hasErrorRegex( false );
                            sourceModel.filter.validationMessagesRegex( [] );
                        } catch( e ) {
                            var msg = e.message;
                            var stdErrMsg = "Invalid regular expression: ";
                            if( 0 === msg.indexOf( "Invalid regular expression: " ) ) {
                                msg = msg.substr( stdErrMsg.length );
                            }
                            sourceModel.filter.hasErrorRegex( true );
                            sourceModel.filter.validationMessagesRegex( [ REGEXP_ERR, msg ] );
                        }
                    } );
                }

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
                                                    smbShare: sourceModel.smbShare(),
                                                    smbUser: sourceModel.smbUser(),
                                                    smbPw: sourceModel.smbPw(),
                                                    filePath: sourceModel.filePath(),
                                                    resourceType: 'source'
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
                                            callback( sourceModel.toJSON() );
                                            this.close();
                                        }
                                    } )
                                ]
                            }
                        } );

                        if( 'FlowSourceFileModel' === sourceModelType ) {
                            sourceModel.addDisposable(ko.computed(function(){
                                var
                                    fileType = sourceModel.fileType();
                                if( Y.doccirrus.schemas.file.fileTypes.SMBSHARE === fileType ){
                                    modal.getButton( 'checkSMB' ).show();
                                } else {
                                    modal.getButton( 'checkSMB' ).hide();
                                }
                            }));
                            sourceModel.addDisposable(ko.computed(function(){
                                var
                                    modelValid = sourceModel._isValid(),
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
                        sourceModel.triggerManuallyI18n = i18n('file-schema.base_File_T.triggerManually.i18n');
                        sourceModel.keepFilesI18n = i18n('file-schema.base_File_T.keepFiles.i18n');
                        sourceModel.fileTypeI18n = i18n( 'file-schema.FileType_E.i18n' );
                        sourceModel.smbShareExampleI18n = i18n('file-schema.base_File_T.smbShare.example');
                        sourceModel.filePathSourceExampleI18n = i18n('file-schema.base_File_T.filePath.sourceExample');
                        sourceModel.filterExampleI18n = i18n('file-schema.base_File_T.filter.example');
                        sourceModel.popoverTitleI18n = i18n( 'file-schema.base_File_T.filter.popoverTitle' );
                        sourceModel.filterPopoverI18n = i18n( 'file-schema.base_File_T.filter.popover' );
                        sourceModel.deviceServerI18n = i18n( 'file-schema.base_File_T.deviceServer.i18n' );
                        ko.applyBindings( sourceModel, node.getDOMNode().querySelector( '#sourceModel' ) );
                        $('[data-toggle="popover"]').popover();
                    }
                );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).sourceConfigModal = new SourceConfigModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel'
        ]
    }
);
