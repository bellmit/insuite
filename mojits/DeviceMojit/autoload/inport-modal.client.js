/*
 @author: pi
 @date: 2014/09/22
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dcinportmodal', function( Y ) {

        function InportModal() {

        }

        InportModal.prototype.showDialog = function( data, callback ) {

            function show() {
                var
                    modal,
                    i18n = Y.doccirrus.i18n,
                    MODAL_TITLE = i18n( 'DeviceMojit.inport_modal_clientJS.title.MODAL_TITLE' ),
                    node = Y.Node.create( '<div></div>' ),
                    KoViewModel = Y.doccirrus.KoViewModel,
                    inportModel = new KoViewModel.createViewModel( {NAME: 'InportModel', config: {
                        data: data
                    } } );

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'inport_modal',
                    'DeviceMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: MODAL_TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        action: function() {
                                            this.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        isDefault: true,
                                        action: function() {

                                            inportModel.update()
                                                .done( function() {
                                                    callback( inportModel.toJSON() );
                                                    modal.close();
                                                } )
                                                .fail( function( error ) {
                                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                } );
                                        }
                                    } )
                                ]
                            }
                        } );
                        inportModel.addDisposable( ko.computed( function() {
                            var
                                modelValid = inportModel._isValid(),
                                okBtn = modal.getButton( 'SAVE' ).button;
                            if( modelValid ) {
                                okBtn.enable();
                            } else {
                                okBtn.disable();
                            }
                        } ) );
                        modal.set( 'focusOn', [] );
                        ko.applyBindings( inportModel, node.getDOMNode().querySelector( '#inportModel' ) );
                    }
                );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).inportModal = new InportModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'InportModel'
        ]
    }
);
