/**
 * User: rrrw
 * Date: 27/12/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, YUI_config */

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'person-schema', function( Y, NAME ) {
        'use strict';
        /**
         * The DC Patient data schema definition
         *
         * @module DCPatient
         */

        var

        // ---------- validation functions -------
        // are included from the  Y.doccirrus.validations  library

        // ------- Schema definitions  -------

            types = {},
            jobStatusTypes = Object.freeze( {
                EMPLOYEE: 'EMPLOYEE',
                INDEPENDENT: 'INDEPENDENT',
                PENSIONER: 'PENSIONER',
                JOBSEEKING: 'JOBSEEKING',
                OTHERS: 'OTHERS'
            } ),
            i18n = Y.doccirrus.i18n,
            moment = Y.doccirrus.commonutils.getMoment(),
            countryMode = Y.doccirrus.commonutils.isClientSide() ? YUI_config.doccirrus.Env.countryMode : undefined;

        types = Y.mix( types, {
                "Domain": "Persona",
                "AddressKind_E": {
                    "type": "String",
                    i18n: i18n( 'person-schema.AddressKind_E.i18n' ),
                    "apiv": {v: 2, queryParam: false},
                    "-en": "kind",
                    "-de": "Adresstyp",
                    "list": [
                        {
                            "val": "OFFICIAL",
                            i18n: i18n( 'person-schema.AddressKind_E.OFFICIAL' ),
                            "-en": "Official",
                            "-de": "Offizielle"
                        },
                        {
                            "val": "POSTBOX",
                            i18n: i18n( 'person-schema.AddressKind_E.POSTBOX' ),
                            "-en": "Postbox",
                            "-de": "Postfach"
                        },
                        {
                            "val": "POSTAL",
                            i18n: i18n( 'person-schema.AddressKind_E.POSTAL' ),
                            "-en": "Postal",
                            "-de": "Postadresse"
                        },
                        {
                            "val": "BILLING",
                            i18n: i18n( 'person-schema.AddressKind_E.BILLING' ),
                            "-en": "Billing",
                            "-de": "Rechnungsadresse"
                        },
                        {
                            "val": "VISIT",
                            i18n: i18n( 'person-schema.AddressKind_E.VISIT' ),
                            "-en": "Visit",
                            "-de": "Besuchsadresse"
                        },
                        {
                            "val": "BRANCH",
                            i18n: i18n( 'person-schema.AddressKind_E.BRANCH' ),
                            "-en": "Branch",
                            "-de": "Niederlassung"
                        },
                        {
                            "val": "EMPLOYER",
                            i18n: i18n( 'person-schema.AddressKind_E.EMPLOYER' ),
                            "-en": "Employer",
                            "-de": "Arbeitgeber"
                        }
                    ]
                },
                "RelationByLaw_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "CONTACT",
                            i18n: i18n( 'person-schema.RelationByLaw_E.CONTACT' ),
                            "-en": "contact",
                            "-de": "contact"
                        },
                        {
                            "val": "LAWNO",
                            i18n: i18n( 'person-schema.RelationByLaw_E.LAWNO' ),
                            "-en": "lawno",
                            "-de": "lawno"
                        },
                        {
                            "val": "CONTACTBYLAW",
                            i18n: i18n( 'person-schema.RelationByLaw_E.CONTACTBYLAW' ),
                            "-en": "contactbylaw",
                            "-de": "contactbylaw"
                        }
                    ],
                    i18n: i18n( 'person-schema.RelationByLaw_E.i18n' )
                },
                "BankAccount_T": {
                    "cardType": {
                        "complex": "eq",
                        "type": "CardType_E",
                        "lib": types,
                        i18n: i18n( 'person-schema.BankAccount_T.cardType' ),
                        "-en": "cardType",
                        "-de": "cardType"
                    },
                    "bankName": {
                        "validate": "BankAccount_T_bankName",
                        "type": "String",
                        i18n: i18n( 'person-schema.BankAccount_T.bankName' ),
                        "-en": "Bank Bnstitution",
                        "-de": "Bankinstitut"
                    },
                    "trial": {
                        "validate": "BankAccount_T_trial",
                        "type": "Number",
                        i18n: i18n( 'person-schema.BankAccount_T.trial' ),
                        "-en": "trial",
                        "-de": "trial"
                    },
                    "bankIBAN": {
                        "validate": "BankAccount_T_bankIBAN",
                        "type": "String",
                        i18n: i18n( 'person-schema.BankAccount_T.bankIBAN' ),
                        "-en": "Account Number / IBAN",
                        "-de": "Kontonummer / IBAN"
                    },
                    "bankBIC": {
                        "validate": "BankAccount_T_bankBIC",
                        "type": "String",
                        i18n: i18n( 'person-schema.BankAccount_T.bankBIC' ),
                        "-en": "Routing Number / BIC",
                        "-de": "Bankleitzahl / BIC"
                    },
                    "accountOwner": {
                        "validate": "BankAccount_T_accountOwner",
                        "type": "String",
                        i18n: i18n( 'person-schema.BankAccount_T.accountOwner' ),
                        "-en": "Account Owner",
                        "-de": "Kontoinhaber"
                    },
                    "cardNo": {
                        "validate": "BankAccount_T_cardNo",
                        "type": "String",
                        i18n: i18n( 'person-schema.BankAccount_T.cardNo' ),
                        "-en": "cardNo",
                        "-de": "cardNo"
                    },
                    "cardCheckCode": {
                        "validate": "BankAccount_T_cardCheckCode",
                        "type": "String",
                        i18n: i18n( 'person-schema.BankAccount_T.cardCheckCode' ),
                        "-en": "cardCheckCode",
                        "-de": "cardCheckCode"
                    },
                    "cardValidToMonth": {
                        "validate": "BankAccount_T_cardValidToMonth",
                        "type": "Number",
                        i18n: i18n( 'person-schema.BankAccount_T.cardValidToMonth' ),
                        "-en": "cardValidToMonth",
                        "-de": "cardValidToMonth"
                    },
                    "cardValidToYear": {
                        "validate": "BankAccount_T_cardValidToYear",
                        "type": "Number",
                        i18n: i18n( 'person-schema.BankAccount_T.cardValidToYear' ),
                        "-en": "cardValidToYear",
                        "-de": "cardValidToYear"
                    },
                    "debitAllowed": {
                        "type": "Boolean",
                        i18n: i18n( 'person-schema.BankAccount_T.debitAllowed' ),
                        "-en": "debitAllowed",
                        "-de": "debitAllowed"
                    },
                    "isOptional": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'person-schema.BankAccount_T.isOptional' ),
                        "-en": "isOptional",
                        "-de": "isOptional"
                    }

                },
                "BankAccount_CH_T": {
                   "esrNumber": {
                       "type": "String",
                       i18n: i18n('person-schema.BankAccount_CH_T.esrNumber.i18n'),
                       "validate": "BankAccount_CH_T_esrNumber"
                   }
                },
                "Affiliate_T": {
                    "relType": {
                        "complex": "eq",
                        "type": "Relation_E",
                        "lib": types,
                        i18n: i18n( 'person-schema.Affiliate_T.relType' ),
                        "-en": "relType",
                        "-de": "relType"
                    },
                    "relByLaw": {
                        "complex": "eq",
                        "type": "RelationByLaw_E",
                        "lib": types,
                        i18n: i18n( 'person-schema.Affiliate_T.relByLaw' ),
                        "-en": "relByLaw",
                        "-de": "relByLaw"
                    },
                    "affiliate": {
                        "type": "String",
                        "future": "juristicperson.foreignkey",
                        i18n: i18n( 'person-schema.Affiliate_T.affiliate' ),
                        "-en": "affiliate",
                        "-de": "affiliate"
                    }
                },
                "Relation_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "MOTHER",
                            i18n: i18n( 'person-schema.Relation_E.MOTHER' ),
                            "-en": "mother",
                            "-de": "mother"
                        },
                        {
                            "val": "FATHER",
                            i18n: i18n( 'person-schema.Relation_E.FATHER' ),
                            "-en": "father",
                            "-de": "father"
                        },
                        {
                            "val": "CHILD",
                            i18n: i18n( 'person-schema.Relation_E.CHILD' ),
                            "-en": "child",
                            "-de": "child"
                        },
                        {
                            "val": "BROTHER",
                            i18n: i18n( 'person-schema.Relation_E.BROTHER' ),
                            "-en": "brother",
                            "-de": "brother"
                        },
                        {
                            "val": "SISTER",
                            i18n: i18n( 'person-schema.Relation_E.SISTER' ),
                            "-en": "sister",
                            "-de": "sister"
                        },
                        {
                            "val": "GRANDMA",
                            i18n: i18n( 'person-schema.Relation_E.GRANDMA' ),
                            "-en": "grandma",
                            "-de": "grandma"
                        },
                        {
                            "val": "GRANDPA",
                            i18n: i18n( 'person-schema.Relation_E.GRANDPA' ),
                            "-en": "grandpa",
                            "-de": "grandpa"
                        },
                        {
                            "val": "FRIEND",
                            i18n: i18n( 'person-schema.Relation_E.FRIEND' ),
                            "-en": "friend",
                            "-de": "friend"
                        },
                        {
                            "val": "OTHER",
                            i18n: i18n( 'person-schema.Relation_E.OTHER' ),
                            "-en": "other",
                            "-de": "other"
                        }
                    ],
                    i18n: i18n( 'person-schema.Relation_E.i18n' )
                },
                "Communication_E": {
                    "validate": "Communication_T_type",
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    "required": true,
                    "version": 1,
                    "list": [
                        {
                            "val": "PHONEPRIV",
                            i18n: i18n( 'person-schema.Communication_E.PHONEPRIV' ),
                            "-en": "Home Phone",
                            "-de": "Telefon (privat)"
                        },
                        {
                            "val": "FAXPRIV",
                            i18n: i18n( 'person-schema.Communication_E.FAXPRIV' ),
                            "-en": "Home Fax",
                            "-de": "Fax (privat)"
                        },
                        {
                            "val": "MOBILEPRIV",
                            i18n: i18n( 'person-schema.Communication_E.MOBILEPRIV' ),
                            "-en": "Personal Mobile",
                            "-de": "Handy (privat)"
                        },
                        {
                            "val": "PHONEJOB",
                            i18n: i18n( 'person-schema.Communication_E.PHONEJOB' ),
                            "-en": "Work Phone",
                            "-de": "Telefon (beruflich)"
                        },
                        {
                            "val": "FAXJOB",
                            i18n: i18n( 'person-schema.Communication_E.FAXJOB' ),
                            "-en": "Work Fax",
                            "-de": "Fax (beruflich)"
                        },
                        {
                            "val": "MOBILEJOB",
                            i18n: i18n( 'person-schema.Communication_E.MOBILEJOB' ),
                            "-en": "Work Mobile",
                            "-de": "Handy (beruflich)"
                        },
                        {
                            "val": "EMAILPRIV",
                            i18n: i18n( 'person-schema.Communication_E.EMAILPRIV' ),
                            "-en": "Personal email",
                            "-de": "E-Mail (privat)"
                        },
                        {
                            "val": "EMAILJOB",
                            i18n: i18n( 'person-schema.Communication_E.EMAILJOB' ),
                            "-en": "Work email",
                            "-de": "E-Mail (beruflich)"
                        },
                        {
                            "val": "FACEBOOK",
                            i18n: i18n( 'person-schema.Communication_E.FACEBOOK' ),
                            "-en": "Facebook",
                            "-de": "Facebook"
                        },
                        {
                            "val": "GOOGLE",
                            i18n: i18n( 'person-schema.Communication_E.GOOGLE' ),
                            "-en": "GooglePlus",
                            "-de": "GooglePlus"
                        },
                        {
                            "val": "OTHER",
                            i18n: i18n( 'person-schema.Communication_E.OTHER' ),
                            "-en": "Other",
                            "-de": "Sonstige"

                        },
                        {
                            "val": "LINKEDIN",
                            i18n: i18n( 'person-schema.Communication_E.LINKEDIN' ),
                            "-en": "LinkedIn",
                            "-de": "LinkedIn"
                        },
                        {
                            "val": "XING",
                            i18n: i18n( 'person-schema.Communication_E.XING' ),
                            "-en": "Xing",
                            "-de": "Xing"
                        },
                        {
                            "val": "URL",
                            i18n: i18n( 'person-schema.Communication_E.URL' ),
                            "-en": i18n( 'person-schema.Communication_E.URL' ),
                            "-de": i18n( 'person-schema.Communication_E.URL' )
                        },
                        {
                            "val": "PHONEEXT",
                            i18n: i18n( 'person-schema.Communication_E.PHONEEXT' ),
                            "-en": "Phone Extension",
                            "-de": "Telefon (Nebenstelle)"
                        },
                        {
                            "val": "PHONEEMERGENCY",
                            i18n: i18n( 'person-schema.Communication_E.PHONEEMERGENCY' )
                        }
                    ],
                    i18n: i18n( 'person-schema.Communication_E.i18n' ),
                    "-en": "Type",
                    "-de": "Typ"
                },
                "Communication_T": {
                    "type": {
                        "complex": "eq",
                        "type": "Communication_E",
                        "apiv": {v: 2, queryParam: false},
                        "lib": types,
                        i18n: i18n( 'person-schema.Communication_T.type' ),
                        "-en": "Contact Type",
                        "-de": "Kontakttyp"
                    },
                    "preferred": {
                        "type": "Boolean",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.Communication_T.preferred' ),
                        "-en": "Preferred",
                        "-de": "Bevorzugt"
                    },
                    "value": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.Communication_T.value.i18n' ),
                        "-en": "Value",
                        "-de": "Inhalt",
                        "required": true,
                        "validate": "Communication_T_value"
                    },
                    "note": {
                        "type": "String",
                        i18n: i18n( 'person-schema.Communication_T.note' ),
                        "apiv": {v: 2, queryParam: false},
                        "-de": "Notiz",
                        "-en": "Note"
                    },
                    "signaling": {
                        "default": true,
                        "type": "Boolean",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.Communication_T.signaling' ),
                        "-en": "Signaling",
                        "-de": "Signalisierung"
                    },
                    "confirmed": {
                        "default": false,
                        "type": "Boolean",
                        "apiv": {v: 2, queryParam: false},
                        "-en": "confirmed",
                        "-de": "confirmed"
                    },
                    "confirmNeeded": {
                        "default": false,
                        "type": "Boolean",
                        "apiv": {v: 2, queryParam: false},
                        "-en": "confirmNeeded",
                        "-de": "confirmNeeded"
                    }

                },
                // Here we only use the German cultural norm
                // For other cultures, we will need a clever lookup
                // For more details see: MOJ-1644
                "Talk_E": {
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    "version": 1,
                    "list": [
                        {
                            "val": "MR",
                            i18n: i18n( 'person-schema.Talk_E.MR' ),
                            "-en": "Mr.",
                            "-de": "Herr"
                        },
                        {
                            "val": "MS",
                            i18n: i18n( 'person-schema.Talk_E.MS' ),
                            "-en": "Ms.",
                            "-de": "Frau"
                        },
                        {
                            "val": "NONE",
                            i18n: i18n( 'person-schema.Talk_E.NONE' ),
                            "-en": "",
                            "-de": ""
                        }
                    ],
                    i18n: i18n( 'person-schema.Talk_E.i18n' )
                },
                "Gender_E": {
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    "version": 1,
                    "list": [
                        {
                            "val": "UNKNOWN",
                            i18n: i18n( 'person-schema.Gender_E.UNKNOWN' ),
                            "-en": "Unknown",
                            "-de": "Unbekannt"
                        },
                        {
                            "val": "UNDEFINED",
                            i18n: i18n( 'person-schema.Gender_E.UNDEFINED' ),
                            "-en": "Undefined",
                            "-de": "Unbestimmt"
                        },
                        {
                            "val": "VARIOUS",
                            i18n: i18n( 'person-schema.Gender_E.VARIOUS' ),
                            "-en": "Various",
                            "-de": "Divers"
                        },
                        {
                            "val": "MALE",
                            i18n: i18n( 'person-schema.Gender_E.MALE' ),
                            "-en": "Male",
                            "-de": "Männlich"
                        },
                        {
                            "val": "FEMALE",
                            i18n: i18n( 'person-schema.Gender_E.FEMALE' ),
                            "-en": "Female",
                            "-de": "Weiblich"
                        }
                    ],
                    i18n: i18n( 'person-schema.Gender_E.i18n' ),
                    "-en": "Sex",
                    "-de": "Geschlecht"
                },
                // reduced gender list for edmp activities. UNKNOWN should be mapped to UNDEFINED
                "DmpGender_E": {
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    "version": 1,
                    "hint": "Eine Angabe zum Geschlecht des teilnehmenden Patienten ist verpflichtend.",
                    "validate": "kbv.DMP_BASE_dmpGender",
                    "list": [
                        {
                            "val": "",
                            "-de": "Bitte wählen …",
                            i18n: i18n( 'activity-schema.ObservationTherapyStatus_E.' ),
                            "-en": "Please Choose …"
                        },
                        {
                            "val": "MALE",
                            i18n: i18n( 'person-schema.Gender_E.MALE' ),
                            "-en": "Male",
                            "-de": "Männlich"
                        },
                        {
                            "val": "FEMALE",
                            i18n: i18n( 'person-schema.Gender_E.FEMALE' ),
                            "-en": "Female",
                            "-de": "Weiblich"
                        },
                        {
                            "val": "VARIOUS",
                            i18n: i18n( 'person-schema.Gender_E.VARIOUS' ),
                            "-en": "Various",
                            "-de": "Divers"
                        },
                        {
                            "val": "UNDEFINED",
                            i18n: i18n( 'person-schema.Gender_E.UNDEFINED' ),
                            "-en": "Undefined",
                            "-de": "Unbestimmt"
                        }
                    ],
                    i18n: i18n( 'person-schema.Gender_E.i18n' ),
                    "-en": "Sex",
                    "-de": "Geschlecht"
                },
                "JobStatus_E": {
                    'type': 'string',
                    'list': createJobStatusTypeList(),
                    i18n: i18n( 'person-schema.JobStatus_E.i18n' )
                },
                "CivilStatus_E": {
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    "version": 1,
                    "list": [
                        {
                            "val": "SINGLE",
                            i18n: i18n( 'person-schema.CivilStatus_E.SINGLE' ),
                            "-en": "Single",
                            "-de": "Single"
                        },
                        {
                            "val": "MARRIED",
                            i18n: i18n( 'person-schema.CivilStatus_E.MARRIED' ),
                            "-en": "Married",
                            "-de": "Verheiratet"
                        },
                        {
                            "val": "DIVORCED",
                            i18n: i18n( 'person-schema.CivilStatus_E.DIVORCED' ),
                            "-en": "Divorced",
                            "-de": "Geschieden"
                        },
                        {
                            "val": "UNKNOWN",
                            i18n: i18n( 'person-schema.CivilStatus_E.UNKNOWN' ),
                            "-en": "Unknown",
                            "-de": "Unbekannt"
                        }
                    ],
                    i18n: i18n( 'person-schema.CivilStatus_E.i18n' )
                },
                "PersGroup_E": {
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    "version": 1,
                    i18n: i18n( 'person-schema.InsuranceStatus_T.persGroup' ),
                    "-en": i18n( 'person-schema.InsuranceStatus_T.persGroup' ),
                    "-de": i18n( 'person-schema.InsuranceStatus_T.persGroup' ),
                    "list": [
                        {
                            val: '',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.0' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.0' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.0' )
                        },
                        {
                            val: '4',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.4' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.4' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.4' )
                        },
                        {
                            val: '6',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.6' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.6' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.6' )
                        },
                        {
                            val: '7',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.7' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.7' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.7' )
                        },
                        {
                            val: '8',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.8' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.8' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.8' )
                        },
                        {
                            val: '9',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.9' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.9' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.PersGroup_E.9' )
                        }
                    ]
                },
                "DMP_E": {
                    "type": "String",
                    "apiv": {v: 2, queryParam: false},
                    "version": 1,
                    i18n: i18n( 'person-schema.InsuranceStatus_T.dmp' ),
                    "-en": i18n( 'person-schema.InsuranceStatus_T.dmp' ),
                    "-de": "DMP-Kennzeichen",
                    "list": [
                        {
                            val: '',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.DMP_E.0' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.DMP_E.0' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.DMP_E.0' )
                        },
                        {
                            val: '1',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.DMP_E.1' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.DMP_E.1' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.DMP_E.1' )
                        },
                        {
                            val: '2',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.DMP_E.2' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.DMP_E.2' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.DMP_E.2' )
                        },
                        {
                            val: '3',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.DMP_E.3' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.DMP_E.3' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.DMP_E.3' )
                        },
                        {
                            val: '4',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.DMP_E.4' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.DMP_E.4' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.DMP_E.4' )
                        },
                        {
                            val: '5',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.DMP_E.5' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.DMP_E.5' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.DMP_E.5' )
                        },
                        {
                            val: '6',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.DMP_E.6' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.DMP_E.6' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.DMP_E.6' )
                        },
                        {
                            val: '7',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.DMP_E.7' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.DMP_E.7' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.DMP_E.7' )
                        },
                        {
                            val: '8',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.DMP_E.8' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.DMP_E.8' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.DMP_E.8' )
                        },
                        {
                            val: '9',
                            i18n: i18n( 'person-schema.InsuranceStatus_T.DMP_E.9' ),
                            "-de": i18n( 'person-schema.InsuranceStatus_T.DMP_E.9' ),
                            "-en": i18n( 'person-schema.InsuranceStatus_T.DMP_E.9' )
                        }
                    ]
                },
                "InsuranceStatus_T": {
                    "insuranceNo": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        "validate": "kbv.InsuranceStatus_T_insuranceNo",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.insuranceNo' ),
                        "-en": "Insurance No.",
                        "-de": "Versicherten-Nr.",
                        "-de-ch": 'Versicherten-Nr.',
                        "rule-engine": {}
                    },
                    "kvkHistoricalNo": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.kvkHistoricalNo' ),
                        "-en": "KVK Historical No.",
                        "-de": "KVK Versichertennummer"
                    },
                    "insuranceId": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.InsuranceStatus_T_insuranceId",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.insuranceId' ),
                        "-en": "Insurance ID",
                        "-de": "IKNR",
                        "-de-ch": "Kasse",
                        "rule-engine": {}
                    },
                    "daleUvInsuranceId": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.insuranceId' ),
                        "-en": "Insurance ID",
                        "-de": "IKNR"
                    },
                    "insuranceName": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.insuranceName' ),
                        "-en": "Insurance",
                        "-de": "Kasse",
                        "rule-engine": {
                            i18n: i18n( 'person-schema.ruleengine.insuranceName' )
                        }
                    },
                    "daleUvInsuranceName": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.insuranceName' ),
                        "-en": "Insurance",
                        "-de": "Kasse"
                    },
                    "insurancePrintName": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.insurancePrintName' ),
                        "-en": "Print Name",
                        "-de": "Bedruckungsname"
                    },
                    "insuranceCountry": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.insuranceCountry' ),
                        "-en": "Insurance From",
                        "-de": "Kostenträgersitz"
                    },
                    "insuranceGrpId": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false, countryMode: ["D"] },
                        "validate": "kbv.InsuranceStatus_T_insuranceGrpId",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.insuranceGrpId' ),
                        "-en": "VKNR",
                        "-de": "VKNR",
                        "rule-engine": {}
                    },
                    "paidFreeTo": {
                        "type": "Date",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.InsuranceStatus_T_paidFreeTo",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.paidFreeTo' ),
                        "-en": "toll-free to date",
                        "-de": "gebührenbefreit bis Datum"
                    },
                    "type": {
                        "complex": "eq",
                        "type": "Insurance_E",
                        "apiv": {v: 2, queryParam: false},
                        "lib": types
                    },
                    "billingFactor": {
                        "complex": "eq",
                        "type": "BillingFactor_E",
                        "apiv": {v: 2, queryParam: false, countryMode: ["D"] },
                        "lib": types,
                        i18n: i18n( 'person-schema.InsuranceStatus_T.billingFactor' ),
                        "-en": "billing factor",
                        "-de": "Rechnungsfaktor"
                    },
                    "mobileEgkId": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.mobileEgkId' ),
                        "-en": "mobileEgkId",
                        "-de": "mobileEgkId"
                    },
                    "cdmVersion": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.cdmVersion' ),
                        "-en": "CDM Version",
                        "-de": "CDM Version"
                    },
                    /**
                     * @deprecated since Q1 2019
                     */
                    "cardTypeGeneration": {
                        "complex": "eq",
                        "type": "HealthCardGeneration_E",
                        "apiv": {v: 2, queryParam: false},
                        "lib": types
                    },
                    "cardType": {
                        "complex": "eq",
                        "type": "HealthCardType_E",
                        "apiv": {v: 2, queryParam: false},
                        "lib": types
                    },
                    "terminalType": {
                        "complex": "eq",
                        "type": "CardTerminalType_E",
                        "apiv": {v: 2, queryParam: false},
                        "lib": types
                    },
                    "fk4108": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false, countryMode: ["D"] },
                        i18n: i18n( 'person-schema.InsuranceStatus_T.fk4108' ),
                        "-en": "licence number",
                        "-de": "Zulassungsnummer"
                    },
                    "cardSwipe": {
                        "type": "Date",
                        "apiv": {v: 2, queryParam: false, readOnly: true, countryMode: ["D"] },
                        "validate": "kbv.InsuranceStatus_T_cardSwipe",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.cardSwipe' ),
                        "-en": "Last eGK Reading",
                        "-de": "Karte gelesen",
                        "rule-engine": {}
                    },
                    "cardValidTo": {
                        "type": "Date",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.InsuranceStatus_T_cardValidTo",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.cardValidTo' ),
                        "-en": "Card Valid To",
                        "-de": "Karte gültig bis"
                    },
                    "fk4133": {
                        "default": "",
                        "type": "Date",
                        "apiv": {v: 2, queryParam: false, countryMode: ["D"] },
                        "validate": "kbv.InsuranceStatus_T_fk4110",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.fk4133' ),
                        "-en": "Insurance Coverage Beginning",
                        "-de": "Versicherungsschutz Beginn"
                    },
                    "fk4110": {
                        "default": "",
                        "type": "Date",
                        "apiv": {v: 2, queryParam: false, countryMode: ["D"] },
                        "validate": "kbv.InsuranceStatus_T_fk4110",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.fk4110' ),
                        "-en": "Insurance Coverage Ending",
                        "-de": "Versicherungsschutz Ende"
                    },
                    "policyHolder": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.InsuranceStatus_T_policyHolder",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.policyHolder' ),
                        "-en": "Policy Holder",
                        "-de": "Versicherter"
                    },
                    "policyDob": {
                        "type": "Date",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.InsuranceStatus_T_policyDob",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.policyDob' ),
                        "-en": "Birthday of Policy Holder",
                        "-de": "Geburtsdatum des Versicherten"
                    },
                    "insuranceKind": {
                        "default": "",
                        "validate": "kbv.InsuranceStatus_T_insuranceKind",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.insuranceKind' ),
                        "-en": "Insurance Kind",
                        "-de": "Versichertenart"
                    },
                    "persGroup": {
                        "default": "",
                        "complex": "eq",
                        "type": "PersGroup_E",
                        "apiv": {v: 2, queryParam: false, countryMode: ["D"] },
                        "lib": types,
                        "validate": "kbv.InsuranceStatus_T_persGroup"
                    },
                    "dmp": {
                        "default": "",
                        "complex": "eq",
                        "type": "DMP_E",
                        "lib": types,
                        "apiv": {v: 2, queryParam: false, countryMode: ["D"] },
                        "validate": "kbv.InsuranceStatus_T_dmp"
                    },
                    "costCarrierBillingSection": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.InsuranceStatus_T_costCarrierBillingSection",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.costCarrierBillingSection' ),
                        "-en": "KTAB",
                        "-de": "KTAB",
                        "rule-engine": {}
                    },
                    "costCarrierBillingGroup": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.InsuranceStatus_T_costCarrierBillingGroup",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.costCarrierBillingGroup' ),
                        "-en": "Insurance Group",
                        "-de": "Kostenträgergruppe"
                    },
                    "paidFree": {
                        "type": "Boolean",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.paidFree' ),
                        "-en": "toll-free",
                        "-de": "gebührenbefreit"
                    },
                    "locationFeatures": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.locationFeatures' ),
                        "-en": "WOP",
                        "-de": "WOP"
                    },
                    "notes": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false, countryMode: ["D"] },
                        i18n: i18n( 'person-schema.InsuranceStatus_T.notes' ),
                        "-en": "Notes",
                        "-de": "Notizen"
                    },
                    "feeSchedule": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.InsuranceStatus_T_feeSchedule",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.feeSchedule' ),
                        "-en": "FeeSchedule",
                        "-de": "Gebührenordnung"
                    },
                    "kv": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false, countryMode: ["D"] },
                        i18n: i18n( 'person-schema.InsuranceStatus_T.kv' ),
                        "-en": "KV",
                        "-de": "KV"
                    },
                    "locationId": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.locationId' ),
                        "-en": "Location",
                        "-de": "Betriebsstätte"
                    },
                    "employeeId": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.employeeId.i18n' ),
                        "-en": i18n( 'person-schema.InsuranceStatus_T.employeeId.i18n' ),
                        "-de": i18n( 'person-schema.InsuranceStatus_T.employeeId.i18n' )
                    },
                    "fused": {
                        "default": false,
                        "type": "Boolean",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.fused' ),
                        "-en": "fused",
                        "-de": "fusioniert"
                    },
                    "fusedFrom": { // original vknr where the fusion chain started from
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.fusedFrom' ),
                        "-en": "fused from",
                        "-de": "fusioniert von"
                    },
                    "fusedToInsuranceId": { // original iknr of kt that is fused to and is overridden by fusion
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.fusedFrom' ),
                        "-en": "fused to",
                        "-de": "fusioniert zu"
                    },
                    "unzkv": {
                        "type": ["String"],
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.unzkv' ),
                        "-en": "unzkv",
                        "-de": "unzkv"
                    },
                    "bgNumber": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.bgNumber' ),
                        "-en": "BG number",
                        "-de": "BG-Nummer"
                    },
                    "address1": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.InsuranceStatus_T_address1",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.address1.i18n' ),
                        "-en": "Address part 1",
                        "-de": "Adresse Teil 1"
                    },
                    "address2": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.address2.i18n' ),
                        "-en": "Address part 2",
                        "-de": "Adresse Teil 2"
                    },
                    "zipcode": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.InsuranceStatus_T_zipcode",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.zipcode.i18n' )
                    },
                    "city": {
                        "default": "",
                        "type": "String",
                        "validate": "kbv.InsuranceStatus_T_city",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.city.i18n' )
                    },
                    "phone": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.phone.i18n' )
                    },
                    "insuranceLink": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.insuranceLink.i18n' )
                    },
                    "email": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.email.i18n' )
                    },
                    "insuranceGLN": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.InsuranceStatus_T_insuranceGLN",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.insuranceGLN.i18n' )
                    },
                    "recipientGLN": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.InsuranceStatus_T_recipientGLN",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.recipientGLN.i18n' )
                    },
                    "changebillingtypedesc": {
                        "type": "Boolean",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.changebillingtypedesc.i18n' )
                    },
                    "department": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.department.i18n' )
                    },
                    "mediport": {
                        "type": "Boolean",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.mediport.i18n' )
                    },
                    "originalInsuranceId": { // deprecated since MOJ-9043
                        "type": "String",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.originalInsuranceId' ),
                        "-en": "originalInsuranceId",
                        "-de": "originalInsuranceId"
                    },
                    "originalInsuranceGrpId": {  // deprecated since MOJ-9043
                        "type": "String",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.originalInsuranceGrpId' ),
                        "-en": "originalInsuranceGrpId",
                        "-de": "originalInsuranceGrpId"
                    },
                    "originalCostCarrierBillingSection": {  // deprecated since MOJ-9043
                        "type": "String",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.originalCostCarrierBillingSection' ),
                        "-en": "originalCostCarrierBillingSection",
                        "-de": "originalCostCarrierBillingSection"
                    },
                    "fk3010": {
                        "type": "String",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.fk3010' ),
                        "-en": "Datum und Uhrzeit der Onlineprüfung und –aktualisierung",
                        "-de": "Datum und Uhrzeit der Onlineprüfung und –aktualisierung"
                    },
                    "fk3011": {
                        "type": "String",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.fk3011' ),
                        "-en": "Ergebnis der Onlineprüfung und -aktualisierung",
                        "-de": "Ergebnis der Onlineprüfung und -aktualisierung"
                    },
                    "fk3012": {
                        "type": "String",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.fk3012' ),
                        "-en": "Error-Code",
                        "-de": "Error-Code"
                    },
                    "fk3013": {
                        "type": "String",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.fk3013' ),
                        "-en": "Prü̈fziffer des Fachdienstes",
                        "-de": "Prü̈fziffer des Fachdienstes"
                    },
                    "createUniqCaseIdentNoOnInvoice": {
                        "type": "Boolean",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.createUniqCaseIdentNoOnInvoice' ),
                        "-en": "Use Treatment Identification Number for invoicing (FK 3000)",
                        "-de": "Behandlungsfall-Identifikationsnummer in Abrechnung verwenden (FK 3000)"
                    },
                    "doNotShowInsuranceInGadget": {
                        "type": "Boolean",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.doNotShowInsuranceInGadget' ),
                        "-en": "Do not show insurance in patient header",
                        "-de": "Kostenträger nicht in Patientenkopf anzeigen"
                    },
                    "unknownInsurance": {
                        "type": "Boolean",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.unknownInsurance' ),
                        "-en": "Patient has an unknown insurance. Use a dummy insurance.",
                        "-de": "Kostenträger des Patienten nicht bekannt. Pseudokasse wird verwendet."
                    },
                    "InsuranceStatus_CH": {
                        complex: "ext",
                        type: "InsuranceStatus_CH_T",
                        lib: types
                    }
                },
                "InsuranceStatus_CH_T": {
                    "isTiersGarant": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'activity-schema.InsuranceStatus_T.isTiersGarant.i18n' ),
                        "-en": "Tiers Garant",
                        "-de": "Tiers Garant"
                    },
                    "isTiersPayant": {
                        "default": true,
                        "type": "Boolean",
                        i18n: i18n( 'activity-schema.InsuranceStatus_T.isTiersPayant.i18n' ),
                        "-en": "Tiers Payant",
                        "-de": "Tiers Payant"
                    },
                    "vekaCardNo": {
                        "type": "String",
                        "validate": "kbv._Patient_T_vekaCardNo",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.vekaCardNo' ),
                        "-en": "Insured person number",
                        "-de": "Kennnummer der Versichertenkarte",
                        "-de-ch": "VEKA-Nr."
                    },
                    "cardExpiryDate": {
                        "type": "Date",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.cardExpiryDate' ),
                        "-en": "Last eGK Reading",
                        "-de": "Karte gelesen"
                    },
                    "cardValidationDate": {
                        "type": "Date",
                        i18n: i18n('person-schema.InsuranceStatus_T.cardValidationDate'),
                        "-en": 'Card validation date',
                        "-de": 'Validierungsdatum der Karte'
                    }
                },
                "Person_T": {
                    "title": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.Person_T_title",
                        i18n: i18n( 'person-schema.Person_T.title.i18n' ),
                        "-en": "Title",
                        "-de": "kad. Titel",
                        trim: true
                    },
                    "firstname": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        "required": true,
                        "validate": "kbv.Person_T_firstname",
                        i18n: i18n( 'person-schema.Person_T.firstname.i18n' ),
                        "-en": "First Name",
                        "-de": "Vorname",
                        trim: true
                    },
                    "nameaffix": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "kbv.Person_T_nameaffix",
                        i18n: i18n( 'person-schema.Person_T.nameaffix' ),
                        "-en": "Name Affix",
                        "-de": "Namenszusatz",
                        trim: true
                    },
                    "middlename": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.Person_T.middlename' ),
                        "-en": "Middle Name",
                        "-de": "Zweiter Vorname",
                        trim: true
                    },
                    "fk3120": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false, countryMode: ["D"] },
                        "validate": "kbv.Person_T_fk3120",
                        i18n: i18n( 'person-schema.Person_T.fk3120' ),
                        "-en": "Name Prefix",
                        "-de": "Vorsatzwort",
                        trim: true
                    },
                    "lastname": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        "required": true,
                        "validate": "kbv.Person_T_lastname",
                        i18n: i18n( 'person-schema.Person_T.lastname.i18n' ),
                        "-en": "Last Name",
                        "-de": "Nachname",
                        trim: true
                    },
                    "civilStatus": {
                        "default": "UNKNOWN",
                        "complex": "eq",
                        "type": "CivilStatus_E",
                        "apiv": {v: 2, queryParam: false},
                        "lib": types,
                        i18n: i18n( 'person-schema.Person_T.civilStatus' ),
                        "-en": "Civil Status",
                        "-de": "Zivilstand"
                    },
                    "comment": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.Person_T.comment' ),
                        "-en": "Comment",
                        "-de": "Kommentar"
                    },
                    "lang": {
                        "complex": "eq",
                        "type": "Language_E",
                        "lib": types,
                        i18n: i18n( 'person-schema.Person_T.lang' ),
                        "-en": "Language",
                        "-de": "Sprache"
                    },
                    "jobTitle": {
                        "type": "String",
                        i18n: i18n( 'person-schema.Person_T.jobTitle' ),
                        "-en": "Job Title",
                        "-de": "Beruf"
                    },
                    "jobStatus": {
                        "type": 'String',
                        "validate": "Person_T_JobStatus",
                        i18n: i18n( 'person-schema.JobStatus_E.i18n' ),
                        "-en": "Job Status",
                        "-de": "Beschäftigungsart"
                    },
                    "isPensioner": {
                        "type": "Boolean",
                        i18n: i18n( 'person-schema.Person_T.isPensioner' ),
                        "-en": "Pensioner",
                        "-de": "Ist pensioniert"
                    },
                    "workingAt": {
                        "type": "String",
                        i18n: i18n( 'person-schema.Person_T.workingAt' ),
                        "-en": "Employer",
                        "-de": "Arbeitgeber"
                    },
                    "preferLanguage": {
                        "type": "String",
                        i18n: i18n( 'person-schema.Person_T.preferLanguage' ),
                        "-en": "Preferred language",
                        "-de": "Bevorzugte Sprache"
                    },
                    "workingAtRef": {
                        "type": "String",
                        "foreignKey": "company",
                        i18n: i18n( 'person-schema.Person_T.workingAtRef' ),
                        "-en": "workingAtRef",
                        "-de": "workingAtRef"
                    },
                    "accounts": {
                        "complex": "inc",
                        "type": "BankAccount_T",
                        "lib": types,
                        i18n: i18n( 'person-schema.Person_T.accounts' ),
                        "-en": "Accounts",
                        "-de": "Konten"
                    },
                    "base": {
                        "complex": "ext",
                        "type": "JuristicPerson_T",
                        "lib": types
                    }
                },
                "Insurance_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "PUBLIC",
                            i18n: i18n( 'person-schema.Insurance_E.PUBLIC' ),
                            "-en": "GKV",
                            "-de": "GKV",
                            countryMode: ['D']
                        },
                        {
                            "val": "PUBLIC_A",
                            i18n: i18n( 'person-schema.Insurance_E.PUBLIC_A' ),
                            "-en": "GKV-A",
                            "-de": "GKV-Z",
                            countryMode: ['D']
                        },
                        {
                            "val": "PRIVATE",
                            i18n: i18n( 'person-schema.Insurance_E.PRIVATE' ),
                            "-en": "PKV",
                            "-de": "PKV",
                            countryMode: ['D']
                        },
                        {
                            "val": "PRIVATE_A",
                            i18n: i18n( 'person-schema.Insurance_E.PRIVATE_A' ),
                            "-en": "PKV-A",
                            "-de": "PKV-Z",
                            countryMode: ['D']
                        },
                        {
                            "val": "PRIVATE_CH",
                            i18n: i18n( 'person-schema.Insurance_E.PRIVATE_CH' ),
                            "-en": "KVG (Switzerland)",
                            "-de": "KVG",
                            countryMode: ['CH']
                        },
                        {
                            "val": "PRIVATE_CH_IVG",
                            i18n: i18n( 'person-schema.Insurance_E.PRIVATE_CH_IVG' ),
                            "-en": "IVG (Switzerland)",
                            "-de": "IVG",
                            countryMode: ['CH']
                        },
                        {
                            "val": "PRIVATE_CH_MVG",
                            i18n: i18n( 'person-schema.Insurance_E.PRIVATE_CH_MVG' ),
                            "-en": "MVG (Switzerland)",
                            "-de": "MVG",
                            countryMode: ['CH']
                        },
                        {
                            "val": "PRIVATE_CH_UVG",
                            i18n: i18n( 'person-schema.Insurance_E.PRIVATE_CH_UVG' ),
                            "-en": "UVG (Switzerland)",
                            "-de": "UVG",
                            countryMode: ['CH']
                        },
                        {
                            "val": "PRIVATE_CH_VVG",
                            i18n: i18n( 'person-schema.Insurance_E.PRIVATE_CH_VVG' ),
                            "-en": "VVG (Switzerland)",
                            "-de": "VVG",
                            countryMode: ['CH']
                        },
                        {
                            "val": "SELFPAYER",
                            i18n: i18n( 'person-schema.Insurance_E.SELFPAYER' ),
                            "-en": "Selfpayer",
                            "-de": "Selbstzahler",
                            countryMode: ['D']
                        },
                        {
                            "val": "BG",
                            i18n: i18n( 'person-schema.Insurance_E.BG' ),
                            "-en": "BG",
                            "-de": "BG",
                            countryMode: ['D']
                        }
                        /*
                        {
                            "val": "PREGNANCY",
                            i18n: i18n( 'person-schema.Insurance_E.PREGNANCY' ),
                            "-en": "Pregnancy",
                            "-de": "Schwangerschaft"
                        },
                        */
                        /*,
                         {
                         "val": "PRIVCHOICE",
                         i18n: _('Insurance_E.PRIVCHOICE'),
                         "-en": "Private Choice",
                         "-de": "Wahlarzt"
                         },
                         {
                         "val": "SELECTIVE",
                         i18n: _('Insurance_E.SELECTIVE'),
                         "-en": "selective",
                         "-de": "Wahl"
                         },
                         {
                         "val": "RATE",
                         i18n: _('Insurance_E.RATE'),
                         "-en": "rate",
                         "-de": "Raten"
                         },
                         {
                         "val": "DEPENDENT",
                         i18n: _('Insurance_E.DEPENDENT'),
                         "-en": "dependent",
                         "-de": "Angehörige"
                         }*/
                    ],
                    i18n: i18n( 'person-schema.Insurance_E.i18n' ),
                    "-en": "Invoice",
                    "-de": "Abrechnung"
                },
                "Insurance_Abbrev_E": { // MOJ-3246
                    "list": [
                        {
                            "val": "PUBLIC",
                            i18n: i18n( 'person-schema.Insurance_Abbrev_E.PUBLIC' ),
                            "-en": "G",
                            "-de": "G"
                        },
                        {
                            "val": "PUBLIC_A",
                            i18n: i18n( 'person-schema.Insurance_Abbrev_E.PUBLIC_A' ),
                            "-en": "G-A",
                            "-de": "G-Z"
                        },
                        {
                            "val": "PRIVATE",
                            i18n: i18n( 'person-schema.Insurance_Abbrev_E.PRIVATE' ),
                            "-en": "P",
                            "-de": "P"
                        },
                        {
                            "val": "PRIVATE_A",
                            i18n: i18n( 'person-schema.Insurance_Abbrev_E.PRIVATE_A' ),
                            "-en": "P-A",
                            "-de": "P-Z"
                        },
                        {
                            "val": "SELFPAYER",
                            i18n: i18n( 'person-schema.Insurance_Abbrev_E.SELFPAYER' ),
                            "-en": "S",
                            "-de": "S"
                        },
                        {
                            "val": "BG",
                            i18n: i18n( 'person-schema.Insurance_Abbrev_E.BG' ),
                            "-en": "B",
                            "-de": "B"
                        },
                        {
                            "val": "PRIVATE_CH",
                            i18n: i18n( 'person-schema.Insurance_Abbrev_E.PRIVATE_CH' ),
                            "-en": "K",
                            "-de": "K"
                        },
                        {
                            "val": "PRIVATE_CH_IVG",
                            i18n: i18n( 'person-schema.Insurance_Abbrev_E.PRIVATE_CH_IVG' ),
                            "-en": "I",
                            "-de": "I"
                        },
                        {
                            "val": "PRIVATE_CH_MVG",
                            i18n: i18n( 'person-schema.Insurance_Abbrev_E.PRIVATE_CH_MVG' ),
                            "-en": "M",
                            "-de": "M"
                        },
                        {
                            "val": "PRIVATE_CH_UVG",
                            i18n: i18n( 'person-schema.Insurance_Abbrev_E.PRIVATE_CH_UVG' ),
                            "-en": "U",
                            "-de": "U"
                        },
                        {
                            "val": "PRIVATE_CH_VVG",
                            i18n: i18n( 'person-schema.Insurance_Abbrev_E.PRIVATE_CH_VVG' ),
                            "-en": "V",
                            "-de": "V"
                        }
                    ]
                },
                "BillingFactor_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "privatversicherte",
                            "pvsVal": 1,
                            i18n: i18n( 'person-schema.BillingFactor_E.privatversicherte' ),
                            "-en": "private insured",
                            "-de": "Privatversicherte"
                        },
                        {
                            "val": "bahnbeamte_1-3",
                            "pvsVal": 20,
                            i18n: i18n( 'person-schema.BillingFactor_E.bahnbeamte_1-3' ),
                            "-en": "railway officials 1-3",
                            "-de": "Bahnbeamte 1-3"
                        },
                        {
                            "val": "bahnbeamte_unfall",
                            "pvsVal": 21,
                            i18n: i18n( 'person-schema.BillingFactor_E.bahnbeamte_unfall' ),
                            "-en": "railway officials accident",
                            "-de": "Bahnbeamte Unfall"
                        },
                        {
                            "val": "postbeamte_b",
                            "pvsVal": 30,
                            i18n: i18n( 'person-schema.BillingFactor_E.postbeamte_b' ),
                            "-en": "post officials B",
                            "-de": "Postbeamte B"
                        },
                        {
                            "val": "postbeamte_unfall",
                            "pvsVal": 31,
                            i18n: i18n( 'person-schema.BillingFactor_E.postbeamte_unfall' ),
                            "-en": "post officials accident",
                            "-de": "Postbeamte Unfall"
                        },
                        {
                            "val": "bundespolizei_ambulant",
                            "pvsVal": 1,
                            i18n: i18n( 'person-schema.BillingFactor_E.bundespolizei_ambulant' ),
                            "-en": "federal police ambulant",
                            "-de": "Bundespolizei ambulant"
                        },
                        {
                            "val": "bundespolizei_stationär",
                            "pvsVal": 1,
                            i18n: i18n( 'person-schema.BillingFactor_E.bundespolizei_stationär' ),
                            "-en": "federal police hospital",
                            "-de": "Bundespolizei stationär"
                        },
                        {
                            "val": "bundeswehr_ambulant",
                            "pvsVal": 1,
                            i18n: i18n( 'person-schema.BillingFactor_E.bundeswehr_ambulant' ),
                            "-en": "federal armed forces ambulant",
                            "-de": "Bundeswehr ambulant"
                        },
                        {
                            "val": "bundeswehr_stationär",
                            "pvsVal": 1,
                            i18n: i18n( 'person-schema.BillingFactor_E.bundeswehr_stationär' ),
                            "-en": "federal armed forces hospital",
                            "-de": "Bundeswehr stationär"
                        },
                        {
                            "val": "entschaedigungsamt_berlin",
                            "pvsVal": 1,
                            i18n: i18n( 'person-schema.BillingFactor_E.entschaedigungsamt_berlin' ),
                            "-en": "compensation department",
                            "-de": "Entschädigungsamt Berlin"
                        },
                        {
                            "val": "pkv_standard",
                            "pvsVal": 86,
                            i18n: i18n( 'person-schema.BillingFactor_E.pkv_standard' ),
                            "-en": "pkv standard",
                            "-de": "PKV Standard"
                        },
                        {
                            "val": "pkv_student",
                            "pvsVal": 81,
                            i18n: i18n( 'person-schema.BillingFactor_E.pkv_student' ),
                            "-en": "pkv student",
                            "-de": "PKV Student"
                        },
                        {
                            "val": "pkv_basis",
                            "pvsVal": 85,
                            i18n: i18n( 'person-schema.BillingFactor_E.pkv_basis' ),
                            "-en": "pkv basic",
                            "-de": "PKV Basis"
                        },
                        {
                            "val": "knappschaft",
                            "pvsVal": 50,
                            i18n: i18n( 'person-schema.BillingFactor_E.knappschaft' ),
                            "-en": "guild",
                            "-de": "Knappschaft"
                        }
                    ],
                    i18n: i18n( 'person-schema.BillingFactor_E.i18n' )
                },
                "Language_E": {
                    "type": "String",
                    "version": 1,
                    "list": [
                        {
                            "val": "DE",
                            i18n: i18n( 'person-schema.Language_E.DE' ),
                            "-en": "German",
                            "-de": "Deutsch"
                        },
                        {
                            "val": "EN",
                            i18n: i18n( 'person-schema.Language_E.EN' ),
                            "-en": "English",
                            "-de": "Englisch"
                        },
                        {
                            "val": "FR",
                            i18n: i18n( 'person-schema.Language_E.FR' ),
                            "-en": "French",
                            "-de": "Französisch"
                        },
                        {
                            "val": "IT",
                            i18n: i18n( 'person-schema.Language_E.IT' ),
                            "-en": "Italian",
                            "-de": "Italienisch"
                        }
                    ],
                    i18n: i18n( 'person-schema.Language_E.i18n' )
                },
                "Address_T": {
                    "Address_Base_T": {
                        "complex": "ext",
                        "type": "Address_Base_T",
                        "lib": types
                    },
                    "Address_D_T": {
                        "complex": "ext",
                        "type": "Address_D_T",
                        "lib": types
                    },
                    "Address_CH_T": {
                        "complex": "ext",
                        "type": "Address_CH_T",
                        "lib": types
                    }
                },
                "Address_Base_T": {
                    "street": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "Address_T_street",
                        i18n: i18n( 'person-schema.Address_T.street' ),
                        "-en": "Street",
                        "-de": "Straße",
                        "-de-ch": "Strasse"
                    },
                    "houseno": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "Address_T_houseno",
                        i18n: i18n( 'person-schema.Address_T.houseno' ),
                        "-en": "House No.",
                        "-de": "Hausnummer"
                    },
                    "zip": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "Address_T_zip",
                        i18n: i18n( 'person-schema.Address_T.zip' ),
                        "-en": "Zip",
                        "-de": "PLZ"
                    },
                    "city": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        "required": true,
                        "validate": "Address_T_city",
                        i18n: i18n( 'person-schema.Address_T.city' ),
                        "-en": "City",
                        "-de": "Stadt"
                    },
                    "postbox": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "Address_T_postbox",
                        i18n: i18n( 'person-schema.Address_T.postbox' ),
                        "-en": "Postbox",
                        "-de": "Postfach"
                    },
                    "kind": {
                        "required": true,
                        "complex": "eq",
                        "type": "AddressKind_E",
                        "apiv": {v: 2, queryParam: false},
                        "lib": types,
                        i18n: i18n( 'person-schema.Address_T.kind' ),
                        "-en": "Address type",
                        "-de": "Adresstyp"
                    },
                    "country": {
                        // MOJ-8549
                        // "required": true,
                        "default": ( countryMode && ( -1 < countryMode.indexOf( 'CH' ) ) ) ? "Schweiz" : "Deutschland",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.Address_T.country' ),
                        "-en": "Country",
                        "-de": "Land"
                    },
                    "countryCode": {
                        // MOJ-8549
                        // "required": true,
                        "default": ( countryMode && ( -1 < countryMode.indexOf( 'CH' ) ) ) ? "CH" : "D",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.Address_T.countryCode' ),
                        "-en": "Country code",
                        "-de": "Ländercode"
                    },
                    "receiver":  {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'person-schema.Address_T.receiver' ),
                        "-en": "Addressee",
                        "-de": "Empfänger"
                    },
                    "payerType":  {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'person-schema.Address_T.payerType' ),
                        "-en": "payerType",
                        "-de": "payerType"
                    },
                    "addon": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.Address_T.addon' ),
                        "-en": "Address addition",
                        "-de": "Anschriftenzusatz"
                    }
                },
                "Address_D_T": {},
                "Address_CH_T": {
                    "talk": {
                        "complex": "eq",
                        "type": "Talk_E",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    },
                    "title": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.Person_T.title.i18n' ),
                        "-en": "Title",
                        "-de": "kad. Titel"
                    },
                    "firstname": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'person-schema.Person_T.firstname.i18n' ),
                        "-en": "First Name",
                        "-de": "Vorname"
                    },
                    "nameaffix": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.Person_T.nameaffix' ),
                        "-en": "Name Affix",
                        "-de": "Namenszusatz"
                    },
                    "middlename": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        "-en": "Middle Name",
                        "-de": "Zweiter Vorname"
                    },
                    "lastname": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'person-schema.Person_T.lastname.i18n' ),
                        "-en": "Last Name",
                        "-de": "Nachname"
                    },
                    "cantonCode": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'person-schema.Address_CH_T.cantonCode' ),
                        "validate": "Address_CH_T_cantonCode"
                    }
                },
                "Insurance_T": {
                    "kvSafeNetURL": {
                        "type": "String",
                        "future": "URL",
                        i18n: i18n( 'person-schema.Insurance_T.kvSafeNetURL' ),
                        "-en": "kvSafeNetURL",
                        "-de": "kvSafeNetURL"
                    },
                    "kvSafeNetPwd": {
                        "type": "Password",
                        i18n: i18n( 'person-schema.Insurance_T.kvSafeNetPwd' ),
                        "-en": "kvSafeNetPwd",
                        "-de": "kvSafeNetPwd"
                    }
                },
                "HealthCardType_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "KVK",
                            i18n: i18n( 'person-schema.HealthCardType_E.KVK' ),
                            "-en": "KVK",
                            "-de": "KVK"
                        },
                        {
                            "val": "EGK",
                            i18n: i18n( 'person-schema.HealthCardType_E.EGK' ),
                            "-en": "eGK",
                            "-de": "eGK"
                        }
                    ],
                    i18n: i18n( 'person-schema.HealthCardType_E.i18n' ),
                    "-en": "card type",
                    "-de": "Kartentyp"
                },
                "HealthCardGeneration_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "0",
                            i18n: i18n( 'person-schema.HealthCardGeneration_E.0' ),
                            "-en": "unknown",
                            "-de": "unknown"
                        },
                        {
                            "val": "G0",
                            i18n: i18n( 'person-schema.HealthCardGeneration_E.G0' ),
                            "-en": "generation 0",
                            "-de": "Generation 0"
                        },
                        {
                            "val": "G1",
                            i18n: i18n( 'person-schema.HealthCardGeneration_E.G1' ),
                            "-en": "generation 1",
                            "-de": "Generation 1"
                        },
                        {
                            "val": "G1plus",
                            i18n: i18n( 'person-schema.HealthCardGeneration_E.G1plus' ),
                            "-en": "generation 1plus",
                            "-de": "Generation 1plus"
                        },
                        {
                            "val": "G2",
                            i18n: i18n( 'person-schema.HealthCardGeneration_E.G2' ),
                            "-en": "generation 2",
                            "-de": "Generation 2"
                        }
                    ],
                    i18n: i18n( 'person-schema.HealthCardGeneration_E.i18n' ),
                    "-en": "cardTypeGeneration",
                    "-de": "Kartengeneration"
                },
                "CardTerminalType_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "unknown",
                            i18n: i18n( 'person-schema.CardTerminalType_E.unknown' ),
                            "-en": "unknown",
                            "-de": "unbekannt"
                        },
                        {
                            "val": "fixed",
                            i18n: i18n( 'person-schema.CardTerminalType_E.fixed' ),
                            "-en": "stationary",
                            "-de": "stationär"
                        },
                        {
                            "val": "mobile",
                            i18n: i18n( 'person-schema.CardTerminalType_E.mobile' ),
                            "-en": "mobile",
                            "-de": "mobil"
                        }
                    ],
                    i18n: i18n( 'person-schema.CardTerminalType_E.i18n' ),
                    "-en": "card terminal type",
                    "-de": "Kartenterminaltyp"
                },
                "JuristicPerson_T": {},
                "CardType_E": {
                    "type": "String",
                    "default": "BANK",
                    "list": [
                        {
                            "val": "BANK",
                            i18n: i18n( 'person-schema.CardType_E.BANK' ),
                            "-en": "bank",
                            "-de": "bank"
                        },
                        {
                            "val": "EC",
                            i18n: i18n( 'person-schema.CardType_E.EC' ),
                            "-en": "ec",
                            "-de": "ec"
                        },
                        {
                            "val": "VISA",
                            i18n: i18n( 'person-schema.CardType_E.VISA' ),
                            "-en": "visa",
                            "-de": "visa"
                        },
                        {
                            "val": "MASTER",
                            i18n: i18n( 'person-schema.CardType_E.MASTER' ),
                            "-en": "master",
                            "-de": "master"
                        },
                        {
                            "val": "AMEX",
                            i18n: i18n( 'person-schema.CardType_E.AMEX' ),
                            "-en": "amex",
                            "-de": "amex"
                        },
                        {
                            "val": "OTHERCC",
                            i18n: i18n( 'person-schema.CardType_E.OTHERCC' ),
                            "-en": "othercc",
                            "-de": "othercc"
                        },
                        {
                            "val": "OTHER",
                            i18n: i18n( 'person-schema.CardType_E.OTHER' ),
                            "-en": "other",
                            "-de": "other"
                        }
                    ],
                    i18n: i18n( 'person-schema.CardType_E.i18n' )
                }
            }
        );

        // manual overrides:
        // The idea with these overrides is that the UML can automatically be converted
        // and create a model like Person_T, while additional elements that are not automatically generated
        // can be added in post-hoc.
        // This pattern is not relevant for now,
        //     only when we start doing serious UML  ->  Schema  code generation
        types.JuristicPerson_T.customer = {
            "complex": "ext",
            "type": "Customer_T",
            "lib": "customer"
        };
        types.JuristicPerson_T.communications = {
            "complex": "inc",
            "type": "Communication_T",
            "apiv": {v: 2, queryParam: false},
            "lib": types,
            i18n: i18n( 'person-schema.JuristicPerson_T.communications' ),
            "-en": "communications",
            "-de": "communications"
        };
        types.JuristicPerson_T.addresses = {
            "complex": "inc",
            "type": "Address_T",
            "apiv": {v: 2, queryParam: false},
            "lib": types,
            i18n: i18n( 'person-schema.JuristicPerson_T.addresses' ),
            "-en": "Addresses",
            "-de": "Adressen"
        };
        types.Person_T.workingAt = {
            "type": "String",
            i18n: i18n( 'person-schema.Person_T.workingAt' ),
            "-en": "workingAt",
            "-de": "Arbeitgeber"
        };
        types.Person_T.workingAtRef = {
            "type": "String",
            "foreignKey": "company",
            i18n: i18n( 'person-schema.Person_T.workingAtRef' ),
            "-en": "workingAtRef",
            "-de": "workingAtRef"
        };
        types.Person_T.accounts = {
            "complex": "inc",
            "type": "BankAccount_T",
            "lib": types,
            i18n: i18n( 'person-schema.Person_T.accounts' ),
            "-en": "Accounts",
            "-de": "Konten"
        };
        types.Person_T.base = {
            "complex": "ext",
            "type": "JuristicPerson_T",
            "lib": types
        };

        // this is ignored, but we need it in a valid schema
        types.root = {};

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        function createJobStatusTypeList() {
            var
                result = [];
            Object.keys( jobStatusTypes ).forEach( function( type ) {
                result.push( {
                    val: jobStatusTypes[type],
                    i18n: i18n( 'person-schema.JobStatus_E.' + jobStatusTypes[type] )
                } );
            } );

            return result;
        }

        /**
         * Gets a category ~constant for the provided type
         * @method getCommunicationTypeCategory
         * @param {String} type
         * @return {getCommunicationTypeCategory.CONST[*]}
         */
        function getCommunicationTypeCategory( type ) {
            var
                object = getCommunicationTypeCategory.categories,
                found = getCommunicationTypeCategory.CONST.UNKNOWN,
                key;

            for( key in object ) {
                if( object.hasOwnProperty( key ) ) {
                    if( -1 !== object[key].indexOf( type ) ) {
                        found = getCommunicationTypeCategory.CONST[key];
                        break;
                    }
                }
            }

            return found;
        }

        /**
         * Category Properties for Communication_E
         * @property categories
         * @for getCommunicationTypeCategory
         * @type {object}
         */
        getCommunicationTypeCategory.categories = {
            'HTTP': [
                'FACEBOOK',
                'GOOGLE',
                'LINKEDIN',
                'XING',
                'URL'
            ],
            'EMAIL': [
                'EMAILPRIV',
                'EMAILJOB'
            ],
            'PHONE': [
                'PHONEPRIV',
                'MOBILEPRIV',
                'PHONEJOB',
                'MOBILEJOB',
                'PHONEEXT',
                'PHONEEMERGENCY'
            ],
            'FAX': [
                'FAXPRIV',
                'FAXJOB'
            ]
        };

        /**
         * The ~constants used with "getCommunicationTypeCategory"
         * @property CONST
         * @for getCommunicationTypeCategory
         * @type {object}
         */
        getCommunicationTypeCategory.CONST = {
            'UNKNOWN': {},
            'HTTP': {},
            'EMAIL': {},
            'PHONE': {},
            'FAX': {}
        };

        /**
         * Returns HTML-Markup to handle a communication appropriately
         * @param {object} parameters
         * @param {String} parameters.type
         * @param {String} parameters.value
         * @param {String} [parameters.template] Y.Lang.sub compatible string
         * @return {string}
         */
        function getCommunicationLinkedWithUriScheme( parameters ) {
            var
                type = String( parameters.type ),
                value = String( parameters.value ),
                valueEscaped = Y.Escape.html( value ),
                template = parameters.template || '<a href="{href}" target="{target}">{text}</a>',
                valueLinked = '';

            switch( getCommunicationTypeCategory( type ) ) {
                case getCommunicationTypeCategory.CONST.HTTP:
                    valueLinked = Y.Lang.sub( template, {
                        href: 0 !== value.toLowerCase().indexOf( 'http' ) ? 'http://' + value : value,
                        text: valueEscaped,
                        target: '_blank'
                    } );
                    break;
                case getCommunicationTypeCategory.CONST.EMAIL:
                    valueLinked = Y.Lang.sub( template, {
                        href: 'mailto:' + value,
                        text: valueEscaped,
                        target: '_blank'
                    } );
                    break;
                case getCommunicationTypeCategory.CONST.PHONE:
                    valueLinked = Y.Lang.sub( template, {
                        href: 'tel:' + value,
                        text: valueEscaped,
                        target: '_blank'
                    } );
                    break;
                case getCommunicationTypeCategory.CONST.FAX:
                    valueLinked = Y.Lang.sub( template, {
                        href: 'fax:' + value,
                        text: valueEscaped,
                        target: '_blank'
                    } );
                    break;

                case getCommunicationTypeCategory.CONST.UNKNOWN:// jshint ignore:line
                default:
                    valueLinked = valueEscaped;
                    break;
            }

            return valueLinked;
        }

        /**
         * Displays a person as string to the user
         * @method personDisplay
         * @param {Object} person model with properties "firstname", "lastname", "title", "dob", "nameaffix" & "fk3120"
         * @return {string} display string
         */
        function personDisplay( person ) {
            var
                parts = [],
                dob;

            if( Y.Lang.isObject( person ) ) {

                // title
                if( 'title' in person && Y.Lang.isString( person.title ) ) {
                    if( person.title ) {
                        if( parts.length ) {
                            parts.push( ' ' );
                        }
                        parts.push( person.title );
                    }
                }
                else {
                    Y.log( 'personDisplay: person.title not given', 'warn', NAME );
                }

                // nameaffix
                if( 'nameaffix' in person && Y.Lang.isString( person.nameaffix ) ) {
                    if( person.nameaffix ) {
                        if( parts.length ) {
                            parts.push( ' ' );
                        }
                        parts.push( person.nameaffix );
                    }
                }
                else {
                    Y.log( 'personDisplay: person.nameaffix not given', 'warn', NAME );
                }

                // fk3120
                if( 'fk3120' in person && Y.Lang.isString( person.fk3120 ) ) {
                    if( person.fk3120 ) {
                        if( parts.length ) {
                            parts.push( ' ' );
                        }
                        parts.push( person.fk3120 );
                    }
                }
                else {
                    Y.log( 'personDisplay: person.fk3120 not given', 'warn', NAME );
                }

                // lastname
                if( 'lastname' in person && Y.Lang.isString( person.lastname ) ) {
                    if( person.lastname ) {
                        if( parts.length ) {
                            parts.push( ' ' );
                        }
                        parts.push( person.lastname );
                    }
                }
                else {
                    Y.log( 'personDisplay: person.lastname not given', 'warn', NAME );
                }

                // firstname
                if( 'firstname' in person && Y.Lang.isString( person.firstname ) ) {
                    if( person.firstname ) {
                        if( parts.length ) {
                            parts.push( ', ' );
                        }
                        parts.push( person.firstname );
                    }
                }
                else {
                    Y.log( 'personDisplay: person.firstname not given', 'warn', NAME );
                }

                // dob
                if( 'displayDob' in person && Y.Lang.isString( person.displayDob ) ) {
                    dob = moment(person.displayDob).format('DD.MM.YYYY');
                    if( parts.length ) {
                        parts.push( ' ' );
                    }
                    parts.push( '('+dob+')' );
                }

            }
            else {
                Y.log( 'personDisplay: person is not an object', 'error', NAME );
            }

            return parts.join( '' );

        }

        /**
         * Public helper functions to get a address string
         * @method addressDisplay
         * @param {Array} addresses array of objects type person.Address_T
         * @param {String} [separator=', '] used to separate lines
         * @returns {string}
         */
        function addressDisplay( addresses, separator ) {

            return addresses.map( function( address ) {
                var
                    addressArr = [];
                addressArr.push( address.street + ' ' + address.houseno );
                addressArr.push( address.zip + ' ' + address.city );
                return addressArr.join( separator || ', ' );
            } );
        }

        /**
         * Class Patient Schemas -- gathers all the schemas that the Patient Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            jobStatusTypes: jobStatusTypes,

            name: NAME,

            /**
             * Category Properties for Communication_E
             * @property getCommunicationTypeCategory
             * @type {getCommunicationTypeCategory}
             */
            getCommunicationTypeCategory: getCommunicationTypeCategory,

            getConstCommunicationTypeCategory: getCommunicationTypeCategory.CONST,

            getCommunicationLinkedWithUriScheme: getCommunicationLinkedWithUriScheme,

            personDisplay: personDisplay,

            addressDisplay: addressDisplay,

            getFullName: function( firstname, lastname, talk ) {
                talk = Y.doccirrus.schemaloader.translateEnumValue( '-de', talk, Y.doccirrus.schemas.person.types.Talk_E.list, '' );
                return  talk + ' ' + firstname + ' ' + lastname;
            }

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'dccommonutils',
            'dcvalidations',
            'kbv-validations',
            'dcschemaloader',
            'customer-schema'
        ]
    }
);
