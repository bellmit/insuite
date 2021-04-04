/**
 * User: rrrw
 * Date: 12.02.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * This is a library of useful DC methods that are available throughout mojito clients.
 *
 * I.e. for the browser.
 *
 * Uses the YUI namespace.
 *
 * This utility is meant for all client side date/time logic
 */


/*global YUI, Date: true, $, dcServerTime */
YUI.add( 'dctime', function( Y, NAME ) {
        'use strict';

        var

            dcTime,
            timeDiff,
            JSDate = Date;

        /**
         * Constructor for the module class.
         *
         * if called with an argument then returns a DCTime instance, otherwise a JS Date object
         *
         * JS Date class refers to this class, e.g. Date.now is actually DCTime.now
         *
         * @class DCTime
         * @constructor
         * @private
         * @param c {*} doesn't matter!
         */

        function DCTime( c ) {
            var jsDate;
            var args;
            if( 'DCTime' !== c ) {
                args = Array.prototype.slice.call( arguments, 0 );

                switch( args.length ) {
                    case 0:
                        jsDate = new JSDate();
                        jsDate.setTime( jsDate.getTime() + timeDiff );
                        if(undefined === timeDiff ) {
                            Y.log( 'The DCTime is used before initialisation, timeDiff = ' + timeDiff, 'error', NAME );
                        }
                        break;
                    case 1:
                        jsDate = new JSDate( args[0] );
                        break;
                    case 2:
                        jsDate = new JSDate( args[0], args[1] );
                        break;
                    case 3:
                        jsDate = new JSDate( args[0], args[1], args[2] );
                        break;
                    case 4:
                        jsDate = new JSDate( args[0], args[1], args[2], args[3] );
                        break;
                    case 5:
                        jsDate = new JSDate( args[0], args[1], args[2], args[3], args[4] );
                        break;
                    case 6:
                        jsDate = new JSDate( args[0], args[1], args[2], args[3], args[4], args[5] );
                        break;
                    case 7:
                        jsDate = new JSDate( args[0], args[1], args[2], args[3], args[4], args[5], args[6] );
                }

                //                    jsDate = Object.create(JSDate.prototype);
                //                    JSDate.apply(jsDate, args);

                return jsDate;
            }
        }

        function updateDiff( data ) {

            if ( 'string' === typeof data ) {
                try {
                    data = JSON.parse( data );
                } catch( err ) {
                    Y.log( 'Bad response from server time: ' + err, 'error', NAME );
                    return;
                }
            }

            // adapt to new rest
            if( data.data && data.data.time ) {
                data.time = data.data.time;
            }

            var ss = data.time - new JSDate().getTime();
            Y.log( 'dcServerTime - clientTime = ' + ss + 'ms', 'debug', NAME );
            var serverDate = new JSDate();
            serverDate.setTime( data.time );
            timeDiff = serverDate.getTime() - (new JSDate()).getTime();
        }

        function getServerTime() {
            timeDiff = 0;

            // for purpose of MOJ-11745 ajax call added again
            $.ajax( {
                noBlocking: true,
                type: 'GET',
                xhrFields: {
                    withCredentials: true
                },
                url: Y.doccirrus.infras.getPrivateURL( '/1/calendar/:gettime' ),
                success: updateDiff,
                error: null
            } );
        }

        DCTime.prototype = JSDate.prototype;

        DCTime.prototype.init = function() {
            this.loggedInUser = Y.doccirrus.auth.getUserId();
            Y.log( 'Init dc client time utils with current id: ' + this.loggedInUser, 'debug', NAME );

            updateDiff( {time: dcServerTime} ); // dcServerTime is assigned value on page reload. We can't wait for the asynchronous update

            // we do another update after page is loaded to get a more accurate timeDiff
            window.setTimeout( getServerTime, 3000 );

            //  initialize periodic update
            window.setInterval( getServerTime, 3600000 );

            // Overriding JS Date constructor!
            Date = DCTime;
        };

        DCTime.UTC = JSDate.UTC;

        DCTime.parse = JSDate.parse;

        //        DCTime.length =  JSDate.length;

        /**
         * returns the server time (in millisecond)
         * @method now
         */
        DCTime.now = function() {

            var jsDate = new JSDate();

            jsDate.setTime( jsDate.getTime() + timeDiff );
            return jsDate.getTime();
        };

        dcTime = new DCTime( 'DCTime' );

        Y.namespace( 'doccirrus' ).time = dcTime;

    },
    '0.0.1', {requires: ['doccirrus', 'dcinfrastructs', 'JsonRpc']}
);
