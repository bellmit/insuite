/*global ko, async, moment, fun:true, _, $ */
/*exported fun*/
//TRANSLATION INCOMPLETE!! MOJ-3201
fun = function _fn( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        binder = Y.doccirrus.utils.getMojitBinderByType( 'CalendarMojit' ),
        binderViewModel = binder.binderViewModel,
        KoViewModel = Y.doccirrus.KoViewModel,
        rerenderInterval,
        viewModel = null,
        unwrap = ko.unwrap,

        //  fields used to display insurance information and links to patients
        patientStubOptions = {
            'fields': {
                '_id': 1,
                'firstname': 1,
                'lastname': 1,
                'insuranceStatus': 1,
                'title': 1,
                'nameaffix': 1,
                'fk3120': 1,
                'kbvDob': 1,
                'patientNo': 1,
                'insuranceWOCard': 1
            }
        },

        COLUMN_FILTER_DEFAULT_VALUE = "2",
        SORT_BY_FILTER_DEFAULT_VALUE = "gs";

    /**
     * default error notifier
     */
    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            _.invoke( errors, 'display' );
        }

    }

    /**
     * get doctor's schedules from server
     * @return {jQuery.Deferred}
     */
    function getDocSchedules( showClosedAppointmentsFilter ) {

        var filter = Y.doccirrus.utils.getFilter(),
            baseParams = {
                both: showClosedAppointmentsFilter,
                active: !showClosedAppointmentsFilter
            };
        baseParams.calendar = binderViewModel.calendarFilteredIds();
        baseParams.group = {$ne: true};
        baseParams.noPopulate = true;
        if( filter && filter.location ) {
            baseParams.location = filter.location;
        }

        return Y.doccirrus.jsonrpc.api.calevent.getDocSchedules( baseParams )
            .then( function( response ) {
                return response && response.data || null;
            } );
    }

    /**
     * This views TabGraphicWaitingListViewModel
     * @constructor
     */
    function TabGraphicWaitingListViewModel() {
        TabGraphicWaitingListViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( TabGraphicWaitingListViewModel, KoViewModel.getDisposable(), {
        /**
         * A name to identify this view model by
         * @property {String} viewName
         */
        viewName: 'tab_graphic-waiting-list',

        //  for rate-limiting reload requests received via websocket
        socketReloadDelay: 1000,

        //  do not reload multiple times in parallell
        isLoading: false,

        scheduleData: null,
        filteredData: null,
        patientStubs: null,
        conferenceStubs: null,
        isFilteredDataNotEmpty: null,
        /**
         * May hold the waiting list table
         * @type {null|ko.oservable}
         */
        roomsArray: null,

        /** @protected */
        initializer: function TabGraphicWaitingListViewModel_initializer() {
            var
                self = this;

            self.isAdmin = Y.doccirrus.auth.isAdmin();
            self.scheduleData = ko.observableArray( [] );
            self.filteredData = ko.observableArray( [] );
            self.patientStubs = {};
            self.conferenceStubs = {};
            self.roomsArray = ko.observableArray( [] );
            self.filteredRoomsArray = ko.observableArray( [] );
            self.isDragging = ko.observable( false );
            self.isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
            self.isGermany = Y.doccirrus.commonutils.doesCountryModeIncludeGermany();
            self.isFilteredDataNotEmpty = ko.computed( function() {
                var
                    filteredData = unwrap( self.filteredData );
                return 0 < filteredData.length;
            } );

            //general configuration
            self.patientTitle = ko.observable( true );
            self.patientInsurance = ko.observable( true );
            self.patientArrivalTime = ko.observable( true );
            self.duration = ko.observable( true );
            self.calendarName = ko.observable( true );
            self.adhoc = ko.observable( false );
            self.patientSeverity = ko.observable( true );
            self.details = ko.observable( true );
            self.timeinadvance = ko.observable( false );
            self.eta = ko.observable( false );
            self.status = ko.observable( false );
            self.patientNo = ko.observable( false );
            self.patientDob = ko.observable( false );
            self.patientInsuranceFilter = ko.observable( true );
            self.patientArrivalTimeFilter = ko.observable( false );
            self.durationFilter = ko.observable( false );
            self.calendarNameFilter = ko.observable( true );
            self.adhocFilter = ko.observable( false );
            self.patientSeverityFilter = ko.observable( true );
            self.detailsFilter = ko.observable( true );
            self.timeinadvanceFilter = ko.observable( false );
            self.etaFilter = ko.observable( false );
            self.statusFilter = ko.observable( false );
            self.patientDobFilter = ko.observable( false );
            self.patientNoFilter = ko.observable( false );
            self.columnsFilter = ko.observable( COLUMN_FILTER_DEFAULT_VALUE );
            self.sortByFilter = ko.observable( SORT_BY_FILTER_DEFAULT_VALUE );
            self.hasConfiguration = ko.observable( null );

            //filters
            self.filterView = ko.observable( true );
            self.patientTitleFilterValue = ko.observable( '' );
            self.patientInsuranceFilterValue = ko.observableArray( [] );
            self.patientArrivalTimeFilterValue = ko.observable( '' );
            self.durationFilterValue = ko.observable( '' );
            self.adhocFilterValue = ko.observable( '' );
            self.calendarNameFilterValue = ko.observableArray( [] );
            self.patientSeverityFilterValue = ko.observableArray( [] );
            self.detailsFilterValue = ko.observable( '' );
            self.timeinadvanceFilterValue = ko.observable( '' );
            self.etaFilterValue = ko.observable( '' );
            self.patientNoFilterValue = ko.observable( '' );
            self.patientDobFilterValue = ko.observable( '' );
            self.statusFilterValue = ko.observableArray( [] );
            self.roomsFilterValue = ko.observableArray( [] );
            self.localStorageConfigs = ko.observableArray( [] );
            self.showClosedAppointmentsFilter = ko.observable( true );
            self.configurationFilterValue = ko.observable( '' );

            // translation
            self.deleteButtonI18n = i18n( 'general.button.DELETE' );
            self.saveButtonI18n = i18n( 'general.button.SAVE' );
            self.durationsI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.DURATION' );
            self.durationsLabelI18n = i18n( 'CalendarMojit.tab_waiting-list.label.DURATION' );
            self.arrivalTimeI18n = i18n( 'CalendarMojit.tab_waiting-list.title.WAITED' );
            self.arrivalTimeLabelI18n = i18n( 'CalendarMojit.tab_waiting-list.label.WAITED' );
            self.waitI18n = i18n( 'CalendarMojit.tab_waiting-list.title.WAIT' );
            self.waitLabelI18n = i18n( 'CalendarMojit.tab_waiting-list.label.WAIT' );
            self.detailsI18n = i18n( 'CalendarMojit.tab_waiting-list.label.DETAILS' );
            self.patientTitleI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.PATIENT' );
            self.timeInAdvanceI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.TIMEINADVANCE' );
            self.etaI18n = i18n( 'CalendarMojit.tab_waiting-list.title.ETA' );
            self.addNewRoomI18n = i18n( 'CalendarMojit.calendar.menu.ROOMS' );
            self.waitingListI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.label.WAITINGLIST' );
            self.endButtonI18n = i18n( 'CalendarMojit.tab_called-list.button.END' );
            self.waitingRoomI18n = i18n( 'CalendarMojit.room_modal.waiting_room' );
            self.treatmentRoomI18n = i18n( 'CalendarMojit.room_modal.treatment_room' );
            self.filterI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.FILTER' );
            self.showClosedAppointmentsI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.label.SHOWCLOSEDAPPOINTMENTS' );
            self.patientNoI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.PATIENT_NO' );
            self.patientNoLabelI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.label.PATIENT_NO' );
            self.patientDobI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.PATIENT_DOB' );

            self.screenWidth = Y.doccirrus.utils.getBootstrapScreenWidthComputed();

            self.setSocketListeners();
            self.loadConfiguration();
            self.getLocalStorageConfig();
            self.initSelect2Severity();
            self.initSelect2Rooms();
            self.initSelect2Insurance();
            self.initSelect2Status();
            self.initSelect2Calendars();
            self.loadRooms();
            self.initDrag();
            self.renderColors();
            self.addDisposable( ko.computed( function() {
                var parentIsLoaded = binderViewModel.calendarsLoaded();
                if( parentIsLoaded ) {
                    self.load();
                }
            } ) );
            self.addDisposable( ko.computed( function() {
                var filteredData = [],
                    patTitle = unwrap( self.patientTitleFilterValue ),
                    arrivalTime = unwrap( self.patientArrivalTimeFilterValue ),
                    adHoc = unwrap( self.adhocFilterValue ),
                    etaFilter = unwrap( self.etaFilterValue ),
                    patientNoFilter = unwrap( self.patientNoFilterValue ),
                    patientDobFilter = unwrap( self.patientDobFilterValue ),
                    calendarName = unwrap( self.calendarNameFilterValue ),
                    detailsFilter = unwrap( self.detailsFilterValue ),
                    duration = unwrap( self.durationFilterValue ),
                    timeInAdvance = unwrap( self.timeinadvanceFilterValue ),
                    insuranceSelector = unwrap( self.patientInsuranceFilterValue ),
                    severity = unwrap( self.patientSeverityFilterValue ),
                    status = unwrap( self.statusFilterValue );
                unwrap( self.scheduleData ).forEach( function( item ) {
                    var
                        wait = (item.adhoc) ? ((item.wait() < 0) ? 0 : item.wait()) + '' : '',
                        diff = (2 === item.scheduled || 1 === item.scheduled) && item.actualWaitingTimeMinutes ?
                            item.actualWaitingTimeMinutes : item.arrivalTime() && moment().diff( item.arrivalTime(), 'minute' ),
                        eta = (item.number() === null || item.number() === undefined) ? moment( item.eta() ).format( 'HH:mm' ) + '' : item.number() + '',
                        timeinadvance = (item.timeinadvance || '') + (item.calltime ? '(*)' : ''),
                        filteredInsurance = insuranceSelector && item.patient && item.patient.insuranceStatus && item.patient.insuranceStatus.some( function( item ) {
                            var
                                filtered = insuranceSelector.filter( function( i ) {
                                    return item.type === i.id;
                                } );
                            return filtered.length;
                        } ),
                        filteredStatus = status.some( function( i ) {
                            return item.status && item.status === i.text;
                        } ),
                        filteredCalendar = calendarName.some( function( i ) {
                            return -1 !== item.calendarNames.indexOf( i.text );
                        } ),
                        filteredSeverity = severity.some( function( i ) {
                            return item.severity && item.severity === i.id;
                        } );
                    if( 0 > diff ) {
                        // for no value default is 0
                        diff = 0;
                    }
                    if( patTitle && item.title.toLowerCase().indexOf( patTitle.toLowerCase() ) === -1 ) {
                        return;
                    }
                    if( patientNoFilter && item.patientNo.toLowerCase().indexOf( patientNoFilter.toLowerCase() ) === -1 ) {
                        return;
                    }
                    if( patientDobFilter && item.patientDob.toLowerCase().indexOf( patientDobFilter.toLowerCase() ) === -1 ) {
                        return;
                    }
                    if( arrivalTime && diff < arrivalTime ) {
                        return;
                    }
                    if( adHoc && wait.toString().indexOf( adHoc ) === -1 ) {
                        return;
                    }
                    if( etaFilter && eta.indexOf( etaFilter ) === -1 ) {
                        return;
                    }
                    if( calendarName && !filteredCalendar && calendarName.length ) {
                        return;
                    }
                    if( detailsFilter && item.details && item.details.toLowerCase().indexOf( detailsFilter.toLowerCase() ) === -1 ) {
                        return;
                    }
                    if( duration && item.duration < duration ) {
                        return;
                    }
                    if( timeInAdvance && timeinadvance.toString().toLowerCase().indexOf( timeInAdvance.toLowerCase() ) === -1 ) {
                        return;
                    }
                    if( severity && !filteredSeverity && severity.length ) {
                        return;
                    }
                    if( insuranceSelector && !filteredInsurance && insuranceSelector.length ) {
                        return;
                    }
                    if( status && !filteredStatus && status.length ) {
                        return;
                    }
                    filteredData.push( item );
                } );
                self.filteredData( filteredData );
                self.initDrag();
            } ) );
            self.addDisposable( ko.computed( function() {
                var
                    filteredRooms = [],
                    rooms = unwrap( self.roomsFilterValue );
                unwrap( self.roomsArray ).forEach( function( item ) {
                    var
                        filtered = rooms.filter( function( i ) {
                            return i.id === item._id;
                        } );
                    if( !filtered.length && rooms.length ) {
                        return;
                    }
                    filteredRooms.push( item );
                } );
                self.filteredRoomsArray( filteredRooms );
            } ) );
            self.addDisposable( ko.computed( function() {
                var
                    configs = unwrap( self.configurationFilterValue );

                self.patientTitleFilterValue( configs && configs.patientTitleFilterValue || '' );
                self.patientArrivalTimeFilterValue( configs && configs.patientArrivalTimeFilterValue || '' );
                self.patientArrivalTimeFilterValue( configs && configs.patientArrivalTimeFilterValue || '' );
                self.etaFilterValue( configs && configs.etaFilterValue || '' );
                self.patientDobFilterValue( configs && configs.patientDobFilterValue || '' );
                self.patientNoFilterValue( configs && configs.patientNoFilterValue || '' );
                self.calendarNameFilterValue( configs && configs.calendarNameFilterValue || [] );
                self.detailsFilterValue( configs && configs.detailsFilterValue || '' );
                self.durationFilterValue( configs && configs.durationFilterValue || '' );
                self.timeinadvanceFilterValue( configs && configs.timeinadvanceFilterValue || '' );
                self.patientInsuranceFilterValue( configs && configs.patientInsuranceFilterValue || [] );
                self.patientSeverityFilterValue( configs && configs.patientSeverityFilterValue || [] );
                self.roomsFilterValue( configs && configs.roomsFilterValue || [] );
                self.statusFilterValue( configs && configs.statusFilterValue || [] );
            } ) );
            rerenderInterval = setInterval( function() {
                // do not reload when dragging, will reload after drag
                if( !unwrap( self.isDragging ) ) {
                    self.load();
                }
            }, 60000 );
        },
        /** @protected */
        destructor: function TabGraphicWaitingListViewModel_destructor() {
            var
                self = this;

            if( self.myCalendarListener ) {
                self.myCalendarListener.removeEventListener();
                self.myCalendarListener = null;
            }

            if( self.myPatientListener ) {
                self.myPatientListener.removeEventListener();
                self.myPatientListener = null;
            }

            if( self.hotKeysGroup ) {
                self.hotKeysGroup.un( 'ctrl+h' );
                self.hotKeysGroup.un( 'alt+p' );
                self.hotKeysGroup = null;
            }
        },
        updateClosedAppointmentsFilter: function TabGraphicWaitingListViewModel_updateClosedAppointmentsFilter() {
            var
                self = this,
                showClosedAppointmentsFilter = unwrap( self.showClosedAppointmentsFilter );
            Y.doccirrus.utils.localValueSet( 'showClosedAppointmentsFilter', showClosedAppointmentsFilter );

            return true;
        },
        renderColors: function TabGraphicWaitingListViewModel_renderColors() {

            document.head.appendChild( binderViewModel.severityStyle );

            binderViewModel.severityColorMap.forEach( function( item ) {
                binderViewModel.severityStyle.sheet.insertRule( ".dc-severity-" + item.severity + "::after {border-width: 1rem;border-right-color:" + item.color + ";border-top-color:" + item.color + ";}", 0 );
                binderViewModel.severityStyle.sheet.insertRule( ".dc-severity-small-" + item.severity + "::after {border-width: 7px;border-right-color:" + item.color + ";border-top-color:" + item.color + ";}", 0 );
            } );
        },
        getSeverityColor: function TabCalendarViewModel_getSeverityColor( el ) {
            return binderViewModel.getColorBySeverity( el );
        },
        /**
         * Returns the view model from the mojit binder
         * @return {BinderViewModel}
         */
        getBinderViewModel: function TabCalendarViewModel_getBinderViewModel() {
            return binderViewModel;
        },
        /**
         * Calls modal which adds new room
         */
        remove: function TabGraphicWaitingListViewModel_remove( item ) {
            var
                self = this;
            Y.doccirrus.DCWindow.notice( {
                title: i18n( 'CalendarMojit.tab_graphic-waiting-list.title.ROOM_DELETE' ),
                message: i18n( 'CalendarMojit.tab_graphic-waiting-list.text.ROOM_DELETE_CONFIRM' ),
                window: {
                    buttons: {
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function( e ) {
                                    var
                                        that = this;
                                    e.target.button.disable();
                                    Y.doccirrus.jsonrpc.api.room.delete( {
                                        query: {
                                            _id: item._id
                                        }
                                    } )
                                        .then( function() {
                                            Promise.all( (self.scheduleData() || []).map( function( event ) {
                                                if( event.roomId === item._id ) {
                                                    Y.doccirrus.jsonrpc.api.schedule.update( {
                                                        query: {_id: event._id},
                                                        data: {$unset: {roomId: ''}},
                                                        fields: ['roomId']
                                                    } ).fail( fail );
                                                }
                                            } ) ).then( function() {
                                                that.close();
                                                self.load();
                                            } );
                                        } );
                                }
                            } )
                        ]
                    }
                }
            } );
        },
        /**
         * loads LocalStorageConfigs
         */
        getLocalStorageConfig: function TabGraphicWaitingListViewModel_getLocalStorageConfig() {
            var
                self = this,
                localStorageValue = Y.doccirrus.utils.localValueGet( 'filterConfiguration' ),
                localStorageConfiguration = [];

            if( localStorageValue ) {
                try {
                    localStorageConfiguration = JSON.parse( localStorageValue );
                } catch( parseErr ) {
                    Y.log( 'Problem getting localStorage filter configurations: ' + JSON.stringify( parseErr ), 'warn', NAME );
                }
            } else {
                localStorageConfiguration = [];
            }
            self.localStorageConfigs( localStorageConfiguration );
        },
        /**
         * saves filter configuration
         */
        saveConfiguration: function TabGraphicWaitingListViewModel_saveConfiguration() {
            var
                self = this,
                patTitle = unwrap( self.patientTitleFilterValue ),
                arrivalTime = unwrap( self.patientArrivalTimeFilterValue ),
                adHoc = unwrap( self.adhocFilterValue ),
                etaFilter = unwrap( self.etaFilterValue ),
                patientNoFilter = unwrap( self.patientNoFilterValue ),
                patientDobFilter = unwrap( self.patientDobFilterValue ),
                calendarName = unwrap( self.calendarNameFilterValue ),
                detailsFilter = unwrap( self.detailsFilterValue ),
                duration = unwrap( self.durationFilterValue ),
                timeInAdvance = unwrap( self.timeinadvanceFilterValue ),
                insuranceSelector = unwrap( self.patientInsuranceFilterValue ),
                severity = unwrap( self.patientSeverityFilterValue ),
                status = unwrap( self.statusFilterValue ),
                rooms = unwrap( self.roomsFilterValue ),
                localStorageValue = Y.doccirrus.utils.localValueGet( 'filterConfiguration' ),
                localStorageConfiguration = [],
                value = {
                    name: '',
                    description: '',
                    visible: true,
                    patientTitleFilterValue: patTitle,
                    patientArrivalTimeFilterValue: arrivalTime,
                    adhocFilterValue: adHoc,
                    etaFilterValue: etaFilter,
                    patientDobFilterValue: patientDobFilter,
                    patientNoFilterValue: patientNoFilter,
                    calendarNameFilterValue: calendarName,
                    detailsFilterValue: detailsFilter,
                    durationFilterValue: duration,
                    timeinadvanceFilterValue: timeInAdvance,
                    patientInsuranceFilterValue: insuranceSelector,
                    patientSeverityFilterValue: severity,
                    statusFilterValue: status,
                    roomsFilterValue: rooms
                };

            if( localStorageValue ) {
                try {
                    localStorageConfiguration = JSON.parse( localStorageValue );
                } catch( parseErr ) {
                    Y.log( 'Problem getting localStorage filter configurations: ' + JSON.stringify( parseErr ), 'warn', NAME );
                }
            } else {
                localStorageConfiguration = [];
            }

            localStorageConfiguration.push( value );
            Y.doccirrus.modals.filterConfiguration.show( localStorageConfiguration, false, function() {
                self.getLocalStorageConfig();
            } );
        },
        /**
         * saves filter configuration
         */
        editConfiguration: function TabGraphicWaitingListViewModel_editConfiguration() {
            var
                self = this,
                localStorageValue = Y.doccirrus.utils.localValueGet( 'filterConfiguration' ),
                localStorageConfiguration = [];

            if( localStorageValue ) {
                try {
                    localStorageConfiguration = JSON.parse( localStorageValue );
                } catch( parseErr ) {
                    Y.log( 'Problem getting localStorage filter configurations: ' + JSON.stringify( parseErr ), 'warn', NAME );
                }
            } else {
                localStorageConfiguration = [];
            }
            Y.doccirrus.modals.filterConfiguration.show( localStorageConfiguration, true, function() {
                self.getLocalStorageConfig();
            } );
        },
        /**
         * apply configuration
         */
        applyConfiguration: function TabGraphicWaitingListViewModel_applyConfiguration( $context, item, event ) {
            var
                self = this;
            if( !$( event.target ).hasClass( 'active' ) ) {
                $( 'span.filter-button' ).removeClass( 'active' );
                $( event.target ).addClass( 'active' );
                self.configurationFilterValue( item );
            } else {
                $( event.target ).removeClass( 'active' );
                self.configurationFilterValue( {} );
            }
        },
        /**
         * changes view for filter
         */
        filterViewHandler: function TabGraphicWaitingListViewModel_filterViewHandler() {
            var
                self = this;
            self.filterView( !unwrap( self.filterView ) );
        },
        /**
         * Calls modal which adds new room
         */
        add: function TabGraphicWaitingListViewModel_add( item ) {
            var
                self = this,
                data = item._id ? item : {};
            Y.doccirrus.modals.addNewRoom.show( data, function() {
                self.loadRooms();
            } );
        },
        /**
         * Calls modal which configures fields of cards
         */
        configure: function TabGraphicWaitingListViewModel_configure( item ) {
            var
                self = this,
                data = item._id ? item : null,
                isFilter = 'filter' === item ? true : false;
            Y.doccirrus.modals.addConfiguration.show( data, isFilter, function( isSortingChanged ) {
                var
                    dirtyAppointments;
                if( isSortingChanged ) {
                    dirtyAppointments = ( self.filteredData() || [] ).filter( function( item ) {
                            return !item.roomId;
                        });
                    if( dirtyAppointments && dirtyAppointments.length ) {
                        // if default sorting was changed then resort
                        dirtyAppointments.forEach(function( item ) {
                            item.orderInRoom = null;
                        });
                        Y.doccirrus.jsonrpc.api.calevent.updateRoomAppointments( {
                            data: {
                                appointments: dirtyAppointments
                            }
                        } )
                            .fail( fail )
                            .always( function() {
                                self.loadConfiguration();
                                self.load();
                            } );
                    }
                } else {
                    self.loadConfiguration();
                    self.load();
                }
            } );
        },
        /**
         * Calls modal which configures fields of cards
         */
        showAppointment: function TabGraphicWaitingListViewModel_showAppointment( context, item, event ) {
            var
                data = item._id ? item : {};
            event.stopPropagation();
            event.stopImmediatePropagation();
            binderViewModel
                .readAppointment( data )
                .done( function( schedule ) {

                    // TODO: [Bug] MOJ-4586: calevent.index to determine event position in a repetition not served always
                    binderViewModel
                        .showAppointmentDialog( schedule );
                } );
        },

        initSelect2Severity: function TabGraphicWaitingListViewModel_initSelect2Severity() {
            var
                self = this;

            function formatSelection( el ) {
                var
                    selection = "<div class='sevColor' style='margin:auto; height: 16px; width: 20px; ";
                if( el && el.id ) {
                    selection += "border: 1px solid black; ";
                }
                selection += "background-color: " + el.text + "'></div>";
                return selection;
            }

            function formatResult( el ) {
                var
                    selection = "<div class='row'><div class='sevColor col-xs-offset-1 col-xs-4 col-lg-4' style='width: 30px; height: 20px; ";
                if( 'transparent' === el.text ) {
                    el.text = 'white';
                }
                if( el && el.id ) {
                    selection += "border: 1px solid black; ";
                }
                selection += "background-color: " + el.text + "'></div>";
                selection += "<div class='col-xs-8 col-lg-8'>" + i18n( 'severity-schema.Severity_E.' + el.id ) + "</div></div>";
                return selection;
            }

            self.select2Severity = {
                data: ko.computed( {
                    read: function() {
                        return unwrap( self.patientSeverityFilterValue );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.patientSeverityFilterValue.push( $event.added );
                        }
                        if( $event.removed ) {
                            self.patientSeverityFilterValue.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                        }
                    }
                } ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'CalendarMojit.tab_waiting-list.title.SEVERITY' ),
                    multiple: true,
                    query: function( options ) {
                        var list = Y.doccirrus.schemas.severity.types.Severity_E.list,
                            term = options.term,
                            filteredData = list.filter( function( entry ) {
                                if( term && -1 === i18n( entry.i18n ).toLowerCase().indexOf( term.toLowerCase() ) ) {
                                    return;
                                }
                                return entry;
                            } ),
                            data = filteredData.map( function( entry ) {
                                return {
                                    id: entry.val,
                                    text: binderViewModel.getColorBySeverity( entry.val )
                                };
                            } );
                        return options.callback( {results: data} );
                    },
                    minimumResultsForSearch: -1,
                    formatSelection: formatSelection,
                    formatResult: formatResult
                }
            };
        },
        initSelect2Rooms: function TabGraphicWaitingListViewModel_initSelect2Rooms() {
            var
                self = this;
            self.select2Rooms = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.roomsFilterValue );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.roomsFilterValue.push( $event.added );
                        }
                        if( $event.removed ) {
                            self.roomsFilterValue.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                        }
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: i18n( 'CalendarMojit.tab_graphic-waiting-list.label.ROOM' ),
                    multiple: true,
                    query: function( options ) {
                        var list = unwrap( self.roomsArray ),
                            term = options.term,
                            filteredData = list.filter( function( entry ) {
                                if( term && -1 === i18n( entry.name ).toLowerCase().indexOf( term.toLowerCase() ) ) {
                                    return;
                                }
                                return entry;
                            } ),
                            data = filteredData.map( function( entry ) {
                                return {
                                    id: entry._id,
                                    text: i18n( entry.name )
                                };
                            } );
                        return options.callback( {results: data} );
                    }
                }
            };
        },
        initSelect2Calendars: function TabGraphicWaitingListViewModel_initSelect2Calendars() {
            var
                self = this;
            self.select2Calendars = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.calendarNameFilterValue );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.calendarNameFilterValue.push( $event.added );
                        }
                        if( $event.removed ) {
                            self.calendarNameFilterValue.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                        }
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: i18n( 'CalendarMojit.tab_waiting-list.label.CALENDAR' ),
                    multiple: true,
                    query: function( options ) {
                        var list = unwrap( binderViewModel.calendarsLocation ),
                            term = options.term,
                            filteredData = list.filter( function( entry ) {
                                if( term && -1 === i18n( entry.name ).toLowerCase().indexOf( term.toLowerCase() ) ) {
                                    return;
                                }
                                return entry;
                            } ),
                            data = filteredData.map( function( entry ) {
                                return {
                                    id: entry._id,
                                    text: entry.name
                                };
                            } );
                        return options.callback( {results: data} );
                    }
                }
            };
        },
        initSelect2Status: function TabGraphicWaitingListViewModel_initSelect2Status() {
            var
                self = this;
            self.select2Status = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.statusFilterValue );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.statusFilterValue.push( $event.added );
                        }
                        if( $event.removed ) {
                            self.statusFilterValue.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                        }
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: i18n( 'CalendarMojit.tab_called-list.title.STATUS' ),
                    multiple: true,
                    query: function( options ) {
                        var data = [
                                {
                                    id: 'RUNNING',
                                    text: i18n( 'CalendarMojit.scheduleStatus.RUNNING' )
                                },
                                {
                                    id: 'DONE',
                                    text: i18n( 'CalendarMojit.scheduleStatus.DONE' )
                                }
                            ],
                            term = options.term,
                            filteredData = data.filter( function( entry ) {
                                if( term && -1 === i18n( entry.text ).toLowerCase().indexOf( term.toLowerCase() ) ) {
                                    return;
                                }
                                return entry;
                            } );
                        return options.callback( {results: filteredData} );
                    }
                }
            };
        },
        initSelect2Insurance: function TabGraphicWaitingListViewModel_initSelect2Insurance() {
            var
                self = this;
            self.select2Insurance = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.patientInsuranceFilterValue );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.patientInsuranceFilterValue.push( $event.added );
                        }
                        if( $event.removed ) {
                            self.patientInsuranceFilterValue.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                        }
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: i18n( 'CalendarMojit.tab_graphic-waiting-list.title.INSURANCE' ),
                    multiple: true,
                    query: function( options ) {
                        var list = Y.doccirrus.schemas.person.types.Insurance_E.list,
                            filteredList = list.filter( function( entry ) {
                                if( self.isSwiss && -1 !== entry.countryMode.indexOf( 'CH' ) ) {
                                    return entry;
                                }
                                if( self.isGermany && -1 !== entry.countryMode.indexOf( 'D' ) ) {
                                    return entry;
                                }
                            } ),
                            term = options.term,
                            filteredData = filteredList.filter( function( entry ) {
                                if( term && -1 === i18n( entry.i18n ).toLowerCase().indexOf( term.toLowerCase() ) ) {
                                    return;
                                }
                                return entry;
                            } ),
                            data = filteredData.map( function( entry ) {
                                return {
                                    id: entry.val,
                                    text: entry.i18n
                                };
                            } );
                        return options.callback( {results: data} );
                    }
                }
            };
        },
        actualDuration: function TabGraphicWaitingListViewModel_actualDuration( data ) {
            return (data.scheduled <= 1) ? (moment().diff( data.start, 'minute' ) >= 0 ? moment().diff( data.start, 'minute' ) : '') : data.duration;
        },
        roomTitleData: function TabGraphicWaitingListViewModel_roomTitleData( data ) {
            return i18n( data.name || '' );
        },
        patientCalendars: function TabGraphicWaitingListViewModel_patientCalendars( data ) {
            if( _.isArray( data.calendarNames ) ) {
                return data.calendarNames.join( ', ' );
            }
            return data.calendarNames || '';
        },
        patientTitleData: function TabGraphicWaitingListViewModel_patientTitleData( data ) {
            return Y.doccirrus.schemas.calendar.buildScheduleTitle( {
                event: data,
                patient: data.patient,
                scheduletype: data.scheduletypePopulated,
                patientFormatter: function( stringPatient, patient ) {
                    if( patient ) {
                        return Y.Lang.sub( '<a href="{href}" class="patient-linkToCase" title="Zur Patienten Akte springen" target="_blank" id="patient-link">{text}</a>', {
                            text: Y.Escape.html(
                                Y.doccirrus.schemas.person.personDisplay( patient )
                            ),
                            href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + patient._id + '/tab/casefile_browser'
                        } );
                    } else {
                        return stringPatient;
                    }
                }
            } );
        },
        patientInsuranceData: function TabGraphicWaitingListViewModel_patientInsuranceData( data ) {
            var
                meta = {};
            meta.row = data;
            return binderViewModel.insuranceStatusTypeRenderer.call( null, meta );
        },
        hasPatientInsuranceData: function TabGraphicWaitingListViewModel_patientInsuranceData( data ) {
            return data && data.patient && data.patient.insuranceStatus && data.patient.insuranceStatus.length;
        },
        patientSeverityData: function TabGraphicWaitingListViewModel_patientSeverityData( data ) {
            if( data.severity ) {
                if( data.severity === "NONE" && data.urgency !== 0 ) {
                    binderViewModel.urgencyMigrator( data );
                }
                return "<div style='height:20px;width:44px;background-color:" +
                       binderViewModel.getColorBySeverity( data.severity ) + ";'></div>";
            }
            return "";
        },
        patientArrivalTimeData: function TabGraphicWaitingListViewModel_patientArrivalTimeData( data ) {
            var
                diff = data.arrivalTime() && moment().diff( data.arrivalTime(), 'minute' );

            if( diff >= 0 ) {
                return diff;
            } else {
                return 0;
            }
        },
        timeInAdvanceData: function TabGraphicWaitingListViewModel_timeInAdvanceData( data ) {
            return (data.timeinadvance || '') + (data.calltime ? '(*)' : '');
        },
        etaData: function TabGraphicWaitingListViewModel_etaData( data ) {
            return (data.number() === null || data.number() === undefined) ? moment( data.eta() ).format( 'HH:mm' ) + '' : data.number + '';
        },
        /**
         * load data for this view
         */
        load: function TabGraphicWaitingListViewModel_load() {
            var
                self = this;

            self.isLoading = true;
            self.loadRooms();

            return getDocSchedules( unwrap( self.showClosedAppointmentsFilter ) )
                .done( onSchedulesDownloaded )
                .fail( onSchedulesFailed );

            function onSchedulesDownloaded( plainSchedules ) {
                self.populateSchedulesAsync( plainSchedules, onPopulatedSchedules );
            }

            function onSchedulesFailed( err ) {
                self.isLoading = false;
                fail( err );
            }

            function onPopulatedSchedules( err, expandedSchedules ) {
                if( err ) {
                    return onSchedulesFailed( err );
                }
                var
                    severityPriority = {
                        NONE: 0,
                        LOW: 1,
                        NORMAL: 2,
                        IMPORTANT: 3,
                        VERYIMPORTANT: 4,
                        CRITICAL: 5
                    },
                    doneEvents,
                    activeEvents;
                switch( unwrap( self.sortByFilter ) ) {
                    case 'gs':
                        expandedSchedules = _.sortBy( expandedSchedules, 'eta' );
                        break;
                    case 'bw':
                        expandedSchedules = _.sortBy( expandedSchedules, 'arrivalTime' );
                        break;
                    case 'name':
                        expandedSchedules = expandedSchedules.sort( function( a, b ) {
                            var
                                value1 = a.patient.lastname + a.patient.firstname,
                                value2 = b.patient.lastname + b.patient.firstname;
                            if( value1 > value2 ) {
                                return 1;
                            }
                            if( value2 > value1 ) {
                                return -1;
                            }
                            return 0;
                        } );
                        break;
                    case 'w':
                        expandedSchedules = expandedSchedules.sort( function( a, b ) {
                            var
                                value1 = severityPriority[a.severity],
                                value2 = severityPriority[b.severity];
                            if( value1 > value2 ) {
                                return -1;
                            }
                            if( value2 > value1 ) {
                                return 1;
                            }
                            return 0;
                        } );
                        break;
                }
                expandedSchedules = _.sortBy( expandedSchedules, 'orderInRoom' );
                doneEvents = expandedSchedules.filter( function( item ) {
                    return 2 === item.scheduled;
                } );
                activeEvents = expandedSchedules.filter( function( item ) {
                    return 2 !== item.scheduled;
                } );
                expandedSchedules = activeEvents.concat( doneEvents );
                self.scheduleData( expandedSchedules );
                self.isLoading = false;
                self.initDrag();

                const link = document.getElementById('patient-link');
                if (link) {
                    link.addEventListener('mousedown', function (event) {
                        event.stopImmediatePropagation();
                    });
                }
            }
        },
        setPatientHasNotArrived: function TabGraphicWaitingListViewModel_setPatientHasNotArrived( schedule ) {
            var
                self = this;
            return binderViewModel
                .setAppointmentThatPatientNotArrived( {
                    _id: schedule._id
                } )
                .fail( fail )
                .always( function() {
                    self.load();
                } );
        },
        setPatientHasArrived: function TabGraphicWaitingListViewModel_setPatientHasArrived( schedule ) {
            var
                self = this;
            binderViewModel
                .setAppointmentThatPatientArrived( {
                    _id: schedule._id,
                    scheduleId: schedule.scheduleId,
                    actualWaitingTimeMinutes: schedule.actualWaitingTimeMinutes
                } )
                .fail( fail )
                .always( function() {
                    self.load();
                } );
        },
        setPatientHasCalled: function TabGraphicWaitingListViewModel_setPatientHasCalled( schedule ) {
            var
                self = this;
            binderViewModel
                .admitAppointment( {
                    _id: schedule._id,
                    calendar: schedule.calendar._id ? (schedule.calendar._id._id || schedule.calendar._id) : schedule.calendar // ;D
                } )
                .fail( fail )
                .always( function() {
                    self.load();
                } );
        },
        movePatientToWaitingList: function TabGraphicWaitingListViewModel_movePatientToWaitingList( schedule, setStart ) {
            var
                self = this;
            binderViewModel.moveAppointmentToWaitingList( {
                _id: schedule._id,
                plannedDuration: schedule.plannedDuration,
                duration: schedule.duration,
                eta: schedule.eta(),
                actualWaitingTimeMinutes: schedule.actualWaitingTimeMinutes
            } )
                .then( function( res ) {
                    if( setStart ) {
                        self.setPatientHasArrived( res );
                    }
                } )
                .fail( fail )
                .always( function() {
                    self.load();
                } );
        },
        endAppointment: function( schedule ) {
            var
                self = this;
            binderViewModel
                .endAppointment( {
                    _id: schedule._id,
                    calendar: schedule.calendar._id ? (schedule.calendar._id._id || schedule.calendar._id) : schedule.calendar // ;D
                } )
                .then( function() {
                    schedule.roomId = '';
                    schedule.orderInRoom = '';
                    Y.doccirrus.jsonrpc.api.calevent.updateRoomAppointments( {
                        data: {
                            appointments: [schedule]
                        }
                    } )
                        .fail( fail )
                        .always( function() {
                            self.load();
                        } );
                } )
                .fail( fail )
                .always( function() {
                    self.load();
                } );
        },
        initDrag: function TabGraphicWaitingListViewModel_initDrag() {
            var
                self = this,
                adjustment,
                patientsListDrop = $( "ol.patients-list-drop" ),
                roomsList = $( "ol.rooms-list" );
            patientsListDrop.sortable( 'destroy' );
            roomsList.sortable( 'destroy' );
            setTimeout( function() {
                // need delay to initiate drag
                runDrag();
            }, 300 );

            function runDrag() {
                patientsListDrop = $( "ol.patients-list-drop" );
                roomsList = $( "ol.rooms-list" );
                patientsListDrop.sortable( {
                    group: 'patients-list-drop',
                    pullPlaceholder: false,
                    exclude: 'li.room',
                    onDrop: function( $item, container, _super ) {
                        var
                            $clonedItem = $( '<li/>' ).css( {height: 0} ),
                            elements,
                            containerNode = container ? $( container.el )[0] : null,
                            dropData = containerNode ? ko.dataFor( containerNode ) : null,
                            scheduleData = unwrap( self.scheduleData ) || [],
                            filteredSchedule,
                            dragData = ko.dataFor( $item[0] ),
                            dirtyAppointments = [];

                        Y.doccirrus.utils.showLoadingMask( $( container.el )[0]  );

                        roomsList.sortable( 'enable' );
                        if( !containerNode ) {
                            self.load();
                            return;
                        }
                        $item.before( $clonedItem );
                        $clonedItem.animate( {'height': $item.height()} );
                        $clonedItem.detach();
                        _super( $item, container );
                        scheduleData.forEach( function( schedule ) {
                            if( dropData && dropData._id ) {
                                if( dragData._id === schedule._id ) {
                                    schedule.roomId = dropData._id;
                                }
                            } else {
                                if( dragData._id === schedule._id ) {
                                    schedule.roomId = '';
                                }
                            }
                        } );
                        filteredSchedule = scheduleData.filter( function( schedule ) {
                            if( dropData && dropData._id ) {
                                return schedule.roomId === dropData._id;
                            } else {
                                return !schedule.roomId;
                            }
                        } );
                        if( dropData && dropData._id ) {
                            if( dropData.numberOfPatients && dropData.numberOfPatients < filteredSchedule.length ) {
                                Y.doccirrus.DCWindow.notice( {
                                    message: i18n( 'CalendarMojit.tab_graphic-waiting-list.text.MAX_PATIENT_TEXT' )
                                } );
                                self.load();
                                return;
                            }
                        }
                        elements = $( containerNode ).find( '.patient' );
                        elements.each( function( index, element ) {
                            var
                                data = ko.dataFor( element );
                            data.orderInRoom = index;
                            data.roomId = dropData && dropData._id ? dropData._id : '';
                            dirtyAppointments.push( data );
                        } );
                        if( dirtyAppointments.length ) {
                            Y.doccirrus.jsonrpc.api.calevent.updateRoomAppointments( {
                                data: {
                                    appointments: dirtyAppointments
                                }
                            } ).then( function() {
                                if( dropData && dropData._id ) {
                                    if( 'waiting' === dropData.roomType ) {
                                        self.movePatientToWaitingList( dragData, true );
                                    }
                                    if( 'treatment' === dropData.roomType ) {
                                        self.setPatientHasCalled( dragData );
                                    }
                                } else if( dragData.arrivalTime() && dragData.arrivalTime() < new Date().toJSON() ) {
                                    if( 0 === dragData.scheduled && !dragData.wasInTreatment ) {
                                        self.setPatientHasNotArrived( dragData );
                                    } else if( 1 === dragData.scheduled || dragData.wasInTreatment ) {
                                        self.endAppointment( dragData );
                                    }
                                } else {
                                    if( 1 === dragData.scheduled || dragData.wasInTreatment ) {
                                        self.endAppointment( dragData );
                                    } else {
                                        self.movePatientToWaitingList( dragData, false );
                                    }
                                }
                                if( $item && $item[0] ) {
                                    $( $item[0] ).remove();
                                }
                            } ).fail( fail )
                                .always( function() {
                                    if( !dropData || !dropData._id ) {
                                        Y.doccirrus.utils.hideLoadingMask( $( container.el )[0]  );
                                    }
                                    self.isDragging( false );
                                    self.load();
                                } );
                        } else {
                            if( !dropData || !dropData._id ) {
                                Y.doccirrus.utils.hideLoadingMask( $( container.el )[0]  );
                            }
                            self.isDragging( false );
                            self.load();
                        }
                    },

                    // set $item relative to cursor position
                    onDragStart: function( $item, container, _super ) {
                        var
                            offset = $item.offset(),
                            pointer = container.rootGroup.pointer;

                        roomsList.sortable( 'disable' );
                        adjustment = {
                            left: pointer.left - offset.left,
                            top: pointer.top - offset.top
                        };
                        self.isDragging( true );

                        _super( $item, container );
                    },
                    onDrag: function( $item, position ) {
                        $item.css( {
                            left: position.left - adjustment.left,
                            top: position.top - adjustment.top
                        } );
                    }
                } );

                roomsList.sortable( {
                    group: 'rooms-list',
                    nested: false,
                    pullPlaceholder: false,
                    exclude: 'li.patient',
                    placeholder: '<li class="placeholder col-md-12"></li>',
                    onDrop: function( $item, container, _super ) {
                        var
                            $clonedItem = $( '<li/>' ).css( {height: 0} ),
                            containerItem = $( "#waitingListGraphic" ),
                            dirtyRooms = [],
                            elements = [],
                            iteration,
                            i,
                            elements1,
                            elements2,
                            elements3;
                        $item.before( $clonedItem );
                        $clonedItem.animate( {'height': $item.height()} );
                        $clonedItem.detach();
                        _super( $item, container );
                        elements1 = containerItem.find( 'ol.list-1 li.room' );
                        elements2 = containerItem.find( 'ol.list-2 li.room' );
                        elements3 = containerItem.find( 'ol.list-3 li.room' );
                        iteration = elements1.length > elements2.length ? elements1.length : elements2.length;
                        iteration = elements3.length > iteration ? elements3.length : iteration;
                        for( i = 0; i < iteration; i++ ) {
                            if( elements1[i] ) {
                                elements.push( ko.dataFor( elements1[i] ) );
                            }
                            if( elements2[i] ) {
                                elements.push( ko.dataFor( elements2[i] ) );
                            }
                            if( elements3[i] ) {
                                elements.push( ko.dataFor( elements3[i] ) );
                            }
                        }
                        elements.forEach( function( element, index ) {
                            var
                                data = element;
                            data.order = index;
                            dirtyRooms.push( data );
                        } );
                        if( dirtyRooms.length ) {
                            Y.doccirrus.jsonrpc.api.room.updateRooms( {
                                data: {
                                    rooms: dirtyRooms
                                }
                            } ).fail( fail )
                                .always( function() {
                                    self.isDragging( false );
                                    self.load();
                                } );
                        } else {
                            self.isDragging( false );
                            self.load();
                        }
                    },
                    // set $item relative to cursor position
                    onDragStart: function( $item, container, _super ) {
                        var
                            offset = $item.offset(),
                            pointer = container.rootGroup.pointer;
                        adjustment = {
                            left: pointer.left - offset.left,
                            top: pointer.top - offset.top
                        };
                        self.isDragging( true );
                        _super( $item, container );
                    },
                    onDrag: function( $item, position ) {
                        $item.css( {
                            left: position.left - adjustment.left,
                            top: position.top - adjustment.top
                        } );
                    }
                } );
            }
        },
        /**
         * Map of global events attached to
         */
        _globalEvents: null,
        /**
         * Attach to global events
         */
        attachToGlobalEvents: function TabGraphicWaitingListViewModel_attachToGlobalEvents() {
            var
                self = this;

            if( !self._globalEvents ) {
                self._globalEvents = {};
            }

            Y.doccirrus.ajax.disableBlocking();

            self._globalEvents.appointmentModified = Y.after( 'appointmentModified', self.appointmentModifiedHandler, self );
        },
        /**
         * Detach to global events
         */
        detachFromGlobalEvents: function TabGraphicWaitingListViewModel_detachFromGlobalEvents() {
            var
                self = this;

            if( self._globalEvents ) {
                Y.each( self._globalEvents, function( event, name ) {
                    event.detach();
                    delete self._globalEvents[name];
                } );
            }

            Y.doccirrus.ajax.enableBlocking();
        },
        /**
         * Handle global "appointmentModified"-event
         */
        appointmentModifiedHandler: function TabGraphicWaitingListViewModel_appointmentModifiedHandler( /* params */ ) {
            var
                self = this;
            self.load();

        },
        setSocketListeners: function() {
            var self = this,
                calendarFilteredIds;

            self.myCalendarListener = Y.doccirrus.communication.on( {
                event: 'calendar.refresh',
                done: function handleAction( response ) {
                    var updatedCalendarId = response && response.data && response.data[0] ? response.data[0] : null;

                    calendarFilteredIds = binderViewModel.calendarFilteredIds();
                    if( updatedCalendarId && calendarFilteredIds.indexOf( updatedCalendarId ) !== -1 ) {

                        //  do not reload multiple times in parallel
                        if( true === self.isLoading ) {
                            return;
                        }
                        self.isLoading = true;

                        //  timeout is due to duplicated websocket events on the server during realignment
                        //  of schedules - we must wait a little for the process to settle to avoid repeated
                        //  queries for updated data, until server-side process can be corrected in a
                        //  subsequent version - MOJ-10764

                        //  TODO: remove this timeout when possible

                        window.setTimeout( function() {
                            self.reloadMerged( /* updatedCalendarId */ );
                        }, self.socketReloadDelay );
                    }
                }
            } );

            self.myPatientListener = Y.doccirrus.communication.on( {
                event: 'patient.cardRead',
                done: function( response ) {
                    var updatedPatientId = response && response.data && response.data[0] ? response.data[0] : null,
                        patientHasAppointment = updatedPatientId && self.scheduleData() && self.scheduleData().some( function( event ) {
                            return event.patient && updatedPatientId === event.patient._id;
                        } );

                    if( patientHasAppointment ) {
                        delete self.patientStubs[updatedPatientId];
                        self.reloadMerged();
                    }
                }
            } );
        },
        loadRooms: function TabGraphicWaitingListViewModel_loadRooms() {
            var
                self = this,
                localStorageValue = Y.doccirrus.utils.localValueGet( 'roomsConfiguration' ),
                localStorageConfiguration,
                patientTitle = true,
                patientInsurance = true,
                patientArrivalTime = true,
                duration = true,
                calendarName = true,
                adhoc = false,
                patientSeverity = true,
                details = true,
                timeinadvance = false,
                eta = false,
                status = false,
                patientDob = false,
                patientNo = false;
            if( localStorageValue ) {
                try {
                    localStorageConfiguration = JSON.parse( localStorageValue );
                } catch( parseErr ) {
                    Y.log( 'Problem getting localStorage configurations configurations: ' + JSON.stringify( parseErr ), 'warn', NAME );
                }
            } else {
                localStorageConfiguration = [];
            }
            Y.doccirrus.jsonrpc.api.room.read( {
                'query': {},
                'options': {}
            } ).then( function( res ) {
                var data = (res && res.data) || [];
                data.forEach( function( item ) {
                    var i = localStorageConfiguration.filter( function( it ) {
                        return item._id === it._id;
                    } );
                    if( i[0] ) {
                        item.patientTitle = i[0].patientTitle;
                        item.patientInsurance = i[0].patientInsurance;
                        item.patientArrivalTime = i[0].patientArrivalTime;
                        item.duration = i[0].duration;
                        item.calendarName = i[0].calendarName;
                        item.adhoc = i[0].adhoc;
                        item.patientSeverity = i[0].patientSeverity;
                        item.details = i[0].details;
                        item.timeinadvance = i[0].timeinadvance;
                        item.eta = i[0].eta;
                        item.status = i[0].status;
                        item.patientDob = i[0].patientDob;
                        item.patientNo = i[0].patientNo;
                    } else {
                        item.patientTitle = patientTitle;
                        item.patientInsurance = patientInsurance;
                        item.patientArrivalTime = patientArrivalTime;
                        item.duration = duration;
                        item.calendarName = calendarName;
                        item.adhoc = adhoc;
                        item.patientSeverity = patientSeverity;
                        item.details = details;
                        item.timeinadvance = timeinadvance;
                        item.eta = eta;
                        item.status = status;
                        item.patientDob = patientDob;
                        item.patientNo = patientNo;
                    }
                } );
                self.roomsArray( _.sortBy( data, 'order' ) );
                self.initDrag();
            } ).fail( fail );
        },
        loadConfiguration: function TabGraphicWaitingListViewModel_loadConfiguration() {
            var
                self = this,
                localStorageValue = Y.doccirrus.utils.localValueGet( 'generalConfiguration' ),
                localStorageClosedAppointmentsValue = Y.doccirrus.utils.localValueGet( 'showClosedAppointmentsFilter' ),
                localStorageConfiguration;
            if( localStorageValue ) {
                try {
                    localStorageConfiguration = JSON.parse( localStorageValue );
                } catch( parseErr ) {
                    Y.log( 'Problem getting localStorage configurations configurations: ' + JSON.stringify( parseErr ), 'warn', NAME );
                }
            } else {
                localStorageConfiguration = {};
            }
            if( !localStorageClosedAppointmentsValue ) {
                self.showClosedAppointmentsFilter( true );
            } else {
                self.showClosedAppointmentsFilter( 'true' === localStorageClosedAppointmentsValue ? true : false );
            }
            self.hasConfiguration( !_.isEmpty( localStorageConfiguration ) );
            if( self.hasConfiguration() ) {
                self.patientTitle( localStorageConfiguration.patientTitle );
                self.patientInsurance( localStorageConfiguration.patientInsurance );
                self.patientArrivalTime( localStorageConfiguration.patientArrivalTime );
                self.duration( localStorageConfiguration.duration );
                self.calendarName( localStorageConfiguration.calendarName );
                self.adhoc( localStorageConfiguration.adhoc );
                self.patientSeverity( localStorageConfiguration.patientSeverity );
                self.details( localStorageConfiguration.details );
                self.timeinadvance( localStorageConfiguration.timeinadvance );
                self.eta( localStorageConfiguration.eta );
                self.status( localStorageConfiguration.status );
                self.patientDob( localStorageConfiguration.patientDob );
                self.patientNo( localStorageConfiguration.patientNo );
                self.patientInsuranceFilter( localStorageConfiguration.patientInsuranceFilter );
                self.patientArrivalTimeFilter( localStorageConfiguration.patientArrivalTimeFilter );
                self.durationFilter( localStorageConfiguration.durationFilter );
                self.calendarNameFilter( localStorageConfiguration.calendarNameFilter );
                self.adhocFilter( localStorageConfiguration.adhocFilter );
                self.patientSeverityFilter( localStorageConfiguration.patientSeverityFilter );
                self.detailsFilter( localStorageConfiguration.detailsFilter );
                self.timeinadvanceFilter( localStorageConfiguration.timeinadvanceFilter );
                self.etaFilter( localStorageConfiguration.etaFilter );
                self.patientDobFilter( localStorageConfiguration.patientDobFilter );
                self.patientNoFilter( localStorageConfiguration.patientNoFilter );
                self.statusFilter( localStorageConfiguration.statusFilter );
                self.columnsFilter( localStorageConfiguration.columnsFilter || COLUMN_FILTER_DEFAULT_VALUE );
                self.sortByFilter( localStorageConfiguration.sortByFilter || SORT_BY_FILTER_DEFAULT_VALUE );
            }
        },

        /**
         *  Reload from server and merge with current table data, MOJ-10764
         */

        reloadMerged: function( /* updatedCalendarId */ ) {
            var
                self = this;

            //  TODO: only load the updated calendar _id - isLoading should be extended into an array such that
            //  rate limiting applies per-calendar
            self.isLoading = true;
            self.load();
        },

        /**
         *  Expand the contents of plain schedules with patient and calendar information used by table cell renderers
         *
         *  @param data
         *  @param callback
         */

        populateSchedulesAsync: function( data, callback ) {
            var
                self = this,

                //  this should always be loaded at the point this is called
                allCalendars = binderViewModel.calendars(),

                //  _ids of patient to download stub documents for
                getPatientStubs = [],
                getConferencesStubs = [],

                //  safety, should never be used
                calNotFound = {
                    '_id': {
                        'name': 'Kalender nicht gefunden'
                    }
                };

            async.series( [populateCalendars, getPatientIdsFromConferences, downloadPatientStubs, mixPatientStubs, makeLightAppointmentModel], onAllDone );

            //  1. Populate calendars from binder
            function populateCalendars( itcb ) {
                var i, binderCalendar, mergedCalendars;
                for( i = 0; i < data.length; i++ ) {
                    mergedCalendars = [];
                    if( 'string' === typeof data[i].calendar ) {
                        binderCalendar = findCalendar( data[i].calendar );
                        data[i].calendar = binderCalendar ? binderCalendar : calNotFound;
                        data[i].calendarNames = binderCalendar ? [binderCalendar._id.name] : [calNotFound];
                    }
                    if( Array.isArray( data[i].calendar ) ) { // for merged appointments with resources
                        data[i].calendar.forEach( function( id ) { // eslint-disable-line no-loop-func
                            binderCalendar = findCalendar( id );
                            if( !mergedCalendars.find( function( item ) {
                                return item._id._id === id;
                            } ) ) {
                                mergedCalendars.push( binderCalendar ? binderCalendar : calNotFound );
                            }
                        } );
                        data[i].calendar = mergedCalendars[0];
                        data[i].calendarNames = mergedCalendars.map( function( item ) {
                            return item._id.name;
                        } );
                    }
                }
                itcb( null );
            }

            function findCalendar( calendarId ) {
                var i;
                for( i = 0; i < allCalendars.length; i++ ) {
                    if( calendarId === allCalendars[i]._id ) {
                        //  this is a little odd, but it's what the server returns
                        return {
                            employee: allCalendars[i].employee,
                            _id: allCalendars[i]
                        };
                    }
                }
                return null;
            }

            function getPatientIdsFromConferences( itcb ) {
                var conferenceId, i, j;

                for( i = 0; i < data.length; i++ ) {
                    conferenceId = data[i].conferenceId;
                    if( 'string' === typeof conferenceId && '' !== conferenceId ) {
                        if( !self.conferenceStubs[conferenceId] && -1 === getConferencesStubs.indexOf( conferenceId ) ) {
                            getConferencesStubs.push( conferenceId );
                        }
                    }
                }

                if( 0 === getConferencesStubs.length ) {
                    return addPatientsFromCachedConference();
                }

                Y.doccirrus.jsonrpc.api.conference.read( {
                    'query': {'_id': {'$in': getConferencesStubs}},
                    'options': {
                        'fields': {
                            '_id': 1,
                            'patients': 1
                        }
                    }
                } ).then( addPatientsFromLoadedConference ).fail( itcb );

                function addPatientsFromLoadedConference( result ) {

                    result = result.data ? result.data : result;

                    for( i = 0; i < result.length; i++ ) {
                        self.conferenceStubs[result[i]._id] = result[i];

                        for( j = 0; j < data.length; j++ ) {
                            conferenceId = data[j].conferenceId;
                            if( 'string' === typeof conferenceId && '' !== conferenceId ) {
                                if( conferenceId === result[i]._id ) {
                                    data[j].patient = result[i].patients[0];
                                }
                            }
                        }
                    }
                    itcb( null );
                }

                function addPatientsFromCachedConference() {
                    var conferenceIds = Object.keys( self.conferenceStubs );

                    if( 0 === conferenceIds.length ) {
                        return itcb( null );
                    }

                    for( i = 0; i < conferenceIds.length; i++ ) {
                        for( j = 0; j < data.length; j++ ) {
                            conferenceId = data[j].conferenceId;
                            if( 'string' === typeof conferenceId && '' !== conferenceId ) {
                                if( conferenceId === conferenceIds[i] ) {
                                    data[j].patient = self.conferenceStubs[conferenceIds[i]].patients[0];
                                }
                            }
                        }
                    }
                    itcb( null );
                }
            }

            //  2. Collect _ids of stub patients to download (most should usually be cached) and get from server
            function downloadPatientStubs( itcb ) {
                var patientId, i;

                for( i = 0; i < data.length; i++ ) {
                    patientId = data[i].patient;
                    if( 'string' === typeof patientId && '' !== patientId ) {
                        if( !self.patientStubs[patientId] && -1 === getPatientStubs.indexOf( patientId ) ) {
                            getPatientStubs.push( patientId );
                        }
                    }
                }

                if( 0 === getPatientStubs.length ) {
                    //if ( 0 !== data.length ) { console.log( '(****) all stubs already downloaded' ); }
                    return itcb( null );
                }

                Y.doccirrus.jsonrpc.api.patient.read( {
                    'query': {'_id': {'$in': getPatientStubs}},
                    'options': patientStubOptions
                } ).then( addPatientStubs ).fail( itcb );

                function addPatientStubs( result ) {
                    result = result.data ? result.data : result;

                    for( i = 0; i < result.length; i++ ) {
                        self.patientStubs[result[i]._id] = result[i];
                    }

                    itcb( null );
                }

            }

            //  3. Populate patients
            function mixPatientStubs( itcb ) {
                var patientId, i;

                for( i = 0; i < data.length; i++ ) {
                    patientId = data[i].patient;
                    if( 'string' === typeof patientId && self.patientStubs[patientId] ) {
                        data[i].patient = self.patientStubs[patientId];

                        data[i].patientDob = data[i].patient.kbvDob;
                        data[i].patientNo = data[i].patient.patientNo;
                    }
                }
                itcb( null );
            }

            //  4. Make model
            function makeLightAppointmentModel( itcb ) {
                var i;

                for( i = 0; i < data.length; i++ ) {
                    data[i].arrivalTime = ko.observable( data[i].arrivalTime );
                    data[i].eta = ko.observable( data[i].eta );
                    data[i].end = ko.observable( data[i].end );
                    data[i].wait = ko.observable( data[i].wait );
                    data[i].number = ko.observable( data[i].number );
                }
                itcb( null );
            }

            //  X. Done
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Could not populate waiting list entries: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }
                callback( null, data );
            }

        }

    } );

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node   NB: The node MUST have an   id   attribute.
         */
        registerNode: function tab_waitingList_registerNode( node ) {

            viewModel = new TabGraphicWaitingListViewModel();

            ko.applyBindings( viewModel, node.getDOMNode() );

            viewModel.attachToGlobalEvents();

            binderViewModel.currentView( viewModel );

        },

        deregisterNode: function tab_waitingList_deregisterNode( node ) {
            viewModel.detachFromGlobalEvents();
            clearInterval( rerenderInterval );
            ko.cleanNode( node.getDOMNode() );

            //  clean up viewmodel, unsubscribe hotkeys, MOJ-7531
            viewModel.destroy();
        }

    };
};
