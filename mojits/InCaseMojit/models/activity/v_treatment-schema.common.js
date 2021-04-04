/**
 * User: rrrw
 * Date: 19/11/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_treatment-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Treatment type activities vary according to the contract (SCHEIN) they belong to. " +
                                 "They can be either Private or Public and this reflects which catalog is used when a code is supplied. " +
                                 "Currently the REST interface requires the user to supply the matching <code>catalogShort</code> field. <br><br>" +
                                 "When a POST request contains <code>catalogShort</code> and <code>code</code> all other catalog information will be added. " +
                                 "For this to work required parameters are <ul>" +
                                 "<li><code>patientId</code></li>" +
                                 "<li><code>employeeId</code></li>" +
                                 "<li><code>locationId</code></li>" +
                                 "<li><code>caseFolderId</code></li>" +
                                 "</ul>" +
                                 "Currently this works for EBM and GOÄ only." +
                                "The endpoint exposes special POST methods <ul>" +
                                "<li>Get all treatments linked to a specific contract. " +
                                "It requires to hand over a patientId. " +
                                "Other query parameters are free to choose. E.g.<br>" +
                                "<pre>/2/diagnosis/:getActivitiesLinkedToContract <br>" +
                                "POST { patientId:\"5dfd3210b832a21249999234\", _id:\"5afd4c40b83294c249999999\" }</pre></li>" +
                                "</ul>"
                }
            },
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
                        "type": "VTreatment_T",
                        "lib": types
                    }
                },
                "TreatmentActType_E": {
                    "type": "String",
                    "default": "TREATMENT",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "TREATMENT",
                            "-de": "Diagnose",
                            i18n: i18n( 'activity-schema.Activity_E.TREATMENT' ),
                            "-en": "Treatment"
                        }

                    ]
                },
                "VTreatment_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "TreatmentActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
                    },
                    status: { // overridden for doc purposes
                        "type": "String",
                        "apiv": { v:2, queryParam: true },
                        "-en": "The status of an activity is read-only. Using this parameter in POST / PUT has no effect."
                    },
                    catalogShort: { // overridden for doc purposes
                        "required": true,
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "-en": "The available values are GKV: \"EBM\", PKV: \"GOÄ\", PKV(Heilpraktiker): \"GebüH\". "
                    },
                    vat: { // overridden for doc purposes
                        "type": "Number",
                        "apiv": {v: 2, queryParam: false},
                        "-en": "The available values are:  1 - 0%,  2 - 7%,  3 - 19%"
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "Treatment_T",
                        "lib": "activity"
                    },
                    "billingBase": {
                        "complex": "ext",
                        "type": "BillingTrackSchein_T",
                        "lib": "activity"
                    },
                    "catalogBase": {
                        "complex": "ext",
                        "type": "Catalog_T",
                        "lib": "activity"
                    },
                    "priceBase": {
                        "complex": "ext",
                        "type": "Price_T",
                        "lib": "activity"
                    },
                    "hasDiagnosisBase": {
                        "complex": "ext",
                        "type": "HasDiagnosis_T",
                        "lib": "activity"
                    },
                    "hasUVGoaeBase": {
                        "complex": "ext",
                        "type": "HasUvGoaeType_T",
                        "lib": "activity"
                    },
                    "numberOfCopies": {                             // overridden for doc purposes
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

        function isLinkedPercentageCode( code ) {
            return ['5298', '5298A'].indexOf( code ) !== -1;
        }

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            ramlConfig: ramlConfig,

            /* MANDATORY */
            types: types,

            isLinkedPercentageCode: isLinkedPercentageCode

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
