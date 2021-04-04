/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/


YUI.add( 'RegistrationMojit', function( Y, NAME ) {

        /**
         *
         * RegistrationMojit takes care of user and customer registration process
         *
         */

        /*
         * module wide variables and constants
         */

        /**
         * Constructor for the Controller class.
         *
         * @class Controller
         * @constructor
         */
        Y.mojito.controllers[NAME] = {

            /**
             *  Catch All method -- this mojit can be relied on to throw an error!
             *
             * @param ac {Object} The ActionContext that provides access
             *        to the Mojito API.
             */

            /**
             *
             * The user clicked their OPT-IN link!
             *
             * 1. update the contact's status (if required)
             * 2. transmit the future loginlink (if required)
             *
             * @param {Object}  ac
             */
            regoptin: function( ac ) {
                var
                    params = ac.params.getFromMerged(),
                    isTrial = params.trial;

                function reportError( str ) {
                    Y.log( str, 'warn', NAME );
                    Y.doccirrus.utils.reportErrorJSON( ac, 500, 'Server error' );
                }

                function exit( statusObj ) {
                    if( 'true' === isTrial ) {
                        statusObj.trial = true; // distinguish from the old registration
                        statusObj.optinPage = Y.doccirrus.auth.getWWWUrl( '/trial_optin?status=' + statusObj.status );
                        ac.done( statusObj, {noTopMenu: true} );

                    } else {
                        ac.done( statusObj );
                    }
                }

                Y.doccirrus.api.company.finalConfirm( {
                    data: params,
                    callback: function( err, status ) {
                        if( err ) {
                            reportError( err );
                        } else {
                            exit( status );
                        }
                    }
                } );
            },
            //
            //
            //  REST calls
            //
            //
            getModelName: function() {
                return 'description';
            },

            /**
             * Search for a record, or carry out a custom action.
             * @param {Object}          ac
             */
            get: function( ac ) {
                Y.doccirrus.utils.unsupportedActionJSON( ac, 'GET', 'register' );
            },
            /**
             * Requires an ID --> then updates the record with new data.
             * Idempotent
             * @param {Object}          ac
             */
            put: function( ac ) {
                Y.doccirrus.utils.unsupportedActionJSON( ac, 'PUT', 'register' );
            },

            /**
             * Delete a record or records.
             * @param {Object}          ac
             */
            'delete': function( ac ) {
                Y.doccirrus.utils.unsupportedActionJSON( ac, 'DELETE', 'register' );
            }

        }
        ;

    },
    '0.0.1', {requires: [
        'mojito',
        'mojito-assets-addon',
        'mojito-models-addon',
        'mojito-params-addon',
        'mojito-config-addon',
        'mojito-http-addon',
        'addons-viewengine-jade',
        'mojito-intl-addon'
    ]}
)
;
