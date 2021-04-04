/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'mirroremployee-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                "root": {
                    "person": {
                        "complex": "ext",
                        "type": "Person_T",
                        "lib": "person"
                    },
                    "employee": {
                        "complex": "ext",
                        "type": "Employee_T",
                        "lib": types
                    },
                    "physician": {
                        "complex": "ext",
                        "type": "PhysicianContact_T",
                        "lib": "basecontact"
                    }
                },
                "EmployeeShort_T": {
                    "name": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'mirroremployee-schema.EmployeeShort_T.name' ),
                        "-en": "name",
                        "-de": "name"
                    },
                    "employeeNo": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        "future": "foreign.key",
                        i18n: i18n( 'mirroremployee-schema.EmployeeShort_T.employeeNo' ),
                        "-en": "employeeNo",
                        "-de": "employeeNo"
                    }
                },
                "Employee_T": {
                    "type": {
                        "complex": "eq",
                        "type": "Employee_E",
                        "apiv": {v: 2, queryParam: false},
                        "required": true,
                        "lib": types
                    },
                    "prcCustomerNo": {
                        "type": "String",
                        i18n: i18n( 'mirroremployee-schema.Employee_T.prcCustomerNo.i18n' ),
                        "-en": "prcCustomerNo",
                        "-de": "prcCustomerNo"
                    },
                    "from": {
                        "type": "Date",
                        "future": "DateTime",
                        i18n: i18n( 'mirroremployee-schema.Employee_T.from' ),
                        "-en": "from",
                        "-de": "from"
                    },
                    "to": {
                        "type": "Date",
                        "future": "DateTime",
                        i18n: i18n( 'mirroremployee-schema.Employee_T.to' ),
                        "-en": "to",
                        "-de": "to"
                    },
                    "department": {
                        "type": "String",
                        i18n: i18n( 'mirroremployee-schema.Employee_T.department.i18n' ),
                        "-en": "department",
                        "-de": "department"
                    },
                    "employeeNo": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'mirroremployee-schema.Employee_T.employeeNo.i18n' ),
                        "-en": "Employee's Institution No.",
                        "-de": "Mitarbeiternr."
                    },
                    "specialities": {
                        "type": [String],
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'mirroremployee-schema.Employee_T.specialities' ),
                        "-en": "Specialisations",
                        "-de": "Fachgebiete"
                    },
                    "specialisationText": {
                        "default": "",
                        "type": 'String',
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'mirroremployee-schema.Employee_T.specialisationText.i18n' ),
                        "-en": "Specialisation (text)",
                        "-de": "Bezeichnung Arztstempel"
                    },
                    "locations": {
                        "complex": "inc",
                        "type": "EmployeeLocations_T",
                        "apiv": {v: 2, queryParam: false},
                        "lib": types,
                        i18n: i18n( 'mirroremployee-schema.Employee_T.locations' ),
                        "-en": "Assigned locations",
                        "-de": "Betriebsstätten"
                    },
                    "roles": {
                        "type": [String],
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'employee-schema.Employee_T.roles' ),
                        "-en": "Roles",
                        "-de": "Roles"
                    },
                    "talk": {
                        "complex": "eq",
                        "type": "Talk_E",
                        "apiv": {v: 2, queryParam: false},
                        "lib": 'person',
                        "required": true,
                        i18n: i18n( 'mirroremployee-schema.Employee_T.talk' ),
                        "-en": "Talk",
                        "-de": "Anrede"
                    },
                    "dob": {
                        "type": "Date",
                        i18n: i18n( 'mirroremployee-schema.Employee_T.dob' ),
                        "-en": "Date of Birth",
                        "-de": "Geburtsdatum"
                    },
                    "gender": {
                        "complex": "eq",
                        "type": "Gender_E",
                        "lib": "person"
                    },
                    "isSupport": {
                        "type": "boolean",
                        "-en": "isSupport",
                        "-de": "isSupport"
                    },
                    "physicianInQualification": {
                        "type": "boolean",
                        i18n: i18n( 'mirroremployee-schema.Employee_T.physicianInQualification' ),
                        "-en": "Physician in Qualification",
                        "-de": "Arzt in Weiterbildung"
                    },
                    "rlvCapacity": {
                        "type": 'Number',
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'mirroremployee-schema.Employee_T.rlvCapacity.i18n' ),
                        "validate": "validNumberOrEmpty",
                        "-en": "Volumen",
                        "-de": "Capacity"
                    },
                    "rlvPhysician": {
                        "type": 'String',
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'mirroremployee-schema.Employee_T.rlvPhysician.i18n' ),
                        "-en": "RLV Arzt",
                        "-de": "RLV Physician"
                    },
                    "workDescription": {
                        "type": 'String',
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'mirroremployee-schema.Employee_T.workDescription.i18n' ),
                        "-en": "work description",
                        "-de": "Jobbezeichnung"
                    },
                    "physicianIknr": {
                        "type": 'String',
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'mirroremployee-schema.Employee_T.physicianIknr.i18n' ),
                        "-en": "IKNR Physician",
                        "-de": "IKNR Arzt"
                    },
                    "physicianType": {
                        "complex": "eq",
                        "type": "PhysicianType_E",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'mirroremployee-schema.Employee_T.physicianType.i18n' ),
                        "lib": types
                    },
                    "asvTeamNumbers": {
                        "default": [],
                        "type": [String],
                        i18n: i18n( 'mirroremployee-schema.Employee_T.asvTeamNumbers.i18n' ),
                        "-en": "ASV Teamnumber",
                        "-de": "ASV Teamnummer"
                    },
                    "isActive": {
                        "default": true,
                        "type": Boolean,
                        i18n: i18n( 'mirroremployee-schema.Employee_T.isActive.i18n' ),
                        "-en": "Is Active",
                        "-de": "Is Active"
                    }
                },
                "Employee_E": {
                    "type": "string",
                    "list": [
                        {
                            "val": "PHYSICIAN",
                            i18n: i18n( 'mirroremployee-schema.Employee_E.PHYSICIAN' ),
                            "-en": "Physician",
                            "-de": "Arzt"
                        },
                        {
                            "val": "PRACTICENURSE",
                            i18n: i18n( 'mirroremployee-schema.Employee_E.PRACTICENURSE' ),
                            "-en": "Practice Nurse",
                            "-de": "MFA"
                        },
                        {
                            "val": "PHARMACIST",
                            i18n: i18n( 'employee-schema.Employee_E.PHARMACIST' ),
                            "-en": "Pharmacist",
                            "-de": "ApothekerIn"
                        },
                        {
                            "val": "PHARMACY_STAFF",
                            i18n: i18n( 'employee-schema.Employee_E.PHARMACY_STAFF' ),
                            "-en": "Pharmacy staff",
                            "-de": "PTA"
                        },
                        {
                            "val": "OTHER",
                            i18n: i18n( 'mirroremployee-schema.Employee_E.OTHER' ),
                            "-en": "Other",
                            "-de": "Sonstige"
                        }
                    ],
                    i18n: i18n( 'mirroremployee-schema.Employee_T.type' ),
                    "-en": "type",
                    "-de": "type"
                },
                "PhysicianType_E": {
                    "type": "string",
                    "list": [
                        {
                            "val": "H_PHYSICIAN",
                            i18n: i18n( 'mirroremployee-schema.PhysicianType_E.H_PHYSICIAN.i18n' ),
                            "-en": "H-Physician",
                            "-de": "H-Arzt"
                        },
                        {
                            "val": "D_PHYSICIAN",
                            i18n: i18n( 'mirroremployee-schema.PhysicianType_E.D_PHYSICIAN.i18n' ),
                            "-en": "D-Physician",
                            "-de": "D-Arzt"
                        }
                    ],
                    i18n: i18n( 'mirroremployee-schema.Employee_T.physicianType.i18n' ),
                    "-en": "type",
                    "-de": "type"
                },
                "EmployeeLocations_T": {
                    _id: {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'mirroremployee-schema.EmployeeLocations_T._id' ),
                        "-en": "location id",
                        "-de": "Betriebsstätten ID"
                    },
                    locname: {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'mirroremployee-schema.EmployeeLocations_T.locname' ),
                        "-en": "location name",
                        "-de": "Betriebsstättenname"
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
            'doccirrus',
            'dcvalidations',
            'dcschemaloader',
            'basecontact-schema',
            'person-schema'
        ]
    }
);
