/*global YUI*/
YUI.add( 'v_treatment_ch-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Treatment type activities vary according to the contract (SCHEIN) they belong to. They can be either Private or Public and this reflects which catalog is used when a code is supplied. Currently the REST interface requires the user to supply the matching 'catalogShort' field."
                }
            },
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VTreatment_T",
                        "lib": types
                    }
                },
                "VTreatment_T": {
                    "Base": {
                        "complex": "ext",
                        "type": "Treatment_T",
                        "lib": "activity"
                    },
                    "vat": {
                        "type": "Number",
                        "-en": 'VAT',
                        "-de": 'Ust.'
                    },
                    "actType": {
                        "type": "String",
                        "default": "TREATMENT"
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "catalogBase": {
                        "complex": "ext",
                        "type": "Catalog_T",
                        "lib": "activity"
                    },
                    "baseTreatment": {
                        "complex": "ext",
                        "type": "BaseTreatment_T",
                        "lib": "activity"
                    },
                    "priceBase": {
                        "complex": "ext",
                        "type": "Price_T",
                        "lib": "activity"
                    },
                    "treatmentCh": {
                        "complex": "ext",
                        "type": "Treatment_CH_T",
                        "lib": "activity"
                    },
                    "numberOfCopies": {
                        "required": false,
                        "type": "Number",
                        "validate": "ActivityDataItem_T_count",
                        i18n: i18n( 'activity-schema.Treatment_T.numberOfCopies.i18n' ),
                        "default": 1,
                        "apiv": { v: 2, queryParam: false },
                        "-en": "Number of copies to make",
                        "-de": "Anzahl"
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            ramlConfig: ramlConfig,

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
