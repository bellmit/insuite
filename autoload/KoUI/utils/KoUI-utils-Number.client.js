/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'KoUI-utils-Number', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * KoUI utility namespace that covers Number.
     * @module KoUI-utils-Number
     */
    /**
     * KoUI utility namespace that covers Number.
     * @class doccirrus.KoUI.utils.Number
     */
    /**
     * KoUI comparators namespace for Number.
     * @class doccirrus.KoUI.utils.Number.comparators
     */
    /**
     * KoUI comparators namespace for Number.
     * @type doccirrus.KoUI.utils.Number.comparators
     * @property comparators
     * @for doccirrus.KoUI.utils.Number
     */
    Y.namespace( 'doccirrus.KoUI.utils.Number', 'doccirrus.KoUI.utils.Number.comparators' );
    var
        KoUI = Y.doccirrus.KoUI,
        NS = KoUI.utils.Number;

    /**
     * Compares two numbers.
     * @method number
     * @for doccirrus.KoUI.utils.Number.comparators
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    NS.comparators.number = function comparatorNumber( a, b ) {
        return a - b;
    };

}, '3.16.0', {
    requires: [
        'KoUI'
    ]
} );
