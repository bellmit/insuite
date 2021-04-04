/*jslint anon:true, sloppy:true, nomen:true*/
/*exported _fn */
/*global ko */
function _fn( Y ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        viewModel = null,
        KoViewModel = Y.doccirrus.KoViewModel,
        TaskViewModel = KoViewModel.getConstructor( 'TaskViewModel' );

    return {
        registerNode: function( node ) {

            // set viewModel
            viewModel = new TaskViewModel( {
                filterQuery: {status: {$ne: 'DONE'}},
                pdfTitle: i18n( 'TaskMojit.tabs.pdfTitle_ACTIVE_TASKS' ),
                node: function() {
                    // for some weirdness this have to be a function
                    return node.getDOMNode();
                }
            } );

            ko.applyBindings( viewModel, node.getDOMNode() );
        }
    };
}