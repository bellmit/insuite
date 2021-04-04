/*global YUI, window, alert, $, setViewportWide */

// Do not define anything here --
//    the first code in the binderp
// MUST be the following line:
function _fn( Y, NAME ) {
    'use strict';

    // setup event handlers of this jade snippet
    function setupHandlers( node ) {

        // hover popover for (i)nfo sign
        // hover box effect
        $('#info' ).hover(function(e){
            $('#popover').popover('show');
        },function(e){
            $('#popover').popover('hide');
        });
        $( '#head' ).keyup(function(e){
            // TODO: sanitize input
            $( '#head-preview' ).html($(this ).val().substring(0,32));
        });
        $( '#subhead' ).keyup(function(e){
            // TODO: sanitize input, make input little bit shorter
            $( '#subhead-preview' ).html($(this ).val().substring(0,60));
        });
    }

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */
        registerNode: function( node ) {
            setupHandlers( node );
        },
        deregisterNode: function( node ) {
            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //node.destroy();
        }
    };
}