
/*global YUI, ko*/
YUI.add( 'ConfirmVCBinder', function( Y, NAME ) {
        'use strict';

        /**
         * Constructor for the ConfirmVCBinder class.
         *
         * @class ConfirmVCBinder
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
             */
            bind: function() {
                var
                    text = this.mojitProxy.pageData.get( 'text' ),
                    patientPortalTitle = this.mojitProxy.pageData.get( 'patientPortalTitle' );
                ko.applyBindings( { text: text }, document.querySelector( '#container' ) );
                ko.applyBindings( { patientPortalTitleI18n: patientPortalTitle }, document.querySelector( '#nav' ) );
            }
        };
    }, '0.0.1',
    {requires: [
        'event-mouseenter',
        'mojito-client',
        'mojito-rest-lib'
    ]}
);
