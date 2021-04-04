/*
 (c) Doc Cirrus Gmbh, 2013
 */

/**
 * The DC Jade Repository loads compiled Jade templates from the server
 * and caches them. All this is available via the global YUI object,
 * so easy to use from any binder that has the code available.
 */

/*global YUI, alert, $ */

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
                auxnode = node;

            function handleClickSubtract( e ) {
                YUI.dcJadeRepository.removeRowAuxHelper( e );
            }

            function handleClickAdd( e ) {
                YUI.dcJadeRepository.addRowAuxHelper( e );
            }

            function handleClickSave( e ) {
                // hide this function
                alert( 'saving ' + e.currentTarget.get( 'name' ) );
            }

            // event delegation from the
            node.delegate( 'click', handleClickSubtract, '.auxbtn1' );
            node.delegate( 'click', handleClickSave, '.auxsave' );
            node.delegate( 'click', handleClickAdd, '.auxframeadd' );
        },
        deregisterNode: function( node ) {
            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //node.destroy();
        }

    };
}

