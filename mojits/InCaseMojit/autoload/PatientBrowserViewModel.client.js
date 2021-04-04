/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _, $ */
YUI.add( 'PatientBrowserViewModel', function( Y, NAME  ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        EVENT_UPDATED = i18n( 'InCaseMojit.cardreaderJS.messages.EVENT_UPDATED' ),
        SEARCH_CARD_READER = i18n( 'InCaseMojit.patient_browserJS.button.SEARCH_CARD_READER' ),
        PLEASE_SELECT = i18n( 'InCaseMojit.patient_browserJS.button.PLEASE_SELECT' ),
        NO_CARD_READER = i18n( 'InCaseMojit.patient_browserJS.button.NO_CARD_READER' ),
        NO_TI_CARD_READER = i18n( 'InCaseMojit.patient_browserJS.button.NO_TI_CARD_READER' ),
        CHOOSE_ORGANISATIONALUNIT = i18n( 'InCaseMojit.patient_browser.label.CHOOSE_ORGANISATIONALUNIT' ),
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        ignoreDependencies = ko.ignoreDependencies,
        KoViewModel = Y.doccirrus.KoViewModel,
        InCaseMojitViewModel = KoViewModel.getConstructor( 'InCaseMojitViewModel' );

    /**
     * @constructor
     * @class PatientBrowserViewModel
     * @extends InCaseMojitViewModel
     */
    function PatientBrowserViewModel() {
        PatientBrowserViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientBrowserViewModel, InCaseMojitViewModel, {
        templateName: 'PatientBrowserViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;
            // Y.doccirrus.communication.on( {
            //     event: 'CARD/INSERTED',
            //     done: function( message ) {
            //         //console.log(message);
            //     }
            // } );
            self.deviceServerVersion = self.get('deviceServerVersion');
            self.initPatientBrowserViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;
            self.destroyWsListeners();
            self.destroyHotKeys();
        },
        initPatientBrowserViewModel: function() {
            var
                self = this;

            self.hasTiLicense = Y.doccirrus.auth.hasAdditionalService( 'inTi' );
            self.hasVsdmLicense = Y.doccirrus.auth.hasTelematikServices('VSDM');
            self.cardReadEnabled = ko.observable(true);

            if (self.hasTiLicense) {
                self.hasTiCardReaderError = ko.observable( false );
                self.tiErrorList = ko.observableArray();
                self.tiWarningList = ko.observableArray();
                self.checkTiStatusInfo();
                self.initTiErrorTable();
            }

            self.initWsListeners();
            self.initPatientTable();
            self.initCardreaderButton();
            self.initComputedIsCurrentView();
            self.doesCountryModeIncludeSwitzerland();
            self.cardReadI18n = i18n( 'InCaseMojit.patient_browser.button.CARD_READ' );
            self.cardReadCHI18n = i18n( 'InCaseMojit.patient_browser.button.CARD_READ_CH' );
            self.oldCardReaderI18n = i18n( 'InCaseMojit.patient_browser.button.OLD_CARD_READER' );
            self.labelPluggedDevicesI18n = i18n( 'InCaseMojit.patient_browser.label.PLUGGED_DEVICES' );
            self.enforeOnlineCheckI18n = i18n( 'InCaseMojit.patient_browser.label.ENFORCE_ONLINE_CHECK' );
            self.noSMCBI18n = i18n( 'InCaseMojit.patient_browser.label.NO_SMCB' );
            self.labelReadAllI18n = i18n( 'InCaseMojit.patient_browser.label.READ_ALL' );
            self.buttonNewI18n = i18n('InCaseMojit.patient_browser.button.NEW');
            self.modalTitleI18n = i18n( 'InvoiceMojit.cardreaderDS.title.MODAL_TITLE' );
        },
        initWsListeners: function() {
            Y.doccirrus.communication.on( {
                event: 'showInvalidCard',
                done: showInvalidCard,
                handlerId: 'showInvalidCardListener'
            } );

            function showInvalidCard( message ) {
                const errorCode = message.data[0] && message.data[0].errorCode,
                    errorMessage = i18n( 'InvoiceMojit.crlog-api.general.ERROR_'+errorCode || '67' ),
                    cardReadError = i18n( 'InvoiceMojit.crlog-api.general.CARD_READ_ERROR' );

                Y.doccirrus.DCWindow.notice( {
                    type: 'warn',
                    window: {width: 'small'},
                    title: cardReadError,
                    message: errorMessage
                } );
            }
        },
        destroyWsListeners: function(){
            Y.doccirrus.communication.off('showInvalidCard', 'showInvalidCardListener');
        },
        checkTiStatusInfo: function() {
            Y.doccirrus.jsonrpc.api.timanager.getCachedTiStatusInfo()
                .done(function( res ) {
                    var
                        message = '',
                        tiStatusInfo = res && res.data,
                        tiServicesVersionSupport = tiStatusInfo.tiServicesVersionSupport,
                        tiResourceInformation = tiStatusInfo.tiResourceInformation;

                    if ( tiServicesVersionSupport && !tiServicesVersionSupport.versionsSupported && !tiServicesVersionSupport.notifiedUser ) {
                        message += i18n( 'InTiMojit.tiStatusModal.serviceVersionsNotSupported' );
                    }
                    if ( tiResourceInformation && tiResourceInformation.vpnTiStatus.status !== "Online" && !tiResourceInformation.vpnTiStatus.notifiedUser ) {
                        message += i18n( 'InTiMojit.tiStatusModal.vpnTiOffline' );
                    }
                    if ( message ) {
                        message += i18n( 'InTiMojit.tiStatusModal.generalMessage' );
                        Y.doccirrus.modals.tiStatusModal.show(message);
                        Y.doccirrus.jsonrpc.api.timanager.cacheTiStatusInfo({
                            tiServicesVersionSupport: {
                                versionsSupported: tiServicesVersionSupport.versionsSupported,
                                notifiedUser: true
                            },
                            tiResourceInformation: {
                                vpnTiStatus: {
                                    status: tiResourceInformation.vpnTiStatus.status,
                                    notifiedUser: true
                                }
                            }
                        }).fail(function(err) {
                            self.close();
                            Y.log( 'Could not cache TI info: ' + err, 'debug', NAME );
                        });
                    }
                }).fail(function(err) {
                Y.log( 'Could not get TI Info: ' + err, 'debug', NAME );
            });
        },

        initComputedIsCurrentView: function() {
            var
                self = this;

            self.addDisposable( ko.computed( function() {
                var
                    isCurrentView = unwrap( self.isCurrentView );
                ignoreDependencies( function() {
                    if( isCurrentView ) {
                        self.initHotKeys();
                    }
                    else {
                        self.destroyHotKeys();
                    }
                } );
            } ) );
        },
        initHotKeys: function() {
            var
                self = this;

            self.hotKeysGroup = Y.doccirrus.HotKeysHandler.addGroup( 'PatientBrowserViewModel' );
            self.hotKeysGroup
                .on( 'ctrl+e', 'Neuen Patient', function() {
                    var
                        binder = self.get( 'binder' );
                    binder.navigateToNewPatient();
                } )
                .on( 'ctrl+k', 'springt zu Kalender ', function() {
                    var
                        binder = self.get( 'binder' );
                    binder.navigateToCalendar();
                } );

        },
        destroyHotKeys: function() {
            var
                self = this;
            // refresh variable after tab changed
            self.firstTime = true;
            if( self.hotKeysGroup ) {
                self.hotKeysGroup
                    .un( 'ctrl+e' )
                    .un( 'ctrl+k' );
                self.hotKeysGroup = null;
            }
        },
        /**
         * @property patientTable
         * @type {null|KoTable}
         */
        patientTable: null,
        /** @protected */
        initPatientTable: function() {
            var
                self = this,
                userFilter = Y.doccirrus.utils.getFilter(),
                filterQuery = userFilter && userFilter.location && { "insuranceStatus.locationId": userFilter.location },
                patientTable;

            //flag variable EXTMOJ-1428
            self.firstTime = true;

            function renderAdditionalNumber( partnerIds ) {
                if( Array.isArray( partnerIds ) && partnerIds.length ) {
                    return partnerIds.filter( function( item ) {
                        return item.patientId;
                    } ).map( function( entry ) {
                        if( entry.extra ) {
                            return ( entry.patientId ) + " (" + entry.extra + ")";
                        } else if( entry.partnerId ) {
                            return ( entry.patientId ) + " (" + Y.doccirrus.schemaloader.getEnumListTranslation( 'patient', 'PartnerIdsPartnerId_E', entry.partnerId, 'i18n', '' ) + ")";
                        } else {
                            return ( entry.patientId );
                        }
                    } ).join( ', ' );
                }

                return '';

            }

            function renderInsuranceNo( insuranceStatus ) {
                if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                    return insuranceStatus.filter( function( insurance ) {
                        return insurance.insuranceNo || insurance.kvkHistoricalNo;
                    } ).map( function( insurance ) {
                        var insuranceNo = insurance.insuranceNo || insurance.kvkHistoricalNo;
                        if( insurance.type ) {
                            return insuranceNo + ' (' + Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', insurance.type, 'i18n', '' ) + ')';
                        } else {
                            return insuranceNo;
                        }
                    } ).join( ', ' );
                }
                return '';
            }

            function getPartnerList() {
                var list = Y.doccirrus.schemas.patient.types.PartnerIdsPartnerId_E.list;
                list.push( {
                    "val": "cardioHeartFailure",
                    "i18n": i18n( 'patient-schema.Patient_T.cardioHeartFailure.i18n' )
                }, {
                    "val": "cardioCryptogenicStroke",
                    "i18n": i18n( 'patient-schema.Patient_T.cardioCryptogenicStroke.i18n' )
                }, {
                    "val": "cardioCHD",
                    "i18n": i18n( 'patient-schema.Patient_T.cardioCHD.i18n' )
                } );
                return list;
            }

            self.patientTable = patientTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-incase-table',
                    pdfTitle: i18n( 'InCaseMojit.patient_browserJS.pdfTitle' ),
                    stateId: 'CaseFileMojit-CasefileNavigationBinderIndex-patientTable',
                    states: ['limit', 'usageShortcutsVisible'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.patient.getForPatientBrowser,
                    baseParams: { query: filterQuery, patientTable: true },
                    limitList: [5, 10, 20, 30, 40, 50],
                    sortersLimit: 2,
                    columns: [
                        {
                            componentType: 'KoTableColumnRenderer',
                            forPropertyName: 'KoTableColumnRenderer',
                            width: '32px'
                        },
                        {
                            forPropertyName: 'lastname',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                            width: '35%',
                            isSortable: true,
                            sortInitialIndex: 0,
                            isFilterable: true,
                            collation:{ locale: 'de', strength: 2, numericOrdering:true},
                            renderer: function( meta ) {
                                if( this && this.filterField && self.firstTime ) {
                                    this.filterField.hasFocus(true);
                                }
                                self.firstTime = false;
                                var data = meta.row;
                                return data.lastname + (data.nameaffix ? ', ' + data.nameaffix : '') + (data.title ? ', ' + data.title : '');
                            }
                        },
                        {
                            forPropertyName: 'firstname',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                            width: '35%',
                            isSortable: true,
                            sortInitialIndex: 1,
                            isFilterable: true,
                            collation:{ locale: 'de', strength: 2, numericOrdering:true}
                        },
                        {
                            forPropertyName: 'dob',
                            label: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                            width: '170px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                                    autoCompleteDateRange: true
                                }
                            },
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
                            label: i18n( 'InCaseMojit.patient_browserJS.label.SEX' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.label.SEX' ),
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
                                            return { val: gender, i18n: 'm' };
                                        case 'FEMALE':
                                            return { val: gender, i18n: 'w' };
                                        case 'UNDEFINED':
                                            return { val: gender, i18n: 'x' };
                                        case 'VARIOUS':
                                            return { val: gender, i18n: 'd' };
                                        default:
                                            return { val: gender, i18n: 'u' };
                                    }
                                } ),
                                optionsCaption: '',
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'insuranceStatus.type',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.INSURANCE' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.INSURANCE' ),
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
                                options: Y.doccirrus.schemaloader.filterEnumByCountryMode(Y.doccirrus.schemas.person.types.Insurance_E.list),
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'communications.value',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.CONTACT' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.CONTACT' ),
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
                            forPropertyName: 'nextAppointment',
                            isSortable: true,
                            label: i18n( 'InCaseMojit.patient_browserJS.label.APPOINTMENT' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.label.APPOINTMENT' ),
                            width: '126px',
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'InCaseMojit.patient_browserJS.label.APPOINTMENT' ),
                                    autoCompleteDateRange: true
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    value = meta.value;

                                if( value ) {
                                    if( moment( value ).isAfter( moment().startOf( 'day' ) ) ) {
                                        return moment( value ).format( 'DD.MM.YYYY HH:mm' );
                                    }
                                    return '';
                                }
                                return '';
                            }
                        },
                        {
                            forPropertyName: 'patientNo',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.NUMBER' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.NUMBER' ),
                            width: '100px',
                            isSortable: true,
                            isFilterable: true,
                            collation: { locale: 'de', numericOrdering: true }
                        },
                        {
                            forPropertyName: 'age',
                            label: i18n( 'InCaseMojit.patient_browserJS.label.AGE' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.label.AGE' ),
                            width: '60px',
                            visible: false,
                            isSortable: true,
                            renderer: function( meta ) {
                                var dob = meta.row.dob,
                                    dod = meta.row.dateOfDeath;
                                return Y.doccirrus.schemas.patient.ageFromDob( dob, dod );
                            }
                        },
                        {
                            forPropertyName: 'insuranceStatus.insuranceName',
                            label: i18n( 'person-schema.InsuranceStatus_T.insuranceName' ),
                            title: i18n( 'person-schema.InsuranceStatus_T.insuranceName' ),
                            width: '30%',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.insuranceStatus;

                                if( Array.isArray( value ) ) {
                                    value = value.filter( function( communication ) {
                                        return Boolean( communication.insuranceName );
                                    } ).map( function( communication ) {
                                        return communication.insuranceName;
                                    } );
                                    return value.join( ',<br>' );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.0.street',
                            label: i18n( 'person-schema.Address_T.street' ),
                            title: i18n( 'person-schema.Address_T.street' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].street;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.0.houseno',
                            label: i18n( 'person-schema.Address_T.houseno' ),
                            title: i18n( 'person-schema.Address_T.houseno' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].houseno;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.0.zip',
                            label: i18n( 'person-schema.Address_T.zip' ),
                            title: i18n( 'person-schema.Address_T.zip' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].zip;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.0.postbox',
                            label: i18n( 'person-schema.Address_T.postbox' ),
                            title: i18n( 'person-schema.Address_T.postbox' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].postbox;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.0.city',
                            label: i18n( 'person-schema.Address_T.city' ),
                            title: i18n( 'person-schema.Address_T.city' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].city;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'addresses.0.country',
                            label: i18n( 'person-schema.Address_T.country' ),
                            title: i18n( 'person-schema.Address_T.country' ),
                            width: '10%',
                            isSortable: false,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.addresses;

                                if( Array.isArray( value ) ) {
                                    return value[0] && value[0].country;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'partnerIds.partnerId',
                            label: i18n( 'patient-schema.PartnerIdsPartnerId_E.i18n' ),
                            title: i18n( 'patient-schema.PartnerIdsPartnerId_E.i18n' ),
                            width: '136px',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    partnerIds = data.partnerIds,
                                    partnerIdsArr = [];

                                if( Array.isArray( partnerIds ) && partnerIds.length ) {
                                    partnerIdsArr = partnerIds.filter( function( item ){ return item.partnerId; } ).map( function( entry ) {
                                        return Y.doccirrus.schemaloader.getEnumListTranslation( 'patient', 'PartnerIdsPartnerId_E', entry.partnerId, 'i18n', '' );
                                    } );
                                }
                                if( data.cardioHeartFailure ) {
                                    partnerIdsArr.push( i18n( 'patient-schema.Patient_T.cardioHeartFailure.i18n' ) );
                                }
                                if( data.cardioCryptogenicStroke ) {
                                    partnerIdsArr.push( i18n( 'patient-schema.Patient_T.cardioCryptogenicStroke.i18n' ) );
                                }
                                if( data.cardioCHD) {
                                    partnerIdsArr.push( i18n( 'patient-schema.Patient_T.cardioCHD.i18n' ) );
                                }
                                if( partnerIdsArr.length ) {
                                    return partnerIdsArr.join( ', ' );
                                }

                                return '';
                            },
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: getPartnerList(),
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'partnerIds.asvTeamNumbers',
                            label: i18n( 'patient-schema.Patient_T.asvTeamNumbers.i18n' ),
                            title: i18n( 'patient-schema.Patient_T.asvTeamNumbers.i18n' ),
                            width: '136px',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    partnerIds = data.partnerIds,
                                    result = '';

                                if( Array.isArray( partnerIds ) && partnerIds.length ) {
                                    partnerIds.some( function( item ) {
                                        if( Y.doccirrus.schemas.patient.PartnerIdsPartnerId.ASV === item.partnerId ) {
                                            result = item.asvTeamNumbers.join( ', ' );
                                        }
                                    } );
                                }

                                return result;
                            }
                        },
                        {
                            forPropertyName: 'comment',
                            label: i18n( 'person-schema.Person_T.comment' ),
                            title: i18n( 'person-schema.Person_T.comment' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true,
                            visible: false
                        },
                        {
                            forPropertyName: 'partnerIds.patientId',
                            label: i18n( 'patient-schema.Patient_T.further_number' ),
                            title: i18n( 'patient-schema.Patient_T.further_number' ),
                            width: '20%',
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    partnerIds = data.partnerIds;

                                return renderAdditionalNumber( partnerIds );
                            }
                        },
                        {
                            forPropertyName: 'locationName',
                            label: i18n( 'person-schema.InsuranceStatus_T.locationId' ),
                            title: i18n( 'person-schema.InsuranceStatus_T.locationId' ),
                            width: '30%',
                            isSortable: false,
                            isFilterable: true,
                            visible: false,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                select2Config: {
                                    query: function( query ) {
                                        Y.doccirrus.jsonrpc.api.location.read( {
                                            query: {
                                                locname: {
                                                    $regex: query.term,
                                                    $options: 'i'
                                                }
                                            },
                                            options: {
                                                itemsPerPage: 15
                                            },
                                            fields: ['locname']
                                        } ).done( function( response ) {
                                            var data = response && response.data || [];

                                            query.callback( {
                                                results: data.map( function( item ) {
                                                    return {
                                                        id: item._id,
                                                        text: item.locname
                                                    };
                                                } )
                                            } );
                                        } );
                                    },
                                    initSelection: function( element, callback ) {
                                        var
                                            value = element.val(),
                                            ids = value && value.split( ',' ) || [];

                                        Y.doccirrus.jsonrpc.api.location.read( {
                                            query: {
                                                _id: { $in: ids }
                                            }
                                        } ).done( function( response ) {
                                            var data = response && response.data || [];

                                            data = data.map( function( item ) {
                                                return {
                                                    id: item._id,
                                                    text: item.locname
                                                };
                                            } );
                                            callback( data );
                                        } );
                                    }

                                },
                                optionsText: 'text',
                                optionsValue: 'id'
                            },
                            renderer: function( meta ) {
                                var data = meta.row,
                                    locations = data.locationName;
                                if( Array.isArray( locations ) && locations.length ) {
                                    return locations.join( ', ' );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'employees',
                            label: i18n( 'patient-schema.Patient_T.physicians' ),
                            title: i18n( 'patient-schema.Patient_T.physicians' ),
                            width: '30%',
                            isSortable: false,
                            isFilterable: true,
                            visible: false,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                select2Config: {
                                    query: function( query ) {
                                        Y.doccirrus.jsonrpc.api.employee.read( {
                                            query: {
                                                $or: [
                                                    {
                                                        firstname: {
                                                            $regex: query.term,
                                                            $options: 'i'
                                                        }
                                                    }, {
                                                        lastname: {
                                                            $regex: query.term,
                                                            $options: 'i'
                                                        }
                                                    }]
                                            },
                                            includeAll: true,
                                            options: {
                                                itemsPerPage: 15
                                            },
                                            fields: ['firstname', 'lastname']
                                        } ).done( function( response ) {
                                            var data = response && response.data || [];

                                            query.callback( {
                                                results: data.map( function( item ) {
                                                    return {
                                                        id: item._id,
                                                        text: item.firstname + ' ' + item.lastname
                                                    };
                                                } )
                                            } );
                                        } );
                                    },
                                    initSelection: function( element, callback ) {
                                        var
                                            value = element.val(),
                                            ids = value && value.split( ',' ) || [];

                                        Y.doccirrus.jsonrpc.api.employee.read( {
                                            query: {
                                                _id: { $in: ids }
                                            },
                                            includeAll: true
                                        } ).done( function( response ) {
                                            var data = response && response.data || [];

                                            data = data.map( function( item ) {
                                                return {
                                                    id: item._id,
                                                    text: item.firstname + ' ' + item.lastname
                                                };
                                            } );
                                            callback( data );
                                        } );
                                    }

                                },
                                optionsText: 'text',
                                optionsValue: 'id'
                            },
                            renderer: function( meta ) {
                                var data = meta.row,
                                    employees = data.employeesArray;
                                if( Array.isArray( employees ) && employees.length ) {
                                    return employees.join( ', ' );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'dob_DD',
                            label: i18n( 'InCaseMojit.patient_browserJS.label.DOB_DD' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.DOB_DD' ),
                            width: '60px',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var data = meta.row;

                                return data.dob_DD;
                            }
                        },
                        {
                            forPropertyName: 'dob_MM',
                            label: i18n( 'InCaseMojit.patient_browserJS.label.DOB_MM' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.DOB_MM' ),
                            width: '60px',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var data = meta.row;

                                return  data.dob_MM;
                            }
                        },
                        {
                            forPropertyName: 'patientSince',
                            label: i18n( 'InCaseMojit.patient_browserJS.label.PATIENT_SINCE' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.label.PATIENT_SINCE' ),
                            width: '170px',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'InCaseMojit.patient_browserJS.label.PATIENT_SINCE' ),
                                    autoCompleteDateRange: true
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    patientSince = meta.value;

                                if( patientSince ) {
                                    return moment( patientSince ).format( 'DD.MM.YYYY' );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'dateOfDeathOrInActive',
                            label: i18n( 'patient-schema.Patient_T.dateOfDeathOrInActive' ),
                            title: i18n( 'patient-schema.Patient_T.dateOfDeathOrInActive' ),
                            width: '120px',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'patient-schema.Patient_T.dateOfDeathOrInActive' ),
                                    autoCompleteDateRange: true
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    dateOfDeathOrInActive = data.dateOfDeath || data.dateOfInActive;

                                if( dateOfDeathOrInActive ) {
                                    return moment.utc( dateOfDeathOrInActive ).local().format( TIMESTAMP_FORMAT );
                                }
                                return '';
                            }
                        },
                        {
                            forPropertyName: 'pseudonym',
                            label: i18n( 'patient-schema.Patient_T.pseudonym.i18n' ),
                            title: i18n( 'patient-schema.Patient_T.pseudonym.i18n' ),
                            width: '120px',
                            isSortable: true,
                            isFilterable: true,
                            visible: false
                        },
                        {
                            forPropertyName: 'insuranceStatus.insuranceNo',
                            label: i18n( 'person-schema.InsuranceStatus_T.insuranceNo' ),
                            title: i18n( 'person-schema.InsuranceStatus_T.insuranceNo' ),
                            width: '150px',
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    insuranceStatus = data && data.insuranceStatus;

                                return renderInsuranceNo( insuranceStatus );
                            }
                        }
                    ],
                    responsive: false,
                    tableMinWidth: ko.computed( function() {
                        var
                            initializedColumns = patientTable.columns.peek(),
                            visibleColumns = initializedColumns.filter( function( col ) {
                                return ko.unwrap( col.visible );
                            } ),
                            tableMinWidth = 0;

                        // only "tableMinWidth" when those columns are visible
                        if( !Y.Array.find( visibleColumns, function( col ) {
                                if( col.forPropertyName === 'age' ||
                                    col.forPropertyName === 'insuranceStatus.insuranceName' ||
                                    col.forPropertyName === 'addresses.street' ||
                                    col.forPropertyName === 'addresses.houseno' ||
                                    col.forPropertyName === 'addresses.zip' ||
                                    col.forPropertyName === 'addresses.postbox' ||
                                    col.forPropertyName === 'addresses.city' ||
                                    col.forPropertyName === 'addresses.country' ||
                                    col.forPropertyName === 'partnerIds.partnerId'
                                ) {
                                    return true;
                                }
                                return false;
                            } ) ) {
                            patientTable.responsive( true );
                            return '';
                        }
                        else {
                            patientTable.responsive( false );
                        }

                        visibleColumns.forEach( function( col ) {
                            var
                                width = ko.utils.peekObservable( col.width ) || '';

                            if( width.indexOf( '%' ) > 0 ) {
                                tableMinWidth += 200;
                            }
                            else {
                                tableMinWidth += parseInt( width, 10 );
                            }
                        } );

                        return tableMinWidth + 'px';
                    }, null, { deferEvaluation: true } ).extend( { rateLimit: 0 } ),
                    onRowClick: function( meta/*, $event*/ ) {
                        var
                            binder = self.get( 'binder' );

                        binder.navigateToCaseFileBrowser( { patientId: meta.row._id } );

                        return false;
                    },
                    onRowContextMenu: function( meta, $event ) {
                        if( !meta.isLink ) {
                            var // eslint-disable-line no-inner-declarations
                                contextMenu = new Y.doccirrus.DCContextMenu( {
                                    menu: [
                                        new Y.doccirrus.DCContextMenuItem( {
                                            text: i18n( 'InCaseMojit.patient_browserJS.menu.openPatientInTab.text' ),
                                            href: '#/patient/' + meta.row._id + '/tab/casefile_browser',
                                            target: '#/patient/' + meta.row._id + '/tab/casefile_browser',
                                            click: function() {
                                                window.open( this.href, this.target );
                                                contextMenu.close();
                                            }
                                        } )
                                    ]
                                } );

                            contextMenu.showAt( $event.pageX, $event.pageY );
                            $event.preventDefault();

                            return false;
                        }
                    }
                }
            } );

        },
        doesCountryModeIncludeSwitzerland: function() {
            var self = this;
            if ( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                self.CH_countryMode( true );
            }
        },
        initCardreaderButton: function() {
            var
                cachedOrganisationalUnit,
                tmpOrganisationalUnits,
                tmpLen,
                i,
                j,
                tmpMandantId,
                relevantCardTerminals,
                card,
                term,
                latestTiCardTerminalUsed,
                diffForLatestTiCardTerminalUsed,
                self = this,
                tiCardTerminalsList,
                smcbCardsList,
                unit,
                misconfiguredTi = false,
                listOfMisconfiguredSMCBs = [];

            function mapMandantId( terminal ) {
                return tmpMandantId === terminal.context.MandantId;
            }

            function askForDSLists() {
                self.loadingCR( true );
                self.cardreaderList( [] );

                Y.doccirrus.jsonrpc.api.cardreaderconfiguration.getRegisteredCardreaders()
                    .done( function( response ) {
                        function getOnlineCardreaders() {
                            if( response.data.registeredCardreaders.length > 0 ) {
                                Y.doccirrus.communication.apiCall( {
                                    method: 'dscrmanager.getOnlineCardreadersList',
                                    data: {
                                        registeredCardreaders: response.data.registeredCardreaders,
                                        deviceServers: response.data.deviceServers
                                    }
                                }, function( err, msg ) {
                                    if( err ) {
                                        // This api should never return error.
                                        Y.doccirrus.DCSystemMessages.addMessage( {
                                            content: i18n( 'DeviceMojit.tab_cardreader.errors.onlineCardReadersError' ),
                                            level: 'ERROR'
                                        } );
                                        return;
                                    }

                                    var onlineCardreadersList = msg.data;
                                    var latestCardreaderUsed = localStorage.getItem( 'latestCardreaderUsed' ) ? JSON.parse( localStorage.getItem( 'latestCardreaderUsed' ) ) : null;
                                    var lastDeviceList = unwrap( self.lastDeviceList() );
                                    self.cardreaderList( [] );

                                    onlineCardreadersList.forEach( function( cardreader ) {
                                        if( lastDeviceList.length === 0 && latestCardreaderUsed && latestCardreaderUsed.name === cardreader.name ) {
                                            self.lastDeviceList( [JSON.parse( localStorage.getItem( 'latestCardreaderUsed' ) )] );
                                            self.emptyMessage( cardreader.name );
                                        }
                                        cardreader.text = cardreader.name;
                                        cardreader.source = '';
                                        cardreader.host = '';
                                        self.cardreaderList.push( cardreader );
                                    } );

                                    //if self.lastDeviceList is still empty, show no found cardreader message
                                    if( unwrap( self.cardreaderList ).length === 0 ) {
                                        self.emptyMessage( NO_CARD_READER );
                                    } else if( !unwrap( self.lastDeviceList ).length ) {
                                        self.emptyMessage( onlineCardreadersList[0].name );
                                        self.lastDeviceList( [onlineCardreadersList[0]] );
                                    }

                                    Y.doccirrus.communication.once( {
                                        event: 'inspectDevicesChange',
                                        done: function() {
                                            Y.doccirrus.ajax.disableBlocking();
                                            self.lastDeviceList( [] );
                                            getOnlineCardreaders();
                                            Y.doccirrus.ajax.enableBlocking();
                                        }
                                    } );

                                    Y.doccirrus.communication.emit( 'inspectDevicesChange', {data: {}} ); //just to register the user

                                } );
                            }
                            // else {
                            //     self.receivedListFromNew(true);
                            // }
                        }

                        function getSwissCardReaderList() {
                            if( response.data.registeredCardreaders.length > 0 ) {
                                Y.doccirrus.communication.apiCall( {
                                    method: 'dscrmanager.getSmartCardReaderList',
                                    data: {
                                        registeredCardreaders: response.data.registeredCardreaders,
                                        deviceServers: response.data.deviceServers
                                    }
                                }, function( err, msg ) {
                                    if( err ) {
                                        // This api should never return error.
                                        Y.doccirrus.DCSystemMessages.addMessage( {
                                            content: i18n( 'DeviceMojit.tab_cardreader.errors.onlineCardReadersError' ),
                                            level: 'ERROR'
                                        } );
                                        return;
                                    }

                                    var onlineCardreadersList = msg.data;
                                    var latestCardreaderUsed = localStorage.getItem( 'latestCardreaderUsed' ) ? JSON.parse( localStorage.getItem( 'latestCardreaderUsed' ) ) : null;
                                    var lastDeviceList = unwrap( self.lastDeviceList() );

                                    onlineCardreadersList.forEach( function( cardreader ) {
                                        if( lastDeviceList.length === 0 && latestCardreaderUsed && latestCardreaderUsed.name === cardreader.name ) {
                                            self.lastDeviceList( [JSON.parse( localStorage.getItem( 'latestCardreaderUsed' ) )] );
                                            self.emptySwissMsg( cardreader.name );
                                        }
                                        cardreader.text = cardreader.name;
                                        cardreader.source = '';
                                        cardreader.host = '';
                                        cardreader.mobile = false;
                                        self.swissCardReaderList.push( cardreader );
                                    } );
                                    //if self.lastDeviceList is still empty, show no found cardreader message
                                    if( unwrap( self.swissCardReaderList ).length === 0 ) {
                                        self.emptySwissMsg( NO_CARD_READER );
                                    } else if( !unwrap( self.lastDeviceList ).length ) {
                                        self.emptySwissMsg( onlineCardreadersList[0].name );
                                        self.lastDeviceList( [onlineCardreadersList[0]] );
                                    }

                                    Y.doccirrus.communication.once( {
                                        event: 'inspectDevicesChange',
                                        done: function() {
                                            Y.doccirrus.ajax.disableBlocking();
                                            self.lastDeviceList( [] );
                                            getOnlineCardreaders();
                                            Y.doccirrus.ajax.enableBlocking();
                                        }
                                    } );

                                    Y.doccirrus.communication.emit( 'inspectDevicesChange', {data: {}} ); //just to register the user

                                } );
                            }
                        }

                        if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                            self.swissCardReaderList( [] );
                            getSwissCardReaderList();
                        }
                        if( Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                            getOnlineCardreaders();
                        }

                        self.loadingCR( false );
                    } )
                    .fail( function() { // device server not running or not registered
                        self.loadingCR( false );
                    } );

                if( self.hasTiLicense ) {
                    self.enforceOnlineCheck = ko.observable( false );
                    self.modeOnlineCheck = ko.observable();
                    self.showEnforceOnlineCheck = ko.computed( function() {
                        return self.modeOnlineCheck() !== 'ALWAYS';
                    } );
                    self.selectedOrganisationalUnit = ko.observable( {} );
                    self.organisationalUnits = ko.observableArray();
                    self.organisationalunitsLookUpTable = ko.observableArray();
                    self.smcbCardsLookUpTable = [];
                    self.tiCardTerminalsList = ko.observableArray();
                    self.latestTiCardTerminalUsed = ko.observableArray();
                    self.tiCardTerminalsFullList = ko.observableArray();
                    self.organisationalUnitText = ko.computed( function() {
                        return (self.selectedOrganisationalUnit() && self.selectedOrganisationalUnit().MandantName) || CHOOSE_ORGANISATIONALUNIT;
                    } );

                    Y.doccirrus.communication.apiCall( {
                        method: 'ticontext.tiForPatientBrowser'
                    }, function( err, res ) {
                        if( err ) {
                            Y.log( 'TI-getConfigurationParameters: Error in getting configuration parameters in patient browser: ' + err, 'error', NAME );
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: 'tiForPatientBrowser',
                                content: Y.doccirrus.errorTable.getMessages( err ),
                                level: 'WARNING'
                            } );
                        } else if( res && res.data ) {
                            tiCardTerminalsList = res.data.result;
                            smcbCardsList = res.data.SMCBCards;
                            self.smcbCardsLookUpTable = smcbCardsList;
                            tmpLen = Object.keys( smcbCardsList );

                            for( i = 0; i < tmpLen.length; i++ ) {
                                tmpMandantId = tmpLen[i];
                                if( smcbCardsList[tmpMandantId].length > 1 ) {
                                    misconfiguredTi = true;
                                    listOfMisconfiguredSMCBs.push( tmpMandantId );
                                }
                                relevantCardTerminals = tiCardTerminalsList && tiCardTerminalsList.filter( mapMandantId );

                                for( j = 0; j < (relevantCardTerminals && relevantCardTerminals.length); j++ ) {
                                    card = smcbCardsList[tmpLen[i]] &&
                                           Array.isArray( smcbCardsList[tmpLen[i]] ) &&
                                           smcbCardsList[tmpLen[i]].length &&
                                           smcbCardsList[tmpLen[i]][0];
                                    term = relevantCardTerminals[j];

                                    Y.doccirrus.jsonrpc.api.timanager.pinOperation( {
                                        data: {
                                            context: term && term.context,
                                            CardHandle: card && card.CardHandle,
                                            CtName: term && term.CtNames && Array.isArray( term.CtNames ) &&
                                                    term.CtNames.length && term.CtNames[0],
                                            action: 'GetPinStatus',
                                            terminal: term,
                                            card: card,
                                            CtId: term && term.CtIds && Array.isArray( term.CtIds ) &&
                                                  term.CtIds.length && term.CtIds[0]
                                        }
                                    } )
                                        .done( function( response ) {
                                            var
                                                pinStatus = response.data && response.data.result && response.data.result.PinStatus,
                                                originalParams = response.data && response.data.originalParams,
                                                terminal = originalParams && originalParams.terminal,
                                                card = originalParams && originalParams.card,
                                                innerContext = terminal && terminal.context,
                                                CtNames = terminal && terminal.CtNames,
                                                CtId = originalParams && originalParams.CtId,
                                                innerCtName = Array.isArray( CtNames ) && CtNames.length && CtNames[0],
                                                cardHandle = card && card.CardHandle;

                                            if( pinStatus === 'VERIFIABLE' ) {
                                                self.tiErrorList.push( {
                                                    message: Y.doccirrus.errorTable.getMessage( {code: '114003041'} ),
                                                    methodToCall: 'VerifyPin',
                                                    context: innerContext,
                                                    CtId: CtId,
                                                    CtName: innerCtName,
                                                    CardHandle: cardHandle
                                                } );
                                            } else if( pinStatus === 'BLOCKED' ) {
                                                self.tiErrorList.push( {
                                                    message: Y.doccirrus.errorTable.getMessage( {code: '114003041'} ),
                                                    methodToCall: 'UnblockPin',
                                                    context: innerContext,
                                                    CtId: CtId,
                                                    CtName: innerCtName,
                                                    CardHandle: cardHandle
                                                } );
                                            }
                                        } )
                                        .fail( function( err ) {
                                            var
                                                errCode = (err.data && err.data.err &&
                                                           err.data.err.root && err.data.err.root.Envelope &&
                                                           err.data.err.root.Envelope.Body &&
                                                           err.data.err.root.Envelope.Body.Fault &&
                                                           err.data.err.root.Envelope.Body.Fault.detail &&
                                                           err.data.err.root.Envelope.Body.Fault.detail.Error &&
                                                           err.data.err.root.Envelope.Body.Fault.detail.Error.Trace &&
                                                           err.data.err.root.Envelope.Body.Fault.detail.Error.Trace.Code &&
                                                           err.data.err.root.Envelope.Body.Fault.detail.Error.Trace.Code) || err.code,
                                                errMessage = (err.data && err.data.err &&
                                                              err.data.err.root && err.data.err.root.Envelope &&
                                                              err.data.err.root.Envelope.Body &&
                                                              err.data.err.root.Envelope.Body.Fault &&
                                                              err.data.err.root.Envelope.Body.Fault.faultstring) || err.message,
                                                context = err.data &&
                                                          err.data.originalParams && err.data.originalParams.context,
                                                CtName = err.data &&
                                                         err.data.originalParams && err.data.originalParams.CtName;

                                            self.tiErrorList.push( {
                                                error: {
                                                    connectorErrorCode: errCode
                                                },
                                                message: i18n( 'InTiMojit.tiConfigurations.unknownConnectorErrorMessage.i18n', {
                                                    data: {
                                                        errorCode: errCode,
                                                        errorMessage: errMessage
                                                    }
                                                } ),
                                                context: context,
                                                CtName: CtName
                                            } );
                                            Y.log( 'TI--pinOperation: Error in checking Pin Status of SMC-B Card: ' + err, 'error', NAME );
                                        } );
                                }
                            }

                            if( misconfiguredTi ) {
                                self.tiErrorList.push( {
                                    message: i18n( 'InTiMojit.tiConfigurations.misconfiguredTiMessage', {
                                        data: {
                                            smcbs: listOfMisconfiguredSMCBs.join( ', ' )
                                        }
                                    } )
                                } );
                            }

                            if( tiCardTerminalsList && Array.isArray(tiCardTerminalsList) && tiCardTerminalsList.length ){
                                tiCardTerminalsList.forEach( function( cardTerminal ) {
                                    var {
                                        connectorErrorCode: connectorErrorCode,
                                        inSuiteErrorMessage: inSuiteErrorMessage,
                                        invalidParam: invalidParam,
                                        unlinkedParam: unlinkedParam,
                                        invalidParamValue: invalidParamValue,
                                        unlinkedParamValue: unlinkedParamValue
                                    } = cardTerminal;

                                    var errorExists = connectorErrorCode || inSuiteErrorMessage || invalidParam || unlinkedParam || invalidParamValue || unlinkedParamValue;
                                    self.hasTiCardReaderError( !!errorExists );

                                    if( errorExists ) {
                                        if( connectorErrorCode ) {
                                            self.tiErrorList.push( {
                                                error: {
                                                    connectorErrorCode: connectorErrorCode
                                                },
                                                message: i18n( 'InTiMojit.tiConfigurations.unknownConnectorErrorMessage.i18n', {
                                                    data: {
                                                        errorCode: connectorErrorCode,
                                                        errorMessage: Y.doccirrus.errorTable.getMessage( {code: '11400' + connectorErrorCode} )
                                                    }
                                                } ),
                                                context: cardTerminal.context,
                                                CtName: cardTerminal.CtNames[0]
                                            } );
                                        }
                                        if( invalidParam ) {
                                            self.tiErrorList.push( {
                                                error: {
                                                    invalidParam: invalidParam,
                                                    invalidParamValue: invalidParamValue
                                                },
                                                message: i18n( 'InTiMojit.tiConfigurations.invalidParamErrorMessage.i18n', {
                                                    data: {
                                                        invalidParam: invalidParam,
                                                        invalidParamValue: invalidParamValue
                                                    }
                                                } ),
                                                context: cardTerminal.context,
                                                CtName: cardTerminal.CtNames[0]
                                            } );
                                        }
                                        if( unlinkedParam ) {
                                            self.tiWarningList.push( {
                                                error: {
                                                    unlinkedParam: unlinkedParam,
                                                    unlinkedParamValue: unlinkedParamValue,
                                                    MandantId: cardTerminal.context.MandantId
                                                },
                                                message: i18n( 'InTiMojit.tiConfigurations.unlinkedParamWarningMessage.i18n', {
                                                    data: {
                                                        unlinkedParam: unlinkedParam,
                                                        unlinkedParamValue: unlinkedParamValue,
                                                        MandantId: cardTerminal.context.MandantId
                                                    }
                                                } ),
                                                context: cardTerminal.context,
                                                CtName: cardTerminal.CtNames[0]
                                            } );
                                        }
                                        if( inSuiteErrorMessage ) {
                                            self.tiErrorList.push( {
                                                error: {
                                                    inSuiteErrorMessage: inSuiteErrorMessage
                                                },
                                                message: i18n( 'InTiMojit.tiConfigurations.inSuiteErrorMessage.i18n', {
                                                    data: {
                                                        inSuiteErrorMessage: inSuiteErrorMessage
                                                    }
                                                } ),
                                                context: cardTerminal.context,
                                                CtName: cardTerminal.CtNames[0]
                                            } );
                                        }
                                    }

                                    cardTerminal.mobile = false;
                                    cardTerminal.CtIds.forEach( function( cardTerminalId, iterator ) {
                                        var uniqueText = cardTerminal.CtNames[iterator] + ' ( ' + (cardTerminal.context && cardTerminal.context.WorkplaceId) + ' | ' + (cardTerminal.context && cardTerminal.context.MandantId) + ')';
                                        var cardTerminalText = cardTerminal.CtNames[iterator] + ' ( ' + (cardTerminal.context && cardTerminal.context.WorkplaceName) + ' )';
                                        var tiObj = {
                                            CtId: cardTerminalId,
                                            context: cardTerminal.context,
                                            mobile: false,
                                            organisationalUnitName: cardTerminal.context && cardTerminal.context.MandantId,
                                            text: cardTerminalText,
                                            uniqueText: uniqueText,
                                            tiCardReaderName: cardTerminalId,
                                            workStationName: cardTerminal.context && cardTerminal.context.WorkplaceId
                                        };
                                        self.tiCardTerminalsFullList.push( tiObj );
                                    } );

                                    self.organisationalUnits( self.organisationalUnits().concat( cardTerminal._id || [] ) );
                                    self.organisationalunitsLookUpTable( self.organisationalunitsLookUpTable().concat( cardTerminal._id || [] ) );
                                } );
                            }

                            self.organisationalUnits( _.sortBy( _.uniq( unwrap( self.organisationalUnits ), 'MandantId' ), 'MandantId' ) );
                            self.tiCardTerminalsFullList( _.sortBy( _.uniq( unwrap( self.tiCardTerminalsFullList ), 'uniqueText' ), 'uniqueText' ) );

                            tmpOrganisationalUnits = unwrap( self.organisationalUnits );
                            if( tmpOrganisationalUnits && Array.isArray( tmpOrganisationalUnits ) && tmpOrganisationalUnits.length === 1 ) {
                                unit = tmpOrganisationalUnits[0];
                            } else {
                                cachedOrganisationalUnit = Y.doccirrus.utils.localValueGet( "mostRecentSelectedOrganisationalUnit" ) ? JSON.parse( Y.doccirrus.utils.localValueGet( "mostRecentSelectedOrganisationalUnit" ) ) : undefined;
                                if( cachedOrganisationalUnit ) {
                                    self.selectedOrganisationalUnit( cachedOrganisationalUnit );
                                    unit = cachedOrganisationalUnit;
                                }
                            }

                            self.tiCardTerminalsList( self.tiCardTerminalsFullList().filter( function( cardReader ) {
                                return cardReader.organisationalUnitName === (unit && unit.MandantId);
                            } ) );

                            latestTiCardTerminalUsed = Y.doccirrus.utils.localValueGet( 'latestTiCardTerminalUsed' ) ? JSON.parse( Y.doccirrus.utils.localValueGet( 'latestTiCardTerminalUsed' ) ) : null;
                            diffForLatestTiCardTerminalUsed = latestTiCardTerminalUsed && self.tiCardTerminalsList().find( function( cardReader ) {
                                return cardReader.CtId === latestTiCardTerminalUsed.CtId;
                            } );

                            if( diffForLatestTiCardTerminalUsed ) {
                                self.latestTiCardTerminalUsed = ko.observable( diffForLatestTiCardTerminalUsed );
                                self.messageTi( diffForLatestTiCardTerminalUsed.text );
                            } else {
                                self.messageTi( PLEASE_SELECT );
                            }

                            if( self.tiCardTerminalsList().length === 0 ) {
                                self.latestTiCardTerminalUsed();
                                self.messageTi( NO_TI_CARD_READER );
                            } else if( self.tiCardTerminalsList().length === 1 ) {
                                self.latestTiCardTerminalUsed( self.tiCardTerminalsList()[0] );
                                self.messageTi( self.tiCardTerminalsList()[0].text );
                            } else if ( !self.latestTiCardTerminalUsed() ) {
                                self.messageTi( PLEASE_SELECT );
                            }

                            if( !(self.tiCardTerminalsList() && self.tiCardTerminalsList().length) ) {
                                self.messageTi( NO_TI_CARD_READER );
                            }
                        }
                    } );
                }

                setTimeout( function() {
                    self.loadingCR( false );
                    if( unwrap( self.cardreaderList ).length === 0 ) {
                        self.emptyMessage( NO_CARD_READER );
                    }
                }, 6000 );
            }

            this.emptyMessage = ko.observable( SEARCH_CARD_READER );
            this.emptySwissMsg = ko.observable( SEARCH_CARD_READER );
            this.loadingCR = ko.observable( true );
            this.CH_countryMode = ko.observable( false );
            this.lastDeviceList = ko.observableArray();
            this.cardreaderList = ko.observableArray();
            this.swissCardReaderList = ko.observableArray();
            this.styleMessage = ko.computed( function() {
                var emptyMessage = unwrap( self.emptyMessage );
                return emptyMessage === PLEASE_SELECT || emptyMessage === SEARCH_CARD_READER || emptyMessage === NO_CARD_READER;
            } );
            this.swissStyleMessage = ko.computed( function() {
                var emptyMessage = unwrap( self.emptySwissMsg );
                return emptyMessage === PLEASE_SELECT || emptyMessage === SEARCH_CARD_READER || emptyMessage === NO_CARD_READER;
            } );

            this.buttonDropdown = ko.computed( function() {
                var emptyMessage = unwrap( self.emptyMessage );
                return emptyMessage === PLEASE_SELECT || emptyMessage === SEARCH_CARD_READER || emptyMessage === NO_CARD_READER;
            } );

            if ( self.hasTiLicense ) {
                this.messageTi = ko.observable( SEARCH_CARD_READER );

                this.buttonDropdownTi = ko.computed( function(){
                    var messageTi = unwrap(self.messageTi);
                    return (messageTi === PLEASE_SELECT || messageTi === SEARCH_CARD_READER || messageTi === NO_TI_CARD_READER);
                } );

                this.styleMessageTi = ko.computed(function(){
                    var messageTi = unwrap(self.messageTi);
                    return messageTi === PLEASE_SELECT || messageTi === SEARCH_CARD_READER || messageTi === NO_TI_CARD_READER;
                });

                this.stopPropagation = function( data, event ) {
                    event.stopPropagation();
                    return true;
                };

                Y.doccirrus.jsonrpc.api.tisettings.read( {
                    options: {
                        select: {modeOnlineCheck: 1}
                    }
                } ).done( function( res ) {
                    var
                        settings = res && res.data && res.data[0] || {};

                    self.modeOnlineCheck( settings.modeOnlineCheck );
                } ).fail( function( err ) {
                    Y.log( 'Could not get TI settings: ' + err, 'debug', "tab_ti" );
                } );
            }

            askForDSLists();
        },
        initTiErrorTable: function(){
            var self = this;

            var columns = [
                {
                    forPropertyName: 'colIndex',
                    label: i18n( 'InCaseMojit.patient_browserJS.placeholder.NUMBER' ),
                    title: i18n( 'InCaseMojit.patient_browserJS.placeholder.NUMBER' ),
                    width: '5%',
                    renderer: function( meta ) {
                        return meta.rowIndex+1;
                    }
                },
                {
                    forPropertyName: 'message',
                    label: i18n( 'InvoiceMojit.gkv_browserJS.label.MESSAGE' ),
                    title: i18n( 'InvoiceMojit.gkv_browserJS.label.MESSAGE' ),
                    width: '60%'
                },
                {
                    forPropertyName: 'cardreader',
                    label: i18n( 'InTiMojit.tiCardReader' ),
                    title: i18n( 'InTiMojit.tiCardReader' ),
                    width: '20%',
                    renderer: function( meta ) {
                        return meta.row.CtName;
                    }
                },
                {
                    forPropertyName: 'action',
                    label: i18n( 'InTiMojit.tiConfigurations.tiActionButton' ),
                    title: i18n( 'InTiMojit.tiConfigurations.tiActionButton' ),
                    width: '15%',
                    renderer: function( meta ) {
                        var button = '<button class="btn btn-primary btn-xs" type="button"><span class="KoButton-text">{text}</span></button>';
                        if( meta && meta.row && meta.row.methodToCall ) {
                            const linkText = i18n( 'InTiMojit.pinOperationHeader.' + meta.row.methodToCall ).i18n;

                            return Y.Lang.sub( button, {
                                text: linkText
                            } );
                        } else {
                            return Y.Lang.sub( button, {
                                text: i18n( 'InTiMojit.tiConfigurations.tiConfigButton' )
                            } );
                        }
                    },
                    onCellClick: function( meta ) {
                        if( meta && meta.row && meta.row.methodToCall && meta.row.context && meta.row.CtId && meta.row.CardHandle ) {
                            Y.doccirrus.modals.pinOperationModal.show( {
                                modalMessage: i18n( 'InTiMojit.pinOperationInitialMessage.' + meta.row.methodToCall ).i18n,
                                methodToCall: meta.row.methodToCall,
                                context: meta.row.context,
                                CtId: meta.row.CtId,
                                CardHandle: meta.row.CardHandle
                            } )
                                .then( function() {
                                    self.updateErrorsAndWarnings( meta.row );
                                } );
                        } else {
                            window.open( Y.doccirrus.utils.getUrl( 'InSuiteAdmin' ) + '#/ti', '_blank' );
                        }
                    }
                }
            ];

            self.errorTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'inCaseMojit-errorsTable',
                    data: self.tiErrorList,
                    columns: columns
                },
                selectMode: 'none'
            } );

            self.warningTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'inCaseMojit-warningTable',
                    data: self.tiWarningList,
                    columns: columns
                },
                selectMode: 'none'
            } );
        },
        updateErrorsAndWarnings: function(entry) {
            var self = this;
            const filteredErrorItems = ko.computed(function() {
                return ko.utils.arrayFilter(self.tiErrorList(), function(error) {
                    return error !== entry;
                });
            });
            const filteredWarningItems = ko.computed(function() {
                return ko.utils.arrayFilter(self.tiWarningList(), function(error) {
                    return error !== entry;
                });
            });
            self.tiErrorList(filteredErrorItems() || []);
            self.tiWarningList(filteredWarningItems() || []);
        },
        createPatientManualHandler: function() {
            var
                self = this,
                binder = self.get( 'binder' );

            binder.navigateToNewPatient();
        },
        newPatientFromSmartCard: _.debounce( function( viewModel ) {
            var self = this,
                device = viewModel && {
                    name: viewModel.name,
                    pcscReader: viewModel.pcscReader,
                    text: viewModel.name,
                    port: viewModel.port,
                    driver: viewModel.driver,
                    mobile: viewModel.mobile,
                    ds: viewModel.ds,
                    source: '',
                    host: ''
                },
                node = self.get('node');

            self.cardReadEnabled( false );
            Y.doccirrus.utils.showLoadingMask( node );
            if( device ) {
                localStorage.setItem( 'latestCardreaderUsed', JSON.stringify(device));
                self.lastDeviceList([device]);
                self.emptyMessage(device.text);
                Promise.props( {
                    processedData: (new Promise( function( resolve ) {
                        Y.doccirrus.communication.once( {
                            event: 'crLogStatusChange',
                            done: function( message ) {
                                var data = message.data && message.data[0];
                                resolve( data );
                            }
                        } );
                    } )).timeout( 1000 * 30 ),
                    readCardData: new Promise( function( resolve, reject ) {
                        Y.doccirrus.communication.apiCall( {
                            method: 'dscrmanager.readSmartCard',
                            data: {
                                callID: '',
                                port: viewModel.port,
                                driver: viewModel.driver,
                                mobile: viewModel.mobile,
                                name: viewModel.name,
                                pcscReader: viewModel.pcscReader,
                                deviceServerName: viewModel.ds
                            }
                        }, function( err, response ) {
                            if ( err ) {
                                return reject( err );
                            }

                            if( response.data.errors && response.data.errors.length ) {
                                reject( new Y.doccirrus.commonerrors.DCError( 111002 ) );
                                // set some invalid id if ids is empty so empty crlog list is shown on errors
                                self.showCardReadHistory( (response.data.ids.length ? response.data.ids : ['000000000000000000000001']), response.data.errors, 'readCard' );
                                return;
                            }
                            return resolve( response.data );
                        } );
                    } )
                } ).then( function( props ) {
                    var url;
                    self.cardReadEnabled(true);
                    Y.doccirrus.utils.hideLoadingMask( node );
                    function navigateToPatient() {
                        var navigateToPatientData = false;

                        // navigate to patient data if communication data for new patient is needed
                        if( props.processedData && props.processedData.feedback && props.processedData.feedback.some &&
                            props.processedData.feedback.some( function( feed ) {
                                return '111004' === feed.code;
                            } ) ) {

                            navigateToPatientData = true;
                        }
                        url = '#/patient/' + props.processedData.matchedPatientId + (navigateToPatientData ? '/tab/patient_detail' : '/tab/casefile_browser');
                        window.open( url, '_self' );
                    }

                    if( props.processedData && 'APPLIED' === props.processedData.status && !props.processedData.feedback.some( function( feed ) {
                            return (feed.code === '111001' || feed.code === '111003' || feed.code === '3025' || feed.code === '3007'); // stop on validation or persGroup9 info
                        } ) && props.processedData.matchedPatientId ) {

                        if( props.processedData && 'NEEDS_EVENT' === props.processedData.eventStatus && props.processedData.matchedPatientId ) {
                            Y.doccirrus.modals.chooseScheduleForAdhocEvent.show( props.processedData.matchedPatientId, function() {
                                navigateToPatient();
                            } );
                        } else {
                            if( props.processedData && 'UPDATED_EVENT_ARRIVED' === props.processedData.eventStatus ) {
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'patient-arrived',
                                    content: EVENT_UPDATED,
                                    level: 'INFO'
                                } );
                            }
                            navigateToPatient();
                        }
                        return;
                    }
                    self.showCardReadHistory( props.readCardData && props.readCardData.ids, props.readCardData && props.readCardData.errors, 'readCard' );
                } ).catch(function(err){
                    self.cardReadEnabled(true);
                    Y.doccirrus.utils.hideLoadingMask( node );
                    if(err.data && err.data.length && err.data[0].code) {
                        const error = err.data[0];
                        return Y.doccirrus.DCWindow.notice( {
                            message: Y.doccirrus.errorTable.getMessage( error )
                        });
                    }
                    return Y.doccirrus.DCWindow.notice( {
                        message: Y.doccirrus.errorTable.getMessage( err )
                    });
                });
            }
        }, 500),
        newPatientFromCard: _.debounce(function( viewModel ) {
            var
                self = this,
                device = {
                    name: viewModel.name,
                    text: viewModel.name,
                    port: viewModel.port,
                    driver: viewModel.driver,
                    mobile: viewModel.mobile,
                    ds: viewModel.ds,
                    source: '',
                    host: ''
                };

            localStorage.setItem( 'latestCardreaderUsed', JSON.stringify(device));
            self.lastDeviceList([device]);
            self.emptyMessage(device.text);

            Promise.props( {
                processedData: (new Promise( function( resolve ) {
                    Y.doccirrus.communication.once( {
                        event: 'crLogStatusChange',
                        done: function( message ) {
                            var data = message.data && message.data[0];
                            resolve( data );
                        }
                    } );

                } )).timeout( 1000 * 30 ),
                readCardData: new Promise( function( resolve, reject ) {
                    Y.doccirrus.communication.apiCall( {
                        method: 'dscrmanager.readCard',
                        data: {
                            callID: '',
                            port: viewModel.port,
                            driver: viewModel.driver,
                            mobile: viewModel.mobile,
                            name: viewModel.name,
                            deviceServerName: viewModel.ds
                        }
                    }, function( err, response ) {
                        if( err ) {
                            reject( err );
                            return;
                        }

                        if( response.data.errors && response.data.errors.length ) {
                            reject( new Y.doccirrus.commonerrors.DCError( 111002 ) );
                            // set some invalid id if ids is empty so empty crlog list is shown on errors
                            self.showCardReadHistory( (response.data.ids.length ? response.data.ids : ['000000000000000000000001']), response.data.errors, 'readCard' );
                            return;
                        }
                        resolve( response.data );
                    } );
                } )
            } ).then( function( props ) {
                var url;

                function navigateToPatient() {
                    var navigateToPatientData = false;

                    // navigate to patient data if communication data for new patient is needed
                    if( props.processedData && props.processedData.feedback && props.processedData.feedback.some &&
                        props.processedData.feedback.some( function( feed ) {
                            return '111004' === feed.code;
                        } ) ) {

                        navigateToPatientData = true;
                    }
                    url = '#/patient/' + props.processedData.matchedPatientId + (navigateToPatientData ? '/tab/patient_detail' : '/tab/casefile_browser');
                    window.open( url, '_self' );
                }

                if( props.processedData && 'APPLIED' === props.processedData.status && !props.processedData.feedback.some( function( feed ) {
                        return (feed.code === '111001' || feed.code === '111003' || feed.code === '3025' || feed.code === '3007'); // stop on validation or persGroup9 info
                    } ) && props.processedData.matchedPatientId ) {

                    if( props.processedData && 'NEEDS_EVENT' === props.processedData.eventStatus && props.processedData.matchedPatientId ) {
                        Y.doccirrus.modals.chooseScheduleForAdhocEvent.show( props.processedData.matchedPatientId, function() {
                            navigateToPatient();
                        } );
                    } else {
                        if( props.processedData && 'UPDATED_EVENT_ARRIVED' === props.processedData.eventStatus ) {
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: 'patient-arrived',
                                content: EVENT_UPDATED,
                                level: 'INFO'
                            } );
                        }
                        navigateToPatient();
                    }
                    return;
                }
                self.showCardReadHistory( props.readCardData && props.readCardData.ids, props.readCardData && props.readCardData.errors, 'readCard' );
            } ).catch( function( err ) {
                if( 111002 === err.code ) {
                    Y.log( err.message, 'debug', NAME );
                    return;
                }
                Y.log( 'could not read card: ' + err, 'error', NAME );
            } );
        }, 300, {leading: true, trailing: false} ),
        newPatientFromTiCard: _.debounce( function( viewModel ) {
            var self = this;
            var context, CtId, tiCardReaderName;

            // WORK HERE: The logic for saving and getting the last Card Terminal and SMC-B could probably be simplified
            if( viewModel.latestTiCardTerminalUsed ) {
                Y.doccirrus.utils.localValueSet( 'latestTiCardTerminalUsed', JSON.stringify( viewModel.latestTiCardTerminalUsed() ) );
                context = unwrap( viewModel.latestTiCardTerminalUsed ).context;
                CtId = unwrap( viewModel.latestTiCardTerminalUsed ).CtId;
                tiCardReaderName = unwrap( viewModel.latestTiCardTerminalUsed ).tiCardReaderName;
            } else {
                Y.doccirrus.utils.localValueSet( 'latestTiCardTerminalUsed', JSON.stringify( viewModel ) );
                context = viewModel.context;
                CtId = viewModel.CtId;
                tiCardReaderName = viewModel.tiCardReaderName;
                self.latestTiCardTerminalUsed( viewModel );
                self.messageTi( viewModel.text );
            }

            Promise.props( {
                processedData: (new Promise( function( resolve ) {
                    Y.doccirrus.communication.once( {
                        event: 'crLogStatusChange',
                        done: function( message ) {
                            var data = message.data && message.data[0];
                            resolve( data );
                        }
                    } );

                } )).timeout( 1000 * 30 ),
                readCardData: new Promise( function( resolve, reject ) {
                    var
                        latestTiCardTerminalUsed = peek( self.latestTiCardTerminalUsed ),
                        mandantId = latestTiCardTerminalUsed && latestTiCardTerminalUsed.context && latestTiCardTerminalUsed.context.MandantId,
                        SMCBCard = mandantId && self.smcbCardsLookUpTable &&
                                   self.smcbCardsLookUpTable[mandantId] &&
                                   Array.isArray( self.smcbCardsLookUpTable[mandantId] ) &&
                                   self.smcbCardsLookUpTable[mandantId].length > 0 &&
                                   self.smcbCardsLookUpTable[mandantId][0];

                    var data = {
                        enforceOnlineCheck: self.enforceOnlineCheck(),
                        context: context,
                        CardHolderName: SMCBCard && SMCBCard.CardHolderName,
                        CtId: CtId,
                        tiCardReaderName: tiCardReaderName,
                        SMCBCard: SMCBCard
                    };

                    Y.doccirrus.jsonrpc.api.timanager.readCard( {
                        data: data
                    } ).done( function( response ) {
                        if( response.data.errors && response.data.errors.length ) {
                            reject( new Y.doccirrus.commonerrors.DCError( 111002 ) );
                            // An invalid id is set if ids array is empty so that the empty crlog list is shown on errors
                            return self.showCardReadHistory( (response.data.ids.length ? response.data.ids : ['000000000000000000000001']), response.data.errors, 'readCard' );
                        }
                        return resolve( response.data );
                    } ).fail( function( err ) {
                        return reject( err );
                    } );
                } )
            } ).then( function( props ) {
                var readCardData = props.readCardData;
                var forcedOnlineCheckMessage = readCardData.forcedOnlineCheckMessage;
                var promptRegularOnlineCheck = readCardData.promptRegularOnlineCheck;
                var validationMessage = readCardData.validationMessage;
                var validationErrorCode = readCardData.validationErrorCode;

                self.enforceOnlineCheck( false ); // Reset checkbox for next read
                // ----------------------------------------------- MESSAGES ------------------------------------------------
                // NB: previously the messages were shown with the readCardHintModal, which has been kept for possible future utilisation.
                // a. The user gets warned if the previous online check led to a status code of 3, 4, 5 or 6.
                if( forcedOnlineCheckMessage ) {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        content: forcedOnlineCheckMessage,
                        messageId: 'forcedOnlineCheckMessage',
                        level: 'WARNING',
                        _removeTimeout: 10000
                    } );
                }
                // b. The user gets notified if an online check was performed
                if( promptRegularOnlineCheck ) {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        content: i18n( 'InTiMojit.promptRegularOnlineCheckMessage' ),
                        messageId: 'promptRegularOnlineCheckMessage',
                        level: 'INFO',
                        _removeTimeout: 10000
                    } );
                }
                // c. The user gets notified of the result of the online check (either info or warning)
                if( validationMessage ) {
                    validationMessage = Y.doccirrus.errorTable.getMessage({code: validationMessage});
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        content: validationErrorCode ? validationMessage + '[' + i18n( 'InTiMojit.errorCode' ) + ': ' + validationErrorCode : validationMessage,
                        messageId: 'validationMessage',
                        level: validationErrorCode ? 'WARNING' : 'INFO',
                        _removeTimeout: 10000
                    } );
                }

                // ----------------------------------------- NAVIGATE TO PATIENT -------------------------------------------
                function navigateToPatient() {
                    var navigateToPatientData = false;
                    var url;

                    // navigate to patient data if communication data for new patient is needed
                    if( props.processedData && props.processedData.feedback && props.processedData.feedback.some &&
                        props.processedData.feedback.some( function( feed ) {
                            return '111004' === feed.code;
                        } ) ) {

                        navigateToPatientData = true;
                    }
                    url = '#/patient/' + props.processedData.matchedPatientId + (navigateToPatientData ? '/tab/patient_detail' : '/tab/casefile_browser');
                    window.open( url, '_self' );
                }

                if( props.processedData && 'APPLIED' === props.processedData.status && !props.processedData.feedback.some( function( feed ) {
                        return (feed.code === '111001' || feed.code === '111003' || feed.code === '3025'); // stop on validation or persGroup9 info
                    } ) && props.processedData.matchedPatientId ) {

                    if( props.processedData && 'NEEDS_EVENT' === props.processedData.eventStatus && props.processedData.matchedPatientId ) {
                        Y.doccirrus.modals.chooseScheduleForAdhocEvent.show( props.processedData.matchedPatientId, function() {
                            navigateToPatient();
                        } );
                    } else {
                        if( props.processedData && 'UPDATED_EVENT_ARRIVED' === props.processedData.eventStatus ) {
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: 'patient-arrived',
                                content: EVENT_UPDATED,
                                level: 'INFO'
                            } );
                        }
                        navigateToPatient();
                    }
                    return;
                }

                self.showCardReadHistory( props.readCardData && props.readCardData.ids, props.readCardData && props.readCardData.errors, 'readCard' );
            } ).catch( function( err ) {
                if( 111002 === err.code ) {
                    return Y.log( err.message, 'debug', NAME );
                }
                Y.log( 'could not read card: ' + err, 'error', NAME );
            } );
        }, 300, {leading: true, trailing: false} ),
        newBatchPatientFromCard: _.debounce( function( viewModel ) {
            var self = this,
                device = {
                    name: viewModel.name,
                    text: viewModel.name,
                    port: viewModel.port,
                    driver: viewModel.driver,
                    mobile: viewModel.mobile,
                    ds: viewModel.ds,
                    source: '',
                    host: ''
                };

            localStorage.setItem( 'latestCardreaderUsed', JSON.stringify(device));

            self.lastDeviceList([device]);

            //this call is here on purpose so it gets called only once, otherwise if it was on server side it would be called for every call of readCardBatch
            //there is room for improvement here
            Y.doccirrus.jsonrpc.api.sdManager.getDeviceServerNames()
                .done(function(res){
                    Y.doccirrus.communication.apiCall( {
                        method: 'dscrmanager.readCardBatch',
                        data: {
                            callID: '',
                            port: viewModel.port,
                            driver: viewModel.driver,
                            mobile: viewModel.mobile,
                            name: viewModel.name,
                            deviceServerName: viewModel.ds,
                            deviceServers: res.data
                        }
                    }, function( err, response ) {
                        if( err ) {
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                content: i18n('DeviceMojit.tab_cardreader.errors.readCardBatchError'),
                                level: 'ERROR'
                            } );
                            Y.log("dscrmanager.readCardBatch: Error in response "+ err, "error", NAME);
                            return;
                        }

                        self.showCardReadHistory(response.data.ids, response.data.errors, 'readCardBatch');
                    } );
                });
        }, 300, {leading: true, trailing: false} ),
        beforeNavigateToPatientAfterCardRead: function( patient ) {
            var self = this,
                binder = self.get( 'binder' ),
                invoiceConfig = binder.getInitialData( 'invoiceconfiguration' );

            function getAdditionalInsuranceData( additionalInsuranceType ) {
                // var
                //     publicInsurance, newData;
                //
                // if( true === invoiceConfig.copyPublicInsuranceDataToAdditionalInsurance ) {
                //     publicInsurance = Y.doccirrus.schemas.patient.getInsuranceByType( patient, 'PUBLIC' );
                //     if( publicInsurance ) {
                //         newData = JSON.parse( JSON.stringify( publicInsurance ) );
                //         newData.type = additionalInsuranceType;
                //         newData.cardSwipe = null;
                //         return newData;
                //     }
                // }

                var data = {type: additionalInsuranceType};
                // MOJ-14319: [OK]
                if( Y.doccirrus.schemas.patient.isPrivateInsurance( data ) ) {
                    data.feeSchedule = '3';
                }

                return data;
            }


            if( !invoiceConfig.askForCreationOfAdditionalInsurancesAfterCardread ) {
                return Promise.resolve();
            }

            return Y.doccirrus.modals.additionalInsurancesAskModal.showDialog( {patient: patient} )
                .then( function( results ) {
                    var deleteTypes = [],
                        createTypes = [];

                    results.forEach( function( entry ) {
                        if( true === entry.alreadyExists && false === entry.checked ) {
                            deleteTypes.push( entry.type );
                        } else if( false === entry.alreadyExists && true === entry.checked ) {
                            createTypes.push( entry.type );
                        }
                    } );

                    // TODO: MOJ-8715 check how this should work; never delete existing ones, but throw away insurance data just read (then we need to store old insurance data)?
                    patient.insuranceStatus = patient.insuranceStatus.filter( function( insurance ) {
                        return -1 === deleteTypes.indexOf( insurance.type );
                    } );

                    createTypes.forEach( function( type ) {
                        patient.insuranceStatus.push( getAdditionalInsuranceData( type ) );
                    } );

                } ).then( function() {
                    if( !invoiceConfig.copyPublicInsuranceDataToAdditionalInsurance || 1 >= patient.insuranceStatus.length ) {
                        return Promise.resolve();
                    }
                    return Y.doccirrus.modals.copyInsuranceDataModal.showDialog( {patient: patient} ).then( function( result ) {
                        if( !result.insuranceDataToCopy || !result.insuranceToCopyTo.length ) {
                            return;
                        }

                        patient.insuranceStatus = patient.insuranceStatus.map( function( insurance ) {
                            var copy;
                            if( -1 !== result.insuranceToCopyTo.indexOf( insurance.type ) ) {
                                copy = JSON.parse( JSON.stringify( result.insuranceDataToCopy ) );
                                copy.type = insurance.type;
                                // MOJ-14319: [OK]
                                copy.feeSchedule = Y.doccirrus.schemas.patient.isPrivateInsurance( copy ) ? '3' : null;
                                copy.cardSwipe = null;
                            }
                            return copy || insurance;
                        } );

                    } );
                } );

        },
        selectOrganisationalUnit: function( unit ) {
            var self = this;

            self.selectedOrganisationalUnit( unit );
            self.tiCardTerminalsList( self.tiCardTerminalsFullList().filter( function( cardReader ) {
                return cardReader.organisationalUnitName === unit.MandantId;
            } ) );

            if( self.tiCardTerminalsList().length === 0 ) {
                self.latestTiCardTerminalUsed();
                self.messageTi( NO_TI_CARD_READER );
            } else if( self.tiCardTerminalsList().length === 1 ) {
                self.latestTiCardTerminalUsed( self.tiCardTerminalsList()[0] );
                self.messageTi( self.tiCardTerminalsList()[0].text );
            } else {
                self.latestTiCardTerminalUsed();
                self.messageTi( PLEASE_SELECT );
            }
            Y.doccirrus.utils.localValueSet( 'mostRecentSelectedOrganisationalUnit', JSON.stringify( unit ) );
        },
        navigateToPatientAfterCardRead: function( patient ) {
            var
                self = this,
                binder = self.get( 'binder' );

            function navigate() {
                if( patient._id ) {
                    binder.navigateToPatientDetail( {updatePatientConfig: {data: patient}} );
                } else {
                    binder.navigateToNewPatient( {newPatientConfig: {data: patient}} );
                }
            }

            self.beforeNavigateToPatientAfterCardRead( patient ).catch( function( err ) {
                Y.log( 'an error occurred before navigating to patient after card read: ' + err, 'error', NAME );
            } ).finally( navigate );
        },
        showCardReadHistory: function(ids, errors, typeOfRead) {
            Y.doccirrus.cardreaderDS.showHistory(ids, errors, typeOfRead);
        },
        setActiveClass: function() {
            var self = this;
            if( self.tiErrorList && self.tiErrorList().length > 0 ) {
                document.getElementById( 'tiCardReader-errors' ).classList.add( 'active' );
                document.getElementById( 'tiCardReader-errors-tab' ).classList.add( 'active' );
            }
            if( (self.tiErrorList && self.tiErrorList().length === 0) && (self.tiWarningList && self.tiWarningList().length > 0) ) {
                document.getElementById( 'tiCardReader-warnings' ).classList.add( 'active' );
                document.getElementById( 'tiCardReader-warnings-tab' ).classList.add( 'active' );
            }
        },
        showTiErrors: function() {
            const self = this;

            Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'InTiMojit/views/patientBrowserTiErrors'} )
            ).then( function( response ) {
                return response && response.data;
            } ).then( function( template ) {
                var
                    bodyContent = Y.Node.create( template ),
                    modal;

                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-TiErrors',
                    bodyContent: bodyContent,
                    title: 'TI Kartenleser Fehler',
                    icon: Y.doccirrus.DCWindow.ICON_ERROR,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    height: 600,
                    minHeight: 600,
                    centered: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function() {
                                    modal.close();
                                }
                            } )
                        ]
                    }
                } );

                $( '#tiCardReader-log-tabs a' ).click( function( e ) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    $( this ).tab( 'show' );
                } );
                self.setActiveClass();
                ko.applyBindings( self, bodyContent.getDOMNode() );
            } ).catch( function( err ) {
                Y.log( 'could not get patientBrowserTiErrors template: ' + err, 'error', NAME );
            } );
        }
    }, {
        NAME: 'PatientBrowserViewModel',
        ATTRS: {
            deviceServerVersion: {
                value: '',
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( PatientBrowserViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'InCaseMojitViewModel',
        'KoSchemaValue',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoUI-all',
        'dcquery',
        'dcutils',
        'dcschemaloader',
        'person-schema',
        'patient-schema',
        'cardreader',
        'cardreaderDS',
        'additionalinsurances-modal',
        'copy_insurance_data-modal',
        'TiStatusModal',
        'readCardHintModal'
    ]
} );
