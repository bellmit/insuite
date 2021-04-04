/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'PatientTransferMojit', function( Y, NAME ) {

    const
        {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
        getSettingsP = promisifyArgsCallback( Y.doccirrus.api.settings.get );

    /**
     * The PatientTransferMojit module.
     *
     * @module PatientTransferMojit
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
        patientTransfer: async function patientTransfer( ac ) {
            let
                meta = {http: {}, title: Y.doccirrus.i18n( 'top_menu.TRANSFER' )},
                request = ac.http.getRequest(),
                user = request && request.user;

            let [err, settings] = await formatPromiseResult(
                getSettingsP( {
                    user
                } )
            );
            if( err ) {
                Y.log( `patientTransfer: could not get settings: ${err.stack || err}`, 'warn', NAME );
            }
            if( settings && Array.isArray( settings ) && settings.length ) {
                settings = settings[0];
            }
            if( !Y.doccirrus.auth.hasSectionAccess( request && request.user, 'PatientTransferMojit.transferLog', {settings} ) ) {
                Y.log( `patientTransfer: user has insufficient access rights`, 'info', NAME );
                Y.doccirrus.utils.redirect( '/', ac );
            } else {
                ac.pageData.set( 'currentUser', user );
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
