/**
 * User: do
 * Date: 18/05/16  13:56
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/


YUI.add( 'edmp-filebuilder', function( Y, NAME ) {

        /**
         * @module edmp-filebuilder
         *
         *  ATTENTION:
         * Must support at least the last three quarters -> use context.quarter and context.year to differentiate
         * between xml schema version.
         *
         */

        const
            moment = require( 'moment' ),
            VALUE_RESULT_TYPE = 'value',
            getArchivePathByActType = Y.doccirrus.edocutils.getArchivePathByActType,
            edocConverter = Y.doccirrus.edocConverter,
            convert = edocConverter.convert,

            dateFormat = edocConverter.utils.dateFormat,
            formatDate = edocConverter.utils.formatDate,
            isAfterQ = edocConverter.utils.isAfterQ,
            s = edocConverter.utils.s,
            buildAddress = edocConverter.utils.buildAddress,
            buildCommunications = edocConverter.utils.buildCommunications,
            buildInsurance = edocConverter.utils.buildInsurance,
            buildObservation = edocConverter.utils.buildObservation,
            buildDate = edocConverter.utils.buildDate,
            buildDateObservation = edocConverter.utils.buildDateObservation,
            translateEnum = edocConverter.utils.translateEnum,
            mapGender = edocConverter.utils.mapGender,

            startHeader = edocConverter.mapper.startHeader,
            software = edocConverter.mapper.software,
            endHeader = edocConverter.mapper.endHeader,
            startBody = edocConverter.mapper.startBody,
            openParagraph = edocConverter.mapper.openParagraph,
            closeParagraph = edocConverter.mapper.closeParagraph,

            COPD_4_0_0_LAST_QUARTER = Y.doccirrus.edmpcommonutils.COPD_4_0_0_LAST_QUARTER,
            PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER = Y.doccirrus.edmpcommonutils.PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER,
            Q1_2019 = Y.doccirrus.edmpcommonutils.Q1_2019,

            edmpDocProcessConfig = [
                {
                    '$switch:activity.actType': {
                        DM1: [
                            startHeader,
                            {
                                'Header': [
                                    docInfo,
                                    provider,
                                    patient,
                                    software
                                ]
                            },
                            endHeader,
                            startBody, {
                                'Administrative Daten': [
                                    openParagraph( 'Administrative Daten' ),
                                    subscriptions,
                                    participationChronicHeartFailure,
                                    closeParagraph
                                ]
                            }, {
                                'Anamnese- und Befunddaten': [
                                    openParagraph( 'Anamnese- und Befunddaten' ),
                                    height,
                                    weight,
                                    bloodPressureSystolic,
                                    bloodPressureDiastolic,
                                    smoker,
                                    concomitantDiseases,
                                    hbA1c,
                                    pathoUrinAlbAus,
                                    eGFR,
                                    pulsStatus,
                                    sensitivityTesting,
                                    footStatus,
                                    furtherRiskUlcus,
                                    ulkus,
                                    woundInfection,
                                    injectionSites,
                                    intervalFutureFootInspections,
                                    sequelae,
                                    closeParagraph
                                ]
                            }, {
                                'Relevante Ereignisse': [
                                    openParagraph( 'Relevante Ereignisse' ),
                                    dmEvents,
                                    {
                                        '$if:edmp.isFollowing': [
                                            hadHypoglycaemic,
                                            hadHospitalStayHbA1c,
                                            hadStationaryTreatment
                                        ]
                                    },
                                    closeParagraph
                                ]
                            }, {
                                'Medikamente': [
                                    openParagraph( 'Medikamente' ),
                                    antiplatelet,
                                    betaBlocker,
                                    ace,
                                    hmg,
                                    thia,
                                    closeParagraph
                                ]
                            }, {
                                'Schulung': [
                                    openParagraph( 'Schulung' ),
                                    recommendedDmTrainings,
                                    {
                                        '$if:edmp.isFirst': [
                                            dmTrainingsBeforeSubscription
                                        ]
                                    },
                                    {
                                        '$if:edmp.isFollowing': [
                                            attendedTrainingObservationsStart,
                                            attendedDiabetesTraining,
                                            attendedHypertensionTraining,
                                            attendedTrainingObservationsEnd
                                        ]
                                    },
                                    closeParagraph
                                ]
                            }, {
                                'Behandlungsplanung': [
                                    openParagraph( 'Behandlungsplanung' ),
                                    patientWantsInfos,
                                    documentationInterval,
                                    hbA1cTargetValue,
                                    treatmentAtDiabeticFootInstitution,
                                    diabetesRelatedHospitalization,
                                    {'$if:edmp.isFollowing': opthRetinalExam},
                                    closeParagraph
                                ]
                            }
                        ],
                        DM2: [
                            startHeader,
                            {
                                'Header': [
                                    docInfo,
                                    provider,
                                    patient,
                                    software
                                ]
                            },
                            endHeader,
                            startBody, {
                                'Administrative Daten': [
                                    openParagraph( 'Administrative Daten' ),
                                    subscriptions,
                                    participationChronicHeartFailure,
                                    closeParagraph
                                ]
                            }, {
                                'Anamnese- und Befunddaten': [
                                    openParagraph( 'Anamnese- und Befunddaten' ),
                                    height,
                                    weight,
                                    bloodPressureSystolic,
                                    bloodPressureDiastolic,
                                    smoker,
                                    concomitantDiseases,
                                    hbA1c,
                                    pathoUrinAlbAus,
                                    eGFR,
                                    pulsStatus,
                                    sensitivityTesting,
                                    footStatus,
                                    furtherRiskUlcus,
                                    ulkus,
                                    woundInfection,
                                    injectionSites,
                                    intervalFutureFootInspections,
                                    sequelae,
                                    closeParagraph
                                ]
                            }, {
                                'Relevante Ereignisse': [
                                    openParagraph( 'Relevante Ereignisse' ),
                                    dmEvents,
                                    {
                                        '$if:edmp.isFollowing': [
                                            hadHypoglycaemic,
                                            hadStationaryTreatment
                                        ]
                                    },
                                    closeParagraph
                                ]
                            }, {
                                'Medikamente': [
                                    openParagraph( 'Medikamente' ),
                                    antiplatelet,
                                    betaBlocker,
                                    ace,
                                    hmg,
                                    thia,
                                    insulin,
                                    glibenclamide,
                                    metformin,
                                    otherOralAntiDiabetic,
                                    closeParagraph
                                ]
                            }, {
                                'Schulung': [
                                    openParagraph( 'Schulung' ),
                                    recommendedDmTrainings,
                                    {
                                        '$if:edmp.isFirst': [
                                            dmTrainingsBeforeSubscription
                                        ]
                                    },
                                    {
                                        '$if:edmp.isFollowing': [
                                            attendedTrainingObservationsStart,
                                            attendedDiabetesTraining,
                                            attendedHypertensionTraining,
                                            attendedTrainingObservationsEnd
                                        ]
                                    },
                                    closeParagraph
                                ]
                            }, {
                                'Behandlungsplanung': [
                                    openParagraph( 'Behandlungsplanung' ),
                                    patientWantsInfos,
                                    documentationInterval,
                                    hbA1cTargetValue,
                                    treatmentAtDiabeticFootInstitution,
                                    diabetesRelatedHospitalization,
                                    {'$if:edmp.isFollowing': opthRetinalExam},
                                    closeParagraph
                                ]
                            }
                        ],
                        BK: [
                            startHeader,
                            {
                                'Header': [
                                    docInfo,
                                    provider,
                                    patient,
                                    software
                                ]
                            },
                            endHeader, setup,
                            startBody, {
                                '$if:edmp.bk.version_4_23': [
                                    {
                                        '$if:edmp.bk.requiredSections.registration': {
                                            'Einschreibung': [
                                                openParagraph( 'Einschreibung' ),
                                                {'$if:edmp.bk.requiredFields.dmpInitialManifestationOfPrimaryTumor': initialManifestationOfPrimaryTumor_4_23 },
                                                {'$if:edmp.bk.requiredFields.dmpManifestationOfContralateralBreastCancer': manifestationOfContralateralBreastCancer_4_23 },
                                                {'$if:edmp.bk.requiredFields.dmpLocoregionalRecurrence': locoregionalRecurrence_4_23 },
                                                {'$if:edmp.bk.requiredFields.dmpFirstConfirmationOfRemoteMetastases': firstConfirmationOfRemoteMetastases_4_23 },
                                                closeParagraph
                                            ]
                                        }
                                    }, {
                                        '$if:edmp.bk.requiredSections.registrationFor': {
                                            'Einschreibung erfolgte wegen': [
                                                openParagraph( 'Einschreibung erfolgte wegen' ),
                                                {'$if:edmp.bk.requiredFields.dmpRegistrationFor': registrationFor_4_23 },
                                                closeParagraph
                                            ]
                                        }
                                    }, {
                                        '$if:edmp.bk.requiredSections.anamnesisAndTreatmentStatus': [
                                            {
                                                'Anamnese und Behandlungsstatus des Primärtumors/kontralateralen Brustkrebses': [
                                                    openParagraph( 'Anamnese und Behandlungsstatus des Primärtumors/kontralateralen Brustkrebses' ),
                                                    {'$if:edmp.bk.requiredFields.dmpPerformedSurgicalTherapy_4_23': performedSurgicalTherapy_4_23 },
                                                    closeParagraph
                                                ]
                                            }
                                        ]
                                    }, {
                                        '$if:edmp.bk.requiredSections.currentFindings': {
                                            'Aktueller Befundstatus des Primärtumors/kontralateralen Brustkrebses': [
                                                openParagraph( 'Aktueller Befundstatus des Primärtumors/kontralateralen Brustkrebses' ),
                                                {'$if:edmp.bk.requiredFields.dmpTnmClassification_4_23': tnmClassification_4_23 },
                                                {'$if:edmp.bk.requiredFields.dmpPT_4_23': t_4_23 },
                                                {'$if:edmp.bk.requiredFields.dmpPN_4_23': n_4_23 },
                                                {'$if:edmp.bk.requiredFields.dmpM_4_23': m_4_23 },
                                                {'$if:edmp.bk.requiredFields.dmpImmunohistochemicalHormoneReceptor_4_23': immunohistochemicalHormoneReceptor_4_23 },
                                                closeParagraph
                                            ]
                                        }
                                    }, {
                                        '$if:edmp.bk.requiredSections.treatmentOfPrimaryAndContralateral': {
                                            'Behandlung des Primärtumors/kontralateralen Brustkrebses': [
                                                openParagraph( 'Behandlung des Primärtumors/kontralateralen Brustkrebses' ),
                                                {'$if:edmp.bk.requiredFields.dmpCurrentAdjuvantEndocrineTherapy_4_23': currentAdjuvantEndocrineTherapy_4_23 },
                                                {'$if:edmp.bk.requiredFields.dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23': sideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23 },
                                                {'$if:edmp.bk.requiredFields.dmpContinuationOfCurrentEndocrineTherapy_4_23': continuationOfCurrentEndocrineTherapy_4_23 },
                                                {'$if:edmp.bk.requiredFields.dmpDxaFindings_4_23': dxaFindings_4_23 },
                                                closeParagraph
                                            ]
                                        }
                                    }, {
                                        '$if:edmp.bk.requiredSections.findingsAndTherapyOfRemoteMetastases': {
                                            'Befunde und Therapie von Fernmetastasen': [
                                                openParagraph( 'Befunde und Therapie von Fernmetastasen' ),
                                                {'$if:edmp.bk.requiredFields.dmpLocalisation_4_23': localisation_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpBisphosphonateTherapy': bisphosophonateTherapy_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpDenosumab_4_23': denosumab_4_23},
                                                closeParagraph
                                            ]
                                        }
                                    }, {
                                        '$if:edmp.bk.requiredSections.treatmentStatusOfPrimaryAndContralateral': {
                                            'Behandlungsstatus nach operativer Therapie des Primärtumors/kontralateralen Brustkrebses (adjuvante Therapie)': [
                                                openParagraph( 'Behandlungsstatus nach operativer Therapie des Primärtumors/kontralateralen Brustkrebses (adjuvante Therapie)' ),
                                                {'$if:edmp.bk.requiredFields.dmpCurrentAdjuvantEndocrineTherapy_4_23': currentAdjuvantEndocrineTherapy_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23': sideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpContinuationOfCurrentEndocrineTherapy_4_23': continuationOfCurrentEndocrineTherapy_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpDxaFindings_4_23': dxaFindings_4_23},
                                                closeParagraph
                                            ]
                                        }
                                    }, {
                                        '$if:edmp.bk.requiredSections.eventsSinceLastDocumentation': {
                                            'Seit der letzten Dokumentation aufgetretene Ereignisse': [
                                                openParagraph( 'Seit der letzten Dokumentation aufgetretene Ereignisse' ),
                                                {'$if:edmp.bk.requiredFields.dmpManifestationOfLocoregionalRecurrence_following': manifestationOfLocoregionalRecurrence_following_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpManifestationOfContralateralBreastCancer_following': manifestationOfContralateralBreastCancer_following_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpManifestationOfRemoteMetastases_following_4_23': manifestationOfRemoteMetastases_following_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpBiopticConfirmationOfVisceralMetastases_4_23': biopticConfirmationOfVisceralMetastases_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpSymptomaticLymphedema_4_23': symptomaticLymphedema_4_23},
                                                closeParagraph
                                            ]
                                        }
                                    }, {
                                        '$if:edmp.bk.requiredSections.otherFindings': {
                                            'Sonstige Befunde': [
                                                openParagraph( 'Sonstige Befunde' ),
                                                {'$if:edmp.bk.isFirstOrPnp':
                                                    {'$if:edmp.bk.requiredFields.dmpSymptomaticLymphedema_4_23': symptomaticLymphedema_4_23}
                                                },
                                                {'$if:edmp.bk.requiredFields.dmpRegularPhysicalTrainingRecommended_4_23': regularPhysicalTrainingRecommended_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpConditionAfterParticularlyCardiotoxicTumorTherapy_4_23': conditionAfterParticularlyCardiotoxicTumorTherapy_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpHeight': height_BK_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpWeight': weight_BK_4_23},
                                                closeParagraph
                                            ]
                                        }
                                    }, {
                                        '$if:edmp.bk.requiredSections.treatmentOfAdvancedDisease': {
                                            'Behandlung bei fortgeschrittener Erkrankung (lokoregionäres Rezidiv/Fernmetastasen)': [
                                                openParagraph( 'Behandlung bei fortgeschrittener Erkrankung (lokoregionäres Rezidiv/Fernmetastasen)' ),
                                                {'$if:edmp.bk.requiredFields.dmpBisphosphonateTherapy': bisphosophonateTherapy_4_23},
                                                {'$if:edmp.bk.requiredFields.dmpDenosumab_4_23': denosumab_4_23},
                                                closeParagraph
                                            ]
                                        }
                                    }
                                ]
                            }, {
                                '$if:edmp.bk.version_4_21': [
                                    {
                                        '$if:edmp.isFirst': {
                                            'Einschreibung': [
                                                openParagraph( 'Einschreibung' ),
                                                initialManifestationOfPrimaryTumor,
                                                manifestationOfContralateralBreastCancer,
                                                locoregionalRecurrence,
                                                firstConfirmationOfRemoteMetastases,
                                                closeParagraph
                                            ]
                                        }
                                    }, {
                                        '$if:edmp.bk.isFirstOrPnp': [
                                            {
                                                '$if:edmp.bk.anamnesisAndTreatmentStatusRequired': {
                                                    'Anamnese und Behandlungsstatus des Primärtumors/kontralateralen Brustkrebses': [
                                                        openParagraph( 'Anamnese und Behandlungsstatus des Primärtumors/kontralateralen Brustkrebses' ),
                                                        affectedBreast,
                                                        currentTreatmentStatus,
                                                        {
                                                            '$if:edmp.bk.performedSurgicalTherapyRequired': performedSurgicalTherapy
                                                        },
                                                        closeParagraph
                                                    ]
                                                }
                                            }, {
                                                '$if:edmp.bk.currentFindingsRequired': {
                                                    'Aktueller Befundstatus des Primärtumors/kontralateralen Brustkrebses': [
                                                        openParagraph( 'Aktueller Befundstatus des Primärtumors/kontralateralen Brustkrebses' ),
                                                        preoperativeNeoadjuvantTherapy,
                                                        {
                                                            '$if:edmp.bk.currentFindingssRequired': [
                                                                pT,
                                                                pN,
                                                                m,
                                                                grading,
                                                                resection,
                                                                immunohistochemicalHormoneReceptor,
                                                                HER2Neu
                                                            ]
                                                        },
                                                        closeParagraph
                                                    ]
                                                }
                                            }, {
                                                '$if:edmp.bk.treatmentOfPrimaryTumorRequired': {
                                                    'Behandlung des Primärtumors/kontralateralen Brustkrebses': [
                                                        openParagraph( 'Behandlung des Primärtumors/kontralateralen Brustkrebses' ),
                                                        radiotherapy,
                                                        chemotherapy,
                                                        endocrineTherapy,
                                                        antibodyTherapy,
                                                        closeParagraph
                                                    ]
                                                }
                                            }, {
                                                '$if:edmp.bk.findingsAndTherapyOfLocoregionalRequired': {
                                                    'Befunde und Therapie eines lokoregionären Rezidivs': [
                                                        openParagraph( 'Befunde und Therapie eines lokoregionären Rezidivs' ),
                                                        ongoingOrCompletedTherapy_locoregionalRecurrence,
                                                        closeParagraph
                                                    ]
                                                }
                                            }, {
                                                '$if:edmp.bk.findingsAndTherapyOfRemoteRequired': {
                                                    'Befunde und Therapie von Fernmetastasen': [
                                                        openParagraph( 'Befunde und Therapie von Fernmetastasen' ),
                                                        localisation,
                                                        ongoingOrCompletedTherapy_remoteMetastases,
                                                        {
                                                            '$if:edmp.bk.bisphosophonateTherapyRequired': bisphosophonateTherapy
                                                        },
                                                        closeParagraph
                                                    ]
                                                }
                                            }, {
                                                '$if:edmp.bk.otherFindingsRequired': {
                                                    'Sonstige Befunde': [
                                                        openParagraph( 'Sonstige Befunde' ),
                                                        lymphedemaPresent,
                                                        plannedDateForNextDocumentation,
                                                        closeParagraph
                                                    ]
                                                }
                                            }
                                        ]
                                    }, {
                                        '$if:edmp.isFollowing': [
                                            {
                                                "Einschreibung erfolgte wegen": [
                                                    openParagraph( 'Einschreibung erfolgte wegen' ),
                                                    registrationFor,
                                                    closeParagraph
                                                ]
                                            }, {
                                                '$if:edmp.bk.treatmentOfPrimaryTumorRequired_FLW': {
                                                    "Behandlungsstatus nach operativer Therapie des Primärtumors/kontralateralen Brustkrebses (adjuvante Therapie)": [
                                                        openParagraph( 'Behandlungsstatus nach operativer Therapie des Primärtumors/kontralateralen Brustkrebses (adjuvante Therapie)' ),
                                                        radiotherapy,
                                                        chemotherapy,
                                                        endocrineTherapy,
                                                        antibodyTherapy,
                                                        closeParagraph
                                                    ]
                                                }
                                            }, {
                                                "Seit der letzten Dokumentation neu aufgetretene Ereignisse": [
                                                    openParagraph( 'Seit der letzten Dokumentation neu aufgetretene Ereignisse' ),
                                                    manifestationOfLocoregionalRecurrence_following,
                                                    manifestationOfContralateralBreastCancer_following,
                                                    manifestationOfRemoteMetastases_following,
                                                    lymphedema_following,
                                                    closeParagraph
                                                ]
                                            }, {
                                                '$if:edmp.bk.registrationForLocoregionalOrRemoteRequired_FLW': {
                                                    "Behandlung bei fortgeschrittener Erkrankung (lokoregionäres Rezidiv/Fernmetastasen)": [
                                                        openParagraph( 'Behandlung bei fortgeschrittener Erkrankung (lokoregionäres Rezidiv/Fernmetastasen)' ),
                                                        currentTreatmentStatus_following,
                                                        {
                                                            '$if:edmp.bk.registrationForLocoregional_FLW': therapyOfLocoregionalRecurrence
                                                        },
                                                        {
                                                            '$if:edmp.bk.registrationForRemote_FLW': therapyOfRemoteMetastases
                                                        },
                                                        {
                                                            '$if:edmp.bk.remoteInBone_FLW': bisphosophonateTherapy_following
                                                        },
                                                        closeParagraph
                                                    ]
                                                }
                                            }, {
                                                '$if:edmp.bk.otherRequired': {
                                                    "Sonstiges": [
                                                        openParagraph( 'Sonstiges' ),
                                                        plannedDateForNextDocumentation,
                                                        closeParagraph
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        ],
                        KHK: [
                            startHeader,
                            {
                                'Header': [
                                    docInfo,
                                    provider,
                                    patient,
                                    software
                                ]
                            },
                            endHeader,
                            startBody, {
                                'Administrative Daten': [
                                    openParagraph( 'Administrative Daten' ),
                                    subscriptions,
                                    participationChronicHeartFailure,
                                    closeParagraph
                                ]
                            }, {
                                'Anamnese- und Befunddaten': [
                                    openParagraph( 'Anamnese- und Befunddaten' ),
                                    height,
                                    weight,
                                    bloodPressureSystolic,
                                    bloodPressureDiastolic,
                                    smoker,
                                    concomitantDiseases,
                                    angina,
                                    serumElectrolytes,
                                    ldlCholesterol,
                                    closeParagraph
                                ]
                            }, {
                                'Relevante Ereignisse': [
                                    openParagraph( 'Relevante Ereignisse' ),
                                    khkRelevantEvents,
                                    diagnosticCoronaryTherapeuticIntervention,
                                    {
                                        '$if:edmp.isFollowing': hadStationaryKhkTreatment
                                    },
                                    closeParagraph
                                ]
                            }, {
                                'Medikamente': [
                                    openParagraph( 'Medikamente' ),
                                    antiplatelet,
                                    betaBlocker,
                                    ace,
                                    hmg,
                                    khkOtherMedication,
                                    closeParagraph
                                ]
                            }, {
                                'Schulung': [
                                    openParagraph( 'Schulung' ),
                                    recommendedKhkTrainings,
                                    {
                                        '$if:edmp.isFollowing': [
                                            attendedTrainingObservationsStart,
                                            attendedDiabetesTraining,
                                            attendedHypertensionTraining,
                                            attendedTrainingObservationsEnd
                                        ]
                                    },
                                    closeParagraph
                                ]
                            }, {
                                'Behandlungsplanung': [
                                    openParagraph( 'Behandlungsplanung' ),
                                    patientWantsInfos,
                                    documentationInterval,
                                    khkRelatedTransferArranged,
                                    khkRelatedConfinementArranged,
                                    regularWeightControlRecommended,
                                    closeParagraph
                                ]
                            }
                        ],
                        ASTHMA: [
                            startHeader,
                            {
                                'Header': [
                                    docInfo,
                                    provider,
                                    patient,
                                    software
                                ]
                            },
                            endHeader,
                            startBody, {
                                'Administrative Daten': [
                                    openParagraph( 'Administrative Daten' ),
                                    subscriptions,
                                    participationChronicHeartFailure,
                                    closeParagraph
                                ]
                            }, {
                                'Anamnese- und Befunddaten': [
                                    openParagraph( 'Anamnese- und Befunddaten' ),
                                    height,
                                    weight,
                                    bloodPressureSystolic,
                                    bloodPressureDiastolic,
                                    smoker,
                                    concomitantDiseases,
                                    frequencyOfAsthmaSymptoms,
                                    dmpFrequencyOfAsthmaSymptoms_4_44,
                                    dmpFrequencyOfUseOfNeedMedication_4_44,
                                    dmpLimitationOfEverydayActivitiesDueToBronchialAsthma_4_44,
                                    dmpAsthmaRelatedNightSleepDisorder_4_44,
                                    currentPeakFlowValue,
                                    dmpCurrentFEV1Value_4_44,
                                    closeParagraph
                                ]
                            }, {
                                'Relevante Ereignisse': {
                                    '$if:edmp.isFollowing': [
                                        openParagraph( 'Relevante Ereignisse' ),
                                        hadStationaryAsthmaTreatment,
                                        hadUnplannedAsthmaTreatment_4_44,
                                        closeParagraph
                                    ]
                                }
                            }, {
                                'Medikamente': [
                                    openParagraph( 'Medikamente' ),
                                    inhaledGlucocorticosteroids,
                                    inhaledLongActingBeta2AdrenergicAgonist,
                                    inhaledRapidActingBeta2AdrenergicAgonist,
                                    systemicGlucocorticosteroids,
                                    otherAsthmaSpecificMedication,
                                    checkedInhalationTechnique,
                                    closeParagraph
                                ]
                            }, {
                                'Schulung': [
                                    openParagraph( 'Schulung' ),
                                    recommendedAsthmaTrainings,
                                    {
                                        '$if:edmp.isFirst': dmpAsthmaTrainingAlreadyDoneBeforeDMP_4_44
                                    },
                                    {
                                        '$if:edmp.isFollowing': perceivedAsthmaTraining
                                    },
                                    closeParagraph
                                ]
                            }, {
                                'Behandlungsplanung': [
                                    openParagraph( 'Behandlungsplanung' ),
                                    patientWantsInfos,
                                    documentationInterval,
                                    writtenSelfManagementPlan,
                                    asthmaRelatedTransferOrConfinementArranged,
                                    dmpTherapyAdjustment_4_44,
                                    closeParagraph
                                ]
                            }
                        ],
                        COPD: [
                            startHeader,
                            {
                                'Header': [
                                    docInfo,
                                    provider,
                                    patient,
                                    software
                                ]
                            },
                            endHeader,
                            startBody, {
                                'Administrative Daten': [
                                    openParagraph( 'Administrative Daten' ),
                                    subscriptions,
                                    participationChronicHeartFailure,
                                    closeParagraph
                                ]
                            }, {
                                'Anamnese- und Befunddaten': [
                                    openParagraph( 'Anamnese- und Befunddaten' ),
                                    height,
                                    weight,
                                    bloodPressureSystolic,
                                    bloodPressureDiastolic,
                                    smoker,
                                    concomitantDiseases,
                                    currentFev1,
                                    dmpClinicalAssessmentOfOsteoporosisRisk,
                                    closeParagraph
                                ]
                            }, {
                                'Relevante Ereignisse': {
                                    '$if:edmp.isFollowing': [
                                        openParagraph( 'Relevante Ereignisse' ),
                                        frequencyExacerbationsSinceLast,
                                        hadStationaryCopdTreatment,
                                        closeParagraph
                                    ]
                                }
                            }, {
                                'Medikamente': [
                                    openParagraph( 'Medikamente' ),
                                    shortActingBeta2AdrenergicAgonistAnticholinergics,
                                    longActingBeta2AdrenergicAgonist,
                                    longActingAnticholinergics,
                                    checkedInhalationTechnique,
                                    otherDiseaseSpecificMedication,
                                    closeParagraph
                                ]
                            }, {
                                'Schulung': [
                                    openParagraph( 'Schulung' ),
                                    recommendedCopdTrainings,
                                    {
                                        '$if:edmp.isFirst': dmpAttendedTrainingBeforeSubscription
                                    },
                                    {
                                        '$if:edmp.isFollowing': perceivedCopdTraining
                                    },
                                    closeParagraph
                                ]
                            }, {
                                'Behandlungsplanung': [
                                    openParagraph( 'Behandlungsplanung' ),
                                    patientWantsInfos,
                                    documentationInterval,
                                    copdRelatedTransferOrConfinementArranged,
                                    dmpRecommendedTobaccoAbstinence,
                                    dmpRecommendedTobaccoRehabProgram,
                                    {
                                        '$if:edmp.isFollowing': dmpAttendedTobaccoRehabProgramSinceLastRecommendation
                                    },
                                    dmpRecommendedPhysicalTraining,
                                    closeParagraph
                                ]
                            }
                        ]

                    }
                }
            ],
            edmpIdxProcessConfig = [
                idxStartHeader,
                idxCreationDate,
                idxAddresseeIK,
                idxSenderBSNR,
                idxSenderIK,
                idxCompressSoftware,
                idxEncryptSoftware,
                idxArchives
            ],
            actTypeParticipationMap = {
                DM1: 'Diabetes mellitus Typ 1',
                DM2: 'Diabetes mellitus Typ 2',
                KHK: 'KHK',
                ASTHMA: 'Asthma bronchiale',
                COPD: 'COPD'

            };

        function bool( value ) {
            return true === value ? 'Ja' : 'Nein';
        }

        function num( val, decimals ) {
            // TODOOO change this to a simpler function
            return Y.doccirrus.comctl.numberToLocalString( val, {
                decimals: decimals
            } ).replace( ',', '.' );
        }

        function meterNumbertoCentimetermString( val ) {
            return Y.doccirrus.comctl.numberToLocalString( val, { decimals: 2 } ).replace( ',', '' );
        }

        function padStrNum( val, padStr, sep='.' ) {
            const
                parts = val.split(sep);

            return `${(padStr + parts[0]).slice( -padStr.length )}.${parts[1]}`;
        }

        function buildAddressPOB( doc, ZIP, CTY, CNT, POB ) {
            doc = doc
                .ele( 'addr', {
                    USE: 'PST'
                } );
            if( ZIP ) {
                doc = doc.ele( 'ZIP', {
                    V: s( ZIP, '', 10 )
                } ).up();
            }

            if( CTY ) {
                doc = doc.ele( 'CTY', {
                    V: s( CTY, '', 40 )
                } ).up();
            }

            if( CNT ) {
                doc = doc.ele( 'CNT', {
                    V: s( CNT, '', 3 )
                } ).up();
            }

            if( POB ) {
                doc = doc.ele( 'POB', {
                    V: s( POB, '', 8 )
                } ).up();

            }

            return doc.up();
        }

        function buildPatientName( doc, patient ) {
            doc = doc
                .ele( 'person_name' )
                .ele( 'nm' )
                .ele( 'GIV', {
                    V: s( patient.firstname, '', 45 )
                } ).up()
                .ele( 'FAM', {
                    V: s( patient.lastname, '', 45 )
                } ).up();

            if( patient.title ) {
                doc = doc.ele( 'PFX', {
                    V: s( patient.title, '', 20 ),
                    QUAL: 'AC'
                } ).up();
            }

            if( patient.nameaffix ) {
                doc = doc.ele( 'PFX', {
                    V: s( patient.nameaffix, '', 20 ),
                    QUAL: 'NB'
                } ).up();
            }

            if( patient.fk3120 ) {
                doc = doc.ele( 'PFX', {
                    V: s( patient.fk3120, '', 20 ),
                    QUAL: 'VV'
                } ).up();
            }

            return doc.up().up();
        }

        function buildPatientAddresses( doc, patient, context ) {

            if( Array.isArray( patient.addresses ) ) {
                patient.addresses.forEach( address => {
                    if( 'OFFICIAL' === address.kind ) {
                        doc = buildAddress( doc, address.addon, address.street, address.houseno, address.zip, address.city, address.countryCode, context );
                    } else if( 'POSTBOX' === address.kind ) {
                        doc = buildAddressPOB( doc, address.zip, address.city, address.countryCode, address.postbox );
                    }
                } );
            }
            return doc;
        }

        function docInfo( doc, context ) {
            const
                activity = context.activity,
                dmpHeadDate = activity.dmpHeadDate,
                dmpSignatureDate = activity.dmpSignatureDate,
                locationNo = context.location.institutionCode || context.location.commercialNo,
                docTypeDef = Y.doccirrus.edmputils.getDocType( activity.actType, context.edmp.isFollowing );

            doc = doc
                .ele( 'clinical_document_header' )
                .ele( 'id', {
                    EX: activity._id.toString(),
                    RT: locationNo
                } ).up()
                .ele( 'set_id', {
                    EX: activity.dmpDocSetId, // must be the same for all versions (corrections)
                    RT: locationNo
                } ).up()
                .ele( 'version_nbr', {
                    V: '' + activity.dmpDocVersion
                } ).up()
                .ele( 'document_type_cd', {
                    V: docTypeDef && docTypeDef.id || '',
                    S: '1.2.276.0.76.5.100',
                    SN: 'KBV',
                    DN: docTypeDef && docTypeDef.text || ''
                } ).up()
                .ele( 'service_tmr', {
                    V: formatDate( dmpSignatureDate )
                } ).up()
                .ele( 'origination_dttm', {
                    V: formatDate( dmpHeadDate )
                } ).up();

            if( 1 < activity.dmpDocVersion ) {
                doc = doc.ele( 'document_relationship' )
                    .ele( 'document_relationship.type_cd', {
                        V: 'RPLC'
                    } ).up()
                    .ele( 'related_document' ).ele( 'id', {
                        EX: activity.copyRef || activity._id.toString(),
                        RT: locationNo
                    } ).up().up().up();
            }

            return doc;
        }

        function provider( doc, context ) {

            const
                activity = context.activity,
                location = context.location,
                employee = context.employee;

            doc = doc.ele( 'provider' )
                .ele( 'provider.type_cd', {
                    V: 'PRF'
                } ).up();

            if( activity.dmpCreatedInRepresentation ) {
                doc = doc.ele( 'function_cd', {
                    V: 'VERTRETER',
                    S: '1.2.276.0.76.5.105',
                    SN: 'KBV',
                    DN: 'Vertreter Arzt'
                } ).up();
            }

            doc = doc
                .ele( 'person' );
            if( employee.officialNo && !location.institutionCode ) {
                doc = doc.ele( 'id', {
                    EX: s( employee.officialNo, '', 9 ),
                    RT: 'LANR'
                } ).up();
            }
            if( location.commercialNo && !location.institutionCode ) {
                doc = doc.ele( 'id', {
                    EX: s( location.commercialNo, '', 9 ),
                    RT: 'BSNR'
                } ).up();
            }
            if( location.institutionCode ) {
                doc = doc.ele( 'id', {
                    EX: s( location.institutionCode, '', 9 ),
                    RT: 'Krankenhaus-IK'
                } ).up();
            }

            doc = doc.ele( 'person_name' )
                .ele( 'nm' )
                .ele( 'GIV', {
                    V: s( employee.firstname, '', 45 )
                } ).up()
                .ele( 'FAM', {
                    V: s( employee.lastname, '', 45 )
                } ).up()
                .ele( 'PFX', {
                    V: s( employee.title, '', 20 ),
                    QUAL: 'AC'
                } ).up().up().up();

            doc = buildAddress( doc, [location.locname, location.department], location.street, location.houseno, location.zip, location.city, location.countryCode, context );
            doc = buildCommunications( doc, location );
            return doc.up();
        }

        function patient( doc, context ) {
            const
                activity = context.activity,
                location = context.location,
                schein = context.schein,
                patient = context.patient,
                kbvDob = patient.kbvDob;

            let i, arr,
                transformedDob = '';

            if( 'string' === typeof kbvDob ) {
                arr = kbvDob.split( '.' );
                for( i = arr.length - 1; i >= 0; i-- ) {
                    transformedDob += arr[i];
                    if( i !== 0 ) {
                        transformedDob += '-';
                    }
                }
            }

            doc = doc
                .ele( 'patient' )
                .ele( 'patient.type_cd', {
                    V: 'PATSBJ'
                } ).up()
                .ele( 'person' )
                .ele( 'id', {
                    EX: s( patient.edmpCaseNo, '', 7 ),
                    RT: s( location.institutionCode || location.commercialNo, '', 9 )
                } ).up();

            doc = buildPatientName( doc, patient );
            doc = buildPatientAddresses( doc, patient, context );

            doc = doc.up()
                .ele( 'birth_dttm', {
                    V: transformedDob
                } ).up()
                .ele( 'administrative_gender_cd', {
                    V: mapGender( activity.dmpGender, moment( activity.dmpSignatureDate ).isAfter( moment( '2019-03-31', 'YYYY-MM-DD' ) ) ),
                    S: '2.16.840.1.113883.5.1'
                } ).up();

            doc = buildInsurance( doc, context, schein );

            return doc.up();
        }

        function subscriptions( doc, context ) {



            return buildObservation( doc, 'Einschreibung wegen', context.edmp.subscriptions.filter( e => e.val !== "BK").map( sub => {
                return {
                    V: actTypeParticipationMap[sub['-de']]
                };
            } ) );
        }

        function participationChronicHeartFailure( doc, context ) {
            const patient = context.patient;
            if( isAfterQ( PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER, context ) || !context.edmp.subscriptions.some( sub => 'KHK' === sub.val ) ) {
                return doc;
            }
            return buildObservation( doc, 'Modul-Teilnahme Chronische Herzinsuffizienz', {
                V: bool( patient.edmpParticipationChronicHeartFailure )
            } );
        }

        function height( doc, context ) {
            const activity = context.activity;

            return buildObservation( doc, 'Körpergröße', {
                V: num( activity.dmpHeight, 2 ),
                U: 'm'
            }, VALUE_RESULT_TYPE );
        }

        function weight( doc, context ) {
            const activity = context.activity;
            const weight = '' + Math.round( activity.dmpWeight );

            // ensure weight has always 3 digits since Q2 2019
            return buildObservation( doc, 'Körpergewicht', {
                V: isAfterQ( Q1_2019, context ) ? ('000' + weight).slice( -3 ) : weight,
                U: 'kg'
            }, VALUE_RESULT_TYPE );

        }

        function bloodPressureSystolic( doc, context ) {
            const activity = context.activity;
            if( !activity.dmpBloodPressureSystolic ) {
                return doc;
            }
            return buildObservation( doc, 'Blutdruck systolisch', {
                V: activity.dmpBloodPressureSystolic,
                U: 'mmHg'
            }, VALUE_RESULT_TYPE );
        }

        function bloodPressureDiastolic( doc, context ) {
            const activity = context.activity;
            if( !activity.dmpBloodPressureDiastolic ) {
                return doc;
            }
            return buildObservation( doc, 'Blutdruck diastolisch', {
                V: activity.dmpBloodPressureDiastolic,
                U: 'mmHg'
            }, VALUE_RESULT_TYPE );
        }

        function smoker( doc, context ) {
            const activity = context.activity;
            if( !activity.dmpSmoker ) {
                return doc;
            }
            return buildObservation( doc, 'Raucher', {
                V: translateEnum( 'DmpSmoker_E', activity.dmpSmoker )
            } );
        }

        function concomitantDiseases( doc, context ) {
            const activity = context.activity;
            let list;

            if( !activity.dmpConcomitantDisease || !activity.dmpConcomitantDisease.length ) {
                return doc;
            }

            switch( context.edmp.type ) {
                case 'DM1':
                    list = Y.doccirrus.schemas.activity.types.DmpDmConcomitantDisease_E.list;
                    break;
                case 'DM2':
                    list = Y.doccirrus.schemas.activity.types.DmpDmConcomitantDisease_E.list;
                    break;
                case 'KHK':
                    list = Y.doccirrus.schemas.activity.types.DmpKhkConcomitantDisease_E.list;
                    break;
                case 'ASTHMA':
                    list = Y.doccirrus.schemas.activity.types.DmpAsthmaConcomitantDisease_E.list;
                    break;
                case 'COPD':
                    list = Y.doccirrus.schemas.activity.types.DmpCopdConcomitantDisease_E.list;
                    break;
                default:
                    return doc;
            }

            doc = buildObservation( doc, 'Begleiterkrankungen', activity.dmpConcomitantDisease.map( disease => {
                let translation = '';
                list.some( entry => {
                    if( entry.val === disease ) {
                        translation = entry['-de'];
                        return true;
                    }
                } );
                return {
                    V: translation
                };
            } ) );

            return doc;
        }

        function hbA1c( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'HbA1c', {
                V: num( activity.dmpHbA1cValue, ('PERCENT' === activity.dmpHbA1cUnit ? 1 : 0) ),
                U: translateEnum( 'DmpHbA1cUnit_E', activity.dmpHbA1cUnit )
            }, VALUE_RESULT_TYPE );
        }

        function pathoUrinAlbAus( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Pathologische Urin-Albumin-Ausscheidung', {
                V: translateEnum( 'DmpPathoUrinAlbAus_E', activity.dmpPathoUrinAlbAus )
            } );
        }

        function eGFR( doc, context ) {
            const activity = context.activity;
            if( true === activity.dmpEGFRNotDetermined ) {
                doc = buildObservation( doc, 'eGFR', {
                    V: 'Nicht bestimmt'
                } );
            } else {
                doc = buildObservation( doc, 'eGFR', {
                    V: '' + activity.dmpEGFR,
                    U: 'ml/min/1,73m2KOF'
                }, VALUE_RESULT_TYPE );
            }
            return doc;
        }

        function pulsStatus( doc, context ) {
            const activity = context.activity;
            let translation;
            if( !activity.dmpPulsStatus ) {
                return doc;
            }
            if( isAfterQ( '2/2017', context ) || 'NOT_MEASURED' !== activity.dmpPulsStatus ) {
                translation = translateEnum( 'DmpPulsStatus_E', activity.dmpPulsStatus );
            } else {
                translation = 'Nicht erhoben';
            }
            return buildObservation( doc, 'Pulsstatus', {
                V: translation
            } );
        }

        function sensitivityTesting( doc, context ) {
            const activity = context.activity;
            let translation;
            if( !activity.dmpSensitivityTesting ) {
                return doc;
            }

            if( isAfterQ( '2/2017', context ) || 'NOT_DONE' !== activity.dmpSensitivityTesting ) {
                translation = translateEnum( 'DmpSensitivityTesting_E', activity.dmpSensitivityTesting );
            } else {
                translation = 'Nicht durchgeführt';
            }
            return buildObservation( doc, 'Sensibilitätsprüfung', {
                V: translation
            } );
        }

        function footStatus( doc, context ) {
            const
                activity = context.activity,
                footStatusValues = [{V: translateEnum( 'DmpFootStatusText_E', activity.dmpFootStatusText )}];
            // removed with Q3 2017
            if( !activity.dmpFootStatusText || isAfterQ( '2/2017', context ) ) {
                return doc;
            }
            let resultTypes = [null];

            if( activity.dmpFootStatusWagnerValue ) {
                footStatusValues.push( {V: activity.dmpFootStatusWagnerValue, U: 'Wagner'} );
                resultTypes.push( VALUE_RESULT_TYPE );
            }

            if( activity.dmpFootStatusArmstrongValue ) {
                footStatusValues.push( {V: activity.dmpFootStatusArmstrongValue, U: 'Armstrong'} );
                resultTypes.push( VALUE_RESULT_TYPE );
            }

            return buildObservation( doc, 'Fußstatus', footStatusValues, resultTypes );
        }

        function furtherRiskUlcus( doc, context ) {
            const
                activity = context.activity;

            // new from Q3 2017
            if( !isAfterQ( '2/2017', context ) || !activity.dmpFurtherRiskUlcus || !activity.dmpFurtherRiskUlcus.length ) {
                return doc;
            }
            return buildObservation( doc, 'Weiteres Risiko für Ulcus', activity.dmpFurtherRiskUlcus.map( v => ({
                V: translateEnum( 'DmpFurtherRiskUlcus_E', v )
            }) ) );
        }

        function ulkus( doc, context ) {
            const
                activity = context.activity;

            // new from Q3 2017
            if( !isAfterQ( '2/2017', context ) || !activity.dmpUlkus ) {
                return doc;
            }
            return buildObservation( doc, 'Ulkus', {
                V: translateEnum( 'DmpUlkus_E', activity.dmpUlkus )
            } );
        }

        function woundInfection( doc, context ) {
            const
                activity = context.activity;

            // new from Q3 2017
            if( !isAfterQ( '2/2017', context ) || !activity.dmpWoundInfection ) {
                return doc;
            }
            return buildObservation( doc, '(Wund)Infektion', {
                V: translateEnum( 'DmpWoundInfection_E', activity.dmpWoundInfection )
            } );
        }

        function injectionSites( doc, context ) {
            const activity = context.activity;
            if( !activity.dmpInjectionSites ) {
                return doc;
            }
            return buildObservation( doc, isAfterQ( '2/2017', context ) ? 'Injektionsstellen (bei Insulintherapie)' : 'Injektionsstellen', {
                V: translateEnum( 'DmpInjectionSites_E', activity.dmpInjectionSites )
            } );
        }

        function intervalFutureFootInspections( doc, context ) {
            const activity = context.activity;
            if( !activity.dmpIntervalFutureFootInspections ) {
                return doc;
            }
            return buildObservation( doc, 'Intervall für künftige Fußinspektionen (bei Patientinnen und Patienten ab dem vollendeten 18. Lebensjahr)', {
                V: translateEnum( 'DmpIntervalFutureFootInspections_E', activity.dmpIntervalFutureFootInspections )
            } );
        }

        function sequelae( doc, context ) {
            const activity = context.activity;
            if( 0 < activity.dmpSequelae.length ) {
                return buildObservation( doc, 'Spätfolgen', activity.dmpSequelae.map( disease => ({
                    V: translateEnum( 'DmpSequelae_E', disease )
                }) ) );
            }
            return doc;
        }

        function angina( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Angina pectoris', {
                V: translateEnum( 'DmpAnginaPectoris_E', activity.dmpAnginaPectoris )
            } );
        }

        function serumElectrolytes( doc, context ) {
            const activity = context.activity;
            if( !activity.dmpSerumElectrolytes || isAfterQ( PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER, context ) ) {
                return doc;
            }
            return buildObservation( doc, 'Serum-Elektrolyte', {
                V: translateEnum( 'DmpSerumElectrolytes_E', activity.dmpSerumElectrolytes )
            } );
        }

        function ldlCholesterol( doc, context ) {
            const activity = context.activity;
            if( true === activity.dmpLdlCholesterolNotDetermined ) {
                return buildObservation( doc, 'LDL-Cholesterin', {
                    V: 'Nicht bestimmt'
                } );
            }
            return buildObservation( doc, 'LDL-Cholesterin', {
                V: num( activity.dmpLdlCholesterolValue, 'MGDL' === activity.dmpLdlCholesterolUnit ? 0 : 1 ),
                U: translateEnum( 'DmpLdlCholesterolUnit_E', activity.dmpLdlCholesterolUnit )
            }, VALUE_RESULT_TYPE );
        }

        function frequencyOfAsthmaSymptoms( doc, context ) {
            const activity = context.activity;
            if( isAfterQ( Q1_2019, context ) ) {
                return doc;
            }
            return buildObservation( doc, 'Häufigkeit von Asthma-Symptomen', {
                V: translateEnum( 'DmpFrequencyOfAsthmaSymptoms_E', activity.dmpFrequencyOfAsthmaSymptoms )
            } );
        }

        function dmpFrequencyOfAsthmaSymptoms_4_44( doc, context ) {
            const activity = context.activity;
            if( !isAfterQ( Q1_2019, context ) ) {
                return doc;
            }
            return buildObservation( doc, 'In den letzten 4 Wochen: Häufigkeit von Asthma-Symptomen tagsüber', {
                V: translateEnum( 'DmpFrequencyOfAsthmaSymptoms_4_44_E', activity.dmpFrequencyOfAsthmaSymptoms_4_44 )
            } );
        }

        function dmpFrequencyOfUseOfNeedMedication_4_44( doc, context ) {
            const activity = context.activity;
            if( !isAfterQ( Q1_2019, context ) ) {
                return doc;
            }
            return buildObservation( doc, 'In den letzten 4 Wochen: Häufigkeit des Einsatzes der Bedarfsmedikation', {
                V: translateEnum( 'DmpFrequencyOfUseOfNeedMedication_4_44_E', activity.dmpFrequencyOfUseOfNeedMedication_4_44 )
            } );
        }

        function dmpLimitationOfEverydayActivitiesDueToBronchialAsthma_4_44( doc, context ) {
            const activity = context.activity;
            if( !isAfterQ( Q1_2019, context ) ) {
                return doc;
            }
            return buildObservation( doc, 'In den letzten 4 Wochen: Einschränkung von Aktivitäten im Alltag wegen Asthma bronchiale', {
                V: translateEnum( 'DmpLimitationOfEverydayActivitiesDueToBronchialAsthma_4_44_E', activity.dmpLimitationOfEverydayActivitiesDueToBronchialAsthma_4_44 )
            } );
        }

        function dmpAsthmaRelatedNightSleepDisorder_4_44( doc, context ) {
            const activity = context.activity;
            if( !isAfterQ( Q1_2019, context ) ) {
                return doc;
            }
            return buildObservation( doc, 'In den letzten 4 Wochen: Asthmabedingte Störung des Nachtschlafes', {
                V: translateEnum( 'DmpAsthmaRelatedNightSleepDisorder_4_44_E', activity.dmpAsthmaRelatedNightSleepDisorder_4_44 )
            } );
        }

        function currentPeakFlowValue( doc, context ) {
            if( isAfterQ( Q1_2019, context ) ) {
                return doc;
            }
            const activity = context.activity;
            if( true === activity.dmpCurrentPeakFlowValueNotDone ) {
                doc = buildObservation( doc, 'Aktueller Peak-Flow-Wert', {
                    V: 'Nicht durchgeführt'
                } );
            } else {
                doc = buildObservation( doc, 'Aktueller Peak-Flow-Wert', {
                    V: '' + activity.dmpCurrentPeakFlowValue,
                    U: 'Liter/Minute'
                }, VALUE_RESULT_TYPE );
            }
            return doc;
        }

        function dmpCurrentFEV1Value_4_44( doc, context ) {
            if( !isAfterQ( Q1_2019, context ) ) {
                return doc;
            }
            const activity = context.activity;
            if( true === activity.dmpCurrentFEV1ValueNotDone_4_44 ) {
                doc = buildObservation( doc, 'Aktueller FEV1-Wert (mindestens alle 12 Monate)', {
                    V: 'Nicht durchgeführt'
                } );
            } else {
                doc = buildObservation( doc, 'Aktueller FEV1-Wert (mindestens alle 12 Monate)', {
                    V: padStrNum( num( activity.dmpCurrentFEV1Value_4_44, 1 ), '000' ),
                    U: 'Prozent des Sollwertes'
                }, VALUE_RESULT_TYPE );
            }
            return doc;
        }

        function dmEvents( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Relevante Ereignisse', activity.dmpEvents.map( v => ({
                V: translateEnum( 'DmpEvents_E', v )
            }) ) );
        }

        function khkRelevantEvents( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Relevante Ereignisse', activity.dmpKhkRelevantEvents.map( v => ({
                V: translateEnum( 'DmpKhkRelevantEvents_E', v )
            }) ) );
        }

        function diagnosticCoronaryTherapeuticIntervention( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Diagnostische und/oder koronartherapeutische Intervention', activity.dmpDiagnosticCoronaryTherapeuticIntervention.map( v => ({
                V: translateEnum( 'DmpDiagnosticCoronaryTherapeuticIntervention_E', v )
            }) ) );
        }

        function hadHypoglycaemic( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Schwere Hypoglykämien seit der letzten Dokumentation', {
                V: activity.dmpHadHypoglycaemic,
                U: 'Anzahl'
            }, VALUE_RESULT_TYPE );
        }

        function hadHospitalStayHbA1c( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Stationäre Aufenthalte wegen Nichterreichens des HbA1c-Wertes seit der letzten Dokumentation', {
                V: activity.dmpHadHospitalStayHbA1c,
                U: 'Anzahl'
            }, VALUE_RESULT_TYPE );
        }

        function hadStationaryTreatment( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Stationäre notfallmäßige Behandlung wegen Diabetes mellitus seit der letzten Dokumentation', {
                V: activity.dmpHadStationaryTreatment,
                U: 'Anzahl'
            }, VALUE_RESULT_TYPE );
        }

        function hadStationaryKhkTreatment( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Stationäre notfallmäßige Behandlung wegen KHK seit der letzten Dokumentation', {
                V: activity.dmpHadStationaryKhkTreatment,
                U: 'Anzahl'
            }, VALUE_RESULT_TYPE );
        }

        function hadStationaryAsthmaTreatment( doc, context ) {
            const activity = context.activity;
            if( isAfterQ( Q1_2019, context ) ) {
                return doc;
            }
            return buildObservation( doc, 'Stationäre notfallmäßige Behandlung wegen Asthma bronchiale seit der letzten Dokumentation', {
                V: activity.dmpHadStationaryAsthmaTreatment,
                U: 'Anzahl'
            }, VALUE_RESULT_TYPE );
        }

        function hadUnplannedAsthmaTreatment_4_44( doc, context ) {
            const activity = context.activity;
            if( !isAfterQ( Q1_2019, context ) ) {
                return doc;
            }
            return buildObservation( doc, 'Ungeplante, auch notfallmäßige (ambulant und stationär) ärztliche Behandlung wegen Asthma bronchiale seit der letzten Dokumentation', {
                V: activity.dmpHadUnplannedAsthmaTreatment_4_44,
                U: 'Anzahl'
            }, VALUE_RESULT_TYPE );
        }

        function frequencyExacerbationsSinceLast( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Häufigkeit von Exazerbationen seit der letzten Dokumentation', {
                V: '' + activity.dmpFrequencyExacerbationsSinceLast,
                U: 'Anzahl'
            }, VALUE_RESULT_TYPE );
        }

        function hadStationaryCopdTreatment( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Stationäre notfallmäßige Behandlung wegen COPD seit der letzten Dokumentation', {
                V: '' + activity.dmpHadStationaryCopdTreatment,
                U: 'Anzahl'
            }, VALUE_RESULT_TYPE );
        }

        function antiplatelet( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Thrombozytenaggregationshemmer', activity.dmpAntiplatelet.map( v => ({
                V: translateEnum( 'DmpAntiplatelet_E', v )
            }) ) );
        }

        function betaBlocker( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Betablocker', activity.dmpBetaBlocker.map( v => ({
                V: translateEnum( 'DmpBetaBlocker_E', v )
            }) ) );
        }

        function ace( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'ACE-Hemmer', activity.dmpACE.map( v => ({
                V: translateEnum( 'DmpACE_E', v )
            }) ) );
        }

        function hmg( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'HMG-CoA-Reduktase-Hemmer', activity.dmpHMG.map( v => ({
                V: translateEnum( 'DmpHMG_E', v )
            }) ) );
        }

        function thia( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Thiaziddiuretika, einschließlich Chlorthalidon', activity.dmpTHIA.map( v => ({
                V: translateEnum( 'DmpTHIA_E', v )
            }) ) );
        }

        function khkOtherMedication( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Sonstige Medikation', {
                V: ('YES' === activity.dmpKhkOtherMedication ? 'Ja' : 'Nein')
            } );
        }

        function inhaledGlucocorticosteroids( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Inhalative Glukokortikosteroide', activity.dmpInhaledGlucocorticosteroids.map( v => ({
                V: translateEnum( 'DmpInhaledGlucocorticosteroids_E', v )
            }) ) );
        }

        function inhaledLongActingBeta2AdrenergicAgonist( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Inhalative lang wirksame Beta-2-Sympathomimetika', activity.dmpInhaledLongActingBeta2AdrenergicAgonist.map( v => ({
                V: translateEnum( 'DmpInhaledLongActingBeta2AdrenergicAgonist_E', v )
            }) ) );
        }

        function inhaledRapidActingBeta2AdrenergicAgonist( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Kurz wirksame inhalative Beta-2-Sympathomimetika', activity.dmpInhaledRapidActingBeta2AdrenergicAgonist.map( v => ({
                V: translateEnum( 'DmpInhaledRapidActingBeta2AdrenergicAgonist_E', v )
            }) ) );
        }

        function systemicGlucocorticosteroids( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Systemische Glukokortikosteroide', activity.dmpSystemicGlucocorticosteroids.map( v => ({
                V: translateEnum( 'DmpSystemicGlucocorticosteroids_E', v )
            }) ) );
        }

        function otherAsthmaSpecificMedication( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Sonstige asthmaspezifische Medikation', activity.dmpOtherAsthmaSpecificMedication.map( v => ({
                V: translateEnum( 'DmpOtherAsthmaSpecificMedication_E', v )
            }) ) );
        }

        function checkedInhalationTechnique( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Inhalationstechnik überprüft', {
                V: translateEnum( 'DmpCheckedInhalationTechnique_E', activity.dmpCheckedInhalationTechnique )
            } );
        }

        function shortActingBeta2AdrenergicAgonistAnticholinergics( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Kurz wirksame Beta-2-Sympathomimetika und/oder Anticholinergika', activity.dmpShortActingBeta2AdrenergicAgonistAnticholinergics.map( v => ({
                V: translateEnum( 'DmpShortActingBeta2AdrenergicAgonistAnticholinergics_E', v )
            }) ) );
        }

        function longActingBeta2AdrenergicAgonist( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Lang wirksame Beta-2-Sympathomimetika', activity.dmpLongActingBeta2AdrenergicAgonist.map( v => ({
                V: translateEnum( 'DmpLongActingBeta2AdrenergicAgonist_E', v )
            }) ) );
        }

        function longActingAnticholinergics( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Lang wirksame Anticholinergika', activity.dmpLongActingAnticholinergics.map( v => ({
                V: translateEnum( 'DmpLongActingAnticholinergics_E', v )
            }) ) );
        }

        function otherDiseaseSpecificMedication( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Sonstige diagnosespezifische Medikation', activity.dmpOtherDiseaseSpecificMedication.map( v => ({
                V: translateEnum( 'DmpOtherDiseaseSpecificMedication_E', v )
            }) ) );
        }

        function recommendedDmTrainings( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Schulung empfohlen (bei aktueller Dokumentation)', activity.dmpRecommendedDmTrainings.map( v => ({
                V: translateEnum( 'DmpRecommendedDmTrainings_E', v )
            }) ) );
        }

        function dmTrainingsBeforeSubscription( doc, context ) {
            const activity = context.activity;

            if( !isAfterQ( '2/2017', context ) || !activity.dmpDmTrainingsBeforeSubscription || !activity.dmpDmTrainingsBeforeSubscription.length ) {
                return doc;
            }

            return buildObservation( doc, 'Schulung schon vor Einschreibung ins DMP bereits wahrgenommen', activity.dmpDmTrainingsBeforeSubscription.map( v => ({
                V: translateEnum( 'DmpDmTrainingsBeforeSubscription_E', v )
            }) ) );
        }

        function recommendedKhkTrainings( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Schulung empfohlen (bei aktueller Dokumentation)', activity.dmpRecommendedKhkTrainings.map( v => ({
                V: translateEnum( 'DmpRecommendedKhkTrainings_E', v )
            }) ) );
        }

        function recommendedAsthmaTrainings( doc, context ) {
            const activity = context.activity,
                val = activity.dmpRecommendedAsthmaTrainings && activity.dmpRecommendedAsthmaTrainings[0];
            return buildObservation( doc, 'Asthma-Schulung empfohlen (bei aktueller Dokumentation)', {
                V: ('YES' === val ? 'Ja' : 'Nein')
            } );
        }

        function dmpAsthmaTrainingAlreadyDoneBeforeDMP_4_44( doc, context ) {
            const activity = context.activity,
                val = activity.dmpAsthmaTrainingAlreadyDoneBeforeDMP_4_44 && activity.dmpAsthmaTrainingAlreadyDoneBeforeDMP_4_44[0];
            if( !isAfterQ( Q1_2019, context ) ) {
                return doc;
            }
            return buildObservation( doc, 'Asthma-Schulung schon vor Einschreibung in DMP bereits wahrgenommen', {
                V: ('YES' === val ? 'Ja' : 'Nein')
            } );
        }

        function recommendedCopdTrainings( doc, context ) {
            const activity = context.activity,
                val = activity.dmpRecommendedCopdTrainings && activity.dmpRecommendedCopdTrainings[0];
            return buildObservation( doc, 'COPD-Schulung empfohlen (bei aktueller Dokumentation)', {
                V: ('YES' === val ? 'Ja' : 'Nein')
            } );
        }

        function dmpAttendedTrainingBeforeSubscription( doc, context ) {
            if( !isAfterQ( COPD_4_0_0_LAST_QUARTER, context ) ) {
                return doc;
            }
            const activity = context.activity,
                val = activity.dmpAttendedTrainingBeforeSubscription && activity.dmpAttendedTrainingBeforeSubscription[0];
            return buildObservation( doc, 'Schulung schon vor der Einschreibung in ein DMP bereits wahrgenommen', {
                V: ('YES' === val ? 'Ja' : 'Nein')
            } );
        }

        function attendedTrainingObservationsStart( doc ) {
            return doc.ele( 'sciphox:Beobachtung' )
                .ele( 'sciphox:Parameter', {
                    DN: 'Empfohlene Schulung(en) wahrgenommen'
                } ).up().ele( 'sciphox:Beobachtungen' );
        }

        function attendedDiabetesTraining( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Diabetes-Schulung', {
                V: translateEnum( 'DmpPerceivedTraining_E', activity.dmpPerceivedDiabetesTraining )
            } );
        }

        function attendedHypertensionTraining( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Hypertonie-Schulung', {
                V: translateEnum( 'DmpPerceivedTraining_E', activity.dmpPerceivedHypertensionTraining )
            } );
        }

        function attendedTrainingObservationsEnd( doc ) {
            return doc.up().up();
        }

        function perceivedAsthmaTraining( doc, context ) {
            const activity = context.activity;
            const label = isAfterQ( Q1_2019, context ) ? 'Empfohlene Asthma-Schulung wahrgenommen' : 'Empfohlene Schulung wahrgenommen';
            return buildObservation( doc, label, {
                V: translateEnum( 'DmpPerceivedTraining_E', activity.dmpPerceivedAsthmaTraining )
            } );
        }

        function perceivedCopdTraining( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Empfohlene Schulung wahrgenommen', {
                V: translateEnum( 'DmpPerceivedTraining_E', activity.dmpPerceivedCopdTraining )
            } );
        }

        function patientWantsInfos( doc, context ) {
            const activity = context.activity;
            if( 0 < activity.dmpPatientWantsInfos.length ) {
                doc = buildObservation( doc, 'Vom Patienten gewünschte Informationsangebote der Krankenkasse', activity.dmpPatientWantsInfos.map( v => ({
                    V: translateEnum( 'DmpPatientWantsInfos_E', v )
                }) ) );
            }
            return doc;
        }

        function documentationInterval( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Dokumentationsintervall', {
                V: translateEnum( 'DmpDocumentationInterval_E', activity.dmpDocumentationInterval )
            } );
        }

        function dmpRecommendedTobaccoAbstinence( doc, context ) {
            const activity = context.activity;
            if( !isAfterQ( COPD_4_0_0_LAST_QUARTER, context ) || !activity.dmpRecommendedTobaccoAbstinence ) {
                return doc;
            }
            return buildObservation( doc, 'Empfehlung zum Tabakverzicht ausgesprochen', {
                V: 'YES' === activity.dmpRecommendedTobaccoAbstinence ? 'Ja' : 'Nein'
            } );
        }

        function dmpRecommendedTobaccoRehabProgram( doc, context ) {
            const activity = context.activity;
            if( !isAfterQ( COPD_4_0_0_LAST_QUARTER, context ) || !activity.dmpRecommendedTobaccoRehabProgram ) {
                return doc;
            }
            return buildObservation( doc, 'Empfehlung zur Teilnahme an Tabakentwöhnungsprogramm ausgesprochen', {
                V: 'YES' === activity.dmpRecommendedTobaccoRehabProgram ? 'Ja' : 'Nein'
            } );
        }

        function dmpAttendedTobaccoRehabProgramSinceLastRecommendation( doc, context ) {
            const activity = context.activity;
            if( !isAfterQ( COPD_4_0_0_LAST_QUARTER, context ) || !activity.dmpAttendedTobaccoRehabProgramSinceLastRecommendation ) {
                return doc;
            }
            return buildObservation( doc, 'An einem Tabakentwöhnungsprogramm seit der letzten Empfehlung teilgenommen', {
                V: translateEnum( 'DmpAttendedTobaccoRehabProgramSinceLastRecommendation_E', activity.dmpAttendedTobaccoRehabProgramSinceLastRecommendation )
            } );
        }

        function dmpRecommendedPhysicalTraining( doc, context ) {
            const activity = context.activity;
            if( !isAfterQ( COPD_4_0_0_LAST_QUARTER, context ) ) {
                return doc;
            }
            return buildObservation( doc, 'Empfehlung zum körperlichen Training ausgesprochen', {
                V: 'YES' === activity.dmpRecommendedPhysicalTraining ? 'Ja' : 'Nein'
            } );
        }

        function hbA1cTargetValue( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'HbA1c-Zielwert', {
                V: translateEnum( 'DmpHbA1cTargetValue_E', activity.dmpHbA1cTargetValue )
            } );
        }

        function treatmentAtDiabeticFootInstitution( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Behandlung/Mitbehandlung in einer für das Diabetische Fußsyndrom qualifizierten Einrichtung', activity.dmpTreatmentAtDiabeticFootInstitution.map( v => ({
                V: translateEnum( 'DmpTreatmentAtDiabeticFootInstitution_E', v )
            }) ) );
        }

        function diabetesRelatedHospitalization( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Diabetesbezogene stationäre Einweisung', activity.dmpDiabetesRelatedHospitalization.map( v => ({
                V: translateEnum( 'DmpDiabetesRelatedHospitalization_E', v )
            }) ) );
        }

        function opthRetinalExam( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Ophthalmologische Netzhautuntersuchung seit letzter Dokumentation', activity.dmpOpthRetinalExam.map( v => {
                return {
                    V: translateEnum( 'DmpOpthRetinalExam_E', v )
                };
            } ) );
        }

        function khkRelatedTransferArranged( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'KHK-bezogene Überweisung veranlasst', {
                V: translateEnum( 'DmpKhkRelatedTransferArranged_E', activity.dmpKhkRelatedTransferArranged )
            } );
        }

        function khkRelatedConfinementArranged( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'KHK-bezogene Einweisung veranlasst', {
                V: translateEnum( 'DmpKhkRelatedConfinementArranged_E', activity.dmpKhkRelatedConfinementArranged )
            } );
        }

        function regularWeightControlRecommended( doc, context ) {
            const activity = context.activity;
            if( isAfterQ( PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER, context ) || !activity.dmpRegularWeightControlRecommended || !activity.dmpRegularWeightControlRecommended.length ) {
                return doc;
            }
            return buildObservation( doc, 'Regelmäßige Gewichtskontrolle empfohlen?', activity.dmpRegularWeightControlRecommended.map( v => {
                return {
                    V: translateEnum( 'DmpRegularWeightControlRecommended_E', v )
                };
            } ) );
        }

        function writtenSelfManagementPlan( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Schriftlicher Selbstmanagementplan', {
                V: translateEnum( 'DmpWrittenSelfManagementPlan_E', activity.dmpWrittenSelfManagementPlan )
            } );
        }

        function asthmaRelatedTransferOrConfinementArranged( doc, context ) {
            const activity = context.activity;
            if( isAfterQ( Q1_2019, context ) ) {
                return doc;
            }
            return buildObservation( doc, 'Asthmabezogene Über- bzw. Einweisung veranlasst', {
                V: translateEnum( 'DmpAsthmaRelatedTransferOrConfinementArranged_E', activity.dmpAsthmaRelatedTransferOrConfinementArranged )
            } );
        }

        function dmpTherapyAdjustment_4_44( doc, context ) {
            const activity = context.activity;
            if( !isAfterQ( Q1_2019, context ) ) {
                return doc;
            }
            return buildObservation( doc, 'Therapieanpassung', activity.dmpTherapyAdjustment_4_44.map( v => {
                return {
                    V: translateEnum( 'DmpTherapyAdjustment_4_44_E', v )
                };
            } ) );
        }

        function insulin( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Insulin oder Insulin-Analoga', {
                V: translateEnum( 'DmpInsulin_E', activity.dmpInsulin )
            } );
        }

        function glibenclamide( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Glibenclamid', activity.dmpGlibenclamide.map( v => ({
                V: translateEnum( 'DmpGlibenclamide_E', v )
            }) ) );
        }

        function metformin( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'Metformin', activity.dmpMetformin.map( v => ({
                V: translateEnum( 'DmpMetformin_E', v )
            }) ) );
        }

        function otherOralAntiDiabetic( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, isAfterQ( '2/2017', context ) ? 'Sonstige antidiabetische Medikation' : 'Sonstige orale antidiabetische Medikation', {
                V: translateEnum( 'DmpOtherOralAntiDiabetic_E', activity.dmpOtherOralAntiDiabetic )
            } );
        }

        function currentFev1( doc, context ) {
            const activity = context.activity;
            if( true === activity.dmpCurrentFev1NotDone ) {
                doc = buildObservation( doc, 'Aktueller FEV1-Wert (alle 6 bis 12 Monate)', {
                    V: 'Nicht durchgeführt'
                } );
            } else {
                doc = buildObservation( doc, 'Aktueller FEV1-Wert (alle 6 bis 12 Monate)', {
                    V: isAfterQ( COPD_4_0_0_LAST_QUARTER, context ) ? padStrNum( num( activity.dmpCurrentFev1, 1 ), '000' ) : num( activity.dmpCurrentFev1, 2 ),
                    U: isAfterQ( COPD_4_0_0_LAST_QUARTER, context ) ? 'Prozent des Soll-Wertes' : 'Liter'
                }, VALUE_RESULT_TYPE );
            }
            return doc;
        }

        function dmpClinicalAssessmentOfOsteoporosisRisk( doc, context ) {
            if( !isAfterQ( COPD_4_0_0_LAST_QUARTER, context ) ) {
                return doc;
            }
            const activity = context.activity,
                val = activity.dmpClinicalAssessmentOfOsteoporosisRisk && activity.dmpClinicalAssessmentOfOsteoporosisRisk[0];
            return buildObservation( doc, 'Klinische Einschätzung des Osteoporoserisikos durchgeführt', {
                V: ('YES' === val ? 'Ja' : 'Nein')
            } );
        }

        function copdRelatedTransferOrConfinementArranged( doc, context ) {
            const activity = context.activity;
            return buildObservation( doc, 'COPD-bezogene Über- bzw. Einweisung veranlasst', {
                V: translateEnum( 'DmpCopdRelatedTransferOrConfinementArranged_E', activity.dmpCopdRelatedTransferOrConfinementArranged )
            } );
        }

        // ========================================================================================================== \\
        // ================================================= BK ===================================================== \\

        // The setup function creates the variables necessary to determine which sections need to be included into the
        // xml file. Generally the following need to be taken into account:
        //     - The actType ("FIRST", "PNP", "FOLLOWING"
        //     - Whether a section is empty
        //     - Whether a section is hidden
        function setup( doc, context ) {
            const
                isFirst = context.edmp.isFirst,
                isPnp = context.edmp.isPnp,
                activity = context.activity,

                showOptionalFields = activity.dmpShowOptionalFields,
                primary = activity.dmpInitialManifestationOfPrimaryTumor,
                contralateral = activity.dmpManifestationOfContralateralBreastCancer,
                locoregional = activity.dmpLocoregionalRecurrence,
                remote = activity.dmpFirstConfirmationOfRemoteMetastases,
                primaryDate = primary ? new Date(primary).setHours(0, 0, 0, 0) : null,
                contralateralDate = contralateral ? new Date(contralateral).setHours(0, 0, 0, 0) : null,
                locoregionalDate = locoregional ? new Date(locoregional).setHours(0, 0, 0, 0) : null,
                affectedBreast = activity.dmpAffectedBreast,
                status = activity.dmpCurrentTreatmentStatus,
                performedSurgicalTherapy = activity.dmpPerformedSurgicalTherapy,
                neoadjuvantTherapy = activity.dmpPreoperativeNeoadjuvantTherapy,
                pT = activity.dmpPT,
                pN = activity.dmpPN,
                m = activity.dmpM,
                grading = activity.dmpGrading,
                resection = activity.dmpResection,
                immunohistochemicalHormoneReceptor = activity.dmpImmunohistochemicalHormoneReceptor,
                HER2Neu = activity.dmpHER2Neu,
                radiotherapy = activity.dmpRadiotherapy,
                chemotherapy = activity.dmpChemotherapy,
                endocrineTherapy = activity.dmpEndocrineTherapy,
                antibodyTherapy = activity.dmpAntibodyTherapy,
                locoregionalTherapy =  activity.dmpOngoingOrCompletedTherapy_locoregionalRecurrence,
                localisation = activity.dmpLocalisation,
                remoteTherapy = activity.dmpOngoingOrCompletedTherapy_remoteMetastases,
                bisphosphonateTherapy = activity.dmpBisphosphonateTherapy,
                lymphedemaPresent = activity.dmpLymphedemaPresent,
                registrationFor = activity.dmpRegistrationFor,
                locoregionalDate_FLW = activity.dmpManifestationOfLocoregionalRecurrence_following_date,
                remoteDate_FLW = activity.dmpManifestationOfRemoteMetastases_following_date,
                remoteText_FLW = activity.dmpManifestationOfRemoteMetastases_following_text,
                registrationForLocoregional_FLW = !!(registrationFor === "LOCOREGIONAL_RECURRENCE" || locoregionalDate_FLW),
                registrationForRemote_FLW = !!(registrationFor === "REMOTE_METASTASES" || remoteDate_FLW),
                nextDocumentation = activity.dmpPlannedDateForNextDocumentation,
                status_FLW = activity.dmpCurrentTreatmentStatus_following,
                locoregionalTherapy_FLW = activity.dmpTherapyOfLocoregionalRecurrence,
                remoteTherapy_FLW = activity.dmpTherapyOfRemoteMetastases,
                bisphosphonateTherapy_FLW = activity.dmpBisphosphonateTherapy_following,

                registrationForPrimaryOrContralateral_FST =  (primary || contralateral) &&
                                                             ( (!remote && !locoregional) ||
                                                               ((!remote && (primaryDate >= locoregionalDate || contralateralDate > locoregionalDate))) ),

                registrationForLocoregional =  locoregional && !remote &&
                                               !( primary && new Date(primary).setHours(0, 0, 0, 0) >= new Date(locoregional).setHours(0, 0, 0, 0) ) &&
                                               !( contralateral && new Date(contralateral).setHours(0, 0, 0, 0) > new Date(locoregional).setHours(0, 0, 0, 0) ),


                anamnesisAndTreatmentStatusEmpty = affectedBreast.length === 0 && !status && performedSurgicalTherapy.length === 0,
                currentFindingsEmpty = !neoadjuvantTherapy && pT.length === 0 && pN.length === 0 && !m && !grading && resection.length === 0 && !immunohistochemicalHormoneReceptor && !HER2Neu,
                treatmentOfPrimaryTumorEmpty = !radiotherapy && !chemotherapy && !endocrineTherapy && !antibodyTherapy,
                findingsAndTherapyOfLocoregionalEmpty = locoregionalTherapy.length === 0,
                findingsAndTherapyOfRemoteEmpty = localisation.length === 0 && remoteTherapy.length === 0 && bisphosphonateTherapy.length === 0,
                registrationForLocoregionalOrRemoteEmpty = status_FLW === 0 && locoregionalTherapy_FLW === 0 && remoteTherapy_FLW === 0 && bisphosphonateTherapy_FLW === 0,
                operationPlannedOrPostoperative = status === "OPERATION_PLANNED" || status === "POSTOPERATIVE";

            context.edmp.bk = {
                // Versions
                version_4_23: context.xsdSchema.version === "4.23",
                version_4_21: context.xsdSchema.version === "4.21",
                // DMP Types
                isFirstOrPnp: isFirst || isPnp,
                // Sections - FIRST and PNP
                anamnesisAndTreatmentStatusRequired: !!( isPnp || (isFirst && registrationForPrimaryOrContralateral_FST) || (showOptionalFields && !anamnesisAndTreatmentStatusEmpty) ),
                currentFindingsRequired: !!(isPnp || ( isFirst && registrationForPrimaryOrContralateral_FST && operationPlannedOrPostoperative && neoadjuvantTherapy) || (showOptionalFields && !currentFindingsEmpty) ),
                treatmentOfPrimaryTumorRequired: !!(isPnp || (isFirst && registrationForPrimaryOrContralateral_FST) || (showOptionalFields && !treatmentOfPrimaryTumorEmpty) ),
                findingsAndTherapyOfLocoregionalRequired: !!( (isFirst && registrationForLocoregional) || (showOptionalFields && !findingsAndTherapyOfLocoregionalEmpty) ),
                findingsAndTherapyOfRemoteRequired: !!( (isFirst && remote) || (showOptionalFields && !findingsAndTherapyOfRemoteEmpty) ),
                otherFindingsRequired: !!( lymphedemaPresent || nextDocumentation ),
                // Sections - FOLLOWING
                treatmentOfPrimaryTumorRequired_FLW: (registrationFor === "PRIMARY_TUMOR" || registrationFor === "CONTRALATERAL_BREAST_CANCER") || (showOptionalFields && !treatmentOfPrimaryTumorEmpty),
                registrationForLocoregionalOrRemoteRequired_FLW: registrationForLocoregional_FLW || registrationForRemote_FLW || (showOptionalFields && !registrationForLocoregionalOrRemoteEmpty),
                otherRequired: !!nextDocumentation,
                // Subsections - FIRST and PNP
                performedSurgicalTherapyRequired: !!( isPnp || status === "POSTOPERATIVE" || showOptionalFields ),
                currentFindingssRequired: !!( isPnp || status === "POSTOPERATIVE" || showOptionalFields),
                bisphosophonateTherapyRequired:  !!( localisation.includes("BONE") || showOptionalFields ),
                // Subsections - FOLLOWING
                registrationForLocoregional_FLW: registrationForLocoregional_FLW || showOptionalFields,
                registrationForRemote_FLW: registrationForRemote_FLW || showOptionalFields,
                remoteInBone_FLW: (registrationForRemote_FLW && remoteText_FLW.indexOf("BONE") > -1) || showOptionalFields
            };



            // Required Fields (from 4_23 on) --------------------------------------------------------------------------

            const requiredFields = Y.doccirrus.edmpbkutils.getRequiredFieldsObject( context.activity );
            const requiredSections = Y.doccirrus.edmpbkutils.getRequiredSectionsObject( context.activity, requiredFields );

            Object.assign( context.edmp.bk, {
                requiredFields: requiredFields,
                requiredSections: requiredSections
            });

            return doc;
        }

