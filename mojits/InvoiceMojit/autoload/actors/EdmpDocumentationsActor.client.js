/**
 * User: do
 * Date: 06/09/16  15:32
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI, ko */
'use strict';

YUI.add( 'EdmpDocumentationsActor', function( Y ) {
        var Actor = Y.doccirrus.actors.Actor,
            define = Actor.define,
            send = Actor.send,
            EdmpDocsTableVM = Y.doccirrus.edmp.models.EdmpDocsTableVM,
            loadTemplateIntoNode = Y.doccirrus.edmputils.loadTemplateIntoNode;

        define( 'edmpDocumentations', {
            create: function( self ) {
                var node = self.options.node;

                return loadTemplateIntoNode( {
                    node: node,
                    template: 'InvoiceMojit.edmp_docs'
                } ).then( function() {
                    self.edmpDocsTableVM = EdmpDocsTableVM();
                    ko.applyBindings( self.edmpDocsTableVM, node );
                } );

            },
            reloadTable: function( self ) {
                self.edmpDocsTableVM.table.reload();
            },
            shown: function( self ) {
                return send( {from: self, to: self, name: 'reloadTable'} );
            }
        } );

    },
    '0.0.1', {requires: ['Actor', 'edmp-utils', 'EdmpDocsTableVM']}
);

