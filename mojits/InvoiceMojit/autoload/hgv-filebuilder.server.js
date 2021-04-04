/**
 * User: do
 * Date: 09/11/17  13:54
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'hgv-filebuilder', function( Y, NAME ) {

        /**
         * @module hgv-filebuilder
         *
         */


        const
            moment = require( 'moment' ),
            edocConverter = Y.doccirrus.edocConverter,
            convert = edocConverter.convert,
            VALUE_RESULT_TYPE = 'value',
            formatDate = edocConverter.utils.formatDate,
            string = edocConverter.utils.s,
            buildDate = edocConverter.utils.buildDate,
            buildObservation = edocConverter.utils.buildObservation,
            translateEnum = edocConverter.utils.translateEnum,
            mapGender = edocConverter.utils.mapGender,

            startHeader = edocConverter.mapper.startHeader,
            software = edocConverter.mapper.software,
            endHeader = edocConverter.mapper.endHeader,
            startBody = edocConverter.mapper.startBody,
            openParagraph = edocConverter.mapper.openParagraph,
            closeParagraph = edocConverter.mapper.closeParagraph,

            hgvDocProcessConfig = [
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
                startBody,
                {
                    '$switch:activity.dmpType': {
                        FIRST: [
                            setup,
                            {
                                'Verordnung': [
                                    openParagraph( 'Vorverordnung' ),
                                    hearingAidFirstMedication,
                                    firstMedicationDate,
                                    hearingAidType,
                                    hearingAidTypeOther,
                                    centralAuditoryDefectExcluded,
                                    speakingTestPossible,
                                    speechComprehension,
                                    speechComprehensionMaterial,
                                    speechComprehensionMaterialOther,
                                    speechDevelopmentDisturbance,
                                    speechDevelopmentDisturbanceOther,
                                    closeParagraph,
                                    openParagraph( 'Verordnung' ),
                                    noiseReceptionAmblyacousia,
                                    noiseFlowAmblyacousia,
                                    combinedAmblyacousia,
                                    amblyacousiaSeverityLeft,
                                    amblyacousiaSeverityRight,
                                    amblyacousiaSeverityWHO,
                                    furtherDiagnosis,
                                    furtherDiagnosisOther,
                                    airline,
                                    airlineOther,
                                    boneline,
                                    specialMedication,
                                    specialMedicationOther,
                                    closeParagraph
                                ]
                            }
                        ],
                        FOLLOWING: [
                            setup,
                            {
                                'Nachverordnung': [
                                    {'$if:isChild': openParagraph( 'Nachsorge' )},
                                    {'$if:isAdult': openParagraph( 'Nachverordnung' )},
                                    medicationConform,
                                    airLineAnomaly,
                                    airLineAnomalyOther,
                                    boneLineAnomaly,
                                    specialMedicationAnomaly,
                                    specialMedicationAnomalyOther,
                                    hearingAidSuccessDetectable,
                                    speakingTestPossible,
                                    speechComprehensionFollowing,
                                    hearingAidSuccessMeasurementThrough,
                                    listeningRangeWithoutHG,
                                    listeningRangeWithHG,
                                    advantageWithHG,
                                    medicationForFree,
                                    medicationForFixedAmount,
                                    cooperation,
                                    closeParagraph
                                ]
                            }
                        ]
                    }

                }
            ]
        ;

        /**
         * setup vars
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} XML document.
         */

        function setup( doc, context ) {
            context.isChild = context.activity.dmpAge === 'CHILD';
            context.isAdult = context.activity.dmpAge === 'ADULT';

            return doc;
        }

        /**
         * builds dmpHearingAidFirstMedication xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function hearingAidFirstMedication( doc, context ) {
            const
                activity = context.activity,
                hearingAidFirstMedication = activity.dmpHearingAidFirstMedication;

            if( !hearingAidFirstMedication ) {
                return doc;
            } else {
                return buildObservation( doc, 'Hörgeräteerstversorgung', {
                    V: translateEnum( 'DmpHearingAidFirstMedication_E', hearingAidFirstMedication )
                }, VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds firstMedicationDate xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function firstMedicationDate( doc, context ) {

            const
                activity = context.activity,
                firstMedicationDate = activity.dmpFirstMedicationDate,
                hearingAidFirstMedication = activity.dmpHearingAidFirstMedication;

            if( !firstMedicationDate || hearingAidFirstMedication !== 'NO') {
                return doc;
            } else {
                return buildDate( doc, 'Wenn Vorversorgung, wann', {
                    V: formatDate( firstMedicationDate, 'YYYY' )
                } );
            }
        }

        /**
         * builds hearingAidType xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function hearingAidType( doc, context ) {
            const
                activity = context.activity,
                hearingAidType = activity.dmpHearingAidType;

            if( hearingAidType.length  < 1) {
                return doc;
            } else {
                return buildObservation( doc, 'Bauform', hearingAidType.map( v => {
                    return {
                        V: translateEnum( 'DmpHearingAidType_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds hearingAidTypeOther xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function hearingAidTypeOther( doc, context ) {
            const
                activity = context.activity,
                hearingAidType = activity.dmpHearingAidType,
                hearingAidTypeOther = activity.dmpHearingAidTypeOther;

            if( !hearingAidTypeOther || hearingAidType.indexOf('OTHER') === -1) {
                return doc;
            } else {
                return buildObservation( doc, 'Bauform andere', {
                    V: hearingAidTypeOther
                } );
            }
        }

        /**
         * builds centralAuditoryDefectExcluded xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function centralAuditoryDefectExcluded( doc, context ) {
            const
                activity = context.activity,
                centralAuditoryDefectExcluded = activity.dmpCentralAuditoryDefectExcluded;

            if( !centralAuditoryDefectExcluded ) {
                return doc;
            } else {
                return buildObservation( doc, 'Zentrale Hörstörung ausgeschlossen', {
                    V: translateEnum( 'DmpCentralAuditoryDefectExcluded_E', centralAuditoryDefectExcluded )
                }, VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds speechComprehension xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function speechComprehension( doc, context ) {
            const
                activity = context.activity,
                speakingTestPossible = activity.dmpSpeakingTestPossible,
                speechComprehensionDB = activity.dmpSpeechComprehensionDB,
                speechComprehensionEZ = activity.dmpSpeechComprehensionEZ,
                speechComprehensionSVS = activity.dmpSpeechComprehensionSVS;


            if( (!speechComprehensionDB && !speechComprehensionEZ && !speechComprehensionSVS) || speakingTestPossible !== 'YES') {
                return doc;
            } else {

                return buildObservation( doc, 'Sprachverstehen: mit Kopfhörer am dBopt', [
                    {
                        V: speechComprehensionDB,
                        U: 'dB'
                    },
                    {
                        V: speechComprehensionEZ,
                        U: '% (E/Z)'
                    },
                    {
                        V: speechComprehensionSVS,
                        U: 'dB (SVS)'
                    }
                ], VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds speechComprehensionMaterial xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function speechComprehensionMaterial( doc, context ) {
            const
                activity = context.activity,
                speechComprehensionMaterial = activity.dmpSpeechComprehensionMaterial;

            if( speechComprehensionMaterial.length  < 1 ) {
                return doc;
            } else {
                return buildObservation( doc, 'Sprachtestmaterial', speechComprehensionMaterial.map( v => {
                    return {
                        V: translateEnum( 'dmpSpeechComprehensionMaterial_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds speechComprehensionMaterialOther xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function speechComprehensionMaterialOther( doc, context ) {
            const
                activity = context.activity,
                speechComprehensionMaterial = activity.dmpSpeechComprehensionMaterial,
                speechComprehensionMaterialOther = activity.dmpSpeechComprehensionMaterialOther;

            if( !speechComprehensionMaterialOther ||speechComprehensionMaterial.indexOf('OTHER') === -1) {
                return doc;
            } else {
                return buildObservation( doc, 'Sprachtestmaterial anderes', {
                    V: speechComprehensionMaterialOther
                } );
            }

        }

        /**
         * builds speechDevelopmentDisturbance xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function speechDevelopmentDisturbance( doc, context ) {
            const
                activity = context.activity,
                speechDevelopmentDisturbance = activity.dmpSpeechDevelopmentDisturbance;

            if( !speechDevelopmentDisturbance ) {
                return doc;
            } else {
                return buildObservation( doc, 'Sprachentwicklungsstörung', {
                    V: translateEnum( 'DmpSpeechDevelopmentDisturbance_E', speechDevelopmentDisturbance )
                }, VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds speechDevelopmentDisturbanceOther xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function speechDevelopmentDisturbanceOther( doc, context ) {
            const
                activity = context.activity,
                speechDevelopmentDisturbance = activity.dmpSpeechDevelopmentDisturbance,
                speechDevelopmentDisturbanceOther = activity.dmpSpeechDevelopmentDisturbanceOther;

            if( !speechDevelopmentDisturbanceOther || speechDevelopmentDisturbance !== 'OTHER') {
                return doc;
            } else {
                return buildObservation( doc, 'Sprachentwicklungsstörung andere Ursache', {
                    V: speechDevelopmentDisturbanceOther
                } );
            }
        }

        /**
         * builds noiseReceptionAmblyacousia xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function noiseReceptionAmblyacousia( doc, context ) {
            const
                activity = context.activity,
                noiseReceptionAmblyacousia = activity.dmpNoiseReceptionAmblyacousia;

            if( noiseReceptionAmblyacousia.length  < 1 ) {
                return doc;
            } else {
                return buildObservation( doc, 'Schallempfindungsschwerhörigkeit', noiseReceptionAmblyacousia.map( v => {
                    return {
                        V: translateEnum( 'dmpNoiseReceptionAmblyacousia_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds noiseFlowAmblyacousia xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function noiseFlowAmblyacousia( doc, context ) {
            const
                activity = context.activity,
                noiseFlowAmblyacousia = activity.dmpNoiseFlowAmblyacousia;

            if( noiseFlowAmblyacousia.length  < 1 ) {
                return doc;
            } else {
                return buildObservation( doc, 'Schallleitungsschwerhörigkeit', noiseFlowAmblyacousia.map( v => {
                    return {
                        V: translateEnum( 'dmpNoiseFlowAmblyacousia_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds combinedAmblyacousia xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function combinedAmblyacousia( doc, context ) {
            const
                activity = context.activity,
                combinedAmblyacousia = activity.dmpCombinedAmblyacousia;

            if( combinedAmblyacousia.length  < 1 ) {
                return doc;
            } else {
                return buildObservation( doc, 'Kombinierte Schwerhörigkeit', combinedAmblyacousia.map( v => {
                    return {
                        V: translateEnum( 'dmpCombinedAmblyacousia_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds amblyacousiaSeverityLeft xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function amblyacousiaSeverityLeft( doc, context ) {
            const
                activity = context.activity,
                amblyacousiaSeverityLeft = context.isChild ? activity.dmpAmblyacousiaSeverityChildLeft : activity.dmpAmblyacousiaSeverityLeft,
                type = context.isChild ? 'dmpAmblyacousiaSeverityChild_E' : 'dmpAmblyacousiaSeverity_E';

            if( !amblyacousiaSeverityLeft ) {
                return doc;
            } else {
                return buildObservation( doc, 'Schweregrad der Hörstörung(WHO 2001): links', {
                    V: translateEnum( type, amblyacousiaSeverityLeft )
                }, VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds amblyacousiaSeverityRight xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function amblyacousiaSeverityRight( doc, context ) {
            const
                activity = context.activity,
                amblyacousiaSeverityRight = context.isChild ? activity.dmpAmblyacousiaSeverityChildRight : activity.dmpAmblyacousiaSeverityRight,
                type = context.isChild ? 'dmpAmblyacousiaSeverityChild_E' : 'dmpAmblyacousiaSeverity_E';

            if( !amblyacousiaSeverityRight ) {
                return doc;
            } else {
                return buildObservation( doc, 'Schweregrad der Hörstörung(WHO 2001): rechts', {
                    V: translateEnum( type, amblyacousiaSeverityRight )
                }, VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds amblyacousiaSeverityWHO xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function amblyacousiaSeverityWHO( doc, context ) {
            const
                activity = context.activity,
                amblyacousiaSeverityWHO = activity.dmpAmblyacousiaSeverityWHO;

            if( amblyacousiaSeverityWHO.length  < 1 ) {
                return doc;
            } else {
                return buildObservation( doc, 'Hörstörung > 80dB nach WHO 2001 tonaudiometrischer Mittelwert bei 0,5 / 1 / 2 / 4 kHz', amblyacousiaSeverityWHO.map( v => {
                    return {
                        V: translateEnum( 'dmpAmblyacousiaSeverityWHO_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds furtherDiagnosis xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function furtherDiagnosis( doc, context ) {
            const
                activity = context.activity,
                furtherDiagnosis = activity.dmpFurtherDiagnosis;

            if( furtherDiagnosis.length  < 1 ) {
                return doc;
            } else {
                return buildObservation( doc, 'Sonstige versorgungsrelevante Diagnosen',furtherDiagnosis.map( v => {
                    return {
                        V: translateEnum( 'dmpFurtherDiagnosis_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds furtherDiagnosisOther xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function furtherDiagnosisOther( doc, context ) {
            const
                activity = context.activity,
                furtherDiagnosis = activity.dmpFurtherDiagnosis,
                furtherDiagnosisOther = activity.dmpFurtherDiagnosisOther;

            if( !furtherDiagnosisOther ||furtherDiagnosis.indexOf('NO') === -1 ) {
                return doc;
            } else {
                return buildObservation( doc, 'Sonstige versorgungsrelevante Diagnosen andere', {
                    V: furtherDiagnosisOther
                } );
            }
        }

        /**
         * builds airline xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function airline( doc, context ) {
            const
                activity = context.activity,
                airline = activity.dmpAirLine,
                text = activity.dmpAge === 'ADULT' ? 'HNO-ärztlicher Vorschlag zur Gerätetechnik: Luftleitung' : 'Ärztlicher Vorschlag zur Gerätetechnik: Luftleitung';

            if( airline.length  < 1 ) {
                return doc;
            } else {
                return buildObservation( doc, text, airline.map( v => {
                    return {
                        V: translateEnum( 'dmpAirLine_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds airlineOther xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */
        function airlineOther( doc, context ) {
            const
                activity = context.activity,
                dmpAirLine = activity.dmpAirLine,
                dmpAirLineOther = activity.dmpAirLineOther;

            if( !dmpAirLineOther || !dmpAirLine.includes( 'OTHER' ) ) {
                return doc;
            } else {
                return buildObservation( doc, 'Ärztlicher Vorschlag zur Gerätetechnik: Luftleitung andere', {
                    V: dmpAirLineOther
                } );
            }
        }

        /**
         * builds boneline xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function boneline( doc, context ) {
            const
                activity = context.activity,
                boneline = activity.dmpBoneLine,
                text = activity.dmpAge === 'ADULT' ? 'HNO-ärztlicher Vorschlag zur Gerätetechnik: Knochenleitung' : 'Ärztlicher Vorschlag zur Gerätetechnik: Knochenleitung';

            if( boneline.length  < 1) {
                return doc;
            } else {
                return buildObservation( doc, text, boneline.map( v => {
                    return {
                        V: translateEnum( 'dmpBoneLine_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds specialMedication xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function specialMedication( doc, context ) {
            const
                activity = context.activity,
                specialMedication = activity.dmpSpecialMedication;

            if( specialMedication.length  < 1) {
                return doc;
            } else {
                return buildObservation( doc, 'HNO-ärztlicher Vorschlag zur Gerätetechnik: Sonderversorgung', specialMedication.map( v => {
                    return {
                        V: translateEnum( 'dmpSpecialMedication_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds specialMedicationOther xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function specialMedicationOther( doc, context ) {
            const
                activity = context.activity,
                specialMedication = activity.dmpSpecialMedication,
                specialMedicationOther = activity.dmpSpecialMedicationOther;

            if( !specialMedicationOther || specialMedication.indexOf('OTHER') === -1) {
                return doc;
            } else {
                return buildObservation( doc, 'HNO-ärztlicher Vorschlag zur Gerätetechnik: Sonderversorgung andere', {
                    V: specialMedicationOther
                } );
            }
        }

        /**
         * builds hearingAidSuccessDetectable xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function hearingAidSuccessDetectable( doc, context ) {
            const
                activity = context.activity,
                hearingAidSuccessDetectable = activity.dmpHearingAidSuccessDetectable;

            if( !hearingAidSuccessDetectable ) {
                return doc;
            } else {
                return buildObservation( doc, 'War der Hörgeräte-Versorgungserfolg ermittelbar', {
                    V: translateEnum( 'DmpHearingAidSuccessDetectable_E', hearingAidSuccessDetectable )
                }, VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds medicationConform xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function medicationConform( doc, context ) {
            const
                activity = context.activity,
                medicationConform = activity.dmpMedicationConform;

            if( !medicationConform)  {
                return doc;
            } else {
                return buildObservation( doc, 'Der Hörgeräteversorgungsvorschlag entspricht dem aufgestellten Versorgungskonzept', {
                    V: translateEnum( 'dmpMedicationConform_E', medicationConform )
                }, VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds airLineAnomaly xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function airLineAnomaly( doc, context ) {
            const
                activity = context.activity,
                airLineAnomaly = activity.dmpAirLineAnomaly;

            if( airLineAnomaly.length  < 1 ) {
                return doc;
            } else {
                return buildObservation( doc, 'Abweichung in Luftleitung', airLineAnomaly.map( v => {
                    return {
                        V: translateEnum( 'dmpAirLine_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds airlineOther xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */
        function airLineAnomalyOther( doc, context ) {
            const
                activity = context.activity,
                dmpAirLineAnomaly = activity.dmpAirLineAnomaly,
                dmpAirLineAnomalyOther = activity.dmpAirLineAnomalyOther;

            if( !dmpAirLineAnomalyOther || !dmpAirLineAnomaly.includes( 'OTHER' ) ) {
                return doc;
            } else {
                return buildObservation( doc, 'Abweichung in Luftleitung andere', {
                    V: dmpAirLineAnomalyOther
                } );
            }
        }

        /**
         * builds boneLineAnomaly xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function boneLineAnomaly( doc, context ) {
            const
                activity = context.activity,
                boneLineAnomaly = activity.dmpBoneLineAnomaly;

            if( boneLineAnomaly.length  < 1 ) {
                return doc;
            } else {
                return buildObservation( doc, 'Abweichung in Knochenleitung', boneLineAnomaly.map( v => {
                    return {
                        V: translateEnum( 'dmpBoneLine_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds specialMedicationAnomaly xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function specialMedicationAnomaly( doc, context ) {
            const
                activity = context.activity,
                specialMedicationAnomaly = activity.dmpSpecialMedicationAnomaly;

            if( specialMedicationAnomaly.length  < 1 ) {
                return doc;
            } else {
                return buildObservation( doc, 'Abweichung in Sonderversorgung', specialMedicationAnomaly.map( v => {
                    return {
                        V: translateEnum( 'dmpSpecialMedication_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds specialMedicationAnomalyOther xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function specialMedicationAnomalyOther( doc, context ) {
            const
                activity = context.activity,
                specialMedicationAnomaly = activity.dmpSpecialMedicationAnomaly,
                specialMedicationAnomalyOther = activity.dmpSpecialMedicationAnomalyOther;

            if( !specialMedicationAnomalyOther || specialMedicationAnomaly.indexOf('OTHER') === -1) {
                return doc;
            } else {
                return buildObservation( doc, 'Abweichung in Sonderversorgung andere', {
                    V: specialMedicationAnomalyOther
                } );
            }

        }

        /**
         * builds speakingTestPossible xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function speakingTestPossible (doc, context ) {
            const
                activity = context.activity,
                speakingTestPossible = activity.dmpSpeakingTestPossible || activity.dmpSpeakingTestPossible_following;

            if( !speakingTestPossible ) {
                return doc;
            } else {
                return buildObservation( doc, 'Sprachtest möglich', {
                    V: translateEnum( 'DmpSpeakingTestPossible_E', speakingTestPossible )
                }, VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds speechComprehensionFollowing xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function speechComprehensionFollowing (doc, context ) {

            const
                activity = context.activity,
                speakingTestPossible = activity.dmpSpeakingTestPossible_following,
                speechComprehensionFreeFieldEZ = activity.dmpSpeechComprehensionFreeFieldEZ,
                speechComprehensionFreeFieldSVS = activity.dmpSpeechComprehensionFreeFieldSVS;


            if( (!speechComprehensionFreeFieldEZ && !speechComprehensionFreeFieldSVS) || speakingTestPossible !== 'YES') {
                return doc;
            } else {
                return buildObservation( doc, 'Erzieltes Sprachverstehen im Freifeld mit Hörgerät(en)', [
                    {
                        V: speechComprehensionFreeFieldEZ,
                        U: '% (E/Z)'
                    },
                    {
                        V: speechComprehensionFreeFieldSVS,
                        U: 'dB (SVS)'
                    }
                ], VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds hearingAidSuccessMeasurementThrough xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function hearingAidSuccessMeasurementThrough (doc, context ) {
            const
                activity = context.activity,
                hearingAidSuccessMeasurementThrough = activity.dmpHearingAidSuccessMeasurementThrough;

            if( hearingAidSuccessMeasurementThrough.length  < 1 ) {
                return doc;
            } else {
                return buildObservation( doc, 'Hörgeräte-Versorgungserfolg ermittelt durch', hearingAidSuccessMeasurementThrough.map( v => {
                    return {
                        V: translateEnum( 'DmpHearingAidSuccessMeasurementThrough_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds medicationForFixedAmount xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function medicationForFixedAmount( doc, context ) {
            const
                activity = context.activity,
                medicationForFixedAmount = activity.dmpMedicationForFixedAmount;

            if( !medicationForFixedAmount ) {
                return doc;
            } else {
                return buildObservation( doc, 'Versorgung erfolgte zum Festbetrag', {
                    V: translateEnum( 'DmpMedicationForFixedAmount_E', medicationForFixedAmount )
                }, VALUE_RESULT_TYPE  );
            }
        }

        /**
         * builds cooperation xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function cooperation (doc, context ) {
            const
                activity = context.activity,
                cooperation = activity.dmpCooperation;

            if( cooperation.length  < 1 ) {
                return doc;
            } else {
                return buildObservation( doc, 'Kooperation erfolgt mit', cooperation.map( v => {
                    return {
                        V: translateEnum( 'DmpCooperation_E', v )
                    };
                } ), VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds medicationForFree xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function medicationForFree( doc, context ) {
            const
                activity = context.activity,
                medicationForFree = activity.dmpMedicationForFree;

            if( !medicationForFree ) {
                return doc;
            } else {
                return buildObservation( doc, 'Versorgung erfolgte zuzahlungsfrei', {
                    V: translateEnum( 'DmpMedicationForFree_E', medicationForFree )
                }, VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds listeningRangeWithoutHG xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function listeningRangeWithoutHG (doc, context ) {

            const
                activity = context.activity,
                speakingTestPossible = activity.dmpSpeakingTestPossible_following,
                listeningRangeWithoutHG = activity.dmpListeningRangeWithoutHG;

            if( !listeningRangeWithoutHG || speakingTestPossible !== 'NO') {
                return doc;
            } else {
                return buildObservation( doc, 'Keine FF-Untersuchung möglich: Hörweite (m) ohne HG', {
                    V: listeningRangeWithoutHG,
                    U: 'm'
                }, VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds listeningRangeWithHG xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function listeningRangeWithHG (doc, context ) {

            const
                activity = context.activity,
                speakingTestPossible = activity.dmpSpeakingTestPossible_following,
                listeningRangeWithHG = activity.dmpListeningRangeWithHG;

            if( !listeningRangeWithHG || speakingTestPossible !== 'NO') {
                return doc;
            } else {
                return buildObservation( doc, 'Keine FF-Untersuchung möglich: Hörweite (m) mit HG', {
                    V: listeningRangeWithHG,
                    U: 'm'
                }, VALUE_RESULT_TYPE );
            }

        }

        /**
         * builds advantageWithHG xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function advantageWithHG (doc, context ) {

            const
                activity = context.activity,
                advantageWithHG = activity.dmpAdvantageWithHG;

            if( !advantageWithHG ) {
                return doc;
            } else {
                return buildObservation( doc, 'Nutzen (Verbesserung der Hörfähigkeit) mittels APHAB-Fragebogen (vor / nach HG-Versorgung)', {
                    V: advantageWithHG,
                    U: '%'
                }, VALUE_RESULT_TYPE );
            }
        }

        /**
         * builds docInfo xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function docInfo( doc, context ) {
            const
                activity = context.activity,
                examDate = activity.dmpExaminationDate || activity.dmpExaminationDate_following,
                timestamp = activity.timestamp,
                locationNo = context.location.commercialNo,
                age = activity.dmpAge,
                type = activity.dmpType,
                docTypeDef = {};

            if(age === 'CHILD') {
                if(type === 'FIRST') {
                    docTypeDef.id = 'QSHGVK_VV';
                    docTypeDef.text = 'QS Hörgeräteversorgung Kinder Vorverordnung mit Verordnung';
                }
                else if(type === 'FOLLOWING'){
                    docTypeDef.id = 'QSHGVK_NG';
                    docTypeDef.text = 'QS Hörgeräteversorgung Kinder Nachsorge';
                }

            }
            else if(age === 'ADULT'){
                if(type === 'FIRST') {
                    docTypeDef.id = 'QSHGV_VV';
                    docTypeDef.text = 'QS Hörgeräteversorgung Vorverordnung mit Verordnung';
                }
                else if(type === 'FOLLOWING'){
                    docTypeDef.id = 'QSHGV_NV';
                    docTypeDef.text = 'QS Hörgeräteversorgung Nachverordnung';
                }
            }

            doc = doc
                .ele( 'clinical_document_header' )
                .ele( 'id', {
                    EX: activity._id.toString(),
                    RT: locationNo
                } ).up()
                .ele( 'set_id', {
                    EX: activity.dmpDocSetId,
                    RT: locationNo
                } ).up()
                .ele( 'version_nbr', {
                    V: 1
                } ).up()
                .ele( 'document_type_cd', {
                    V: docTypeDef && docTypeDef.id || '',
                    S: '1.2.276.0.76.5.100',
                    SN: 'KBV',
                    DN: docTypeDef && docTypeDef.text || ''
                } ).up()
                .ele( 'service_tmr', {
                    V: formatDate( examDate )
                } ).up()
                .ele( 'origination_dttm', {
                    V: formatDate( timestamp )
                } ).up();
            return doc;
        }

        /**
         * builds provider xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function provider( doc, context ) {

            const
                location = context.location,
                employee = context.employee;

            doc = doc.ele( 'provider' );

            doc = doc
                .ele( 'person' );

            if( employee.officialNo ) {
                doc = doc.ele( 'id', {
                    EX: string( employee.officialNo, '', 9 ),
                    RT: 'LANR'
                } ).up();
            }
            if( location.commercialNo ) {
                doc = doc.ele( 'id', {
                    EX: string( location.commercialNo, '', 9 ),
                    RT: 'BSNR'
                } ).up();
            }

            return doc.up().up();
        }

        /**
         * builds patient xml node
         *
         * @param {object} doc - XML document.
         * @param {object} context - activity context.
         * @return {object} new XML node.
         */

        function patient( doc, context ) {
            const
                location = context.location,
                patient = context.patient,
                dob = patient.dob;

            let birth_dttm = '';

            if( context.activity.dmpAge === 'ADULT' ) {
                birth_dttm = moment( dob ).format( 'YYYY' );
            }
            else if( context.activity.dmpAge === 'CHILD' ) {
                birth_dttm = moment( dob ).format( 'YYYY-MM' );
            }

            doc = doc
                .ele( 'patient' )
                .ele( 'person' )
                .ele( 'id', {
                    EX: string( patient.HGVPatientNo, '', 8 ),
                    RT: string( location.commercialNo, '', 9 )
                } ).up();

            doc = doc.up()
                .ele( 'birth_dttm', {
                    V: birth_dttm
                } ).up()
                .ele( 'administrative_gender_cd', {
                    V: mapGender( patient.gender, true )
                } ).up();

            return doc.up();
        }

        /**
         * builds xml document
         *
         * @return {object} contect.
         */

        function buildDocXml( context ) {
            return convert( context, hgvDocProcessConfig );
        }

        Y.namespace( 'doccirrus' ).hgvFileBuilder = {
            name: NAME,
            buildDocXml: buildDocXml
        };
    },
    '0.0.1', {requires: ['edoc-converter']}
);