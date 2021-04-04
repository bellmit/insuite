/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'MirrorActivityPatientInfoViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        UNKNOWN_INSURANCE = i18n( 'InCaseMojit.patient-modelJS._displayInsuranceTypes.UNKNOWN_INSURANCE' ),
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class MirrorActivityPatientInfoViewModel
     */
    function MirrorActivityPatientInfoViewModel() {
        MirrorActivityPatientInfoViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( MirrorActivityPatientInfoViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initMirrorActivityPatientInfoViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        initMirrorActivityPatientInfoViewModel: function() {
            var
                self = this;

            self.labelCommunicationI18n = i18n( 'InCaseMojit.casefile_browser.label.COMMUNICATION' );
            self.insuranceStatusI18n = i18n( 'InCaseMojit.casefile_browser.label.INSURANCE_STATUS' );
            self.preventionI18n = i18n( 'InCaseMojit.casefile_browser.label.PREVENTION' );
            self.markerI18n = i18n( 'InCaseMojit.casefile_browser.label.MARKER' );

            self.initHeader();
            self.initAttachedContentInfo();
            self.initProfilePicture();
            self.initCommunicationInfo();
            self.initInsuranceInfo();
            self.initCrmInfo();
            self.initMarkers();
            self.initNoShow();
            self.initAppointmentInfo();
            self.initTask();
            self.initComment();
        },
        panelTitle: null,
        hasBirthday: null,
        displayInsuranceTypes: null,
        hasPublicCard: null,
        getPublicCardColor: null,
        getPublicCardTitle: null,
        initHeader: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            self.panelTitle = ko.computed( function() {
                var
                    panelTitle = '',
                    kbvDob = unwrap( currentPatient.kbvDob ),
                    dateOfDeath = unwrap( currentPatient.dateOfDeath ),
                    age = unwrap( currentPatient.age ),
                    personData = {
                        title: unwrap( currentPatient.title ),
                        nameaffix: unwrap( currentPatient.nameaffix ),
                        fk3120: unwrap( currentPatient.fk3120 ),
                        lastname: unwrap( currentPatient.lastname ),
                        firstname: unwrap( currentPatient.firstname )
                    },
                    personDisplay = Y.doccirrus.schemas.person.personDisplay( personData ),
                    isDoquvide = Y.doccirrus.auth.isDOQUVIDE(),
                    patientPartners = {
                        partnerIds: (peek( currentPatient.partnerIds ) || []).map( function(el){
                            return el.initialConfig && el.initialConfig.data;
                        })
                    },
                    doquvideNo,
                    dqsNo;

                if( isDoquvide ){
                    doquvideNo = Y.doccirrus.schemas.patient.getGHDPartnerId( patientPartners, Y.doccirrus.schemas.casefolder.additionalTypes.DOQUVIDE) || '';
                    dqsNo = Y.doccirrus.schemas.patient.getGHDPartnerId( patientPartners, Y.doccirrus.schemas.casefolder.additionalTypes.DQS) || '';

                    return doquvideNo + ( doquvideNo && dqsNo ? ', ' : '') + dqsNo;
                } else {
                    panelTitle += personDisplay;
                    panelTitle += ', ';
                    panelTitle += kbvDob;
                    if( dateOfDeath ) {
                        panelTitle.push( ' - ' );
                        panelTitle.push( moment( dateOfDeath ).format( 'DD.MM.YYYY' ) );
                    }
                    panelTitle += ' (';
                    panelTitle += age;
                    panelTitle += ') ';

                    return panelTitle;
                }

            } ).extend( {rateLimit: 0} );

            self.hasBirthday = ko.computed( function() {
                var
                    dob = unwrap( currentPatient.dob );

                return moment( dob ).format( 'DD.MM' ) === moment().format( 'DD.MM' );
            } );

            self.displayInsuranceTypes = ko.computed( function() {
                var
                    insuranceStatus = unwrap( currentPatient.insuranceStatus );

                if( Y.doccirrus.auth.isDOQUVIDE() ){
                    return '';
                }
                if( !(Array.isArray( insuranceStatus ) && insuranceStatus.length) ) {
                    return i18n( 'InCaseMojit.patient-modelJS._displayInsuranceTypes.NOT_INSURED' );
                }
                return insuranceStatus.filter( function( insurance ) {
                    return !unwrap( insurance.doNotShowInsuranceInGadget );
                } ).map( function( entry ) {
                    var i18nType = Y.doccirrus.schemaloader.translateEnumValue( 'i18n', unwrap( entry.type ), Y.doccirrus.schemas.person.types.Insurance_E.list, i18n( 'InCaseMojit.patient-modelJS._displayInsuranceTypes.UNKNOWN_TYPE' ) );
                    if( unwrap( entry.unknownInsurance ) ) {
                        i18nType += ' <span class="text-danger">' + UNKNOWN_INSURANCE + '</span>';
                    }
                    return i18nType;
                } ).join( ', ' );
            } );

            self.hasPublicCard = ko.computed( function() {
                var insuranceStatus = unwrap( currentPatient.insuranceStatus ),
                    doNotShowPublicInsurance = insuranceStatus.some( function( insurance ) {
                        return unwrap( insurance.type ) === 'PUBLIC' && unwrap( insurance.doNotShowInsuranceInGadget );
                    } );

                // MOJ-14319: [OK] [CARDREAD]
                return unwrap( currentPatient.hasPublicInsurance ) && !doNotShowPublicInsurance;
            } );

            self.getPublicCardColor = ko.computed( function() {

                return unwrap( currentPatient.hasCardSwiped ) ? 'green' : 'red';
            } );

            self.getPublicCardTitle = ko.computed( function() {
                var
                    CARD_PULLED_THROUGH = i18n( 'InCaseMojit.casefile_browser.title_attribute.CARD_PULLED_THROUGH' ),
                    CARD_PULLED_THROUGH_NOT = i18n( 'InCaseMojit.casefile_browser.title_attribute.CARD_PULLED_THROUGH_NOT' );

                return unwrap( currentPatient.hasCardSwiped ) ? CARD_PULLED_THROUGH : CARD_PULLED_THROUGH_NOT;
            } );

        },
        attachedContentText: null,
        attachedContentColor: null,
        showAttachedContentHeader: null,
        showAttachedContentInfo: null,
        initAttachedContentInfo: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                severityMap = binder.getInitialData( 'severityMap' ),
                currentPatient = peek( binder.currentPatient );

            self.attachedContentText = ko.computed( function() {

                return unwrap( currentPatient.attachedContent );
            } );

            self.attachedContentColor = ko.computed( function() {
                var
                    severity = unwrap( currentPatient.attachedSeverity ),
                    color = '';
                if( severity && severityMap ) {
                    color = severityMap[ severity ] && severityMap[ severity ].color || color;
                }
                return color;
            } );

            self.showAttachedContentHeader = ko.computed( function() {
                var
                    attachedContent = unwrap( self.attachedContentText );

                return attachedContent && 100 > attachedContent.length;
            } );

            self.showAttachedContentInfo = ko.computed( function() {
                var
                    attachedContent = unwrap( self.attachedContentText );

                return attachedContent && 100 <= attachedContent.length;
            } );
        },
        detachActivity: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient );
            currentPatient.detachActivity();
        },
        mediaSetImgFromDefaultProfilePicture: null,
        initProfilePicture: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient ),
                imageSettings = {
                    ownerCollection: 'patient',
                    ownerId: currentPatient._id,
                    label: 'logo',
                    widthPx: 133,
                    heightPx: 170,

                    thumbWidth: 133,
                    thumbHeight: 170
                };

            self.mediaSetImgFromDefaultProfilePicture = imageSettings;
        },
        _linkToDetail: null,
        communicationLinks: null,
        initCommunicationInfo: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            /**
             * Computes a link to the patient details, if patient has an id else returns null
             * @property _linkToDetail
             * @type {ko.computed|null|String}
             */
            self._linkToDetail = ko.computed( function() {
                var
                    id = ko.unwrap( currentPatient._id );

                if( id ) {
                    return Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + id + '/tab/patient_detail';
                }
                else {
                    return null;
                }
            } );

            /**
             * Computes communications as links
             */
            self.communicationLinks = ko.computed( function() {
                var
                    communications = unwrap( currentPatient.communications );

                return communications.map( function( communication ) {
                    return Y.doccirrus.schemas.person.getCommunicationLinkedWithUriScheme( {
                        type: unwrap( communication.type ),
                        value: unwrap( communication.value )
                    } );
                } );
            } ).extend( {rateLimit: 0} );

        },
        _linkToInsurances: null,
        _firstInsuranceName: null,
        _firstInsuranceEmployeeName: null,
        _isPatientShortInfoInsuranceStatusVisible: null,
        _isPatientShortInfoFirstInsuranceNameVisible: null,
        _isPatientShortInfoFirstInsuranceEmployeeNameVisible: null,
        initInsuranceInfo: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            /**
             * Computes a link to the patient insurances, if patient has an id else returns null
             * @property _linkToInsurances
             * @type {ko.computed|null|String}
             */
            self._linkToInsurances = ko.computed( function() {
                var
                    id = ko.unwrap( currentPatient._id );

                if( id ) {
                    return Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + id + '/section/insurance';
                }
                else {
                    return null;
                }
            } );

            /**
             * Computes the name of the first insurance if available
             * @method _firstInsuranceName
             * @returns {String}
             */
            self._firstInsuranceName = ko.computed( function() {
                var
                    insuranceStatus = ko.unwrap( currentPatient.insuranceStatus );

                if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                    return ko.unwrap( insuranceStatus[0].insuranceName ) || '';
                }
                else {
                    return '';
                }

            } );

            /**
             * Computes the name of the first insurance employee if available
             * @method _firstInsuranceEmployeeName
             * @returns {String}
             */
            self._firstInsuranceEmployeeName = Y.doccirrus.KoViewModel.utils.createAsync( {
                cache: {},
                initialValue: '',
                jsonrpc: {
                    fn: Y.doccirrus.jsonrpc.api.employee.read,
                    params: self.addDisposable( ko.computed( function() {
                        var
                            insuranceStatus = ko.unwrap( currentPatient.insuranceStatus ),
                            employeeId;

                        if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                            employeeId = ko.unwrap( insuranceStatus[0].employeeId );
                            if( employeeId ) {
                                return {query: {_id: employeeId, type: 'PHYSICIAN'}};
                            }
                        }

                        return null;

                    } ) )
                },
                converter: function( response ) {
                    var
                        employee = response.data && response.data[0] || null;

                    if( employee ) {
                        return Y.doccirrus.schemas.person.personDisplay( employee );
                    }

                    return '';
                }
            } );

            /**
             * Computes visibility of insurance status section in patient short info
             * @method _isPatientShortInfoInsuranceStatusVisible
             * @returns {Boolean}
             */
            self._isPatientShortInfoInsuranceStatusVisible = ko.computed( function() {
                var
                    _hasInsurance = ko.unwrap( currentPatient._hasInsurance ),
                    _firstInsuranceName = ko.unwrap( self._firstInsuranceName ),
                    _firstInsuranceEmployeeName = ko.unwrap( self._firstInsuranceEmployeeName );

                return _hasInsurance && ( Boolean( _firstInsuranceName ) || Boolean( _firstInsuranceEmployeeName ) );
            } );

            /**
             * Computes visibility of the first insurance name
             * @method _isPatientShortInfoFirstInsuranceNameVisible
             * @returns {Boolean}
             */
            self._isPatientShortInfoFirstInsuranceNameVisible = ko.computed( function() {
                var
                    _firstInsuranceName = ko.unwrap( self._firstInsuranceName );

                return Boolean( _firstInsuranceName );
            } );

            /**
             * Computes visibility of the first insurance employee name
             * @method _isPatientShortInfoFirstInsuranceEmployeeNameVisible
             * @returns {Boolean}
             */
            self._isPatientShortInfoFirstInsuranceEmployeeNameVisible = ko.computed( function() {
                var
                    _firstInsuranceEmployeeName = ko.unwrap( self._firstInsuranceEmployeeName );

                return Boolean( _firstInsuranceEmployeeName );
            } );

        },
        crmInfo: null,
        crmInfoVisible: null,
        _displayCrmReminder: null,
        _displayCrmAppointment: null,
        initCrmInfo: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                REMINDER_SHORT = i18n( 'InCaseMojit.crm_item.label.REMINDER_SHORT' ),
                ESTIMATED_APPOINTMENT_SHORT = i18n( 'InCaseMojit.crm_item.label.ESTIMATED_APPOINTMENT_SHORT' );

            self.crmInfo = ko.computed( function() {
                var
                    crmTreatments = unwrap( currentPatient.crmTreatments );

                return crmTreatments.map( function( crmTreatment ) {
                    var
                        title = unwrap( crmTreatment.title ) || '',
                        probability = unwrap( crmTreatment.probability ) || '';

                    return ['- ', title, ' ', probability, '%'].join( '' );
                } );
            } ).extend( {rateLimit: 0} );

            self.crmInfoVisible = ko.computed( function() {
                return Boolean( unwrap( self.crmInfo ).length > 0 );
            } );

            self._displayCrmReminder = ko.computed( function() {
                var crmReminder = unwrap( currentPatient.crmReminder );
                if( crmReminder ) {
                    return REMINDER_SHORT + ': ' + moment( crmReminder ).format( 'DD.MM.YYYY' );
                } else {
                    return '';
                }
            } );

            self._displayCrmAppointment = ko.computed( function() {
                var crmAppointmentMonth = currentPatient.crmAppointmentMonth(),
                    crmAppointmentQuarter = currentPatient.crmAppointmentQuarter(),
                    crmAppointmentYear = currentPatient.crmAppointmentYear(),
                    text = '';

                if( crmAppointmentMonth && crmAppointmentYear ) {
                    text = crmAppointmentMonth + '.' + crmAppointmentYear;
                }
                if( crmAppointmentQuarter && crmAppointmentYear ) {
                    text = 'Q ' + crmAppointmentQuarter + ' ' + crmAppointmentYear;
                }
                return text.length ? ESTIMATED_APPOINTMENT_SHORT + ': ' + text : text;
            } );

        },
        initMarkers: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                severityMap = binder.getInitialData( 'severityMap' );

            self.markers = ko.computed( function() {
                var
                    markers = unwrap( currentPatient.markers );

                return markers.map( function( marker ) {

                    return Y.merge( marker, {
                        color: severityMap[marker.severity] && severityMap[marker.severity].color,
                        icon: ( ( marker && marker.icon) ? 'glyphicon glyphicon-' + marker.icon : undefined )
                    } );
                } );
            } );

        },
        pickMarkers: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            Y.doccirrus.utils
                .selectMarkers( {
                    checkedMarkers: currentPatient.markers
                } )
                .on( {
                    select: function( facade, select ) {

                        if( select.addedIds.length > 0 ) {
                            Y.doccirrus.jsonrpc.api.patient.addMarkers( {
                                patient: peek( currentPatient._id ),
                                marker: select.addedIds
                            } );
                        }
                        if( select.removedIds.length > 0 ) {
                            Y.doccirrus.jsonrpc.api.patient.removeMarkers( {
                                patient: peek( currentPatient._id ),
                                marker: select.removedIds
                            } );
                        }

                        currentPatient.markers( select.data );
                    }
                } );

        },
        noShowCount: null,
        initNoShow: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            self.noShowCount = ko.computed( function() {
                var
                    noShowCount = unwrap( currentPatient.noShowCount );

                if( noShowCount ) {
                    return '(' + noShowCount + ')';
                }

                return '';
            } );
        },
        appointmentInfoVisible: null,
        _nextEvent: null,
        initAppointmentInfo: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            self.appointmentInfoVisible = true;

            self._nextEvent = ko.observable();

            self.nextEventText = ko.computed( function() {
                var
                    appointment = self._nextEvent();

                if( appointment ) {
                    return moment( appointment.start ).format( i18n( 'general.TIMESTAMP_FORMAT' ) );
                }
                return '';
            } );
            self.nextEventTitle = ko.computed( function() {
                var
                    appointment = self._nextEvent();

                if( appointment ) {
                    return moment( appointment.start ).fromNow();
                }
                return '';
            } );

            Y.doccirrus.jsonrpc.api.patient.getAppointments( {
                patientId: peek( currentPatient._id ),
                limit: 1
            } ).done( function( response ) {
                if( response && response.data && response.data[0] ) {
                    self._nextEvent( response.data[0] );
                }
            } );
        },
        /**
         * forward user to calendar and trigger "createEvent" action from localStorage
         * @method _doCreateEvent
         */
        _doCreateEvent: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                loadEvent = {
                    action: 'createEvent',
                    patientId: peek( currentPatient._id )
                };

            Y.doccirrus.utils.sessionValueSet( 'loadEvent', loadEvent );
            window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );

        },
        /**
         * forward user in a new tab to calendar and trigger "updateEvent" action from localStorage
         * @method _doUpdateEvent
         */
        _doUpdateEvent: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                _nextEvent = self._nextEvent(),
                loadEvent;

            if( !_nextEvent ) {
                return;
            }

            // on a next date set calendar to that
            loadEvent = {
                action: 'updateEvent',
                gotoDate: _nextEvent.start,
                patientId: peek( currentPatient._id ),
                eventId: _nextEvent._id,
                start: _nextEvent.start,
                scheduleId: _nextEvent.scheduleId
            };

            Y.doccirrus.utils.sessionValueSet( 'loadEvent', loadEvent );
            window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );

        },
        _hotTask: null,
        _hotTaskTitle: null,
        _hotTaskAnimation: null,
        initTask: function() {
            var
                self = this;

            self._hotTask = ko.observable();
            self._hotTaskAnimation = ko.observable( false );

            self._hotTaskTitle = ko.observable();

            self._updateHotTask();
        },
        _updateHotTask: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            Y.doccirrus.jsonrpc.api.task.getPatientHotTask( {
                    query: {
                        patientId: peek( currentPatient._id )
                    }
                } )
                .done( function( response ) {
                    var
                        data = response.data && response.data[0];
                    if( data ) {
                        if( data.alertTime ) {
                            if( moment().isAfter( moment( data.alertTime ) ) ) {
                                self._hotTaskAnimation( true );
                            } else {
                                self._hotTaskAnimation( false );
                            }
                            self._hotTask( moment( data.alertTime ).format( i18n( 'general.TIMESTAMP_FORMAT' ) ) );
                            self._hotTaskTitle( moment( data.alertTime ).fromNow() );

                        } else {
                            self._hotTaskAnimation( false );
                            self._hotTask( i18n( 'CalendarMojit.task_api.title.TASK' ) );
                            self._hotTaskTitle( i18n( 'CalendarMojit.task_api.title.TASK' ) );
                        }

                        self._hotTask.data = data;
                    } else {
                        self._hotTaskAnimation( false );
                        self._hotTask( null );
                        self._hotTaskTitle( null );
                    }
                } );
        },
        _createTask: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            Y.doccirrus.modals.taskModal.showDialog( {
                patientId: peek( currentPatient._id ),
                patientName: Y.doccirrus.schemas.person.personDisplay( {
                    firstname: peek( currentPatient.firstname ),
                    lastname: peek( currentPatient.lastname ),
                    title: peek( currentPatient.title )
                } )
            }, function() {
                self._updateHotTask();
            } );
        },
        _showHotTask: function() {
            var
                self = this,
                data = self._hotTask.data;

            Y.doccirrus.modals.taskModal.showDialog( data, function() {
                self._updateHotTask();
            } );
        },
        _comment: null,
        initComment: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            self._comment = ko.computed( {
                read: function() {
                    return currentPatient.comment();
                },
                write: function( value ) {
                    if( !currentPatient.isNew() ) {
                        Y.doccirrus.jsonrpc.api.patient
                            .update( {
                                query: {_id: peek( currentPatient._id )},
                                data: {comment: value},
                                field: ['comment']
                            } )
                            .done( function() {
                                currentPatient.set( 'data.comment', value );
                                currentPatient.setNotModified();
                            } );
                    }
                }
            } );
        }
    }, {
        NAME: 'MirrorActivityPatientInfoViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' )  || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( MirrorActivityPatientInfoViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'dcutils',
        'dcauth',
        'person-schema',
        'DCTaskModal'
    ]
} );
