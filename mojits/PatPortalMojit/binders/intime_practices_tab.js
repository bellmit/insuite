/**
 * User: pi
 * Date: 09//11/15  15:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global fun:true, ko, $, google */
/*exported fun */
//TRANSLATION INCOMPLETE!! MOJ-3201
fun = function _fn( Y, NAME ) {
    'use strict';

    var
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        i18n = Y.doccirrus.i18n,
        WeeklyTimeModel = Y.doccirrus.KoViewModel.getConstructor( 'WeeklyTimeModel' ),
        EMAIL_SENT = i18n('PatPortalMojit.intime_practices_tab.text.EMAIL_SENT'),
        EMAIL_SENT_EXTRA = i18n('PatPortalMojit.intime_documents_tab.text.EMAIL_SENT_EXTRA');

    function PracticesModel( config ) {
        PracticesModel.superclass.constructor.call( this, config );
    }

    Y.extend( PracticesModel, Disposable, {
        initializer: function PracticesModel_initializer( config ) {
            var
                self = this;
            self.mainNode = config.node;
            self.commonData = config.commonData;
            self.initPracticesModel();

        },
        initPracticesModel: function() {
            var
                self = this;
            self.practiceOfflineI18n = i18n('PatPortalMojit.intime_practices_tab.text.PRACTICE_OFFLINE');
            self.bookingIsBlockedI18n = i18n('PatPortalMojit.intime_practices_tab.text.BLOCKED_BOOKING');
            self.textOfflineI18n = i18n('PatPortalMojit.intime_practices_tab.text.OFFLINE');
            self.practices = ko.observableArray();
            self.isReady = ko.observable( false );
            self.loadData();

        },
        loadData: function() {
            var
                self = this;
            self.practices( [] );
            self.setModelIsNotReady();
            Y.doccirrus.jsonrpc.api.patientportal.getFullPracticeInfo()
                .done( function( response ) {
                    var
                        data = response.data;
                    if( data && data.length ) {
                        data.forEach( function( practice ) {
                            self.practices.push( self.prepatePracticeData( practice ) );
                        } );
                    }
                    self.checkCurrentPraxis( data || [] );

                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } )
                .always( function() {
                    self.setModelIsReady( true );
                } );
        },
        initSelect2Calendar: function( location ) {
            var self = this;
            location.selectedCalendar = ko.observable();
            location.select2Calendar = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        var selectedCalendar = ko.unwrap( location.selectedCalendar );
                        return selectedCalendar;
                    },
                    write: function( $event ) {
                        location.selectedCalendar( $event.val );
                        location.calendarEmployee = $event.added.employee;
                        location.isRandomMode = $event.added.random;
                    }
                } ) ),
                select2: {
                    placeholder: 'Keine Termine online buchbar',
                    data: function() {
                        return {
                            results: location.calendars.map( function( calendar ) {
                                return {
                                    id: calendar._id,
                                    text: calendar.name,
                                    random: calendar.isRandomMode || false,
                                    employee: calendar.employee
                                };
                            } )
                        };
                    }
                }
            };

        },
        formatTime: function( arrayOfNumbers ) {
            var
                hours, minutes;

            if( Array.isArray( arrayOfNumbers ) && arrayOfNumbers.length ) {
                hours = String( arrayOfNumbers[0] );
                minutes = String( arrayOfNumbers[1] || 0 );

                hours = hours.length < 2 ? '0' + hours : hours;
                minutes = minutes.length < 2 ? '0' + minutes : minutes;

                return hours + ':' + minutes;
            }
            return '';
        },
        computeOpenTimesDisplay: function( openTimes ) {
            var
                self = this,
                times = openTimes,
                result = [],
                resultMap = {};

            Y.each( WeeklyTimeModel.ATTRS.dayAliasMap.value, function( alias, day ) {
                result.push( {
                    alias: alias,
                    day: day,
                    times: []
                } );
            } );

            if( !(Array.isArray( times ) && times.length) ) {
                return result;
            }

            result.forEach( function( item ) {
                resultMap[item.day] = item;
            } );

            times.forEach( function( time ) {
                time.days.forEach( function( day ) {
                    var
                        formattedStart = self.formatTime( time.start ),
                        formattedEnd = self.formatTime( time.end );

                    resultMap[day].times.push( { start: formattedStart, end: formattedEnd } );
                } );
            } );

            result.forEach( function( item ) {
                if( item.times.length ) {
                    item.times.sort( function( a, b ) {
                        return Y.ArraySort.naturalCompare( a.start, b.start );
                    } );
                }
                else {
                    item.times.push( '-' );
                }
            } );

            return result;
        },
        prepareLocation: function( location, practice ) {
            var
                self = this;

            location.calendars = [];
            self.initSelect2Calendar( location );
            location.openDays = self.computeOpenTimesDisplay( location.openTimes );
            location.phone = location.phone || '';
            location.makeAppointment = function() {
                if( !practice.confirmed ) {
                    self.sendConfirmationRequest( practice.customerIdPrac, practice.email, true);
                } else {
                    self.commonData.appointmentData = {
                        locname: location.locname,
                        customerIdPrac: practice.customerIdPrac,
                        calendarId: ko.utils.peekObservable( location.selectedCalendar ),
                        employee: location.calendarEmployee,
                        isRandomMode: location.isRandomMode
                    };
                    Y.doccirrus.nav.router.save( '/appointment' );
                }
            };
        },
        prepatePracticeData: function( practice ) {
            var
                self = this,
                locationsMap = {};
            if( practice.locations && practice.locations.length ) {
                practice.locations.forEach( function( location ) {
                    locationsMap[ location._id ] = location;
                    self.prepareLocation( location, practice );
                } );
                if( practice.calendars && practice.calendars.length ) {
                    practice.calendars.forEach( function( calendar ) {
                        var
                            location = locationsMap[ calendar.locationId ];
                        if( location ) {
                            if( !ko.utils.peekObservable( location.selectedCalendar ) ) {
                                location.selectedCalendar( calendar._id );
                                location.isRandomMode = calendar.isRandomMode;
                                location.calendarEmployee = calendar.employee;
                            }
                            location.calendars.push( calendar );
                        }
                    } );
                }
                practice.locations = practice.locations.filter( function( location ) {
                    return location.calendars && location.calendars.length;
                } );
            } else {
                practice.locations = [];
            }
            practice.sendConfirmationEmail = function() {
                self.sendConfirmationRequest( practice.customerIdPrac, practice.email );
            };

            if( !practice.coname ) {
                practice.coname = '';
            }

            return practice;
        },
        checkCurrentPraxis: function( practices ) {
            var
                self = this,
                currentCustomerId = self.commonData.prac,
                isNewPractice = currentCustomerId && practices.every( function( practice ) {
                        return currentCustomerId !== practice.customerIdPrac;
                    } );
            if( isNewPractice && !self.commonData.practiceIsChecked ) {
                self.commonData.setPracticeIsChecked( true );
                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: 'Soll diese Einrichtung in die Liste Ihrer Praxen aufgenommen werden?',
                    window: {
                        width: Y.doccirrus.DCWindow.SIZE_SMALL,
                        buttons: {
                            header: [ 'close' ],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        self.sendAddPracRequest( currentCustomerId );
                                        this.close();

                                    }
                                } )
                            ]
                        }
                    }
                } );
            }

        },
        sendAddPracRequest: function( customerId ) {
            var
                self = this;
            self.setModelIsNotReady();
            Y.doccirrus.jsonrpc.api.patientreg.updatePatient( {
                data: {
                    customerId: customerId
                }
            } )
                .done( function() {
                    self.loadData();
                } )
                .fail( function( error ) {
                    self.setModelIsReady();
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        },
        setModelIsReady: function( initMap ) {
            var
                self = this;
            self.isReady( true );
            if( initMap ) {
                self.initMaps( ko.utils.peekObservable( self.practices ) );
            }
            Y.doccirrus.utils.hideLoadingMask( self.mainNode );
        },
        setModelIsNotReady: function() {
            var
                self = this;
            self.isReady( false );
            Y.doccirrus.utils.showLoadingMask( self.mainNode );
        },
        initMaps: function( practices ) {

            if (typeof google === 'undefined') {
                Y.log("Intime_practices_tab: google keyword is undefined.");
                return;
            }

            var mapOptions = {
                    zoom: 13
                },
                geocoder = new google.maps.Geocoder(),
                map,
                marker,         //  eslint-disable-line no-unused-vars
                address;
            if( 0 < $( "div[id^='map-canvas']" ).length && 0 < practices.length ) {
                $( practices ).each( function( j, practice ) {
                    $( practice.locations ).each( function( i, loc ) {

                        address = loc.street + " " + loc.houseno + "," + loc.zip + " " + loc.city + "," + loc.country;
                        geocoder.geocode( { 'address': address }, function( results, status ) {
                            if( status === google.maps.GeocoderStatus.OK ) {

                                map = new google.maps.Map( $( "#map-canvas-" + practice.customerIdPrac + '-' + loc._id )[ 0 ], mapOptions );
                                map.setCenter( results[ 0 ].geometry.location );
                                marker = new google.maps.Marker( {
                                    position: results[ 0 ].geometry.location,
                                    map: map,
                                    title: results[ 0 ].formatted_address
                                } );
                            } else {
                                Y.log( "Geocode was not successful for the following reason: " + status );
                            }
                        } );

                    } );

                } );
            }
        },
        showConfirmationModal: function( email, extra ) {
            var
                text;
            if( extra ) {
                text = Y.Lang.sub( EMAIL_SENT_EXTRA, { email: email, newLine: '<br/>' } );
            } else {
                text = Y.Lang.sub( EMAIL_SENT, { email: email, newLine: '</br>' } );
            }
            Y.doccirrus.DCWindow.notice( {
                type: 'info',
                message: text,
                window: {
                    width: Y.doccirrus.DCWindow.SIZE_SMALL
                }
            } );
        },
        sendConfirmationRequest: function( customerIdPrac, email, extra ) {
            var
                self = this;
            self.setModelIsNotReady();
            Y.doccirrus.jsonrpc.api.patientreg.sendEmailConfirmationAgain( {
                data: { customerIdPrac: customerIdPrac }
            } )
                .done( function() {
                    self.showConfirmationModal( email, extra );
                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } )
                .always( function() {
                    self.setModelIsReady();
                } );
        }
    } );

    return {
        registerNode: function( node, key, options ) {

            var
                practicesModel = new PracticesModel( { node: node, commonData: options.binder.commonData } );
            ko.applyBindings( practicesModel, document.querySelector( '#intimePractices' ) );
        },

        deregisterNode: function( node ) {
            Y.log( 'deregistered ' + ( node || node._yuid ), 'debug', NAME );
        }
    };
};