/*jslint anon:true, sloppy:true, nomen:true*/
/*global Math, NaN, YUI */
YUI.add( 'KoUI-utils-Math', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * KoUI utility namespace that covers Math.
     * @module KoUI-utils-Math
     */
    /**
     * KoUI utility namespace that covers Math.
     * @class doccirrus.KoUI.utils.Math
     */
    Y.namespace( 'doccirrus.KoUI.utils.Math' );
    var
        KoUI = Y.doccirrus.KoUI,
        NS = KoUI.utils.Math;

    /**
     * Decimal adjustment of a number.
     *
     * @param {String} type The type of adjustment.
     * @param {Number} value The number.
     * @param {Integer} exp The exponent (the 10 logarithm of the adjustment base).
     * @returns {Number} The adjusted value.
     * @author https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
     */
    function decimalAdjust( type, value, exp ) {
        // If the exp is undefined or zero...
        if( typeof exp === 'undefined' || +exp === 0 ) {
            return Math[type]( value );
        }
        value = +value;
        exp = +exp;
        // If the value is not a number or the exp is not an integer...
        if( isNaN( value ) || !(typeof exp === 'number' && exp % 1 === 0) ) {
            return NaN;
        }
        // Shift
        value = value.toString().split( 'e' );
        value = Math[type]( +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)) );
        // Shift back
        value = value.toString().split( 'e' );
        return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
    }

    /**
     * Decimal adjustment of a number using Math.round
     *
     * @method round
     * @param {Number} value The number.
     * @param {Integer} exp The exponent (the 10 logarithm of the adjustment base).
     * @return {Number}  The adjusted value.
     * @for doccirrus.KoUI.utils.Math
     */
    NS.round = function round( value, exp ) {
        return decimalAdjust( 'round', value, exp );
    };

    /**
     * Decimal adjustment of a number using Math.floor
     *
     * @method floor
     * @param {Number} value The number.
     * @param {Integer} exp The exponent (the 10 logarithm of the adjustment base).
     * @return {Number}  The adjusted value.
     * @for doccirrus.KoUI.utils.Math
     */
    NS.floor = function floor( value, exp ) {
        return decimalAdjust( 'floor', value, exp );
    };

    /**
     * Decimal adjustment of a number using Math.ceil
     *
     * @method ceil
     * @param {Number} value The number.
     * @param {Integer} exp The exponent (the 10 logarithm of the adjustment base).
     * @return {Number}  The adjusted value.
     * @for doccirrus.KoUI.utils.Math
     */
    NS.ceil = function ceil( value, exp ) {
        return decimalAdjust( 'ceil', value, exp );
    };

    /**
     * Sums up all values within an array
     *
     * @method sum
     * @param {array} array of numbers
     * @param {startWith=0} startWith The value to start with
     * @for doccirrus.KoUI.utils.Math
     */
    NS.sum = function sum( array, startWith ) {
        if( !startWith ) {
            startWith = 0;
        }
        if( !array.length ) {
            return startWith;
        }
        return Y.Array.reduce( array, startWith, function( a, b ) {
            return a + b;
        } );
    };

}, '3.16.0', {
    requires: [
        'KoUI'
    ]
} );
