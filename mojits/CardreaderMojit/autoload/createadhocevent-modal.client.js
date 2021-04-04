/**
 * User: do
 * Date: 26/08/15  15:20
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*jslint anon:true, nomen:true*/
/*global YUI, ko, $, async */

'use strict';

YUI.add( 'dccreateadhoceventmodal', function( Y ) {

        var i18n = Y.doccirrus.i18n,
            CREATE_ADHOC_EVENT = i18n( 'InCaseMojit.createadhocevent-modalJS.title.CREATE_ADHOC_EVENT' ),
            ERROR_DEFAULT = i18n( 'InCaseMojit.createadhocevent-modalJS.messages.ERROR_DEFAULT' ),
            NO_EVENT = i18n( 'InCaseMojit.createadhocevent-modalJS.buttons.NO_EVENT' ),
            CREATE_EVENT = i18n( 'InCaseMojit.createadhocevent-modalJS.buttons.CREATE_EVENT' );

        function showError( response ) {
            var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response ),
                msg;

            if( !errors || !errors.length ) {
                return false;
            }
            msg = errors.map( function( error ) {
                return error.message;
            } ).filter( Boolean );

            Y.doccirrus.DCWindow.notice( {
                message: msg && msg.length ? msg.join( '<br>' ) : ERROR_DEFAULT
            } );
            return true;
        }

        function refsCalendar( calId, type ) {
            return type.calendarRefs.some( function( cal ) {
                if( cal.calendarId === calId ) {
                    return true;
                }
            } );
        }

        function ChooseCalModel( data ) {
            this.patientId = data.patientId;
            this.selectedCalendar = ko.observable();
            this.selectedScheduleType = ko.observable();
            this.calendars = data.calendars;
            this.scheduleTypes = ko.computed( function() {
                var selectedCalendar = this.selectedCalendar(),
                    calId,
                    result = [];
                if( !selectedCalendar ) {
                    return result;
                }
                calId = selectedCalendar._id;
                data.scheduleTypes.forEach( function( type ) {
                    if( refsCalendar( calId, type ) ) {
                        result.push( type );
                    }
                } );
                return result;
            }.bind( this ) );
        }

        ChooseCalModel.prototype.createEvent = function( callback ) {
            var selectedCalendar = this.selectedCalendar(),
                selectedScheduleType = this.selectedScheduleType(),
                patientId = this.patientId;

            getNextNumber( function( err, data ) {
                if( err ) {
                    return callback();
                }

                data.calendar = selectedCalendar._id;
                data.scheduletype = selectedScheduleType._id;
                data.patient = patientId;
                data.arrivalTime = new Date();
                data.duration = selectedScheduleType.duration;
                data.plannedDuration = selectedScheduleType.duration;
                data.isFromCardReader = true;

                if( ['CONFERENCE', 'ONLINE_CONSULTATION'].includes( selectedScheduleType.type ) ) {
                    data.employee = selectedCalendar.employee;
                    data.conferenceType = selectedScheduleType.type;
                }

                Y.doccirrus.jsonrpc.api.calevent.create( {
                    data: data
                } ).done( function( response ) {
                    showError( response );
                    callback();
                } ).fail( function( response ) {
                    showError( response );
                    callback();
                } ).always( callback );
            } );
        };

        function getNextNumber( cb ) {
            var
                nextNumUrl = '/r/calculateschedule/?action=calculateschedule&subaction=NEXT_NUM';
            $.ajax( {
                type: 'GET',
                xhrFields: {
                    withCredentials: true
                },
                url: Y.doccirrus.infras.getPrivateURL( nextNumUrl )
            } ).done( function( response ) {
                cb( null, response && response[0] );
            } ).fail( function( response ) {
                showError( response );
                cb( {} );
            } );
        }

        Y.namespace( 'doccirrus.modals' ).chooseScheduleForAdhocEvent = {

            show: function( patientId, done ) {
                var model,
                    modal,
                    node = Y.Node.create( '<div></div>' );

                function createDialog( err, data ) {
                    if( err ) {
                        return;
                    }
                    data.patientId = patientId;
                    model = new ChooseCalModel( data );

                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'createadhocevent_modal',
                        'CardreaderMojit',
                        {},
                        node,
                        function() {
                            modal = new Y.doccirrus.DCWindow( {
                                    className: 'DCWindow-CreateAdhocEvent',
                                    bodyContent: node,
                                    title: CREATE_ADHOC_EVENT,
                                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                                    centered: true,
                                    modal: true,
                                    dragable: true,
                                    maximizable: true,
                                    resizeable: true,
                                    render: document.body,
                                    buttons: {
                                        header: ['close', 'maximize'],
                                        footer: [
                                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                                label: NO_EVENT,
                                                action: function() {
                                                    modal.close();
                                                    done();
                                                }
                                            } ),
                                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                                isDefault: true,
                                                label: CREATE_EVENT,
                                                action: function() {

                                                    model.createEvent( function() {
                                                        modal.close();
                                                        done();
                                                    } );
                                                }
                                            } )
                                        ]
                                    }
                                }
                            );

                            model.confirmCreationsI18n = i18n('InCaseMojit.createadhocevent_modal.text.CONFIRM_CREATION');
                            model.calendarI18n = i18n('InCaseMojit.createadhocevent_modal.label.CALENDAR');
                            model.scheduleTypeI18n = i18n('InCaseMojit.createadhocevent_modal.label.SCHEDULE_TYPE');

                            ko.applyBindings( model, node.getDOMNode().querySelector( '#createAdHocEventModal' ) );

                        } );
                }

                async.parallel( {
                    calendars: function( cb ) {
                        Y.doccirrus.jsonrpc.api.calendar.read( {
                            query: {
                                type: 'PATIENTS'
                            }
                        } )
                            .done( function( response ) {
                                if( showError( response ) ) {
                                    return cb( new Error() );
                                }
                                cb( null, response.data );
                            } ).fail( function( response ) {
                                showError( response );
                                cb( {} );
                            } );

                    },
                    scheduleTypes: function( cb ) {
                        Y.doccirrus.jsonrpc.api.scheduletype.read()
                            .done( function( response ) {
                                if( showError( response ) ) {
                                    return cb( new Error() );
                                }
                                cb( null, response.data );
                            } ).fail( function( response ) {
                                showError( response );
                                cb( {} );
                            } );
                    }
                }, createDialog );

            }
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);
