/*global fun:true, ko, _ */
/*exported fun */
fun = function _fn( Y, NAME ) {
    'use strict';

    var
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        i18n = Y.doccirrus.i18n,
        NO_APPOINTMENT_TO_BOOK = i18n( 'PatPortalMojit.intime_practices_tab.text.NO_APPOINTMENT_TO_BOOK' ),
        WeeklyTimeModel = Y.doccirrus.KoViewModel.getConstructor( 'WeeklyTimeModel' );

    function VCPracticesModel( config ) {
        VCPracticesModel.superclass.constructor.call( this, config );
    }

    Y.extend( VCPracticesModel, Disposable, {
        initializer: function VCPracticesModel_initializer( config ) {
            var
                self = this;
            self.mainNode = config.node;
            self.commonData = config.commonData;
            self.initVCPracticesModel();
        },
        initVCPracticesModel: function() {
            var
                self = this;
            self.practiceOfflineI18n = i18n( 'PatPortalMojit.intime_practices_tab.text.PRACTICE_OFFLINE' );
            self.bookingIsBlockedI18n = i18n( 'PatPortalMojit.intime_practices_tab.text.BLOCKED_BOOKING' );
            self.textOfflineI18n = i18n( 'PatPortalMojit.intime_practices_tab.text.OFFLINE' );
            self.noDoctorsI18n = i18n( 'PatPortalMojit.intime_practices_tab.text.NO_DOCTORS' );
            self.talkToDoctorHintI18n = i18n( 'PatPortalMojit.intime_practices_tab.text.TALK_TO_DOCTOR' );
            self.locationI18n = i18n( 'PatPortalMojit.intime_practices_tab.text.LOCATION' );
            self.openTimesI18n = i18n( 'PatPortalMojit.intime_practices_tab.text.OPEN_TIMES' );
            self.calendarI18n = i18n( 'PatPortalMojit.intime_practices_tab.text.CALENDAR' );
            self.appointmentI18n = i18n( 'PatPortalMojit.intime_practices_tab.text.APPOINTMENT' );
            self.practices = ko.observableArray();
            self.isReady = ko.observable( false );
            self.loadData();
        },
        loadData: function() {
            var
                self = this,
                currentCustomerId = self.commonData.prac;
            self.practices( [] );
            self.setModelIsNotReady();
            Y.doccirrus.jsonrpc.api.patientportal.getFullPracticeInfo( {query: {dcCustomerNo: currentCustomerId}} )
                .done( function( response ) {
                    var
                        data = response.data;
                    if( data && data.length ) {
                        data.forEach( function( practice ) {
                            self.practices.push( self.preparePracticeData( practice ) );
                        } );
                    }
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } )
                .always( function() {
                    self.setModelIsReady();
                } );
        },
        initSelect2Calendar: function( location ) {
            var self = this;
            location.selectedCalendar = ko.observable();
            location.select2Calendar = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        var selectedCalendar = ko.unwrap( location.selectedCalendar );
                        return selectedCalendar;
                    },
                    write: function( $event ) {
                        location.selectedCalendar( $event.val );
                        location.calendarEmployee = $event.added.employee;
                        location.isRandomMode = $event.added.random;
                        location.selectedCalendarObj = location.calendars.find( function( item ) { return item._id === $event.val; });
                    }
                } ) ),
                select2: {
                    placeholder: NO_APPOINTMENT_TO_BOOK,
                    data: function() {
                        return {
                            results: location.calendars.map( function( calendar ) {
                                return {
                                    id: calendar._id,
                                    text: calendar.name,
                                    random: calendar.isRandomMode || false,
                                    employee: calendar.employee
                                };
                            } )
                        };
                    }
                }
            };

        },
        formatTime: function( arrayOfNumbers ) {
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
        },
        computeOpenTimesDisplay: function( openTimes ) {
            var
                self = this,
                times = openTimes,
                result = [],
                resultMap = {};

            Y.each( WeeklyTimeModel.ATTRS.dayAliasMap.value, function( alias, day ) {
                result.push( {
                    alias: alias,
                    day: day,
                    times: []
                } );
            } );

            if( !(Array.isArray( times ) && times.length) ) {
                return result;
            }

            result.forEach( function( item ) {
                resultMap[item.day] = item;
            } );

            times.forEach( function( time ) {
                time.days.forEach( function( day ) {
                    var
                        formattedStart = self.formatTime( time.start ),
                        formattedEnd = self.formatTime( time.end );

                    resultMap[day].times.push( {start: formattedStart, end: formattedEnd} );
                } );
            } );

            result.forEach( function( item ) {
                if( item.times.length ) {
                    item.times.sort( function( a, b ) {
                        return Y.ArraySort.naturalCompare( a.start, b.start );
                    } );
                } else {
                    item.times.push( '-' );
                }
            } );

            return result;
        },
        prepareLocation: function( location, practice ) {
            var
                self = this;

            location.calendars = [];
            self.initSelect2Calendar( location );
            location.openDays = self.computeOpenTimesDisplay( location.openTimes );
            location.phone = location.phone || '';
            location.makeAppointment = function() {
                self.commonData.appointmentData = {
                    locname: location.locname,
                    locphone: location.phone,
                    customerIdPrac: practice.customerIdPrac,
                    calendarId: ko.utils.peekObservable( location.selectedCalendar ),
                    employee: location.calendarEmployee,
                    calendar: location.selectedCalendarObj,
                    isRandomMode: location.isRandomMode
                };
                self.commonData.practiceData = {
                    coname: self.practices()[0].coname,
                    customerIdPrac: self.practices()[0].customerIdPrac
                };
                Y.doccirrus.nav.router.save( '/appointment' );
            };
        },
        preparePracticeData: function( practice ) {
            var
                self = this,
                locationsMap = {};
            if( practice.locations && practice.locations.length ) {
                practice.locations.forEach( function( location ) {
                    locationsMap[location._id] = location;
                    self.prepareLocation( location, practice );
                } );
                if( practice.calendars && practice.calendars.length ) {
                    practice.calendars.forEach( function( calendar ) {
                        var
                            location = locationsMap[calendar.locationId];
                        if( location ) {
                            if( !ko.utils.peekObservable( location.selectedCalendar ) ) {
                                location.selectedCalendar( calendar._id );
                                location.selectedCalendarObj = calendar;
                                location.isRandomMode = calendar.isRandomMode;
                                location.calendarEmployee = calendar.employee;
                            }
                            location.calendars.push( calendar );
                        }
                    } );
                }
                practice.locations = practice.locations.filter( function( location ) {
                    return location.calendars && location.calendars.length;
                } );
            } else {
                practice.locations = [];
            }

            if( !practice.coname ) {
                practice.coname = '';
            }

            return practice;
        },
        setModelIsReady: function() {
            var
                self = this;
            self.isReady( true );
            Y.doccirrus.utils.hideLoadingMask( self.mainNode );
        },
        setModelIsNotReady: function() {
            var
                self = this;
            self.isReady( false );
            Y.doccirrus.utils.showLoadingMask( self.mainNode );
        }
    } );

    return {
        registerNode: function( node, key, options ) {

            var
                vcPracticesModel = new VCPracticesModel( {node: node, commonData: options.binder.commonData} );
            ko.applyBindings( vcPracticesModel, document.querySelector( '#vcPractices' ) );
        },

        deregisterNode: function( node ) {
            Y.log( 'deregistered ' + (node || node._yuid), 'debug', NAME );
        }
    };
};
