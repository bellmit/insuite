/**
 * User: do
 * Date: 06/09/16  15:38
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI, ko */
'use strict';

YUI.add( 'EdmpDeliveriesTableActor', function( Y ) {
        var Actor = Y.doccirrus.actors.Actor,
            define = Actor.define,
            send = Actor.send,
            loadTemplateIntoNode = Y.doccirrus.edmputils.loadTemplateIntoNode,
            EdmpDeliveriesTableVM = Y.doccirrus.edmp.models.EdmpDeliveriesTableVM;

        define( 'edmpDeliveriesTable', {
            create: function( self ) {
                var node = self.options.node;

                Y.doccirrus.communication.on( {
                    event: 'edmpPackingFinished',
                    done: function() {
                        send( {from: self, to: self, name: 'reload', data: {}} );
                    },
                    handlerId: 'updateGkvTable'
                } );


                return loadTemplateIntoNode( {
                    node: node,
                    template: 'InvoiceMojit.simple_table'
                } ).then( function() {

                    function onAction( action ) {
                        var type = action.type,
                            data = action.data;
                        if( 'rowClick' === type ) {
                            send( {from: self, to: self.parent, name: 'deliverySelected', data: data} );
                        }
                    }

                    self.edmpDeliveriesTableVM = EdmpDeliveriesTableVM( {onAction: onAction} );

                    ko.applyBindings( self.edmpDeliveriesTableVM, node );
                } );

            },
            reload: function( self ) {
                self.edmpDeliveriesTableVM.table.reload();
            }
        } );

    },
    '0.0.1', {requires: ['Actor', 'EdmpDeliveriesTableVM', 'edmp-utils']}
);

