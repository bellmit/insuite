/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'InTimeAdminMojit', function( Y, NAME ) {
    

    /**
     * The InTimeAdminMojit module.
     *
     * @module InTimeAdminMojit
     */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace( 'mojito.controllers' )[NAME] = {

        /**
         * @param   {Object}            ac          The ActionContext that provides access to the Mojito API.
         *
         */
        intimeadmin: function( ac ) {
            var
                meta = {http: {}, title: Y.doccirrus.i18n('general.PAGE_TITLE.CONFIGURATION')};

            if( !Y.doccirrus.auth.hasModuleAccess( ac.http.getRequest() && ac.http.getRequest().user, NAME ) ) {
                Y.doccirrus.utils.redirect( `/license?licenseType=${Y.doccirrus.auth.getRequiredLicense( NAME )}`, ac );
                return;
            }

            if( !Y.doccirrus.auth.hasSectionAccess( ac.http.getRequest() && ac.http.getRequest().user, 'InTimeAdminMojit.intimeadmin' ) ) {
                Y.log( 'No admin account... aborting' );
                Y.doccirrus.utils.redirect( '/', ac );
            } else {
                ac.assets.addCss( '/static/dcbaseapp/assets/lib/jquery/minicolors/2.2.6/jquery.minicolors.css' );
                ac.assets.addJs( '/static/dcbaseapp/assets/lib/jquery/minicolors/2.2.6/jquery.minicolors.js', 'bottom' );
                ac.assets.addCss( './css/InTimeAdminMojit.css' );
                ac.done( {}, meta );
            }
        }

    };

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-http-addon',
        'mojito-assets-addon',
        'mojito-params-addon',
        'dcauth'
    ]
} );
