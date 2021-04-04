/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'DmpCopdEditorModel', function( Y ) {
    'use strict';
    /**
     * @module DmpCopdEditorModel
     */

    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        COPD_4_0_0_LAST_QUARTER = Y.doccirrus.edmpcommonutils.COPD_4_0_0_LAST_QUARTER,
        KoViewModel = Y.doccirrus.KoViewModel,
        DmpEditorModel = KoViewModel.getConstructor( 'DmpEditorModel' ),
        i18n = Y.doccirrus.i18n;

    /**
     * @class DmpCopdEditorModel
     * @constructor
     * @extends DmpEditorModel
     */
    function DmpCopdEditorModel( config ) {
        DmpCopdEditorModel.superclass.constructor.call( this, config );
    }

    DmpCopdEditorModel.ATTRS = {
        whiteList: {
            value: DmpEditorModel.ATTRS.whiteList.value.concat( [
                'dmpSmoker',
                'dmpCurrentFev1',
                'dmpCurrentFev1NotDone',
                'dmpClinicalAssessmentOfOsteoporosisRisk',
                'dmpFrequencyExacerbationsSinceLast',
                'dmpHadStationaryCopdTreatment',
                'dmpCheckedInhalationTechnique',
                'dmpShortActingBeta2AdrenergicAgonistAnticholinergics',
                'dmpLongActingBeta2AdrenergicAgonist',
                'dmpLongActingAnticholinergics',
                'dmpOtherDiseaseSpecificMedication',
                'dmpRecommendedCopdTrainings',
                'dmpAttendedTrainingBeforeSubscription',
                'dmpPerceivedCopdTraining',
                'dmpCopdRelatedTransferOrConfinementArranged',
                'dmpRecommendedTobaccoAbstinence',
                'dmpRecommendedTobaccoRehabProgram',
                'dmpAttendedTobaccoRehabProgramSinceLastRecommendation',
                'dmpRecommendedPhysicalTraining'
            ] ),
            lazyAdd: false
        }
    };

    Y.extend( DmpCopdEditorModel, DmpEditorModel, {
        initializer: function DmpCopdEditorModel_initializer() {
            var
                self = this;
            self.initDmpCopdEditorModel();

        },
        destructor: function DmpCopdEditorModel_destructor() {
        },
        /**
         * Initializes DMP COPD editor model
         * @method initDmpCopdEditorModel
         */
        initDmpCopdEditorModel: function DmpCopdEditorModel_initDmpCopdEditorModel() {
            var
                self = this;

            self.firstI18n = i18n( 'activity-schema.DmpType_E.FIRST.i18n' );
            self.followingI18n = i18n( 'activity-schema.DmpType_E.FOLLOWING.i18n' );
            self.dmpTypeI18n = i18n( 'activity-schema.DmpType_E.PNP.i18n' );
            self.dmpCurrentFev1UnitLabel400I18n = i18n( 'InCaseMojit.DmpCopdEditorModel.dmpCurrentFev1UnitLabel_4_0_0' );
            self.dmpCurrentFev1UnitLabelI18n = i18n( 'InCaseMojit.DmpCopdEditorModel.dmpCurrentFev1UnitLabel' );
            self.dmpCurrentFev1NotDoneLabelI18n = i18n( 'InCaseMojit.DmpCopdEditorModel.dmpCurrentFev1NotDoneLabel' );
            self.dmpHadStationaryCopdTreatmentUnitLabelI18n = i18n( 'InCaseMojit.DmpCopdEditorModel.dmpHadStationaryCopdTreatmentUnitLabel' );
            self.dmpFrequencyExacerbationsSinceLastUnitLabelI18n = i18n( 'InCaseMojit.DmpCopdEditorModel.dmpFrequencyExacerbationsSinceLastUnitLabel' );
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

            self.dmpPerceivedCopdTrainingI18n = i18n( 'activity-schema.COPD_T.dmpPerceivedCopdTraining.i18n' );

            self.mixinData = {};
            self.mixinData.anamnesisAndFindingLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.anamnesisAndFinding.label' );
            self.mixinData.relevantEventsLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.relevantEvents.label' );
            self.mixinData.medicationLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.medication.label' );
            self.mixinData.trainingLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.training.label' );
            self.mixinData.treatmentPlanningLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.treatmentPlanning.label' );


            self.isAfterQ42017 = ko.computed( function() {
                const
                    afterDate = moment( COPD_4_0_0_LAST_QUARTER, 'Q/YYYY' ),
                    contextDate = moment( self.dmpQuarter() + '/' + self.dmpYear(), 'Q/YYYY' );
                return contextDate.isAfter( afterDate );
            } );

            self.initTobaccoFields();
            self.initCurrentFev1();
            self.initFrequencyExacerbationsSinceLast();
            self.initHadStationaryCopdTreatment();

        },
        /**
         * Computes conversion for "dmpCurrentFev1" between number and string
         */
        dmpCurrentFev1String: null,
        initTobaccoFields: function() {
            var
                self = this;

            self.dmpRecommendedTobaccoAbstinence.hintLevel = ko.observable();
            self.dmpRecommendedTobaccoRehabProgram.hintLevel = ko.observable();
            self.dmpAttendedTobaccoRehabProgramSinceLastRecommendation.hintLevel = ko.observable();

            self.addDisposable( ko.computed( function() {
                var dmpSmoker = self.dmpSmoker(),
                    hintLevel = 'YES' === dmpSmoker ? null : 'OPTIONAL';

                self.dmpRecommendedTobaccoAbstinence.validate();
                self.dmpRecommendedTobaccoRehabProgram.validate();
                self.dmpAttendedTobaccoRehabProgramSinceLastRecommendation.validate();

                self.dmpRecommendedTobaccoAbstinence.hintLevel( hintLevel );
                self.dmpRecommendedTobaccoRehabProgram.hintLevel( hintLevel );
                self.dmpAttendedTobaccoRehabProgramSinceLastRecommendation.hintLevel( hintLevel );
            } ) );

        },
        initCurrentFev1: function(){
            var
                self = this;

            self.dmpCurrentFev1String = ko.computed( {
                read: function() {
                    var
                        isAfterQ42017 = self.isAfterQ42017(),
                        dmpCurrentFev1 = unwrap( self.dmpCurrentFev1 );

                    if( Y.Lang.isNumber( dmpCurrentFev1 ) ) {
                        dmpCurrentFev1 = Y.doccirrus.comctl.numberToLocalString( dmpCurrentFev1, {
                            decimals: isAfterQ42017 ? 1 : 2
                        } );
                    }

                    return dmpCurrentFev1;
                },
                write: function( value ) {
                    var
                        isAfterQ42017 = self.isAfterQ42017(),
                        dmpCurrentFev1Prev = peek( self.dmpCurrentFev1 );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 2 decimal also for "dmpCurrentFev1" by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 2 decimal transformed as for read is done
                            decimals: isAfterQ42017 ? 1 : 2
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpCurrentFev1" needs it
                    }
                    self.dmpCurrentFev1( value );
                    if( value === dmpCurrentFev1Prev ) {
                        self.dmpCurrentFev1.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );
        },
        /**
         * Computes conversion for "dmpFrequencyExacerbationsSinceLast" between number and string
         */
        dmpFrequencyExacerbationsSinceLastString: null,
        initFrequencyExacerbationsSinceLast: function(){
            var
                self = this;

            self.dmpFrequencyExacerbationsSinceLastString = ko.computed( {
                read: function() {
                    var
                        dmpFrequencyExacerbationsSinceLast = unwrap( self.dmpFrequencyExacerbationsSinceLast );

                    if( Y.Lang.isNumber( dmpFrequencyExacerbationsSinceLast ) ) {
                        dmpFrequencyExacerbationsSinceLast = Y.doccirrus.comctl.numberToLocalString( dmpFrequencyExacerbationsSinceLast, {
                            decimals: 0
                        } );
                    }

                    return dmpFrequencyExacerbationsSinceLast;
                },
                write: function( value ) {
                    var
                        dmpFrequencyExacerbationsSinceLastPrev = peek( self.dmpFrequencyExacerbationsSinceLast );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 0 decimal also for "dmpFrequencyExacerbationsSinceLast" by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                            decimals: 0
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpFrequencyExacerbationsSinceLast" needs it
                    }
                    self.dmpFrequencyExacerbationsSinceLast( value );
                    if( value === dmpFrequencyExacerbationsSinceLastPrev ) {
                        self.dmpFrequencyExacerbationsSinceLast.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );
        },
        /**
         * Computes conversion for "dmpHadStationaryCopdTreatment" between number and string
         */
        dmpHadStationaryCopdTreatmentString: null,
        initHadStationaryCopdTreatment: function(){
            var
                self = this;

            self.dmpHadStationaryCopdTreatmentString = ko.computed( {
                read: function() {
                    var
                        dmpHadStationaryCopdTreatment = unwrap( self.dmpHadStationaryCopdTreatment );

                    if( Y.Lang.isNumber( dmpHadStationaryCopdTreatment ) ) {
                        dmpHadStationaryCopdTreatment = Y.doccirrus.comctl.numberToLocalString( dmpHadStationaryCopdTreatment, {
                            decimals: 0
                        } );
                    }

                    return dmpHadStationaryCopdTreatment;
                },
                write: function( value ) {
                    var
                        dmpHadStationaryCopdTreatmentPrev = peek( self.dmpHadStationaryCopdTreatment );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 0 decimal also for "dmpHadStationaryCopdTreatment" by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                            decimals: 0
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpHadStationaryCopdTreatment" needs it
                    }
                    self.dmpHadStationaryCopdTreatment( value );
                    if( value === dmpHadStationaryCopdTreatmentPrev ) {
                        self.dmpHadStationaryCopdTreatment.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );
        }
    }, {
        NAME: 'DmpCopdEditorModel'
    } );

    KoViewModel.registerConstructor( DmpCopdEditorModel );

}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel',
        'DmpEditorModel',
        'dc-comctl'
    ]
} );
