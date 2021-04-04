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

YUI.add( 'dcerror', function( Y, NAME ) {

        var
            uncaughtExceptionCount = 0,
            unhandledRejection = 0,
            errorLib,
            assert = require( 'assert' );

        /**
         * Handle all unCaught exceptions according to the Error classification.
         *
         * 1st Level of the classification is basic node.js:
         *  - SyntaxError
         *  - UriError
         *  - etc.
         *  See https://nodejs.org/api/errors.html
         *  Currently these are all considered non-fatal, but that may change.
         *
         *  2nd Level is within System errors distinguish fatal and non-fatal errors.
         *  The exhaustive list of system errors is here:  http://man7.org/linux/man-pages/man3/errno.3.html
         *
         * @param err
         */
        function handleException( err ) {
            var isNonFatal = true;

            if( err && err.code && err.syscall ) {
                Y.log( 'UncaughtException (System Error) being handled.', 'error', NAME );
                //'ECONNRESET' and others are now regarded as non fatal.
                if(
                    'EADDRINUSE' === err.code ||
                    'EMFILE' === err.code ||
                    'ENFILE' === err.code ||
                    'ENOMEM' === err.code
                ) {
                    isNonFatal = false;
                }
            } else if( err instanceof assert.AssertionError ) {
                Y.log( 'UncaughtException (Assertion Error) cannot handle.', 'error', NAME );
                isNonFatal = false;
            } else if( err instanceof URIError ) {
                Y.log( 'UncaughtException (URI Error) being handled.', 'error', NAME );
            } else if( err instanceof ReferenceError ) {
                Y.log( 'UncaughtException (Reference Error) being handled.', 'error', NAME );
            } else if( err instanceof SyntaxError ) {
                Y.log( 'UncaughtException (Syntax Error) being handled.', 'error', NAME );
            } else if( err instanceof TypeError ) {
                Y.log( 'UncaughtException (Type Error) being handled.', 'error', NAME );
            } else {
                Y.log( 'UncaughtException (Custom Error) being handled.', 'error', NAME );
            }

            if( err ) {
                if( isNonFatal ) {
                    uncaughtExceptionCount++;
                    // non-fatal error and current action context is now irrelevant.
                    // may eventually be cleaned up through de-zombifier and garbage collector.
                    // will most likely leak memory and maybe other resources.
                    Y.log( 'UncaughtException Ignored:  ' + err, 'error', NAME );
                    if( Y.doccirrus.auth.isMocha() ) {
                        Y.log( err.stack, 'error', NAME );
                    }
                    Y.log( err.stack );
                    Y.log( '__mem__: ' + JSON.stringify( process.memoryUsage() ) );
                    Y.log( '__uncaughtExceptionCount__: ' + uncaughtExceptionCount );
                } else {
                    if( Y.doccirrus.auth.isMocha() ) {
                        Y.log( err.stack, 'error', NAME );
                    }
                    Y.log( err.stack );
                    Y.log( 'Fatal UncaughtException. Halting.', 'error', NAME );
                    process.exit( 44 );
                }
            }
        }

        /**
         * Handle all unhandled rejections according to the Error classification.
         *
         * 1st Level of the classification is basic node.js:
         *  - SyntaxError
         *  - UriError
         *  - etc.
         *  See https://nodejs.org/api/errors.html
         *  Currently these are all considered non-fatal, but that may change.
         *
         *  2nd Level is within System errors distinguish fatal and non-fatal errors.
         *  The exhaustive list of system errors is here:  http://man7.org/linux/man-pages/man3/errno.3.html
         *
         * @param err
         */
        function handledRejection( err ) {
            var isNonFatal = true;

            if( err && err.code && err.syscall ) {
                Y.log( 'unhandledRejection (System Error) being handled.', 'error', NAME );
                //'ECONNRESET' and others are now regarded as non fatal.
                if(
                    'EADDRINUSE' === err.code ||
                    'EMFILE' === err.code ||
                    'ENFILE' === err.code ||
                    'ENOMEM' === err.code
                ) {
                    isNonFatal = false;
                }
            } else if( err instanceof URIError ) {
                Y.log( 'unhandledRejection (URI Error) being handled.', 'error', NAME );
            } else if( err instanceof ReferenceError ) {
                Y.log( 'unhandledRejection (Reference Error) being handled.', 'error', NAME );
            } else if( err instanceof SyntaxError ) {
                Y.log( 'unhandledRejection (Syntax Error) being handled.', 'error', NAME );
            } else if( err instanceof TypeError ) {
                Y.log( 'unhandledRejection (Type Error) being handled.', 'error', NAME );
            } else {
                Y.log( 'unhandledRejection (Custom Error) being handled.', 'error', NAME );
            }

            if( err ) {
                if( isNonFatal ) {
                    unhandledRejection++;
                    // non-fatal error and current action context is now irrelevant.
                    // may eventually be cleaned up through de-zombifier and garbage collector.
                    // will most likely leak memory and maybe other resources.
                    Y.log( 'unhandledRejection Ignored:  ' + err, 'error', NAME );
                    Y.log( err.stack, 'error', NAME );
                    Y.log( '__mem__: ' + JSON.stringify( process.memoryUsage() ) );
                    Y.log( '__unhandledRejectionCount__: ' + unhandledRejection );
                } else {
                    Y.log( err.stack );
                    Y.log( 'Fatal unhandledRejection. Halting.', 'error', NAME );
                    process.exit( 44 );
                }
            }
        }

        /**
         * Constructor for the module class.
         *
         * Sets up automatic error handling. FUTURE: domains.
         *
         * @class DCErrors
         * @private
         */
        function DCErrors() {
        }
/*

        DCErrors.prototype.registerSegFaultHandler = function( user, callback ) {
            if( require( 'cluster' ).isMaster ) {
                const SegfaultHandler = require( 'segfault-handler' );

                SegfaultHandler.registerHandler( Y.doccirrus.auth.getTmpDir() + 'stacktrace-' + Date.now() + '.log' );

                callback( null, true );
            }
        };
*/

        DCErrors.prototype.continueExceptionHandling = function reInit() {
            if( !process.listeners( 'uncaughtException' ).length ) {
                process.on( 'uncaughtException', handleException );
                Y.log( 'Restarted UncaughtException Handler', 'info', NAME );
            }
            if( !process.listeners( 'unhandledRejection' ).length ) {
                process.on( 'unhandledRejection', handledRejection );
                Y.log( 'Restarted unhandledRejection Handler', 'info', NAME );
            }
        };

        DCErrors.prototype.pauseExceptionHandling = function pause() {
            if( !process.listeners( 'uncaughtException' ).length ) {
                process.removeListener( 'uncaughtException', process.listeners( 'uncaughtException' )[ 0 ] );
                Y.log( 'Paused UncaughtException Handler', 'info', NAME );
            }
            if( !process.listeners( 'unhandledRejection' ).length ) {
                process.removeListener( 'unhandledRejection', process.listeners( 'unhandledRejection' )[ 0 ] );
                Y.log( 'Paused unhandledRejection Handler', 'info', NAME );
            }
        };

        DCErrors.prototype.getUncaughtExceptionCount = function getUncaughtExceptionCount() {
            return uncaughtExceptionCount;
        };
        DCErrors.prototype.getUnhandledRejectionCount = function getUnhandledRejectionCount() {
            return unhandledRejection;
        };

        /**
         * Generates an object that the RESTController + patched mojito  server will understand,
         * and treat correctly, returning the reasonPhrase and code to the caller.
         *
         * @param code {Number} HTTP error code
         * @param message {String} Message string
         * @returns {Object} {{code: *, reasonPhrase: *}}
         * @method http
         */
        DCErrors.prototype.http = function http( code, message ) {
            return { code: code, reasonPhrase: message };
        };

        /**
         * Error object by default creates message property with enumerable as false.
         * If a JSONRPC method responds with an error as "new Error("Error message")" then
         * while building JSONRPC response "meta" and "data" objects, the above error is stringified
         * and so JSON.stringify(new Error("Error message")) = {}. Because of this
         * UI just sees error popup but without any error message which is bad user experience.
         *
         * This method sets the enumerable property of 'message' key in error object as true and so
         * JSON.stringify(new Error("there is error")) = {message: "there is error"} and also preserves
         * the stack which can be used to log on the server before responding and also by default it is
         * excluded in JSON.stringify operation.
         *
         * @param {string} errorMessage
         * @returns {Object} - Instance of built in Error function
         */
        DCErrors.prototype.createError = function( errorMessage ) {
            let error = new Error(errorMessage || "");

            Object.defineProperty(error, "message", {enumerable: true});
            return error;
        };

        /**
         * Business logic errors that return with HTTP 200
         *
         * Usage e.g.:
         *
         *   err = new Y.doccirrus.errors.rest( 9090, {bsnr:'2378238'} );
         *
         *
         * @param {Number} code - DC internal error code ( with translations in ....)
         * @param {Object} data - Minimal parameters to make the message more sensible. Usually the problem data.
         * @param {Boolean} asError - return object is an Error object with additional params
         * @returns {Object} {{code: *, data: *}}
         * @method rest
         */
        DCErrors.prototype.rest = function rest( code, data, asError ) {
            var
                error;

            if( asError ) {
                error = new Error();
                error.code = code;
                error.data = data;
            } else {
                error = { code: code, data: data };
            }

            Object.defineProperty( error, 'toString', {
                enumerable: false, value: function toString() {
                    var
                        self = this;
                    return self.code + ' ' + JSON.stringify( self.data );
                }
            } );

            return error;
        };

        errorLib = new DCErrors();
        process.on( 'uncaughtException', handleException );
        process.on( 'unhandledRejection', handledRejection );

        Y.log( 'Started UncaughtException and UnhandledRejection Handler', 'info', NAME );

        Y.namespace( 'doccirrus' ).errors = errorLib;

    },
    '0.0.1', { requires: [] }
);