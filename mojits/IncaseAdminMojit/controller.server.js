/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add('IncaseAdminMojit', function(Y, NAME) {
    

/**
 * The IncaseAdminMojit module.
 *
 * @module IncaseAdminMojit
 */

    const
        { masterDCFormTenant } = Y.doccirrus.utils.getConfig( 'env.json' );

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace('mojito.controllers')[NAME] = {

        /**
         * Method corresponding to the 'incase_nav' action.
         *
         * @param {Object}  ac The ActionContext that provides access to the Mojito API.
         */
        incase_nav: function( ac ) {
            var
                meta = {http: {}, title: Y.doccirrus.i18n('general.PAGE_TITLE.CONFIGURATION')},
                catalogDescriptors;

            //  MOJ-8938 Replace older version of minicolors
            ac.assets.addCss( '/static/dcbaseapp/assets/lib/jquery/minicolors/2.2.6/jquery.minicolors.css' );
            ac.assets.addJs( '/static/dcbaseapp/assets/lib/jquery/minicolors/2.2.6/jquery.minicolors.js', 'bottom' );
            //ac.assets.addJs( '/static/dcbaseapp/assets/lib/jquery/minicolors/2.1.10/jquery.minicolors-defaults.js', 'bottom' );

            ac.assets.addCss( '/static/IncaseAdminMojit/assets/css/IncaseAdminMojit.css' );
            ac.assets.addCss( '/static/InvoiceMojit/assets/css/InvoiceMojit.css' );
            ac.assets.addJs( '/static/InvoiceMojit/assets/js/knockout_dragdrop.js' );

            ac.assets.addJs( Y.doccirrus.utils.getWorkaroundPath(), 'bottom' );

            ac.assets.addJs( '/static/dcbaseapp/assets/lib/mathjs/mathjs.min.js', 'bottom'  );
            ac.assets.addJs( '/static/dcbaseapp/assets/lib/mathjax/tex-chtml.js', 'bottom'  );

            Y.doccirrus.forms.assethelper(ac);

            if( !Y.doccirrus.auth.hasSectionAccess( ac.http.getRequest() && ac.http.getRequest().user, 'IncaseAdminMojit.incase_nav' ) ) {
                Y.log( 'No admin account... aborting' );
                Y.doccirrus.utils.redirect( '/', ac );
            } else {

                catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors(
                    {
                        actType: ''
                    } );

                // MOJ-3453: if country has no catalogs fall back to german catalogs
                if( Y.Object.isEmpty( catalogDescriptors ) ) {
                    catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors( {
                        actType: ''
                    } );
                }

                ac.pageData.set( 'catalog-descriptors', catalogDescriptors );
                ac.pageData.set( 'masterDCFormTenant', masterDCFormTenant );

                ac.done( {}, meta );
            }
        },

        masterTab: function( ac ) {
            const meta = {http: {}, noTopMenu: true };
            ac.assets.addJs( Y.doccirrus.utils.getWorkaroundPath(), 'bottom' );
            ac.assets.addJs( Y.doccirrus.utils.getBundlePath( 'masterTab.bundle.js' ), 'bottom' );
            ac.done( {}, meta );
        }

    };

}, '0.0.1', {requires: [
    'mojito',
    'mojito-http-addon',
    'mojito-assets-addon',
    'mojito-params-addon',
    'mojito-models-addon',
    'mojito-intl-addon',
    'mojito-data-addon',
    'dcauth',
    'activitysettings-api',
    'activity-api'
]});
