/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add('TestingMojitModelFoo', function(Y, NAME) {

/**
 * The TestingMojitModelFoo module.
 *
 * @module TestingMojit
 */

    /**
     * Constructor for the TestingMojitModelFoo class.
     *
     * @class TestingMojitModelFoo
     * @constructor
     */
    Y.namespace('mojito.models')[NAME] = {

        init: function(config) {
            this.config = config;
        },

        /**
         * Method that will be invoked by the mojit controller to obtain data.
         *
         * @param {Function}            callback         function(err,data) The callback function to call when the
         *        data has been retrieved.
         */
        getData: function(callback) {
            callback(null, { some: 'data' });
        }

    };

}, '0.0.1', {requires: []});
