/*global fun:true, ko, moment, _ */ //eslint-disable-line
fun = function _fn( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        TIME_FORMAT = i18n( 'general.TIME_FORMAT' ),
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        SELECT_APPOINTMENT_TYPE = i18n( 'PatPortalMojit.intime_appointment_tab.text.SELECT_APPOINTMENT_TYPE' ),
        NO_VC_APPOINTMENT_TYPE = i18n( 'PatPortalMojit.intime_appointment_tab.text.NO_VC_APPOINTMENT_TYPE' ),
        PLEASE_SELECT = i18n( 'general.message.PLEASE_SELECT' ),
        Disposable = Y.doccirrus.KoViewModel.getDisposable();

    function VCAppointmentModel( config ) {
        VCAppointmentModel.superclass.constructor.call( this, config );
    }

    Y.extend( VCAppointmentModel, Disposable, {
        initializer: function VCAppointmentModel_initializer( config ) {
            var
                self = this;
            self.mainNode = config.node;
            self.commonData = config.commonData;
            self.initVCAppointmentModel();
        },
        initVCAppointmentModel: function() {
            var
                self = this;
            self.calendarId = self.commonData.appointmentData.calendarId;
            self.calendar = self.commonData.appointmentData.calendar;
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
                minDate: moment().startOf( 'day' )
            };
            self.selectedDate = ko.observable( moment().toISOString() );
            self.freeAppointments = ko.observableArray();
            self.isWebRTCChecked = ko.observable( false );

            self.bookI18n = i18n( 'PatPortalMojit.intime_appointment_tab.text.BOOK' );
            self.appointmentSettingI18n = i18n( 'PatPortalMojit.intime_appointment_tab.text.APPOINTMENT_SETTING', {data: {locname: self.locname}} );
            self.appointmentTypeI18n = i18n( 'PatPortalMojit.intime_appointment_tab.text.APPOINTMENT_TYPE' );
            self.dateFromI18n = i18n( 'PatPortalMojit.intime_appointment_tab.text.DATE_FROM' );
            self.foundedAppointmentsI18n = i18n( 'PatPortalMojit.intime_appointment_tab.text.FOUNDED_APPOINTMENTS' );
            self.hourI18n = i18n( 'PatPortalMojit.intime_appointment_tab.text.HOUR' );
            self.checkWebRTCI18n = i18n( 'PatPortalMojit.vc_appointment_tab.text.CHECK_WEBRTC' );
            self.healthCardI18n = i18n( 'PatPortalMojit.vc_appointment_tab.text.HEALTH_CARD_READY' );

            self.bookAppointment = function( data ) {
                self._bookAppointment( data );
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
                        if( !self.appointmentTypes || !self.appointmentTypes.length ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: NO_VC_APPOINTMENT_TYPE
                            } );
                        }
                    }
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
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
                    appointmentType = self.appointmentType();
                if( self.isReady && appointmentType && selectedDate ) {
                    self.freeAppointments.removeAll();
                    self.getScheduleOptions( {
                        selectedDate: selectedDate,
                        appointmentType: appointmentType
                    } );
                }
            } ).extend( { rateLimit: 0 } ) );
        },
        getScheduleOptions: function( config ) {
            var
                self = this,
                appointmentType = config.appointmentType || ko.utils.peekObservable( self.appointmentType ),
                selectedDate = config.selectedDate || ko.utils.peekObservable( self.selectedDate ),
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
                        customerIdPrac: self.customerIdPrac,
                        isPreconfigured: appointmentType.isPreconfigured,
                        resourceSlotSearch: Boolean( appointmentType.requiredResources && appointmentType.requiredResources.length ),
                        isRandomMode: self.isRandomMode
                    }
                } )
                    .done( function( response ) {
                        var
                            data = response.data;
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
                                    self.freeAppointments.push( self.prepareAppointment( appointment ) );
                                } );
                            }
                        }
                    } )
                    .fail( function( error ) {
                        self.freeAppointments.removeAll();
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } )
                    .always( function() {
                        self.setModelIsReady();
                    } );
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
                    calendar: self.calendar,
                    type: 'BOOKED',
                    adhoc: false,
                    allDay: false,
                    scheduletype: appointmentType._id,
                    scheduleTypeMeta: appointmentType,
                    resourceCalendarsToBook: appointment.calendars || [],
                    groupId: appointment._id || null,
                    scheduleId: appointment.scheduleId || null,
                    employee: self.employee,
                    conferenceType: appointmentType.type
                };

            self.showBookDetailModal( function( data ) {
                dataToSend.details = data.details;
                self.makeAppointment( dataToSend );
            } );
        },
        makeAppointment: function( data ) {
            var self = this;
            self.commonData.appointmentToBook = data;
            Y.doccirrus.nav.router.save( '/schedules' );
            return;
        },
        showBookDetailModal: function( callback ) {
            var
                self = this,
                appointmentType = ko.utils.peekObservable( self.appointmentType );
            Y.doccirrus.modals.appointmentBookingModal.showDialog( {
                info: appointmentType.info
            }, callback );
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
                self = this;

            self.patientInfo = ko.computed( function() {
                var appointmentType = ko.unwrap( self.appointmentType );

                if( _.isObject( appointmentType ) && appointmentType.data && appointmentType.data.info ) {
                    return appointmentType.data.info;
                }
                return '';
            } );
        }
    } );

    return {
        registerNode: function( node, key, options ) {
            var
                vcAppointmentModel;
            if( options.binder.commonData.appointmentData ) {
                vcAppointmentModel = new VCAppointmentModel( { node: node, commonData: options.binder.commonData } );
                ko.applyBindings( vcAppointmentModel, document.querySelector( '#inconferenceAppointment' ) );
            } else {
                Y.doccirrus.nav.router.save( '/practices' );
            }
        },

        deregisterNode: function( node ) {
            Y.log( 'deregistered ' + ( node || node._yuid ), 'debug', NAME );
        }
    };
};