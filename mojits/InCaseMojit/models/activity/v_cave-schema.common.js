/**
 * User: pi
 * Date: 05/08/16  13:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_cave-schema', function( Y, NAME ) {

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
                        "type": "VCave_T",
                        "lib": types
                    }
                },
                "CaveActType_E": {
                    "type": "String",
                    "default": "CAVE",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "group": "PROCESSES",
                            "val": "CAVE",
                            "-de": i18n( 'activity-schema.Activity_E.CAVE' ),
                            i18n: i18n( 'activity-schema.Activity_E.CAVE' ),
                            "-en": i18n( 'activity-schema.Activity_E.CAVE' )
                        }
                    ]
                },
                "VCave_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "CaveActType_E",
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
                        "type": "Cave_T",
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
