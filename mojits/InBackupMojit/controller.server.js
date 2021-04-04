/*global YUI */
YUI.add( 'InBackupMojit', function( Y, NAME ) {
    

    /**
     * The InBackupMojit module.
     *
     * @module InBackupMojit
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
        inBackupMojit: function( ac ) {
            var
                user = ac.http.getRequest() && ac.http.getRequest().user,
                meta = {http: {}};

            if( !(Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD() || Y.doccirrus.auth.isVPRCAdmin( user )) ) {
                Y.log( 'No prc ... aborting' );
                Y.doccirrus.utils.redirect( '/', ac );
                return;
            }

            if( !Y.doccirrus.auth.hasSectionAccess( user, `${NAME}.inBackupMojit` ) ) {
                Y.log( 'No admin account ... aborting' );
                Y.doccirrus.utils.redirect( '/', ac );
                return;
            }

            //MOJ-7477 - inBackup is now default service. inBackup now refers to inBackup cloud
            // if( !Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, 'inBackup' ) ) {
            //     Y.log( 'No license "inBackup" ... aborting' );
            //     Y.doccirrus.utils.redirect( `/license?licenseType=${Y.doccirrus.auth.getRequiredLicense( NAME )}`, ac );
            //     return;
            // }

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
        'dcutils',
        'dcauth',
        'dclicmgr'
    ]
} );
