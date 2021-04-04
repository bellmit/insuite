/**
 * User: do
 * Date: 20/01/15  14:48
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'dcvat', function( Y, NAME ) {
        'use strict';

        var
            myUtils,
            vat;

        /**
         * Constructor for the module class.
         *
         * @class DCVat
         * @private
         * @static
         */
        function DCVat() {
            // purely static object at the moment, nothing in the instances.
        }

        DCVat.prototype.init = function( vat ) {
            Y.log( 'Initializing vat utils ', 'info', NAME );
            this.vat = vat;
        };

        /**
         * Get full vat list.
         * @returns {*}
         */
        DCVat.prototype.getList = function() {
            if (Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland()) {
                return  this.vat.filter(function( vt ) {
                    return  vt.countryMode === "CH";
                });
            } else {
                return this.vat.filter(function( vt ) {
                    return  vt.countryMode === "D";
                });
            }
        };

        /**
         * Get vat entry by code.
         * @param code
         * @returns {*}
         */
        DCVat.prototype.getByCode = function( code ) {
            var foundEntry = null;
            if( !this.vat ) {
                Y.log( 'Could not find vat', 'error', NAME );
                return;
            }
            this.vat.some( function( entry ) {
                if( code === entry.code ) {
                    foundEntry = entry;
                    return true;
                }
            } );
            return foundEntry;
        };

        /**
         * Do the percentage calculation for a code.
         * Takes care not to allow rounding errors.
         *
         * @param amount  price of something, typically a Euro amount
         * @param code  vat code
         * @returns number  vat percentage of amount, in same units as amount (Euro)
         */
        DCVat.prototype.calculateAmt = function( amount, code ) {
            var percent = myUtils.getByCode( code ) || {};

            percent = percent.percent || 0;
            // now we move into the 10xcent area to not allow rounding errors
            amount *= 1000;
            return (amount * percent)/100/1000;
        };

        /**
         * Returns the actual percentage as an integer.
         *
         * @param code integer code representing a VAT rate
         * @returns {number} for example 0, 7, 19
         */
        DCVat.prototype.getPercent = function( code ) {
            var percent = myUtils.getByCode( code ) || {};

            return percent.percent || 0;
        };

        myUtils = new DCVat();

        /**
         * Returns net from gross with given code.
         *
         * @param {number} gross
         * @param {number} code integer code representing a VAT rate
         * @returns {number}
         */
        myUtils.calculateNetFromGross = function( gross, code ) {

            return gross * 100 / (100 + myUtils.getPercent( code ));
        };

        if( 'function' === typeof require ) {
            vat = require( '../../vat.json' );
            myUtils.init( vat && vat.vat );
        }

        Y.namespace( 'doccirrus' ).vat = myUtils;

    },
    '0.0.1', {requires: []}
);
