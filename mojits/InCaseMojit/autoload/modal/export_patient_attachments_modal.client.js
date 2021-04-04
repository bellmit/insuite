/*global YUI, ko */

'use strict';

YUI.add( 'exportpatientattachmentsmodal', function( Y /*NAME*/ ) {
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n;

        /**
         * PatientAttachmentsViewModel
         * @param config
         * @constructor
         */
        function PatientAttachmentsViewModel( config ) {
            PatientAttachmentsViewModel.superclass.constructor.call( this, config );
        }

        PatientAttachmentsViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( PatientAttachmentsViewModel, KoViewModel.getBase(), {

                initializer: function PatientAttachmentsViewModel_initializer() {
                    var
                        self = this;
                    self.textI18n = i18n( 'InCaseMojit.export_patient_attachments_modal_clientJS.text.TEXT' );
                },
                destructor: function PatientAttachmentsViewModel_destructor() {
                }
            },
            {
                NAME: 'PatientAttachmentsViewModel'
            }
        );

        KoViewModel.registerConstructor( PatientAttachmentsViewModel );

        function getTemplate( node, data, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'export_patient_attachments_modal',
                'InCaseMojit',
                data,
                node,
                callback
            );
        }

        function show( data ) {
            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, data, function() {
                var
                    model = new PatientAttachmentsViewModel(),
                    modal;
                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-ExportAttachments',
                    bodyContent: node,
                    title: i18n( 'InCaseMojit.export_patient_attachments_modal_clientJS.title.MODAL_TITLE' ),
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: '650px',
                    minHeight: Y.doccirrus.DCWindow.SIZE_LARGE,
                    minWidth: Y.doccirrus.DCWindow.SIZE_SMALL,
                    resizeable: false,
                    centered: true,
                    focusOn: [],
                    modal: true,
                    visible: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function onDownloadButtonClicked() {
                                    modal.close();
                                    var
                                        dnLink = document.getElementById('aDownloadHelperPDF');
                                    if ( !data.zipId ) { return; }
                                    dnLink.setAttribute( 'href', Y.doccirrus.infras.getPrivateURL( '/zip/' + data.zipId + '.zip' ) );
                                    dnLink.setAttribute( 'download', data.zipId );
                                    dnLink.click();
                                }
                            } )
                        ]
                    }
                } );

                ko.applyBindings( model , node.getDOMNode() );

            } );
        }

        Y.namespace( 'doccirrus.modals' ).exportPatientAttachments = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'DCWindow',
            'dcforms-roles'
        ]
    }
);
