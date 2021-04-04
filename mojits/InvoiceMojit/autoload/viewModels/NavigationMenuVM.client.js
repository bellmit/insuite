/**
 * User: do
 * Date: 29/08/16  14:10
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */
'use strict';

YUI.add( 'NavigationMenuVM', function( Y ) {

        function NavigationMenuVM( config ) {
            var self = {
                items: config.items
            };
            self.selectedItem = ko.observable( self.items[0] );
            self.selectedId = ko.computed( function() {
                var item = self.selectedItem();
                return item && item.id;
            } );
            return self;
        }

        Y.namespace( 'doccirrus.edmp.models' ).NavigationMenuVM = NavigationMenuVM;
    },
    '0.0.1', {requires: []}
);

