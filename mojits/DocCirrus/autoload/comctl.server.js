/**
 *  Common controls and utilities for FEM and images
 *
 *  CONTENTS
 *
 *      SERVER IO
 *
 *          privateGet          -   AJAX GET from VPRC (convenience wrapper)
 *          privatePost         -   AJAX POST to VPRC (convenience wrapper)
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

/*global YUI */



YUI.add(
    'dc-comctl',
    function( Y, NAME ) {
        var myComctl,
            fs = require( 'fs' ),
            path = require( 'path' );

        function Comctl(){

        }

        Comctl.prototype.getUserLang = function() {
            var
                availableLangs = ['en', 'de', 'de-ch'],
                parts,
                userLang = Y.config.lang;

            if( !userLang || -1 === availableLangs.indexOf( userLang ) ) {
                if( 0 < userLang.indexOf( '-' ) ) {
                    parts = userLang.split( '-' );
                    userLang = parts[0];
                    if( -1 === availableLangs.indexOf( userLang ) ) {
                        Y.log( 'User language not available > using "de"', 'warn', NAME );
                        userLang = 'de';
                    }
                } else {
                    Y.log( 'User language not available > using "de"', 'warn', NAME );
                    userLang = 'de';
                }
            }

            return userLang;
        };

        // Operations with numbers

        /**
         * Converts JavaScript Number to String representation for current user locale
         * @method numberToLocalString
         * @param {Number} number
         * @param {Object} [config]
         * @param {Object} [config.intWithoutDec=false] if set will not add ,00 to int
         * @param {Number} [config.decimals=2] number of decimals
         * @returns {String}
         */
        Comctl.prototype.numberToLocalString = function( number, config ) {
            config = config || {};
            var
                defaults = Y.merge( {
                    decimals: 2
                }, config ),
                dec_point = ',',
                intWithoutDec = config.intWithoutDec,
                locale = this.getUserLang();
            if( 'de' !== locale ) {
                dec_point = '.';
            }
            return this.numberToString( number, defaults.decimals, dec_point, intWithoutDec );
        };

        /**
         * Converts JavaScript Number to String representation for current user locale
         *
         * For activities, currency depends on the casefolder, since inSwiss practices may have both Euro and Franc
         * denominated treatments/invoices/receipts.  EXTMOJ-2091
         *
         * @method numberToLocalString
         * @param   {Number}    number
         * @param   {Boolean}   compact     If true, no space between currency symbol and number
         * @param   {String}    currency    Currency code EUR/CHF
         * @returns {String}
         */
        Comctl.prototype.numberToLocalCurrency = function( number, compact, currency ) {
            var
                res = Y.doccirrus.comctl.numberToLocalString( number ),
                currencySymbol = ( 'CHF' === currency ) ? 'Fr.' : '€';

            return res + (compact ? '' : ' ') + currencySymbol;
        };

        /**
         * Converts String representation of number for current user locale to JavaScript Number
         * @method localStringToNumber
         * @param {String} sNumber
         * @returns {Number}
         */
        Comctl.prototype.localStringToNumber = function( sNumber ) {
            var dec_point = ',',
                locale = this.getUserLang();
            if( 'de' !== locale && 'de-ch' !== locale  ) {
                dec_point = '.';
            }
            return this.stringToNumber( sNumber, dec_point );

        };

        /**
         * Converts JavaScript Number to String representation
         * @method numberToString
         * @param {Number} number
         * @param {Integer} [decimals=2] number of decimals
         * @param {String} [dec_point=','] decimal point
         * @param {String} [intWithoutDec=false] if set will not add ,00 to int
         * @returns {String}
         */
        Comctl.prototype.numberToString = function( number, decimals, dec_point, intWithoutDec ) {
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

            if( result[0].length > 3 ) {
                result[0] = result[0].replace( /\B(?=(?:\d{3})+(?!\d))/g, thousands_sep );
            }
            if( (!intWithoutDec || result[ 1 ]) && (result[ 1 ] || '').length < decimals ) {
                result[1] = result[1] || '';
                result[1] += new Array( decimals - result[1].length + 1 ).join( '0' );
            }
            return result.join( dec_point );
        };

        /**
         * Converts String representation of number to JavaScript Number
         * @method stringToNumber
         * @param {String} sNumber
         * @param {String} [dec_point=','] decimal point
         * @return {Number}
         */
        Comctl.prototype.stringToNumber = function( sNumber, dec_point ) {
            if( !sNumber ) {
                return 0.00;
            }
            dec_point = dec_point || ',';
            //remove 1k delimiters first in case both delimiter are in string
            if( sNumber.indexOf( '.' ) !== -1 && sNumber.indexOf( ',' ) !== -1 ){
                sNumber = dec_point === ',' ? sNumber.replace( /\./g, '' ) : sNumber.replace( /\,/g, '' );
            }
            let parts = sNumber.split(/[,.]/),
                fractional;
            if( parts.length > 1){
                fractional = parts.pop() || '';
                sNumber = parts.join( '' ) + '.' + fractional;
            }
            return parseFloat( sNumber );
        };

        /**
         * Rounds number to specified precision
         * @param {Number} number
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        Comctl.prototype.dcRound = function( number, precision ) {
            precision = +precision || 2;
            var prec = Math.pow( 10, precision );
            return Math.round( number * prec ) / prec;
        };
        /**
         * Multiplies number with specified precision
         * @param {Number, String} a
         * @param {Number, String} b
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        Comctl.prototype.dcMul = function( a, b, precision ) {
            precision = +precision || 2;
            var prec = Math.pow( 10, precision );
            return this.dcRound( (((parseFloat( a ) * prec) * (parseFloat( b ) * prec)) / (prec * prec)), precision );
        };

        /**
         * Divides number with specified precision
         * @param {Number, String} a
         * @param {Number, String} b
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        Comctl.prototype.dcDiv = function( a, b, precision ) {
            precision = +precision || 2;
            var prec = Math.pow( 10, precision );
            return this.dcRound( ((parseFloat( a ) * prec) / (parseFloat( b ) * prec)), precision );
        };

        /**
         * Adds number with specified precision
         * @param {Number, String} a
         * @param {Number, String} b
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        Comctl.prototype.dcSum = function( a, b, precision ) {
            precision = +precision || 2;
            var prec = Math.pow( 10, precision );
            return this.dcRound( ((parseFloat( a ) * prec + parseFloat( b ) * prec) / prec), precision );
        };

        /**
         * Subtracts number with specified precision
         * @param {Number} a
         * @param {Number} b
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        Comctl.prototype.dcSubtraction = function( a, b, precision ) {
            precision = +precision || 2;
            var prec = Math.pow( 10, precision );
            return this.dcRound( ((parseFloat( a ) * prec - parseFloat( b ) * prec) / prec), precision );
        };

        /**
         * Checks if an argument is Numeric
         * @param {x} number value to check
         * @returns {Boolean}
         */
        Comctl.prototype.isNumeric = function( number ) {
            return !isNaN( parseFloat( number ) ) && isFinite( number );
        };

        /**
         * a simple get precision for number
         * // TODO: [MOJ-3128] take care of infinity, e+/e- and other stuff
         * @param {Number} number
         * @return {number}
         */
        Comctl.prototype.numberGetPrecision = function numberGetPrecision( number ) {
            var s = number + "",
                d = s.indexOf( '.' ) + 1;

            return !d ? 0 : s.length - d;
        };

        /**
         * Converts byte size to human readable format.
         * @param {Number} bytes number of bytes
         * @returns {String}
         */
        Comctl.prototype.bytesToSize = function( bytes ) {
            bytes = +bytes;
            if( 0 === bytes || !bytes ) {
                return '0 Byte';
            }
            var kilo = 1024,
                sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
                i = Math.floor( Math.log( bytes ) / Math.log( kilo ) ),
                size = this.dcRound( (bytes / Math.pow( kilo, i )), 3 );
            return this.numberToLocalString( size, { decimals: 3 } ) + ' ' + sizes[i];
        };

        /**
         * Generates random integer.
         * @method getRandomInt
         * @param {Integer} min
         * @param {Integer} max
         * @returns {Integer}
         */
        Comctl.prototype.getRandomInt = function( min, max ) {
            return Math.floor( Math.random() * (max - min + 1) ) + min;
        };

        // STRING

        /**
         *  Create a random string to act as a unique identifier in UI and disk operations
         *
         *  Used to disambiguate objects or index objects, especially in the dcforms event model,
         *  where there may be multiple sets of UI of a page, where array order is not constant, or
         *  before items have been saved the server.
         *
         *  ref: http://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
         */

        Comctl.prototype.getRandId = function() {
            return Math.random().toString( 36 ).slice( 2 );
        };

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
        Comctl.prototype.getRandomString = function(length, charSet) {
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
            for( i; i > 0; --i ) {
                result += mask[Math.floor( Math.random() * mask.length )];
            }
            return result;
        };

        //  Fixes for UTF8 base64 encoding, as used by forms and MediaMojit
        //  see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding

        /**
         *  Base64 encode a UTF-8 string
         *  credit: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding
         *
         *  @param  str {string}    UTF-8 string
         *  @returns    {string}
         */

        Comctl.prototype.UTF8ToB64 = function( str ) {
            var b64;
            try {
                b64 = Buffer.from(str).toString('base64');
            } catch( parseErr ) {
                Y.log( 'Error encoding base64 string: ' + JSON.stringify( parseErr ), 'warn', NAME );
                Y.log( 'Error encoding base64 string: ' + str, 'warn', NAME );
                console.log( new Error().stack );       //  eslint-disable-line no-console
                b64 = '';
            }
            return b64;
        };

        /**
         *  Base64 decode to a UTF-8 string
         *  credit: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding
         *
         *  @param  str {string}    Base64 encoded / 7bit ASCII instring
         */


        Comctl.prototype.B64ToUTF8 = function( str ) {
            var utf8str;

            try {
                utf8str = Buffer.from(str, 'base64').toString('utf8');
            } catch( serErr ) {
                Y.log( 'Error decoding base64 string: ' + JSON.stringify( serErr ), 'warn', NAME );
                Y.log( 'Error decoding base64 string: ' + str, 'warn', NAME );
                console.log( new Error().stack );   //  eslint-disable-line no-console
                utf8str = '';
            }

            return utf8str;
        };

        Comctl.prototype.fastHash = function( txt ) {
            var
                hash = 0,       //% 32 bit integer [int]
                i;              //% char pos [int]

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
        };

        // FILE SYSTEM

        Comctl.prototype.createFullPath = function( dirPath, fileConfObj, callback ) {
            var
                self = this;

            if(typeof fileConfObj === "function" && !callback) {
                callback = fileConfObj;
            }

            if( !dirPath || '.' === dirPath ) {
                return callback( null );
            }
            fs.mkdir( dirPath, function( error ) {
                if( error ) {
                    switch( error.code ) {
                        case 'ENOENT':
                            return self.createFullPath( path.dirname( dirPath ), fileConfObj, function( error ) {
                                if( error ){
                                    return callback( error );
                                }
                                self.createFullPath( dirPath, fileConfObj, callback );
                            } );
                        case 'EEXIST':
                            return callback( null );
                        default:
                            return callback( error );
                    }
                }

                if(typeof fileConfObj === "object") {
                    try {
                        fs.chownSync( dirPath, fileConfObj.uid, fileConfObj.gid );
                        fs.chmodSync( dirPath, fileConfObj.mode );
                    } catch( fsError ) {
                        return callback( fsError );
                    }
                }

                return callback( null );
            } );
        };

        // SCHEMA Helpers

        /**
         * @method getObjectForSchema
         * @param {Object} config
         * @param {Array} config.schemaFields
         * @param {Object} config.data
         * @returns {Object}
         */
        Comctl.prototype.getObjectForSchema = function( config ){
            let
                { schemaFields, data } = config;
            return Object.keys( data ).filter( field => schemaFields.includes( field ) ).reduce( ( result, key ) => {
                result[ key ] = data[ key ];
                return result;
            }, {} );
        };

        /**
         * Check whether a string value is a mongo BSON ObjectId
         *
         * see: http://stackoverflow.com/questions/11985228/mongodb-node-check-if-objectid-is-valid
         *
         * @method  isObjectId
         * @param   stringVal   {String}
         * @returns             {Boolean}
         */

        Comctl.prototype.isObjectId = function( stringVal ) {
            var objectId = require("mongodb").ObjectID;
            return objectId.isValid( stringVal );
        };

        myComctl = new Comctl();
        Y.namespace( 'doccirrus' ).comctl = myComctl;
    }, '0.0.1',
    {
        requires: [
        ]
    }
);
