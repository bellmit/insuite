'use strict';
/*global YUI, ko */
YUI.add( 'OrthancRestartDialog', function( Y ) {

    var
        i18n = Y.doccirrus.i18n;

    function OrthancRestartDialog() {
    }

    OrthancRestartDialog.prototype.showDialog = function( onOk, onCancel ) {
        return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
            .renderFile( { path: 'InPacsAdminMojit/views/confirm_reload_modal' } )
        ).then( function( response ) {
            return response && response.data;
        } ).then( function( template ) {
            var
                bodyContent = Y.Node.create( template ),
                aDCWindowResizeEvent,
                bodyData,

                modal = new Y.doccirrus.DCWindow( {
                    bodyContent: bodyContent,
                    title: i18n( 'InPacsAdminMojit.inpacsmodality_T.ConfirmReloadModal.label.header' ),
                    width: '30%',
                    height: '30%',
                    minHeight: Y.doccirrus.DCWindow.SIZE_LARGE,
                    minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                action: function( e ) {
                                    modal.close( e );
                                    if( onCancel ) {
                                        onCancel();
                                    }
                                }
                            } ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function( e ) {
                                    modal.close( e );
                                    onOk();
                                }
                            } )

                        ]
                    },
                    after: {
                        destroy: function() {
                            if( aDCWindowResizeEvent ) {
                                aDCWindowResizeEvent.detach();
                            }
                        }
                    }
                } );

            bodyData = {
                labelBodyI18n: i18n( 'InPacsAdminMojit.inpacsmodality_T.ConfirmReloadModal.label.body' )
            };


            ko.applyBindings( bodyData, document.querySelector( '#confirmReload' ) );

        } );
    };

    Y.namespace( 'doccirrus.modals' ).OrthancRestartDialog = new OrthancRestartDialog();

}, '0.0.1', {
    requires: [
        'oop',
        'DCWindow'
    ]
} );
