/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, jQuery, ko, moment, _ */

YUI.add( 'RepetitionKoViewModel', function( Y/*, NAME*/ ) {
    /**
     * @module RepetitionKoViewModel
     */

    var
        i18n = Y.doccirrus.i18n,
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        KoViewModel = Y.doccirrus.KoViewModel,
        ABORTED = new Error( 'Request aborted' ), // TODO: need centralized Error for that
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        // TODO: Complete Translations (couldn't find the other strings in the app)
        I18N_PLACEHOLDER_PLEASE_CHOOSE = i18n( 'RepetitionKoViewModel_clientJS.placeholder.PLEASE_SELECT' ),
        I18N_CHOOSE_CALENDER = i18n( 'RepetitionKoViewModel_clientJS.label.SELECT_CALENDAR' ),
        I18N_PRACTICE_NO_UNKNOWN = 'Praxis ID ist unbekannt',
        I18N_AVAILABILITY_NONE = 'Keine Verfügbarkeit',
        I18N_AVAILABILITY_NOW = 'sofort',
        I18N_AVAILABILITY_ENDED = 'Termin beendet',
        I18N_AVAILABILITY_RUNNING = 'Termin läuft',
        I18N_AVAILABILITY_MIN_POSTFIX = 'min',
        I18N_PATIENT_LINK_TITLE = 'Zur Patienten Akte springen',
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
        PATIENT_NO_LBL = i18n( 'CalendarMojit.tab_graphic-waiting-list.label.PATIENT_NO' ),
        DEFAULT_DURATION = Y.doccirrus.schemas.scheduletype.getDefaultDuration();

    /**
     * @beta
     * @class RepetitionKoViewModel
     * @constructor
     * @extends KoViewModel
     * @main
     * @param {Object} config
     */
    function RepetitionKoViewModel( config ) {
        RepetitionKoViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( RepetitionKoViewModel, KoViewModel.getBase(), {
        initializer: function RepetitionKoViewModel_initializer() {
            var
                self = this;

            // an observable to determine that data is rendered
            self.bindingsApplied = ko.observable( false );

            self.isFindAppointment = ko.observable( self.get( 'findAppointment' ) );
            self.isRequireResource = ko.observable( false );
            self.resourceItem = ko.observable( 'resourceItem' );

            self.initialScheduleType = peek( self.scheduletype );
            self.initialGroupCapacity = peek( self.capacityOfGroup );

            self.isNoShow = ko.observable( Y.doccirrus.schemas.calendar.SCH_NOSHOW === peek( self.scheduled ) );
            self.isNoShowVisible = ko.observable( Y.doccirrus.schemas.calendar.SCH_NOSHOW === peek( self.scheduled ) );

            self.initListsNotInSchema();
            self._initAppointmentListTable();
            self.initCalendar();
            self.initPatient();
            self.initSelectSeverity();
            if( self.isAdHoc() ) {
                self.initAdHoc();
            }
            self.initRepetition();
        },
        destructor: function RepetitionKoViewModel_destructor() {
        },
        /**
         * overwritten default KoViewModel.isNew method to take 'scheduleId' into account
         * determines if this model is considered a new model - not has an id (uses set idProperty)
         * @return {boolean}
         */
        isNew: function RepetitionKoViewModel_isNew() {
            var
                self = this,
                id = Boolean( ko.unwrap( self[self.idProperty] ) ),
                scheduleId = Boolean( ko.unwrap( self.scheduleId ) ),
                hasId = scheduleId || id;

            return !hasId;
        },

        appointmentListTable: null,
        /** @protected */
        _initAppointmentListTable: function AppointementListViewModel__initAppointementListTable() {
            var
                self = this;

            self.appointmentListTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-intime-table',
                    stateId: 'CalendarMojit-CalendarMojitBinderIndex-calledListTable',
                    states: ['limit', 'usageConfigurationValue'],
                    fillRowsToLimit: false,
                    renderFooter: false,
                    rowPopover: false,
                    data: [],
                    columns: [
                        {
                            forPropertyName: 'eta',
                            label: i18n( 'CalendarMojit.tab_calendar.appointmentListTable.DATE' ),
                            title: i18n( 'CalendarMojit.tab_calendar.appointmentListTable.DATE' ),
                            width: '40%',
                            isSortable: true,
                            filterBy: function( row ) {
                                var value = this.filterField.value();
                                return moment( row.eta ).format( 'HH:mm' ).indexOf( value ) > -1;
                            },
                            renderer: function( meta ) {
                                return moment( meta.value ).format( 'D.M.YYYY HH:mm' );
                            }
                        },
                        {
                            forPropertyName: 'title',
                            label: i18n( 'CalendarMojit.tab_calendar.appointmentListTable.APPOINTMENT' ),
                            title: i18n( 'CalendarMojit.tab_calendar.appointmentListTable.APPOINTMENT' ),
                            width: '50%',
                            isSortable: true,
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return Y.Escape.html( meta.value );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            componentType: 'KoTableColumnRenderer',
                            forPropertyName: 'KoTableColumnRenderer',
                            width: '5%',
                            renderer: function( /*meta*/ ) {
                                return '<span class="fa fa-trash"></span>';
                            },
                            onCellClick: function( meta/*, event*/ ) {
                                var row = meta.row;
                                Y.doccirrus.jsonrpc.api.calevent.delete( {
                                    query: { _id: row._id },
                                    data: { eventType: "plan" }
                                } )
                                    .always( function() {
                                        self._initPatientSchedule( row.patient );
                                    } );
                            }
                        }
                    ]

                }
            } );
        },
        initListsNotInSchema: function RepetitionKoViewModel_initListsNotInSchema() {
            var
                calendarList,
                self = this,
                binder = Y.doccirrus.utils.getMojitBinderByType( 'CalendarMojit' ),
                binderViewModel = binder.binderViewModel;

            if( self.calendar ) {
                self.calendar.list = [].concat( self.get( 'sources' ) );

                // for number appointment only doctor calendars
                if( self.isAdHoc() || self.isFindAppointment() ) {
                    self.calendar.list = Y.Array.filter( self.calendar.list, function( calendar ) {
                        return Y.doccirrus.schemas.calendar.isDoctorCalendar( calendar._id );
                    } );
                }

                // sort in alphabetical order
                self.calendar.list.sort( function( a, b ) {
                    return a.name.localeCompare( b.name );
                } );

                // if there is only one doctors calendar
                // select it automatically.
                calendarList = Y.Array.filter( self.calendar.list, function( calendar ) {
                    return Y.doccirrus.schemas.calendar.isDoctorCalendar( calendar._id );
                } );

                if( !self.get( 'data.calendar' ) && calendarList && 1 === calendarList.length ) {
                    // do the selection
                    self.calendar( calendarList[0]._id );
                }
            }

            if( self.scheduletype ) {
                // computed for available scheduletypes
                self.scheduletype.list = ko.computed( function() {
                    var
                        calendar = self.calendar(),
                        closeTime = self.closeTime(),
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

                    if( Y.doccirrus.schemas.calendar.isResourceCalendar( calendar ) ) {
                        scheduleTypes = Y.doccirrus.schemas.calendar.filterScheduletypesForResourceCalendar( scheduleTypes );
                    } else {
                        scheduleTypes = Y.doccirrus.schemas.calendar.filterScheduletypesForCalendar( scheduleTypes, calendar );
                    }

                    if( (!startTime || !endTime) && !self.isFindAppointment() ) {
                        return (self.scheduletype.list && peek( self.scheduletype.list )) || scheduleTypes;
                    }


                    if( closeTime ) {
                        return [];
                    }

                    if( consultTimesOfCalendar && consultTimesOfCalendar.length && !self.isFindAppointment() ) {
                        // check if there are some consultTime for desired day of week
                        consultTimesOfDesiredDay = consultTimesOfCalendar.filter( function( time ) {
                            if( time.datesForRepetition ) {
                                // means that there is repetitionSettings for that consult time in calendar so
                                // we should check if our desired start time is in same day and have bigger time value
                                // then at least one item from datesForRepetition
                                return time.datesForRepetition.some( function( date ) {
                                    return moment( date ).isSame( startTime, 'day' ) &&
                                           moment( startTime ).isSameOrAfter( date );
                                } );
                            }
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
            }
        },
        /**
         * @property scheduletypeEnabled
         * @type {ko.computed}
         */
        scheduletypeEnabled: null,
        /**
         * @property allDayEnabled
         * @type {ko.computed}
         */
        allDayEnabled: null,
        /**
         * @property durationEnabled
         * @type {ko.computed}
         */
        durationEnabled: null,
        /**
         * @property startEnabled
         * @type {ko.computed}
         */
        startEnabled: null,
        /**
         * @property endEnabled
         * @type {ko.computed}
         */
        endEnabled: null,
        /**
         * @property isResourceCalendar
         * @type {ko.computed}
         */
        isResourceCalendar: null,
        /**
         * @property isDoctorCalendar
         * @type {ko.computed}
         */
        isDoctorCalendar: null,
        /**
         * @property isGroupMaster
         * @type function {ko.observable}
         */
        isGroupMaster: ko.observable( false ),
        /**
         * initializes common appointment handling
         */

        /**
         * @property isSearchingAppointment
         * @type function {ko.observable}
         */
        isSearchingAppointment: ko.observable( false ),

        /**
         * @property findStartDate
         * @type function {ko.observable}
         */
        findStartDate: null,

        /**
         * @property isFindStartDateEnabled
         * @type function {ko.pureComputed}
         */
        isFindStartDateEnabled: null,

        /**
         * @property isFindStartDateEnabled
         * @type function {ko.observableArray}
         */
        findAppointmentAvailableDates: null,

        /**
         * @property resourceCalendarsToBook
         * @type function {ko.observableArray}
         */
        resourceCalendarsToBook: null,
        /**
         * @property requiredResources
         * @type function {ko.observableArray}
         */
        requiredResources: null,
        /**
         * @property scheduleTypeResources
         * @type function {ko.observableArray}
         */
        scheduleTypeResources: null,
        /**
         * markup for requiredResources from scheduleType or empty String
         * @property requiredResourcesLink
         * @type {ko.computed|String}
         */
        requiredResourcesLink: null,
        /**
         * Format start date for find appointment input
         * @property isFindStartDateEnabled
         * @type function {ko.pureComputed}
         */
        startFormatted: null,

        /**
         *  @method handleSearchAppointment
         */
        handleSearchAppointment: function RepetitionKoViewModel_handleSearchAppointment() {

            var
                self = this,
                startDate = ko.unwrap( self.findStartDate ),
                startDateStarOfDay = moment( startDate ).startOf( 'day' ),
                source = self.getCurrentSource( peek( self.calendar ) ),
                scheduletype = self.scheduletype(),
                isPreconfigured = false,
                resourceSlotSearch = false,
                scheduletypeList = self.scheduletype.list(),
                scheduletypeMeta = Y.Array.find( scheduletypeList, function( listItem ) {
                    return scheduletype === listItem._id;
                } ),
                apiName = 'calculateSchedule';
            if( source && source.mirrorCalendarId ) {
                apiName = 'calculatePartnerSchedule';
            }
            self.start( '' );
            self.findAppointmentAvailableDates.removeAll();
            self.resourceCalendarsToBook.removeAll();
            self.requiredResources.removeAll();

            if( startDateStarOfDay.isAfter( moment().startOf( 'day' ) ) ) {
                startDate = startDateStarOfDay.toISOString();
            }

            self.isSearchingAppointment( true );

            if( scheduletypeMeta && scheduletypeMeta.isPreconfigured && !self.adhoc() ) {
                isPreconfigured = true;
            }
            if( scheduletypeMeta && scheduletypeMeta.requiredResources && scheduletypeMeta.requiredResources.length ) {
                self.requiredResources( JSON.parse( JSON.stringify( scheduletypeMeta.requiredResources.map( function( item ) {
                    return item.resourceType;
                } ) ) ) );
                resourceSlotSearch = true;
            }

            Y.doccirrus.jsonrpc.api.calevent[apiName]( {
                data: {
                    action: 'calculateschedule',
                    subaction: 'NEXT',
                    calendar: self.calendar(),
                    scheduleType: scheduletype,
                    patientId: self.patient(),
                    isRandomMode: source && source.isRandomMode,
                    mirrorCalendarId: source && source.mirrorCalendarId,
                    n: 5,
                    isPreconfigured: isPreconfigured,
                    resourceSlotSearch: resourceSlotSearch,
                    duration: self.duration(),
                    start: startDate,
                    sparse: '1'
                }
            } ).done( function( response ) {
                var
                    data = response.data,
                    firstDate;
                self.isSearchingAppointment( false );
                if( data && data.length ) {
                    if( data[ 0 ].code ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: Y.doccirrus.errorTable.getMessage( { code: data[ 0 ].code } )
                        } );
                    } else {
                        data = _.sortBy( data, 'start' );
                        firstDate = data.shift();
                        self.start( moment( firstDate.start ).toISOString() );
                        self.resourceCalendarsToBook( firstDate.calendars || [] );
                        self.findAppointmentAvailableDates( data.map( function( d ) {
                            return { start: moment( d.start ), calendars: d.calendars };
                        } ) );
                    }
                } else {
                    self.findAppointmentAvailableDates.removeAll();
                    self.resourceCalendarsToBook.removeAll();
                    self.requiredResources.removeAll();
                }
            } ).fail( function( err ) {
                Y.log( 'Error when searching for the appointments ' + err, 'error' );
                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: Y.doccirrus.errorTable.getMessage( { code: err.code, data: err.data } )
                } );
                self.isSearchingAppointment( false );
                self.findAppointmentAvailableDates.removeAll();
                self.resourceCalendarsToBook.removeAll();
                self.requiredResources.removeAll();
            } );
        },

        /**
         *  @method setFoundAppointment
         *  @param {Object} event
         *  @param {Date} date
         *  @returns {Date}
         */
        setFoundAppointment: function RepetitionKoViewModel_setFoundAppointment( event, date ) {
            this.resourceCalendarsToBook( date.calendars || [] );
            return this.start( moment( date.start ).toISOString() );
        },
        /**
         * Handler for 'Termin erstellen' button click
         * It creates a new slot appointment from group master as a template
         * - if patient is in the cache - use it and create appointment immediatly
         * - if no patient - open a new appointment modal to choose a patient
         *
         * @method createSlot
         *
         */
        createSlot: function() {
            var
                binder = Y.doccirrus.utils.getMojitBinderByType( 'CalendarMojit' ),
                binderViewModel = binder.binderViewModel,
                self = this,
                data = self.toJSON(),
                preselectedPatient = Y.doccirrus.utils.sessionValueGet( 'loadEvent' ) && JSON.parse( Y.doccirrus.utils.sessionValueGet( 'loadEvent' ) ).patientId,
                slot = JSON.parse( JSON.stringify( data ) ),
                capacity = slot.capacityOfGroup;

            if( slot.start ) {
                if( 0 >= capacity ) {
                    return Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        message: i18n( 'CalendarMojit.template_appointment.label.NO_CAPACITY_IN_GROUP' ),
                        window: {
                            width: 'small',
                            buttons: {
                                header: [
                                    Y.doccirrus.DCWindow.getButton( 'close', {
                                        disabled: false,
                                        action: function() {
                                            this.close();
                                            jQuery( "button[name='close']" ).click();
                                        }
                                    } )],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        disabled: false,
                                        action: function() {
                                            this.close();
                                            jQuery( "button[name='close']" ).click();
                                        }
                                    } )
                                ]
                            }
                        }
                    } );
                }
                slot.groupId = data._id;
                delete slot._id;
                delete slot.title;
                delete slot.linkSeries;
                slot.repetition = 'NONE';
                slot.byweekday = [];
                slot.group = null;
                slot.capacityOfGroup = null;
                if( preselectedPatient ) {
                    slot.patient = preselectedPatient;
                    jQuery( "button[name='CANCEL']" ).click();
                    return Y.doccirrus.jsonrpc.api
                        .calevent.create( {
                            data: slot
                        } ).done( function( createAppointmentResponse ) {
                            var
                                createAppointmentWarnings = Y.doccirrus.errorTable.getWarningsFromResponse( createAppointmentResponse );
                            if( createAppointmentWarnings.length ) {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'info',
                                    message: Y.doccirrus.errorTable.getMessage( {code: createAppointmentWarnings[0].config.code} ),
                                    window: {
                                        width: 'small',
                                        buttons: {
                                            header: ['close'],
                                            footer: [
                                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                                    isDefault: true,
                                                    disabled: false,
                                                    action: function() {
                                                        this.close();
                                                        jQuery( "button[name='close']" ).click();
                                                    }
                                                } )
                                            ]
                                        }
                                    }
                                } );
                            } else {
                                return;
                            }
                        } ).fail( function( response ) {
                            var
                                errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                            if( errors.length ) {
                                _.invoke( errors, 'display' );
                            }
                        } );
                } else {
                    binderViewModel.showAppointmentDialog( slot, {appointmentType: 'STANDARD'} );
                    jQuery( "button[name='close']" ).click();
                }
            } else {
                return;
            }
        },
        getCurrentSource: function( calendar ){
            var
                self = this,
                sources = self.get( 'sources' ),
                source = _.find( sources, { _id: calendar } );
            return source;
        },
        initCalendar: function RepetitionKoViewModel_initCalendar() {
            var
                self = this,
                isNew = self.isNew();

            self.addDisposable( ko.computed( function() {
                var
                    calendar = unwrap( self.calendar ),
                    findAppointment = self.get( 'findAppointment' ),
                    source = self.getCurrentSource( calendar );
                self.isFindAppointment( findAppointment || source && source.mirrorCalendarId );

            } ) );
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

            self.dtstartDatepickerOptions = {
                format: TIMESTAMP_FORMAT,
                sideBySide: true,
                widgetPositioning: {
                    horizontal: 'right',
                    vertical: 'top'
                }
            };

            self.untilDatepickerOptions = {
                format: TIMESTAMP_FORMAT,
                sideBySide: true,
                widgetPositioning: {
                    horizontal: 'right',
                    vertical: 'top'
                },
                maxDate: self.addDisposable( ko.computed(function () {
                    if ( 'DAILY' === self.repetition() ) {
                        return moment( self.dtstart() ).add( Y.doccirrus.schemas.calendar.MAX_SERIES_SCHEDULES, 'day' );
                    } else if ( 'WEEKLY' === self.repetition() ) {
                        return moment( self.dtstart() ).add( 52, 'weeks' );
                    }
                } ) )
            };

            self.findStartDate = ko.observable( moment().toISOString() );

            self.isFindStartDateEnabled = ko.pureComputed( function() {
                return ko.unwrap( this.findStartDate ) && !ko.unwrap( this.isSearchingAppointment ) && ko.unwrap( this.calendar );
            }, this );

            self.formatDateWithDay = RepetitionKoViewModel.formatDateWithDay;

            self.startFormatted = ko.pureComputed( function() {
                var startDate = ko.unwrap( this.start );
                return startDate && this.formatDateWithDay( startDate );
            }, this );

            self.findAppointmentAvailableDates = ko.observableArray();
            self.resourceCalendarsToBook = ko.observableArray( [] );
            self.requiredResources = ko.observableArray();
            self.scheduleTypeResources = ko.observableArray( [] );

            self.requiredResourcesLink = ko.computed( function() {
                var
                    resources = unwrap( self.scheduleTypeResources ) || [],
                    resourcesString = resources.map( function( resource ) {
                        return resource.resourceType;
                    } ).join( ', ' );

                if( resources && resources[0] ) {
                    return Y.Lang.sub( '<a>{text}</a>', {
                        text: resourcesString
                    } );
                } else {
                    return '';
                }
            } );

            self.addDisposable( ko.computed( function() {
                var
                    duration = unwrap ( self.duration );
                self.plannedDuration( duration );
            } ) );

            // computed for enabling 'scheduletype' select
            self.scheduletypeEnabled = ko.computed( function() {
                return Boolean( self.calendar() );
            } );

            // computed for isResourceCalendar
            self.isResourceCalendar = ko.computed( function() {
                var
                    calendar = self.calendar();
                if( calendar ) {
                    return Y.doccirrus.schemas.calendar.isResourceCalendar( calendar );
                }
                return false;
            } );

            // computed for isDoctorCalendar
            self.isDoctorCalendar = ko.computed( function() {
                var
                    calendar = self.calendar();
                if( calendar ) {
                    return Y.doccirrus.schemas.calendar.isDoctorCalendar( calendar );
                }
                return false;
            } );
            // computed for default duration
            // - default duration is DEFAULT_DURATION
            // - for Infokalender it's the default
            // - for scheduletype extract from saved value
            self.addDisposable( ko.computed( function() {
                var
                    scheduletypeEnabled = self.scheduletypeEnabled(),
                    allDay = self.allDay(),
                    scheduletype = self.scheduletype(),
                    calendar = self.calendar(),
                    scheduletypeList = peek( self.scheduletype.list ),
                    isDoctorCalendar = Y.doccirrus.schemas.calendar.isDoctorCalendar( calendar ),
                    isResourceCalendar = Y.doccirrus.schemas.calendar.isResourceCalendar( calendar ),
                    scheduletypeMeta = Y.Array.find( scheduletypeList, function( listItem ) {
                        return scheduletype === listItem._id;
                    } ),
                    scheduleTypeChanged = scheduletype !== self.initialScheduleType,
                    bindingsApplied = self.bindingsApplied.peek();

                if( !calendar || !scheduletypeEnabled ) {
                    return;
                }

                if( !isNew && !bindingsApplied ) {
                    return;
                }

                if( !self.get( 'userSetDuration' ) && !allDay ) {
                    if( !isDoctorCalendar && !isResourceCalendar ) {
                        self.duration( DEFAULT_DURATION );

                    } else if( scheduletypeMeta ) {
                        self.duration( scheduletypeMeta.duration );
                    }
                }

                // TODO: [Task] MOJ-4585: viewmodel handling of "group" & "capacityOfGroup" to be handled backend-side
                if( self.groupId() ) {
                    //if it is group member - capacity and group always null
                    self.group( null );
                    self.capacityOfGroup( null );
                    self.isGroupMaster( false );
                } else if( scheduletypeMeta && scheduletypeMeta.isPreconfigured
                           && Y.doccirrus.schemas.scheduletype.appointmentTypes.STANDARD === scheduletypeMeta.type
                           && !self.adhoc()
                           && !self.isFindAppointment() ) {
                    // if it should be a group master
                    if( scheduleTypeChanged ) {
                        self.capacityOfGroup( scheduletypeMeta.capacity );
                    } else {
                        self.capacityOfGroup( self.initialGroupCapacity || scheduletypeMeta.capacity );
                    }
                    self.group( true );
                    self.isGroupMaster( true );

                } else { // then just clean up
                    self.group( null );
                    self.capacityOfGroup( null );
                    self.isGroupMaster( false );
                }
            } ) );

            self.addDisposable( ko.computed( function() {
                var
                    scheduleType = unwrap( self.scheduletype ),
                    scheduletypeList = peek( self.scheduletype.list ),
                    scheduletypeMeta = scheduletypeList.find( function( listItem ) {
                        return scheduleType === listItem._id;
                    } );
                if( scheduletypeMeta && scheduletypeMeta.requiredResources && scheduletypeMeta.requiredResources[0] && !self.isAdHoc() ) {
                    self.isRequireResource( true );
                    self.scheduleTypeResources( scheduletypeMeta.requiredResources );
                    self.requiredResources( JSON.parse( JSON.stringify( scheduletypeMeta.requiredResources.map( function( item ) {
                        return item.resourceType;
                    } ) ) ) );
                } else {
                    self.isRequireResource( false );
                    self.scheduleTypeResources( [] );
                    self.requiredResources.removeAll();
                }
            } ) );

            // enable 'allDay' checkbox
            self.allDayEnabled = ko.computed( function() {
                var
                    calendar = self.calendar(),
                    closeTime = self.closeTime(),
                    isDoctorCalendar = self.isDoctorCalendar(),
                    isResourceCalendar = self.isResourceCalendar(),
                    enabled = Boolean( calendar ) && ( !(isDoctorCalendar || isResourceCalendar) || closeTime );

                return enabled;
            } );

            // computed for allDay
            self.addDisposable( ko.computed( function() {
                var
                    allDayEnabled = self.allDayEnabled();
                if( !self.isAdHoc() && !allDayEnabled ) {
                    // check that allday is unset
                    self.allDay( false );
                }
            } ) );

            self.addDisposable( ko.computed( function() {
                var
                    allDay = self.allDay(),
                    start = self.start();

                if( allDay ) {
                    self.startDatetimepickerOptions.format( TIMESTAMP_FORMAT );
                }
                else {
                    self.startDatetimepickerOptions.format( TIMESTAMP_FORMAT_LONG );
                }

                if( allDay && start ) {
                    self.start(
                        moment( start )
                            .second( 0 )
                            .millisecond( 0 )
                            .hour( 0 )
                            .minute( 0 )
                            .toISOString()
                    );
                }

            } ).extend( {
                rateLimit: 0
            } ) );

            // enable 'duration' and reset
            self.durationEnabled = ko.computed( function() {
                var
                    enabled = !self.allDay();

                if( !enabled ) {
                    self.duration( undefined );
                } else {
                    self.duration( self.get( 'data.duration' ) );
                }

                return enabled;
            } );

            // enable 'start' and reset
            self.startEnabled = ko.computed( function() {
                var
                    enabled = true;

                if( !enabled ) {
                    self.start( null );
                }

                return enabled;
            } );

            // enable 'end' and reset
            self.endEnabled = ko.computed( function() {
                var
                    enabled = !self.allDay();

                if( !enabled ) {
                    self.end( null );
                }

                return enabled;
            } );

            // If start time is changed, then the end time must automatically be updated to start + duration
            self.addDisposable( ko.computed( function() {
                var
                    start = self.start(),
                    duration = parseInt( self.duration.peek(), 10 ),
                    end = self.end.peek(),
                    isDoctorCalendar = self.isDoctorCalendar(),
                    isResourceCalendar = self.isResourceCalendar(),
                    value;

                if( !isNaN( duration ) && start ) {
                    value = moment( start ).add( duration, 'minutes' ).toISOString();
                    if( !isDoctorCalendar && !isResourceCalendar ) {
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
                    duration = parseInt( self.duration(), 10 ),
                    start = self.start.peek(),
                    value;

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
                    end = self.end(),
                    duration = parseInt( self.duration.peek(), 10 ),
                    start = self.start.peek(),
                    isDoctorCalendar = self.isDoctorCalendar(),
                    isResourceCalendar = self.isResourceCalendar(),
                    value;

                // we can't change end value from findAppointment modal directly so
                // don't need to change start value
                if( self.isFindAppointment() ) {
                    return;
                }

                if( !isNaN( duration ) && end ) {
                    value = moment( end ).subtract( duration, 'minutes' ).toISOString();
                    if( !isDoctorCalendar && !isResourceCalendar ) {
                        self.duration( moment( end ).diff( start, 'minutes' ) );
                    } else {
                        self.start( value );
                    }
                }
            } ).extend( {
                rateLimit: 1000
            } ) );

            // restore dates when not allDay
            self.addDisposable( ko.computed( function() {
                var
                    start;

                if( !self.isAdHoc() && !self.allDay() ) {
                    start = self.get( 'data.start' );
                    if( start ) {
                        self.start( start );
                        self.calendar.valueHasMutated();
                        self.scheduletype.valueHasMutated();
                    }
                }
            } ) );

            /**
             * validate those dependencies
             */
            self.addDisposable( ko.computed( function() {
                self.allDay();
                self.duration.validate();
            } ).extend( { rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT } ) );
            /**
             * validate those dependencies
             */
            self.addDisposable( ko.computed( function() {
                self.calendar();
                self.userDescr.validate();
            } ).extend( { rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT } ) );

            self.labelFromDayI18n = i18n( 'CalendarMojit.template_appointment.label.FROM_DAY' );
            self.searchForAppointmentI18n = i18n( 'CalendarMojit.calendar.button.SEARCH_FOR_APPOINTMENT' );
            self.suggestedAppointmentI18n = i18n( 'CalendarMojit.template_appointment.label.SUGGESTED_APPOINTMENTS' );
            self.labelDurationI18n = i18n( 'CalendarMojit.template_appointment.label.DURATION' );
            self.labelIntervalOnI18n = i18n( 'CalendarMojit.template_appointment.label.INTERVAL_ON' );
            self.labelIntervalEveryI18n = i18n( 'CalendarMojit.template_appointment.label.INTERVAL_EVERY' );
            self.labelIntervalDayI18n = i18n( 'CalendarMojit.template_appointment.label.INTERVAL_DAY' );
            self.labelCAI18n = i18n( 'CalendarMojit.template_appointment.label.CA' );
            self.labelPracticeIDI18n = i18n( 'CalendarMojit.template_appointment.label.PRACTICE_ID' );
            self.labelGroupMasterHintI18n = i18n( 'CalendarMojit.template_appointment.label.GROUP_MASTER_HINT' );
            self.createSlotI18n = i18n( 'CalendarMojit.template_appointment.button.CREATE_SLOT' );
            self.resourcesI18n = i18n( 'calendar-schema.Calendar_T.resources' );
            self.noShowi18n = i18n( 'CalendarMojit.template_appointment.label.NO_SHOW' );

        },
        /**
         * Handler of user set the duration manually
         * @method onDurationChangeByUser
         * @param {RepetitionKoViewModel} model
         * @param {jQuery.Event} $event
         */
        onDurationChangeByUser: function( model, $event ) {
            var
                self = this,
                input = $event.target;

            if( input.value && /^\d+$/.test( input.value ) ) {
                self.set( 'userSetDuration', true );
            }

        },
        /**
         * observable to determine availability of patient field
         * @property showPatient
         * @type {ko.observable|Boolean}
         */
        showPatient: null,
        /**
         * equivalent of 'patient', but populated
         * @property patientPopulated
         * @type {ko.computed|Object|null}
         */
        patientPopulated: null,
        /**
         * patient select2 auto complete configuration
         * @property patientAutocomplete
         * @type {object}
         */
        patientAutocomplete: null,
        /**
         * markup for selected patient to navigate to or empty String
         * @property patientLink
         * @type {ko.computed|String}
         */
        patientLink: null,

        _initPatientSchedule: function( patient ) {

            var self = this,
                ind,
                now = Date().toISOString(),
                end = moment( now ).add( 'years', 3 );

            Y.doccirrus.jsonrpc.api.calevent.read( {
                dateFrom: now,
                dateTo: end,
                patient: peek( patient )
            } )
                .then( function( res ) {
                    if( self.initialConfig.data._id ) {
                        ind = res.data.map( function( elem ) {
                            return elem._id;
                        } ).indexOf( self.initialConfig.data._id );
                        res.data.splice( ind, 1 );
                    }
                    self.appointmentListTable.data( res && res.data || null );
                } );
        },

        initSelectSeverity: function RepetitionKoViewModel_initSelectSeverity() {
            var
                self = this;
            RepetitionKoViewModel.injectSelectSeverity( self );
        },

        /**
         * initializes patient handling
         */
        initPatient: function RepetitionKoViewModel_initPatient() {
            var
                self = this,
                initialConfig = self.initialConfig,
                select2FocusWorkaround = initialConfig.select2FocusWorkaround,
                select2BlurWorkaround = initialConfig.select2BlurWorkaround,
                _buildSelect2ItemFromPatient = Y.bind( self._buildSelect2ItemFromPatient, self );

            self.showPatient = ko.observable( self.get( 'showPatient' ) );

            self.patientPopulated = KoViewModel.utils.createAsync( {
                cache: self,
                initialValue: null,
                jsonrpc: {
                    fn: Y.doccirrus.jsonrpc.api.patient.read,
                    params: self.addDisposable( ko.computed( function() {
                        var patientId = self.patient();
                        if( patientId ) {
                            return { query: { _id: patientId } };
                        } else {
                            return null;
                        }
                    }, self ) )
                },
                converter: function( data ) {
                    if( Y.Object.owns( data, 'data' ) && Y.Lang.isArray( data.data ) && data.data.length ) {
                        return data.data[0];
                    }
                    return null;
                }
            } );

            self.patientAutocomplete = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var patientPopulated = self.patientPopulated();
                        if( patientPopulated ) {
                            self._initPatientSchedule( patientPopulated._id );
                            return _buildSelect2ItemFromPatient( patientPopulated );
                        } else {
                            return null;
                        }
                    },
                    write: function( $event ) {
                        var value = $event.val;
                        self.patient( value );
                        if( !value ) {
                            self.patientPopulated( null );
                        }

                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: I18N_PLACEHOLDER_PLEASE_CHOOSE,
                    minimumInputLength: 1,
                    query: function( query ) {
                        // abort pending requests
                        if( self.patientAutocomplete.pending ) {
                            self.patientAutocomplete.pending.abort();
                        }
                        // build pending request
                        var pending = self.patientAutocomplete.pending = jQuery.ajax( {
                            type: 'GET',
                            xhrFields: { withCredentials: true },
                            url: Y.doccirrus.infras.getPrivateURL( '/r/calendar/?' ) + Y.QueryString.stringify( {
                                action: 'getPatients',
                                qe: Y.doccirrus.commonutils.$regexLikeUmlaut( query.term, { onlyRegExp: true } ),
                                isStub: {$ne: true}
                            } )
                        } );
                        // handle select2 query.callback
                        pending.done( function( data ) {
                            data = data || [];

                            query.callback( { results: data.map( _buildSelect2ItemFromPatient ) } );
                        } );
                        // complete pending request
                        pending.always( function() {
                            delete self.patientAutocomplete.pending;
                        } );
                    }
                },
                // bind further select2 functionality to this model
                init: function( element ) {
                    var $select2 = jQuery( element ).data( 'select2' ),
                        $eventElement = $select2.opts.element;
                    // @see RepetitionKoViewModel.select2FocusWorkaround
                    $eventElement.on( 'select2-focus', Y.bind( select2FocusWorkaround || self.select2FocusWorkaround, self ) );
                    $eventElement.on( 'select2-blur', Y.bind( select2BlurWorkaround || self.select2BlurWorkaround, self ) );
                }
            };

            self.patientLink = ko.computed( function() {
                var
                    patient = self.patientPopulated(),
                    patientString;

                if( patient ) {
                    patientString = Y.Escape.html( self._buildPatientLabelFromPatient( patient ) );
                    return Y.Lang.sub( '<a href="{href}" class="patient-linkToCase" title="{title}" target="_blank">{text}</a>', {
                        title: I18N_PATIENT_LINK_TITLE,
                        text: patientString,
                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + patient._id + '/tab/casefile_browser'
                    } );
                } else {
                    return '';
                }
            } );
        },
        /**
         * builds a select2 config object from a patient object
         * @method _buildSelect2ItemFromPatient
         * @param {object} patient
         * @return {object}
         * @protected
         */
        _buildSelect2ItemFromPatient: function RepetitionKoViewModel__buildSelect2ItemFromPatient( patient ) {
            var
                self = this;

            return { id: patient._id, text: self._buildPatientLabelFromPatient( patient ) };
        },
        /**
         * builds a label from a patient object
         * @method _buildSelect2ItemFromPatient
         * @param {object} patient
         * @return {object}
         * @protected
         */
        _buildPatientLabelFromPatient: function RepetitionKoViewModel__buildPatientLabelFromPatient( patient ) {

            return Y.doccirrus.schemas.person.personDisplay( patient ) + ' [' + patient.kbvDob + '] ' + PATIENT_NO_LBL +  ':' + patient.patientNo;
        },
        /**
         * initializes ad hoc handling
         */
        initAdHoc: function RepetitionKoViewModel_initAdHoc() {
            var self = this,
                getAvailabilityDescription = self.getAvailabilityDescription;

            /**
             * @property practiceNo computed for adhoc info
             * @type {ko.observable}
             */
            self.practiceNo = ko.observable( I18N_PRACTICE_NO_UNKNOWN );
            Y.doccirrus.utils.getPracticeNo( function afterGetPracticeNo( practiceNo ) {
                if( practiceNo ) {
                    self.practiceNo( practiceNo );
                }
            } );

            /**
             * @property availability observable for adhoc info
             * @type {ko.observable}
             */
            self.availability = ko.observable( I18N_CHOOSE_CALENDER );

            // computed for getting availability
            self.addDisposable( ko.computed( function() {
                var
                    calendar = self.calendar(),
                    currentDuration = self.duration(),
                    initialCalendar = self.get( 'data.calendar' ),
                    params,
                    minutesBetween,
                    nowMom,
                    startMom;

                if( calendar ) {
                    // fetch next slot from server for new appointments or
                    // when an other scheduletype is chosen
                    // else calculate from current data
                    if( (!self.isNew() && calendar !== initialCalendar) || self.isNew() ) {
                        // build params
                        params = {
                            action: 'calculateschedule',
                            subaction: 'NEXT_SLOT',
                            calendar: calendar
                        };
                        if( currentDuration ) {
                            params.duration = currentDuration;
                        }
                        // reject pending ajax
                        if( self.availability.pending ) {
                            self.availability.pending.abort( ABORTED );
                        }
                        // create pending ajax
                        self.availability.pending = jQuery.ajax( {
                            type: 'GET',
                            xhrFields: { withCredentials: true },
                            url: Y.doccirrus.infras.getPrivateURL( '/r/calculateschedule/?' ) + Y.QueryString.stringify( params )
                        } );
                        // clear pending ajax always
                        self.availability.pending.always( function() {
                            delete self.availability.pending;
                        } );
                        // successful pending ajax
                        self.availability.pending.done( function displayNextSlot( data ) {
                            if( data && data[0] ) {
                                // @see Scheduler.prototype.getNextNStartTimes for -999
                                if( -999 !== data[0].start && '-999' !== data[0].start ) {
                                    data = data[0];
                                    startMom = moment( data.start ).seconds( 0 ).milliseconds( 0 );
                                    nowMom = moment().seconds( 0 ).milliseconds( 0 );
                                    minutesBetween = (startMom.unix() - nowMom.unix()) / 60;
                                    self.start( startMom.toISOString() );
                                    self.eta( startMom.toISOString() );
                                    self.availability( getAvailabilityDescription( Math.round( minutesBetween / 10 ) * 10, data ) );
                                    return;
                                }
                                // no handling as of MOJ-2423
                            }

                            self.availability( I18N_AVAILABILITY_NONE );

                        } );
                        // failed pending ajax
                        self.availability.pending.fail( function displayNoMoreSlots( jqXHR, textStatus, errorThrown ) {
                            if( errorThrown !== ABORTED ) {
                                self.availability( I18N_AVAILABILITY_NONE );
                            }
                        } );

                    } else {
                        // calculate from local data
                        startMom = moment( self.get( 'data.start' ) ).seconds( 0 ).milliseconds( 0 );
                        nowMom = moment().seconds( 0 ).milliseconds( 0 );
                        minutesBetween = (startMom.unix() - nowMom.unix()) / 60;
                        self.availability( getAvailabilityDescription( Math.round( minutesBetween / 10 ) * 10, self.get( 'data' ) ) );
                    }

                } else {
                    self.availability( I18N_CHOOSE_CALENDER );
                }
            } ).extend( {
                rateLimit: { timeout: 200, method: "notifyWhenChangesStop" }
            } ) );

        },
        /**
         * @method getAvailabilityDescription
         * @param {Number|undefined} duration
         * @param {Object} data repetition model data
         * @return {string}
         */
        getAvailabilityDescription: function RepetitionKoViewModel_getAvailabilityDescription( duration, data ) {
            if( undefined === duration ) {
                return I18N_CHOOSE_CALENDER;
            }
            if( 0 === duration ) {
                return I18N_AVAILABILITY_NOW;
            }
            if( 0 > duration ) {
                if( Y.doccirrus.schemas.calendar.SCH_ENDED === data.scheduled ) {
                    return I18N_AVAILABILITY_ENDED;
                }
                return I18N_AVAILABILITY_RUNNING;
            }

            return duration + I18N_AVAILABILITY_MIN_POSTFIX;
        },
        /**
         * determines if this is an ad hoc appointment
         * @method isAdHoc
         * @return {boolean}
         */
        isAdHoc: function RepetitionKoViewModel_isAdHoc() {
            var
                self = this;
            return Boolean( self.get( 'data.adhoc' ) );
        },

        isRepetitionElement: function() {
            var self = this;
            return Boolean( self.get( 'data.linkSeries' ) );
        },
        /**
         * initializes common repetition handling
         */
        initRepetition: function RepetitionKoViewModel_initRepetition() {
            var
                self = this,
                data = self.get( 'data' ),
                startVal, dtstartVal, untilVal;

            /**
             * @property repetitionList filtered schema repetition list
             * @type {ko.computed}
             */
            self.repetitionList = ko.computed( function() {
                var filter = ['NONE', 'DAILY', 'WEEKLY'];
                return Y.Array.filter( self.repetition.list(), function( repetition ) {
                    return filter.indexOf( repetition.val ) > -1;
                } );
            }, self );

            /**
             * @property byweekday.list manually byweekday list
             * @type {array}
             */
            if( !self.byweekday.list ) {
                self.byweekday.list = Y.doccirrus.schemas.calendar.types.Byweekday_E.list;
            }

            // default values for dtstart & until
            if( data.start ) {
                startVal = moment( data.start ).toISOString();
            }
            if( data.dtstart ) {
                dtstartVal = moment( data.dtstart ).toISOString();
            }
            if( data.until ) {
                untilVal = moment( data.until ).toISOString();
            }

            if( dtstartVal ) {
                self.dtstart( dtstartVal );
            } else if( startVal ) { // preset with start date
                self.dtstart( startVal );
            } else {
                self.dtstart( null );
            }

            if( untilVal ) {
                self.until( untilVal );
            } else {
                self.until( null );
            }

            // default value for daily repetition
            self.addDisposable( ko.computed( function() {
                var repetition = self.repetition();

                if( 'DAILY' !== repetition ) {
                    self.interval( 1 );
                }
            } ) );

            // visibility of repetition elements
            /**
             * @property dtstartVisible
             * @type {ko.computed}
             */
            self.dtstartVisible = ko.computed( function() {
                return self.repetition() !== 'NONE';
            } );
            /**
             * @property tableVisible
             * @type {ko.computed}
             */
            self.tableVisible = ko.computed( function() {
                return self.patientAutocomplete.data() !== null;
            } );
            /**
             * @property untilVisible
             * @type {ko.computed}
             */
            self.untilVisible = ko.computed( function() {
                return self.repetition() !== 'NONE';
            } );
            /**
             * @property intervalVisible
             * @type {ko.computed}
             */
            self.intervalVisible = ko.computed( function() {
                return self.repetition() === 'DAILY';
            } );
            /**
             * @property byweekdayVisible
             * @type {ko.computed}
             */
            self.byweekdayVisible = ko.computed( function() {
                return self.repetition() === 'WEEKLY';
            } );

        },
        /**
         * Panel.modal and select2 seems not to work together, so there is a need to modify the focusOn settings when focusing select2
         * and reverting to previous usage on select2 blur
         * … as this model shouldn't know anything about it's parent, and the parent is a DCWindow,
         * it should provide methods in constructor config which will overwrite those prototype functions and then will be used
         * @method select2FocusWorkaround
         */
        select2FocusWorkaround: function RepetitionKoViewModel_select2FocusWorkaround() {
            // actually gets overwritten
        },
        /**
         * Panel.modal and select2 seems not to work together, so there is a need to modify the focusOn settings when focusing select2
         * and reverting to previous usage on select2 blur
         * … as this model shouldn't know anything about it's parent, and the parent is a DCWindow,
         * it should provide methods in constructor config which will overwrite those prototype functions and then will be used
         * @method select2BlurWorkaround
         */
        select2BlurWorkaround: function RepetitionKoViewModel_select2BlurWorkaround() {
            // actually gets overwritten
        }
    }, {
        schemaName: 'schedule',
        NAME: 'RepetitionKoViewModel',
        ATTRS: {
            /**
             * Initial config property to make this Model and all it's child models validating
             * @attribute validatable
             * @for RepetitionKoViewModel
             * @type {Boolean}
             * @default true
             */
            validatable: {
                value: true,
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
            showPatient: {
                value: true,
                lazyAdd: false
            },
            /**
             * Determines if the user set the duration manually
             * @attribute userSetDuration
             * @for RepetitionKoViewModel
             * @type {Boolean}
             * @default false
             */
            userSetDuration: {
                value: false,
                lazyAdd: false
            },
            severityColorMap: {
                value: [],
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
        },
        /**
         *  @method formatDateWithDay
         *  @param {Date} date
         *  @returns {Date}
         */
        formatDateWithDay: function RepetitionKoViewModel_formatDateWithDay( date ) {
            return moment( date ).format( 'ddd ' + TIMESTAMP_FORMAT_LONG );
        },
        injectSelectSeverity: function RepetitionKoViewModel_initSelectSeverity( model ) {
            var
                self = model;

            self.severityColorMap = self.get( 'severityColorMap' );

            function severityMapper( obj ) {
                return {
                    id: obj.severity,
                    text: obj.color
                };
            }

            function format( state ) {
                return "<div class='row'><div class='sevColor col-xs-offset-1 col-xs-4 col-lg-4' style=' border-radius: 5px; border: 0.5px solid; width: 40px; height: 20px; background-color: " + state.text + "'></div><div class='col-xs-8 col-lg-8' > " + i18n( 'severity-schema.Severity_E.' + state.id ) + "</div></div>";
            }

            function getColorSeverity( severity ) {
                var color;
                self.severityColorMap.forEach( function( prop ) {
                    if( prop.severity === severity() ) {
                        color = prop.color;
                    }
                } );
                return color;
            }

            self.select2Severity = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            sev;
                        sev = {
                            severity: ko.unwrap( self.severity ),
                            color: getColorSeverity( self.severity )
                        };
                        return sev && severityMapper( sev );
                    },
                    write: function( $event ) {
                        self.severity( $event.val );
                    }
                } ) ),
                select2: {
                    width: '100%',
                    data: self.severityColorMap.map( severityMapper ),
                    minimumResultsForSearch: -1,
                    formatSelection: format,
                    formatResult: format
                }
            };
        }
    } );
    KoViewModel.registerConstructor( RepetitionKoViewModel );

}, '3.16.0', {
    lang: ['de', 'en'],
    requires: [
        'oop',
        'ko-bindingHandlers',
        'KoViewModel',
        'dccommonutils',
        'scheduletype-schema'
    ]
} );
