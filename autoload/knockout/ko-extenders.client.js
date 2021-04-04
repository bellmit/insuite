/*jslint anon:true, sloppy:true, nomen:true*/
/*global ko, jQuery */
YUI.add( 'ko-extenders', function( Y, NAME ) {
    'use strict';
    /**
     * @module ko-extenders
     */

    if( !window.ko ) {
        Y.log( 'yui: NOT loaded: ko', 'warn', NAME );
        return;
    }

    // Following pattern from
    // http://smellegantcode.wordpress.com/2012/12/10/asynchronous-computed-observables-in-knockout-js/
    //
    // allows you to insert a placeholder value until the actual value is returned
    // from a deferred. KO cannot display a deferred, so something must go into the
    // UI in the meantime. Can also be a spinner.
    if( !ko.extenders.async ) {
        ko.extenders.async = function( computedDeferred, initialValue ) {

            var
                plainObservable = ko.observable( initialValue ), currentDeferred;
            plainObservable.inProgress = ko.observable( false );

            ko.computed( function() {
                if( currentDeferred ) {
                    currentDeferred.reject();
                    currentDeferred = null;
                }

                var newDeferred = computedDeferred();
                if( newDeferred &&
                    ('function' === typeof newDeferred.done) ) {

                    // It's a deferred
                    plainObservable.inProgress( true );

                    // Create our own wrapper so we can reject
                    currentDeferred = jQuery.Deferred().done( function( data ) {
                        plainObservable.inProgress( false );
                        plainObservable( data );
                    } );
                    newDeferred.done( currentDeferred.resolve );
                } else {
                    // A real value, so just publish it immediately
                    plainObservable( newDeferred );
                }
            } );

            return plainObservable;
        };
    }

    /**
     * an enhanced version of "ko.extenders.async" for "ViewModel.createAsync" which have the possible converter built in
     * @param {ko.computed} observable computed to extend which should return a jQuery.Deferred
     * @param {Object} config extender configuration
     * @param {*} config.initialValue value to use initial
     * @param {Function} config.converter function which will receive provided arguments and should return the converted data to be set
     * @returns {ko.observable}
     * @see ViewModel.createAsync
     */
    ko.extenders.makeAsync = function( observable, config ) {

        config = config || {};

        var
            converter = config.converter,
            onFail = config.onFail,
            initialValue = config.initialValue,
            asyncObservable = ko.observable( initialValue ),
            inProgress = asyncObservable.inProgress = ko.observable( false ),
            currentDeferred;

        ko.computed( function() {
            var
                newDeferred = observable();

            if( currentDeferred ) {
                currentDeferred.reject();
                currentDeferred = null;
            }

            if( newDeferred && (typeof newDeferred.done === "function") ) {

                // It's a deferred
                inProgress( true );

                // Create our own wrapper so we can reject
                currentDeferred = jQuery.Deferred()
                    .done( function( data ) {
                        inProgress( false );
                        if( converter ) {
                            data = converter.apply( currentDeferred, arguments );
                        }
                        asyncObservable( data );
                    } )
                    .fail( function() {
                        var data,
                            args = Array.prototype.slice.call( arguments );
                        inProgress( false );
                        if( onFail ) {
                            args.unshift( asyncObservable );
                            data = onFail.apply( currentDeferred, args );
                        }
                        asyncObservable( data );
                    } );
                newDeferred.done( currentDeferred.resolve );
                newDeferred.fail( currentDeferred.reject );
            } else {
                // A real value, so just publish it immediately
                asyncObservable( newDeferred );
            }

        } );

        return asyncObservable;
    };

}, '3.16.0' );