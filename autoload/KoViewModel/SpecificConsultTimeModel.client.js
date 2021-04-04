/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */
'use strict';
YUI.add( 'SpecificConsultTimeModel', function( Y/*, NAME */ ) {

        /**
         * @module WeeklyTimeModel
         */

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            WeeklyTimeModel = KoViewModel.getConstructor( 'WeeklyTimeModel' );

        /**
         * @class SpecificConsultTimeModel
         * @constructor
         * @extends WeeklyTimeModel
         */
        function SpecificConsultTimeModel( config ) {
            SpecificConsultTimeModel.superclass.constructor.call( this, config );
        }

        SpecificConsultTimeModel.ATTRS = {};

        Y.extend( SpecificConsultTimeModel, WeeklyTimeModel, {
            initializer: function() {
            },
            destructor: function() {
            }
        }, {
            NAME: 'SpecificConsultTimeModel',
            ATTRS: {
                dayAliasMap: {
                    value: Y.doccirrus.schemas.location.getWeeklyTimeDayAlias(),
                    lazyAdd: false
                }
            }
        } );
        KoViewModel.registerConstructor( SpecificConsultTimeModel );

        /**
         * @class SpecificConsultTimeEditModel
         * @constructor
         * @extends SpecificConsultTime
         */
        function SpecificConsultTimeEditModel() {
            SpecificConsultTimeEditModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( SpecificConsultTimeEditModel, SpecificConsultTimeModel, {
            initializer: function() {
                var
                    self = this;

                self.dateRangePickerOptions = {
                    format: 'DD.MM.YYYY'
                };
                self.initDays();
                self.initScheduleTypes();
            },
            /**
             * Handles "days" field
             */
            initDays: function() {
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
            initScheduleTypes: function SpecificConsultTimeEditModel_initScheduleTypes() {
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
            scheduleTypeList: ko.observableArray(),
            dateRangePickerOptions: null,
            /**
             * Determines ISO-String of "start"
             */
            isoStart: null,
            /**
             * Computes ISO-String of "start"
             */
            isoStartComputedRead: function() {
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
            isoStartComputedWrite: function( value ) {
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
            isoEndComputedRead: function() {
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
            isoEndComputedWrite: function( value ) {
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
            /**
             * Determines ISO-String of "range"
             */
            isoRange: null,
            /**
             * Computes ISO-String of "range"
             */
            isoRangeComputedRead: function() {

                var
                    self = this,
                    range = ko.unwrap( self.range ),
                    value;

                if( range.length ) {
                    value = {
                        date1: range[0] || 0,
                        date2: range[1] || 0,
                        value: ( range[0] || 0 ) + ' - ' + ( range[1] || 0 )
                    };

                    return value;
                }
                else {
                    return '';
                }
            },
            /**
             * Handle write of ISO-String of "range" computed
             */
            isoRangeComputedWrite: function( range ) {
                var
                    self = this,
                    rangeBegin, rangeEnd,
                    countOfDays,
                    days = [],
                    i, j, k,
                    firstDay, lastDay;

                if( range ) {
                    rangeBegin = moment( range.date1 ).format( 'DD.MM.YYYY' );
                    rangeEnd = moment( range.date2 ).format( 'DD.MM.YYYY' );
                    firstDay = moment( range.date1 ).days();
                    lastDay = moment( range.date2 ).days();
                    countOfDays = moment( range.date2 ).diff( moment( range.date1 ), 'days' );
                    if( 0 === lastDay ) {
                        lastDay = 7;
                    }
                    if( 0 === firstDay ) {
                        firstDay = 7;
                    }

                    if( 7 <= countOfDays ) {
                        Y.each( Y.doccirrus.schemas.location.getWeeklyTimeDayAlias(), function( alias, day ) {
                            days.push( day );
                        } );
                        self.days( days );
                    } else {
                        if( firstDay < lastDay ) {
                            for( i = firstDay; i <= lastDay; i++ ) {
                                days.push( i );
                            }
                            self.days( days );
                        } else if( firstDay > lastDay ) {
                            for( k = firstDay; k <= 7; k++ ) {
                                days.push( k );
                            }
                            for( j = 1; j <= lastDay; j++ ) {
                                days.push( j );
                            }
                            self.days( days );
                        } else {
                            self.days( [firstDay] );
                        }
                    }
                    self.range( [rangeBegin, rangeEnd] );
                }
                else {
                    self.range( [] );
                }
            },
            // overwrite
            _initSubscriptions: function() {
                var
                    self = this,
                    mandatoryValidation = Y.doccirrus.validations.common.mongooseMandatory[ 0 ];

                SpecificConsultTimeEditModel.superclass._initSubscriptions.apply( self, arguments );

                self.isoStart = ko.computed( {
                    read: self.isoStartComputedRead,
                    write: self.isoStartComputedWrite
                }, self );

                self.isoEnd = ko.computed( {
                    read: self.isoEndComputedRead,
                    write: self.isoEndComputedWrite
                }, self );

                self.isoRange = ko.computed( {
                    read: self.isoRangeComputedRead,
                    write: self.isoRangeComputedWrite
                }, self );

                self.start.validationMessages = ko.observableArray( [] );
                self.start.hasError = ko.computed({ read:  function() {
                    var start = ko.unwrap( self.isoStart ),
                        end = ko.unwrap( self.isoEnd ),
                        startMoment = start && moment( start ),
                        endMoment = end && moment( end );

                    self.start.validationMessages([]);

                    if( start ){
                        if( end ) {
                            return endMoment.isBefore( startMoment );
                        } else {
                            return !start;
                        }
                    }
                    self.start.validationMessages([mandatoryValidation.msg]);
                    return true;
                }, write: function(){} });

                self.end.validationMessages = ko.observableArray( [] );
                self.end.hasError = ko.computed({ read: function() {
                    var start = ko.unwrap( self.isoStart ),
                        end = ko.unwrap( self.isoEnd ),
                        startMoment = start && moment( start ),
                        endMoment = end && moment( end );

                    self.end.validationMessages([]);

                    if( end ){
                        if( start ) {
                            return endMoment.isBefore( startMoment );
                        } else {
                            return !end;
                        }
                    }
                    self.end.validationMessages([mandatoryValidation.msg]);
                    return true;
                },
                write: function(){}});

            }
        }, {
            NAME: 'SpecificConsultTimeEditModel'
        } );
        Y.doccirrus.KoViewModel.registerConstructor( SpecificConsultTimeEditModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'WeeklyTimeModel',
            'calendar-schema',
            'location-schema'
        ]
    }
);