// FIRST, PNP & FOLLOWING ==============================================================================================
    // Treatment of the primary tumor / contralateral breast cancer ----------------------------------------------------
        function radiotherapy( doc, context ) {
            const
                activity = context.activity,
                radiotherapy = activity.dmpRadiotherapy;

            if( !radiotherapy ) {
                return doc;
            } else {
                return buildObservation( doc, 'Strahlentherapie', {
                    V: translateEnum( 'DmpRadiotherapy_E', radiotherapy )
                } );
            }
        }
        function chemotherapy( doc, context ) {
            const
                activity = context.activity,
                chemotherapy = activity.dmpChemotherapy;

            if( !chemotherapy ) {
                return doc;
            } else {
                return buildObservation( doc, 'Chemotherapie', {
                    V: translateEnum( 'DmpChemotherapy_E', chemotherapy )
                } );
            }
        }
        function endocrineTherapy( doc, context ) {
            const
                activity = context.activity,
                endocrineTherapy = activity.dmpEndocrineTherapy;

            if( !endocrineTherapy ) {
                return doc;
            } else {
                return buildObservation( doc, 'Endokrine Therapie', {
                    V: translateEnum( 'DmpEndocrineTherapy_E', endocrineTherapy )
                } );
            }
        }
        function antibodyTherapy( doc, context ) {
            const
                activity = context.activity,
                antibodyTherapy = activity.dmpAntibodyTherapy;

            if( !antibodyTherapy ) {
                return doc;
            } else {
                return buildObservation( doc, 'Antikörpertherapie mit Trastuzumab', {
                    V: translateEnum( 'DmpAntibodyTherapy_E', antibodyTherapy )
                } );
            }
        }
        // 4.23 ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        function currentAdjuvantEndocrineTherapy_4_23( doc, context ) {
            const activity = context.activity;
            const currentAdjuvantEndocrineTherapy = activity.dmpCurrentAdjuvantEndocrineTherapy_4_23;

            return buildObservation( doc, 'Aktuelle adjuvante endokrine Therapie', currentAdjuvantEndocrineTherapy.map( v => ({
                V: translateEnum( 'DmpCurrentAdjuvantEndocrineTherapy_4_23_E', v )
            }) ) );
        }
        function sideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23( doc, context ) {
            const activity = context.activity;
            const sideEffectsOfCurrentAdjuvantEndocrineTherapy = activity.dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23;

            return buildObservation( doc, 'Nebenwirkungen der aktuellen adjuvanten endokrinen Therapie', {
                V: translateEnum( 'DmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23_E', sideEffectsOfCurrentAdjuvantEndocrineTherapy )
            } );
        }
        function continuationOfCurrentEndocrineTherapy_4_23( doc, context ) {
            const activity = context.activity;
            const continuationOfCurrentEndocrineTherapy = activity.dmpContinuationOfCurrentEndocrineTherapy_4_23;
            const dmpType = activity.dmpType;

            const text = dmpType === "FOLLOWING" ? 'Fortführung der adjuvanten endokrinen Therapie seit der letzten Dokumentation' :
                                                   'Fortführung der adjuvanten endokrinen Therapie';

            return buildObservation( doc, text, {
                V: translateEnum( 'DmpContinuationOfCurrentEndocrineTherapy_4_23_E', continuationOfCurrentEndocrineTherapy )
            } );
        }
        function dxaFindings_4_23( doc, context ) {
            const activity = context.activity;
            const dxaFindings = activity.dmpDxaFindings_4_23;

            return buildObservation( doc, 'Bei Patientinnen unter adjuvanter Therapie mit Aromataseinhibitoren, sofern die Absicht für eine spezifische medikamentöse Therapie einer Osteoporose besteht: DXA-Befund', {
                V: translateEnum( 'DmpDxaFindings_4_23_E', dxaFindings )
            } );
        }

        // Other findings ----------------------------------------------------------------------------------------------
        function plannedDateForNextDocumentation( doc, context ) {
            const
                activity = context.activity,
                nextDocumentation = activity.dmpPlannedDateForNextDocumentation;

            if( !nextDocumentation ) {
                return doc;
            } else {
                return buildDate( doc, 'Geplantes Datum der nächsten Dokumentationserstellung', {
                    V: formatDate(nextDocumentation)
                } );
            }
        }

        // FIRST and PNP ===================================================================================================
        // Registration ------------------------------------------------------------------------------------------------
        function initialManifestationOfPrimaryTumor( doc, context ) {
            const
                activity = context.activity,
                primary = activity.dmpInitialManifestationOfPrimaryTumor;

            if( !primary ) {
                return doc;
            } else {
                return buildDate( doc, 'Erstmanifestation des Primärtumors (Datum des histologischen Nachweises)', {
                    V: formatDate(primary)
                } );
            }
        }
        function manifestationOfContralateralBreastCancer( doc, context ) {
            const activity = context.activity;
            const contralateral = activity.dmpManifestationOfContralateralBreastCancer;

            if( !contralateral ) {
                return doc;
            } else {
                return buildDate( doc, 'Manifestation eines kontralateralen Brustkrebses (Datum des histologischen Nachweises)', {
                    V: formatDate(contralateral)
                } );
            }
        }
        function locoregionalRecurrence( doc, context ) {
            const activity = context.activity;
            const locoregional = activity.dmpLocoregionalRecurrence;

            if( !locoregional ) {
                return doc;
            } else {
                return buildDate( doc, 'Lokoregionäres Rezidiv (Datum des histologischen Nachweises)', {
                    V: formatDate(locoregional)
                } );
            }
        }
        function firstConfirmationOfRemoteMetastases( doc, context ) {
            const activity = context.activity;
            const remote = activity.dmpFirstConfirmationOfRemoteMetastases;

            if( !remote ) {
                return doc;
            } else {
                return buildDate( doc, 'Fernmetastasen erstmals gesichert', {
                    V: formatDate(remote)
                } );
            }
        }
        // 4.23 ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        function initialManifestationOfPrimaryTumor_4_23( doc, context ) {
            const activity = context.activity;
            const primary = activity.dmpInitialManifestationOfPrimaryTumor;

            return buildDate( doc, 'Primärtumor Datum der histologischen Sicherung', {
                V: formatDate(primary)
            } );
        }
        function manifestationOfContralateralBreastCancer_4_23( doc, context ) {
            const activity = context.activity;
            const contralateral = activity.dmpManifestationOfContralateralBreastCancer;

            return buildDate( doc, 'Kontralateraler Brustkrebs Datum der histologischen Sicherung', {
                V: formatDate(contralateral)
            } );
        }
        function locoregionalRecurrence_4_23( doc, context ) {
            const activity = context.activity;
            const locoregional = activity.dmpLocoregionalRecurrence;

            return buildDate( doc, 'Lokoregionäres Rezidiv Datum der histologischen Sicherung', {
                V: formatDate( locoregional )
            } );
        }
        function firstConfirmationOfRemoteMetastases_4_23( doc, context ) {
            const activity = context.activity;
            const remote = activity.dmpFirstConfirmationOfRemoteMetastases;

            return buildDate( doc, 'Fernmetastasen Datum der diagnostischen Sicherung von Fernmetastasen', {
                V: formatDate(remote)
            } );
        }
    // Registration For ------------------------------------------------------------------------------------------------
        // 4.23 ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        function registrationFor_4_23( doc, context ) {
            const activity = context.activity;
            const registrationFor = activity.dmpRegistrationFor;

            return buildObservation( doc, 'Einschreibung erfolgte wegen', {
                V: translateEnum( 'DmpRegistrationFor_E', registrationFor )
            } );
        }
    // Anamnesis and treatment status of the primary tumor / contralateral breast cancer -------------------------------
        function affectedBreast( doc, context ) {
            const
                activity = context.activity,
                affectedBreast = activity.dmpAffectedBreast;

            if( affectedBreast.length === 0 ) {
                return doc;
            } else {
                return buildObservation( doc, "Betroffene Brust", affectedBreast.map( v => {
                    return {
                        V: translateEnum( 'DmpAffectedBreast_E', v )
                    };
                } ) );
            }
        }
        function currentTreatmentStatus( doc, context ) {
            const
                activity = context.activity,
                status = activity.dmpCurrentTreatmentStatus;

            if( !status ) {
                return doc;
            } else {
                return buildObservation( doc, 'Aktueller Behandlungsstatus bezogen auf das operative Vorgehen', {
                    V: translateEnum( 'DmpCurrentTreatmentStatus_E', status )
                } );
            }
        }
        function performedSurgicalTherapy( doc, context ) {
            const
                activity = context.activity,
                surgicalTherapy = activity.dmpPerformedSurgicalTherapy;

            if( surgicalTherapy.length === 0 ) {
                return doc;
            } else {
                return buildObservation( doc, "Art der erfolgten operativen Therapie", surgicalTherapy.map( v => {
                    return {
                        V: translateEnum( 'DmpPerformedSurgicalTherapy_E', v )
                    };
                } ) );
            }
        }
        // 4.23 ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        function performedSurgicalTherapy_4_23( doc, context ) {
            const activity = context.activity;
            const surgicalTherapy = activity.dmpPerformedSurgicalTherapy_4_23;

            return buildObservation( doc, "Operative Therapie", surgicalTherapy.map( v => {
                return {
                    V: translateEnum( 'DmpPerformedSurgicalTherapy_4_23_E', v )
                };
            } ) );
        }


    // Current findings for the primary tumor / contralateral breast cancer ---------------------------------------––––-
        function preoperativeNeoadjuvantTherapy( doc, context ) {
            const
                activity = context.activity,
                neoadjuvantTherapy = activity.dmpPreoperativeNeoadjuvantTherapy;

            if( !neoadjuvantTherapy ) {
                return doc;
            } else {
                return buildObservation( doc, 'Präoperative/neoadjuvante Therapie', {
                    V: translateEnum( 'DmpPreoperativeNeoadjuvantTherapy_E', neoadjuvantTherapy )
                } );
            }
        }
        function pT( doc, context ) {
            const
                activity = context.activity,
                pT = activity.dmpPT;

            if( pT.length === 0 ) {
                return doc;
            } else {
                return buildObservation( doc, "pT", pT.map( v => {
                    return {
                        V: translateEnum( 'DmpPT_E', v )
                    };
                } ) );
            }
        }
        function pN( doc, context ) {
            const
                activity = context.activity,
                pN = activity.dmpPN;

            if( pN.length === 0 ) {
                return doc;
            } else {
                return buildObservation( doc, "pN", pN.map( v => {
                    return {
                        V: translateEnum( 'DmpPN_E', v )
                    };
                } ) );
            }
        }
        function m( doc, context ) {
            const
                activity = context.activity,
                m = activity.dmpM;

            if( !m ) {
                return doc;
            } else {
                return buildObservation( doc, 'M', {
                    V: translateEnum( 'DmpM_E', m )
                } );
            }
        }
        function grading( doc, context ) {
            const
                activity = context.activity,
                grading = activity.dmpGrading;

            if( !grading ) {
                return doc;
            } else {
                return buildObservation( doc, 'Grading', {
                    V: translateEnum( 'DmpGrading_E', grading )
                } );
            }
        }
        function resection( doc, context ) {
            const
                activity = context.activity,
                resection = activity.dmpResection;

            if( resection.length === 0 ) {
                return doc;
            } else {
                return buildObservation( doc, "Resektionsstatus", resection.map( v => {
                    return {
                        V: translateEnum( 'DmpResection_E', v )
                    };
                } ) );
            }
        }
        function immunohistochemicalHormoneReceptor( doc, context ) {
            const
                activity = context.activity,
                hormoneReceptor = activity.dmpImmunohistochemicalHormoneReceptor;

            if( !hormoneReceptor ) {
                return doc;
            } else {
                return buildObservation( doc, 'Immunhistochemischer Hormonrezeptorstatus (Östrogen und/oder Progesteron)', {
                    V: translateEnum( 'DmpImmunohistochemicalHormoneReceptor_E', hormoneReceptor )
                } );
            }
        }
        function HER2Neu( doc, context ) {
            const
                activity = context.activity,
                HER2Neu = activity.dmpHER2Neu;

            if( !HER2Neu ) {
                return doc;
            } else {
                return buildObservation( doc, 'HER2/neu-Status', {
                    V: translateEnum( 'DmpHER2Neu_E', HER2Neu )
                } );
            }
        }
        // 4.23 ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        function tnmClassification_4_23( doc, context ) {
            const activity = context.activity;
            const tnmClassification = activity.dmpTnmClassification_4_23;

            return buildObservation( doc, "TNM-Klassifizierung", {
                V: translateEnum( 'DmpTnmClassification_4_23_E', tnmClassification )
            } );
        }  function t_4_23( doc, context ) {
            const activity = context.activity;
            const pT = activity.dmpPT_4_23;

            return buildObservation( doc, "T", {
                V: translateEnum( 'DmpPT_4_23_E', pT )
            } );
        }
        function n_4_23( doc, context ) {
            const activity = context.activity;
            const pN = activity.dmpPN_4_23;

            return buildObservation( doc, "N", {
                V: translateEnum( 'DmpPN_4_23_E', pN )
            } );
        }
        function m_4_23( doc, context ) {
            const activity = context.activity;
            const m = activity.dmpM_4_23;

            return buildObservation( doc, 'M', {
                V: translateEnum( 'DmpM_4_23_E', m )
            } );
        }
        function immunohistochemicalHormoneReceptor_4_23( doc, context ) {
            const activity = context.activity;
            const immunohistochemicalHormoneReceptor = activity.dmpImmunohistochemicalHormoneReceptor_4_23;

            return buildObservation( doc, 'Hormonrezeptorstatus Östrogen und/oder Progesteron (gemäß Immunreaktiver Score [IRS])', {
                V: translateEnum( 'DmpImmunohistochemicalHormoneReceptor_4_23_E', immunohistochemicalHormoneReceptor )
            } );
        }
        // Findings and therapy of a locoregional recurrence -----------------------------------------------------------
        function ongoingOrCompletedTherapy_locoregionalRecurrence( doc, context ) {
            const
                activity = context.activity,
                therapy = activity.dmpOngoingOrCompletedTherapy_locoregionalRecurrence;

            if( therapy.length === 0 ) {
                return doc;
            } else {
                return buildObservation( doc, "Andauernde oder abgeschlossene Therapie", therapy.map( v => {
                    return {
                        V: translateEnum( 'DmpOngoingOrCompletedTherapy_locoregionalRecurrence_E', v )
                    };
                } ) );
            }
        }

    // Findings and therapy of remote metastases -----------------------------------------------------------------------
        function localisation ( doc, context ) {
            const
                activity = context.activity,
                localisation = activity.dmpLocalisation;

            if( localisation.length === 0 ) {
                return doc;
            } else {
                return buildObservation( doc, "Lokalisation", localisation.map( v => {
                    return {
                        V: translateEnum( 'DmpLocalisation_E', v )
                    };
                } ) );
            }
        }
        function ongoingOrCompletedTherapy_remoteMetastases ( doc, context ) {
            const
                activity = context.activity,
                therapy = activity.dmpOngoingOrCompletedTherapy_remoteMetastases;

            if( therapy.length === 0 ) {
                return doc;
            } else {
                return buildObservation( doc, "Andauernde oder abgeschlossene Therapie", therapy.map( v => {
                    return {
                        V: translateEnum( 'DmpOngoingOrCompletedTherapy_remoteMetastases_E', v )
                    };
                } ) );
            }
        }
        function bisphosophonateTherapy ( doc, context ) {
            const
                activity = context.activity,
                bisphosphonateTherapy = activity.dmpBisphosphonateTherapy;

            if( bisphosphonateTherapy.length === 0 ) {
                return doc;
            } else {
                return buildObservation( doc, "Bisphosphonat-Therapie bei Knochenmetastasen", bisphosphonateTherapy.map( v => {
                    return {
                        V: translateEnum( 'DmpBisphosphonateTherapy_E', v )
                    };
                } ) );
            }
        }
        // 4.23 ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        function localisation_4_23 ( doc, context ) {
            const activity = context.activity;
            const localisation = activity.dmpLocalisation_4_23;


            return buildObservation( doc, "Lokalisation von Fernmetastasen", localisation.map( v => ({
                    V: translateEnum( 'DmpLocalisation_4_23_E', v )
            }) ) );
        }
        function bisphosophonateTherapy_4_23 ( doc, context ) {
            const activity = context.activity;
            const bisphosphonateTherapy = activity.dmpBisphosphonateTherapy;


            return buildObservation( doc, "Therapie bei Knochenmetastasen (Bisphosphonate)", bisphosphonateTherapy.map( v => ({
                    V: translateEnum( 'DmpBisphosphonateTherapy_E', v )
            }) ) );
        }
        function denosumab_4_23 ( doc, context ) {
            const activity = context.activity;
            const denosumab = activity.dmpDenosumab_4_23;


            return buildObservation( doc, "Therapie bei Knochenmetastasen (Denosumab)", denosumab.map( v => ({
                    V: translateEnum( 'DmpDenosumab_4_23_E', v )
            }) ) );
        }
    // Other findings --------------------------------------------------------------------------------------------------
        function lymphedemaPresent( doc, context ) {
            const
                activity = context.activity,
                lymphedema = activity.dmpLymphedemaPresent;

            if( !lymphedema ) {
                return doc;
            } else {
                return buildObservation( doc, 'Lymphödem vorhanden', {
                    V: translateEnum( 'DmpLymphedemaPresent_E', lymphedema )
                } );
            }
        }
        // 4.23 ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        function symptomaticLymphedema_4_23( doc, context ) {
            const activity = context.activity;
            const lymphedema = activity.dmpSymptomaticLymphedema_4_23;

            return buildObservation( doc, 'Symptomatisches Lymphödem', {
                V: translateEnum( 'DmpSymptomaticLymphedema_4_23_E', lymphedema )
            } );

        }
        function regularPhysicalTrainingRecommended_4_23( doc, context ) {
            const activity = context.activity;
            const regularPhysicalTrainingRecommended = activity.dmpRegularPhysicalTrainingRecommended_4_23;

            return buildObservation( doc, 'Empfehlung zu regelmäßigem körperlichen Training abgegeben', {
                V: translateEnum( 'DmpRegularPhysicalTrainingRecommended_4_23_E', regularPhysicalTrainingRecommended )
            } );

        }
        function conditionAfterParticularlyCardiotoxicTumorTherapy_4_23( doc, context ) {
            const activity = context.activity;
            const conditionAfterParticularlyCardiotoxicTumorTherapy = activity.dmpConditionAfterParticularlyCardiotoxicTumorTherapy_4_23;

            return buildObservation( doc, 'Z. n. besonders kardiotoxischer Tumortherapie', conditionAfterParticularlyCardiotoxicTumorTherapy.map( v => ({
                V: translateEnum( 'DmpConditionAfterParticularlyCardiotoxicTumorTherapy_4_23_E', v )
            }) ) );
        }
        function height_BK_4_23( doc, context ) {
            const activity = context.activity;
            const height = activity.dmpHeight;

            return buildObservation( doc, 'Körpergröße', {
                V: meterNumbertoCentimetermString( height ),
                U: 'cm'
            }, VALUE_RESULT_TYPE );
        }
        function weight_BK_4_23( doc, context ) {
            const activity = context.activity;
            let weight = activity.dmpWeight;

            weight = String( Math.round( weight ) );
            while( weight.length < 3 ) {
                weight = `0${weight}`;
            }

            return buildObservation( doc, 'Körpergewicht', {
                V: weight,
                U: 'kg'
            }, VALUE_RESULT_TYPE );

        }


