/**
 * User: maximilian.kramp
 * Date: 08.10.19  09:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'dc-labLogFileView', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel;

        function FileViewModal( config ) {
            FileViewModal.superclass.constructor.call( this, config );
        }

        Y.extend( FileViewModal, KoViewModel.getDisposable(), {
            destructor: function() {
            },

            initializer: function() {
            }
        } );

        function Modal() {
        }

        Modal.prototype.show = function( data, callback ) {
            var modal,
                node = Y.Node.create( '<div></div>' ),
                footer = [
                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                        label: i18n( 'InCaseMojit.medication_modalJS.button.CANCEL' )
                    } )
                ];

            if( data && data.assignedPatient && !data.assignedPatient.patientId ) {
                footer.push( Y.doccirrus.DCWindow.getButton( 'SAVE', {
                    isDefault: true,
                    label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assign' ),
                    action: function() {
                        modal.close();
                        Y.doccirrus.modals.assignLabLogData.showDialog( data, callback );
                    }
                } ) );

            }

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'tab_file',
                'LabLogMojit',
                {
                    file: data,
                    isModal: true
                },
                node,
                function() {
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-Appointment',
                        bodyContent: node,
                        title: i18n( 'LabLogMojit.tab_labLog.fileViewModal.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        minHeight: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        centered: true,
                        modal: true,
                        maximizable: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: footer
                        }
                    } );
                    modal.set( 'focusOn', [] );
                }
            );
        };
        Y.namespace( 'doccirrus.modals' ).labLogFileView = new Modal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'promise',
            'CaseFolderCollection',
            'activitysettings-schema'
        ]
    }
);
