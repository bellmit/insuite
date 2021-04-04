/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'KoUI-utils-String', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * KoUI utility namespace that covers String.
     * @module KoUI-utils-String
     */
    /**
     * KoUI utility namespace that covers String.
     * @class doccirrus.KoUI.utils.String
     */
    /**
     * KoUI comparators namespace for String.
     * @class doccirrus.KoUI.utils.String.comparators
     */
    /**
     * KoUI comparators namespace for String.
     * @type doccirrus.KoUI.utils.String.comparators
     * @property comparators
     * @for doccirrus.KoUI.utils.String
     */
    Y.namespace( 'doccirrus.KoUI.utils.String', 'doccirrus.KoUI.utils.String.comparators' );
    var
        KoUI = Y.doccirrus.KoUI,
        NS = KoUI.utils.String,
        ArraySort = Y.ArraySort;

    /**
     * Compares two strings.
     * @method natural
     * @for doccirrus.KoUI.utils.String.comparators
     * @param {string|number} a
     * @param {string|number} b
     * @returns {number}
     */
    NS.comparators.natural = ArraySort.naturalCompare;

}, '3.16.0', {
    requires: [
        'arraysort',

        'KoUI'
    ]
} );
