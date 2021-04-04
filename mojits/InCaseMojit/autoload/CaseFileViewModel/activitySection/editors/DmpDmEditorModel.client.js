/**
 * User: do
 * Date: 21/04/16  16:16
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'DmpDmEditorModel', function( Y ) {
        'use strict';
        /**
         * @module DmpDmEditorModel
         */

        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            ignoreDependencies = ko.ignoreDependencies,
            eDmpHelpers = Y.doccirrus.edmpcommonutils,
            i18n = Y.doccirrus.i18n,

            getErr = Y.doccirrus.errorTable.getMessage,

            KoViewModel = Y.doccirrus.KoViewModel,
            DmpEditorModel = KoViewModel.getConstructor( 'DmpEditorModel' );

        /**
         * @class DmpDmEditorModel
         * @constructor
         * @extends DmpEditorModel
         */
        function DmpDmEditorModel( config ) {
            DmpDmEditorModel.superclass.constructor.call( this, config );
        }

        DmpDmEditorModel.ATTRS = {
            whiteList: {
                value: DmpEditorModel.ATTRS.whiteList.value.concat( [
                    'dmpPulsStatus',
                    'dmpSensitivityTesting',
                    'dmpFootStatusText',
                    'dmpFootStatusWagnerValue',
                    'dmpFootStatusArmstrongValue',
                    'dmpFurtherRiskUlcus',
                    'dmpUlkus',
                    'dmpWoundInfection',
                    'dmpHbA1cValue',
                    'dmpHbA1cUnit',
                    'dmpPathoUrinAlbAus',
                    'dmpSequelae',
                    'dmpEvents',
                    'dmpEGFR',
                    'dmpEGFRNotDetermined',
                    'dmpInjectionSites',
                    'dmpIntervalFutureFootInspections',
                    'dmpHadHypoglycaemic',
                    'dmpHadStationaryTreatment',
                    'dmpAntiplatelet',
                    'dmpBetaBlocker',
                    'dmpACE',
                    'dmpHMG',
                    'dmpTHIA',
                    'dmpRecommendedDmTrainings',
                    'dmpDmTrainingsBeforeSubscription',
                    'dmpPerceivedDiabetesTraining',
                    'dmpPerceivedHypertensionTraining',
                    'dmpHbA1cTargetValue',
                    'dmpOpthRetinalExam',
                    'dmpTreatmentAtDiabeticFootInstitution',
                    'dmpDiabetesRelatedHospitalization'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( DmpDmEditorModel, DmpEditorModel, {
                initializer: function DmpDmEditor_initializer() {
                    var
                        self = this;
                    self.initDmpDmEditorModel();
                },
                destructor: function DmpDmEditor_destructor() {
                },
                /**
                 * Initializes DMP DM editor model
                 * @method initDmpDmEditorModel
                 */
                initDmpDmEditorModel: function DmpDmEditorModel_initDmpDmEditorModel() {
                    var
                        self = this;

                    self.firstI18n = i18n( 'activity-schema.DmpType_E.FIRST.i18n' );
                    self.followingI18n = i18n( 'activity-schema.DmpType_E.FOLLOWING.i18n' );
                    self.dmpTypeI18n = i18n( 'activity-schema.DmpType_E.PNP.i18n' );
                    self.officialNoI18n = i18n( 'physician-schema.Physician_T.officialNo.i18n' );
                    self.insuranceNameI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceName' );
                    self.insuranceNoI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceNo' );
                    self.insuranceIdI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceId' );
                    self.fk4133I18n = i18n( 'person-schema.InsuranceStatus_T.fk4133' );
                    self.fk4110I18n = i18n( 'person-schema.InsuranceStatus_T.fk4110' );
                    self.insuranceKindI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceKind' );
                    self.persGroupI18n = i18n( 'person-schema.InsuranceStatus_T.persGroup' );
                    self.edmpDobI18n = i18n( 'person-schema.Person_T.kbvDob' );
                    self.genderI18n = i18n( 'patient-schema.Gender_E.i18n' );
                    self.edmpCaseNoI18n = i18n( 'patient-schema.Patient_T.edmpCaseNo.i18n' );
                    self.patientAddressI18n = i18n( 'InCaseMojit.DmpEditorModel.label.patientAddress' );
                    self.employeeNameI18n = i18n( 'InCaseMojit.DmpEditorModel.label.employeeName' );
                    self.employeeAddressI18n = i18n( 'InCaseMojit.DmpEditorModel.label.employeeAddress' );
                    self.postfixFirstDocI18n = i18n( 'InCaseMojit.DmpEditorModel.section.relevantEvents.postfixFirstDoc' );
                    self.postfixFollowingDocI18n = i18n( 'InCaseMojit.DmpEditorModel.section.relevantEvents.postfixFollowingDoc' );
                    self.DmpEventsI18n = i18n( 'activity-schema.DmpEvents_E.i18n' );
                    self.dmpHadHypoglycaemicUnitLabelI18n = i18n( 'InCaseMojit.DmpDmEditorModel.dmpHadHypoglycaemicUnitLabel' );
                    self.dmpHadStationaryTreatmentUnitLabelI18n = i18n( 'InCaseMojit.DmpDmEditorModel.dmpHadStationaryTreatmentUnitLabel' );
                    self.dmpHadHospitalStayHbA1cUnitLabelI18n = i18n( 'InCaseMojit.DmpDm1EditorModel.dmpHadHospitalStayHbA1cUnitLabel' );
                    self.dmpPerceivedHypertensionTrainingI18n = i18n( 'activity-schema.DMP_BASE_T.dmpPerceivedHypertensionTraining.i18n' );
                    self.dmpPerceivedDiabetesTrainingI18n = i18n( 'activity-schema.DMP_BASE_T.dmpPerceivedDiabetesTraining.i18n' );

                    self.initHbA1c();
                    self.initFootStatus();
                    self.initInjectionSites();
                    self.initEGFR();
                    self.initHadHypoglycaemic();
                    self.initHadStationaryTreatment();
                    self.initDmpFootStatusValidator();
                    self.initDmpPulsStatusValidator();
                    self.initDmpSensitivityTestingValidator();
                    self.initDmpFootStatusArmstrongValueValidator();
                    self.initDmpFootStatusWagnerValueValidator();
                    self.initDmpInjectionSitesValidator();
                },
                /**
                 * Computes conversion for "dmpHbA1cValue" between number and string
                 */
                dmpHbA1cValueString: null,
                initHbA1c: function() {
                    var
                        self = this,
                        dmpHbA1cValueStringComputed = {
                            read: function() {
                                var
                                    dmpHbA1cValue = unwrap( self.dmpHbA1cValue );

                                if( Y.Lang.isNumber( dmpHbA1cValue ) ) {
                                    switch( peek( self.dmpHbA1cUnit ) ) {
                                        case 'PERCENT':
                                            dmpHbA1cValue = Y.doccirrus.comctl.numberToLocalString( dmpHbA1cValue, {
                                                decimals: 1
                                            } );
                                            break;
                                        case 'MMOLMOL':
                                            dmpHbA1cValue = String( dmpHbA1cValue );
                                            break;
                                    }
                                }

                                return dmpHbA1cValue;
                            },
                            write: function( value ) {
                                var
                                    dmpHbA1cValuePrev = peek( self.dmpHbA1cValue );

                                if( Y.Lang.isString( value ) && value ) {
                                    switch( peek( self.dmpHbA1cUnit ) ) {
                                        case 'MMOLMOL':
                                            value = value.replace( /,.*$/, '' );
                                            break;
                                    }
                                    /** ensure max one decimal also for "dmpHbA1cValue" by: **/
                                    value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                                    value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 1 decimal transformed as for read is done
                                        decimals: 1
                                    } );
                                    value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpHbA1cValue" needs it
                                }
                                self.dmpHbA1cValue( value );
                                if( value === dmpHbA1cValuePrev ) {
                                    self.dmpHbA1cValue.valueHasMutated();
                                }
                            }
                        };

                    self.dmpHbA1cValueString = ko.computed( dmpHbA1cValueStringComputed ).extend( {notify: 'always'} );

                    self.addDisposable( ko.computed( function() {
                        var
                            computedInitial = ko.computedContext.isInitial();

                        unwrap( self.dmpHbA1cUnit );

                        ignoreDependencies( function() {
                            if( !computedInitial ) {
                                dmpHbA1cValueStringComputed.write( peek( self.dmpHbA1cValueString ) );
                            }
                        } );
                    } ) );

                },
                wagnerList: null,
                armstrongList: null,
                footStatusValuesDisabled: null,
                injectionSitesDisabled: null,
                initInjectionSites: function() {
                    var
                        self = this;

                    self.injectionSitesDisabled = ko.computed( function() {
                        var dmpInsulin = unwrap( self.dmpInsulin );
                        var actType = unwrap( self.actType );
                        return 'NO' === dmpInsulin && actType === 'DM2';
                    } );

                    self.addDisposable( ko.computed( function() {
                        var dmpInsulin = unwrap( self.dmpInsulin );
                        var actType = unwrap( self.actType );
                        if( 'NO' === dmpInsulin && actType === 'DM2' ) {
                            self.dmpInjectionSites( undefined );
                        }
                    } ) );

                },
                initFootStatus: function() {
                    var
                        self = this;

                    // disable for unmeasured
                    self.footStatusValuesDisabled = ko.computed( function() {
                        var dmpFootStatusText = unwrap( self.dmpFootStatusText );
                        return 'NOT_MEASURED' === dmpFootStatusText || 'INCONSPICUOUS' === dmpFootStatusText;
                    } );

                    // reset for unmeasured
                    self.addDisposable( ko.computed( function() {
                        var dmpFootStatusText = unwrap( self.dmpFootStatusText );
                        if( 'NOT_MEASURED' === dmpFootStatusText || 'INCONSPICUOUS' === dmpFootStatusText ) {
                            self.dmpFootStatusWagnerValue( undefined );
                            self.dmpFootStatusArmstrongValue( undefined );
                        }
                    } ) );

                },

                initDmpFootStatusValidator: function() {

                    var
                        self = this,
                        activity = peek( self.get( 'currentActivity' ) ),
                        errStr = activity.clientId + '.dmpFootStatus';

                    activity.dmpFootStatusText.hasError = ko.observable( false );
                    activity.dmpFootStatusText.validationMessages = ko.observableArray();

                    self.addDisposable( ko.computed( function() {

                        var activity = peek( self.get( 'currentActivity' ) ),
                            patient = activity && activity.patientShort ? activity.patientShort() : null,
                            footStatus;

                        if( !patient ) {
                            return;
                        }

                        activity.dmpFootStatusText();

                        activity.dmpFootStatusText.validationMessages.removeAll();

                        if( self.isAfterQ22017() ) {
                            return;
                        }

                        footStatus = eDmpHelpers.validateFootStatus( patient, activity.toJSON(), 'dmpFootStatusText' );

                        self.setValidationState( footStatus, activity, errStr );

                        activity.dmpFootStatusText.hasError( !footStatus.isValid );
                        if( footStatus.err && footStatus.err.code ) {
                            activity.dmpFootStatusText.validationMessages.push( getErr( {code: footStatus.err.code} ) );
                        }

                    } ) );

                },
                initDmpPulsStatusValidator: function() {

                    var
                        self = this,
                        activity = peek( self.get( 'currentActivity' ) ),
                        errStr = activity.clientId + '.dmpPulsStatus';

                    activity.dmpPulsStatus.hasError = ko.observable( false );
                    activity.dmpPulsStatus.validationMessages = ko.observableArray();

                    self.addDisposable( ko.computed( function() {

                        var activity = peek( self.get( 'currentActivity' ) ),
                            patient = activity && activity.patientShort ? activity.patientShort() : null,
                            pulsStatus;

                        if( !patient ) {
                            return;
                        }

                        activity.dmpPulsStatus();

                        activity.dmpPulsStatus.validationMessages.removeAll();

                        pulsStatus = eDmpHelpers.validateFootStatus( patient, activity.toJSON(), 'dmpPulsStatus' );

                        self.setValidationState( pulsStatus, activity, errStr );

                        activity.dmpPulsStatus.hasError( !pulsStatus.isValid );
                        if( pulsStatus.err && pulsStatus.err.code ) {
                            activity.dmpPulsStatus.validationMessages.push( getErr( {code: pulsStatus.err.code} ) );
                        }

                    } ) );

                },
                initDmpSensitivityTestingValidator: function() {

                    var
                        self = this,
                        activity = peek( self.get( 'currentActivity' ) ),
                        errStr = activity.clientId + '.dmpSensitivityTesting';

                    activity.dmpSensitivityTesting.hasError = ko.observable( false );
                    activity.dmpSensitivityTesting.validationMessages = ko.observableArray();

                    self.addDisposable( ko.computed( function() {

                        var activity = peek( self.get( 'currentActivity' ) ),
                            patient = activity && activity.patientShort ? activity.patientShort() : null,
                            sensitivityTesting;

                        if( !patient ) {
                            return;
                        }

                        activity.dmpSensitivityTesting();

                        activity.dmpSensitivityTesting.validationMessages.removeAll();

                        sensitivityTesting = eDmpHelpers.validateFootStatus( patient, activity.toJSON(), 'dmpSensitivityTesting' );

                        self.setValidationState( sensitivityTesting, activity, errStr );

                        activity.dmpSensitivityTesting.hasError( !sensitivityTesting.isValid );
                        if( sensitivityTesting.err && sensitivityTesting.err.code ) {
                            activity.dmpSensitivityTesting.validationMessages.push( getErr( {code: sensitivityTesting.err.code} ) );
                        }

                    } ) );

                },
                initDmpFootStatusArmstrongValueValidator: function() {

                    var
                        self = this,
                        activity = peek( self.get( 'currentActivity' ) ),
                        errStr = activity.clientId + '.dmpFootStatusArmstrongValue';

                    activity.dmpFootStatusArmstrongValue.hasError = ko.observable( false );
                    activity.dmpFootStatusArmstrongValue.validationMessages = ko.observableArray();

                    self.addDisposable( ko.computed( function() {

                        var activity = peek( self.get( 'currentActivity' ) ),
                            patient = activity && activity.patientShort ? activity.patientShort() : null,
                            footStatusArmstrongValue;

                        if( !patient ) {
                            return;
                        }

                        activity.dmpFootStatusText();
                        activity.dmpFootStatusArmstrongValue();

                        activity.dmpFootStatusArmstrongValue.validationMessages.removeAll();

                        footStatusArmstrongValue = eDmpHelpers.validateFootStatusArmstrongValue( patient, activity.toJSON() );

                        self.setValidationState( footStatusArmstrongValue, activity, errStr );

                        activity.dmpFootStatusArmstrongValue.hasError( !footStatusArmstrongValue.isValid );
                        if( footStatusArmstrongValue.err && footStatusArmstrongValue.err.code ) {
                            activity.dmpFootStatusArmstrongValue.validationMessages.push( getErr( {code: footStatusArmstrongValue.err.code} ) );
                        }

                    } ) );

                },
                initDmpFootStatusWagnerValueValidator: function() {

                    var
                        self = this,
                        activity = peek( self.get( 'currentActivity' ) ),
                        errStr = activity.clientId + '.dmpFootStatusWagnerValue';

                    activity.dmpFootStatusWagnerValue.hasError = ko.observable( false );
                    activity.dmpFootStatusWagnerValue.validationMessages = ko.observableArray();

                    self.addDisposable( ko.computed( function() {

                        var activity = peek( self.get( 'currentActivity' ) ),
                            patient = activity && activity.patientShort ? activity.patientShort() : null,
                            footStatusWagnerValue;

                        if( !patient ) {
                            return;
                        }

                        activity.dmpFootStatusText();
                        activity.dmpFootStatusWagnerValue();

                        activity.dmpFootStatusWagnerValue.validationMessages.removeAll();

                        footStatusWagnerValue = eDmpHelpers.validateFootStatusWagnerValue( patient, activity.toJSON() );

                        self.setValidationState( footStatusWagnerValue, activity, errStr );

                        activity.dmpFootStatusWagnerValue.hasError( !footStatusWagnerValue.isValid );
                        if( footStatusWagnerValue.err && footStatusWagnerValue.err.code ) {
                            activity.dmpFootStatusWagnerValue.validationMessages.push( getErr( {code: footStatusWagnerValue.err.code} ) );
                        }

                    } ) );

                },
                initDmpInjectionSitesValidator: function() {

                    var
                        self = this,
                        activity = peek( self.get( 'currentActivity' ) ),
                        errStr = activity.clientId + '.dmpInjectionSites';

                    activity.dmpInjectionSites.hasError = ko.observable( false );
                    activity.dmpInjectionSites.validationMessages = ko.observableArray();

                    self.addDisposable( ko.computed( function() {

                        var activity = peek( self.get( 'currentActivity' ) ),
                            patient = activity && activity.patientShort ? activity.patientShort() : null,
                            injectionSites;

                        if( !patient ) {
                            return;
                        }

                        activity.dmpInjectionSites();
                        if( activity.dmpType === 'DM2' ) {
                            activity.dmpInsulin();
                        }

                        activity.dmpInjectionSites.validationMessages.removeAll();

                        injectionSites = eDmpHelpers.validateInjectionSites( patient, activity.toJSON() );

                        self.setValidationState( injectionSites, activity, errStr );

                        activity.dmpInjectionSites.hasError( !injectionSites.isValid );
                        if( injectionSites.err && injectionSites.err.code ) {
                            activity.dmpInjectionSites.validationMessages.push( getErr( {code: injectionSites.err.code} ) );
                        }

                    } ) );

                },
                /**
                 * Computes conversion for "dmpEGFR" between number and string
                 */
                dmpEGFRString: null,
                initEGFR: function() {
                    var
                        self = this;

                    self.dmpEGFRString = ko.computed( {
                        read: function() {
                            var
                                dmpEGFR = unwrap( self.dmpEGFR );

                            if( Y.Lang.isNumber( dmpEGFR ) ) {
                                dmpEGFR = Y.doccirrus.comctl.numberToLocalString( dmpEGFR, {
                                    decimals: 0
                                } );
                            }

                            return dmpEGFR;
                        },
                        write: function( value ) {
                            var
                                dmpEGFRPrev = peek( self.dmpEGFR );

                            if( Y.Lang.isString( value ) && value ) {
                                /** ensure max 0 decimal also for "dmpEGFR" by: **/
                                value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                                value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                                    decimals: 0
                                } );
                                value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpEGFR" needs it
                            }
                            self.dmpEGFR( value );
                            if( value === dmpEGFRPrev ) {
                                self.dmpEGFR.valueHasMutated();
                            }
                        }
                    } ).extend( {notify: 'always'} );
                },
                /**
                 * Computes conversion for "dmpHadHypoglycaemic" between number and string
                 */
                dmpHadHypoglycaemicString: null,
                initHadHypoglycaemic: function() {
                    var
                        self = this;

                    self.dmpHadHypoglycaemicString = ko.computed( {
                        read: function() {
                            var
                                dmpHadHypoglycaemic = unwrap( self.dmpHadHypoglycaemic );

                            if( Y.Lang.isNumber( dmpHadHypoglycaemic ) ) {
                                dmpHadHypoglycaemic = Y.doccirrus.comctl.numberToLocalString( dmpHadHypoglycaemic, {
                                    decimals: 0
                                } );
                            }

                            return dmpHadHypoglycaemic;
                        },
                        write: function( value ) {
                            var
                                dmpHadHypoglycaemicPrev = peek( self.dmpHadHypoglycaemic );

                            if( Y.Lang.isString( value ) && value ) {
                                /** ensure max 0 decimal also for "dmpHadHypoglycaemic" by: **/
                                value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                                value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                                    decimals: 0
                                } );
                                value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpHadHypoglycaemic" needs it
                            }
                            self.dmpHadHypoglycaemic( value );
                            if( value === dmpHadHypoglycaemicPrev ) {
                                self.dmpHadHypoglycaemic.valueHasMutated();
                            }
                        }
                    } ).extend( {notify: 'always'} );
                },
                /**
                 * Computes conversion for "dmpHadStationaryTreatment" between number and string
                 */
                dmpHadStationaryTreatmentString: null,
                initHadStationaryTreatment: function() {
                    var
                        self = this;

                    self.dmpHadStationaryTreatmentString = ko.computed( {
                        read: function() {
                            var
                                dmpHadStationaryTreatment = unwrap( self.dmpHadStationaryTreatment );

                            if( Y.Lang.isNumber( dmpHadStationaryTreatment ) ) {
                                dmpHadStationaryTreatment = Y.doccirrus.comctl.numberToLocalString( dmpHadStationaryTreatment, {
                                    decimals: 0
                                } );
                            }

                            return dmpHadStationaryTreatment;
                        },
                        write: function( value ) {
                            var
                                dmpHadStationaryTreatmentPrev = peek( self.dmpHadStationaryTreatment );

                            if( Y.Lang.isString( value ) && value ) {
                                /** ensure max 0 decimal also for "dmpHadStationaryTreatment" by: **/
                                value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                                value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                                    decimals: 0
                                } );
                                value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpHadStationaryTreatment" needs it
                            }
                            self.dmpHadStationaryTreatment( value );
                            if( value === dmpHadStationaryTreatmentPrev ) {
                                self.dmpHadStationaryTreatment.valueHasMutated();
                            }
                        }
                    } ).extend( {notify: 'always'} );
                }
            }, {
                NAME: 'DmpDmEditorModel'
            }
        );

        KoViewModel.registerConstructor( DmpDmEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'DmpEditorModel',
            'dc-comctl'
        ]
    }
);
