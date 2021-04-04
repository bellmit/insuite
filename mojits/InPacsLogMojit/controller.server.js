/**
 * User: abhijit.baldawa
 * Date: 25.10.17  16:17
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'InPacsLogMojit', function( Y, NAME ) {

    const
        {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
        getSettingsP = promisifyArgsCallback( Y.doccirrus.api.settings.get );

    /**
     * The InPacsLogMojit module.
     *
     * @module InPacsLogMojit
     */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace( 'mojito.controllers' )[NAME] = {

        /**
         * @param {Object} ac The ActionContext that provides access to the Mojito API.
         */
        inPacsLog: async function inPacsLog( ac ) {
            let
                meta = {http: {}, title: Y.doccirrus.i18n( 'top_menu.INPACSLOG' )},
                request = ac.http.getRequest(),
                user = request && request.user;

            if( !Y.doccirrus.auth.hasModuleAccess( user, NAME ) ) {
                Y.log( `inPacsLog: user does not have license for module ${NAME}`, 'warn', NAME );
                Y.doccirrus.utils.redirect( `/license?licenseType=${Y.doccirrus.auth.getRequiredLicense( NAME )}`, ac );
                return;
            }

            let [err, settings] = await formatPromiseResult(
                getSettingsP( {
                    user
                } )
            );
            if( err ) {
                Y.log( `inPacsLog: could not get settings: ${err.stack || err}`, 'warn', NAME );
            }
            if( settings && Array.isArray( settings ) && settings.length ) {
                settings = settings[0];
            }
            if( !Y.doccirrus.auth.hasSectionAccess( request && request.user, 'PatientTransferMojit.transferLog', {settings} ) ) {
                Y.log( `inPacsLog: user has insufficient access rights`, 'info', NAME );
                Y.doccirrus.utils.redirect( '/', ac );
            } else {
                ac.assets.addCss( './css/InPacsLogMojit.css' );
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
        'mojito-data-addon',
        'dcauth'
    ]
} );