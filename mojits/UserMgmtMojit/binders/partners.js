/**
 * User: do
 * Date: 02/03/15  13:16
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global ko, fun:true */
/*exported fun */

fun = function _fn( Y ) {
    'use strict';

    return {
        registerNode: function() {
            var actionButtonsViewModel,
                i18n = Y.doccirrus.i18n,
                partnerTable = Y.doccirrus.tables.createPartnerTable( {onRowClick: onRowClick} ),
                componentColumnCheckbox = partnerTable.getComponentColumnCheckbox();

            function confirmDeletion( ids ) {
                var dcWindow;

                function remove() {
                    Y.doccirrus.jsonrpc.api.partner.batchDelete( {
                        ids: ids
                    } ).always( function() {
                            reloadTable();
                            dcWindow.close();
                        } );
                }

                dcWindow = Y.doccirrus.DCWindow.notice( {
                    title: i18n( 'DCWindow.notice.title.warn' ),
                    type: 'warn',
                    window: {
                        width: 'medium',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function( e ) {
                                        remove();
                                        dcWindow.close( e );
                                    }
                                } )
                            ]
                        }
                    },
                    message: i18n( 'UserMgmtMojit.partnerJS.CONFIRMDELETION' )
                } );
            }

            function reloadTable() {
                var selected = componentColumnCheckbox.checked(),
                    ids = Array.isArray( selected ) && selected.length ? [selected[0]._id] : selected;

                partnerTable.reload( {
                    done: function() {
                        if( ids ) {
                            componentColumnCheckbox.checkItemsByProperty( ids );
                        }
                    }
                } );
            }

            function onRowClick( data ) {
                if( data && data.row ) {
                    Y.doccirrus.modals.partnerEditModal.show( data.row, false, reloadTable );
                }
                return false;
            }

            function ActionButtonsViewModel() {

                var self = this;

                self.add = function() {
                    Y.doccirrus.modals.partnerEditModal.show( null, false, reloadTable );
                };

                self.invite = function() {
                    Y.doccirrus.modals.partnerEditModal.show( null, true, reloadTable );
                };

                self.remove = function() {
                    var ids,
                        selectedRows = componentColumnCheckbox.checked();
                    if( !selectedRows.length ) {
                        return;
                    }

                    // TODO delete multi
                    ids = selectedRows.map( function( row ) {
                        return row._id;
                    } );

                    confirmDeletion( ids );
                };

                self.removeEnabled = ko.observable( false );

            }

            actionButtonsViewModel = new ActionButtonsViewModel();

            ko.computed( function() {
                var
                    selectedRows = componentColumnCheckbox.checked();
                actionButtonsViewModel.removeEnabled( Boolean( selectedRows && selectedRows.length ) );
            } );

            actionButtonsViewModel.buttonDeleteI18n = i18n('general.button.DELETE');
            actionButtonsViewModel.acceptInvitationI18n = i18n('UserMgmtMojit.partner_invitation_modal.ACCEPT_INVITATION');
            actionButtonsViewModel.inviteI18n = i18n('UserMgmtMojit.partner_invitation_modal.INVITE');
            ko.applyBindings( partnerTable, document.querySelector( '#partnerTable' ) );
            ko.applyBindings( actionButtonsViewModel, document.querySelector( '#actionButtons' ) );

        }
    };
};