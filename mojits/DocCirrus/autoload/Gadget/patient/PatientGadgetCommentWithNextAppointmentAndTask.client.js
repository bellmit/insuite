/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */
YUI.add( 'PatientGadgetCommentWithNextAppointmentAndTask', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetCommentWithNextAppointmentAndTask
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' );

    /**
     * @constructor
     * @class PatientGadgetCommentWithNextAppointmentAndTask
     * @extends PatientGadget
     */
    function PatientGadgetCommentWithNextAppointmentAndTask() {
        PatientGadgetCommentWithNextAppointmentAndTask.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetCommentWithNextAppointmentAndTask, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.initNoShow();
            self.initAppointmentInfo();
            self.initTask();
            self.initComment();
            self.noShowCountI18n = i18n( 'InCaseMojit.casefile_browser.title_attribute.NO_SHOW_COUNT' );
            self.createAppointmentI18n = i18n( 'InCaseMojit.casefile_browser.title_attribute.CREATE_APPOINTMENT' );
            self.labelNotesI18n = i18n( 'InCaseMojit.casefile_browser.label.NOTES' );
            self.createTaskI18n = i18n( 'InCaseMojit.casefile_browser.title.CREATE_TASK' );
        },
        /** @private */
        destructor: function() {
        },
        // NOTE: This is the same as in "MirrorActivityPatientInfoViewModel" formerly known as ""ActivityPatientInfoViewModel""
        noShowCount: null,
        initNoShow: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            self.noShowCount = ko.computed( function() {
                var
                    noShowCount = unwrap( currentPatient.noShowCount );

                if( noShowCount ) {
                    return '(' + noShowCount + ')';
                }

                return '';
            } );
        },
        appointmentInfoVisible: null,
        _nextEvent: null,
        /** @private */
        initAppointmentInfo: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            self.appointmentInfoVisible = true;

            self._nextEvent = ko.observable();

            self.nextEventText = ko.computed( function() {
                var
                    appointment = self._nextEvent();

                if( appointment ) {
                    return moment( appointment.start ).format( i18n( 'general.TIMESTAMP_FORMAT' ) );
                }
                return '';
            } );
            self.nextEventTitle = ko.computed( function() {
                var
                    appointment = self._nextEvent();

                if( appointment ) {
                    return moment( appointment.start ).fromNow();
                }
                return '';
            } );

            Y.doccirrus.jsonrpc.api.patient.getAppointments( {
                noBlocking: true,
                patientId: peek( currentPatient._id ),
                limit: 1
            } ).done( function( response ) {
                if( response && response.data && response.data[0] ) {
                    self._nextEvent( response.data[0] );
                }
            } ) .fail( function( error ) {
                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            } );
        },
        /**
         * forward user to calendar and trigger "createEvent" action from localStorage
         * @method _doCreateEvent
         */
        _doCreateEvent: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                loadEvent = {
                    action: 'createEvent',
                    patientId: peek( currentPatient._id ),
                    preselection: null
                };

            Y.doccirrus.utils.sessionValueSet( 'loadEvent', loadEvent );
            window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );

        },
        /**
         * forward user in a new tab to calendar and trigger "updateEvent" action from localStorage
         * @method _doUpdateEvent
         */
        _doUpdateEvent: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                _nextEvent = self._nextEvent(),
                loadEvent;

            if( !_nextEvent ) {
                return;
            }

            // on a next date set calendar to that
            loadEvent = {
                action: 'updateEvent',
                gotoDate: _nextEvent.start,
                patientId: peek( currentPatient._id ),
                eventId: _nextEvent._id,
                start: _nextEvent.start,
                scheduleId: _nextEvent.scheduleId
            };

            Y.doccirrus.utils.sessionValueSet( 'loadEvent', loadEvent );
            window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );

        },
        _hotTask: null,
        _hotTaskTitle: null,
        _hotTaskAnimation: null,
        initTask: function() {
            var
                self = this;

            self._hotTask = ko.observable();
            self._hotTaskAnimation = ko.observable( false );

            self._hotTaskTitle = ko.observable();

            self._updateHotTask();
        },
        _updateHotTask: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            Y.doccirrus.jsonrpc.api.task.getPatientHotTask( {
                noBlocking: true,
                query: {
                    patientId: peek( currentPatient._id )
                }
            } )
                .done( function( response ) {
                    var
                        data = response.data && response.data[0];
                    if( data ) {
                        if( data.alertTime ) {
                            if( moment().isAfter( moment( data.alertTime ) ) ) {
                                self._hotTaskAnimation( true );
                            } else {
                                self._hotTaskAnimation( false );
                            }
                            self._hotTask( moment( data.alertTime ).format( i18n( 'general.TIMESTAMP_FORMAT' ) ) );
                            self._hotTaskTitle( moment( data.alertTime ).fromNow() );

                        } else {
                            self._hotTaskAnimation( false );
                            self._hotTask( i18n( 'CalendarMojit.task_api.title.TASK' ) );
                            self._hotTaskTitle( i18n( 'CalendarMojit.task_api.title.TASK' ) );
                        }

                        self._hotTask.data = data;
                    } else {
                        self._hotTaskAnimation( false );
                        self._hotTask( null );
                        self._hotTaskTitle( null );
                    }
                } ).fail( function( error ) {
                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            } );
        },
        _createTask: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            Y.doccirrus.modals.taskModal.showDialog( {
                patientId: peek( currentPatient._id ),
                patientName: Y.doccirrus.schemas.person.personDisplay( {
                    firstname: peek( currentPatient.firstname ),
                    lastname: peek( currentPatient.lastname ),
                    title: peek( currentPatient.title )
                } )
            }, function() {
                self._updateHotTask();
            } );
        },
        _showHotTask: function() {
            var
                self = this,
                data = self._hotTask.data;

            Y.doccirrus.modals.taskModal.showDialog( data, function() {
                self._updateHotTask();
            } );
        },
        _comment: null,
        initComment: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            self._comment = ko.computed( {
                read: function() {
                    return currentPatient.comment();
                },
                write: function( value ) {
                    if( !currentPatient.isNew() ) {
                        Y.doccirrus.jsonrpc.api.patient
                            .update( {
                                noBlocking: true,
                                query: {_id: peek( currentPatient._id )},
                                data: {comment: value},
                                field: ['comment']
                            } )
                            .done( function() {
                                currentPatient.set( 'data.comment', value );
                                currentPatient.setNotModified();
                            } )
                            .fail( function( error ) {
                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                            } );
                    }
                }
            } );
        }
    }, {
        NAME: 'PatientGadgetCommentWithNextAppointmentAndTask',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( PatientGadgetCommentWithNextAppointmentAndTask );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadget',

        'dcutils',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'DCTaskModal',
        'person-schema'
    ]
} );
