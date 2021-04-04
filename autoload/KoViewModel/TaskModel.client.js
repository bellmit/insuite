/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'TaskModel', function( Y/*, NAME */ ) {
        /**
         * @module TaskModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            PATIENT_LINK_TITLE = i18n( 'TaskModel.title.PATIENT_LINK_TITLE' ),
            EMAIL_SHORT = i18n( 'general.title.EMAIL_SHORT' ),
            ADDRESS = i18n( 'general.title.ADDRESS' ),
            PHONE = i18n( 'general.title.PHONE' ),
            FAX = i18n( 'general.title.FAX' ),
            ACTIVITY_LINK_TITLE = i18n( 'TaskModel.title.ACTIVITY_LINK_TITLE' ),
            PRINT_ACT_TYPE = i18n( 'TaskModel.text.PRINT_ACT_TYPE' ),
            TRANSCRIBE_ACT_TYPE = i18n( 'TaskModel.text.TRANSCRIBE_ACT_TYPE' ),
            CHECK_ACT_TYPE = i18n( 'TaskModel.text.CHECK_ACT_TYPE' ),
            DOCUMENT = i18n( 'task-schema.Task_T.mediaId.i18n' );

        /**
         * @class TaskModel
         * @constructor
         * @extends KoViewModel
         */
        function TaskModel( config ) {
            TaskModel.superclass.constructor.call( this, config );
        }

        TaskModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };
        Y.extend( TaskModel, KoViewModel.getBase(), {
                initializer: function TaskModel_initializer( config ) {
                    var self = this;
                    self.initTask( config && config.data );
                },
                selectedActivities: null,
                tasksCount: null,

                getTransferEntryId(){
                    var
                        self = this,
                        type = ko.unwrap( self.type );

                    if( Y.doccirrus.schemas.task.systemTaskTypes.CANCELED_TRANSFER === type ) {
                        return '/transferLog#/sent/' + ko.unwrap( self.transferEntryId );
                    } else {
                        return '/transferLog#/received/' + ko.unwrap( self.transferEntryId );
                    }

                },
                getConferenceLink() {
                    var
                        self = this,
                        isForUnregistered = (self.get( 'data' ) && self.get( 'data' ).conferenceObj || {}).isForUnregistered,
                        user = Y.doccirrus.auth.getUser(),
                        link = Y.doccirrus.infras.getPublicURL( '/intouch/conference/' ) + ko.unwrap( self.conferenceId ) + '?identityId=' + user.identityId;

                    if( isForUnregistered ) {
                        link += '&name=' + encodeURIComponent( user.name ) + '&light=' + isForUnregistered;
                    }

                    return link;
                },
                destructor: function TaskModel_destructor() {
                },
                /**
                 * Saves or updates current task
                 * @method save
                 */
                save: function() {
                    var
                        self = this,
                        taskId = ko.utils.peekObservable( self._id ),
                        data = self.toJSON(),
                        promise;

                    if( taskId ) {
                        promise = Y.doccirrus.jsonrpc.api.task.update( {
                            query: {
                                _id: taskId
                            },
                            data: data,
                            fields: Object.keys( data )
                        } );
                    } else {
                        promise = Y.doccirrus.jsonrpc.api.task.create( {
                            data: data
                        } );
                    }
                    return promise;
                },
                /**
                 * initializes task model
                 * @method initTask
                 * @param {Object} data
                 */
                initTask: function TaskModel_initTask( data ) {
                    var
                        self = this,
                        defaultMinutes = 0,
                        defaultHours = 0,
                        defaultTaskTypeObj,
                        initialTaskTypeObj;
                    self.locationList = ko.observableArray();
                    self.selectedActivities = ko.observableArray( data.selectedActivities );

                    if( data.selectedActivities && data.selectedActivities.length ) {

                        self.activities( data.selectedActivities.map( function( activity ) {
                            return {
                                _id: activity._id,
                                actType: activity.actType
                            };
                        } ) );
                    }

                    self.tasksCount = ko.observable( "SINGLE" );

                    self.alertTimeDatetimepickerOptions = {
                        format: ko.observable( TIMESTAMP_FORMAT_LONG ),
                        sideBySide: true,
                        widgetPositioning: {
                            horizontal: 'left',
                            vertical: 'top'
                        }
                    };

                    self.isPatientSelectAllowed = !Y.doccirrus.auth.isISD();

                    Y.doccirrus.jsonrpc.api.practice.getIntimeConfig()
                        .done( function( response ) {
                            var data = response.data || {},
                                defaultStartTime;
                            defaultStartTime = (data.calendarViewDayStart || '').split( ':' );
                            defaultHours = defaultStartTime[0];
                            defaultMinutes = defaultStartTime[1];
                        } );

                    self.addDisposable( ko.computed( function() {
                        var
                            allDay = self.allDay(),
                            alertTime = ko.utils.peekObservable( self.alertTime );

                        if( allDay ) {
                            self.alertTimeDatetimepickerOptions.format( TIMESTAMP_FORMAT );
                        }
                        else {
                            self.alertTimeDatetimepickerOptions.format( TIMESTAMP_FORMAT_LONG );
                        }
                        var isNotInPast;
                        if( alertTime ) {
                            if( allDay ) {
                                self.alertTime(
                                    moment( alertTime )
                                        .second( 0 )
                                        .millisecond( 0 )
                                        .hour( 0 )
                                        .minute( 0 )
                                        .toISOString()
                                );
                            } else if( !ko.computedContext.isInitial() ) {
                                isNotInPast = Number( moment().diff( moment( alertTime ), 'days' ) ) <= 0;
                                self.alertTime(
                                    moment( isNotInPast ? alertTime : new Date() )
                                        .second( 0 )
                                        .millisecond( 0 )
                                        .hour( defaultHours || moment().hour() )
                                        .minute( defaultMinutes || moment().minute() )
                                        .toISOString()
                                );
                            }

                        }

                    } ) );

                    if( !self.alertTime() ) {
                        if( self.allDay() ) {
                            self.alertTime( moment()
                                .toISOString() );
                        } else {
                            self.alertTime( moment().toISOString() );
                        }
                    }

                    self.employee = ko.observable( (data.employeeId && {
                            id: data.employeeId,
                            text: data.employeeName
                        }) || data.employeeId );
                    self.addDisposable( ko.computed( function() {
                        var
                            employee = self.employee();
                        self.employeeId( employee && employee.id );
                        self.employeeName( employee && employee.text );
                    } ) );
                    self.candidatesObj = ko.observableArray( self.get( 'data.candidatesObj' ) || [] );
                    self.addDisposable( ko.computed( function() {
                        var
                            candidatesObj = self.candidatesObj();
                        self.candidates( candidatesObj.map( function( candidate ) {
                            return candidate._id;
                        } ) );
                    } ) );

                    self.patient = ko.observable( data.patientId && {
                            id: data.patientId,
                            text: data.patientName,
                            patientPartnerId: data.patientPartnerId
                        } );

                    defaultTaskTypeObj = self.getDefaultTaskForType( ko.unwrap( self.type ) );
                    initialTaskTypeObj = ( ( data.taskTypeObj && self.select2TaskTypeMapper( data.taskTypeObj ) ) || defaultTaskTypeObj );

                    self.taskTypeObj = ko.observable( initialTaskTypeObj );

                    self.addDisposable( ko.computed( function() {
                        var
                            taskTypeObj = self.taskTypeObj(),
                            isInitial = ko.computedContext.isInitial();

                        if( !isInitial || !self._id() ) {
                            self.title( taskTypeObj.title || '' );
                            self.details( taskTypeObj.details || '' );
                            self.allDay( taskTypeObj.allDay || false );
                            self.urgency( taskTypeObj.urgency || '' );
                            self.candidates( taskTypeObj.candidates || [] );
                            self.candidatesObj( taskTypeObj.candidatesObj || [] );
                            self.candidatesNames( taskTypeObj.candidatesNames || [] );
                            self.roles( taskTypeObj.roles || [] );
                            self.employeeId( taskTypeObj.employeeId || '' );
                            self.employeeName( taskTypeObj.employeeName || '' );
                            self.employee( taskTypeObj.employeeId && {
                                    id: taskTypeObj.employeeId,
                                    text: taskTypeObj.employeeName
                                } );
                            if( taskTypeObj.days || taskTypeObj.hours || taskTypeObj.minutes ) {
                                self.allDay( false );
                                self.alertTime( moment().add( {
                                    days: taskTypeObj.days || 0,
                                    hours: taskTypeObj.hours || 0,
                                    minutes: taskTypeObj.minutes || 0
                                } ).toISOString() );
                            }
                        }
                    } ) );

                    self.patientLink = ko.computed( function() {
                        var
                            patient = self.patient();

                        if( patient && patient.id ) {
                            return Y.Lang.sub( '<a href="{href}" class="patient-linkToCase" title="{title}" target="_blank">{text}</a>', {
                                title: PATIENT_LINK_TITLE,
                                text: patient.patientPartnerId || patient.text,
                                href: Y.doccirrus.utils.getUrl( Y.doccirrus.auth.isISD() ? 'mirror_patients' : 'inCaseMojit' ) + '#/patient/' + patient.id + '/tab/casefile_browser'
                            } );
                        } else {
                            return '';
                        }
                    } );

                    self.scheduleLink = ko.computed( function() {
                        var
                            schedule = self.linkedSchedule();

                        if( schedule && schedule._id ) {
                            return Y.Lang.sub( `<a title="${schedule.title}">{schedule}</a>`, {
                                schedule: moment( schedule.start ).format( 'DD.MM.YYYY HH:mm' )
                            } );
                        } else {
                            return '';
                        }
                    } );

                    self.documentLink = ko.computed( function() {
                        var
                            media = self.mediaId(),
                            mime = Y.doccirrus.media.types.getMime( media && media.contentType || 'application/binary' ),
                            ext = Y.doccirrus.media.types.getExt( media && media.contentType || 'application/binary' ),
                            relUrl = '/media/' + ( media && media.mediaId ) + '_original.' + mime + '.' + ext;

                        if( media && media.mediaId ) {
                            return '<a href="'+ relUrl +'", target="_blank">'+ DOCUMENT +'</a>';
                        } else {
                            return '';
                        }
                    } );

                    self.setActivityLink();
                    self.setAddressLink();
                    self.initSelect2Employee();
                    self.initSelect2Patient();
                    self.initSelect2Role();
                    self.initSelect2TaskType();
                },

                /**
                 *  Make taskType for select2 from default values in tasktype schema
                 */

                copyDefaultTask: function( taskTemplate ) {
                    return {
                        id: taskTemplate._id,
                        text: taskTemplate.name,
                        type: taskTemplate.type
                    };
                },

                /**
                 *  Initialize new tasks with correct taskType from template on schema
                 *  @param type
                 *  @return {*|{id, text, type}}
                 */

                getDefaultTaskForType: function( type ) {
                    var self = this;
                    switch( type ) {
                        case 'PRINT':       return self.copyDefaultTask( Y.doccirrus.schemas.tasktype.templatePrint );
                        case 'TRANSCRIBE':  return self.copyDefaultTask( Y.doccirrus.schemas.tasktype.templateTranscribe );
                    }
                    return self.copyDefaultTask( Y.doccirrus.schemas.tasktype.templateDefault );
                },

                /**
                 * Only if dispatchRequestId is present.
                 * @method showDiffDialog
                 */
                showDiffDialog: function() {
                    var
                        self = this,
                        dispatchRequestId = ko.utils.peekObservable( self.dispatchRequestId );

                    Y.doccirrus.modals.dispatchRequestChanges.show( { dispatchRequestId: dispatchRequestId } );
                },

                isShowPatientGenerateIdDialog: function() {
                    return Y.doccirrus.auth.isISD() && !Y.doccirrus.auth.isDOQUVIDE() && ( this.type() === 'NEW_PATIENT' );
                },

                onScheduleLinkClick: function() {
                    var
                        self = this,
                        updateEvent,
                        schedule = self.linkedSchedule();
                    if( schedule && schedule.start ) {
                        updateEvent = {
                            action: 'updateEvent',
                            eventId: schedule._id
                        };

                        Y.doccirrus.utils.sessionValueSet( 'loadEvent', updateEvent );
                        window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );
                    }
                    return;
                },

                /**
                 *  Show ID generation dialog only on ISD for task with new patient
                 *  @method openPatientGenerateIdDialog
                 */
                showPatientGenerateIdDialog: function( model, event ) {

                    event.preventDefault();

                    var
                        self = this,
                        patient = ko.unwrap( self.patient );

                    Y.doccirrus.modals.generateIdMirrorPatient.show( { patientId: patient.id } );
                },

                /**
                 * Sets activity link
                 * @method setActivityLink
                 */
                setActivityLink: function() {
                    var
                        self = this,
                        activities = ko.utils.peekObservable( self.activities ),
                        links = ko.utils.peekObservable( self.links ),
                        activityId = ko.utils.peekObservable( self.activityId ),
                        activityType = ko.utils.peekObservable( self.activityType ),
                        title = ko.utils.peekObservable( self.title ),
                        type = ko.utils.peekObservable( self.type ),
                        activityTypes = [],
                        link = '',
                        processedLinks;

                    if( activityId ) {
                        activityType = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', activityType, 'i18n', '' );

                        link = Y.Lang.sub( '<a href="{href}" class="activity-linkToCase" title="{title}" target="_blank">{text}</a>', {
                            title: ACTIVITY_LINK_TITLE,
                            text: activityType,
                            href: Y.doccirrus.utils.getUrl( Y.doccirrus.auth.isISD() ? 'mirror_patients' : 'inCaseMojit' ) + '#/activity/' + activityId
                        } );

                        if( !title ) {
                            switch( type ) {
                                case 'TRANSCRIBE':  self.title( TRANSCRIBE_ACT_TYPE );  break;
                                default:
                                    self.title( Y.Lang.sub( PRINT_ACT_TYPE, {
                                        actType: activityType
                                    } ) );
                            }
                        }
                    }
                    if( activities && activities.length ) {
                        activities.forEach( function( activity ) {
                            var
                                actType = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', peek( activity.actType ), 'i18n', '' ),
                                activity_id = peek( activity._id );
                            activity_id = activity_id && activity_id.toString();

                            activityTypes.push( actType );

                            if( activity_id && activityId !== activity_id ) {
                                link += Y.Lang.sub( '<a href="{href}" class="activity-linkToCase" title="{title}" target="_blank">{text}</a>', {
                                        title: ACTIVITY_LINK_TITLE,
                                        text: actType,
                                        href: Y.doccirrus.utils.getUrl( Y.doccirrus.auth.isISD() ? 'mirror_patients' : 'inCaseMojit' ) + '#/activity/' + activity_id
                                    } ) + '<br/>';
                            }
                        } );

                        if( !title ) {
                            self.title( Y.Lang.sub( CHECK_ACT_TYPE, {
                                actTypes: activityTypes.join( ', ' )
                            } ) );
                        }
                    }
                    if( links && links.length ) {
                        processedLinks = {};
                        links.forEach( function( linkToShow ) {
                            var url = ko.utils.peekObservable( linkToShow.url ),
                                text = ko.utils.peekObservable( linkToShow.text ) || 'link';
                            if(!url || processedLinks[url] ){
                                return;
                            }
                            processedLinks[url] = 1;

                            link += '<a href="' + url + '" class="activity-linkToCase" target="_blank">' + text + '</a><br/>';
                        } );
                    }
                    self.activityLink = ko.observable( link );

                },

                setAddressLink: function() {
                    var
                        self = this,
                        location = ko.utils.peekObservable( self.location ),
                        link = '',
                        loc,
                        address;
                    if( location && location.length ) {
                        loc = location[0];
                        address = [];
                        address.push( EMAIL_SHORT + ': ' + loc.email() );
                        address.push( PHONE + ': ' + loc.phone() );
                        address.push( FAX + ': ' + loc.fax() );
                        address.push( '' );
                        address.push( ADDRESS + ':' );
                        address.push( loc.street() + ' ' + loc.houseno() );
                        address.push( loc.zip() + ' ' + loc.city() );
                        link = Y.Lang.sub( '<a href="#" data-toggle="popover" data-placement="bottom" data-html="true" data-content="{address}"">Adresse Arzt</a>', {
                            address: address.join( '<br/>' )
                        } );
                    }

                    self.addressLink = ko.observable( link );

                },
                /**
                 * Coverts employee object to selec2 object
                 * @method personToSelect2Object
                 * @param {String} text
                 * @returns {Object}
                 */
                personToSelect2Object: function( person ) {
                    if( !person ) {
                        return person;
                    }
                    return {
                        id: person._id,
                        text: Y.doccirrus.schemas.person.personDisplay( person ),
                        data: {
                            kbvDob: person.kbvDob,
                            dob: person.dob
                        }
                    };
                },
                /**
                 * Initializes select2 for employee
                 * @method initSelect2Employee
                 */
                initSelect2Employee: function() {
                    var self = this,
                        binder = Y.mojito.binders.TaskMojitBinder,
                        locationPromise;

                    self.select2Employee = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    employee = ko.unwrap( self.employee );
                                return employee;
                            },
                            write: function( $event ) {
                                self.employee( $event.added );
                            }
                        } ) ),
                        placeholder: ko.observable( "\u00A0" ),
                        select2: {
                            allowClear: true,
                            width: '100%',
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.employee.getEmployeeByName( {
                                    query: {
                                        term: query.term
                                    }
                                } ).done( function( response ) {
                                        var
                                            data = response.data;
                                        query.callback( {
                                            results: data.map( function( employee ) {
                                                return self.personToSelect2Object( employee );
                                            } )
                                        } );
                                    }
                                ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            }
                        }
                    };
                    self.select2Candidates = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    candidatesObj = ko.unwrap( self.candidatesObj );
                                return candidatesObj.map( function( candidate ) {
                                    return self.personToSelect2Object( candidate );
                                } );
                            },
                            write: function( $event ) {
                                if( Y.Object.owns( $event, 'added' ) ) {
                                    self.candidatesObj.push( $event.added.data );
                                }
                                if( Y.Object.owns( $event, 'removed' ) ) {
                                    self.candidatesObj.remove( function( candidate ) {
                                        return candidate._id === $event.removed.id;
                                    } );
                                }
                            }
                        } ) ),
                        select2: {
                            multiple: true,
                            width: '100%',
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.employee.getEmployeeByName( {
                                    query: {
                                        term: query.term
                                    }
                                } ).done( function( response ) {
                                        var
                                            data = response.data;
                                        query.callback( {
                                            results: data.filter( function( employee ) {
                                                return employee.status === 'ACTIVE';
                                            } ).map( function( employee ) {
                                                return {
                                                    id: employee._id,
                                                    text: Y.doccirrus.schemas.person.personDisplay( employee ),
                                                    data: employee
                                                };
                                            } )
                                        } );
                                    }
                                ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            }
                        }
                    };
                    if (binder) {
                        locationPromise = binder.location();
                    } else {
                        locationPromise = Promise.resolve( Y.doccirrus.jsonrpc.api.location
                            .read()
                            .then( function( response ) {
                                return Y.Lang.isArray( response.data ) && response.data || [];
                            } ) );
                    }
                    locationPromise
                        .then( function( locations ) {
                            var currentUserEmployeeId = Y.doccirrus.auth.getUserEmployeeId();
                            self.locationList( locations );
                            if( self.isNew() ) {
                                self.locations( locations.filter( function( entry ) {
                                    return entry.employees.some( function( employee ) {
                                        return employee._id === currentUserEmployeeId;
                                    } );
                                } ).map( function( entry ) {
                                    return {_id: entry._id, locname: entry.locname};
                                } ) );
                            }
                            self.select2Locations.select2.data = locations.map( function( entry ) {
                                return {id: entry._id, text: entry.locname};
                            } );
                        } );

                    self.select2Locations = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    value = self.locations();

                                return value.map( function( location ) {

                                    return {
                                        id: peek( location._id ),
                                        text: peek( location.locname )
                                    };
                                } );

                            },
                            write: function( $event ) {
                                var
                                    value = $event.val;

                                self.locations( Y.Array.filter( peek( self.locationList ), function( location ) {
                                    return value.indexOf( peek( location._id ) ) > -1;
                                } ) );

                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            multiple: true,
                            data: []
                        }
                    };

                },
                /**
                 * Initializes select2 for patient
                 * @method initSelect2Patient
                 */
                initSelect2Patient: function() {
                    var
                        self = this;

                    self.select2Patient = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    patient = ko.unwrap( self.patient );
                                return patient;
                            },
                            write: function( $event ) {
                                self.patient( $event.added );
                                self.patientId( $event.val );
                                self.patientName( $event.added && $event.added.text );
                            }
                        } ) ),
                        placeholder: ko.observable( "\u00A0" ),
                        select2: {
                            allowClear: true,
                            width: '100%',
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.patient.getPatients( {
                                    query: {
                                        isStub: {$ne: true},
                                        term: Y.doccirrus.commonutils.$regexLikeUmlaut( query.term, {
                                            onlyRegExp: true,
                                            noRegexEscape: true
                                        } )
                                    }
                                } ).done( function( response ) {
                                        var
                                            data = response.data;
                                        query.callback( {
                                            results: data.map( function( patient ) {
                                                return self.personToSelect2Object( patient );
                                            } )
                                        } );
                                    }
                                ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            },
                            formatResult: function( obj ) {
                                var
                                    person = obj.data,
                                    dob = (person.dob && ' [' + person.kbvDob + ']') || '';
                                return obj.text + dob;
                            }

                        }
                    };

                },
                /**
                 * Initializes select2 for role
                 * @method initSelect2Role
                 */
                initSelect2Role: function() {
                    var
                        self = this;

                    self.select2Role = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    roles = ko.unwrap( self.roles );
                                roles = roles.map( function( roleValue ) {
                                    return { id: roleValue, text: roleValue };
                                } );
                                return roles;
                            },
                            write: function( $event ) {
                                if( Y.Object.owns( $event, 'added' ) ) {
                                    self.roles.push( $event.added.text );
                                }
                                if( Y.Object.owns( $event, 'removed' ) ) {
                                    self.roles.remove( $event.removed.text );
                                }
                            }
                        } ) ),
                        select2: {
                            multiple: true,
                            width: '100%',
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.role.get( {
                                    query: {
                                        value: { $regex: query.term, $options: 'i' }
                                    }
                                } ).done( function( response ) {
                                        var
                                            data = response.data;
                                        query.callback( {
                                            results: data.map( function( role ) {
                                                if( !role ) {
                                                    return role;
                                                }
                                                return {
                                                    id: role.value,
                                                    text: role.value
                                                };
                                            } )
                                        } );
                                    }
                                ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            },
                            formatResult: function( obj ) {
                                return obj.text;
                            }

                        }
                    };

                },
                select2TaskTypeMapper: function( tasktype ) {
                    return {
                        id: tasktype._id,
                        text: tasktype.name,
                        type: tasktype.type,
                        title: tasktype.title,
                        allDay: tasktype.allDay,
                        urgency: tasktype.urgency,
                        days: tasktype.days,
                        minutes: tasktype.minutes,
                        hours: tasktype.hours,
                        employeeId: tasktype.employeeId,
                        employeeName: tasktype.employeeName,
                        details: tasktype.details,
                        roles: tasktype.roles,
                        candidates: tasktype.candidates,
                        candidatesNames: tasktype.candidatesNames,
                        candidatesObj: tasktype.candidatesObj
                    };
                },
                initSelect2TaskType: function() {
                    var
                        self = this;

                    self.select2TaskType = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    taskTypeObj = ko.unwrap( self.taskTypeObj );
                                return taskTypeObj;
                            },
                            write: function( $event ) {
                                self.taskTypeObj( $event.added );
                                self.taskType( $event.val );
                                if( $event.added && $event.added.type && Y.doccirrus.schemas.tasktype.taskTypes.DEFAULT === $event.added.type ) {
                                    self.type( '' );
                                } else {
                                    self.type( $event.added && $event.added.type );
                                }
                            }
                        } ) ),
                        select2: {
                            width: '100%',
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.tasktype.getForTypeTable( {
                                    query: {
                                        name: {
                                            $regex: query.term,
                                            $options: 'i'
                                        },
                                        _id: { $ne: "000000000000000000000001" }
                                    },
                                    options: {
                                        itemsPerPage: 15
                                    },
                                    fields: [ 'name' ]
                                } ).done( function( response ) {
                                        var
                                            data = response && response.data || [];
                                        query.callback( {
                                            results: data.map( function( tasktype ) {
                                                return self.select2TaskTypeMapper( tasktype );
                                            } )
                                        } );
                                    }
                                ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            },
                            formatResult: function( obj ) {
                                return obj.text;
                            }
                        }
                    };
                },
                /**
                 * Removes current task
                 * @method remove
                 */
                remove: function() {
                    var
                        self = this,
                        promise;
                    promise = Y.doccirrus.jsonrpc.api.task.delete( { query: { _id: self._id() } } );
                    return promise;
                }
            },
            {
                schemaName: 'task',
                NAME: 'TaskModel'
            }
        )
        ;
        KoViewModel.registerConstructor( TaskModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'task-schema',
            'person-schema',
            'tasktype-schema',
            'dcrequestchangesmodal',
            'dcgenerateidmirrorpatient'
        ]
    }
)
;
