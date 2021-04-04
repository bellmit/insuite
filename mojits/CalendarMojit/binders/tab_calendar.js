/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, moment, ko, jQuery, $, _ */
/*exported fun */

'use strict';

fun = function _fn( Y/*, NAME*/ ) {

    var
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        binder = Y.doccirrus.utils.getMojitBinderByType( 'CalendarMojit' ),
        binderViewModel = binder.binderViewModel,
        EventSource = ko.bindingHandlers.fullCalendar.EventSource,
        DATE_FORMAT = 'DD.MM.YYYY',
        DATE_TIME_FORMAT = 'DD.MM.YYYY HH:mm',
        DEFAULT_DURATION = Y.doccirrus.schemas.scheduletype.getDefaultDuration(),
        PATIENT_LINK_TITLE = i18n( 'TaskModel.title.PATIENT_LINK_TITLE' ),
        NO_FREE_WAITING_ROOMS_WARN = i18n( 'CalendarMojit.tab_calendar.messages.NO_FREE_WAITING_ROOMS_WARN' ),
        NO_FREE_TREATMENT_ROOMS_WARN = i18n( 'CalendarMojit.tab_calendar.messages.NO_FREE_TREATMENT_ROOMS_WARN' ),
        viewModel = null;

    // array with all days in the week
    const allDays = [0, 1, 2, 3, 4, 5, 6];

    /**
     * Returns difference between two arrays
     * @param {Array} a
     * @param {Array} b
     * @returns {Array}
     */
    function difference( a, b ) {
        const s = new Set( b );
        return a.filter( function(x){return !s.has( x );} );
    }

    /**
     * Checks if object is DOM Element
     * @param {Object} obj
     * @returns {Boolean}
     */
    function isDomElement( obj ) {
        return (
            typeof HTMLElement === "object"
                ? obj instanceof HTMLElement
                : obj && typeof obj === "object" && obj !== null && obj.nodeType === 1 && typeof obj.nodeName === "string"
        );
    }

    /**
     * Creates and returns a DOM Element
     * @param {String} type type of element to create (div, img, etc)
     * @param {Array} [classNames] list of class names to add to element
     * @param {Array} [children] list of child elements to append to the element
     * @param {Object} [customAttributes] custom attributes to add, provided as key:value
     * @param {String} [text] textContent for the element
     * @returns {Element}
     */
    function renderElement( {type: type, classNames: classNames, children: children, customAttributes: customAttributes, text: text} ) {
        let element = document.createElement( type );
        if( classNames && classNames.length ) {
            element.classList.add( ...classNames );
        }
        if( children && children.length ) {
            children.forEach( function( child ) {
                if( isDomElement( child ) ) {
                    element.appendChild( child );
                }
            } );
        }
        if( customAttributes ) {
            Object.entries( customAttributes ).forEach( function( [name, value] ) {
                name = name || '';
                value = value || '';
                element.setAttribute( name, value );
            } );
        }
        if( text ) {
            element.textContent = text;
        }
        return element;
    }

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
     * FullCalendar event constrained config
     * @param config
     * @constructor
     */
    function ResizeConstrainDuration( config ) {
        var
            start = config.start;

        this.start = moment( start );
        this.end = moment( start ).add( 'minutes', 720 );
    }

    ResizeConstrainDuration.prototype = {};

    /**
     * @param {Object} parameters
     * @param {Array} parameters.calendars list of calendar objects to fetch blocked slots for
     * @constructor
     * @extends ko.bindingHandlers.fullCalendar.EventSource
     */
    function BlockingEventSource( parameters ) {
        var
            self = this,
            eventSource;

        BlockingEventSource.superclass.constructor.apply( self, arguments );

        eventSource = self.eventSource;
        self.id = 'BlockingEventSource';
        self.calendars = parameters.calendars || [];

        eventSource.color = 'gray';
        eventSource.rendering = 'background';
        eventSource.className = 'BlockingEventSource';

        self.eventSource.events = Y.bind( self._events, self );

    }

    Y.extend( BlockingEventSource, EventSource, {
        /**
         * @protected
         * @param start
         * @param end
         * @param timezone
         * @param callback
         * @see http://fullcalendar.io/docs/event_data/events_function/
         */
        _events: function BlockingEventSource__events( start, end, timezone, callback ) {
            var
                self = this,
                calendars = self.calendars,
                calendarIds = calendars.map( function BlockingEventSource__events_calendars_map( calendar ) {
                    return calendar._id;
                } ),
                includeInfoCalendar = false,
                fullCalendar = viewModel && viewModel.getFullCalendar(),
                dateFrom,
                dateTo,
                events = [];

            if( fullCalendar ) {
                dateFrom = fullCalendar.fullCalendar( 'getView' ).start.local().toJSON();
                dateTo = moment( fullCalendar.fullCalendar( 'getView' ).end ).add( 1, 'day' ).local().toJSON();
            }

            if( fullCalendar && 'verticalResourceView' === fullCalendar.fullCalendar( 'getView' ).name ) {
                //we should include info calendar only for verticalResourceView
                includeInfoCalendar = true;
            }

            Y.doccirrus.jsonrpc.api.calevent
                .getBlockedSlots( {
                    includeInfoCalendar: includeInfoCalendar,
                    calendar: calendarIds,
                    dateFrom: dateFrom,
                    dateTo: dateTo
                } )
                .then( function BlockingEventSource__events_getBlockedSlots_then_response( response ) {
                    return Array.isArray( response.data ) && response.data || [];
                } )
                .done( function BlockingEventSource__events_getBlockedSlots_done( slots ) {
                    var
                        unifiedSlots,
                        unifiedSlotsPerCalendar = {};

                    /**
                     * for a resource view we need to have unified results per resource
                     * TODO: 2.5.0 bug - rewrite me when fixed
                     * - of course it is possible to use just consult times & close times, but
                     * - beta2 unify of those times with "inverse-background" seems buggy
                     * - having all the same id and "inverse-background" with different "resourceId" renders only for the first occurrence
                     **/
                    if( fullCalendar && 'verticalResourceView' === fullCalendar.fullCalendar( 'getView' ).name ) {
                        calendarIds.forEach( function( id ) {
                            unifiedSlotsPerCalendar[id] = [];
                        } );

                        slots.forEach( function( slot ) {
                            unifiedSlotsPerCalendar[slot.calendar].push( slot );
                        } );

                        Y.each( unifiedSlotsPerCalendar, function( items, key ) {
                            if( Array.isArray( items ) ) {
                                unifiedSlots = Y.doccirrus.commonutils.unifyDurations( items ).map( function BlockingEventSource__events_getBlockedSlots_done_map( item ) {
                                    return { start: moment( item.start ).toJSON(), end: moment( item.end ).toJSON() };
                                } );

                                if( Array.isArray( unifiedSlots ) && unifiedSlots.length ) {
                                    unifiedSlots.forEach( function BlockingEventSource__events_getBlockedSlots_done_forEach( blocking ) {
                                        events.push( {
                                            start: blocking.start,
                                            end: blocking.end,
                                            dc: {
                                                calendars: Y.Array.filter( calendars, function( calendar ) {
                                                    return key === calendar._id;
                                                } )
                                            },
                                            resourceId: key
                                        } );
                                    } );
                                }
                            }
                        } );

                        callback( events );

                        return;
                    }

                    unifiedSlots = Y.doccirrus.commonutils.unifyDurations( slots ).map( function BlockingEventSource__events_getBlockedSlots_done_map( item ) {
                        return { start: moment( item.start ).toJSON(), end: moment( item.end ).toJSON() };
                    } );

                    if( Array.isArray( unifiedSlots ) && unifiedSlots.length ) {
                        unifiedSlots.forEach( function BlockingEventSource__events_getBlockedSlots_done_forEach( blocking ) {
                            events.push( {
                                start: blocking.start,
                                end: blocking.end,
                                dc: {
                                    calendars: calendars
                                }
                            } );
                        } );
                    }

                    callback( events );
                } );
        }
    } );

    /**
     * @param {Object} parameters
     * @param {Object} parameters.calendar calendar object to get consult times from
     * @constructor
     * @extends ko.bindingHandlers.fullCalendar.EventSource
     */
    function ConsultTimeEventSource( parameters ) {
        var
            self = this,
            calendar = parameters.calendar,
            eventSource;

        ConsultTimeEventSource.superclass.constructor.apply( self, arguments );

        eventSource = self.eventSource;
        self.calendar = calendar;
        self.id = 'ConsultTimeEventSource-' + calendar._id;

        eventSource.className = 'ConsultTimeEventSource';

        if( calendar.color ) {
            eventSource.color = calendar.color;
        }

        eventSource.rendering = 'background';

        self.eventSource.events = Y.bind( self._events, self );

    }

    Y.extend( ConsultTimeEventSource, EventSource, {
        /**
         * @protected
         * @param start
         * @param end
         * @param timezone
         * @param callback
         * @see http://fullcalendar.io/docs/event_data/events_function/
         */
        _events: function ConsultTimeEventSource__events( start, end, timezone, callback ) {
            var
                self = this,
                calendar = self.calendar,
                fullCalendar = viewModel && viewModel.getFullCalendar(),
                dateFrom,
                dateTo,
                events = [];


            if( fullCalendar ) {
                dateFrom = fullCalendar.fullCalendar( 'getView' ).start.local().toJSON();
                dateTo = moment( fullCalendar.fullCalendar( 'getView' ).end ).add( 1, 'day' ).local().toJSON();
            }

            Y.doccirrus.jsonrpc.api.calevent
                .getConsultTimes( {
                    calendar: calendar._id,
                    dateFrom: dateFrom,
                    dateTo: dateTo,
                    consult: true
                } )
                .then( function ( response ) {
                    return Array.isArray( response.data ) && response.data || [];
                } )
                .done( function ( slots ) {

                    if( Array.isArray( slots ) && slots.length ) {
                        slots.forEach( function ( consultTime ) {
                            var
                                event = {
                                    start: moment( consultTime.start ),
                                    end: moment( consultTime.end ),
                                    dc: {
                                        calendar: calendar
                                    },
                                    backgroundColor: consultTime.colorOfConsults,
                                    resourceId: calendar._id
                                };

                            events.push( event );
                        } );
                    }

                    callback( events );
                } );
        }
    } );

    /**
     * @param {Object} parameters
     * @param {Object} parameters.calendar calendar object to get consult times from
     * @constructor
     * @extends ko.bindingHandlers.fullCalendar.EventSource
     */
    function CloseTimeEventSource( parameters ) {
        var
            self = this,
            calendar = parameters.calendar,
            eventSource;

        CloseTimeEventSource.superclass.constructor.apply( self, arguments );

        eventSource = self.eventSource;
        self.calendar = calendar;
        self.id = 'CloseTimeEventSource-' + calendar._id;

        eventSource.className = 'CloseTimeEventSource';

        if( calendar.color ) {
            eventSource.color = calendar.color;
            eventSource.className += ' CloseTimeEventSource-background-' + Y.doccirrus.utils.getColorContrastType( calendar.color );
        }

        eventSource.rendering = 'background';

        self.eventSource.events = Y.bind( self._events, self );

    }

    Y.extend( CloseTimeEventSource, EventSource, {
        /**
         * @protected
         * @param start
         * @param end
         * @param timezone
         * @param callback
         * @see http://fullcalendar.io/docs/event_data/events_function/
         */
        _events: function CloseTimeEventSource__events( start, end, timezone, callback ) {
            var
                self = this,
                calendar = self.calendar;

            Y.doccirrus.jsonrpc.api
                .calevent.read( {
                eventType: 'closeTime',
                calendar: calendar._id,
                dateFrom: start.toJSON(),
                dateTo: end.toJSON()
            } )
                .done( function CloseTimeEventSource__events_read_done( response ) {
                    var
                        items = response.data,
                        events = items.map( function CloseTimeEventSource__events_read_done_data_items_map( item ) {
                            var
                                event = {
                                    start: item.start,
                                    end: item.end,
                                    title: item.title,
                                    dc: {
                                        calendar: calendar,
                                        schedule: item
                                    },
                                    resourceId: calendar._id
                                };

                            return event;
                        } );

                    callback( events );

                } );

        }
    } );

    /**
     * @param {Object} parameters
     * @param {Object} parameters.calendar calendar object to get events from
     * @constructor
     * @extends ko.bindingHandlers.fullCalendar.EventSource
     */
    function CalendarEventSource( parameters ) {
        var
            self = this,
            calendar = parameters.calendar,
            eventSource;

        CalendarEventSource.superclass.constructor.apply( self, arguments );

        eventSource = self.eventSource;
        eventSource.className = 'CalendarEventSource';

        self.id = 'CalendarEventSource-' + calendar._id;
        self.calendar = calendar;

        if( calendar.color && 'CALENDAR' === binderViewModel.get( 'inTimeConfig' ).colorMode ) {
            eventSource.color = calendar.color;
            eventSource.textColor = Y.doccirrus.utils.getContrastColor( calendar.color );
        }

        self.eventSource.events = Y.bind( self._events, self );
    }

    Y.extend( CalendarEventSource, EventSource, {
        /**
         * @protected
         * @param start
         * @param end
         * @param timezone
         * @param callback
         * @see http://fullcalendar.io/docs/event_data/events_function/
         */
        _events: function CalendarEventSource__events( start, end, timezone, callback ) {
            var
                self = this,
                calendar = self.calendar,
                fullCalendar = viewModel && viewModel.getFullCalendar(),
                view = fullCalendar.fullCalendar( 'getView' ),
                autoMutateOff = binderViewModel.get( 'inTimeConfig' ).autoMutateOff,
                classNameForSeverity = 'dc-triangle';

            switch( view.name ) {
                case 'basicDay':
                case 'basicWeek':
                case 'month':
                    classNameForSeverity = 'dc-triangle dc-severity-small-';
                    break;
                default:
                    classNameForSeverity = 'dc-triangle dc-severity-';
                    break;
            }

            Y.doccirrus.jsonrpc.api
                .calevent.read( {
                eventType: ['plan', 'adhoc', 'allDay'],
                calendar: calendar._id,
                dateFrom: start.toJSON(),
                dateTo: end.toJSON()
            } )
                .done( function CalendarEventSource__events_read_done( response ) {
                    var
                        items = response.data,
                        events = items.map( function CalendarEventSource__events_read_done_data_items_map( item ) {
                            if( item.severity === "NONE" && item.urgency !== 0 ) {
                                binderViewModel.urgencyMigrator( item );
                            }
                            if( item.group ) {
                                item.title = i18n( 'CalendarMojit.calendar.title.PLANNED_GROUP_APP' ) + '(' + item.capacityOfGroup +'), ' + item.title;
                            }
                            var
                                event = {
                                    id: item._id,
                                    start: autoMutateOff ? item.eta : item.start,
                                    end: autoMutateOff ? moment( item.eta ).add( 'minutes', item.plannedDuration ).toISOString() : item.end,
                                    title: item.title,
                                    className: classNameForSeverity + item.severity,
                                    dc: {
                                        calendar: calendar,
                                        schedule: item
                                    },
                                    resourceId: calendar._id
                                };

                            if( item.allDay ) {
                                // flag as an allDay event
                                event.allDay = true;
                            }

                            if( 'MEETING' === binderViewModel.get( 'inTimeConfig' ).colorMode && item.scheduletype ) {
                                event.color = binderViewModel.get( 'scheduleTypesColorMap' )[item.scheduletype];
                                event.textColor = Y.doccirrus.utils.getContrastColor( event.color );
                            }
                            /*if( item.adhoc ) {
                             // allow events' start times to be editable through dragging
                             event.startEditable = false;
                             }*/

                            return event;
                        } ).filter( function( item ) {
                            return item.start && item.end;
                        } );

                    callback( events );

                } );

        }
    } );

    /**
     * This views TabCalendarViewModel
     * @constructor
     * @extends KoDisposable
     */
    function TabCalendarViewModel() {
        TabCalendarViewModel.superclass.constructor.apply( this, arguments );
    }

    // patient has arrived if arrivalTime is set and is in the past
    function hasArrived( schedule ) {
        return schedule.arrivalTime && schedule.arrivalTime < new Date().toJSON();
    }

    /**
     * Handles confirm message for the drop event of dragged events in calendar
     * - such as changes and what is then shown
     * @param {Object} config
     * @param {Boolean} [config.copyCut] Flag to identify call from pasteCalevent function
     * @param {Object} [config.modified] A modified schedule data object
     * @param {Object} [config.schedule] The original schedule data object
     * @param {String} [config.notice] A Text displayed as notice
     * @param {String} [config.introduction] A other text as the default to display as introduction
     * @constructor
     */
    function EventDropConfirmViewModel( config ) {
        config = config || {};
        var
            modified = config.modified || {},
            schedule = config.schedule || {},
            copyCut = config.copyCut || false,
            self = this;

        self.introduction = ko.observable( config.introduction );
        self.modifiedCalendar = ko.observable( modified.calendar );
        self.modifiedEnd = ko.observable( modified.end );
        self.modifiedStart = ko.observable( modified.start );
        self.notice = ko.observable( config.notice );
        self.scheduleCalendar = ko.observable( schedule.calendar );
        self.scheduleEnd = ko.observable( schedule.end );
        self.scheduleIsAllDay = ko.observable( schedule.allDay );
        self.scheduleStart = ko.observable( schedule.start );
        self.scheduleTitle = ko.observable( schedule.title );

        self.fromTime = ko.computed( function() {
            var
                scheduleIsAllDay = self.scheduleIsAllDay(),
                scheduleStart = self.scheduleStart(),
                scheduleEnd = self.scheduleEnd(),
                timePart = '';

            if( scheduleIsAllDay ) {
                timePart = moment( scheduleStart ).format( DATE_FORMAT );
            }
            else {
                timePart = moment( scheduleStart ).format( DATE_TIME_FORMAT ) + ' - ' + moment( scheduleEnd ).format( DATE_TIME_FORMAT );
            }

            return timePart;
        } );

        self.toTime = ko.computed( function() {
            var
                scheduleIsAllDay = self.scheduleIsAllDay(),
                modifiedStart = self.modifiedStart(),
                modifiedEnd = self.modifiedEnd(),
                timePart = '';

            if( scheduleIsAllDay ) {
                timePart = moment( modifiedStart ).format( DATE_FORMAT );
            }
            else {
                timePart = moment( modifiedStart ).format( DATE_TIME_FORMAT ) + ' - ' + moment( modifiedEnd ).format( DATE_TIME_FORMAT );
            }

            return timePart;
        } );

        self.fromCalendar = ko.computed( function() {
            var
                scheduleCalendar = self.scheduleCalendar(),
                calendarData;

            if( scheduleCalendar ) {
                calendarData = Y.Array.find( peek( binderViewModel.calendars ), function( calendar ) {
                    return scheduleCalendar === calendar._id;
                } );
                if( calendarData ) {
                    scheduleCalendar = calendarData.name;
                }
            }

            return scheduleCalendar;
        } );

        self.toCalendar = ko.computed( function() {
            var
                modifiedCalendar = self.modifiedCalendar(),
                calendarData;

            if( modifiedCalendar ) {
                calendarData = Y.Array.find( peek( binderViewModel.calendars ), function( calendar ) {
                    return modifiedCalendar === calendar._id;
                } );
                if( calendarData ) {
                    modifiedCalendar = calendarData.name;
                }
            }

            return modifiedCalendar;
        } );

        self.fromText = ko.computed( function() {
            var
                fromTime = self.fromTime(),
                toTime = self.toTime(),
                fromCalendar = self.fromCalendar(),
                toCalendar = self.toCalendar(),
                fromLines = [];

            if( fromCalendar !== toCalendar ) {
                fromLines.push( fromCalendar );
            }

            if( fromTime !== toTime ) {
                fromLines.push( fromTime );
            }

            return fromLines.join( ', ' );

        } );

        self.toText = ko.computed( function() {
            var
                fromTime = self.fromTime(),
                toTime = self.toTime(),
                fromCalendar = self.fromCalendar(),
                toCalendar = self.toCalendar(),
                toLines = [];

            if( fromCalendar !== toCalendar ) {
                toLines.push( toCalendar );
            }

            if( fromTime !== toTime ) {
                toLines.push( toTime );
            }

            return toLines.join( ', ' );

        } );

        if( copyCut ) {
            if( schedule.isCopy ) {
                self.resheduleAppQuestionI18n = i18n( 'CalendarMojit.EventDropConfirmViewModel.COPY_APP_QUESTION' );
            } else {
                self.resheduleAppQuestionI18n = i18n( 'CalendarMojit.EventDropConfirmViewModel.CUT_APP_QUESTION' );
            }
        } else {
            self.resheduleAppQuestionI18n = i18n( 'CalendarMojit.EventDropConfirmViewModel.RESCHEDULE_APP_QUESTION' );
        }
        self.resheduleAppI18n = i18n( 'CalendarMojit.EventDropConfirmViewModel.APP' );
        self.resheduleFromI18n = i18n( 'CalendarMojit.EventDropConfirmViewModel.FROM' );
        self.resheduleToI18n = i18n( 'CalendarMojit.EventDropConfirmViewModel.TO' );

    }

    EventDropConfirmViewModel.prototype = {
        constructor: EventDropConfirmViewModel,
        /**
         * Returns a node already bound to this view model
         * @returns {Y.Node}
         */
        getNode: function() {
            var
                self = this,
                node = self.node = Y.Node.create( '<div data-bind="template: { name: \'template-appointmentEventDropConfirm\' }"></div>' );

            ko.applyBindings( self, node.getDOMNode() );
            return node;
        },
        /**
         * Destructor function
         */
        dispose: function() {
            var
                self = this,
                node = self.node,
                fromText = self.fromText,
                toText = self.toText,
                fromTime = self.fromTime,
                toTime = self.toTime,
                fromCalendar = self.fromCalendar,
                toCalendar = self.toCalendar;

            if( node ) {
                ko.cleanNode( node.getDOMNode() );
                self.node = null;
            }
            if( fromText ) {
                self.fromText.dispose();
                self.fromText = null;
            }
            if( toText ) {
                self.toText.dispose();
                self.toText = null;
            }
            if( fromTime ) {
                self.fromTime.dispose();
                self.fromTime = null;
            }
            if( toTime ) {
                self.toTime.dispose();
                self.toTime = null;
            }
            if( fromCalendar ) {
                self.fromCalendar.dispose();
                self.fromCalendar = null;
            }
            if( toCalendar ) {
                self.toCalendar.dispose();
                self.toCalendar = null;
            }
        }
    };

    Y.extend( TabCalendarViewModel, KoViewModel.getDisposable(), {
        /**
         * A name to identify this view model by
         * @property {String} viewName
         */
        viewName: 'tab_calendar',
        /** @protected */
        initializer: function TabCalendarViewModel_initializer() {
            var
                self = this;

            self.refreshView = Y.bind( self.refreshView, self );

            self.screenWidth = Y.doccirrus.utils.getBootstrapScreenWidthComputed();

            self._initClock();
            self._initTopAppointment();
            self._initEventSources();
            self._initCalendar();
            self._initActionButtons();
            self._initCalendarQuickChoice();
            self._initHotKeys();
            self._initCachePatientLink();
            self.setSocketListener();
            //translations
            self.nextLabelI18n = i18n('CalendarMojit.tab_calendar.label.NEXT');
            self.callUpI18n = i18n('CalendarMojit.tab_calendar.button.CALL_UP');
            self.arrivedI18n = i18n('CalendarMojit.tab_waiting-list.button.ARRIVED');
            self.calendarViewOptionsI18n = i18n( 'CalendarMojit.tab_calendar.label.calendarViewOptions' );
            self.newNumberI18n = i18n( 'CalendarMojit.tab_calendar.button.NEW_NUMBER' );
            self.newAppointmentI18n = i18n( 'CalendarMojit.tab_calendar.button.NEW_APPOINTMENT' );
            self.showConsultTimesLabelI18n = i18n( 'CalendarMojit.tab_calendar.showConsultTimes.label' );
            self.showCloseTimesLabelI18n = i18n( 'CalendarMojit.tab_calendar.showCloseTimes.label' );
            self.showCombinedConsultTimesLabelI18n = i18n( 'CalendarMojit.tab_calendar.showCombinedConsultTimes.label' );
            self.patientInCacheI18n = i18n( 'CalendarMojit.tab_calendar.patientInCache.label' );

            self.eventStateListener = Y.after( 'tab_calendar-state', self.eventStateListenerHandler, self );

        },

        _initHotKeys: function TabCalendarViewModel_initHotKeys() {
            var
                self = this;

            function isBackdropVisible() {
                var backdrop = document.getElementsByClassName( 'modal-backdrop' );
                return backdrop.length && 'none' !== backdrop[0].style.display;
            }

            if( !self.hotKeysGroup ) {
                self.hotKeysGroup = Y.doccirrus.HotKeysHandler.addGroup( 'CalendarViewModel' );
            }

            self.hotKeysGroup
                .on( 'ctrl+h', i18n( 'InCaseMojit.HotkeysModal.label' ), function() {
                    Y.doccirrus.modals.hotkeys.show( { 'hotKeysGroups': 'CalendarViewModel' } );
                } )
                .on( 'ctrl+n', i18n( 'CalendarMojit.tab_calendar.hotkey.NEW_NUMBER' ), function() {
                    self.nextNumberActionHandler();
                } )
                .on( 'ctrl+m', i18n( 'CalendarMojit.tab_calendar.hotkey.NEW_APPOINTMENT' ), function() {
                    self.getBinderViewModel().showAppointmentDialog( {} );
                } )
                .on( 'ctrl+p', i18n( 'CalendarMojit.tab_calendar.hotkey.PATIENT_LIST' ), function() {
                    window.location.href = Y.doccirrus.utils.getUrl( 'inCaseMojit' );
                } )
                .on( 'ctrl+s', i18n( 'CalendarMojit.tab_calendar.hotkey.SAVE' ), function() {
                    $( ".DCWindow button[name='ASSUME']" ).click();
                } )
                .on( 'arrowRight', i18n( 'CalendarMojit.tab_calendar.hotkey.MINICALENDAR_NEXT_DAY' ), function() {
                    if( isBackdropVisible() ) {
                        return true;
                    }
                    Y.doccirrus.DCMiniCalendarView.focusNext();
                    return false;
                } )
                .on( 'arrowLeft', i18n( 'CalendarMojit.tab_calendar.hotkey.MINICALENDAR_PREV_DAY' ), function() {
                    if( isBackdropVisible() ) {
                        return true;
                    }
                    Y.doccirrus.DCMiniCalendarView.focusPrev();
                    return false;
                } )
                .on( 'arrowDown', i18n( 'CalendarMojit.tab_calendar.hotkey.MINICALENDAR_NEXT_WEEK' ), function() {
                    if( isBackdropVisible() ) {
                        return true;
                    }
                    Y.doccirrus.DCMiniCalendarView.focusDown();
                    return false;
                } )
                .on( 'arrowUp', i18n( 'CalendarMojit.tab_calendar.hotkey.MINICALENDAR_PREV_WEEK' ), function() {
                    if( isBackdropVisible() ) {
                        return true;
                    }
                    Y.doccirrus.DCMiniCalendarView.focusUp();
                    return false;
                } )
                .on( 'shift+ctrl+arrowLeft', i18n( 'CalendarMojit.tab_calendar.hotkey.MINICALENDAR' ), function() {
                    self._CalendarQuickChoiceSlidePanel.$pin.click();
                } );
        },

        setSocketListener: function() {
            var self = this,
                //randId = Y.doccirrus.comctlLib.getRandId(),       //  check for disposal / multiple instantiation with this
                calendarFilteredIds;

            self.myCalendarListener = Y.doccirrus.communication.on( {
                event: 'calendar.refresh',
                done: function handleAction( response ) {
                    var
                        needToRefresh = false;

                    //  For dev / testing MOJ-10764, set the socketReloadDelay to 10000, uncomment the console logs
                    //  and open two calendar tabs in windows side by side

                    //console.log( '(====) fired calendar refresh subscription: ', randId, response.data, self.inRefreshFromWSEvent );

                    self.socketReloadDelay = 1000;

                    if( !response || !response.data ) {
                        return;
                    }

                    //  only accept one of these per socketReloadDelay, but keep track of which calendars are dirty
                    //  according to the server

                    if ( true === self.inRefreshFromWSEvent ) {
                        enqueCalendarsWhileWaiting( response.data );
                        return;
                    }

                    self.inRefreshFromWSEvent = true;
                    self.wsRefreshWaitingForCalendars = [];
                    enqueCalendarsWhileWaiting( response.data );

                    window.setTimeout( function() { waitedForABit(); }, self.socketReloadDelay );

                    function enqueCalendarsWhileWaiting( updatedCalIds ) {
                        if ( 'string' === typeof updatedCalIds ) { updatedCalIds = [ updatedCalIds ]; }
                        if ( !Array.isArray( updatedCalIds ) ) { return; }

                        updatedCalIds.forEach( function( item ) {
                            //console.log('(****) queueing request to reload: ', item );
                            //  only add if not duplicate
                            if (-1 === self.wsRefreshWaitingForCalendars.indexOf( item ) ) {
                                self.wsRefreshWaitingForCalendars.push( item );
                            }
                        } );
                    }

                    //  after the timeout we may have collected some more refresh events for different calendars
                    //  and discarded the duplicates

                    function waitedForABit() {
                        calendarFilteredIds = binderViewModel.calendarFilteredIds();

                        //console.log( '(****) waited for a bit, refreshing: ', self.wsRefreshWaitingForCalendars );

                        //  only refresh the calendars which are visible
                        needToRefresh = self.wsRefreshWaitingForCalendars.some( function( calendarId ) {
                            return -1 !== calendarFilteredIds.indexOf( calendarId );
                        } );

                        if( needToRefresh ) {
                            if( 1 < self.wsRefreshWaitingForCalendars.length ) {
                                self.refreshView( calendarFilteredIds );
                            } else {
                                self.refreshView( self.wsRefreshWaitingForCalendars );
                            }
                        }

                        self.wsRefreshWaitingForCalendars = [];
                        self.inRefreshFromWSEvent = false;
                    }
                }
            } );

            /** Listener for 'calendar.realign' server event, that emitted on each moveEvt call
             *
             *  1.  gets all client calendar events from fullcalendar
             *  2.  filters them by id to get CalendarEventSource events only
             *  3.  gets realigned events from server response
             *  4.  iterates through them and founded calendarEvents to set 'start' and 'end' values
             *      for each calendarEvent from an appropriate realigned event
             *  5.  calls updateClientEvent to rerender calandar event
             *
             * */
            self.realignmentListener = Y.doccirrus.communication.on( {
                event: 'calendar.realign',
                done: function handleAction( response ) {
                    var
                        i, j,
                        clientEvents = self.retrieveClientEvents(),
                        autoMutateOff = binderViewModel.get( 'inTimeConfig' ).autoMutateOff,
                        calendarEvents = clientEvents && clientEvents.filter( function( item ) {
                                //we add 'id' field for CalendarEventSource events only
                                return item.id;
                            } ),
                        realignedSchedules = response && response.data;

                    if( !realignedSchedules ) {
                        return;
                    }

                    //firstly, check if we have some client calendar events to update
                    if( calendarEvents && calendarEvents.length ) {
                        for( i = 0; i < realignedSchedules.length; i++ ) {
                            for( j = 0; j < calendarEvents.length; j++ ) {
                                if( realignedSchedules[i].id === calendarEvents[j].id ) {
                                    calendarEvents[j].start = autoMutateOff ? moment( realignedSchedules[i].eta ) : moment( realignedSchedules[i].start );
                                    calendarEvents[j].end = autoMutateOff ? moment( realignedSchedules[i].eta ).add( 'minutes', realignedSchedules[i].plannedDuration ) : moment( realignedSchedules[i].end );
                                    self.updateClientEvent( calendarEvents[j] );
                                }
                            }
                        }
                    } else {
                        return;
                    }
                }
            } );
            self.myBlockedSlotsListener = Y.doccirrus.communication.on( {
                event: 'calendar.blockedSlotRefresh',
                done: function handleAction( response ) {
                    var
                        needToRefresh = false;

                    //console.log( '(====) fired calendar blockedSlotRefresh subscription: ', randId );

                    calendarFilteredIds = binderViewModel.calendarFilteredIds();

                    if( !response || !response.data ) {
                        return;
                    }

                    if( Array.isArray( response.data ) ) {
                        needToRefresh = response.data.some( function( calendarId ) {
                            return -1 !== calendarFilteredIds.indexOf( calendarId );
                        } );
                    } else if( -1 !== calendarFilteredIds.indexOf( response.data ) ) {
                        needToRefresh = true;
                    }
                    if( needToRefresh ) {
                        self.refetchEventSourceById( "BlockingEventSource" );
                    }
                }
            } );
            self.myConsultTimesListener = Y.doccirrus.communication.on( {
                event: 'calendar.consultTimeRefresh',
                done: function handleAction( response ) {
                    var
                        needToRefresh = false;

                    //console.log( '(====) fired calendar consultTimeRefresh subscription: ', randId );

                    calendarFilteredIds = binderViewModel.calendarFilteredIds();

                    if( !response || !response.data ) {
                        return;
                    }
                    if( Array.isArray( response.data ) ) {
                        needToRefresh = response.data.some( function( calendarId ) {
                            return -1 !== calendarFilteredIds.indexOf( calendarId );
                        } );
                        if( needToRefresh && ko.unwrap( self.showConsultTimes ) ) {
                            if( 1 < response.data.length ) {
                                calendarFilteredIds.forEach( function( calendar ) {
                                    self.refetchEventSourceById( "ConsultTimeEventSource-" + calendar );
                                } );
                            } else {
                                self.refetchEventSourceById( "ConsultTimeEventSource-" + response.data[0] );
                            }
                        }
                    } else if( -1 !== calendarFilteredIds.indexOf( response.data ) ) {
                        if( ko.unwrap( self.showConsultTimes ) ) {
                            self.refetchEventSourceById( "ConsultTimeEventSource-" + response.data );
                        }
                    }
                }
            } );
            self.myCloseTimesListener = Y.doccirrus.communication.on( {
                event: 'calendar.closeTimeRefresh',
                done: function handleAction( response ) {
                    var
                        needToRefresh = false;

                    //console.log( '(====) fired calendar closeTimeRefresh subscription: ', randId );

                    calendarFilteredIds = binderViewModel.calendarFilteredIds();

                    if( !response || !response.data ) {
                        return;
                    }
                    if( Array.isArray( response.data ) ) {
                        needToRefresh = response.data.some( function( calendarId ) {
                            return -1 !== calendarFilteredIds.indexOf( calendarId );
                        } );
                        if( needToRefresh && ko.unwrap( self.showCloseTimes ) ) {
                            if( 1 < response.data.length ) {
                                calendarFilteredIds.forEach( function( calendar ) {
                                    self.refetchEventSourceById( "CloseTimeEventSource-" + calendar );
                                } );
                            } else {
                                self.refetchEventSourceById( "CloseTimeEventSource-" + response.data[0] );
                            }
                        }
                    } else if( -1 !== calendarFilteredIds.indexOf( response.data ) ) {
                        if( ko.unwrap( self.showCloseTimes ) ) {
                            self.refetchEventSourceById( "CloseTimeEventSource-" + response.data );
                        }
                    }
                }
            } );
        },

        _destroyHotkeys: function TabCalendarViewModel_destroyHokeys() {
            var
                self = this;

            if( self.hotKeysGroup ) {
                self.hotKeysGroup
                    .un( 'ctrl+h' )
                    .un( 'ctrl+n' )
                    .un( 'ctrl+m' )
                    .un( 'ctrl+p' )
                    .un( 'ctrl+s' )
                    .un( 'arrowRight' )
                    .un( 'arrowLeft' )
                    .un( 'arrowDown' )
                    .un( 'arrowUp' )
                    .un( 'shift+ctrl+arrowLeft' );
            }
        },
        /** @protected */
        destructor: function TabCalendarViewModel_destructor() {
            var
                self = this;

            self._destroyClock();
            self._destroyHotkeys();
            if( self.myCalendarListener ) {
                self.myCalendarListener.removeEventListener();
                self.myCalendarListener = null;
            }
            if( self.realignmentListener ) {
                self.realignmentListener.removeEventListener();
                self.realignmentListener = null;
            }
            if( self.myBlockedSlotsListener ) {
                self.myBlockedSlotsListener.removeEventListener();
                self.myBlockedSlotsListener = null;
            }
            if( self.myCloseTimesListener ) {
                self.myCloseTimesListener.removeEventListener();
                self.myCloseTimesListener = null;
            }
            if( self.myConsultTimesListener ) {
                self.myConsultTimesListener.removeEventListener();
                self.myConsultTimesListener = null;
            }
        },
        eventStateListenerHandler: function( yEvent, state ) {
            var
                self = this,
                id = state.params.id;

            switch( state.view ) {
                case 'details':
                    self.getBinderViewModel().readAppointment( { _id: id } ).done( function( schedule ) {
                        self.getBinderViewModel().showAppointmentDialog( schedule );
                    } );
                    break;
            }
        },
        /**
         * Returns the view model from the mojit binder
         * @return {BinderViewModel}
         */
        getBinderViewModel: function TabCalendarViewModel_getBinderViewModel() {
            return binderViewModel;
        },
        /**
         * Time to display
         * @type {null|ko.observable}
         */
        clock: null,
        /**
         * Interval handle of the refresh
         * @protected
         * @type {null|Number}
         */
        _clockInterval: null,
        /** @protected */
        _initClock: function TabCalendarViewModel__initClock() {
            var
                self = this;

            self.clock = ko.observable( moment().format( 'HH:mm' ) );
            self._clockInterval = window.setInterval( function TabCalendarViewModel__initClock_setInterval() {
                self.clock( moment().format( 'HH:mm' ) );
            }, 1000 );
        },
        /** @protected */
        _destroyClock: function TabCalendarViewModel__destroyClock() {
            var
                self = this;

            window.clearInterval( self._clockInterval );
            self._clockInterval = null;
            self.clock = null;
        },
        /**
         * EventSources handled by FullCalendar
         * @type {null|ko.observableArray}
         */
        eventSources: null,
        /**
         * Determine if consult times should be shown combined in the calendar
         * @type {null|ko.observable}
         */
        showCombinedConsultTimes: null,
        /**
         * Determine if consult times should be shown separately in the calendar
         * @type {null|ko.observable}
         */
        showConsultTimes: null,
        /**
         * Determine if close times should be shown separately in the calendar
         * @type {null|ko.observable}
         */
        showCloseTimes: null,
        /** @protected */
        _initEventSources: function TabCalendarViewModel__initEventSources() {
            var
                self = this,
                calendarsFiltered = binderViewModel.calendarsFiltered;

            self.eventSources = ko.observableArray();

            self.showCombinedConsultTimes = ko.observable( binderViewModel.readShowCombinedConsultTimes() );
            self.addDisposable( ko.computed( function TabCalendarViewModel__initEventSources_showCombinedConsultTimes_computed() {
                binderViewModel.writeShowCombinedConsultTimes( self.showCombinedConsultTimes() );
            } ) );
            self.showConsultTimes = ko.observable( binderViewModel.readShowConsultTimes() );
            self.addDisposable( ko.computed( function TabCalendarViewModel__initEventSources_showConsultTimes_computed() {
                binderViewModel.writeShowConsultTimes( self.showConsultTimes() );
            } ) );
            self.showCloseTimes = ko.observable( binderViewModel.readShowCloseTimes() );
            self.addDisposable( ko.computed( function TabCalendarViewModel__initEventSources_showCloseTimes_computed() {
                binderViewModel.writeShowCloseTimes( self.showCloseTimes() );
            } ) );

            // compute "showCombinedConsultTimes" dependent EventSources
            self.addDisposable( ko.computed( function TabCalendarViewModel__initEventSources_showCombinedConsultTimes_handle_BlockingEventSource() {
                var
                    calendarsFilteredItems = ko.utils.peekObservable( calendarsFiltered );

                self.removeBlockingEventSource();
                if( ko.unwrap( self.showCombinedConsultTimes ) ) {
                    if( calendarsFilteredItems.length ) {
                        self.addBlockingEventSource( {
                            calendars: calendarsFilteredItems
                        } );
                    }
                }
            } ) );

            // compute "showConsultTimes" dependent EventSources
            self.addDisposable( ko.computed( function TabCalendarViewModel__initEventSources_showConsultTimes_handle_ConsultTimeEventSource() {
                if( ko.unwrap( self.showConsultTimes ) ) {
                    ko.unwrap( calendarsFiltered ).forEach( function TabCalendarViewModel__initEventSources_showConsultTimes_handle_ConsultTimeEventSource_forEach( calendar ) {
                        if( !self.hasConsultTimeEventSource( calendar ) ) {
                            self.addConsultTimeEventSource( {
                                calendar: calendar
                            } );
                        }
                    } );
                }
                else {
                    self.removeConsultTimeEventSource();
                }
            } ) );

            // compute "showCloseTimes" dependent EventSources
            self.addDisposable( ko.computed( function TabCalendarViewModel__initEventSources_showCloseTimes_handle_CloseTimeEventSource() {
                if( ko.unwrap( self.showCloseTimes ) ) {
                    ko.unwrap( calendarsFiltered ).forEach( function TabCalendarViewModel__initEventSources_showCloseTimes_handle_CloseTimeEventSource_forEach( calendar ) {
                        if( !self.hasCloseTimeEventSource( calendar ) ) {
                            self.addCloseTimeEventSource( {
                                calendar: calendar
                            } );
                        }
                    } );
                }
                else {
                    self.removeCloseTimeEventSource();
                }
            } ) );

            // initially fill "calendarsFiltered" dependent EventSources
            ko.utils.peekObservable( calendarsFiltered ).forEach( function TabCalendarViewModel__initEventSources_calendarsFiltered_forEach( calendar ) {
                // "self.addConsultTimeEventSource" unnecessary because already done by compute "showConsultTimes"
                // "self.addCloseTimeEventSource" unnecessary because already done by compute "showCloseTimes"
                self.addCalenderEventSource( {
                    calendar: calendar
                } );
            } );

            // compute "calendarsFiltered" dependent EventSources
            self.addDisposable( calendarsFiltered.subscribe( function TabCalendarViewModel__initEventSources_calendarsFiltered_subscribe( actions ) {
                var
                    calendarsFilteredItems = ko.utils.peekObservable( calendarsFiltered ),
                    fullCalendar = self.getFullCalendar();

                if( fullCalendar ) {
                    // rebuild resources
                    fullCalendar.fullCalendar( 'refetchResources' );
                    fullCalendar.fullCalendar( 'refetchResources' ); // TODO: 2.5.0 bug - remove me when fixed
                }

                if( ko.utils.peekObservable( self.showCombinedConsultTimes ) ) {
                    self.removeBlockingEventSource();
                    if( calendarsFilteredItems.length ) {
                        self.addBlockingEventSource( {
                            calendars: calendarsFilteredItems
                        } );
                    }
                }
                Y.each( actions, function TabCalendarViewModel__initEventSources_calendarsFiltered_subscribe_each_actions( action ) {
                    var
                        calendar = action.value;

                    if( 'deleted' === action.status ) {
                        self.removeConsultTimeEventSource( calendar );
                        self.removeCloseTimeEventSource( calendar );
                        self.removeCalenderEventSource( calendar );
                    }
                    if( 'added' === action.status ) {
                        // "self.addConsultTimeEventSource" unnecessary because already done by compute "showConsultTimes"
                        // "self.addCloseTimeEventSource" unnecessary because already done by compute "showCloseTimes"
                        self.addCalenderEventSource( {
                            calendar: calendar
                        } );
                    }
                } );
            }, null, "arrayChange" ) );

        },
        /**
         * - "verticalResourceView" / "agendaDay" view is to be preserved and should not default to "agendaDay", when 'changeView' to a day-like view is triggered
         *
         * Determines if we should show the resource version for day views or not,
         * depends on what the user lastly visited
         * @type {Boolean}
         * @default false
         */
        dayViewIsInResourceMode: false,
        /**
         * fullCalendar binding config
         * @type {null|Object}
         */
        calendar: null,

        _initCustomConfigMenuFromTemplate: function TabCalendarViewModel__initCustomConfigMenu(hiddenDays) {
            var
                self = this,
                shownDays, weekdays, weekdayCheckboxProps,
                customConfigMenu, headerRight,
                hiddenDaysFromConfig = binderViewModel.get( 'inTimeConfig' ).hiddenDays.map( parseFloat );

            function moveSundayToEndOfList( checkboxList ) {
                checkboxList.push( checkboxList.shift() );
            }

            function htmlToElement( markupString ) {
                var template = document.createElement( 'template' );
                template.innerHTML = markupString.trim();
                return template.content.firstChild;
            }

            self.showCustomConfigMenu = ko.observable( false );
            shownDays = difference( allDays, hiddenDays ).map( String );
            self.shownDays = ko.observableArray( shownDays );

            // moment weekdays returns ['Sunday', 'Monday'...] specific to language
            // without passing arguments we get Sunday first, this way when we loop the weekdays
            //  they keep the index that matches directly with fullcalendar.io's hiddenDays identification
            //  system i.e. Sunday=0, Monday=1, etc
            weekdays = moment.weekdays();
            weekdayCheckboxProps = weekdays.map( function( weekdayString, index ) {
                return {
                    text: weekdayString,
                    value: String( index ), // this will be used to check against shownDays
                    disable: -1 !== hiddenDaysFromConfig.indexOf( index )
                };
            } );

            moveSundayToEndOfList( weekdayCheckboxProps ); // to have Monday first
            self.weekdayCheckboxProps = ko.observableArray( weekdayCheckboxProps );

            self.isWeekdayCustomisationProhibited = ko.computed( function() {
                var _shownDays = ko.unwrap( self.shownDays ).map( parseFloat );
                return !Boolean( _shownDays.length );
            } );

            Y.doccirrus.jsonrpc.api.jade
                .renderFile( {
                    path: 'CalendarMojit/views/template-custom-config-dropdown'
                } )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( markupString ) {
                    customConfigMenu = htmlToElement( markupString );
                    // add custom config dropdown menu component to DOM
                    headerRight = document.querySelector( '.fc-toolbar .fc-right' );
                    headerRight.appendChild( customConfigMenu );
                    // apply bindings
                    ko.applyBindings( {
                        showCustomConfigMenu: self.showCustomConfigMenu,
                        customiseWeekdaysShown: self.customiseWeekdaysShown,
                        setHiddenDays: self.setHiddenDays,
                        isWeekdayCustomisationProhibited: self.isWeekdayCustomisationProhibited,
                        buttonApplyTextI18n: i18n( 'general.button.TAKE' ),
                        weekdayCheckboxProps: self.weekdayCheckboxProps,
                        shownDays: self.shownDays
                    }, document.getElementById( 'custom-config-menu' ) );

                    self.customConfigLoaded = true;
                } );
        },

        /**
         * Initialised and renders the custom config dropdown menu with a checkbox list of days
         * of the week that are being shown in the calendar
         *
         * @param {Array} hiddenDays needed te check the checkboxes for each day of the week
         * @private
         */
        _initCustomConfigMenu: function TabCalendarViewModel__initCustomConfigMenu(hiddenDays) {
            var
                self = this,
                shownDays;

            self.showCustomConfigMenu = ko.observable( false );
            shownDays = difference(allDays, hiddenDays).map(String);
            self.shownDays = ko.observableArray( shownDays );

            /**
             * Creates and returns a checkbox Element with label, text and checkbox
             * e.g. [ ] Saturday
             * @param {String} text label text
             * @param {String} value checkbox value
             * @returns {Element}
             */
            function renderControlLabel( text, value ) {
                return renderElement( {
                    type: 'div', classNames: ['checkbox'], children: [
                        renderElement( {
                            type: 'label', classNames: ['control-label'], children: [
                                renderElement( {type: 'strong', text: text} ),
                                renderElement( {
                                    type: 'input',
                                    customAttributes: {
                                        value: value,
                                        type: 'checkbox',
                                        name: text.toLowerCase(),
                                        'data-bind': 'checked: shownDays'
                                    }
                                } )
                            ]
                        } )
                    ]
                } );
            }

            function moveSundayToEndOfList( checkboxList ) {
                checkboxList.push(checkboxList.shift());
            }

            // moment weekdays returns ['Sunday', 'Monday'...] specific to language
            var weekdays = moment.weekdays(true);

            // create dropdown component
            var weekdayCheckboxes = weekdays.map( renderControlLabel );
            moveSundayToEndOfList( weekdayCheckboxes );
            var updateButton = renderElement({
                type: 'button',
                text: i18n( 'general.button.TAKE' ),
                customAttributes: {
                    'data-bind': 'click: $root.customiseWeekdaysShown',
                    'disable': '$root.isWeekdayCustomisationProhibited()'
                }
            });
            self.customConfigMenuContainer = renderElement( {
                type: 'div',
                classNames: ['config-menu-dropdown'],
                children: [].concat(weekdayCheckboxes,[updateButton]),
                customAttributes: {
                    id: 'custom-config-menu',
                    'data-bind': 'visible: showCustomConfigMenu'
                }
            } );

            self.isWeekdayCustomisationProhibited = ko.computed( function() {
                var _shownDays = ko.unwrap( self.shownDays ).map( parseFloat );
                return !Boolean( _shownDays.length );
            } );

            // add custom config dropdown menu component to DOM
            var headerRight = document.querySelector( '.fc-toolbar .fc-right' );
            headerRight.appendChild( self.customConfigMenuContainer );

            ko.applyBindings( {
                showCustomConfigMenu: self.showCustomConfigMenu,
                shownDays: self.shownDays,
                customiseWeekdaysShown: self.customiseWeekdaysShown,
                isWeekdayCustomisationProhibited: self.isWeekdayCustomisationProhibited,
                setHiddenDays: self.setHiddenDays
            }, document.getElementById( 'custom-config-menu' ) );

            self.customConfigLoaded = true;
        },

        /**
         * On-click callback for the updateButton in the customConfig dropdown menu
         */
        customiseWeekdaysShown: function TabCalendarViewModel_customiseWeekdaysShown() {
            var
                self = this,
                shownDays;

            // toggle the customConfig dropdown menu
            self.showCustomConfigMenu(!self.showCustomConfigMenu());

            shownDays = ko.unwrap( self.shownDays ).map( parseFloat );
            self.hiddenDays = difference( allDays, shownDays );

            // store hiddenDays array to localStorage to override inTimeConfig on next page load
            self.setHiddenDays(self.hiddenDays);

            // as a quick-fix, reload the entire page;
            // in the future we could re-render just the calendar view
            location.reload();
        },

        /**
         * Returns an array of numbers for hiddenDays
         * first it tries to get from localStorage
         * defaults to inTimeConfig
         *
         * @return {Array} e.g. [0,6]
         */
        getHiddenDays: function TabCalendarViewModel_getHiddenDays() {
            var
                hiddenDaysFromLocalStorage = Y.doccirrus.utils.localValueGet( 'InTimeHiddenDays' ),
                hiddenDaysFromConfig,
                finalHiddenDays;
            if( hiddenDaysFromLocalStorage ) {
                hiddenDaysFromLocalStorage = JSON.parse( hiddenDaysFromLocalStorage );
            }
            hiddenDaysFromConfig = binderViewModel.get( 'inTimeConfig' ).hiddenDays.map( parseFloat ) || [];
            hiddenDaysFromLocalStorage = ( hiddenDaysFromLocalStorage || [] );
            finalHiddenDays = difference( allDays, hiddenDaysFromConfig );
            finalHiddenDays = difference( finalHiddenDays, hiddenDaysFromLocalStorage );
            return difference( allDays, finalHiddenDays );
        },

        /**
         * Sets the hidden days array to localStorage, thereby overriding the inTimeConfig
         * the array needs to be passed as an array of numbers otherwise it will not work
         *
         * @param {Array} hiddenDays
         */
        setHiddenDays: function TabCalendarViewModel_setHiddenDays(hiddenDays) {
            if( Y.doccirrus.commonutils.isArrayOfNumbers( hiddenDays ) ) {
                Y.doccirrus.utils.localValueSet( 'InTimeHiddenDays', hiddenDays );
            }
        },

        /**
         * Sets calendar event to localStorage for copy/cut and further paste it,
         * save 'cuttedEventId' in localStorage for cutted calevent
         *
         * @param {Object} calevent
         * @param {Boolean} isCopy Specify which action should be made: copy or cut
         */
        setEventForCopy: function( calevent, isCopy ) {
            if( isCopy ) {
                calevent.isCopy = true;
            } else {
                calevent.isCopy = false;
                // save id of cutted event in localStorage to hide it before paste
                Y.doccirrus.utils.localValueSet( 'cuttedEventId', calevent && calevent._id );
            }
            Y.doccirrus.utils.localValueSet( 'eventCopy', calevent );
        },
        /**
         * Paste event from value 'eventCopy' in localStorage and paste it
         * in 'calendarToPaste' with start 'date'
         *
         *@params {Object} date
         *@params {String} calendarToPaste
         *@params {Function} callback
         */
        pasteCalevent: function( date, calendarToPaste, callback ) {
            let
                confirmMoveMessage,
                eventCopy = Y.doccirrus.utils.localValueGet( 'eventCopy' ),
                eventToPaste;

            function failHandler( response ) {
                let
                    errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                if( errors.length ) {
                    _.invoke( errors, 'display' );
                }
                return callback();
            }

            function copyOrCutCalevent( calevent ) {
                let action;

                if( calevent.isCopy ) {
                    delete calevent._id;
                    action = function( event ) {
                        return Y.doccirrus.jsonrpc.api.calevent
                            .create( {
                                data: event
                            } );
                    };
                } else {
                    action = function( event ) {
                        return Y.doccirrus.jsonrpc.api.calevent.update( {
                            query: {_id: event._id},
                            data: event,
                            fields: ['start', 'end', 'eta', 'calendar', 'scheduletype']
                        } );
                    };
                }

                action( calevent )
                    .done( function( caleventResponse ) {
                        let
                            caleventWarnings = Y.doccirrus.errorTable.getWarningsFromResponse( caleventResponse );

                        if( caleventWarnings.length ) { // warnings currently actually doesn't save, but are not treated as errors

                            if( binderViewModel.get( 'inTimeConfig' ).allowBookingsOutsideOpeningHours ) {

                                if( 100002 === caleventWarnings[0].config.code ) {
                                    //appointment was already created w, so don't need user confirmation, just show as info
                                    Y.doccirrus.DCWindow.notice( {
                                        type: 'info',
                                        message: Y.doccirrus.errorTable.getMessage( {code: caleventWarnings[0].config.code} ),
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
                                                        }
                                                    } )
                                                ]
                                            }
                                        }
                                    } );
                                    return callback();
                                } else {
                                    Y.doccirrus.DCWindow.confirm( { // to be able to save the new appointment, warnings have to be confirmed by the user
                                        title: Y.doccirrus.utils.confirmDialog.title.CONFIRMATION,
                                        message: Y.doccirrus.errorTable.getMessage( {code: caleventWarnings[0].config.code} ), // also it seems as there can only be one warning
                                        callback: function( dialog ) {
                                            if( dialog.success ) {
                                                calevent.notConfirmed = false; // this tells the server to save regardless of warnings

                                                action( calevent )
                                                    .done( function( confirmedResponse ) {
                                                        _.invoke( Y.doccirrus.errorTable.getWarningsFromResponse( confirmedResponse ), 'display' );
                                                        return callback();
                                                    } )
                                                    .fail( failHandler );
                                            } else {
                                                return callback();
                                            }
                                        }
                                    } );
                                }
                            } else {
                                if( 7017 === caleventWarnings[0].config.code ) {
                                    Y.doccirrus.DCWindow.notice( {
                                        type: 'warn',
                                        message: i18n( 'calevent-api.create.error.scheduleTypeIsNotAvailableForThatTime' )
                                    } );
                                } else {
                                    Y.doccirrus.DCWindow.notice( {
                                        type: 'warn',
                                        message: i18n( 'calevent-api.create.error.bookingsOnlyAllowedWithinOpeningHours' )
                                    } );
                                }
                                return callback();
                            }
                        } else {
                            return callback();
                        }
                    } )
                    .fail( failHandler );
            }

            if( !eventCopy ) {
                return callback();
            }

            eventCopy = JSON.parse( eventCopy );
            eventToPaste = JSON.parse( JSON.stringify( eventCopy ) );
            // flag to trigger validation on put/post
            eventToPaste.notConfirmed = true;
            eventToPaste.isManualChange = true;
            eventToPaste.start = date.local().toJSON();
            eventToPaste.eta = eventToPaste.start;
            delete eventToPaste.roomId;

            if( eventToPaste.adhoc ) {
                if( !Y.doccirrus.schemas.calendar.isDoctorCalendar( calendarToPaste ) ) {
                    Y.doccirrus.DCWindow.notice( { message: i18n( 'CalendarMojit.calendar.alert.ADHOC_ONLY_DOCTOR' ) } );
                    return callback();
                }
            }

            if( eventToPaste.allDay ) {
                eventToPaste.end = moment( eventToPaste.start ).add( 23, 'hours' ).add( 59, 'minutes' ).toJSON();
            } else {
                eventToPaste.end = moment( eventToPaste.start ).add( eventToPaste.duration, 'minutes' ).toJSON();
            }

            if( calendarToPaste && (calendarToPaste !== eventCopy.calendar) ) {
                let pasteInDoctorCalendar = Y.doccirrus.schemas.calendar.isDoctorCalendar( calendarToPaste );
                //calendar will change
                eventToPaste.calendar = calendarToPaste;

                // don't paste allDay events to doctorCalendars ( in infocalendars only )
                if( eventToPaste.allDay && pasteInDoctorCalendar ) {
                    return callback();
                }

                jQuery
                    .when(
                        binder.doesCalendarAcceptScheduletypeId( calendarToPaste, eventToPaste.scheduletype ),
                        binder.readScheduletypesForCalendarId( eventCopy.calendar )
                    )
                    .done( function( doesAcceptScheduletype, scheduletypesForCurrent ) {
                        let
                            reason = doesAcceptScheduletype.reason,
                            confirmTitle = eventCopy.isCopy ? i18n( 'CalendarMojit.tab_calendar.title.COPY_APP' ) : i18n( 'CalendarMojit.tab_calendar.title.CUT_APP' ),
                            confirmButton = eventCopy.isCopy ? i18n( 'CalendarMojit.tab_calendar.button.COPY' ) : i18n( 'CalendarMojit.tab_calendar.button.CUT' ),
                            reasons = Y.doccirrus.schemas.calendar.doesCalendarAcceptScheduletypeId,
                            currentScheduletype = scheduletypesForCurrent.find( function( scheduletype ) {
                                return scheduletype._id === eventCopy.scheduletype;
                            } ),
                            currentScheduletypeName = currentScheduletype && currentScheduletype.name || '',
                            standardScheduletypeName = (scheduletypesForCurrent.find( function( item ) {
                                return Y.doccirrus.schemas.scheduletype.getStandardId() === item._id;
                            } ) || {}).name;

                        switch( reason ) {
                            case reasons.NO_MATCH_FOR_CALENDAR:
                                confirmMoveMessage = i18n( 'CalendarMojit.EventDropConfirmViewModel.NO_MATCH_FOR_CALENDAR', {
                                    data: {
                                        scheduletypeName: Y.Escape.html( currentScheduletypeName ),
                                        standardScheduletypeName: standardScheduletypeName
                                    }
                                } );
                                eventToPaste.scheduletype = pasteInDoctorCalendar ? Y.doccirrus.schemas.scheduletype.getStandardId() : undefined;
                                break;
                            case reasons.NOT_EMPTY_FOR_INFO:
                                confirmMoveMessage = i18n( 'CalendarMojit.EventDropConfirmViewModel.NOT_EMPTY_FOR_INFO', {
                                    data: {
                                        scheduletypeName: Y.Escape.html( currentScheduletypeName )
                                    }
                                } );
                                eventToPaste.scheduletype = undefined;
                                break;
                            case reasons.REQUIRED_FOR_CALENDAR:
                                confirmMoveMessage = i18n( 'CalendarMojit.EventDropConfirmViewModel.REQUIRED_FOR_CALENDAR' );
                                eventToPaste.scheduletype = Y.doccirrus.schemas.scheduletype.getStandardId();
                                break;
                        }

                        // show confirm modal only if we have something to confirm
                        if( confirmMoveMessage ) {
                            confirmMoveMessage = new EventDropConfirmViewModel( {
                                copyCut: true,
                                schedule: eventCopy,
                                modified: eventToPaste,
                                notice: confirmMoveMessage
                            } );
                            Y.doccirrus.DCWindow.confirm( {
                                title: confirmTitle,
                                message: confirmMoveMessage.getNode(),
                                buttonOkConfig: {
                                    label: confirmButton
                                },
                                window: {
                                    width: 'medium'
                                },
                                callback: function( confirm ) {
                                    if( confirm.success ) {
                                        return copyOrCutCalevent( eventToPaste );
                                    }
                                    confirmMoveMessage.dispose();
                                    return callback();
                                }
                            } );
                        } else {
                            // make paste
                            return copyOrCutCalevent( eventToPaste );
                        }
                    } )
                    .fail( failHandler );
                return;
            } else {
                return copyOrCutCalevent( eventToPaste );
            }
        },

        /** @protected */
        _initCalendar: function TabCalendarViewModel__initCalendar() {
            var
                self = this;

            let hiddenDays = self.getHiddenDays();

            self.inRefreshFromWSEvent = false;

            // reset these values on each calendar init
            Y.doccirrus.utils.localValueSet( 'eventCopy', {} );
            Y.doccirrus.utils.localValueSet( 'cuttedEventId', null );
            // this variable will save current cut/copy state
            // -1 for CUT, 1 for COPY, 0 for NONE
            self.cutOrCopyEvent = 0;

            self.calendar = {
                eventSources: self.eventSources,
                config: {
                    nowIndicator: true,
                    views: {
                        agendaDay: {
                            resources: false
                        }
                    },
                    customButtons: {
                      customConfig: {
                          icon: 'dropdown awesome-icon fa fa-angle-down',
                          text: '#',
                          click: function() {
                              self.showCustomConfigMenu(!self.showCustomConfigMenu());
                          }
                      }
                    },
                    header: {
                        right: 'agendaDay verticalResourceView agendaWeek month customConfig'
                    },
                    loading: function(loading) {
                      if (!loading && !self.customConfigLoaded) {
                          self._initCustomConfigMenuFromTemplate(hiddenDays);
                          // self._initCustomConfigMenu(hiddenDays);
                      }
                    },
                    resources: function( callback ) {
                        // build resource items
                        var
                            fullCalendar = self.getFullCalendar(),
                            resources = null,
                            currentView = null,
                            calendarConfig = null;

                        if( fullCalendar ) {
                            currentView = fullCalendar.fullCalendar( 'getView' );
                        }
                        // only build resources for the "verticalResourceView"
                        if( currentView && currentView.name === 'verticalResourceView' ) {
                            resources = peek( binderViewModel.calendarsFiltered ).map( function( calendar ) {

                                calendarConfig = {
                                    id: calendar._id,
                                    title: calendar.name,
                                    mirrorCalendarId: calendar.mirrorCalendarId
                                };

                                if( 'CALENDAR' === binderViewModel.get( 'inTimeConfig' ).colorMode ) {
                                    calendarConfig.eventColor = calendar.color;
                                    calendarConfig.eventTextColor = Y.doccirrus.utils.getContrastColor( calendar.color );
                                }

                                return calendarConfig;
                            } );
                        }
                        // for other views resources are cleared that makes them behave like normal
                        else {
                            resources = [];
                        }

                        callback( resources );

                    },
                    minTime: binderViewModel.get( 'inTimeConfig' ).calendarViewDayStart,
                    maxTime: binderViewModel.get( 'inTimeConfig' ).calendarViewDayEnd,
                    hiddenDays: hiddenDays,
                    slotDuration: binderViewModel.slotDuration,
                    defaultView: binderViewModel.readDefaultView(),
                    dayRightClick: function( cell, jsEvent, view ) {


                        if( self.cutOrCopyEvent ) {
                            let contextMenu;

                            // omit 'paste' contextMenu for:
                            // -- month view as we need exact date slot
                            if( view && 'month' === view.name ) {
                                Y.doccirrus.DCWindow.notice( {message: i18n( 'CalendarMojit.calendar.alert.PASTE_IN_MONTHVIEW' )} );
                                return false;
                            }

                            contextMenu = new Y.doccirrus.DCContextMenu( {
                                menu: [
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'CalendarMojit.tab_calendar.contextMenu.PASTE' ),
                                        click: function() {
                                            self.pasteCalevent( cell.start, cell.resourceId, function() {
                                                Y.doccirrus.utils.localValueSet( 'cuttedEventId', null );
                                                self.refetchEvents();
                                                self.cutOrCopyEvent = 0;
                                            } );

                                            contextMenu.close();
                                        }
                                    } )
                                ]
                            } );
                            contextMenu.showAt( jsEvent.pageX, jsEvent.pageY );
                        }
                        // Prevent browser context menu:
                        return false;
                    },
                    eventRightClick: function( event, jsEvent/*, view*/ ) {
                        var
                            source = event.source,
                            contextMenu,
                            dc = event.dc || {},
                            schedule = dc.schedule;

                        // disable copying of adhoc
                        if( schedule.adhoc ) {
                            if( binderViewModel.get( 'inTimeConfig' ).autoShift ) {
                                Y.doccirrus.DCWindow.notice( {message: i18n( 'CalendarMojit.calendar.alert.ADHOC' )} );
                                return false;
                            }
                        }

                        if( source && CalendarEventSource === source.instanceOf ) {
                            let event = self.retrieveClientEvents( schedule._id );
                            contextMenu = new Y.doccirrus.DCContextMenu( {
                                menu: [
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'CalendarMojit.tab_calendar.contextMenu.CUT' ),
                                        click: function() {

                                            self.cutOrCopyEvent = -1;
                                            self.setEventForCopy( schedule, false );
                                            self.updateClientEvent( event && event[0] );
                                            contextMenu.close();
                                        }
                                    } ),
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'CalendarMojit.tab_calendar.contextMenu.COPY' ),
                                        click: function() {
                                            self.cutOrCopyEvent = 1;
                                            self.setEventForCopy( schedule, true );

                                            Y.doccirrus.utils.localValueSet( 'cuttedEventId', null );
                                            self.updateClientEvent( event && event[0] );
                                            contextMenu.close();
                                        }
                                    } )
                                ]
                            } );
                            contextMenu.showAt( jsEvent.pageX, jsEvent.pageY );
                        }

                        // Prevent browser context menu:
                        return false;
                    },
                    select: function TabCalendarViewModel__initCalendar_calendar_select( start, end, jsEvent, view, resource ) {
                        start = start.local();
                        end = end.local();
                        var
                            now = moment(),
                            slotDurationMinutes = binderViewModel.slotDurationAsMinutes(),
                            duration = end.diff( start, 'minutes' ),
                            allDay = 1440 === duration,
                            isDragDuration = duration !== slotDurationMinutes && !allDay,
                            scheduleData = {
                                start: start.toJSON(),
                                end: end.toJSON(),
                                duration: isDragDuration ? duration : DEFAULT_DURATION
                            },
                            loadEvent =  Y.doccirrus.utils.sessionValueGet( 'loadEvent' ) ? JSON.parse( Y.doccirrus.utils.sessionValueGet( 'loadEvent' ) ) : undefined;

                        // if resource preset schedule data with calendar id
                        if( resource ) {
                            scheduleData.calendar = resource.id;
                            scheduleData.mirrorCalendarId = resource.mirrorCalendarId;
                        }

                        switch( view.name ) {
                            case 'basicDay':
                            case 'basicWeek':
                            case 'month':
                                start.hour( now.hour() ).minute( now.minute() );
                                end = moment( start ).add( 'minutes', DEFAULT_DURATION );
                                scheduleData.start = start.toJSON();
                                scheduleData.end = end.toJSON();
                                break;
                            default:
                                if( allDay ) { // a click in allDay section of "agendaDay" or "agendaWeek"
                                    start.hour( now.hour() ).minute( now.minute() );
                                    end = moment( start ).add( 'minutes', DEFAULT_DURATION );
                                    scheduleData.start = start.toJSON();
                                    scheduleData.end = end.toJSON();
                                }
                                break;
                        }

                        if( self.hasPreselectPatientId() ) {
                            scheduleData.patient = self.getPreselectPatientId() ;
                        }

                        if( loadEvent && loadEvent.preselection ) {
                            scheduleData.patient = loadEvent.preselection.patient;
                            scheduleData.calendar = resource ? resource.id : loadEvent.preselection.calendar;
                            scheduleData.userDescr = loadEvent.preselection.userDescr;
                            scheduleData.details = loadEvent.preselection.details;
                            scheduleData.scheduletype = loadEvent.preselection.scheduleType;
                            scheduleData.duration = isDragDuration ? duration : loadEvent.preselection.duration;
                            scheduleData.severity = loadEvent.preselection.severity;
                        }

                        binderViewModel
                            .showAppointmentDialog( scheduleData, {
                                userSetDuration: isDragDuration
                            } );
                    },
                    /**
                     * Triggered after an event has been placed on the calendar in its final position.
                     * @param event
                     * @param element
                     * @param view
                     * @see http://fullcalendar.io/docs/event_rendering/eventAfterRender/
                     */
                    eventAfterRender: function TabCalendarViewModel__initCalendar_calendar_eventAfterRender( event, element/*, view*/ ) {
                        // enable touch support
                        element.addTouch();
                    },
                    eventAfterAllRender: function TabCalendarViewModel__initCalendar_calendar_eventAfterAllRender() {

                        document.head.appendChild( binderViewModel.severityStyle );

                        binderViewModel.severityColorMap.forEach( function( item ) {
                            binderViewModel.severityStyle.sheet.insertRule( ".dc-severity-" + item.severity + "::after {border-width: 1rem;border-right-color:" + item.color + ";border-top-color:" + item.color + ";}", 0 );
                            binderViewModel.severityStyle.sheet.insertRule( ".dc-severity-small-" + item.severity + "::after {border-width: 7px;border-right-color:" + item.color + ";border-top-color:" + item.color + ";}", 0 );
                        } );
                    },
                    /**
                     * Triggered when the user mouses over an event.
                     * @param event
                     * @param jsEvent
                     * @param view
                     * @see http://fullcalendar.io/docs/mouse/eventMouseover/
                     */
                    eventMouseover: function TabCalendarViewModel__initCalendar_calendar__eventMouseover( /*event, jsEvent, view*/ ) {
                    },
                    /**
                     * Triggered when the user mouses out of an event.
                     * @param event
                     * @param jsEvent
                     * @param view
                     * @see http://fullcalendar.io/docs/mouse/eventMouseout/
                     */
                    eventMouseout: function TabCalendarViewModel__initCalendar_calendar_eventMouseout( /*event, jsEvent, view*/ ) {
                    },
                    /**
                     * Triggered when event dragging begins.
                     * @param event
                     * @param jsEvent
                     * @param ui
                     * @param view
                     * @see http://fullcalendar.io/docs/event_ui/eventDragStart/
                     */
                    eventDragStart: function TabCalendarViewModel__initCalendar_calendar_eventDragStart( /*event, jsEvent, ui, view*/ ) {
                    },
                    /**
                     * Triggered when event dragging stops.
                     * @param event
                     * @param jsEvent
                     * @param ui
                     * @param view
                     * @see http://fullcalendar.io/docs/event_ui/eventDragStop/
                     */
                    eventDragStop: function TabCalendarViewModel__initCalendar_calendar_eventDragStop( /*event, jsEvent, ui, view*/ ) {
                    },
                    /**
                     * Triggered when dragging stops and the event has moved to a different day/time.
                     * @param event
                     * @param delta
                     * @param revertFunc
                     * @param jsEvent
                     * @param ui
                     * @param view
                     * @see http://fullcalendar.io/docs/event_ui/eventDrop/
                     */
                    eventDrop: function TabCalendarViewModel__initCalendar_calendar_eventDrop( event, delta, revertFunc, jsEvent, ui, view ) {
                        var
                            schedule,
                            scheduleClone,
                            isResourceView = ('verticalResourceView' === view.name),
                            confirmMoveMessage = '',
                            calendarWillChange,
                            timeWillChange;

                        if( event.source ) {
                            if( event.source.instanceOf === CalendarEventSource ) {

                                schedule = event.dc.schedule;
                                scheduleClone = Y.clone( schedule, true );
                                calendarWillChange = (isResourceView && schedule.calendar !== event.resourceId);

                                // disable dragging between allDay and hours and vice versa
                                if( event.allDay !== scheduleClone.allDay ) {
                                    revertFunc();
                                    return;
                                }

                                // disable dragging of readOnly events
                                if( schedule.isReadOnly ) {
                                    revertFunc();
                                    return;
                                }

                                // apply changes to clone
                                if( calendarWillChange ) {
                                    scheduleClone.calendar = event.resourceId;
                                }
                                scheduleClone.start = event.start.toJSON();
                                if( scheduleClone.allDay ) {
                                    scheduleClone.end = moment( event.start ).add( 23, 'hours' ).add( 59, 'minutes' ).toJSON();
                                }
                                else {
                                    scheduleClone.end = event.end.toJSON();
                                }
                                timeWillChange = !(schedule.start === scheduleClone.start && schedule.end === scheduleClone.end);

                                // disable dragging of adhoc
                                if( schedule.adhoc ) {
                                    if( !Y.doccirrus.schemas.calendar.isDoctorCalendar( scheduleClone.calendar ) ) {
                                        revertFunc();
                                        Y.doccirrus.DCWindow.notice( { message: i18n( 'CalendarMojit.calendar.alert.ADHOC_ONLY_DOCTOR' ) } );
                                        return;
                                    }
                                    if( timeWillChange && binderViewModel.get( 'inTimeConfig' ).autoShift ) {
                                        revertFunc();
                                        Y.doccirrus.DCWindow.notice( { message: i18n( 'CalendarMojit.calendar.alert.ADHOC' ) } );
                                        return;
                                    }
                                }

                                /** handle calendar move and exit **/
                                if( calendarWillChange ) {

                                    jQuery
                                        .when(
                                            binder.validateCaleventData( scheduleClone ),
                                            binder.doesCalendarAcceptScheduletypeId( event.resourceId, scheduleClone.scheduletype ),
                                            binder.readScheduletypesForCalendarId( schedule.calendar )
                                        )
                                        .done( function( validationErrors, doesAcceptScheduletype, scheduletypesForCurrent ) {
                                            var
                                                reason = doesAcceptScheduletype.reason,
                                                reasons = Y.doccirrus.schemas.calendar.doesCalendarAcceptScheduletypeId,
                                                currentScheduletype = Y.Array.find( scheduletypesForCurrent, function( scheduletype ) {
                                                    return scheduletype._id === schedule.scheduletype;
                                                } ),
                                                currentScheduletypeName = currentScheduletype && currentScheduletype.name || '',
                                                standardScheduletypeName = (scheduletypesForCurrent.find( function( item ) {
                                                    return Y.doccirrus.schemas.scheduletype.getStandardId() === item._id;
                                                } ) || {}).name;

                                            /** show modal for validation errors and exit **/
                                            if( validationErrors.length ) {

                                                binderViewModel
                                                    .showAppointmentDialog( scheduleClone )
                                                    .after( {
                                                        save: function TabCalendarViewModel__initCalendar_calendar_eventDrop_showAppointmentDialog_save() {
                                                        },
                                                        cancel: function TabCalendarViewModel__initCalendar_calendar_eventDrop_showAppointmentDialog_cancel() {
                                                            revertFunc();
                                                        },
                                                        'delete': function TabCalendarViewModel__initCalendar_calendar_eventDrop_showAppointmentDialog_delete() {
                                                        }
                                                    } );

                                                return;
                                            }

                                            switch( reason ) {
                                                case reasons.NO_MATCH_FOR_CALENDAR:
                                                    confirmMoveMessage = i18n( 'CalendarMojit.EventDropConfirmViewModel.NO_MATCH_FOR_CALENDAR', {
                                                        data: {
                                                            scheduletypeName: Y.Escape.html( currentScheduletypeName ),
                                                            standardScheduletypeName: standardScheduletypeName
                                                        }
                                                    } );
                                                    break;
                                                case reasons.NOT_EMPTY_FOR_INFO:
                                                    confirmMoveMessage = i18n( 'CalendarMojit.EventDropConfirmViewModel.NOT_EMPTY_FOR_INFO', {
                                                        data: {
                                                            scheduletypeName: Y.Escape.html( currentScheduletypeName )
                                                        }
                                                    } );
                                                    break;
                                                case reasons.REQUIRED_FOR_CALENDAR:
                                                    confirmMoveMessage = i18n( 'CalendarMojit.EventDropConfirmViewModel.REQUIRED_FOR_CALENDAR' );
                                                    break;
                                            }
                                            confirmMoveMessage = new EventDropConfirmViewModel( {
                                                schedule: schedule,
                                                modified: scheduleClone,
                                                notice: confirmMoveMessage
                                            } );
                                            Y.doccirrus.DCWindow.confirm( {
                                                title: i18n( 'CalendarMojit.tab_calendar.title.RESCHEDULE_APP' ),
                                                message: confirmMoveMessage.getNode(),
                                                buttonOkConfig: {
                                                    label: i18n( 'CalendarMojit.tab_calendar.button.RESCHEDULE' )
                                                },
                                                window: {
                                                    width: 'medium'
                                                },
                                                callback: function( confirm ) {
                                                    if( confirm.success ) {
                                                        Y.doccirrus.jsonrpc.api.calevent
                                                            .moveEventToOtherCalendarColumn( {
                                                                caleventId: schedule._id,
                                                                calendarId: scheduleClone.calendar,
                                                                start: scheduleClone.start,
                                                                notConfirmed: true,
                                                                end: scheduleClone.end
                                                            } )
                                                            .done( function( response ) {
                                                                var argumentsArray = new Y.Array( arguments ),
                                                                    updateAppointmentWarnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                                                                if( updateAppointmentWarnings.length ) { // warnings currently actually doesn't save, but are not treated as errors
                                                                    if( binderViewModel.get( 'inTimeConfig' ).allowBookingsOutsideOpeningHours ) {
                                                                        Y.doccirrus.DCWindow.confirm( { // to be able to save the appointment, warnings have to be confirmed by the user
                                                                            title: Y.doccirrus.utils.confirmDialog.title.CONFIRMATION,
                                                                            message: Y.doccirrus.errorTable.getMessage( {code: updateAppointmentWarnings[0].config.code} ), // also it seems as there can only be one warning
                                                                            callback: function( dialog ) {
                                                                                if( dialog.success ) {

                                                                                    Y.doccirrus.jsonrpc.api.calevent
                                                                                        .moveEventToOtherCalendarColumn( {
                                                                                            caleventId: schedule._id,
                                                                                            calendarId: scheduleClone.calendar,
                                                                                            notConfirmed: false,
                                                                                            start: scheduleClone.start,
                                                                                            end: scheduleClone.end
                                                                                        } )
                                                                                        .done( function() {
                                                                                            var argumentsArray = new Y.Array( arguments );

                                                                                            binderViewModel.propagateAppointmentModification( 'save', argumentsArray );
                                                                                        } )
                                                                                        .fail( fail );

                                                                                } else {
                                                                                    revertFunc();
                                                                                }
                                                                            }
                                                                        } );
                                                                    }
                                                                    else {
                                                                        if( 7017 === updateAppointmentWarnings[0].config.code ) {
                                                                            Y.doccirrus.DCWindow.notice( {
                                                                                type: 'warn',
                                                                                message: i18n( 'calevent-api.create.error.scheduleTypeIsNotAvailableForThatTime' )
                                                                            } );
                                                                        } else {
                                                                            Y.doccirrus.DCWindow.notice( {
                                                                                type: 'warn',
                                                                                message: i18n( 'calevent-api.create.error.bookingsOnlyAllowedWithinOpeningHours' )
                                                                            } );
                                                                        }
                                                                        revertFunc();
                                                                    }
                                                                }
                                                                else {
                                                                    binderViewModel.propagateAppointmentModification( 'save', argumentsArray );
                                                                }
                                                            } )
                                                            .fail( fail )
                                                            .fail( function() {
                                                                revertFunc();
                                                            } )
                                                            .always( function() {
                                                            } );
                                                    }
                                                    else {
                                                        revertFunc();
                                                    }
                                                    confirmMoveMessage.dispose();
                                                }
                                            } );
                                        } )
                                        .fail( fail )
                                        .fail( function() {
                                            revertFunc();
                                        } );

                                    return;
                                }

                                /** handle unhandled moves **/
                                confirmMoveMessage = new EventDropConfirmViewModel( {
                                    schedule: schedule,
                                    modified: scheduleClone
                                } );

                                Y.doccirrus.DCWindow.confirm( {
                                    title: i18n( 'CalendarMojit.tab_calendar.title.RESCHEDULE_APP' ),
                                    message: confirmMoveMessage.getNode(),
                                    buttonOkConfig: {
                                        label: i18n( 'CalendarMojit.tab_calendar.button.RESCHEDULE' )
                                    },
                                    window: {
                                        width: 'medium'
                                    },
                                    callback: function TabCalendarViewModel__initCalendar_calendar_eventDrop_confirm( confirm ) {

                                        if( confirm.success ) {

                                            Y.doccirrus.jsonrpc.api.calevent
                                                .update( {
                                                    query: { _id: schedule._id },
                                                    data: {
                                                        _id: schedule._id,
                                                        resource: schedule.resource,
                                                        linkByResource: schedule.linkByResource,
                                                        scheduletype: schedule.scheduletype,
                                                        group: schedule.group,
                                                        start: scheduleClone.start,
                                                        end: scheduleClone.end,
                                                        calendar: schedule.calendar,
                                                        isManualChange: true,
                                                        notConfirmed: true,
                                                        repetition: schedule.repetition,
                                                        dtstart: schedule.dtstart,
                                                        until: schedule.until
                                                    },
                                                    fields: ['start', 'end']
                                                } )
                                                .done( function( response ) {
                                                    var argumentsArray = new Y.Array( arguments ),
                                                        updateAppointmentWarnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                                                    if( updateAppointmentWarnings.length ) { // warnings currently actually doesn't save, but are not treated as errors
                                                        if( binderViewModel.get( 'inTimeConfig' ).allowBookingsOutsideOpeningHours ) {
                                                            Y.doccirrus.DCWindow.confirm( { // to be able to save the appointment, warnings have to be confirmed by the user
                                                                title: Y.doccirrus.utils.confirmDialog.title.CONFIRMATION,
                                                                message: Y.doccirrus.errorTable.getMessage( {code: updateAppointmentWarnings[0].config.code, data: updateAppointmentWarnings[0].config.data} ), // also it seems as there can only be one warning
                                                                callback: function( dialog ) {
                                                                    if( dialog.success ) {

                                                                        Y.doccirrus.jsonrpc.api.calevent
                                                                            .update( {
                                                                                query: {_id: schedule._id},
                                                                                data: {
                                                                                    start: scheduleClone.start,
                                                                                    end: scheduleClone.end,
                                                                                    calendar: schedule.calendar,
                                                                                    scheduletype: schedule.scheduletype,
                                                                                    isManualChange: true,
                                                                                    repetition: schedule.repetition,
                                                                                    dtstart: schedule.dtstart,
                                                                                    until: schedule.until,
                                                                                    notConfirmed: false
                                                                                },
                                                                                fields: ['start', 'end']
                                                                            } )
                                                                            .done( function() {
                                                                                var argumentsArray = new Y.Array( arguments );

                                                                                binderViewModel.propagateAppointmentModification( 'save', argumentsArray );
                                                                            } )
                                                                            .fail( fail );
                                                                    } else {
                                                                        revertFunc();
                                                                    }
                                                                }
                                                            } );
                                                        }
                                                        else {
                                                            if( 7017 === updateAppointmentWarnings[0].config.code ) {
                                                                Y.doccirrus.DCWindow.notice( {
                                                                    type: 'warn',
                                                                    message: i18n( 'calevent-api.create.error.scheduleTypeIsNotAvailableForThatTime' )
                                                                } );
                                                            } else {
                                                                Y.doccirrus.DCWindow.notice( {
                                                                    type: 'warn',
                                                                    message: i18n( 'calevent-api.create.error.bookingsOnlyAllowedWithinOpeningHours' )
                                                                } );
                                                            }
                                                            revertFunc();
                                                        }
                                                    }
                                                    else {
                                                        binderViewModel.propagateAppointmentModification( 'save', argumentsArray );
                                                    }
                                                } )
                                                .fail( fail )
                                                .fail( function TabCalendarViewModel__initCalendar_calendar_eventDrop_confirm_calevent_update_fail() {
                                                    revertFunc();
                                                } )
                                                .always( function() {
                                                } );
                                        }
                                        else {
                                            revertFunc();
                                        }

                                        confirmMoveMessage.dispose();
                                    }
                                } );

                            }
                        }
                    },
                    /**
                     * Triggered when event resizing begins.
                     * @param event
                     * @param jsEvent
                     * @param ui
                     * @param view
                     * @see http://fullcalendar.io/docs/event_ui/eventResizeStart/
                     */
                    eventResizeStart: function TabCalendarViewModel__initCalendar_calendar_eventResizeStart( event/*, jsEvent, ui, view*/ ) {
                        if( !event.constraint ) {
                            event.constraint = new ResizeConstrainDuration( { start: event.start } );
                        }
                    },
                    /**
                     * Triggered when event resizing stops.
                     * @param event
                     * @param jsEvent
                     * @param ui
                     * @param view
                     * @see http://fullcalendar.io/docs/event_ui/eventResizeStop/
                     */
                    eventResizeStop: function TabCalendarViewModel__initCalendar_calendar_eventResizeStop( event/*, jsEvent, ui, view*/ ) {
                        if( event.constraint && event.constraint instanceof ResizeConstrainDuration ) {
                            delete event.constraint;
                        }
                    },
                    /**
                     * Triggered when resizing stops and the event has changed in duration.
                     * @param event
                     * @param delta
                     * @param revertFunc
                     * @param jsEvent
                     * @param ui
                     * @param view
                     * @see http://fullcalendar.io/docs/event_ui/eventResize/
                     */
                    eventResize: function TabCalendarViewModel__initCalendar_calendar_eventResize( event, delta, revertFunc/*, jsEvent, ui, view*/ ) {
                        var
                            schedule;

                        if( event.source ) {
                            if( event.source.instanceOf === CalendarEventSource ) {

                                schedule = Y.clone( event.dc.schedule, true );

                                if( schedule.isReadOnly ) {
                                    revertFunc();
                                    return;
                                }

                                schedule.end = event.end.toJSON();
                                schedule.duration = parseInt( event.end.diff( event.start, 'minutes' ), 10 );
                                schedule.plannedDuration = parseInt( event.end.diff( event.start, 'minutes' ), 10 );
                                if( schedule.linkByResource ) {
                                    schedule.notConfirmed = true;
                                }

                                Y.doccirrus.jsonrpc.api.calevent
                                    .update( {
                                        query: { _id: schedule._id },
                                        data: schedule,
                                        fields: ['end', 'duration', 'plannedDuration']
                                    } )
                                    .done( function TabCalendarViewModel__initCalendar_calendar_eventResize_calevent_update_done( response ) {
                                        var
                                            updateAppointmentWarnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                                        if( updateAppointmentWarnings.length && schedule.linkByResource ) { // warnings currently actually doesn't save, but are not treated as errors
                                                Y.doccirrus.DCWindow.confirm( { // to be able to save the appointment, warnings have to be confirmed by the user
                                                    title: Y.doccirrus.utils.confirmDialog.title.CONFIRMATION,
                                                    message: Y.doccirrus.errorTable.getMessage( {code: updateAppointmentWarnings[0].config.code, data: updateAppointmentWarnings[0].config.data} ), // also it seems as there can only be one warning
                                                    callback: function( dialog ) {
                                                        if( dialog.success ) {
                                                            schedule.notConfirmed = false;
                                                            Y.doccirrus.jsonrpc.api.calevent
                                                                .update( {
                                                                    query: { _id: schedule._id },
                                                                    data: schedule,
                                                                    fields: ['end', 'duration', 'plannedDuration']
                                                                } )
                                                                .done( function() {
                                                                    var argumentsArray = new Y.Array( arguments );
                                                                    binderViewModel.propagateAppointmentModification( 'save', argumentsArray );
                                                                } )
                                                                .fail( fail );
                                                        } else {
                                                            revertFunc();
                                                        }
                                                    }
                                                } );
                                        }
                                        else {
                                            Y.Array.invoke( updateAppointmentWarnings, 'display' );
                                            binderViewModel.propagateAppointmentModification( 'save', arguments );
                                        }
                                    } )
                                    .fail( fail )
                                    .fail( function TabCalendarViewModel__initCalendar_calendar_eventResize_calevent_update_fail() {
                                        self.refreshView();
                                    } );

                            }
                        }
                    },
                    /**
                     * Triggered while an event is being rendered.
                     * @param event
                     * @param element
                     * @param view
                     * @see http://fullcalendar.io/docs/event_rendering/eventRender/
                     */
                    eventRender: function TabCalendarViewModel__initCalendar_calendar_eventRender( event, element/*, view*/ ) {
                        var
                            source = event.source,
                            dc = event.dc || {},
                            cuttedEvent = Y.doccirrus.utils.localValueGet( 'cuttedEventId' ),
                            schedule = dc.schedule;

                        // handle events that belong to "eventSources", e.g. the "fc-helper" doesn't have a source
                        if( source && event.end ) {

                            if( CalendarEventSource === source.instanceOf && !schedule.allDay ) {
                                if( undefined !== schedule.number ) {
                                    element.css( 'opacity', 0.85 );
                                }

                                if( event.end.isBefore( moment() ) || Y.doccirrus.schemas.calendar.SCH_WAITING !== schedule.scheduled ) {
                                    element.css( 'opacity', 0.5 );
                                }
                            }
                        }

                        if (schedule && schedule.isReadOnly) {
                            element.addClass('fc-readonly');
                            element.find('.fc-time').append('<i class="fa fa-lock" aria-hidden="true"></i>');
                        }

                        if( schedule && cuttedEvent && cuttedEvent === schedule._id ) {
                            element.addClass( 'fc-cutted' );
                        }

                    },
                    /**
                     * Triggered when a new date-range is rendered, or when the view type switches.
                     * @param view
                     * @param element
                     * @see http://fullcalendar.io/docs/display/viewRender/
                     */
                    viewRender: function TabCalendarViewModel__initCalendar_calendar_viewRender( view/*, element*/ ) {
                        var
                            fullCalendar = self.getFullCalendar();

                        self.refetchEvents(); // needed to rebuild BlockingEvents for resourceView @see: BlockingEventSource._events

                        // rebuild "resources"
                        if( fullCalendar ) {
                            fullCalendar.fullCalendar( 'refetchResources' );
                            fullCalendar.fullCalendar( 'refetchResources' ); // TODO: 2.5.0 bug - remove me when fixed
                        }

                        // "verticalResourceView" / "agendaDay" view is to be preserved and should not default to "agendaDay", when 'changeView' to a day-like view is triggered
                        switch( view.name ) {
                            case 'verticalResourceView':
                                self.dayViewIsInResourceMode = true;
                                break;
                            case 'agendaDay':
                                self.dayViewIsInResourceMode = false;
                                break;
                        }

                        binderViewModel.writeDefaultView( view.name ); // update for re-initializing
                        self.calendar.config.defaultView = binderViewModel.readDefaultView(); // update w/o re-initializing
                        self.calendar.config.defaultDate = moment( view.calendar.getDate() ); // preserve the current date, in case the fullCalendar instance have to be destroyed
                    },
                    /**
                     * Triggered when the user clicks an event.
                     * @param event
                     * @param jsEvent
                     * @param view
                     * @see http://fullcalendar.io/docs/mouse/eventClick/
                     */
                    eventClick: function TabCalendarViewModel__initCalendar_calendar_eventClick( event/*, jsEvent, view*/ ) {
                        if( event.source && (event.source.instanceOf === CalendarEventSource) ) {
                            if (event.dc.schedule.isReadOnly) {
                                if (event.dc.schedule.url){
                                    window.open( event.dc.schedule.url );
                                }
                                if( event.dc.schedule.linkByResource ) {
                                    binderViewModel
                                        .readAppointment( {
                                            linkByResource: event.dc.schedule.linkByResource
                                        } )
                                        .done( function( schedule ) {
                                            if( schedule ) {
                                                binderViewModel
                                                    .showAppointmentDialog( schedule );
                                            }
                                        } );
                                }
                            } else {
                                binderViewModel
                                    .showAppointmentAdministrationWindow( event.dc.schedule )
                                    .after( {
                                        edit: function TabCalendarViewModel__initCalendar_calendar_eventClick_showAppointmentAdministrationWindow_edit( /*data === event.dc.schedule*/ ) {
                                            binderViewModel
                                                .showAppointmentDialog( event.dc.schedule );
                                        }
                                    } );
                            }
                        }
                    },
                    dayViewIsInResourceMode: function() {
                        return self.dayViewIsInResourceMode;
                    }
                },
                bgeventMouseMove: Y.bind( self.bgeventMouseMove, self ),
                eventPopOver: {
                    getTitle: function TabCalendarViewModel__initCalendar_calendar_getTitle( event ) {
                        var title;

                        if( event.source ) {
                            if( event.source.instanceOf === CalendarEventSource ) {
                                title = Y.Escape.html( event.dc.schedule.title );

                                if (event.dc.schedule.isReadOnly) {
                                    title = '<i class="fa fa-lock" aria-hidden="true"></i> ' + title;
                                }

                                return title;
                            }
                        }
                        return null;
                    },
                    getTitleCss: function TabCalendarViewModel__initCalendar_calendar_getTitleCss( event ) {
                        if( event.source ) {
                            if( event.source.instanceOf === CalendarEventSource ) {
                                return {
                                    color: event.source.textColor,
                                    backgroundColor: event.source.color
                                };
                            }
                        }
                        return null;
                    },
                    getContent: function TabCalendarViewModel__initCalendar_calendar_getContent( event ) {
                        var
                            listItems = [],
                            schedule = event.dc.schedule;

                        if( event.source ) {
                            if( event.source.instanceOf === CalendarEventSource ) {

                                if( schedule.allDay ) {
                                    listItems.push( i18n( 'CalendarMojit.eventPopOver.allDay.headline' ) );
                                }
                                else {
                                    if( schedule.adhoc ) {
                                        listItems.push(
                                            i18n( 'CalendarMojit.eventPopOver.adhoc.headline' ),
                                            i18n( 'CalendarMojit.eventPopOver.adhoc.label' ) + ': ' + schedule.number
                                        );
                                    }
                                    else {
                                        listItems.push( i18n( 'CalendarMojit.eventPopOver.planned.headline' ) );
                                    }

                                    listItems.push(
                                        i18n( 'CalendarMojit.eventPopOver.time' ) + ': ' + event.start.format( 'HH:mm' ) + ' - ' + event.end.format( 'HH:mm' ),
                                        i18n( 'CalendarMojit.eventPopOver.duration' ) + ': ' + schedule.duration + ' Minuten'
                                    );
                                }

                                if( Y.Lang.isString( schedule.details ) && schedule.details ) {
                                    listItems.push( i18n( 'CalendarMojit.eventPopOver.details' ) + ': ' + Y.Escape.html( ( schedule.details.length > 100 ) ? schedule.details.substr( 0, 100 ) + '...' : schedule.details ) );
                                }

                                return '<ul style="margin: 0; padding: 0 0 0 0.7em;"><li>' + listItems.join( '</li><li>' ) + '</li></ul>';
                            }
                        }

                        return null;
                    }
                }
            };

        },
        /**
         * Get the fullCalendar instance, to be able to interact with
         * @return {null|jQuery}
         */
        getFullCalendar: function TabCalendarViewModel_getFullCalendar() {
            var
                self = this;

            if( self.calendar && self.calendar.getInstance ) {
                return self.calendar.getInstance();
            }

            return null;
        },
        /**
         * refresh all view specific data-sources
         */
        refreshView: function TabCalendarViewModel_refreshView( calendarId ) {
            var
                self = this;

            self.getTopAppointment();
            if( calendarId ) {
                if( Array.isArray( calendarId ) ) {
                    calendarId.forEach( function( id ) {
                        self.refetchEventSourceById( 'CalendarEventSource-' + id );
                    } );
                } else {
                    self.refetchEventSourceById( 'CalendarEventSource-' + calendarId );
                }
            } else {
                self.refetchEvents();
            }

        },
        /**
         * next appointment on server
         * @type {null| ko.observable}
         */
        topAppointment: null,
        /**
         * next appointment number on server
         * @type {null| ko.computed}
         */
        topAppointmentNumber: null,
        /**
         * next appointment title on server
         * @type {null| ko.computed}
         */
        topAppointmentTitle: null,
        /** @protected */
        _initTopAppointment: function TabCalendarViewModel__initTopAppointment() {
            var
                self = this;

            self.topAppointment = ko.observable( null );
            self.topAppointmentNumber = ko.computed( self.topAppointmentNumberComputed, self );
            self.topAppointmentTitle = ko.computed( self.topAppointmentTitleComputed, self );
            self.getTopAppointment();
        },
        /**
         * Get next appointment from server
         * @method getTopAppointment
         * @return {jQuery.Deferred}
         */
        getTopAppointment: function TabCalendarViewModel_getTopAppointment() {
            var
                self = this,
                filter = Y.doccirrus.utils.getFilter(),
                params = {};

            if( filter && filter.location ) {
                params.location = filter.location;
            }

            return binderViewModel
                .readTopAppointment( params )
                .then( function TabCalendarViewModel_getTopAppointment_readTopAppointment_then( results ) {
                    return Array.isArray( results ) && results[0] || null;
                } )
                .done( function TabCalendarViewModel_getTopAppointment_readTopAppointment_done( data ) {
                    self.topAppointment( data );
                } );
        },
        /**
         * Computes next appointment number
         * @method topAppointmentNumberComputed
         * @return {String}
         */
        topAppointmentNumberComputed: function TabCalendarViewModel_topAppointmentNumberComputed() {
            var
                self = this,
                topAppointment = self.topAppointment();

            if( topAppointment && topAppointment.adhoc ) {
                return topAppointment.number || '';
            }
            else {
                return i18n( 'CalendarMojit.calendar.text.APPOINTMENT' );
            }
        },
        /**
         * Computes next appointment title
         * @method topAppointmentNumberComputed
         * @return {String}
         */
        topAppointmentTitleComputed: function TabCalendarViewModel_topAppointmentTitleComputed() {
            var
                self = this,
                topAppointment = self.topAppointment();

            if( topAppointment ) {
                return topAppointment.title || i18n( 'CalendarMojit.calendar.text.NO_APPOINTMENTS' );
            }
            else {
                return i18n( 'CalendarMojit.calendar.text.NO_APPOINTMENTS' );
            }
        },
        /**
         * Refetch events for the calendar
         */
        refetchEvents: function TabCalendarViewModel_refetchEvents() {
            var
                self = this,
                fullCalendar = self.getFullCalendar();

            fullCalendar.fullCalendar( 'refetchEvents' );
        },
        /**
         * Refetch eventsource by id for the calendar
         */
        refetchEventSourceById: function( sourceId ) {
            var
                self = this,
                fullCalendar = self.getFullCalendar();

            fullCalendar.fullCalendar( 'refetchEventSources', self.eventSources().find( function( source ) {
                return sourceId === source.id;
            } ).eventSource );
        },
        /**
         * Retrieves events that FullCalendar has in memory
         *
         * @params {Function|String} filter - could be a function with filtering function to get some specific events
         *                                    or string with event _id to take only one event
         */
        retrieveClientEvents: function( filter ) {
            var
                self = this,
                fullCalendar = self.getFullCalendar();

            return fullCalendar.fullCalendar( 'clientEvents', filter );
        },
        /**
         * Changes data for a single event, rerendering the event.
         */
        updateClientEvent: function( event ) {
            var
                self = this,
                fullCalendar = self.getFullCalendar();

            fullCalendar.fullCalendar( 'updateEvent', event );
        },
        /**
         * Add a CalenderEventSource
         * @param {Object} parameters
         * @param {Object} parameters.calendar calendar object to get events from
         */
        addCalenderEventSource: function TabCalendarViewModel_addCalenderEventSource( parameters ) {
            var
                self = this;

            self.eventSources.push( new CalendarEventSource( parameters ) );
        },
        /**
         * Remove a CalenderEventSource
         * @param [calendar] if set specific for this used calendar else all of type
         */
        removeCalenderEventSource: function TabCalendarViewModel_removeCalenderEventSource( calendar ) {
            var
                self = this;

            self.eventSources.remove( function TabCalendarViewModel_removeCalenderEventSource_eventSources_remove( eventSource ) {
                if( eventSource instanceof CalendarEventSource ) {
                    if( calendar ) {
                        return eventSource.calendar === calendar;
                    }
                    return true;
                }
                return false;
            } );
        },
        /**
         * Add a ConsultTimeEventSource
         * @param {Object} parameters
         * @param {Object} parameters.calendar calendar object to get consult times from
         */
        addConsultTimeEventSource: function TabCalendarViewModel_addConsultTimeEventSource( parameters ) {
            var
                self = this;

            self.eventSources.push( new ConsultTimeEventSource( parameters ) );
        },
        /**
         * Check if a specific or any ConsultTimeEventSource is currently active
         * @param [calendar] if set specific for this used calendar else all of type
         */
        hasConsultTimeEventSource: function TabCalendarViewModel_hasConsultTimeEventSource( calendar ) {
            var
                self = this,
                result = Y.Array.find( peek( self.eventSources ), function TabCalendarViewModel_hasConsultTimeEventSource_eventSources_find( eventSource ) {
                    if( eventSource instanceof ConsultTimeEventSource ) {
                        if( calendar ) {
                            return eventSource.calendar === calendar;
                        }
                        return true;
                    }
                    return false;
                } );

            return result;
        },
        /**
         * Remove a ConsultTimeEventSource
         * @param [calendar] if set specific for this used calendar else all of type
         */
        removeConsultTimeEventSource: function TabCalendarViewModel_removeConsultTimeEventSource( calendar ) {
            var
                self = this;

            self.eventSources.remove( function TabCalendarViewModel_removeConsultTimeEventSource_eventSources_remove( eventSource ) {
                if( eventSource instanceof ConsultTimeEventSource ) {
                    if( calendar ) {
                        return eventSource.calendar === calendar;
                    }
                    return true;
                }
                return false;
            } );
        },
        /**
         * Add a CloseTimeEventSource
         * @param {Object} parameters
         * @param {Object} parameters.calendar calendar object to get consult times from
         */
        addCloseTimeEventSource: function TabCalendarViewModel_addCloseTimeEventSource( parameters ) {
            var
                self = this;

            self.eventSources.push( new CloseTimeEventSource( parameters ) );
        },
        /**
         * Check if a specific or any CloseTimeEventSource is currently active
         * @param [calendar] if set specific for this used calendar else all of type
         */
        hasCloseTimeEventSource: function TabCalendarViewModel_hasCloseTimeEventSource( calendar ) {
            var
                self = this,
                result = Y.Array.find( peek( self.eventSources ), function TabCalendarViewModel_hasCloseTimeEventSource_eventSources_find( eventSource ) {
                    if( eventSource instanceof CloseTimeEventSource ) {
                        if( calendar ) {
                            return eventSource.calendar === calendar;
                        }
                        return true;
                    }
                    return false;
                } );

            return result;
        },
        /**
         * Remove a CloseTimeEventSource
         * @param [calendar] if set specific for this used calendar else all of type
         */
        removeCloseTimeEventSource: function TabCalendarViewModel_removeCloseTimeEventSource( calendar ) {
            var
                self = this;

            self.eventSources.remove( function TabCalendarViewModel_removeCloseTimeEventSource_eventSources_remove( eventSource ) {
                if( eventSource instanceof CloseTimeEventSource ) {
                    if( calendar ) {
                        return eventSource.calendar === calendar;
                    }
                    return true;
                }
                return false;
            } );
        },
        /**
         * Add BlockingEventSource
         * @param {Object} parameters
         * @param {Array} parameters.calendars list of calendar objects to fetch blocked slots for
         */
        addBlockingEventSource: function TabCalendarViewModel_addBlockingEventSource( parameters ) {
            var
                self = this;

            self.eventSources.push( new BlockingEventSource( parameters ) );
        },
        /**
         * Remove BlockingEventSource
         */
        removeBlockingEventSource: function TabCalendarViewModel_removeBlockingEventSource() {
            var
                self = this;

            self.eventSources.remove( function TabCalendarViewModel_removeBlockingEventSource_eventSources_remove( eventSource ) {
                return eventSource instanceof BlockingEventSource;
            } );
        },
        /**
         * Handle cursor above multiple background events (e.g. displaying a combined tittle of those)
         * @method bgeventMouseMove
         * @param {jQuery.Event} $event
         * @param {Array} bgeventElements array of HTMLElement of all bgevent where the cursor is currently over
         */
        bgeventMouseMove: function TabCalendarViewModel_bgeventMouseMove( $event, bgeventElements ) {
            var
                self = this,
                fullCalendar = self.getFullCalendar(),
                bgevents = fullCalendar.fullCalendar( 'getView' ).getEventSegs(),
                consultTimeRenderedBackgroundEvents = Y.Array.filter( bgevents, function TabCalendarViewModel_bgeventMouseMove_consultTimeRenderedBackgroundEvents_filter( renderedBackgroundEvent ) {
                    return ( bgeventElements.indexOf( renderedBackgroundEvent.el[0] ) !== -1 && renderedBackgroundEvent.event.source.instanceOf === ConsultTimeEventSource );
                } ),
                closeTimeRenderedBackgroundEvents = Y.Array.filter( bgevents, function TabCalendarViewModel_bgeventMouseMove_closeTimeRenderedBackgroundEvents_filter( renderedBackgroundEvent ) {
                    return ( bgeventElements.indexOf( renderedBackgroundEvent.el[0] ) !== -1 && renderedBackgroundEvent.event.source.instanceOf === CloseTimeEventSource );
                } );

            consultTimeRenderedBackgroundEvents.reverse();
            consultTimeRenderedBackgroundEvents.forEach( function TabCalendarViewModel_bgeventMouseMove_consultTimeRenderedBackgroundEvents_forEach( renderedBackgroundEvent ) {
                renderedBackgroundEvent.el.attr( 'title', consultTimeRenderedBackgroundEvents.map( function TabCalendarViewModel_bgeventMouseMove_consultTimeRenderedBackgroundEvents_forEach_map( consultTimeRenderedBackgroundEvent ) {
                    return consultTimeRenderedBackgroundEvent.event.dc.calendar.name;
                } ).join( ",\n" ) );
            } );

            closeTimeRenderedBackgroundEvents.reverse();
            closeTimeRenderedBackgroundEvents.forEach( function TabCalendarViewModel_bgeventMouseMove_closeTimeRenderedBackgroundEvents_forEach( renderedBackgroundEvent ) {
                renderedBackgroundEvent.el.attr( 'title', closeTimeRenderedBackgroundEvents.map( function TabCalendarViewModel_bgeventMouseMove_closeTimeRenderedBackgroundEvents_forEach_map( closeTimeRenderedBackgroundEvent ) {
                    var
                        schedule = closeTimeRenderedBackgroundEvent.event.dc.schedule,
                        calendar = closeTimeRenderedBackgroundEvent.event.dc.calendar,
                        text = '';

                    text += Y.doccirrus.schemaloader.getEnumListTranslation( 'calendar', 'CloseDayType_E', schedule.closeDayType, 'i18n', '' ) + ': ' + schedule.title;
                    text += ' (';
                    text += moment( schedule.start ).format( DATE_TIME_FORMAT );
                    text += ' - ';
                    text += moment( schedule.end ).format( DATE_TIME_FORMAT );
                    text += ', ';
                    text += calendar.name;
                    text += ')';

                    return text;
                } ).join( ",\n" ) );
            } );

        },
        /**
         /**
         * Computes visibility for next number action
         * @type {null|ko.observable}
         */
        nextNumberActionVisible: null,
        /**
         * Computes availability of next number action
         * @type {null|ko.observable}
         */
        nextNumberActionDisabled: null,
        /**
         * Computes availability of next number action
         * @type {null|ko.observable}
         */
        nextAppointmentActionVisible: null,
        /**
         * Computes visibility for admit patient action
         * @type {null|ko.observable}
         */
        admitPatientActionVisible: null,
        /**
         * Computes availability of admit patient action
         * @type {null|ko.observable}
         */
        admitPatientActionDisabled: null,
        /**
         * Computes visibility for patient arrived action
         * @type {null|ko.observable}
         */
        patientArrivedActionVisible: null,
        /**
         * Computes availability of patient arrived action
         * @type {null|ko.observable}
         */
        patientArrivedActionDisabled: null,
        /**
         * Initializes ui actions
         * @protected
         */
        _initActionButtons: function TabCalendarViewModel__initActionButtons() {
            var
                self = this;

            self.nextNumberActionVisible = self.addDisposable( ko.computed( function TabCalendarViewModel__initActionButtons_nextNumberActionVisible_computed() {
                return !Y.doccirrus.commonutils.isFrameView();
            }, self ) );
            self.nextAppointmentActionVisible = self.addDisposable( ko.computed( function TabCalendarViewModel__initActionButtons_nextAppointmentActionVisible_computed() {
                return true;
            }, self ) );
            self.nextNumberActionDisabled = self.addDisposable( ko.computed( function TabCalendarViewModel__initActionButtons_nextNumberActionDisabled_computed() {
                return !binderViewModel.get( 'inTimeConfig' ).allowPRCAdhoc;
            }, self ) );

            self.admitPatientActionVisible = self.addDisposable( ko.computed( function TabCalendarViewModel__initActionButtons_admitPatientActionVisible_computed() {
                var
                    topAppointment = self.topAppointment();
                return topAppointment && hasArrived( topAppointment );
            }, self ) );

            self.admitPatientActionDisabled = self.addDisposable( ko.computed( function TabCalendarViewModel__initActionButtons_admitPatientActionDisabled_computed() {
                var
                    topAppointment = self.topAppointment();

                if( !topAppointment ) {
                    return true;
                }

                if( topAppointment.arrivalTime && hasArrived( topAppointment ) ) {
                    return false;
                }

                return true;
            }, self ) );

            self.patientArrivedActionVisible = self.addDisposable( ko.computed( function TabCalendarViewModel__initActionButtons_patientArrivedActionVisible_computed() {
                var
                    topAppointment = self.topAppointment();
                return topAppointment && topAppointment.arrivalTime && !hasArrived( topAppointment );
            }, self ) );

            self.patientArrivedActionDisabled = self.addDisposable( ko.computed( function TabCalendarViewModel__initActionButtons_patientArrivedActionDisabled_computed() {
                return false;
            }, self ) );

        },
        /**
         * Handles next number action from UI
         * @method nextNumberActionHandler
         */
        nextNumberActionHandler: function TabCalendarViewModel_nextNumberActionHandler() {
            var
                self = this,
                filter = Y.doccirrus.utils.getFilter(),
                params = {};

            if( filter && filter.location ) {
                params.location = filter.location;
            }

            binderViewModel
                .getNewNextNumberAppointment( params )
                .then( function TabCalendarViewModel_nextNumberActionHandler_getNewNextNumberAppointment_then( result ) {
                    return Array.isArray( result ) && result[0] || result;
                } )
                .done( function TabCalendarViewModel_nextNumberActionHandler_getNewNextNumberAppointment_done( data ) {

                    if( self.hasPreselectPatientId() ) { // patient was preset in case file
                        data.patient = self.getPreselectPatientId();
                    }

                    binderViewModel
                        .showAppointmentDialog( data );
                } )
                .fail( fail );

        },

        /**
         * @method nextAppointmentActionHandler
         */
        nextAppointmentActionHandler: function TabCalendarViewModel_nextAppointmentActionHandler() {
            var
                self = this,
                patient;
            if( self.hasPreselectPatientId() ) { // patient was preset in case file
                patient = self.getPreselectPatientId();
            }

            self.getBinderViewModel().showAppointmentDialog( { patient: patient }, { appointmentType: 'STANDARD', findAppointment: true } );
        },

        /**
         * Handles push patient action from UI
         * @method pushPatientActionHandler
         */
        pushPatientActionHandler: function TabCalendarViewModel_pushPatientActionHandler() {
            var
                self = this,
                topAppointment = self.topAppointment(),
                filter = Y.doccirrus.utils.getFilter(),
                params = {};

            if( !topAppointment ) {
                return;
            }

            params._id = topAppointment._id;

            if( filter && filter.location ) {
                params.location = filter.location;
            }

            binderViewModel
                .moveAppointmentDown( params )
                .done( function TabCalendarViewModel_pushPatientActionHandler_moveAppointmentDown_done( response ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getWarningsFromResponse( response ), 'display' );
                    binderViewModel.propagateAppointmentModification( 'save', arguments );
                } )
                .fail( fail )
                .fail( function TabCalendarViewModel_pushPatientActionHandler_moveAppointmentDown_fail() {
                    self.refreshView();
                } );

        },
        /**
         * Handles admit patient action from UI
         * @method admitPatientActionHandler
         */
        admitPatientActionHandler: function TabCalendarViewModel_admitPatientActionHandler() {
            var
                self = this,
                topAppointment = self.topAppointment();

            if( !topAppointment ) {
                return;
            }

            binderViewModel
                .getRooms( {roomType: 'treatment'} ).done( function( response ) {
                var treatmentRooms = response;
                if( !treatmentRooms || !treatmentRooms.length ) {
                    //there are no free rooms to put appointment there
                    return Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        message: NO_FREE_TREATMENT_ROOMS_WARN,
                        window: {
                            width: 'small',
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            this.close();
                                        }
                                    } )
                                ]
                            }
                        }
                    } );
                }
                if( 1 === treatmentRooms.length && !treatmentRooms[0].isDeletable ) {
                    // means that we have only one free treatment room - default, so put the appointment there automatically
                    topAppointment.roomId = treatmentRooms[0]._id;
                    topAppointment.orderInRoom = treatmentRooms[0].nextOrderNumberInRoom;
                    binderViewModel
                        .admitAppointment( {
                            _id: topAppointment._id,
                            calendar: topAppointment.calendar
                        } )
                        .then( function() {
                            Y.doccirrus.jsonrpc.api.calevent.updateRoomAppointments( {
                                data: {
                                    appointments: [topAppointment]
                                }
                            } ).fail( fail );
                        } )
                        .fail( fail );
                } else {
                    //show list of all free rooms to user to select one
                    Y.doccirrus.modals.selectRoom.show( false, false, null, function( room ) {
                        var
                            roomName = room.data;
                        topAppointment.roomId = roomName;
                        topAppointment.orderInRoom = treatmentRooms.find( function( room ) {
                            return room._id === roomName;
                        } ).nextOrderNumberInRoom;
                        binderViewModel
                            .admitAppointment( {
                                _id: topAppointment._id,
                                calendar: topAppointment.calendar
                            } )
                            .then( function() {
                                Y.doccirrus.jsonrpc.api.calevent.updateRoomAppointments( {
                                    data: {
                                        appointments: [topAppointment]
                                    }
                                } ).fail( fail );
                            } )
                            .fail( fail );
                    } );
                }
            } ).fail( fail );
        },
        /**
         * Handles patient arrived action from UI
         * @method patientArrivedActionHandler
         */
        patientArrivedActionHandler: function TabCalendarViewModel_patientArrivedActionHandler() {
            var
                self = this,
                topAppointment = self.topAppointment();

            if( !topAppointment ) {
                return;
            }
            if( !topAppointment.roomId ) {
                binderViewModel
                    .getRooms( {roomType: 'waiting'} ).done( function( response ) {
                    var waitingRooms = response;
                    if( !waitingRooms || !waitingRooms.length ) {
                        //there are no free rooms to put appointment there
                        return Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            message: NO_FREE_WAITING_ROOMS_WARN,
                            window: {
                                width: 'small',
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'NO', {
                                            isDefault: false,
                                            action: function() {
                                                this.close();
                                            }
                                        } ),
                                        Y.doccirrus.DCWindow.getButton( 'YES', {
                                            isDefault: true,
                                            action: function() {
                                                this.close();
                                                binderViewModel
                                                    .setAppointmentThatPatientArrived( {
                                                        _id: topAppointment._id
                                                    } )
                                                    .done( function TabCalendarViewModel_patientArrivedActionHandler_setAppointmentThatPatientArrived_done( response ) {
                                                        Y.Array.invoke( Y.doccirrus.errorTable.getWarningsFromResponse( response ), 'display' );
                                                        binderViewModel.propagateAppointmentModification( 'save', arguments );
                                                    } )
                                                    .fail( fail )
                                                    .fail( function TabCalendarViewModel_patientArrivedActionHandler_setAppointmentThatPatientArrived_fail() {
                                                        self.refreshView();
                                                    } );
                                            }
                                        } )
                                    ]
                                }
                            }
                        } );
                    }
                    if( 1 === waitingRooms.length && !waitingRooms[0].isDeletable ) {
                        // means that we have only one free waiting room - default, so put the appointment there automatically
                        topAppointment.roomId = waitingRooms[0]._id;
                        topAppointment.orderInRoom = waitingRooms[0].nextOrderNumberInRoom;
                        binderViewModel
                            .setAppointmentThatPatientArrived( {
                                _id: topAppointment._id
                            } )
                            .then( function() {
                                Y.doccirrus.jsonrpc.api.calevent.updateRoomAppointments( {
                                    data: {
                                        appointments: [topAppointment]
                                    }
                                } ).fail( fail );
                            } )
                            .fail( fail );
                    } else {
                        //show list of all free rooms to user to select one
                        Y.doccirrus.modals.selectRoom.show( true, false, null, function( room ) {
                            var
                                roomName = room.data;
                            topAppointment.roomId = roomName;
                            topAppointment.orderInRoom = waitingRooms.find( function( room ) {
                                return room._id === roomName;
                            } ).nextOrderNumberInRoom;
                            binderViewModel
                                .setAppointmentThatPatientArrived( {
                                    _id: topAppointment._id
                                } )
                                .then( function() {
                                    Y.doccirrus.jsonrpc.api.calevent.updateRoomAppointments( {
                                        data: {
                                            appointments: [topAppointment]
                                        }
                                    } ).fail( fail );
                                } )
                                .fail( fail );
                        } );
                    }
                } ).fail( fail );
            } else {
                binderViewModel
                    .setAppointmentThatPatientArrived( {
                        _id: topAppointment._id
                    } )
                    .done( function TabCalendarViewModel_patientArrivedActionHandler_setAppointmentThatPatientArrived_done( response ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getWarningsFromResponse( response ), 'display' );
                        binderViewModel.propagateAppointmentModification( 'save', arguments );
                    } )
                    .fail( fail )
                    .fail( function TabCalendarViewModel_patientArrivedActionHandler_setAppointmentThatPatientArrived_fail() {
                        self.refreshView();
                    } );
            }
        },
        /**
         * patient id for preselection
         * @private
         * @type {String}
         */
        _preselectPatientId: null,
        /**
         * set a patient id for preselection when creating a next event
         * @param patientId {String}
         */
        setPreselectPatientId: function TabCalendarViewModel_setPreselectPatientId( patientId ) {
            var
                self = this;

            self._preselectPatientId = patientId;
        },
        /**
         * patient from cache
         * @private
         * @type {null|ko.observable}
         */
        patientFromCache: null,
        /**
         * read preselected patient from db
         */
        readPatient: function( patientId ) {
            var self = this;
            Y.doccirrus.jsonrpc.api
                .patient.read( {
                query: {
                    _id: patientId
                }
            } )
                .done( function ( response ) {
                    var
                        patient = response && response.data && response.data[0];
                    self.patientFromCache( patient );
                } );
        },
        /**
         * unset a patient id for preselection
         */
        unsetPreselectPatientId: function TabCalendarViewModel_unsetPreselectPatientId() {
            var
                self = this;

            self._preselectPatientId = null;
            self.patientFromCache( null );
            if( Y.doccirrus.utils.sessionValueGet( 'loadEvent' ) ) {
                Y.doccirrus.utils.sessionValueSet( 'loadEvent', '' );
            }
        },
        /**
         * returns value of preselected patient id
         * @returns {String, null} preselected patient id or null if unset
         */
        getPreselectPatientId: function TabCalendarViewModel_getPreselectPatientId() {
            var
                self = this;

            return self._preselectPatientId;
        },
        /**
         * returns if a patient id is set
         * @returns {boolean} true if set false if unset
         */
        hasPreselectPatientId: function TabCalendarViewModel_hasPreselectPatientId() {
            var
                self = this;

            return (null !== self._preselectPatientId);
        },

        /**
         * dispatch events triggered via localStorage property "loadEvent"
         */
        dispatchLoadEvent: function TabCalendarViewModel_dispatchLoadEvent() {
            var
                self = this,
                loadEvent = Y.doccirrus.utils.sessionValueGet( 'loadEvent' ),
                fullCalendar = self.getFullCalendar();
            if( '' !== loadEvent ) {

                loadEvent = JSON.parse( loadEvent );

                switch( loadEvent.action ) {
                    case 'createEvent':
                        if( 'gotoDate' in loadEvent ) {
                            fullCalendar.fullCalendar( 'gotoDate', moment( loadEvent.gotoDate ) );
                        }
                        self.setPreselectPatientId( loadEvent.patientId );
                        self.readPatient( loadEvent.patientId );
                        break;
                    case 'updateEvent':
                        if( 'gotoDate' in loadEvent ) {
                            fullCalendar.fullCalendar( 'gotoDate', moment( loadEvent.gotoDate ) );
                        }

                        binderViewModel
                            .readAppointment( {
                                _id: loadEvent.eventId,
                                scheduleId: loadEvent.scheduleId,
                                start: loadEvent.start
                            } )
                            .done( function TabCalendarViewModel_dispatchLoadEvent_updateEvent_readAppointment_done( schedule ) {
                                if( schedule ) {

                                    // TODO: [Bug] MOJ-4586: calevent.index to determine event position in a repetition not served always
                                    binderViewModel
                                        .showAppointmentAdministrationWindow( schedule )
                                        .after( {
                                            edit: function TabCalendarViewModel_dispatchLoadEvent_showAppointmentAdministrationWindow_edit( /*data === schedule*/ ) {
                                                binderViewModel
                                                    .showAppointmentDialog( schedule );
                                            }
                                        } );
                                }
                            } )
                            .fail( fail );
                        break;
                }
            }

        },
        /**
         * Map of global events attached to
         */
        _globalEvents: null,
        /**
         * Attach to global events
         */
        attachToGlobalEvents: function TabCalendarViewModel_attachToGlobalEvents() {
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
        detachFromGlobalEvents: function TabCalendarViewModel_detachFromGlobalEvents() {
            var
                self = this;

            if( self._globalEvents ) {
                Y.each( self._globalEvents, function TabCalendarViewModel_detachFromGlobalEvents__globalEvents_each( event, name ) {
                    event.detach();
                    delete self._globalEvents[name];
                } );
            }
        },
        /**
         * Handle global "appointmentModified"-event
         */
        appointmentModifiedHandler: function TabCalendarViewModel_appointmentModifiedHandler() {
            var
                self = this;

            self.refreshView();
        },

        /**
         * Binding for CalendarQuickChoice
         * @property CalendarQuickChoice
         * @type {Object}
         */
        CalendarQuickChoice: null,
        rightSideBarConfig: null,
        _CalendarQuickChoiceSlidePanel: null,
        /** @private */
        _initCalendarQuickChoice: function() {
            var
                self = this,
                CalendarQuickChoice = self.CalendarQuickChoice = {},
                observableMoment = ko.observable( moment().date( 1 ) );

            Y.doccirrus.DCMiniCalendarView.currentFocusIndex = -1;

            self._CalendarQuickChoiceSlidePanel = {};

            CalendarQuickChoice.pinned = ko.observable( false );
            CalendarQuickChoice.add3MonthsI18n = i18n( 'CalendarMojit.CalendarQuickChoice.add3Months.text' );
            CalendarQuickChoice.subtract3MonthsI18n = i18n( 'CalendarMojit.CalendarQuickChoice.subtract3Months.text' );

            self.rightSideBarConfig = {
                side: 'right',
                name: 'CalendarQuickChoice',
                panelHeading: i18n( 'CalendarMojit.CalendarQuickChoice.heading' ),
                gestureProtected: '.fc-view-container',
                onInit: function( sideBar ) {
                    self._CalendarQuickChoiceSlidePanel = sideBar;
                },
                onPin: function( pinned ) {
                    CalendarQuickChoice.pinned( pinned );
                }
            };

            /** calendars handling **/

            function onMonthClick( mom, event ) {
                var
                    fullCalendar = self.getFullCalendar();

                if( fullCalendar ) {
                    event.target.blur();
                    self._CalendarQuickChoiceSlidePanel.hideSideBar( true );
                    fullCalendar.fullCalendar( 'changeView', 'month' );
                    fullCalendar.fullCalendar( 'gotoDate', mom.format( 'YYYY-MM-DD' ) );
                }

            }

            function onWeekClick( mom, event ) {
                var
                    fullCalendar = self.getFullCalendar();

                if( fullCalendar ) {
                    event.target.blur();
                    self._CalendarQuickChoiceSlidePanel.hideSideBar( true );
                    fullCalendar.fullCalendar( 'changeView', 'agendaWeek' );
                    fullCalendar.fullCalendar( 'gotoDate', mom.format( 'YYYY-MM-DD' ) );
                }

            }

            function onDayClick( mom, event ) {
                var
                    fullCalendar = self.getFullCalendar();

                if( fullCalendar ) {
                    event.target.blur();
                    self._CalendarQuickChoiceSlidePanel.hideSideBar( true );

                    if( self.dayViewIsInResourceMode ) {
                        fullCalendar.fullCalendar( 'changeView', 'verticalResourceView' );
                    }
                    else {
                        fullCalendar.fullCalendar( 'changeView', 'agendaDay' );
                    }

                    fullCalendar.fullCalendar( 'gotoDate', mom.format( 'YYYY-MM-DD' ) );
                }

            }

            CalendarQuickChoice.first = new Y.doccirrus.DCMiniCalendarView( { moment: moment( ko.unwrap( observableMoment ) ) } );
            CalendarQuickChoice.first.onMonthClick = onMonthClick;
            CalendarQuickChoice.first.onWeekClick = onWeekClick;
            CalendarQuickChoice.first.onDayClick = onDayClick;

            CalendarQuickChoice.second = new Y.doccirrus.DCMiniCalendarView( { moment: moment( ko.unwrap( observableMoment ) ).add( 1, 'month' ) } );
            CalendarQuickChoice.second.onMonthClick = onMonthClick;
            CalendarQuickChoice.second.onWeekClick = onWeekClick;
            CalendarQuickChoice.second.onDayClick = onDayClick;

            CalendarQuickChoice.third = new Y.doccirrus.DCMiniCalendarView( { moment: moment( ko.unwrap( observableMoment ) ).add( 2, 'months' ) } );
            CalendarQuickChoice.third.onMonthClick = onMonthClick;
            CalendarQuickChoice.third.onWeekClick = onWeekClick;
            CalendarQuickChoice.third.onDayClick = onDayClick;

            self.addDisposable( ko.computed( function() {
                var uMom = ko.unwrap( observableMoment ),
                    isInitial = ko.computedContext.isInitial();

                if( !isInitial ) {
                    ko.ignoreDependencies( function() {
                        CalendarQuickChoice.first.setMoment( moment( uMom ) );
                        CalendarQuickChoice.second.setMoment( moment( uMom ).add( 1, 'month' ) );
                        CalendarQuickChoice.third.setMoment( moment( uMom ).add( 2, 'months' ) );
                    } );
                }

            } ) );

            CalendarQuickChoice.add3MonthsClickHandler = function() {
                observableMoment( observableMoment().add( 3, 'months' ) );
                Y.doccirrus.DCMiniCalendarView.currentFocusIndex = -1;

            };
            CalendarQuickChoice.subtract3MonthsClickHandler = function() {
                observableMoment( observableMoment().subtract( 3, 'months' ) );
                Y.doccirrus.DCMiniCalendarView.currentFocusIndex = -1;
            };

        },
        patientLink: null,
        _initCachePatientLink: function() {
            var self = this;

            self.patientFromCache = ko.observable( null );
            self.patientLink = ko.computed( function() {
                var
                    patient = self.patientFromCache();

                if( patient && patient._id ) {
                    return Y.Lang.sub( '<a href="{href}" class="patient-linkToCase" title="{title}" target="_blank">{text}</a>', {
                        title: PATIENT_LINK_TITLE,
                        text: Y.doccirrus.schemas.person.personDisplay( patient ),
                        href: Y.doccirrus.utils.getUrl( Y.doccirrus.auth.isISD() ? 'mirror_patients' : 'inCaseMojit' ) + '#/patient/' + patient._id + '/tab/casefile_browser'
                    } );
                } else {
                    return '';
                }
            } );
        }

    } );

    return {

        registerNode: function tab_calendar_registerNode( node ) {
            viewModel = new TabCalendarViewModel();
            ko.applyBindings( viewModel, node.getDOMNode() );
            viewModel.attachToGlobalEvents();

            binderViewModel.currentView( viewModel );

            viewModel.dispatchLoadEvent();

        },

        deregisterNode: function tab_calendar_deregisterNode( node ) {
            viewModel.detachFromGlobalEvents();

            //  clean up viewmodel, unsubscribe hotkeys, MOJ-7531
            viewModel.destroy();

            ko.cleanNode( node.getDOMNode() );
        }

    };
};
