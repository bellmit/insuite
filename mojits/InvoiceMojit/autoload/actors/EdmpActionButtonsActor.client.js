/**
 * User: do
 * Date: 06/09/16  15:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */
'use strict';

YUI.add( 'EdmpActionButtonsActor', function( Y ) {
        var Actor = Y.doccirrus.actors.Actor,
            define = Actor.define,
            send = Actor.send,
            ActionButtonsVM = Y.doccirrus.edmp.models.ActionButtonsVM,
            loadTemplateIntoNode = Y.doccirrus.edmputils.loadTemplateIntoNode;

        define( 'edmpActionButtons', {
            create: function( self ) {
                var node = self.options.node,
                    buttons = self.options.buttons;

                return loadTemplateIntoNode( {
                    node: node,
                    template: 'InvoiceMojit.actionbuttons'
                } ).then( function() {
                    function onAction( action, button ) {
                        send( {from: self, to: self.parent, name: action, data: {button: button}} );
                    }

                    self.actionButtonsVM = ActionButtonsVM( {onAction: onAction, buttons: buttons} );
                    ko.applyBindings( self.actionButtonsVM, node );
                } );
            },
            changeButtonStates: function( self, message ) {
                self.actionButtonsVM.setStates( message.data );
            }
        } );

    },
    '0.0.1', {requires: ['Actor', 'ActionButtonsVM', 'edmp-utils']}
);

