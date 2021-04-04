/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Personalienfeld-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Personalienfeld_T = {
            "version": 1.0,
            "_lib": "person",

            //  KassenName 1-24 (insuranceName) Abrechnungs-VKNR 25-30 (nur WOP nach KVK Abloese)

            "line1": {
                "type": "String",
                "label": {
                    "en": "Line 1",
                    "de": "Drukzeile 1"
                }
            },

            //  Name (lastname) 1-30

            "line2": {
                "type": "String",
                "label": {
                    "en": "Line 2",
                    "de": "Drukzeile 2"
                }
            },

            //  Titel Vorname 1-19 (title, firstname, middlename) Geb.am 23-30 (dob)

            "line3": {
                "type": "String",
                "label": {
                    "en": "Line 3",
                    "de": "Drukzeile 3"
                }
            },

            //  Strassenname (street) Hausnummer (houseno) 1-30

            "line4": {
                "type": "String",
                "label": {
                    "en": "Line 4",
                    "de": "Drukzeile 4"
                }
            },

            //  zip 1-24 gultigkeitsdatum 25-30 (validity date)

            "line5": {
                "type": "String",
                "label": {
                    "en": "Line 5",
                    "de": "Drukzeile 5"
                }
            },

            //  Kassen-nr 1-9 (insuranceId) | Versicherten-nr (insuranceNumber) 11-22 | Versichertenart (insuranceKind) 24 | BesonderePersonenGruppe (persGroup) 25-26 | DMP-Kennzeichen (dmp) 27-28 | ASV-Kennzeichen (not used) 30

            "line6": {
                "type": "String",
                "label": {
                    "en": "Line 6",
                    "de": "Drukzeile 6"
                }
            },

            //  Bertreibstatten-nr 1-9 (commercialNo) | Arzt-nr 11-19 (doctorNumber) | Tagesdatum 22-29 (transactionDate)

            "line7": {
                "type": "String",
                "label": {
                    "en": "Line 7",
                    "de": "Drukzeile 7"
                }
            },

            "talk": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Talk",
                    "de": "Anrede"
                }
            },
            "title": {
                "type": "String",
                "label": {
                    "en": "Title",
                    "de": "Titel"
                }
            },
            "firstname": {
                "schema": "patient",
                "path": "firstname"
            },
            "middlename": {
                "schema": "patient",
                "path": "middlename"
            },
            "lastname": {
                "required": true,
                "schema": "patient",
                "path": "lastname"
            },
            "fullname": {
                "type": "String",
                "label": {
                    "en": "Full Name",
                    "de": "Full Name"
                }
            },
            "nameAndAddress": {
                "type": "String",
                "label": {
                    "en": "Name And Address",
                    "de": "Name und Anschrift"
                }
            },
            "civilStatus": {
                "complex": "eq",
                "type": "CivilStatus_E",
                "lib": "reduced",
                "label": {
                    "en": "Civil Status",
                    "de": "Zivilstand"
                }
            },
            "comment": {
                "type": "String",
                "label": {
                    "en": "Comment",
                    "de": "Kommentar"
                }
            },
            "gender": {
                "complex": "eq",
                "type": "Gender_E",
                "lib": "reduced",
                "label": {
                    "en": "Sex",
                    "de": "Geschlecht"
                }
            },
            "lang": {
                "complex": "eq",
                "type": "Language_E",
                "lib": "reduced",
                "label": {
                    "en": "Language",
                    "de": "Sprache"
                }
            },
            "dob": {
                "type": "Date",
                "label": {
                    "en": "Date of Birth",
                    "de": "Geburtsdatum"
                }
            },
            "jobTitle": {
                "schema": "patient",
                "path": "jobTitle"
            },
            "communications": {
                "type": "Communication_T",
                "label": {
                    "en": "Contact details",
                    "de": "Kontaktdaten"
                }
            },
            "insuranceName": {
                "schema": "patient",
                "path": "insuranceStatus.0.insuranceName"
            },
            "insuranceNumber": {
                "schema": "patient",
                "path": "insuranceStatus.0.insuranceNo"
            },
            "insuranceKind": {
                "schema": "patient",
                "path": "insuranceStatus.0.insuranceKind"
            },
            "persGroup": {
                "schema": "patient",
                "path": "insuranceStatus.0.persGroup"
            },
            "dmp": {
                "schema": "patient",
                "path": "insuranceStatus.0.dmp"
            },
            "doctorNumber": {
                "schema": "employee",
                "path": "officialNo"
            },
            "transactionDate": {
                "type": "String",
                "label": {
                    "en": "Transaction Date",
                    "de": "Datum"
                }
            },
            "insuranceId": {
                "schema": "patient",
                "path": "insuranceStatus.0.insuranceId"
            },
            "commercialNo": {
                "schema": "location",
                "path": "commercialNo"
            }
        };


    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);