/*
 @author: mp
 @date: 2013/11/10
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment*/
//TRANSLATION INCOMPLETE!! MOJ-3201
'use strict';

YUI.add( 'dcpatientmodel', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n,
            REMINDER_SHORT = i18n( 'InCaseMojit.crm_item.label.REMINDER_SHORT' ),
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            ESTIMATED_APPOINTMENT_SHORT = i18n( 'InCaseMojit.crm_item.label.ESTIMATED_APPOINTMENT_SHORT' ),
            CREATED_APPOINTMENT = i18n( 'InCaseMojit.patient-modelJS.messages.CREATED_APPOINTMENT' ),
            DELETED_APPOINTMENT = i18n( 'InCaseMojit.patient-modelJS.messages.DELETED_APPOINTMENT' ),
            PATIENT_NOT_SAVED = i18n( 'InCaseMojit.patient-modelJS.messages.PATIENT_NOT_SAVED' ),
            DATE_NOT_PICKED = i18n( 'InCaseMojit.patient-modelJS.messages.DATE_NOT_PICKED' ),
            ERROR_DELETING_APPOINTMENT = i18n( 'InCaseMojit.patient-modelJS.messages.ERROR_DELETING_APPOINTMENT' ),
            CONFIRM_EMAIL_SENT = i18n( 'InCaseMojit.patient-modelJS.messages.CONFIRM_EMAIL_SENT' ),
            CONFIRM_EMAIL_MODAL_TITLE = i18n( 'InCaseMojit.patient-modelJS.title.CONFIRM_EMAIL_SENT_MODAL' ),
            TASK = i18n( 'CalendarMojit.task_api.title.TASK' ),
            ERROR_CREATING_APPOINTMENT = i18n( 'InCaseMojit.patient-modelJS.messages.ERROR_CREATING_APPOINTMENT' );

        function getYears( mustContain ) {
            var years = [],
                range = 4,
                diff,
                currentYear = moment().year();

            if( mustContain ) {
                mustContain = +mustContain;
                if( mustContain < currentYear ) {
                    diff = currentYear - mustContain;
                    currentYear = mustContain;
                    range = range + diff;
                } else if( mustContain > (currentYear + range) ) {
                    diff = mustContain - (currentYear + range);
                    range = diff + range;
                }
            }

            for( var i = currentYear; i <= currentYear + range; i++ ) { // eslint-disable-line
                years.push( i );
            }

            return years;
        }

        function getMonths() {
            var months = [];
            for( var i = 1; i <= 12; i++ ) { // eslint-disable-line
                months.push( ('00' + i).slice( -2 ) );
            }
            return months;
        }

        function PatientModel( patient ) {
            var
                self = this;
            self._modelName = 'PatientModel';

            /**
             * property which holds the cloned initial configuration parameter
             * @property _initialConfigPatientModel
             * @type {Object}
             * @private
             * @readOnly
             * @final
             */
            this._initialConfigPatientModel = Y.clone( patient, true );

            Y.doccirrus.uam.ViewModel.call( self );

            self._schemaName = 'patient';
            self._runBoilerplate( patient );

            // ensure forward compatibility, introduced by adding PatientPortal_T createPlanned & accessPRC
            delete self.createPlanned;
            delete self.accessPRC;

            /**
             * Also markers are populated in the patient.
             *
             * @type {string}
             * @private
             */
            // TODO: MOJ-3557
            self.markers._arrayOf = 'MarkerModel';
            /**
             * // TODO: MOJ-3557 (workaround here)
             * … and because the schema is not defined as type of 'Marker_T' plain objects are passed into the observableArray.
             * Which is wrong. So move them out of the array and instead prepare them for "_generateDependantModels".
             */
            if( ko.utils.peekObservable( self.markers ).length ) {
                self._AddInitialDataForObservableArraysWithSubViewModelsByKey( 'markers', [].concat( ko.utils.peekObservable( self.markers ) ) );
                self.markers.removeAll();
            }

            self._hasId = ko.observable( (patient._id ? true : false) );

            Y.doccirrus.uam.ContactModel.call( self, patient );

            /* ---  Basic data parameters --- */
            // url
            self._dataUrl = '/1/patient';
            // paging @RW: this was for testing only?
            // this._isPaged = true;

            self._personDisplay = ko.computed( function() {
                // subscribe to changes from:
                ko.unwrap( self.firstname );
                ko.unwrap( self.lastname );
                ko.unwrap( self.title );
                ko.unwrap( self.nameaffix );
                ko.unwrap( self.fk3120 );
                var
                    person = ko.ignoreDependencies( function() {
                        return ko.toJS( self );
                    } );

                return Y.doccirrus.schemas.person.personDisplay( person );

            } ).extend( {rateLimit: 0} );

            // self.activities = ko.observableArray( patient.activities || [] );
            self._comment = ko.computed( {
                read: function() {
                    return self.comment();
                },
                write: function( value ) {
                    self.comment( value );
                    if( self._id ) {
                        // save only this field to get around problems with the
                        // imported data and invalid data.
                        self._save( 'comment' );
                    }
                }
            } );

            // MOJ-3544
            if( self.importId && self.importId() ) {
                self.importId( '' );
            }

            self.preventions = ko.observableArray( patient.preventions || [
                /*                {color: "grey", value: "Vorsorge 35+"},
                 {color: "grey", value: "MS Screening"}*/
            ] );

            /**
             * forward user to calendar and trigger "createEvent" action from localStorage
             * @method _doCreateEvent
             */
            self._doCreateEvent = function() {
                var
                    loadEvent = {
                        action: 'createEvent',
                        patientId: self._id
                    };

                Y.doccirrus.utils.localValueSet( 'loadEvent', loadEvent );
                window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );
            };

            /**
             * forward user in a new tab to calendar and trigger "updateEvent" action from localStorage
             * @method _doUpdateEvent
             */
            self._doUpdateEvent = function() {
                var
                    _nextEvent = self._nextEvent();
                if( !_nextEvent ) {
                    return;
                }
                var
                    eventId = _nextEvent._id,
                // on a next date set calendar to that
                    gotoDate = _nextEvent.date,
                    loadEvent = {
                        action: 'updateEvent',
                        gotoDate: gotoDate,
                        patientId: self._id,
                        eventId: eventId,
                        start: _nextEvent.start,
                        scheduleId: _nextEvent.scheduleId
                    };

                Y.doccirrus.utils.localValueSet( 'loadEvent', loadEvent );
                window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );
            };

            // list of next N appointments for this patient (plain objects)
            self._events = ko.observableArray(); // will load later

            // next appointment
            self._nextEvent = ko.computed( function() {
                return self._events() && self._events()[0];
            } );

            /**
             * display for patientBrowserTable
             *
             * the server now populates the patient with this information...
             * no need for additional calls.
             */
            self._getNextAppointment = ko.computed( function() {
                var
                    _nextEvent = self._nextEvent();
                if( _nextEvent ) {
                    return moment( _nextEvent.date ).format( 'DD.MM.YY HH:mm' );
                }
                return '';
            } );

            self.user = patient.user || 'importiert';

            // MOJ-465

            // {"type": "String"},
            self.age = ko.computed( function() {
                var deathmom = self.dateOfDeath();
                return deathmom ? ( self.kbvDob() ? moment( deathmom ).diff( moment( self.kbvDob(), 'DD.MM.YYYY' ), 'years' ) : '' ) :
                     ( self.kbvDob() ? moment().diff( moment( self.kbvDob(), 'DD.MM.YYYY' ), 'years' ) : '' );
            } );

            self.status = 3;
            // these are the fields we can search on -- i.e.
            // fields that we can include out of the global client-side filter.
            // only really relevant for paged type models?
            self._filterFields = ['lastname', 'dob', 'firstname', 'comment'];

            //  _selected property is bound to checkbox value in datatable
            self._selected = ko.observable( false );

            // the following fields are async extenders,
            // they follow the pattern from
            // http://smellegantcode.wordpress.com/2012/12/10/asynchronous-computed-observables-in-knockout-js/

            self.getStatusText = function( status ) {
                return status;
            };

            // fill the arrays with data
            self._generateDependantModels();

            // duplicate rest calls, because non-standard REST API backend implemented...
            // this should all be handled transparently by the standard subviewmodel and viewmodel
            // methods, simply overwriting the array in the db?
            // MOJ-908: part of big refactoring for REST standardisation.
            // may also be handled by patient API
            self.addMarkers = function( addedIds ) {
                Y.doccirrus.jsonrpc.api.patient.addMarkers( {
                    patient: self._id,
                    marker: addedIds
                } );
            };

            self.removeMarkers = function( removedIds ) {
                Y.doccirrus.jsonrpc.api.patient.removeMarkers( {
                    patient: self._id,
                    marker: removedIds
                } );
            };

            self.addAndRemove = function( removedIds, addedIds ) {
                Y.doccirrus.jsonrpc.api.patient.addMarkers( {
                    patient: self._id,
                    marker: addedIds
                } ).then( function() {
                    Y.doccirrus.jsonrpc.api.patient.removeMarkers( {
                        patient: self._id,
                        marker: removedIds
                    } );
                } );
            };

            self._hasPublicInsurance = ko.computed( function() {
                return Y.Array.some( self.insuranceStatus(), function( status ) {
                    return 'PUBLIC' === status.type();
                } );
            } );

            /**
             * returns all insurances of patient
             */
            self._getInsuranceTypeTemp = ko.computed( function() {
                var publicIns,
                    privateIns,
                    selfIns,
                    bgIns,
                    result = [];

                Y.Array.some( self.insuranceStatus(), function( status ) {
                    switch( status.type() ) {
                        case 'PUBLIC':
                            if( !publicIns ) {
                                publicIns = true;
                                result.push( 'PUBLIC' );
                            }
                            break;
                        case 'PRIVATE':
                            if( !privateIns ) {
                                privateIns = true;
                                result.push( 'PRIVATE' );
                            }
                            break;
                        case 'PUBLIC_A':
                            if( !publicIns ) {
                                publicIns = true;
                                result.push( 'PUBLIC_A' );
                            }
                            break;
                        case 'PRIVATE_A':
                            if( !privateIns ) {
                                privateIns = true;
                                result.push( 'PRIVATE_A' );
                            }
                            break;
                        case 'PRIVATE_CH':
                            if( !privateIns ) {
                                privateIns = true;
                                result.push( 'PRIVATE_CH' );
                            }
                            break;
                        case 'PRIVATE_CH_UVG':
                            if( !privateIns ) {
                                privateIns = true;
                                result.push( 'PRIVATE_CH_UVG' );
                            }
                            break;
                        case 'PRIVATE_CH_IVG':
                            if( !privateIns ) {
                                privateIns = true;
                                result.push( 'PRIVATE_CH_IVG' );
                            }
                            break;
                        case 'PRIVATE_CH_MVG':
                            if( !privateIns ) {
                                privateIns = true;
                                result.push( 'PRIVATE_CH_MVG' );
                            }
                            break;
                        case 'PRIVATE_CH_VVG':
                            if( !privateIns ) {
                                privateIns = true;
                                result.push( 'PRIVATE_CH_VVG' );
                            }
                            break;
                        case 'SELFPAYER':
                            if( !selfIns ) {
                                selfIns = true;
                                result.push( 'SELFPAYER' );
                            }
                            break;
                        case 'BG':
                            if( !bgIns ) {
                                bgIns = true;
                                result.push( 'BG' );
                            }
                            break;
                    }
                    return publicIns && privateIns && selfIns && bgIns;
                } );
                return result;
            } );

            /**
             * returns map Insurance - responsible Schein
             */
            self._getInsuranceScheinMap = function() {
                return Y.doccirrus.schemas.activity.getInsuranceScheinMap();
            };

            /**
             * returns map Schein - responsible catalogs(which catalogs are available for BL search)
             */
            self._getScheinCatalogs = function() {
                return Y.doccirrus.schemas.activity.getScheinInsuranceMap();
            };

            self._getInsuranceByType = function( type ) {
                var insurance;
                Y.Array.some( self.insuranceStatus(), function( status ) {
                    if( type === status.type() ) {
                        insurance = status;
                        return true;
                    }
                } );
                return insurance;
            };

            self._getPublicInsurance = ko.computed( function() {
                var insurance;
                Y.Array.some( self.insuranceStatus(), function( status ) {
                    if( 'PUBLIC' === status.type() ) {
                        insurance = status;
                        return true;
                    }
                } );
                return insurance;
            } );

            self._getContact = function( communications ) {

                var _length = communications.length,
                    i;

                function getContact( i ) {
                    (function( i ) {
                        if( communications[i].preferred() ) {
                            return communications[i].value();
                        } else if( 'PHONEJOB' === communications[i].type() ) {
                            return communications[i].value();
                        }
                    })( i );
                }

                if( communications && communications.length > 1 ) {
                    for( i = _length - 1; i >= 0; i-- ) {
                        getContact( i );
                    }
                }

                return ( communications && communications[0] && communications[0].value() ) || '';
            };
            /**
             * display for patientBrowserTable
             */
            self._getGenderDisplay = function() {
                var gender = self.gender.peek(),
                    genderList = self._genderList,
                    display = Y.Array.find( genderList, function( item ) {
                        return gender === item.val;
                    } );
                if( display ) {
                    switch( display.val ) {
                        case 'MALE':
                            return 'm';
                        case 'FEMALE':
                            return 'w';
                        case 'UNDEFINED':
                            return 'x';
                        case 'VARIOUS':
                            return 'd';
                        default:
                            return 'u';
                    }
                }
                return '';
            };

            self._billingFactor = function() {
                var insurance = self._getInsuranceByType( 'PRIVATE' );
                return (insurance && insurance.billingFactor && insurance.billingFactor()) || null;
            };

            self._addDisposable( self.kbvDob.subscribe( function( val ) {
                var kbvObj;

                if( 10 === val.length ) {
                    kbvObj = new Y.doccirrus.KBVDateValidator( val );
                    self.dob( moment( kbvObj.getDate(), "DD.MM.YYYY" ).toJSON() );
                }
            } ) );

            /**
             * determines if patient is from a foreign country
             * @type ko.computed
             */
            self._isFromForeignCountry = ko.computed( function() {
                var addresses = self.addresses(),
                    foundOfficial = null,
                    result = false;
                if( Y.Lang.isArray( addresses ) && addresses.length ) {
                    foundOfficial = Y.Array.find( addresses, function( address ) {
                        return 'OFFICIAL' === ko.unwrap( address.kind );
                    } );
                    if( null === foundOfficial ) {
                        foundOfficial = Y.Array.find( addresses, function( address ) {
                            return 'POSTBOX' === ko.unwrap( address.kind );
                        } );
                    }
                    if( foundOfficial && 'D' !== ko.unwrap( foundOfficial.countryCode ) ) {
                        result = true;
                    }
                }
                return result;
            } );

            /**
             * determines if patients insuranceStatus costCarrierBillingSection is SVA or BVG
             * @type ko.computed
             */
            self._isInsuranceStatusCostCarrierBillingSectionBVGorSVA = ko.computed( function() {
                var insuranceStatus = self.insuranceStatus(),
                    result = false;
                if( Y.Lang.isArray( insuranceStatus ) && insuranceStatus.length ) {
                    Y.each( insuranceStatus, function( insurance ) {
                        if( '01' === ko.unwrap( insurance.costCarrierBillingSection ) || '02' === ko.unwrap( insurance.costCarrierBillingSection ) ) {
                            result = true;
                        }
                    } );
                }
                return result;
            } );

            /**
             * determines if patients insuranceStatus costCarrierBillingSection is SVA or BVG
             * @type ko.computed
             */
            self._isInsuranceStatusCostCarrierBillingGroupBundeswehr = ko.computed( function() {
                var insuranceStatus = self.insuranceStatus(),
                    result = false;
                if( Y.Lang.isArray( insuranceStatus ) && insuranceStatus.length ) {
                    Y.each( insuranceStatus, function( insurance ) {
                        if( '75' === ko.unwrap( insurance.costCarrierBillingGroup ) ) {
                            result = true;
                        }
                    } );
                }
                return result;
            } );

            /**
             * Computes a link to the patient details, if patient has an id else returns null
             * @property _linkToDetail
             * @type {ko.computed|null|String}
             */
            self._linkToDetail = ko.computed( function() {
                var
                    id = ko.unwrap( self._id );

                if( id ) {
                    return Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + id + '/tab/patient_detail';
                }
                else {
                    return null;
                }
            } );

            /**
             * Computes a link to the patient insurances, if patient has an id else returns null
             * @property _linkToInsurances
             * @type {ko.computed|null|String}
             */
            self._linkToInsurances = ko.computed( function() {
                var
                    id = ko.unwrap( self._id );

                if( id ) {
                    return Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + id + '/section/insurance';
                }
                else {
                    return null;
                }
            } );


            self._email = ko.computed( function() {
                var communications = self.communications(),
                // filter relevant entries
                    communicationsFiltered = Y.Array.filter( communications, function( communication ) {
                        var type = ko.unwrap( communication.type );
                        return 'EMAILPRIV' === type || 'EMAILJOB' === type;
                    } ),
                // find correct entry via preferred flag
                    find = Y.Array.find( communicationsFiltered, function( communication ) {
                        var preferred = ko.unwrap( communication.preferred );
                        return Boolean( preferred );
                    } );
                // if none is preferred take the first entry
                if( null === find && communicationsFiltered.length ) {
                    find = communicationsFiltered[0];
                }
                return find;
            } );

            self._phone = ko.computed( function() {
                var communications = self.communications(),
                // filter relevant entries
                    communicationsFiltered = Y.Array.filter( communications, function( communication ) {
                        var type = ko.unwrap( communication.type );
                        return type === 'PHONEPRIV' || type === 'PHONEJOB' || type === 'PHONEEMERGENCY';
                    } ),
                // find correct entry via preferred flag
                    find = Y.Array.find( communicationsFiltered, function( communication ) {
                        var preferred = ko.unwrap( communication.preferred );
                        return Boolean( preferred );
                    } );
                // if none is preferred take the first entry
                if( null === find && communicationsFiltered.length ) {
                    find = communicationsFiltered[0];
                }
                return find;
            } );

            self._fax = ko.computed( function() {
                var communications = self.communications(),
                // filter relevant entries
                    communicationsFiltered = Y.Array.filter( communications, function( communication ) {
                        var type = ko.unwrap( communication.type );
                        return 'FAXPRIV' === type || 'FAXJOB' === type;
                    } ),
                // find correct entry via preferred flag
                    find = Y.Array.find( communicationsFiltered, function( communication ) {
                        var preferred = ko.unwrap( communication.preferred );
                        return Boolean( preferred );
                    } );
                // if none is preferred take the first entry
                if( null === find && communicationsFiltered.length ) {
                    find = communicationsFiltered[0];
                }
                return find;
            } );

            /**
             * This is a hack to prevent casefile_browser from crashing on legacy or test data where patients
             * do not have an insuranceType
             * @private
             */
            self._displayInsuranceTypes = ko.computed( function() {
                var
                    insuranceStatus = ko.unwrap( self.insuranceStatus );

                if( !(Array.isArray( insuranceStatus ) && insuranceStatus.length) ) {
                    return i18n( 'InCaseMojit.patient-modelJS._displayInsuranceTypes.NOT_INSURED' );
                }
                return insuranceStatus.map( function( entry ) {
                    return Y.doccirrus.schemaloader.translateEnumValue( 'i18n', ko.unwrap( entry.type ), Y.doccirrus.schemas.person.types.Insurance_E.list, i18n( 'InCaseMojit.patient-modelJS._displayInsuranceTypes.UNKNOWN_TYPE' ) );
                } ).join( ', ' );
            } );
            /**
             * sets readOnly fields based on _validatable
             */
            self._addDisposable( ko.computed( function() {
                var paths;
                if( self._validatable() ) {
                    paths = Y.doccirrus.schemas.patient.getReadOnlyFields( ko.toJS( self ) );
                    self._getModuleViewModelReadOnly()._makeReadOnly( {
                        paths: paths
                    } );
                }
            } ) );

            /**
             * [KP7-90] proof of insurance
             */
            self._hasCardSwiped = ko.computed( function() {
                var today = moment(),
                    swiped,
                    quarterRange = Y.doccirrus.commonutils.getDateRangeByQuarter( today.quarter(), today.year() ),
                    insurance = self._getPublicInsurance();
                if( !insurance || !insurance.cardSwipe() ) {
                    Y.log( '_hasCardSwiped invalid 1', 'debug', NAME );
                    return false;
                }
                swiped = moment( insurance.cardSwipe() );
                if( swiped && swiped.isValid() && swiped.isAfter( quarterRange.start ) && swiped.isBefore( quarterRange.end ) ) {
                    return true;

                }
                return false;
            } );

            /**
             * MOJ-2224 automatically set 'talk' with 'gender'
             */
            self._addDisposable( ko.computed( function() {
                var gender = self.gender();
                switch( gender ) {
                    case'FEMALE':
                        self.talk( 'MS' );
                        break;
                    case'MALE':
                        self.talk( 'MR' );
                        break;
                    default:
                        self.talk( 'NONE' );
                        break;
                }
            } ) );

            self._attachActivity = function(activityId, content){
                self.attachedContent(content);
                Y.doccirrus.jsonrpc.api.patient.attachActivity({
                    query:{
                        patientId: self._id,
                        activityId: activityId,
                        content: content
                    }
                });
            };

            self._detachActivity = function(){
                self.attachedContent('');
                Y.doccirrus.jsonrpc.api.patient.detachActivity({
                    query: {
                        patientId: self._id
                    }
                });
            };

            if( !self.crmCatalogShort() ) {
                self.crmCatalogShort( 'GOÄ' );
            }

            self._crmCatalogs = Y.doccirrus.catalogmap.getCatalogs( {
                actType: 'TREATMENT'
            } );

            self._catalogTags = ko.observableArray( self.crmTags() || [] );
            self._select2tags = new Y.doccirrus.uam.utils.CatalogUsageTagList( {
                dataArray: self._catalogTags,
                catalogShort: 'GOÄ',
                useCache: true,
                exactMatch: true,
                placeholder: i18n('InCaseMojit.casefile_detail.placeholder.TAG_FILTER')
            } );

            self._addDisposable( self._catalogTags.subscribe( function( val ) {
                self.crmTags( val );
            } ) );

            self._monthList = getMonths();
            self._yearList = getYears( self.crmAppointmentYear() || moment().year() );
            self._quarterList = [1, 2, 3, 4];

            self._monthDisabled = ko.observable( false );
            self._quarterDisabled = ko.observable( false );

            self._addDisposable( ko.computed( function() {
                var
                    date, start, end,
                    month = self.crmAppointmentMonth(),
                    quarter = self.crmAppointmentQuarter(),
                    year = self.crmAppointmentYear();

                if( month ) {
                    date = moment( month + '' + year, 'MMYYYY' );
                    start = date.clone().startOf( 'month' ).toDate();
                    end = date.clone().endOf( 'month' ).toDate();
                    self.crmAppointmentRangeStart( start );
                    self.crmAppointmentRangeEnd( end );
                    self._monthDisabled( false );
                    self._quarterDisabled( true );
                } else if( quarter ) {
                    date = moment( quarter + '' + year, 'QYYYY' );
                    start = date.clone().startOf( 'quarter' ).toDate();
                    end = date.clone().endOf( 'quarter' ).toDate();
                    self.crmAppointmentRangeStart( start );
                    self.crmAppointmentRangeEnd( end );
                    self._monthDisabled( true );
                    self._quarterDisabled( false );
                } else {
                    self.crmAppointmentRangeStart( null );
                    self.crmAppointmentRangeEnd( null );
                    self._monthDisabled( false );
                    self._quarterDisabled( false );
                }
            } ) );

            function eventNotice( type, text ) {
                Y.doccirrus.DCWindow.notice( {
                    type: type,
                    message: text
                } );
            }

            self._crmDeleteButtonDisabled = ko.observable( true );
            self._crmCreateButtonDisabled = ko.observable( true );
            self._crmReminderDatepickerDisabled = ko.observable( true );

            function changeCrmButtonState( disabled ) {
                self._crmDeleteButtonDisabled( disabled );
                self._crmCreateButtonDisabled( disabled );
                self._crmReminderDatepickerDisabled( disabled );
            }

            function getEventUserDescr() {
                var str = REMINDER_SHORT + ': ',
                    treatmentTitles = [],
                    crmTreatments = self.crmTreatments();
                crmTreatments.forEach( function( treatment ) {
                    var title = treatment.title();
                    if( title && title.length ) {
                        treatmentTitles.push( title );
                    }
                } );

                str += treatmentTitles.join( ', ' );
                return str;
            }

            self._addDisposable( ko.computed( function() {
                var calRef = self.crmReminderCalRef(),
                    date = self.crmReminder();
                if( calRef ) {
                    self._crmDeleteButtonDisabled( false );
                    self._crmCreateButtonDisabled( true );
                    self._crmReminderDatepickerDisabled( true );
                } else {
                    self._crmDeleteButtonDisabled( true );
                    self._crmCreateButtonDisabled( !date );
                    self._crmReminderDatepickerDisabled( false );
                }
            } ) );

            self._displayCrmReminder = ko.computed( function() {
                var crmReminder = self.crmReminder();
                if( crmReminder ) {
                    return REMINDER_SHORT + ': ' + moment( crmReminder ).format( 'DD.MM.YYYY' );
                } else {
                    return '';
                }
            } );

            self._displayCrmAppointment = ko.computed( function() {
                var crmAppointmentMonth = self.crmAppointmentMonth(),
                    crmAppointmentQuarter = self.crmAppointmentQuarter(),
                    crmAppointmentYear = self.crmAppointmentYear(),
                    text = '';

                if( crmAppointmentMonth && crmAppointmentYear ) {
                    text = crmAppointmentMonth + '.' + crmAppointmentYear;
                }
                if( crmAppointmentQuarter && crmAppointmentYear ) {
                    text = 'Q ' + crmAppointmentQuarter + ' ' + crmAppointmentYear;
                }
                return text.length ? ESTIMATED_APPOINTMENT_SHORT + ': ' + text : text;
            } );

            self._onCrmDeleteButtonClicked = function() {
                Y.doccirrus.jsonrpc.api.calevent.delete( {
                    query: {
                        _id: self.crmReminderCalRef()
                    },
                    data: {
                        eventType: 'allDay'
                    }
                } ).done( function(response) {
                    var obj = response.data && response.data[0];
                    if( obj ) {
                        eventNotice( 'success', DELETED_APPOINTMENT );
                        self.crmReminderCalRef( '' );
                    } else {
                        eventNotice( 'error', ERROR_DELETING_APPOINTMENT );
                    }
                } ).fail( function() {
                    eventNotice( 'error', ERROR_DELETING_APPOINTMENT );
                } );
            };

            self._onCrmCreateButtonClicked = function() {
                var date = self.crmReminder();

                if( !self._id ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'warn',
                        message: PATIENT_NOT_SAVED
                    } );
                    return;
                }

                if( !date ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'warn',
                        message: DATE_NOT_PICKED
                    } );
                    return;
                }

                changeCrmButtonState( true );

                Y.doccirrus.jsonrpc.api.calevent.create( {
                    data: {
                        start: moment( date ).startOf( 'day' ).toDate(),
                        end: moment( date ).endOf( 'day' ).toDate(),
                        title: '',
                        userDescr: getEventUserDescr(),
                        urgency: 0,
                        calendar: Y.doccirrus.schemas.calendar.getDefaultCalendarId(),
                        allDay: true,
                        patient: self._id,
                        repetition: 'NONE',
                        until: null,
                        byweekday: [],
                        scheduled: 0,
                        notConfirmed: true
                    }
                } ).done( function( response ) {
                    var
                        id = response.data && response.data.scheduleId;
                    if( id ) {
                        self.crmReminderCalRef( id );
                        eventNotice( 'success', CREATED_APPOINTMENT );
                    } else {
                        self.crmReminderCalRef( '' );
                        eventNotice( 'error', ERROR_CREATING_APPOINTMENT );
                    }

                } ).fail( function() {
                    eventNotice( 'error', ERROR_CREATING_APPOINTMENT );
                } );
            };

            Y.doccirrus.communication.on( {
                event: 'system.NEW_PATIENT_ATTACHED_CONTENT',
                done: function( response ) {
                    self.attachedContent( (response.data && response.data[0]) || '' );
                }
            } );

            self._hasBirthday = ko.computed(function(){
                var dob = self.dob();
                return moment( dob ).format('DD.MM') === moment().format('DD.MM');
            });

            /**
             * Insurance types can only be used once.
             */
            self._arrayAdd_insuranceStatus = function() {
                var
                    insuranceStatus = ko.utils.peekObservable( self.insuranceStatus ),
                    allTypes = Y.doccirrus.schemas.person.types.Insurance_E.list.map( function( entry ) {
                        return entry.val;
                    } ),
                    usedTypes = insuranceStatus.map( function( insurance ) {
                        return ko.utils.peekObservable( insurance.type );
                    } ),
                    availableTypes = Y.Array.filter( allTypes, function( type ) {
                        return usedTypes.indexOf( type ) === -1;
                    } );

                if( availableTypes.length ) {
                    self.insuranceStatus.push(
                        new Y.doccirrus.uam.InsuranceStatusModel( {
                            type: availableTypes[0], // should not be determined by rendering the template
                            parent: self,
                            inAttribute: 'insuranceStatus'
                        } )
                    );
                    return;
                }

                Y.doccirrus.DCSystemMessages.addMessage( {
                    content: 'Sie können jeden Kostenträgertyp nur einmal auswählen!',
                    messageId: 'all-insurance-types-used-' + self._id,
                    level: 'WARNING',
                    _removeTimeout: 30000
                } );

            };

            self._insuranceStatusAfterAdd = function( element ) {
                element.scrollIntoView();
            };

            self._physicanSelection = new Y.doccirrus.uam.KoBaseContact( {
                type: 'PHYSICIAN',
                initialValue: self.physicians.peek() && self.physicians.peek()[0],
                onSelect: function( baseContactId ) {
                    if( baseContactId ) {
                        self.physicians( [baseContactId] );
                    } else {
                        self.physicians( [] );
                    }
                }
            } );

            self._institutionSelection = new Y.doccirrus.uam.KoBaseContact( {
                type: 'INSTITUTION',
                initialValue: self.institution.peek(),
                onSelect: function( baseContactId ) {
                    if( baseContactId ) {
                        self.institution( baseContactId );
                    } else {
                        self.institution( null );
                    }
                }
            } );

            self._updateHotTask = function(){
                Y.doccirrus.jsonrpc.api.task.getPatientHotTask( {
                    query: {
                        patientId: self._id
                    }
                } )
                    .done( function( response ) {
                        var
                            data = response.data && response.data[0];
                        if(data){
                            if( data.alertTime ) {
                                if( moment().isAfter( moment( data.alertTime ) ) ) {
                                    self._hotTaskAnimation( true );
                                } else {
                                    self._hotTaskAnimation( false );
                                }
                                self._hotTask( moment( data.alertTime ).format( TIMESTAMP_FORMAT ) );
                            } else {
                                self._hotTaskAnimation( false );
                                self._hotTask( TASK );
                            }

                            self._hotTask.data = data;
                        } else {
                            self._hotTaskAnimation( false );
                            self._hotTask( null );
                        }
                    } );
            };

            self._hotTask = ko.observable();
            self._hotTaskAnimation = ko.observable( false );
            self._updateHotTask();
            self._createTask = function() {
                Y.doccirrus.modals.taskModal.showDialog( {
                    patientId: self._id,
                    patientName: Y.doccirrus.schemas.person.personDisplay( {
                        firstname: self.firstname(),
                        lastname: self.lastname(),
                        title: self.title()
                    } )
                }, function(){
                    self._updateHotTask();
                } );
            };
            self._showHotTask = function() {
                var
                    data = self._hotTask.data;
                Y.doccirrus.modals.taskModal.showDialog( data, function(){
                    self._updateHotTask();
                } );
            };

            /**
             * Computes if there is an insurance
             * @method _hasInsurance
             * @returns {Boolean}
             */
            self._hasInsurance = ko.computed( function() {
                var
                    insuranceStatus = ko.unwrap( self.insuranceStatus );

                return Array.isArray( insuranceStatus ) && insuranceStatus.length;

            } );

            /**
             * Computes the name of the first insurance if available
             * @method _firstInsuranceName
             * @returns {String}
             */
            self._firstInsuranceName = ko.computed( function() {
                var
                    insuranceStatus = ko.unwrap( self.insuranceStatus );

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
            self._firstInsuranceEmployeeName = Y.doccirrus.uam.ViewModel.createAsync( {
                cache: {},
                initialValue: '',
                jsonrpc: {
                    fn: Y.doccirrus.jsonrpc.api.employee.read,
                    params: self._addDisposable( ko.computed( function() {
                        var
                            insuranceStatus = ko.unwrap( self.insuranceStatus ),
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

            /** Unset "_firstInsuranceEmployeeName" when first insurance employee is unset */
            self._addDisposable( ko.computed( function() {
                var
                    insuranceStatus = ko.unwrap( self.insuranceStatus ),
                    employeeId;

                if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                    employeeId = ko.unwrap( insuranceStatus[0].employeeId );
                    if( !employeeId ) {
                        self._firstInsuranceEmployeeName( '' );
                    }
                }
                else {
                    self._firstInsuranceEmployeeName( '' );
                }

            } ) );

            /**
             * Computes visibility of insurance status section in patient short info
             * @method _isPatientShortInfoInsuranceStatusVisible
             * @returns {Boolean}
             */
            self._isPatientShortInfoInsuranceStatusVisible = ko.computed( function() {
                var
                    _hasInsurance = ko.unwrap( self._hasInsurance ),
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

            self._sendEmailConfirmationAgain = function(data){
                var
                    email = ko.utils.peekObservable( data.value );
                if( email ) {
                    Y.doccirrus.jsonrpc.api.patient.askConfirmEMail( {
                        data: {
                            patientId: ko.utils.peekObservable( self._id ),
                            email: ko.utils.peekObservable( data.value )
                        }
                    } )
                        .done( function() {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'success',
                                message: CONFIRM_EMAIL_SENT,
                                window: {
                                    title: CONFIRM_EMAIL_MODAL_TITLE
                                }
                            } );
                        } )
                        .fail( function( error ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } );
                } else {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: 'email should be set'
                    } );
                }
            };

        }

        Y.namespace( 'doccirrus.uam' ).PatientModel = PatientModel;

    },
    '0.0.1', {requires: [
        'oop',
        'dcviewmodel',
        'dcmedia',
        'dccontactmodel',
        'dcmarkermodel',
        'dckbvinsurancemodel',
        'dckbvdate',
        'KoUI',
        'KoComponentManager',
        'dccommunication-client',
        'activity-schema'
    ]}
);