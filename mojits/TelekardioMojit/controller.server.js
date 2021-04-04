/*global YUI */
YUI.add( 'TelekardioMojit', function( Y, NAME ) {

    const
        {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
        getSettingsP = promisifyArgsCallback( Y.doccirrus.api.settings.get );

    /**
     * The LabLogMojit module.
     *
     * @module LabLogMojit
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
        telekardio: async function telekardio( ac ) {
            let
                meta = {http: {}, title: Y.doccirrus.i18n( 'top_menu.TELEKARDIO' )},
                request = ac.http.getRequest(),
                user = request && request.user;

            let [err, settings] = await formatPromiseResult(
                getSettingsP( {
                    user
                } )
            );
            if( err ) {
                Y.log( `telekardio: could not get settings: ${err.stack || err}`, 'warn', NAME );
            }
            if( settings && Array.isArray( settings ) && settings.length ) {
                settings = settings[0];
            }
            if( !Y.doccirrus.auth.hasSectionAccess( request && request.user, 'TelekardioMojit.telekardio', {settings} ) ) {
                Y.log( `telekardio: user has insufficient access rights`, 'info', NAME );
                Y.doccirrus.utils.redirect( '/', ac );
            } else {
                ac.done( {}, meta );
            }
        },

        /**
         * @param {Object} ac The ActionContext that provides access to the Mojito API.
         */
        cardioConfig: async function cardioConfig( ac ) {
            let
                meta = {http: {}, title: Y.doccirrus.i18n( 'top_menu.TELEKARDIO' )},
                request = ac.http.getRequest(),
                user = request && request.user;

            let [err, settings] = await formatPromiseResult(
                getSettingsP( {
                    user
                } )
            );
            if( err ) {
                Y.log( `cardioConfig: could not get settings: ${err.stack || err}`, 'warn', NAME );
            }
            if( settings && Array.isArray( settings ) && settings.length ) {
                settings = settings[0];
            }
            if( !Y.doccirrus.auth.hasSectionAccess( request && request.user, 'TelekardioMojit.cardioConfig', {settings} ) ) {
                Y.log( `cardioConfig: user has insufficient access rights`, 'info', NAME );
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
