/*
 (c) Doc Cirrus Gmbh, 2013
 */

/**
 * Setup select2 country autocomplete
 */

/*global $, fun:true */

fun = function _fn( Y ) {
    'use strict';

    return {

        registerNode: function() {
            Y.doccirrus.utils.setupCountrySelect2( $( '.inputCountry' ) );
        },
        deregisterNode: function() {
        }

    };
};