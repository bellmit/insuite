/**
 * User: rw
 * Date: 21.08.13  11:56
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, window, alert, doMessage, $, moment */

"use strict";

YUI.add( 'AlreadyRegBinder', function( Y, NAME ) {

        /**
         * Constructor for the AlreadyRegBinder class.
         *
         * @class AlreadyRegBinder
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
             * @param node {Node} The DOM node to which this mojit is attached.
             */
            bind: function( node ) {

                function handleSubmitResponse(){

                }
                function handleSubmit( event ) {
                    var
                        data,
                        target = $( event.currentTarget );
                    data = {
                        alreadyReg: target.text(),
                        patientId: $('patientId').val()
                    };
                    // if YES -> go to the reg screen
                    // if NO -> go to the login with redirectTo=reg_small
                }

                $( '#btnNo' ).on( 'click', handleSubmit );
                $( '#btnYes' ).on( 'click', handleSubmit );

            }
        };
    }, '0.0.1',
    {requires: [
        'event-mouseenter',
        'mojito-client',
        'mojito-rest-lib',
        'dcutils'
    ]} );
