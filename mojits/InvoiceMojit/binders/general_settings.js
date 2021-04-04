/*global fun:true, ko */ // eslint-disable-line
fun = function _fn( Y /*,NAME*/ ) {
    'use strict';

    var
        unwrap = ko.unwrap,
        ID_GENERAL_SETTINGS = '#general_settings',
        i18n = Y.doccirrus.i18n;

    function applyBindings( model, yNode ) {
        if( ko.dataFor( yNode.one( ID_GENERAL_SETTINGS ).getDOMNode() ) ) {
            return;
        }
        ko.applyBindings( model, yNode.one( ID_GENERAL_SETTINGS ).getDOMNode() );
    }

    function cleanNode( yNode ) {
        ko.cleanNode( yNode.one( ID_GENERAL_SETTINGS ).getDOMNode() );
    }

    function registerNode( yNode, auxFrameRowsKey, options ) {
        ko.computed( {
            read: options.binder.invoiceconfiguration,
            disposeWhen: function() {
                var
                    invoiceconfiguration = options.binder.invoiceconfiguration,
                    invoiceconfigurationValue = unwrap( invoiceconfiguration ),
                    actions = options.binder.actions,
                    translation = ko.observable();

                if( !invoiceconfigurationValue ) {
                    invoiceconfiguration.load();
                }

                translation.groupMedneoI18n = i18n('InvoiceMojit.invoicegeneralsettings.group.MEDNEO');
                translation.iAmMedneoCustomerI18n = i18n('InvoiceMojit.invoicegeneralsettings.label.I_AM_MEDNEO_CUSTOMER');
                translation.groupPVSI18n = i18n('InvoiceMojit.invoicegeneralsettings.group.PVS');
                translation.isPVSNeedsApproval = i18n('invoiceconfiguration-schema.PadxSetting_T.pvsNeedsApproval');
                translation.buttonTextSaveI18n = i18n('general.button.SAVE');

                translation.groupGKVI18n = i18n('InvoiceMojit.invoicegeneralsettings.group.GKV');
                translation.createUniqCaseIdentNoOnInvoice = i18n('InvoiceMojit.invoicegeneralsettings.label.FK_3000');
                translation.conFileSplicing = i18n('InvoiceMojit.invoicegeneralsettings.label.CON_FILE_SPLICING');
                translation.vatI18n = i18n('InvoiceMojit.invoicegeneralsettings.label.VAT');
                translation.preselectVatI18n = i18n('InvoiceMojit.invoicegeneralsettings.label.PRESELECT_VAT');

                if( invoiceconfigurationValue ) {
                    applyBindings( {
                        isMVPRC: Y.doccirrus.auth.isMVPRC(),
                        invoiceconfiguration: invoiceconfigurationValue,
                        actions: actions,
                        translation: translation
                    }, yNode );
                } else {
                    cleanNode( yNode );
                }

                return Boolean( invoiceconfigurationValue );
            }
        } ).extend( {
            rateLimit: 0
        } );
    }

    function deregisterNode( yNode/*, auxFrameRowsKey, options*/ ) {
        cleanNode( yNode );
    }

    return {
        registerNode: registerNode,
        deregisterNode: deregisterNode
    };
};