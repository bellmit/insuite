/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'GadgetLoader', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module GadgetLoader
     */

    Y.namespace( 'doccirrus.gadget' );
    var
        GADGET = Y.doccirrus.gadget,
        KoViewModel = Y.doccirrus.KoViewModel;

    // Gadget Loader
    ko.components.loaders.unshift( {
        loadTemplate: function( name, templateConfig, callback ) {
            if( templateConfig.gadgetTemplatePath ) {

                Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {noBlocking: true, path: templateConfig.gadgetTemplatePath} )
                    .then( function( response ) {
                        return response.data;
                    } )
                    .done( function( markupString ) {
                        // We need an array of DOM nodes, not a string.
                        // We can use the default loader to convert to the required format.
                        ko.components.defaultLoader.loadTemplate( name, markupString, callback );
                    } );

            } else {
                // Unrecognized config format. Let another loader handle it.
                callback( null );
            }
        },
        loadViewModel: function( name, viewModelConfig, callback ) {
            if( viewModelConfig.gadgetConstructorName ) {
                // You could use arbitrary logic, e.g., a third-party code loader, to asynchronously supply the constructor.
                Y.use( viewModelConfig.gadgetConstructorName, function() {
                    // We need a createViewModel function, not a plain constructor.
                    // We can use the default loader to convert to the required format.
                    ko.components.defaultLoader.loadViewModel( name, KoViewModel.getConstructor( viewModelConfig.gadgetConstructorName ), callback );
                } );
            } else {
                // Unrecognized config format. Let another loader handle it.
                callback( null );
            }
        }
    } );

    /**
     * Registers a Gadget for automatically loading by demand.
     * @for doccirrus.gadget
     * @param {Object} parameters
     * @param {String} parameters.name Name of component for binding
     * @param {String} parameters.template Path to template
     * @param {String} parameters.viewModel KoViewModel name, which is also is used for YUI.add
     * @returns {boolean}
     */
    GADGET.register = function( parameters ) {
        if( !(Y.Lang.isObject( parameters ) && parameters.name && parameters.template && parameters.viewModel) ) {
            return false;
        }
        ko.components.register( parameters.name, {
            template: {gadgetTemplatePath: parameters.template},
            viewModel: {gadgetConstructorName: parameters.viewModel}
        } );
        return true;
    };

}, '3.16.0', {
    requires: [
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoViewModel'
    ]
} );
