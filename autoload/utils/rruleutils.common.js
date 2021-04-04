/* global YUI, rrule */

YUI.add( 'rruleutils', function( Y, NAME ) {

        /**
         * This is a library of some helper functions for usage of RRule library that are available throughout mojito.
         *
         * I.e. for the browser and server.
         *
         * Uses the YUI namespace.
         * @module rruleutils
         * @requires dccommonutils
         */

        /**
         * namespace `doccirrus.rruleutils`
         * @class doccirrus.rruleutils
         */

        /**
         * @property rruleutils
         * @for doccirrus
         * @type {doccirrus.rruleutils}
         */

        /**
         * Static function returning the RRule function depending on whether running on server
         * or client environment.
         *
         * @return RRule
         */
        function getRRule() {
            return Y.doccirrus.commonutils.isClientSide() ? rrule.RRule : require( 'rrule' ).RRule;
        }

        var mom = Y.doccirrus.commonutils.getMoment(),
            RRule = getRRule(),
            rruleDays = {
                1: RRule.MO,
                2: RRule.TU,
                3: RRule.WE,
                4: RRule.TH,
                5: RRule.FR,
                6: RRule.SA,
                7: RRule.SU
            };

        function RRuleUtils() {
        }

        RRuleUtils.prototype.init = function() {
            Y.log( 'Initializing RRULE utils ', 'info', NAME );
        };

        /**
         * Helper function to create an array of RRULE days for byweekday field of given configuration
         *
         * @param {Object} configuration
         * @returns {Array} - days for byweekday field
         */
        RRuleUtils.prototype.getByweekday = function( configuration ) {
            var
                intArr = configuration.byweekday || [];

            if( !intArr[0] && 'WEEKLY' === configuration.freq ) {
                return [];
            }

            return intArr.map( function( val ) {
                return rruleDays[val];
            } );
        };

        /**
         * Generates an array of dates for given repetition configuration
         *
         * @param {Object} configuration
         * @param {Object} start - Date object which holds a value of start of working day
         * @returns {Array} - array of dates in string format
         */
        RRuleUtils.prototype.getDatesForRepetitions = function( configuration, start ) {
            var rruleOpt = {
                    freq: RRule[configuration.freq],
                    dtstart: '',
                    until: '',
                    byweekday: this.getByweekday( configuration ),
                    bymonth: configuration.bymonth,
                    bymonthday: configuration.bymonthday,
                    interval: +configuration.interval || 1,
                    count: configuration.count
                },
                rule;

            rruleOpt.dtstart = mom.utc( configuration.dtstart ).add( 1, 'd' ).hour( start.getUTCHours() ).minute( start.getUTCMinutes() )
                .second( start.getUTCSeconds() ).millisecond( 0 ).toDate();
            if( configuration.until ) {
                rruleOpt.until = mom.utc( configuration.until || '' ).add( 1, 'd' ).hour( 23 ).minute( 59 ).second( 59 ).millisecond( 0 ).toDate(); // end of the day
            }

            rule = new RRule( rruleOpt );
            return rule.all().map( function( date ) {
                return mom( date ).toISOString();
            } );
        };

        var
            rruleUtils = new RRuleUtils();

        rruleUtils.init();

        Y.namespace( 'doccirrus' ).rruleutils = rruleUtils;

    }, '0.0.1', {
        requires: [
            'oop',
            'dccommonutils'
        ]
    }
);