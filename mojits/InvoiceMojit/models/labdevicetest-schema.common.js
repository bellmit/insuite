/**
 * User: rrrw
 * Date: 18/3/2018  10:55
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'labdevicetest-schema', function( Y, NAME ) {
        /**
         * The labdevicetest entry schema,
         *
         * @module labdevicetest-schema,  schema for the test ID and whether they are certified.
         *
         * Future: we will assist the user in picking the code, but for now we do not have
         * it in the system the user ha to look it up themselves.
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "LabDeviceTest_T",
                        "lib": types
                    }
                },
                "LabDeviceTest_T": {
                    "locationId": {
                        "required": true,
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        "ref": "location",
                        "refType": "ObjectId",
                        "future": "foreignkey.Location_T",
                        i18n: i18n( 'activity-schema.Activity_T.locationId.i18n' ),
                        "-en": "locationId",
                        "-de": "locationId"
                    },
                    "testId": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        "required": true,
                        "validate": "LabDeviceTest_T_testId",
                        i18n: i18n( 'labdevicetest-schema.LabDeviceTest_T.testId' ),
                        "-en": "Test Id",
                        "-de": "Analyt Id."
                    },
                    "isCertified": {
                        "complex": "eq",
                        "apiv": { v: 2, queryParam: true },
                        "required": true,
                        "type": "IsCertified_E",
                        "lib": types
                    }
                },
            "IsCertified_E": {
                "type": "String",
                "apiv": { v: 2, queryParam: true },
                i18n: i18n( 'labdevicetest-schema.isCertified_E.isCertified' ),
                "-en": "Is Certified",
                "-de": "RV-Zertifikat",
                "list": [
                    {
                        val: "0",
                        i18n: i18n( 'labdevicetest-schema.isCertified_E.no' ),
                        "-en": "N",
                        "-de": "Nein"
                    },
                    {
                        val: "1",
                        i18n: i18n( 'labdevicetest-schema.isCertified_E.yes' ),
                        "-en": "Y",
                        "-de": "Ja"
                    },
                    {
                        val: "2",
                        i18n: i18n( 'labdevicetest-schema.isCertified_E.unitUse' ),
                        "-en": "UU",
                        "-de": "pnSD/UU"
                    }
                ]
            }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'invoicelog-schema',
            'dcvalidations'
        ]
    }
);
