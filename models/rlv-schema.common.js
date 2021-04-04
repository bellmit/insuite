/**
 * User: do
 * Date: 06/08/15  11:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI */
YUI.add( 'rlv-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The Rlv_T entry schema,
         *
         * @module 'rlv-schema'
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Rlv_T",
                        "lib": types
                    }
                },
                "RlvStats_T": {
                    total: {
                        "type": "Number",
                        i18n: i18n( 'rlv-schema.RlvStats_T.total.i18n' ),
                        "-en": "total",
                        "-de": "total"
                    },
                    count: {
                        "type": "Number",
                        i18n: i18n( 'rlv-schema.RlvStats_T.count.i18n' ),
                        "-en": "count",
                        "-de": "count"
                    },
                    cases: {
                        "type": "Number",
                        i18n: i18n( 'rlv-schema.RlvStats_T.count.i18n' ),
                        "-en": "count",
                        "-de": "count"
                    }
                },
                "Rlv_T": {
                    "base": {
                        "complex": "ext",
                        "type": "RlvStats_T",
                        "lib": types
                    },
                    "quarter": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'rlv-schema.Rlv_T.quarter.i18n' ),
                        "-en": "Quarter",
                        "-de": "Quartal"
                    },
                    "year": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'rlv-schema.Rlv_T.year.i18n' ),
                        "-en": "Year",
                        "-de": "Jahr"
                    },
                    "employeeId": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'rlv-schema.Rlv_T.employeeId.i18n' ),
                        "-en": "employeeId",
                        "-de": "employeeId"
                    },
                    "locations": {
                        "complex": "inc",
                        "type": "RlvLocation_T",
                        "lib": types
                    }
                },
                "RlvLocation_T": {
                    "base": {
                        "complex": "ext",
                        "type": "RlvStats_T",
                        "lib": types
                    },
                    "locationId": {
                        "type": "String",
                        i18n: i18n( 'rlv-schema.RlvLocation_T.locationId.i18n' ),
                        "-en": "locationId",
                        "-de": "locationId"
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
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'dcauth'
        ]
    }
);
