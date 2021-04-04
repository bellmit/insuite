/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
/*exported fun */
'use strict';
fun = function _fn( Y/*, NAME*/ ) {
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        viewModel;

    /**
     * This views ViewModel
     * @constructor
     */
    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getDisposable(), {
        initializer: function() {
            var
                self = this;

            self.initViewModel();
            self.initLoadMask();

        },
        destructor: function() {
        },
        initViewModel: function() {
            var
                self = this;
            self.pending = ko.observable( false );
        },
        /**
         * init the loading mask
         */
        initLoadMask: function() {
            var
                self = this,
                node = self.get( 'node' );

            self.addDisposable( ko.computed( function() {

                if( self.pending() ) {
                    Y.doccirrus.utils.showLoadingMask( node );
                } else {
                    Y.doccirrus.utils.hideLoadingMask( node );
                }

            } ) );
        }
    }, {
        ATTRS: {
            node: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    return {

        registerNode: function( node ) {

            // set viewModel
            viewModel = new ViewModel( {node: node.getDOMNode()} );

            ko.applyBindings( viewModel, node.getDOMNode() );

        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

            // clear the viewModel
            if( viewModel ) {
                viewModel.destroy();
                viewModel = null;
            }
        }
    };
};
