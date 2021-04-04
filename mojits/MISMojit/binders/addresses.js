/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add(
    'MISMojitBinderAddresses',
    function( Y, NAME ) {
        'use strict';

        /**
         * Constructor for the MISMojitBinderAddresses class.
         *
         * @class MISMojitBinderAddresses
         * @constructor
         */
        Y.namespace( 'mojito.binders' )[NAME] = {

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
             * @param node {Node} The DOM node to which this mojit is attached.
             */
            bind: function( /*node*/ ) {
                Y.doccirrus.NavBarHeader.setActiveEntry( 'addresses' );
                Y.doccirrus.DCBinder.initToggleFullScreen();

                const fullScreenToggle = {
                    toggleFullScreenHandler() {
                        Y.doccirrus.DCBinder.toggleFullScreen();
                    },
                    viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
                };
                ko.applyBindings( fullScreenToggle, document.querySelector( '#fullScreenToggle' ) );
            }
        };

    },
    '0.0.1',
    {
        requires: [
            "DCBinder",
            'NavBarHeader',
            'mojito-client'
        ]
    }
);
