/**
 *  Common controls and utilities for FEM and images
 *
 *  CONTENTS
 *
 *      SERVER IO
 *
 *          privateGet          -   AJAX GET from VPRC (convenience wrapper)
 *          privatePost         -   AJAX POST to VPRC (convenience wrapper)
 *          privatePut          -   AJAX PUT to VPRC (convenience wrapper)
 *          privateDelete       -   AJAX DELETE to VPRC (convenience wrapper)
 *          pucGet              -   AJAX GET from PUC (convenience wrapper)
 *
 *      INTERNATIONALIZATION
 *
 *          getUserLang         -   Get current language setting for this page
 *          setUserLang         -   Change current language setting for this page
 *          getIl8nDict         -   Load a translation dictionary via AJAX
 *
 *      MODAL DIALOGS
 *
 *          initModalBS2        -   Inject BS2 modal into current page (hidden)
 *          initModal           -   Inject BS3 modal into current page (hidden)
 *          setModal            -   Populate and display a modal, optional button callback
 *          addModalButton      -   Add a custom button to the current modal
 *          clearModal          -   Dismiss any currently shown modal
 *          inModal             -   Checks where page is currently displaying a modal
 *
 */

/*jshint bitwise:false */

/*global YUI, escape, unescape */

'use strict';
YUI.add( 'comctlLib', function( Y, NAME ) {

        //  Fixes for UTF8 base64 encoding, as used by forms and MediaMojit
        //  see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding

        /**
         *  Base64 encode a UTF-8 string
         *  credit: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding
         *
         *  @param  str {string}    UTF-8 string
         *  @returns    {string}
         */

        function UTF8ToB64( str ) {
            var b64;
            try {
                b64 = window.btoa( unescape( encodeURIComponent( str ) ) );
            } catch( parseErr ) {
                Y.log( 'Error encoding base64 string: ' + JSON.stringify( parseErr ), 'warn', NAME );
                Y.log( 'Error encoding base64 string: ' + str, 'warn', NAME );
                console.log( 'Stack trace follows: ', new Error().stack ); //  eslint-disable-line no-console
                b64 = '';
            }
            return b64;
        }

        /**
         *  Base64 decode to a UTF-8 string
         *  credit: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding
         *
         *  @param  str {string}    Base64 encoded / 7bit ASCII instring
         */


        function B64ToUTF8( str ) {
            var utf8str;

            try {
                utf8str = decodeURIComponent( escape( window.atob( str ) ) );
            } catch( serErr ) {
                Y.log( 'Error decoding base64 string: ' + JSON.stringify( serErr ), 'warn', NAME );
                Y.log( 'Error decoding base64 string: ' + str, 'warn', NAME );
                console.log( 'Stack trace follows: ', new Error().stack ); //  eslint-disable-line no-console
                utf8str = '';
            }

            return utf8str;
        }

        /**
         *  Create a random string to act as a unique identifier in UI operations
         *
         *  Used to disambiguate objects or index objects, especially in the dcforms event model,
         *  where there may be multiple sets of UI of a page, where array order is not constant, or
         *  before items have been saved the server.
         *
         *  ref: http://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
         */

        function getRandId() {
            return Math.random().toString( 36 ).slice( 2 );
        }

        /**
         * Given a text typed by a user in any language, create an array
         * of enums that match the text, searching only from the start of
         * the word, not within words.
         *
         * Usage: as the user types each letter, the server is able to narrow
         * down the number of records in a datatable, by performing a mongo $in
         * search.
         *
         * @param lang
         * @param search
         * @param list
         * @returns {Array}
         */

        function getEnumFilterList( lang, search, list ) {
            var
                result = [],
                i;
            if( search && lang && Array.isArray( list ) ) {
                for( i = 0; i < list.length; i++ ) {
                    if( list[ i ][ lang ] && 0 === list[ i ][ lang ].toLowerCase().indexOf( search.toLowerCase() ) ) {
                        result.push( list[ i ].val );
                    }
                }
            }
            return result;
        }

        // Operations with numbers

        /**
         * Returns count of decimal places for a number.
         * @param {number} number
         * @returns {number}
         */
        function decimalPlaces( number ) {
            if( 0 !== (number % 1) ) {
                return number.toString().split( "." )[ 1 ].length;
            }
            return 0;
        }

        /**
         * Converts JavaScript Number to String representation
         * @method numberToString
         * @param {Number} number
         * @param {Integer} [decimals=2] number of decimals
         * @param {String} [dec_point=','] decimal point
         * @param {String} [intWithoutDec=false] if set will not add ,00 to int
         * @returns {String}
         */
        function numberToString( number, decimals, dec_point, intWithoutDec ) {
            var thousands_sep = '.',
                result;

            function toFixedFix( number, decimals ) {
                var k = Math.pow( 10, decimals );
                return '' + Math.round( number * k ) / k;
            }

            decimals = !isFinite( +decimals ) ? 2 : Math.abs( decimals );
            dec_point = dec_point || ',';
            if( '.' === dec_point ) {
                thousands_sep = ',';
            }
            if( ',' === dec_point ) {
                thousands_sep = '.';
            }

            number = (number + '').replace( /[^0-9+\-Ee.]/g, '' );
            number = !isFinite( +number ) ? 0 : +number;

            result = (decimals ? toFixedFix( number, decimals ) : '' + Math.round( number )).split( '.' );

            if( 3 < result[ 0 ].length ) {
                result[ 0 ] = result[ 0 ].replace( /\B(?=(?:\d{3})+(?!\d))/g, thousands_sep );
            }
            if( (!intWithoutDec || result[ 1 ]) && (result[ 1 ] || '').length < decimals ) {
                result[ 1 ] = result[ 1 ] || '';
                result[ 1 ] += new Array( decimals - result[ 1 ].length + 1 ).join( '0' );
            }
            return result.join( dec_point );
        }

        /**
         * Converts String representation of number to JavaScript Number
         * @method stringToNumber
         * @param {String} sNumber
         * @param {String} [dec_point=','] decimal point
         * @return {Number}
         */
        function stringToNumber( sNumber, dec_point ) {
            if( !sNumber ) {
                return 0.00;
            }
            dec_point = dec_point || ',';
            //remove 1k delimiters first in case both delimiter are in string
            if( sNumber.indexOf( '.' ) !== -1 && sNumber.indexOf( ',' ) !== -1 ){
                sNumber = dec_point === ',' ? sNumber.replace( /\./g, '' ) : sNumber.replace( /\,/g, '' );
            }
            var parts = sNumber.split(/[,.]/),
                fractional;
            if( parts.length > 1){
                fractional = parts.pop() || '';
                sNumber = parts.join( '' ) + '.' + fractional;
            }
            return parseFloat( sNumber );
        }

        /**
         * Rounds number to specified precision
         * @param {Number} number
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        function dcRound( number, precision ) {
            precision = +precision || 2;
            var prec = Math.pow( 10, precision );
            return Math.round( number * prec ) / prec;
        }

        /**
         * Multiplies number with specified precision
         * @param {Number|String} a
         * @param {Number|String} b
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        function dcMul( a, b, precision ) {
            precision = +precision || 2;
            var prec = Math.pow( 10, precision );
            return dcRound( (((parseFloat( a ) * prec) * (parseFloat( b ) * prec)) / (prec * prec)), precision );
        }

        /**
         * Divides number with specified precision
         * @param {Number|String} a
         * @param {Number|String} b
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        function dcDiv( a, b, precision ) {
            precision = +precision || 2;
            var prec = Math.pow( 10, precision );
            return dcRound( ((parseFloat( a ) * prec) / (parseFloat( b ) * prec)), precision );
        }

        /**
         * Adds number with specified precision
         * @param {Number|String} a
         * @param {Number|String} b
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        function dcSum( a, b, precision ) {
            precision = +precision || 2;
            var prec = Math.pow( 10, precision );
            return dcRound( ((parseFloat( a ) * prec + parseFloat( b ) * prec) / prec), precision );
        }

        /**
         * Subtracts number with specified precision
         * @param {Number} a
         * @param {Number} b
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        function dcSubtraction( a, b, precision ) {
            precision = +precision || 2;
            var prec = Math.pow( 10, precision );
            return dcRound( ((parseFloat( a ) * prec - parseFloat( b ) * prec) / prec), precision );
        }

        /**
         * Checks if an argument is Numeric
         * @param {x} number value to check
         * @returns {Boolean}
         */
        function isNumeric( number ) {
            return !isNaN( parseFloat( number ) ) && isFinite( number );
        }

        /**
         * a simple get precision for number
         * // TODO: [MOJ-3128] take care of infinity, e+/e- and other stuff
         * @param {Number} number
         * @return {number}
         */
        function numberGetPrecision( number ) {
            var s = number + "",
                d = s.indexOf( '.' ) + 1;

            return !d ? 0 : s.length - d;
        }

        // STRING

        /**
         * Generates random String with specified length.
         * @method getRandomString
         * @param {Number} length
         * @param {String} [charSet='!#aA'] allowed chars. By default all chars are allowed.
         *  A - all upper case letter
         *  a - all lower case letter
         *  # - numbers
         *  ! - special symbols
         * @returns {string}
         */
        function getRandomString( length, charSet ) {
            var mask = '',
                result = '',
                i = length;
            charSet = charSet || '#!aA';
            if( -1 !== charSet.indexOf( 'a' ) ) {
                mask += 'abcdefghijklmnopqrstuvwxyz';
            }
            if( -1 !== charSet.indexOf( 'A' ) ) {
                mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            }
            if( -1 !== charSet.indexOf( '!' ) ) {
                mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
            }
            if( -1 !== charSet.indexOf( '#' ) ) {
                mask += '0123456789';
            }
            for( i; 0 < i; --i ) {
                result += mask[ Math.floor( Math.random() * mask.length ) ];
            }
            return result;
        }

        //  DIRTY OBJECT CHECKS / AUTOSAVE

        /**
         *  Make a simple hash of a string
         *
         *  This is used to check for dirty objects on navigation, to confirm abandoning unsaved changes on manual save
         *  and to prevent double-saving in autosave (unnecessary PUTs in response to events like mouse clicks)
         *
         *  credit: http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
         *  credit: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
         *
         *  @param txt  {String}    Some string to hash
         */

        function fastHash( txt ) {
            var
                hash = 0, //% 32 bit integer [int]
                i; //% char pos [int]

            if( 'object' === typeof txt ) {
                txt = JSON.stringify( txt );
            }

            if( 0 === txt.length ) {
                return hash;
            }

            for( i = 0; i < txt.length; i++ ) {
                hash = (((hash << 5) - hash) + txt.charCodeAt( i ));
                hash = hash & hash;
            }

            return hash;
        }

        /**
         *  Check if a string looks like an objectId
         *
         *  credit: http://stackoverflow.com/questions/11985228/mongodb-node-check-if-objectid-is-valid
         *
         *  @param txt
         *  @return {boolean}
         */
        function isObjectId( txt ) {
            var checkForHexRegExp = new RegExp( "^[0-9a-fA-F]{24}$" );
            return ( checkForHexRegExp.test( txt ) && 24 === txt.length );
        }

        Y.namespace( 'doccirrus' ).comctlLib = {
            UTF8ToB64: UTF8ToB64,
            B64ToUTF8: B64ToUTF8,
            getRandId: getRandId,
            getEnumFilterList: getEnumFilterList,
            decimalPlaces: decimalPlaces,
            numberToString: numberToString,
            stringToNumber: stringToNumber,
            dcRound: dcRound,
            dcMul: dcMul,
            dcDiv: dcDiv,
            dcSum: dcSum,
            dcSubtraction: dcSubtraction,
            isNumeric: isNumeric,
            numberGetPrecision: numberGetPrecision,
            getRandomString: getRandomString,
            fastHash: fastHash,
            isObjectId: isObjectId
        };

    }, '0.0.1',
    {
        requires: []
    }
);