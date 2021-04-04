/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */
YUI.add( 'PatientGadgetLastAppointments', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetLastAppointments
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        getObject = Y.doccirrus.commonutils.getObject,
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,
        GADGET_UTILS = GADGET.utils,

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetLastAppointments,

        I18N_EMPLOYEE_NOT_FOUND = i18n( 'PatientGadget.PatientGadgetLastAppointments.employeeNotFound' ),
        I18N_CALENDAR_NOT_FOUND = i18n( 'PatientGadget.PatientGadgetLastAppointments.calendarNotFound' );

    /**
     * @constructor
     * @class PatientGadgetLastAppointments
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetLastAppointments() {
        PatientGadgetLastAppointments.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetLastAppointments, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.loadTableDataDeBounced = GADGET_UTILS.deBounceMethodCall( self.reloadTableData, 2000 );
            self.initPatientGadgetLastAppointments();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self._destroyCommunication();
        },
        appointments: null,
        initPatientGadgetLastAppointments: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient );

            self.lastAppointmentsI18n = i18n( 'PatientGadget.PatientGadgetLastAppointments.i18n' );

            self.appointments = ko.observableArray();

            self.addDisposable( ko.computed( function() {

                self.table.setItems( unwrap( self.appointments ) );
            } ) );

            self.table.onRowClick = function( row/*, $event*/ ) {
                var
                    loadEvent;

                loadEvent = {
                    action: 'updateEvent',
                    gotoDate: peek( row.start ).sourceData(),
                    patientId: peek( currentPatient._id ),
                    eventId: peek( row.id ),
                    start: peek( row.start ).sourceData()
                };

                Y.doccirrus.utils.sessionValueSet( 'loadEvent', loadEvent );
                window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );
                return;
            };

            self.loadTableData();

            self._initCommunication();

        },
        _communicationScheduleSubscription: null,
        _communicationPatientSubscription: null,
        _communicationScheduletypeSubscription: null,
        _communicationCalendarSubscription: null,
        _communicationEmployeeSubscription: null,
        _initCommunication: function() {
            var
                self = this;

            self._communicationScheduleSubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'schedule',
                callback: function( /*data, meta*/ ) {
                    self.loadTableDataDeBounced();
                }
            } );
            self._communicationPatientSubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'patient',
                callback: function( /*data, meta*/ ) {
                    self.loadTableDataDeBounced();
                }
            } );
            self._communicationScheduletypeSubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'scheduletype',
                callback: function( /*data, meta*/ ) {
                    self.loadTableDataDeBounced();
                }
            } );
            self._communicationCalendarSubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'calendar',
                callback: function( /*data, meta*/ ) {
                    self.loadTableDataDeBounced();
                }
            } );
            self._communicationEmployeeSubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'employee',
                callback: function( /*data, meta*/ ) {
                    self.loadTableDataDeBounced();
                }
            } );
        },
        _destroyCommunication: function() {
            var
                self = this;

            if( self._communicationScheduleSubscription ) {
                self._communicationScheduleSubscription.removeEventListener();
                self._communicationScheduleSubscription = null;
            }
            if( self._communicationPatientSubscription ) {
                self._communicationPatientSubscription.removeEventListener();
                self._communicationPatientSubscription = null;
            }
            if( self._communicationScheduletypeSubscription ) {
                self._communicationScheduletypeSubscription.removeEventListener();
                self._communicationScheduletypeSubscription = null;
            }
            if( self._communicationCalendarSubscription ) {
                self._communicationCalendarSubscription.removeEventListener();
                self._communicationCalendarSubscription = null;
            }
            if( self._communicationEmployeeSubscription ) {
                self._communicationEmployeeSubscription.removeEventListener();
                self._communicationEmployeeSubscription = null;
            }
        },
        loadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient );

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }

            Y.doccirrus.jsonrpc.api.patient
                .getForPatientGadgetAppointments( {
                    noBlocking: true,
                    query: {
                        scheduled: 'old',
                        patient: peek( currentPatient._id ),
                        dateTo: Date.now(),
                        sort: {start: -1, number: -1}
                    },
                    options: { limit: self.loadLimit }
                } )
                .done( function( response ) {
                    if( self.get( 'destroyed' ) || !self.appointments ) {
                        return;
                    }
                    self.appointments( response.data || [] );
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );

        },
        reloadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient );

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }
            Y.doccirrus.communication.apiCall( {
                method: 'patient.getForPatientGadgetAppointments',
                query: {
                    scheduled: 'old',
                    patient: peek( currentPatient._id ),
                    dateTo: Date.now(),
                    sort: {start: -1, number: -1}
                },
                options: {
                    limit: self.loadLimit
                }
            }, function( err, response ) {
                if( err ) {
                    return _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                }
                if( !self.get( 'destroyed' ) && self.appointments ) {
                    self.appointments( response.data || [] );
                }
            } );
        }
    }, {
        NAME: 'PatientGadgetLastAppointments',
        ATTRS: {
            availableConfigurableTableColumns: {
                value: [
                    {
                        val: CONFIG_FIELDS.START,
                        i18n: i18n( 'PatientGadget.PatientGadgetLastAppointments.CONFIG_FIELDS.START' ),
                        converter: function( value/*, data*/ ) {
                            return moment( value ).format( i18n( 'general.TIMESTAMP_FORMAT_LONG' ) );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.SCHEDULE_TITLE,
                        i18n: i18n( 'PatientGadget.PatientGadgetLastAppointments.CONFIG_FIELDS.SCHEDULE_TITLE' ),
                        converter: function( value, data ) {
                            return Y.doccirrus.schemas.calendar.buildScheduleTitle( {
                                event: data,
                                scheduletype: data.scheduletype
                            } );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.CALENDAR_NAME,
                        i18n: i18n( 'PatientGadget.PatientGadgetLastAppointments.CONFIG_FIELDS.CALENDAR_NAME' ),
                        renderer: function( value, data ) {
                            var
                                calendarName = value,
                                calendarColor = getObject( 'calendar.color', data ),
                                result = '';

                            if( !calendarName ) {
                                calendarName = I18N_CALENDAR_NOT_FOUND;
                                result = calendarName;
                            }
                            if( calendarColor ) {
                                result = Y.Lang.sub( '<span class="label" style="background-color:{backgroundColor}; color: {color}">{name}</span>', {
                                    backgroundColor: calendarColor,
                                    color: Y.doccirrus.schemas.calendar.getContrastColor( calendarColor ),
                                    name: calendarName
                                } );
                            }
                            else {
                                result = Y.Lang.sub( '<span class="label label-default">{name}</span>', {
                                    name: calendarName
                                } );
                            }

                            return result;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.EMPLOYEE_NAME,
                        i18n: i18n( 'PatientGadget.PatientGadgetLastAppointments.CONFIG_FIELDS.EMPLOYEE_NAME' ),
                        converter: function( value/*, data*/ ) {
                            var
                                employee = value,
                                result = '';

                            if( !employee ) {
                                employee = I18N_EMPLOYEE_NOT_FOUND;
                                result = employee;
                            }
                            else {
                                result = Y.doccirrus.schemas.person.personDisplay( employee );
                            }

                            return result;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.DETAILS,
                        i18n: i18n( 'PatientGadget.PatientGadgetLastAppointments.CONFIG_FIELDS.DETAILS' ),
                        converter: function( value/*, data*/ ) {
                            return value || '';
                        }
                    }
                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.START,
                    CONFIG_FIELDS.SCHEDULE_TITLE,
                    CONFIG_FIELDS.CALENDAR_NAME,
                    CONFIG_FIELDS.EMPLOYEE_NAME
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetLastAppointments );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadgetConfigurableTableBase',
        'GadgetLayouts',
        'GadgetUtils',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dccommonutils',
        'dcutils',
        'dccommunication-client',
        'calendar-schema',
        'person-schema'
    ]
} );
