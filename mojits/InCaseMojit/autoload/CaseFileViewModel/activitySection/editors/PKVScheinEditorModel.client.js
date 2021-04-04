/**
 * User: pi
 * Date: 11/12/15  10:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'PKVScheinEditorModel', function( Y ) {
        /**
         * @module PKVScheinEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            ScheinEditorModel = KoViewModel.getConstructor( 'ScheinEditorModel' ),
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n,
            peek = ko.utils.peekObservable;

        /**
         * @class PKVScheinEditorModel
         * @constructor
         * @extends ScheinEditorModel
         */
        function PKVScheinEditorModel( config ) {
            PKVScheinEditorModel.superclass.constructor.call( this, config );
        }

        PKVScheinEditorModel.ATTRS = {
            whiteList: {
                value: ScheinEditorModel.ATTRS.whiteList.value.concat( [
                    'treatmentType',
                    'reasonType',
                    'scheinBillingFactorValue',
                    'scheinClinicID',
                    'isTiersGarant',
                    'isTiersPayant',
                    'docPrinted',
                    'onHold',
                    'onHoldNotes',
                    'statusBeforeHold',
                    'caseNumber',
                    'dayOfAccident',
                    '_id',
                    'status'
                ] ),
                lazyAdd: false
            },
            subModelsDesc: {
                value: ScheinEditorModel.ATTRS.subModelsDesc.value.concat( [] ),
                lazyAdd: false
            }
        };

        Y.extend( PKVScheinEditorModel, ScheinEditorModel, {
                initializer: function PKVScheinEditorModel_initializer() {
                    var
                        self = this;
                    self.isSwiz = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                    self.isGermany = Y.doccirrus.commonutils.doesCountryModeIncludeGermany();
                    self.initPKVScheinEditorModel();

                },
                destructor: function PKVScheinEditorModel_destructor() {
                },
                initPKVScheinEditorModel: function PKVScheinEditorModel_initPKVScheinEditorModel() {
                    var
                        self = this,
                        patient = peek( self.get('currentPatient')),
                        caseFolderType =  self.get('caseFolder').type,
                        insuranceStatus,
                        validator = Y.doccirrus.validations.common.reasonType_CH_T[0],
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        HOLDABLE_STATUSES = ['APPROVED', 'BILLED', 'VALID', 'ONHOLD'];

                    insuranceStatus =   unwrap(patient.insuranceStatus).find(function( status ) {
                      return  unwrap(status.type) === caseFolderType;
                    });

                    if(caseFolderType === 'PRIVATE_CH_UVG' && currentActivity.isNew()) {
                        self.reasonType('ACCIDENT');
                    }

                    if( insuranceStatus && unwrap( self.isNew ) ) {
                        self.isTiersGarant( unwrap( insuranceStatus.isTiersGarant ) );
                        self.isTiersPayant( unwrap( insuranceStatus.isTiersPayant ) );
                    }

                    self.firstLoad = true;

                    self.invoiceTypeI18n = i18n( 'InCaseMojit.casefile_detail.label.INVOICE_TYPE' );
                    self.billingFactorValueI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.BILLING_FACTOR_VALUE' );
                    self.groupRemittorI18n = i18n( 'InCaseMojit.casefile_detail.group.REMITTOR' );
                    self.labelBSNRI18n = i18n( 'InCaseMojit.casefile_detail.label.BSNR' );
                    self.labelLanrI18n = i18n( 'InCaseMojit.casefile_detail.label.LANR' );
                    self.bewilligteLeistungenI18n = i18n( 'InCaseMojit.casefile_detail.group.BEWILLIGTE_LEISTUNGEN' );
                    self.buttonRecalculateI18n = i18n( 'InCaseMojit.casefile_detail.button.RECALCULATE' );
                    self.groupOperationI18n = i18n( 'InCaseMojit.casefile_detail.group.OPERATION' );
                    self.AccPsyPrivateI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.ACC_PSY_PRIVATE' );
                    self.isTiersPayantI18n =  i18n( 'InCaseMojit.casefile_detail.label.IsTiersPayant' );
                    self.isTiersGarantI18n =  i18n( 'InCaseMojit.casefile_detail.label.IsTiersGarant' );
                    self.treatmentReasonI18n =  i18n( 'InCaseMojit.casefile_detail.label.TREATMENT_REASON' );
                    var caseNumberI18n =  i18n( 'InCaseMojit.casefile_detail.label.CASE_NUMBER' ),
                        accidentNumberI18n =  i18n( 'InCaseMojit.casefile_detail.label.ACCIDENT_NUMBER' );
                    self.accidentDateI18n =  i18n( 'InCaseMojit.casefile_detail.label.ACCIDENT_DATE' );
                    self.mediportCommunicatorDocPrintI18n = i18n( 'InCaseMojit.casefile_detail.label.PRINT_DOCUMENT' );
                    self.patientDataI18n = i18n( 'InCaseMojit.casefile_detail.button.PATIENT_DATA' );
                    self.putOnHoldI18n = i18n( 'InCaseMojit.casefile_detail.label.PUT_ON_HOLD' );
                    self.onHoldNotesI18n = i18n( 'InCaseMojit.casefile_detail.label.ON_HOLD_NOTES' );

                    var caseFolder = peek(self.get( 'caseFolder' ));
                    self.uvgCase = caseFolder.type === 'PRIVATE_CH_UVG';
                    self.caseIdI18n = self.uvgCase ? accidentNumberI18n : caseNumberI18n;

                    self._treatmentTypeList = ko.observableArray( Y.doccirrus.schemas.activity.types.TreatmentType_E.list );
                    self._reasonTypeList = ko.observableArray(
                        Y.doccirrus.schemas.activity.types.ScheinReasons_E.list.filter( function ( reason ) {
                            return reason.lawTypes ? reason.lawTypes.includes( caseFolder.type ) : true;
                        } )
                    );
                    self.reasonType.validationMessages = ko.observableArray( [validator.msg] );
                    self.reasonType.hasError = ko.computed( function() {
                        var
                            value = ko.unwrap( self.reasonType ),
                            isValid = validator.validator( value ),
                            caseFolderType = caseFolder && caseFolder.type;
                        // Swiss only validation
                        if( self.isSwiz && Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderType || 'ANY'] === 'CH' ) {
                            return !isValid;
                        }
                        return false;
                    } );

                    self.addDisposable( ko.computed( function() {
                        self.scheinClinicID();
                        self.scheinClinicalTreatmentFrom.validate();
                        self.scheinClinicalTreatmentTo.validate();
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var status = ko.unwrap( self.status ),
                            isNew = self.isNew();
                        self.canPutOnHold = ko.observable( HOLDABLE_STATUSES.includes( status ) || isNew );
                    } ) );

                    self._initPhysicianSetters();
                    self.initObservables();

                },
                initObservables: function() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        shouldShowWarn = true,
                        caseFolderType =  self.get('caseFolder').type,
                        swissCaseFolderTypes = ['PRIVATE_CH', "PRIVATE_CH_UVG", "PRIVATE_CH_IVG", "PRIVATE_CH_VVG", "PRIVATE_CH_MVG"];

                    self.displayScheinBillingFactorValue = ko.computed( {
                        read: function() {
                            var
                                scheinBillingFactorValue = unwrap( self.scheinBillingFactorValue );
                            if( !scheinBillingFactorValue ) {
                                return '';
                            } else {
                                return Y.doccirrus.comctl.factorToLocalString( scheinBillingFactorValue );
                            }

                        },
                        write: function( value ) {
                            var
                                newValue = Y.doccirrus.comctl.localStringToNumber( value );
                            if( newValue ) {
                                self.scheinBillingFactorValue( newValue );
                            } else {
                                self.scheinBillingFactorValue( null );
                            }
                            if( !currentActivity.isNew() && shouldShowWarn ) {
                                Y.doccirrus.DCSystemMessages.removeMessage( 'scheinBillingFactorValue' );
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'scheinBillingFactorValue',
                                    content: i18n('InCaseMojit.PKVScheinEditorModel.text.BILLING_FACTOR_WARNING'),
                                    level: 'WARNING'
                                } );
                                shouldShowWarn = false;
                            }

                        }
                    } );

                    self.docPrintedSelected = ko.computed({
                        read: function(  ) {
                            return self.docPrinted();
                        },
                        write: function( value ) {
                            self.docPrinted(value);
                            self.docPrintedEdited = true;
                        }
                    });

                    self.showPatientVersions = ko.observable(swissCaseFolderTypes.includes(caseFolderType));

                    self.isTierSelected = ko.computed( {
                        read: function() {
                            return getSelectedTier();
                        },
                        write: function( value ) {
                            self.isTiersGarant( value === 'isTiersGarant' );
                            self.isTiersPayant( value === 'isTiersPayant' );
                            if( !self.docPrintedEdited && (!self.firstLoad || unwrap( self.isNew )) ) {
                                self.docPrinted( (!self.isSwiz) && value === 'isTiersGarant' );
                            }
                            if( self.firstLoad ) {
                                if( unwrap( self.isNew ) ) {
                                    self.caseNumber( '' );
                                    if( caseFolderType !== 'PRIVATE_CH_UVG' ) {
                                        self.reasonType( '' );
                                    }
                                }
                                self.firstLoad = false;
                            }
                        }
                    } );

                    self.isTierSelected(getSelectedTier());

                    function getSelectedTier(  ) {
                        if (unwrap(self.isTiersGarant)) {
                            return 'isTiersGarant';
                        }
                        return 'isTiersPayant';
                    }
                },
                /** @private **/
                _initPhysicianSetters: function() {
                    var
                        self = this;

                    self.selectPhysicianRemittor = self._buildPhysicianSetter( {
                        bsnr: 'scheinEstablishment',
                        lanr: 'scheinRemittor',
                        substitute: 'fk4219'
                    } );

                }
            }, {
                NAME: 'PKVScheinEditorModel'
            }
        );
        KoViewModel.registerConstructor( PKVScheinEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ScheinEditorModel',
            'FKEditorModels',
            'PatientVersionEditor',
            'activity-schema'
        ]
    }
);
