/*global YUI */
'use strict';

YUI.add( 'symptom-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module DCSymptom - collection of symptoms
         */

        var

        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            ramlConfig = {
                "2": {
                    description: "The symptom collection holds all data relevant to a possible patient symptoms before and after AMTS check."
                }
            },
            defaultItems = [
                {"name":"SLEEP_DISORDER", "_id": "000000000000000000000011"},
                {"name":"ITCHING", "_id": "000000000000000000000012"},
                {"name":"BRUISES", "_id": "000000000000000000000013"},
                {"name":"NOSEBLEED", "_id": "000000000000000000000014"},
                {"name":"SWOLLEN_LEGS", "_id": "000000000000000000000015"},
                {"name":"HEART_DISORDER", "_id": "000000000000000000000016"},
                {"name":"BREATHING_DIFFICULTIES", "_id": "000000000000000000000017"},
                {"name":"DIARRHEA", "_id": "000000000000000000000018"},
                {"name":"CONSTIPATION", "_id": "000000000000000000000019"},
                {"name":"HEARTBURN", "_id": "00000000000000000000001a"},
                {"name":"VOMITING", "_id": "00000000000000000000001b"},
                {"name":"DYSPHAGIA", "_id": "00000000000000000000001c"},
                {"name":"FALLS", "_id": "00000000000000000000001d"},
                {"name":"DIZZINESS", "_id": "00000000000000000000001e"}
            ],
            types = {};

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Symptom_T",
                        "lib": types
                    }
                },
            "SymptomName_E": {
                "type": "String",
                "list": [
                    {
                        "val": "SLEEP_DISORDER",
                        i18n: i18n( 'symptom-schema.SymptomName_E.SLEEP_DISORDER' ),
                        "-en": "Sleep disorder",
                        "-de": "Schlafstörungen"
                    },
                    {
                        "val": "ITCHING",
                        i18n: i18n( 'symptom-schema.SymptomName_E.ITCHING' ),
                        "-en": "itching / rashes",
                        "-de": "Juckreiz/Hautausschlag"
                    },
                    {
                        "val": "BRUISES",
                        i18n: i18n( 'symptom-schema.SymptomName_E.BRUISES' ),
                        "-en": "bruises",
                        "-de": "Blaue Flecken"
                    },
                    {
                        "val": "NOSE_BLEED",
                        i18n: i18n( 'symptom-schema.SymptomName_E.NOSE_BLEED' ),
                        "-en": "nosebleed / gum bleeding",
                        "-de": "Nasenbluten/Zahnfleischbluten"
                    },
                    {
                        "val": "SWOLLEN_LEGS",
                        i18n: i18n( 'symptom-schema.SymptomName_E.SWOLLEN_LEGS' ),
                        "-en": "swollen legs",
                        "-de": "Geschwollene Beine"
                    },
                    {
                        "val": "HEART_DISORDER",
                        i18n: i18n( 'symptom-schema.SymptomName_E.HEART_DISORDER' ),
                        "-en": "heart disorder",
                        "-de": "Herzbeschwerden"
                    },
                    {
                        "val": "BREATHING_DIFFICULTIES",
                        i18n: i18n( 'symptom-schema.SymptomName_E.BREATHING_DIFFICULTIES' ),
                        "-en": "breathing difficulties",
                        "-de": "Atemprobleme"
                    },
                    {
                        "val": "DIARRHEA",
                        i18n: i18n( 'symptom-schema.SymptomName_E.DIARRHEA' ),
                        "-en": "diarrhea",
                        "-de": "Durchfall"
                    },
                    {
                        "val": "CONSTIPATION",
                        i18n: i18n( 'symptom-schema.SymptomName_E.CONSTIPATION' ),
                        "-en": "constipation",
                        "-de": "Verstopfung"
                    },
                    {
                        "val": "HEARTBURN",
                        i18n: i18n( 'symptom-schema.SymptomName_E.HEARTBURN' ),
                        "-en": "gastric disorder / heartburn",
                        "-de": "Magenbeschwerden/Sodbrennen"
                    },
                    {
                        "val": "VOMITING",
                        i18n: i18n( 'symptom-schema.SymptomName_E.VOMITING' ),
                        "-en": "nausea / vomiting",
                        "-de": "Übelkeit/Erbrechen"
                    },
                    {
                        "val": "DYSPHAGIA",
                        i18n: i18n( 'symptom-schema.SymptomName_E.DYSPHAGIA' ),
                        "-en": "loss of appetite / dysphagia",
                        "-de": "Appetitlosigkeit/Schluckbeschwerden"
                    },
                    {
                        "val": "FALLS",
                        i18n: i18n( 'symptom-schema.SymptomName_E.FALLS' ),
                        "-en": "falls",
                        "-de": "Sturz"
                    },
                    {
                        "val": "DIZZINESS",
                        i18n: i18n( 'symptom-schema.SymptomName_E.DIZZINESS' ),
                        "-en": "dizziness",
                        "-de": "Schwindel"
                    }
                ],
                i18n: i18n( 'symptomn-schema.SymptomName_E.i18n' ),
                "-en": "Symptom name",
                "-de": "Symptomname"
            },
                "Symptom_T": {
                    "name": {
                        "complex": "eq",
                        "type": "SymptomName_E",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            ramlConfig: ramlConfig,
            defaultItems: defaultItems,
            types: types,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader', 'doccirrus']
    }
);
