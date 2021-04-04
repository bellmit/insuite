/**
 * User: do
 * Date: 21/04/16  16:16
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'DmpDm1EditorModel', function( Y ) {
        'use strict';
        /**
         * @module DmpDm1EditorModel
         */

        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,

            KoViewModel = Y.doccirrus.KoViewModel,
            eDmpHelpers = Y.doccirrus.edmpcommonutils,
            DmpDmEditorModel = KoViewModel.getConstructor( 'DmpDmEditorModel' );

        /**
         * @class DmpDm1EditorModel
         * @constructor
         * @extends DmpDmEditorModel
         */
        function DmpDm1EditorModel( config ) {
            DmpDm1EditorModel.superclass.constructor.call( this, config );
        }

        DmpDm1EditorModel.ATTRS = {
            whiteList: {
                value: DmpDmEditorModel.ATTRS.whiteList.value.concat( [
                    'dmpHadHospitalStayHbA1c'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( DmpDm1EditorModel, DmpDmEditorModel, {
                initializer: function DmpDmEditor_initializer() {
                    var
                        self = this;
                    self.initDmpDm1EditorModel();
                },
                destructor: function DmpDmEditor_destructor() {
                },
                /**
                 * Initializes DMP DM editor model
                 * @method initDmpDm1EditorModel
                 */
                initDmpDm1EditorModel: function DmpDm1EditorModel_initDmpDm1EditorModel() {
                    var
                        self = this;

                    self.initHadHospitalStayHbA1c();
                    self.initDmpOptional();

                    self.mixinData = {};
                    self.mixinData.anamnesisAndFindingLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.anamnesisAndFinding.label' );
                    self.mixinData.relevantEventsLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.relevantEvents.label' );
                    self.mixinData.medicationLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.medication.label' );
                    self.mixinData.trainingLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.training.label' );
                    self.mixinData.treatmentPlanningLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.treatmentPlanning.label' );
                },
                /**
                 * Computes conversion for "dmpHadHospitalStayHbA1c" between number and string
                 */
                dmpHadHospitalStayHbA1cString: null,
                initHadHospitalStayHbA1c: function() {
                    var
                        self = this;

                    self.dmpHadHospitalStayHbA1cString = ko.computed( {
                        read: function() {
                            var
                                dmpHadHospitalStayHbA1c = unwrap( self.dmpHadHospitalStayHbA1c );

                            if( Y.Lang.isNumber( dmpHadHospitalStayHbA1c ) ) {
                                dmpHadHospitalStayHbA1c = Y.doccirrus.comctl.numberToLocalString( dmpHadHospitalStayHbA1c, {
                                    decimals: 0
                                } );
                            }

                            return dmpHadHospitalStayHbA1c;
                        },
                        write: function( value ) {
                            var
                                dmpHadHospitalStayHbA1cPrev = peek( self.dmpHadHospitalStayHbA1c );

                            if( Y.Lang.isString( value ) && value ) {
                                /** ensure max 0 decimal also for "dmpHadHospitalStayHbA1c" by: **/
                                value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                                value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                                    decimals: 0
                                } );
                                value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpHadHospitalStayHbA1c" needs it
                            }
                            self.dmpHadHospitalStayHbA1c( value );
                            if( value === dmpHadHospitalStayHbA1cPrev ) {
                                self.dmpHadHospitalStayHbA1c.valueHasMutated();
                            }
                        }
                    } ).extend( {notify: 'always'} );
                },
                initDmpOptional: function() {

                    var self = this,
                        actType = this.actType(),
                        patient = this._state.data.currentPatient.value().toJSON(),
                        isFootStatusOptional = !eDmpHelpers.isOlderThan( patient, this.dmpHeadDate(), 18 ),
                        hintLevel = isFootStatusOptional ? 'OPTIONAL' : null;

                    self.dmpFootStatusText.hintLevel = hintLevel;
                    self.dmpPulsStatus.hintLevel = hintLevel;
                    self.dmpSensitivityTesting.hintLevel = hintLevel;


                    self.dmpFurtherRiskUlcus.hintLevel = hintLevel;
                    self.dmpUlkus.hintLevel = hintLevel;
                    self.dmpWoundInfection.hintLevel = hintLevel;
                    self.dmpIntervalFutureFootInspections.hintLevel = hintLevel;

                    self.dmpInjectionSites.hintLevel =
                        eDmpHelpers.isDmpInjectionSitesOptional( actType, false ) ? 'OPTIONAL' : null;

                }
            }, {
                NAME: 'DmpDm1EditorModel'
            }
        );

        KoViewModel.registerConstructor( DmpDm1EditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'DmpDmEditorModel',
            'dc-comctl',
            'edmp-commonutils'
        ]
    }
);
