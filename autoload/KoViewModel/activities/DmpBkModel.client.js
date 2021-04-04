/**
 * User: oliversieweke
 * Date: 07.03.18  11:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI*/
YUI.add( 'DmpBkModel', function( Y/*, NAME */ ) {
        'use strict';
        /**
         * @module DmpBkModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            DmpBaseModel = KoViewModel.getConstructor( 'DmpBaseModel' );

        /**
         * @abstract
         * @class DmpBkModel
         * @constructor
         * @extends DmpBaseModel
         */
        function DmpBkModel( config ) {
            DmpBkModel.superclass.constructor.call( this, config );
        }

        Y.extend( DmpBkModel, DmpBaseModel, {
            initializer: function() {
                var
                    self = this;

                self.initDmpBkModel();
            },
            destructor: function() {
            },
            initDmpBkModel: function() {
                var
                    self = this,
                    isRelevant = Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant;

            // Many validations for fields of the BK form depend on entries in other fields. All the necessary
            // subscriptions are set up manually below to insure the form updates accordingly.

                self.dmpSignatureDate.subscribe( function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21", "4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpInitialManifestationOfPrimaryTumor.validate();
                        self.dmpManifestationOfContralateralBreastCancer.validate();
                        self.dmpLocoregionalRecurrence.validate();
                        self.dmpFirstConfirmationOfRemoteMetastases.validate();
                    }
                    if( isRelevant( self.toJSON(), {versions: ["4.21", "4.23"], dmpTypes: ["FOLLOWING"]} ) ) {
                        self.dmpManifestationOfLocoregionalRecurrence_following_date.validate();
                        self.dmpManifestationOfContralateralBreastCancer_following_date.validate();
                        self.dmpManifestationOfRemoteMetastases_following_date.validate();
                    }
                } );
                self.dmpInitialManifestationOfPrimaryTumor.subscribe( function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21", "4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpManifestationOfContralateralBreastCancer.validate();
                        self.dmpLocoregionalRecurrence.validate();
                        self.dmpFirstConfirmationOfRemoteMetastases.validate();
                    }
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpPerformedSurgicalTherapy_4_23.validate();
                        self.dmpCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpContinuationOfCurrentEndocrineTherapy_4_23.validate();
                        self.dmpDxaFindings_4_23.validate();
                    }
                } );
                self.dmpManifestationOfContralateralBreastCancer.subscribe( function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21", "4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpInitialManifestationOfPrimaryTumor.validate();
                        self.dmpLocoregionalRecurrence.validate();
                        self.dmpFirstConfirmationOfRemoteMetastases.validate();
                    }
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpPerformedSurgicalTherapy_4_23.validate();
                        self.dmpCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpContinuationOfCurrentEndocrineTherapy_4_23.validate();
                        self.dmpDxaFindings_4_23.validate();
                    }
                } );
                self.dmpLocoregionalRecurrence.subscribe( function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21", "4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpInitialManifestationOfPrimaryTumor.validate();
                        self.dmpManifestationOfContralateralBreastCancer.validate();
                        self.dmpFirstConfirmationOfRemoteMetastases.validate();
                    }
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpPerformedSurgicalTherapy_4_23.validate();
                        self.dmpCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpContinuationOfCurrentEndocrineTherapy_4_23.validate();
                        self.dmpDxaFindings_4_23.validate();
                    }
                } );
                self.dmpFirstConfirmationOfRemoteMetastases.subscribe( function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21", "4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpInitialManifestationOfPrimaryTumor.validate();
                        self.dmpManifestationOfContralateralBreastCancer.validate();
                        self.dmpLocoregionalRecurrence.validate();
                        self.dmpBisphosphonateTherapy.validate();
                        self.dmpDenosumab_4_23.validate();
                    }
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpPerformedSurgicalTherapy_4_23.validate();
                        self.dmpLocalisation_4_23.validate();
                        self.dmpCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpContinuationOfCurrentEndocrineTherapy_4_23.validate();
                        self.dmpDxaFindings_4_23.validate();
                    }
                    if( isRelevant( self.toJSON(), {versions: ["4.21"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpLocalisation.validate();
                    }
                } );

                self.dmpPerformedSurgicalTherapy_4_23.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpPT_4_23.validate();
                        self.dmpPN_4_23.validate();
                        self.dmpM_4_23.validate();
                        self.dmpImmunohistochemicalHormoneReceptor_4_23.validate();
                    }
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FIRST", "PNP"]} ) ) {
                        self.dmpTnmClassification_4_23.validate();
                    }
                });
                self.dmpM_4_23.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpContinuationOfCurrentEndocrineTherapy_4_23.validate();
                        self.dmpDxaFindings_4_23.validate();
                    }
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FIRST", "PNP"]} ) ) {
                        self.dmpImmunohistochemicalHormoneReceptor_4_23.validate();
                    }
                });
                self.dmpImmunohistochemicalHormoneReceptor_4_23.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpContinuationOfCurrentEndocrineTherapy_4_23.validate();
                        self.dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpDxaFindings_4_23.validate();
                    }
                });
                self.dmpCurrentAdjuvantEndocrineTherapy_4_23.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FIRST", "FOLLOWING"]} ) ) {
                        self.dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpDxaFindings_4_23.validate();
                    }
                });
                self.dmpLocalisation_4_23.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpBisphosphonateTherapy.validate();
                        self.dmpDenosumab_4_23.validate();
                    }
                });
                self.dmpLocalisation.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"], dmpTypes: ["FIRST"]} ) ) {
                        self.dmpBisphosphonateTherapy.validate();
                    }
                });
                self.dmpRegistrationFor.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FOLLOWING"]} ) ) {
                        self.dmpCurrentAdjuvantEndocrineTherapy_4_23.validate();
                        self.dmpContinuationOfCurrentEndocrineTherapy_4_23.validate();
                    }
                });
                self.dmpManifestationOfLocoregionalRecurrence_following_date.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21", "4.23"], dmpTypes: ["FOLLOWING"]} ) ) {
                        self.dmpManifestationOfLocoregionalRecurrence_following_text.validate();
                    }
                });
                self.dmpManifestationOfLocoregionalRecurrence_following_text.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21", "4.23"], dmpTypes: ["FOLLOWING"]} ) ) {
                        self.dmpManifestationOfLocoregionalRecurrence_following_date.validate();
                    }
                });
                self.dmpManifestationOfContralateralBreastCancer_following_date.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21", "4.23"], dmpTypes: ["FOLLOWING"]} ) ) {
                        self.dmpManifestationOfContralateralBreastCancer_following_text.validate();
                    }
                });
                self.dmpManifestationOfContralateralBreastCancer_following_text.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21", "4.23"], dmpTypes: ["FOLLOWING"]} ) ) {
                        self.dmpManifestationOfContralateralBreastCancer_following_date.validate();
                    }
                });
                self.dmpManifestationOfRemoteMetastases_following_date.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"], dmpTypes: ["FOLLOWING"]} ) ) {
                        self.dmpManifestationOfRemoteMetastases_following_text.validate();
                    }
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FOLLOWING"]} ) ) {
                        self.dmpManifestationOfRemoteMetastases_following_text_4_23.validate();
                    }
                });
                self.dmpManifestationOfRemoteMetastases_following_text.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"], dmpTypes: ["FOLLOWING"]} ) ) {
                        self.dmpManifestationOfRemoteMetastases_following_date.validate();
                        self.dmpBisphosphonateTherapy.validate();
                    }
                });
                self.dmpManifestationOfRemoteMetastases_following_text_4_23.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FOLLOWING"]} ) ) {
                        self.dmpManifestationOfRemoteMetastases_following_date.validate();
                        self.dmpBiopticConfirmationOfVisceralMetastases_4_23.validate();
                        self.dmpBisphosphonateTherapy.validate();
                        self.dmpDenosumab_4_23.validate();
                    }
                });
                self.dmpBisphosphonateTherapy.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FOLLOWING"]} ) ) {
                        self.dmpDenosumab_4_23.validate();
                    }
                });
                self.dmpDenosumab_4_23.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.23"], dmpTypes: ["FOLLOWING"]} ) ) {
                        self.dmpBisphosphonateTherapy.validate();
                    }
                });

                self.dmpShowOptionalFields.subscribe(function() {
                    self.dmpCurrentAdjuvantEndocrineTherapy_4_23.validate();

                });

            // TO BE DELETED: 4.21 - START -----------------------------------------------------------------------------
                self.dmpShowOptionalFields.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpPerformedSurgicalTherapy.validate();
                        self.dmpPT.validate();
                        self.dmpPN.validate();
                        self.dmpResection.validate();
                        self.dmpOngoingOrCompletedTherapy_locoregionalRecurrence.validate();
                        self.dmpOngoingOrCompletedTherapy_remoteMetastases.validate();
                        self.dmpBisphosphonateTherapy.validate();
                        self.dmpCurrentTreatmentStatus_following.validate();
                        self.dmpTherapyOfLocoregionalRecurrence.validate();
                        self.dmpTherapyOfRemoteMetastases.validate();
                        self.dmpBisphosphonateTherapy_following.validate();
                    }
                });
                self.dmpInitialManifestationOfPrimaryTumor.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpSignatureDate.validate();
                        self.dmpAffectedBreast.validate();
                        self.dmpCurrentTreatmentStatus.validate();
                        self.dmpPerformedSurgicalTherapy.validate();
                        self.dmpPreoperativeNeoadjuvantTherapy.validate();
                        self.dmpPT.validate();
                        self.dmpPN.validate();
                        self.dmpM.validate();
                        self.dmpGrading.validate();
                        self.dmpResection.validate();
                        self.dmpImmunohistochemicalHormoneReceptor.validate();
                        self.dmpHER2Neu.validate();
                        self.dmpRadiotherapy.validate();
                        self.dmpChemotherapy.validate();
                        self.dmpEndocrineTherapy.validate();
                        self.dmpAntibodyTherapy.validate();
                        self.dmpOngoingOrCompletedTherapy_locoregionalRecurrence.validate();
                    }
                });
                self.dmpManifestationOfContralateralBreastCancer.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpSignatureDate.validate();
                        self.dmpAffectedBreast.validate();
                        self.dmpCurrentTreatmentStatus.validate();
                        self.dmpPerformedSurgicalTherapy.validate();
                        self.dmpPreoperativeNeoadjuvantTherapy.validate();
                        self.dmpPT.validate();
                        self.dmpPN.validate();
                        self.dmpM.validate();
                        self.dmpGrading.validate();
                        self.dmpResection.validate();
                        self.dmpImmunohistochemicalHormoneReceptor.validate();
                        self.dmpHER2Neu.validate();
                        self.dmpRadiotherapy.validate();
                        self.dmpChemotherapy.validate();
                        self.dmpEndocrineTherapy.validate();
                        self.dmpAntibodyTherapy.validate();
                        self.dmpOngoingOrCompletedTherapy_locoregionalRecurrence.validate();
                    }
                });
                self.dmpLocoregionalRecurrence.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpSignatureDate.validate();
                        self.dmpAffectedBreast.validate();
                        self.dmpCurrentTreatmentStatus.validate();
                        self.dmpPerformedSurgicalTherapy.validate();
                        self.dmpPreoperativeNeoadjuvantTherapy.validate();
                        self.dmpPT.validate();
                        self.dmpPN.validate();
                        self.dmpM.validate();
                        self.dmpGrading.validate();
                        self.dmpResection.validate();
                        self.dmpImmunohistochemicalHormoneReceptor.validate();
                        self.dmpHER2Neu.validate();
                        self.dmpRadiotherapy.validate();
                        self.dmpChemotherapy.validate();
                        self.dmpEndocrineTherapy.validate();
                        self.dmpAntibodyTherapy.validate();
                        self.dmpOngoingOrCompletedTherapy_locoregionalRecurrence.validate();
                    }
                });
                self.dmpFirstConfirmationOfRemoteMetastases.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpAffectedBreast.validate();
                        self.dmpCurrentTreatmentStatus.validate();
                        self.dmpPerformedSurgicalTherapy.validate();
                        self.dmpPreoperativeNeoadjuvantTherapy.validate();
                        self.dmpPT.validate();
                        self.dmpPN.validate();
                        self.dmpM.validate();
                        self.dmpGrading.validate();
                        self.dmpResection.validate();
                        self.dmpImmunohistochemicalHormoneReceptor.validate();
                        self.dmpHER2Neu.validate();
                        self.dmpRadiotherapy.validate();
                        self.dmpChemotherapy.validate();
                        self.dmpEndocrineTherapy.validate();
                        self.dmpAntibodyTherapy.validate();
                        self.dmpOngoingOrCompletedTherapy_locoregionalRecurrence.validate();
                        self.dmpLocalisation.validate();
                        self.dmpOngoingOrCompletedTherapy_remoteMetastases.validate();
                        self.dmpBisphosphonateTherapy.validate();
                        self.dmpOngoingOrCompletedTherapy_locoregionalRecurrence.validate();
                    }
                });
                self.dmpCurrentTreatmentStatus.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpPreoperativeNeoadjuvantTherapy.validate();
                        self.dmpRadiotherapy.validate();
                        self.dmpChemotherapy.validate();
                        self.dmpEndocrineTherapy.validate();
                        self.dmpAntibodyTherapy.validate();
                        self.dmpPerformedSurgicalTherapy.validate();
                        self.dmpPT.validate();
                        self.dmpPN.validate();
                        self.dmpM.validate();
                        self.dmpGrading.validate();
                        self.dmpResection.validate();
                        self.dmpImmunohistochemicalHormoneReceptor.validate();
                        self.dmpHER2Neu.validate();
                    }
                });
                self.dmpPerformedSurgicalTherapy.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        if (self.dmpType() === "PNP") {

                            if (self.dmpPerformedSurgicalTherapy().indexOf("NO_OPERATION") > -1) {
                                self.dmpPT(["NO_OPERATION"]);
                                self.dmpPN(["NO_OPERATION"]);
                                self.dmpResection(["NO_OPERATION"]);
                            }
                            if (self.dmpPerformedSurgicalTherapy().indexOf("NO_OPERATION") === -1) {
                                self.dmpPT.splice(self.dmpPT.indexOf("NO_OPERATION"), 1);
                                self.dmpPN.splice(self.dmpPN.indexOf("NO_OPERATION"), 1);
                                self.dmpResection.splice(self.dmpResection.indexOf("NO_OPERATION"), 1);
                            }

                            self.dmpPT.validate();
                            self.dmpPN.validate();
                            self.dmpResection.validate();
                        }
                    }
                });
                self.dmpLocalisation.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpBisphosphonateTherapy.validate();
                    }
                });
                self.dmpRegistrationFor.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpRadiotherapy.validate();
                        self.dmpChemotherapy.validate();
                        self.dmpEndocrineTherapy.validate();
                        self.dmpAntibodyTherapy.validate();
                        self.dmpCurrentTreatmentStatus_following.validate();
                        self.dmpTherapyOfLocoregionalRecurrence.validate();
                        self.dmpTherapyOfRemoteMetastases.validate();
                        self.dmpBisphosphonateTherapy_following.validate();
                    }
                });
                self.dmpSignatureDate.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpManifestationOfLocoregionalRecurrence_following_date.validate();
                        self.dmpManifestationOfContralateralBreastCancer_following_date.validate();
                        self.dmpManifestationOfRemoteMetastases_following_date.validate();
                    }
                });
                self.dmpManifestationOfLocoregionalRecurrence_following_date.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpManifestationOfLocoregionalRecurrence_following_text.validate();
                        self.dmpCurrentTreatmentStatus_following.validate();
                        self.dmpTherapyOfLocoregionalRecurrence.validate();
                    }
                });
                self.dmpManifestationOfLocoregionalRecurrence_following_text.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpManifestationOfLocoregionalRecurrence_following_date.validate();
                    }
                });
                self.dmpManifestationOfContralateralBreastCancer_following_date.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpManifestationOfContralateralBreastCancer_following_text.validate();
                    }
                });
                self.dmpManifestationOfContralateralBreastCancer_following_text.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpManifestationOfContralateralBreastCancer_following_date.validate();
                    }
                });
                self.dmpManifestationOfRemoteMetastases_following_date.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpManifestationOfRemoteMetastases_following_text.validate();
                        self.dmpCurrentTreatmentStatus_following.validate();
                        self.dmpTherapyOfRemoteMetastases.validate();
                        self.dmpBisphosphonateTherapy_following.validate();
                    }
                });
                self.dmpManifestationOfRemoteMetastases_following_text.subscribe(function() {
                    if( isRelevant( self.toJSON(), {versions: ["4.21"]} ) ) {
                        self.dmpManifestationOfRemoteMetastases_following_date.validate();
                        self.dmpBisphosphonateTherapy_following.validate();
                    }
                });
            // TO BE DELETED: 4.21 - END -------------------------------------------------------------------------------
            }

        }, {
            schemaName: 'v_dmpbk',
            NAME: 'DmpBkModel'
        } );
        KoViewModel.registerConstructor( DmpBkModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'DmpBaseModel',
            'v_dmpbk-schema',
            'activity-schema'
        ]
    }
);