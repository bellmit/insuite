/**
 * User: do
 * Date: 01/02/18  17:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'CRLogModel', function( Y, NAME ) {
        /**
         * @module CRLogModel
         */

        var
            //TODO: translations
            i18n = Y.doccirrus.i18n,
            UNKNOWN_DEVICE = i18n( 'InvoiceMojit.crlog-api.general.UNKNOWN_DEVICE' ),
            CARD_INSURANCE_DELETED_INFO = i18n( 'InvoiceMojit.CrLogModelJS.tooltip.CARD_INSURANCE_DELETED_INFO' ),
            CARDSWIPE_DELETED_INFO = i18n( 'InvoiceMojit.CrLogModelJS.tooltip.CARDSWIPE_DELETED_INFO' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            getObject = Y.doccirrus.utils.getObject,
            KoViewModel = Y.doccirrus.KoViewModel,
            SURENAME = i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
            FORENAME = i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
            DOB = i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
            SEX = i18n( 'InCaseMojit.patient_browserJS.label.SEX' ),
            INSURANCE = i18n( 'InCaseMojit.patient_browserJS.placeholder.INSURANCE' ),
            CONTACT = i18n( 'InCaseMojit.patient_browserJS.placeholder.CONTACT' );

        function getDatatable( type, data ) {
            return Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    fillRowsToLimit: false,
                    remote: 'all' === type,
                    proxy: 'all' === type ? Y.doccirrus.jsonrpc.api.patient.getForPatientBrowser : undefined,
                    data: ('some' === type ? (data || []) : []),
                    columns: [
                        {
                            forPropertyName: 'lastname',
                            label: SURENAME,
                            isSortable: true,
                            isFilterable: true,
                            sortInitialIndex: 0,
                            width: '35%',
                            renderer: function( meta ) {
                                var data = meta.row;
                                return data.lastname + (data.nameaffix ? ', ' + data.nameaffix : '') + (data.title ? ', ' + data.title : '');
                            }
                        },
                        {
                            forPropertyName: 'firstname',
                            label: FORENAME,
                            isSortable: true,
                            isFilterable: true,
                            width: '35%'
                        },
                        {
                            forPropertyName: 'dob',
                            label: DOB,
                            width: '142px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function( meta ) {
                                var data = meta.row;
                                if( data.kbvDob ) {
                                    return data.kbvDob;
                                }
                                return moment.utc( data.dob ).local().format( 'DD.MM.YYYY' );
                            }
                        },
                        {
                            forPropertyName: 'gender',
                            label: SEX,
                            width: '60px',
                            renderer: function( meta ) {
                                var gender = meta.value;

                                switch( gender ) {
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

                            },
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect',
                                options: Y.Array.filter( Y.doccirrus.schemas.patient.types.Gender_E.list, function( item ) {
                                    return Boolean( item.val );
                                } ).map( function( item ) {
                                    var gender = item.val;

                                    switch( gender ) {
                                        case 'MALE':
                                            return {val: gender, i18n: 'm'};
                                        case 'FEMALE':
                                            return {val: gender, i18n: 'w'};
                                        case 'UNDEFINED':
                                            return {val: gender, i18n: 'x'};
                                        case 'VARIOUS':
                                            return {val: gender, i18n: 'd'};
                                        default:
                                            return {val: gender, i18n: 'u'};
                                    }
                                } ),
                                optionsCaption: '',
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'insuranceStatus.type',
                            label: INSURANCE,
                            width: '136px',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    insuranceStatus = data.insuranceStatus;

                                if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                                    return insuranceStatus.map( function( entry ) {
                                        return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', entry.type, 'i18n', '' );
                                    } ).join( ', ' );
                                }

                                return '';
                            },
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.person.types.Insurance_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'communications.value',
                            label: CONTACT,
                            width: '30%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.communications;

                                if( Array.isArray( value ) ) {
                                    value = value.map( function( communication ) {
                                        return communication.value;
                                    } );
                                    return value.join( ',<br>' );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'patientNo',
                            label:  i18n( 'patient-schema.Patient_T.patientNumber.i18n' ),
                            title:  i18n( 'patient-schema.Patient_T.patientNumber.i18n' ),
                            width: '20%',
                            isSortable: true,
                            isFilterable: true,
                            visible: false
                        }
                    ]
                }
            } );
        }

        function createModel( config ) {
            var patients = config.patients || [],
                model = {
                    nFound: patients.length,
                    select: function( type ) {
                        this.current( type );
                    },
                    all: getDatatable( 'all' ),
                    some: getDatatable( 'some', patients ),
                    current: ko.observable( 0 === patients.length ? 'all' : 'some' )
                };
            model.selected = ko.computed( function() {
                var current = model.current(),
                    selected = {
                        all: model.all.selected(),
                        some: model.some.selected()
                    };
                return selected[current];
            } );
            return model;
        }

        function CRLogModel( config ) {
            CRLogModel.superclass.constructor.call( this, config );
        }

        Y.extend( CRLogModel, KoViewModel.getBase(), {
                initializer: function CRLogModel_initializer() {
                    var self = this;

                    self.i18n = {
                        CARD_INSURANCE_DELETED_INFO: CARD_INSURANCE_DELETED_INFO,
                        CARDSWIPE_DELETED_INFO: CARDSWIPE_DELETED_INFO
                    };

                    self.patientSelection = ko.observable( null );

                    self.addDisposable( ko.computed( function() {
                        var
                            status = unwrap( self.status ),
                            matchedPatients = unwrap( self.matchedPatients );

                        if( 'MATCHING' === status ) {
                            self.patientSelection( createModel( {patients: matchedPatients} ) );
                        }

                    } ) );

                    self.selectedMatchingPatient = ko.computed( function() {
                        var selectedPatient,
                            patientSelection = unwrap( self.patientSelection );
                        if( patientSelection ) {
                            selectedPatient = patientSelection.selected();
                            return selectedPatient && selectedPatient[0];
                        }
                        return null;
                    } );

                    self.displayStatusText = ko.computed( function() {
                        var status = unwrap( self.status ),
                            str = 'Kartenlesevorgang: ' + Y.doccirrus.schemaloader.translateEnumValue( 'i18n', status, Y.doccirrus.schemas.crlog.types.Status_E.list );
                        if( 'MERGED' === status ) {
                            str += '<br/><span class="text-info">Bitte bestätigen Sie die Datenunterschiede!</span></br>';
                        }
                        return str;
                    } );

                    self.displayEventStatus = ko.computed( function() {
                        var eventStatus = unwrap( self.eventStatus ),
                            str = Y.doccirrus.schemaloader.translateEnumValue( 'i18n', eventStatus, Y.doccirrus.schemas.crlog.types.EventStatus_E.list );
                        return str;
                    } );

                    self.displayValidationStatusText = ko.computed( function() {
                        var validationStatus = unwrap( self.validationStatus );
                        return Y.doccirrus.schemaloader.translateEnumValue( 'i18n', validationStatus, Y.doccirrus.schemas.crlog.types.ValidationStatus_E.list );
                    } );

                    self.actionsText = ko.computed( function() {
                        var validationStatus = unwrap( self.validationStatus ),
                            displayValidationStatusText = unwrap( self.displayValidationStatusText );
                        if( -1 !== ['NONE', 'OK', 'INVALID_CARD'].indexOf( validationStatus ) ) {
                            return '';
                        }
                        return displayValidationStatusText;
                    } );

                    self.deviceName = ko.computed( function() {
                        var deviceName = unwrap( self.deviceName ) || UNKNOWN_DEVICE;

                        return deviceName;
                    } );

                    self.displayStatus = ko.computed( function() {
                        var status = unwrap( self.status );
                        switch( status ) {
                            case 'READ':
                            case 'MATCHED':
                            case 'MATCHING':
                            case 'PARSED':
                                return 'warning';
                            case 'APPLIED':
                                return 'success';
                            case 'CANCELLED':
                                return 'danger';
                        }
                        return null;
                    } );

                    self.displayPanelStatus = ko.computed( function() {
                        var result = 'default';

                        unwrap( self.feedback ).some( function( feed ) {
                            var level = unwrap( feed.level );
                            if( level === 'ERROR' ) {
                                result = 'danger';
                                return true;
                            }
                            if( level === 'WARNING' ) {
                                result = 'warning'; // do not stop here, only stop on error
                            }
                            if( 'warning' !== result && level === 'INFO' ) {
                                result = 'info'; // do not stop here, only stop on error
                            }
                        } );

                        return result;
                    } );

                    self.diffModel = ko.computed( function() {
                        var diff = unwrap( self.diff );
                        if( diff ) {
                            return KoViewModel.createViewModel( {
                                NAME: 'PatientDiffModel',
                                config: {
                                    data: {
                                        diff: diff,
                                        showCardInsuranceIgnoredHint: 'ONLY_ALLOW_REPLACEMENT_WITHOUT_INSURANCE' === peek( self.validationStatus ),
                                        showCardInsuranceCardSwipeIgnoredHint: 'ONLY_ALLOW_REPLACEMENT_WITHOUT_CARDSWIPE' === peek( self.validationStatus )
                                    }
                                }
                            } );
                        }
                        return null;
                    } );

                    self.addInsuranceModel = ko.computed( function() {
                        if( 'MATCHED' === unwrap( self.status ) && unwrap( self.askForCreationOfAdditionalInsurancesAfterCardread ) ) {
                            return KoViewModel.createViewModel( {
                                NAME: 'AddInsurancesModel',
                                config: {
                                    askForCreationOfAdditionalInsurancesAfterCardread: peek( self.askForCreationOfAdditionalInsurancesAfterCardread ),
                                    copyPublicInsuranceDataToAdditionalInsurance: peek( self.copyPublicInsuranceDataToAdditionalInsurance ),
                                    readInsuranceType: getObject( 'insuranceStatus.0.type', peek( self.parsedPatient ) ),
                                    matchedPatientInsuranceTypes: (getObject( peek( 'insuranceStatus', self.matchedPatients ) ) || []).map( function( insurance ) {
                                        return insurance.type;
                                    } )

                                }
                            } );
                        }
                        return null;
                    } );
                },
                openPatient: function( options ) {
                    var self = this,
                        matchedPatientId = peek( self.matchedPatientId ),
                        parent = self.get( 'parent' ),
                        url;

                    if( !matchedPatientId ) {
                        return;
                    }

                    url = '#/patient/' + matchedPatientId + '/tab/' + ((options && options.patientDetail) ? 'patient_detail' : 'casefile_browser');

                    if( options && options.samePage ) {
                        parent.closeModal();
                    }

                    window.open( url, (options && options.samePage) ? '_self' : undefined );
                },
                applyAction: function( action ) {
                    var self = this,
                        selectedMatchingPatient, parent, addInsuranceModel,
                        params = {crLogId: peek( self._id ), action: action};

                    if( 'matching_select' === action ) {
                        selectedMatchingPatient = peek( self.selectedMatchingPatient );
                        params.matchPatientId = selectedMatchingPatient && selectedMatchingPatient._id;
                        if( !params.matchPatientId ) {
                            Y.log( 'applyAction: matching patient id is not set', 'error', NAME );
                            return;
                        }
                    } else if( 'open_patient' === action ) {
                        // navigate to patient details (data section) if validation errors occurred
                        self.openPatient( {
                            patientDetail: unwrap( self.feedback ).some( function( feed ) {
                                return (unwrap( feed.code ) === '111001' || unwrap( feed.code ) === '111003');
                            } )
                        } );
                        return;
                    } else if( 'copy' === action ) {
                        parent = self.get( 'parent' );
                        if( parent ) {
                            parent.switchToCopyModal( unwrap( self.diff ) );
                        }
                        return;
                    } else if( 'add_additional_insurances' === action ) {
                        addInsuranceModel = peek( self.addInsuranceModel );
                        if( !addInsuranceModel ) {
                            return;
                        }
                        params.addInsuranceTypes = addInsuranceModel.getInsuranceTypesToAdd();
                        params.copyInsuranceTypes = addInsuranceModel.getInsuranceTypesToCopy();
                    }

                    Y.doccirrus.jsonrpc.api.crlog.applyAction( params )
                        .then( function( response ) {
                            var data = response && response.data;
                            if( data ) {
                                self.set( 'data', data );
                            }
                        } )
                        .fail( function( response ) {
                            Y.log( 'could not apply action' + JSON.stringify( params ) + ' for crLogId: ' + response, 'error', NAME );
                        } );
                },
                createEvent: function() {
                    var self = this,
                        patientId = unwrap( self.matchedPatientId );

                    if( !patientId ) {
                        Y.log( 'createEvent: no patientId passed', 'debug', NAME );
                        return;
                    }
                    Y.doccirrus.modals.chooseScheduleForAdhocEvent.show( patientId, function() {
                    } );
                },
                destructor: function CRLogModel_destructor() {
                }
            },
            {
                schemaName: 'crlog',
                NAME: 'CRLogModel'
            }
        );
        KoViewModel.registerConstructor( CRLogModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'person-schema',
            'crlog-schema',
            'PatientDiffModel',
            'dccreateadhoceventmodal',
            'AddInsurancesModel'
        ]
    }
)
;