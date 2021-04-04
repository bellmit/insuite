/*
 @author: pi
 @date: 2014/09/22
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'dcrecommendedprescriptionmodal', function( Y ) {

        function RecommendedPrescriptionModal() {

        }

        function getTemplate( node, data, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'recommendedprescription_modal',
                'TestingMojit',
                data,
                node,
                callback
            );
        }

        RecommendedPrescriptionModal.prototype.showDialog = function( data, callback ) {

            var modal,
                node = Y.Node.create( '<div></div>' );

            getTemplate( node, data, function() {
                modal = Y.doccirrus.DCWindow.notice( {
                    title: 'Bitte überprüfen Sie die Formularauswahl!',
                    type: 'info',
                    window: {
                        width: 'xlarge',
                        maximizable: true,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    label: 'Abbrechen'
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    label: 'Bestätigen',
                                    action: function() {
                                        callback();
                                        this.close();
                                    }
                                } )
                            ]
                        }

                    },
                    message: node
                } );
            } );
        };

        RecommendedPrescriptionModal.prototype.showSystemMsg = function( data, mid ) {
            var node = Y.Node.create( '<div></div>' );
            data.sysMsg = true;
            getTemplate( node, data, function() {
                Y.doccirrus.DCSystemMessages.removeMessage( mid );
                Y.doccirrus.DCSystemMessages.addMessage( {
                    messageId: mid,
                    content: node.getHTML(),
                    level: 'WARNING'
                } );
            } );
        };

        Y.namespace( 'doccirrus.modals' ).recommendedPrescriptionModal = new RecommendedPrescriptionModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);
