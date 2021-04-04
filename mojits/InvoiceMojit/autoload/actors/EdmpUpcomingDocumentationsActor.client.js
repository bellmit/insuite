/**
 * User: do
 * Date: 06/09/16  15:34
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI, ko */
'use strict';

YUI.add( 'EdmpUpcomingDocumentationsActor', function( Y ) {
        var Actor = Y.doccirrus.actors.Actor,
            loadTemplateIntoNode = Y.doccirrus.edmputils.loadTemplateIntoNode,
            EdmpUpcomingDocsTableVM = Y.doccirrus.edmp.models.EdmpUpcomingDocsTableVM;

        Actor.define( 'edmpUpcomingDocumentations', {
            create: function( self ) {
                var node = self.options.node;

                return loadTemplateIntoNode( {
                    node: node,
                    template: 'InvoiceMojit.simple_table'
                } ).then( function() {
                    self.edmpUpcomingDocsTableVM = EdmpUpcomingDocsTableVM();
                    ko.applyBindings( self.edmpUpcomingDocsTableVM, node );
                } );
            }
        } );

    },
    '0.0.1', {requires: ['Actor', 'EdmpUpcomingDocsTableVM', 'edmp-utils']}
);

