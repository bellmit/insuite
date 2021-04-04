'use strict';

// eslint-disable-next-line no-unused-vars
/*global fun:true, ko */
fun = function _fn( Y ) {

    var
        viewModel = null,
        KoViewModel = Y.doccirrus.KoViewModel,
        MessageViewModel = KoViewModel.getConstructor( 'MessageViewModel' ),
        i18n = Y.doccirrus.i18n;

    return {
        registerNode: function( node ) {
            viewModel = new MessageViewModel();

            viewModel.newMessageTitleI18n = i18n( 'PatientTransferMojit.NewMessage.title' );
            viewModel.newMessageToI18n = i18n( 'PatientTransferMojit.NewMessage.to' );
            viewModel.newMessageSenderPartnerI18n = i18n( 'PatientTransferMojit.NewMessage.senderPartner' );
            viewModel.newMessageSenderKimI18n = i18n( 'PatientTransferMojit.KimCatalogService.senderKim' );
            viewModel.newMessageWhenI18n = i18n( 'PatientTransferMojit.NewMessage.when' );
            viewModel.newMessageWhoI18n = i18n( 'PatientTransferMojit.NewMessage.who' );
            viewModel.newMessageSubjectI18n = i18n( 'PatientTransferMojit.NewMessage.subject' );
            viewModel.newMessageContentI18n = i18n( 'PatientTransferMojit.NewMessage.content' );
            viewModel.newMessageSendI18n = i18n( 'PatientTransferMojit.NewMessage.send' );

            ko.applyBindings( viewModel, node.getDOMNode() );
        }
    };
};