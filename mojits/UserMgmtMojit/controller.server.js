/**
 * User: ts
 * Date: 10.01.13
 * (c) 2012, 2013 Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/



YUI.add( 'UserMgmtMojit', function( Y, NAME ) {

        /**
         * The UserMgmtMojit module.
         *
         * @module UserMgmtMojit
         */

        Y.namespace( 'mojito.controllers' )[NAME] = {

            //
            //  ===========================  HTML HANDLING METHODS ========================
            /**
             * InTouch admin sections
             *
             * @param {Object}          ac
             */
            intouchAdmin: function( ac ) {
                var
                    meta = {
                        http: {},
                        _prc: Y.doccirrus.auth.isPRC(),
                        title: Y.doccirrus.i18n('general.PAGE_TITLE.CONFIGURATION')
                    },
                    request = ac.http.getRequest();

                if( Y.doccirrus.auth.hasSectionAccess( request && request.user, 'UserMgmtMojit.intouchAdmin' ) ) {
                    ac.done( { _prc: Y.doccirrus.auth.isPRC() }, meta );
                }
                else {
                    Y.log( 'No section access ... aborting' );
                    Y.doccirrus.utils.redirect( '/', ac );
                }

            },
            /**
             * Returns a patient portal 'admin page' for this customer.
             * @param   {Object}            ac
             */
            remotepatportaladmin: function( ac ) {

                Y.log( 'Entering patportaladmin ...', 'debug', NAME );

                ac.done( {
                    status: 'Mojito is working.'
                }, {
                    http: {},
                    title: Y.doccirrus.i18n('general.PAGE_TITLE.SERVICES')
                } );

            },

            //
            //  ===========================  REST METHODS ========================
            //

            /**
             * Handling backup.
             * @param   {Object}            ac
             */
            'backup': function( ac ) {


                // Filter parameters

                // Disptach switch

                // Y.doccirrus.api.cli.method()

                var
                    params = ac.rest.originalparams,
                    callback = this._getCallback( ac ),
                    apiMethod;

                apiMethod = params.query;

                console.log( "BACKUP API" );

                if( apiMethod && Y.doccirrus.api.cli[apiMethod] ) {
                    Y.doccirrus.api.cli[apiMethod]( params, callback, ac.rest.user );
                }
            }
        };

    }, '0.0.1',
    {requires: [
        'doccirrus',
        'mojito',
        'mojito-assets-addon',
        'mojito-models-addon',
        'mojito-params-addon',
        'mojito-data-addon',
        'mojito-http-addon',
        'mojito-data-addon',
        'addons-viewengine-jade',
        'mojito-intl-addon'
    ]} );
