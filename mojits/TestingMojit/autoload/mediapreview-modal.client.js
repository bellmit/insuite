/**
 * User: do
 * Date: 01/12/14  13:52
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, $*/

'use strict';

YUI.add( 'dcmediapreviewnmodal', function( Y ) {

        function MediaPreviewModal() {

        }

        MediaPreviewModal.prototype.showDialog = function( data ) {
            var modal,
                node = Y.Node.create( '<div></div>' );

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'mediapreview_modal',
                'TestingMojit',
                data,
                node,
                function() {
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-Media-Preview',
                        bodyContent: node,
                        title: 'Vorschau',
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        centered: true,
                        modal: true,
                        dragable: true,
                        maximizable: true,
                        resizeable: true,
                        width: Y.doccirrus.DCWindow.SIZE_LARGE,
                        minHeight: 600,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [

                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        this.close();
                                    }
                                } )
                            ]
                        }
                    } );

                    $( '.mediapreview-errorpanel' ).hide();


                    $( 'video' ).on( 'error', function() {
                        $( 'video' ).remove();
                        $( '.mediapreview-errorpanel' ).show();
                    } );

                }
            );

        };
        Y.namespace( 'doccirrus.modals' ).mediaPreviewModal = new MediaPreviewModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);
