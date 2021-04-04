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
/*eslint prefer-template:0, strict:0 */
/*global YUI, $, jQuery, moment, navigator */

'use strict';

YUI.add( 'dc-comctl', function( Y, NAME ) {
        if( !Y.doccirrus ) {
            Y.doccirrus = {};
        }

        if( !Y.doccirrus.comctl ) {
            Y.doccirrus.comctl = {};
        }

        Y.log( 'Adding common UI elements for FormEditor and MediaMojit' );

        //  LOCAL VARIABLES AND CACHEING

        var
            comctlLib = Y.doccirrus.comctlLib,
            modalIsInitialized = false, //  true when added to DOM
            modalId = '', //  random id for modal elements (prevent ID collision)
            modalBtnPoint = '<!-- btn -->', //  labels insertion point for custom buttons on modal

            cacheJq = {}, //  cached jQuery selectors

            throbberUrl = '/static/DocCirrus/assets/images/ajax-loader.gif',
            throbberImg = '<img src="' + throbberUrl + '" />',
            TIMEOUT = 'timeout',
            TEST_PACKAGE_SIZE = 20480,
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
            TIME_FORMAT = i18n( 'general.TIME_FORMAT' );

        //  Server IO - wrappers to cut down on typing, and normalize results

        /**
         *  Perform an AJAX GET request from the VPRC
         *
         *  @param relUrl   {String}    URL relative to VPRC host
         *  @param params   {Object}     Dict of fields and values
         *  @param callback {Function}  Of the form fn(err, data)
         */

        Y.doccirrus.comctl.privateGet = function( relUrl, params, callback ) {
            Y.doccirrus.comctl._ajax( 'GET', 'VPRC', relUrl, params, callback );
        };

        /**
         *  Perform an AJAX POST request to the VPRC
         *
         *  @param  relUrl      {String}    URL relative to VPRC host
         *  @param  params      {Object}    Dict of fields and values
         *  @param  callback    {Function}  Of the form fn(err, data)
         */

        Y.doccirrus.comctl.privatePost = function( relUrl, params, callback ) {
            Y.doccirrus.comctl._ajax( 'POST', 'VPRC', relUrl, params, callback );
        };

        /**
         *  Perform an AJAX POST request to the VPRC
         *
         *  @param  relUrl      {String}    URL relative to VPRC host
         *  @param  params      {Object}    Dict of fields and values
         *  @param  callback    {Function}  Of the form fn(err, data)
         */

        Y.doccirrus.comctl.privatePut = function( relUrl, params, callback ) {
            Y.doccirrus.comctl._ajax( 'PUT', 'VPRC', relUrl, params, callback );
        };

        /**
         *  Perform an AJAX DELETE request to the VPRC
         *
         *  @param  relUrl      {String}    URL relative to VPRC host
         *  @param  params      {Object}    Dict of fields and values
         *  @param  callback    {Function}  Of the form fn(err, data)
         */

        Y.doccirrus.comctl.privateDelete = function( relUrl, params, callback ) {
            Y.doccirrus.comctl._ajax('DELETE','VPRC', relUrl, params, callback );
        };

        /**
         *  Perform an AJAX GET request from the PUC (assumed to be where the page is loaded from)
         *
         *  @param relUrl   {String}    URL relative to VPRC host
         *  @param params   {Object}     Dict of fields and values
         *  @param callback {Function}  Of the form fn(err, data)
         */

        Y.doccirrus.comctl.pucGet = function( relUrl, params, callback ) {
            Y.doccirrus.comctl._ajax( 'GET', 'PUC', relUrl, params, callback );
        };

        /**
         *  Perform an AJAX POST request to the PUC (assumed to be where the page is loaded from)
         *
         *  @param relUrl   {String}    URL relative to VPRC host
         *  @param params   {Object}     Dict of fields and values
         *  @param callback {Function}  Of the form fn(err, data)
         */

        Y.doccirrus.comctl.pucPost = function( relUrl, params, callback ) {
            Y.doccirrus.comctl._ajax( 'POST', 'PUC', relUrl, params, callback );
        };

        /**
         *  Ensures that the callback is only called once
         *  Used to find errors in deep async code
         *
         *  Assumes callback has no more than four arguments
         *
         *  @param  callback    {Function}  Callback to be counted
         *  @param  label       {String}    Optional descriptive string to locate caller if not in stack trace
         */

        Y.doccirrus.comctl.checkSingleCB = function( callback, label ) {
            var called = 0;

            label = label || 'none';

            return function checkCBCount( arg1, arg2, arg3, arg4 ) {
                called = called + 1;
                if( 1 < called ) {
                    Y.log( 'Callback called multiple times: ' + called + ' (label: ' + label + ')', 'error', NAME );
                    console.log( 'stack trace follows: ', new Error().stack ); //  eslint-disable-line no-console
                    return;
                }
                callback( arg1, arg2, arg3, arg4 );
                //callback = Y.dcforms.nullCallback;
            };
        };

        /**
         *  Perform a more general AJAX request, shortcut calls wrap this one
         *
         *  @param  action      {String}    GET, POST, etc
         *  @param  server      {String}    Identifies infrastructure part (PUC, VRPC...)
         *  @param  relUrl      {String}    URL relative to VPRC host
         *  @param  params      {Object}    Dict of fields and values
         *  @param  callback    {Function}  Of the form fn(err, data)
         */

        Y.doccirrus.comctl._ajax = function( action, server, relUrl, params, callback ) {

            var
                errPrefix = '<html><body><h1>Error:';

            function onAjaxSuccess( data, status, jqXHR ) {
                var errResult = {};
                //TODO would be nice to have own error class, like MOJ-2231
                // catch v1 style errors
                if( data && data.meta && data.meta.errors && 0 < data.meta.errors.length ) {
                    if( 1 === data.meta.errors.length && data.meta.errors[0].code ) {
                        data.meta.errors[0].data = Y.doccirrus.errorTable.getMessage(data.meta.errors[0]) || data.meta.errors[0].data;
                        errResult = data.meta.errors[0];
                    } else {
                        errResult.data = '';
                        data.meta.errors.forEach(function(err){
                            if (err.code){
                                errResult.data += Y.doccirrus.errorTable.getMessage(err) || err.data;
                            } else {
                                errResult.data += err.data;
                            }
                        });
                    }
                    return callback( errResult );
                }

                if( 4 !== jqXHR.readyState ) {
                    //  partially loaded
                    return;
                }

                if( 'string' === typeof(data) ) {

                    //  occassionally errors are returned with 200 and not recognized by $.ajax
                    if( errPrefix === data.substring( 0, errPrefix.length ) ) {
                        callback( jQuery( data ).text() );
                        return;
                    }

                    if( ('[' === data.substring( 0, 1 )) || ('{' === data.substring( 0, 1 )) ) {
                        try {
                            data = JSON.parse( data );
                        } catch( parseErr ) {
                            Y.log( 'Could not parse JSON data from: ' + relUrl, 'warn', NAME );
                        }

                    }
                }

                callback( null, data );
            }

            function onAjaxFailure( err ) {
                Y.log( 'AJAX error ' + relUrl + ': ' + JSON.stringify( err ), 'warn', NAME );
                callback( err );

            }

            if( !params ) {
                params = {};
            }

            if( 'VPRC' === server ) {
                relUrl = Y.doccirrus.infras.getPrivateURL( relUrl );
            }

            /*
            if( params.remoteparams && 256 < params.remoteparams.length ) {
                Y.log( 'AJAX ' + action + ' to ' + server + ': ' + relUrl + ' <complete output suppressed>', 'info', NAME );
            }
            else {
                Y.log( 'AJAX ' + action + ' to ' + server + ': ' + relUrl + ' ' + JSON.stringify( params ).substr( 0, 256 ), 'info', NAME );
            }
            */

            Y.doccirrus.ajax.send( {
                type: action,
                xhrFields: { withCredentials: true },
                url: relUrl,
                data: params,
                success: Y.doccirrus.comctl.checkSingleCB( onAjaxSuccess ),
                error: onAjaxFailure

                //success: Y.doccirrus.comctl.checkSingleCB(onAjaxSuccess),
                //error: Y.doccirrus.comctl.checkSingleCB(onAjaxFailure)
            } );

        };

        Y.doccirrus.comctl.testSpeed = function( callback ) {
            var sendTime,
                pending;

            if( Y.doccirrus.comctl.testSpeed.pending ) {
                Y.doccirrus.comctl.testSpeed.pending.abort();
            }

            sendTime = new Date();
            pending = Y.doccirrus.comctl.testSpeed.pending = $.ajax( {
                type: 'POST',
                xhrFields: { withCredentials: true },
                url: '/1/communication/:speedTest'
            } );

            pending.done( function() {
                var receiveTime = new Date(),
                    ping = TEST_PACKAGE_SIZE / ( receiveTime - sendTime );
                callback( null, ping );

            } );

            pending.fail( function() {
                callback( TIMEOUT, 0 );
            } );

            pending.always( function() {
                delete Y.doccirrus.comctl.testSpeed.pending;
            } );
        };


        //Time and Date

        /**
         * Converts unix date to human readable date
         * @param {Number} unixDate
         * @param {Boolean} [long] if true, time is also included in result
         * @returns {String}
         */
        Y.doccirrus.comctl.unixDateToHumanDate = function( unixDate, long ) {
            var format = long ? TIMESTAMP_FORMAT_LONG : TIMESTAMP_FORMAT;
            return moment.unix( unixDate ).format( format );
        };

        /**
         * Converts unix date to human readable time
         * @param {Number} unixDate
         * @param {String} [format] not standard format pattern
         * @returns {String}
         */
        Y.doccirrus.comctl.unixDateToHumanTime = function( unixDate, format ) {
            format = format || TIME_FORMAT;
            return moment.unix( unixDate ).format( format );
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

        Y.doccirrus.comctl.UTF8ToB64 = comctlLib.UTF8ToB64;

        /**
         *  Base64 decode to a UTF-8 string
         *  credit: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding
         *
         *  @param  str {string}    Base64 encoded / 7bit ASCII instring
         */


        Y.doccirrus.comctl.B64ToUTF8 = comctlLib.B64ToUTF8;

        /**
         *  Just returns HTML for a a throbber image, placeholder while waiting for AJAX
         */

        Y.doccirrus.comctl.getThrobber = function() {
            return throbberImg;
        };

        //  CURRENT USER

        Y.doccirrus.comctl.fullNameOfUser = Y.doccirrus.auth.getUserName();

        //  TRANSLATION
        /*
         *	Placeholder for translation dictionary DEPRECATED, use the cache instead
         */

        if( !Y.doccirrus.comctl.il8nDict ) {
            Y.doccirrus.comctl.il8nDict = {};
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

        Y.doccirrus.comctl.getRandId = comctlLib.getRandId;

        /**
         *    Get current user language for this page
         */

        Y.doccirrus.comctl.getUserLang = function() {
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

        /**
         *    Set current user language for this page
         *  @param  userLang    {string}    Language to set ('en'|'de')
         */

        Y.doccirrus.comctl.setUserLang = function( userLang ) {
            Y.log( 'Set current user language to: ' + userLang, 'debug', NAME );
            $( '#YUIServerLang__' ).html( userLang );
        };

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

        Y.doccirrus.comctl.getEnumFilterList = comctlLib.getEnumFilterList;


        // Browser details

        /**
         * Gets object with browser info
         * @method getBrowser
         * @returns {Object}
         */
        Y.doccirrus.comctl.getBrowser = function(){
            var
                ua = navigator.userAgent,
                tempMatch,
                browserNameMatch = ua.match( /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i ) || [];
            if( /trident/i.test( browserNameMatch[ 1 ] ) ) {
                tempMatch = /\brv[ :]+(\d+)/g.exec( ua ) || [];
                return { name: 'IE', version: (tempMatch[ 1 ] || '') };
            }
            if( 'Chrome' === browserNameMatch[ 1 ] ) {
                tempMatch = ua.match( /\bOPR\/(\d+)/ );
                if( null !== tempMatch ) {
                    return { name: 'Opera', version: tempMatch[ 1 ] };
                }
            }
            browserNameMatch = browserNameMatch[ 2 ] ? [ browserNameMatch[ 1 ], browserNameMatch[ 2 ] ] : [ navigator.appName, navigator.appVersion, '-?' ];
            tempMatch = ua.match( /version\/(\d+)/i );
            if( null !== tempMatch ) {
                browserNameMatch.splice( 1, 1, tempMatch[ 1 ] );
            }
            return {
                name: browserNameMatch[ 0 ],
                version: browserNameMatch[ 1 ]
            };
        };

        // Operations with numbers

        /**
         * Returns count of decimal places for a number.
         * @param {number} number
         * @returns {number}
         */
        Y.doccirrus.comctl.decimalPlaces = comctlLib.decimalPlaces;

        /**
         * Converts JavaScript Number to String representation for current user locale
         * @method numberToLocalString
         * @param {Number} number
         * @param {Object} [config]
         * @param {Object} [config.intWithoutDec=false] if set will not add ,00 to int
         * @param {Number} [config.decimals=2] number of decimals
         * @returns {String}
         */
        Y.doccirrus.comctl.numberToLocalString = function( number, config ) {
            config = config || {};
            var
                defaults = Y.merge( {
                    decimals: 2
                }, config ),
                dec_point = ',',
                intWithoutDec = config.intWithoutDec,
                locale = Y.doccirrus.comctl.getUserLang();
            if( 'de' !== locale ) {
                dec_point = '.';
            }
            return Y.doccirrus.comctl.numberToString( number, defaults.decimals, dec_point, intWithoutDec );
        };

        /**
         * Converts factor to string. WOrks like Y.doccirrus.comctl.numberToString without thousands_sep.
         * @param factor
         * @return {string}
         */
        Y.doccirrus.comctl.factorToLocalString = function ( factor ) {
            var dec_point = Y.doccirrus.comctl.getUserLang() !== 'de' ? '.' : ',';
            factor = (factor + '').replace( /[^0-9+\-Ee.]/g, '' );
            return ('' + factor).replace( '.', dec_point );
        };

        /**
         * Converts JavaScript Number to String representation for current locale
         *
         * For activities, currency depends on the casefolder, since inSwiss practices may have both Euro and Franc
         * denominated treatments/invoices/receipts.  EXTMOJ-2091
         *
         * @method numberToLocalString
         * @param   {Number}    number
         * @param   {Boolean}   [compact]
         * @param   {String}    [currency]      EUR/CHF, Default is EUR
         * @returns {String}
         */
        Y.doccirrus.comctl.numberToLocalCurrency = function( number, compact, currency ) {
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
        Y.doccirrus.comctl.localStringToNumber = function( sNumber ) {
            var dec_point = ',',
                locale = Y.doccirrus.comctl.getUserLang();
            if( 'de' !== locale && 'de-ch' !== locale ) {
                dec_point = '.';
            }
            return Y.doccirrus.comctl.stringToNumber( sNumber, dec_point );
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
        Y.doccirrus.comctl.numberToString = comctlLib.numberToString;

        /**
         * Converts String representation of number to JavaScript Number
         * @method stringToNumber
         * @param {String} sNumber
         * @param {String} [dec_point=','] decimal point
         * @return {Number}
         */
        Y.doccirrus.comctl.stringToNumber = comctlLib.stringToNumber;

        /**
         * Returns object for writable computed observables(Price)
         * read prop transforms JavaScript number to local string representation
         * write prop transforms local string representation to JavaScript Number
         * @param {ko.observable} field
         * @param {Object} [config] config of "numberToLocalString"
         * @returns {Object}
         * @see Y.doccirrus.comctl.numberToLocalString
         */

        Y.doccirrus.comctl.simpleHelperPriceComputed = function( field, config ) {
            config = config || {};
            return {
                read: function() {
                    var price = field();
                    if( config.sign ){
                        price = Math.abs( price );
                    }
                    if( (config.allowEmpty && '' === price) || null === price || undefined === price || isNaN( price ) ) {
                        return null;
                    }
                    price = Y.doccirrus.comctl.numberToLocalString( price, config );
                    return price;
                },
                write: function( val ) {
                    if( '' === val && config.allowEmpty){
                        field( val );
                    } else {
                        if ( 'string' === typeof val && -1 !== val.indexOf( '.' ) ) {
                            //  treat period as comma when received from UI, MOJ-9678
                            val = val.replace( '.', ',' );
                        }
                        val = Y.doccirrus.comctl.localStringToNumber( val );
                        if( config.sign ){
                            val = config.sign(val);
                        }
                        field( val );
                    }
                }
            };
        };

        /**
         * Returns object for writable computed observables(Factor)
         * read prop transforms JavaScript number to local string representation
         * write prop transforms local string representation to JavaScript Number
         * @param {ko.observable} field
         * @param {Object} [config] config of "factorToLocalString"
         * @returns {Object}
         * @see Y.doccirrus.comctl.factorToLocalString
         */

        Y.doccirrus.comctl.simpleHelperFactorComputed = function( field, config ) {
            config = config || {};
            return {
                read: function() {
                    var price = field();
                    if( (config.allowEmpty && '' === price) || null === price || undefined === price || isNaN( price ) ) {
                        return null;
                    }
                    price = Y.doccirrus.comctl.factorToLocalString( price, config );
                    return price;
                },
                write: function( val ) {
                    if( '' === val && config.allowEmpty){
                        field( val );
                    } else {
                        if ( 'string' === typeof val && -1 !== val.indexOf( '.' ) ) {
                            //  treat period as comma when received from UI, MOJ-9678
                            val = val.replace( '.', ',' );
                        }
                        val = Y.doccirrus.comctl.localStringToNumber( val );
                        field( val );
                    }
                }
            };
        };

        /**
         * Returns object for writable computed observables(fields from MEDDATA)
         * read prop transforms JavaScript number to local string representation
         * write prop transforms local string representation to JavaScript Number
         * @param {ko.observable} field
         * @param {Object} [config] config of "numberToLocalString"
         * @returns {Object}
         * @see Y.doccirrus.comctl.numberToLocalString
         */

        Y.doccirrus.comctl.simpleDecimalNumbersComputed = function( field, config ) {
            config = config || {};
            return {
                read: function() {
                    var value = field();
                    if( (config.allowEmpty && '' === value) || null === value || undefined === value || isNaN( value ) ) {
                        return null;
                    }
                    value = Y.doccirrus.comctl.numberToLocalString( value, config );
                    return value;
                },
                write: function( val ) {
                    if ( -1 !== val.toString().indexOf( '.' ) ) {
                        val = val.replace( '.', ',' );
                    }
                    if( '' === val && config.allowEmpty){
                        field( val );
                    } else if( typeof val === "number" ) {
                        // LAM-1783: already a number, no need to perform the conversion from string to number
                        field( val );
                    } else {
                        val = Y.doccirrus.comctl.localStringToNumber( val );
                        field( val );
                    }
                }
            };
        };

        /**
         * Rounds number to specified precision
         * @param {Number} number
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        Y.doccirrus.comctl.dcRound = comctlLib.dcRound;
        /**
         * Multiplies number with specified precision
         * @param {Number, String} a
         * @param {Number, String} b
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        Y.doccirrus.comctl.dcMul = comctlLib.dcMul;

        /**
         * Divides number with specified precision
         * @param {Number, String} a
         * @param {Number, String} b
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        Y.doccirrus.comctl.dcDiv = comctlLib.dcDiv;

        /**
         * Adds number with specified precision
         * @param {Number, String} a
         * @param {Number, String} b
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        Y.doccirrus.comctl.dcSum = comctlLib.dcSum;

        /**
         * Subtracts number with specified precision
         * @param {Number} a
         * @param {Number} b
         * @param {Integer} [precision=2]
         * @returns {number}
         */
        Y.doccirrus.comctl.dcSubtraction = comctlLib.dcSubtraction;

        /**
         * Checks if an argument is Numeric
         * @param {x} number value to check
         * @returns {Boolean}
         */
        Y.doccirrus.comctl.isNumeric = comctlLib.isNumeric;

        /**
         * a simple get precision for number
         * // TODO: [MOJ-3128] take care of infinity, e+/e- and other stuff
         * @param {Number} number
         * @return {number}
         */
        Y.doccirrus.comctl.numberGetPrecision = comctlLib.numberGetPrecision;

        /**
         * Converts byte size to human readable format.
         * @param {Number} bytes number of bytes
         * @returns {String}
         */
        Y.doccirrus.comctl.bytesToSize = function( bytes ) {
            bytes = +bytes;
            if( 0 === bytes || !bytes ) {
                return '0 Byte';
            }
            var kilo = 1024,
                sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
                i = Math.floor( Math.log( bytes ) / Math.log( kilo ) ),
                size = Y.doccirrus.comctl.dcRound( (bytes / Math.pow( kilo, i )), 3 );
            return Y.doccirrus.comctl.numberToLocalString( size, { decimals: 3 } ) + ' ' + sizes[i];
        };

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
        Y.doccirrus.comctl.getRandomString = comctlLib.getRandomString;

        //  MODALS

        /*
         *  Records whether modal is currently visible or not
         *
         *  This is to prevent multiple layers being created if modals are created / shown in quick
         *  succession, before animation completes
         */

        Y.doccirrus.comctl.modalVisible = false;

        /**
         *  Create the forms modal if not yet present (DEPRECATED, Bootstrap 2 support)
         *  @method     initModalBS2
         *  @param      callback    {Function}  Of the form fn(err)
         */

        Y.doccirrus.comctl.initModalBS2 = function( callback ) {

            Y.log( 'Initializing BS2 modal', 'debug', NAME );

            if( !callback ) {
                callback = function() {
                    Y.log( 'No callback passed to initModalBS2', 'warn', NAME );
                };
            }

            function onDictLoaded( err ) {
                if( err ) {
                    callback( 'Could not initialize BS2 modal' );
                    return;
                }

                Y.log( 'Creating BS2 modal dialog.', 'info', NAME );
                $( document.body ).prepend( ' ' +
                                            '<div id="divModalPopup" class="modal hide fade">' +
                                            '<div class="modal-header"><h3 id="hModalTitle">' +
                                            Y.doccirrus.i18n('FormEditorMojit.title.status.LOADING') +
                                            '</h3></div>' +
                                            '<div class="modal-body" id="divModalBody">' +
                                            '<div id="divModalAlert"></div>' +
                                            '<p id="pModalBody">' + Y.doccirrus.i18n('FormEditorMojit.title.status.PLEASE_WAIT') + '</p>' +
                                            '</div>' +
                                            '<div id="divModalFooter"></div>' +
                                            '</div>'
                );

                cacheJq.divModalPopup = $( '#divModalPopup' );
                cacheJq.hModalTitle = $( '#hModalTitle' );
                cacheJq.divModalAlert = $( '#divModalAlert' );
                cacheJq.divModalBody = $( '#divModalBody' );
                cacheJq.pModalBody = $( '#pModalBody' );
                cacheJq.divModalFooter = $( '#divModalFooter' );

                cacheJq.divModalPopup.on( 'hidden', onModalHideBS2 );
                cacheJq.divModalPopup.on( 'show', onModalShowBS2 );

                modalIsInitialized = true;
                callback( null );

            }

            function onModalHideBS2() {
                Y.log( 'Bootstrap event: hidden comctl modal', 'debug', NAME );
                Y.doccirrus.comctl.modalVisible = false;
            }

            function onModalShowBS2() {
                Y.log( 'Bootstrap event: show comctl modal', 'debug', NAME );
                Y.doccirrus.comctl.modalVisible = true;
            }

            //  migrated from the FEM, translations are in that lang file for now
            //  future versions of this should be synchronous

            //Y.doccirrus.comctl.getIl8nDict( 'FormEditorMojit', onDictLoaded );
            onDictLoaded();
        };

        /**
         *  Create the forms modal if not yet present
         *
         *  Note: this should be synchronous in future, the callback is due to loading of dict, which
         *  new scheme will not have to wait for.
         *
         *  @method     initModal
         *  @param      callback    {Function}  Of the form fn(err)
         */

        Y.doccirrus.comctl.initModal = function( callback ) {

            Y.log( 'Initializing BS3 modal', 'debug', NAME );

            if( !callback ) {
                callback = function() {
                    Y.log( 'No callback passed to initModal', 'warn', NAME );
                };
            }

            function onDictLoaded( err) {

                if( err ) {
                    callback( 'Could not initialize modal dialog.' );
                    return;
                }

                Y.log( 'Creating comctl BS3 modal dialog.', 'info', NAME );

                modalId = Y.doccirrus.comctl.getRandId();
                modalBtnPoint = '<!-- btn point ' + modalId + ' -->';

                $( document.body ).prepend( ' ' +
                                            '<div id="divModalPopup" class="modal fade modal-wide" ' + 'role="dialog">' +
                                            '<div class="modal-dialog modal-wide">' +
                                            '<div class="modal-content">' +
                                            '<div class="modal-header">' +
                                            '<button type="button" class="close" data-dismiss="modal" ' + 'aria-hidden="true">&times;</button>' +
                                            '<h4 id="hModalTitle" class="modal-title">' + Y.doccirrus.i18n('FormEditorMojit.title.status.LOADING') + '</h4>' +
                                            '</div>' +
                                            '<div class="modal-body" id="divModalBody">' +
                                            '<div id="divModalAlert"></div>' +
                                            '<p id="pModalBody">' + Y.doccirrus.i18n('FormEditorMojit.title.status.PLEASE_WAIT') + '&hellip;</p>' +
                                            '</div>' +
                                            '<div id="divModalFooter" class="modal-footer">' +
                                            '<button type="button" class="btn btn-default" id="btnFormModalClose" data-dismiss="modal">' +
                                            Y.doccirrus.i18n('FormEditorMojit.generic.BTN_CLOSE') +
                                            '</button>' +
                                            modalBtnPoint +
                                            '<button type="button" class="btn btn-primary" id="btnFormModalOK" style="display:none;">' +
                                            Y.doccirrus.i18n('FormEditorMojit.generic.BTN_OK') +
                                            '</button>' +
                                            '</div>' +
                                            '</div><!-- /.modal-content -->' +
                                            '</div><!-- /.modal-dialog -->' +
                                            '</div><!-- /.modal -->'
                );

                cacheJq.divModalPopup = $( '#divModalPopup' );
                cacheJq.hModalTitle = $( '#hModalTitle' );
                cacheJq.divModalAlert = $( '#divModalAlert' );
                cacheJq.divModalBody = $( '#divModalBody' );
                cacheJq.pModalBody = $( '#pModalBody' );
                cacheJq.divModalFooter = $( '#divModalFooter' );

                cacheJq.divModalPopup.modal();
                modalIsInitialized = true;
                callback( null );
            }

            //  migrated from the FEM, translations are in that lang file for now
            //Y.doccirrus.comctl.getIl8nDict( 'FormEditorMojit', onDictLoaded );
            onDictLoaded();
        };

        /**
         *  Small helper function / shortcut to set the status line above the form
         *
         *  NOTE: this assumes some DOM elements, better to encapsulate
         *
         *  @param  title           {String}    Modal dialog title [string]
         *  @param  content         {String}    Body of modal dialog [string]
         *  @param  closeVisible    {Boolean}   Turn close button on or off
         *  @param  onOKClick       {Function}  If set, OK button click calls this function
         *  @param  callback        {Function}  Of the form fn(err)
         *  @param  onHide        {Function}  is called on hide
         *  @deprecated
         */

        Y.doccirrus.comctl.setModal = function( title, content, closeVisible, onOKClick, callback, onHide ) {

            Y.log( 'Setting modal: ' + title, 'debug', NAME );

            //  Handle modal events

            /**
             *  Re-attempt to show modal if it first needed to be initialized
             */

            function onModalInit( err ) {
                if( err ) {
                    if( callback ) {
                        return callback( 'Could not create modal: ' + err );
                    }
                    return;
                }

                //  retry after init completes
                Y.doccirrus.comctl.setModal( title, content, closeVisible, onOKClick, callback, onHide );
            }

            /**
             *  Note when modal open transition is complete and fire callback
             */

            function onModalShown() {
                Y.log( 'Bootstrap event: shown comctl modal', 'debug', NAME );
                Y.doccirrus.comctl.modalVisible = true;

                if( callback ) {
                    Y.log( 'Calling back' );
                    return callback( null );
                }
            }

            /**
             *  Note when modal is dismissed
             */

            function onModalHidden() {
                Y.log( 'Bootstrap event: hidden comctl modal', 'debug', NAME );
                Y.doccirrus.comctl.modalVisible = false;
                if ( onHide ) { onHide(); }
            }

            /**
             *  Raised when translation dictionary is loaded for default buttons
             */

            function onDictLoaded() {

                //if( err ) {
                //    il8nDict = { BTN_CLOSE: 'Close', BTN_OK: 'k' };
                //}

                if( true === closeVisible ) {
                    Y.doccirrus.comctl.addModalButton( Y.doccirrus.i18n('FormEditorMojit.generic.BTN_CLOSE'), false, onCloseButtonClick );
                }

                if( 'function' === typeof onOKClick ) {
                    Y.doccirrus.comctl.addModalButton( Y.doccirrus.i18n('FormEditorMojit.generic.BTN_OK'), true, onOKClick );
                }

            }

            /**
             *  Event handler for close button
             */

            function onCloseButtonClick() {
                Y.log( 'Modal closed from footer button.', 'debug', NAME );
                Y.doccirrus.comctl.clearModal();
            }

            //  add the modal if not present in page
            if( (false === modalIsInitialized) || 0 >= cacheJq.divModalPopup.length ) {
                Y.doccirrus.comctl.initModal( onModalInit );
                return;
            }

            //  update modal contents
            cacheJq.divModalAlert.html( '' );
            cacheJq.hModalTitle.html( title );
            cacheJq.pModalBody.html( content );

            //  clear and re-add any default buttons
            Y.doccirrus.comctl.clearModalButtons();

            if( closeVisible || ('function' === typeof onOKClick) ) {
                //  Note: this is planned to be synchronous in future il8n schema, common translations will be
                //  moved to DocCirrus mojit
                //Y.doccirrus.comctl.getIl8nDict( 'FormEditorMojit', onDictLoaded );
                onDictLoaded();
            }

            if( false === Y.doccirrus.comctl.modalVisible ) {
                Y.log( 'Launching modal dialog: ' + title, 'debug', NAME );

                cacheJq.divModalPopup.off( 'hidden.bs.modal' ).on( 'hidden.bs.modal', onModalHidden );
                cacheJq.divModalPopup.off( 'shown.bs.modal' ).on( 'shown.bs.modal', onModalShown );

                cacheJq.divModalPopup.modal( 'show' );
            }

        };

        /**
         *  Add a button to the footer of the modal dialog (there can only be one at a time)
         *
         *  This will return the DOM Id of the new button, in case caller wants to change it later.
         *
         *  @param  label       {String}    Button label
         *  @param  isPrimary   {Bool}      True if primary button, false if ordinary button
         *  @param  onClick     {Function}  Called when the button is pressed
         *  @returns            {String}    DOM Id of new button
         */

        Y.doccirrus.comctl.addModalButton = function( label, isPrimary, onClick ) {

            Y.log( 'Adding ' + (isPrimary ? 'primary' : 'default') + ' modal button: ' + label, 'debug', NAME );

            var
                btnId = 'btnModal' + Y.doccirrus.comctl.getRandId(),
                btnClass = isPrimary ? 'btn btn-primary' : 'btn btn-default',
                btnHtml = '<button type="button" class="' + btnClass + '" id="' + btnId + '">' + label + '</button>';

            cacheJq.divModalFooter.append( btnHtml );

            $( '#' + btnId ).off( 'click.modal' ).on( 'click.modal', function( e ) {
                onClick( e );
            } );

            return btnId;
        };

        /**
         *  Remove all buttons from the modal footer
         */

        Y.doccirrus.comctl.clearModalButtons = function() {
            cacheJq.divModalFooter.html( modalBtnPoint );
        };

        /**
         *  Clear and hide the modal
         *
         *  @method clearModal
         */

        Y.doccirrus.comctl.clearModal = function() {

            var jq = {
                hModalTitle: $( '#hModalTitle' ),
                divModalAlert: $( '#divModalAlert' ),
                pModalBody: $( '#pModalBody' ),
                divModalPopup: $( '#divModalPopup' )
            };

            jq.hModalTitle.html( '' );
            jq.pModalBody.html( '' );
            jq.divModalAlert.html( '' );
            jq.divModalPopup.modal( 'hide' );

        };

        /**
         *  Sets content of 'alert' area at top of modal, is independant from rest of modal content
         *
         *  @param  alertHTML   {String}    Message at top of modal
         */

        Y.doccirrus.comctl.setModalAlert = function( alertHTML ) {
            var jqAlertDiv = $( '#divModalAlert' );

            if( '' !== alertHTML ) {
                alertHTML = alertHTML + '<hr/><br/>';
            }

            if( 0 < jqAlertDiv.length ) {
                jqAlertDiv.html( alertHTML );
            }

        };

        /**
         *  Check if the modal is displayed
         *
         *  @mthod      inModal
         *  @return     {Boolean}   True if modal is displayed, false if not
         */

        Y.doccirrus.comctl.inModal = function() {
            var isDisplayed = cacheJq.hasOwnProperty( 'divModalPopup' ) && cacheJq.divModalPopup.css( 'display' );
            //Y.log('Checking if modaql is shown: ' + isDisplayed, 'debug', NAME);
            return ((undefined !== isDisplayed) && ('none' !== isDisplayed) && (false !== isDisplayed));
        };

        /**
         *  Shortcut to create a bootstrap progress bar
         *
         *  @param  completed   {Number}    Number of tasks completed
         *  @param  total       {Number}    Number of tasks in total
         */

        Y.doccirrus.comctl.makeProgressBar = function(completed, total) {
            var
                percentage = parseInt( (completed / total) * 100, 10 ),
                progressHtml = '' +
                    '<div class="progress">' +
                        '<div ' +
                            'class="progress-bar" ' +
                            'role="progressbar" ' +
                            'aria-valuenow="' + percentage + '" ' +
                            'aria-valuemin="0" ' +
                            'aria-valuemax="100" ' +
                            'style="width: ' + percentage + '%;"' +
                        '>' +
                            '<span class="sr-only">' + percentage + '% Complete</span>' +
                        '</div>' +
                    '</div>';

            return progressHtml;
        };

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

        Y.doccirrus.comctl.fastHash = comctlLib.fastHash;

    }, '0.0.1',
    {
        requires: [
            'dcauth',
            'dcerrortable',
            'dcinfrastructs',
            'dcajax',
            'comctlLib'
        ]
    }
);
