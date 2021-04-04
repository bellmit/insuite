/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'PatientSectionAddDataViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
    // unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
    // ignoreDependencies = ko.ignoreDependencies,

        i18n = Y.doccirrus.i18n,

        KoViewModel = Y.doccirrus.KoViewModel,
        PatientSectionViewModel = KoViewModel.getConstructor( 'PatientSectionViewModel' ),
        SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' );

    /**
     * @class PatientSectionAddDataCrmTreatmentsEditorViewModel
     * @constructor
     * @extends SubEditorModel
     */
    function PatientSectionAddDataCrmTreatmentsEditorViewModel( config ) {
        PatientSectionAddDataCrmTreatmentsEditorViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( PatientSectionAddDataCrmTreatmentsEditorViewModel, SubEditorModel, {
        initializer: function PatientSectionAddDataCrmTreatmentsEditorViewModel_initializer() {
            var
                self = this;

            self.initPatientSectionAddDataCrmTreatmentsEditorViewModel();
        },
        destructor: function PatientSectionAddDataCrmTreatmentsEditorViewModel_destructor() {
        },
        initPatientSectionAddDataCrmTreatmentsEditorViewModel: function PatientSectionAddDataCrmTreatmentsEditorViewModel_initPatientSectionAddDataCrmTreatmentsEditorViewModel() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            self._createActivityCodeAutoCompleteEvents = new Y.EventTarget();

            self._select2Code = Y.doccirrus.uam.utils.createActivityCodeAutoComplete( {
                field: self.title,
                eventTarget: self._createActivityCodeAutoCompleteEvents,
                getCatalogCodeSearchParams: function() {
                    var
                        catalog,
                        catalogs,
                        catalogFile,
                        catalogShort = ko.unwrap( currentPatient.crmCatalogShort ),
                        tags = ko.unwrap( KoViewModel.getViewModel( 'PatientSectionAddDataViewModel' )._catalogTags );

                    catalogs = Y.doccirrus.catalogmap.getCatalogs( {actType: 'TREATMENT', short: catalogShort} );

                    if( catalogs && catalogs.length ) {
                        catalog = catalogs[0];
                        catalogFile = catalog.filename;
                    }

                    if( catalogFile ) {
                        return {
                            itemsPerPage: 20,
                            query: {
                                term: '',
                                catalogs: [{filename: catalogFile, short: catalogShort}],
                                tags: tags
                            }
                        };
                    }
                    else {
                        return null;
                    }
                },
                select2: {
                    dropdownAutoWidth: false,
                    dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete dc-select2-createActivityCodeAutoComplete-autoWidth'
                }
            } );

            self._createActivityCodeAutoCompleteEvents.on( 'catalogItemSelected', function( yEvent ) {
                var data = yEvent.catalogItem, price;
                if( 'bewertung_liste' === data.value && data.u_extra && data.u_extra.bewertung_liste && data.u_extra.bewertung_liste[1] ) {
                    price = data.u_extra.bewertung_liste[1].value;
                } else {
                    price = data.value;
                }
                price = +price;
                self.price( isNaN( price ) ? 0 : price );
            } );

            self.addDisposable( self.title.subscribe( function( val ) {
                if( !val ) {
                    self.price( 0 );
                    self.probability( 0 );
                }
            } ) );

            self._displayPrice = ko.computed( {
                read: function() {
                    var price = self.price();
                    price = Y.doccirrus.comctl.numberToLocalString( price );
                    return price;
                },
                write: function( val ) {
                    val = Y.doccirrus.comctl.localStringToNumber( val );
                    self.price( val );
                }
            } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} );
        },
        removeItem: function() {
            var
                self = this,
                dataModelParent = self.get( 'dataModelParent' ),
                currentPatient = peek( self.get( 'currentPatient' ) );

            currentPatient.crmTreatments.remove( dataModelParent );
        }
    }, {
        NAME: 'PatientSectionAddDataCrmTreatmentsEditorViewModel',
        ATTRS: {
            whiteList: {
                value: [
                    'title',
                    'price',
                    'probability'
                ],
                lazyAdd: false
            }
        }
    } );
    KoViewModel.registerConstructor( PatientSectionAddDataCrmTreatmentsEditorViewModel );

    /**
     * @constructor
     * @class PatientSectionAddDataViewModel
     * @extends PatientSectionViewModel
     */
    function PatientSectionAddDataViewModel() {
        PatientSectionAddDataViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientSectionAddDataViewModel, PatientSectionViewModel, {
        templateName: 'PatientSectionAddDataViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initObservables();
            self.initCrm();
            self.initOthers();
        },
        /** @protected */
        destructor: function() {
        },
        initObservables: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.mixWhiteListFromDataModel( currentPatient );
            self.initSubModels( currentPatient );

        },
        _crmCatalogs: null,
        _catalogTags: null,
        _select2tags: null,
        _crmDeleteButtonDisabled: null,
        _crmCreateButtonDisabled: null,
        _crmReminderDatepickerDisabled: null,
        _displayCrmReminder: null,
        _displayCrmAppointment: null,

        initCrm: function() {
            var
                self = this,
                REMINDER_SHORT = i18n( 'InCaseMojit.crm_item.label.REMINDER_SHORT' ),
                ESTIMATED_APPOINTMENT_SHORT = i18n( 'InCaseMojit.crm_item.label.ESTIMATED_APPOINTMENT_SHORT' );

            self._crmCatalogs = Y.doccirrus.catalogmap.getCatalogs( {
                actType: 'TREATMENT'
            } );

            self._catalogTags = ko.observableArray( self.crmTags() || [] );

            self._select2tags = new Y.doccirrus.uam.utils.CatalogUsageTagList( {
                dataArray: self._catalogTags,
                catalogShort: 'GOÄ',
                useCache: true,
                exactMatch: true,
                placeholder: i18n( 'InCaseMojit.casefile_detail.placeholder.TAG_FILTER' )
            } );

            self._crmDeleteButtonDisabled = ko.observable( true );
            self._crmCreateButtonDisabled = ko.observable( true );
            self._crmReminderDatepickerDisabled = ko.observable( true );

            self.addDisposable( ko.computed( function() {
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

            self.itemSrmHeadlineI18n = i18n( 'InCaseMojit.crm_item.HEADLINE' );
            self.labelTreatmentsI18n = i18n( 'InCaseMojit.crm_item.label.TREATMENTS' );
            self.labelCrmTitleI18n = i18n( 'InCaseMojit.crm_item.label.TITLE' );
            self.labelPriceI18n = i18n( 'InCaseMojit.crm_item.label.PRICE' );
            self.labelProbabilityI18n = i18n( 'InCaseMojit.crm_item.label.PROBABILITY' );
            self.labelEstimatedAppointmentI18n = i18n( 'InCaseMojit.crm_item.label.ESTIMATED_APPOINTMENT' );
            self.labelMonthOrI18n = i18n( 'InCaseMojit.crm_item.label.MONTH_OR' );
            self.labelQuaterI18n = i18n( 'InCaseMojit.crm_item.label.QUARTER' );
            self.labelYearI18n = i18n( 'InCaseMojit.crm_item.label.YEAR' );
            self.messagePleaseSelectI18n = i18n( 'general.message.PLEASE_SELECT' );
            self.labelCommentI18n = i18n( 'InCaseMojit.crm_item.label.COMMENT' );
            self.labelReminderI18n = i18n( 'InCaseMojit.crm_item.label.REMINDER' );
            self.buttonDeleteAppointmentI18n = i18n( 'InCaseMojit.crm_item.buttons.DELETE_APPOINTMENT' );
            self.buttonCreateAppointmentI18n = i18n( 'InCaseMojit.crm_item.buttons.CREATE_APPOINTMENT' );

        },
        initOthers: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.showOthers = ko.observable( !!currentPatient.pseudonym() );
            self.othersSectionTitleI18n = i18n( 'InCaseMojit.othersSection.TITLE' );
            self.labelPseudonymI18n = i18n( 'InCaseMojit.othersSection.LABEL_PSEUDONYM' );
        },
        changeCrmButtonState: function( disabled ) {
            var self = this;
            self._crmDeleteButtonDisabled( disabled );
            self._crmCreateButtonDisabled( disabled );
            self._crmReminderDatepickerDisabled( disabled );
        },
        eventNotice: function( type, text ) {
            Y.doccirrus.DCWindow.notice( {
                type: type,
                message: text
            } );
        },
        getEventUserDescr: function() {
            var
                self = this,
                REMINDER_SHORT = i18n( 'InCaseMojit.crm_item.label.REMINDER_SHORT' ),
                str = REMINDER_SHORT + ': ',
                treatmentTitles = [],
                currentPatient = peek( self.get( 'currentPatient' ) ),
                crmTreatments = currentPatient.crmTreatments;
            crmTreatments().forEach( function( treatment ) {
                var title = treatment.title();
                if( title && title.length ) {
                    treatmentTitles.push( title );
                }
            } );

            str += treatmentTitles.join( ', ' );
            return str;
        },

        _onCrmDeleteButtonClicked: function() {
            var self = this,
                DELETED_APPOINTMENT = i18n( 'InCaseMojit.patient-modelJS.messages.DELETED_APPOINTMENT' ),
                ERROR_DELETING_APPOINTMENT = i18n( 'InCaseMojit.patient-modelJS.messages.ERROR_DELETING_APPOINTMENT' );
            Y.doccirrus.jsonrpc.api.calevent.delete( {
                query: {
                    _id: self.crmReminderCalRef()
                },
                data: {
                    eventType: 'allDay'
                }
            } ).done( function( response ) {
                var obj = response.data && response.data[0];
                if( obj ) {
                    self.eventNotice( 'success', DELETED_APPOINTMENT );
                    self.crmReminderCalRef( '' );
                } else {
                    self.eventNotice( 'error', ERROR_DELETING_APPOINTMENT );
                }
            } ).fail( function() {
                self.eventNotice( 'error', ERROR_DELETING_APPOINTMENT );
            } );
        },
        _onCrmCreateButtonClicked: function() {
            var self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                date = self.crmReminder(),
                CREATED_APPOINTMENT = i18n( 'InCaseMojit.patient-modelJS.messages.CREATED_APPOINTMENT' ),
                PATIENT_NOT_SAVED = i18n( 'InCaseMojit.patient-modelJS.messages.PATIENT_NOT_SAVED' ),
                DATE_NOT_PICKED = i18n( 'InCaseMojit.patient-modelJS.messages.DATE_NOT_PICKED' ),
                ERROR_CREATING_APPOINTMENT = i18n( 'InCaseMojit.patient-modelJS.messages.ERROR_CREATING_APPOINTMENT' );

            if( currentPatient.isNew() ) {
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

            self.changeCrmButtonState( true );

            Y.doccirrus.jsonrpc.api.calevent.create( {
                data: {
                    start: moment( date ).startOf( 'day' ).toDate(),
                    end: moment( date ).endOf( 'day' ).toDate(),
                    title: '',
                    userDescr: self.getEventUserDescr(),
                    urgency: 0,
                    calendar: Y.doccirrus.schemas.calendar.getDefaultCalendarId(),
                    allDay: true,
                    patient: peek( currentPatient._id ),
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
                    self.eventNotice( 'success', CREATED_APPOINTMENT );
                } else {
                    self.crmReminderCalRef( '' );
                    self.eventNotice( 'error', ERROR_CREATING_APPOINTMENT );
                }

            } ).fail( function() {
                self.eventNotice( 'error', ERROR_CREATING_APPOINTMENT );
            } );
        },
        addCrmTreatment: function( treatment ) {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            currentPatient.crmTreatments.push( treatment || {} );
        },
        addNewCrmTreatment: function() {
            var
                self = this;

            self.addCrmTreatment( {} );
        },
        showCrm: true
    }, {
        NAME: 'PatientSectionAddDataViewModel',
        ATTRS: {
            whiteList: {
                value: [
                    'crmCatalogShort',
                    'crmTags',
                    'crmAppointmentMonth',
                    '_monthList',
                    '_monthDisabled',
                    'crmAppointmentQuarter',
                    '_quarterList',
                    '_quarterDisabled',
                    'crmAppointmentYear',
                    '_yearList',
                    'crmComment',
                    'crmReminderCalRef',
                    'crmReminder',
                    'pseudonym'
                ],
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'crmTreatments',
                        editorName: 'PatientSectionAddDataCrmTreatmentsEditorViewModel'
                    }
                ],
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( PatientSectionAddDataViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'PatientSectionViewModel'
    ]
} );
