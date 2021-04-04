/**
 * User: pi
 * Date: 09/11/15   10:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global fun:true, ko, moment, _ */
/*exported fun */
fun = function _fn( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        TIME_FORMAT = i18n( 'general.TIME_FORMAT' ),
        Disposable = Y.doccirrus.KoViewModel.getDisposable();

    function SchedulesModel( config ) {
        SchedulesModel.superclass.constructor.call( this, config );
    }

    Y.extend( SchedulesModel, Disposable, {
        initializer: function SchedulesModel_initializer( config ) {
            var
                self = this;
            self.mainNode = config.node;
            self.initSchedulesModel();



        },
        initSchedulesModel: function() {
            var
                self = this;
            self.textOfflineI18n = i18n('PatPortalMojit.intime_practices_tab.text.OFFLINE');
            self.practiceOfflineI18n = i18n('PatPortalMojit.intime_practices_tab.text.PRACTICE_OFFLINE');
            Y.doccirrus.utils.showLoadingMask( self.mainNode );
            self.isReady = ko.observable( false );
            self.practices = ko.observableArray();
            self.canCreateEvent = ko.observable();
            self.columnsNumber = ko.observable( 1 );
            self.practicesWithAppointments = 0;
            self.loadData();
        },
        handleScheduleCandel: function( practice, data ){
            var
                self = this,
                customerIdPrac = practice.customerIdPrac;
            Y.doccirrus.DCWindow.notice( {
                type: 'info',
                title: 'Termin stornieren',
                message: 'Möchten Sie diesen Termin wirklich stornieren?',
                window: {
                    width: Y.doccirrus.DCWindow.SIZE_SMALL,
                    buttons: {
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function() {
                                    var
                                        modal = this;
                                    self.deleteSchedule( {
                                        customerIdPrac: customerIdPrac,
                                        scheduleId: data._id,
                                        calendarId: data.calendar && data.calendar._id,
                                        adhoc: data.adhoc
                                    } )
                                        .done( function() {
                                            modal.close();
                                            Y.doccirrus.DCWindow.notice( {
                                                type: 'info',
                                                message: 'Ihr Termin wurde storniert.'
                                            } );
                                            practice.schedules.remove( data );
                                            if( 0 === ko.utils.peekObservable(practice.schedules).length ){
                                                self.practices.remove( practice );
                                            }
                                            self.setColumnsNumber();
                                        } )
                                        .fail( function( error ) {
                                            modal.close();
                                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                        } );
                                }
                            } )
                        ]
                    }

                }
            } );
        },
        setColumnsNumber: function(){
            var
                self = this,
                practices = ko.utils.peekObservable( self.practices );
            if( 2 <= practices.length ){
                self.columnsNumber( 2 );
            } else {
                self.columnsNumber( 1 );
            }

        },
        preparePractice: function( practice ) {
            var
                self = this;

            if( practice.schedules && practice.schedules.length ) {
                practice.schedules.forEach( self.prepareSchedule );
            }
            practice.schedules = ko.observableArray( practice.schedules );
            practice.cancelEvent = function( data ) {
                self.handleScheduleCandel( practice, data );
            };
            return practice;

        },
        loadData: function() {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.patientportal.getPatientSchedule()
                .done( function( response ) {
                    var
                        data = response && response.data,
                        practiceAdded = 0;
                    if( data && data.length ) {
                        data.forEach( function( practice ) {
                            if( practice.canCreateEvent ) {
                                self.canCreateEvent( true );
                            }
                            if( (practice.schedules && practice.schedules.length) || practice.prcOffline ) {
                                if( 2 > practiceAdded ){
                                    practiceAdded ++;
                                    self.columnsNumber( practiceAdded );
                                }
                                self.practices.push( self.preparePractice( practice ) );
                            }
                        } );
                    }
                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } )
            .always(function(){
                    self.setModelIsReady();
                });
        },
        deleteSchedule: function( config ) {
            return Y.doccirrus.jsonrpc.api.patientportal.patientSchedule( {
                query: {
                    subaction: 'delete'
                },
                data: config
            } );
        },
        prepareSchedule: function( schedule ) {
            var
                locationName,
                locationPhone,
                locationsData = {},
                calendarNames = [];
            // init
            schedule.formattedDate = '';
            schedule.locationData = '';
            schedule.calendarName = '';
            schedule.isRunning = moment( schedule.start ).isBefore( moment() );
            if( schedule.start ) {
                schedule.formattedDate = moment( schedule.start ).format( 'dd, DD.MM.' ) + ' ' + moment( schedule.start ).format( TIME_FORMAT );
            }
            if( _.isArray( schedule.calendar ) ) {
                schedule.calendar.forEach( function( calendar ) {
                    locationName = calendar.locationId && calendar.locationId.locname || '';
                    locationPhone = calendar.locationId && calendar.locationId.phone || 'keine Tel. Nr. vorhanden';
                    if( !locationsData.hasOwnProperty( calendar.locationId._id ) ) {
                        locationsData[ calendar.locationId._id] = locationName + ' (' + locationPhone + ') ';
                    }
                    if( calendarNames.indexOf( calendar.name ) < 0 ) {
                        calendarNames.push( calendar.name );
                    }
                } );
                schedule.locationData = Object.keys( locationsData ).map( function( key ) { return locationsData[key]; } ).join(', ');
                schedule.calendarName = calendarNames.join( ', ' );
            } else {
                locationName = schedule.calendar.locationId && schedule.calendar.locationId.locname || '';
                locationPhone = schedule.calendar.locationId && schedule.calendar.locationId.phone || 'keine Tel. Nr. vorhanden';
                schedule.locationData = locationName + ' (' + locationPhone + ')';
                schedule.calendarName = schedule.calendar.name;
            }
        },
        setModelIsReady: function() {
            var
                self = this;
            self.isReady( true );
            Y.doccirrus.utils.hideLoadingMask( self.mainNode );
        }

    } );

    return {
        registerNode: function( node /*, key, options*/ ) {
            var
                schedulesModel = new SchedulesModel( { node: node });
            ko.applyBindings( schedulesModel, document.querySelector( '#intimeSchedules' ) );
        },

        deregisterNode: function( node ) {
            Y.log( 'deregistered ' + ( node || node._yuid ), 'debug', NAME );
        }
    };
};