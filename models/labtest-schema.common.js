/**
 * User: pi
 * Date: 15/12/2016  11:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'labtest-schema', function( Y, NAME ) {
        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n;


        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                "root": {
                    'base': {
                        'complex': 'ext',
                        'type': 'LabTest_T',
                        'lib': types
                    }
                },
                'LabTest_T': {
                    head: {
                        type: "String",
                        i18n: i18n('labtest-schema.LabTest_T.head.i18n'),
                        validate: "LabTest_T_head"
                    },
                    testLabel: {
                        type: "String",
                        i18n: i18n('labtest-schema.LabTest_T.testLabel.i18n')
                    },
                    sampleId: {
                        type: "String",
                        i18n: i18n('labtest-schema.LabTest_T.sampleId.i18n')
                    },
                    testResultVal: {
                        type: "String",
                        i18n: i18n('labtest-schema.LabTest_T.testResultVal.i18n'),
                        validate: "LabTest_T_testResultValOrSampleResultText"
                    },
                    TestResultUnit: {
                        type: "String",
                        i18n: i18n('labtest-schema.LabTest_T.TestResultUnit.i18n')
                    },
                    sampleResultText: {
                        type: ["String"],
                        validate: "LabTest_T_testResultValOrSampleResultText",
                        i18n: i18n('labtest-schema.LabTest_T.sampleResultText.i18n')
                    },
                    sampleTestNotes: {
                        type: ["String"],
                        i18n: i18n('labtest-schema.LabTest_T.sampleTestNotes.i18n')
                    },
                    sampleNormalValueText: {
                        type: ["String"],
                        // "default": [],
                        i18n: i18n('labtest-schema.LabTest_T.sampleNormalValueText.i18n')
                    },
                    testResultLimitIndicator: {
                        type: "String",
                        i18n: i18n('labtest-schema.LabTest_T.testResultLimitIndicator.i18n')
                    },
                    userGenerated: {
                        "type": "boolean",
                        i18n: 'userGenerated',
                        "-en": "userGenerated",
                        "-de": "userGenerated"
                    }
                }

            }
        );

        /**
         * Class REST Schemas
         */
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
            'dcvalidations'
        ]
    }
);
