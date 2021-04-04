/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
fun = function _fn( Y ) {
    'use strict';

    var
        viewModel = null,
        KoViewModel = Y.doccirrus.KoViewModel,
        TaskViewModel = KoViewModel.getConstructor( 'TaskViewModel' );

    return {
        registerNode: function( node ) {

            // set viewModel
            viewModel = new TaskViewModel( {
                filterQuery: {type: {$eq: 'TEMPLATE'}},
                node: function() {
                    // for some weirdness this have to be a function
                    return node.getDOMNode();
                }
            } );

            ko.applyBindings( viewModel, node.getDOMNode() );

        }
    };
};