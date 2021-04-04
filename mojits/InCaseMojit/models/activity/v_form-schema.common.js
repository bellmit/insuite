/**
 * User: pi
 * Date: 17/02/16  16:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_form-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VForm_T",
                        "lib": types
                    }
                },
                "FormActType_E": {
                    "type": "String",
                    "default": "FORM",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "FORM",
                            "-de": "Formular",
                            i18n: i18n( 'activity-schema.Activity_E.FORM' ),
                            "-en": "Form"
                        },
                        {
                            "val": "REMINDER",
                            "-de": "Erinnerung",
                            i18n: i18n( 'activity-schema.Activity_E.REMINDER' ),
                            "-en": "Reminder"
                        },
                        {
                            "val": "WARNING1",
                            "-de": "Mahnung 1",
                            i18n: i18n( 'activity-schema.Activity_E.WARNING1' ),
                            "-en": "Warning 1"
                        },
                        {
                            "val": "WARNING2",
                            "-de": "Mahnung 2",
                            i18n: i18n( 'activity-schema.Activity_E.WARNING2' ),
                            "-en": "Warning 2"
                        },
                        {
                            "val": "CREDITNOTE",
                            "-de": "Gutschrift",
                            i18n: i18n( 'activity-schema.Activity_E.CREDITNOTE' ),
                            "-en": "Credit note"
                        },
                        {
                            "val": "BADDEBT",
                            "-de": "Ausbuchen",
                            i18n: i18n( 'activity-schema.Activity_E.CREDITNOTE' ),
                            "-en": "Credit note"
                        },
                        {
                            "val": "COMMUNICATION",
                            "-de": "Kommunikation",
                            i18n: i18n( 'activity-schema.Activity_E.COMMUNICATION' ),
                            "-en": "Communication"
                        }
                    ]
                },
                "VForm_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "FormActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
                    },
                    status: {
                        "type": "string",
                        "apiv": { v:2, queryParam: true },
                        "-en": "The status of an activity is read-only. Using this parameter in POST / PUT has no effect."
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "Form_T",
                        "lib": "activity"
                    },
                    "invoiceBase": {
                        "complex": "ext",
                        "type": "Invoice_T",
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
                    "scheinFlagsBase":{
                        "complex": "ext",
                        "type": "ScheinFlags_T",
                        "lib": "activity"
                    },
                    "kinderKrankengeldBase":{
                        "complex": "ext",
                        "type": "KinderKrankengeld_T",
                        "lib": "activity"
                    },
                    "AUBase":{
                        "complex": "ext",
                        "type": "AU_T",
                        "lib": "activity"
                    },
                    "BaseETS":{
                        "complex": "ext",
                        "type": "BaseETS_T",
                        "lib": "activity"
                    },
                    "BasePTV11":{
                        "complex": "ext",
                        "type": "PTV11_T",
                        "lib": "activity"
                    },
                    "VerordKrankenhausBase":{
                        "complex": "ext",
                        "type": "VerordKrankenhaus_T",
                        "lib": "activity"
                    },
                    "FormExtraRehabilitationBase": {
                        "complex": "ext",
                        "type": "FormExtraRehabilitation_T",
                        "lib": "activity"
                    },
                    "MedDataBase": {
                        "complex": "ext",
                        "type": "MedData_T",
                        "lib": "activity"
                    },
                    "vendorId": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.Measurement_T.vendorId.i18n' ),
                        "-en": "Vendor Id",
                        "-de": "Hersteller Id"
                    },
                    "eventMessage": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.Measurement_T.eventMessage.i18n' ),
                        "-en": "Event message",
                        "-de": "Ereignis Nachricht",
                        "rule-engine": {
                            i18n: i18n( 'activity-schema.Measurement_T.eventMessage.i18n' )
                        }
                    },
                    "eventDate": {
                        "type": "Date",
                        i18n: i18n( 'activity-schema.Measurement_T.eventDate.i18n' ),
                        "-en": "Event Date",
                        "-de": "Ereignis Datum"
                    },
                    "formExtraContact": {
                        "complex": "ext",
                        "type": "FormExtraContact_T",
                        "lib": "activity"
                    },
                    "d_extra": {
                        "type": "any",
                        i18n: i18n( 'activity-schema.Measurement_T.d_extra.i18n' ),
                        "-en": "device data",
                        "-de": "Gerätedaten"
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
