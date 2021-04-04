/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, nomen:true*/
/*jshint latedef:false */
/*global YUI, moment, ko, jQuery, _, $ */

YUI.add( 'CalendarMojitBinderIndex', function( Y, NAME ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        DCQuery = Y.doccirrus.DCQuery,
        getObject = Y.doccirrus.commonutils.getObject;

    /**
     * default error notifier
     * @param {Object|String} response
     */
    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }

    }

    /**
     * read scheduletype objects from server for a given calendar id
     * @param {String} calendarId
     * @return {jQuery.Deferred}
     */
    function readScheduletypesForCalendarId( calendarId ) {
        return Y.doccirrus.jsonrpc.api.scheduletype
            .readScheduletypesForCalendarId( { calendarId: calendarId } )
            .then( function( response ) {
                return response && response.data || [];
            } );
    }

    /**
     * read scheduletype objects from server for a given calendar id
     * @param {String} calendarId
     * @param {String} [scheduletypeId]
     * @return {jQuery.Deferred}
     */
    function doesCalendarAcceptScheduletypeId( calendarId, scheduletypeId ) {
        return Y.doccirrus.jsonrpc.api.calendar
            .doesCalendarAcceptScheduletypeId( { calendarId: calendarId, scheduletypeId: scheduletypeId } )
            .then( function( response ) {
                return response && response.data;
            } );
    }

    /**
     * validate a calevent object from server
     * @param {Object} calevent
     * @return {jQuery.Deferred}
     */
    function validateCaleventData( calevent ) {
        return Y.doccirrus.jsonrpc.api.calevent
            .validateCaleventData( { calevent: calevent } )
            .then( function( response ) {
                return response && response.data && response.data.errors || [];
            } );
    }

    function publishState( id, eventToFire ) {
        var
            view = 'details',
            params = {
                id: id
            };

        Y.fire( eventToFire, {}, {
            view: view,
            params: params
        } );
    }

    /**
     *
     * @param {Function} showPastAppointments - ko.observable with Boolean value
     * @constructor
     */
    function AppointmentSearchModel( showPastAppointments ) {
        var
            self = this;

        self.select2SearchConfig = {
            select2: {
                width: '100%',
                placeholder: i18n( 'CalendarMojit.calendar.placeholder.SEARCH' ),
                minimumInputLength: 1,
                ajax: {
                    url: Y.doccirrus.infras.getPrivateURL( '/1/calevent' ),
                    params: {
                        xhrFields: {
                            withCredentials: true
                        }
                    },
                    dataType: 'json',
                    data: function AppointmentSearchModel_select2SearchConfig_data( term ) {
                        if( showPastAppointments() ) {
                            return {
                                calendarType: 'real',
                                dateTo: moment().toJSON(),
                                limit: 10,
                                show: 'location',
                                fullText: term
                            };
                        } else {
                            return {
                                calendarType: 'real',
                                dateFrom: 'now',
                                duration: 'all',
                                limit: 10,
                                show: 'location',
                                fullText: term
                            };
                        }
                    },
                    quietMillis: 200,
                    results: function AppointmentSearchModel_select2SearchConfig_results( response ) {
                        var
                            data = response.data,
                            results = Array.isArray( data ) && data.length && data.map( function AppointmentSearchModel_select2SearchConfig_results_map( item ) {
                                    var
                                        text = [
                                            moment( item.start ).format( 'DD.MM.YYYY HH:mm: ' ),
                                            item.title,
                                            ', ',
                                            item.calendar.name || i18n( 'CalendarMojit.AppointmentSearchModel.calendarNoName' )
                                        ].join( '' );

                                    return {
                                        id: String( item._id ) + String( item.start ) + String( item.scheduleId ),
                                        text: text,
                                        data: item
                                    };
                                } ) || [];

                        return {
                            results: results
                        };
                    }
                }
            },
            init: function AppointmentSearchModel_select2SearchConfig_init( element ) {
                jQuery( element ).on( 'select2-selected', function AppointmentSearchModel_select2SearchConfig_init_selected( $event ) {
                    self.onSelected( $event.choice.data );
                    jQuery( element ).data( 'select2' ).val( '' );
                } );
            }
        };
    }

    /**
     * Callback to be executed with selected data from the list
     * @method onSelected
     * @param {Object} data
     */
    AppointmentSearchModel.prototype.onSelected = function AppointmentSearchModel_onSelected( /*data*/ ) {

    };

    /**
     * This views BinderViewModel
     * @constructor
     */
    function BinderViewModel() {
        BinderViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( BinderViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function BinderViewModel_initializer() {
            var
                self = this;

            self.screenWidth = Y.doccirrus.utils.getBootstrapScreenWidthComputed();
            self.isFrameView = ko.observable( Y.doccirrus.commonutils.isFrameView() );

            self.onGroupClick = self.onGroupClick.bind( self );
            self.onCalendarClick = self.onCalendarClick.bind( self );

            self._initKoTableRenderer();
            self._initCurrentView();
            self._initShowPastAppointments();
            self._initAppointmentSearch();
            self._initSlotDuration();
            self._initCalendars();
            self._initGroupSelector();
            self._initCalendarSelector();
            self._initSubNavigation();
            self._initSeverityColorMap();
            //translates
            self.calendarSelectorGroupI18n = i18n( 'CalendarMojit.CalendarSelector.group.text' );
            self.calendarSelectorToggerI18n = i18n( 'CalendarMojit.CalendarSelector.toggler.text' );
            self.calendarSelectorCalendarI18n = i18n( 'CalendarMojit.CalendarSelector.calendar.text' );
            self.searchForAppoinmentI18n = i18n( 'CalendarMojit.calendar.button.SEARCH_FOR_APPOINTMENT' );
            self.pastAppointmentsI18n = i18n( 'CalendarMojit.calendar.text.PAST_APPOINTMENTS' );
            self.slotMinBtnI18n = i18n( 'CalendarMojit.calendar.title_attribute.SLOTMINBTN' );
            
            /**
             * The current view is displayed as full screen
             * @type {null|ko.observable}
             */
            /** @protected */
            self.titleViewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;
            Y.doccirrus.DCBinder.initToggleFullScreen();
        },
        /** @protected */
        destructor: function BinderViewModel_destructor() {
            Y.log( 'Destroying calendar binder.', 'debug', NAME );
        },
        hotKeysGroup: null,

        severityColorMap: ko.observableArray(),
        severityStyle: document.createElement( 'style' ),

        _initKoTableRenderer: function BinderViewModel__initKoTableRenderer() {

            var self = this;

            self.insuranceStatusTypeRenderer = function( meta ) {
                var
                    data = meta.row,
                    insuranceStatus = Y.doccirrus.commonutils.getObject( 'patient.insuranceStatus', false, data ),
                    woCardState = Y.doccirrus.commonutils.getObject( 'patient.insuranceWOCard', false, data );

                if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                    return insuranceStatus.filter( function( entry ) {
                        return !entry.doNotShowInsuranceInGadget;
                    } ).map( function( entry ) {
                        var
                            CARD_PULLED_THROUGH,
                            CARD_PULLED_THROUGH_NOT,
                            CARD_NA,
                            color,
                            title,
                            cardSwipeIcon,
                            insuranceAbbrev = Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_Abbrev_E', entry.type, 'i18n', '' );

                        if( 'PUBLIC' === entry.type ) {
                            CARD_PULLED_THROUGH = i18n( 'InCaseMojit.casefile_browser.title_attribute.CARD_PULLED_THROUGH' );
                            CARD_PULLED_THROUGH_NOT = i18n( 'InCaseMojit.casefile_browser.title_attribute.CARD_PULLED_THROUGH_NOT' );
                            CARD_NA = i18n( 'InCaseMojit.casefile_browser.title_attribute.CARD_NA' );

                            color = entry.cardSwipe ? 'green' : woCardState ? 'orange' : 'red';
                            title = entry.cardSwipe ? CARD_PULLED_THROUGH : woCardState ? CARD_NA : CARD_PULLED_THROUGH_NOT;
                            cardSwipeIcon = '<span class="glyphicon glyphicon-tag" title="' + title + '" style="vertical-align: middle; color: ' + color + ';"></span>';
                            insuranceAbbrev += (' ' + cardSwipeIcon);
                        }

                        return insuranceAbbrev;
                    } ).join( ', ' );
                }

                return '';
            };

        },

        _initSeverityColorMap: function BinderViewModel_initSeverityColorMap() {
            var
                self = this,
                severityMap = self.get( "severityMap" ),
                none = {
                    color: "transparent",
                    severity: "NONE"
                };

            self.severityColorMap = [];

            self.severityColorMap.push( none );
            Object.keys( severityMap ).forEach( function( prop ) {
                self.severityColorMap.push( severityMap[prop] );
            } );

        },
        /**
         * May hold main sub navigation
         * @type {null|KoNav}
         */
        subNavigation: null,
        /**
         * initialize main sub navigation
         * @private
         */
        _initSubNavigation: function BinderViewModel__initSubNavigation() {
            var
                self = this,
                rootPath = Y.doccirrus.utils.getUrl( 'calendar' );

            function handleTab( tabName, callback ) {
                var node = document.querySelector( "#upperDiv" );
                if( node ) {
                    ko.cleanNode( node );
                }
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    'CalendarMojit',
                    {},
                    Y.one( node ),
                    function() {
                        var tab = self.subNavigation.getItemByName( tabName );
                        if( tab ) {
                            tab.active( true );
                        }
                        if( callback ) {
                            callback.apply( undefined, arguments );
                        }
                    }
                );
            }

            self.subNavigation = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: Y.doccirrus.ItemsTabFactory.createCalendarNavItems( { rootPath: rootPath } )
                }
            } );

            var router =
                self.router = new Y.doccirrus.DCRouter( {
                    root: rootPath,
                    routes: [
                        {
                            path: '/',
                            callbacks: function BinderViewModel_Router_callback_root( req ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow calendar route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'tab_calendar' );
                            }
                        },
                        {
                            path: /^\/schedule\/*([^\/]*)*\/*([^\/]*)*$/,
                            callbacks: function( req ) {
                                var id = req.params[1] || null;
                                handleTab( 'tab_calendar', publishState.bind( this, id, 'tab_calendar-state' ) );
                            }
                        },
                        {
                            path: '/calendar',
                            callbacks: function BinderViewModel_Router_callback_calendar( req ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow calendar route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'tab_calendar' );
                            }
                        },
                        {
                            path: '/waiting-list',
                            callbacks: function BinderViewModel_Router_callback_waitingList( req ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow waiting-list route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'tab_waiting-list' );
                            }
                        },
                        {
                            path: '/called-list',
                            callbacks: function BinderViewModel_Router_callback_calledList( req ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow called-list route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'tab_called-list' );
                            }
                        },
                        {
                            path: '/graphic-waiting-list',
                            callbacks: function BinderViewModel_Router_callback_graphicWaitingList( req ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow waiting-list route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'tab_graphic-waiting-list' );
                            }
                        },
                        {
                            path: '/reports',
                            callbacks: function BinderViewModel_Router_callback_reports( req ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow reports route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'tab_reports' );
                            }
                        },
                        {
                            path: '/resources',
                            callbacks: function BinderViewModel_Router_callback_resources( req ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow resources route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'tab_resources' );
                            }
                        }
                    ]
                } );

            //  Set the default hash fragment, or action the route if one is given

            var routeTo = location.href.split( rootPath.replace( /^\//, '' ) + '#' );
            routeTo = ( routeTo.length < 2) ? '/' : routeTo[1];

            Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
            router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = router.getPath();
            Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );

        },
        /**
         * May hold the AppointmentSearchModel
         * @type {null|AppointmentSearchModel}
         */
        appointmentSearch: null,
        /**
         * Determines visibility of the appointment search
         * @type {null|ko.computed}
         */
        appointmentSearchVisible: null,
        /** @protected */
        _initAppointmentSearch: function BinderViewModel__initAppointmentSearch() {
            var
                self = this;

            self.appointmentSearchVisible = ko.computed( function BinderViewModel__initAppointmentSearch_appointmentSearchVisible_computed() {
                var
                    currentViewName = self.currentViewName();

                if( currentViewName ) {
                    switch( currentViewName ) {
                        case 'tab_calendar' :
                        case 'tab_waiting-list' :
                        case 'tab_graphic-waiting-list' :
                        case 'tab_called-list' :
                            return true;
                    }
                }

                return false;
            } );

            self.appointmentSearch = new AppointmentSearchModel( self.showPastAppointments );
            self.appointmentSearch.onSelected = function BinderViewModel__initAppointmentSearch_appointmentSearch_onSelected( data ) {

                self
                    .readAppointment( data )
                    .done( function BinderViewModel__initAppointmentSearch_appointmentSearch_onSelected_readAppointment_done( schedule ) {

                        // TODO: [Bug] MOJ-4586: calevent.index to determine event position in a repetition not served always
                        self
                            .showAppointmentAdministrationWindow( schedule )
                            .after( {
                                edit: function BinderViewModel__initAppointmentSearch_showAppointmentAdministrationWindow_edit( /*data === schedule*/ ) {
                                    self
                                        .showAppointmentDialog( schedule );
                                }
                            } );
                    } );
            };
        },
        /**
         * Reads location from filter
         * @return {undefined|String}
         */
        readLocationFilter: function BinderViewModel_readLocationFilter() {
            var
                filter = Y.doccirrus.utils.getFilter();

            if( Y.Lang.isObject( filter ) && filter.location ) {
                return filter.location;
            }
            return undefined;
        },
        /**
         * Get localStorage data associated with this mojit
         * @param {String} propertyName
         * @return {undefined|*}
         */
        getLocalStorageValueForMojit: function BinderViewModel_getLocalStorageValueForMojit( propertyName ) {
            var
                localValue = Y.doccirrus.utils.localValueGet( 'CalendarMojit' );

            if( '' === localValue ) { // localValue seems to be unset
                return undefined;
            } else {
                localValue = JSON.parse( localValue );
            }
            return Y.doccirrus.commonutils.getObject( propertyName, localValue );
        },
        /**
         * Set localStorage data associated with this mojit
         * @param {String} propertyName
         * @param {*} value
         */
        setLocalStorageValueForMojit: function BinderViewModel_setLocalStorageValueForMojit( propertyName, value ) {
            var
                localValue = Y.doccirrus.utils.localValueGet( 'CalendarMojit' );

            if( '' === localValue ) { // localValue seems to be unset
                localValue = {};
            } else {
                localValue = JSON.parse( localValue );
            }
            Y.doccirrus.commonutils.setObject( propertyName, value, localValue );
            Y.doccirrus.utils.localValueSet( 'CalendarMojit', localValue );
        },
        /**
         * Determines if visible calendars were already set in localStorage
         * @return {boolean}
         */
        initialCalendarsVisible: function BinderViewModel_initialCalendarsVisible() {
            var
                self = this;

            return !self.getLocalStorageValueForMojit( 'calendarsVisible' );
        },
        /**
         * Read visible calendars from localStorage
         * @return {Array}
         */
        readCalendarsVisible: function BinderViewModel_readCalendarsVisible() {
            var
                self = this,
                calendarsVisible = self.getLocalStorageValueForMojit( 'calendarsVisible' );

            if( Y.Lang.isUndefined( calendarsVisible ) ) {
                self.setLocalStorageValueForMojit( 'calendarsVisible', [] );
            }

            return self.getLocalStorageValueForMojit( 'calendarsVisible' ) || [];
        },
        /**
         * Write visible calendars to localStorage
         * @param {Array} calendarsVisible
         */
        writeCalendarsVisible: function( calendarsVisible ) {
            var
                self = this;

            self.setLocalStorageValueForMojit( 'calendarsVisible', calendarsVisible );
        },
        /**
         * Determines if visible groups were already set in localStorage
         * @return {boolean}
         */
        initialGroupsVisible: function() {
            var
                self = this;

            return !self.getLocalStorageValueForMojit( 'groupsVisible' );
        },
        /**
         * Read visible groups from localStorage
         * @return {Array}
         */
        readGroupsVisible: function() {
            var
                self = this,
                groupsVisible = self.getLocalStorageValueForMojit( 'groupsVisible' );

            if( Y.Lang.isUndefined( groupsVisible ) ) {
                self.setLocalStorageValueForMojit( 'groupsVisible', [] );
            }

            return self.getLocalStorageValueForMojit( 'groupsVisible' ) || [];
        },
        /**
         * Write visible groups to localStorage
         * @param {Array} groupsVisible
         */
        writeGroupsVisible: function() {
            var
                self = this,
                groupsVisible = self.calendarGroups().filter( function( group ) {
                    return group.checked();
                } ).map( function( group ) {
                    return group.name;
                } );

            self.setLocalStorageValueForMojit( 'groupsVisible', groupsVisible );
        },
        /**
         * Read calendar slot duration from localStorage
         * @return {String}
         */
        readSlotDuration: function BinderViewModel_readSlotDuration() {
            var
                self = this,
                slotDuration = self.getLocalStorageValueForMojit( 'slotDuration' );

            if( Y.Lang.isUndefined( slotDuration ) ) {
                self.setLocalStorageValueForMojit( 'slotDuration', '00:05' );
            }

            return self.getLocalStorageValueForMojit( 'slotDuration' ) || '00:05';
        },
        /**
         * Write calendar slot duration to localStorage
         * @param {String} slotDuration
         */
        writeSlotDuration: function BinderViewModel_writeSlotDuration( slotDuration ) {
            var
                self = this;

            self.setLocalStorageValueForMojit( 'slotDuration', slotDuration );
        },
        /**
         * Read calendar default view from localStorage
         * @return {String}
         */
        readDefaultView: function BinderViewModel_readDefaultView() {
            var
                self = this,
                defaultView = self.getLocalStorageValueForMojit( 'defaultView' );

            if( Y.Lang.isUndefined( defaultView ) ) {
                self.setLocalStorageValueForMojit( 'defaultView', 'agendaWeek' );
            }

            return self.getLocalStorageValueForMojit( 'defaultView' ) || 'agendaWeek';
        },
        /**
         * Write calendar default view to localStorage
         * @param {String} defaultView
         */
        writeDefaultView: function BinderViewModel_writeDefaultView( defaultView ) {
            var
                self = this;

            self.setLocalStorageValueForMojit( 'defaultView', defaultView );
        },
        /**
         * Read if consult times should be shown combined in the calendar from localStorage
         * @return {boolean}
         */
        readShowCombinedConsultTimes: function BinderViewModel_readShowCombinedConsultTimes() {
            var
                self = this,
                showCombinedConsultTimes = self.getLocalStorageValueForMojit( 'showCombinedConsultTimes' );

            if( Y.Lang.isUndefined( showCombinedConsultTimes ) ) {
                self.setLocalStorageValueForMojit( 'showCombinedConsultTimes', true );
            }

            return self.getLocalStorageValueForMojit( 'showCombinedConsultTimes' );
        },
        /**
         * Write if consult times should be shown combined in the calendar to localStorage
         * @param {boolean} showCombinedConsultTimes
         */
        writeShowCombinedConsultTimes: function BinderViewModel_writeShowCombinedConsultTimes( showCombinedConsultTimes ) {
            var
                self = this;

            self.setLocalStorageValueForMojit( 'showCombinedConsultTimes', showCombinedConsultTimes );
        },
        /**
         * Read if consult times should be shown separately in the calendar from localStorage
         * @return {boolean}
         */
        readShowConsultTimes: function BinderViewModel_readShowConsultTimes() {
            var
                self = this,
                showConsultTimes = self.getLocalStorageValueForMojit( 'showConsultTimes' );

            if( Y.Lang.isUndefined( showConsultTimes ) ) {
                self.setLocalStorageValueForMojit( 'showConsultTimes', false );
            }

            return self.getLocalStorageValueForMojit( 'showConsultTimes' ) || false;
        },
        /**
         * Write if consult times should be shown separately in the calendar from localStorage
         * @param {boolean} showConsultTimes
         */
        writeShowConsultTimes: function BinderViewModel_writeShowConsultTimes( showConsultTimes ) {
            var
                self = this;

            self.setLocalStorageValueForMojit( 'showConsultTimes', showConsultTimes );
        },
        /**
         * Read if close times should be shown separately in the calendar from localStorage
         * @return {boolean}
         */
        readShowCloseTimes: function BinderViewModel_readShowCloseTimes() {
            var
                self = this,
                showCloseTimes = self.getLocalStorageValueForMojit( 'showCloseTimes' );

            if( Y.Lang.isUndefined( showCloseTimes ) ) {
                self.setLocalStorageValueForMojit( 'showCloseTimes', false );
            }

            return self.getLocalStorageValueForMojit( 'showCloseTimes' ) || false;
        },
        /**
         * Write if close times should be shown separately in the calendar from localStorage
         * @param {boolean} showCloseTimes
         */
        writeShowCloseTimes: function BinderViewModel_writeShowCloseTimes( showCloseTimes ) {
            var
                self = this;

            self.setLocalStorageValueForMojit( 'showCloseTimes', showCloseTimes );
        },
        /**
         * Flag to show past appointments in appointmentSearch
         * @type {null|ko.observable}
         */
        showPastAppointments: null,
        /** @protected */
        _initShowPastAppointments: function () {
            var
                self = this;

            self.showPastAppointments = ko.observable( self.readShowPastAppointments() );
            self.addDisposable( ko.computed( function() {
                self.writeShowPastAppointments( self.showPastAppointments() );
                self._initAppointmentSearch();
            } ) );
        },
        /**
         * Read showPastAppointments from localStorage
         * @return {String}
         */
        readShowPastAppointments: function () {
            var
                self = this,
                showPastAppointments = self.getLocalStorageValueForMojit( 'showPastAppointments' );

            if( Y.Lang.isUndefined( showPastAppointments ) ) {
                self.setLocalStorageValueForMojit( 'showPastAppointments', false );
            }

            return self.getLocalStorageValueForMojit( 'showPastAppointments' ) || false;
        },
        /**
         * Write showPastAppointments to localStorage
         * @param {String} showPastAppointments
         */
        writeShowPastAppointments: function ( showPastAppointments ) {
            var
                self = this;

            self.setLocalStorageValueForMojit( 'showPastAppointments', showPastAppointments );
        },
        /**
         * May Hold the current slot duration for the calendar
         * @type {null|ko.observable}
         */
        slotDuration: null,
        /**
         * Computes the current slot duration for the calendar as minutes
         * @type {null|ko.computed}
         */
        slotDurationAsMinutes: null,
        /**
         * May Hold the List of slot durations for the calendar to pick from
         * @type {null|ko.observableArray}
         */
        slotDurationList: null,
        /** @protected */
        _initSlotDuration: function BinderViewModel__initSlotDuration() {
            var
                self = this;

            self.slotDuration = ko.observable( self.readSlotDuration() );
            self.slotDurationList = ko.observableArray( [
                { val: '00:01', i18n: i18n( 'CalendarMojit.slotDurationList.00:01.i18n' ) },
                { val: '00:05', i18n: i18n( 'CalendarMojit.slotDurationList.00:05.i18n' ) },
                { val: '00:10', i18n: i18n( 'CalendarMojit.slotDurationList.00:10.i18n' ) },
                { val: '00:15', i18n: i18n( 'CalendarMojit.slotDurationList.00:15.i18n' ) },
                { val: '00:20', i18n: i18n( 'CalendarMojit.slotDurationList.00:20.i18n' ) },
                { val: '00:30', i18n: i18n( 'CalendarMojit.slotDurationList.00:30.i18n' ) }
            ] );

            self.slotDurationAsMinutes = ko.computed( function BinderViewModel__initSlotDuration_slotDurationAsMinutes_computed() {
                var
                    slotDuration = self.slotDuration();

                self.writeSlotDuration( slotDuration );

                return moment.duration( slotDuration ).asMinutes();
            } );

        },
        /**
         * All calendars
         * @type {null|ko.observableArray}
         */
        calendars: null,
        /**
         * All calendar Ids of "calendars"
         * @type {null|ko.computed}
         */
        calendarIds: null,
        /**
         * All visible calendars
         * @type {null|ko.observableArray}
         */
        calendarsVisible: null,
        /**
         * All visible calendar Ids of "calendarsVisible"
         * @type {null|ko.computed}
         */
        calendarVisibleIds: null,
        /**
         * All calendars of "calendars" for current location filter
         * @type {null|ko.computed}
         */
        calendarsLocation: null,
        /**
         * All groups of calendars
         * @type {null|ko.observableArray}
         */
        calendarGroups: null,
        /**
         * Determine if group list should be opened
         * @type {null|Object
         */
        showGroupList: null,
        /**
         * Determine if calendar list should be opened
         * @type {null|Object
         */
        showCalendarList: null,
        /**
         * All calendar Ids of "calendars" for current location filter
         * @type {null|ko.computed}
         */
        calendarLocationIds: null,
        /**
         * All calendars to show events for ( ~ of "calendarsVisible" and for current location filter)
         * @type {null|ko.observableArray}
         */
        calendarsFiltered: null,
        /**
         * All calendar Ids to show events for ( ~ of "calendarsVisible" and for current location filter)
         * @type {null|ko.computed}
         */
        calendarFilteredIds: null,
        /** @protected */
        _initCalendars: function BinderViewModel__initCalendars() {
            var
                self = this,
                groups = [],
                groupsObj = [];

            self.calendarsLoaded = ko.observable( false );
            self.calendars = ko.observableArray();
            self.showGroupList = ko.observable( true );
            self.showCalendarList = ko.observable( true );
            self.calendarGroups = ko.observableArray();
            self.calendarIds = ko.computed( function BinderViewModel__initCalendars_calendarIds_computed() {
                var
                    result = ko.unwrap( self.calendars ).map( function BinderViewModel__initCalendars_calendarIds_map( calendar ) {
                        return calendar._id;
                    } );

                return result;
            } );
            self.calendarsVisible = ko.observableArray();
            self.calendarVisibleIds = ko.pureComputed( function BinderViewModel__initCalendars_calendarVisibleIds_computed() {
                var
                    name = Y.doccirrus.i18n( 'general.PAGE_TITLE.DOCCIRRUS' ),
                    result = ko.unwrap( self.calendarsVisible )
                        .filter( function(i){ return Boolean(i);})
                        .map( function BinderViewModel__initCalendars_calendarVisibleIds_computed_map( calendar ) {
                            name = calendar.name;
                            return calendar._id;
                        } );
                if( 1 === result.length ) {
                    document.title = name;
                } else {
                    document.title = Y.doccirrus.i18n( 'general.PAGE_TITLE.CALENDAR' );
                }
                if( self.router ) {
                    self.router.setTitle( window.location );
                }
                return result;
            } );
            self.calendarsLocation = ko.computed( function BinderViewModel__initCalendars_calendarsLocation_computed() {
                var
                    locationId = self.readLocationFilter(),
                    result = Y.Array.filter( ko.unwrap( self.calendars ), function BinderViewModel__initCalendars_calendarsLocation_computed_calendars_filter( calendar ) {

                        if( !Y.doccirrus.schemas.calendar.isDoctorCalendar( calendar._id ) ) {
                            return true;
                        }

                        if( locationId ) {
                            return locationId === calendar.locationId;
                        }
                        else {
                            return true;
                        }
                    } );

                return result;
            } );
            self.calendarLocationIds = ko.computed( function BinderViewModel__initCalendars_calendarLocationIds_computed() {
                var
                    result = ko.unwrap( self.calendarsLocation ).map( function BinderViewModel__initCalendars_calendarLocationIds_computed_calendarsLocation_map( calendar ) {
                        return calendar._id;
                    } );

                return result;
            } );
            self.calendarsFiltered = ko.observableArray(); // should stay an "observableArray", because of subscribe with 'arrayChange' to know exactly which entries have changed
            self.addDisposable( ko.computed( function BinderViewModel__initCalendars_calendarsFiltered_compute() {
                var
                    calendarVisibleIds = self.calendarVisibleIds(),
                    calendarsLocation = self.calendarsLocation(),
                    result = Y.Array.filter( calendarsLocation, function BinderViewModel__initCalendars_calendarsFiltered_compute_calendarsLocation_filter( calendarInLocation ) {
                        return calendarVisibleIds.indexOf( calendarInLocation._id ) !== -1;
                    } );

                self.calendarsFiltered( result );

            } ) );
            self.calendarFilteredIds = ko.computed( function () {
                var
                    result = ko.unwrap( self.calendarsFiltered ).map( function BinderViewModel__initCalendars_calendarFilteredIds_computed_calendarsFiltered_map( calendar ) {
                        return calendar._id;
                    } );

                return result;
            } );

            Y.doccirrus.jsonrpc.api.calendar
                .getPopulatedCalendar()
                .then( function( response ) {
                    return response.data || [];
                } )
                .then( function( calendars ) {
                    calendars.forEach( function( item ) {
                        if( item.calGroup ) {
                            item.calGroup.forEach( function( group ) {
                                if( -1 === groups.indexOf( group ) ) {
                                    groups.push( group );
                                    groupsObj.push( {
                                        name: group,
                                        calendars: [ item ],
                                        checked: ko.observable( false )
                                    } );
                                } else {
                                    groupsObj.find( function( obj ) {
                                        return group === obj.name;
                                    } ).calendars.push( item );
                                }
                            } );
                        }
                    } );

                    groupsObj.sort( function( a, b ) {
                        return a.name.localeCompare( b.name );
                    } );

                    calendars.sort( function ( a, b ) {
                        return a.name.localeCompare( b.name );
                    } );
                    return calendars;
                } )
                .done( function( calendars ) {
                    var
                        initialCalendars = self.initialCalendarsVisible(),
                        initialGroups = self.initialGroupsVisible(),
                        calendarsVisible = self.readCalendarsVisible(),
                        groupsVisible = self.readGroupsVisible();

                    self.calendars( calendars );

                    calendarsVisible.forEach( function( calId ) {
                        var cal;
                        if( calId ) {
                            cal = calendars.find( function( cal ) {
                                return cal._id === calId;
                            } );
                            if( cal ) {
                                self.calendarsVisible.push( cal );
                            }
                        }
                    } );

                    groupsObj.forEach( function( group ) {
                        group.checked( groupsVisible.indexOf( group.name ) !== -1 );
                    } );

                    self.calendarGroups( groupsObj );
                    self.calendarsVisible( self.calendarsVisible() );

                    self.addDisposable( ko.computed( function() {
                        self.writeCalendarsVisible( self.calendarsVisible().map( function ( calendar ) {
                            return calendar._id;
                        } ) );
                    } ) );

                    if( initialCalendars ) {
                        self.calendarsVisible( calendars );
                    }
                    if( initialGroups ) {
                        self.calendarGroups( groupsObj );
                    }

                    //  don't load tables until calendars are available, MOJ-10764
                    self.calendarsLoaded( true );
                } );
        },
        /**
         * Read appointment from server
         * @param {Object} parameters
         * @param {String} [parameters._id]
         * @param {String} [parameters.scheduleId]
         * @param {String} [parameters.start]
         * @param {String} [parameters.linkByResource]
         * @return {jQuery.Deferred}
         */
        readAppointment: function BinderViewModel_readAppointment( parameters ) {
            var
                params = {};

            if( parameters._id ) {
                params.query = { _id: parameters._id };
            }

            if( parameters.scheduleId ) {
                params.scheduleId = parameters.scheduleId;
            }

            if( parameters.start ) {
                params.start = parameters.start;
            }

            if( parameters.linkByResource ) {
                params.linkByResource = parameters.linkByResource;
            }

            // TODO: [Bug] MOJ-4586: calevent.index to determine event position in a repetition not served always
            return Y.doccirrus.jsonrpc.api.calevent
                .read( params )
                .then( function BinderViewModel_readAppointment_then_response( response ) {
                    return response.data && response.data[0] || null;
                } )
                .fail( fail );
        },
        /**
         * Create appointment on server
         * @param {Object} data
         * @return {jQuery.Deferred}
         */
        createAppointment: function BinderViewModel_createAppointment( data ) {
            data = Y.clone( data, true );
            var
                isAdHoc = Boolean( data.adhoc );

            if( 'NONE' === data.repetition ) {
                delete data.dtstart;
                delete data.until;
            }

            if( !isAdHoc ) {
                if( !data.allDay ) {
                    data.plannedDuration = data.duration;
                } else {
                    data.end = moment( data.start ).add( 23, 'hours' ).add( 59, 'minutes' ).toISOString();
                }
            }
            return Y.doccirrus.jsonrpc.api
                .calevent.create( {
                    data: data
                } );
        },
        /**
         * Update appointment on server
         * @param {Object} data
         * @return {jQuery.Deferred}
         */
        updateAppointment: function BinderViewModel_updateAppointment( data ) {
            data = Y.clone( data, true );
            var
                query,
                isAdHoc = Boolean( data.adhoc ),
                params = {
                    isManualChange: true
                };

            if( !data.lastEditor ) {
                data.lastEditor = null;
                data.lastEditDate = new Date();
            }

            if( data._id ) {
                query = { _id: data._id };
            }

            if( !isAdHoc ) {

                if( !data.allDay ) {
                    data.plannedDuration = data.duration;
                } else {
                    data.end = moment( data.start ).add( 23, 'hours' ).add( 59, 'minutes' ).toISOString();
                }

            }

            return Y.doccirrus.jsonrpc.api
                .calevent.update( {
                    query: query,
                    data: Y.merge( data, params ),
                    fields: Y.Array.reject( Object.keys( data ), function( key ) {
                        switch( key ) {
                            case '_id':
                                return true;
                        }
                        return false;
                    } )
                } );
        },
        /**
         * Read next appointment from server
         * @method readTopAppointment
         * @param {Object} [parameters]
         * @param {String} [parameters.location]
         * @return {jQuery.Deferred}
         */
        readTopAppointment: function BinderViewModel_readTopAppointment( parameters ) {

            return jQuery.ajax( {
                type: 'POST',
                xhrFields: { withCredentials: true },
                url: Y.doccirrus.infras.getPrivateURL( 'r/calculateschedule' ),
                contentType: 'application/json',
                data: JSON.stringify( Y.merge( {
                    action: 'calculateschedule',
                    subaction: 'TOP_EVT'
                }, parameters ) )
            } );
        },
        getRooms: function BinderViewModel_getRooms( parameters ) {
            var
                params = {};

            if( parameters.roomType ) {
                params.query = { roomType: parameters.roomType };
            }

            return Y.doccirrus.jsonrpc.api.room
                .getRoomsWithCountedSchedules( params )
                .then( function BinderViewModel_getRooms_then_response( response ) {
                    return response && response.data || null;
                } )
                .fail( fail );
        },
        /**
         * Get a new empty number appointment from server to use as a next appointment to create
         * @method getNewNextNumberAppointment
         * @param {Object} [parameters]
         * @param {String} [parameters.location]
         * @return {jQuery.Deferred}
         */
        getNewNextNumberAppointment: function BinderViewModel_getNewNextNumberAppointment( parameters ) {

            return jQuery.ajax( {
                type: 'POST',
                xhrFields: { withCredentials: true },
                url: Y.doccirrus.infras.getPrivateURL( 'r/calculateschedule' ),
                contentType: 'application/json',
                data: JSON.stringify( Y.merge( {
                    action: 'calculateschedule',
                    subaction: 'NEXT_NUM'
                }, parameters ) )
            } );
        },
        /**
         * Moves an appointment to the waiting list on server
         * @method moveAppointmentToWaitingList
         * @param {Object} parameters
         * @param {String} parameters._id
         * @param {Number} parameters.plannedDuration
         * @param {Number} parameters.duration
         * @param {String} parameters.eta
         * @return {jQuery.Deferred}
         */
        moveAppointmentToWaitingList: function BinderViewModel_moveAppointmentToWaitingList( parameters ) {

            return jQuery.ajax( {
                type: 'POST',
                xhrFields: { withCredentials: true },
                url: Y.doccirrus.infras.getPrivateURL( 'r/calculateschedule' ),
                contentType: 'application/json',
                data: JSON.stringify( Y.merge( {
                    action: 'calculateschedule',
                    subaction: 'TO_WAITING_LIST'
                }, parameters ) )
            } );
        },
        /**
         * End an appointment on server
         * @method endAppointment
         * @param {Object} parameters
         * @param {String} parameters._id
         * @param {String} parameters.calendar
         * @return {jQuery.Deferred}
         */
        endAppointment: function BinderViewModel_endAppointment( parameters ) {

            return jQuery.ajax( {
                type: 'POST',
                xhrFields: { withCredentials: true },
                url: Y.doccirrus.infras.getPrivateURL( 'r/calculateschedule' ),
                contentType: 'application/json',
                data: JSON.stringify( Y.merge( {
                    action: 'calculateschedule',
                    subaction: 'CLOSE_EVT'
                }, parameters ) )
            } );
        },
        /**
         * Admit an appointment on server
         * @method admitAppointment
         * @param {Object} parameters
         * @param {String} parameters._id
         * @param {String} parameters.calendar
         * @return {jQuery.Deferred}
         */
        admitAppointment: function BinderViewModel_admitAppointment( parameters ) {

            return Y.doccirrus.jsonrpc.api.calevent.calculateSchedule( {
                data: Y.merge( {
                    action: 'calculateschedule',
                    subaction: 'ADMIT_EVT'
                }, parameters )
            } );
        },
        /**
         * Set that a patient didn't arrived for an appointment on server
         * @method setAppointmentThatPatientNotArrived
         * @param {Object} parameters
         * @param {String} parameters._id
         * @param {String} parameters.scheduleId
         * @return {jQuery.Deferred}
         */
        setAppointmentThatPatientNotArrived: function BinderViewModel_setAppointmentThatPatientNotArrived( parameters ) {

            return jQuery.ajax( {
                type: 'POST',
                xhrFields: { withCredentials: true },
                url: Y.doccirrus.infras.getPrivateURL( 'r/calculateschedule' ),
                contentType: 'application/json',
                data: JSON.stringify( Y.merge( {
                    action: 'calculateschedule',
                    subaction: 'PATIENT_NOT_ARRIVED'
                }, parameters ) )
            } );
        },
        /**
         * Set that a patient arrived for an appointment on server
         * @method setAppointmentThatPatientArrived
         * @param {Object} parameters
         * @param {String} parameters._id
         * @param {String} parameters.scheduleId
         * @return {jQuery.Deferred}
         */
        setAppointmentThatPatientArrived: function BinderViewModel_setAppointmentThatPatientArrived( parameters ) {

            return jQuery.ajax( {
                type: 'POST',
                xhrFields: { withCredentials: true },
                url: Y.doccirrus.infras.getPrivateURL( 'r/calculateschedule' ),
                contentType: 'application/json',
                data: JSON.stringify( Y.merge( {
                    action: 'calculateschedule',
                    subaction: 'PATIENT_ARRIVED'
                }, parameters ) )
            } );
        },
        /**
         * Moves an appointment down in queue on server
         * @method moveAppointmentDown
         * @param {Object} parameters
         * @param {String} parameters._id
         * @param {String} [parameters.location]
         * @return {jQuery.Deferred}
         */
        moveAppointmentDown: function BinderViewModel_moveAppointmentDown( parameters ) {

            return jQuery.ajax( {
                type: 'POST',
                xhrFields: { withCredentials: true },
                url: Y.doccirrus.infras.getPrivateURL( 'r/calculateschedule' ),
                contentType: 'application/json',
                data: JSON.stringify( Y.merge( {
                    action: 'calculateschedule',
                    subaction: 'PUSH_EVT'
                }, parameters ) )
            } );
        },
        /**
         * Moves an appointment down in waiting list on server
         * @method moveAppointmentDownInWaitingList
         * @param {Object} parameters
         * @param {String} parameters._id
         * @param {String} parameters.calendar
         * @return {jQuery.Deferred}
         */
        moveAppointmentDownInWaitingList: function BinderViewModel_moveAppointmentDownInWaitingList( parameters ) {

            return jQuery.ajax( {
                type: 'POST',
                xhrFields: { withCredentials: true },
                url: Y.doccirrus.infras.getPrivateURL( 'r/calculateschedule' ),
                contentType: 'application/json',
                data: JSON.stringify( Y.merge( {
                    action: 'calculateschedule',
                    subaction: 'PUSHINQ_EVT'
                }, parameters ) )
            } );
        },
        /**
         * Shows repetition administration dialog to handle the appropriate update type
         *
         * events:
         * - cancel: provides no further arguments - may fire on close of the dialog with no chosen action
         * - done: provides the arguments supplied by the finished server request - may fire when chosen to update somehow
         * - fail: provides the arguments supplied by the finished server request - may fire when chosen to update somehow fails
         *
         * @param {Object} data modified data
         * @param {Object} initialData unmodified data
         * @return {Y.EventTarget} subscribe to 'cancel', 'done' and 'fail' events
         */
        updateRepetitionConfirmed: function BinderViewModel_updateRepetitionConfirmed( data, initialData ) {
            data = Y.clone( data, true );
            var
                self = this,
                eventTarget = new Y.EventTarget();

            eventTarget.publish( 'cancel', { preventable: false } );
            eventTarget.publish( 'done', { preventable: false } );
            eventTarget.publish( 'fail', { preventable: false } );

            if( !data.lastEditor ) {
                data.lastEditor = null;
                data.lastEditDate = new Date();
            }

            if( !data.allDay ) {
                data.plannedDuration = data.duration;
            } else {
                data.end = moment( data.start ).add( 23, 'hours' ).add( 59, 'minutes' ).toISOString();
            }

            self
                .showRepetitionAdministrationDialog( data, initialData )
                .after( {
                    cancel: function BinderViewModel_updateRepetitionConfirmed_showRepetitionAdministrationDialog_cancel() {
                        eventTarget.fire( 'cancel' );
                        eventTarget.detachAll();
                    },
                    updateAllFuture: function BinderViewModel_updateRepetitionConfirmed_showRepetitionAdministrationDialog_updateAllFuture( ev ) {
                        var
                            query,
                            params = {
                                notConfirmed: false,
                                isManualChange: true
                            };

                        if( data._id ) {
                            query = { _id: data._id };
                        }
                        if( ev.alsoFuture ) {
                            params.alsoFuture = true;
                        }

                        Y.doccirrus.jsonrpc.api
                            .calevent.update( {
                            query: query,
                            data: Y.merge( data, params ),
                            noValidation: ev.noValidation,
                            fields: ev.updateFields || Y.Array.reject( Object.keys( data ), function( key ) {
                                switch( key ) {
                                    case '_id':
                                        return true;
                                }
                                return false;
                            } )
                        } )
                            .done( function BinderViewModel_updateRepetitionConfirmed_showRepetitionAdministrationDialog_updateAllFuture_done() {
                                var argumentsArray = new Y.Array( arguments );
                                self.propagateAppointmentModification( 'save', argumentsArray );
                                eventTarget.fire.apply( eventTarget, ['done'].concat( argumentsArray ) );
                                eventTarget.detachAll();
                            } )
                            .fail( fail )
                            .fail( function BinderViewModel_updateRepetitionConfirmed_showRepetitionAdministrationDialog_updateAllFuture_fail() {
                                eventTarget.fire.apply( eventTarget, ['fail'].concat( Array.prototype.slice.call( arguments ) ) );
                                eventTarget.detachAll();
                            } );
                    },
                    updateAll: function BinderViewModel_updateRepetitionConfirmed_showRepetitionAdministrationDialog_updateAll( ev ) {
                        var
                            query,
                            params = {
                                notConfirmed: false,
                                editAll: true,
                                isManualChange: true
                            };

                        if( data._id ) {
                            query = { _id: data._id };
                        }

                        Y.doccirrus.jsonrpc.api.calevent.update( {
                            query: query,
                            data: Y.merge( data, params ),
                            noValidation: ev.noValidation,
                            fields: ev.updateFields || Y.Array.reject( Object.keys( data ), function( key ) {
                                switch( key ) {
                                    case '_id':
                                        return true;
                                }
                                return false;
                            } )
                        } )
                            .done( function BinderViewModel_updateRepetitionConfirmed_showRepetitionAdministrationDialog_updateAll_done() {
                                var argumentsArray = new Y.Array( arguments );
                                self.propagateAppointmentModification( 'save', argumentsArray );
                                eventTarget.fire.apply( eventTarget, ['done'].concat( argumentsArray ) );
                                eventTarget.detachAll();
                            } )
                            .fail( fail )
                            .fail( function BinderViewModel_updateRepetitionConfirmed_showRepetitionAdministrationDialog_updateAll_fail() {
                                eventTarget.fire.apply( eventTarget, ['fail'].concat( Array.prototype.slice.call( arguments ) ) );
                                eventTarget.detachAll();
                            } );
                    },
                    updateThis: function BinderViewModel_updateRepetitionConfirmed_showRepetitionAdministrationDialog_updateThis( ev ) {
                        var
                            query,
                            params = {
                                notConfirmed: false,
                                isManualChange: true
                            };

                        if( data._id ) {
                            query = { _id: data._id };
                        }
                        if( ev.alsoFuture ) {
                            params.alsoFuture = true;
                        }

                        Y.doccirrus.jsonrpc.api.calevent.update( {
                            query: query,
                            data: Y.merge( data, params ),
                            noValidation: ev.noValidation,
                            fields: ev.updateFields || Y.Array.reject( Object.keys( data ), function( key ) {
                                switch( key ) {
                                    case '_id':
                                        return true;
                                }
                                return false;
                            } )
                        } )
                            .done( function BinderViewModel_updateRepetitionConfirmed_showRepetitionAdministrationDialog_updateThis_done() {
                                var argumentsArray = new Y.Array( arguments );
                                self.propagateAppointmentModification( 'save', argumentsArray );
                                eventTarget.fire.apply( eventTarget, ['done'].concat( argumentsArray ) );
                                eventTarget.detachAll();
                            } )
                            .fail( fail )
                            .fail( function BinderViewModel_updateRepetitionConfirmed_showRepetitionAdministrationDialog_updateThis_fail() {
                                eventTarget.fire.apply( eventTarget, ['fail'].concat( Array.prototype.slice.call( arguments ) ) );
                                eventTarget.detachAll();
                            } );
                    }
                } );

            return eventTarget;
        },
        /**
         * May show a dialog to handle possible actions for repetition modifications.
         * If no possibility match, will not show and fire 'done'-event immediately.
         *
         * @method showRepetitionAdministrationDialog
         * @param {Object} data modified data
         * @param {Object} origin unmodified data
         * @return {Y.EventTarget} subscribe to 'cancel', 'updateAllFuture', 'updateAll' and 'updateThis' events
         */
        showRepetitionAdministrationDialog: function BinderViewModel_showRepetitionAdministrationDialog( data, origin ) {
            var
                detected = Y.doccirrus.schemas.repetition.detectRepetitionChanges( data, origin ),
                eventTarget = new Y.EventTarget(),
                updatedFields = [],
                noValidation,
                onlyMasterChanges = detected.changes.timeSpan || detected.changes.repetition || detected.changes.fields.interval;

            eventTarget.publish( 'cancel', { preventable: false } );
            eventTarget.publish( 'updateAllFuture', { preventable: false } );
            eventTarget.publish( 'updateAll', { preventable: false } );
            eventTarget.publish( 'updateThis', { preventable: false } );

            Object.keys( detected.changes.fields ).forEach( function( prop ) {
                if( true === detected.changes.fields[ prop ] ) {
                    updatedFields.push( prop );
                }
            } );
            if( detected.changes.timeSpan ){
                noValidation = false;
            } else {
                noValidation = true;
            }
            if( onlyMasterChanges ){
                Y.doccirrus.DCWindow.notice( {
                    icon: '',
                    title: i18n( 'CalendarMojit.calendar.title.UPDATE_REPEATED_EVENT' ),
                    message: i18n( 'CalendarMojit.calendar.message.UPDATE_MASTER_EVENT_QUESTION' ),
                    window: {
                        width: 'auto',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                {
                                    label: i18n( 'general.button.CONFIRM' ),
                                    isDefault: true,
                                    name: 'updateThis',
                                    value: 'updateThis',
                                    action: function BinderViewModel_showRepetitionAdministrationDialog_updateThis( e ) {
                                        e.target.button.disable();
                                        this.close( e );
                                        eventTarget.fire( 'updateThis', {
                                            data: data,
                                            updateFields: updatedFields,
                                            alsoFuture: false,
                                            noValidation: noValidation
                                        } );
                                        eventTarget.detachAll();
                                    }
                                }
                            ]
                        },
                        after: {
                            visibleChange: function BinderViewModel_showRepetitionAdministrationDialog_visibleChange( yEvent ) {
                                // also captures cancel for e.g.: ESC
                                if( !yEvent.newVal ) {
                                    setTimeout( function BinderViewModel_showRepetitionAdministrationDialog_visibleChange_setTimeout() { // delay for letting others fire first
                                        eventTarget.fire( 'cancel' );
                                        eventTarget.detachAll();
                                    }, 10 );
                                }
                            }
                        }
                    }
                } );
            } else {
                Y.doccirrus.DCWindow.notice( {
                    icon: '',
                    title: i18n( 'CalendarMojit.calendar.title.UPDATE_REPEATED_EVENT' ),
                    message: i18n( 'CalendarMojit.calendar.message.UPDATE_REPEATED_EVENT_QUESTION' ),
                    window: {
                        width: 'auto',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                {
                                    label: i18n( 'CalendarMojit.calendar.button.UPDATE_ALL_FUTURE' ),
                                    disabled: detected.index === 0 ? true : false, // TODO: [Bug] MOJ-4586: calevent.index to determine event position in a repetition not served always
                                    name: 'updateAllFuture',
                                    value: 'updateAllFuture',
                                    action: function BinderViewModel_showRepetitionAdministrationDialog_updateAllFuture( e ) {
                                        e.target.button.disable();
                                        this.close( e );
                                        eventTarget.fire( 'updateAllFuture', {
                                            data: data,
                                            updateFields: updatedFields,
                                            alsoFuture: true,
                                            noValidation: noValidation
                                        } );
                                        eventTarget.detachAll();
                                    }
                                },
                                {
                                    label: i18n( 'CalendarMojit.calendar.button.UPDATE_ALL' ),
                                    name: 'updateAll',
                                    value: 'updateAll',
                                    action: function BinderViewModel_showRepetitionAdministrationDialog_updateAll( e ) {
                                        e.target.button.disable();
                                        this.close( e );
                                        eventTarget.fire( 'updateAll', {
                                            data: data,
                                            updateFields: updatedFields,
                                            alsoFuture: false,
                                            noValidation: noValidation
                                        } );
                                        eventTarget.detachAll();
                                    }
                                },
                                {
                                    label: i18n( 'CalendarMojit.calendar.button.UPDATE_THIS' ),
                                    isDefault: true,
                                    name: 'updateThis',
                                    value: 'updateThis',
                                    action: function BinderViewModel_showRepetitionAdministrationDialog_updateThis( e ) {
                                        e.target.button.disable();
                                        this.close( e );
                                        eventTarget.fire( 'updateThis', {
                                            data: data,
                                            updateFields: updatedFields,
                                            alsoFuture: false,
                                            noValidation: noValidation
                                        } );
                                        eventTarget.detachAll();
                                    }
                                }
                            ]
                        },
                        after: {
                            visibleChange: function BinderViewModel_showRepetitionAdministrationDialog_visibleChange( yEvent ) {
                                // also captures cancel for e.g.: ESC
                                if( !yEvent.newVal ) {
                                    setTimeout( function BinderViewModel_showRepetitionAdministrationDialog_visibleChange_setTimeout() { // delay for letting others fire first
                                        eventTarget.fire( 'cancel' );
                                        eventTarget.detachAll();
                                    }, 10 );
                                }
                            }
                        }
                    }
                } );
            }

            return eventTarget;
        },
        /**
         * Delete a calevent
         * @param {Object} data
         * @return {jQuery.Deferred}
         */
        deleteAppointment: function BinderViewModel_deleteAppointment( data ) {
            return Y.doccirrus.utils.deleteCalEvent( data );
        },
        /**
         * Shows the dialog to confirm the deletion of an appointment.
         *
         * events:
         * - cancel: provides no further arguments - may fire on close of the dialog with no chosen action
         * - done: provides the arguments supplied by the finished server request - may fire when chosen to delete that event
         * - fail: provides the arguments supplied by the finished server request - may fire when chosen to delete that event and it fails
         *
         * @method deleteAppointmentConfirmed
         * @param {Object} data
         * @return {Y.EventTarget} subscribe to 'cancel', 'done' and 'fail' events
         */
        deleteAppointmentConfirmed: function BinderViewModel_deleteAppointmentConfirmed( data ) {
            var
                self = this,
                eventTarget = new Y.EventTarget();

            eventTarget.publish( 'cancel', { preventable: false } );
            eventTarget.publish( 'done', { preventable: false } );
            eventTarget.publish( 'fail', { preventable: false } );

            Y.doccirrus.DCWindow.confirm( {
                title: Y.doccirrus.utils.confirmDialog.title.CONFIRMATION,
                message: Y.doccirrus.utils.confirmDialog.message.APPOINTMENT_DELETE,
                callback: function BinderViewModel_deleteAppointmentConfirmed_callback( dialog ) {
                    if( dialog.success ) {
                        self.deleteAppointment( data )
                            .done( function BinderViewModel_deleteAppointmentConfirmed_callback_deleteAppointment_done( response ) {
                                var argumentsArray = new Y.Array( arguments ),
                                    errors = Y.doccirrus.errorTable.getErrorsFromResponse( response ),
                                    warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                                Y.Array.invoke( warnings, 'display' );

                                if( errors.length ) {
                                    eventTarget.fire.apply( eventTarget, ['fail'].concat( argumentsArray ) );
                                } else {
                                    self.propagateAppointmentModification( 'delete', argumentsArray );
                                    eventTarget.fire.apply( eventTarget, ['done'].concat( argumentsArray ) );
                                }
                                eventTarget.detachAll();
                            } )
                            .fail( fail )
                            .fail( function BinderViewModel_deleteAppointmentConfirmed_callback_deleteAppointment_fail() {
                                eventTarget.fire.apply( eventTarget, ['fail'].concat( Array.prototype.slice.call( arguments ) ) );
                                eventTarget.detachAll();
                            } );
                    }
                    else {
                        eventTarget.fire( 'cancel' );
                        eventTarget.detachAll();
                    }
                }
            } );

            return eventTarget;
        },
        /**
         * Shows the dialog to edit an appointment.
         *
         * events:
         * - cancel: provides no further arguments - may fire on close of the dialog with no chosen action
         * - delete: provides the arguments supplied by the finished server request - may fire when chosen to delete that event
         * - save: provides the arguments supplied by the finished server request - may fire when chosen to save modifications to that event
         *
         * @method showAppointmentDialog
         * @param {Object} scheduleData
         * @param {Object} [options] config options
         * @return {Y.EventTarget} subscribe to 'cancel', 'delete' and 'save' events
         */
        showAppointmentDialog: function BinderViewModel_showAppointmentDialog( scheduleData, options ) {
            options = options || {};
            var
                self = this,
                eventTarget = new Y.EventTarget();
            eventTarget.publish( 'cancel', { preventable: false } );
            eventTarget.publish( 'delete', { preventable: false } );
            eventTarget.publish( 'save', { preventable: false } );
            if( scheduleData && ( "NONE" === scheduleData.severity && 0 !== scheduleData.urgency ) ) {
                self.urgencyMigrator( scheduleData );
            }
            if( scheduleData ) {
                scheduleData.startDate = scheduleData.start;
            }

            Y.doccirrus.modals.calendarApointment.showAppointment( scheduleData, _.assign( {}, options, {
                severityColorMap: self.severityColorMap,
                calendarsFiltered: peek( self.calendarsFiltered ),
                inTimeConfig: self.get( 'inTimeConfig' ),
                onDelete: self.deleteAppointmentConfirmed.bind( self ),
                eventTarget: eventTarget,
                createAppointment: self.createAppointment.bind( self ),
                updateAppointment: self.updateAppointment.bind( self ),
                updateRepetitionConfirmed: self.updateRepetitionConfirmed.bind( self )
            } ) );

            return eventTarget;
        },
        getColorBySeverity: function BinderViewModel_getColorBySeverity( severity ) {
            var color;
            this.severityColorMap.forEach( function( prop ) {
                if( prop.severity === severity ) {
                    color = prop.color;
                }
            } );

            return color;
        },
        severitySorter: function BinderViewModel_severitySorter( severity1, severity2 ) {
            var i1 = this.severityColorMap.map( function( e ) {
                    return e.severity;
                } ).indexOf( severity1 ),
                i2 = this.severityColorMap.map( function( e ) {
                    return e.severity;
                } ).indexOf( severity2 );
            return i1 > i2 ? 1 : -1;
        },
        urgencyMigrator: function BinderViewModel_urgencyMigrator( item ) {
            switch( item.urgency ) {
                case 1:
                    item.severity = "IMPORTANT";
                    break;
                case 2:
                    item.severity = "VERYIMPORTANT";
                    break;
                case 3:
                    item.severity = "CRITICAL";
                    break;
            }
        },
        /**
         * Shows a dialog to handle possible actions for an appointment.
         * If no possibility match, will not show and fire 'edit'-event immediately.
         *
         * events:
         * - cancel: provides no further arguments - may fire on close of the dialog with no chosen action
         * - deleteAllFuture: provides the arguments supplied by the finished server request - may fire when chosen to delete all future repetition events
         * - deleteThis: provides the arguments supplied by the finished server request - may fire when chosen to delete only that repetition event
         * - edit: provides the data supplied to this method - may fire when there is no other possible action or it was chosen to edit that event
         *
         * @method showAppointmentAdministrationWindow
         * @param {Object} data
         * @param {Object} [options] config options
         * @return {Y.EventTarget} subscribe to 'cancel', 'deleteAllFuture', 'deleteThis' and 'edit' events
         */
        showAppointmentAdministrationWindow: function BinderViewModel_showAppointmentAdministrationWindow( data /*, options */ ) {
            //options = options || {};        // eslint-disable-line no-unused-vars
            var
                self = this,
                eventTarget = new Y.EventTarget(),
                appointmentAdministrationWindow;

            eventTarget.publish( 'cancel', { preventable: false } );
            eventTarget.publish( 'deleteAllFuture', { preventable: false } );
            eventTarget.publish( 'deleteThis', { preventable: false } );
            eventTarget.publish( 'edit', { preventable: false } );

            if( data.linkSeries || 'NONE' !== data.repetition ) { // if a virtual repetition
                appointmentAdministrationWindow = Y.doccirrus.DCWindow.notice( {
                    icon: '',
                    title: i18n( 'CalendarMojit.calendar.group.APP_ADMIN' ),
                    message: i18n( 'CalendarMojit.calendar.message.MESSAGE_APP_ADMIN' ),
                    window: {
                        width: 'auto',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                {
                                    label: i18n( 'CalendarMojit.calendar.button.DELETE_ALL_FUTURE' ),
                                    name: 'deleteAllFuture',
                                    value: 'deleteAllFuture',
                                    action: function BinderViewModel_showAppointmentAdministrationWindow_deleteAllFuture( e ) {

                                        e.target.button.disable();

                                        Y.doccirrus.DCWindow.confirm( {
                                            title: Y.doccirrus.utils.confirmDialog.title.CONFIRMATION,
                                            message: Y.doccirrus.utils.confirmDialog.message.APPOINTMENT_DELETE_ALL,
                                            callback: function BinderViewModel_showAppointmentAdministrationWindow_deleteAllFuture_confirm( dialog ) {
                                                if( dialog.success ) {
                                                    Y.doccirrus.utils
                                                        .deleteCalEvent( data, true )
                                                        .done( function BinderViewModel_showAppointmentAdministrationWindow_deleteAllFuture_confirm_deleteCalEvent_done() {
                                                            var argumentsArray = new Y.Array( arguments );
                                                            appointmentAdministrationWindow.close();
                                                            self.propagateAppointmentModification( 'delete', argumentsArray );
                                                            eventTarget.fire.apply( eventTarget, ['deleteAllFuture'].concat( argumentsArray ) );
                                                            eventTarget.detachAll();

                                                        } )
                                                        .fail( fail )
                                                        .fail( function BinderViewModel_showAppointmentAdministrationWindow_deleteAllFuture_confirm_deleteCalEvent_fail() {
                                                            e.target.button.enable();
                                                        } );
                                                }
                                                else {
                                                    e.target.button.enable();
                                                }
                                            }
                                        } );
                                    }
                                },
                                {
                                    label: i18n( 'CalendarMojit.calendar.button.DELETE_THIS' ),
                                    name: 'deleteThis',
                                    value: 'deleteThis',
                                    action: function BinderViewModel_showAppointmentAdministrationWindow_deleteThis( e ) {

                                        e.target.button.disable();

                                        Y.doccirrus.DCWindow.confirm( {
                                            title: Y.doccirrus.utils.confirmDialog.title.CONFIRMATION,
                                            message: Y.doccirrus.utils.confirmDialog.message.APPOINTMENT_DELETE,
                                            callback: function BinderViewModel_showAppointmentAdministrationWindow_deleteThis_confirm( dialog ) {
                                                if( dialog.success ) {
                                                    Y.doccirrus.utils
                                                        .deleteCalEvent( data )
                                                        .done( function BinderViewModel_showAppointmentAdministrationWindow_deleteThis_confirm_deleteCalEvent_done() {
                                                            var argumentsArray = new Y.Array( arguments );
                                                            appointmentAdministrationWindow.close();

                                                            self.propagateAppointmentModification( 'delete', argumentsArray );
                                                            eventTarget.fire.apply( eventTarget, ['deleteThis'].concat( argumentsArray ) );
                                                            eventTarget.detachAll();

                                                        } )
                                                        .fail( fail )
                                                        .fail( function BinderViewModel_showAppointmentAdministrationWindow_deleteThis_confirm_deleteCalEvent_fail() {
                                                            e.target.button.enable();
                                                        } );
                                                }
                                                else {
                                                    e.target.button.enable();
                                                }
                                            }
                                        } );
                                    }
                                },
                                Y.doccirrus.DCWindow.getButton( 'EDIT', {
                                    isDefault: true,
                                    action: function BinderViewModel_showAppointmentAdministrationWindow_edit() {

                                        appointmentAdministrationWindow.close();

                                        eventTarget.fire( 'edit', data );
                                        eventTarget.detachAll();
                                    }
                                } )
                            ]
                        },
                        after: {
                            visibleChange: function BinderViewModel_showAppointmentAdministrationWindow_visibleChange( yEvent ) {
                                // also captures cancel for e.g.: ESC
                                if( !yEvent.newVal ) {
                                    setTimeout( function BinderViewModel_showAppointmentAdministrationWindow_visibleChange_setTimeout() { // delay for letting others fire first
                                        eventTarget.fire( 'cancel' );
                                        eventTarget.detachAll();
                                    }, 10 );
                                }
                            }
                        }
                    }
                } );
            } else {
                setTimeout( function BinderViewModel_showAppointmentAdministrationWindow_no_linkSeries() { // delay to let subscribe after return
                    eventTarget.fire( 'edit', data );
                    eventTarget.detachAll();
                }, 10 );
            }

            return eventTarget;
        },
        /**
         * The current views view model
         * @type {null|ko.observable}
         */
        currentView: null,
        /**
         * The current views view model associated name
         * @type {null|ko.computed}
         */
        currentViewName: null,
        /** @protected */
        _initCurrentView: function BinderViewModel__initCurrentView() {
            var
                self = this;

            self.currentView = ko.observable( null );
            self.currentViewName = ko.computed( function BinderViewModel__initCurrentView_currentViewName_computed() {
                var
                    currentView = self.currentView();

                if( currentView && currentView.viewName ) {
                    return currentView.viewName;
                }

                return '';
            } );
        },
        /**
         * Propagate the global "appointmentModified"-event
         * @param {String} type
         * @param {Array} parameters
         */
        propagateAppointmentModification: function BinderViewModel_propagateAppointmentModification( type, parameters ) {
            Y.fire( 'appointmentModified', {
                type: type,
                parameters: new Y.Array( parameters )
            } );
        },

        /**
         * Handler of the toggle full-screen action
         */
        toggleFullScreenHandler() {
            Y.doccirrus.DCBinder.toggleFullScreen();

        },
        /**
         * Determines state of the calendar selector toggle checkbox
         * @type {null|ko.computed}
         */
        calendarSelectorTogglerChecked: null,
        /** @protected */
        _initCalendarSelector: function() {
            var
                self = this;

            self.calendarSelectorTogglerChecked = ko.computed( function() {
                var
                    calendarsVisible = ko.unwrap( self.calendarsVisible );

                return Boolean( calendarsVisible.length );
            } ).extend( { rateLimit: 0 } );

        },
        /**
         * Determines state of the group selector toggle checkbox
         * @type {null|ko.computed}
         */
        groupSelectorTogglerChecked: null,
        /** @protected */
        _initGroupSelector: function() {
            var
                self = this;

            self.groupSelectorTogglerChecked = ko.computed( function() {
                var
                    calendarGroups = ko.unwrap( self.calendarGroups );
                return calendarGroups.some( function( group ) {
                    return group.checked();
                } );
            } ).extend( {rateLimit: 0} );
        },
        /**
         * Handler of the calendar selector toggle checkbox click event
         * @method allCalendarSelectorTogglerClick
         * @param {Object} model
         * @param {Event} $event
         * @constructor
         */
        allCalendarSelectorTogglerClick: function( model, $event ) {
            var
                self = this;

            $event.preventDefault();

            if( !peek( self.calendarsVisible ).length ) {
                self.calendarsVisible.push.apply( self.calendarsVisible, peek( self.calendarsLocation ) );
                self.calendarGroups().forEach( function( group ) {
                        group.checked( true );
                    }
                );
            }
            else {
                self.calendarsVisible.removeAll();
                self.calendarGroups().forEach( function( group ) {
                        group.checked( false );
                    }
                );
            }
            self.writeGroupsVisible();
        },
        allGroupSelectorTogglerClick: function( model, $event ) {
            var
                self = this;

            $event.preventDefault();

            if( !peek( self.calendarGroups ).some( function( group ) {
                    return group.checked();
                } ) ) {
                self.calendarGroups().forEach( function( group ) {
                    self.calendarsVisible.push.apply( self.calendarsVisible, group.calendars );
                    group.checked( true );
                } );
            }
            else {
                self.calendarGroups().forEach( function( group ) {
                    group.checked( false );
                    group.calendars.forEach( function( calendar ) {
                        var index = self.calendarsVisible().indexOf( calendar );

                        if( index > -1 ) {
                            peek( self.calendarsVisible ).splice( index, 1 );
                        }
                    } );
                } );
                self.calendarsVisible( self.calendarsVisible() );
            }
            self.writeGroupsVisible();
        },
        onGroupClick: function( model ) {
            var
                self = this,
                clickedGroup;

            clickedGroup = self.calendarGroups().find( function( group ) {
                return model.name === group.name;
            } );

            if( clickedGroup.checked() ) {
                self.calendarGroups().find( function( group ) {
                    return model.name === group.name;
                } ).checked( false );
                clickedGroup.calendars.forEach( function( calendar ) {
                    var index = self.calendarsVisible().indexOf( calendar );

                    if( index > -1 ) {
                        peek( self.calendarsVisible ).splice( index, 1 );
                    }
                } );

            } else {
                self.calendarGroups().find( function( group ) {
                    return model.name === group.name;
                } ).checked( true );
                self.calendarsVisible.push.apply( self.calendarsVisible, clickedGroup.calendars );
            }

            self.calendarsVisible( self.calendarsVisible() );

            self.writeGroupsVisible();

            return true;
        },
        onCalendarClick: function( model ) {
            var
                self = this,
                clickedCalendar;

            clickedCalendar = self.calendarsVisible().find( function( calendar ) {
                return model._id === calendar._id;
            } );

            if( clickedCalendar ) {
                if( clickedCalendar.calGroup && clickedCalendar.calGroup.length ) {
                    self.calendarsVisible( peek( self.calendarsVisible ).filter( function( calendar ) {
                        return calendar._id !== clickedCalendar._id;
                    } ) );
                    clickedCalendar.calGroup.forEach( function( group ) {
                        if( -1 === peek( self.calendarsVisible ).findIndex( function( calendar ) {
                                return _.includes( calendar.calGroup, group );
                            } ) ) {
                            self.calendarGroups().find( function( innerGroup ) {
                                return group === innerGroup.name;
                            } ).checked( false );
                        }
                    } );
                } else {
                    peek( self.calendarsVisible ).splice( self.calendarsVisible().findIndex( function( calendar ) {
                        return model._id === calendar._id;
                    } ), 1 );
                }
            } else {
                if( model.calGroup && model.calGroup.length ) {
                    model.calGroup.forEach( function( innerGroup ) {
                        self.calendarGroups().find( function( group ) {
                            return innerGroup === group.name;
                        } ).checked( true );
                        peek( self.calendarsVisible ).push( model );
                    } );
                } else {
                    peek( self.calendarsVisible ).push( model );
                }
            }
            self.calendarsVisible( self.calendarsVisible() );
            self.writeGroupsVisible();

            return true;
        },
        switchIcon: function( model, $event ) {
            var
                node = $( $event.target );

            if( node.hasClass( 'fa-minus-square-o' ) ) {
                $event.target.classList = [];
                $event.target.className = 'fa fa-plus-square-o';
            } else {
                $event.target.classList = [];
                $event.target.className = 'fa fa-minus-square-o';
            }
        },
        toggleGroupList: function( model, $event ) {
            var self = this,
                node = $( $event.target );
            if( node.hasClass( 'fa-minus-square-o' ) ) {
                self.showGroupList( false );
            } else {
                self.showGroupList( true );
            }
            self.switchIcon( model, $event );
        },
        toggleCalendarList: function( model, $event ) {
            var self = this,
                node = $( $event.target );
            if( node.hasClass( 'fa-minus-square-o' ) ) {
                self.showCalendarList( false );
            } else {
                self.showCalendarList( true );
            }
            self.switchIcon( model, $event );
        },

        /**
         *  Construct table from selected activities as if calling to server
         *  @param  {Object}    params
         *  @return {*}
         */

        hookProxy: function( params ) {
            var
                self = this,
                binderViewModel = self.getBinderViewModel(),
                list= self.getTabList(),
                copyCache = [],
                deferred = $.Deferred(),
                totalFilteredLength,
                query = params.query || {};

            //  copy the cached dataset
            if ( self.scheduleData() ) {
                self.scheduleData().forEach( function( item ) { copyCache.push( item ); } );
            }

            //  filter the cached dataset according to table columns
            copyCache = binderViewModel.filterProxyData( list, copyCache, query );

            //  sort the cached dataset according to table columns
            copyCache = Y.doccirrus.commonutils.sortProxyData( list, copyCache, params );

            totalFilteredLength = copyCache.length;

            copyCache = binderViewModel.applyPagination( copyCache, params);

            deferred.resolve( {
                data: copyCache,
                meta: {
                    totalItems: totalFilteredLength
                }
            } );

            return deferred;
        },

        /**
         *  Apply table column filters to cached data rows
         *  @method filterProxyData
         *  @param  {Object}    tableList  KoTable
         *  @param  {Object}   filteredData  Object of filteredData
         *  @param  {Object}   query
         */

        filterProxyData: function( tableList, filteredData, query ) {
            var
                filterParams,
                keys = [];

            //  if no data then we're done
            if ( !filteredData || !tableList) { return []; }

            if( query && query.$and ) {
                query.$and.forEach( function( item ) {
                    var multiFiltered = [];
                    if( item.$or && item.$or.length ) {
                        item.$or.forEach( function( i ) {
                            var key = _.keys( i )[0];
                            if( key && i[key].$in ) {
                                multiFiltered = multiFiltered.concat( filteredData.filter( function( it ) {
                                    return (-1 !== i[key].$in.indexOf( it[key] ));
                                } ) );
                                if( -1 === keys.indexOf( key ) ) {
                                    keys.push( key );
                                }
                            }

                            if( key && i[key].$nin ) {
                                multiFiltered = multiFiltered.concat( filteredData.filter( function( it ) {
                                    return (-1 !== i[key].$in.indexOf( it[key] ));
                                } ) );
                                if( -1 === keys.indexOf( key ) ) {
                                    keys.push( key );
                                }
                            }

                            if( key && i[key].iregex ) {
                                multiFiltered = multiFiltered.concat( filteredData.filter( function( it ) {
                                    return null !== it[key].match( new RegExp( i[key].iregex, 'i' ) );
                                } ) );
                                if( -1 === keys.indexOf( key ) ) {
                                    keys.push( key );
                                }
                            }

                            if( key && i[key].notiregex ) {
                                multiFiltered = multiFiltered.concat( filteredData.filter( function( it ) {
                                    return null === it[key].match( new RegExp( i[key].notiregex, 'i' ) );
                                } ) );
                                if( -1 === keys.indexOf( key ) ) {
                                    keys.push( key );
                                }
                            }
                        });

                        filteredData = multiFiltered;
                    }
                });
            }

            //  get state of table filters
            filterParams = ko.unwrap( tableList.filterParams );

            //  if no filters then we're done
            if ( Y.Object.isEmpty( filterParams ) ) {
                return filteredData;
            }

            var dcQuery = new Y.doccirrus.DCQuery( Y.clone( filterParams, true ) );

            dcQuery.checkOperators();
            dcQuery = dcQuery.getQueryAsObj();

            Y.each( filterParams, filterSingleParam );

            function filterSingleParam( obj, forPropertyName ) {
                var
                    column = tableList.getColumnByPropertyName(forPropertyName),
                    queryFilterType = column.queryFilterType;

                if( -1 !== keys.indexOf( forPropertyName ) ) {
                    return filteredData;
                }
                if ( Y.Lang.isFunction(column.filterBy) && !obj.notiregex ) { //normal filtering on column

                    filteredData = Y.Array.filter(filteredData, column.filterBy, column);

                } else {

                    switch (queryFilterType) {
                        case DCQuery.ENUM_OPERATOR:
                            // provides $in Array

                            filteredData = Y.Array.filter(filteredData, function (item) {
                                var
                                    value = getObject(forPropertyName, item);

                                if (!value) {
                                    return false;
                                }

                                return dcQuery[forPropertyName].$in.some(function ($in) {
                                    return value === $in;
                                });
                            });
                            break;

                        case DCQuery.GTE_OPERATOR:
                            // provides $gte String

                            filteredData = Y.Array.filter(filteredData, function (item) {
                                var
                                    value = getObject(forPropertyName, item),
                                    query = dcQuery[forPropertyName];

                                if (!(Y.Lang.isValue(value) && query)) {
                                    return false;
                                }

                                return value >= query.$gte;
                            });
                            break;

                        case DCQuery.GT_OPERATOR:
                            // provides $gt String

                            filteredData = Y.Array.filter(filteredData, function (item) {
                                var
                                    value = getObject(forPropertyName, item),
                                    query = dcQuery[forPropertyName];

                                if (!(Y.Lang.isValue(value) && query)) {
                                    return false;
                                }

                                return value > query.$gt;
                            });
                            break;

                        case DCQuery.EQ_OPERATOR:
                            // provides $eq String

                            filteredData = Y.Array.filter(filteredData, function (item) {
                                var
                                    value = getObject(forPropertyName, item),
                                    query = dcQuery[forPropertyName];

                                if (!(Y.Lang.isValue(value) && query)) {
                                    return false;
                                }

                                return value == query.$eq;//eslint-disable-line
                            });
                            break;

                        case DCQuery.EQ_BOOL_OPERATOR:
                            // provides $eq Bool

                            filteredData = Y.Array.filter(filteredData, function (item) {
                                var
                                    value = getObject(forPropertyName, item),
                                    query = dcQuery[forPropertyName];

                                if ('undefined' === typeof value) {
                                    value = false;
                                }

                                if (!query) {
                                    return false;
                                }

                                return value == query.$eq;//eslint-disable-line
                            });
                            break;

                        case DCQuery.REGEX_OPERATOR:
                        case DCQuery.IREGEX_OPERATOR:
                            // provides $regex and $not RegExp

                            if ( dcQuery[forPropertyName] && dcQuery[forPropertyName].$regex ) {
                                filteredData = Y.Array.filter(filteredData, function (item) {
                                    return Boolean(dcQuery[forPropertyName].$regex.exec(getObject(forPropertyName, item)));
                                });
                            }

                            if ( dcQuery[forPropertyName] && dcQuery[forPropertyName].$not ) {
                                filteredData = Y.Array.filter(filteredData, function (item) {
                                    return !Boolean(dcQuery[forPropertyName].$not.exec(getObject(forPropertyName, item)));
                                });
                            }

                            break;

                        case 'eqNumber':
                            // provides $eq Number

                            filteredData = Y.Array.filter(filteredData, function (item) {
                                var
                                    value = getObject(forPropertyName, item),
                                    query = dcQuery[forPropertyName];

                                if (!(Y.Lang.isValue(value) && query)) {
                                    return false;
                                }

                                return value === query.$eq;
                            });
                            break;

                    }

                }

            }

            return filteredData;
        },

        applyPagination: function(sortedData, params) {
            var
                itemsToGet = params.itemsPerPage || 10,
                sortedDataCopy = Array.from(sortedData),
                startFrom = (params.page - 1) * itemsToGet;

            if (!params.itemsPerPage && !params.page) {
                return sortedData;
            }

            return sortedDataCopy.splice(
                startFrom,
                params.itemsPerPage
            );
        }
    }, {
        ATTRS: {
            inTimeConfig: {
                value: {},
                validate: Y.Lang.isObject,
                cloneDefaultValue: true,
                lazyAdd: false
            },
            severityMap: {
                value: {},
                lazyAdd: false
            },
            scheduleTypesColorMap: {
                value: {},
                lazyAdd: false
            }
        }
    } );

    /**
     * Global Event, which views can attach to, notifies about appointment modifications outside of the view
     * @event propagateAppointmentModification
     * @type Event.Custom
     * @for Y
     * @param {Object} event The event data
     * @param {String} [event.type] type of origins from
     * @param {Array} [event.parameters] supplied parameters to origin
     */
    Y.publish( 'appointmentModified', { preventable: false } );

    /**
     * The CalendarMojitBinderIndex class.
     *
     * @module calendar
     * @namespace mojito.binders
     * @class CalendarMojitBinderIndex
     */
    Y.namespace( 'mojito.binders' )[NAME] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         * @method init
         * @param {Object} mojitProxy
         */
        init: function CalendarMojitBinderIndex_init( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @method bind
         * @param {Node} node The DOM node to which this mojit is attached.
         */
        bind: function CalendarMojitBinderIndex_bind( node ) {

            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'calendar' );

            var
                self = this;

            self.node = node;

            Promise.props( {
                inTimeConfig: Y.doccirrus.jsonrpc.api
                    .practice.getIntimeConfig()
                    .then( function( response ) {
                        return response.data || null;
                    } ),
                severityMap: Y.doccirrus.jsonrpc.api.severity
                    .read()
                    .then( function( response ) {
                        var
                            results = Y.Lang.isArray( response.data ) && response.data || [],
                            result = {};

                        results.forEach( function( item ) {
                            result[item.severity] = item;
                        } );

                        return result;
                    } ),

                scheduleTypesColorMap: Y.doccirrus.jsonrpc.api.scheduletype.read().then( function( result ) {
                    var colorMap = {};
                    result.data.forEach( function( scheduleType ) {
                        colorMap[scheduleType._id] = scheduleType.color;
                    } );
                    return colorMap;
                } )
            } ).then( function( result ) {
                self.binderViewModel = new BinderViewModel( {
                    inTimeConfig: result.inTimeConfig,
                    severityMap: result.severityMap,
                    scheduleTypesColorMap: result.scheduleTypesColorMap
                } );

                ko.applyBindings( self.binderViewModel, node.getDOMNode() );
            } ).catch( fail );

            /*jQuery
             .when(
             Y.doccirrus.jsonrpc.api
             .practice.getIntimeConfig()
             .then( function( response ) {
             return response.data || null;
             } )
             )
             .done( function( inTimeConfig ) {
             self.binderViewModel = new BinderViewModel( {
             inTimeConfig: inTimeConfig
             } );

             ko.applyBindings( self.binderViewModel, node.getDOMNode() );
             } )
             .fail( fail );*/

        },

        /**
         * After refreshView has been called and the DOM has been refreshed, an event is triggered that calls the hook method onRefreshView.
         * You can use onRefreshView to do things such as detach an event or prepare for another user action by re-attaching an event.
         * @method onRefreshView
         * @param {Node} node The DOM node to which this mojit is attached.
         */
        onRefreshView: function CalendarMojitBinderIndex_onRefreshView( node ) {
            var
                self = this;

            ko.cleanNode( node.getDOMNode() );
            self.binderViewModel.destroy();

            self.bind.apply( self, arguments );
        },

        readScheduletypesForCalendarId: readScheduletypesForCalendarId,
        doesCalendarAcceptScheduletypeId: doesCalendarAcceptScheduletypeId,
        validateCaleventData: validateCaleventData

    };

}, '0.0.1', {
    requires: [
        "DCBinder",
        'oop',
        'dd-delegate',
        'dd-constrain',
        'dd-drop-plugin',
        'dd-proxy',
        'dd-scroll',
        'mojito-client',
        'ItemsTabFactory',
        'NavBarHeader',
        'doccirrus',
        'JsonRpcReflection-doccirrus',
        'KoUI-all',
        'dcerrortable',
        'dccommonutils',
        'dcutils',
        'dcauth',
        'DCRouter',
        'DCWindow',
        'DCSystemMessages',
        'KoViewModel',
        'schedule-schema',
        'repetition-schema',
        'RepetitionKoViewModel',
        'scheduletype-schema',
        'calendar-schema',
        'dcvalidations',
        'DCTaskModal',
        'patient-schema',
        'DCMiniCalendarView',
        'TaskViewModel',
        'PredefinedReportsViewModel',
        'ConferenceAppointmentModel',
        'appointment-modal',
        'KoSchemaValue',
        'CalendarAppointmentModal',
        'HotkeysModal',
        'addnewroommodal',
        'addconfigurationmodal',
        'filterconfigurationmodal',
        'selectroommodal'
    ]
} );
