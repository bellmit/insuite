/**
 *  Display a table of keyboard shortcuts in a modal, given a hotkeys group
 *
 *  This modal should be bound to ctrl+h whenever creating a hotkeys group
 *
 *  @author: strix
 *  @date: 24/09/18
 *  (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */

'use strict';

YUI.add( 'HotkeysModal', function( Y ) {

        var i18n = Y.doccirrus.i18n;

        /**
         *  Not a KO viewmodel, just used to bind strings into hotkeys-modal.pug
         *
         *  @param  {Object}    options
         *  @param  {String}    hotKeysGroups   May also be an array, see hotkeys-client.js
         *  @constructor
         */

        function HotkeysViewModel( options ) {
            var self = this;
            self.LBL_OPERATION = i18n( 'InCaseMojit.HotkeysModal.LBL_OPERATION' );
            self.LBL_KEYBOARD_SHORTCUT = i18n( 'InCaseMojit.HotkeysModal.LBL_KEYBOARD_SHORTCUT' );
            self.hotkeysRows = Y.doccirrus.HotKeysHandler.toHtml( options.hotKeysGroups );
        }

        /**
         *  Pop a modal showing a group of keyboard shortcuts
         *
         *  @param  {Object}    options
         *  @param  {String}    hotKeysGroups   May also be an array, see hotkeys-client.js
         */

        function show( options ) {
            var
                btnClose = Y.doccirrus.DCWindow.getButton( 'CLOSE', {
                    isDefault: true,
                    action: onCloseButtonClick
                } ),

                jadeConfig = { path: 'InCaseMojit/views/hotkeys-modal' },

                noticeConfig = {
                    title: i18n( 'InCaseMojit.HotkeysModal.title' ),
                    message: '',
                    window: {
                        id: 'HotKeysHandlerCheatSheet',
                        width: 'large',
                        type: 'info',
                        buttons: {
                            footer: [ btnClose ]
                        }
                    }
                },

                modal;

            if( Y.one( '#HotKeysHandlerCheatSheet' ) ) {
                //  hotkeys modal already open, don't make another
                return;
            }

            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( jadeConfig ) )
                .then( onJadeRendered );

            function onJadeRendered( jadeResult ) {
                var
                    templateNode = Y.Node.create( jadeResult && jadeResult.data ),
                    viewModel = new HotkeysViewModel( options );

                noticeConfig.window.bodyContent = templateNode;

                modal = Y.doccirrus.DCWindow.notice( noticeConfig );

                ko.applyBindings( viewModel, templateNode.getDOMNode() );

            }

            function onCloseButtonClick() {
                modal.close();
            }

        } // end show

        Y.namespace( 'doccirrus.modals' ).hotkeys = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dchotkeyshandler'
        ]
    }
);