// FOLLOWING ===========================================================================================================
    // Registration  ---------------------------------------------------------------------------------------------------
        function registrationFor( doc, context ) {
            const
                activity = context.activity,
                registrationFor = activity.dmpRegistrationFor;


            return buildObservation( doc, 'Einschreibung erfolgte wegen', {
                V: translateEnum( 'DmpRegistrationFor_E', registrationFor )
            } );
        }

    // Events since the last documentation -----------------------------------------------------------------------------
        function manifestationOfLocoregionalRecurrence_following( doc, context ) {
            const
                activity = context.activity,
                locoregional_date = activity.dmpManifestationOfLocoregionalRecurrence_following_date,
                locoregional_text = activity.dmpManifestationOfLocoregionalRecurrence_following_text;

            if (locoregional_date) {
                return buildDate( doc, 'Manifestation eines lokoregionären Rezidivs (Datum des histologischen Nachweises)', {
                    V: formatDate(locoregional_date)
                } );
            } else if (locoregional_text) {
                return buildObservation( doc, 'Manifestation eines lokoregionären Rezidivs (Datum des histologischen Nachweises)',  locoregional_text.map( v => {
                    return {
                        V: translateEnum( 'DmpManifestationOfLocoregionalRecurrence_following_text_E', v )
                    };
                } ) );
            }
        }
        function manifestationOfContralateralBreastCancer_following( doc, context ) {
            const
                activity = context.activity,
                contralateral_date = activity.dmpManifestationOfContralateralBreastCancer_following_date,
                contralateral_text = activity.dmpManifestationOfContralateralBreastCancer_following_text;

            if (contralateral_date) {
                return buildDate( doc, 'Manifestation eines kontralateralen Brustkrebses (Datum des histologischen Nachweises)', {
                    V: formatDate(contralateral_date)
                } );
            } else if (contralateral_text) {
                return buildObservation( doc, 'Manifestation eines kontralateralen Brustkrebses (Datum des histologischen Nachweises)',  contralateral_text.map( v => {
                    return {
                        V: translateEnum( 'DmpManifestationOfContralateralBreastCancer_following_text_E', v )
                    };
                } ) );
            }
        }
        function manifestationOfRemoteMetastases_following( doc, context ) {
            const
                activity = context.activity,
                remote_date = activity.dmpManifestationOfRemoteMetastases_following_date,
                remote_text = activity.dmpManifestationOfRemoteMetastases_following_text;

            if (remote_date) {
                return buildDateObservation( doc, 'Manifestation von Fernmetastasen (Datum der Diagnosesicherung)', {
                    V: formatDate(remote_date)
                }, remote_text.map( v => {
                    return {
                        V: translateEnum( 'DmpManifestationOfRemoteMetastases_following_text_E', v )
                    };
                }) );
            } else if (remote_text.includes("NO")) {
                return buildObservation( doc, 'Manifestation von Fernmetastasen (Datum der Diagnosesicherung)',  remote_text.map( v => {
                    return {
                        V: translateEnum( 'DmpManifestationOfRemoteMetastases_following_text_E', v )
                    };
                } ) );
            }
        }
        function lymphedema_following( doc, context ) {
            const
                activity = context.activity,
                lymphedema = activity.dmpLymphedema_following;

            return buildObservation( doc, 'Lymphödem', {
                V: translateEnum( 'DmpLymphedema_following_E', lymphedema )
            } );
        }
        // 4.23 ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        function manifestationOfLocoregionalRecurrence_following_4_23( doc, context ) {
            const activity = context.activity;
            const locoregional_date = activity.dmpManifestationOfLocoregionalRecurrence_following_date;
            const locoregional_text = activity.dmpManifestationOfLocoregionalRecurrence_following_text;

            if( locoregional_date ) {

                return buildDateObservation( doc, 'Lokoregionäres Rezidiv (Datum der histologischen Sicherung)', {
                    V: formatDate( locoregional_date )
                }, locoregional_text.map( v => ({
                    V: translateEnum( 'DmpManifestationOfLocoregionalRecurrence_following_text_E', v )
                }) ) );
            } else {
                return buildObservation( doc, 'Lokoregionäres Rezidiv (Datum der histologischen Sicherung)', locoregional_text.map( v => ({
                    V: translateEnum( 'DmpManifestationOfLocoregionalRecurrence_following_text_E', v )
                }) ) );
            }
        }
        function manifestationOfContralateralBreastCancer_following_4_23( doc, context ) {
            const activity = context.activity;
            const contralateral_date = activity.dmpManifestationOfContralateralBreastCancer_following_date;
            const contralateral_text = activity.dmpManifestationOfContralateralBreastCancer_following_text;

            if( contralateral_date ) {
                return buildDateObservation( doc, 'Kontralateraler Brustkrebs (Datum der histologischen Sicherung)', {
                    V: formatDate( contralateral_date )
                }, contralateral_text.map( v => ({
                    V: translateEnum( 'DmpManifestationOfContralateralBreastCancer_following_text_E', v )
                }) ) );
            } else {
                return buildObservation( doc, 'Kontralateraler Brustkrebs (Datum der histologischen Sicherung)', contralateral_text.map( v => ({
                    V: translateEnum( 'DmpManifestationOfContralateralBreastCancer_following_text_E', v )
                }) ) );
            }
        }
        function manifestationOfRemoteMetastases_following_4_23( doc, context ) {
            const activity = context.activity;
            const remote_date = activity.dmpManifestationOfRemoteMetastases_following_date;
            const remote_text = activity.dmpManifestationOfRemoteMetastases_following_text_4_23;

            if( remote_date ) {
                return buildDateObservation( doc, 'Lokalisation von Fernmetastasen (Datum der diagnostischen Sicherung)', {
                    V: formatDate( remote_date )
                }, remote_text.map( v => ({
                    V: translateEnum( 'DmpManifestationOfRemoteMetastases_following_text_4_23_E', v )
                }) ) );
            } else {
                return buildObservation( doc, 'Lokalisation von Fernmetastasen (Datum der diagnostischen Sicherung)', remote_text.map( v => ({
                    V: translateEnum( 'DmpManifestationOfRemoteMetastases_following_text_4_23_E', v )
                }) ) );
            }
        }
        function biopticConfirmationOfVisceralMetastases_4_23( doc, context ) {
            const activity = context.activity;
            const biopticConfirmationOfVisceralMetastases = activity.dmpBiopticConfirmationOfVisceralMetastases_4_23;

            return buildObservation( doc, 'Bioptische Sicherung der viszeralen Metastasen', {
                V: translateEnum( 'DmpBiopticConfirmationOfVisceralMetastases_4_23', biopticConfirmationOfVisceralMetastases )
            } );

        }

        // Treatment of advanced disease (locoregional recurrence / remote metastases) ---------------------------------
        function currentTreatmentStatus_following ( doc, context ) {
            const
                activity = context.activity,
                status = activity.dmpCurrentTreatmentStatus_following;

            return buildObservation( doc, "Aktueller Behandlungsstatus", status.map( v => {
                return {
                    V: translateEnum( 'DmpCurrentTreatmentStatus_following_E', v )
                };
            } ) );
        }
        function therapyOfLocoregionalRecurrence ( doc, context ) {
            const
                activity = context.activity,
                therapyOfLocoregional = activity.dmpTherapyOfLocoregionalRecurrence;

            return buildObservation( doc, "Seit der letzten Dokumentation andauernde oder abgeschlossene Therapie des lokoregionären Rezidivs", therapyOfLocoregional.map( v => {
                return {
                    V: translateEnum( 'DmpTherapyOfLocoregionalRecurrence_E', v )
                };
            } ) );
        }
        function therapyOfRemoteMetastases ( doc, context ) {
            const
                activity = context.activity,
                therapyOfRemote = activity.dmpTherapyOfRemoteMetastases;

            return buildObservation( doc, "Seit der letzten Dokumentation andauernde oder abgeschlossene Therapie der Fernmetastasen", therapyOfRemote.map( v => {
                return {
                    V: translateEnum( 'DmpTherapyOfRemoteMetastases_E', v )
                };
            } ) );
        }
        function bisphosophonateTherapy_following ( doc, context ) {
            const
                activity = context.activity,
                bisphosphonateTherapy = activity.dmpBisphosphonateTherapy_following;
            if( bisphosphonateTherapy.length === 0 ) {
                return doc;
            } else {
                return buildObservation( doc, "Bisphosphonat-Therapie bei Knochenmetastasen", bisphosphonateTherapy.map( v => {
                    return {
                        V: translateEnum( 'DmpBisphosphonateTherapy_following_E', v )
                    };
                } ) );
            }

        }





        // IDX FILE
        ///////////

        function idxStartHeader( doc ) {
            return doc
                .dec( {
                    encoding: 'ISO-8859-15'
                } )
                .ele( 'bgl:begleitdatei', {
                    'xmlns:bgl': 'http://www.kbv.de/ns/meta/2003-05-15',
                    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
                } );
        }

        function idxCreationDate( doc, context ) {
            let dateStr = context.dateOfCreation.format( dateFormat );
            return doc.ele( 'bgl:erstellungsdatum-datei', {
                V: dateStr
            } ).up();
        }

        function idxAddresseeIK( doc, context ) {
            const delivery = context.delivery;
            if( Y.doccirrus.schemas.edmpdelivery.getAddresseeSchema( delivery.addresseeIk ) === 'IK' ) {
                return doc.ele( 'bgl:empfaenger' ).ele( 'bgl:datenstelle', {
                    EX: delivery.addresseeIk,
                    RT: 'Institutskennzeichen'
                } ).up().up();
            } else {
                return doc.ele( 'bgl:empfaenger' ).ele( 'bgl:ukv', {
                    EX: delivery.addresseeIk,
                    RT: 'UKV-Nummer'
                } ).up().up();
            }
        }

        function idxSenderBSNR( doc, context ) {
            const delivery = context.delivery;
            if( !delivery.commercialNo || delivery.institutionCode ) {
                return doc;
            }
            return doc.ele( 'bgl:absender' ).ele( 'bgl:arzt', {
                EX: delivery.commercialNo,
                RT: 'BSNR'
            } ).up().up();
        }

        function idxSenderIK( doc, context ) {
            const delivery = context.delivery;
            if( !delivery.institutionCode ) {
                return doc;
            }
            return doc.ele( 'bgl:absender' ).ele( 'bgl:krankenhaus', {
                EX: delivery.institutionCode,
                RT: 'Krankenhaus-IK'
            } ).up().up();
        }

        function idxCompressSoftware( doc ) {
            return doc.ele( 'bgl:komprimierungssoftware' )
                .ele( 'bgl:software-name', {
                    V: 'Info-ZIP'
                } ).up()
                .ele( 'bgl:software-version', {
                    V: '3.0'
                } ).up()
                .ele( 'bgl:software-hersteller', {
                    V: 'Info-ZIP Group'
                } ).up()
                .ele( 'bgl:software-link', {
                    V: 'http://info-zip.org/'
                } ).up().up();
        }

        function idxEncryptSoftware( doc ) {
            return doc.ele( 'bgl:verschluesselungssoftware' )
                .ele( 'bgl:software-name', {
                    V: 'XKM'
                } ).up()
                .ele( 'bgl:software-version', {
                    V: Y.doccirrus.xkm.TOOL_VERSIONS.XKM
                } ).up()
                .ele( 'bgl:software-hersteller', {
                    V: 'KBV'
                } ).up().up();
        }

        function idxArchives( doc, context ) {
            const
                content = context.content,
                delivery = context.delivery,
                date = moment( delivery.quarter + '/' + delivery.year, 'Q/YYYY' );

            return doc.ele( 'bgl:archive' )
                .ele( 'bgl:archiv' )
                .ele( 'bgl:name', {V: content.encryptedArchiveFileName} ).up()
                .ele( 'bgl:verzeichnis' )
                .ele( 'bgl:pfad', {V: getArchivePathByActType( content.actType )} ).up()
                .ele( 'bgl:zeitraum' )
                .ele( 'bgl:von', {V: date.clone().startOf( 'quarter' ).format( dateFormat )} ).up()
                .ele( 'bgl:bis', {V: date.endOf( 'quarter' ).format( dateFormat )} ).up()
                .up()
                .up()
                .up().up();
        }

        function buildDocXml( context ) {
            return convert( context, edmpDocProcessConfig );
        }

        function buildIndexFile( context ) {
            return convert( context, edmpIdxProcessConfig );
        }

        Y.namespace( 'doccirrus' ).edmpFileBuilder = {
            name: NAME,
            buildDocXml: buildDocXml,
            buildIndexFile: buildIndexFile
        };
    },
    '0.0.1', {
        requires: [
            'dcmongodb',
            'patient-schema',
            'edmp-utils',
            'edmp-bk-utils',
            'dccommonutils',
            'xkm',
            'edoc-converter'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'activity-schema',
            // 'dc-comctl',
            // 'edmpdelivery-schema',
            // 'edoc-utils'
        ]
    }
);

