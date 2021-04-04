/**
 * User: pi
 * Date: 09/11/15   10:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global fun:true, ko, moment */ //eslint-disable-line
fun = function _fn( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        TIME_FORMAT = i18n( 'general.TIME_FORMAT' ),
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        SELECT_APPOINTMENT_TYPE = i18n( 'PatPortalMojit.intime_appointment_tab.text.SELECT_APPOINTMENT_TYPE' ),
        PLEASE_SELECT = i18n( 'general.message.PLEASE_SELECT' ),
        Disposable = Y.doccirrus.KoViewModel.getDisposable();

    function AppointmentModel( config ) {
        AppointmentModel.superclass.constructor.call( this, config );
    }

    Y.extend( AppointmentModel, Disposable, {
        initializer: function AppointmentModel_initializer( config ) {
            var
                self = this;
            self.mainNode = config.node;
            self.commonData = config.commonData;
            self.timeRangeLabelI18n = i18n( 'PatPortalMojit.intime_appointment_tab.text.timeRangeLabel' );
            self.timeRangeInputsConnectorLabelI18n = i18n( 'PatPortalMojit.intime_appointment_tab.text.timeRangeInputsConnectorLabel' );
            self.datesFromLabelI18n = i18n( 'PatPortalMojit.intime_appointment_tab.text.datesFromLabel' );
            self.initAppointmentModel();

        },
        initAppointmentModel: function() {
            var
                self = this;
            self.calendarId = self.commonData.appointmentData.calendarId;
            self.customerIdPrac = self.commonData.appointmentData.customerIdPrac;
            self.locname = self.commonData.appointmentData.locname;
            self.isRandomMode = self.commonData.appointmentData.isRandomMode;
            self.employee = self.commonData.appointmentData.employee;
            self.isReady = false;
            self.selectedDateDatepickerOptions = {
                format: TIMESTAMP_FORMAT,
                sideBySide: true,
                widgetPositioning: {
                    horizontal: 'right',
                    vertical: 'top'
                },
                minDate: moment().startOf('day')
            };
            self.selectedDate = ko.observable( moment().toISOString() );
            self.startTime = ko.observable( null );
            self.endTime = ko.observable( null );
            self.freeAppointments = ko.observableArray();
            self.adhoc = ko.observable();
            self.bookAppointment = function( data ) {
                self._bookAppointment( data );
            };
            self.bookAdhoc = function() {
                self._bookAdhoc();
            };
            self.initSelect2Type();
            self.loadData();
            self.initComputed();
            self.initPatientInfo();
        },
        loadData: function() {
            var
                self = this;
            self.setModelIsNotReady();
            Y.doccirrus.jsonrpc.api.patientportal.getPracticeAppointmentTypes( {
                query: {
                    customerIdPrac: self.customerIdPrac
                }
            } )
                .done( function( response ) {
                    var
                        data = response.data || [];
                    if( data.length ) {
                        self.appointmentTypes = data.filter( function( type ) {
                            return type.calendarRefs.some( function( catalogReg ) {
                                return self.calendarId === catalogReg.calendarId;
                            } );
                        } );
                        if( !self.employee ) {
                            //filter out scheduleTypes with non-standard type as we don't have an employee here
                            self.appointmentTypes = self.appointmentTypes.filter( function( item ) {
                                return 0 > ['CONFERENCE', 'ONLINE_CONSULTATION'].indexOf( item.type );
                            } );
                        }
                        if( 1 === self.appointmentTypes.length ) {
                            self.appointmentType( self.appointmentTypes[ 0 ] );
                        }
                    }
                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } )
                .always( function() {
                    self.setModelIsReady();
                } );

        },
        initComputed: function() {
            var
                self = this;
            self.addDisposable( ko.computed( function() {
                var
                    selectedDate = self.selectedDate(),
                    startTime = self.startTime(),
                    endTime = self.endTime(),
                    appointmentType = self.appointmentType();
                if(
                    self.isReady && appointmentType && selectedDate &&
                    ( ( startTime && endTime && startTime < endTime ) || ( !startTime && !endTime ) )
                ) {
                    self.freeAppointments.removeAll();
                    self.getScheduleOptions( {
                        selectedDate: selectedDate,
                        appointmentType: appointmentType,
                        startTime: startTime,
                        endTime: endTime
                    } );
                }
            } ).extend( { rateLimit: 0 } ) );
        },
        getScheduleOptions: function( config ) {
            var
                self = this,
                appointmentType = config.appointmentType || ko.utils.peekObservable( self.appointmentType ),
                selectedDate = config.selectedDate || ko.utils.peekObservable( self.selectedDate ),
                startTime = config.startTime || ko.utils.peekObservable( self.startTime ),
                endTime = config.endTime || ko.utils.peekObservable( self.endTime ),
                startDateStartOfDay = moment( selectedDate ).startOf( 'day' );

            if( startDateStartOfDay.isBefore( moment() ) ) {
                // to avoid searching from the start of current day that is in the past
                selectedDate = moment().toISOString();
            }

            if( startDateStartOfDay.isAfter( moment().startOf( 'day' ) ) ) {
                selectedDate = startDateStartOfDay.toISOString();
            }
            if( !appointmentType ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: SELECT_APPOINTMENT_TYPE
                } );
            } else {
                self.setModelIsNotReady();
                Y.doccirrus.jsonrpc.api.patientportal.getFreeAppointments( {
                    query: {
                        datetime: selectedDate,
                        calendarId: self.calendarId,
                        appointmentType: appointmentType._id,
                        duration: appointmentType.duration,
                        n: appointmentType.numberOfSuggestedAppointments || 10,
                        startTime: startTime,
                        endTime: endTime,
                        customerIdPrac: self.customerIdPrac,
                        isPreconfigured: appointmentType.isPreconfigured,
                        resourceSlotSearch: Boolean( appointmentType.requiredResources && appointmentType.requiredResources.length ),
                        isRandomMode: self.isRandomMode
                    }
                } )
                    .done( function( response ) {
                        var
                            data = response.data,
                            currentDay = moment().dayOfYear(),
                            foundToday = false;
                        if( data.length ) {
                            if( data[0].code ) {
                                self.freeAppointments.removeAll();
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'error',
                                    message: Y.doccirrus.errorTable.getMessage( { code: data[0].code } )
                                } );
                            } else {
                                self.freeAppointments.removeAll();
                                data.forEach( function( appointment ) {
                                    foundToday = foundToday || ( currentDay === moment( appointment.start ).dayOfYear());
                                    self.freeAppointments.push( self.prepareAppointment( appointment ) );
                                } );
                            }
                        }
                        self.setAdhoc( foundToday );
                    } )
                    .fail( function( error ) {
                        self.freeAppointments.removeAll();
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } )
                    .always( function() {
                        self.setModelIsReady();
                    } );
            }

        },
        setAdhoc: function( foundToday ) {
            var
                self = this,
                appointmentType = ko.utils.peekObservable( self.appointmentType );
            if( foundToday && !appointmentType.isPreconfigured ) {
                Y.doccirrus.jsonrpc.api.patientportal.getWaitingTime( {
                    query: {
                        calendarId: self.calendarId,
                        isRandomMode: self.isRandomMode,
                        customerIdPrac: self.customerIdPrac
                    }
                } )
                    .done( function( response ) {
                        var
                            data = response.data && response.data[ 0 ];
                        if( data && 0 <= data.waitingtime ) {
                            self.adhoc( data );
                        } else {
                            self.adhoc( null );
                        }
                    } )
                    .fail( function( error ) {
                        self.adhoc( null );
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
            } else {
                self.adhoc( null );
            }

        },
        prepareAppointment: function( appointment ) {
            appointment.date = moment( appointment.start ).format( 'dd, DD.MM.YY' );
            appointment.inDays = moment( appointment.start ).fromNow();
            appointment.time = moment( appointment.start ).format( TIME_FORMAT );

            return appointment;
        },
        _bookAppointment: function( appointment ) {
            var
                self = this,
                appointmentType = ko.utils.peekObservable( self.appointmentType ),
                duration = appointmentType.duration,
                dataToSend = {
                    start: moment( appointment.start ).utc().toJSON(),
                    end: moment( appointment.start ).add( 'minutes', duration ).utc().toJSON(),
                    duration: duration,
                    plannedDuration: duration,
                    calendar: self.calendarId,
                    type: 'BOOKED',
                    adhoc: false,
                    allDay: false,
                    scheduletype: appointmentType._id,
                    scheduleTypeMeta: appointmentType,
                    resourceCalendarsToBook: appointment.calendars || [],
                    groupId: appointment._id || null,
                    scheduleId: appointment.scheduleId || null
                };
            if( -1 < ['CONFERENCE', 'ONLINE_CONSULTATION'].indexOf( appointmentType.type ) ) {
                dataToSend.employee = self.employee;
                dataToSend.conferenceType = appointmentType.type;
            }
            self.showBookDetailModal( function( data ) {
                dataToSend.details = data.details;
                self.makeAppointment( dataToSend );
            } );
        },
        makeAppointment: function( data, adhoc ) {
            var
                self = this;

            Y.doccirrus.jsonrpc.api.patientportal.makeAppointment( {
                query: {
                    customerIdPrac: self.customerIdPrac
                },
                data: data
            } )
                .done( function( response ) {
                    var
                        data = (response.data && response.data[ 0 ]) || {};
                    if( adhoc ) {
                        self.commonData.setNumber( data.number );
                        self.commonData.setPrac( self.customerIdPrac );
                        Y.doccirrus.nav.router.save( '/waitingtime' );
                    } else {
                        Y.doccirrus.nav.router.save( '/schedules' );
                    }
                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        },
        showBookDetailModal: function( callback ) {
            var
                self = this,
                appointmentType = ko.utils.peekObservable( self.appointmentType );
            Y.doccirrus.modals.appointmentBookingModal.showDialog( {
                info: appointmentType.info
            }, callback );
        },
        _bookAdhoc: function() {
            var
                self = this,
                DURATION = 5,
                appointmentType = ko.utils.peekObservable( self.appointmentType ),
                now = moment(),
                dataToSend = {
                    start: now.utc().toJSON(),
                    end: now.add( 'minutes', DURATION ).utc().toJSON(),
                    duration: DURATION,
                    plannedDuration: DURATION,
                    calendar: self.calendarId,
                    adhoc: true,
                    allDay: false,
                    scheduletype: appointmentType._id
                };

            if( true === appointmentType.isPreconfigured ) {
                dataToSend.isPreconfigured = appointmentType.isPreconfigured;
            }
            if( -1 < ['CONFERENCE', 'ONLINE_CONSULTATION'].indexOf( appointmentType.type ) ) {
                dataToSend.employee = self.employee;
                dataToSend.conferenceType = appointmentType.type;
            }
            self.showBookDetailModal( function( data ) {
                dataToSend.details = data.details;
                self.makeAppointment( dataToSend, true );
            } );
        },
        initSelect2Type: function() {
            var
                self = this;
            self.appointmentType = ko.observable();
            self.appointmentTypes = [];
            self.select2AppointmentType = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            appointmentType = ko.unwrap( self.appointmentType ),
                            result;
                        if( !appointmentType ) {
                            result = appointmentType;
                        } else {
                            result = {
                                id: appointmentType._id,
                                text: appointmentType.text || appointmentType.name,
                                isPreconfigured: appointmentType.isPreconfigured,
                                duration: appointmentType.duration,
                                requiredResources: appointmentType.requiredResources || [],
                                calendarRefs: appointmentType.calendarRefs || [],
                                type: appointmentType.type,
                                data: appointmentType.data
                            };
                        }
                        return result;
                    },
                    write: function( $event ) {
                        self.appointmentType( $event.added );
                    }
                } ) ),
                select2: {
                    placeholder: PLEASE_SELECT,
                    data: function() {
                        return {
                            results: self.appointmentTypes.map( function( type ) {
                                return {
                                    id: type._id,
                                    text: type.name,
                                    type: type.type,
                                    requiredResources: type.requiredResources,
                                    calendarRefs: type.calendarRefs,
                                    isPreconfigured: type.isPreconfigured,
                                    duration: type.duration,
                                    numberOfSuggestedAppointments: type.numberOfSuggestedAppointments,
                                    _id: type._id,
                                    data: type
                                };
                            } )
                        };
                    }
                }
            };
        },
        setModelIsReady: function() {
            var
                self = this;
            self.isReady = true;
            Y.doccirrus.utils.hideLoadingMask( self.mainNode );
        },
        setModelIsNotReady: function() {
            var
                self = this;
            self.isReady = false;
            Y.doccirrus.utils.showLoadingMask( self.mainNode );
        },
        initPatientInfo: function() {
            var
                self =this;

            self.patientInfo = ko.computed( function() {
                var appointmentType = ko.unwrap( self.appointmentType );

                if( Y.Lang.isObject( appointmentType ) && appointmentType.data && appointmentType.data.info ) {
                    return appointmentType.data.info;
                }
                return '';
            } );

        }
    } );

    return {
        registerNode: function( node, key, options ) {
            var
                appointmentModel;
            if( options.binder.commonData.appointmentData ) {
                appointmentModel = new AppointmentModel( { node: node, commonData: options.binder.commonData } );
                ko.applyBindings( appointmentModel, document.querySelector( '#intimeAppointment' ) );
            } else {
                Y.doccirrus.nav.router.save( '/practices' );
            }

        },

        deregisterNode: function( node ) {
            Y.log( 'deregistered ' + ( node || node._yuid ), 'debug', NAME );
        }
    };
};
