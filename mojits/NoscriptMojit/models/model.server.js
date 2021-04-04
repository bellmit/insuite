/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add('noscriptmojit-model', function(Y, NAME) {

/**
 * The noscriptmojit-model module.
 *
 * @module noscriptmojit
 */

    /**
     * Constructor for the NoscriptMojitModel class.
     *
     * @class NoscriptMojitModel
     * @constructor
     */
    Y.namespace('mojito.models')[NAME] = {

        init: function(config) {
            this.config = config;
        },

        /**
         * Method that will be invoked by the mojit controller to obtain data.
         *
         * @param {Function} callback The callback function to call when the
         *        data has been retrieved. function(err,data)
         */
        getData: function(callback) {
            callback(
                null,
                {
                    i18n: ( key, data ) => {
                        const prefix = Y.doccirrus.auth.isPUC() ? 'patient-portal.' : '';
                        const label = Y.doccirrus.i18n( `NoscriptMojit.${prefix}${key}`, data );

                        if ( prefix && label.endsWith(key) ) {
                            return Y.doccirrus.i18n( `NoscriptMojit.${key}`, data );
                        }

                        return label;
                    }
                }
            );
        }

    };

}, '0.0.1', {requires: [
    'dcauth',
    'doccirrus'
]});
