/**
 * User: do
 * Date: 23.04.19  12:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*jshint latedef:false */
/*global YUI */

'use strict';

YUI.add( 'invoicelog_content_has_changed_modal', function( Y/*, NAME*/ ) {

        var
            i18n = Y.doccirrus.i18n;

        function show( args ) {

            var
                node = Y.Node.create( '<div>' + i18n( 'InvoiceMojit.invoicelog_content_has_changed_modal.text' ) + '</div>' ),

                btnCancel = Y.doccirrus.DCWindow.getButton( 'CANCEL' ),

                preCheckBtn = {
                    name: 'PRECHECK',
                    label: i18n( 'InvoiceMojit.gkv_browser.button.PRECHECK' ),
                    isDefault: true,
                    action: function() {
                        args.callback( 'pre_check' );
                        modal.close();
                    }
                },
                nextBtn = {
                    name: 'NEXT',
                    label: i18n( 'general.button.NEXT' ),
                    isDefault: false,
                    action: function() {
                        args.callback( 'next' );
                        modal.close();
                    }
                },

                windowSettings = {
                    className: 'DCWindow-invoicelog_content_has_changed_modal',
                    bodyContent: node,
                    title: i18n( 'InvoiceMojit.invoicelog_content_has_changed_modal.title' ),
                    maximizable: true,
                    icon: Y.doccirrus.DCWindow.ICON_WARN,
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [ btnCancel, preCheckBtn, nextBtn ]
                    }
                },

                modal;

            modal = new Y.doccirrus.DCWindow( windowSettings );
        }

        Y.namespace( 'doccirrus.modals' ).invoicelogContentHasChangedModal = { show: show };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);
