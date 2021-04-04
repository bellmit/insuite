/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'ImportMojit', function( Y, NAME ) {
    

    /**
     * The ImportMojit module.
     *
     * @module ImportMojit
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
         */
        importUtility: function( ac ) {
            let
                meta = {http: {}, title: 'Import Utility'},
                appName = Y.doccirrus.schemas.apptoken.builtinAppNames.DATAIMPORT,
                user = ac.http.getRequest() && ac.http.getRequest().user;

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'appreg',
                action: 'get',
                query: {
                    appName: appName, hasAccess: true
                },
                options: {
                    limit: 1
                }
            }, ( err, results ) => {
                if( err ) {
                    Y.log( `Error occurred while checking if ${appName} app has access or not.`, 'error', NAME );
                    ac.done( {
                        status: '500',
                        data: err
                    } );
                }
                if( results && Array.isArray( results ) && results.length && results[0].hasAccess ) {

                    if( !Y.doccirrus.auth.getImportDir() ) {
                        Y.log( 'No import dir... aborting', 'info', NAME );
                        Y.doccirrus.utils.redirect( '/', ac );
                    } else {
                        ac.done( {}, meta );
                    }
                } else {
                    Y.log( `App ${appName} does not have access... aborting`, 'info', NAME );
                    Y.doccirrus.utils.redirect( '/', ac );
                }
            } );

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
