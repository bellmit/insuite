/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'BankLogMojit', function( Y, NAME ) {
    

    /**
     * The BankLogMojit module.
     *
     * @module BankLogMojit
     */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace( 'mojito.controllers' )[NAME] = {

        /**
         * @param {Object}  ac The ActionContext that provides access to the Mojito API.
         */
        banklog: function( ac ) {
            var
                meta = {http: {}, title: 'Bankbuch'};
            ac.done( {}, meta );
        }

    };

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-http-addon',
        'mojito-assets-addon',
        'mojito-params-addon',
        'mojito-data-addon',
        'dcauth'
    ]
} );
