/*global YUI */

'use strict';

YUI.add( 'DCcliDialogs', function( Y/*, NAME*/ ) {

    var
        i18n = Y.doccirrus.i18n;

    Y.namespace( 'doccirrus.modals' ).cliDialogs = {
        /**
         * Shows reboot dialog
         */
        showCliRebootDialog: function() {

            Y.doccirrus.DCWindow.notice( {
                title: i18n( 'InSuiteAdminMojit.insuiteadmin.showCliRebootDialog.title' ),
                type: 'info',
                window: {
                    manager: Y.doccirrus.DCWindow.defaultDCWindowManager,
                    width: 'medium',
                    maximizable: true,
                    buttons: {
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                action: function() {
                                    this.close();
                                }
                            } ),
                            Y.doccirrus.DCWindow.getButton( 'YES', {
                                isDefault: true,
                                action: function() {
                                    Y.doccirrus.jsonrpc.api.cli.reboot().fail( function( response ) {
                                        if( response && response.data ) {
                                            Y.doccirrus.DCSystemMessages.removeMessage( { messageId: 'rebootError' } );
                                            Y.doccirrus.DCSystemMessages.addMessage( {
                                                messageId: 'rebootError',
                                                content: response.data,
                                                level: 'ERROR'
                                            } );
                                        } else {
                                            Y.doccirrus.DCWindow.notice( {
                                                type: 'error',
                                                message: Y.doccirrus.errorTable.getMessage( response )
                                            } );
                                        }
                                    } );
                                    this.close();
                                }
                            } )
                        ]
                    }
                },
                message: i18n( 'InSuiteAdminMojit.insuiteadmin.showCliRebootDialog.message.text' ) + '<br/>' + i18n( 'InSuiteAdminMojit.insuiteadmin.showCliRebootDialog.message.question' )
            } );
        },
        showCliUpdateDialog: function( aSubNavigationElement/*, event*/ ) {
            var
                FAIL_MESSAGE = i18n( 'InSuiteAdminMojit.insuiteadmin.cliUpdate.updateFailed' );

            aSubNavigationElement.disabled( true );

            function showConfirmDialog() {
                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    window: {
                        manager: Y.doccirrus.DCWindow.defaultDCWindowManager,
                        width: 'medium',
                        maximizable: true,
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    isDefault: true,
                                    action: function() {
                                        this.close();
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    label: i18n( 'InSuiteAdminMojit.insuiteadmin.cliUpdate.updateNow' ),
                                    action: function( e ) {
                                        e.target.button.disable();
                                        // start PRC update
                                        Y.doccirrus.jsonrpc.api.cli.softwareUpdate()
                                            .done( function() {
                                                Y.doccirrus.DCWindow.notice( {
                                                    message: i18n( 'InSuiteAdminMojit.insuiteadmin.cliUpdate.updateInProgress' )
                                                } );

                                            } )
                                            .fail( function() {
                                                Y.doccirrus.DCWindow.notice( {
                                                    type: 'error',
                                                    message: FAIL_MESSAGE
                                                } );
                                            } );
                                        this.close();
                                    }
                                } )
                            ]
                        }
                    },
                    message: i18n( 'InSuiteAdminMojit.insuiteadmin.cliUpdate.updatesAvailable' )
                } );
            }

            // check for available updates
            Y.doccirrus.jsonrpc.api.cli.updateCheck()
                .done( function( body ) {
                    var
                        data = body && body.data || {};
                    if( data.needUpdate ) {
                        showConfirmDialog();
                    } else {
                        Y.doccirrus.DCWindow.notice( {
                            message: i18n( 'InSuiteAdminMojit.insuiteadmin.cliUpdate.alreadyUpToDate' )
                        } );
                    }
                } ).fail( function(err) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: Y.doccirrus.errorTable.getMessage( err ) || FAIL_MESSAGE
                } );
            } )
                .always( function() {
                    aSubNavigationElement.disabled( false );
                } );
        }
    };

}, '0.0.1', {
    requires: [
        'doccirrus',
        'DCWindow',
        'JsonRpc'
    ]
} );
