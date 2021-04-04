/*
 *  Copyright DocCirrus GmbH 2019
 *
 *  Extensions to InCase_T schema for Swiss country mode
 */

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-InCase-CH-T',

    /* Module code */
    function( Y ) {
        'use strict';

        /**
         *  If using Swiss mode, extend InCase_T reduced schema with fields for swiss country mode.
         */

        if( !Y.dcforms ) {
            Y.dcforms = {};
        }
        if( !Y.dcforms.schema ) {
            Y.dcforms.schema = {};
        }

        var
            swissModeFields = {
                "locGLN": {
                    "type": "String",
                    "insight2": true,
                    "model": "location",
                    "insuite_t": true,
                    "label": {
                        "en": "practice GLN",
                        "de": "Praxis GLN",
                        "de-ch": "Praxis GLN"
                    }
                },
                "physicianGLN": {
                    "type": "String",
                    "insight2": true,
                    "model": "physician",
                    "insuite_t": true,
                    "label": {
                        "en": "physician GLN",
                        "de": "Zuweiser GLN",
                        "de-ch": "Zuweiser GLN"
                    }
                },
                "qualiDignitiesText": {
                    "type": "String",
                    "insight2": true,
                    "model": "employee",
                    "label": {
                        "en": "Qualitative dignities",
                        "de": "Qualitative Dignitäten",
                        "de-ch": "Qualitative Dignitäten"
                    }
                },
                "quantiDignitiesText": {
                    "type": "String",
                    "insight2": true,
                    "model": "employee",
                    "label": {
                        "en": "Quantitative dignities",
                        "de": "Quantitative Dignitäten",
                        "de-ch": "Quantitative Dignitäten"
                    }
                },
                "insuranceGLN": {
                    "type": "String",
                    "insight2": true,
                    "label": {
                        "en": "Insurance GLN",
                        "de": "Versicherung GLN",
                        "de-ch": "Versicherung GLN"
                    }
                },
                "insuranceMediport": {
                    "type": "String",
                    "insight2": true,
                    "label": {
                        "en": "Insurance Mediport",
                        "de": "Versicherung Mediport",
                        "de-ch": "Versicherung Mediport"
                    }
                },
                "recipientGLN": {
                    "type": "String",
                    "insight2": true,
                    "label": {
                        "en": "Recipient GLN",
                        "de": "Empfänger GLN",
                        "de-ch": "Empfänger GLN"
                    }
                },
                "cantonCode": {
                    "required": true,
                    "type": "String",
                    "insight2": true,
                    "model": "location",
                    "insuite_t": true,
                    "label": {
                        "en": "practice canton",
                        "de": "Praxiskanton",
                        "de-ch": "Praxiskanton"
                    }
                },
                "locCantonCode": {
                    "required": true,
                    "type": "String",
                    "insight2": true,
                    "model": "location",
                    "insuite_t": true,
                    "label": {
                        "en": "practice canton",
                        "de": "Praxiskanton",
                        "de-ch": "Praxiskanton"
                    }
                },
                "zsrNumber": {
                    "required": true,
                    "type": "String",
                    "insight2": true,
                    "model": "location",
                    "insuite_t": true,
                    "label": {
                        "de-ch": "ZSR-Nummer",
                        "de": "ZSR-Nummer",
                        "en": "ZSR-Nummer"
                    }
                },
                "familyDoctorModel": {
                    "required": true,
                    "type": "String",
                    "insight2": true,
                    "model": "patient",
                    "label": {
                        "de-ch": "Hausarztmodell",
                        "de": "Hausarztmodell",
                        "en": "Family doctor model"
                    }
                },
                "medicalTaxPoints": {
                    "insight2": true,
                    "schema": "activity",
                    "path": "medicalTaxPoints",
                    "type": "Number",
                    "label": {
                        "en": "Medical service",
                        "de": "Ärztliche Leistung (AL)",
                        "de-ch": "Ärztliche Leistung (AL)"
                    }
                },
                "technicalTaxPoints": {
                    "insight2": true,
                    "model": "activity",
                    "type": "Number",
                    "label": {
                        "en": "Technical service",
                        "de": "Technische Leistung (TL)",
                        "de-ch": "Technische Leistung (TL)"
                    }
                },
                "assistanceTaxPoints": {
                    "insight2": true,
                    "schema": "activity",
                    "path": "assistanceTaxPoints",
                    "type": "Number",
                    "label": {
                        "en": "Assitance",
                        "de": "Assistenz",
                        "de-ch": "Assistenz"
                    }
                },
                "medicalScalingFactor": {
                    "insight2": true,
                    "schema": "activity",
                    "path": "assistanceTaxPoints",
                    "type": "Number",
                    "label": {
                        "en": "Medical scaling factor",
                        "de": "Medizinischer Skalierungsfaktor",
                        "de-ch": "Medizinischer Skalierungsfaktor"
                    }
                },
                "technicalScalingFactor": {
                    "insight2": true,
                    "schema": "activity",
                    "path": "technicalScalingFactor",
                    "type": "Number",
                    "label": {
                        "en": "Technical sclaling factor",
                        "de": "Technischer Skalierungsfaktor",
                        "de-ch": "Technischer Skalierungsfaktor"
                    }
                },
                "taxPointValue": {
                    "insight2": true,
                    "schema": "activity",
                    "path": "taxPointValue",
                    "type": "Number",
                    "label": {
                        "en": "Tarmed Tax Point Value",
                        "de": "Tarmed Taxpunktwerte",
                        "de-ch": "Tarmed Taxpunktwerte"
                    }
                },
                "tiers": {
                    "type": "String",
                    "insight2": true,
                    "model": "activity",
                    "schema": "activity",
                    "label": {
                        "en": "Case, Tiers",
                        "de": "Fall, Tiers",
                        "de-ch": "Fall, Tiers"
                    }
                },
                "employeeGLN": {
                    "type": "String",
                    "insight2": true,
                    "model": "employee",
                    "label": {
                        "en": "Employee GLN",
                        "de": "Mitarbeiter GLN",
                        "de-ch": "Mitarbeiter GLN"
                    }
                },
                "dataTransmissionToMediportApproved": {
                    "type": "String",
                    "insight2": true,
                    "model": "patient",
                    "label": {
                        "en": "Mediport data transmission approved",
                        "de": "Mediport Datenübermittlung zugestimmt",
                        "de-ch": "Mediport Datenübermittlung zugestimmt"
                    },
                    "description": {
                        "en": "Patient, Mediport data transmission approved",
                        "de": "Patient, Mediport Datenübermittlung zugestimmt",
                        "de-ch": "Patient, Mediport Datenübermittlung zugestimmt"
                    }
                },
                "tiersInsurance": {
                    "type": "String",
                    "insight2": true,
                    "model": "patient",
                    "label": {
                        "en": "Patient, Tiers",
                        "de": "Patient, Tiers",
                        "de-ch": "Patient, Tiers"
                    }
                },
                "vekaCardNo": {
                    "type": "String",
                    "insight2": true,
                    "model": "patient",
                    "label": {
                        "en": "Insured person number",
                        "de": "Veka-Nr.",
                        "de-ch": "Veka-Nr."
                    }
                }
            },

            k;

        //  on the server, these fields cannot be defined immediately, we need to wait for the config to be loaded
        //  called by formtemplate-api runOnStart

        function init() {
            var hasSwissMode = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

            if( !hasSwissMode ) {
                return;
            }

            //  Add to inCase_T, already defined

            for( k in swissModeFields ) {
                if( swissModeFields.hasOwnProperty( k ) ) {
                    Y.dcforms.schema.InCase_T[k] = swissModeFields[k];
                }
            }
        }

        Y.dcforms.initInCase_CH_T = init;
        if( Y.doccirrus.commonutils.isClientSide() ) {
            init();
        }
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: ['dcforms-schema-InCase-T', 'dcforms-utils']
    }
);