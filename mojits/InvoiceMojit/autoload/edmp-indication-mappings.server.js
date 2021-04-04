/**
 * User: do
 * Date: 20/04/16  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'edmp-indication-mappings', function( Y, NAME ) {

        // TODOOO add more parts / paths
        const
            ALL = ['DM1', 'DM2', 'KHK', 'ASTHMA', 'COPD'],
            DM = ['DM1', 'DM2'],
            DM1 = ['DM1'],
            DM2 = ['DM2'],
            DM_KHK = ['DM1', 'DM2', 'KHK'],
            KHK = ['KHK'],
            ASTHMA = ['ASTHMA'],
            COPD = ['COPD'],
            ASTHMA_COPD = ['ASTHMA', "COPD"],

            pathsToActTypesMap = {
                administrativeData: {
                    dmpHeight: ALL,
                    dmpWeight: ALL,
                    dmpSmoker: ALL,
                    dmpBloodPressureSystolic: ALL,
                    dmpBloodPressureDiastolic: ALL,
                    // TODOOO NOT SURE ABOUT THIS same path but different enums for all indications
                    // dmpConcomitantDisease: ALL,
                    dmpHbA1cValue: DM,
                    dmpHbA1cUnit: DM,
                    dmpPathoUrinAlbAus: DM,
                    dmpEGFR: DM,
                    dmpEGFRNotDetermined: DM,
                    dmpPulsStatus: DM,
                    dmpSensitivityTesting: DM,
                    // dmpFootStatusText: DM,
                    // dmpFootStatusWagnerValue: DM,
                    // dmpFootStatusArmstrongValue: DM,
                    dmpInjectionSites: DM,
                    dmpSequelae: DM,
                    dmpAnginaPectoris: KHK,
                    dmpSerumElectrolytes: KHK,
                    dmpLdlCholesterolValue: KHK,
                    dmpLdlCholesterolUnit: KHK,
                    dmpLdlCholesterolNotDetermined: KHK,
                    dmpFrequencyOfAsthmaSymptoms: ASTHMA,
                    dmpCurrentPeakFlowValue: ASTHMA,
                    dmpCurrentPeakFlowValueNotDone: ASTHMA,
                    dmpCurrentFev1: COPD,
                    dmpCurrentFev1NotDone: COPD
                },
                events: {
                    dmpEvents: DM,
                    dmpKhkRelevantEvents: KHK,
                    dmpDiagnosticCoronaryTherapeuticIntervention: KHK,
                    // Following Doc
                    dmpHadHypoglycaemic: DM,
                    dmpHadHospitalStayHbA1c: DM1,
                    dmpHadStationaryTreatment: DM,
                    dmpHadStationaryKhkTreatment: KHK,
                    dmpHadStationaryAsthmaTreatment: ASTHMA,
                    dmpFrequencyExacerbationsSinceLast: COPD,
                    dmpHadStationaryCopdTreatment: COPD
                },
                medications: {
                    dmpAntiplatelet: DM_KHK,
                    dmpBetaBlocker: DM_KHK,
                    dmpACE: DM_KHK,
                    dmpHMG: DM_KHK,
                    dmpTHIA: DM,
                    dmpInsulin: DM2,
                    dmpGlibenclamide: DM2,
                    dmpMetformin: DM2,
                    dmpOtherOralAntiDiabetic: DM2,
                    dmpKhkOtherMedication: KHK,
                    dmpInhaledGlucocorticosteroids: ASTHMA,
                    dmpInhaledLongActingBeta2AdrenergicAgonist: ASTHMA,
                    dmpInhaledRapidActingBeta2AdrenergicAgonist: ASTHMA,
                    dmpSystemicGlucocorticosteroids: ASTHMA,
                    dmpOtherAsthmaSpecificMedication: ASTHMA,
                    dmpCheckedInhalationTechnique: ASTHMA_COPD,
                    dmpShortActingBeta2AdrenergicAgonistAnticholinergics: COPD,
                    dmpLongActingBeta2AdrenergicAgonist: COPD,
                    dmpLongActingAnticholinergics: COPD,
                    dmpOtherDiseaseSpecificMedication: COPD
                },
                trainings: {
                    dmpRecommendedDmTrainings: DM,
                    dmpRecommendedKhkTrainings: KHK,
                    dmpRecommendedAsthmaTrainings: ASTHMA,
                    dmpRecommendedCopdTrainings: COPD,
                    // Following Doc
                    dmpPerceivedDiabetesTraining: DM_KHK,
                    dmpPerceivedHypertensionTraining: DM_KHK,
                    dmpPerceivedAsthmaTraining: ASTHMA,
                    dmpPerceivedCopdTraining: COPD
                },
                treatmentPlan: {
                    dmpPatientWantsInfos: ALL,
                    // DOES NOT MAKE ANY SENSE TO SYNC?
                    //dmpDocumentationInterval: ALL,
                    dmpHbA1cTargetValue: DM,
                    dmpTreatmentAtDiabeticFootInstitution: DM,
                    dmpDiabetesRelatedHospitalization: DM,
                    dmpKhkRelatedTransferArranged: KHK,
                    dmpKhkRelatedConfinementArranged: KHK,
                    dmpRegularWeightControlRecommended: KHK,
                    dmpWrittenSelfManagementPlan: ASTHMA,
                    dmpAsthmaRelatedTransferOrConfinementArranged: ASTHMA,
                    dmpCopdRelatedTransferOrConfinementArranged: COPD,
                    // Following Doc
                    dmpOpthRetinalExam: DM
                }
            };

        function getMapping( part ) {
            if( !part ) {
                return pathsToActTypesMap;
            }

            return pathsToActTypesMap[part];
        }

        function getPathsToSync( actType ) {

            let result = [];

            Object.keys( pathsToActTypesMap ).forEach( key => {
                let map = pathsToActTypesMap[key];
                Object.keys( map ).forEach( path => {
                    let actTypes = map[path],
                        filteredActTypes = actTypes.filter( aType => aType !== actType );
                    if( -1 !== actTypes.indexOf( actType ) && 0 < filteredActTypes.length ) {
                        result.push( {
                            path: path,
                            actTypes: filteredActTypes
                        } );
                    }
                } );
            } );

            return result;
        }

        // jus t a stub until dc-core array handling is fixed
        function checkIfConcurrentIndicationPathsAreModified( activity ) {
            if( !activity ) {
                Y.log( 'no activitiy passed to checkIfConcurrentIndicationPathsAreModified', 'warn', NAME );
                return false;
            }
            const
                paths = getPathsToSync( activity.actType ),
                isModified = paths.some( pathObj => activity.isModified( pathObj.path ) );
            return isModified;
        }

        Y.namespace( 'doccirrus' ).edmpIndicationMappings = {

            name: NAME,
            getMapping: getMapping,
            getPathsToSync: getPathsToSync,
            checkIfConcurrentIndicationPathsAreModified

        };
    },
    '0.0.1', {requires: ['dcmongodb']}
);

