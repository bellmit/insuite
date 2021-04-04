/*global YUI */
YUI.add( 'upcomingedmpdoc-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The UpcomingEdmpDoc_T entry schema,
         *
         * stores information about upcoming documentations the doctor needs to make.
         *
         *
         * @module 'upcomingedmpdoc-schema'
         */

        var types = {},
            i18n = Y.doccirrus.i18n;

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "UpcomingEdmpDoc_T",
                        "lib": types
                    }
                },
                "UpcomingEdmpDoc_T": {
                    "locationId": {
                        "type": "String",
                        "-en": "Location",
                        "-de": "Betriebsstätte"
                    },
                    "patientId": {
                        "type": "String",
                        i18n: i18n( 'upcomingedmpdoc-schema.UpcomingEdmpDoc_T.patientId.i18n' ),
                        "-en": "Patient ID",
                        "-de": "Patient ID"
                    },
                    "patientFirstname": {
                        "type": "String",
                        i18n: i18n( 'upcomingedmpdoc-schema.UpcomingEdmpDoc_T.patientFirstname.i18n' ),
                        "-en": "Firstname",
                        "-de": "Vorname"
                    },
                    "patientLastname": {
                        "type": "String",
                        i18n: i18n( 'upcomingedmpdoc-schema.UpcomingEdmpDoc_T.patientLastname.i18n' ),
                        "-en": "Lastname",
                        "-de": "Nachname"
                    },
                    "patientDob": {
                        "type": "Date",
                        i18n: i18n( 'upcomingedmpdoc-schema.UpcomingEdmpDoc_T.patientDob.i18n' ),
                        "-en": "Date of Birth",
                        "-de": "Geburtsdatum"
                    },
                    "patientNo": {
                        "type": "String",
                        i18n: i18n( 'upcomingedmpdoc-schema.UpcomingEdmpDoc_T.patientNo.i18n' ),
                        "-en": "Patient No.",
                        "-de": "Patienten Nr."
                    },
                    "type": {
                        "type": "String",
                        i18n: i18n( 'upcomingedmpdoc-schema.UpcomingEdmpDoc_T.type.i18n' ),
                        "-en": "eDMP Type",
                        "-de": "eDMP Typ"
                    },
                    "quarter": {
                        "type": "Number",
                        i18n: i18n( 'upcomingedmpdoc-schema.UpcomingEdmpDoc_T.quarter.i18n' ),
                        "-en": "Quarter",
                        "-de": "Quartal"
                    },
                    "year": {
                        "type": "Number",
                        i18n: i18n( 'upcomingedmpdoc-schema.UpcomingEdmpDoc_T.year.i18n' ),
                        "-en": "Year",
                        "-de": "Jahr"
                    },
                    "interval": {
                        "type": "String",
                        i18n: i18n( 'upcomingedmpdoc-schema.UpcomingEdmpDoc_T.interval.i18n' ),
                        "-en": "Interval",
                        "-de": "Interval"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [],
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations'
        ]
    }
);
