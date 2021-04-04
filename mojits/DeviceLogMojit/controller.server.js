/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'DeviceLogMojit', function( Y, NAME ) {

    const
        {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
        getSettingsP = promisifyArgsCallback( Y.doccirrus.api.settings.get );

    /**
     * The DeviceLogMojit module.
     *
     * @module DeviceLogMojit
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
        deviceLog: async function deviceLog( ac ) {
            let
                meta = {http: {}, title: Y.doccirrus.i18n( 'top_menu.DEVICE_LOG' )},
                request = ac.http.getRequest(),
                user = request && request.user;

            let [err, settings] = await formatPromiseResult(
                getSettingsP( {
                    user
                } )
            );
            if( err ) {
                Y.log( `deviceLog: could not get settings: ${err.stack || err}`, 'warn', NAME );
            }
            if( settings && Array.isArray( settings ) && settings.length ) {
                settings = settings[0];
            }
            if( !Y.doccirrus.auth.hasSectionAccess( request && request.user, 'DeviceLogMojit.deviceLog', {settings} ) ) {
                Y.log( `deviceLog: user has insufficient access rights`, 'info', NAME );
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
