/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-PubReceipt-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.PubReceipt_T = {
            "version": 1.0,
            "mapper": "pubreceipt",
            "activityId": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Activity ID",
                    "de": "Activity ID"
                }
            },
            "actType": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Activity Type",
                    "de": "Activity Type"
                }
            },
            "diagnoses": {
                "type": "String",
                "label": {
                    "en": "Diagnoses",
                    "de": "Diagnosen"
                }
            },
            "insuranceName": {
                "type": "String",
                "label": {
                    "en": "Insurance name",
                    "de": "Kassenname"
                }
            },
            "insuranceId": {
                "type": "String",
                "label": {
                    "en": "Insurance id",
                    "de": "Versicherungscode"
                }
            },
            "insuranceNo": {
                "type": "String",
                "label": {
                    "en": "Insurance no.",
                    "de": "Versicherungsnummer"
                }
            },
            "jobTitle": {
                "type": "String",
                "label": {
                    "en": "Job title",
                    "de": "Beruf (Kat.)"
                }
            },
            "dob": {
                "type": "String",
                "label": {
                    "en": "Birthdate",
                    "de": "Geburtsdatum"
                }
            },
            "age": {
                "type": "String",
                "label": {
                    "en": "Age",
                    "de": "Alter"
                }
            },
            "workingAt": {
                "type": "String",
                "label": {
                    "en": "Employer",
                    "de": "Arbeitgeber"
                }
            },
            "date": {
                "type": "String",
                "label": {
                    "en": "Date",
                    "de": "Ausstellungsdatum"
                }
            },
            "dateNormal": {
                "type": "String",
                "label": {
                    "en": "Date normal",
                    "de": "Datum DD.MM.YYYY"
                }
            },
            "dobSmaller": {
                "type": "String",
                "label": {
                    "en": "Birthdate KBV",
                    "de": "Geburtsdatum KBV"
                }
            },
            "dd": {
                "type": "String",
                "label": {
                    "en": "B.Day",
                    "de": "Geb. Tag"
                }
            },
            "mm": {
                "type": "String",
                "label": {
                    "en": "B.Month",
                    "de": "Geb. Monat"
                }
            },
            "yy": {
                "type": "String",
                "label": {
                    "en": "B.Year YY",
                    "de": "Geb. Jahr YY"
                }
            },
            "yyyy": {
                "type": "String",
                "label": {
                    "en": "B.Year YYYY",
                    "de": "Geb. Jahr YYYY"
                }
            },
            "editDate": {
                "type": "String",
                "label": {
                    "en": "Date edited",
                    "de": "Zuletzt geändert am"
                }
            },
            "currentDate": {
                "type": "String",
                "label": {
                    "en": "Today's Date",
                    "de": "Heutiges Datum"
                }
            },
//        "from": {
//            "type": "String",
//            "label": {
//                "en": "From Date",
//                "de": "Von Datum"
//            }
//        },
//        "to": {
//            "type": "String",
//            "label": {
//                "en": "To Date",
//                "de": "Bis Datum"
//            }
//        },
            "displayname": {
                "type": "String",
                "label": {
                    "en": "Patient name",
                    "de": "Patienten Name"
                }
            },
            "talk": {
                "type": "String",
                "label": {
                    "en": "Mr./Ms./..",
                    "de": "Anrede"
                }
            },
            "p2_840": {
                "type": "String",
                "label": {
                    "en": "Standard KBV text",
                    "de": "P2-840 Feld"
                }
            },
            "quarters": {
                "type": "String",
                "label": {
                    "en": "Treat. period",
                    "de": "Behandlungszeitraum"
                }
            },

            "sysPoints": {
                "type": "String",
                "label": {
                    "en": "Sys. points",
                    "de": "Praxispunktwert"
                }
            },

            //  This is usually the first address in the currentPatient
            //  'address' property is concatenated from the street, houseno, postcode, etc

            "address": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Client address",
                    "de": "Patienten Adresse"
                }
            },
            "street": {
                "schema": "patient",
                "path": "addresses.0.street"
            },
            "houseno": {
                "schema": "patient",
                "path": "addresses.0.houseno"
            },
            "zip": {
                "schema": "patient",
                "path": "addresses.0.zip"
            },
            "city": {
                "schema": "patient",
                "path": "addresses.0.city"
            },
            "postbox": {
                "schema": "patient",
                "path": "addresses.0.postbox"
            },
            "country": {
                "schema": "patient",
                "path": "addresses.0.country"
            },
            "countryCode": {
                "schema": "patient",
                "path": "addresses.0.countryCode"
            },


            "items": {
                "type": "InvoiceItem_T",
                "label": {
                    "en": "Items",
                    "de": "Leistungen[]"
                }
            },

