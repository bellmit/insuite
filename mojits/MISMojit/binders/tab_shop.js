/**
 * User: as
 * Date: 24.05.18  16:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global fun:true,ko */
/*exported fun */

fun = function _fn(Y) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        viewModel = null;

    function ViewModel() {
        ViewModel.superclass.constructor.apply( this );
    }

    Y.extend( ViewModel, KoViewModel.getBase(), {
        initializer: function() {
            this.src = 'https://shop.doc-cirrus.com';  //ko.observable(Y.doccirrus.infras.getPrivateURL( 'sol_shop' ) + '/');
        },
        destructor: function() {}
    });

    return {
        registerNode: function( node ) {
            viewModel = new ViewModel;
            ko.applyBindings(
                viewModel,
                node.getDOMNode()
            );
        },
        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};
