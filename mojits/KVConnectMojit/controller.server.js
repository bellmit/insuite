/**
 * User: do
 * Date: 05/09/17  20:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'KVConnectMojit', function( Y, NAME ) {
    

    /**
     * The KVConnectMojit module.
     *
     * @module KVConnectMojit
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
        kvconnect: function( ac ) {
            var
                meta = {http: {}, title: Y.doccirrus.i18n('general.PAGE_TITLE.KVCONNECT')},
                request = ac.http.getRequest();

            if( !Y.doccirrus.auth.hasSectionAccess( request && request.user, 'KVConnectMojit.kvconnect' ) ) {
                Y.log( 'No admin account... aborting' );
                Y.doccirrus.utils.redirect( '/', ac );
            }
            else {
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
