/**
 * User: rrrw
 * Date: 13/11/2012  13:33
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'ProfileMojit', function( Y, NAME ) {


        /**
         * The CalTest module.
         *
         *  Everything to do with Calendars, schedules, and repetitions (events, instances of reps)
         *  including scheduling logic.
         *
         * @module CalTest
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
            profile: function( ac ) {
                ac.done( {}, {isd: Y.doccirrus.auth.isISD(), title: Y.doccirrus.i18n( 'general.PAGE_TITLE.PROFILE' )} );
            }
        };

    },
    '0.0.1', {requires: [
        'mojito',
        'mojito-assets-addon',
        'mojito-params-addon',
        'mojito-http-addon',
        'mojito-intl-addon'
    ]}
);