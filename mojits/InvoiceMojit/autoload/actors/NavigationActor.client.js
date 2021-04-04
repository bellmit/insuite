/**
 * User: do
 * Date: 07/09/16  16:13
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko */
'use strict';

YUI.add( 'NavigationActor', function( Y ) {
        var Actor = Y.doccirrus.actors.Actor,
            define = Actor.define,
            send = Actor.send,
            loadTemplateIntoNode = Y.doccirrus.edmputils.loadTemplateIntoNode,
            NavigationMenuVM = Y.doccirrus.edmp.models.NavigationMenuVM;

        define( 'navigation', {
            create: function( self ) {

                var node = self.options.node,
                    items = self.options.items,
                    template = self.options.template;

                if( !template ) {
                    throw Error( 'can not create NavigationActor instance without template' );
                }

                return loadTemplateIntoNode( {
                    node: node,
                    template: template
                } ).then( function() {
                    self.navigationMenuVM = NavigationMenuVM( {items: items} );
                    self.navigationMenuVM.selectedItem.subscribe( function( item ) {
                        send( {from: self, to: self.parent, name: 'selectedItemChanged', data: {itemId: item.id}} );
                    } );
                    ko.applyBindings( self.navigationMenuVM, node );
                } );
            }
        } );

    },
    '0.0.1', {requires: ['Actor', 'NavigationMenuVM', 'edmp-utils']}
);

