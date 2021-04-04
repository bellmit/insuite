/*global YUI */
'use strict';
YUI.add( 'inphone-schema', function( Y, NAME ) {

        var types = {},
            i18n = Y.doccirrus.i18n;

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "InPhone_T",
                        "lib": types
                    }
                },
                "InPhone_T": {
                    "caller": {
                        "required": true,
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'IntouchPrivateMojit.inphone-schema.InPhone_T.caller.i18n' ),
                        "-en": "caller",
                        "-de": "caller"
                    },
                    "callee": {
                        "required": true,
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'IntouchPrivateMojit.inphone-schema.InPhone_T.callee.i18n' ),
                        "-en": "callee",
                        "-de": "callee"
                    },
                    "callername": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'IntouchPrivateMojit.inphone-schema.InPhone_T.callername.i18n' ),
                        "-en": "callername",
                        "-de": "callername"
                    },
                    "calleename": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'IntouchPrivateMojit.inphone-schema.InPhone_T.calleename.i18n' ),
                        "-en": "calleename",
                        "-de": "calleename"
                    },
                    "callInfo": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'IntouchPrivateMojit.inphone-schema.InPhone_T.callInfo.i18n' ),
                        "-en": "callInfo",
                        "-de": "callInfo"
                    },
                    "callerType": {
                        "complex": "eq",
                        "type": "CallerType_E",
                        "apiv": {v: 2, queryParam: false},
                        "lib": types,
                        i18n: i18n( 'IntouchPrivateMojit.inphone-schema.InPhone_T.callerType.i18n' ),
                        "-en": "callerType",
                        "-de": "callerType"
                    },
                    "callTime": {
                        "type": "Date",
                        i18n: i18n( 'IntouchPrivateMojit.inphone-schema.InPhone_T.callTime.i18n' ),
                        "-en": "callTime",
                        "-de": "callTime"
                    }
                },
                "CallerType_E": {
                    "type": "String",
                    i18n: i18n( 'IntouchPrivateMojit.inphone-schema.InPhone_T.callerType.i18n' ),
                    "apiv": {v: 2, queryParam: false},
                    "-en": "Caller type",
                    "-de": "Anrufertyp",
                    "list": [
                        {
                            "val": "PATIENT",
                            i18n: i18n( 'IntouchPrivateMojit.inphone-schema.CallerType_E.PATIENT.i18n' ),
                            "-en": "Patient",
                            "-de": "Patient"
                        },
                        {
                            "val": "EMPLOYEE",
                            i18n: i18n( 'IntouchPrivateMojit.inphone-schema.CallerType_E.EMPLOYEE.i18n' ),
                            "-en": "Employee",
                            "-de": "Mitarbeiter"
                        },
                        {
                            "val": "BASECONTACT",
                            i18n: i18n( 'IntouchPrivateMojit.inphone-schema.CallerType_E.BASECONTACT.i18n' ),
                            "-en": "Contact",
                            "-de": "Kontakt"
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
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [],
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader','dcvalidations']
    }
);
