/**
 * User: oliversieweke
 * Date: 07.03.18  11:48
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, _ */
YUI.add( "DmpBkEditorModel", function( Y ) {
        'use strict';
        /**
         * @module DmpBkEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            DmpEditorModel = KoViewModel.getConstructor( 'DmpEditorModel' ),
            i18n = Y.doccirrus.i18n,
            compareDatesAndReturnLaterDate = Y.doccirrus.edmpcommonutils.compareDatesAndReturnLaterDate;

        /**
         * @class DmpBkEditorModel
         * @constructor
         * @extends DmpEditorModel
         */
        function DmpBkEditorModel( config ) {
            DmpBkEditorModel.superclass.constructor.call( this, config );
        }

        DmpBkEditorModel.ATTRS = {
            whiteList: {
                value: DmpEditorModel.ATTRS.whiteList.value.concat( [
                    'dmpShowOptionalFields',
                    'dmpRegistrationFor',
                    'dmpInitialManifestationOfPrimaryTumor',
                    'dmpManifestationOfContralateralBreastCancer',
                    'dmpLocoregionalRecurrence',
                    'dmpFirstConfirmationOfRemoteMetastases',
                    'dmpAffectedBreast',
                    'dmpCurrentTreatmentStatus',
                    'dmpPerformedSurgicalTherapy',
                    'dmpPerformedSurgicalTherapy_4_23',
                    'dmpPreoperativeNeoadjuvantTherapy',
                    'dmpTnmClassification_4_23',
                    'dmpPT',
                    'dmpPT_4_23',
                    'dmpPN',
                    'dmpPN_4_23',
                    'dmpM',
                    'dmpM_4_23',
                    'dmpGrading',
                    'dmpResection',
                    'dmpImmunohistochemicalHormoneReceptor',
                    'dmpImmunohistochemicalHormoneReceptor_4_23',
                    'dmpCurrentAdjuvantEndocrineTherapy_4_23',
                    'dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23',
                    'dmpContinuationOfCurrentEndocrineTherapy_4_23',
                    'dmpDxaFindings_4_23',
                    'dmpLocalisation_4_23',
                    'dmpDenosumab_4_23',
                    'dmpHER2Neu',
                    'dmpRadiotherapy',
                    'dmpChemotherapy',                 
                    'dmpEndocrineTherapy',
                    'dmpAntibodyTherapy',
                    'dmpOngoingOrCompletedTherapy_locoregionalRecurrence',
                    'dmpLocalisation',
                    'dmpOngoingOrCompletedTherapy_remoteMetastases',
                    'dmpBisphosphonateTherapy',
                    'dmpRegularPhysicalTrainingRecommended_4_23',
                    'dmpConditionAfterParticularlyCardiotoxicTumorTherapy_4_23',
                    'dmpLymphedemaPresent',
                    'dmpSymptomaticLymphedema_4_23',
                    'dmpPlannedDateForNextDocumentation',
                    'dmpCurrentTreatmentStatus_following',
                    'dmpTherapyOfLocoregionalRecurrence',
                    'dmpTherapyOfRemoteMetastases',
                    'dmpBisphosphonateTherapy_following',
                    'dmpManifestationOfLocoregionalRecurrence_following_date',
                    'dmpManifestationOfLocoregionalRecurrence_following_text',
                    'dmpManifestationOfContralateralBreastCancer_following_date',
                    'dmpManifestationOfContralateralBreastCancer_following_text',
                    'dmpManifestationOfRemoteMetastases_following_date',
                    'dmpManifestationOfRemoteMetastases_following_text',
                    'dmpManifestationOfRemoteMetastases_following_text_4_23',
                    'dmpBiopticConfirmationOfVisceralMetastases_4_23',
                    'dmpLymphedema_following',
                    'dmpHeight',
                    'dmpWeight'
                ] )
            },
            lazyAdd: false
        };


        Y.extend( DmpBkEditorModel, DmpEditorModel, {
            initializer: function DmpBkEditorModel_initializer() {
                var
                    self = this;
                self.initDmpBkEditorModel();
            },
            destructor: function DmpBkEditorModel_destructor() {

            },
            /**
             * Initializes DMP BK editor model
             * @method initDmpBkEditorModel
             */
            initDmpBkEditorModel: function DmpBkEditorModel_initDmpBkEditorModel() {
                var
                    self = this;

                self.firstI18n = i18n( 'activity-schema.DmpType_E.FIRST.i18n' );
                self.followingI18n = i18n( 'activity-schema.DmpType_E.FOLLOWING.i18n' );
                self.dmpTypeI18n = i18n( 'activity-schema.DmpType_E.PNP.i18n' );
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

                self.mixinData = {};
                self.mixinData.registrationLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.registration.label' );
                self.mixinData.registrationForLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.registrationFor.label' );
                self.mixinData.anamnesisAndTreatmentStatusLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.anamnesisAndTreatmentStatus.label' );
                self.mixinData.currentFindingsLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.currentFindings.label' );
                self.mixinData.treatmentOfPrimaryAndContralateralLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.treatmentOfPrimaryAndContralateral.label' );
                self.mixinData.treatmentStatusOfPrimaryAndContralateralLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.treatmentStatusOfPrimaryAndContralateral.label' );
                self.mixinData.eventsSinceLastDocumentationLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.eventsSinceLastDocumentation.label' );
                self.mixinData.treatmentOfAdvancedDiseaseLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.treatmentOfAdvancedDisease.label' );
                self.mixinData.findingsAndTherapyOfLocoregionalRecurrenceLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.findingsAndTherapyOfLocoregionalRecurrence.label' );
                self.mixinData.findingsAndTherapyOfRemoteMetastasesLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.findingsAndTherapyOfRemoteMetastases.label' );
                self.mixinData.otherFindingsLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.otherFindings.label' );
                self.mixinData.otherLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.other.label' );

                /**
                 * [MOJ-10727] - Bugfix, in the framework of this ticket.
                 * Set the current treatment status, which was omitted before,
                 * since the DK treatment has a much larger spectrum of available treatments,
                 * which have to be broke down the three ENUM values of the dmpTreatmentStatus.
                 */
                self.addDisposable( ko.computed( function(){
                    var surgicalTherapy = self.dmpPerformedSurgicalTherapy(),
                        surgicalTherapy_4_23 = self.dmpPerformedSurgicalTherapy_4_23();

                    // continue only, if the form is not readonly
                    if( !self.dmpCurrentTreatmentStatus.readOnly() ) {
                        switch( true ) {
                            case surgicalTherapy_4_23.indexOf( 'OPERATION_PLANNED' ) !== -1:
                                self.dmpCurrentTreatmentStatus( 'OPERATION_PLANNED' );
                                break;
                            case surgicalTherapy.indexOf( 'NO_OPERATION' ) !== -1:
                            case surgicalTherapy_4_23.indexOf( 'OPERATION_NOT_PLANNED' ) !== -1:
                                self.dmpCurrentTreatmentStatus( 'OPERATION_NOT_PLANNED' );
                                break;
                            default:
                                self.dmpCurrentTreatmentStatus( 'POSTOPERATIVE' );
                        }
                    }
                } ) );

                /**
                 * [MOJ-10727]
                 * BK-specific implementation of the DMP followup interval:
                 * Only for BK, there is NO interval given by the doctor.
                 * However, there is a manual, giving a declaration on what this interval should be,
                 * depending on the preceding diagnoses.
                 *
                 * According to the "Ausfüllanleitung, ver. 3", the following rules apply:
                 *
                 * General case for all diagnoses EXCLUDING "RemoteMetastases":
                 * Within the first 5 years after the primary diagnosis,
                 * a follow-up is scheduled AT LEAST "EVERY_SECOND_QUARTER".
                 * If no incident occurs within the first 5 years,
                 * the interval increases to "EVERY_FOURTH_QUARTER", so once per year.
                 * However, each incident resets the 5 year interval,
                 * leading back to "EVERY_SECOND_QUARTER".
                 *
                 * Special case of diagnosed "RemoteMetastases"
                 * (also for the case where "RemoteMetastases" have not been diagnosed in the first examination):
                 * For the full period, or the remaining time of the 10 years in DMP,
                 * the interval is ALWAYS "EVERY_SECOND_QUARTER".
                 */
                self.addDisposable( ko.computed( function(){
                    var
                        registrationFor = self.dmpRegistrationFor(),
                        diagnosisChainInfo = self.diagnosisChainInfo(),

                        // get the dates of each diagnosis of the current documentation
                        primaryDate = self.dmpInitialManifestationOfPrimaryTumor(),
                        contralateralDate = self.dmpManifestationOfContralateralBreastCancer(),
                        contralateralFollowingDate = self.dmpManifestationOfLocoregionalRecurrence_following_date(),
                        locoregionalDate = self.dmpLocoregionalRecurrence(),
                        locoregionalFollowingDate = self.dmpManifestationOfLocoregionalRecurrence_following_date(),
                        remoteDate = self.dmpFirstConfirmationOfRemoteMetastases(),
                        remoteFollowingDate = self.dmpManifestationOfRemoteMetastases_following_date(),

                        latestDiagnosisDate = null,
                        dmpMaxInterval,
                        dmpDocumentationIntervalResetYears = 5;

                    // continue only, if the form is not readonly
                    if( !self.dmpDocumentationInterval.readOnly() ) {
                        // if there has been once the diagnosis of remote metastases, the interval will always be AT LEAST "EVERY_SECOND_QUARTER"
                        if( remoteDate || remoteFollowingDate || registrationFor === "REMOTE_METASTASES" || (diagnosisChainInfo && diagnosisChainInfo.remoteMetastasesFound) ) {
                            dmpMaxInterval = "EVERY_SECOND_QUARTER";
                        } else {
                            // since no remote metastases were found [thank god :-)], we check, which date is the latest in the diagnosis chain
                            if( diagnosisChainInfo && diagnosisChainInfo.latestDiagnosisDate ) {
                                latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, diagnosisChainInfo.latestDiagnosisDate );
                            }
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, primaryDate );
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, contralateralDate );
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, contralateralFollowingDate );
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, locoregionalDate );
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, locoregionalFollowingDate );
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, remoteDate );
                            latestDiagnosisDate = compareDatesAndReturnLaterDate( latestDiagnosisDate, remoteFollowingDate );

                            if( latestDiagnosisDate instanceof Date ) {
                                /**
                                 * if the latest diagnosis is within the last 5 years, we set the interval to "EVERY_SECOND_QUARTER",
                                 * else, we increase the interval to "EVERY_FOURTH_QUARTER"
                                 */
                                if( latestDiagnosisDate > new Date( new Date().setFullYear( new Date().getFullYear() - dmpDocumentationIntervalResetYears ) ) ) {
                                    // there is an occurrence within the last 5 years
                                    dmpMaxInterval = "EVERY_SECOND_QUARTER";
                                } else {
                                    // there is no occurrence within the last 5 years
                                    dmpMaxInterval = "EVERY_FOURTH_QUARTER";
                                }
                            }
                        }

                        // if the new max interval is lower than the selected value, we will change the underlying variable
                        if( typeof dmpMaxInterval === "string" ) {
                            self.dmpDocumentationInterval( dmpMaxInterval );
                        }
                    }
                } ) );

            // TO BE DELETED: 4.21 - START -----------------------------------------------------------------------------
                self.dmpRegistrationForLocoregional = ko.computed( function(){
                    var
                        primary = self.dmpInitialManifestationOfPrimaryTumor(),
                        contralateral = self.dmpManifestationOfContralateralBreastCancer(),
                        locoregional = self.dmpLocoregionalRecurrence(),
                        remote = self.dmpFirstConfirmationOfRemoteMetastases();

                    return  locoregional && !remote &&
                            !( primary && new Date(primary).setHours(0, 0, 0, 0) >= new Date(locoregional).setHours(0, 0, 0, 0) ) &&
                            !( contralateral && new Date(contralateral).setHours(0, 0, 0, 0) > new Date(locoregional).setHours(0, 0, 0, 0) );
                });
                self.dmpRegistrationForPrimaryOrContralateral = ko.computed( function(){
                    var
                        primary = self.dmpInitialManifestationOfPrimaryTumor(),
                        contralateral = self.dmpManifestationOfContralateralBreastCancer(),
                        locoregional = self.dmpLocoregionalRecurrence(),
                        remote = self.dmpFirstConfirmationOfRemoteMetastases(),
                        primaryDate = primary ? new Date(primary).setHours(0, 0, 0, 0) : null,
                        contralateralDate = contralateral ? new Date(contralateral).setHours(0, 0, 0, 0) : null,
                        locoregionalDate = locoregional ? new Date(locoregional).setHours(0, 0, 0, 0) : null;

                    return  (primary || contralateral) &&
                                    ( (!remote && !locoregional) ||
                                      (!remote && (primaryDate >= locoregionalDate || contralateralDate > locoregionalDate)) );
                });
                self.dmpLocoregional_FLW = ko.computed( function(){
                    var
                        registration = this.dmpRegistrationFor(),
                        locoregionalDate = this.dmpManifestationOfLocoregionalRecurrence_following_date();

                    return  registration === "LOCOREGIONAL_RECURRENCE" || locoregionalDate;
                }.bind(this));
                self.dmpRemote_FLW = ko.computed( function(){
                    var
                        registration = this.dmpRegistrationFor(),
                        remoteDate = this.dmpManifestationOfRemoteMetastases_following_date();

                    return registration === "REMOTE_METASTASES" || remoteDate;
                }.bind(this));
                self.dmpRemoteInBone_FLW = ko.computed( function(){
                    var
                        remoteText = this.dmpManifestationOfRemoteMetastases_following_text();

                    return remoteText.indexOf("BONE") > -1;
                }.bind(this));
                self.isFollowing = ko.computed( function() {
                    return self.dmpType() === "FOLLOWING";
                });
                self.isAfterQ32018 = ko.computed( function() {
                    const afterDate = moment( 'Q3/2018', 'Q/YYYY' );
                    const contextDate = moment( self.dmpQuarter() + '/' + self.dmpYear(), 'Q/YYYY' );
                    // return true;
                    return contextDate.isAfter( afterDate );
                } );
            // TO BE DELETED: 4.21 - END -------------------------------------------------------------------------------


                // This function parses the date input for registration dates. In case of a normal date selection with
                // the mouse, nothing unusual happens. If the date input has been entered manually and has the incomplete
                // format YYYY, 00.00.YYYY or 00.MM.YYYY, it is converted to 01.01.YYYY, 01.01.YYYY and 01.MM.YYYY respectively.
                self.parseInputDateBK = function parseInputDateBK(input) {
                    var
                        incompleteDatePattern = /^0{2}\.(0[0-9]|1[0-2])\.\d{4}$|^\d{4}$/,
                        resultDate, incompleteDate, parsedDate;

                    if (typeof input === "string" && input.match(incompleteDatePattern)) {
                        incompleteDate = input.match( incompleteDatePattern )[0];
                        parsedDate = incompleteDate.replace( /^\d{4}$/, "01.01." + incompleteDate )
                            .replace( /0{2}\./g, "01." );

                        resultDate = moment(parsedDate, "DD.MM.YYYY");
                    } else {
                        resultDate = moment(input, "DD.MM.YYYY");
                    }

                    return resultDate;
                };

                self.createFieldVisibilityComputed();
                self.createSectionsVisibilityComputed();
            },
            createFieldVisibilityComputed: function createFieldVisibilityComputed() {
                // For each field in the visibility map, a ko.computed will be created.
                // The value of the ko.computed depends on the return value of the visibility function.
                // All "visibility-dependencies" of the field are unwrapped to trigger a reevaluation if any relevant value changed.
                var self = this;
                var VISIBILITY_MAP = Y.doccirrus.edmpbkutils.BK_FIELD_VISIBILITY_MAP;

                Object.keys( VISIBILITY_MAP ).forEach( function( field ) {
                    self[field + "Visible"] = ko.computed( function() {
                        var dependencies = VISIBILITY_MAP[field].dependencies || [];
                        var visible = VISIBILITY_MAP[field].visible && VISIBILITY_MAP[field].visible( self.get( "currentActivity" )().toJSON() );
                        var optional = VISIBILITY_MAP[field].optional && VISIBILITY_MAP[field].optional( self.get( "currentActivity" )().toJSON() );

                        dependencies.forEach( function( dependency ) {
                            ko.unwrap( self[dependency] );
                        } );
                        if( VISIBILITY_MAP[field].optional ) {
                            ko.unwrap( self.dmpShowOptionalFields ); // If the field is optional, checking the dmpShowOptionalFields box should trigger a reevaluation.
                        }

                        return visible || (optional && self.dmpShowOptionalFields());
                    } );
                } );
            },
            createSectionsVisibilityComputed: function createSectionsVisibilityComputed() {
                var self = this;
                var isRelevant = Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant;
                var SECTION_STRUCTURE = Y.doccirrus.edmpbkutils.BK_SECTION_STRUCTURE;
                var VISIBILITY_MAP = Y.doccirrus.edmpbkutils.BK_FIELD_VISIBILITY_MAP;

                Object.keys( SECTION_STRUCTURE ).forEach( function( section ) {
                    var subFields = SECTION_STRUCTURE[section].subFields || [];
                    var dmpTypes = SECTION_STRUCTURE[section].dmpTypes;
                    var versions = SECTION_STRUCTURE[section].versions;

                    var dependencies = [];
                    subFields.forEach(function( subField ) {
                        var subFieldDependencies = VISIBILITY_MAP[subField] && VISIBILITY_MAP[subField].dependencies || [];
                        dependencies.concat( subFieldDependencies );
                    } );

                    self[section + "Visible"] = ko.computed( function() {
                        dependencies.forEach( function( dependency ) {
                            ko.unwrap( self[dependency] );
                        } );
                        ko.unwrap( self.dmpShowOptionalFields );
                        if (dmpTypes) {
                            ko.unwrap( self.dmpType );
                        }
                        if (versions) {
                            ko.unwrap( self.dmpQuarter);
                            ko.unwrap( self.dmpYear);
                        }

                        var someSubFieldVisible = _.some( subFields, function(subField) {
                           return typeof self[subField + "Visible"] === "function" && self[subField + "Visible"](); // The check can be removed once we move away from 4.21
                        });
                        return someSubFieldVisible && isRelevant( self.get( 'currentActivity' )().toJSON(), {versions: versions, dmpTypes: dmpTypes} );
                    } );
                } );
            }

        }, {
            NAME: 'DmpBkEditorModel'
        } );

    KoViewModel.registerConstructor( DmpBkEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'DmpEditorModel',
            'edmp-commonutils',
            'edmp-bk-utils'
        ]
    }
);