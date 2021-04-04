/**
 * User: pi
 * Date: 03/09/2014  15:13
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'catalogusage-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module DCCatalog
         */

        var

        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n;

        types = Y.mix( types, {
                "root": {
                    "locationId": {
                        "type": "String",
                        i18n: i18n( 'catalogusage-schema.root.locationId' ),
                        "-en": "locationId",
                        "-de": "locationId"
                    },
                    "seqId": {
                        "complex": "eq",
                        "type": "Id_T",
                        "lib": types
                    },
                    "base2": {
                        "complex": "ext",
                        "type": "DefaultCat_T",
                        "lib": "catalog"
                    },
                    "count": {
                        "type": "Number",
                        i18n: i18n( 'catalogusage-schema.root.count' ),
                        "-en": "Usage count",
                        "-de": "Nutzungen"
                    },
                    "u_extra": {
                        "type": "Mixed",
                        i18n: i18n( 'catalogusage-schema.root.u_extra' ),
                        "-en": "special",
                        "-de": "special"
                    },
                    "explanations": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'catalogusage-schema.root.explanations' ),
                        "-en": "Explanations",
                        "-de": "Erläuterungen"
                    },
                    "catalogShort": {
                        "type": "String",
                        i18n: i18n( 'catalogusage-schema.root.catalogShort' ),
                        "-en": "CatalogShort",
                        "-de": "CatalogShort"
                    },
                    "catalog": {
                        "type": "boolean",
                        i18n: i18n( 'catalogusage-schema.root.catalog' ),
                        "-en": "catalog",
                        "-de": "catalog"
                    },
                    "catalogRef": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'catalogusage-schema.root.catalogRef' ),
                        "-en": "catalogRef",
                        "-de": "catalogRef"
                    },
                    "billingFactorValue": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'catalogusage-schema.root.billingFactorValue' ),
                        "-en": "billingFactorValue",
                        "-de": "billingFactorValue"
                    },
                    "billingFactorType": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.Treatment_T.billingFactorType.i18n' ),
                        "-en": "billing factor type",
                        "-de": "Rechnungsfaktortyp"
                    },
                    "base3": {
                        "complex": "ext",
                        "type": "Medication_T",
                        "lib": "activity"
                    },
                    "base4": {
                        "complex": "ext",
                        "type": "Assistive_T",
                        "lib": "activity"
                    },
                    "base5": {
                        "complex": "ext",
                        "type": "SDDA_T",
                        "lib": "catalog"
                    },
                    "base6": {
                        "complex": "ext",
                        "type": "KBVInsurance_T",
                        "lib": "catalog"
                    },
                    "base7": {
                        "complex": "ext",
                        "type": "Treatment_T",
                        "lib": "activity"
                    },
                    "tags": {
                        "type": ["String"],
                        i18n: i18n( 'catalogusage-schema.root.tags' ),
                        "-en": "tags",
                        "-de": "tags"
                    }
                },
                "Id_T": {
                    "actType": "String",
                    "seq": "String"
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            key: ["seqId"],

            //MOJ-1870: optimisation indexes essential for large collection
            indexes: [
                { key: {
                    "seq": 1
                } },
                { key: {
                    "unifiedSeq": 1
                } },
                { key: {
                    "locationId": 1
                } },
                { key: {
                    "catalogShort": 1
                } }
            ],

            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', { requires: ['dcvalidations', 'dcschemaloader', 'activity-schema'] }
);
