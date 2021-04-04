/*global YUI, ko */

'use strict';

YUI.add( 'downloadattachmentsmodal', function( Y /*NAME*/ ) {
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n;

        /**
         * ActivitiesAttachmentsViewModel
         * @param config
         * @constructor
         */
        function ActivitiesAttachmentsViewModel( config ) {
            ActivitiesAttachmentsViewModel.superclass.constructor.call( this, config );
        }

        ActivitiesAttachmentsViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( ActivitiesAttachmentsViewModel, KoViewModel.getBase(), {

                initializer: function ActivitiesAttachmentsViewModel_initializer( config ) {
                    var
                        self = this;
                    self.fileNames = ko.observableArray( config );
                },
                destructor: function ActivitiesAttachmentsViewModel_destructor() {
                }
            },
            {
                NAME: 'ActivitiesAttachmentsViewModel'
            }
        );

        KoViewModel.registerConstructor( ActivitiesAttachmentsViewModel );

        function getTemplate( node, data, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'download_attachments_modal',
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
                    fileNames = data && data.fileNames || [],
                    model = new ActivitiesAttachmentsViewModel( fileNames ),
                    modal;
                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-DownloadAttachments',
                    bodyContent: node,
                    title: i18n( 'InCaseMojit.download_attachments_modal_clientJS.title.MODAL_TITLE' ),
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
                            {
                                label: i18n( 'InCaseMojit.download_attachments_modal_clientJS.text.DOWNLOAD' ),
                                name: 'DOWNLOAD',
                                value: 'DOWNLOAD',
                                isDefault: true,
                                action: function onDownloadButtonClicked() {
                                    Y.doccirrus.modals.exportPatientAttachments.show( {
                                        zipId: data.zipId
                                    } );
                                    modal.close();
                                }
                            }
                        ]
                    }
                } );

                ko.applyBindings( model , node.getDOMNode() );

            } );
        }

        Y.namespace( 'doccirrus.modals' ).downloadAttachments = {
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