//        "beforetax": {
//            "type": "String",
//            "label": {
//                "en": "Total before tax",
//                "de": "Summe vor Steuern"
//            }
//        },
//        "vat": {
//            "type": "String",
//            "label": {
//                "en": "VAT",
//                "de": "MWSt"
//            }
//        },
            "total": {
                "type": "String",
                "label": {
                    "en": "Total",
                    "de": "Gesamtsumme"
                }
            },
            "totalAdjusted": {
                "type": "String",
                "label": {
                    "en": "Total paid out",
                    "de": "Gesamt-Erstattung"
                }
            },
            "patient": {
                "type": "Personalienfeld_T",
                "label": {
                    "en": "KBV Patient field",
                    "de": "Personalienfeld"
                }
            },
            "barcode1a": {
                "type": "String",
                "label": {
                    "en": "BFB barcode1a",
                    "de": "BFB barcode1a"
                }
            },
            "barcode2a": {
                "type": "String",
                "label": {
                    "en": "BFB barcode2a",
                    "de": "BFB barcode2a"
                }
            },
            "barcode2b": {
                "type": "String",
                "label": {
                    "en": "BFB barcode2b",
                    "de": "BFB barcode2b"
                }
            },
            "barcode4": {
                "type": "String",
                "label": {
                    "en": "BFB barcode4",
                    "de": "BFB barcode4"
                }
            },
            "barcode6": {
                "type": "String",
                "label": {
                    "en": "BFB barcode6",
                    "de": "BFB barcode6"
                }
            },
            "barcode10": {
                "type": "String",
                "label": {
                    "en": "BFB barcode10",
                    "de": "BFB barcode10"
                }
            },
            "barcode10L": {
                "type": "String",
                "label": {
                    "en": "BFB barcode10L",
                    "de": "BFB barcode10L"
                }
            },
            "barcode10A": {
                "type": "String",
                "label": {
                    "en": "BFB barcode10A",
                    "de": "BFB barcode10A"
                }
            },
            "barcode13": {
                "type": "String",
                "label": {
                    "en": "BFB barcode13",
                    "de": "BFB barcode13"
                }
            },
            "barcode14": {
                "type": "String",
                "label": {
                    "en": "barcode14",
                    "de": "barcode14"
                }
            },
            "barcode15_1": {
                "type": "String",
                "label": {
                    "en": "BFB barcode15_1",
                    "de": "BFB barcode15_1"
                }
            },
            "barcode18": {
                "type": "String",
                "label": {
                    "en": "BFB barcode18",
                    "de": "BFB barcode18"
                }
            },
            "barcode19a": {
                "type": "String",
                "label": {
                    "en": "BFB barcode19a",
                    "de": "BFB barcode19a"
                }
            },
            "barcode19b": {
                "type": "String",
                "label": {
                    "en": "BFB barcode19b",
                    "de": "BFB barcode19b"
                }
            },
            "barcode21": {
                "type": "String",
                "label": {
                    "en": "BFB barcode21",
                    "de": "BFB barcode21"
                }
            },
            "certNumber": {
                "type": "String",
                "label": {
                    "en": "BFB Certificate Number",
                    "de": "BFB Zertifikat-Nummer"
                }
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