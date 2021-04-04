/**
 * User: pi
 * Date: 19/11/15   12:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko*/
YUI.add( 'ConfirmEmailBinder', function( Y, NAME ) {
        'use strict';

        /**
         * Constructor for the ConfirmEmailBinder class.
         *
         * @class ConfirmEmailBinder
         * @constructor
         */
        Y.namespace( 'mojito.binders' )[NAME] = {

            /** using client side Jade so we need to announce who we are. */
            jaderef: 'PatPortalMojit',

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function( mojitProxy ) {
                this.mojitProxy = mojitProxy;
            },

            /**
             * The binder method, invoked to allow the mojit to attach DOM event
             * handlers.
             *
             * @param loadOnly {Boolean}  loads the menu, but does not load any tab, if true
             * @param node {Node} The DOM node to which this mojit is attached.
             */
            bind: function() {
                var
                    text = this.mojitProxy.pageData.get( 'text' ),
                    btnNext = this.mojitProxy.pageData.get( 'btnNext' );
                ko.applyBindings( { text: text, btnNext: btnNext }, document.querySelector( '#container' ) );
            }
        };
    }, '0.0.1',
    {requires: [
        'event-mouseenter',
        'mojito-client',
        'mojito-rest-lib'
    ]}
);
