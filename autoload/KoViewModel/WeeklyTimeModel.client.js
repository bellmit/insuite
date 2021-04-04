/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, rrule */

YUI.add( 'WeeklyTimeModel', function( Y/*, NAME */ ) {
        'use strict';

        /**
         * @module WeeklyTimeModel
         */

        var
            i18n = Y.doccirrus.i18n,
            RRule = rrule.RRule,
            KoViewModel = Y.doccirrus.KoViewModel;

        const germanStrings = {
            every: 'Jede(n/s)',
            until: 'bis',
            day: 'Tag',
            days: '. Tage',
            week: 'Woche',
            weeks: '. Woche(n)',
            on: 'am',
            in: 'in',
            'on the': 'am',
            for: 'für',
            and: 'und',
            or: 'oder',
            at: 'bei',
            th: '.',
            st: '.',
            nd: '.',
            rd: '.',
            last: 'zuletzt',
            '(~ approximate)': '(~ approximativ)',
            times: 'Mal',
            time: 'Mal',
            minutes: 'Minuten',
            hours: 'Stunden',
            weekdays: 'Wochentage',
            weekday: 'Wochentag',
            months: '. Monate',
            month: 'Monat',
            years: '. Jahre',
            year: 'Jahr'
        };

        const RRULE_GERMAN = {
            dayNames: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
            monthNames: [
                'Januar',
                'Februar',
                'März',
                'April',
                'Mai',
                'Juni',
                'Juli',
                'August',
                'September',
                'Oktober',
                'November',
                'Dezember'
            ]
        };

        /**
         * Helper function to translate tokens of repetition description into German
         *
         * @param {String} id - token of text which should be translated
         * @returns {String} - translated token or original one
         */
        function gettext ( id ) {
            return germanStrings[id] || id;
        }

        /**
         * Helper function to format date in local format
         *
         * @param {Number} year
         * @param {String} month
         * @param {Number} day
         * @returns {String} - localized date
         */
        function dateFormat( year, month, day ) {

            return moment()
                .date( day )
                .year( year )
                .month( month )
                .format( "LL" );
        }

        /**
         * Builds human-readable description of given repetition configuration
         *
         * @param {Object} configuration
         * @returns {string}
         */
        function getRepetitionDescription( configuration ) {
            var repetitionRule = new RRule( {
                    freq: RRule[configuration.freq],
                    dtstart: configuration.dtstart && new Date( configuration.dtstart ),
                    until: configuration.until && new Date( moment( configuration.until ).add( 1, 'd' ) ),
                    byweekday: Y.doccirrus.rruleutils.getByweekday( configuration ),
                    bymonth: configuration.bymonth,
                    bymonthday: configuration.bymonthday,
                    interval: +configuration.interval || 1,
                    count: configuration.count
                } ),
                currentLang = Y.doccirrus.comctl.getUserLang();

            if( ['de', 'de-ch'].includes( currentLang ) ) {
                return repetitionRule.toText( function( id ) {
                    return gettext( id );
                }, RRULE_GERMAN, dateFormat );
            } else {
                return repetitionRule.toText();
            }
        }

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class WeeklyTimeModel
         * @constructor
         * @extends KoViewModel
         */
        function WeeklyTimeModel( config ) {
            WeeklyTimeModel.superclass.constructor.call( this, config );
        }

        WeeklyTimeModel.ATTRS = {};

        Y.extend( WeeklyTimeModel, KoViewModel.getBase(), {
            initializer: function WeeklyTimeModel_initializer() {
            },
            destructor: function WeeklyTimeModel_destructor() {
            },
            // overwrite
            _initSubscriptions: function WeeklyTimeModel__initSubscriptions() {
                var
                    self = this;

                WeeklyTimeModel.superclass._initSubscriptions.apply( self, arguments );

                self.formattedDays = ko.computed( self.formattedDaysComputed, self );

                self.formattedStart = ko.computed( self.formattedStartComputed, self );

                self.formattedEnd = ko.computed( self.formattedEndComputed, self );

            },
            /**
             * Determines "days" formatted
             */
            formattedDays: null,
            /**
             * Computes "days" formatted
             */
            formattedDaysComputed: function WeeklyTimeModel_formattedDaysComputed() {
                var
                    self = this;
                return self.formatDays( ko.unwrap( self.days ) );
            },
            /**
             * Determines "start" formatted
             */
            formattedStart: null,
            /**
             * Computes "start" formatted
             */
            formattedStartComputed: function WeeklyTimeModel_formattedStartComputed() {
                var
                    self = this;
                return self.formatTime( ko.unwrap( self.start ) );
            },
            /**
             * Determines "end" formatted
             */
            formattedEnd: null,
            /**
             * Computes "end" formatted
             */
            formattedEndComputed: function WeeklyTimeModel_formattedEndComputed() {
                var
                    self = this;
                return self.formatTime( ko.unwrap( self.end ) );
            },
            /**
             * format "days"
             * @param {Array} arrayOfNumbers
             * @return {Array}
             */
            formatDays: function WeeklyTimeModel_formatDays( arrayOfNumbers ) {
                var
                    self = this,
                    result = [],
                    dayAliasMap = self.get( 'dayAliasMap' );

                if( Array.isArray( arrayOfNumbers ) && arrayOfNumbers.length ) {
                    arrayOfNumbers.forEach( function( number ) {
                        result.push( dayAliasMap[number] );
                    } );
                }
                return result;
            },
            /**
             * format array of Numbers as "HH:mm"
             * @param {Array} arrayOfNumbers
             * @return {String}
             */
            formatTime: function WeeklyTimeModel_formatTime( arrayOfNumbers ) {
                var
                    hours, minutes;

                if( Array.isArray( arrayOfNumbers ) && arrayOfNumbers.length ) {
                    hours = String( arrayOfNumbers[0] );
                    minutes = String( arrayOfNumbers[1] || 0 );

                    hours = hours.length < 2 ? '0' + hours : hours;
                    minutes = minutes.length < 2 ? '0' + minutes : minutes;

                    return hours + ':' + minutes;
                }
                return '';
            }
        }, {
            schemaName: 'calendar.openTimes',
            NAME: 'WeeklyTimeModel',
            ATTRS: {
                dayAliasMap: {
                    value: Y.doccirrus.schemas.location.getWeeklyTimeDayAlias(),
                    lazyAdd: false
                }
            }
        } );
        KoViewModel.registerConstructor( WeeklyTimeModel );

        /**
         * @class WeeklyTimeEditModel
         * @constructor
         * @extends WeeklyTimeModel
         */
        function WeeklyTimeEditModel() {
            WeeklyTimeEditModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( WeeklyTimeEditModel, WeeklyTimeModel, {
            initializer: function WeeklyTimeEditModel_initializer() {
                var
                    self = this;

                self.initDays();
                self.initScheduleTypes();
            },
            scheduleTypeList: ko.observableArray(),
            /**
             * Handles "days" field
             */
            initDays: function WeeklyTimeEditModel_initDays() {
                var
                    self = this,
                    dayAliasMap = Y.doccirrus.schemas.location.getWeeklyTimeDayAlias(),
                    availableDays = [];

                Y.each( dayAliasMap, function( alias, day ) {
                    availableDays.push( {
                        id: day,
                        text: alias
                    } );
                } );

                self.select2Days = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                days = self.days();

                            return days.map( function( day ) {
                                return {
                                    id: day,
                                    text: dayAliasMap[day]
                                };
                            } );
                        },
                        write: function( $event ) {
                            var
                                value = $event.val;

                            self.days( Y.Array.map( value, function( day ) {
                                return parseInt( day, 10 );
                            } ) );

                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        allowClear: true,
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        multiple: true,
                        data: function() {
                            return {
                                // list of available days to choose from
                                results: availableDays
                            };
                        }
                    }
                };

            },
            initScheduleTypes: function WeeklyTimeEditModel_initScheduleTypes() {
                var
                    self = this,
                    availableScheduleTypes = self.initialConfig.data && self.initialConfig.data.scheduleTypesObjects || [],
                    scheduleTypesMap = new Map();

                availableScheduleTypes.forEach( function( item ) {
                    scheduleTypesMap.set( item._id, item.name );
                } );

                self.select2ScheduleTypes = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                scheduleTypes = self.scheduleTypes();

                            return scheduleTypes.map( function( scheduleType ) {
                                return {
                                    id: scheduleType,
                                    text: scheduleTypesMap.get( scheduleType )
                                };
                            } );
                        },
                        write: function( $event ) {
                            if( $event.added ) {
                                self.scheduleTypes.push( $event.added.id );
                            }
                            if( $event.removed ) {
                                self.scheduleTypes.remove( $event.removed.id );
                            }
                        }
                    } ) ),
                    select2: {
                        allowClear: true,
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        multiple: true,
                        data: function() {
                            return {
                                results: availableScheduleTypes.map( self.itemToSelect2 )
                            };
                        }
                    }
                };
            },
            itemToSelect2: function( item ) {
                return {
                    id: item._id,
                    text: item.name
                };
            },
            /**
             * Determines ISO-String of "start"
             */
            isoStart: null,
            /**
             * Computes ISO-String of "start"
             */
            isoStartComputedRead: function WeeklyTimeEditModel_isoStartComputedRead() {
                var
                    self = this,
                    start = ko.unwrap( self.start ),
                    mom;

                if( start.length ) {
                    mom = moment();
                    mom.hour( start[0] || 0 );
                    mom.minute( start[1] || 0 );

                    return mom.toISOString();
                }
                else {
                    return '';
                }
            },
            /**
             * Handle write of ISO-String of "start" computed
             */
            isoStartComputedWrite: function WeeklyTimeEditModel_isoStartComputedWrite( value ) {
                var
                    self = this,
                    mom;

                if( value ) {
                    mom = moment( value );
                    self.start( [mom.hour(), mom.minute()] );
                }
                else {
                    self.start( [] );
                }
            },
            /**
             * Determines ISO-String of "end"
             */
            isoEnd: null,
            /**
             * Computes ISO-String of "end"
             */
            isoEndComputedRead: function WeeklyTimeEditModel_isoEndComputedRead() {
                var
                    self = this,
                    end = ko.unwrap( self.end ),
                    mom;

                if( end.length ) {
                    mom = moment();
                    mom.hour( end[0] || 0 );
                    mom.minute( end[1] || 0 );

                    return mom.toISOString();
                }
                else {
                    return '';
                }
            },
            /**
             * Handle write of ISO-String of "end" computed
             */
            isoEndComputedWrite: function WeeklyTimeEditModel_isoEndComputedWrite( value ) {
                var
                    self = this,
                    mom;

                if( value ) {
                    mom = moment( value );
                    self.end( [mom.hour(), mom.minute()] );
                }
                else {
                    self.end( [] );
                }
            },
            // overwrite
            _initSubscriptions: function WeeklyTimeEditModel__initSubscriptions() {
                var
                    self = this;

                WeeklyTimeEditModel.superclass._initSubscriptions.apply( self, arguments );

                self.isoStart = ko.computed( {
                    read: self.isoStartComputedRead,
                    write: self.isoStartComputedWrite
                }, self );

                self.isoEnd = ko.computed( {
                    read: self.isoEndComputedRead,
                    write: self.isoEndComputedWrite
                }, self );

                self.repetitionDescription = ko.computed( function() {
                    var
                        repetitionSettings = ko.unwrap( self.repetitionSettings ),
                        days = ko.unwrap( self.days );

                    if( !repetitionSettings || !repetitionSettings[0] ) {
                        return;
                    }

                    repetitionSettings[0].byweekday.removeAll();
                    repetitionSettings[0].byweekday( days );

                    return getRepetitionDescription( repetitionSettings && repetitionSettings[0] && repetitionSettings[0].readBoilerplate() );
                } );

                self.isDaysFieldDisabled = ko.computed( function() {
                    var
                        repetitionSettings = ko.unwrap( self.repetitionSettings );

                    self.days.validate();

                    if( repetitionSettings && repetitionSettings[0] ) {
                        if( 'WEEKLY' !== repetitionSettings[0].freq() ) {
                            return true;
                        }
                    }
                    return false;
                } );
            }
        }, {
            schemaName: WeeklyTimeModel.schemaName,
            NAME: 'WeeklyTimeEditModel'
        } );
        Y.doccirrus.KoViewModel.registerConstructor( WeeklyTimeEditModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'rruleutils',
            'dc-comctl',
            'KoViewModel',
            'calendar-schema',
            'location-schema'
        ]
    }
);