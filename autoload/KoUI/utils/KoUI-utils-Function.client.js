/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'KoUI-utils-Function', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * KoUI utility namespace that covers Function.
     * @module KoUI-utils-Function
     */
    /**
     * KoUI utility namespace that covers functions.
     * @class doccirrus.KoUI.utils.Function
     */
    Y.namespace( 'doccirrus.KoUI.utils.Function' );
    var
        KoUI = Y.doccirrus.KoUI,
        NS = KoUI.utils.Function;

    /**
     * Empty function
     * @method NOOP
     * @for doccirrus.KoUI.utils.Function
     */
    NS.NOOP = function NOOP() {

    };
    /**
     * Function which returns false
     * @method FALSE
     * @for doccirrus.KoUI.utils.Function
     * @return {boolean}
     */
    NS.FALSE = function FALSE() {
        return false;
    };

    /**
     * Returns a function, that, as long as it continues to be invoked, will not be triggered.
     * The function will be called after it stops being called for N milliseconds.
     * If `immediate` is passed, trigger the function on the leading edge, instead of the trailing.
     * @method debounce
     * @for doccirrus.KoUI.utils.Function
     * @param {Function} callback
     * @param {Number} delay
     * @param {Boolean} [immediate=false]
     * @returns {Function}
     */
    NS.debounce = function debounce( callback, delay, immediate ) {
        var timeout;
        return function() {
            var
                context = this,
                args = arguments,
                later = function() {
                    timeout = null;
                    if( !immediate ) {
                        callback.apply( context, args );
                    }
                },
                callNow = immediate && !timeout;

            clearTimeout( timeout );
            timeout = setTimeout( later, delay );
            if( callNow ) {
                callback.apply( context, args );
            }
        };
    };

}, '3.16.0', {
    requires: ['KoUI']
} );
