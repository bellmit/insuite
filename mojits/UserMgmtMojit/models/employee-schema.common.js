/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';

YUI.add( 'employee-schema', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            types = {},

            // ------- private 'constants'  -------
            accountList = Object.freeze( [
                    {
                        "val": "ACTIVE",
                        i18n: i18n( 'identity-schema.Account_E.ACTIVE' ),
                        "-en": "active",
                        "-de": "active"
                    },
                    {
                        "val": "INACTIVE",
                        i18n: i18n( 'identity-schema.Account_E.INACTIVE' ),
                        "-en": "inactive",
                        "-de": "inactive"
                    },
                    {
                        "val": "DELETED",
                        i18n: i18n( 'identity-schema.Account_E.DELETED' ),
                        "-en": "deleted",
                        "-de": "deleted"
                    },
                    {
                        "val": "REGISTERED",
                        i18n: i18n( 'identity-schema.Account_E.REGISTERED' ),
                        "-en": "registered",
                        "-de": "registered"
                    },
                    {
                        "val": "CANCELLED",
                        i18n: i18n( 'identity-schema.Account_E.CANCELLED' ),
                        "-en": "cancelled",
                        "-de": "cancelled"
                    }
                ]
            ),
            // ------- Schema definitions  -------
            notificationTypeList = Object.freeze( {
                EMAIL: 'email'
            } ),
            asvSpecializationsTypeList = Object.freeze( {
                "ALLGEMEINCHIRURGIE": "ALLGEMEINCHIRURGIE",
                "LABORATORIUMSMEDIZIN": "LABORATORIUMSMEDIZIN",
                "FRAUENHEILKUNDE_UND_GEBURTSHILFE": "FRAUENHEILKUNDE_UND_GEBURTSHILFE",
                "ANASTHESIOLOGIE": "ANASTHESIOLOGIE",
                "HALS_NASEN_OHRENHEILKUNDE": "HALS_NASEN_OHRENHEILKUNDE",
                "ORTHOPADIE_UND_UNFALLCHIRURGIE": "ORTHOPADIE_UND_UNFALLCHIRURGIE",
                "PSYCHIATRIE_UND_PSYCHOTHERAPIE": "PSYCHIATRIE_UND_PSYCHOTHERAPIE",
                "GEFA_CHIRURGIE": "GEFA_CHIRURGIE",
                "KINDER_UND_JUGENDMEDIZIN": "KINDER_UND_JUGENDMEDIZIN",
                "HUMANGENETIK": "HUMANGENETIK",
                "PATHOLOGIE": "PATHOLOGIE",
                "KINDER_UND_JUGENDPSYCHIATRIE_UND_PSYCHOTHERAPIE": "KINDER_UND_JUGENDPSYCHIATRIE_UND_PSYCHOTHERAPIE",
                "MIKROBIOLOGIE_VIROLOGIE_UND_INFEKTIONSEPIDEMIOLOGIE": "MIKROBIOLOGIE_VIROLOGIE_UND_INFEKTIONSEPIDEMIOLOGIE",
                "PSYCHOSOMATISCHE_MEDIZIN_UND_PSYCHOTHERAPIE": "PSYCHOSOMATISCHE_MEDIZIN_UND_PSYCHOTHERAPIE",
                "INNERE_MEDIZIN_UND_ANGIOLOGIE": "INNERE_MEDIZIN_UND_ANGIOLOGIE",
                "INNERE_MEDIZIN_UND_PNEUMOLOGIE": "INNERE_MEDIZIN_UND_PNEUMOLOGIE",
                "INNERE_MEDIZIN_UND_ENDOKRINOLOGIE_UND_DIABETOLOGIE": "INNERE_MEDIZIN_UND_ENDOKRINOLOGIE_UND_DIABETOLOGIE",
                "UROLOGIE": "UROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_KINDERKARDIOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_KINDERKARDIOLOGIE",
                "INNERE_MEDIZIN_UND_GASTROENTEROLOGIE": "INNERE_MEDIZIN_UND_GASTROENTEROLOGIE",
                "NEUROLOGIE": "NEUROLOGIE",
                "HERZCHIRURGIE": "HERZCHIRURGIE",
                "INNERE_MEDIZIN_UND_HAMATOLOGIE_UND_ONKOLOGIE": "INNERE_MEDIZIN_UND_HAMATOLOGIE_UND_ONKOLOGIE",
                "RADIOLOGIE": "RADIOLOGIE",
                "INNERE_MEDIZIN_UND_KARDIOLOGIE": "INNERE_MEDIZIN_UND_KARDIOLOGIE",
                "AUGENHEILKUNDE": "AUGENHEILKUNDE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZWEITERBILDUNG_KINDER_PNEUMOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZWEITERBILDUNG_KINDER_PNEUMOLOGIE",
                "INNERE_MEDIZIN_UND_NEPHROLOGIE": "INNERE_MEDIZIN_UND_NEPHROLOGIE",
                "INNERE_MEDIZIN_MIT_ZUSATZWEITERBILDUNG_INFEKTIOLOGIE": "INNERE_MEDIZIN_MIT_ZUSATZWEITERBILDUNG_INFEKTIOLOGIE",
                "PSYCHOLOGISCHE_ODER_ARZTLICHE_PSYCHOTHERAPEUTIN_ODER_PSYCHOLOGISCHER_ODER_ARZTLICHER_PSYCHOTHERAPEUT": "PSYCHOLOGISCHE_ODER_ARZTLICHE_PSYCHOTHERAPEUTIN_ODER_PSYCHOLOGISCHER_ODER_ARZTLICHER_PSYCHOTHERAPEUT",
                "NUKLEARMEDIZIN_HINZUZUZIEHENDE": "NUKLEARMEDIZIN_HINZUZUZIEHENDE",
                "NUKLEARMEDIZIN_KERNTEAM": "NUKLEARMEDIZIN_KERNTEAM",
                "STRAHLENTHERAPIE": "STRAHLENTHERAPIE",
                "VISZERALCHIRURGIE": "VISZERALCHIRURGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZWEITERBILDUNG_KINDER_GASTROENTEROLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZWEITERBILDUNG_KINDER_GASTROENTEROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_NEUROPÄDIATRIE": "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_NEUROPÄDIATRIE",
                "FRAUENHEILKUNDE_UND_GEBURTSHILFE_MIT_SCHWERPUNKT_GYNÄKOLOGISCHE_ONKOLOGIE": "FRAUENHEILKUNDE_UND_GEBURTSHILFE_MIT_SCHWERPUNKT_GYNÄKOLOGISCHE_ONKOLOGIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE": "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE",
                "INNERE_MEDIZIN_UND_RHEUMATOLOGIE": "INNERE_MEDIZIN_UND_RHEUMATOLOGIE",
                "PSYCHOLOGISCHE_ODER_ÄRZTLICHE_PSYCHOTHERAPEUTIN_ODER_PSYCHOLOGISCHER_ODER_ÄRZTLICHER_PSYCHOTHERAPEUT_ODER_KINDER_UND_JUGENDLICHENPSYCHOTHERAPEUTIN_KINDER_UND_JUGENDLICHENPSYCHOTHERAPEUT": "PSYCHOLOGISCHE_ODER_ÄRZTLICHE_PSYCHOTHERAPEUTIN_ODER_PSYCHOLOGISCHER_ODER_ÄRZTLICHER_PSYCHOTHERAPEUT_ODER_KINDER_UND_JUGENDLICHENPSYCHOTHERAPEUTIN_KINDER_UND_JUGENDLICHENPSYCHOTHERAPEUT",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZWEITERBILDUNG_KINDER_RHEUMATOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZWEITERBILDUNG_KINDER_RHEUMATOLOGIE",
                "INNERE_MEDIZIN_UND_GASTROENTEROLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG": "INNERE_MEDIZIN_UND_GASTROENTEROLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG": "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG",
                "NUKLEARMEDIZIN": "NUKLEARMEDIZIN",
                "HAUT_UND_GESCHLECHTSKRANKHEITEN": "HAUT_UND_GESCHLECHTSKRANKHEITEN",
                "ORTHOPÄDIE_UND_UNFALLCHIRURGIE_MIT_ZUSATZWEITERBILDUNG_ORTHOPÄDISCHE_RHEUMATOLOGIE": "ORTHOPÄDIE_UND_UNFALLCHIRURGIE_MIT_ZUSATZWEITERBILDUNG_ORTHOPÄDISCHE_RHEUMATOLOGIE",
                "KINDER_UND_JUGENDLICHENPSYCHOTHERAPEUTIN_ODER_KINDER_UND_JUGENDLICHENPSYCHOTHERAPEUT": "KINDER_UND_JUGENDLICHENPSYCHOTHERAPEUTIN_ODER_KINDER_UND_JUGENDLICHENPSYCHOTHERAPEUT",
                "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_KINDER-HÄMATOLOGIE_UND_ONKOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_KINDER-HÄMATOLOGIE_UND_ONKOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZWEITERBILDUNG_KINDER-NEPHROLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZWEITERBILDUNG_KINDER-NEPHROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_UND_SCHWERPUNKT_NEUROPÄDIATRIE": "KINDER_UND_JUGENDMEDIZIN_UND_SCHWERPUNKT_NEUROPÄDIATRIE",
                "FACHÄRZTIN_BZW._EIN_FACHARZT_FÜR_KINDER_UND_JUGENDPSYCHIATRIE_UND_PSYCHOTHERAPIE": "FACHÄRZTIN_BZW._EIN_FACHARZT_FÜR_KINDER_UND_JUGENDPSYCHIATRIE_UND_PSYCHOTHERAPIE",
                "KINDER_UND_JUGENDLICHENPSYCHOTHERAPEUTIN_BZW._KINDER_UND_JUGENDLICHENPSYCHOTHERAPEUT": "KINDER_UND_JUGENDLICHENPSYCHOTHERAPEUTIN_BZW._KINDER_UND_JUGENDLICHENPSYCHOTHERAPEUT",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZWEITERBILDUNG_KINDER_ENDOKRINOLOGIE_UND_DIABETOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZWEITERBILDUNG_KINDER_ENDOKRINOLOGIE_UND_DIABETOLOGIE",
                "PSYCHOLOGISCHE_PSYCHOTHERAPEUTIN_ODER_PSYCHOLOGISCHER_PSYCHOTHERAPEUT": "PSYCHOLOGISCHE_PSYCHOTHERAPEUTIN_ODER_PSYCHOLOGISCHER_PSYCHOTHERAPEUT",
                "VISZERALCHIRUGIE": "VISZERALCHIRUGIE",
                "ÄRZTLICHE_PSYCHOTHERAPEUTIN_ODER_ÄRZTLICHER_PSYCHOTHERAPEUT": "ÄRZTLICHE_PSYCHOTHERAPEUTIN_ODER_ÄRZTLICHER_PSYCHOTHERAPEUT",
                "PLASTISCHE_UND_ÄSTHETISCHE_CHIRURGIE": "PLASTISCHE_UND_ÄSTHETISCHE_CHIRURGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZWEITERBILDUNG_KINDER-ENDOKRINOLOGIE_UND_DIABETOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZWEITERBILDUNG_KINDER-ENDOKRINOLOGIE_UND_DIABETOLOGIE",
                "KINDER_UND_JUGENDLICHENPSYCHOTHERAPIE": "KINDER_UND_JUGENDLICHENPSYCHOTHERAPIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKTBEZEICHNUNG_NEUROPÄDIATRIE": "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKTBEZEICHNUNG_NEUROPÄDIATRIE",
                "PLASTISCHE,_REKONSTRUKTIVE_UND_ÄSTHETISCHE_CHIRURGIE": "PLASTISCHE,_REKONSTRUKTIVE_UND_ÄSTHETISCHE_CHIRURGIE",
                "MUND-KIEFER-GESICHTSCHIRURGIE": "MUND-KIEFER-GESICHTSCHIRURGIE",
                "NEUROCHIRURGIE": "NEUROCHIRURGIE",
                "THORAXCHIRURGIE": "THORAXCHIRURGIE",
                "INNERE_MEDIZIN_UND_KARDIOLOGIE_(HINZUZUZIEHENDE)": "INNERE_MEDIZIN_UND_KARDIOLOGIE_(HINZUZUZIEHENDE)",
                "INNERE_MEDIZIN_UND_KARDIOLOGIE_(KERNTEAM)": "INNERE_MEDIZIN_UND_KARDIOLOGIE_(KERNTEAM)",
                "ORTHOPÄDIE_UND_UNFALLCHIRURGIE_MIT_ZUSATZ-WEITERBILDUNG_ORTHOPÄDISCHE_RHEUMATOLOGIE": "ORTHOPÄDIE_UND_UNFALLCHIRURGIE_MIT_ZUSATZ-WEITERBILDUNG_ORTHOPÄDISCHE_RHEUMATOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_KINDER_UND_JUGEND-KARDIOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_KINDER_UND_JUGEND-KARDIOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_KINDER_UND_JUGEND-HÄMATOLOGIE_UND_ONKOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_KINDER_UND_JUGEND-HÄMATOLOGIE_UND_ONKOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-GASTROENTEROLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-GASTROENTEROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-PNEUMOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-PNEUMOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-NEPHROLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-NEPHROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-RHEUMATOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-RHEUMATOLOGIE",
                "INNERE_MEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_INFEKTIOLOGIE": "INNERE_MEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_INFEKTIOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-ENDOKRINOLOGIE_UND_DIABETOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-ENDOKRINOLOGIE_UND_DIABETOLOGIE",
                "INNERE_MEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE": "INNERE_MEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE": "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG": "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG",
                "TRANSFUSIONSMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE": "TRANSFUSIONSMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER-GASTROENTEROLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER-GASTROENTEROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER-PNEUMOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER-PNEUMOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER-RHEUMATOLOGIE": "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER-RHEUMATOLOGIE"

            } ),
            asvMembershipTypeTypeList = Object.freeze( {
                LEAD: 'LEAD',
                FULL: 'FULL',
                RESTRICTED: 'RESTRICTED',
                OTHER: 'OTHER'
            } ),
            userGroups = {};

        Object.defineProperties( userGroups, {
            'PHARMACY_STAFF': {
                value: 'PHARMACY_STAFF',
                enumerable: true
            },
            'PHARMACIST': {
                value: 'PHARMACIST',
                enumerable: true
            },
            'REDUCED_USER': {
                value: 'REDUCED_USER',
                enumerable: true
            },
            'USER': {
                value: 'USER',
                enumerable: true
            },
            'PHYSICIAN': {
                value: 'PHYSICIAN',
                enumerable: true
            },
            'SUPERUSER': {
                value: 'SUPERUSER',
                enumerable: true
            },
            'CONTROLLER': {
                value: 'CONTROLLER',
                enumerable: true
            },
            'ADMIN': {
                value: 'ADMIN',
                enumerable: true
            },
            'SUPPORT': {
                value: 'SUPPORT',
                enumerable: true
            },
            'PARTNER': {
                value: 'PARTNER',
                enumerable: true
            }
        } );

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
                    "employeeBase": {
                        "complex": "ext",
                        "type": "EmployeeCommon_T",
                        "lib": types
                    },
                    "physician": {
                        "complex": "ext",
                        "type": "PhysicianContact_T",
                        "lib": "basecontact"
                    },
                    "accountInfo": {
                        "complex": "ext",
                        "type": "AccountEmployee_T",
                        "lib": types
                    }
                },
                "EmployeeShort_T": {
                    "name": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'employee-schema.EmployeeShort_T.name' ),
                        "-en": "name",
                        "-de": "name"
                    },
                    "employeeNo": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        "future": "foreign.key",
                        i18n: i18n( 'employee-schema.EmployeeShort_T.employeeNo' ),
                        "-en": "employeeNo",
                        "-de": "employeeNo"
                    },
                    "initials": {
                        "apiv": { v: 2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'employee-schema.Employee_T.initials.i18n' ),
                        "-en": "Initials",
                        "-de": "Kürzel"
                    }
                },
                "EmployeeCommon_T": {
                    "username": {
                        "apiv": { v: 2, queryParam: true },
                        "type": "String",
                        "validate": "username",
                        i18n: i18n( 'identity-schema.Identity_T.username' ),
                        "-en": "username",
                        "-de": "username"
                    },
                    "initials": {
                        "apiv": { v: 2, queryParam: true },
                        "type": "String",
                        "validate": "Employee_T_initials",
                        i18n: i18n( 'employee-schema.Employee_T.initials.i18n' ),
                        "-en": "Initials",
                        "-de": "Kürzel"
                    },
                    "memberOf": {
                        "complex": "inc",
                        "type": "Group_T",
                        "apiv": { v: 2, queryParam: true },
                        "lib": types,
                        i18n: i18n( 'identity-schema.Identity_T.memberOf' ),
                        "-en": "memberOf",
                        "-de": "memberOf"
                    },
                    "roles": {
                        "type": [String],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'employee-schema.Employee_T.roles' ),
                        "-en": "Roles",
                        "-de": "Roles"
                    },
                    "preferredLanguage": {
                        "default": "",
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'employee-schema.Employee_T.preferredLanguage.i18n' ),
                        "-en": "preferredLanguage",
                        "-de": "preferredLanguage"
                    },
                    "currentLocation": {
                        "default": "",
                        "type": 'String',
                        i18n: i18n( 'employee-schema.Employee_T.currentLocation.i18n' ),
                        "-en": "current location id",
                        "-de": "aktueller Standort"
                    },
                    "labdataSortOrder": {
                        "default": "",
                        "type": 'String',
                        i18n: i18n( 'employee-schema.Employee_T.labdataSortOrder.i18n' ),
                        "-en": "labdata sort order",
                        "-de": "Labordatensortierung"
                    }
                },
                "Employee_T": {
                    "Employee_Base_T": {
                        "complex": "ext",
                        "type": "Employee_Base_T",
                        "lib": types
                    },
                    "Employee_D_T": {
                        "complex": "ext",
                        "type": "Employee_D_T",
                        "lib": types
                    },
                    "Employee_CH_T": {
                        "complex": "ext",
                        "type": "Employee_CH_T",
                        "lib": types
                    }
                },
                "Employee_Base_T": {
                    "type": {
                        "complex": "eq",
                        "type": "Employee_E",
                        "apiv": { v: 2, queryParam: true },
                        "required": true,
                        "lib": types
                    },
                    "from": {
                        "type": "Date",
                        "future": "DateTime",
                        i18n: i18n( 'employee-schema.Employee_T.from' ),
                        "-en": "from",
                        "-de": "from"
                    },
                    "to": {
                        "type": "Date",
                        "future": "DateTime",
                        i18n: i18n( 'employee-schema.Employee_T.to' ),
                        "-en": "to",
                        "-de": "to"
                    },
                    "department": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'employee-schema.Employee_T.department.i18n' ),
                        "-en": "department",
                        "-de": "department"
                    },
                    "employeeNo": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'employee-schema.Employee_T.employeeNo.i18n' ),
                        "-en": "Employee's Institution No.",
                        "-de": "Mitarbeiternr."
                    },
                    "specialities": {
                        "type": [String],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'employee-schema.Employee_T.specialities' ),
                        "-en": "Specialisations",
                        "-de": "Fachgebiete"
                    },
                    "specialisationText": {
                        "default": "",
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'employee-schema.Employee_T.specialisationText.i18n' ),
                        "-en": "Specialisation (text)",
                        "-de": "Bezeichnung Arztstempel"
                    },
                    "locations": {
                        "complex": "inc",
                        "type": "EmployeeLocations_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types,
                        i18n: i18n( 'employee-schema.Employee_T.locations' ),
                        "-en": "Assigned locations",
                        "-de": "Betriebsstätten"
                    },
                    "talk": {
                        "complex": "eq",
                        "type": "Talk_E",
                        "apiv": { v: 2, queryParam: true },
                        "lib": 'person',
                        "required": true,
                        i18n: i18n( 'employee-schema.Employee_T.talk' ),
                        "-en": "Talk",
                        "-de": "Anrede"
                    },
                    "dob": {
                        "type": "Date",
                        i18n: i18n( 'employee-schema.Employee_T.dob' ),
                        "-en": "Date of Birth",
                        "-de": "Geburtsdatum"
                    },
                    "gender": {
                        "complex": "eq",
                        "type": "Gender_E",
                        "apiv": { v: 2, queryParam: true },
                        "lib": "person"
                    },
                    "isSupport": {
                        "type": "boolean",
                        "-en": "isSupport",
                        "-de": "isSupport"
                    },
                    "physicianInQualification": {
                        "type": "boolean",
                        i18n: i18n( 'employee-schema.Employee_T.physicianInQualification' ),
                        "-en": "Physician in Qualification",
                        "-de": "Arzt in Weiterbildung"
                    },
                    "rlvCapacity": {
                        "type": 'Number',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'employee-schema.Employee_T.rlvCapacity.i18n' ),
                        "validate": "validNumberOrEmpty",
                        "-en": "Volumen",
                        "-de": "Capacity"
                    },
                    "rlvPhysician": {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'employee-schema.Employee_T.rlvPhysician.i18n' ),
                        "-en": "RLV Arzt",
                        "-de": "RLV Physician"
                    },
                    "workDescription": {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'employee-schema.Employee_T.workDescription.i18n' ),
                        "-en": "work description",
                        "-de": "Jobbezeichnung"
                    },
                    "physicianIknr": {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'employee-schema.Employee_T.physicianIknr.i18n' ),
                        "-en": "IKNR Physician",
                        "-de": "IKNR Arzt"
                    },
                    "physicianType": {
                        "complex": "eq",
                        "type": "PhysicianType_E",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'employee-schema.Employee_T.physicianType.i18n' ),
                        "lib": types
                    },
                    "asvTeamNumbers": {
                        "default": [],
                        "type": [String],
                        i18n: i18n( 'employee-schema.Employee_T.asvTeamNumbers.i18n' ),
                        "-en": "ASV Teamnumber",
                        "-de": "ASV Teamnummer"
                    },
                    "asvSpecializations": {
                        "complex": "eq",
                        "type": "AsvSpecializations_E",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    },
                    "notifications": {
                        "complex": "inc",
                        "type": "Notifications_T",
                        "lib": types,
                        i18n: i18n( 'practice-schema.Employee_T.notifications.i18n' ),
                        "-en": "notifications",
                        "-de": "notifications"
                    },
                    "asvMembershipType": {
                        "complex": "eq",
                        "type": "AsvMembershipType_E",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    },
                    "arztstempel": {
                        "type": 'String',
                        "default": "",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'employee-schema.Employee_T.arztstempel.i18n' ),
                        "-en": "Form sender block",
                        "-de": "Arztstempel"
                    },
                    "pvsCustomerNo": {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        validate: "Employee_T_pvsCustomerNo",
                        i18n: i18n( 'employee-schema.Employee_T.pvsCustomerNo.i18n' ),
                        "-en": "PVS Customer No.",
                        "-de": "PVS Kundennummer"
                    },
                    "fromLDAP": {
                        "type": 'Boolean',
                        "default": false,
                        i18n: i18n( 'employee-schema.Employee_T.fromLDAP.i18n' ),
                        "-en": "from LDAP",
                        "-de": "aus LDAP"
                    },
                    "countryMode": {
                        "complex": "eq",
                        "type": "CountryMode_E",
                        "lib": "countrymode"
                    },
                    "activeActive": {
                        "type": "Boolean",
                        "-en": "Active-Active",
                        "-de": "Aktiv-Aktiv",
                        i18n: i18n( 'partner-schema.Partner_T.activeActive.i18n' )
                    }
                },
                "Employee_D_T": {},
                "Employee_CH_T": {
                    "qualiDignities": {
                        "type": [String],
                        "default": ["0000"],
                        "apiv": { v: 2, queryParam: false, countryMode: ["CH"] },
                        i18n: i18n( 'employee-schema.Employee_CH_T.qualiDignities.i18n' ),
                        "rule-engine": {
                            "type": "String",
                            "allowedOperators": ['$eq', '$ne', '$exists', '$in', '$nin']
                        }

                    },
                    "quantiDignities": {
                        "type": [String],
                        "default": [],
                        "apiv": { v: 2, queryParam: false, countryMode: ["CH"] },
                        i18n: i18n( 'employee-schema.Employee_CH_T.quantiDignities.i18n' ),
                        "rule-engine": {
                            "type": "String",
                            "allowedOperators": ['$eq', '$ne', '$exists', '$in', '$nin']
                        }
                    }
                },
                "Account_T": {
                    "status": {
                        "complex": "eq",
                        "type": "Account_E",
                        "lib": types,
                        i18n: i18n( 'identity-schema.Account_T.status' ),
                        "-en": "status",
                        "-de": "status"
                    }
                },
                "AccountEmployee_T": {
                    "status": {
                        "complex": "eq",
                        "type": "AccountEmployee_E",
                        "lib": types,
                        i18n: i18n( 'identity-schema.Account_T.status' ),
                        "apiv": {v: 2, queryParam: false},
                        "-en": "status",
                        "-de": "status"
                    }
                },
                "Group_T": {
                    "group": {
                        "complex": "eq",
                        "lib": types,
                        "type": "Group_E"
                    }
                },
                "Notifications_T": {
                    "type": {
                        "complex": "eq",
                        "type": "NotificationType_E",
                        "lib": types,
                        i18n: i18n( 'practice-schema.Alert_T.type.i18n' ),
                        "-en": "type",
                        "-de": "type",
                        "required": true
                    },
                    "active": {
                        "type": "Boolean",
                        i18n: i18n( 'practice-schema.Alert_T.active.i18n' ),
                        "-en": "active",
                        "-de": "active"
                    }
                },
                "Account_E": {
                    "required": true,
                    "type": "String",
                    "list": accountList
                },
                "AccountEmployee_E": {
                    "required": false,
                    "type": "String",
                    "list": accountList
                },
                "AsvSpecializations_E": {
                    "type": [String],
                    list: Y.doccirrus.schemaloader.getSchemaTypeList( 'employee-schema.AsvSpecializations_E', asvSpecializationsTypeList ),
                    i18n: i18n( 'employee-schema.Employee_T.asvSpecializations.i18n' ),
                    "-en": "ASV Specializations",
                    "-de": "ASV Specializations"

                },
                "AsvMembershipType_E": {
                    "type": "String",
                    "default": asvMembershipTypeTypeList.FULL,
                    "list": Y.doccirrus.schemaloader.getSchemaTypeList( 'employee-schema.AsvMembershipType_E', asvMembershipTypeTypeList ),
                    i18n: i18n( 'employee-schema.Employee_T.asvMembershipType.i18n' ),
                    "-en": "ASV Membership type",
                    "-de": "ASV Membership type"
                },
                "NotificationType_E": {
                    "type": "String",
                    "required": true,
                    "list": Y.doccirrus.schemaloader.getSchemaTypeList( 'employee-schema.NotificationType_E', notificationTypeList )
                },
                "Employee_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "PHYSICIAN",
                            i18n: i18n( 'employee-schema.Employee_E.PHYSICIAN' ),
                            "-en": "Physician",
                            "-de": "Arzt"
                        },
                        {
                            "val": "PRACTICENURSE",
                            i18n: i18n( 'employee-schema.Employee_E.PRACTICENURSE' ),
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
                            i18n: i18n( 'employee-schema.Employee_E.OTHER' ),
                            "-en": "Other",
                            "-de": "Sonstige"
                        }
                    ],
                    i18n: i18n( 'employee-schema.Employee_T.type' ),
                    "-en": "type",
                    "-de": "type"
                },
                "PhysicianType_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "H_PHYSICIAN",
                            i18n: i18n( 'employee-schema.PhysicianType_E.H_PHYSICIAN.i18n' ),
                            "-en": "H-Physician",
                            "-de": "H-Arzt"
                        },
                        {
                            "val": "D_PHYSICIAN",
                            i18n: i18n( 'employee-schema.PhysicianType_E.D_PHYSICIAN.i18n' ),
                            "-en": "D-Physician",
                            "-de": "D-Arzt"
                        }
                    ],
                    i18n: i18n( 'employee-schema.Employee_T.physicianType.i18n' ),
                    "-en": "type",
                    "-de": "type"
                },
                "EmployeeLocations_T": {
                    _id: {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'employee-schema.EmployeeLocations_T._id' ),
                        "-en": "location id",
                        "-de": "Betriebsstätten ID"
                    },
                    locname: {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'employee-schema.EmployeeLocations_T.locname' ),
                        "-en": "location name",
                        "-de": "Betriebsstättenname"
                    }
                },
                "Group_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": userGroups.REDUCED_USER,
                            i18n: i18n( 'identity-schema.Group_E.REDUCED_USER' ),
                            "-en": i18n( 'identity-schema.Group_E.REDUCED_USER' ),
                            "-de": i18n( 'identity-schema.Group_E.REDUCED_USER' )
                        },
                        {
                            "val": userGroups.USER,
                            i18n: i18n( 'identity-schema.Group_E.USER' ),
                            "-en": "Mitarbeiter",
                            "-de": "Employee"
                        },
                        {
                            "val": userGroups.PHYSICIAN,
                            i18n: i18n( 'identity-schema.Group_E.PHYSICIAN' ),
                            "-en": "Physician",
                            "-de": "Arzt"
                        },
                        {
                            "val": userGroups.PHARMACIST,
                            i18n: i18n( 'identity-schema.Group_E.PHARMACIST' ),
                            "-en": "Pharmacist",
                            "-de": "ApothekerIn"
                        },
                        {
                            "val": userGroups.PHARMACY_STAFF,
                            i18n: i18n( 'identity-schema.Group_E.PHARMACY_STAFF' ),
                            "-en": "Pharmacy staff",
                            "-de": "Apo-MitarbeiterIn"
                        },
                        {
                            "val": userGroups.SUPERUSER,
                            i18n: i18n( 'identity-schema.Group_E.SUPERUSER' ),
                            "-en": "Mitarbeiter+",
                            "-de": "Employee+"
                        },
                        {
                            "val": userGroups.CONTROLLER,
                            i18n: i18n( 'identity-schema.Group_E.CONTROLLER' ),
                            "-en": "Controller",
                            "-de": "Controller"
                        },
                        {
                            "val": userGroups.ADMIN,
                            i18n: i18n( 'identity-schema.Group_E.ADMIN' ),
                            "-en": "Admin",
                            "-de": "Admin"
                        },
                        {
                            "val": userGroups.PARTNER,
                            i18n: i18n( 'identity-schema.Group_E.PARTNER' ),
                            "-en": i18n( 'identity-schema.Group_E.PARTNER' ),
                            "-de": i18n( 'identity-schema.Group_E.PARTNER' )
                        },
                        {
                            "val": userGroups.SUPPORT,
                            i18n: i18n( 'identity-schema.Group_E.SUPPORT' ),
                            "-en": i18n( 'identity-schema.Group_E.SUPPORT' ),
                            "-de": i18n( 'identity-schema.Group_E.SUPPORT' )
                        }
                    ],
                    i18n: i18n( 'identity-schema.Group_E.i18n' ),
                    "-en": "Group",
                    "-de": "Group"
                }
            }
        );

        /**
         * Gets weight of the group.
         * Some value which represents hierarchy of group rights
         * @param {String} groupName
         * @returns {number}
         */
        function getGroupWeight( groupName ) {

            if (groupName && typeof groupName === 'object' && groupName.group ){
                groupName = groupName.group;
            }

            var
                weight = 1;
            switch( groupName ) {
                case userGroups.SUPPORT:
                    weight = 7;
                    break;
                case userGroups.ADMIN:
                    weight = 6;
                    break;
                case userGroups.CONTROLLER:
                    weight = 5;
                    break;
                case userGroups.SUPERUSER:
                    weight = 4;
                    break;
                case userGroups.PHYSICIAN:
                    weight = 3;
                    break;
                case userGroups.PHARMACIST:
                    weight = 3;
                    break;
                case userGroups.USER:
                    weight = 2;
                    break;
                case userGroups.PHARMACY_STAFF:
                    weight = 2;
                    break;
                case userGroups.PARTNER:
                    weight = 2;
                    break;
                case userGroups.REDUCED_USER:
                    weight = 1;
            }
            return weight;
        }

        /**
         * Gets all groups which have less(equal) rights as user group(s)
         * @method getIncludedGroupsRights
         * @param {Array|String}groupsNames
         * @returns {Array}
         */
        function getIncludedGroupsRights( groupsNames ) {
            var
                groups = [],
                groupWeight = getGroupWeight();
            if( Array.isArray( groupsNames ) ) {
                groupsNames.forEach( function( groupName ) {
                    var
                        _groupWeight = getGroupWeight( groupName );
                    if( _groupWeight > groupWeight ) {
                        groupWeight = _groupWeight;
                    }
                } );
            } else {
                groupWeight = getGroupWeight( groupsNames );
            }

            Object.keys( userGroups ).forEach( function( _groupName ) {
                if( groupWeight >= getGroupWeight( _groupName ) ) {
                    groups.push( _groupName );
                }
            } );
            return groups;
        }

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,
            userGroups: userGroups,

            notificationTypeList: notificationTypeList,
            asvMembershipTypeTypeList: asvMembershipTypeTypeList,
            asvSpecializationsTypeList: asvSpecializationsTypeList,

            getGroupWeight: getGroupWeight,

            getIncludedGroupsRights: getIncludedGroupsRights,

            // reset some basic employee fields
            resetSupportEmployee: function resetSupportEmployee( mongooseObj ) {
                mongooseObj.isSupport = true;
                mongooseObj.type = 'OTHER';
                mongooseObj.lastname = 'Kundendienst';
                return mongooseObj;
            },

            // employee for support account
            getSupportEmployeeObj: function() {
                var
                    employee = {
                        isSupport: true,
                        officialNo: '',
                        type: 'OTHER',
                        from: null,
                        to: null,
                        employeeNo: '',
                        department: '',
                        bsnrs: [],
                        talk: 'MR',
                        memberOf: [
                            { "group": Y.doccirrus.schemas.employee.userGroups.SUPPORT },
                            { "group": Y.doccirrus.schemas.employee.userGroups.ADMIN }
                        ],
                        locations: [],
                        specialities: [],
                        addresses: [],
                        communications: [
                            { type: 'EMAILJOB', preferred: false, value: null }
                        ],
                        lastname: 'Kundendienst',
                        firstname: 'Doc-Cirrus',
                        prodServices: [],
                        accounts: [],
                        countryMode: ['D'],
                        fk3120: '',
                        middlename: '',
                        nameaffix: '',
                        skipcheck_: true
                    };
                return employee;
            },
            cacheQuery: true

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
