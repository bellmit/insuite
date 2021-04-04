/*
 @author: pi
 @date: 21/01/2015
 */

/*jslint anon:true, nomen:true*/
/*global ko */


import '../../../autoload/doccirrus.common';
import '../../../autoload/promise.client';
import '../../../autoload/YUI/DCWindow/DCWindow.client';
import '../../DocCirrus/autoload/comctl-lib.client.js';
import '../../../autoload/jsonrpc/JsonRpc.client';

export default function( Y ) {
    const
        i18n = Y.doccirrus.i18n,
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        CANCEL = i18n( 'InCaseMojit.medication_modalJS.button.CANCEL' ),
        APPLY = i18n( 'InCaseMojit.medication_modalJS.button.APPLY' );

    class AppTokenModal extends Y.doccirrus.KoViewModel.getDisposable() {
        showDialog( config ) {
            return import( /*webpackChunkName: "AppTokenModel"*/ '../models/AppTokenModel.client' )
                .then( () => {
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                        .renderFile( { path: 'AppTokenMojit/views/appToken_modal' } )
                    );
                } )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    return new Promise( ( resolve ) => {
                        let
                            modal,
                            bodyContent = Y.Node.create( template ),
                            appTokenModel = Y.doccirrus.KoViewModel.createViewModel( {
                                NAME: 'AppTokenModel',
                                config: { data: config.data }
                            } );

                        modal = new Y.doccirrus.DCWindow( {
                            id: 'DCWindow-AppToken',
                            className: 'DCWindow-Appointment',
                            bodyContent: bodyContent,
                            title: config.data && Object.keys( config.data ).length ? i18n( 'AppTokenMojit.appTokenModal.title.EDIT_TOKEN' ) : i18n( 'AppTokenMojit.appTokenModal.title.NEW_TOKEN' ),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close', 'maximize' ],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        label: CANCEL
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        isDefault: true,
                                        label: APPLY,
                                        action: function() {
                                            if( appTokenModel.isValid() ) {
                                                appTokenModel.save()
                                                    .then( () => {
                                                        modal.close();
                                                        resolve();
                                                    } )
                                                    .catch( error => {
                                                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                    } );
                                            }
                                        }
                                    } )
                                ]
                            },
                            after: {
                                visibleChange: function( event ) {
                                    if( !event.newVal ) {
                                        ko.cleanNode( bodyContent.getDOMNode() );
                                        appTokenModel.destroy();
                                    }
                                }
                            }
                        } );

                        appTokenModel.addDisposable( ko.computed( function() {
                            var
                                isModelValid = appTokenModel.isValid(),
                                okBtn = modal.getButton( 'SAVE' ).button;
                            if( isModelValid ) {
                                okBtn.enable();
                            } else {
                                okBtn.disable();
                            }
                        } ) );

                        ko.applyBindings( appTokenModel, bodyContent.getDOMNode() );
                    } );

                } ).catch( catchUnhandled );
        }
    }

    return new AppTokenModal();
}



