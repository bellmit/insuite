/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/



YUI.add( 'InSight2Mojit', function( Y, NAME ) {

    /**
     * The chartstest module.
     *
     * @module chartstest
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
        insight2: function( ac ) {

            const
                req = ac.http.getRequest(),
                countryCode = Y.doccirrus.auth.getCountryCode( req.user );

            ac.assets.addJs( './js/jquery-ui.min.js', 'bottom' );
            ac.assets.addJs( './js/crossfilter.min.js', 'bottom' );
            ac.assets.addJs( './js/dc.min.js', 'bottom' );

            if( !Y.doccirrus.auth.hasSectionAccess( req.user, 'InSight2Mojit.root' ) ) {
                Y.log( 'No admin account... aborting' );
                Y.doccirrus.utils.redirect( '/', ac );
            } else {
                ac.assets.addCss( './css/visualisation.css' );
                ac.assets.addCss( './css/analysis.css' );

                ac.assets.addCss( './css/InSight2Mojit.css' );

                let catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors(
                    {
                        actType: '',
                        country: countryCode || 'D'
                    } );

                // MOJ-3453: if country has no catalogs fall back to german catalogs
                if( Y.Object.isEmpty( catalogDescriptors ) ) {
                    catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors( {
                        actType: '',
                        country: 'D'
                    } );
                }

                ac.pageData.set( 'catalog-descriptors', catalogDescriptors );

                ac.done( {
                    status: 'ok',
                    data: null
                }, { http: {} } );
            }
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
        'dcauth',
        'catalog-api'
    ]
} );
