/*global YUI, ko, _*/

'use strict';

YUI.add( 'addconfigurationmodal', function( Y, NAME ) {
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            COLUMN_FILTER_DEFAULT_VALUE = "2",
            SORT_BY_FILTER_DEFAULT_VALUE = "gs";

        /**
         * AddConfigurationViewModel
         * @param config
         * @constructor
         */
        function AddConfigurationViewModel( config ) {
            AddConfigurationViewModel.superclass.constructor.call( this, config );
        }

        AddConfigurationViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( AddConfigurationViewModel, KoViewModel.getBase(), {
                initializer: function AddConfigurationViewModel_initializer( config ) {
                    var
                        self = this;
                    //translations
                    self.durationsI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.DURATION' );
                    self.insuranceI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.INSURANCE' );
                    self.arrivalTimeI18n = i18n( 'CalendarMojit.tab_waiting-list.title.WAITED' );
                    self.waitI18n = i18n( 'CalendarMojit.tab_waiting-list.title.WAIT' );
                    self.severityI18n = i18n( 'CalendarMojit.tab_waiting-list.title.SEVERITY' );
                    self.calendarI18n = i18n( 'CalendarMojit.tab_waiting-list.label.CALENDAR' );
                    self.detailsI18n = i18n( 'CalendarMojit.tab_waiting-list.label.DETAILS' );
                    self.patientTitleI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.PATIENT' );
                    self.timeInAdvanceI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.TIMEINADVANCE' );
                    self.etaI18n = i18n( 'CalendarMojit.tab_waiting-list.title.ETA' );
                    self.statusI18n = i18n( 'CalendarMojit.tab_called-list.title.STATUS' );
                    self.appointmentDatesI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.APPOINTMENT_DATES' );
                    self.columns2I18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.TWO_COLUMNS' );
                    self.columns3I18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.THREE_COLUMNS' );
                    self.filterI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.FILTER' );
                    self.sortByI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.SORT_BY' );
                    self.patientNameI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.PATIENT_NAME' );
                    self.patientNoI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.PATIENT_NO' );
                    self.patientDobI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.PATIENT_DOB' );
                    self.roomI18n = i18n( 'CalendarMojit.calendar.menu.ROOMS' );

                    self.isFilter = config && config.isFilter;
                    self.isGeneral = ko.observable( true );
                    self.configId = ( config && config._id ) || null;
                    self.isWaitingRoom = config && 'waiting' === config.roomType;

                    self.roomsConfiguration = null;
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
                    self.patientDob = ko.observable( false );
                    self.patientNo = ko.observable( false );



                    if( config && 'waiting' === config.roomType ) {
                        self.duration( false );
                        self.eta( true );
                    }
                    if( config && 'treatment' === config.roomType ) {
                        self.patientArrivalTime( false );
                    }

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
                    self.patientNoFilter = ko.observable( false );
                    self.patientDobFilter = ko.observable( false );
                    self.columnsFilter = ko.observable( COLUMN_FILTER_DEFAULT_VALUE );
                    self.sortByFilter = ko.observable( SORT_BY_FILTER_DEFAULT_VALUE );
                    self.initSortByValue = ko.observable( null );
                    if( config && config._id ) {
                        self.isGeneral( false );
                    }

                    self.loadConfiguration();
                },
                destructor: function AddConfigurationViewModel_destructor() {
                },
                loadConfiguration: function AddConfigurationViewModel_loadConfiguration() {
                    var
                        self = this,
                        isGeneral = unwrap( self.isGeneral ),
                        localStorageValue = ( isGeneral || self.isFilter ) ? Y.doccirrus.utils.localValueGet( 'generalConfiguration') :
                            Y.doccirrus.utils.localValueGet( 'roomsConfiguration'),
                        localStorageConfiguration,
                        filteredItem,
                        item;

                    if( localStorageValue ) {
                        try {
                            localStorageConfiguration = JSON.parse( localStorageValue );
                        } catch( parseErr ) {
                            Y.log( 'Problem getting localStorage configurations configurations: ' + JSON.stringify( parseErr ), 'warn', NAME );
                        }
                    } else {
                        if( isGeneral || self.isFilter ) {
                            localStorageConfiguration = {};
                        } else {
                            localStorageConfiguration = [];
                        }
                    }
                    if( _.isArray( localStorageConfiguration ) ) {
                        filteredItem = localStorageConfiguration.filter( function( i ) {
                            return i._id === self.configId;
                        });
                        item = ( filteredItem && filteredItem[0] ) || null;
                    } else if( _.isEmpty( localStorageConfiguration ) ) {
                        item = null;
                    } else {
                        item = localStorageConfiguration;
                    }

                    if( item ) {
                        self.patientTitle( item.patientTitle );
                        self.patientInsurance( item.patientInsurance );
                        self.patientArrivalTime( item.patientArrivalTime );
                        self.duration( item.duration );
                        self.calendarName( item.calendarName );
                        self.adhoc( item.adhoc );
                        self.patientSeverity( item.patientSeverity );
                        self.details( item.details );
                        self.timeinadvance( item.timeinadvance );
                        self.eta( item.eta );
                        self.status( item.status );
                        self.patientDob( item.patientDob );
                        self.patientNo( item.patientNo );
                        self.patientInsuranceFilter( item.patientInsuranceFilter );
                        self.patientArrivalTimeFilter( item.patientArrivalTimeFilter );
                        self.durationFilter( item.durationFilter );
                        self.calendarNameFilter( item.calendarNameFilter );
                        self.adhocFilter( item.adhocFilter );
                        self.patientSeverityFilter( item.patientSeverityFilter );
                        self.detailsFilter( item.detailsFilter );
                        self.timeinadvanceFilter( item.timeinadvanceFilter );
                        self.etaFilter( item.etaFilter );
                        self.statusFilter( item.statusFilter );
                        self.patientNoFilter( item.patientNoFilter );
                        self.patientDobFilter( item.patientDobFilter );
                        self.columnsFilter( item.columnsFilter );
                        self.sortByFilter( item.sortByFilter );
                        self.initSortByValue( item.sortByFilter );
                    }

                    self.roomsConfiguration = localStorageConfiguration;
                }
            },
            {
                NAME: 'AddConfigurationViewModel'
            } );

        KoViewModel.registerConstructor( AddConfigurationViewModel );

        function getTemplate( node, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'add_configuration_modal',
                'CalendarMojit',
                {},
                node,
                callback
            );
        }

        function show( data, isFilter, callback ) {
            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, function() {
                if( isFilter ) {
                    data = {
                        isFilter: true
                    };
                }
                var model = new AddConfigurationViewModel( data ),
                    modal = new Y.doccirrus.DCWindow( { //eslint-disable-line
                        className: 'DCWindow-AddConfiguration',
                        bodyContent: node,
                        title: i18n( 'CalendarMojit.tab_graphic-waiting-list.label.CONFIGURATION' ),
                        icon: Y.doccirrus.DCWindow.ICON_INFO,
                        width: Y.doccirrus.DCWindow.SIZE_SMALL,
                        height: Y.doccirrus.DCWindow.SIZE_LARGE,
                        resizeable: true,
                        dragable: true,
                        maximizable: true,
                        centered: true,
                        visible: true,
                        focusOn: [],
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        var
                                            self = this,
                                            roomsArray,
                                            room,
                                            indx,
                                            resultData = {
                                                patientTitle: unwrap( model.patientTitle ),
                                                patientInsurance: unwrap( model.patientInsurance ),
                                                patientArrivalTime: unwrap( model.patientArrivalTime ),
                                                duration: unwrap( model.duration ),
                                                calendarName: unwrap( model.calendarName ),
                                                adhoc: unwrap( model.adhoc ),
                                                patientSeverity: unwrap( model.patientSeverity ),
                                                details: unwrap( model.details ),
                                                timeinadvance: unwrap( model.timeinadvance ),
                                                eta: unwrap( model.eta ),
                                                status: unwrap( model.status ),
                                                patientDob: unwrap( model.patientDob ),
                                                patientNo: unwrap( model.patientNo )
                                            },
                                            initSortByValue = unwrap( model.initSortByValue ),
                                            isSortingChanged;
                                        if( model.roomsConfiguration && ( unwrap( model.isGeneral ) || model.isFilter ) ) {
                                            resultData.patientInsuranceFilter = unwrap( model.patientInsuranceFilter );
                                            resultData.patientArrivalTimeFilter = unwrap( model.patientArrivalTimeFilter );
                                            resultData.durationFilter = unwrap( model.durationFilter );
                                            resultData.calendarNameFilter = unwrap( model.calendarNameFilter );
                                            resultData.adhocFilter = unwrap( model.adhocFilter );
                                            resultData.patientSeverityFilter = unwrap( model.patientSeverityFilter );
                                            resultData.detailsFilter = unwrap( model.detailsFilter );
                                            resultData.timeinadvanceFilter = unwrap( model.timeinadvanceFilter );
                                            resultData.etaFilter = unwrap( model.etaFilter );
                                            resultData.statusFilter = unwrap( model.statusFilter );
                                            resultData.patientNoFilter = unwrap( model.patientNoFilter );
                                            resultData.patientDobFilter = unwrap( model.patientDobFilter );
                                            resultData.columnsFilter = unwrap( model.columnsFilter );
                                            resultData.sortByFilter = unwrap( model.sortByFilter );
                                            Y.doccirrus.utils.localValueSet( 'generalConfiguration', JSON.stringify( resultData ) );
                                        } else {
                                            if( !model.roomsConfiguration.length ) {
                                                roomsArray = [];
                                            } else {
                                                roomsArray = model.roomsConfiguration;
                                            }
                                            resultData._id = data._id;
                                            room = roomsArray.filter( function( filtered ) {
                                                return filtered._id === data._id;
                                            });
                                            if( !room.length ) {
                                                roomsArray.push( resultData );
                                            } else {
                                                indx = roomsArray.indexOf( room[0] );
                                                roomsArray.splice( indx, 1, resultData);
                                            }
                                            Y.doccirrus.utils.localValueSet( 'roomsConfiguration', JSON.stringify( roomsArray ) );
                                        }
                                        isSortingChanged = initSortByValue && resultData.sortByFilter && resultData.sortByFilter !== initSortByValue;
                                        self.close();
                                        callback( isSortingChanged );
                                    }
                                } )
                            ]
                        },
                        after: {
                            visibleChange: function( event ) {
                                if( !event.newVal ) {
                                    ko.cleanNode( node.getDOMNode() );
                                    model.destroy();
                                }
                            }
                        }
                    } );
                ko.applyBindings( model, node.getDOMNode() );

            } );
        }

        Y.namespace( 'doccirrus.modals' ).addConfiguration = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'DCWindow'
        ]
    }
);
