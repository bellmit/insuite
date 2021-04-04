/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */

YUI.add( 'ConferenceAppointmentModel', function( Y/*, NAME*/ ) {
    /**
     * @module ConferenceAppointmentModel
     */

    var
        i18n = Y.doccirrus.i18n,
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        KoViewModel = Y.doccirrus.KoViewModel,
        //KoUI = Y.doccirrus.KoUI,
        I18N_PLACEHOLDER_PLEASE_CHOOSE = i18n( 'RepetitionKoViewModel_clientJS.placeholder.PLEASE_SELECT' ),
        I18N_PATIENT_LINK_TITLE = i18n( 'RepetitionKoViewModel_clientJS.placeholder.PATIENT_LINK_TITLE' ),
        PATIENTS_SINGLE_SELECTION = i18n( 'RepetitionKoViewModel_clientJS.placeholder.PATIENTS_SINGLE_SELECTION' ),
        MISSING_MANDATORY_VALUE = i18n( 'validations.message.MISSING_MANDATORY_VALUE' ),
        EMAIL_IS_MISSING = i18n( 'RepetitionKoViewModel_clientJS.text.EMAIL_IS_MISSING' ),
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
        RepetitionKoViewModel = KoViewModel.getConstructor( 'RepetitionKoViewModel' ),
        DEFAULT_DURATION = Y.doccirrus.schemas.scheduletype.getDefaultDuration();

    /**
     * @beta
     * @class ConferenceAppointmentModel
     * @constructor
     * @extends KoViewModel
     * @main
     * @param {Object} config
     */
    function ConferenceAppointmentModel( config ) {
        ConferenceAppointmentModel.superclass.constructor.call( this, config );
    }

    Y.extend( ConferenceAppointmentModel, KoViewModel.getBase(), {
        /**
         * @property isGroupMaster
         * @type function {ko.observable}
         */
        isGroupMaster: ko.observable( false ),
        initializer: function ConferenceAppointmentModel_initializer() {
            var
                self = this;

            self.initialScheduleType = peek( self.scheduletype );
            self.initialGroupCapacity = peek( self.capacityOfGroup );

            self.conferenceLinkI18n = i18n( 'TaskMojit.TaskModal.label.CONFERENCE_LINK' );

            self.initCalendas();
            self.initSelect2();
            self.initObservables();
            /**
             * fields which do not exist in conference appointment type
             */
            self.repetition( 'NONE' );
        },
        destructor: function ConferenceAppointmentModel_destructor() {
        },
        getConferenceLink() {
            var
                self = this,
                isForUnregistered = (self.get( 'data' ) || {}).isForUnregistered,
                user = Y.doccirrus.auth.getUser(),
                link = Y.doccirrus.infras.getPublicURL( '/intouch/conference/' ) + ko.unwrap( self.conferenceId ) + '?identityId=' + user.identityId;

            if( isForUnregistered ) {
                link += '&name=' + encodeURIComponent( user.name ) + '&light=' + isForUnregistered;
            }
            return link;
        },
        initObservables: function ConferenceAppointmentModel_initObservables() {
            var
                self = this;
            self.startDatetimepickerOptions = {
                format: ko.observable( TIMESTAMP_FORMAT_LONG ),
                sideBySide: true,
                widgetPositioning: {
                    horizontal: 'left',
                    vertical: 'top'
                }
            };

            self.endDatetimepickerOptions = {
                format: TIMESTAMP_FORMAT_LONG,
                sideBySide: true,
                widgetPositioning: {
                    horizontal: 'right',
                    vertical: 'top'
                }
            };

            self.findScheduleDatepickerOptions = {
                format: TIMESTAMP_FORMAT,
                sideBySide: true,
                widgetPositioning: {
                    horizontal: 'right',
                    vertical: 'top'
                },
                minDate: new Date()
            };


            self.isFindAppointment = ko.observable( self.get( 'findAppointment' ) );

            self.isDoctorCalendar = ko.computed( function() {
                var
                    calendar = self.calendar();
                if( calendar ) {
                    return Y.doccirrus.schemas.calendar.isDoctorCalendar( calendar );
                }
                return false;
            } );

            self.initScheduletypesList();

            self.addDisposable( ko.computed( function() {
                var
                    duration = unwrap ( self.duration );
                self.plannedDuration( duration );
            } ) );

            self.scheduletypeEnabled = ko.computed( function() {
                return Boolean( unwrap( self.calendar ) );
            } );


            // computed for default duration
            // - default duration is DEFAULT_DURATION
            // - for Infokalender it's the default
            // - for scheduletype extract from saved value
            self.addDisposable( ko.computed( function() {
                var
                    scheduletypeEnabled = unwrap( self.scheduletypeEnabled ),
                    scheduletype = unwrap( self.scheduletype ),
                    calendar = unwrap( self.calendar ),
                    scheduletypeList = peek( self.scheduletype.list ),
                    isDoctorCalendar = Y.doccirrus.schemas.calendar.isDoctorCalendar( calendar ),
                    isInitial = ko.computedContext.isInitial(),
                    scheduletypeMeta = _.find( scheduletypeList, { _id: scheduletype } ),
                    scheduleTypeChanged = scheduletype !== self.initialScheduleType,
                    isDurationSet = peek( self.duration );

                /**
                 * does not work because this model is not initialized and repetition model does not set duration properly.
                 */
                if( !calendar || !scheduletypeEnabled || self.get( 'userSetDuration' ) || (isInitial && isDurationSet) ) {
                    return;
                }

                if( !isDoctorCalendar ) {
                    self.duration( DEFAULT_DURATION );
                } else if( scheduletypeMeta ) {
                    self.duration( scheduletypeMeta.duration );
                }

                if( self.groupId() ) {
                    //if it is group member - capacity and group always null
                    self.group( null );
                    self.capacityOfGroup( null );
                    self.isGroupMaster( false );
                } else if( scheduletypeMeta && scheduletypeMeta.isPreconfigured && Y.doccirrus.schemas.scheduletype.appointmentTypes.STANDARD === scheduletypeMeta.type && !self.adhoc() ) {
                    // if it should be a group master
                    if( scheduleTypeChanged ) {
                        self.capacityOfGroup( scheduletypeMeta.capacity );
                    } else {
                        self.capacityOfGroup( self.initialGroupCapacity );
                    }
                    self.group( true );
                    self.isGroupMaster( true );

                } else { // then just clean up
                    self.group( null );
                    self.capacityOfGroup( null );
                    self.isGroupMaster( false );
                }
            } ) );

            // If start time is changed, then the end time must automatically be updated to start + duration
            self.addDisposable( ko.computed( function() {
                var
                    start = unwrap( self.start ),
                    end = peek( self.end ),
                    duration = parseInt( peek( self.duration ), 10 ),
                    isDoctorCalendar = unwrap( self.isDoctorCalendar ),
                    isInitial = ko.computedContext.isInitial(),
                    value;
                if( isInitial ) {
                    return;
                }
                if( !isNaN( duration ) && start ) {
                    value = moment( start ).add( duration, 'minutes' ).toISOString();
                    if( !isDoctorCalendar ) {
                        self.duration( moment( end ).diff( start, 'minutes' ) );
                    } else {
                        self.end( value );
                    }
                }
            } ).extend( {
                rateLimit: 800
            } ) );

            // if duration is changed, then the end time must automatically be updated to start + duration
            self.addDisposable( ko.computed( function() {
                var
                    duration = parseInt( unwrap( self.duration ), 10 ),
                    start = peek( self.start ),
                    isInitial = ko.computedContext.isInitial(),
                    value;
                if( isInitial ) {
                    return;
                }
                if( !isNaN( duration ) && start ) {
                    value = moment( start ).add( duration, 'minutes' ).toISOString();
                    self.end( value );
                }

            } ).extend( {
                rateLimit: 800
            } ) );

            // if end time is changed, then the start time must be automatically be updated to end - duration
            self.addDisposable( ko.computed( function() {
                var
                    end = unwrap( self.end ),
                    start = peek( self.start ),
                    duration = parseInt( peek( self.duration ), 10 ),
                    isDoctorCalendar = unwrap( self.isDoctorCalendar ),
                    isInitial = ko.computedContext.isInitial(),
                    value;
                if( isInitial ) {
                    return;
                }
                if( !isNaN( duration ) && end ) {
                    value = moment( end ).subtract( duration, 'minutes' ).toISOString();
                    if( !isDoctorCalendar ) {
                        self.duration( moment( end ).diff( start, 'minutes' ) );
                    } else {
                        self.start( value );
                    }
                }
            } ).extend( {
                rateLimit: 1000
            } ) );

            // keep conference.startDate and schedule.start in sync
            self.addDisposable( ko.computed( function() {
                var
                    start = unwrap( self.start ),
                    isInitial = ko.computedContext.isInitial();
                if( isInitial ) {
                    return;
                }
                self.startDate( start );
            } ) );

            self.isSearchingAppointment = ko.observable( false );

            self.formatDateWithDay = RepetitionKoViewModel.formatDateWithDay;

            self.startFormatted = ko.pureComputed( function() {
                var startDate = ko.unwrap( this.start );
                return startDate && self.formatDateWithDay( startDate );
            }, this );

            self.findStartDate = ko.observable( moment().toISOString() );

            self.isFindStartDateEnabled = ko.pureComputed( function() {
                return ko.unwrap( this.findStartDate ) && !ko.unwrap( this.isSearchingAppointment ) && ko.unwrap( this.calendar );
            }, this );

            self.findAppointmentAvailableDates = ko.observableArray();

            self.setFoundAppointment = self.setFoundAppointment.bind( self );

            self.addDisposable( ko.computed( function() {
                var
                    employees = unwrap( ko.employees );
                self.callerId( employees && employees[ 0 ] );
            } ) );

            self.labelFromDayI18n = i18n( 'CalendarMojit.template_appointment.label.FROM_DAY' );
            self.labelSearchForAppointmentI18n = i18n( 'CalendarMojit.calendar.button.SEARCH_FOR_APPOINTMENT' );
            self.labelSuggestedAppointmentI18n = i18n( 'CalendarMojit.template_appointment.label.SUGGESTED_APPOINTMENTS' );
        },
        /**
         *  @method setFoundAppointment
         *  @param {Date} date
         *  @returns {Date}
         */
        setFoundAppointment: function RepetitionKoViewModel_setFoundAppointment( date ) {
            return this.start( moment( date ).toISOString() );
        },
        getCurrentSource: function( calendar ) {
            var
                self = this,
                sources = self.get( 'sources' ),
                source = _.find( sources, { _id: calendar } );
            return source;
        },
        /**
         *  @method handleSearchAppointment
         */
        handleSearchAppointment: function RepetitionKoViewModel_handleSearchAppointment() {

            var
                self = this,
                startDate = peek( self.findStartDate ),
                startDateStarOfDay = moment( startDate ).startOf( 'day' ),
                source = self.getCurrentSource( peek( self.calendar ) ),
                scheduletype = peek( self.scheduletype ),
                isPreconfigured = false,
                scheduletypeList = self.scheduletype.list(),
                scheduletypeMeta = _.find( scheduletypeList, { _id: scheduletype } );
            self.start( '' );
            self.findAppointmentAvailableDates.removeAll();

            if( startDateStarOfDay.isAfter( moment().startOf( 'day' ) ) ) {
                startDate = startDateStarOfDay.toISOString();
            }

            self.isSearchingAppointment( true );

            if( scheduletypeMeta && scheduletypeMeta.isPreconfigured && !self.adhoc() ) {
                isPreconfigured = true;
            }

            Y.doccirrus.jsonrpc.api.calevent.calculateSchedule( {
                data: {
                    action: 'calculateschedule',
                    subaction: 'NEXT',
                    calendar: peek( self.calendar ),
                    scheduleType: scheduletype,
                    patientId: peek( self.patient ),
                    isRandomMode: source && source.isRandomMode,
                    mirrorCalendarId: source && source.mirrorCalendarId,
                    n: 5,
                    isPreconfigured: isPreconfigured,
                    duration: peek( self.duration ),
                    start: startDate,
                    sparse: '1'
                }
            } ).done( function( response ) {
                var
                    data = response.data;
                self.isSearchingAppointment( false );
                if( data && data.length ) {
                    if( data[ 0 ].code ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: Y.doccirrus.errorTable.getMessage( { code: data[ 0 ].code } )
                        } );
                    } else {
                        self.start( moment( data.shift().start ) );
                        self.findAppointmentAvailableDates( data.map( function( d ) {
                            return moment( d.start );
                        } ) );
                    }
                } else {
                    self.findAppointmentAvailableDates.removeAll();
                }
            } ).fail( function( err ) {
                Y.log( 'Error when searching for the appointments ' + err, 'error' );
                self.isSearchingAppointment( false );
                self.findAppointmentAvailableDates.removeAll();
            } );
        },
        onDurationChangeByUser: function( model, $event ) {
            var
                self = this,
                input = $event.target;

            if( input.value && /^\d+$/.test( input.value ) ) {
                self.set( 'userSetDuration', true );
            }
        },
        initScheduletypesList: function ConferenceAppointmentModel_initScheduletypesList() {
            var
                self = this,
                binder = Y.doccirrus.utils.getMojitBinderByType( 'CalendarMojit' ),
                binderViewModel = binder.binderViewModel;
            self.scheduletype.list = ko.computed( function() {
                var
                    calendar = self.calendar(),
                    startTime = self.start(),
                    endTime = self.end(),
                    scheduleTypes = [].concat( self.get( 'scheduletypes' ) ),
                    currentCalendarObj = calendar ? (self.calendar.list || []).find( function( item ) {
                        return calendar === item._id;
                    } ) : null,
                    consultTimesOfCalendar = currentCalendarObj && _.union( currentCalendarObj.consultTimes || [], currentCalendarObj.specificConsultTimes || [] ),
                    desiredDayOfWeek = moment( startTime ).day(),
                    consultTimesOfDesiredDay = [], suitableConsultTimes = [], availableScheduleTypes = [];



                // sort in alphabetical order
                scheduleTypes.sort( function( a, b ) {
                    return a.name.localeCompare( b.name );
                } );

                scheduleTypes = Y.doccirrus.schemas.calendar.filterScheduletypesForCalendar( scheduleTypes, calendar );

                if( (!startTime || !endTime) && !self.isFindAppointment() ) {
                    return (self.scheduletype.list && peek( self.scheduletype.list )) || scheduleTypes;
                }

                if( consultTimesOfCalendar && consultTimesOfCalendar.length && !self.isFindAppointment() ) {
                    // check if there are some consultTime for desired day of week
                    consultTimesOfDesiredDay = consultTimesOfCalendar.filter( function( time ) {
                        return time.days.indexOf( desiredDayOfWeek ) > -1;
                    } );
                    if( !consultTimesOfDesiredDay.length ) {
                        if( binderViewModel.get( 'inTimeConfig' ).allowBookingsOutsideOpeningHours ) {
                            return scheduleTypes;
                        }
                        // means that there are no consult times configured for the desired day so no scheduletypes are available (except for already saved one)
                        if( peek( self.scheduletype ) && !self.isNew() ) {
                            return scheduleTypes.filter( function( scheduleType ) {
                                return peek( self.scheduletype ) === scheduleType._id;
                            } );
                        }
                        return [];
                    }

                    // check if selected timeSlot is in some of consultTimesOfDesiredDay
                    suitableConsultTimes = consultTimesOfDesiredDay.filter( function( time ) {
                        var
                            startOfConsultTime = Y.doccirrus.commonutils.convertHourArrayToMoment( time.start, moment( startTime ).startOf( 'day' ) ).toDate(),
                            endOfConsultTime = Y.doccirrus.commonutils.convertHourArrayToMoment( time.end, moment( startTime ).startOf( 'day' ) ).toDate(),
                            eventStartToDate = moment.utc( startTime ).seconds( 0 ).milliseconds( 0 ).toDate(),
                            eventEndToDate = moment.utc( endTime ).seconds( 0 ).milliseconds( 0 ).toDate();

                        return Y.doccirrus.commonutils.hasClash( startOfConsultTime, endOfConsultTime, eventStartToDate, eventEndToDate );
                    } );
                    if( suitableConsultTimes.some( function( time ) {
                        return (Array.isArray( time.scheduleTypes ) && 0 === time.scheduleTypes.length) || !time.scheduleTypes;
                    } ) || ( !suitableConsultTimes.length && binderViewModel.get( 'inTimeConfig' ).allowBookingsOutsideOpeningHours ) ) {
                        // if desired slot lies in consultTime which has no scheduleTypes configured
                        // OR
                        // if allowBookingsOutsideOpeningHours setting is enabled and we don't have any suitableConsultTimes
                        // then we show all scheduletypes for that calendar
                        return scheduleTypes;
                    }

                    suitableConsultTimes.forEach( function( time ) {
                        availableScheduleTypes = _.union( availableScheduleTypes, time.scheduleTypes );
                    } );
                    return scheduleTypes.filter( function( scheduleType ) {
                        if( peek( self.scheduletype ) && !self.isNew() ) {
                            // show already saved scheduletype and those from availableScheduleTypes
                            return (peek( self.scheduletype ) === scheduleType._id) || (availableScheduleTypes.indexOf( scheduleType._id ) > -1);
                        }
                        // show availableScheduleTypes only
                        return availableScheduleTypes.indexOf( scheduleType._id ) > -1;
                    } );
                }

                return scheduleTypes;
            } ).extend( {
                rateLimit: 900
            } );
        },
        initCalendas: function ConferenceAppointmentModel_initCalendas() {
            var
                self = this,
                sources = self.get( 'sources' ),
                userEmployee = self.get( 'userEmployee' );
            self.calendar.list = [].concat( self.get( 'sources' ) );
            if( self.isNew() ) {
                self.addDisposable( ko.computed( function() {
                    var
                        calendar = unwrap( self.calendar ),
                        selectedCalendar,
                        employees = peek( self.employees );
                    if( employees.length ) {
                        return;
                    }
                    if( userEmployee && 'PHYSICIAN' === userEmployee.type ) {
                        self.employees( [ userEmployee._id ] );
                        self.set( 'employees', [ userEmployee ].concat( self.get( 'employees' ) ) );
                        return;
                    }
                    selectedCalendar = _.find( sources, { _id: calendar } );
                    if( selectedCalendar && selectedCalendar.employeeObj && 'PHYSICIAN' === selectedCalendar.employeeObj.type ) {
                        self.employees( [ selectedCalendar.employeeObj._id ] );
                        self.set( 'employees', [ selectedCalendar.employeeObj ].concat( self.get( 'employees' ) ) );
                    }
                } ) );
            }

        },
        initSelect2: function ConferenceAppointmentModel_initSelect2() {
            var
                self = this,
                multiplePatientSelector = self.get( 'multiplePatientSelector' );
            RepetitionKoViewModel.injectSelectSeverity( self );
            self.multiplePatientSelector = multiplePatientSelector;
            if( multiplePatientSelector ) {
                self.initMultiPatientSelect2();
                self.initMultiEmployeeSelect2();
                self.initParticipantSelect2();
            } else {
                self.patients.i18n = PATIENTS_SINGLE_SELECTION;
                self.initSinglePatientSelect2();
                self.initSingleEmployeeSelect2();

                self.addDisposable( ko.computed( function() {
                    var isValid = self.selectedPatients() && self.selectedPatients().length && self.selectedPatients().every( function( person ) {
                            return person.data && person.data.email;
                        } );

                    if( !self.selectedPatients().length ) {
                        self.selectedPatients.validationMessages( [MISSING_MANDATORY_VALUE] );
                    } else {
                        self.selectedPatients.validationMessages( [EMAIL_IS_MISSING] );
                    }
                    self.selectedPatients.hasError( !isValid );
                } ) );
            }
        },
        /**
         * Coverts employee object to selec2 object
         * @method personToSelect2Object
         * @param {Object} person
         * @param {Boolean} noDob
         * @returns {Object}
         */
        personToSelect2Object: function ConferenceAppointmentModel_personToSelect2Object( person, noDob ) {
            var
                dob = '',
                email;
            if( person.kbvDob && !noDob ) {
                dob = ' [' + person.kbvDob + ']';
            }
            if( !person ) {
                return person;
            }
            if( person.communications ) {
                email = Y.doccirrus.schemas.simpleperson.getEmail( person.communications );
            }
            return {
                id: person._id,
                text: Y.doccirrus.schemas.person.personDisplay( person ) + dob,
                data: {
                    lastname: person.lastname,
                    firstname: person.firstname,
                    email: email && email.value,
                    talk: person.talk
                },
                obj: person
            };
        },
        /**
         * builds a label from a patient object
         * @method _buildSelect2ItemFromPatient
         * @param {object} patient
         * @return {object}
         * @protected
         */
        _buildPatientLabelFromPatient: function ConferenceAppointmentModel__buildPatientLabelFromPatient( patient ) {
            return patient.text;
        },
        initMultiPatientSelect2: function ConferenceAppointmentModel_initPatientSelect2() {
            var
                self = this,
                patients = self.get( 'patients' );
            self.selectedPatients = ko.observableArray( patients.map( self.personToSelect2Object ) );
            self.patientLink = ko.computed( function() {
                var
                    selectedPatients = unwrap( self.selectedPatients ),
                    patientString,
                    result = '';
                selectedPatients.forEach( function( patient ) {
                    patientString = Y.Escape.html( self._buildPatientLabelFromPatient( patient ) );
                    result += Y.Lang.sub( '<a href="{href}" class="patient-linkToCase" title="{title}" target="_blank">{text}</a>', {
                        title: I18N_PATIENT_LINK_TITLE,
                        text: patientString,
                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + patient.id + '/tab/casefile_browser'
                    } ) + '</br>';
                } );
                return result;
            } );
            self.patientAutocomplete = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            selectedPatients = unwrap( self.selectedPatients );
                        return selectedPatients;
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.selectedPatients.push( $event.added );
                            self.patients.push( $event.added.id );
                            patients.push( $event.added.obj );
                        }
                        if( $event.removed ) {
                            self.selectedPatients.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                            self.patients.remove( $event.removed.id );
                            self.set( 'patients', patients.filter( function( item ) {
                                return item._id !== $event.removed.id;
                            } ) );
                        }

                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    multiple: true,
                    placeholder: I18N_PLACEHOLDER_PLEASE_CHOOSE,
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.patient.getPatients( {
                            query: {
                                isStub: {$ne: true},
                                term: Y.doccirrus.commonutils.$regexLikeUmlaut( query.term, {
                                    onlyRegExp: true,
                                    noRegexEscape: true
                                } )
                            }
                        } ).done( function( response ) {
                                var
                                    data = response.data;
                                query.callback( {
                                    results: data.map( function( patient ) {
                                        return self.personToSelect2Object( patient );
                                    } )
                                } );
                            }
                        ).fail( function() {
                            query.callback( {
                                results: []
                            } );
                        } );
                    }
                }
            };
        },
        initSinglePatientSelect2: function ConferenceAppointmentModel_initPatientSelect2() {
            var
                self = this,
                patient = peek(self.patient),
                patients = self.get( 'patients' );

            self.selectedPatients = ko.observableArray( patients.slice( 0, 1 ).map( function (patient) {
                var patientData = self.personToSelect2Object(patient);

                self.patients( [ patientData.id ] );
                self.patient( patientData.id );
                self.participants( [ patientData.data ] );

                return patientData;
            } ) );

            self.selectedPatients.validationMessages = ko.observableArray( [MISSING_MANDATORY_VALUE] );
            self.selectedPatients.hasError = ko.observable( false );
            self.patientLink = ko.computed( function() {
                var
                    selectedPatients = unwrap( self.selectedPatients ),
                    patientString,
                    result = '';
                selectedPatients.forEach( function( patient ) {
                    patientString = Y.Escape.html( self._buildPatientLabelFromPatient( patient ) );
                    result += Y.Lang.sub( '<a href="{href}" class="patient-linkToCase" title="{title}" target="_blank">{text}</a>', {
                        title: I18N_PATIENT_LINK_TITLE,
                        text: patientString,
                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + patient.id + '/tab/casefile_browser'
                    } ) + '</br>';
                } );
                return result;
            } );

            if ( patient && self.selectedPatients.length === 0 ) {
                Y.doccirrus.jsonrpc.api.patient.read( {
                    query: {
                        _id: patient
                    }
                } ).then( function( res ) {
                    var
                        patientResponse = res && res.data && res.data[0];

                    if ( patientResponse ) {
                        self.patientAutocomplete.data( { added: self.personToSelect2Object( patientResponse ) } );
                    }
                } )
            }


            self.patientAutocomplete = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            selectedPatients = unwrap( self.selectedPatients );
                        return selectedPatients[ 0 ];
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.selectedPatients( [ $event.added ] );
                            self.patients( [ $event.added.id ] );
                            self.patient( $event.added.id );
                            self.participants( [ $event.added.data ] );
                        } else {
                            self.patient( null );
                            self.selectedPatients.removeAll();
                            self.patients.removeAll();
                            self.participants.removeAll();
                        }
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    multiple: false,
                    placeholder: I18N_PLACEHOLDER_PLEASE_CHOOSE,
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.patient.getPatients( {
                            query: {
                                isStub: {$ne: true},
                                term: Y.doccirrus.commonutils.$regexLikeUmlaut( query.term, {
                                    onlyRegExp: true,
                                    noRegexEscape: true
                                } )
                            }
                        } ).done( function( response ) {
                                var
                                    data = response.data;
                                query.callback( {
                                    results: data.map( function( patient ) {
                                        return self.personToSelect2Object( patient );
                                    } )
                                } );
                            }
                        ).fail( function() {
                            query.callback( {
                                results: []
                            } );
                        } );
                    }
                }
            };
        },
        initMultiEmployeeSelect2: function ConferenceAppointmentModel_initEmployeeSelect2() {
            var
                self = this,
                employees = self.get( 'employees' );
            self.selectedEmployees = ko.observableArray( employees.map( function( employee ) {
                return self.personToSelect2Object( employee, true );
            } ) );
            self.employeeAutocomplete = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.selectedEmployees );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.selectedEmployees.push( $event.added );
                            self.employees.push( $event.added.id );
                            employees.push( $event.added.obj );
                        }
                        if( $event.removed ) {
                            self.selectedEmployees.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                            self.employees.remove( $event.removed.id );
                            self.set( 'employees', employees.filter( function( item ) {
                                return item._id !== $event.removed.id;
                            } ) );
                        }

                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    multiple: true,
                    placeholder: I18N_PLACEHOLDER_PLEASE_CHOOSE,
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.employee.getEmployeeByName( {
                            query: {
                                term: query.term
                            }
                        } ).done( function( response ) {
                                var
                                    data = response.data;
                                query.callback( {
                                    results: data.map( function( employee ) {
                                        return self.personToSelect2Object( employee );
                                    } )
                                } );
                            }
                        ).fail( function() {
                            query.callback( {
                                results: []
                            } );
                        } );
                    }
                }
            };
        },
        initSingleEmployeeSelect2: function ConferenceAppointmentModel_initEmployeeSelect2() {
            var
                self = this,
                employees = self.get( 'employees' );
            self.selectedEmployees = ko.observableArray( employees.slice( 0, 1 ).map( function( employee ) {
                return self.personToSelect2Object( employee, true );
            } ) );
            self.employeeAutocomplete = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            selectedEmployees = unwrap( self.selectedEmployees );
                        return selectedEmployees[ 0 ];
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.selectedEmployees( [ $event.added ] );
                            self.employees( [ $event.added.id ] );
                        } else {
                            self.selectedEmployees.removeAll();
                            self.employees.removeAll();
                        }
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    multiple: false,
                    placeholder: I18N_PLACEHOLDER_PLEASE_CHOOSE,
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.employee.getEmployeeByName( {
                            query: {
                                term: query.term
                            }
                        } ).done( function( response ) {
                                var
                                    data = response.data;
                                query.callback( {
                                    results: data.map( function( employee ) {
                                        return self.personToSelect2Object( employee );
                                    } )
                                } );
                            }
                        ).fail( function() {
                            query.callback( {
                                results: []
                            } );
                        } );
                    }
                }
            };
        },
        initParticipantSelect2: function ConferenceAppointmentModel_initParticipantSelect2() {
            var
                self = this;
            self.selectedParticipants = ko.observableArray();
            self.addDisposable( ko.computed( function() {
                var
                    _participants = unwrap( self.participants );
                self.selectedParticipants( _participants.map( function( item ) {
                    var
                        email = peek( item.email );
                    return { id: email, text: email };
                } ) );
            } ) );
            self.participantAutocomplete = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            selectedParticipants = unwrap( self.selectedParticipants );
                        return selectedParticipants;
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.selectedParticipants.push( $event.added );
                            self.participants.push( {
                                email: $event.added.id
                            } );
                        }
                        if( $event.removed ) {
                            self.selectedParticipants.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                            self.participants.remove( function( obj ) {
                                return peek( obj.email ) === $event.removed.id;
                            } );
                        }

                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    multiple: true,
                    placeholder: I18N_PLACEHOLDER_PLEASE_CHOOSE,
                    query: function( query ) {
                        query.callback( {
                            results: []
                        } );
                    },
                    createSearchChoice: function( term ) {
                        if( Y.doccirrus.validations.common._email( term ) ) {
                            return {
                                id: term,
                                text: term
                            };
                        } else {
                            return null;
                        }

                    }
                }
            };
        },
        save: function ConferenceAppointmentModel_save() {
            var
                self = this,
                data = self.toJSON(),
                dataToSave,
                conferenceFields = Object.keys( Y.doccirrus.schemas.conference.schema ),
                scheduleFields = Object.keys( Y.doccirrus.schemas.schedule.schema );

            function fieldReducer( obj, field ) {
                if( 'undefined' !== typeof data[ field ] ) {
                    obj[ field ] = data[ field ];
                }
                return obj;
            }

            dataToSave = {
                conference: conferenceFields.reduce( fieldReducer, {} ),
                schedule: scheduleFields.reduce( fieldReducer, {} )
            };

            if( self.isNew() ) {
                return Promise.resolve( Y.doccirrus.jsonrpc.api.conference.createOnlineConference( {
                    data: dataToSave
                } ) );
            } else {
                dataToSave.schedule._id = data._id;
                dataToSave.conference._id = dataToSave.schedule.conferenceId;
                return Promise.resolve( Y.doccirrus.jsonrpc.api.conference.updateOnlineConference( {
                    data: dataToSave
                } ) );

            }
        },
        remove: function ConferenceAppointmentModel_save() {
            var
                self = this,
                conferenceId = peek( self.conferenceId );
            return Promise.resolve( Y.doccirrus.jsonrpc.api.conference.delete( { query: { _id: conferenceId } } ) );
        }
    }, {
        schemaName: 'v_conferenceAppointment',
        NAME: 'ConferenceAppointmentModel',
        ATTRS: {
            validatable: {
                value: true,
                lazyAdd: false
            },
            severityColorMap: {
                value: [],
                lazyAdd: false
            },
            multiplePatientSelector: {
                value: false,
                lazyAdd: false
            },
            sources: {
                value: [],
                cloneDefaultValue: true,
                lazyAdd: false
            },
            scheduletypes: {
                value: [],
                cloneDefaultValue: true,
                lazyAdd: false
            },
            userSetDuration: {
                value: false,
                lazyAdd: false
            },
            findAppointment: {
                value: false,
                lazyAdd: false
            },
            employees: {
                value: [],
                lazyAdd: false
            },
            patients: {
                value: [],
                lazyAdd: false
            },
            userEmployee: {
                value: null,
                lazyAdd: false
            }
        }
    } );
    KoViewModel.registerConstructor( ConferenceAppointmentModel );

}, '3.16.0', {
    lang: [ 'de', 'en' ],
    requires: [
        'oop',
        'ko-bindingHandlers',
        'v_conferenceAppointment-schema',
        'RepetitionKoViewModel',
        'KoViewModel'
    ]
} );
