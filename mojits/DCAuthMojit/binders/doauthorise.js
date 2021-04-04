/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, nomen:true*/
/*global YUI, window */
'use strict';
YUI.add( 'DCAuthBinderIndex', function( Y, NAME ) {

    /**
     * Constructor for the RestUIMojitBinderIndex class.
     *
     * @class RestUIMojitBinderIndex
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
        bind: function( node ) {
            var
            //
            // First we pick up the HTML elements on the page that we are going to activate in the Binder.
            //
                authButton = node.one( '#buttonAuth' ),
                cancelButton = node.one( '#buttonCancel' ),
                callNode = node.one( '#originalCall' ),
                msgDiv = node.one( '#DCAuthMessages' );

            function redirect( url ) {
                cancelButton.set( 'enabled', false );
                authButton.set( 'enabled', false );
                msgDiv.show();
                setTimeout( function() {
                    window.location = url;
                }, 1000 );
            }

            //this.node = node;
            // on ...
            cancelButton.on( 'click', function() {
                redirect( '/dcauth?authorise=false&_call=' + encodeURIComponent( callNode.get( 'value' ) ) ); } );

            authButton.on( 'click', function() {
                redirect( '/dcauth?authorise=true&_call=' + encodeURIComponent( callNode.get( 'value' ) ) ); } );

        }

    };

}, '0.0.1', {requires: ['event-mouseenter', 'mojito-client', 'mojito-rest-lib']} );
