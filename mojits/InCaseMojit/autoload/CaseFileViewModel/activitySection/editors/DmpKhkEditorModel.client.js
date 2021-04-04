/*jslint anon:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'DmpKhkEditorModel', function( Y ) {
    'use strict';
    /**
     * @module DmpKhkEditorModel
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
     * @class DmpKhkEditorModel
     * @constructor
     * @extends DmpEditorModel
     */
    function DmpKhkEditorModel( config ) {
        DmpKhkEditorModel.superclass.constructor.call( this, config );
    }

    DmpKhkEditorModel.ATTRS = {
        whiteList: {
            value: DmpEditorModel.ATTRS.whiteList.value.concat( [
                'dmpAnginaPectoris',
                'dmpSerumElectrolytes',
                'dmpLdlCholesterolValue',
                'dmpLdlCholesterolUnit',
                'dmpLdlCholesterolNotDetermined',
                'dmpKhkRelevantEvents',
                'dmpDiagnosticCoronaryTherapeuticIntervention',
                'dmpHadStationaryKhkTreatment',
                'dmpAntiplatelet',
                'dmpBetaBlocker',
                'dmpACE',
                'dmpHMG',
                'dmpKhkOtherMedication',
                'dmpRecommendedKhkTrainings',
                'dmpPerceivedDiabetesTraining',
                'dmpPerceivedHypertensionTraining',
                'dmpKhkRelatedTransferArranged',
                'dmpKhkRelatedConfinementArranged',
                'dmpRegularWeightControlRecommended'
            ] ),
            lazyAdd: false
        }
    };

    Y.extend( DmpKhkEditorModel, DmpEditorModel, {
        initializer: function DmpKhkEditorModel_initializer() {
            var
                self = this;
            self.initDmpKhkEditorModel();

        },
        destructor: function DmpKhkEditorModel_destructor() {
        },
        /**
         * Initializes DMP KHK editor model
         * @method initDmpKhkEditorModel
         */
        initDmpKhkEditorModel: function DmpKhkEditorModel_initDmpKhkEditorModel() {
            var
                self = this;

            self.firstI18n = i18n( 'activity-schema.DmpType_E.FIRST.i18n' );
            self.followingI18n = i18n( 'activity-schema.DmpType_E.FOLLOWING.i18n' );
            self.dmpTypeI18n = i18n( 'activity-schema.DmpType_E.PNP.i18n' );
            self.dmpLdlCholesterolUnitLabelI18n = i18n( 'InCaseMojit.DmpKhkEditorModel.dmpLdlCholesterolUnitLabel' );
            self.dmpLdlCholesterolNotDeterminedLabelI18n = i18n( 'InCaseMojit.DmpKhkEditorModel.dmpLdlCholesterolNotDeterminedLabel' );
            self.dmpHadStationaryKhkTreatmentUnitLabelI18n = i18n( 'InCaseMojit.DmpKhkEditorModel.dmpHadStationaryKhkTreatmentUnitLabel' );
            self.edmpDobI18n = i18n( 'person-schema.Person_T.kbvDob' );
            self.genderI18n = i18n( 'patient-schema.Gender_E.i18n' );
            self.edmpCaseNoI18n = i18n( 'patient-schema.Patient_T.edmpCaseNo.i18n' );
            self.patientAddressI18n = i18n( 'InCaseMojit.DmpEditorModel.label.patientAddress' );
            self.employeeNameI18n = i18n( 'InCaseMojit.DmpEditorModel.label.employeeName' );
            self.employeeAddressI18n = i18n( 'InCaseMojit.DmpEditorModel.label.employeeAddress' );
            self.officialNoI18n = i18n( 'physician-schema.Physician_T.officialNo.i18n' );
            self.insuranceNameI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceName' );
            self.insuranceNoI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceNo' );
            self.insuranceIdI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceId' );
            self.fk4133I18n = i18n( 'person-schema.InsuranceStatus_T.fk4133' );
            self.fk4110I18n = i18n( 'person-schema.InsuranceStatus_T.fk4110' );
            self.insuranceKindI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceKind' );
            self.persGroupI18n = i18n( 'person-schema.InsuranceStatus_T.persGroup' );

            self.dmpPerceivedDiabetesTrainingI18n = i18n( 'activity-schema.DMP_BASE_T.dmpPerceivedDiabetesTraining.i18n' );
            self.dmpPerceivedHypertensionTrainingI18n = i18n( 'activity-schema.DMP_BASE_T.dmpPerceivedHypertensionTraining.i18n' );

            self.mixinData = {};
            self.mixinData.anamnesisAndFindingLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.anamnesisAndFinding.label' );
            self.mixinData.relevantEventsLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.relevantEvents.label' );
            self.mixinData.medicationLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.medication.label' );
            self.mixinData.trainingLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.training.label' );
            self.mixinData.treatmentPlanningLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.treatmentPlanning.label' );


            self.initLdlCholesterolValue();
            self.initHadStationaryKhkTreatment();
            self.dmpSerumElectrolytesValidator();
            self.dmpRegularWeightControlRecommendedValidator();
            self.initDmpOptional();

        },
        /**
         * Computes conversion for "dmpLdlCholesterolValue" between number and string
         */
        dmpLdlCholesterolValueString: null,
        initLdlCholesterolValue: function() {
            var
                self = this,
                dmpLdlCholesterolValueStringComputed = {
                    read: function() {
                        var
                            dmpLdlCholesterolValue = unwrap( self.dmpLdlCholesterolValue );

                        if( Y.Lang.isNumber( dmpLdlCholesterolValue ) ) {
                            switch( peek( self.dmpLdlCholesterolUnit ) ) {
                                case 'MMOLL':
                                    dmpLdlCholesterolValue = Y.doccirrus.comctl.numberToLocalString( dmpLdlCholesterolValue, {
                                        decimals: 1
                                    } );
                                    break;
                                case 'MGDL':
                                    dmpLdlCholesterolValue = String( dmpLdlCholesterolValue );
                                    break;
                                default:
                                    dmpLdlCholesterolValue = String( dmpLdlCholesterolValue ).replace( '.', ',' );
                                    break;
                            }
                        }

                        return dmpLdlCholesterolValue;
                    },
                    write: function( value ) {
                        var
                            dmpLdlCholesterolValuePrev = peek( self.dmpLdlCholesterolValue );

                        if( Y.Lang.isString( value ) && value ) {
                            switch( peek( self.dmpLdlCholesterolUnit ) ) {
                                case 'MGDL':
                                    value = value.replace( /,.*$/, '' );
                                    break;
                            }
                            /** ensure max 1 decimal also for "dmpLdlCholesterolValue" by: **/
                            value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                            value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 1 decimal transformed as for read is done
                                decimals: 1
                            } );
                            value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpLdlCholesterolValue" needs it
                        }
                        self.dmpLdlCholesterolValue( value );
                        if( value === dmpLdlCholesterolValuePrev ) {
                            self.dmpLdlCholesterolValue.valueHasMutated();
                        }
                    }
                };

            self.dmpLdlCholesterolValueString = ko.computed( dmpLdlCholesterolValueStringComputed ).extend( {notify: 'always'} );

            self.addDisposable( ko.computed( function() {
                var
                    computedInitial = ko.computedContext.isInitial();

                unwrap( self.dmpLdlCholesterolUnit );

                ignoreDependencies( function() {
                    if( !computedInitial ) {
                        dmpLdlCholesterolValueStringComputed.write( peek( self.dmpLdlCholesterolValueString ) );
                    }
                } );
            } ) );
        },

        dmpSerumElectrolytesValidator: function() {

            var
                self = this,
                activity = peek( self.get( 'currentActivity' ) ),
                errStr = activity.clientId + '.dmpSerumElectrolytes';

            activity.dmpSerumElectrolytes.hasError = ko.observable( false );
            activity.dmpSerumElectrolytes.validationMessages = ko.observableArray();

            self.addDisposable( ko.computed( function() {

                var activity = peek( self.get( 'currentActivity' ) ),
                    patient = activity && activity.patientShort ? activity.patientShort() : null,
                    isAfterQ12018 = unwrap( self.isAfterQ12018 ),
                    serumElectrolytes;

                if( !patient || isAfterQ12018 ) {
                    activity.dmpSerumElectrolytes.hasError( false );
                    self.setValidationState( {isValid: true}, activity, errStr );
                    return;
                }

                activity.dmpSerumElectrolytes();

                activity.dmpSerumElectrolytes.validationMessages.removeAll();

                serumElectrolytes = eDmpHelpers.validateSerumElectrolytes( patient, activity.toJSON() );

                self.setValidationState( serumElectrolytes, activity, errStr );

                activity.dmpSerumElectrolytes.hasError( !serumElectrolytes.isValid );
                if( serumElectrolytes.err && serumElectrolytes.err.code ) {
                    activity.dmpSerumElectrolytes.validationMessages.push( getErr( {code: serumElectrolytes.err.code} ) );
                }

            } ) );

        },

        dmpRegularWeightControlRecommendedValidator: function() {

            var
                self = this,
                activity = peek( self.get( 'currentActivity' ) ),
                errStr = activity.clientId + '.dmpRegularWeightControlRecommended';

            activity.dmpRegularWeightControlRecommended.hasError = ko.observable( false );
            activity.dmpRegularWeightControlRecommended.validationMessages = ko.observableArray();

            self.addDisposable( ko.computed( function() {

                var activity = peek( self.get( 'currentActivity' ) ),
                    patient = activity && activity.patientShort ? activity.patientShort() : null,
                    isAfterQ12018 = unwrap( self.isAfterQ12018 ),
                    weight;

                if( !patient || isAfterQ12018 ) {
                    activity.dmpRegularWeightControlRecommended.hasError( false );
                    self.setValidationState( {isValid: true}, activity, errStr );
                    return;
                }

                activity.dmpRegularWeightControlRecommended();

                activity.dmpRegularWeightControlRecommended.validationMessages.removeAll();

                weight = eDmpHelpers.validateRegularWeightControlRecommended( patient, activity.toJSON() );

                self.setValidationState( weight, activity, errStr );

                activity.dmpRegularWeightControlRecommended.hasError( !weight.isValid );
                if( weight.err && weight.err.code ) {
                    activity.dmpRegularWeightControlRecommended.validationMessages.push( getErr( {code: weight.err.code} ) );
                }

            } ) );

        },

        initDmpOptional: function() {
            var self = this;

            var patient = peek( self.get( 'currentPatient' ) );
            var isHeartFailure = peek( patient.edmpParticipationChronicHeartFailure );
            var hintLevel = !isHeartFailure ? 'OPTIONAL' : null;

            this.dmpSerumElectrolytes.hintLevel = hintLevel;
            this.dmpRegularWeightControlRecommended.hintLevel = hintLevel;

        },
        /**
         * Computes conversion for "dmpHadStationaryKhkTreatment" between number and string
         */
        dmpHadStationaryKhkTreatmentString: null,
        initHadStationaryKhkTreatment: function() {
            var
                self = this;

            self.dmpHadStationaryKhkTreatmentString = ko.computed( {
                read: function() {
                    var
                        dmpHadStationaryKhkTreatment = unwrap( self.dmpHadStationaryKhkTreatment );

                    if( Y.Lang.isNumber( dmpHadStationaryKhkTreatment ) ) {
                        dmpHadStationaryKhkTreatment = Y.doccirrus.comctl.numberToLocalString( dmpHadStationaryKhkTreatment, {
                            decimals: 0
                        } );
                    }

                    return dmpHadStationaryKhkTreatment;
                },
                write: function( value ) {
                    var
                        dmpHadStationaryKhkTreatmentPrev = peek( self.dmpHadStationaryKhkTreatment );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 0 decimal also for "dmpHadStationaryKhkTreatment" by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                            decimals: 0
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpHadStationaryKhkTreatment" needs it
                    }
                    self.dmpHadStationaryKhkTreatment( value );
                    if( value === dmpHadStationaryKhkTreatmentPrev ) {
                        self.dmpHadStationaryKhkTreatment.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );
        }
    }, {
        NAME: 'DmpKhkEditorModel'
    } );

    KoViewModel.registerConstructor( DmpKhkEditorModel );

}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel',
        'DmpEditorModel',
        'dc-comctl'
    ]
} );
