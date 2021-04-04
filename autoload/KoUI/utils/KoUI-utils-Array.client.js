/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'KoUI-utils-Array', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * KoUI utility namespace that covers Array.
     * @module KoUI-utils-Array
     */
    /**
     * KoUI utility namespace that covers Array.
     * @class doccirrus.KoUI.utils.Array
     */
    Y.namespace( 'doccirrus.KoUI.utils.Array' );
    var
        KoUI = Y.doccirrus.KoUI,
        NS = KoUI.utils.Array,
        comparators = [
            KoUI.utils.String.comparators,
            KoUI.utils.Number.comparators
        ],
        getObject = Y.doccirrus.commonutils.getObject,
        exists = Y.doccirrus.commonutils.exists;

    function getDirection( value ) {

        if( Y.Lang.isNumber( value ) ) {
            return value;
        }

        if( Y.Lang.isString( value ) ) {
            value = value.toLowerCase();
        }

        switch( value ) {
            case 'desc':
                return -1;
            case 'asc':
                return 1;
        }

    }

    /**
     * Maps a direction to one that mongo understands.
     * @method getDirection
     * @for doccirrus.KoUI.utils.Array
     * @param {number,string} value
     * @returns {number}
     */
    NS.getDirection = getDirection;

    function getComparator( value ) {
        var comparator;

        if( Y.Lang.isString( value ) ) {
            comparator = Y.Array.find( comparators, function( item ) {
                if( Y.Object.owns( item, value ) ) {
                    return true;
                }
            } );
            if( comparator ) {
                value = comparator[value];
            }
        }

        if( !Y.Lang.isFunction( value ) ) {
            value = KoUI.utils.String.comparators.natural;
        }

        return value;
    }

    /**
     * Get a comparator by name. Defaults to 'KoUI.utils.String.comparators.natural'.
     * @method getComparator
     * @for doccirrus.KoUI.utils.Array
     * @param {string} value
     * @returns {function}
     */
    NS.getComparator = getComparator;

    /**
     * Sorts an array by multiple sort configurations
     * @method sort
     * @for doccirrus.KoUI.utils.Array
     * @param {Object} parameters
     * @param {Array} parameters.sorters array of sort configurations
     * @param {Array} parameters.array array to sort
     */
    NS.sort = function( parameters ) {
        var
            sorters = parameters.sorters,
            array = parameters.array;

        if( !sorters.length ) {
            return;
        }

        if( !Y.Lang.isArray( array ) && !array.length ) {
            return;
        }

        array.sort( function( aObject, bObject ) {
            var
                result, index, sorter, a, b, sortBy, direction;

            for( index = 0; sorter = sorters[index]; index++ ) {// jshint ignore:line

                if( Y.Object.owns( aObject, sorter.forPropertyName ) ) {
                    a = aObject[sorter.forPropertyName];
                } else if( exists( sorter.forPropertyName, aObject ) ) {
                    a = getObject( sorter.forPropertyName, aObject );
                } else {
                    a = aObject;
                }

                if( Y.Object.owns( bObject, sorter.forPropertyName ) ) {
                    b = bObject[sorter.forPropertyName];
                } else if( exists( sorter.forPropertyName, bObject ) ) {
                    b = getObject( sorter.forPropertyName, bObject );
                } else {
                    b = bObject;
                }

                sortBy = getComparator( sorter.sortBy );
                direction = getDirection( sorter.direction );
                result = sortBy( a, b ) * direction;

                if( result ) {
                    break;
                }
            }
            //console.warn( 'Array.sort.result :', aObject, bObject, result );
            return result;

        } );

    };

}, '3.16.0', {
    requires: [
        'dccommonutils',

        'KoUI',
        'KoUI-utils-String',
        'KoUI-utils-Number'
    ]
} );
