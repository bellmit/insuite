'use strict';

/*global YUI, ko, $, Promise */

YUI.add( 'SerialLetterAssistantModal', function( Y ) {

        var
            i18n = Y.doccirrus.i18n;

        function SerialLetterAssistantModal() {

        }

        SerialLetterAssistantModal.prototype.show = function( modalData/*, callback*/ ) {

            Promise.all( [
                Y.doccirrus.jsonrpc.api.jade.renderFile( { path: 'TaskMojit/views/SerialLetterAssistant-modal' } )
            ] ).then( function( response ) {
                return { template: response[0].data };
            } ).then( function( data ) {
                var
                    template = data.template,
                    modal,
                    bodyContent = Y.Node.create( template ),
                    serialLetterModel = Y.doccirrus.KoViewModel.createViewModel( {
                        NAME: 'SerialLetterAssistantViewModel',
                        config: {
                            selectedPatientsIds: modalData.selectedPatientsIds,
                            locations: modalData.locations,
                            employee: modalData.employee
                        }
                    } );

                //  clear any previous PDF download
                serialLetterModel.pdfFile( '' );
                serialLetterModel.step1TitleI18n = i18n( 'TaskMojit.SerialLetterModal.steps.STEP_1.title' );
                serialLetterModel.step2TitleI18n = i18n( 'TaskMojit.SerialLetterModal.steps.STEP_2.title' );
                serialLetterModel.step2HintI18n = i18n( 'TaskMojit.SerialLetterModal.steps.STEP_2.hint' );
                serialLetterModel.step2TextI18n = i18n( 'TaskMojit.SerialLetterModal.steps.STEP_2.text' );
                serialLetterModel.step3TitleI18n = i18n( 'TaskMojit.SerialLetterModal.steps.STEP_3.title' );
                serialLetterModel.step3ForEachPatientI18n = i18n( 'TaskMojit.SerialLetterModal.steps.STEP_3.label.FOR_EACH_PATIENT' );
                serialLetterModel.step3caseFolderI18n = i18n( 'tasktemplate-schema.TaskTemplate_T.caseFolder.i18n' );
                serialLetterModel.step3HintI18n = i18n( 'TaskMojit.SerialLetterModal.steps.STEP_3.hint' );
                serialLetterModel.step3Text1I18n = i18n( 'TaskMojit.SerialLetterModal.steps.STEP_3.text_1' );
                serialLetterModel.step3Text2I18n = i18n( 'TaskMojit.SerialLetterModal.steps.STEP_3.text_2' );
                serialLetterModel.documentForI18n = i18n( 'TaskMojit.SerialLetterModal.steps.STEP_3.label.DOCUMENT_FOR' );
                serialLetterModel.step3Text3I18n = i18n( 'TaskMojit.SerialLetterModal.steps.STEP_3.text_3' );

                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-SerialLetterAssistantModal',
                    bodyContent: bodyContent,
                    title: i18n( 'TaskMojit.SerialLetterModal.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    height: "90%",
                    width: "80%",
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
                                label: i18n( 'TaskMojit.SerialLetterModal.footer.buttons.PREVIOUS' ),
                                icon: Y.doccirrus.DCWindow.CHEVRON_LEFT,
                                action: function() {
                                    serialLetterModel.prevStep();
                                }
                            },
                            {
                                name: 'NEXT',
                                label: i18n( 'TaskMojit.SerialLetterModal.footer.buttons.NEXT' ),
                                isDefault: true,
                                action: function() {
                                    serialLetterModel.nextStep();
                                }
                            },
                            Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                label: i18n( 'TaskMojit.SerialLetterModal.footer.buttons.SAVE' ),
                                isDefault: true,
                                action: function() {
                                    serialLetterModel.save()
                                        .done( function() {
                                            serialLetterModel.nextStep();
                                        } )
                                        .fail( function( error ) {
                                            serialLetterModel.nextStep();
                                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                        } );
                                    serialLetterModel.nextStep();
                                }
                            } ),
                            {
                                name: 'PRINT',
                                label: i18n( 'DCWindow.BUTTONS.PRINT' ),
                                action: function() {
                                    serialLetterModel.openPrintDialog();
                                }
                            },
                            {
                                name: 'ZIP',
                                label: 'ZIP',
                                action: function() {
                                    serialLetterModel.downloadZip();
                                }
                            }
                        ]
                    },
                    after: {
                        visibleChange: function( event ) {
                            if( !event.newVal ) {
                                ko.cleanNode( bodyContent.getDOMNode() );
                                serialLetterModel.destroy();
                            }
                        }
                    }
                } );

                serialLetterModel.addDisposable( ko.computed( function() {
                    var
                        PREV = modal.getButton( 'PREVIOUS' ).button,
                        NEXT = modal.getButton( 'NEXT' ).button,
                        isSubmitStep = serialLetterModel.getCurrentStep() === 2,
                        isLastStep = serialLetterModel.isLastStep(),
                        isPrevEnabled = serialLetterModel.isPreviousButtonEnabled(),
                        isValid = serialLetterModel.isValid();

                    if( serialLetterModel.getIsWaitingForPDF() ) {
                        $( modal.getButton( 'NEXT' )._node ).hide();
                        $( modal.getButton( 'SAVE' )._node ).hide();
                        $( modal.getButton( 'PREVIOUS' )._node ).hide();
                        $( modal.getButton( 'CANCEL' )._node ).hide();
                    } else if( isLastStep ) {
                        $( modal.getButton( 'NEXT' )._node ).hide();
                        $( modal.getButton( 'SAVE' )._node ).hide();
                        $( modal.getButton( 'PREVIOUS' )._node ).hide();
                        $( modal.getButton( 'CANCEL' )._node ).show();
                    } else {
                        $( modal.getButton( 'NEXT' )._node ).toggle( !isSubmitStep );
                        $( modal.getButton( 'SAVE' )._node ).toggle( isSubmitStep );

                        if( isValid ) {
                            NEXT.enable();
                        } else {
                            NEXT.disable();
                        }

                        if( isPrevEnabled ) {
                            PREV.enable();
                        }
                        else {
                            PREV.disable();
                        }
                    }

                    if( '' === serialLetterModel.pdfFile() ) {
                        $( modal.getButton( 'PRINT' )._node ).hide();
                    } else {
                        $( modal.getButton( 'PRINT' )._node ).show();
                    }

                    if( '' === serialLetterModel.zipId() ) {
                        $( modal.getButton( 'ZIP' )._node ).hide();
                    } else {
                        $( modal.getButton( 'ZIP' )._node ).show();
                    }

                } ) );

                //  apply model
                ko.applyBindings( serialLetterModel, bodyContent.getDOMNode() );

                //  reposition form control edit layer
                var
                    jqFloatEditor = $( '#divFloatEditor' ),
                    modalOffset = jqFloatEditor.offset();

                jqFloatEditor
                    .css( 'position', 'relative' )
                    .css( 'background-color', 'rgba(100,0,0,0.3)' )
                    .css( 'left', -1 * modalOffset.left )
                    .css( 'top', ( -1 * modalOffset.top ) + adjustBootstrapHeader() );

            } ).catch( Y.doccirrus.promise.catchUnhandled );
        };

        function adjustBootstrapHeader() {
            var navHeader = $( '#NavBarHeader' );
            if( navHeader[0] && navHeader.hasClass( 'NavBarHeader-fixed' ) ) {
                return navHeader.height();
            }
            return 0;
        }

        Y.namespace( 'doccirrus.modals' ).serialLetterAssistantModal = new SerialLetterAssistantModal();

    }, '0.0.1', {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'KoUI-all',
            'SerialLetterAssistantViewModel'
        ]
    }
);
