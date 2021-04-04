/*jslint node:true, nomen:true*/
/*global YUI */


YUI.add( 'SupportMojit', function( Y, NAME ) {

        /**
         * The SupportMojit module.
         *
         * @module Support
         */

        /**
         * Constructor for the Controller class.
         *
         * @class Controller
         * @constructor
         */
        Y.namespace( 'mojito.controllers' )[NAME] = {

            /**
             * Method corresponding to the 'index' action.
             *
             * @param {Object} ac The ActionContext that provides access
             *        to the Mojito API.
             */
            'support_nav': function( ac ) {
                let
                    isDCPRC = Y.doccirrus.auth.isDCPRC();
                Y.log( 'Entering index...', 'debug', NAME );

                if( isDCPRC ) {
                    ac.done( {
                        status: 'Mojito is working.',
                        data: {}
                    }, {} );
                } else {
                    Y.doccirrus.utils.redirect( '/', ac );
                }
            }
        };
    },
    '0.0.1', {
        requires: [
            'mojito',
            'dcauth',
            'mojito-assets-addon',
            'mojito-models-addon',
            'mojito-params-addon',
            'mojito-config-addon',
            'mojito-http-addon',
            'addons-viewengine-jade',
            'mojito-intl-addon'
        ]
    }
)
;