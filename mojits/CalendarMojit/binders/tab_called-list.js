/*global ko, jQuery, async, moment, fun:true */
/*exported fun*/
'use strict';

fun = function _fn( Y, NAME ) {

    var
        i18n = Y.doccirrus.i18n,
        binder = Y.doccirrus.utils.getMojitBinderByType( 'CalendarMojit' ),
        binderViewModel = binder.binderViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        rerenderInterval,
        KoViewModel = Y.doccirrus.KoViewModel,
        viewModel = null,

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
        };

    /**
     * default error notifier
     */
    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }

    }

    /**
     * get doctor's schedules from server
     * @return {jQuery.Deferred}
     */
    function getDocSchedules() {

        var baseParams = {
                old: true
            },
            filter = Y.doccirrus.utils.getFilter();

        // make JSON-RPC params
        baseParams.calendar = binderViewModel.calendarFilteredIds();
        baseParams.noPopulate = true;
        baseParams.group = {$ne: true};
        if( filter && filter.location ) {
            baseParams.location = filter.location;
        }

        return Y.doccirrus.jsonrpc.api.calevent.getDocSchedules( baseParams )
            .then( function( response ) {
                return response && response.data || null;
            } );
    }

    /**
     * This views TabCalledListViewModel
     * @constructor
     */
    function TabCalledListViewModel() {
        TabCalledListViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( TabCalledListViewModel, KoViewModel.getDisposable(), {
        /**
         * A name to identify this view model by
         * @property {String} viewName
         */
        viewName: 'tab_called-list',

        //  for rate-limiting reload requests received via websocket
        socketReloadDelay: 1000,

        //  do not reload multiple times in parallell
        isLoading: false,
        conferenceStubs: null,
        scheduleData: null,
        roomsTreatment: null,
        roomsTreatmentArray: null,
        roomsWaiting: null,
        roomsWaitingArray: null,

        /** @protected */
        initializer: function TabCalledListViewModel_initializer() {
            var
                self = this;

            self.scheduleData = ko.observableArray( [] );
            self.roomsTreatmentArray = ko.observableArray( [] );
            self.roomsWaitingArray = ko.observableArray( [] );
            self.roomsTreatment = ko.observable();
            self.roomsWaiting = ko.observable();
            self.patientStubs = {};
            self.conferenceStubs = {};
            self.isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
            self.isGermany = Y.doccirrus.commonutils.doesCountryModeIncludeGermany();

            self.screenWidth = Y.doccirrus.utils.getBootstrapScreenWidthComputed();
            self.filteredInsuranceList = ko.observableArray( [] );

            self._initInsuranceList();
            self._initCalledListTable();
            self._initActions();
            self._initHotkeys();
            self.setSocketListeners();
            self.loadRooms();
            self.addDisposable( ko.computed( function() {
                var parentIsLoaded = binderViewModel.calendarsLoaded();
                if ( parentIsLoaded ) { self.load(); }
            } ) );
            rerenderInterval = setInterval( function() {
                self.calledListTable.rerender();
            }, 60000 );
        },
        /** @protected */
        destructor: function TabCalledListViewModel_destructor() {

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

            if ( self.hotKeysGroup ) {
                self.hotKeysGroup.un( 'ctrl+h' );
                self.hotKeysGroup.un( 'alt+p' );
                self.hotKeysGroup = null;
            }
        },
        /**
         * Returns list of country filtered insurances
         * @return {BinderViewModel}
         */
        _initInsuranceList: function TabCalendarViewModel_initInsuranceList() {
            var
                self = this,
                list = Y.doccirrus.schemas.person.types.Insurance_E.list,
                filteredList = list.filter( function( entry ) {
                    if( self.isSwiss && -1 !== entry.countryMode.indexOf( 'CH' ) ) {
                        return entry;
                    }
                    if( self.isGermany && -1 !== entry.countryMode.indexOf( 'D' ) ) {
                        return entry;
                    }
                });
            self.filteredInsuranceList( filteredList );
        },
        /**
         * Returns the view model from the mojit binder
         * @return {BinderViewModel}
         */
        getBinderViewModel: function TabCalendarViewModel_getBinderViewModel() {
            return binderViewModel;
        },

        /**
         * Returns the calledListTable which is the list uf the current tab
         * @return {calledListTable}
         */
        getTabList: function TabCalemdarViewModel_getTabList() {
            return this.calledListTable;
        },

        /**
         * May hold the called list table
         * @type {null|KoTable}
         */
        calledListTable: null,
        loadRooms: function TabGraphicWaitingListViewModel_loadRooms() {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.room.read( {
                'query': {},
                'options': {}
            } ).then( function( res ) {
                var
                    data = ( res && res.data ) || [],
                    waiting = data.filter( function( item ) {
                        return 'waiting' === item.roomType;
                    }),
                    treatment = data.filter( function( item ) {
                        return 'treatment' === item.roomType;
                    });
                self.roomsWaiting( waiting.length );
                self.roomsWaitingArray( waiting );
                self.roomsTreatment( treatment.length );
                self.roomsTreatmentArray( treatment );
            } ).fail( fail );
        },
        /**
         * load data for this view
         */
        load: function() {

            var
                self = this;

            self.isLoading = true;

            return getDocSchedules()
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
                if ( err ) { return onSchedulesFailed( err ); }

                self.scheduleData( expandedSchedules );
                self.calledListTable.reload();
                self.isLoading = false;
            }
        },
        /** @protected */
        _initCalledListTable: function TabCalledListViewModel__initCalledListTable() {
            var
                self = this;

            function formatSelection( el ) {
                return "<div class='sevColor' style=' width: 20px; height: 20px; background-color: " + el.text + "'></div>";
            }

            function formatResult( el ) {
                return "<div class='sevColor' style='margin:auto; width: 30px; height: 20px; background-color: " + el.text + "'></div>";
            }

            self.calledListTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-intime-table',
                    pdfTitle: i18n( 'CalendarMojit.tab_called-list.pdfTitle' ),
                    stateId: 'CalendarMojit-CalendarMojitBinderIndex-calledListTable',
                    states: ['limit', 'usageShortcutsVisible', 'usageConfigurationValue', 'sort'],
                    fillRowsToLimit: false,
                    rowPopover: false,

                    //   pretend to connect to the server, but reply from local cache
                    proxy: binderViewModel.hookProxy.bind( self ),
                    remote: true,

                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'select',
                            label: '',
                            identifyModelBy: 'property',
                            updateCheckedFromCurrentData: true
                        },
                        {
                            forPropertyName: 'actualWaitingTimeMinutes',
                            label: i18n( 'CalendarMojit.tab_called-list.label.WAITED' ),
                            title: i18n( 'CalendarMojit.tab_called-list.title.WAITED' ),
                            width: '65px',
                            visible: false,
                            isSortable: true,
                            isFilterable: true,
                            renderer: function getWaitedTime( meta ) {
                                return ( meta.value >= 0 ) ? meta.value : '';
                            }
                        },
                        {
                            forPropertyName: 'eta',
                            label: i18n( 'CalendarMojit.tab_called-list.label.ETA' ),
                            title: i18n( 'CalendarMojit.tab_called-list.title.ETA' ),
                            width: '80px',
                            isSortable: true,
                            isFilterable: true,
                            filterBy: function( row ) {
                                var value = this.filterField.value();
                                return moment( row.eta ).format( 'HH:mm' ).indexOf( value ) > -1;
                            },
                            renderer: function( meta ) {
                                return moment( meta.value ).format( 'HH:mm' );
                            },
                            interceptRenderOutput: function( output, meta, isTitle ) {
                                if( output && isTitle ) {
                                    if( meta.value ) {
                                        return moment( meta.value ).format( 'HH:mm' );
                                    } else {
                                        return '';
                                    }
                                }
                                return output;
                            }
                        },
                        {
                            forPropertyName: 'plannedDuration',
                            label: i18n( 'CalendarMojit.tab_called-list.label.PLANNEDDURATION' ),
                            title: i18n( 'CalendarMojit.tab_called-list.title.PLANNEDDURATION' ),
                            width: '65px',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'severity',
                            label: i18n( 'CalendarMojit.tab_called-list.label.SEVERITY' ),
                            title: i18n( 'CalendarMojit.tab_called-list.title.SEVERITY' ),
                            width: '66px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                select2Config: {
                                    formatSelection: formatSelection,
                                    formatResult: formatResult
                                },
                                options: Y.doccirrus.schemas.severity.types.Severity_E.list.map( function( el ) {
                                    return {
                                        text: binderViewModel.getColorBySeverity( el.val ),
                                        val: el.val
                                    };
                                } ),
                                optionsText: "text",
                                optionsValue: 'val'
                            },
                            sortBy: function( aSeverity, bSeverity ) {
                                return binderViewModel.severitySorter( aSeverity, bSeverity );
                            },
                            renderer: function( meta ) {
                                var
                                    data = meta.row;
                                if( data.severity ) {
                                    if( data.severity === "NONE" && data.urgency !== 0 ) {
                                        binderViewModel.urgencyMigrator( data );
                                    }
                                    return "<div style='margin:auto;height:20px;width:44px;background-color:" +
                                           binderViewModel.getColorBySeverity( data.severity ) + ";'></div>";
                                }
                                return "";
                            }
                        },
                        {
                            forPropertyName: 'start',
                            label: i18n( 'CalendarMojit.tab_called-list.label.START' ),
                            title: i18n( 'CalendarMojit.tab_called-list.title.START' ),
                            width: '65px',
                            isSortable: true,
                            isFilterable: true,
                            filterBy: function( row ) {
                                var value = this.filterField.value();
                                return moment( row.start ).format( 'HH:mm' ).indexOf( value ) > -1;
                            },
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            renderer: function( meta ) {
                                return moment( meta.value ).format( 'HH:mm' );
                            },
                            interceptRenderOutput: function( output, meta, isTitle ) {
                                if( output && isTitle ) {
                                    if( meta.value ) {
                                        return moment( meta.value ).format( 'HH:mm' );
                                    } else {
                                        return '';
                                    }
                                }
                                return output;
                            }
                        },
                        {
                            forPropertyName: 'status',
                            label: i18n( 'CalendarMojit.tab_called-list.label.STATUS' ),
                            title: i18n( 'CalendarMojit.tab_called-list.title.STATUS' ),
                            width: '65px',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'duration',
                            label: i18n( 'CalendarMojit.tab_called-list.label.DURATION' ),
                            title: i18n( 'CalendarMojit.tab_called-list.title.DURATION' ),
                            width: '65px',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var data = meta.row;
                                return ( data.scheduled <= 1 ) ? (moment().diff( data.start, 'minute' ) >= 0 ? moment().diff( data.start, 'minute' ) : '' ) : meta.value;
                            }
                        },
                        {
                            forPropertyName: 'patient.insuranceStatus.0.type',
                            label: i18n( 'CalendarMojit.tab_waiting-list.label.INSURANCE' ),
                            title: self.isSwiss ? i18n( 'CalendarMojit.tab_graphic-waiting-list.title.INSURANCE' ): i18n( 'CalendarMojit.tab_waiting-list.title.INSURANCE' ),
                            width: '82px',
                            isSortable: false,
                            isFilterable: true,
                            renderer: binderViewModel.insuranceStatusTypeRenderer,
                            filterBy: function( row ){
                                var
                                    value = this.filterField.value();
                                return row.patient && row.patient.insuranceStatus.some( function( item ) {
                                    return -1 !== value.indexOf( item.type );
                                } );
                            },
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: self.filteredInsuranceList(),
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'patTitle',
                            label: i18n( 'CalendarMojit.tab_called-list.label.PATIENT' ),
                            title: i18n( 'CalendarMojit.tab_called-list.title.PATIENT' ),
                            width: '35%',
                            isSortable: true,
                            isFilterable: true,
                            sortBy: function( aRow, bRow ) {
                                var
                                    aString = aRow.title || '',
                                    bString = bRow.title || '';
                                return KoUI.utils.String.comparators.natural( aString, bString );
                            },
                            filterBy: function( row ) {
                                var value = this.filterField.value();
                                return (row.patTitle || '').toLowerCase().indexOf( value.toLowerCase() ) > -1;
                            },
                            renderer: function( meta ) {
                                var data = meta.row;
                                return Y.doccirrus.schemas.calendar.buildScheduleTitle( {
                                    event: data,
                                    patient: data.patient,
                                    scheduletype: data.scheduletypePopulated,
                                    patientFormatter: function( stringPatient, patient ) {
                                        if( patient ) {
                                            return Y.Lang.sub( '<a href="{href}" class="patient-linkToCase" title="Zur Patienten Akte springen" target="_blank">{text}</a>', {
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
                            onCellClick: function( meta/*, $event*/ ) {
                                var
                                    isLink = meta.isLink,
                                    patient = meta.row.patient;

                                if( patient && isLink ) {
                                    return false;
                                } else {
                                    return true;
                                }

                            }
                        },
                        {
                            forPropertyName: 'calendarNames',
                            label: i18n( 'CalendarMojit.tab_called-list.label.CALENDAR' ),
                            title: i18n( 'CalendarMojit.tab_called-list.title.CALENDAR' ),
                            width: '30%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                if( Array.isArray( meta.value ) ) {
                                    return meta.value.join( ', ' );
                                }
                                return meta.value || '';
                            }
                        },
                        {
                            forPropertyName: 'details',
                            label: i18n( 'CalendarMojit.tab_called-list.label.DETAILS' ),
                            title: i18n( 'CalendarMojit.tab_called-list.title.DETAILS' ),
                            width: '35%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return Y.Escape.html( meta.value );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'roomName',
                            label: i18n( 'CalendarMojit.tab_graphic-waiting-list.label.ROOM' ),
                            title: i18n( 'CalendarMojit.tab_graphic-waiting-list.label.ROOM' ),
                            width: '25%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return i18n( meta.value );
                                } else {
                                    return '';
                                }
                            },
                            interceptRenderOutput: function( output, meta, isTitle ) {
                                if( output && isTitle ) {
                                    if( meta.value ) {
                                        return i18n( meta.value );
                                    } else {
                                        return '';
                                    }
                                }
                                return output;
                            }
                        },
                        {
                            forPropertyName: 'patientDob',
                            label: i18n( 'patient-schema.Patient_T.dob' ),
                            title: i18n( 'patient-schema.Patient_T.dob' ),
                            width: '25%',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return i18n( meta.value );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'patientNo',
                            label: i18n( 'patient-schema.Patient_T.patientNo.i18n' ),
                            title: i18n( 'patient-schema.Patient_T.patientNo.i18n' ),
                            width: '25%',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return i18n( meta.value );
                                } else {
                                    return '';
                                }
                            }
                        }
                    ],
                    selectMode: 'none',
                    onRowClick: function( meta ) {
                        var
                            data = meta.row;

                        binderViewModel
                            .readAppointment( data )
                            .done( function( schedule ) {

                                // TODO: [Bug] MOJ-4586: calevent.index to determine event position in a repetition not served always
                                binderViewModel
                                    .showAppointmentDialog( schedule );
                            } );

                    }
                }
            } );
        },


        /**
         *  Set listeners for keyboard shortcuts
         *  @private
         */

        _initHotkeys: function() {
            var self = this;

            self.hotKeysGroup = Y.doccirrus.HotKeysHandler.addGroup( 'TabCalledListViewModel' );
            self.hotKeysGroup
                .on( 'ctrl+h', i18n( 'InCaseMojit.HotkeysModal.label' ), onShowShortcutsList )
                .on( 'alt+p', i18n( 'InCaseMojit.casefile_browserJS.hotkey.PRINT' ), onPrintShortcut );

            function onShowShortcutsList() {
                Y.doccirrus.modals.hotkeys.show( { 'hotKeysGroups': 'TabCalledListViewModel' } );
            }

            function onPrintShortcut() {
                //  if nothing to print then ignore keyboard shortcut
                var tableData = self.calledListTable.data();
                if ( 0 === tableData.length ) { return; }

                self.calledListTable.showExportPdfDataStart();
            }
        },

        /**
         * May hold the move to waiting list Button
         * @type {null|KoButton}
         */
        calledListTableBtnBackWaiting: null,
        /**
         * May hold the close Button
         * @type {null|KoButton}
         */
        calledListTableBtnClose: null,
        /**
         * May hold the delete Button
         * @type {null|KoButton}
         */
        calledListTableBtnDelete: null,
        /** @protected */
        _initActions: function TabCalledListViewModel__initActions() {
            var
                self = this,
                calledListTable = self.calledListTable;

            self.calledListTableBtnBackWaiting = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_WAITING',
                    text: i18n( 'CalendarMojit.tab_called-list.button.WAITING' ),
                    click: function() {
                        var
                            componentColumnCheckbox = calledListTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked(),
                            schedule;

                        function setSingle( roomName ) {
                            jQuery
                                .when.apply( jQuery, checked.map( function( item ) {
                                schedule = item;
                                binderViewModel.moveAppointmentToWaitingList( {
                                    _id: schedule._id,
                                    plannedDuration: schedule.plannedDuration,
                                    duration: schedule.duration,
                                    eta: schedule.eta
                                } )
                                    .then( function() {
                                        schedule.roomId = roomName;
                                        schedule.orderInRoom = '';
                                        Y.doccirrus.jsonrpc.api.calevent.updateRoomAppointments( {
                                            data: {
                                                appointments: [schedule]
                                            }
                                        } )
                                            .fail( fail );
                                    });
                            } ) )
                                .fail( fail )
                                .always( function() {
                                    self.load();
                                } );
                        }

                        if( 0 < checked.length ) {
                            if( 1 === self.roomsWaiting() ) {
                                setSingle( self.roomsWaitingArray()[0]._id  );
                            } else {
                                Y.doccirrus.modals.selectRoom.show( true, false, null, function( room ) {
                                    var
                                        roomName = room.data;
                                    setSingle( roomName );
                                } );
                            }
                        }
                    }
                }
            } );

            self.calledListTableBtnBackTreatment = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_TREATMENT',
                    text: i18n( 'CalendarMojit.tab_called-list.button.TREATMENT' ),
                    disabled: ko.computed( function() {
                                return 1 >= self.roomsTreatment();
                            } ),
                    click: function() {
                        var
                            componentColumnCheckbox = calledListTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked(),
                            isEqual, filteredArray;

                        function setSingle( roomName ) {
                            jQuery
                                .when.apply( jQuery, checked.map( function( schedule, index ) {
                                schedule.roomId = roomName;
                                schedule.orderInRoom = '';
                                Y.doccirrus.jsonrpc.api.calevent.updateRoomAppointments( {
                                    data: {
                                        appointments: [schedule]
                                    }
                                } )
                                    .then( function() {
                                        if( index === checked.length - 1 ) {
                                            self.load();
                                        }
                                    })
                                    .fail( fail );
                            } ) );
                        }
                        if( 0 < checked.length ) {
                            isEqual = checked.every( function(val, i, arr){ return val.roomId === arr[0].roomId; } );
                            if( isEqual ) {
                                filteredArray = self.roomsTreatmentArray().filter( function( item ) {
                                    return checked[0].roomId !== item._id;
                                });
                                if( 1 === filteredArray.length ) {
                                    setSingle( filteredArray[0]._id  );
                                } else {
                                    Y.doccirrus.modals.selectRoom.show( false, false, checked[0].roomId, function( room ) {
                                        var
                                            roomName = room.data;
                                        setSingle( roomName );
                                    } );
                                }
                            } else if( 1 === self.roomsTreatment() ) {
                                setSingle( self.roomsTreatmentArray()[0]._id  );
                            } else {
                                Y.doccirrus.modals.selectRoom.show( false, false, null, function( room ) {
                                    var
                                        roomName = room.data;
                                    setSingle( roomName );
                                } );
                            }
                        }
                    }
                }
            } );

            self.calledListTableBtnClose = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_END',
                    text: i18n( 'CalendarMojit.tab_called-list.button.END' ),
                    click: function() {
                        var componentColumnCheckbox = calledListTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked(),
                            schedule;

                        switch( checked.length ) {
                            case 0:
                                Y.doccirrus.DCWindow.notice( { message: i18n( 'CalendarMojit.tab_called-list.messages.NO_APPOINTMENT_CHOSEN' ) } );
                                return;
                            case 1:
                                schedule = checked[0];
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
                                    })
                                    .fail( fail )
                                    .always( function() {
                                        componentColumnCheckbox.uncheck( schedule );
                                        self.load();
                                    } );
                                return;
                            default:
                                Y.doccirrus.DCWindow.notice( {
                                    message: i18n( 'CalendarMojit.tab_called-list.messages.END_ALL_APPOINTMENTS' ),
                                    window: {
                                        buttons: {
                                            footer: [
                                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                                    isDefault: true,
                                                    action: function( e ) {
                                                        var
                                                            notice = this;

                                                        e.target.button.disable();

                                                        jQuery
                                                            .when.apply( jQuery, checked.map( function( item ) {
                                                            schedule = item;
                                                            return binderViewModel.endAppointment( {
                                                                _id: schedule._id,
                                                                calendar: schedule.calendar._id ? (schedule.calendar._id._id || schedule.calendar._id) : schedule.calendar // ;D
                                                            } )
                                                                .then( function() {
                                                                    item.roomId = '';
                                                                    item.orderInRoom = '';
                                                                    Y.doccirrus.jsonrpc.api.calevent.updateRoomAppointments( {
                                                                        data: {
                                                                            appointments: [item]
                                                                        }
                                                                    } )
                                                                        .fail( fail );
                                                                });
                                                        } ) )
                                                            .fail( fail )
                                                            .always( function() {
                                                                componentColumnCheckbox.uncheckAll();
                                                                self.load();
                                                                notice.hide( e );
                                                            } );
                                                    }
                                                } )
                                            ]
                                        }
                                    }
                                } );
                                return;
                        }
                    }
                }
            } );
            /*
             * This method is not used anywhere
             */
            self.calledListTableBtnDelete = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_DELETE',
                    text: i18n( 'CalendarMojit.tab_called-list.button.DELETE' ),
                    click: function() {
                        var componentColumnCheckbox = calledListTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked();
                        switch( checked.length ) {
                            case 0:
                                Y.doccirrus.DCWindow.notice( { message: i18n( 'CalendarMojit.tab_called-list.messages.NO_APPOINTMENT_CHOSEN' ) } );
                                return;
                            default:
                                Y.doccirrus.DCWindow.notice( {
                                    message: i18n( 'CalendarMojit.tab_called-list.messages.DELETE_ALL_SELECTED_DATES' ),
                                    window: {
                                        buttons: {
                                            footer: [
                                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                                    isDefault: true,
                                                    action: function( e ) {
                                                        var notice = this;
                                                        e.target.button.disable();

                                                        jQuery
                                                            .when.apply( jQuery, checked.map( function( item ) {
                                                            return Y.doccirrus.jsonrpc.api.calevent.delete( {
                                                                query: { _id: item._id },
                                                                data: {
                                                                    eventType: Y.doccirrus.schemas.calendar.getEventType( item ),
                                                                    start: item.start
                                                                }
                                                            } );
                                                        } ) )
                                                            .fail( fail )
                                                            .always( function() {
                                                                self.load();
                                                                notice.hide( e );
                                                            } );
                                                    }
                                                } )
                                            ]
                                        }
                                    }
                                } );
                                return;
                        }
                    }
                }
            } );

        },
        /**
         * Map of global events attached to
         */
        _globalEvents: null,
        /**
         * Attach to global events
         */
        attachToGlobalEvents: function TabCalledListViewModel_attachToGlobalEvents() {
            var
                self = this;

            if( !self._globalEvents ) {
                self._globalEvents = {};
            }

            self._globalEvents.appointmentModified = Y.after( 'appointmentModified', self.appointmentModifiedHandler, self );
        },
        /**
         * Detach to global events
         */
        detachFromGlobalEvents: function TabCalledListViewModel_detachFromGlobalEvents() {
            var
                self = this;

            if( self._globalEvents ) {
                Y.each( self._globalEvents, function( event, name ) {
                    event.detach();
                    delete self._globalEvents[name];
                } );
            }
        },
        /**
         * Handle global "appointmentModified"-event
         */
        appointmentModifiedHandler: function TabCalledListViewModel_appointmentModifiedHandler() {
            var
                self = this;

            if( self.calledListTable ) {
                self.load();
            }

        },
        setSocketListeners: function() {
            var self = this,
                calendarFilteredIds;

            self.myCalendarListener = Y.doccirrus.communication.on( {
                event: 'calendar.refresh',
                done: function handleAction( response ) {

                    calendarFilteredIds = binderViewModel.calendarFilteredIds();
                    if( response && response.data && calendarFilteredIds.indexOf( response.data[0] ) !== -1 ) {

                        //  do not reload multiple times in parallel
                        if ( true === self.isLoading ) { return; }

                        //  timeout is due to duplicated websocket events on the server during realignment
                        //  of schedules - we must wait a little for the process to settle to avoid repeated
                        //  queries for updated data, until server-side process can be corrected in a
                        //  subsequent version - MOJ-10764

                        //  TODO: remove this timeout when possible

                        self.isLoading = true;
                        window.setTimeout( function() { self.reloadMerged(); }, self.socketReloadDelay );
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
                        delete self.patientStubs[ updatedPatientId ];
                        self.reloadMerged();
                    }
                }
            } );
        },

        //  Reload from server and merge with current table data, MOJ-10764
        reloadMerged: function() {
            var
                self = this;

            if ( !self || !self.calledListTable || !self.calledListTable ) { return; }

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

            async.series( [populateCalendars, getPatientIdsFromConferences, downloadPatientStubs, mixPatientStubs], onAllDone );

            //  1. Populate calendars from binder
            function populateCalendars( itcb ) {
                let i, binderCalendar, mergedCalendars;
                for( i = 0; i < data.length; i++ ) {

                    data[i].patTitle = data[i].title;

                    mergedCalendars = [];
                    if( 'string' === typeof data[i].calendar ) {
                        binderCalendar = findCalendar( data[i].calendar );
                        data[i].calendar = binderCalendar ? binderCalendar : calNotFound;
                        data[i].calendarNames = binderCalendar ? [binderCalendar._id.name] : [calNotFound];
                    }
                    if( Array.isArray( data[i].calendar ) ) { // for merged appointments with resources
                        data[i].calendar.forEach( function( id ) { // eslint-disable-line no-loop-func
                            binderCalendar = findCalendar( id );
                            if( !mergedCalendars.find( function( item ) { return item._id._id === id; } ) ) {
                                mergedCalendars.push( binderCalendar ? binderCalendar : calNotFound );
                            }
                        } );
                        data[i].calendar = mergedCalendars[0];
                        data[i].calendarNames = mergedCalendars.map( function( item ) { return item._id.name; } );
                    }
                }
                itcb( null );
            }

            function findCalendar( calendarId ) {
                let i;
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
                    'query': { '_id': { '$in': getPatientStubs } },
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
                    if( !patientId ) {
                        continue;
                    }
                    if( 'string' === typeof patientId && self.patientStubs[patientId] ) {
                        data[i].patient = self.patientStubs[patientId];
                    }

                    data[i].patTitle = Y.doccirrus.schemas.calendar.buildScheduleTitle( {
                        event: data[i],
                        patient: data[i].patient,
                        scheduletype: data[i].scheduletypePopulated,
                        patientFormatter: function( stringPatient, patient ) {
                            if( patient ) {
                                return Y.doccirrus.schemas.person.personDisplay( patient );
                            } else {
                                return stringPatient;
                            }
                        }
                    } ) || '';
                    data[i].patientDob = data[i].patient.kbvDob;
                    data[i].patientNo = data[i].patient.patientNo;
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
        registerNode: function tab_calledList_registerNode( node ) {

            viewModel = new TabCalledListViewModel();

            ko.applyBindings( viewModel, node.getDOMNode() );

            viewModel.attachToGlobalEvents();
            binderViewModel.currentView( viewModel );

        },

        deregisterNode: function tab_calledList_deregisterNode( node ) {
            clearInterval( rerenderInterval );
            viewModel.detachFromGlobalEvents();

            //  clear / unsubsubscribe hotkeys

            viewModel.calledListTable.getComponentColumnCheckbox().uncheckAll();
            ko.cleanNode( node.getDOMNode() );

            //  clean up viewmodel, unsubscribe hotkeys, MOJ-7531
            viewModel.destroy();
        }
    };
};
