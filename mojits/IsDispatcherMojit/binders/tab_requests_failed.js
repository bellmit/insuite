/*global fun:true, ko */
fun = function _fn( Y ) {
    'use strict';

    var
        viewModel = null,
        KoViewModel = Y.doccirrus.KoViewModel,
        RequestViewModel = KoViewModel.getConstructor( 'RequestViewModel' );

    return {
        registerNode: function( node, someKey, options ) {

            // set viewModel
            viewModel = new RequestViewModel( {
                node: function() {
                    // for some weirdness this have to be a function
                    return node.getDOMNode();
                }
            } );

            viewModel.setFilterByStatus( options.status );

            ko.applyBindings( viewModel, node.getDOMNode() );
        }
    };
};