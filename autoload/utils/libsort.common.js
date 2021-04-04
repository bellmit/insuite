/**
 * User: rrrw
 * Date: 21.11.13  08:50
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI*/

'use strict';

/**
 *
 * Any dates and times coming out of the calendar can be trusted since the calendar does
 * an automatic conversion to UTC().  In the database, UTC values are stored!!
 *
 */

YUI.add( 'dcsortlib', function( Y, NAME ) {

        function DCSortUtils() {
            // purely static object at the moment, nothing in the instances.
        }

        /**
         * Optimised generic sorted merge algorithm with two levels of sorting.
         *
         * @param arr1 first sorted array
         * @param arr2 second sorted array
         * @param comp1  first compare function (if not defined, '-' is used (subtraction))
         * @param comp2  second optional compare function (if not defined ignored)
         * @returns {Array}
         */
        DCSortUtils.prototype.sortedMerge = function sortedMerge( arr1, arr2, comp1, comp2 ) {
            var item1_1,
                item1_2,
                item2_1,
                item2_2,
                result = [];

            comp1 = comp1 || function( a, b ) {
                return b - a;
            };

            while( 0 < arr1.length && 0 < arr2.length ) {
                item1_1 = arr1[0];
                item1_2 = arr2[0];
                if( 0 === comp1( item1_1, item1_2 ) ) {
                    arr1 = arr1.slice( 1, arr1.length );
                    arr2 = arr2.slice( 1, arr2.length );
                    if( comp2 ) {
                        item2_1 = comp2( item1_1 ) || 0;
                        item2_2 = comp2( item1_2 ) || 0;
                    }
                    if( item2_1 <= item2_2 ) {
                        result.push( item1_1 );
                        result.push( item1_2 );
                    } else {
                        result.push( item1_2 );
                        result.push( item1_1 );
                    }
                } else if( 0 > comp1( item1_1, item1_2 ) ) {
                    result.push( item1_1 );
                    arr1 = arr1.slice( 1, arr1.length );
                } else {
                    result.push( item1_2 );
                    arr2 = arr2.slice( 1, arr2.length );
                }
            }
            if( 0 < arr1.length ) {
                result = result.concat( arr1 );
            } else if( 0 < arr2.length ) {
                result = result.concat( arr2 );
            }
            return result;

        };

        DCSortUtils.prototype.sortedInsert = function sortedInsert( element, array, comp ) {

            var i;
            for( i = 0; i < array.length; i++ ) {
                if( 0 > comp( array[i], element ) ) {
                    break;
                }
            }
            array.splice( i, 0, element );
            return array;

        };

        Y.namespace( 'doccirrus' ).utils.sort = new DCSortUtils();

    },
    '0.0.1', {requires: ['dcutils']}
);
