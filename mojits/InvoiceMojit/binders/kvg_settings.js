/*global fun: true, ko */
/*exported fun */

fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    var
        unwrap = ko.unwrap,
        ID_KVG_SETTINGS = '#kvg_settings',
        i18n = Y.doccirrus.i18n;

    function applyBindings( model, yNode ) {
        if( ko.dataFor( yNode.one( ID_KVG_SETTINGS ).getDOMNode() ) ) {
            return;
        }
        ko.applyBindings( model, yNode.one( ID_KVG_SETTINGS ).getDOMNode() );
    }

    function cleanNode( yNode ) {
        ko.cleanNode( yNode.one( ID_KVG_SETTINGS ).getDOMNode() );
    }

    function registerNode( yNode, auxFrameRowsKey, options ) {
        ko.computed( {
            read: options.binder.invoiceconfiguration,
            disposeWhen: function() {
                var
                    invoiceconfiguration = options.binder.invoiceconfiguration,
                    invoiceconfigurationValue = unwrap( invoiceconfiguration ),
                    actions = options.binder.actions;

                actions.buttonSaveI18n = i18n('general.button.SAVE');

                if( !invoiceconfigurationValue ) {
                    invoiceconfiguration.load();
                }

                if( invoiceconfigurationValue ) {
                    applyBindings( {
                        invoiceconfiguration: invoiceconfigurationValue,
                        actions: actions
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