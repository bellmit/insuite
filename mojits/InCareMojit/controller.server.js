/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add( 'InCareMojit', function( Y, NAME ) {

    /**
     * The InCareMojit module.
     *
     * @module InCareMojit
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
        incare_nav: function( ac ) {
            ac.done( {}, {title: Y.doccirrus.i18n( 'general.PAGE_TITLE.CONFIGURATION' )} );
        }

    };

}, '0.0.1', {requires: ['mojito', 'mojito-assets-addon', 'mojito-models-addon']} );
