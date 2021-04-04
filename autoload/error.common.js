/**
 *
 *  Catch ECONNREST errors, which we don't care about and ignore just those.
 *
 *  All other errors are thrown further to halt the process. Ultimately,
 *  should use domains and clusters to make sure there is 0 downtime.
 *
 *  ideas from http://stackoverflow.com/questions/17245881/node-js-econnreset
 *
 */

/*global YUI*/

'use strict';

YUI.add( 'dccommonerrors', function( Y ) {

        /**
         * @class DCError
         * @param {Number|String} [code] can be set as part of options
         * @param {Object} [options]
         * @param {Object} [options.code]
         * @param {String} [options.type='ERROR']
         * @param {String} [options.locale='-de']
         * @param {Object} [options.data]
         * @param {String} [options.message]
         * @constructor
         */
        function DCError( code, options ) {
            options = options || {};
            this.code = code || options.code;
            this.type = options.type || 'ERROR';
            this.locale = options.locale || '-de';
            this.data = options.data || {};
            this.message = options.message || Y.doccirrus.errorTable.getMessage( this );
            this.stack = (new Error(this.message)).stack;
        }

        DCError.prototype = new Error();
        DCError.prototype.constructor = DCError;
        DCError.prototype.toString = function() {
            return this.message;
        };
        function DCErrors() {
        }

        DCErrors.prototype = [];
        DCErrors.prototype.hasType = function( type ) {
            var found = false;
            this.some( function( err ) {
                if( type === err.type ) {
                    found = true;
                    return true;
                }
            } );
            return found;
        };
        DCErrors.prototype.hasCode = function( code ) {
            var found = false;
            this.some( function( err ) {
                if( code === err.code ) {
                    found = true;
                    return true;
                }
            } );
            return found;
        };
        DCErrors.prototype.clear = function() {
            while( this.length > 0 ) {
                this.pop();
            }
        };
        DCErrors.prototype.getByCode = function( code ) {
            var found;
            this.some( function( err ) {
                if( code === err.code ) {
                    found = err;
                    return true;
                }
            } );
            return found;
        };

        Y.namespace( 'doccirrus' ).commonerrors = {
            DCError: DCError,
            DCErrors: DCErrors
        };

    },
    '0.0.1', {requires: ['dcerrortable']}
);