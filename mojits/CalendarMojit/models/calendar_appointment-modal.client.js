/*
 @author: pi
 @date: 21/01/2015
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery, _, moment */

'use strict';

YUI.add( 'CalendarAppointmentModal', function( Y, NAME ) {

        var
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            ignoreDependencies = ko.ignoreDependencies,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            calendarAppointmentModal = {
                getModalConfig: function() {
                    return {
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: Y.doccirrus.DCWindow.SIZE_LARGE,
                        height: 600,
                        minHeight: 250,
                        minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                        centered: true,
                        modal: true, // modal and select2 not work well together - see RepetitionKoViewModel.select2FocusWorkaround for usage
                        //focusOn: [], // this would solve the select2 problem - but disables it in general
                        maximizable: false,
                        fitOnViewPortResize: !Y.UA.touchEnabled // for non touch devices to handle complete visibility of dialog for small screens, eg: mac-book
                    };
                },
                showAppointmentByType: function( type, data, options ) {
                    var
                        self = this,
                        result;
                    if( 'CONFERENCE' === type || 'ONLINE_CONSULTATION' === type ) {
                        options.multiplePatientSelector = 'CONFERENCE' === type;
                        result = self.renderConferenceAppointment( data, options );
                    } else {
                        result = self.renderStandardAppointment( data, options );
                    }
                    return result;
                },
                renderConferenceAppointment: function( data, options ) {
                    var
                        self = this,
                        template = options.conferenceTemplate,
                        scheduletypes = options.scheduletypes,
                        bodyContent = Y.Node.create( template ),
                        modal,
                        sources = options.calendarsFiltered,
                        appointmentData = options.appointmentData,
                        isModified = options.isModified,
                        title = getLastEditor( data ),
                        conferenceAppointmentModel = Y.doccirrus.KoViewModel.createViewModel( {
                            NAME: 'ConferenceAppointmentModel',
                            config: {
                                severityColorMap: options.severityColorMap,
                                sources: sources,
                                scheduletypes: scheduletypes,
                                data: _.assign( {
                                    calendar: appointmentData && appointmentData.calendar,
                                    conferenceType: options.multiplePatientSelector ? Y.doccirrus.schemas.conference.conferenceTypes.CONFERENCE : Y.doccirrus.schemas.conference.conferenceTypes.ONLINE_CONSULTATION
                                }, data ),
                                userSetDuration: options.userSetDuration || false,
                                findAppointment: options.findAppointment || false,
                                employees: options.employees,
                                patients: options.patients,
                                userEmployee: options.userEmployee,
                                multiplePatientSelector: options.multiplePatientSelector
                            }
                        } ),
                        deleteBtn,
                        selectedPatient,
                        email;

                    if( appointmentData && isModified ) {
                        if( !options.multiplePatientSelector ) {
                            if( appointmentData.patients && 1 < appointmentData.patients.length ) {
                                appointmentData.patients.length = 1;
                            }
                            if( appointmentData.employees && 1 < appointmentData.employees.length ) {
                                appointmentData.employees.length = 1;
                            }
                            selectedPatient = appointmentData.patients && _.find( options.patients, { _id: appointmentData.patients[ 0 ] } );
                            email = selectedPatient && selectedPatient.communications && Y.doccirrus.schemas.simpleperson.getEmail( selectedPatient.communications ) || {};
                            if( selectedPatient && (!appointmentData.participants || !appointmentData.participants[ 0 ] || appointmentData.participants[ 0 ].email !== email.value ) ) {
                                appointmentData.participants = [ {
                                        lastname: selectedPatient.lastname,
                                        firstname: selectedPatient.firstname,
                                        talk: selectedPatient.talk,
                                        email: email && email.value
                                    } ];
                            }

                        }
                        appointmentData.conferenceType = options.multiplePatientSelector ? Y.doccirrus.schemas.conference.conferenceTypes.CONFERENCE : Y.doccirrus.schemas.conference.conferenceTypes.ONLINE_CONSULTATION;
                        conferenceAppointmentModel.set( 'data', appointmentData );
                    }

                    function getConferenceAppointmentDialogTitle( model ) {
                        if( model.isFindAppointment() ) {
                            return i18n( 'CalendarMojit.calendar.title.FIND_CONFERENCE_APPOINTMENT' );
                        } else {
                            return i18n( 'CalendarMojit.calendar.title.PLANNED_CONFERENCE_APP' );
                        }
                    }

                    modal = new Y.doccirrus.DCWindow( _.assign( self.getModalConfig(), {
                        id: 'onlineAppiontmentModal',
                        className: 'DCWindow-Appointment',
                        bodyContent: bodyContent,
                        title: getConferenceAppointmentDialogTitle( conferenceAppointmentModel ),
                        render: document.body,
                        buttons: {
                            header: [
                                'close',
                                {
                                    label: title,
                                    name: 'lastEditor',
                                    value: 'lastEditor',
                                    action: function( e ) {
                                        e.preventDefault();
                                    },
                                    section: 'header',
                                    template: '<button class="btn-text" />'
                                } ],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'DELETE', {
                                    isDefault: true,
                                    action: function() {
                                        conferenceAppointmentModel.remove()
                                            .then( function() {
                                                modal.close();
                                            } )
                                            .catch( function( error ) {
                                                modal.close();
                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                            } );

                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                    isDefault: true,
                                    action: function() {
                                        conferenceAppointmentModel.save()
                                            .then( function() {
                                                modal.close();
                                            } )
                                            .catch( function( error ) {
                                                modal.close();
                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                            } );

                                    }
                                } )
                            ]
                        },
                        after: {
                            visibleChange: function( event ) {
                                if( !event.newVal ) {
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                    conferenceAppointmentModel.destroy();
                                }
                            }
                        }
                    } ) );
                    conferenceAppointmentModel.addDisposable( ko.computed( function() {
                        var
                            modelValid = conferenceAppointmentModel.isValid() &&
                                         ( conferenceAppointmentModel.selectedPatients.hasError ? !conferenceAppointmentModel.selectedPatients.hasError() : true ),
                            isModified = conferenceAppointmentModel.isModified(),
                            okBtn = modal.getButton( 'SAVE' ).button;
                        if( modelValid && isModified ) {
                            okBtn.enable();
                        } else {
                            okBtn.disable();
                        }
                    } ) );
                    if( conferenceAppointmentModel.isNew() ) {
                        deleteBtn = modal.getButton( 'DELETE' ).button;
                        deleteBtn.disable();
                    }

                    modal.set( 'focusOn', [] );
                    ko.applyBindings( conferenceAppointmentModel, bodyContent.getDOMNode() );
                    return { model: conferenceAppointmentModel, modal: modal };

                },
                renderStandardAppointment: function( data, options ) {
                    options = options || {};
                    var
                        self = this,
                        scheduletypes = options.scheduletypes,
                        eventTarget = options.eventTarget,
                        onDelete = options.onDelete,
                        inTimeConfig = options.inTimeConfig,
                        createAppointment = options.createAppointment,
                        updateRepetitionConfirmed = options.updateRepetitionConfirmed,
                        updateAppointment = options.updateAppointment,
                        appointmentData = options.appointmentData,
                        isModified = options.isModified,
                        title = getLastEditor( data ),
                        aDCWindow,
                        aDCWindowFocusOn,
                        aRepetitionKoViewModel = Y.doccirrus.KoViewModel.createViewModel( {
                            NAME: 'RepetitionKoViewModel',
                            config: {
                                sources: options.calendarsFiltered,
                                scheduletypes: scheduletypes,
                                data: _.assign( {}, data ),
                                /** @see RepetitionKoViewModel.select2FocusWorkaround */
                                select2FocusWorkaround: function BinderViewModel_showAppointmentDialog_select2FocusWorkaround() {
                                    aDCWindow.set( 'focusOn', [] );
                                },
                                /** @see RepetitionKoViewModel.select2BlurWorkaround */
                                select2BlurWorkaround: function BinderViewModel_showAppointmentDialog_select2BlurWorkaround() {
                                    aDCWindow.set( 'focusOn', aDCWindowFocusOn );
                                },
                                userSetDuration: options.userSetDuration || false,
                                severityColorMap: options.severityColorMap,
                                findAppointment: options.findAppointment || false,
                                employees: options.employees,
                                patients: options.patients,
                                userEmployee: options.userEmployee
                            }
                        } ),
                        bodyContent = Y.Node.create( '<div data-bind="template: { name: templateName, data: data }"></div>' ),
                        aDCWindowTitle = getStandardAppointmentDialogTitle( aRepetitionKoViewModel );
                    if( appointmentData && isModified ) {
                        aRepetitionKoViewModel.set( 'data', appointmentData );
                    }

                    function clearLoadEvent() {
                        if( Y.doccirrus.utils.sessionValueGet( 'loadEvent' ) ) {
                            Y.doccirrus.utils.sessionValueSet( 'loadEvent', '' );
                        }
                    }

                    function getStandardAppointmentDialogTitle( repetitionModel ) {
                        if( repetitionModel.isAdHoc() ) {
                            return i18n( 'CalendarMojit.calendar.title.NR_SPON_APP' );
                        } else if( repetitionModel.isFindAppointment() ) {
                            return i18n( 'CalendarMojit.calendar.title.FIND_APPOINTMENT' );
                        } else if( repetitionModel.group() ) {
                            return i18n( 'CalendarMojit.calendar.title.PLANNED_GROUP_APP' ) + '(' + repetitionModel.capacityOfGroup() +')';
                        } else {
                            return i18n( 'CalendarMojit.calendar.title.PLANNED_APP' );
                        }
                    }

                    aDCWindow = new Y.doccirrus.DCWindow( _.assign( self.getModalConfig(), {
                        className: 'DCWindow-Appointment',
                        bodyContent: bodyContent,
                        title: aDCWindowTitle,
                        render: document.body,
                        buttons: {
                            header: [
                                'close',
                                {
                                    label: title,
                                    name: 'lastEditor',
                                    value: 'lastEditor',
                                    action: function( e ) {
                                        e.preventDefault();
                                    },
                                    section: 'header',
                                    template: '<button class="btn-text" style="margin-bottom: 1px;"/>'
                                },
                                {
                                    name: 'editHistory',
                                    section: 'header',
                                    template: '<i id="historyTooltip" class="dc-info-icon btn-text white-tooltip" style="position: relative; left: -23px; background-color: rgba(255,255,255,0.0); display: none" data-toggle="tooltip" data-placement="bottom" data-html="true"></i>'
                                }
                            ],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                {
                                    label: i18n( 'CalendarMojit.calendar.button.DELETE' ),
                                    name: 'DELETE',
                                    action: function BinderViewModel_showAppointmentDialog_delete( e ) {
                                        e.target.button.disable();
                                        onDelete( aRepetitionKoViewModel.toJSON() )
                                            .after( {
                                                cancel: function BinderViewModel_showAppointmentDialog_deleteAppointmentConfirmed_cancel() {
                                                    e.target.button.enable();
                                                },
                                                fail: function BinderViewModel_showAppointmentDialog_deleteAppointmentConfirmed_fail() {
                                                    e.target.button.enable();
                                                },
                                                done: function BinderViewModel_showAppointmentDialog_deleteAppointmentConfirmed_done() {
                                                    if( Y.doccirrus.utils.sessionValueGet( 'loadEvent' ) &&
                                                        JSON.parse( Y.doccirrus.utils.sessionValueGet( 'loadEvent' ) ).preselection ) {
                                                        clearLoadEvent();
                                                    }
                                                    aDCWindow.close( e );
                                                    eventTarget.fire.apply( eventTarget, [ 'delete' ].concat( Array.prototype.slice.call( arguments ) ) );
                                                    eventTarget.detachAll();
                                                }
                                            } );
                                    }
                                },
                                {
                                    label: i18n( 'CalendarMojit.calendar.button.SAVE' ),
                                    name: 'SAVE',
                                    isDefault: false,
                                    action: function BinderViewModel_showAppointmentDialog_save( e ) {
                                        var data = aRepetitionKoViewModel.toJSON(),
                                            preselection = {
                                                patient: data.patient,
                                                calendar: data.calendar,
                                                userDescr: data.userDescr,
                                                details: data.details,
                                                scheduleType: data.scheduletype,
                                                duration: data.duration,
                                                severity: data.severity
                                            },
                                            localLoadEvent = Y.doccirrus.utils.sessionValueGet( 'loadEvent' ),
                                            loadEvent = localLoadEvent ? JSON.parse( localLoadEvent ) : {};

                                        loadEvent.preselection = preselection;
                                        Y.doccirrus.utils.sessionValueSet( 'loadEvent', loadEvent );
                                        showAppointmentDialog_save( e, !options.findAppointment );
                                    }
                                },
                                {
                                    label: i18n( 'CalendarMojit.calendar.button.PRINT' ),
                                    name: 'PRINT',
                                    isDefault: false,
                                    action: function BinderViewModel_showAppointmentDialog_print( /*e*/ ) {
                                        var data = aRepetitionKoViewModel.toJSON(),
                                            patientId = data.patient;

                                        Y.doccirrus.jsonrpc.api.patient
                                            .read( { query: { '_id': patientId } } )
                                            .done( onPatientLoaded );

                                        function onPatientLoaded( response ) {
                                            response = response.data ? response.data : response.data;
                                            response = response[ 0 ] ? response[ 0 ] : response;

                                            if( !response._id || response._id !== patientId ) {
                                                Y.log( 'Could not load patient: ' + patientId, 'warn', NAME );
                                                return;
                                            }

                                            Y.doccirrus.modals.appointments.show( {
                                                'patient': response,
                                                'patientId': patientId
                                            } );
                                        }

                                        /*
                                         Y.doccirrus.modals.appointments.show( {
                                         'patient': currentPatient,
                                         'patientId': unwrap( currentPatient._id )
                                         } );
                                         */
                                    }
                                },
                                {
                                    label: i18n( 'CalendarMojit.calendar.button.ASSUME' ),
                                    name: 'ASSUME',
                                    isDefault: true,
                                    action: function BinderViewModel_showAppointmentDialog_save( e ) {
                                        if( Y.doccirrus.utils.sessionValueGet( 'loadEvent' ) &&
                                            JSON.parse( Y.doccirrus.utils.sessionValueGet( 'loadEvent' ) ).preselection ) {
                                            clearLoadEvent();
                                        }
                                        showAppointmentDialog_save( e, true );
                                    }
                                }
                            ]
                        },
                        after: {
                            visibleChange: function BinderViewModel_showAppointmentDialog_visibleChange( yEvent ) {
                                // also captures cancel for e.g.: ESC
                                if( !yEvent.newVal ) {
                                    setTimeout( function BinderViewModel_showAppointmentDialog_visibleChange_setTimeout() { // delay for letting others fire first
                                        eventTarget.fire( 'cancel' );
                                        eventTarget.detachAll();

                                        ko.cleanNode( bodyContent.getDOMNode() );
                                        aRepetitionKoViewModel.destroy();

                                    }, 10 );
                                }
                            }
                        }
                    } ) );
                    aDCWindowFocusOn = aDCWindow.get( 'focusOn' );

                    var curData = aRepetitionKoViewModel.toJSON();
                    if(curData && curData._id){
                        Y.doccirrus.jsonrpc.api.audit.get( {
                            query: { 'objId': curData._id },
                            sort: { timestamp: 1 }
                        } ).done( function( result ){
                            var logs = (result && result.data || []),
                                post = logs.filter(function(el){ return el.action === 'post'; }),
                                patientId = post[0] && post[0].diff && post[0].diff.isFromPortal &&
                                            post[0].diff.isFromPortal.newValue && post[0].diff.patient &&
                                            post[0].diff.patient.newValue;

                            Y.doccirrus.jsonrpc.api.patient.getForPatientBrowser( {
                                query: { '_id': patientId ? patientId : curData._id }
                            } ).done( function( patientResult ) {
                                var patient = patientResult && patientResult.data && patientResult.data[0],
                                    txtArr = [],
                                    prevEl = {},
                                    txt,
                                    prevElset = false,
                                    format = function( el ) {
                                        var user = el.user;
                                        if( el.action === 'post' && patientId && patient){
                                            user = patient.firstname + ' ' + patient.lastname;
                                        }
                                        return ( (el.action === 'post' ) ? 'Erstellt: ' : 'Geändert: ' ) +
                                               moment( el.timestamp ).format( "DD.MM.YYYY (HH:mm)" ) + ' <b>' + user + '</b>';
                                    };
                                logs.forEach( function( el ) {
                                    if( prevEl.action !== el.action || prevEl.user !== el.user ) {
                                        if( prevElset ) {
                                            txtArr.unshift( format( prevEl ) );
                                        }
                                        prevElset = true;
                                        prevEl = JSON.parse( JSON.stringify( el ) );
                                    }
                                } );
                                if( prevElset ) {
                                    txtArr.unshift( format( prevEl ) );
                                }
                                if( txtArr.length ) {
                                    txt = '<p style="text-align:left">' + txtArr.join( '<br/>' ) + '</p>';
                                    jQuery( '#historyTooltip' ).prop( 'title', txt ).tooltip().show();
                                }
                            } );
                        } );
                    }

                    function savePlusActionOnFindAppointment() {
                        aRepetitionKoViewModel.findAppointmentAvailableDates.removeAll();
                        aRepetitionKoViewModel.resourceCalendarsToBook.removeAll();
                        aRepetitionKoViewModel.requiredResources.removeAll();
                        aRepetitionKoViewModel.findStartDate( aRepetitionKoViewModel.start() );
                        aRepetitionKoViewModel.set( 'data', {
                            start: ''
                        } );
                    }

                    function showAppointmentDialog_save( e, closeAfter ) {
                        var
                            data2Update = aRepetitionKoViewModel.toJSON(),
                            isNew = aRepetitionKoViewModel.isNew(),
                            scheduled = aRepetitionKoViewModel.scheduled(),
                            isNoShow = aRepetitionKoViewModel.isNoShow();
                        e.target.button.disable();

                        if( data2Update.until ) {
                            data2Update.until = moment( data2Update.until ).startOf('d').toISOString();
                        }
                        if( data2Update.dtstart ) {
                            data2Update.dtstart = moment( data2Update.dtstart ).startOf('d').toISOString();
                        }

                        if( Y.doccirrus.schemas.calendar.SCH_NOSHOW === scheduled ) {
                            data2Update.noShow = isNoShow;
                            if( !isNoShow ) {
                                data2Update.scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING;
                            }
                        }
                        /*var newd = new Date( data2Update.until );
                         var tzOffset = newd.getTimezoneOffset();
                         data2Update.until = new Date( newd.getTime() + (tzOffset > 0 ? tzOffset : (tzOffset * (-1))) * 60 * 1000 );*/

                        if( isNew ) {
                            if( aRepetitionKoViewModel.resourceCalendarsToBook() && aRepetitionKoViewModel.resourceCalendarsToBook().length ) {
                                data2Update.calendar = aRepetitionKoViewModel.resourceCalendarsToBook();
                                data2Update.bookResourceFromSearch = true;
                                data2Update.scheduleTypeMeta = aRepetitionKoViewModel.scheduletype.list().find( function( listItem ) {
                                    return data2Update.scheduletype === listItem._id;
                                } );
                            }
                            if( aRepetitionKoViewModel.requiredResources() && aRepetitionKoViewModel.requiredResources().length ){
                                data2Update.requiredResources = aRepetitionKoViewModel.requiredResources();
                                data2Update.scheduleTypeMeta = aRepetitionKoViewModel.scheduletype.list().find( function( listItem ) {
                                    return data2Update.scheduletype === listItem._id;
                                } );
                            }

                            data2Update.notConfirmed = true; // this tells the server to not save when there are warnings
                            createAppointment( data2Update )
                                .done( function BinderViewModel_showAppointmentDialog_save_createAppointment_done( createAppointmentResponse ) {
                                    var createAppointmentArgumentsArray = new Y.Array( arguments ),
                                        createAppointmentWarnings = Y.doccirrus.errorTable.getWarningsFromResponse( createAppointmentResponse );

                                    e.target.button.enable();

                                    if( createAppointmentWarnings.length ) { // warnings currently actually doesn't save, but are not treated as errors

                                        e.target.button.disable();

                                        if( inTimeConfig.allowBookingsOutsideOpeningHours ) {

                                            if( 100002 === createAppointmentWarnings[0].config.code ) {
                                                //appointment was already created w, so don't need user confirmation, just show as info
                                                Y.doccirrus.DCWindow.notice( {
                                                    type: 'info',
                                                    message: Y.doccirrus.errorTable.getMessage( {code: createAppointmentWarnings[0].config.code, data: createAppointmentWarnings[0].config.data} ),
                                                    window: {
                                                        width: 'small',
                                                        buttons: {
                                                            header: ['close'],
                                                            footer: [
                                                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                                                    isDefault: true,
                                                                    disabled: false,
                                                                    action: function() {
                                                                        e.target.button.enable();
                                                                        aDCWindow.close( e );
                                                                        eventTarget.detachAll();
                                                                        this.close();
                                                                    }
                                                                } )
                                                            ]
                                                        }
                                                    }
                                                } );
                                            } else {
                                                Y.doccirrus.DCWindow.confirm( { // to be able to save the new appointment, warnings have to be confirmed by the user
                                                    title: Y.doccirrus.utils.confirmDialog.title.CONFIRMATION,
                                                    message: Y.doccirrus.errorTable.getMessage( { code: createAppointmentWarnings[ 0 ].config.code, data: createAppointmentWarnings[0].config.data } ), // also it seems as there can only be one warning
                                                    callback: function BinderViewModel_showAppointmentDialog_save_createAppointment_confirm( dialog ) {
                                                        if( dialog.success ) {

                                                            if( options.findAppointment ) {
                                                                data2Update.forAppointmentSearch = true;
                                                                data2Update.notConfirmed = true;
                                                            } else {
                                                                data2Update.notConfirmed = false; // this tells the server to save regardless of warnings
                                                            }

                                                            createAppointment( data2Update )
                                                                .done( function BinderViewModel_showAppointmentDialog_save_createAppointment_confirm_createAppointment_done( confirmedResponse ) {
                                                                    var argumentsArray = new Y.Array( arguments ),
                                                                        confirmedWarnings = Y.doccirrus.errorTable.getWarningsFromResponse( confirmedResponse );

                                                                    _.invoke( confirmedWarnings, 'display' );

                                                                    e.target.button.enable();

                                                                    propagateAppointmentModification( 'save', argumentsArray );
                                                                    eventTarget.fire.apply( eventTarget, [ 'save' ].concat( argumentsArray ) );

                                                                    if( options.findAppointment ) {
                                                                        savePlusActionOnFindAppointment();
                                                                    }

                                                                    if( closeAfter ) {
                                                                        aDCWindow.close( e );
                                                                        eventTarget.detachAll();
                                                                    }
                                                                } )
                                                                .fail( fail )
                                                                .fail( function BinderViewModel_showAppointmentDialog_save_createAppointment_confirm_createAppointment_fail() {
                                                                    e.target.button.enable();
                                                                } );

                                                        }
                                                        else {
                                                            e.target.button.enable();
                                                        }
                                                    }
                                                } );
                                            }
                                        }
                                        else {
                                            if( 7017 === createAppointmentWarnings[0].config.code ) {
                                                 Y.doccirrus.DCWindow.notice( {
                                                    type: 'warn',
                                                    message: i18n( 'calevent-api.create.error.scheduleTypeIsNotAvailableForThatTime' )
                                                } );
                                                e.target.button.enable();
                                            } else {
                                                Y.doccirrus.DCWindow.notice( {
                                                    type: 'warn',
                                                    message: i18n( 'calevent-api.create.error.bookingsOnlyAllowedWithinOpeningHours' )
                                                } );
                                                e.target.button.enable();
                                            }
                                        }

                                    }
                                    else {

                                        propagateAppointmentModification( 'save', createAppointmentArgumentsArray );
                                        eventTarget.fire.apply( eventTarget, [ 'save' ].concat( createAppointmentArgumentsArray ) );

                                        if( options.findAppointment ) {
                                            savePlusActionOnFindAppointment();
                                        }

                                        if( closeAfter ) {
                                            aDCWindow.close( e );
                                            eventTarget.detachAll();
                                        }
                                    }
                                } )
                                .fail( fail )
                                .fail( function BinderViewModel_showAppointmentDialog_save_createAppointment_fail() {
                                    e.target.button.enable();
                                } );
                        }
                        else {
                            if( aRepetitionKoViewModel.isModified( 'start' ) ) {
                                data2Update.changeEta = true;
                            }

                            if( aRepetitionKoViewModel.requiredResources() && aRepetitionKoViewModel.requiredResources().length ){
                                data2Update.requiredResources = aRepetitionKoViewModel.requiredResources();
                                data2Update.scheduleTypeMeta = aRepetitionKoViewModel.scheduletype.list().find( function( listItem ) {
                                    return data2Update.scheduletype === listItem._id;
                                } );
                            }

                            data2Update.notConfirmed = false; // currently we don't need user approval for update

                            if( data2Update.linkSeries || ( 'NONE' === data2Update.repetition && 'NONE' !== data.repetition ) || ( 'NONE' !== data2Update.repetition && 'NONE' !== data.repetition ) ) {
                                if( 'NONE' === data2Update.repetition ) {
                                    delete data2Update.dtstart;
                                    delete data2Update.until;
                                }

                                updateRepetitionConfirmed( data2Update, data )
                                    .after( {
                                        done: function BinderViewModel_showAppointmentDialog_updateRepetitionConfirmed_done( response ) {
                                            var argumentsArray = new Y.Array( arguments );
                                            Y.Array.invoke( Y.doccirrus.errorTable.getWarningsFromResponse( response ), 'display' );
                                            aDCWindow.close( e );
                                            propagateAppointmentModification( 'save', argumentsArray );
                                            eventTarget.fire.apply( eventTarget, [ 'save' ].concat( argumentsArray ) );
                                            eventTarget.detachAll();
                                        },
                                        cancel: function BinderViewModel_showAppointmentDialog_updateRepetitionConfirmed_cancel() {
                                            e.target.button.enable();
                                        },
                                        fail: function BinderViewModel_showAppointmentDialog_updateRepetitionConfirmed_fail() {
                                            e.target.button.enable();
                                        }
                                    } );
                            }
                            else {
                                if( 'NONE' !== data2Update.repetition && 'NONE' === data.repetition ) {
                                    delete data2Update.bysetpos;
                                } else {
                                    delete data2Update.dtstart;
                                    delete data2Update.until;
                                }

                                if( Y.doccirrus.schemas.calendar.isDoctorCalendar( data2Update.calendar ) ) {
                                    if( data2Update.start && data2Update.end && data2Update.scheduletype ) {
                                        if( data2Update.start !== data.start || data2Update.end !== data.end || data2Update.scheduletype !== data.scheduletype ) {
                                            data2Update.notConfirmed = true;
                                        }
                                    }
                                }

                                updateAppointment( data2Update )
                                    .done( function BinderViewModel_showAppointmentDialog_save_updateAppointment_done( response ) {
                                        var argumentsArray = new Y.Array( arguments ),
                                            updateAppointmentWarnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                                        if( updateAppointmentWarnings.length ) { // warnings currently actually doesn't save, but are not treated as errors

                                            e.target.button.disable();

                                            if( inTimeConfig.allowBookingsOutsideOpeningHours ) {
                                                if( 100002 === updateAppointmentWarnings[0].config.code ) {
                                                    //appointment was already updated, so don't need user confirmation, just show as info
                                                    Y.doccirrus.DCWindow.notice( {
                                                        type: 'info',
                                                        message: Y.doccirrus.errorTable.getMessage( {code: updateAppointmentWarnings[0].config.code, data: updateAppointmentWarnings[0].config.data} ),
                                                        window: {
                                                            width: 'small',
                                                            buttons: {
                                                                header: ['close'],
                                                                footer: [
                                                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                                                        isDefault: true,
                                                                        disabled: false,
                                                                        action: function() {
                                                                            e.target.button.enable();
                                                                            aDCWindow.close( e );
                                                                            eventTarget.detachAll();
                                                                            this.close();
                                                                        }
                                                                    } )
                                                                ]
                                                            }
                                                        }
                                                    } );
                                                } else {
                                                    Y.doccirrus.DCWindow.confirm( { // to be able to save the new appointment, warnings have to be confirmed by the user
                                                        title: Y.doccirrus.utils.confirmDialog.title.CONFIRMATION,
                                                        message: Y.doccirrus.errorTable.getMessage( {code: updateAppointmentWarnings[0].config.code, data: updateAppointmentWarnings[0].config.data} ), // also it seems as there can only be one warning
                                                        callback: function( dialog ) {
                                                            if( dialog.success ) {

                                                                data2Update.notConfirmed = false;

                                                                updateAppointment( data2Update )
                                                                    .done( function( confirmedResponse ) {
                                                                        var argumentsArray = new Y.Array( arguments ),
                                                                            confirmedWarnings = Y.doccirrus.errorTable.getWarningsFromResponse( confirmedResponse );

                                                                        Y.Array.invoke( confirmedWarnings, 'display' );

                                                                        e.target.button.enable();

                                                                        propagateAppointmentModification( 'save', argumentsArray );
                                                                        eventTarget.fire.apply( eventTarget, ['save'].concat( argumentsArray ) );
                                                                        aDCWindow.close( e );
                                                                        eventTarget.detachAll();
                                                                    } )
                                                                    .fail( fail )
                                                                    .fail( function() {
                                                                        e.target.button.enable();
                                                                    } );

                                                            }
                                                            else {
                                                                e.target.button.enable();
                                                            }
                                                        }
                                                    } );
                                                }
                                            }
                                            else {
                                                if( 7017 === updateAppointmentWarnings[0].config.code ) {
                                                    Y.doccirrus.DCWindow.notice( {
                                                        type: 'warn',
                                                        message: i18n( 'calevent-api.create.error.scheduleTypeIsNotAvailableForThatTime' )
                                                    } );
                                                    e.target.button.enable();
                                                } else {
                                                    Y.doccirrus.DCWindow.notice( {
                                                        type: 'warn',
                                                        message: i18n( 'calevent-api.create.error.bookingsOnlyAllowedWithinOpeningHours' )
                                                    } );
                                                    e.target.button.enable();
                                                }
                                            }
                                        }
                                        else {
                                            aDCWindow.close( e );
                                            propagateAppointmentModification( 'save', argumentsArray );
                                            eventTarget.fire.apply( eventTarget, ['save'].concat( argumentsArray ) );
                                            eventTarget.detachAll();
                                        }
                                    } )
                                    .fail( fail )
                                    .fail( function BinderViewModel_showAppointmentDialog_save_updateAppointment_fail() {
                                        e.target.button.enable();
                                    } );
                            }

                        }

                    }

                    aRepetitionKoViewModel.addDisposable( ko.computed( function() {
                            aRepetitionKoViewModel.isGroupMaster();
                            aDCWindow.set( 'title', getStandardAppointmentDialogTitle( aRepetitionKoViewModel ) );
                    }, self, { disposeWhenNodeIsRemoved: true } ) );

                    // handle ASSUME button enabled
                    aRepetitionKoViewModel.addDisposable( ko.computed( function BinderViewModel_showAppointmentDialog_done_compute_assume_enabled() {
                        var
                            buttonAssume = aDCWindow.getButton( 'ASSUME' ).button,
                            _isValid = aRepetitionKoViewModel._isValid(),
                            isModified = aRepetitionKoViewModel.isModified(),
                            enable = false;

                        //if scheduletype is not selected for appointment in doctor calendar
                        if( Y.doccirrus.schemas.calendar.isDoctorCalendar( aRepetitionKoViewModel.calendar() ) && !aRepetitionKoViewModel.scheduletype() ) {
                            _isValid = false;
                        }

                        if( _isValid && isModified ) {
                            enable = true;
                        }

                        if( enable ) {
                            buttonAssume.enable();
                        } else {
                            buttonAssume.disable();
                        }
                    }, self, { disposeWhenNodeIsRemoved: true } ) );

                    // handle DELETE button enabled
                    aRepetitionKoViewModel.addDisposable( ko.computed( function BinderViewModel_showAppointmentDialog_done_compute_delete_enabled() {
                        var
                            buttonAssume = aDCWindow.getButton( 'DELETE' ).button,
                            isNew = aRepetitionKoViewModel.isNew(),
                            enable = false;

                        if( !isNew ) {
                            enable = true;
                        }

                        if( enable ) {
                            buttonAssume.enable();
                        } else {
                            buttonAssume.disable();
                        }
                    }, self, { disposeWhenNodeIsRemoved: true } ) );

                    // handle SAVE button enabled
                    aRepetitionKoViewModel.addDisposable( ko.computed( function BinderViewModel_showAppointmentDialog_done_compute_save_enabled() {
                        var
                            buttonSave = aDCWindow.getButton( 'SAVE' ).button,
                            _isValid = aRepetitionKoViewModel._isValid(),
                            enable = false;

                        //if scheduletype is not selected for appointment in doctor calendar
                        if( Y.doccirrus.schemas.calendar.isDoctorCalendar( aRepetitionKoViewModel.calendar() ) && !aRepetitionKoViewModel.scheduletype() ) {
                            _isValid = false;
                        }

                        if( _isValid ) {
                            enable = true;
                        }

                        if( enable ) {
                            buttonSave.enable();
                        } else {
                            buttonSave.disable();
                        }
                    }, self, { disposeWhenNodeIsRemoved: true } ) );

                    ko.applyBindings( {
                        templateName: function BinderViewModel_showAppointmentDialog_templateName() {
                            return 'template-appointment';
                        },
                        data: aRepetitionKoViewModel
                    }, bodyContent.getDOMNode() );
                    aRepetitionKoViewModel.bindingsApplied( true );

                    //focus shall be on the first field top left
                    jQuery( "select[name='calendar']" ).focus();

                    return { model: aRepetitionKoViewModel, modal: aDCWindow };

                },
                showAppointment: function( data, options ) {
                    var
                        self = this,
                        initialAppointmentType = options.appointmentType,
                        scheduletypes;

                    function show( currentAppointmentType, data, options ) {
                        var
                            appointmentModel,
                            modal,
                            result;
                        result = self.showAppointmentByType( currentAppointmentType, data, options );
                        appointmentModel = result.model;
                        modal = result.modal;

                        appointmentModel.addDisposable( ko.computed( function() {
                            var
                                scheduleType = appointmentModel.scheduletype(),
                                appointmentData,
                                isInitial = ko.computedContext.isInitial(),
                                newAppointmentType = '',
                                isModified;
                            scheduletypes.some( function( item ) {
                                if( item._id === scheduleType ) {
                                    newAppointmentType = item.type || 'STANDARD';
                                }
                                return item._id === scheduleType;
                            } );
                            if( newAppointmentType !== currentAppointmentType ) {
                                ignoreDependencies( function() {

                                    var
                                        userSetDuration = appointmentModel.get( 'userSetDuration' ),
                                        employees = appointmentModel.get( 'employees' ),
                                        patients;

                                    if ( appointmentModel.name === 'RepetitionKoViewModel' && peek( appointmentModel.patientPopulated ) ) {
                                        patients = [ peek( appointmentModel.patientPopulated ) ];
                                    } else {
                                        patients = appointmentModel.get( 'patients' );
                                    }

                                    appointmentData = appointmentModel.toJSON();
                                    Object.keys( appointmentData ).forEach( function( key ) {
                                        if( 'undefined' === typeof appointmentData[ key ] ) {
                                            delete appointmentData[ key ];
                                        }
                                    } );
                                    isModified = appointmentModel.isModified();
                                    modal.close();
                                    appointmentModel.destroy();
                                    appointmentModel.dispose();
                                    show( newAppointmentType, data, _.assign( {}, options, {
                                        appointmentData: appointmentData,
                                        isModified: isModified,
                                        userSetDuration: userSetDuration,
                                        employees: employees,
                                        patients: patients
                                    } ) );
                                } );

                            }
                        } ) );
                    }

                    Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                        .renderFile( { path: 'CalendarMojit/views/conferenceAppointment-modal' } )
                    )
                        .then( function( response ) {

                            return Promise.resolve( readScheduletypes() )
                                .then( function( scheduletypes ) {
                                    var
                                        additionalData = {
                                            conferenceTemplate: response && response.data,
                                            scheduletypes: scheduletypes
                                        };
                                    if( data.conferenceId ) {
                                        return Promise.resolve( Y.doccirrus.jsonrpc.api.conference.getConferenceData( {
                                            query: {
                                                _id: data.conferenceId
                                            }
                                        } ) ).then( function( response ) {
                                            var
                                                conferenceData = response.data;
                                            return _.assign( additionalData, {
                                                employees: conferenceData.employeesObj,
                                                patients: conferenceData.patientsObj
                                            } );
                                        } );
                                    }
                                    return additionalData;
                                } );
                        } )
                        .then( function( additionalData ) {
                            return Promise.resolve( Y.doccirrus.jsonrpc.api.employee.getMyEmployee() )
                                .then( function( response ) {
                                    var
                                        employee = response && response.data && response.data[ 0 ];
                                    return _.assign( additionalData, {
                                        userEmployee: employee
                                    } );
                                } );
                        } )
                        .then( function( additionalData ) {
                            var
                                scheduleType;
                            scheduletypes = additionalData.scheduletypes || [];
                            if( !initialAppointmentType && data && data.scheduletype ) {
                                scheduleType = data.scheduletype;
                                scheduletypes.some( function( item ) {
                                    if( item._id === scheduleType ) {
                                        initialAppointmentType = item.type;
                                    }
                                    return item._id === scheduleType;
                                } );
                            }
                            show( initialAppointmentType || 'STANDARD', data, _.assign( {}, options, additionalData ) );
                        } )
                        .catch( catchUnhandled );

                }
            };

        function readScheduletypes() {
            return Y.doccirrus.jsonrpc.api.mirrorscheduletype
                .getScheduleTypesForCalendar( {
                    data: {
                        includeScheduletype: true
                    }
                } )
                .then( function readScheduletypes_then( response ) {
                    return response && response.data || null;
                } );
        }

        function fail( response ) {
            var
                errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

            if( errors.length ) {
                Y.Array.invoke( errors, 'display' );
            }

        }

        function propagateAppointmentModification( type, parameters ) {
            Y.fire( 'appointmentModified', {
                type: type,
                parameters: new Y.Array( parameters )
            } );
        }

        function getLastEditor( data ) {
            return data.lastEditor ? i18n( 'CalendarMojit.calendar.text.LAST_EDITOR' ) + ' ' + data.lastEditor : '';
        }

        Y.namespace( 'doccirrus.modals' ).calendarApointment = calendarAppointmentModal;

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'promise'
        ]
    }
);
