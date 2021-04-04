/**
 * User: rrrw
 * Date: 17.09.13  22:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*globals YUI */
'use strict';

YUI.add( 'mirrorlocation-schema', function( Y, NAME ) {

        /**
         * Location schema for locations of a practice.
         *
         * Much simpler than a full blown company.
         *
         * Only allow one address in this version.
         *
         * @module DCAuth
         */


        var
            i18n = Y.doccirrus.i18n,

        // ------- Schema definitions  -------
            types = {};

        types = Y.mix( types, {
            root: {
                "base": {
                    "complex": "ext",
                    "type": "Location_T",
                    "lib": types
                }
            },
            "LocAddress_T": {
                "kind": {
                    "required": false,
                    "complex": "eq",
                    "type": "AddressKind_E",
                    "lib": "person",
                    "i18n": i18n( 'person-schema.Address_T.kind' ),
                    "-en": "kind",
                    "-de": "Adresstyp"
                }
            },
            "Location_T": {
                "locname": {
                    "required": true,
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'mirrorlocation-schema.Location_T.locname.i18n' ),
                    "-en": "locname",
                    "-de": "locname"
                },
                "commercialNo": {
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'mirrorlocation-schema.Location_T.commercialNo.i18n' ),
                    "-en": "Commercial No.",
                    "-de": "Betriebsstättennr.",
                    "rule-engine": {}
                },
                "prcCustomerNo": {
                    "type": "String",
                    i18n: i18n( 'mirrorlocation-schema.Location_T.prcCustomerNo.i18n' ),
                    "-en": "prcCustomerNo",
                    "-de": "prcCustomerNo"
                },
                "base0": {
                    "complex": "ext",
                    "type": "LocAddress_T",
                    "lib": types
                },
                "base1": {
                    "complex": "ext",
                    "type": "Address_T",
                    "lib": "person"
                },
                "base2": {
                    "complex": "ext",
                    "type": "BankAccount_T",
                    "lib": "person"
                },
                "phone": {
                    "validate": "phoneOrEmpty",
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'mirrorlocation-schema.Location_T.phone.i18n' ),
                    "-en": "phone",
                    "-de": "phone"
                },
                "fax": {
                    "validate": "phoneOrEmpty",
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'mirrorlocation-schema.Location_T.fax.i18n' ),
                    "-en": "fax",
                    "-de": "fax"
                },
                "email": {
                    "validate": "emailOrEmpty",
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'mirrorlocation-schema.Location_T.email.i18n' ),
                    "-en": "email",
                    "-de": "email"
                },
                "website": {
                    "validate": "urlOrEmpty",
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'mirrorlocation-schema.Location_T.website.i18n' ),
                    "-en": "email",
                    "-de": "email"
                },
                "openTimes": {
                    "complex": "inc",
                    "type": "WeeklyTime_T",
                    "apiv": {v: 2, queryParam: false},
                    "lib": types,
                    i18n: i18n( 'mirrorlocation-schema.Location_T.openTimes.i18n' ),
                    "-en": "openTimes",
                    "-de": "openTimes"
                },
                "isMainLocation": {
                    "type": "Boolean",
                    "apiv": {v: 2, queryParam: false},
                    "default": false,
                    i18n: i18n( 'mirrorlocation-schema.Location_T.isMainLocation.i18n' ),
                    "-en": "is main location",
                    "-de": "is main location"
                },
                "isAdditionalLocation": {
                    "type": "Boolean",
                    "apiv": {v: 2, queryParam: false},
                    "default": false,
                    i18n: i18n( 'mirrorlocation-schema.Location_T.isAdditionalLocation.i18n' ),
                    "-en": "additional location",
                    "-de": "Nebenbetriebsstätte"
                },
                "mainLocationId": {
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'mirrorlocation-schema.Location_T.mainLocationId.i18n' ),
                    "-en": "main location",
                    "-de": "Hauptbetriebsstätte"
                },
                "kbvZip": {
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'mirrorlocation-schema.Location_T.kbvZip.i18n' ),
                    "-en": "Official ZIP",
                    "-de": "Offizielle PLZ"
                },
                "kv": {
                    "type": "String",
                    i18n: i18n( 'mirrorlocation-schema.Location_T.KV.i18n' ),
                    "-en": "KV",
                    "-de": "KV"
                },
                "budgets": {
                    "complex": "inc",
                    "type": "Budgets_T",
                    "apiv": {v: 2, queryParam: false},
                    "lib": types,
                    i18n: i18n( 'location-schema.Location_T.budgets.i18n' ),
                    "-en": "communications",
                    "-de": "communications"
                },
                "defaultPrinter": {
                    "type": 'String',
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'mirrorlocation-schema.Location_T.defaultPrinter.i18n' ),
                    //"validate": "string",
                    "-en": "Default printer",
                    "-de": "Standarddrucker"
                },
                "enabledPrinters": {
                    "type": [String],
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'mirrorlocation-schema.Location_T.enabledPrinters.i18n' ),
                    //"validate": "validNumberOrEmpty",
                    "-en": "Printers",
                    "-de": "Drucker"
                }
            },
            // start: [9,39] === '09:39'
            // start: [22] === '22:00' or '10:00pm' dep on locale
            // end same
            "WeeklyTime_T": {
                "days": {
                    "type": [Number],
                    "required": true,
                    i18n: i18n( 'mirrorlocation-schema.WeeklyTime_T.days.i18n' )
                },
                "start": {
                    "type": [Number],
                    "required": true,
                    i18n: i18n( 'mirrorlocation-schema.WeeklyTime_T.start.i18n' )
                },
                "end": {
                    "type": [Number],
                    "required": true,
                    i18n: i18n( 'mirrorlocation-schema.WeeklyTime_T.end.i18n' )
                },
                "publicInsurance": {
                    "type": "boolean",
                    i18n: i18n( 'mirrorlocation-schema.WeeklyTime_T.publicInsurance.i18n' ),
                    "-en": "publicInsurance",
                    "-de": "publicInsurance"
                },
                "privateInsurance": {
                    "type": "boolean",
                    i18n: i18n( 'mirrorlocation-schema.WeeklyTime_T.privateInsurance.i18n' ),
                    "-en": "privateInsurance",
                    "-de": "privateInsurance"
                }
            },
            "Budgets_T": {
                "type": {
                    "complex": "eq",
                    "type": "Budget_E",
                    "lib": types,
                    i18n: i18n( 'location-schema.Location_T.budgetType.i18n' ),
                    "-en": "Budget Type",
                    "-de": "Budgettyp"
                },
                "specialities": {
                    "type": ["String"],
                    i18n: i18n( 'employee-schema.Employee_T.specialities' ),
                    "-en": "Specialisations",
                    "-de": "Fachgebiete"
                },
                "startBudget": {
                    "type": 'Number',
                    i18n: i18n( 'location-schema.Location_T.startBudget.i18n' ),
                    "validate": "Location_T_startBudget",
                    "-en": "Start Budget",
                    "-de": "Start Budgett"
                },
                "startDate": {
                    "type": 'Date',
                    "validate": "Location_T_startDate",
                    i18n: i18n( 'location-schema.Location_T.startBudget.i18n' ),
                    "-en": "Start Date Budget",
                    "-de": "Startdatum Budget"
                },
                "patientAgeRange1": {
                    "type": 'Number',
                    i18n: i18n( 'location-schema.Location_T.patientAgeRange1.i18n' ),
                    "validate": "validNumberOrEmpty",
                    "-en": "Pat. Alter 0-15",
                    "-de": "Pat. Alter 0-15"
                },
                "patientAgeRange2": {
                    "type": 'Number',
                    i18n: i18n( 'location-schema.Location_T.patientAgeRange2.i18n' ),
                    "validate": "validNumberOrEmpty",
                    "-en": "Pat. Alter 16-49",
                    "-de": "Pat. Alter Alter 16-49"
                },
                "patientAgeRange3": {
                    "type": 'Number',
                    i18n: i18n( 'location-schema.Location_T.patientAgeRange3.i18n' ),
                    "validate": "validNumberOrEmpty",
                    "-en": "Pat. Alter 50-65",
                    "-de": "Pat. Alter 50-65"
                },
                "patientAgeRange4": {
                    "type": 'Number',
                    i18n: i18n( 'location-schema.Location_T.patientAgeRange4.i18n' ),
                    "validate": "validNumberOrEmpty",
                    "-en": "Pat. Alter >65",
                    "-de": "Pat. Alter >65"
                }
            },
            "Budget_E": {
                "type": "string",
                "list": [
                    {
                        "val": "MEDICATION",
                        i18n: i18n( 'llocation-schema.Location_T.medBudget.i18n' ),
                        "-en": "Medication Budget",
                        "-de": "Medikamentenbudgett"
                    },
                    {
                        "val": "KBVUTILITY",
                        i18n: i18n( 'location-schema.Location_T.utBudget.i18n' ),
                        "-en": "Utility Budget",
                        "-de": "Heilmittelbudget"
                    }
                ]
            }
        } );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        // -------- Our Schema Methods and Hooks are defined here -------

        /**
         * Class Location Schemas
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
            'person-schema',
            'simpleperson-schema'
        ]
    }
);
