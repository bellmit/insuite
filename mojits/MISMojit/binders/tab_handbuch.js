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

    function ViewModel( config ) {
        ViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( ViewModel, KoViewModel.getDisposable(), {
        initializer: function( config ) {
            this.src = ko.observable( '/manual' + config.pathname);
        },
        destructor: function() {}
    });

    return {
        registerNode: function( node, key, options ) {
            viewModel = new ViewModel( {
                pathname: options.pathname
            } );
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
