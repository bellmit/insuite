/*global YUI */
YUI.add( 'PrinterMojit', function( Y, NAME ) {
    

    /**
     * The PrinterMojit module.
     *
     * @module PrinterMojit
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
        printerMojit: function( ac ) {
            var
                meta = {http: {}};

            ac.assets.addCss( './css/PrinterMojit.css' );

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
