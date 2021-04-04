/**
 * User: pi
 * Date: 15/01/2015  15:05
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_medication-schema', function( Y, NAME ) {

        'use strict';

        /**
         * @method getLastSymbol
         * @private
         *
         * cast input value to String and get last symbol
         *
         * @param {Any} val
         *
         * @returns {String} last character of string representation of input value or empty string
         */
        function getLastSymbol( val ){
            if( !val ){
                return '';
            }
            var strVal = val.toString();
            return strVal.substr( strVal.length -1 , 1);
        }

        function skipOTC( med, context ) {
            var patientAge = context.patientAge,
                hasPatientAge = patientAge && patientAge !== 0,
                lastSymbolOfPatientAge = getLastSymbol( patientAge ),
                isUnder12 = lastSymbolOfPatientAge === 'T' || lastSymbolOfPatientAge === 'D' || lastSymbolOfPatientAge === 'W' || lastSymbolOfPatientAge === 'M'
                            || ( ( lastSymbolOfPatientAge === 'J' || lastSymbolOfPatientAge === 'Y') && Number( patientAge.replace(/[YJ]$/, '')) < 12 )
                            || patientAge < 12,
                isUnder22 = patientAge < 22,
                isContraceptive = med.phContraceptive;

            if( hasPatientAge &&
                isUnder12 ||
                (isUnder22 && isContraceptive) ) {
                return true;
            }

            return false;
        }

        var
            // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Collection of available medications via REST /2. <br><br>" +
                                 "The endpoint exposes special POST methods <ul>" +
                                 "<li>Get all medications linked to a specific contract. " +
                                 "It requires to hand over a patientId. " +
                                 "Other query parameters are free to choose. E.g.<br>" +
                                 "<pre>/2/medication/:getActivitiesLinkedToContract <br>" +
                                 "POST { patientId:\"5dfd3210b832a21249999234\", _id:\"5afd4c40b83294c249999999\" }</pre></li>" +
                                 "</ul>"
                }
            },
            i18n = Y.doccirrus.i18n,
            types = {},
            catalogShort = 'MMI',
            actType = 'MEDICATION',
            // MOJ-14319: [OK]
            prescriptionValidators = [
                {
                    name: 'NO_THERAPY_APPROPRIATE_PACKAGE_SIZE',
                    prescriptions: ['PRIVPRESCR'],
                    insuranceTypes: [ 'PUBLIC', 'PUBLIC_A' ],
                    advice: true,
                    stop: true,
                    validate: function( med ) {
                        return med.phNormSize === '0';
                    }
                },
                {
                    name: 'OTC',
                    prescriptions: [ 'PRIVPRESCR', 'PRESCRG' ],
                    insuranceTypes: [ 'PUBLIC', 'PUBLIC_A' ],
                    advice: true,
                    validate: function( med, context ) {
                        if( skipOTC( med, context ) ) {
                            return false;
                        }
                        // do not ignore OTC and its a contraceptive,
                        // i.e. Person aged over 22.  Must be a PRIVPRESCR
                        if( med.phContraceptive ) {
                            return true;
                        }
                        return med.phOTC && !(med.phMed && med.phPrescMed);
                    }
                },
                {
                    name: 'NEGATIVE',
                    prescriptions: [ 'PRIVPRESCR', 'PRESCRG' ],
                    insuranceTypes: [ 'PUBLIC', 'PUBLIC_A' ],
                    advice: true,
                    validate: function( med ) {
                        return med.phNegative;
                    }
                },
                {
                    name: 'LIFESTYLE',
                    prescriptions: [ 'PRIVPRESCR' ],
                    insuranceTypes: [ 'PUBLIC', 'PUBLIC_A' ],
                    advice: true,
                    validate: function( med ) {
                        return med.phLifeStyle;
                    }
                },
                {
                    name: 'BTM',
                    prescriptions: [ 'PRESCRBTM' ],
                    insuranceTypes: [ 'PUBLIC', 'PUBLIC_A', 'PRIVATE', 'PRIVATE_A', 'SELFPAYER', 'BG' ],
                    advice: true,
                    validate: function( med ) {
                        return med.phBTM;
                    }
                },
                {
                    name: 'TERATOGEN',
                    prescriptions: [ 'PRESCRT' ],
                    insuranceTypes: [ 'PUBLIC', 'PUBLIC_A', 'PRIVATE', 'PRIVATE_A', 'SELFPAYER', 'BG' ],
                    advice: true,
                    validate: function( med ) {
                        return med.phTer;
                    }
                },
                {
                    name: 'NOTPRESCRIBABLEMED',
                    prescriptions: [ 'PRIVPRESCR' ],
                    insuranceTypes: [ 'PUBLIC', 'PUBLIC_A' ],
                    advice: true,
                    validate: function( med ) {
                        return med.phMed && !med.phPrescMed;
                    }
                },
                {
                    name: 'AMR3',
                    prescriptions: [ 'PRIVPRESCR' ],
                    insuranceTypes: [ 'PUBLIC', 'PUBLIC_A' ],
                    advice: true,
                    validate: function( med ) {
                        const isExclusion = (med.phAMRContent || []).some( function(amr){
                            return amr.text && (amr.text.indexOf( 'Verordnungsausschluss' ) !== -1);
                        } );
                        return med.phAMR && -1 !== med.phAMR.indexOf( 'amr3' ) && isExclusion;
                    }
                },
                {
                    name: 'OTX',
                    prescriptions: [ 'PUBPRESCR' ],
                    insuranceTypes: [ 'PUBLIC', 'PUBLIC_A' ],
                    validate: function( med ) {
                        return med.phOTX;
                    }
                },
                {
                    name: 'PH_ONLY_NOT_OTX',
                    prescriptions: ['PRIVPRESCR', 'PRESCRG'],
                    insuranceTypes: [ 'PUBLIC', 'PUBLIC_A' ],
                    advice: true,
                    validate: function( med, context ) {
                        if( skipOTC( med, context ) ) {
                            return false;
                        }
                        return med.phOnly && !med.phRecipeOnly && !med.phOTX;
                    }
                },
                {
                    name: 'CONDLIFESTYLE',
                    prescriptions: [ 'PUBPRESCR' ],
                    insuranceTypes: [ 'PUBLIC', 'PUBLIC_A' ],
                    advice: true,
                    validate: function( med ) {
                        return med.phLifeStyleCond;
                    }
                },
                {
                    name: 'PRESCRIBABLEMED',
                    prescriptions: [ 'PUBPRESCR' ],
                    insuranceTypes: [ 'PUBLIC', 'PUBLIC_A' ],
                    advice: true,
                    validate: function( med ) {
                        return med.phMed && med.phPrescMed;
                    }
                }
            ];

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * MOJ-5065 this is a virtual schema and
         * does not actually have a collection related
         * to it in the DB.
         */
        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VMedication_T",
                        "lib": types
                    }
                },
                "MedicationActType_E": {
                    "type": "String",
                    "default": actType,
                    "apiv": { v: 2, queryParam: true },
                    "list": [
                        {
                            "val": actType,
                            "-de": "Medikament",
                            i18n: i18n( 'activity-schema.Activity_E.MEDICATION' ),
                            "-en": "Medication"
                        }

                    ]
                },
                "VMedication_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "MedicationActType_E",
                        "lib": types,
                        "apiv": { v: 2, queryParam: false },
                        "required": true
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "Medication_T",
                        "lib": "activity"
                    },
                    "catalogBase": {
                        "complex": "ext",
                        "type": "Catalog_T",
                        "lib": "activity"
                    }
                }
            }
        );

        function getPrescriptionTypeForMed( params ) {
            var
                medication = params.medication,
                insuranceType = params.insuranceType,
                patientAge = params.patientAge,
                result = [];

            function check( validator ) {
                if( -1 !== validator.insuranceTypes.indexOf( insuranceType ) && validator.validate( medication, {patientAge: patientAge} ) ) {
                    result.push( {
                        name: validator.name,
                        prescriptions: validator.prescriptions,
                        advice: validator.advice
                    } );
                    return Boolean( validator.stop );
                }
                return false;
            }

            // MOJ-11293: always recommend or preselect public prescription form in bg case folders
            if( insuranceType === 'BG' ) {
                return [
                    {
                        name: insuranceType,
                        prescriptions: ['PUBPRESCR']
                    }
                ];
            }

            prescriptionValidators.some( check );

            if( !result.length ) {
                result.push( {
                    name: insuranceType,
                    // MOJ-14319: [OK]
                    prescriptions: [(Y.doccirrus.schemas.patient.isPublicInsurance( {type: insuranceType} ) ? 'PUBPRESCR' : 'PRIVPRESCR')]
                } );
            }

            return result;
        }

        function getPrescriptionRecommendation( params ) {
            var
                bgRecommendation = ['PUBPRESCR'],
                medications = params.medications,
                insuranceType = params.insuranceType,
                patientAge = params.patientAge,
                recommendations = [],
                stopped = false,
                passed,
                advice = false,
                results = [];

            function getMedicationRecommendationObject( med, recommendations ) {
                return {
                    _id: med._id,
                    name: med.phNLabel || med.content || med.code,
                    recommendations: recommendations
                };
            }

            function collectRecommendationsForMed( med ) {
                var result = Y.doccirrus.schemas.v_medication.getPrescriptionTypeForMed( {
                    medication: med,
                    insuranceType: insuranceType,
                    patientAge: patientAge
                } );

                return getMedicationRecommendationObject( med, result );
            }

            function iteratePrescriptions( presc ) {
                if( -1 !== recommendations.indexOf( presc ) ) {
                    passed.push( presc );
                }
            }

            function iterateRecommendations( recommendation ) {
                if( recommendation.advice ) {
                    advice = true;
                }
                if( stopped ) {
                    return;
                }
                if( !recommendations.length ) {
                    Array.prototype.push.apply( recommendations, recommendation.prescriptions );
                    return;
                }
                passed = [];
                recommendation.prescriptions.forEach( iteratePrescriptions );
                if( !passed.length ) {
                    stopped = true;
                } else {
                    recommendations = passed;
                }
            }

            function iterateResults( result ) {
                result.recommendations.forEach( iterateRecommendations );
            }

            // MOJ-11293: always recommend or preselect public prescription form in bg case folders
            if( 'BG' === insuranceType ) {
                return {
                    recommendations: bgRecommendation,
                    rejected: false,
                    advice: false,
                    results: medications.map( function( med ) {
                        return getMedicationRecommendationObject( med, bgRecommendation );
                    } )
                };
            }

            medications.forEach( function( medication ) {
                results.push( collectRecommendationsForMed( medication ) );
            } );

            results.forEach( iterateResults );

            return {
                recommendations: stopped ? [] : recommendations,
                rejected: stopped,
                advice: advice,
                results: results
            };
        }

        function mapSalesSatusCode( salesStatusCode ) {
            var phSalesStatus;
            switch( salesStatusCode ) {
                case 'D':
                    phSalesStatus = 'DISCONTINUE';
                    break;
                case 'F':
                    phSalesStatus = 'OFFMARKET';
                    break;
                case 'N':
                    phSalesStatus = 'ONMARKET';
                    break;
                case 'R':
                    phSalesStatus = 'RECALL';
                    break;
                case 'Z':
                    phSalesStatus = 'OFFTAKE';
                    break;
            }

            return phSalesStatus;
        }

        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            ramlConfig: ramlConfig,

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,
            catalogShort: catalogShort,
            actType: actType,
            prescriptionValidators: prescriptionValidators,
            getPrescriptionTypeForMed: getPrescriptionTypeForMed,
            getPrescriptionRecommendation: getPrescriptionRecommendation,
            mapSalesSatusCode: mapSalesSatusCode

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'activity-schema'
        ]
    }
);
