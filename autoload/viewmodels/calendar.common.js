/**
 * User: rrrw
 * Date: 12.02.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
'use strict';

/**
 * Shared model for Schedules Library
 *
 * A STUB CLASS THAT WILL BE USED TO UNIFY SERVER AND CLIENT MODEL CRUNCHING
 *
 * UNUSED
 *
 */

/*jslint anon:true, nomen:true */
/*global YUI */
YUI.add( 'dccalendar-uam', function( Y, NAME ) {

        var
            INVALID_ARGUMENT = -1,
            NO_AVAILABILITY = -999,
            myCal;

        /**
         * Constructor for the module class.
         *
         * @class DCCalendar
         * @private
         */
        function DCCalendar() {
            // purely static object at the moment, nothing in the instances.
            Y.log( 'Constructing calendar common API', 'debug', NAME );
        }

        DCCalendar.prototype.init = function init() {
            Y.namespace( 'doccirrus.uam' );
        };

        DCCalendar.prototype.getInvalidArg = function getInvalidArg() {
            return INVALID_ARGUMENT;
        };
        DCCalendar.prototype.getNoAvailability = function getNoAvailability() {
            return NO_AVAILABILITY;
        };

        /**
         *
         * @param waitingtime
         * @return {boolean}
         */
        DCCalendar.prototype.isValidWaitTime = function isValidWaitTime( waitingtime ) {
            return waitingtime !== -999 && waitingtime !== '-999';
        };

        DCCalendar.prototype.getWaitTimeString = function getWaitTimeString( /*waitingtime*/ ) {
            // here we can convert for both UIs the wait string
            return '';
        };

        myCal = new DCCalendar();

        myCal.init();

        Y.namespace( 'doccirrus.uam' ).calendar = myCal;

    },
    '0.0.1', {requires: []}
);
