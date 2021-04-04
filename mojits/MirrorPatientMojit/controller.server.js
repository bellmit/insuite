/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add('MirrorPatientMojit', function(Y, NAME) {

/**
 * The MirrorPatientMojit module.
 *
 * @module MirrorPatientMojit
 */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace('mojito.controllers')[NAME] = {

        /**
         * Method corresponding to the 'mirrorpatient_nav' action.
         *
         * @param {Object}  ac The ActionContext that provides access
         *        to the Mojito API.
         */
        mirrorpatient_nav: function(ac) {

            ac.assets.addCss( '/static/InCaseMojit/assets/css/InCaseMojit.css' );
            ac.assets.addCss( '/static/FormEditorMojit/assets/css/treeview.css' );
            //ac.assets.addCss( Y.doccirrus.media.fonts.getCssUrl( ac ) );

            ac.done( {status: 'ok',
                data: null}, { isd: Y.doccirrus.auth.isISD(), title: Y.doccirrus.i18n('general.PAGE_TITLE.PATIENTS')});
        }

    };

}, '0.0.1', {requires: ['mojito', 'mojito-assets-addon', 'mojito-models-addon']});
