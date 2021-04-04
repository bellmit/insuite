/**
 * User: dcdev
 * Date: 2/5/21  1:27 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'MedidataLogMojit', function( Y, NAME ) {


    /**
     * The MedidataLogMojit module.
     *
     * @module MedidataLogMojit
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
        medidataLog: function( ac ) {
            var
                meta = {http: {}, title: 'Medidatabuch'};
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