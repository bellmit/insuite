/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Invoice-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Invoice_T = {
            "version": 1.0,
            "mapper": "invoice",
            "activityId": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Activity ID",
                    "de": "Activity ID"
                }
            },
            "diagnoses": {
                "type": "String",
                "label": {
                    "en": "Diagnoses",
                    "de": "Diagnosen"
                }
            },
            "diagnosesText": {
                "type": "String",
                "label": {
                    "en": "diagnoses text",
                    "de": "Diagnosen texte"
                }
            },
            "invoiceNo": {
                "type": "String",
                "label": {
                    "en": "Invoice No.",
                    "de": "Rechnungsnummer"
                }
            },
            "insuranceName": {
                "type": "String",
                "label": {
                    "en": "Insurance name",
                    "de": "Kostenträger"
                }
            },
            "insuranceId": {
                "type": "String",
                "label": {
                    "en": "Insurance id",
                    "de": "Kostenträgernummer"
                }
            },
            "insuranceNo": {
                "type": "String",
                "label": {
                    "en": "Insurance no.",
                    "de": "Versichertennummer"
                }
            },
            "jobTitle": {
                "type": "String",
                "label": {
                    "en": "Job title",
                    "de": "Beruf (Kat.)"
                }
            },
            "patientId": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Patient ID",
                    "de": "Patienten Nummer"
                }
            },
            "workingAt": {
                "type": "String",
                "label": {
                    "en": "Employer",
                    "de": "Arbeitgeber"
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
            "date": {
                "type": "String",
                "label": {
                    "en": "Date",
                    "de": "Datum"
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
            "from": {
                "type": "String",
                "label": {
                    "en": "From Date",
                    "de": "Abrechnungszeitraum von"
                }
            },
            "to": {
                "type": "String",
                "label": {
                    "en": "To Date",
                    "de": "Abrechnungszeitraum bis"
                }
            },
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
                    "en": "Mr./Ms./...",
                    "de": "Anrede"
                }
            },
            "title": {
                "type": "String",
                "label": {
                    "en": "title",
                    "de": "Titel"
                }
            },

            "bankName": {
                "type": "String",
                "label": {
                    "en": "Bank Name",
                    "de": "Bankinstitut"
                }
            },
            "bankIBAN": {
                "type": "String",
                "label": {
                    "en": "Bank IBAN",
                    "de": "Kontonummer / IBAN"
                }
            },
            "bankBIC": {
                "type": "String",
                "label": {
                    "en": "Bank BIC",
                    "de": "Bankleitzahl / BIC"
                }
            },
            "accountOwner": {
                "type": "String",
                "label": {
                    "en": "Account owner",
                    "de": "Kontoinhaber"
                }
            },

            "address": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Client address",
                    "de": "Patienten Adresse"
                }
            },
            "street": {
                "type": "String",
                "label": {
                    "en": "Street",
                    "de": "Strasse"
                }
            },
            "houseno": {
                "type": "String",
                "label": {
                    "en": "House No.",
                    "de": "Hausnummer"
                }
            },
            "zip": {
                "type": "String",
                "label": {
                    "en": "Post Code",
                    "de": "PLZ"
                }
            },
            "city": {
                "type": "String",
                "label": {
                    "en": "City",
                    "de": "Stadt"
                }
            },
            "postbox": {
                "type": "String",
                "label": {
                    "en": "PO Box",
                    "de": "Postfach"
                }
            },
            "country": {
                "type": "String",
                "label": {
                    "en": "Country",
                    "de": "Land"
                }
            },
            "countryCode": {
                "type": "String",
                "label": {
                    "en": "Country Code",
                    "de": "Ländercode"
                }
            },
            "items": {
                "type": "InvoiceItem_T",
                "label": {
                    "en": "Items",
                    "de": "Items"
                }
            },
            "currency": {
                "type": "String",
                "label": {
                    "en": "Currency",
                    "de": "Currency"
                }
            },
            "beforetax": {
                "type": "String",
                "label": {
                    "en": "Total before tax",
                    "de": "Summe vor USt"
                }
            },
            "vat": {
                "type": "String",
                "label": {
                    "en": "VAT",
                    "de": "USt"
                }
            },
            "vatList": {
                "type": "String",
                "label": {
                    "en": "VAT Summary",
                    "de": "USt Liste"
                }
            },
            "pracAddress": {
                "type": "String",
                "label": {
                    "en": "Practice address",
                    "de": "Praxisadresse"
                }
            },
            "pracName": {
                "type": "String",
                "label": {
                    "en": "Practice Name",
                    "de": "Praxisname"
                }
            },
            "total": {
                "type": "String",
                "label": {
                    "en": "Total",
                    "de": "Gesamtsumme"
                }
            },
            "total75": {
                "type": "String",
                "label": {
                    "en": "75% of Total",
                    "de": "75% der Gesamtsumme"
                }
            },
            "total25": {
                "type": "String",
                "label": {
                    "en": "25% of Total",
                    "de": "25% der Gesamtsumme"
                }
            },
            "total15": {
                "type": "String",
                "label": {
                    "en": "15% of Total",
                    "de": "15% der Gesamtsumme"
                }
            },
            "totalDoc": {
                "type": "String",
                "label": {
                    "en": "Total for Doctor",
                    "de": "Summe Ärztliche Leistungen"
                }
            },
            "totalASK": {
                "type": "String",
                "label": {
                    "en": "Total extra general costs",
                    "de": "Summe allgemeine Sachkosten"
                }
            },
            "totalBSK": {
                "type": "String",
                "label": {
                    "en": "Total extra specific costs",
                    "de": "Summe besondere Sachkosten"
                }
            },
            "totalAHB": {
                "type": "String",
                "label": {
                    "en": "Total general medical costs",
                    "de": "Summe allgemeine Heilbehandlung"
                }
            },
            "totalBHB": {
                "type": "String",
                "label": {
                    "en": "Total specific medical costs",
                    "de": "Summe besondere Heilbehandlung"
                }
            },
            "patient": {
                "type": "Patient_T",
                "label": {
                    "en": "Patient (obj)",
                    "de": "Personalienfeld"
                }
            },
            "patient2": {
                "type": "Personalienfeld_T",
                "label": {
                    "en": "Patient (obj, postal address)",
                    "de": "Personalienfeld (Postanschrift)"
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