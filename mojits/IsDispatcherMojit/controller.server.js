/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add( 'IsDispatcherMojit', function( Y, NAME ) {

    /**
     * The IsDispatcherMojit module.
     *
     * @module IsDispatcherMojit
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
        isdispatcher_nav: function( ac ) {
            ac.assets.addCss( './css/isdispatchermojit.css' );

            ac.done( {}, { isd: Y.doccirrus.auth.isISD(), title: Y.doccirrus.i18n( 'general.PAGE_TITLE.DISPATCHER' )} );
        }

    };

}, '0.0.1', {requires: ['mojito', 'mojito-assets-addon', 'mojito-models-addon']} );
