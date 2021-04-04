/**
 * User: pi
 * Date: 01/06/16  10:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */



YUI.add( 'LicenseMojit', function( Y, NAME ) {

    /**
     *
     * @module LicenseMojit
     */

    /**
     * Constructor for the Controller class.
     *
     * @class LicenseMojit
     * @constructor
     */
    Y.namespace( 'mojito.controllers' )[ NAME ] = {

        /**
         *  Method corresponding to the 'device_nav' action.
         * @param {Object}  ac          The ActionContext that provides access
         *                              to the Mojito API.
         */
        license: function( ac ) {
            let
                req = ac.http.getRequest(),
                query = req.query || {};
            ac.assets.addCss( './css/LicenseMojit.css' );
            ac.pageData.set( 'licenseType', query.licenseType || '' );
            ac.done( {
                status: 'ok',
                data: null
            }, { http: {} } );

        }
    };

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-http-addon',
        'mojito-assets-addon',
        'mojito-params-addon',
        'mojito-models-addon',
        'mojito-intl-addon',
        'mojito-data-addon'
    ]
} );