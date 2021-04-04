/*global YUI */

'use strict';

YUI.add( 'mirrorpatient-schema', function( Y, NAME ) {
        /**
         * The DC Patient data schema definition
         *
         * @module DCPatient
         */

        var
            // ------- Schema definitions  -------
            types = {};

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Patient_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": "patient"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            indexes: [
                {
                    key: {
                        "firstname": 1
                    }
                },
                {
                    key: {
                        "lastname": 1
                    }
                }
            ],

            name: NAME

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'oop',
            'dcschemaloader',
            'doccirrus',
            'dccommonutils',
            'person-schema',
            'media-schema',
            'marker-schema',
            'employee-schema',
            'casefolder-schema',
            'severity-schema'
        ]
    }
);
