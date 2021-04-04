/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add('NoscriptMojit', function(Y, NAME) {

/**
 * The noscriptmojit module.
 *
 * @module noscriptmojit
 */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace('mojito.controllers')[NAME] = {

        /**
         * Method corresponding to the 'index' action.
         *
         * @param {Object} ac The ActionContext that provides access
         *        to the Mojito API.
         */
        noscript: function(ac) {
            ac.models.get('model').getData(function(err, data) {
                if (err) {
                    ac.error(err);
                    return;
                }
                ac.assets.addCss('./index.css');

                ac.done({
                    status: 'Mojito is working.',
                    data: data
                });
            });
        }

    };

}, '0.0.1', {requires: ['mojito', 'mojito-assets-addon', 'mojito-models-addon']});
