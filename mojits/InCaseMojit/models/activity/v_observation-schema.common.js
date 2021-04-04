/**
 * User: pi
 * Date: 18/01/2016  11:55
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_observation-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

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
                        "type": "VObservation_T",
                        "lib": types
                    }
                },
                "ObservationActType_E": {
                    "type": "String",
                    "default": "OBSERVATION",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "OBSERVATION",
                            "-de": "Beobachtung",
                            i18n: i18n( 'activity-schema.Activity_E.OBSERVATION' ),
                            "-en": "Observation"
                        }
                    ]
                },
                "VObservation_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "ObservationActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "Observation_T",
                        "lib": "activity"
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'activity-schema'
        ]
    }
);
