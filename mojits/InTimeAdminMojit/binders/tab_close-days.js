/*global fun:true, ko, moment */
/*exported fun*/
'use strict';
fun = function _fn( Y, NAME ) {

    var
        KoUI = Y.doccirrus.KoUI,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        IMPORT_CLOSE_DAY = i18n( 'InTimeAdminMojit.tab_close-days.buttons.IMPORT_CLOSE_DAY' ),
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
        SAVE_CLOSE_DAY = i18n( 'general.button.SAVE' ),
        calendars;

    /**
     * CloseDayViewModel for KoEditableTable
     * @param config
     * @constructor
     */
    function CloseDayViewModel( config ) {
        CloseDayViewModel.superclass.constructor.call( this, config );
    }

    CloseDayViewModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( CloseDayViewModel, KoViewModel.getBase(), {

            initializer: function CloseDayViewModel_initializer() {
                var self = this,
                    calendarList = self.get( 'data.calendar' ) || [];

                self.calendarDisplay = ko.computed( {
                    read: function() {
                        return calendars.filter( function( item ) {
                            return calendarList.indexOf( item._id ) !== -1;
                        } );
                    },
                    write: function( value ) {
                        self.calendar( value );
                    }
                } );

                self.calendarDisplay.hasError = ko.observable( false );
                self.addDisposable( ko.computed( function() {
                    var
                        calendar = unwrap( self.calendar );
                    self.calendarDisplay.hasError( calendar && 1 > calendar.length );
                } ) );

                self.start.hasError = ko.observable( false );
                self.end.hasError = ko.observable( false );
                self.end.disabled = ko.observable( false );
                self.addDisposable( ko.computed( function() {
                    var
                        start = peek( self.start ),
                        end = peek( self.end ),
                        allDay = unwrap( self.allDay );

                    if( ko.computedContext.isInitial() ) {
                        return;
                    }

                    if( !allDay && !end ) {
                        self.end.hasError( true );
                    }

                    if( allDay ) {
                        self.start( moment( start ).hour( 0 ).minute( 0 ).second( 0 ).millisecond( 0 ).toISOString() );
                        self.end( moment( self.start() ).add( 23, 'hours' ).add( 59, 'minutes' ).toISOString() );
                        self.end.disabled( true );
                        self.end.hasError( false );
                        self.start.hasError( false );
                    } else {
                        self.end( null );
                        self.end.disabled( false );
                    }
                } ) );
                self.addDisposable( ko.computed( function() {
                    var
                        start = unwrap( self.start ),
                        end = unwrap( self.end ),
                        allDay = peek( self.allDay );

                    if( end ) {
                        self.start.hasError( !start || moment( end ).isBefore( moment( start ) ) );
                    } else {
                        self.start.hasError( !start );
                    }

                    if( !allDay && !end ) {
                        self.end.hasError( true );
                    }
                } ) );

                self.addDisposable( ko.computed( function() {
                    var
                        closeDayType = unwrap( self.closeDayType );

                    if( !closeDayType && !self.isNew() ) {
                        self.closeDayType( 'OTHER' );
                    }
                } ) );
            },
            destructor: function CloseDayViewModel_destructor() {
            }
        },
        {
            schemaName: 'v_closeday',
            NAME: 'CloseDayViewModel'
        }
    );
    KoViewModel.registerConstructor( CloseDayViewModel );

    /**
     * @constructor
     * @class TabCloseDayViewModel
     */
    function TabCloseDayViewModel() {
        TabCloseDayViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( TabCloseDayViewModel, KoViewModel.getBase(), {

        closeDaysData: null,
        closeDaysEditableTable: null,

        /** @protected */
        initializer: function() {
            var
                self = this,
                pdfTitle = i18n( 'InTimeAdminMojit.tab_close-days.closeDaysTable.pdfTitle' );

            self.isGermany = ko.observable(Y.doccirrus.commonutils.doesCountryModeIncludeGermany());
            self.pageTitle = pdfTitle;

            self.initObservables();
            self.loadCalendars();
            self.loadCloseDaysData();
            self.initCloseDayEditableTable();

            self._isValid = ko.computed( function() {
                var rows = self.closeDaysEditableTable.rows(),
                    result = true;

                rows.forEach( function( row ) {
                    if( ( false === row._isValid() || row.calendarDisplay.hasError() || row.start.hasError() || row.end.hasError() ) && row.isModified() ) {
                        result = false;
                    }
                } );
                return result;
            } );
            self.initButtons();
        },

        destructor: function() {
        },

        initObservables: function TabCloseDayViewModel_initObservables() {
            this.calendars = ko.observableArray( [] );
            this.closeDaysData = ko.observableArray( [] );
            this.closeDaysEditableTable = ko.observable();
        },

        loadCloseDaysData: function TabCloseDayViewModel_loadCloseDaysData() {

            var
                self = this;

            Y.doccirrus.jsonrpc.api.calevent.getForCloseDayTable().done( function( result ) {
                self.closeDaysData( result.data.map( function( calevent ) {
                    return {data: calevent};
                } ) );
            } ).fail( function( err ) {
                Y.log( 'Could not load closeDay data: ' + err + ' create repeated presc anyway', 'error', NAME );
            } );
        },

        loadCalendars: function TabCloseDayViewModel_loadCalendars() {
            var
                self = this;

            Y.doccirrus.jsonrpc.api.calendar
                .read()
                .done( function( result ) {
                    calendars = result.data;
                    self.calendars( result.data );
                } ).fail( function( err ) {
                Y.log( 'Could not load calendars data: ' + err + ' create repeated presc anyway', 'error', NAME );
            } );
        },

        initCloseDayEditableTable: function TabCloseDayViewModel_initCloseDayEditableTable() {

            var
                self = this;

            self.closeDaysEditableTable = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                componentConfig: {
                    ViewModel: CloseDayViewModel,
                    data: self.closeDaysData,
                    columns: [
                        {
                            forPropertyName: 'closeDayType',
                            label: i18n( 'calendar-schema.Schedule_T.closeDayType' ),
                            title: i18n( 'calendar-schema.Schedule_T.closeDayType' ),
                            inputField: {
                                componentType: 'KoFieldSelect2',
                                componentConfig: {
                                    options: Y.doccirrus.schemas.calendar.types.CloseDayType_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val',
                                    select2Config: {
                                        multiple: false
                                    }
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    data = unwrap( meta.value );
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'calendar', 'CloseDayType_E', data, 'i18n', '' );
                            }
                        },
                        {
                            forPropertyName: 'userDescr',
                            label: i18n( 'calendar-schema.Schedule_T.userDescr' ),
                            title: i18n( 'calendar-schema.Schedule_T.userDescr' ),
                            renderer: function( meta ) {
                                var
                                    userDescr = unwrap( meta.value ),
                                    title = unwrap( meta.row.title );

                                return userDescr || title || '';
                            }
                        },
                        {
                            forPropertyName: 'allDay',
                            componentType: 'KoEditableTableCheckboxColumn',
                            label: "G",
                            title: i18n( 'calendar-schema.Schedule_T.allDay' )
                        },
                        {
                            forPropertyName: 'start',
                            label: i18n( 'calendar-schema.Schedule_T.start' ),
                            title: i18n( 'calendar-schema.Schedule_T.start' ),
                            inputField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'ISODate',
                                    showLabel: false,
                                    useIsoDate: true
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    value = unwrap( meta.value ),
                                    data = unwrap( meta.row );
                                if( data.allDay() ) {
                                    return moment( value ).format( TIMESTAMP_FORMAT );
                                }
                                if( value ) {
                                    return moment( value ).format( TIMESTAMP_FORMAT_LONG );
                                }
                                return '';
                            }
                        },
                        {
                            forPropertyName: 'end',
                            label: i18n( 'calendar-schema.Schedule_T.end' ),
                            title: i18n( 'calendar-schema.Schedule_T.end' ),
                            inputField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'ISODate',
                                    showLabel: false,
                                    useIsoDate: true
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    value = unwrap( meta.value ),
                                    data = unwrap( meta.row );
                                if( data.allDay() ) {
                                    return '';
                                }
                                if( value ) {
                                    return moment( value ).format( TIMESTAMP_FORMAT_LONG );
                                }
                                return '';
                            }
                        },
                        {
                            forPropertyName: 'calendarDisplay',
                            label: i18n( 'calendar-schema.Schedule_T.calendar' ),
                            title: i18n( 'calendar-schema.Schedule_T.calendar' ),
                            inputField: {
                                componentType: 'KoFieldSelect2',
                                componentConfig: {
                                    useSelect2Data: true,
                                    select2Read: function( value ) {
                                        if( !value ) {
                                            return value;
                                        } else {
                                            return value.map( function( entry ) {
                                                return {
                                                    id: entry._id,
                                                    text: entry.name,
                                                    data: entry
                                                };
                                            } );
                                        }
                                    },
                                    select2Write: function( $event, observable ) {
                                        if( $event.added ) {
                                            observable.push( $event.added.data );
                                        }
                                        if( $event.removed ) {
                                            observable.remove( function( item ) {
                                                return item._id === $event.removed.id;
                                            } );
                                        }
                                    },
                                    select2Config: {
                                        query: undefined,
                                        initSelection: undefined,
                                        data: function() {
                                            return {
                                                results: self.calendars().map( function( item ) {
                                                    return {
                                                        id: item._id,
                                                        text: item.name,
                                                        data: item
                                                    };
                                                } )
                                            };
                                        },
                                        multiple: true
                                    }
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    value = unwrap( meta.value );

                                return value.map( function( entry ) {
                                    return entry.name;
                                } ).join( ', ' );
                            }
                        },
                        {
                            forPropertyName: 'deleteButton',
                            utilityColumn: true,
                            width: '60px',
                            css: {
                                'text-center': 1
                            },
                            inputField: {
                                componentType: 'KoButton',
                                componentConfig: {
                                    name: 'delete',
                                    title: Y.doccirrus.i18n( 'general.button.DELETE' ),
                                    icon: 'TRASH_O',
                                    click: function( button, $event, $context ) {

                                        var model = $context.$parent.row;

                                        if( model.closeTimeId() ) {
                                            Y.doccirrus.jsonrpc.api.calevent.delete( {
                                                query: { closeTimeId: model.closeTimeId() }
                                            } ).done( function() {
                                                self.closeDaysEditableTable.removeRow( model );
                                            } );
                                        } else if( model._id() ) {
                                            Y.doccirrus.jsonrpc.api.calevent.delete( {
                                                query: { _id: model._id() }
                                            } ).done( function() {
                                                self.closeDaysEditableTable.removeRow( model );
                                            } );
                                        } else {
                                            self.closeDaysEditableTable.removeRow( model );
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    onAddButtonClick: function() {
                        return true;
                    }
                }
            } );

        },

        initButtons: function TabCloseDayViewModel_initButtons() {
            var
                self = this;

            self.importCloseDay = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'importCloseDay',
                    text: IMPORT_CLOSE_DAY,
                    click: function( e ) {
                        e.disabled( true );
                        Y.doccirrus.modals.importCloseTimeModal.show( {} )
                            .then( function() {
                                e.disabled( false );
                                window.location.reload();
                            } );

                    }
                }
            } );

            self.saveCloseDay = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'saveCloseDay',
                    option: 'PRIMARY',
                    disabled: ko.computed( function() {
                        var rows = self.closeDaysEditableTable.rows(),
                            isModified = rows.some( function( item ) {
                                return item.isModified();
                            } );
                        return !( self._isValid() && isModified );
                    } ),
                    text: SAVE_CLOSE_DAY,
                    click: function() {
                        var data = peek( self.closeDaysEditableTable.rows ).filter( function( row ) {
                            return row.isModified();
                        } ).map( function( row ) {
                            let calendar = row.calendar(),
                                resultCalendars = [];
                            calendar.forEach( function( item ) {
                                if( 'string' === typeof item ) {
                                    resultCalendars.push( calendars.filter( function( obj ) {
                                        return item === obj._id;
                                    } )[0] );
                                }
                            } );
                            row = row.toJSON();
                            row.calendar = resultCalendars.length ? resultCalendars : calendar;
                            return row;
                        } );
                        data = data.map( function( item ) {
                            item.closeTime = true;
                            item.title = item.userDescr || item.title;
                            item.userDescr = item.title;
                            return item;
                        } );

                        Y.doccirrus.jsonrpc.api.calevent.createCloseDayEvent( {
                            data: data
                        } ).fail( function( err ) {
                            if( err && 7009 === err.code ) {
                                if( err.data && err.data.clashedEvents && err.data.clashedEvents.length ) {
                                    if( err.data.closeTimeId ) {
                                        data.forEach( function( item ) {
                                            item.closeTimeId = err.data.closeTimeId;
                                        } );
                                    }
                                    Y.doccirrus.DCWindow.notice( {
                                        message: '<div>' + i18n( 'InTimeAdminMojit.tab_close-days.text.DELETE_APPOINTMENTS_IN_CLOSE_TIME' ) + '<br>' +
                                                 err.data.clashedEvents.map( function( item ) {
                                                     return moment( item.start ).format( TIMESTAMP_FORMAT_LONG );
                                                 } ).join( ',<br>' ) + '</div>',
                                        window: {
                                            width: 'medium',
                                            buttons: {
                                                footer: [
                                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                                    {
                                                        label: i18n( 'DCWindow.BUTTONS.NO' ),
                                                        name: 'no',
                                                        action: function( e ) {
                                                            e.target.button.disable();
                                                            this.close( e );
                                                            Y.doccirrus.jsonrpc.api.calevent.createCloseDayEvent( {
                                                                data: data,
                                                                ignoreClashes: true
                                                            } ).fail( function( err ) {
                                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                                            } ).done( function() {
                                                                window.location.reload();
                                                            } );
                                                        }
                                                    },
                                                    {
                                                        label: i18n( 'DCWindow.BUTTONS.YES' ),
                                                        name: 'yes',
                                                        isDefault: true,
                                                        action: function( e ) {
                                                            var schedulesToDeleteIds = err.data.clashedEvents.map( function( item ) {
                                                                return item._id;
                                                            } );
                                                            e.target.button.disable();
                                                            this.close( e );
                                                            Y.doccirrus.jsonrpc.api.calevent.createCloseDayEvent( {
                                                                data: data,
                                                                scheduleIds: schedulesToDeleteIds
                                                            } ).fail( function( err ) {
                                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                                            } ).done( function() {
                                                                window.location.reload();
                                                            } );
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    } );
                                }
                            } else {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            }
                        } ).done( function() {
                            window.location.reload();
                        } );
                    }
                }
            } );
        }

    }, {
        NAME: 'TabCloseDayViewModel',
        ATTRS: {}
    } );

    return {
        registerNode: function( node ) {
            ko.applyBindings( new TabCloseDayViewModel(), node.getDOMNode() );
        }
    };
};