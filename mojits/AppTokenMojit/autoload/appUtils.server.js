/**
 * User: pi
 * Date: 05/04/2018  15:52
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'appUtils', function( Y ) {

        /**
         * @module appUtils
         */

        /**
         * @method getAppDbName
         * @param {String} appName
         * @return {String}
         * @for doccirrus.api.appUtils
         */
        function getAppDbName( appName ) {
            return `sol_${appName}`;
        }

        /**
         * @property appUtils
         * @namespace doccirrus
         */
        Y.namespace( 'doccirrus' ).appUtils = {
            getAppDbName
        };

    },
    '0.0.1', { requires: [] }
);
