/**
 * User: do
 * Date: 16.08.19  12:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global fun:true,ko */
/*exported fun */

fun = function _fn( Y, NAME ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        KvcAccountsViewModel = Y.doccirrus.KoViewModel.getConstructor( 'KvcAccountsViewModel' ),
        KimAccountsViewModel = Y.doccirrus.KoViewModel.getConstructor( 'KimAccountsViewModel' ),
        viewModel = null;

    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getBase(), {
        initializer: function() {
            var
                self = this;

            self.kvcAccountsViewModel = new KvcAccountsViewModel( self.initialConfig );
            self.kimAccountsViewModel = new KimAccountsViewModel( self.initialConfig );
            self.hasKim = Y.doccirrus.auth.hasTelematikServices('KIM');
            if (self.hasKim){
                self.currentSelectedAccounts = ko.observable('KIM');
            } else {
                self.currentSelectedAccounts = ko.observable('KVC');
            }

            self.currentSelection = function(selection) {
                self.currentSelectedAccounts(selection);
            };
        },
        destructor: function() {
        }
    }, {
        ATTRS: {}
    } );

    return {
        registerNode: function( node ) {
            var locations;
            Promise.resolve( Y.doccirrus.jsonrpc.api.location.read( {} ) ).then( function( response ) {
                locations = response.data;
                return Promise.resolve( Y.doccirrus.jsonrpc.api.employee.read( {} ) );
            } ).then(function ( response ) {
                viewModel = new ViewModel( {employees: response.data, locations: locations} );
                ko.applyBindings(
                    viewModel,
                    node.getDOMNode()
                );
            }).catch( function( err ) {
                var errors = Y.doccirrus.errorTable.getErrorsFromResponse( err );
                if( errors && errors[0] ) {
                    Y.Array.invoke( errors, 'display', 'info' );
                } else {
                    Y.log( 'could not load locations: ' + err, 'error', NAME );
                }
            } );
        },
        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }

    };
};
