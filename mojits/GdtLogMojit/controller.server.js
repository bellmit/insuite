/**
 * User: abhijit.baldawa
 * Date: 14.06.18  16:35
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'GdtLogMojit', function( Y, NAME ) {

    const
        {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
        getSettingsP = promisifyArgsCallback( Y.doccirrus.api.settings.get );

    /**
     * The GdtLogMojit module.
     *
     * @module GdtLogMojit
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
        gdtLog: async function gdtLog( ac ) {
            let
                meta = {http: {}, title: Y.doccirrus.i18n( 'top_menu.GDTLOG' )},
                request = ac.http.getRequest(),
                user = request && request.user;

            let [err, settings] = await formatPromiseResult(
                getSettingsP( {
                    user
                } )
            );
            if( err ) {
                Y.log( `gdtLog: could not get settings: ${err.stack || err}`, 'warn', NAME );
            }
            if( settings && Array.isArray( settings ) && settings.length ) {
                settings = settings[0];
            }
            if( !Y.doccirrus.auth.hasSectionAccess( request && request.user, 'GdtLogMojit.gdtLog', {settings} ) ) {
                Y.log( `gdtLog: user has insufficient access rights`, 'info', NAME );
                Y.doccirrus.utils.redirect( '/', ac );
            } else {
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