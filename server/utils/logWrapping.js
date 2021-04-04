/**
 * User: dcdev
 * Date: 1/2/19  3:43 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

module.exports = function( Y, NAME ) {
    const
        WARN_SLOW_TIME = 500,
        WARN_VERY_SLOW_TIME = 10000,
        utils = {};

    /**
     *  For functions which might have a callback
     *
     *  @param  {Function}  callback    Callback function to wrap
     *  @param  {String}    message     Message to log on callback
     *  @param  {String}    level       Log level 'info'|'warn'|'error'|debug'
     */

    utils.wrapAndLogExitAsync = function( fn, message, level ) {
        const startTime = new Date().getTime();
        level = level || 'info';
        return function( ...args ) {
            const
                endTime = new Date().getTime(),
                elapsed = endTime - startTime,
                isSlow = ( elapsed > WARN_SLOW_TIME ) ? ' [SLOW-API-CALL]' : '',
                isVerySlow = ( elapsed > WARN_VERY_SLOW_TIME ) ? ' [VERY-SLOW-API-CALL]' : '';


            //  if something is slow we want to know about it, elevate the logLevel to 'info'
            if ( isSlow ) {
                level = 'info';
            }

            Y.log( message + ` [${elapsed}ms]${isSlow}${isVerySlow}`, level, NAME );
            return fn.apply( this, args );
        };
    };

    /**
     *  For functions using async/await style, record entry into the function and return startTime
     *
     *  @param  {String}    msg         Message to log on entering and exiting the function
     *  @param  {String}    logLevel    Optional, defaults to 'info'
     *  @return {{startTime: number, msg: *}}
     */

    utils.logEnter = function( message, logLevel ) {
        var startTime = new Date().getTime();
        Y.log( 'Entering ' + message, logLevel || 'info', NAME );
        return {
            startTime,
            message,
            logLevel
        };
    };

    /**
     *  For functions using async/await style, record exit from the function and note any slowness
     *
     *  @param timer
     */

    utils.logExit = function( timer ) {
        let
            endTime = new Date().getTime(),
            elapsed = endTime - timer.startTime,
            isSlow = ( elapsed > WARN_SLOW_TIME ) ? ' [SLOW-API-CALL]' : '',
            isVerySlow = ( elapsed > WARN_VERY_SLOW_TIME ) ? ' [VERY-SLOW-API-CALL]' : '';

        //  if something is slow we want to know about it, elevate the logLevel to 'info'
        if ( isSlow ) {
            timer.logLevel = 'info';
        }

        Y.log( 'Exiting ' + timer.message + ` [${elapsed}ms]${isSlow}${isVerySlow}`, timer.logLevel, NAME );
    };

    return utils;
};
