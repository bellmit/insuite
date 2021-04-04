/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'testHasFeedback-binder-index', function( Y, NAME ) {
    'use strict';

    Y.namespace( "mojito.binders" )[NAME] = {

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;

            console.warn( NAME, {
                arguments: arguments,
                this: this,
                Y: Y
            } );

        },

        bind: function( node ) {
            this.node = node;

            var
                applyBindings = {
                    toggle: ko.observable( false ),
                    messages: ko.observableArray(['foo']),
                    type: ko.observable( 'error' ),
                    toggleToggle: function() {
                        applyBindings.toggle( !applyBindings.toggle() );
                    }
                };

            console.warn( '[testHasFeedback.js] applyBindings :', applyBindings );

            ko.applyBindings( applyBindings, node.getDOMNode() );

        }

    };
}, '0.0.1', {
    requires: [
        'dcutils-uam'
    ]
} );
