/**
 * User: do
 * Date: 05/09/17  20:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'KVConnectMojitBinder', function( Y, NAME ) {
    'use strict';

    var i18n = Y.doccirrus.i18n;


    function toggleFullScreenHandler() {
        Y.doccirrus.DCBinder.toggleFullScreen();
    }

    Y.namespace( 'mojito.binders' )[NAME] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function KVConnectMojitBinder_init( mojitProxy ) {
            var self = this;
            self.mojitProxy = mojitProxy;
            Y.doccirrus.DCBinder.initToggleFullScreen();
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function KVConnectMojitBinder_bind( node ) {
            var
                self = this,
                router,
                rootPath = Y.doccirrus.utils.getUrl( 'kvconnect' );

            Y.doccirrus.DCBinder.initToggleFullScreen();

            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'kvconnect' );

            function handle( options ) {
                if(!self.binderViewModel){
                    self.binderViewModel = Y.doccirrus.KvcMessageListModel.create();
                }
                if( options && options.params && options.params.kbvlogId ) {
                    self.binderViewModel.setInvoiceFilter( options.params.kbvlogId );
                }
                self.binderViewModel.toggleFullScreenHandler = toggleFullScreenHandler;

                self.binderViewModel.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;
                self.binderViewModel.messageHistoryI18n = i18n( 'KVConnectMojit.kvconnect.headline.MESSAGE_HISTORY' );
                self.binderViewModel.onlySentKBVLogsI18n = i18n( 'KVConnectMojit.kvconnect.tooltip.ONLY_SENT_KBVLOGS' );
                self.binderViewModel.buttonFetchI18n = i18n( 'InvoiceMojit.gkv_browser.button.FETCH' );
                self.binderViewModel.deleteFromServerI18n = i18n( 'InvoiceMojit.gkv_browser.button.DELETE_FROM_SERVER' );
                self.binderViewModel.buttonConfirmI18n = i18n( 'InvoiceMojit.gkv_browser.button.CONFIRM' );
                self.binderViewModel.messageTypeI18n = i18n( 'kvcmessage-schema.KVCMessage_T.messageType.i18n' );
                self.binderViewModel.messageStatusI18n = i18n( 'kvcmessage-schema.KVCMessage_T.messageStatus.i18n' );
                self.binderViewModel.serverStatusI18n = i18n( 'kvcmessage-schema.KVCMessage_T.serverStatus.i18n' );
                self.binderViewModel.kvcServiceIdI18n = i18n( 'kvcmessage-schema.KVCMessage_T.kvcServiceId.i18n' );
                self.binderViewModel.kvcTransmitterSystemI18n = i18n( 'kvcmessage-schema.KVCMessage_T.kvcTransmitterSystem.i18n' );
                self.binderViewModel.dispositionNotificationToI18n = i18n( 'kvcmessage-schema.KVCMessage_T.dispositionNotificationTo.i18n' );
                self.binderViewModel.returnPathI18n = i18n( 'kvcmessage-schema.KVCMessage_T.returnPath.i18n' );
                self.binderViewModel.fromI18n = i18n( 'kvcmessage-schema.KVCMessage_T.from.i18n' );
                self.binderViewModel.sentAtI18n = i18n( 'kvcmessage-schema.KVCMessage_T.sentAt.i18n' );
                self.binderViewModel.subjectI18n = i18n( 'kvcmessage-schema.KVCMessage_T.subject.i18n' );
                self.binderViewModel.toI18n = i18n( 'kvcmessage-schema.KVCMessage_T.to.i18n' );
                self.binderViewModel.receivedAtI18n = i18n( 'kvcmessage-schema.KVCMessage_T.receivedAt.i18n' );
                self.binderViewModel.attachmentsI18n = i18n( 'kvcmessage-schema.KVCMessage_T.attachments.i18n' );

                if( node ) {
                    ko.cleanNode( node.getDOMNode() );
                }

                ko.applyBindings( self.binderViewModel, node.getDOMNode() );


            }

            router = new Y.doccirrus.DCRouter( {
                root: rootPath,

                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_settings' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow default KVConnect route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handle();
                            }

                        }
                    },
                    {
                        path: '/kbvlog/:kbvlogId',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_settings' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow KVConnect with specified kbvlogId route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handle( {params: req.params} );
                            }
                        }
                    }
                ]
            } );

            var routeTo = location.href.split( 'kvconnect#' );
            routeTo = ( routeTo.length < 2) ? '/' : routeTo[1];

            Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
            router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = router.getPath();
            Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );

        }

    };

}, '0.0.1', {
    requires: [
        "DCBinder",
        'oop',
        'NavBarHeader',
        'DCRouter',
        'mojito-client',
        'doccirrus',
        'dccommonutils',
        'dcutils',
        'dcutils-uam',
        'dcauth',
        'dcerrortable',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'DCSystemMessages',
        'KoViewModel',
        'KoUI-all',
        'dcschemaloader',
        'kvcmessage-schema',
        'KvcMessageModel',
        'KvcMessageListModel'

    ]
} );
