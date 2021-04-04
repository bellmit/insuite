/**
 * User: do
 * Date: 01/09/15  17:50
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'basecontact-schema', function( Y, NAME ) {
        /**
         * The basecontact schema,
         *
         * @module basecontact-schema, contains contacts
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {},
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Provides access to the basecontacts collection. Query documents by _id, officialNo and bsnrs like /2/basecontact/?officialNo=999999900"
                }
            },
            baseContactTypes = Object.freeze( {
                PRACTICE: 'PRACTICE',
                CLINIC: 'CLINIC',
                INSTITUTION: 'INSTITUTION',
                CARE: 'CARE',
                PHARMACY: 'PHARMACY',
                TRANSPORT: 'TRANSPORT',
                VENDOR: 'VENDOR', //Lieferant
                OTHER: 'OTHER',
                PHYSICIAN: 'PHYSICIAN',
                THERAPIST: 'THERAPIST',
                PERSON: 'PERSON',
                SUPPORT: 'SUPPORT'
            } );

        function createBaseContactTypeList() {
            var
                result = [];
            Object.keys( baseContactTypes ).forEach( function( type ) {
                result.push( {
                    val: baseContactTypes[type],
                    i18n: i18n( 'basecontact-schema.BaseContactType_E.' + baseContactTypes[type] + '.i18n' ),
                    '-en': i18n( 'basecontact-schema.BaseContactType_E.' + baseContactTypes[type] + '.i18n' ),
                    '-de': i18n( 'basecontact-schema.BaseContactType_E.' + baseContactTypes[type] + '.i18n' )
                } );
            } );

            return result;
        }

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "BaseContact_T",
                        "lib": types
                    },
                    "physicianContact": {
                        "complex": "ext",
                        "type": "PhysicianContact_T",
                        "apiv": {v: 2, queryParam: true},
                        "lib": types
                    },
                    "institutionContact": {
                        "complex": "ext",
                        "type": "InstitutionContact_T",
                        "lib": types
                    },
                    "SupportContact": {
                        "complex": "ext",
                        "type": "SupportContact_T",
                        "lib": types
                    },
                    "HasConnections": {
                        "complex": "ext",
                        "type": "HasContacts_T",
                        "lib": types
                    }
                },
                "BaseContact_T": {
                    "baseContactType": {
                        "complex": "eq",
                        "type": "BaseContactType_E",
                        "apiv": {v: 2, queryParam: true},
                        "lib": types,
                        "required": true,
                        "-de": "Kontakt-Typ",
                        i18n: i18n( 'basecontact-schema.BaseContact_T.baseContactType.i18n' ),
                        "-en": "Contact Type"
                    },
                    // contains baseContentType specific data that is set in pre process
                    "content": {
                        "type": "String",
                        i18n: i18n( 'basecontact-schema.BaseContact_T.content.i18n' ),
                        "-en": "Code",
                        "-de": "Kode"
                    },
                    "addresses": {
                        "complex": "inc",
                        "type": "Address_T",
                        "lib": 'person',
                        "override": true,
                        i18n: i18n( 'basecontact-schema.BaseContact_T.addresses.i18n' ),
                        "apiv": {v: 2, queryParam: false},
                        "-en": "addresses",
                        "-de": "Adressen"
                    },
                    "communications": {
                        "complex": "inc",
                        "type": "Communication_T",
                        "lib": 'person',
                        "override": true,
                        i18n: i18n( 'basecontact-schema.BaseContact_T.communications.i18n' ),
                        "-en": "communications",
                        "-de": "communications"
                    },
                    "talk": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'physician-schema.Physician_T.talk.i18n' ),
                        "-en": "Talk",
                        "-de": "Anrede"
                    },
                    "title": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.Person_T.title.i18n' ),
                        "-en": "Title",
                        "-de": "Akad. Titel"
                    },
                    "nameaffix": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.Person_T.nameaffix' ),
                        "-en": "Name Affix",
                        "-de": "Namenszusatz"
                    },
                    "firstname": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'person-schema.Person_T.firstname.i18n' ),
                        "-en": "First Name",
                        "-de": "Vorname"
                    },
                    "lastname": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'person-schema.Person_T.lastname.i18n' ),
                        "-en": "Last Name",
                        "-de": "Nachname"
                    },
                    "institutionType": {
                        "complex": "eq",
                        "type": "InstitutionContactType_E",
                        "apiv": {v: 2, queryParam: false},
                        "lib": types,
                        i18n: i18n( 'basecontact-schema.InstitutionContact_T.institutionType.i18n' ),
                        "-en": "institution type",
                        "-de": "Institutionstyp"
                    },
                    "lastChanged": {
                        "type": "Date",
                        i18n: i18n( 'UserMgmtMojit.lastChanged.i18n' ),
                        "-en": "last changed",
                        "-de": "zuletzt geändert"
                    },
                    "status": {
                        "complex": "eq",
                        "type": "StatusType_E",
                        "lib": types,
                        i18n: i18n( 'basecontact-schema.BaseContact_T.status.i18n' ),
                        "-en": "status",
                        "-de": "Status"
                    }
                },
                HasContacts_T: {
                    contacts: {
                        "type": ["ObjectId"],
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'basecontact-schema.BaseContact_T.contacts.i18n' ),
                        "-en": i18n( 'basecontact-schema.BaseContact_T.contacts.i18n' ),
                        "-de": i18n( 'basecontact-schema.BaseContact_T.contacts.i18n' )
                    }
                },
                "BaseContactType_E": {
                    "type": "String",
                    "apiv": {v: 2, queryParam: true},
                    "required": true,
                    "list": createBaseContactTypeList()
                },
                "PhysicianContact_T": {
                    "PhysicianContact_Base_T": {
                        "complex": "ext",
                        "type": "PhysicianContact_Base_T",
                        "lib": types
                    },
                    "PhysicianContact_D_T": {
                        "complex": "ext",
                        "type": "PhysicianContact_D_T",
                        "lib": types
                    },
                    "PhysicianContact_CH_T": {
                        "complex": "ext",
                        "type": "PhysicianContact_CH_T",
                        "lib": types
                    }
                },
                "PhysicianContact_Base_T": {
                    "bsnrs": {
                        "type": ["String"],
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'physician-schema.Physician_T.bsnrs.i18n' ),
                        "-en": "Practices (BSNRs)",
                        "-de": "(N)BSNR"
                    },
                    "expertise": {
                        "type": ["String"],
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'physician-schema.Physician_T.expertise.i18n' ),
                        "-en": "expertise",
                        "-de": "expertise"
                    },
                    "workDescription": {
                        "type": 'String',
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'physician-schema.Physician_T.workDescription.i18n' ),
                        "-en": "work description",
                        "-de": "Jobbezeichnung"
                    }
                },
                "PhysicianContact_D_T": {
                    "officialNo": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'physician-schema.Physician_T.officialNo.i18n' ),
                        "-en": "Lifetime Physician No",
                        "-de": "Lebenslange Arztnr."
                    },
                    "nonStandardOfficialNo": {
                        "type": "Boolean",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'physician-schema.Physician_T.nonStandardOfficialNo.i18n' ),
                        "-en": "Non-standard professional ID number",
                        "-de": "Ausnahmewert"
                    },
                    asvTeamNumbers: {
                        "type": [String],
                        i18n: i18n( 'patient-schema.Patient_T.asvTeamNumbers.i18n' ),
                        "-en": "asv team numbers",
                        "-de": "asv team numbers"
                    }
                },
                "PhysicianContact_CH_T": {
                    "ownZsrNumber": {
                        "type": "Boolean",
                        "default": false,
                        "apiv": {v: 2, queryParam: false},
                        "list": [
                            {
                                "val": true,
                                i18n: i18n( 'physician-schema.Physician_T.ownZsrNumber.TRUE.i18n' )
                            },
                            {
                                "val": false,
                                i18n: i18n( 'physician-schema.Physician_T.ownZsrNumber.FALSE.i18n' )
                            }
                        ]
                    },
                    "glnNumber": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "Physician_T_glnNumber",
                        i18n: i18n( 'physician-schema.Physician_T.glnNumber.i18n' )
                    },
                    "zsrNumber": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "Physician_T_zsrNumber",
                        i18n: i18n( 'physician-schema.Physician_T.zsrNumber.i18n' )
                    },
                    "kNumber": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "Physician_T_kNumber",
                        i18n: i18n( 'physician-schema.Physician_T.kNumber.i18n' )
                    }
                },
                "InstitutionContact_CH_T": {
                    "sendElectronicOrder": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'basecontact-schema.sendElectronicOrder.i18n' )
                    },
                    "isMainSupplier": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'basecontact-schema.InstitutionContact_CH_T.isMainSupplier.i18n' )
                    }
                },
                "InstitutionContact_T": {
                    "institutionName": {
                        "type": "String",
                        i18n: i18n( 'basecontact-schema.InstitutionContact_T.institutionName.i18n' ),
                        "-en": "Name of Institution",
                        "-de": "Name der Einrichtung"
                    },
                    "supplierCustomerId": {
                        "type": "String",
                        i18n: i18n( 'basecontact-schema.InstitutionContact_T.supplierCustomerId' ),
                        "-en": "Customer Id",
                        "-de": "Kundennummer"
                    },
                    "defaultFormId": {
                        "type": "ObjectId",
                        i18n: i18n( 'basecontact-schema.InstitutionContact_T.defaultFormId' ),
                        default: null,
                        "-en": "Default form",
                        "-de": "Standardformular"
                    },
                    "InstitutionContact_CH_T": {
                        "complex": "ext",
                        "type": "InstitutionContact_CH_T",
                        "lib": types
                    }
                },
                "InstitutionContactType_E": {
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    "default": "OTHER",
                    "list": [
                        {
                            "val": "SCHOOL",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.SCHOOL.i18n' ),
                            "-en": "school",
                            "-de": "Schule"
                        },
                        {
                            "val": "KINDERGARTEN",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.KINDERGARTEN.i18n' ),
                            "-en": "kindergarten",
                            "-de": "Kindergarten"
                        },
                        {
                            "val": "EMPLOYER",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.EMPLOYER.i18n' ),
                            "-en": "Employer",
                            "-de": "Arbeitgeber"
                        },
                        {
                            "val": "HOSPICE",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.HOSPICE.i18n' ),
                            "-en": "Hospice",
                            "-de": "Pflegeheim"
                        },
                        {
                            "val": "AMBULANT_HOSPICE",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.AMBULANT_HOSPICE.i18n' ),
                            "-en": "Ambulant Hospice",
                            "-de": "Ambulanter Pflegedienst"
                        },
                        {
                            "val": "FAMILY_MEMBERS",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.FAMILY_MEMBERS.i18n' ),
                            "-en": "Family Members",
                            "-de": "Familie/Angehörige"
                        },
                        {
                            "val": "GUARDIAN",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.GUARDIAN.i18n' ),
                            "-en": "Guardian",
                            "-de": "Rechtlicher Betreuer"
                        },
                        {
                            "val": "FAMILY_DOCTOR",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.FAMILY_DOCTOR.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.FAMILY_DOCTOR.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.FAMILY_DOCTOR.i18n' )
                        },
                        {
                            "val": "SPECIALIST",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.SPECIALIST.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.SPECIALIST.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.SPECIALIST.i18n' )
                        },
                        {
                            "val": "ERGO",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.ERGO.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.ERGO.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.ERGO.i18n' )
                        },
                        {
                            "val": "LOGO",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.LOGO.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.LOGO.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.LOGO.i18n' )
                        },
                        {
                            "val": "PHYSIO",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.PHYSIO.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.PHYSIO.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.PHYSIO.i18n' )
                        },
                        {
                            "val": "MANUELL",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.MANUELL.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.MANUELL.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.MANUELL.i18n' )
                        },
                        {
                            "val": "PHYCHO",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.PHYCHO.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.PHYCHO.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.PHYCHO.i18n' )
                        },
                        {
                            "val": "OSTEOPATH",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.OSTEOPATH.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.OSTEOPATH.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.OSTEOPATH.i18n' )
                        },
                        {
                            "val": "OTHER",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.OTHER.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.OTHER.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.OTHER.i18n' )
                        }
                    ]
                },
                "StatusType_E": {
                    "type": "String",
                    "default": "ACTIVE",
                    "list": [
                        {
                            "val": "ACTIVE",
                            i18n: i18n( 'basecontact-schema.StatusType_E.ACTIVE.i18n' ),
                            "-en": "active",
                            "-de": "aktiv"
                        },
                        {
                            "val": "INACTIVE",
                            i18n: i18n( 'basecontact-schema.StatusType_E.INACTIVE.i18n' ),
                            "-en": "deactivated",
                            "-de": "deaktiviert"
                        }
                    ]
                },
                "Expert_E": {
                    "type": "string",
                    "list": [
                        {
                            "val": "GP",
                            i18n: i18n( 'physician-schema.Expert_E.GP' ),
                            "-en": "GP",
                            "-de": "Allgemeinmediziner"
                        },
                        {
                            "val": "INTERNAL",
                            i18n: i18n( 'physician-schema.Expert_E.INTERNAL' ),
                            "-en": "Physician",
                            "-de": "Internist"
                        },
                        {
                            "val": "SURGEON",
                            i18n: i18n( 'physician-schema.Expert_E.SURGEON' ),
                            "-en": "Surgeon",
                            "-de": "Chirurg"
                        },
                        {
                            "val": "ORTHOPAEDIC",
                            i18n: i18n( 'physician-schema.Expert_E.ORTHOPAEDIC' ),
                            "-en": "Orthopaedic Sp.",
                            "-de": "Orthopaede"
                        },
                        {
                            "val": "RADIOLOGIST",
                            i18n: i18n( 'physician-schema.Expert_E.RADIOLOGIST' ),
                            "-en": "Radiologist",
                            "-de": "Radiologe"
                        },
                        {
                            "val": "UROLOGIST",
                            i18n: i18n( 'physician-schema.Expert_E.UROLOGIST' ),
                            "-en": "Urologist",
                            "-de": "Urologe"
                        },
                        {
                            "val": "ENT",
                            i18n: i18n( 'physician-schema.Expert_E.ENT' ),
                            "-en": "ENT Sp.",
                            "-de": "Hno"
                        },
                        {
                            "val": "PAEDIATRICIAN",
                            i18n: i18n( 'physician-schema.Expert_E.PAEDIATRICIAN' ),
                            "-en": "Paediatrician",
                            "-de": "Kinderarzt"
                        },
                        {
                            "val": "VET",
                            i18n: i18n( 'physician-schema.Expert_E.VET' ),
                            "-en": "Veterinarian",
                            "-de": "Tierarzt"
                        },
                        {
                            "val": "PSYCHOLOGIST",
                            i18n: i18n( 'physician-schema.Expert_E.PSYCHOLOGIST' ),
                            "-en": "Psychologist",
                            "-de": "Psychologe"
                        },
                        {
                            "val": "GYNAECOLOGIST",
                            i18n: i18n( 'physician-schema.Expert_E.GYNAECOLOGIST' ),
                            "-en": "Gynaecologist",
                            "-de": "Gynaekologe"
                        },
                        {
                            "val": "ANAESTHETIST",
                            i18n: i18n( 'physician-schema.Expert_E.ANAESTHETIST' ),
                            "-en": "Anaesthetist",
                            "-de": "Anaesthesist"
                        },
                        {
                            "val": "DERMATOLOGIST",
                            i18n: i18n( 'physician-schema.Expert_E.DERMATOLOGIST' ),
                            "-en": i18n( 'physician-schema.Expert_E.DERMATOLOGIST' ),
                            "-de": i18n( 'physician-schema.Expert_E.DERMATOLOGIST' )
                        },
                        {
                            "val": "PLASTIC_SURGEON",
                            i18n: i18n( 'physician-schema.Expert_E.PLASTIC_SURGEON' ),
                            "-en": i18n( 'physician-schema.Expert_E.PLASTIC_SURGEON' ),
                            "-de": i18n( 'physician-schema.Expert_E.PLASTIC_SURGEON' )
                        },
                        {
                            "val": "UNKNOWN",
                            i18n: i18n( 'physician-schema.Expert_E.UNKNOWN' ),
                            "-en": "Unknown",
                            "-de": "Unbekannt"
                        }
                    ]
                },
                "SupportContact_T": {
                    "companyName": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'physician-schema.SupportContact_T.companyName.i18n' )
                    }
                }

            }
        );

        function generateContent( basecontact ) {
            var content = '';

            function concat() {
                var i, str = '', el, len = arguments.length;

                for( i = 0; i < len; i++ ) {
                    el = arguments[i];
                    if( !el ) {
                        continue;
                    }
                    str += (str.length ? ' ' : '') + el;
                }

                return str;
            }

            if( isMedicalPersonType( basecontact.baseContactType ) ) {
                content += concat( basecontact.firstname, basecontact.lastname );
            } else if( isOrganizationType( basecontact.baseContactType ) ) {
                content = basecontact.institutionName;
            } else {
                content += concat( basecontact.firstname, basecontact.lastname );
            }
            return content;
        }

        function getMedicalPersonTypes() {
            return [baseContactTypes.PHYSICIAN, baseContactTypes.THERAPIST, baseContactTypes.PERSON];
        }

        function getOrganizationTypes() {
            return [
                baseContactTypes.PRACTICE,
                baseContactTypes.INSTITUTION,
                baseContactTypes.CLINIC,
                baseContactTypes.CARE,
                baseContactTypes.PHARMACY,
                baseContactTypes.VENDOR,
                baseContactTypes.TRANSPORT,
                baseContactTypes.OTHER
            ];
        }

        function isOrganizationType( type ) {
            var
                institutionTypes = getOrganizationTypes();
            return -1 !== institutionTypes.indexOf( type );
        }

        function isMedicalPersonType( type ) {
            var
                medicalPersonTypes = getMedicalPersonTypes();
            return -1 !== medicalPersonTypes.indexOf( type );
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            indexes: [
                {
                    key: {
                        _id: 1,
                        content: 1,
                        baseContactType: 1
                    },
                    indexType: {collation: {locale: 'de', numericOrdering: true}}
                }
            ],
            ramlConfig: ramlConfig,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [],
            name: NAME,
            generateContent: generateContent,
            baseContactTypes: baseContactTypes,
            getMedicalPersonTypes: getMedicalPersonTypes,
            isMedicalPersonType: isMedicalPersonType,
            isOrganizationType: isOrganizationType,
            getOrganizationTypes: getOrganizationTypes
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'person-schema',
            'countrymode-schema'
        ]
    }
);
