/*
 (c) Doc Cirrus Gmbh, 2013
 */

/**
 * Opt-in process for production registration
 */

/*global YUI, alert, window, $ */

function _fn( Y, NAME ) {
    'use strict';

    var
        i;

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node   NB: The node MUST have an   id   attribute.
         */
        registerNode: function( node ) {
            var
                checkbPriv = node.one('#privacy'),
                checkbIntTmeSLA = node.one('#intimesla'),
                btn = node.one('#sendbtn');


            function buttonUpdated( e) {
                if( ($('#privacy').is(':checked')) && ($('#intimesla').is(':checked')) ) {
                    btn.removeClass('disabled');
                } else {
                    btn.addClass('disabled');
                }
            }

            checkbPriv.on('change', buttonUpdated);
            checkbIntTmeSLA.on('change', buttonUpdated);

            // NB: btn = node.one('#sendbtn');  CLICK HANDLER IS IN PARENT BINDER (registration.js)


        },
        deregisterNode: function( node ) {
            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //node.destroy();
        }

    };
}