/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'DmpAsthmaEditorModel', function( Y ) {
    'use strict';
    /**
     * @module DmpAsthmaEditorModel
     */

    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,

        KoViewModel = Y.doccirrus.KoViewModel,
        DmpEditorModel = KoViewModel.getConstructor( 'DmpEditorModel' ),
        Q1_2019 = Y.doccirrus.edmpcommonutils.Q1_2019;

    /**
     * @class DmpAsthmaEditorModel
     * @constructor
     * @extends DmpEditorModel
     */
    function DmpAsthmaEditorModel( config ) {
        DmpAsthmaEditorModel.superclass.constructor.call( this, config );
    }

    DmpAsthmaEditorModel.ATTRS = {
        whiteList: {
            value: DmpEditorModel.ATTRS.whiteList.value.concat( [
                'dmpFrequencyOfAsthmaSymptoms',
                'dmpFrequencyOfAsthmaSymptoms_4_44',
                'dmpFrequencyOfUseOfNeedMedication_4_44',
                'dmpLimitationOfEverydayActivitiesDueToBronchialAsthma_4_44',
                'dmpAsthmaRelatedNightSleepDisorder_4_44',
                'dmpCurrentPeakFlowValue',
                'dmpCurrentPeakFlowValueNotDone',
                'dmpCurrentFEV1Value_4_44',
                'dmpCurrentFEV1ValueNotDone_4_44',
                'dmpHadUnplannedAsthmaTreatment_4_44',
                'dmpHadStationaryAsthmaTreatment',
                'dmpInhaledGlucocorticosteroids',
                'dmpInhaledLongActingBeta2AdrenergicAgonist',
                'dmpInhaledRapidActingBeta2AdrenergicAgonist',
                'dmpSystemicGlucocorticosteroids',
                'dmpOtherAsthmaSpecificMedication',
                'dmpCheckedInhalationTechnique',
                'dmpRecommendedAsthmaTrainings',
                'dmpAsthmaTrainingAlreadyDoneBeforeDMP_4_44',
                'dmpPerceivedAsthmaTraining',
                'dmpWrittenSelfManagementPlan',
                'dmpTherapyAdjustment_4_44',
                'dmpAsthmaRelatedTransferOrConfinementArranged'
            ] ),
            lazyAdd: false
        }
    };

    Y.extend( DmpAsthmaEditorModel, DmpEditorModel, {
        initializer: function DmpAsthmaEditorModel_initializer() {
            var
                self = this;
            self.initDmpAsthmaEditorModel();

        },
        destructor: function DmpAsthmaEditorModel_destructor() {
        },
        /**
         * Initializes DMP ASTHMA editor model
         * @method initDmpAsthmaEditorModel
         */
        initDmpAsthmaEditorModel: function DmpAsthmaEditorModel_initDmpAsthmaEditorModel() {
            var
                self = this;

            self.firstI18n = i18n( 'activity-schema.DmpType_E.FIRST.i18n' );
            self.followingI18n = i18n( 'activity-schema.DmpType_E.FOLLOWING.i18n' );
            self.dmpTypeI18n = i18n( 'activity-schema.DmpType_E.PNP.i18n' );
            self.dmpHadStationaryAsthmaTreatmentUnitLabelI18n = i18n( 'InCaseMojit.DmpAsthmaEditorModel.dmpHadStationaryAsthmaTreatmentUnitLabel' );
            self.dmpCurrentPeakFlowUnitLabelI18n = i18n( 'InCaseMojit.DmpAsthmaEditorModel.dmpCurrentPeakFlowUnitLabel' );
            self.dmpCurrentPeakFlowValueNotDoneLabelI18n = i18n( 'InCaseMojit.DmpAsthmaEditorModel.dmpCurrentPeakFlowValueNotDoneLabel' );
            self.dmpCurrentFEV1Value_4_44UnitLabelI18n = i18n( 'InCaseMojit.DmpAsthmaEditorModel.dmpCurrentFEV1Value_4_44UnitLabel' );
            self.dmpLdlCholesterolNotDeterminedLabelI18n = i18n( 'InCaseMojit.DmpKhkEditorModel.dmpLdlCholesterolNotDeterminedLabel' );
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

            self.dmpPerceivedAsthmaTrainingI18n = i18n( 'activity-schema.ASTHMA_T.dmpPerceivedAsthmaTraining.i18n' );

            self.mixinData = {};
            self.mixinData.anamnesisAndFindingLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.anamnesisAndFinding.label' );
            self.mixinData.relevantEventsLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.relevantEvents.label' );
            self.mixinData.medicationLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.medication.label' );
            self.mixinData.trainingLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.training.label' );
            self.mixinData.treatmentPlanningLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.treatmentPlanning.label' );

            self.initCurrentPeakFlowValue();
            self.initDmpCurrentFEV1Value_4_44();
            self.initHadStationaryAsthmaTreatment();
            self.initUnplannedAsthmaTreatment_4_44();

            // Update to schema version 4.44
            self.isAfterQ12019 = ko.computed( function() {
                const
                    afterDate = moment( Q1_2019, 'Q/YYYY' ),
                    contextDate = moment( self.dmpQuarter() + '/' + self.dmpYear(), 'Q/YYYY' );
                return contextDate.isAfter( afterDate );
            } );


        },
        /**
         * Computes conversion for "dmpCurrentPeakFlowValue" between number and string
         */
        dmpCurrentPeakFlowValueString: null,
        initCurrentPeakFlowValue: function(){
            var
                self = this;

            self.dmpCurrentPeakFlowValueString = ko.computed( {
                read: function() {
                    var
                        dmpCurrentPeakFlowValue = unwrap( self.dmpCurrentPeakFlowValue );

                    if( Y.Lang.isNumber( dmpCurrentPeakFlowValue ) ) {
                        dmpCurrentPeakFlowValue = Y.doccirrus.comctl.numberToLocalString( dmpCurrentPeakFlowValue, {
                            decimals: 0
                        } );
                    }

                    return dmpCurrentPeakFlowValue;
                },
                write: function( value ) {
                    var
                        dmpCurrentPeakFlowValuePrev = peek( self.dmpCurrentPeakFlowValue );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 0 decimal also for "dmpCurrentPeakFlowValue" by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                            decimals: 0
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpCurrentPeakFlowValue" needs it
                    }
                    self.dmpCurrentPeakFlowValue( value );
                    if( value === dmpCurrentPeakFlowValuePrev ) {
                        self.dmpCurrentPeakFlowValue.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );
        },
        initDmpCurrentFEV1Value_4_44: function() {
            var
                self = this;

            self.dmpCurrentFEV1Value_4_44String = ko.computed( {
                read: function() {
                    var
                        dmpCurrentFEV1Value_4_44 = unwrap( self.dmpCurrentFEV1Value_4_44 );

                    if( Y.Lang.isNumber( dmpCurrentFEV1Value_4_44 ) ) {
                        dmpCurrentFEV1Value_4_44 = Y.doccirrus.comctl.numberToLocalString( dmpCurrentFEV1Value_4_44, {
                            decimals: 1
                        } );
                    }

                    return dmpCurrentFEV1Value_4_44;
                },
                write: function( value ) {
                    var
                        dmpCurrentFEV1Value_4_44Prev = peek( self.dmpCurrentFEV1Value_4_44 );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 0 decimal also for "dmpCurrentFEV1Value_4_44" by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                            decimals: 1
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpCurrentFEV1Value_4_44" needs it
                    }
                    self.dmpCurrentFEV1Value_4_44( value );
                    if( value === dmpCurrentFEV1Value_4_44Prev ) {
                        self.dmpCurrentFEV1Value_4_44.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );
        },
        /**
         * Computes conversion for "dmpHadStationaryAsthmaTreatment" between number and string
         */
        dmpHadStationaryAsthmaTreatmentString: null,
        initHadStationaryAsthmaTreatment: function(){
            var
                self = this;

            self.dmpHadStationaryAsthmaTreatmentString = ko.computed( {
                read: function() {
                    var
                        dmpHadStationaryAsthmaTreatment = unwrap( self.dmpHadStationaryAsthmaTreatment );

                    if( Y.Lang.isNumber( dmpHadStationaryAsthmaTreatment ) ) {
                        dmpHadStationaryAsthmaTreatment = Y.doccirrus.comctl.numberToLocalString( dmpHadStationaryAsthmaTreatment, {
                            decimals: 0
                        } );
                    }

                    return dmpHadStationaryAsthmaTreatment;
                },
                write: function( value ) {
                    var
                        dmpHadStationaryAsthmaTreatmentPrev = peek( self.dmpHadStationaryAsthmaTreatment );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 0 decimal also for "dmpHadStationaryAsthmaTreatment" by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                            decimals: 0
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpHadStationaryAsthmaTreatment" needs it
                    }
                    self.dmpHadStationaryAsthmaTreatment( value );
                    if( value === dmpHadStationaryAsthmaTreatmentPrev ) {
                        self.dmpHadStationaryAsthmaTreatment.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );
        },
        initUnplannedAsthmaTreatment_4_44: function() {
            var
                self = this;

            self.dmpHadUnplannedAsthmaTreatment_4_44String = ko.computed( {
                read: function() {
                    var
                        dmpHadUnplannedAsthmaTreatment_4_44 = unwrap( self.dmpHadUnplannedAsthmaTreatment_4_44 );

                    if( Y.Lang.isNumber( dmpHadUnplannedAsthmaTreatment_4_44 ) ) {
                        dmpHadUnplannedAsthmaTreatment_4_44 = Y.doccirrus.comctl.numberToLocalString( dmpHadUnplannedAsthmaTreatment_4_44, {
                            decimals: 0
                        } );
                    }

                    return dmpHadUnplannedAsthmaTreatment_4_44;
                },
                write: function( value ) {
                    var
                        dmpHadUnplannedAsthmaTreatment_4_44Prev = peek( self.dmpHadUnplannedAsthmaTreatment_4_44 );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 0 decimal also for "dmpHadUnplannedAsthmaTreatment_4_44" by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                            decimals: 0
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpHadUnplannedAsthmaTreatment_4_44" needs it
                    }
                    self.dmpHadUnplannedAsthmaTreatment_4_44( value );
                    if( value === dmpHadUnplannedAsthmaTreatment_4_44Prev ) {
                        self.dmpHadUnplannedAsthmaTreatment_4_44.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );
        }
    }, {
        NAME: 'DmpAsthmaEditorModel'
    } );

    KoViewModel.registerConstructor( DmpAsthmaEditorModel );

}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel',
        'DmpEditorModel',
        'dc-comctl'
    ]
} );
