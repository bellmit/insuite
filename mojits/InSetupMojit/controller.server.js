/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/



YUI.add( 'InSetupMojit', function( Y, NAME ) {

    /**
     * The InSetupMojit module.
     *
     * @module InSetupMojit
     */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace( 'mojito.controllers' )[NAME] = {

        /**
         * Method corresponding to the 'index' action.
         *
         * @param {Object} ac The ActionContext that provides access
         *        to the Mojito API.
         */
        insetup: function( ac ) {
            var
                meta = {http: {}, title: 'InSetup'};

            ac.done( {}, meta );
        }

    };

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-params-addon',
        'mojito-assets-addon',
        'mojito-http-addon',
        'mojito-models-addon',
        'mojito-intl-addon',
        'mojito-data-addon',
        'dcauth'
    ]
} );
